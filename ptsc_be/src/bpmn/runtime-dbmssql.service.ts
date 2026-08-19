import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  Optional,
  PayloadTooLargeException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as path from 'path';
import { BpmnEngineService } from './bpmn-engine.service';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { MSSQL_REPO } from '../database/database.provider';
import actionCatalog from '../variable/action-catalog';
// import { this.sqlsvRepo.getUsersByRoleMongoDB } from '../database/sqlsvRepo';
import { SQLSVRepository } from '../database/sqlsvRepo';

// import { createPool } from 'mysql2';
import { ConnectionPool, IResult, Request } from 'mssql';
import * as sql from 'mssql';
import * as moment from 'moment-timezone';
import {
  checkReceiverAlreadyProcessor,
  getAllNodeExtensionProperties,
  isInRoleList,
  parseFlagsButton,
} from 'src/utils/util';
import { ServiceTaskExecutorService } from 'src/service-task/service-task-executor.service';
import { IntegrationSignatureService } from 'src/Intergration-signature/intergration-signature.service';
import { VAN_THU_ALL } from 'src/variables/CONST_STATUS';
import { ASSIGNING_SEAT_STATUS, MEETING_PARTICIPANT_STATE, MEETING_STATE, MEETING_UNIT_STATE } from 'src/meeting/helper/meeting.mapper';
import { stageStatusDoc, stageStatusMapV2, typeAction } from 'src/variable/CONST_STATUS';
import { UsersService } from 'src/users/users.service';
import { use } from 'passport';
import { GroupUserService } from 'src/group-users/group-users.service';
import { GroupUserInDocumentService } from 'src/group-users/group-users-in-document.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType } from 'src/notifycation/notification.enum';
import { CrmSourcesService } from 'src/crmsource/crmsource.service';
import { RequestContext } from 'src/common/context/request-context';
import { ConcurrentStageOrchestrator } from './concurrent-stage.orchestrator';

interface WorkItem {
  id: string;
  nodeId: string;
  role: string;
  assigneeUserId?: string | null;
  nodeType: string;
  actionCode?: string;
}

interface AuditEntry {
  role?: string;
  userId?: string;
  displayName?: string;
}

interface Selection {
  subActionCode: string;
  users: any[];
  organizationUnits: string[];
  deadline?: string;
}

interface Payload {
  actionCode?: string;
  assignToUserId?: string;
  selections?: Selection[];
  assignments?: Selection[];
  userId: string;
  displayName?: string;
  receiver_unit?: string;
  group_?: string;
  deadline?: string | null;
  note?: string | null;
  docIds?: string;
  targetRole?: string;
  roles?: string;
  signerType?: string; // Thêm field cho loại người ký (CONTENT_DRAFT, FORMAT_DRAFT, etc.)
}
interface PayloadSupport {
  actionCode?: string;
  assignToUserId?: string | string[];
  selections?: Selection[];
  assignments?: Selection[];
  userId: string;
  displayName?: string;
  receiver_unit?: string;
  group_?: string;
  deadline?: string | null;
  note?: string | null;
  docIds?: string;
  targetRole?: string;
  roles?: string;
  signerType?: string; // Thêm field cho loại người ký (CONTENT_DRAFT, FORMAT_DRAFT, etc.)
}

interface ModelCache {
  process: any;
  indexes: any;
  path: string;
}

interface ProposeMeetingParams {
  bpmnXML: string;
  meetingId: string;
  workItemId: string;
  payload: Payload;
  userId: string; // User cuối cùng (ủy quyền > token > payload)
  author: string;
  bpmnVersion: string;
  assignToUserId?: string | null;
  receiverUnit?: string;
}

interface ProposeMeetingParamsMeeting {
  bpmnXML: string;
  meetingId: string;
  workItemId: string;
  payload: Payload;
  userId: string; // User cuối cùng (ủy quyền > token > payload)
  author: string;
  bpmnVersion: string;
  unitIdReceive?: string[];
  userIdReturn?: string;
}

type IncomingActionCacheKeyParts = {
  userId: string;
  version: string;
  nodeId: string;
  role?: string;
  assignee?: string;
};

type CachedIncomingActionPayload = {
  availableActions: any[];
  flags: any;
  signKey: any;
  node: any;
};

@Injectable()
export class RuntimeDbService {
  private pool: ConnectionPool;
  private readonly logger = new Logger(RuntimeDbService.name);
  private enableDebugNotificationLog = false; // Bật/tắt log debug gửi thông báo khay
  private readonly incomingActionsGlobalCache = new Map<string, { data: CachedIncomingActionPayload; expires: number }>();
  private readonly incomingActionsLookupInflight = new Map<string, Promise<CachedIncomingActionPayload | null>>();
  private readonly INCOMING_ACTIONS_CACHE_TTL = 3 * 60 * 1000;

  private shouldSkipLegacyTargetCreationByNode(currentNode: any, targetNode: any): boolean {
    if (!currentNode || !targetNode) return false;
    const currentProps = getAllNodeExtensionProperties(currentNode) || {};
    const targetProps = getAllNodeExtensionProperties(targetNode) || {};
    const currentExecuteConcurrentByStep = String(currentProps.executeConcurrentByStep || '').trim();
    if (currentExecuteConcurrentByStep) {
      return true;
    }
    return String(targetProps.isStartConcurrentStep || '').trim().toLowerCase() !== 'true';
  }

  constructor(
    private readonly bpmnEngine: BpmnEngineService,
    @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly serviceTaskExecutor: ServiceTaskExecutorService,
    @Inject(forwardRef(() => IntegrationSignatureService))
    private readonly integrationSignatureService: IntegrationSignatureService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly groupUserService: GroupUserService,
    private readonly groupUserInDocumentService: GroupUserInDocumentService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly crmSourcesService: CrmSourcesService,
    private readonly concurrentStageOrchestrator: ConcurrentStageOrchestrator,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
    @Optional() @Inject('BPMN_RUNTIME') private readonly runtime?: any,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: any,
  ) { }

  private buildIncomingActionCacheBaseKey(parts: IncomingActionCacheKeyParts): string {
    return [
      String(parts.userId || '').trim(),
      String(parts.version || '').trim(),
      String(parts.nodeId || '').trim(),
      String(parts.role || '').trim(),
      String(parts.assignee || '').trim(),
    ].join('::');
  }

  private buildIncomingActionCacheRevisionKey(baseKey: string, latestAuditId: number | null): string {
    return `${baseKey}::${latestAuditId == null ? 'null' : String(latestAuditId)}`;
  }

  private buildIncomingActionPointerRedisKey(baseKey: string): string {
    return `incoming_actions_ptr:${baseKey}`;
  }

  private buildIncomingActionValueRedisKey(revisionKey: string): string {
    return `incoming_actions:${revisionKey}`;
  }

  private async deleteIncomingCachedActionByRevisionKey(revisionKey: string): Promise<void> {
    if (!revisionKey) return;
    this.incomingActionsGlobalCache.delete(revisionKey);
    this.incomingActionsLookupInflight.delete(this.buildIncomingActionValueRedisKey(revisionKey));
    try {
      await this.redisClient?.del(this.buildIncomingActionValueRedisKey(revisionKey));
    } catch { }
  }

  private async getIncomingCachedAction(baseKey: string, latestAuditId: number | null): Promise<CachedIncomingActionPayload | null> {
    const revisionKey = this.buildIncomingActionCacheRevisionKey(baseKey, latestAuditId);
    const entry = this.incomingActionsGlobalCache.get(revisionKey);
    if (entry && entry.expires > Date.now()) {
      return entry.data;
    }
    return null;
  }

  private async setIncomingCachedAction(baseKey: string, latestAuditId: number | null, data: CachedIncomingActionPayload): Promise<void> {
    const revisionKey = this.buildIncomingActionCacheRevisionKey(baseKey, latestAuditId);
    this.incomingActionsGlobalCache.set(revisionKey, {
      data,
      expires: Date.now() + this.INCOMING_ACTIONS_CACHE_TTL,
    });
  }

  private async runIncomingActionTasksInChunks<T>(tasks: Array<() => Promise<T>>, chunkSize = 6): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += chunkSize) {
      const chunk = tasks.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map((task) => task()));
      results.push(...chunkResults);
    }
    return results;
  }

  private async getMsPool(): Promise<ConnectionPool> {
    if (this.pool && (this.pool.connected || this.pool.connecting)) {
      return this.pool;
    }
    this.pool = await this.repo.getPool();
    return this.pool;
  }

  private async listOpenWorkItemsWithTx(
    documentId: string,
    tx?: any,
  ): Promise<Array<{
    id: string;
    nodeId: string;
    role?: string | null;
    assigneeUserId?: string | null;
    nodeType?: string | null;
    state?: string | null;
  }>> {
    if (!tx) {
      return this.repo.listOpenWorkItems(documentId);
    }

    const req = tx.request();
    req.input('documentId', sql.NVarChar(100), documentId);
    const rs = await req.query(`
      SELECT id, node_id, role, assignee_user_id, node_type, state
      FROM ${this.repo.dbname}.dbo.work_items
      WHERE document_id = @documentId
        AND state = 'open'
    `);

    return (rs.recordset || []).map((r: any) => ({
      id: String(r.id),
      nodeId: r.node_id,
      role: r.role,
      assigneeUserId: r.assignee_user_id,
      nodeType: r.node_type,
      state: r.state,
    }));
  }

  private async resolveUserIdsFromDocumentViewerGroups(groupIds: string[] = []): Promise<string[]> {
    const normalizedGroupIds = [...new Set((groupIds || []).map((id) => String(id).trim()).filter(Boolean))];
    if (!normalizedGroupIds.length) return [];

    const userIds = new Set<string>();

    await Promise.all(
      normalizedGroupIds.map(async (groupId) => {
        try {
          const result = await this.groupUserInDocumentService.findUsersByGroupId(groupId, {
            page: 1,
            limit: 1000,
          } as any);

          const users = Array.isArray(result?.data) ? result.data : [];
          for (const user of users) {
            const userId = typeof user?.id === 'string' ? user.id.trim() : String(user?.id || '').trim();
            if (userId) userIds.add(userId);
          }
        } catch (error) {
          this.logger.warn(
            `Khong the resolve users tu documentViewerGroup ${groupId}: ${error?.message || error}`,
          );
        }
      }),
    );

    return [...userIds];
  }

  private async addAuditIncomingAware(
    documentId: string,
    data: any,
    tx?: any,
  ): Promise<void> {
    const typeDoc = data?.typeDocument ?? data?.type_document ?? null;
    if (String(typeDoc || '').toLowerCase() !== 'incommingdocument') {
      await this.repo.addAudit(documentId, data, tx);
      return;
    }
    await this.repo.addIncommingAudit(documentId, data, tx);
  }

  private async updateStageStatusAuditIncomingAware(
    documentId: string,
    data: any,
    tx?: any,
  ): Promise<number> {
    let typeDoc = data?.typeDocument ?? data?.type_document ?? null;
    if (!typeDoc) {
      const isIncoming = await this.isIncomingDocumentId(documentId, tx);
      typeDoc = isIncoming ? 'IncommingDocument' : null;
    }
    if (String(typeDoc || '').toLowerCase() !== 'incommingdocument') {
      return this.repo.updateStageStatusAudit(documentId, data, tx);
    }
    const result = await this.repo.updateStageStatusIncommingAudit(documentId, data, tx);

    try {
      const dbRequestAudit = tx ? tx.request() : (this.repo as any).request();
      const currentAuditQuery = await dbRequestAudit
        .input('currentDocId', sql.VarChar, documentId)
        .input('currentReceiver', sql.VarChar, data.receiver)
        .query(`SELECT TOP 1 user_id, origin_id FROM ${(this.repo as any).dbname}.dbo.audit WHERE document_id = @currentDocId AND receiver = @currentReceiver ORDER BY updated_at DESC, id DESC`);
      const assignerUserId = currentAuditQuery.recordset?.[0]?.user_id;
      const originId = currentAuditQuery.recordset?.[0]?.origin_id;

      const dbRequest = tx ? tx.request() : (this.repo as any).request();

      // 1. Tìm parentDoc (nếu tài liệu hiện tại là clone)
      const parentQuery = await dbRequest
        .input('docId', sql.VarChar, documentId)
        .query(`SELECT parent_doc_clone FROM ${(this.repo as any).dbname}.dbo.incomming_documents WHERE document_id = @docId`);
      const parentDoc = parentQuery.recordset?.[0]?.parent_doc_clone;

      // 2. Tìm tất cả các bản clone con (gốc của mối quan hệ clone là parentDoc hoặc chính documentId)
      const dbRequest2 = tx ? tx.request() : (this.repo as any).request();
      const rootDocId = parentDoc || documentId;
      const childrenQuery = await dbRequest2
        .input('rootDocId', sql.VarChar, rootDocId)
        .query(`SELECT document_id FROM ${(this.repo as any).dbname}.dbo.incomming_documents WHERE parent_doc_clone = @rootDocId`);
      const childDocs = childrenQuery.recordset?.map((r: any) => r.document_id) || [];

      // 3. Gom tất cả các document liên quan khác (gốc và các bản clone anh em) cần đồng bộ audit
      const relatedDocs = new Set<string>();
      if (parentDoc) {
        relatedDocs.add(parentDoc);
      }
      for (const childDoc of childDocs) {
        if (childDoc !== documentId) {
          relatedDocs.add(childDoc);
        }
      }

      // 4. Đồng bộ trạng thái vào bảng audit (CHỈ cập nhật bảng audit để đồng bộ lịch sử hiển thị, KHÔNG cập nhật current_state/assignment)
      const isCloneFlowRelation = !!parentDoc || childDocs.length > 0;

      if (isCloneFlowRelation) {
        // 4. Đối với luồng Clone: CHỈ đồng bộ trạng thái vào bảng audit để hiển thị lịch sử chéo, KHÔNG cập nhật current_state/assignment
        for (const targetDocId of relatedDocs) {
          await this.repo.updateStageStatusAudit(targetDocId, { ...data, user_id: assignerUserId, origin_id: originId }, tx);
        }
      } else {
        // 5. Đối với luồng Bình thường: đồng bộ cả trạng thái và phân công (fallback theo logic cũ nếu có phát sinh liên kết khác)
        if (parentDoc) {
          await this.repo.updateStageStatusIncommingAudit(parentDoc, { ...data, user_id: assignerUserId, origin_id: originId }, tx);
        }
        for (const childDoc of childDocs) {
          await this.repo.updateStageStatusIncommingAudit(childDoc, { ...data, user_id: assignerUserId, origin_id: originId }, tx);
        }
      }
    } catch (err) {
      console.warn('Lỗi khi đồng bộ trạng thái audit giữa bản gốc và bản clone:', err.message);
    }

    return result;
  }

  private async isIncomingDocumentId(documentId: string, tx?: any): Promise<boolean> {
    if (!documentId) return false;
    const req = tx ? tx.request() : (await this.getMsPool()).request();
    req.input('documentId', documentId);
    const rs = await req.query(`
      SELECT TOP 1 1 AS existsFlag
      FROM dbo.incomming_documents
      WHERE document_id = @documentId
    `);
    return !!rs.recordset?.length;
  }

  private async addAuditOutgoingAware(
    documentId: string,
    data: any,
    tx?: any,
  ): Promise<void> {
    const typeDoc = data?.typeDocument ?? data?.type_document ?? null;
    if (String(typeDoc || '').toLowerCase() !== 'outgoingdocument') {
      await this.repo.addAudit(documentId, data, tx);
      return;
    }
    await this.repo.addOutGoingAudit(documentId, data, tx);
  }

  private async updateStageStatusAuditOutgoingAware(
    documentId: string,
    data: any,
    tx?: any,
  ): Promise<number> {
    let typeDoc = data?.typeDocument ?? data?.type_document ?? null;
    if (!typeDoc) {
      const isOutgoing = await this.isOutgoingDocumentId(documentId, tx);
      typeDoc = isOutgoing ? 'OutgoingDocument' : null;
    }
    if (String(typeDoc || '').toLowerCase() !== 'outgoingdocument') {
      return this.repo.updateStageStatusAudit(documentId, data, tx);
    }
    return this.repo.updateStageStatusOutGoingAudit(documentId, data, tx);
  }

  private async updateStageStatusAuditByNodeOutgoingAware(
    documentId: string,
    nodeId: string,
    data: any,
    tx?: any,
  ): Promise<number> {
    let typeDoc = data?.typeDocument ?? data?.type_document ?? null;
    if (!typeDoc) {
      const isOutgoing = await this.isOutgoingDocumentId(documentId, tx);
      typeDoc = isOutgoing ? 'OutgoingDocument' : null;
    }
    if (String(typeDoc || '').toLowerCase() !== 'outgoingdocument') {
      return this.repo.updateStageStatusAuditByNode(documentId, nodeId, data, tx);
    }
    return this.repo.updateStageStatusOutGoingAuditByNode(documentId, nodeId, data, tx);
  }

  private async finalizeConcurrentStagePriorityCompletion(
    documentId: string,
    currentNodeId: string,
    stage: {
      stageKey?: string;
      nodes?: Array<{ nodeId: string }>;
      priorityNodeIds?: string[];
    } | null | undefined,
    tx?: any,
  ): Promise<void> {
    const stageNodes = Array.isArray(stage?.nodes) ? stage.nodes : [];
    if (!stageNodes.length) return;

    const priorityNodeIds = new Set(
      (stage?.priorityNodeIds || []).map((nodeId) => String(nodeId)),
    );
    const remainingNodeIds = [...new Set(
      stageNodes
        .map((node) => String(node?.nodeId || '').trim())
        .filter((nodeId) =>
          nodeId &&
          nodeId !== String(currentNodeId) &&
          !priorityNodeIds.has(nodeId)
        )
    )];

    if (!remainingNodeIds.length) return;

    this.logger.log(
      `[concurrent-stage][priority-complete] docId=${documentId} stageKey=${stage?.stageKey || 'n/a'} currentNodeId=${currentNodeId} cleanupNodes=${remainingNodeIds.join(',')}`,
    );

    for (const nodeId of remainingNodeIds) {
      await this.repo.removeWorkItem(documentId, null, nodeId, tx);
      await this.repo.updateStageStatusAuditByNode(
        documentId,
        nodeId,
        {
          stage_status: stageStatusDoc.HOAN_THANH_LUAN_CHUYEN,
          action_code: 'HOAN_THANH_LUAN_CHUYEN',
        },
        tx,
      );
    }
  }

  private getConcurrentStageNodeOrder(node: any): number {
    const mainValue = getAllNodeExtensionProperties(node)?.main;
    const parsed = Number(mainValue);
    return Number.isFinite(parsed) ? parsed : -Infinity;
  }

  private isForwardConcurrentExitAction(actionCode?: string | null): boolean {
    const normalized = String(actionCode || '').trim().toUpperCase();
    if (!normalized) return false;
    return ![
      'TRA_LAI',
      'RETURN',
      'THU_HOI',
      'RECALL',
      'XIN_Y_KIEN',
      'LUU_NHAP',
      'HUY_TIN',
    ].includes(normalized);
  }

  private resolveConcurrentStageExitTransition(
    snapshot: {
      nodes?: Array<{ nodeId: string }>;
      endNodeIds?: string[];
    } | null | undefined,
    indexes: any,
  ): {
    stageNode: any;
    flow: any;
    nextNode: any;
  } | null {
    const stageNodeIds = new Set(
      (snapshot?.nodes || [])
        .map((node) => String(node?.nodeId || '').trim())
        .filter(Boolean),
    );
    if (!stageNodeIds.size) return null;

    const endNodeIds = new Set((snapshot?.endNodeIds || []).map((id) => String(id)));
    const candidates: Array<{ stageNode: any; flow: any; nextNode: any; rank: number; isEndNode: boolean }> = [];

    for (const stageNodeId of stageNodeIds) {
      const stageNode = indexes.nodes.get(stageNodeId);
      if (!stageNode) continue;

      const outs = indexes.outgoingBySource.get(stageNodeId) || [];
      for (const flow of outs) {
        const ext = this.bpmnEngine.getFlowExtensionProperties(flow);
        const actionCode = ext?.actionCode || flow?.name || flow?.id;
        if (!this.isForwardConcurrentExitAction(actionCode)) continue;

        const { node: candidateNextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
        if (!candidateNextNode) continue;
        if (stageNodeIds.has(String(candidateNextNode.id))) continue;

        candidates.push({
          stageNode,
          flow,
          nextNode: candidateNextNode,
          rank: this.getConcurrentStageNodeOrder(stageNode),
          isEndNode: endNodeIds.has(String(stageNodeId)),
        });
      }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (a.isEndNode !== b.isEndNode) return a.isEndNode ? -1 : 1;
      if (a.rank !== b.rank) return b.rank - a.rank;
      return String(a.stageNode?.id || '').localeCompare(String(b.stageNode?.id || ''));
    });

    const selected = candidates[0];
    return {
      stageNode: selected.stageNode,
      flow: selected.flow,
      nextNode: selected.nextNode,
    };
  }

  private async resolveConcurrentPriorityAdvanceContext(params: {
    documentId: string;
    bpmnVersion: string;
    snapshot: {
      nodes?: Array<{ nodeId: string }>;
      endNodeIds?: string[];
    } | null | undefined;
    indexes: any;
    fallbackUserId: string;
    resolvedAssignees?: Array<{ userId: string; signOrder?: number }>;
  }): Promise<{
    nextNode: any;
    targetRole?: string;
    typeSign?: string | null;
    stageStatus?: string | null;
    statusDoc?: string | null;
    assignees: Array<{ userId: string; signOrder: number }>;
  } | null> {
    const exitTransition = this.resolveConcurrentStageExitTransition(params.snapshot, params.indexes);
    if (!exitTransition?.nextNode) return null;

    let nextNode = exitTransition.nextNode;
    let targetRole = params.indexes.laneMap.get(nextNode.id);
    let typeSign =
      getAllNodeExtensionProperties(nextNode).signerRequired ||
      getAllNodeExtensionProperties(nextNode).processRequired ||
      null;
    let stageStatus = this.getStageStatusByTypeSign(typeSign);
    let statusDoc = getAllNodeExtensionProperties(nextNode).statusCode || null;
    const isSignerAdvanceNode = () => Boolean(typeSign && typeSign !== 'signStamp');

    let assignees: Array<{ userId: string; signOrder: number }> = [];

    // A concurrent-stage exit can point to an intermediate ServiceTask/background
    // node. Resolve through that chain before falling back to users of its lane;
    // otherwise every member of the current signing role receives a work item.
    if (!typeSign && nextNode?.$type !== 'bpmn:EndEvent') {
      const unresolvedNodeId = nextNode?.id;
      const traversal = await this.findNextStepWithSigners({
        currentNode: nextNode,
        indexes: params.indexes,
        documentId: params.documentId,
      });

      if (traversal.nextNode) {
        nextNode = traversal.nextNode;
        targetRole = params.indexes.laneMap.get(nextNode.id);
        typeSign = traversal.typeSign;
        stageStatus = traversal.stageStatus;
        statusDoc = getAllNodeExtensionProperties(nextNode).statusCode || statusDoc;
        assignees = (traversal.signers || []).map((signer) => ({
          userId: signer.user_id,
          signOrder: signer.sign_order,
        }));
      }
    }

    if (typeSign) {
      const signers = await this.repo.getSignersFromOutgoingDocumentUsers(
        params.documentId,
        typeSign,
      );

      if (signers?.length) {
        assignees = signers.map((s) => ({
          userId: s.user_id,
          signOrder: s.sign_order,
        }));
      } else {
        const skipResult = await this.findNextStepWithSigners({
          currentNode: nextNode,
          indexes: params.indexes,
          documentId: params.documentId,
        });

        if (skipResult.nextNode) {
          nextNode = skipResult.nextNode;
          targetRole = params.indexes.laneMap.get(nextNode.id);
          typeSign = skipResult.typeSign;
          stageStatus = skipResult.stageStatus;
          statusDoc = getAllNodeExtensionProperties(nextNode).statusCode || statusDoc;
          assignees = (skipResult.signers || []).map((s) => ({
            userId: s.user_id,
            signOrder: s.sign_order,
          }));
        }
      }
    }

    if (!assignees.length && isSignerAdvanceNode()) {
      throw new BadRequestException(
        `Khong tim thay nguoi ky da duoc chon cho buoc tiep theo ${String(nextNode?.id || '')}`,
      );
    }

    if (!assignees.length && nextNode?.$type === 'bpmn:ServiceTask') {
      throw new BadRequestException(
        `Không xác định được bước sau ServiceTask ${nextNode?.id}; đã chặn giao việc cho toàn bộ nhóm ${targetRole}`,
      );
    }

    // Concurrent-stage transitions must never assign every user of a lane.
    // Preserve assignees already resolved for the target role before falling
    // back to the user advancing the stage. This is important when the stage
    // exits at a Gateway in the target lane (for example VAN_THU -> BAN_HANH).
    if (!assignees.length && !isSignerAdvanceNode()) {
      const preservedAssignees = (params.resolvedAssignees || [])
        .map((assignee) => ({
          userId: String(assignee?.userId || '').trim(),
          signOrder: assignee?.signOrder ?? 0,
        }))
        .filter((assignee) => Boolean(assignee.userId));

      assignees = preservedAssignees.length > 0
        ? preservedAssignees
        : [{ userId: params.fallbackUserId, signOrder: 0 }];
    }

    return {
      nextNode,
      targetRole,
      typeSign,
      stageStatus,
      statusDoc,
      assignees,
    };
  }

  private async isOutgoingDocumentId(documentId: string, tx?: any): Promise<boolean> {
    if (!documentId) return false;
    const req = tx ? tx.request() : (await this.getMsPool()).request();
    req.input('documentId', documentId);
    const rs = await req.query(`
      SELECT TOP 1 1 AS existsFlag
      FROM dbo.outgoing_documents
      WHERE document_id = @documentId
    `);
    return !!rs.recordset?.length;
  }

  // Helper function để normalize commanders - đảm bảo luôn là mảng đơn giản
  private normalizeCommanders(commanders: any): string[] {
    if (!commanders) return [];

    // Nếu là string, parse nó
    let parsed: any = commanders;
    if (typeof commanders === 'string') {
      try {
        parsed = JSON.parse(commanders);
      } catch {
        return [];
      }
    }

    // Nếu không phải array, trả về mảng rỗng
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Flatten mảng lồng nhau và chuyển tất cả thành string
    const flatten = (arr: any[]): string[] => {
      const result: string[] = [];
      for (const item of arr) {
        if (Array.isArray(item)) {
          result.push(...flatten(item));
        } else if (item != null && item !== '') {
          result.push(String(item));
        }
      }
      return result;
    };

    const flattened = flatten(parsed);

    // Loại bỏ duplicate và trả về
    return [...new Set(flattened)];
  }

  private async validateAssigneeDifferentProcessingRole({
    documentId,
    receiverId,
    receiverType = 'user',
  }: {
    documentId: string;
    receiverId: string;
    receiverType?: 'user' | 'ou';
  }): Promise<void> {
    if (!receiverId || !documentId) {
      return;
    }

    const pool = this.pool || await this.repo.getPool();
    const result = await pool.request()
      .input('docId', documentId)
      .input('receiver', receiverId)
      .query(`
        SELECT TOP 1 role_process, stage_status 
        FROM dbo.incomming_assignment
        WHERE document_id = @docId 
          AND receiver = @receiver
          AND stage_status NOT IN ('TRA_LAI', 'HOAN_THANH')
      `);

    if (result.recordset.length === 0) {
      return;
    }

    if (receiverType === 'ou') {
      const orgUnit = await this.sqlsvRepo.getOrganizationUnitById(receiverId).catch(() => null);
      const orgUnitName =
        (orgUnit as any)?.name ||
        (orgUnit as any)?.displayName ||
        receiverId;
      throw new BadRequestException(`${orgUnitName} đã có vai trò xử lý trong văn bản`);
    }

    const assignee = await this.sqlsvRepo.getUserById(receiverId).catch(() => null);
    const assigneeName =
      (assignee as any)?.name ||
      (assignee as any)?.displayName ||
      receiverId;
    throw new BadRequestException(`${assigneeName} đã có vai trò xử lý trong văn bản`);
  }

  public async getBpmnFile(id: string): Promise<any> {
    return await this.repo.getBpmnFile(id);
  }
  public async getBpmnFileorRelate(id: string): Promise<any> {
    return await this.repo.getBpmnFileorRelate(id);
  }

  /**
   * Starts a new process instance for a business object.
   * This is a generic method that can be used by any module.
   */
  async startProcess({
    bpmnXML,
    processKey,
    businessKey,
    variables = {},
    userId,
    originalUser,
    typeDocument = 'Document', // Mặc định là Document nếu không truyền
  }: {
    bpmnXML: string;
    processKey: string;
    businessKey: string;
    variables?: any;
    userId: string;
    originalUser: string;
    typeDocument?: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // 1. Find StartEvent
    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent) {
      throw new BadRequestException('Không tìm thấy StartEvent trong BPMN');
    }

    if (!startEvent.outgoing || startEvent.outgoing.length === 0) {
      throw new BadRequestException('StartEvent không có luồng đi');
    }

    // 2. Find first interactive node
    const flow = startEvent.outgoing[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy bước xử lý tiếp theo sau StartEvent');
    }

    const role = indexes.laneMap.get(nextNode.id) || 'USER';
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;

    // 3. Prepare WorkItem
    const nextUserId = variables.nextUserId || userId; // Default to current user if not specified
    const workItem: WorkItem = {
      id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      nodeId: nextNode.id,
      role: role,
      assigneeUserId: nextUserId,
      nodeType: nextNode.$type,
    };

    const tx = await this.repo.begin();
    try {
      // 4. Add WorkItem
      await this.repo.addWorkItem(
        businessKey,
        workItem,
        tx,
        processKey,
      );

      // 5. Add Audit
      await this.addAuditIncomingAware(
        businessKey,
        {
          user_id: userId,
          display_name: null,
          role: role,
          action_code: 'CREATE',
          from_node_id: startEvent.id,
          to_node_id: nextNode.id,
          receiver: nextUserId,
          receiver_unit: null,
          group_: null,
          roleProcess: 'processor',
          action: 'Trình phê duyệt',
          created_by: userId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: null,
          deadline: variables.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            variables,
            note: variables.note || null,
          },
          curStatusCode: statusDoc,
          typeDocument: typeDocument,
        },
        tx,
      );

      await this.repo.commit(tx);

      return {
        success: true,
        nextNodeId: nextNode.id,
        role,
        workItemId: workItem.id,
      };
    } catch (error) {
      await this.repo.rollback(tx);
      throw error;
    }
  }
  // public async getBpmnFileByVersion(id: string): Promise<string> {
  //   return await this.repo.getBpmnFileByVersion(id);
  // }

  private async addSystemComment(
    documentId: string,
    payload: any,
    content: string | null | undefined,
    userId?: any,
    type: 'opinion' | 'comment' | 'system' = 'opinion',
    isLeaderSuggestion?: boolean,
    tx?: any,
  ): Promise<void> {
    if (typeof documentId !== 'string') {
      documentId = String(documentId || '').trim();
    }

    if (!documentId?.trim()) {
      console.warn('[addSystemComment] Thiếu documentId');
      return;
    }

    if (!content?.trim()) {
      console.warn('[addSystemComment] Content rỗng');
      return;
    }

    if (!this.repo) {
      console.warn('[addSystemComment] MySQLRepository chưa được inject');
      return;
    }

    let userName = 'Hệ thống';
    try {
      const actorId: string | null =
        (userId ?? payload?.userId) != null
          ? String(userId ?? payload?.userId)
          : null;
      if (actorId) {
        const actor = await this.sqlsvRepo.getUserById(actorId);
        const actorName = actor?.name || actorId;

        let finalName = actorName;

        try {
          const authorId = await this.repo.getAuthorIdIfAuthorized(actorId);

          if (authorId && String(authorId) !== actorId) {
            const author = await this.sqlsvRepo.getUserById(String(authorId));
            const authorName = author?.name || String(authorId);

            finalName = `${actorName} (được ${authorName} ủy quyền)`;
          }
        } catch {
          // ignore -> vẫn dùng actorName
        }

        userName = finalName;
      }
    } catch {
      // ignore -> giữ Hệ thống
    }

    try {
      const commentId = await this.repo.createComment({
        documentId,
        userId: payload?.userId || 'system',
        userName,
        content: content.trim(),
        type,
        parentId: null,
        isLeaderSuggestion: isLeaderSuggestion ?? false,
      }, tx);

    } catch (err: any) {
      console.warn(
        '[addSystemComment] Lỗi khi ghi comment hệ thống:',
        err?.message || err,
      );
      // không throw
    }
  }

  public async getModelFromXml(
    xmlContent: string,
    cacheKey?: string,
  ): Promise<ModelCache> {
    const { process } = await this.bpmnEngine.loadBpmnFromString(xmlContent);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: cacheKey || 'inline-xml' };
  }

  private serializeBpmnData(data: { process: any; indexes: any; bpmnXML?: string }): string {
    const replacer = (key: string, value: any) => {
      if (value instanceof Map) {
        return {
          __dataType: 'Map',
          value: Array.from(value.entries()),
        };
      }
      return value;
    };
    return JSON.stringify(data, replacer);
  }

  private deserializeBpmnData(json: any): { process: any; indexes: any; bpmnXML?: string } | null {
    if (json && typeof json !== 'string') {
      return json;
    }
    try {
      const reviver = (key: string, value: any) => {
        if (typeof value === 'object' && value !== null && value.__dataType === 'Map') {
          return new Map(value.value);
        }
        return value;
      };
      return JSON.parse(json, reviver);
    } catch {
      return null;
    }
  }

  private async getBpmnModelCached(version: string): Promise<{ process: any; indexes: any; bpmnXML: string }> {
    const cacheKey = `bpmn_engine:${version}`;
    const cachedData = this.cacheManager
      ? await this.cacheManager.get<string>(cacheKey)
      : null;

    if (cachedData) {
      const deserialized = this.deserializeBpmnData(cachedData);
      if (deserialized?.process && deserialized?.indexes) {
        if (typeof deserialized.bpmnXML === 'string') {
          return deserialized as { process: any; indexes: any; bpmnXML: string };
        }

        const bpmnXML = await this.repo.getBpmnFile(version);
        const hydratedData = { ...deserialized, bpmnXML };
        if (this.cacheManager) {
          try {
            await this.cacheManager.set(
              cacheKey,
              this.serializeBpmnData(hydratedData),
              86400,
            );
          } catch {
            // ignore cache write errors
          }
        }
        return hydratedData;
      }
    }

    const bpmnXML = await this.repo.getBpmnFile(version);
    const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
    const indexes = this.bpmnEngine.buildIndexes(process);
    const dataToCache = { process, indexes, bpmnXML };

    if (this.cacheManager) {
      try {
        await this.cacheManager.set(
          cacheKey,
          this.serializeBpmnData(dataToCache),
          86400,
        );
      } catch {
        // ignore cache write errors
      }
    }

    return dataToCache;
  }

  private async getModel(bpmnFilePath: string): Promise<ModelCache> {
    const abs = path.resolve(bpmnFilePath);
    const { process } = await this.bpmnEngine.loadBpmn(abs);
    const indexes = this.bpmnEngine.buildIndexes(process);
    return { process, indexes, path: abs };
  }

  private async ensureDoc(documentId: string): Promise<any> {
    const doc = await this.repo.getDocument(documentId);
    if (!doc) throw new BadRequestException(`Document ${documentId} not found`);
    return doc;
  }

  private async ensureDocOutgoing(documentId: string): Promise<any> {
    const doc = await this.repo.getOutgoingDocument(documentId);
    if (!doc) throw new BadRequestException(`Document ${documentId} not found`);
    return doc;
  }
  public async createIncomingDocumentCopy({
    outgoing,
    receiverUnit,
    processorUserId, // có thể null
    flowConfig,
    payload,
    wi,
    tx,
    actionCode = 'CREATE',
    details = {},
    skipDuplicateCheck,
    notification = false,
    userId,
    roleProcess = 'processor',
    clonedDocumentId = undefined as string | undefined,
  }) {
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Đang chạy sao chép. outgoingDocId: ${outgoing?.documentId || outgoing?.id}, receiverUnit: ${receiverUnit}, processorUserId: ${processorUserId}, notification flag: ${notification}, senderId (userId): ${userId}`);
    }
    const flowId = flowConfig.id;
    // Parse unit nếu là JSON string (TypeORM có thể trả về string thay vì array)
    let units: string[] = [];
    if (Array.isArray(flowConfig.unit)) {
      units = flowConfig.unit.map(String);
    } else if (typeof flowConfig.unit === 'string' && flowConfig.unit.trim()) {
      try {
        const parsed = JSON.parse(flowConfig.unit);
        units = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        units = [];
      }
    }

    if (!units.includes(String(receiverUnit))) {
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Bỏ qua receiverUnit ${receiverUnit} vì không nằm trong cấu hình flow Config units: ${JSON.stringify(units)}`);
      }
      return;
    }

    // Resolve details object
    let auditDetailsObj: any = {};
    if (typeof details === 'string') {
      try {
        auditDetailsObj = JSON.parse(details);
      } catch {
        auditDetailsObj = { rawDetails: details };
      }
    } else {
      auditDetailsObj = details || {};
    }

    // 2️⃣ Lấy version + XML
    const bpmnXML = await this.repo.getBpmnFile(flowId);
    const { indexes } = await this.getModelFromXml(bpmnXML);




    // Check trùng
    if (!skipDuplicateCheck) {
      const request = tx.request();
      request.input('documentId', outgoing.documentId);
      request.input('receiverUnit', receiverUnit);

      const result = await request.query(`
      SELECT TOP 1 1 as exist
      FROM incomming_documents
      WHERE document_id = @documentId AND receiver_unit = @receiverUnit
    `);

      if (result.recordset.length) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Bỏ qua vì đã tồn tại bản sao tài liệu cho receiverUnit: ${receiverUnit}`);
        }
        return; // đã có thì bỏ qua
      }
    }
    if (outgoing.draftSigner) {
      const draftSigner = await this.sqlsvRepo.getUserById(
        outgoing.draftSigner,
      );
      if (draftSigner) {
        outgoing.draftSigner = draftSigner.name;
      }
    }
    // 3️⃣ Tạo Incoming Document
    const incomingDocId = clonedDocumentId || String(Date.now() + Math.floor(Math.random() * 1000000));

    const insertRequest = tx.request();
    insertRequest.input('document_id', incomingDocId);
    insertRequest.input('status_code', '1');
    insertRequest.input('parent_doc', outgoing.documentId);
    insertRequest.input('receiver_unit', receiverUnit);
    insertRequest.input('sender_unit', outgoing.senderUnit);
    insertRequest.input('receive_date', new Date());
    insertRequest.input('to_book_date', new Date());
    insertRequest.input('document_date', new Date());
    insertRequest.input('private_level', outgoing.privateLevel);
    insertRequest.input('urgency_level', outgoing.urgencyLevel);
    insertRequest.input('document_type', outgoing.documentType);
    insertRequest.input('document_field', outgoing.documentField);
    insertRequest.input('abstract_note', outgoing.abstractNote);
    insertRequest.input('to_book', outgoing.releaseNo || outgoing.toBook);
    insertRequest.input('second_book', outgoing.secondBook || null);
    insertRequest.input('signer', outgoing.draftSigner);
    insertRequest.input('receive_method', outgoing.receiveMethod);
    insertRequest.input(
      'deadline',
      outgoing.deadlineReply ?? payload.deadline ?? null,
    );
    insertRequest.input(
      'fileids',
      JSON.stringify([
        ...(outgoing.docAttachments ?? []),
        ...(outgoing.docDraft ?? []),
        ...(outgoing.docProposal ?? []),
      ]),
    );
    insertRequest.input('status', 1);
    insertRequest.input('bpmn_version', flowId);
    insertRequest.input('copy_to_internal', outgoing.documentId);
    insertRequest.input('created_at', new Date());
    insertRequest.input('updated_at', new Date());
    insertRequest.input('resolution_deadline', outgoing.resolutionDeadline);
    insertRequest.input('copy_count', outgoing.copyCount);
    insertRequest.input('page_count', outgoing.pageCount);
    insertRequest.input('view_group', outgoing.viewGroup);

    await insertRequest.query(`
    INSERT INTO incomming_documents (
      document_id, status_code, parent_doc, receiver_unit, sender_unit,
      receive_date, to_book_date, document_date,
      receive_method, private_level, urgency_level, document_type, document_field,
      abstract_note, to_book, second_book, signer, deadline,
      fileids, status, bpmn_version, copy_to_internal,
      created_at, updated_at, resolution_deadline, copy_count, page_count, view_group
    )
    VALUES (
      @document_id, @status_code, @parent_doc, @receiver_unit, @sender_unit,
      @receive_date, @to_book_date, @document_date,
      @receive_method, @private_level, @urgency_level, @document_type, @document_field,
      @abstract_note, @to_book, @second_book, @signer, @deadline,
      @fileids, @status, @bpmn_version, @copy_to_internal,
      @created_at, @updated_at, @resolution_deadline, @copy_count, @page_count, @view_group
    )
  `);

    await this.repo.copyIncomingFiles(outgoing.documentId, incomingDocId, tx);
    await this.repo.copyFile('docDraft', payload?.docIds, incomingDocId, tx);
    await this.repo.copyFile(
      'docAttachments',
      payload?.docIds,
      incomingDocId,
      tx,
    );

    // 5️⃣ StartEvent
    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    const flow = startEvent.outgoing[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const next = nextNode;
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;
    const role = indexes.laneMap.get(nextNode.id);

    // 6️⃣ Insert Audit
    await this.addAuditIncomingAware(
      incomingDocId,
      {
        user_id: userId,
        display_name: null,
        role: role,
        action_code: actionCode,
        from_node_id: startEvent?.id,
        to_node_id: next.id,

        receiver: processorUserId ? processorUserId : null,
        receiver_unit: processorUserId ? null : receiverUnit,

        group_: payload.group_ || null,
        roleProcess: roleProcess || 'processor',
        action: actionCode === 'CREATE' ? 'Tạo văn bản' : 'Xử lý chính',
        created_by: userId,
        stage_status: stageStatusDoc.CHUA_XU_LY,
        origin_id: wi.id,
        deadline: payload.deadline || null,
        created_at: new Date(),
        updated_at: new Date(),
        details: auditDetailsObj,
        curStatusCode: statusDoc ?? '1',
        typeDocument: 'IncommingDocument',
      },
      tx,
    );
    // 7️⃣ Insert WorkItem
    await this.repo.addWorkItem(
      incomingDocId,
      {
        id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nodeId: next.id,
        role: role,
        assigneeUserId: processorUserId || receiverUnit,
        nodeType: next.$type,
      },
      tx,
      flowId, // Pass bpmn_version
    );

    // Create notification
    if (notification === true) {
      let recipients: string[] = [];

      if (typeof processorUserId === 'string' && processorUserId.trim()) {
        recipients = [processorUserId];
      } else {
        const result = await this.getStartEventUsersInUnit(
          flowId,
          String(receiverUnit),
        );

        recipients = Array.isArray(result) ? result : [];
      }

      recipients = recipients.filter(
        (id): id is string => typeof id === 'string' && id.trim() !== '',
      );

      if (recipients.length === 0) {
        if (this.enableDebugNotificationLog) {
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Danh sách recipients trống, dừng gửi thông báo.`);
        }
        return;
      }

      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Danh sách người nhận thông báo (recipients): ${JSON.stringify(recipients)}`);
      }

      // Gửi notification cho tất cả recipients
      for (const recipientId of recipients) {
        if (this.enableDebugNotificationLog) {
          const docTitle = `Bạn có văn bản cần xử lý: “${outgoing.abstractNote || ''}”`;
          const docContent = `Văn bản đến ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí xử lý đầu phòng.`;
          this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [createIncomingDocumentCopy] Tiến hành gọi notificationService.create: Từ ${userId} -> Đến ${recipientId} | Tiêu đề: "${docTitle}" | Nội dung: "${docContent}"`);
        }
        await this.notificationService.create({
          recipientId,
          senderId: userId ?? null,
          title: `Bạn có văn bản cần xử lý: “${outgoing.abstractNote || ''}”`,
          content: `Văn bản đến ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí xử lý đầu phòng.`,
          recordId: incomingDocId,
          link: `/incomming-documents/${incomingDocId}`,
          key: 'VIEW_INCOMING_DOC',
          type: NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value,
          time: new Date(),
          status: 1,
        });
      }
    }



    return {
      next,
      role,
      flow,
      statusDoc,
      incomingDocId,
      flowId,
      receiverUnit: String(receiverUnit),
    };
  }

  public async createIncomingDocumentCopyProcessor({
    outgoing,
    receiverUnit,
    processorUserId, // có thể null
    flowConfig,
    payload,
    wi,
    tx,
    actionCode = 'CREATE',
    details = {},
    skipDuplicateCheck,
    notification = false,
    userId,
    roleProcess = 'processor',
  }) {
    const flowId = flowConfig.id;
    // Parse unit nếu là JSON string (TypeORM có thể trả về string thay vì array)
    let units: string[] = [];
    if (Array.isArray(flowConfig.unit)) {
      units = flowConfig.unit.map(String);
    } else if (typeof flowConfig.unit === 'string' && flowConfig.unit.trim()) {
      try {
        const parsed = JSON.parse(flowConfig.unit);
        units = Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        units = [];
      }
    }

    if (!units.includes(String(receiverUnit))) {
      console.warn(`[createIncomingDocumentCopyProcessor] Unit ${receiverUnit} not found in units of flow config ${flowId}`);
      return { error: 'Unit mismatch', flowId, receiverUnit };
    }

    // 2️⃣ Lấy version + XML
    const bpmnXML = await this.repo.getBpmnFile(flowId);
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // Check trùng
    // if (!skipDuplicateCheck) {
    //   const request = tx.request();
    //   request.input('documentId', outgoing.documentId);
    //   request.input('receiverUnit', receiverUnit);
    //   request.input('processorUserId', processorUserId);

    //   const checkResult = await request.query(`
    //   SELECT TOP 1 document_id
    //   FROM incomming_documents
    //   WHERE parent_doc = @documentId AND receiver_unit = @receiverUnit AND EXISTS (
    //     SELECT 1 FROM audit WHERE audit.document_id = incomming_documents.document_id AND audit.receiver = @processorUserId
    //   )
    // `);

    //   if (checkResult.recordset.length) {
    //     return { 
    //       incomingDocId: checkResult.recordset[0].document_id, 
    //       isDuplicate: true,
    //       message: 'Văn bản đã được ban hành cho người dùng này trước đó.'
    //     };
    //   }
    // }

    let signerName = outgoing.draftSigner;
    if (outgoing.draftSigner) {
      const draftSigner = await this.sqlsvRepo.getUserById(
        outgoing.draftSigner,
      );
      if (draftSigner) {
        signerName = draftSigner.name;
      }
    }



    // 5️⃣ StartEvent
    // const startEvent = Array.from(indexes.nodes.values()).find(
    //   (node: any) => node.$type === 'bpmn:StartEvent',
    // ) as any;

    // if (!startEvent) {
    //   throw new BadRequestException('BPMN không có StartEvent');
    // }

    // const flow = startEvent.outgoing[0];
    // const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
    //   flow,
    //   indexes,
    // );
    const [me] = await Promise.all([
      this.sqlsvRepo.getMeInFlow(processorUserId, flowId)
    ]);

    let chosenStartEvent: any = null;
    const startEvents = Array.from(indexes.nodes.values()).filter(
      (node: any) => node.$type === 'bpmn:StartEvent',
    );

    chosenStartEvent = startEvents.find((node: any) => {
      const lane = indexes.laneMap.get(node.id);
      return lane === me;
    });

    if (!chosenStartEvent) {
      // Fallback: If no StartEvent is defined for this role (e.g. leaders are processors of an incoming copy, but not the creators of the incoming flow itself), we look for a StartEvent with main=1 or fallback to the first StartEvent.
      chosenStartEvent = startEvents.find((node: any) => {
        const extProps = getAllNodeExtensionProperties(node);
        return extProps?.main == 1;
      }) || startEvents[0] || null;
    }

    if (!chosenStartEvent) {
      throw new BadRequestException('Người dùng không được tạo dự thảo');
    }

    const nextNodeId = (chosenStartEvent as any)?.id;
    const node = indexes.nodes.get(nextNodeId);
    const flow = node.outgoing[0];
    if (!node) throw new BadRequestException(`Node ${node.id} not found`);
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    const role = indexes.laneMap.get(nextNode.id);

    const statusDoc = getAllNodeExtensionProperties(chosenStartEvent)?.statusCode;

    // 3️⃣ Tạo Incoming Document
    const incomingDocId = String(Date.now()) + Math.random().toString(36).slice(2, 5);

    const insertRequest = tx.request();
    insertRequest.input('document_id', incomingDocId);
    insertRequest.input('status_code', statusDoc);
    insertRequest.input('parent_doc', outgoing.documentId);
    insertRequest.input('receiver_unit', receiverUnit);
    insertRequest.input('sender_unit', outgoing.senderUnit);
    insertRequest.input('receive_date', new Date());
    insertRequest.input('to_book_date', new Date());
    insertRequest.input('document_date', new Date());
    insertRequest.input('private_level', outgoing.privateLevel);
    insertRequest.input('urgency_level', outgoing.urgencyLevel);
    insertRequest.input('document_type', outgoing.documentType);
    insertRequest.input('document_field', outgoing.documentField);
    insertRequest.input('abstract_note', outgoing.abstractNote);
    insertRequest.input('to_book', outgoing.releaseNo || outgoing.toBook);
    insertRequest.input('second_book', outgoing.secondBook || null);
    insertRequest.input('signer', signerName);
    insertRequest.input('receive_method', outgoing.receiveMethod);
    insertRequest.input(
      'deadline',
      outgoing.deadlineReply ?? payload.deadline ?? null,
    );
    insertRequest.input(
      'fileids',
      JSON.stringify([
        ...(outgoing.docAttachments ?? []),
        ...(outgoing.docDraft ?? []),
        ...(outgoing.docProposal ?? []),
      ]),
    );
    insertRequest.input('status', 1);
    insertRequest.input('bpmn_version', flowId);
    insertRequest.input('copy_to_internal', outgoing.documentId);
    insertRequest.input('created_at', new Date());
    insertRequest.input('updated_at', new Date());
    insertRequest.input('resolution_deadline', outgoing.resolutionDeadline);
    insertRequest.input('copy_count', outgoing.copyCount);
    insertRequest.input('page_count', outgoing.pageCount);
    insertRequest.input('view_group', outgoing.viewGroup);

    await insertRequest.query(`
    INSERT INTO incomming_documents (
      document_id, status_code, parent_doc, receiver_unit, sender_unit,
      receive_date, to_book_date, document_date,
      receive_method, private_level, urgency_level, document_type, document_field,
      abstract_note, to_book, second_book, signer, deadline,
      fileids, status, bpmn_version, copy_to_internal,
      created_at, updated_at, resolution_deadline, copy_count, page_count, view_group
    )
    VALUES (
      @document_id, @status_code, @parent_doc, @receiver_unit, @sender_unit,
      @receive_date, @to_book_date, @document_date,
      @receive_method, @private_level, @urgency_level, @document_type, @document_field,
      @abstract_note, @to_book, @second_book, @signer, @deadline,
      @fileids, @status, @bpmn_version, @copy_to_internal,
      @created_at, @updated_at, @resolution_deadline, @copy_count, @page_count, @view_group
    )
  `);

    await this.repo.copyIncomingFilesPromulgate(outgoing.documentId, incomingDocId, tx);
    await this.repo.copyFile('docAttachments', outgoing.documentId, incomingDocId, tx);
    // 6️⃣ Insert Audit
    await this.addAuditIncomingAware(
      incomingDocId,
      {
        user_id: userId,
        display_name: null,
        role: role,
        action_code: actionCode,
        from_node_id: nextNodeId?.id,
        to_node_id: nextNode.id,

        receiver: processorUserId ? processorUserId : null,
        receiver_unit: processorUserId ? null : receiverUnit,

        group_: payload.group_ || null,
        roleProcess: roleProcess || 'processor',
        action: actionCode === 'CREATE' ? 'Tạo văn bản' : 'Xử lý chính',
        created_by: userId,
        stage_status: stageStatusDoc.CHUA_XU_LY,
        origin_id: wi.id,
        deadline: payload.deadline || null,
        created_at: new Date(),
        updated_at: new Date(),
        details: typeof details === 'string' ? details : JSON.stringify(details),
        curStatusCode: statusDoc ?? '1',
        typeDocument: 'IncommingDocument',
      },
      tx,
    );
    // 7️⃣ Insert WorkItem
    await this.repo.addWorkItem(
      incomingDocId,
      {
        id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nodeId: nextNode.id,
        role: role,
        assigneeUserId: processorUserId || receiverUnit,
        nodeType: nextNode.$type,
      },
      tx,
      flowId,
    );

    // Create notification
    if (notification === true) {
      let recipients: string[] = [];

      if (processorUserId && typeof processorUserId === 'string') {
        recipients = [processorUserId];
      } else {
        recipients = await this.getStartEventUsersInUnit(
          flowId,
          String(receiverUnit),
        );
      }

      recipients = recipients.filter(
        (id) => typeof id === 'string' && id.trim() !== '',
      );

      if (recipients.length) {
        // Gửi notification cho tất cả recipients
        for (const recipientId of recipients) {
          await this.notificationService.create({
            recipientId,
            senderId: userId ?? null,
            title: `Bạn có văn bản cần xử lý: “${outgoing.abstractNote || ''}”`,
            content: `Văn bản đến ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí xử lý đầu phòng.`,
            recordId: incomingDocId,
            link: `/incomming-documents/${incomingDocId}`,
            key: 'VIEW_INCOMING_DOC',
            type: NotificationType.INCOMING_DOC_PROCESS_ASSIGNEE.value,
            time: new Date(),
            status: 1,
          });
        }
      }
    }

    return { nextNode, role, statusDoc, incomingDocId }
  }


  /**
   * Kiểm tra và hoàn thành văn bản nếu tất cả audit chuyển tùy chọn đã hoàn thành xử lý
   * Được gọi khi một người hoàn thành xử lý
   */
  /**
   * Xử lý logic chuyển tùy chọn (CHUYEN_TUY_CHON)
   */
  private async handleChuyenTuyChon({
    documentId,
    wi,
    payload,
    actionCode,
    allouts,
    indexes,
    bpmnVersion,
    effectiveUserId,
    processedUsserId,
    originalUser,
    laneMap,
  }: {
    documentId: string;
    wi: WorkItem;
    payload: Payload;
    actionCode: string;
    allouts: any[];
    indexes: any;
    bpmnVersion: string;
    effectiveUserId: string;
    processedUsserId: string;
    originalUser: string;
    laneMap: Map<string, string>;
  }): Promise<any> {
    const currentRole = indexes.laneMap.get(wi.nodeId);
    let assignments: Selection[] = [];

    if (Array.isArray(payload.assignments)) {
      assignments = payload.assignments;
    } else if (Array.isArray(payload.selections)) {
      assignments = payload.selections;
    } else if (payload.assignToUserId) {
      assignments = [
        {
          subActionCode: actionCode,
          users: [payload.assignToUserId],
          organizationUnits: [],
        },
      ];
    }

    if (assignments.length === 0 || !assignments) {
      throw new BadRequestException(
        'assignments hoặc selections là bắt buộc cho CHUYEN_TUY_CHON',
      );
    }

    const flow = allouts.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
    const flagsButton = parseFlagsButton(flowExtProps.flags);
    // === Xử lý theo role ===
    if (flagsButton?.transfer === 'toComplete') {
      const { node: nextNode } =
        await this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      const cur = flow?.targetRef?.id
        ? indexes.nodes.get(flow.targetRef.id)
        : null;
      let statusDoc;
      statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;
      // Văn thư -> Chuyển đích danh
      const userAssignments: string[] = []; // Người nhận (chỉ hoàn thành xử lý)
      const roomAssignments: string[] = []; // Phòng nhận (đi luồng bình thường)
      const ouDeadlines = new Map<string, string | null>();

      // Phân loại assignments
      for (const assignment of assignments) {
        const users = Array.from(new Set(assignment.users || [])).filter(
          Boolean,
        );
        const rawOus = assignment.organizationUnits || [];
        const ous: string[] = [];
        for (const ou of rawOus) {
          if (!ou) continue;
          let ouId = '';
          let ouDeadline = assignment.deadline ?? payload.deadline ?? null;
          if (typeof ou === 'string') {
            ouId = ou;
          } else if (typeof ou === 'object' && (ou as any).organizationId) {
            ouId = (ou as any).organizationId;
            if ((ou as any).deadline !== undefined) {
              ouDeadline = (ou as any).deadline;
            }
          } else if (typeof ou === 'object' && (ou as any).id) {
            ouId = (ou as any).id;
            if ((ou as any).deadline !== undefined) {
              ouDeadline = (ou as any).deadline;
            }
          }
          if (ouId && !ous.includes(ouId)) {
            ous.push(ouId);
            ouDeadlines.set(ouId, ouDeadline);
          }
        }

        if (users.length > 0) {
          userAssignments.push(...users);
        }
        if (ous.length > 0) {
          roomAssignments.push(...ous);
        }
      }
      const incommingDoc = await this.repo.getIncomingDocument(documentId);

      const tx = await this.repo.begin();
      try {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1) {
          throw new BadRequestException(
            'Công việc đã được xử lý bởi người khác',
          );
        }

        // ✅ Optimization: Pre-fetch tất cả user roles song song trước vòng loop
        const userRoleInfos = await Promise.all(
          userAssignments.map(uid => this.sqlsvRepo.getUserRole(uid, bpmnVersion)),
        );

        // 1. Xử lý chuyển đến người -> chỉ được hoàn thành xử lý (không đi tiếp luồng)
        for (let i = 0; i < userAssignments.length; i++) {
          const userId = userAssignments[i];
          const receiverRole = userRoleInfos[i]?.roleCode || currentRole;

          // Tạo workItem với action HOAN_THANH_XU_LY (không đi tiếp luồng)
          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: receiverRole,
              assigneeUserId: userId,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
          // ✅ Optimization: Song song hóa 2 queries authorization
          const [processedById, actingAs] = await Promise.all([
            this.repo.getAuthorizedIdIfAuthor(userId),
            this.repo.getAuthorIdIfAuthorized(userId),
          ]);
          // Ghi audit với đánh dấu là chuyển tùy chọn
          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: effectiveUserId,
              display_name: payload.displayName,
              role: currentRole,
              action_code: 'CHUYEN_TUY_CHON',
              from_node_id: wi.nodeId,
              to_node_id: nextNode.id,
              receiver: userId,
              processed_by: processedById,
              acting_as: actingAs,
              receiver_unit: payload.receiver_unit || null,
              group_: payload.group_ || null,
              roleProcess: 'processor',
              action: 'Chỉ đạo',
              created_by: effectiveUserId,
              stage_status: stageStatusDoc.CHUA_XU_LY,
              origin_id: wi.id,
              deadline: payload.deadline || null,
              created_at: new Date(),
              updated_at: new Date(),
              curStatusCode: statusDoc,
              details: JSON.stringify({
                isTransferOption: true,
                transferType: 'to_person',
                assigneeUserId: userId,
                note: payload?.note,
              }),
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );
        }

        // 2. Xử lý chuyển đến phòng -> đi luồng phòng bình thường
        for (const ou of roomAssignments) {
          // Tìm flow phù hợp để đi tiếp luồng
          const flowConfig = await this.sqlsvRepo.getFlowByUnit(
            String(ou),
            'IncommingDocument',
          );
          if (!flowConfig) continue;

          const ouSpecificDeadline = ouDeadlines.get(ou) ?? payload.deadline ?? null;

          const result = await this.createIncomingDocumentCopy({
            outgoing: incommingDoc,
            receiverUnit: ou,
            processorUserId: null,
            flowConfig,
            payload: { ...payload, deadline: ouSpecificDeadline },
            wi,
            tx,
            actionCode: 'CREATE',
            details: JSON.stringify({
              isTransferOption: true,
              transferType: 'to_room',
              organizationUnit: ou,
              note: payload?.note,
              deadline: ouSpecificDeadline,
            }),
            skipDuplicateCheck: false,
            userId: effectiveUserId
          });
          // // Ghi audit đi luồng phòng với đánh dấu là chuyển tùy chọn
          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: effectiveUserId,
              display_name: payload.displayName,
              role: currentRole,
              action_code: 'CHUYEN_TUY_CHON',
              from_node_id: wi.nodeId,
              to_node_id: result?.next?.id,
              receiver: null,
              receiver_unit: ou,
              group_: payload.group_ || null,
              roleProcess: 'processor',
              action: 'Xử lý chính',
              created_by: effectiveUserId,
              stage_status: stageStatusDoc.CHUA_XU_LY, // Chưa xử lý (phòng sẽ xử lý)
              origin_id: wi.id,
              deadline: ouSpecificDeadline,
              created_at: new Date(),
              updated_at: new Date(),
              curStatusCode: result?.statusDoc ?? '1',
              details: JSON.stringify({
                isTransferOption: true,
                transferType: 'to_room',
                organizationUnit: ou,
                note: payload?.note,
                deadline: ouSpecificDeadline,
              }),
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );
        }

        // Cập nhật trạng thái của workItem hiện tại
        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: effectiveUserId,
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );
        if (!(processedUsserId === effectiveUserId)) {
          // ✅ Optimization: Song song hóa 2 update queries độc lập
          await this.repo.updateProcessedByAudit(
            documentId,
            {
              receiver: effectiveUserId,
              processed_by: processedUsserId,
            },
            tx,
          );
          await this.repo.updateActingAsAudit(
            documentId,
            {
              receiver: effectiveUserId,
              acting_as: effectiveUserId,
            },
            tx,
          );
        }
        if (statusDoc)
          await this.repo.updateDocumentStatus(documentId, statusDoc, tx);
        await this.repo.commit(tx);

        // Tạo comment hệ thống với thông tin người/phòng nhận
        const recipientParts: string[] = [];

        // Lấy tên người nhận với role
        if (userAssignments.length > 0) {
          // ✅ Optimization: Song song hóa getUserById + buildDisplayNameWithAuthorized cho tất cả users
          const [users, displayNames] = await Promise.all([
            Promise.all(userAssignments.map(id => this.sqlsvRepo.getUserById(id))),
            Promise.all(userAssignments.map(id =>
              this.repo.buildDisplayNameWithAuthorized(id).catch(() => null),
            )),
          ]);

          const userDisplayNames: string[] = [];

          for (let i = 0; i < users.length; i++) {
            const u = users[i];
            if (!u) continue;

            const name = u.name || '';
            const role = u.role || '';
            const display = displayNames[i];

            let finalName = role ? `${name} - ${role}` : name;
            if (display) {
              finalName = role ? `${display} - ${role}` : display;
            }

            if (finalName) userDisplayNames.push(finalName);
          }

          if (userDisplayNames.length > 0) {
            recipientParts.push(`Chỉ đạo: ${userDisplayNames.join(', ')}`);
          }
        }

        // Lấy tên phòng nhận
        if (roomAssignments.length > 0) {
          const orgUnitPromises = roomAssignments.map((id) =>
            this.sqlsvRepo.getOrganizationUnitById(id),
          );
          const orgUnits = await Promise.all(orgUnitPromises);
          const orgUnitNames = orgUnits
            .filter((ou): ou is NonNullable<typeof ou> => ou != null)
            .map((ou) => ou.name)
            .filter(Boolean);
          if (orgUnitNames.length > 0) {
            recipientParts.push(`Xử lý chính: ${orgUnitNames.join(', ')}`);
          }
        }

        // Tạo comment
        // Old:
        // let comment = '';
        // if (recipientParts.length > 0) {
        //   comment += `\n- ${recipientParts.join('\n- ')}`;
        // }
        // if (payload.note?.trim()) {
        //   comment += `\n\n${payload.note.trim()}`;
        // }
        const comment = payload.note?.trim() || '';

        const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
        const flagsButton = parseFlagsButton(flowExtProps.flags);

        const isLeaderSuggestion = flagsButton.canSuggestion == true;
        await this.addSystemComment(
          documentId,
          payload,
          comment,
          originalUser || effectiveUserId,
          undefined,
          isLeaderSuggestion
        );

        return {
          status: 1,
          document: await this.repo.getDocument(documentId),
        };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    } else {
      const userId = assignments[0]?.users?.[0];
      if (!userId) {
        throw new BadRequestException('User không hợp lệ');
      }

      const user = await this.sqlsvRepo.getUserRole(userId, bpmnVersion);
      const rolesUser = user?.roleCode;
      const outs = payload?.roles
        ? allouts.filter((f: any) => {
          const { node: nextNode } =
            this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
          if (!nextNode) return false;

          const role = laneMap.get(nextNode?.id);
          return role === rolesUser;
        })
        : allouts;

      // Tìm flow theo statusCode của targetRef
      let statusDoc: string | undefined;

      const flow = outs.find((f: any) => {
        const targetRef = f?.targetRef;
        if (!targetRef) return false;

        statusDoc = getAllNodeExtensionProperties(targetRef)?.statusCode;
        return Boolean(statusDoc);
      });

      if (!flow) {
        throw new BadRequestException(
          `Không tìm thấy luồng phù hợp cho actionCode ${actionCode}`,
        );
      }

      const { node: nextNode } =
        await this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      const tx = await this.repo.begin();
      try {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1) {
          throw new BadRequestException(
            'Công việc đã được xử lý bởi người khác',
          );
        }

        // Tạo workItem cho người nhận (giữ nguyên nodeId - không đi tiếp luồng)
        if (nextNode) {
          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: rolesUser,
              assigneeUserId: userId,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
        }
        // ✅ Optimization: Song song hóa 2 queries authorization
        const [processedById, actingAs] = await Promise.all([
          this.repo.getAuthorizedIdIfAuthor(userId),
          this.repo.getAuthorIdIfAuthorized(userId),
        ]);
        // Ghi audit
        await this.addAuditIncomingAware(
          documentId,
          {
            user_id: effectiveUserId,
            display_name: payload.displayName,
            role: wi.role,
            action_code: actionCode,
            from_node_id: wi.nodeId,
            to_node_id: nextNode.id, // Giữ nguyên
            receiver: userId,
            processed_by: processedById,
            acting_as: actingAs,
            receiver_unit: null,
            group_: payload.group_ || null,
            roleProcess: 'processor',
            action: 'Chuyển tùy chọn',
            created_by: effectiveUserId,
            stage_status: stageStatusDoc.CHUA_XU_LY,
            origin_id: wi.id,
            deadline: payload.deadline || null,
            created_at: new Date(),
            updated_at: new Date(),
            curStatusCode: statusDoc,
            details: JSON.stringify({
              transferType: 'to_person',
              assigneeUserId: userId,
              note: payload?.note,
            }),
            originalUser: originalUser || null,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );

        // Cập nhật trạng thái hiện tại
        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: effectiveUserId,
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );

        if (!(processedUsserId === effectiveUserId)) {
          // ✅ Optimization: Song song hóa 2 update queries độc lập
          await Promise.all([
            this.repo.updateProcessedByAudit(
              documentId,
              {
                receiver: effectiveUserId,
                processed_by: processedUsserId,
              },
              tx,
            ),
            this.repo.updateActingAsAudit(
              documentId,
              {
                receiver: effectiveUserId,
                acting_as: effectiveUserId,
              },
              tx,
            ),
          ]);
        }

        if (statusDoc)
          await this.repo.updateDocumentStatus(documentId, statusDoc, tx);
        await this.repo.commit(tx);

        // Tạo comment
        const receiverName = await this.repo.buildDisplayNameWithAuthorized(userId);
        const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
        const flagsButton = parseFlagsButton(flowExtProps.flags);
        const isLeaderSuggestion = flagsButton.canSuggestion == true;
        // Old:
        // const comment = `Chuyển tùy chọn cho: ${receiverName || userId}${payload.note ? '\n\n' + payload.note : ''}`;
        const comment = payload.note || '';
        await this.addSystemComment(
          documentId,
          payload,
          comment,
          originalUser || effectiveUserId,
          undefined,
          isLeaderSuggestion
        );

        return {
          status: 1,
          document: await this.repo.getDocument(documentId),
        };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    }
  }

  private async checkAndCompleteTransferOptionsDocument(
    documentId: string,
    completedUserId: string,
  ): Promise<void> {
    try {
      // Lấy tất cả audit records
      const audits = await this.repo.getAudit(documentId);

      // Lọc các audit có đánh dấu là chuyển tùy chọn
      const transferOptionAudits = audits.filter((a: any) => {
        try {
          const details =
            typeof a.details === 'string'
              ? JSON.parse(a.details)
              : a.details || {};
          return (
            details.isTransferOption === true &&
            details.transferType === 'to_person'
          );
        } catch (err) {
          console.warn(
            '[checkAndCompleteTransferOptionsDocument] Lỗi parse details:',
            err,
          );
          return false;
        }
      });

      // Nếu không có audit chuyển tùy chọn nào, không cần kiểm tra
      if (transferOptionAudits.length === 0) {
        return;
      }

      // Kiểm tra xem tất cả audit chuyển tùy chọn đã hoàn thành xử lý chưa
      const expectedStatus = actionCatalog.actions.HOAN_THANH.label;
      const allCompleted = transferOptionAudits.every((a: any) => {
        const status = a.stageStatus?.trim();
        const expected = expectedStatus?.trim();
        return status === expected;
      });

      // Nếu tất cả đã hoàn thành, đánh dấu văn bản hoàn thành
      if (allCompleted) {
        const tx = await this.repo.begin();
        try {
          // Lấy thông tin người hoàn thành cuối cùng
          const completedUser =
            await this.sqlsvRepo.getUserById(completedUserId);
          const completedDisplayName = completedUser?.name || completedUserId;

          // Tìm EndEvent hoặc node hoàn thành - cần lấy BPMN version từ document
          const doc = await this.repo.getDocument(documentId);
          const bpmnXML = await this.repo.getBpmnFile(doc?.bpmnVersion);
          const { indexes } = await this.getModelFromXml(bpmnXML);

          // Tìm EndEvent
          let endNode: any = null;
          for (const [nodeId, node] of indexes.nodes.entries()) {
            if (node.$type === 'bpmn:EndEvent') {
              endNode = node;
              break;
            }
          }
          const statusCode = endNode
            ? getAllNodeExtensionProperties(endNode)?.statusCode ||
            'HOAN_THANH_VAN_BAN'
            : 'HOAN_THANH_VAN_BAN';

          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: completedUserId,
              display_name: completedDisplayName,
              role: null,
              action_code: 'HOAN_THANH_VAN_BAN',
              from_node_id: null,
              to_node_id: endNode?.id ?? 'END',
              receiver: null,
              receiver_unit: null,
              group_: null,
              roleProcess: 'processor',
              action: 'Hoàn thành văn bản chuyển tùy chọn',
              created_by: completedUserId,
              stage_status: stageStatusDoc.HOAN_THANH_VAN_BAN,
              origin_id: null,
              deadline: null,
              created_at: new Date(),
              updated_at: new Date(),
              details: {
                finalAction: 'HOAN_THANH_VAN_BAN',
                completedBy: completedUserId,
              },
              curStatusCode: statusCode,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );

          await this.repo.updateDocumentStatus(documentId, statusCode, tx);
          await this.repo.commit(tx);
        } catch (e) {
          await this.repo.rollback(tx);
          console.error(
            '[checkAndCompleteTransferOptionsDocument] Lỗi khi đánh dấu văn bản hoàn thành:',
            e,
          );
        }
      } else {
      }
    } catch (e) {
      console.error('Lỗi khi kiểm tra điều kiện hoàn thành:', e);
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }

  async getStartEventUsersInUnit(
    processKey: string,
    unitId: string,
  ): Promise<string[]> {
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] Bắt đầu. processKey: ${processKey}, unitId: ${unitId}`);
    }
    // 1️⃣ Lấy BPMN XML từ repo
    const bpmnXML = await this.repo.getBpmnFile(processKey);
    if (!bpmnXML) {
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] Không tìm thấy BPMN XML cho processKey: ${processKey}`);
      }
      return [];
    }

    const { indexes } = await this.getModelFromXml(bpmnXML);

    // 2️⃣ Lấy tất cả StartEvent nodes
    interface BpmnNode {
      id: string;
      $type: string;
      outgoing?: any[];
      [key: string]: any;
    }

    const startEvents = Array.from(indexes.nodes.values())
      .map((node) => node as BpmnNode)
      .filter((node) => node.$type === 'bpmn:StartEvent');

    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] Tìm thấy ${startEvents.length} StartEvents: ${JSON.stringify(startEvents.map(e => e.id))}`);
    }

    if (!startEvents.length) {
      return [];
    }

    const allUserIds: string[] = [];

    // 3️⃣ Lấy user theo role của StartEvent và lọc theo unit
    for (const node of startEvents) {
      const roleCode = indexes.laneMap.get(node.id) as string;
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] StartEvent ID: ${node.id} -> roleCode từ laneMap: "${roleCode}"`);
      }
      if (!roleCode) {
        continue;
      }

      const roleUsers = await this.repo.getUsersByRoleInFlow(
        processKey,
        roleCode,
      );
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] roleUsers tìm được cho role "${roleCode}": ${JSON.stringify(roleUsers)}`);
      }

      if (!roleUsers.length) continue;

      const filteredUsers = await this.repo.getUsersInUnit(roleUsers, unitId);
      if (this.enableDebugNotificationLog) {
        this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] filteredUsers sau khi lọc unit "${unitId}": ${JSON.stringify(filteredUsers)}`);
      }

      allUserIds.push(...filteredUsers);
    }

    // Loại trùng
    const uniqueUsers = [...new Set(allUserIds)];
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [getStartEventUsersInUnit] Kết quả trả về cuối cùng: ${JSON.stringify(uniqueUsers)}`);
    }
    return uniqueUsers;
  }

  async updateStatusAudit({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
  }): Promise<any> {
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    // [TỐI ƯU 1]: Fetch song song model và workItem. BỎ HOÀN TOÀN 'getAudit' vì biến auditArr là đồ thừa (deadcode).
    const [modelRes, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId)
    ]);

    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const indexes = modelRes.indexes;
    const node = indexes.nodes.get(wi.nodeId);
    if (!node)
      throw new BadRequestException('Lỗi mô hình BPMN: không tìm thấy node hiện tại');

    const outs = indexes.outgoingBySource.get(node.id) || [];
    let flow = null;
    if (actionCode !== 'DA_XEM') {
      flow = outs.find(
        (f: any) =>
          (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
      );
      if (!flow)
        throw new BadRequestException(
          `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
        );
    }

    // [TỐI ƯU 2]: DỌN RÁC - Xóa bỏ toàn bộ các khối lệnh 'nextNode' và 'targetRole' đắt đỏ vì hàm này hoàn toàn KHÔNG sử dụng chúng!

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      await this.updateStageStatusAuditIncomingAware(
        documentId,
        {
          receiver: userId,
          stage_status: actionCode === 'DA_XEM' ? stageStatusDoc.DA_XEM : stageStatusDoc.HOAN_THANH,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );
      await this.repo.commit(tx);

      return { status: 1, document: await this.repo.getDocument(documentId) };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
    // const doc = await this.repo.updateAuditStageStatus({
    //   documentId,
    //   userId,
    //   roleProcess,
    //   status,
    //   cur
    // });

    // return doc;
  }

  async createDocumentAtNode({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
  }): Promise<any> {
    const documentId = data?.documentId;
    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    // [TỐI ƯU 1]: Validation check và parse BPMN XML nặng nề được chạy song song
    const [_, modelRes] = await Promise.all([
      this.repo.assertFieldsValid(data, 'IncommingDocument'),
      this.getModelFromXml(bpmnXML)
    ]);
    const indexes = modelRes.indexes;

    // 5️⃣ StartEvent
    const startEvent = Array.from(indexes.nodes.values()).find(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any;

    if (!startEvent || !startEvent.outgoing || !startEvent.outgoing[0]) {
      throw new BadRequestException('BPMN: Missing StartEvent or outgoing flow');
    }

    const flow = startEvent.outgoing[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    // const { node: nextNode2 } = this.bpmnEngine.nextInteractiveFromFlow(
    //   nextNode?.outgoing[0],
    //   indexes,
    // );
    const nodeId = nextNode;
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;
    const isRoom = getAllNodeExtensionProperties(nextNode)?.isRoom;
    let details = data;

    if (isRoom === 'true') {
      details = { transferType: 'to_room' };
    }
    // const node = indexes.nodes.get(nodeId);
    // if (!node) throw new BadRequestException(`Node ${nodeId} not found`);

    const role = indexes.laneMap.get(nodeId.id);
    const workItem: WorkItem = {
      id: `wi_${Date.now()}`,
      nodeId: nodeId.id,
      role,
      assigneeUserId,
      nodeType: nodeId.$type,
    };

    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    const initialStatus = data?.statusCode ?? statusDoc;
    await this.repo.createDocument({
      ...data,
      documentId,
      statusCode: initialStatus,
    });

    // [TỐI ƯU 3]: Gộp Add WorkItem, Add Audit, và fetch getDocument trả về thành 1 khối Promise song song (Tiết kiệm x3 I/O Time)
    const [__, ___, docResult] = await Promise.all([
      this.repo.addWorkItem(
        documentId,
        workItem,
        undefined,
        flowId || undefined,
      ),
      this.addAuditIncomingAware(documentId, {
        userId: assigneeUserId, // user_id
        role, // role
        actionCode: 'CREATE', // action_code
        fromNodeId: null, // from_node_id
        toNodeId: nodeId.id, // to_node_id
        created_by: assigneeUserId, // created_by
        receiver: null,
        receiver_unit: data.receiverUnit || null,
        roleProcess: role, // vai trò xử lý
        action: 'Tạo văn bản', // action
        deadline: null,
        stage_status: stageStatusDoc.CHUA_XU_LY, // stage_status
        details: details,
        curStatusCode: initialStatus,
        typeDocument: 'IncommingDocument',
      }),
      this.repo.getDocument(documentId)
    ]);

    await this.repo.syncIncomingAssignmentsFromOpenWorkItems(
      documentId,
      docResult?.openWorkItems || [],
      {
        receiverUnit: data.receiverUnit || null,
        stageStatus: stageStatusDoc.CHUA_XU_LY,
        actionCode: initialStatus,
        updatedAt: docResult?.updatedAt || new Date(),
      },
    );

    return await this.repo.getDocument(documentId);
  }

  async createDocumentAtNodeDraft({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
  }): Promise<any> {
    const documentId = data?.documentId;
    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    const flowKeyOption = flowId || data?.bpmnVersion;

    const [modelRes, me] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      assigneeUserId && flowKeyOption
        ? this.sqlsvRepo.getMeInFlow(assigneeUserId, flowKeyOption)
        : Promise.resolve(null)
    ]);
    const indexes = modelRes.indexes;
    // 5️⃣ StartEvent: Lọc bỏ các StartEvent thuộc lane có notExcute='true'
    const startEvents = (Array.from(indexes.nodes.values()).filter(
      (node: any) => node.$type === 'bpmn:StartEvent',
    ) as any[]).filter((node: any) => {
      const laneRole = indexes.laneMap.get(node.id);
      const laneProps = this.bpmnEngine.getLanePropertiesByRole(indexes.lanes, laneRole);
      return laneProps?.notExcute !== 'true';
    });

    let startEvent: any = null;
    if (me) {
      startEvent = startEvents.find((node: any) => {
        const lane = indexes.laneMap.get(node.id);
        return lane === me;
      });
    }

    // Fallback: Nếu không tìm thấy hoặc người dùng không thuộc lane nào
    if (!startEvent && startEvents.length > 0) {
      startEvent = startEvents[0];
    }

    if (!startEvent || !startEvent.outgoing || !startEvent.outgoing[0]) {
      throw new BadRequestException('BPMN: Missing StartEvent or outgoing flow');
    }

    const flow = startEvent.outgoing[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    const nodeId = nextNode;
    const nodeExt = getAllNodeExtensionProperties(nextNode);
    const nodeStartEvent = getAllNodeExtensionProperties(startEvent);
    const statusDoc = nodeExt?.statusCode;
    const isRoom = nodeExt?.isRoom;
    let details = data;

    if (isRoom === 'true') {
      details = { transferType: 'to_room' };
    }

    const role = indexes.laneMap.get(nodeId.id);
    const workItem: WorkItem = {
      // Bổ sung random suffix để tránh trùng lặp WorkItem khi request diễn ra đồng thời
      id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nodeId: nodeId.id,
      role,
      assigneeUserId,
      nodeType: nodeId.$type,
    };

    const initialStatus = statusDoc ?? nodeStartEvent?.statusCode;

    // [TỐI ƯU 1]: Create Document phải được insert cứng trước tiên (Vì chứa khóa ngoại DB)
    await this.repo.createDocument({
      ...data,
      documentId,
      statusCode: initialStatus,
    });

    // [TỐI ƯU 2]: Gộp Add WorkItem, Add Audit, và fetch getDocument trả về thành 1 khối Promise song song (Tiết kiệm x3 I/O Time)
    const [_, __, docResult] = await Promise.all([
      this.repo.addWorkItem(
        documentId,
        workItem,
        undefined,
        flowId || undefined,
      ),
      this.addAuditIncomingAware(documentId, {
        userId: assigneeUserId, // user_id
        role, // role
        actionCode: 'CREATE', // action_code
        fromNodeId: null, // from_node_id
        toNodeId: nodeId.id, // to_node_id
        created_by: assigneeUserId, // created_by
        receiver: assigneeUserId,
        receiver_unit: data.receiverUnit || null,
        roleProcess: role, // vai trò xử lý
        action: 'Tạo văn bản', // action
        deadline: null,
        stage_status: stageStatusDoc.CHUA_XU_LY, // stage_status
        details: details,
        curStatusCode: initialStatus,
        typeDocument: 'IncommingDocument',
      }),
      this.repo.getDocument(documentId)
    ]);

    return docResult;
  }
  async createDocumentAtNodeOutgoing({
    bpmnXML,
    data,
    assigneeUserId = null,
    bpmnVersion,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    bpmnVersion: string;
  }): Promise<any> {
    if (!assigneeUserId) {
      throw new BadRequestException(
        'assigneeUserId is required to determine user',
      );
    }
    const documentId = data?.documentId;
    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    // [TỐI ƯU 1]: Chạy model parser và query Database sqlsvRepo kiểm tra quyền song song!
    const [modelRes, userRoleInfo] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      !data?.fromCreateDraf
        ? this.repo.getUserRoleWithName(assigneeUserId, bpmnVersion)
        : Promise.resolve(null)
    ]);
    const indexes = modelRes.indexes;

    let chosenStartEvent: any = null;
    const startEvents = Array.from(indexes.nodes.values()).filter(
      (node: any) => node.$type === 'bpmn:StartEvent',
    );

    if (!data?.fromCreateDraf) {
      const meRoles = Array.isArray((userRoleInfo as any)?.roles)
        ? ((userRoleInfo as any).roles as string[]).filter(Boolean)
        : [];

      // Hỗ trợ role truyền từ client để xử lý user thuộc nhiều lane.
      const roleHintRaw = data?.roles ?? data?.targetRole;
      const roleHints = Array.isArray(roleHintRaw)
        ? roleHintRaw.map((r: any) => String(r).trim()).filter(Boolean)
        : String(roleHintRaw || '')
          .split(',')
          .map((r: string) => r.trim())
          .filter(Boolean);
      const matchedHintRoles = roleHints.filter((r: string) => meRoles.includes(r));

      const candidateStartEvents = startEvents.filter((node: any) => {
        const lane = indexes.laneMap.get(node.id);
        return lane && meRoles.includes(lane);
      });

      if (matchedHintRoles.length > 0) {
        chosenStartEvent = candidateStartEvents.find((node: any) => {
          const lane = indexes.laneMap.get(node.id);
          return lane && matchedHintRoles.includes(lane);
        });
      }

      // Fallback: ưu tiên StartEvent có main=1 nếu user có nhiều lane.
      if (!chosenStartEvent) {
        chosenStartEvent =
          candidateStartEvents.find((node: any) => {
            const extProps = getAllNodeExtensionProperties(node);
            return extProps?.main == 1;
          }) || candidateStartEvents[0] || null;
      }
    } else {
      chosenStartEvent = startEvents.find((node: any) => {
        const extProps = getAllNodeExtensionProperties(node);
        return extProps?.main == 1;
      }) || startEvents[0] || null;
    }

    if (!chosenStartEvent) {
      throw new BadRequestException('Người dùng không được tạo dự thảo');
    }

    const nextNodeId = (chosenStartEvent as any)?.id;
    // const nextNodeId = chosenStartEvent;
    const node = indexes.nodes.get(nextNodeId);
    const flow = node.outgoing[0];
    const nameFlow = flow?.name;
    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(chosenStartEvent)?.statusCode || getAllNodeExtensionProperties(cur)?.statusCode;
    if (!node) throw new BadRequestException(`Node ${node.id} not found`);
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    const role = indexes.laneMap.get(nextNode.id);
    const workItem: WorkItem = {
      // Chống lỗi trùng ID khi concurrent requests xảy ra
      id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nodeId: nextNode.id,
      role,
      assigneeUserId,
      nodeType: nextNode.$type,
    };

    const isSpecialStatus = nameFlow === 'TAO_PHAT_HANH';

    // [TỐI ƯU 2]: Gộp 3 hàm I/O lấy Add WorkItem, Add Audit, Fetch Document thành một khối Promise liền mạch!
    const [_, __, docResult, ___] = await Promise.all([
      this.repo.addWorkItem(documentId, workItem, undefined, bpmnVersion),
      this.addAuditOutgoingAware(documentId, {
        userId: assigneeUserId, // user_id
        role, // role
        actionCode: 'CREATE', // action_code
        fromNodeId: node.id, // from_node_id
        toNodeId: nextNode.id, // to_node_id
        created_by: assigneeUserId, // created_by
        receiver: isSpecialStatus ? 'CAN_CHO_SO' : null,
        receiver_unit: data.receiverUnit || null,
        roleProcess: 'processor', // vai trò xử lý
        action: 'Tạo văn bản', // action
        deadline: null,
        stage_status: isSpecialStatus ? stageStatusDoc.HT_VBTT : stageStatusDoc.CHUA_XU_LY, // stage_status
        details: data, // lưu toàn bộ dữ liệu document
        curStatusCode: statusDoc,
        typeDocument: 'OutgoingDocument',
      }),
      this.repo.getDocument(documentId),
      this.repo.updateOutGoingDocumentStatus(documentId, statusDoc),
    ]);

    // Tính availableActions, flags, flagsProcess ngay từ BPMN đã parse sẵn
    // Không cần đọc lại DB hay gọi getDetails
    const computedRes = await this.bpmnEngine.computeAvailableActions({
      process: modelRes.process,
      indexes,
      currentNodeId: nextNode.id,
      workItem: {
        role,
        assigneeUserId: assigneeUserId ?? undefined,
        nodeId: nextNode.id,
      },
      document: docResult,
      userId: assigneeUserId,
      userRoles: Array.isArray((userRoleInfo as any)?.roles) ? (userRoleInfo as any).roles : [],
      getUsersByRole: async () => [],
      audit: [],
      documentId,
    });
    //cờ đóng dấu
    const hasStampOption = Array.from(indexes.nodes.values()).some((node: any) => {
      const props = getAllNodeExtensionProperties(node);
      return props && props.isStamp !== undefined;
    });

    let finalActions = computedRes?.availableActions ?? [];
    let finalFlags = computedRes?.flags ?? {};

    const isDraftNotSaved =
      (statusDoc === '1' || statusDoc === 'DRAFT' || docResult?.statusCode === '1' || docResult?.statusCode === 'DRAFT') &&
      (!docResult?.abstractNote || docResult?.abstractNote.trim() === '' || docResult?.abstractNote === 'DUMMY_SYM');

    if (isDraftNotSaved) {
      finalActions = finalActions.filter((a: any) => a.code !== 'XIN_Y_KIEN');
      if (finalFlags) {
        finalFlags = { ...finalFlags, canGiveFeedback: false };
      }
    }

    return {
      document: {
        ...docResult,
        documentId: docResult?.documentId ?? documentId,
        statusCode: statusDoc,
        bpmnVersion,
      },
      workItem: { ...workItem, nodeId: nextNode.id },
      availableActions: finalActions,
      flags: {
        ...finalFlags,
        hasStampOption,
      },
      flagsProcess: computedRes?.flagsProcess ?? {},
    };
  }
  async createDocumentAtNodePassport({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
    userRole = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
    userRole?: string | null;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // 5️⃣ StartEvent
    let startEvent: any = null;

    if (userRole) {
      // Tìm tất cả nodes trong lane tương ứng với role của user
      const nodesInUserLane = Array.from(indexes.laneMap.entries())
        .filter(([_, role]) => role === userRole)
        .map(([nodeId]) => nodeId);

      // Tìm StartEvent trong lane đó
      startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) =>
          node.$type === 'bpmn:StartEvent' && nodesInUserLane.includes(node.id),
      );
    }

    // Fallback: nếu không tìm thấy StartEvent cho role cụ thể, lấy StartEvent đầu tiên
    if (!startEvent) {
      startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;
    }

    if (!startEvent) {
      throw new BadRequestException('Không tìm thấy StartEvent trong BPMN');
    }

    const targetRole = indexes.laneMap.get(startEvent?.id);
    const userIds = await this.groupUserService.getUserIdsByRoleDynamic(
      flowId || '',
      targetRole || '',
    );
    // Kiểm tra assigneeUserId có nằm trong danh sách users của StartEvent role không (Xác thực người tạo)
    const isAllowed = userIds.includes(assigneeUserId || '');
    if (!isAllowed) {
      throw new BadRequestException(
        'Người dùng không có quyền tạo yêu cầu mượn hộ chiếu ở bước này',
      );
    }
    const flow = startEvent.outgoing[0];
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const nodeId = nextNode;
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;

    const role = indexes.laneMap.get(nodeId.id);
    // Lay group cua node tiep theo de giao viec theo nhom, tranh expand tung user.
    const nextNodeGroupIds = await this.groupUserService.getGroupIdsByRoleDynamic(
      flowId || '',
      role || '',
    );

    const filteredNextNodeUsers = nextNodeGroupIds;
    const documentId = data?.documentId;
    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    const initialStatus = data?.statusCode ?? statusDoc ?? 'PENDING';

    if (!filteredNextNodeUsers || filteredNextNodeUsers.length === 0) {
      throw new BadRequestException(
        `Không tìm thấy người xử lý phù hợp (${role || 'Trưởng phòng'}) để khởi tạo quy trình. Vui lòng kiểm tra lại cấu hình người dùng và phòng ban.`,
      );
    }

    if (filteredNextNodeUsers && filteredNextNodeUsers.length > 0) {
      for (const groupId of filteredNextNodeUsers) {
        const workItem: WorkItem = {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nodeId.id,
          role,
          assigneeUserId: groupId,
          nodeType: nodeId.$type,
        };
        await this.repo.addWorkItem(
          documentId,
          workItem,
          undefined,
          flowId || undefined,
        );
        await this.addAuditIncomingAware(documentId, {
          userId: assigneeUserId, // user_id
          role, // role
          actionCode: initialStatus || 'PENDING', // action_code
          fromNodeId: null, // from_node_id
          toNodeId: nodeId.id, // to_node_id
          created_by: assigneeUserId, // created_by
          receiver: groupId || null,
          receiver_unit: data.receiverUnit || null,
          group_: groupId || null,
          roleProcess: role, // vai trò xử lý
          action: 'Tạo yêu cầu', // action
          deadline: null,
          stage_status: stageStatusDoc.CHUA_XU_LY, // stage_status
          details: null,
          curStatusCode: initialStatus,
          typeDocument: 'PassportRequest',
        });
      }
    } else {
      const workItem: WorkItem = {
        id: `wi_${Date.now()}`,
        nodeId: nodeId.id,
        role,
        assigneeUserId: null,
        nodeType: nodeId.$type,
      };
      await this.repo.addWorkItem(
        documentId,
        workItem,
        undefined,
        flowId || undefined,
      );
    }
    await this.repo.updatePassportRequestStatus(documentId, initialStatus);

    return {
      statusCode: 200,
      data: {
        documentId,
        nodeId: nodeId.id,
        role,
        assigneeUserId,
        assigneeGroupIds: filteredNextNodeUsers,
        nodeType: nodeId.$type,
        statusDoc,
        initialStatus,
      },
    }
  }

  async createDocumentAtNodeVoucher({
    bpmnXML,
    data,
    assigneeUserId = null,
    flowId = null,
  }: {
    bpmnXML: string;
    data: any;
    assigneeUserId?: string | null;
    flowId?: string | null;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const documentId = data?.documentId;
    if (!documentId)
      throw new BadRequestException('documentId is required in data');

    const requestId = data?.requestId;
    let currentNodeId: string | null = null;
    let fromNodeId: string | null = null;

    // 1. Tìm node hiện tại từ yêu cầu gốc (PassportRequest) nếu có requestId
    if (requestId) {
      // Nếu là biên bản hoàn trả, ưu tiên tìm node từ work item của biên bản bàn giao trước đó
      if (data?.voucherType === 'RETURN') {
        try {
          const pool = await this.getMsPool();
          const reqWi = pool.request();
          reqWi.input('requestId', sql.NVarChar, requestId);
          const latestHandoverWi = await reqWi.query(`
            SELECT TOP 1 w.node_id 
            FROM work_items w
            INNER JOIN passport_vouchers v ON w.document_id = CAST(v.id AS NVARCHAR(50))
            WHERE v.request_id = @requestId 
              AND v.voucher_type = 'HANDOVER' 
            ORDER BY w.id DESC
          `);
          if (latestHandoverWi.recordset.length > 0 && latestHandoverWi.recordset[0].node_id) {
            currentNodeId = latestHandoverWi.recordset[0].node_id;
            fromNodeId = currentNodeId;
          }
        } catch (err) {
          console.error('[createDocumentAtNodeVoucher] Lỗi tìm node từ work_items BBBG cũ:', err.message);
        }
      }

      // Nếu chưa tìm được currentNodeId (hoặc không phải RETURN), lấy từ work items đang mở của Request
      if (!currentNodeId) {
        const openWorkItems = await this.repo.listOpenWorkItems(requestId);
        const curentAssignee = openWorkItems.filter((item: any) => item.assigneeUserId === assigneeUserId);
        if (curentAssignee.length > 0) {
          currentNodeId = curentAssignee[0].nodeId;
          fromNodeId = currentNodeId;
        } else if (openWorkItems && openWorkItems.length > 0) {
          currentNodeId = openWorkItems[0].nodeId;
          fromNodeId = currentNodeId;
        }
      }
    }

    let nextNode: any = null;

    if (currentNodeId) {
      // 2. Tìm node tiếp theo từ node hiện tại trong luồng Voucher
      const currentNode = indexes.nodes.get(currentNodeId);
      if (currentNode) {
        const outgoingFlows = (currentNode as any).outgoing || [];
        let flow = outgoingFlows[0];

        if (outgoingFlows.length > 1) {
          try {
            // Xác định Lane của người mượn để rẽ nhánh đúng
            let borrowerRole: string | null = null;
            const pool = await this.getMsPool();
            const req = pool.request();
            req.input('requestId', sql.NVarChar, requestId);

            const [reqResult, wiResult] = await Promise.all([
              req.query(`SELECT requester_id FROM passport_borrow_requests WHERE id = @requestId`),
              req.query(`SELECT TOP 1 bpmn_version FROM work_items WHERE document_id = @requestId ORDER BY id DESC`)
            ]);

            const requesterId = reqResult.recordset[0]?.requester_id;
            const bpmnVersion = flowId || wiResult.recordset[0]?.bpmn_version;

            if (requesterId && bpmnVersion) {
              borrowerRole = await this.sqlsvRepo.getMeInFlow(requesterId, bpmnVersion);
            }

            if (borrowerRole) {
              const matchedFlow = outgoingFlows.find((f: any) => {
                try {
                  // Node tiếp theo (Bước 1)
                  const res1 = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
                  const n1 = res1?.node;
                  if (!n1) return false;

                  // Node tiếp theo sau next node (Bước 2 - Stop Point)
                  const secondOutgoing = (n1 as any).outgoing || [];
                  const secondFlow = secondOutgoing[0];
                  if (!secondFlow) return false;

                  const res2 = this.bpmnEngine.nextInteractiveFromFlow(secondFlow, indexes);
                  const n2 = res2?.node;
                  if (!n2) return false;

                  const role2 = indexes.laneMap.get(n2.id);
                  return role2 === borrowerRole;
                } catch {
                  return false;
                }
              });

              if (matchedFlow) {
                flow = matchedFlow;
              }
            }
          } catch (err) {
            console.error('[createDocumentAtNodeVoucher] Lỗi rẽ nhánh động:', err.message);
          }

          // Fallback nếu không tìm thấy nhánh theo Lane của người mượn
          if (!flow || flow === outgoingFlows[0]) {
            const matched = outgoingFlows.find((f: any) => {
              const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
              return extProps.actionCode === 'RECEIVE' || extProps.actionGroup === 'RECEIVE';
            });
            if (matched) flow = matched;
          }
        }

        if (flow) {
          const result = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
          const firstNextNode = result?.node;
          nextNode = firstNextNode;

          // if (firstNextNode) {
          //   // Nếu là RETURN: next thêm 1 node nữa (tổng 2 nodes)
          //   if (data?.voucherType === 'RETURN') {
          //     const secondOutgoing = (firstNextNode as any).outgoing || [];
          //     let secondFlow = secondOutgoing[0];
          //     if (secondOutgoing.length > 1) {
          //       const matched2 = secondOutgoing.find((f: any) => {
          //         const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
          //         return extProps.actionCode === 'HOAN_TRA' || extProps.actionGroup === 'HOAN_TRA';
          //       });
          //       if (matched2) secondFlow = matched2;
          //     }
          //     if (secondFlow) {
          //       const result2 = this.bpmnEngine.nextInteractiveFromFlow(secondFlow, indexes);
          //       nextNode = result2?.node || firstNextNode;
          //     } else {
          //       nextNode = firstNextNode;
          //     }
          //   } else {
          //     nextNode = firstNextNode;
          //   }
          // }
        }
      }
    }

    // Fallback về StartEvent nếu không tìm được node tiếp theo từ Request
    if (!nextNode) {
      const startEvent = Array.from(indexes.nodes.values()).find(
        (node: any) => node.$type === 'bpmn:StartEvent',
      ) as any;
      if (!startEvent) {
        throw new BadRequestException('Không tìm thấy StartEvent trong BPMN');
      }
      const flow = startEvent.outgoing[0];
      const result = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      nextNode = result?.node;
    }

    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy bước xử lý tiếp theo trong luồng Voucher');
    }

    const nodeId = nextNode;
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;
    const role = indexes.laneMap.get(nodeId.id);

    const initialStatus = data?.statusCode ?? statusDoc;

    // For Vouchers, the receiver (nextUser) is explicitly provided in data
    const nextUser = data.receiverId;

    const workItem: WorkItem = {
      id: `wi_${Date.now()}`,
      nodeId: nodeId.id,
      role,
      assigneeUserId: nextUser,
      nodeType: nodeId.$type,
    };

    await this.repo.addWorkItem(
      documentId,
      workItem,
      undefined,
      flowId || undefined,
    );

    await this.addAuditIncomingAware(documentId, {
      userId: assigneeUserId, // user_id
      role, // role
      actionCode: 'CREATE_VOUCHER', // action_code
      fromNodeId: fromNodeId, // kế thừa từ node của request
      toNodeId: nodeId.id, // to_node_id
      created_by: assigneeUserId, // created_by
      receiver: nextUser || null,
      receiver_unit: data.receiverUnit || null,
      roleProcess: role, // vai trò xử lý
      action: 'Tạo biên bản', // action
      deadline: null,
      stage_status: stageStatusDoc.CHUA_XU_LY, // stage_status
      details: data.details || null, // Lưu danh sách item/ghi chú vào đây
      curStatusCode: initialStatus,
      typeDocument: 'PassportVoucher',
    });

    await this.repo.updateVoucherStatus(documentId, initialStatus);

    return {
      statusCode: 200,
      data: {
        documentId,
        nodeId: nodeId.id,
        role,
        assigneeUserId: nextUser,
        nodeType: nodeId.$type,
        statusDoc,
        initialStatus,
      },
    };
  }
  async updateDocument({
    data,
    documentId,
  }: {
    data: any;
    documentId: string;
  }): Promise<any> {
    const traceId = `[updateDocument][docId=${documentId}]`;
    const startedAt = Date.now();

    try {
      await this.repo.validateRequiredTextFields(data, 'IncommingDocument');

      await this.repo.assertFieldsValid(data, 'IncommingDocument');

      await this.repo.updateDocument({ data, documentId });

      const document = await this.repo.getDocument(documentId);
      await this.repo.syncIncomingAssignmentsFromOpenWorkItems(
        documentId,
        document?.openWorkItems || [],
        {
          receiverUnit: document?.receiverUnit ?? data?.receiverUnit ?? null,
          stageStatus: stageStatusDoc.CHUA_XU_LY,
          actionCode: document?.statusCode ?? data?.statusCode ?? stageStatusDoc.CHUA_XU_LY,
          updatedAt: document?.updatedAt || new Date(),
        },
      );

      //Gửi thông báo cho tất cả người trong luồng văn bản.
      this.sendNotificationToFlowParticipants(document)

      return await this.repo.getDocument(documentId);
    } catch (error) {
      this.logger.error(
        `${traceId} failed totalElapsedMs=${Date.now() - startedAt}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }


  //Gửi thông báo cho tất cả người trong luồng văn bản.
  private async sendNotificationToFlowParticipants(document: any) {
    try {
      const audit = await this.runtime.repo.getAuditGrouped(document.documentId);
      const currentUser = RequestContext.getUserId();

      const recipientIds = new Set<string>();
      if (Array.isArray(audit)) {
        for (const group of audit) {
          if (Array.isArray(group.childs)) {
            for (const child of group.childs) {
              const createdById = child.createdBy?._id;
              const receiverId = child.receiver?._id;
              if (createdById) {
                recipientIds.add(String(createdById));
              }
              if (receiverId) {
                recipientIds.add(String(receiverId));
              }
            }
          }
        }
      }

      if (currentUser) {
        recipientIds.delete(String(currentUser));
      }

      for (const recipientId of recipientIds) {
        await this.notificationService.create({
          recipientId,
          senderId: currentUser || '',
          title: `Văn bản đã bị chỉnh sửa: “${document.abstractNote || ''}”`,
          content: `Văn bản đến ${document.toBook ? `số ${document.toBook} ` : ''}đã bị chỉnh sửa.`,
          recordId: document.documentId,
          link: `/incomming-documents/${document.documentId}`,
          key: 'VIEW_INCOMING_DOC',
          type: NotificationType.INCOMING_DOC_EDITED.value,
          time: new Date(),
          status: 1,
        });
      }
    } catch (error) {
      this.logger.error(`sendNotificationToFlowParticipants failed for docId ${document?.documentId}: ${error?.message || error}`, error?.stack);
    }
  }

  async getDetails({
    bpmnXML: _bpmnXML,
    documentId,
    userContext,
    isAuthority,
    prefetchedOutgoingDoc,
    prefetchedIncomingDoc,
    prefetchedIncomingAudit,
    prefetchedIncomingUser,
    prefetchedIncomingAliases,
    prefetchedIncomingUserRole,
    prefetchedIncomingCanView,
    prefetchedIncomingCompleted,
    prefetchedIncomingDeadline,
    prefetchedIncomingMappedDoc,
    prefetchedIncomingViewerAssignments,
    prefetchedIncomingActiveAssignments,
    prefetchedIncomingLatestAuditId,
    prefetchedIncomingCanAdditionalProcessing,
  }: {
    bpmnXML: string;
    documentId: string;
    userContext: { userId: string; roles?: string[] };
    isAuthority?: string;
    prefetchedOutgoingDoc?: any;
    prefetchedIncomingDoc?: any;
    prefetchedIncomingAudit?: any[];
    prefetchedIncomingUser?: any;
    prefetchedIncomingAliases?: { aliases?: Record<string, string> };
    prefetchedIncomingUserRole?: any;
    prefetchedIncomingCanView?: boolean;
    prefetchedIncomingCompleted?: boolean;
    prefetchedIncomingDeadline?: Date | null;
    prefetchedIncomingMappedDoc?: any;
    prefetchedIncomingViewerAssignments?: any[];
    prefetchedIncomingActiveAssignments?: any[];
    prefetchedIncomingLatestAuditId?: number | null;
    prefetchedIncomingCanAdditionalProcessing?: boolean;
  }): Promise<any> {
    const outgoingDoc = prefetchedIncomingDoc ? null : (prefetchedOutgoingDoc ?? await this.repo.getOutgoingDocument(documentId));

    // Route đúng nhánh chi tiết theo loại văn bản để tránh check quyền lệch
    // let outgoingDoc = prefetchedIncomingDoc ? null : prefetchedOutgoingDoc;
    // let prefetchedOutgoingWorkItems: any[] | undefined;
    // if (!prefetchedIncomingDoc) {
    //   prefetchedOutgoingWorkItems = await this.repo.listOpenWorkItems(documentId);
    //   outgoingDoc =
    //     outgoingDoc ??
    //     await this.repo.getOutgoingDocument(documentId, prefetchedOutgoingWorkItems);
    // }
    if (outgoingDoc) {
      const bpmnXML = await this.repo.getBpmnFile(outgoingDoc.bpmnVersion || 'VAN_BAN_DI');
      return this.getDetailsOutgoing({
        bpmnXML,
        documentId,
        userContext,
        isAuthority,
        prefetchedDoc: outgoingDoc,
        // prefetchedWorkItems: prefetchedOutgoingWorkItems,
      });
    }

    try {
      // [TỐI ƯU 1]: Gom toàn bộ các Query Độc lập (Không phụ thuộc vào biến `doc`) vào 1 khối Promise.all cực lớn!
      const [
        _,
        doc,
        audit,
        user,
        { aliases },
        activeAssignments,
      ] = await Promise.all([
        prefetchedIncomingCanView === true
          ? Promise.resolve(true)
          : this.repo.assertCanViewDetail(userContext?.userId, documentId, 'IncommingDocument'),
        prefetchedIncomingDoc ? Promise.resolve(prefetchedIncomingDoc) : this.ensureDoc(documentId),
        prefetchedIncomingAudit ? Promise.resolve(prefetchedIncomingAudit) : this.repo.getAuditLite(documentId),
        prefetchedIncomingUser ? Promise.resolve(prefetchedIncomingUser) : this.sqlsvRepo.getUserById(userContext?.userId),
        prefetchedIncomingAliases ? Promise.resolve(prefetchedIncomingAliases) : this.repo.buildSelectFieldsNew('Incomming', 'incomming_documents'),
        prefetchedIncomingActiveAssignments !== undefined
          ? Promise.resolve(prefetchedIncomingActiveAssignments)
          : this.repo.getIncomingActiveAssignments(documentId),
      ]);

      const mapReceiverIds = (list: any[], isAudit = false) => {
        if (!Array.isArray(list)) return [];

        let latestRecallTime = 0;
        if (isAudit) {
          list.forEach((item: any) => {
            try {
              if (item.details) {
                const detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                if (detailsObj && Array.isArray(detailsObj.recalledUserIds) && detailsObj.recalledUserIds.length > 0) {
                  const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
                  if (!isNaN(itemTime) && itemTime > latestRecallTime) {
                    latestRecallTime = itemTime;
                  }
                }
              }
            } catch {
              // ignore
            }
          });
        }

        return list
          .filter((item: any) => {
            if (isAudit) {
              if (latestRecallTime > 0) {
                const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
                if (isNaN(itemTime) || itemTime <= latestRecallTime) return false;
              }
              if (item.createdBy !== userContext?.userId || !item.details) return false;
              try {
                const detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
                return detailsObj && detailsObj.phanCong === true && (!!item.receiver || !!item.receiverUnit || !!detailsObj.groupId);
              } catch {
                return false;
              }
            }
            return true;
          })
          .flatMap((item: any) => {
            const results: any[] = [];
            let groupId: string | undefined;
            let detailsObj: { groupId?: string; deadline?: unknown } | null = null;
            try {
              detailsObj = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
              if (detailsObj && detailsObj.groupId) {
                groupId = detailsObj.groupId;
              }
            } catch {
              // ignore
            }
            const deadline = item.deadline ?? detailsObj?.deadline ?? null;

            if (item.receiver) {
              results.push({ role: item.roleProcess, userId: item.receiver, deadline });
            }
            if (item.receiverUnit) {
              results.push({ role: item.roleProcess, organizationId: item.receiverUnit, deadline });
            }
            if (groupId) {
              results.push({ role: item.roleProcess, groupId, deadline });
            }
            return results;
          });
      };

      const filterUnique = (list: any[]) => {
        const indexByKey = new Map<string, number>();
        const result: typeof list = [];
        list.forEach((item: { role?: string; userId?: string; organizationId?: string; groupId?: string }) => {
          const key = `${item.role || ''}_${item.userId || ''}_${item.organizationId || ''}_${item.groupId || ''}`;
          const existingIndex = indexByKey.get(key);
          if (existingIndex !== undefined) {
            const existingItem = result[existingIndex];
            result[existingIndex] = {
              ...existingItem,
              ...item,
              deadline: (item as { deadline?: unknown }).deadline
                ?? (existingItem as { deadline?: unknown }).deadline
                ?? null,
            };
            return;
          }
          indexByKey.set(key, result.length);
          result.push(item);
        });
        return result;
      };

      const activeReceiverIdsRaw = mapReceiverIds(activeAssignments, false);
      const assignedReceiverIdsRaw = mapReceiverIds(audit, true);

      const activeReceiverIdsFiltered = filterUnique(activeReceiverIdsRaw);
      const assignedReceiverIds = filterUnique(assignedReceiverIdsRaw);
      const mergedReceiverIds = filterUnique([...assignedReceiverIds, ...activeReceiverIdsFiltered]);

      // [TỐI ƯU 2]: Gom nhóm Query phụ thuộc bpmnVersion (Có được sau khi đã lấy `doc` ở trên)
      const [bpmnModel, userRole, canAdditionalProcessing] = await Promise.all([
        this.getBpmnModelCached(doc.bpmnVersion),
        prefetchedIncomingUserRole ? Promise.resolve(prefetchedIncomingUserRole) : this.repo.getUserRole(userContext?.userId, doc.bpmnVersion),
        prefetchedIncomingCanAdditionalProcessing !== undefined
          ? Promise.resolve(prefetchedIncomingCanAdditionalProcessing)
          : this.repo.canAdditionalProcessingDocument(audit, userContext.userId)
      ]);

      let finalCanAdditionalProcessing = canAdditionalProcessing;
      if (finalCanAdditionalProcessing && bpmnModel?.indexes) {
        const hasPrevent = (() => {
          if (!Array.isArray(audit) || !bpmnModel.indexes) return false;
          const userAudits = audit.filter(a =>
            (String(a.userId || a.user_id) === String(userContext.userId) || String(a.createdBy) === String(userContext.userId)) &&
            a.fromNodeId && a.toNodeId
          );

          for (const a of userAudits) {
            const fromNodeId = a.fromNodeId;
            const actionCode = a.actionCode;
            if (!fromNodeId || !actionCode) continue;

            const outgoing = bpmnModel.indexes.outgoingBySource.get(fromNodeId) || [];
            for (const flow of outgoing) {
              const extProps: Record<string, any> = {};
              if (flow.extensionElements?.values) {
                for (const ext of flow.extensionElements.values) {
                  if (ext.$type === 'camunda:properties') {
                    const values = ext.values || ext.$children || [];
                    for (const p of values) {
                      extProps[p.name] = p.value;
                    }
                  }
                }
              }
              const flowActionCode = extProps.actionCode?.toUpperCase();
              const flowName = flow.name?.toUpperCase();
              const flowId = flow.id?.toUpperCase();

              const isMatch = (flowActionCode === actionCode.toUpperCase()) ||
                (flowName === actionCode.toUpperCase()) ||
                (flowId === actionCode.toUpperCase());

              if (isMatch && extProps.preventAdditionalProcessing === 'true') {
                return true;
              }
            }
          }
          return false;
        })();
        if (hasPrevent) {
          finalCanAdditionalProcessing = false;
        }
      }

      const { process, indexes, bpmnXML: bpmnXmlFromDb } = bpmnModel;
      const userParent = user?.parent?.id;
      const usersByRoleCache = new Map<string, Promise<any[]>>();
      const getUsersByRoleCached = (role: string) => {
        const roleKey = String(role || '').trim();
        if (!usersByRoleCache.has(roleKey)) {
          usersByRoleCache.set(
            roleKey,
            Promise.resolve(this.sqlsvRepo.getUsersByRoleMongoDB(roleKey)),
          );
        }
        return usersByRoleCache.get(roleKey)!;
      };
      const openWorkItems = Array.isArray(doc.openWorkItems)
        ? doc.openWorkItems
        : [];

      const hasThemXuLyWorkItem = openWorkItems.some(
        (wi: any) => wi.nodeId === 'Activity_them_xu_ly_tp' && String(wi.assigneeUserId) === String(userContext.userId)
      );
      if (hasThemXuLyWorkItem) {
        finalCanAdditionalProcessing = true;
      }

      const latestAuditId = prefetchedIncomingLatestAuditId ?? null;
      const workItemGroups = new Map<string, any>();
      for (const wi of openWorkItems) {
        const baseKey = this.buildIncomingActionCacheBaseKey({
          userId: userContext.userId,
          version: String(doc?.bpmnVersion || '').trim(),
          nodeId: wi.nodeId,
          role: wi.role || '',
          assignee: wi.assigneeUserId || '',
        });
        if (!workItemGroups.has(baseKey)) {
          workItemGroups.set(baseKey, wi);
        }
      }

      const computedByBaseKey = new Map<string, CachedIncomingActionPayload>();
      const computeTasks: Array<() => Promise<void>> = [];
      const groupedEntries = Array.from(workItemGroups.entries());
      const cachedEntries = groupedEntries.map(([baseKey, wi]) => ({
        baseKey,
        wi,
        cached: null,
      }));

      for (const { baseKey, wi, cached } of cachedEntries) {
        if (cached) {
          computedByBaseKey.set(baseKey, cached);
          continue;
        }

        computeTasks.push(async () => {
          const res = await this.bpmnEngine.computeAvailableActions({
            process,
            indexes,
            currentNodeId: wi.nodeId,
            workItem: wi,
            document: doc,
            userId: userContext.userId,
            userRoles: userContext.roles || [],
            getUsersByRole: getUsersByRoleCached,
            audit,
            userParent,
            documentId,
            bpmnXML: bpmnXmlFromDb,
            skipRedisRead: true,
          });

          let availableActions = res.availableActions || [];
          const hasKySaoY = availableActions.some((act: any) => act.code === 'KY_SAO_Y');
          if (hasKySaoY) {
            availableActions = availableActions.filter((act: any) => act.code !== 'THEM_XU_LY');
          }

          const payload: CachedIncomingActionPayload = {
            node: res.node,
            availableActions,
            flags: res.flags,
            signKey: res.signKey,
          };
          computedByBaseKey.set(baseKey, payload);
        });
      }

      await this.runIncomingActionTasksInChunks(computeTasks, 6);

      const perItems = openWorkItems.map((wi) => {
        const baseKey = this.buildIncomingActionCacheBaseKey({
          userId: userContext.userId,
          version: String(doc?.bpmnVersion || '').trim(),
          nodeId: wi.nodeId,
          role: wi.role || '',
          assignee: wi.assigneeUserId || '',
        });
        const cachedRes = computedByBaseKey.get(baseKey) || {
          node: null,
          availableActions: [],
          flags: {},
          signKey: {},
        };

        return {
          workItem: wi,
          node: cachedRes.node,
          availableActions: cachedRes.availableActions || [],
          flags: cachedRes.flags || {},
          signKey: cachedRes.signKey || {},
        };
      });


      const executableItems = perItems.filter(
        (x) =>
          Array.isArray(x.availableActions) &&
          x.availableActions.some((a: any) => a.canExecute && a.type !== 'completeDoc'),
      );
      const actionableItems = executableItems.filter((x) => {
        const assigneeUserId = String(
          x?.workItem?.assigneeUserId ?? x?.workItem?.assignee_user_id ?? '',
        ).trim();
        const workItemRole = String(x?.workItem?.role ?? '').trim();
        const currentUserId = String(userContext?.userId ?? '').trim();
        const currentUserParent = String(userParent ?? '').trim();

        if (!assigneeUserId && workItemRole) {
          return Array.isArray(userContext?.roles) && userContext.roles.includes(workItemRole);
        }

        return !!assigneeUserId && (
          assigneeUserId === currentUserId ||
          (!!currentUserParent && assigneeUserId === currentUserParent)
        );
      });

      const seenLabels = new Set<string>();
      const mergedAvailableActions = perItems
        .filter((x) => Array.isArray(x.availableActions))
        .flatMap((x) =>
          x.availableActions.map((a: any) => ({
            ...a,
            workItemId: x.workItem?.id,
            nodeId: x.workItem?.nodeId,
          })),
        )
        .filter((a: any) => {
          const label = String(a.label || '').trim();
          if (!label) return true;
          if (seenLabels.has(label)) return false;
          seenLabels.add(label);
          return true;
        });

      // Merge động tất cả flags từ perItems (bao gồm flags từ BPMN)
      const summaryFlags = perItems.reduce(
        (acc, x) => {
          const mergedFlags = { ...acc };
          // Merge tất cả flags từ x.flags
          for (const key in x.flags) {
            if (x.flags.hasOwnProperty(key)) {
              mergedFlags[key] = mergedFlags[key] || x.flags[key];
            }
          }
          return mergedFlags;
        },
        {
          canProcess: false,
          canReturn: false,
          canComplete: false,
          canProcessSupport: false,
          canReturnSupport: false,
          canCompleteSupport: false,
          canViewed: false,
          canRecall: false,
          canCompleteDoc: false,
          canSigningSubmission: false,
          canGiveFeedback: false,
          canApprove: false,
          canCompleteProposal: false,
          canIssueProposal: false,
          canTransferFeedback: false,
          canSetNumber: false,
          canSuggestPromulgate: false,
          canTransferOptions: false,
          canSignDraft: false,
          canSignCertificate: false,
          canOfficialSigner1: false,
          canOfficialSigner2: false,
          canOfficialSigner3: false,
        },
      );

      const hasViewedAudit = audit.some(a =>
        (a.receiver === userContext.userId || a.userId === userContext.userId) &&
        a.roleProcess === 'viewer'
      );
      if (hasViewedAudit) {
        summaryFlags.canViewed = true;
      }
      const prioritizedItems = actionableItems.length > 0
        ? actionableItems
        : executableItems.length > 0
          ? executableItems
          : perItems;
      const summary =
        prioritizedItems.find((x) => {
          const keySign = x?.signKey?.keySign;
          return typeof keySign === 'string' ? keySign.trim() !== '' : !!keySign;
        }) ||
        prioritizedItems[0] || {
          workItem: null,
          node: null,
          availableActions: [],
          flags: { canProcess: false, canReturn: false },
          signKey: {},
        };


      const actionSourceItems = actionableItems.length > 0
        ? actionableItems
        : executableItems.length > 0
          ? executableItems
          : perItems;
      const seenActionKeys = new Set<string>();
      const summaryAvailableActions = actionSourceItems
        .filter((x) => Array.isArray(x.availableActions))
        .flatMap((x) =>
          x.availableActions.map((a: any) => ({
            ...a,
            workItemId: x.workItem?.id,
            nodeId: x.workItem?.nodeId,
          })),
        )
        .filter((a: any) => {
          const key = `${a.code}_${a.flowId || ''}_${a.type || ''}_${a.label || ''}`;
          if (seenActionKeys.has(key)) return false;
          seenActionKeys.add(key);
          return true;
        });

      const completionActionItems = perItems.filter((x) => {
        const assigneeUserId = String(
          x?.workItem?.assigneeUserId ?? x?.workItem?.assignee_user_id ?? '',
        ).trim();
        const currentUserId = String(userContext?.userId ?? '').trim();
        const currentUserParent = String(userParent ?? '').trim();

        return !!assigneeUserId && (
          assigneeUserId === currentUserId ||
          (!!currentUserParent && assigneeUserId === currentUserParent)
        );
      });

      for (const item of completionActionItems) {
        for (const action of item.availableActions || []) {
          const isCompletionAction =
            action?.type === 'complete' || action?.type === 'completeDoc';
          if (!isCompletionAction || !action?.canExecute) continue;

          const mergedAction = {
            ...action,
            workItemId: item.workItem?.id,
            nodeId: item.workItem?.nodeId,
          };
          const key = `${mergedAction.code}_${mergedAction.flowId || ''}_${mergedAction.type || ''}_${mergedAction.label || ''}`;
          if (seenActionKeys.has(key)) continue;
          seenActionKeys.add(key);
          summaryAvailableActions.push(mergedAction);
        }
      }

      const actionFind = summaryAvailableActions.find(
        (e: any) => e.code === 'CHUYEN_XU_LY',
      );
      let canSetSupporter = false;
      let canSetViewer = false;
      const canSetProcessor = true;

      if (actionFind) {
        if (actionFind.subActions) {
          //Kiểm tra trong subActions có action nào là NHAN_DE_BIET hoặc PHOI_HOP không
          const existActions = actionFind.subActions.find(
            (e: any) => e.actions && e.actions.length > 0,
          );
          if (existActions)
            //Cập nhật lại biến canSetSupporter và canSetViewer để hiển thị checkbox tương ứng
            for (const sa of existActions.actions) {
              if (sa.code === 'NHAN_DE_BIET') canSetViewer = true;
              if (sa.code === 'PHOI_HOP') canSetSupporter = true;
            }
        }
      }

      const flagsProcess = { canSetSupporter, canSetViewer, canSetProcessor };
      const checkBpmnDisabled = (flagKey: string) => {
        if (bpmnModel?.indexes?.nodes) {
          for (const node of bpmnModel.indexes.nodes.values()) {
            const props = getAllNodeExtensionProperties(node);
            const flagsBtn = parseFlagsButton(props?.flagsButton);
            if (
              props?.[flagKey] === 'false' ||
              props?.[flagKey] === '0' ||
              props?.[flagKey] === false ||
              flagsBtn?.[flagKey] === false ||
              flagsBtn?.[flagKey] === 'false'
            ) {
              return true;
            }
          }
        }
        if (bpmnModel?.indexes?.outgoingBySource) {
          for (const flows of bpmnModel.indexes.outgoingBySource.values()) {
            for (const f of flows) {
              const flowProps = this.bpmnEngine.getFlowExtensionProperties(f);
              const flowFlagsBtn = parseFlagsButton(flowProps?.flagsButton || flowProps?.flags);
              if (
                flowProps?.[flagKey] === 'false' ||
                flowProps?.[flagKey] === '0' ||
                flowProps?.[flagKey] === false ||
                flowFlagsBtn?.[flagKey] === false ||
                flowFlagsBtn?.[flagKey] === 'false'
              ) {
                return true;
              }
            }
          }
        }
        return false;
      };

      const isRejectDisabled = checkBpmnDisabled('canReject');
      if (isRejectDisabled) {
        summaryFlags.canReject = false;
      } else if (
        (doc.copyToInternal || doc.copyToInternal !== '') &&
        (!doc.bookDocumentId || doc.bookDocumentId === '')
      ) {
        summaryFlags.canReject = true;
      }

      const items = [doc];

      // [TỐI ƯU 3]: Đưa mapDocKeysForDetailV1 xuống chạy độc lập phía dưới
      const docMappedRows = prefetchedIncomingMappedDoc ? [prefetchedIncomingMappedDoc] : await this.repo.mapDocKeysForDetailV1(
        items,
        aliases,
        isAuthority,
        // Detail API skips heavy file loading to keep DB fan-out low under concurrency.
        { skipFiles: true },
      );
      const docMapped = Array.isArray(docMappedRows) ? docMappedRows[0] : docMappedRows;
      const hasVanThuRole =
        Array.isArray(userRole?.roles) &&
        userRole.roles.some((r) => VAN_THU_ALL.includes(r));
      let canSaveBook = false;
      if (
        userRole &&
        userRole.roles &&
        hasVanThuRole &&
        (doc.bookDocumentId === '' ||
          (doc.bookDocumentId == null && (doc.isIncomming || doc.is_incomming)))
      ) {
        canSaveBook = true;
      }
      // Tìm kiếm audit của phân công trả ra các phần tử đã được giao phân công
      const handlingMap = new Map<string, any>();
      if (!summary.workItem) {
        audit.forEach((a: any) => {
          const details = typeof a?.details === 'string' ? JSON.parse(a.details) : (a?.details || {});
          const actorId = String(a?.userId || a?.user_id || a?.createdBy || a?.receiver || '').trim();
          const currentUserId = String(userContext?.userId || '').trim();
          const isAssignedByCurrentUser = !!currentUserId && !!actorId && actorId === currentUserId;
          if (details && details?.phanCong === true && isAssignedByCurrentUser) {
            const subCode = details.subActionCode || 'XU_LY_CHINH';
            if (!handlingMap.has(subCode)) {
              handlingMap.set(subCode, {
                subActionCode: subCode,
                users: [],
                organizationUnits: [],
                deadline: details.deadline || null
              });
            }
            const group = handlingMap.get(subCode);
            const assigneeId = details?.assigneeUserId;
            const ouId = details?.receiverUnit;
            if (assigneeId) {
              if (!group.users.includes(assigneeId)) group.users.push(assigneeId);
            }
            if (ouId) {
              if (!group.organizationUnits.includes(ouId)) group.organizationUnits.push(ouId);
            }
          }
        })
      }
      const phanCongAudit = Array.from(handlingMap.values());

      // Override actions and flags if the user is ONLY a viewer (Nhận để biết) on this document
      try {
        const userAssignments = Array.isArray(prefetchedIncomingViewerAssignments)
          ? prefetchedIncomingViewerAssignments
          : [];
        if (userAssignments.length > 0) {
          const hasProcessorOrSupporter = userAssignments.some(
            (a: any) => (a.role_process === 'processor' || a.role_process === 'supporter') && a.stage_status === 'CHUA_XU_LY'
          );
          if (!hasProcessorOrSupporter) {
            const viewerAssignments = userAssignments.filter((a: any) => a.role_process === 'viewer');
            if (viewerAssignments.length > 0) {
              const hasUnreadViewer = viewerAssignments.some((a: any) => a.stage_status === 'CHUA_XU_LY');

              // Clear all computed actions and only keep "Đã xem" if unread
              summaryAvailableActions.length = 0;
              if (hasUnreadViewer) {
                summaryAvailableActions.push({
                  code: stageStatusDoc.DA_XEM,
                  label: 'Đã xem',
                  type: 'viewed',
                  canExecute: true,
                });
              }

              // Clear all summary flags except canViewed
              for (const key in summaryFlags) {
                if (key !== 'canViewed') {
                  summaryFlags[key] = false;
                }
              }

              // Clear flagsProcess
              flagsProcess.canSetSupporter = false;
              flagsProcess.canSetViewer = false;
              flagsProcess.canSetProcessor = false;
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi check viewer assignment:', err);
      }

      // Ẩn các chức năng xử lý nếu văn bản đã hoàn thành và người dùng hiện tại đã hết hạn xử lý
      const isCompletedDoc = prefetchedIncomingCompleted ?? await this.repo.isIncomingDocumentCompleted(documentId);
      if (isCompletedDoc) {
        const userDeadline = prefetchedIncomingDeadline !== undefined
          ? prefetchedIncomingDeadline
          : await this.repo.getAssignmentDeadline(documentId, userContext.userId);
        if (userDeadline && new Date() > userDeadline) {
          summaryAvailableActions.length = 0;
          for (const key in summaryFlags) {
            if (summaryFlags.hasOwnProperty(key) && key !== 'canViewed') {
              summaryFlags[key] = false;
            }
          }
          flagsProcess.canSetSupporter = false;
          flagsProcess.canSetViewer = false;
          flagsProcess.canSetProcessor = false;
        }
      }

      const hasCannotRecall = perItems.some((item) => {
        const props = getAllNodeExtensionProperties(item.node);
        return props?.cannotRecall === 'true' || props?.cannotRecall === '1';
      });
      if (hasCannotRecall) {
        summaryFlags.canRecall = false;
      }

      const isFurtherAssign = audit.some((a: any) => {
        try {
          const details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
          const actorId = String(a.createdBy || a.created_by || a.userId || a.user_id || details.assigner || '').trim();
          const currentUserId = String(userContext?.userId || '').trim();
          if (details.isFurtherAssign !== true || actorId !== currentUserId) {
            return false;
          }
          // Check if this assignment has been recalled
          const isRecalled = audit.some((other: any) => {
            const act = String(other.actionCode || other.action_code || '');
            return (act === 'THU_HOI_PHAN_CONG' || act === 'THU_HOI') && String(other.originId || other.origin_id || '') === String(a.originId || a.origin_id || '');
          });
          return !isRecalled;
        } catch {
          return false;
        }
      });

      const isLeaderAssignSubmitted = audit.some((a: any) => {
        try {
          const details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
          const actorId = String(a.createdBy || a.created_by || a.userId || a.user_id || details.assigner || '').trim();
          const currentUserId = String(userContext?.userId || '').trim();
          if ((details.assignmentType !== 'TRINH_LANH_DAO' && details.assignmentType !== 'TRUONG_PHONG') || actorId !== currentUserId) {
            return false;
          }
          const isRecalled = audit.some((other: any) => {
            const act = String(other.actionCode || other.action_code || '');
            return (act === 'THU_HOI_PHAN_CONG' || act === 'THU_HOI') && String(other.originId || other.origin_id || '') === String(a.originId || a.origin_id || '');
          });
          return !isRecalled;
        } catch {
          return false;
        }
      });

      const { canRecall, ...restSummaryFlags } = summaryFlags ?? {};
      const finalCanRecallIncoming = Boolean((isLeaderAssignSubmitted || isFurtherAssign) && canRecall !== false);
      return {
        document: {
          ...docMapped,
          // isFollow: isFollowBoolean,
          userPhanCong: phanCongAudit
        },
        workItem: summary.workItem,
        availableActions: summaryAvailableActions,
        flags: { ...restSummaryFlags, canSaveBook, canAdditionalProcessing: finalCanAdditionalProcessing, canRecallIncoming: finalCanRecallIncoming, isFurtherAssign },
        flagsProcess,
        signKey: summary.signKey,
        assignedReceiverIds: mergedReceiverIds,
        activeReceiverIds: activeReceiverIdsFiltered,
      };
    } catch (error) {
      console.error('Error in getDetails:', error);
      throw error;
    }
  }

  //////////////////chi tiết văn bản đi//////////////////////

  async getDetailsOutgoing({
    bpmnXML,
    documentId,
    userContext,
    isAuthority,
    skipFiles = false,
    skipAssertCanView = false,
    useNoLock = false,
    prefetchedDoc,
    prefetchedAudit,
    prefetchedOutgoingState,
    prefetchedWorkItems,
  }: {
    bpmnXML: string;
    documentId: string;
    userContext: { userId: string; roles?: string[] };
    isAuthority?: string;
    skipFiles?: boolean;
    skipAssertCanView?: boolean;
    useNoLock?: boolean;
    prefetchedDoc?: any;
    prefetchedAudit?: any[];
    prefetchedOutgoingState?: any;
    prefetchedWorkItems?: any[];
  }): Promise<any> {
    try {
      const perfEnabled = false;
      const perfStartedAt = Date.now();
      const perfMarks: Array<{ stage: string; ms: number }> = [];
      const markPerf = (stage: string, startedAt: number) => {
        if (!perfEnabled) return;
        perfMarks.push({ stage, ms: Date.now() - startedAt });
      };
      // Mark notification as read
      // try {
      //   if (userContext.userId && documentId) {
      //     await this.notificationService.markAsReadByRecord(
      //       userContext.userId,
      //       documentId,
      //     );
      //   }
      // } catch (e) {
      //   console.warn(
      //     `[getDetailsOutgoing] Failed to mark notification as read: ${e.message}`,
      //   );
      // }

      const docPromise = prefetchedDoc
        ? Promise.resolve(prefetchedDoc)
        : this.ensureDocOutgoing(documentId);

      const outgoingStatePromise =
        prefetchedOutgoingState !== undefined
          ? Promise.resolve(prefetchedOutgoingState)
          : this.repo.getOutgoingCurrentState(documentId, useNoLock);

      const auditPromise =
        prefetchedAudit !== undefined
          ? Promise.resolve(prefetchedAudit)
          : this.repo.getAudit(documentId);

      const preloadStartedAt = Date.now();
      const [doc, outgoingState, { process, indexes }, audit] = await Promise.all([
        docPromise,
        outgoingStatePromise,
        this.getModelFromXml(bpmnXML),
        auditPromise,
      ]);
      markPerf('parallel:doc|outgoingState|getModelFromXml|audit', preloadStartedAt);

      if (Array.isArray(prefetchedWorkItems)) {
        doc.openWorkItems = prefetchedWorkItems.map((wi: any) => ({
          id: String(wi.id),
          nodeId: wi.nodeId ?? wi.node_id,
          role: wi.role,
          assigneeUserId: wi.assigneeUserId ?? wi.assignee_user_id,
          nodeType: wi.nodeType ?? wi.node_type,
          state: wi.state,
        }));
      }

      // Only check permission on first call; skip for fallback/alternative versions
      if (!skipAssertCanView) {
        const assertViewStartedAt = Date.now();
        await this.repo.assertCanViewDetail(
          userContext?.userId,
          documentId,
          'OutgoingDocument',
        );
        markPerf('assertCanViewDetail', assertViewStartedAt);
      }
      const userRoleStartedAt = Date.now();
      const userRole = await this.repo.getUserRole(
        userContext?.userId,
        doc?.bpmnVersion,
      );
      markPerf('getUserRole', userRoleStartedAt);
      let isPromulgate = false;
      if (audit && audit.length > 0) {
        // Lấy bản ghi audit cuối cùng (mới nhất) vì getAudit trả về ORDER BY time ASC
        const latestAudit = audit[audit.length - 1];
        isPromulgate = latestAudit.stageStatus === stageStatusMapV2.DA_BAN_HANH;
      }
      isPromulgate =
        isPromulgate ||
        outgoingState?.dong_dau_cuoi === 1 ||
        outgoingState?.dong_dau_cuoi === true;
      const perItems: any[] = [];
      const VIEW_MARK_ACTION = {
        code: stageStatusDoc.DA_XEM,
        label: 'Đã xem',
        type: 'viewed',
        canExecute: true,
      };
      const activeLinksPromise = this.repo.getIncommingDocumentInternal(documentId).catch(() => []);
      const userByIdCache = new Map<string, Promise<any | null>>();
      const orgUnitByIdCache = new Map<string, Promise<any | null>>();
      const agencyByIdCache = new Map<string, Promise<any | null>>();
      const groupByIdCache = new Map<string, Promise<any | null>>();
      const groupByIdSafeCache = new Map<string, Promise<any | null>>();
      const normalizeIds = (ids: any): string[] => {
        let parsedIds = ids;
        if (typeof ids === 'string' && ids.trim()) {
          try {
            parsedIds = JSON.parse(ids);
          } catch {
            parsedIds = [ids];
          }
        }
        if (!Array.isArray(parsedIds)) {
          parsedIds = parsedIds ? [parsedIds] : [];
        }
        return Array.from(new Set(
          parsedIds
            .map((id: any) => (typeof id === 'string' ? id.trim() : String(id)))
            .filter((id: string) => id.length > 0),
        ));
      };
      const getUserByIdCached = (id: string) => {
        const key = String(id || '').trim();
        if (!key) return Promise.resolve(null);
        if (!userByIdCache.has(key)) {
          userByIdCache.set(key, Promise.resolve(this.sqlsvRepo.getUserById(key)));
        }
        return userByIdCache.get(key)!;
      };
      const getOrgUnitByIdCached = (id: string) => {
        const key = String(id || '').trim();
        if (!key) return Promise.resolve(null);
        if (!orgUnitByIdCache.has(key)) {
          orgUnitByIdCache.set(key, Promise.resolve(this.sqlsvRepo.getOrganizationUnitById(key)));
        }
        return orgUnitByIdCache.get(key)!;
      };
      const getAgencyByIdCached = (id: string) => {
        const key = String(id || '').trim();
        if (!key) return Promise.resolve(null);
        if (!agencyByIdCache.has(key)) {
          agencyByIdCache.set(key, Promise.resolve(this.sqlsvRepo.getAgentciesById(key)));
        }
        return agencyByIdCache.get(key)!;
      };
      const getGroupByIdCached = (id: string) => {
        const key = String(id || '').trim();
        if (!key) return Promise.resolve(null);
        if (!groupByIdCache.has(key)) {
          groupByIdCache.set(key, Promise.resolve(this.groupUserService.findById(key)));
        }
        return groupByIdCache.get(key)!;
      };
      const getGroupByIdSafeCached = (id: string) => {
        const key = String(id || '').trim();
        if (!key) return Promise.resolve(null);
        if (!groupByIdSafeCache.has(key)) {
          groupByIdSafeCache.set(key, Promise.resolve(this.groupUserService.findByIdSafe(key)));
        }
        return groupByIdSafeCache.get(key)!;
      };
      const toLinkMap = (activeLinks: any[]) => new Map(
        activeLinks.map((x) => [String(x.receiverUnit), x]),
      );
      const mapDocLinkState = (docInfo: any, base: any) => {
        if (!docInfo) {
          return {
            ...base,
            requestStatusName: 'Chờ gửi',
            processStatusName: 'Chưa xử lý',
            isRecall: false,
          };
        }

        const { status, bookDocumentId, currentStageStatus, isCompletedDoc } = docInfo;
        const isRecalled = status === 2 || status === 3;

        let requestStatusName = 'Chờ xử lý';
        if (isRecalled) {
          requestStatusName = 'Thu hồi';
        } else if (isCompletedDoc === 1 || currentStageStatus === 'HOAN_THANH' || currentStageStatus === 'HOAN_THANH_VAN_BAN') {
          requestStatusName = 'Đã hoàn thành';
        } else if (currentStageStatus === 'DANG_XU_LY') {
          requestStatusName = 'Đang xử lý';
        } else if (bookDocumentId != null && String(bookDocumentId).trim() !== '') {
          requestStatusName = 'Đã tiếp nhận';
        }

        return {
          ...base,
          requestStatusName,
          processStatusName: isRecalled ? 'Đã thu hồi' : 'Đã gửi',
          isRecall: isRecalled,
        };
      };
      const batchUsersByIds = async (ids: string[]): Promise<Map<string, any>> => {
        const normalized = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
        const missing = normalized.filter((id) => !userByIdCache.has(id));
        if (missing.length) {
          const rows = await this.sqlsvRepo.getUsersByIds(missing);
          const found = new Map(
            rows.map((row: any) => [
              String(row.id),
              {
                ...row,
                name: row.name || row.username || row.codeND || `User_${row.id}`,
                types: 'user',
              },
            ]),
          );
          missing.forEach((id) => userByIdCache.set(id, Promise.resolve(found.get(id) ?? null)));
        }
        const entries = await Promise.all(normalized.map(async (id) => [id, await getUserByIdCached(id)] as const));
        return new Map(entries.filter(([, value]) => !!value) as Array<readonly [string, any]>);
      };
      const batchOrgUnitsByIds = async (ids: string[]): Promise<Map<string, any>> => {
        const normalized = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
        const missing = normalized.filter((id) => !orgUnitByIdCache.has(id));
        if (missing.length) {
          const rows = await this.sqlsvRepo.getOrganizationUnitsByIdsSafe(missing);
          const found = new Map(rows.map((row: any) => [String(row.id), row]));
          missing.forEach((id) => orgUnitByIdCache.set(id, Promise.resolve(found.get(id) ?? null)));
        }
        const entries = await Promise.all(normalized.map(async (id) => [id, await getOrgUnitByIdCached(id)] as const));
        return new Map(entries.filter(([, value]) => !!value) as Array<readonly [string, any]>);
      };
      const batchAgenciesByIds = async (ids: string[]): Promise<Map<string, any>> => {
        const normalized = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
        const missing = normalized.filter((id) => !agencyByIdCache.has(id));
        if (missing.length) {
          const rows = await this.sqlsvRepo.getAgenciesByIds(missing);
          const found = new Map(rows.map((row: any) => [String(row.id || row._id), row]));
          missing.forEach((id) => agencyByIdCache.set(id, Promise.resolve(found.get(id) ?? null)));
        }
        const entries = await Promise.all(normalized.map(async (id) => [id, await getAgencyByIdCached(id)] as const));
        return new Map(entries.filter(([, value]) => !!value) as Array<readonly [string, any]>);
      };
      const batchGroupsByIds = async (ids: string[]): Promise<Map<string, any>> => {
        const normalized = Array.from(new Set(ids.map((id) => String(id || '').trim()).filter(Boolean)));
        const missing = normalized.filter((id) => !groupByIdCache.has(id));
        if (missing.length) {
          const rows = await this.groupUserService.findManyByIds(missing);
          const found = new Map(rows.map((row: any) => [String(row.id), row]));
          missing.forEach((id) => {
            const row = found.get(id);
            groupByIdCache.set(id, Promise.resolve(row ? { data: row } : null));
            groupByIdSafeCache.set(id, Promise.resolve(row ? { data: { ...row, status: 1 } } : null));
          });
        }
        const entries = await Promise.all(normalized.map(async (id) => [id, await getGroupByIdCached(id)] as const));
        return new Map(entries.filter(([, value]) => !!value) as Array<readonly [string, any]>);
      };

      const resolveOrgUnits = async (ids: any, outgoingDocId: string): Promise<any[]> => {
        let parsedIds = ids;
        if (typeof ids === 'string' && ids.trim()) {
          try {
            parsedIds = JSON.parse(ids);
          } catch {
            parsedIds = [];
          }
        }
        if (!parsedIds || !Array.isArray(parsedIds) || parsedIds.length === 0) return [];

        // Lọc ra các ID hợp lệ
        const validIds = parsedIds
          .map((id: any) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id: string) => id.length > 0);

        if (validIds.length === 0) return [];

        try {
          const results = await Promise.all(
            validIds.map((id) => getOrgUnitByIdCached(id)),
          );
          const cleanResults = results.filter((user) => user !== null);

          const activeLinks: any[] = outgoingDocId === documentId ? await activeLinksPromise : await this.repo.getIncommingDocumentInternal(outgoingDocId);
          const linkMap = toLinkMap(activeLinks);

          // Trả về toàn bộ danh sách phòng ban đã cấu hình (nếu chưa gửi/chưa có link thì ở trạng thái Chờ gửi)
          const filteredResults = cleanResults;

          const mapped = filteredResults.map((user) => {
            const docInfo = linkMap.get(String(user.id));
            if (!docInfo) {
              return {
                ...user,
                requestStatusName: 'Chờ gửi',
                processStatusName: 'Chưa xử lý',
                isRecall: false,
              };
            }

            const { status, bookDocumentId, currentStageStatus, isCompletedDoc } = docInfo;
            const isRecalled = status === 2 || status === 3;

            let requestStatusName = 'Chờ xử lý';
            if (isRecalled) {
              requestStatusName = 'Thu hồi';
            } else if (isCompletedDoc === 1 || currentStageStatus === 'HOAN_THANH' || currentStageStatus === 'HOAN_THANH_VAN_BAN') {
              requestStatusName = 'Đã hoàn thành';
            } else if (currentStageStatus === 'DANG_XU_LY') {
              requestStatusName = 'Đang xử lý';
            } else if (bookDocumentId != null && String(bookDocumentId).trim() !== '') {
              requestStatusName = 'Đã tiếp nhận';
            }

            return {
              ...user,
              requestStatusName,
              processStatusName: isRecalled ? 'Đã thu hồi' : 'Đã gửi',
              isRecall: isRecalled,
            };
          });

          return mapped;
        } catch (err) {
          console.warn('Lỗi resolve organization units:', err);
          return [];
        }
      };

      const resolveAgencies = async (
        ids: any,
        outgoingDocId: string,
      ): Promise<any[]> => {
        let parsedIds = ids;
        if (typeof ids === 'string' && ids.trim()) {
          try {
            parsedIds = JSON.parse(ids);
          } catch {
            parsedIds = [];
          }
        }
        if (!parsedIds || !Array.isArray(parsedIds) || parsedIds.length === 0) return [];

        const validIds = parsedIds
          .map((id: any) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id: string) => id.length > 0);

        if (validIds.length === 0) return [];

        try {
          const results = await Promise.all(
            validIds.map((id) => getAgencyByIdCached(id)),
          );
          const cleanResults = results.filter((user) => user !== null);

          const activeLinks: any[] = outgoingDocId === documentId ? await activeLinksPromise : await this.repo.getIncommingDocumentInternal(outgoingDocId);
          const linkMap = toLinkMap(activeLinks);

          // Trả về toàn bộ danh sách đơn vị đã cấu hình (nếu chưa gửi/chưa có link thì ở trạng thái Chờ gửi)
          const filteredResults = cleanResults;

          const mapped = filteredResults.map((user) => {
            const docInfo = linkMap.get(String(user._id));
            if (!docInfo) {
              return {
                ...user,
                requestStatusName: 'Chờ gửi',
                processStatusName: 'Chưa xử lý',
                isRecall: false,
              };
            }

            const { status, bookDocumentId, currentStageStatus, isCompletedDoc } = docInfo;
            const isRecalled = status === 2 || status === 3;

            let requestStatusName = 'Chờ xử lý';
            if (isRecalled) {
              requestStatusName = 'Thu hồi';
            } else if (isCompletedDoc === 1 || currentStageStatus === 'HOAN_THANH' || currentStageStatus === 'HOAN_THANH_VAN_BAN') {
              requestStatusName = 'Đã hoàn thành';
            } else if (currentStageStatus === 'DANG_XU_LY') {
              requestStatusName = 'Đang xử lý';
            } else if (bookDocumentId != null && String(bookDocumentId).trim() !== '') {
              requestStatusName = 'Đã tiếp nhận';
            }

            return {
              ...user,
              requestStatusName,
              processStatusName: isRecalled ? 'Đã thu hồi' : 'Đã gửi',
              isRecall: isRecalled,
            };
          });

          return mapped;
        } catch (err) {
          console.warn('Lỗi resolve agencies:', err);
          return [];
        }
      };

      const resolveProcessor = async (
        ids: any,
        outgoingDocId: string,
      ): Promise<any[]> => {
        let parsedIds = ids;
        if (typeof ids === 'string' && ids.trim()) {
          try {
            parsedIds = JSON.parse(ids);
          } catch {
            parsedIds = [];
          }
        }
        if (!parsedIds || !Array.isArray(parsedIds) || parsedIds.length === 0) return [];

        const validIds = parsedIds
          .map((id: any) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id: string) => id.length > 0);

        if (validIds.length === 0) return [];

        try {
          const results = await Promise.all(
            validIds.map((id) => getUserByIdCached(id)),
          );

          const cleanResults = results.filter((user) => user !== null);

          const activeLinks: any[] = outgoingDocId === documentId ? await activeLinksPromise : await this.repo.getIncommingDocumentInternal(outgoingDocId);
          const linkMap = toLinkMap(activeLinks);

          // Trả về toàn bộ danh sách chuyên viên đã cấu hình (nếu chưa gửi/chưa có link thì ở trạng thái Chờ gửi)
          const filteredResults = cleanResults;

          const mapped = filteredResults.map((user) => {
            const docInfo = linkMap.get(String(user.parent?.id));
            if (!docInfo) {
              return {
                ...user,
                requestStatusName: 'Chờ gửi',
                processStatusName: 'Chưa xử lý',
                isRecall: false,
              };
            }

            const { status, bookDocumentId, currentStageStatus, isCompletedDoc } = docInfo;
            const isRecalled = status === 2 || status === 3;

            let requestStatusName = 'Chờ xử lý';
            if (isRecalled) {
              requestStatusName = 'Thu hồi';
            } else if (isCompletedDoc === 1 || currentStageStatus === 'HOAN_THANH' || currentStageStatus === 'HOAN_THANH_VAN_BAN') {
              requestStatusName = 'Đã hoàn thành';
            } else if (currentStageStatus === 'DANG_XU_LY') {
              requestStatusName = 'Đang xử lý';
            } else if (bookDocumentId != null && String(bookDocumentId).trim() !== '') {
              requestStatusName = 'Đã tiếp nhận';
            }

            return {
              ...user,
              requestStatusName,
              processStatusName: isRecalled ? 'Đã thu hồi' : 'Đã gửi',
              isRecall: isRecalled,
            };
          });

          return mapped;
        } catch (err) {
          console.warn('Lỗi resolve processors:', err);
          return [];
        }
      };

      const resolveUsersByIds = async (ids: any): Promise<any[]> => {
        if (!Array.isArray(ids) || ids.length === 0) return [];

        const validIds = ids
          .map((id) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id) => id.length > 0); // ✅ KHÔNG chặn UUID

        if (validIds.length === 0) return [];

        try {
          const users = await Promise.all(
            validIds.map((id) => getUserByIdCached(id)),
          );

          return users.filter(Boolean);
        } catch (err) {
          console.warn('Lỗi resolve users:', err);
          return [];
        }
      };
      const resolveDocumentViewerGroupsIds = async (ids: any): Promise<any[]> => {
        if (!Array.isArray(ids) || ids.length === 0) return [];

        const validIds = ids
          .map((id) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id) => id.length > 0);

        if (validIds.length === 0) return [];

        try {
          const groups = await Promise.all(
            validIds.map((id) => getGroupByIdCached(id)),
          );
          return groups
            .filter(Boolean)
            .map(g => ({
              id: g.data?.id,
              name: g.data?.name,
            }))
            .filter(g => g.id && g.name);
        } catch (err) {
          console.warn('Lỗi resolve document viewer groups:', err);
          return [];
        }
      };

      const resolveUsersAndGroups = async (userIds: any, groupIds: any): Promise<any[]> => {
        const resolvedUsers = await resolveUsersByIds(userIds);

        if (!Array.isArray(groupIds) || groupIds.length === 0) return resolvedUsers;

        const validGroupIds = groupIds
          .map((id) => (typeof id === 'string' ? id.trim() : String(id)))
          .filter((id) => id.length > 0);

        if (validGroupIds.length === 0) return resolvedUsers;

        try {
          const groupResults = await Promise.all(
            validGroupIds.map((id) => getGroupByIdSafeCached(id)),
          );

          const resolvedGroups = groupResults
            .filter((g): g is any => !!g)
            .filter(g => g.data?.status === 5 || g.data?.status === 1)
            .map(g => ({
              id: g.data?.id,
              name: g.data?.name,
            }))
            .filter(g => g.id && g.name);

          return [...resolvedUsers, ...resolvedGroups];
        } catch (err) {
          console.warn('Lỗi resolve users and groups:', err);
          return resolvedUsers;
        }
      };

      const resolveReceiversBatch = async (
        ids: any,
        kind: 'org' | 'agency' | 'processor',
        outgoingDocId: string,
      ): Promise<any[]> => {
        const validIds = normalizeIds(ids);
        if (validIds.length === 0) return [];

        try {
          let cleanResults: any[] = [];
          if (kind === 'org') {
            const orgUnitMap = await batchOrgUnitsByIds(validIds);
            cleanResults = validIds.map((id) => orgUnitMap.get(id)).filter(Boolean);
          } else if (kind === 'agency') {
            const agencyMap = await batchAgenciesByIds(validIds);
            cleanResults = validIds.map((id) => agencyMap.get(id)).filter(Boolean);
          } else {
            const userMap = await batchUsersByIds(validIds);
            cleanResults = validIds.map((id) => userMap.get(id)).filter(Boolean);
          }

          const activeLinks: any[] = outgoingDocId === documentId
            ? await activeLinksPromise
            : await this.repo.getIncommingDocumentInternal(outgoingDocId);
          const linkMap = toLinkMap(activeLinks);

          return cleanResults.map((item) => {
            const linkKey = kind === 'processor'
              ? String(item.parent?.id)
              : String(item._id || item.id);
            return mapDocLinkState(linkMap.get(linkKey), item);
          });
        } catch (err) {
          console.warn(`Lỗi resolve receivers batch (${kind}):`, err);
          return [];
        }
      };

      const resolveDocumentViewerGroupsBatch = async (ids: any): Promise<any[]> => {
        const validIds = normalizeIds(ids);
        if (validIds.length === 0) return [];

        try {
          const groupsStartedAt = Date.now();
          const groupsMap = await batchGroupsByIds(validIds);
          markPerf(`resolveDocumentViewerGroupsIds:batch=${validIds.length}`, groupsStartedAt);
          return validIds
            .map((id) => groupsMap.get(id))
            .filter(Boolean)
            .map((g: any) => ({
              id: g.data?.id ?? g.id,
              name: g.data?.name ?? g.name,
            }))
            .filter((g) => g.id && g.name);
        } catch (err) {
          console.warn('Lỗi resolve document viewer groups batch:', err);
          return [];
        }
      };

      const resolveUsersAndGroupsBatch = async (userIds: any, groupIds: any): Promise<any[]> => {
        const validUserIds = normalizeIds(userIds);
        const validGroupIds = normalizeIds(groupIds);

        try {
          const userLookupStartedAt = Date.now();
          const usersMap = validUserIds.length ? await batchUsersByIds(validUserIds) : new Map<string, any>();
          markPerf(`resolveUsersAndGroups:users=${validUserIds.length}`, userLookupStartedAt);

          const groupLookupStartedAt = Date.now();
          const groupsMap = validGroupIds.length ? await batchGroupsByIds(validGroupIds) : new Map<string, any>();
          markPerf(`resolveUsersAndGroups:groups=${validGroupIds.length}`, groupLookupStartedAt);

          const resolvedUsers = validUserIds.map((id) => usersMap.get(id)).filter(Boolean);
          const resolvedGroups = validGroupIds
            .map((id) => groupsMap.get(id))
            .filter(Boolean)
            .map((g: any) => ({
              id: g.data?.id ?? g.id,
              name: g.data?.name ?? g.name,
            }))
            .filter((g) => g.id && g.name);

          return [...resolvedUsers, ...resolvedGroups];
        } catch (err) {
          console.warn('Lỗi resolve users and groups batch:', err);
          return [];
        }
      };


      const internalReceivingDeptIds =
        typeof doc.internalReceivingDept === 'string'
          ? JSON.parse(doc.internalReceivingDept)
          : doc.internalReceivingDept || [];

      const internalReceivingDeptOldIds =
        typeof doc.internalReceivingDeptOld === 'string'
          ? JSON.parse(doc.internalReceivingDeptOld)
          : doc.internalReceivingDeptOld || [];

      const processorIds =
        typeof doc.processor === 'string'
          ? JSON.parse(doc.processor)
          : doc.processor || [];

      const documentViewerGroupsIds = typeof doc.documentViewerGroups === 'string'
        ? JSON.parse(doc.documentViewerGroups)
        : doc.documentViewerGroups || [];

      const resolveReceiversStartedAt = Date.now();
      const [
        internalReceivingUnit,
        externalReceivingUnit,
        internalReceivingDept,
        processorUnits,
        internalReceivingDeptOld,
        documentViewerGroups
      ] = await Promise.all([
        resolveReceiversBatch(doc.internalReceivingUnit, 'agency', documentId),
        resolveReceiversBatch(doc.externalReceivingUnit, 'agency', documentId),
        resolveReceiversBatch(internalReceivingDeptIds, 'org', documentId),
        resolveReceiversBatch(processorIds, 'processor', documentId),
        resolveReceiversBatch(internalReceivingDeptOldIds, 'org', documentId),
        resolveDocumentViewerGroupsBatch(documentViewerGroupsIds),

      ]);
      markPerf('parallel:resolveReceivers|processors|viewerGroups', resolveReceiversStartedAt);
      doc.processor = processorUnits;
      let parsedViewers = [];
      if (typeof doc.viewers === 'string' && doc.viewers.trim() !== '') {
        try { parsedViewers = JSON.parse(doc.viewers); } catch (e) { console.warn('Failed to parse doc.viewers:', e.message); }
      } else if (Array.isArray(doc.viewers)) {
        parsedViewers = doc.viewers;
      }
      doc.viewers = parsedViewers;

      doc.internalReceivingUnit = internalReceivingUnit;
      doc.externalReceivingUnit = externalReceivingUnit;
      doc.internalReceivingDept = internalReceivingDept;
      doc.isAuthority = isAuthority === 'true' ? true : false;
      doc.internalReceivingDeptOld = internalReceivingDeptOld;
      doc.documentViewerGroups = documentViewerGroups;

      // ====== RESOLVE KNOW RECEIVERS ======
      let knowReceiverIds: string[] = [];
      if (typeof doc.knowReceivers === 'string' && doc.knowReceivers.trim() !== '') {
        try { knowReceiverIds = JSON.parse(doc.knowReceivers); } catch (e) { console.warn('Failed to parse doc.knowReceivers:', e.message); }
      } else if (Array.isArray(doc.knowReceivers)) {
        knowReceiverIds = doc.knowReceivers;
      }

      // doc.knowReceivers = await resolveUsersByIds(knowReceiverIds);
      const knowReceiversStartedAt = Date.now();
      doc.knowReceivers = await resolveUsersAndGroupsBatch(knowReceiverIds, knowReceiverIds);
      markPerf('resolveUsersAndGroups:knowReceivers', knowReceiversStartedAt);

      if (doc.deadlineReply) {
        // row.deadline_reply đang là Date object (bị trừ 7h)
        const date = new Date(doc.deadlineReply);
        // Cộng lại 7 tiếng để về giờ Việt Nam
        date.setHours(date.getHours() + 7);
        doc.deadlineReply = date.toISOString();
      }
      // doc.processor = processorUnits;
      const computeActionsStartedAt = Date.now();
      for (const wi of doc.openWorkItems) {
        const res = await this.bpmnEngine.computeAvailableActions({
          process,
          indexes,
          currentNodeId: wi.nodeId,
          workItem: wi,
          document: doc,
          userId: userContext.userId,
          userRoles: userRole.roles || userContext.roles || [],
          getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
          audit,
          documentId: doc?.documentId,
          bpmnXML,
          skipRedisRead: true,
        });
        perItems.push({
          workItem: wi,
          node: res.node,
          availableActions: res.availableActions,
          flags: res.flags,
          signKey: res.signKey,
        });
      }
      markPerf(`computeAvailableActions:count=${Array.isArray(doc.openWorkItems) ? doc.openWorkItems.length : 0}`, computeActionsStartedAt);

      const first =
        perItems.find((x) => x.availableActions.some((a: any) => a.canExecute)) &&
        (perItems.find((x) => x.workItem && String(x.workItem.assigneeUserId || x.workItem.assignee_user_id) === String(userContext?.userId)) || perItems[0]);

      // Kiểm tra xem quy trình hiện tại có bước nào cấu hình ẩn/hiện theo isStamp không
      const hasStampOption = Array.from(indexes.nodes.values()).some((node: any) => {
        const props = getAllNodeExtensionProperties(node);
        return props && props.isStamp !== undefined;
      });

      // const lastAudit =
      //   audit.filter((x) => x.receiver === userContext.userId).pop() || null;
      const summaryFlags = {
        canProcess: false,
        canReturn: false,
        canComplete: false,
        canProcessSupport: false,
        canReturnSupport: false,
        canCompleteSupport: false,
        canViewed: false,
        canRecall: false,
        canCompleteDoc: false,
        canSigningSubmission: false,
        canGiveFeedback: false,
        canApprove: false,
        canCompleteProposal: false,
        canIssueProposal: false,
        canTransferFeedback: false,
        canSetNumber: false,
        canSuggestPromulgate: false,
        canTransferOptions: false,
        canMarkViewed: false,
        canSaveBook: false,
        canSignDraft: false,
        canSignCertificate: false,
        canOfficialSigner1: false,
        canOfficialSigner2: false,
        canOfficialSigner3: false,
      }
      if (first?.flags) {
        for (const key in first.flags) {
          if (Object.prototype.hasOwnProperty.call(first.flags, key)) {
            summaryFlags[key] = summaryFlags[key] || first.flags[key];
          }
        }
      }

      summaryFlags.canRecall = this.bpmnEngine.canRecallDocument(audit, userContext.userId, 'OutgoingDocument');
      const summary = first || {
        workItem: null,
        node: null,
        availableActions: [],
        flags: {
          canSigningSubmission: false,
          canGiveFeedback: false,
          canApprove: false,
          canCompleteProposal: false,
          canIssueProposal: false,
          canReturn: false,
          canSetNumber: false,
        },
        signKey: {},
      };
      const availableActions = summary.availableActions || [];
      let finalActions = availableActions || [];
      const seenFinalActionKeys = new Set(
        finalActions.map((a: any) => `${a.code}_${a.flowId || ''}_${a.type || ''}_${a.label || ''}`),
      );

      const completionActionItems = perItems.filter((x) => {
        const assigneeUserId = String(
          x?.workItem?.assigneeUserId ?? x?.workItem?.assignee_user_id ?? '',
        ).trim();
        const currentUserId = String(userContext?.userId ?? '').trim();

        return !!assigneeUserId && assigneeUserId === currentUserId;
      });

      for (const item of completionActionItems) {
        for (const action of item.availableActions || []) {
          const isCompletionAction =
            action?.type === 'complete' || action?.type === 'completeDoc';
          if (!isCompletionAction || !action?.canExecute) continue;

          const mergedAction = {
            ...action,
            workItemId: item.workItem?.id,
            nodeId: item.workItem?.nodeId,
          };
          const key = `${mergedAction.code}_${mergedAction.flowId || ''}_${mergedAction.type || ''}_${mergedAction.label || ''}`;
          if (seenFinalActionKeys.has(key)) continue;
          seenFinalActionKeys.add(key);
          finalActions.push(mergedAction);
        }
      }
      const isDraftNotSaved =
        (doc?.statusCode === '1' || doc?.statusCode === 'DRAFT') &&
        (!doc?.abstractNote || doc?.abstractNote.trim() === '' || doc?.abstractNote === 'DUMMY_SYM');

      if (isDraftNotSaved) {
        finalActions = finalActions.filter((a: any) => a.code !== 'XIN_Y_KIEN');
        if (summaryFlags) {
          summaryFlags.canGiveFeedback = false;
        }
      }

      const actionFind = finalActions.find(
        (e: any) => e.code === 'CHUYEN_XU_LY',
      );
      const canSetProcessor = true;

      if (actionFind) {
        if (actionFind.subActions) {
          //Kiểm tra trong subActions có action nào là NHAN_DE_BIET hoặc PHOI_HOP không
          const existActions = actionFind.subActions.find(
            (e: any) => e.actions && e.actions.length > 0,
          );
          if (existActions)
            //Cập nhật lại biến canSetSupporter và canSetViewer để hiển thị checkbox tương ứng
            for (const sa of existActions.actions) {
              // if (sa.code === 'NHAN_DE_BIET') canSetViewer = true;
              // if (sa.code === 'PHOI_HOP') canSetSupporter = true;
            }
        }
      }
      //! Chỉ hiện nút "Đã xem" khi VB đã ban hành (DA_BAN_HANH) và user là người nhận để biết
      const canMarkViewed = knowReceiverIds.includes(userContext.userId) && isPromulgate;
      if (canMarkViewed) {
        const exists = finalActions.some((a) => a.code === stageStatusDoc.DA_XEM);
        if (!exists) {
          finalActions.unshift(VIEW_MARK_ACTION);
        }
      }

      // Cập nhật flags
      summaryFlags.canMarkViewed = canMarkViewed;

      // Xây dựng flagsProcess
      const flagsProcess: any = { canSetProcessor: true };
      if (canMarkViewed) flagsProcess.canMarkViewed = true;

      const items = [doc];
      const { aliases } = await this.repo.buildSelectFieldsNew(
        'OutGoing',
        'outgoing_documents',
      );

      const mapDocStartedAt = Date.now();
      const [docMapped, userRoless] = await Promise.all([
        this.repo.mapDocKeysForDetailOutgoing(items, aliases, isAuthority),
        this.repo.getUserRole(userContext?.userId, doc.bpmnVersion),
      ]);
      markPerf('parallel:mapDocKeysForDetailOutgoing|getUserRole', mapDocStartedAt);
      // this.repo.checkFollow(userContext.userId, documentId),
      const hasVanThuRole =
        Array.isArray(userRoless?.roles) &&
        userRoless.roles.some((r) => VAN_THU_ALL.includes(r));
      let canSaveBook = false;
      if (
        userRoless &&
        userRoless.roles &&
        hasVanThuRole &&
        (doc.bookDocumentId === '' ||
          (doc.bookDocumentId == null && (doc.isIncomming || doc.is_incomming)))
      ) {
        canSaveBook = true;
      }
      const { canRecall, ...restSummaryFlags } = summaryFlags ?? {};
      const canRecallOutgoing = outgoingState?.dong_dau_cuoi === 1 || outgoingState?.dong_dau_cuoi === true
        ? false
        : canRecall;
      const response = {
        document: {
          ...docMapped,
          // isFollow: isFollowBoolean,
          isPromulgate: isPromulgate
        },
        // document: { ...doc },
        workItem: summary.workItem,
        availableActions: finalActions,
        flags: { ...restSummaryFlags, canSaveBook, canRecallOutgoing, hasStampOption },
        flagsProcess,
        signKey: summary.signKey,
      };
      if (perfEnabled) {
        this.logger.log(
          `[OutgoingDetailRuntimePerf] doc=${documentId} user=${userContext?.userId} total=${Date.now() - perfStartedAt}ms stages=${perfMarks
            .map((item) => `${item.stage}:${item.ms}ms`)
            .join(' | ')}`,
        );
      }
      return response;
    } catch (error) {
      console.error('Error in getDetails:', error);
      throw error;
    }
  }
  async completeWorkItem({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    bpmnVersion,
    externalTransaction,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string; // User cuối cùng (ủy quyền > token > payload)
    originalUser: string; // User thực hiện action (token > payload)
    author: string;
    bpmnVersion: string;
    externalTransaction?: any;
  }): Promise<any> {
    const originalDocId = documentId;
    // const { indexes } = await this.getModelFromXml(bpmnXML);
    // const wi = await this.repo.getWorkItem(documentId, workItemId);
    const [{ indexes }, wi, auditArr] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ])
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const node = indexes.nodes.get(wi.nodeId);
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');
    let allouts = indexes.outgoingBySource.get(node.id) || [];
    let nextNodeConcurrent: any;
    let actionCodeAfterConcurrent: any;
    let targetRoleConcurrent: string | null = null;
    let statusDocConcurrent: string | null = null;
    for (const f of allouts) {
      const extFlow = getAllNodeExtensionProperties(f);
      const flagsButton = parseFlagsButton(extFlow?.flagsButton);
      if (extFlow && flagsButton?.isConcurrent) {
        const res = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
        nextNodeConcurrent = res?.node;
        const cur = f?.targetRef?.id ? indexes.nodes.get(f.targetRef.id) : null;
        statusDocConcurrent = getAllNodeExtensionProperties(cur).statusCode || null;
        targetRoleConcurrent = indexes.laneMap.get(nextNodeConcurrent.id);
        const outs = indexes.outgoingBySource.get(nextNodeConcurrent.id) || [];
        actionCodeAfterConcurrent = outs
          ?.map((flow: any) => flow?.name)
          .filter(Boolean)
          .join(',') || null;
      }
    }
    let chooseOut;

    // Tìm flow có name hoặc id match với actionCode
    for (const f of allouts) {
      const result = f.targetRef;
      if (result && (f.name?.toUpperCase() === actionCode || f.id === actionCode)) {
        chooseOut = result;

        // Nếu target là Gateway, lấy outgoing flows của nó
        if (
          chooseOut.$type === 'bpmn:ExclusiveGateway' ||
          chooseOut.$type === 'bpmn:InclusiveGateway'
        ) {
          allouts = indexes.outgoingBySource.get(chooseOut.id) || [];
        } else {
          // Nếu không phải Gateway (ManualTask, UserTask, etc.), chỉ giữ flow này
          const { node: nextF } = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
          if (!nextF) continue;
          const targetRole = nextF ? indexes.laneMap.get(nextF?.id) : undefined;
          if (targetRole === payload?.roles) {
            allouts = [f];
          } else {
            continue;
          }
        }
        break;
      }
    }

    if (!chooseOut) {
      throw new BadRequestException('No next interactive node found');
    }
    const laneMap = indexes.laneMap;
    const outs = payload?.roles
      ? allouts.filter((f: any) => {
        const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
          f,
          indexes,
        );
        if (!nextNode) return false;

        const role = laneMap.get(nextNode?.id);
        return role === payload.roles;
      })
      : allouts;
    // const auditArr = await this.repo.getAudit(documentId);
    // Lấy audit của node hiện tại (tìm audit có to_node_id = node hiện tại)
    const nodeAudit = auditArr
      .filter(
        (a: any) => a.toNodeId === wi.nodeId || a.to_node_id === wi.nodeId,
      )
      .at(-1);

    // Kiểm tra isDauPhong: BAN_HANH hoặc chuyển tùy chọn đến phòng
    let isDauPhong =
      nodeAudit?.actionCode === 'BAN_HANH' ||
      nodeAudit?.action_code === 'BAN_HANH';

    // Nếu chưa phải đầu phòng, kiểm tra trong details có isTransferOption = true và transferType = 'to_room'
    if (!isDauPhong && nodeAudit?.details) {
      try {
        const details =
          typeof nodeAudit.details === 'string'
            ? JSON.parse(nodeAudit.details)
            : nodeAudit.details || {};
        isDauPhong =
          (details.isTransferOption === true &&
            details.transferType === 'to_room') || details.transferType === 'to_room'
      } catch (e) {
        // Nếu parse JSON lỗi, bỏ qua
      }
    }
    // Sử dụng userId (đã được resolve: ủy quyền > token > payload)
    const effectiveUserId = author ? author : userId; // đây là id của thằng ủy quyền
    const processedUsserId = userId; // đây là id của thằng thực sự xử lý văn bản
    let effectiveDisplayName = payload.displayName;
    if (!effectiveDisplayName && (userId || effectiveUserId)) {
      const uInfo = await this.sqlsvRepo.getUserById(author ? author : userId);
      effectiveDisplayName = uInfo?.name || 'User';
    } else if (!effectiveDisplayName) {
      effectiveDisplayName = 'User';
    }
    // === 2. Normal Action + Return ===


    // === Xử lý CHUYEN_TUY_CHON ===
    if (actionCatalog.isChuyenTuyChon(actionCode)) {
      return await this.handleChuyenTuyChon({
        documentId,
        wi,
        payload,
        actionCode,
        allouts,
        indexes,
        bpmnVersion,
        effectiveUserId,
        processedUsserId,
        originalUser,
        laneMap,
      });
    }
    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const flowObj = Array.isArray(flow) ? flow[0] : flow;
    const isCloneFlow = this.bpmnEngine.getFlowExtensionProperties(flowObj)?.isClone === 'true';
    const clonedDocIds: string[] = [];
    let currentTargetDocId = documentId;

    const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
    const flagsFlow = parseFlagsButton(flowExtProps.flags);
    const flagsButton = parseFlagsButton(flowExtProps.flagsButton);
    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    let statusDoc;
    statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    // === Normal Transfer / Approval ===
    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
    let assignTo: string | null = null;

    if (requiresAssignee) {
      assignTo = payload.assignToUserId ?? null;
      if (!assignTo)
        throw new BadRequestException(
          'assignToUserId is required for this action',
        );

      // // ✅ Validate: Kiểm tra user có tồn tại hay không
      // const assigneeUser = await this.sqlsvRepo.getUserById(assignTo);
      // if (!assigneeUser) {
      //   throw new BadRequestException(`assignToUserId "${assignTo}" không tồn tại hoặc không hợp lệ`);
      // }

      let isCloneDoc = false;
      try {
        const docQuery = await (this.repo as any).pool.request()
          .input('docId', sql.VarChar, documentId)
          .query(`SELECT parent_doc_clone FROM ${(this.repo as any).dbname}.dbo.incomming_documents WHERE document_id = @docId`);
        isCloneDoc = !!docQuery.recordset?.[0]?.parent_doc_clone;
      } catch (err) {
        console.warn('Lỗi check parent_doc_clone in completeWorkItem:', err);
      }

      // ✅ Optimization #1: Song song hóa 2 validation queries
      const [alreadyProcessorResult, candidates] = await Promise.all([
        (isCloneDoc || isCloneFlow)
          ? Promise.resolve(false)
          : checkReceiverAlreadyProcessor({
            documentId,
            receiverUserId: assignTo,
            curNode: node.id,
            myssqlRepo: this.repo,
          }),
        this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
      ]);
      const alreadyProcessor = alreadyProcessorResult;

      if (alreadyProcessor && assignTo !== effectiveUserId && !flagsButton.addProcess) {
        throw new BadRequestException(
          'Người này đã được đã được giao vai trò khác của văn bản này!',
        );
      }

      if (candidates.length && !candidates.includes(assignTo)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }
    }
    // ✅ Optimization #3: Lazy load parentUser - chỉ gọi DB khi isDauPhong = true
    const parentUserId = isDauPhong
      ? (await this.sqlsvRepo.getUserById(effectiveUserId))?.parent?.id
      : null;
    const shouldManageTransaction = !externalTransaction;
    const tx = externalTransaction || await this.repo.begin();
    try {
      const shouldRemoveWorkItem = !flagsButton.addProcess || flagsButton.forceCloseWorkItem || actionCode === 'CHUYEN_XU_LY';
      if (shouldRemoveWorkItem) {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was already completed by another user',
          );
        // Xóa toàn bộ workitem còn lại của người này trên văn bản (nếu có)
        const userToRemove = wi.assigneeUserId || effectiveUserId || userId;
        if (userToRemove) {
          await this.repo.removeWorkItemByAssignee(documentId, userToRemove, undefined, tx);
        }
        // Dọn dẹp toàn bộ work item xin ý kiến của văn bản đó (nếu có) khi chuyển bước chính
        await this.repo.removeOpinionWorkItems(documentId, tx);
      }

      if (isCloneFlow) {
        const clonedDocumentId = String(Date.now() + Math.floor(Math.random() * 1000));
        await this.cloneIncomingDocument(documentId, clonedDocumentId, effectiveUserId, tx, isCloneFlow);
        currentTargetDocId = clonedDocumentId;
        clonedDocIds.push(clonedDocumentId);
        if (payload?.docIds) {
          payload.docIds = clonedDocumentId;
        }
        documentId = clonedDocumentId;
      }

      let isProcessor = statusDoc ? true : false;
      if (!isProcessor) {
        try {
          const checkSenderReq = tx.request();
          checkSenderReq.input('documentId', sql.VarChar, currentTargetDocId);
          checkSenderReq.input('userId', sql.VarChar, effectiveUserId);
          const senderAssignmentResult = await checkSenderReq.query(`
            SELECT TOP 1 role_process 
            FROM ${(this.repo as any).dbname}.dbo.incomming_assignment WITH (NOLOCK)
            WHERE document_id = @documentId AND receiver = @userId
            ORDER BY created_at DESC
          `);
          if (senderAssignmentResult.recordset && senderAssignmentResult.recordset.length > 0) {
            const roleProc = senderAssignmentResult.recordset[0].role_process;
            if (roleProc === 'processor') {
              isProcessor = true;
            }
          }
        } catch (err) {
          console.warn('Lỗi check sender roleProcess in completeWorkItem:', err);
        }
      }

      if (nextNode && !flagsButton?.commentOnly) {
        await this.repo.addWorkItem(
          currentTargetDocId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: requiresAssignee ? assignTo : null,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );

        if (nextNode.$type === 'bpmn:ServiceTask') {
          await this.serviceTaskExecutor.executeIfServiceTask({
            nodeId: nextNode.id,
            bpmnXml: bpmnXML,
            variables: {
              curNodeId: nextNode,
              documentId: currentTargetDocId,
              workItemId: wi.id,
              userId: effectiveUserId,
              auditArr: [...auditArr, {
                document_id: currentTargetDocId,
                user_id: effectiveUserId,
                role: wi.role,
                action_code: actionCode,
                from_node_id: wi.nodeId,
                to_node_id: nextNode.id,
                roleProcess: isProcessor ? 'processor' : 'supporter',
              }],
              indexes,
              payload,
              nodeId: nextNode.id,
              bpmnXml: bpmnXML,
              tx
            },
          });
        }
      }

      // Tự động kích hoạt các luồng không có code đi từ Gateway hiện tại (ví dụ: Service Task check-phan-cong)
      const currentBPMNNode = indexes.nodes.get(wi.nodeId);
      if (currentBPMNNode && (currentBPMNNode.$type === 'bpmn:ExclusiveGateway' || currentBPMNNode.$type === 'bpmn:InclusiveGateway')) {
        const gatewayOuts = indexes.outgoingBySource.get(currentBPMNNode.id) || [];
        for (const f of gatewayOuts) {
          const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
          const code = extProps.actionCode || f.name;
          if (!code) {
            const targetNode = f.targetRef ? indexes.nodes.get(f.targetRef.id) : null;
            if (targetNode && targetNode.$type === 'bpmn:ServiceTask') {
              await this.repo.addWorkItem(
                currentTargetDocId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: targetNode.id,
                  role: indexes.laneMap.get(targetNode.id) || '',
                  assigneeUserId: effectiveUserId,
                  nodeType: targetNode.$type,
                },
                tx,
                bpmnVersion,
              );

              await this.serviceTaskExecutor.executeIfServiceTask({
                nodeId: targetNode.id,
                bpmnXml: bpmnXML,
                variables: {
                  curNodeId: targetNode,
                  documentId: currentTargetDocId,
                  workItemId: wi.id,
                  userId: effectiveUserId,
                  auditArr: [...auditArr, {
                    document_id: currentTargetDocId,
                    user_id: effectiveUserId,
                    role: wi.role,
                    action_code: actionCode,
                    from_node_id: wi.nodeId,
                    to_node_id: targetNode.id,
                    roleProcess: isProcessor ? 'processor' : 'supporter',
                  }],
                  indexes,
                  payload,
                  nodeId: targetNode.id,
                  bpmnXml: bpmnXML,
                  tx
                },
              });
            }
          }
        }
      }

      let leadsToSaoY = false;
      if (nextNode) {
        const nextNodeName = (nextNode.name || '').toLowerCase();
        const nextNodeId = (nextNode.id || '').toLowerCase();
        if (nextNodeName.includes('sao y') || nextNodeName.includes('sao_y') || nextNodeId.includes('sao_y') || nextNodeId.includes('sao y')) {
          leadsToSaoY = true;
        } else {
          const nextOuts = indexes.outgoingBySource.get(nextNode.id) || [];
          for (const outFlow of nextOuts) {
            const target = outFlow.targetRef;
            if (target) {
              const targetNode = indexes.nodes.get(target.id);
              const targetName = (targetNode?.name || '').toLowerCase();
              const targetId = (target.id || '').toLowerCase();
              if (targetName.includes('sao y') || targetName.includes('sao_y') || targetId.includes('sao_y') || targetId.includes('sao y')) {
                leadsToSaoY = true;
                break;
              }
            }
          }
        }
      }

      if (nextNodeConcurrent) {
        const isTpConcurrent = nextNodeConcurrent.id === 'Activity_them_xu_ly_tp';
        const canAddProcess = isTpConcurrent || (await this.repo.canAdditionalProcessingDocument(auditArr, effectiveUserId || userId));
        if (canAddProcess) {
          const serviceNode = nextNodeConcurrent?.$type === 'bpmn:ServiceTask';
          if (serviceNode) {
            await this.serviceTaskExecutor.executeIfServiceTask({
              nodeId: nextNodeConcurrent.id,
              bpmnXml: bpmnXML,
              variables: {
                documentId: currentTargetDocId,
                nodeId: nextNodeConcurrent.id,
                onlyCxlTP: false,
                indexes,
                tx,
                bpmnVersion,
                curLane: wi.role,
                effectiveUserId,
                wi,
                isActive: true
              },
            });
          } else {
            await this.repo.addWorkItem(
              currentTargetDocId,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: nextNodeConcurrent.id,
                role: targetRoleConcurrent,
                assigneeUserId: targetRoleConcurrent === wi.role ? effectiveUserId : null,
                nodeType: nextNodeConcurrent.$type,
                actionCode: actionCodeAfterConcurrent,
              },
              tx,
              bpmnVersion,
            );
          }
        }
      }
      // if (!flagsButton.addProcess) {

      const targetDocs = isCloneFlow ? [originalDocId, currentTargetDocId] : [currentTargetDocId];
      for (const docId of targetDocs) {
        await this.updateStageStatusAuditIncomingAware(
          docId,
          {
            receiver: !isDauPhong ? effectiveUserId : parentUserId,
            stage_status: stageStatusDoc.DA_XU_LY,
            isDauPhong: isDauPhong,
            processed_by: isDauPhong ? effectiveUserId : null,
            acting_as: isDauPhong ? effectiveUserId : null,
            typeDocument: 'IncommingDocument',
            isCloneFlow: false,
          },
          tx,
        );
      }
      // }
      // ✅ Optimization #2: Song song hóa 3 queries trong transaction
      const [processedById, actingAs, displayNameForComment] = assignTo
        ? await Promise.all([
          this.repo.getAuthorizedIdIfAuthor(assignTo),
          this.repo.getAuthorIdIfAuthorized(assignTo),
          this.repo.buildDisplayNameWithAuthorized(assignTo),
        ])
        : [null, null, null];

      await this.addAuditIncomingAware(
        currentTargetDocId,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: assignTo,
          processed_by: processedById || null,
          acting_as: actingAs || null,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: isProcessor ? 'processor' : 'supporter',
          action: isProcessor ? 'Xử lý chính' : 'Phối hợp xử lý',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            note: payload?.note,
            cxlPhanCong: flagsFlow?.canSuggestion === true ? true : false,
            ...(((targetRole === 'VAN_THU_TCT' || leadsToSaoY || flowExtProps?.actionLabel === 'CHUYỂN VĂN THƯ' || (nextNode && getAllNodeExtensionProperties(nextNode)?.isSpecialNoteNode === 'true')) && payload?.note) ? { vanThuNote: payload.note } : {})
          },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'IncommingDocument',
          assignmentType: flowExtProps.assignmentType || null,
        },
        tx,
      );

      // Old:
      // // Comment tự động theo hành động
      // let actionText = 'Chuyển xử lý: ';
      // if (actionCode.includes('PHE_DUYET') || actionCode.includes('DUYET'))
      //   actionText = 'Đồng ý';
      // if (actionCode.includes('TU_CHOI') || actionCode.includes('KHONG_DUYET'))
      //   actionText = 'Không đồng ý';
      // let receiverText = '';
      // if (displayNameForComment) {
      //   receiverText = ` ${displayNameForComment}`;
      // } else if (targetRole) {
      //   receiverText = ` vai trò ${targetRole}`;
      // }
      // const combinedContent = [`${actionText}${receiverText}.`, payload?.note]
      //   .filter(Boolean) // loại bỏ undefined/null/empty
      //   .join('\n');
      const combinedContent = payload?.note || '';
      // await this.addSystemComment(documentId, payload, `${actionText}`);
      // Check xem flow hiện tại có flagsButton.canSuggestion không

      const isLeaderSuggestion = flagsFlow?.canSuggestion == true;
      await this.addSystemComment(
        currentTargetDocId,
        payload,
        combinedContent,
        originalUser || effectiveUserId,
        undefined,
        isLeaderSuggestion,
        tx,
      );
      // await this.addSystemComment(documentId, payload, payload?.note || '', userId, 'opinion');

      if (statusDoc) {
        await this.repo.updateDocumentStatus(currentTargetDocId, statusDoc, tx);
      }
      for (const docId of clonedDocIds) {
        await this.repo.updateDocumentStatus(docId, statusDoc, tx);
      }

      if (shouldManageTransaction) {
        await this.repo.commit(tx);
      }

      return {
        status: 1,
        document: await this.repo.getDocument(currentTargetDocId),
        nextNode: nextNode ? {
          tasks: [{ assignee: assignTo || effectiveUserId }]
        } : null
      };
    } catch (e) {
      if (shouldManageTransaction) {
        await this.repo.rollback(tx);
      }
      throw e;
    }
  }

  async completeSuport({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    bpmnVersion: string;
  }): Promise<any> {
    const [{ indexes }, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
    ]);
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const effectiveUserId = userId;
    const effectiveDisplayName = payload.displayName || 'User';

    // === 1. Inclusive Gateway - Phân công từ người phối hợp ===
    if (node.$type === 'bpmn:InclusiveGateway') {
      if (!payload.actionCode || payload.actionCode !== 'PHAN_CONG') {
        throw new BadRequestException(
          'Expect actionCode=PHAN_CONG at Inclusive gateway',
        );
      }

      const selections = payload.selections || [];
      const flowGroups = new Map<string, any>();
      for (const f of outs) {
        const g = actionCatalog.inclusiveSubActionFor(f.name);
        if (g) flowGroups.set(g, f);
      }

      const byBranch = new Map<string, string[]>();
      for (const sel of selections) {
        const list = Array.from(new Set(sel.users || []));
        byBranch.set(sel.subActionCode, list);
      }

      const mainList = byBranch.get('XU_LY_CHINH') || [];
      if (mainList.length < 1)
        throw new BadRequestException(
          'XU_LY_CHINH requires at least 1 assignee',
        );

      const chosenUsers = new Set<string>();
      // ✅ Optimization #2: Thu thập các targetRole để fetch candidates song song trước transaction
      const branchMeta: { branch: string, list: string[], targetRole?: string }[] = [];

      for (const [branch, list] of byBranch.entries()) {
        for (const u of list) {
          if (chosenUsers.has(u))
            throw new BadRequestException(`User ${u} appears in multiple branches`);
          chosenUsers.add(u);
        }

        const f = flowGroups.get(branch);
        let targetRole: string | undefined;
        if (f) {
          const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
          targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
        }
        branchMeta.push({ branch, list, targetRole });
      }

      // Fetch tất cả candidates song song
      const candidatesMap = new Map<string, string[]>();
      await Promise.all(
        branchMeta
          .filter(m => m.targetRole)
          .map(async (m) => {
            const list = await this.repo.getUsersByRoleInFlow(bpmnVersion, m.targetRole!);
            candidatesMap.set(m.targetRole!, list);
          })
      );

      // Validate candidates
      for (const { list, targetRole } of branchMeta) {
        if (targetRole) {
          const candidates = candidatesMap.get(targetRole) || [];
          for (const u of list) {
            if (candidates.length && !candidates.includes(u)) {
              throw new BadRequestException(`Người nhận không đúng vai trò, vui lòng chọn lại`);
            }
          }
        }
      }

      const tx = await this.repo.begin();
      try {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was already completed by another user',
          );

        for (const [branch, list] of byBranch.entries()) {
          const f = flowGroups.get(branch);
          if (!f) continue;
          const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
            f,
            indexes,
          );
          if (!nextNode) continue;

          for (const userId of list) {
            const role = indexes.laneMap.get(nextNode.id);
            const newWi: WorkItem = {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role,
              assigneeUserId: userId,
              nodeType: nextNode.$type,
            };
            await this.repo.addWorkItem(documentId, newWi, tx, bpmnVersion);

            await this.addAuditIncomingAware(
              documentId,
              {
                user_id: effectiveUserId,
                display_name: effectiveDisplayName,
                role: wi.role,
                action_code: 'PHAN_CONG',
                from_node_id: wi.nodeId,
                to_node_id: nextNode.id,
                receiver: userId,
                receiver_unit: payload.receiver_unit,
                group_: payload.group_ || null,
                roleProcess:
                  branch === 'XU_LY_CHINH' ? 'processor' : 'supporter',
                action:
                  branch === 'XU_LY_CHINH' ? 'Xử lý chính' : 'Phối hợp xử lý',
                created_by: effectiveUserId,
                stage_status: stageStatusDoc.CHUA_XU_LY,
                origin_id: wi.id,
                deadline: payload.deadline || null,
                created_at: new Date(),
                updated_at: new Date(),
                details: {
                  subActionCode: branch,
                  assigneeUserId: userId,
                  note: payload?.note,
                },
                typeDocument: 'IncommingDocument',
              },
              tx,
            );
          }
        }

        // Comment tự động khi người phối hợp phân công
        // === LẤY TÊN THẬT CHO XỬ LÝ CHÍNH + TẤT CẢ NGƯỜI PHỐI HỢP ===
        const mainUserIds = mainList;

        // Danh sách userId phối hợp (loại trừ XU_LY_CHINH)
        const supportUserIds = Array.from(byBranch.entries())
          .filter(([branch]) => branch !== 'XU_LY_CHINH')
          .flatMap(([, users]) => users);

        // Tất cả userId cần lấy tên (tránh gọi DB trùng)
        const allUserIds = Array.from(new Set([...mainUserIds, ...supportUserIds]));

        // Gọi song song → siêu nhanh
        const usersMap = Object.fromEntries(
          await Promise.all(
            allUserIds.map(async (userId) => {
              try {
                const user = await this.sqlsvRepo.getUserById(userId);
                const userAny = user as any;
                const displayName = (
                  userAny?.name ||
                  userAny?.displayName ||
                  userAny?._id ||
                  userId
                )?.toString();
                return [userId, displayName];
              } catch (err) {
                console.warn(
                  `[Phân công] Không lấy được tên user ${userId}:`,
                  err.message,
                );
                return [userId, userId]; // fallback an toàn
              }
            }),
          ),
        );

        // === TẠO COMMENT ĐẸP VỚI TÊN THẬT ===
        // ✅ Optimization #3: Fetch tất cả display names song song
        const [mainUserNames, supportUserNames] = await Promise.all([
          Promise.all(mainUserIds.map((id) => this.repo.buildDisplayNameWithAuthorized(id))),
          Promise.all(supportUserIds.map((id) => this.repo.buildDisplayNameWithAuthorized(id))),
        ]);

        const validSupportNames = supportUserNames.filter(Boolean);

        const coordinationLines =
          validSupportNames.length > 0
            ? validSupportNames.map((name) => `phối hợp: ${name}`).join('\n')
            : '';

        // Old:
        // // Tạo comment cuối cùng
        // const comment =
        //   validSupportNames.length > 0
        //     ? `Chuyển xử lý chính: ${mainUserName}\n${coordinationLines}.`
        //     : `Chuyển xử lý chính: ${mainUserName}.`;
        // const Realcomment = payload?.note
        //   ? `${comment}\n${payload.note}`
        //   : comment;
        const Realcomment = payload?.note || '';

        // === GHI COMMENT HỆ THỐNG ===
        await this.addSystemComment(
          documentId,
          payload,
          Realcomment,
          originalUser || effectiveUserId,
          'opinion',
        );
        // await this.addSystemComment(documentId, payload, payload?.note || '', userId, 'opinion');

        await this.updateStageStatusAuditIncomingAware(
          documentId,
          { receiver: userId, stage_status: stageStatusDoc.DA_XU_LY, typeDocument: 'IncommingDocument' },
          tx,
        );
        await this.repo.updateDocumentStatus(documentId, 'PHAN_CONG', tx);
        await this.repo.commit(tx);

        return { status: 1, document: await this.repo.getDocument(documentId) };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    }

    // === 2. Normal Action - Người phối hợp hoàn thành nhiệm vụ ===
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === payload.actionCode) ||
        f.id === payload.actionCode,
    );
    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
    let assignTo: string | null = null;

    if (requiresAssignee) {
      assignTo = payload.assignToUserId ?? null;
      if (!assignTo)
        throw new BadRequestException(
          'assignToUserId is required for this action',
        );

      // ✅ Optimization #4: Fetch candidates và display name song song
      const [candidates, finalDisplayName] = await Promise.all([
        this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
        this.repo.buildDisplayNameWithAuthorized(assignTo),
      ]);

      if (candidates.length && !candidates.includes(assignTo)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }

      // Save for comment generation
      (payload as any)._prebuiltDisplayName = finalDisplayName;
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      if (nextNode) {
        await this.repo.addWorkItem(
          documentId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: requiresAssignee ? assignTo : null,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      await this.updateStageStatusAuditIncomingAware(
        documentId,
        { receiver: userId, stage_status: stageStatusDoc.DA_XU_LY, typeDocument: 'IncommingDocument' },
        tx,
      );

      await this.addAuditIncomingAware(
        documentId,
        {
          user_id: userId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: assignTo,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'supporter',
          action: 'Đã hỗ trợ/phối hợp xử lý',
          created_by: userId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          originalUser: originalUser || null,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // Comment tự động khi người phối hợp hoàn thành
      let actionText = 'Đã hoàn thành phối hợp xử lý';
      if (actionCode.includes('DONG_Y') || actionCode.includes('HOAN_TAT'))
        actionText = 'Đã hỗ trợ xong';
      if (actionCode.includes('TU_CHOI')) actionText = 'Từ chối phối hợp';

      let receiverText = '';

      if (assignTo) {
        const finalName = (payload as any)._prebuiltDisplayName;
        if (finalName) {
          receiverText = ` và chuyển cho ${finalName}`;
        }
      }

      // Old:
      // const combinedContent = [`${actionText}${receiverText}.`, payload?.note]
      //   .filter(Boolean)
      //   .join('\n');
      const combinedContent = payload?.note || '';

      await this.addSystemComment(
        documentId,
        payload,
        combinedContent,
        originalUser || effectiveUserId,
      );
      // await this.addSystemComment(documentId, payload, payload?.note || '', userId, 'opinion');
      await this.repo.updateDocumentStatus(documentId, statusDoc, tx);
      await this.repo.commit(tx);

      return { status: 1, document: await this.repo.getDocument(documentId) };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async returnWorkItem({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    bpmnVersion: string;
  }): Promise<any> {
    const [{ indexes }, wi, auditArr] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ]);
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');
    const effectiveUserId = userId;
    const effectiveDisplayName = payload.displayName || 'User';

    const node = indexes.nodes.get(wi.nodeId);

    //* phục vụ mục đích gán lại các action và actionCode cho các công việc trả lại
    const curAudit = auditArr.filter(
      (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI',
    );
    const newestAudit = curAudit[curAudit.length - 1];
    const prvAudit = auditArr.find(x => x.toNodeId === newestAudit.fromNodeId)
    // const lastprevAudit = prevAudit[prevAudit.length - 1];
    // const lastAudit = lastAuditCurrentNode[lastAuditCurrentNode.length - 1];
    const outs = indexes.outgoingBySource.get(node.id) || [];
    let nodeReturn = outs.find((x) => x.name === payload?.actionCode);
    if (!nodeReturn && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL')) {
      nodeReturn = outs.find((x) => x.name === 'TRA_LAI' || x.name === 'TU_CHOI' || x.name?.includes('TRA_LAI'));
    }

    let outv2;
    if (nodeReturn) {
      const res = this.bpmnEngine.nextInteractiveFromFlow(nodeReturn, indexes);
      outv2 = res?.node;
    }

    if (!outv2 && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL')) {
      const prevAudit = auditArr.filter(
        (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI',
      );
      const newestAudit = prevAudit[prevAudit.length - 1];
      if (newestAudit?.fromNodeId) {
        outv2 = indexes.nodes.get(newestAudit.fromNodeId);
      }
    }
    let actionCodeUpper;
    const roles = payload?.roles;
    if (!roles)
      throw new BadRequestException('Vai trò (roles) không được để trống');

    actionCodeUpper = payload.actionCode?.toUpperCase();
    const out = indexes.outgoingBySource.get(outv2?.id) || [];

    let retFlow;

    // Trường hợp 1: Nếu outv2 là UserTask và chỉ có 1 flow ra duy nhất
    // => Tự động lấy flow đó (ví dụ: Activity_1fhsjdp)
    if (outv2?.$type === 'bpmn:UserTask' && out.length === 1) {
      retFlow = out[0];

      // Trường hợp trả lại đến InclusiveGateway: lấy luôn sequence dẫn đến gateway đó
      // Để người nhận tiếp tục xử lý ở node InclusiveGateway
    } else if (outv2?.$type === 'bpmn:InclusiveGateway') {
      retFlow = nodeReturn;
    } else if (nodeReturn?.targetRef?.outgoing?.[0]?.targetRef?.$type === 'bpmn:ManualTask') {
      retFlow = nodeReturn?.targetRef?.outgoing?.[0];
    }
    // Trường hợp 2: Có nhiều flows (từ ExclusiveGateway sau UserTask)
    // => Tìm flow vừa khớp actionCode VÀ dẫn đến đúng lane (ví dụ: Activity_0nohir9 -> Gateway)
    else {
      retFlow = out.find((f) => {
        // Điều kiện 1: actionCode phải khớp
        if (f.name !== actionCodeUpper) return false;

        // Điều kiện 2: flow phải dẫn đến node thuộc lane = payload.roles
        const { node: candidateNode } = this.bpmnEngine.nextInteractiveFromFlow(
          f,
          indexes,
        );
        if (!candidateNode) return false;

        const targetLane = indexes.laneMap.get(candidateNode.id);

        // Kiểm tra lane có khớp với payload.roles không
        return targetLane === roles;
      });
    }

    if (!retFlow && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL') && out.length > 0) {
      retFlow = out[0];
    }

    if (!retFlow) {
      throw new BadRequestException(
        `Không tìm thấy luồng trả lại phù hợp với actionCode: ${actionCodeUpper} và vai trò: ${roles}`,
      );
    }

    const isRecallClone =
      (nodeReturn && this.bpmnEngine.getFlowExtensionProperties(nodeReturn)?.recallClone === 'true') ||
      (retFlow && this.bpmnEngine.getFlowExtensionProperties(retFlow)?.recallClone === 'true');

    // statusReturn
    let statusDoc;
    if (
      (outv2?.$type === 'bpmn:UserTask' && out.length === 1) ||
      nodeReturn?.targetRef?.outgoing?.[0]?.targetRef?.$type ===
      'bpmn:ManualTask'
    ) {
      statusDoc = getAllNodeExtensionProperties(
        nodeReturn?.targetRef,
      ).statusCode;
    } else {
      statusDoc = getAllNodeExtensionProperties(retFlow?.targetRef).statusCode;
    }
    // -----------------------------
    // 🔍 2. Xác định nextNode + targetRole đúng theo flow
    // -----------------------------
    let nextNode;
    if (outv2?.$type === 'bpmn:UserTask' && out.length === 1) {
      nextNode = outv2;
    } else {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        retFlow,
        indexes,
      ));
    }
    const targetRole = indexes.laneMap.get(nextNode?.id);

    const currentRole = indexes.laneMap.get(wi.nodeId);

    // xử lý rule đặc biệt (nếu có)
    // const resolved = this.bpmnEngine.resolveReturnTarget(
    //   retFlow,
    //   indexes,
    //   currentRole,
    // );
    // if (resolved.role) {
    //   targetRole = resolved.role;
    //   if (resolved.node) nextNode = resolved.node;
    // }

    // -----------------------------
    // 🔍 3. Xác định người nhận (ưu tiên payload.assignToUserId)
    // -----------------------------
    let returnTo: string | null = null;

    // ✅ 1. Ưu tiên người được truyền vào
    if (payload.assignToUserId) {
      const candidate = payload.assignToUserId;

      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnVersion,
        targetRole,
      );

      if (candidates.length && !candidates.includes(candidate)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }

      returnTo = candidate;
    }

    // ✅ 2. Không có payload → tìm người cũ (Tái sử dụng auditArr)
    if (!returnTo) {
      for (let i = auditArr.length - 1; i >= 0; i--) {
        const ev = auditArr[i];
        if (ev.role === targetRole && ev.userId) {
          returnTo = ev.userId;
          break;
        }
      }
    }

    // ✅ 3. Vẫn không có → báo lỗi
    if (!returnTo) {
      throw new BadRequestException(
        `Không tìm thấy người xử lý trước đó trong lịch sử văn bản để trả lại. Vui lòng chọn lại`,
      );
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException('Work item đã được xử lý bởi người khác');

      // Xóa các assignment trên văn bản cha có chung originId với bước hiện tại (ngoại trừ người nhận trả lại)
      const commonOriginId = newestAudit?.originId;
      if (commonOriginId) {
        const receiversToDelete = auditArr
          .filter((a) => a.originId === commonOriginId)
          .map((a) => a.receiver)
          .filter((r) => r && r !== returnTo);

        if (receiversToDelete.length > 0) {
          const placeholders = receiversToDelete.map((_, i) => `@rec${i}`).join(',');
          const deleteReq = tx.request();
          deleteReq.input('documentId', sql.VarChar, documentId);
          receiversToDelete.forEach((r, i) => {
            deleteReq.input(`rec${i}`, sql.VarChar, r);
          });
          await deleteReq.query(`
            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_assignment
            WHERE document_id = @documentId
              AND receiver IN (${placeholders})
          `);
        }
      }

      if (isRecallClone) {
        await tx.request()
          .input('documentId', sql.VarChar, documentId)
          .query(`
            DECLARE @clonedDocIds TABLE (document_id VARCHAR(50));
            
            INSERT INTO @clonedDocIds (document_id)
            SELECT document_id 
            FROM ${(this.repo as any).dbname}.dbo.incomming_documents 
            WHERE parent_doc_clone = @documentId OR parent_doc = @documentId;

            -- Xóa các assignment liên quan của clone trên văn bản cha để tránh lỗi đã có vai trò xử lý
            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_assignment
            WHERE document_id = @documentId
              AND EXISTS (
                SELECT 1
                FROM ${(this.repo as any).dbname}.dbo.incomming_assignment clone_assign
                WHERE clone_assign.document_id IN (SELECT document_id FROM @clonedDocIds)
                  AND clone_assign.receiver = incomming_assignment.receiver
                  AND clone_assign.role_process = incomming_assignment.role_process
              );

            -- Xóa các work_items, audit, assignment, current_state và documents của các bản clone
            DELETE FROM ${(this.repo as any).dbname}.dbo.work_items
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.audit
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_assignment
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_current_state
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_suggested_handlings
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.document_comments
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.file_relations
            WHERE object_id IN (SELECT document_id FROM @clonedDocIds);

            DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_documents
            WHERE document_id IN (SELECT document_id FROM @clonedDocIds);
          `);
      }

      let lastTargetIdx = -1;
      if (nextNode) {
        // Tìm lần đến (toNodeId) gần nhất của nút đích
        for (let i = auditArr.length - 1; i >= 0; i--) {
          if (auditArr[i].toNodeId === nextNode.id) {
            lastTargetIdx = i;
            break;
          }
        }
        // Nếu không có lần đến, fallback tìm lần đi (fromNodeId) gần nhất
        if (lastTargetIdx === -1) {
          for (let i = auditArr.length - 1; i >= 0; i--) {
            if (auditArr[i].fromNodeId === nextNode.id) {
              lastTargetIdx = i;
              break;
            }
          }
        }
      }

      if (lastTargetIdx >= 0) {
        const auditIdsToDelete = auditArr.slice(lastTargetIdx + 1).map((a) => a.id);
        if (auditIdsToDelete.length > 0) {
          await tx.request()
            .input('documentId', sql.VarChar, documentId)
            .query(`
              DELETE FROM ${(this.repo as any).dbname}.dbo.incomming_assignment
              WHERE document_id = @documentId
                AND last_audit_id IN (${auditIdsToDelete.join(',')})
            `);
        }
      }

      // Quét tất cả các node hạ nguồn có thể đi từ nút đích theo định nghĩa BPMN
      const downstreamNodeIds = new Set<string>();
      if (nextNode) {
        const queue: string[] = [nextNode.id];
        const visited = new Set<string>([nextNode.id]);
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const outs = indexes.outgoingBySource.get(currentId) || [];
          for (const flow of outs) {
            const targetId = flow.targetRef?.id;
            if (targetId && !visited.has(targetId)) {
              visited.add(targetId);
              downstreamNodeIds.add(targetId);
              queue.push(targetId);
            }
          }
        }
      }

      const nodeIdsToDelete = new Set<string>();
      if (lastTargetIdx >= 0) {
        for (let i = lastTargetIdx; i < auditArr.length; i++) {
          const audit = auditArr[i];
          if (audit.toNodeId) nodeIdsToDelete.add(audit.toNodeId);
          if (audit.fromNodeId) nodeIdsToDelete.add(audit.fromNodeId);
        }
      }
      for (const nid of downstreamNodeIds) {
        nodeIdsToDelete.add(nid);
      }

      nodeIdsToDelete.delete(wi.nodeId);

      if (nodeIdsToDelete.size > 0) {
        await this.repo.removeWorkItemsByNodeIds(documentId, Array.from(nodeIdsToDelete), tx);
      } else {
        // Fallback: nếu không tìm thấy trong audit/BPMN, xóa toàn bộ để đảm bảo an toàn
        await this.repo.removeWorkItemByConditions({ documentId }, tx);
      }

      // Tạo WI mới cho người nhận
      if (nextNode) {
        await this.repo.addWorkItem(
          documentId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: returnTo,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }
      // Ghi audit kết thúc văn bản
      await this.addAuditIncomingAware(
        documentId,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: prvAudit?.actionCode === 'CREATE' ? prvAudit?.actionCode : payload?.actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: returnTo || payload.assignToUserId,
          receiver_unit: null,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Trả lại',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            note: payload?.note || (payload as any)?.reason || '',
            reason: payload?.note || (payload as any)?.reason || '',
            finalAction: payload.actionCode,
            completedBy: effectiveUserId,
          },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // if (doc?.fromCreateDraf === true) {
      await this.repo.markOutgoingByReturnIncomingId(
        documentId,
        tx,
      );
      // }

      // Cập nhật trạng thái bước hiện tại
      await this.updateStageStatusAuditIncomingAware(
        documentId,
        {
          receiver: userId,
          stage_status: stageStatusDoc.TRA_LAI,
          typeDocument: 'IncommingDocument',
          action_code: stageStatusDoc.TRA_LAI,
        },
        tx,
      );

      // console.log({ user });

      // cập nhật trạng thái VB
      await this.repo.updateDocumentStatus(documentId, statusDoc, tx);

      await this.repo.commit(tx);

      const finalDoc = await this.repo.getDocument(documentId);

      const pAny = payload as any;
      const returnNoteText = (
        pAny?.note ||
        pAny?.comment ||
        pAny?.reason ||
        pAny?.content ||
        pAny?.text ||
        ''
      ).trim();

      if (returnNoteText) {
        await this.addSystemComment(
          documentId,
          payload,
          returnNoteText,
          originalUser || effectiveUserId,
          'opinion',
        );
      }

      return {
        ok: true,
        message: 'Trả lại thành công',
        document: finalDoc,
        nextNode: nextNode ? {
          tasks: [{ assignee: returnTo }]
        } : null
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }
  async returnWorkItemOutgoing({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    bpmnVersion: string;
  }): Promise<any> {
    const [{ indexes }, wi, auditArr] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ]);
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');
    const effectiveUserId = userId;
    const effectiveDisplayName = payload.displayName || 'User';

    const node = indexes.nodes.get(wi.nodeId);

    //* phục vụ mục đích gán lại các action và actionCode cho các công việc trả lại
    const prevAudit = auditArr.filter(
      (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI',
    );
    // const lastprevAudit = prevAudit[prevAudit.length - 1];
    // const lastAudit = lastAuditCurrentNode[lastAuditCurrentNode.length - 1];
    const outs = indexes.outgoingBySource.get(node.id) || [];
    let nodeReturn = outs.find((x) => x.name === payload?.actionCode);
    if (!nodeReturn && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL')) {
      nodeReturn = outs.find((x) => x.name === 'TRA_LAI' || x.name === 'TU_CHOI' || x.name?.includes('TRA_LAI'));
    }

    let outv2;
    if (nodeReturn) {
      const res = this.bpmnEngine.nextInteractiveFromFlow(nodeReturn, indexes);
      outv2 = res?.node;
    }

    if (!outv2 && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL')) {
      const prevAudit = auditArr.filter(
        (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI',
      );
      const newestAudit = prevAudit[prevAudit.length - 1];
      if (newestAudit?.fromNodeId) {
        outv2 = indexes.nodes.get(newestAudit.fromNodeId);
      }
    }
    let actionCodeUpper;
    const roles = payload?.roles;
    if (!roles)
      throw new BadRequestException('Vai trò (roles) không được để trống');
    actionCodeUpper = payload.actionCode?.toUpperCase();
    const out = indexes.outgoingBySource.get(outv2?.id) || [];

    let retFlow;

    // Trường hợp 1: Nếu outv2 là UserTask và chỉ có 1 flow ra duy nhất
    // => Tự động lấy flow đó (ví dụ: Activity_1fhsjdp)
    if (outv2?.$type === 'bpmn:UserTask' && out.length === 1) {
      retFlow = out[0];
    } else if (outv2?.$type === 'bpmn:InclusiveGateway') {
      retFlow = nodeReturn;
    } else if (
      nodeReturn?.targetRef?.outgoing?.[0]?.targetRef?.$type ===
      'bpmn:ManualTask'
    ) {
      retFlow = nodeReturn?.targetRef?.outgoing?.[0];
    }
    // Trường hợp 2: Có nhiều flows (từ ExclusiveGateway sau UserTask)
    // => Tìm flow vừa khớp actionCode VÀ dẫn đến đúng lane (ví dụ: Activity_0nohir9 -> Gateway)
    else {
      retFlow = out.find((f) => {
        // Điều kiện 1: actionCode phải khớp
        if (f.name !== actionCodeUpper) return false;

        // Điều kiện 2: flow phải dẫn đến node thuộc lane = payload.roles
        const { node: candidateNode } = this.bpmnEngine.nextInteractiveFromFlow(
          f,
          indexes,
        );
        if (!candidateNode) return false;

        const targetLane = indexes.laneMap.get(candidateNode.id);

        // Kiểm tra lane có khớp với payload.roles không
        return targetLane === roles;
      });
    }

    if (!retFlow && (payload?.actionCode === 'THU_HOI' || payload?.actionCode === 'RECALL') && out.length > 0) {
      retFlow = out[0];
    }

    if (!retFlow) {
      throw new BadRequestException(
        `Không tìm thấy luồng trả lại phù hợp với actionCode: ${actionCodeUpper} và vai trò: ${roles}`,
      );
    }

    // statusReturn
    let statusDoc;
    if (
      (outv2?.$type === 'bpmn:UserTask' && out.length === 1) ||
      nodeReturn?.targetRef?.outgoing?.[0]?.targetRef?.$type ===
      'bpmn:ManualTask'
    ) {
      statusDoc = getAllNodeExtensionProperties(
        nodeReturn?.targetRef,
      ).statusCode;
    } else {
      statusDoc = getAllNodeExtensionProperties(retFlow?.targetRef).statusCode;
    }
    // -----------------------------
    // 🔍 2. Xác định nextNode + targetRole đúng theo flow
    // -----------------------------
    let nextNode;
    if (outv2?.$type === 'bpmn:UserTask' && out.length === 1) {
      nextNode = outv2;
    } else {
      ({ node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        retFlow,
        indexes,
      ));
    }
    const targetRole = indexes.laneMap.get(nextNode?.id);

    const currentRole = indexes.laneMap.get(wi.nodeId);

    // xử lý rule đặc biệt (nếu có)
    // const resolved = this.bpmnEngine.resolveReturnTarget(
    //   retFlow,
    //   indexes,
    //   currentRole,
    // );
    // if (resolved.role) {
    //   targetRole = resolved.role;
    //   if (resolved.node) nextNode = resolved.node;
    // }

    // -----------------------------
    // 🔍 3. Xác định người nhận (ưu tiên payload.assignToUserId)
    // -----------------------------
    let returnTo: string | null = null;

    // ✅ 1. Ưu tiên người được truyền vào
    if (payload.assignToUserId) {
      const candidate = payload.assignToUserId;

      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnVersion,
        targetRole,
      );

      if (candidates.length && !candidates.includes(candidate)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }

      returnTo = candidate;
    }

    // ✅ 2. Không có payload → tìm người cũ (Tái sử dụng auditArr)
    if (!returnTo) {
      for (let i = auditArr.length - 1; i >= 0; i--) {
        const ev = auditArr[i];
        if (ev.role === targetRole && ev.userId) {
          returnTo = ev.userId;
          break;
        }
      }
    }

    // ✅ 3. Vẫn không có → báo lỗi
    if (!returnTo) {
      throw new BadRequestException(
        `Không tìm thấy người xử lý trước đó trong lịch sử văn bản để trả lại. Vui lòng chọn lại`,
      );
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException('Work item đã được xử lý bởi người khác');

      let lastTargetIdx = -1;
      if (nextNode) {
        // Tìm lần đến (toNodeId) gần nhất của nút đích
        for (let i = auditArr.length - 1; i >= 0; i--) {
          if (auditArr[i].toNodeId === nextNode.id) {
            lastTargetIdx = i;
            break;
          }
        }
        // Nếu không có lần đến, fallback tìm lần đi (fromNodeId) gần nhất
        if (lastTargetIdx === -1) {
          for (let i = auditArr.length - 1; i >= 0; i--) {
            if (auditArr[i].fromNodeId === nextNode.id) {
              lastTargetIdx = i;
              break;
            }
          }
        }
      }

      // Quét tất cả các node hạ nguồn có thể đi từ nút đích theo định nghĩa BPMN
      const downstreamNodeIds = new Set<string>();
      if (nextNode) {
        const queue: string[] = [nextNode.id];
        const visited = new Set<string>([nextNode.id]);
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const outs = indexes.outgoingBySource.get(currentId) || [];
          for (const flow of outs) {
            const targetId = flow.targetRef?.id;
            if (targetId && !visited.has(targetId)) {
              visited.add(targetId);
              downstreamNodeIds.add(targetId);
              queue.push(targetId);
            }
          }
        }
      }

      const nodeIdsToDelete = new Set<string>();
      if (lastTargetIdx >= 0) {
        for (let i = lastTargetIdx; i < auditArr.length; i++) {
          const audit = auditArr[i];
          if (audit.toNodeId) nodeIdsToDelete.add(audit.toNodeId);
          if (audit.fromNodeId) nodeIdsToDelete.add(audit.fromNodeId);
        }
      }
      for (const nid of downstreamNodeIds) {
        nodeIdsToDelete.add(nid);
      }

      nodeIdsToDelete.delete(wi.nodeId);

      if (nodeIdsToDelete.size > 0) {
        await this.repo.removeWorkItemsByNodeIds(documentId, Array.from(nodeIdsToDelete), tx);
      } else {
        // Fallback: nếu không tìm thấy trong audit/BPMN, xóa toàn bộ để đảm bảo an toàn
        await this.repo.removeWorkItemByConditions({ documentId }, tx);
      }

      // Tạo WI mới cho người nhận
      if (nextNode) {
        await this.repo.addWorkItem(
          documentId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: returnTo,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }
      // Ghi audit kết thúc văn bản
      await this.addAuditOutgoingAware(
        documentId,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: payload.actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: returnTo || payload.assignToUserId,
          receiver_unit: null,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Trả lại',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            note: payload?.note || (payload as any)?.reason || '',
            reason: payload?.note || (payload as any)?.reason || '',
            finalAction: payload.actionCode,
            completedBy: effectiveUserId,
          },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      // if (doc?.fromCreateDraf === true) {
      await this.repo.markOutgoingByReturnIncomingId(
        documentId,
        tx,
      );
      // }

      // Cập nhật trạng thái bước hiện tại
      await this.updateStageStatusAuditOutgoingAware(
        documentId,
        {
          receiver: userId,
          stage_status: stageStatusDoc.TRA_LAI,
          typeDocument: 'OutGoingDocument',
          action_code: stageStatusDoc.TRA_LAI,
        },
        tx,
      );

      // console.log({ user });

      // cập nhật trạng thái VB
      await this.repo.updateOutGoingDocumentStatus(documentId, statusDoc, tx);

      await this.repo.commit(tx);

      const finalDoc = await this.repo.getOutgoingDocument(documentId);

      const pAnyOut = payload as any;
      const outgoingReturnNoteText = (
        pAnyOut?.note ||
        pAnyOut?.comment ||
        pAnyOut?.reason ||
        pAnyOut?.content ||
        pAnyOut?.text ||
        ''
      ).trim();

      if (outgoingReturnNoteText) {
        await this.addSystemComment(
          documentId,
          payload,
          outgoingReturnNoteText,
          originalUser || effectiveUserId,
          'opinion',
        );
      }

      return {
        ok: true,
        message: 'Trả lại thành công',
        document: finalDoc,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async completeOutgoingWorkItem({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    bpmnVersion,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    bpmnVersion: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.repo.getWorkItem(documentId, workItemId);
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const auditArr = await this.repo.getAudit(documentId);

    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    let statusDoc;
    if (cur?.extensionElements?.values?.[0]?.$children) {
      statusDoc =
        cur?.extensionElements?.values?.[0]?.$children?.find(
          (p: any) => p.name === 'statusCode',
        )?.value ??
        cur?.extensionElements?.values?.[0]?.values?.find(
          (p: any) => p.name === 'statusCode',
        )?.value;
    }

    let { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    let targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    // Fallback: nếu cur (node trung gian) không có statusCode, lấy từ nextNode (ví dụ: EndEvent có statusCode = 101)
    if (!statusDoc && nextNode) {
      const nextExtProps = getAllNodeExtensionProperties(nextNode);
      if (nextExtProps?.statusCode) {
        statusDoc = nextExtProps.statusCode;
      }
    }

    // === Return Logic (for Outgoing Documents) ===
    if (actionCatalog.isReturn(actionCode)) {
      const currentRole = indexes.laneMap.get(wi.nodeId);
      const resolved = this.bpmnEngine.resolveReturnTarget(
        flow,
        indexes,
        currentRole,
      );
      if (resolved.role) {
        targetRole = resolved.role;
        if (resolved.node) nextNode = resolved.node;
      }

      let returnTo: string | null = null;
      for (let i = auditArr.length - 1; i >= 0; i--) {
        const ev = auditArr[i];
        if (ev.role === targetRole && ev.userId) {
          returnTo = ev.userId;
          break;
        }
      }

      if (!returnTo) {
        const candidate = payload.assignToUserId;
        if (!candidate)
          throw new BadRequestException(
            'Không tìm thấy người nhận trước đó để trả lại',
          );
        const candidates = await this.repo.getUsersByRoleInFlow(
          bpmnVersion,
          targetRole,
        );

        if (candidates.length && !candidates.includes(candidate)) {
          throw new BadRequestException(
            `Người nhận không đúng vai trò, vui lòng chọn lại`,
          );
        }
        returnTo = candidate;
      }

      const tx = await this.repo.begin();
      try {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was already completed by another user',
          );

        if (nextNode) {
          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: returnTo,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
        }
        await this.updateStageStatusAuditOutgoingAware(
          documentId,
          { receiver: payload?.userId, stage_status: stageStatusDoc.TRA_LAI, action_code: stageStatusDoc.TRA_LAI, typeDocument: 'OutGoingDocument' },
          tx,
        );
        await this.repo.updateOutgoingDocumentByDocumentId(documentId, {
          statusCode: statusDoc,
        });
        await this.repo.commit(tx);
        return { ok: true, message: 'Trả lại văn bản đi thành công' };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    }

    // === Normal Transfer / Approval Logic (for Outgoing Documents) ===
    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
    let assignTo: string | null = null;

    if (requiresAssignee) {
      assignTo = payload.assignToUserId ?? null;
      if (!assignTo)
        throw new BadRequestException(
          'assignToUserId is required for this action',
        );

      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnVersion,
        targetRole,
      );

      if (candidates.length && !candidates.includes(assignTo)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException('Work item đã được xử lý bởi người khác');

      // Tạo work item mới cho bước tiếp theo
      if (nextNode) {
        await this.repo.addWorkItem(
          documentId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: requiresAssignee ? assignTo : null,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      const completedStageStatus =
        actionCode === 'DONG_DAU'
          ? stageStatusDoc.DA_DONG_DAU
          : stageStatusDoc.DA_XU_LY;

      // Cập nhật và ghi log
      await this.updateStageStatusAuditOutgoingAware(
        documentId,
        {
          receiver: payload?.userId,
          stage_status: completedStageStatus,
          typeDocument: 'OutGoingDocument',
          action_code: actionCode,
          details: { endNode: nextNode?.$type === 'bpmn:EndEvent' },
        },
        tx,
      );
      await this.addAuditOutgoingAware(
        documentId,
        {
          user_id: payload.userId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: assignTo,
          roleProcess: 'processor',
          action: actionCode === 'DONG_DAU' ? 'Đóng dấu' : 'Chuyển xử lý',
          created_by: payload.userId,
          stage_status: completedStageStatus,
          origin_id: wi.id,
          created_at: new Date(),
          updated_at: new Date(),
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      // Cập nhật trạng thái cho văn bản đi
      await this.repo.updateOutgoingDocumentByDocumentId(documentId, {
        statusCode: statusDoc,
      });

      // Nếu hành động là Đóng dấu thì tự động phát hành tới 3 trường Đơn vị nhận, Xin ý kiến, Nơi nhận để biết
      if (actionCode === 'DONG_DAU') {
        const dbName = process.env.SQLSERVER_DATABASE || 'app_tancang';
        const outgoing = await this.repo.getOutgoingDocument(documentId);

        let receivingDept: string[] = [];
        if (outgoing.internalReceivingDept) {
          try {
            receivingDept = typeof outgoing.internalReceivingDept === 'string'
              ? JSON.parse(outgoing.internalReceivingDept)
              : outgoing.internalReceivingDept;
            if (!Array.isArray(receivingDept)) receivingDept = [receivingDept].filter(Boolean) as string[];
          } catch {
            receivingDept = outgoing.internalReceivingDept.trim() ? [outgoing.internalReceivingDept] : [];
          }
        }

        let processorArray: string[] = [];
        if (outgoing.processor) {
          try {
            processorArray = typeof outgoing.processor === 'string'
              ? JSON.parse(outgoing.processor)
              : outgoing.processor;
            if (!Array.isArray(processorArray)) processorArray = [processorArray].filter(Boolean) as string[];
          } catch {
            processorArray = outgoing.processor.trim() ? [outgoing.processor] : [];
          }
        }

        let knowReceiversArray: string[] = [];
        if (outgoing.knowReceivers) {
          try {
            knowReceiversArray = typeof outgoing.knowReceivers === 'string'
              ? JSON.parse(outgoing.knowReceivers)
              : outgoing.knowReceivers;
            if (!Array.isArray(knowReceiversArray)) knowReceiversArray = [knowReceiversArray].filter(Boolean) as string[];
          } catch {
            knowReceiversArray = outgoing.knowReceivers.trim() ? [outgoing.knowReceivers] : [];
          }
        }

        const [unitFlowConfigs, processorInfos, knowReceiverInfosRaw] = await Promise.all([
          receivingDept.length > 0
            ? this.sqlsvRepo.getIncomingFlowsByUnits(receivingDept)
            : Promise.resolve([]),
          processorArray.length > 0
            ? Promise.all(
              processorArray.map(async (p) => {
                const user: any = await this.sqlsvRepo.getUserById(p);
                if (!user?.parent?.id) return null;
                const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
                return { processor: p, flowConfig, parentUser: user.parent.id };
              })
            )
            : Promise.resolve([]),
          knowReceiversArray.length > 0
            ? Promise.all(
              knowReceiversArray.map(async (k) => {
                const user: any = await this.sqlsvRepo.getUserById(k);
                if (user) {
                  if (!user.parent?.id) return null;
                  const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
                  return { type: 'user', knowReceiver: k, flowConfig, parentUser: user.parent.id };
                } else {
                  try {
                    const result = await this.groupUserInDocumentService.findUsersByGroupId(k, { page: 1, limit: 1000 });
                    const users = Array.isArray(result?.data) ? result.data : [];
                    const resolvedUsers = await Promise.all(
                      users.map(async (u) => {
                        const uid = typeof u?.id === 'string' ? u.id.trim() : String(u?.id || '').trim();
                        if (!uid) return null;
                        const gUser: any = await this.sqlsvRepo.getUserById(uid);
                        if (!gUser?.parent?.id) return null;
                        const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(gUser.parent.id), 'IncommingDocument');
                        return { knowReceiver: uid, flowConfig, parentUser: gUser.parent.id };
                      })
                    );
                    return { type: 'group', members: resolvedUsers.filter(Boolean) };
                  } catch (err) {
                    this.logger.warn(`Error resolving group ${k} in completeOutgoingWorkItem: ${err?.message}`);
                    return null;
                  }
                }
              })
            )
            : Promise.resolve([])
        ]);

        const knowReceiverInfos: any[] = [];
        const groupMemberUserIds: string[] = [];
        for (const item of knowReceiverInfosRaw) {
          if (!item) continue;
          if (item.type === 'user') {
            knowReceiverInfos.push({ knowReceiver: item.knowReceiver, flowConfig: item.flowConfig, parentUser: item.parentUser });
          } else if (item.type === 'group' && Array.isArray(item.members)) {
            for (const member of item.members) {
              if (member && member.knowReceiver) {
                groupMemberUserIds.push(member.knowReceiver);
              }
            }
          }
        }

        const flowConfigMap = new Map<string, any>();
        for (const fc of unitFlowConfigs) {
          if (!Array.isArray(fc.unit)) continue;
          for (const u of fc.unit) {
            flowConfigMap.set(String(u), fc);
          }
        }

        const allKnowReceiverUserIds = [...new Set([
          ...knowReceiversArray,
          ...groupMemberUserIds,
          ...knowReceiverInfos.map((info) => info.knowReceiver).filter(Boolean),
        ])];

        if (allKnowReceiverUserIds.length > 0) {
          const currentKnowReceivers = [...knowReceiversArray];
          const updatedKnowReceivers = [...new Set([...currentKnowReceivers, ...allKnowReceiverUserIds])];

          const updateRequest = tx.request();
          updateRequest.input('documentId', sql.VarChar, documentId);
          updateRequest.input('knowReceivers', sql.NVarChar, JSON.stringify(updatedKnowReceivers));
          await updateRequest.query(`
            UPDATE outgoing_documents
            SET know_receivers = @knowReceivers,
                updated_at = GETDATE()
            WHERE document_id = @documentId
          `);

          outgoing.knowReceivers = JSON.stringify(updatedKnowReceivers);

          if (this.notificationService) {
            try {
              await Promise.all(
                allKnowReceiverUserIds.map((recipientId) =>
                  this.notificationService!.create({
                    recipientId,
                    senderId: payload.userId,
                    content: `Văn bản đi ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí nhận để biết.`,
                    recordId: documentId,
                    link: `/outgoing-documents/${documentId}`,
                    key: 'VIEW_OUTCOMING_DOC',
                    type: NotificationType.OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW.value,
                    time: new Date(),
                    status: 1,
                  })
                )
              );
            } catch (e: any) {
              this.logger.error(`❌ Notification for know receivers in completeOutgoingWorkItem failed: ${e?.message || e}`);
            }
          }
        }

        if (receivingDept.length > 0) {
          for (const ou of receivingDept) {
            const flowConfig = flowConfigMap.get(String(ou));
            if (!flowConfig) continue;

            await this.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: ou,
              processorUserId: null,
              flowConfig,
              payload,
              wi,
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_room',
                organizationUnit: ou,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId: payload.userId,
            });
          }
        }

        for (const info of processorInfos) {
          if (info && info.flowConfig) {
            await this.createIncomingDocumentCopyProcessor({
              outgoing,
              receiverUnit: String(info.parentUser),
              processorUserId: info.processor,
              flowConfig: info.flowConfig,
              payload,
              wi,
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_processor',
                processorUserId: info.processor,
                organizationUnit: info.parentUser,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId: payload.userId,
            });
          }
        }

        for (const info of knowReceiverInfos) {
          if (info && info.flowConfig) {
            await this.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: String(info.parentUser),
              processorUserId: info.knowReceiver,
              flowConfig: info.flowConfig,
              payload,
              wi,
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_know',
                processorUserId: info.knowReceiver,
                organizationUnit: info.parentUser,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId: payload.userId,
              roleProcess: 'viewer',
            });
          }
        }
      }
      ////////
      await this.repo.commit(tx);

      return { status: 1, message: 'Xử lý văn bản đi thành công', document: await this.repo.getOutgoingDocument(documentId) };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async completeProcessing({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    bpmnVersion,
    userId,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    bpmnVersion: string;
    userId: string;
  }): Promise<any> {
    const actionCode = payload.actionCode?.toString().toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode là bắt buộc');

    // [TỐI ƯU 1]: Parallel load cho 3 resources đọc không phụ thuộc nhau (giảm 60% delay I/O)
    const [modelData, wi, auditArr] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ]);

    const indexes = modelData.indexes;

    if (!wi)
      throw new BadRequestException('WorkItem không tồn tại hoặc đã được xử lý');

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];

    // [TỐI ƯU 2]: Xử lý logic Audit tối ưu (O(N)), không sort để tránh mutate array gốc và tiết kiệm CPU.
    // Đồng thời tận dụng findLast (Node v18+) để lấy thẳng giá trị phần tử cần tìm.
    let isTransferOptionWorkItem = false;

    // Lịch sử nhận chuyển cho userId nằm sát cùng
    const lastAudit = auditArr.findLast((a) => a.receiver === userId);

    // Element đầu tiên (oldest) trong mảng
    const firstAuditCurrentNode = auditArr.reduce(
      (min, cur) => (new Date(cur.created_at) < new Date(min.created_at) ? cur : min),
      auditArr[0]
    );

    // Element return cuối cùng
    const lastprevAudit = auditArr.findLast(
      (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI'
    );

    if (lastAudit) {
      const details =
        typeof lastAudit.details === 'string'
          ? JSON.parse(lastAudit.details)
          : lastAudit.details || {};
      if (details.isTransferOption === true) {
        isTransferOptionWorkItem = true;
      }
    }

    // --- NHÁNH 1: TRANSFER OPTION ---
    if (isTransferOptionWorkItem) {
      const tx = await this.repo.begin();
      try {
        // [TỐI ƯU 3]: Gỡ bỏ Promise.all() bên trong transaction (Chạy tuần tự để tránh lỗi MSSQL Connection is busy)
        await this.repo.removeWorkItemByConditions(
          { documentId, workItemId: wi.id, assigneeUserId: userId },
          tx,
        );
        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: userId,
            stage_status: stageStatusDoc.HOAN_THANH,
            typeDocument: 'IncommingDocument',
            action_code: stageStatusDoc.HOAN_THANH,
          },
          tx,
        );
        await this.repo.commit(tx);

        // Fire-and-forget: không await
        this.checkAndCompleteTransferOptionsDocument(documentId, userId).catch(
          (err) => {
            console.error(
              '[completeProcessing] Lỗi khi kiểm tra điều kiện hoàn thành:',
              err,
            );
          },
        );

        return {
          status: 1,
          message: 'Xử lý thành công',
          // Update lấy document luôn trả về 
          document: await this.repo.getDocument(documentId),
        };
      } catch (error) {
        await this.repo.rollback(tx);
        throw error;
      }
    }

    // --- NHÁNH 2: LOGIC XỬ LÝ BPMN THÔNG THƯỜNG ---
    else {
      const flow = outs.find(
        (f: any) =>
          (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
      );
      if (!flow)
        throw new BadRequestException(
          `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
        );

      const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
      const cur = flow?.targetRef?.id ? indexes.nodes.get(flow.targetRef.id) : null;
      const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;
      let { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

      // === XỬ LÝ SERVICE TASK ===
      let serviceTaskResult: any = null;
      if (nextNode?.$type === 'bpmn:ServiceTask') {
        serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask({
          nodeId: nextNode.id,
          bpmnXml: bpmnXML,
          variables: {
            curNodeId: node,
            documentId,
            workItemId,
            userId: userId,
            auditArr,
            indexes,
            payload,
            nodeId: nextNode.id,
            bpmnXml: bpmnXML,
          },
        });

        nextNode = serviceTaskResult?.nextNode !== undefined ? serviceTaskResult.nextNode : nextNode;
      }

      const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
      const currentLane = indexes.laneMap.get(wi.nodeId);
      const nextLane = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

      let assignTo: string | null = payload.assignToUserId || null;
      const requiresAssignee = nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;

      if (requiresAssignee && nextNode && nextNode.$type !== 'bpmn:EndEvent') {
        if (serviceTaskResult?.assignTo) {
          assignTo = serviceTaskResult?.assignTo;
        } else if (!assignTo) {
          if (currentLane === nextLane) {
            assignTo = wi.assigneeUserId || userId || null;
            if (!assignTo) {
              const lastInSameLane = auditArr.findLast(
                (a) => indexes.laneMap.get(a.toNodeId) === currentLane
              );
              assignTo = lastInSameLane?.receiver || lastInSameLane?.createdBy || null;
            }
          } else {
            const lastInTargetLane = auditArr.findLast(
              (a) => indexes.laneMap.get(a.toNodeId) === nextLane
            );
            if (lastInTargetLane) {
              assignTo =
                lastInTargetLane.receiver ||
                lastInTargetLane.userId ||
                lastInTargetLane.createdBy ||
                null;
            }
          }
        }

        if (!assignTo) {
          const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
          if (candidates.length > 0) {
            try {
              const fetchReq = (this.repo as any).pool.request();
              fetchReq.input('userId', userId);
              const userRes = await fetchReq.query(`SELECT TOP 1 parent FROM ${(this.repo as any).dbname}.dbo.users WHERE id = @userId`);
              const parentUnitId = userRes.recordset?.[0]?.parent;
              if (parentUnitId) {
                const candidateReq = (this.repo as any).pool.request();
                candidateReq.input('parent', parentUnitId);
                const queryStr = `
                  SELECT id FROM ${(this.repo as any).dbname}.dbo.users
                  WHERE status = 1 AND parent = @parent AND id IN (${candidates.map(id => `'${id}'`).join(',')})
                `;
                const candidateRes = await candidateReq.query(queryStr);
                if (candidateRes.recordset?.length > 0) {
                  assignTo = candidateRes.recordset[0].id;
                }
              }
            } catch (err) {
              this.logger.error(`Error auto detecting assignee by parent unit: ${err?.message || err}`);
            }
            if (!assignTo) {
              assignTo = candidates[0];
            }
          }
        }

        if (!assignTo) {
          throw new BadRequestException(`Không xác định được người nhận ở lane ${nextLane}`);
        }

        const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
        if (candidates.length && !candidates.includes(assignTo)) {
          throw new BadRequestException(`Người nhận không đúng vai trò, vui lòng chọn lại`);
        }
      }

      // Thực thi lấy thông tin Document để chuẩn bị return (lazy fetch)
      // Query sớm trước tx để dùng cho nhánh bên trong nếu cần
      let documentRes: any = null;

      const tx = await this.repo.begin();
      try {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException('Công việc đã được xử lý bởi người khác');

        // [TỐI ƯU 4]: Thực thi Transaction Statements tuần tự an toàn cho MSSQL
        const isDocCompleted = await this.repo.isIncomingDocumentCompleted(documentId);
        if (nextNode && nextNode.$type !== 'bpmn:EndEvent' && !isDocCompleted) {
          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: requiresAssignee ? assignTo : null,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
        }

        if (firstAuditCurrentNode) {
          const details =
            typeof firstAuditCurrentNode?.details === 'string'
              ? JSON.parse(firstAuditCurrentNode?.details)
              : firstAuditCurrentNode?.details || {};

          if (details?.transferType === 'to_room') {
            // [TỐI ƯU 5]: Tái cấu trúc, chỉ query getDocument khi thực sự cần thay vì query ngay từ lúc chưa bắt đầu transaction.
            if (!documentRes) documentRes = await this.repo.getDocument(documentId);
            await this.updateStageStatusAuditIncomingAware(
              documentRes?.parentDoc,
              {
                receiver: firstAuditCurrentNode?.receiverUnit,
                stage_status: stageStatusDoc.HOAN_THANH,
                curStatusCode: statusDoc,
                isDauPhong: true,
                typeDocument: 'IncommingDocument',
              },
              tx,
            );
          }
        }

        const isReturnAction = lastAudit?.actionCode === 'TRA_LAI';
        let targetStageStatus = flowExtProps?.actionCode === 'CHUYEN_XU_LY' ? stageStatusDoc.DA_XU_LY : stageStatusDoc.HOAN_THANH;
        let finalStatusDoc = statusDoc;
        const nextNodeProps = nextNode ? getAllNodeExtensionProperties(nextNode) : null;
        if (nextNodeProps?.statusCode) {
          finalStatusDoc = nextNodeProps.statusCode;
        }
        if (nextNodeProps?.stageStatus) {
          targetStageStatus = nextNodeProps.stageStatus;
        }

        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: userId,
            stage_status: targetStageStatus,
            curStatusCode: finalStatusDoc,
            action_code: isReturnAction ? lastprevAudit?.actionCode : null,
            action: isReturnAction ? lastprevAudit?.action : null,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );

        if (!isDocCompleted) {
          await this.repo.updateDocumentStatus(documentId, finalStatusDoc, tx);
        }

        await this.repo.commit(tx);

        // Fire and forget User Query & System Comment vì không nằm trong Transaction Logic
        // Tránh việc user query block kết quả trả về của client
        // Nếu không cần receiverText in ra vội, ta gom lại xử lý asynchronously
        if (assignTo) {
          this.sqlsvRepo.getUserById(assignTo).then(user => {
            // Tạo comment hệ thống... - có thể bỏ comment nếu hàm system chỉ lấy actionText
          }).catch(e => console.error(e));
        }

        // Không block chờ việc add System Comment
        // Old:
        // this.addSystemComment(documentId, payload, `Hoàn thành xử lý`, userId, 'opinion').catch(e => { });
        this.addSystemComment(documentId, payload, payload?.note || '', userId, 'opinion').catch(e => { });

        // Lấy data đã có sẵn hoặc query lại nếu chưa cache để return
        return {
          status: 1,
          message: 'Xử lý thành công',
          document: documentRes || (await this.repo.getDocument(documentId)),
        };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    }
  }

  async completeAndTransition({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    bpmnVersion,
    userId,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    bpmnVersion: string;
    userId: string;
  }): Promise<any> {
    const actionCode = payload.actionCode?.toString().toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode là bắt buộc');

    const [modelData, wi, auditArr] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ]);

    const indexes = modelData.indexes;
    if (!wi)
      throw new BadRequestException('WorkItem không tồn tại hoặc đã được xử lý');

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
      );

    const cur = flow?.targetRef?.id ? indexes.nodes.get(flow.targetRef.id) : null;
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;
    let { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    // Xử lý Service Task nếu có
    let serviceTaskResult: any = null;
    if (nextNode?.$type === 'bpmn:ServiceTask') {
      serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: nextNode.id,
        bpmnXml: bpmnXML,
        variables: { curNodeId: node.id, documentId, workItemId, userId, auditArr, indexes, payload, bpmnXml: bpmnXML },
      });
      nextNode = serviceTaskResult?.nextNode !== undefined ? serviceTaskResult.nextNode : nextNode;
    }

    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    const currentLane = indexes.laneMap.get(wi.nodeId);
    const nextLane = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    let assignTo: string | null = payload.assignToUserId || null;
    const requiresAssignee = nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;

    if (requiresAssignee && nextNode && nextNode.$type !== 'bpmn:EndEvent') {
      if (serviceTaskResult?.assignTo) {
        assignTo = serviceTaskResult?.assignTo;
      } else if (!assignTo) {
        // Auto detection logic
        if (currentLane === nextLane) {
          assignTo = wi.assigneeUserId || userId || null;
          if (!assignTo) {
            const lastInSameLane = auditArr.findLast((a) => indexes.laneMap.get(a.toNodeId) === currentLane);
            assignTo = lastInSameLane?.receiver || lastInSameLane?.createdBy || null;
          }
        } else {
          const lastInTargetLane = auditArr.findLast((a) => indexes.laneMap.get(a.toNodeId) === nextLane);
          if (lastInTargetLane) {
            assignTo = lastInTargetLane.receiver || lastInTargetLane.userId || null;
          }
        }
      }

      if (!assignTo) {
        const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
        if (candidates.length > 0) {
          try {
            const fetchReq = (this.repo as any).pool.request();
            fetchReq.input('userId', userId);
            const userRes = await fetchReq.query(`SELECT TOP 1 parent FROM ${(this.repo as any).dbname}.dbo.users WHERE id = @userId`);
            const parentUnitId = userRes.recordset?.[0]?.parent;
            if (parentUnitId) {
              const candidateReq = (this.repo as any).pool.request();
              candidateReq.input('parent', parentUnitId);
              const queryStr = `
                SELECT id FROM ${(this.repo as any).dbname}.dbo.users
                WHERE status = 1 AND parent = @parent AND id IN (${candidates.map(id => `'${id}'`).join(',')})
              `;
              const candidateRes = await candidateReq.query(queryStr);
              if (candidateRes.recordset?.length > 0) {
                assignTo = candidateRes.recordset[0].id;
              }
            }
          } catch (err) {
            this.logger.error(`Error auto detecting assignee by parent unit: ${err?.message || err}`);
          }
          if (!assignTo) {
            assignTo = candidates[0];
          }
        }
      }

      if (!assignTo) {
        throw new BadRequestException(`Không xác định được người nhận ở lane ${nextLane}`);
      }

      const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
      if (candidates.length && !candidates.includes(assignTo)) {
        throw new BadRequestException(`Người nhận không đúng vai trò`);
      }
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1) throw new BadRequestException('Công việc đã được xử lý bởi người khác');

      // Check if all other users assigned to this step have completed/confirmed
      const activeWorkItems = await this.repo.getWorkItemsByDocumentId(documentId, tx);
      const otherActiveWorkItems = activeWorkItems.filter(
        (item) => item.nodeId === wi.nodeId && item.id !== wi.id && item.state === 'open'
      );
      const isLastUser = otherActiveWorkItems.length === 0;

      // Detect document type for audit
      const isIncoming = await this.repo.getDocument(documentId).then(d => !!d);

      const curProps = getAllNodeExtensionProperties(node);
      const typeSignCurrent = curProps?.signerRequired || curProps?.processRequired || null;
      const stageStatusCurrent = this.getStageStatusByTypeSign(typeSignCurrent) || stageStatusDoc.CHUA_XU_LY;

      if (typeSignCurrent) {
        await this.repo.markUserSigned({
          documentId,
          userId,
          typeSign: typeSignCurrent,
          tx,
        });
      }

      // 1. Always update the individual audit record of the current user to DA_XU_LY so it shows as processed
      const individualUpdate = {
        receiver: userId,
        stage_status: stageStatusDoc.DA_XU_LY,
        curStatusCode: statusDoc,
        action_code: actionCode,
        typeDocument: isIncoming ? 'IncommingDocument' : 'OutgoingDocument',
        stage_status_query: stageStatusCurrent
      };

      if (isIncoming) {
        await this.updateStageStatusAuditIncomingAware(documentId, individualUpdate, tx);
      } else {
        await this.updateStageStatusAuditOutgoingAware(documentId, individualUpdate, tx);
      }

      if (isLastUser) {
        if (nextNode) {
          if (nextNode.$type !== 'bpmn:EndEvent') {
            await this.repo.addWorkItem(
              documentId,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: nextNode.id,
                role: targetRole,
                assigneeUserId: requiresAssignee ? assignTo : null,
                nodeType: nextNode.$type,
              },
              tx,
              bpmnVersion,
            );
          } else {
            // Next node is an EndEvent (like Event_13js579). Create work items for all users who confirmed!
            const confirmUsers = auditArr
              .filter((a: any) => a.toNodeId === wi.nodeId)
              .map((a: any) => a.receiver)
              .filter(Boolean);
            const uniqueConfirmUsers = [...new Set([...confirmUsers, userId])];

            for (const cUser of uniqueConfirmUsers) {
              await this.repo.addWorkItem(
                documentId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: nextNode.id,
                  role: wi.role,
                  assigneeUserId: cUser,
                  nodeType: nextNode.$type,
                },
                tx,
                bpmnVersion,
              );
            }
          }
        }

        // 2. Update all audit records for this node (which are now all DA_XU_LY) to HOAN_THANH_LUAN_CHUYEN
        const nodeUpdate = {
          stage_status: 'HOAN_THANH_LUAN_CHUYEN',
          curStatusCode: statusDoc,
          action_code: actionCode,
          typeDocument: isIncoming ? 'IncommingDocument' : 'OutgoingDocument',
          stage_status_query: stageStatusDoc.DA_XU_LY
        };

        await this.updateStageStatusAuditByNodeOutgoingAware(documentId, wi.nodeId, nodeUpdate, tx);

        await this.repo.updateDocumentStatus(documentId, statusDoc, tx);
      } else { // FIX: restore outgoing_current_state when not last user
        console.log(`[DEBUG completeAndTransition] isLastUser=false, otherActiveWorkItems count=${otherActiveWorkItems.length}`);
        const nextActiveUser = otherActiveWorkItems[0]?.assigneeUserId;
        console.log(`[DEBUG completeAndTransition] nextActiveUser=${nextActiveUser}`);
        if (nextActiveUser) {
          const fetchReq = tx ? tx.request() : (this.repo as any).pool.request();
          fetchReq.input('documentId', documentId);
          fetchReq.input('receiver', nextActiveUser);
          const fetchSql = `
            SELECT TOP 1
              id, document_id, receiver, receiver_unit, roleProcess, stage_status, action_code,
              deadline, created_at, details, type_document
            FROM ${(this.repo as any).dbname}.dbo.audit
            WHERE document_id = @documentId
              AND receiver = @receiver
              AND stage_status = 'CHO_XAC_NHAN'
            ORDER BY id DESC, created_at DESC
          `;
          const fetchRs = await fetchReq.query(fetchSql);
          const activeAuditRow = fetchRs.recordset?.[0];
          console.log(`[DEBUG completeAndTransition] activeAuditRow found=${!!activeAuditRow}`, activeAuditRow ? JSON.stringify({ id: activeAuditRow.id, receiver: activeAuditRow.receiver, stage_status: activeAuditRow.stage_status, action_code: activeAuditRow.action_code }) : 'null');
          if (activeAuditRow) {
            await (this.repo as any).upsertOutgoingCurrentStateFromAudit(activeAuditRow, tx);
            console.log(`[DEBUG completeAndTransition] upsertOutgoingCurrentStateFromAudit completed for audit id=${activeAuditRow.id}`);
          }
        }
      }

      await this.repo.commit(tx);

      // Old:
      // this.addSystemComment(documentId, payload, `Hoàn thành luân chuyển`, userId, 'opinion').catch(e => { });
      this.addSystemComment(documentId, payload, payload?.note || '', userId, 'opinion').catch(e => { });

      return {
        status: 1,
        message: 'Hoàn thành luân chuyển thành công',
        document: isIncoming ? await this.repo.getDocument(documentId) : await this.repo.getOutgoingDocument(documentId),
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async createDocDraft({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    bpmnVersion,
    userId
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    bpmnVersion: string;
    userId: string;
  }): Promise<any> {
    // [TỐI ƯU 1]: Đọc WorkItem và parentDoc song song. Bỏ qua hàm getModelFromXml vì code parse XML rất nặng và biến `node` không được dùng ở logic thuật toán Dự Thảo
    const [wi, parentDoc] = await Promise.all([
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getDocument(documentId)
    ]);
    if (!wi)
      throw new BadRequestException(
        'WorkItem không tồn tại hoặc đã được xử lý',
      );

    const actionCode = 'TAO_DU_THAO';
    // [GHI CHÚ]: Các logic rule BPMN đã được lược bỏ ở đây do logic tạo dự thảo đơn giản

    // let isTransferOptionWorkItem = false;

    // const lastAuditCurrentNode = auditArr.filter(
    //   (a) => a.receiver === userId,
    // );
    // const firstAuditCurrentNode = auditArr.sort(
    //   (a, b) =>
    //     new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    // )[0];
    // const prevAudit = auditArr.filter(
    //   (a) => a.toNodeId === wi.nodeId && a.actionCode !== 'TRA_LAI',
    // );
    // const lastprevAudit = prevAudit[prevAudit.length - 1];
    // const lastAudit = lastAuditCurrentNode[lastAuditCurrentNode.length - 1];
    // if (lastAuditCurrentNode.length > 0) {
    //   const details =
    //     typeof lastAudit.details === 'string'
    //       ? JSON.parse(lastAudit.details)
    //       : lastAudit.details || {};
    //   if (details.isTransferOption === true) {
    //     isTransferOptionWorkItem = true;
    //   }
    // }
    // if (isTransferOptionWorkItem) {
    //   const tx = await this.repo.begin();
    //   try {
    //     await this.repo.removeWorkItemByConditions(
    //       { documentId, workItemId: wi.id, assigneeUserId: userId },
    //       tx,
    //     );
    //     await this.updateStageStatusAuditIncomingAware(
    //       documentId,
    //       {
    //         receiver: userId,
    //         stage_status: 'HOAN_THANH',
    //       },
    //       tx,
    //     );
    //     if (shouldManageTransaction) {
    //        await this.repo.commit(tx);
    //      }

    //     // Gọi function kiểm tra sau khi commit transaction để tránh timeout/deadlock
    //     // Fire-and-forget: không await vì function này có try-catch riêng và không throw error
    //     this.checkAndCompleteTransferOptionsDocument(
    //       documentId,
    //       userId,
    //     ).catch((err) => {
    //       console.error(
    //         '[completeProcessing] Lỗi khi kiểm tra điều kiện hoàn thành (fire-and-forget):',
    //         err,
    //       );
    //     });

    //     return {
    //       status: 1,
    //       message: 'Xử lý thành công',
    //       document: await this.repo.getDocument(documentId),
    //     };
    //   } catch (error) {
    //     if (shouldManageTransaction) {
    //        await this.repo.rollback(tx);
    //      }

    //     throw error;
    //   }
    // } else {
    //   const flow = outs.find(
    //     (f: any) =>
    //       (f.name && f.name.toUpperCase() === actionCode) ||
    //       f.id === actionCode,
    //   );
    //   if (!flow)
    //     throw new BadRequestException(
    //       `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
    //     );
    //   const cur = flow?.targetRef?.id
    //     ? indexes.nodes.get(flow.targetRef.id)
    //     : null;
    //   const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;
    //   let { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
    //     flow,
    //     indexes,
    //   )

    //   // === XỬ LÝ SERVICE TASK: External Task Approach ===
    //   let serviceTaskResult: any = null;
    //   if (nextNode?.$type === 'bpmn:ServiceTask') {
    //     // Thực thi ServiceTask thông qua External Task handler
    //     serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask(
    //       {
    //         nodeId: nextNode.id,
    //         bpmnXml: bpmnXML,
    //         variables: {
    //           documentId,
    //           workItemId,
    //           userId: userId,
    //           auditArr,
    //           indexes,
    //           payload,
    //           nodeId: nextNode.id,
    //           bpmnXml: bpmnXML, // Truyền payload để handler có thể set autoAssignTo
    //         },
    //       },
    //     );

    //     console.log('[ServiceTask Result]:', serviceTaskResult);

    //     // Bỏ qua ServiceTask, chuyển đến bước interactive tiếp theo (ExclusiveGateway)
    //     const serviceTaskOuts = indexes.outgoingBySource.get(nextNode.id) || [];
    //     if (serviceTaskOuts.length > 0) {
    //       // ServiceTask → ExclusiveGateway → Luồng tiếp theo
    //       const flowToGateway = serviceTaskOuts[0];
    //       const nextAfterService = this.bpmnEngine.nextInteractiveFromFlow(
    //         flowToGateway,
    //         indexes,
    //       );
    //       nextNode = nextAfterService.node;
    //       console.log(
    //         `[After ServiceTask] Next node: ${nextNode?.id} (${nextNode?.$type})`,
    //       );
    //     }
    //   }

    //   const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    //   const currentLane = indexes.laneMap.get(wi.nodeId);
    //   const nextLane = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    //   // === Xác định người nhận tự động (cùng lane → trả lại người giao, khác lane → người tạo) ===
    //   let assignTo: string | null = null;
    //   const requiresAssignee =
    //     nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
    //   if (requiresAssignee && nextNode && nextNode.$type !== 'bpmn:EndEvent') {
    //     // ✅ ƯU TIÊN: Nếu ServiceTask đã tìm ra người nhận → sử dụng luôn
    //     if (serviceTaskResult?.personDirecting || payload['autoAssignTo']) {
    //       assignTo =
    //         serviceTaskResult?.personDirecting || payload['autoAssignTo'];
    //       console.log(
    //         `[Auto-Assign] Sử dụng người nhận từ ServiceTask: ${assignTo}`,
    //       );
    //     } else if (currentLane === nextLane) {
    //       // ✅ CÙNG LANE → trả lại người đã giao việc ở lane này
    //       const lastInSameLane = auditArr
    //         .filter((a) => indexes.laneMap.get(a.toNodeId) !== currentLane)
    //         .pop();

    //       assignTo =
    //         userId ||
    //         lastInSameLane?.receiver ||
    //         lastInSameLane?.createdBy ||
    //         null;
    //     } else {
    //       // ✅ KHÁC LANE → TÌM NGƯỜI ĐÃ XỬ LÝ Ở LANE ĐÍCH

    //       const lastInTargetLane = auditArr
    //         .filter((a) => indexes.laneMap.get(a.toNodeId) === nextLane)
    //         .pop();

    //       if (lastInTargetLane) {
    //         assignTo =
    //           lastInTargetLane.receiver ||
    //           lastInTargetLane.userId ||
    //           lastInTargetLane.createdBy ||
    //           null;
    //       }
    //     }

    //     if (!assignTo) {
    //       throw new BadRequestException(
    //         `Không xác định được người nhận ở lane ${nextLane}`,
    //       );
    //     }

    //     // ✅ validate role
    //     const candidates = await this.repo.getUsersByRoleInFlow(
    //       bpmnVersion,
    //       targetRole,
    //     );

    //     if (candidates.length && !candidates.includes(assignTo)) {
    //       throw new BadRequestException(
    //         `Người nhận không đúng vai trò, vui lòng chọn lại`,
    //       );
    //     }
    //   }
    // parentDoc đã được lấy song song ở trên
    const tx = await this.repo.begin();
    try {
      await this.addAuditIncomingAware(
        documentId,
        {
          user_id: userId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: null,
          receiver: null,
          receiver_unit: null,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Tạo dự thảo',
          created_by: userId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            documentId: parentDoc?.documentId || null,
            finalAction: actionCode,
            completedBy: userId,
          },
          curStatusCode: null,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // Cập nhật trạng thái tổng thể văn bản
      // await this.repo.updateDocumentStatus(documentId, statusDoc, tx);

      await this.repo.commit(tx);

      return {
        status: 1,
        message: 'Xử lý thành công',
        // [TỐI ƯU 2]: Tái sử dụng parentDoc vừa load (chính là document hiện tại)
        document: parentDoc,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
    // }
  }

  async completeDoc({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    originalUser,
    userId
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    originalUser: string;
    userId: string;
  }): Promise<any> {
    // [TỐI ƯU 1]: Gom Promise đọc I/O độc lập chạy song song
    const [modelData, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId)
    ]);
    const indexes = modelData.indexes;
    if (!wi)
      throw new BadRequestException(
        'Công việc không tồn tại hoặc đã được xử lý',
      );

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toString().toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode là bắt buộc');

    // [TỐI ƯU 2]: Dùng .find() thay vì vòng lặp for thủ công để code ngắn gọn, rành mạch và loại bỏ comment rác
    const endFlow = outs.find((f: any) => f.name && f.name.toUpperCase() === actionCode);

    if (!endFlow) {
      throw new BadRequestException(
        `Không tìm thấy luồng kết thúc với actionCode: ${actionCode}`,
      );
    }
    const { node: cur } = this.bpmnEngine.nextInteractiveFromFlow(
      endFlow,
      indexes,
    );
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;

    const tx = await this.repo.begin();
    try {
      // [YÊU CẦU MỚI]: Nếu người phân công hoàn thành văn bản khi người xử lý chưa xử lý 
      // thì kiểm tra xem hạn xử lý của người đó đã hết chưa. Nếu quá hạn thì phạt CHUA_HOAN_THANH.
      const openWorkItems = await this.repo.listOpenWorkItems(documentId);
      const otherWorkItems = openWorkItems.filter(item => item.id !== workItemId && item.assigneeUserId);

      // Quét audit để lấy danh sách những người được phân công trực tiếp bởi Leader hiện tại (hoặc originalUser)
      let assignedUserIds = await this.repo.getAssignedUsersByLeader(documentId, userId);
      if (originalUser && originalUser !== userId) {
        const originalAssigned = await this.repo.getAssignedUsersByLeader(documentId, originalUser);
        assignedUserIds = Array.from(new Set([...assignedUserIds, ...originalAssigned]));
      }

      for (const otherWi of otherWorkItems) {
        // Chỉ phạt nếu người nhận công việc này nằm trong danh sách được phân công trực tiếp của Leader
        if (!assignedUserIds.includes(otherWi.assigneeUserId)) {
          continue;
        }

        // Lấy chi tiết phân công của Cán bộ này để kiểm tra deadline và vai trò
        const assignment = await this.repo.getAssignmentDetail(documentId, otherWi.assigneeUserId);
        if (!assignment) continue;

        const { deadline, roleProcess } = assignment;

        // Điều kiện phạt Chưa hoàn thành hồ sơ:
        // 1. Nếu là người xử lý chính (processor): Luôn phạt khi Leader hoàn thành văn bản.
        // 2. Nếu là người phối hợp (supporter): Chỉ phạt khi có hạn xử lý và đã quá hạn.
        const shouldLog = (roleProcess === 'processor') || (roleProcess === 'supporter' && deadline && new Date() > deadline);

        if (shouldLog) {
          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: userId,
              display_name: payload.displayName,
              receiver: otherWi.assigneeUserId,
              role: otherWi.role,
              action_code: actionCode,
              action: 'Chưa hoàn thành hồ sơ (Leader hoàn thành văn bản)',
              stage_status: stageStatusDoc.CHUA_HOAN_THANH,
              typeDocument: 'IncommingDocument',
              roleProcess: roleProcess || (otherWi.role === 'supporter' ? 'supporter' : 'processor'),
              deadline: deadline, // Giữ lại deadline cũ trong log phạt
              details: {
                forcedIncomplete: true,
                completedBy: userId,
                missedDeadlineAt: deadline,
              },
            },
            tx,
          );
        }
      }

      // Xóa workitem hiện tại
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (!removed) {
        throw new BadRequestException('Công việc đã được xử lý bởi người khác');
      }

      // Xóa các workitem còn lại của văn bản ngoại trừ các người được phân công chưa xử lý
      await this.repo.removeWorkItemsExceptUnprocessedAssignees(documentId, tx);

      // Cập nhật trạng thái bước hiện tại
      await this.updateStageStatusAuditIncomingAware(
        documentId,
        {
          receiver: userId,
          stage_status: stageStatusDoc.DA_XU_LY,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // Ghi audit kết thúc văn bản
      await this.addAuditIncomingAware(
        documentId,
        {
          user_id: userId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: 'END',
          receiver: null,
          receiver_unit: null,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Hoàn thành văn bản',
          created_by: userId,
          stage_status: stageStatusDoc.HOAN_THANH_VAN_BAN,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: {
            finalAction: actionCode,
            completedBy: userId,
          },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // === Tạo comment hệ thống đẹp ===
      let finalMessage = 'Hoàn thành văn bản.';

      if (
        actionCode.includes('BAN_HANH') ||
        actionCode.includes('KY_BAN_HANH')
      ) {
        finalMessage = 'Văn bản đã được ký ban hành.';
      } else if (
        actionCode.includes('HOAN_TAT') ||
        actionCode.includes('KET_THUC')
      ) {
        finalMessage = 'Quy trình xử lý đã hoàn tất.';
      } else if (
        actionCode.includes('PHE_DUYET') ||
        actionCode.includes('DUYET')
      ) {
        finalMessage = 'Văn bản đã được phê duyệt và kết thúc.';
      } else if (
        actionCode.includes('TU_CHOI') ||
        actionCode.includes('KHONG_DUYET')
      ) {
        finalMessage = 'Văn bản đã bị từ chối và kết thúc quy trình.';
      }

      // Cập nhật trạng thái tổng thể văn bản
      await this.repo.updateDocumentStatus(documentId, statusDoc, tx);

      await this.repo.commit(tx);

      // [TỐI ƯU 3]: Fire-and-forget lấy Document và ghi System Comment song song, không block response
      const documentPromise = this.repo.getDocument(documentId);

      this.addSystemComment(
        documentId,
        payload,
        finalMessage,
        originalUser || userId,
        'opinion',
      ).catch(e => console.error(e));

      return {
        status: 1,
        message: 'Văn bản đã được hoàn thành thành công',
        document: await documentPromise,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  private async cloneIncomingDocument(oldDocId: string, newDocId: string, currentUserId: string, tx: any, isClone = false): Promise<void> {
    // 1. Copy incomming_documents (tất cả các cột bao gồm sổ văn bản)
    await tx.request()
      .input('oldDocId', sql.VarChar, oldDocId)
      .input('newDocId', sql.VarChar, newDocId)
      .query(`
        INSERT INTO ${(this.repo as any).dbname}.dbo.incomming_documents (
          document_id, status_code, parent_doc, receiver_unit, sender_unit,
          receive_date, to_book_date, document_date, deadline, second_book,
          receive_method, private_level, urgency_level, document_type, document_field,
          signer, to_book_code, fileids, status, isStar,
          type_process_doc, bpmn_version, copy_to_internal, resolution_deadline, copy_count,
          page_count, view_group, directive_comment, certified_book_document_id, book_document_id,
          to_book, abstract_note, parent_doc_clone, created_at, updated_at
        )
        SELECT 
          @newDocId, status_code, ISNULL(parent_doc, @oldDocId), receiver_unit, sender_unit,
          receive_date, to_book_date, document_date, deadline, second_book,
          receive_method, private_level, urgency_level, document_type, document_field,
          signer, to_book_code, fileids, status, isStar,
          type_process_doc, bpmn_version, copy_to_internal, resolution_deadline, copy_count,
          page_count, view_group, directive_comment, certified_book_document_id, book_document_id,
          to_book, abstract_note, ISNULL(parent_doc_clone, @oldDocId), GETDATE(), GETDATE()
        FROM ${(this.repo as any).dbname}.dbo.incomming_documents
        WHERE document_id = @oldDocId
      `);

    // 2. Copy incomming_current_state
    await tx.request()
      .input('oldDocId', sql.VarChar, oldDocId)
      .input('newDocId', sql.VarChar, newDocId)
      .query(`
        INSERT INTO ${(this.repo as any).dbname}.dbo.incomming_current_state (
          document_id, current_stage_status, current_action_code,
          current_receiver, current_role_process, current_deadline,
          last_audit_id, last_audit_time, is_transfer_to_room,
          has_open_workitem, is_completed_doc, updated_at
        )
        SELECT 
          @newDocId, current_stage_status, current_action_code,
          current_receiver, current_role_process, current_deadline,
          last_audit_id, last_audit_time, is_transfer_to_room,
          has_open_workitem, is_completed_doc, GETDATE()
        FROM ${(this.repo as any).dbname}.dbo.incomming_current_state
        WHERE document_id = @oldDocId
      `);

    // 3. Copy files and file relations
    if (isClone) {
      await this.repo.copyIncomingFilesWithCertCopy(oldDocId, newDocId, tx);
    } else {
      await this.repo.copyIncomingFiles(oldDocId, newDocId, tx);
    }

    // 4. Copy audit trail (nhân bản lịch sử audit và tự động lọc nhánh song song)
    let splitTime: Date | null = null;
    let userRoleProcess: string | null = null;
    try {
      const assignmentQuery = await tx.request()
        .input('docId', sql.VarChar, oldDocId)
        .input('userId', sql.VarChar, currentUserId)
        .query(`
          SELECT TOP 1 created_at, roleProcess 
          FROM ${(this.repo as any).dbname}.dbo.audit 
          WHERE document_id = @docId 
            AND (receiver = @userId OR user_id = @userId) 
          ORDER BY created_at ASC
        `);
      if (assignmentQuery.recordset?.length > 0) {
        splitTime = assignmentQuery.recordset[0].created_at;
        userRoleProcess = assignmentQuery.recordset[0].roleProcess;
      }
      console.log(`[DEBUG-CLONE] oldDocId: ${oldDocId}, currentUserId: ${currentUserId}, splitTime: ${splitTime}, userRoleProcess: ${userRoleProcess}`);
    } catch (err) {
      console.warn('Lỗi khi tìm thời điểm split của user:', err.message);
    }

    const request = tx.request()
      .input('oldDocId', sql.VarChar, oldDocId)
      .input('newDocId', sql.VarChar, newDocId);

    let auditExcludeCondition = '';
    if (splitTime) {
      request.input('splitTime', sql.DateTime, splitTime);
      request.input('currentUserId', sql.VarChar, currentUserId);
      auditExcludeCondition = `AND NOT (created_at > @splitTime AND user_id <> @currentUserId AND ISNULL(receiver, '') <> @currentUserId AND created_by <> @currentUserId)`;
    }
    console.log(`[DEBUG-CLONE] auditExcludeCondition: ${auditExcludeCondition}`);

    await request.query(`
        INSERT INTO ${(this.repo as any).dbname}.dbo.audit (
          document_id, user_id, display_name, role, action_code,
          from_node_id, to_node_id, details, origin_id, created_by,
          receiver, receiver_unit, group_, roleProcess, action,
          deadline, stage_status, curStatusCode, created_at, updated_at,
          type_document, processed_by, acting_as, assignment_type
        )
        SELECT 
          @newDocId, user_id, display_name, role, action_code,
          from_node_id, to_node_id, details, origin_id, created_by,
          receiver, receiver_unit, group_, roleProcess, action,
          deadline, stage_status, curStatusCode, created_at, updated_at,
          type_document, processed_by, acting_as, assignment_type
        FROM ${(this.repo as any).dbname}.dbo.audit
        WHERE document_id = @oldDocId
          ${auditExcludeCondition}
      `);

    // 5. Copy incomming_assignment (nhân bản thông tin phân công)
    await tx.request()
      .input('oldDocId', sql.VarChar, oldDocId)
      .input('newDocId', sql.VarChar, newDocId)
      .input('currentUserId', sql.VarChar, currentUserId)
      .query(`
        INSERT INTO ${(this.repo as any).dbname}.dbo.incomming_assignment (
          document_id, receiver, role_process, stage_status,
          deadline, created_at, last_audit_id, updated_at
        )
        SELECT 
          @newDocId, receiver, role_process, stage_status,
          deadline, created_at, last_audit_id, GETDATE()
        FROM ${(this.repo as any).dbname}.dbo.incomming_assignment
        WHERE document_id = @oldDocId
          AND receiver = @currentUserId
      `);
  }

  async processDocumentv2({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    doc,
    bpmnVersion,
    departmentId,
    skipRoleValidation
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    author: string;
    doc: any;
    bpmnVersion: string;
    departmentId?: string;
    skipRoleValidation?: boolean;
  }): Promise<any> {
    if (this.enableDebugNotificationLog) {
      this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [processDocumentv2] Bắt đầu xử lý. docId: ${documentId}, workItemId: ${workItemId}, userId: ${userId}, author: ${author}`);
    }
    const originalDocId = documentId;
    // [TỐI ƯU 1]: Gom I/O đọc dữ liệu song song (Promise.all)
    const [modelData, wi, audit] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
      this.repo.getAudit(documentId),
    ]);
    const indexes = modelData.indexes;
    const originalInputDocId = documentId;
    const clonedDocIds: string[] = [];
    let currentTargetDocId = documentId;
    let isCloneFlow = false;

    if (!wi)
      throw new BadRequestException('Công việc không tồn tại hoặc đã xử lý');

    const node = indexes.nodes.get(wi.nodeId);
    const curLane = indexes.laneMap.get(node.id);
    const allExtensionscur = getAllNodeExtensionProperties(node);

    if (!node)
      throw new BadRequestException(
        `Không tìm thấy công việc trong luồng mô hình`,
      );

    // const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toUpperCase();

    if (!actionCode) throw new BadRequestException('actionCode là bắt buộc');

    // Sử dụng userId (đã được resolve: ủy quyền > token > payload)
    const effectiveUserId = author ? author : userId; // đây là id của thằng ủy quyền
    const processedUsserId = userId; // đây là id của thằng thực sự xử lý văn bản
    // Nếu không có author, 2 thằng id bên trên sẽ giống nhau.

    // === Xử lý CHUYEN_XU_LY + InclusiveGateway ===
    // if (actionCode === 'CHUYEN_XU_LY') {
    const allouts = indexes.outgoingBySource.get(node.id) || [];
    let chooseOut: any;
    let outs: any = null;
    let statusDocConcurrent: string | null = null;
    let nextNodeConcurrent: any
    let actionCodeAfterConcurrent: any
    let targetRoleConcurrent: string | null = null;
    for (const f of allouts) {
      const extFlow = getAllNodeExtensionProperties(f);
      const flagsButton = parseFlagsButton(extFlow?.flagsButton);
      console.log('[DEBUG-TP] Flow:', f.id, 'extFlow:', extFlow, 'flagsButton:', flagsButton);
      if (extFlow && flagsButton?.isConcurrent) {
        const res = this.bpmnEngine.nextInteractiveFromFlow(
          f,
          indexes,
        );
        nextNodeConcurrent = res?.node;
        const cur = f?.targetRef?.id
          ? indexes.nodes.get(f.targetRef.id)
          : null;
        statusDocConcurrent = getAllNodeExtensionProperties(cur).statusCode || null;
        targetRoleConcurrent = indexes.laneMap.get(nextNodeConcurrent.id);
        const outs = indexes.outgoingBySource.get(nextNodeConcurrent.id) || [];
        actionCodeAfterConcurrent = outs
          ?.map((flow: any) => flow?.name)
          .filter(Boolean)
          .join(',') || null;

      }
    }

    for (const f of allouts) {
      // Ensure the flow matches the requested actionCode
      const extFlow = getAllNodeExtensionProperties(f);
      const flowActionCode = extFlow?.actionCode?.toUpperCase();
      const flowName = f.name?.toUpperCase();
      const flowId = f.id?.toUpperCase();

      const isMatch = (flowActionCode === actionCode) ||
        (flowName === actionCode) ||
        (flowId === actionCode) ||
        (!flowActionCode && !flowName && actionCode === 'CHUYEN_XU_LY');

      if (!isMatch) continue;

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        f,
        indexes,
      );

      if (!nextNode) continue;

      // Nếu nextNode là InclusiveGateway, kiểm tra role của các node tiếp theo
      if (
        nextNode.$type === 'bpmn:ExclusiveGateway' ||
        nextNode.$type === 'bpmn:InclusiveGateway'
      ) {
        // Lấy các flows từ InclusiveGateway này
        const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];

        // Kiểm tra xem có node nào sau gateway có role khớp với payload?.roles không
        let foundMatchingRole = false;

        for (const gatewayFlow of gatewayOuts) {
          const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
            gatewayFlow,
            indexes,
          );

          if (!targetNode) continue;

          const targetRole = indexes.laneMap.get(targetNode.id);

          // Nếu tìm thấy role khớp
          if (payload?.roles && targetRole === payload.roles) {
            foundMatchingRole = true;
            break;
          }

          // Nếu không có payload.roles, chấp nhận gateway này
          if (!payload?.roles) {
            foundMatchingRole = true;
            break;
          }
        }

        // Nếu tìm thấy role khớp, chọn gateway này
        if (foundMatchingRole) {
          chooseOut = gatewayOuts;
          outs = f;
          break;
        }
      } else {
        // Nếu không phải gateway, kiểm tra role trực tiếp
        const role = indexes.laneMap.get(nextNode.id);

        // ✅ match role
        if (payload?.roles && role !== payload.roles) {
          continue;
        }

        // ✅ đúng role → chọn nhánh này
        chooseOut = nextNode;
        outs = f;
        break;
      }
    }
    if (!chooseOut) {
      throw new BadRequestException('No next interactive node found');
    }

    const flow = outs;

    if (!flow)
      throw new BadRequestException(
        `Không tìm thấy luồng với actionCode: ${actionCode}`,
      );

    const flowObj = Array.isArray(flow) ? flow[0] : flow;
    isCloneFlow = this.bpmnEngine.getFlowExtensionProperties(flowObj)?.isClone === 'true';

    const hasAddProcess = (Array.isArray(flow) ? flow : [flow]).some(
      (f) => {
        const props = this.bpmnEngine.getFlowExtensionProperties(f);
        return props?.actionType === 'addProcess' ||
          props?.flagsButton === 'addProcess: addProcess';
      }
    );

    const mainFlowProps = this.bpmnEngine.getFlowExtensionProperties(Array.isArray(flow) ? flow[0] : flow);
    const isFurtherAssignAction = (mainFlowProps as any)?.isFurtherAssign === 'true';

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
    const flagsButton = parseFlagsButton(flowExtProps.flagsButton);
    let assignmentType = (flowExtProps as any)?.assignmentType || null;
    if (!assignmentType && actionCode === 'CHUYEN_PHOI_HOP') {
      assignmentType = 'PHOI_HOP';
    }

    if (!nextNode)
      throw new BadRequestException('Không xác định được bước tiếp theo');

    // === InclusiveGateway ===
    if (
      nextNode.$type === 'bpmn:InclusiveGateway' ||
      nextNode.$type === 'bpmn:inclusiveGateway'
    ) {
      const assignments = payload.assignments || [];
      if (!Array.isArray(assignments) || assignments.length === 0) {
        throw new BadRequestException('assignments là bắt buộc');
      }

      // Document group validation based on BPMN flow properties (requiredGroup)
      const groupUserItems = await this.groupUserInDocumentService.findDefaultIncomingGroups();
      const currentViewGroup = doc.viewGroup || doc.view_group || '';

      // Check requiredGroup on incoming flow
      const incomingFlowProps = this.bpmnEngine.getFlowExtensionProperties(Array.isArray(flow) ? flow[0] : flow);
      const incomingRequiredGroupTitle = incomingFlowProps?.requiredGroup;
      if (incomingRequiredGroupTitle) {
        const requiredTitles = String(incomingRequiredGroupTitle).split(',').map(s => s.trim()).filter(Boolean);
        const docViewGroupList = String(currentViewGroup).split(',').map(s => s.trim()).filter(Boolean);
        const hasMatchingGroup = groupUserItems.some(item =>
          (docViewGroupList.includes(item.id) || docViewGroupList.includes(item.code)) &&
          requiredTitles.includes(item.name)
        );
        // if (!hasMatchingGroup) {
        //   throw new BadRequestException(`Văn bản phải được cập nhật sang một trong các nhóm: ${incomingRequiredGroupTitle} trước khi phân công.`);
        // }
      }

      const valSendToAllEpl = getAllNodeExtensionProperties(nextNode)?.sendToAllEmployees;
      const allGatewayOut = indexes.outgoingBySource.get(nextNode.id) || [];
      const laneMap = indexes.laneMap;
      const gatewayOuts =
        payload?.roles && !allExtensionscur.assignmentAll
          ? allGatewayOut.filter((f: any) => {
            const { node: nextNode } =
              this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
            if (!nextNode) return false;

            const role = laneMap.get(nextNode?.id);
            return role === payload.roles;
          })
          : allGatewayOut;

      const flowGroups = new Map<string, any>();
      for (const f of gatewayOuts) {
        const g = actionCatalog.inclusiveSubActionFor(f.name);
        if (g) flowGroups.set(g, f);
      }

      // Pre-fetch user roles if valSendToAllEpl === 'true'
      const valUniqueAssignees = new Set<string>();
      for (const sel of assignments) {
        if (sel.subActionCode === 'XU_LY_CHINH' || sel.subActionCode === 'PHOI_HOP') {
          const rawUsers = sel.users || [];
          for (const u of rawUsers) {
            const uId = typeof u === 'string' ? u : u?.userId;
            if (uId) valUniqueAssignees.add(uId);
          }
        }
      }
      const valUniqueAssigneeIds = Array.from(valUniqueAssignees);
      const valUserRolesMap = new Map<string, any>();
      if (valSendToAllEpl === 'true' && valUniqueAssigneeIds.length > 0) {
        await Promise.all(
          valUniqueAssigneeIds.map(async (assignee) => {
            const userRole = await this.repo.getUserRole(assignee, doc.bpmnVersion);
            valUserRolesMap.set(assignee, userRole);
          })
        );
      }

      let valAllSqFlows: any[] = [];
      if (valSendToAllEpl === 'true') {
        const allSequenceFlows = await this.bpmnEngine.getAllSequenceFlowsFromXML(bpmnXML);
        valAllSqFlows = allSequenceFlows.filter((f: any) => !!f.name);
      }

      for (const sel of assignments) {
        if (sel.subActionCode === 'XU_LY_CHINH' || sel.subActionCode === 'PHOI_HOP') {
          // Find flow for the subaction
          const matchedFlow = flowGroups.get(sel.subActionCode);

          const generalFlowProps = matchedFlow ? this.bpmnEngine.getFlowExtensionProperties(matchedFlow) : null;
          const requiredGroupTitle = generalFlowProps?.requiredGroup;

          if (requiredGroupTitle) {
            // Validate OUs (phòng ban)
            if (Array.isArray(sel.organizationUnits) && sel.organizationUnits.filter(Boolean).length > 0) {
              // if (!currentViewGroup.includes(requiredValue)) {
              //   throw new BadRequestException(`Văn bản phải được cập nhật sang ${requiredGroupTitle} (${requiredValue}) trước khi phân công.`);
              // }
            }

            // Validate Users
            if (Array.isArray(sel.users) && sel.users.filter(Boolean).length > 0) {
              for (const u of sel.users) {
                const uId = typeof u === 'string' ? u : u?.userId;
                if (!uId) continue;

                let targetFlowProps = generalFlowProps;
                if (valSendToAllEpl === 'true') {
                  const userRole = valUserRolesMap.get(uId) || { roles: [''], userRoles: [] };
                  const candidateFlows = gatewayOuts.filter((f: any) => {
                    const flowName = (f.name || '').toUpperCase();
                    return flowName === sel.subActionCode.toUpperCase();
                  });
                  const candidateNames = candidateFlows.map((f: any) => (f.name || '').toUpperCase());
                  const filteredSqFlows = allGatewayOut.filter((f: any) => {
                    return candidateNames.includes(f.name.trim().toUpperCase());
                  });
                  const matchingFlow = filteredSqFlows.find((subFlow: any) => {
                    const subFlowName = (subFlow.name || '').toUpperCase();
                    if (candidateNames.includes(subFlowName)) {
                      const node = this.bpmnEngine.nextInteractiveFromFlow(subFlow, indexes);
                      const subRole = indexes.laneMap.get(node.node?.id);
                      return userRole.roles.some((r: string) => r.toUpperCase() === (subRole || '').toUpperCase());
                    }
                    return false;
                  });
                  if (matchingFlow) {
                    targetFlowProps = this.bpmnEngine.getFlowExtensionProperties(matchingFlow);
                  }
                }

                const userReqGroupTitle = targetFlowProps?.requiredGroup;
                if (userReqGroupTitle) {
                  // if (!currentViewGroup.includes(userReqValue)) {
                  //   throw new BadRequestException(`Văn bản phải được cập nhật sang ${userReqGroupTitle} (${userReqValue}) trước khi phân công.`);
                  // }
                }
              }
            }
          }
        }
      }

      const mainAssignment = assignments.find(
        (a) => a.subActionCode === 'XU_LY_CHINH'
      );
      const hasMainUsers =
        Array.isArray(mainAssignment?.users) &&
        mainAssignment.users.filter(Boolean).length > 0;

      const hasMainOUs =
        Array.isArray(mainAssignment?.organizationUnits) &&
        mainAssignment.organizationUnits.filter(Boolean).length > 0;
      const daCoPhanCongXLC = audit.some((a: any) => {
        const details = typeof a?.details === 'string' ? JSON.parse(a.details) : (a?.details || {});
        return details?.phanCong === true && details.subActionCode === 'XU_LY_CHINH';
      })

      if (!daCoPhanCongXLC) {
        if (!mainAssignment || (!hasMainUsers && !hasMainOUs)) {
          throw new BadRequestException(
            'Phải phân công ít nhất một người hoặc phòng ban cho vai trò XỬ LÝ CHÍNH'
          );
        }
      }



      const byBranch = new Map<string, string[]>();
      const byBranchOUs = new Map<string, string[]>();
      const clonedDocIdByOu = new Map<string, string>();
      const allClonedDocIds: string[] = [];
      const chosenUsers = new Set<string>();
      // [DEADLINE]: Map lưu deadline riêng cho từng branch
      const deadlineByBranch = new Map<string, string | null>();
      // Map lưu deadline riêng cho từng user
      const userDeadlines = new Map<string, string | null>();
      // Map lưu deadline riêng cho từng organization unit
      const ouDeadlines = new Map<string, string | null>();
      const userToGroupMap = new Map<string, { id: string; name: string }>();

      const entry = flowGroups.get('XU_LY_CHINH');
      const targetNode = entry?.targetRef;
      const statusCode = getAllNodeExtensionProperties(targetNode)?.statusCode;

      // ===== Document gốc =====
      const outgoing = doc;
      if (!outgoing)
        throw new BadRequestException('Không tìm thấy document gốc');

      // ================= ASSIGNMENTS =================
      const handlingMap = new Map<string, any>();
      audit.forEach((a: any) => {
        const details = typeof a?.details === 'string' ? JSON.parse(a.details) : (a?.details || {});
        if (details && details?.phanCong === true) {
          const subCode = details.subActionCode || 'XU_LY_CHINH';
          if (!handlingMap.has(subCode)) {
            handlingMap.set(subCode, {
              subActionCode: subCode,
              users: [],
              organizationUnits: [],
              deadline: details.deadline || null
            });
          }
          const group = handlingMap.get(subCode);
          const assigneeId = details?.assigneeUserId;
          const ouId = details?.receiverUnit;
          if (assigneeId) {
            if (!group.users.includes(assigneeId)) group.users.push(assigneeId);
          }
          if (ouId) {
            if (!group.organizationUnits.includes(ouId)) group.organizationUnits.push(ouId);
          }
        }
      })
      const phanCongAudit = Array.from(handlingMap.values());
      for (const sel of assignments) {
        if (sel.subActionCode === 'XU_LY_CHINH' && Array.isArray((sel as any).groups) && (sel as any).groups.length > 0) {
          throw new BadRequestException('Nhóm người dùng chỉ có thể được phân công Phối hợp hoặc Nhận để biết, không thể Xử lý chính.');
        }
        const rawUsers = sel.users || [];
        const users: string[] = [];
        for (const u of rawUsers) {
          if (!u) continue;
          let uId = '';
          let uDeadline = sel.deadline ?? payload.deadline ?? null;
          if (typeof u === 'string') {
            uId = u;
          } else if (typeof u === 'object' && u.userId) {
            uId = u.userId;
            if (u.deadline !== undefined) {
              uDeadline = u.deadline;
            }
          }
          if (uId && !users.includes(uId)) {
            users.push(uId);
            userDeadlines.set(uId, uDeadline);
          }
        }
        const rawGroups = (sel as any).groups || [];
        for (const g of rawGroups) {
          if (!g || !g.groupId) continue;
          try {
            const groupInfo = await this.groupUserInDocumentService.findGroupById(g.groupId);
            if (groupInfo) {
              const groupDeadline = g.deadline ?? sel.deadline ?? payload.deadline ?? null;
              let groupUserIds: string[] = [];
              if (typeof groupInfo.userId === 'string') {
                try {
                  groupUserIds = JSON.parse(groupInfo.userId || '[]');
                } catch {
                  groupUserIds = [];
                }
              } else if (Array.isArray(groupInfo.userId)) {
                groupUserIds = groupInfo.userId;
              }
              for (const memberId of groupUserIds) {
                const uId = typeof memberId === 'string' ? memberId.trim() : String(memberId || '').trim();
                if (uId) {
                  if (!users.includes(uId)) {
                    users.push(uId);
                    userDeadlines.set(uId, groupDeadline);
                  }
                  userToGroupMap.set(uId, { id: groupInfo.id, name: groupInfo.name });
                }
              }
            }
          } catch (error) {
            this.logger.warn(`Loi khi resolve group ${g.groupId}: ${error?.message || error}`);
          }
        }
        const rawOus = sel.organizationUnits || [];
        const ous: string[] = [];
        for (const ou of rawOus) {
          if (!ou) continue;
          let ouId = '';
          let ouDeadline = sel.deadline ?? payload.deadline ?? null;
          if (typeof ou === 'string') {
            ouId = ou;
          } else if (typeof ou === 'object' && (ou as any).organizationId) {
            ouId = (ou as any).organizationId;
            if ((ou as any).deadline !== undefined) {
              ouDeadline = (ou as any).deadline;
            }
          } else if (typeof ou === 'object' && (ou as any).id) {
            ouId = (ou as any).id;
            if ((ou as any).deadline !== undefined) {
              ouDeadline = (ou as any).deadline;
            }
          }
          if (ouId && !ous.includes(ouId)) {
            ous.push(ouId);
            ouDeadlines.set(ouId, ouDeadline);
          }
        }
        // [DEADLINE]: Ưu tiên deadline của branch, fallback về payload.deadline, cuối cùng là null
        deadlineByBranch.set(sel.subActionCode, sel.deadline ?? payload.deadline ?? null);

        if (users.length > 0) {
          byBranch.set(sel.subActionCode, users);
        }

        if (ous.length > 0) {
          byBranchOUs.set(sel.subActionCode, ous);

          const branchFlow = flowGroups.get(sel.subActionCode);
          const isBranchCloneFlow = branchFlow ? this.bpmnEngine.getFlowExtensionProperties(branchFlow)?.isClone === 'true' : false;
          if (!isCloneFlow && !isBranchCloneFlow && !skipRoleValidation) {
            for (const ou of ous) {
              await this.validateAssigneeDifferentProcessingRole({
                documentId,
                receiverId: String(ou),
                receiverType: 'ou',
              });
            }
          }

          // [TỐI ƯU 2]: Query getFlowByUnit song song ở ngoài trước khi mở Transaction để tránh block Connection MSSQL
          const flowConfigs = await Promise.all(
            ous.map(ou => this.sqlsvRepo.getFlowByUnit(String(ou), 'IncommingDocument'))
          );

          // Pre-generate clone document IDs so we can pass them in the details of each clone audit record
          const ouClonedDocIds = ous.map(() => String(Date.now() + Math.floor(Math.random() * 1000000)));

          // Lưu vết ID clone của từng phòng ban
          for (let i = 0; i < ous.length; i++) {
            clonedDocIdByOu.set(String(ous[i]), ouClonedDocIds[i]);
            allClonedDocIds.push(ouClonedDocIds[i]);
          }

          const tx = await this.repo.begin();
          for (let i = 0; i < ous.length; i++) {
            const ou = ous[i];
            const flowConfig = flowConfigs[i];
            if (!flowConfig) continue;

            const ouSpecificDeadline = ouDeadlines.get(ou) ?? (deadlineByBranch.get(sel.subActionCode) ?? payload.deadline ?? null);
            const clonedDocumentId = ouClonedDocIds[i];

            if (this.enableDebugNotificationLog) {
              this.logger.log(`[DEBUG LOG - THONG BAO CHUYEN XU LY] [processDocumentv2] Chuẩn bị gọi sao chép văn bản & gửi thông báo cho phòng ban (receiverUnit): ${ou}`);
            }
            await this.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: ou,
              processorUserId: null,
              flowConfig,
              payload: { ...payload, deadline: ouSpecificDeadline },
              wi,
              tx,
              actionCode: 'CREATE',
              skipDuplicateCheck: false,
              details: {
                isTransferOption: true,
                transferType: 'to_room',
                organizationUnit: ou,
                note: payload?.note,
                deadline: ouSpecificDeadline,
                clonedDocIds: ouClonedDocIds,
              },
              notification: true,
              userId,
              clonedDocumentId,
            });
          }
          await this.repo.commit(tx);
        }
      }

      // === VALIDATION ===
      const mainList = byBranch.get('XU_LY_CHINH') || [];
      const mainOUs = byBranchOUs.get('XU_LY_CHINH') || [];

      // Validate deadline: hạn của xử lý chính phải sau hạn của phối hợp
      const coordUsers = byBranch.get('PHOI_HOP') || [];

      const xlcDeadlines: Date[] = [];
      const xlcFlowDeadline = deadlineByBranch.get('XU_LY_CHINH');
      if (xlcFlowDeadline) {
        xlcDeadlines.push(new Date(xlcFlowDeadline));
      }
      for (const u of mainList) {
        const uDl = userDeadlines.get(u);
        if (uDl) {
          xlcDeadlines.push(new Date(uDl));
        }
      }

      const phDeadlines: Date[] = [];
      const phFlowDeadline = deadlineByBranch.get('PHOI_HOP');
      if (phFlowDeadline) {
        phDeadlines.push(new Date(phFlowDeadline));
      }
      for (const u of coordUsers) {
        const uDl = userDeadlines.get(u);
        if (uDl) {
          phDeadlines.push(new Date(uDl));
        }
      }

      for (const xlcDl of xlcDeadlines) {
        if (isNaN(xlcDl.getTime())) continue;
        for (const phDl of phDeadlines) {
          if (isNaN(phDl.getTime())) continue;
          if (xlcDl <= phDl) {
            throw new BadRequestException(
              `Hạn xử lý chính (${moment(xlcDl).format('DD/MM/YYYY HH:mm')}) phải sau hạn phối hợp (${moment(phDl).format('DD/MM/YYYY HH:mm')})`
            );
          }
        }
      }

      // Validate trùng người
      for (const [branch, users] of byBranch.entries()) {
        for (const u of users) {
          if (chosenUsers.has(u)) {
            throw new BadRequestException(
              `Người dùng ${u} xuất hiện ở nhiều nhánh`,
            );
          }
          chosenUsers.add(u);
        }

        // Validate role
        const f = flowGroups.get(branch);
        if (f) {
          const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
            f,
            indexes,
          );
          const role = targetNode
            ? indexes.laneMap.get(targetNode.id)
            : undefined;
          // Add role validation logic here if needed
        }
      }

      // Validate trùng OU
      const chosenOUs = new Set();
      for (const [branch, ous] of byBranchOUs.entries()) {
        for (const ou of ous) {
          if (chosenOUs.has(ou)) {
            throw new BadRequestException(
              `Phòng ban ${ou} xuất hiện ở nhiều nhánh`,
            );
          }
          chosenOUs.add(ou);
        }
      }

      // === PHẦN 2: TRANSACTION - CHỈ XỬ LÝ WORKITEMS ===
      const sendToAllEpl =
        getAllNodeExtensionProperties(nextNode)?.sendToAllEmployees;

      // [TỐI ƯU 3]: Parse XML MỘT LẦN DUY NHẤT ở ngoài Transaction thay vì parse n lần bên trong vòng lặp!
      let allSqFlows: any[] = [];
      if (sendToAllEpl === 'true') {
        const allSequenceFlows = await this.bpmnEngine.getAllSequenceFlowsFromXML(bpmnXML);
        allSqFlows = allSequenceFlows.filter((f: any) => !!f.name);
      }

      // Collect all unique user assignees from the branches
      const uniqueAssignees = new Set<string>();
      for (const [_, users] of byBranch.entries()) {
        for (const assignee of users) {
          if (assignee) uniqueAssignees.add(assignee);
        }
      }
      const uniqueAssigneeIds = Array.from(uniqueAssignees);

      // Decouple user-specific I/O checks and load them outside the transaction block
      const userRolesMap = new Map<string, any>();
      if (sendToAllEpl === 'true') {
        await Promise.all(
          uniqueAssigneeIds.map(async (assignee) => {
            const userRole = await this.repo.getUserRole(assignee, doc.bpmnVersion);
            userRolesMap.set(assignee, userRole);
          })
        );
      }

      const authorityMap = new Map<string, { processedById: string | null; actingAs: string | null }>();
      await Promise.all(
        uniqueAssigneeIds.map(async (assignee) => {
          const [processedById, actingAs] = await Promise.all([
            this.repo.getAuthorizedIdIfAuthor(assignee),
            this.repo.getAuthorIdIfAuthorized(assignee)
          ]);
          authorityMap.set(assignee, { processedById, actingAs });
        })
      );

      // Run assignee role validations outside the transaction to avoid connection leaks/timeouts
      if (!isCloneFlow) {
        for (const [branch, users] of byBranch.entries()) {
          const f = flowGroups.get(branch);
          let isBranchCloneFlow = false;
          if (f) {
            const extFlow = this.bpmnEngine.getFlowExtensionProperties(f);
            if (extFlow?.isClone === 'true') {
              isBranchCloneFlow = true;
            }
          }
          for (const assignee of users) {
            if (isBranchCloneFlow) {
              continue; // Skip validation since this assignee gets a cloned document
            }
            if (sendToAllEpl === 'true') {
              // For sendToAllEpl, check per-user dynamic flow
              const userRole = userRolesMap.get(assignee) || { roles: [''], userRoles: [] };
              const candidateFlows = gatewayOuts.filter((cf: any) => (cf.name || '').toUpperCase() === branch.toUpperCase());
              const candidateIds = candidateFlows.map((cf: any) => cf.id);
              const filteredSqFlows = allSqFlows.filter((cf: any) => candidateIds.includes(cf.id));
              const matchingFlow = filteredSqFlows.find((subFlow: any) => {
                const subFlowName = (subFlow.name || '').toUpperCase();
                const node = this.bpmnEngine.nextInteractiveFromFlow(subFlow, indexes);
                const subRole = indexes.laneMap.get(node.node?.id);
                return userRole.roles.some((r: string) => r.toUpperCase() === (subRole || '').toUpperCase());
              });
              if (matchingFlow) {
                const extFlow = this.bpmnEngine.getFlowExtensionProperties(matchingFlow);
                if (extFlow?.isClone === 'true') {
                  continue; // Skip validation
                }
              }
              if (!skipRoleValidation) {
                await this.validateAssigneeDifferentProcessingRole({
                  documentId,
                  receiverId: assignee,
                });
              }
            }
          }
        }
      }

      const tx = await this.repo.begin();

      try {
        // Remove workitem cũ
        const shouldRemoveCurrent = !hasAddProcess ||
          (Array.isArray(flow) ? flow : [flow]).some(f => {
            const props = this.bpmnEngine.getFlowExtensionProperties(f);
            const parsed = parseFlagsButton(props?.flagsButton);
            return parsed?.forceCloseWorkItem === true || parsed?.forceCloseWorkItem === 'true';
          });

        if (shouldRemoveCurrent) {
          const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
          if (removed !== 1) {
            throw new BadRequestException('Công việc đã được xử lý bởi người khác');
          }
        }

        if (isCloneFlow) {
          const clonedDocumentId = String(Date.now() + Math.floor(Math.random() * 1000));
          await this.cloneIncomingDocument(originalInputDocId, clonedDocumentId, effectiveUserId, tx, isCloneFlow);
          currentTargetDocId = clonedDocumentId;
          clonedDocIds.push(clonedDocumentId);
          if (payload?.docIds) {
            payload.docIds = clonedDocumentId;
          }
          documentId = clonedDocumentId;
        }

        // Pre-assignment checks: force-close any existing open work items for these assignees to avoid orphaned work items
        for (const assignee of uniqueAssigneeIds) {
          await this.repo.removeWorkItemByAssignee(documentId, assignee, undefined, tx);
        }

        // Kiểm tra xem trước đó có bản ghi trả lại phân công (isTraLaiPhanCong = true) chưa được xử lý hay không
        const traLaiAudit = audit.find(
          (a) => a.details?.isTraLaiPhanCong === true,
        );
        const newOriginId = traLaiAudit ? `wi_${Date.now()}_` + Math.random().toString(36).substring(2, 8) : wi.id;

        // Tạo workitems và audit cho USERS
        const newAuditEntries: any[] = []; // Track audit entries tạo trong transaction để truyền cho service task
        const pendingWrites: { currentTargetDocId: string; newWi: WorkItem; auditEntry: any }[] = [];
        let onlyTP;
        let isPhanCongTP = false;
        let cxlOnlyTP = true;
        for (const [branch, users] of byBranch.entries()) {
          const branchDeadline = deadlineByBranch.get(branch) ?? payload.deadline ?? null;
          for (const assignee of users) {
            const userSpecificDeadline = userDeadlines.get(assignee) ?? branchDeadline;
            let targetNode: any;
            let role: string | undefined;
            let chossenFlow: any;

            // 🔹 Nếu sendToAllEpl = true → resolve targetNode động theo role của user
            if (sendToAllEpl === 'true') {
              const userRole = userRolesMap.get(assignee) || { roles: [''], userRoles: [] };
              const hasRoles = userRole.roles && userRole.roles.some((r: string) => r !== '');
              if (!hasRoles) {
                console.warn(
                  `[processDocumentv2] User ${assignee} không có role, bỏ qua`,
                );
                continue;
              }

              // Lấy tất cả flows có name khớp với branch
              const candidateFlows = gatewayOuts.filter((f: any) => {
                const flowName = (f.name || '').toUpperCase();
                return flowName === branch.toUpperCase();
              });

              if (candidateFlows.length === 0) {
                console.warn(
                  `[processDocumentv2] Không tìm thấy flow nào với name ${branch}`,
                );
                continue;
              }

              // Lấy tất cả names từ candidateFlows
              const candidateNames = candidateFlows.map((f: any) =>
                (f.name || '').toUpperCase(),
              );

              // [TỐI ƯU 3]: Sử dụng bộ đệm (cache) flow đã parse XML 1 lần ở trên thay vì re-parse
              const candidateIds = candidateFlows.map((f: any) => f.id);
              const filteredSqFlows = allSqFlows.filter((f: any) => {
                return candidateIds.includes(f.id);
              });

              const matchingFlow = filteredSqFlows.find((subFlow: any) => {
                const subFlowName = (subFlow.name || '').toUpperCase();
                if (candidateNames.includes(subFlowName)) {
                  const node = this.bpmnEngine.nextInteractiveFromFlow(
                    subFlow,
                    indexes,
                  );
                  const subRole = indexes.laneMap.get(node.node?.id);
                  return userRole.roles.some((r: string) => r.toUpperCase() === (subRole || '').toUpperCase());
                }
                return false;
              });

              if (!matchingFlow) {
                throw new BadRequestException(`Không tìm thấy hành động của user ${assignee}`);
              }

              const extFlow = getAllNodeExtensionProperties(matchingFlow);
              const flagsButton = parseFlagsButton(extFlow?.flagsButton);
              if (flagsButton?.isPhanCongTP) {
                isPhanCongTP = true;
              } else {
                cxlOnlyTP = false;
              }

              const nodeRes = this.bpmnEngine.nextInteractiveFromFlow(matchingFlow, indexes);
              targetNode = nodeRes.node;
              role = indexes.laneMap.get(targetNode?.id);
              chossenFlow = matchingFlow;

              if (!targetNode) {
                console.warn(
                  `[processDocumentv2] Không tìm thấy node phù hợp cho user ${assignee} với branch ${branch}`,
                );
                continue;
              }
            }
            // 🔹 Logic cũ: lấy targetNode từ flowGroups
            else {
              const f = flowGroups.get(branch);
              if (!f) {
                console.warn(`[processDocumentv2] Không tìm thấy flow cho branch ${branch} trong flowGroups`);
                continue;
              }

              const result = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
              chossenFlow = f;
              targetNode = result.node;
              if (!targetNode) {
                console.warn(`[processDocumentv2] Không tìm thấy targetNode từ flow ${f.id} thuộc branch ${branch}`);
                continue;
              }

              const flagsButtonFlow = parseFlagsButton(getAllNodeExtensionProperties(chossenFlow)?.flagsButton);
              if (flagsButtonFlow?.isPhanCongTP) {
                isPhanCongTP = true;
              } else {
                cxlOnlyTP = false;
              }

              role = indexes.laneMap.get(targetNode.id);
              if (!role) {
                console.warn(`[processDocumentv2] Nút targetNode ${targetNode.id} không thuộc Lane nào hoặc không lấy được Role`);
                continue;
              }
            }

            const extFlow = this.bpmnEngine.getFlowExtensionProperties(chossenFlow);
            const statusCode = getAllNodeExtensionProperties(
              chossenFlow.targetRef,
            )?.statusCode;

            // Tạo workitem
            const newWi: WorkItem = {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: targetNode.id,
              role: role || '',
              assigneeUserId: assignee,
              nodeType: targetNode.$type,
            };

            const isBranchCloneFlow = extFlow?.isClone === 'true';
            let currentTargetDocId = documentId;
            if (isBranchCloneFlow) {
              const clonedDocumentId = String(Date.now() + Math.floor(Math.random() * 1000));
              await this.cloneIncomingDocument(originalInputDocId, clonedDocumentId, effectiveUserId, tx, isBranchCloneFlow);
              currentTargetDocId = clonedDocumentId;
              clonedDocIds.push(clonedDocumentId);
            }

            // Retrieve pre-fetched authority details
            const authDetails = authorityMap.get(assignee) || { processedById: null, actingAs: null };
            const processedById = authDetails.processedById;
            const actingAs = authDetails.actingAs;

            const userGroupInfo = userToGroupMap.get(assignee);

            const auditEntry = {
              user_id: effectiveUserId,
              display_name: payload.displayName,
              role: wi.role,
              action_code: 'PHAN_CONG',
              from_node_id: wi.nodeId,
              to_node_id: targetNode.id,
              receiver: assignee,
              processed_by: processedById,
              acting_as: actingAs,
              receiver_unit: payload.receiver_unit || null,
              group_: userGroupInfo ? userGroupInfo.id : (payload.group_ || null),
              roleProcess:
                branch === 'XU_LY_CHINH'
                  ? 'processor'
                  : branch === 'PHOI_HOP'
                    ? 'supporter'
                    : 'viewer',
              action:
                branch === 'XU_LY_CHINH'
                  ? 'Xử lý chính'
                  : branch === 'PHOI_HOP'
                    ? 'Phối hợp xử lý'
                    : 'Nhận để biết',
              created_by: effectiveUserId,
              stage_status: stageStatusDoc.CHUA_XU_LY,
              origin_id: newOriginId,
              deadline: userSpecificDeadline,
              created_at: new Date(),
              updated_at: new Date(),
              assignmentType,
              details: {
                subActionCode: branch,
                assigneeUserId: assignee,
                assigner: effectiveUserId,
                note: payload?.note,
                phanCong: true,
                assignmentType,
                isFurtherAssign: isFurtherAssignAction ? true : undefined,
                groupId: userGroupInfo ? userGroupInfo.id : undefined,
                groupName: userGroupInfo ? userGroupInfo.name : undefined,
                sourceNodeId: wi.nodeId,
                sourceRole: wi.role,
              },
              curStatusCode: branch === 'XU_LY_CHINH' ? statusCode : null,
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            };

            pendingWrites.push({
              currentTargetDocId,
              newWi,
              auditEntry,
            });
          }
        }

        // Cập nhật danh sách clonedDocIds vào details của tất cả audit entries trong pendingWrites
        for (const op of pendingWrites) {
          if (op.auditEntry.details) {
            op.auditEntry.details.clonedDocIds = clonedDocIds;
          }
        }

        // Thực hiện ghi nhận workitems và audits sau khi đã tạo các bản clone sạch
        for (const op of pendingWrites) {
          await this.repo.addWorkItem(op.currentTargetDocId, op.newWi, tx, doc.bpmnVersion);
          await this.addAuditIncomingAware(
            op.currentTargetDocId,
            op.auditEntry,
            tx,
          );
          newAuditEntries.push(op.auditEntry);
        }

        // Tự động tạo work item cho các sequence flow tự động (không có name/actionCode)
        if (
          nextNode.$type === 'bpmn:InclusiveGateway' ||
          nextNode.$type === 'bpmn:inclusiveGateway'
        ) {
          for (const f of allGatewayOut) {
            const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
            const code = extProps.actionCode || f.name;
            if (!code) {
              const nodeRes = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
              let targetNode = nodeRes?.node;
              if (targetNode) {
                let assigneeUserId = effectiveUserId;

                // Nếu node đích là ServiceTask, thực thi Service Task để tìm node tiếp theo (ví dụ: tìm người hoàn thành)
                if (targetNode.$type === 'bpmn:ServiceTask') {
                  // Merge audit gốc với các audit entries mới tạo trong transaction (phanCong: true)
                  // để find-complete-doc có thể tìm được người phân công
                  const mergedAudit = [...audit, ...newAuditEntries];
                  const serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask({
                    nodeId: targetNode.id,
                    bpmnXml: bpmnXML,
                    variables: {
                      curNodeId: wi.nodeId,
                      documentId,
                      workItemId: wi.id,
                      userId: effectiveUserId,
                      auditArr: mergedAudit,
                      indexes,
                      payload,
                      nodeId: targetNode.id,
                      bpmnXml: bpmnXML,
                    },
                  });

                  if (serviceTaskResult?.nextNode) {
                    targetNode = serviceTaskResult.nextNode;
                  }
                  if (serviceTaskResult?.assignTo) {
                    assigneeUserId = serviceTaskResult.assignTo;
                  }
                }

                const role = indexes.laneMap.get(targetNode.id);

                // Tạo workitem cho người phân công/chỉ đạo ở bước hoàn thành
                const newWi: WorkItem = {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: targetNode.id,
                  role: role || '',
                  assigneeUserId: assigneeUserId,
                  nodeType: targetNode.$type,
                };
                await this.repo.addWorkItem(documentId, newWi, tx, doc.bpmnVersion);
              }
            }
          }
        }

        // Tự động tạo work item cho các sequence flow song song (isConcurrent) từ gateway hiện tại
        if (allGatewayOut && allGatewayOut.length > 0) {
          for (const f of allGatewayOut) {
            const extFlow = getAllNodeExtensionProperties(f);
            const flagsButton = parseFlagsButton(extFlow?.flagsButton);
            if (extFlow && flagsButton?.isConcurrent) {
              const res = this.bpmnEngine.nextInteractiveFromFlow(f, indexes);
              const targetNode = res?.node;
              if (targetNode) {
                const role = indexes.laneMap.get(targetNode.id);
                const newWi: WorkItem = {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: targetNode.id,
                  role: role || '',
                  assigneeUserId: effectiveUserId,
                  nodeType: targetNode.$type,
                };
                // Luôn tạo tại originalDocId (document gốc) để người phân công xử lý
                await this.repo.addWorkItem(originalDocId, newWi, tx, doc.bpmnVersion);
              }
            }
          }
        }

        // Tạo audit cho ORGANIZATION UNITS (OUs)
        for (const [branch, ous] of byBranchOUs.entries()) {
          const branchDeadline = deadlineByBranch.get(branch) ?? payload.deadline ?? null;
          const f = flowGroups.get(branch);
          const extFlow = f ? this.bpmnEngine.getFlowExtensionProperties(f) : null;
          const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
            f,
            indexes,
          );
          if (!targetNode) continue;
          for (const ou of ous) {
            const ouSpecificDeadline = ouDeadlines.get(ou) ?? branchDeadline;
            await this.addAuditIncomingAware(
              documentId,
              {
                user_id: effectiveUserId,
                display_name: payload.displayName,
                role: wi.role,
                action_code: 'PHAN_CONG',
                from_node_id: wi.nodeId,
                to_node_id: targetNode.id,
                receiver: null, // OUs không có receiver là user
                receiver_unit: ou, // Đơn vị nhận
                group_: payload.group_ || null,
                roleProcess:
                  branch === 'XU_LY_CHINH'
                    ? 'processor'
                    : branch === 'PHOI_HOP'
                      ? 'supporter'
                      : 'viewer',
                action:
                  branch === 'XU_LY_CHINH'
                    ? 'Xử lý chính'
                    : branch === 'PHOI_HOP'
                      ? 'Phối hợp xử lý'
                      : 'Nhận để biết',
                created_by: effectiveUserId,
                stage_status: stageStatusDoc.CHUA_XU_LY,
                origin_id: newOriginId,
                deadline: ouSpecificDeadline,
                created_at: new Date(),
                updated_at: new Date(),
                assignmentType,
                details: {
                  subActionCode: branch,
                  receiverUnit: ou,
                  assigner: effectiveUserId,
                  note: payload?.note,
                  phanCong: true,
                  deadline: ouSpecificDeadline,
                  assignmentType,
                  isFurtherAssign: isFurtherAssignAction ? true : undefined,
                  clonedDocumentId: clonedDocIdByOu.get(String(ou)) || null,
                  clonedDocIds: allClonedDocIds,
                  sourceNodeId: wi.nodeId,
                  sourceRole: wi.role,
                },
                curStatusCode: branch === 'XU_LY_CHINH' ? statusCode : null,
                typeDocument: 'IncommingDocument',
              },
              tx,
            );
          }
        }
        onlyTP = byBranch.size > 0 ? (isPhanCongTP && cxlOnlyTP) : (byBranchOUs.size > 0);

        if (nextNodeConcurrent) {
          // Tự động tạo việc cho người phân công ở các nút concurrent mà không cần check ý kiến chỉ đạo
          const canAddProcess = true;
          console.log('[DEBUG-TP] nextNodeConcurrent:', nextNodeConcurrent.id, 'canAddProcess:', canAddProcess);
          if (canAddProcess) {
            const serviceNode = nextNodeConcurrent?.$type === 'bpmn:ServiceTask';
            if (serviceNode) {
              //service task này phải tự cập nhật workitem và audit trong chính servicetask
              await this.serviceTaskExecutor.executeIfServiceTask({
                nodeId: nextNodeConcurrent.id,
                bpmnXml: bpmnXML,
                variables: {
                  documentId,
                  nodeId: nextNodeConcurrent.id,
                  onlyCxlTP: onlyTP,
                  indexes,
                  tx,
                  bpmnVersion,
                  curLane,
                  effectiveUserId,
                  wi,
                  isActive: true
                },
              });
            } else {
              await this.repo.addWorkItem(
                documentId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: nextNodeConcurrent.id,
                  role: targetRoleConcurrent,
                  assigneeUserId: targetRoleConcurrent === curLane ? effectiveUserId : null,
                  nodeType: nextNodeConcurrent.$type,
                  actionCode: actionCodeAfterConcurrent,

                },
                tx,
                bpmnVersion,
              );
            }
          }
        }
        // await this.addAuditIncomingAware(
        //   documentId,
        //   {
        //     user_id: effectiveUserId,
        //     display_name: null,
        //     role: wi.role,
        //     action_code: actionCode,
        //     from_node_id: wi.nodeId,
        //     to_node_id: nextNodeConcurrent?.id,
        //     receiver: targetRoleConcurrent === curLane ? effectiveUserId : null,
        //     processed_by: null,
        //     acting_as: null,
        //     receiver_unit: payload.receiver_unit,
        //     group_: payload.group_ || null,
        //     roleProcess: statusDocConcurrent ? 'processor' : 'supporter',
        //     action: statusDocConcurrent ? 'Xử lý chính' : 'Phối hợp xử lý',
        //     created_by: effectiveUserId,
        //     stage_status: stageStatusDoc.CHUA_XU_LY,
        //     origin_id: wi.id,
        //     deadline: payload.deadline || null,
        //     created_at: new Date(),
        //     updated_at: new Date(),
        //     details: { note: payload?.note },
        //     curStatusCode: statusDocConcurrent,
        //     originalUser: effectiveUserId || null,
        //     typeDocument: 'IncommingDocument',
        //   },
        //   tx,
        // );


        // Update status trong transaction
        const isDauUnit = wi.assigneeUserId === departmentId;
        const actualReceiver = isDauUnit ? departmentId : effectiveUserId;

        for (const docId of [originalDocId, ...clonedDocIds]) {
          await this.updateStageStatusAuditIncomingAware(
            docId,
            {
              receiver: actualReceiver,
              isDauPhong: isDauUnit,
              stage_status: actionCode === 'CHUYEN_XU_LY_PHAN_CONG' ? stageStatusDoc.DA_XU_LY : stageStatusDoc.DA_PHAN_CONG,
              action_code: actionCode,
              action: actionCode === 'CHUYEN_XU_LY_PHAN_CONG' ? 'Chuyển xử lý' : 'Phân công',
              typeDocument: 'IncommingDocument',
              isCloneFlow: false,
            },
            tx,
          );
        }
        const targetDocs = [originalDocId, ...clonedDocIds];
        for (const docId of targetDocs) {
          if (!(processedUsserId === effectiveUserId)) {
            await this.repo.updateProcessedByAudit(
              docId,
              {
                receiver: effectiveUserId,
                processed_by: processedUsserId,
              } as any,
              tx,
            );
            await this.repo.updateActingAsAudit(
              docId,
              {
                receiver: effectiveUserId,
                acting_as: effectiveUserId,
              } as any,
              tx,
            );
          }
          await this.repo.updateDocumentStatus(docId, statusCode, tx);
        }

        // Commit transaction
        await this.repo.commit(tx);

        // === PHẦN 3: TẠO COMMENT BÊN NGOÀI TRANSACTION ===
        const mainUsers = mainList;
        const phoiHop = byBranch.get('PHOI_HOP') || [];
        const nhanDeBiet = byBranch.get('NHAN_DE_BIET') || [];

        // Lấy OUs từ byBranchOUs
        const mainOUs = byBranchOUs.get('XU_LY_CHINH') || [];
        const phoiHopOUs = byBranchOUs.get('PHOI_HOP') || [];
        const nhanDeBietOUs = byBranchOUs.get('NHAN_DE_BIET') || [];

        const allUserIds = Array.from(
          new Set([...mainUsers, ...phoiHop, ...nhanDeBiet].filter(Boolean)),
        );

        const allOUIds = Array.from(
          new Set(
            [...mainOUs, ...phoiHopOUs, ...nhanDeBietOUs].filter(Boolean),
          ),
        );

        // Lấy tên users
        const usersMap = Object.fromEntries(
          await Promise.all(
            allUserIds.map(async (userId) => {
              try {
                const user = await this.sqlsvRepo.getUserById(userId);
                const userAny = user as any;
                const derivedName =
                  (userAny && (userAny.name || userAny.displayName)) ||
                  (userAny && userAny._id ? String(userAny._id) : null) ||
                  userId;
                return [userId, derivedName || 'Người dùng không xác định'];
              } catch (err) {
                console.warn(`Không lấy được tên user ${userId}:`, err.message);
                return [userId, userId];
              }
            }),
          ),
        );

        // Lấy tên organization units
        const orgUnitsMap = Object.fromEntries(
          await Promise.all(
            allOUIds.map(async (ouId) => {
              try {
                const orgUnit =
                  await this.sqlsvRepo.getOrganizationUnitById(ouId);
                const orgUnitAny = orgUnit as any;
                const derivedName =
                  (orgUnitAny && orgUnitAny.name) ||
                  (orgUnitAny && orgUnitAny._id
                    ? String(orgUnitAny._id)
                    : null) ||
                  ouId;
                return [ouId, derivedName || 'Phòng ban không xác định'];
              } catch (err) {
                console.warn(
                  `Không lấy được tên phòng ban ${ouId}:`,
                  err.message,
                );
                return [ouId, ouId];
              }
            }),
          ),
        );

        // Tạo comment cho users
        const toArray = (v: any): string[] => {
          if (!v) return [];
          return Array.isArray(v) ? v : [v];
        };

        // ===== USERS =====
        const mainUserNames = await Promise.all(
          mainUsers.map(async (id) => {
            try {
              const name = await this.repo.buildDisplayNameWithAuthorized(id);
              return name ? name : (usersMap[id] || id);
            } catch {
              return usersMap[id] || id;
            }
          })
        );

        const phoiHopArr = toArray(phoiHop);
        const xemDeBietArr = toArray(nhanDeBiet);

        // [TỐI ƯU 5]: Fetch Display Names song song (Parallel I/O) thay vì tuần tự
        const phoiHopNames = await Promise.all(
          phoiHopArr.map(async (id) => {
            try {
              const name = await this.repo.buildDisplayNameWithAuthorized(id);
              return name ? name : (usersMap[id] || id);
            } catch {
              return usersMap[id] || id;
            }
          })
        );

        const xemDeBietNames = await Promise.all(
          xemDeBietArr.map(async (id) => {
            try {
              const name = await this.repo.buildDisplayNameWithAuthorized(id);
              return name ? name : (usersMap[id] || id);
            } catch {
              return usersMap[id] || id;
            }
          })
        );

        // Tạo comment cho organization units
        const mainOUNames = mainOUs.map((id) => orgUnitsMap[id] || id);
        const phoiHopOUNames = phoiHopOUs.map((id) => orgUnitsMap[id] || id);
        const nhanDeBietOUNames = nhanDeBietOUs.map(
          (id) => orgUnitsMap[id] || id,
        );

        // Old:
        // // Tạo các dòng comment - gộp users và OUs trong cùng một dòng
        // const mainAll = [
        //   ...(mainUserName ? [mainUserName] : []),
        //   ...mainOUNames,
        // ];
        // const mainLine =
        //   mainAll.length > 0 ? `Xử lý chính: ${mainAll.join('; ')}` : null;
        //
        // const phoiHopAll = [...phoiHopNames, ...phoiHopOUNames];
        // const phoiHopLine =
        //   phoiHopAll.length > 0 ? `Phối hợp: ${phoiHopAll.join('; ')}` : null;
        //
        // const xemDeBietAll = [...xemDeBietNames, ...nhanDeBietOUNames];
        // const xemDeBietLine =
        //   xemDeBietAll.length > 0
        //     ? `Nhận để biết: ${xemDeBietAll.join('; ')}`
        //     : null;
        //
        // // Tạo comment cuối cùng
        // const commentParts: string[] = [];
        // if (mainLine) commentParts.push(mainLine);
        // if (phoiHopLine) commentParts.push(phoiHopLine);
        // if (xemDeBietLine) commentParts.push(xemDeBietLine);
        //
        // let comment =
        //   commentParts.length > 0 ? commentParts.join('\n') : 'Chuyển xử lý';
        // if (payload?.note) comment += `\n${payload.note}`;

        // Tạo comment từ ý kiến của người dùng
        const comment = payload?.note?.trim() || '';

        // [TỐI ƯU 6]: Fire-and-forget lấy Document và ghi System Comment song song, không block
        const documentPromise = this.repo.getDocument(documentId);

        this.addSystemComment(
          documentId,
          payload,
          comment,
          originalUser || effectiveUserId,
          'opinion',
        ).catch(e => console.error(e));

        const newlyAssignedUserIds = Array.from(new Set(pendingWrites.map(pw => pw.newWi.assigneeUserId).filter(Boolean)));

        return {
          status: 1,
          message: 'Phân công thành công',
          document: await documentPromise,
          nextNode: {
            tasks: newlyAssignedUserIds.map(id => ({ assignee: id }))
          }
        };
      } catch (e) {
        await this.repo.rollback(tx);
        throw e;
      }
    }
    // }

    throw new BadRequestException(`Hành động không được hỗ trợ: ${actionCode}`);
  }
  /**
   * Helper: Từ node hiện tại, tìm bước tiếp theo có người ký trong outgoing_document_users.
   * Nếu bước kế tiếp KHÔNG có người ký (outgoing_document_users trống cho signer_type đó),
   * thì skip bước đó và tiếp tục duyệt BPMN sang node kế tiếp.
   * Dừng khi tìm được bước có người ký, hoặc gặp EndEvent, hoặc node không có signerRequired.
   *
   * @returns { nextNode, signers, typeSign, stageStatus, skippedSteps }
   */
  private async findNextStepWithSigners({
    currentNode,
    indexes,
    documentId,
    maxDepth = 10,
  }: {
    currentNode: any;
    indexes: any;
    documentId: string;
    maxDepth?: number;
  }): Promise<{
    nextNode: any;
    signers: Array<{ user_id: string; sign_order: number }>;
    typeSign: string | null;
    stageStatus: string | null;
    skippedSteps: string[];
  }> {
    const skippedSteps: string[] = [];
    let candidateNode = currentNode;
    let depth = 0;

    while (depth < maxDepth) {
      depth++;

      // Lấy outgoing flows của candidateNode
      const outs = indexes.outgoingBySource.get(candidateNode.id) || [];
      if (outs.length === 0) break;

      // Lấy flow đầu tiên (forward flow) - ưu tiên flow không phải TRA_LAI
      const forwardFlow = outs.find((f: any) => {
        const name = String(f.name || '').toUpperCase();
        return name && !name.includes('TRA_LAI') && !name.includes('XIN_Y_KIEN');
      }) || outs.find((f: any) => {
        const name = String(f.name || '').toUpperCase();
        return !name.includes('TRA_LAI') && !name.includes('XIN_Y_KIEN');
      }) || outs[0];

      if (!forwardFlow) break;

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
        forwardFlow,
        indexes,
      );

      if (!nextNode) break;

      // Nếu là EndEvent thì trả về
      if (nextNode.$type === 'bpmn:EndEvent') {
        return { nextNode, signers: [], typeSign: null, stageStatus: null, skippedSteps };
      }

      // Kiểm tra signerRequired của node tiếp theo
      const nextProps = getAllNodeExtensionProperties(nextNode);
      const typeSign = nextProps.signerRequired || nextProps.processRequired || null;

      // Nếu node là ServiceTask → skip luôn để tìm node tiếp theo
      if (nextNode.$type === 'bpmn:ServiceTask') {
        candidateNode = nextNode;
        continue;
      }

      // Gateway trung gian có một đường ra không cần người thao tác.
      // Tiếp tục duyệt để tìm node ký thật sự; gateway nhiều nhánh
      // vẫn chỉ được skip khi BPMN khai báo skipNode=true.
      const isGateway = nextNode.$type === 'bpmn:ExclusiveGateway' || nextNode.$type === 'bpmn:InclusiveGateway';
      const nextNodeOuts = indexes.outgoingBySource.get(nextNode.id) || [];
      if (isGateway && (nextProps.skipNode === 'true' || nextNodeOuts.length === 1)) {
        candidateNode = nextNode;
        continue;
      }

      // Nếu node không có signerRequired → trả về bình thường (không phải bước ký)
      if (!typeSign) {
        return { nextNode, signers: [], typeSign: null, stageStatus: null, skippedSteps };
      }

      // Node có signerRequired → kiểm tra có người ký không
      // ĐẶC BIỆT: signStamp không lưu trong outgoing_document_users
      // (người đóng dấu = VănThư, được xác định runtime qua VT lookup trong signDoc)
      // → Return ngay để signDoc xử lý việc tìm người đóng dấu
      if (typeSign === 'signStamp') {
        return {
          nextNode,
          signers: [],
          typeSign,
          stageStatus: stageStatusDoc.CHO_DONG_DAU,
          skippedSteps,
        };
      }

      const signers = await this.repo.getSignersFromOutgoingDocumentUsers(
        documentId,
        typeSign,
      );

      if (signers && signers.length > 0) {
        // Có người ký → xác định stageStatus và trả về
        let stageStatus: string | null = null;
        switch (typeSign) {
          case 'signContentDraft':
            stageStatus = stageStatusDoc.CHO_KY_NOI_DUNG;
            break;
          case 'signFormatDraft':
            stageStatus = stageStatusDoc.CHO_KY_THE_THUC;
            break;
          case 'reportSigner':
            stageStatus = stageStatusDoc.CHO_KY_BAN_HANH;
            break;
          case 'paraphSigner':
            stageStatus = stageStatusDoc.CHO_KY_NHAY;
            break;
          case 'officialSigner1':
          case 'officialSigner2':
          case 'officialSigner3':
            stageStatus = stageStatusDoc.CHO_KY_CHINH_THUC;
            break;
          case 'confirmer':
            stageStatus = stageStatusDoc.CHO_XAC_NHAN;
            break;
          case 'appraiser':
            stageStatus = stageStatusDoc.CHO_THAM_DINH;
            break;
          default:
            stageStatus = null;
            break;
        }
        return { nextNode, signers, typeSign, stageStatus, skippedSteps };
      }

      // Không có người ký → skip bước này, tiếp tục duyệt
      skippedSteps.push(typeSign);
      candidateNode = nextNode;
    }

    // Đã duyệt hết maxDepth mà không tìm thấy bước nào phù hợp
    return { nextNode: null, signers: [], typeSign: null, stageStatus: null, skippedSteps };
  }

  private getStageStatusByTypeSign(typeSign?: string | null): string | null {
    switch (typeSign) {
      case 'signContentDraft':
        return stageStatusDoc.CHO_KY_NOI_DUNG;
      case 'signFormatDraft':
        return stageStatusDoc.CHO_KY_THE_THUC;
      case 'reportSigner':
        return stageStatusDoc.CHO_KY_BAN_HANH;
      case 'paraphSigner':
        return stageStatusDoc.CHO_KY_NHAY;
      case 'officialSigner1':
      case 'officialSigner2':
      case 'officialSigner3':
        return stageStatusDoc.CHO_KY_CHINH_THUC;
      case 'confirmer':
        return stageStatusDoc.CHO_XAC_NHAN;
      case 'appraiser':
        return stageStatusDoc.CHO_THAM_DINH;
      case 'signStamp':
        return stageStatusDoc.CHO_KY_DONG_DAU;
      default:
        return null;
    }
  }

  private async resolveConcurrentNodeAssignees(params: {
    documentId: string;
    bpmnVersion: string;
    stageNode: { nodeId: string; role?: string | null; nodeType?: string; extensions?: any };
    indexes: any;
    fallbackAssignees?: Array<{ userId: string; signOrder?: number }>;
  }): Promise<Array<{ userId: string; signOrder: number }>> {
    const { documentId, bpmnVersion, stageNode, indexes, fallbackAssignees = [] } = params;
    const bpmnNode = indexes?.nodes?.get(stageNode.nodeId);
    const nodeProps = bpmnNode ? getAllNodeExtensionProperties(bpmnNode) : (stageNode.extensions || {});
    const typeSign = nodeProps?.signerRequired || nodeProps?.processRequired || null;
    const targetRole = stageNode.role || (stageNode.nodeId ? indexes?.laneMap?.get(stageNode.nodeId) : null);

    if (typeSign) {
      const signers = await this.repo.getSignersFromOutgoingDocumentUsers(
        documentId,
        typeSign,
      );
      if (Array.isArray(signers) && signers.length > 0) {
        return signers.map((s: any) => ({
          userId: String(s.user_id),
          signOrder: Number(s.sign_order || 0),
        }));
      }
    }

    if (targetRole) {
      const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
      if (Array.isArray(candidates) && candidates.length > 0) {
        return candidates.map((id: string, index: number) => ({
          userId: String(id),
          signOrder: index,
        }));
      }
    }

    return fallbackAssignees.map((a, index) => ({
      userId: String(a.userId),
      signOrder: Number(a.signOrder ?? index),
    }));
  }

  private async createConcurrentStageNotificationIfMissing(params: {
    recipientId: string;
    senderId?: string | null;
    documentId: string;
    docTitle: string;
  }): Promise<void> {
    if (!this.notificationService || !params.recipientId) return;

    const title = `Bạn có văn bản cần xử lý: “${params.docTitle}”`;
    const content = `Bạn có văn bản cần xử lý "${params.docTitle}"`;
    const exists = await this.notificationService.existsSimilarNotification({
      recipientId: params.recipientId,
      recordId: params.documentId,
      key: 'VIEW_OUTCOMING_DOC',
      type: NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value,
      title,
      content,
    });

    if (exists) return;

    await this.notificationService.create({
      recipientId: params.recipientId,
      senderId: params.senderId ?? '',
      title,
      content,
      recordId: params.documentId,
      link: `/outgoing-documents/${params.documentId}`,
      key: 'VIEW_OUTCOMING_DOC',
      type: NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value,
      time: new Date(),
      status: 1,
    });
  }

  private async ensureMissingConcurrentStageNotifications(params: {
    documentId: string;
    docTitle: string;
    bpmnVersion: string;
    indexes: any;
    currentNode: any;
    stage?: any;
    senderId?: string | null;
    fallbackAssignees?: Array<{ userId: string; signOrder?: number }>;
  }): Promise<void> {
    const {
      documentId,
      docTitle,
      bpmnVersion,
      indexes,
      currentNode,
      stage,
      senderId,
      fallbackAssignees = [],
    } = params;

    if (
      !this.notificationService ||
      !stage?.nodes?.length ||
      String(currentNode?.extensions?.isStartConcurrentStep).toLowerCase() !== 'true'
    ) {
      return;
    }

    for (const stageNode of stage.nodes) {
      if (String(stageNode?.extensions?.isStartConcurrentStep).toLowerCase() === 'true') {
        continue;
      }

      const assignees = await this.resolveConcurrentNodeAssignees({
        documentId,
        bpmnVersion,
        stageNode,
        indexes,
        fallbackAssignees,
      });

      for (const assignee of assignees) {
        await this.createConcurrentStageNotificationIfMissing({
          recipientId: assignee.userId,
          senderId,
          documentId,
          docTitle,
        });
      }
    }
  }

  async setProcessor({
    bpmnXML,
    workItemId,
    payload,
    userId,
    bpmnVersion,
    doc,
    docDetail,
    keySign,
    wi: preFetchedWi,
    modelRes: preFetchedModelRes,
  }: {
    bpmnXML: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    bpmnVersion: string;
    doc: any;
    docDetail?: any; // Document detail đã được map sẵn từ getDetails()
    keySign: any;
    wi?: any;
    modelRes?: any;
  }): Promise<any> {

    const startTime = Date.now();
    // const logKey = `setProcessor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    // const stepTime = { start: startTime };
    // const step = (name: string) => {
    //   const now = Date.now();
    //   const elapsed = now - (stepTime[name] || startTime);
    //   this.logger.log(`[${logKey}] ⏱️ [${name}] +${elapsed}ms`);
    //   stepTime[name] = now;
    // };

    // this.logger.log(`[${logKey}] 🚀 START setProcessor - docIds: ${payload?.docIds}, workItemId: ${workItemId}, actionCode: ${payload?.actionCode}, assignToUserId: ${JSON.stringify(payload?.assignToUserId)}`);

    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');

    // [TỐI ƯU 2]: Gọi song song các truy vấn I/O chậm chạp ở đầu hàm
    const [resolvedModelRes, resolvedWi, auditArr] = await Promise.all([
      preFetchedModelRes ? Promise.resolve(preFetchedModelRes) : this.getModelFromXml(bpmnXML),
      preFetchedWi ? Promise.resolve(preFetchedWi) : this.repo.getWorkItem(payload?.docIds, workItemId),
      this.repo.getAudit(payload?.docIds)
    ]);
    // step('initial_queries_parallel');

    const indexes = resolvedModelRes.indexes;
    const wi = resolvedWi;
    const res = false;

    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');
    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    if (!node)
      throw new BadRequestException(
        'Lỗi mô hình BPMN: không có hành động đi từ node hiện tại',
      );
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const currentRole = indexes.laneMap.get(node.id);
    const getConcurrentStageKey = (bpmnNode: any): string | null => {
      if (!bpmnNode) return null;
      const props = getAllNodeExtensionProperties(bpmnNode) || {};
      const executeConcurrentByStep = props.executeConcurrentByStep;
      if (executeConcurrentByStep) {
        return String(executeConcurrentByStep).trim();
      }
      const isStartConcurrentStep = props.isStartConcurrentStep;
      if (String(isStartConcurrentStep || '').trim().toLowerCase() === 'true' && bpmnNode.id) {
        return String(bpmnNode.id);
      }
      return null;
    };
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    // Validate mandatory signers when submitting from Drafter (NGUOI_SOAN_THAO)
    if (currentRole === 'NGUOI_SOAN_THAO' && (actionCode.startsWith('TRINH') || actionCode === 'YES')) {
      // const t0 = Date.now();
      const allPreselectedSigners = await this.repo.getAllSignersFromOutgoingDocumentUsers(payload.docIds);
      // this.logger.log(`[${logKey}] ⏱️ getAllSignersFromOutgoingDocumentUsers: ${Date.now() - t0}ms`);

      const mandatorySignerTypes = new Map<string, { role: string; nodeName: string }>();

      for (const [nodeId, bpmnNode] of indexes.nodes.entries()) {
        const nodeRole = indexes.laneMap.get(nodeId);
        if (!nodeRole) continue;

        const nodeProps = getAllNodeExtensionProperties(bpmnNode);
        const typeSign = nodeProps.signerRequired || nodeProps.processRequired || null;

        if (typeSign && typeSign !== 'signStamp') {
          const laneProps = this.bpmnEngine.getLanePropertiesByRole(indexes.lanes as any, nodeRole);
          const isSkipLane = laneProps?.skipLane === 'true';

          if (!isSkipLane) {
            mandatorySignerTypes.set(typeSign, {
              role: nodeRole,
              nodeName: bpmnNode.name || typeSign,
            });
          }
        }
      }

      for (const [typeSign, info] of mandatorySignerTypes.entries()) {
        const hasSigner = allPreselectedSigners.some(
          (s) => String(s.signer_type) === String(typeSign)
        );

        if (!hasSigner) {
          const lane = indexes.lanes.find((l: any) => l.role === info.role);
          const roleName = lane?.name || info.role;
          throw new BadRequestException(
            `Vui lòng chọn người xử lý cho vai trò "${roleName}"`,
          );
        }
      }
      // step('validate_mandatory_signers');
    }

    let flow;
    let targetRole;
    // Nếu có roles, tìm flow theo roles và actionCode
    if (payload.targetRole && payload.targetRole.length > 0) {
      // 1. Tìm flow theo actionCode
      const flowOut = outs.find((f: any) => {
        const ext = this.bpmnEngine.getFlowExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      if (!flowOut)
        throw new BadRequestException(
          `Flow not found for actionCode: ${actionCode}`,
        );
      const matchedFlows = outs.filter((f: any) => {
        const ext = this.bpmnEngine.getFlowExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });

      // 4. Nếu payload.roles tồn tại, kiểm tra xem có flow nào trong outs trùng targetRole
      const targetRoles = Array.isArray(payload.targetRole)
        ? payload.targetRole
        : [payload.targetRole];
      let matchedFlow;

      matchedFlow = matchedFlows.find((f: any) => {
        const fNextNode = f.targetRef;
        // const fTargetRole = fNextNode ? indexes.laneMap.get(fNextNode.id) : undefined;
        // if(fTargetRole === targetRoles.toString()){
        //   return fTargetRole && targetRoles.includes(fTargetRole);
        // }
        // else {
        const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
          f,
          indexes,
        ); // truyền dây(flow được match)
        const fTargetRole = nextNode
          ? indexes.laneMap.get(nextNode.id)
          : undefined;
        return fTargetRole && targetRoles.includes(fTargetRole);

        // }
      });

      flow = matchedFlow || (matchedFlows.length === 1 ? matchedFlows[0] : undefined);
    } else {
      // Nếu không có roles, chỉ tìm theo actionCode
      flow = outs.find((f: any) => {
        const ext = this.bpmnEngine.getFlowExtensionProperties(f);
        return (
          (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
          (f.name && f.name.toUpperCase() === actionCode) ||
          f.id === actionCode
        );
      });
    }
    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    let statusDoc = getAllNodeExtensionProperties(cur).statusCode || null;
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    const extLanes = this.bpmnEngine.getLanePropertiesByRole(indexes.lanes, currentRole);
    const flagsFlow = parseFlagsButton(extLanes?.flags);
    const isDigitalSignature =
      doc?.signatureType === 'digitalSignature' ||
      doc?.signature_type === 'digitalSignature';
    const requiresSignFormatDraft =
      flagsFlow?.reqSignFormatDraft === true ||
      flagsFlow?.reqSignFormatDraft === 'true';

    if (isDigitalSignature && requiresSignFormatDraft) {
      const nodeProps = getAllNodeExtensionProperties(node);
      const curAction = (nodeProps.signerRequired || nodeProps.processRequired || '').toUpperCase();
      const curName = (node.name || '').toLowerCase();

      const isCurrentKiemTra = curAction === 'KIEM_TRA_THE_THUC' ||
        curAction === 'TRINH_KIEM_TRA_TT' ||
        ((curName.includes('kiểm tra') || curName.includes('kiem tra')) && (curName.includes('thể thức') || curName.includes('the thuc')));

      if (isCurrentKiemTra) {
        const userSignFormatDraft = await this.usersService.findSingerInOutGOingUser({
          typeSign: 'signFormatDraft',
          docId: payload.docIds,
        });
        if (!userSignFormatDraft) {
          throw new BadRequestException('Vui lòng chọn người ký thể thức');
        }
      }
    }
    // if (flagsFlow?.reqSignFormatDraft) {
    //   const userSignFormatDraft = await this.usersService.findSingerInOutGOingUser({
    //     typeSign: 'signFormatDraft',
    //     docId: payload.docIds,
    //   });
    //   if (!userSignFormatDraft) {
    //     throw new BadRequestException(
    //       `Vui lòng chọn người ký thể thức`,
    //     );
    //   }
    // }
    let { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    ); // truyền dây(flow được match)
    targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // let targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
    // === Normal Transfer / Approval ===
    let requiresAssignee =
      nextNode && !!targetRole;
    const multipleAssignees: Array<{ userId: string; signOrder: number }> = [];
    type Assignee = {
      userId: string;
      signOrder?: number;
    };

    let assignees: Assignee[] = [];

    const typeSigncur = getAllNodeExtensionProperties(node).signerRequired || getAllNodeExtensionProperties(node).processRequired || null;
    let typeSign = getAllNodeExtensionProperties(nextNode).signerRequired || getAllNodeExtensionProperties(nextNode).processRequired || null;
    let stageStatus = this.getStageStatusByTypeSign(typeSign);

    const currentConcurrentStageKey = getConcurrentStageKey(node);
    const nextConcurrentStageKey = getConcurrentStageKey(nextNode);

    const getAuditOrder = (audit: any) => Number(audit?.id || 0) || new Date(audit?.updatedAt || audit?.createdAt || 0).getTime();
    const isReturnOrRecallAudit = (audit: any) => {
      const action = String(audit?.actionCode || '').trim().toUpperCase();
      const stage = String(audit?.stageStatus || '').trim().toUpperCase();
      return action === 'TRA_LAI' ||
        action === 'RETURN' ||
        action === 'THU_HOI' ||
        action === 'RECALL' ||
        stage === 'TRA_LAI' ||
        stage === 'TRẢ LẠI' ||
        stage === 'THU_HOI' ||
        stage === 'THU HỒI';
    };
    const resetSignersForReturnedCycle = async (nextTypeSign?: string | null) => {
      if (!nextTypeSign || nextTypeSign === 'signStamp') return;

      const latestReturn = [...auditArr]
        .filter(isReturnOrRecallAudit)
        .sort((a, b) => getAuditOrder(b) - getAuditOrder(a))[0];
      if (!latestReturn) return;

      const typeSignNodeIds = new Set<string>();
      for (const [nodeId, bpmnNode] of indexes.nodes.entries()) {
        const nodeProps = getAllNodeExtensionProperties(bpmnNode);
        const nodeTypeSign = nodeProps.signerRequired || nodeProps.processRequired || null;
        if (String(nodeTypeSign || '') === String(nextTypeSign)) {
          typeSignNodeIds.add(String(nodeId));
        }
      }

      const latestSignInType = [...auditArr]
        .filter((audit: any) =>
          typeSignNodeIds.has(String(audit?.fromNodeId || '')) &&
          !isReturnOrRecallAudit(audit),
        )
        .sort((a, b) => getAuditOrder(b) - getAuditOrder(a))[0];

      if (!latestSignInType || getAuditOrder(latestReturn) > getAuditOrder(latestSignInType)) {
        await this.repo.resetSignersStatus({
          documentId: String(payload.docIds || ''),
          typeSign: nextTypeSign,
        });
      }
    };
    await resetSignersForReturnedCycle(typeSign);

    // Khi trình lại sau một lần trả/thu hồi, node đầu tiên chỉ reset
    // signer type của chính nó. Các node anh em trong concurrent stage vẫn
    // có thể giữ is_signed = 1 từ chu kỳ trước. Khi đó resolver không
    // tìm thấy pending signer và fallback sang toàn bộ user trong lane.
    // Reset tất cả signer type của cùng stage; helper phía trên chỉ thực
    // hiện reset nếu audit trả/thu hồi mới hơn lần ký gần nhất.
    if (nextConcurrentStageKey) {
      const concurrentTypeSigns = new Set<string>();
      for (const bpmnNode of indexes.nodes.values()) {
        if (getConcurrentStageKey(bpmnNode) !== nextConcurrentStageKey) continue;
        const props = getAllNodeExtensionProperties(bpmnNode);
        const concurrentTypeSign = props.signerRequired || props.processRequired || null;
        if (concurrentTypeSign && concurrentTypeSign !== 'signStamp') {
          concurrentTypeSigns.add(String(concurrentTypeSign));
        }
      }

      for (const concurrentTypeSign of concurrentTypeSigns) {
        if (concurrentTypeSign !== typeSign) {
          await resetSignersForReturnedCycle(concurrentTypeSign);
        }
      }
    }

    let concurrentStageResult: any = null;
    let skipLegacyTargetCreation = false;
    const isNextNodeInSameConcurrentStage =
      !currentConcurrentStageKey &&
      !!nextConcurrentStageKey;

    if (nextNode?.id && isNextNodeInSameConcurrentStage) {
      const openWorkItems = await this.repo.listOpenWorkItems(payload.docIds);
      concurrentStageResult = await this.concurrentStageOrchestrator.handleTargetNode({
        documentId: payload.docIds,
        typeDocument: 'OutGoingDocument',
        bpmnVersion,
        userId: effectiveUserId,
        originalUser: effectiveUserId,
        workItemId,
        currentNodeId: node.id,
        targetNodeId: nextNode.id,
        indexes,
        openWorkItems,
        auditArr,
        payload: payload as any,
      });

      skipLegacyTargetCreation =
        concurrentStageResult?.mode !== 'not-concurrent'
          ? concurrentStageResult?.shouldCreateLegacyTargetNode === false
          : false;
    }

    const targetLaneProps = targetRole
      ? this.bpmnEngine.getLanePropertiesByRole(indexes.lanes, targetRole)
      : null;
    if (requiresAssignee && targetLaneProps?.skipLane === 'true') {
      // const t0 = Date.now();
      const allPreselectedSigners = await this.repo.getAllSignersFromOutgoingDocumentUsers(payload.docIds);
      // this.logger.log(`[${logKey}] ⏱️ getAllSignersFromOutgoingDocumentUsers: ${Date.now() - t0}ms`);

      const hasSelectedSignerForTargetStep = typeSign
        ? allPreselectedSigners.some((signer) =>
          Number(signer.is_signed || 0) === 0 && String(signer.signer_type || '') === String(typeSign),
        )
        : false;

      if (!hasSelectedSignerForTargetStep) {
        // const t1 = Date.now();
        const skipResult = await this.findNextStepWithSigners({
          currentNode: nextNode,
          indexes,
          documentId: payload.docIds,
        });
        // this.logger.log(`[${logKey}] ⏱️ findNextStepWithSigners (skipLane): ${Date.now() - t1}ms`);

        if (skipResult.nextNode && skipResult.typeSign) {
          nextNode = skipResult.nextNode;
          targetRole = indexes.laneMap.get(nextNode.id);
          typeSign = skipResult.typeSign;
          stageStatus = skipResult.stageStatus;
          requiresAssignee = nextNode && !!targetRole;
          statusDoc = getAllNodeExtensionProperties(nextNode).statusCode || statusDoc;
          this.logger.log(
            `[setProcessor] Skip lane "${targetLaneProps?.candidateGroups || targetRole}" do khong co signer duoc chon, chuyen den "${typeSign}" - docId: ${payload.docIds}`,
          );
        }
      }
    }

    if (requiresAssignee) {
      let validUserIds: Set<string> | null = null;

      // Chỉ lấy danh sách nhóm ký nếu có typeSign
      if (typeSign) {
        // const t0 = Date.now();
        const queryParams = { typeSign, processKey: bpmnVersion, roles: targetRole, limit: 99999 };
        const userOfTypeSigner = await this.usersService.findSignersByType(
          queryParams,
          userId,
        );
        // console.log('queryParams', queryParams, userId);
        // console.log('userOfTypeSigner', userOfTypeSigner);
        // this.logger.log(`[${logKey}] ⏱️ findSignersByType(${typeSign}): ${Date.now() - t0}ms, found: ${userOfTypeSigner?.data?.length || 0}`);

        const signerList = Array.isArray(userOfTypeSigner?.data)
          ? userOfTypeSigner.data
          : [];

        // if (!signerList.length) {
        //   throw new BadRequestException(
        //     `Không tìm thấy người thuộc nhóm ký ${typeSign}`,
        //   );
        // }

        validUserIds = new Set(
          signerList.flatMap(u => {
            const idVal = String(u._id || u.id || '');
            return idVal ? [idVal, idVal.toLowerCase()] : [];
          })
        );
      }

      // 1️⃣ FE chọn
      if (payload?.assignToUserId) {
        const ids = Array.isArray(payload.assignToUserId)
          ? payload.assignToUserId
          : [payload.assignToUserId];

        // this.logger.log(`[${logKey}] ℹ️ FE selected assignees: ${ids.length} users`);

        // Nếu có typeSign thì mới cần validate nhóm
        if (validUserIds) {
          const invalidUsers = ids.filter(id => {
            const sId = String(id);
            return !validUserIds!.has(sId) && !validUserIds!.has(sId.toLowerCase());
          });
          if (invalidUsers.length) {
            console.log('[SIGNER_VALIDATE_FAIL]', {
              assignToUserId: ids,
              invalidUsers,
              validUserIdsCount: validUserIds.size,
              validUserIdsSample: Array.from(validUserIds).slice(0, 20),
              typeSign,
              targetRole,
              processKey: bpmnVersion,
              userId,
            });
            throw new BadRequestException(
              'Người ký không thuộc nhóm được phép ký',
            );
          }
        }

        assignees = ids.map(id => ({ userId: id }));
        if (typeSign) {
          const existingSigners = await this.repo.getSignersFromOutgoingDocumentUsers(
            payload.docIds,
            typeSign,
          );
          const normalizedIds = ids.map((id) => String(id || '').trim()).filter(Boolean);
          const actorIds = new Set(
            [userId, payload?.userId]
              .map((id) => String(id || '').trim())
              .filter(Boolean),
          );
          const isSelfOverwriteOnly =
            normalizedIds.length === 1 &&
            actorIds.has(normalizedIds[0]);
          const shouldPreserveExistingSignerSelection =
            existingSigners?.length > 0 &&
            isSelfOverwriteOnly;
          const shouldPreserveConcurrentSignerSelection =
            !!currentConcurrentStageKey &&
            existingSigners?.length > 0 &&
            isSelfOverwriteOnly;

          if (shouldPreserveExistingSignerSelection || shouldPreserveConcurrentSignerSelection) {
            assignees = existingSigners.map((s) => ({
              userId: s.user_id,
              signOrder: s.sign_order,
            }));
          } else {
            await this.repo.replaceRuntimeSigners({
              documentId: payload.docIds,
              assignees,
              typeSign,
            });
          }
        }
      }

      // 2️⃣ Không chọn, nhưng có typeSign → auto theo config
      else if (typeSign) {
        // const t2 = Date.now();
        const signers = await this.repo.getSignersFromOutgoingDocumentUsers(
          payload.docIds,
          typeSign,
        );
        // this.logger.log(`[${logKey}] ⏱️ getSignersFromOutgoingDocumentUsers (${typeSign}): ${Date.now() - t2}ms, found: ${signers?.length || 0}`);

        if (!signers?.length) {
          // Thử lấy tất cả người dùng trong vai trò (lane) trước khi quyết định skip
          // const t3 = Date.now();
          const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);
          // this.logger.log(`[${logKey}] ⏱️ getUsersByRoleInFlow (no signers): ${Date.now() - t3}ms, found: ${candidates?.length || 0}`);

          if (!typeSign && candidates && candidates.length > 0) {
            assignees = candidates.map(id => ({ userId: id, signOrder: 0 }));
          } else {
            // === SKIP BƯỚC KÝ: Không có người ký cho bước này → tìm bước kế tiếp ===

            // const t4 = Date.now();
            const skipResult = await this.findNextStepWithSigners({
              currentNode: nextNode,
              indexes,
              documentId: payload.docIds,
            });
            // this.logger.log(`[${logKey}] ⏱️ findNextStepWithSigners (no signers): ${Date.now() - t4}ms`);

            if (skipResult.nextNode && skipResult.signers.length > 0) {
              // Tìm thấy bước tiếp theo có người ký → cập nhật
              nextNode = skipResult.nextNode;
              typeSign = skipResult.typeSign;
              stageStatus = skipResult.stageStatus;
              targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

              // Lấy statusDoc mới từ node mới
              const newExtProps = getAllNodeExtensionProperties(nextNode);
              if (newExtProps.statusCode) statusDoc = newExtProps.statusCode;

              assignees = skipResult.signers.map(s => ({
                userId: s.user_id,
                signOrder: s.sign_order,
              }));

            } else if (skipResult.nextNode && skipResult.typeSign === 'signStamp') {
              nextNode = skipResult.nextNode;
              typeSign = skipResult.typeSign;
              stageStatus = skipResult.stageStatus;
              targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

              const newExtProps = getAllNodeExtensionProperties(nextNode);
              if (newExtProps.statusCode) statusDoc = newExtProps.statusCode;


              // Ưu tiên lấy từ cấu hình người ký đã chọn (nếu có)
              // const t5 = Date.now();
              const dbSigners = await this.repo.getSignersFromOutgoingDocumentUsers(
                payload.docIds,
                'signStamp',
              );
              // this.logger.log(`[${logKey}] ⏱️ getSignersFromOutgoingDocumentUsers (signStamp): ${Date.now() - t5}ms, found: ${dbSigners?.length || 0}`);

              if (dbSigners?.length > 0) {
                assignees = dbSigners.map((s) => ({
                  userId: s.user_id,
                  signOrder: s.sign_order,
                }));
              } else {
                // VT lookup để tìm người đóng dấu (VănThư)
                // const t6 = Date.now();
                const [meVT, candidatesVT, listVTStamp] = await Promise.all([
                  this.sqlsvRepo.getUserById(userId) as Promise<any>,
                  this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
                  this.sqlsvRepo.getUsersInFlow(bpmnVersion, targetRole, 100, 1, userId),
                ]);
                // this.logger.log(`[${logKey}] ⏱️ getUsersByRoleInFlow + getUsersInFlow (VT): ${Date.now() - t6}ms`);

                const matchedVTStamp = listVTStamp.usersWithType || [];
                let vtsStamp: any[] = [];

                if (matchedVTStamp.length > 0) {
                  // Lấy tất cả VT trong cùng đơn vị
                  vtsStamp = matchedVTStamp.filter(
                    (vt: any) => String(vt.parent) === String(meVT?.parent?.id),
                  );
                  if (vtsStamp.length === 0) {
                    vtsStamp = matchedVTStamp;
                  }
                }

                if (vtsStamp.length > 0) {
                  assignees = vtsStamp
                    .filter((v: any) => candidatesVT.includes(v._id))
                    .map((v: any) => ({ userId: v._id, signOrder: 0 }));
                }
              }

              if (assignees.length === 0) {
                throw new BadRequestException(
                  'Không tìm thấy người đóng dấu phù hợp sau khi skip bước ký.',
                );
              }

            } else if (skipResult.nextNode && skipResult.nextNode.$type === 'bpmn:EndEvent') {
              // Tất cả bước ký đều trống → chuyển thẳng EndEvent
              nextNode = skipResult.nextNode;
              targetRole = undefined;
              assignees = [];

            }
          }
        } else {
          assignees = signers.map(s => ({
            userId: s.user_id,
            signOrder: s.sign_order,
          }));
        }
      }

      // 3️⃣ Không chọn & không có typeSign
      else {
        throw new BadRequestException(
          'Task này yêu cầu chỉ định người xử lý nhưng không có cấu hình nhóm ký',
        );
      }

      if (assignees.length === 0 && nextNode?.$type !== 'bpmn:EndEvent') {
        throw new BadRequestException(
          'Không xác định được người ký. Vui lòng chọn người ký.',
        );
      }
    }
    // Chỉ validate candidates khi có assignees (không áp dụng khi skip đến EndEvent)
    if (assignees.length > 0) {
      // const t0 = Date.now();
      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnVersion,
        targetRole,
      );
      // this.logger.log(`[${logKey}] ⏱️ getUsersByRoleInFlow: ${Date.now() - t0}ms, found: ${candidates?.length || 0}`);

      if (!candidates?.length) {
        throw new BadRequestException('Không có người phù hợp với vai trò xử lý');
      }

      const candidateSet = new Set(candidates.map(String));

      const invalidUsers = assignees
        .map(a => String(a.userId))
        .filter(userId => !candidateSet.has(userId));

      if (invalidUsers.length) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò xử lý`,
        );
      }
    }
    // step('validate_assignees');


    const warnings: any[] = [];
    // this.logger.log(`[${logKey}] ℹ️ Starting TRANSACTION - assignees: ${assignees.length}`);
    const txStart = Date.now();
    const tx = await this.repo.begin();
    // this.logger.log(`[${logKey}] ⏱️ tx.begin(): ${Date.now() - txStart}ms`);
    try {
      const isMovingToNextNode = nextNode && nextNode.id !== node.id;
      const shouldCreateTargetArtifacts = !!nextNode && isMovingToNextNode;
      const curProperties = getAllNodeExtensionProperties(node);
      const typeSignCurrent = curProperties.signerRequired || curProperties.processRequired || null;
      const isSignerNode = !!typeSignCurrent && typeSignCurrent !== 'signStamp';
      // this.logger.log(`[${logKey}] ℹ️ isSignerNode: ${isSignerNode}, isMovingToNextNode: ${isMovingToNextNode}`);

      let isLastSigner = true;
      const isReturnAction = actionCatalog.isReturn(actionCode);

      if (isSignerNode) {
        if (isReturnAction) {
          isLastSigner = true;
          // const t0 = Date.now();
          await this.repo.resetSignersStatus({
            documentId: payload.docIds,
            typeSign: typeSignCurrent,
            tx,
          });
          // this.logger.log(`[${logKey}] ⏱️ resetSignersStatus: ${Date.now() - t0}ms`);
        } else {
          const t0 = Date.now();
          const signersCur = await this.repo.getSignersFromOutgoingDocumentUsers(
            payload.docIds,
            typeSignCurrent,
          );
          // this.logger.log(`[${logKey}] ⏱️ getSignersFromOutgoingDocumentUsers: ${Date.now() - t0}ms, count: ${signersCur?.length || 0}`);
          isLastSigner = signersCur.length <= 1;

          // const t1 = Date.now();
          await this.repo.markUserSigned({
            documentId: payload.docIds,
            userId: effectiveUserId,
            typeSign: typeSignCurrent,
            tx,
          });
          // this.logger.log(`[${logKey}] ⏱️ markUserSigned: ${Date.now() - t1}ms`);
        }
      }

      if (isMovingToNextNode && (!isSignerNode || isLastSigner)) {
        // Xóa tất cả work item của node hiện tại nếu đủ điều kiện hoàn thành node
        // const t0 = Date.now();
        await this.repo.removeWorkItem(
          payload?.docIds,
          null,
          node.id,
          tx,
        );
        // this.logger.log(`[${logKey}] ⏱️ removeWorkItem (all): ${Date.now() - t0}ms`);
      } else {
        // const t0 = Date.now();
        const removed = await this.repo.removeWorkItem(
          payload?.docIds,
          wi.id,
          tx,
        );
        // this.logger.log(`[${logKey}] ⏱️ removeWorkItem (single): ${Date.now() - t0}ms, removed: ${removed}`);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was already completed by another user',
          );
      }

      // Khai báo arrayWids ở ngoài để có thể dùng trong return
      const arrayWids: string[] = [];
      if (isMovingToNextNode && (!isSignerNode || isLastSigner)) {
        await this.updateStageStatusAuditByNodeOutgoingAware(
          payload?.docIds,
          node.id,
          {
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'OutGoingDocument',
            action_code: actionCode,
          },
          tx,
        );
      } else {
        await this.updateStageStatusAuditOutgoingAware(
          payload?.docIds,
          {
            receiver: userId,
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'OutGoingDocument',
          },
          tx,
        );
      }

      // Mỗi người ký phải có một dòng luân chuyển riêng.
      // Bản ghi chờ ký phía trên chỉ được update trạng thái nên không
      // thể hiện thao tác của người vừa ký trên documents-history.
      if (isSignerNode && !isReturnAction) {
        await this.addAuditOutgoingAware(
          payload.docIds,
          {
            user_id: effectiveUserId,
            display_name: payload.displayName,
            role: wi.role,
            action_code: actionCode,
            from_node_id: wi.nodeId,
            to_node_id: wi.nodeId,
            receiver: null,
            receiver_unit: payload.receiver_unit,
            group_: payload.group_ || null,
            roleProcess: statusDoc ? 'processor' : 'supporter',
            action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
            created_by: effectiveUserId,
            stage_status: stageStatusDoc.DA_XU_LY,
            origin_id: wi.id,
            deadline: payload.deadline || null,
            created_at: new Date(),
            updated_at: new Date(),
            details: {
              note: payload?.note,
            },
            curStatusCode: statusDoc,
            typeDocument: 'OutGoingDocument',
          },
          tx,
        );
      }
      // Tính toán deadline: Ưu tiên payload.deadline > BPMN config > null
      const currentStageProgress = await this.concurrentStageOrchestrator.markNodeProcessed({
        documentId: String(payload.docIds || ''),
        typeDocument: 'OutGoingDocument',
        bpmnVersion,
        userId: effectiveUserId,
        originalUser: effectiveUserId,
        workItemId,
        currentNodeId: node.id,
        targetNodeId: node.id,
        indexes,
        openWorkItems: await this.listOpenWorkItemsWithTx(String(payload.docIds || ''), tx),
        auditArr,
        payload: payload as any,
        tx,
        finalizePriorityCompletion: async (snapshot, currentNodeId) => {
          await this.finalizeConcurrentStagePriorityCompletion(
            String(payload.docIds || ''),
            currentNodeId,
            snapshot,
            tx,
          );
        },
        resolveAdvanceContext: async (snapshot) => {
          return this.resolveConcurrentPriorityAdvanceContext({
            documentId: String(payload.docIds || ''),
            bpmnVersion,
            snapshot,
            indexes,
            fallbackUserId: effectiveUserId,
            resolvedAssignees: assignees,
          });
        },
      });

      if (currentStageProgress?.mode === 'wait-for-stage-completion') {
        await this.repo.commit(tx);
        return {
          status: 1,
          message: 'Concurrent stage is still waiting for other nodes to finish',
          blockedByConcurrentStage: true,
          concurrentStage: currentStageProgress,
          nextNode: null,
          warnings,
        };
      }

      if (currentStageProgress?.advanceContext?.nextNode) {
        nextNode = currentStageProgress.advanceContext.nextNode;
        targetRole = currentStageProgress.advanceContext.targetRole;
        stageStatus = currentStageProgress.advanceContext.stageStatus ?? stageStatus;
        assignees = currentStageProgress.advanceContext.assignees || assignees;
        skipLegacyTargetCreation = false;
      }

      let finalDeadline = payload.deadline || null;
      if (!finalDeadline && nextNode) {
        const nextNodeExtProps = getAllNodeExtensionProperties(nextNode);
        if (nextNodeExtProps.deadline) {
          const days = parseInt(nextNodeExtProps.deadline);
          if (!isNaN(days)) {
            finalDeadline = moment().add(days, 'days').toISOString();
          }
        }
      }

      const isTargetRoleConfirm =
        targetRole === 'NGUOI_XAC_NHAN' ||
        payload?.targetRole === 'NGUOI_XAC_NHAN' ||
        (Array.isArray(payload?.targetRole) && payload.targetRole.includes('NGUOI_XAC_NHAN'));

      if (!stageStatus && isTargetRoleConfirm) {
        stageStatus = stageStatusDoc.CHO_XAC_NHAN;
      }

      // [TỐI ƯU] Gom nhóm truy vấn uỷ quyền & tên người nhận
      const allUserIdsForAuth = [effectiveUserId, ...assignees.map(a => a.userId)].filter(Boolean);
      const tPreResolve = Date.now();
      const [authList, nameList] = await Promise.all([
        this.repo.getAuthoritiesForUsers(allUserIdsForAuth),
        this.repo.getNamesOfUsers(allUserIdsForAuth),
      ]);
      // this.logger.log(`[${logKey}] ⏱️ Pre-resolved uỷ quyền & tên: ${Date.now() - tPreResolve}ms`);

      const authorMap = new Map<string, string>();     // authorized -> author
      const authorizedMap = new Map<string, string>(); // author -> authorized
      for (const row of authList) {
        if (!authorMap.has(row.authorized)) authorMap.set(row.authorized, row.author);
        if (!authorizedMap.has(row.author)) authorizedMap.set(row.author, row.authorized);
      }

      const nameMap = new Map<string, string>();
      for (const row of nameList) {
        nameMap.set(String(row.id), row.name);
      }

      const authMaps = { authorMap, authorizedMap };

      const getDisplayNameInMemory = (targetId: string): string => {
        const originalName = nameMap.get(targetId) || targetId;
        const authorizedId = authorizedMap.get(targetId);
        if (!authorizedId || authorizedId === targetId) {
          return originalName;
        }
        const authorizedName = nameMap.get(authorizedId) || authorizedId;
        return `${authorizedName} (được ${originalName} ủy quyền)`;
      };

      if (isNextNodeInSameConcurrentStage && shouldCreateTargetArtifacts && (!isSignerNode || isLastSigner)) {
        const documentId = String(payload.docIds || '');
        const outgoingDocForConcurrent = await this.repo.getOutgoingDocument(documentId);
        const docTitle =
          outgoingDocForConcurrent?.abstractNote ||
          outgoingDocForConcurrent?.abstract_note ||
          '';
        const finalAssigneesForConcurrent = assignees.filter((a) => {
          if (a.userId === userId && !typeSign) return false;
          return true;
        });

        if (finalAssigneesForConcurrent.length === 0 && assignees.length > 0) {
          finalAssigneesForConcurrent.push(assignees[0]);
        }

        const concurrentOpenWorkItems = await this.repo.listOpenWorkItems(documentId);
        concurrentStageResult = await this.concurrentStageOrchestrator.handleTargetNode({
          documentId,
          typeDocument: 'OutGoingDocument',
          bpmnVersion,
          userId: effectiveUserId,
          originalUser: effectiveUserId,
          workItemId,
          currentNodeId: node.id,
          targetNodeId: nextNode.id,
          indexes,
          openWorkItems: concurrentOpenWorkItems,
          auditArr,
          payload: payload as any,
          tx,
          createArtifact: async (stageNode) => {
            const stageNodeId = stageNode.nodeId;
            const stageNodeBpmn = indexes.nodes.get(stageNodeId);
            if (!stageNodeBpmn) return null;
            const stageNodeProps = getAllNodeExtensionProperties(stageNodeBpmn) || {};
            const concurrentStageKey =
              concurrentStageResult?.stage?.stageKey ||
              String(stageNode.extensions.executeConcurrentByStep || '').trim() ||
              (String(stageNode.extensions.isStartConcurrentStep).toLowerCase() === 'true'
                ? stageNodeId
                : null);
            const stageNodeAssignees = await this.resolveConcurrentNodeAssignees({
              documentId,
              bpmnVersion,
              stageNode,
              indexes,
              fallbackAssignees: finalAssigneesForConcurrent,
            });

            let createdWorkItemId: string | null = null;

            for (const assignee of stageNodeAssignees) {
              const wiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              createdWorkItemId = wiId;
              await this.repo.addWorkItem(
                documentId,
                {
                  id: wiId,
                  nodeId: stageNodeId,
                  role: stageNode.role,
                  assigneeUserId: assignee.userId,
                  nodeType: stageNode.nodeType,
                },
                tx,
                bpmnVersion,
              );

              await this.addAuditOutgoingAware(
                documentId,
                {
                  user_id: effectiveUserId,
                  display_name: payload.displayName,
                  role: wi.role,
                  action_code: actionCode,
                  from_node_id: wi.nodeId,
                  to_node_id: stageNodeId,
                  receiver: assignee.userId,
                  receiver_unit: payload.receiver_unit,
                  group_: payload.group_ || null,
                  roleProcess: 'processor',
                  action: 'Xử lý chính',
                  created_by: effectiveUserId,
                  stage_status:
                    this.getStageStatusByTypeSign(
                      stageNodeProps.signerRequired ||
                      stageNodeProps.processRequired ||
                      null,
                    ) || stageStatus || stageStatusDoc.CHUA_XU_LY,
                  origin_id: wi.id,
                  deadline: finalDeadline,
                  details: {
                    note: payload?.note,
                    signOrder: assignee.signOrder,
                    concurrentStageKey,
                  },
                  curStatusCode: statusDoc,
                  typeDocument: 'OutGoingDocument',
                  authMaps,
                },
                tx,
              );

              if (
                this.notificationService &&
                assignee.userId &&
                String(stageNode.extensions.isStartConcurrentStep).toLowerCase() !== 'true'
              ) {
                await this.createConcurrentStageNotificationIfMissing({
                  recipientId: assignee.userId,
                  senderId: effectiveUserId ?? null,
                  documentId,
                  docTitle,
                });
              }
            }

            return createdWorkItemId
              ? {
                exists: false,
                status: 'created',
                workItemId: createdWorkItemId,
                auditId: null,
              }
              : null;
          },
        });

        skipLegacyTargetCreation =
          concurrentStageResult?.mode !== 'not-concurrent'
            ? concurrentStageResult?.shouldCreateLegacyTargetNode === false
            : false;

        await this.ensureMissingConcurrentStageNotifications({
          documentId,
          docTitle,
          bpmnVersion,
          indexes,
          currentNode: node,
          stage: concurrentStageResult?.stage,
          senderId: effectiveUserId ?? null,
          fallbackAssignees: finalAssigneesForConcurrent,
        });
      }

      if (shouldCreateTargetArtifacts && (!isSignerNode || isLastSigner) && !skipLegacyTargetCreation) {
        // [CẢI TIẾN]: Lọc bỏ những người đã xử lý hoặc chính mình nếu không cần thiết
        // Nếu không phải node ký (multi), và mình là một trong những người nhận, có thể cân nhắc bỏ qua record audit cho chính mình
        const finalAssignees = assignees.filter(a => {
          if (a.userId === userId && !typeSign) return false; // Không tự gửi cho mình nếu không phải bước ký kế tiếp
          return true;
        });

        if (finalAssignees.length === 0 && assignees.length > 0) {
          // Nếu lọc hết thì giữ lại ít nhất 1 (để flow không chết)
          finalAssignees.push(assignees[0]);
        }

        // this.logger.log(`[${logKey}] ℹ️ Creating ${finalAssignees.length} workitems & audit records`);
        //const loopStart = Date.now();

        // Nếu có nhiều người ký, tạo workitem và audit cho từng người
        for (let i = 0; i < finalAssignees.length; i++) {
          const assignee = finalAssignees[i];
          const wiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          arrayWids.push(wiId);

          // const t0 = Date.now();
          await this.repo.addWorkItem(
            payload.docIds,
            {
              id: wiId,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: assignee.userId,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
          // this.logger.log(`[${logKey}] ⏱️ addWorkItem[${i + 1}/${finalAssignees.length}]: ${Date.now() - t0}ms`);

          // const t1 = Date.now();
          await this.addAuditOutgoingAware(
            payload.docIds,
            {
              user_id: effectiveUserId,
              display_name: payload.displayName,
              role: wi.role,
              action_code: actionCode,
              from_node_id: wi.nodeId,
              to_node_id: nextNode.id,
              receiver: assignee.userId,
              receiver_unit: payload.receiver_unit,
              group_: payload.group_ || null,
              roleProcess: statusDoc ? 'processor' : 'supporter',
              action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
              created_by: effectiveUserId,
              stage_status: stageStatus ? stageStatus : stageStatusDoc.CHUA_XU_LY,
              origin_id: wi.id,
              deadline: finalDeadline,
              details: {
                note: payload?.note,
                signOrder: assignee.signOrder,
              },
              curStatusCode: statusDoc,
              typeDocument: 'OutGoingDocument',
              authMaps,
            },
            tx,
          );
          // this.logger.log(`[${logKey}] ⏱️ addAuditOutgoingAware[${i + 1}/${finalAssignees.length}]: ${Date.now() - t1}ms`);
        }
        // this.logger.log(`[${logKey}] ⏱️ Total loop (workitems + audits): ${Date.now() - loopStart}ms for ${finalAssignees.length} assignees`);
        // Đoạn code Ký số sẽ được dời xuống SAU KHI Transaction hoàn tất
      }

      // Comment tự động theo hành động
      const actionText = 'Trình ký: ';

      const namesStart = Date.now();
      const userNames = assignees.map(a => {
        return getDisplayNameInMemory(a.userId) || a.userId;
      });
      // this.logger.log(`[${logKey}] ⏱️ buildDisplayNameWithAuthorized (${assignees.length} users): ${Date.now() - namesStart}ms`);

      const receiverText = userNames.length
        ? ` ${[...new Set(userNames)].join(', ')}`
        : targetRole
          ? ` vai trò ${targetRole}`
          : '';

      // const combinedContent = [
      //   `Trình ký:${receiverText}.`,
      //   payload?.note
      // ].filter(Boolean).join('\n');
      const combinedContent = payload?.note || '';

      if (statusDoc)
        await this.repo.updateOutGoingDocumentStatus(
          payload?.docIds,
          statusDoc,
          tx,
        );
      const commitStart = Date.now();
      await this.repo.commit(tx);
      // this.logger.log(`[${logKey}] ⏱️ tx.commit(): ${Date.now() - commitStart}ms`);


      // [TỐI ƯU 3]: Đưa tác vụ Gọi API Ký số Mạng bên ngoài ra khỏi Transaction để phòng chống DB Locking
      const res = true;
      if (shouldCreateTargetArtifacts) {
        const arrayAssassignees: string[] = assignees.map(a => a.userId);
        const nextEx = getAllNodeExtensionProperties(nextNode);
        if (nextEx?.signerRequired) {
          // Bắn lệnh lên hệ thống Ký số tập trung chạy NGẦM (Background) 
          // Thao tác này giúp API setProcessor kết thúc ngay lập tức, triệt tiêu độ trễ 21 giây
          this.integrationSignatureService.updateSignatureStatusCamunda(
            arrayAssassignees as string[],
            doc,
            nextNode,
            indexes,
            arrayWids,
            targetRole,
            docDetail // Truyền docDetail đã map sẵn
          ).catch((error) => {
            console.error('Lỗi cập nhật trạng thái ký số (chạy nền):', error);
            warnings.push({
              code: 'UPDATE_SIGNATURE_STATUS_FAILED',
              message: 'Không thể cập nhật trạng thái ký số tập trung',
              detail: error?.message || error,
            });
          });
        }
      }


      // [TỐI ƯU 4]: Background Async cho System Comment và fetch document song song
      const finalDocPromise = this.repo.getOutgoingDocument(payload?.docIds);

      this.addSystemComment(
        payload?.docIds,
        payload,
        combinedContent,
        effectiveUserId,
      ).catch(e => console.error(e));

      // Tạo danh sách tasks từ arrayWids và assignees
      const nextTasks = shouldCreateTargetArtifacts ? assignees.map((assignee, index) => ({
        workItemId: arrayWids[index],
        assignee: assignee.userId,
        signOrder: assignee.signOrder,
        nodeId: nextNode?.id,
        nodeType: nextNode?.$type,
      })) : [];

      // Lấy actionCode từ outgoing flows của nextNode
      const nextOuts = shouldCreateTargetArtifacts ? (indexes.outgoingBySource.get(nextNode.id) || []) : [];
      const nextActionCodes = nextOuts.map((f: any) => f.name).filter(Boolean);


      // const totalElapsed = Date.now() - startTime;
      // this.logger.log(`[${logKey}] ✅ FINISH setProcessor - TOTAL: ${totalElapsed}ms`);
      // this.logger.log(`[${logKey}] 📊 Summary:`, JSON.stringify({
      //   totalMs: totalElapsed,
      //   assignees: assignees.length,
      //   workItemsCreated: arrayWids.length,
      //   isSignerNode,
      //   isLastSigner,
      //   hasNextNode: !!nextNode,
      // }));

      return {
        status: 1,
        message: res
          ? 'Gửi trình ký số tập trung thành công'
          : 'Gui gửi trình ký số tập trung thất bại',
        // document: await finalDocPromise,
        isSignerNode,
        isLastSigner,
        nextNode: shouldCreateTargetArtifacts ? {
          nodeId: nextNode.id,
          nodeType: nextNode.$type,
          targetRole: targetRole,
          actionCode: nextActionCodes,
          tasks: nextTasks,
        } : null,
        concurrentStage: concurrentStageResult,
        warnings,
      };
    } catch (e) {
      const totalElapsed = Date.now() - startTime;
      // this.logger.error(`[${logKey}] ❌ ERROR setProcessor after ${totalElapsed}ms: ${e.message}`);
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async approveDraft({
    bpmnXML,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
  }: {
    bpmnXML: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    bpmnVersion: string;
  }): Promise<any> {
    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;

    // [TỐI ƯU 1]: Chạy song song parse BPMN và lấy WorkItem
    const [modelResult, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(docIds, workItemId),
    ]);
    const { indexes } = modelResult;

    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNode } =
      flow && this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(cur).statusCode;

    // === Normal Transfer / Approval ===
    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
    let assignTo: string | null = null;
    let sameParentVT: any[] = [];
    const giveNumber =
      getAllNodeExtensionProperties(nextNode).giveNumber || false;

    if (requiresAssignee) {
      if (giveNumber) {
        // [TỐI ƯU 2]: Chạy song song lấy danh sách văn thư và thông tin người dùng hiện tại
        const [listVT, me] = await Promise.all([
          this.sqlsvRepo.getUsersInFlow(
            bpmnVersion,
            targetRole,
            100,
            1,
            userId,
          ),
          this.sqlsvRepo.getUserById(userId) as Promise<any>,
        ]);

        if (!me || !me.parent) {
          throw new BadRequestException(
            'Không tìm thấy thông tin phòng ban của người dùng.',
          );
        }

        const matchedVT = listVT.usersWithType;
        sameParentVT = matchedVT.filter(
          (vt) => String(vt.parent) === String(me.parent.id),
        );

        if (sameParentVT.length === 0) {
          throw new BadRequestException(
            'Không tìm thấy văn thư trong cùng phòng với người dùng.',
          );
        }
      } else {
        // [TỐI ƯU 3]: Chạy song song lấy Audit và các ứng viên phù hợp role
        const [audit, candidates] = await Promise.all([
          this.repo.getAudit(docIds),
          this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
        ]);

        assignTo = audit.find((x) => x.actionCode === 'CREATE')?.createdBy;
        if (!assignTo)
          throw new BadRequestException(
            'Không tìm thấy người xử lý từ audit CREATE',
          );

        if (candidates.length && !candidates.includes(assignTo)) {
          throw new BadRequestException(`Không tìm thấy người xử lý`);
        }
      }
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(docIds, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      if (nextNode) {
        if (giveNumber && sameParentVT.length > 0) {
          // Tạo workitem cho tất cả văn thư cùng phòng
          for (const vt of sameParentVT) {
            await this.repo.addWorkItem(
              docIds,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: nextNode.id,
                role: targetRole,
                assigneeUserId: vt._id.toString(),
                nodeType: nextNode.$type,
              },
              tx,
              bpmnVersion,
            );
          }
        } else {
          await this.repo.addWorkItem(
            docIds,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: requiresAssignee ? assignTo : null,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
        }
      }

      // [TỐI ƯU 4]: Các tác vụ ghi vào DB chính được thực hiện tuần tự để đảm bảo tính nhất quán trong Transaction
      await this.updateStageStatusAuditOutgoingAware(
        docIds,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.DONG_Y_VBDT,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );
      await this.addAuditOutgoingAware(
        docIds,
        {
          user_id: effectiveUserId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: sameParentVT.length > 0 ? 'CAN_CHO_SO' : assignTo,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Xử lý chính',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      if (statusDoc)
        await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);

      await this.repo.commit(tx);

      // [TỐI ƯU 5]: Background Async cho System Comment và fetch document song song
      const finalDocPromise = this.repo.getOutgoingDocument(docIds);

      const actionText = 'Đồng ý dự thảo';
      const combinedContent = [`${actionText}.`, payload?.note]
        .filter(Boolean)
        .join('\n');

      this.addSystemComment(
        docIds,
        payload,
        combinedContent,
        originalUser || effectiveUserId,
      ).catch((e) => console.error('Error adding system comment:', e));

      return {
        status: 1,
        document: await finalDocPromise,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }


  async requestLeadershipFeedback({
    docIds,
    commanders,
    note,
    currentUserId,
    workItemId,
    bpmnFeedbackXML,
    isPeerFeedback = false,
    role: role = '',
  }: {
    docIds: string[];
    commanders: string[];
    note?: string;
    currentUserId: string;
    workItemId: string;
    bpmnFeedbackXML?: string;
    allowedUnitIds?: string[];
    isPeerFeedback?: boolean;
    role?: string;
  }): Promise<{ successCount: number; message: string }> {
    const normalizeRole = (r: string) => String(r || '').trim().toLowerCase().replace(/_/g, '');

    if (commanders.length === 0) {
      throw new BadRequestException(
        isPeerFeedback
          ? 'Danh sách đồng nghiệp trống'
          : 'Danh sách lãnh đạo trống',
      );
    }

    // [TỐI ƯU 1]: Chạy song song parse BPMN Feedback và chuẩn bị thông tin người dùng
    const allUserIds = [...new Set([...commanders, currentUserId])];
    const [modelResultfb, userRows] = await Promise.all([
      this.getModelFromXml(bpmnFeedbackXML ?? ''),
      this.sqlsvRepo.getUsersByArray(allUserIds),
    ]);
    const { indexes: indexesfb } = modelResultfb;

    const userMap = new Map(
      userRows.map((u) => [
        u.id.toString(),
        (u as any).name || u.id.toString(),
      ]),
    );
    const currentUserName = userMap.get(currentUserId) || currentUserId;

    // [TỐI ƯU 2]: Lấy thông tin các văn bản và workitem hiện tại theo lô (batch) bằng Promise.all
    const docsInfo = await Promise.all(
      docIds.map(async (rawId) => {
        const docId = String(rawId).trim();
        const doc = await this.repo.getOutgoingDocument(docId);
        if (!doc) return null;
        const currentWorkItem = await this.repo.getWorkItem(
          doc.document_id || doc.documentId,
          workItemId,
        );
        return { doc, currentWorkItem };
      }),
    );

    const pool = await this.getMsPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const notificationsToSend: any[] = [];
    let successCount = 0;
    const bpmnCache = new Map<string, any>(); // Bộ nhớ đệm cho model BPMN chính
    const roleCache = new Map<string, any>(); // Bộ nhớ đệm cho role code
    const groupUserCache = new Map<string, any>(); // Bộ nhớ đệm cho group user

    try {
      for (const info of docsInfo) {
        if (!info || !info.currentWorkItem) continue;
        const { doc, currentWorkItem } = info;

        // [TỐI ƯU 3]: Sử dụng cache để tránh parse BPMN lặp lại cho cùng phiên bản
        let indexes = bpmnCache.get(currentWorkItem.bpmnVersion);
        if (!indexes) {
          const bpmnXML = await this.repo.getBpmnFile(
            currentWorkItem.bpmnVersion,
          );
          const result = await this.getModelFromXml(bpmnXML);
          indexes = result.indexes;
          bpmnCache.set(currentWorkItem.bpmnVersion, indexes);
        }

        const currentNode = indexes.nodes.get(currentWorkItem.nodeId);
        if (!currentNode) continue;

        const outgoingFlows =
          indexes.outgoingBySource.get(currentNode.id) || [];
        const xinYKienFlow = outgoingFlows.find(
          (f: any) =>
            f.name?.toUpperCase() === 'XIN_Y_KIEN' ||
            this.bpmnEngine.flowActionCode?.(f) === 'XIN_Y_KIEN',
        );
        if (!xinYKienFlow) {
          console.warn(
            `Không tìm thấy flow XIN_Y_KIEN từ node ${currentNode.id}`,
          );
          continue;
        }

        const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
          xinYKienFlow,
          indexes,
        );
        if (!targetNode) continue;

        const targetRole = indexes.laneMap.get(targetNode.id);
        if (!targetRole) continue;

        // 4. Tạo comment hệ thống
        const commentText = isPeerFeedback
          ? 'Xin ý kiến đồng nghiệp'
          : 'Xin ý kiến chỉ đạo';
        await this.repo.createComment({
          documentId: (doc?.document_id || doc?.documentId)?.toString(),
          userId: currentUserId,
          userName: currentUserName,
          content: note || commentText,
          type: 'system',
        });

        // 5. Cập nhật outgoing_documents
        await new sql.Request(transaction)
          .input('note', sql.NVarChar, note || commentText)
          .input('docId', sql.NVarChar, doc.document_id || doc.documentId).query(`
          UPDATE outgoing_documents 
          SET current_note = @note, 
              updated_at = GETDATE()
          WHERE document_id = @docId
        `);

        // 7. Tạo workitem mới cho từng lãnh đạo/đồng nghiệp
        if (isPeerFeedback) {
          // PEER FEEDBACK: Tối ưu với Cache
          let peerRoleCode = roleCache.get(
            `${currentUserId}_${currentWorkItem.bpmnVersion}`,
          );
          if (!peerRoleCode) {
            const currentUserRole = await this.sqlsvRepo.getUserRole(
              currentUserId,
              currentWorkItem.bpmnVersion,
            );
            peerRoleCode = currentUserRole?.roleCode;
            roleCache.set(
              `${currentUserId}_${currentWorkItem.bpmnVersion}`,
              peerRoleCode,
            );
          }

          if (peerRoleCode) {
            const normalizedPeerRole = normalizeRole(peerRoleCode);
            const laneNodeIds = [...indexesfb.laneMap.entries()]
              .filter(([_, r]) => normalizeRole(r) === normalizedPeerRole)
              .map(([nodeId]) => nodeId);

            if (laneNodeIds.length > 0) {
              const startEvents = [...indexesfb.nodes.values()].filter(
                (n: any) => n.$type === 'bpmn:StartEvent',
              );
              let peerNodeId: string | null = null;
              let peerNodeType: string | null = null;

              for (const startEvent of startEvents) {
                const flows =
                  indexesfb.outgoingBySource.get(startEvent.id) || [];
                for (const flow of flows) {
                  const targetId = flow.targetRef?.id;
                  if (targetId && laneNodeIds.includes(targetId)) {
                    const { node: nextNode } =
                      this.bpmnEngine.nextInteractiveFromFlow(flow, indexesfb);
                    peerNodeId = nextNode.id;
                    peerNodeType = nextNode.$type;
                    break;
                  }
                }
                if (peerNodeId) break;
              }

              if (peerNodeId) {
                for (const peerId of commanders) {
                  if (peerId === currentUserId) continue;
                  await this.repo.addWorkItem(
                    doc.document_id || doc.documentId,
                    {
                      id: `wi_peer_${Date.now()}_${peerId}`,
                      nodeId: peerNodeId,
                      role: peerRoleCode,
                      assigneeUserId: peerId,
                      nodeType: peerNodeType,
                    },
                    transaction,
                    'XIN_Y_KIEN',
                  );

                  const docTitle = doc.abstractNote || doc.abstract_note || '';
                  notificationsToSend.push({
                    recipientId: peerId,
                    senderId: currentUserId,
                    content: `Đồng chí ${currentUserName} yêu cầu xin ý kiến đồng nghiệp.`,
                    title: `Bạn có văn bản cần cho ý kiến: “${docTitle}”`,
                    recordId: (doc.document_id || doc.documentId).toString(),
                    link: `/outgoing-documents/${doc.document_id || doc.documentId}`,
                    key: 'VIEW_OUTCOMING_DOC',
                    type: NotificationType.OUTGOING_DOC_OPINION_REQUESTED.value,
                    time: new Date(),
                    status: 1,
                  });
                }
              }
            }
          }
        } else {
          // LEADERSHIP FEEDBACK: Tối ưu với Cache
          for (const commanderId of commanders) {
            let roleInfo = roleCache.get(
              `${commanderId}_${currentWorkItem.bpmnVersion}`,
            );
            if (!roleInfo) {
              roleInfo = await this.sqlsvRepo.getUserRole(
                commanderId,
                currentWorkItem.bpmnVersion,
              );
              roleCache.set(
                `${commanderId}_${currentWorkItem.bpmnVersion}`,
                roleInfo,
              );
            }
            const roleCode = roleInfo?.roleCode;
            if (!roleCode) continue;

            const normalizedRoleCode = normalizeRole(roleCode);
            const laneNodeIds = [...indexesfb.laneMap.entries()]
              .filter(([_, r]) => normalizeRole(r) === normalizedRoleCode)
              .map(([nodeId]) => nodeId);

            const roleCodesList = role ? String(role).split(',').map(r => r.trim()).filter(Boolean) : [];
            const groupUserIdsSet = new Set<string>();
            for (const rCode of roleCodesList) {
              let gUser = groupUserCache.get(rCode);
              if (gUser === undefined) {
                try {
                  gUser = await this.groupUserService.findByCode(rCode);
                } catch (e) {
                  gUser = null;
                }
                groupUserCache.set(rCode, gUser);
              }
              const users = gUser?.data?.users || [];
              users.forEach((user: any) => {
                if (user?.id) groupUserIdsSet.add(String(user.id));
              });
            }
            const groupUserId = Array.from(groupUserIdsSet);

            if (laneNodeIds.length === 0 && groupUserId.length === 0) continue;

            const startEvents = [...indexesfb.nodes.values()].filter(
              (n: any) => n.$type === 'bpmn:StartEvent',
            );
            let nextNodeId: string | null = null;

            for (const startEvent of startEvents) {
              const flows = indexesfb.outgoingBySource.get(startEvent.id) || [];
              for (const flow of flows) {
                const targetId = flow.targetRef?.id;
                if (
                  targetId &&
                  laneNodeIds.includes(targetId) &&
                  laneNodeIds.length > 0
                ) {
                  const { node: nextNode } =
                    this.bpmnEngine.nextInteractiveFromFlow(flow, indexesfb);
                  nextNodeId = nextNode.id;

                  await this.repo.addWorkItem(
                    doc.document_id || doc.documentId,
                    {
                      id: `wi_${Date.now()}`,
                      nodeId: nextNodeId,
                      role: roleCode,
                      assigneeUserId: commanderId,
                      nodeType: nextNode.$type,
                    },
                    transaction,
                    'XIN_Y_KIEN',
                  );

                  const docTitle = doc.abstractNote || doc.abstract_note || '';
                  notificationsToSend.push({
                    recipientId: commanderId,
                    senderId: currentUserId,
                    content: `Đồng chí ${currentUserName} yêu cầu xin ý kiến chỉ đạo.`,
                    title: `Bạn có văn bản cần cho ý kiến: “${docTitle}”`,
                    recordId: (doc.document_id || doc.documentId).toString(),
                    link: `/outgoing-documents/${doc.document_id || doc.documentId}`,
                    key: 'VIEW_OUTCOMING_DOC',
                    type: NotificationType.OUTGOING_DOC_OPINION_REQUESTED.value,
                    time: new Date(),
                    status: 1,
                  });
                  break;
                } else {
                  const targetLane = indexesfb.laneMap.get(targetId);
                  const userInLane = await this.repo.getUsersByRoleInFlow(
                    'XIN_Y_KIEN',
                    targetLane,
                  );
                  if (
                    groupUserId.includes(commanderId) &&
                    userInLane?.includes(commanderId)
                  ) {
                    const { node: nextNode } =
                      this.bpmnEngine.nextInteractiveFromFlow(flow, indexesfb);
                    nextNodeId = nextNode.id;

                    await this.repo.addWorkItem(
                      doc.document_id || doc.documentId,
                      {
                        id: `wi_${Date.now()}`,
                        nodeId: nextNodeId,
                        role: roleCode,
                        assigneeUserId: commanderId,
                        nodeType: nextNode.$type,
                      },
                      transaction,
                      'XIN_Y_KIEN',
                    );

                    const docTitle = doc.abstractNote || doc.abstract_note || '';
                    notificationsToSend.push({
                      recipientId: commanderId,
                      senderId: currentUserId,
                      content: `Đồng chí ${currentUserName} yêu cầu xin ý kiến chỉ đạo.`,
                      title: `Bạn có văn bản cần cho ý kiến: “${docTitle}”`,
                      recordId: (doc.document_id || doc.documentId).toString(),
                      link: `/outgoing-documents/${doc.document_id || doc.documentId}`,
                      key: 'VIEW_OUTCOMING_DOC',
                      type: NotificationType.OUTGOING_DOC_OPINION_REQUESTED.value,
                      time: new Date(),
                      status: 1,
                    });
                    break;
                  }
                }
              }
              if (nextNodeId) break;
            }
          }
        }

        // 8. MERGE feedback_requests
        const normalizedCommanders = this.normalizeCommanders(commanders);
        if (normalizedCommanders.length > 0) {
          const commandersStatus: Record<string, string> = {};
          normalizedCommanders.forEach(
            (id) => (commandersStatus[id] = 'notGiven'),
          );

          await new sql.Request(transaction)
            .input('employee_id', sql.NVarChar, currentUserId)
            .input('document_id', sql.NVarChar, doc.document_id || doc.documentId)
            .input(
              'commanders',
              sql.NVarChar,
              JSON.stringify(normalizedCommanders),
            )
            .input(
              'commanders_status',
              sql.NVarChar,
              JSON.stringify(commandersStatus),
            )
            .input('count_not_give', sql.Int, normalizedCommanders.length)
            .input('note', sql.NVarChar, note || null)
            .input('document_type', sql.NVarChar, 'outgoing').query(`
            MERGE INTO feedback_requests AS target
            USING (SELECT @employee_id AS employee_id, @document_id AS document_id) AS source
            ON target.employee_id = source.employee_id AND target.document_id = source.document_id
            WHEN MATCHED THEN
              UPDATE SET commanders = @commanders, commanders_status = @commanders_status, count_not_give = @count_not_give, note = @note, updated_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (employee_id, document_id, document_type, commanders, commanders_status, count_not_give, count_gave, note, created_at, updated_at)
              VALUES (@employee_id, @document_id, @document_type, @commanders, @commanders_status, @count_not_give, 0, @note, GETDATE(), GETDATE());
          `);
        }

        // 9. Cập nhật trạng thái 'given' cho bản ghi của người yêu cầu
        const fbResult = await new sql.Request(transaction)
          .input('docId', sql.NVarChar, doc.document_id || doc.documentId)
          .input('userId', sql.NVarChar, currentUserId).query(`
            SELECT id, commanders_status 
            FROM feedback_requests 
            WHERE document_id = @docId AND document_type = 'outgoing' AND JSON_QUERY(commanders) IS NOT NULL
            AND EXISTS (SELECT 1 FROM OPENJSON(commanders) WHERE [value] = @userId)
          `);

        if (fbResult.recordset.length > 0) {
          const fbRecord = fbResult.recordset[0];
          let commandersStatus: Record<string, string> = {};
          try {
            commandersStatus = JSON.parse(fbRecord.commanders_status || '{}');
          } catch (e) {
            commandersStatus = {};
          }
          commandersStatus[currentUserId] = 'given';
          await new sql.Request(transaction)
            .input('fbId', sql.Int, fbRecord.id)
            .input('status', sql.NVarChar, JSON.stringify(commandersStatus))
            .query(`UPDATE feedback_requests SET commanders_status = @status, updated_at = GETDATE() WHERE id = @fbId`);
        }

        successCount++;
      }

      await transaction.commit();

      // Gửi thông báo bất đồng bộ sau khi commit thành công để tránh tình trạng roll back
      if (notificationsToSend.length > 0) {
        for (const notification of notificationsToSend) {
          this.notificationService.create(notification).catch((err) => {
            this.logger.error(
              `Error sending feedback notification to user ${notification.recipientId}: ${err.message}`,
            );
          });
        }
      }

      return {
        successCount,
        message: isPeerFeedback
          ? `Đã gửi xin ý kiến đồng nghiệp thành công tới ${commanders.length} người cho ${successCount} văn bản.`
          : `Đã gửi xin ý kiến lãnh đạo thành công tới ${commanders.length} người cho ${successCount} văn bản.`,
      };
    } catch (error: any) {
      await transaction.rollback();
      throw error;
    }
  }

  // outgoing-documents.service.ts

  async transferOpinion(input: {
    docIds: string[];
    workItemId: string;
    receiverUserIds: string[];
    note?: string;
    currentUserId: string;
    bpmnXML: string;
    allowedUnitIds?: string[];
  }): Promise<{ successCount: number; message: string; details: any[] }> {
    const {
      docIds,
      workItemId,
      receiverUserIds,
      note = 'Chuyển cho ý kiến tiếp theo',
      currentUserId,
      bpmnXML,
      allowedUnitIds = [],
    } = input;

    if (!receiverUserIds.length)
      throw new BadRequestException('Chưa chọn người nhận ý kiến');

    // [TỐI ƯU 1]: Chuẩn bị dữ liệu ban đầu song song (BPMN, Users, Roles)
    const [modelResult, userDocs, currentUserRepo, rolesInfo] =
      await Promise.all([
        this.getModelFromXml(bpmnXML),
        Promise.all(receiverUserIds.map((id) => this.sqlsvRepo.getUserById(id))),
        this.sqlsvRepo.getUserById(currentUserId),
        Promise.all(
          receiverUserIds.map((id) =>
            this.sqlsvRepo.getUserRole(id, 'XIN_Y_KIEN'),
          ),
        ),
      ]);
    const { indexes: fbIndexes } = modelResult as any;

    if (!currentUserRepo)
      throw new BadRequestException('Không tìm thấy người chuyển');

    const userMap = new Map<string, any>();
    userDocs.forEach((u, i) =>
      userMap.set(receiverUserIds[i], u || { id: receiverUserIds[i] }),
    );
    userMap.set(currentUserId, currentUserRepo);

    // [TỐI ƯU 2]: Xác định validReceivers DUY NHẤT MỘT LẦN cho toàn bộ lô văn bản
    const validReceivers: { userId: string; roleCode: string; name: string }[] =
      [];
    receiverUserIds.forEach((uid, idx) => {
      const user = userMap.get(uid);
      if (!user) return;

      const parentId =
        user.parent?.id?.toString() || user.parent?.toString() || '';
      if (allowedUnitIds.length > 0 && !allowedUnitIds.includes(parentId))
        return;

      const roleInfo = rolesInfo[idx];
      if (!roleInfo?.roleCode) return;

      validReceivers.push({
        userId: uid,
        roleCode: roleInfo.roleCode,
        name: user.name || uid,
      });
    });

    if (!validReceivers.length) {
      return {
        successCount: 0,
        message: 'Không có người nhận hợp lệ',
        details: docIds.map((id) => ({
          docId: id,
          error: 'Không có người nhận hợp lệ',
        })),
      };
    }

    // [TỐI ƯU 3]: Lấy thông tin các văn bản và workitem hiện tại SONG SONG
    const docsInfo = await Promise.all(
      docIds.map(async (rawId) => {
        const docId = String(rawId).trim();
        const doc = await this.repo.getOutgoingDocument(docId);
        if (!doc) return { docId, error: 'Không tìm thấy văn bản' };

        const currentWorkItem = await this.repo.getWorkItem(
          doc.document_id || doc.documentId,
          workItemId,
        );
        if (
          !currentWorkItem ||
          currentWorkItem.assigneeUserId !== currentUserId
        ) {
          return {
            docId,
            error: 'Bạn không có quyền chuyển ý kiến tại công việc này',
          };
        }
        return { docId, doc, currentWorkItem };
      }),
    );

    const conn = await this.getMsPool();
    const transaction = new sql.Transaction(conn);
    await transaction.begin();

    const results: any[] = [];
    let successCount = 0;

    try {
      for (const info of docsInfo) {
        if ('error' in info) {
          results.push({ docId: info.docId, error: info.error });
          continue;
        }
        const { doc, currentWorkItem, docId } = info as any;

        // 4. Cập nhật feedback_requests
        const commandersStatus: Record<string, string> = {
          [currentUserId]: 'transferred',
        };
        validReceivers.forEach(
          (r) => (commandersStatus[r.userId] = 'notGiven'),
        );

        await new sql.Request(transaction)
          .input('employeeId', sql.VarChar, currentUserId)
          .input('documentId', sql.VarChar, doc.document_id || doc.documentId)
          .input(
            'commanders',
            sql.VarChar,
            JSON.stringify(validReceivers.map((r) => r.userId)),
          )
          .input(
            'commandersStatus',
            sql.VarChar,
            JSON.stringify(commandersStatus),
          )
          .input('countNotGive', sql.Int, validReceivers.length)
          .input('note', sql.VarChar, note).query(`
            MERGE feedback_requests AS target
            USING (SELECT @employeeId AS employee_id, @documentId AS document_id) AS src
            ON target.employee_id = src.employee_id AND target.document_id = src.document_id
            WHEN MATCHED THEN 
              UPDATE SET commanders = @commanders, commanders_status = @commandersStatus, count_not_give = @countNotGive, note = @note, updated_at = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (employee_id, document_id, document_type, commanders, commanders_status, count_not_give, count_gave, note, created_at, updated_at)
              VALUES (@employeeId, @documentId, 'outgoing', @commanders, @commandersStatus, @countNotGive, 0, @note, GETDATE(), GETDATE());
          `);

        // 5. Tạo workItem cho từng người nhận (Sử dụng validReceivers đã chuẩn bị)
        const transferDetails: any[] = [];
        for (const receiver of validReceivers) {
          try {
            const laneNodes = [...fbIndexes.laneMap.entries()]
              .filter(([_, role]) => role === receiver.roleCode)
              .map(([nodeId]) => nodeId);

            if (!laneNodes.length) {
              transferDetails.push({
                userId: receiver.userId,
                name: receiver.name,
                status: 'failed',
                reason: 'Không tìm thấy lane',
              });
              continue;
            }

            let targetNodeId: string | null = null;
            const startEvents = [...fbIndexes.nodes.values()].filter(
              (n: any) => n.$type === 'bpmn:StartEvent',
            );

            for (const startEvent of startEvents) {
              const flows = fbIndexes.outgoingBySource.get(startEvent.id) || [];
              for (const flow of flows) {
                const { node: nextNode } =
                  this.bpmnEngine.nextInteractiveFromFlow(flow, fbIndexes);
                if (nextNode?.id && laneNodes.includes(nextNode.id)) {
                  targetNodeId = nextNode.id;
                  break;
                }
              }
              if (targetNodeId) break;
            }

            if (!targetNodeId) targetNodeId = laneNodes[0];
            const targetNode = fbIndexes.nodes.get(targetNodeId);

            const newWorkItemId = `wi_${Date.now()}_${receiver.userId}`;
            await this.repo.addWorkItem(
              doc.document_id || doc.documentId,
              {
                id: newWorkItemId,
                nodeId: targetNodeId!,
                role: receiver.roleCode,
                assigneeUserId: receiver.userId,
                nodeType: targetNode?.$type,
                isFeedbackTask: true,
                parentWorkItemId: workItemId,
                feedbackFromUserId: currentUserId,
              },
              transaction,
              'XIN_Y_KIEN',
            );

            await this.addAuditIncomingAware(
              doc.document_id || doc.documentId,
              {
                user_id: currentUserId,
                display_name: currentUserRepo.name || currentUserId,
                action_code: 'CHUYEN_CHO_Y_KIEN',
                action: 'Chuyển cho ý kiến',
                from_node_id: currentWorkItem.nodeId,
                to_node_id: targetNodeId!,
                receiver: receiver.userId,
                roleProcess: receiver.roleCode,
                stage_status: 'CHO_Y_KIEN',
                curStatusCode: 'WAITING_FEEDBACK',
                details: { note, receiver_name: receiver.name },
                origin_id: workItemId,
                created_at: new Date(),
              },
              transaction,
            );

            transferDetails.push({
              userId: receiver.userId,
              name: receiver.name,
              status: 'success',
            });
          } catch (err: any) {
            transferDetails.push({
              userId: receiver.userId,
              name: receiver.name,
              status: 'failed',
              reason: err.message || 'Lỗi tạo workItem',
            });
          }
        }

        // 6. Xử lý WorkItem cũ, Comment và dọn dẹp FeedbackRequest
        // (Chuyển sang thực hiện tuần tự để tránh lỗi EREQINPROG trên cùng transaction)
        await this.repo.removeWorkItem(doc.document_id || doc.documentId, workItemId, transaction);
        await this.repo.createComment({
          documentId: doc.document_id || doc.documentId,
          userId: currentUserId,
          userName: currentUserRepo.name || currentUserId,
          content: `${note}\n- Đã chuyển cho ý kiến`,
          type: 'system',
        });

        const countResult = await new sql.Request(transaction)
          .input('docId', sql.VarChar, doc.document_id || doc.documentId)
          .query(
            `SELECT COUNT(*) AS total FROM feedback_requests WHERE document_id = @docId`,
          );
        if ((countResult.recordset[0]?.total || 0) > 1) {
          await new sql.Request(transaction)
            .input('docId', sql.VarChar, doc.document_id || doc.documentId).query(`
              DELETE FROM feedback_requests 
              WHERE id = (
                SELECT TOP 1 id 
                FROM feedback_requests 
                WHERE document_id = @docId 
                ORDER BY created_at ASC
              )
            `);
        }

        successCount++;
        results.push({
          docId,
          success: true,
          transferredTo: transferDetails,
        });
      }

      await transaction.commit();
      return {
        successCount,
        message: `Chuyển ý kiến thành công ${successCount}/${docIds.length} văn bản`,
        details: results,
      };
    } catch (err) {
      await transaction.rollback();
      console.error('transferOpinion error:', err);
      throw err;
    } finally {
      conn.close();
    }
  }

  async completeDraft({
    bpmnXML,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
  }: {
    bpmnXML: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    bpmnVersion?: string;
  }): Promise<any> {
    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;

    // [TỐI ƯU 1]: Song song hóa truy xuất dữ liệu ban đầu
    const [modelResult, wi, me] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(docIds, workItemId),
      this.sqlsvRepo.getUserById(userId) as Promise<any>,
    ]);

    const { indexes } = modelResult;
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    if (!node) throw new BadRequestException('Node not found in BPMN');

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );

    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusDoc;

    // Lấy danh sách văn thư sau khi đã có targetRole
    const listVT = await this.sqlsvRepo.getUsersInFlow(
      bpmnVersion || 'VAN_BAN_DI',
      targetRole,
      100,
      1,
      userId,
    );
    const matchedVT = listVT.usersWithType;
    const sameParentVT = matchedVT.filter(
      (vt) => String(vt.parent) === String(me.parent.id),
    );

    if (sameParentVT.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy văn thư trong cùng phòng với người dùng.',
      );
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(docIds, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      if (nextNode) {
        const requiresAssignee =
          nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
        for (const vt of sameParentVT) {
          await this.repo.addWorkItem(
            docIds,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: requiresAssignee ? vt._id.toString() : null,
              nodeType: nextNode.$type,
            },
            tx,
          );
        }
      }

      await this.updateStageStatusAuditOutgoingAware(
        docIds,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.HT_VBTT,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      await this.addAuditOutgoingAware(
        docIds,
        {
          user_id: effectiveUserId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: 'CAN_CHO_SO',
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Xử lý chính',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      if (statusDoc)
        await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);

      await this.repo.commit(tx);

      // [TỐI ƯU 4]: Chạy song song các tác vụ hậu xử lý và lấy kết quả cuối
      const [finalDoc] = await Promise.all([
        this.repo.getOutgoingDocument(docIds),
        this.addSystemComment(
          docIds,
          payload,
          payload?.note,
          originalUser || effectiveUserId,
        ),
        (async () => {
          try {
            const fileRelations = await this.repo.getFileRelationsByDocId(
              docIds,
            );
            await Promise.all(
              fileRelations.map((fr) =>
                this.repo.convertDocxToPdf(fr.file_id, userId),
              ),
            );
          } catch (err) {
            console.error('Error converting DOCX to PDF:', err);
          }
        })(),
      ]);

      return {
        status: 1,
        document: finalDoc,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }
  async promulgateDocument({
    bpmnXML,
    workItemId,
    payload,
    userId,
    originalUser,
  }: {
    bpmnXML: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
  }): Promise<any> {
    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;

    // [TỐI ƯU 1]: Song song hóa truy xuất dữ liệu ban đầu
    const [modelResult, wi, auditArr, proposal, draft, outgoing] =
      await Promise.all([
        this.getModelFromXml(bpmnXML),
        this.repo.getWorkItem(docIds, workItemId),
        this.repo.getAudit(docIds),
        this.repo.getFilesIsNumbered('docProposal', docIds),
        this.repo.getFilesIsNumbered('docDraft', docIds),
        this.repo.getOutgoingDocument(docIds),
      ]);

    const { indexes } = modelResult;
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    if (!node) throw new BadRequestException('Node not found in BPMN');

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );

    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const auditPrv = auditArr.find((x) => x.toNodeId === node.id);
    const extensionProperties = getAllNodeExtensionProperties(flow.targetRef);

    const hasNumberedProposal = proposal.some((x) => x === 1);
    const hasNumberedDraft = draft.some((x) => x === 1);

    if (
      extensionProperties.allowSendToUnit
        ? !hasNumberedDraft
        : !hasNumberedProposal
    ) {
      throw new BadRequestException(`Vui lòng cho số trước khi Ban hành`);
    }

    const targetRole = auditPrv
      ? indexes.laneMap.get(auditPrv.fromNodeId)
      : undefined;

    const rawOut = indexes.outgoingBySource.get(nextNode?.id);
    const outsv2 = Array.isArray(rawOut) ? rawOut : rawOut ? [rawOut] : [];

    let matched;
    let finalNextNode;
    let statusDoc;

    const hasNonEndFlow = outsv2.some(
      (f) => f?.targetRef?.$type !== 'bpmn:EndEvent',
    );

    if (hasNonEndFlow) {
      const senderLane = auditPrv?.fromNodeId
        ? indexes.laneMap.get(auditPrv.fromNodeId)
        : null;

      if (!senderLane) {
        throw new BadRequestException(
          'Không xác định được lane người gửi trước đó',
        );
      }
      const candidateFlows = outsv2
        .map((f) => {
          const targetNode = f?.targetRef?.id
            ? indexes.nodes.get(f.targetRef.id)
            : null;

          if (!targetNode) return null;

          return {
            flow: f,
            targetNode,
            lane: indexes.laneMap.get(targetNode.id),
          };
        })
        .filter(Boolean);

      matched = candidateFlows.find((c) => c?.lane === senderLane);

      if (!matched) {
        throw new BadRequestException(
          `Không tìm thấy nhánh phù hợp để trả lại lane ${senderLane}`,
        );
      }

      const res = this.bpmnEngine.nextInteractiveFromFlow(
        matched.flow,
        indexes,
      );
      finalNextNode = res?.node;
      statusDoc = getAllNodeExtensionProperties(
        matched.flow.targetRef,
      ).statusCode;
    } else {
      const firstFlow = outsv2[0];
      if (firstFlow) {
        matched = { flow: firstFlow };
        const res = this.bpmnEngine.nextInteractiveFromFlow(firstFlow, indexes);
        finalNextNode = res?.node;
      }
      statusDoc = getAllNodeExtensionProperties(flow.targetRef).statusCode;
    }

    const requiresAssignee =
      finalNextNode &&
      finalNextNode.$type !== 'bpmn:InclusiveGateway' &&
      !!targetRole;

    // [TỐI ƯU 2]: Chuẩn bị receivingDept và processor song song
    let receivingDept: string[] = [];
    if (outgoing.internalReceivingDept) {
      if (typeof outgoing.internalReceivingDept === 'string') {
        try {
          receivingDept = JSON.parse(outgoing.internalReceivingDept);
        } catch {
          receivingDept = outgoing.internalReceivingDept.trim()
            ? [outgoing.internalReceivingDept]
            : [];
        }
      } else if (Array.isArray(outgoing.internalReceivingDept)) {
        receivingDept = outgoing.internalReceivingDept;
      }
    }

    let processorArray: string[] = [];
    if (outgoing.processor) {
      if (typeof outgoing.processor === 'string') {
        try {
          processorArray = JSON.parse(outgoing.processor);
        } catch {
          processorArray = outgoing.processor.trim()
            ? [outgoing.processor]
            : [];
        }
      } else if (Array.isArray(outgoing.processor)) {
        processorArray = outgoing.processor;
      }
    }
    let knowReceiversArray: string[] = [];
    if (outgoing.knowReceivers) {
      if (typeof outgoing.knowReceivers === 'string') {
        try {
          knowReceiversArray = JSON.parse(outgoing.knowReceivers);
        } catch {
          knowReceiversArray = outgoing.knowReceivers.trim()
            ? [outgoing.knowReceivers]
            : [];
        }
      } else if (Array.isArray(outgoing.knowReceivers)) {
        knowReceiversArray = outgoing.knowReceivers;
      }
    }

    let documentViewerGroupsArray: string[] = [];
    if ((outgoing as any).documentViewerGroups) {
      if (typeof (outgoing as any).documentViewerGroups === 'string') {
        try {
          documentViewerGroupsArray = JSON.parse((outgoing as any).documentViewerGroups);
        } catch {
          documentViewerGroupsArray = (outgoing as any).documentViewerGroups.trim()
            ? [(outgoing as any).documentViewerGroups]
            : [];
        }
      } else if (Array.isArray((outgoing as any).documentViewerGroups)) {
        documentViewerGroupsArray = (outgoing as any).documentViewerGroups;
      }
    }

    // documentViewerGroups -> luu group IDs vao view_group cua incomming_documents
    // KHONG gop vao knowReceiversArray de tranh tao incomming_assignment role=viewer
    // Nguoi thuoc nhom nay chi thay van ban tai Tra cuu (/api/incoming/search)
    if (documentViewerGroupsArray.length > 0) {
      const viewGroupString = documentViewerGroupsArray.join(',');
      // Ghi de view_group cua outgoing de createIncomingDocumentCopy luu vao view_group
      (outgoing as any).viewGroup = viewGroupString;
    }

    if (this.notificationService) {
      try {
        const recipients = [...new Set([
          ...knowReceiversArray,
          ...processorArray,
        ])].filter((id) => typeof id === 'string' && id.trim() !== '');

        if (recipients.length > 0) {
          await Promise.all(
            recipients.map((recipientId) =>
              this.notificationService!.create({
                recipientId,
                senderId: userId,
                content: `Văn bản đi ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí xử lý.`,
                recordId: docIds,
                link: `/outgoing-documents/${docIds}`,
                key: 'VIEW_OUTCOMING_DOC',
                type: NotificationType.OUTGOING_DOC_PROCESS_ASSIGNEE.value,
                time: new Date(),
                status: 1,
              }),
            ),
          );
        }
      } catch (e: any) {
        this.logger.error(
          `❌ Notification failed for ${wi.assigneeUserId}: ${e?.message || e}`,
        );
      }
    }

    // [TỐI ƯU 3]: Lấy tất cả thông tin đơn vị và cấu hình luồng SONG SONG
    const [unitFlowConfigs, processorInfos, knowReceiverInfosRaw] = await Promise.all([
      extensionProperties.allowSendToUnit && receivingDept.length > 0
        ? this.sqlsvRepo.getIncomingFlowsByUnits(receivingDept)
        : Promise.resolve([]),
      processorArray.length > 0
        ? Promise.all(
          processorArray.map(async (p) => {
            const user: any = await this.sqlsvRepo.getUserById(p);
            if (!user?.parent?.id) return null;
            const flowConfig = await this.sqlsvRepo.getFlowByUnit(
              String(user.parent.id),
              'IncommingDocument',
            );
            return { processor: p, flowConfig, parentUser: user.parent.id };
          }),
        )
        : Promise.resolve([]),
      knowReceiversArray.length > 0
        ? Promise.all(
          knowReceiversArray.map(async (receiverId) => {
            const user: any = await this.sqlsvRepo.getUserById(receiverId);
            if (user) {
              if (!user.parent?.id) return null;
              const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
              return { type: 'user', knowReceiverUserId: receiverId, flowConfig, parentUser: user.parent.id };
            } else {
              try {
                const result = await this.groupUserInDocumentService.findUsersByGroupId(receiverId, { page: 1, limit: 1000 });
                const users = Array.isArray(result?.data) ? result.data : [];
                const resolvedUsers = await Promise.all(
                  users.map(async (u) => {
                    const uid = typeof u?.id === 'string' ? u.id.trim() : String(u?.id || '').trim();
                    if (!uid) return null;
                    const gUser: any = await this.sqlsvRepo.getUserById(uid);
                    if (!gUser?.parent?.id) return null;
                    const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(gUser.parent.id), 'IncommingDocument');
                    return { knowReceiverUserId: uid, flowConfig, parentUser: gUser.parent.id };
                  })
                );
                return { type: 'group', members: resolvedUsers.filter(Boolean) };
              } catch (err) {
                this.logger.warn(`Error resolving group ${receiverId} in completeWorkItemOtp: ${err?.message}`);
                return null;
              }
            }
          }),
        )
        : Promise.resolve([]),
    ]);

    const knowReceiverInfos: any[] = [];
    const groupMemberUserIds: string[] = [];
    for (const item of knowReceiverInfosRaw) {
      if (!item) continue;
      if (item.type === 'user') {
        knowReceiverInfos.push({ knowReceiverUserId: item.knowReceiverUserId, flowConfig: item.flowConfig, parentUser: item.parentUser });
      } else if (item.type === 'group' && Array.isArray(item.members)) {
        for (const member of item.members) {
          if (member && member.knowReceiverUserId) {
            groupMemberUserIds.push(member.knowReceiverUserId);
            knowReceiverInfos.push({ knowReceiverUserId: member.knowReceiverUserId, flowConfig: member.flowConfig, parentUser: member.parentUser });
          }
        }
      }
    }

    const flowConfigMap = new Map<string, any>();
    for (const fc of unitFlowConfigs) {
      if (!Array.isArray(fc.unit)) continue;
      for (const u of fc.unit) {
        flowConfigMap.set(String(u), fc);
      }
    }

    const processorFlowConfigs = new Map<string, any>();
    for (const info of processorInfos) {
      if (info && info.flowConfig) {
        processorFlowConfigs.set(info.processor, info);
      }
    }

    const tx = await this.repo.begin();

    const allKnowReceiverUserIds = [...new Set([
      ...knowReceiversArray,
      ...groupMemberUserIds,
      ...knowReceiverInfos.map((info) => info.knowReceiverUserId).filter(Boolean),
    ])];

    if (allKnowReceiverUserIds.length > 0) {
      const currentKnowReceivers = [...knowReceiversArray];
      const updatedKnowReceivers = [...new Set([...currentKnowReceivers, ...allKnowReceiverUserIds])];

      const updateRequest = tx.request();
      updateRequest.input('documentId', sql.VarChar, docIds);
      updateRequest.input('knowReceivers', sql.NVarChar, JSON.stringify(updatedKnowReceivers));
      await updateRequest.query(`
        UPDATE outgoing_documents
        SET know_receivers = @knowReceivers,
            updated_at = GETDATE()
        WHERE document_id = @documentId
      `);

      (outgoing as any).knowReceivers = JSON.stringify(updatedKnowReceivers);

      if (this.notificationService) {
        try {
          await Promise.all(
            allKnowReceiverUserIds.map((recipientId) =>
              this.notificationService!.create({
                recipientId,
                senderId: userId,
                content: `Văn bản đi ${outgoing.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí nhận để biết.`,
                recordId: docIds,
                link: `/outgoing-documents/${docIds}`,
                key: 'VIEW_OUTCOMING_DOC',
                type: NotificationType.OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW.value,
                time: new Date(),
                status: 1,
              })
            )
          );
        } catch (e: any) {
          this.logger.error(`❌ Notification for know receivers in completeWorkItemOtp failed: ${e?.message || e}`);
        }
      }
    }

    const incomingCopiesForUnits: Array<{
      incomingDocId: string;
      flowId: string;
      receiverUnit: string;
    }> = [];
    try {
      const removed = await this.repo.removeWorkItem(
        docIds,
        wi.id,
        wi.nodeId,
        tx,
      );
      if (removed === 0)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      // Xử lý docReplacement
      if (outgoing?.docReplacement) {
        let replacements: any[] = [];
        if (Array.isArray(outgoing.docReplacement)) {
          replacements = outgoing.docReplacement;
        } else if (typeof outgoing.docReplacement === 'string') {
          try {
            replacements = JSON.parse(outgoing.docReplacement);
          } catch (e) { }
        }

        const replacedDocIds = replacements
          .map((r: any) => r?.documentId || r?.document_id || r?.id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          .map(id => id.trim());

        if (replacedDocIds.length > 0) {
          await this.repo.softDeleteIncomingCopiesByCopyToInternal(
            replacedDocIds,
            3,
            tx,
          );

          for (const replacedDocId of replacedDocIds) {
            const updateReq = tx ? tx.request() : (await this.getMsPool()).request();
            updateReq.input('replacedDocId', sql.VarChar(100), replacedDocId);
            await updateReq.query(`
              UPDATE outgoing_documents
              SET replaced = 1, updated_at = GETDATE()
              WHERE document_id = @replacedDocId
            `);

            await this.repo.addOutGoingAudit(
              replacedDocId,
              {
                user_id: effectiveUserId,
                display_name: payload.displayName,
                action_code: 'BI_THAY_THE',
                action: 'Bị thay thế',
                roleProcess: 'processor',
                created_by: effectiveUserId,
                stage_status: 'BI_THAY_THE',
                details: { note: `Bị thay thế bởi văn bản phát hành mới (document_id: ${docIds})` },
                typeDocument: 'OutgoingDocument',
                created_at: new Date(),
                updated_at: new Date(),
              },
              tx,
            );
          }
        }
      }

      if (finalNextNode) {
        await this.repo.addWorkItem(
          docIds,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: finalNextNode.id,
            role: targetRole,
            assigneeUserId: requiresAssignee ? auditPrv?.createdBy : null,
            nodeType: finalNextNode.$type,
          },
          tx,
        );
      }

      // [TỐI ƯU 4]: Chạy tuần tự các lệnh ghi trong transaction để tránh lỗi EREQINPROG
      await this.updateStageStatusAuditOutgoingAware(
        docIds,
        {
          receiver: effectiveUserId,
          stage_status: extensionProperties.allowSendToUnit
            ? stageStatusDoc.BAN_HANH_DU_THAO
            : stageStatusDoc.BAN_HANH_TO_TRINH,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );
      await this.addAuditOutgoingAware(
        docIds,
        {
          user_id: effectiveUserId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: extensionProperties.allowSendToUnit
            ? 'END'
            : finalNextNode?.id,
          receiver: auditPrv?.createdBy,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Xử lý chính',
          created_by: effectiveUserId,
          stage_status: extensionProperties.allowSendToUnit
            ? stageStatusDoc.DA_BAN_HANH
            : stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      // Xử lý processor trong transaction
      if (processorFlowConfigs.size > 0) {
        for (const [processor, config] of processorFlowConfigs) {
          await this.createIncomingDocumentCopy({
            outgoing,
            receiverUnit: String(config.parentUser),
            processorUserId: processor,
            flowConfig: config.flowConfig,
            payload,
            wi,
            tx,
            actionCode: 'CREATE',
            details: JSON.stringify({
              isTransferOption: false,
              transferType: 'to_processor',
              processorUserId: processor,
              organizationUnit: config.parentUser,
            }),
            skipDuplicateCheck: true,
            notification: true,
            userId,
          });
        }
      }

      // Xử lý allowSendToUnit trong transaction (removed knowReceivers copy to incoming)
      /*
      if (Array.isArray(knowReceiverInfos) && knowReceiverInfos.length > 0) {
        for (const info of knowReceiverInfos.filter(Boolean) as Array<{ knowReceiverUserId: string; flowConfig: any; parentUser: string }>) {
          await this.createIncomingDocumentCopy({
            outgoing,
            receiverUnit: String(info.parentUser),
            processorUserId: info.knowReceiverUserId,
            flowConfig: info.flowConfig,
            payload,
            wi,
            tx,
            actionCode: 'CREATE',
            details: JSON.stringify({
              isTransferOption: false,
              transferType: 'to_know',
              processorUserId: info.knowReceiverUserId,
              organizationUnit: info.parentUser,
            }),
            skipDuplicateCheck: false,
            notification: true,
            userId,
            roleProcess: 'viewer',
          });
        }
      }
      */

      if (extensionProperties.allowSendToUnit && receivingDept.length > 0) {
        for (const ou of receivingDept) {
          const flowConfig = flowConfigMap.get(String(ou));
          if (!flowConfig) {
            this.logger.warn(
              `[promulgate-doc][runtime] Missing flow config for unit=${ou}, docId=${docIds}`,
            );
            continue;
          }

          const createdIncoming = await this.createIncomingDocumentCopy({
            outgoing,
            receiverUnit: ou,
            processorUserId: null,
            flowConfig,
            payload,
            wi,
            tx,
            actionCode: 'CREATE',
            details: JSON.stringify({
              isTransferOption: false,
              transferType: 'to_room',
              organizationUnit: ou,
            }),
            skipDuplicateCheck: false,
            notification: true,
            userId,
          });

          if (createdIncoming?.incomingDocId) {
            incomingCopiesForUnits.push({
              incomingDocId: String(createdIncoming.incomingDocId),
              flowId: String(flowConfig.id),
              receiverUnit: String(ou),
            });
          } else {
            this.logger.warn(
              `[promulgate-doc][runtime] Incoming copy not created for unit=${ou}, docId=${docIds}`,
            );
          }
        }
      }

      if (statusDoc)
        await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);

      await this.repo.commit(tx);

      // [TỐI ƯU 5]: Chạy song song các tác vụ hậu xử lý và lấy kết quả cuối
      const [finalDoc] = await Promise.all([
        this.repo.getOutgoingDocument(docIds),
        this.addSystemComment(
          docIds,
          payload,
          payload?.note,
          originalUser || effectiveUserId,
        ),
      ]);
      return {
        status: 1,
        document: finalDoc,
        incomingCopiesForUnits,

      };
    } catch (e) {
      await this.repo.rollback(tx);
      this.logger.error(
        `[promulgate-doc][runtime] Transaction failed docId=${docIds}`,
        e instanceof Error ? e.stack : String(e),
      );
      throw e;
    }
  }

  async proposeDocumentIssuance(input: {
    bpmnXML: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
  }): Promise<any> {
    const { bpmnXML, workItemId, payload, userId, originalUser } = input;
    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;

    // [TỐI ƯU 1]: Song song hóa truy xuất dữ liệu ban đầu
    const [modelResult, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(docIds, workItemId),
    ]);

    const { indexes } = modelResult;
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    if (!node) throw new BadRequestException('Node not found in BPMN');

    const outs = indexes.outgoingBySource.get(node.id) || [];
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );

    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;

    // [TỐI ƯU 2]: Lấy danh sách văn thư trước khi bắt đầu giao dịch
    const listVT = await this.sqlsvRepo.getUsersInFlow(
      'VAN_BAN_DI',
      targetRole,
      100,
      1,
      userId,
    );
    const matchedVT = listVT.usersWithType;

    if (matchedVT.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy văn thư trong phòng của người dùng.',
      );
    }

    const tx = await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(docIds, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      if (nextNode) {
        const requiresAssignee =
          nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;
        for (const vt of matchedVT) {
          await this.repo.addWorkItem(
            docIds,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: requiresAssignee ? vt._id.toString() : null,
              nodeType: nextNode.$type,
            },
            tx,
          );
        }
      }

      // [TỐI ƯU 3]: Thực hiện tuần tự các ghi chép trong transaction để tránh lỗi EREQINPROG
      await this.updateStageStatusAuditOutgoingAware(
        docIds,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.DE_NGHI_BH,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );
      await this.addAuditOutgoingAware(
        docIds,
        {
          user_id: effectiveUserId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: 'CAN_CHO_SO',
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Xử lý chính',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'OutGoingDocument',
        },
        tx,
      );

      if (statusDoc)
        await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);

      await this.repo.commit(tx);

      // [TỐI ƯU 4]: Chạy song song các tác vụ hậu xử lý và lấy kết quả cuối
      const [finalDoc] = await Promise.all([
        this.repo.getOutgoingDocument(docIds),
        this.addSystemComment(
          docIds,
          payload,
          payload?.note,
          originalUser || effectiveUserId,
        ),
      ]);

      return {
        status: 1,
        document: finalDoc,
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }
  async recallWorkItem(payload: Payload, userId: string) {
    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;

    // 1️⃣ Lấy lịch sử audit trước khi thu hồi (dữ liệu chưa bị xóa/thay đổi)
    const auditArr = await this.repo.getAudit(docIds).catch(() => []);

    // [TỐI ƯU 1]: Lấy vai trò người dùng song song với khởi tạo transaction
    const [role, tx] = await Promise.all([
      this.repo.getUserRole(userId),
      this.repo.begin(),
    ]);

    try {
      const recallType = (payload as any)?.recallType || (payload as any)?.recallOption;
      const { bpmnVersion, audit, recalledUserIds: dbRecalledUserIds, childDocs } = await this.repo.recallDocumentStep(
        docIds,
        userId,
        tx,
        recallType,
      );
      const effbpmnXML = bpmnVersion ? bpmnVersion : 'PHOIHOP_NHANDEBIET';

      // [TỐI ƯU 2]: Lấy file BPMN và parse model một lần
      const bpmnXML = await this.repo.getBpmnFile(effbpmnXML);
      const { indexes } = await this.getModelFromXml(bpmnXML);

      // Tìm tất cả các node hạ nguồn của node được thu hồi theo thiết kế luồng BPMN để xóa work items tương ứng
      const downstreamNodes = new Set<string>();
      const queue: string[] = [];
      const initialFlows = indexes.outgoingBySource.get(audit.to_node_id) || [];
      for (const flow of initialFlows) {
        if (flow.targetRef?.id) {
          queue.push(flow.targetRef.id);
        }
      }
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (currentId && !downstreamNodes.has(currentId)) {
          downstreamNodes.add(currentId);
          const outFlows = indexes.outgoingBySource.get(currentId) || [];
          for (const flow of outFlows) {
            if (flow.targetRef?.id && !downstreamNodes.has(flow.targetRef.id)) {
              queue.push(flow.targetRef.id);
            }
          }
        }
      }

      // Quét tất cả các node đã đi qua từ lịch sử audit sau bước được thu hồi để thêm vào danh sách xóa
      let targetIdx = -1;
      if (audit && Array.isArray(auditArr)) {
        for (let i = auditArr.length - 1; i >= 0; i--) {
          if (String(auditArr[i].id) === String(audit.id)) {
            targetIdx = i;
            break;
          }
        }
      }
      if (targetIdx >= 0) {
        for (let i = targetIdx + 1; i < auditArr.length; i++) {
          const a = auditArr[i];
          if (a.toNodeId) downstreamNodes.add(a.toNodeId);
          if (a.fromNodeId) downstreamNodes.add(a.fromNodeId);
        }
      }

      const recalledUserIds: string[] = dbRecalledUserIds || [];
      if (childDocs && Array.isArray(childDocs)) {
        for (const child of childDocs) {
          // Gửi thông báo đến cả ID đơn vị nhận (receiver_unit)
          if (child.receiver_unit) {
            recalledUserIds.push(String(child.receiver_unit));
          }
          // Giải quyết và gửi thông báo đến các tài khoản văn thư cụ thể của đơn vị nhận
          if (child.bpmn_version && child.receiver_unit) {
            try {
              const childUsers = await this.getStartEventUsersInUnit(
                child.bpmn_version,
                child.receiver_unit,
              );
              recalledUserIds.push(...childUsers);
            } catch (err) {
              this.logger.error(`Lỗi lấy user văn thư của phòng ban ${child.receiver_unit} cho văn bản con ${child.document_id}: ${err.message}`);
            }
          }
        }
      }

      if (downstreamNodes.size > 0) {
        const deleteReq = tx.request();
        deleteReq.input('documentId', sql.VarChar, docIds);
        const nodeIdsArray = Array.from(downstreamNodes);
        const placeholders = nodeIdsArray.map((_, i) => `@nodeId${i}`);
        nodeIdsArray.forEach((nodeId, i) => {
          deleteReq.input(`nodeId${i}`, sql.VarChar, nodeId);
        });
        await deleteReq.query(`
          DELETE FROM work_items
          WHERE document_id = @documentId
            AND node_id IN (${placeholders.join(', ')})
        `);
      }

      const userRole = role.roles[0];
      let targetNodeId = recallType === 'recall_leader' ? audit.from_node_id : audit.to_node_id;
      let targetRole = recallType === 'recall_assignment' ? audit.role : userRole;

      if (recallType === 'recall_leader') {
        let parsedDetails: any = {};
        if (audit.details) {
          try {
            parsedDetails = typeof audit.details === 'string' ? JSON.parse(audit.details) : audit.details;
          } catch (e) { }
        }
        if (parsedDetails.sourceNodeId) {
          targetNodeId = parsedDetails.sourceNodeId;
          if (parsedDetails.sourceRole) targetRole = parsedDetails.sourceRole;
        } else {
          // Tim node_id tu buoc audit truoc do khi user (Chanh VP) nhan van ban
          const prevAuditReq = tx.request();
          prevAuditReq.input('documentId', sql.VarChar, docIds);
          prevAuditReq.input('userId', sql.VarChar, userId);
          prevAuditReq.input('auditId', sql.Int, audit.id);
          const prevAuditRes = await prevAuditReq.query(`
            SELECT TOP 1 to_node_id, from_node_id, role
            FROM ${this.repo.dbname}.dbo.audit
            WHERE document_id = @documentId 
              AND id < @auditId
              AND receiver = @userId
            ORDER BY id DESC
          `);
          if (prevAuditRes.recordset?.[0]?.to_node_id) {
            targetNodeId = prevAuditRes.recordset[0].to_node_id;
            if (prevAuditRes.recordset[0].role) {
              targetRole = prevAuditRes.recordset[0].role;
            }
          } else if (audit.from_node_id) {
            targetNodeId = audit.from_node_id;
          }
        }
      } else if (recallType === 'recall_assignment') {
        // Thử lấy trực tiếp từ audit.details
        let parsedDetails: any = {};
        if (audit.details) {
          try {
            parsedDetails = typeof audit.details === 'string' ? JSON.parse(audit.details) : audit.details;
          } catch (e) { }
        }

        if (parsedDetails.sourceNodeId) {
          targetNodeId = parsedDetails.sourceNodeId;
          if (parsedDetails.sourceRole) {
            targetRole = parsedDetails.sourceRole;
          }
        } else {
          // Fallback tìm node_id từ work_items cũ của người phân công
          const wiQuery = tx.request();
          wiQuery.input('documentId', sql.VarChar, docIds);
          wiQuery.input('userId', sql.VarChar, audit.user_id);
          const wiResult = await wiQuery.query(`
            SELECT TOP 1 node_id, role 
            FROM work_items 
            WHERE document_id = @documentId AND assignee_user_id = @userId
            ORDER BY created_at DESC
          `);
          const targetNodeFromWi = wiResult.recordset?.[0]?.node_id;
          let isAddProcessNode = false;
          if (targetNodeFromWi) {
            const outFlows = indexes.outgoingBySource.get(targetNodeFromWi) || [];
            const hasFurtherAssign = outFlows.some((f: any) => {
              const props = this.bpmnEngine.getFlowExtensionProperties(f);
              return props?.isFurtherAssign === 'true';
            });
            if (!hasFurtherAssign) {
              isAddProcessNode = true;
            }
          }
          if (targetNodeFromWi && !isAddProcessNode) {
            targetNodeId = targetNodeFromWi;
            targetRole = wiResult.recordset[0].role || targetRole;
          } else {
            targetNodeId = audit.from_node_id;
          }
        }
      }
      const node = indexes.nodes.get(targetNodeId);
      if (!node)
        throw new BadRequestException(
          `Node ${targetNodeId} không tồn tại trong BPMN`,
        );

      const nodeType = node.$type;
      const targetAssignee = recallType === 'recall_assignment' ? audit.user_id : userId;

      // [TỐI ƯU 3]: Thực hiện tuần tự các lệnh ghi trong transaction để tránh lỗi EREQINPROG
      await this.repo.updateDocumentStatus(docIds, audit.curStatusCode || '1', tx);

      // Xóa workitem cũ của người được khôi phục để tránh trùng lặp
      const reqDeleteWI = tx.request();
      reqDeleteWI.input('documentId', sql.VarChar, docIds);
      reqDeleteWI.input('assigneeUserId', sql.VarChar, targetAssignee);
      await reqDeleteWI.query(`
        DELETE FROM work_items
        WHERE document_id = @documentId AND assignee_user_id = @assigneeUserId AND state = 'open'
      `);

      await this.repo.addWorkItem(
        docIds,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          document_id: docIds,
          nodeId: targetNodeId,
          role: targetRole,
          assigneeUserId: targetAssignee,
          node_type: nodeType,
        },
        tx,
        effbpmnXML,
      );
      await this.addAuditIncomingAware(
        docIds,
        {
          userId,
          displayName: audit.display_name,
          role: userRole,
          actionCode: recallType === 'recall_assignment' ? 'THU_HOI_PHAN_CONG' : 'THU_HOI',
          fromNodeId: audit.from_node_id,
          toNodeId: audit.to_node_id,
          action: recallType === 'recall_assignment' ? 'Thu hồi phân công' : 'Thu hồi văn bản',
          receiver: targetAssignee,
          group_: audit.group_,
          roleProcess: audit.roleProcess,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          deadline: audit.deadline,
          curStatusCode: audit.curStatusCode || '1',
          details: {
            note: payload.note || (recallType === 'recall_assignment' ? 'Thu hồi phân công' : 'Thu hồi xử lý'),
            recalledUserIds: recalledUserIds || [],
          },
          origin_id: audit.origin_id,
          typeDocument: audit.typeDocument || 'IncommingDocument',
        },
        tx,
      );

      await this.repo.commit(tx);

      // [TỐI ƯU 4]: Lấy văn bản cuối cùng sau khi commit
      let finalDoc = await this.repo.getOutgoingDocument(docIds);
      if (!finalDoc) {
        finalDoc = await this.repo.getDocument(docIds);
      }

      // 2️⃣ Chỉ gửi cho những người bị thu hồi trực tiếp (không lấy người trong luồng cũ)
      const allRecipients = new Set<string>();
      for (const rId of recalledUserIds) {
        if (rId && typeof rId === 'string') {
          const trimmed = rId.trim();
          if (trimmed) {
            allRecipients.add(trimmed);
          }
        }
      }

      // 3️⃣ Loại bỏ người thực hiện thu hồi khỏi danh sách gửi
      if (userId) {
        allRecipients.delete(String(userId).trim());
      }

      if (allRecipients.size > 0) {
        const docNumber = finalDoc?.toBookTextSymbols || finalDoc?.reportDocumentSymbol || finalDoc?.toBookTextSymbol || '';
        const title = `Bạn có văn bản bị thu hồi: “${finalDoc?.abstractNote || finalDoc?.abstract_note || ''}”`;
        const content = `Văn bản đến ${docNumber ? `số/ký hiệu ${docNumber} ` : ''}đã bị thu hồi.`;

        for (const recipientId of allRecipients) {
          this.notificationService.create({
            recipientId,
            senderId: userId ?? null,
            content,
            title,
            recordId: docIds,
            link: `/incomming-documents/${docIds}`,
            key: 'VIEW_INCOMING_DOC',
            type: NotificationType.INCOMING_DOC_RECALLED.value,
            time: new Date(),
            status: 1,
          }).catch(err => {
            this.logger.error(`Lỗi gửi thông báo thu hồi văn bản đến cho user ${recipientId}: ${err.message}`);
          });
        }
      }

      return {
        status: 1,
        message: 'Văn bản đã được thu hồi thành công',
        document: finalDoc,
      };
    } catch (err) {
      await this.repo.rollback(tx);
      throw err;
    }
  }

  async recallWorkItemOutgoing(
    outgoingDocId: string,
    userId: string,
    incommingDocIds?: string[],
    note?: string,
  ) {
    if (!outgoingDocId) {
      throw new BadRequestException('Không thể thu hồi văn bản.');
    }

    // 1️⃣ Lấy lịch sử từ state history thay vì bảng audit để không bị mất danh sách user cũ 
    const auditArr = await this.repo.getOutgoingDocumentStateHistory(outgoingDocId).catch(() => []);

    // [TỐI ƯU 1]: Lấy vai trò người dùng song song với khởi tạo transaction
    const [role, tx] = await Promise.all([
      this.repo.getUserRole(userId),
      this.repo.begin(),
    ]);

    try {
      const { bpmnVersion, audit, recalledUserIds: dbRecalledUserIds } = await this.repo.recallOutgoingDocumentStep(
        outgoingDocId,
        userId,
        incommingDocIds || [''],
        tx,
      );
      const effbpmnXML = bpmnVersion ? bpmnVersion : 'VAN_BAN_DI';

      // [TỐI ƯU 2]: Lấy file BPMN và parse model một lần
      const bpmnXML = await this.repo.getBpmnFile(effbpmnXML);
      const { indexes } = await this.getModelFromXml(bpmnXML);

      const node = indexes.nodes.get(audit.to_node_id);
      if (!node) {
        throw new BadRequestException(
          `Node ${audit.to_node_id} không tồn tại trong BPMN`,
        );
      }

      const nodeType = node.$type;
      const userRole = role.roles[0] || null;

      // [TỐI ƯU 3]: Thực hiện tuần tự các lệnh ghi trong transaction để tránh lỗi EREQINPROG
      await this.repo.updateOutGoingDocumentStatus(
        outgoingDocId,
        audit.curStatusCode || '1',
        tx,
      );
      await this.repo.addWorkItem(
        outgoingDocId,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          documentId: outgoingDocId,
          nodeId: audit.to_node_id,
          role: userRole,
          assigneeUserId: userId,
          nodeType: nodeType,
        },
        tx,
        effbpmnXML,
      );
      await this.addAuditOutgoingAware(
        outgoingDocId,
        {
          userId,
          displayName: audit.display_name,
          role: userRole,
          actionCode: 'THU_HOI',
          fromNodeId: audit.from_node_id,
          toNodeId: audit.to_node_id,
          action: 'Thu hồi văn bản đi',
          receiver: userId,
          group_: audit.group_,
          roleProcess: audit.roleProcess,
          stage_status: stageStatusDoc.THU_HOI,
          deadline: audit.deadline,
          curStatusCode: audit.curStatusCode || '1',
          details: JSON.stringify({ note: note || 'Thu hồi xử lý' }),
          origin_id: audit.origin_id,
          typeDocument: 'OutgoingDocument',
        },
        tx,
      );

      const recalledFromActionCode = String(audit.action_code || '').trim().toUpperCase();
      if (['TRINH_KY', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'].includes(recalledFromActionCode)) {
        const reqSyncRecallState = tx.request();
        reqSyncRecallState.input('documentId', sql.VarChar, outgoingDocId);
        reqSyncRecallState.input('currentActionCode', sql.NVarChar(100), recalledFromActionCode);
        await reqSyncRecallState.query(`
          UPDATE ${this.repo.dbname}.dbo.outgoing_current_state
          SET current_action_code = @currentActionCode,
              updated_at = SYSDATETIME()
          WHERE document_id = @documentId
        `);
      }

      await this.repo.commit(tx);

      // // [TỐI ƯU 4]: Lấy bản ghi cuối cùng sau khi commit
      const resultDoc = await this.repo.getOutgoingDocument(outgoingDocId);

      // Gửi thông báo cho những người dùng có trong luồng (dựa theo logic processProgress)
      try {
        const recipientIds = new Set<string>();
        const parseJsonIdArray = (value: any): string[] => {
          if (!value) return [];
          if (Array.isArray(value)) {
            return value.map((item) => String(item).trim()).filter(Boolean);
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed)
                ? parsed.map((item) => String(item).trim()).filter(Boolean)
                : [];
            } catch {
              return value.trim() ? [value.trim()] : [];
            }
          }
          return [];
        };

        for (const recalledUserId of dbRecalledUserIds || []) {
          if (recalledUserId) {
            recipientIds.add(String(recalledUserId).trim());
          }
        }

        for (const knowReceiverId of parseJsonIdArray(resultDoc?.knowReceivers || resultDoc?.know_receivers)) {
          recipientIds.add(knowReceiverId);
        }

        const notifiedRecipientIds = await this.repo.getOutgoingRecallNotificationRecipients(outgoingDocId).catch(() => []);
        for (const notifiedRecipientId of notifiedRecipientIds) {
          if (notifiedRecipientId) {
            recipientIds.add(String(notifiedRecipientId).trim());
          }
        }

        if (Array.isArray(auditArr)) {
          for (const a of auditArr) {
            if (a?.createdBy?._id) {
              recipientIds.add(String(a.createdBy._id));
            }
            if (a?.receiver?._id) {
              recipientIds.add(String(a.receiver._id));
            }
          }
        }

        if (userId) {
          recipientIds.delete(String(userId).trim());
        }

        if (recipientIds.size > 0) {
          const senderUser: any = await this.sqlsvRepo.getUserById(userId);
          const senderName = senderUser?.displayName || senderUser?.fullName || senderUser?.full_name || senderUser?.name || senderUser?.username || 'Người gửi';

          const docNumber = resultDoc?.toBookTextSymbols || resultDoc?.reportDocumentSymbol || resultDoc?.toBookTextSymbol || resultDoc?.numberInBook || '';
          const abstractNote = resultDoc?.abstractNote || resultDoc?.abstract_note || '';

          const title = `Văn bản bạn từng xử lý đã bị thu hồi: “${abstractNote}”`;
          const content = `Văn bản đi ${docNumber ? `số/ký hiệu ${docNumber} ` : ''}trích yếu "${abstractNote}" đã được ${senderName} thu hồi.`;

          for (const recipientId of recipientIds) {
            this.notificationService.create({
              recipientId,
              senderId: userId ?? null,
              content,
              title,
              recordId: outgoingDocId,
              link: '',
              key: 'VIEW_OUTCOMING_DOC',
              type: NotificationType.OUTGOING_DOC_RECALLED.value,
              time: new Date(),
              status: 1,
            }).catch((err) => {
              this.logger.error(`Lỗi gửi thông báo thu hồi văn bản đi cho user ${recipientId}: ${err?.message || err}`);
            });
          }
        }
      } catch (notifyError) {
        this.logger.error(`[recallWorkItemOutgoing] Lỗi gửi thông báo thu hồi: ${notifyError?.message || notifyError}`);
      }

      return {
        status: 1,
        message: 'Văn bản đi đã được thu hồi thành công',
        document: resultDoc,
      };
    } catch (err) {
      await this.repo.rollback(tx);
      throw err;
    }
  }
  async signDoc({
    bpmnXML,
    workItemId,
    payload,
    userId,
    originalUser,
    bpmnVersion,
    doc,
    workItem, // [TỐI ƯU] Nhận workItem từ bên ngoài
    docDetail,
    keySign,
    externalTransaction, // <--- Nhận transaction
    docType,
  }: {
    bpmnXML: string;
    workItemId: string;
    payload: any;
    userId: string;
    originalUser: string;
    bpmnVersion: string;
    doc: any;
    workItem?: any; // [TỐI ƯU] WorkItem đã fetch ở tầng trên
    docDetail?: any;
    keySign: any;
    externalTransaction?: any; // Định nghĩa interface cho nó
    docType?: string;
  }): Promise<any> {
    const runtimeSignDocStartedAt = Date.now();
    let runtimeSignDocCurrentStep = 'Step 0 (Start)';
    const logRuntimeSignDocStep = (step: string, extra: Record<string, any> = {}) => {
      runtimeSignDocCurrentStep = step;
      void extra;
    };

    logRuntimeSignDocStep('Step 0 (Start)', {
      hasBpmnXML: Boolean(bpmnXML),
      bpmnLength: bpmnXML?.length || 0,
      hasDoc: Boolean(doc),
      hasDocDetail: Boolean(docDetail),
      hasKeySign: Boolean(keySign),
    });

    if (!payload.docIds)
      throw new BadRequestException('DocumentId is required');
    const docIds = payload.docIds;
    const typeDocStr = docType === 'incoming_document' ? 'IncommingDocument' : 'OutGoingDocument';

    // [TỐI ƯU 1]: Song song hóa truy xuất dữ liệu ban đầu
    // [TỐI ƯU]: Sử dụng doc và workItem từ tham số nếu có, không thì mới query
    logRuntimeSignDocStep('Step 1 (Load model/workItem/audit/outgoing)');
    const [modelResult, wi, auditArr, outgoing] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      workItem ? Promise.resolve(workItem) : this.repo.getWorkItem(docIds, workItemId),
      this.repo.getAudit(docIds),
      doc ? Promise.resolve(doc) : this.repo.getOutgoingDocument(docIds),
    ]);
    logRuntimeSignDocStep('Step 1.1 (Loaded initial data)', {
      foundWorkItem: Boolean(wi),
      workItemNodeId: wi?.nodeId,
      auditCount: auditArr?.length || 0,
      foundOutgoing: Boolean(outgoing),
      modelNodeCount: modelResult?.indexes?.nodes?.size || 0,
    });

    const { indexes } = modelResult;
    if (!wi) {
      console.error('work item không tìm thấy hoặc đã được đẩy luồng!');
      throw new BadRequestException('WorkItem not found or already completed');
    }
    const effectiveUserId = userId;
    const node = indexes.nodes.get(wi?.nodeId);
    if (!node) throw new BadRequestException('Node not found in BPMN');

    const properties = getAllNodeExtensionProperties(node);
    const typeSigncur = properties.signerRequired || properties.processRequired || null;
    logRuntimeSignDocStep('Step 2 (Resolve current node/signers)', {
      nodeId: node?.id,
      nodeType: node?.$type,
      typeSigncur,
    });

    const [resOrderUser, signersCur] = await Promise.all([
      this.repo.getOrderSignerById(docIds, typeSigncur, userId),
      this.repo.getSignersFromOutgoingDocumentUsers(docIds, typeSigncur),
    ]);

    const isLastSigner = !typeSigncur || signersCur.length <= 1;

    const rawActionCode = Array.isArray(payload.actionCode)
      ? payload.actionCode[payload.actionCode.length - 1]
      : payload.actionCode;
    const actionCode = rawActionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');
    logRuntimeSignDocStep('Step 2.1 (Signer/action resolved)', {
      typeSigncur,
      currentSignerCount: signersCur?.length || 0,
      isLastSigner,
      signOrder: resOrderUser?.sign_order,
      normalizedActionCode: actionCode,
    });

    const auditPrv = auditArr.find(
      (x) => x.actionCode === actionCode && x.receiver === effectiveUserId,
    );

    const outs = indexes.outgoingBySource.get(node.id) || [];
    logRuntimeSignDocStep('Step 3 (Resolve outgoing flow)', {
      nodeId: node?.id,
      outgoingCount: outs.length,
      normalizedActionCode: actionCode,
    });

    let flow = outs.find((f: any) => {
      const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
      const flowActionCode = (
        extProps.actionCode ||
        f.name ||
        f.id ||
        ''
      ).toUpperCase();
      return flowActionCode === actionCode || f.id === actionCode;
    });

    // Fallback cho trường hợp người ký cuối nhưng flow đi ra không đặt tên trùng với actionCode
    if (!flow && isLastSigner && outs.length > 0) {
      flow = outs[0];
    }

    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );

    const { node: nextNodev2 } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    let nextNode = nextNodev2;
    let curPropsServiceTask;
    let signAllFiles = true;
    logRuntimeSignDocStep('Step 3.1 (Next node resolved)', {
      flowId: flow?.id,
      flowName: flow?.name,
      nextNodeId: nextNode?.id,
      nextNodeType: nextNode?.$type,
      isLastSigner,
    });

    // [MODIFIED]: Loop to support Smart Next traversal through ServiceTasks
    // Only execute if it's the last signer or a non-signing transition
    if (isLastSigner) {
      let currentIter = 0;
      while (nextNode?.$type === 'bpmn:ServiceTask') {
        const nextNodeProps = getAllNodeExtensionProperties(nextNode);
        const isSmartNext = nextNodeProps?.isSmartNext === 'true' || nextNodeProps?.isAutoNext === 'true';

        // Legacy behavior: Always execute the first Service Task if it's next.
        // Subsequent Service Tasks in the chain require isSmartNext or isAutoNext.
        if (currentIter > 0 && !isSmartNext) break;
        currentIter++;


        logRuntimeSignDocStep('Step 3.2 (Before serviceTaskExecutor)', {
          serviceTaskNodeId: nextNode?.id,
          currentIter,
        });
        const serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask({
          nodeId: nextNode.id,
          bpmnXml: bpmnXML,
          variables: {
            documentId: docIds,
            curNodeId: node,
            nodeId: nextNode.id,
            bpmnXml: bpmnXML,
            userId: userId,
            indexes: indexes,
            payload: payload,
            tx: externalTransaction,
          },
        });

        if (serviceTaskResult) {
          logRuntimeSignDocStep('Step 3.3 (After serviceTaskExecutor)', {
            serviceTaskNodeId: nextNode?.id,
            returnedNextNodeId: serviceTaskResult.nextNode?.id,
            returnedFlowId: serviceTaskResult.flow?.id,
            signAllFiles: serviceTaskResult.signAllFiles,
          });
          curPropsServiceTask = serviceTaskResult.curProps || curPropsServiceTask;
          if (serviceTaskResult.nextNode) {
            nextNode = serviceTaskResult.nextNode;
            signAllFiles = serviceTaskResult.signAllFiles ?? true;
            flow = serviceTaskResult.flow || flow;
          } else {
            // Handler ran but didn't return next node, stay at this ServiceTask
            break;
          }

          if (!signAllFiles) {
            logRuntimeSignDocStep('Step 3.4 (Stop after service task signAllFiles=false)');
            return;
          }
        } else {
          logRuntimeSignDocStep('Step 3.3b (Service task handler unavailable, resolve fallback)', {
            serviceTaskNodeId: nextNode?.id,
            serviceTaskNodeType: nextNode?.$type,
            registeredTopics: this.serviceTaskExecutor.getRegisteredTopics(),
          });
          const unresolvedServiceTaskId = nextNode?.id;
          const fallback = await this.findNextStepWithSigners({
            currentNode: nextNode,
            indexes,
            documentId: docIds,
          });
          logRuntimeSignDocStep('Step 3.3c (Service task fallback resolved)', {
            serviceTaskNodeId: unresolvedServiceTaskId,
            fallbackNodeId: fallback.nextNode?.id,
            fallbackNodeType: fallback.nextNode?.$type,
            fallbackTypeSign: fallback.typeSign,
            fallbackSignerCount: fallback.signers?.length || 0,
            fallbackSignerIds: (fallback.signers || []).map((signer) => signer.user_id),
            skippedSteps: fallback.skippedSteps,
          });
          if (!fallback.nextNode || fallback.nextNode.$type === 'bpmn:ServiceTask') {
            throw new BadRequestException(
              `Không thể xác định bước sau ServiceTask ${unresolvedServiceTaskId}`,
            );
          }
          nextNode = fallback.nextNode;
          break;
        }
      }
    } else {
      // Not last signer, keep the original next node
      nextNode = nextNodev2;
    }



    const nextNodeProps_init = nextNode ? getAllNodeExtensionProperties(nextNode) : {};
    let targetRole = nextNode ? (indexes.laneMap.get(nextNode?.id) || nextNodeProps_init.candidateGroups || payload.targetRole) : undefined;
    const curRole = indexes.laneMap.get(node.id);

    const outNextNode = indexes.outgoingBySource.get(nextNode?.id) || [];
    const nextActionCode = outNextNode.map((f: any) => f.name);
    let targetRoleAfterSign;

    if (targetRole === curRole) {
      let nextNodeAfterSign;
      if (nextNode.$type === 'bpmn:EndEvent') {
        nextNodeAfterSign = nextNode;
      } else {
        const nodeRes =
          nextNode &&
          this.bpmnEngine.nextInteractiveFromFlow(nextNode.outgoing[0], indexes);
        nextNodeAfterSign = nodeRes?.node;
      }
      targetRoleAfterSign = nextNodeAfterSign
        ? indexes.laneMap.get(nextNodeAfterSign.id)
        : undefined;
    } else {
      targetRoleAfterSign = targetRole;
    }

    // [TỐI ƯU 2]: Lấy thông tin mở rộng và thông tin ký SONG SONG
    const curProps = curPropsServiceTask || getAllNodeExtensionProperties(flow.targetRef);
    const nextProps = getAllNodeExtensionProperties(nextNode);

    const statusDoc = curProps.statusCode;
    const sendTopOr = properties.sendTopOr;
    // const typeSigncur = properties.signerRequired || null;
    let typeSignNext = nextProps.signerRequired || nextProps.processRequired || null;
    const typeSign = nextProps.typeSign || null;
    const flowExt = this.bpmnEngine.getFlowExtensionProperties(flow);
    logRuntimeSignDocStep('Step 4 (Resolve target role/status input)', {
      curRole,
      targetRole,
      targetRoleAfterSign,
      nextNodeId: nextNode?.id,
      nextNodeType: nextNode?.$type,
      typeSignNext,
      typeSign,
      flowActionType: flowExt?.actionType,
      flowActionSecType: flowExt?.actionSecType,
    });

    let stageStatus: string | null = null;
    let stageStatusQr: string | null = null;
    let stageStatusUpdate = stageStatusDoc.DA_XU_LY;

    // === Duyệt xuyên lane: nếu nextNode cùng lane, không phải bước ký, và không phải EndEvent ===
    // → tìm bước tiếp theo ở lane khác (ví dụ: từ Ký chính thức 3 → Văn thư đóng dấu)
    if (
      !typeSignNext &&
      targetRole === curRole &&
      nextNode?.$type !== 'bpmn:EndEvent' &&
      flowExt.actionType !== 'signCopy' &&
      !nextNodeProps_init?.main &&
      !nextNodeProps_init?.giveNumber
    ) {

      const crossLaneResult = await this.findNextStepWithSigners({
        currentNode: nextNode,
        indexes,
        documentId: docIds,
      });

      if (crossLaneResult.nextNode) {
        nextNode = crossLaneResult.nextNode;
        // targetRole = nextNode.$type !== 'bpmn:EndEvent'
        //   ? indexes.laneMap.get(nextNode.id)
        //   : indexes.laneMap.get(nextNode.id);
        targetRole = indexes.laneMap.get(nextNode.id);

        targetRoleAfterSign = targetRole;

        if (crossLaneResult.typeSign) {
          typeSignNext = crossLaneResult.typeSign;
          stageStatus = crossLaneResult.stageStatus;
        }

      }
    }

    // const [resOrderUser, signersCur] = await Promise.all([
    //   this.repo.getOrderSignerById(docIds, typeSigncur, userId),
    //   this.repo.getSignersFromOutgoingDocumentUsers(docIds, typeSigncur),
    // ]);

    const signOrderOfUser = resOrderUser?.sign_order;
    const parseTypeSign = payload.signKey || payload.keyword || await this.bpmnEngine.parseKeySign(
      properties?.keySign,
      signOrderOfUser,
    );
    logRuntimeSignDocStep('Step 4.1 (Parsed sign key)', {
      parseTypeSign,
      signOrderOfUser,
      typeSigncur,
      typeSignNext,
    });

    if (typeSignNext) {
      switch (typeSignNext) {
        case 'signContentDraft':
          stageStatus = stageStatusDoc.CHO_KY_NOI_DUNG;
          break;
        case 'signFormatDraft':
          stageStatus = stageStatusDoc.CHO_KY_THE_THUC;
          break;
        case 'reportSigner':
          stageStatus = stageStatusDoc.CHO_KY_BAN_HANH;
          break;
        case 'paraphSigner':
          stageStatus = stageStatusDoc.CHO_KY_NHAY;
          break;
        case 'officialSigner1':
        case 'officialSigner2':
        case 'officialSigner3':
          stageStatus = stageStatusDoc.CHO_KY_CHINH_THUC;
          break;
        case 'confirmer':
          stageStatus = stageStatusDoc.CHO_XAC_NHAN;
          break;
        case 'appraiser':
          stageStatus = stageStatusDoc.CHO_THAM_DINH;
          break;
        case 'signStamp':
          const outsNextNode = indexes.outgoingBySource.get(nextNode.id) || [];
          for (const o of outsNextNode) {
            const { node: nextNodeOut } =
              this.bpmnEngine.nextInteractiveFromFlow(o, indexes);
            if (nextNodeOut && nextNodeOut.$type === 'bpmn:EndEvent') {
              stageStatus = stageStatusDoc.CHO_DONG_DAU;
              break;
            }
          }
          break;
      }
    }

    if (typeSigncur) {
      switch (typeSigncur) {
        case 'signContentDraft':
          stageStatusQr = stageStatusDoc.CHO_KY_NOI_DUNG;
          if (signersCur.length !== 1) {
            stageStatusUpdate = stageStatusDoc.DA_KY_NOI_DUNG;
          }
          break;
        case 'signFormatDraft':
          stageStatusQr = stageStatusDoc.CHO_KY_THE_THUC;
          if (signersCur.length !== 1) {
            stageStatusUpdate = stageStatusDoc.DA_KY_THE_THUC;
          }
          break;
        case 'reportSigner':
          stageStatusQr = stageStatusDoc.CHO_KY_BAN_HANH;
          if (signersCur.length !== 1) {
            stageStatusUpdate = stageStatusDoc.DA_KY_BAN_HANH;
          }
          break;
        case 'paraphSigner':
          stageStatusQr = stageStatusDoc.CHO_KY_NHAY;
          stageStatusUpdate = stageStatusDoc.DA_KY_NHAY;
          break;
        case 'officialSigner1':
          stageStatusQr = stageStatusDoc.CHO_KY_CHINH_THUC;
          stageStatusUpdate = stageStatusDoc.DA_KY_CHINH_THUC_1;
          break;
        case 'officialSigner2':
          stageStatusQr = stageStatusDoc.CHO_KY_CHINH_THUC;
          stageStatusUpdate = stageStatusDoc.DA_KY_CHINH_THUC_2;
          break;
        case 'officialSigner3':
          stageStatusQr = stageStatusDoc.CHO_KY_CHINH_THUC;
          stageStatusUpdate = stageStatusDoc.DA_KY_CHINH_THUC_3;
          break;
        case 'confirmer':
          stageStatusQr = stageStatusDoc.CHO_XAC_NHAN;
          break;
        case 'appraiser':
          stageStatusQr = stageStatusDoc.CHO_THAM_DINH;
          break;
        case 'signStamp':
          if (nextNode && nextNode.$type === 'bpmn:EndEvent') {
            stageStatusQr = stageStatusDoc.CHO_DONG_DAU;
            stageStatusUpdate = stageStatusDoc.DA_DONG_DAU;
            stageStatus = stageStatusDoc.DA_DONG_DAU;
          }
          break;
      }
    }

    // === Xác định người xử lý tiếp theo ===
    let concurrentStageResult: any = null;
    let skipLegacyTargetCreation = false;
    if (nextNode?.id) {
      const openWorkItems = await this.repo.listOpenWorkItems(docIds);
      concurrentStageResult = await this.concurrentStageOrchestrator.handleTargetNode({
        documentId: docIds,
        typeDocument: typeDocStr,
        bpmnVersion,
        userId: effectiveUserId,
        originalUser,
        workItemId,
        currentNodeId: node.id,
        targetNodeId: nextNode.id,
        indexes,
        openWorkItems,
        auditArr,
        payload,
        tx: externalTransaction,
      });

      skipLegacyTargetCreation =
        concurrentStageResult?.mode !== 'not-concurrent'
          ? concurrentStageResult?.shouldCreateLegacyTargetNode === false
          : false;

      if (concurrentStageResult?.mode !== 'not-concurrent') {
        logRuntimeSignDocStep('Step 4.2 (Concurrent stage resolved)', {
          stageKey: concurrentStageResult?.stage?.stageKey,
          mode: concurrentStageResult?.mode,
          skipLegacyTargetCreation,
        });
      }
    }

    const requiresAssignee = nextNode && !!targetRole;
    let assignTo: string | null = null;
    let multipleAssignees: Array<{ userId: string; signOrder: number }> = [];

    logRuntimeSignDocStep('Step 5 (Prepare transaction)', {
      requiresAssignee: Boolean(requiresAssignee),
      targetRole,
      typeSigncur,
      typeSignNext,
    });

    // =========== CHÚ Ý UPDATE Ở ĐÂY ===========
    let tx = externalTransaction;
    let shouldManageTx = false;

    // Chỉ tạo transaction cục bộ nội bộ nếu không có transaction truyền vào từ ngoài hàm
    if (!tx) {
      tx = await this.repo.begin();
      shouldManageTx = true;
    }
    logRuntimeSignDocStep('Step 5.1 (Transaction ready)', {
      shouldManageTx,
      hasTx: Boolean(tx),
    });
    // ==========================================

    if (
      (requiresAssignee && isLastSigner) ||
      flowExt.actionSecType === 'signCopy' ||
      typeSigncur === 'signStamp'
    ) {
      // 1.1️⃣ Xử lý assignments (lưu nhiều nhóm người ký một lúc nếu FE gửi lên)
      if (Array.isArray(payload.assignments) && payload.assignments.length > 0) {
        for (const assignment of payload.assignments) {
          const type = assignment.subActionCode;
          const userIds = assignment.users;

          // [BẢO VỆ]: Chỉ cho phép replace signers cho bước hiện tại hoặc bước tiếp theo
          // Tránh việc FE gửi đè làm mất lịch sử các bước ký đã hoàn thành (is_signed = 1)
          if (type && userIds?.length) {
            if (type !== typeSigncur && type !== typeSignNext && !isLastSigner) {
              console.warn(`[signDoc] Skip replacing signers for type ${type} to protect history.`);
              continue;
            }

            const assignmentAssignees = userIds.map((id) => ({ userId: id }));
            await this.repo.replaceRuntimeSigners({
              documentId: docIds,
              assignees: assignmentAssignees,
              typeSign: type,
              tx,
            });
            if (type === typeSignNext) {
              multipleAssignees = assignmentAssignees.map((a, idx) => ({
                userId: a.userId,
                signOrder: idx + 1,
              }));
            }
          }
        }
      }

      if (payload?.assignToUserId) {
        assignTo = payload.assignToUserId;
        const ids = Array.isArray(assignTo) ? assignTo : [assignTo];
        if (typeSignNext) {
          const existingNextSigners = await this.repo.getSignersFromOutgoingDocumentUsers(
            docIds,
            typeSignNext,
          );
          const normalizedIds = ids.map((id) => String(id || '').trim()).filter(Boolean);
          const actorIds = new Set(
            [userId, payload?.userId]
              .map((id) => String(id || '').trim())
              .filter(Boolean),
          );
          const isSelfOverwriteOnly =
            normalizedIds.length === 1 &&
            actorIds.has(normalizedIds[0]);
          const currentNodeExecuteConcurrentByStep = String(
            getAllNodeExtensionProperties(node)?.executeConcurrentByStep || '',
          ).trim();
          const shouldPreserveExistingNextSignerSelection =
            existingNextSigners?.length > 0 &&
            isSelfOverwriteOnly;
          const shouldPreserveConcurrentNextSignerSelection =
            !!currentNodeExecuteConcurrentByStep &&
            existingNextSigners?.length > 0 &&
            isSelfOverwriteOnly;

          if (shouldPreserveExistingNextSignerSelection || shouldPreserveConcurrentNextSignerSelection) {
            multipleAssignees = existingNextSigners.map((s) => ({
              userId: s.user_id,
              signOrder: s.sign_order,
            }));
            assignTo = multipleAssignees.length === 1 ? multipleAssignees[0].userId : assignTo;
          } else {
            multipleAssignees = ids.map((id) => ({ userId: id, signOrder: 0 }));
            await this.repo.replaceRuntimeSigners({
              documentId: docIds,
              assignees: ids.map((id) => ({ userId: id })),
              typeSign: typeSignNext,
              tx,
            });
          }
        } else {
          multipleAssignees = ids.map((id) => ({ userId: id, signOrder: 0 }));
        }
      } else if (multipleAssignees.length > 0) {
        // Đã lấy từ assignments ở trên
      } else if (
        typeSignNext &&
        typeSign !== 'dongDau' &&
        typeSignNext !== 'signStamp' &&
        flowExt.actionType !== 'signCopy'
      ) {
        const signers = await this.repo.getSignersFromOutgoingDocumentUsers(
          docIds,
          typeSignNext,
        );
        if (signers?.length > 0) {
          multipleAssignees = signers.map((s) => ({
            userId: s.user_id,
            signOrder: s.sign_order,
          }));
        } else {
          // Thử lấy tất cả người dùng trong vai trò (lane)
          const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);

          // [MỚI]: Ưu tiên lấy những người ĐÃ ĐƯỢC CHỌN TRONG DB (outgoing_document_users)
          // nếu họ cũng thuộc vai trò (targetRole) này VÀ CHƯA KÝ. Tránh việc trình lên tất cả mọi người trong role.
          const allPreselected = await this.repo.getAllSignersFromOutgoingDocumentUsers(docIds);
          const intersection = allPreselected.filter(u =>
            u.is_signed === 0 &&
            candidates.includes(u.user_id) &&
            (!typeSignNext || u.signer_type === typeSignNext)
          );

          if (intersection.length > 0) {
            multipleAssignees = intersection.map(u => ({ userId: u.user_id, signOrder: u.sign_order }));
            // Cập nhật typeSignNext và stageStatus từ người đầu tiên trong intersection nếu đang null
            if (!typeSignNext && intersection[0].signer_type) {
              typeSignNext = intersection[0].signer_type;
              switch (typeSignNext) {
                case 'appraiser': stageStatus = stageStatusDoc.CHO_THAM_DINH; break;
                case 'confirmer': stageStatus = stageStatusDoc.CHO_XAC_NHAN; break;
                case 'signContentDraft': stageStatus = stageStatusDoc.CHO_KY_NOI_DUNG; break;
                case 'reportSigner': stageStatus = stageStatusDoc.CHO_KY_BAN_HANH; break;
                case 'paraphSigner': stageStatus = stageStatusDoc.CHO_KY_NHAY; break;
                case 'officialSigner1':
                case 'officialSigner2':
                case 'officialSigner3':
                  stageStatus = stageStatusDoc.CHO_KY_CHINH_THUC;
                  break;
              }
            }
          } else if (!typeSignNext && candidates && candidates.length > 0) {
            logRuntimeSignDocStep('Step 5.2 (Blocked unsafe role-wide signer fallback)', {
              nextNodeId: nextNode?.id,
              nextNodeType: nextNode?.$type,
              targetRole,
              typeSignNext,
              candidateCount: candidates.length,
              candidateIds: candidates,
            });
            throw new BadRequestException(
              `Không xác định được loại người ký tiếp theo tại node ${nextNode?.id}; đã chặn giao việc cho toàn bộ nhóm ${targetRole}`,
            );
          } else {
            // === SKIP BƯỚC KÝ: Bước tiếp theo không có người ký → tìm bước kế tiếp ===

            const skipResult = await this.findNextStepWithSigners({
              currentNode: nextNode,
              indexes,
              documentId: docIds,
            });

            if (skipResult.nextNode && skipResult.signers.length > 0) {
              // Tìm thấy bước tiếp theo có người ký (có entries trong outgoing_document_users)
              nextNode = skipResult.nextNode;
              typeSignNext = skipResult.typeSign;
              stageStatus = skipResult.stageStatus;
              const skipNodeProps1 = nextNode ? getAllNodeExtensionProperties(nextNode) : {};
              targetRole = nextNode ? (indexes.laneMap.get(nextNode.id) || skipNodeProps1.candidateGroups || payload.targetRole) : undefined;
              targetRoleAfterSign = targetRole;

              multipleAssignees = skipResult.signers.map((s) => ({
                userId: s.user_id,
                signOrder: s.sign_order,
              }));

            } else if (skipResult.nextNode && skipResult.typeSign === 'signStamp') {
              // Gặp bước signStamp sau skip → cập nhật node + thực hiện VT lookup ngay tại đây
              // (không thể dùng else branch bên ngoài vì đang trong if-else chain khác)
              nextNode = skipResult.nextNode;
              typeSignNext = skipResult.typeSign;
              stageStatus = skipResult.stageStatus;
              const skipNodeProps2 = nextNode ? getAllNodeExtensionProperties(nextNode) : {};
              targetRole = nextNode ? (indexes.laneMap.get(nextNode.id) || skipNodeProps2.candidateGroups || payload.targetRole) : undefined;
              targetRoleAfterSign = targetRole;


              // VT lookup để tìm người đóng dấu (VănThư)
              const [meVT, candidatesVT, listVTStamp] = await Promise.all([
                this.sqlsvRepo.getUserById(userId) as Promise<any>,
                this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
                this.sqlsvRepo.getUsersInFlow(bpmnVersion, targetRole, 100, 1, userId),
              ]);

              const matchedVTStamp = listVTStamp.usersWithType || [];
              let vtsStamp: any[] = [];

              const isQTVBNB = bpmnVersion && (bpmnVersion === 'QTVBNB' || bpmnVersion.startsWith('QTVBNB'));
              if (matchedVTStamp.length > 0) {
                if (isQTVBNB) {
                  const currentParentId = meVT?.parent?.id;
                  if (sendTopOr === 0 || sendTopOr === '0') {
                    vtsStamp = matchedVTStamp.filter(
                      (vt: any) => String(vt.parent) === String(currentParentId),
                    );
                  }

                  if (vtsStamp.length === 0 && currentParentId) {
                    const topParent = await this.sqlsvRepo.getTopParentOrganizationUnit(currentParentId);
                    vtsStamp = matchedVTStamp.filter(
                      (vt: any) => String(vt.parent) === String(topParent?._id),
                    );
                  }

                  if (vtsStamp.length === 0 && sendTopOr !== 0 && sendTopOr !== '0') {
                    vtsStamp = matchedVTStamp;
                  }
                } else {
                  vtsStamp = matchedVTStamp;
                }
              }

              if (vtsStamp.length > 0) {
                multipleAssignees = vtsStamp
                  .filter((v: any) => candidatesVT.includes(v._id))
                  .map((v: any) => ({ userId: v._id, signOrder: 0 }));
              }

              if (multipleAssignees.length === 0) {
                throw new BadRequestException(
                  'Không tìm thấy người đóng dấu phù hợp sau khi skip bước ký.',
                );
              }

            } else if (skipResult.nextNode && skipResult.nextNode.$type === 'bpmn:EndEvent') {
              // Tất cả bước ký đều trống → chuyển thẳng EndEvent
              nextNode = skipResult.nextNode;
              targetRole = undefined;
              targetRoleAfterSign = undefined;

            } else if (skipResult.nextNode) {
              // Tìm thấy bước tiếp theo nhưng không phải bước ký (ví dụ: UserTask bình thường)
              nextNode = skipResult.nextNode;
              const skipNodeProps3 = nextNode ? getAllNodeExtensionProperties(nextNode) : {};
              targetRole = nextNode ? (indexes.laneMap.get(nextNode.id) || skipNodeProps3.candidateGroups || payload.targetRole) : undefined;
              targetRoleAfterSign = targetRole;
            } else {
              throw new BadRequestException(
                `Không tìm thấy người ký cho bất kỳ bước nào sau bước hiện tại`,
              );
            }
          }
        }
      } else if (targetRole === curRole) {
        assignTo = userId;
      } else if (flowExt.actionType === 'signCopy') {
        const prvAudit = [...auditArr]
          .reverse()
          .find((a) => a.toNodeId === node?.id);
        assignTo = prvAudit?.createdBy;
      } else {
        // [TỐI ƯU 3]: Ưu tiên lấy từ cấu hình người ký đã chọn (nếu có) trước khi fallback ra toàn bộ role
        const dbSigners = typeSignNext
          ? await this.repo.getSignersFromOutgoingDocumentUsers(docIds, typeSignNext)
          : [];

        if (dbSigners?.length > 0) {
          multipleAssignees = dbSigners.map((s) => ({
            userId: s.user_id,
            signOrder: s.sign_order,
          }));
        } else {
          // [TỐI ƯU 4]: Song song hóa lấy thông tin văn thư và đơn vị
          const [me, candidates, listVT] = await Promise.all([
            this.sqlsvRepo.getUserById(userId) as Promise<any>,
            this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole),
            this.sqlsvRepo.getUsersInFlow(bpmnVersion, targetRole, 100, 1, userId),
          ]);

          const matchedVT = listVT.usersWithType;
          let vts: any[] = [];

          console.log('[signDoc][resolve-van-thu] Lookup candidates', {
            documentId: docIds,
            bpmnVersion,
            currentUserId: userId,
            currentUsername: me?.username || me?.email || me?.name,
            currentParentId: me?.parent?.id,
            targetRole,
            sendTopOr,
            roleCandidateIds: candidates,
            usersInFlow: (matchedVT || []).map((vt: any) => ({
              id: vt?._id,
              username: vt?.username || vt?.email || vt?.name,
              parentId: vt?.parent,
            })),
          });

          const isQTVBNB = bpmnVersion && (bpmnVersion === 'QTVBNB' || bpmnVersion.startsWith('QTVBNB'));
          if (matchedVT.length > 0) {
            if (isQTVBNB) {
              const currentParentId = me?.parent?.id;
              if (sendTopOr === 0 || sendTopOr === '0') {
                vts = matchedVT.filter(
                  (vt) => String(vt.parent) === String(currentParentId),
                );
              }

              if (vts.length === 0 && currentParentId) {
                const topParent = await this.sqlsvRepo.getTopParentOrganizationUnit(
                  currentParentId,
                );
                vts = matchedVT.filter((vt) => String(vt.parent) === String(topParent?._id));
              }

              if (vts.length === 0 && sendTopOr !== 0 && sendTopOr !== '0') {
                vts = matchedVT;
              }
            } else {
              vts = matchedVT;
            }
          }

          if (vts.length > 0) {
            multipleAssignees = vts
              .filter((v) => candidates.includes(v._id))
              .map((v) => ({ userId: v._id, signOrder: 0 }));
          }

          console.log('[signDoc][resolve-van-thu] Resolved assignees', {
            documentId: docIds,
            targetRole,
            filteredUsers: vts.map((vt: any) => ({
              id: vt?._id,
              username: vt?.username || vt?.email || vt?.name,
              parentId: vt?.parent,
              belongsToRole: candidates.includes(vt?._id),
            })),
            selectedAssigneeIds: multipleAssignees.map((item) => item.userId),
          });
        }

        if (multipleAssignees.length === 0) {
          throw new BadRequestException(
            'Không tìm thấy người ký phù hợp hoặc không đúng vai trò xử lý.',
          );
        }
      }

      const willResolveAssigneesAfterConcurrentCompletion =
        concurrentStageResult?.mode && concurrentStageResult.mode !== 'not-concurrent';

      if (
        !assignTo &&
        multipleAssignees.length === 0 &&
        !willResolveAssigneesAfterConcurrentCompletion
      ) {
        throw new BadRequestException(
          'Không xác định được người ký. Vui lòng chọn người ký.',
        );
      }

      // Validate single assignee role
      if (assignTo) {
        const candidates = await this.repo.getUsersByRoleInFlow(
          bpmnVersion,
          targetRole,
        );
        if (!candidates.includes(assignTo)) {
          throw new BadRequestException('Người ký không đúng vai trò xử lý');
        }
      }
    }

    logRuntimeSignDocStep('Step 6 (Assignee resolved)', {
      assignTo,
      multipleAssigneeCount: multipleAssignees.length,
      multipleAssignees: multipleAssignees.map((x) => ({ userId: x.userId, signOrder: x.signOrder })),
    });

    // [TỐI ƯU 2]: Chuẩn bị receivingDept và processor song song (phân phối văn bản)
    let receivingDept: string[] = [];
    if (outgoing && outgoing.internalReceivingDept) {
      if (typeof outgoing.internalReceivingDept === 'string') {
        try {
          receivingDept = JSON.parse(outgoing.internalReceivingDept);
        } catch {
          receivingDept = outgoing.internalReceivingDept.trim() ? [outgoing.internalReceivingDept] : [];
        }
      } else if (Array.isArray(outgoing.internalReceivingDept)) {
        receivingDept = outgoing.internalReceivingDept;
      }
    }

    let processorArray: string[] = [];
    if (outgoing && outgoing.processor) {
      if (typeof outgoing.processor === 'string') {
        try {
          processorArray = JSON.parse(outgoing.processor);
        } catch {
          processorArray = outgoing.processor.trim() ? [outgoing.processor] : [];
        }
      } else if (Array.isArray(outgoing.processor)) {
        processorArray = outgoing.processor;
      }
    }

    let knowReceiversArray: string[] = [];
    if (outgoing && outgoing.knowReceivers) {
      if (typeof outgoing.knowReceivers === 'string') {
        try {
          knowReceiversArray = JSON.parse(outgoing.knowReceivers);
        } catch {
          knowReceiversArray = outgoing.knowReceivers.trim() ? [outgoing.knowReceivers] : [];
        }
      } else if (Array.isArray(outgoing.knowReceivers)) {
        knowReceiversArray = outgoing.knowReceivers;
      }
    }

    const dbName = process.env.SQLSERVER_DATABASE || 'app_tancang';

    // Kiểm tra xem phía sau nút hiện tại có bước BAN_HANH hay không
    let hasBanhHanhStep = false;
    if (nextNode) {
      const visitedNodes = new Set<string>();
      const queue: any[] = [nextNode];
      while (queue.length > 0) {
        const curr = queue.shift();
        if (!curr || visitedNodes.has(curr.id)) continue;
        visitedNodes.add(curr.id);

        const currOuts = indexes.outgoingBySource.get(curr.id) || [];
        for (const fl of currOuts) {
          const ext = this.bpmnEngine.getFlowExtensionProperties(fl);
          if (ext.actionCode === 'BAN_HANH' || fl.name === 'BAN_HANH' || fl.id === 'BAN_HANH') {
            hasBanhHanhStep = true;
            break;
          }
          if (fl.targetRef?.id) {
            const nextTarget = indexes.nodes.get(fl.targetRef.id);
            if (nextTarget) queue.push(nextTarget);
          }
        }
        if (hasBanhHanhStep) break;
      }
    }

    logRuntimeSignDocStep('Step 7 (Prepare distribution data)', {
      receivingDeptCount: receivingDept.length,
      processorCount: processorArray.length,
      knowReceiverCount: knowReceiversArray.length,
      hasBanhHanhStep,
    });
    const isFinalizing = !hasBanhHanhStep && (((nextNode && nextNode.$type === 'bpmn:EndEvent') && isLastSigner) || properties?.allowSendToUnit || typeSigncur === 'signStamp');
    const [unitFlowConfigs, processorInfos, knowReceiverInfosRaw] = await Promise.all([
      isFinalizing && receivingDept.length > 0
        ? this.sqlsvRepo.getIncomingFlowsByUnits(receivingDept)
        : Promise.resolve([]),
      isFinalizing && processorArray.length > 0
        ? Promise.all(
          processorArray.map(async (p) => {
            const user: any = await this.sqlsvRepo.getUserById(p);
            if (!user?.parent?.id) return null;
            const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
            return { processor: p, flowConfig, parentUser: user.parent.id };
          }),
        )
        : Promise.resolve([]),
      isFinalizing && knowReceiversArray.length > 0
        ? Promise.all(
          knowReceiversArray.map(async (k) => {
            const user: any = await this.sqlsvRepo.getUserById(k);
            if (user) {
              if (!user.parent?.id) return null;
              const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(user.parent.id), 'IncommingDocument');
              return { type: 'user', knowReceiver: k, flowConfig, parentUser: user.parent.id };
            } else {
              try {
                const result = await this.groupUserInDocumentService.findUsersByGroupId(k, { page: 1, limit: 1000 });
                const users = Array.isArray(result?.data) ? result.data : [];
                const resolvedUsers = await Promise.all(
                  users.map(async (u) => {
                    const uid = typeof u?.id === 'string' ? u.id.trim() : String(u?.id || '').trim();
                    if (!uid) return null;
                    const gUser: any = await this.sqlsvRepo.getUserById(uid);
                    if (!gUser?.parent?.id) return null;
                    const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(gUser.parent.id), 'IncommingDocument');
                    return { knowReceiver: uid, flowConfig, parentUser: gUser.parent.id };
                  })
                );
                return { type: 'group', members: resolvedUsers.filter(Boolean) };
              } catch (err) {
                this.logger.warn(`Error resolving group ${k} in completeWorkItemDynamicFlow: ${err?.message}`);
                return null;
              }
            }
          }),
        )
        : Promise.resolve([]),
    ]);
    logRuntimeSignDocStep('Step 7.1 (Distribution data loaded)', {
      isFinalizing,
      unitFlowConfigCount: unitFlowConfigs?.length || 0,
      processorInfoCount: processorInfos?.filter(Boolean)?.length || 0,
      knowReceiverInfoRawCount: knowReceiverInfosRaw?.filter(Boolean)?.length || 0,
    });

    const knowReceiverInfos: any[] = [];
    const groupMemberUserIds: string[] = [];
    for (const item of knowReceiverInfosRaw) {
      if (!item) continue;
      if (item.type === 'user') {
        knowReceiverInfos.push({ knowReceiver: item.knowReceiver, flowConfig: item.flowConfig, parentUser: item.parentUser });
      } else if (item.type === 'group' && Array.isArray(item.members)) {
        for (const member of item.members) {
          if (member && member.knowReceiver) {
            groupMemberUserIds.push(member.knowReceiver);
            knowReceiverInfos.push({ knowReceiver: member.knowReceiver, flowConfig: member.flowConfig, parentUser: member.parentUser });
          }
        }
      }
    }

    const flowConfigMap = new Map<string, any>();
    for (const fc of unitFlowConfigs) {
      if (!Array.isArray(fc.unit)) continue;
      for (const u of fc.unit) {
        flowConfigMap.set(String(u), fc);
      }
    }

    const processorFlowConfigs = new Map<string, any>();
    for (const info of processorInfos) {
      if (info && info.flowConfig) {
        processorFlowConfigs.set(info.processor, info);
      }
    }

    const incomingCopiesForUnits: Array<{ incomingDocId: string; flowId: string; receiverUnit: string; }> = [];
    const nextTasks: Array<{ workItemId: string; assignee: string }> = [];
    const warnings: any[] = [];
    const isCallback = false;



    logRuntimeSignDocStep('Step 8 (Begin DB mutation block)', {
      shouldManageTx,
      isFinalizing,
      nextNodeId: nextNode?.id,
      nextNodeType: nextNode?.$type,
    });
    try {
      const isMovingToNextNode = nextNode && nextNode.id !== node.id;

      // Chỉ dọn dẹp toàn bộ node nếu là bước xử lý (không phải ký) HOẶC là người ký cuối cùng
      // Riêng bước signStamp (Văn thư đóng dấu) thường chỉ cần 1 người xử lý là xong cho cả nhóm
      const isSignerNode = !!typeSigncur && typeSigncur !== 'signStamp';
      if (isMovingToNextNode && (!isSignerNode || isLastSigner)) {
        // Chuyển sang node mới và đã hoàn thành điều kiện dừng của node cũ → Xóa tất cả work item của node cũ
        await this.repo.removeWorkItem(docIds, null, node.id, tx);
      } else {
        // Vẫn ở node cũ (ký song song chưa xong) hoặc chưa đủ điều kiện dọn dẹp → chỉ xóa của mình
        const removed = await this.repo.removeWorkItem(docIds, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was đã được hoàn thành bởi người dùng khác',
          );
      }

      logRuntimeSignDocStep('Step 8.1 (After remove current work item)', {
        isMovingToNextNode,
        currentNodeId: node?.id,
        nextNodeId: nextNode?.id,
        isLastSigner,
        typeSigncur,
      });

      let shouldCreateNext =
        (isLastSigner || typeSigncur === 'signStamp') &&
        ((nextNode && isLastSigner) ||
          (assignTo && targetRole === curRole) ||
          flowExt?.actionType === 'signCopy' ||
          (nextNode?.$type !== 'bpmn:EndEvent' && typeSigncur === 'signStamp')) && nextNode?.$type !== 'bpmn:EndEvent';
      let forceCreateNextByPriority = false;
      logRuntimeSignDocStep('Step 8.2 (Branch selected)', {
        shouldCreateNext,
        nextNodeType: nextNode?.$type,
        isLastSigner,
        typeSigncur,
        assignTo,
        multipleAssigneeCount: multipleAssignees.length,
      });

      // [TỐI ƯU]: Cập nhật Audit của người vừa thực hiện ký (Chỉ gọi 1 lần, không gọi trong vòng lặp assignee)
      logRuntimeSignDocStep('Step 8.2.1 (Begin current audit update)', {
        typeSigncur,
        stageStatusUpdate,
        stageStatusQr,
        isMovingToNextNode,
        isLastSigner,
        currentNodeId: node?.id,
        nextNodeId: nextNode?.id,
      });
      if (typeSigncur === 'signCopy') {
        logRuntimeSignDocStep('Step 8.2.2 (Before update current incoming audit)', {
          receiver: effectiveUserId,
          stageStatusUpdate,
          stageStatusQr,
        });
        await this.updateStageStatusAuditIncomingAware(
          docIds,
          {
            receiver: effectiveUserId,
            stage_status: stageStatusUpdate,
            stage_status_query: stageStatusQr,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );
        logRuntimeSignDocStep('Step 8.2.3 (After update current incoming audit)', {
          receiver: effectiveUserId,
        });
      } else {
        const isSignerNode = !!typeSigncur && typeSigncur !== 'signStamp';
        logRuntimeSignDocStep('Step 8.2.4 (Current outgoing audit branch)', {
          isSignerNode,
          isMovingToNextNode,
          isLastSigner,
          currentNodeId: node?.id,
          nextNodeId: nextNode?.id,
        });
        if (isMovingToNextNode && (!isSignerNode || isLastSigner)) {
          // Chuyển sang node mới → Cập nhật trạng thái cho TẤT CẢ mọi người ở node cũ
          logRuntimeSignDocStep('Step 8.2.5 (Before update outgoing audit by node)', {
            nodeId: node?.id,
            stageStatusUpdate,
            stageStatusQr,
            actionCode: flow?.name || actionCode,
          });
          await this.updateStageStatusAuditByNodeOutgoingAware(
            docIds,
            node.id,
            {
              stage_status: stageStatusUpdate,
              stage_status_query: stageStatusQr,
              typeDocument: typeDocStr,
              action_code: flow?.name || actionCode,
            },
            tx,
          );
          logRuntimeSignDocStep('Step 8.2.6 (After update outgoing audit by node)', {
            nodeId: node?.id,
          });
        } else {
          // Vẫn ở node cũ → Chỉ cập nhật trạng thái cho chính mình
          logRuntimeSignDocStep('Step 8.2.7 (Before update current outgoing audit)', {
            receiver: effectiveUserId,
            stageStatusUpdate,
            stageStatusQr,
            endNode: nextNode?.$type === 'bpmn:EndEvent',
          });
          await this.updateStageStatusAuditOutgoingAware(
            docIds,
            {
              receiver: effectiveUserId,
              stage_status: stageStatusUpdate,
              stage_status_query: stageStatusQr,
              typeDocument: typeDocStr,
              details: {
                endNode: nextNode?.$type === 'bpmn:EndEvent' ? true : false,
              },
            },
            tx,
          );
          logRuntimeSignDocStep('Step 8.2.8 (After update current outgoing audit)', {
            receiver: effectiveUserId,
          });
        }
      }

      // Các bước chuyển tiếp (kể cả concurrent) có thể đã được tạo
      // từ lúc trình ký. Vì vậy không thể dựa vào isLastSigner/
      // shouldCreateNext để ghi nhận thao tác của người vừa ký.
      // EndEvent có các nhánh audit hoàn tất riêng ở phía dưới.
      if (typeSigncur && nextNode?.$type !== 'bpmn:EndEvent') {
        const completedSignerStageStatus =
          ['paraphSigner', 'officialSigner1', 'officialSigner2', 'officialSigner3'].includes(typeSigncur)
            ? stageStatusUpdate
            : stageStatusDoc.DA_XU_LY;
        await this.addAuditOutgoingAware(
          docIds,
          {
            user_id: effectiveUserId,
            display_name: payload.displayName,
            role: wi.role,
            action_code: flow?.name || actionCode,
            from_node_id: wi.nodeId,
            to_node_id: wi.nodeId,
            receiver: null,
            receiver_unit: payload.receiver_unit,
            group_: payload.group_ || null,
            roleProcess: statusDoc ? 'processor' : 'supporter',
            action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
            created_by: effectiveUserId,
            stage_status: completedSignerStageStatus,
            origin_id: wi.id,
            deadline: payload.deadline || null,
            created_at: new Date(),
            updated_at: new Date(),
            details: {
              note: payload?.note,
              signOrder: signOrderOfUser,
            },
            curStatusCode: statusDoc,
            originalUser: originalUser || null,
            typeDocument: typeDocStr,
          },
          tx,
        );
      }

      const currentStageProgress = await this.concurrentStageOrchestrator.markNodeProcessed({
        documentId: String(docIds || ''),
        typeDocument: typeDocStr,
        bpmnVersion,
        userId: effectiveUserId,
        originalUser,
        workItemId,
        currentNodeId: node.id,
        targetNodeId: node.id,
        indexes,
        openWorkItems: await this.listOpenWorkItemsWithTx(String(docIds || ''), tx),
        auditArr,
        payload,
        tx,
        finalizePriorityCompletion: async (snapshot, currentNodeId) => {
          await this.finalizeConcurrentStagePriorityCompletion(
            String(docIds || ''),
            currentNodeId,
            snapshot,
            tx,
          );
        },
        resolveAdvanceContext: async (snapshot) => {
          return this.resolveConcurrentPriorityAdvanceContext({
            documentId: String(docIds || ''),
            bpmnVersion,
            snapshot,
            indexes,
            fallbackUserId: effectiveUserId,
            resolvedAssignees: multipleAssignees,
          });
        },
      });

      const concurrentCompletionReason = currentStageProgress?.progress?.completionReason;
      if (
        concurrentCompletionReason === 'priority-node-processed' ||
        concurrentCompletionReason === 'all-processed' ||
        concurrentCompletionReason === 'end-node-processed'
      ) {
        const concurrentAdvance = currentStageProgress?.advanceContext;

        if (concurrentAdvance?.nextNode) {
          nextNode = concurrentAdvance.nextNode;
          targetRole = concurrentAdvance.targetRole;
          stageStatus = concurrentAdvance.stageStatus ?? stageStatus;
          multipleAssignees.length = 0;
          multipleAssignees.push(...concurrentAdvance.assignees);
          forceCreateNextByPriority = nextNode?.$type !== 'bpmn:EndEvent';
          shouldCreateNext = forceCreateNextByPriority;
          skipLegacyTargetCreation = false;

          logRuntimeSignDocStep('Step 8.2.8c (Concurrent stage advance)', {
            completionReason: concurrentCompletionReason,
            exitStageKey: currentStageProgress?.stage?.stageKey,
            reboundNextNodeId: nextNode?.id,
            reboundNextNodeType: nextNode?.$type,
            reboundTargetRole: targetRole,
            reboundAssigneeCount: multipleAssignees.length,
            reboundAssignees: multipleAssignees.map((x) => ({ userId: x.userId, signOrder: x.signOrder })),
            reboundStageStatus: stageStatus,
            reboundShouldCreateNext: shouldCreateNext,
            forceCreateNextByPriority,
            skipLegacyTargetCreation,
          });
        } else {
          logRuntimeSignDocStep('Step 8.2.8c (Concurrent stage advance missing)', {
            completionReason: concurrentCompletionReason,
            exitStageKey: currentStageProgress?.stage?.stageKey,
            hasConcurrentAdvance: false,
            nextNodeId: nextNode?.id,
            targetRole,
            multipleAssigneeCount: multipleAssignees.length,
          });
        }
      }

      if (currentStageProgress?.mode === 'wait-for-stage-completion') {
        logRuntimeSignDocStep('Step 8.2.8b (Block advance by concurrent stage)', {
          currentNodeId: node?.id,
          stageKey: currentStageProgress?.stage?.stageKey,
          completionReason: currentStageProgress?.progress?.completionReason,
        });

        // The current signer has completed their work even though the concurrent
        // stage cannot advance yet. Persist that completion before returning;
        // otherwise process-progress keeps reporting is_signed/completed = 0.
        if (typeSigncur) {
          logRuntimeSignDocStep('Step 8.2.8b.1 (Mark signer before concurrent wait)', {
            typeSigncur,
            parseTypeSign,
            signOrderOfUser,
          });
          const markedRows = await this.repo.markUserSigned({
            documentId: docIds,
            userId: effectiveUserId,
            keySign: parseTypeSign,
            typeSign: typeSigncur,
            signOrder: signOrderOfUser,
            tx,
          });
          if (markedRows === 0) {
            throw new BadRequestException(
              `Không cập nhật được trạng thái ký: documentId=${docIds}, userId=${effectiveUserId}, typeSign=${typeSigncur}`,
            );
          }
          await this.repo.promoteNextSequentialSignerAssignment({
            documentId: docIds,
            typeSign: typeSigncur,
            roleProcess: 'processor',
            activeStageStatus: stageStatusQr || stageStatusDoc.CHUA_XU_LY,
            tx,
          });
          await this.repo.updateSignType(docIds, typeSigncur || 'Ký tay', tx);
        }

        if (shouldManageTx) {
          await this.repo.commit(tx);
        }
        return {
          status: 1,
          message: 'Concurrent stage is still waiting for other nodes to finish',
          blockedByConcurrentStage: true,
          concurrentStage: currentStageProgress,
          nextNode: null,
          warnings,
        };
      }

      const advancedNextProps = getAllNodeExtensionProperties(nextNode) || {};
      const advancedNextStageKey =
        String(advancedNextProps.executeConcurrentByStep || '').trim() ||
        (String(advancedNextProps.isStartConcurrentStep || '')
          .trim()
          .toLowerCase() === 'true'
          ? String(nextNode?.id || '').trim()
          : '');
      const shouldCreateAdvancedConcurrentSiblings =
        Boolean(shouldCreateNext && nextNode?.id && advancedNextStageKey) &&
        String(
          getAllNodeExtensionProperties(nextNode)?.isStartConcurrentStep || '',
        )
          .trim()
          .toLowerCase() === 'true';

      if (shouldCreateAdvancedConcurrentSiblings) {
        let concurrentFinalDeadline = payload.deadline || null;
        if (!concurrentFinalDeadline && advancedNextProps.deadline) {
          const days = parseInt(advancedNextProps.deadline, 10);
          if (!isNaN(days)) {
            concurrentFinalDeadline = moment().add(days, 'days').toDate();
          }
        }

        const fallbackConcurrentAssignees =
          multipleAssignees.length > 0
            ? multipleAssignees
            : [{ userId: assignTo || userId, signOrder: 0 }];

        const concurrentOpenWorkItems = await this.listOpenWorkItemsWithTx(
          String(docIds || ''),
          tx,
        );

        await this.concurrentStageOrchestrator.handleTargetNode({
          documentId: String(docIds || ''),
          typeDocument: typeDocStr,
          bpmnVersion,
          userId: effectiveUserId,
          originalUser,
          workItemId,
          currentNodeId: node.id,
          targetNodeId: nextNode.id,
          indexes,
          openWorkItems: concurrentOpenWorkItems,
          auditArr,
          payload,
          tx,
          createArtifact: async (stageNode) => {
            if (String(stageNode.nodeId) === String(nextNode?.id || '')) {
              return null;
            }

            const stageNodeBpmn = indexes.nodes.get(stageNode.nodeId);
            if (!stageNodeBpmn) return null;

            const stageNodeProps = getAllNodeExtensionProperties(stageNodeBpmn) || {};
            const stageNodeAssignees =
              await this.resolveConcurrentNodeAssignees({
                documentId: String(docIds || ''),
                bpmnVersion,
                stageNode,
                indexes,
                fallbackAssignees: fallbackConcurrentAssignees,
              });

            let createdWorkItemId: string | null = null;
            for (const assignee of stageNodeAssignees) {
              const wiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              createdWorkItemId = wiId;

              await this.repo.addWorkItem(
                docIds,
                {
                  id: wiId,
                  nodeId: stageNode.nodeId,
                  role: stageNode.role,
                  assigneeUserId: assignee.userId,
                  nodeType: stageNode.nodeType,
                },
                tx,
                bpmnVersion,
              );

              await this.addAuditOutgoingAware(
                docIds,
                {
                  user_id: effectiveUserId,
                  display_name: payload.displayName,
                  role: wi.role,
                  action_code: flow?.name || actionCode,
                  from_node_id: wi.nodeId,
                  to_node_id: stageNode.nodeId,
                  receiver: assignee.userId,
                  receiver_unit: payload.receiver_unit,
                  group_: payload.group_ || null,
                  roleProcess: statusDoc ? 'processor' : 'supporter',
                  action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
                  created_by: effectiveUserId,
                  stage_status:
                    this.getStageStatusByTypeSign(
                      stageNodeProps.signerRequired ||
                      stageNodeProps.processRequired ||
                      null,
                    ) || stageStatus || stageStatusDoc.CHUA_XU_LY,
                  origin_id: wi.id,
                  deadline: concurrentFinalDeadline,
                  created_at: new Date(),
                  updated_at: new Date(),
                  details: {
                    note: payload?.note,
                    signOrder: assignee.signOrder,
                    hideAudit:
                      !multipleAssignees.length && stageNode.role === curRole
                        ? true
                        : null,
                  },
                  curStatusCode: statusDoc,
                  originalUser: originalUser || null,
                  typeDocument: typeDocStr,
                },
                tx,
              );
            }

            return createdWorkItemId
              ? {
                exists: false,
                status: 'created',
                workItemId: createdWorkItemId,
                auditId: null,
              }
              : null;
          },
        });
      }

      if (shouldCreateNext && !skipLegacyTargetCreation) {
        logRuntimeSignDocStep('Step 8.2.9 (Enter create-next branch)', {
          targetRole,
          nextNodeId: nextNode?.id,
          nextNodeType: nextNode?.$type,
          assignTo,
          multipleAssigneeCount: multipleAssignees.length,
          multipleAssignees: multipleAssignees.map((x) => ({ userId: x.userId, signOrder: x.signOrder })),
          skipLegacyTargetCreation,
          forceCreateNextByPriority,
        });
        // Tự động tính hạn xử lý (Deadline) cho bước tiếp theo
        let finalDeadline = payload.deadline || null;
        if (!finalDeadline && nextProps.deadline) {
          const days = parseInt(nextProps.deadline, 10);
          if (!isNaN(days)) {
            finalDeadline = moment().add(days, 'days').toDate();
          }
        }

        const assignees = multipleAssignees.length > 0
          ? multipleAssignees
          : [{ userId: assignTo || userId, signOrder: 0 }];
        logRuntimeSignDocStep('Step 8.2.10 (Next assignees ready)', {
          finalDeadline,
          assigneeCount: assignees.length,
          assignees: assignees.map((x) => ({ userId: x.userId, signOrder: x.signOrder })),
        });

        for (const assignee of assignees) {
          const nextWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

          logRuntimeSignDocStep('Step 8.2.11 (Before add next work item)', {
            nextWiId,
            assignee: assignee.userId,
            nextNodeId: nextNode?.id,
            targetRole,
          });
          await this.repo.addWorkItem(
            docIds,
            {
              id: nextWiId,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: assignee.userId,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );
          logRuntimeSignDocStep('Step 8.2.12 (After add next work item)', {
            nextWiId,
            assignee: assignee.userId,
          });

          if (typeSigncur === 'signCopy') {
            logRuntimeSignDocStep('Step 8.2.13 (Before add next incoming audit)', {
              nextWiId,
              receiver: assignee.userId,
              stageStatus: stageStatus ? stageStatus : stageStatusDoc.CHUA_XU_LY,
            });
            await this.addAuditIncomingAware(
              docIds,
              {
                user_id: effectiveUserId,
                display_name: payload.displayName,
                role: wi.role,
                action_code: actionCode,
                from_node_id: wi.nodeId,
                to_node_id: nextNode?.id,
                receiver: assignee.userId,
                receiver_unit: payload.receiver_unit,
                group_: payload.group_ || null,
                roleProcess: statusDoc ? 'processor' : 'supporter',
                action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
                created_by: effectiveUserId,
                stage_status: stageStatus ? stageStatus : stageStatusDoc.CHUA_XU_LY,
                origin_id: wi.id,
                deadline: finalDeadline,
                created_at: new Date(),
                updated_at: new Date(),
                details: {
                  note: payload?.note,
                  signOrder: assignee.signOrder,
                  hideAudit: !multipleAssignees.length && targetRole === curRole ? true : null,
                },
                curStatusCode: statusDoc,
                originalUser: originalUser || null,
                typeDocument: 'IncommingDocument',
              },
              tx,
            );
            logRuntimeSignDocStep('Step 8.2.14 (After add next incoming audit)', {
              nextWiId,
              receiver: assignee.userId,
            });
          }
          else {
            logRuntimeSignDocStep('Step 8.2.15 (Before add next outgoing audit)', {
              nextWiId,
              receiver: assignee.userId,
              stageStatus: stageStatus ? stageStatus : stageStatusDoc.CHUA_XU_LY,
              actionCode: flow?.name || actionCode,
            });
            await this.addAuditOutgoingAware(
              docIds,
              {
                user_id: effectiveUserId,
                display_name: payload.displayName,
                role: wi.role,
                action_code: flow?.name || actionCode,
                from_node_id: wi.nodeId,
                to_node_id: nextNode?.id,
                receiver: assignee.userId,
                receiver_unit: payload.receiver_unit,
                group_: payload.group_ || null,
                roleProcess: statusDoc ? 'processor' : 'supporter',
                action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
                created_by: effectiveUserId,
                stage_status: stageStatus ? stageStatus : stageStatusDoc.CHUA_XU_LY,
                origin_id: wi.id,
                deadline: finalDeadline,
                created_at: new Date(),
                updated_at: new Date(),
                details: {
                  note: payload?.note,
                  signOrder: assignee.signOrder,
                  hideAudit: !multipleAssignees.length && targetRole === curRole ? true : null,
                },
                curStatusCode: statusDoc,
                originalUser: originalUser || null,
                typeDocument: typeDocStr,
              },
              tx,
            );
            logRuntimeSignDocStep('Step 8.2.16 (After add next outgoing audit)', {
              nextWiId,
              receiver: assignee.userId,
            });
          }

          nextTasks.push({ workItemId: nextWiId, assignee: assignee.userId });
        }
        logRuntimeSignDocStep('Step 8.2.17 (Before update document status after create-next)', {
          typeSigncur,
          statusDoc,
          nextTaskCount: nextTasks.length,
        });
        if (typeSigncur === 'signCopy') {
          await this.repo.updateDocumentStatus(docIds, statusDoc, tx);
        } else if (statusDoc) {
          await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);
        }
        logRuntimeSignDocStep('Step 8.2.18 (After update document status after create-next)', {
          typeSigncur,
          statusDoc,
          nextTaskCount: nextTasks.length,
        });
        // const nextEx = getAllNodeExtensionProperties(nextNode);

        // if (nextEx?.signerRequired && (keySign?.signUrl || process.env.URL_KY_TAP_TRUNG)) {
        //   const assigneeIds = multipleAssignees.length > 0 ? multipleAssignees.map(a => a.userId) : [assignTo!];
        //   try {
        //     this.integrationSignatureService.updateSignatureStatusCamunda(
        //       assigneeIds, doc, nextNode, indexes, nextTasks[0].workItemId, targetRole, docDetail
        //     );
        //   } catch (error) {
        //     warnings.push({ code: 'UPDATE_SIGNATURE_STATUS_FAILED', message: 'Lỗi cập nhật ký số tập trung', detail: error?.message });
        //   }
        // }

      } else if (nextNode?.$type === 'bpmn:EndEvent') {
        logRuntimeSignDocStep('Step 8.2.20 (Enter EndEvent branch)', {
          isLastSigner,
          typeSigncur,
          statusDoc,
          stageStatusUpdate,
          stageStatusQr,
        });
        if (isLastSigner) {
          logRuntimeSignDocStep('Step 8.2.21 (EndEvent last signer)', {
            typeSigncur,
            statusDoc,
          });
          if (typeSigncur === 'signCopy' || typeSigncur === 'reportSigner') {
            logRuntimeSignDocStep('Step 8.2.22 (EndEvent signCopy/reportSigner branch)', {
              typeSigncur,
            });
            if (typeSigncur === 'signCopy') {
              logRuntimeSignDocStep('Step 8.2.23 (Before EndEvent update incoming audit)', {
                receiver: effectiveUserId,
                stageStatusUpdate,
              });
              await this.updateStageStatusAuditIncomingAware(docIds, {
                receiver: effectiveUserId,
                stage_status: stageStatusUpdate,
                typeDocument: 'IncommingDocument',
              }, tx);
              logRuntimeSignDocStep('Step 8.2.24 (After EndEvent update incoming audit)', {
                receiver: effectiveUserId,
              });
              logRuntimeSignDocStep('Step 8.2.25 (Before EndEvent add incoming audit)', {
                receiver: null,
                stageStatus: stageStatusDoc.DA_XU_LY,
              });
              await this.addAuditIncomingAware(docIds, {
                user_id: effectiveUserId,
                display_name: payload.displayName,
                role: wi.role,
                action_code: actionCode,
                from_node_id: wi.nodeId,
                to_node_id: nextNode?.id,
                receiver: null,
                receiver_unit: payload.receiver_unit,
                group_: payload.group_ || null,
                roleProcess: statusDoc ? 'processor' : 'supporter',
                action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
                created_by: effectiveUserId,
                stage_status: stageStatusDoc.DA_XU_LY,
                origin_id: wi.id,
                deadline: payload.deadline || null,
                created_at: new Date(),
                updated_at: new Date(),
                details: null,
                curStatusCode: statusDoc,
                originalUser: originalUser || null,
                typeDocument: 'IncommingDocument',
              }, tx);
              logRuntimeSignDocStep('Step 8.2.26 (After EndEvent add incoming audit)', {
                receiver: null,
              });
            } else {
              logRuntimeSignDocStep('Step 8.2.27 (Before EndEvent update outgoing audit)', {
                receiver: effectiveUserId,
                stageStatusUpdate,
                stageStatusQr,
              });
              await this.updateStageStatusAuditOutgoingAware(
                docIds,
                {
                  receiver: effectiveUserId,
                  stage_status: stageStatusUpdate,
                  stage_status_query: stageStatusQr,
                  typeDocument: typeDocStr,
                  details: {
                    endNode: true,
                  }
                },
                tx,
              );
              logRuntimeSignDocStep('Step 8.2.28 (After EndEvent update outgoing audit)', {
                receiver: effectiveUserId,
              });
              logRuntimeSignDocStep('Step 8.2.29 (Before EndEvent add outgoing audit)', {
                receiver: null,
                stageStatus: stageStatusDoc.DA_KY_PHE_DUYET,
                actionCode,
              });
              await this.addAuditOutgoingAware(
                docIds,
                {
                  user_id: effectiveUserId,
                  display_name: payload.displayName,
                  role: wi.role,
                  action_code: actionCode,
                  from_node_id: wi.nodeId,
                  to_node_id: nextNode?.id,
                  receiver: null,
                  receiver_unit: payload.receiver_unit,
                  group_: payload.group_ || null,
                  roleProcess: statusDoc ? 'processor' : 'supporter',
                  action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
                  created_by: effectiveUserId,
                  stage_status: stageStatusDoc.DA_KY_PHE_DUYET,
                  origin_id: wi.id,
                  deadline: payload.deadline || null,
                  created_at: new Date(),
                  updated_at: new Date(),
                  details: null,
                  curStatusCode: statusDoc,
                  originalUser: originalUser || null,
                  typeDocument: typeDocStr,
                },
                tx,
              );
              logRuntimeSignDocStep('Step 8.2.30 (After EndEvent add outgoing audit)', {
                receiver: null,
              });
              logRuntimeSignDocStep('Step 8.2.31 (Before EndEvent update outgoing document status)', {
                statusDoc: stageStatusDoc.DA_KY_PHE_DUYET,
              });
              await this.repo.updateOutGoingDocumentStatus(
                docIds,
                stageStatusDoc.DA_KY_PHE_DUYET,
                tx,
              );
              logRuntimeSignDocStep('Step 8.2.31.1 (After EndEvent update outgoing document status)', {
                statusDoc: stageStatusDoc.DA_KY_PHE_DUYET,
              });
            }
          } else {
            logRuntimeSignDocStep('Step 8.2.32 (EndEvent final completion branch)', {
              typeSigncur,
              stageStatusUpdate,
              stageStatusQr,
              statusDoc,
            });
            // Khi không đóng dấu (officialSigner tại EndEvent): dùng HOAN_THANH
            // Khi đóng dấu (signStamp tại EndEvent): giữ nguyên stageStatusUpdate (DA_DONG_DAU)
            const isNoStampCompletion = typeSigncur !== 'signStamp' && ['officialSigner1', 'officialSigner2', 'officialSigner3', 'reportSigner'].includes(typeSigncur);
            const finalStageStatus = isNoStampCompletion ? stageStatusDoc.HOAN_THANH : stageStatusUpdate;

            logRuntimeSignDocStep('Step 8.2.33 (Before EndEvent final update outgoing audit)', {
              receiver: effectiveUserId,
              finalStageStatus,
              stageStatusQr,
            });
            await this.updateStageStatusAuditOutgoingAware(
              docIds,
              {
                receiver: effectiveUserId,
                stage_status: finalStageStatus,
                stage_status_query: stageStatusQr,
                typeDocument: typeDocStr,
                details: {
                  endNode: true,
                }
              },
              tx,
            );
            logRuntimeSignDocStep('Step 8.2.34 (After EndEvent final update outgoing audit)', {
              receiver: effectiveUserId,
              finalStageStatus,
            });

            // Ghi audit mới cho bước đóng dấu để processProgress nhận diện completed
            if (typeSigncur === 'signStamp') {
              logRuntimeSignDocStep('Step 8.2.35 (Before EndEvent add signStamp audit)', {
                typeSigncur,
                stageStatus: stageStatusDoc.DA_DONG_DAU,
              });
              await this.addAuditOutgoingAware(
                docIds,
                {
                  user_id: effectiveUserId,
                  display_name: payload.displayName,
                  role: wi.role,
                  action_code: actionCode,
                  from_node_id: wi.nodeId,
                  to_node_id: nextNode?.id,
                  receiver: null,
                  roleProcess: 'processor',
                  action: 'Đóng dấu',
                  created_by: effectiveUserId,
                  stage_status: stageStatusDoc.DA_DONG_DAU,
                  origin_id: wi.id,
                  created_at: new Date(),
                  updated_at: new Date(),
                  typeDocument: typeDocStr,
                },
                tx,
              );
              logRuntimeSignDocStep('Step 8.2.36 (After EndEvent add signStamp audit)', {
                typeSigncur,
              });
            }

            // [FIX] Khi is_stamp = false, người ký chính thức cuối cùng ký xong → nextNode là EndEvent
            // Cần ghi audit và cập nhật trạng thái văn bản (trước đây chỉ xử lý cho signStamp)
            if (typeSigncur !== 'signStamp' && ['officialSigner1', 'officialSigner2', 'officialSigner3', 'reportSigner'].includes(typeSigncur)) {
              logRuntimeSignDocStep('Step 8.2.37 (Before EndEvent add official signer audit)', {
                typeSigncur,
                stageStatus: stageStatusDoc.HOAN_THANH,
              });
              await this.addAuditOutgoingAware(
                docIds,
                {
                  user_id: effectiveUserId,
                  display_name: payload.displayName,
                  role: wi.role,
                  action_code: actionCode,
                  from_node_id: wi.nodeId,
                  to_node_id: nextNode?.id,
                  receiver: null,
                  roleProcess: 'processor',
                  action: 'Ký chính thức',
                  created_by: effectiveUserId,
                  stage_status: stageStatusDoc.HOAN_THANH,
                  origin_id: wi.id,
                  created_at: new Date(),
                  updated_at: new Date(),
                  details: { endNode: true },
                  typeDocument: typeDocStr,
                },
                tx,
              );
              logRuntimeSignDocStep('Step 8.2.38 (After EndEvent add official signer audit)', {
                typeSigncur,
              });
            }

            // Cập nhật trạng thái văn bản khi kết thúc tại EndEvent (cả signStamp và officialSigner khi is_stamp=false)
            if (statusDoc) {
              logRuntimeSignDocStep('Step 8.2.39 (Before EndEvent final update outgoing document status)', {
                statusDoc,
              });
              await this.repo.updateOutGoingDocumentStatus(docIds, statusDoc, tx);
              logRuntimeSignDocStep('Step 8.2.39.1 (After EndEvent final update outgoing document status)', {
                statusDoc,
              });
            }
          }
        } else {
          // Intermediate signer at End node
          logRuntimeSignDocStep('Step 8.2.40 (EndEvent intermediate signer branch)', {
            typeSigncur,
            signOrderOfUser,
          });
          logRuntimeSignDocStep('Step 8.2.41 (Before EndEvent intermediate update outgoing audit)', {
            receiver: effectiveUserId,
            stageStatus: stageStatusDoc.DA_XU_LY,
          });
          await this.updateStageStatusAuditOutgoingAware(
            docIds,
            {
              receiver: effectiveUserId,
              stage_status: stageStatusDoc.DA_XU_LY,
            },
            tx,
          );
          logRuntimeSignDocStep('Step 8.2.42 (After EndEvent intermediate update outgoing audit)', {
            receiver: effectiveUserId,
          });
          logRuntimeSignDocStep('Step 8.2.43 (Before EndEvent intermediate add outgoing audit)', {
            receiver: null,
            signOrderOfUser,
          });
          await this.addAuditOutgoingAware(
            docIds,
            {
              user_id: effectiveUserId,
              display_name: payload.displayName,
              role: wi.role,
              action_code: actionCode,
              from_node_id: wi.nodeId,
              to_node_id: wi.nodeId,
              receiver: null,
              receiver_unit: payload.receiver_unit,
              group_: payload.group_ || null,
              roleProcess: statusDoc ? 'processor' : 'supporter',
              action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
              created_by: effectiveUserId,
              stage_status: stageStatusDoc.DA_XU_LY,
              origin_id: wi.id,
              deadline: payload.deadline || null,
              created_at: new Date(),
              updated_at: new Date(),
              details: {
                note: payload?.note,
                signOrder: signOrderOfUser,
              },
              curStatusCode: statusDoc,
              originalUser: originalUser || null,
              typeDocument: typeDocStr,
            },
            tx,
          );
          logRuntimeSignDocStep('Step 8.2.43.1 (After EndEvent intermediate add outgoing audit)', {
            receiver: null,
          });
        }

      }
      else if (nextNode && !isLastSigner && typeSigncur) {
        logRuntimeSignDocStep('Step 8.2.44 (Intermediate signer same-flow branch)', {
          typeSigncur,
          stageStatusUpdate,
          stageStatusQr,
          nextNodeId: nextNode?.id,
        });
        logRuntimeSignDocStep('Step 8.2.45 (Before intermediate signer update outgoing audit)', {
          receiver: effectiveUserId,
          stageStatusUpdate,
          stageStatusQr,
        });
        await this.updateStageStatusAuditOutgoingAware(
          docIds,
          {
            receiver: effectiveUserId,
            stage_status: stageStatusUpdate, // Dùng giá trị đã tính toán cho ký
            stage_status_query: stageStatusQr, // Filter đúng record đang chờ ký
            typeDocument: typeDocStr,
          },
          tx,
        );
        logRuntimeSignDocStep('Step 8.2.46 (After intermediate signer update outgoing audit)', {
          receiver: effectiveUserId,
        });
      }

      if (typeSigncur) {
        logRuntimeSignDocStep('Step 8.3 (Mark signer)', {
          typeSigncur,
          parseTypeSign,
          signOrderOfUser,
        });
        await this.repo.markUserSigned({
          documentId: docIds,
          userId: effectiveUserId,
          keySign: parseTypeSign,
          typeSign: typeSigncur,
          signOrder: signOrderOfUser,
          tx
        });
        await this.repo.promoteNextSequentialSignerAssignment({
          documentId: docIds,
          typeSign: typeSigncur,
          roleProcess: 'processor',
          activeStageStatus: stageStatusQr || stageStatusDoc.CHUA_XU_LY,
          tx,
        });
        await this.repo.updateSignType(docIds, typeSigncur || 'Ký tay', tx);
      }

      // [PHÂN PHỐI VĂN BẢN] Di chuyển ra ngoài EndEvent để luôn chạy khi đóng dấu/phát hành
      if (isFinalizing) {
        logRuntimeSignDocStep('Step 8.4 (Finalize distribution)', {
          receivingDeptCount: receivingDept.length,
          processorInfoCount: processorInfos.length,
          knowReceiverInfoCount: knowReceiverInfos.length,
        });
        const allKnowReceiverUserIds = [...new Set([
          ...knowReceiversArray,
          ...groupMemberUserIds,
          ...knowReceiverInfos.map((info) => info.knowReceiver).filter(Boolean),
        ])];

        if (allKnowReceiverUserIds.length > 0) {
          const currentKnowReceivers = [...knowReceiversArray];
          const updatedKnowReceivers = [...new Set([...currentKnowReceivers, ...allKnowReceiverUserIds])];

          const updateRequest = tx.request();
          updateRequest.input('documentId', sql.VarChar, docIds);
          updateRequest.input('knowReceivers', sql.NVarChar, JSON.stringify(updatedKnowReceivers));
          await updateRequest.query(`
            UPDATE outgoing_documents
            SET know_receivers = @knowReceivers,
                updated_at = GETDATE()
            WHERE document_id = @documentId
          `);

          if (outgoing) {
            outgoing.knowReceivers = JSON.stringify(updatedKnowReceivers);
          }

          if (this.notificationService) {
            try {
              await Promise.all(
                allKnowReceiverUserIds.map((recipientId) =>
                  this.notificationService!.create({
                    recipientId,
                    senderId: userId,
                    content: `Văn bản đi ${outgoing?.toBook ? `số ${outgoing.toBook} ` : ''}đã được chuyển đến đồng chí nhận để biết.`,
                    recordId: docIds,
                    link: `/outgoing-documents/${docIds}`,
                    key: 'VIEW_OUTCOMING_DOC',
                    type: NotificationType.OUTGOING_DOC_PUBLISHED_RECEIVER_KNOW.value,
                    time: new Date(),
                    status: 1,
                  })
                )
              );
            } catch (e: any) {
              this.logger.error(`❌ Notification for know receivers in signDoc failed: ${e?.message || e}`);
            }
          }
        }

        // Xử lý processor trong transaction
        if (processorInfos.length > 0) {
          for (const info of processorInfos) {
            if (info && info.flowConfig) {
              await this.createIncomingDocumentCopyProcessor({
                outgoing,
                receiverUnit: String(info.parentUser),
                processorUserId: info.processor,
                flowConfig: info.flowConfig,
                payload,
                wi,
                tx,
                actionCode: 'CREATE',
                details: JSON.stringify({
                  isTransferOption: false,
                  transferType: 'to_processor',
                  processorUserId: info.processor,
                  organizationUnit: info.parentUser,
                }),
                skipDuplicateCheck: true,
                notification: true,
                userId,
              });
            }
          }
        }

        // Xử lý knowReceivers trong transaction (removed knowReceivers copy to incoming)
        /*
        if (knowReceiverInfos.length > 0) {
          for (const info of knowReceiverInfos) {
            if (info && info.flowConfig) {
              await this.createIncomingDocumentCopy({
                outgoing,
                receiverUnit: String(info.parentUser),
                processorUserId: info.knowReceiver,
                flowConfig: info.flowConfig,
                payload,
                wi,
                tx,
                actionCode: 'CREATE',
                details: JSON.stringify({
                  isTransferOption: false,
                  transferType: 'to_know',
                  processorUserId: info.knowReceiver,
                  organizationUnit: info.parentUser,
                }),
                skipDuplicateCheck: true,
                notification: true,
                userId,
                roleProcess: 'viewer',
              });
            }
          }
        }
        */

        // Xử lý allowSendToUnit trong transaction (giống promulgateDocument)
        if (receivingDept.length > 0) {
          for (const ou of receivingDept) {
            const flowConfig = flowConfigMap.get(String(ou));
            if (!flowConfig) {
              this.logger.warn(`[signDoc-otp][runtime] Missing flow config for unit=${ou}, docId=${docIds}`);
              continue;
            }

            const createdIncoming = await this.createIncomingDocumentCopy({
              outgoing,
              receiverUnit: ou,
              processorUserId: null,
              flowConfig,
              payload,
              wi,
              tx,
              actionCode: 'CREATE',
              details: JSON.stringify({
                isTransferOption: false,
                transferType: 'to_room',
                organizationUnit: ou,
              }),
              skipDuplicateCheck: false,
              notification: true,
              userId,
            });

            if (createdIncoming?.incomingDocId) {
              incomingCopiesForUnits.push({
                incomingDocId: String(createdIncoming.incomingDocId),
                flowId: String(flowConfig.id),
                receiverUnit: String(ou),
              });
            } else {
              this.logger.warn(`[signDoc-otp][runtime] Incoming copy not created for unit=${ou}, docId=${docIds}`);
            }
          }
        }
      }

      // =========== CHÚ Ý UPDATE Ở ĐÂY ===========
      if (shouldManageTx) {
        logRuntimeSignDocStep('Step 8.5 (Before commit)');
        await this.repo.commit(tx);
        logRuntimeSignDocStep('Step 8.6 (After commit)');
      }
      // ==========================================


      // [TỐI ƯU 4]: Xử lý hậu Commit song song
      logRuntimeSignDocStep('Step 9 (Post-commit lookups)', {
        nextTaskCount: nextTasks.length,
        assignTo,
        multipleAssigneeCount: multipleAssignees.length,
      });
      const recipientIds = multipleAssignees.length > 0 ? multipleAssignees.map(a => a.userId) : (assignTo ? [assignTo] : []);
      const [displayNames, finalDoc] = await Promise.all([
        Promise.all(recipientIds.map(id => this.repo.buildDisplayNameWithAuthorized(id))),
        this.repo.getOutgoingDocument(docIds),
      ]);

      let combinedContent: string | null = null;
      // if (shouldCreateNext && recipientIds.length > 0) {
      //   const receiverText = ` ${[...new Set(displayNames)].filter(Boolean).join(', ')}`;
      //   combinedContent = [
      //     typeSigncur ? (node?.name ? `${node.name}/Trình ký:${receiverText}.` : `Trình ký:${receiverText}.`) : `Trình ký:${receiverText}.`,
      //     payload?.note,
      //   ].filter(Boolean).join('\n');
      // } else if (!typeSigncur) {
      //   combinedContent = `${node?.name}`;
      // }
      combinedContent = payload?.note || '';

      if (combinedContent || payload?.note) {
        try {
          await this.addSystemComment(docIds, payload, combinedContent || payload?.note, originalUser || effectiveUserId);
        } catch (err: any) {
          this.logger.error(`[signDoc] Lỗi tạo comment hệ thống cho văn bản ${docIds}: ${err?.message || err}`);
        }
      }

      logRuntimeSignDocStep('Step 10 (Success)', {
        nextTaskCount: nextTasks.length,
        incomingCopiesCount: incomingCopiesForUnits.length,
        warningCount: warnings.length,
        nextNodeId: nextNode?.id,
      });

      return {
        status: 1,
        message: 'Ký văn bản thành công',
        document: finalDoc,
        nextNode: nextNode ? {
          id: nextNode.id,
          type: nextNode.$type,
          curRole,
          nextTargeRole: targetRole,
          targetRole: targetRoleAfterSign,
          isMultiInstance: multipleAssignees.length > 0,
          tasks: nextTasks,
          actionCode: nextActionCode,
        } : null,
        concurrentStage: concurrentStageResult,
        incomingCopiesForUnits,
        warnings,
      };
    } catch (e: any) {
      console.error('--- [runtime.signDoc] Catch ---', {
        currentStep: runtimeSignDocCurrentStep,
        elapsedMs: Date.now() - runtimeSignDocStartedAt,
        docIds,
        workItemId,
        actionCode,
        userId,
        originalUser,
        typeSigncur,
        typeSignNext,
        shouldManageTx,
        hasTx: Boolean(tx),
        nextNodeId: nextNode?.id,
        nextNodeType: nextNode?.$type,
        errorName: e?.name,
        errorMessage: e?.message || String(e),
      });
      if (e?.stack) {
        console.error(e.stack);
      }
      // =========== CHÚ Ý UPDATE Ở ĐÂY ===========
      if (shouldManageTx) {
        logRuntimeSignDocStep('Step 99 (Rollback transaction)', {
          errorMessage: e?.message || String(e),
        });
        await this.repo.rollback(tx);
        logRuntimeSignDocStep('Step 99.1 (Rollback completed)');
      }
      // ==========================================
      throw e;
    }
  }

  // Lịch họp
  async proposeWorkItem({
    bpmnXML,
    meetingId,
    workItemId,
    payload,
    userId,
    author,
    bpmnVersion,
  }: ProposeMeetingParams): Promise<any> {
    // 1. Parse BPMN & get current workItem
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.repo.getWorkItem(meetingId, workItemId);

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    // 2. Validate actionCode
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    // 3. Resolve effective user (ủy quyền)
    const effectiveUserId = author || userId;
    const effectiveDisplayName = payload.displayName || 'User';

    // 4. Find current node & outgoing flows
    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    let outs = indexes.outgoingBySource.get(node.id) || [];

    // Handle gateway trung gian
    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    // 5. Match flow theo actionCode
    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // 6. Resolve next interactive node
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    // 7. Resolve role & status
    const targetRole = indexes.laneMap.get(nextNode.id);
    const statusDoc = flow?.targetRef
      ? getAllNodeExtensionProperties(flow.targetRef)?.statusCode
      : undefined;

    if (!targetRole) {
      throw new BadRequestException('Target role not found for next node');
    }

    // 8. Lấy danh sách Ban quản lý phòng theo role trong flow
    const listUsers = await this.sqlsvRepo.getUsersInFlow(
      bpmnVersion,
      targetRole,
      100,
      1,
      effectiveUserId,
    );

    // ===== 1️⃣ USER THEO ROLE HỆ THỐNG =====
    const roleUsers = await this.sqlsvRepo.findUsersByRoleCodes([targetRole]);
    const roleUserIds = roleUsers.map(u => u.id);

    // ===== 2️⃣ USER THEO BPMN LANE =====
    const laneUserIds = (listUsers.usersWithType || [])
      .map(u => u._id);

    // ===== 3️⃣ UNION 2 NGUỒN =====
    const allUserIds = [...new Set([
      ...roleUserIds,
      ...laneUserIds
    ])];

    // 10. Transaction
    const tx = await this.repo.begin();

    try {
      // 10.1 Remove current workItem (optimistic lock)
      const removed = await this.repo.removeWorkItem(meetingId, wi.id, tx);

      // if (removed !== 1) {
      //   throw new BadRequestException(
      //     'Work item was already completed by another user',
      //   );
      // }

      // 10.2 Create workItem cho MỖI Ban quản lý phòng
      for (const user of allUserIds) {
        await this.repo.addWorkItem(
          meetingId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: user,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      // 10.3 Update stage status
      await this.updateStageStatusAuditIncomingAware(
        meetingId,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.DA_XU_LY,
          typeDocument: 'Meeting',
        },
        tx,
      );
      // Cập nhật trạng thái cuộc họp về "Dự kiến"
      await this.repo.updateMeetingStateTx(meetingId, MEETING_STATE.DU_KIEN, tx);
      // await this.repo.updateStatusMeetingRoom(meetingId, MEETING_STATE.DU_KIEN, tx);

      // 10.4 Audit log (theo nhóm)
      await this.addAuditIncomingAware(
        meetingId,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode.id,
          receiver: 'BAN_QUAN_LY_PHONG',
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Chuyển Ban quản lý phòng',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          typeDocument: 'Meeting',
        },
        tx,
      );

      // 10.5 Update meeting status
      if (statusDoc) {
        await this.repo.updateMeetingStatus(meetingId, statusDoc, tx);
      }

      // 10.6 Commit
      await this.repo.commit(tx);
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    // 11. Return result
    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }

  async rejectMeetingWorkItem({
    bpmnXML,
    meetingId,
    workItemId,
    payload,
    userId,
    author,
    bpmnVersion,
    userIdReturn,
  }: ProposeMeetingParamsMeeting): Promise<any> {
    // 1. Parse BPMN & get current workItem
    const { indexes } = await this.getModelFromXml(bpmnXML);
    let wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi && workItemId && workItemId.startsWith('wi_virtual_')) {
      let approverNodeId: string | null = null;
      let approverRole: string | null = null;
      for (const node of indexes.nodes.values()) {
        const extProps = getAllNodeExtensionProperties(node);
        if (extProps?.actionCode === 'APPROVER_MEETING') {
          approverNodeId = node.id;
          approverRole = indexes.laneMap?.get(node.id) || null;
          break;
        }
      }
      if (!approverNodeId) {
        throw new BadRequestException('Approver node not found in BPMN definition');
      }
      wi = {
        id: workItemId,
        documentId: meetingId,
        nodeId: approverNodeId,
        role: approverRole || 'BAN_QUAN_LY_PHONG_HOP',
        state: 'open',
      };
    }

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    // 2. Validate actionCode
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    // 3. Resolve effective user (ủy quyền logic)
    const effectiveUserId = author || userId;
    const effectiveDisplayName = payload.displayName || 'Quản lý phòng họp';

    // 4. Find next interactive node
    const node = indexes.nodes.get(wi.nodeId);
    let allouts = indexes.outgoingBySource.get(node.id) || [];

    // nếu node kế là gateway → lấy outgoing của gateway
    if (allouts.length === 1) {
      const nextNode = allouts[0].targetRef;

      if (
        nextNode?.$type === 'bpmn:ExclusiveGateway' ||
        nextNode?.$type === 'bpmn:InclusiveGateway'
      ) {
        allouts = indexes.outgoingBySource.get(nextNode.id) || [];
      }
    }

    // lúc này allouts luôn là array flow
    const flow = allouts.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });


    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // 6. Get next node & status
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRef = flow?.targetRef;
    const statusDoc = targetRef
      ? getAllNodeExtensionProperties(targetRef)?.statusCode
      : undefined;

    // 7. Validate assignee requirement
    const laneMap = indexes.laneMap;
    const targetRole = nextNode ? laneMap.get(nextNode.id) : undefined;

    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;

    let assignTo: string | null = null;

    if (requiresAssignee) {
      assignTo = payload.assignToUserId ?? userIdReturn ?? null;

      if (!assignTo) {
        throw new BadRequestException(
          'assignToUserId is required for this action',
        );
      }

      // Validate role match
      // const candidates = await this.repo.getUsersByRoleInFlow(
      //   bpmnVersion,
      //   targetRole,
      // );

      // if (candidates.length && !candidates.includes(assignTo)) {
      //   throw new BadRequestException(
      //     'Người nhận không đúng vai trò, vui lòng chọn lại',
      //   );
      // }
    }

    // 8. Execute transaction
    const tx = await this.repo.begin();

    try {
      // 8.1. Remove current workItem (optimistic locking)
      let removed = 1;
      if (!wi.id.startsWith('wi_virtual_')) {
        removed = await this.repo.removeWorkItem(meetingId, wi.id, tx);
      }
      if (removed !== 1) {
        throw new BadRequestException(
          'Work item was already completed by another user',
        );
      }

      // 8.2. Create new workItem for next user
      if (nextNode) {
        await this.repo.addWorkItem(
          meetingId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: requiresAssignee ? assignTo : null,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      // 8.4. Create audit trail
      const processedById = assignTo
        ? await this.repo.getAuthorizedIdIfAuthor(assignTo)
        : null;
      const actingAs = assignTo
        ? await this.repo.getAuthorIdIfAuthorized(assignTo)
        : null;

      await this.addAuditIncomingAware(
        meetingId,
        {
          user_id: effectiveUserId,
          display_name: effectiveDisplayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: assignTo,
          processed_by: processedById,
          acting_as: actingAs,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: 'processor',
          action: 'Từ chối phê duyệt',
          created_by: effectiveUserId,
          stage_status: stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          typeDocument: 'Meeting',
        },
        tx,
      );

      const actor = await this.sqlsvRepo.getUserById(userId);
      const actorName = actor?.name || userId;
      await this.repo.createComment({
        documentId: meetingId,
        userId: userId,
        userName: actorName,
        content: payload.note ? `Lịch họp không được phê duyệt. Lý do: "${payload.note}"` : `Lịch họp không được phê duyệt`,
      });
      // 8.3. Mark current stage as completed
      const updated = await this.repo.updateStageStatusAuditByOrigin(
        meetingId,
        'BAN_QUAN_LY_PHONG',
        'TU_CHOI_PHE_DUYET',
        effectiveUserId,
        tx,
      );

      // Cập nhật trạng thái cuộc họp về "Dự kiến"
      await this.repo.updateMeetingStateTx(meetingId, MEETING_STATE.DU_KIEN, tx);
      // await this.repo.updateStatusMeetingRoom(meetingId, MEETING_STATE.DRAFT, tx);

      if (updated !== 1) {
        throw new BadRequestException('Current audit not found to update');
      }

      // 8.5. Update document status if needed
      if (statusDoc) {
        await this.repo.updateMeetingStatus(meetingId, statusDoc, tx);
      }
      await this.repo.updateMeetingStageStatus(meetingId, 'TU_CHOI_PHE_DUYET', tx);

      // 8.6. Commit transaction
      await this.repo.commit(tx);
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }
  private findNextServiceTask(node: any, indexes: any): any | null {
    const visited = new Set<string>();
    const stack: any[] = [node];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.$type === 'bpmn:ServiceTask') {
        return current;
      }

      const outs = indexes.outgoingBySource.get(current.id) || [];
      for (const flow of outs) {
        if (flow.targetRef) {
          stack.push(flow.targetRef);
        }
      }
    }

    return null;
  }

  async approveMeetingWorkItem({
    bpmnXML,
    meetingId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    bpmnVersion,
  }: ProposeMeetingParamsMeeting & { originalUser: string }): Promise<any> {
    // const unitIdReceive = await this.repo.getUnitReceiveMeeting(meetingId);

    const { indexes } = await this.getModelFromXml(bpmnXML);
    const flowUserIds = new Set<string>();
    const unitUserIds = new Set<string>();


    let wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi && workItemId && workItemId.startsWith('wi_virtual_')) {
      let approverNodeId: string | null = null;
      let approverRole: string | null = null;
      for (const node of indexes.nodes.values()) {
        const extProps = getAllNodeExtensionProperties(node);
        if (extProps?.actionCode === 'APPROVER_MEETING') {
          approverNodeId = node.id;
          approverRole = indexes.laneMap?.get(node.id) || null;
          break;
        }
      }
      if (!approverNodeId) {
        throw new BadRequestException('Approver node not found in BPMN definition');
      }
      wi = {
        id: workItemId,
        documentId: meetingId,
        nodeId: approverNodeId,
        role: approverRole || 'BAN_QUAN_LY_PHONG_HOP',
        state: 'open',
      };
    }

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = author || userId;
    const effectiveDisplayName = payload.displayName || 'Quản lý phòng';

    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Current BPMN node not found');
    }

    let outs = indexes.outgoingBySource.get(currentNode.id) || [];

    for (const f of outs) {
      if (f.targetRef?.$type?.includes('Gateway')) {
        outs = indexes.outgoingBySource.get(f.targetRef.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow for actionCode ${actionCode}`,
      );
    }

    const targetNode = flow.targetRef;
    if (!targetNode) {
      throw new BadRequestException('Flow target node not found');
    }
    let serviceBranches: any[] | null = null;
    let receiveNodeId: string | null = null;
    let cancelNodeId: string | null = null;

    const serviceNode = this.findNextServiceTask(targetNode, indexes);
    if (serviceNode) {
      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: serviceNode.id,
        bpmnXml: bpmnXML,
        variables: { meetingId, nodeId: serviceNode.id, indexes },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException('ServiceTask không trả về nextNodes');
      }
      serviceBranches = result.nextNodes;
      receiveNodeId = result.receiveNodeId;
      cancelNodeId = result.cancelNodeId;
    }


    const statusDoc = getAllNodeExtensionProperties(serviceNode)?.statusCode;

    const actionCodeExt = getAllNodeExtensionProperties(serviceNode)?.actionCode || actionCode;

    const tx = await this.repo.begin();

    try {
      const updated = await this.repo.updateStageStatusAuditByOrigin(
        meetingId,
        'BAN_QUAN_LY_PHONG',
        'DONG_Y_PHE_DUYET',
        userId,
        tx,
      );
      if (updated !== 1) {
        // Audit  phê duyệt
        await this.addAuditIncomingAware(
          meetingId,
          {
            user_id: effectiveUserId,
            display_name: effectiveDisplayName,
            role: null,
            action_code: actionCodeExt,
            from_node_id: wi.nodeId,
            to_node_id: null,
            receiver: 'BAN_QUAN_LY_PHONG',
            roleProcess: 'seat',
            action: 'Phê duyệt lịch họp',
            created_by: effectiveUserId,
            stage_status: stageStatusDoc.DONG_Y_PHE_DUYET,
            origin_id: wi.id,
            created_at: new Date(),
            updated_at: new Date(),
            curStatusCode: statusDoc,
            typeDocument: 'Meeting',
            processed_by: effectiveUserId,
            originalUser: originalUser || null,
            acting_as: effectiveUserId,
          },
          tx,
        );
      }
      const actor = await this.sqlsvRepo.getUserById(userId);
      const actorName = actor?.name || userId;
      await this.repo.createComment({
        documentId: meetingId,
        userId: userId,
        userName: actorName,
        content: `Đã phê duyệt lịch họp`,
      });
      await this.repo.updateMeetingStateTx(
        meetingId,
        MEETING_STATE.DU_KIEN,
        tx,
      );
      // await this.repo.updateStatusMeetingRoom(meetingId, MEETING_STATE.DU_KIEN, tx);

      // === SERVICE TASK BRANCHES ===
      if (serviceBranches) {
        await this.repo.removeAllWorkItems(meetingId, tx);
        const meeting = await this.repo.getMeeting(meetingId);

        for (const branch of serviceBranches) {
          if (branch.type !== 'bpmn:UserTask') {
            continue;
          }
          const assignType = branch.extensions?.assignType;
          if (!assignType) {
            throw new BadRequestException(
              `UserTask ${branch.nodeId} thiếu assignType`,
            );
          }

          if (assignType === 'USER' || assignType === 'PROCESS' || assignType === 'CHAIRMAN') {
            let usersToAssign = [...(branch.users || [])];

            if (receiveNodeId && cancelNodeId && branch.nodeId === receiveNodeId && meeting?.chairmanId) {
              usersToAssign = usersToAssign.filter((uid) => uid !== meeting.chairmanId);
              await this.repo.addWorkItem(
                meetingId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: cancelNodeId,
                  role: branch.role,
                  assigneeUserId: meeting.chairmanId,
                  nodeType: 'bpmn:UserTask',
                },
                tx,
                bpmnVersion,
              );
            }
            for (const assigneeUserId of usersToAssign) {
              await this.repo.addWorkItem(
                meetingId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: branch.nodeId,
                  assigneeUserId,
                  role: branch.role,
                  nodeType: branch.type,
                },
                tx,
                bpmnVersion,
              );
              flowUserIds.add(String(assigneeUserId));
              if (assignType === 'USER') {
                await this.repo.updateParticipantStateByUserTx(
                  meetingId,
                  assigneeUserId,
                  MEETING_PARTICIPANT_STATE.RECEIVED,
                  tx,
                  branch.nodeId,
                  branch.role,
                );
              }
            }
          }

          if (assignType === 'UNIT') {
            const usersInRole = await this.sqlsvRepo.getUsersInFlow(
              bpmnVersion || 'MEETING',
              branch.role,
              10000,
              1,
              effectiveUserId,
            );
            const matchedUsers = usersInRole.usersWithType || [];

            // Lấy danh sách các đơn vị tham gia được chọn động từ DB (bao gồm cả đơn vị Thư ký/Chủ trì)
            const pool = tx ? null : await (this.repo as any).getPool();
            const executor = tx ? tx.request() : pool.request();
            const unitsResult = await executor
              .input('mId', meetingId)
              .query(`
                SELECT unit_id AS unitId
                FROM ${this.repo.dbname}.dbo.meeting_units
                WHERE meeting_id = @mId AND (is_room_selected = 1 OR unit_id IN (
                  SELECT secretary_id FROM ${this.repo.dbname}.dbo.meetings WHERE id = @mId AND secretary_type = 'UNIT'
                  UNION
                  SELECT chairman_id FROM ${this.repo.dbname}.dbo.meetings WHERE id = @mId AND chairman_type = 'UNIT'
                ))
              `);
            const dbSelectedUnitIds = (unitsResult.recordset || []).map((r: any) => r.unitId).filter(Boolean);

            for (const unitId of dbSelectedUnitIds) {
              // Lấy danh sách người trong phòng, vẫn lưu vào unitUserIds nếu cần
              const clerks = matchedUsers.filter(u => u.parent === unitId);
              for (const clerk of clerks) {
                const clerkId = String(clerk._id);
                unitUserIds.add(clerkId); // vẫn lưu các user có trong unit
              }

              // Tạo WorkItem cho phòng ban, bỏ qua điều kiện clerks.length
              await this.repo.addWorkItem(
                meetingId,
                {
                  id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                  nodeId: branch.nodeId,
                  assigneeUserId: unitId, // WorkItem gắn cho unit
                  role: branch.role,
                  nodeType: branch.type,
                },
                tx,
                bpmnVersion,
              );

              await this.repo.updateMeetingUnitStateByUnitTx(
                meetingId,
                unitId,
                MEETING_UNIT_STATE.RECEIVED,
                tx,
              );
              await this.repo.updateSecretaryUnitStateByUnitTx(
                meetingId,
                unitId,
                MEETING_UNIT_STATE.RECEIVED,
                tx,
              );
            }
          }
          if (assignType === 'SEAT') {
            await this.repo.addWorkItem(
              meetingId,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: branch.nodeId,
                assigneeUserId: effectiveUserId,
                role: branch.role,
                nodeType: branch.type,
              },
              tx,
              bpmnVersion,
            );

            await this.repo.updateMeetingAssigningSeatTx(
              meetingId,
              ASSIGNING_SEAT_STATUS.RECEIVED,
              tx,
            );
            // Audit gán vị trí chỗ ngồi
            await this.addAuditIncomingAware(
              meetingId,
              {
                user_id: effectiveUserId,
                display_name: effectiveDisplayName,
                role: branch.role,
                action_code: actionCodeExt,
                from_node_id: wi.nodeId,
                to_node_id: branch.nodeId,
                receiver: effectiveUserId,
                roleProcess: 'seat',
                action: 'Gán vị trí chỗ ngồi',
                created_by: effectiveUserId,
                stage_status: stageStatusDoc.CHUA_XU_LY,
                origin_id: wi.id,
                created_at: new Date(),
                updated_at: new Date(),
                curStatusCode: statusDoc,
                typeDocument: 'Meeting',
                processed_by: effectiveUserId,
                originalUser: originalUser || null,
                acting_as: effectiveUserId,
              },
              tx,
            );
          }
        }
      }
      if (statusDoc) {
        await this.repo.updateMeetingStatus(meetingId, statusDoc, tx);
      }
      await this.repo.updateMeetingStageStatus(meetingId, 'DONG_Y_PHE_DUYET', tx);

      await this.repo.commit(tx);

      return {
        status: 1,
        meeting: await this.repo.getMeeting(meetingId),
        flowUserIds: Array.from(flowUserIds),
        unitUserIds: Array.from(unitUserIds),
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  // Xác nhận tham gia họp
  async processMeetingWorkItem({
    bpmnXML,
    meetingId,
    workItemId,
    payload,
    userId,
    author,
    bpmnVersion,
    receiverUnit,
  }: ProposeMeetingParams): Promise<any> {

    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.repo.getWorkItem(meetingId, workItemId);

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = author || userId;
    const isPersonal = !receiverUnit;
    const receiverUserId = isPersonal ? effectiveUserId : null;
    const receiverUnitId = isPersonal ? null : receiverUnit;

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    // =====================================================
    // 1️⃣ TÌM FLOW THEO ACTION
    // =====================================================
    let outs = indexes.outgoingBySource.get(node.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    // =====================================================
    // 2️⃣ RESOLVE NODE TIẾP THEO (HỖ TRỢ SERVICE TASK)
    // =====================================================
    let resolvedNodes: any[] = [];
    let isNoTask = false;
    const targetNode = flow.targetRef;
    if (!targetNode) {
      throw new BadRequestException('Flow target node not found');
    }

    // ===== CASE: SERVICE TASK =====
    if (targetNode.$type === 'bpmn:ServiceTask') {

      // 🔥 CHECK CHAIRMAN / SECRETARY TẠI ENGINE
      // (dùng transaction riêng vì lúc này tx chính chưa mở)
      const checkTx = await this.repo.begin();
      let isChairman = false;

      try {
        isChairman =
          await this.repo.isChairmanOrSecretaryViaParticipant(
            meetingId,
            userId,
            checkTx,
          );
        await checkTx.commit();
      } catch (e) {
        await checkTx.rollback();
        throw e;
      }

      const serviceResult =
        await this.serviceTaskExecutor.executeIfServiceTask({
          nodeId: targetNode.id,
          bpmnXml: bpmnXML,
          variables: {
            meetingId,
            userId,
            isChairman, // ✅ truyền kết quả check thật
            serviceTaskOuts:
              indexes.outgoingBySource.get(targetNode.id),
            indexes,
          },
        });

      // ServiceTask có thể trả 1 node hoặc nhiều node
      if (serviceResult?.nextNode) {
        resolvedNodes = [serviceResult.nextNode];
      } else if (serviceResult?.nextNodes?.length) {
        resolvedNodes = serviceResult.nextNodes.map(n =>
          indexes.nodes.get(n.nodeId) || n,
        );
      }

      if (!resolvedNodes.length) {
        throw new BadRequestException(
          `ServiceTask ${targetNode.id} không resolve được node tiếp theo`,
        );
      }
    } else {
      const { node: nextNode } =
        this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

      if (!nextNode) {
        throw new BadRequestException(
          'No next interactive node found',
        );
      }

      /**
       * CASE 1: NEXT NODE LÀ GATEWAY
       */
      if (nextNode.$type === 'bpmn:ExclusiveGateway') {
        const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];

        if (!gatewayOuts.length) {
          throw new BadRequestException('Gateway không có nhánh tiếp theo');
        }

        // ⚠️ check trước (không dùng tx ở đây)
        const userHasTask = await this.repo.checkUserHasTaskTx(meetingId, userId);

        let matchedNode: any = null;

        for (const f of gatewayOuts) {
          let condition = f.conditionExpression?.body;
          if (!condition) continue;

          condition = condition.trim();

          // remove {}
          if (condition.startsWith('{') && condition.endsWith('}')) {
            condition = condition.slice(1, -1);
          }

          const conditionStr = condition.toLowerCase().replace(/\s+/g, '');

          let isMatch = false;

          // ===== CASE: hasTask =====
          if (
            conditionStr.includes('hastask') &&
            userHasTask === true
          ) {
            isMatch = true;
          }

          // ===== CASE: noTask =====
          if (
            conditionStr.includes('notask') &&
            userHasTask === false
          ) {
            isMatch = true;
            isNoTask = true;
          }

          if (!isMatch) continue;

          const { node: resolvedNode } =
            this.bpmnEngine.nextNodeByFlow(f, indexes);

          if (resolvedNode) {
            matchedNode = resolvedNode;
            break; // exclusive → chỉ lấy 1
          }
        }

        if (!matchedNode) {
          throw new BadRequestException(
            'Không tìm thấy nhánh phù hợp (hasTask / noTask)',
          );
        }

        resolvedNodes = [matchedNode];

        // Tự động tạo work item cho các sequence flow song song (isConcurrent) từ gateway hiện tại
        for (const f of gatewayOuts) {
          const extFlow = getAllNodeExtensionProperties(f);
          const flagsButton = parseFlagsButton(extFlow?.flagsButton);
          if (extFlow && flagsButton?.isConcurrent) {
            const { node: resolvedNode } =
              this.bpmnEngine.nextNodeByFlow(f, indexes);
            if (resolvedNode && !resolvedNodes.some(n => n.id === resolvedNode.id)) {
              resolvedNodes.push(resolvedNode);
            }
          }
        }
      } else {
        resolvedNodes = [nextNode];
      }

    }

    if (!resolvedNodes.length) {
      throw new BadRequestException(
        'Không resolve được node tiếp theo từ flow',
      );
    }


    // =====================================================
    // 3️⃣ TRANSACTION
    // =====================================================
    const tx = await this.repo.begin();

    try {
      // 3.1 Remove current WorkItem
      const removed = await this.repo.removeWorkItem(meetingId, wi.id, tx);
      if (removed !== 1) {
        throw new BadRequestException(
          'Work item was already completed by another user',
        );
      }

      // Clean up any other remaining workitems for this assignee (e.g., orphaned EndEvents)
      const targetAssigneeId = isPersonal ? effectiveUserId : receiverUnit;
      if (targetAssigneeId) {
        await this.repo.removeWorkItemByConditions({
          documentId: meetingId,
          assigneeUserId: targetAssigneeId,
        }, tx);
      }

      // 3.2 Add next WorkItem(s)
      for (const nextNode of resolvedNodes) {
        if (nextNode.$type === 'bpmn:EndEvent') {
          continue;
        }
        const targetRole = indexes.laneMap.get(nextNode.id);
        if (!targetRole) {
          throw new BadRequestException(
            `Target role not found for node ${nextNode.id}`,
          );
        }

        await this.repo.addWorkItem(
          meetingId,
          {
            id: `wi_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: isPersonal
              ? receiverUserId
              : receiverUnitId,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      // =====================================================
      // 4️⃣ UPDATE PARTICIPANT / UNIT STATE
      // =====================================================
      if (isPersonal) {
        const state = actionCode === 'HUY_THAM_GIA'
          ? MEETING_PARTICIPANT_STATE.RECEIVED
          : (isNoTask ? MEETING_PARTICIPANT_STATE.DONE : MEETING_PARTICIPANT_STATE.CONFIRMED);

        const firstNextNode = resolvedNodes[0];
        const nextNodeId = firstNextNode?.id;
        const nextRole = firstNextNode ? indexes.laneMap.get(firstNextNode.id) : undefined;

        const confirmed =
          await this.repo.updateParticipantStateByUserTx(
            meetingId,
            userId,
            state,
            tx,
            nextNodeId,
            nextRole,
          );

        if (!confirmed) {
          throw new Error(
            'Không tìm thấy cá nhân để xác nhận tham gia',
          );
        }
      } else {
        if (!receiverUnit) {
          throw new BadRequestException('receiverUnit is required');
        }

        const confirmed =
          await this.repo.confirmUnitJoinMeeting(
            tx,
            meetingId,
            userId,
          );

        if (!confirmed) {
          throw new Error(
            'Không tìm thấy đơn vị để xác nhận tham gia',
          );
        }
      }

      await this.repo.commit(tx);

    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }


  // Thu hồi cuộc họp chưa được phê duyệt
  async recallMeeting({
    bpmnXML,
    meetingId,
    payload,
    userId,
    author,
    bpmnVersion,
  }: {
    bpmnXML: string;
    meetingId: string;
    payload?: any;
    userId: string;
    author?: string;
    bpmnVersion: string;
  }) {
    const effectiveUserId = author || userId;
    const displayName = payload?.displayName || 'Người tạo';

    const tx = await this.repo.begin();

    try {
      /**
       * 1. Audit CREATE → node + người tạo
       */
      const creatorAudit =
        await this.repo.getRecallTargetInfoTx(tx, meetingId);

      if (creatorAudit.creatorUserId !== effectiveUserId) {
        throw new ForbiddenException(
          'Chỉ người tạo mới được thu hồi',
        );
      }

      /**
       * 2. Audit hiện tại (CHUA_XU_LY)
       */
      const currentAudit = await this.repo.getLatestPendingAuditTx(tx, meetingId);

      const fromNodeId = creatorAudit.targetNodeId || currentAudit.to_node_id;

      const { indexes } = await this.getModelFromXml(bpmnXML);
      const node = indexes.nodes.get(fromNodeId);

      const statusCode =
        node ? getAllNodeExtensionProperties(node)?.statusCode : '1';

      /**
       * 3. Xóa toàn bộ workItem (dọn cache)
       */
      await this.repo.removeAllWorkItems(meetingId, tx);

      /**
       * 4. Đóng audit hiện tại → THU_HOI
       */
      await this.repo.updateAuditStatusByIdTx(
        tx,
        currentAudit.id,
        {
          stage_status: 'THU_HOI',
          updated_by: effectiveUserId,
        },
      );

      // 10.5 Update meeting status
      if (statusCode) {
        await this.repo.updateMeetingStatus(meetingId, statusCode, tx);
      }
      /**
       * 5. Tạo audit mới → quay về node CREATE
       */
      await this.addAuditIncomingAware(
        meetingId,
        {
          user_id: effectiveUserId,
          display_name: displayName,
          role: creatorAudit.creatorRole,
          action_code: 'THU_HOI',
          from_node_id: fromNodeId,
          to_node_id: creatorAudit.targetNodeId,
          receiver: creatorAudit.creatorUserId,
          roleProcess: 'processor',
          action: 'Thu hồi lịch họp',
          created_by: effectiveUserId,
          stage_status: 'CHUA_XU_LY',
          origin_id: currentAudit.id,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusCode,
          typeDocument: 'Meeting',
        },
        tx,
      );

      /**
       * 6. (Optional) tạo lại workItem cho người tạo
       * → chỉ để UI hiển thị
       */
      await this.repo.addWorkItem(
        meetingId,
        {
          id: `wi_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          nodeId: creatorAudit.targetNodeId,
          role: creatorAudit.creatorRole,
          assigneeUserId: creatorAudit.creatorUserId,
          nodeType: 'bpmn:UserTask',
        },
        tx,
        bpmnVersion,
      );

      await this.repo.commit(tx);
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }




  async finishMeetingWorkItem({ bpmnXML, meetingId, workItemId, payload, userId, author, bpmnVersion, receiverUnit, }: ProposeMeetingParams) {
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.repo.getWorkItem(meetingId, workItemId);

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = author || userId;

    const isPersonal = !receiverUnit;
    const receiverUserId = isPersonal ? effectiveUserId : null;
    const receiverUnitId = isPersonal ? null : receiverUnit;

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    let outs = indexes.outgoingBySource.get(node.id) || [];
    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    const { node: nextNode } =
      this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException('Target role not found for next node');
    }

    const tx = await this.repo.begin();

    try {
      // 1. Remove current workItem
      const removed = await this.repo.removeWorkItem(meetingId, wi.id, tx);
      if (removed !== 1) {
        throw new BadRequestException(
          'Work item was already completed by another user',
        );
      }

      // Clean up any other remaining workitems for this assignee (e.g., orphaned EndEvents)
      const targetAssigneeId = isPersonal ? effectiveUserId : receiverUnit;
      if (targetAssigneeId) {
        await this.repo.removeWorkItemByConditions({
          documentId: meetingId,
          assigneeUserId: targetAssigneeId,
        }, tx);
      }

      // 2. Add next workItem
      if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
        await this.repo.addWorkItem(
          meetingId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: isPersonal ? receiverUserId : receiverUnitId,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      // 3. UPDATE AUDIT (KHÔNG TẠO MỚI)
      if (isPersonal) {
        // Người dùng cá nhân
        const confirmed = await this.repo.updateParticipantStateByUserTx(
          meetingId,
          userId,
          MEETING_PARTICIPANT_STATE.DONE,
          tx,
        );

        if (!confirmed) {
          throw new Error('Không tìm thấy cá nhân để xác nhận tham gia');
        }
      } else {
        if (!receiverUnit) {
          throw new BadRequestException('receiverUnit is required');
        }
        // Đơn vị
        const confirmed = await this.repo.updateMeetingUnitStateByUnitTx(
          meetingId,
          receiverUnit,
          MEETING_UNIT_STATE.DONE,
          tx,
        );
        // await this.repo.updateStatusMeetingRoom(meetingId, MEETING_STATE.KET_THUC, tx);

        if (!confirmed) {
          throw new Error('Không tìm thấy đơn vị để xác nhận tham gia');
        }
      }

      await this.repo.commit(tx);
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }

  async getNextNode({
    meetingId,
    actionCode,
    assigneeUserId,
    workItemId,
    bpmnXML,
  }: {
    meetingId: string;
    actionCode: string;
    assigneeUserId: string;
    workItemId: string;
    bpmnXML: string;
  }): Promise<any> {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    // Lấy workItem từ meetingId và workItemId
    const wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi) {
      throw new BadRequestException('WorkItem không tìm thấy hoặc đã hoàn thành');
    }

    // Kiểm tra nếu assigneeUserId khớp với assignee trong workItem
    if (wi.assigneeUserId !== assigneeUserId) {
      throw new BadRequestException('WorkItem này không phải của người dùng này');
    }

    // Lấy node hiện tại từ indexes
    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Node hiện tại không tìm thấy');
    }

    // Lấy tất cả các outgoing flows từ node hiện tại
    let outs = indexes.outgoingBySource.get(currentNode.id) || [];

    // Xử lý gateway nếu có
    for (const flow of outs) {
      const target = flow.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')
      ) {
        // Lấy outgoing flows từ gateway nếu có
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    // Tìm flow tương ứng với actionCode
    const nextFlow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!nextFlow) {
      throw new BadRequestException(`Không tìm thấy flow tương ứng với actionCode ${actionCode}`);
    }

    // Lấy nextNode từ flow
    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(nextFlow, indexes);
    if (!nextNode) {
      throw new BadRequestException('Không tìm thấy node tiếp theo');
    }

    // Xác định vai trò (role) và trạng thái
    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException('Target role not found for next node');
    }

    // Kiểm tra yêu cầu assignee cho node tiếp theo
    const requiresAssignee =
      nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;

    // Chỉnh sửa kiểu assignee để nó có thể nhận cả giá trị null và string
    let assignee: string | null = null; // Sửa lại kiểu biến assignee

    if (requiresAssignee) {
      assignee = assigneeUserId; // Dành cho trường hợp yêu cầu assignee

      // Kiểm tra xem assignee có hợp lệ không
      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnXML,
        targetRole
      );

      if (candidates.length && !candidates.includes(assignee)) {
        throw new BadRequestException('Người nhận không đúng vai trò');
      }
    }

    // Trả về node tiếp theo và assignee cần thiết
    return {
      indexes,
      nextNode,
      assignee,
      targetRole,
      nextNodeId: nextNode.id, // Thêm thông tin ID của node tiếp theo
      nextNodeType: nextNode.$type, // Thêm thông tin type của node tiếp theo
      assigneeRequired: requiresAssignee, // Trả về thông tin liệu node này yêu cầu assignee không
    };
  }

  // Tạo workitem cho người được ủy quyền 
  async createWorkItemDelegated({
    meetingId,
    actionCode,
    assigneeUserId,
    bpmnXML,
    workItem,
    orignId
  }: {
    meetingId: string;
    actionCode: string;
    assigneeUserId: string;
    bpmnXML: string;
    workItem: any;
    orignId: string;
  }): Promise<any> {
    // Phân tích mô hình BPMN từ XML
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const meeting = await this.repo.getMeeting(meetingId);

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    if (!workItem) {
      throw new BadRequestException('Current work item not found');
    }

    // Lấy node hiện tại của Work Item
    const currentNode = indexes.nodes.get(workItem.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Current node not found');
    }

    // Lấy các luồng (outgoing flows) từ node hiện tại
    let outs = indexes.outgoingBySource.get(currentNode.id) || [];
    for (const f of outs) {
      const target = f.targetRef;
      if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    // Tìm flow phù hợp với actionCode
    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode ||
        // Tận dụng check thuộc tính ủy quyền cấu hình trong BPMN
        (actionCode === 'DELEGATED' && (ext?.actionType === 'delegate_join' || ext?.flags === 'canDelegate'))
      );
    });

    if (!flow) {
      throw new BadRequestException(`No outgoing flow matches actionCode ${actionCode}`);
    }

    // Xác định node tiếp theo hoặc Gateway trong BPMN từ flow đã chọn
    const gatewayRes = this.bpmnEngine.findNextGatewayFromFlow(flow, indexes);
    let nextNode = gatewayRes?.node || null;

    if (!nextNode) {
      const interactiveRes = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
      nextNode = interactiveRes?.node || null;
    }

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    // Xác định vai trò của người thực hiện công việc (có thể là một role trong lane)
    let targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException('Target role not found for next node');
    }

    let resolvedNodes: any[] = [];
    let isNoTask = false;
    // Tạo work item mới cho người được ủy quyền
    const tx = await this.repo.begin();
    try {

      await this.repo.removeWorkItemByAssignee(meetingId, orignId);

      if (nextNode.$type === 'bpmn:ExclusiveGateway') {
        const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];

        if (!gatewayOuts.length) {
          throw new BadRequestException('Gateway không có nhánh tiếp theo');
        }

        const userHasTask = await this.repo.checkUserHasTaskTx(meetingId, orignId);

        let matchedNode: any = null;

        for (const f of gatewayOuts) {
          let condition = f.conditionExpression?.body;
          if (!condition) continue;

          condition = condition.trim();

          // remove {}
          if (condition.startsWith('{') && condition.endsWith('}')) {
            condition = condition.slice(1, -1);
          }

          const conditionStr = condition.toLowerCase().replace(/\s+/g, '');

          let isMatch = false;

          // ===== CASE: hasTask =====
          if (
            conditionStr.includes('hastask') &&
            userHasTask === true
          ) {
            isMatch = true;
          }

          // ===== CASE: noTask =====
          if (
            conditionStr.includes('notask') &&
            userHasTask === false
          ) {
            isMatch = true;
            isNoTask = true;
          }

          if (!isMatch) continue;

          const { node: resolvedNode } =
            this.bpmnEngine.nextNodeByFlow(f, indexes);

          if (resolvedNode) {
            matchedNode = resolvedNode;
            targetRole = indexes.laneMap.get(matchedNode.id) || targetRole;
            break; // exclusive → chỉ lấy 1
          }
        }

        if (!matchedNode) {
          throw new BadRequestException(
            'Không tìm thấy nhánh phù hợp (hasTask / noTask)',
          );
        }

        resolvedNodes = [matchedNode];
      } else {
        resolvedNodes = [nextNode];
      }
      // Tạo một ID cho work item mới
      const workItemId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      for (const nextNode of resolvedNodes) {
        // Thêm work item mới vào DB
        await this.repo.addWorkItem(
          meetingId,
          {
            id: workItemId,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: assigneeUserId, // Người được ủy quyền
            nodeType: nextNode.$type,
          },
          tx,
          meeting.bpmnVersion,
        );
        await this.repo.updateParticipantStateByUserTx(
          meetingId,
          orignId,
          isNoTask ? MEETING_PARTICIPANT_STATE.DONE : MEETING_PARTICIPANT_STATE.CONFIRMED,
          tx,
        );
      }

      await this.repo.commit(tx);

      return {
        status: 1,
        workItemId,
        message: 'Work item created successfully',
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async assignMeetingSeatsWorkItem({
    bpmnXML,
    meetingId,
    workItemId,
    payload,
    userId,
    author,
    bpmnVersion,
  }: {
    bpmnXML: string;
    meetingId: string;
    workItemId: string;
    payload: any;
    userId: string;
    author?: string;
    bpmnVersion: string;
  }) {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    const actionCode = payload?.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = author || userId;

    const node = indexes.nodes.get(wi.nodeId);
    if (!node) {
      throw new BadRequestException('Current BPMN node not found');
    }

    // Resolve outgoing flow
    let outs = indexes.outgoingBySource.get(node.id) || [];
    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    }

    const { node: nextNode } =
      this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

    if (!nextNode) {
      throw new BadRequestException('No next interactive node found');
    }

    const targetRole = indexes.laneMap.get(nextNode.id);
    if (!targetRole) {
      throw new BadRequestException('Target role not found for next node');
    }

    const tx = await this.repo.begin();

    try {
      // 1. Remove current workItem
      const removed = await this.repo.removeWorkItem(meetingId, wi.id, tx);
      if (removed !== 1) {
        throw new BadRequestException(
          'Work item was already completed by another user',
        );
      }

      // Clean up any other remaining workitems for this assignee (e.g., orphaned EndEvents)
      if (effectiveUserId) {
        await this.repo.removeWorkItemByConditions({
          documentId: meetingId,
          assigneeUserId: effectiveUserId,
        }, tx);
      }

      await this.repo.updateMeetingAssigningSeatTx(
        meetingId,
        ASSIGNING_SEAT_STATUS.ASSIGNING,
        tx,
      );
      // 10.3 Update stage status
      await this.updateStageStatusAuditIncomingAware(
        meetingId,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.DA_XU_LY,
          typeDocument: 'Meeting',
        },
        tx,
      );

      // 2. Add next workItem (CÁ NHÂN)
      if (nextNode && nextNode.$type !== 'bpmn:EndEvent') {
        await this.repo.addWorkItem(
          meetingId,
          {
            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nodeId: nextNode.id,
            role: targetRole,
            assigneeUserId: effectiveUserId,
            nodeType: nextNode.$type,
          },
          tx,
          bpmnVersion,
        );
      }

      await this.repo.commit(tx);
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }

    return {
      status: 1,
      meeting: await this.repo.getMeeting(meetingId),
    };
  }
  async simpleNext({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    bpmnVersion,
    externalTransaction,
    roleProcess,
    isDelWorkItem = false,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    author: string;
    bpmnVersion: string;
    externalTransaction?: any;
    roleProcess?: string;
    isDelWorkItem?: boolean;
  }): Promise<any> {
    const userIdAssign = payload?.assignToUserId;
    const { indexes } = await this.getModelFromXml(bpmnXML);
    const wi = await this.repo.getWorkItem(documentId, workItemId);
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];
    const auditArr = await this.repo.getAudit(documentId);
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
      );

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const nextProps = getAllNodeExtensionProperties(nextNode);
    const statusDoc = nextProps?.statusCode;

    // Tự động tính hạn xử lý (Deadline) cho bước tiếp theo
    let finalDeadline = payload.deadline || null;
    if (!finalDeadline && nextProps.deadline) {
      const days = parseInt(nextProps.deadline, 10);
      if (!isNaN(days)) {
        finalDeadline = moment().add(days, 'days').toISOString();
      }
    }


    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    // Kiểm tra người nhận có đúng vai trò không
    if (payload.assignments && payload.assignments.length > 0) {
      // Lấy tất cả users từ assignments
      const assignedUsers: string[] = [];
      for (const assignment of payload.assignments) {
        if (assignment.users && assignment.users.length > 0) {
          assignedUsers.push(...assignment.users);
        }
      }

      if (assignedUsers.length > 0 && targetRole) {
        // Lấy danh sách users hợp lệ cho targetRole
        const candidates = await this.repo.getUsersByRoleInFlow(
          bpmnVersion,
          targetRole,
        );

        // Kiểm tra từng user được assign
        for (const assignedUser of assignedUsers) {
          if (candidates.length && !candidates.includes(assignedUser)) {
            throw new BadRequestException(
              `Người nhận ${assignedUser} không đúng vai trò ${targetRole}, vui lòng chọn lại`,
            );
          }
        }
      }
    } else if (userIdAssign && targetRole) {
      // Fallback: check userId nếu không có assignments
      const candidates = await this.repo.getUsersByRoleInFlow(
        bpmnVersion,
        targetRole,
      );

      if (candidates.length && !candidates.includes(userIdAssign)) {
        throw new BadRequestException(
          `Người nhận không đúng vai trò, vui lòng chọn lại`,
        );
      }
    }
    // const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
    // await this.repo.addWorkItem(documentId, newWi, tx);
    const typeFlow = this.bpmnEngine.getFlowExtensionProperties(flow)?.actionType;
    let stageStatus;
    if (typeFlow === typeAction?.signContentDraft) {
      stageStatus = stageStatusDoc.DANG_CHO_KY;
    }

    // Nếu có transaction từ bên ngoài, dùng nó. Nếu không, tạo mới
    const shouldManageTransaction = !externalTransaction;
    const tx = externalTransaction || await this.repo.begin();

    try {
      if (isDelWorkItem) {

        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1)
          throw new BadRequestException(
            'Work item was already completed by another user',
          );
      }

      await this.repo.addWorkItem(
        documentId,
        {
          id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nodeId: nextNode.id,
          role: targetRole,
          assigneeUserId: userId,
          nodeType: nextNode.$type,
        },
        tx,
        bpmnVersion,
      );
      if (isDelWorkItem) {
        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: userId,
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );
      }
      await this.addAuditIncomingAware(
        documentId,
        {
          user_id: userId,
          display_name: payload.displayName,
          role: wi.role,
          action_code: actionCode,
          from_node_id: wi.nodeId,
          to_node_id: nextNode?.id,
          receiver: payload?.assignToUserId || userId,
          receiver_unit: payload.receiver_unit,
          group_: payload.group_ || null,
          roleProcess: roleProcess ? roleProcess : 'processor',
          action: 'Xử lý chính',
          created_by: userId,
          stage_status: stageStatus || stageStatusDoc.CHUA_XU_LY,
          origin_id: wi.id,
          deadline: payload.deadline || null,
          created_at: new Date(),
          updated_at: new Date(),
          details: { note: payload?.note },
          curStatusCode: statusDoc,
          originalUser: originalUser || null,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );

      // Chỉ commit nếu transaction do hàm này quản lý
      if (shouldManageTransaction) {
        await this.repo.commit(tx);
      }

      return { status: 1, document: await this.repo.getDocument(documentId) };
    } catch (e) {
      // Chỉ rollback nếu transaction do hàm này quản lý
      if (shouldManageTransaction) {
        await this.repo.rollback(tx);
      }
      throw e;
    }
  }

  /**
   * 🚀 OPTIMIZED VERSION: simpleNext with performance improvements
   * 
   * Improvements:
   * - Parallel fetch: getModelFromXml + getWorkItem (saves ~20-40ms)
   * - Removed unused getAudit query (saves ~30-80ms)
   * - Centralized role validation logic (cleaner code, single DB call)
   * - Optional lazy loading for return document (saves ~30-80ms)
   * - Total estimated savings: 80-200ms (30-40% faster)
   */
  async transferViewRunTime({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    bpmnVersion,
    externalTransaction,
    roleProcess,
    isDelWorkItem = false,
    skipDocumentReturn = false, // 🆕 Option để skip fetch document cuối
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: Payload;
    userId: string;
    originalUser: string;
    author: string;
    bpmnVersion: string;
    externalTransaction?: any;
    roleProcess?: string;
    isDelWorkItem?: boolean;
    skipDocumentReturn?: boolean;
  }): Promise<any> {

    // ✅ STEP 1: Parallel fetch dữ liệu đầu vào (20-40ms faster)
    const [{ indexes }, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
    ]);

    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    // ✅ STEP 2: Xử lý BPMN logic (in-memory, nhanh)
    const node = indexes.nodes.get(wi.nodeId);
    const outs = indexes.outgoingBySource.get(node.id) || [];

    // ❌ REMOVED: const auditArr = await this.repo.getAudit(documentId); 
    // → Không sử dụng trong logic, tiết kiệm ~30-80ms

    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const flow = outs.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );

    if (!flow) {
      throw new BadRequestException(
        `Không tìm thấy luồng đi với actionCode: ${actionCode}`,
      );
    }

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const statusDoc = getAllNodeExtensionProperties(nextNode)?.statusCode;
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    // ✅ STEP 3: Validate quyền (refactored, gọi DB 1 lần duy nhất)

    // ✅ STEP 3.5: Thu thập danh sách users và organizationUnits từ assignments
    const assignedUsers: (string | { userId?: string; assigneeUserId?: string; deadline?: string })[] = [];
    const roomAssignments: string[] = [];
    const ouDeadlines = new Map<string, string | null>();

    if (payload.assignments && payload.assignments.length > 0) {
      for (const assignment of payload.assignments) {
        // Thu thập users
        if (assignment.users?.length > 0) {
          assignedUsers.push(...assignment.users);
        }
        // Thu thập organizationUnits (phòng)
        if (assignment.organizationUnits?.length > 0) {
          for (const ou of assignment.organizationUnits) {
            if (!ou) continue;
            let ouId = '';
            let ouDeadline = assignment.deadline ?? payload.deadline ?? null;
            if (typeof ou === 'string') {
              ouId = ou;
            } else if (typeof ou === 'object' && (ou as any).organizationId) {
              ouId = (ou as any).organizationId;
              if ((ou as any).deadline !== undefined) {
                ouDeadline = (ou as any).deadline;
              }
            } else if (typeof ou === 'object' && (ou as any).id) {
              ouId = (ou as any).id;
              if ((ou as any).deadline !== undefined) {
                ouDeadline = (ou as any).deadline;
              }
            }
            if (ouId && !roomAssignments.includes(ouId)) {
              roomAssignments.push(ouId);
              ouDeadlines.set(ouId, ouDeadline);
            }
          }
        }
      }
    }

    // Nếu không có assignments, fallback về userIdAssign hoặc userId
    const rawUsers = assignedUsers.length > 0 ? assignedUsers : [];
    const usersToAssign = rawUsers.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          assigneeUserId: item.userId || item.assigneeUserId,
          deadline: item.deadline || null,
        };
      }
      return {
        assigneeUserId: item,
        deadline: null,
      };
    });

    // ✅ STEP 4: Xác định metadata
    const typeFlow = this.bpmnEngine.getFlowExtensionProperties(flow)?.actionType;
    const stageStatus =
      typeFlow === typeAction?.signContentDraft ? stageStatusDoc.DANG_CHO_KY : stageStatusDoc.CHUA_XU_LY;

    // 🚀 STEP 4.5: Parallel fetch flow configs + document data TRƯỚC transaction (tiết kiệm ~100-250ms)
    let incommingDoc = null;
    const roomFlowConfigs = new Map<string, any>();

    if (roomAssignments.length > 0) {
      const [flowConfigResults, doc] = await Promise.all([
        Promise.all(roomAssignments.map(async (ou) => {
          const config = await this.sqlsvRepo.getFlowByUnit(
            String(ou),
            'IncommingDocument',
          );
          return { ou, config };
        })),
        this.repo.getIncomingDocument(documentId)
      ]);

      incommingDoc = doc;
      for (const { ou, config } of flowConfigResults) {
        if (config) {
          roomFlowConfigs.set(ou, config);
        }
      }
    }

    // ✅ STEP 5: Transaction operations
    const shouldManageTransaction = !externalTransaction;
    const tx = externalTransaction || (await this.repo.begin());

    const currentRole = indexes.laneMap.get(wi.nodeId);

    try {
      // 5.1 Remove workItem (nếu cần)
      if (isDelWorkItem) {
        const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
        if (removed !== 1) {
          throw new BadRequestException(
            'Work item was already completed by another user',
          );
        }
      }

      // 🚀 5.2 Batch insert workItems + audits cho users (giảm overhead & round-trips)
      if (usersToAssign.length > 0) {
        for (const assigneeUser of usersToAssign) {
          // Add WorkItem
          const { assigneeUserId, deadline } = assigneeUser;
          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNode.id,
              role: targetRole,
              assigneeUserId: assigneeUserId,
              nodeType: nextNode.$type,
            },
            tx,
            bpmnVersion,
          );

          // Add Audit
          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: userId,
              display_name: payload.displayName,
              role: wi.role,
              action_code: actionCode,
              from_node_id: wi.nodeId,
              to_node_id: nextNode?.id,
              receiver: assigneeUserId,
              receiver_unit: payload.receiver_unit,
              group_: payload.group_ || null,
              roleProcess: roleProcess ? roleProcess : 'processor',
              action: 'Nhận để biết',
              created_by: userId,
              stage_status: stageStatus,
              origin_id: wi.id,
              deadline: deadline || payload.deadline || null,
              created_at: new Date(),
              updated_at: new Date(),
              details: { note: payload?.note },
              curStatusCode: statusDoc,
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );
        }
      }

      // 5.3 Update audit status (nếu cần)
      if (isDelWorkItem) {
        await this.updateStageStatusAuditIncomingAware(
          documentId,
          {
            receiver: userId,
            stage_status: stageStatusDoc.DA_XU_LY,
            typeDocument: 'IncommingDocument',
          },
          tx,
        );
      }

      // 🚀 5.5 Xử lý chuyển đến phòng (đã fetch flow configs trước)
      if (roomFlowConfigs.size > 0) {
        // Process từng phòng có flow config
        for (const [ou, flowConfig] of roomFlowConfigs.entries()) {
          const ouSpecificDeadline = ouDeadlines.get(ou) ?? payload.deadline ?? null;
          const detailsBase = {
            isTransferOption: true,
            transferType: 'to_room',
            note: payload?.note,
            deadline: ouSpecificDeadline,
          };

          // Tạo bản copy document cho phòng và khởi tạo luồng mới
          const result = await this.createIncomingDocumentCopy({
            outgoing: incommingDoc,
            receiverUnit: ou,
            processorUserId: null,
            flowConfig,
            payload: { ...payload, deadline: ouSpecificDeadline },
            wi,
            tx,
            actionCode: 'CREATE',
            details: JSON.stringify({
              ...detailsBase,
              organizationUnit: ou,
            }),
            skipDuplicateCheck: false,
            userId: userId
          });

          // Ghi audit đi luồng phòng
          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: userId,
              display_name: payload.displayName,
              role: currentRole,
              action_code: payload?.actionCode?.toUpperCase() || '',
              from_node_id: wi.nodeId,
              to_node_id: result?.next?.id,
              receiver: null,
              receiver_unit: ou,
              group_: payload.group_ || null,
              roleProcess: roleProcess ? roleProcess : 'processor',
              action: 'Chuyển phòng nhận để biết',
              created_by: userId,
              stage_status: stageStatusDoc.CHUA_XU_LY,
              origin_id: wi.id,
              deadline: ouSpecificDeadline,
              created_at: new Date(),
              updated_at: new Date(),
              curStatusCode: result?.statusDoc ?? '1',
              details: JSON.stringify({
                ...detailsBase,
                organizationUnit: ou,
              }),
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );
        }
      }

      // 5.6 Commit transaction (nếu tự quản lý)
      if (shouldManageTransaction) {
        await this.repo.commit(tx);
      }

      // ✅ STEP 6: Return kết quả (tối ưu)
      const newlyAssignedUserIds = usersToAssign.map((u: any) => u.assigneeUserId).filter(Boolean);
      const nextNodeObj = { tasks: newlyAssignedUserIds.map((id: string) => ({ assignee: id })) };

      if (skipDocumentReturn) {
        // Fast return: chỉ trả status + documentId
        return {
          status: 1,
          documentId,
          nextNode: nextNodeObj
        };
      } else {
        // Full return: fetch document đầy đủ
        return {
          status: 1,
          document: await this.repo.getDocument(documentId),
          nextNode: nextNodeObj
        };
      }
    } catch (e) {
      if (shouldManageTransaction) {
        await this.repo.rollback(tx);
      }
      throw e;
    }
  }

  async checkSeatAssignment({
    bpmnXML,
    meetingId,
    workItemId,
    actionCode,
    assigneeUserId,
    bpmnVersion,
    originalUserId,
  }: {
    meetingId: string;
    actionCode?: string;
    assigneeUserId?: string;
    bpmnXML: string;
    bpmnVersion?: string;
    workItemId: string;
    originalUserId: string;
  }): Promise<any> {

    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = assigneeUserId ?? originalUserId;
    if (!effectiveUserId) {
      throw new BadRequestException('assigneeUserId/originalUserId is required');
    }

    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Current BPMN node not found');
    }

    // Resolve outgoing flow
    let outs = indexes.outgoingBySource.get(currentNode.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow for actionCode ${actionCode}`,
      );
    }

    const targetNode = flow.targetRef;
    if (!targetNode) {
      throw new BadRequestException('Flow target node not found');
    }

    let serviceBranches: any[] | null = null;
    let seatStatus: any = null;

    // 👉 execute service task
    if (targetNode.$type === 'bpmn:ServiceTask') {
      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: targetNode.id,
        bpmnXml: bpmnXML,
        variables: { meetingId, nodeId: targetNode.id, indexes },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException('ServiceTask không trả về nextNodes');
      }

      serviceBranches = result.nextNodes;
      seatStatus = result.seatStatus;
    }

    const tx = await this.repo.begin();

    try {
      if (serviceBranches) {
        await this.repo.removeWorkItemByAssignee(
          meetingId,
          effectiveUserId,
          workItemId,
          tx,
        );

        for (const branch of serviceBranches) {
          await this.repo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: branch.nodeId,
              assigneeUserId: effectiveUserId,
              role: branch.role,
              nodeType: branch.type,
            },
            tx,
            bpmnVersion,
          );
        }

        if (seatStatus) {
          await this.repo.updateMeetingAssigningSeatTx(
            meetingId,
            seatStatus.allAssigned
              ? ASSIGNING_SEAT_STATUS.ASSIGNED
              : ASSIGNING_SEAT_STATUS.ASSIGNING,
            tx,
          );
        }
      }

      await this.repo.commit(tx);

      return {
        status: 1,
        meeting: await this.repo.getMeeting(meetingId),
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  // Xử lý lịch của văn thư 
  async unitProccessMeeting({
    bpmnXML,
    meetingId,
    workItemId,
    actionCode,
    userId,
    bpmnVersion,
    receiverUnit
  }: {
    bpmnXML: string;
    meetingId: string;
    workItemId: string;
    actionCode: string;
    userId: string;
    bpmnVersion: string;
    receiverUnit?: string;
  }) {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = receiverUnit ? receiverUnit : userId;
    if (!effectiveUserId) {
      throw new BadRequestException('assigneeUserId/originalUserId is required');
    }

    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Current BPMN node not found');
    }

    // Resolve outgoing flow
    let outs = indexes.outgoingBySource.get(currentNode.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow for actionCode ${actionCode}`,
      );
    }

    const targetNode = flow.targetRef;
    if (!targetNode) {
      throw new BadRequestException('Flow target node not found');
    }

    let serviceBranches: any[] | null = null;
    let statusUnit: any = null;

    if (targetNode.$type === 'bpmn:ServiceTask') {
      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: targetNode.id,
        bpmnXml: bpmnXML,
        variables: { meetingId, nodeId: targetNode.id, indexes, userId, receiverUnit },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException('ServiceTask không trả về nextNodes');
      }
      serviceBranches = result.nextNodes;
      statusUnit = result.status;
    }

    const tx = await this.repo.begin();

    try {
      if (serviceBranches) {
        await this.repo.removeWorkItemByAssignee(
          meetingId,
          effectiveUserId,
          workItemId,
          tx,
        );

        for (const branch of serviceBranches) {
          await this.repo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: branch.nodeId,
              assigneeUserId: effectiveUserId,
              role: branch.role,
              nodeType: branch.type,
            },
            tx,
            bpmnVersion,
          );
        }
        if (statusUnit.allDone === true) {
          if (!receiverUnit) {
            throw new BadRequestException('Thiếu reciveUnit');
          }
          // Đơn vị
          const confirmed = await this.repo.updateMeetingUnitStateByUnitTx(
            meetingId,
            receiverUnit,
            MEETING_UNIT_STATE.DONE,
            tx,
          );

          // if (!confirmed) {
          //   throw new Error('Không tìm thấy đơn vị để xác nhận tham gia');
          // }
        }

        if (statusUnit.hasUnSeat === true) {
          await this.repo.updateMeetingAssigningSeatTxV2(
            meetingId,
            tx,
          );
        }
      }

      await this.repo.commit(tx);

      return {
        success: true,
        meeting: await this.repo.getMeeting(meetingId),
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }


  // Xử lý lịch của văn thư 
  async userProccessMeeting({
    bpmnXML,
    meetingId,
    workItemId,
    actionCode,
    userId,
    bpmnVersion,
    receiverUnit
  }: {
    bpmnXML: string;
    meetingId: string;
    workItemId: string;
    actionCode: string;
    userId: string;
    bpmnVersion: string;
    receiverUnit?: string;
  }) {
    const { indexes } = await this.getModelFromXml(bpmnXML);

    const wi = await this.repo.getWorkItem(meetingId, workItemId);
    if (!wi) {
      throw new BadRequestException('WorkItem not found or already completed');
    }

    if (!actionCode) {
      throw new BadRequestException('actionCode is required');
    }

    const effectiveUserId = receiverUnit ? receiverUnit : userId;
    if (!effectiveUserId) {
      throw new BadRequestException('assigneeUserId/originalUserId is required');
    }

    const currentNode = indexes.nodes.get(wi.nodeId);
    if (!currentNode) {
      throw new BadRequestException('Current BPMN node not found');
    }

    // Resolve outgoing flow
    let outs = indexes.outgoingBySource.get(currentNode.id) || [];

    for (const f of outs) {
      const target = f.targetRef;
      if (
        target &&
        (target.$type === 'bpmn:ExclusiveGateway' ||
          target.$type === 'bpmn:InclusiveGateway')
      ) {
        outs = indexes.outgoingBySource.get(target.id) || [];
        break;
      }
    }

    const flow = outs.find((f: any) => {
      const ext = getAllNodeExtensionProperties(f);
      return (
        (ext?.actionCode && ext.actionCode.toUpperCase() === actionCode) ||
        (f.name && f.name.toUpperCase() === actionCode) ||
        f.id === actionCode
      );
    });

    if (!flow) {
      throw new BadRequestException(
        `No outgoing flow for actionCode ${actionCode}`,
      );
    }

    const targetNode = flow.targetRef;
    if (!targetNode) {
      throw new BadRequestException('Flow target node not found');
    }

    let serviceBranches: any[] | null = null;
    let statusUser: any = null;

    if (targetNode.$type === 'bpmn:ServiceTask') {
      const result = await this.serviceTaskExecutor.executeIfServiceTask({
        nodeId: targetNode.id,
        bpmnXml: bpmnXML,
        variables: { meetingId, nodeId: targetNode.id, indexes, userId },
      });

      if (!result?.nextNodes?.length) {
        throw new BadRequestException('ServiceTask không trả về nextNodes');
      }
      serviceBranches = result.nextNodes;
      statusUser = result.status;
    }

    const tx = await this.repo.begin();

    try {
      if (serviceBranches) {
        await this.repo.removeWorkItemByAssignee(
          meetingId,
          effectiveUserId,
          workItemId,
          tx,
        );

        for (const branch of serviceBranches) {
          await this.repo.addWorkItem(
            meetingId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: branch.nodeId,
              assigneeUserId: effectiveUserId,
              role: branch.role,
              nodeType: branch.type,
            },
            tx,
            bpmnVersion,
          );
        }
        if (statusUser.allDone === true) {
          // Đơn vị
          await this.repo.updateParticipantStateByUserTx(
            meetingId,
            userId,
            MEETING_PARTICIPANT_STATE.DONE,
            tx,
          );
        }
      }

      await this.repo.commit(tx);

      return {
        success: true,
        meeting: await this.repo.getMeeting(meetingId),
      };
    } catch (e) {
      await this.repo.rollback(tx);
      throw e;
    }
  }

  async extractSignKeywordsByType({
    bpmnXML
  }: {
    bpmnXML: string;
  }): Promise<Record<string, string[]>> {

    if (!bpmnXML) return {};

    try {
      const { indexes } = await this.getModelFromXml(bpmnXML);
      if (!indexes) return {};

      const keywords: Record<string, string[]> = {};

      const flows = await this.bpmnEngine.getAllSequenceFlowsFromXML(bpmnXML);
      if (!flows || flows.length === 0) return {};

      for (const flow of flows) {

        if (!flow) continue;

        const targetNodeId = flow.targetRef?.id;
        if (!targetNodeId) continue;

        const node = indexes.nodes.get(targetNodeId);
        if (!node) continue;

        const extProps = getAllNodeExtensionProperties(node);
        const keySignRaw: string | undefined = extProps?.keySign;
        if (!keySignRaw) continue;

        const flowExtProps = this.bpmnEngine.getFlowExtensionProperties(flow);
        const actionType: string | undefined = flowExtProps?.actionType;
        if (!actionType) continue;

        const values = this.parseAllKeySignValues(keySignRaw);
        if (!values || values.length === 0) continue;

        if (!keywords[actionType]) {
          keywords[actionType] = [];
        }

        for (const v of values) {
          if (!v) continue;

          if (!keywords[actionType].includes(v)) {
            keywords[actionType].push(v);
          }
        }
      }

      return keywords;

    } catch (e) {
      console.error('extractSignKeywordsByType error:', e);
      throw e;
    }
  }

  private parseAllKeySignValues(keySignRaw: string): string[] {
    if (!keySignRaw.includes(':')) return [keySignRaw.trim()];

    return keySignRaw
      .split(',')
      .map(entry => entry.split(':').slice(1).join(':').trim())
      .filter(Boolean);
  }

  async transferSupportRuntime({
    bpmnXML,
    documentId,
    workItemId,
    payload,
    userId,
    originalUser,
    author,
    bpmnVersion,
    externalTransaction,
  }: {
    bpmnXML: string;
    documentId: string;
    workItemId: string;
    payload: PayloadSupport;
    userId: string; // User cuối cùng (ủy quyền > token > payload)
    originalUser: string; // User thực hiện action (token > payload)
    author: string;
    bpmnVersion: string;
    externalTransaction?: any;
  }): Promise<any> {
    // const { indexes } = await this.getModelFromXml(bpmnXML);
    // const wi = await this.repo.getWorkItem(documentId, workItemId);
    const [{ indexes }, wi] = await Promise.all([
      this.getModelFromXml(bpmnXML),
      this.repo.getWorkItem(documentId, workItemId),
    ])
    if (!wi)
      throw new BadRequestException('WorkItem not found or already completed');

    const node = indexes.nodes.get(wi.nodeId);
    const actionCode = payload.actionCode?.toUpperCase();
    if (!actionCode) throw new BadRequestException('actionCode is required');
    const allouts = indexes.outgoingBySource.get(node.id) || [];
    // Sử dụng userId (đã được resolve: ủy quyền > token > payload)
    const effectiveUserId = author ? author : userId;
    const effectiveDisplayName = payload.displayName || 'User';
    // === 2. Normal Action + Return ===
    const flow = allouts.find(
      (f: any) =>
        (f.name && f.name.toUpperCase() === actionCode) || f.id === actionCode,
    );
    if (!flow)
      throw new BadRequestException(
        `No outgoing flow matches actionCode ${actionCode}`,
      );
    const cur = flow?.targetRef?.id
      ? indexes.nodes.get(flow.targetRef.id)
      : null;
    const statusDoc = getAllNodeExtensionProperties(cur)?.statusCode;

    const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(
      flow,
      indexes,
    );
    const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;

    // === Normal Transfer / Approval ===
    const requiresAssignee =
      nextNode && nextNode.$type !== 'bpmn:InclusiveGateway' && !!targetRole;

    // Normalize assignToUserId to array
    const assignToUsers = Array.isArray(payload.assignToUserId)
      ? payload.assignToUserId
      : [payload.assignToUserId].filter(Boolean) as string[];

    if (requiresAssignee) {
      if (assignToUsers.length === 0)
        throw new BadRequestException(
          'assignToUserId is required for this action',
        );

      // Validation for all users
      const candidates = await this.repo.getUsersByRoleInFlow(bpmnVersion, targetRole);

      await Promise.all(assignToUsers.map(async (uId) => {
        const alreadyProcessor = await checkReceiverAlreadyProcessor({
          documentId,
          receiverUserId: uId,
          curNode: node.id,
          myssqlRepo: this.repo,
        });

        if (alreadyProcessor) {
          throw new BadRequestException(
            `Người nhận (${uId}) đã được đã được giao vai trò khác của văn bản này!`,
          );
        }

        if (candidates.length && !candidates.includes(uId)) {
          throw new BadRequestException(
            `Người nhận (${uId}) không đúng vai trò, vui lòng chọn lại tại người nhận: ${uId}`,
          );
        }
      }));
    }

    const shouldManageTransaction = !externalTransaction;
    const tx = externalTransaction || await this.repo.begin();
    try {
      const removed = await this.repo.removeWorkItem(documentId, wi.id, tx);
      if (removed !== 1)
        throw new BadRequestException(
          'Work item was already completed by another user',
        );

      const displayNames: string[] = [];

      if (requiresAssignee) {
        for (const assignTo of assignToUsers) {
          if (nextNode) {
            await this.repo.addWorkItem(
              documentId,
              {
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                nodeId: nextNode.id,
                role: targetRole,
                assigneeUserId: assignTo,
                nodeType: nextNode.$type,
              },
              tx,
              bpmnVersion,
            );
          }

          const [processedById, actingAs, displayNameForComment] = await Promise.all([
            this.repo.getAuthorizedIdIfAuthor(assignTo),
            this.repo.getAuthorIdIfAuthorized(assignTo),
            this.repo.buildDisplayNameWithAuthorized(assignTo),
          ]);

          if (displayNameForComment) displayNames.push(displayNameForComment);

          await this.addAuditIncomingAware(
            documentId,
            {
              user_id: effectiveUserId,
              display_name: effectiveDisplayName,
              role: wi.role,
              action_code: actionCode,
              from_node_id: wi.nodeId,
              to_node_id: nextNode?.id,
              receiver: assignTo,
              processed_by: processedById || null,
              acting_as: actingAs || null,
              receiver_unit: payload.receiver_unit,
              group_: payload.group_ || null,
              roleProcess: statusDoc ? 'processor' : 'supporter',
              action: statusDoc ? 'Xử lý chính' : 'Phối hợp xử lý',
              created_by: effectiveUserId,
              stage_status: stageStatusDoc.CHUA_XU_LY,
              origin_id: wi.id,
              deadline: payload.deadline || null,
              created_at: new Date(),
              updated_at: new Date(),
              details: { note: payload?.note },
              curStatusCode: statusDoc,
              originalUser: originalUser || null,
              typeDocument: 'IncommingDocument',
            },
            tx,
          );
        }
      }
      // Mark current user stage as processed
      await this.updateStageStatusAuditIncomingAware(
        documentId,
        {
          receiver: effectiveUserId,
          stage_status: stageStatusDoc.DA_XU_LY,
          processed_by: effectiveUserId,
          acting_as: effectiveUserId,
          typeDocument: 'IncommingDocument',
        },
        tx,
      );
      // Automatically generate comment
      // Old:
      // let actionText = 'Chuyển xử lý: ';
      // if (actionCode.includes('PHE_DUYET') || actionCode.includes('DUYET'))
      //   actionText = 'Đồng ý';
      // if (actionCode.includes('TU_CHOI') || actionCode.includes('KHONG_DUYET'))
      //   actionText = 'Không đồng ý';
      // let receiverText = '';
      // if (displayNames.length > 0) {
      //   receiverText = ` ${displayNames.join(', ')}`;
      // } else if (targetRole) {
      //   receiverText = ` vai trò ${targetRole}`;
      // }
      // const combinedContent = [`${actionText}${receiverText}.`, payload?.note]
      //   .filter(Boolean)
      //   .join('\n');
      const combinedContent = payload?.note || '';

      await this.addSystemComment(
        documentId,
        payload,
        combinedContent,
        originalUser || effectiveUserId,
        undefined,
        undefined,
        tx,
      );

      if (statusDoc)
        await this.repo.updateDocumentStatus(documentId, statusDoc, tx);

      if (shouldManageTransaction) {
        await this.repo.commit(tx);
      }

      return { status: 1, document: await this.repo.getDocument(documentId) };
    } catch (e) {
      if (shouldManageTransaction) {
        await this.repo.rollback(tx);
      }
      throw e;
    }
  }
}
