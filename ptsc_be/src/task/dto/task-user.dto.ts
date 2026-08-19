import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { TaskUserRole, TaskUserType } from '../entity/task.constants';

export class TaskUserDto {
  @ApiProperty({ description: 'ID người dùng / phòng ban', example: 'user-guid-or-org-guid' })
  @IsString()
  @IsNotEmpty()
  processId: string;

  @ApiProperty({ description: 'Tên người dùng / phòng ban', example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  processName?: string;

  @ApiProperty({ enum: TaskUserRole, description: 'Vai trò (assigner, director, supporter, viewer)', example: TaskUserRole.DIRECTOR })
  // @IsEnum(TaskUserRole)
  @IsString()
  role: string;

  @ApiProperty({ enum: TaskUserType, description: 'Loại (1: cá nhân, 2: phòng ban)', example: TaskUserType.INDIVIDUAL })
  // @IsEnum(TaskUserType)
  @IsNumber()
  type?: number = 1;
}