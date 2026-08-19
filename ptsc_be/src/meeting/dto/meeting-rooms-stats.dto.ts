import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsObject } from 'class-validator';

/**
 * DTO cho API thống kê phòng họp
 * Hỗ trợ phân trang, lọc theo tháng/năm và export
 */
export class ListMeetingRoomsStatsDto {
  /**
   * Số trang (mặc định: 1, tối thiểu: 1)
   */
  @ApiPropertyOptional({ 
    description: 'Số trang', 
    example: '1',
    default: '1'
  })
  @IsOptional()
  @IsString()
  page?: string;

  /**
   * Số bản ghi mỗi trang (mặc định: 20, tối đa: 100)
   */
  @ApiPropertyOptional({ 
    description: 'Số bản ghi mỗi trang', 
    example: '20',
    default: '20'
  })
  @IsOptional()
  @IsString()
  limit?: string;

  /**
   * Chỉ lấy tổng số bản ghi (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Chỉ lấy tổng số bản ghi', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  countOnly?: string;

  /**
   * Export dữ liệu (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Export dữ liệu', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isExport?: string;

  /**
   * Bộ lọc dữ liệu
   */
  @ApiPropertyOptional({
    description: 'Bộ lọc dữ liệu',
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Tháng (1-12)',
        example: '1'
      },
      year: {
        type: 'string',
        description: 'Năm (YYYY)',
        example: '2026'
      }
    }
  })
  @IsOptional()
  filter?: {
    /**
     * Tháng (1-12)
     */
    month?: string;

    /**
     * Năm (YYYY)
     */
    year?: string;
    roomIds?: string;
    name?: string;

  };
  
  @IsOptional()
  sort?: Record<string, any>;

}

/**
 * Interface cho kết quả trả về của API
 */
export interface MeetingRoomStatsResponse {
  /**
   * Tên phòng họp
   */
  name: string;

  /**
   * Sức chứa của phòng
   */
  capacity: number;

  /**
   * Số cuộc họp
   */
  meetingCount: number;

  /**
   * Tổng giờ sử dụng
   */
  totalHours: number;

  /**
   * Tỷ lệ sử dụng (%)
   */
  usageRate: number;

  /**
   * Cuộc họp trung bình trên ngày
   */
  avgMeetingsPerDay: number;
}


export class ListMeetingByTimeDto {
  /**
   * Số trang (mặc định: 1, tối thiểu: 1)
   */
  @ApiPropertyOptional({ 
    description: 'Số trang', 
    example: '1',
    default: '1'
  })
  @IsOptional()
  @IsString()
  page?: string;

  /**
   * Số bản ghi mỗi trang (mặc định: 20, tối đa: 100)
   */
  @ApiPropertyOptional({ 
    description: 'Số bản ghi mỗi trang', 
    example: '20',
    default: '20'
  })
  @IsOptional()
  @IsString()
  limit?: string;

  /**
   * Chỉ lấy tổng số bản ghi (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Chỉ lấy tổng số bản ghi', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  countOnly?: string;

  /**
   * Export dữ liệu (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Export dữ liệu', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isExport?: string;

  /**
   * Bộ lọc dữ liệu
   */
  @ApiPropertyOptional({
    description: 'Bộ lọc dữ liệu',
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Tháng (1-12)',
        example: '1'
      },
      year: {
        type: 'string',
        description: 'Năm (YYYY)',
        example: '2026'
      }
    }
  })
  @IsOptional()
  filter?: {
    chairmanId?: string;
    organizationalUnit?: string;
    roomIds?:string
    meetingState?:string 
    meetingDate?:{
      startDate?: string;
      endDate?: string;
    }
  };

  @IsOptional()
  sort?: Record<string, any>;

}

export class listMeetingAttendanceReportDto {
  /**
   * Số trang (mặc định: 1, tối thiểu: 1)
   */
  @ApiPropertyOptional({ 
    description: 'Số trang', 
    example: '1',
    default: '1'
  })
  @IsOptional()
  @IsString()
  page?: string;

  /**
   * Số bản ghi mỗi trang (mặc định: 20, tối đa: 100)
   */
  @ApiPropertyOptional({ 
    description: 'Số bản ghi mỗi trang', 
    example: '20',
    default: '20'
  })
  @IsOptional()
  @IsString()
  limit?: string;

  /**
   * Chỉ lấy tổng số bản ghi (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Chỉ lấy tổng số bản ghi', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  countOnly?: string;

  /**
   * Export dữ liệu (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Export dữ liệu', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isExport?: string;

  /**
   * Bộ lọc dữ liệu
   */
  @ApiPropertyOptional({
    description: 'Bộ lọc dữ liệu',
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Tháng (1-12)',
        example: '1'
      },
      year: {
        type: 'string',
        description: 'Năm (YYYY)',
        example: '2026'
      }
    }
  })
  @IsOptional()
  filter?: {
    organizationalUnit?: string;
    organizationUnit?: string;
    meetingDate?:{
      startDate?: string;
      endDate?: string;
    },
    assignee?:string;
  };
  
  @IsOptional()
  sort?: Record<string, any>;

}




export class listConclusionsFromKMeetingDto {
  /**
   * Số trang (mặc định: 1, tối thiểu: 1)
   */
  @ApiPropertyOptional({ 
    description: 'Số trang', 
    example: '1',
    default: '1'
  })
  @IsOptional()
  @IsString()
  page?: string;

  /**
   * Số bản ghi mỗi trang (mặc định: 20, tối đa: 100)
   */
  @ApiPropertyOptional({ 
    description: 'Số bản ghi mỗi trang', 
    example: '20',
    default: '20'
  })
  @IsOptional()
  @IsString()
  limit?: string;

  /**
   * Chỉ lấy tổng số bản ghi (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Chỉ lấy tổng số bản ghi', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  countOnly?: string;

  /**
   * Export dữ liệu (true/false)
   */
  @ApiPropertyOptional({ 
    description: 'Export dữ liệu', 
    example: 'false',
    default: 'false'
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isExport?: string;

  /**
   * Bộ lọc dữ liệu
   */
  @ApiPropertyOptional({
    description: 'Bộ lọc dữ liệu',
    type: 'object',
    properties: {
      month: {
        type: 'string',
        description: 'Tháng (1-12)',
        example: '1'
      },
      year: {
        type: 'string',
        description: 'Năm (YYYY)',
        example: '2026'
      }
    }
  })
  @IsOptional()
  filter?: {
    processStatus?: string;
    meetingDate?:{
      startDate?: string;
      endDate?: string;
    }
    meetingId?:string;
    title?:string;
    processId?:string;
    assignee?: string;
    assignee_user?: string;
    status?: string;

  };

  
  @IsOptional()
  sort?: Record<string, any>;

}
