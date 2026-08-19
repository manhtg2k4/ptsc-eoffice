import { Test, TestingModule } from '@nestjs/testing';
import { BpmnDesignsService } from './bpmn-designs.service';

describe('BpmnDesignsService', () => {
  let service: BpmnDesignsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BpmnDesignsService],
    }).compile();

    service = module.get<BpmnDesignsService>(BpmnDesignsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
