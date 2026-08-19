import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleFeatureEntity } from '../role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from '../feature-management/feature-management-sql/feature-management.entity';
import { ROLES_KEY } from './decorator/roles.decorator';
import { PROCESS_KEY } from './decorator/process-key.decorator';
import { POSITION_LEVEL, STATUS } from '../variables/CONST_STATUS';
import { UserEntity } from '../users/entities/user.entity';
import { BpmnEngineService } from '../bpmn/bpmn-engine.service';
import { SQLSVRepository } from '../database/sqlsvRepo';

@Injectable()
export class RoleFeatureGuard implements CanActivate {
  private readonly logger = new Logger(RoleFeatureGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepo: Repository<RoleFeatureEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureRepo: Repository<FeatureManagementEntity>,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly sqlsvRepo: SQLSVRepository,
    @Inject('MSSQL_REPO') private readonly sqlRepo: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reflectorRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const reflectorProcessKey = this.reflector.getAllAndOverride<string>(PROCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const userFromToken = request.user;
    const userId = userFromToken?.userId || userFromToken?.user;

    if (!userId) {
      throw new UnauthorizedException('Nguoi dung chua dang nhap hoac token khong hop le');
    }

    const debugTag = `[RoleFeatureGuard] ${request.method} ${request.path} user=${userId}`;

    const userData = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'position', 'role'],
      relations: ['parent'],
    });

    const bypassDisabledProcessKeys = new Set(['QT_MTHC']);
    const isBypassDisabledForProcess =
      !!reflectorProcessKey && bypassDisabledProcessKeys.has(String(reflectorProcessKey).toUpperCase());

    if (userData) {
      const roleLower = (userData.role || '').toLowerCase();
      const isAdmin =
        (userData.position && POSITION_LEVEL[userData.position] === POSITION_LEVEL.Admin) ||
        roleLower.includes('administrator') ||
        roleLower.includes('quan tri') ||
        roleLower.includes('qu?n tr?') ||
        roleLower.includes('admin');

      if (isAdmin) {
        if (isBypassDisabledForProcess) {
        } else {
          return true;
        }
      }
    }

    const autoActionPermissions = this.getDetectedPermissions(request.method, request.path);
    const requiredPermissions = [...new Set([...reflectorRoles, ...autoActionPermissions])];

    const targetPath = request.path.replace(/^\/api\//, '').replace(/^\/+|\/+$/g, '');
    const features = await this.featureRepo.find({
      where: { status: STATUS.ACTIVED },
      select: ['code', 'apiUrl', 'apiUrlChildren', 'processID'],
    });

    let autoProcessKey: string | null = null;
    let featCode: string | null = null;

    for (const feat of features) {
      // Kiểm tra apiUrl hoặc apiUrlChildren
      if ((feat.apiUrl && this.matchUrl(targetPath, feat.apiUrl)) ||
          (feat.apiUrlChildren && this.matchUrl(targetPath, feat.apiUrlChildren))) {
        autoProcessKey = feat.processID;

        // Chỉ gán featCode khi apiUrl có tham số (vd: passports/:id).
        // Tránh trường hợp apiUrl = 'passports' (parent route) match sang
        // các sub-route như /countries, /positions... gây lỗi phân quyền.
        const hasParams = feat.apiUrl?.includes(':');
        if (!hasParams) {
          continue;
        }

        featCode = feat.code;
        break;
      }
    }

    const finalProcessKey = reflectorProcessKey || autoProcessKey;

    if (requiredPermissions.length === 0 && !featCode) {
      return true;
    }

    if (!finalProcessKey) {
      this.logger.warn(`${debugTag} deny: missing process key`);
      throw new ForbiddenException('Khong xac dinh duoc ProcessKey cho request nay');
    }

    const roleFeature = await this.roleFeatureRepo.findOne({
      where: { processKey: finalProcessKey },
    });

    if (!roleFeature || !Array.isArray(roleFeature.roles)) {
      this.logger.warn(`${debugTag} deny: role feature not configured for process=${finalProcessKey}`);
      throw new ForbiddenException(`Quy trinh [${finalProcessKey}] chua duoc cau hinh phan quyen vai tro`);
    }

    const finalRequiredFlags = [...requiredPermissions];
    if (featCode) finalRequiredFlags.push(featCode);


    const bpmnPermissionsMap: Record<string, Record<string, string>> = {};
    const parentId = userData?.parent?.id;

    const bpmnProcessKey = reflectorProcessKey || finalProcessKey;
    if (bpmnProcessKey && parentId) {
      try {
        let flowConfig = await this.sqlsvRepo.getFlowByUnit(String(parentId), bpmnProcessKey as any);

        // Fallback: some units are not mapped in design.unit but the process is active.
        // In this case, use the latest active design by relatedProcesses to load lane flags.
        if (!flowConfig?.id) {
          this.logger.warn(
            `${debugTag} warn: no active bpm flow by unit=${parentId} and relatedProcess=${bpmnProcessKey}, fallback by process only`,
          );
          flowConfig = await this.sqlsvRepo.getFlowByDocType(String(bpmnProcessKey));
        }

        if (!flowConfig?.id) {
          this.logger.warn(
            `${debugTag} warn: no active bpm flow by relatedProcess=${bpmnProcessKey}, fallback by processKey`,
          );
          flowConfig = await this.sqlsvRepo.getFlowByProcess(String(bpmnProcessKey));
        }

        if (flowConfig?.id) {
          const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
          if (bpmnXML) {
            const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
            const { lanes } = this.bpmnEngine.buildIndexes(process);
            for (const lane of lanes) {
              const props = lane.properties || {};
              const keys = [
                lane.role,
                props.candidateGroups,
                props.candidateGroupsCode,
                this.normalizeRoleKey(lane.role),
                this.normalizeRoleKey(props.candidateGroups),
                this.normalizeRoleKey(props.candidateGroupsCode),
              ].filter(Boolean) as string[];

              for (const key of keys) {
                bpmnPermissionsMap[key] = props;
              }
            }
          } else {
            this.logger.warn(`${debugTag} bpm xml not found for flowId=${flowConfig.id}`);
          }
        } else {
          this.logger.warn(
            `${debugTag} warn: no active bpm flow by both unit+process and process-only (relatedProcess=${bpmnProcessKey})`,
          );
        }
      } catch (e: any) {
        this.logger.warn(`${debugTag} warn: cannot load bpmn permissions - ${e?.message || e}`);
      }
    }

    let matchedRoleCode = '';
    let matchedPermissions: string[] = [];
    let matchedLaneDebug = '';

    const hasPermission = roleFeature.roles.some((role: any) => {
      const isUserInRole = Array.isArray(role?.users) && role.users.includes(userId);
      if (!isUserInRole) return false;

      const userPermissions = Array.isArray(role?.permissions) ? role.permissions : [];
      const directLaneKey = role.roleCode;
      const normalizedLaneKey = this.normalizeRoleKey(role.roleCode);
      const mappedLaneKey = bpmnPermissionsMap[directLaneKey]
        ? directLaneKey
        : bpmnPermissionsMap[normalizedLaneKey]
          ? normalizedLaneKey
          : '';
      const bpmnProps = mappedLaneKey ? bpmnPermissionsMap[mappedLaneKey] : {};
      const bpmnFlags = Object.keys(bpmnProps).filter((key) => this.isTruthyPermission(bpmnProps[key]));

      const combinedPermissions = [...new Set([...userPermissions, ...bpmnFlags])];

      const hasFeatureAccess = !featCode || combinedPermissions.includes(featCode);
      if (!hasFeatureAccess) return false;

      const hasActionPermission =
        requiredPermissions.length === 0 ||
        requiredPermissions.some((flag) => combinedPermissions.includes(flag));

      if (hasActionPermission) {
        matchedRoleCode = role.roleCode || '';
        matchedPermissions = combinedPermissions;
        matchedLaneDebug = `laneKey=${mappedLaneKey || 'NO_LANE_MATCH'}, extFlags=[${bpmnFlags.join(', ')}], staticPerms=[${userPermissions.join(', ')}], featCode=${featCode || 'N/A'}, laneHasFeature=${!featCode ? 'N/A' : String(hasFeatureAccess)}`;
      }

      return hasActionPermission;
    });

    if (!hasPermission) {
      const userRoleSnapshots = (roleFeature.roles || [])
        .filter((r: any) => Array.isArray(r?.users) && r.users.includes(userId))
        .map((r: any) => {
          const directLaneKey = r.roleCode;
          const normalizedLaneKey = this.normalizeRoleKey(r.roleCode);
          const mappedLaneKey = bpmnPermissionsMap[directLaneKey]
            ? directLaneKey
            : bpmnPermissionsMap[normalizedLaneKey]
              ? normalizedLaneKey
              : '';
          const bpmnProps = mappedLaneKey ? bpmnPermissionsMap[mappedLaneKey] : {};
          const bpmnFlags = Object.keys(bpmnProps).filter((key) => this.isTruthyPermission(bpmnProps[key]));
          const perms = [...new Set([...(r.permissions || []), ...bpmnFlags])];
          const laneHasFeature = !featCode ? 'N/A' : String(perms.includes(featCode));
          return `${r.roleCode} (laneKey=${mappedLaneKey || 'NO_LANE_MATCH'}, extFlags=[${bpmnFlags.join(', ')}], laneHasFeature=${laneHasFeature}): [${perms.join(', ')}]`;
        });

      this.logger.warn(
        `${debugTag} deny: required=[${finalRequiredFlags.join(', ')}], userRolePerms=${
          userRoleSnapshots.length ? userRoleSnapshots.join(' | ') : 'NO_ROLE_MATCH'
        }`,
      );

      throw new ForbiddenException(
        `Ban khong co quyen thuc hien hanh dong nay. Yeu cau mot trong cac quyen: [${finalRequiredFlags.join(', ')}] cho quy trinh [${finalProcessKey}]`,
      );
    }

    return true;
  }

  private getDetectedPermissions(method: string, path: string): string[] {
    const perms: string[] = [];
    const normalizedPath = path.toLowerCase();

    switch (method.toUpperCase()) {
      case 'GET':
        perms.push('canView');
        break;
      case 'POST':
        perms.push('canCreate');
        break;
      case 'PUT':
      case 'PATCH':
        perms.push('canUpdate');
        break;
      case 'DELETE':
        perms.push('canDelete');
        break;
    }

    if (normalizedPath.endsWith('/approve')) perms.push('canApprove');
    if (normalizedPath.endsWith('/reject')) perms.push('canReject');
    if (normalizedPath.endsWith('/sign')) perms.push('canSign');
    if (normalizedPath.endsWith('/transfer')) perms.push('canTransfer');
    if (normalizedPath.includes('/export') || normalizedPath.includes('/download')) perms.push('canDownload');

    return perms;
  }

  private matchUrl(targetPath: string, apiUrlTemplate: string): boolean {
    const template = apiUrlTemplate.replace(/^\/+|\/+$/g, '');
    if (targetPath === template) return true;

    const regexSource = template
      .split('/')
      .map((part) =>
        part.startsWith(':') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      )
      .join('/');

    const regex = new RegExp(`^${regexSource}$`);
    if (regex.test(targetPath)) return true;

    // Fallback for feature URLs configured at module/base level (e.g. "passports")
    // while request targets item routes like "passports/:id".
    return targetPath.startsWith(`${template}/`);
  }

  private normalizeRoleKey(value?: string): string {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private isTruthyPermission(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  }
}
