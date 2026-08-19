import { Module } from '@nestjs/common';
import { ListCardService } from './list-card.service';
import { ListCardController } from './list-card.controller';

@Module({
  controllers: [ListCardController],
  providers: [ListCardService],
})
export class ListCardModule {}
