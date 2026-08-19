import { ApiProperty } from '@nestjs/swagger';
import { EnumGroup, ModuleType } from '../../notification.enum';
import { NotificationConfigEntity } from '../notification-config.entity';

export class NotificationConfigResponseDto {
  @ApiProperty({ description: 'ID của cấu hình thông báo' })
  id: number;

  @ApiProperty({ description: 'Tên loại thông báo (VD: Văn bản đi được duyệt)' })
  name: string;

  @ApiProperty({ description: 'Mã loại thông báo (VD: OUTGOING_DOC_APPROVED)' })
  code: string;

  @ApiProperty({ description: 'Tên module liên quan (VD: VIEW_INCOMING_DOC)', enum: ModuleType })
  module: ModuleType;

  @ApiProperty({ description: 'Nhóm thông báo (Xử lý, Nhận)', enum: EnumGroup, isArray: true })
  groups: EnumGroup[];

  static fromEntity(entity: NotificationConfigEntity): NotificationConfigResponseDto {
    const dto = new NotificationConfigResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.module = entity.module;
    dto.groups = entity.groups || [];
    return dto;
  }
}

export class NotificationConfigGroupResponseDto {
  @ApiProperty({ description: 'Mã nhóm thông báo (PROCESS, RECEIVE)' })
  groupCode: string;

  @ApiProperty({ description: 'Danh sách các loại thông báo thuộc nhóm', type: [NotificationConfigResponseDto] })
  list: NotificationConfigResponseDto[];
}

export class NotificationConfigGroupsWrapperResponseDto {
  @ApiProperty({ description: 'Danh sách phân nhóm thông báo', type: [NotificationConfigGroupResponseDto] })
  items: NotificationConfigGroupResponseDto[];
}
