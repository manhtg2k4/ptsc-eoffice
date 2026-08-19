import { PartialType } from '@nestjs/swagger';
import { CreateDashboardConfigDto } from './create-dashboard-config.dto';

export class UpdateDashboardConfigDto extends PartialType(CreateDashboardConfigDto) {}
