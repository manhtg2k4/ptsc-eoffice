import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class RejectFeedbackDto {
    @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
    @IsString()
    overdueReason: string;

    /**
     * Xác định trả về cho ai:
     * - 'creator'    : Trả về người tạo phản ánh (mặc định)
     * - 'dispatcher' : Trả về người điều phối (BPCT)
     */
    @IsOptional()
    @IsString()
    @IsIn(['creator', 'dispatcher'])
    returnTo?: 'creator' | 'dispatcher';
}
