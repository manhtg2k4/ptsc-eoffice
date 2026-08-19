import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RatingFeedbackDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    score: number; // 1 - 5 sao

    @IsOptional()
    @IsString()
    ratingComment?: string;

    @IsOptional()
    @IsString()
    satisfactionLevel?: string;
}
