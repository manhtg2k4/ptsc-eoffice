// notification.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth-sso/auth-sso.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { DocumentsModule } from 'src/documents/documents.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './notification.entity';
import { ChatModule } from '../chat/chat.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { UserEntity } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { PushTokenEntity } from './entities/push-token.entity';
import { FcmPushService } from './fcm-push.service';

@Module({
  imports: [
    // MongooseModule.forFeature([
    //   { name: Notification.name, schema: NotificationSchema },
    // ]),
    TypeOrmModule.forFeature([NotificationEntity, UserEntity, PushTokenEntity], 'mssqlConnection'),
    forwardRef(() => DatabaseModule), // Inject MySQL pool
    forwardRef(() => AuthModule), // Inject JwtService từ AuthModule
    forwardRef(() => SystemLogSqlModule), // Import để dùng SystemLogManagementService
    forwardRef(() => DocumentsModule), // Sử dụng forwardRef để phá vỡ circular dependency
    forwardRef(() => ChatModule),
    forwardRef(() => ConversationsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService, FcmPushService],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule { }
