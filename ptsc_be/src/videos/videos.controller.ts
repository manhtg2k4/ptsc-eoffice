import { Controller, Get, Post, Delete, Body, Patch, Param, Query, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { FilterVideoDto } from './dto/filter-video.dto';
import { LikeVideoDto } from './dto/like-video.dto';
import { multerVideoUploadConfig, allowedImageMimeTypes, allowedVideoMimeTypes, getThumbnailUrl, getVideoUrl } from './multer-video.config';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { mapVideoWithTopic, VIDEO_SORT_OPTIONS } from './videos.helper';
import { FilesManagementService } from '../files-managerment/files-management-mssql.service';
import { Public } from '../oauth/decorator/public.decorator';
import { JwtAuthGuard } from '../oauth/jwt.guard';
import { FeatureGuard } from '../oauth/feature.guard';
import { ModulesKey } from '../oauth/decorator/module-key.decorator';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';

@ApiTags('Quản lý Video')
@ApiBearerAuth()
@ModulesKey('dsvideott')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('videos')
export class VideosController {
    constructor(
        private readonly videosService: VideosService,
        private readonly sqlsvRepo: SQLSVRepository,
        private readonly filesManagementService: FilesManagementService,
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    private async mapVideoWithTopicInfo(video: any, onlyTopicName: boolean = false) {
        const topicInfo = await this.videosService.getTopicInfo(video.topic);
        return mapVideoWithTopic(video, topicInfo, onlyTopicName);
    }

    private async mapVideosWithTopicInfo(videos: any[], onlyTopicName: boolean = false) {
        return Promise.all(videos.map(video => this.mapVideoWithTopicInfo(video, onlyTopicName)));
    }

    // API topics đã có sẵn ở module /api/topic
    // GET /api/topic - Danh sách chủ đề
    // GET /api/topic/:id - Chi tiết chủ đề

    @Post('create-with-upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'video', maxCount: 1 },
    ], multerVideoUploadConfig))
    @ApiOperation({ summary: 'Tạo video với upload file' })
    @ApiResponse({ status: 201, description: 'Tạo video thành công' })
    async createWithUpload(
        @UploadedFiles() uploadedFiles: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[] },
        @Body() body: any,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || "";
        try {
            let userName = undefined;

            if (userId) {
                const user: any = await this.sqlsvRepo.getUserById(userId);
                userName = user?.name || undefined;
            }

            // Validate required fields
            if (!body.title || body.title.trim() === '') {
                throw new BadRequestException({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: [{ field: 'title', message: 'Tiêu đề không được để trống' }],
                });
            }

            let mappedVideoType = body.videoType;
            if (mappedVideoType) {
                if (mappedVideoType === '1' || mappedVideoType === 1 || mappedVideoType === 'Video thường') mappedVideoType = 'normal';
                else if (mappedVideoType === '2' || mappedVideoType === 2 || mappedVideoType === 'Hiển thị lên trang chủ') mappedVideoType = 'featured';
            }

            const createDto: CreateVideoDto = {
                title: body.title,
                description: body.description,
                topic: body.topic,
                videoType: mappedVideoType,
                videoLink: body.linkVideo || body.videoLink,
            };

            // 1. Xử lý upload files trước để có IDs
            let thumbnailFileId: number | undefined = undefined;
            let thumbnailUrl: string | undefined = undefined;
            if (uploadedFiles.thumbnail && uploadedFiles.thumbnail.length > 0) {
                const thumbnailFile = uploadedFiles.thumbnail[0];
                if (!allowedImageMimeTypes.includes(thumbnailFile.mimetype)) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Định dạng ảnh không hỗ trợ!',
                        errors: [{ field: 'thumbnail', message: 'Ảnh phải là PNG, JPG, GIF, WEBP' }],
                    });
                }

                // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
                await validateFileSecurity(thumbnailFile);
                await sanitizeFileContent(thumbnailFile);

                const fileResult = await this.filesManagementService.uploadFile(
                    {
                        object_type: 'video_thumbnail',
                        object_id: '0', // Tạm thời để '0' làm chuỗi
                        description: `Thumbnail: ${body.title}`
                    },
                    thumbnailFile,
                    userId,
                );
                const thumbnailPublicId = fileResult?.public_id;
                thumbnailFileId = thumbnailPublicId
                    ? await this.filesManagementService.resolveFileIdOrThrow(thumbnailPublicId)
                    : undefined;
                thumbnailUrl = fileResult ? `/upload/${fileResult.file_path}` : getThumbnailUrl(thumbnailFile.filename);
            }

            let videoFileId: number | undefined = undefined;
            let videoUrl: string | undefined = undefined;
            if (uploadedFiles.video && uploadedFiles.video.length > 0) {
                const videoFile = uploadedFiles.video[0];
                if (!allowedVideoMimeTypes.includes(videoFile.mimetype)) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Định dạng video không hỗ trợ!',
                        errors: [{ field: 'video', message: 'Video phải là MP4, MOV, AVI, WEBM, MKV' }],
                    });
                }

                // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
                await validateFileSecurity(videoFile);
                await sanitizeFileContent(videoFile);

                const fileResult = await this.filesManagementService.uploadFile(
                    {
                        object_type: 'video_file',
                        object_id: '0', // Tạm thời để '0' làm chuỗi
                        description: `Video: ${body.title}`
                    },
                    videoFile,
                    userId,
                );
                const videoPublicId = fileResult?.public_id;
                videoFileId = videoPublicId
                    ? await this.filesManagementService.resolveFileIdOrThrow(videoPublicId)
                    : undefined;
                videoUrl = fileResult ? `/upload/${fileResult.file_path}` : getVideoUrl(videoFile.filename);
            }

            // 2. Tạo video với đầy đủ thông tin file
            createDto.thumbnail = thumbnailUrl;
            createDto.thumbnailFileId = thumbnailFileId;
            createDto.videoUrl = videoUrl;
            createDto.videoFileId = videoFileId;

            const video = await this.videosService.create(createDto, userId, userName);
            const videoId = video.id;

            // 3. Cập nhật object_id cho các file đã upload
            if (thumbnailFileId) {
                await this.filesManagementService.updateFileRelation(thumbnailFileId, 'video_thumbnail', String(videoId));
            }
            if (videoFileId) {
                await this.filesManagementService.updateFileRelation(videoFileId, 'video_file', String(videoId));
            }

            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Video: Tạo mới video "${body.title}"`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_CREATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Tạo video thành công!',
                data: await this.mapVideoWithTopicInfo(video),
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Lỗi: Video: Tạo mới video "${body.title}" - ${error.message}`,
                method: 'POST',
                status: 'ERROR',
                type: 'VIDEOS',
                subType: 'VIDEO_CREATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Public()
    @Get()
    @ApiQuery({ type: FilterVideoDto, style: 'deepObject', explode: true })
  @ApiOperation({ summary: 'Lấy danh sách video với isNew (không cần đăng nhập)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAll(@Query() filterDto: FilterVideoDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            // Luôn dùng phương thức có isNew (có hoặc không có userId)
            const result = await this.videosService.findWithFilterAndIsNew(userId || null, filterDto);
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Video: Truy cập danh sách video`,
                    method: 'GET',
                    status: 'SUCCESS',
                    type: 'VIDEOS',
                    subType: 'VIDEO_LIST',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                success: true,
                message: 'Lấy danh sách video thành công!',
                data: await this.mapVideosWithTopicInfo(result.data, true),
                total: result.total,
                count: result.count,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Truy cập danh sách video - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_LIST',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Public()
    @Get('public/list')
    @ApiOperation({ summary: 'Lấy danh sách video (public - không cần auth)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiQuery({ type: FilterVideoDto, style: 'deepObject', explode: true })
    async findAllPublic(@Query() filterDto: FilterVideoDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            const result = await this.videosService.findWithFilterAndIsNew(userId || null, filterDto);
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Video: Truy cập danh sách video public`,
                    method: 'GET',
                    status: 'SUCCESS',
                    type: 'VIDEOS',
                    subType: 'VIDEO_LIST_PUBLIC',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                success: true,
                message: 'Lấy danh sách video thành công!',
                data: await this.mapVideosWithTopicInfo(result.data, true),
                total: result.total,
                count: result.count,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Truy cập danh sách video public - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_LIST_PUBLIC',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Public()
    @Get('public/:id')
    @ApiOperation({ summary: 'Lấy chi tiết video (public - không cần auth)' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
    async findOnePublic(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            const video = await this.videosService.findOne(id, userId || undefined);
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Video: Xem chi tiết video public ID ${id}`,
                    method: 'GET',
                    status: 'SUCCESS',
                    type: 'VIDEOS',
                    subType: 'VIDEO_DETAIL_PUBLIC',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                success: true,
                message: 'Lấy chi tiết video thành công!',
                data: await this.mapVideoWithTopicInfo(video),
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Xem chi tiết video public ID ${id} - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_DETAIL_PUBLIC',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Public()
    @Get('sort-options')
    @ApiOperation({ summary: 'Lấy danh sách tùy chọn sắp xếp cho dropdown' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    getSortOptions() {
        return {
            success: true,
            message: 'Lấy danh sách tùy chọn sắp xếp thành công!',
            data: VIDEO_SORT_OPTIONS,
        };
    }

    @Get('news')
    @ApiOperation({ summary: 'Lấy danh sách tin tức video với trạng thái mới (cần auth)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiQuery({ type: FilterVideoDto, style: 'deepObject', explode: true })
    async getNewsVideos(
        @Query() filterDto: FilterVideoDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || "";
        try {
            if (!userId) {
                throw new BadRequestException({
                    success: false,
                    message: 'Bạn cần đăng nhập để xem tin tức video',
                });
            }

            // Mặc định limit = 7 cho news
            if (!filterDto.limit) filterDto.limit = 7;

            const result = await this.videosService.findNewsVideos(userId, filterDto);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Video: Lấy danh sách tin tức video`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_NEWS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Lấy danh sách tin tức video thành công!',
                data: await this.mapVideosWithTopicInfo(result.data, true),
                ...result.meta,
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Lấy danh sách tin tức video - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_NEWS',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Get('history/recently-viewed')
    @ApiOperation({ summary: 'Lấy danh sách video đã xem gần đây (cần auth)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getRecentlyViewed(@Query('limit') limit: number = 4, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            if (!userId) {
                throw new BadRequestException({
                    success: false,
                    message: 'Bạn cần đăng nhập để xem lịch sử',
                });
            }

            const videos = await this.videosService.getRecentlyViewed(userId, limit);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Video: Lấy danh sách video đã xem gần đây`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_RECENTLY_VIEWED',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Lấy danh sách video đã xem gần đây thành công!',
                data: await this.mapVideosWithTopicInfo(videos, true),
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Lấy danh sách video đã xem gần đây - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_RECENTLY_VIEWED',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }
    // @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết video' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            const video = await this.videosService.findOne(id, userId || undefined);
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Video: Xem chi tiết video ID ${id}`,
                    method: 'GET',
                    status: 'SUCCESS',
                    type: 'VIDEOS',
                    subType: 'VIDEO_DETAIL',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            return {
                success: true,
                message: 'Lấy chi tiết video thành công!',
                data: await this.mapVideoWithTopicInfo(video),
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi: Video: Xem chi tiết video ID ${id} - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_DETAIL',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Patch(':id')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'video', maxCount: 1 },
    ], multerVideoUploadConfig))
    @ApiOperation({ summary: 'Cập nhật video' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    async update(
        @Param('id') id: string,
        @UploadedFiles() uploadedFiles: { thumbnail?: Express.Multer.File[], video?: Express.Multer.File[] },
        @Body() body: any,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || "";
        try {
            let userName = undefined;

            if (userId) {
                const user: any = await this.sqlsvRepo.getUserById(userId);
                userName = user?.name || undefined;
            }

            const updateDto: UpdateVideoDto = {};
            if (body.title) updateDto.title = body.title;
            if (body.description) updateDto.description = body.description;
            if (body.topic) updateDto.topic = body.topic;
            if (body.videoType) {
                let mappedType = body.videoType;
                if (mappedType === '1' || mappedType === 1 || mappedType === 'Video thường') mappedType = 'normal';
                else if (mappedType === '2' || mappedType === 2 || mappedType === 'Hiển thị lên trang chủ') mappedType = 'featured';
                updateDto.videoType = mappedType;
            }
            if (body.linkVideo !== undefined) updateDto.videoLink = body.linkVideo;
            else if (body.videoLink !== undefined) updateDto.videoLink = body.videoLink;

            // Cập nhật thông tin cơ bản
            if (Object.keys(updateDto).length > 0) {
                await this.videosService.update(id, updateDto, userId, userName);
            }

            // Xử lý thumbnail mới
            if (uploadedFiles?.thumbnail && uploadedFiles.thumbnail.length > 0) {
                const thumbnailFile = uploadedFiles.thumbnail[0];

                if (!allowedImageMimeTypes.includes(thumbnailFile.mimetype)) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Định dạng file không hỗ trợ!',
                        errors: [{ field: 'thumbnail', message: 'Ảnh đại diện phải có định dạng: PNG, JPG, GIF, WEBP' }],
                    });
                }

                // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
                await validateFileSecurity(thumbnailFile);
                await sanitizeFileContent(thumbnailFile);

                const fileResult = await this.filesManagementService.uploadFile(
                    {
                        object_type: 'video_thumbnail',
                        object_id: id,
                        description: `Thumbnail cập nhật`,
                    },
                    thumbnailFile,
                    userId,
                );

                const thumbnailUrl = fileResult ? `/upload/${fileResult.file_path}` : getThumbnailUrl(thumbnailFile.filename);
                const thumbnailPublicId = fileResult?.public_id;
                const thumbnailFileId = thumbnailPublicId
                    ? await this.filesManagementService.resolveFileIdOrThrow(thumbnailPublicId) : undefined;
                await this.videosService.update(id, { thumbnail: thumbnailUrl, thumbnailFileId }, userId, userName);
            }

            // Xử lý video file mới
            if (uploadedFiles?.video && uploadedFiles.video.length > 0) {
                const videoFile = uploadedFiles.video[0];

                if (!allowedVideoMimeTypes.includes(videoFile.mimetype)) {
                    throw new BadRequestException({
                        success: false,
                        message: 'Định dạng file không hỗ trợ!',
                        errors: [{ field: 'video', message: 'File video phải có định dạng: MP4, MOV, AVI, WEBM, MKV' }],
                    });
                }

                // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
                await validateFileSecurity(videoFile);
                await sanitizeFileContent(videoFile);

                const fileResult = await this.filesManagementService.uploadFile(
                    {
                        object_type: 'video_file',
                        object_id: id,
                        description: `Video cập nhật`,
                    },
                    videoFile,
                    userId,
                );

                const videoUrl = fileResult ? `/upload/${fileResult.file_path}` : getVideoUrl(videoFile.filename);
                const videoPublicId = fileResult?.public_id;
                const videoFileId = videoPublicId
                    ? await this.filesManagementService.resolveFileIdOrThrow(videoPublicId) : undefined;
                await this.videosService.update(id, { videoUrl, videoFileId }, userId, userName);
            }

            const updatedVideo = await this.videosService.findOne(id, userId);

            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Video: Cập nhật video ID ${id}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_UPDATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Cập nhật video thành công!',
                data: await this.mapVideoWithTopicInfo(updatedVideo),
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Lỗi: Video: Cập nhật video ID ${id} - ${error.message}`,
                method: 'PATCH',
                status: 'ERROR',
                type: 'VIDEOS',
                subType: 'VIDEO_UPDATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Delete('soft-delete-many')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa mềm nhiều video' })
    @ApiResponse({ status: 200, description: 'Xóa mềm thành công' })
    async softRemoveMany(@Body() body: { ids: string[] }, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
                throw new BadRequestException({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: [{ field: 'ids', message: 'Vui lòng cung cấp mảng ID video cần xóa' }],
                });
            }

            const result = await this.videosService.softRemoveMany(body.ids);

            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Video: Xóa mềm nhiều video: ${body.ids.join(', ')}`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_DELETE_MANY',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: `Xóa mềm video thành công!`,
                data: {
                    total: body.ids.length,
                    success: result.success,
                    failed: result.failed,
                    errors: result.errors,
                },
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Lỗi: Video: Xóa mềm nhiều video - ${error.message}`,
                method: 'DELETE',
                status: 'ERROR',
                type: 'VIDEOS',
                subType: 'VIDEO_DELETE_MANY',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }

    @Delete('hard-delete-many')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Xóa vĩnh viễn nhiều video (hard delete)' })
    @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công' })
    async hardRemoveMany(@Body() body: { ids: string[] }) {
        if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
            throw new BadRequestException({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: [{ field: 'ids', message: 'Vui lòng cung cấp mảng ID video cần xóa vĩnh viễn' }],
            });
        }

        const result = await this.videosService.hardRemoveMany(body.ids);

        return {
            success: true,
            message: `Xóa vĩnh viễn ${result.success} video thành công!`,
            data: {
                total: body.ids.length,
                success: result.success,
                failed: result.failed,
                errors: result.errors,
            },
        };
    }

    @Post(':id/view')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Ghi nhận lượt xem video (cần auth)' })
    @ApiResponse({ status: 200, description: 'Ghi nhận lượt xem thành công' })
    async recordView(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || "";
        try {
            if (!userId) {
                throw new BadRequestException({
                    success: false,
                    message: 'Bạn cần đăng nhập để ghi nhận lượt xem',
                });
            }

            await this.videosService.recordView(id, userId);

            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Video: Ghi nhận lượt xem video ID ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_VIEW',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Ghi nhận lượt xem thành công!',
            };
        } catch (error) {
            if (userId) {
                await this.systemLogService.createLogFromSystem({
                    action: 'POST',
                    details: `Lỗi: Video: Ghi nhận lượt xem video ID ${id} - ${error.message}`,
                    method: 'POST',
                    status: 'ERROR',
                    type: 'VIDEOS',
                    subType: 'VIDEO_VIEW',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }

    @Post('like-video')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Like/Unlike một video' })
    @ApiResponse({ status: 200, description: 'Thực hiện thành công' })
    async likeVideo(
        @Body() dto: LikeVideoDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || "";
        try {
            const result = await this.videosService.likeVideo(dto, req.user);
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Video: ${dto.isLike ? 'Thích' : 'Bỏ thích'} video ID ${dto.videoId}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'VIDEOS',
                subType: 'VIDEO_LIKE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Lỗi: Video: Thích/Bỏ thích video ID ${dto.videoId} - ${error.message}`,
                method: 'POST',
                status: 'ERROR',
                type: 'VIDEOS',
                subType: 'VIDEO_LIKE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            throw error;
        }
    }
}

