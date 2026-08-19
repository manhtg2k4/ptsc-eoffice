import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DocumentTaskCountQueryDto {
  @ApiPropertyOptional({ description: 'User ID override (for authority view)', required: false })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Authority mode - use authorId as userId', required: false })
  @IsOptional()
  @IsString()
  authority?: string;
}

export class IncomingDocCountDto {
  @ApiProperty({ description: 'Tổng số văn bản đến chờ xử lý' })
  totalWaiting: number;

  @ApiProperty({ description: 'Chờ chỉ đạo (Lãnh đạo)' })
  waitingDirective: number;

  @ApiProperty({ description: 'Chờ xử lý (Lãnh đạo)' })
  waitingProcessLeader: number;

  @ApiProperty({ description: 'Phối hợp (Lãnh đạo)' })
  coordinationLeader: number;

  @ApiProperty({ description: 'Nhận để biết (Lãnh đạo)' })
  receiveToKnowLeader: number;

  @ApiProperty({ description: 'Chờ xử lý (Tài khoản khác)' })
  waitingProcessOther: number;

  @ApiProperty({ description: 'Phối hợp (Tài khoản khác)' })
  coordinationOther: number;

  @ApiProperty({ description: 'Nhận để biết (Tài khoản khác)' })
  receiveToKnowOther: number;
}

export class OutgoingDocCountDto {
  @ApiProperty({ description: 'Tổng số văn bản đi chờ xử lý' })
  totalWaiting: number;

  @ApiProperty({ description: 'Chờ phát hành (Văn thư)' })
  waitingPublish: number;

  @ApiProperty({ description: 'Chờ đóng dấu (Văn thư)' })
  waitingStamp: number;

  @ApiProperty({ description: 'Chờ kiểm tra thể thức (Văn thư)' })
  waitingFormatCheck: number;
}

export class TaskCountDto {
  @ApiProperty({ description: 'Tổng số công việc chung' })
  commonTasks: number;

  @ApiProperty({ description: 'Công việc từ văn bản' })
  taskFromDocument: number;

  @ApiProperty({ description: 'Công việc từ cuộc họp' })
  taskFromMeeting: number;

  @ApiProperty({ description: 'Công việc từ dự án' })
  taskFromProject: number;
}

export class DocumentTaskCountResponseDto {
  @ApiProperty({ description: 'Số đếm văn bản đến', type: IncomingDocCountDto })
  incomingDocuments: IncomingDocCountDto;

  @ApiProperty({ description: 'Số đếm văn bản đi', type: OutgoingDocCountDto })
  outgoingDocuments: OutgoingDocCountDto;

  @ApiProperty({ description: 'Số đếm công việc QLCV', type: TaskCountDto })
  tasks: TaskCountDto;
}
