import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConversationsPermissionService } from '../conversations-permission.service';
import { CONVERSATIONS_PERMISSION_KEY, ConversationsPermissionAction } from '../decorators/conversations-permission.decorator';

@Injectable()
export class ConversationsPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: ConversationsPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<ConversationsPermissionAction>(
      CONVERSATIONS_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Bỏ qua nếu không yêu cầu quyền cụ thể
    if (!action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // Hỗ trợ lấy userId từ token
    const effectiveUserId = user?.userId || user?.id;

    if (!effectiveUserId) {
      throw new ForbiddenException('Người dùng chưa đăng nhập');
    }

    const { params, body, query } = request;
    const conversationId = params?.id || body?.conversationId || query?.conversationId;
    
    // Ngăn chặn truyền userId tùy ý qua query/body nếu không khớp token (Bảo mật)
    const passedUserId = body?.userId || query?.userId;
    if (passedUserId && passedUserId !== effectiveUserId) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    }

    switch (action) {
      case ConversationsPermissionAction.CREATE:
        return this.permissionService.checkCreate(effectiveUserId);

      case ConversationsPermissionAction.VIEW:
      case ConversationsPermissionAction.ACTION:
        // Cần truyền conversation ID để check
        if (!conversationId) {
          // Nếu chỉ là list conversation, được xem (vì service list đã tự filter theo uid)
          return true; 
        }
        return this.permissionService.checkMember(effectiveUserId, String(conversationId));

      case ConversationsPermissionAction.UPDATE:
      case ConversationsPermissionAction.DELETE:
        if (!conversationId) throw new BadRequestException('Thiếu ID hội thoại để kiểm tra quyền');
        return this.permissionService.checkCreator(effectiveUserId, String(conversationId));

      default:
        return true;
    }
  }
}
