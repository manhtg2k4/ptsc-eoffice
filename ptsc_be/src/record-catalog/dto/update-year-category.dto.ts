import { PartialType } from '@nestjs/swagger';
import { CreateYearCategoryDto } from './create-year-category.dto';

export class UpdateYearCategoryDto extends PartialType(CreateYearCategoryDto) { }
