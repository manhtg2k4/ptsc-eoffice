import { Test, TestingModule } from '@nestjs/testing';
import { EntityRoleGroupController } from './entity-rolegroup.controller';

describe('EntityRoleGroupController', () => {
  let controller: EntityRoleGroupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntityRoleGroupController],
    }).compile();

    controller = module.get<EntityRoleGroupController>(EntityRoleGroupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
