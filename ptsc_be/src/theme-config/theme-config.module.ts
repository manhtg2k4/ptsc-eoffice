import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeConfigController } from './theme-config.controller';
import { ThemeConfigService } from './theme-config.service';
import { ThemeConfigEntity, CustomThemeEntity } from './theme-config.entity';
// import { AuthModule } from 'src/auth-sso/auth-sso.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThemeConfigEntity, CustomThemeEntity], 'mssqlConnection'),
    // AuthModule,
  ],
  controllers: [ThemeConfigController],
  providers: [ThemeConfigService],
})
export class ThemeConfigModule { }