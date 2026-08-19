import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateReturnVoucherDto {
    @ApiProperty({ description: 'Chữ ký số / CA Signature Base64 của Quản lý hộ chiếu (QLHC)', required: false })
    @IsOptional()
    @IsString()
    performerSignature?: string;

    @ApiProperty({ description: 'Ghi chú biên bản trả hộ chiếu', required: false })
    @IsOptional()
    @IsString()
    note?: string;

    @ApiProperty({ description: 'Tên đơn vị', required: false })
    @IsOptional()
    @IsString()
    unitName?: string;

    @ApiProperty({ description: 'Tên phòng ban', required: false })
    @IsOptional()
    @IsString()
    departmentName?: string;

    @ApiProperty({ description: 'Tên người bàn giao (QLHC)', required: false })
    @IsOptional()
    @IsString()
    performerName?: string;

    @ApiProperty({ description: 'ID người nhận (Chủ hộ chiếu)', required: false })
    @IsOptional()
    @IsString()
    receiverId?: string;

    @ApiProperty({ description: 'Tên người nhận (Chủ hộ chiếu)', required: false })
    @IsOptional()
    @IsString()
    receiverName?: string;

    @ApiProperty({ description: 'Ghi chú riêng cho từng hộ chiếu: key = passportId hoặc itemId', required: false })
    @IsOptional()
    itemNotes?: Record<string, string>;

    @ApiProperty({ description: 'Danh sách ID hộ chiếu chọn để lập biên bản (nếu không chọn hết)', required: false })
    @IsOptional()
    selectedItemIds?: string[];
}

export class SignVoucherDto extends CreateReturnVoucherDto {}

export class OwnerSignDto {
    @ApiProperty({
        description: 'Chữ ký số / CA Signature Base64 của Chủ hộ chiếu',
        required: false,
        example: 'DIGITAL_SIGNED_OWNER_BASE64_STRING',
    })
    @IsOptional()
    @IsString()
    receiverSignature?: string;

    @ApiProperty({
        description: 'Ghi chú xác nhận khi nhận hộ chiếu (nếu có)',
        required: false,
    })
    @IsOptional()
    @IsString()
    note?: string;
}

export class OwnerRejectDto {
    @ApiProperty({
        description: 'Lý do trả lại phiếu trả hộ chiếu do thông tin không chính xác',
        required: true,
        example: 'Thông tin hộ chiếu chưa chính xác',
    })
    @IsNotEmpty()
    @IsString()
    reason: string;
}
