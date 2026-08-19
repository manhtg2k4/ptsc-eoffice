import { Module, forwardRef } from '@nestjs/common';
import { ServiceTaskExecutorService } from './service-task-executor.service';
import { ServiceTaskHandlersRegistry } from './service-task-handlers.registry';
import { BpmnDesign } from 'src/bpmn-designs/bpmn-design.schema';
import { BpmnModule } from 'src/bpmn/bpmn.module';
import { MeetingModule } from 'src/meeting/meeting.module';
import { DatabaseModule } from 'src/database/database.module';
import { FilesManagementModule } from 'src/files-managerment/files-management.module';

@Module({
  providers: [ServiceTaskExecutorService, ServiceTaskHandlersRegistry],
  exports: [ServiceTaskExecutorService],
  imports: [
    forwardRef(() => BpmnModule),
    forwardRef(() => MeetingModule),
    forwardRef(() => DatabaseModule),
    forwardRef(() => FilesManagementModule),
  ],
})
export class ServiceTaskModule {}
