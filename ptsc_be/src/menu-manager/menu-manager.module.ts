import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleGroupModule } from 'src/role-group/role-group.module';
import { EntityRolegroupModule } from 'src/entity-rolegroup/entity-rolegroup.module';
import { MenuManagerController } from './menu-manager.controller';
import { MenuManagerService } from './menu-manager.service';
// import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { DatabaseModule } from 'src/database/database.module';
import { MenuManagerEntity } from './entities/menu-manager.entity';
// import { MenuManager, MenuManagerSchema } from './menu-manager.schema';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { DocumentsModule } from 'src/documents/documents.module';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { UserEntity } from 'src/users/entities/user.entity'; 
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { RedisModule } from 'src/redis/redis.module';
import { RolesProcessEntity } from 'src/role-feature/role-feature-sql/roles-process.entity';


@Module({
  imports: [
    UsersModule, // Import UsersModule để sử dụng UsersService
    BpmnModule,
    TypeOrmModule.forFeature([MenuManagerEntity, FeatureManagementEntity, FeatureManagementEntity, GroupUserEntity, UserEntity, RoleFeatureEntity, ListRoleEntity, RolesProcessEntity], 'mssqlConnection'),
    // FeatureManagement vẫn dùng Mongo
    DocumentsModule,
    RoleGroupModule,
    EntityRolegroupModule,
    DatabaseModule,
    AuthorityDocumentsModule,
    RedisModule,
  ],
  controllers: [MenuManagerController],
  providers: [MenuManagerService], // Xóa UsersService khỏi providers
  exports: [MenuManagerService],
})
export class MenuManagerModule { }
