import { Controller, Get, Post, Delete, Body, Patch, Param, Query, Req, UseInterceptors, UploadedFiles, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AlbumImagesService } from './album-images.service';
import { CreateAlbumImageDto } from './dto/create-album-image.dto';
import { UpdateAlbumImageDto } from './dto/update-album-image.dto';
import { FilterAlbumImageDto } from './dto/filter-album-image.dto';
import { LikeAlbumImageDto } from './dto/like-album-image.dto';
import { multerOptionsAlbum, allowedImageMimeTypes, getImageUrl } from './multer-album.config';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { mapAlbumWithTopic, ALBUM_SORT_OPTIONS } from './album-images.helper';
import { FilesManagementService } from '../files-managerment/files-management-mssql.service';
import { Public } from '../oauth/decorator/public.decorator';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { AuthorityGuard, AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser } from 'src/authority-documents';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';
import { Roles } from 'src/oauth/decorator/roles.decorator';
import { ProcessKey } from 'src/oauth/decorator/process-key.decorator';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';

@ApiTags('Album Images')
@ApiBearerAuth()
@Controller('album-images')
@UseGuards(AuthorityGuard)
export class AlbumImagesController {
  constructor(
    private readonly albumImagesService: AlbumImagesService,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly filesManagementService: FilesManagementService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  private async mapAlbumWithTopicInfo(album: any, onlyTopicName: boolean = false) {
    const topicInfo = await this.albumImagesService.getTopicInfo(album.topic);
    return mapAlbumWithTopic(album, topicInfo, onlyTopicName);
  }

  private async mapAlbumsWithTopicInfo(albums: any[], onlyTopicName: boolean = false) {
    return Promise.all(albums.map(album => this.mapAlbumWithTopicInfo(album, onlyTopicName)));
  }

  @Post('create-with-upload')
  @HttpCode(HttpStatus.CREATED)
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canCreateAlbum')
  @ProcessKey('quan_ly_tin_tuc')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'files', maxCount: 100 },
  ], multerOptionsAlbum))
  @ApiOperation({ summary: 'Tạo album với upload ảnh' })
  @ApiResponse({ status: 201, description: 'Tạo album thành công' })
  async createWithUpload(
    @UploadedFiles() uploadedFiles: { thumbnail?: Express.Multer.File[], files?: Express.Multer.File[] },
    @Body() body: any,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const userId = req?.user?.userId || effectiveUserId || "";
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

      const createDto: CreateAlbumImageDto = {
        title: body.title,
        description: body.description,
        topic: body.topic,
        albumType: body.albumType,
      };

      // Tạo album trước để có ID
      const album = await this.albumImagesService.create(createDto, userId, userName);
      const albumId = album.id;

      // Xử lý thumbnail
      if (uploadedFiles.thumbnail && uploadedFiles.thumbnail.length > 0) {
        const thumbnailFile = uploadedFiles.thumbnail[0];

        if (!allowedImageMimeTypes.includes(thumbnailFile.mimetype)) {
          throw new BadRequestException({
            success: false,
            message: 'Định dạng file không hỗ trợ!',
            errors: [{ field: 'thumbnail', message: 'Ảnh đại diện phải có định dạng: JPG, JPEG, PNG, GIF, WEBP' }],
          });
        }

        // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
        await validateFileSecurity(thumbnailFile);
        await sanitizeFileContent(thumbnailFile);

        const fileResult = await this.filesManagementService.uploadFile(
          {
            object_type: 'album_images',
            object_id: albumId,
            description: `Thumbnail của album: ${body.title}`,
          },
          thumbnailFile,
          userId,
        );

        const thumbnailUrl = fileResult ? `/upload/${fileResult.file_path}` : getImageUrl(thumbnailFile.filename);
        const thumbnailPublicId = fileResult?.public_id;
        const thumbnailFileId = thumbnailPublicId
          ? await this.filesManagementService.resolveFileIdOrThrow(thumbnailPublicId) : undefined;
        await this.albumImagesService.update(albumId, { thumbnail: thumbnailUrl, thumbnailFileId }, userId, userName);
      }

      // Xử lý files (nhiều ảnh)
      if (uploadedFiles.files && uploadedFiles.files.length > 0) {
        const images: any[] = [];

        for (const file of uploadedFiles.files) {
          if (!allowedImageMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException({
              success: false,
              message: 'Định dạng file không hỗ trợ!',
              errors: [{ field: 'files', message: `File "${file.originalname}" có định dạng không hỗ trợ. Chỉ chấp nhận: JPG, JPEG, PNG, GIF, WEBP` }],
            });
          }

          // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
          await validateFileSecurity(file);
          await sanitizeFileContent(file);

          const fileResult = await this.filesManagementService.uploadFile(
            {
              object_type: 'album_images',
              object_id: albumId,
              description: `Ảnh trong album: ${body.title}`,
            },
            file,
            userId,
          );

          if (fileResult) {
            images.push({
              filename: file.filename,
              originalname: file.originalname,
              url: `/upload/${fileResult.file_path}`,
              mimetype: file.mimetype,
              size: file.size,
              file_id: fileResult?.public_id
                ? await this.filesManagementService.resolveFileIdOrThrow(fileResult.public_id)
                : null,
            });
          }
        }

        await this.albumImagesService.update(albumId, { images }, userId, userName);
      }

      const updatedAlbum = await this.albumImagesService.findOne(albumId);

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Album ảnh: Tạo mới album "${body.title}"`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_CREATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Tạo album ảnh thành công!',
        data: await this.mapAlbumWithTopicInfo(updatedAlbum),
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Album ảnh: Tạo mới album "${body.title}" - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_CREATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // @Public()
  @Get()
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canViewAlbum')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Lấy danh sách album ảnh (không cần auth)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAll(@Query() filterDto: FilterAlbumImageDto, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      const result = await this.albumImagesService.findWithFilter(filterDto, userId);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Album ảnh: Truy cập danh sách album`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return {
        success: true,
        message: 'Lấy danh sách album thành công!',
        data: await this.mapAlbumsWithTopicInfo(result.data, true),
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
          details: `Lỗi: Album ảnh: Truy cập danh sách album - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  // @Public()
  @Get('public/list')
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Lấy danh sách album ảnh (public - không cần auth)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async findAllPublic(@Query() filterDto: FilterAlbumImageDto, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      const result = await this.albumImagesService.findWithFilter(filterDto, userId);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Album ảnh: Truy cập danh sách album public`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_LIST_PUBLIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return {
        success: true,
        message: 'Lấy danh sách album thành công!',
        data: await this.mapAlbumsWithTopicInfo(result.data, true),
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
          details: `Lỗi: Album ảnh: Truy cập danh sách album public - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_LIST_PUBLIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  // @Public()
  @Get('public/:id')
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Lấy chi tiết album ảnh (public - không cần auth)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  async findOnePublic(@Param('id') id: string, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      const album = await this.albumImagesService.findOne(id, userId);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Album ảnh: Xem chi tiết album public ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_DETAIL_PUBLIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return {
        success: true,
        message: 'Lấy chi tiết album thành công!',
        data: await this.mapAlbumWithTopicInfo(album),
      };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Album ảnh: Xem chi tiết album public ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_DETAIL_PUBLIC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  // @Public()
  @Get('sort-options')
  @ApiOperation({ summary: 'Lấy danh sách tùy chọn sắp xếp cho dropdown' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  getSortOptions() {
    return {
      success: true,
      message: 'Lấy danh sách tùy chọn sắp xếp thành công!',
      data: ALBUM_SORT_OPTIONS,
    };
  }
  // @Public()
  @Get(':id')
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Lấy chi tiết album ảnh' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  async findOne(@Param('id') id: string, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      const album = await this.albumImagesService.findOne(id, userId);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Album ảnh: Xem chi tiết album ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return {
        success: true,
        message: 'Lấy chi tiết album thành công!',
        data: await this.mapAlbumWithTopicInfo(album),
      };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Album ảnh: Xem chi tiết album ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'ALBUM_IMAGES',
          subType: 'ALBUM_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Patch(':id')
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canUpdateAlbum')
  @ProcessKey('quan_ly_tin_tuc')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'files', maxCount: 100 },
  ], multerOptionsAlbum))
  @ApiOperation({ summary: 'Cập nhật album ảnh' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async update(
    @Param('id') id: string,
    @UploadedFiles() uploadedFiles: { thumbnail?: Express.Multer.File[], files?: Express.Multer.File[] },
    @Body() body: any,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      let userName = undefined;

      if (userId) {
        const user: any = await this.sqlsvRepo.getUserById(userId);
        userName = user?.name || undefined;
      }

      const updateDto: UpdateAlbumImageDto = {};
      if (body.title) updateDto.title = body.title;
      if (body.description) updateDto.description = body.description;
      if (body.topic) updateDto.topic = body.topic;
      if (body.albumType) updateDto.albumType = body.albumType;

      // Lấy thông tin album hiện tại để xử lý việc xóa ảnh (filter images)
      const currentAlbum = await this.albumImagesService.findOne(id);

      // Xử lý cập nhật danh sách ảnh (nếu có gửi lên images -> xóa những ảnh không có trong list)
      if (body.images !== undefined) {
        let keepFileIds: string[] = [];

        if (typeof body.images === 'string') {
          const cleanStr = body.images.trim();
          if (cleanStr.length > 0) {
            keepFileIds = cleanStr.split(',').map(s => s.trim());
          }
        } else if (Array.isArray(body.images)) {
          keepFileIds = body.images.map(String);
        }

        if (currentAlbum.images && Array.isArray(currentAlbum.images)) {
          // Chỉ giữ lại những ảnh có file_id nằm trong danh sách keepFileIds
          updateDto.images = currentAlbum.images.filter((img: any) =>
            img.file_id && keepFileIds.includes(String(img.file_id))
          );
        } else {
          updateDto.images = [];
        }
      }

      // Cập nhật thông tin cơ bản
      if (Object.keys(updateDto).length > 0) {
        await this.albumImagesService.update(id, updateDto, userId, userName);
      }

      // Xử lý thumbnail mới
      if (uploadedFiles?.thumbnail && uploadedFiles.thumbnail.length > 0) {
        const thumbnailFile = uploadedFiles.thumbnail[0];

        if (!allowedImageMimeTypes.includes(thumbnailFile.mimetype)) {
          throw new BadRequestException({
            success: false,
            message: 'Định dạng file không hỗ trợ!',
            errors: [{ field: 'thumbnail', message: 'Ảnh đại diện phải có định dạng: JPG, JPEG, PNG, GIF, WEBP' }],
          });
        }

        // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
        await validateFileSecurity(thumbnailFile);
        await sanitizeFileContent(thumbnailFile);

        const fileResult = await this.filesManagementService.uploadFile(
          {
            object_type: 'album_images',
            object_id: id,
            description: `Thumbnail cập nhật`,
          },
          thumbnailFile,
          userId,
        );

        const thumbnailUrl = fileResult ? `/upload/${fileResult.file_path}` : getImageUrl(thumbnailFile.filename);
        const thumbnailPublicId = fileResult?.public_id;
        const thumbnailFileId = thumbnailPublicId
          ? await this.filesManagementService.resolveFileIdOrThrow(thumbnailPublicId) : undefined;
        await this.albumImagesService.update(id, { thumbnail: thumbnailUrl, thumbnailFileId }, userId, userName);
      }

      // Xử lý files mới (thêm ảnh vào album)
      if (uploadedFiles?.files && uploadedFiles.files.length > 0) {
        const currentAlbum = await this.albumImagesService.findOne(id);
        const existingImages = currentAlbum.images || [];
        const newFilesCount = uploadedFiles.files.length;

        if (existingImages.length + newFilesCount > 100) {
          throw new BadRequestException({
            success: false,
            message: 'Số lượng ảnh vượt quá giới hạn!',
            errors: [{ field: 'files', message: `Album đã có ${existingImages.length} ảnh. Bạn không thể thêm ${newFilesCount} ảnh nữa vì vượt quá giới hạn 100 ảnh mỗi album.` }],
          });
        }

        const newImages: any[] = [];

        for (const file of uploadedFiles.files) {
          if (!allowedImageMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException({
              success: false,
              message: 'Định dạng file không hỗ trợ!',
              errors: [{ field: 'files', message: `File "${file.originalname}" có định dạng không hỗ trợ` }],
            });
          }

          // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
          await validateFileSecurity(file);
          await sanitizeFileContent(file);

          const fileResult = await this.filesManagementService.uploadFile(
            {
              object_type: 'album_images',
              object_id: id,
              description: `Ảnh cập nhật`,
            },
            file,
            userId,
          );

          if (fileResult) {
            newImages.push({
              filename: file.filename,
              originalname: file.originalname,
              url: `/upload/${fileResult.file_path}`,
              mimetype: file.mimetype,
              size: file.size,
              file_id: fileResult?.public_id
                ? await this.filesManagementService.resolveFileIdOrThrow(fileResult.public_id)
                : null,
            });
          }
        }

        // Merge ảnh mới với ảnh cũ
        const mergedImages = [...(currentAlbum.images || []), ...newImages];
        await this.albumImagesService.update(id, { images: mergedImages }, userId, userName);
      }

      const updatedAlbum = await this.albumImagesService.findOne(id);

      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Album ảnh: Cập nhật album ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Cập nhật album thành công!',
        data: await this.mapAlbumWithTopicInfo(updatedAlbum),
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Album ảnh: Cập nhật album ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete('soft-delete-many')
  @HttpCode(HttpStatus.OK)
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canDeleteAlbum')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Xóa mềm nhiều album' })
  @ApiResponse({ status: 200, description: 'Xóa mềm thành công' })
  async softRemoveMany(@Body() body: { ids: string[] }, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        throw new BadRequestException({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: [{ field: 'ids', message: 'Vui lòng cung cấp mảng ID album cần xóa' }],
        });
      }

      const result = await this.albumImagesService.softRemoveMany(body.ids);

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Album ảnh: Xóa mềm nhiều album: ${body.ids.join(', ')}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `Xóa album thành công!`,
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
        details: `Lỗi: Album ảnh: Xóa mềm nhiều album - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete('hard-delete-many')
  @HttpCode(HttpStatus.OK)
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canDeleteAlbum')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Xóa vĩnh viễn nhiều album (hard delete)' })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công' })
  async hardRemoveMany(@Body() body: { ids: string[] }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'ids', message: 'Vui lòng cung cấp mảng ID album cần xóa vĩnh viễn' }],
      });
    }

    const result = await this.albumImagesService.hardRemoveMany(body.ids);

    return {
      success: true,
      message: `Xóa vĩnh viễn ${result.success} album thành công!`,
      data: {
        total: body.ids.length,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      },
    };
  }

  @Post('like-album')
  @HttpCode(HttpStatus.OK)
  @CheckAuthority(AuthorityStages.ALBUM_IMAGES)
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('quan_ly_tin_tuc')
  @ApiOperation({ summary: 'Like/Unlike một album' })
  @ApiResponse({ status: 200, description: 'Thực hiện thành công' })
  async likeAlbum(
    @Body() dto: LikeAlbumImageDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const userId = req?.user?.userId || effectiveUserId || "";
    try {
      const result = await this.albumImagesService.likeImage(dto, req.user);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Album ảnh: ${dto.isLike ? 'Thích' : 'Bỏ thích'} album ID ${dto.albumId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_LIKE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Album ảnh: Thích/Bỏ thích album ID ${dto.albumId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'ALBUM_IMAGES',
        subType: 'ALBUM_LIKE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}

