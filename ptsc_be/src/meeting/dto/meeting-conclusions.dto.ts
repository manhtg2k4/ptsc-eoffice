// src/meeting/dto/meeting-conclusions.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsInt, IsUUID, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MeetingRelationResponseDto } from './meeting-relation.dto';

// ===== CREATE =====
export class CreateMeetingConclusionDto {
  @ApiProperty({
    description: 'Nội dung kết luận/ghi nhận',
    example: 'Quyết định triển khai dự án mới trong Q2',
  })
  @IsString({ message: 'content phải là chuỗi' })
  @IsNotEmpty({ message: 'content không được để trống' })
  content: string;

  @ApiPropertyOptional({
    description: 'ID người tạo',
    example: 'user123',
  })
  @IsString()
  @IsOptional()
  createdBy?: string;
}

class UpdateSingleConclusionDto {
  @ApiProperty({
    description: 'ID conclusion cần cập nhật',
    example: 123,
  })
  @Type(() => Number)
  @IsInt({ message: 'id phải là số nguyên' })
  id: number;

  @ApiPropertyOptional({
    description: 'Nội dung kết luận',
    example: 'Cập nhật lại quyết định sau cuộc họp bổ sung',
  })
  @IsString({ message: 'content phải là chuỗi' })
  @IsNotEmpty({ message: 'content không được trống' })
  content: string;

  @ApiPropertyOptional({
    description: 'Trạng thái (1: active, 0: inactive)',
    example: 1,
  })
  @IsString({ message: 'createdBy phải là string' })
  @IsOptional()
  createdBy?: string;
}

export class UpdateMeetingConclusionsAndRelationsDto {
  @ApiProperty({
    description: 'Danh sách conclusions cần cập nhật',
    type: [UpdateSingleConclusionDto],
  })
  @IsArray({ message: 'conclusions phải là mảng' })
  @ArrayMinSize(1, { message: 'conclusions phải có ít nhất 1 phần tử' })
  @ValidateNested({ each: true })
  @Type(() => UpdateSingleConclusionDto)
  conclusions: UpdateSingleConclusionDto[];

  @ApiProperty({
    description:
      'Danh sách ID cuộc họp liên kết. Hệ thống sẽ đồng bộ để DB có đúng danh sách này',
    example: ['MEET_2024_010', 'MEET_2024_022'],
    type: [String],
  })
  @IsArray({ message: 'relatedMeetingIds phải là mảng' })
  @IsString({ each: true, message: 'Mỗi relatedMeetingId phải là chuỗi' })
  relatedMeetingIds: string[];
}

// ===== RESPONSE =====
export class MeetingConclusionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  meetingId: string;

  @ApiProperty({ example: 'Quyết định triển khai dự án mới trong Q2' })
  content: string;

  @ApiProperty({ example: 'user123' })
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ example: 1 })
  status: number;
}

export class MeetingConclusionWithTasksDto extends MeetingConclusionDto {
  @ApiProperty({
    type: 'array',
    description: 'Danh sách tasks liên quan',
  })
  tasks: MeetingTaskDto[];
}

export class MeetingTaskDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  assigneeId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ===== STANDARD RESPONSES =====
export class CreateMeetingConclusionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MeetingConclusionDto })
  data: MeetingConclusionDto[];
}

class MeetingRelationsSyncResultDto {
  @ApiProperty({ example: 2, description: 'Số relations được thêm mới' })
  added: number;

  @ApiProperty({ example: 1, description: 'Số relations bị xoá do không còn trong danh sách gửi lên' })
  removed: number;

  @ApiProperty({ example: 3, description: 'Số relations đã tồn tại, không thay đổi' })
  skipped: number;

  @ApiProperty({
    type: [MeetingRelationResponseDto],
    description: 'Danh sách relations được thêm mới trong lần cập nhật này',
  })
  relations: MeetingRelationResponseDto[];
}

class UpdateMeetingConclusionsResultDto {
  @ApiProperty({
    type: [MeetingConclusionDto],
    description: 'Danh sách conclusions đã được cập nhật',
  })
  updatedConclusions: MeetingConclusionDto[];

  @ApiProperty({ type: MeetingRelationsSyncResultDto })
  relations: MeetingRelationsSyncResultDto;
}

export class UpdateMeetingConclusionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UpdateMeetingConclusionsResultDto })
  data: UpdateMeetingConclusionsResultDto;
}

export class DeleteMeetingConclusionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      deleted: { type: 'number', example: 1 },
    },
  })
  data: {
    deleted: number;
  };
}

export class GetMeetingConclusionDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MeetingConclusionWithTasksDto })
  data: MeetingConclusionWithTasksDto;
}

export class GetMeetingConclusionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
  })
  data: MeetingConclusionDto[];
}

// ===== CREATE RECORDS + RELATIONS =====
export class CreateMeetingConclusionsAndRelationsDto {
  @ApiProperty({
    description: 'Danh sách meeting conclusions cần tạo',
    type: [CreateMeetingConclusionDto],
  })
  @IsArray({ message: 'conclusions phải là một mảng' })
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 conclusion' })
  @ValidateNested({ each: true })
  @Type(() => CreateMeetingConclusionDto)
  conclusions: CreateMeetingConclusionDto[];

  @ApiPropertyOptional({
    description: 'Danh sách ID các cuộc họp liên quan',
    type: [String],
    example: [
      '97BE9215-C1E9-4184-9545-211EE9C8A8EA',
      '31E42EA0-7BBB-4530-8892-233DB2FAA81B',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'relatedMeetingIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi ID phải là string hợp lệ' })
  relatedMeetingIds?: string[];
}

export class CreateMeetingConclusionsAndRelationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      conclusions: {
        type: 'array',
        items: { $ref: getSchemaPath(MeetingConclusionDto) },
      },
      relations: {
        type: 'object',
        properties: {
          added: { type: 'number', example: 2 },
          skipped: { type: 'number', example: 0 },
          relations: {
            type: 'array',
            items: { $ref: getSchemaPath(MeetingRelationResponseDto) },
          },
        },
      },
    },
  })
  data: {
    conclusions: MeetingConclusionDto[];
    relations: {
      added: number;
      skipped: number;
      relations: MeetingRelationResponseDto[];
    };
  };
}
