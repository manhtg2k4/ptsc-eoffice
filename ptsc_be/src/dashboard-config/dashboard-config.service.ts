import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardConfig } from './entities/dashboard-config.entity';
import { UpdateDashboardConfigDto } from './dto/create-dashboard-config.dto';

@Injectable()
export class DashboardConfigService {
  constructor(
    @InjectRepository(DashboardConfig, 'mssqlConnection')
    private readonly dashboardConfigRepo: Repository<DashboardConfig>,
  ) {}

  async findByUserId(userId: string): Promise<DashboardConfig> {
    let config = await this.dashboardConfigRepo.findOne({
      where: { userId },
    });

    if (!config) {
      // Tự động tạo mới nếu chưa có
      config = this.dashboardConfigRepo.create({
        userId,
        columnLeft: [],
        columnRight: [],
        statOrder: [],
      });
      await this.dashboardConfigRepo.save(config);
    }

    return config;
  }

  async update(userId: string, dto: UpdateDashboardConfigDto): Promise<DashboardConfig> {
    const config = await this.findByUserId(userId);
    Object.assign(config, dto);
    return await this.dashboardConfigRepo.save(config);
  }
}
