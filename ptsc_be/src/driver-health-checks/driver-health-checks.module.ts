import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverHealthCheckEntity } from './entities/driver-health-check.entity';
import { DriverHealthChecksService } from './driver-health-checks.service';
import { DriverHealthChecksController } from './driver-health-checks.controller';
import { VehicleRegistrationModule } from 'src/vehicle-registration/vehicle-registration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverHealthCheckEntity], 'mssqlConnection'),
    VehicleRegistrationModule,
  ],
  controllers: [DriverHealthChecksController],
  providers: [DriverHealthChecksService],
  exports: [DriverHealthChecksService],
})
export class DriverHealthChecksModule {}
