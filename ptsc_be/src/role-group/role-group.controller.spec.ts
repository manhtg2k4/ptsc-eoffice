import { Test, TestingModule } from '@nestjs/testing';
import { RoleGroupController } from './role-group.controller';

describe('RoleGroupController', () => {
  let controller: RoleGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleGroupController],
    }).compile();

    controller = module.get<RoleGroupController>(RoleGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
