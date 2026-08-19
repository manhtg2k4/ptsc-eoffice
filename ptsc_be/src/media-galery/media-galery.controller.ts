import { Controller, Get, Param, Query, Req, InternalServerErrorException, HttpException } from '@nestjs/common';
import { MediaGaleryService } from './media-galery.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/oauth/decorator/public.decorator';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { EffectiveUser, AuthorityGuard, AuthorityStages, CheckAuthority } from 'src/authority-documents';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { MediaGaleryPermissionGuard } from './guards/media-galery-permission.guard';
import { MediaGaleryPermissionAction, RequireMediaGaleryPermission } from './decorators/media-galery-permission.decorator';


@ApiTags('Thư viện Media')
@ApiBearerAuth()
@Controller('media-galery')
@UseGuards(AuthorityGuard)
@UseGuards(MediaGaleryPermissionGuard)
export class MediaGaleryController {

  constructor(
    private readonly mediaGaleryService: MediaGaleryService,
    private readonly systemLogService: SystemLogServiceSql
  ) { }

  // @Public()
  @Get()
  @CheckAuthority(AuthorityStages.MEDIA_GALLERY)
  @RequireMediaGaleryPermission(MediaGaleryPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách hợp nhất Album ảnh và Video' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'title', required: false, type: String, description: 'Tìm theo tiêu đề (hỗ trợ tiếng Việt)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Tìm kiếm chung (title)' })
  @ApiQuery({ name: 'topic', required: false, type: String })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['image', 'video'] })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Định dạng yyyy-mm-dd' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Định dạng yyyy-mm-dd' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp dạng JSON (VD: {"createdAt": -1, "views": 1}). 1: ASC, -1: DESC' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Trường cần sắp xếp (vd: createdAt, title, views, totalLikes, totalComments)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async findAll(@Query() query: any, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";

    try {
      const result = await this.mediaGaleryService.findAll(query, req.user);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Media: Truy cập danh sách Album/Video, trang: ${query.page || 1}, limit: ${query.limit || 10}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'MEDIA',
          subType: 'MEDIA_GALLERY_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Media: Truy cập danh sách Album/Video - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'MEDIA',
          subType: 'MEDIA_GALLERY_LIST',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách media.');
    }
  }

  // @Public()
  @Get(':id')
  @CheckAuthority(AuthorityStages.MEDIA_GALLERY)
  @RequireMediaGaleryPermission(MediaGaleryPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy thông tin chi tiết Album ảnh hoặc Video' })
  async findOne(@Param('id') id: string, @Query('type') type: string, @Req() req: any, @EffectiveUser() effectiveUserId: string) {
    const userId = req?.user?.userId || effectiveUserId || "";

    try {
      const result = await this.mediaGaleryService.findOne(id, type, req.user);
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Media: Xem chi tiết ${type === 'video' ? 'Video' : 'Album'} ID ${id}`,
          method: 'GET',
          status: 'SUCCESS',
          type: 'MEDIA',
          subType: 'MEDIA_GALLERY_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi: Media: Xem chi tiết ${type === 'video' ? 'Video' : 'Album'} ID ${id} - ${error.message}`,
          method: 'GET',
          status: 'ERROR',
          type: 'MEDIA',
          subType: 'MEDIA_GALLERY_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy chi tiết media.');
    }
  }

}
