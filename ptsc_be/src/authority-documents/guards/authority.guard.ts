import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorityDocumentEntity } from '../entities/authority-document.entity';
import { CHECK_AUTHORITY_KEY } from '../decorators/check-authority.decorator';
import { isSuperAdminByKeycloakId } from 'src/utils/super-admin.util';

@Injectable()
export class AuthorityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(AuthorityDocumentEntity, 'mssqlConnection')
    private readonly authorityRepo: Repository<AuthorityDocumentEntity>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy stage từ decorator
    const requiredStage = this.reflector.getAllAndOverride<string>(CHECK_AUTHORITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu không có decorator @CheckAuthority, bỏ qua guard
    if (!requiredStage) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const currentUser = request.user; // Giả sử user đã được authenticate và có trong request.user

    if (!currentUser || !currentUser.userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập');
    }

    // Super Admin bypass - always pass authority check
    if (isSuperAdminByKeycloakId(currentUser.userId)) {
      return true;
    }

    const currentUserId = currentUser.userId;

    // Kiểm tra isAuthority từ query params hoặc body
    const isAuthority = 
      request.query?.isAuthority === 'true' ||
      request.query?.isAuthority === true ||
      request.body?.isAuthority === true ||
      request.body?.isAuthority === 'true' ||
      request.params?.isAuthority === true ||
      request.params?.isAuthority === 'true' || 

      request.query?.authority === 'true' ||
      request.query?.authority === true ||
      request.body?.authority === true ||
      request.body?.authority === 'true' ||
      request.params?.authority === 'true' ||
      request.params?.authority === true ||

      request.query?.isAuthorized === 'true' ||
      request.query?.isAuthorized === true ||
      request.body?.isAuthorized === true ||
      request.body?.isAuthorized === 'true' ||
      request.params?.isAuthorized === true ||
      request.params?.isAuthorized === 'true' ||

      request.query?.authorized === 'true' ||
      request.query?.authorized === true ||
      request.body?.athorized === true ||
      request.body?.authorized === 'true' ||
      request.params?.authorized === 'true' ||
      request.params?.authorized === true;

    // Nếu FE không gửi isAuthority: true, dùng userId mặc định
    if (!isAuthority) {
      request.authorizedUser = null;
      request.originalUser = currentUserId;
      return true;
    }

    // Chỉ query ủy quyền khi isAuthority: true
    try {
      const now = new Date();

      // Stage mapping nếu DB lưu khác decorator
      const stageMap: Record<string, string> = {
        document_approval: '1', // khớp với DB
      };
      const stageForQuery = stageMap[requiredStage] || requiredStage;

      // Lấy ủy quyền active
      const authority = await this.authorityRepo
        .createQueryBuilder('auth')
        .where('auth.authorized = :userId', { userId: currentUserId })
        .andWhere('auth.stage = :stage', { stage: stageForQuery })
        .andWhere('auth.status = :status', { status: '1' }) // active
        .andWhere('(auth.startDate IS NULL OR auth.startDate <= :now)', { now })
        .andWhere('(auth.endDate IS NULL OR auth.endDate >= :now)', { now })
        .orderBy('auth.createdAt', 'DESC')
        .getOne();

      if (!authority || !authority.author) {
        // Có yêu cầu chạy theo cơ chế ủy quyền, nhưng không tìm thấy bản ghi ủy quyền hợp lệ
        throw new ForbiddenException('Bạn không có quyền ủy quyền hợp lệ để thực hiện thao tác này');
      }

      // Có ủy quyền: attach thông tin người ủy quyền vào request
      request.authorizedUser = authority.author; // User được ủy quyền (người có quyền thực sự)
      request.originalUser = currentUserId; // User hiện tại (người được ủy quyền)
      request.authorityDocument = authority; // Toàn bộ thông tin ủy quyền


      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('❌ Lỗi khi check ủy quyền:', error);
      throw new InternalServerErrorException('Lỗi khi kiểm tra ủy quyền');
    }
  }
}

