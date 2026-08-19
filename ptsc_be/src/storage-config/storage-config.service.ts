import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateStorageConfigDto } from './update-storage-config.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageConfigEntity } from './storage-config.entity';
import { Repository } from 'typeorm';

@Injectable()
export class StorageConfigService {
  private readonly CONFIG_ID = 1;

  constructor(
    @InjectRepository(StorageConfigEntity, 'mssqlConnection')
    private readonly storageConfigRepo: Repository<StorageConfigEntity>,
  ) {}

  async getConfig() {
    const config = await this.storageConfigRepo.findOneBy({ id: this.CONFIG_ID });
    if (!config) {
      throw new NotFoundException('Chưa có cấu hình dịch vụ lưu trữ.');
    }
    return config;
  }

  async updateConfig(dto: UpdateStorageConfigDto) {
    const fields = Object.entries(dto).filter(([_, v]) => v !== undefined && v !== null);
    if (fields.length === 0) {
      throw new BadRequestException('Không có dữ liệu để cập nhật.');
    }

    // Sử dụng `save` để vừa tạo mới (nếu chưa có) vừa cập nhật (nếu đã có)
    await this.storageConfigRepo.save({
      id: this.CONFIG_ID,
      ...dto,
    });

    return this.getConfig();
  }
}
