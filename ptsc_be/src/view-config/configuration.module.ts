import { Module } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViewConfigEntity } from './entities/view-config.entity';
import { FeatureManagementModule } from 'src/feature-management/feature-management.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ViewConfigEntity],
      'mssqlConnection',
    ),
    FeatureManagementModule
  ],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule { }
