import { IsString, IsOptional, IsEnum, IsInt, Min, IsNotEmpty } from 'class-validator';
import { VideoType } from '../entities/video.entity';

export class CreateVideoDto {
    @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    @IsOptional()
    description?: string;

    @IsString({ message: 'Chủ đề phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Chủ đề không được để trống' })
    topic: string;

    @IsEnum(VideoType, {
        message: `Loại video không hợp lệ. Chỉ chấp nhận: ${Object.values(VideoType).join(', ')}`
    })
    @IsOptional()
    videoType?: VideoType;

    @IsString({ message: 'Ảnh đại diện phải là chuỗi URL' })
    @IsOptional()
    thumbnail?: string;

    @IsString({ message: 'URL video phải là chuỗi' })
    @IsOptional()
    videoUrl?: string;

    @IsString({ message: 'Link video phải là chuỗi' })
    @IsOptional()
    videoLink?: string;

    @IsInt({ message: 'ID file thumbnail phải là số nguyên' })
    @IsOptional()
    thumbnailFileId?: number;

    @IsInt({ message: 'ID file video phải là số nguyên' })
    @IsOptional()
    videoFileId?: number;

    @IsInt({ message: 'Lượt thích phải là số nguyên' })
    @Min(0, { message: 'Lượt thích không được nhỏ hơn 0' })
    @IsOptional()
    likes?: number;

    @IsInt({ message: 'Lượt xem phải là số nguyên' })
    @Min(0, { message: 'Lượt xem không được nhỏ hơn 0' })
    @IsOptional()
    views?: number;

    @IsInt({ message: 'Lượt chia sẻ phải là số nguyên' })
    @Min(0, { message: 'Lượt chia sẻ không được nhỏ hơn 0' })
    @IsOptional()
    shares?: number;

    @IsString({ message: 'ID người tạo phải là chuỗi ký tự' })
    @IsOptional()
    createdBy?: string;

    @IsString({ message: 'Tên người tạo phải là chuỗi ký tự' })
    @IsOptional()
    createdByName?: string;

    @IsString({ message: 'ID ảnh thumbnail size nhỏ phải là chuỗi' })
    @IsOptional()
    sizeSmall?: string;

    @IsString({ message: 'ID ảnh thumbnail size trung bình phải là chuỗi' })
    @IsOptional()
    sizeMedium?: string;

    @IsString({ message: 'ID ảnh thumbnail size lớn phải là chuỗi' })
    @IsOptional()
    sizeBig?: string;
}
