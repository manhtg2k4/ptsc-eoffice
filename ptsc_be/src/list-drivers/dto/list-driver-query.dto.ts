import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject } from 'class-validator';
import { IsPositiveIntString, IsValidSort } from 'src/documents/dto/list-type.map';
import { IsPagedLimit, clampLimit } from '../../utils/pagination.validator';

export class ListDriverQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsString()
  carId?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: '1' })
  @IsOptional()
  @IsPositiveIntString(1, { message: 'Page phải là số nguyên >= 1.' })
  page?: string = '1';

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang',
    default: '25',
  })
  @IsOptional()
  @IsPagedLimit({ message: 'Limit phải là số nguyên trong khoảng [1, 100].' })
  limit?: string = '25';

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên, số điện thoại, CMND' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Filter object' })
  @IsOptional()
  @IsObject()
  filter?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Sắp xếp kết quả, ví dụ: {"createdAt":-1}',
  })
  @IsOptional()
  @IsObject()
  @IsValidSort()
  sort?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Mã danh sách (process function)' })
  @IsOptional()
  @IsString()
  processFn?: string;

  @ApiPropertyOptional({ description: 'Cờ xuất file' })
  @IsOptional()
  @IsString()
  isExport?: string;
  
  @ApiPropertyOptional({ description: 'Cờ xuất file' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy danh sách các tài xế CHƯA được gán xe nào làm quản lý' })
  @IsOptional()
  @IsString()
  unassignedManager?: string; // 'true' hoặc 'false'

  @ApiPropertyOptional({ description: 'Giữ lại ID người dùng được truyền vào nếu muốn hiển thị quản lý hiện tại của xe' })
  @IsOptional()
  @IsString()
  currentManagerId?: string;
}
