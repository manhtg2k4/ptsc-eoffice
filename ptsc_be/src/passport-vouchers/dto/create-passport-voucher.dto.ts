import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePassportVoucherDto {
    @IsEnum(['HANDOVER', 'RETURN'])
    voucherType: string;

    @IsOptional()
    @IsString()
    unitName?: string;

    @IsOptional()
    @IsString()
    departmentName?: string;

    @IsOptional()
    @IsString()
    fromName?: string; // Tên người ký/giao

    @IsOptional()
    @IsString()
    performerRole?: string; // Vai trò người giao

    @IsOptional()
    @IsString()
    receiverName?: string;

    @IsOptional()
    @IsString()
    receiverId?: string;

    @IsOptional()
    @IsString()
    note?: string; // Ghi chú chung cho biên bản

    @IsOptional()
    @IsObject()
    itemNotes?: Record<string, string>;
    // Ghi chú riêng từng dòng: key = delegationItemId (đoàn) hoặc requestId (cá nhân)
    // VD: { "member-uuid-1": "HC còn tốt", "member-uuid-2": "HC đã hết hạn" }

    @IsString()
    requestId: string; // ID yêu cầu mượn/trả hộ chiếu

    @IsOptional()
    @IsString({ each: true })
    selectedItemIds?: string[]; // Danh sách ID các mục được chọn để đưa vào biên bản (áp dụng cho đoàn ra hoặc chọn lẻ)

    @IsOptional()
    @IsString()
    partialReturnReason?: string; // Lý do trả thiếu hộ chiếu
}
