import { PartialType, IntersectionType } from '@nestjs/swagger';
import { DispatchFeedbackDto } from './dispatch-feedback.dto';
import { CreateFeedbackSuggestionDto } from './create-feedback-suggestion.dto';

export class ReUpdateFeedbackDto extends IntersectionType(
  DispatchFeedbackDto,
  PartialType(CreateFeedbackSuggestionDto)
) {}
