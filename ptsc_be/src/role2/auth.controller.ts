// src/auth/auth.controller.ts
import { BadRequestException, Controller, Get, Headers, Req, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
// import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Quyền - Tính năng')
@Controller('role-2')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // @UseGuards(JwtAuthGuard)
  @Get('get-detail')
  @ApiOperation({ summary: 'Get feature permissions for the current user' })
  @ApiResponse({ status: 200, description: 'Return user role features' })
  @ApiResponse({ status: 400, description: 'Authorization header missing' })
  @ApiBearerAuth()
  async getRoleFeatures(@Req() request: any) {
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new BadRequestException('Authorization header missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const requestUserId = request.user?.userId; // DB internal ID từ JwtStrategy
    const data = await this.authService.getRoleFeatures(token, requestUserId);

    return { status: 1, data };
  }
}
