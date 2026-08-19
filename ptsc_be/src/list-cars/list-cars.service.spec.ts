import { Test, TestingModule } from '@nestjs/testing';
import { ListCarsService } from './list-cars.service';

describe('ListCarsService', () => {
  let service: ListCarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListCarsService],
    }).compile();

    service = module.get<ListCarsService>(ListCarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
