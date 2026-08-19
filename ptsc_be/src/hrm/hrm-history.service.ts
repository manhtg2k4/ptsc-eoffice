import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { HrmSyncHistoryEntity } from './entities/hrm-sync-history.entity';

@Injectable()
export class HrmHistoryService {
  constructor(
    @InjectRepository(HrmSyncHistoryEntity, 'mssqlConnection')
    private readonly historyRepository: Repository<HrmSyncHistoryEntity>,
  ) {}

  async writeHistory(stats: { added: number; updated: number; unchanged: number; total: number }) {
    const row = this.historyRepository.create({
      ...stats,
      syncTime: new Date(),
    });
    return this.historyRepository.save(row);
  }

  async getLastSync() {
    // Ưu tiên lấy lần đồng bộ thực sự có thay đổi dữ liệu
    const lastChange = await this.historyRepository.findOne({
      where: [
        { added: MoreThan(0) },
        { updated: MoreThan(0) },
      ],
      order: { syncTime: 'DESC' },
    });

    if (lastChange) return lastChange;

    // Nếu không có lần nào thay đổi, lấy lần chạy gần nhất
    return this.historyRepository.findOne({
      where: { total: MoreThan(0) },
      order: { syncTime: 'DESC' },
    });
  }


  async getTodayUpdatedCount(): Promise<number> {
    const raw = await this.historyRepository
      .createQueryBuilder('h')
      .select('COALESCE(SUM(h.added + h.updated), 0)', 'updatedToday')
      .where('CAST(h.sync_time AS DATE) = CAST(GETDATE() AS DATE)')
      .getRawOne<{ updatedToday: string | number }>();

    return Number(raw?.updatedToday || 0);
  }
}
