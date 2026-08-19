import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Like } from 'typeorm';
import { DriverHealthCheckEntity } from './entities/driver-health-check.entity';
import { CreateDriverHealthCheckDto, UpdateDriverHealthCheckDto } from './dto/driver-health-check.dto';

@Injectable()
export class DriverHealthChecksService {
  constructor(
    @InjectRepository(DriverHealthCheckEntity, 'mssqlConnection')
    private readonly repository: Repository<DriverHealthCheckEntity>,
  ) {}

  private mapItem(item: DriverHealthCheckEntity) {
    const checkupDate = new Date(item.checkupDate);
    const reCheckupDate = new Date(checkupDate);
    reCheckupDate.setMonth(reCheckupDate.getMonth() + 6);

    const now = new Date();
    // Chuẩn hóa ngày (bỏ qua giờ phút) để so sánh
    const nowPlain = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reCheckupPlain = new Date(reCheckupDate.getFullYear(), reCheckupDate.getMonth(), reCheckupDate.getDate());

    const diffTime = reCheckupPlain.getTime() - nowPlain.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let checkupStatus = 'Còn hạn'; // Mặc định
    if (diffDays < 0) {
      checkupStatus = 'Quá hạn';
    } else if (diffDays <= 2) {
      checkupStatus = 'Sắp hết hạn';
    }

    return {
      ...item,
      reCheckupDate,
      checkupStatus,
    };
  }

  async create(dto: CreateDriverHealthCheckDto) {
    const record = this.repository.create({
      ...dto,
      checkupDate: new Date(dto.checkupDate),
    });
    const saved = await this.repository.save(record);
    return {
      success: true,
      message: 'Lưu lịch khám sức khỏe thành công',
      data: saved,
    };
  }

  async findAll(query: { page: number; limit: number; driverId?: string }) {
    const { page, limit, driverId } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: Not(3) };
    if (driverId) {
      where.driverId = driverId;
    }

    const [items, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { checkupDate: 'DESC' },
    });

    const mappedItems = items.map((item) => this.mapItem(item));

    return {
      success: true,
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const item = await this.repository.findOne({
      where: { id, status: Not(3) },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy lịch khám với ID: ${id}`);
    }
    return {
      success: true,
      data: this.mapItem(item),
    };
  }

  async update(id: string, dto: UpdateDriverHealthCheckDto) {
    const record = await this.repository.findOne({ where: { id, status: Not(3) } });
    if (!record) {
      throw new NotFoundException(`Không tìm thấy lịch khám với ID: ${id}`);
    }

    const updated = Object.assign(record, {
      ...dto,
      checkupDate: dto.checkupDate ? new Date(dto.checkupDate) : record.checkupDate,
    });
    const saved = await this.repository.save(updated);
    return {
      success: true,
      message: 'Cập nhật lịch khám thành công',
      data: saved,
    };
  }

  async remove(id: string) {
    const record = await this.repository.findOne({ where: { id, status: Not(3) } });
    if (!record) {
      throw new NotFoundException(`Không tìm thấy lịch khám với ID: ${id}`);
    }
    record.status = 3;
    await this.repository.save(record);
    return {
      success: true,
      message: 'Xóa lịch khám thành công',
    };
  }
}
