import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
// src/work-items/work-items.service.ts
import { Injectable, Inject, BadRequestException, ForbiddenException, NotFoundException, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { getAllNodeExtensionProperties, mapStringToBoolean } from 'src/utils/util';
import { ProcessWorkItemDto, ProcessWorkItemDtoDraft, ProcessWorkItemTransferDto } from './dto/process-work-item.dto';
import { CompleteSuggesteHandlingDto } from './dto/complete-suggeste-handling.dto';
import { CompleteMultiProcessDto } from './dto/complete-multi-process.dto';
import { SetProcessItemDto } from './dto/set-processor.dto';
import { SetProcessorsItemDto } from './dto/set-processors.dto';
import { NotificationService } from 'src/notifycation/notification.service';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { WorkItemEntity } from './entities/work-item.entity';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentFollowService } from 'src/notifycation/document-unfollows/document-unfolow.service';
import { SignDocumentDto } from 'src/outgoing-documents/dto/sign-document.dto';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { OutgoingDocumentsService } from 'src/outgoing-documents/outgoing-documents.service';
import { IntegrationSignatureService } from 'src/Intergration-signature/intergration-signature.service';
import { formatDateVN } from 'src/meeting/helper/build.meeting.filter';
import { MailService } from 'src/mail';
import { DocumentPolicy } from 'src/documents/incomming-document/policies/document.policy';
import { UsersService } from 'src/users/users.service';
import { MeetingEntity } from 'src/meeting/entities/meeting.entity';
import { MeetingUnitEntity } from 'src/meeting/entities/meeting-unit.entity';
import { MeetingParticipantEntity } from 'src/meeting/entities/meeting-participant.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
// Giả định bạn đã tạo một provider cho 'BPMN_RUNTIME'
// Đây là nơi chứa logic từ `createRuntime(repo)` của bạn
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';

