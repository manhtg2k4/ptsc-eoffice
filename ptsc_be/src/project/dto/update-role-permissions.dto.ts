import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRolePermissionsDto {
    @ApiProperty({ description: 'Quyền cập nhật trạng thái', required: false })
    @IsOptional()
    @IsBoolean()
    updateStatus?: boolean;

    @ApiProperty({ description: 'Quyền cập nhật thông tin chung', required: false })
    @IsOptional()
    @IsBoolean()
    updateGeneralInfo?: boolean;

    @ApiProperty({ description: 'Quyền cập nhật thông tin người tham gia', required: false })
    @IsOptional()
    @IsBoolean()
    updateParticipants?: boolean;

    @ApiProperty({ description: 'Quyền tải lên tài liệu', required: false })
    @IsOptional()
    @IsBoolean()
    uploadFiles?: boolean;

    @ApiProperty({ description: 'Quyền bình luận', required: false })
    @IsOptional()
    @IsBoolean()
    comment?: boolean;

    @ApiProperty({ description: 'Quyền nhập lý do chậm tiến độ', required: false })
    @IsOptional()
    @IsBoolean()
    inputDelayReason?: boolean;

    @ApiProperty({ description: 'Quyền xem phân tích', required: false })
    @IsOptional()
    @IsBoolean()
    viewAnalysis?: boolean;

    @ApiProperty({ description: 'Quyền phân quyền', required: false })
    @IsOptional()
    @IsBoolean()
    setPermissions?: boolean;
}
