import { PartialType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class BatchCreateBannersDto {
  @ApiProperty({
    description: 'Mảng các banner cần tạo hoặc cập nhật',
    type: [CreateBannerDto],
    example: [
      {
        bannerKey: 'banner_top',
        imageUrl: 'https://example.com/banner1.jpg',
        linkUrl: 'https://example.com/promo1',
        order: 0,
        status: 1
      },
      {
        bannerKey: 'banner_middle',
        imageUrl: 'https://example.com/banner2.jpg',
        linkUrl: 'https://example.com/promo2',
        order: 1,
        status: 1
      }
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBannerDto)
  banners: CreateBannerDto[];
}