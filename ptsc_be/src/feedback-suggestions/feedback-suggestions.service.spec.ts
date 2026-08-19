import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackSuggestionsService } from './feedback-suggestions.service';

describe('FeedbackSuggestionsService', () => {
  let service: FeedbackSuggestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackSuggestionsService],
    }).compile();

    service = module.get<FeedbackSuggestionsService>(FeedbackSuggestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
