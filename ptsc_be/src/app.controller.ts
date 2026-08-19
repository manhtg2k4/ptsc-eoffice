import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Ứng dụng')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  
  @Get()
  @ApiOperation({
    summary: 'Lấy thông tin chào mừng',
    description: 'Trả lại thông điệp chào mừng từ server',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
