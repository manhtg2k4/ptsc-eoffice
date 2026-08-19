import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { Public } from 'src/oauth/decorator/public.decorator';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { UpdateMobileAppVersionConfigDto } from './dto/update-mobile-app-version-config.dto';
import { MobileConfigService } from './mobile-config.service';

@ApiTags('Mobile Config')
@Controller('mobile-config')
export class MobileConfigController {
  constructor(private readonly mobileConfigService: MobileConfigService) {}

  @Public()
  @Get('app-version')
  @ApiOperation({ summary: 'Get mobile app version config' })
  @ApiQuery({ name: 'platform', required: false, enum: ['android', 'ios'] })
  @ApiResponse({ status: 200, description: 'Mobile app version config' })
  getAppVersionConfig(@Query('platform') platform?: string) {
    return this.mobileConfigService.getAppVersionConfig(platform);
  }

  @Get('app-version/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all mobile app version configs' })
  getAllAppVersionConfigs() {
    return this.mobileConfigService.findAllAppVersionConfigs();
  }

  @Patch('app-version/:platform')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mobile app version config by platform' })
  @ApiParam({ name: 'platform', enum: ['android', 'ios'] })
  updateAppVersionConfig(
    @Param('platform') platform: string,
    @Body() dto: UpdateMobileAppVersionConfigDto,
  ) {
    return this.mobileConfigService.updateAppVersionConfig(platform, dto);
  }
}
