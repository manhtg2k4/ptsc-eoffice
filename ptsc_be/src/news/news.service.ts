import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Like, Not, In, DataSource } from 'typeorm';
import { News } from './entities/news.entity';
import { NewsComment } from './entities/news-comment.entity';
import { NewsLike } from './entities/news-like.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { UpdateNewsCommentDto } from './dto/update-news-comment.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { UploadFileDto } from 'src/files-managerment/upload-file.dto';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import { WorkItemEntity } from 'src/work-items/entities/work-item.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { BpmnEngineService } from 'src/bpmn/bpmn-engine.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { Audit } from 'src/database/schema-sql/audit.entity';
import { TopicEntity } from 'src/topic/entities/topic.entity';
import { NewsView } from './entities/news-view.entity';
import { NewsGateway } from './news.gateway';
import { SystemSettingLogEntity } from 'src/systemLogManagement/system-setting-log.entity';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { sanitizeHtml } from 'src/utils/html-sanitize.util';

const newsPropertyDescriptions: Record<string, string> = {
  id: 'ID tự tăng',
  title: 'Tiêu đề tin tức',
  slug: 'Slug URL thân thiện SEO',
  content: 'Nội dung HTML của tin tức',
  nameThumbnail: 'Tên file ảnh đại diện',
  summary: 'Tóm tắt ngắn gọn',
  isComment: 'Cho phép bình luận hay không',
  isSpecial: 'Đánh dấu tin đặc biệt/nổi bật',
  isImportant: 'Đánh dấu tin quan trọng',
  topic: 'Chủ đề/danh mục tin tức',
  tags: 'Các tag phân loại',
  status: 'Trạng thái',
  publishedAt: 'Ngày xuất bản thực tế',
  scheduledPublishAt: 'Ngày xuất bản theo lịch hẹn',
  viewCount: 'Số lượt xem',
  authorId: 'ID người tạo tin',
  authorName: 'Tên người tạo tin',
  authorDepartment: 'Phòng ban của người tạo tin',
  reviewerId: 'ID người phê duyệt',
  reviewerName: 'Tên người phê duyệt',
  approvedAt: 'Ngày duyệt tin tức',
  department: 'Phòng ban của người gửi',
  submitterId: 'ID người trình duyệt',
  submitterName: 'Tên người trình duyệt',
  submittedAt: 'Ngày trình duyệt',
  deadline: 'Hạn xử lý phê duyệt',
  recalledAt: 'Ngày thu hồi tin đã xuất bản',
  recalledById: 'ID người thu hồi',
  recalledByName: 'Tên người thu hồi',
  recallReason: 'Lý do thu hồi tin',
  rejectorId: 'ID người trả lại tin',
  rejectorName: 'Tên người trả lại tin',
  rejectedAt: 'Ngày trả lại',
  rejectReason: 'Lý do trả lại',
  cancellerId: 'ID người hủy tin',
  cancellerName: 'Tên người hủy tin',
  cancelledAt: 'Ngày hủy tin',
  cancelReason: 'Lý do hủy tin',
  sizeSmall: 'ID ảnh thumbnail size nhỏ',
  sizeMedium: 'ID ảnh thumbnail size trung bình',
  sizeBig: 'ID ảnh thumbnail size lớn',
  createdAt: 'Ngày tạo bản ghi',
  updatedAt: 'Ngày cập nhật cuối cùng',
};

@Injectable()
export class NewsService {
  private readonly publishedNewsCacheVersionKey = 'news:public:published:version';

