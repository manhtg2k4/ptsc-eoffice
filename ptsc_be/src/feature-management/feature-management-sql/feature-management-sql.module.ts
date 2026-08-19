import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureManagementControllerSql } from './feature-management-controller-sql';
import { FeatureManagementServiceSql } from './feature-management-service-sql';
import { FeatureManagementEntity } from './feature-management.entity';
import { DatabaseModule } from 'src/database/database.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureManagementEntity, UserEntity, RoleFeatureEntity], 'mssqlConnection'),
    // MongooseModule.forFeature([
    //   { name: FeatureManagement.name, schema: FeatureManagementSchema },
    // ]),
    DatabaseModule,
  ],
  controllers: [FeatureManagementControllerSql],
  providers: [FeatureManagementServiceSql],
  exports: [FeatureManagementServiceSql],
})
export class FeatureManagementSqlModule { }