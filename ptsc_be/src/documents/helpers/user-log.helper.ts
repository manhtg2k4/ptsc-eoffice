import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { OrganizationUnitEntity } from '../../organization-unit/organization-unit_sql/organization-unit.entity';

export interface UserLogInfo {
  fullName: string;
  userName: string;
  organization: string;
  ipAddress: string;
}

@Injectable()
export class UserLogHelper {
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationRepository: Repository<OrganizationUnitEntity>,
  ) { }

  /**
   * Lấy thông tin người dùng từ userId để sử dụng cho log
   * @param userId ID của người dùng
   * @param req Request object để lấy IP address
   * @returns Thông tin người dùng cho log
   */
  async getUserLogInfo(userId: string, req?: any): Promise<UserLogInfo> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'name', 'username', 'organizationName'],
        relations: ['parent'],
      });

      if (user) {
        let organizationName = user.organizationName || '';

        // Nếu không có organizationName nhưng có parent (OrganizationUnit), lấy từ parent
        if (!organizationName && user.parent) {
          // Parent đã được load qua relation, lấy trực tiếp
          organizationName = user.parent.name || '';
        }

        return {
          fullName: user.name || 'Unknown',
          userName: user.username || 'Unknown',
          organization: organizationName,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
        };
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }

    // Fallback nếu không tìm thấy user
    return {
      fullName: 'Unknown',
      userName: 'Unknown',
      organization: '',
      ipAddress: req?.socket?.remoteAddress || 'Unknown',
    };
  }
}
