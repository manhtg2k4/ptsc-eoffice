import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGroupService } from './role-group.service';
import { RoleGroupController } from './role-group.controller';
import { RoleGroupEntity } from './role-group.entity';
import { EntityRoleGroupEntity } from 'src/entity-rolegroup/entity-rolegroup.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleGroupEntity, EntityRoleGroupEntity, UserEntity], 'mssqlConnection'),
  ],
  controllers: [RoleGroupController],
  providers: [RoleGroupService],
  exports: [RoleGroupService],
})
export class RoleGroupModule { }