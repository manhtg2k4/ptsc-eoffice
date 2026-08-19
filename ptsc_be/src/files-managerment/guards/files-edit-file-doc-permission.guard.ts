import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { FilesRepository } from '../repositories/files.repository';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { UsersService } from 'src/users/users.service';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

@Injectable()
export class FilesEditFileDocPermissionGuard implements CanActivate {
  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const isPublic = request.query?.public === 'true' || request.body?.public === true;

    if (isPublic) {
      return true; // Cho phép đi qua luôn, không cần userId hay check database
    }

    // Lấy userId từ request (thường được gán bởi AuthGuard hoặc CookieAuth)
    const user = request.user || request.effectiveUser;
    const userId = user?.userId || request.userId;

    // Lấy fileId từ URL params, body, hoặc query
    const fileId =
      request.params?.id ||
      request.body?.id ||
      request.query?.id ||
      request.params?.fileId ||
      request.body?.fileId ||
      request.query?.fileId;

    const fileIdsRaw = request.body?.fileIds || request.query?.fileIds;

    let fileIdList: string[] = [];
    if (fileIdsRaw && Array.isArray(fileIdsRaw)) {
      fileIdList = fileIdsRaw;
    } else if (fileIdsRaw && typeof fileIdsRaw === 'string') {
      fileIdList = fileIdsRaw.split(',');
    }

    if (fileId && fileIdList.length === 0) {
      fileIdList.push(fileId);
    }

    if (!userId) {
      throw new UnauthorizedException(
        'Người dùng chưa đăng nhập hoặc phiên làm việc hết hạn',
      );
    }

    if (fileIdList.length === 0) {
      throw new ForbiddenException(
        'Không tìm thấy ID của file để kiểm tra quyền',
      );
    }

    try {
      // 1. Kiểm tra văn bản đã được ký số chưa. Nếu đã ký, không cho phép chỉnh sửa.
      for (const fId of fileIdList) {
        const isNotSigned = await this.filesRepository.isNotSigned(fId);
        if (!isNotSigned) {
          console.warn(
            `[FilesEditFileDocPermissionGuard] User ${userId} denied edit for file ${fId}: Document already signed`,
          );
          throw new ForbiddenException(
            'Văn bản đã được ký số, không thể chỉnh sửa nội dung.',
          );
        }
      }

      // 2. Super Admin bypass
      if (isSuperAdminByKeycloakId(userId)) {
        return true;
      }

      // Check xem user có phải Admin hoặc Quản lý người dùng không
      const roleInfo = await this.userService.findProcessRoleInfoById(userId);
      const isAdminRole = roleInfo?.roleCodes?.includes('ADMIN');
      const hasAdminOrUserMgmtPermission = roleInfo?.staticPermissions?.some(
        (p: { code: string }) => p.code === 'ADMIN' || p.code === 'VT102'
      );
      if (isAdminRole || hasAdminOrUserMgmtPermission) {
        return true;
      }

      // 3. Check quyền trong luồng Hồ sơ lưu trữ (Mặc định)
      const isHistoryApi = request.url.includes('/history');
      const isCollaboraApi = request.url.includes('/collabora');//api chỉnh sửa văn bản không bypass trong luồng phải là file của user hoặc được phân quyền.
      let hasArchivePerm = false;
      if (!isHistoryApi && !isCollaboraApi) {
        const processKey = await this.getDefaultFlowId(userId);
        if (processKey) {
          hasArchivePerm = await this.userService.isUserInFlowQuick(userId, processKey);
        }
      }

      const fileChecks = fileIdList.map(async (fId) => {
        // Gọi song song 5 hàm kiểm tra quyền xem file, trả về true ngay khi có bất kỳ hàm nào xong trước và đúng (Short-circuit)
        const promises = [
          this.filesRepository.canUserViewFile(fId, userId),
          this.filesRepository.isUserInMeetingOfFile(fId, userId),
          this.filesRepository.isUserInPassportRequestOfFile(fId, userId),
          this.filesRepository.isUserInProjectOfFile(fId, userId),
          this.filesRepository.isUserInVehicleRegistration(fId, userId),
        ];

        const canViewFile = await new Promise<boolean>((resolve) => {
          let completedCount = 0;
          let resolved = false;

          promises.forEach((promise) => {
            promise
              .then((res) => {
                if (resolved) return;
                if (res) {
                  resolved = true;
                  resolve(true);
                } else {
                  completedCount++;
                  if (completedCount === promises.length) {
                    resolve(false);
                  }
                }
              })
              .catch(() => {
                if (resolved) return;
                completedCount++;
                if (completedCount === promises.length) {
                  resolve(false);
                }
              });
          });
        });

        if (!canViewFile && !hasArchivePerm) {
          console.warn(`[FilesEditFileDocPermissionGuard] ❌ User ${userId} denied access to file ${fId}`);
          throw new ForbiddenException('Bạn không có quyền chỉnh sửa tài liệu này.');
        }
      });

      await Promise.all(fileChecks);

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;

      console.error('[FilesEditFileDocPermissionGuard] Error:', error);
      throw new ForbiddenException('Lỗi hệ thống khi kiểm tra quyền chỉnh sửa');
    }
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'ArchiveRecord',
    );

    if (!flow?.id) {
      return 'hosoluutru';
    } else {
      return flow.id;
    }
  }
}
