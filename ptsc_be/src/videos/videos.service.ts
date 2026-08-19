import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { FilterVideoDto } from './dto/filter-video.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { VideoEntity, VideoStatus, VideoType } from './entities/video.entity';
import { VideoViewHistoryEntity } from './entities/video-view-history.entity';
import { TopicEntity } from '../topic/entities/topic.entity';
import {
    checkSameValueFilters,
    applyOrFilterConditions,
    applyAndFilterConditions,
    VideoFilterParams,
} from './helpers/video-filter.helper';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { VideoLike } from './entities/video-like.entity';
import { UserEntity } from '../users/entities/user.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { VideoGateway } from './video.gateway';
import { LikeVideoDto } from './dto/like-video.dto';
import { getVideoDurationInSeconds } from 'get-video-duration';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';

@Injectable()
export class VideosService {
    constructor(
        @InjectRepository(VideoEntity, 'mssqlConnection')
        private readonly videoRepository: Repository<VideoEntity>,
        @InjectRepository(VideoViewHistoryEntity, 'mssqlConnection')
        private readonly viewHistoryRepository: Repository<VideoViewHistoryEntity>,
        @InjectRepository(TopicEntity, 'mssqlConnection')
        private readonly topicRepository: Repository<TopicEntity>,
        @InjectRepository(VideoLike, 'mssqlConnection')
        private readonly videoLikeRepository: Repository<VideoLike>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepository: Repository<UserEntity>,
        @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
        private readonly orgRepository: Repository<OrganizationUnitEntity>,
        private readonly filesManagementService: FilesManagementService,
        private readonly videoGateway: VideoGateway,
    ) { }

    /**
     * Kiểm tra xem string có phải là GUID hợp lệ không
     */
    private isValidGuid(str: string): boolean {
        const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        return guidRegex.test(str);
    }

    /**
     * Tìm topic theo ID và trả về ID
     */
    async resolveTopicId(topicInput: string): Promise<string | null> {
        if (!topicInput) return null;

        if (!this.isValidGuid(topicInput)) {
            throw new BadRequestException({
                success: false,
                message: 'ID chủ đề không hợp lệ!',
                errors: [{ field: 'topic', message: 'ID chủ đề phải là GUID hợp lệ. Vui lòng chọn chủ đề từ danh sách.' }],
            });
        }

        const topic = await this.topicRepository.findOne({
            where: { id: topicInput },
            select: ['id', 'name'],
        });

        if (!topic) {
            throw new BadRequestException({
                success: false,
                message: 'Chủ đề không tồn tại!',
                errors: [{ field: 'topic', message: `Không tìm thấy chủ đề với ID: ${topicInput}. Vui lòng chọn chủ đề từ danh sách.` }],
            });
        }

        return topic.id;
    }

    /**
     * Lấy thông tin topic theo ID
     */
    async getTopicInfo(topicId: string): Promise<{ id: string; name: string } | null> {
        if (!topicId) return null;

        if (!this.isValidGuid(topicId)) return null;

        const topic = await this.topicRepository.findOne({
            where: { id: topicId },
            select: ['id', 'name'],
        });

        return topic ? { id: topic.id, name: topic.name } : null;
    }

    /**
     * Lấy danh sách tất cả chủ đề
     */
    async getAllTopics(): Promise<{ id: string; name: string }[]> {
        const topics = await this.topicRepository.find({
            select: ['id', 'name'],
            order: { name: 'ASC' },
        });
        return topics.map(t => ({ id: t.id, name: t.name }));
    }

    /**
     * Lấy chi tiết chủ đề theo ID
     */
    async getTopicById(id: string): Promise<{ id: string; name: string } | null> {
        if (!this.isValidGuid(id)) return null;

        const topic = await this.topicRepository.findOne({
            where: { id },
            select: ['id', 'name'],
        });
        return topic ? { id: topic.id, name: topic.name } : null;
    }

