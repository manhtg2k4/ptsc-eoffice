import { IsNotEmpty, IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class EditFeedbackDto {
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    @IsString()
    @MaxLength(200, { message: 'Tiêu đề không quá 200 ký tự' })
    title: string;

    @IsNotEmpty({ message: 'Nội dung không được để trống' })
    @IsString()
    @MaxLength(2000, { message: 'Nội dung không quá 2000 ký tự' })
    content: string;

    @IsOptional()
    @IsArray()
    files?: any[]; // Danh sách file minh chứng (max 10 file theo cấu hình)
}
