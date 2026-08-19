import { PartialType } from '@nestjs/mapped-types';
import { CreateFeedbackSuggestionDto } from './create-feedback-suggestion.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateFeedbackSuggestionDto extends PartialType(CreateFeedbackSuggestionDto) {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    unitId?: string;

    @IsOptional()
    @IsString()
    processorId?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsString()
    result?: string;
}
