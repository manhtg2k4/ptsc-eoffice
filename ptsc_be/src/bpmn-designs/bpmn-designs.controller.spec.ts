import { Test, TestingModule } from '@nestjs/testing';
import { BpmnDesignsController } from './bpmn-designs.controller';
import { BpmnDesignsService } from './bpmn-designs.service';

describe('BpmnDesignsController', () => {
  let controller: BpmnDesignsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BpmnDesignsController],
      providers: [BpmnDesignsService],
    }).compile();

    controller = module.get<BpmnDesignsController>(BpmnDesignsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
