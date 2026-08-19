import { Module } from '@nestjs/common';
import { BlocksService } from './block.service';
import { BlocksController } from './block.controller';
import { Block } from './entities/block.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Block, UserEntity], 'mssqlConnection'), // Nếu cần import entity nào đó
  ],
  controllers: [BlocksController],
  providers: [BlocksService],
})
export class BlocksModule { }
