import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettingClearLog } from './setting-log.entity';
import { UpdateSettingClearLogDto } from './update-setting-log.dto';

@Injectable()
export class SettingClearLogService {
  constructor(
    @InjectRepository(SystemSettingClearLog, 'mssqlConnection')
    private repo: Repository<SystemSettingClearLog>,
  ) { }

  // Lấy record có id = 1
  async getSettingClearLog() {
    // Lấy bản ghi đầu tiên trong bảng
    const setting = await this.repo.findOne({ where: { id: 1 } }); // {} là điều kiện rỗng, TypeORM 0.3+ yêu cầu

    if (!setting) {
      throw new NotFoundException('Không tìm thấy cài đặt.');
    }

    return setting;
  }
  async getDetailByType(type: string) {
    // Lấy bản ghi đầu tiên trong bảng
    const setting = await this.repo.findOne({ where: { type } });

    if (!setting) {
      throw new NotFoundException('Không tìm thấy cài đặt.');
    }

    return setting;
  }

  async updateSettingClearLog(dto: UpdateSettingClearLogDto) {
    // Tìm bản ghi theo type được gửi lên, nếu không có type thì lấy bản ghi đầu tiên (id = 1)
    const whereCondition = dto.type ? { type: dto.type } : { id: 1 };
    let setting = await this.repo.findOne({ where: whereCondition });

    // Lọc bỏ các giá trị null và undefined
    const dataToSave = {
      ...Object.fromEntries(
        Object.entries(dto).filter(([_, v]) => v !== null && v !== undefined)
      ),
      updatedAt: new Date(),
    };

    if (!setting) {
      // Nếu chưa có bản ghi với type này, tạo mới
      setting = this.repo.create(dataToSave);
    } else {
      // Nếu có rồi, cập nhật toàn bộ thông tin
      Object.assign(setting, dataToSave);
    }

    return this.repo.save(setting);
  }

  async deleteOldLogs() {
    try {
      const now = new Date();
      await this.repo
        .createQueryBuilder()
        .delete()
        .from(SystemSettingClearLog)
        .where('DATEDIFF(DAY, updatedAt, :now) > :days', { now, days: 30 })
        .execute();
    } catch (error) {
    }
  }
}
