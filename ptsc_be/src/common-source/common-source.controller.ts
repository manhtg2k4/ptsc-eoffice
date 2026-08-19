import { Controller, Get, Param } from '@nestjs/common';
import { CommonSourceService } from './common-source.service';

@Controller('common-source')
export class CommonSourceController {
  constructor(private readonly commonSourceService: CommonSourceService) {}

  @Get()
  async getAll() {
    return this.commonSourceService.findAll();
  }

  @Get(':code')
  async getByCode(@Param('code') code: string) {
    return this.commonSourceService.findByCode(code);
  }
}
