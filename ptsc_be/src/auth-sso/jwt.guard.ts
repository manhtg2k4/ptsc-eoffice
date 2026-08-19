import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../oauth/decorator/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-cookie') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiểm tra decorator @Public() trên handler hoặc controller
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Cho phép OPTIONS (CORS preflight)
    const req = context.switchToHttp().getRequest<Request>();
    if (req.method === 'OPTIONS') {
      return true;
    }
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.PRIVATE_API_KEY) {
      // Nếu có apiKey hợp lệ thì bỏ qua jwt luôn
      (req as any).user = { apiKeyUser: true }; // bạn có thể set user giả nếu cần
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (user?.apiKeyUser) {
      return user;
    }
    if (err || !user) {
      console.warn(info?.message || err);
      throw new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
