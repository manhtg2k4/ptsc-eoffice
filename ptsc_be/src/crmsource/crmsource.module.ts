import { forwardRef, Module } from '@nestjs/common';
import { CrmSourcesService } from './crmsource.service';
import { CrmSourcesController } from './crmsource.controller';
import { CrmSourceMSSQLRepository } from './crmsource.mssql.repository';
import { CrmSourceDataMSSQLRepository } from './crmsource-data.mssql.repository';
import { DatabaseModule } from 'src/database/database.module';
import { MSSQL_REPO } from 'src/database/database.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmSourceEntity } from './entities/crmsource.entity';
import { CrmSourceDataEntity } from './entities/crmsource-data.entity';
import { UsersModule } from 'src/users/users.module';
import { UserEntity } from 'src/users/entities/user.entity';

// import { MongooseModule } from '@nestjs/mongoose';
// import { CrmSource, CrmSourceSchema } from './crmsource.schema';

@Module({
  imports: [
    // MongooseModule.forFeature([
    //   { name: CrmSource.name, schema: CrmSourceSchema },
    // ]),
    forwardRef(() => DatabaseModule),
    forwardRef(() => UsersModule),
    TypeOrmModule.forFeature(
      [CrmSourceEntity, CrmSourceDataEntity, UserEntity], // thêm entity khác nếu cần
      'mssqlConnection', // <-- QUAN TRỌNG: phải trùng tên connection trong forRoot
    ),
  ],
  controllers: [CrmSourcesController],
  providers: [
    CrmSourcesService,
    CrmSourceMSSQLRepository,
    CrmSourceDataMSSQLRepository,
  ],
  exports: [CrmSourcesService, CrmSourceMSSQLRepository, CrmSourceDataMSSQLRepository],
})
export class CrmsourceModule { }
