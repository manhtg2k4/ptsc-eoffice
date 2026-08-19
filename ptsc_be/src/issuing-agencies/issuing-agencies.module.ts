import { Module } from '@nestjs/common';
import { IssuingAgenciesService } from './issuing-agencies.service';
import { IssuingAgenciesController } from './issuing-agencies.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  IssuingAgency,
  IssuingAgencySchema,
} from './issuing-agencies.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: IssuingAgency.name, schema: IssuingAgencySchema }]),
  ],
  controllers: [IssuingAgenciesController],
  providers: [IssuingAgenciesService],
  exports: [IssuingAgenciesService],
})
export class IssuingAgenciesModule {}
