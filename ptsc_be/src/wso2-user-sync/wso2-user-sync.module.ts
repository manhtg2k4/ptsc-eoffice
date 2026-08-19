import { Module } from '@nestjs/common';
import { Wso2UserSyncService } from './wso2-user-sync.service';
import { Wso2UserSyncController } from './wso2-user-sync.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthConfigEntity], 'mssqlConnection'),
    // ScheduleModule.forRoot(),
  ],
  controllers: [Wso2UserSyncController],
  providers: [Wso2UserSyncService],
})
export class Wso2UserSyncModule { }
