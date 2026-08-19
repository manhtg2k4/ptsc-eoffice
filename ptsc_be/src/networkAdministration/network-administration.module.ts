import { Module } from '@nestjs/common';
import { NetworkAdministrationService } from './network-administration.service';
import { NetworkAdministrationController } from './network-administration.controller';
``
import { DocumentsModule } from 'src/documents/documents.module';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { NetworkAdministrationEntity } from './network-administration.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: NetworkAdministration.name, schema: NetworkAdministrationSchema }]),
    TypeOrmModule.forFeature([NetworkAdministrationEntity, UserEntity], 'mssqlConnection'),
    // Thêm các module để sử dụng dịch vụ ghi log
    SystemLogSqlModule,
    DocumentsModule,
  ],
  controllers: [NetworkAdministrationController],
  providers: [NetworkAdministrationService],
  exports: [NetworkAdministrationService],
})
export class NetworkAdministrationModule { }