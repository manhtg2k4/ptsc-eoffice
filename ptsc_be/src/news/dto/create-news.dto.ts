import { IsNotEmpty, IsOptional, IsString, IsIn, IsBoolean, IsDateString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { encodeHTML, sanitizeHtml } from '../../utils/html-sanitize.util';

export class CreateNewsDto {
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    title: string;

    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => sanitizeHtml(value))
    content: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    nameThumbnail?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
    removeThumbnail?: boolean;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    summary?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
    isComment?: boolean;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
    isSpecial?: boolean;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
    isImportant?: boolean;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    topic?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => {
        if (!value) return '';
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((tag) => encodeHTML(tag))
                .filter((tag) => tag.length > 0)
                .join(', ');
        }
        if (Array.isArray(value)) {
            return value
                .map((tag) => (typeof tag === 'string' ? encodeHTML(tag) : ''))
                .filter((tag) => tag.length > 0)
                .join(', ');
        }
        return encodeHTML(value);
    })
    tags?: string;

    @IsOptional()
    @IsIn([0, 1, 2, 3])
    status?: number;

    @IsOptional()
    @IsDateString()
    publishedAt?: string | Date;

    @IsOptional()
    @IsDateString()
    scheduledPublishAt?: string | Date;

    @IsOptional()
    @IsNumber()
    viewCount?: number;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    authorName?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    reviewerId?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    reviewerName?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    department?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    submitterId?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    submitterName?: string;

    @IsOptional()
    @IsDateString()
    submittedAt?: string | Date;

    @IsOptional()
    @IsDateString()
    deadline?: string | Date;

    @IsOptional()
    @IsDateString()
    recalledAt?: string | Date;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    recalledById?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    recalledByName?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    recallReason?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    rejectorId?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    rejectorName?: string;

    @IsOptional()
    @IsDateString()
    rejectedAt?: string | Date;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    rejectReason?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    cancellerId?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    cancellerName?: string;

    @IsOptional()
    @IsDateString()
    cancelledAt?: string | Date;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => encodeHTML(value))
    cancelReason?: string;

    @IsOptional()
    sizeSmall?: string | number;

    @IsOptional()
    sizeMedium?: string | number;

    @IsOptional()
    sizeBig?: string | number;
}

