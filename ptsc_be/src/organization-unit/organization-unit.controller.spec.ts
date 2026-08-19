import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUnitController } from './organization-unit.controller';

describe('OrganizationUnitController', () => {
  let controller: OrganizationUnitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationUnitController],
    }).compile();

    controller = module.get<OrganizationUnitController>(OrganizationUnitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
