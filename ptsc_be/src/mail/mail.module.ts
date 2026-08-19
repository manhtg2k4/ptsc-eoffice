import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { MailConfigEntity } from './mail-config.entity';
import { MailController } from './mail.controller';

@Global()
@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([MailConfigEntity], 'mssqlConnection'),
    ],
    controllers: [MailController],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
