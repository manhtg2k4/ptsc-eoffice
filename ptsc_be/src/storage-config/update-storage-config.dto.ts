import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum StorageType {
  FILESYSTEM = 'filesystem',
  MINIO = 'minio',
}

export class UpdateStorageConfigDto {
  @ApiProperty({
    enum: StorageType,
    description: 'Dịch vụ lưu trữ đang hoạt động',
    example: StorageType.FILESYSTEM,
  })
  @IsEnum(StorageType)
  active_type: StorageType;

  // @ApiPropertyOptional({ description: 'Đường dẫn cơ sở cho filesystem. Bắt buộc nếu active_type là "filesystem".' })
  // @ValidateIf((o) => o.active_type === StorageType.FILESYSTEM)
  // @IsString()
  // fs_base_path?: string;

  @ApiPropertyOptional({ description: 'Endpoint của MinIO. Bắt buộc nếu active_type là "minio".' })
  @ValidateIf((o) => o.active_type === StorageType.MINIO)
  @IsString()
  minio_endpoint?: string;

  @ApiPropertyOptional({ description: 'Access Key của MinIO. Bắt buộc nếu active_type là "minio".' })
  @ValidateIf((o) => o.active_type === StorageType.MINIO)
  @IsString()
  minio_access_key?: string;

  @ApiPropertyOptional({ description: 'Secret Key của MinIO. Bắt buộc nếu active_type là "minio".' })
  @ValidateIf((o) => o.active_type === StorageType.MINIO)
  @IsString()
  minio_secret_key?: string;

  @ApiPropertyOptional({ description: 'Bucket của MinIO. Bắt buộc nếu active_type là "minio".' })
  @ValidateIf((o) => o.active_type === StorageType.MINIO)
  @IsString()
  minio_bucket?: string;
}