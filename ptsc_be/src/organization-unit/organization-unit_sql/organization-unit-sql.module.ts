import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'src/database/database.module';
import { EntityRoleGroupEntity } from 'src/entity-rolegroup/entities/entity-rolegroup.entity';
import { RoleGroupEntity } from 'src/role-group/role-group.entity';
import { StaticAdminPermissionGuard } from 'src/users/guards/static-admin-permission.guard';
import { RoleByProcessGuard } from 'src/users/guards/role-by-process.guard';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { OrganizationUnitControllerSql } from './organization-unit-controller-sql';
import { OrganizationUnitEntity } from './organization-unit.entity';
import { OrganizationUnitService } from './organization-unit-service-sql';
import { CustomSenderUnitEntity } from 'src/custom-sender-unit/custom-sender-unit.entity';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [OrganizationUnitEntity, UserEntity, RoleGroupEntity, EntityRoleGroupEntity, CustomSenderUnitEntity, BpmnDesignEntity],
      'mssqlConnection',
    ),
    forwardRef(() => DatabaseModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [OrganizationUnitControllerSql],
  providers: [OrganizationUnitService, StaticAdminPermissionGuard, RoleByProcessGuard],
  exports: [OrganizationUnitService],
})
export class OrganizationUnitSqlModule {}

