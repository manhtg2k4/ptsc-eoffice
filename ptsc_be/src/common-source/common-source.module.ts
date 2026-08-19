import { Module } from '@nestjs/common';
import { CommonSourceController } from './common-source.controller';
import { CommonSourceService } from './common-source.service';
import { InitCommonSourceService } from './init-common-source';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonSourceEntity } from './common-source.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([CommonSourceEntity], 'mssqlConnection'), // ← THÊM DÒNG NÀY BẮT BUỘC
  ],
  controllers: [CommonSourceController],
  providers: [CommonSourceService, InitCommonSourceService],
  exports: [CommonSourceService] // <-- Thêm dòng này
})
export class CommonSourceModule { }
