// src/user-log/log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { UserLogService } from './user-log.service';
import { Reflector } from '@nestjs/core';
import { LOG_ACTION_KEY } from './log.decorator';
import { verifyKeycloakToken } from '../utils/keycloak-verify';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  constructor(
    private readonly logService: UserLogService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // kiểm tra metadata có @LogAction không
    const handler = context.getHandler();
    const logAction = this.reflector.get<string | boolean>(
      LOG_ACTION_KEY,
      handler,
    );

    if (!logAction) {
      // nếu không có decorator thì bỏ qua, không log
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress;
    
    // Ưu tiên request.user (do JwtAuthGuard đã gắn vào)
    let user: any = request.user || {};

    if (!user.username && !user.preferred_username) {
      // ✅ Decode token nếu chưa có request.user
      let token = request.cookies?.tokenUser || request.cookies?.token;
      if (!token) {
        const authHeader = request.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (token) {
        try {
          user = await verifyKeycloakToken(token);
        } catch (e) {
          user = {};
        }
      }
    }
    
    // Keycloak lưu username trong preferred_username
    const userName = user?.preferred_username || user?.username || 'Anonymous';
    const feature =
      typeof logAction === 'string'
        ? logAction
        : request.route?.path || request.originalUrl;
    const action = request.method;

    return next.handle().pipe(
      tap(async () => {
        await this.logService.createLog({
          ip,
          userName: userName,
          department: user?.department || '',
          feature,
          action,
          status: 'Thành công',
          //   responseTime: Date.now() - now,
        });
      }),
      catchError(async (err) => {
        await this.logService.createLog({
          ip,
          userName: userName,
          department: user?.department || '',
          feature,
          action,
          status: 'Thất bại',
          //   errorMessage: err.message,
          //   responseTime: Date.now() - now,
        });
        throw err;
      }),
    );
  }
}
