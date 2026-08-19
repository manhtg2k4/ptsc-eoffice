import { Test, TestingModule } from '@nestjs/testing';
import { ListDriversService } from './list-drivers.service';

describe('ListDriversService', () => {
  let service: ListDriversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListDriversService],
    }).compile();

    service = module.get<ListDriversService>(ListDriversService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
