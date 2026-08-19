import { Test, TestingModule } from '@nestjs/testing';
import { NewsCalendarService } from './news-calendar.service';

describe('NewsCalendarService', () => {
  let service: NewsCalendarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsCalendarService],
    }).compile();

    service = module.get<NewsCalendarService>(NewsCalendarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
