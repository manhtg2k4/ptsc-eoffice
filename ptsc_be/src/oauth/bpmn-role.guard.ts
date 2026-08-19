import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Optional, forwardRef } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BpmnEngineService } from '../bpmn/bpmn-engine.service';
import { ROLES_KEY } from './decorator/roles.decorator';
import { PROCESS_KEY } from './decorator/process-key.decorator';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { POSITION_LEVEL } from '../variables/CONST_STATUS';
import { MODULE_KEY } from './decorator/module-key.decorator';
import { PermissionCacheService } from './permission-cache.service';
import { RecordScopeAccessService } from './record-scope-access.service';
import { IS_PUBLIC_KEY } from './decorator/public.decorator';

/**
 * BpmnRoleGuard - Hệ thống phân quyền hợp nhất (Phương án A & B)
 */
@Injectable()
export class BpmnRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => BpmnEngineService))
    private bpmnEngine: BpmnEngineService,
    @Inject(forwardRef(() => SQLSVRepository))
    private sqlsvRepo: SQLSVRepository,
    @Inject('MSSQL_REPO') private readonly sqlRepo: any,
    private permCache: PermissionCacheService,
    @Optional() private readonly recordScopeAccessService?: RecordScopeAccessService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu là API public, cho phép qua luôn
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userFromToken = request.user;
    const userId = userFromToken?.userId;

    if (!userId) {
      throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const processModuleName = this.reflector.getAllAndOverride<string>(PROCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const startGuard = Date.now();
    try {
      // 1. Lấy thông tin User chi tiết
      const tUser = Date.now();
      const userDetail = await this.sqlsvRepo.getUserById(userId);
      console.log(`🔍 [BpmnRoleGuard] Step 1 - getUserById (${userId}): ${Date.now() - tUser}ms`);
      const parentId = userDetail?.parent?.id;

      // Check Admin bypass
      const isAdmin = !!((userDetail?.position && POSITION_LEVEL[userDetail.position] === POSITION_LEVEL.Admin) ||
        (userDetail?.role && (userDetail.role.toLowerCase().includes('admin'))));

      if (isAdmin) {
        console.log(`🔍 [BpmnRoleGuard] Admin bypass: ${Date.now() - startGuard}ms`);
        return true;
      }


      // ==========================================
      // PHƯƠNG ÁN B: CHECK QUYỀN TÍNH NĂNG (FEATURE)
      // ==========================================
      // Lấy danh sách feature của user (đã bao gồm từ group)

      // Kiểm tra tính năng thông qua moduleName hoặc path
      const moduleName = processModuleName || 'News';

      if (moduleName === 'Project') {
        return this.checkProjectAccess(userId, request, isAdmin);
      }
      const tFeatures = Date.now();
      const userFeatures = await this.sqlsvRepo.getUserFeatures(userId);
      console.log(`🔍 [BpmnRoleGuard] Step 2 - getUserFeatures: ${Date.now() - tFeatures}ms`);

      // Tìm feature khớp với moduleName (có thể khớp code hoặc processID)
      const matchedFeature = userFeatures.resProcessId.find(f =>
        f.code?.toLowerCase() === moduleName.toLowerCase() ||
        f.processID?.toLowerCase() === moduleName.toLowerCase()
      );

      if (!matchedFeature) {
        throw new ForbiddenException(`Bạn không có quyền truy cập module [${moduleName}].`);
      }

      // Khi gọi checkBpmnPermissions, ưu tiên dùng code của tính năng
      const bpmnCode = matchedFeature.code || moduleName;

      // ==========================================
      // PHƯƠNG ÁN A: BPMN + RECORD OWNERSHIP
      // ==========================================

      // A2. Load BPMN Config & Permissions (Check quyền tạo/sửa/xóa cụ thể)
      if (requiredPermissions && requiredPermissions.length > 0) {
        if (!parentId) {
          throw new ForbiddenException('Không xác định được đơn vị người dùng để kiểm tra quy trình.');
        }
        const tBpmn = Date.now();
        await this.checkBpmnPermissions(userId, String(parentId), bpmnCode, requiredPermissions, request);
        console.log(`🔍 [BpmnRoleGuard] Step 3 - checkBpmnPermissions: ${Date.now() - tBpmn}ms`);
      }

      // A3. Check Record Ownership (Quyền xem/thao tác trên bản ghi cụ thể)
      const documentId = request.params?.id || request.body?.id || request.query?.id;
      if (documentId && this.recordScopeAccessService) {
        const tRecord = Date.now();
        const hasRecordAccess = await this.recordScopeAccessService.canAccessRecord({
          moduleName: bpmnCode,
          documentId: String(documentId),
          userId: String(userId),
        });
        console.log(`🔍 [BpmnRoleGuard] Step 4 - canAccessRecord: ${Date.now() - tRecord}ms`);

        if (!hasRecordAccess) {
          throw new ForbiddenException('Bạn không có quyền thao tác trên bản ghi này. Bản ghi không thuộc danh sách của bạn.');
        }
      }

      console.log(`🔍 [BpmnRoleGuard] TOTAL execution: ${Date.now() - startGuard}ms (module: ${moduleName})`);
      return true;
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      console.error('[BpmnRoleGuard Error]', e.message);
      throw new ForbiddenException('Lỗi kiểm tra quyền: ' + e.message);
    }
  }

  /**
   * Phương án A: Check quyền BPMN (canCreate, canUpdate...)
   */
  private async checkBpmnPermissions(userId: string, parentId: string, moduleName: string, requiredPermissions: string[], request: any) {
    if (!parentId) throw new ForbiddenException('Không xác định được đơn vị người dùng.');

    const flowConfig = await this.sqlsvRepo.getFlowByUnitWithInheritance(String(parentId), moduleName);
    if (!flowConfig?.id) {
      // Nếu không có flow config, nhưng API yêu cầu quyền -> Mặc định chặn để an toàn
      throw new ForbiddenException(`Không tìm thấy quy trình BPMN cho module [${moduleName}] tại đơn vị của bạn.`);
    }

    let lanes = this.permCache.getLanes(String(flowConfig.id));
    if (!lanes) {
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig.id);
      if (!bpmnXML) throw new ForbiddenException('Không thể tải cấu hình quy trình.');
      const { indexes } = await this.getModelFromXml(bpmnXML);
      lanes = indexes.lanes;
      this.permCache.setLanes(String(flowConfig.id), lanes);
    }

    const userGroups = await this.sqlsvRepo.getDynamicRolesByUserId(userId);
    const userRoles = userGroups.flatMap(g => {
      const rd = typeof g.roles_dynamic === 'string' ? JSON.parse(g.roles_dynamic) : g.roles_dynamic;
      return Array.isArray(rd) ? rd.map(r => r.roleCode) : [];
    });

    let hasPermission = false;
    let activeProps: any = {};

    for (const lane of lanes) {
      if (userRoles.some(r => r?.toLowerCase() === (lane.role || '').toLowerCase())) {
        const props = lane.properties || {};
        activeProps = { ...activeProps, ...props };
        if (requiredPermissions.some(perm => props[perm] === 'true')) {
          hasPermission = true;
        }
      }
    }

    if (request.user) {
      request.user.permissions = {
        canCreate: activeProps['canCreate'] === 'true',
        canUpdate: activeProps['canUpdate'] === 'true',
        canDelete: activeProps['canDelete'] === 'true',
      };
    }

    if (!hasPermission) {
      throw new ForbiddenException(`Bạn không có quyền [${requiredPermissions.join(', ')}] trong quy trình [${moduleName}].`);
    }
  }

  private async checkProjectAccess(userId: string, request: any, isAdmin: boolean): Promise<boolean> {
    const documentId = request.params?.id || request.body?.id || request.query?.id;
    if (!documentId) return true;

    const result = await this.sqlRepo.pool.request()
      .input('id', documentId)
      .input('userId', userId)
      .query(`
        SELECT 1 FROM projects WHERE id = @id AND createdBy = @userId
        UNION ALL
        SELECT 1 FROM project_members WHERE project_id = @id AND user_id = @userId
      `);

    if (!(result.recordset?.length > 0 || isAdmin)) {
      throw new ForbiddenException('Bạn không thuộc dự án này.');
    }
    return true;
  }

  private async getModelFromXml(xmlContent: string) {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes };
  }
}
