import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { BpmnVersionService } from './bpmn-version.service';
import { ApiOperation, ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('bpmn-version')
@Controller('bpmn-version')
export class BpmnVersionController {
  constructor(private readonly bpmnVersionService: BpmnVersionService) {}

  @Post('create-version')
  @ApiOperation({ summary: 'Tạo mới 1 BPMN với version mới' })
  @ApiBody({ schema: { 
    type: 'object',
    properties: {
      processKey: { type: 'string' },
      base64File: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['processKey','base64File']
  }})
  async createVersion(
    @Body() body: { processKey: string; base64File: string; name?: string; description?: string },
  ) {
    return this.bpmnVersionService.createVersion(body.processKey, body.base64File);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Lấy phiên bản BPMN mới nhất theo id' })
  @ApiQuery({ name: 'id', description: 'processKey của BPMN' })
  async getLatest(@Query('id') id: string) {
    return this.bpmnVersionService.getLatestVersion(id);
  }
}
