import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Allow, IsNotEmpty, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { AlbumType } from '../entities/album-image.entity';

export class CreateAlbumImageDto {
    @IsString({ message: 'Chủ đề phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Chủ đề không được để trống' })
    topic: string;

    @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
    @IsOptional()
    description?: string;

    @IsEnum(AlbumType, {
        message: `Loại album không hợp lệ. Chỉ chấp nhận: ${Object.values(AlbumType).join(', ')}`
    })
    @IsOptional()
    albumType?: AlbumType;

    @IsOptional()
    @IsArray({ message: 'Danh sách ảnh phải là mảng' })
    @ArrayMaxSize(100, { message: 'Mỗi album không được vượt quá 100 ảnh' })
    @Allow()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return value;
    })
    images?: Record<string, any>[];

    @IsString({ message: 'Ảnh đại diện phải là chuỗi URL' })
    @IsOptional()
    thumbnail?: string;

    @IsInt({ message: 'ID file thumbnail phải là số nguyên' })
    @IsOptional()
    thumbnailFileId?: number;

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
