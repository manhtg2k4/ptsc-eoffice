import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ServiceTaskExecutorService } from './service-task-executor.service';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { MeetingService } from 'src/meeting/meeting.service';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';
import c from 'config';

@Injectable()
export class ServiceTaskHandlersRegistry implements OnModuleInit {
  private readonly logger = new Logger(ServiceTaskHandlersRegistry.name);

  constructor(
    private readonly executor: ServiceTaskExecutorService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly meetingService: MeetingService,
    @Inject(forwardRef(() => FilesManagementService))
    private readonly filesManagementService: FilesManagementService,
    @Inject(MSSQL_REPO) private readonly repo: MSSQLRepository,
  ) { }

  onModuleInit() {
    this.registerAllHandlers();
  }

  private registerAllHandlers() {
    // ===============================================
    // HANDLER: check_completion
    // Kiểm tra xem văn bản được giao cho người hay phòng
    // ===============================================
    this.executor.registerHandler('check_completion', async (variables) => {

      const { selections, assignments, serviceTaskOuts, indexes } = variables;
      const assignmentData = selections || assignments;

      if (!assignmentData) {
        this.logger.warn('⚠️ [check_completion] No assignment data');
        return {
          key: false,
          reason: 'No assignment data',
          checkedAt: new Date().toISOString(),
        };
      }

      // Parse data
      let parsedAssignments;
      if (typeof assignmentData === 'string') {
        try {
          parsedAssignments = JSON.parse(assignmentData);
        } catch (error) {
          this.logger.error('❌ [check_completion] Parse error:', error);
          return {
            key: false,
            reason: 'Invalid assignment format',
            checkedAt: new Date().toISOString(),
          };
        }
      } else {
        parsedAssignments = assignmentData;
      }

      // Check logic
      let hasDirectUserAssignment = false;
      let hasOrganizationUnitAssignment = false;

      if (Array.isArray(parsedAssignments)) {
        for (const item of parsedAssignments) {
          if (item.users?.length > 0) {
            hasDirectUserAssignment = true;
          }
          if (item.organizationUnits?.length > 0) {
            hasOrganizationUnitAssignment = true;
          }
        }
      }

      const shouldDirectToPerson = hasDirectUserAssignment || !hasOrganizationUnitAssignment;

      // === TÌM FLOW VÀ NODE TIẾP THEO ==
      let nextNodeFinal: any = null;

      if (serviceTaskOuts && Array.isArray(serviceTaskOuts)) {
        let selectedFlow: any = null;

        // Tìm flow phù hợp với key
        for (const flow of serviceTaskOuts) {
          const condition = flow.conditionExpression?.body;

          if (condition) {
            const conditionStr = condition.toLowerCase().replace(/\s+/g, '');

            if (shouldDirectToPerson &&
              (conditionStr.includes('key==true') || conditionStr.includes('key=true'))) {
              selectedFlow = flow;
              break;
            } else if (!shouldDirectToPerson &&
              (conditionStr.includes('key==false') || conditionStr.includes('key=false'))) {
              selectedFlow = flow;
              break;
            }
          }
        }

        if (selectedFlow) {
          const result = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
          nextNodeFinal = result?.node || null;
          if (nextNodeFinal) {
          }
        }
      }

      return {
        key: shouldDirectToPerson,
        hasDirectUserAssignment,
        hasOrganizationUnitAssignment,
        nextNode: nextNodeFinal,
        checkedAt: new Date().toISOString(),
        assignmentCount: Array.isArray(parsedAssignments) ? parsedAssignments.length : 0,
      };
    });

    // ===============================================
    // HANDLER: find-complete-doc
    //* Tìm người hoàn thành văn bản
    // ===============================================
    this.executor.registerHandler('find-complete-doc', async (variables) => {

      const { indexes, payload, nodeId, curNodeId } = variables;
      const auditArr = variables.audit || variables.auditArr;
      const workItemId = variables.workItemId || variables.workItem?.id || variables.workItem?.workItemId;
      const documentId = variables.documentId || variables.workItem?.documentId || variables.workItem?.document_id;
      const userId = variables.userId || variables.workItem?.userId;

      if (!workItemId || !documentId || !userId) {
        return {
          completed: false,
          reason: 'Missing required variables: workItemId, documentId, or userId',
        };
      }

      const serviceTaskOuts = indexes.outgoingBySource.get(nodeId) || [];
      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(serviceTaskOuts[0], indexes);

      const normalizeAudit = (entry: any) => ({
        ...entry,
        role: entry?.role || null,
        actionCode: entry?.actionCode || entry?.action_code || null,
        fromNodeId: entry?.fromNodeId || entry?.from_node_id || null,
        toNodeId: entry?.toNodeId || entry?.to_node_id || null,
        createdBy: entry?.createdBy || entry?.created_by || entry?.userId || entry?.user_id || null,
        details: entry?.details ? (typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details) : null
      });
      const normalizedAudit = Array.isArray(auditArr)
        ? auditArr.map(normalizeAudit)
        : [];

      // Tìm audit phân công (lùi ngược từ cuối, bỏ qua các bước phân công của Văn thư vì Văn thư chỉ phân phối hộ Lãnh đạo/Chỉ huy)
      let phanCongAudit = [...normalizedAudit]
        .reverse()
        .find(
          (entry) =>
            (entry?.details?.cxlPhanCong === true || entry?.details?.phanCong === true) &&
            !entry?.role?.toUpperCase().startsWith('VAN_THU')
        );

      // Nếu không tìm thấy, fallback tìm tất cả bao gồm cả Văn thư
      if (!phanCongAudit) {
        phanCongAudit = [...normalizedAudit]
          .reverse()
          .find(
            (entry) =>
              entry?.details?.cxlPhanCong === true ||
              entry?.details?.phanCong === true
          );
      }

      // Check if the current document is a clone copy and task is configured to auto-complete clone for specific assignment types
      const taskNode = indexes.nodes.get(nodeId);
      const extProps = getAllNodeExtensionProperties(taskNode);
      const autoCompleteCloneFor = extProps?.autoCompleteCloneFor;
      const directAssignment = [...normalizedAudit]
        .reverse()
        .find(
          (entry) =>
            entry.receiver === userId &&
            (entry.details?.phanCong === true || entry.details?.cxlPhanCong === true) &&
            (entry.toNodeId === curNodeId?.id || entry.to_node_id === curNodeId?.id)
        );
      const assignmentType = (directAssignment?.assignment_type ||
        directAssignment?.details?.assignmentType ||
        directAssignment?.details?.assignment_type || '').toUpperCase();

      if (autoCompleteCloneFor) {
        const allowedTypes = String(autoCompleteCloneFor).split(',').map(s => s.trim().toUpperCase());
        if (allowedTypes.includes(assignmentType)) {
          const docQuery = await (this.repo as any).pool.request()
            .input('docId', documentId)
            .query(`SELECT parent_doc_clone FROM dbo.incomming_documents WHERE document_id = @docId`);
          const parentDocClone = docQuery.recordset?.[0]?.parent_doc_clone;

          if (parentDocClone) {
            let endEventNode: any = null;
            const queue = [taskNode];
            const visited = new Set<string>();
            while (queue.length > 0) {
              const current = queue.shift();
              if (!current || visited.has(current.id)) continue;
              visited.add(current.id);
              if (current.$type === 'bpmn:EndEvent' || current.$type === 'bpmn:endEvent') {
                endEventNode = current;
                break;
              }
              const outs = indexes.outgoingBySource.get(current.id) || [];
              for (const flow of outs) {
                const targetNode = indexes.nodes.get(flow.targetRef?.id);
                if (targetNode) {
                  queue.push(targetNode);
                }
              }
            }
            if (endEventNode) {
              return {
                completed: true,
                completedAt: new Date().toISOString(),
                assignTo: null,
                assignerAction: null,
                nextNode: endEventNode,
                personDirectingLane: null,
              };
            }
          }
        }
      }

      let personDirecting: string | null = null;
      let personDirectingLane: string | null = null;
      let assignerAudit: any = null;

      if (phanCongAudit) {
        if (phanCongAudit.details?.cxlPhanCong === true || phanCongAudit.details?.phanCong === true) {
          // lấy theo toNodeId → map sang lane
          const phanCongAssignmentType = (phanCongAudit.assignment_type ||
            phanCongAudit.details?.assignmentType ||
            phanCongAudit.details?.assignment_type || '').toUpperCase();
          const allowedTypes = autoCompleteCloneFor
            ? String(autoCompleteCloneFor).split(',').map(s => s.trim().toUpperCase())
            : [];

          if (allowedTypes.includes(phanCongAssignmentType)) {
            personDirectingLane = indexes.laneMap.get(curNodeId?.id || curNodeId);
            personDirecting = userId;
          } else {
            personDirectingLane = phanCongAudit.role;
            personDirecting = phanCongAudit.createdBy || phanCongAudit.receiver || phanCongAudit.userId || phanCongAudit.user_id;
          }
        }
        assignerAudit = phanCongAudit;
      }

      // Nếu không tìm thấy PHAN_CONG → fallback logic cũ
      if (!personDirecting) {

        const curNodeAudit = Array.isArray(auditArr) ? auditArr.find(a => (a.toNodeId || a.to_node_id) === curNodeId?.id) : null;

        if (curNodeAudit && Array.isArray(auditArr)) {
          const previousNodeId = curNodeAudit.fromNodeId || curNodeAudit.from_node_id;
          assignerAudit = [...auditArr]
            .reverse()
            .find(a => (a.toNodeId || a.to_node_id) === previousNodeId);
        }

        personDirecting = assignerAudit?.createdBy || assignerAudit?.receiver || assignerAudit?.user_id;
        personDirectingLane = assignerAudit?.role;

      }

      // Tìm flow phù hợp với personDirectingLane
      const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];
      let nextNodeFinal: any = null;

      if (gatewayOuts && Array.isArray(gatewayOuts)) {
        let selectedFlow: any = null;

        for (const flow of gatewayOuts) {
          const condition = flow.conditionExpression?.body;

          if (condition) {
            const conditionStr = condition.toLowerCase().replace(/\s+/g, '');
            const lane = personDirectingLane?.toLowerCase();

            const expected = `persondirecting=='${lane}'`;

            if (lane && conditionStr.includes(expected)) {
              selectedFlow = flow;
              break;
            }
          }
        }

        if (selectedFlow) {
          const result = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
          nextNodeFinal = result?.node || null;
        }
      }

      return {
        completed: true,
        completedAt: new Date().toISOString(),
        assignTo: personDirecting,
        assignerAction: assignerAudit?.action || assignerAudit?.action_code,
        nextNode: nextNodeFinal,
        personDirectingLane,
      };
    });


