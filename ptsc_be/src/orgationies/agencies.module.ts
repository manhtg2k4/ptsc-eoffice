import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { AgencyEntity } from './agencies.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgencyEntity], 'mssqlConnection'),
  ],
  controllers: [AgenciesController],
  providers: [AgenciesService],
})
export class AgenciesModule {}