import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class DepartmentWorkStatsDto {
  @ApiPropertyOptional({ description: 'Danh sách ID phòng ban được chọn (phân cách dấu phẩy hoặc mảng)', example: 'dept1,dept2' })
  @IsOptional()
  deptIds?: string | string[];

  @ApiPropertyOptional({ description: 'Danh sách ID tài khoản Ban Lãnh Đạo (người giao)', example: 'user1,user2' })
  @IsOptional()
  assignerIds?: string | string[];

  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)', example: '2025-01-01' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)', example: '2025-12-31' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Lọc Ngày bắt đầu (chuỗi YYYY-MM-DD hoặc object {startDate, endDate})' })
  @IsOptional()
  startDate?: any;

  @ApiPropertyOptional({ description: 'Lọc Ngày kết thúc / Hạn cuối (chuỗi YYYY-MM-DD hoặc object {startDate, endDate})' })
  @IsOptional()
  endDate?: any;

  @ApiPropertyOptional({ description: 'Nguồn công việc (general: Công việc chung, document: Từ văn bản, meeting: Từ cuộc họp)', example: 'general,document' })
  @IsOptional()
  sources?: string | string[];

  @ApiPropertyOptional({ description: 'Số trang (Mặc định: 1)', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi/trang (Mặc định: 25)', example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm tên công việc' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lấy kèm danh sách filter options (18 phòng ban, Ban lãnh đạo)' })
  @IsOptional()
  includeOptions?: boolean | string;

  @ApiPropertyOptional({ description: 'Object bộ lọc linh hoạt từ frontend (filter[assignerIds][], filter[deptIds][], ...)' })
  @IsOptional()
  filter?: any;
}
