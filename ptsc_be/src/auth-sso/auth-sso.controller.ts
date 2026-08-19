import { Controller, Get, Query, Res, Req, HttpException, HttpStatus, Body, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth-sso.service';
import { Public } from 'src/oauth/decorator/public.decorator';
// import { LogAction } from 'src/user-log/log.decorator'; // ✅ Commented - module deleted
import { TestSsoConnectionDto } from './dto/test-sso-connection.dto';
import { JwtAuthGuard } from './jwt.guard';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@ApiTags('Xác thực SSO')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService,
     @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepo: Repository<AuthConfigEntity>,
  ) { }

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
  @ApiResponse({
    status: 500,
    description: 'Cấu hình SSO không hợp lệ',
  })
  async login(@Res() res: Response) {
     //LẤY CONFIG ACTIVE = 1
    const record = await this.authConfigRepo.findOne({
      where: { isActive: true },
      order: { id: 'DESC' },
    });

    if (!record) {
      throw new Error('Không tìm thấy cấu hình SSO đang active');
    }

    // 🔥 PARSE JSON
    const config = record.config;

    const {
      authUrl,
      clientId,
      redirectUri,
      scope,
    } = config;

    const authorizeUrl =
      `${authUrl}` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}`;

    return res.redirect(authorizeUrl);
  }

  // @Public()
  // @LogAction('Đăng nhập')
  // @Get('callback')
  // async callback(@Query('code') code: string, @Res() res: Response) {
  //   const tokens = await this.authService.getToken(code);

  //   // Lưu session hoặc cookie
  //   res.cookie('token', tokens.access_token, { httpOnly: true });
  //   res.cookie('id_token', tokens.id_token, { httpOnly: true });

  //   res.cookie('tokenUser', tokens.token, { httpOnly: true });

  //   // Sau khi login xong redirect về FE
  //   return res.redirect(process.env.REDIRECT_URI_FE || '');
  // }


  @Public()
  @Post('callback')
  async callbackLifeSSO(@Body('access_token') accessToken: string, @Req() req: any) {
    if (!accessToken) {
      throw new HttpException('Access token is required', HttpStatus.BAD_REQUEST);
    }
    return this.authService.callbackLifeSSO(accessToken, req);
  }

  // @Public()
  // @Get('me')
  // async getProfile(@Req() req: Request) {
  //   const token = req.cookies['token'];
  //   const tokenUser = req.cookies['tokenUser'];

  //   // 🟢 Kiểm tra sự tồn tại của tokenUser trước khi xác thực
  //   if (!tokenUser) {
  //     return { loggedIn: false };
  //   }

  //   if (!process.env.JWT_SECRET) {
  //     throw new Error('JWT_SECRET is not defined');
  //   }

  //   const decoded = jwt.verify(tokenUser, process.env.JWT_SECRET) as jwt.JwtPayload & { user: string };

  //   const userFromDb = await this.userModel
  //     .findOne({ _id: new Types.ObjectId(decoded.user) })
  //     .populate('parent', 'name')
  //     .select('avatar parent')
  //     .lean();

  //   const organizationName = (userFromDb?.parent as any)?.name || null;
  //   return {
  //     loggedIn: true,
  //     token,
  //     tokenUser,
  //     user: { ...decoded, avatar: userFromDb?.avatar || [], organizationName },
  //   };
  // }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: Request & { user: any }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new HttpException('User not found in token', HttpStatus.UNAUTHORIZED);
    }

    // Logic đã được chuyển vào AuthService để sử dụng TypeORM
    return this.authService.getProfile(userId);
  }


  @Public()
  // @LogAction('Đăng xuất') // ✅ Commented - module deleted
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    // Lấy id_token từ cookie để gửi cho SSO provider
    const idToken = req.body['id_token'];

    // 🟢 Xóa tất cả các cookie liên quan đến phiên đăng nhập
    res.clearCookie('token');
    res.clearCookie('id_token');
    res.clearCookie('tokenUser');
    res.clearCookie('sid', { path: '/' }); // Xóa cookie session của express-session

    // === LẤY CONFIG TỪ DB ===
    const record = await this.authConfigRepo.findOne({
      where: { isActive: true },
      order: { id: 'DESC' },
    });

    let baseUrl = '';
    if (record?.config?.authUrl) {
      const urlObj = new URL(record.config.authUrl);
      baseUrl = urlObj.origin; // https://lifesso.lifetex.vn:9445
    }

    // 🟢 Hủy session phía server
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }

      // 🟢 Chuyển hướng đến trang logout của SSO Provider
      const postLogoutRedirectUri = process.env.REDIRECT_URI_FE || '';
      const idpLogoutUrl = `${baseUrl}/oidc/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;
      res.redirect(idpLogoutUrl);
    });
  }

  @Public()
  @Post('test-connection-sso')
  async testSsoConnection(@Body(new ValidationPipe()) body: TestSsoConnectionDto) {
    try {
      const result = await this.authService.testSsoConnection(body, body.config);
      return result;
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
