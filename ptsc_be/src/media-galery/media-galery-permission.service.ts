import {
  Injectable,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MediaGaleryPermissionService {
  constructor(
    private readonly sqlsvRepo: SQLSVRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
  ) { }

  async checkCreate(userId: string, flowId?: string): Promise<boolean> {
    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';

    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.length > 0) return true;
    }

    throw new ForbiddenException('Bạn không có quyền tạo media');
  }

  async checkUpdate(userId: string, mediaId?: string, flowId?: string): Promise<boolean> {
    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('EDIT') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa media này');
  }

  async checkDelete(userId: string, mediaId?: string, flowId?: string): Promise<boolean> {
    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('DELETE') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa media này');
  }

  async checkView(userId: string, mediaId?: string, flowId?: string): Promise<boolean> {
    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.length > 0) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem thông tin media');
  }

  async checkFeatureAccess(userId: string, featureCode: string, flowId?: string): Promise<boolean> {
    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes(featureCode) || permissions.includes('ALL')) {
        return true;
      }
    }

    throw new ForbiddenException(`Bạn không có quyền thực hiện thao tác này (${featureCode})`);
  }

  private async getDefaultFlowId(userId: string): Promise<string | undefined> {
    const user = await this.sqlsvRepo.getUserById(userId);
    const flow = await this.sqlsvRepo.getFlowByUnit(
      user?.parent?.id,
      'News',
    );
    return flow?.id;
  }
}
