import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { RoleSchema } from './role.shema';
import { RoleEntity } from './role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: 'Role', schema: RoleSchema }]),
    TypeOrmModule.forFeature([RoleEntity, UserEntity], 'mssqlConnection'),
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService], // Xuất service để sử dụng ở module khác
})
export class RoleModule { }