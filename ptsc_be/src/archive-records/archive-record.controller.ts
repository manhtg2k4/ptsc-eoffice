import { Controller, Post, Body, Put, Param, Get, Req, Query, UseGuards, Patch, DefaultValuePipe, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ArchiveRecordService } from './archive-record.service';
import { CreateArchiveRecordDto, listArchiveRecordDto, UpdateRecordStateDto } from './dto/create-archive-record.dto';
import { AuthorityGuard, AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { ArchiveRecordPermissionGuard } from './guard/archive-record.guard';
import { ArchiveRecordPermissionAction, RequireArchiveRecordPermission } from './decorators/archive-record-permission.decorator';

@ApiTags('Quản lý Hồ sơ Lưu trữ')
@Controller('archive-records')
@UseGuards(AuthorityGuard) // Apply guard cho toàn bộ controller
@UseGuards(ArchiveRecordPermissionGuard)
export class ArchiveRecordController {
  constructor(
    private readonly service: ArchiveRecordService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @ApiOperation({
    summary: 'Lấy danh sách hồ sơ',
    description: 'Lấy danh sách hồ sơ lưu trữ với các tab phân loại: tất cả, đang thu nhập, đã lưu trữ, đã tiêu hủy',
  })
  @ApiQuery({
    name: 'type',
    description: 'Loại tab: all, collecting, archived, destroyed',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại (mặc định: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang (mặc định: 50)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get('list')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  // @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW_FOLDER)//check quyền trong service
  async listArchivedRecords(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: listArchiveRecordDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const TAB_MAP = {
      all: 'Tất cả',
      collecting: 'Đang thu nhập',
      archived: 'Đã lưu trữ',
      destroyed: 'Đã tiêu hủy',
    } as const;

    const { type, page = 1, limit = 50 } = query;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';

    try {
      const result = await this.service.listArchivedRecords(query, effectiveUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Danh sách hồ sơ (${tabName}), trang: ${page}, limit: ${limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress:
          req?.headers['x-forwarded-for'] ||
          req?.socket?.remoteAddress ||
          req?.ip ||
          'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập Danh sách hồ sơ (${tabName}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log listArchivedRecords:', logError);
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Lấy danh sách hồ sơ cha',
    description: 'Lấy danh sách hồ sơ lưu trữ cấp cao nhất (hồ sơ cha)',
  })
  @ApiQuery({
    name: 'type',
    description: 'Loại tab: all, collecting, archived, destroyed',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại (mặc định: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang (mặc định: 50)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get('list-parents-archive-record')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW_FOLDER)
  @ApiQuery({ type: listArchiveRecordDto, style: 'deepObject', explode: true })
  async getListParentArchiveRecord(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: listArchiveRecordDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const TAB_MAP = {
      all: 'Tất cả',
      collecting: 'Đang thu nhập',
      archived: 'Đã lưu trữ',
      destroyed: 'Đã tiêu hủy',
    } as const;

    const { type, page = 1, limit = 50 } = query;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';

    try {
      const result = await this.service.getParentRecord(query, effectiveUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Danh sách hồ sơ mẹ (${tabName}), trang: ${page}, limit: ${limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress:
          req?.headers['x-forwarded-for'] ||
          req?.socket?.remoteAddress ||
          req?.ip ||
          'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập Danh sách hồ sơ mẹ (${tabName}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log getListParentArchiveRecord:', logError);
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Lấy danh sách tài liệu để chọn',
    description: 'Lấy danh sách các tài liệu để chọn lưu trữ (văn bản đến, văn bản đi, công việc dự án)',
  })
  @ApiQuery({
    name: 'type',
    description: 'Loại tài liệu: incoming, outgoing, work',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại (mặc định: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang (mặc định: 50)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get('select-documents')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW)
  async listDocumentsRecords(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: listArchiveRecordDto,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const TAB_MAP = {
      incoming: 'Văn bản đến',
      outgoing: 'Văn bản đi',
      work: 'Công việc dự án',
    } as const;

    const { type, page = 1, limit = 50 } = query;
    const typeKey = (type || '').toLowerCase() as keyof typeof TAB_MAP;
    const tabName = TAB_MAP[typeKey] || 'Tất cả';

    try {
      const result = await this.service.listDocumentsRecords(query, effectiveUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Danh sách hồ sơ (${tabName}), trang: ${page}, limit: ${limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress:
          req?.headers['x-forwarded-for'] ||
          req?.socket?.remoteAddress ||
          req?.ip ||
          'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập Danh sách hồ sơ (${tabName}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log listDocumentsRecords:', logError);
      }
      throw error;
    }
  }


  @Post('archive-access-logs')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.CREATE)
  async logAccess(
    @Body() body: { archiveRecordId: string; actionType?: string },
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const userId = req?.user?.userId || effectiveUserId || '';

    await this.service.logArchiveAccess(
      body.archiveRecordId,
      userId,
      body.actionType || 'VIEW',
    );

    return {
      message: 'Log access success',
    };
  }

  @ApiOperation({
    summary: 'Tạo mới hồ sơ lưu trữ',
    description: 'Tạo mới một hồ sơ lưu trữ với các tài liệu được chọn',
  })
  @ApiBody({
    type: CreateArchiveRecordDto,
    description: 'Dữ liệu hồ sơ lưu trữ',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo hồ sơ thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @Post()
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.CREATE)
  async create(
    @Body() dto: CreateArchiveRecordDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.create(dto, effectiveUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tạo mới hồ sơ lưu trữ: ${dto.title}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Tạo mới hồ sơ lưu trữ: ${dto.title} thất bại`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log create error:', logError);
      }
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Cập nhật trạng thái hồ sơ',
    description: 'Cập nhật trạng thái lưu trữ của hồ sơ (đang thu nhập, đã lưu trữ, đã tiêu hủy)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của hồ sơ',
    required: true,
  })
  @ApiBody({
    type: UpdateRecordStateDto,
    description: 'Trạng thái mới của hồ sơ',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hồ sơ',
  })
  @Patch(':id/state')
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.UPDATE)
  async updateState(
    @Param('id') id: string,
    @Body() body: UpdateRecordStateDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.updateRecordState(id, body);
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Cập nhật trạng thái hồ sơ (ID: ${id})`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Cập nhật trạng thái hồ sơ (ID: ${id}) thất bại`,
          method: 'PATCH',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log updateState error:', logError);
      }
      throw error;
    }
  }
  @Put('items/:itemId/files')
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.UPDATE)
  async updateFiles(
    @Param('itemId') itemId: string,
    @Body('fileIds') fileIds: number[],
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.updateItemFiles(itemId, fileIds);
      await this.systemLogService.createLogFromSystem({
        action: 'PUT',
        details: `Cập nhật danh sách file cho item (ID: ${itemId}): [${fileIds.join(', ')}]`,
        method: 'PUT',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Cập nhật danh sách file cho item (ID: ${itemId}) thất bại`,
          method: 'PUT',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log updateFiles error:', logError);
      }
      throw error;
    }
  }

  @Put(':id')
  @ApiQuery({ type: listArchiveRecordDto, style: 'deepObject', explode: true })
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: CreateArchiveRecordDto,
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: listArchiveRecordDto,
    @EffectiveUser() effectiveUserId: string,
  ) {

    try {
      const result = await this.service.update(id, dto);
      await this.systemLogService.createLogFromSystem({
        action: 'PUT',
        details: `Chỉnh sửa hồ sơ lưu trữ: ${id}`,
        method: 'PUT',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress:
          req?.headers['x-forwarded-for'] ||
          req?.socket?.remoteAddress ||
          req?.ip ||
          'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Chỉnh sửa hồ sơ lưu trữ: ${id} thất bại`,
          method: 'PUT',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log update error:', logError);
      }
      throw error;
    }
  }

  // Lấy nút lưu và trình duyệt từ luồng (start)
  @Get('get-action')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  // @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW)
  async getActionAvailableByUser(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.getActionAvailableByUser(originalUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lấy danh sách hành động khả dụng`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lấy danh sách hành động khả dụng thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log getActionAvailableByUser error:', logError);
      }
      throw error;
    }
  }

  @Get('folder-children')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW)
  @ApiQuery({ type: listArchiveRecordDto, style: 'deepObject', explode: true })
  async getFolderChildren(
    @Query() query: listArchiveRecordDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const parentId = query?.parentId || query?.folderId || 'Root';
    try {
      const result = await this.service.getFolderChildren(query, effectiveUserId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thư mục con cho hồ sơ (ID: ${parentId})`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập Thư mục con cho hồ sơ (ID: ${parentId}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log getFolderChildren error:', logError);
      }
      throw error;
    }
  }

  // Chi tiết
  @Get(':id')
  // @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW)
  async getOne(
    @Param('id') id: string,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.findOne(id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem chi tiết hồ sơ lưu trữ (ID: ${id})`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Xem chi tiết hồ sơ lưu trữ (ID: ${id}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log getOne error:', logError);
      }
      throw error;
    }
  }

  @Get('parent/:id')
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.VIEW)
  async getOneParentRecord(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query() query: Record<string, string>, // Nhận toàn bộ query để lấy filter
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const filter = query.filter || {};
      const result = await this.service.findOneChildParentRecord(id, page, limit, filter);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem chi tiết văn bản trong hồ sơ mẹ (ID: ${id})`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Xem chi tiết văn bản trong hồ sơ mẹ (ID: ${id}) thất bại`,
          method: 'GET',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log getOneParentRecord error:', logError);
      }
      throw error;
    }
  }

  @Delete()
  @RequireArchiveRecordPermission(ArchiveRecordPermissionAction.DELETE)
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  async removeMany(
    @Body('ids') ids: string[],
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const result = await this.service.removeMany(ids);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa nhiều hồ sơ lưu trữ: [${ids.join(', ')}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || '',
        ipAddress: req?.ip || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Xóa nhiều hồ sơ lưu trữ thất bại`,
          method: 'DELETE',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || '',
          ipAddress: req?.ip || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log removeMany error:', logError);
      }
      throw error;
    }
  }
}