import { Module } from '@nestjs/common';
import { EntityRoleGroupController } from './entity-rolegroup.controller';
import { EntityRoleGroupService } from './entity-rolegroup.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EntityRoleGroup, EntityRoleGroupSchema } from './entity-rolegroup.schema';
import { RoleGroup, RoleGroupSchema } from 'src/role-group/role-group.shema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGroupEntity } from 'src/role-group/role-group.entity';
import { EntityRoleGroupEntity } from './entity-rolegroup.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [RoleGroupEntity, EntityRoleGroupEntity],
      'mssqlConnection',
    ),
  ],
  controllers: [EntityRoleGroupController],
  providers: [EntityRoleGroupService, EntityRoleGroupController],
  exports: [EntityRoleGroupService, EntityRoleGroupController],
})
export class EntityRolegroupModule { }