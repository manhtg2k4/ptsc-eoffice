import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { SET_METADATA_KEY } from '../decorators/task-role-screen.decorator';

/**
 * Guard để kiểm tra quyền truy cập màn hình dựa trên role của user trong quy trình
 * Yêu cầu user phải có ít nhất một trong các quyền màn hình được cấu hình
 */
@Injectable()
export class TaskRoleScreenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepo: Repository<RoleFeatureEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request?.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Người dùng không được xác thực');
    }

    // Lấy danh sách màn hình cần kiểm tra từ decorator
    const requiredScreens = this.reflector.get<string[]>(
      SET_METADATA_KEY,
      context.getHandler(),
    );

    if (!requiredScreens || requiredScreens.length === 0) {
      return true; // Không có ràng buộc nào, cho phép truy cập
    }

    // Lấy thông tin user và rolesByProcess
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'rolesByProcess'],
    });

    if (!user) {
      throw new ForbiddenException('Người dùng không tồn tại');
    }

    const rolesByProcess = Array.isArray(user.rolesByProcess)
      ? user.rolesByProcess
      : [];

    if (rolesByProcess.length === 0) {
      throw new ForbiddenException(
        'Người dùng không có quyền truy cập màn hình này',
      );
    }

    // Lấy tất cả processKey từ rolesByProcess
    const processKeys = [
      ...new Set(
        rolesByProcess.map((p) => p.processKey).filter((key): key is string =>
          Boolean(key),
        ),
      ),
    ];

    if (processKeys.length === 0) {
      throw new ForbiddenException(
        'Người dùng không có quyền truy cập màn hình này',
      );
    }

    // Fetch all role-feature definitions in one round trip. The old loop awaited
    // one query per processKey, making every protected picker request an N+1.
    const roleFeatures = await this.roleFeatureRepo.find({
      where: { processKey: In(processKeys) },
      select: ['processKey', 'roles'],
    });

    // Kiểm tra xem user có bất kỳ màn hình nào trong danh sách requiredScreens không
    let hasPermission = false;

    for (const proc of rolesByProcess) {
      const rf = roleFeatures.find(
        (r: any) => r.processKey === proc.processKey,
      );

      if (!rf || !Array.isArray(rf.roles)) continue;

      for (const roleObject of proc.roles || []) {
        const role = (rf as any).roles?.find(
          (r: any) => r.roleCode === roleObject.roleCode,
        );

        if (!role || !Array.isArray(role.permissions)) continue;

        // Kiểm tra xem có bất kỳ permission nào khớp với requiredScreens không
        const matchedScreens = role.permissions.filter((perm: string) =>
          requiredScreens.includes(perm),
        );

        if (matchedScreens.length > 0) {
          hasPermission = true;
          break;
        }
      }

      if (hasPermission) break;
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        `Người dùng không có quyền truy cập màn hình. Cần ít nhất một trong các quyền: ${requiredScreens.join(', ')}`,
      );
    }

    return true;
  }
}
