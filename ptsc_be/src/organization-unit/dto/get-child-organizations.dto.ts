// src/organizations/dto/get-child-organizations.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetChildOrganizationsDto {
  @ApiPropertyOptional({
    description: 'ID phòng ban cha (nếu không truyền sẽ lấy phòng ban của user hiện tại)',
    example: '68afb3a1cb36081f0bba5dd6',
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Có bao gồm chính phòng ban đó không',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeSelf?: boolean = false;

  @ApiPropertyOptional({ description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Số lượng trên trang' })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Không giới hạn số lượng' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  noLimit?: boolean;

  @ApiPropertyOptional({ description: 'Danh sách parent ids cần trace' })
  @IsOptional()
  @IsString()
  tracePath?: string;

  @ApiPropertyOptional({ description: 'Lọc phòng ban theo số lượng dấu / trong mpath (chỉ lấy các phòng ban <= maxLevel - 1 dấu /)' })
  @IsOptional()
  @Type(() => Number)
  maxLevel?: number;

  @ApiPropertyOptional({
    description: 'Mã phòng ban',
    example: 'TC2',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Tên phòng ban cần tìm kiếm',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Bộ lọc nâng cao (ví dụ: filter[name])',
  })
  @IsOptional()
  filter?: any;
}

export class OrganizationUnitDto {
  @ApiProperty({ example: '68afb3e4cb36081f0bba5dd7' })
  id: string;

  @ApiProperty({ example: 'Đơn vị thành viên' })
  name: string;

  @ApiProperty({ example: 'TC2' })
  code: string;

  @ApiProperty({ example: 'Phòng' })
  type: string;

  @ApiProperty({ example: '68afb3a1cb36081f0bba5dd6/68afb3e4cb36081f0bba5dd7' })
  mpath: string;

  @ApiProperty({ example: '68afb3a1cb36081f0bba5dd6', nullable: true })
  parentId: string | null;

  @ApiProperty({ example: 2, description: 'Cấp độ trong cây tổ chức (1=gốc, 2=con, 3=cháu...)' })
  level: number;
}

export class GetChildOrganizationsResponseDto {
  @ApiProperty({ type: [OrganizationUnitDto] })
  data: OrganizationUnitDto[];

  @ApiProperty({ example: 10 })
  total: number;
}