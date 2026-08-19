import { Test, TestingModule } from '@nestjs/testing';
import { MenuManagerController } from './menu-manager.controller';

describe('MenuManagerController', () => {
  let controller: MenuManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuManagerController],
    }).compile();

    controller = module.get<MenuManagerController>(MenuManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
