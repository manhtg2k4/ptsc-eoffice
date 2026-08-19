import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { NewsCalendarService } from './news-calendar.service';
import { CreateNewsCalendarDto } from './dto/create-news-calendar.dto';
import { UpdateNewsCalendarDto } from './dto/update-news-calendar.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/oauth/decorator/public.decorator';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Giả định có guard này

import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

@ApiTags('Quản lý Lịch Tin tức')
@Controller('news-calendar')
export class NewsCalendarController {
  constructor(
    private readonly newsCalendarService: NewsCalendarService,
    private readonly systemLogService: SystemLogServiceSql
  ) { }

  @ApiOperation({
    summary: 'Tạo sự kiện lịch tin tức',
    description: 'Tạo mới một sự kiện trong lịch tin tức',
  })
  @ApiBody({
    type: CreateNewsCalendarDto,
    description: 'Dữ liệu sự kiện lịch',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo sự kiện thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @Post()
  async create(@Body() createNewsCalendarDto: CreateNewsCalendarDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.create(createNewsCalendarDto, req.user);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lịch tin: Tạo mới sự kiện lịch`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_CREATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Lịch tin: Tạo mới sự kiện lịch - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_CREATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sự kiện kèm bộ lọc' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số bản ghi mỗi trang' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Từ khóa tìm kiếm' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sắp xếp theo trường' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['ASC', 'DESC'], description: 'Thứ tự sắp xếp' })
  @ApiQuery({ name: 'isImportant', required: false, type: Boolean, description: 'Lọc theo sự kiện quan trọng (true: Có, false: Không)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách sự kiện thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  async findAll(@Query() query: any, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.findAll(query);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lịch tin: Truy cập danh sách sự kiện lịch`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_LIST',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Lịch tin: Truy cập danh sách sự kiện lịch - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_LIST',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một sự kiện' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của sự kiện' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết sự kiện thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.findOne(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lịch tin: Xem chi tiết sự kiện lịch ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DETAIL',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Lịch tin: Xem chi tiết sự kiện lịch ID ${id} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DETAIL',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật sự kiện' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của sự kiện cần cập nhật' })
  @ApiBody({ type: UpdateNewsCalendarDto, description: 'Dữ liệu cập nhật sự kiện' })
  @ApiResponse({ status: 200, description: 'Cập nhật sự kiện thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  async update(@Param('id') id: string, @Body() updateNewsCalendarDto: UpdateNewsCalendarDto, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.update(+id, updateNewsCalendarDto, req.user);
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lịch tin: Cập nhật sự kiện lịch ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Lịch tin: Cập nhật sự kiện lịch ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_UPDATE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một sự kiện' })
  @ApiParam({ name: 'id', type: Number, description: 'ID của sự kiện cần xóa' })
  @ApiResponse({ status: 200, description: 'Xóa sự kiện thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.remove(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lịch tin: Xóa sự kiện lịch ID ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DELETE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Lịch tin: Xóa sự kiện lịch ID ${id} - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DELETE',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều sự kiện' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'number' }, description: 'Danh sách ID các sự kiện cần xóa' } } } })
  @ApiResponse({ status: 200, description: 'Xóa nhiều sự kiện thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  async removeMany(@Body('ids') ids: number[], @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
    try {
      const result = await this.newsCalendarService.removeMany(ids);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lịch tin: Xóa nhiều sự kiện lịch`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Lịch tin: Xóa nhiều sự kiện lịch - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CALENDAR_DELETE_MANY',
        userInfo: userId,
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