  constructor(
    @InjectRepository(News, 'mssqlConnection')
    private newsRepository: Repository<News>,
    @InjectRepository(UserEntity, 'mssqlConnection') // <<< Inject repository của UserEntity
    private userRepository: Repository<UserEntity>,
    @InjectRepository(NewsComment, 'mssqlConnection')
    private newsCommentRepository: Repository<NewsComment>,
    @InjectRepository(NewsLike, 'mssqlConnection')
    private newsLikeRepository: Repository<NewsLike>,
    @InjectRepository(WorkItemEntity, 'mssqlConnection')
    private workItemRepository: Repository<WorkItemEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private groupUserRepository: Repository<GroupUserEntity>,
    @InjectRepository(Audit, 'mssqlConnection')
    private auditRepository: Repository<Audit>,
    @InjectRepository(TopicEntity, 'mssqlConnection')
    private topicRepository: Repository<TopicEntity>,
    @InjectRepository(SystemSettingLogEntity, 'mssqlConnection')
    private systemSettingLogRepository: Repository<SystemSettingLogEntity>,
    @InjectRepository(NewsView, 'mssqlConnection')
    private newsViewRepository: Repository<NewsView>,
    private readonly filesManagementService: FilesManagementService,
    private readonly bpmnEngine: BpmnEngineService,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly newsGateway: NewsGateway,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly systemLogService: SystemLogServiceSql,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private async bumpPublishedNewsCacheVersion(): Promise<void> {
    const currentVersion = await this.cacheManager.get<number>(this.publishedNewsCacheVersionKey);
    const normalizedVersion = Number(currentVersion);
    const nextVersion = Number.isFinite(normalizedVersion) && normalizedVersion > 0
      ? normalizedVersion + 1
      : 2;

    await this.cacheManager.set(this.publishedNewsCacheVersionKey, nextVersion);
  }

  public validateNewsStringLengths(payload: Partial<News>): void {
    const columns = this.newsRepository.metadata.columns.filter((column) => {
      const columnType = typeof column.type === 'function'
        ? column.type.name.toLowerCase()
        : String(column.type ?? '').toLowerCase();
      const isStringColumn =
        columnType.includes('char') ||
        columnType === 'varchar' ||
        columnType === 'nvarchar' ||
        columnType === 'string' ||
        columnType.includes('text');
      const maxLength = typeof column.length === 'string' ? column.length : String(column.length ?? '');
      return isStringColumn && maxLength !== '' && maxLength.toUpperCase() !== 'MAX';
    });

    for (const column of columns) {
      const propertyName = column.propertyName as keyof News;
      const rawValue = payload[propertyName];

      if (rawValue === undefined || rawValue === null) continue;
      if (typeof rawValue !== 'string') continue;

      const maxLength = Number(column.length);
      if (!Number.isFinite(maxLength) || maxLength <= 0) continue;

      if (rawValue.length > maxLength) {
        const fieldName = newsPropertyDescriptions[String(propertyName)] || String(propertyName);
        throw new BadRequestException(
          `Trường "${fieldName}" vượt quá độ dài cho phép (${rawValue.length}/${maxLength} ký tự)`,
        );
      }
    }
  }

  /**
   * Hàm riêng để enrich news với workItem
   */
  private async enrichNewsWithWorkItems(newsItem: News, userId?: string, fromDateForNew?: Date): Promise<any> {
    try {
      // Get file info
      const files = await this.filesManagementService.getLatestFilesByObject(
        'news',
        newsItem.id.toString(),
        { page: 1, limit: 10 },
      );

      // Get like count
      const likeCount = await this.newsLikeRepository.count({
        where: { type: 'NEWS', objectId: newsItem.id, isLike: true },
      });

      let meLike = false;
      let meDisLike = false;
      if (userId) {
        const myReaction = await this.newsLikeRepository.findOne({
          where: {
            type: 'NEWS',
            objectId: newsItem.id,
            userId: userId,
          } as any,
        });
        if (myReaction) {
          // Ép kiểu về boolean để tương thích cả bit (0/1) và boolean (true/false)
          meLike = !!myReaction.isLike;
          meDisLike = !myReaction.isLike;
        }
      }

      // Get dislike count
      const dislikeCount = await this.newsLikeRepository.count({
        where: { type: 'NEWS', objectId: newsItem.id, isLike: false },
      });

      // Get comment count (type = 'comment')
      const commentCount = await this.newsCommentRepository.count({
        where: { newsId: newsItem.id, type: 'comment' },
      });

      // Get feedback count (type = 'feedbackNews')
      const feedbackCount = await this.newsCommentRepository.count({
        where: { newsId: newsItem.id, type: 'feedbackNews' },
      });

      // Get all work items
      const workItems = await this.workItemRepository.find({
        where: { documentId: String(newsItem.id) },
        order: { createdAt: 'DESC' },
      });

      // Get work item của user hiện tại (nếu có userId)
      let currentUserWorkItem: WorkItemEntity | null = null;
      let userGroups: Array<{ id: string; name: string; code: string; roles_dynamic: any[] }> = [];
      let userProcessKeys: string[] = [];
      let availableActions: any = null;
      let actionFlags: any = null;

      if (userId) {
        currentUserWorkItem = await this.workItemRepository.findOne({
          where: {
            documentId: String(newsItem.id),
            assigneeUserId: userId,
            state: 'open'
          },
        });

        // Lấy danh sách nhóm quyền của user
        const groups = await this.groupUserRepository
          .createQueryBuilder('g')
          .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
          .where('ugu.user_id = :userId', { userId })
          .getMany();

        userGroups = groups.map(g => ({
          id: g.id,
          name: g.name,
          code: g.code,
          roles_dynamic: g.roles_dynamic || [],
        }));

        // Lấy danh sách processKey từ roles_dynamic
        const processKeysSet = new Set<string>();
        groups.forEach(g => {
          if (g.roles_dynamic && Array.isArray(g.roles_dynamic)) {
            g.roles_dynamic.forEach((role: any) => {
              if (role.processKey) {
                processKeysSet.add(role.processKey);
              }
            });
          }
        });
        userProcessKeys = Array.from(processKeysSet);

        // Tính toán availableActions nếu có workItem
        if (currentUserWorkItem && currentUserWorkItem.bpmnVersion) {
          try {
            // Lấy BPMN XML
            const bpmnXML = await this.sqlRepo.getBpmnFile(currentUserWorkItem.bpmnVersion);

            if (bpmnXML) {
              // Lấy audit log
              const audit = await this.auditRepository.find({
                where: { documentId: String(newsItem.id) },
                order: { createdAt: 'DESC' },
              });

              // Lấy user info
              const user = await this.userRepository.findOne({ where: { id: userId } });
              const userRoles = groups.flatMap(g =>
                (g.roles_dynamic || []).map((r: any) => r.roleCode)
              ).filter(Boolean);

              // Parse BPMN
              const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
              const indexes = this.bpmnEngine.buildIndexes(process);

              // Lấy thông tin topic để kiểm tra requiresApproval
              let topicRequiresApproval = true; // Mặc định cần duyệt
              if (newsItem.topicEntity) {
                topicRequiresApproval = newsItem.topicEntity.requiresApproval !== false;
              } else if (newsItem.topic) {
                try {
                  const topicEntity = await this.topicRepository.findOne({ where: { id: newsItem.topic } });
                  topicRequiresApproval = topicEntity?.requiresApproval !== false;
                } catch (e) {
                  console.warn('[WARN] Cannot get topic requiresApproval:', e.message);
                }
              }

              // Tính toán available actions - truyền topicRequiresApproval vào document
              const actionsResult = await this.bpmnEngine.computeAvailableActions({
                process,
                indexes,
                currentNodeId: currentUserWorkItem.nodeId || '',
                workItem: currentUserWorkItem,
                document: { ...newsItem, topicRequiresApproval },
                userId,
                userRoles,
                getUsersByRole: async (role: string) => {
                  // Lấy users theo role từ group-users
                  const roleGroups = await this.groupUserRepository.find({
                    where: { status: 1 },
                  });

                  const userIdsSet = new Set<string>();
                  roleGroups.forEach(group => {
                    if (group.roles_dynamic && Array.isArray(group.roles_dynamic)) {
                      const hasRole = group.roles_dynamic.some(
                        (r: any) => r.roleCode === role
                      );
                      if (hasRole && group.userId && Array.isArray(group.userId)) {
                        group.userId.forEach(uid => userIdsSet.add(uid));
                      }
                    }
                  });

                  if (userIdsSet.size === 0) {
                    return [];
                  }

                  const users = await this.userRepository.find({
                    where: { id: In(Array.from(userIdsSet)) },
                    select: ['id', 'name'],
                  });

                  return users.map(u => ({
                    id: u.id,
                    name: u.name || u.username,
                  }));
                },
                audit: audit as any[],
                userParent: user?.parent as any,
              });

              availableActions = actionsResult.availableActions;
              actionFlags = actionsResult.flags;

              // Logic thêm cờ canPublishDirectly
              if (!topicRequiresApproval && userRoles.includes('NGUOI_TAO_TIN')) {
                const currentNode = indexes.nodes.get(currentUserWorkItem.nodeId || '');
                if (currentNode && currentNode.outgoing) {
                  const hasDuyetTopicFlow = currentNode.outgoing.some((f: any) => {
                    const flowName = f.name?.toUpperCase();
                    if (flowName === 'DUYET_TOPIC') return true;
                    const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
                    return extProps?.flags?.includes('TOPICS');
                  });

                  if (hasDuyetTopicFlow) {
                    actionFlags = {
                      ...actionFlags,
                      canPublishDirectly: true
                    };
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error computing available actions:', error);
          }
        }
      }

      // Check topic requiresApproval và vai trò user để set flags
      let canPublished = false;
      let canSubmitNews = false;

      if (newsItem.topic && newsItem.status === 2 && userId) {
        try {
          // Re-check topic info if needed, or use cached/logic here
          const topicEntity = await this.topicRepository.findOne({
            where: { id: newsItem.topic }
          });

          if (topicEntity?.requiresApproval) {
            // Topic yêu cầu duyệt
            // Kiểm tra vai trò của user
            const userRoles = userGroups.flatMap(g =>
              (g.roles_dynamic || [])
                .filter((r: any) => r.processKey === workItems?.[0]?.bpmnVersion)
                .map((r: any) => r.roleCode)
            ).filter(Boolean);

            const isApprover = userRoles.some((role: string) =>
              ['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(role)
            );

            if (isApprover) {
              // Admin/Người phê duyệt: có thể xuất bản
              canPublished = true;
              canSubmitNews = false;
            } else {
              // Tác giả: có thể submit
              canPublished = false;
              canSubmitNews = true;
            }
          } else {
            // Topic không yêu cầu duyệt: chỉ người phê duyệt/admin mới có thể xuất bản
            const userRoles = userGroups.flatMap(g =>
              (g.roles_dynamic || [])
                .filter((r: any) => r.processKey === workItems?.[0]?.bpmnVersion)
                .map((r: any) => r.roleCode)
            ).filter(Boolean);

            const isApprover = userRoles.some((role: string) =>
              ['NGUOI_PHE_DUYET', 'ADMIN_NEWS'].includes(role)
            );

            if (isApprover) {
              canPublished = true;
              canSubmitNews = false;
            } else {
              canPublished = false;
              canSubmitNews = false;
            }
          }
        } catch (error) {
          console.warn('[WARN] Cannot get topic info:', error.message);
        }

        // Merge flags vào actionFlags - chỉ ghi đè khi status === 2 (đang soạn thảo)
        actionFlags = {
          ...actionFlags,
          canPublished,
          canSubmitNews,
        };
      }


      // Phân định vai trò người dùng đối với tin tức
      const isCreator = userId ? (String(newsItem.authorId) === String(userId) || String(newsItem.submitterId) === String(userId)) : false;
      const allUserRoles = userGroups.flatMap(g =>
        (g.roles_dynamic || []).map((r: any) => r.roleCode)
      ).filter(Boolean);
      const isApprover = userId ? (
        allUserRoles.some((role: string) => ['NGUOI_PHE_DUYET', 'ADMIN_NEWS', 'VAN_THU_NEWS'].includes(role)) ||
        String(newsItem.reviewerId) === String(userId)
      ) : false;

      let userRoleInNews: 'CREATOR' | 'APPROVER' | 'BOTH' | 'OTHER' = 'OTHER';
      if (isCreator && isApprover) userRoleInNews = 'BOTH';
      else if (isCreator) userRoleInNews = 'CREATOR';
      else if (isApprover) userRoleInNews = 'APPROVER';

      const result: any = {
        ...newsItem,
        topic: newsItem.topicEntity?.name || null,
        isNew: fromDateForNew && (newsItem.publishedAt || newsItem.createdAt) >= fromDateForNew ? true : false,
        likeCount: likeCount || 0,
        dislikeCount: dislikeCount || 0,
        meLike,
        meDisLike,
        commentCount: commentCount || 0,
        feedbackCount: feedbackCount || 0,
        workItems: workItems || [],
        currentUserWorkItem,
        userGroups,
        userProcessKeys,
        availableActions,
        actionFlags,
        isCreator,
        isApprover,
        userRoleInNews,
      };

      // Map topic name - validate UUID first (backward compatibility)
      if (!result.topic && newsItem.topic) {
        try {
          // Validate topic is a valid UUID before querying
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(newsItem.topic)) {
            const topic = await this.topicRepository.findOne({
              where: { id: newsItem.topic }
            });
            if (topic) {
              result.topic = topic.name;
            }
          } else {
            // Old data: topic is already a name (not UUID), keep it as is
            result.topic = newsItem.topic;
          }
        } catch (error) {
          console.error(`Error fetching topic for news ${newsItem.id}:`, error);
          // Fallback: use topic value as name if it's not a UUID
          result.topic = newsItem.topic;
        }
      }

      if (files.data && files.data.length > 0) {
        result.files = files.data.map(file => ({
          id: file.id,
          url: `/files/view/${file.id}`,
          filename: file.file_name,
          mimetype: file.mime_type,
          storage_path: file.storage_path,
        }));

        // Giữ thumbnail để backward compatibility
        const file = files.data[0];
        result.thumbnail = {
          id: file.id,
          url: `/files/view/${file.id}`,
          filename: file.file_name,
          mimetype: file.mime_type,
          storage_path: file.storage_path,
        };

        // Map size fields based on typeSize
        files.data.forEach((file) => {
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
      } else {
        result.files = [];
      }

      // Map authorDepartment ID to organization name
      if (newsItem.authorDepartment) {
        try {
          const orgResult = await this.dataSource.query(
            `SELECT id,name FROM organization_units WHERE id = @0`,
            [newsItem.authorDepartment]
          );
          if (orgResult?.[0]?.name) {
            result.authorDepartment = orgResult[0];
          }
        } catch (error) {
          console.warn(`[WARN] Cannot query organization name for authorDepartment ${newsItem.authorDepartment}:`, error.message);
        }
      }

      // Determine showSubmittedAt based on author's role
      let showSubmittedAt = false;
      if (newsItem.authorId) {
        try {
          const authorGroups = await this.groupUserRepository
            .createQueryBuilder('g')
            .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = g.id')
            .where('ugu.user_id = :userId', { userId: newsItem.authorId })
            .getMany();

          const authorRoles = authorGroups.flatMap(g =>
            (g.roles_dynamic || [])
              .filter((r: any) => r.processKey === 'quan_ly_tin_tuc')
              .map((r: any) => r.roleCode)
          ).filter(Boolean);

          // NGUOI_TAO_TIN phải trình duyệt → có submittedAt
          // ADMIN_NEWS, NGUOI_PHE_DUYET tạo tin được duyệt luôn → không có submittedAt
          const isCreator = authorRoles.includes('NGUOI_TAO_TIN');
          const isAdminOrApprover = authorRoles.some((role: string) =>
            ['ADMIN_NEWS', 'NGUOI_PHE_DUYET'].includes(role)
          );

          showSubmittedAt = isCreator && !isAdminOrApprover;
        } catch (error) {
          console.warn(`[WARN] Cannot determine author role for showSubmittedAt:`, error.message);
        }
      }
      result.showSubmittedAt = showSubmittedAt;

      // canUpdatePublished logic
      let canUpdatePublished = false;
      if (userId) {
        const isAdminOrApprover = await this.checkUserIsAdminOrApprover(userId);
        canUpdatePublished = isAdminOrApprover || String(newsItem.authorId) === String(userId);
      }
      result.canUpdatePublished = canUpdatePublished;
      result.flags = {
        canUpdatePublished,
      };

      return result;
    } catch (error) {
      console.error(`Error enriching news ${newsItem.id}:`, error);
      return newsItem;
    }
  }

  /**
   * Enrich news items với Files, LikeCount, CommentCount và cờ isNew cho API Public
   */
  private async enrichNewsForPublic(data: News[], options?: { includeFiles?: boolean }): Promise<any[]> {
    const enrichStart = Date.now();

    const settings = await this.systemSettingLogRepository.findOne({ where: { type: 'news' } });
    const newArticlesDays = settings?.newArticlesDays || 5;
    const fromDateForNew = new Date();
    fromDateForNew.setDate(fromDateForNew.getDate() - newArticlesDays);

    const newsIds = data.map((newsItem) => newsItem.id);
    const objectIds = newsIds.map(String);

    // [LOG] Enrich steps
    const stepFilesStart = Date.now();
    const filesByObjectId = await this.filesManagementService.getLatestFilesByObjectIds('news', objectIds);

    const stepLikeStart = Date.now();
    const likeCounts = await this.getNewsReactionCounts(newsIds, true);

    const stepCommentStart = Date.now();
    const commentCounts = await this.getNewsCommentCounts(newsIds, 'comment');

    const stepFeedbackStart = Date.now();
    const feedbackCounts = await this.getNewsCommentCounts(newsIds, 'feedbackNews');

    const includeFiles = options?.includeFiles !== false;

    return data.map((newsItem) => {
      const files = filesByObjectId[String(newsItem.id)] || [];
      const result: any = {
        ...newsItem,
        topic: newsItem.topicEntity?.name || null,
        isNew: fromDateForNew && (newsItem.publishedAt || newsItem.createdAt) >= fromDateForNew ? true : false,
        likeCount: likeCounts.get(newsItem.id) || 0,
        commentCount: commentCounts.get(newsItem.id) || 0,
        feedbackCount: feedbackCounts.get(newsItem.id) || 0,
      };

      if (includeFiles) {
        result.files = files;
      }

      if (files.length > 0) {
        const file = files[0];
        result.thumbnail = {
          id: file.id,
          url: `/files/view/${file.id}`,
          filename: file.file_name,
          mimetype: file.mime_type,
          storage_path: file.storage_path,
        };
        files.forEach((file) => {
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
  }

  private normalizePublicPagination(query: any = {}, defaultLimit = 10, maxLimit = 50) {
    const page = Math.max(1, Number.parseInt(String(query.page ?? ''), 10) || 1);
    const requestedLimit = Number.parseInt(String(query.limit ?? ''), 10);
    const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : defaultLimit));
    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  private applyPublicListSelect(queryBuilder: any) {
    queryBuilder.select([
      'news.id',
      'news.title',
      'news.slug',
      'news.nameThumbnail',
      'news.summary',
      'news.isComment',
      'news.isSpecial',
      'news.isImportant',
      'news.topic',
      'news.tags',
      'news.status',
      'news.publishedAt',
      'news.scheduledPublishAt',
      'news.viewCount',
      'news.authorId',
      'news.authorName',
      'news.authorDepartment',
      'news.department',
      'news.sizeSmall',
      'news.sizeMedium',
      'news.sizeBig',
      'news.createdAt',
      'news.updatedAt',
      'topic.id',
      'topic.name',
      'topic.requiresApproval',
    ]);
  }

  private applyPublicSuggestedListSelect(queryBuilder: any) {
    queryBuilder.select([
      'news.id',
      'news.title',
      'news.slug',
      'news.nameThumbnail',
      'news.isComment',
      'news.isSpecial',
      'news.isImportant',
      'news.topic',
      'news.tags',
      'news.status',
      'news.publishedAt',
      'news.scheduledPublishAt',
      'news.viewCount',
      'news.authorId',
      'news.authorName',
      'news.authorDepartment',
      'news.department',
      'news.sizeSmall',
      'news.sizeMedium',
      'news.sizeBig',
      'news.createdAt',
      'news.updatedAt',
      'topic.id',
      'topic.name',
      'topic.requiresApproval',
    ]);
  }

  private async getNewsReactionCounts(newsIds: number[], isLike: boolean): Promise<Map<number, number>> {
    if (!newsIds.length) return new Map();

    const rows = await this.newsLikeRepository
      .createQueryBuilder('reaction')
      .select('reaction.objectId', 'objectId')
      .addSelect('COUNT(1)', 'count')
      .where('reaction.type = :type', { type: 'NEWS' })
      .andWhere('reaction.isLike = :isLike', { isLike })
      .andWhere('reaction.objectId IN (:...newsIds)', { newsIds })
      .groupBy('reaction.objectId')
      .getRawMany();

    return new Map(rows.map((row) => [Number(row.objectId), Number(row.count) || 0]));
  }

  private async getNewsCommentCounts(newsIds: number[], type: string): Promise<Map<number, number>> {
    if (!newsIds.length) return new Map();

    const rows = await this.newsCommentRepository
      .createQueryBuilder('comment')
      .select('comment.newsId', 'newsId')
      .addSelect('COUNT(1)', 'count')
      .where('comment.type = :type', { type })
      .andWhere('comment.newsId IN (:...newsIds)', { newsIds })
      .groupBy('comment.newsId')
      .getRawMany();

    return new Map(rows.map((row) => [Number(row.newsId), Number(row.count) || 0]));
  }

  /**
   * Helper: Normalize filter params từ query string
   * Hỗ trợ filter[key] syntax và fallback về các field riêng lẻ
   */
  private normalizeFilterParams(query: any) {
    const { filter, topic, status, type, organizationUnitId, isComment, ...rest } = query;

    // Ưu tiên filter object, fallback về các fields riêng lẻ
    return {
      ...rest,
      q: filter?.q,  // Tìm kiếm tổng quát
      orFields: filter?.orFields,  // Tìm OR theo nhiều fields
      topic: filter?.topic || topic,
      status: filter?.status || status,
      type: filter?.type || type,
      organizationUnitId: filter?.organizationUnitId || organizationUnitId,
      isComment: filter?.isComment !== undefined ? filter.isComment : isComment,
      isSpecial: filter?.isSpecial !== undefined ? filter.isSpecial : query.isSpecial,
      isImportant: filter?.isImportant !== undefined ? filter.isImportant : query.isImportant,
      title: filter?.title,
      tags: filter?.tags,
      rejectorName: filter?.rejectorName,
      submitterName: filter?.submitterName,
      authorName: filter?.authorName,
      reviewerName: filter?.reviewerName,
      submittedAt: filter?.submittedAt,  // { startDate, endDate }
      deadline: filter?.deadline,  // { startDate, endDate }
      createdAt: filter?.createdAt,  // { startDate, endDate }
      recalledAt: filter?.recalledAt,
      publishedAt: filter?.publishedAt,
      search: filter?.search,
      remainingTime: filter?.remainingTime ?? query.remainingTime,
    };
  }

  /**
   * Helper: Apply các điều kiện tìm kiếm chung cho news entity
   * Tái sử dụng ở tất cả các hàm danh sách public API
   * 
   * Hỗ trợ 3 loại tìm kiếm:
   * 1. filter[q] - Tìm tất cả các trường với cùng 1 giá trị (OR)
   * 2. filter[orFields][field1]=value1&filter[orFields][field2]=value2 - Tìm OR với giá trị khác nhau cho mỗi field
   * 3. filter[field] - Tìm riêng lẻ từng trường (AND giữa các filter khác nhau)
   */
  private applyNewsSearchFilters(
    queryBuilder: any,
    filters: {
      q?: string;           // Tìm kiếm tổng quát (search all fields with same value)
      orFields?: any;       // Tìm OR theo nhiều fields với giá trị khác nhau
      search?: string;      // Tìm trong content/tags (legacy)
      title?: string;
      tags?: string;
      topic?: string;
      status?: number | string;
      type?: string;
      rejectorName?: string;
      submitterName?: string;
      authorName?: string;
      reviewerName?: string;
      isComment?: boolean | string | number;
      isSpecial?: boolean | string | number;
      isImportant?: boolean | string | number;
      submittedAt?: { startDate?: string; endDate?: string };
      deadline?: { startDate?: string; endDate?: string };
      createdAt?: { startDate?: string; endDate?: string };
      publishedAt?: { startDate?: string; endDate?: string };
      recalledAt?: { startDate?: string; endDate?: string };
      remainingTime?: boolean | string;
    }
  ) {
    const {
      q,
      orFields,
      search,
      title,
      tags,
      topic,
      status,
      type,
      rejectorName,
      submitterName,
      authorName,
      reviewerName,
      isComment,
      isSpecial,
      isImportant,
      submittedAt,
      deadline,
      createdAt,
      publishedAt,
      recalledAt,
      remainingTime
    } = filters;

    // MODE 1: filter[q] - Tìm tổng quát (search cùng 1 giá trị trên tất cả các trường text)
    if (q && q.trim()) {
      const searchValue = q.trim();
      queryBuilder.andWhere(
        `(
          news.title COLLATE Latin1_General_CI_AI LIKE :q OR 
          news.content COLLATE Latin1_General_CI_AI LIKE :q OR 
          news.tags COLLATE Latin1_General_CI_AI LIKE :q OR 
          news.summary COLLATE Latin1_General_CI_AI LIKE :q OR 
          news.slug COLLATE Latin1_General_CI_AI LIKE :q OR
          news.submitterName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.authorName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.rejectorName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.reviewerName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.cancellerName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.recalledByName COLLATE Latin1_General_CI_AI LIKE :q OR
          news.department COLLATE Latin1_General_CI_AI LIKE :q
        )`,
        { q: `%${searchValue}%` }
      );
      return queryBuilder;
    }

    // MODE 2: filter[orFields] - Tìm OR với giá trị khác nhau cho mỗi field
    if (orFields && typeof orFields === 'object') {
      const orConditions: string[] = [];
      const orParams: any = {};

      Object.entries(orFields).forEach(([field, value], index) => {
        if (value && String(value).trim()) {
          const paramName = `orField${index}`;
          orConditions.push(`news.${field} COLLATE Latin1_General_CI_AI LIKE :${paramName}`);
          orParams[paramName] = `%${String(value).trim()}%`;
        }
      });

      if (orConditions.length > 0) {
        queryBuilder.andWhere(`(${orConditions.join(' OR ')})`, orParams);
        return queryBuilder;
      }
    }

    // MODE 3: Individual filters (AND logic giữa các filter)

    // Legacy full-text search
    if (search) {
      queryBuilder.andWhere(
        '(news.title COLLATE Latin1_General_CI_AI LIKE :search OR news.content COLLATE Latin1_General_CI_AI LIKE :search OR news.tags COLLATE Latin1_General_CI_AI LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Tìm kiếm title
    if (title) {
      queryBuilder.andWhere('news.title COLLATE Latin1_General_CI_AI LIKE :title', { title: `%${title}%` });
    }

    // Tìm kiếm tags
    if (tags) {
      queryBuilder.andWhere('news.tags COLLATE Latin1_General_CI_AI LIKE :tags', { tags: `%${tags}%` });
    }

    // Filter theo submitterName
    if (submitterName) {
      queryBuilder.andWhere('news.submitterName COLLATE Latin1_General_CI_AI LIKE :submitterName', { submitterName: `%${submitterName}%` });
    }

    // Filter theo authorName
    if (authorName) {
      queryBuilder.andWhere('news.authorName COLLATE Latin1_General_CI_AI LIKE :authorName', { authorName: `%${authorName}%` });
    }

    // Filter theo reviewerName
    if (reviewerName) {
      queryBuilder.andWhere('news.reviewerName COLLATE Latin1_General_CI_AI LIKE :reviewerName', { reviewerName: `%${reviewerName}%` });
    }

    // Filter theo rejectorName
    if (rejectorName) {
      queryBuilder.andWhere('news.rejectorName COLLATE Latin1_General_CI_AI LIKE :rejectorName', { rejectorName: `%${rejectorName}%` });
    }

    // Filter theo type
    if (type) {
      queryBuilder.andWhere('news.type = :type', { type });
    }

    // Filter theo topic
    if (topic) {
      queryBuilder.andWhere('news.topic = :topic', { topic });
    }

    // Filter theo isComment
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

    // Filter theo isSpecial
    if (isSpecial !== undefined && isSpecial !== null) {
      const isSpecialValue = (isSpecial === true || isSpecial === 'true' || isSpecial === '1' || isSpecial === 1) ? 1 : 0;
      queryBuilder.andWhere('news.isSpecial = :isSpecial', { isSpecial: isSpecialValue });
    }

    // Filter theo isImportant
    if (isImportant !== undefined && isImportant !== null) {
      const isImportantValue = (isImportant === true || isImportant === 'true' || isImportant === '1' || isImportant === 1) ? 1 : 0;
      queryBuilder.andWhere('news.isImportant = :isImportant', { isImportant: isImportantValue });
    }

    // Logic cho remainingTime (true: quá hạn, false: còn hạn)
    if (remainingTime !== undefined && remainingTime !== null) {
      const isStillValid = remainingTime === 'true' || remainingTime === true || remainingTime === '1';
      if (isStillValid) {
        queryBuilder.andWhere('news.deadline >= GETDATE()');
      } else {
        queryBuilder.andWhere('news.deadline < GETDATE()');
      }
    }

    // Date range filters
    // submittedAt
    const dateFilters = [
      { field: 'news.submittedAt', value: submittedAt },
      { field: 'news.deadline', value: deadline },
      { field: 'news.createdAt', value: createdAt },
      { field: 'news.recalledAt', value: recalledAt },
      { field: 'news.publishedAt', value: publishedAt },
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

    return queryBuilder;
  }

  async create(dto: CreateNewsDto, userFromJwt: any, ipAddress?: string): Promise<News> {
    try {
      const slug = this.generateSlug(dto.title);

      // Check if slug already exists
      const existingNews = await this.newsRepository.findOne({ where: { slug } });
      if (existingNews) {
        throw new BadRequestException('Tin tức với tiêu đề này đã tồn tại');
      }

      // Lấy userId từ JWT (thường là string ObjectId hoặc number)
      const jwtUserId: string = userFromJwt.user || userFromJwt.sub || userFromJwt.userId || userFromJwt.id;

      if (!jwtUserId) {
        throw new BadRequestException('Không tìm thấy ID người dùng trong token');
      }

      // Tìm user trong database bằng ID từ JWT
      const user = await this.userRepository.findOne({
        where: {
          // Nếu dùng MSSQL với id number
          id: jwtUserId,
        } as any,
      });

      if (!user) {
        throw new NotFoundException('Người dùng không tồn tại trong hệ thống');
      }
      const authorId = (user as any)._id?.toString() || (user as any).id;
      const authorName = user.username || user.name || 'Unknown';

      // normalize payload first (avoid string -> Date type error)
      const normalizedDto: any = { ...dto };
      if (normalizedDto.publishedAt) {
        normalizedDto.publishedAt = new Date(normalizedDto.publishedAt as any);
      } else if (normalizedDto.status === 1) {
        normalizedDto.publishedAt = new Date();
      }

      if (normalizedDto.scheduledPublishAt) {
        normalizedDto.scheduledPublishAt = new Date(normalizedDto.scheduledPublishAt as any);
      }

      // Ensure tags is a string (if sent as array from frontend)
      if (normalizedDto.tags && Array.isArray(normalizedDto.tags)) {
        normalizedDto.tags = normalizedDto.tags.join(',');
      }

      // Ensure size fields are strings (extract ID if they are objects)
      const sizeFields = ['sizeSmall', 'sizeMedium', 'sizeBig'];
      sizeFields.forEach(field => {
        if (normalizedDto[field] !== undefined && normalizedDto[field] !== null) {
          if (typeof normalizedDto[field] === 'object') {
            normalizedDto[field] = normalizedDto[field].id ? String(normalizedDto[field].id) : JSON.stringify(normalizedDto[field]);
          } else {
            normalizedDto[field] = String(normalizedDto[field]);
          }
        }
      });

      // Handle topic if it's an object
      let topicValue = normalizedDto.topic;
      if (topicValue && typeof topicValue === 'object') {
        topicValue = topicValue.id || String(topicValue);
      }

      // Validate topic is valid UUID or set to undefined
      let validTopic: string | undefined = undefined;
      if (topicValue) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(topicValue)) {
          validTopic = topicValue;
        } else {
          console.warn(`Invalid topic UUID provided: ${topicValue}, setting to undefined`);
        }
      }

      const newsData: Partial<News> = {
        ...normalizedDto,
        slug,
        // ensure string to satisfy NVARCHAR in MSSQL
        authorId: authorId != null ? String(authorId) : undefined,
        authorName,
        status: normalizedDto.status ?? 2,
        topic: validTopic,
        // Sanitize HTML content to prevent XSS
        content: normalizedDto.content ? sanitizeHtml(normalizedDto.content) : normalizedDto.content,
      };

      this.validateNewsStringLengths(newsData);

      const news = this.newsRepository.create(newsData);

      if (news.isSpecial && news.status === 1) {
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

      const savedNews = await this.newsRepository.save(news);
      await this.bumpPublishedNewsCacheVersion();
      const finalNews = Array.isArray(savedNews) ? savedNews[0] : savedNews;

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Tạo tin tức thành công: ${dto.title}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_CREATE',
        userInfo: jwtUserId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return finalNews;
    } catch (error) {
      console.error('Lỗi tạo tin tức:', error);

      const jwtUserId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || "";
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Tạo tin tức thất bại: ${dto.title} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_CREATE',
        userInfo: String(jwtUserId),
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Không thể tạo tin tức: ' + error.message);
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    filter?: {
      title?: string;
    };
    includeDeleted?: boolean;
  }) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.newsRepository.createQueryBuilder('news');

      // ===== STATUS LOGIC =====
      if (query.includeDeleted) {
        // admin xem tất cả
        queryBuilder.andWhere('news.status IN (:...statuses)', { statuses: [1, 2, 3] });
      } else {
        // user thường: chỉ lấy active
        queryBuilder.andWhere('news.status = :status', { status: 1 });
      }

      // ===== FILTER TITLE =====
      // Use helper for consistent search (CI/AI)
      if (query.filter?.title) {
        this.applyNewsSearchFilters(queryBuilder, {
          title: query.filter.title
        });
      }

      queryBuilder
        .orderBy('news.publishedAt', 'DESC')
        .addOrderBy('news.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [items, total] = await queryBuilder.getManyAndCount();

      // Lấy cấu hình số ngày để gắn cờ isNew
      const settings = await this.systemSettingLogRepository.findOne({ where: { type: 'news' } });
      const newArticlesDays = settings?.newArticlesDays || 5;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - newArticlesDays);

      // Map file information và workItems cho từng news item
      const itemsWithFiles = await Promise.all(
        items.map((item) => this.enrichNewsWithWorkItems(item, undefined, fromDate)),
      );

      return {
        items: itemsWithFiles,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('findAll news error:', error);
      throw new BadRequestException(
        'Lỗi khi lấy danh sách tin tức: ' + error.message,
      );
    }
  }


  async findOne(id: number, includeDeleted = false, userId?: string, shouldIncrement = false): Promise<any> {
    try {
      const where: any = { id };

      const news = await this.newsRepository.findOne({
        where,
        relations: ['topicEntity']
      });
      if (!news) {
        throw new NotFoundException('Tin tức không tồn tại hoặc đã bị xóa');
      }

      // Increment view count if requested
      if (shouldIncrement && !includeDeleted && news.status === 1) {
        await this.incrementViewCount(id, userId);
        // Reload news to get updated viewCount
        const updatedNews = await this.newsRepository.findOne({ where: { id } });
        if (updatedNews) {
          news.viewCount = updatedNews.viewCount;
        }
      }

      // Enrich với file, like, comment, workItems và thông tin user
      const result = await this.enrichNewsWithWorkItems(news, userId);

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Lỗi khi lấy tin tức' + error.message);
    }
  }
  async findOneCancel(id: number, includeDeleted = false, userId?: string): Promise<any> {
    try {
      const where: any = { id };
      if (!includeDeleted) {
        where.status = 3;
      }

      const news = await this.newsRepository.findOne({ where });
      if (!news) {
        throw new BadRequestException('Tin tức chưa được hủy');
      }

      // NO automatic increment in findOneCancel unless specifically needed
      // (This was previously broken anyway as it checked news.status === 1)

      // Enrich với file, like, comment, workItems và thông tin user
      const result = await this.enrichNewsWithWorkItems(news, userId);

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Lỗi khi lấy tin tức' + error.message);
    }
  }

  async checkTitleExists(title: string, excludeId?: number): Promise<boolean> {
    const query = this.newsRepository.createQueryBuilder('news')
      .where('LOWER(news.title) = LOWER(:title)', { title: title.trim() });

    if (excludeId) {
      query.andWhere('news.id != :id', { id: excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  async findBySlug(slug: string): Promise<News> {
    try {
      const news = await this.newsRepository.findOneBy({
        slug,
        status: 1, // chỉ hiển thị public nếu đã đăng
      });

      if (!news) {
        throw new NotFoundException('Tin tức không tồn tại hoặc chưa được đăng');
      }
      return news;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Lỗi khi lấy tin theo slug' + error.message);
    }
  }

  async update(id: number, dto: UpdateNewsDto, ipAddress?: string, userId?: string): Promise<News> {
    try {
      const news = await this.newsRepository.findOne({ where: { id } });
      if (!news) {
        throw new NotFoundException(`Tin tức với ID ${id} không tồn tại`);
      }

      // --- KIỂM TRA QUYỀN CHỈNH SỬA ---
      const isAdminOrApprover = await this.checkUserIsAdminOrApprover(userId);
      const isCreator = String(news.authorId) === String(userId);

      if (!isAdminOrApprover && !isCreator) {
        const message = news.status === 1
          ? 'Tin tức đã được duyệt, chỉ Admin, Người phê duyệt hoặc Người tạo mới được phép chỉnh sửa'
          : 'Bạn không có quyền chỉnh sửa tin tức này vì bạn không phải người tạo hoặc người phê duyệt';
        throw new BadRequestException(message);
      }
      // --- KẾT THÚC KIỂM TRA QUYỀN CHỈNH SỬA ---

      if (dto.title && dto.title !== news.title) {
        const titleExists = await this.checkTitleExists(dto.title, id);
        if (titleExists) {
          throw new BadRequestException('Tên bài viết đã tồn tại trong hệ thống');
        }
        dto['slug'] = this.generateSlug(dto.title);
      }

      // Nếu chuyển sang status = 1 (đăng bài)
      if (dto.status === 1 && news.status !== 1) {
        dto['publishedAt'] = new Date();
      }

      // Nếu chuyển về nháp hoặc xóa, có thể xóa publishedAt nếu muốn
      if (dto.status !== 1 && news.publishedAt) {
        // giữ lại publishedAt lần đầu hoặc set null tùy bạn
      }

      const updates: any = { ...dto };

      if (updates.publishedAt) {
        updates.publishedAt = new Date(updates.publishedAt as any);
      }

      if (updates.scheduledPublishAt) {
        updates.scheduledPublishAt = new Date(updates.scheduledPublishAt as any);
      }

      // Handle topic if it's an object (common in frontend frameworks)
      if (updates.topic && typeof updates.topic === 'object') {
        updates.topic = updates.topic.id || String(updates.topic);
      }

      // Validate topic is valid UUID or set to undefined
      if (updates.topic !== undefined) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (updates.topic && !uuidRegex.test(updates.topic)) {
          console.warn(`Invalid topic UUID provided: ${updates.topic}, setting to undefined`);
          updates.topic = undefined;
        }
      }

      // Ensure tags is a string (if sent as array from frontend)
      if (updates.tags && Array.isArray(updates.tags)) {
        updates.tags = updates.tags.join(',');
      }

      // Xử lý khi yêu cầu xóa ảnh đại diện
      if (
        updates.removeThumbnail === true ||
        updates.nameThumbnail === '' ||
        updates.nameThumbnail === null
      ) {
        updates.nameThumbnail = null;
        updates.sizeSmall = null;
        updates.sizeMedium = null;
        updates.sizeBig = null;

        try {
          const request = await this.sqlRepo.getRequest();
          await request
            .input('id', String(id))
            .query(`
              UPDATE fr SET fr.status = 0
              FROM file_relations fr
              WHERE fr.object_type = 'news'
                AND CAST(fr.object_id AS NVARCHAR(255)) = @id
                AND fr.status = 1
            `);
        } catch (err) {
          console.error(`Error deactivating file_relations for news ${id}:`, err);
        }
      }


      // Ensure size fields are strings (extract ID if they are objects)
      const sizeFields = ['sizeSmall', 'sizeMedium', 'sizeBig'];
      sizeFields.forEach(field => {
        if (updates[field] !== undefined && updates[field] !== null) {
          if (typeof updates[field] === 'object') {
            updates[field] = updates[field].id ? String(updates[field].id) : JSON.stringify(updates[field]);
          } else {
            updates[field] = String(updates[field]);
          }
        }
      });

      // ensure authorId stays string for NVARCHAR column
      if (news.authorId !== undefined && news.authorId !== null) {
        news.authorId = String(news.authorId);
      }
      if (updates.authorId !== undefined && updates.authorId !== null) {
        updates.authorId = String(updates.authorId as any);
      }

      // remove undefined to avoid overwriting existing values with undefined
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      // Sanitize HTML content to prevent XSS
      if (updates.content) {
        updates.content = sanitizeHtml(updates.content);
      }

      const wasSpecialActive = news.isSpecial === true && news.status === 1;

      Object.assign(news, updates);
      this.validateNewsStringLengths(news);

      const isSpecialActive = news.isSpecial === true && news.status === 1;

      if (isSpecialActive && !wasSpecialActive) {
        const count = await this.newsRepository.count({
          where: {
            isSpecial: true,
            status: 1,
            id: Not(id),
          },
        });
        if (count >= 10) {
          throw new BadRequestException('Chỉ cho phép tối đa 10 tin nổi bật (isSpecial) đã xuất bản hoạt động trên hệ thống. Vui lòng gỡ nổi bật ở tin khác trước.');
        }
      }

      const savedResult = await this.newsRepository.save(news);
      await this.bumpPublishedNewsCacheVersion();

      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Tin tức: Cập nhật tin tức thành công ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_UPDATE',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return savedResult;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Tin tức: Cập nhật tin tức thất bại ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_UPDATE',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Không thể cập nhật tin tức: ' + error.message);
    }
  }

  // XÓA MỀM: chỉ cập nhật status = 3
  async remove(id: number, ipAddress?: string, userId?: string): Promise<{ message: string }> {
    try {
      const news = await this.findOne(id, true); // tìm cả đã xóa (nếu xóa nhầm)

      if (news.status === 3) {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Tin tức: Thông báo tin tức đã xóa trước đó ID ${id}`,
          method: 'DELETE',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_DELETE',
          userInfo: userId || "",
          ipAddress: ipAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
        return { message: 'Tin tức đã ở trạng thái xóa trước đó' };
      }

      news.status = 3;
      await this.newsRepository.save(news);
      await this.bumpPublishedNewsCacheVersion();

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Tin tức: Xóa mềm tin tức thành công ID ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DELETE',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return { message: 'Tin tức đã được xóa mềm thành công' };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Tin tức: Xóa mềm tin tức thất bại ID ${id} - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DELETE',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Không thể xóa tin tức');
    }
  }

  // src/news/news.service.ts

  async removeMany(ids: number[], ipAddress?: string, userId?: string): Promise<{ message: string; deletedCount: number }> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('Danh sách ID không được rỗng');
      }

      // Kiểm tra các tin có tồn tại và không phải đã xóa rồi (tùy chọn)
      const newsItems = await this.newsRepository.find({
        where: { id: In(ids) },
        select: ['id', 'status'],
      });

      const validIds = newsItems.map(item => item.id);
      const alreadyDeleted = newsItems.filter(item => item.status === 3).map(item => item.id);

      const idsToDelete = validIds.filter(id => !alreadyDeleted.includes(id));

      if (idsToDelete.length === 0) {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Tin tức: Xóa mềm hàng loạt - Không có tin nào cần xóa`,
          method: 'DELETE',
          status: 'SUCCESS',
          type: 'NEWS',
          subType: 'NEWS_DELETE_MANY',
          userInfo: userId || "",
          ipAddress: ipAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
        return {
          message: 'Không có tin tức nào cần xóa (đã xóa hết hoặc không tồn tại)',
          deletedCount: 0,
        };
      }

      // Cập nhật status = 3 cho các tin hợp lệ
      await this.newsRepository.update(
        { id: In(idsToDelete) },
        { status: 3 },
      );

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Tin tức: Xóa mềm hàng loạt tin tức thành công. Số lượng: ${idsToDelete.length}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_DELETE_MANY',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        message: 'Xóa mềm thành công',
        deletedCount: idsToDelete.length,
      };
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Tin tức: Xóa mềm hàng loạt tin tức thất bại - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_DELETE_MANY',
        userInfo: userId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Không thể xóa mềm hàng loạt: ' + error.message);
    }
  }

  // Thêm comment cho bài viết
  async addComment(newsId: number, dto: any, userFromJwt: any, ipAddress?: string) {
    try {
      // Kiểm tra bài viết có tồn tại không
      const news = await this.findOne(newsId);
      if (!news) {
        throw new NotFoundException('Bài viết không tồn tại');
      }

      const commentType = String(dto.type || 'comment').trim();
      const isFeedbackType = ['feedback', 'feedbackNews', 'gopY', 'opinion'].includes(commentType);

      // Kiểm tra cho phép comment (chỉ áp dụng cho bình luận thường, đóng góp ý kiến không bị chặn bởi cờ isComment)
      if (!isFeedbackType && !news.isComment) {
        throw new BadRequestException('Bài viết này không cho phép bình luận');
      }

      // Lấy userId từ JWT
      const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
      if (!jwtUserId) {
        throw new BadRequestException('Không tìm thấy thông tin user từ token');
      }

      // Lấy thông tin user
      const user = await this.userRepository.findOne({
        where: { id: jwtUserId } as any,
      });

      const userName = user?.username || user?.name || 'Anonymous';

      // Tạo comment
      const comment = this.newsCommentRepository.create({
        newsId,
        userId: jwtUserId,
        userName,
        content: sanitizeHtml(dto.content),
        type: dto.type || 'comment',
        likeCount: 0,
        parentId: dto.parentId || null,
        file: dto.file,
      });

      const savedComment = await this.newsCommentRepository.save(comment);

      // Emit socket event
      this.newsGateway.emitNewComment(newsId, savedComment);

      // Xử lý thông báo tag người dùng (không đợi để tránh block phản hồi nhanh)
      this.handleTagNotifications(savedComment, newsId).catch(err => {
        console.error('Error handling tag notifications:', err);
      });
      this.handleCommentNotifications(savedComment, news).catch(err => {
        console.error('Error handling comment notifications:', err);
      });

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: Thêm bình luận thành công bài viết ID ${newsId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_ADD',
        userInfo: jwtUserId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: savedComment,
        message: 'Thêm bình luận thành công',
      };
    } catch (error) {
      const jwtUserId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || "";
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Thêm bình luận thất bại bài viết ID ${newsId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_ADD',
        userInfo: String(jwtUserId),
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi thêm bình luận: ' + error.message);
    }
  }

  // Cập nhật comment
  async updateComment(commentId: number, dto: UpdateNewsCommentDto, userFromJwt: any, ipAddress?: string) {
    try {
      const comment = await this.newsCommentRepository.findOne({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException('Bình luận không tồn tại');
      }

      // Kiểm tra quyền (chỉ người tạo mới được sửa)
      const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
      if (comment.userId !== jwtUserId) {
        throw new BadRequestException('Bạn không có quyền sửa bình luận này');
      }

      comment.content = sanitizeHtml(dto.content);
      if (dto.file !== undefined) {
        comment.file = dto.file;
      }
      comment.updatedAt = new Date();

      const savedComment = await this.newsCommentRepository.save(comment);

      // Emit socket event
      this.newsGateway.emitUpdateComment(comment.newsId, savedComment);

      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Tin tức: Cập nhật bình luận thành công ID ${commentId}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_UPDATE',
        userInfo: jwtUserId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: savedComment,
        message: 'Cập nhật bình luận thành công',
      };
    } catch (error) {
      const jwtUserId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || "";
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Tin tức: Cập nhật bình luận thất bại ID ${commentId} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_UPDATE',
        userInfo: String(jwtUserId),
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi cập nhật bình luận: ' + error.message);
    }
  }

  // Xóa comment
  async deleteComment(commentId: number, userFromJwt: any, ipAddress?: string) {
    try {
      const comment = await this.newsCommentRepository.findOne({
        where: { id: commentId },
      });

      if (!comment) {
        throw new NotFoundException('Bình luận không tồn tại');
      }

      // Kiểm tra quyền (chỉ người tạo hoặc có thể là admin tin tức mới được xóa)
      const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
      if (comment.userId !== jwtUserId) {
        // Có thể thêm check admin ở đây nếu cần
        throw new BadRequestException('Bạn không có quyền xóa bình luận này');
      }

      const newsId = comment.newsId;

      // Xóa tất cả replies
      await this.newsCommentRepository.delete({ parentId: commentId });

      // Xóa comment chính
      await this.newsCommentRepository.remove(comment);

      // Emit socket event
      this.newsGateway.emitDeleteComment(newsId, commentId);

      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Tin tức: Xóa bình luận thành công ID ${commentId}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_DELETE',
        userInfo: jwtUserId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Xóa bình luận thành công',
      };
    } catch (error) {
      const jwtUserId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || "";
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Tin tức: Xóa bình luận thất bại ID ${commentId} - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_COMMENT_DELETE',
        userInfo: String(jwtUserId),
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi xóa bình luận: ' + error.message);
    }
  }

  // Lấy danh sách comment theo bài viết
  async getComments(newsId: number, userId?: string, query?: any) {
    const { type } = query || {};
    try {
      const where: any = { newsId };
      if (type) {
        where.type = type;
      }

      const comments = await this.newsCommentRepository.createQueryBuilder('nc')
        .leftJoin(UserEntity, 'u', 'u.id = nc.userId')
        .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
        .select([
          'nc.*',
          'ou.name as unitName'
        ])
        .where('nc.newsId = :newsId', { newsId })
        .andWhere(type ? 'nc.type = :type' : '1=1', { type })
        .orderBy('nc.createdAt', 'DESC')
        .getRawMany();

      if (!comments || comments.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Không có bình luận nào',
        };
      }

      // Lấy số like cho mỗi comment và kiểm tra meLike
      const commentsWithLikes = await Promise.all(
        comments.map(async (comment) => {
          const likeCount = await this.newsLikeRepository.count({
            where: { type: 'COMMENT', objectId: comment.id, isLike: true },
          });
          const dislikeCount = await this.newsLikeRepository.count({
            where: { type: 'COMMENT', objectId: comment.id, isLike: false },
          });

          // Kiểm tra user hiện tại có like/dislike comment này không
          let meLike = false;
          let meDisLike = false;
          if (userId) {
            const myReaction = await this.newsLikeRepository.findOne({
              where: {
                objectId: comment.id,
                type: 'COMMENT',
                userId: userId,
              } as any,
            });
            if (myReaction) {
              meLike = !!myReaction.isLike;
              meDisLike = !myReaction.isLike;
            }
          }

          let parsedFile = comment.file;
          if (typeof comment.file === 'string') {
            try {
              parsedFile = JSON.parse(comment.file);
            } catch (e) {
              parsedFile = comment.file;
            }
          }

          return {
            ...comment,
            file: parsedFile,
            unitName: comment.unitName || '',
            likeCount: likeCount || 0,
            dislikeCount: dislikeCount || 0,
            meLike,
            meDisLike,
          };
        })
      );

      return {
        success: true,
        data: commentsWithLikes,
        total: commentsWithLikes.length,
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách bình luận: ' + error.message);
    }
  }

  // Like hoặc dislike bài viết hoặc comment
  async likeNewsOrComment(dto: any, userFromJwt: any, ipAddress?: string) {
    try {
      // Lấy userId từ JWT
      const jwtUserId: string = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id;
      if (!jwtUserId) {
        throw new BadRequestException('Không tìm thấy thông tin user từ token');
      }

      // Lấy thông tin user
      const user = await this.userRepository.findOne({
        where: { id: jwtUserId } as any,
      });

      const userName = user?.username || user?.name || 'Anonymous';

      // Xác định isLike (default là true nếu không truyền)
      const isLike = dto.isLike !== false; // false = dislike, true = like

      // Use type and objectId from DTO directly
      const type = dto.type;
      const objectId = dto.objectId;

      // Determine newsId based on type
      let newsId: number;
      if (type === 'NEWS') {
        newsId = objectId;
      } else if (type === 'COMMENT') {
        // Need to fetch the comment to get its newsId
        const comment = await this.newsCommentRepository.findOne({
          where: { id: objectId },
        });
        if (!comment) {
          throw new BadRequestException('Không tìm thấy comment');
        }
        newsId = comment.newsId;
      } else {
        throw new BadRequestException('Loại không hợp lệ');
      }

      // Kiểm tra đã có reaction chưa (like hoặc dislike)
      const existingReaction = await this.newsLikeRepository.findOne({
        where: {
          type,
          objectId,
          userId: jwtUserId,
        } as any,
      });

      // Nếu đã có reaction
      if (existingReaction) {
        // Nếu click vào cùng loại reaction => bỏ reaction
        if (existingReaction.isLike === isLike) {
          await this.newsLikeRepository.remove(existingReaction);

          // Giảm count tương ứng trên comment
          if (type === 'COMMENT') {
            const comment = await this.newsCommentRepository.findOne({
              where: { id: objectId },
            });
            if (comment) {
              if (isLike && comment.likeCount > 0) {
                comment.likeCount -= 1;
              } else if (!isLike && comment.dislikeCount > 0) {
                comment.dislikeCount -= 1;
              }
              await this.newsCommentRepository.save(comment);
            }

            // Emit socket event for comment like/dislike
            this.newsGateway.emitCommentLikeUpdate(newsId, objectId, {
              likeCount: comment?.likeCount || 0,
              dislikeCount: comment?.dislikeCount || 0,
              userId: jwtUserId,
              action: 'remove',
            });
          } else {
            // Lấy tổng like mới nhất của NEWS
            const counts = await this.getNewsLikes(newsId, jwtUserId);

            this.newsGateway.emitLikeUpdate(newsId, {
              userId: jwtUserId,
              isLike: null,
              action: 'remove',
              likeCount: counts.data.likeCount,
              dislikeCount: counts.data.dislikeCount,
            });
          }

          await this.systemLogService.createLogFromSystem({
            action: 'POST',
            details: `Tin tức: Bỏ ${isLike ? 'like' : 'dislike'} ${type === 'COMMENT' ? 'bình luận' : 'bài viết'} thành công. ID: ${objectId}`,
            method: 'POST',
            status: 'SUCCESS',
            type: 'NEWS',
            subType: 'NEWS_LIKE_REMOVE',
            userInfo: jwtUserId || "",
            ipAddress: ipAddress || 'Unknown',
            timestamp: new Date().toISOString(),
          });

          return {
            success: true,
            message: `Bỏ ${isLike ? 'like' : 'dislike'} thành công`,
            liked: null,
            disliked: null,
          };
        } else {
          // Click vào loại reaction khác => đổi reaction
          const wasLike = existingReaction.isLike;
          existingReaction.isLike = isLike;
          await this.newsLikeRepository.save(existingReaction);

          // Cập nhật count trên comment
          if (type === 'COMMENT') {
            const comment = await this.newsCommentRepository.findOne({
              where: { id: objectId },
            });
            if (comment) {
              if (wasLike) {
                // Đổi từ like sang dislike
                if (comment.likeCount > 0) comment.likeCount -= 1;
                comment.dislikeCount = (comment.dislikeCount || 0) + 1;
              } else {
                // Đổi từ dislike sang like
                if (comment.dislikeCount > 0) comment.dislikeCount -= 1;
                comment.likeCount = (comment.likeCount || 0) + 1;
              }
              await this.newsCommentRepository.save(comment);
            }

            // Emit socket event for comment like/dislike
            this.newsGateway.emitCommentLikeUpdate(newsId, objectId, {
              likeCount: comment?.likeCount || 0,
              dislikeCount: comment?.dislikeCount || 0,
              userId: jwtUserId,
              action: 'switch',
            });
          } else {
            // Lấy tổng like mới nhất của NEWS
            const counts = await this.getNewsLikes(newsId, jwtUserId);

            this.newsGateway.emitLikeUpdate(newsId, {
              userId: jwtUserId,
              isLike,
              action: 'switch',
              likeCount: counts.data.likeCount,
              dislikeCount: counts.data.dislikeCount,
            });
          }

          await this.systemLogService.createLogFromSystem({
            action: 'POST',
            details: `Tin tức: Đổi sang ${isLike ? 'like' : 'dislike'} ${type === 'COMMENT' ? 'bình luận' : 'bài viết'} thành công. ID: ${objectId}`,
            method: 'POST',
            status: 'SUCCESS',
            type: 'NEWS',
            subType: 'NEWS_LIKE_SWITCH',
            userInfo: jwtUserId || "",
            ipAddress: ipAddress || 'Unknown',
            timestamp: new Date().toISOString(),
          });

          return {
            success: true,
            message: `Đổi sang ${isLike ? 'like' : 'dislike'} thành công`,
            liked: isLike,
            disliked: !isLike,
          };
        }
      }

      // Nếu chưa có reaction => tạo mới
      const newReaction = this.newsLikeRepository.create({
        type,
        objectId,
        userId: jwtUserId,
        userName,
        isLike,
      });

      await this.newsLikeRepository.save(newReaction);

      // Tăng count tương ứng trên comment
      if (type === 'COMMENT') {
        const comment = await this.newsCommentRepository.findOne({
          where: { id: objectId },
        });
        if (comment) {
          if (isLike) {
            comment.likeCount = (comment.likeCount || 0) + 1;
          } else {
            comment.dislikeCount = (comment.dislikeCount || 0) + 1;
          }
          await this.newsCommentRepository.save(comment);
        }

        // Emit socket event for comment like/dislike
        this.newsGateway.emitCommentLikeUpdate(newsId, objectId, {
          likeCount: comment?.likeCount || 0,
          dislikeCount: comment?.dislikeCount || 0,
          userId: jwtUserId,
          action: 'add',
        });
      } else {
        // Lấy tổng like mới nhất của NEWS
        const counts = await this.getNewsLikes(newsId, jwtUserId);

        this.newsGateway.emitLikeUpdate(newsId, {
          userId: jwtUserId,
          isLike,
          action: 'add',
          likeCount: counts.data.likeCount,
          dislikeCount: counts.data.dislikeCount,
        });
      }

      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Tin tức: ${isLike ? 'Like' : 'Dislike'} ${type === 'COMMENT' ? 'bình luận' : 'bài viết'} thành công. ID: ${objectId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'NEWS',
        subType: 'NEWS_LIKE_ADD',
        userInfo: jwtUserId || "",
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: `${isLike ? 'Like' : 'Dislike'} thành công`,
        liked: isLike,
        disliked: !isLike,
      };
    } catch (error) {
      const jwtUserId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || "";
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Tin tức: Like/Dislike thất bại ID: ${dto.objectId} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'NEWS',
        subType: 'NEWS_LIKE',
        userInfo: String(jwtUserId),
        ipAddress: ipAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi like/dislike: ' + error.message);
    }
  }

  // Lấy tổng số like/dislike của bài viết và danh sách người thích
  async getNewsLikes(newsId: number, userId?: string) {
    try {
      const likes = await this.newsLikeRepository.createQueryBuilder('nl')
        .leftJoin(UserEntity, 'u', 'u.id = nl.userId')
        .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
        .select([
          'nl.userId as userId',
          'nl.userName as userName',
          'nl.createdAt as createdAt',
          'ou.name as unitName'
        ])
        .where('nl.type = :type AND nl.objectId = :newsId AND nl.isLike = :isLike', {
          type: 'NEWS',
          newsId,
          isLike: true
        })
        .orderBy('nl.createdAt', 'DESC')
        .getRawMany();

      const dislikes = await this.newsLikeRepository.createQueryBuilder('nl')
        .leftJoin(UserEntity, 'u', 'u.id = nl.userId')
        .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
        .select([
          'nl.userId as userId',
          'nl.userName as userName',
          'nl.createdAt as createdAt',
          'ou.name as unitName'
        ])
        .where('nl.type = :type AND nl.objectId = :newsId AND nl.isLike = :isLike', {
          type: 'NEWS',
          newsId,
          isLike: false
        })
        .orderBy('nl.createdAt', 'DESC')
        .getRawMany();

      const likeCount = likes.length;
      const dislikeCount = dislikes.length;

      let meLike = false;
      if (userId) {
        meLike = likes.some(l => l.userId === userId);
      }

      return {
        success: true,
        data: {
          meLike,
          newsId,
          likeCount: likeCount || 0,
          dislikeCount: dislikeCount || 0,
          likes: likes.map(l => ({
            userId: l.userId,
            userName: l.userName,
            createdAt: l.createdAt,
            unitName: l.unitName || '',
          })),
          dislikes: dislikes.map(d => ({
            userId: d.userId,
            userName: d.userName,
            createdAt: d.createdAt,
            unitName: d.unitName || '',
          })),
        },
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy số like/dislike: ' + error.message);
    }
  }

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 200);
    const date = new Date();
    const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;

    return `${baseSlug}-${formattedDate}`;
  }

  /**
   * Xử lý thông báo khi có tag @username trong nội dung bình luận
   */
  private async handleTagNotifications(comment: NewsComment, newsId: number) {
    if (!comment.content) return;

    // Trích xuất các username từ nội dung (ví dụ: @vanthu.tchp)
    const taggedUsernames = this.extractTaggedUsernames(comment.content);
    if (taggedUsernames.length === 0) return;

    // Lấy thông tin bài viết để tạo link và nội dung thông báo
    const news = await this.newsRepository.findOne({ where: { id: newsId } });
    if (!news) return;

    for (const username of taggedUsernames) {
      try {
        // Tìm user theo username
        const taggedUser = await this.userRepository.findOne({
          where: { username: username } as any,
        });

        if (taggedUser && taggedUser.id !== comment.userId) {
          // Tạo thông báo
          await this.notificationService.create({
            recipientId: taggedUser.id,
            senderId: comment.userId,
            content: `**${comment.userName}** đã nhắc đến bạn trong một bình luận của bài viết: "${news.title}"`,
            link: `/news/${news.id}?commentId=${comment.id}`,
            key: NotificationKey.NEWS_DETAIL_VIEW,
            type: NotificationType.NEWS_MENTIONED_IN_COMMENT.value,
            recordId: String(newsId),
          });
        }
      } catch (error) {
        console.warn(`Cannot send tag notification to user ${username}:`, error.message);
      }
    }
  }

  /**
   * Xử lý gửi thông báo cho các bộ phận liên quan (tác giả/người tạo, người trình, người duyệt bài viết) khi có bình luận / góp ý mới
   */
  private async handleCommentNotifications(comment: NewsComment, news: News) {
    if (!news) return;

    // Danh sách định danh nguyên bản từ thông tin bài viết news (tác giả, người trình, người duyệt, v.v.)
    const rawIdentifiers = new Set<string>();

    if (news.authorId) rawIdentifiers.add(String(news.authorId).trim());
    if (news.submitterId) rawIdentifiers.add(String(news.submitterId).trim());
    if (news.reviewerId) rawIdentifiers.add(String(news.reviewerId).trim());
    if (news.recalledById) rawIdentifiers.add(String(news.recalledById).trim());
    if (news.rejectorId) rawIdentifiers.add(String(news.rejectorId).trim());
    if (news.cancellerId) rawIdentifiers.add(String(news.cancellerId).trim());
    if ((news as any).createdBy) rawIdentifiers.add(String((news as any).createdBy).trim());
    if ((news as any).createdById) rawIdentifiers.add(String((news as any).createdById).trim());
    if ((news as any).userId) rawIdentifiers.add(String((news as any).userId).trim());

    if (rawIdentifiers.size === 0) return;

    const rawList = Array.from(rawIdentifiers).filter(Boolean);

    // Truy vấn bảng users để ánh xạ tất cả định danh (id, username, emailUser, codeND) về user.id chuẩn trong DB
    const targetUserIds = new Set<string>();

    try {
      const users = await this.userRepository.find({
        where: [
          { id: In(rawList) },
          { username: In(rawList) },
          { emailUser: In(rawList) },
          { codeND: In(rawList) },
        ],
        select: ['id', 'username', 'emailUser', 'codeND'],
      });

      for (const u of users) {
        if (u.id) targetUserIds.add(u.id);
      }
    } catch (err) {
      console.warn('Cannot fetch users for news notification:', err.message);
    }

    // Nếu định danh nào đã ở dạng GUID / UUID / ID số thì bổ sung trực tiếp
    for (const raw of rawList) {
      if (/^[0-9a-fA-F-]{36}$/.test(raw) || !isNaN(Number(raw))) {
        targetUserIds.add(raw);
      }
    }

    // Loại bỏ chính người viết bình luận / góp ý khỏi danh sách nhận thông báo
    if (comment.userId) {
      targetUserIds.delete(String(comment.userId));
    }

    if (targetUserIds.size === 0) return;

    const isFeedbackType = ['feedback', 'feedbackNews', 'gopY', 'opinion'].includes(String(comment.type || '').trim());
    const actionText = isFeedbackType ? 'đã đóng góp ý kiến' : 'đã bình luận';
    const notificationContent = `**${comment.userName || 'Một người dùng'}** ${actionText} về nội dung bài viết: "${news.title}"`;

    for (const recipientId of targetUserIds) {
      try {
        await this.notificationService.create({
          recipientId,
          senderId: comment.userId,
          content: notificationContent,
          link: `/news/${news.id}?commentId=${comment.id}`,
          key: NotificationKey.NEWS_DETAIL_VIEW,
          type: NotificationType.NEWS_COMMENTED.value,
          recordId: String(news.id),
        });
      } catch (error) {
        console.warn(`Cannot send comment notification to user ${recipientId}:`, error.message);
      }
    }
  }

  /**
   * Trích xuất các username sau dấu @
   */
  private extractTaggedUsernames(content: string): string[] {
    const regex = /@([a-zA-Z0-9._-]+)/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }
    // Loại bỏ duplicates
    return [...new Set(matches)];
  }

  /**
   * Tăng lượt xem cho tin tức
   * Nếu có userId: chỉ tăng 1 lần duy nhất cho mỗi user
   * Nếu không có userId (guest): tăng mỗi lần truy cập
   */
  async incrementViewCount(id: number, userId?: string): Promise<any> {
    try {
      const news = await this.newsRepository.findOne({ where: { id } });
      if (!news) {
        throw new NotFoundException(`Không tìm thấy tin tức với ID ${id}`);
      }

      // Chỉ tăng nếu tin đã được xuất bản (status = 1)
      if (news.status === 1) {
        if (userId && userId.trim() !== "") {
          // Kiểm tra xem user đã xem tin này chưa
          const hasViewed = await this.newsViewRepository.findOne({
            where: { newsId: id, userId } as any
          });

          if (!hasViewed) {
            // Lưu lại thông tin đã xem
            await this.newsViewRepository.save({
              newsId: id,
              userId: userId
            });
            // Tăng lượt xem
            await this.newsRepository.increment({ id }, 'viewCount', 1);
          }
        } else {
          // Đối với khách (guest), tăng lượt xem mỗi lần
          await this.newsRepository.increment({ id }, 'viewCount', 1);
        }
      }

      // Lấy viewCount mới nhất để trả về
      const updatedNews = await this.newsRepository.findOne({
        where: { id },
        select: ['viewCount']
      });

      return {
        success: true,
        viewCount: updatedNews?.viewCount || 0
      };
    } catch (error) {
      console.error(`Error incrementing view count for news ${id}:`, error);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Lỗi khi tăng lượt xem: ' + error.message);
    }
  }

  /**
   * Lấy danh sách những người đã xem tin tức
   */
  async getNewsViewers(newsId: number): Promise<any> {
    try {
      const news = await this.newsRepository.findOne({ where: { id: newsId } });
      if (!news) {
        throw new NotFoundException(`Không tìm thấy tin tức với ID ${newsId}`);
      }

      // Query raw để join với UserEntity lấy tên hiển thị và OrganizationUnitEntity lấy tên đơn vị
      const viewers = await this.newsViewRepository
        .createQueryBuilder('nv')
        .leftJoin(UserEntity, 'u', 'u.id = nv.userId')
        .leftJoin(OrganizationUnitEntity, 'ou', 'ou.id = u.parent')
        .select([
          'nv.userId as userId',
          'nv.createdAt as viewedAt',
          'u.name as userName',
          'u.username as username',
          'ou.name as unitName'
        ])
        .where('nv.newsId = :newsId', { newsId })
        .orderBy('nv.createdAt', 'DESC')
        .getRawMany();

      return {
        success: true,
        total: viewers.length,
        data: viewers.map(v => ({
          userId: v.userId,
          userName: v.userName || 'Unknown',
          username: v.username || '',
          viewedAt: v.viewedAt,
          unitName: v.unitName || ''
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Lỗi khi lấy danh sách người xem: ' + error.message);
    }
  }

  /**
   * API danh sách tin tức nổi bật (isSpecial = true)
   * Chỉ lấy tin đã được phê duyệt (status = 1)
   * Hỗ trợ filter theo topic, title, type, search
   */
  async getSpecialNews(query: any = {}) {
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query);

      // Normalize filter params
      const filters = this.normalizeFilterParams(query);

      // Fix: Dùng EXISTS thay vì IN để tránh lỗi 'Too many parameters' khi subquery trả về quá nhiều dòng
      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.isSpecial = :isSpecial', { isSpecial: true })
        .andWhere(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicListSelect(queryBuilder);

      // Apply search filters
      this.applyNewsSearchFilters(queryBuilder, filters);

      queryBuilder.orderBy('news.publishedAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);

      return {
        data: enrichedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách tin nổi bật: ' + error.message);
    }
  }

  /**
   * API danh sách tin tức quan trọng (isImportant = true)
   * Chỉ lấy tin đã được phê duyệt (status = 1)
   * Hỗ trợ filter theo topic, title, type, search
   */
  async getImportantNews(query: any = {}) {
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query);

      // Normalize filter params
      const filters = this.normalizeFilterParams(query);

      // Fix: Dùng EXISTS thay vì IN để tránh lỗi 'Too many parameters' khi subquery trả về quá nhiều dòng
      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.isImportant = :isImportant', { isImportant: true })
        .andWhere(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicListSelect(queryBuilder);

      // Apply search filters
      this.applyNewsSearchFilters(queryBuilder, filters);

      queryBuilder.orderBy('news.publishedAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);

      return {
        data: enrichedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách tin quan trọng: ' + error.message);
    }
  }

  /**
   * API "Có thể bạn quan tâm"
   * Trả về tin random đã được duyệt (status = 1)
   * Hỗ trợ lọc theo topic, tags và loại trừ tin hiện tại
   */
  async getSuggestedNews(excludeId?: number, topic?: string, limit: number = 6, tags?: string) {
    try {
      const safeLimit = Math.min(20, Math.max(1, Number(limit) || 6));
      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.status = :status', { status: 1 })
        .andWhere(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicSuggestedListSelect(queryBuilder);

      // Lọc theo chủ đề hoặc tags
      const conditions: string[] = [];
      const parameters: any = {};

      if (topic && topic.trim()) {
        const topicVal = topic.trim();
        conditions.push('(news.topic = :topicVal OR topic.id = :topicVal OR topic.name = :topicVal)');
        parameters.topicVal = topicVal;
      }

      if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        if (tagList.length > 0) {
          const tagConditions = tagList.map((_, index) => `news.tags LIKE :tag${index}`);
          conditions.push(`(${tagConditions.join(' OR ')})`);
          tagList.forEach((tag, index) => {
            parameters[`tag${index}`] = `%${tag}%`;
          });
        }
      }

      if (conditions.length > 0) {
        queryBuilder.andWhere(`(${conditions.join(' OR ')})`, parameters);
      }

      // Loại trừ tin hiện tại nếu có
      if (excludeId) {
        queryBuilder.andWhere('news.id != :excludeId', { excludeId });
      }

      // Lấy danh sách tin đề xuất có ngày đăng mới nhất
      const data = await queryBuilder
        .orderBy('news.publishedAt', 'DESC')
        .take(safeLimit)
        .getMany();

      // Enrich với thông tin bổ sung (không gắn mảng files)
      const enrichedData = await this.enrichNewsForPublic(data, { includeFiles: false });

      return {
        data: enrichedData,
        total: enrichedData.length,
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy tin đề xuất: ' + error.message);
    }
  }

  /**
   * API lọc tin theo nhiều tiêu chí
   * - topic: lọc theo chủ đề
   * - tags: lọc theo tags (string, các tag cách nhau bởi dấu phẩy)
   * - status: lọc theo trạng thái
   * - isSpecial: lọc theo tin nổi bật
   * - fromDate, toDate: lọc theo ngày xuất bản
   * - keyword: tìm kiếm theo tiêu đề hoặc nội dung
   */
  async filterNews(query: any = {}) {
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query);

      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicListSelect(queryBuilder);

      // Lọc theo topic
      if (query.topic) {
        queryBuilder.andWhere('news.topic = :topic', { topic: query.topic });
      }

      // Lọc theo tags
      if (query.tags) {
        const tags = query.tags.split(',').map((tag: string) => tag.trim());
        const tagConditions = tags.map((tag: string, index: number) => {
          return `news.tags LIKE :tag${index}`;
        });
        queryBuilder.andWhere(`(${tagConditions.join(' OR ')})`,
          tags.reduce((acc: any, tag: string, index: number) => {
            acc[`tag${index}`] = `%${tag}%`;
            return acc;
          }, {})
        );
      }

      // Lọc theo status
      if (query.status !== undefined) {
        queryBuilder.andWhere('news.status = :status', { status: parseInt(query.status) });
      }

      // Lọc theo isSpecial
      if (query.isSpecial !== undefined) {
        queryBuilder.andWhere('news.isSpecial = :isSpecial', {
          isSpecial: query.isSpecial === 'true' || query.isSpecial === true
        });
      }

      // Lọc theo ngày xuất bản
      if (query.fromDate) {
        queryBuilder.andWhere('news.publishedAt >= :fromDate', {
          fromDate: new Date(query.fromDate)
        });
      }

      if (query.toDate) {
        queryBuilder.andWhere('news.publishedAt <= :toDate', {
          toDate: new Date(query.toDate)
        });
      }

      // Tìm kiếm theo keyword
      if (query.keyword) {
        queryBuilder.andWhere(
          '(news.title LIKE :keyword OR news.content LIKE :keyword OR news.summary LIKE :keyword)',
          { keyword: `%${query.keyword}%` }
        );
      }

      // Lọc theo department (phòng ban)
      if (query.department) {
        queryBuilder.andWhere('news.department = :department', { department: query.department });
      }

      // Sắp xếp
      const allowedSortFields = ['publishedAt', 'createdAt', 'updatedAt', 'viewCount', 'title', 'likeCount'];
      const sortBy = (query.sortBy && allowedSortFields.includes(query.sortBy)) ? query.sortBy : 'publishedAt';
      const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`news.${sortBy}`, sortOrder);

      // Phân trang
      queryBuilder.skip(skip).take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);

      return {
        data: enrichedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lọc tin tức: ' + error.message);
    }
  }

  /**
   * API danh sách tin mới nhất
   * Lấy tin được tạo trong vòng X ngày (cấu hình từ system_setting_log.newArticlesDays)
   * Hỗ trợ filter theo topic, title, type, search
   */
  async getLatestNews(query: any = {}) {
    const startTime = Date.now();
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query);

      // [LOG] Step 1: Settings
      const step1Start = Date.now();
      const settings = await this.systemSettingLogRepository.findOne({ where: { type: 'news' } });
      const newArticlesDays = settings?.newArticlesDays || 5;

      // Normalize filter params
      const filters = this.normalizeFilterParams(query);

      // Tính ngày bắt đầu (X ngày trước từ hôm nay)
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - newArticlesDays);

      // [LOG] Step 2: Query news
      const step2Start = Date.now();

      // Query news với điều kiện:
      // - status = 1 (đã publish)
      // - publishedAt >= fromDate
      // - publishedAt IS NOT NULL
      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.status = :status', { status: 1 })
        .andWhere('news.publishedAt >= :fromDate', { fromDate })
        .andWhere('news.publishedAt IS NOT NULL');

      this.applyPublicListSelect(queryBuilder);
      this.applyNewsSearchFilters(queryBuilder, filters);
      queryBuilder.orderBy('news.publishedAt', 'DESC').take(limit);

      const data = await queryBuilder.getMany();

      // [LOG] Step 3: Enrich
      const step3Start = Date.now();
      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);

      return {
        data: enrichedData,
        page,
        limit,
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy tin mới nhất: ' + error.message);
    }
  }

  /**
   * API danh sách tin xem nhiều nhất
   * Lấy tin có viewCount >= threshold (cấu hình từ system_setting_log.mostViewedArticlesThreshold)
   * Hỗ trợ filter theo topic, title, type, search
   */
  async getMostViewedNews(query: any = {}) {
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query, 15);

      // Normalize filter params
      const filters = this.normalizeFilterParams(query);

      // Lấy mốc 100 ngày tính từ thời điểm hiện tại trở về trước
      const dateAgo = new Date();
      dateAgo.setDate(dateAgo.getDate() - 100);

      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.status = :status', { status: 1 })
        .andWhere('COALESCE(news.publishedAt, news.createdAt) >= :dateAgo', { dateAgo })
        .andWhere(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicListSelect(queryBuilder);

      // Apply search filters
      this.applyNewsSearchFilters(queryBuilder, filters);

      // Flexible sorting
      const sortBy = query.sortBy || 'viewCount'; // Mặc định sort theo viewCount
      const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; // Mặc định DESC

      // Validate sortBy field
      const allowedSortFields = ['viewCount', 'likeCount', 'createdAt', 'publishedAt', 'title', 'id'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'viewCount';

      queryBuilder.orderBy(`news.${sortField}`, sortOrder)
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);


      return {
        data: enrichedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy tin xem nhiều nhất: ' + error.message);
    }
  }

  /**
   * API danh sách tin được yêu thích (liked nhiều)
   * Lấy tin có số like >= threshold (cấu hình từ system_setting_log.favoriteArticlesThreshold)
   * Hỗ trợ filter theo topic, title, type, search
   */
  async getFavoriteNews(query: any = {}) {
    try {
      const { page, limit, skip } = this.normalizePublicPagination(query);

      // Normalize filter params
      const filters = this.normalizeFilterParams(query);

      // Lấy threshold từ system_setting_log (type = 'NEWS'), mặc định 20
      const settings = await this.systemSettingLogRepository.findOne({ where: { type: 'news' } });
      const threshold = settings?.favoriteArticlesThreshold || 20;

      // Lấy tất cả tin trong danh sách approved với search filters
      const queryBuilder = this.newsRepository
        .createQueryBuilder('news')
        .leftJoinAndSelect('news.topicEntity', 'topic')
        .where('news.status = :status', { status: 1 })
        .andWhere(`EXISTS (
          SELECT 1 FROM audit a 
          WHERE a.document_id = CAST(news.id AS VARCHAR(50))
            AND a.action_code = 'DUYET' 
            AND a.type_document = 'NEWS'
            AND NOT EXISTS (
              SELECT 1 FROM audit r 
              WHERE r.document_id = a.document_id 
                AND r.action_code = 'RECALL' 
                AND r.type_document = 'NEWS'
            )
        )`);
      this.applyPublicListSelect(queryBuilder);

      // Apply search filters
      this.applyNewsSearchFilters(queryBuilder, filters);

      const allNews = await queryBuilder
        .orderBy('news.publishedAt', 'DESC')
        .take(1000)
        .getMany();

      // Đếm số like cho mỗi tin
      const likeCountMap = await this.getNewsReactionCounts(allNews.map((newsItem) => newsItem.id), true);
      const newsWithLikeCounts = allNews.map((newsItem) => ({
        newsItem,
        likeCount: likeCountMap.get(newsItem.id) || 0,
      }));

      // Lọc tin có số like >= threshold
      const filtered = newsWithLikeCounts.filter(item => item.likeCount >= threshold);

      // Flexible sorting
      const sortBy = query.sortBy || 'likeCount'; // Mặc định sort theo likeCount
      const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; // Mặc định DESC

      // Sắp xếp theo trường được chọn
      if (sortBy === 'likeCount') {
        // Sort theo likeCount
        filtered.sort((a, b) => sortOrder === 'ASC' ? a.likeCount - b.likeCount : b.likeCount - a.likeCount);
      } else if (sortBy === 'viewCount') {
        // Sort theo viewCount
        filtered.sort((a, b) => {
          const viewA = a.newsItem.viewCount || 0;
          const viewB = b.newsItem.viewCount || 0;
          return sortOrder === 'ASC' ? viewA - viewB : viewB - viewA;
        });
      } else if (sortBy === 'createdAt') {
        // Sort theo createdAt
        filtered.sort((a, b) => {
          const dateA = new Date(a.newsItem.createdAt).getTime();
          const dateB = new Date(b.newsItem.createdAt).getTime();
          return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
        });
      } else if (sortBy === 'publishedAt') {
        // Sort theo publishedAt
        filtered.sort((a, b) => {
          const dateA = new Date(a.newsItem.publishedAt || 0).getTime();
          const dateB = new Date(b.newsItem.publishedAt || 0).getTime();
          return sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
        });
      } else if (sortBy === 'title') {
        // Sort theo title
        filtered.sort((a, b) => {
          const titleA = (a.newsItem.title || '').toLowerCase();
          const titleB = (b.newsItem.title || '').toLowerCase();
          return sortOrder === 'ASC'
            ? titleA.localeCompare(titleB)
            : titleB.localeCompare(titleA);
        });
      } else {
        // Fallback: sort theo likeCount
        filtered.sort((a, b) => sortOrder === 'ASC' ? a.likeCount - b.likeCount : b.likeCount - a.likeCount);
      }

      // Tổng số sau khi filter
      const total = filtered.length;

      // Phân trang
      const data = filtered.slice(skip, skip + limit).map(item => item.newsItem);

      // Enrich với thông tin bổ sung
      const enrichedData = await this.enrichNewsForPublic(data);


      return {
        data: enrichedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy tin được yêu thích: ' + error.message);
    }
  }

  /**
   * API tổng hợp các tag
   * Trả về danh sách các tag không trùng từ tất cả tin tức đã được duyệt
   */
  async getAllTags() {
    try {
      // Lấy tất cả tin tức đã được duyệt (status = 1)
      const allNews = await this.newsRepository
        .createQueryBuilder('news')
        .where('news.status = :status', { status: 1 })
        .select('news.tags')
        .getRawMany();

      // Khai thác tất cả tags từ các tin tức
      const tagsSet = new Set<string>();
      const tagCountMap = new Map<string, number>();

      allNews.forEach((news) => {
        if (news.news_tags) {
          // Giả sử tags được lưu dưới dạng chuỗi JSON array hoặc chuỗi phân tách
          let tags: string[] = [];

          try {
            // Cố gắng parse JSON array
            const parsed = JSON.parse(news.news_tags);
            tags = Array.isArray(parsed) ? parsed : [];
          } catch {
            // Nếu không phải JSON, thử split theo dấu phẩy
            tags = typeof news.news_tags === 'string'
              ? news.news_tags.split(',').map((tag: string) => tag.trim())
              : [];
          }

          // Thêm vào set (tự động remove trùng lặp) và đếm số lần xuất hiện
          if (Array.isArray(tags)) {
            tags.forEach((tag: any) => {
              if (tag && typeof tag === 'string' && tag.trim()) {
                const cleanTag = tag.trim();
                tagsSet.add(cleanTag);
                tagCountMap.set(cleanTag, (tagCountMap.get(cleanTag) || 0) + 1);
              }
            });
          }
        }
      });

      // Chuyển set thành array và sắp xếp theo số lần xuất hiện giảm dần
      const tagsArray = Array.from(tagsSet)
        .map(tag => ({
          name: tag,
          count: tagCountMap.get(tag) || 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        success: true,
        data: tagsArray,
        total: tagsArray.length,
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách tag: ' + error.message);
    }
  }


  /**
   * Kiểm tra người dùng có các role cụ thể trong quy trình tin tức hay không
   */
  private async checkUserRoles(userId: string | undefined, roleCodes: string[]): Promise<boolean> {
    try {
      if (!userId) return false;
      const user = await this.userRepository.findOne({ where: { id: userId } as any });
      if (!user) return false;

      // 1. Kiểm tra trong rolesByProcess (phân quyền theo chức năng)
      if (user.rolesByProcess && Array.isArray(user.rolesByProcess)) {
        const newsProcess = user.rolesByProcess.find(p => p.processKey === 'quan_ly_tin_tuc');
        if (newsProcess && newsProcess.roles) {
          if (newsProcess.roles.some(r => roleCodes.includes(r.roleCode))) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền người dùng:', error);
      return false;
    }
  }

  /**
   * Kiểm tra người dùng hiện tại có vai trò ADMIN_NEWS hoặc NGUOI_PHE_DUYET hay không
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

}
