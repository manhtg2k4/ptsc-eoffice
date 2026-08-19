import { Module } from '@nestjs/common';
import { listRoleService } from './list-role.service';
import { listRoleController } from './list-role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListRoleEntity } from './entities/list-role.entity';
import { UserColumnConfigEntity } from './user-column-config.entity';
import { DatabaseModule } from 'src/database/database.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { UsersModule } from 'src/users/users.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { AdminGuard } from 'src/users/guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ListRoleEntity, UserColumnConfigEntity, UserEntity], 'mssqlConnection'),
    DatabaseModule,
    SystemLogSqlModule,
    DocumentsModule,
    UsersModule,
  ],
  controllers: [listRoleController],
  providers: [listRoleService, AdminGuard],
  exports: [listRoleService],
})
export class ListRoleModule { }
