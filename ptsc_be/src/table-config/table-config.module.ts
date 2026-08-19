import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableConfigController } from './table-config.controller';
import { TableConfigService } from './table-config.service';
import { TableConfigEntity } from './table-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TableConfigEntity], 'mssqlConnection')],
  controllers: [TableConfigController],
  providers: [TableConfigService],
  exports: [TableConfigService], // Export service để các module khác có thể sử dụng
})
export class TableConfigModule {}