    // Handle gửi lịch tới các cá nhân và phòng tham gia cuộc họp
    this.executor.registerHandler(
      'send_room_person_meeting',
      async (variables): Promise<{
        nextNodes: Array<{
          nodeId: string;
          role?: string;
          users: string[];
          units: string[];
        }>;
        participants: {
          chairman?: { unitId: string; userId: string };
          secretary?: { unitId: string; userId: string };
        };
        receiveNodeId?: string | null;
        cancelNodeId?: string | null;
      }> => {

        const {
          meetingId,
          nodeId,   // ✅ ServiceTask id
          indexes,
        } = variables;

        if (!meetingId) {
          throw new Error('meetingId is required');
        }

        if (!nodeId) {
          throw new Error('ServiceTask nodeId is required');
        }

        /**
         * =====================================================
         * 1️⃣ TỰ LẤY FLOW RA CỦA SERVICE TASK
         * =====================================================
         */
        const serviceTaskOuts =
          indexes.outgoingBySource.get(nodeId) || [];

        if (!serviceTaskOuts.length) {
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);
        }

        /**
         * =====================================================
         * 2️⃣ LẤY USER + UNIT HỢP LỆ
         * =====================================================
         */
        const { userIds = [], unitIds = [], chairman, secretary } = await this.meetingService.getMeetingValidateUnitAndUserIds(meetingId);

        // Loại bỏ Chairman ra khỏi danh sách người tham gia thông thường
        const { chairmanId } = await this.meetingService.getChairmanAndSecretaries(meetingId);
        const excludeUserIdsSet = new Set<string>();
        if (chairmanId) excludeUserIdsSet.add(chairmanId);
        if (chairman?.userId) excludeUserIdsSet.add(chairman.userId);

        const filteredUserIds = userIds.filter(id => !excludeUserIdsSet.has(id));

        const nextNodes: {
          nodeId: string;
          name?: string;
          role?: string;
          users: string[];
          units: string[];
          extensions: Record<string, any>;
          type: string;
        }[] = [];

        /**
         * =====================================================
         * 3️⃣ DUYỆT FLOW → RESOLVE NEXT INTERACTIVE NODE
         * =====================================================
         */
        for (const flow of serviceTaskOuts) {
          const targetNode = flow.targetRef;
          const isTargetGateway = targetNode && (
            targetNode.$type === 'bpmn:ExclusiveGateway' ||
            targetNode.$type === 'bpmn:InclusiveGateway' ||
            targetNode.$type === 'bpmn:Gateway'
          );

          if (flow.id === 'Flow_03rj1gy' && isTargetGateway) {
            const hasTasks = await this.meetingService.hasChairmanTasks(meetingId);
            const gatewayOuts = indexes.outgoingBySource.get(targetNode.id) || [];

            let selectedFlow = null;
            for (const f of gatewayOuts) {
              let condition = f.conditionExpression?.body?.trim() || '';
              if (condition.startsWith('{') && condition.endsWith('}')) {
                condition = condition.slice(1, -1);
              }
              const condStr = condition.toLowerCase().replace(/\s+/g, '');

              if (hasTasks && condStr.includes('hastask')) {
                selectedFlow = f;
                break;
              } else if (!hasTasks && condStr.includes('notask')) {
                selectedFlow = f;
                break;
              }
            }

            if (selectedFlow) {
              const { node: resolvedNode } = this.bpmnEngine.nextNodeByFlow(selectedFlow, indexes);
              if (resolvedNode) {
                const resolvedExtensions = getAllNodeExtensionProperties(resolvedNode);
                const role = indexes.laneMap.get(resolvedNode.id);
                nextNodes.push({
                  nodeId: resolvedNode.id,
                  name: resolvedNode.name,
                  role,
                  users: chairman?.userId ? [chairman.userId] : [],
                  units: [],
                  extensions: resolvedExtensions,
                  type: resolvedNode.$type
                });
              }
            }
            continue;
          }

          // 🔥 BPMN ENGINE quyết định node tiếp theo
          const { node: nextNode } =
            this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

          if (!nextNode) {
            continue;
          }

          const nodeExtensions = getAllNodeExtensionProperties(nextNode);
          const assignType = nodeExtensions?.assignType;

          if (assignType === 'CHAIRMAN') {
            const hasTasks = await this.meetingService.hasChairmanTasks(meetingId);

            // Tìm các flow đi ra từ node Chairman để qua Gateway
            const nextNodeOuts = indexes.outgoingBySource.get(nextNode.id) || [];
            const candidateFlows: any[] = [];

            for (const outFlow of nextNodeOuts) {
              const target = outFlow.targetRef;
              if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway' || target.$type === 'bpmn:Gateway')) {
                const gatewayOuts = indexes.outgoingBySource.get(target.id) || [];
                candidateFlows.push(...gatewayOuts);
              } else {
                candidateFlows.push(outFlow);
              }
            }

            // Lọc flow dựa theo hasTasks
            let selectedFlow = null;
            for (const f of candidateFlows) {
              let condition = f.conditionExpression?.body?.trim() || '';
              if (condition.startsWith('{') && condition.endsWith('}')) {
                condition = condition.slice(1, -1);
              }
              const condStr = condition.toLowerCase().replace(/\s+/g, '');

              if (hasTasks && condStr.includes('hastask')) {
                selectedFlow = f;
                break;
              } else if (!hasTasks && condStr.includes('notask')) {
                selectedFlow = f;
                break;
              }
            }

            if (selectedFlow) {
              const { node: resolvedNode } = this.bpmnEngine.nextNodeByFlow(selectedFlow, indexes);
              if (resolvedNode) {
                const resolvedExtensions = getAllNodeExtensionProperties(resolvedNode);
                const role = indexes.laneMap.get(resolvedNode.id);
                nextNodes.push({
                  nodeId: resolvedNode.id,
                  name: resolvedNode.name,
                  role,
                  users: chairman?.userId ? [chairman.userId] : [],
                  units: [],
                  extensions: resolvedExtensions,
                  type: resolvedNode.$type
                });
              }
            }
            continue;
          }

          if (!nextNode) {
            continue;
          }

          // Chỉ tạo work cho UserTask
          if (nextNode.$type !== 'bpmn:UserTask') {
            continue;
          }

          // ===== XỬ LÝ KHI KHÔNG CẦN XÁC NHẬN (TÍNH TOÁN ĐỘNG THEO BPMN LUỒNG QUA GATEWAY) =====
          const meeting = await this.repo.getMeeting(meetingId);
          if (meeting?.needConfirmation === false && nextNode.id === 'Activity_1kmmgo3') {
            const resolved = await this.meetingService.resolveAutoConfirmUserNodes(meetingId, meeting.bpmnVersion);
            if (resolved) {
              const { hasTaskNode, concurrentNodes, indexes: resolvedIndexes } = resolved;
              const { participants } = await this.repo.getParticipantsAndSelectedUnitsWithTask(meetingId);
              const userIdsWithTasks = participants
                .filter(p => p.hasTask && filteredUserIds.includes(p.userId))
                .map(p => p.userId);

              // 1. Tạo nút Hủy tham gia (concurrentNodes) cho TẤT CẢ người tham gia
              for (const concurrentNode of concurrentNodes) {
                if (concurrentNode && concurrentNode.$type === 'bpmn:UserTask' && filteredUserIds.length > 0) {
                  const cancelExtensions = getAllNodeExtensionProperties(concurrentNode);
                  nextNodes.push({
                    nodeId: concurrentNode.id,
                    name: concurrentNode.name,
                    role: resolvedIndexes.laneMap.get(concurrentNode.id),
                    users: filteredUserIds,
                    units: [],
                    extensions: {
                      ...cancelExtensions,
                      assignType: cancelExtensions?.assignType || 'USER',
                      flagsButton: 'isConcurrent: true',
                    },
                    type: 'bpmn:UserTask'
                  });
                }
              }

              // 2. Chỉ tạo nút Xử lý lịch cho những người CÓ nhiệm vụ
              if (userIdsWithTasks.length > 0 && hasTaskNode && hasTaskNode.$type === 'bpmn:UserTask') {
                const taskExtensions = getAllNodeExtensionProperties(hasTaskNode);
                nextNodes.push({
                  nodeId: hasTaskNode.id,
                  name: hasTaskNode.name,
                  role: resolvedIndexes.laneMap.get(hasTaskNode.id),
                  users: userIdsWithTasks,
                  units: [],
                  extensions: {
                    ...taskExtensions,
                    assignType: taskExtensions?.assignType || 'USER',
                  },
                  type: 'bpmn:UserTask'
                });
              }
            }
            continue;
          }

          const currentExtensions = nodeExtensions;

          const role = indexes.laneMap.get(nextNode.id);

          nextNodes.push({
            nodeId: nextNode.id,
            name: nextNode.name,
            role,
            users: filteredUserIds,
            units: unitIds,
            extensions: nodeExtensions,
            type: nextNode.$type
          });
        }

