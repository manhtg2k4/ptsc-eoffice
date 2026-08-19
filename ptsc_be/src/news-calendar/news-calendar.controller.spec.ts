import { Test, TestingModule } from '@nestjs/testing';
import { NewsCalendarController } from './news-calendar.controller';
import { NewsCalendarService } from './news-calendar.service';

describe('NewsCalendarController', () => {
  let controller: NewsCalendarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsCalendarController],
      providers: [NewsCalendarService],
    }).compile();

    controller = module.get<NewsCalendarController>(NewsCalendarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
