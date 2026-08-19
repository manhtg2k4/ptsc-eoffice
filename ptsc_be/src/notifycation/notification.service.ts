import { ForbiddenException, Injectable, NotFoundException, forwardRef, Inject, Logger } from '@nestjs/common';
import { CreateNotificationBulkDto, CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationGateway } from './notification.gateway';
import { ConnectionPool, VarChar } from 'mssql';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationEntity } from './notification.entity';
import { Repository, In, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { EnumGroup, MAIN_NOTIFICATION_KEYS, ModuleType, NotificationGroup, NotificationKey, NotificationType } from './notification.enum';
import { NotificationConfigEntity } from './notification-config/notification-config.entity';
import { PushTokenEntity } from './entities/push-token.entity';
import { SavePushTokenDto } from './dto/save-push-token.dto';
import { JwtService } from '@nestjs/jwt';
import { FcmPushService } from './fcm-push.service';

@Injectable()
export class NotificationService {
  private dbname: string;
  private logger: Logger = new Logger('NotificationService');
  private readonly bulkInsertChunkSize = 100;
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(NotificationEntity, 'mssqlConnection')
    private notificationRepo: Repository<NotificationEntity>,

    @Inject(forwardRef(() => NotificationGateway))
    private notificationGateway: NotificationGateway,

    @Inject('MSSQL_POOL')
    private readonly pool: ConnectionPool,

    private readonly mailService: MailService,

    @InjectRepository(UserEntity, 'mssqlConnection')
    private userRepo: Repository<UserEntity>,

    @InjectRepository(PushTokenEntity, 'mssqlConnection')
    private pushTokenRepo: Repository<PushTokenEntity>,

    private readonly jwtService: JwtService,
    private readonly fcmPushService: FcmPushService,
  ) { }

  private getDatabaseName(): string {
    const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
    if (!dbName) throw new Error('SQLSERVER_DATABASE not defined in .env');
    return dbName + '.dbo';
  }

  onModuleInit() {
    this.dbname = this.getDatabaseName();
  }

  private resolveNotificationModule(code: string): ModuleType | undefined {
    if (code.startsWith('OUTGOING_DOC')) return ModuleType.VIEW_OUTCOMING_DOC;
    if (code.startsWith('INCOMING_DOC')) return ModuleType.VIEW_INCOMING_DOC;
    if (
      code.startsWith('TASK') ||
      code.startsWith('PROJECT') ||
      code.includes('ADDED_TO_NEW_TASK') ||
      code.includes('ADDED_TO_NEW_PROJECT') ||
      code.includes('REMOVED_FROM_TASK') ||
      code.includes('REMOVED_FROM_PROJECT')
    ) {
      return ModuleType.VIEW_TASK;
    }
    if (code.startsWith('MEETING')) return ModuleType.VIEW_MEETING_ROOM;
    if (code.startsWith('PASSPORT') || code.startsWith('FEEDBACK') || code.startsWith('CAR_BOOKING')) {
      return ModuleType.VIEW_UTILITY;
    }
    if (code.startsWith('NEWS') || code.startsWith('EVENT')) return ModuleType.VIEW_NEWS;
    if (code.startsWith('ARCHIVE_RECORD')) return ModuleType.VIEW_RECORD_EXPLOITATION;
    return undefined;
  }

  private async resolveToRealUserId(userId: string): Promise<string> {
    if (!userId) return userId;
    try {
      const user = await this.userRepo.findOne({
        where: [{ id: userId }, { keycloakUserId: userId }],
        select: ['id'],
      });
      return user?.id || userId;
    } catch {
      return userId;
    }
  }

  private async resolveToRealUserIds(userIds: string[]): Promise<string[]> {
    if (!userIds?.length) return [];
    try {
      const users = await this.userRepo.find({
        where: [{ id: In(userIds) }, { keycloakUserId: In(userIds) }],
        select: ['id', 'keycloakUserId'],
      });
      const map = new Map<string, string>();
      for (const u of users) {
        if (u.id) map.set(u.id, u.id);
        if (u.keycloakUserId) map.set(u.keycloakUserId, u.id);
      }
      return userIds.map(id => map.get(id) || id);
    } catch {
      return userIds;
    }
  }

  private async ensureNotificationConfigsForUser(rawUserId: string): Promise<void> {
    const userId = await this.resolveToRealUserId(rawUserId);
    const typeKeys = Object.keys(NotificationType) as (keyof typeof NotificationType)[];
    const notificationTypes = typeKeys.map((key) => NotificationType[key]);
    const codes = notificationTypes.map((item) => item.value);

    const existingConfigs = await this.notificationRepo.manager.find(NotificationConfigEntity, {
      where: {
        userId,
        code: In(codes),
      },
      select: ['id', 'code', 'userId', 'groups'],
    });

    const targetReceiveCodes = [
      'OUTGOING_DOC_RETURNED',
      'OUTGOING_DOC_RECALLED',
      'INCOMING_DOC_RETURNED',
      'INCOMING_DOC_RECALLED',
    ];

    const configsToUpdate = existingConfigs.filter(
      (c) => targetReceiveCodes.includes(c.code) && !c.groups?.includes(NotificationGroup.RECEIVE),
    );

    if (configsToUpdate.length > 0) {
      for (const config of configsToUpdate) {
        config.groups = [NotificationGroup.RECEIVE];
      }
      try {
        await this.notificationRepo.manager.save(NotificationConfigEntity, configsToUpdate);
      } catch (err: any) {
        this.logger.warn(`Lỗi cập nhật config thông báo RECEIVE cho user ${userId}: ${err?.message || err}`);
      }
    }

    const existingPairs = new Set(
      existingConfigs.map((item) => `${String(item.userId).trim()}::${String(item.code).trim()}`),
    );

    const missingRows = notificationTypes
      .filter((item) => !existingPairs.has(`${String(userId).trim()}::${String(item.value).trim()}`))
      .map((item) =>
        this.notificationRepo.manager.create(NotificationConfigEntity, {
          userId,
          code: item.value,
          name: item.name,
          groups: item.defaultGroups ? [...item.defaultGroups] : [EnumGroup.UNGROUPED],
          module: this.resolveNotificationModule(item.value),
        }),
      );

    if (missingRows.length === 0) return;

    try {
      await this.notificationRepo.manager.save(NotificationConfigEntity, missingRows);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (
        message.includes('UQ_notifications_type_code_userId') ||
        message.includes('duplicate key')
      ) {
        this.logger.warn(
          `[ensureNotificationConfigsForUser] Duplicate config skipped for userId=${userId}`,
        );
        return;
      }
      this.logger.warn(
        `[ensureNotificationConfigsForUser] Failed to save config for userId=${userId}: ${message}`,
      );
    }
  }

  private async applyHiddenStatusForNewNotifications(rows: Partial<NotificationEntity>[]): Promise<void> {
    if (!rows.length) return;

    // Bước 1: Gom nhóm các recordId theo senderId
    const senderToRecordIds = new Map<string, Set<string>>();

    for (const row of rows) {
      if (row.senderId && row.recordId) {
        if (!senderToRecordIds.has(row.senderId)) {
          senderToRecordIds.set(row.senderId, new Set());
        }
        senderToRecordIds.get(row.senderId)!.add(row.recordId);
      }
    }

    if (senderToRecordIds.size === 0) return;

    // Bước 2: Update theo từng senderId bằng QueryBuilder, dùng IN clause và batch để tránh nghẽn I/O
    for (const [senderId, recordIds] of senderToRecordIds.entries()) {
      const recordIdArray = Array.from(recordIds);

      // Batch mỗi lần update tối đa 100 recordId (phòng trường hợp mảng rất dài)
      const batchSize = 100;
      for (let i = 0; i < recordIdArray.length; i += batchSize) {
        const batch = recordIdArray.slice(i, i + batchSize);

        await this.notificationRepo.createQueryBuilder()
          .update(NotificationEntity)
          .set({ isHidden: true })
          .where('recipientId = :senderId', { senderId })
          .andWhere('recordId IN (:...batch)', { batch })
          .andWhere('(is_hidden = 0 OR is_hidden IS NULL)')
          .execute();
      }
    }
  }

  async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    const { time, ...data } = dto;
    if (data.title && data.title.length > 500) {
      data.title = data.title.substring(0, 497) + '...';
    }
    const created = this.notificationRepo.create({
      ...data,
      type: data.type as NotificationEntity['type'],
      createdAt: time || new Date(),
    });

    this.applyHiddenStatusForNewNotifications([created]).catch(err =>
      this.logger.error(`Lỗi chạy ngầm ẩn thông báo cũ: ${err.message}`)
    );

    const saved = await this.notificationRepo.save(created);
    this.notificationGateway.queueUserNotification(saved.recipientId);

    // Gửi email thông báo
    this.sendEmailNotification(saved).catch(err =>
      this.logger.error(`Lỗi gửi email thông báo cho user ${saved.recipientId}: ${err.message}`)
    );

    this.sendMobilePushForNotifications([saved]).catch(err =>
      this.logger.error(`Lá»—i gá»­i push thÃ´ng bÃ¡o cho user ${saved.recipientId}: ${err.message}`)
    );
    return saved;
  }

  async existsSimilarNotification(params: {
    recipientId: string;
    recordId?: string | null;
    key?: string | null;
    type?: string | null;
    title?: string | null;
    content?: string | null;
  }): Promise<boolean> {
    const recipientId = String(params.recipientId || '').trim();
    if (!recipientId) return false;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.recipientId = :recipientId', { recipientId });

    if (params.recordId != null) {
      qb.andWhere('n.recordId = :recordId', { recordId: String(params.recordId) });
    }
    if (params.key != null) {
      qb.andWhere('n.[key] = :key', { key: String(params.key) });
    }
    if (params.type != null) {
      qb.andWhere('n.[type] = :type', { type: String(params.type) });
    }
    if (params.title != null) {
      qb.andWhere('n.title = :title', { title: String(params.title) });
    }
    if (params.content != null) {
      qb.andWhere('n.content = :content', { content: String(params.content) });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  async createForRecipients(
    dto: CreateNotificationBulkDto & { recipientIds: string[] },
  ): Promise<void> {
    try {
      const { recipientIds: rawRecipientIds, time, ...data } = dto;
      if (!rawRecipientIds?.length) return;

      const recipientIds = await this.resolveToRealUserIds(rawRecipientIds);
      if (data.senderId) {
        data.senderId = await this.resolveToRealUserId(data.senderId);
      }

      if (data.title && data.title.length > 500) {
        data.title = data.title.substring(0, 497) + '...';
      }

      const rows = recipientIds.map((recipientId) => ({
        isRead: false,
        status: 1,
        ...data,
        recipientId,
        type: data.type as NotificationEntity['type'],
        createdAt: time || new Date(),
      }));

      this.applyHiddenStatusForNewNotifications(rows as Partial<NotificationEntity>[]).catch(err =>
        this.logger.error(`Lỗi chạy ngầm ẩn thông báo cũ: ${err.message}`)
      );

      for (let i = 0; i < rows.length; i += this.bulkInsertChunkSize) {
        await this.notificationRepo.insert(rows.slice(i, i + this.bulkInsertChunkSize));
      }
      const uniqueUserIds = [...new Set(recipientIds)];

      uniqueUserIds.forEach((userId) =>
        this.notificationGateway.queueUserNotification(userId),
      );

      // Gửi email thông báo cho tất cả người nhận
      // Gửi email thông báo cho tất cả người nhận theo lô để tránh quá tải DB/SMTP
      (async () => {
        const concurrencyLimit = 5;
        for (let i = 0; i < rows.length; i += concurrencyLimit) {
          const chunk = rows.slice(i, i + concurrencyLimit);
          await Promise.all(
            chunk.map(note =>
              this.sendEmailNotification(note).catch(err =>
                this.logger.error(`Lỗi gửi email thông báo hàng loạt cho user ${note.recipientId}: ${err.message}`)
              )
            )
          );
        }
      })().catch(err => this.logger.error('Lỗi chạy ngầm gửi email thông báo hàng loạt:', err));
      this.sendMobilePushForNotifications(rows).catch(err =>
        this.logger.error(`Loi gui push thong bao hang loat: ${err.message}`)
      );
    } catch (error) {
      this.logger.error('Create notification failed', error);
      throw error;
    }
  }

  async createInAppOnlyForRecipients(
    dto: CreateNotificationBulkDto & { recipientIds: string[] },
  ): Promise<number[]> {
    try {
      const { recipientIds, time, ...data } = dto;
      if (!recipientIds?.length) return [];

      if (data.title && data.title.length > 500) {
        data.title = data.title.substring(0, 497) + '...';
      }

      const uniqueRecipientIds = [...new Set(recipientIds.map((id) => String(id).trim()).filter(Boolean))];
      if (!uniqueRecipientIds.length) return [];

      const rows = uniqueRecipientIds.map((recipientId) => ({
        isRead: false,
        status: 1,
        ...data,
        recipientId,
        type: data.type as NotificationEntity['type'],
        createdAt: time || new Date(),
      }));

      this.applyHiddenStatusForNewNotifications(rows as Partial<NotificationEntity>[]).catch(err =>
        this.logger.error(`Lỗi chạy ngầm ẩn thông báo cũ: ${err.message}`)
      );

      const result = await this.notificationRepo.insert(rows);

      uniqueRecipientIds.forEach((userId) =>
        this.notificationGateway.queueUserNotification(userId),
      );
      this.sendMobilePushForNotifications(rows).catch(err =>
        this.logger.error(`Loi gui push in-app only: ${err.message}`)
      );
      return result.identifiers.map((item) => Number(item.id)).filter(Number.isFinite);
    } catch (error) {
      this.logger.error('Create in-app only notification failed', error);
      throw error;
    }
  }

  async createBookAssignedForRecipients(dto: {
    recipientIds: string[];
    senderId: string;
    content: string;
    title?: string;
    recordId?: string;
    link?: string;
    time?: Date;
    status?: number;
  }): Promise<void> {
    try {
      const recipientIds = [...new Set((dto.recipientIds || []).map((id) => String(id).trim()).filter(Boolean))];
      if (!recipientIds.length) return;

      let title = dto.title;
      if (title && title.length > 500) {
        title = title.substring(0, 497) + '...';
      }

      const rows = recipientIds.map((recipientId) => ({
        isRead: false,
        recipientId,
        senderId: dto.senderId,
        content: dto.content,
        title: title,
        recordId: dto.recordId,
        link: dto.link,
        key: 'BOOK_ASSIGNED',
        createdAt: dto.time || new Date(),
        status: dto.status ?? 1,
      }));

      this.applyHiddenStatusForNewNotifications(rows as Partial<NotificationEntity>[]).catch(err =>
        this.logger.error(`Lỗi chạy ngầm ẩn thông báo cũ: ${err.message}`)
      );

      for (let i = 0; i < rows.length; i += this.bulkInsertChunkSize) {
        await this.notificationRepo.insert(rows.slice(i, i + this.bulkInsertChunkSize));
      }

      recipientIds.forEach((userId) =>
        this.notificationGateway.queueUserNotification(userId),
      );

      // Gửi email thông báo cho tất cả người nhận
      // Gửi email thông báo cho tất cả người nhận theo lô để tránh quá tải DB/SMTP
      (async () => {
        const concurrencyLimit = 5;
        for (let i = 0; i < rows.length; i += concurrencyLimit) {
          const chunk = rows.slice(i, i + concurrencyLimit);
          await Promise.all(
            chunk.map(note =>
              this.sendEmailNotification(note).catch(err =>
                this.logger.error(`Lỗi gửi email thông báo BOOK_ASSIGNED cho user ${note.recipientId}: ${err.message}`)
              )
            )
          );
        }
      })().catch(err => this.logger.error('Lỗi chạy ngầm gửi email thông báo BOOK_ASSIGNED:', err));

      this.sendMobilePushForNotifications(rows).catch(err =>
        this.logger.error(`Loi gui push BOOK_ASSIGNED: ${err.message}`)
      );
    } catch (error) {
      this.logger.error(
        `[notify][book-assigned][bulk_error] sender=${dto?.senderId || ''} recordId=${dto?.recordId || ''}`,
        error,
      );
      throw error;
    }
  }

  async findAll(userId: string, queryDto: QueryNotificationDto) {
    const page = Number(queryDto.page) || 1;
    const limit = Number(queryDto.limit) || 10;
    const { search, key, filter } = queryDto as any;

    let isVanThu = false;
    try {
      const userRes = await this.pool.request()
        .input('userId', userId)
        .query(`
          SELECT TOP 1 roles_by_process 
          FROM users 
          WHERE id = @userId OR keycloak_user_id = @userId
        `);
      const userData = userRes.recordset[0];
      if (userData && userData.roles_by_process) {
        const rolesByProcess = typeof userData.roles_by_process === 'string'
          ? JSON.parse(userData.roles_by_process)
          : userData.roles_by_process;
        if (Array.isArray(rolesByProcess)) {
          for (const proc of rolesByProcess) {
            for (const roleObject of proc.roles || []) {
              if (['VAN_THU_CUC', 'VAN_THU_PHONG', 'VAN_THU'].includes(roleObject.roleCode)) {
                isVanThu = true;
                break;
              }
            }
            if (isVanThu) break;
          }
        }
      }
    } catch { }

    const qb = this.notificationRepo.createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId })
      .andWhere('n.status != 3');

    const shouldExcludeHidden = queryDto.excludeHidden === true || queryDto.excludeHidden === 'true';
    if (filter?.hidden !== undefined) {
      const isHiddenVal = filter.hidden === true || filter.hidden === 'true' || filter.hidden === 1 || filter.hidden === '1';
      if (isHiddenVal) {
        qb.andWhere('n.isHidden = 1');
      } else {
        qb.andWhere('(n.isHidden = 0 OR n.isHidden IS NULL)');
      }
    } else if (shouldExcludeHidden) {
      qb.andWhere('(n.isHidden = 0 OR n.isHidden IS NULL)');
    }

    const searchContent = search || filter?.content;
    if (searchContent) {
      qb.andWhere('n.content LIKE :searchContent', { searchContent: `%${searchContent}%` });
    }

    if (filter?.group) {
      await this.ensureNotificationConfigsForUser(userId);
      // Nếu lọc theo RECEIVE "Nhận để biết" thì thêm điều kiện OR nc.groups LIKE 'UNGROUPED' "Chưa phân nhóm"
      const isReceive = filter.group === NotificationGroup.RECEIVE;
      const extraCondition = isReceive ? " OR nc.groups LIKE 'UNGROUPED'" : "";

      qb.andWhere(
        `n.type IN (
          SELECT nc.code 
          FROM ${this.dbname}.notifications_config nc 
          WHERE nc.userId = :userId 
            AND (nc.groups LIKE :groupPattern${extraCondition})
        )`,
        { groupPattern: `%${filter.group}%` }
      );
    }

    // Priority: filter.key > key
    const filterKey = filter?.key || key;
    if (filterKey) {
      const mainKeys = MAIN_NOTIFICATION_KEYS;

      const isOther =
        filterKey === 'OTHER' ||
        (Array.isArray(filterKey) && filterKey.length === 1 && filterKey[0] === 'OTHER');

      const taskKeys = [
        NotificationKey.VIEW_TASK,
        NotificationKey.VIEW_TASK_APPROVAL,
        NotificationKey.VIEW_TASK_ADJUSTMENT,
        NotificationKey.VIEW_APPROVAL_REQUEST,
        NotificationKey.TASK_APPROVAL_REJECTED,
        NotificationKey.TASK_APPROVAL_APPROVED,
        NotificationKey.TASK_ADJUSTMENT_REJECTED,
        NotificationKey.VIEW_PROJECT,
        NotificationKey.VIEW_JOB_TO_DOCUMENT,
        NotificationKey.VIEW_JOB_TO_MEETING,
        NotificationKey.VIEW_JOB_PROJECT,
      ];

      if (isOther) {
        qb.andWhere('n.key NOT IN (:...excludedKeys)', { excludedKeys: mainKeys });
      } else if (Array.isArray(filterKey) && filterKey.length > 0) {
        const expandedKeys = filterKey.flatMap((k: string) => (k === 'VIEW_TASK' ? taskKeys : [k]));
        qb.andWhere('n.key IN (:...keys)', { keys: [...new Set(expandedKeys)] });
      } else if (typeof filterKey === 'string') {
        if (filterKey === 'VIEW_TASK') {
          qb.andWhere('n.key IN (:...keys)', { keys: taskKeys });
        } else {
          qb.andWhere('n.key = :key', { key: filterKey });
        }
      }
    }

    // filter.category support (legacy or additional)
    const categoryKeyMap: Record<string, string[]> = {
      'Văn bản đến': [NotificationKey.VIEW_INCOMING_DOC],
      'Văn bản đi': [NotificationKey.VIEW_OUTCOMING_DOC],
      'Công việc': [
        NotificationKey.VIEW_TASK,
        NotificationKey.VIEW_TASK_APPROVAL,
        NotificationKey.VIEW_TASK_ADJUSTMENT,
        NotificationKey.VIEW_APPROVAL_REQUEST,
        NotificationKey.TASK_APPROVAL_REJECTED,
        NotificationKey.TASK_APPROVAL_APPROVED,
        NotificationKey.TASK_ADJUSTMENT_REJECTED,
        NotificationKey.VIEW_PROJECT,
        NotificationKey.VIEW_JOB_TO_DOCUMENT,
        NotificationKey.VIEW_JOB_TO_MEETING,
        NotificationKey.VIEW_JOB_PROJECT,
      ],
      'Lịch họp': [NotificationKey.VIEW_MEETING_DOC, NotificationKey.VIEW_MEETING_ROOM],
      'Dự án': [NotificationKey.VIEW_PROJECT],
      'Hộ chiếu': [NotificationKey.VIEW_PASSPORT_LIST, NotificationKey.VIEW_PASSPORT_RETURN_SLIP, NotificationKey.VIEW_PASSPORT_BORROW_REQUEST],
    };
    if (filter?.category && categoryKeyMap[filter.category]) {
      qb.andWhere('n.key IN (:...categoryKeys)', { categoryKeys: categoryKeyMap[filter.category] });
    }
    const [notifications, total] = await qb
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    // const [notifications, total] = await qb
    //   .orderBy('n.createdAt', 'DESC')
    //   .skip((page - 1) * limit)
    //   .take(limit)
    //   .getManyAndCount();

    if (notifications.length === 0) {
      return { data: [], page, limit, total: 0, totalPages: 0 };
    }

    // ── 2. THU THẬP IDs THEO KEY (chỉ từ trang hiện tại) ────────────────────
    const incomingIds = notifications.filter(n => n.key === NotificationKey.VIEW_INCOMING_DOC && n.recordId).map(n => n.recordId!);
    const outgoingIds = notifications.filter(n => n.key === NotificationKey.VIEW_OUTCOMING_DOC && n.recordId).map(n => n.recordId!);
    const meetingIds = notifications.filter(n => (n.key === NotificationKey.VIEW_MEETING_DOC || n.key === NotificationKey.VIEW_MEETING_ROOM) && n.recordId).map(n => n.recordId!);
    const projectIds = notifications.filter(n => n.key === NotificationKey.VIEW_PROJECT && n.recordId).map(n => n.recordId!);
    const passportIds = [...new Set(notifications.filter(n => n.key === NotificationKey.VIEW_PASSPORT_LIST && n.recordId).map(n => n.recordId!))];

    // ── 3. QUERY CÁC MODULE SONG SONG (không tuần tự) ────────────────────────
    const buildQuery = async (ids: string[], sql: (params: string) => string, prefix: string, type?: any) => {
      if (!ids.length) return { recordset: [] as any[] };
      const req = this.pool.request();
      const params = ids.map((_, i) => `@${prefix}_${i}`).join(',');
      ids.forEach((id, i) => {
        if (type) {
          req.input(`${prefix}_${i}`, type, id);
        } else {
          req.input(`${prefix}_${i}`, id);
        }
      });
      return req.query(sql(params));
    };

    const [incomingRes, outgoingRes, meetingRes, projectRes, passportRes, ocsRes] = await Promise.all([
      buildQuery(incomingIds, p => `SELECT document_id, abstract_note, to_book FROM incomming_documents WHERE document_id IN (${p})`, 'in', VarChar(100)),
      buildQuery(outgoingIds, p => `SELECT document_id, abstract_note, to_book FROM outgoing_documents WHERE document_id IN (${p})`, 'out', VarChar(100)),
      buildQuery(meetingIds, p => `SELECT id, title, meeting_date, meeting_time FROM ${this.dbname}.meetings WHERE id IN (${p})`, 'mid'),
      buildQuery(projectIds, p => `SELECT id, code, name FROM ${this.dbname}.projects WHERE id IN (${p})`, 'pid'),
      buildQuery(passportIds, p => `SELECT id, passport_number, full_name, expiry_date FROM passports WHERE id IN (${p})`, 'ppid'),
      buildQuery(outgoingIds, p => `SELECT document_id, current_stage_status, current_action_code, has_ban_hanh FROM outgoing_current_state WHERE document_id IN (${p})`, 'ocs', VarChar(100)),
    ]);

    // ── 4. BUILD MAPS O(1) lookup ─────────────────────────────────────────────
    const incomingMap = new Map<string, any>(incomingRes.recordset.map((d: any) => [String(d.document_id), d]));
    const outgoingMap = new Map<string, any>(outgoingRes.recordset.map((d: any) => [String(d.document_id), d]));
    const meetingMap = new Map<string, any>(meetingRes.recordset.map((m: any) => [String(m.id), m]));
    const projectMap = new Map<string, any>(projectRes.recordset.map((p: any) => [String(p.id), p]));
    const passportMap = new Map<string, any>(passportRes.recordset.map((p: any) => [String(p.id), p]));
    const ocsMap = new Map<string, any>(ocsRes.recordset.map((d: any) => [String(d.document_id), d]));

    // ── 5. ENRICH KẾT QUẢ ────────────────────────────────────────────────────
    const formatTime = (date: Date | string | number) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${hh}:${mm} ${dd}/${mon}/${yyyy}`;
    };

    const data = notifications.map((n) => {
      const item: any = { ...n };
      item.createdAt = formatTime(n.createdAt);
      item.updatedAt = formatTime(n.updatedAt);

      switch (n.key) {
        case NotificationKey.VIEW_INCOMING_DOC: {
          item.category = 'Văn bản đến';
          const doc = n.recordId ? incomingMap.get(n.recordId) : null;
          if (doc) {
            item.abstractNote = doc.abstract_note;
            item.toBook = doc.to_book;
          }
          item.title = n.title || item.abstractNote || 'Văn bản đến mới';
          break;
        }
        case NotificationKey.VIEW_OUTCOMING_DOC: {
          item.category = 'Văn bản đi';
          const doc = n.recordId ? outgoingMap.get(n.recordId) : null;
          if (doc) {
            item.abstractNote = doc.abstract_note;
            item.toBook = doc.to_book;
          }
          item.title = n.title || item.abstractNote || 'Văn bản đi mới';

          // Tính toán động trường isVanThuCuc
          const ocs = n.recordId ? ocsMap.get(n.recordId) : null;
          if (isVanThu && ocs && ocs.has_ban_hanh !== 1) {
            const CHO_BAN_HANH_STATUSES = ['HT_VBTT', 'BAN_HANH_TO_TRINH', 'CAN_CHO_SO'];
            const CHO_BAN_HANH_ACTIONS = ['KY_SO', 'CHO_SO', 'DONG_DAU', 'KY_PHAT_HANH'];

            const isChoBanHanh = CHO_BAN_HANH_STATUSES.includes(ocs.current_stage_status) ||
              (ocs.current_stage_status === 'CHUA_XU_LY' && CHO_BAN_HANH_ACTIONS.includes(ocs.current_action_code));

            if (isChoBanHanh) {
              // console.log("isVanthucuc")
              item.isVanThuCuc = true;
            }
          }
          break;
        }
        case NotificationKey.VIEW_MEETING_ROOM:
        case NotificationKey.VIEW_MEETING_DOC: {
          item.category = 'Lịch họp';
          const m = n.recordId ? meetingMap.get(n.recordId) : null;
          if (m) {
            item.title = n.title || m.title || 'Lịch họp';
            item.meetingTimeText = `${m.meeting_time} ${formatTime(m.meeting_date).split(' ')[1]}`;
          } else {
            item.title = n.title || 'Lịch họp';
          }
          break;
        }
        case NotificationKey.VIEW_PROJECT: {
          item.category = 'Dự án';
          const p = n.recordId ? projectMap.get(n.recordId) : null;
          if (p) { item.projectCode = p.code; item.projectName = p.name; }
          item.title = n.title || item.projectName || 'Cập nhật dự án';
          break;
        }
        case NotificationKey.VIEW_PASSPORT_RETURN_SLIP:
        case NotificationKey.VIEW_PASSPORT_LIST: {
          item.category = 'Hộ chiếu';
          const pp = n.recordId ? passportMap.get(n.recordId) : null;
          if (pp) {
            item.passportNumber = pp.passport_number;
            item.fullName = pp.full_name;
            item.expiryDateText = pp.expiry_date ? formatTime(pp.expiry_date).split(' ')[1] : '-';
          }
          item.title = n.title || (item.fullName ? `Hộ chiếu: ${item.fullName}` : 'Thông báo hộ chiếu');
          break;
        }
        default: {
          item.title = n.title || 'Thông báo mới';
        }
      }

      return item;
    });
    const counts = await this.getCountsByCategory(userId, shouldExcludeHidden);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      counts,
    };
  }

  async findOne(id: number, userId: string): Promise<NotificationEntity> {
    const n = await this.notificationRepo.findOneBy({ id });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.status === 3) throw new NotFoundException('Notification not found');
    this.assertRecipientAccess(n, userId);
    return n;
  }

  async update(id: number, dto: UpdateNotificationDto, userId: string): Promise<NotificationEntity> {
    const before = await this.findOne(id, userId);

    const updateData: any = { ...dto };

    if (dto.isRead === true && before.type === 'TASK_OVERDUE_REASON_REQUIRED') {
      const completedMessage = /^Bạn đang có 0 công việc trễ hạn/.test(before.content || '');
      if (!completedMessage) updateData.isRead = false;
    }

    if (before.type) {
      await this.ensureNotificationConfigsForUser(userId);
      const config = await this.notificationRepo.query(
        `SELECT TOP 1 groups FROM ${this.dbname}.notifications_config WHERE userId = @0 AND code = @1`,
        [userId, before.type]
      );

      if (config && config.length > 0) {
        const groups = config[0].groups || '';
        if (groups.includes(NotificationGroup.RECEIVE) || groups.includes(NotificationGroup.UNGROUPED)) {
          updateData.isHidden = true;
        }
      }
    }

    await this.notificationRepo.update(id, updateData);
    const updated = await this.findOne(id, userId);

    if (!updated) throw new NotFoundException('Update failed');

    if (before.isRead !== updated.isRead) {
      this.notificationGateway.queueUserNotification(updated.recipientId);
    }
    return updated;
  }

  async remove(id: number, userId: string): Promise<{ deleted: boolean }> {
    await this.findOne(id, userId);
    const res = await this.notificationRepo.update({ id, recipientId: userId }, { status: 3 });
    if (res.affected === 0) throw new NotFoundException('Notification not found');
    this.notificationGateway.queueUserNotification(userId);
    return { deleted: true };
  }

  async getUnreadCount(userId: string, excludeHidden = false): Promise<number> {
    const qb = this.notificationRepo.createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId })
      .andWhere('n.isRead = 0');

    if (excludeHidden) {
      qb.andWhere('(n.isHidden = 0 OR n.isHidden IS NULL)');
    }

    return qb.getCount();
  }

  async broadcastSuccessStatus(eventName: string, data: any): Promise<void> {
    await this.notificationGateway.broadcastSuccessStatus(eventName, data);
  }

  async markAsReadByRecord(
    recipientId: string,
    recordId: string,
  ): Promise<{ updated: boolean; count: number }> {
    if (!recipientId || !recordId) {
      return { updated: false, count: 0 };
    }

    const result = await this.notificationRepo.update(
      {
        recipientId,
        recordId,
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    if (result.affected && result.affected > 0) {
      this.notificationGateway.queueUserNotification(recipientId);
      return { updated: true, count: result.affected };
    }

    return { updated: false, count: 0 };
  }

  async existsTaskReminder(recipientId: string, taskId: string): Promise<boolean> {
    const result = await this.notificationRepo.query(
      `
      SELECT TOP 1 1 AS exists_flag
      FROM notifications
      WHERE recipientId = @0
        AND recordId = @1
        AND [key] = 'VIEW_TASK'
    `,
      [recipientId, taskId],
    );

    return result.length > 0;
  }

  // Old:
  // async markAllAsRead(userId: string): Promise<{ updated: boolean; count: number }> {
  //   const result = await this.notificationRepo.update(
  //     {
  //       recipientId: userId,
  //       isRead: false,
  //     },
  //     {
  //       isRead: true,
  //     },
  //   );
  // 
  //   if (result.affected && result.affected > 0) {
  //     this.notificationGateway.queueUserNotification(userId);
  //     return { updated: true, count: result.affected };
  //   }
  // 
  //   return { updated: false, count: 0 };
  // }

  async markAllAsRead(userId: string): Promise<{ updated: boolean; count: number }> {
    // 1. Kiểm tra xem user có thông báo chưa đọc nào không
    const hasUnread = await this.notificationRepo.findOne({
      where: {
        recipientId: userId,
        isRead: false,
      },
      select: ['id'],
    });

    if (!hasUnread) {
      return { updated: false, count: 0 };
    }

    // Thêm logic update trường hidden cho những thông báo Nhận để biết / Chưa phân nhóm
    const configs = await this.notificationRepo.query(
      `SELECT code FROM ${this.dbname}.notifications_config 
       WHERE userId = @0 
         AND (groups LIKE '%${NotificationGroup.RECEIVE}%' OR groups LIKE '%${NotificationGroup.UNGROUPED}%')`,
      [userId]
    );

    const typesToHide = configs.map((cfg: any) => cfg.code);

    if (typesToHide.length > 0) {
      await this.notificationRepo.createQueryBuilder()
        .update(NotificationEntity)
        .set({ isHidden: true })
        .where('recipientId = :userId', { userId })
        .andWhere('isRead = 0')
        .andWhere('type IN (:...typesToHide)', { typesToHide })
        .execute();
    }

    // 2. Chỉ thực hiện UPDATE khi thực sự có dữ liệu cần cập nhật
    const result = await this.notificationRepo.createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true })
      .where('recipientId = :userId', { userId })
      .andWhere('isRead = 0')
      .andWhere(`NOT (
        type = 'TASK_OVERDUE_REASON_REQUIRED'
        AND content NOT LIKE N'Bạn đang có 0 công việc trễ hạn%'
      )`)
      .execute();

    if (result.affected && result.affected > 0) {
      this.notificationGateway.queueUserNotification(userId);
      return { updated: true, count: result.affected };
    }

    return { updated: false, count: 0 };
  }

  notifyUserChanged(userId: string): void {
    if (userId) this.notificationGateway.queueUserNotification(userId);
  }

  async getCountsByCategory(userId: string, excludeHidden = false) {
    const mainKeys = MAIN_NOTIFICATION_KEYS;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .select([
        "SUM(CASE WHEN n.key IN ('VIEW_INCOMING_DOC', 'VIEW_OUTCOMING_DOC') THEN 1 ELSE 0 END) AS documentCount",
        "SUM(CASE WHEN n.key IN ('VIEW_TASK_APPROVAL', 'VIEW_TASK_ADJUSTMENT', 'VIEW_TASK', 'STAT_CARD_DETAIL_DIALOG', 'VIEW_PROJECT', 'TASK_APPROVAL_REJECTED', 'TASK_ADJUSTMENT_REJECTED') THEN 1 ELSE 0 END) AS taskCount",
        "SUM(CASE WHEN n.key IN ('VIEW_MEETING_ROOM', 'VIEW_MEETING_DOC') THEN 1 ELSE 0 END) AS meetingCount",
        "SUM(CASE WHEN n.key IN ('VIEW_NEWS', 'VIEW_NEWS_DXB', 'VIEW_NEWS_COMMENT', 'VIEW_NEWS_REJECT', 'VIEW_NEWS_CANCELLED', 'NEWS_DETAIL_VIEW') THEN 1 ELSE 0 END) AS newsCount",
        "SUM(CASE WHEN n.key IN ('VIEW_PASSPORT_LIST', 'VIEW_PASSPORT_RETURN_SLIP', 'VIEW_PASSPORT_BORROW_REQUEST') THEN 1 ELSE 0 END) AS passportCount",
        "SUM(CASE WHEN n.key = 'VIEW_NEW_REQUEST' THEN 1 ELSE 0 END) AS vehicleCount",
        `SUM(CASE WHEN n.key NOT IN (${mainKeys.map((k) => `'${k}'`).join(',')}) THEN 1 ELSE 0 END) AS otherCount`,
        'COUNT(n.id) AS totalCount',
      ])
      .where('n.recipientId = :userId', { userId })
      .andWhere('n.status != 3')
      .andWhere('n.isRead = 0');

    if (excludeHidden) {
      qb.andWhere('(n.isHidden = 0 OR n.isHidden IS NULL)');
    }

    const counts = await qb.getRawOne();

    return {
      document: Number(counts.documentCount) || 0,
      task: Number(counts.taskCount) || 0,
      meeting: Number(counts.meetingCount) || 0,
      news: Number(counts.newsCount) || 0,
      passport: Number(counts.passportCount) || 0,
      vehicle: Number(counts.vehicleCount) || 0,
      other: Number(counts.otherCount) || 0,
      total: Number(counts.totalCount) || 0,
    };
  }

  async removeMultiple(ids: number[], userId: string): Promise<{ deleted: boolean; count: number }> {
    if (!ids?.length) {
      return { deleted: true, count: 0 };
    }

    const ownNotifications = await this.notificationRepo.find({
      where: {
        id: In(ids),
        recipientId: userId,
        status: Not(3),
      },
      select: ['id'],
    });
    const ownIds = ownNotifications.map((item) => item.id);

    const result = ownIds.length
      ? await this.notificationRepo.update(ownIds, { status: 3 })
      : { affected: 0 };

    if (result.affected && result.affected > 0) {
      this.notificationGateway.queueUserNotification(userId);
    }

    return { deleted: true, count: result.affected || 0 };
  }

  async savePushTokenFromLogin(
    userId: string,
    dto: SavePushTokenDto,
    authToken?: string,
  ): Promise<{ status: number; message: string; data: PushTokenEntity }> {
    const pushToken = dto.pushToken?.trim();
    const normalizedAuthToken = authToken?.trim() || dto.token?.trim() || '';
    const tokenJti = this.extractTokenJti(normalizedAuthToken);

    if (!pushToken) {
      throw new ForbiddenException('pushToken là bắt buộc');
    }

    let existingToken = await this.pushTokenRepo.findOne({
      where: {
        userId,
        pushToken,
      },
    });

    if (existingToken) {
      existingToken.isUse = true;
      existingToken.token = tokenJti || existingToken.token;
    } else {
      existingToken = this.pushTokenRepo.create({
        userId,
        pushToken,
        token: tokenJti,
        isUse: true,
      });
    }

    const savedToken = await this.pushTokenRepo.save(existingToken);

    return {
      status: 1,
      message: 'Push token đã được lưu thành công từ login',
      data: savedToken,
    };
  }

  async disablePushTokenWhenLogout(
    userId: string,
    pushToken: string,
  ): Promise<{ status: number; message: string; affected: number }> {
    const normalizedPushToken = pushToken?.trim();
    if (!normalizedPushToken) {
      throw new ForbiddenException('pushToken là bắt buộc');
    }

    const result = await this.pushTokenRepo.update(
      {
        userId,
        pushToken: normalizedPushToken,
      },
      {
        isUse: false,
      },
    );

    return {
      status: 1,
      message: 'Cập nhật thành công',
      affected: result.affected || 0,
    };
  }

  async updatePushTokenUsage(
    userId: string,
    pushToken: string,
    inUse?: boolean,
  ): Promise<{ status: number; message: string; affected: number; inUse: boolean }> {
    const normalizedPushToken = pushToken?.trim();
    if (!normalizedPushToken) {
      throw new ForbiddenException('pushToken lÃ  báº¯t buá»™c');
    }

    const nextInUse = typeof inUse === 'boolean' ? inUse : false;

    const result = await this.pushTokenRepo.update(
      {
        userId,
        pushToken: normalizedPushToken,
      },
      {
        isUse: nextInUse,
      },
    );

    return {
      status: 1,
      message: 'Cáº­p nháº­t thÃ nh cÃ´ng',
      affected: result.affected || 0,
      inUse: nextInUse,
    };
  }

  async getPushNotifyStatus(
    userId: string,
    pushToken: string,
  ): Promise<{ inUse: boolean }> {
    const normalizedPushToken = pushToken?.trim();
    if (!normalizedPushToken) {
      throw new ForbiddenException('pushToken lÃ  báº¯t buá»™c');
    }

    const tokenRecord = await this.pushTokenRepo.findOne({
      where: {
        userId,
        pushToken: normalizedPushToken,
      },
      select: ['id', 'isUse'],
    });

    return {
      inUse: !!tokenRecord?.isUse,
    };
  }

  private extractTokenJti(token: string): string {
    if (!token) {
      return '';
    }

    try {
      const decoded = this.jwtService.decode(token) as Record<string, any> | null;
      const jti = decoded?.jti;
      return typeof jti === 'string' ? jti : '';
    } catch {
      return '';
    }
  }

  private assertRecipientAccess(notification: NotificationEntity, userId: string) {
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật thông báo này');
    }
  }

  /**
   * Helper gửi email thông báo
   */

  private async getActivePushTokensByUserIds(userIds: string[]): Promise<Map<string, string[]>> {
    const normalizedUserIds = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
    const result = new Map<string, string[]>();
    if (!normalizedUserIds.length) {
      return result;
    }

    const rows = await this.pushTokenRepo.find({
      where: {
        userId: In(normalizedUserIds),
        isUse: true,
      },
      select: {
        userId: true,
        pushToken: true,
      },
    });

    for (const row of rows) {
      const userId = String(row.userId || '').trim();
      const pushToken = String(row.pushToken || '').trim();
      if (!userId || !pushToken) {
        continue;
      }

      if (!result.has(userId)) {
        result.set(userId, []);
      }
      result.get(userId)!.push(pushToken);
    }

    return result;
  }

  private buildFcmDataPayload(notification: any): Record<string, string> {
    const data: Record<string, string> = {};
    const mappings: Array<[string, any]> = [
      ['notificationId', notification.id],
      ['recordId', notification.recordId],
      ['key', notification.key],
      ['type', notification.type],
      ['link', notification.link],
      ['senderId', notification.senderId],
      ['recipientId', notification.recipientId],
    ];

    for (const [key, value] of mappings) {
      if (value !== undefined && value !== null && value !== '') {
        data[key] = String(value);
      }
    }

    return data;
  }

  private async sendMobilePushForNotifications(notifications: Array<any>): Promise<void> {
    if (!this.fcmPushService.hasConfiguration()) {
      this.logger.warn('FCM chua duoc cau hinh, bo qua gui mobile push');
      return;
    }

    const validNotifications = (notifications || []).filter(
      (item) => item?.recipientId && (item?.title || item?.content),
    );
    if (!validNotifications.length) {
      return;
    }

    const tokenMap = await this.getActivePushTokensByUserIds(
      validNotifications.map((item) => String(item.recipientId)),
    );

    await Promise.all(
      validNotifications.map(async (notification) => {
        const recipientId = String(notification.recipientId || '').trim();
        const pushTokens = [...new Set(tokenMap.get(recipientId) || [])];
        if (!pushTokens.length) {
          return;
        }

        await Promise.all(
          pushTokens.map(async (pushToken) => {
            try {
              await this.fcmPushService.sendToDevice({
                token: pushToken,
                title: notification.title || 'Thong bao',
                body: notification.content || 'Ban co thong bao moi',
                data: this.buildFcmDataPayload(notification),
              });
            } catch (error: any) {
              this.logger.error(
                `Gui push notification that bai user=${recipientId} token=${pushToken}: ${error?.message || error}`,
              );
            }
          }),
        );
      }),
    );
  }

  private async sendEmailNotification(notification: any) {
    try {
      const recipientId = notification.recipientId;
      if (!recipientId) return;

      // 1. Lấy thông tin user và Đơn vị (Organization Unit)
      const userRes = await this.pool.request()
        .input('userId', recipientId)
        .query(`
          SELECT TOP 1 u.email_user, u.name, ISNULL(u.organization_name, ou.name) as org_name
          FROM users u
          LEFT JOIN organization_units ou ON ou.id = u.parent
          WHERE u.id = @userId
        `);

      const user = userRes.recordset[0];
      if (!user || !user.email_user) return;

      const title = notification.title || 'Thông báo mới từ hệ thống';
      const content = notification.content || '';
      const link = notification.link || '';
      const appUrl = this.configService.get<string>('REDIRECT_URI_FE', 'http://localhost:3000');
      const fullLink = `${appUrl}${link.startsWith('/') ? link : '/' + link}`;

      // Đường dẫn trực tiếp FE theo cấu trúc: base_url/key/recordId
      const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
      const directLink = notification.recordId && notification.key
        ? `${cleanAppUrl}/${notification.key}/${notification.recordId}`
        : '';

      let bodyHtml = '';
      let emailSubject = `[Thông báo] ${title}`;

      // 2. Logic rẽ nhánh theo Key của thông báo
      if (notification.key === NotificationKey.VIEW_INCOMING_DOC || notification.key === NotificationKey.VIEW_OUTCOMING_DOC) {
        // --- TRƯỜNG HỢP VĂN BẢN (Sử dụng mẫu VPS) ---
        const isIncoming = notification.key === NotificationKey.VIEW_INCOMING_DOC;
        const tableName = isIncoming ? 'incomming_documents' : 'outgoing_documents';
        const deadlineField = isIncoming ? 'deadline' : 'deadline_reply AS deadline';
        const docRes = await this.pool.request()
          .input('docId', notification.recordId)
          .query(`SELECT TOP 1 to_book, abstract_note, ${deadlineField} FROM ${tableName} WHERE document_id = @docId`);

        const doc = docRes.recordset[0] || {};
        const toBook = doc.to_book || '';
        const abstractNote = doc.abstract_note || notification.title || '';
        const title = notification.title || 'Thông báo mới từ hệ thống';
        const content = notification.content || '';
        const deadline = doc.deadline ? this.formatDate(doc.deadline) : '-';

        emailSubject = `[Thông báo] từ hệ thống Văn phòng số : "${title}"`;

        bodyHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:20px auto; background:#ffffff; border:1px solid #e0e0e0;">
              <tr>
                <td style="padding:30px 35px;">
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                    Kính gửi Ông/Bà: &nbsp;<strong>${user.name}</strong>
                  </p>
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                    Hệ thống Văn phòng số xin thông báo:
                  </p>
                  <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                    Văn bản: ${toBook}
                  </p>
                  <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                    Trích yếu: "${abstractNote}"
                  </p>
                  <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                    Đơn vị: ${user.org_name || ''}
                  </p>
                  <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                    Người được giao xử lý: ${user.name}
                  </p>
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.8;">
                    Thời hạn xử lý: ${deadline}
                  </p>
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                    ${content.replace(/\n/g, '<br>')}
                  </p>
                  ${directLink ? `
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                    Đường liên kết trực tiếp: <a href="${directLink}" style="color:#1a73e8;">${directLink}</a>
                  </p>
                  ` : ''}
                  <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                    Trong trường hợp đã hoàn thành hoặc có vướng mắc trong quá trình xử lý, kính đề nghị phản hồi hoặc liên hệ với bộ phận quản trị hệ thống để được hỗ trợ.
                  </p>
                  <br>
                  <p style="margin:0 0 4px; color:#333; font-size:14px;">Trân trọng,</p>
                  <p style="margin:0 0 0; color:#0088cc; font-size:14px; font-weight:bold;">Hệ thống Văn phòng số</p>
                </td>
              </tr>
              <tr>
                <td style="padding:15px 35px; border-top:1px solid #e0e0e0; background-color:#f9f9f9;">
                  <p style="margin:0; color:#999; font-size:12px;">(Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.)</p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
      } else {
        // --- TRƯỜNG HỢP CƠ BẢN ---
        const title = notification.title || 'Thông báo mới';
        const content = notification.content || '';

        emailSubject = `[Thông báo] ${title}`;
        bodyHtml = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #007bff; color: white; padding: 15px; text-align: center;">
              <h3 style="margin: 0;">Thông báo hệ thống</h3>
            </div>
            <div style="padding: 20px;">
              <p>Xin chào <strong>${user.name}</strong>,</p>
              <p>Bạn có một thông báo mới:</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff;">
                <p style="margin: 0 0 8px 0;"><strong>Tiêu đề:</strong> ${title}</p>
                <p style="margin: 0;"><strong>Nội dung:</strong> ${content}</p>
              </div>
              ${directLink ? `
              <div style="text-align: center; margin: 25px 0;">
                <a href="${directLink}" 
                   style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Xem chi tiết
                </a>
              </div>
              ` : ''}
              ${directLink ? `
              <div style="text-align: center; margin: 15px 0; font-size: 14px;">
                Đường liên kết trực tiếp: <a href="${directLink}" style="color:#007bff; text-decoration:none;">${directLink}</a>
              </div>
              ` : ''}
              <p style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; font-size: 13px; color: #666;">
                Trân trọng,<br>Hệ thống quản lý.
              </p>
            </div>
          </div>
        `;
      }

      await this.mailService.sendMail({
        to: user.email_user,
        subject: emailSubject,
        html: bodyHtml
      });

    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  /**
   * Helper format date DD/MM/YYYY
   */
  private formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

}
