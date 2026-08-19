import { Test, TestingModule } from '@nestjs/testing';
import { RoleFeatureService } from './role-feature.service';

describe('RoleFeatureService', () => {
  let service: RoleFeatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleFeatureService],
    }).compile();

    service = module.get<RoleFeatureService>(RoleFeatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
