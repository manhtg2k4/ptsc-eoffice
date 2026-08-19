import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationUnitControllerSql } from './organization-unit-controller-sql';
import { OrganizationUnitService } from './organization-unit-service-sql';
import { OrganizationUnitEntity } from './organization-unit.entity';
import { DatabaseModule } from 'src/database/database.module';

// import { RoleGroupModule } from '../../role-group/role-group.module';
// import { EntityRolegroupModule } from '../../entity-rolegroup/entity-rolegroup.module';
// import { EntityRoleGroupController } from '../../entity-rolegroup/entity-rolegroup.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationUnitEntity]),
    DatabaseModule
  ],
  controllers: [OrganizationUnitControllerSql],
  providers: [OrganizationUnitService],
  exports: [OrganizationUnitService],
})
export class OrganizationUnitSqlModule { }
