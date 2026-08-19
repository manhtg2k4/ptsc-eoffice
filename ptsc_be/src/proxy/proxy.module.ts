import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { FilesManagementModule } from '../files-managerment/files-management.module';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    FilesManagementModule,
    UsersModule,
    DatabaseModule,
  ],
  controllers: [ProxyController],
})
export class ProxyModule {}
