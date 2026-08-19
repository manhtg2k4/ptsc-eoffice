import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleFeatureService } from './role-feature.service';
import { RoleFeatureController } from './role-feature.controller';
import { RoleFeatureEntity } from './role-feature-sql/role-feature.entity';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleFeatureEntity, UserEntity], 'mssqlConnection'),
  ],
  controllers: [RoleFeatureController],
  providers: [RoleFeatureService],
  exports: [RoleFeatureService],
})
export class RoleFeatureModule { }
