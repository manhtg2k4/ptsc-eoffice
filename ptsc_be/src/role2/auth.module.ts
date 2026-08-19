import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from 'src/database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';

@Module({
  imports: [
    DatabaseModule, // Import DatabaseModule to get access to MONGO_REPO
    TypeOrmModule.forFeature([RoleFeatureEntity], 'mssqlConnection'),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class Role2Module { }