    /**
     * Đếm số video nổi bật đang active
     */
    async countFeaturedVideos(): Promise<number> {
        return await this.videoRepository.count({
            where: { videoType: VideoType.FEATURED, status: VideoStatus.ACTIVE },
        });
    }

    /**
     * Đảm bảo tối đa 3 video hiển thị lên trang chủ.
     * Nếu có nhiều hơn, giữ lại 2 video featured mới nhất và chuyển các video cũ hơn về 'normal'
     */
    private async handleFeaturedToggle(currentVideoId?: string): Promise<void> {
        // Tìm các video đang là featured và đang active
        const featuredVideos = await this.videoRepository.find({
            where: {
                videoType: VideoType.FEATURED,
                status: VideoStatus.ACTIVE
            },
            order: {
                createdAt: 'DESC'
            }
        });

        // Lọc bỏ video hiện tại đang được xử lý (nếu có)
        const otherFeatured = featuredVideos.filter(video => video.id !== currentVideoId);

        // Giữ lại 2 video mới nhất (để khi cộng thêm video hiện tại sẽ là 3)
        if (otherFeatured.length >= 3) {
            const videosToUnfeature = otherFeatured.slice(2);
            for (const video of videosToUnfeature) {
                await this.videoRepository.update(video.id, { videoType: VideoType.NORMAL });
            }
        }
    }


