import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PROCESS_KEY } from './decorator/process-key.decorator';
import { MODULE_KEY } from './decorator/module-key.decorator';
import { IS_PUBLIC_KEY } from './decorator/public.decorator';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { POSITION_LEVEL } from '../variables/CONST_STATUS';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sqlsvRepo: SQLSVRepository,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.user;

    if (!userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
    }

    const moduleKey = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const processKey = this.reflector.getAllAndOverride<string>(PROCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredFeature = moduleKey || processKey;

    if (!requiredFeature) {
      throw new ForbiddenException('Chưa cấu hình module key để kiểm tra quyền tính năng.');
    }

    try {
      const userDetail = await this.sqlsvRepo.getUserById(userId);
      const isAdmin = !!(
        (userDetail?.position && POSITION_LEVEL[userDetail.position] === POSITION_LEVEL.Admin) ||
        (userDetail?.role && userDetail.role.toLowerCase().includes('admin'))
      );

      if (isAdmin) return true;

      const featureCodes = await this.sqlsvRepo.getUserFeatureCodes(userId);
      const normalizedFeatures = this.getFeatureAliases(requiredFeature);
      const hasFeature = featureCodes.some((code) =>
        normalizedFeatures.has(code?.toLowerCase()),
      );

      if (!hasFeature) {
        throw new ForbiddenException(`Bạn không có quyền truy cập module [${requiredFeature}].`);
      }

      request.user.features = featureCodes;
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      console.error('[FeatureGuard Error]', e.message);
      throw new ForbiddenException('Lỗi kiểm tra quyền tính năng: ' + e.message);
    }
  }

  private getFeatureAliases(feature: string): Set<string> {
    const normalized = feature.toLowerCase();
    const aliases = new Set([normalized]);

    if (normalized.endsWith('s')) {
      aliases.add(normalized.slice(0, -1));
    } else {
      aliases.add(`${normalized}s`);
    }

    return aliases;
  }
}
