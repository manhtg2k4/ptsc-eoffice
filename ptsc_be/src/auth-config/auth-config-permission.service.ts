import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { SUPER_ADMIN } from 'src/utils/super-admin.util';

@Injectable()
export class AuthConfigPermissionService {
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async isAdmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    
    if (SUPER_ADMIN && userId === SUPER_ADMIN) return true;
    
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return false;

    if (SUPER_ADMIN && (
      user.keycloakUserId === SUPER_ADMIN || 
      user.username === SUPER_ADMIN || 
      user.emailUser === SUPER_ADMIN
    )) {
      return true;
    }

    const roleLower = (user.role || '').toLowerCase();
    const isAdmin = roleLower.includes('admin') || roleLower.includes('quan tri') || roleLower.includes('quản trị');
    
    return isAdmin;
  }

  async checkPermission(userId: string, action: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    
    throw new ForbiddenException(`Bạn không có quyền thực hiện hành động ${action} trên cấu hình xác thực`);
  }
}
