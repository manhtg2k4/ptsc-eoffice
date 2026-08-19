import { Repository, In } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { ListRoleEntity } from 'src/list-role/entities/list-role.entity';
import { POSITION_LEVEL, STATUS } from 'src/variables/CONST_STATUS';
import { isSuperAdminByKeycloakId, SUPER_ADMIN } from 'src/utils/super-admin.util';

let staticUserRepo: Repository<UserEntity> | null = null;
const ADMIN_PERMISSION_CACHE_TTL_MS = 60_000;
const adminPermissionCache = new Map<string, { value: boolean; expires: number }>();
const adminPermissionInflight = new Map<string, Promise<boolean>>();

/**
 * Khởi tạo connection tĩnh cho helper kiểm tra quyền admin.
 * Được gọi 1 lần duy nhất trong constructor của UsersService.
 */
export function initAdminCheckHelper(userRepo: Repository<UserEntity>) {
  staticUserRepo = userRepo;
}

/**
 * Hàm kiểm tra quyền Admin dùng chung, chỉ cần truyền vào userId.
 * Không bị lỗi Circular Dependency khi import ở các service khác.
 */
export async function checkAdminPermission(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const normalizedUserId = String(userId).trim();
  if (!normalizedUserId) {
    return false;
  }

  const cached = adminPermissionCache.get(normalizedUserId);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const inflight = adminPermissionInflight.get(normalizedUserId);
  if (inflight) {
    return inflight;
  }

  const pending = (async (): Promise<boolean> => {
  // if (1 === 1) {
  //   return true;
  // }

  // 1. Super Admin bypass (so sánh cả userId lẫn keycloakUserId)
    if (isSuperAdminByKeycloakId(normalizedUserId)) {
      return true;
    }

    if (!staticUserRepo) {
      console.warn('[checkAdminPermission] Helper static user repository is not initialized.');
      return false;
    }

    try {
      // 2. Tìm user trong DB theo ID
      let userData = await staticUserRepo.findOne({
        where: { id: normalizedUserId },
        select: ['id', 'position', 'role', 'keycloakUserId'],
      });

      if (!userData) {
        userData = await staticUserRepo.findOne({
          where: { keycloakUserId: normalizedUserId },
          select: ['id', 'position', 'role', 'keycloakUserId'],
        });
      }

      if (!userData) {
        return false;
      }

      // Check keycloakUserId với SUPER_ADMIN
      if (userData.keycloakUserId && isSuperAdminByKeycloakId(userData.keycloakUserId)) {
        return true;
      }

      // Kiểm tra SUPER_ADMIN cấu hình hằng số (isSuperAdmin trong UsersService)
      const isSuperAdmin = Boolean(
        SUPER_ADMIN &&
        (userData.id === SUPER_ADMIN || userData.keycloakUserId === SUPER_ADMIN)
      );
      if (isSuperAdmin) {
        return true;
      }

      // 3. Check qua staticPermissions gán qua nhóm (role gán cho group của user có code = 'ADMIN')
      try {
        const groupUserRepo = staticUserRepo.manager.getRepository(GroupUserEntity);
        const userGroups = await groupUserRepo
          .createQueryBuilder('g')
          .select(['g.id', 'g.roles'])
          .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
          .where('ugu.user_id = :userId', { userId: userData.id })
          .getMany();

        const roleIdsFromGroups = userGroups.flatMap((g) => (g as any).roles || []);
        if (roleIdsFromGroups.length > 0) {
          const listRoleRepo = staticUserRepo.manager.getRepository(ListRoleEntity);
          const listRoles = await listRoleRepo.find({
            where: { id: In(roleIdsFromGroups), status: STATUS.ACTIVED },
          });
          const hasAdminRole = listRoles.some((role) => role.code === 'ADMIN');
          if (hasAdminRole) {
            return true;
          }
        }
      } catch (error) {
        console.error(`[checkAdminPermission] Error checking group roles for user ${normalizedUserId}:`, error);
      }

      // 4. Fallback: Check by Position Level (Admin = 0)
      if (userData.position && POSITION_LEVEL[userData.position] === POSITION_LEVEL.Admin) {
        return true;
      }

      // 5. Fallback: Check by Role string
      if (userData.role) {
        const roleLower = userData.role.toLowerCase();
        if (
          roleLower.includes('admin') ||
          roleLower.includes('quản trị') ||
          roleLower.includes('administrator')
        ) {
          return true;
        }
      }
    } catch (error) {
      console.error(`[checkAdminPermission] Error executing helper for user ${normalizedUserId}:`, error);
    }

    return false;
  })();

  adminPermissionInflight.set(normalizedUserId, pending);
  try {
    const result = await pending;
    adminPermissionCache.set(normalizedUserId, {
      value: result,
      expires: Date.now() + ADMIN_PERMISSION_CACHE_TTL_MS,
    });
    return result;
  } finally {
    adminPermissionInflight.delete(normalizedUserId);
  }
}
