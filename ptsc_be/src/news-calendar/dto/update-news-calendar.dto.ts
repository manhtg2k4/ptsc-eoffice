import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsCalendarDto } from './create-news-calendar.dto';

export class UpdateNewsCalendarDto extends PartialType(CreateNewsCalendarDto) { }
