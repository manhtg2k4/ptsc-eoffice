import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { HrmJobMappingService } from './hrm-job-mapping.service';
import { CreateHrmJobMappingDto, BatchUpdateMappingDto } from './hrm-job-mapping.dto';

@Controller('hrm-job-mapping')
export class HrmJobMappingController {
  constructor(private readonly mappingService: HrmJobMappingService) {}

  @Get()
  async findAll() {
    return this.mappingService.findAll();
  }

  @Get(':groupUserId')
  async findByGroup(@Param('groupUserId') groupUserId: string) {
    return this.mappingService.findByGroup(groupUserId);
  }

  @Post()
  async updateMappings(@Body() dto: CreateHrmJobMappingDto) {
    return this.mappingService.updateMappings(dto);
  }

  @Post('batch')
  async batchUpdate(@Body() dto: BatchUpdateMappingDto) {
    return this.mappingService.batchUpdateMappings(dto);
  }
}
