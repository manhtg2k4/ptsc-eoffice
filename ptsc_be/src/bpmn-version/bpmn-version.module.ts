import { Module } from '@nestjs/common';
import { BpmnVersionService } from './bpmn-version.service';
import { BpmnVersionController } from './bpmn-version.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BpmnVersionEntity } from './bpmn-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BpmnVersionEntity], 'mssqlConnection'),
  ],
  controllers: [BpmnVersionController],
  providers: [BpmnVersionService],
  exports: [BpmnVersionService],
})
export class BpmnVersionModule {}
