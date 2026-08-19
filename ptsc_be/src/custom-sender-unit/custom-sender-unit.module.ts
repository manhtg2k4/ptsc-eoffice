import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomSenderUnitEntity } from './custom-sender-unit.entity';
import { CustomSenderUnitController, ListSendingUnitDocController, DeleteSendingUnitDocController } from './custom-sender-unit.controller';
import { CustomSenderUnitService } from './custom-sender-unit.service';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [CustomSenderUnitEntity, OrganizationUnitEntity, UserEntity],
      'mssqlConnection',
    ),
  ],
  controllers: [CustomSenderUnitController, ListSendingUnitDocController, DeleteSendingUnitDocController],
  providers: [CustomSenderUnitService],
  exports: [CustomSenderUnitService],
})
export class CustomSenderUnitModule {}
