import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Put,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TableConfigService } from './table-config.service';
import { UpsertTableConfigDto } from './upsert-table-config.dto';
import { Response, Request } from 'express';
import { ReturnError } from 'src/utils/util';

@ApiTags('Cấu hình Bảng')
@Controller('table-config')
export class TableConfigController {
  constructor(private readonly tableConfigService: TableConfigService) {}

  @Put()
  @ApiOperation({
    summary: 'Cập nhật hoặc tạo mới cấu hình bảng',
    description: 'Cập nhật hoặc tạo mới cấu hình bảng cho người dùng, bao gồm cột, sắp xếp và lọc',
  })
  @ApiBody({
    type: UpsertTableConfigDto,
    description: 'Dữ liệu cấu hình bảng',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cấu hình thành công',
    schema: {
      example: {
        success: true,
        data: {},
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa xác thực',
  })
  async upsert(
    @Body() dto: UpsertTableConfigDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Lấy userId từ token đã được giải mã (gắn vào request bởi JwtAuthGuard)
      const userId = (req as any).user?.userId;

      const result = await this.tableConfigService.upsert(userId, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}