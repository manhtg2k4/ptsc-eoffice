import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { Banner } from './entities/banner.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class BannerPermissionService {
  constructor(
    @InjectRepository(Banner, 'mssqlConnection')
    private readonly bannerRepo: Repository<Banner>,
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

    throw new ForbiddenException('Bạn không có quyền tạo banner');
  }

  async checkUpdate(userId: string, bannerId?: string, flowId?: string): Promise<boolean> {
    if (bannerId) {
      const banner = await this.getBanner(bannerId);
      if (banner.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('EDIT') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa banner này');
  }

  async checkDelete(userId: string, bannerId?: string, flowId?: string): Promise<boolean> {
    if (bannerId) {
      const banner = await this.getBanner(bannerId);
      if (banner.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('DELETE') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa banner này');
  }

  async checkView(userId: string, bannerId?: string, flowId?: string): Promise<boolean> {
    if (bannerId) {
      const banner = await this.getBanner(bannerId);
      if (banner.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.length > 0) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem thông tin banner');
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

  private async getBanner(id: string): Promise<Banner> {
    const item = await this.bannerRepo.findOne({ where: { id: id as any } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy banner với ID: ${id}`);
    }
    return item;
  }
}
