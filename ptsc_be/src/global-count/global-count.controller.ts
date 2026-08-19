import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { GlobalCountService } from './global-count.service';
import { JwtAuthGuard } from '../oauth/jwt.guard';

@Controller('global')
@UseGuards(JwtAuthGuard)
export class GlobalCountController {
  constructor(private readonly globalCountService: GlobalCountService) {}

  @Get('count')
  async getGlobalCount(@Req() req: any) {
    const userId = req.user.userId;
    return this.globalCountService.getGlobalCount(userId);
  }

  @Get('count-approve')
  async getGlobalCountApprove(@Req() req: any) {
    const userId = req.user.userId;
    return this.globalCountService.getGlobalCountApprove(userId);
  }
}
