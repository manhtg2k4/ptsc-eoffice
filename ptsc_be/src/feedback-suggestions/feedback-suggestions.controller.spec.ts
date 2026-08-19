import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackSuggestionsController } from './feedback-suggestions.controller';
import { FeedbackSuggestionsService } from './feedback-suggestions.service';

describe('FeedbackSuggestionsController', () => {
  let controller: FeedbackSuggestionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackSuggestionsController],
      providers: [FeedbackSuggestionsService],
    }).compile();

    controller = module.get<FeedbackSuggestionsController>(FeedbackSuggestionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
