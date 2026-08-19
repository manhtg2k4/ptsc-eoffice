import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator để lấy thông tin user được ủy quyền (author)
 * Nếu không có ủy quyền, trả về null
 * @example
 * async someMethod(@AuthorizedUser() authorizedUserId: string | null) {
 *   const userId = authorizedUserId || currentUserId; // Dùng author nếu có, không thì dùng current user
 * }
 */
export const AuthorizedUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.authorizedUser || null;
  },
);

/**
 * Decorator để lấy user hiện tại (người được ủy quyền)
 */
export const OriginalUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.originalUser || request.user?.userId || null;
  },
);

/**
 * Decorator để lấy toàn bộ thông tin ủy quyền
 */
export const AuthorityInfo = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.authorityDocument || null;
  },
);

/**
 * Decorator để lấy user ID cuối cùng (author nếu có, không thì current user)
 */
export const EffectiveUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Ưu tiên dùng authorizedUser (author), nếu không có thì dùng originalUser
    return request.authorizedUser || request.originalUser || request.user?.userId || null;
  },
);

