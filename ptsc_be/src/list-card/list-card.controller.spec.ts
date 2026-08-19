import { Test, TestingModule } from '@nestjs/testing';
import { ListCardController } from './list-card.controller';
import { ListCardService } from './list-card.service';

describe('ListCardController', () => {
  let controller: ListCardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListCardController],
      providers: [ListCardService],
    }).compile();

    controller = module.get<ListCardController>(ListCardController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
