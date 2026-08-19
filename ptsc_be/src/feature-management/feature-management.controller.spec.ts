import { Test, TestingModule } from '@nestjs/testing';
import { FeatureManagementController } from './feature-management.controller';

describe('FeatureManagementController', () => {
  let controller: FeatureManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureManagementController],
    }).compile();

    controller = module.get<FeatureManagementController>(FeatureManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
