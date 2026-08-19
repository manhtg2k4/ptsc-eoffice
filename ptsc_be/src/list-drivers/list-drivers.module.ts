import { forwardRef, Module } from '@nestjs/common';
import { ListDriversService } from './list-drivers.service';
import { ListDriversController } from './list-drivers.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ListDriverEntity } from './entities/list-driver.entity';
import { ListCarEntity } from '../list-cars/entities/list-car.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CrmsourceModule } from '../crmsource/crmsource.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';

import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { VehicleRegistrationEntity } from 'src/vehicle-registration/entities/vehicle-registration.entity';
import { VehicleRegistrationModule } from 'src/vehicle-registration/vehicle-registration.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigurationModule,
    DatabaseModule, 
    TypeOrmModule.forFeature([ListDriverEntity, UserEntity, ListCarEntity,FeatureManagementEntity,VehicleRegistrationEntity], 'mssqlConnection'),
    CrmsourceModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => VehicleRegistrationModule),
  ],
  controllers: [ListDriversController],
  providers: [ListDriversService],
  exports: [ListDriversService],
})
export class ListDriversModule {}
