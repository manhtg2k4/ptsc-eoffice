import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { DocumentLibraryService } from './document-library.service';
import { CreateDocumentLibraryDto } from './dto/create-document-library.dto';
import { UpdateDocumentLibraryDto } from './dto/update-document-library.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AuthorityGuard } from 'src/authority-documents';
import { DocumentLibraryPermissionGuard } from './guards/document-library-permission.guard';

@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('/document-library')
export class DocumentLibraryController {
  constructor(
    private readonly service: DocumentLibraryService,
    private readonly systemLogService: SystemLogServiceSql,
  ) {}

  @Post()
  @UseGuards(DocumentLibraryPermissionGuard)
  async create(@Body() createDto: CreateDocumentLibraryDto, @Req() req: any) {
    const data = await this.service.create(createDto, req.user?.userId);
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tạo mới thư viện tài liệu, id: ${data.id}, tên: "${createDto.name}"${createDto.parentId ? `, thuộc thư mục cha id: ${createDto.parentId}` : ''}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TVTL',
        subType: process.env.CLIENT_LOG || 'TVTL',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return {
      success: true,
      data,
    };
  }

  @Get('check-permission')
  async checkPermission(@Req() req: any) {
    const userId = req?.user?.userId;
    if (!userId) {
      return {
        success: true,
        data: { hasPermission: false },
      };
    }
    const hasPermission = await this.service.checkPermission(userId);
    return {
      success: true,
      data: { hasPermission },
    };
  }

  @Get('organization-units')
  @ApiOperation({ summary: 'Lấy danh sách đơn vị/phòng ban theo luồng với cấu trúc tree và users (dùng cho thư viện tài liệu)' })
  async getOrganizationUnits(
    @Req() req: any,
    @Query('parentId') parentId?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: any,
    @Query('unitId') unitId?: string,
  ) {
    const userId = req?.user?.userId;
    const targetUnitId = parentId || unitId || filter?.unitId;
    const hasUser = filter?.hasUser === 'true' || filter?.hasUser === true ;
    return this.service.getOrganizationUnitsTree(userId, targetUnitId, search, hasUser);
  }

  @Get()
  async getList(@Query() query: any, @Req() req: any) {
    const result = await this.service.findAll(query, req.user?.userId);
    return {
      success: true,
      ...result,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const data = await this.service.findOne(Number(id), req.user?.userId);
    return {
      success: true,
      data,
    };
  }

  @Patch('update-order')
  @UseGuards(DocumentLibraryPermissionGuard)
  async updateOrder(@Body() orders: { id: number; sortOrder: number }[]) {
    return await this.service.updateOrder(orders);
  }

  @Patch(':id')
  @UseGuards(DocumentLibraryPermissionGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDocumentLibraryDto,
    @Req() req: any
  ) {
    const data = await this.service.update(Number(id), updateDto, req.user?.userId);
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Cập nhật thư viện tài liệu, id: ${id}, tên: "${data.name}"${updateDto.name ? `, tên mới: "${updateDto.name}"` : ''}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TVTL',
        subType: process.env.CLIENT_LOG || 'TVTL',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return {
      success: true,
      data,
    };
  }

  @Delete()
  @UseGuards(DocumentLibraryPermissionGuard)
  async removeMultiple(@Body('ids') ids: any[], @Req() req: any) {
    const numericIds = Array.isArray(ids) ? ids.map(id => Number(id)) : [];
    const result = await this.service.removeMultiple(numericIds);
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa nhiều thư viện tài liệu, ids: [${numericIds.join(', ')}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TVTL',
        subType: process.env.CLIENT_LOG || 'TVTL',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return result;
  }

  @Delete(':id')
  @UseGuards(DocumentLibraryPermissionGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    const result = await this.service.remove(Number(id));
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa thư viện tài liệu, id: ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'TVTL',
        subType: process.env.CLIENT_LOG || 'TVTL',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return result;
  }
}
