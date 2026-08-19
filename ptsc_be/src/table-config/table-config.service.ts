import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableConfigEntity } from './table-config.entity';
import { UpsertTableConfigDto } from './upsert-table-config.dto';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class TableConfigService {
  constructor(
    @InjectRepository(TableConfigEntity, 'mssqlConnection')
    private readonly tableConfigRepository: Repository<TableConfigEntity>,
  ) {}

  async upsert(
    ownerId: string,
    dto: UpsertTableConfigDto,
  ): Promise<TableConfigEntity> {
    if (!ownerId) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng.');
    }
    const { module, columns } = dto;

    // Chuyển đổi ownerId thành string để đảm bảo kiểu dữ liệu khớp với entity
    const ownerIdAsString = String(ownerId);

    // Tìm kiếm cấu hình hiện có
    let config = await this.tableConfigRepository.findOneBy({
      owner: ownerIdAsString,
      module,
    });

    if (config) {
      // Nếu đã tồn tại, cập nhật cột columns
      config.columns = columns;
    } else {
      // Nếu chưa tồn tại, tạo một entity mới
      config = this.tableConfigRepository.create({ owner: ownerIdAsString, module, columns, id: uuidv4(), });
    }

    return this.tableConfigRepository.save(config);
  }

  async findOne(ownerId: string, module: string): Promise<TableConfigEntity | null> {
    if (!ownerId || !module) {
      return null;
    }
    return this.tableConfigRepository.findOneBy({ owner: ownerId, module });
  }
}