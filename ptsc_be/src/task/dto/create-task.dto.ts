import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsInt,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskUserDto } from './task-user.dto';
import { encodeHTML } from '../../utils/html-sanitize.util';

export class CreateTaskDto {

  @IsOptional()
  nodeId?: string;

  @IsOptional()
  assigneeUserId?: string;

  @ApiPropertyOptional({ description: 'ID công việc gốc (nếu tạo từ công việc)', example: 1 })
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
  @IsOptional()
  @IsNumber()
  taskId?: number;

  @ApiProperty({ description: 'Tên công việc', example: 'Hoàn thành báo cáo quý 4' })
  @IsString()
  @Transform(({ value }) => encodeHTML(value))
  name: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu', example: '2024-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Hạn xử lý', example: '2024-10-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Ngày kết thúc lặp', example: '2024-10-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: Date;

  @ApiPropertyOptional({ description: 'ID Quy trình (BPMN)', example: '1' })
  @IsOptional()
  @IsString()
  bpmnId?: string;

  @ApiPropertyOptional({ description: 'Độ ưu tiên', example: 'gap' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Thời gian nhắc hạn', example: '1d' })
  @IsOptional()
  @IsString()
  reminderTime?: string;

  @ApiPropertyOptional({ description: 'Chủ đề', example: 'Báo cáo' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => encodeHTML(value))
  topic?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => encodeHTML(value))
  code?: string | null;

  @ApiPropertyOptional({ description: 'Mô tả', example: 'Chi tiết công việc...' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => encodeHTML(value))
  note?: string;

  @ApiPropertyOptional({ description: 'Công việc lặp lại (daily, weekly, monthly, quarterly)', example: 'monthly' })
  @IsOptional()
  @IsString()
  repetitiveTask?: string;

  @ApiPropertyOptional({ description: 'Chọn tháng lặp trong quý (1,2,3 cho quý)', example: '1,2,3' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Chọn các thứ trong tuần (0=CN, 1=T2, ..., 6=T7)', example: '1,3,5' })
  @IsOptional()
  @IsString()
  daysOfWeek?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu lặp (dùng để lấy ngày trong tháng/quý)' })
  @IsOptional()
  @IsDateString()
  repetitiveStart?: Date;

  @ApiPropertyOptional({ description: 'Lặp đến ngày' })
  @IsOptional()
  @IsDateString()
  repetitiveEnd?: Date;

  @ApiPropertyOptional({ description: 'Loại ngày lặp trong tháng: specific_day, relative_day, last_day', example: 'specific_day' })
  @IsOptional()
  @IsString()
  executionType?: string;

  @ApiPropertyOptional({ description: 'Tuần tương đối trong tháng: first, second, third, fourth, last', example: 'first' })
  @IsOptional()
  @IsString()
  relativeWeek?: string;

  @ApiPropertyOptional({
    description: 'Ngày trong tuần cho tuần tương đối (0=CN, 1=T2,... 6=T7)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  relativeDay?: number;

  @ApiPropertyOptional({ description: 'Ngày cụ thể trong tháng (1-31)', example: 15 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Ngày cụ thể trong tháng (1-31)', example: 15 })
  @IsOptional()
  // @IsInt()
  // @Type(() => Number)
  weekDays?: string;

  @ApiPropertyOptional({ description: 'Tháng trong quý (1, 2, 3)', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  monthInQuarter?: number;

  @ApiPropertyOptional({ description: 'Số ngày thực hiện công việc', example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Giờ lặp (HH:mm)', example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Thể hiện quan hệ cha con (ID cha)', example: '123' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'Lý do tạm dừng', example: 'Nghỉ phép' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => encodeHTML(value))
  pauseReason?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu tạm dừng' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? null : value))
  pauseStartDate?: Date;

  @ApiPropertyOptional({ description: 'Ngày kết thúc tạm dừng' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? null : value))
  pauseEndDate?: Date;

  @ApiPropertyOptional({ description: 'Tạm dừng vô thời hạn' })
  @IsOptional()
  pauseIndefinitely?: boolean;

  @ApiPropertyOptional({ description: 'Tiến độ', example: '50' })
  @IsOptional()
  @IsString()
  progress?: string;

  // @ApiPropertyOptional({ description: 'Tiến độ', example: '50%' })
  @IsOptional()
  @IsString()
  typeTask?: string = TASK_TYPE.GENERAL;

  @ApiPropertyOptional({ description: 'Trạng thái (1: active, 0: deleted)', example: 1 })
  @IsOptional()
  @IsInt()
  status?: number = 1;

  @ApiPropertyOptional({ description: 'Thể hiện cha con', example: 1 })
  @IsOptional()
  @IsInt()
  parent?: number;

  @ApiPropertyOptional({ description: 'Thể hiện cha con với cv lặp lại', example: 1 })
  @IsOptional()
  @IsInt()
  recurringFromId?: number | null;

  @ApiPropertyOptional({ description: 'ID Quy trình mẫu (Template)', example: 'uuid' })
  @IsOptional()
  @IsString()
  templateId?: string | null;

  @ApiPropertyOptional({ description: 'ID tài liệu (văn bản - truyền vào nếu tạo công việc từ văn bản)', example: '1767954403052' })
  @IsOptional()
  @IsString()
  docId?: string | null;

  @ApiPropertyOptional({ description: 'ID tài liệu (cuộc họp - truyền vào nếu tạo công việc từ cuộc họp)', example: 'C2A3C22E-74A7-4D79-8856-01E8570790DE' })
  @IsOptional()
  @IsString()
  meetingId?: string | null;

  @ApiPropertyOptional({ description: 'ID kết luận cuộc họp (cuộc họp - truyền vào nếu tạo công việc từ cuộc họp)', example: 'C2A3C22E-74A7-4D79-8856-01E8570790DE' })
  @IsOptional()
  meetingConclusionId?: string;

  @ApiPropertyOptional({ description: 'Loại task cuộc họp (meeting: từ cuộc họp, conclusion: từ kết luận cuộc họp)', example: 'meeting' })
  @IsOptional()
  @IsString()
  typeTaskMeeting?: string;

  @ApiPropertyOptional({ description: 'ID dự án (truyền vào nếu tạo công việc từ dự án)', example: 1 })
  @IsOptional()
  @IsNumber()
  projectId?: number | null;

  @ApiPropertyOptional({ description: 'Trạng thái xử lý', example: '1', default: '1' })
  @IsOptional()
  @IsString()
  processStatus?: string;

  // @ApiPropertyOptional({ description: 'Trạng thái xử lý', example: 'processing', default: '1' })
  @IsOptional()
  // @IsString()
  fileIds?: any;

  @ApiPropertyOptional({ type: [TaskUserDto] })
  @IsOptional()
  @IsArray()
  assigners?: TaskUserDto[];

  @ApiPropertyOptional({ type: [TaskUserDto] })
  @IsOptional()
  @IsArray()
  directors?: TaskUserDto[];

  @ApiPropertyOptional({ type: [TaskUserDto] })
  @IsOptional()
  @IsArray()
  supporters?: TaskUserDto[];

  @ApiPropertyOptional({ type: [TaskUserDto] })
  @IsOptional()
  @IsArray()
  viewers?: TaskUserDto[];

  @ApiPropertyOptional({ type: [TaskUserDto] })
  @IsOptional()
  @IsBoolean()
  isTaskProject?: boolean;


  @ApiPropertyOptional({ description: 'Bỏ qua validate thời gian quy trình mẫu', example: false })
  @IsOptional()
  bypassTemplateTimeValidation?: boolean;

  @ApiPropertyOptional({ description: 'ID công việc phụ thuộc', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dependentTaskId?: number | null;

  @ApiPropertyOptional({ description: 'Công việc mật', example: false })
  @IsOptional()
  @IsBoolean()
  isConfidential?: boolean;

  @IsOptional()
  @IsBoolean()
  isApprovalRequired?: boolean;

}
export enum TASK_TYPE {
  GENERAL = 'general',
  RECURRING = 'recurring',
  TEMPLATE = 'template',
  FORM_DOC = 'form_doc',
  FORM_MEETING = 'form_meeting',
  FORM_PROJECT = 'form_project',
  PROJECT = 'project',
}
