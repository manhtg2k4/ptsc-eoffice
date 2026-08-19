import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus, Param, Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ThemeConfigService } from './theme-config.service';
import { CreateCustomThemeDto } from './create-custom-theme.dto';
import { UpdateCustomThemeDto } from './update-custom-theme.dto';
import { AuthGuard } from '@nestjs/passport';

interface AuthenticatedRequest extends Request { user: { userId: string }; }

@ApiTags('Cấu hình Chủ đề')
@Controller('v1/theme-config')
export class ThemeConfigController {
  constructor(private readonly themeConfigService: ThemeConfigService) { }

  @Get()
  @ApiOperation({
    summary: 'Lấy cấu hình chủ đề mặc định',
    description: 'Lấy thông tin cấu hình chủ đề mặc định của hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình thành công',
  })
  getConfig() {
    return this.themeConfigService.getConfig();
  }

  @Put()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật cấu hình chủ đề mặc định',
    description: 'Cập nhật thông tin cấu hình chủ đề mặc định của hệ thống',
  })
  @ApiBody({
    type: Object,
    description: 'Dữ liệu cấu hình chủ đề',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  updateConfig(@Body() config: any) {
    return this.themeConfigService.updateConfig(config);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa cấu hình chủ đề mặc định',
    description: 'Xóa cấu hình chủ đề mặc định của hệ thống',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  deleteConfig() {
    return this.themeConfigService.deleteConfig();
  }

  // ✅ Các API mới cho Custom Theme

  // Các endpoint bên dưới giờ sẽ được bảo vệ và có req.user
  @Post('custom')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Tạo mới chủ đề tùy chỉnh',
    description: 'Tạo mới một chủ đề tùy chỉnh cho người dùng hiện tại',
  })
  @ApiBody({
    type: CreateCustomThemeDto,
    description: 'Dữ liệu tạo chủ đề tùy chỉnh',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  createCustomTheme(@Req() req: AuthenticatedRequest, @Body() createDto: CreateCustomThemeDto) {
    // Lấy userId từ request đã xác thực
    const userId = req.user.userId;
    return this.themeConfigService.createCustomTheme(userId, createDto);
  }

  @Get('custom')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy danh sách chủ đề tùy chỉnh',
    description: 'Lấy danh sách tất cả chủ đề tùy chỉnh của người dùng hiện tại',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  getCustomThemes(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.themeConfigService.getCustomThemes(userId);
  }

  @Get('custom/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy chi tiết chủ đề tùy chỉnh',
    description: 'Lấy thông tin chi tiết của một chủ đề tùy chỉnh theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề tùy chỉnh',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề tùy chỉnh',
  })
  getCustomThemeById(@Req() req: AuthenticatedRequest, @Param('id') themeId: string) {
    const userId = req.user.userId;
    return this.themeConfigService.getCustomThemeById(themeId, userId);
  }

  @Put('custom/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cập nhật chủ đề tùy chỉnh',
    description: 'Cập nhật thông tin của một chủ đề tùy chỉnh theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề tùy chỉnh cần cập nhật',
  })
  @ApiBody({
    type: UpdateCustomThemeDto,
    description: 'Dữ liệu cập nhật chủ đề tùy chỉnh',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề tùy chỉnh',
  })
  updateCustomTheme(@Req() req: AuthenticatedRequest, @Param('id') themeId: string, @Body() updateDto: UpdateCustomThemeDto) {
    const userId = req.user.userId;
    return this.themeConfigService.updateCustomTheme(themeId, userId, updateDto);
  }

  @Delete('custom/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa chủ đề tùy chỉnh',
    description: 'Xóa một chủ đề tùy chỉnh theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID của chủ đề tùy chỉnh cần xóa',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chủ đề tùy chỉnh',
  })
  deleteCustomTheme(@Req() req: AuthenticatedRequest, @Param('id') themeId: string) {
    const userId = req.user.userId;
    return this.themeConfigService.deleteCustomTheme(themeId, userId);
  }
}