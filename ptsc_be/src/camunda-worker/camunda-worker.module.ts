import { Module } from '@nestjs/common';
import { CamundaWorkerService } from './camunda-worker.service';

@Module({
  providers: [CamundaWorkerService],
  exports: [CamundaWorkerService],
})
export class CamundaWorkerModule {}
