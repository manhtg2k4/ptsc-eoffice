import { Test, TestingModule } from '@nestjs/testing';
import { BlocksController } from './block.controller';
import { BlocksService } from './block.service';

describe('BlocksController', () => {
  let controller: BlocksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlocksController],
      providers: [BlocksService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<BlocksController>(BlocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
