import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSyncController } from './user-sync.controller';
import { UserSyncService } from './user-sync.service';
import { UserEntity } from '../users/entities/user.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthConfig, AuthConfigSchema } from 'src/auth-config/auth-config.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { KeycloakGroupMappingEntity } from './entities/keycloak-group-mapping.entity';
import { AuthKeycloakModule } from 'src/auth-keycloak/auth-keycloak.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: AuthConfig.name, schema: AuthConfigSchema }]),
    // ScheduleModule.forRoot(),
    TypeOrmModule.forFeature(
      [UserEntity, AuthConfigEntity, GroupUserEntity, KeycloakGroupMappingEntity],
      'mssqlConnection', // <-- tên connection giống trong forRoot
    ),
    AuthKeycloakModule,
    RedisModule,
  ],
  controllers: [UserSyncController],
  providers: [UserSyncService],
  exports: [UserSyncService],
})
export class UserSyncModule { }

