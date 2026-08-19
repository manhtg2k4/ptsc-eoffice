import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    IsArray,
    IsNotEmpty,
} from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({ description: 'Tên dự án' })
    @IsNotEmpty({ message: 'Tên dự án là bắt buộc và không được để trống.' })
    @IsString({ message: 'Tên dự án phải là chuỗi ký tự.' })
    name: string;

    @ApiProperty({ description: 'Ngày bắt đầu', required: false })
    @IsOptional()
    @IsDateString({}, { message: 'Ngày bắt đầu phải là định dạng ngày hợp lệ (ISO 8601).' })
    startDate?: string;

    @ApiProperty({ description: 'Ngày kết thúc', required: false })
    @IsOptional()
    @IsDateString({}, { message: 'Ngày kết thúc phải là định dạng ngày hợp lệ (ISO 8601).' })
    endDate?: string;

    @ApiProperty({ description: 'Quy trình', required: false })
    @IsOptional()
    @IsString({ message: 'Quy trình phải là chuỗi ký tự.' })
    process?: string;

    @ApiProperty({ description: 'Thời gian nhắc hạn (ví dụ: 1 ngày, 24 giờ)', default: '3' })
    @IsOptional()
    @IsString({ message: 'Thời gian nhắc hạn phải là chuỗi ký tự.' })
    reminderDays?: string;

    @ApiProperty({ description: 'Độ ưu tiên', default: 'binhthuong', example: 'gap' })
    @IsOptional()
    @IsString({ message: 'Độ ưu tiên phải là chuỗi ký tự.' })
    priority?: string;

    @ApiProperty({ description: 'Loại dự án', required: false })
    @IsOptional()
    @IsString({ message: 'Loại dự án phải là chuỗi ký tự.' })
    typeProject?: string;

    @ApiProperty({ description: 'ID phòng ban', required: false, type: [String] })
    @IsOptional()
    @IsArray({ message: 'ID phòng ban phải là một danh sách chuỗi ký tự.' })
    @IsString({ each: true, message: 'Mỗi ID phòng ban phải là chuỗi ký tự.' })
    organizationUnitId?: string[];

    @ApiProperty({ description: 'Ngân sách', default: 0 })
    @IsOptional()
    @IsNumber({}, { message: 'Ngân sách phải là một số hợp lệ.' })
    budget?: number;

    @ApiProperty({ description: 'Đơn vị tiền tệ (Hệ số nhân: 1000000000 = Tỷ, 1000000 = Triệu, 1 = VNĐ)', default: 1, required: false })
    @IsOptional()
    @IsNumber({}, { message: 'Đơn vị tiền tệ phải là một số hợp lệ.' })
    moneyUnit?: number;

    @ApiProperty({ description: 'Mô tả dự án', required: false })
    @IsOptional()
    @IsString({ message: 'Mô tả dự án phải là chuỗi ký tự.' })
    description?: string;

    @ApiProperty({ description: 'Quản lý dự án (ID User)', required: false })
    @IsOptional()
    @IsString({ message: 'ID quản lý dự án phải là chuỗi ký tự.' })
    managerId?: string;

    @ApiProperty({ description: 'Thành viên dự án (IDs cách nhau bởi dấu phẩy)', required: false })
    @IsOptional()
    @IsString({ message: 'Danh sách thành viên phải là chuỗi ký tự.' })
    members?: string;

    @ApiProperty({ description: 'Người xem (IDs cách nhau bởi dấu phẩy)', required: false })
    @IsOptional()
    @IsString({ message: 'Danh sách người xem phải là chuỗi ký tự.' })
    viewers?: string;

    @ApiProperty({ description: 'Tiến độ (%)', required: false, default: 0 })
    @IsOptional()
    @IsNumber({}, { message: 'Tiến độ phải là một số hợp lệ.' })
    progress?: number;

    @ApiProperty({ description: 'Trạng thái nghiệp vụ (Chuẩn bị, Đang thực hiện, Hoàn thành, Hủy, Tạm dừng)', required: false, default: '1' })
    @IsOptional()
    @IsString({ message: 'Trạng thái nghiệp vụ phải là chuỗi ký tự.' })
    projectStatus?: string;

    @ApiProperty({ description: 'Phân quyền chi tiết cho các vai trò', required: false })
    @IsOptional()
    permissions?: any;

    @ApiProperty()
    @IsOptional()
    isUpdateStatus?: string;

    @ApiProperty()
    @IsOptional()
    isUpdateGeneralInfo?: string;

    @ApiProperty()
    @IsOptional()
    isUpdateParticipants?: string;

    @ApiProperty()
    @IsOptional()
    isUpdateProcess?: string;
}
