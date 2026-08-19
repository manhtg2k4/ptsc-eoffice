import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupUserEntity } from '../../group-users/entities/group-users.entity';
import { GROUP_CODES } from '../../variable/CONST_STATUS';

@Injectable()
export class TaskAssignmentConfigRolesGuard implements CanActivate {
  constructor(
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
    }

    const userGroups = await this.groupUserRepository
      .createQueryBuilder('gu')
      .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
      .where('ugu.user_id = :userId', { userId })
      .andWhere('gu.status = :status', { status: 1 })
      .select(['gu.code'])
      .getMany();

    const allowedCodes = [
      GROUP_CODES.TRUONG_PHONG,
      GROUP_CODES.PHO_TRUONG_PHONG,
      GROUP_CODES.TONG_GIAM_DOC,
      GROUP_CODES.PHO_GIAM_DOC,
    ];

    const hasAccess = userGroups.some(g => allowedCodes.includes(g.code));

    if (!hasAccess) {
      throw new ForbiddenException('Bạn không có quyền quản lý cấu hình nhận việc. Chỉ dành cho Trưởng phòng, Phó trưởng phòng, Giám đốc, Phó giám đốc.');
    }

    return true;
  }
}
