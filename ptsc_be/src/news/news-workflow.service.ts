import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { isInRoleList } from 'src/utils/util';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, Brackets, SelectQueryBuilder, IsNull } from 'typeorm';
import { News } from './entities/news.entity';
import { NewsComment } from './entities/news-comment.entity';
import { NewsLike } from './entities/news-like.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { BpmnEngineService } from '../bpmn/bpmn-engine.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { GroupUserService } from '../group-users/group-users.service';
import { MSSQL_REPO } from 'src/database/database.provider';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { SystemSettingLogEntity } from 'src/systemLogManagement/system-setting-log.entity';
import { TopicEntity } from 'src/topic/entities/topic.entity';
import { GroupUserEntity } from '../group-users/entities/group-users.entity';
import { RoleFeatureEntity } from 'src/role-feature/role-feature-sql/role-feature.entity';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { UsersService } from 'src/users/users.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';

type SubmitNewsInput = {
  roleCode: string;
  processKey: string;
  note?: string;
};

type ApproveNewsInput = {
  roleCode: string;
  processKey: string;
  note?: string;
  publishImmediately?: boolean;
};

type RejectNewsInput = {
  roleCode: string;
  processKey: string;
  reason: string;
  note?: string;
};

type CancelNewsInput = {
  roleCode?: string;
  processKey?: string;
  reason: string;
  note?: string;
};

type RecallNewsInput = {
  roleCode?: string;
  processKey?: string;
  reason: string;
  note?: string;
};

function getAllNodeExtensionProperties(node: any): any {
  if (!node?.extensionElements?.values) return {};

  const properties: any = {};
  for (const ext of node.extensionElements.values) {
    if (ext.$children) {
      for (const child of ext.$children) {
        if (child.name && child.value !== undefined) {
          properties[child.name] = child.value;
        }
      }
    }
  }
  return properties;
}

@Injectable()
export class NewsWorkflowService {
  private readonly publishedNewsCacheVersionKey = 'news:public:published:version';
  private readonly publishedNewsCacheTtl = 60 * 1000;
  private bpmnCache = new Map<string, { process: any; indexes: any }>();

  constructor(
    @InjectRepository(News, 'mssqlConnection')
    private readonly newsRepository: Repository<News>,
    @Inject(MSSQL_REPO) private readonly repo: MSSQLRepository,
    @InjectRepository(Audit, 'mssqlConnection')
    private readonly auditRepository: Repository<Audit>,
    @InjectRepository(WorkItemEntity, 'mssqlConnection')
    private readonly workItemRepository: Repository<WorkItemEntity>,
    @InjectRepository(SystemSettingLogEntity, 'mssqlConnection')
    private readonly systemSettingLogRepository: Repository<SystemSettingLogEntity>,
    @InjectRepository(NewsComment, 'mssqlConnection')
    private readonly newsCommentRepository: Repository<NewsComment>,
    @InjectRepository(NewsLike, 'mssqlConnection')
    private readonly newsLikeRepository: Repository<NewsLike>,
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private readonly topicRepository: Repository<TopicEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
    @InjectRepository(RoleFeatureEntity, 'mssqlConnection')
    private readonly roleFeatureRepository: Repository<RoleFeatureEntity>,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepository: Repository<FeatureManagementEntity>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly groupUserService: GroupUserService,
    private readonly filesManagementService: FilesManagementService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepository: Repository<OrganizationUnitEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
  ) { }

