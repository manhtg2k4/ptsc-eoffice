import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
import { Reflector } from '@nestjs/core';
import { PROCESS_ROLE_KEY, ProcessRoleRequirement } from '../decorators/roles-by-process.decorator';

@Injectable()
export class RoleByProcessGuard implements CanActivate {
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    // Super Admin bypass - Super Admin có quyền làm mọi thứ
    if (isSuperAdminByKeycloakId(userId)) {
      return true;
    }

    // Lấy yêu cầu về role từ decorator (nếu có )
    const requirements = this.reflector.getAllAndOverride<ProcessRoleRequirement[]>(
      PROCESS_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    let user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'rolesByProcess', 'keycloakUserId'],
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { keycloakUserId: userId },
        select: ['id', 'rolesByProcess', 'keycloakUserId'],
      });
    }

    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    const rolesByProcess = Array.isArray(user.rolesByProcess) ? user.rolesByProcess : [];

    // Nếu không có yêu cầu cụ thể từ decorator, chỉ cần có ít nhất 1 role bất kỳ
    if (!requirements || requirements.length === 0) {
      if (rolesByProcess.length > 0) {
        return true;
      }
      throw new ForbiddenException('Bạn không có quyền thao tác. Yêu cầu có ít nhất một role quy trình.');
    }

    // Kiểm tra xem user có thỏa mãn ít nhất một trong các yêu cầu không
    const hasRequiredRole = requirements.some(req => {
      return rolesByProcess.some(userRole => {
        const matchesProcess = userRole.processKey === req.processKey;
        const matchesRole = !req.roleCode || userRole.roles?.some(r => r.roleCode === req.roleCode);
        return matchesProcess && matchesRole;
      });
    });

    if (hasRequiredRole) {
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền thực hiện hành động này với role quy trình hiện tại.');
  }
}
