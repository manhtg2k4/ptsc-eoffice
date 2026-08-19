import { PartialType } from '@nestjs/swagger';
import { CreateDashboardPageDto } from './create-dashboard-page.dto';

export class UpdateDashboardPageDto extends PartialType(CreateDashboardPageDto) {}
