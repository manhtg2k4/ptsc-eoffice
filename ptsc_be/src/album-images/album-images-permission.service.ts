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
import { AlbumImageEntity } from './entities/album-image.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AlbumImagesPermissionService {
  constructor(
    @InjectRepository(AlbumImageEntity, 'mssqlConnection')
    private readonly albumImageRepo: Repository<AlbumImageEntity>,
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

    throw new ForbiddenException('Bạn không có quyền tạo album ảnh');
  }

  async checkUpdate(userId: string, albumId?: string, flowId?: string): Promise<boolean> {
    if (albumId) {
      const album = await this.getAlbum(albumId);
      if (album.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;
      
      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('EDIT') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền chỉnh sửa album này');
  }

  async checkDelete(userId: string, albumId?: string, flowId?: string): Promise<boolean> {
    if (albumId) {
      const album = await this.getAlbum(albumId);
      if (album.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.includes('DELETE') || permissions.includes('ALL')) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xóa album này');
  }

  async checkView(userId: string, albumId?: string, flowId?: string): Promise<boolean> {
    if (albumId) {
      const album = await this.getAlbum(albumId);
      if (album.createdBy === userId) return true;
    }

    const processKey = flowId || (await this.getDefaultFlowId(userId)) || 'News';
    if (processKey) {
      const flowInfo = await this.userService.getUserFlowInfo(userId, processKey);
      if (flowInfo) return true;

      const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
      if (permissions.length > 0) return true;
    }

    throw new ForbiddenException('Bạn không có quyền xem thông tin album ảnh');
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

  private async getAlbum(id: string): Promise<AlbumImageEntity> {
    const item = await this.albumImageRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy album với ID: ${id}`);
    }
    return item;
  }
}
