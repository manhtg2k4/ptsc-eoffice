import { Module } from "@nestjs/common";
import { AuthController } from "./auth-sso.controller";
import { AuthService } from "./auth-sso.service";
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from "./jwt.guard";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "src/users/entities/user.entity";
import { GroupUserEntity } from "src/group-users/entities/group-users.entity";
import { OrganizationUnitEntity } from "src/organization-unit/organization-unit_sql/organization-unit.entity";
import { AuthConfigEntity } from "src/auth-config/entities/auth-config.entity";
import { AuthConfigModule } from "src/auth-config/auth-config.module";
import { AuthorityDocumentEntity } from "src/authority-documents";


import { NotificationConfigModule } from "src/notifycation/notification-config/notification-config.module";

@Module({
  imports: [
    AuthConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    HttpModule,
    TypeOrmModule.forFeature([UserEntity, GroupUserEntity, OrganizationUnitEntity, AuthConfigEntity, AuthorityDocumentEntity], 'mssqlConnection'),
    NotificationConfigModule,
  ],

  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtStrategy, JwtModule, PassportModule, JwtAuthGuard],
})
export class AuthModule { }
