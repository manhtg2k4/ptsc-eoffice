import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleFeatureSqlService } from './role-feature-sql.service';
import { RoleFeatureSqlController } from './role-feature-sql.controller';
import { RoleFeatureEntity } from './role-feature.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { RolesProcessEntity } from './roles-process.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [RoleFeatureEntity, UserEntity, BpmnDesignEntity, FeatureManagementEntity, RolesProcessEntity, GroupUserEntity],
      'mssqlConnection',
    ),
    forwardRef(() => SystemLogSqlModule),
  ],
  controllers: [RoleFeatureSqlController],
  providers: [RoleFeatureSqlService],
  exports: [RoleFeatureSqlService],
})
export class RoleFeatureSqlModule { }
