import { Test, TestingModule } from '@nestjs/testing';
import { DashboardConfigController } from './dashboard-config.controller';
import { DashboardConfigService } from './dashboard-config.service';

describe('DashboardConfigController', () => {
  let controller: DashboardConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardConfigController],
      providers: [DashboardConfigService],
    }).compile();

    controller = module.get<DashboardConfigController>(DashboardConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