  private async getPublishedNewsCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(this.publishedNewsCacheVersionKey);
    const normalizedVersion = Number(version);
    return Number.isFinite(normalizedVersion) && normalizedVersion > 0 ? normalizedVersion : 1;
  }

  private async bumpPublishedNewsCacheVersion(): Promise<void> {
    const currentVersion = await this.getPublishedNewsCacheVersion();
    await this.cacheManager.set(this.publishedNewsCacheVersionKey, currentVersion + 1);
  }

  private isSqlServerDeadlock(error: any): boolean {
    return Number(
      error?.number ??
      error?.driverError?.number ??
      error?.originalError?.number ??
      error?.originalError?.info?.number,
    ) === 1205;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withDeadlockRetry<T>(operation: () => Promise<T>, actionName = 'newsAction', maxAttempts = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isSqlServerDeadlock(error) || attempt === maxAttempts) {
          throw error;
        }

        const backoffMs = 100 * attempt + Math.floor(Math.random() * 75);
        console.warn(`[WARN] SQL Server deadlock on ${actionName}, retrying attempt ${attempt + 1}/${maxAttempts} after ${backoffMs}ms`);
        await this.delay(backoffMs);
      }
    }

    throw lastError;
  }

  private async saveNews(news: News, actionName = 'saveNews'): Promise<News> {
    if (news.isSpecial && news.status === 1) {
      let wasSpecialActive = false;
      if (news.id) {
        try {
          const oldNews = await this.newsRepository.findOne({
            select: ['isSpecial', 'status'],
            where: { id: news.id },
          });
          if (oldNews) {
            wasSpecialActive = oldNews.isSpecial === true && oldNews.status === 1;
          }
        } catch (e) {
          console.warn('Error checking old news status in saveNews:', e.message);
        }
      }

      if (!wasSpecialActive) {
        const count = await this.newsRepository.count({
          where: {
            isSpecial: true,
            status: 1,
            id: news.id ? Not(news.id) : undefined,
          },
        });
        if (count >= 10) {
          throw new BadRequestException('Chỉ cho phép tối đa 10 tin nổi bật (isSpecial) đã xuất bản hoạt động trên hệ thống. Vui lòng gỡ nổi bật ở tin khác trước.');
        }
      }
    }
    return this.withDeadlockRetry(() => this.newsRepository.save(news), actionName);
  }

  private async buildPublishedNewsCacheKey(query: any, userId?: string): Promise<string> {
    const normalizedQuery = Object.keys(query || {})
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = query[key];
        return acc;
      }, {});

    const version = await this.getPublishedNewsCacheVersion();
    return `news:public:published:v${version}:${userId || 'anonymous'}:${JSON.stringify(normalizedQuery)}`;
  }

  /**
   * Lấy danh sách tất cả vai trò của user trong một luồng (workflow) cụ thể
   */
  async getUserRolesInWorkflow(userId: string, processFn: string = 'quan_ly_tin_tuc') {
    try {
      // 1. Lấy processKey từ feature management
      const feature = await this.featureManagementRepository.findOne({
        where: { code: processFn }
      });

      const processKey = feature?.processID || processFn;

      // 2. Lấy cấu hình vai trò từ role_feature theo processKey
      const roleFeature = await this.roleFeatureRepository.findOne({
        where: { processKey }
      });

      if (!roleFeature || !roleFeature.roles) {
        return {
          success: true,
          userId,
          processKey,
          processFn,
          roles: [],
          rolesDetail: []
        };
      }

      // 3. Lọc các vai trò mà user này tham gia
      const rolesDetail = roleFeature.roles
        .filter((r: any) => Array.isArray(r.users) && r.users.includes(userId))
        .map((r: any) => ({
          roleCode: r.roleCode,
          name: r.name,
          // note: r.permissions có thể dùng nếu cần
        }));

      // Loại bỏ trùng lặp (nếu có trong dữ liệu cấu hình)
      const uniqueRoles = Array.from(new Map(rolesDetail.map(item => [item.roleCode, item])).values());

      return {
        success: true,
        userId,
        processKey,
        processFn,
        roles: uniqueRoles.map(r => r.roleCode),
        rolesDetail: uniqueRoles
      };
    } catch (error) {
      console.error('Error getting user roles in workflow:', error);
      throw new BadRequestException('Không thể lấy vai trò người dùng trong luồng: ' + error.message);
    }
  }

  /**
   * Lấy thông tin vai trò của tài khoản trong luồng tin tức (Người soạn tin / Người phê duyệt)
   */
  async getNewsUserRole(userId: string, processFn: string = 'quan_ly_tin_tuc') {
    try {
      const allRoles = new Set<string>();

      // 1. Lấy processKey từ featureManagement
      let processKey = processFn;
      try {
        const feature = await this.featureManagementRepository.findOne({
          where: { code: processFn }
        });
        if (feature?.processID) {
          processKey = feature.processID;
        }
      } catch (e) {}

      // 2. Lấy vai trò từ roleFeature
      try {
        const roleFeatures = await this.roleFeatureRepository.find({
          where: [
            { processKey },
            { processKey: 'quan_ly_tin_tuc' },
            { processKey: 'News' },
          ]
        });

        for (const rf of roleFeatures) {
          if (Array.isArray(rf.roles)) {
            for (const r of rf.roles) {
              if (Array.isArray(r.users) && r.users.includes(userId)) {
                if (r.roleCode) allRoles.add(r.roleCode);
              }
            }
          }
        }
      } catch (e) {}

      // 3. Lấy vai trò từ UserEntity (rolesByProcess)
      try {
        const userRepository = this.dataSource.getRepository(UserEntity);
        const user = await userRepository.findOne({ where: { id: userId } as any });
        if (user && Array.isArray(user.rolesByProcess)) {
          const matchedProcesses = user.rolesByProcess.filter((p: any) =>
            p.processKey === processKey || p.processKey === 'quan_ly_tin_tuc' || p.processKey === 'News'
          );
          for (const p of matchedProcesses) {
            if (Array.isArray(p.roles)) {
              for (const r of p.roles) {
                if (r.roleCode) allRoles.add(r.roleCode);
              }
            }
          }
        }
      } catch (e) {}

      // 4. Lấy vai trò từ GroupUserEntity (roles_dynamic)
      try {
        const userGroups = await this.groupUserRepository
          .createQueryBuilder('g')
          .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
          .where('ugu.user_id = :userId', { userId })
          .andWhere('g.status = 1')
          .getMany();

        for (const g of userGroups) {
          if (Array.isArray(g.roles_dynamic)) {
            for (const r of g.roles_dynamic) {
              if (
                (r.processKey === processKey || r.processKey === 'quan_ly_tin_tuc' || r.processKey === 'News') &&
                r.roleCode
              ) {
                allRoles.add(r.roleCode);
              }
            }
          }
        }
      } catch (e) {}

      const userRoles = Array.from(allRoles);

      const APPROVER_ROLES = ['NGUOI_DUYET_TIN', 'NGUOI_PHE_DUYET', 'PHE_DUYET_TIN', 'ADMIN_NEWS', 'ADMIN', 'CVP', 'TCT'];
      const AUTHOR_ROLES = ['NGUOI_TAO_TIN', 'NGUOI_SOAN_TIN', 'SOAN_TIN', 'NGUOI_TRINH', 'CREATE'];

      const isApprover = userRoles.some(r => APPROVER_ROLES.includes(r));
      const isAuthor = userRoles.some(r => AUTHOR_ROLES.includes(r));

      let role = 'KHONG_CO_VAI_TRO';
      let roleName = 'Chưa có vai trò trong luồng tin tức';

      if (isApprover && isAuthor) {
        role = 'NGUOI_SOAN_TIN_VA_PHE_DUYET';
        roleName = 'Người soạn tin & Phê duyệt';
      } else if (isApprover) {
        role = 'NGUOI_PHE_DUYET';
        roleName = 'Người phê duyệt tin';
      } else if (isAuthor) {
        role = 'NGUOI_SOAN_TIN';
        roleName = 'Người soạn tin';
      }

      return {
        statusCode: 200,
        message: 'Lấy vai trò tài khoản trong luồng tin tức thành công',
        data: {
          userId,
          role,
          roleName,
          isAuthor,
          isApprover,
          userRoles,
          processKey,
          processFn,
        }
      };
    } catch (error) {
      console.error('Error in getNewsUserRole:', error);
      throw new BadRequestException('Không thể lấy vai trò người dùng trong luồng tin tức: ' + error.message);
    }
  }

  /**
   * Kiểm tra quyền xuất bản của user dựa trên processFn và role
   */
  async checkPublishPermission(processFn: string, userId: string) {
    try {
      // 1. Query featureManagement để lấy processID
      const feature = await this.featureManagementRepository.findOne({
        where: { code: processFn }
      });

      if (!feature) {
        throw new NotFoundException(`Không tìm thấy feature với code: ${processFn}`);
      }

      const processKey = feature.processID || processFn;

      // 2. Lấy roles của user từ role_feature
      const roleFeature = await this.roleFeatureRepository.findOne({
        where: { processKey }
      });

      const userRoles = (roleFeature?.roles || [])
        .filter((r: any) => Array.isArray(r.users) && r.users.includes(userId))
        .map((r: any) => r.roleCode);

      // 3. Kiểm tra quyền dựa trên role
      const isApprover = userRoles.some(role =>
        ['NGUOI_DUYET_TIN', 'ADMIN_NEWS'].includes(role)
      );

      const isAuthor = userRoles.some(role =>
        ['NGUOI_TAO_TIN'].includes(role)
      );

      return {
        canPublishDirectly: isApprover,
        requiresApproval: isAuthor && !isApprover,
        userRole: isApprover ? 'NGUOI_DUYET_TIN' : (isAuthor ? 'NGUOI_TAO_TIN' : null),
        userRoles, // Trả về tất cả roles để debug
        processKey,
        processFn,
        featureId: feature.id
      };
    } catch (error) {
      console.error('Error checking publish permission:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Không thể kiểm tra quyền xuất bản: ' + error.message);
    }
  }


  /**
   * Helper function cho TypeORM QueryBuilder để xử lý mảng tham số dài (> 2100)
   * SQL Server có giới hạn tối đa 2100 tham số trong một câu truy vấn (IN clause).
   * Thay vì `.where('column IN (:...ids)', { ids })`, hãy gọi hàm này.
   */
  private createChunkedInClause(qb: SelectQueryBuilder<any>, columnName: string, ids: string[] | number[], chunkSize: number = 500) {
    if (!ids || ids.length === 0) {
      qb.andWhere('1 = 0'); // Empty result
      return;
    }

    // Lọc và format ID thành string literal ('val') an toàn để nhúng trực tiếp.
    // Việc này hoàn toàn tránh lỗi "Too many parameters" (2100 maximum) do quá nhiều tham số bound (:param).
    const safeIds = (ids as any[]).map(id => {
      if (typeof id === 'number') return id;
      // Trích xuất an toàn, thêm dấu nháy và escape nháy đơn để tránh SQL Injection
      return `'${String(id).replace(/'/g, "''")}'`;
    });

    // Chia mảng thành các mảng con
    const chunks: any[][] = [];
    for (let i = 0; i < safeIds.length; i += chunkSize) {
      chunks.push(safeIds.slice(i, i + chunkSize));
    }

    // Tạo AND WHERE bọc tất cả bằng OR. Khác biệt cốt lõi là việc nội suy chuỗi trực tiếp.
    qb.andWhere(new Brackets(sqb => {
      chunks.forEach((chunk, index) => {
        const inClauseBody = chunk.join(',');
        if (index === 0) {
          sqb.where(`${columnName} IN (${inClauseBody})`);
        } else {
          sqb.orWhere(`${columnName} IN (${inClauseBody})`);
        }
      });
    }));
  }

  /**
   * Helper: Normalize query params để hỗ trợ cả filter[key] và key trực tiếp (backward compatibility)
   * Ví dụ: filter[topic]='tech' hoặc topic='tech' đều được
   */
  private normalizeFilterParams(query: any) {
    const { filter, topic, status, type, organizationUnitId, isComment, ...rest } = query;

    // Map startDate/endDate to publishedAt if provided directly
    let publishedAt = filter?.publishedAt;
    if (!publishedAt && (query.startDate || query.endDate)) {
      publishedAt = {
        startDate: query.startDate,
        endDate: query.endDate
      };
    }

    // Ưu tiên filter object, fallback về các fields riêng lẻ
    return {
      ...rest,
      sort: query.sort, // Add sort to normalized query
      q: filter?.q,  // Tìm kiếm tổng quát
      orFields: filter?.orFields,  // Tìm OR theo nhiều fields
      topic: filter?.topic || topic,
      status: filter?.status || status,
      type: filter?.type || type,
      organizationUnitId: filter?.organizationUnitId || organizationUnitId,
      isComment: filter?.isComment !== undefined ? filter.isComment : isComment,  // Hỗ trợ cả filter[isComment] và isComment
      isSpecial: filter?.isSpecial !== undefined ? filter.isSpecial : query.isSpecial,
      isImportant: filter?.isImportant !== undefined ? filter.isImportant : query.isImportant,
      title: filter?.title,
      content: filter?.content,  // Tìm kiếm trong content
      tags: filter?.tags,
      rejectorName: filter?.rejectorName,
      submitterName: filter?.submitterName,
      authorName: filter?.authorName,
      authorDepartment: filter?.authorDepartment,  // Tìm kiếm theo phòng ban của tác giả
      department: filter?.department || filter?.organizationUnitId || organizationUnitId, // Tìm kiếm theo phòng ban người gửi
      reviewerName: filter?.reviewerName,
      recallReason: filter?.recallReason,  // Lý do thu hồi
      recalledByName: filter?.recalledByName,  // Người thu hồi
      submittedAt: filter?.submittedAt,  // { startDate, endDate }
      cancellerName: filter?.cancellerName,
      deadline: filter?.deadline,  // { startDate, endDate }
      createdAt: filter?.createdAt,  // { startDate, endDate
      recalledAt: filter?.recalledAt,
      publishedAt: publishedAt,
      approvedAt: filter?.approvedAt,
      isMyNews: filter?.isMyNews,
      remainingTime: filter?.remainingTime ?? query.remainingTime,
    };
  }

  /**
   * Helper: Tự động convert multiple text filters thành OR logic
   * Nếu có nhiều hơn 1 text filter, tự động dùng OR thay vì AND
   */
  private applyFiltersWithAutoOr(
    queryBuilder: any,
    filters: {
      q?: string;
      orFields?: any;
      search?: string;
      title?: string;
      topic?: string;
      status?: number | string;
      type?: string;
      rejectorName?: string;
      submitterName?: string;
      cancellerName?: string;
      authorName?: string;
      reviewerName?: string;
      recalledByName?: string;
      isComment?: boolean | string | number;
      submittedAt?: { startDate?: string; endDate?: string };
      deadline?: { startDate?: string; endDate?: string };
      createdAt?: { startDate?: string; endDate?: string };
      publishedAt?: { startDate?: string; endDate?: string };
      approvedAt?: { startDate?: string; endDate?: string };
      recalledAt?: { startDate?: string; endDate?: string };
      department?: string | string[];
      remainingTime?: boolean | string;
    }
  ) {
    const { q, orFields, title, submitterName, cancellerName, rejectorName, authorName, reviewerName, recalledByName, department, ...otherFilters } = filters;

    // Tự động convert multiple text filters thành OR logic
    const textFilters = { title, submitterName, cancellerName, rejectorName, authorName, reviewerName, recalledByName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);

    // Nếu có nhiều hơn 1 text filter và chưa có orFields, tự động dùng OR
    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => {
        autoOrFields[field] = value;
      });
      this.applyNewsSearchFilters(queryBuilder, {
        q,
        orFields: autoOrFields,
        ...otherFilters,
        department
      });
    } else {
      // Dùng logic AND như bình thường
      this.applyNewsSearchFilters(queryBuilder, {
        q,
        orFields,
        title,
        submitterName,
        cancellerName,
        rejectorName,
        authorName,
        reviewerName,
        recalledByName,
        department,
        ...otherFilters
      });
    }
  }

  /**
   * Helper: Áp dụng sắp xếp cho QueryBuilder
   * Hỗ trợ 2 định dạng:
   * 1. sort[field] = 1 (ASC) hoặc -1 (DESC) - Ưu tiên
   * 2. sortBy & sortOrder - Fallback cũ
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<News>,
    options: {
      sort?: Record<string, string | number>;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    defaultSort: string = 'createdAt'
  ) {
    const { sort, sortBy, sortOrder = 'DESC' } = options;
    const publishedAtSortAlias = 'newsPublishedAtSort';

    const ensurePublishedAtSortAlias = () => {
      const hasAlias = queryBuilder.expressionMap.selects.some(
        (select) => select.aliasName === publishedAtSortAlias,
      );

      if (!hasAlias) {
        queryBuilder.addSelect(
          'COALESCE(news.publishedAt, news.approvedAt)',
          publishedAtSortAlias,
        );
      }
    };

    let finalSortOrder: 'ASC' | 'DESC' = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    if (sort && typeof sort === 'object' && Object.keys(sort).length > 0 && !Array.isArray(sort)) {
      // Sắp xếp theo object sort[field]
      Object.entries(sort).forEach(([field, value]) => {
        // Tên trường trong entity (TypeORM)
        const order = (value === '1' || value === 1 || String(value).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        if (field === 'publishedAt') {
          ensurePublishedAtSortAlias();
          queryBuilder.addOrderBy(publishedAtSortAlias, order);
        } else {
          queryBuilder.addOrderBy(`news.${field}`, order);
        }
      });
    } else {
      // Fallback về sortBy & sortOrder cũ
      const validSortFields = ['createdAt', 'updatedAt', 'publishedAt', 'viewCount', 'title', 'submittedAt'];
      const sortField = (sortBy && validSortFields.includes(sortBy)) ? sortBy : defaultSort;
      if (sortField === 'publishedAt') {
        ensurePublishedAtSortAlias();
        queryBuilder.orderBy(publishedAtSortAlias, finalSortOrder);
      } else {
        queryBuilder.orderBy(`news.${sortField}`, finalSortOrder);
      }
    }

    // SAFETY CHECK: Ensure ORDER BY exists for SQL Server OFFSET / FETCH NEXT
    if (Object.keys(queryBuilder.expressionMap.orderBys).length === 0) {
      queryBuilder.orderBy(`news.${defaultSort || 'updatedAt'}`, 'DESC');
    }
  }

  /**
   * Helper: Apply các điều kiện tìm kiếm chung cho news entity
   * Tái sử dụng ở tất cả các hàm danh sách
   * 
   * Hỗ trợ 3 loại tìm kiếm:
   * 1. filter[q] - Tìm tổng quát trong TẤT CẢ các trường (OR logic)
   * 2. filter[orFields] - Tìm OR trong các trường được chỉ định với giá trị khác nhau
   * 3. Các filter riêng lẻ - Tìm chính xác từng trường (AND logic)
   */
  private applyNewsSearchFilters(
    queryBuilder: any,
    filters: {
      q?: string;           // Tìm kiếm tổng quát (search all fields with same value)
      orFields?: any;       // Tìm OR theo nhiều fields với giá trị khác nhau
      search?: string;      // Tìm trong content/tags (legacy)
      title?: string;
      content?: string;     // Tìm kiếm riêng trong content
      tags?: string;
      topic?: string;
      status?: number | string;
      type?: string;
      rejectorName?: string;
      submitterName?: string;
      authorName?: string;
      authorDepartment?: string | string[];  // Tìm kiếm theo phòng ban của tác giả (single ID hoặc array)
      department?: string | string[];        // Tìm kiếm theo phòng ban người gửi
      reviewerName?: string;
      cancellerName?: string;
      recalledByName?: string;
      isComment?: boolean | string | number;
      isSpecial?: boolean | string | number;
      isImportant?: boolean | string | number;
      submittedAt?: { startDate?: string; endDate?: string };  // Date range filter
      deadline?: { startDate?: string; endDate?: string } | boolean | string;  // Date range or boolean filter
      createdAt?: { startDate?: string; endDate?: string };  // Date range filter
      publishedAt?: { startDate?: string; endDate?: string };  // Date range filter
      approvedAt?: { startDate?: string; endDate?: string };  // Date range filter
      recalledAt?: { startDate?: string; endDate?: string };  // Date range filter
      remainingTime?: boolean | string;                     // Boolean filter (true: overdue, false: not overdue)
    }
  ): { skipIndividualFilters?: string[] } {
    const { q, orFields, search, title, content, tags, topic, status, isComment, isSpecial, isImportant, type, rejectorName, submitterName, authorName, authorDepartment, department, reviewerName, cancellerName, recalledByName,
      submittedAt, deadline, createdAt, publishedAt, approvedAt, recalledAt, remainingTime } = filters;

    // TỔNG QUÁT: filter[q] - Tìm trong TẤT CẢ các trường với cùng giá trị (OR logic)
    if (q) {
      const isId = typeof q === 'string' && /^[a-f0-9-]{24,36}$/i.test(q);
      const orConditions = [
        'news.title COLLATE Latin1_General_CI_AI LIKE :q',
        'news.content COLLATE Latin1_General_CI_AI LIKE :q',
        'news.tags COLLATE Latin1_General_CI_AI LIKE :q',
        'news.submitterName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.authorName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.rejectorName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.reviewerName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.department COLLATE Latin1_General_CI_AI LIKE :q',
        'news.cancellerName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.recalledByName COLLATE Latin1_General_CI_AI LIKE :q',
        'news.summary COLLATE Latin1_General_CI_AI LIKE :q',
        'news.slug COLLATE Latin1_General_CI_AI LIKE :q'
      ];

      if (isId) {
        orConditions.push('news.submitterId = :qPlain');
        orConditions.push('news.authorId = :qPlain');
        orConditions.push('news.reviewerId = :qPlain');
        orConditions.push('news.rejectorId = :qPlain');
        orConditions.push('news.cancellerId = :qPlain');
        orConditions.push('news.recalledById = :qPlain');
      }

      queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, {
        q: `%${q}%`,
        qPlain: q
      });
      // KHÔNG return ở đây! Phải cho phép kết hợp q với các filter khác
      // Nếu return, các filter như title, submitterName, topic sẽ bị bỏ qua
    }

    // HỖN HỢP OR: filter[orFields] - Tìm OR trong các trường được chỉ định
    // Ví dụ: filter[orFields][title]=abc&filter[orFields][submitterName]=xyz
    // → title LIKE '%abc%' OR submitterName LIKE '%xyz%'
    if (orFields && typeof orFields === 'object' && Object.keys(orFields).length > 0) {
      const orConditions: string[] = [];
      const orParams: any = {};

      // Danh sách các trường text có thể tìm kiếm (không phân biệt dấu)
      const textSearchableFields = [
        'title', 'content', 'tags', 'summary', 'slug', 'recallReason',
        'submitterName', 'authorName', 'rejectorName', 'reviewerName',
        'cancellerName', 'recalledByName', 'department', 'authorDepartment'
      ];

      const fieldMapping: Record<string, string> = {
        'submitterName': 'submitterId',
        'authorName': 'authorId',
        'reviewerName': 'reviewerId',
        'rejectorName': 'rejectorId',
        'cancellerName': 'cancellerId',
        'recalledByName': 'recalledById'
      };

      Object.entries(orFields).forEach(([field, value]) => {
        if (value && textSearchableFields.includes(field)) {
          const paramName = `orField_${field}`;
          // Nếu field có mapping sang ID và giá trị truyền vào là một ID (24-36 ký tự hex)
          if (fieldMapping[field] && typeof value === 'string' && /^[a-f0-9-]{24,36}$/i.test(value)) {
            orConditions.push(`news.${fieldMapping[field]} = :${paramName}`);
            orParams[paramName] = value;
          } else {
            orConditions.push(`news.${field} COLLATE Latin1_General_CI_AI LIKE :${paramName}`);
            orParams[paramName] = `%${value}%`;
          }
        }
      });

      if (orConditions.length > 0) {
        queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
      }

      // Sau khi apply orFields, vẫn có thể kết hợp với các filter khác (topic, date range, status)
      // Không return ở đây để cho phép thêm filter khác
    }

    // Legacy: search trong content/tags
    if (search) {
      queryBuilder.andWhere(
        '(news.title LIKE :search OR news.content LIKE :search OR news.tags LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Chỉ skip nếu orFields có giá trị thực sự (không phải object rỗng)
    const hasOrFieldsValues = orFields && typeof orFields === 'object' && Object.keys(orFields).length > 0;

    // AUTO-DETECT: Nếu nhiều text filters có cùng giá trị → tự động dùng OR
    // Ví dụ: filter[title]=abc&filter[tags]=abc&filter[content]=abc → title OR tags OR content LIKE '%abc%'
    const textFilters = { title, content, tags, submitterName, authorName, rejectorName, reviewerName, cancellerName, recalledByName };
    const filledFilters = Object.entries(textFilters).filter(([_, value]) => value);

    // Kiểm tra nếu có >= 2 filters và tất cả có cùng giá trị
    if (filledFilters.length >= 2 && !hasOrFieldsValues) {
      const values = filledFilters.map(([_, value]) => value);
      const allSameValue = values.every(v => v === values[0]);

      if (allSameValue) {
        // Tất cả filters có cùng giá trị → dùng OR
        const orConditions: string[] = [];
        const orParams: any = {};

        filledFilters.forEach(([field, value]) => {
          const paramName = `autoOr_${field}`;
          orConditions.push(`news.${field} COLLATE Latin1_General_CI_AI LIKE :${paramName}`);
          orParams[paramName] = `%${value}%`;
        });

        const orQuery = `(${orConditions.join(' OR ')})`;

        queryBuilder.andWhere(orQuery, orParams);

        // Skip individual filters (đã xử lý bằng OR rồi)
        return { skipIndividualFilters: filledFilters.map(([field]) => field) };
      }
    }

    // Tìm kiếm title (không phân biệt dấu tiếng Việt)
    if (title && !hasOrFieldsValues) {
      queryBuilder.andWhere('news.title COLLATE Latin1_General_CI_AI LIKE :title', { title: `%${title}%` });
    }

    // Tìm kiếm content (không phân biệt dấu tiếng Việt)
    if (content && !hasOrFieldsValues) {
      queryBuilder.andWhere('news.content COLLATE Latin1_General_CI_AI LIKE :content', { content: `%${content}%` });
    }

    // Tìm kiếm theo authorDepartment (ID hoặc mảng ID của organization)
    if (authorDepartment && !hasOrFieldsValues) {

      let departmentIds: string[] = [];

      // Hỗ trợ nhiều format
      if (Array.isArray(authorDepartment)) {
        // Nếu đã là mảng (filter[authorDepartment][]=id1&filter[authorDepartment][]=id2)
        departmentIds = authorDepartment;
      } else if (typeof authorDepartment === 'string') {
        const trimmed = authorDepartment.trim();

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          // Format: filter[authorDepartment]=[id1,id2] → parse JSON
          try {
            const parsed = JSON.parse(trimmed);
            departmentIds = Array.isArray(parsed) ? parsed : [trimmed];
          } catch {
            // Nếu parse lỗi, coi như single ID
            departmentIds = [trimmed];
          }
        } else if (trimmed.includes(',')) {
          // Format: filter[authorDepartment]=id1,id2,id3 → split by comma
          departmentIds = trimmed.split(',').map(id => id.trim()).filter(Boolean);
        } else {
          // Single ID
          departmentIds = [trimmed];
        }
      }

      // Apply filter
      if (departmentIds.length > 1) {
        queryBuilder.andWhere('news.authorDepartment IN (:...authorDepartments)', {
          authorDepartments: departmentIds
        });
      } else if (departmentIds.length === 1) {
        queryBuilder.andWhere('news.authorDepartment = :authorDepartment', {
          authorDepartment: departmentIds[0]
        });
      }
    }

    // Tìm kiếm theo department (ID hoặc mảng ID của organization)
    if (department && !hasOrFieldsValues) {
      let departmentIds: string[] = [];

      if (Array.isArray(department)) {
        departmentIds = department;
      } else if (typeof department === 'string') {
        const trimmed = department.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            departmentIds = Array.isArray(parsed) ? parsed : [trimmed];
          } catch {
            departmentIds = [trimmed];
          }
        } else if (trimmed.includes(',')) {
          departmentIds = trimmed.split(',').map(id => id.trim()).filter(Boolean);
        } else {
          departmentIds = [trimmed];
        }
      }

      if (departmentIds.length > 0) {
        // Query bảng organization_units để lấy hierarchy hoặc Name-to-ID mapping
        queryBuilder.andWhere(new Brackets((qb) => {
          // Xử lý từng ID/Name
          for (let i = 0; i < departmentIds.length; i++) {
            const val = departmentIds[i];
            const paramName = `deptVal_${i}`;

            if (/^[a-f0-9-]{24,36}$/i.test(val)) {
              // TRƯỜNG HỢP ID: Tìm unit này và các con của nó (so khớp qua cả ID và Name trong news.department)
              qb.orWhere(`EXISTS (
                SELECT 1 FROM organization_units sub_ou 
                WHERE (sub_ou.id = :${paramName} 
                   OR sub_ou.mpath LIKE (SELECT '%' + m_ou.id + '%' FROM organization_units m_ou WHERE m_ou.id = :${paramName}))
                AND (news.department = sub_ou.id OR news.department = sub_ou.name)
              )`, { [paramName]: val });
            } else {
              // TRƯỜNG HỢP TÊN: So khớp trực tiếp tên hoặc qua mapping ID
              qb.orWhere(`(news.department COLLATE Latin1_General_CI_AI LIKE :${paramName} 
                OR news.department IN (
                  SELECT name_ou.id 
                  FROM organization_units name_ou 
                  WHERE name_ou.name COLLATE Latin1_General_CI_AI LIKE :${paramName}
                )
              )`, { [paramName]: `%${val}%` });
            }
          }
        }));
      }
    }

    if (cancellerName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(cancellerName)) {
        queryBuilder.andWhere('news.cancellerId = :cancellerId', { cancellerId: cancellerName });
      } else {
        queryBuilder.andWhere('news.cancellerName COLLATE Latin1_General_CI_AI LIKE :cancellerName', { cancellerName: `%${cancellerName}%` });
      }
    }

    if (recalledByName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(recalledByName)) {
        queryBuilder.andWhere('news.recalledById = :recalledById', { recalledById: recalledByName });
      } else {
        queryBuilder.andWhere('news.recalledByName COLLATE Latin1_General_CI_AI LIKE :recalledByName', { recalledByName: `%${recalledByName}%` });
      }
    }

    // Tìm kiếm tags (không phân biệt dấu tiếng Việt)
    if (tags && !hasOrFieldsValues) {
      queryBuilder.andWhere('news.tags COLLATE Latin1_General_CI_AI LIKE :tags', { tags: `%${tags}%` });
    }

    // Filter theo submitterName (không phân biệt dấu)
    if (submitterName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(submitterName)) {
        queryBuilder.andWhere('news.submitterId = :submitterId', { submitterId: submitterName });
      } else {
        queryBuilder.andWhere('news.submitterName COLLATE Latin1_General_CI_AI LIKE :submitterName', {
          submitterName: `%${submitterName}%`
        });
      }
    }

    // Filter theo rejectorName (không phân biệt dấu)
    if (rejectorName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(rejectorName)) {
        queryBuilder.andWhere('news.rejectorId = :rejectorId', { rejectorId: rejectorName });
      } else {
        queryBuilder.andWhere('news.rejectorName COLLATE Latin1_General_CI_AI LIKE :rejectorName', {
          rejectorName: `%${rejectorName}%`
        });
      }
    }

    // Filter theo authorName (không phân biệt dấu)
    if (authorName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(authorName)) {
        queryBuilder.andWhere('news.authorId = :authorId', { authorId: authorName });
      } else {
        queryBuilder.andWhere('news.authorName COLLATE Latin1_General_CI_AI LIKE :authorName', {
          authorName: `%${authorName}%`
        });
      }
    }

    // Filter theo reviewerName (không phân biệt dấu)
    if (reviewerName && !hasOrFieldsValues) {
      if (/^[a-f0-9-]{24,36}$/i.test(reviewerName)) {
        queryBuilder.andWhere('news.reviewerId = :reviewerId', { reviewerId: reviewerName });
      } else {
        queryBuilder.andWhere('news.reviewerName COLLATE Latin1_General_CI_AI LIKE :reviewerName', {
          reviewerName: `%${reviewerName}%`
        });
      }
    }

    // Filter theo topic
    if (topic) {
      queryBuilder.andWhere('news.topic = :topic', { topic });
    }

    if (isComment !== undefined && isComment !== null) {
      let isCommentValue: number;

      if (typeof isComment === 'boolean') {
        isCommentValue = isComment ? 1 : 0;
      } else if (typeof isComment === 'string') {
        const lower = isComment.toLowerCase().trim();
        isCommentValue = lower === 'true' || lower === '1' ? 1 : 0;
      } else if (typeof isComment === 'number') {
        isCommentValue = isComment ? 1 : 0;
      } else {
        console.warn('[WARN] isComment không hợp lệ:', isComment);
        return queryBuilder;
      }

      queryBuilder.andWhere('news.isComment = :isComment', { isComment: isCommentValue });
    }

    if (isSpecial !== undefined && isSpecial !== null) {
      const isSpecialValue = (isSpecial === true || isSpecial === 'true' || isSpecial === '1' || isSpecial === 1) ? 1 : 0;
      queryBuilder.andWhere('news.isSpecial = :isSpecial', { isSpecial: isSpecialValue });
    }

    if (isImportant !== undefined && isImportant !== null) {
      const isImportantValue = (isImportant === true || isImportant === 'true' || isImportant === '1' || isImportant === 1) ? 1 : 0;
      queryBuilder.andWhere('news.isImportant = :isImportant', { isImportant: isImportantValue });
    }


    // Filter theo status
    if (status !== undefined && status !== null) {
      queryBuilder.andWhere('news.status = :filterStatus', { filterStatus: status });
    }
    // Filter theo type
    // if (type) {
    //   queryBuilder.andWhere('news.type = :type', { type });
    // }

    // Logic đặc biệt cho deadline boolean (còn hạn / quá hạn)
    if (deadline !== undefined && deadline !== null && (deadline === 'true' || deadline === 'false' || deadline === '1' || deadline === '0' || typeof deadline === 'boolean')) {
      const isStillValid = deadline === 'true' || deadline === true || deadline === '1';
      if (isStillValid) {
        queryBuilder.andWhere('news.deadline >= GETDATE()');
      } else {
        queryBuilder.andWhere('news.deadline < GETDATE()');
      }
    }

    // Logic cho remainingTime (true: quá hạn, false: còn hạn)
    if (remainingTime !== undefined && remainingTime !== null) {
      const isOverdue = remainingTime === 'true' || remainingTime === true || remainingTime === '1';
      if (isOverdue) {
        queryBuilder.andWhere('news.deadline >= GETDATE()');
      } else {
        queryBuilder.andWhere('news.deadline < GETDATE()');
      }
    }

    // Filter theo date range: submittedAt
    const dateFilters = [
      { field: 'news.submittedAt', value: submittedAt },
      { field: 'news.deadline', value: typeof deadline === 'object' ? deadline : null }, // Chỉ apply range nếu là object
      { field: 'news.createdAt', value: createdAt },
      { field: 'news.recalledAt', value: recalledAt },
      { field: 'news.publishedAt', value: publishedAt },
      { field: 'news.approvedAt', value: approvedAt },
    ];

    dateFilters.forEach(({ field, value }) => {
      if (!value) return;

      if (value.startDate) {
        queryBuilder.andWhere(
          `${field} >= :${field}_start`,
          { [`${field}_start`]: new Date(value.startDate) }
        );
      }

      if (value.endDate) {
        const endDate = new Date(value.endDate);
        endDate.setDate(endDate.getDate() + 1);

        queryBuilder.andWhere(
          `${field} < :${field}_end`,
          { [`${field}_end`]: endDate }
        );
      }
    });

    // Return empty object if no AUTO OR was applied
    return {};
  }

  /**
   * Tạo tin tại StartEvent -> node kế tiếp, sinh work item và audit (dùng bảng audit hiện có)
   */
  async createNewsAtNode({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
  }): Promise<News> {
    if (!data?.title || !data?.content) {
      throw new BadRequestException('title và content là bắt buộc');
    }

    const authorId = data?.authorId ?? assigneeUserId;
    if (!authorId) {
      throw new BadRequestException('authorId hoặc assigneeUserId là bắt buộc');
    }

    const authorName = data?.authorName ?? 'Unknown';

    // Lấy thông tin phòng ban của tác giả từ userId
    let authorDepartment: string | undefined = undefined;
    try {
      const users: any = await this.repo.getUsersByIds([authorId]);
      const user = users?.[0];
      if (user?.parent) {
        // Lưu ID của organization, khi trả về chi tiết sẽ query name
        authorDepartment = user.parent;
      }
    } catch (error) {
      console.warn(`[WARN] Cannot get user department for authorId ${authorId}:`, error.message);
    }

    const { indexes } = await this.getModelFromXml(bpmnXML);

    // 1. Lấy role của user từ group_users
    let userRole: string | null = null;
    try {
      const userGroups = await this.dataSource
        .getRepository(GroupUserEntity)
        .createQueryBuilder('gu')
        .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
        .where('ugu.user_id = :userId', { userId: authorId })
        .andWhere('gu.status = :status', { status: 1 })
        .select(['gu.roles_dynamic'])
        .getMany();

      for (const group of userGroups) {
        let rolesDynamic = group.roles_dynamic;
        if (typeof rolesDynamic === 'string') {
          try { rolesDynamic = JSON.parse(rolesDynamic); } catch (e) { rolesDynamic = []; }
        }
        if (Array.isArray(rolesDynamic)) {
          const newsRole = rolesDynamic.find((r: any) => r.processKey === 'quan_ly_tin_tuc');
          if (newsRole?.roleCode) {
            userRole = newsRole.roleCode;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error getting user role:', e);
    }


    // 2. Tìm StartEvent trong lane tương ứng với role của user
    let startEvent: any = null;

    if (userRole) {
      // Tìm tất cả nodes trong lane của role
      const nodesInUserLane = Array.from(indexes.laneMap.entries())
        .filter(([_, role]) => role === userRole)
        .map(([nodeId]) => nodeId);

      // Tìm StartEvent trong lane đó
      startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent' && nodesInUserLane.includes(node.id)
      );
    }

    // 3. Fallback: nếu không tìm thấy StartEvent cho role, lấy StartEvent đầu tiên
    if (!startEvent) {
      console.warn(`Không tìm thấy StartEvent cho role ${userRole}, sử dụng StartEvent đầu tiên`);
      startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;
    }

    if (!startEvent) {
      throw new BadRequestException('Không tìm thấy StartEvent trong BPMN');
    }

    const flow = startEvent.outgoing?.[0];
    if (!flow) {
      throw new BadRequestException('StartEvent không có outgoing flow');
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy interactive node sau StartEvent');
    }

    const nodeId = nextNode.id;
    const role = indexes.laneMap.get(nodeId);
    const statusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'DRAFT';

    // Validate topic is valid UUID or null
    let validTopic: string | undefined = undefined;
    if (data.topic) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data.topic)) {
        validTopic = data.topic;
      } else {
        console.warn(`Invalid topic UUID provided: ${data.topic}, setting to undefined`);
      }
    }

    const newsData = {
      title: data.title,
      slug: this.generateSlug(data.title),
      content: data.content,
      nameThumbnail: data.nameThumbnail ?? undefined,
      summary: data.summary ?? undefined,
      isComment: data.isComment ?? false,
      isSpecial: data.isSpecial ?? false,
      isImportant: data.isImportant ?? false,
      topic: validTopic,
      tags: data.tags ?? undefined,
      status: data.status ?? 2,
      publishedAt: data.status === 1 ? new Date() : undefined,
      scheduledPublishAt: data.scheduledPublishAt
        ? new Date(data.scheduledPublishAt)
        : undefined,
      viewCount: data.viewCount ?? 0,
      authorId: String(authorId),
      authorName,
      authorDepartment,
      reviewerId: data.reviewerId ?? undefined,
      reviewerName: data.reviewerName ?? undefined,
      department: data.department ?? undefined,
      submitterId: data.submitterId ?? undefined,
      submitterName: data.submitterName ?? undefined,
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      recalledAt: data.recalledAt ? new Date(data.recalledAt) : undefined,
      recalledById: data.recalledById ?? undefined,
      recalledByName: data.recalledByName ?? undefined,
      recallReason: data.recallReason ?? undefined,
      rejectorId: data.rejectorId ?? undefined,
      rejectorName: data.rejectorName ?? undefined,
      rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : undefined,
      rejectReason: data.rejectReason ?? undefined,
      cancellerId: data.cancellerId ?? undefined,
      cancellerName: data.cancellerName ?? undefined,
      cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
      cancelReason: data.cancelReason ?? undefined,
    };

    // Check if slug already exists
    const existingNews = await this.newsRepository.findOne({
      where: { slug: newsData.slug }
    });
    if (existingNews) {
      throw new BadRequestException('Tin tức với tiêu đề này đã tồn tại');
    }

    const newsEntity = this.newsRepository.create(newsData);

    if (newsEntity.isSpecial && newsEntity.status === 1) {
      const count = await this.newsRepository.count({
        where: {
          isSpecial: true,
          status: 1,
        },
      });
      if (count >= 10) {
        throw new BadRequestException('Chỉ cho phép tối đa 10 tin nổi bật (isSpecial) đã xuất bản hoạt động trên hệ thống. Vui lòng gỡ nổi bật ở tin khác trước.');
      }
    }

    const savedNews = await this.newsRepository.save(newsEntity);

    const workItemId = `wi_${Date.now()}`;
    const workItem: Partial<WorkItemEntity> = {
      id: workItemId,
      documentId: String(savedNews.id),
      nodeId,
      role,
      assigneeUserId: assigneeUserId ?? undefined,
      nodeType: nextNode.$type,
      state: 'open',
      createdAt: new Date(),
      bpmnVersion: flowId || 'quan_ly_tin_tuc',
    };

    await this.addWorkItem(workItem);

    await this.addAudit(
      String(savedNews.id),
      {
        userId: assigneeUserId,
        displayName: authorName,
        role,
        actionCode: 'CREATE',
        fromNodeId: null,
        toNodeId: nodeId,
        details: { ...data, flowId },
        createdBy: assigneeUserId ?? null,
        receiver: assigneeUserId ?? null,
        stageStatus: 'CHUA_XU_LY',
        curStatusCode: statusCode,
        typeDocument: 'NEWS',
      },
    );

    return savedNews;
  }

  /**
   * Tạo tin tức và tự động duyệt (không cần workflow)
   * Được sử dụng khi approveRequired = false
   */
  async createNewsWithAutoApproval({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
  }): Promise<News> {
    if (!data?.title || !data?.content) {
      throw new BadRequestException('title và content là bắt buộc');
    }

    const authorId = data?.authorId ?? assigneeUserId;
    if (!authorId) {
      throw new BadRequestException('authorId hoặc assigneeUserId là bắt buộc');
    }

    const authorName = data?.authorName ?? 'Unknown';

    // Lấy thông tin phòng ban của tác giả từ userId
    let authorDepartment: string | undefined = undefined;
    try {
      const users: any = await this.repo.getUsersByIds([authorId]);
      const user = users?.[0];
      if (user?.parent) {
        // Lưu ID của organization, khi trả về chi tiết sẽ query name
        authorDepartment = user.parent;
      }
    } catch (error) {
      console.warn(`[WARN] Cannot get user department for authorId ${authorId}:`, error.message);
    }

    // Validate topic is valid UUID or null
    let validTopic: string | undefined = undefined;
    if (data.topic) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data.topic)) {
        validTopic = data.topic;
        // Lấy thông tin topic để kiểm tra
        try {
          await this.topicRepository.findOne({
            where: { id: validTopic }
          });
        } catch (error) {
          console.warn(`Topic ID ${validTopic} không tồn tại`);
        }
      } else {
        console.warn(`Invalid topic UUID provided: ${data.topic}, setting to undefined`);
      }
    }

    const newsData = {
      title: data.title,
      slug: this.generateSlug(data.title),
      content: data.content,
      nameThumbnail: data.nameThumbnail ?? undefined,
      summary: data.summary ?? undefined,
      isComment: data.isComment ?? false,
      isSpecial: data.isSpecial ?? false,
      isImportant: data.isImportant ?? false,
      topic: validTopic,
      tags: data.tags ?? undefined,
      status: 1, // Đặt trực tiếp status = 1 (đã duyệt)
      publishedAt: new Date(), // Thời gian công bố = lúc tạo
      scheduledPublishAt: data.scheduledPublishAt
        ? new Date(data.scheduledPublishAt)
        : undefined,
      viewCount: data.viewCount ?? 0,
      authorId: String(authorId),
      authorName,
      authorDepartment,
      department: data.department ?? undefined,
      submitterId: String(authorId), // Người trình duyệt chính là tác giả
      submitterName: authorName,
      submittedAt: new Date(),
      deadline: undefined, // Không có deadline vì tự động duyệt
      approvedAt: new Date(), // Thời gian duyệt = lúc tạo
      reviewerId: String(authorId), // Người duyệt chính là tác giả
      reviewerName: authorName,
    };

    // Check if slug already exists
    const existingNews = await this.newsRepository.findOne({
      where: { slug: newsData.slug }
    });
    if (existingNews) {
      throw new BadRequestException('Tin tức với tiêu đề này đã tồn tại');
    }

    const newsEntity = this.newsRepository.create(newsData);

    if (newsEntity.isSpecial && newsEntity.status === 1) {
      const count = await this.newsRepository.count({
        where: {
          isSpecial: true,
          status: 1,
        },
      });
      if (count >= 10) {
        throw new BadRequestException('Chỉ cho phép tối đa 10 tin nổi bật (isSpecial) đã xuất bản hoạt động trên hệ thống. Vui lòng gỡ nổi bật ở tin khác trước.');
      }
    }

    const savedNews = await this.newsRepository.save(newsEntity);

    // Tạo audit log với action code = DUYET (đã duyệt)
    await this.addAudit(
      String(savedNews.id),
      {
        userId: authorId,
        displayName: authorName,
        role: 'SYSTEM', // Role hệ thống vì tự động
        actionCode: 'DUYET', // Trạng thái đã duyệt
        fromNodeId: null,
        toNodeId: null, // Không có node vì bỏ qua workflow
        details: { ...data, autoApproved: true },
        createdBy: authorId ?? null,
        receiver: authorId ?? null,
        stageStatus: 'DA_XU_LY',
        curStatusCode: 'PUBLISHED',
        typeDocument: 'NEWS',
      },
    );

    return savedNews;
  }
  async createNewsAdvanced({
    bpmnXML,
    data,
    authorId,
    authorName,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    authorId: string;
    authorName: string;
    flowId?: string | null;
  }): Promise<News> {
    return this.createNewsAtNode({
      bpmnXML,
      data: { ...data, authorId, authorName },
      assigneeUserId: authorId,
      flowId,
    });
  }

  //gửi duyêt tin tức
  async submitNews(
    newsId: string,
    dto: SubmitNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id: Number(newsId) } });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    if (String(news.authorId) !== String(userId)) {
      throw new ForbiddenException('Bạn không có quyền trình duyệt tin này');
    }

    if (news.status === 3) {
      throw new BadRequestException('Tin đã bị xóa, không thể trình duyệt');
    }

    // Lấy workItem hiện tại
    const wi = await this.repo.getWorkItem(newsId, workItemId);
    if (!wi) {
      throw new NotFoundException(`Không tìm thấy workItem ${workItemId}`);
    }

    const currentNodeId = wi.nodeId;
    const currentRole = wi.role;

    // Parse BPMN và tìm node tiếp theo
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const currentNode = indexes.nodes.get(currentNodeId);

    if (!currentNode) {
      throw new BadRequestException(`Không tìm thấy node ${currentNodeId} trong BPMN`);
    }

    const flow = currentNode.outgoing?.[0];
    if (!flow) {
      throw new BadRequestException(`Node ${currentNodeId} không có outgoing flow`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy node tiếp theo');
    }

    const nextNodeId = nextNode.id;
    const nextRole = indexes.laneMap.get(nextNodeId);
    const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'PENDING_APPROVAL';
    const effectiveProcessKey = wi.bpmnVersion || dto.processKey;

    // Lấy danh sách user theo role từ nhóm người dùng có roles_dynamic
    const userIds = await this.groupUserService.getUserIdsByRoleDynamic(
      effectiveProcessKey,
      dto.roleCode,
    );

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException(
        `Không tìm thấy người dùng nào có vai trò ${dto.roleCode} trong quy trình ${effectiveProcessKey}`,
      );
    }

    // Lấy cấu hình timeSave từ system_setting_log
    const newsSetting = await this.systemSettingLogRepository.findOne({
      where: { type: 'NEWS' },
      order: { updatedAt: 'DESC' },
    });

    const timeSaveHours = newsSetting?.timeSave ?? 24; // Mặc định 24 giờ nếu không có cấu hình

    // Lấy thông tin phòng ban của người gửi từ parent (id phòng ban)
    const userInfo = await this.dataSource.query(
      `SELECT ou.name as department
       FROM users u
       LEFT JOIN organization_units ou ON u.parent = ou.id
       WHERE u.id = @0`,
      [userId]
    );
    const department = userInfo?.[0]?.department ?? null;

    // Cập nhật tin tức với thông tin người trình và hạn xử lý
    const originalWorkflowState = {
      status: news.status,
      submitterId: news.submitterId,
      submitterName: news.submitterName,
      submittedAt: news.submittedAt,
      department: news.department,
      deadline: news.deadline,
    };
    const openWorkItemIdsBeforeSubmit = (
      await this.workItemRepository.find({
        select: ['id'],
        where: { documentId: String(newsId), state: 'open' },
      })
    )
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
    let createdWorkItemIds: string[] = [];
    const submitStartedAt = new Date();

    try {
      news.status = 1;
      news.submitterId = userId;
      news.submitterName = userName;
      news.submittedAt = new Date();
      news.department = department;

      // Tính deadline = submittedAt + timeSaveHours
      const deadline = new Date(news.submittedAt);
      deadline.setHours(deadline.getHours() + timeSaveHours);
      news.deadline = deadline;

      await this.saveNews(news, 'submitNews.saveNews');

      // Đóng workItem hiện tại
      await this.closeOpenWorkItems(String(newsId), 'completed');

      // Tạo danh sách work item và audit mới để bulk insert
      const workItemsList: any[] = [];
      const auditsList: any[] = [];

      for (const assigneeUserId of userIds) {
        const newWorkItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        workItemsList.push({
          id: newWorkItemId,
          nodeId: nextNodeId,
          role: nextRole ?? dto.roleCode,
          assigneeUserId,
          nodeType: nextNode.$type,
        });

        auditsList.push({
          userId,
          displayName: userName,
          role: currentRole,
          actionCode: 'SUBMIT',
          fromNodeId: currentNodeId,
          toNodeId: nextNodeId,
          details: JSON.stringify({
            note: dto.note,
            roleCode: dto.roleCode,
            processKey: dto.processKey,
          }),
          createdBy: userId,
          receiver: assigneeUserId,
          stageStatus: 'CHUA_XU_LY',
          curStatusCode: nextStatusCode,
          typeDocument: 'NEWS',
        });
      }
      createdWorkItemIds = workItemsList
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));

      // Bulk insert work items
      await this.withDeadlockRetry(
        () => this.repo.addManyWorkItems(String(newsId), workItemsList, undefined, wi.bpmnVersion),
        'addManyWorkItems'
      );

      // Bulk insert audits
      await this.withDeadlockRetry(
        () => this.repo.addManyAudits(String(newsId), auditsList),
        'addManyAudits'
      );
    } catch (error) {
      try {
        if (createdWorkItemIds.length > 0) {
          await this.workItemRepository.delete({ id: In(createdWorkItemIds) });
        }

        if (openWorkItemIdsBeforeSubmit.length > 0) {
          await this.workItemRepository.update(
            { id: In(openWorkItemIdsBeforeSubmit) },
            { state: 'open' },
          );
        }

        await this.auditRepository
          .createQueryBuilder()
          .delete()
          .from(Audit)
          .where('document_id = :documentId', { documentId: String(newsId) })
          .andWhere('type_document = :typeDocument', { typeDocument: 'NEWS' })
          .andWhere('action_code = :actionCode', { actionCode: 'SUBMIT' })
          .andWhere('user_id = :userId', { userId })
          .andWhere('from_node_id = :fromNodeId', { fromNodeId: currentNodeId })
          .andWhere('to_node_id = :toNodeId', { toNodeId: nextNodeId })
          .andWhere('created_at >= :submitStartedAt', { submitStartedAt })
          .execute();

        news.status = originalWorkflowState.status;
        news.submitterId = originalWorkflowState.submitterId;
        news.submitterName = originalWorkflowState.submitterName;
        news.submittedAt = originalWorkflowState.submittedAt;
        news.department = originalWorkflowState.department;
        news.deadline = originalWorkflowState.deadline;

        await this.saveNews(news, 'submitNews.rollbackNews');
      } catch (rollbackError) {
        console.error('[CRITICAL] Failed to rollback news submit state:', rollbackError.message);
      }

      throw error;
    }

    // Gửi thông báo hàng loạt (chạy ngầm, không chờ)
    try {
      const notificationContent = `${userName} đã trình duyệt tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}"`;
      // Chạy ngầm, không await
      this.notificationService.createForRecipients({
        recipientIds: userIds,
        senderId: userId,
        content: notificationContent,
        recordId: String(newsId),
        link: `/news/${newsId}`,
        key: NotificationKey.VIEW_APPROVE,
        type: NotificationType.NEWS_APPROVAL_REQUESTED.value,
        time: new Date(),
        status: 1,
      }).catch(err => console.warn('[WARN] Failed to create notifications for submitNews:', err.message));
    } catch (error) {
      console.warn('[WARN] Failed to create notifications for submitNews:', error.message);
    }

    return news;
  }

  async approveNews(
    newsId: number,
    dto: ApproveNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id: newsId }, relations: ['topicEntity'] });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    if (news.status === 3) {
      throw new BadRequestException('Tin đã bị xóa, không thể duyệt');
    }

    // Lấy workItem hiện tại
    const wi = await this.repo.getWorkItem(String(newsId), workItemId);
    if (!wi) {
      throw new NotFoundException(`Không tìm thấy workItem ${workItemId}`);
    }

    // Sao lưu trạng thái ban đầu của tin tức để rollback khi có lỗi
    const originalWorkflowState = {
      status: news.status,
      publishedAt: news.publishedAt,
      reviewerId: news.reviewerId,
      reviewerName: news.reviewerName,
      approvedAt: news.approvedAt,
    };

    // Kiểm tra role của user trước khi check requiresApproval
    let userRole: string | null = null;
    let isPrivilegedRole = false;

    try {
      const userGroups = await this.dataSource
        .getRepository(GroupUserEntity)
        .createQueryBuilder('gu')
        .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('gu.status = :status', { status: 1 })
        .select(['gu.roles_dynamic'])
        .getMany();

      for (const group of userGroups) {
        let rolesDynamic = group.roles_dynamic;
        if (typeof rolesDynamic === 'string') {
          try { rolesDynamic = JSON.parse(rolesDynamic); } catch (e) { rolesDynamic = []; }
        }
        if (Array.isArray(rolesDynamic)) {
          const newsRole = rolesDynamic.find((r: any) => r.processKey === 'quan_ly_tin_tuc');
          if (newsRole?.roleCode) {
            userRole = newsRole.roleCode;
            if (['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(newsRole.roleCode)) {
              isPrivilegedRole = true;
            }
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Error getting user role for approval:', e);
    }


    // Kiểm tra: Nếu user có role NGUOI_SOAN_THAO và tin tức do admin/người phê duyệt tạo → không có quyền duyệt
    if (userRole === 'NGUOI_TAO_TIN' && news.authorId) {
      let authorRole: string | null = null;
      let isAuthorPrivileged = false;

      try {
        const authorGroups = await this.dataSource
          .getRepository(GroupUserEntity)
          .createQueryBuilder('gu')
          .innerJoin('user_group_users', 'ugu', 'gu.id = ugu.group_user_id')
          .where('ugu.user_id = :authorId', { authorId: news.authorId })
          .andWhere('gu.status = :status', { status: 1 })
          .select(['gu.roles_dynamic'])
          .getMany();

        for (const group of authorGroups) {
          let rolesDynamic = group.roles_dynamic;
          if (typeof rolesDynamic === 'string') {
            try { rolesDynamic = JSON.parse(rolesDynamic); } catch (e) { rolesDynamic = []; }
          }
          if (Array.isArray(rolesDynamic)) {
            const newsRole = rolesDynamic.find((r: any) => r.processKey === 'quan_ly_tin_tuc');
            if (newsRole?.roleCode) {
              authorRole = newsRole.roleCode;
              if (['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(newsRole.roleCode)) {
                isAuthorPrivileged = true;
              }
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Error getting author role for approval check:', e);
      }

      if (isAuthorPrivileged) {
        throw new ForbiddenException(
          'Người soạn thảo không có quyền duyệt văn bản do admin hoặc người phê duyệt tạo'
        );
      }
    }
    let autoApprovedNote = '';
    // Nếu user có role đặc quyền HOẶC topic không yêu cầu duyệt → tự động duyệt
    if (isPrivilegedRole || (news.topicEntity && news.topicEntity.requiresApproval === false)) {
      news.status = 1; // published
      news.publishedAt = new Date();
      news.reviewerId = String(userId);
      news.reviewerName = userName;
      news.approvedAt = new Date();
      autoApprovedNote = isPrivilegedRole ? ' (Hệ thống tự động duyệt do vai trò đặc quyền)' : ' (Hệ thống tự động duyệt do chủ đề không yêu cầu duyệt)';
    }

    const currentNodeId = wi.nodeId;
    const currentRole = wi.role;

    // Parse BPMN và tìm node tiếp theo
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const currentNode = indexes.nodes.get(currentNodeId);

    if (!currentNode) {
      throw new BadRequestException(`Không tìm thấy node ${currentNodeId} trong BPMN`);
    }
    const userIds = await this.groupUserService.getUserIdsByRoleDynamic(
      dto.processKey,
      dto.roleCode,
    );

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException(
        `Không tìm thấy người dùng nào có vai trò ${dto.roleCode} trong quy trình ${dto.processKey}`,
      );
    }
    // Tìm flow với name 'DUYET' hoặc flow đầu tiên
    const flow = currentNode.outgoing?.find((f: any) =>
      f.name?.toUpperCase() === 'DUYET'
    ) || currentNode.outgoing?.[0];

    if (!flow) {
      throw new BadRequestException(`Node ${currentNodeId} không có outgoing flow`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    // Lấy các workItem hiện đang open để rollback trong trường hợp xảy ra lỗi
    const openWorkItemIdsBeforeApprove = (
      await this.workItemRepository.find({
        select: ['id'],
        where: { documentId: String(newsId), state: 'open' },
      })
    )
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));

    const approveStartedAt = new Date();

    if (!nextNode) {
      try {
        // Nếu không có node tiếp theo, coi như hoàn thành workflow
        if (dto.publishImmediately) {
          news.publishedAt = new Date();
        }
        news.reviewerId = String(userId);
        news.reviewerName = userName;
        news.approvedAt = new Date();

        // Đóng workItem hiện tại trước
        await this.closeOpenWorkItems(String(newsId), 'completed');

        await this.addAudit(
          String(newsId),
          {
            userId,
            displayName: userName,
            role: currentRole,
            actionCode: 'DUYET',
            fromNodeId: currentNodeId,
            toNodeId: null,
            details: JSON.stringify({ note: dto.note, publishImmediately: dto.publishImmediately }),
            createdBy: userId,
            receiver: news.authorId,
            stageStatus: 'HOAN_THANH',
            curStatusCode: dto.publishImmediately ? 'PUBLISHED' : 'APPROVED',
            typeDocument: 'NEWS',
          },
        );

        // Lưu trạng thái cập nhật tin tức ở cuối cùng
        await this.saveNews(news, 'approveNews.saveNews.complete');
        await this.bumpPublishedNewsCacheVersion();
      } catch (error) {
        try {
          // Khôi phục lại các workItem cũ
          if (openWorkItemIdsBeforeApprove.length > 0) {
            await this.workItemRepository.update(
              { id: In(openWorkItemIdsBeforeApprove) },
              { state: 'open' },
            );
          }

          // Xóa audit vừa tạo
          await this.auditRepository
            .createQueryBuilder()
            .delete()
            .from(Audit)
            .where('document_id = :documentId', { documentId: String(newsId) })
            .andWhere('type_document = :typeDocument', { typeDocument: 'NEWS' })
            .andWhere('action_code = :actionCode', { actionCode: 'DUYET' })
            .andWhere('user_id = :userId', { userId })
            .andWhere('from_node_id = :fromNodeId', { fromNodeId: currentNodeId })
            .andWhere('created_at >= :approveStartedAt', { approveStartedAt })
            .execute();

          // Rollback trạng thái tin tức trong db về ban đầu
          news.status = originalWorkflowState.status;
          news.publishedAt = originalWorkflowState.publishedAt;
          news.reviewerId = originalWorkflowState.reviewerId;
          news.reviewerName = originalWorkflowState.reviewerName;
          news.approvedAt = originalWorkflowState.approvedAt;

          await this.saveNews(news, 'approveNews.rollbackNews.complete');
        } catch (rollbackError) {
          console.error('[CRITICAL] Failed to rollback news approve completion state:', rollbackError.message);
        }
        throw error;
      }

      return news;
    }

    const nextNodeId = nextNode.id;
    const nextRole = indexes.laneMap.get(nextNodeId);
    const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'APPROVED';

    let createdWorkItemIds: string[] = [];

    try {
      // Cập nhật trạng thái tin - chỉ set publishedAt khi publishImmediately
      if (dto.publishImmediately) {
        news.publishedAt = new Date();
      }
      news.reviewerId = String(userId);
      news.reviewerName = userName;
      news.approvedAt = new Date();

      // Đóng workItem hiện tại
      await this.closeOpenWorkItems(String(newsId), 'completed');

      // Lấy danh sách user theo role từ nhóm người dùng
      const nextUserIds = await this.groupUserService.getUserIdsByRoleDynamic(
        wi.bpmnVersion || dto.processKey,
        nextRole || dto.roleCode,
      );

      if (!nextUserIds || nextUserIds.length === 0) {
        throw new BadRequestException(
          `Không tìm thấy người dùng nào có vai trò ${nextRole} trong quy trình ${wi.bpmnVersion}`,
        );
      }

      // Tạo work item mới cho từng user trong role tiếp theo
      const now = new Date();
      const workItems: Partial<WorkItemEntity>[] = nextUserIds.map((assigneeUserId) => ({
        id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        documentId: String(newsId),
        nodeId: nextNodeId,
        role: nextRole,
        assigneeUserId,
        nodeType: nextNode.$type,
        state: 'open',
        createdAt: now,
        bpmnVersion: wi.bpmnVersion,
      }));

      const audits: Partial<Audit>[] = nextUserIds.map((assigneeUserId) => ({
        documentId: String(newsId),
        userId,
        displayName: userName,
        role: currentRole,
        actionCode: 'DUYET',
        fromNodeId: currentNodeId,
        toNodeId: nextNodeId,
        details: JSON.stringify({ note: dto.note, publishImmediately: dto.publishImmediately }),
        createdBy: userId,
        receiver: assigneeUserId,
        stageStatus: dto.publishImmediately ? 'HOAN_THANH' : 'CHUA_XU_LY',
        curStatusCode: dto.publishImmediately ? 'PUBLISHED' : nextStatusCode,
        typeDocument: 'NEWS',
        createdAt: now,
        updatedAt: now,
      }));

      createdWorkItemIds = workItems.map((item) => item.id).filter((id): id is string => Boolean(id));

      // Bulk insert cả 2 bảng SONG SONG
      await Promise.all([
        this.workItemRepository.insert(workItems),
        this.auditRepository.insert(audits),
      ]);

      // Lưu trạng thái tin tức ở cuối cùng
      await this.saveNews(news, 'approveNews.saveNews');
      await this.bumpPublishedNewsCacheVersion();
    } catch (error) {
      try {
        // Xóa các workItem mới tạo ra
        if (createdWorkItemIds.length > 0) {
          await this.workItemRepository.delete({ id: In(createdWorkItemIds) });
        }

        // Mở lại các workItem cũ
        if (openWorkItemIdsBeforeApprove.length > 0) {
          await this.workItemRepository.update(
            { id: In(openWorkItemIdsBeforeApprove) },
            { state: 'open' },
          );
        }

        // Xóa audit bản ghi phê duyệt
        await this.auditRepository
          .createQueryBuilder()
          .delete()
          .from(Audit)
          .where('document_id = :documentId', { documentId: String(newsId) })
          .andWhere('type_document = :typeDocument', { typeDocument: 'NEWS' })
          .andWhere('action_code = :actionCode', { actionCode: 'DUYET' })
          .andWhere('user_id = :userId', { userId })
          .andWhere('from_node_id = :fromNodeId', { fromNodeId: currentNodeId })
          .andWhere('to_node_id = :toNodeId', { toNodeId: nextNodeId })
          .andWhere('created_at >= :approveStartedAt', { approveStartedAt })
          .execute();

        // Rollback trạng thái tin tức trong db về ban đầu
        news.status = originalWorkflowState.status;
        news.publishedAt = originalWorkflowState.publishedAt;
        news.reviewerId = originalWorkflowState.reviewerId;
        news.reviewerName = originalWorkflowState.reviewerName;
        news.approvedAt = originalWorkflowState.approvedAt;

        await this.saveNews(news, 'approveNews.rollbackNews');
      } catch (rollbackError) {
        console.error('[CRITICAL] Failed to rollback news approve state:', rollbackError.message);
      }
      throw error;
    }

    // Tạo thông báo cho tác giả một lần sau khi phê duyệt xong (KHÔNG AWAIT)
    if (news.authorId && String(news.authorId) !== String(userId)) {
      try {
        const notificationContent = dto.publishImmediately
          ? `${userName} đã phê duyệt và xuất bản tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}"`
          : `${userName} đã phê duyệt tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}"`;

        if (dto.publishImmediately) {
          this.notificationService.create({
            recipientId: String(news.authorId),
            senderId: userId,
            content: notificationContent,
            recordId: String(newsId),
            link: `/news/${newsId}`,
            key: NotificationKey.VIEW_APPROVE,
            type: NotificationType.NEWS_APPROVED.value,
            time: new Date(),
            status: 1,
          }).catch(err => console.warn('[WARN] createNotification:', err.message));
        } else {
          this.notificationService.create({
            recipientId: String(news.authorId),
            senderId: userId,
            content: notificationContent,
            recordId: String(newsId),
            link: `/news/${newsId}`,
            key: NotificationKey.VIEW_NEWS_DXB,
            type: NotificationType.NEWS_APPROVED.value,
            time: new Date(),
            status: 1,
          }).catch(err => console.warn('[WARN] createNotification:', err.message));
        }

      } catch (error) {
        console.warn('[WARN] Failed to create notification for approveNews:', error.message);
      }
    }

    return news;
  }

  async publishNewsDirectly(
    newsId: number,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<News> {
    const news = await this.newsRepository.findOne({
      where: { id: newsId },
      relations: ['topicEntity'],
    });

    if (!news) {
      throw new BadRequestException('Tin tức không tồn tại');
    }

    if (news.status === 1) {
      throw new BadRequestException('Tin tức đã được xuất bản');
    }

    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.workItemRepository.findOne({ where: { id: workItemId } });

    if (!wi) {
      throw new BadRequestException('WorkItem không tồn tại hoặc đã bị xử lý');
    }

    const currentNodeId = wi.nodeId;
    const currentRole = wi.role;
    const currentNode = indexes.nodes.get(currentNodeId);

    // 1. Validate permissions
    let topicRequiresApproval = true;
    if (news.topicEntity) {
      topicRequiresApproval = news.topicEntity.requiresApproval !== false;
    }

    if (currentRole !== 'NGUOI_TAO_TIN' || topicRequiresApproval) {
      throw new BadRequestException('Bạn không có quyền xuất bản trực tiếp tin này (yêu cầu vai trò NGUOI_TAO_TIN và topic không cần duyệt)');
    }

    // 2. Find DUYET_TOPIC flow
    const outgoingFlows = currentNode.outgoing || [];
    const duyetTopicFlow = outgoingFlows.find((f: any) => {
      const flowName = f.name?.toUpperCase();
      if (flowName === 'DUYET_TOPIC') return true;

      const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
      if (extProps?.flags?.includes('TOPICS')) return true;

      return false;
    });

    if (!duyetTopicFlow) {
      throw new BadRequestException('Không tìm thấy luồng DUYET_TOPIC từ node hiện tại');
    }

    // 3. Execute flow and update status
    news.publishedAt = new Date();
    news.status = 1; // PUBLISHED
    news.reviewerId = String(userId);
    news.reviewerName = userName;
    news.approvedAt = new Date(); // Coi như đã duyệt

    await this.saveNews(news, 'publishNewsDirectly.saveNews');
    await this.bumpPublishedNewsCacheVersion();
    await this.closeOpenWorkItems(String(newsId), 'completed');

    // 4. Handle next nodes - Lấy tất cả outgoing flows từ node đích của DUYET_TOPIC
    const targetNodes: any[] = [];

    // Tìm node đích của flow DUYET_TOPIC (dùng nextInteractiveFromFlow)
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(duyetTopicFlow, indexes);

    if (nextNode) {

      // Lấy tất cả outgoing flows từ node này
      const outgoingFlows = indexes.outgoingBySource?.get(nextNode.id) || nextNode.outgoing || [];


      // Với mỗi flow, lấy target và role
      for (const flow of outgoingFlows) {
        if (flow.targetRef) {
          const flowTarget = indexes.nodes.get(flow.targetRef.id);
          if (flowTarget) {
            const role = indexes.laneMap.get(flowTarget.id);

            // Chỉ tạo workItem cho role có quyền thu hồi
            if (role === 'NGUOI_PHE_DUYET' || role === 'ADMIN_NEWS') {
              targetNodes.push({ node: flowTarget, role: role, flow: flow });
            } else {
            }
          }
        }
      }
    }

    if (targetNodes.length > 0) {
      for (const target of targetNodes) {
        const nextNodeId = target.node.id;
        const nextRole = target.role;

        const nextUserIds = await this.groupUserService.getUserIdsByRoleDynamic(
          wi.bpmnVersion || 'quan_ly_tin_tuc',
          nextRole
        );

        if (!nextUserIds || nextUserIds.length === 0) {
          console.warn(`[WARN] Không tìm thấy user cho role ${nextRole}`);
          continue;
        }

        for (const assigneeUserId of nextUserIds) {
          const newWorkItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const workItem: Partial<WorkItemEntity> = {
            id: newWorkItemId,
            documentId: String(newsId),
            nodeId: nextNode.id,
            role: nextRole,
            assigneeUserId,
            nodeType: target.node.$type,
            state: 'open', // Đã hoàn thành
            createdAt: new Date(),
            bpmnVersion: wi.bpmnVersion,
          };
          await this.addWorkItem(workItem);

          await this.addAudit(
            String(newsId),
            {
              userId,
              displayName: userName,
              role: currentRole,
              actionCode: 'DUYET',
              fromNodeId: currentNodeId,
              toNodeId: nextNodeId,
              details: JSON.stringify({
                note: 'Xuất bản trực tiếp (Topic không cần duyệt)',
                autoApprove: true
              }),
              createdBy: userId,
              receiver: assigneeUserId,
              stageStatus: 'HOAN_THANH',
              curStatusCode: 'PUBLISHED',
              typeDocument: 'NEWS',
            },
          );
        }
      }
    }

    return news;
  }

  /**
   * Helper: Lấy workitems theo documentId
   */
  async getWorkItemsByDocumentId(documentId: string): Promise<WorkItemEntity[]> {
    return this.workItemRepository.find({
      where: { documentId, state: 'open' },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Helper: Tự động approve tin tức (dùng khi user có quyền cao hoặc topic không yêu cầu duyệt)
   */
  async autoApproveNews(
    newsId: number,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
    reason: string
  ): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    const wi = await this.repo.getWorkItem(String(newsId), workItemId);
    if (!wi) {
      throw new NotFoundException(`Không tìm thấy workItem ${workItemId}`);
    }

    // Cập nhật trạng thái tin tức
    news.status = 1; // published
    news.publishedAt = new Date();
    news.reviewerId = String(userId);
    news.reviewerName = userName;
    news.approvedAt = new Date();
    await this.saveNews(news, 'autoApproveNews.saveNews');
    await this.bumpPublishedNewsCacheVersion();

    // Đóng workitem
    await this.closeOpenWorkItems(String(newsId), 'completed');

    // Tạo audit log
    await this.addAudit(
      String(newsId),
      {
        userId,
        displayName: userName,
        role: wi.role,
        actionCode: 'DUYET',
        fromNodeId: wi.nodeId,
        toNodeId: null,
        details: JSON.stringify({
          autoApproved: true,
          reason
        }),
        createdBy: userId,
        receiver: news.authorId,
        stageStatus: 'HOAN_THANH',
        curStatusCode: 'PUBLISHED',
        typeDocument: 'NEWS',
      },
    );

    return news;
  }

  async rejectNews(
    newsId: number,
    dto: RejectNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<Partial<News>> {
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    if (news.status === 3) {
      throw new BadRequestException('Tin đã bị xóa, không thể trả lại');
    }

    // Lấy workItem hiện tại
    const wi = await this.repo.getWorkItem(String(newsId), workItemId);
    if (!wi) {
      throw new NotFoundException(`Không tìm thấy workItem ${workItemId}`);
    }

    const currentNodeId = wi.nodeId;
    const currentRole = wi.role;

    // Parse BPMN và tìm node tiếp theo
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const currentNode = indexes.nodes.get(currentNodeId);

    if (!currentNode) {
      throw new BadRequestException(`Không tìm thấy node ${currentNodeId} trong BPMN`);
    }

    // Tìm flow với name 'TRA_LAI' hoặc 'TRA_LAI_TIN'
    const flow = currentNode.outgoing?.find((f: any) => {
      const flowName = f.name?.toUpperCase();
      return flowName === 'TRA_LAI' || flowName === 'TRA_LAI_TIN';
    });

    if (!flow) {
      throw new BadRequestException(`Node ${currentNodeId} không có flow TRA_LAI`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy node tiếp theo');
    }

    const nextNodeId = nextNode.id;
    const nextRole = indexes.laneMap.get(nextNodeId);
    const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? 'REJECTED';

    // Cập nhật thông tin người trả lại (giữ nguyên status = 1)


    // Đóng workItem hiện tại


    // Lấy danh sách user theo role từ nhóm người dùng
    let nextUserIds: string[] = [];
    if (nextRole === 'NGUOI_TAO_TIN' && news.authorId) {
      nextUserIds = [news.authorId];
    } else {
      nextUserIds = await this.groupUserService.getUserIdsByRoleDynamic(
        wi.bpmnVersion || dto.processKey,
        nextRole || dto.roleCode,
      );
    }

    if (!nextUserIds || nextUserIds.length === 0) {
      throw new BadRequestException(
        `Không tìm thấy người dùng nào có vai trò ${nextRole} trong quy trình ${wi.bpmnVersion}`,
      );
    }

    // Tạo work item mới cho từng user trong role tiếp theo
    const originalRejectState = {
      status: news.status,
      rejectorId: news.rejectorId,
      rejectorName: news.rejectorName,
      rejectedAt: news.rejectedAt,
      rejectReason: news.rejectReason,
    };
    const openWorkItemIdsBeforeReject = (
      await this.workItemRepository.find({
        select: ['id'],
        where: { documentId: String(newsId), state: 'open' },
      })
    )
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
    const createdRejectWorkItemIds: string[] = [];
    const rejectStartedAt = new Date();

    try {
      news.rejectorId = userId;
      news.rejectorName = userName;
      news.rejectedAt = new Date();
      news.rejectReason = dto.reason;
      await this.saveNews(news, 'rejectNews.saveNews');

      await this.closeOpenWorkItems(String(newsId), 'completed');

      for (const assigneeUserId of nextUserIds) {
        const newWorkItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const editWorkItem: Partial<WorkItemEntity> = {
          id: newWorkItemId,
          documentId: String(newsId),
          nodeId: nextNodeId,
          role: nextRole,
          assigneeUserId,
          nodeType: nextNode.$type,
          state: 'open',
          createdAt: new Date(),
          bpmnVersion: wi.bpmnVersion,
        };
        createdRejectWorkItemIds.push(newWorkItemId);
        await this.addWorkItem(editWorkItem);

        // Tạo audit cho từng người nhận
        await this.addAudit(
          String(newsId),
          {
            userId,
            displayName: userName,
            role: currentRole,
            actionCode: 'TRA_LAI',
            fromNodeId: currentNodeId,
            toNodeId: nextNodeId,
            details: JSON.stringify({ note: dto.note, reason: dto.reason }),
            createdBy: userId,
            receiver: assigneeUserId,
            stageStatus: 'CHUA_XU_LY',
            curStatusCode: nextStatusCode,
            typeDocument: 'NEWS',
          },
        );

        // Tạo thông báo cho tác giả
        if (assigneeUserId) {
          try {
            const notificationContent = `${userName} đã trả lại tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}". Lý do: ${dto.reason?.substring(0, 100)}${dto.reason && dto.reason.length > 100 ? '...' : ''}`;

            await this.notificationService.create({
              recipientId: assigneeUserId,
              senderId: userId,
              content: notificationContent,
              recordId: String(newsId),
              link: `/news/${newsId}`,
              key: NotificationKey.VIEW_NEWS_REJECT,
              type: NotificationType.NEWS_RETURNED.value,
              time: new Date(),
              status: 1,
            });
          } catch (error) {
            console.warn('[WARN] Failed to create notification for rejectNews:', error.message);
          }
        }
      }

    } catch (error) {
      try {
        if (createdRejectWorkItemIds.length > 0) {
          await this.workItemRepository.delete({ id: In(createdRejectWorkItemIds) });
        }

        if (openWorkItemIdsBeforeReject.length > 0) {
          await this.workItemRepository.update(
            { id: In(openWorkItemIdsBeforeReject) },
            { state: 'open' },
          );
        }

        await this.auditRepository
          .createQueryBuilder()
          .delete()
          .from(Audit)
          .where('document_id = :documentId', { documentId: String(newsId) })
          .andWhere('type_document = :typeDocument', { typeDocument: 'NEWS' })
          .andWhere('action_code = :actionCode', { actionCode: 'TRA_LAI' })
          .andWhere('user_id = :userId', { userId })
          .andWhere('from_node_id = :fromNodeId', { fromNodeId: currentNodeId })
          .andWhere('to_node_id = :toNodeId', { toNodeId: nextNodeId })
          .andWhere('created_at >= :rejectStartedAt', { rejectStartedAt })
          .execute();

        news.status = originalRejectState.status;
        news.rejectorId = originalRejectState.rejectorId;
        news.rejectorName = originalRejectState.rejectorName;
        news.rejectedAt = originalRejectState.rejectedAt;
        news.rejectReason = originalRejectState.rejectReason;

        await this.saveNews(news, 'rejectNews.rollbackNews');
      } catch (rollbackError) {
        console.error('[CRITICAL] Failed to rollback news reject state:', rollbackError.message);
      }

      throw error;
    }

    return {
      id: news.id,
      title: news.title,
      status: news.status,
      rejectorId: news.rejectorId,
      rejectorName: news.rejectorName,
      rejectedAt: news.rejectedAt,
      rejectReason: news.rejectReason,
      updatedAt: news.updatedAt,
    };
  }

  async cancelNews(
    newsId: number,
    dto: CancelNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    // Lấy workItem hiện tại
    const wi = await this.repo.getWorkItem(String(newsId), workItemId);
    if (!wi) {
      throw new NotFoundException(`Không tìm thấy hành động của tin tức này trong quy trình hiện tại!`);
    }

    const currentNodeId = wi.nodeId;
    const currentRole = wi.role;

    // Parse BPMN và tìm node tiếp theo
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const currentNode = indexes.nodes.get(currentNodeId);

    if (!currentNode) {
      throw new BadRequestException(`Không tìm thấy node ${currentNodeId} trong BPMN`);
    }

    // Tìm flow với name 'HUY_TIN'
    const flow = currentNode.outgoing?.find((f: any) =>
      f.name?.toUpperCase() === 'HUY_TIN'
    );

    if (!flow) {
      throw new BadRequestException(`Node ${currentNodeId} không có flow HUY_TIN`);
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
    const nextNodeId = nextNode?.id || null;

    // Cập nhật trạng thái tin và thông tin người hủy
    const originalStatus = news.status;
    const originalCancellerId = news.cancellerId;
    const originalCancellerName = news.cancellerName;
    const originalCancelledAt = news.cancelledAt;
    const originalCancelReason = news.cancelReason;
    const openWorkItemIdsBeforeCancel = (
      await this.workItemRepository.find({
        select: ['id'],
        where: { documentId: String(newsId), state: 'open' },
      })
    )
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));
    const createdCancelWorkItemIds: string[] = [];
    const cancelStartedAt = new Date();

    try {
      news.status = 3;
      news.cancellerId = userId;
      news.cancellerName = userName;
      news.cancelledAt = new Date();
      news.cancelReason = dto.reason;
      await this.saveNews(news, 'cancelNews.saveNews');
      await this.bumpPublishedNewsCacheVersion();

      // Đóng tất cả workItem
      await this.closeOpenWorkItems(String(newsId), 'cancelled');

      // Nếu có nextNode, tạo work items cho users trong role tiếp theo
      if (nextNode && dto.roleCode && dto.processKey) {
        const nextRole = indexes.laneMap.get(nextNodeId);
        let nextUserIds: string[] = [];
        if (nextRole === 'NGUOI_TAO_TIN' && news.authorId) {
          nextUserIds = [news.authorId];
        } else {
          nextUserIds = await this.groupUserService.getUserIdsByRoleDynamic(
            wi.bpmnVersion || dto.processKey,
            nextRole || dto.roleCode,
          );
        }

        if (nextUserIds && nextUserIds.length > 0) {
          for (const assigneeUserId of nextUserIds) {
            const newWorkItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const workItem: Partial<WorkItemEntity> = {
              id: newWorkItemId,
              documentId: String(newsId),
              nodeId: nextNodeId,
              role: nextRole,
              assigneeUserId,
              nodeType: nextNode.$type,
              state: 'open',
              createdAt: new Date(),
              bpmnVersion: wi.bpmnVersion,
            };
            createdCancelWorkItemIds.push(newWorkItemId);
            await this.addWorkItem(workItem);

            // Tạo audit cho từng người nhận
            await this.addAudit(
              String(newsId),
              {
                userId,
                displayName: userName,
                role: currentRole,
                actionCode: 'HUY_TIN',
                fromNodeId: currentNodeId,
                toNodeId: nextNodeId,
                details: JSON.stringify({ note: dto.note, reason: dto.reason }),
                createdBy: userId,
                receiver: assigneeUserId,
                stageStatus: 'DA_HUY',
                curStatusCode: 'CANCELLED',
                typeDocument: 'NEWS',
              },
            );

            // Tạo thông báo cho người nhận
            try {
              const notificationContent = `${userName} đã hủy tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}". Lý do: ${dto.reason?.substring(0, 100)}${dto.reason && dto.reason.length > 100 ? '...' : ''}`;
              await this.notificationService.create({
                recipientId: assigneeUserId,
                senderId: userId,
                content: notificationContent,
                recordId: String(newsId),
                link: `/news/${newsId}`,
                key: NotificationKey.VIEW_NEWS_CANCELLED,
                type: NotificationType.NEWS_CANCELED.value,
                time: new Date(),
                status: 1,
              });
            } catch (error) {
              console.warn('[WARN] Failed to create notification for cancelNews:', error.message);
            }
          }
        }
      } else {
        // Nếu không có nextNode, chỉ tạo 1 audit cho tác giả
        await this.addAudit(
          String(newsId),
          {
            userId,
            displayName: userName,
            role: currentRole,
            actionCode: 'HUY_TIN',
            fromNodeId: currentNodeId,
            toNodeId: nextNodeId,
            details: JSON.stringify({ note: dto.note, reason: dto.reason }),
            createdBy: userId,
            receiver: news.authorId,
            stageStatus: 'DA_HUY',
            curStatusCode: 'CANCELLED',
            typeDocument: 'NEWS',
          },
        );

        // Tạo thông báo cho tác giả
        if (news.authorId && String(news.authorId) !== String(userId)) {
          try {
            const notificationContent = `${userName} đã hủy tin tức "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}". Lý do: ${dto.reason?.substring(0, 100)}${dto.reason && dto.reason.length > 100 ? '...' : ''}`;
            await this.notificationService.create({
              recipientId: String(news.authorId),
              senderId: userId,
              content: notificationContent,
              recordId: String(newsId),
              link: `/news/${newsId}`,
              key: NotificationKey.VIEW_NEWS_CANCELLED,
              type: NotificationType.NEWS_CANCELED.value,
              time: new Date(),
              status: 1,
            });
          } catch (error) {
            console.warn('[WARN] Failed to create notification for cancelNews (author):', error.message);
          }
        }
      }
    } catch (error) {
      try {
        if (createdCancelWorkItemIds.length > 0) {
          await this.workItemRepository.delete({ id: In(createdCancelWorkItemIds) });
        }

        if (openWorkItemIdsBeforeCancel.length > 0) {
          await this.workItemRepository.update(
            { id: In(openWorkItemIdsBeforeCancel) },
            { state: 'open' },
          );
        }

        await this.auditRepository
          .createQueryBuilder()
          .delete()
          .from(Audit)
          .where('document_id = :documentId', { documentId: String(newsId) })
          .andWhere('type_document = :typeDocument', { typeDocument: 'NEWS' })
          .andWhere('action_code = :actionCode', { actionCode: 'HUY_TIN' })
          .andWhere('user_id = :userId', { userId })
          .andWhere('from_node_id = :fromNodeId', { fromNodeId: currentNodeId })
          .andWhere('created_at >= :cancelStartedAt', { cancelStartedAt })
          .execute();
      } catch (rollbackSideEffectError) {
        console.error('[CRITICAL] Failed to rollback cancel workflow side effects:', rollbackSideEffectError.message);
      }

      news.status = originalStatus;
      news.cancellerId = originalCancellerId;
      news.cancellerName = originalCancellerName;
      news.cancelledAt = originalCancelledAt;
      news.cancelReason = originalCancelReason;
      await this.saveNews(news, 'cancelNews.rollbackNews').catch((e) => {
        console.error('[CRITICAL] Failed to rollback news status after cancel error:', e.message);
      });
      throw error;
    }

    return news;
  }

  async recallNews(
    newsId: number,
    dto: RecallNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemId: string,
  ): Promise<News> {
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) {
      throw new NotFoundException('Không tìm thấy tin tức');
    }

    if (news.status !== 1) {
      throw new BadRequestException('Chỉ thu hồi được tin đã xuất bản');
    }

    // Kiểm tra user có quyền thu hồi (phải có work item của tin này)
    const userWorkItems = await this.workItemRepository.find({
      where: {
        documentId: String(newsId),
        assigneeUserId: userId
      }
    });

    if (!userWorkItems || userWorkItems.length === 0) {
      throw new ForbiddenException('Bạn không có quyền thu hồi tin này. Chỉ những người trong nhóm phê duyệt mới được thu hồi.');
    }

    // Lấy workItem hiện tại (nếu có)
    const wi = await this.repo.getWorkItem(String(newsId), workItemId);
    if (!wi) {
      throw new NotFoundException(`Tin tức hiện tại không còn hành động trong quy trình`);
    }
    const currentNodeId = wi?.nodeId || 'Published';
    const currentRole = wi?.role || 'NGUOI_TAO_TIN';

    // Parse BPMN và tìm node tiếp theo
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // Tìm node hiện tại trong BPMN (nếu không có wi thì tìm node Published)
    let currentNode = wi ? indexes.nodes.get(currentNodeId) : null;

    // Nếu không tìm thấy node hiện tại, tìm node có name chứa PUBLISH
    if (!currentNode) {
      const publishNodes = Array.from(indexes.nodes.values()).filter(
        (node: any) => {
          const nodeName = node.name?.toUpperCase() || '';
          return nodeName.includes('PUBLISH') || nodeName.includes('XUAT_BAN') || nodeName.includes('XUẤT BẢN');
        }
      );
      currentNode = publishNodes.length > 0 ? publishNodes[0] : null;
    }

    // Tìm flow với name 'THU_HOI' hoặc 'RECALL'
    let flow = null;
    let nextNode: any = null;
    let toNodeId: string | null = null;

    if (currentNode) {
      flow = currentNode.outgoing?.find((f: any) => {
        const flowName = f.name?.toUpperCase();
        return flowName === 'THU_HOI' || flowName === 'RECALL';
      });

      if (flow) {
        const result = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
        nextNode = result.node;
        toNodeId = nextNode?.id || null;
      }
    }

    // Nếu không tìm thấy flow THU_HOI, tìm node đầu tiên (Edit)
    if (!nextNode) {
      const editNodes = Array.from(indexes.nodes.values()).filter(
        (node: any) => {
          const nodeName = node.name?.toUpperCase() || '';
          return nodeName.includes('EDIT') || nodeName.includes('CHINH_SUA') || nodeName.includes('CHỈNH SỬA') || node.$type === 'bpmn:UserTask';
        }
      );

      if (editNodes.length > 0) {
        nextNode = editNodes[0] as any;
        toNodeId = nextNode?.id || null;
      }
    }

    // Cập nhật trạng thái tin về draft (status = 0) và thông tin thu hồi
    const originalStatus = news.status;
    const originalRecalledAt = news.recalledAt;
    const originalRecalledById = news.recalledById;
    const originalRecalledByName = news.recalledByName;
    const originalRecallReason = news.recallReason;
    const originalPublishedAt = news.publishedAt;
    const originalApprovedAt = news.approvedAt;

    try {
      news.status = 0;
      news.recalledAt = new Date();
      news.recalledById = userId;
      news.recalledByName = userName;
      news.recallReason = dto.reason;
      news.publishedAt = null as any;
      news.approvedAt = null as any;
      await this.saveNews(news, 'recallNews.saveNews');
      await this.bumpPublishedNewsCacheVersion();

      // Đóng tất cả work items cũ
      await this.closeOpenWorkItems(String(newsId), 'completed');

      // Nếu có nextNode, tạo work item mới
      if (nextNode && toNodeId) {
        const nextRole = indexes.laneMap.get(toNodeId) || 'NGUOI_TAO_TIN';

        let userIdsToAssign: string[] = [];
        //khi thu hồi chỉ gửi cho tác giả thôi nhóm người dùng rất nhiều không cần
        // if (nextRole === 'NGUOI_TAO_TIN' && news.authorId) {
        //   userIdsToAssign = [news.authorId];
        // } else {
        //   // Lấy danh sách user theo role từ nhóm người dùng
        //   const nextUserIds = await this.groupUserService.getUserIdsByRoleDynamic(
        //     wi?.bpmnVersion || dto.processKey || 'quan_ly_tin_tuc',
        //     nextRole || dto.roleCode,
        //   );
        //   // Nếu không tìm thấy user theo role, fallback về tác giả
        //   userIdsToAssign = (nextUserIds && nextUserIds.length > 0) ? nextUserIds : [news.authorId];
        // }

        const mergedUserIds = [...(userIdsToAssign || [])];

        //Mặc định gửi cho cả tác giả
        if (news.authorId) {
          mergedUserIds.push(news.authorId);
        }
        userIdsToAssign = Array.from(new Set(mergedUserIds.filter(Boolean)));

        // Tạo work item mới cho từng user trong role
        for (const assigneeUserId of userIdsToAssign) {
          const newWorkItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const workItem: Partial<WorkItemEntity> = {
            id: newWorkItemId,
            documentId: String(newsId),
            nodeId: toNodeId,
            role: nextRole,
            assigneeUserId,
            nodeType: nextNode.$type,
            state: 'completed',
            createdAt: new Date(),
            bpmnVersion: wi?.bpmnVersion || 'quan_ly_tin_tuc',
          };

          await this.addWorkItem(workItem);

          // Tạo audit cho từng người nhận
          await this.addAudit(
            String(newsId),
            {
              userId,
              displayName: userName,
              role: currentRole,
              actionCode: 'RECALL',
              fromNodeId: currentNodeId,
              toNodeId,
              details: JSON.stringify({ note: dto.note, reason: dto.reason }),
              createdBy: userId,
              receiver: assigneeUserId,
              stageStatus: 'THU_HOI',
              curStatusCode: 'RECALLED',
              typeDocument: 'NEWS',
            },
          );

          // Tạo thông báo cho người nhận
          try {
            const notificationContent = `${userName} đã thu hồi tin tức "đã xuất bản" "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}". Lý do: ${dto.reason?.substring(0, 100)}${dto.reason && dto.reason.length > 100 ? '...' : ''}`;
            this.notificationService.create({
              recipientId: assigneeUserId,
              senderId: userId,
              content: notificationContent,
              recordId: String(newsId),
              link: `/news/${newsId}`,
              key: NotificationKey.VIEW_RECALL,
              type: NotificationType.NEWS_RECALLED.value,
              time: new Date(),
              status: 1,
            });
          } catch (error) {
            console.warn('[WARN] Failed to create notification for recallNews:', error.message);
          }
        }
      } else {
        // Nếu không có nextNode, chỉ tạo audit
        await this.addAudit(
          String(newsId),
          {
            userId,
            displayName: userName,
            role: currentRole,
            actionCode: 'RECALL',
            fromNodeId: currentNodeId,
            toNodeId: null,
            details: JSON.stringify({ note: dto.note, reason: dto.reason }),
            createdBy: userId,
            receiver: news.authorId,
            stageStatus: 'THU_HOI',
            curStatusCode: 'RECALLED',
            typeDocument: 'NEWS',
          },
        );

        // Tạo thông báo cho tác giả
        if (news.authorId && String(news.authorId) !== String(userId)) {
          try {
            const notificationContent = `${userName} đã thu hồi tin tức "đã xuất bản" "${news.title?.substring(0, 50)}${news.title && news.title.length > 50 ? '...' : ''}". Lý do: ${dto.reason?.substring(0, 100)}${dto.reason && dto.reason.length > 100 ? '...' : ''}`;
            this.notificationService.create({
              recipientId: String(news.authorId),
              senderId: userId,
              content: notificationContent,
              recordId: String(newsId),
              link: `/news/${newsId}`,
              key: NotificationKey.VIEW_RECALL,
              type: NotificationType.NEWS_RECALLED.value,
              time: new Date(),
              status: 1,
            });
          } catch (error) {
            console.warn('[WARN] Failed to create notification for recallNews (author):', error.message);
          }
        }
      }
    } catch (error) {
      // Rollback database state of news entity
      news.status = originalStatus;
      news.recalledAt = originalRecalledAt;
      news.recalledById = originalRecalledById;
      news.recalledByName = originalRecalledByName;
      news.recallReason = originalRecallReason;
      news.publishedAt = originalPublishedAt;
      news.approvedAt = originalApprovedAt;
      await this.saveNews(news, 'recallNews.rollbackNews').catch((e) => {
        console.error('[CRITICAL] Failed to rollback news status after recall error:', e.message);
      });
      throw error;
    }

    return news;
  }

  async getAuditLog(newsId: number) {
    return this.auditRepository.find({
      where: { documentId: String(newsId) },
      order: { createdAt: 'DESC' },
    });
  }

  async getWorkItems(newsId: number) {
    return this.workItemRepository.find({
      where: { documentId: String(newsId) },
      order: { createdAt: 'DESC' },
    });
  }

  private async addWorkItem(workItem: Partial<WorkItemEntity>) {
    await this.withDeadlockRetry(
      () => this.workItemRepository.save(workItem),
      'addWorkItem',
    );
  }

  private async addAudit(
    documentId: string,
    payload: Partial<Audit>,
  ) {
    const detailsValue =
      payload.details && typeof payload.details !== 'string'
        ? JSON.stringify(payload.details)
        : (payload.details as any);

    const audit: Partial<Audit> = {
      documentId,
      userId: payload.userId ?? null,
      displayName: payload.displayName ?? null,
      role: payload.role ?? null,
      actionCode: payload.actionCode ?? null,
      fromNodeId: payload.fromNodeId ?? null,
      toNodeId: payload.toNodeId ?? null,
      details: detailsValue ?? null,
      originId: payload.originId ?? null,
      createdBy: payload.createdBy ?? null,
      receiver: payload.receiver ?? null,
      receiverUnit: payload.receiverUnit ?? null,
      groupField: payload.groupField ?? null,
      roleProcess: payload.roleProcess ?? payload.role ?? null,
      action: payload.action ?? null,
      deadline: payload.deadline ?? null,
      stageStatus: payload.stageStatus ?? null,
      curStatusCode: payload.curStatusCode ?? null,
      typeDocument: payload.typeDocument ?? 'NEWS',
      processedBy: payload.processedBy ?? null,
      actingAs: payload.actingAs ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.withDeadlockRetry(
      () => this.auditRepository.save(audit),
      'addAudit',
    );
  }

  private async closeOpenWorkItems(
    documentId: string,
    state: 'completed' | 'cancelled',
  ) {
    await this.withDeadlockRetry(
      () => this.dataSource.query(
        `UPDATE work_items 
         SET state = @0 
         WHERE document_id = CAST(@1 AS VARCHAR(64)) AND state = 'open'`,
        [state, documentId]
      ),
      'closeOpenWorkItems',
    );
  }

  private async getModelFromXml(xmlContent: string): Promise<any> {
    if (this.bpmnCache.has(xmlContent)) {
      return this.bpmnCache.get(xmlContent);
    }
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    const result = { process, indexes };
    this.bpmnCache.set(xmlContent, result);
    return result;
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíĩỉị]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/[đ]/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 200);
    const date = new Date();
    const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;

    return `${baseSlug}-${formattedDate}`;
  }

  /**
   * Format date thành dd/mm/yyyy
   */
  private formatDate(date: Date | null | undefined): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Format tất cả các trường date trong news item
   */
  private formatNewsDateFields(news: any): any {
    return {
      ...news,
      publishedAt: this.formatDate(news.publishedAt),
      scheduledPublishAt: this.formatDate(news.scheduledPublishAt),
      submittedAt: this.formatDate(news.submittedAt),
      deadline: this.formatDate(news.deadline),
      recalledAt: this.formatDate(news.recalledAt),
      rejectedAt: this.formatDate(news.rejectedAt),
      cancelledAt: this.formatDate(news.cancelledAt),
      approvedAt: this.formatDate(news.approvedAt),
      createdAt: this.formatDate(news.createdAt),
      updatedAt: this.formatDate(news.updatedAt),
    };
  }

  /**
   * Tính toán thông tin deadline (hạn xử lý)
   */
  private calculateDeadlineInfo(deadline: Date | string | null | undefined): any {
    const now = new Date();
    const deadlineInfo: any = {
      hasDeadline: false,
      isOverdue: false,
      remainingTime: null,
      color: null
    };

    if (deadline) {
      const deadlineTime = new Date(deadline).getTime();
      const diffMs = deadlineTime - now.getTime();

      if (!isNaN(diffMs)) {
        deadlineInfo.hasDeadline = true;
        // Mặc định màu xanh nếu có hạn xử lý
        deadlineInfo.color = '#0062AD';

        if (diffMs < 0) {
          deadlineInfo.isOverdue = true;
          deadlineInfo.color = '#D60B0B'; // đỏ: đã hết ngày deadline
          const overdueTotalHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
          const overdueDays = Math.floor(overdueTotalHours / 24);
          const overdueHours = overdueTotalHours % 24;

          if (overdueDays > 0) {
            deadlineInfo.remainingTime = `Quá hạn ${overdueDays} ngày ${overdueHours} giờ`;
          } else {
            deadlineInfo.remainingTime = `Quá hạn ${overdueHours} giờ`;
          }
        } else {
          const remainingTotalHours = Math.floor(diffMs / (1000 * 60 * 60));
          const remainingDays = Math.floor(remainingTotalHours / 24);
          const remainingHours = remainingTotalHours % 24;
          const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          deadlineInfo.remainingDays = remainingDays;
          deadlineInfo.remainingHours = remainingHours;
          deadlineInfo.remainingTime = remainingDays > 0
            ? `Còn ${remainingDays} ngày ${remainingHours} giờ`
            : remainingHours > 0
              ? `Còn ${remainingHours} giờ ${remainingMinutes} phút`
              : `Còn ${remainingMinutes} phút`;
        }
      }
    }

    return deadlineInfo;
  }

  /**
   * Kiểm tra người dùng có role Admin hoặc Người phê duyệt cho quy trình News hay không
   */
  private async checkUserIsAdminOrApprover(userId: string | undefined): Promise<boolean> {
    try {
      if (!userId) return false;

      // 1. Kiểm tra trực tiếp trên UserEntity (rolesByProcess)
      const user = await this.userRepository.findOne({ where: { id: userId } as any });
      if (user && user.rolesByProcess && Array.isArray(user.rolesByProcess)) {
        const newsProcess = user.rolesByProcess.find(p => p.processKey === 'News' || p.processKey === 'quan_ly_tin_tuc');
        if (newsProcess && newsProcess.roles) {
          const roleCodes = ['ADMIN_NEWS', 'NGUOI_PHE_DUYET'];
          if (newsProcess.roles.some(r => roleCodes.includes(r.roleCode))) {
            return true;
          }
        }
      }

      // 2. Kiểm tra qua GroupUserEntity (roles_dynamic)
      const userGroups = await this.groupUserRepository
        .createQueryBuilder('g')
        .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
        .where('ugu.user_id = :userId', { userId })
        .andWhere('g.status = 1')
        .getMany();

      const roleCodes = ['ADMIN_NEWS', 'NGUOI_PHE_DUYET'];
      const hasGroupRole = userGroups.some(g =>
        (g.roles_dynamic || []).some((r: any) =>
          (r.processKey === 'News' || r.processKey === 'quan_ly_tin_tuc') &&
          roleCodes.includes(r.roleCode)
        )
      );

      return hasGroupRole;
    } catch (error) {
      console.warn('[DEBUG] Lỗi khi kiểm tra role checkUserIsAdminOrApprover:', error.message);
      return false;
    }
  }

  /**
   * Thêm thông tin comment và like vào news item
   */
  private async addCommentAndLikeStatus(news: any): Promise<any> {
    const commentCount = await this.newsCommentRepository.count({
      where: [
        { newsId: news.id, type: 'comment' },
        { newsId: news.id, type: IsNull() },
      ],
    });

    const likeCount = await this.newsLikeRepository.count({
      where: { type: 'NEWS', objectId: news.id, isLike: true },
    });

    return {
      ...news,
      isComment: news.isComment ? 'Có' : 'Không',
      isImportant: news.isImportant ? 'Có' : 'Không',
      comment: commentCount > 0 ? 'Có' : 'Không',
      commentCount: commentCount || 0,
      likeCount: likeCount || 0,
    };
  }

  /**
   * Format news với date fields và comment status - BATCH VERSION (tránh N+1 query)
   * Thay vì 4 queries/item (N×4), batch lấy tất cả data 1 lần rồi map vào từng item
   */
  private async formatNewsWithComments(newsItems: any[], currentUserId?: string): Promise<any[]> {
    if (!newsItems || newsItems.length === 0) return [];

    const ids: number[] = newsItems.map(n => n.id);
    const idStrings: string[] = ids.map(String);

    // Lấy tất cả unique topic UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uniqueTopicIds = [...new Set(
      newsItems.map(n => n.topic).filter(t => t && uuidRegex.test(t))
    )];

    // Helper query cho comments (chỉ đếm bình luận loại 'comment' hoặc NULL, loại bỏ ý kiến xử lý/phản hồi quy trình)
    const commentQuery = this.newsCommentRepository
      .createQueryBuilder('c')
      .select('c.newsId', 'newsId')
      .addSelect('COUNT(*)', 'cnt')
      .where('(c.type = :commentType OR c.type IS NULL OR c.type = \'\')', { commentType: 'comment' })
      .groupBy('c.newsId');
    this.createChunkedInClause(commentQuery, 'c.newsId', ids);

    // Helper query cho likes
    const likeQuery = this.newsLikeRepository
      .createQueryBuilder('l')
      .select('l.objectId', 'objectId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.type = :type AND l.isLike = :isLike', { type: 'NEWS', isLike: true })
      .groupBy('l.objectId');
    this.createChunkedInClause(likeQuery, 'l.objectId', ids);

    // Batch: 4 queries chạy song song thay vì N×4 queries tuần tự
    const [commentRows, likeRows, filesMap, topics, isAdminOrApprover] = await Promise.all([
      // 1. Đếm comment theo từng newsId
      commentQuery.getRawMany(),

      // 2. Đếm like theo từng objectId
      likeQuery.getRawMany(),

      // 3. Batch lấy files cho tất cả news cùng lúc
      this.filesManagementService.getLatestFilesByObjectIds('news', idStrings),

      // 4. Batch lấy topic names (chỉ UUID hợp lệ)
      uniqueTopicIds.length > 0
        ? this.topicRepository.findByIds(uniqueTopicIds)
        : Promise.resolve([]),

      // 5. Kiểm tra quyền Admin/Approver
      this.checkUserIsAdminOrApprover(currentUserId),
    ]);

    // Build lookup maps
    const commentMap = new Map<number, number>(
      commentRows.map(r => [Number(r.newsId), Number(r.cnt)])
    );
    const likeMap = new Map<number, number>(
      likeRows.map(r => [Number(r.objectId), Number(r.cnt)])
    );
    const topicMap = new Map<string, any>(
      topics.map((t: any) => [t.id, t])
    );



    return newsItems.map(news => {
      const formattedNews = this.formatNewsDateFields(news);

      // Comment & like
      const commentCount = commentMap.get(news.id) || 0;
      const likeCount = likeMap.get(news.id) || 0;

      // Deadline calculation
      const deadlineInfo = this.calculateDeadlineInfo(news.deadline);

      // Files
      const newsFiles = filesMap[String(news.id)] || [];
      let sizeSmall: any = undefined;
      let sizeMedium: any = undefined;
      let sizeBig: any = undefined;
      for (const file of newsFiles) {
        const fileInfo = {
          id: file.id,
          url: `/files/view/${file.id}`,
          filename: file.file_name,
          mimetype: file.mime_type,
          storage_path: file.storage_path,
        };
        if (
          String(file.id) === String(news.sizeSmall) ||
          (!news.sizeSmall && file.typeSize === 'sizeSmall')
        ) {
          sizeSmall = fileInfo;
        } else if (
          String(file.id) === String(news.sizeMedium) ||
          (!news.sizeMedium && file.typeSize === 'sizeMedium')
        ) {
          sizeMedium = fileInfo;
        } else if (
          String(file.id) === String(news.sizeBig) ||
          (!news.sizeBig && file.typeSize === 'sizeBig')
        ) {
          sizeBig = fileInfo;
        }
      }

      // Topic
      let topicName: string | undefined = news.topic;
      let topicId: string | undefined = news.topic;
      let topicEntity: any = null;
      if (news.topic) {
        if (uuidRegex.test(news.topic)) {
          topicEntity = topicMap.get(news.topic);
          if (topicEntity) {
            topicName = topicEntity.name;
            topicId = topicEntity.id;
          }
        }
        // else: old data, topic is already a name - giữ nguyên
      }

      // canUpdatePublished logic
      const canUpdatePublished = isAdminOrApprover || news.authorId === currentUserId;

      return {
        ...formattedNews,
        isComment: news.isComment ? 'Có' : 'Không',
        isImportant: news.isImportant ? 'Có' : 'Không',
        comment: commentCount > 0 ? 'Có' : 'Không',
        commentCount,
        likeCount,
        ...deadlineInfo,
        files: newsFiles,
        ...(sizeSmall !== undefined && { sizeSmall }),
        ...(sizeMedium !== undefined && { sizeMedium }),
        ...(sizeBig !== undefined && { sizeBig }),
        topic: topicName,
        topicId,
        canUpdatePublished,
        flags: {
          canUpdatePublished,
        }
      };
    });
  }

  /**
   * Map authorId sang authorName cho danh sách tin tức
   */
  private async mapAuthorNames(newsItems: any[]): Promise<any[]> {
    if (!newsItems || newsItems.length === 0) return newsItems;

    // Lấy tất cả unique authorIds
    const authorIds = [...new Set(newsItems.map(item => item.authorId).filter(Boolean))];

    if (authorIds.length === 0) return newsItems;

    try {
      // Query tất cả users một lần
      const users = await this.repo.getUsersByIds(authorIds);

      // Tạo map để lookup nhanh - filter ra users không có đủ thông tin
      const userMap = new Map<string, string>(
        (users as any[])
          .filter(user => user.processId && user.name)
          .map(user => [user.processId, user.name] as [string, string])
      );

      // Map authorName vào từng item
      return newsItems.map(item => ({
        ...item,
        authorName: item.authorId ? (userMap.get(item.authorId) || item.authorName || null) : null,
      }));
    } catch (error) {
      console.warn('[DEBUG] Không thể map author names:', error.message);
      return newsItems;
    }
  }

  /**
   * Danh sách tin đang tạo (Draft) - theo người dùng hiện tại
   */
  async getNewsDrafts(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const {
      q,
      orFields,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      topic,
      status,
      type,
      title,
      rejectorName,
      submitterName,
      authorName,
      reviewerName,
      isComment,
      submittedAt,
      deadline,
      createdAt,
      publishedAt,
      recalledAt,
      department,
      sort,
      remainingTime
    } = normalizedQuery;

    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .where('news.authorId = :userId', { userId })
      .andWhere('news.status = :status', { status: 2 });

    // Áp dụng các filter chung (tất cả filters như các hàm khác)
    this.applyNewsSearchFilters(queryBuilder, {
      q,
      orFields,
      search,
      title,
      topic,
      status,
      type,
      rejectorName,
      submitterName,
      authorName,
      reviewerName,
      isComment,
      submittedAt,
      deadline,
      createdAt,
      publishedAt,
      recalledAt,
      department,
      remainingTime
    });

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder });

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);

    // Map với flags nếu có bpmnXML
    let finalItems = formattedItems;
    if (bpmnXML && items.length > 0) {
      try {
        finalItems = await this.mapNewsDetailsWithFlags(
          formattedItems,
          bpmnXML,
          { userId, roles: userRoles, receiverUnit }
        );
      } catch (error) {
        console.warn('[DEBUG] Không thể map flags:', error.message);
      }
    }

    return {
      items: finalItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Đếm số lượng tin đang tạo (Draft)
   */
  async countNewsDrafts(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, submitterName, authorName, reviewerName, isComment, submittedAt, deadline, createdAt, publishedAt, recalledAt, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .where('news.authorId = :userId', { userId })
      .andWhere('news.status = :status', { status: 2 });

    this.applyNewsSearchFilters(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, authorName, reviewerName, isComment, submittedAt, deadline, createdAt, publishedAt, recalledAt, department, remainingTime });
    return await queryBuilder.getCount();
  }


  /**
   * Danh sách tin chờ duyệt - tin mà người dùng đã gửi duyệt (SUBMIT)
   */
  async getNewsPendingApproval(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, type, title, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository.createQueryBuilder('news');

    // 1. Chỉ lấy tin của user hiện tại và phải có hành động SUBMIT
    queryBuilder.andWhere('news.authorId = :userId', { userId });
    queryBuilder.andWhere(`EXISTS (
      SELECT 1 FROM audit a
      WHERE a.document_id = CAST(news.id AS VARCHAR(50))
        AND a.action_code = 'SUBMIT'
        AND a.type_document = 'NEWS'
    )`);

    // 2. Hành động GẦN NHẤT phải là SUBMIT
    queryBuilder.andWhere(`'SUBMIT' = (
      SELECT TOP 1 a2.action_code 
      FROM audit a2 
      WHERE a2.document_id = CAST(news.id AS VARCHAR(50)) 
        AND a2.type_document = 'NEWS' 
      ORDER BY a2.created_at DESC, a2.id DESC
    )`);

    // Áp dụng các filter chung
    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department });

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder });

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);
    // Map với flags nếu có bpmnXML
    let finalItems = formattedItems;
    if (bpmnXML && items.length > 0) {
      try {
        finalItems = await this.mapNewsDetailsWithFlags(
          formattedItems,
          bpmnXML,
          { userId, roles: userRoles, receiverUnit }
        );
      } catch (error) {
        console.warn('[DEBUG] Không thể map flags:', error.message);
      }
    }

    return {
      items: finalItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Đếm số lượng tin chờ duyệt
   */
  async countNewsPendingApproval(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    queryBuilder.andWhere('news.authorId = :userId', { userId });
    queryBuilder.andWhere(`EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'SUBMIT' AND a.type_document = 'NEWS' )`);
    queryBuilder.andWhere(`'SUBMIT' = ( SELECT TOP 1 a2.action_code FROM audit a2 WHERE a2.document_id = CAST(news.id AS VARCHAR(50)) AND a2.type_document = 'NEWS' ORDER BY a2.created_at DESC, a2.id DESC )`);

    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department });
    return await queryBuilder.getCount();
  }


  /**
   * Danh sách tin đã xuất bản - dựa vào audit với actionCode = DUYET
   */
  async getNewsPublished(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const {
      q,
      orFields,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      topic,
      status,
      type,
      title,
      submittedAt,
      submitterName,
      authorName,
      reviewerName,
      rejectorName,
      isComment,
      createdAt,
      publishedAt,
      approvedAt,
      deadline,
      department,
      sort,
      remainingTime
    } = normalizedQuery;


    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    const selectColumns = this.newsRepository.metadata.columns
      .map(col => `news.${col.propertyName}`)
      .filter(col => col !== 'news.content');
    queryBuilder.select(selectColumns);

    // Mặc định là 'true' nếu không truyền (đối với my-list)
    const isMyNews = normalizedQuery.isMyNews == 'false';

    // Nếu là tin của tôi thì lọc theo authorId
    if (isMyNews) {
      queryBuilder.andWhere('news.authorId = :userId', { userId });
    }

    // Tin đã xuất bản phải có hành động DUYET (bất kể là của ai)
    queryBuilder.andWhere(`EXISTS (
      SELECT 1 FROM audit a 
      WHERE a.document_id = CAST(news.id AS VARCHAR(50)) 
        AND a.action_code = 'DUYET' 
        AND a.type_document = 'NEWS'
    )`);

    // Và không bị RECALL (thu hồi)
    queryBuilder.andWhere(`NOT EXISTS (
      SELECT 1 FROM audit a
      WHERE a.document_id = CAST(news.id AS VARCHAR(50))
        AND a.action_code = 'RECALL'
        AND a.type_document = 'NEWS'
    )`);

    // 
    // Áp dụng các filter chung
    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, submittedAt, submitterName, authorName, reviewerName, rejectorName, isComment, createdAt, publishedAt, approvedAt, deadline, department, remainingTime });

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'publishedAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    // console.log('[DEBUG] News Query SQL cuối cùng:', queryBuilder.getSql());

    const [items, total] = await queryBuilder.getManyAndCount();


    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);
    // Map với flags nếu có bpmnXML
    let finalItems = formattedItems;
    if (bpmnXML && items.length > 0) {
      try {
        finalItems = await this.mapNewsDetailsWithFlags(
          formattedItems,
          bpmnXML,
          { userId, roles: userRoles, receiverUnit }
        );
      } catch (error) {
        console.warn('[DEBUG] Không thể map flags:', error.message);
      }
    }

    // Map authorName
    finalItems = await this.mapAuthorNames(finalItems);

    return {
      items: finalItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      debugInfo: {
        publishedNewsCount: items.length,
      }
    };
  }

  /**
   * Đếm số lượng tin đã xuất bản
   */
  async countNewsPublished(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, submittedAt, submitterName, authorName, reviewerName, rejectorName, isComment, createdAt, publishedAt, approvedAt, deadline, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    const isMyNews = normalizedQuery.isMyNews == 'false';
    if (isMyNews) { queryBuilder.andWhere('news.authorId = :userId', { userId }); }
    queryBuilder.andWhere(`EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'DUYET' AND a.type_document = 'NEWS' )`);
    queryBuilder.andWhere(`NOT EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )`);

    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, submittedAt, submitterName, authorName, reviewerName, rejectorName, isComment, createdAt, publishedAt, approvedAt, deadline, department, remainingTime });
    return await queryBuilder.getCount();
  }

  /**
   * Danh sách tin đã trả lại - dựa vào audit với actionCode = TRA_LAI (lấy tin có action TRA_LAI cuối cùng)
   */
  async getNewsReturned(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, type, title, rejectorName, submitterName, createdAt, isComment, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    // Bước 1: Lấy danh sách ID các tin bị trả lại của user này sử dụng CROSS APPLY cực nhanh
    const rawIds = await this.dataSource.query(`
      SELECT news.id
      FROM news WITH (NOLOCK)
      CROSS APPLY (
        SELECT TOP 1 a.action_code
        FROM audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(news.id AS NVARCHAR(64))
          AND a.type_document = 'NEWS'
        ORDER BY a.created_at DESC, a.id DESC
      ) latest_audit
      WHERE news.authorId = @0
        AND news.status NOT IN (3)
        AND latest_audit.action_code = 'TRA_LAI'
    `, [userId]);

    const returnedIds = rawIds.map((row: any) => row.id);

    if (returnedIds.length === 0) {
      return {
        items: [],
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0,
        debugInfo: { returnedNewsCount: 0 }
      };
    }

    // Bước 2: Query chi tiết, phân trang, lọc và sắp xếp trên tập ID đã lấy
    const queryBuilder = this.newsRepository.createQueryBuilder('news')
      .where('news.id IN (:...returnedIds)', { returnedIds });

    queryBuilder.andWhere('news.status NOT IN (:...excluded)', {
      excluded: [3]  // loại bỏ đã xóa
    });

    // Áp dụng các filter chung
    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department });

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'updatedAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    console.debug(`[NewsWorkflowService.getNewsReturned] START queryKeys=${Object.keys(normalizedQuery || {}).join(',')}`);

    let items: any[] = [];
    let total: number = 0;
    try {
      [items, total] = await queryBuilder.getManyAndCount();
      console.log(`[NewsWorkflowService.getNewsReturned] query generated successfully, found ${total} items.`);
    } catch (error) {
      console.error(`[NewsWorkflowService.getNewsReturned] ERROR executing query:`, error);
      throw error;
    }

    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);

    // Map với flags nếu có bpmnXML
    let finalItems = formattedItems;
    if (bpmnXML && items.length > 0) {
      try {
        finalItems = await this.mapNewsDetailsWithFlags(
          formattedItems,
          bpmnXML,
          { userId, roles: userRoles, receiverUnit }
        );
      } catch (error) {
        console.warn('[DEBUG] Không thể map flags:', error.message);
      }
    }

    // Map authorName
    finalItems = await this.mapAuthorNames(finalItems);

    return {
      items: finalItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      debugInfo: {
        returnedNewsCount: items.length
      }
    };
  }

  /**
   * Đếm số lượng tin đã trả lại
   */
  async countNewsReturned(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, submitterName, createdAt, isComment, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    // Bước 1: Lấy danh sách ID các tin bị trả lại của user này sử dụng CROSS APPLY cực nhanh
    const rawIds = await this.dataSource.query(`
      SELECT news.id
      FROM news WITH (NOLOCK)
      CROSS APPLY (
        SELECT TOP 1 a.action_code
        FROM audit a WITH (NOLOCK)
        WHERE a.document_id = CAST(news.id AS NVARCHAR(64))
          AND a.type_document = 'NEWS'
        ORDER BY a.created_at DESC, a.id DESC
      ) latest_audit
      WHERE news.authorId = @0
        AND news.status NOT IN (3)
        AND latest_audit.action_code = 'TRA_LAI'
    `, [userId]);

    const returnedIds = rawIds.map((row: any) => row.id);

    if (returnedIds.length === 0) return 0;

    const queryBuilder = this.newsRepository.createQueryBuilder('news')
      .where('news.id IN (:...returnedIds)', { returnedIds });
    queryBuilder.andWhere('news.status NOT IN (:...excluded)', { excluded: [3] });

    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, isComment, createdAt, submittedAt, deadline, department });
    return await queryBuilder.getCount();
  }

  /**
   * Danh sách tin đã hủy - dựa vào audit với actionCode = CANCEL
   */
  async getNewsCancelled(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, type, title, rejectorName, submitterName, cancellerName, isComment, createdAt, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository.createQueryBuilder('news');

    // Phải là tin của user hiện tại
    queryBuilder.andWhere('news.authorId = :userId', { userId });

    // Phải có hành động HUY_TIN
    queryBuilder.andWhere(`EXISTS (
      SELECT 1 FROM audit a
      WHERE a.document_id = CAST(news.id AS VARCHAR(50))
        AND a.action_code = 'HUY_TIN'
        AND a.type_document = 'NEWS'
    )`);

    // Áp dụng các filter chung
    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, cancellerName, submitterName, isComment, createdAt, submittedAt, deadline, department, remainingTime });

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'updatedAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    // console.log('[DEBUG] News Query SQL cuối cùng:', queryBuilder.getSql());

    const [items, total] = await queryBuilder.getManyAndCount();


    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);

    // Map với flags nếu có bpmnXML
    let finalItems = formattedItems;
    if (bpmnXML && items.length > 0) {
      try {
        finalItems = await this.mapNewsDetailsWithFlags(
          formattedItems,
          bpmnXML,
          { userId, roles: userRoles, receiverUnit }
        );
      } catch (error) {
        console.warn('[DEBUG] Không thể map flags:', error.message);
      }
    }

    // Map authorName
    finalItems = await this.mapAuthorNames(finalItems);

    return {
      items: finalItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Đếm số lượng tin đã hủy
   */
  async countNewsCancelled(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, cancellerName, submitterName, isComment, createdAt, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    queryBuilder.andWhere('news.authorId = :userId', { userId });
    queryBuilder.andWhere(`EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'HUY_TIN' AND a.type_document = 'NEWS' )`);

    this.applyFiltersWithAutoOr(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, cancellerName, submitterName, isComment, createdAt, submittedAt, deadline, department, remainingTime });
    return await queryBuilder.getCount();
  }

  /**
   * Danh sách tin thu hồi - dựa vào audit với actionCode = RECALL
   */
  async getNewsRecalled(query: any, userId: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, title, rejectorName, reviewerName, submitterName, recallReason, recalledByName, publishedAt, recalledAt, remainingTime } = normalizedQuery;

    // Chuyển đổi userId sang userName cho các trường tìm kiếm theo ID
    let resolvedReviewerName = reviewerName;
    let resolvedRecalledByName = recalledByName;

    // Nếu reviewerName là userId (24 hoặc 36 ký tự hex), lấy tên user
    if (reviewerName && /^[a-f0-9-]{24,36}$/i.test(reviewerName)) {
      try {
        const user = await this.usersService.findById(reviewerName);
        resolvedReviewerName = user?.fullname || user?.username || reviewerName;
      } catch (e) {
        console.warn('[DEBUG] Cannot resolve reviewerName from ID:', reviewerName, e.message);
      }
    }

    // Nếu recalledByName là userId, lấy tên user
    if (recalledByName && /^[a-f0-9-]{24,36}$/i.test(recalledByName)) {
      try {
        const user = await this.usersService.findById(recalledByName);
        resolvedRecalledByName = user?.fullname || user?.username || recalledByName;
      } catch (e) {
        console.warn('[DEBUG] Cannot resolve recalledByName from ID:', recalledByName, e.message);
      }
    }

    const queryBuilder = this.newsRepository.createQueryBuilder('news');

    // Phải có hành động RECALL
    queryBuilder.andWhere(`EXISTS (
      SELECT 1 FROM audit a
      WHERE a.document_id = CAST(news.id AS VARCHAR(50))
        AND a.action_code = 'RECALL'
        AND a.type_document = 'NEWS'
    )`);


    // Áp dụng các filter chung - Tự động convert multiple text filters thành OR logic
    // Sử dụng resolved values thay vì giá trị gốc (đã chuyển từ userId sang userName)
    const textFilters = { title, recallReason, recalledByName: resolvedRecalledByName, submitterName, reviewerName: resolvedReviewerName, rejectorName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);


    // Nếu có nhiều hơn 1 text filter, tự động dùng OR
    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => {
        autoOrFields[field] = value;
      });
      this.applyNewsSearchFilters(queryBuilder, {
        q,
        orFields: autoOrFields,
        search,
        title,
        topic,
        status,
        // type,
        publishedAt,
        recalledAt,
        remainingTime
      });
    } else {
      // Dùng logic AND như bình thường - sử dụng resolved values
      this.applyNewsSearchFilters(queryBuilder, {
        q, orFields, search, title, topic, status, rejectorName,
        reviewerName: resolvedReviewerName,
        submitterName,
        publishedAt,
        recalledAt,
        remainingTime
      });

      // Áp dụng filter riêng cho recallReason và recalledByName (nếu có)
      if (recallReason && !orFields) {
        queryBuilder.andWhere('news.recallReason COLLATE Latin1_General_CI_AI LIKE :recallReason', {
          recallReason: `%${recallReason}%`
        });
      }
      if (resolvedRecalledByName && !orFields) {
        queryBuilder.andWhere('news.recalledByName COLLATE Latin1_General_CI_AI LIKE :recalledByName', {
          recalledByName: `%${resolvedRecalledByName}%`
        });
      }
    }

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'createdAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    // console.log('[DEBUG] News Query SQL cuối cùng:', queryBuilder.getSql());

    const [items, total] = await queryBuilder.getManyAndCount();


    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);

    return {
      items: formattedItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      debugInfo: {
        recalledNewsCount: items.length,
      }
    };
  }

  /**
   * Đếm số lượng tin thu hồi
   */
  async countNewsRecalled(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, title, rejectorName, reviewerName, submitterName, recallReason, recalledByName, publishedAt, recalledAt, remainingTime } = normalizedQuery;

    let resolvedReviewerName = reviewerName;
    let resolvedRecalledByName = recalledByName;
    if (reviewerName && /^[a-f0-9-]{24,36}$/i.test(reviewerName)) { try { const user = await this.usersService.findById(reviewerName); resolvedReviewerName = user?.fullname || user?.username || reviewerName; } catch (e) { } }
    if (recalledByName && /^[a-f0-9-]{24,36}$/i.test(recalledByName)) { try { const user = await this.usersService.findById(recalledByName); resolvedRecalledByName = user?.fullname || user?.username || recalledByName; } catch (e) { } }

    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    queryBuilder.andWhere(`EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )`);

    const textFilters = { title, recallReason, recalledByName: resolvedRecalledByName, submitterName, reviewerName: resolvedReviewerName, rejectorName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);

    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => { autoOrFields[field] = value; });
      this.applyNewsSearchFilters(queryBuilder, { q, orFields: autoOrFields, search, title, topic, status, publishedAt, recalledAt, remainingTime });
    } else {
      this.applyNewsSearchFilters(queryBuilder, { q, orFields, search, title, topic, status, rejectorName, reviewerName: resolvedReviewerName, submitterName, publishedAt, recalledAt, remainingTime });
      if (recallReason && !orFields) { queryBuilder.andWhere('news.recallReason COLLATE Latin1_General_CI_AI LIKE :recallReason', { recallReason: `%${recallReason}%` }); }
      if (resolvedRecalledByName && !orFields) { queryBuilder.andWhere('news.recalledByName COLLATE Latin1_General_CI_AI LIKE :recalledByName', { recalledByName: `%${resolvedRecalledByName}%` }); }
    }

    return await queryBuilder.getCount();
  }

  async getNewsRecalledByUser(query: any, userId: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, type, title, rejectorName, reviewerName, submitterName, recallReason, recalledByName, publishedAt, recalledAt, remainingTime } = normalizedQuery;


    // Chuyển đổi userId sang userName cho các trường tìm kiếm theo ID
    let resolvedReviewerName = reviewerName;
    let resolvedRecalledByName = recalledByName;

    // Nếu reviewerName là userId (24 hoặc 36 ký tự hex), lấy tên user
    if (reviewerName && /^[a-f0-9-]{24,36}$/i.test(reviewerName)) {
      try {
        const user = await this.usersService.findById(reviewerName);
        resolvedReviewerName = user?.fullname || user?.username || reviewerName;
      } catch (e) {
        console.warn('[DEBUG] Cannot resolve reviewerName from ID:', reviewerName, e.message);
      }
    }

    // Nếu recalledByName là userId, lấy tên user
    if (recalledByName && /^[a-f0-9-]{24,36}$/i.test(recalledByName)) {
      try {
        const user = await this.usersService.findById(recalledByName);
        resolvedRecalledByName = user?.fullname || user?.username || recalledByName;
      } catch (e) {
        console.warn('[DEBUG] Cannot resolve recalledByName from ID:', recalledByName, e.message);
      }
    }

    const queryBuilder = this.newsRepository.createQueryBuilder('news');

    // Phải có hành động RECALL
    queryBuilder.andWhere(`EXISTS (
      SELECT 1 FROM audit a
      WHERE a.document_id = CAST(news.id AS VARCHAR(50))
        AND a.action_code = 'RECALL'
        AND a.type_document = 'NEWS'
    )`);
    queryBuilder.andWhere('news.authorId = :userId', { userId });


    // Áp dụng các filter chung - Tự động convert multiple text filters thành OR logic
    // Sử dụng resolved values thay vì giá trị gốc (đã chuyển từ userId sang userName)
    const textFilters = { title, recallReason, recalledByName: resolvedRecalledByName, submitterName, reviewerName: resolvedReviewerName, rejectorName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);


    // Nếu có nhiều hơn 1 text filter, tự động dùng OR
    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => {
        autoOrFields[field] = value;
      });
      this.applyNewsSearchFilters(queryBuilder, {
        q,
        orFields: autoOrFields,
        search,
        title,
        topic,
        status,
        type,
        publishedAt,
        recalledAt,
        remainingTime
      });
    } else {
      // Dùng logic AND như bình thường - sử dụng resolved values
      this.applyNewsSearchFilters(queryBuilder, {
        q, orFields, search, title, topic, status, type, rejectorName,
        reviewerName: resolvedReviewerName,
        submitterName,
        publishedAt,
        recalledAt,
        remainingTime
      });

      // Áp dụng filter riêng cho recallReason và recalledByName (nếu có)
      if (recallReason && !orFields) {
        queryBuilder.andWhere('news.recallReason COLLATE Latin1_General_CI_AI LIKE :recallReason', {
          recallReason: `%${recallReason}%`
        });
      }
      if (resolvedRecalledByName && !orFields) {
        queryBuilder.andWhere('news.recalledByName COLLATE Latin1_General_CI_AI LIKE :recalledByName', {
          recalledByName: `%${resolvedRecalledByName}%`
        });
      }
    }

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'createdAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    // console.log('[DEBUG] News Query SQL cuối cùng:', queryBuilder.getSql());

    const [items, total] = await queryBuilder.getManyAndCount();


    const formattedItems = await this.formatNewsWithComments(items, userId);
    formattedItems.forEach(item => item.color = null);

    return {
      items: formattedItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      debugInfo: {
        recalledNewsCount: items.length,
      }
    };
  }

  /**
   * Đếm số lượng tin thu hồi của tôi
   */
  async countNewsRecalledByUser(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, reviewerName, submitterName, recallReason, recalledByName, publishedAt, recalledAt, remainingTime } = normalizedQuery;

    let resolvedReviewerName = reviewerName;
    let resolvedRecalledByName = recalledByName;
    if (reviewerName && /^[a-f0-9-]{24,36}$/i.test(reviewerName)) { try { const user = await this.usersService.findById(reviewerName); resolvedReviewerName = user?.fullname || user?.username || reviewerName; } catch (e) { } }
    if (recalledByName && /^[a-f0-9-]{24,36}$/i.test(recalledByName)) { try { const user = await this.usersService.findById(recalledByName); resolvedRecalledByName = user?.fullname || user?.username || recalledByName; } catch (e) { } }

    const queryBuilder = this.newsRepository.createQueryBuilder('news');
    queryBuilder.andWhere(`EXISTS ( SELECT 1 FROM audit a WHERE a.document_id = CAST(news.id AS VARCHAR(50)) AND a.action_code = 'RECALL' AND a.type_document = 'NEWS' )`);
    queryBuilder.andWhere('news.authorId = :userId', { userId });

    const textFilters = { title, recallReason, recalledByName: resolvedRecalledByName, submitterName, reviewerName: resolvedReviewerName, rejectorName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);

    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => { autoOrFields[field] = value; });
      this.applyNewsSearchFilters(queryBuilder, { q, orFields: autoOrFields, search, title, topic, status, type, publishedAt, recalledAt, remainingTime });
    } else {
      this.applyNewsSearchFilters(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, reviewerName: resolvedReviewerName, submitterName, publishedAt, recalledAt, remainingTime });
      if (recallReason && !orFields) { queryBuilder.andWhere('news.recallReason COLLATE Latin1_General_CI_AI LIKE :recallReason', { recallReason: `%${recallReason}%` }); }
      if (resolvedRecalledByName && !orFields) { queryBuilder.andWhere('news.recalledByName COLLATE Latin1_General_CI_AI LIKE :recalledByName', { recalledByName: `%${resolvedRecalledByName}%` }); }
    }

    return await queryBuilder.getCount();
  }

  /**
   * Danh sách tin chờ phê duyệt của tôi - các tin tôi đang có quyền phê duyệt (OPTIMIZED)
   */
  async getNewsWaitingMyApproval(query: any, userId: string, bpmnXML?: string, userRoles?: string[], receiverUnit?: string) {
    const normalizedQuery = this.normalizeFilterParams(query);
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const { q, orFields, search, sort, sortBy = 'updatedAt', sortOrder = 'DESC', topic, status, type, title, rejectorName, submitterName, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    // Tối ưu hóa truy vấn audit: lọc khoảng ngày trực tiếp trên audit để tránh Full Table Scan
    let auditDateCondition = '';
    if (submittedAt) {
      if (submittedAt.startDate) {
        auditDateCondition += ` AND a.created_at >= :auditStartDate`;
      }
      if (submittedAt.endDate) {
        auditDateCondition += ` AND a.created_at < :auditEndDate`;
      }
    }

    const latestAuditSubQuery = `
      SELECT a.document_id, a.action_code, a.receiver
      FROM audit a WITH (NOLOCK)
      WHERE a.type_document = 'NEWS'
        AND a.action_code = 'SUBMIT'
        AND a.receiver = :waitingUserId
        ${auditDateCondition}
        AND NOT EXISTS (
          SELECT 1 FROM audit a_later WITH (NOLOCK)
          WHERE a_later.document_id = a.document_id
            AND a_later.type_document = 'NEWS'
            AND a_later.id > a.id
            AND a_later.action_code IN ('DUYET', 'TRA_LAI')
        )
    `;

    // Query tin tức với leftJoin topic và innerJoin audit
    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .leftJoinAndSelect('news.topicEntity', 'topic')
      .innerJoin(
        `(${latestAuditSubQuery})`,
        'latest_audit',
        'latest_audit.document_id = CAST(news.id AS NVARCHAR(64))'
      );

    queryBuilder.setParameter('waitingUserId', userId);

    if (submittedAt) {
      if (submittedAt.startDate) {
        queryBuilder.setParameter('auditStartDate', new Date(submittedAt.startDate));
      }
      if (submittedAt.endDate) {
        const endDate = new Date(submittedAt.endDate);
        endDate.setDate(endDate.getDate() + 1);
        queryBuilder.setParameter('auditEndDate', endDate);
      }
    }

    queryBuilder
      .where('news.status = :status', { status: 1 })
      .andWhere('(news.rejectedAt IS NULL OR news.submittedAt > news.rejectedAt)')
      .andWhere('news.status NOT IN (:...excluded)', { excluded: [3] });

    // Áp dụng các filter chung (bao gồm orFields - tìm OR hỗn hợp)
    // Tự động convert multiple text filters thành OR logic
    const textFilters = { title, submitterName, rejectorName };
    const activeTextFilters = Object.entries(textFilters).filter(([_, value]) => value);


    // Nếu có nhiều hơn 1 text filter, tự động dùng OR
    if (activeTextFilters.length > 1 && !orFields) {
      const autoOrFields: any = {};
      activeTextFilters.forEach(([field, value]) => {
        autoOrFields[field] = value;
      });
      this.applyNewsSearchFilters(queryBuilder, {
        q,
        orFields: autoOrFields,
        search,
        topic,
        status,
        type,
        submittedAt,
        deadline,
        department,
        remainingTime
      });
    } else {
      // Dùng logic AND như bình thường
      this.applyNewsSearchFilters(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, submittedAt, deadline, department, remainingTime });
    }

    // const fs = require('fs');
    // const logFile = 'D:/TTHC/TTHC_NEW1635/DEBUG_LOG.txt';
    // const logMsg = `\n[DEBUG] ${new Date().toISOString()} getNewsWaitingMyApproval - userId: ${userId}\nSQL: ${queryBuilder.getSql()}\nParams: ${JSON.stringify(queryBuilder.getParameters())}\n`;
    // try { fs.appendFileSync(logFile, logMsg); } catch(e){}

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'createdAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const items = await queryBuilder.getMany();
    const total = 0;

    if (items.length === 0) {
      return { items: [] };
    }

    // OPTIMIZATION: Batch query comments và likes cho tất cả news cùng lúc
    const newsIds = items.map(n => n.id);

    const [commentCounts, likeCounts, filesByNewsId] = await Promise.all([
      this.newsCommentRepository
        .createQueryBuilder('comment')
        .select('comment.newsId', 'newsId')
        .addSelect('COUNT(*)', 'count')
        .where('comment.newsId IN (:...newsIds)', { newsIds })
        .andWhere('(comment.type = :commentType OR comment.type IS NULL OR comment.type = \'\')', { commentType: 'comment' })
        .groupBy('comment.newsId')
        .getRawMany(),
      this.newsLikeRepository
        .createQueryBuilder('like')
        .select('like.objectId', 'objectId')
        .addSelect('COUNT(*)', 'count')
        .where('like.type = :type', { type: 'NEWS' })
        .andWhere('like.objectId IN (:...newsIds)', { newsIds })
        .andWhere('like.isLike = :isLike', { isLike: true })
        .groupBy('like.objectId')
        .getRawMany(),
      this.filesManagementService.getLatestFilesByObjectIds(
        'news',
        newsIds.map(id => String(id)),
      ),
    ]);

    // Tao map de lookup nhanh
    const commentCountMap = new Map(commentCounts.map(c => [c.newsId, parseInt(c.count)]));
    const likeCountMap = new Map(likeCounts.map(l => [l.objectId, parseInt(l.count)]));


    // Format và enrich items
    let enrichedItems = items.map((news) => {
      const files = filesByNewsId[String(news.id)] || [];

      // Deadline calculation
      const deadlineInfo = this.calculateDeadlineInfo(news.deadline);

      const result: any = {
        ...this.formatNewsDateFields(news),
        topicId: news.topic, // Giữ lại ID gốc
        topic: news.topicEntity?.name || news.topic,
        isComment: news.isComment ? 'Có' : 'Không',
        comment: (commentCountMap.get(news.id) || 0) > 0 ? 'Có' : 'Không',
        commentCount: commentCountMap.get(news.id) || 0,
        likeCount: likeCountMap.get(news.id) || 0,
        files,
        ...deadlineInfo
      };

      // Map size fields based on typeSize
      if (files.length > 0) {
        files.forEach((file) => {
          const fileInfo = {
            id: file.id,
            url: `/files/view/${file.id}`,
            filename: file.file_name,
            mimetype: file.mime_type,
            storage_path: file.storage_path,
          };

          if (
            String(file.id) === String(news.sizeSmall) ||
            (!news.sizeSmall && file.typeSize === 'sizeSmall')
          ) {
            result.sizeSmall = fileInfo;
          } else if (
            String(file.id) === String(news.sizeMedium) ||
            (!news.sizeMedium && file.typeSize === 'sizeMedium')
          ) {
            result.sizeMedium = fileInfo;
          } else if (
            String(file.id) === String(news.sizeBig) ||
            (!news.sizeBig && file.typeSize === 'sizeBig')
          ) {
            result.sizeBig = fileInfo;
          }
        });
      }

      return result;
    });

    // Map với flags nếu có bpmnXML
    if (bpmnXML) {
      try {
        enrichedItems = await this.mapNewsDetailsWithFlags(enrichedItems, bpmnXML, { userId, roles: userRoles, receiverUnit });
      } catch (error) {
        console.warn('[WARN] Không thể map flags:', error.message);
      }
    }

    // Map authorName
    enrichedItems = await this.mapAuthorNames(enrichedItems);

    return {
      items: enrichedItems,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Đếm số lượng tin chờ phê duyệt của tôi
   */
  async countNewsWaitingMyApproval(query: any, userId: string): Promise<number> {
    const normalizedQuery = this.normalizeFilterParams(query);
    const { q, orFields, search, topic, status, type, title, rejectorName, submitterName, submittedAt, deadline, department, remainingTime } = normalizedQuery;

    const waitingApprovalPredicate = `
      EXISTS (
        SELECT 1
        FROM (
          SELECT TOP 1 a.action_code, a.receiver
          FROM audit a WITH (NOLOCK)
          WHERE a.type_document = 'NEWS'
            AND a.document_id = CAST(news.id AS NVARCHAR(64))
            AND (a.receiver = :waitingUserId OR a.created_by = :waitingUserId)
            AND a.action_code IN ('SUBMIT', 'DUYET', 'TRA_LAI')
          ORDER BY a.created_at DESC, a.id DESC
        ) latest_audit
        WHERE latest_audit.action_code = 'SUBMIT'
          AND latest_audit.receiver = :waitingUserId
      )
    `;

    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .where('news.id IN (SELECT DISTINCT TRY_CAST(a.document_id AS INT) FROM audit a WITH (NOLOCK) WHERE a.type_document = \'NEWS\' AND a.receiver = :waitingUserId)', { waitingUserId: userId })
      .andWhere(waitingApprovalPredicate, { waitingUserId: userId })
      .andWhere('news.status = :status', { status: 1 })
      .andWhere('(news.rejectedAt IS NULL OR news.submittedAt > news.rejectedAt)')
      .andWhere('news.status NOT IN (:...excluded)', { excluded: [3] });

    this.applyNewsSearchFilters(queryBuilder, { q, orFields, search, title, topic, status, type, rejectorName, submitterName, submittedAt, deadline, department, remainingTime });
    return await queryBuilder.getCount();
  }


  /**
   * Public API - Lấy tất cả tin tức đã xuất bản (không yêu cầu userId)
   * Dùng cho người chưa đăng nhập - OPTIMIZED VERSION
   */
  async getAllPublishedNews(query: any, userId?: string) {
    const cacheKey = await this.buildPublishedNewsCacheKey(query, userId);
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedQuery = this.normalizeFilterParams(query);
    normalizedQuery.status = 1; // Force status = 1 (published) for public API
    const page = Number(normalizedQuery.page) || 1;
    const limit = Number(normalizedQuery.limit) || 10;
    const {
      q,
      orFields,
      search,
      sortBy = 'publishedAt',
      sortOrder = 'DESC',
      sort,
      topic,
      status,
      type,
      title,
      content,
      rejectorName,
      submitterName,
      authorName,
      authorDepartment,
      reviewerName,
      isComment,
      submittedAt,
      deadline,
      createdAt,
      publishedAt,
      recalledAt,
      tags,
      isSpecial,
      fromDate,
      toDate,
      keyword,
      department,
    } = normalizedQuery;

    const selectColumns = this.newsRepository.metadata.columns
      .map(col => `news.${col.propertyName}`)
      .filter(col => col !== 'news.content');

    // TỐI ƯU: Chỉ lấy tin đã xuất bản với publishedAt hoặc approvedAt có giá trị, không cần query audit
    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .select(selectColumns)
      .leftJoinAndSelect('news.topicEntity', 'topic')
      // Chỉ lấy tin đã xuất bản và có publishedAt hoặc approvedAt
      .where('news.status = :status', { status: 1 })
      .andWhere('(news.publishedAt IS NOT NULL OR news.approvedAt IS NOT NULL)');

    // Áp dụng bộ lọc chuẩn (bao gồm search title CI_AI)
    const filterResult = this.applyNewsSearchFilters(queryBuilder, {
      q: keyword,
      orFields,
      search,
      title,
      content,
      topic,
      status,
      type,
      publishedAt,
      rejectorName,
      submitterName,
      authorName,
      authorDepartment,
      reviewerName,
      isComment,
      submittedAt,
      deadline,
      createdAt,
      recalledAt,
      tags,
      // remainingTime
    });

    // Xử lý thêm các filter đặc thù (nếu applyNewsSearchFilters chưa cover hết)
    // Ví dụ: tags, isSpecial, date range (fromDate, toDate), department
    // Chỉ apply nếu chưa được xử lý bởi AUTO OR
    const skipTags = filterResult?.skipIndividualFilters?.includes('tags');
    if (tags && !skipTags) {
      const tagList = tags.split(',').map((tag: string) => tag.trim());
      const tagConditions = tagList.map((tag: string, index: number) => {
        return `news.tags LIKE :tag${index}`;
      });
      queryBuilder.andWhere(`(${tagConditions.join(' OR ')})`,
        tagList.reduce((acc: any, tag: string, index: number) => {
          acc[`tag${index}`] = `%${tag}%`;
          return acc;
        }, {})
      );
    }

    if (isSpecial !== undefined) {
      const isSpecialValue = isSpecial === 'true' || isSpecial === true;
      queryBuilder.andWhere('news.isSpecial = :isSpecial', { isSpecial: isSpecialValue });
    }

    if (department) {
      const departmentIds = Array.isArray(department)
        ? department
        : typeof department === 'string'
          ? department.split(',').map(id => id.trim()).filter(Boolean)
          : [];

      if (departmentIds.length > 0) {
        queryBuilder.andWhere(new Brackets((qb) => {
          for (let i = 0; i < departmentIds.length; i++) {
            const val = departmentIds[i];
            const paramName = `deptVal_pub_${i}`;

            if (/^[a-f0-9-]{24,36}$/i.test(val)) {
              // TRƯỜNG HỢP ID: So khớp qua cả ID và Name
              qb.orWhere(`EXISTS (
                SELECT 1 FROM organization_units sub_ou 
                WHERE (sub_ou.id = :${paramName} 
                   OR sub_ou.mpath LIKE (SELECT '%' + m_ou.id + '%' FROM organization_units m_ou WHERE m_ou.id = :${paramName}))
                AND (news.department = sub_ou.id OR news.department = sub_ou.name)
              )`, { [paramName]: val });
            } else {
              // TRƯỜNG HỢP TÊN: So khớp trực tiếp tên hoặc qua mapping ID
              qb.orWhere(`(news.department COLLATE Latin1_General_CI_AI LIKE :${paramName} 
                OR news.department IN (
                  SELECT name_ou.id 
                  FROM organization_units name_ou 
                  WHERE name_ou.name COLLATE Latin1_General_CI_AI LIKE :${paramName}
                )
              )`, { [paramName]: `%${val}%` });
            }
          }
        }));
      }
    }

    if (fromDate) {
      queryBuilder.andWhere('COALESCE(news.publishedAt, news.approvedAt) >= :fromDate', { fromDate: new Date(fromDate) });
    }

    if (toDate) {
      queryBuilder.andWhere('COALESCE(news.publishedAt, news.approvedAt) <= :toDate', { toDate: new Date(toDate) });
    }

    // keyword logic (tương tự q trong applyNewsSearchFilters nhưng apply riêng nếu cần custom)
    if (keyword && !normalizedQuery.q) {
      queryBuilder.andWhere(
        '(news.title LIKE :keyword OR news.content LIKE :keyword OR news.summary LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    this.applySorting(queryBuilder, { sort, sortBy, sortOrder: sortOrder as 'ASC' | 'DESC' }, 'publishedAt');

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));

    const [total, items] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.getMany(),
    ]);

    // Không cần filter audit nữa - đã lọc bằng status = 1 và publishedAt IS NOT NULL
    const finalItems = items;

    // Kiểm tra quyền Admin/Phê duyệt một lần cho userId
    const isAdminOrApprover = await this.checkUserIsAdminOrApprover(userId);

    // Lấy cấu hình số ngày để gắn cờ isNew
    const settings = await this.systemSettingLogRepository.findOne({ where: { type: 'news' } });
    const newArticlesDays = settings?.newArticlesDays || 5;
    const fromDateForNew = new Date();
    fromDateForNew.setDate(fromDateForNew.getDate() - newArticlesDays);

    const newsIds = finalItems.map((item: any) => item.id).filter((id: any) => id !== undefined && id !== null);
    const newsIdStrings = newsIds.map((id: any) => String(id));

    const [
      filesMap,
      likeRows,
      commentRows,
      myLikeRows,
    ] = await Promise.all([
      newsIdStrings.length > 0
        ? this.filesManagementService.getLatestFilesByObjectIds('news', newsIdStrings, [
          'id', 'typeSize', 'file_path', 'file_size', 'public_id', 'mime_type',
          'file_name', 'number_of_signed_file', 'updated_at', 'created_at', 'parent_id', 'storage_path'
        ])
        : Promise.resolve({} as Record<string, any[]>),
      newsIds.length > 0
        ? this.newsLikeRepository
          .createQueryBuilder('nl')
          .select('nl.objectId', 'objectId')
          .addSelect('COUNT(1)', 'count')
          .where('nl.type = :type', { type: 'NEWS' })
          .andWhere('nl.isLike = :isLike', { isLike: true })
          .andWhere('nl.objectId IN (:...newsIds)', { newsIds })
          .groupBy('nl.objectId')
          .getRawMany()
        : Promise.resolve([]),
      newsIds.length > 0
        ? this.newsCommentRepository
          .createQueryBuilder('nc')
          .select('nc.newsId', 'newsId')
          .addSelect('COUNT(1)', 'count')
          .where('nc.newsId IN (:...newsIds)', { newsIds })
          .andWhere('(nc.type = :commentType OR nc.type IS NULL OR nc.type = \'\')', { commentType: 'comment' })
          .groupBy('nc.newsId')
          .getRawMany()
        : Promise.resolve([]),
      userId && newsIds.length > 0
        ? this.newsLikeRepository
          .createQueryBuilder('nl')
          .select('nl.objectId', 'objectId')
          .where('nl.type = :type', { type: 'NEWS' })
          .andWhere('nl.userId = :userId', { userId })
          .andWhere('nl.isLike = :isLike', { isLike: true })
          .andWhere('nl.objectId IN (:...newsIds)', { newsIds })
          .groupBy('nl.objectId')
          .getRawMany()
        : Promise.resolve([]),
    ]);

    const likeCountMap = new Map<number, number>(
      likeRows.map((row: any) => [Number(row.objectId), Number(row.count)]),
    );
    const commentCountMap = new Map<number, number>(
      commentRows.map((row: any) => [Number(row.newsId), Number(row.count)]),
    );
    const myLikeSet = new Set<number>(
      myLikeRows.map((row: any) => Number(row.objectId)),
    );

    const enrichedItems = finalItems.map((newsItem: any) => {
      const rawFiles = filesMap[String(newsItem.id)] || [];
      const files = rawFiles.map((file: any) => ({
        id: file.id,
        typeSize: file.typeSize,
        file_path: file.file_path,
        file_size: file.file_size,
        public_id: file.public_id,
        mime_type: file.mime_type,
      }));
      const likeCount = likeCountMap.get(newsItem.id) || 0;
      const commentCount = commentCountMap.get(newsItem.id) || 0;
      const meLike = myLikeSet.has(newsItem.id);

      // Deadline calculation
      const deadlineInfo = this.calculateDeadlineInfo(newsItem.deadline);

      // canUpdatePublished logic
      const canUpdatePublished = isAdminOrApprover || (!!userId && newsItem.authorId === userId);

      const result: any = {
        ...this.formatNewsDateFields(newsItem),
        topic: newsItem.topicEntity?.name || null,
        isNew: fromDateForNew && (newsItem.publishedAt || newsItem.createdAt) >= fromDateForNew ? true : false,
        meLike,
        files,
        likeCount: likeCount || 0,
        commentCount: commentCount || 0,
        ...deadlineInfo,
        canUpdatePublished,
        flags: {
          canUpdatePublished,
        }
      };

      // Map size fields based on typeSize
      if (rawFiles.length > 0) {
        rawFiles.forEach((file: any) => {
          const fileInfo = {
            id: file.id,
            url: `/files/view/${file.id}`,
            filename: file.file_name,
            mimetype: file.mime_type,
            storage_path: file.storage_path,
          };

          if (
            String(file.id) === String(newsItem.sizeSmall) ||
            (!newsItem.sizeSmall && file.typeSize === 'sizeSmall')
          ) {
            result.sizeSmall = fileInfo;
          } else if (
            String(file.id) === String(newsItem.sizeMedium) ||
            (!newsItem.sizeMedium && file.typeSize === 'sizeMedium')
          ) {
            result.sizeMedium = fileInfo;
          } else if (
            String(file.id) === String(newsItem.sizeBig) ||
            (!newsItem.sizeBig && file.typeSize === 'sizeBig')
          ) {
            result.sizeBig = fileInfo;
          }
        });
      }

      return result;
    });

    const result = {
      items: enrichedItems,
      total: total,
      totalPages: Math.ceil(total / limit),
      page: Number(page),
      limit: Number(limit),
    };
    await this.cacheManager.set(cacheKey, result, this.publishedNewsCacheTtl);
    return result;
  }

  /**
   * Duyệt nhiều tin tức cùng một lúc
   */
  async approveNewsMultiple(
    newsIds: number[],
    dto: ApproveNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemIds: string[], // Array of workItemIds tương ứng với newsIds
  ): Promise<{ success: number; failed: number; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < newsIds.length; i++) {
      try {
        const newsId = newsIds[i];
        const workItemId = workItemIds[i];

        if (!workItemId) {
          throw new BadRequestException(`Không tìm thấy workItemId cho tin ${newsId}`);
        }

        const result = await this.approveNews(
          newsId,
          dto,
          userId,
          userName,
          bpmnXML,
          workItemId,
        );

        results.push({
          newsId,
          status: 'success',
          data: result,
        });
      } catch (error) {
        errors.push({
          newsId: newsIds[i],
          status: 'error',
          message: error.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Từ chối nhiều tin tức cùng một lúc
   */
  async rejectNewsMultiple(
    newsIds: number[],
    dto: RejectNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemIds: string[],
  ): Promise<{ success: number; failed: number; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < newsIds.length; i++) {
      try {
        const newsId = newsIds[i];
        const workItemId = workItemIds[i];

        if (!workItemId) {
          throw new BadRequestException(`Không tìm thấy workItemId cho tin ${newsId}`);
        }

        const result = await this.rejectNews(
          newsId,
          dto,
          userId,
          userName,
          bpmnXML,
          workItemId,
        );

        results.push({
          newsId,
          status: 'success',
          data: result,
        });
      } catch (error) {
        errors.push({
          newsId: newsIds[i],
          status: 'error',
          message: error.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Hủy nhiều tin tức cùng một lúc
   */
  async cancelNewsMultiple(
    newsIds: number[],
    dto: CancelNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemIds: string[],
  ): Promise<{ success: number; failed: number; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < newsIds.length; i++) {
      try {
        const newsId = newsIds[i];
        const workItemId = workItemIds[i];

        if (!workItemId) {
          throw new BadRequestException(`Không tìm thấy workItemId cho tin ${newsId}`);
        }

        const result = await this.cancelNews(
          newsId,
          dto,
          userId,
          userName,
          bpmnXML,
          workItemId,
        );

        results.push({
          newsId,
          status: 'success',
          data: result,
        });
      } catch (error) {
        errors.push({
          newsId: newsIds[i],
          status: 'error',
          message: error.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Thu hồi nhiều tin tức cùng lúc
   */
  async recallNewsMultiple(
    newsIds: number[],
    dto: RecallNewsInput,
    userId: string,
    userName: string,
    bpmnXML: string,
    workItemIds: string[],
  ): Promise<{ success: number; failed: number; results: any[]; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < newsIds.length; i++) {
      try {
        const newsId = newsIds[i];
        const workItemId = workItemIds[i];

        if (!workItemId) {
          throw new BadRequestException(`Không tìm thấy workItemId cho tin ${newsId}`);
        }

        const result = await this.recallNews(
          newsId,
          dto,
          userId,
          userName,
          bpmnXML,
          workItemId,
        );

        results.push({
          newsId,
          status: 'success',
          data: result,
        });
      } catch (error) {
        errors.push({
          newsId: newsIds[i],
          status: 'error',
          message: error.message || 'Lỗi không xác định',
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  /**
   * Map chi tiết tin tức với flags và available actions (tương tự mapDocumentDetailsOutgoing)
   */
  private async mapNewsDetailsWithFlags(
    newsItems: any[],
    bpmnXML: string,
    userContext: { userId: string; roles?: string[]; receiverUnit?: string },
  ): Promise<any[]> {
    if (!newsItems.length) return [];

    // Parse BPMN một lần cho tất cả tin
    const { process, indexes } = await this.getModelFromXml(bpmnXML);

    if (!process || !indexes) {
      console.warn('BPMN not available for news workflow');
      return newsItems.map(news => ({
        ...news,
        openWorkItems: [],
        perItems: [],
        workItem: null,
        availableActions: [],
        flags: {
          canUpdatePublished: news.canUpdatePublished,
        },
      }));
    }

    const documentIds = newsItems.map(n => String(n.id));

    // Truy vấn tất cả work items cho các documentIds
    const idList = documentIds.map(id => `'${id}'`).join(',');
    const allWorkItemsRaw = await this.dataSource.query(`
      SELECT id, node_id AS nodeId, role, assignee_user_id AS assigneeUserId, node_type AS nodeType, state, bpmn_version AS bpmnVersion, document_id AS documentId
      FROM work_items WITH (NOLOCK)
      WHERE document_id IN (${idList})
        AND state = 'open'
    `);
    // Map work items theo documentId
    const workItemsMap: Record<string, any[]> = {};
    for (const wi of allWorkItemsRaw) {
      const docId = String(wi.documentId);
      if (!workItemsMap[docId]) workItemsMap[docId] = [];
      workItemsMap[docId].push({
        id: String(wi.id),
        nodeId: wi.nodeId,
        role: wi.role,
        assigneeUserId: wi.assigneeUserId ? String(wi.assigneeUserId) : undefined,
        nodeType: wi.nodeType,
        state: wi.state,
        bpmnVersion: wi.bpmnVersion,
      });
    }

    // Truy vấn tất cả audits cho các documentIds
    const allAuditsRaw = await this.auditRepository.find({
      where: { documentId: In(documentIds), typeDocument: 'NEWS' },
      order: { createdAt: 'ASC' },
    });
    // Map audits theo documentId
    const auditMap: Record<string, any[]> = {};
    for (const a of allAuditsRaw) {
      const docId = String(a.documentId);
      if (!auditMap[docId]) auditMap[docId] = [];
      auditMap[docId].push({
        time: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
        receiver: a.receiver,
        receiverUnit: a.receiverUnit,
        userId: a.userId,
        createdBy: a.createdBy,
        role: a.role,
        roleProcess: a.roleProcess,
        stageStatus: a.stageStatus,
        actionCode: a.actionCode,
        fromNodeId: a.fromNodeId,
        toNodeId: a.toNodeId,
        details: a.details ? JSON.parse(a.details) : undefined,
      });
    }

    // Batch query organization names for authorDepartment IDs
    const authorDepartmentIds = newsItems
      .map(n => n.authorDepartment)
      .filter(Boolean) as string[];

    const orgMap: Record<string, string> = {};
    if (authorDepartmentIds.length > 0) {
      try {
        const uniqueOrgIds = [...new Set(authorDepartmentIds)];
        const orgResults = await this.dataSource.query(
          `SELECT id, name FROM organization_units WHERE id IN (${uniqueOrgIds.map((_, i) => `@${i}`).join(',')})`,
          uniqueOrgIds
        );
        for (const org of orgResults) {
          orgMap[org.id] = org.name;
        }
      } catch (error) {
        console.warn('[WARN] Cannot query organization names:', error.message);
      }
    }

    // Batch query author roles to determine showSubmittedAt
    const authorIds = newsItems
      .map(n => n.authorId)
      .filter(Boolean) as string[];

    const authorRolesMap: Record<string, string[]> = {};
    if (authorIds.length > 0) {
      try {
        const uniqueAuthorIds = [...new Set(authorIds)];
        const authorGroups = await this.groupUserRepository
          .createQueryBuilder('g')
          .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
          .where('ugu.user_id IN (:...userIds)', { userIds: uniqueAuthorIds })
          .getMany();

        // Build map of authorId -> roles
        for (const authorId of uniqueAuthorIds) {
          const userGroups = authorGroups.filter(g => {
            // Check if this group contains this user
            // We need to query the junction table to verify
            return true; // Simplified - will be filtered in next step
          });

          const roles = userGroups.flatMap(g =>
            (g.roles_dynamic || [])
              .filter((r: any) => r.processKey === 'quan_ly_tin_tuc')
              .map((r: any) => r.roleCode)
          ).filter(Boolean);

          authorRolesMap[authorId] = roles;
        }
      } catch (error) {
        console.warn('[WARN] Cannot query author roles:', error.message);
      }
    }

    // Lấy nhóm quyền của user hiện tại (tránh N+1 query)
    let userContextRoles: string[] = [];
    if (userContext.userId) {
      try {
        const userGroups = await this.groupUserRepository
          .createQueryBuilder('g')
          .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
          .where('ugu.user_id = :userId', { userId: userContext.userId })
          .getMany();

        userContextRoles = userGroups.flatMap(g =>
          (g.roles_dynamic || [])
            .filter((r: any) => r.processKey === 'quan_ly_tin_tuc')
            .map((r: any) => r.roleCode)
        ).filter(Boolean);
      } catch (error) {
        console.warn('[WARN] Cannot query userContext groups:', error.message);
      }
    }

    // Gom các topic ID của tin nháp (status = 2) để query một lần (tránh N+1 query)
    const topicIdsToCheck = [...new Set(
      newsItems
        .filter(n => (n.topicId || n.topic) && n.status === 2 && userContext.userId)
        .map(n => n.topicId || n.topic)
    )] as string[];

    const topicsMap = new Map<string, any>();
    if (topicIdsToCheck.length > 0) {
      try {
        const topicEntities = await this.topicRepository.findByIds(topicIdsToCheck);
        for (const topic of topicEntities) {
          topicsMap.set(topic.id, topic);
        }
      } catch (error) {
        console.warn('[WARN] Cannot batch query topics:', error.message);
      }
    }

    // Cache tạm thời danh sách user theo vai trò trong phạm vi request
    const rolesCache = new Map<string, any>();
    const cachedGetUsersByRole = async (role: string) => {
      if (rolesCache.has(role)) {
        return rolesCache.get(role);
      }
      const users = await this.usersService.getUsersByRoleSQL(role);
      rolesCache.set(role, users);
      return users;
    };

    // Cache kết quả computeAvailableActions theo nodeId trong phạm vi request để tránh tính toán lặp lại
    const nodeActionsCache = new Map<string, any>();

    // Main mapping
    const results = await Promise.all(
      newsItems.map(async newsItem => {
        const docId = String(newsItem.id);
        const doc: any = newsItem;

        const docWorkItems = workItemsMap[docId] || [];
        const docAudit = auditMap[docId] || [];

        // Build perItems
        const perItems: any[] = [];
        for (const wi of docWorkItems) {
          const cacheKey = `${wi.nodeId}`;
          let res;
          if (nodeActionsCache.has(cacheKey)) {
            res = nodeActionsCache.get(cacheKey);
          } else {
            res = await this.bpmnEngine.computeAvailableActions({
              process,
              indexes,
              currentNodeId: wi.nodeId,
              workItem: wi,
              document: doc,
              userId: userContext.userId,
              userRoles: userContext.roles || [],
              getUsersByRole: cachedGetUsersByRole,
              audit: docAudit,
              userParent: userContext.receiverUnit,
            });
            nodeActionsCache.set(cacheKey, res);
          }

          perItems.push({
            workItem: wi,
            node: res.node && {
              id: res.node.id,
              name: res.node.name,
              type: res.node.$type,
            },
            availableActions: res.availableActions || [],
            flags: res.flags || {},
          });
        }

        // Summary flags
        const summaryFlags = perItems.reduce(
          (acc, x) => ({
            // canApprove: acc.canApprove || x.flags?.canApprove || false,
            // canReject: acc.canReject || x.flags?.canReject || false,
            // canCancel: acc.canCancel || x.flags?.canCancel || false,
            // canSubmit: acc.canSubmit || x.flags?.canSubmit || false,
            // canRecall: acc.canRecall || x.flags?.canRecall || false,
            canApproveNews: acc.canApproveNews || x.flags?.canApproveNews || false,
            canRejectNews: acc.canRejectNews || x.flags?.canRejectNews || false,
            canCancelNews: acc.canCancelNews || x.flags?.canCancelNews || false,
            canSubmitNews: acc.canSubmitNews || x.flags?.canSubmitNews || false,
            canSaveDraftNews: acc.canSaveDraftNews || x.flags?.canSaveDraftNews || false,
            canRecallNews: acc.canRecallNews || x.flags?.canRecallNews || false,
            canSaveBook: acc.canSaveBook || x.flags?.canSaveBook || false,
            canPublished: acc.canPublished || x.flags?.canPublished || false,
            canPublishDirectly: acc.canPublishDirectly || x.flags?.canPublishDirectly || false,
          }),
          {
            // canApprove: false,
            // canReject: false,
            // canCancel: false,
            // canSubmit: false,
            // canRecall: false,
            canApproveNews: false,
            canRejectNews: false,
            canCancelNews: false,
            canSubmitNews: false,
            canSaveDraftNews: false,
            canRecallNews: false,
            canSaveBook: false,
            canPublished: false,
            canPublishDirectly: false,
          },
        );

        // Kiểm tra topic requiresApproval và vai trò user để điều chỉnh flags
        const topicIdToCheck = (newsItem as any).topicId || newsItem.topic;
        if (topicIdToCheck && newsItem.status === 2 && userContext.userId) {
          try {
            const topicEntity = topicsMap.get(topicIdToCheck);

            if (topicEntity?.requiresApproval) {
              // Topic yêu cầu duyệt - kiểm tra vai trò sử dụng userContextRoles đã load trước đó
              const isApprover = userContextRoles.some((role: string) =>
                ['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(role)
              );
              const isAuthor = newsItem.authorId === userContext.userId;

              if (isApprover) {
                // Admin/Người phê duyệt: có thể xuất bản
                summaryFlags.canPublished = true;
                summaryFlags.canSubmitNews = false;
              } else if (isAuthor) {
                // Người soạn tin: chỉ có thể trình duyệt
                summaryFlags.canPublished = false;
                summaryFlags.canSubmitNews = true;
              }
            } else {
              // Topic không yêu cầu duyệt: chỉ người phê duyệt/admin mới có thể xuất bản
              const isApprover = userContextRoles.some((role: string) =>
                ['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(role)
              );

              if (isApprover) {
                summaryFlags.canPublished = true;
                summaryFlags.canSubmitNews = false;
              } else {
                summaryFlags.canPublished = false;
                summaryFlags.canSubmitNews = false;
              }

              // Thêm logic canPublishDirectly cho NGUOI_TAO_TIN
              const isAuthor = userContextRoles.includes('NGUOI_TAO_TIN');
              if (isAuthor && docWorkItems.length > 0) {
                const currentWorkItem = docWorkItems[0];
                const currentNode = indexes.nodes.get(currentWorkItem.nodeId);

                if (currentNode && currentNode.outgoing) {
                  const hasDuyetTopicFlow = currentNode.outgoing.some((f: any) => {
                    const flowName = f.name?.toUpperCase();
                    if (flowName === 'DUYET_TOPIC') return true;
                    const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
                    return extProps?.flags?.includes('TOPICS');
                  });

                  if (hasDuyetTopicFlow) {
                    summaryFlags.canPublishDirectly = true;
                  }
                }
              }
            }
          } catch (error) {
            console.warn('[WARN] Cannot get topic info:', error.message);
          }
        }

        // Summary item
        const summary =
          perItems.find(x => x.availableActions.some((a: any) => a.canExecute)) ||
          perItems[0] || {
            workItem: null,
            node: null,
            availableActions: [],
            flags: {},
          };

        // Determine showSubmittedAt based on author's role
        let showSubmittedAt = false;
        if (newsItem.authorId && authorRolesMap[newsItem.authorId]) {
          const authorRoles = authorRolesMap[newsItem.authorId];
          const isCreator = authorRoles.includes('NGUOI_TAO_TIN');
          const isAdminOrApprover = authorRoles.some((role: string) =>
            ['ADMIN_NEWS', 'NGUOI_PHE_DUYET'].includes(role)
          );
          showSubmittedAt = isCreator && !isAdminOrApprover;
        }

        return {
          ...newsItem,
          id: newsItem.id,
          authorDepartment: newsItem.authorDepartment ? orgMap[newsItem.authorDepartment] : undefined,
          showSubmittedAt,
          openWorkItems: docWorkItems,
          perItems,
          workItem: summary.workItem,
          availableActions: summary.availableActions || [],
          flags: {
            ...summaryFlags,
            canUpdatePublished: newsItem.canUpdatePublished,
          },
        };
      }),
    );

    return results;
  }
}
