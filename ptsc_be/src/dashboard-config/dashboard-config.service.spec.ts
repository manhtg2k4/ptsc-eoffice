import { Test, TestingModule } from '@nestjs/testing';
import { DashboardConfigService } from './dashboard-config.service';

describe('DashboardConfigService', () => {
  let service: DashboardConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardConfigService],
    }).compile();

    service = module.get<DashboardConfigService>(DashboardConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
