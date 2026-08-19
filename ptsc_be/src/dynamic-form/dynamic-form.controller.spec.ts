import { Test, TestingModule } from '@nestjs/testing';
import { DynamicFormController } from './dynamic-form.controller';

describe('DynamicFormController', () => {
  let controller: DynamicFormController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicFormController],
    }).compile();

    controller = module.get<DynamicFormController>(DynamicFormController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
