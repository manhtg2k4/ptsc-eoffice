import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

export class SignFilesOtpDto {
    @ApiProperty({ description: 'ID của tài liệu' })
    @IsString()
    @IsNotEmpty()
    docId: string;

    @ApiProperty({ description: 'ID của quy trình công việc (Work Item ID)' })
    @IsString()
    @IsNotEmpty()
    workItemId: string;

    @ApiProperty({ description: 'ID của quy trình công việc (Work Item ID)' })
    @IsArray()
    @IsNotEmpty()
    ids: number[];


    @ApiProperty({ description: 'Ảnh ký (base64)', required: false })
    @IsString()
    @IsNotEmpty()
    imageSign?: string;

    @ApiProperty({ description: 'Mã hành động (ví dụ: stampDoc)' })
    @IsString()
    @IsNotEmpty()
    actionCode: string;

    @ApiProperty({ description: 'Lý do ký', required: false })
    @IsString()
    @IsOptional()
    reason?: string;

    @ApiProperty({ description: 'Địa điểm ký', required: false })
    @IsString()
    @IsOptional()
    location?: string;

    @ApiProperty({ description: 'Tên đăng nhập' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ description: 'Mật khẩu' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({ description: 'Cấp độ chữ ký' })
    @IsString()
    @IsNotEmpty()
    signatureLevel: string;

    @ApiProperty({ description: 'Loại hình ký' })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({ description: 'Sign group (draft/digital)', required: false })
    @IsString()
    @IsOptional()
    typeSign?: string;

    @ApiProperty({ description: 'Ký nền' })
    @IsBoolean()
    @IsOptional()
    isBackground?: boolean;

    @ApiProperty({ description: 'Từ khóa ký' })
    @IsString()
    @IsOptional()
    keyword?: string;

    @ApiProperty({ description: 'Token truy cập phần mềm ký' })
    @IsString()
    @IsOptional()
    tokenAccessSign?: string;

    // Các trường bổ sung cho Service dùng (lấy từ header
    tokenSigning?: string;
    serviceId?: string;

    @ApiProperty({ description: 'Loại ký USB hay OTP', default: true })
    @IsBoolean()
    @IsOptional()
    isOTP: boolean;


    @ApiProperty({ description: 'Loại ký văn bản đến' })
    @IsBoolean()
    @IsOptional()
    isIncommingDoc: boolean

    @ApiProperty({ description: 'Metadata thay thế văn bản (JSON string)', required: false })
    @IsString()
    @IsOptional()
    textMetadata?: string;

    @ApiProperty({ description: 'Tọa độ x', required: false })
    @IsNumber()
    @IsOptional()
    x?: number;

    @ApiProperty({ description: 'Tọa độ y', required: false })
    @IsNumber()
    @IsOptional()
    y?: number;

    @ApiProperty({ description: 'Trang ký', required: false })
    @IsNumber()
    @IsOptional()
    page?: number;

    @ApiProperty({ description: 'Chiều rộng chữ ký', required: false })
    @IsNumber()
    @IsOptional()
    width?: number;

    @ApiProperty({ description: 'Chiều cao chữ ký', required: false })
    @IsNumber()
    @IsOptional()
    height?: number;

    @ApiProperty({ description: 'Đường dẫn QR', required: false })
    @IsString()
    @IsOptional()
    qrPath?: string;
}
