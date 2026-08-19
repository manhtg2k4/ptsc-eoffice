import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { HrmJobMappingEntity } from 'src/group-users/entities/hrm-job-mapping.entity';
import { HrmSyncService } from './hrm-sync.service';
import { HrmSyncController } from './hrm-sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [
        UserEntity,
        AuthConfigEntity,
        GroupUserEntity,
        OrganizationUnitEntity,
        HrmJobMappingEntity,
      ],
      'mssqlConnection',
    ),
  ],
  controllers: [HrmSyncController],
  providers: [HrmSyncService],
  exports: [HrmSyncService],
})
export class HrmSyncModule {}
