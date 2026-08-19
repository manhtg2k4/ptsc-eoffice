import { Test, TestingModule } from '@nestjs/testing';
import { ListCardService } from './list-card.service';

describe('ListCardService', () => {
  let service: ListCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListCardService],
    }).compile();

    service = module.get<ListCardService>(ListCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
