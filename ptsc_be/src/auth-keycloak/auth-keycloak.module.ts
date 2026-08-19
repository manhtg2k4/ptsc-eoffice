import { forwardRef, Module } from '@nestjs/common';
import { AuthKeycloakService } from './auth-keycloak.service';
import { AuthKeycloakController } from './auth-keycloak.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth-sso/auth-sso.module';
import { NotificationConfigModule } from 'src/notifycation/notification-config/notification-config.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    HttpModule,
    TypeOrmModule.forFeature([UserEntity, GroupUserEntity, AuthConfigEntity], 'mssqlConnection'),
    forwardRef(() => UsersModule),
    AuthModule,
    NotificationConfigModule,
  ],
  controllers: [AuthKeycloakController],
  providers: [AuthKeycloakService],
  exports: [AuthKeycloakService],
})
export class AuthKeycloakModule { }
