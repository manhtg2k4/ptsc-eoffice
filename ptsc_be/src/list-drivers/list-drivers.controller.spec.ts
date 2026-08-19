import { Test, TestingModule } from '@nestjs/testing';
import { ListDriversController } from './list-drivers.controller';
import { ListDriversService } from './list-drivers.service';

describe('ListDriversController', () => {
  let controller: ListDriversController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListDriversController],
      providers: [ListDriversService],
    }).compile();

    controller = module.get<ListDriversController>(ListDriversController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
