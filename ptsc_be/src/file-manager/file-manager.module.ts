import { Module } from '@nestjs/common';
import { FileManagerService } from './file-manager.service';
import { FileManagerController } from './file-manager.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { fileManager, fileManagerSchema } from './file-manager.schema';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FileManager } from './file-manager.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([FileManager], 'mssqlConnection'),
  ],
  providers: [FileManagerService],
  controllers: [FileManagerController],
  exports: [FileManagerService],
})
export class FileManagerModule { }
