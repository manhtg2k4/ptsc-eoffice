import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  Req,
  ParseIntPipe,
  MethodNotAllowedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaskDelegationService } from './task-delegation.service';
import { CreateTaskDelegationDto } from './dto/create-task-delegation.dto';
import { UpdateTaskDelegationDto } from './dto/update-task-delegation.dto';
import { TaskDelegationRolesGuard } from './guards/task-delegation.guard';

@UseGuards(TaskDelegationRolesGuard)
@ApiTags('Task Delegation')
@Controller('task-delegations')
export class TaskDelegationController {
  constructor(private readonly delegationService: TaskDelegationService) { }

  @Post()
  @ApiOperation({ summary: 'Tạo uỷ quyền giao việc mới' })
  create(@Body() createDto: CreateTaskDelegationDto, @Req() req: any) {
    const userId = req.user?.userId || 'system-user';
    return this.delegationService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách uỷ quyền của tôi' })
  findAll(@Query() query: any, @Req() req: any) {
    const userId = req.user?.userId || 'system-user';
    return this.delegationService.findAll({ ...query, fromUserId: userId });
  }

  @Get('active')
  @ApiOperation({ summary: 'Lấy các uỷ quyền hiện tại của tôi' })
  findMyActive(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) return [];
    return this.delegationService.findActiveByToUser(userId);
  }

  @Get('delete-many')
  @ApiOperation({ summary: 'Lỗi nếu dùng GET cho xóa nhiều' })
  removeManyGet() {
    throw new MethodNotAllowedException('API xóa nhiều yêu cầu phương thức POST');
  }

  @Post('delete-many')
  @ApiOperation({ summary: 'Xóa nhiều uỷ quyền (POST)' })
  removeManyPost(@Body('ids') ids: number[], @Req() req: any) {
    return this.delegationService.removeMany(ids);
  }

  @Delete('delete-many')
  @ApiOperation({ summary: 'Xóa nhiều uỷ quyền (DELETE)' })
  removeManyDelete(@Body('ids') ids: number[], @Req() req: any) {
    return this.delegationService.removeMany(ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết uỷ quyền' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.delegationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật uỷ quyền' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskDelegationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user';
    return this.delegationService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa uỷ quyền' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.delegationService.remove(id);
  }
}
