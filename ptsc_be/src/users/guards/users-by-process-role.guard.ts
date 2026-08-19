import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users.service';

const SO_VB_DEN = 'SoVBden';
const SO_VB_DI = 'SoVBDi';

@Injectable()
export class UsersByProcessRoleGuard implements CanActivate {
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request?.user?.userId;


    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    // Super Admin bypass
    if (isSuperAdminByKeycloakId(userId)) {
      return true;
    }

    // Lấy process role info của user
    const roleInfo = await this.usersService.findProcessRoleInfoById(userId);

    // Kiểm tra xem user có SoVBden hoặc SoVBDi trong roles hoặc roleCodes
    const roles = roleInfo?.roles || [];
    const roleCodes = roleInfo?.roleCodes || [];

    // Kết hợp cả 2 mảng để kiểm tra
    const allPermissions = [...roles, ...roleCodes];

    const hasVbDen = allPermissions.includes(SO_VB_DEN);
    const hasVbDi = allPermissions.includes(SO_VB_DI);


    if (!hasVbDen && !hasVbDi) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện chức năng này. Yêu cầu quyền SoVBden hoặc SoVBDi.'
      );
    }

    return true;
  }
}