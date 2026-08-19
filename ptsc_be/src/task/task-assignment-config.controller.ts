import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaskAssignmentConfigService } from './task-assignment-config.service';
import { CreateTaskAssignmentConfigDto } from './dto/create-task-assignment-config.dto';
import { UpdateTaskAssignmentConfigDto } from './dto/update-task-assignment-config.dto';
import { TaskAssignmentConfigRolesGuard } from './guards/task-assignment-config.guard';

@UseGuards(TaskAssignmentConfigRolesGuard)
@ApiTags('Task Assignment Config')
@Controller('task-assignment-configs')
export class TaskAssignmentConfigController {
  constructor(private readonly configService: TaskAssignmentConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo cấu hình nhận việc cho phòng ban' })
  create(@Body() createDto: CreateTaskAssignmentConfigDto, @Req() req: any) {
    const userId = req.user?.userId || 'system-user';
    return this.configService.create(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả cấu hình' })
  findAll(@Req() req: any) {
    const userId = req.user?.userId || 'system-user';
    return this.configService.findAll(userId);
  }

  @Get(':unitId')
  @ApiOperation({ summary: 'Lấy cấu hình theo unitId' })
  findOne(@Param('unitId') unitId: string) {
    return this.configService.findByUnitId(unitId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật cấu hình' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskAssignmentConfigDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId || 'system-user';
    return this.configService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa cấu hình' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.configService.remove(id);
  }
}
