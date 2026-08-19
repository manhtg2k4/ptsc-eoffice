import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicFormController } from './dynamic-form.controller';
import { DynamicFormService } from './dynamic-form.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicForm } from './dynamic-form.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DynamicForm], 'mssqlConnection'),
  ],
  controllers: [DynamicFormController],
  providers: [DynamicFormService],
  exports: [DynamicFormService],
})
export class DynamicFormModule { }