        /**
         * =====================================================
         * 4️⃣ VALIDATE
         * =====================================================
         */
        if (!nextNodes.length) {
          throw new Error(
            `ServiceTask ${nodeId} không resolve được UserTask tiếp theo`,
          );
        }

        let receiveNodeId: string | null = null;
        let cancelNodeId: string | null = null;

        for (const flows of indexes.outgoingBySource.values()) {
          for (const flow of flows) {
            const ext = getAllNodeExtensionProperties(flow);
            if (ext?.flagsButton?.includes('isConcurrent: true')) {
              if (flow.targetRef?.id) {
                cancelNodeId = flow.targetRef.id;
                const cancelOuts = indexes.outgoingBySource.get(cancelNodeId) || [];
                if (cancelOuts[0]?.targetRef?.id) {
                  receiveNodeId = cancelOuts[0].targetRef.id;
                }
              }
              break;
            }
          }
          if (cancelNodeId) break;
        }

        return {
          nextNodes,
          participants: {
            chairman: chairman ?? undefined,
            secretary: secretary ?? undefined,
          },
          receiveNodeId,
          cancelNodeId,
        };

      },
    );

    this.executor.registerHandler(
      'check_seat_assignment',
      async (variables): Promise<{
        nextNodes: {
          nodeId: string;
          name?: string;
          role?: string;
          extensions: Record<string, any>;
          type: string;
        }[];
        seatStatus: {
          success: boolean;
          allAssigned: boolean;
          data: any;
        };
      }> => {

        const { meetingId, nodeId, indexes } = variables;

        if (!meetingId) throw new Error('meetingId is required');
        if (!nodeId) throw new Error('ServiceTask nodeId is required');

        const check = await this.meetingService.checkUnassignedSeats(meetingId);
        const wantType = check.allAssigned ? 'UPDATE' : 'SEAT';

        const outs = indexes.outgoingBySource.get(nodeId) || [];
        if (!outs.length)
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);

        const nextNodes: any[] = [];

        for (const flow of outs) {
          const { node } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);
          if (!node) continue;

          const extensions = getAllNodeExtensionProperties(node);
          const assignType = extensions?.assignType;

          if (assignType !== wantType) continue;

          const role = indexes.laneMap.get(node.id);

          nextNodes.push({
            nodeId: node.id,
            name: node.name,
            role,
            extensions,
            type: node.$type,
          });
        }

        if (!nextNodes.length)
          throw new Error(
            `Không tìm thấy node ${wantType} sau ServiceTask ${nodeId}`,
          );

        return {
          nextNodes,
          seatStatus: {
            success: true,
            allAssigned: check.allAssigned,
            data: check.data,
          },
        };
      },
    );

    this.executor.registerHandler(
      'check_job_meeting_unit',
      async (variables) => {
        const { meetingId, nodeId, indexes, receiverUnit } = variables;

        if (!meetingId) throw new Error('meetingId is required');
        if (!nodeId) throw new Error('ServiceTask nodeId is required');
        if (!receiverUnit) throw new Error('receiverUnit is required');

        const isDocPrepared =
          await this.meetingService.isUnitDocumentsPrepared(
            meetingId,
            receiverUnit,
          );

        const hasUnSeat =
          await this.meetingService.hasUnitParticipantsWithoutSeat(
            meetingId,
            receiverUnit,
          );

        // Kiểm tra chi tiết vai trò gán (thư ký, người tham gia, hoặc cả hai)
        const assignmentStatus =
          await this.meetingService.getUnitAssignmentCompletionStatus(
            meetingId,
            receiverUnit,
          );
        const assignmentComplete = assignmentStatus;
        const hasParticipants = assignmentStatus.isComplete;

        // Kiểm tra chi tiết hoàn thành gán

        // Kiểm tra còn ngữ pháp cơ bản (có người tham gia hay không)

        // Cập nhật flags dựa trên trạng thái gán
        const updatePayload: any = {
          assignParticipants: assignmentStatus.isComplete,
          prepareDocuments: isDocPrepared,         // tài liệu OK
        };

        // Cập nhật assignParticipants dựa trên loại gán
        if (assignmentStatus.assignmentType === 'BOTH') {
          // Cả thư ký và người tham gia → đã hoàn thành gán
          updatePayload.assignParticipants = assignmentComplete.isComplete;
        } else if (assignmentStatus.assignmentType === 'SECRETARY_ONLY') {
          // Chỉ thư ký → kiểm tra thư ký hoàn thành
          updatePayload.assignParticipants = assignmentComplete.isSecretaryComplete;
        } else if (assignmentStatus.assignmentType === 'PARTICIPANT_ONLY') {
          // Chỉ người tham gia → kiểm tra người tham gia hoàn thành
          updatePayload.assignParticipants = assignmentComplete.isParticipantComplete;
        } else {
          // Không có gì → chưa hoàn thành
          updatePayload.assignParticipants = false;
        }

        await this.meetingService.updateMeetingUnitFlags(
          meetingId,
          receiverUnit,
          updatePayload,
        );

        /**
         * RULE
         * - Tài liệu OK + có người tham gia → UPDATE
         * - Các case còn lại → PROCESS
         */
        let wantType: 'UPDATE' | 'PROCESS' = 'PROCESS';
        if (isDocPrepared && hasParticipants) {
          wantType = 'UPDATE';
        }
        const allDone = isDocPrepared && hasParticipants;

        const outs = indexes.outgoingBySource.get(nodeId) || [];
        if (!outs.length)
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);

        const nextNodes: any[] = [];

        for (const flow of outs) {
          const { node } =
            this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

          if (!node) continue;
          if (node.$type !== 'bpmn:UserTask') continue;

          const extensions = getAllNodeExtensionProperties(node);
          const assignType = extensions?.assignType;

          if (assignType !== wantType) continue;

          const role = indexes.laneMap.get(node.id);

          nextNodes.push({
            nodeId: node.id,
            name: node.name,
            role,
            extensions,
            type: node.$type,
          });
        }

        if (!nextNodes.length)
          throw new Error(
            `Không tìm thấy node ${wantType} sau ServiceTask ${nodeId}`,
          );

        return {
          nextNodes,
          status: {
            success: true,
            isDocPrepared,
            hasUnSeat,
            wantType,
            allDone,
            assignmentDetails: {
              assignmentType: assignmentStatus.assignmentType,
              hasSecretaryRole: assignmentStatus.hasSecretaryRole,
              hasParticipantRole: assignmentStatus.hasParticipantRole,
              needsSecretaryAssignment:
                assignmentStatus.needsSecretaryAssignment,
              needsParticipantAssignment:
                assignmentStatus.needsParticipantAssignment,
              isCompleteSecretary: assignmentStatus.isCompleteSecretary,
              isCompleteParticipant: assignmentStatus.isCompleteParticipant,
              isSecretaryComplete: assignmentComplete.isSecretaryComplete,
              isParticipantComplete: assignmentComplete.isParticipantComplete,
              isAssignmentComplete: assignmentComplete.isComplete,
            },
          },
        };
      },
    );

    this.executor.registerHandler(
      'chek_job_meeting_user',
      async (variables) => {
        const { meetingId, nodeId, indexes, userId } = variables;

        if (!meetingId) throw new Error('meetingId is required');
        if (!nodeId) throw new Error('ServiceTask nodeId is required');
        if (!userId) throw new Error('userId is required');

        const isDocPrepared = await this.meetingService.isUserDocumentsPrepared(
          meetingId,
          userId,
        );
        await this.meetingService.updateParticipantPrepareDocumentsByUser(
          meetingId,
          userId,
          isDocPrepared
        );
        /**
         * RULE
         * - Tài liệu OK + còn thiếu chỗ → UPDATE
         * - Các case còn lại → PROCESS
         */
        let wantType: 'UPDATE' | 'PROCESS' = 'PROCESS';
        if (isDocPrepared) {
          wantType = 'UPDATE';
        }
        const allDone = isDocPrepared;
        const outs = indexes.outgoingBySource.get(nodeId) || [];
        if (!outs.length)
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);

        const nextNodes: any[] = [];

        for (const flow of outs) {
          const { node } =
            this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

          if (!node) continue;
          if (node.$type !== 'bpmn:UserTask') continue;

          const extensions = getAllNodeExtensionProperties(node);
          const assignType = extensions?.assignType;

          if (assignType !== wantType) continue;

          const role = indexes.laneMap.get(node.id);

          nextNodes.push({
            nodeId: node.id,
            name: node.name,
            role,
            extensions,
            type: node.$type,
          });
        }

        if (!nextNodes.length)
          throw new Error(
            `Không tìm thấy node ${wantType} sau ServiceTask ${nodeId}`,
          );

        return {
          nextNodes,
          status: {
            success: true,
            isDocPrepared,
            wantType,
            allDone
          },
        };
      },
    );
    this.executor.registerHandler(
      'find_people_created',
      async (variables): Promise<{
        nextNodes: {
          nodeId: string;
          name?: string;
          role?: string;
          extensions: Record<string, any>;
          type: string;
        }[];
        status: {
          success: boolean;
          creatorUserId: string;
          source: 'AUDIT' | 'FLOW';
          checkedAt: Date;
        };
      }> => {
        const { meetingId, nodeId, indexes, bpmnVersion } = variables;

        if (!meetingId) throw new Error('meetingId is required');
        if (!nodeId) throw new Error('ServiceTask nodeId is required');
        if (!bpmnVersion) throw new Error('bpmnVersion is required');

        const meeting = await this.meetingService.getMeetingInfo(meetingId);
        if (!meeting?.createdBy) {
          throw new Error('Meeting creator not found');
        }
        const creatorUserId = meeting.createdBy;

        const audit =
          await this.meetingService.getFirstAuditByMeetingId(meetingId);
        const fallbackRole = audit?.role || 'NGUOI_SOAN_LICH';

        if (audit?.to_node_id) {
          const auditNode = indexes.nodes.get(audit.to_node_id);

          if (auditNode && auditNode.$type === 'bpmn:UserTask') {
            const targetRole =
              indexes.laneMap.get(auditNode.id) || fallbackRole;

            if (targetRole) {
              const { userIds } = await this.meetingService.getUsersInFlow(
                bpmnVersion,
                targetRole,
              );

              const isCreatorInFlow = userIds.includes(creatorUserId);

              if (isCreatorInFlow) {
                return {
                  nextNodes: [
                    {
                      nodeId: auditNode.id,
                      name: auditNode.name,
                      role: targetRole,
                      type: auditNode.$type,
                      extensions: getAllNodeExtensionProperties(auditNode),
                    },
                  ],
                  status: {
                    success: true,
                    creatorUserId,
                    source: 'AUDIT',
                    checkedAt: new Date(),
                  },
                };
              }
            }
          }
        }

        let outs = indexes.outgoingBySource.get(nodeId) || [];
        if (!outs.length) {
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);
        }

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

        const nextNodes: any[] = [];

        for (const flow of outs) {
          const { node } =
            this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

          if (!node || node.$type !== 'bpmn:UserTask') continue;

          const targetRole =
            indexes.laneMap.get(node.id) || fallbackRole;

          if (!targetRole) continue;

          const { userIds } = await this.meetingService.getUsersInFlow(
            bpmnVersion,
            targetRole,
          );

          const isCreatorInFlow = userIds.includes(creatorUserId);

          if (!isCreatorInFlow) continue;

          nextNodes.push({
            nodeId: node.id,
            name: node.name,
            role: targetRole,
            type: node.$type,
            extensions: getAllNodeExtensionProperties(node),
          });
        }

        if (!nextNodes.length) {
          throw new Error(
            'Không tìm thấy UserTask nào phù hợp cho người tạo',
          );
        }

        return {
          nextNodes,
          status: {
            success: true,
            creatorUserId,
            source: 'FLOW',
            checkedAt: new Date(),
          },
        };
      },
    );
    this.executor.registerHandler(
      'auto_submitted_meeting',
      async (variables): Promise<{
        nextNodes: Array<{
          nodeId: string;
          name?: string;
          role?: string;
          extensions: Record<string, any>;
          type: string;
        }>;
      }> => {
        const { meetingId, nodeId, indexes } = variables;

        if (!meetingId) throw new Error('meetingId is required');
        if (!nodeId) throw new Error('ServiceTask nodeId is required');

        // 1. Lấy outgoing flow
        const serviceTaskOuts = indexes.outgoingBySource.get(nodeId) || [];
        if (!serviceTaskOuts.length) {
          throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);
        }

        const nextNodes: {
          nodeId: string;
          name?: string;
          role?: string;
          extensions: Record<string, any>;
          type: string;
        }[] = [];

        // 2. Resolve next interactive node
        for (const flow of serviceTaskOuts) {
          const { node: nextNode } =
            this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

          if (!nextNode) continue;

          const nodeExtensions = getAllNodeExtensionProperties(nextNode);
          const role = indexes.laneMap.get(nextNode.id);

          nextNodes.push({
            nodeId: nextNode.id,
            name: nextNode.name,
            role,
            extensions: nodeExtensions,
            type: nextNode.$type,
          });
        }

        if (!nextNodes.length) {
          throw new Error(
            `ServiceTask ${nodeId} không resolve được UserTask tiếp theo`,
          );
        }

        return { nextNodes };
      },
    );
    this.executor.registerHandler('check-phan-cong', async (variables) => {

      const { documentId, userId, audit, indexes, nodeId, curNodeId } = variables;

      if (!documentId || !userId) {
        throw new Error('Missing required variables: documentId or userId');
      }

      let isSupporter = false;
      try {
        const preloadedAssignmentInfo = variables.latestAssignmentInfo;
        if (preloadedAssignmentInfo) {
          if (preloadedAssignmentInfo.roleProcess === 'supporter' && !preloadedAssignmentInfo.parentDocClone) {
            isSupporter = true;
          }
        } else {
          const checkSenderReq = (this.repo as any).pool.request();
          checkSenderReq.input('documentId', documentId);
          checkSenderReq.input('userId', variables.workItem?.assigneeUserId || variables.wi?.assigneeUserId || userId);
          const senderAssignmentResult = await checkSenderReq.query(`
            SELECT TOP 1 ia.role_process, d.parent_doc_clone
            FROM ${this.repo.dbname}.dbo.incomming_assignment ia WITH (NOLOCK)
            LEFT JOIN ${this.repo.dbname}.dbo.incomming_documents d WITH (NOLOCK) ON d.document_id = ia.document_id
            WHERE ia.document_id = @documentId AND ia.receiver = @userId
            ORDER BY ia.created_at DESC
          `);
          if (senderAssignmentResult.recordset && senderAssignmentResult.recordset.length > 0) {
            const record = senderAssignmentResult.recordset[0];
            if (record.role_process === 'supporter' && !record.parent_doc_clone) {
              isSupporter = true;
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi check sender roleProcess in check-phan-cong handler:', err);
      }

      if (isSupporter) {
        return {
          completed: false,
          completedAt: new Date().toISOString(),
          reason: 'Supporter should not run check-phan-cong',
          nextNode: null,
          personDirectingLane: null,
          outs: [],
        };
      }

      const normalizeAudit = (entry: any) => ({
        ...entry,
        role: entry?.role || null,
        actionCode: entry?.actionCode || entry?.action_code || null,
        fromNodeId: entry?.fromNodeId || entry?.from_node_id || null,
        toNodeId: entry?.toNodeId || entry?.to_node_id || null,
        createdBy: entry?.createdBy || entry?.created_by || entry?.userId || entry?.user_id || null,
        details: entry?.details ? (typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details) : null
      });
      const normalizedAudit = Array.isArray(audit)
        ? audit.map(normalizeAudit)
        : [];

      const serviceTaskOuts = indexes.outgoingBySource.get(nodeId) || [];
      if (!serviceTaskOuts.length) {
        throw new Error(`ServiceTask ${nodeId} has no outgoing flow`);
      }

      const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(serviceTaskOuts[0], indexes);
      if (!nextNode) {
        throw new Error(`Cannot resolve next node from ServiceTask ${nodeId}`);
      }

      // Lấy bản ghi phân công gần nhất ở vai trò Văn thư/Lãnh đạo
      const latestPhanCong = [...normalizedAudit]
        .reverse()
        .find(
          (entry) =>
            entry?.details?.cxlPhanCong === true ||
            entry?.details?.phanCong === true
        );

      const phanCongIdx = latestPhanCong ? normalizedAudit.indexOf(latestPhanCong) : -1;
      const hasBeenReturned = phanCongIdx !== -1 && normalizedAudit.slice(phanCongIdx + 1).some(
        (entry) => entry?.actionCode === 'TRA_LAI'
      );

      if (!latestPhanCong || hasBeenReturned) {
        return {
          completed: false,
          completedAt: new Date().toISOString(),
          reason: latestPhanCong ? 'PHAN_CONG has been returned' : 'No PHAN_CONG audit found',
          nextNode: null,
          personDirectingLane: null,
          outs: [],
        };
      }

      let personDirectingLane;

      // 🔥 Logic theo yêu cầu
      if (latestPhanCong.details?.cxlPhanCong === true) {
        // lấy theo toNodeId → map sang lane
        personDirectingLane = indexes.laneMap.get(
          latestPhanCong.toNodeId
        );
      } else if (latestPhanCong.details?.phanCong === true) {
        // lấy trực tiếp role
        personDirectingLane = latestPhanCong.role;
      }


      // Tìm flow phù hợp với personDirectingLane
      const gatewayOuts = indexes.outgoingBySource.get(nextNode.id) || [];
      let nextNodeFinal: any = null;
      let outs = [];
      if (gatewayOuts && Array.isArray(gatewayOuts)) {
        let selectedFlow: any = null;

        for (const flow of gatewayOuts) {
          const condition = flow.conditionExpression?.body;

          if (condition) {
            const conditionStr = condition.toLowerCase().replace(/\s+/g, '');
            const lane = personDirectingLane?.toLowerCase();
            const assignmentType = (
              latestPhanCong?.assignment_type ||
              latestPhanCong?.details?.assignmentType ||
              latestPhanCong?.details?.assignment_type ||
              ''
            ).toLowerCase();

            const expectedLane = `phancong=='${lane}'`;
            const expectedAssignment = `assignmenttype=='${assignmentType}'`;

            if (
              (lane && conditionStr.includes(expectedLane)) ||
              (assignmentType && conditionStr.includes(expectedAssignment))
            ) {
              selectedFlow = flow;
              break;
            }
          }
        }

        if (!selectedFlow) {
          selectedFlow = gatewayOuts.find((f: any) => !f.conditionExpression?.body) || gatewayOuts[0];
        }

        if (selectedFlow) {
          const result = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
          nextNodeFinal = result?.node || null;
          const nextOuts = indexes.outgoingBySource.get(nextNodeFinal?.id) || [];
          if (nextOuts.length > 0 && curNodeId?.id && nextNodeFinal?.id && !variables.isSimulation) {
            await this.repo.updateWorkitemAndAudit({ curNodeId: curNodeId?.id, nodeId: nextNodeFinal?.id, userId });
          }
        }
        outs = indexes.outgoingBySource.get(nextNodeFinal?.id) || [];
      }

      return {
        completed: true,
        completedAt: new Date().toISOString(),
        nextNode: nextNodeFinal,
        personDirectingLane,
        outs
      };
    });


    this.executor.registerHandler('check-phancong-ngoai-tp', async (variables) => {

      const { documentId, nodeId, onlyCxlTP, indexes, curLane, effectiveUserId, tx, bpmnVersion } = variables;
      const gatewayOuts = indexes.outgoingBySource.get(nodeId) || [];

      let nextNodeFinal: any = null;
      let outs = [];

      // 1. Nếu onlyCxlTP là false -> TRẢ VỀ FALSE ĐỂ GIỮ NGUYÊN NODE HIỆN TẠI
      if (onlyCxlTP === true) {
        return {
          completed: false, // <-- Quan trọng: Báo cho engine biết chưa hoàn thành
          completedAt: new Date().toISOString(),
          nextNode: null,
          outs: []
        };
      }

      // 2. Nếu onlyCxlTP là true -> TÌM LUỒNG THỎA MÃN ĐỂ ĐI TIẾP
      if (gatewayOuts && Array.isArray(gatewayOuts)) {
        let selectedFlow: any = null;

        for (const flow of gatewayOuts) {
          const condition = flow.conditionExpression?.body;

          if (condition) {
            // Xóa khoảng trắng và đưa về viết thường (ex: ${onlycxltp==true})
            const conditionStr = condition.toLowerCase().replace(/\s+/g, '');

            // Expected condition: Bỏ qua biến lane vì flow này rẽ nhánh theo onlyCxlTP
            const expected = `onlycxltp==${onlyCxlTP}`; // -> 'onlycxltp==true' (Không có dấu '')

            if (conditionStr.includes(expected)) {
              selectedFlow = flow;
              break;
            }
          } else {
            // Tuỳ chọn: Nếu flow không vẽ điều kiện gì thì coi như flow mặc định
            selectedFlow = flow;
            break;
          }
        }

        if (selectedFlow) {
          const result = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
          nextNodeFinal = result?.node || null;
          // const nextOuts = indexes.outgoingBySource.get(nextNodeFinal?.id) || [];

          // if (nextOuts.length > 0 && curNodeId?.id && nextNodeFinal?.id) {
          //   await this.repo.updateWorkitem({ curNodeId: curNodeId?.id, nodeId: nextNodeFinal?.id, userId });
          // }
        }
        if (nextNodeFinal && !variables.isSimulation) {
          const targetNode = nextNodeFinal;
          const role = indexes.laneMap.get(targetNode?.id);
          outs = indexes.outgoingBySource.get(nextNodeFinal?.id) || [];
          const actionCode = outs
            ?.map((flow: any) => flow?.name)
            .filter(Boolean)
            .join(',');

          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: nextNodeFinal.id,
              role: role,
              assigneeUserId: role === curLane ? effectiveUserId : null,
              nodeType: nextNodeFinal.$type,
              actionCode: actionCode,
            },
            tx,
            bpmnVersion,
          );
        }
      }

      // Return COMPLETED: TRUE để báo cho Engine biết task đã xong và chuyển sang node tiếp theo
      return {
        completed: true,
        completedAt: new Date().toISOString(),
        nextNode: nextNodeFinal,
        outs
      };
    });
    this.executor.registerHandler('delete-node-hoan-thanh', async (variables) => {
      const {
        documentId,
        wi,
        tx,
        indexes,
        curLane,
        effectiveUserId,
        bpmnVersion,
        nodeId,
        isActive
      } = variables;
      try {
        if (!isActive) {
          return {
            completed: true,
            completedAt: new Date().toISOString(),
            nextNode: null,
            outs: []
          };
        }
        const outs = indexes.outgoingBySource.get(nodeId) || [];
        const removed = await this.repo.removeWorkItemByConditions({ documentId, actionCode: 'HOAN_THANH_VAN_BAN' }, tx);
        let selectedFlow;
        for (const flow of outs) {
          const condition = flow.conditionExpression?.body;
          const a = true;
          if (condition) {
            // Xóa khoảng trắng và đưa về viết thường (ex: ${onlycxltp==true})
            const conditionStr = condition.toLowerCase().replace(/\s+/g, '');
            const normalize = (str: string) =>
              str
                ?.replace(/^\$\{|\}$/g, '') // bỏ ${ }
                ?.replace(/\s+/g, '')       // bỏ khoảng trắng
                ?.toLowerCase();            // bỏ phân biệt hoa thường
            // Expected condition: Bỏ qua biến lane vì flow này rẽ nhánh theo onlyCxlTP
            const expected = `nextNode==${a}`; // -> 'onlycxltp==true' (Không có dấu '')

            if (normalize(conditionStr) === normalize(expected)) {
              selectedFlow = flow;
              break;
            }
          } else {
            // Tuỳ chọn: Nếu flow không vẽ điều kiện gì thì coi như flow mặc định
            selectedFlow = flow;
            break;
          }
        }
        if (selectedFlow) {

          const { node: targetNode } = this.bpmnEngine.nextInteractiveFromFlow(
            selectedFlow,
            indexes,
          );
          const role = indexes.laneMap.get(targetNode?.id);

          await this.repo.addWorkItem(
            documentId,
            {
              id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              nodeId: targetNode.id,
              role: role,
              assigneeUserId: role === curLane ? effectiveUserId : null,
              nodeType: targetNode.$type,
            },
            tx,
            bpmnVersion,
          );
        }
        return {
          completed: true,
          removed: removed,
        };
      } catch (error) {
        return {
          completed: false,
          removed: false,
        };
      }



    });

    this.executor.registerHandler('checkAllFileSign', async (variables) => {
      const { documentId, indexes, nodeId, tx } = variables;
      const serviceTaskOuts = indexes?.outgoingBySource.get(nodeId) || [];

      if (!serviceTaskOuts.length) {
        return {
          completed: false,
          reason: `ServiceTask ${nodeId} không có outgoing flow`,
          nextNode: null,
          outs: [],
          signAll: false,
        };
      }

      const { node: decisionNode } = this.bpmnEngine.nextInteractiveFromFlow(serviceTaskOuts[0], indexes);
      if (!decisionNode) {
        return {
          completed: false,
          reason: `Không resolve được node sau ServiceTask ${nodeId}`,
          nextNode: null,
          outs: [],
          signAll: false,
        };
      }

      const outs = indexes?.outgoingBySource.get(decisionNode?.id) || [];
      const allFile = await this.filesManagementService.getLatestFilesByObjectLite({
        type: 'docDraft',
        objectId: documentId,
      }, tx);

      const files = allFile?.data || [];

      const unsignedFiles = files.filter(
        (file) => String(file?.is_signed_file) !== '1'
      );

      const signAll = unsignedFiles.length <= 1;

      const normalize = (str: any) =>
        String(str ?? '')
          .replace(/^\$\{|\}$/g, '')
          .replace(/\s+/g, '')
          .toLowerCase();

      const matchesExpectedBool = (condition: string, expected: 'true' | 'false') => {
        const conditionStr = normalize(condition);
        if (!conditionStr) return false;

        if (
          conditionStr === expected ||
          conditionStr.includes(`==${expected}`) ||
          conditionStr.includes(`===${expected}`) ||
          conditionStr.includes(`=='${expected}'`) ||
          conditionStr.includes(`=="${expected}"`) ||
          conditionStr.includes(`==='${expected}'`) ||
          conditionStr.includes(`==="${expected}"`)
        ) {
          return true;
        }

        if (
          (expected === 'true' &&
            (conditionStr.includes('!=false') || conditionStr.includes('!==false'))) ||
          (expected === 'false' &&
            (conditionStr.includes('!=true') || conditionStr.includes('!==true')))
        ) {
          return true;
        }

        const noParen = conditionStr.replace(/[()]/g, '');
        if (expected === 'false' && /^![a-z_][a-z0-9_$.]*$/i.test(noParen)) {
          return true;
        }

        return false;
      };

      // Theo BPMN hiện tại tại Gateway_0vyhuaf:
      // - `${false}` -> sang lane tiếp theo
      // - `${true}`  -> quay lại vòng ký
      let expectedBool;
      switch (signAll) {
        case true:
          expectedBool = 'true';
          break;
        case false:
          expectedBool = 'false';
          break;
        default:
          expectedBool = null;
      }
      if (!expectedBool) {
        return {
          completed: false,
          reason: 'Không xác định được trạng thái file ký của người dùng',
        };
      }

      let selectedFlow;
      for (const flow of outs) {
        const condition = flow.conditionExpression?.body;
        if (condition) {
          if (matchesExpectedBool(condition, expectedBool as 'true' | 'false')) {
            selectedFlow = flow;
            break;
          }
        } else if (!selectedFlow) {
          // fallback flow khi không có condition
          selectedFlow = flow;
        }
      }

      if (!selectedFlow) {
        selectedFlow = outs[0];
        if (!selectedFlow) {
          return {
            completed: false,
            reason: 'Không tìm thấy flow phù hợp cho checkAllFileSign',
            nextNode: null,
            outs: [],
            signAll,
            totalFiles: files.length,
            signAllFiles: signAll,
            flow: selectedFlow
          };
        }
      }

      const { node: nextNodeFinal } = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
      const nextOuts = indexes?.outgoingBySource.get(nextNodeFinal?.id) || [];
      const curProps = getAllNodeExtensionProperties(selectedFlow.targetRef);

      return {
        completed: true,
        signAll,
        totalFiles: files.length,
        nextNode: nextNodeFinal,
        outs: nextOuts,
        curProps,
        signAllFiles: signAll,
        flow: selectedFlow
      };
    });

    this.executor.registerHandler('check_is_stamp', async (variables: any) => {
      const { documentId, payload, indexes, nodeId } = variables;


      // Lấy flag isStamp và reqSignFormatDraft từ payload hoặc variables
      let isStamp = payload?.isStamp ?? variables?.isStamp;
      let reqSignFormatDraft = payload?.reqSignFormatDraft ?? variables?.reqSignFormatDraft;

      // Nếu thiếu, tải từ DB
      if (isStamp === undefined || isStamp === null || reqSignFormatDraft === undefined || reqSignFormatDraft === null) {
        const doc = await this.repo.getOutgoingDocument(documentId);
        if (isStamp === undefined || isStamp === null) isStamp = doc?.isStamp;
        if (reqSignFormatDraft === undefined || reqSignFormatDraft === null) reqSignFormatDraft = doc?.reqSignFormatDraft;
      }

      // Chuẩn hóa về boolean (hỗ trợ true/false, 'true'/'false', 1/0, '1'/'0')
      const isStampBool = isStamp === true || isStamp === 'true' || isStamp === 1 || isStamp === '1';
      const isReqSignFormatDraftBool = reqSignFormatDraft === true || reqSignFormatDraft === 'true' || reqSignFormatDraft === 1 || reqSignFormatDraft === '1';

      // Hợp nhất: nếu một trong hai là true thì coi như cần đóng dấu
      const isNeedStamp = isStampBool || isReqSignFormatDraftBool;
      const expectedBool = isNeedStamp ? 'true' : 'false';


      const serviceTaskOuts = indexes?.outgoingBySource.get(nodeId) || [];
      if (!serviceTaskOuts.length) {
        this.logger.error(`[check_is_stamp] ServiceTask ${nodeId} has no outgoing flows`);
        throw new Error(`ServiceTask ${nodeId} không có outgoing flow`);
      }

      const normalize = (str: string) =>
        str
          ?.replace(/^\$\{|\}$/g, '')
          ?.replace(/\s+/g, '')
          ?.toLowerCase();

      let outs = serviceTaskOuts;
      // Nếu node tiếp theo là Gateway, ta cần lấy các nhánh của Gateway đó
      if (outs.length === 1) {
        const target = outs[0].targetRef;
        if (target?.$type === 'bpmn:ExclusiveGateway' || target?.$type === 'bpmn:InclusiveGateway') {
          outs = indexes.outgoingBySource.get(target.id) || [];
        }
      }

      let selectedFlow: any = null;
      for (const flow of outs) {
        const condition = flow.conditionExpression?.body;
        if (condition) {
          const conditionStr = normalize(condition);
          if (
            conditionStr === expectedBool ||
            conditionStr === (expectedBool === 'true' ? '1' : '0') ||
            conditionStr?.includes(`isstamp==${expectedBool}`) ||
            conditionStr?.includes(`isstamp===${expectedBool}`) ||
            conditionStr?.includes(`isstamp=${expectedBool}`) ||
            conditionStr?.includes(`reqsignformatdraft==${expectedBool}`) ||
            conditionStr?.includes(`reqsignformatdraft===${expectedBool}`) ||
            conditionStr?.includes(`reqsignformatdraft=${expectedBool}`)
          ) {
            selectedFlow = flow;
            break;
          }
        }
      }

      if (!selectedFlow) {
        this.logger.warn(`[check_is_stamp] No flow matched condition, using fallback outs[0]`);
        selectedFlow = outs[0]; // Fallback
      }

      const { node: nextNodeFinal } = this.bpmnEngine.nextInteractiveFromFlow(selectedFlow, indexes);
      const curProps = getAllNodeExtensionProperties(selectedFlow.targetRef);

      return {
        completed: true,
        signAllFiles: true,
        nextNode: nextNodeFinal,
        curProps,
        flow: selectedFlow
      };
    });
  }
}
