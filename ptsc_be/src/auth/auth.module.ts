import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { AuthConfigModule } from 'src/auth-config/auth-config.module';
import { AuthKeycloakModule } from 'src/auth-keycloak/auth-keycloak.module';
import { SsoController } from './sso.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    AuthConfigModule,
    JwtModule.register({}),
    AuthKeycloakModule,
    TypeOrmModule.forFeature([UserEntity], 'mssqlConnection'),
  ],
  controllers: [AuthController, SsoController],
  providers: [AuthService, JwtService],
})
export class AuthBasicModule { }
