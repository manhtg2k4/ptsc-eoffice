import { Test, TestingModule } from '@nestjs/testing';
import { FeatureManagementService } from './feature-management.service';

describe('FeatureManagementService', () => {
  let service: FeatureManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeatureManagementService],
    }).compile();

    service = module.get<FeatureManagementService>(FeatureManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
