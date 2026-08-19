import { IsArray, ArrayNotEmpty, IsEnum, IsNumber, IsNotEmpty, ValidateNested } from 'class-validator';
import { EnumGroup } from '../../notification.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateNotificationConfigGroupsDto {
  @ApiProperty({
    description: 'Danh sách các nhóm thông báo (PROCESS, RECEIVE)',
    enum: EnumGroup,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(EnumGroup, { each: true })
  groups: EnumGroup[];
}

export class UpdateNotificationConfigItemDto {
  @ApiProperty({ description: 'ID của loại thông báo cần cập nhật' })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({
    description: 'Danh sách các nhóm thông báo mới (PROCESS, RECEIVE)',
    enum: EnumGroup,
    isArray: true,
  })
  @IsArray()
  @IsEnum(EnumGroup, { each: true })
  groups: EnumGroup[];
}

export class UpdateNotificationConfigBulkDto {
  @ApiProperty({
    description: 'Danh sách các phần tử cần cập nhật hàng loạt',
    type: [UpdateNotificationConfigItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateNotificationConfigItemDto)
  items: UpdateNotificationConfigItemDto[];
}
