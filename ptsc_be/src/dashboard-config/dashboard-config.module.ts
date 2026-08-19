import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardConfigService } from './dashboard-config.service';
import { DashboardConfigController } from './dashboard-config.controller';
import { DashboardConfig } from './entities/dashboard-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardConfig], 'mssqlConnection')],
  controllers: [DashboardConfigController],
  providers: [DashboardConfigService],
  exports: [DashboardConfigService],
})
export class DashboardConfigModule {}
