import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class RecordCatalogPermissionService {
  constructor(
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly userService: UsersService,
  ) {}

  async checkPermission(
    userId: string,
    action: string,
    featureCode: string = 'dmhs',
  ): Promise<boolean> {
    const processKey = await this.getDefaultFlowId(userId);

    // Nếu không tìm thấy flow (quy trình) cấu hình cho đơn vị, mặc định có thể cho qua hoặc chặn tùy quy tắc
    // Ở đây ta ưu tiên kiểm tra theo featureCode (dmhs)
    if (processKey) {
      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions && permissions.length > 0) {
        // Nếu là hành động XEM, chỉ cần có quyền trong quy trình là đủ (giống ArchiveRecord)
        if (action === 'view') return true;

        // Kiểm tra quyền cụ thể theo action hoặc featureCode
        if (
          action === 'create' &&
          (permissions.includes('CREATE') ||
            permissions.includes('ADD') ||
            permissions.includes(featureCode))
        )
          return true;
        if (
          action === 'update' &&
          (permissions.includes('EDIT') ||
            permissions.includes('UPDATE') ||
            permissions.includes(featureCode))
        )
          return true;
        if (
          action === 'delete' &&
          (permissions.includes('DELETE') ||
            permissions.includes('REMOVE') ||
            permissions.includes(featureCode))
        )
          return true;
        if (
          action === 'manage' &&
          (permissions.includes('MANAGE') ||
            permissions.includes('ADMIN') ||
            permissions.includes(featureCode))
        )
          return true;

        // Backup: Kiểm tra trực tiếp featureCode
        if (featureCode && permissions.includes(featureCode)) return true;
      }
    }

    // Backup: Kiểm tra quyền trực tiếp nếu không qua flow
    const directPermissions = await this.sqlsvRepo.getUserPermissions(userId, featureCode);
    if (directPermissions && directPermissions.length > 0) return true;

    throw new ForbiddenException(
      'Bạn không có quyền thực hiện thao tác này trên Danh mục hồ sơ',
    );
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    try {
      const user = await this.sqlsvRepo.getUserById(userId);
      const flow = await this.sqlsvRepo.getFlowByUnit(
        user?.parent?.id,
        'ArchiveRecord', // Sử dụng chung quy trình với ArchiveRecord theo yêu cầu
      );
      return flow?.id;
    } catch {
      return undefined;
    }
  }
}
