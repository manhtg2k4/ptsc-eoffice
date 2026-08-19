// src/task-feature/task-feature.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TaskFeatureService } from './task.feature.service';

@ApiTags('Quản lý Tác vụ')
@Controller('task-feature')
export class TaskFeatureController {
  constructor(
    @Inject('BPMN_RUNTIME') private readonly runtime: any,
    private readonly taskFeatureService: TaskFeatureService
  ) { }

  @Post()
  @ApiOperation({
    summary: 'Tạo mới tác vụ',
    description: 'Tạo mới một tác vụ mới trong hệ thống',
  })
  @ApiBody({
    type: Object,
    description: 'Dữ liệu tác vụ',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  create(@Body() createTaskFeatureDto: any, @Req() req: any) {
    return this.taskFeatureService.create(createTaskFeatureDto, req?.user);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tác vụ',
    description: 'Lấy danh sách tất cả các tác vụ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  findAll() {
    return this.taskFeatureService.findAll();
  }

  @Get('count/task')
  @ApiOperation({ 
    summary: 'Đếm số lượng hồ sơ chưa xử lý',
    description: 'Lấy số lượng các hồ sơ/tác vụ chưa được xử lý của người dùng hiện tại',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Số lượng hồ sơ chưa xử lý', 
    type: Number 
  })
  async countTask(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.taskFeatureService.countTask(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết tác vụ',
    description: 'Lấy thông tin chi tiết của một tác vụ theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của tác vụ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tác vụ',
  })
  findOne(@Param('id') id: string) {
    return this.taskFeatureService.findOne(id);
  }

  @Get('process/:processId')
  @ApiOperation({
    summary: 'Lấy tác vụ theo quy trình',
    description: 'Lấy danh sách tác vụ theo ID quy trình',
  })
  @ApiParam({
    name: 'processId',
    type: String,
    description: 'ID của quy trình',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy quy trình',
  })
  findByProcessId(@Param('processId') processId: string) {
    return this.taskFeatureService.findByProcessId(processId);
  }

  // @Get('by-task')
  // findByProcessIdAndActivityId(
  //   @Query('processId') processId: string,
  //   @Query('taskId') taskId: string,
  // ) {
  //   return this.taskFeatureService.findByProcessIdAndTaskId(processId, taskId);
  // }


  @Get('detail/by-task')
  @ApiOperation({
    summary: 'Lấy chi tiết tác vụ theo quy trình',
    description: 'Lấy thông tin chi tiết của tác vụ theo ID quy trình và ID tác vụ',
  })
  @ApiQuery({
    name: 'processId',
    type: String,
    description: 'ID của quy trình',
  })
  @ApiQuery({
    name: 'taskId',
    type: String,
    description: 'ID của tác vụ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tác vụ',
  })
  async findByProcessIdAndActivityId(
    @Query('processId') processId: string,
    @Query('taskId') taskId: string,
  ) {
    return await this.taskFeatureService.findByProcessIdAndTaskId(processId, taskId);
  }


  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật tác vụ',
    description: 'Cập nhật thông tin của một tác vụ theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của tác vụ cần cập nhật',
  })
  @ApiBody({
    type: Object,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tác vụ',
  })
  update(@Param('id') id: string, @Body() updateTaskFeatureDto, @Req() req: any) {
    return this.taskFeatureService.update(id, updateTaskFeatureDto, req?.user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa tác vụ',
    description: 'Xóa một tác vụ theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của tác vụ cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tác vụ',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.taskFeatureService.remove(id, req?.user);
  }
}
