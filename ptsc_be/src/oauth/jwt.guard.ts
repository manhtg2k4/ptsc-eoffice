// src/auth/guards/jwt-auth.guard.ts
import { ExecutionContext, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorator/public.decorator';
import { ALLOW_COOKIE_AUTH_KEY } from './decorator/allow-cookie-auth.decorator';
import { DISALLOW_QUERY_AUTH_KEY } from './decorator/disallow-query-auth.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard(['jwt', 'jwt-cookie']) {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  private isUserSyncRequest(request: any): boolean {
    const url = request?.originalUrl || request?.url || '';
    return typeof url === 'string' && url.includes('/user-sync/');
  }

  private logUserSyncAuthFailure(request: any, reason: string, details?: Record<string, any>) {
    if (!this.isUserSyncRequest(request)) return;

    const authHeader = request?.headers?.authorization || request?.headers?.Authorization;
    const hasQueryToken = Boolean(
      request?.query?.access_token ||
      request?.query?.accessToken ||
      request?.query?.token ||
      request?.query?.authorization,
    );
    this.logger.warn(
      `[UserSyncAuth] ${reason} method=${request?.method || ''} url=${request?.originalUrl || request?.url || ''} hasAuthorization=${Boolean(authHeader)} hasQueryToken=${hasQueryToken} details=${JSON.stringify(details || {})}`,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    const allowCookieAuth = this.reflector.getAllAndOverride<boolean>(
      ALLOW_COOKIE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    const disallowQueryAuth = this.reflector.getAllAndOverride<boolean>(
      DISALLOW_QUERY_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    if (disallowQueryAuth) {
      const hasQueryAuth =
        request?.query?.access_token ||
        request?.query?.accessToken ||
        request?.query?.token ||
        request?.query?.authorization;
      if (hasQueryAuth) {
        this.logUserSyncAuthFailure(request, 'query token rejected by DisallowQueryAuth');
        throw new UnauthorizedException('Không được truyền token qua query string');
      }
    }

    // Nếu là API public, vẫn thử parse JWT nhưng không throw error
    if (isPublic) {
      try {
        // Thử parse JWT (nếu có)
        await super.canActivate(context);
      } catch (error) {
        // Bỏ qua lỗi - cho phép request đi qua dù không có token
      }
      return true; // Luôn cho phép request đi qua với @Public
    }

    // Ngược lại, xử lý xác thực như bình thường (bắt buộc phải có token)
    if (
      allowCookieAuth &&
      !request.headers.authorization &&
      !request.headers.Authorization
    ) {
      const cookieToken = request?.cookies?.tokenUser || request?.cookies?.token;
      if (typeof cookieToken === 'string' && cookieToken.split('.').length === 3) {
        request.headers.authorization = `Bearer ${cookieToken}`;
      }
    }
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Kiểm tra xem có phải là API public không
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu là public API và không có user, trả về undefined (không throw error)
    if (isPublic) {
      return user || undefined;
    }

    // Ưu tiên trả 401 cho các lỗi token/phiên đăng nhập
    const authErrorMessages = [
      'No auth token',
      'No authorization token',
      'invalid token',
      'jwt malformed',
      'jwt expired',
      'invalid signature',
      'invalid algorithm',
    ];
    const errMsg = String(err?.message || err || '').toLowerCase();
    const infoMsg = String(info?.message || info || '').toLowerCase();
    const isAuthError = authErrorMessages.some((m) => errMsg.includes(m) || infoMsg.includes(m));

    // Token hết hạn, không hợp lệ, hoặc không có token => Trả về 401
    if (isAuthError) {
      const request = context.switchToHttp().getRequest();
      this.logUserSyncAuthFailure(request, 'jwt auth failed', {
        err: err?.message || err || '',
        info: info?.message || info || '',
      });
      throw new UnauthorizedException('Unauthorized');
    }

    // Token hợp lệ nhưng user không còn hợp lệ trong hệ thống => 403
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      this.logUserSyncAuthFailure(request, 'jwt user rejected', {
        err: err?.message || err || '',
        hasUser: Boolean(user),
      });
      throw new ForbiddenException('Tài khoản không tồn tại hoặc đã bị khóa trong hệ thống!');
    }

    return user;
  }
}
