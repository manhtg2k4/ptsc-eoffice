import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";
import { IsValidDateRangeFilter, IsValidSort } from "./list-type.map";

export class StatisticReportQueryDto {

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  @IsValidDateRangeFilter()
  filter?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"userDeadline":1}',
  })
  @IsOptional()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi mỗi trang',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: number;

}