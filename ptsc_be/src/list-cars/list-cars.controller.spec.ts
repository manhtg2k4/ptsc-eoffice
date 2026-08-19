import { Test, TestingModule } from '@nestjs/testing';
import { ListCarsController } from './list-cars.controller';
import { ListCarsService } from './list-cars.service';

describe('ListCarsController', () => {
  let controller: ListCarsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListCarsController],
      providers: [ListCarsService],
    }).compile();

    controller = module.get<ListCarsController>(ListCarsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
