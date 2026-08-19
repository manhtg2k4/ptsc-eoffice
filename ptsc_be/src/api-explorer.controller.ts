import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiExplorerService } from './api-explorer.service';

@ApiTags('Thông tin Hệ thống')
@Controller('system-info')
export class ApiExplorerController {
  constructor(private readonly apiExplorerService: ApiExplorerService) {}

  @Get('api-endpoints')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả API endpoints',
    description: 'Trả lại danh sách tất cả các endpoints đã đăng ký trong hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách endpoints thành công',
    schema: {
      example: {
        endpoints: [],
      },
    },
  })
  getApiEndpoints() {
    return this.apiExplorerService.getApiEndpoints();
  }
}