@Injectable()
export class WorkItemsService {
  private readonly logger = new Logger(WorkItemsService.name);
  private enableDebugNotificationLog = false; // Bật/tắt log debug gửi thông báo khay
  constructor(
    @Inject('BPMN_RUNTIME') private readonly runtime,
    private readonly notificationService: NotificationService,
    private readonly crmSourcesService: CrmSourcesService,
    private readonly mailService: MailService,
    private readonly sqlsvRepo: SQLSVRepository,

    @InjectRepository(WorkItemEntity, 'mssqlConnection')
    private readonly workItemRepository: Repository<WorkItemEntity>,
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(MeetingUnitEntity, 'mssqlConnection')
    private readonly meetingUnitRepo: Repository<MeetingUnitEntity>,
    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private readonly participantRepo: Repository<MeetingParticipantEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    private readonly documentFollowService: DocumentFollowService,
    @Inject(forwardRef(() => RuntimeDbService))
    private readonly runtimeDbService: RuntimeDbService,
    @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
    @Inject(forwardRef(() => OutgoingDocumentsService))
    private readonly outgoingDocumentsService: OutgoingDocumentsService,
    @Inject(forwardRef(() => IntegrationSignatureService))
    private readonly integrationSignatureService: IntegrationSignatureService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BpmnEngineService))
    private readonly bpmnEngineService: BpmnEngineService,
  ) { }

  /**
   * Query audit records cho permission check
   */
  private async getAuditByDocumentId(documentId: string): Promise<any[]> {
    try {
      const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
      const pool = await getMssqlPool(this.configService);
      const result = await pool.request()
        .input('documentId', sql.VarChar, documentId)
        .query(`
          SELECT
            id,
            document_id,
            receiver,
            receiver_unit,
            created_by AS createdBy,
            action,
            action_code AS actionCode,
            stage_status AS stageStatus,
            curStatusCode,
            created_at AS createdAt,
            updated_at AS updatedAt,
            type_document,
            processed_by
          FROM ${dbName}.dbo.audit
          WHERE document_id = @documentId
          ORDER BY id ASC
        `);
      return result.recordset || [];
    } catch (error) {
      console.error(`[getAuditByDocumentId] ERROR:`, error?.message || error);
      return [];
    }
  }

  // Helper: Lấy số văn bản để hiển thị trong thông báo
  private getDocNumber(doc: any): string {
    const num = doc?.toBook || doc?.toBookTextSymbols || doc?.to_book || doc?.to_book_text_symbols || '';
    return num ? `số ${num} ` : '';
  }

  private normalizeDocNumber(docNumber: string): string {
    return String(docNumber || '')
      .replace(/^số\s+/i, '')
      .trim();
  }

  private buildIncomingDocLink(incomingDocId: string): string {
    const relativePath = `/incomming-documents/${incomingDocId}`;
    const frontendBaseUrl =
      this.configService.get<string>('REDIRECT_URI_FE') ||
      this.configService.get<string>('KEYCLOAK_DOMAIN_FE') ||
      '';
    if (!frontendBaseUrl) {
      return relativePath;
    }
    return `${frontendBaseUrl.replace(/\/+$/, '')}${relativePath}`;
  }

  // Helper: Map code sang title từ crmsources
  private async mapSourceValues(doc: any): Promise<any> {
    const sourceKeyMap = {
      urgencyLevel: 'S20',
      privateLevel: 'S21',
      documentType: 'S19',
      documentField: 'S26',
      receiveMethod: 'S27',
    };

    try {
      // Lấy tất cả crmsources với status = 1 và code trong danh sách
      const codes = Object.values(sourceKeyMap);
      const allSources = await this.crmSourcesService.findAll({
        status: 1,
        limit: 1000, // Lấy tất cả
      });

      // Filter theo codes
      const sources = allSources.items.filter(s => s.code && codes.includes(s.code));

      const sourceMap: Record<string, any[]> = {};
      for (const s of sources) {
        if (s.code) {
          sourceMap[s.code] = s.data || [];
        }
      }

      const mappedDoc = { ...doc };
      for (const [key, code] of Object.entries(sourceKeyMap)) {
        if (doc[key]) {
          const list = sourceMap[code] || [];
          const found = list.find((d: any) => d.value === doc[key]);
          mappedDoc[key] = found?.title || doc[key];
        }
      }

      return mappedDoc;
    } catch (e) {
      console.warn('⚠️ Error mapping source values:', e.message);
      return doc;
    }
  }

  // Helper: Convert object sang Camunda variables format
  private convertToCamundaVariables(obj: any) {
    const variables = {};

    for (const [key, value] of Object.entries(obj)) {
      variables[key] = {
        value: value ?? '',
        type:
          typeof value === 'number'
            ? 'Long'
            : typeof value === 'boolean'
              ? 'Boolean'
              : 'String',
      };
    }

    return variables;
  }

  private async createNotifications(
    result: any,
    senderId: string,
    docId: string,
    content: string,
    key: 'VIEW_INCOMING_DOC' | 'VIEW_OUTCOMING_DOC',
    title: string | undefined | null | "",
    type: NotificationType,
  ) {
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Bắt đầu createNotifications - senderId: ${senderId}, docId: ${docId}, key: ${key}, type: ${type}`);
    }
    try {
      if (!result?.document) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] result.document rỗng, đang lấy thông tin tài liệu từ database...`);
        }
        if (key === 'VIEW_INCOMING_DOC') {
          result.document = await this.runtime.repo.getDocument(docId);
        } else {
          result.document = await this.runtime.repo.getOutgoingDocument(docId);
        }
      }

      let openWorkItems: any[] = [];
      if (result?.nextNode?.tasks?.length > 0) {
        openWorkItems = result.nextNode.tasks.map((t: any) => ({
          assigneeUserId: t.assignee,
          role: result.nextNode.targetRole || result.nextNode.nextTargeRole,
          roleProcess: null,
        }));
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Xác định openWorkItems từ nextNode.tasks: ${JSON.stringify(openWorkItems)}`);
        }
      } else {
        openWorkItems = result?.document?.openWorkItems || [];
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Xác định openWorkItems từ result.document.openWorkItems: ${JSON.stringify(openWorkItems)}`);
        }
      }

      if (openWorkItems.length === 0) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] openWorkItems trống, dừng xử lý thông báo.`);
        }
        return;
      }

      const allUserIds = openWorkItems
        .map((wi: any) => wi.assigneeUserId)
        .filter(Boolean);

      if (allUserIds.length === 0) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] allUserIds trống (không có assigneeUserId hợp lệ), dừng xử lý thông báo.`);
        }
        return;
      }

      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Danh sách allUserIds trước khi lọc theo dõi (followed): ${JSON.stringify(allUserIds)}`);
      }
      const followedUserIds = await this.documentFollowService.filterFollowedUsers(allUserIds, docId);
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Danh sách followedUserIds sau khi lọc: ${JSON.stringify(followedUserIds)}`);
      }
      if (!followedUserIds || followedUserIds.length === 0) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Không có user nào theo dõi văn bản này, dừng xử lý thông báo.`);
        }
        return;
      }

      const followedSet = new Set(followedUserIds);
      const sentRecipientIds: string[] = [];
      const notificationTitles = new Map<string, string>();

      for (const wi of openWorkItems) {
        if (!wi?.assigneeUserId) {
          if (this.enableDebugNotificationLog) {
            this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Bỏ qua một record vì wi.assigneeUserId rỗng.`);
          }
          continue;
        }
        if (!followedSet.has(wi.assigneeUserId)) {
          if (this.enableDebugNotificationLog) {
            this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Không gửi cho user ${wi.assigneeUserId} vì user này không theo dõi văn bản.`);
          }
          continue;
        }
        if (sentRecipientIds.includes(wi.assigneeUserId)) {
          if (this.enableDebugNotificationLog) {
            this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Bỏ qua user ${wi.assigneeUserId} vì đã được gửi thông báo trong lượt này (tránh gửi trùng).`);
          }
          continue;
        }

        try {
          const docTitle = title || (key === 'VIEW_INCOMING_DOC'
            ? (result.document?.abstract_note || result.document?.abstractNote)
            : (result.document?.abstractNote || result.document?.abstract_note));

          const role = wi.roleProcess || wi.role;
          const actionCode = result.actionCode;
          let notificationTitle = '';

          if (actionCode === 'TRA_LAI') {
            notificationTitle = `Bạn có văn bản bị trả lại: “${docTitle}”`;
          } else if (role === 'viewer') {
            notificationTitle = `Bạn có văn bản nhận để biết: “${docTitle}”`;
          } else if (role === 'feedbacker' || role === 'command_feedback' || actionCode === 'XIN_Y_KIEN') {
            notificationTitle = `Bạn có văn bản cần cho ý kiến: “${docTitle}”`;
          } else if (actionCode === 'TRINH_KIEM_TRA_TT') {
            notificationTitle = `Bạn có văn bản cần kiểm tra thể thức: “${docTitle}”`;
          } else if (actionCode === 'TRINH_DUYET') {
            notificationTitle = `Bạn có văn bản cần duyệt: “${docTitle}”`;
          } else if (actionCode === 'TRINH_KY') {
            notificationTitle = `Bạn có văn bản cần ký: “${docTitle}”`;
          } else {
            // Mặc định là cần xử lý
            notificationTitle = `Văn bản cần xử lý: “${docTitle}”`;
          }

          if (this.enableDebugNotificationLog) {
            this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createNotifications] Tiến hành gọi notificationService.create: Từ ${senderId} -> Đến ${wi.assigneeUserId} | Tiêu đề: "${notificationTitle}" | Nội dung: "${content}"`);
          }
          await this.notificationService.create({
            recipientId: wi.assigneeUserId,
            senderId: senderId,
            content: content,
            title: notificationTitle,
            recordId: docId,
            link: key === 'VIEW_INCOMING_DOC'
              ? `/incomming-documents/${docId}`
              : `/outgoing-documents/${docId}`,
            key: key,
            time: new Date(),
            status: 1,
            type: type as NotificationType,
          });

          sentRecipientIds.push(wi.assigneeUserId);
          notificationTitles.set(wi.assigneeUserId, notificationTitle);
        } catch (e) {
          this.logger.error(
            `❌ Notification failed for ${wi.assigneeUserId}: ${e.message}`,
          );
        }
      }
    } catch (e) {
      this.logger.error(`❌ createNotifications error: ${e.message}`);
    }
  }

  private parseConcurrentStepOutgoingTargets(rawValue: unknown): string[] {
    return String(rawValue || '')
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private buildNextStageNotificationContent(doc: any): string {
    const abstractText = String(
      doc?.abstractNote ||
      doc?.abstract_note ||
      doc?.title ||
      ''
    ).trim();
    return abstractText
      ? `Văn bản đi cần bạn xử lý ở giai đoạn sau "${abstractText}"`
      : 'Văn bản đi cần bạn xử lý ở giai đoạn sau';
  }

  private async collectOutgoingReturnNotificationRecipients(
    docId: string,
    auditHistory: any[],
    senderId?: string | null,
  ): Promise<string[]> {
    const recipientIds = new Set<string>();
    const normalizedSenderId = String(senderId || '').trim();

    const addRecipient = (value: unknown) => {
      const normalizedValue = String(value || '').trim();
      if (!normalizedValue || normalizedValue === normalizedSenderId) {
        return;
      }
      recipientIds.add(normalizedValue);
    };

    try {
      if (Array.isArray(auditHistory)) {
        for (const auditItem of auditHistory) {
          addRecipient(auditItem?.createdBy?._id);
          addRecipient(auditItem?.receiver?._id);
          addRecipient(auditItem?.createdBy);
          addRecipient(auditItem?.receiver);
          addRecipient(auditItem?.processedBy);
          addRecipient(auditItem?.userId);
        }
      }

      const openWorkItems = await this.repo.getWorkItemsByDocumentId(docId).catch(() => []);
      if (Array.isArray(openWorkItems)) {
        for (const workItem of openWorkItems) {
          addRecipient(workItem?.assigneeUserId);
          addRecipient(workItem?.assignee_user_id);
        }
      }

      const notifiedRecipientIds = await this.repo.getOutgoingRecallNotificationRecipients(docId).catch(() => []);
      for (const notifiedRecipientId of notifiedRecipientIds) {
        addRecipient(notifiedRecipientId);
      }

      const outgoingDoc = await this.runtime.repo.getOutgoingDocument(docId).catch(() => null);
      const knowReceivers = [
        ...(Array.isArray(outgoingDoc?.knowReceivers) ? outgoingDoc.knowReceivers : []),
        ...(Array.isArray(outgoingDoc?.know_receivers) ? outgoingDoc.know_receivers : []),
      ];
      for (const knowReceiverId of knowReceivers) {
        addRecipient(knowReceiverId);
      }
    } catch (error) {
      this.logger.warn(
        `[collectOutgoingReturnNotificationRecipients] Lỗi gom người nhận cho văn bản đi ${docId}: ${error?.message || error}`,
      );
    }

    return Array.from(recipientIds);
  }

  private async resolveNextStageNotificationRecipients(
    docId: string,
    bpmnVersion: string,
    indexes: any,
    targetNodeIds: string[],
    fallbackOpenWorkItems: any[] = [],
  ): Promise<string[]> {
    const recipientIds = new Set<string>();

    for (const targetNodeId of targetNodeIds) {
      const bpmnNode = indexes?.nodes?.get(targetNodeId);
      if (!bpmnNode) {
        continue;
      }

      const nodeProps = getAllNodeExtensionProperties(bpmnNode) || {};
      const typeSign = nodeProps?.signerRequired || nodeProps?.processRequired || null;
      const targetRole =
        indexes?.laneMap?.get(targetNodeId) ||
        nodeProps?.candidateGroups ||
        nodeProps?.candidateGroupsCode ||
        null;
      let resolvedByTypeSign = false;

      if (typeSign) {
        const signers = await this.repo.getSignersFromOutgoingDocumentUsers(docId, typeSign);
        resolvedByTypeSign = Array.isArray(signers) && signers.length > 0;
        for (const signer of signers || []) {
          if (signer?.user_id) {
            recipientIds.add(String(signer.user_id));
          }
        }
      }

      if (targetRole && !resolvedByTypeSign) {
        const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
        for (const userId of candidates || []) {
          if (userId) {
            recipientIds.add(String(userId));
          }
        }
      }

      for (const wi of fallbackOpenWorkItems || []) {
        if (
          wi &&
          String(wi.nodeId || '') === String(targetNodeId) &&
          String(wi.state || '').toLowerCase() === 'open' &&
          wi.assigneeUserId
        ) {
          recipientIds.add(String(wi.assigneeUserId));
        }
      }

    }

    return Array.from(recipientIds);
  }

  private async createConcurrentStepOutgoingNotifications(
    result: any,
    senderId: string,
    docId: string,
    content: string,
    explicitBpmnVersion?: string,
    title?: string,
  ) {
    try {
      const nextNodeId = String(
        result?.nextNode?.id ||
        result?.nextNode?.nodeId ||
        result?.nextNode?.targetNodeId ||
        '',
      ).trim();
      if (!nextNodeId) return;

      const bpmnVersion =
        explicitBpmnVersion ||
        result?.document?.bpmnVersion ||
        result?.document?.bpmn_version ||
        result?.bpmnVersion;
      if (!bpmnVersion) return;

      const bpmnXML = await this.runtime.repo.getBpmnFile(bpmnVersion);
      const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
      const node = indexes?.nodes?.get(nextNodeId);
      if (!node) {
        return;
      }

      const props = getAllNodeExtensionProperties(node) || {};
      const targetNodeIds = this.parseConcurrentStepOutgoingTargets(
        props.nextStageNotificationTargetNodes ??
        props.NEXT_STAGE_NOTIFICATION_TARGET_NODES ??
        props.CONCURENT_STEP_OUTGOING,
      );
      if (!targetNodeIds.length) {
        return;
      }

      let openWorkItems: any[] = Array.isArray(result?.document?.openWorkItems)
        ? result.document.openWorkItems
        : [];
      if (!openWorkItems.length) {
        openWorkItems = await this.repo.getWorkItemsByDocumentId(docId);
      }
      const recipientIds = await this.resolveNextStageNotificationRecipients(
        docId,
        bpmnVersion,
        indexes,
        targetNodeIds,
        openWorkItems,
      );
      if (!recipientIds.length) {
        return;
      }

      const followedUserIds = await this.documentFollowService.filterFollowedUsers(
        recipientIds,
        docId,
      );
      if (!followedUserIds?.length) {
        return;
      }

      await this.notificationService.createForRecipients({
        recipientIds: followedUserIds,
        senderId,
        content,
        title: 'Văn bản',
        recordId: docId,
        link: `/outgoing-documents/${docId}`,
        key: 'VIEW_OUTCOMING_DOC',
        time: new Date(),
        status: 1,
        type: NotificationType.CONCURENT_STEP_OUTGOING.value as any,
      });
    } catch (e) {
      this.logger.error(`❌ createConcurrentStepOutgoingNotifications error: ${e.message}`);
    }
  }

  private async sendPromulgateEmail(
    email: string,
    docNumber: string,
    docLink: string,
    userName: string,
    unitName: string,
  ) {
    try {
      const normalizedDocNumber = this.normalizeDocNumber(docNumber);
      const subject = normalizedDocNumber
        ? `Thông báo ban hành văn bản số ${normalizedDocNumber}`
        : 'Thông báo ban hành văn bản';
      const recipient = (userName || '').trim() || 'Đơn vị liên quan';
      const sender = (unitName || '').trim() || 'Hệ thống điều hành văn bản';
      const publishMessage = normalizedDocNumber
        ? `Xin trân trọng thông báo: Văn bản số ${normalizedDocNumber} đã được ban hành tới đồng chí.`
        : 'Xin trân trọng thông báo: Văn bản đã được ban hành tới đồng chí.';
      const resolvedDocLink = (docLink || '').trim() || '#';
      const html = `
        <p>Kính gửi Đồng chí ${recipient},</p>
        <p>${publishMessage}</p>
        <p>Đồng chí vui lòng truy cập đường link dưới đây để xem nội dung chi tiết của văn bản:</p>
        <p><a href="${resolvedDocLink}">${resolvedDocLink}</a></p>
        <p>Kính đề nghị Đồng chí kiểm tra và thực hiện theo nội dung văn bản.</p>
        <p>Trân trọng cảm ơn.</p>
        <p>${sender}</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`[promulgate-doc][notify] Send promulgate email failed for ${email}`, err);
    }
  }

  private dispatchPromulgateNotificationsForReceivingUnits(
    incomingCopiesForUnits: Array<{
      incomingDocId: string;
      flowId: string;
      receiverUnit: string;
    }>,
    senderId: string,
    content: string,
    docNumber: string,
    title?: string,
    sourceDocId?: string,
  ) {
    if (!Array.isArray(incomingCopiesForUnits) || incomingCopiesForUnits.length === 0) {
      this.logger.warn(
        `[promulgate-doc][notify] Skip dispatch: no incomingCopiesForUnits, sourceDocId=${sourceDocId || 'n/a'}`,
      );
      return;
    }

    setImmediate(async () => {
      try {
        const validCopies = incomingCopiesForUnits.filter(
          (item) =>
            item &&
            typeof item.incomingDocId === 'string' &&
            item.incomingDocId.trim() &&
            typeof item.flowId === 'string' &&
            item.flowId.trim() &&
            typeof item.receiverUnit === 'string' &&
            item.receiverUnit.trim(),
        );

        if (!validCopies.length) {
          this.logger.warn(
            `[promulgate-doc][notify] No valid incoming copies after validation, sourceDocId=${sourceDocId || 'n/a'}`,
          );
          return;
        }

        const emailRecipientIds = new Set<string>();
        const emailDocLinkByUserId = new Map<string, string>();
        const fallbackDocLink = this.buildIncomingDocLink(validCopies[0].incomingDocId);
        const senderInfo = await this.sqlsvRepo.getUserById(senderId).catch(() => null);
        const senderUnitName =
          senderInfo?.parent?.name ||
          senderInfo?.organizationName ||
          senderInfo?.name ||
          'Hệ thống điều hành văn bản';

        for (const copy of validCopies) {
          let recipients: string[] = [];
          try {
            recipients = await this.runtimeDbService.getStartEventUsersInUnit(
              copy.flowId,
              copy.receiverUnit,
            );
          } catch (resolveErr) {
            this.logger.warn(
              `[promulgate-doc] Resolve recipients failed for incoming=${copy.incomingDocId}, flow=${copy.flowId}, unit=${copy.receiverUnit}: ${resolveErr?.message || resolveErr}`,
            );
            continue;
          }

          const recipientIds = [...new Set((recipients || []).filter(Boolean))];
          if (!recipientIds.length) {
            this.logger.warn(
              `[promulgate-doc][notify] No recipients resolved for incomingDocId=${copy.incomingDocId}`,
            );
            continue;
          }

          this.notificationService.createForRecipients({
            recipientIds,
            senderId,
            content,
            title: title ? `Bạn có văn bản nhận để biết: “${title}”` : (docNumber ? `Ban hành văn bản số ${docNumber}` : (content || 'Thông báo ban hành văn bản')),
            recordId: copy.incomingDocId,
            link: `/incomming-documents/${copy.incomingDocId}`,
            key: 'VIEW_INCOMING_DOC',
            time: new Date(),
            status: 1,
          });

          const docLink = this.buildIncomingDocLink(copy.incomingDocId);
          recipientIds.forEach((id) => {
            const recipientId = String(id);
            emailRecipientIds.add(recipientId);
            if (!emailDocLinkByUserId.has(recipientId)) {
              emailDocLinkByUserId.set(recipientId, docLink);
            }
          });
        }

        if (emailRecipientIds.size === 0) {
          this.logger.warn(
            `[promulgate-doc][notify] No email recipients after processing copies, sourceDocId=${sourceDocId || 'n/a'}`,
          );
          return;
        }

        const users = await this.sqlsvRepo.getUsersByIds([...emailRecipientIds]);
        const usersWithEmail = users.filter((u: any) => !!u?.emailUser);
        await Promise.all(
          usersWithEmail
            .map((u: any) =>
              this.sendPromulgateEmail(
                String(u.emailUser),
                docNumber,
                emailDocLinkByUserId.get(String(u.id)) || fallbackDocLink,
                String(u?.name || u?.username || u?.parent?.name || ''),
                senderUnitName,
              ),
            ),
        );
      } catch (err) {
        this.logger.error(`[promulgate-doc][notify] Dispatch notifications/emails failed sourceDocId=${sourceDocId || 'n/a'}`, err);
      }
    });
  }

  async complete(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển xử lý văn bản', userInfo?.parent?.id);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getDocument(docId);
    if (!doc.bookDocumentId) throw new BadRequestException('Vui lòng lưu sổ văn bản');

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeWorkItem({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: doc.bpmnVersion
    });

    // 2️⃣ Xác định danh sách những người nhận mới
    let openUserIds: string[] = [];
    if (result?.nextNode?.tasks?.length > 0) {
      openUserIds = result.nextNode.tasks.map((t: any) => String(t.assignee));
    }

    // 3️⃣ Xác định danh sách những người nhận mới (không lấy người trong luồng cũ)
    const allRecipients = new Set<string>(openUserIds.filter(Boolean));

    // 4️⃣ Loại bỏ người thực hiện hành động chuyển tiếp
    const senderId = payload.userId || userId;
    if (senderId) {
      allRecipients.delete(String(senderId));
    }

    // 5️⃣ Duyệt qua từng người nhận và sử dụng hàm createNotifications bằng cách truyền fakeResult (không để riêng dòng gọi gốc)
    if (allRecipients.size > 0) {
      const nextRole = result?.nextNode?.targetRole || result?.nextNode?.nextTargeRole;

      for (const recipientId of allRecipients) {
        const role = nextRole;

        const fakeResult = {
          document: {
            ...result?.document,
            openWorkItems: [{
              assigneeUserId: recipientId,
              role: role,
              roleProcess: null
            }]
          },
          actionCode: result?.actionCode,
          nextNode: result?.nextNode ? {
            ...result.nextNode,
            tasks: [{ assignee: recipientId }],
            targetRole: role,
            nextTargeRole: role
          } : null
        };

        this.createNotifications(
          fakeResult,
          payload.userId,
          docId,
          `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`,
          'VIEW_INCOMING_DOC',
          '',
          NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value
        ).catch((err) => {
          this.logger.error(`Lỗi gửi thông báo chuyển xử lý văn bản cho user ${recipientId}: ${err.message}`);
        });
      }
    }

    return result;
  }
  async transferSupportService(docId: string, workItemId: string, payload: ProcessWorkItemTransferDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    // Kiểm tra quyền xử lý
    // const wi = await this.repo.getWorkItem(docId, workItemId);
    // const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    // const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi);
    // if (!check.allowed) throw new ForbiddenException(check.reason);
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển xử lý văn bản', userInfo?.parent?.id);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getDocument(docId);
    if (!doc.bookDocumentId) throw new BadRequestException('Vui lòng lưu sổ văn bản');
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.transferSupportRuntime({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: doc.bpmnVersion
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`, 'VIEW_INCOMING_DOC', '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }

  async completeSuggesteHandling(
    docId: string,
    workItemId: string,
    payload: CompleteSuggesteHandlingDto,
    userId: string,
    originalUser: string,
    author?: string | null,
    bpmn?: string,
  ) {
    // Kiểm tra quyền xử lý
    // const wi = await this.repo.getWorkItem(docId, workItemId);
    // const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    // const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi);
    // if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getDocument(docId);
    if (!doc.bookDocumentId) throw new BadRequestException('Vui lòng lưu sổ văn bản');

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);

    const tx = await this.repo.begin();
    try {
      const result = await this.runtime.completeWorkItem({
        bpmnXML,
        documentId: docId,
        workItemId,
        payload,
        userId,
        originalUser,
        author,
        bpmnVersion: doc.bpmnVersion,
        externalTransaction: tx,
      });

      if (payload?.suggesteHandling && payload.suggesteHandling.length > 0) {
        const parsedDeadline =
          payload.deadline && !Number.isNaN(new Date(payload.deadline).getTime())
            ? new Date(payload.deadline)
            : null;

        await this.repo.insertWorkItemSuggesteHandling(
          {
            documentId: docId,
            workItemId,
            actionCode: payload.actionCode,
            roles: payload.roles,
            userId,
            assignToUserId: payload.assignToUserId,
            deadline: parsedDeadline,
            note: payload.note ?? null,
            suggesteHandling: payload.suggesteHandling,
          },
          tx,
        );
      }

      await this.repo.commit(tx);

      // 2️⃣ Xác định danh sách những người nhận mới
      let openUserIds: string[] = [];
      if (result?.nextNode?.tasks?.length > 0) {
        openUserIds = result.nextNode.tasks.map((t: any) => String(t.assignee));
      }

      // Thêm người được gán tiếp theo (assignToUserId) vào danh sách người nhận mới nếu chưa có
      if (payload.assignToUserId && !openUserIds.includes(String(payload.assignToUserId))) {
        openUserIds.push(String(payload.assignToUserId));
      }

      // Lấy thêm danh sách người nhận đề xuất xử lý từ payload
      const suggestedUserSubActions = new Map<string, string>();
      if (payload?.suggesteHandling && Array.isArray(payload.suggesteHandling)) {
        for (const item of payload.suggesteHandling) {
          if (Array.isArray(item.users)) {
            for (const uId of item.users) {
              if (uId) {
                let userIdStr = '';
                if (typeof uId === 'string') {
                  userIdStr = uId;
                } else if (typeof uId === 'object' && (uId as any).userId) {
                  userIdStr = String((uId as any).userId);
                } else if (typeof uId === 'object' && (uId as any).id) {
                  userIdStr = String((uId as any).id);
                }

                if (userIdStr) {
                  openUserIds.push(userIdStr);
                  suggestedUserSubActions.set(userIdStr, item.subActionCode);
                }
              }
            }
          }
        }
      }

      // 3️⃣ Xác định danh sách những người nhận mới (không lấy người trong luồng cũ)
      const allRecipients = new Set<string>(openUserIds.filter(Boolean));

      // 4️⃣ Loại bỏ người thực hiện hành động chuyển
      const senderId = payload.userId || userId;
      if (senderId) {
        allRecipients.delete(String(senderId));
      }

      // 5️⃣ Duyệt qua từng người nhận và sử dụng hàm createNotifications bằng cách truyền fakeResult (không để riêng dòng gọi gốc)
      if (allRecipients.size > 0) {
        const nextRole = result?.nextNode?.targetRole || result?.nextNode?.nextTargeRole;

        for (const recipientId of allRecipients) {
          const role = nextRole;

          // Xác định hành động của từng user nhận thông báo
          let subAction = '';
          if (recipientId === String(payload.assignToUserId)) {
            subAction = 'CHUYEN_DE_XUAT';
          } else if (suggestedUserSubActions.has(recipientId)) {
            subAction = suggestedUserSubActions.get(recipientId) ?? "";
          }

          // Quyết định nội dung thông báo dựa trên hành động
          let notificationContent = `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đề xuất xử lý.`;
          if (subAction === 'XU_LY_CHINH') {
            notificationContent = `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`;
          } else if (subAction === 'PHOI_HOP') {
            notificationContent = `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí phối hợp xử lý.`;
          } else if (subAction === 'NHAN_DE_BIET') {
            notificationContent = `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí nhận để biết.`;
          }

          const fakeResult = {
            document: {
              ...result?.document,
              openWorkItems: [{
                assigneeUserId: recipientId,
                role: role,
                roleProcess: null
              }]
            },
            actionCode: result?.actionCode,
            nextNode: result?.nextNode ? {
              ...result.nextNode,
              tasks: [{ assignee: recipientId }],
              targetRole: role,
              nextTargeRole: role
            } : null
          };

          this.createNotifications(
            fakeResult,
            payload.userId,
            docId,
            notificationContent,
            'VIEW_INCOMING_DOC',
            '',
            NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value
          ).catch((err) => {
            this.logger.error(`Lỗi gửi thông báo đề xuất xử lý văn bản cho user ${recipientId}: ${err.message}`);
          });
        }
      }

      return result;
    } catch (error) {
      await this.repo.rollback(tx);
      throw error;
    }
  }

  async completeMultiProcess(payload: CompleteMultiProcessDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    if (!Array.isArray(payload?.document) || payload.document.length === 0) {
      throw new BadRequestException('Danh sach van ban can xu ly khong duoc de trong');
    }

    // Kiểm tra quyền xử lý cho từng VB
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    for (const item of payload.document) {
      const wi = await this.repo.getWorkItem(item.docId, item.workItemId);
      const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển xử lý nhiều văn bản');
      if (!check.allowed) throw new ForbiddenException(`${check.reason} (docId: ${item.docId})`);
    }

    const { document, ...processPayload } = payload;
    const docs: Array<{ docId: string; workItemId: string; doc: any }> = [];

    for (const item of document) {
      const doc = await this.runtime.repo.getDocument(item.docId);
      if (!doc) {
        throw new BadRequestException(`Khong tim thay van ban: ${item.docId}`);
      }
      if (!doc.bookDocumentId) {
        throw new BadRequestException(`Vui long luu so van ban: ${item.docId}`);
      }
      docs.push({ docId: item.docId, workItemId: item.workItemId, doc });
    }

    const baseBpmnVersion = docs[0]?.doc?.bpmnVersion || null;
    const mismatch = docs.filter(d => d.doc?.bpmnVersion !== baseBpmnVersion);
    if (!baseBpmnVersion || mismatch.length > 0) {
      const details = docs
        .map(d => `${d.docId}:${d.doc?.bpmnVersion || 'null'}`)
        .join(', ');
      throw new BadRequestException(`Cac van ban khong cung bpmn_version. Chi tiet: ${details}`);
    }

    const bpmnXML = await this.runtime.repo.getBpmnFile(baseBpmnVersion);
    const tx = await this.repo.begin();
    const results: Array<{ docId: string; workItemId: string; data: any; doc: any }> = [];

    try {
      for (const item of docs) {
        const data = await this.runtime.completeWorkItem({
          bpmnXML,
          documentId: item.docId,
          workItemId: item.workItemId,
          payload: processPayload as ProcessWorkItemDto,
          userId,
          originalUser,
          author,
          bpmnVersion: baseBpmnVersion,
          externalTransaction: tx,
        });
        results.push({ docId: item.docId, workItemId: item.workItemId, data, doc: item.doc });
      }
      await this.repo.commit(tx);
    } catch (error) {
      await this.repo.rollback(tx);
      throw error;
    }

    for (const item of results) {
      await this.createNotifications(
        item.data,
        processPayload.userId,
        item.docId,
        `Văn bản đến ${this.getDocNumber(item.doc)}đã được chuyển đến đồng chí xử lý.`,
        'VIEW_INCOMING_DOC',
        '',
        NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value
      );
    }

    return {
      total: results.length,
      results,
    };
  }
  async completeSuport(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển phối hợp văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeSuport({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      bpmnVersion: doc.bpmnVersion
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí phối hợp xử lý.`, 'VIEW_INCOMING_DOC', '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }

  async return(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, bpmn?: string) {
    if (!payload?.note || !payload.note.trim()) {
      throw new BadRequestException('Bắt buộc nhập lý do khi trả lại văn bản.');
    }

    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'trả lại văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getDocument(docId);

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    if (!this.runtime.returnWorkItem) {
      throw new BadRequestException('Return API not available in this runtime');
    }
    const result = await this.runtime.returnWorkItem({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      bpmnVersion: doc.bpmnVersion
    });

    // 2️⃣ Xác định danh sách những người nhận mới
    let openUserIds: string[] = [];
    if (result?.nextNode?.tasks?.length > 0) {
      openUserIds = result.nextNode.tasks.map((t: any) => String(t.assignee));
    }

    // 3️⃣ Xác định danh sách những người nhận mới (không lấy người trong luồng cũ)
    const allRecipients = new Set<string>(openUserIds.filter(Boolean));

    // 4️⃣ Loại bỏ người thực hiện hành động trả lại
    const senderId = payload.userId || userId;
    if (senderId) {
      allRecipients.delete(String(senderId));
    }

    // 5️⃣ Duyệt qua từng người nhận và sử dụng hàm createNotifications bằng cách truyền fakeResult (không để riêng dòng gọi gốc)
    if (allRecipients.size > 0) {
      for (const recipientId of allRecipients) {
        const role = 'assignee';

        const fakeResult = {
          document: {
            ...result?.document,
            openWorkItems: [{
              assigneeUserId: recipientId,
              role: role,
              roleProcess: null
            }]
          },
          actionCode: 'TRA_LAI',
          nextNode: null
        };

        this.createNotifications(
          fakeResult,
          payload.userId,
          docId,
          `Văn bản đến ${this.getDocNumber(doc)}đã được trả lại. Lý do: “${payload.note.trim()}”`,
          'VIEW_INCOMING_DOC',
          '',
          NotificationType.INCOMING_DOC_RETURNED.value
        ).catch((err) => {
          this.logger.error(`Lỗi gửi thông báo trả lại văn bản cho user ${recipientId}: ${err.message}`);
        });
      }
    }

    return result;
  }
  async returnOutgoing(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, bpmn?: string) {
    // 1️⃣ Bắt buộc nhập lý do khi trả lại văn bản đi
    if (!payload?.note || !payload.note.trim()) {
      throw new BadRequestException('Bắt buộc nhập lý do khi trả lại văn bản.');
    }

    const audit = await this.repo.getOutgoingDocumentStateHistory(docId).catch(() => []);

    // 2️⃣ Check quyền trả lại VB đi
    const [wi, userInfo] = await Promise.all([
      this.repo.getWorkItem(docId, workItemId),
      this.sqlsvRepo.getUserById(userId)
    ]);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'trả lại VB đi');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const senderId = payload.userId || userId;
    const baseRecipients = await this.collectOutgoingReturnNotificationRecipients(
      docId,
      audit,
      senderId,
    );

    const doc = await this.runtime.repo.getOutgoingDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    if (!this.runtime.returnWorkItem) {
      throw new BadRequestException('Return API not available in this runtime');
    }
    const result = await this.runtime.returnWorkItemOutgoing({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      bpmnVersion: doc.bpmnVersion
    });

    // 3️⃣ Thu thập tất cả người tham gia trong luồng văn bản đi từ lịch sử audit để gửi thông báo
    const allRecipients = new Set<string>(baseRecipients);

    try {
        if (Array.isArray(audit)) {
          for (const a of audit) {
             if (a?.createdBy?._id) {
              allRecipients.add(String(a.createdBy._id));
            }
             if (a?.receiver?._id) {
              allRecipients.add(String(a.receiver._id));
            }
          }
        }
    } catch (e) {
      this.logger.warn(`Lỗi lấy audit của VB đi ${docId}: ${e.message}`);
    }

    // Loại bỏ người thực hiện hành động trả lại
    if (senderId) {
      allRecipients.delete(String(senderId));
    }

    // 4️⃣ Gửi thông báo đến tất cả người tham gia ký trong luồng văn bản đi
    const docNum = this.getDocNumber(doc);
    const noteContent = payload.note.trim();
    const notificationTitle = `Văn bản đi ${docNum}đã bị trả lại. Lý do: “${noteContent}”`;

    for (const recipientId of allRecipients) {
      this.notificationService.create({
        recipientId,
        senderId: senderId,
        content: `Lý do trả lại: ${noteContent}`,
        title: notificationTitle,
        recordId: docId,
        link: `/outgoing-documents/${docId}`,
        key: 'VIEW_OUTCOMING_DOC',
        time: new Date(),
        status: 1,
        type: NotificationType.OUTGOING_DOC_RETURNED.value as any,
      }).catch((err) => {
        this.logger.error(`Lỗi gửi thông báo trả lại VB đi cho user ${recipientId}: ${err.message}`);
      });
    }

    return result;
  }

  async completeOutgoing(docId: string, workItemId: string, payload: ProcessWorkItemDto, bpmn?: string) {
    const doc = await this.runtime.repo.getOutgoingDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    if (!this.runtime.completeOutgoingWorkItem) {
      throw new BadRequestException('Complete API for Outgoing Document not available in this runtime');
    }
    const result = await this.runtime.completeOutgoingWorkItem({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      bpmnVersion: doc.bpmnVersion
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đi ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`, 'VIEW_OUTCOMING_DOC', '', NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value);
    this.createConcurrentStepOutgoingNotifications(
      result,
      payload.userId,
      docId,
      this.buildNextStageNotificationContent(doc),
      doc.bpmnVersion,
      doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
    ).catch(e => console.error(e));
    return result;
  }
  async completeProcessing(docId: string, workItemId: string, payload: ProcessWorkItemDto, bpmn?: string, userId?: string) {
    // Check quyền hoàn thành xử lý
    if (userId) {
      const wi = await this.repo.getWorkItem(docId, workItemId);
      const userInfo: any = await this.sqlsvRepo.getUserById(userId);
      const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'hoàn thành xử lý');
      if (!check.allowed) throw new ForbiddenException(check.reason);
    }

    const doc = await this.runtime.repo.getDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeProcessing({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      bpmnVersion: doc.bpmnVersion,
      userId
    });
    const docNumber = this.getDocNumber(doc);
    const notificationKey = ((doc as any).isIncomming === false || (doc as any).is_incomming === false) ? 'VIEW_OUTCOMING_DOC' : 'VIEW_INCOMING_DOC';
    await this.createNotifications(result, payload.userId, docId, `Văn bản ${docNumber}đã được xử lý xong.`, notificationKey, '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }
  async completeAndTransition(docId: string, workItemId: string, payload: ProcessWorkItemDto, bpmn?: string, userId?: string) {
    let doc = await this.runtime.repo.getDocument(docId);
    if (!doc) {
      doc = await this.runtime.repo.getOutgoingDocument(docId);
    }
    if (!doc) throw new NotFoundException(`Không tìm thấy văn bản với ID: ${docId}`);

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeAndTransition({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      bpmnVersion: doc.bpmnVersion,
      userId
    });

    const docNumber = this.getDocNumber(doc);
    const notificationKey = ((doc as any).isIncomming === false || (doc as any).is_incomming === false) ? 'VIEW_OUTCOMING_DOC' : 'VIEW_INCOMING_DOC';
    await this.createNotifications(result, payload.userId, docId, `Văn bản ${docNumber} đã hoàn thành và chuyển tiếp.`, notificationKey, '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }
  async createDocDraft(docId: string, workItemId: string, payload: ProcessWorkItemDtoDraft, bpmn?: string, userId?: string) {
    let doc = await this.runtime.repo.getDocument(docId);
    if (!doc) {
      doc = await this.runtime.repo.getOutgoingDocument(docId);
    }
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.createDocDraft({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      bpmnVersion: doc.bpmnVersion,
      userId
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã tạo dự thảo.`, 'VIEW_INCOMING_DOC', '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }
  async completeDoc(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Check quyền hoàn thành văn bản
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'hoàn thành văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    let doc = await this.runtime.repo.getDocument(docId);
    if (!doc) {
      doc = await this.runtime.repo.getOutgoingDocument(docId);
    }
    if (!doc) throw new NotFoundException(`Không tìm thấy văn bản với ID: ${docId}`);

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeDoc({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      originalUser,
      userId
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã được hoàn thành.`, 'VIEW_INCOMING_DOC', '', NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }
  async processDocument(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, author: string, bpmn?: string) {
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Bắt đầu processDocument - docId: ${docId}, workItemId: ${workItemId}, userId (người thực hiện): ${userId}, payload.userId (người gửi thực tế): ${payload?.userId}`);
    }
    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'phân công xử lý văn bản', userInfo?.parent?.id);
    if (!check.allowed) {
      if (this.enableDebugNotificationLog) {
        this.logger.warn(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Quyền xử lý không hợp lệ: ${check.reason}`);
      }
      throw new ForbiddenException(check.reason);
    }

    const doc = await this.runtime.repo.getDocument(docId);

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.processDocumentv2({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      doc,
      bpmnVersion: doc.bpmnVersion,
      departmentId: userInfo?.parent?.id,
      skipRoleValidation: true
    });

    // 2️⃣ Xác định danh sách những người nhận mới
    let openUserIds: string[] = [];
    if (result?.nextNode?.tasks?.length > 0) {
      openUserIds = result.nextNode.tasks.map((t: any) => String(t.assignee));
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Lấy danh sách người nhận mới từ result.nextNode.tasks: ${JSON.stringify(openUserIds)}`);
      }
    }

    if (openUserIds.length === 0 && this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Không tìm thấy người nhận nào từ BPMN hoặc openWorkItems.`);
    }

    // 3️⃣ Xác định danh sách những người nhận mới (không lấy người trong luồng cũ)
    const allRecipients = new Set<string>(openUserIds.filter(Boolean));

    // 4️⃣ Loại bỏ người thực hiện hành động phân công
    const senderId = payload.userId || userId;
    if (senderId) {
      const existedBeforeDelete = allRecipients.has(String(senderId));
      allRecipients.delete(String(senderId));
      if (existedBeforeDelete && this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Loại bỏ senderId: ${senderId} khỏi danh sách allRecipients để tránh tự gửi cho bản thân.`);
      }
    }

    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Danh sách allRecipients cuối cùng sau lọc: ${JSON.stringify(Array.from(allRecipients))}`);
    }

    // 5️⃣ Duyệt qua từng người nhận và sử dụng hàm createNotifications bằng cách truyền fakeResult (không để riêng dòng gọi gốc)
    if (allRecipients.size > 0) {
      const nextRole = result?.nextNode?.targetRole || result?.nextNode?.nextTargeRole;

      for (const recipientId of allRecipients) {
        const role = nextRole;

        const fakeResult = {
          document: {
            ...result?.document,
            openWorkItems: [{
              assigneeUserId: recipientId,
              role: role,
              roleProcess: null
            }]
          },
          actionCode: result?.actionCode,
          nextNode: result?.nextNode ? {
            ...result.nextNode,
            tasks: [{ assignee: recipientId }],
            targetRole: role,
            nextTargeRole: role
          } : null
        };

        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] Chuẩn bị gọi createNotifications cho recipientId: ${recipientId} | senderId: ${payload.userId || userId}`);
        }
        this.createNotifications(
          fakeResult,
          payload.userId,
          docId,
          `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`,
          'VIEW_INCOMING_DOC',
          undefined,
          NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value
        ).catch((err) => {
          this.logger.error(`Lỗi gửi thông báo phân công xử lý văn bản cho user ${recipientId}: ${err.message}`);
        });
      }
    } else if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] allRecipients trống hoặc rỗng sau lọc trùng/lọc sender, không gửi thông báo.`);
    }

    return result;
  }

  private async sendProcessDocumentEmail(options: {
    email: string;
    recipientName: string;
    toBook: string;
    abstractNote: string;
    organizationName: string;
    deadline: string;
    docLink: string;
    messageText: string;
    subject: string;
  }): Promise<void> {
    try {
      const html = `<!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:20px auto; background:#ffffff; border:1px solid #e0e0e0;">
            <tr>
              <td style="padding:30px 35px;">

                <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                  Kính gửi Ông/Bà: &nbsp;<strong>${options.recipientName}</strong>
                </p>

                <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                  Hệ thống Văn phòng số xin thông báo:
                </p>

                <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                  Văn bản: ${options.toBook}
                </p>
                <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                  Trích yếu: "${options.abstractNote}"
                </p>
                <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                  Đơn vị: ${options.organizationName}
                </p>
                <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
                  Người được giao xử lý: ${options.recipientName}
                </p>
                <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.8;">
                  Thời hạn xử lý: ${options.deadline}
                </p>

                <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                  ${options.messageText.replace(/\n/g, '<br>')}
                </p>

                <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
                  Đồng chí có thể nhấn vào đường dẫn: <a href="${options.docLink}" style="color:#1a73e8;">${options.docLink}</a> để xử lý.
                </p>

                <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.6;">
                  Trong trường hợp đã hoàn thành hoặc có vướng mắc trong quá trình xử lý, kính đề nghị phản hồi hoặc liên hệ với bộ phận quản trị hệ thống để được hỗ trợ.
                </p>

                <br>
                <p style="margin:0 0 4px; color:#333; font-size:14px;">Trân trọng,</p>
                <p style="margin:0 0 0; color:#0088cc; font-size:14px; font-weight:bold;">TỔNG CÔNG TY TÂN CẢNG SÀI GÒN</p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:15px 35px; border-top:1px solid #e0e0e0;">
                <p style="margin:0 0 4px; color:#666; font-size:13px;">Hệ thống Văn phòng số</p>
                <p style="margin:0; color:#999; font-size:12px;">(Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.)</p>
              </td>
            </tr>
          </table>
        </body>
      </html>`;

      await this.mailService.sendMail({
        to: options.email,
        subject: options.subject,
        html,
      });
    } catch (err) {
      this.logger.error(
        `[process-document][notify] ❌ Send email failed for ${options.email}`,
        err,
      );
    }
  }

  private buildOutgoingDocLink(outgoingDocId: string): string {
    const relativePath = `/outgoing-documents/${outgoingDocId}`;
    const frontendBaseUrl =
      this.configService.get<string>('REDIRECT_URI_FE') ||
      this.configService.get<string>('KEYCLOAK_DOMAIN_FE') ||
      '';
    if (!frontendBaseUrl) {
      return relativePath;
    }
    return `${frontendBaseUrl.replace(/\/+$/, '')}${relativePath}`;
  }

  private async checkViewerPermission(docId: string, userId: string): Promise<boolean> {
    try {
      const userInfo: any = await this.sqlsvRepo.getUserById(userId);
      const receiverUnit = userInfo?.parent?.id || null;
      const isVanThu = await this.usersService.checkVanThuTct(userId);

      const dbName = this.configService.get<string>('SQLSERVER_DATABASE');
      const pool = await getMssqlPool(this.configService);

      const receiverCond = isVanThu && receiverUnit
        ? `(receiver = @currentUserId OR receiver = @receiverUnit OR EXISTS (SELECT 1 FROM ${dbName}.dbo.users u_vt WITH (NOLOCK) WHERE u_vt.id = receiver AND u_vt.parent = @receiverUnit))`
        : `receiver = @currentUserId`;

      const reqAssign = pool.request();
      reqAssign.input('currentUserId', sql.NVarChar(100), userId);
      if (receiverUnit) {
        reqAssign.input('receiverUnit', sql.NVarChar(100), receiverUnit);
      }
      reqAssign.input('docId', sql.VarChar(100), docId);

      const query = `
        SELECT role_process, stage_status 
        FROM ${dbName}.dbo.incomming_assignment WITH (NOLOCK)
        WHERE document_id = @docId AND ${receiverCond}
      `;

      const result = await reqAssign.query(query);
      const assignments = result.recordset || [];

      if (assignments.length > 0) {
        const hasProcessorOrSupporter = assignments.some(
          (a: any) => (a.role_process === 'processor' || a.role_process === 'supporter') && a.stage_status === 'CHUA_XU_LY'
        );

        if (!hasProcessorOrSupporter) {
          const hasViewer = assignments.some((a: any) => a.role_process === 'viewer');
          if (hasViewer) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      this.logger.error(`[checkViewerPermission] Error: ${error.message}`);
      return false;
    }
  }

  async updateViewerStatus(docId: string, workItemId: string, payload: ProcessWorkItemDto, bpmn?: string, userId?: string) {
    // Check quyền đánh dấu đã xem
    if (userId) {
      const isBypass = await this.checkViewerPermission(docId, userId);
      if (!isBypass) {
        const wi = await this.repo.getWorkItem(docId, workItemId);
        const userInfo: any = await this.sqlsvRepo.getUserById(userId);
        const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'đánh dấu đã xem');
        if (!check.allowed) throw new ForbiddenException(check.reason);
      }
    }

    const doc = await this.runtime.repo.getDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.updateStatusAudit({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
    });
    // No notification needed for "viewed" action
    return result;
  }


  async updateSupporterStatus(docId: string, workItemId: string, payload: ProcessWorkItemDto, bpmn?: string, userId?: string) {
    // Check quyền hoàn thành phối hợp
    if (userId) {
      const wi = await this.repo.getWorkItem(docId, workItemId);
      const userInfo: any = await this.sqlsvRepo.getUserById(userId);
      const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'hoàn thành phối hợp');
      if (!check.allowed) throw new ForbiddenException(check.reason);
    }

    const doc = await this.runtime.repo.getDocument(docId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc?.bpmnVersion);
    const result = await this.runtime.updateStatusAudit({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      bpmnVersion: doc.bpmnVersion,
      userId
    });
    await this.createNotifications(result, payload.userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã được phối hợp xử lý.`, 'VIEW_INCOMING_DOC', doc.abstract_note, NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }
  async setProcessor(workItemId: string, payload: SetProcessItemDto, userId: string, bpmn?: string, isCentralized?: boolean) {
    const t0 = Date.now();

    // [TỐI ƯU] Chạy song song: getWorkItem + getUserById + getOutgoingDocument (độc lập nhau)
    // console.time(`[DEBUG_SETPROCESSOR] parallel_setup`);
    const [wi, userInfo, doc] = await Promise.all([
      this.repo.getWorkItem(payload?.docIds, workItemId),
      this.sqlsvRepo.getUserById(userId),
      this.runtime.repo.getOutgoingDocument(payload?.docIds),
    ]);
    // console.timeEnd(`[DEBUG_SETPROCESSOR] parallel_setup`);

    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'trình ký văn bản', userInfo?.parent?.id);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const startTime = Date.now();
    // console.time(`[DEBUG_SETPROCESSOR] getBpmnFile`);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    // console.timeEnd(`[DEBUG_SETPROCESSOR] getBpmnFile`);

    if (isCentralized) {
      // console.time(`[DEBUG_SETPROCESSOR] processCentralizedSignature`);
      await this.integrationSignatureService.processCentralizedSignature(bpmnXML, payload?.docIds, workItemId, payload?.actionCode, 'setProcessor', payload.assignToUserId);
      // console.timeEnd(`[DEBUG_SETPROCESSOR] processCentralizedSignature`);
    }

    const keySign = {
      signUrl: null,
      secretSign: 'secret',
      expiresInTokenSign: '300s'
    };

    // Chỉ gọi getDetails khi action là ký số tập trung thực sự (KY_SO, KY_PHAT_HANH...)
    // KHÔNG gọi cho các action TRINH_* vì không cần docDetail
    const isActualSignAction = payload?.actionCode?.startsWith('KY_') || payload?.actionCode === 'DONG_DAU';
    let docDetail: any = null;
    if (isActualSignAction && (keySign?.signUrl || process.env.URL_KY_TAP_TRUNG)) {
      // console.time(`[DEBUG_SETPROCESSOR] getDetails (signAction)`);
      try {
        docDetail = await this.outgoingDocumentsService.getDetails(
          payload?.docIds,
          userId,
          [],
          undefined,
          undefined,
          undefined,
        );
      } catch (e) {
        console.warn('Lỗi khi lấy docDetail để gửi sang ký số tập trung', e.message);
      }
      // console.timeEnd(`[DEBUG_SETPROCESSOR] getDetails (signAction)`);
    }

    // console.time(`[DEBUG_SETPROCESSOR] runtime.setProcessor`);
    const modelRes = await this.runtime.getModelFromXml(bpmnXML);
    const result = await this.runtime.setProcessor({
      bpmnXML,
      workItemId,
      payload,
      userId,
      bpmnVersion: doc.bpmnVersion,
      doc,
      docDetail,
      wi,
      modelRes,
    });
    // console.timeEnd(`[DEBUG_SETPROCESSOR] runtime.setProcessor`);
    //console.log(`[DEBUG_SETPROCESSOR] total setProcessor wrapper: ${Date.now() - t0}ms`);

    result.actionCode = payload?.actionCode;

    let content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình ký.`;
    if (payload?.actionCode === 'TRINH_KIEM_TRA_TT') {
      content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình kiểm tra thể thức.`;
    } else if (payload?.actionCode === 'TRINH_DUYET') {
      content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình duyệt.`;
    }

    // Chỉ gửi thông báo khi đã chuyển bước (có tasks cho bước tiếp theo)
    // Nếu là signer node và chưa phải người ký cuối, nextNode.tasks sẽ rỗng hoặc không chuyển bước → không gửi thông báo sớm
    if (result?.nextNode?.tasks?.length > 0 && !(result?.isSignerNode && !result?.isLastSigner)) {
      this.createNotifications(result, payload.userId, payload.docIds, content, 'VIEW_OUTCOMING_DOC', doc.abstractNote, NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value).catch(e => console.error(e));
      this.createConcurrentStepOutgoingNotifications(
        result,
        payload.userId,
        payload.docIds,
        this.buildNextStageNotificationContent(doc),
        doc.bpmnVersion,
        doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
      ).catch(e => console.error(e));
    }

    return result;
  }

  async setProcessors(workItemId: string, payload: SetProcessorsItemDto, userId: string, bpmn?: string, isCentralized?: boolean) {
    // Check quyền trình ký VB đi
    const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'trình ký văn bản', userInfo?.parent?.id);
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const startTime = Date.now();

    const doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);

    // if (isCentralized) {
    //   await this.integrationSignatureService.processCentralizedSignature(bpmnXML, payload?.docIds, workItemId, payload?.actionCode, 'setProcessor', payload.assignToUserId);
    //   console.log(`[setProcessors] Processed centralized signature - elapsed: ${Date.now() - startTime}ms`);
    // }

    const keySign = {
      signUrl: null,
      secretSign: 'secret',
      expiresInTokenSign: '300s'
    };

    let docDetail: any = null;
    if ((keySign?.signUrl || process.env.URL_KY_TAP_TRUNG)) {
      try {
        docDetail = await this.outgoingDocumentsService.getDetails(
          payload?.docIds,
          userId,
          [],
          undefined,
          undefined,
          undefined,
        );
      } catch (e) {
        console.warn('Lỗi khi lấy docDetail để gửi sang ký số tập trung', e.message);
      }
    }

    const result = await this.runtime.setProcessor({
      bpmnXML,
      workItemId,
      payload,
      userId,
      bpmnVersion: doc.bpmnVersion,
      doc,
      docDetail,
    });

    result.actionCode = payload?.actionCode;

    let content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình ký.`;
    if (payload?.actionCode === 'TRINH_KIEM_TRA_TT') {
      content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình kiểm tra thể thức.`;
    } else if (payload?.actionCode === 'TRINH_DUYET') {
      content = `Văn bản đi ${this.getDocNumber(doc)}đã được trình duyệt.`;
    }

    // Chỉ gửi thông báo khi đã chuyển bước (có tasks cho bước tiếp theo)
    // Nếu là signer node và chưa phải người ký cuối, nextNode.tasks sẽ rỗng hoặc không chuyển bước → không gửi thông báo sớm
    if (result?.nextNode?.tasks?.length > 0 && !(result?.isSignerNode && !result?.isLastSigner)) {
      this.createNotifications(result, payload.userId, payload.docIds, content, 'VIEW_OUTCOMING_DOC', doc.abstractNote, NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value).catch(e => console.error(e));
      this.createConcurrentStepOutgoingNotifications(
        result,
        payload.userId,
        payload.docIds,
        this.buildNextStageNotificationContent(doc),
        doc.bpmnVersion,
        doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
      ).catch(e => console.error(e));
    }

    return result;
  }
  async approveDraft(workItemId: string, payload: SetProcessItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Check quyền đồng ý dự thảo
    const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'đồng ý dự thảo');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.approveDraft({
      bpmnXML,
      workItemId,
      payload,
      userId,
      originalUser,
      bpmnVersion: doc.bpmnVersion
    });
    await this.createNotifications(result, payload.userId, payload.docIds, `Dự thảo văn bản đi ${this.getDocNumber(doc)}đã được duyệt.`, 'VIEW_OUTCOMING_DOC', doc.abstractNote, NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value);
    this.createConcurrentStepOutgoingNotifications(
      result,
      payload.userId,
      payload.docIds,
      this.buildNextStageNotificationContent(doc),
      doc.bpmnVersion,
      doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
    ).catch(e => console.error(e));
    return result;
  }
  async completeDraft(workItemId: string, payload: SetProcessItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Check quyền hoàn thành tờ trình
    const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'hoàn thành tờ trình');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.completeDraft({
      bpmnXML,
      workItemId,
      payload,
      userId,
      originalUser,
    });
    await this.createNotifications(result, payload.userId, payload.docIds, `Văn bản tờ trình ${this.getDocNumber(doc)}đã được hoàn thành.`, 'VIEW_OUTCOMING_DOC', doc.abstractNote, NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value);
    this.createConcurrentStepOutgoingNotifications(
      result,
      payload.userId,
      payload.docIds,
      this.buildNextStageNotificationContent(doc),
      doc.bpmnVersion,
      doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
    ).catch(e => console.error(e));
    return result;
  }
  async promulgateDocument(workItemId: string, payload: SetProcessItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Check quyền ban hành
    const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'ban hành văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    this.logger.warn(
      `[promulgate-doc] Start service docId=${payload?.docIds}, workItemId=${workItemId}, userId=${userId}`,
    );
    const runtimeResult = await this.runtime.promulgateDocument({
      bpmnXML,
      workItemId,
      payload,
      userId,
      originalUser,
    });
    const {
      incomingCopiesForUnits = [],
      ...result
    } = runtimeResult || {};
    this.logger.warn(
      `[promulgate-doc] Runtime finished docId=${payload?.docIds}, incomingCopiesForUnits=${incomingCopiesForUnits.length}`,
    );
    let docReplacements: any[] = [];
    const promulgateDocNumber = this.getDocNumber(doc);
    const promulgateContent = `Văn bản đi ${promulgateDocNumber}đã được ban hành.`;

    if (doc?.docReplacement) {
      if (Array.isArray(doc.docReplacement)) {
        docReplacements = doc.docReplacement;
      } else if (typeof doc.docReplacement === 'string') {
        try {
          const parsed = JSON.parse(doc.docReplacement);
          docReplacements = Array.isArray(parsed) ? parsed : [];
        } catch {
          docReplacements = [];
        }
      }
    }
    // Tạo bản ghi văn bản đến cho các processor nếu có
    const incomingDocs: any[] = [];
    if (doc?.processor) {
      try {
        let processorIds: string[] = [];
        if (Array.isArray(doc.processor)) {
          processorIds = doc.processor.map(String).filter(Boolean);
        } else if (typeof doc.processor === 'string') {
          try {
            const parsed = JSON.parse(doc.processor);
            processorIds = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
          } catch {
            processorIds = [doc.processor];
          }
        }

        if (processorIds.length > 0) {
          for (const processorUserId of processorIds) {
            try {
              const userInfo = await this.sqlsvRepo.getUserById(processorUserId);
              const unitId = userInfo?.parent?.id;
              if (!unitId) continue;

              const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(unitId), 'IncommingDocument');
              if (!flowConfig) continue;

              const tx = await this.repo.begin();
              try {
                const res = await this.runtimeDbService.createIncomingDocumentCopyProcessor({
                  outgoing: doc,
                  receiverUnit: unitId,
                  processorUserId,
                  flowConfig,
                  payload,
                  wi: { id: '' },
                  tx,
                  actionCode: 'CHUYEN_XU_LY',
                  skipDuplicateCheck: false,
                  notification: true,
                  userId,
                });
                await this.repo.commit(tx);
                incomingDocs.push({
                  ...res,
                  flowId: flowConfig.id,
                  receiverUnit: unitId,
                });
              } catch (txErr) {
                await this.repo.rollback(tx);
                console.error(`[promulgateDocument] Error creating incoming doc for processor ${processorUserId}:`, txErr);
              }
            } catch (userErr) {
              console.error(`[promulgateDocument] Error processing processor user ${processorUserId}:`, userErr);
            }
          }
        }
      } catch (err) {
        console.error('[promulgateDocument] Unexpected error in incoming doc creation:', err);
      }
    }
    const replacedDocumentId: string | null =
      docReplacements[0]?.documentId || null;

    if (replacedDocumentId) {
      await this.runtime.repo.updateOutgoingDocumentByDocumentId(
        replacedDocumentId,
        { replaced: true }
      );
    }
    await this.createNotifications(
      result,
      payload.userId,
      payload.docIds,
      promulgateContent,
      'VIEW_OUTCOMING_DOC',
      doc.abstractNote,
      NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value
    );

    if (incomingCopiesForUnits.length > 0) {
      this.dispatchPromulgateNotificationsForReceivingUnits(
        incomingCopiesForUnits,
        payload.userId || userId,
        promulgateContent,
        promulgateDocNumber,
        doc?.abstractNote || doc?.abstract_note,
        payload?.docIds,
      );
    } else {
      this.logger.warn(
        `[promulgate-doc] Skip receiving-unit notifications docId=${payload?.docIds}, replacedDocumentId=${replacedDocumentId || 'null'}, copies=${incomingCopiesForUnits.length}`,
      );
    }

    // Gửi thông báo và email cho processor
    if (incomingDocs.length > 0) {
      const processorCopies = incomingDocs
        .filter((doc: any) => doc?.incomingDocId && doc?.flowId && doc?.receiverUnit)
        .map((doc: any) => ({
          incomingDocId: doc.incomingDocId,
          flowId: doc.flowId,
          receiverUnit: doc.receiverUnit,
        }));

      if (processorCopies.length > 0) {
        this.dispatchPromulgateNotificationsForReceivingUnits(
          processorCopies,
          payload.userId || userId,
          promulgateContent,
          promulgateDocNumber,
          doc?.abstractNote || doc?.abstract_note,
          payload?.docIds,
        );
      }
    }

    return { ...result, incomingDocs };
  }
  async proposeDocumentIssuance(workItemId: string, payload: SetProcessItemDto, userId: string, originalUser: string, bpmn?: string) {
    // Check quyền đề nghị ban hành
    const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'đề nghị ban hành');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    const doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);
    const bpmnXML = await this.runtime.repo.getBpmnFile('VAN_BAN_DI');
    const result = await this.runtime.proposeDocumentIssuance({
      bpmnXML,
      workItemId,
      payload,
      userId,
      originalUser,
    });
    await this.createNotifications(result, payload.userId, payload.docIds, `Văn bản đi ${this.getDocNumber(doc)}đã được đề nghị ban hành.`, 'VIEW_OUTCOMING_DOC', doc.abstractNote, NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value);
    this.createConcurrentStepOutgoingNotifications(
      result,
      payload.userId,
      payload.docIds,
      this.buildNextStageNotificationContent(doc),
      doc.bpmnVersion,
      doc.abstractNote || 'Thông báo cho giai đoạn tiếp theo',
    ).catch(e => console.error(e));
    return result;
  }

  async getWorkItemByDocId({ docId, role, userId }: { docId: string; role?: string; userId: string }) {
    const workItem = await this.workItemRepository.findOne({
      where: {
        documentId: docId,
        assigneeUserId: userId,
        role: role,
        state: 'open'
      },
    });
    return workItem;
  }
  async signDoc(
    workItemId: string,
    payload: any,
    userId: string,
    originalUser: string,
    externalTransaction?: any, // Tham số mang transaction từ bên ngoài vào (tham số thứ 5)
    req?: any,
    bpmn?: string,
    isCentralized?: boolean
  ) {
    const signDocStartedAt = Date.now();
    let signDocCurrentStep = 'Step 0 (Start)';
    const logWorkItemsSignDocStep = (step: string, extra: Record<string, any> = {}) => {
      signDocCurrentStep = step;
      void extra;
    };

    logWorkItemsSignDocStep('Step 0 (Start)', { isCentralized: Boolean(isCentralized) });
    try {
      // Check quyền ký số
      logWorkItemsSignDocStep('Step 1 (Check permission)');
      const wi = await this.repo.getWorkItem(payload?.docIds, workItemId);
      const userInfo: any = await this.sqlsvRepo.getUserById(userId);
      const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'ký số');
      if (!check.allowed) throw new ForbiddenException(check.reason);
      logWorkItemsSignDocStep('Step 1.1 (Permission OK)', {
        foundWorkItem: Boolean(wi),
        workItemState: wi?.state,
        assigneeUserId: wi?.assigneeUserId || wi?.assignee_user_id,
        userOrgId: userInfo?.parent?.id,
      });

      logWorkItemsSignDocStep('Step 2 (Resolve document)');
      let doc = await this.runtime.repo.getOutgoingDocument(payload?.docIds);
      let docType = 'outgoing_document';
      if (!doc) {
        doc = await this.runtime.repo.getDocument(payload?.docIds);
        docType = 'incoming_document';
      }
      if (!doc) {
        throw new BadRequestException(`[signDoc] Khong tim thay van ban di voi docIds = "${payload?.docIds}". Kiem tra lai payloadSign.docIds tu callback ky so tap trung.`);
      }
      logWorkItemsSignDocStep('Step 2.1 (Document resolved)', {
        docType,
        documentId: doc?.documentId || doc?.document_id,
        bpmnVersion: doc?.bpmnVersion,
      });
      const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
      logWorkItemsSignDocStep('Step 2.2 (BPMN loaded)', {
        bpmnVersion: doc?.bpmnVersion,
        bpmnLength: bpmnXML?.length || 0,
      });

      // Pre-fetch properties TRƯỚC signDoc (vì signDoc sẽ xóa work item)
      logWorkItemsSignDocStep('Step 3 (Load signature config)', { isCentralized: Boolean(isCentralized) });
      let preProperties: any = null;
      if (isCentralized) {
        preProperties = await this.integrationSignatureService.getProperties(bpmnXML, payload?.docIds, workItemId, payload?.actionCode);
      }

      const keySign = await this.repo.getSigningConfig();
      logWorkItemsSignDocStep('Step 3.1 (Signature config loaded)', {
        hasPreProperties: Boolean(preProperties),
        hasKeySign: Boolean(keySign),
        hasCentralizedSignUrl: Boolean(keySign?.signUrl || process.env.URL_KY_TAP_TRUNG),
      });

      const docDetail: any = null;
      // if ((keySign?.signUrl || process.env.URL_KY_TAP_TRUNG) && docType === 'outgoing_document') {
      //   try {
      //     docDetail = await this.outgoingDocumentsService.getDetails(
      //       payload?.docIds,
      //       userId,
      //       [],
      //       undefined,
      //       undefined,
      //       undefined,
      //     );
      //   } catch (e) {
      //     console.warn('[signDoc] Could not get docDetail for signature:', e.message);
      //   }
      // }
      // else if ((keySign?.signUrl || process.env.URL_KY_TAP_TRUNG) && docType === 'incoming_document') {
      //   try {
      //     docDetail = await this.runtime.getDetails(
      //       payload?.docIds,
      //       userId,
      //       [],
      //       undefined,
      //       undefined,
      //       undefined,
      //     );
      //   } catch (e) {
      //     console.warn('[signDoc] Could not get docDetail for signature:', e.message);
      //   }
      // }

      logWorkItemsSignDocStep('Step 4 (Before runtime.signDoc)');
      const result = await this.runtime.signDoc({
        bpmnXML,
        workItemId,
        payload,
        userId,
        originalUser,
        bpmnVersion: doc.bpmnVersion,
        doc,
        workItem: wi, // [TỐI ƯU] Truyền workItem đã fetch ở Step 1
        docDetail,
        keySign,
        externalTransaction, // <--- Đẩy transaction xuống tầng lõi
        docType,
      });
      logWorkItemsSignDocStep('Step 4.1 (After runtime.signDoc)', {
        status: result?.status,
        nextNodeId: result?.nextNode?.id,
        nextTasksCount: result?.nextNode?.tasks?.length || 0,
        incomingCopiesCount: result?.incomingCopiesForUnits?.length || 0,
      });

      // Gọi processCentralizedSignature SAU signDoc để có nextTasks (next assignees)
      // if (isCentralized && preProperties) {
      //   const nextAssignees = result?.nextNode?.tasks?.map((t: any) => t.assignee) || [];
      //   await this.integrationSignatureService.processCentralizedSignature(
      //     bpmnXML, payload?.docIds, workItemId, payload?.actionCode, 'signDoc', userId, nextAssignees, preProperties
      //   );
      // }

      // if (result.status === 1 && process.env.URL_NESTJS) {
      //   const files = await this.repo.getFileByDocId(doc.documentId);
      //   const documentFiles: any[] = [];
      //   const baseFileUrl = process.env.URL_NESTJS + '/api/files/view';

      //   if (!files || files.length === 0) {
      //     throw new Error('No files found for document');
      //   }

      //   // Group files
      //   const duthaoFiles = files.filter(f => f.objectType === 'docDraft');
      //   const dinhkemFiles = files.filter(f => f.objectType === 'docAttachments');
      //   const dexuatFiles = files.filter(f => f.objectType === 'docProposal');

      //   if (duthaoFiles.length > 0) {
      //     documentFiles.push({
      //       title: 'VĂN BẢN DỰ THẢO',
      //       name: 'duthao',
      //       fileList: duthaoFiles.map(f => ({
      //         name: f.fileName,
      //         fileUrl: `${baseFileUrl}/${f.fileId}`,
      //         objectType: f.objectType,
      //         objectId: f.objectId,
      //         isSinged: f.isSignedFile || false
      //       }))
      //     });
      //   }

      //   if (dinhkemFiles.length > 0) {
      //     documentFiles.push({
      //       title: 'VĂN BẢN ĐÍNH KÈM',
      //       name: 'vbdinhkem',
      //       fileList: dinhkemFiles.map(f => ({
      //         name: f.fileName,
      //         fileUrl: `${baseFileUrl}/${f.fileId}`,
      //         objectType: f.objectType,
      //         objectId: f.objectId,
      //         isSinged: f.isSignedFile || false
      //       }))
      //     });
      //   }
      //   if (dexuatFiles.length > 0) {
      //     documentFiles.push({
      //       title: 'VĂN BẢN ĐỀ XUẤT',
      //       name: 'vbdexuat',
      //       fileList: dexuatFiles.map(f => ({
      //         name: f.fileName,
      //         fileUrl: `${baseFileUrl}/${f.fileId}`,
      //         objectType: f.objectType,
      //         objectId: f.objectId,
      //         isSinged: f.isSignedFile || false
      //       }))
      //     });
      // }
      // }
      logWorkItemsSignDocStep('Step 5 (Before createNotifications)', { docType });
      this.createNotifications(result, userId, payload.docIds, `Văn bản ${this.getDocNumber(doc)}cần được xử lý.`, docType === 'outgoing_document' ? 'VIEW_OUTCOMING_DOC' : 'VIEW_INCOMING_DOC', doc.abstractNote || doc.abstract_note, NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
      logWorkItemsSignDocStep('Step 5.1 (After createNotifications)');
      return result;
    } catch (error: any) {
      console.error('--- [workItems.signDoc] Catch ---', {
        currentStep: signDocCurrentStep,
        elapsedMs: Date.now() - signDocStartedAt,
        workItemId,
        docIds: payload?.docIds,
        actionCode: payload?.actionCode,
        userId,
        originalUser,
        hasExternalTransaction: Boolean(externalTransaction),
        errorName: error?.name,
        errorMessage: error?.message || String(error),
      });
      if (error?.stack) {
        console.error(error.stack);
      }
      throw error;
    }
  }

  // Lịch họp
  async propose(meetingId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    const meeting = await this.runtime.repo.getMeeting(meetingId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(meeting.bpmnVersion);
    const result = await this.runtime.proposeWorkItem({
      bpmnXML,
      meetingId: meetingId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: meeting.bpmnVersion
    });
    await this.createNotificationsForMeetingBackground(
      result,
      payload.userId,
      meetingId,
      `Đồng chí có lịch họp được trình ký.`,
      'VIEW_MEETING',
      NotificationType.MEETING_APPROVAL_REQUESTED.value,
    );
    return result;
  }

  async rejectMeeting(meetingId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    const meeting = await this.runtime.repo.getMeeting(meetingId);
    const userIdReturn = await this.runtime.repo.getUserRejectMeeting(
      meetingId,
      workItemId,
    );
    const bpmnXML = await this.runtime.repo.getBpmnFile(meeting.bpmnVersion);

    const result = await this.runtime.rejectMeetingWorkItem({
      bpmnXML,
      meetingId: meetingId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: meeting.bpmnVersion,
      userIdReturn,
    });

    // notification chạy background (không await)
    const recipientIds = userIdReturn ? [userIdReturn] : [];

    this.notificationService.createForRecipients({
      recipientIds,
      senderId: userId,
      type: NotificationType.MEETING_REJECTED.value,
      content: ` Cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} đã bị từ chối`,
      recordId: meeting.id,
      link: `/meetings/${meeting.id}?listparammeeting=NO_ACTION_PREPARE`,
      key: NotificationKey.VIEW_MEETING_ROOM,
      time: new Date(),
      status: 0,
    });

    // email chạy background (không await)
    this.handleSendRejectEmailBackground(userIdReturn, meeting);

    return result;
  }
  private async sendMeetingRejectedEmail(
    email: string,
    meeting: any,
  ) {
    try {
      const subject = `[Cuộc họp bị từ chối] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Lịch họp sau đã bị <b>TỪ CHỐI</b> và cần chỉnh sửa:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime ?? ''} 
          ${meeting.meetingDate ? `ngày ${formatDateVN(meeting.meetingDate)}` : ''}
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết và cập nhật lại thông tin cuộc họp.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
    }
  }

  async approveMeeting(meetingId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, originalUser: string, author?: string | null, bpmn?: string) {
    const meeting = await this.runtime.repo.getMeeting(meetingId);
    const bpmnXML = await this.runtime.repo.getBpmnFile(meeting.bpmnVersion);
    if (!meeting) {
      throw new BadRequestException(`Không tìm thấy cuộc họp với id ${meetingId}`);
    }
    const result = await this.runtime.approveMeetingWorkItem({
      bpmnXML,
      meetingId: meetingId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: meeting.bpmnVersion,
    });

    // Tự động tạo phiên lặp đầu tiên nếu có lịch lặp được xử lý trực tiếp hoặc bỏ qua ở đây.
    try {
      await this.repo.generateFirstRecurringInstanceSql(meetingId);
    } catch (err) {
      this.logger.error(`[approveMeeting] Failed to generate first recurring instance for ${meetingId}`, err);
    }

    // const { flowUserIds, unitUserIds } = result;

    // TODO: Tạm comment để tránh trùng thông báo với sendMeetingNotificationsByIdAsync
    // // Gửi thông báo cho người tham gia flowUserIds
    // if (flowUserIds.length > 0) {
    //   this.notificationService.createForRecipients({
    //     recipientIds: flowUserIds,
    //     senderId: userId,
    //     type: NotificationType.MEETING_APPROVED.value,
    //     content: `Cuộc họp "${meeting.title}" đã được phê duyệt. Vui lòng thực hiện công việc tiếp theo trong quy trình.`,
    //     recordId: meetingId,
    //     link: `/meetings/${meetingId}`,
    //     key: NotificationKey.VIEW_MEETING_ROOM,
    //     time: new Date(),
    //     status: 0,
    //   });
    // }
    //
    // if (flowUserIds?.length) {
    //   this.handleSendEmailBackground(flowUserIds, userId, meeting);
    // }

    // TODO: Tạm comment để tránh trùng thông báo với sendMeetingNotificationsByIdAsync
    // // Gửi thông báo cho văn thư đơn vị
    // if (unitUserIds.length > 0) {
    //   this.notificationService.createForRecipients({
    //     recipientIds: unitUserIds,
    //     senderId: userId,
    //     content: `Cuộc họp "${meeting.title}" đã được phê duyệt và bạn đã được giao nhiệm vụ. Vui lòng kiểm tra các chi tiết cuộc họp.`,
    //     recordId: meetingId,
    //     link: `/meetings/${meetingId}`,
    //     key: 'VIEW_PROCESSING_SCHEDULE',
    //     time: new Date(),
    //     status: 0,
    //   });
    // }
    const userIdReturn = await this.runtime.repo.getUserRejectMeeting(
      meetingId,
      workItemId,
    );
    const recipientIds = userIdReturn ? [userIdReturn] : [];

    this.notificationService.createForRecipients({
      recipientIds,
      senderId: userId,
      type: NotificationType.MEETING_APPROVED.value,
      content: `Cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} đã được phê duyệt`,
      recordId: meeting.id,
      link: `/meetings/${meeting.id}?listparammeeting=PREPARE_MEETING`,
      key: NotificationKey.VIEW_MEETING_ROOM,
      time: new Date(),
      status: 0,
    });

    this.sendMeetingNotificationsByIdAsync(meetingId, userId).catch(err => {
      this.logger.error('sendMeetingNotificationsByIdAsync error:', err);
    });

    return result;
  }

  private handleSendEmailBackground(
    flowUserIds: string[],
    currentUserId: string,
    meeting: any,
  ) {
    setImmediate(async () => {
      try {
        const uniqueIds = [...new Set(flowUserIds)].filter(
          (id) => id !== currentUserId,
        );

        // query 1 lần thay vì N lần
        const users = await this.sqlsvRepo.getUsersByIds(uniqueIds);

        await Promise.all(
          users
            .filter((u) => u.emailUser) // lọc null
            .map((user) =>
              this.sendMeetingApprovedEmail(user.emailUser as string, meeting),
            ),
        );
      } catch (err) {
        this.logger.error('Send email failed', err);
      }
    });
  }
  private handleSendRejectEmailBackground(
    userId: string,
    meeting: any,
  ) {
    setImmediate(async () => {
      try {
        const user = await this.sqlsvRepo.getUserById(userId);
        if (user?.emailUser) {
          await this.sendMeetingRejectedEmail(
            user.emailUser,
            meeting,
          );
        }
      } catch (err) {
        this.logger.error('Send reject email failed', err);
      }
    });
  }
  private createNotificationsForMeetingBackground(
    result: any,
    senderId: string,
    meetingId: string,
    content: string,
    key: 'VIEW_MEETING',
    type: NotificationType,
  ) {
    setImmediate(async () => {
      try {
        if (result?.document?.openWorkItems) {
          const recipientIds: string[] = [];

          for (const wi of result.document.openWorkItems) {
            if (wi.assigneeUserId) {
              recipientIds.push(wi.assigneeUserId);
            }
          }

          if (recipientIds.length) {
            this.notificationService.createForRecipients({
              recipientIds,
              senderId,
              content,
              recordId: meetingId,
              link: `/meetings/${meetingId}?listparammeeting=APPROVER_MEETING`,
              key,
              time: new Date(),
              status: 0,
              type: type as NotificationType
            });
          }
        }
      } catch (err) {
        this.logger.error('Create reject notification failed', err);
      }
    });
  }
  private async sendMeetingApprovedEmail(
    email: string,
    meeting: any,
  ) {
    try {
      const subject = `[Cuộc họp đã được phê duyệt] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Cuộc họp sau đã được <b>PHÊ DUYỆT</b>:</p>

        <p>
          <b>Tiêu đề:</b> ${meeting.title}<br/>
          <b>Thời gian:</b> ${meeting.meetingTime ?? ''} 
          ${meeting.meetingDate ? `ngày ${formatDateVN(meeting.meetingDate)}` : ''}
        </p>

        <p>Bạn đã được giao bước xử lý tiếp theo trong quy trình. 
        Vui lòng đăng nhập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý cuộc họp</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });
    } catch (err) {
    }
  }

  async processProgress({
    processKey,
    workItemId,
    docId,
    userId,
    isStamp,
    hasStampQuery,
  }: {
    processKey: string;
    workItemId?: string;
    docId?: string;
    userId: string;
    isStamp?: string;
    hasStampQuery?: boolean;
  }) {
    if (docId) {
      const isAdmin = await checkAdminPermission(userId).catch(() => false);
      if (!isAdmin) {
        let hasAccess = await this.usersService.checkDocumentPermission(docId, userId);
        if (!hasAccess) {
          hasAccess = await this.usersService.hasOutgoingNextStageNotificationAccess(docId, userId);
        }
        if (!hasAccess) {
          const pool = await getMssqlPool(this.configService);
          const syncPermissionResult = await pool.request()
            .input('documentId', sql.NVarChar(100), String(docId))
            .input('userId', sql.NVarChar(100), String(userId))
            .query(`
              SELECT TOP 1 1 AS hasPermission
              FROM document_permissions_outgoing WITH (NOLOCK)
              WHERE target_document_id = @documentId
                AND (
                  target_user_id = @userId
                  OR CONVERT(NVARCHAR(100), source_personal_profile_id) = @userId
                )
            `)
            .catch(() => ({ recordset: [] as any[] }));
          hasAccess = Array.isArray(syncPermissionResult.recordset) && syncPermissionResult.recordset.length > 0;
        }
        if (!hasAccess) {
          throw new ForbiddenException('Bạn không có quyền xem thông tin này.');
        }
      }
    }
    let doc: any | undefined;
    if (docId) {
      try {
        doc = await this.repo.getOutgoingDocument(docId);
        if (!isStamp && doc) {
          isStamp = (doc.isStamp === true || doc.isStamp === 'true' || doc.reqSignFormatDraft === true || doc.reqSignFormatDraft === 'true') ? 'true' : 'false';
        }
      } catch (err) {
        console.warn('Error fetching doc for processProgress:', err.message);
      }
    }
    const bpmnXML = await this.runtime.repo.getBpmnFile(processKey);
    const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);

    let wi: any | undefined;
    let curNode: any | undefined;
    let auditArr: any[] = [];
    let nodeComplete: string[] = [];
    const nodeNoComplete: string[] = [];

    // if (docId && workItemId) {
    //   if (wi?.nodeId) {
    //     curNode = indexes.nodes.get(wi.nodeId);
    //   }
    // }
    if (docId) {
      auditArr = await this.repo.getAudit(docId || '');
      nodeComplete = auditArr
        .filter(a => a.actionCode !== 'TRA_LAI')
        .map(a => a.fromNodeId);
      if (workItemId) {
        wi = await this.repo.getWorkItem(docId, workItemId);
        const isOpenWorkItem = wi && String(wi.state || '').toLowerCase() === 'open';
        curNode = isOpenWorkItem && wi?.nodeId ? indexes.nodes.get(wi.nodeId) : null;
      }
      if (!curNode) {
        const openWorkItems = await this.repo.getWorkItemsByDocumentId(docId);
        const userWi = openWorkItems.find(w => w.state === 'open' && String(w.assigneeUserId || w.assignee_user_id) === String(userId));
        const openWi = userWi || openWorkItems.find(w => w.state === 'open');
        if (openWi) {
          curNode = indexes.nodes.get(openWi.nodeId);
        }
      }
      // nodeComplete = auditArr.filter(x=> x.stageStatus !== 'Chưa xử lý').map(audit => audit.fromNodeId);
      // nodeNoComplete = auditArr.filter(x=> x.stageStatus === 'Chưa xử lý').map(audit => audit.fromNodeId);
    }

    // ===== helper =====
    const getCamundaProperty = (node: any, propName: string): string | undefined => {
      const values = node?.extensionElements?.values;
      if (!Array.isArray(values)) return;

      for (const ext of values) {
        if (ext.$type === 'camunda:properties') {
          for (const prop of ext.$children || []) {
            if (prop.$type === 'camunda:property' && prop.name === propName) {
              return prop.value;
            }
          }
        }
      }
      return;
    };
    // const curOrder =
    //   curNode ? Number(getCamundaProperty(curNode, 'main')) : undefined;

    const isCamundaPropertyTrue = (node: any, propName: string): boolean => {
      const val = getCamundaProperty(node, propName);
      return val !== 'false' && val !== '' && val != null;
    };
    // currentLane là lane của bước quy trình đang mở; userLane là
    // lane/role của người gọi API. Không dùng role người gọi làm
    // currentLane vì người đã xử lý vẫn có thể xem tiến độ ở bước sau.
    let currentLane: string | null = null;
    let userLane: string | null = null;

    if (curNode?.id) {
      currentLane = indexes.laneMap.get(curNode.id) || null;
    } else if (wi?.nodeId) {
      currentLane = indexes.laneMap.get(wi.nodeId) || null;
    }

    const roleInfo = await this.repo.getUserRole(userId, processKey);
    const userRoles = Array.isArray(roleInfo?.roles)
      ? roleInfo.roles.filter((r: string) => !!r)
      : [];

    if (userRoles.length > 0) {
      const laneValues = Array.from(indexes.laneMap.values()).filter(Boolean) as string[];
      const laneByNormalizedName = new Map(
        laneValues.map((lane) => [String(lane).trim().toLowerCase(), lane]),
      );

      // Ưu tiên role trùng lane trong BPMN; fallback role đầu tiên của user.
      const matchedRole = userRoles.find((role: string) =>
        laneByNormalizedName.has(String(role).trim().toLowerCase()),
      );

      if (matchedRole) {
        userLane =
          laneByNormalizedName.get(String(matchedRole).trim().toLowerCase()) || null;
      } else {
        userLane = userRoles[0] || null;
      }
    }

    // Giữ fallback cho các request không có document/work item hiện tại.
    if (!currentLane) {
      currentLane = userLane;
    }

    let activeNodeOrder = Infinity;
    const SUBMISSION_ACTION_CODES = [
      'TRINH_KY', 'TRINH_DUYET', 'SUBMIT', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'
    ];
    const latestSubmissionAudit = auditArr
      .filter(a => a && SUBMISSION_ACTION_CODES.includes(a.actionCode))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    const latestReturnAudit = auditArr
      .filter(a => a && (
        a.actionCode === 'TRA_LAI' ||
        a.stageStatus === 'TRA_LAI' ||
        (typeof a.actionCode === 'string' && a.actionCode.startsWith('TRA_LAI')) ||
        (typeof a.stageStatus === 'string' && a.stageStatus.startsWith('TRA_LAI')) ||
        a.actionCode === 'THU_HOI' ||
        a.stageStatus === 'THU_HOI' ||
        a.actionCode === 'RECALL' ||
        a.stageStatus === 'RECALL' ||
        a.actionCode === 'THU_HOI_PHAN_CONG' ||
        a.stageStatus === 'THU_HOI_PHAN_CONG' ||
        a.actionCode === 'THU_HOI_DON_VI_NHAN_NOI_BO' ||
        a.stageStatus === 'THU_HOI_DON_VI_NHAN_NOI_BO' ||
        (typeof a.actionCode === 'string' && a.actionCode.startsWith('THU_HOI')) ||
        (typeof a.stageStatus === 'string' && a.stageStatus.startsWith('THU_HOI')) ||
        a.actionCode === 'TU_CHOI' ||
        a.stageStatus === 'TU_CHOI' ||
        a.actionCode === 'TU_CHOI_PHE_DUYET' ||
        a.stageStatus === 'TU_CHOI_PHE_DUYET'
      ))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestReturnAudit) {
      // Chỉ kích hoạt trạng thái trả lại nếu nó xảy ra SAU lần trình ký gần nhất
      const isReturnActive = !latestSubmissionAudit ||
        new Date(latestReturnAudit.createdAt).getTime() > new Date(latestSubmissionAudit.createdAt).getTime();
      if (isReturnActive) {
        const toNodeId = latestReturnAudit.toNodeId;
        const toNodeInBpmn = [...indexes.nodes.values()].find(n => n.id === toNodeId);
        const toNodeOrder = toNodeInBpmn ? Number(getCamundaProperty(toNodeInBpmn, 'main')) : NaN;

        if (!Number.isNaN(toNodeOrder)) {
          activeNodeOrder = toNodeOrder;
        } else {
          const precedingAudit = auditArr.find(a => a.toNodeId === toNodeId);
          if (precedingAudit) {
            const precedingNode = [...indexes.nodes.values()].find(n => n.id === precedingAudit.fromNodeId);
            if (precedingNode) {
              const precedingOrder = Number(getCamundaProperty(precedingNode, 'main'));
              if (!Number.isNaN(precedingOrder)) activeNodeOrder = precedingOrder;
            }
          }
        }
      }
    }
    const hasProgress = auditArr.length > 0;
    const nodeAssignmentById = new Map<string, Map<string, string>>();
    for (const audit of auditArr) {
      if (audit?.fromNodeId && audit?.userId) {
        const userInfo = await this.sqlsvRepo.getUserById(audit.userId);
        const userName = (audit.displayName && audit.displayName !== 'User' && audit.displayName !== 'user')
          ? audit.displayName
          : (userInfo?.name || audit.userId);
        if (!nodeAssignmentById.has(audit.fromNodeId)) {
          nodeAssignmentById.set(audit.fromNodeId, new Map());
        }
        nodeAssignmentById.get(audit.fromNodeId)!.set(audit.userId, userName);
      }
    }

    // Check lockSigners condition (for Outgoing Document)
    let lockSigners = false;
    let isReqFormatDraft = false;
    let isSubmitted = false;
    let isCurrentlyRecalledOrReturned = false;
    if (doc) {
      const SUBMISSION_ACTION_CODES = [
        'TRINH_KY', 'TRINH_DUYET', 'SUBMIT', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'
      ];
      isSubmitted = auditArr.some(a => a && SUBMISSION_ACTION_CODES.includes(a.actionCode));

      const getTime = (a: any) => {
        const t = a.updatedAt || a.createdAt;
        return t ? new Date(t).getTime() : 0;
      };
      const sortedAudits = [...auditArr]
        .filter(a => a != null)
        .sort((a, b) => {
          if (a.id != null && b.id != null) {
            const diff = Number(b.id) - Number(a.id);
            if (diff !== 0) return diff;
          }
          return getTime(b) - getTime(a);
        });

      const isRecallStatus = (statusOrCode: any) => {
        if (!statusOrCode || typeof statusOrCode !== 'string') return false;
        const s = statusOrCode.trim().toUpperCase();
        return (
          s === 'THU_HOI' ||
          s === 'THU_HOI_PHAN_CONG' ||
          s === 'THU_HOI_DON_VI_NHAN_NOI_BO' ||
          s === 'RECALL' ||
          s === 'ĐÃ THU HỒI' ||
          s === 'THU HOÌ' ||
          s === 'THU HỒI' ||
          s.includes('THU_HOI') ||
          s.includes('THU HỒI')
        );
      };

      const isReturnStatus = (statusOrCode: any) => {
        if (!statusOrCode || typeof statusOrCode !== 'string') return false;
        const s = statusOrCode.trim().toUpperCase();
        return (
          s === 'TRA_LAI' ||
          s === 'TRẢ LẠI' ||
          s === 'TU_CHOI' ||
          s === 'TỪ CHỐI' ||
          s === 'TU_CHOI_PHE_DUYET' ||
          s.startsWith('TRA_LAI') ||
          s.startsWith('TU_CHOI') ||
          s.startsWith('TRẢ LẠI') ||
          s.startsWith('TỪ CHỐI')
        );
      };

      const submissionAudits = sortedAudits.filter(a => SUBMISSION_ACTION_CODES.includes(a.actionCode));
      const latestSubmissionAudit = submissionAudits.length > 0 ? submissionAudits[0] : null;

      if (latestSubmissionAudit) {
        if (
          isRecallStatus(latestSubmissionAudit.stageStatus) ||
          isRecallStatus(latestSubmissionAudit.actionCode) ||
          isReturnStatus(latestSubmissionAudit.stageStatus) ||
          isReturnStatus(latestSubmissionAudit.actionCode)
        ) {
          isCurrentlyRecalledOrReturned = true;
        } else {
          isCurrentlyRecalledOrReturned = sortedAudits.some(a => {
            if (!a) return false;
            const isAfterSubmission =
              a.id != null && latestSubmissionAudit.id != null
                ? Number(a.id) >= Number(latestSubmissionAudit.id)
                : getTime(a) >= getTime(latestSubmissionAudit);
            return (
              isAfterSubmission &&
              (isRecallStatus(a.actionCode) ||
                isRecallStatus(a.stageStatus) ||
                isReturnStatus(a.actionCode) ||
                isReturnStatus(a.stageStatus))
            );
          });
        }
      } else {
        const latestAudit = sortedAudits.length > 0 ? sortedAudits[0] : null;
        isCurrentlyRecalledOrReturned = !!(
          latestAudit &&
          (isRecallStatus(latestAudit.actionCode) ||
            isRecallStatus(latestAudit.stageStatus) ||
            isReturnStatus(latestAudit.actionCode) ||
            isReturnStatus(latestAudit.stageStatus))
        );
      }

      lockSigners = isSubmitted && !isCurrentlyRecalledOrReturned;
      isReqFormatDraft = doc.reqSignFormatDraft === true || doc.reqSignFormatDraft === 'true' || doc.reqSignFormatDraft === 1 || doc.reqSignFormatDraft === '1';
    }

    const isAtKiemTraTheThuc = curNode && (() => {
      const curAction = (getCamundaProperty(curNode, 'signerRequired') || getCamundaProperty(curNode, 'processRequired') || '').toUpperCase();
      const curName = (curNode.name || '').toLowerCase();
      return curAction === 'KIEM_TRA_THE_THUC' ||
        curAction === 'TRINH_KIEM_TRA_TT' ||
        ((curName.includes('kiểm tra') || curName.includes('kiem tra')) && (curName.includes('thể thức') || curName.includes('the thuc')));
    })();

    // ===== DUYỆT NODE =====
    const getConcurrentStageKey = (node: any): string | null => {
      if (!node) return null;
      const props = getAllNodeExtensionProperties(node) || {};
      const executeConcurrentByStep = props.executeConcurrentByStep || getCamundaProperty(node, 'executeConcurrentByStep');
      if (executeConcurrentByStep) {
        return String(executeConcurrentByStep).trim();
      }
      const isStartConcurrentStep = props.isStartConcurrentStep ?? getCamundaProperty(node, 'isStartConcurrentStep');
      if (String(isStartConcurrentStep).toLowerCase() === 'true' && node.id) {
        return String(node.id);
      }
      return null;
    };

    const currentConcurrentStageKey = getConcurrentStageKey(curNode);
    const getConcurrentStepOutgoingTargets = (node: any): string[] => {
      if (!node) return [];
      const props = getAllNodeExtensionProperties(node) || {};
      return this.parseConcurrentStepOutgoingTargets(
        props.nextStageNotificationTargetNodes ??
        props.NEXT_STAGE_NOTIFICATION_TARGET_NODES ??
        props.CONCURENT_STEP_OUTGOING,
      );
    };

    const mainNodes: Array<{
      id: string;
      order: number;
      name?: string;
      lane?: string;
      flag?: Record<string, any>;
      canChoose: boolean;
      curWorkItem: boolean;
      completed: boolean;
      action?: string | null;
      signerCount?: string | null;
      canEdit?: boolean | null;
      signerRequiredRole: string[];
      currentLane?: string | null;
      userLane?: string | null;
      allowUserChangeExcMode?: boolean;
      executionMode?: string | null;
      nextStageNotificationTargetNodes?: string | null;
      nextStageNotificationTargetNodeIds?: string[];
      nextStageNotificationLinks?: Array<{ sourceNodeId: string; targetNodeId: string }>;
      assigned: Array<{ userId: string; userName: string; isSigned?: number; is_signed?: number; 'is-signed'?: number }>;
    }> = [];
    const completedSet = new Set(nodeComplete);
    const notCompletedSet = new Set(nodeNoComplete);

    const allDbSigners = docId ? await this.repo.getAllSignersFromOutgoingDocumentUsers(docId) : [];
    const dbSignersMap = new Map<string, number>();
    for (const s of allDbSigners) {
      if (s.user_id && s.signer_type) {
        dbSignersMap.set(`${String(s.user_id).trim()}_${String(s.signer_type).trim()}`, s.is_signed ? 1 : 0);
      }
    }
    const getComparableUserId = (value: any): string => {
      if (value == null) return '';
      if (typeof value === 'object') {
        return String(value._id || value.id || value.user_id || '').trim();
      }
      return String(value).trim();
    };
    const creatorUserId = getComparableUserId(doc?.drafter) || getComparableUserId(doc?.createdBy);
    const isCurrentUserCreator = !!creatorUserId && creatorUserId === String(userId || '').trim();
    const hasExplicitStampQuery = hasStampQuery === true;
    const shouldRestrictCanChooseToCreator = !hasExplicitStampQuery;

    for (const [id, node] of indexes.nodes) {
      const main = getCamundaProperty(node, 'main');
      const order = Number(main);
      if (Number.isNaN(order)) continue;

      const nodeIsStamp = getCamundaProperty(node, 'isStamp');
      if (isStamp !== undefined && nodeIsStamp !== undefined && nodeIsStamp !== isStamp) {
        continue;
      }
      const signerCount = getCamundaProperty(node, 'signerCount');
      const executionMode = getCamundaProperty(node, 'executionMode');
      const allowUserChangeExcMode = getCamundaProperty(node, 'allowUserChangeExcMode');
      const action = getCamundaProperty(node, 'signerRequired') || getCamundaProperty(node, 'processRequired');
      const outgoingFlows = indexes.outgoingBySource?.get(id) || node?.outgoing || [];
      const isDongDau: boolean = Array.isArray(outgoingFlows) && outgoingFlows.some((n: any) => n.name === 'DONG_DAU' || n.id === 'DONG_DAU' || getAllNodeExtensionProperties(n)?.actionCode === 'DONG_DAU');
      const signerRequiredRoleRaw = getCamundaProperty(node, 'signerRequiredRole') || getCamundaProperty(node, 'processRequiredRole');

      let notChoose: boolean = true;
      notChoose = mapStringToBoolean(getAllNodeExtensionProperties(node)?.canChoose) ?? true;
      const signerRequiredRole = signerRequiredRoleRaw
        ? signerRequiredRoleRaw.split(',').map(r => r.trim()).filter(Boolean)
        : [];
      const signerRequired = isCamundaPropertyTrue(node, 'signerRequired');
      const processRequired = isCamundaPropertyTrue(node, 'processRequired');
      const canEdit = isCamundaPropertyTrue(node, 'canEdit');
      const editableNodes = Array.from(indexes.nodes.entries())
        .map(([id, node]) => ({
          id,
          order: Number(getCamundaProperty(node, 'main')),
          canEdit: isCamundaPropertyTrue(node, 'canEdit'),
        }))
        .filter(n => n.canEdit && !Number.isNaN(n.order))
        .sort((a, b) => a.order - b.order);

      const lastEditableNode: any = editableNodes[editableNodes.length - 1];

      const hasPassedLastEditable =
        lastEditableNode &&
        completedSet.has(lastEditableNode.id) &&
        lastEditableNode.order < activeNodeOrder;

      const curOrder = curNode ? Number(getCamundaProperty(curNode, 'main')) : NaN;
      const hasActiveReturnOrRecall = isCurrentlyRecalledOrReturned;
      const resetReturnedStateFromOrder = hasActiveReturnOrRecall && Number.isFinite(curOrder)
        ? curOrder
        : Number.isFinite(activeNodeOrder)
          ? activeNodeOrder
          : curOrder;
      const shouldResetReturnedStepState =
        hasActiveReturnOrRecall &&
        Number.isFinite(resetReturnedStateFromOrder) &&
        order >= resetReturnedStateFromOrder;
      const isBlockedByActiveRecallOrReturn =
        hasActiveReturnOrRecall &&
        Number.isFinite(activeNodeOrder) &&
        order > activeNodeOrder;


      const isStampAction =
        isDongDau ||
        action === 'signStamp' ||
        nodeIsStamp === 'true' ||
        nodeIsStamp === '1';

      const canChoose = (signerRequired || processRequired) && !isStampAction;
      let assigned: Array<{ userId: string; userName: string; isSigned?: number; is_signed?: number; 'is-signed'?: number }> = [];
      const hasDocSigners = action && doc && doc[action] && (Array.isArray(doc[action]) ? doc[action].length > 0 : !!doc[action]);

      const signedUserIdsFromAuditForNode = auditArr
        .filter((a) => a.fromNodeId === id && a.actionCode !== 'TRA_LAI')
        .map((a) => String(a.userId));
      const signedUserIdsFromAuditSet = new Set(signedUserIdsFromAuditForNode);
      const completedAuditUserIdsByActionSet = new Set(
        auditArr
          .filter((a) => {
            if (!a) return false;
            if (a.actionCode === 'TRA_LAI') return false;

            const actionCode = String(a.actionCode || '').trim().toUpperCase();
            const rawStageStatus = String(a.rawStageStatus || '').trim().toUpperCase();
            const userRefs = [
              a.userId,
              a.processedBy,
              a.receiver,
              a.createdBy,
            ]
              .filter(Boolean)
              .map((v) => String(v));

            if (action === 'paraphSigner') {
              return (
                userRefs.length > 0 &&
                (
                  actionCode === 'KY_NHAY' ||
                  actionCode === 'KY_NHAY_NOI_DUNG' ||
                  actionCode === 'KY_NHAY_THE_THUC' ||
                  actionCode === 'PARAPHSIGNER' ||
                  rawStageStatus === 'DA_KY_NHAY'
                )
              );
            }

            return false;
          })
          .flatMap((a) => [a.userId, a.processedBy, a.receiver, a.createdBy])
          .filter(Boolean)
          .map((v) => String(v)),
      );

      if (hasDocSigners) {
        const signerIds = Array.isArray(doc[action]) ? doc[action] : [doc[action]];
        const resolvedSigners = await Promise.all(signerIds.map(async (uItem: any) => {
          const uid = (typeof uItem === 'object' && uItem !== null) ? (uItem._id || uItem.id || uItem.user_id) : uItem;
          const u = await this.sqlsvRepo.getUserById(uid);

          let isSignedVal = 0;
          if (uid && action) {
            const key = `${String(uid).trim()}_${String(action).trim()}`;
            if (dbSignersMap.has(key)) {
              isSignedVal = dbSignersMap.get(key) ? 1 : 0;
            }
          }
          if (
            !isSignedVal &&
            uid &&
            (
              signedUserIdsFromAuditSet.has(String(uid)) ||
              completedAuditUserIdsByActionSet.has(String(uid))
            )
          ) {
            isSignedVal = 1;
          }
          if (shouldResetReturnedStepState) {
            isSignedVal = 0;
          }

          return {
            userId: uid,
            userName: u?.name || uItem?.name || uid,
            isSigned: isSignedVal,
            is_signed: isSignedVal,
            'is-signed': isSignedVal
          };
        }));
        assigned = resolvedSigners;
      } else {
        const userMap = nodeAssignmentById.get(id);
        assigned = userMap ? Array.from(userMap.entries()).map(([userId, userName]) => {
          let isSignedVal = 0;
          if (userId && action) {
            const key = `${String(userId).trim()}_${String(action).trim()}`;
            if (dbSignersMap.has(key)) {
              isSignedVal = dbSignersMap.get(key) ? 1 : 0;
            }
          }
          if (
            !isSignedVal &&
            userId &&
            (
              signedUserIdsFromAuditSet.has(String(userId)) ||
              completedAuditUserIdsByActionSet.has(String(userId))
            )
          ) {
            isSignedVal = 1;
          }
          if (shouldResetReturnedStepState) {
            isSignedVal = 0;
          }
          return {
            userId,
            userName,
            isSigned: isSignedVal,
            is_signed: isSignedVal,
            'is-signed': isSignedVal
          };
        }) : [];
      }

      // Kiểm tra xem tất cả người được phân công đã ký/xử lý tại bước này chưa
      let isNodeCompleted = false;
      if (assigned.length > 0) {
        if (shouldResetReturnedStepState) {
          isNodeCompleted = false;
        } else if (action && docId) {
          const signedUsers = await this.repo.getSignersFromOutgoingDocumentUsers(docId, action, 1);
          const signedUserIds = signedUsers.map(s => String(s.user_id));
          const unsignedOrRemainingSignersDb = await this.repo.getSignersFromOutgoingDocumentUsers(docId, action);
          const hasAuditCompletion = assigned.every((u) =>
            signedUserIdsFromAuditSet.has(String(u.userId)) ||
            completedAuditUserIdsByActionSet.has(String(u.userId)),
          );

          if (signedUsers.length > 0 || unsignedOrRemainingSignersDb.length > 0) {
            isNodeCompleted =
              assigned.every(u => signedUserIds.includes(u.userId)) ||
              hasAuditCompletion;
          } else {
            isNodeCompleted = hasAuditCompletion;
          }
        } else {
          isNodeCompleted = assigned.every((u) =>
            signedUserIdsFromAuditSet.has(String(u.userId)) ||
            completedAuditUserIdsByActionSet.has(String(u.userId)),
          );
        }
      } else {
        isNodeCompleted = completedSet.has(id);
      }

      if (String(docId || '') === '297508409228' && id === 'Gateway_02ageul') {
        this.logger.warn(`[process-progress][debug] docId=${docId} nodeId=${id} action=${action || 'null'} assigned=${JSON.stringify(assigned)} auditSigned=${JSON.stringify(Array.from(signedUserIdsFromAuditSet.values()))} completedSetHit=${completedSet.has(id)} isNodeCompleted=${isNodeCompleted}`);
      }

      const laneRole = indexes.laneMap.get(id);
      const lane = (indexes as any).lanes?.find(l => l.role === laneRole);
      const laneFlag = lane ? lane.properties : {};

      const isFormatDraftNode = action === 'signFormatDraft' || action === 'sign_format_draft';
      const shouldBypassLock = isFormatDraftNode && isAtKiemTraTheThuc;
      const nodeConcurrentStageKey = getConcurrentStageKey(node);
      const isNodeInCurrentConcurrentStage =
        !!currentConcurrentStageKey &&
        !!nodeConcurrentStageKey &&
        currentConcurrentStageKey === nodeConcurrentStageKey;
      const isCurrentActiveStep = isNodeInCurrentConcurrentStage
        ? !isNodeCompleted
        : (curNode ? curNode === node : (!hasProgress && order === 1));
      const nodeLock = (shouldBypassLock || isCurrentActiveStep) ? false : lockSigners;
      const concurrentStepOutgoingTargets = getConcurrentStepOutgoingTargets(node);

      const isPastNode = !Number.isNaN(curOrder) ? (order < curOrder) : (order < activeNodeOrder);
      const isCompletedStep = isNodeInCurrentConcurrentStage
        ? isNodeCompleted
        : (!isCurrentActiveStep && isPastNode && isNodeCompleted);
      const allowChooseOnRecallOrReturn = isCurrentlyRecalledOrReturned && (isCurrentUserCreator || order >= activeNodeOrder);
      const isBlockedByRecall = isBlockedByActiveRecallOrReturn && !allowChooseOnRecallOrReturn;

      const finalCanChoose =
        canChoose &&
        notChoose &&
        !isBlockedByRecall &&
        ((!isSubmitted || isCurrentlyRecalledOrReturned || shouldBypassLock || isCurrentActiveStep) ? true : !hasPassedLastEditable) &&
        !nodeLock &&
        (!shouldRestrictCanChooseToCreator || isCurrentUserCreator);

      mainNodes.push({
        id,
        order,
        name: node.name,
        lane: laneRole,
        flag: laneFlag,
        canChoose: finalCanChoose,
        curWorkItem: isCurrentActiveStep,
        completed: isCompletedStep,
        action: action || null,
        signerCount: signerCount || null,
        allowUserChangeExcMode: allowUserChangeExcMode === 'True' ? true : false,
        executionMode: executionMode || null,
        nextStageNotificationTargetNodes: concurrentStepOutgoingTargets.length
          ? concurrentStepOutgoingTargets.join(';')
          : null,
        nextStageNotificationTargetNodeIds: concurrentStepOutgoingTargets,
        nextStageNotificationLinks: concurrentStepOutgoingTargets.map((targetNodeId) => ({
          sourceNodeId: id,
          targetNodeId,
        })),
        canEdit,
        signerRequiredRole,
        currentLane: currentLane,
        userLane: userLane,
        assigned: assigned,
      });
    }

    // ✅ sort SAU khi duyệt xong
    mainNodes.sort((a, b) => a.order - b.order);

    const groupedMainNodes = Array.from(
      mainNodes.reduce((map, item) => {
        const groupedItems = map.get(item.order) || [];
        groupedItems.push(item);
        map.set(item.order, groupedItems);
        return map;
      }, new Map<number, typeof mainNodes>()),
    )
      .map(([order, items]) => {
        const currentItem = items.find((item) => item.curWorkItem) || items[0];
        const chooseItem = items.find((item) => item.canChoose) || items[0];
        const namedItem = items.find((item) => !!item.name?.trim());
        const hasCurrentItem = items.some((item) => item.curWorkItem);
        const assignedMap = new Map(
          items.flatMap((item) => item.assigned).map((assigned) => [assigned.userId, assigned]),
        );

        let stepName = namedItem?.name?.trim() || currentItem.name?.trim();
        if (!stepName) {
          if (order === 1) stepName = 'Soạn thảo';
          else if (order === 3) stepName = 'Kiểm tra thể thức';
          else if (order === 4) stepName = 'Ký nội dung';
          else if (order === 6) stepName = 'Ký thể thức';
          else if (order === 8) stepName = 'Ký ban hành';
          else if (order === 10) stepName = 'Phát hành';
        }

        return {
          ...currentItem,
          order,
          name: stepName || currentItem.name || null,
          label: stepName || currentItem.name || null,
          curWorkItem: hasCurrentItem,
          completed: items.every((item) => item.completed),
          // canChoose: items.some((item) => item.canChoose),
          canChoose: chooseItem.canChoose,
          nextStageNotificationTargetNodes:
            items.find((item) => item.nextStageNotificationTargetNodes)?.nextStageNotificationTargetNodes || null,
          nextStageNotificationTargetNodeIds: Array.from(
            new Set(items.flatMap((item) => item.nextStageNotificationTargetNodeIds || [])),
          ),
          nextStageNotificationLinks: items.flatMap((item) => item.nextStageNotificationLinks || []),
          assigned: Array.from(assignedMap.values()),
        };
      })
      .sort((a, b) => a.order - b.order);

    // Chỉ khóa các node nằm sau node canEdit cuối cùng.
    // Điều này cho phép nhiều node có canEdit trước đó vẫn giữ nguyên.
    // const lastCanEditIndex = mainNodes.map((n) => n.canEdit).lastIndexOf(true);
    // if (lastCanEditIndex >= 0) {
    //   for (let i = lastCanEditIndex + 1; i < mainNodes.length; i++) {
    //     mainNodes[i].canEdit = false;
    //   }
    // }

    // ===== FIX: order đầu tiên luôn là curWorkItem =====
    const hasCurrent = groupedMainNodes.some(n => n.curWorkItem);

    if (!hasCurrent && groupedMainNodes.length > 0 && !!workItemId && auditArr.length === 0) {
      groupedMainNodes[0].curWorkItem = true;
    }
    // return groupedMainNodes;

    return groupedMainNodes;
  }


  async simpleNext(docId: string, workItemId: string, payload: any, userId: string, originalUser: string, author?: string | null, typeDoc?: string,
    transaction?: any, bpmn?: string, roleProcess?: string, isDelWorkItem?: boolean) {
    // async simpleNext(docId: string, workItemId: string, payload: ProcessWorkItemDto, userId: string, author?: string | null, typeDoc?: string) {
    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển bước tiếp văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    let doc;
    if (typeDoc && typeDoc === 'incoming_document') {
      doc = await this.runtime.repo.getDocument(docId);
    } else {
      doc = await this.runtime.repo.getOutgoingDocument(docId);
    }
    if (!doc.bookDocumentId) throw new BadRequestException('Vui lòng lưu sổ văn bản');
    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.simpleNext({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: doc.bpmnVersion,
      externalTransaction: transaction,
      roleProcess: roleProcess,
      isDelWorkItem: isDelWorkItem
    });
    await this.createNotifications(result, userId, docId, `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`, 'VIEW_INCOMING_DOC', doc.abstract_note || doc.abstractNote, NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value);
    return result;
  }


  async transferViewService(docId: string, workItemId: string, payload: any, userId: string, originalUser: string, author?: string | null, typeDoc?: string,
    transaction?: any, bpmn?: string, roleProcess?: string, isDelWorkItem?: boolean) {
    // Kiểm tra quyền xử lý
    const wi = await this.repo.getWorkItem(docId, workItemId);
    const userInfo: any = await this.sqlsvRepo.getUserById(userId);
    const check = DocumentPolicy.validateWorkItemPermission(userInfo?.name || userId, userId, wi, 'chuyển xem văn bản');
    if (!check.allowed) throw new ForbiddenException(check.reason);

    let doc;
    if (typeDoc && typeDoc === 'incoming_document') {
      doc = await this.runtime.repo.getDocument(docId);
    } else {
      doc = await this.runtime.repo.getOutgoingDocument(docId);
    }
    if (!doc.bookDocumentId) throw new BadRequestException('Vui lòng lưu sổ văn bản');

    const bpmnXML = await this.runtime.repo.getBpmnFile(doc.bpmnVersion);
    const result = await this.runtime.transferViewRunTime({
      bpmnXML,
      documentId: docId,
      workItemId,
      payload,
      userId,
      originalUser,
      author,
      bpmnVersion: doc.bpmnVersion,
      externalTransaction: transaction,
      roleProcess: roleProcess,
      isDelWorkItem: isDelWorkItem
    });

    // 2️⃣ Xác định danh sách những người nhận mới
    let openUserIds: string[] = [];
    if (result?.nextNode?.tasks?.length > 0) {
      openUserIds = result.nextNode.tasks.map((t: any) => String(t.assignee));
    }

    // 3️⃣ Xác định danh sách những người nhận mới (không lấy người trong luồng cũ)
    const allRecipients = new Set<string>(openUserIds.filter(Boolean));

    // 4️⃣ Loại bỏ người thực hiện hành động chuyển xem
    if (userId) {
      allRecipients.delete(String(userId));
    }

    // 5️⃣ Duyệt qua từng người nhận và sử dụng hàm createNotifications bằng cách truyền fakeResult (không để riêng dòng gọi gốc)
    if (allRecipients.size > 0) {
      const nextRole = result?.nextNode?.targetRole || result?.nextNode?.nextTargeRole;

      for (const recipientId of allRecipients) {
        const role = nextRole;

        const fakeResult = {
          document: {
            ...result?.document,
            openWorkItems: [{
              assigneeUserId: recipientId,
              role: role,
              roleProcess: null
            }]
          },
          actionCode: result?.actionCode,
          nextNode: result?.nextNode ? {
            ...result.nextNode,
            tasks: [{ assignee: recipientId }],
            targetRole: role,
            nextTargeRole: role
          } : null
        };

        this.createNotifications(
          fakeResult,
          userId,
          docId,
          `Văn bản đến ${this.getDocNumber(doc)}đã được chuyển đến đồng chí xử lý.`,
          'VIEW_INCOMING_DOC',
          doc.abstract_note || doc.abstractNote,
          NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value
        ).catch((err) => {
          this.logger.error(`Lỗi gửi thông báo chuyển xem văn bản cho user ${recipientId}: ${err.message}`);
        });
      }
    }

    return result;
  }

  private async getBpmnModel(version: string) {
    const xml = await this.repo.getBpmnFile(version);
    return this.runtimeDbService.getModelFromXml(xml);
  }

  private async sendMeetingEmail(
    email: string,
    meeting: MeetingEntity,
    role: string,
  ) {
    try {
      const subject = `[Lịch họp] ${meeting.title}`;

      const html = `
        <p>Kính gửi,</p>

        <p>Bạn được phân công <b>${role}</b> trong cuộc họp:</p>

        <p>
        <b>Tiêu đề:</b> ${meeting.title} <br/>
        <b>Thời gian:</b> ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)} <br/>
        </p>

        <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>

        <p>Trân trọng,<br/>Hệ thống quản lý công việc</p>
      `;

      await this.mailService.sendMail({
        to: email,
        subject,
        html,
      });

    } catch (err) {
      this.logger.error(`Send meeting email failed: ${err.message}`);
    }
  }

  private async sendMeetingNotificationsAsync(
    meeting: MeetingEntity,
    units: MeetingUnitEntity[] | undefined,
    chairman: MeetingParticipantEntity | null,
    secretary: MeetingParticipantEntity | null,
    originalUserId: string,
    isPublished = true,
  ) {
    const getUnitId = (participant: any, typeField?: string) => {
      if (!participant) return null;
      if (participant[typeField || 'secretaryType'] === 'UNIT' || participant[typeField || 'chairmanType'] === 'UNIT') {
        return participant.userId;
      }
      if (participant.userType === 'UNIT' || participant.userId === 'UNIT') {
        return participant.unitId;
      }
      return null;
    };

    const chairmanUnitId = getUnitId(chairman, 'chairmanType');
    const secretaryUnitId = getUnitId(secretary, 'secretaryType');

    if (chairman?.userId && !chairmanUnitId) {
      try {
        const chairmanUser = await this.sqlsvRepo.getUserById(chairman.userId);
        if (chairmanUser?.emailUser) {
          await this.sendMeetingEmail(chairmanUser.emailUser, meeting, 'CHỦ TRÌ').catch(err =>
            this.logger.error(`Send chairman email to ${chairmanUser.emailUser} error:`, err)
          );
        }
      } catch (err) {
        this.logger.error('Error fetching chairman user for email:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: [chairman.userId],
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được phân công CHỦ TRÌ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notification for chairman:', err);
      }
    }

    if (secretary?.userId && !secretaryUnitId) {
      try {
        const secretaryUser = await this.sqlsvRepo.getUserById(secretary.userId);
        if (secretaryUser?.emailUser) {
          await this.sendMeetingEmail(secretaryUser.emailUser, meeting, 'THƯ KÝ').catch(err =>
            this.logger.error(`Send secretary email to ${secretaryUser.emailUser} error:`, err)
          );
        }
      } catch (err) {
        this.logger.error('Error fetching secretary user for email:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: [secretary.userId],
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Bạn được phân công THƯ KÝ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notification for secretary:', err);
      }
    }

    const selectedClerkUnitIds = (units ?? [])
      .filter(u => u.isRoomSelected === true)
      .map(u => u.unitId)
      .filter(Boolean);

    if (chairmanUnitId && !selectedClerkUnitIds.includes(chairmanUnitId)) {
      selectedClerkUnitIds.push(chairmanUnitId);
    }
    if (secretaryUnitId && !selectedClerkUnitIds.includes(secretaryUnitId)) {
      selectedClerkUnitIds.push(secretaryUnitId);
    }

    if (isPublished && selectedClerkUnitIds.length) {
      try {
        const processKey = meeting.bpmnVersion || 'QUY_TRINH_LICH_HOP';
        const bpmnModel = await this.getBpmnModel(processKey);
        const lanes = bpmnModel?.indexes?.lanes || [];
        const unitLane = lanes.find(l => l.properties?.isClerk === 'true');
        const roleCode = unitLane?.role || 'DON_VI_THAM_GIA';
        const roleName = unitLane?.name || 'ĐƠN VỊ THAM GIA';

        const clerks = await this.userRepo.createQueryBuilder('user')
          .select(['user.id', 'user.emailUser', 'parentRelation.id'])
          .leftJoin('user.parent', 'parentRelation')
          .leftJoin('roles_process_users', 'rpu', 'rpu.user_id = user.id')
          .leftJoin('user_group_users', 'ugu', 'ugu.user_id = user.id')
          .leftJoin('roles_process_groups', 'rpg', 'rpg.group_id = ugu.group_user_id')
          .leftJoin('roles_process', 'rp', 'rp.id = rpu.role_id OR rp.id = rpg.role_id')
          .where('user.status = 1')
          .andWhere('rp.is_active = 1')
          .andWhere('rp.role_code = :roleCode', { roleCode })
          .andWhere('rp.process_key = :processKey', { processKey })
          .andWhere('parentRelation.id IN (:...selectedClerkUnitIds)', { selectedClerkUnitIds })
          .getMany();

        const notifyClerks = async (targetClerks: typeof clerks, roleLabel: string, contentMessage: string, listparammeeting = 'PROCESS_MEETING') => {
          const targetClerkIds = targetClerks
            .map(c => c.id)
            .filter(id => id !== chairman?.userId && id !== secretary?.userId);

          if (!targetClerkIds.length) return;

          try {
            const emailClerks = targetClerks.filter(c => targetClerkIds.includes(c.id) && !!c.emailUser);
            const emailPromises = emailClerks.map(user =>
              this.sendMeetingEmail(user.emailUser!, meeting, roleLabel).catch(err =>
                this.logger.error(`Send clerk email (${roleLabel}) to ${user.emailUser} error:`, err)
              )
            );
            Promise.all(emailPromises);
          } catch (err) {
            this.logger.error(`Error sending clerk emails (${roleLabel}):`, err);
          }

          try {
            await this.notificationService.createForRecipients({
              recipientIds: targetClerkIds,
              senderId: originalUserId,
              type: NotificationType.MEETING_INVITATION.value,
              content: contentMessage,
              recordId: meeting.id,
              link: `/meetings/${meeting.id}?listparammeeting=${listparammeeting}`,
              key: listparammeeting === 'PROCESS_MEETING'
                ? NotificationKey.VIEW_PROCESSING_SCHEDULE
                : NotificationKey.VIEW_MEETING_ROOM,
              time: new Date(),
              status: 0,
            });
          } catch (err) {
            this.logger.error(`Error creating notifications for clerks (${roleLabel}):`, err);
          }
        };

        const participantUnitIds = (units ?? [])
          .filter(u => u.isRoomSelected === true)
          .map(u => u.unitId)
          .filter(Boolean);

        const chairmanClerks = clerks.filter(c => c.parent?.id && c.parent.id === chairmanUnitId && !participantUnitIds.includes(c.parent.id));
        const secretaryClerks = clerks.filter(c => c.parent?.id && c.parent.id === secretaryUnitId && !participantUnitIds.includes(c.parent.id));
        const participantClerks = clerks.filter(c => c.parent?.id && participantUnitIds.includes(c.parent.id));

        await notifyClerks(
          chairmanClerks,
          'CHỦ TRÌ',
          `Đơn vị của bạn được phân công CHỦ TRÌ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );

        await notifyClerks(
          secretaryClerks,
          'THƯ KÝ',
          `Đơn vị của bạn được phân công làm THƯ KÝ cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );

        await notifyClerks(
          participantClerks,
          roleName.toUpperCase(),
          `Đơn vị của bạn được phân công tham gia cuộc họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          'PROCESS_MEETING'
        );
      } catch (err) {
        this.logger.error('Error fetching clerks for meeting notifications:', err);
      }
    }

    const participantSet = new Set<string>();
    for (const u of units ?? []) {
      for (const p of u.participants ?? []) {
        if (p.userId && p.userId !== chairman?.userId && p.userId !== secretary?.userId) {
          participantSet.add(p.userId);
        }
      }
    }

    const participantIds = Array.from(participantSet);
    if (participantIds.length) {
      try {
        const users = await this.userRepo.find({
          where: { id: In(participantIds) },
          select: ['id', 'emailUser'],
        });
        const emailUsers = users.filter(user => !!user?.emailUser);
        const concurrencyLimit = 5;
        for (let i = 0; i < emailUsers.length; i += concurrencyLimit) {
          const chunk = emailUsers.slice(i, i + concurrencyLimit);
          await Promise.all(
            chunk.map(user =>
              this.sendMeetingEmail(user.emailUser!, meeting, 'THÀNH VIÊN').catch(err =>
                this.logger.error(`Send email to ${user.emailUser} error:`, err)
              )
            )
          );
        }
      } catch (err) {
        this.logger.error('Error sending participant emails:', err);
      }
      try {
        await this.notificationService.createForRecipients({
          recipientIds: participantIds,
          senderId: originalUserId,
          type: NotificationType.MEETING_INVITATION.value,
          content: `Mời họp "${meeting.title}" lúc ${meeting.meetingTime} ngày ${formatDateVN(meeting.meetingDate)}`,
          recordId: meeting.id,
          link: `/meetings/${meeting.id}?listparammeeting=PARTICIPANT_MEETING`,
          key: NotificationKey.VIEW_MEETING_ROOM,
          time: new Date(),
          status: 0,
        });
      } catch (err) {
        this.logger.error('Error creating notifications for participants:', err);
      }
    }
  }

  public async sendMeetingNotificationsByIdAsync(meetingId: string, originalUserId: string) {
    try {
      const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
      if (!meeting) {
        this.logger.error(`sendMeetingNotificationsByIdAsync error: Meeting not found for id ${meetingId}`);
        return;
      }

      const units = await this.meetingUnitRepo.find({
        where: { meeting: { id: meetingId } },
        relations: ['participants']
      });

      const chairman = await this.participantRepo.findOne({
        where: {
          unit: { meeting: { id: meetingId } },
          participantRole: 'CHAIRMAN'
        }
      });

      const secretary = await this.participantRepo.findOne({
        where: {
          unit: { meeting: { id: meetingId } },
          participantRole: 'SECRETARY'
        }
      });

      const isPublished = true;
      await this.sendMeetingNotificationsAsync(meeting, units, chairman, secretary, originalUserId, isPublished);
    } catch (err) {
      this.logger.error('sendMeetingNotificationsByIdAsync error:', err);
    }
  }
}
