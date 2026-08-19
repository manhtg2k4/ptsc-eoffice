import { forwardRef, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { AuthorityProcessController } from './authority-process.controller';
import { AuthorityProcessService } from './authority-process.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLogSqlModule } from 'src/systemLogManagement/system-log.module';
import { AuthorityDocumentsModule } from 'src/authority-documents';
import { UsersModule } from 'src/users/users.module';
import { AuthorityDocumentEntity } from './authority-process.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Module({
  imports: [
    forwardRef(() => DatabaseModule),
    forwardRef(() => BpmnModule),
    forwardRef(() => SystemLogSqlModule),
    forwardRef(() => UsersModule),
    // MongooseModule.forFeature([
    //   { name: AuthorityDocument.name, schema: AuthoritySchema },
    //   { name: User.name, schema: UserSchema },
    //   { name: Configuration.name, schema: ConfigurationSchema },
    //   // { name: FeatureManagement.name, schema: FeatureManagementSchema },
    // ]),
    TypeOrmModule.forFeature(
      [FeatureManagementEntity, UserEntity, RoleFeatureEntity, AuthorityDocumentEntity],
      'mssqlConnection',
    ),
    AuthorityDocumentsModule,
  ],
  controllers: [AuthorityProcessController],
  providers: [AuthorityProcessService],
  exports: [AuthorityProcessService],
})
export class AuthorityModule { }
