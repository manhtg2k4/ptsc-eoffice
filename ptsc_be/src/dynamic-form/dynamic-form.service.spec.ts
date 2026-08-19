import { Test, TestingModule } from '@nestjs/testing';
import { DynamicFormService } from './dynamic-form.service';

describe('DynamicFormService', () => {
  let service: DynamicFormService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicFormService],
    }).compile();

    service = module.get<DynamicFormService>(DynamicFormService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
