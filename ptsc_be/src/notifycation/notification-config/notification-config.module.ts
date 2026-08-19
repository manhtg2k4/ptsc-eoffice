import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationConfigController } from './notification-config.controller';
import { NotificationConfigEntity } from './notification-config.entity';
import { NotificationConfigService } from './notification-config.service';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationConfigEntity, UserEntity], 'mssqlConnection'),
  ],
  controllers: [NotificationConfigController],
  providers: [NotificationConfigService],
  exports: [NotificationConfigService],
})
export class NotificationConfigModule { }
