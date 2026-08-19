import { forwardRef, Module } from '@nestjs/common';
import { ListCarsService } from './list-cars.service';
import { ListCarsController } from './list-cars.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListCarEntity } from './entities/list-car.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ListDriversModule } from '../list-drivers/list-drivers.module';
import { CrmsourceModule } from '../crmsource/crmsource.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { VehicleRegistrationEntity } from 'src/vehicle-registration/entities/vehicle-registration.entity';
import { VehicleRegistrationModule } from 'src/vehicle-registration/vehicle-registration.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigurationModule,
    DatabaseModule, 
    TypeOrmModule.forFeature([ListCarEntity, UserEntity,FeatureManagementEntity,VehicleRegistrationEntity], 'mssqlConnection'),
    ListDriversModule,
    CrmsourceModule,
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => VehicleRegistrationModule),
  ],
  controllers: [ListCarsController],
  providers: [ListCarsService],
  exports: [ListCarsService],
})
export class ListCarsModule {}
