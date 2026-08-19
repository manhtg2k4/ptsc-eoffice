import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DispatchFeedbackDto {
    @IsOptional()
    @IsString()
    unitId?: string; // Đơn vị xử lý (optional - nếu không truyền thì auto-resolve từ BPMN)

    @IsOptional()
    @IsString()
    processorId?: string; // Người xử lý cụ thể (optional)

    @IsOptional()
    @IsString()
    deadline?: string; // ISO date string - hạn xử lý

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    adjustDeadlineDays?: number; // Điều chỉnh hạn xử lý thêm N ngày (nếu dùng radio "Điều chỉnh")

    @IsOptional()
    @IsString()
    note?: string;

    /**
     * Flag đánh dấu điều phối lại (BPCT điều phối lại sau khi từ chối).
     * Nếu true: sử dụng actionCode 'REDISPATCH' và lưu lịch sử "Điều phối lại".
     */
    @IsOptional()
    @IsBoolean()
    isRedispatch?: boolean;
}
