import { Controller, Get, Res, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { Public } from 'src/oauth/decorator/public.decorator';
import { AuthService } from './auth.service';

@ApiTags('Xác thực SSO')
@Controller('auth-sso')
export class SsoController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('login')
  @ApiOperation({
    summary: 'Chuyển hướng đến trang đăng nhập SSO',
    description: 'Chuyển hướng người dùng đến nhà cung cấp dịch vụ SSO để đăng nhập',
  })
  @ApiResponse({
    status: 302,
    description: 'Chuyển hướng đến trang SSO',
  })
  async ssoLogin(@Res() res: Response) {
    const redirectUrl = await this.authService.getSsoRedirectUrl();
    return res.redirect(redirectUrl);
  }
  
  @Public()
  @Get('logout')
  @ApiOperation({
    summary: 'Chuyển hướng đến trang đăng xuất SSO',
    description: 'Chuyển hướng người dùng đến nhà cung cấp dịch vụ SSO để đăng xuất',
  })
  @ApiResponse({
    status: 302,
    description: 'Chuyển hướng đến trang đăng xuất SSO',
  })
  async ssoLogout(@Res() res: Response) {
    const logoutUrl = await this.authService.getSsoLogoutUrl();
    return res.redirect(logoutUrl);
  }
}