    /**
     * Làm giàu dữ liệu video với thông tin file, topic và lượt like
     */
    private async enrichVideoDetails(video: VideoEntity, userId?: string): Promise<any> {
        try {
            const result: any = { ...video, publishedDate: video.publishedDate };

            // 1. Get topic info
            const topicInfo = await this.getTopicInfo(video.topic);
            result.topicName = topicInfo?.name || null;

            // 1.1 Get department info
            if (video.department) {
                const deptInfo = await this.orgRepository.findOne({
                    where: { id: video.department },
                    select: ['id', 'name']
                });
                result.departmentName = deptInfo?.name || null;
            }

            // 2. Get file info (thumbnail)
            const files = await this.filesManagementService.getLatestFilesByObject(
                'video_thumbnail',
                video.id.toString(),
                { page: 1, limit: 10 },
            );

            if (files.data && files.data.length > 0) {
                files.data.forEach((file) => {
                    const fileInfo = {
                        id: file.id,
                        url: `/files/view/${file.id}`,
                        filename: file.file_name,
                        mimetype: file.mime_type,
                        storage_path: file.storage_path,
                        typeSize: file.typeSize,
                    };

                    if (
                        String(file.id) === String(video.sizeSmall) ||
                        (!video.sizeSmall && file.typeSize === 'sizeSmall')
                    ) {
                        result.sizeSmall = fileInfo;
                    } else if (
                        String(file.id) === String(video.sizeMedium) ||
                        (!video.sizeMedium && file.typeSize === 'sizeMedium')
                    ) {
                        result.sizeMedium = fileInfo;
                    } else if (
                        String(file.id) === String(video.sizeBig) ||
                        (!video.sizeBig && file.typeSize === 'sizeBig')
                    ) {
                        result.sizeBig = fileInfo;
                    }
                });
            }

            // 3. Enrich video with like counts and meLike status
            const likeCount = await this.videoLikeRepository.count({
                where: { videoId: video.id, isLike: true },
            });
            result.totalLikes = likeCount || 0;

            const commentCountResult = await this.videoRepository.query(
                'SELECT COUNT(*) as count FROM document_comments WHERE document_id = @0',
                [video.id.toString()]
            );
            result.totalComments = commentCountResult[0]?.count || 0;

            result.meLike = false;
            if (userId) {
                const userLike = await this.videoLikeRepository.findOne({
                    where: { videoId: video.id, userId: userId, isLike: true },
                });
                result.meLike = !!userLike;
            }

            // 4. Calculate duration if not present
            if (video.videoFileId && (!video.duration || video.duration === 0)) {
                try {
                    const duration = await this.calculateAndSaveDuration(video);
                    if (duration) {
                        result.duration = duration;
                    }
                } catch (error) {
                    console.error(`[DurationDebug] Lỗi trong enrichVideoDetails cho video ${video.id}:`, error);
                }
            }

            // 5. Add durationText
            result.durationText = video.durationText || '';
            // Nếu duration vừa được cập nhật trong result nhưng chưa có trong video.duration
            if (result.duration && !result.durationText) {
                const minutes = Math.floor(result.duration / 60);
                const seconds = Math.floor(result.duration % 60);
                result.durationText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            return result;
        } catch (error) {
            console.error(`Error enriching video ${video.id}:`, error);
            return video;
        }
    }

    private async calculateAndSaveDuration(video: VideoEntity): Promise<number | null> {
        if (!video.videoFileId) return null;

        let tempFilePath = '';
        try {
            const fileMeta = await this.filesManagementService.getFileMeta(video.videoFileId);
            if (!fileMeta || !fileMeta.id) return null;

            const fileData = await this.filesManagementService.getFileForView(fileMeta.id);
            let absolutePath = '';

            if (fileData.fullPath) {
                absolutePath = fileData.fullPath;
            } else if (fileData.fileBuffer) {
                // Tạo file tạm từ buffer (Trường hợp MinIO)
                const tempDir = os.tmpdir();
                const tempFileName = `video_temp_${crypto.randomBytes(8).toString('hex')}${path.extname(fileData.filename || '.mp4')}`;
                tempFilePath = path.join(tempDir, tempFileName);

                fs.writeFileSync(tempFilePath, fileData.fileBuffer);
                absolutePath = tempFilePath;
            }

            if (absolutePath && fs.existsSync(absolutePath)) {
                const duration = await getVideoDurationInSeconds(absolutePath);
                const roundedDuration = Math.round(duration);

                await this.videoRepository.update(video.id, { duration: roundedDuration });
                return roundedDuration;
            } else {
            }
        } catch (error) {
            console.error('[DurationDebug] Lỗi khi xử lý duration:', error);
        } finally {
            // Xóa file tạm nếu có
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkError) {
                    console.error(`[DurationDebug] Không thể xóa file tạm:`, unlinkError);
                }
            }
        }
        return null;
    }


    async create(
        createVideoDto: CreateVideoDto,
        userId?: string,
        userName?: string,
    ): Promise<VideoEntity> {
        if (createVideoDto.videoType === 'featured') {
            await this.handleFeaturedToggle();
        }

        const topicId = createVideoDto.topic
            ? await this.resolveTopicId(createVideoDto.topic)
            : undefined;

        // Lấy thông tin phòng ban của người dùng
        let department: string | undefined = undefined;
        if (userId) {
            const user = await this.userRepository.findOne({
                where: { id: userId } as any,
                relations: ['parent']
            });
            department = user?.parent?.id;
        }

        const video = this.videoRepository.create({
            ...createVideoDto,
            topic: topicId || undefined,
            status: VideoStatus.ACTIVE,
            createdBy: userId || createVideoDto.createdBy,
            createdByName: userName || createVideoDto.createdByName,
            department: department || (createVideoDto as any).department,
        });

        if (createVideoDto.videoFileId) {
            const duration = await this.calculateAndSaveDuration(video as VideoEntity);
            if (duration) {
                video.duration = duration;
            }
        }

        const savedVideo = await this.videoRepository.save(video);
        return await this.findOne(savedVideo.id, userId);
    }

    async findWithFilter(filterDto: FilterVideoDto, userId?: string): Promise<PaginatedResponseDto<VideoEntity>> {
        const {
            filter = {},
            page = 1,
            limit = 25,
            sort = {},
            isExport,
        } = filterDto;

        // Parse page và limit
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

        // Extract filter values
        const keyword = filter.keyword;
        const topic = filter.topic;
        let videoType = filter.videoType || filter.video_type;
        // Map videoType numeric to string: 1 -> normal, 2 -> featured
        if (videoType === '1' || videoType === 1) videoType = VideoType.NORMAL;
        else if (videoType === '2' || videoType === 2) videoType = VideoType.FEATURED;

        // Theo yêu cầu: createdByName sẽ tìm theo Id người dùng (createdBy) chứ không gửi name
        const createdBy = filter.createdBy || filter.created_by || filter.createdByName || filter.created_by_name;
        const createdByName = undefined; // Không lọc theo trường name nữa (luôn tìm theo Id)
        const title = filter.title;
        const description = filter.description;

        // Date range filter (hỗ trợ nested object hoặc flat)
        const dateFilter = filter.createdAt || filter.created_at || filter.publishedDate || filter.published_date || filter.publishedAt || filter.published_at;
        const fromDate = dateFilter?.startDate || dateFilter?.start_date;
        const toDate = dateFilter?.endDate || dateFilter?.end_date;

        const queryBuilder = this.videoRepository.createQueryBuilder('video');
        queryBuilder.where('video.status = :status', { status: VideoStatus.ACTIVE });

        // Keyword search (title + description) - hỗ trợ tìm kiếm không phân biệt dấu
        if (keyword) {
            queryBuilder.andWhere(
                '(video.title COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI OR video.description COLLATE Vietnamese_CI_AI LIKE :keyword COLLATE Vietnamese_CI_AI)',
                { keyword: `%${keyword}%` }
            );
        }

        // Sử dụng helper để kiểm tra OR logic
        const filterParams: VideoFilterParams = { title, description, topic, videoType, createdBy, createdByName };
        const { hasSameValue, searchValue } = checkSameValueFilters(filterParams);

        // Resolve topic IDs (hỗ trợ cả GUID và tên)
        let topicIds: string[] = [];
        if (topic) {
            if (this.isValidGuid(topic)) {
                topicIds = [topic];
            } else {
                // Tìm kiếm topic không phân biệt dấu
                const topicsByName = await this.topicRepository
                    .createQueryBuilder('t')
                    .where('t.name COLLATE Vietnamese_CI_AI LIKE :name COLLATE Vietnamese_CI_AI', { name: `%${topic}%` })
                    .select(['t.id'])
                    .getMany();
                topicIds = topicsByName.map(t => t.id);
            }
        }

        if (hasSameValue && searchValue) {
            // Tất cả filter có cùng giá trị -> dùng OR (sử dụng helper)
            applyOrFilterConditions(queryBuilder, filterParams, searchValue, topicIds);
        } else {
            // Các filter có giá trị khác nhau -> dùng AND (sử dụng helper)
            applyAndFilterConditions(queryBuilder, filterParams, topicIds);
        }

        // Date range filter
        if (fromDate) {
            queryBuilder.andWhere('video.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
        }

        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('video.createdAt <= :toDate', { toDate: endDate });
        }

        // Sort handling
        const allowedSortFields = ['createdAt', 'views', 'shares', 'likes', 'title', 'updatedAt', 'created_at', 'updated_at'];

        if (Object.keys(sort).length > 0) {
            for (const [field, direction] of Object.entries(sort)) {
                // Convert snake_case to camelCase for entity field
                const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                const validField = allowedSortFields.includes(field) || allowedSortFields.includes(camelField)
                    ? camelField
                    : 'createdAt';

                // Parse direction: 1, '1', 'asc', 'ASC' -> ASC; -1, '-1', 'desc', 'DESC' -> DESC
                let sortDirection: 'ASC' | 'DESC' = 'DESC';
                if (direction === 1 || direction === '1' || direction === 'asc' || direction === 'ASC') {
                    sortDirection = 'ASC';
                }

                queryBuilder.orderBy(`video.${validField}`, sortDirection);
            }
        } else {
            queryBuilder.orderBy('video.createdAt', 'DESC');
        }

        const total = await queryBuilder.getCount();
        const skip = (pageNum - 1) * limitNum;
        queryBuilder.skip(skip).take(limitNum);

        const data = await queryBuilder.getMany();

        // Enrich data with file info and topic name
        const enrichedData = await Promise.all(
            data.map(video => this.enrichVideoDetails(video, userId))
        );

        // Nếu isExport = 'true', format dữ liệu cho export
        if (isExport === 'true') {
            const formattedData: any[] = [];
            for (const video of enrichedData) {
                const topicInfo = await this.getTopicInfo(video.topic);
                formattedData.push({
                    ...video,
                    topic: topicInfo?.name || '',
                    videoType: video.videoType === 'featured' ? 'Hiển thị lên trang chủ' : 'Video thường',
                    status: video.status === 1 ? 'Hoạt động' : 'Không hoạt động',
                });
            }
            return new PaginatedResponseDto(formattedData, total, pageNum, limitNum);
        }

        return new PaginatedResponseDto(enrichedData, total, pageNum, limitNum);
    }

    async findOne(id: string, userId?: string): Promise<VideoEntity> {
        if (!this.isValidGuid(id)) {
            throw new BadRequestException(`ID video '${id}' không đúng định dạng hợp lệ.`);
        }

        const video = await this.videoRepository.findOne({
            where: { id, status: VideoStatus.ACTIVE }
        });
        if (!video) {
            throw new NotFoundException(`Video với id ${id} không tồn tại hoặc đã bị xóa`);
        }
        return await this.enrichVideoDetails(video, userId);
    }

    async update(
        id: string,
        updateVideoDto: UpdateVideoDto,
        userId?: string,
        userName?: string,
    ): Promise<VideoEntity> {
        const video = await this.videoRepository.findOne({ where: { id, status: VideoStatus.ACTIVE } });
        if (!video) {
            throw new NotFoundException(`Video với id ${id} không tồn tại hoặc đã bị xóa`);
        }

        // Tự động chuyển video featured cũ sang normal nếu video này được đổi sang featured
        if (updateVideoDto.videoType === 'featured') {
            await this.handleFeaturedToggle(id);
        }

        const updateData: any = { ...updateVideoDto };

        if (updateVideoDto.topic) {
            const resolvedTopicId = await this.resolveTopicId(updateVideoDto.topic);
            updateData.topic = resolvedTopicId || undefined;
        }

        if (!video.createdBy && userId) {
            updateData.createdBy = userId;
        }
        if (!video.createdByName && userName) {
            updateData.createdByName = userName;
        }

        if (updateVideoDto.videoFileId && updateVideoDto.videoFileId !== video.videoFileId) {
            video.duration = null;
            // Gán luôn videoFileId mới vào object để hàm tính toán dùng đúng file mới
            video.videoFileId = updateVideoDto.videoFileId;

            const duration = await this.calculateAndSaveDuration(video);
            if (duration) {
                video.duration = duration;
            }
        }

        Object.assign(video, updateData);
        await this.videoRepository.save(video);
        return await this.findOne(id, userId);
    }

    async softRemoveMany(ids: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
        let success = 0;
        let failed = 0;
        const errors: any[] = [];

        for (const id of ids) {
            try {
                const video = await this.videoRepository.findOne({
                    where: { id, status: VideoStatus.ACTIVE }
                });
                if (!video) {
                    failed++;
                    errors.push({ id, error: 'Video không tồn tại hoặc đã bị xóa' });
                    continue;
                }
                video.status = VideoStatus.DELETED;
                await this.videoRepository.save(video);
                success++;
            } catch (error) {
                failed++;
                errors.push({ id, error: error.message });
            }
        }

        return { success, failed, errors };
    }

    /**
     * Xóa vĩnh viễn video (hard delete)
     */
    async remove(id: string): Promise<void> {
        const video = await this.videoRepository.findOne({ where: { id } });
        if (!video) {
            throw new NotFoundException(`Video với id ${id} không tồn tại`);
        }
        await this.videoRepository.remove(video);
    }

    /**
     * Xóa vĩnh viễn nhiều video cùng lúc (hard delete)
     */
    async hardRemoveMany(ids: string[]): Promise<{ success: number; failed: number; errors: any[] }> {
        let success = 0;
        let failed = 0;
        const errors: any[] = [];

        for (const id of ids) {
            try {
                await this.remove(id);
                success++;
            } catch (error) {
                failed++;
                errors.push({ id, error: error.message });
            }
        }

        return { success, failed, errors };
    }

    /**
     * Ghi nhận lượt xem video (chỉ cho user đã đăng nhập)
     */
    async recordView(videoId: string, userId: string): Promise<void> {
        // Kiểm tra video tồn tại
        const video = await this.findOne(videoId);

        // Tìm bản ghi lịch sử xem của user này với video này
        let viewHistory = await this.viewHistoryRepository.findOne({
            where: { videoId, userId },
        });

        if (viewHistory) {
            // Đã xem trước đó -> cập nhật
            viewHistory.viewCount += 1;
            viewHistory.lastViewedAt = new Date();
            await this.viewHistoryRepository.save(viewHistory);
        } else {
            // Chưa xem -> tạo mới
            viewHistory = this.viewHistoryRepository.create({
                videoId,
                userId,
                viewCount: 1,
                lastViewedAt: new Date(),
            });
            await this.viewHistoryRepository.save(viewHistory);
        }

        // Tăng tổng views của video
        video.views = (video.views || 0) + 1;
        await this.videoRepository.save(video);
    }

    /**
     * Lấy danh sách video đã xem gần đây của user
     */
    async getRecentlyViewed(userId: string, limit: number = 4): Promise<any[]> {
        const histories = await this.viewHistoryRepository
            .createQueryBuilder('history')
            .innerJoinAndSelect('history.video', 'video')
            .where('history.userId = :userId', { userId })
            .andWhere('video.status = :status', { status: VideoStatus.ACTIVE })
            .orderBy('history.lastViewedAt', 'DESC')
            .take(limit)
            .getMany();

        // Map kết quả với thông tin enriched details
        const result: any[] = [];
        for (const history of histories) {
            const enrichedVideo = await this.enrichVideoDetails(history.video, userId);
            result.push({
                ...enrichedVideo,
                userViewCount: history.viewCount,
                lastViewedAt: history.lastViewedAt,
            });
        }

        return result;
    }

    /**
     * Lấy danh sách video với filter và trạng thái isNew
     * - Nếu có userId: isNew = video tạo trong 3 ngày gần đây AND user chưa xem
     * - Nếu không có userId: isNew = video tạo trong 3 ngày gần đây
     */
    async findWithFilterAndIsNew(userId: string | null, filterDto: FilterVideoDto): Promise<{ data: any[]; total: number; count: number; page: number; limit: number; totalPages: number }> {
        // Lấy danh sách video theo filter thông thường
        const result = await this.findWithFilter(filterDto);
        const videos = result.data;
        const { total, count, page, limit, totalPages } = result;

        // Lấy danh sách video đã xem của user (nếu có userId)
        let viewedSet = new Set<string>();
        if (userId) {
            const viewedVideoIds = await this.viewHistoryRepository
                .createQueryBuilder('history')
                .select('history.video_id', 'videoId')
                .where('history.user_id = :userId', { userId })
                .getRawMany();

            viewedSet = new Set(viewedVideoIds.map(v => v.videoId?.toUpperCase()));
        }

        // Tính ngày 3 ngày trước
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        // Map kết quả với isNew và nguyên gốc topic/videoType
        const resultData = videos.map((video) => {
            const isWithin3Days = new Date(video.createdAt) >= threeDaysAgo;

            // Tính isNew:
            // - Nếu có userId: isNew = trong 3 ngày AND chưa xem
            // - Nếu không có userId: isNew = trong 3 ngày
            let isNew = isWithin3Days;
            if (userId) {
                const hasViewed = viewedSet.has(video.id.toUpperCase());
                isNew = isWithin3Days && !hasViewed;
            }

            return {
                ...video,
                topic: video.topic, // keep raw topic id for controller to map
                isNew,
            };
        });

        return {
            data: resultData,
            total,
            count,
            page,
            limit,
            totalPages,
        };
    }

    /**
     * Lấy danh sách tin tức video với trạng thái isNew
     * isNew = true nếu: video tạo trong 3 ngày gần đây AND user chưa xem
     */
    async findNewsVideos(userId: string, filterDto: FilterVideoDto): Promise<{ data: any[]; meta: any }> {
        const {
            filter = {},
            page = 1,
            limit = 7,
            sort = {},
        } = filterDto;

        // Parse page và limit
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

        // Extract filter values
        const topic = filter.topic;
        const videoType = filter.videoType || filter.video_type;
        const dateFilter = filter.createdAt || filter.created_at || filter.publishedDate || filter.published_date || filter.publishedAt || filter.published_at;
        const fromDate = dateFilter?.startDate || dateFilter?.start_date;
        const toDate = dateFilter?.endDate || dateFilter?.end_date;

        // Lấy danh sách video active với bộ lọc
        const queryBuilder = this.videoRepository.createQueryBuilder('video');
        queryBuilder.where('video.status = :status', { status: VideoStatus.ACTIVE });

        // Lọc theo chủ đề - hỗ trợ cả ID (GUID) và tên topic
        if (topic) {
            if (this.isValidGuid(topic)) {
                queryBuilder.andWhere('video.topic = :topic', { topic });
            } else {
                const topicEntity = await this.topicRepository.findOne({
                    where: { name: topic },
                    select: ['id'],
                });
                if (topicEntity) {
                    queryBuilder.andWhere('video.topic = :topicId', { topicId: topicEntity.id });
                } else {
                    // Tìm kiếm topic không phân biệt dấu
                    const topicsByName = await this.topicRepository
                        .createQueryBuilder('t')
                        .where('t.name COLLATE Vietnamese_CI_AI LIKE :name COLLATE Vietnamese_CI_AI', { name: `%${topic}%` })
                        .select(['t.id'])
                        .getMany();

                    if (topicsByName.length > 0) {
                        const topicIds = topicsByName.map(t => t.id);
                        queryBuilder.andWhere('video.topic IN (:...topicIds)', { topicIds });
                    } else {
                        queryBuilder.andWhere('1 = 0');
                    }
                }
            }
        }

        // Lọc theo loại video
        if (videoType) {
            let mappedVideoType = videoType;
            if (videoType === '1' || videoType === 1) mappedVideoType = VideoType.NORMAL;
            else if (videoType === '2' || videoType === 2) mappedVideoType = VideoType.FEATURED;
            queryBuilder.andWhere('video.videoType = :videoType', { videoType: mappedVideoType });
        }

        // Lọc theo ngày
        if (fromDate) {
            queryBuilder.andWhere('video.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
        }

        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('video.createdAt <= :toDate', { toDate: endDate });
        }

        // Sắp xếp
        const allowedSortFields = ['createdAt', 'views', 'shares', 'likes', 'title', 'updatedAt'];

        if (Object.keys(sort).length > 0) {
            for (const [field, direction] of Object.entries(sort)) {
                const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                const validField = allowedSortFields.includes(field) || allowedSortFields.includes(camelField)
                    ? camelField
                    : 'createdAt';

                let sortDirection: 'ASC' | 'DESC' = 'DESC';
                if (direction === 1 || direction === '1' || direction === 'asc' || direction === 'ASC') {
                    sortDirection = 'ASC';
                }

                queryBuilder.orderBy(`video.${validField}`, sortDirection);
            }
        } else {
            queryBuilder.orderBy('video.createdAt', 'DESC');
        }

        const total = await queryBuilder.getCount();
        const skip = (pageNum - 1) * limitNum;
        queryBuilder.skip(skip).take(limitNum);

        const videos = await queryBuilder.getMany();

        // Lấy danh sách video đã xem của user
        const viewedVideoIds = await this.viewHistoryRepository
            .createQueryBuilder('history')
            .select('history.video_id', 'videoId')
            .where('history.user_id = :userId', { userId })
            .getRawMany();

        const viewedSet = new Set(viewedVideoIds.map(v => v.videoId?.toUpperCase()));

        // Tính ngày 3 ngày trước
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        // Map kết quả với isNew và topic
        const result: any[] = [];
        for (const video of videos) {
            const enrichedVideo = await this.enrichVideoDetails(video, userId);
            const isWithin3Days = new Date(video.createdAt) >= threeDaysAgo;
            const hasViewed = viewedSet.has(video.id.toUpperCase());

            // isNew = trong 3 ngày AND chưa xem
            const isNew = isWithin3Days && !hasViewed;

            result.push({
                ...enrichedVideo,
                isNew,
            });
        }

        return {
            data: result,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    /**
     * Like/Unlike video
     */
    async likeVideo(dto: LikeVideoDto, userFromJwt: any) {
        try {
            const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
            if (!jwtUserId) {
                throw new BadRequestException('Không tìm thấy thông tin user từ token');
            }

            const user = await this.userRepository.findOne({
                where: { id: jwtUserId } as any,
            });
            const userName = user?.username || user?.name || 'Anonymous';

            const { videoId, isLike = true } = dto;

            const video = await this.videoRepository.findOne({ where: { id: videoId, status: VideoStatus.ACTIVE } });
            if (!video) {
                throw new NotFoundException('Video không tồn tại');
            }

            const existingReaction = await this.videoLikeRepository.findOne({
                where: { videoId, userId: jwtUserId },
            });

            if (existingReaction) {
                if (existingReaction.isLike === isLike) {
                    await this.videoLikeRepository.remove(existingReaction);

                    const totalLikes = await this.videoLikeRepository.count({
                        where: { videoId, isLike: true },
                    });

                    this.videoGateway.emitVideoLikeUpdate(videoId, {
                        totalLikes,
                        userId: jwtUserId,
                        action: 'remove',
                    });

                    return {
                        success: true,
                        message: `Bỏ ${isLike ? 'like' : 'dislike'} thành công`,
                        liked: null,
                        totalLikes,
                    };
                } else {
                    existingReaction.isLike = isLike;
                    await this.videoLikeRepository.save(existingReaction);

                    const totalLikes = await this.videoLikeRepository.count({
                        where: { videoId, isLike: true },
                    });

                    this.videoGateway.emitVideoLikeUpdate(videoId, {
                        totalLikes,
                        userId: jwtUserId,
                        action: 'switch',
                    });

                    return {
                        success: true,
                        message: `Đổi sang ${isLike ? 'like' : 'dislike'} thành công`,
                        liked: isLike,
                        totalLikes,
                    };
                }
            }

            const newReaction = this.videoLikeRepository.create({
                videoId,
                userId: jwtUserId,
                userName,
                isLike,
            });
            await this.videoLikeRepository.save(newReaction);

            const totalLikes = await this.videoLikeRepository.count({
                where: { videoId, isLike: true },
            });

            this.videoGateway.emitVideoLikeUpdate(videoId, {
                totalLikes,
                userId: jwtUserId,
                action: 'add',
            });

            return {
                success: true,
                message: `${isLike ? 'Like' : 'Dislike'} thành công`,
                liked: isLike,
                totalLikes,
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException('Lỗi khi like video: ' + error.message);
        }
    }
}
