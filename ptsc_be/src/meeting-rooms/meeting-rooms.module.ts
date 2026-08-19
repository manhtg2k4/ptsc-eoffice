import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingRoomEntity } from './entities/meeting-rooms.entity';
import { MeetingRoomController } from './meeting-rooms.controller';
import { MeetingRoomService } from './meeting-rooms.service';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { BpmnVersionModule } from 'src/bpmn-version/bpmn-version.module';
import { DatabaseModule } from 'src/database/database.module';
import { BpmnDesignEntity } from 'src/bpmn-designs/bpmn-design.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { ConfigurationModule } from 'src/view-config/configuration.module';
import { MeetingRoomRepository } from './meeting-rooms.repository';
import { MeetingRoomQueryBuilder } from './helpers/meeting-room-query.builder';
import { MeetingRoomMapper } from './helpers/meeting-room.mapper';
import { MeetingRoomAmenityEntity } from './entities/meeting-rooms-amenities.entity';
import { MeetingRoomLayoutItemEntity } from './entities/meeting-room-layout-item.entity';
import { AmenitiesModule } from 'src/meeting-room-amenities/amenities.module';
import { AmenitiesEntity } from 'src/meeting-room-amenities/entities/amenities.entity';
import { MeetingRoomsPermissionService } from './meeting-rooms-permission.service';
import { MeetingRoomsPermissionGuard } from './guard/meeting-rooms-permission.guard';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { CrmSourceEntity } from 'src/crmsource/entities/crmsource.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { AgencyEntity } from 'src/orgationies/agencies.entity';
import { UsersModule } from 'src/users/users.module';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    forwardRef(() => SystemLogSqlModule),
    AuthorityDocumentsModule,
    ConfigurationModule,
    forwardRef(() => DatabaseModule),
    forwardRef(() => BpmnModule),
    BpmnVersionModule,
    AmenitiesModule,
    UsersModule,

    TypeOrmModule.forFeature([
      OrganizationUnitEntity,
      CrmSourceEntity,
      RoleFeatureEntity,
      AgencyEntity,
      MeetingRoomEntity,
      MeetingRoomAmenityEntity,
      MeetingRoomLayoutItemEntity,
      AmenitiesEntity,
      UserEntity,
      BpmnDesignEntity,
      FeatureManagementEntity,
    ], 'mssqlConnection'),
  ],
  controllers: [MeetingRoomController],
  providers: [  
    MSSQLRepository,
    MeetingRoomService, 
    MeetingRoomRepository,
    MeetingRoomQueryBuilder,
    MeetingRoomMapper,
    MeetingRoomsPermissionService,
    MeetingRoomsPermissionGuard  
  ],
  exports: [MeetingRoomService, MeetingRoomRepository],
})
export class MeetingRoomModule {}