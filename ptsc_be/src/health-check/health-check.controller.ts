import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../oauth/decorator/public.decorator';
import { HealthCheckService } from './health-check.service';

@ApiTags('Health')
@Public()
@Controller('health-check')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiOperation({ summary: 'Health check (liveness)' })
  live(): unknown {
    return this.healthCheckService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Health check (readiness)' })
  ready(): unknown {
    return this.healthCheckService.ready();
  }
}

