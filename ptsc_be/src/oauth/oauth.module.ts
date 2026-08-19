import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
// import { OauthService } from './oauth.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from 'src/user/user.schema';
import { OrganizationUnit, OrganizationSchema } from 'src/organization-unit/organization-unit.schema';
// import { OauthController } from './oauth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { UserEntity } from '../users/entities/user.entity';
import { BpmnRoleGuard } from './bpmn-role.guard';
import { FeatureGuard } from './feature.guard';
import { RecordScopeAccessService } from './record-scope-access.service';
import { PermissionCacheService } from './permission-cache.service';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { DatabaseModule } from 'src/database/database.module';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    HttpModule,
    // MongooseModule.forFeature([
    //   { name: User.name, schema: UserSchema },
    //   { name: OrganizationUnit.name, schema: OrganizationSchema },
    // ]),
    TypeOrmModule.forFeature([UserEntity, FeatureManagementEntity, GroupUserEntity], 'mssqlConnection'),
    forwardRef(() => BpmnModule),
    forwardRef(() => DatabaseModule),
  ],
  providers: [
    JwtStrategy,
    BpmnRoleGuard,
    FeatureGuard,
    RecordScopeAccessService,
    PermissionCacheService,
  ],
  exports: [
    JwtStrategy,
    JwtModule,
    PassportModule,
    BpmnRoleGuard,
    FeatureGuard,
    RecordScopeAccessService,
    PermissionCacheService,
  ],
})
export class OauthModule {
}
