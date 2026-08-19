import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from 'src/oauth/decorator/public.decorator';

@ApiTags('Xác thực cơ bản')
@Controller('auth-basic')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) { }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập nội bộ',
    description: 'Đăng nhập bằng username và password trực tiếp',
  })
  async login(@Body() body: { username?: string; password?: string }) {
    const { username, password } = body;
    if (!username || !password) {
      throw new UnauthorizedException('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
    }
    return this.authService.login({ username, password });
  }

  @Public()
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Lam moi token',
    description: 'Cap lai access token bang refresh token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          description: 'Refresh token',
          example: 'eyJhbGci...',
        },
      },
      required: ['refresh_token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Lam moi token thanh cong',
    schema: {
      example: {
        access_token: 'eyJhbGc...',
        refresh_token: 'eyJhbGci...',
        expires_in: 86400,
        refresh_expires_in: 864000,
        user: {
          id: 'user-id',
          username: 'admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token khong hop le hoac het han',
  })
  async refreshToken(@Body() body: { refresh_token: string }) {
    const { refresh_token } = body;
    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return this.authService.refreshToken(refresh_token);
  }
}
