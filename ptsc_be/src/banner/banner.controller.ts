import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BannerService } from './banner.service';
import { BatchCreateBannersDto } from './dto/update-banner.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { AuthorityGuard, AuthorityStages, CheckAuthority, EffectiveUser } from 'src/authority-documents';
import { BannerPermissionGuard } from './guards/banner-permission.guard';
import { BannerPermissionAction, RequireBannerPermission } from './decorators/banner-permission.decorator';

@ApiTags('Banner')
@ApiBearerAuth()
@Controller('banner')
@UseGuards(JwtAuthGuard) // Chỉ bắt buộc Auth ở level Controller
export class BannerController {
  constructor(private readonly bannerService: BannerService) { }

  // API 1: Lấy tất cả banner
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách banner',
    description: 'Lấy tất cả banner, mặc định chỉ lấy status = 1 (active)'
  })
  @ApiQuery({ name: 'status', required: false, type: Number, description: '0: inactive, 1: active' })
  @ApiQuery({ name: 'bannerKey', required: false, type: String, description: 'Lọc theo bannerKey' })
  async findAll(
    @Query('status') status?: string,
    @Query('bannerKey') bannerKey?: string,
  ) {
    return this.bannerService.findAll({
      bannerKey,
      status: status ? parseInt(status) : undefined,
    });
  }

  // API 2: Tạo mới hoặc cập nhật banner (batch)
  @Post()
  @UseGuards(AuthorityGuard, BannerPermissionGuard)
  @CheckAuthority(AuthorityStages.BANNER)
  @RequireBannerPermission(BannerPermissionAction.UPDATE)
  @ApiOperation({
    summary: 'Tạo/Cập nhật banner hàng loạt',
    description: 'Nếu bannerKey đã tồn tại sẽ update, chưa có sẽ tạo mới. Dùng để submit form với 4 ô input.'
  })
  async batchCreateOrUpdate(
    @Body() dto: BatchCreateBannersDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    return this.bannerService.batchCreateOrUpdate(dto, req.user);
  }

  // API 3: Lấy chi tiết banner theo ID
  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết banner theo ID',
    description: 'Lấy thông tin chi tiết của một banner'
  })
  async findOne(@Param('id') id: string) {
    return this.bannerService.findOne(+id);
  }

  // API 4: Lấy chi tiết banner theo bannerKey
  @Get('key/:bannerKey')
  @ApiOperation({
    summary: 'Lấy chi tiết banner theo bannerKey',
    description: 'Lấy thông tin chi tiết của một banner theo bannerKey'
  })
  async findByKey(@Param('bannerKey') bannerKey: string) {
    return this.bannerService.findByKey(bannerKey);
  }

  // API 5: Xóa banner theo ID
  @Delete(':id')
  @UseGuards(AuthorityGuard, BannerPermissionGuard)
  @CheckAuthority(AuthorityStages.BANNER)
  @RequireBannerPermission(BannerPermissionAction.DELETE)
  @ApiOperation({
    summary: 'Xóa banner theo ID',
    description: 'Xóa một banner khỏi hệ thống'
  })
  async remove(@Param('id') id: string) {
    return this.bannerService.remove(+id);
  }
}