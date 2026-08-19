import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject,
    Logger,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Not } from 'typeorm';
import {
    PassportReturnRequestEntity,
    PassportReturnRequestStatus,
    PASSPORT_RETURN_STATUS_LABEL,
    PASSPORT_RETURN_STATUS_HTML_MAP,
} from './entities/passport-return-request.entity';
import { PassportReturnRequestItemEntity } from './entities/passport-return-request-item.entity';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PassportVoucherEntity } from '../passport-vouchers/entities/passport-voucher.entity';
import { PassportVoucherItemEntity } from '../passport-vouchers/entities/passport-voucher-item.entity';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { CreatePassportReturnRequestDto } from './dto/create-passport-return-request.dto';
import { UpdatePassportReturnRequestDto } from './dto/update-passport-return-request.dto';
import { v4 as uuidv4 } from 'uuid';

import BpmnEngineService from '../bpmn/bpmn-engine.service';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { MSSQL_REPO } from '../database/database.provider';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { GroupUserService } from '../group-users/group-users.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { getAllNodeExtensionProperties } from 'src/utils/util';

import { NotificationService } from '../notifycation/notification.service';
import { NotificationKey, NotificationType } from '../notifycation/notification.enum';

@Injectable()
export class PassportReturnRequestsService {
    private readonly logger = new Logger(PassportReturnRequestsService.name);
    private typeDocument = 'PassportReturnRequest';

    constructor(
        @InjectRepository(PassportReturnRequestEntity, 'mssqlConnection')
        private readonly returnRequestRepo: Repository<PassportReturnRequestEntity>,
        @InjectRepository(PassportReturnRequestItemEntity, 'mssqlConnection')
        private readonly itemRepo: Repository<PassportReturnRequestItemEntity>,
        @InjectRepository(PassportEntity, 'mssqlConnection')
        private readonly passportRepo: Repository<PassportEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepo: Repository<UserEntity>,
        @InjectRepository(PassportVoucherEntity, 'mssqlConnection')
        private readonly voucherRepo: Repository<PassportVoucherEntity>,
        @InjectRepository(PassportVoucherItemEntity, 'mssqlConnection')
        private readonly voucherItemRepo: Repository<PassportVoucherItemEntity>,
        @InjectRepository(WorkItemEntity, 'mssqlConnection')
        private readonly workItemRepo: Repository<WorkItemEntity>,
        @InjectRepository(Audit, 'mssqlConnection')
        private readonly auditRepo: Repository<Audit>,

        private readonly runtimeDbService: RuntimeDbService,
        private readonly sqlsvRepo: SQLSVRepository,
        private readonly bpmnEngine: BpmnEngineService,
        private readonly groupUserService: GroupUserService,
        @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
        @Inject(forwardRef(() => SystemLogServiceSql))
        private readonly systemLogService: SystemLogServiceSql,
        @Inject(forwardRef(() => NotificationService))
        private readonly notificationService: NotificationService,
    ) { }

    // =========================================================================
    // BPMN ENGINE HELPER METHODS
    // =========================================================================

    /**
     * Tự động điều hướng Node trong BPMN engine theo actionCode và cập nhật WorkItem + Audit Record
     */
    async moveToNextNode(
        documentId: string,
        userId: string,
        displayName: string,
        actionCode: string,
        actionLabel: string,
        receiverUserId?: string,
        secondaryDocumentId?: string,
    ) {
        try {
            // 1. Lấy work item đang mở hiện tại
            let openWi = await this.workItemRepo.findOne({
                where: { documentId, state: 'open' },
            });

            if (!openWi && secondaryDocumentId) {
                openWi = await this.workItemRepo.findOne({
                    where: { documentId: secondaryDocumentId, state: 'open' },
                });
            }

            if (!openWi) {
                this.logger.warn(`moveToNextNode: Không tìm thấy open workItem cho phiếu ${documentId}`);
                return;
            }

            const currentNodeId = openWi.nodeId;
            const currentRole = openWi.role;
            const bpmnVersion = openWi.bpmnVersion || 'QT_THC_01';

            // 2. Load BPMN XML thông qua MSSQLRepository
            const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
            if (!bpmnXML) {
                this.logger.warn(`moveToNextNode: Không tìm thấy file BPMN XML cho version ${bpmnVersion}`);
                return;
            }

            const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
            const currentNode = indexes.nodes.get(currentNodeId);
            if (!currentNode) {
                this.logger.warn(`moveToNextNode: Không tìm thấy node ${currentNodeId} trong BPMN model`);
                return;
            }

            // 3. Tìm outgoing flow khớp với actionCode
            const outgoingFlows = currentNode.outgoing || [];
            if (outgoingFlows.length === 0) {
                this.logger.warn(`moveToNextNode: Node ${currentNodeId} không có outgoing flow nào`);
                return;
            }

            let flow = outgoingFlows[0];
            if (outgoingFlows.length > 1) {
                const candidateFlows = outgoingFlows.filter((f: any) => {
                    const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
                    return (
                        extProps.actionGroup === actionCode ||
                        extProps.actionCode === actionCode ||
                        f.name === actionCode
                    );
                });

                if (candidateFlows.length > 0) {
                    flow = candidateFlows[0];
                }
            }

            const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

            // 4. Đóng work item cũ cho cả documentId lẫn secondaryDocumentId
            await this.closeOpenWorkItems(documentId, 'completed');
            if (secondaryDocumentId) {
                await this.closeOpenWorkItems(secondaryDocumentId, 'completed');
            }

            const docIdsToSync = [documentId];
            if (secondaryDocumentId && secondaryDocumentId !== documentId) {
                docIdsToSync.push(secondaryDocumentId);
            }

            if (!nextNode) {
                // Kết luồng (End Event) cho cả 2 documentId
                for (const dId of docIdsToSync) {
                    await this.addAuditRecord(dId, {
                        userId,
                        displayName,
                        role: currentRole,
                        actionCode,
                        fromNodeId: currentNodeId,
                        toNodeId: null,
                        createdBy: userId,
                        receiver: receiverUserId || userId,
                        stageStatus: 'DA_XU_LY',
                        curStatusCode: actionCode,
                        typeDocument: this.typeDocument,
                        action: `${actionLabel} (Kết luồng)`,
                    });
                }
                return;
            }

            // 5. Xác định người nhận & Tạo work item mới ở node kế tiếp cho cả documentId và secondaryDocumentId
            const nextNodeId = nextNode.id;
            const nextRole = indexes.laneMap.get(nextNodeId);
            const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? actionCode;

            let assignees: string[] = [];
            if (receiverUserId) {
                assignees = [receiverUserId];
            } else if (nextRole && bpmnVersion) {
                assignees = await this.groupUserService.getGroupIdsByRoleDynamic(bpmnVersion, nextRole);
            }

            if (assignees.length === 0) assignees = [userId];

            for (const dId of docIdsToSync) {
                for (const assigneeId of assignees) {
                    const newWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                    await this.workItemRepo.save({
                        id: newWiId,
                        documentId: dId,
                        nodeId: nextNodeId,
                        role: nextRole || currentRole,
                        assigneeUserId: assigneeId,
                        nodeType: nextNode.$type,
                        state: 'open',
                        createdAt: new Date(),
                        bpmnVersion,
                    });

                    await this.addAuditRecord(dId, {
                        userId,
                        displayName,
                        role: currentRole,
                        actionCode,
                        fromNodeId: currentNodeId,
                        toNodeId: nextNodeId,
                        createdBy: userId,
                        receiver: assigneeId,
                        stageStatus: 'CHUA_XU_LY',
                        curStatusCode: nextStatusCode,
                        typeDocument: this.typeDocument,
                        action: actionLabel,
                    });
                }
            }
        } catch (error) {
            this.logger.error(`moveToNextNode error: ${error.message}`);
        } finally {
            try {
                await this.bpmnEngine.invalidateDocCache(this.typeDocument, documentId);
                if (secondaryDocumentId) {
                    await this.bpmnEngine.invalidateDocCache(this.typeDocument, secondaryDocumentId);
                }
            } catch (e) { }
        }
    }

    /**
     * Helper đóng các WorkItems đang mở
     */
    private async closeOpenWorkItems(documentId: string, state: 'completed' | 'cancelled' = 'completed') {
        try {
            const openItems = await this.workItemRepo.find({
                where: { documentId, state: 'open' },
            });
            for (const wi of openItems) {
                wi.state = state;
                await this.workItemRepo.save(wi);
            }
        } catch (error) {
            this.logger.error(`closeOpenWorkItems error: ${error.message}`);
        }
    }

    /**
     * Helper lưu bản ghi Audit Log hệ thống
     */
    private async addAuditRecord(documentId: string, params: {
        userId: string;
        displayName: string;
        role?: string;
        actionCode: string;
        fromNodeId?: string | null;
        toNodeId?: string | null;
        createdBy?: string;
        receiver?: string;
        groupField?: string;
        stageStatus?: string;
        curStatusCode?: string;
        typeDocument?: string;
        action?: string;
    }) {
        try {
            const audit = this.auditRepo.create({
                documentId,
                userId: params.userId,
                displayName: params.displayName,
                role: params.role || 'Quản lý hộ chiếu',
                actionCode: params.actionCode,
                fromNodeId: params.fromNodeId || null,
                toNodeId: params.toNodeId || null,
                details: params.action || params.actionCode,
                time: new Date(),
                createdBy: params.createdBy || params.userId,
                receiver: params.receiver || null,
            });
            await this.auditRepo.save(audit);
        } catch (error) {
            this.logger.error(`addAuditRecord error: ${error.message}`);
        }
    }

    /**
     * Tự động lấy Node đầu tiên sau StartEvent từ file BPMN XML
     */
    private async getInitialBpmnNode(bpmnVersion: string = 'QT_THC_01'): Promise<{
        startEventId: string;
        nodeId: string;
        nodeType: string;
        role: string;
    }> {
        try {
            const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
            if (bpmnXML) {
                const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
                const startEvent: any = Array.from(indexes.nodes.values()).find(
                    (n: any) => n.$type === 'bpmn:StartEvent' || n.$type === 'StartEvent',
                );

                if (startEvent && startEvent.outgoing && startEvent.outgoing.length > 0) {
                    const firstFlow = startEvent.outgoing[0];
                    const { node: firstNode } = this.bpmnEngine.nextInteractiveFromFlow(firstFlow, indexes);
                    const nodeId = firstNode?.id || firstFlow.targetRef?.id;
                    const role = (nodeId ? indexes.laneMap.get(nodeId) : null) || 'Quản lý hộ chiếu';

                    if (nodeId) {
                        return {
                            startEventId: startEvent.id || 'Event_1c1bd3j',
                            nodeId,
                            nodeType: firstNode?.$type || 'userTask',
                            role,
                        };
                    }
                }
            }
        } catch (error) {
            this.logger.warn(`getInitialBpmnNode error: ${error.message}`);
        }

        return {
            startEventId: 'Event_1c1bd3j',
            nodeId: 'Activity_011x1x7',
            nodeType: 'userTask',
            role: 'Quản lý hộ chiếu',
        };
    }

    /**
     * Tạo mã phiếu trả tự động: PTR-YYYYMMDD-XXX
     */
    private async generateRequestCode(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `PTR-${dateStr}-`;

        const latest = await this.returnRequestRepo.findOne({
            where: { requestCode: Like(`${prefix}%`) },
            order: { createdAt: 'DESC' },
        });

        let nextNum = 1;
        if (latest && latest.requestCode) {
            const parts = latest.requestCode.split('-');
            const lastPart = parts[parts.length - 1];
            const parsed = parseInt(lastPart, 10);
            if (!isNaN(parsed)) {
                nextNum = parsed + 1;
            }
        }

        const numStr = String(nextNum).padStart(3, '0');
        return `${prefix}${numStr}`;
    }

    // =========================================================================
    // BUSINESS SERVICE METHODS
    // =========================================================================

    /**
     * Trạng thái 1: Lưu nháp (DRAFT)
     */
    async create(createDto: CreatePassportReturnRequestDto, userId: string, ipAddress?: string) {
        try {
            // 1. Kiểm tra trùng lặp theo clientRequestId nếu có
            if ((createDto as any).clientRequestId) {
                const existingRequest = await this.returnRequestRepo.findOne({
                    where: {
                        createdBy: userId,
                        clientRequestId: (createDto as any).clientRequestId,
                        status: Not(3),
                        isDeleted: false,
                    },
                });
                if (existingRequest) {
                    const pStatus = existingRequest.processStatus || PassportReturnRequestStatus.DRAFT;
                    return {
                        statusCode: 200,
                        message: 'Tạo phiếu trả hộ chiếu thành công',
                        data: {
                            id: existingRequest.id,
                            requestCode: existingRequest.requestCode,
                            status: existingRequest.status,
                            processStatus: pStatus,
                            processStatusLabel: PASSPORT_RETURN_STATUS_LABEL[pStatus] || 'Lưu nháp',
                        },
                    };
                }
            }

            // 2. Validate thông tin tài khoản chủ hộ chiếu
            const ownerUser = await this.userRepo.findOne({
                where: [
                    { id: createDto.eofficeAccount },
                    { username: createDto.eofficeAccount },
                    { emailUser: createDto.eofficeAccount },
                ],
            });

            // 3. Sinh mã phiếu trả hộ chiếu: PTR-YYYYMMDD-XXX
            const requestCode = await this.generateRequestCode();

            // 4. Khởi tạo đối tượng phiếu trả hộ chiếu: status = 1, processStatus = DRAFT (Lưu nháp)
            const returnRequest = this.returnRequestRepo.create({
                id: uuidv4(),
                requestCode,
                eofficeAccount: ownerUser ? ownerUser.id : createDto.eofficeAccount,
                fullName: createDto.fullName || ownerUser?.name || ownerUser?.fullName || null,
                email: createDto.email || ownerUser?.emailUser || null,
                positionTitle: createDto.positionTitle || null,
                birthday: createDto.birthday ? new Date(createDto.birthday) : null,
                gender: createDto.gender || null,
                identificationCard: createDto.identificationCard || null,
                phoneNumber: createDto.phoneNumber || ownerUser?.phoneNumberUser || null,
                rank: createDto.rank || null,
                unitName: createDto.unitName || null,
                departmentName: createDto.departmentName || null,
                divisionName: createDto.divisionName || null,
                address: createDto.address || null,
                nationality: createDto.nationality || 'Việt Nam',
                countriesVisited: createDto.countriesVisited || null,
                note: createDto.note || null,
                status: 1, // Status = 1: Bản ghi hoạt động (chưa xóa mềm)
                processStatus: PassportReturnRequestStatus.DRAFT, // Trạng thái 1: Lưu nháp
                currentHandlerId: userId,
                bpmnVersion: 'QT_THC_01',
                createdBy: userId,
                updatedBy: userId,
                isDeleted: false,
                clientRequestId: (createDto as any).clientRequestId || null,
            });

            try {
                await this.returnRequestRepo.save(returnRequest);
            } catch (saveError) {
                if ((createDto as any).clientRequestId) {
                    const existingRequest = await this.returnRequestRepo.findOne({
                        where: {
                            createdBy: userId,
                            clientRequestId: (createDto as any).clientRequestId,
                            status: Not(3),
                            isDeleted: false,
                        },
                    });
                    if (existingRequest) {
                        const pStatus = existingRequest.processStatus || PassportReturnRequestStatus.DRAFT;
                        return {
                            statusCode: 200,
                            message: 'Tạo phiếu trả hộ chiếu thành công',
                            data: {
                                id: existingRequest.id,
                                requestCode: existingRequest.requestCode,
                                status: existingRequest.status,
                                processStatus: pStatus,
                                processStatusLabel: PASSPORT_RETURN_STATUS_LABEL[pStatus] || 'Lưu nháp',
                            },
                        };
                    }
                }
                throw saveError;
            }

            // 5. Lưu danh sách hộ chiếu được chọn để trả
            if (createDto.passportListReturn && createDto.passportListReturn.length > 0) {
                const itemsToSave = createDto.passportListReturn.map((item) => {
                    return this.itemRepo.create({
                        id: uuidv4(),
                        returnRequestId: returnRequest.id,
                        passportId: item.passportId || item.id,
                        passportNumber: item.passportNumber || null,
                        passportType: item.passportType || null,
                        fullName: item.fullName || returnRequest.fullName,
                        issueDate: item.issueDate ? new Date(item.issueDate) : null,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        issuePlace: item.issuePlace || null,
                        usageStatus: item.usageStatus || null,
                        eofficeAccount: returnRequest.eofficeAccount,
                        note: item.note || null,
                    });
                });

                await this.itemRepo.save(itemsToSave);
            }

            // 6. Khởi tạo WorkItem ban đầu & Audit log từ sơ đồ BPMN động
            const bpmnUser: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = bpmnUser?.name || userId;
            const bpmnVersion = returnRequest.bpmnVersion || 'QT_THC_01';

            const initialBpmnInfo = await this.getInitialBpmnNode(bpmnVersion);

            await this.workItemRepo.save({
                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                documentId: returnRequest.id,
                nodeId: initialBpmnInfo.nodeId,
                role: initialBpmnInfo.role,
                assigneeUserId: userId,
                nodeType: initialBpmnInfo.nodeType,
                state: 'open',
                createdAt: new Date(),
                bpmnVersion,
            });

            await this.addAuditRecord(returnRequest.id, {
                userId,
                displayName,
                role: initialBpmnInfo.role,
                actionCode: '1.Tạo phiếu trả hộ chiếu',
                fromNodeId: initialBpmnInfo.startEventId,
                toNodeId: initialBpmnInfo.nodeId,
                action: `Tạo mới phiếu trả hộ chiếu ${returnRequest.requestCode} (Lưu nháp)`,
            });

            // 7. Ghi System Log
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'Tạo phiếu trả',
                    details: `Tạo phiếu trả hộ chiếu thành công: ${returnRequest.requestCode} (Lưu nháp)`,
                    method: 'POST',
                    status: 'SUCCESS',
                    type: 'PASSPORT_RETURN_REQUESTS',
                    subType: 'CREATE',
                    userInfo: userId,
                    ipAddress: ipAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (e) { }

            // 8. Trả về kết quả
            return {
                statusCode: 200,
                message: 'Tạo phiếu trả hộ chiếu thành công',
                data: {
                    id: returnRequest.id,
                    requestCode: returnRequest.requestCode,
                    status: returnRequest.status,
                    processStatus: returnRequest.processStatus,
                    processStatusLabel: (returnRequest.processStatus && PASSPORT_RETURN_STATUS_LABEL[returnRequest.processStatus]) || 'Lưu nháp',
                },
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi tạo phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Lấy chi tiết phiếu trả hộ chiếu (bao gồm WorkItems & Audit Logs)
     */
    async findOne(id: string, userId?: string) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
                relations: ['items'],
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại hoặc đã bị xóa');
            }

            // Lấy thông tin user chủ hộ chiếu
            const ownerUser = await this.userRepo.findOne({
                where: [
                    { id: request.eofficeAccount },
                    { username: request.eofficeAccount },
                    { emailUser: request.eofficeAccount },
                ],
            });

            // Lấy thông tin biên bản nếu có voucherId
            let voucher: PassportVoucherEntity | null = null;
            if (request.voucherId) {
                voucher = await this.voucherRepo.findOne({
                    where: { id: request.voucherId },
                    relations: ['items'],
                });
            }

            // Lấy WorkItems và Audit Logs của phiếu
            const [workItems, auditLogs] = await Promise.all([
                this.workItemRepo.find({
                    where: { documentId: id },
                    order: { createdAt: 'DESC' },
                }),
                this.auditRepo.find({
                    where: { documentId: id },
                    order: { time: 'DESC' },
                }),
            ]);

            const passportListReturn = (request.items || []).map((item) => ({
                id: item.passportId,
                passportId: item.passportId,
                passportNumber: item.passportNumber,
                passportType: item.passportType,
                fullName: item.fullName,
                expiryDate: item.expiryDate,
                issueDate: item.issueDate,
                issuePlace: item.issuePlace,
                usageStatus: item.usageStatus,
                eofficeAccount: request.eofficeAccount,
                label: `${item.passportNumber || ''} - ${item.fullName || ''}`.trim(),
            }));

            const pStatus = request.processStatus || PassportReturnRequestStatus.DRAFT;
            const processStatusLabel = PASSPORT_RETURN_STATUS_LABEL[pStatus] || pStatus;
            const processStatusHtml = PASSPORT_RETURN_STATUS_HTML_MAP[pStatus] ||
                `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#F3F4F6;color:#374151;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #D1D5DB;">${processStatusLabel}</div>`;

            // Tính toán danh sách hành động khả dụng (availableAction & availableActions)
            let availableActions: any[] = [];
            let availableAction: string[] = [];

            try {
                const bpmnVersion = request.bpmnVersion || 'QT_THC_01';
                const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion);
                const openWorkItems = workItems.filter(wi => wi.state === 'open');

                if (bpmnXML && openWorkItems.length > 0) {
                    const { process, indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
                    for (const wi of openWorkItems) {
                        const res = await this.bpmnEngine.computeAvailableActions({
                            process,
                            indexes,
                            currentNodeId: wi.nodeId || '',
                            workItem: wi as any,
                            document: request,
                            userId: userId || 'SYSTEM',
                            userRoles: [],
                            userGroupIds: [],
                            getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
                            audit: auditLogs as any[],
                        });
                        if (res && res.availableActions) {
                            availableActions.push(...res.availableActions);
                        }
                    }
                }
            } catch (e) {
                this.logger.warn(`computeAvailableActions warning: ${e.message}`);
            }

            // Fallback / Quy định danh sách các hành động có thể thực hiện theo quy trình
            const isOwner = userId && (request.eofficeAccount === userId || request.currentHandlerId === userId);
            const isHandler = userId && (request.createdBy === userId || request.currentHandlerId === userId || !request.currentHandlerId);

            // if (pStatus === PassportReturnRequestStatus.DRAFT) {
            //     if (!userId || isHandler) {
            //         availableAction = ['CREATE_VOUCHER', 'SIGN_VOUCHER', 'CANCEL'];
            //     }
            // } else if (pStatus === PassportReturnRequestStatus.WAITING_SIGN) {
            //     if (!userId || isOwner || isHandler) {
            //         availableAction = ['OWNER_SIGN', 'OWNER_REJECT'];
            //     }
            // } else if (pStatus === PassportReturnRequestStatus.REJECTED) {
            //     if (!userId || isHandler) {
            //         availableAction = ['UPDATE', 'CREATE_VOUCHER', 'SIGN_VOUCHER', 'CANCEL'];
            //     }
            // }

            if (availableActions.length > 0) {
                const bpmnActionCodes = availableActions.map(a => a.actionCode || a.actionGroup || a.id).filter(Boolean);
                availableAction = Array.from(new Set([...availableAction, ...bpmnActionCodes]));
            }

            return {
                ...request,
                items: undefined, // Bỏ trường items khỏi chi tiết phiếu trả
                processStatus: processStatusHtml,
                processStatusRaw: pStatus,
                processStatusLabel,
                // availableAction,
                availableActions,
                eofficeAccountInfo: ownerUser
                    ? {
                        id: ownerUser.id,
                        nameVn: ownerUser.name || ownerUser.fullName,
                        username: ownerUser.username,
                        email: ownerUser.emailUser,
                    }
                    : request.eofficeAccount,
                passportListReturn,
                voucher,
                workItems,
                auditLogs,
            };
        } catch (error) {
            this.logger.error(`Lỗi khi lấy chi tiết phiếu trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi lấy chi tiết phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách phiếu trả hộ chiếu (Chỉ lấy bản ghi chưa xóa status != 3)
     */
    async findAll(query: any, userId?: string) {
        try {
            const page = Math.max(1, parseInt(query?.page || '1', 10));
            const limit = Math.max(1, Math.min(100, parseInt(query?.limit || '25', 10)));
            const skip = (page - 1) * limit;

            const qb = this.returnRequestRepo
                .createQueryBuilder('req')
                .where('req.isDeleted = :isDeleted AND req.status != 3', { isDeleted: false });

            if (query?.processStatus) {
                qb.andWhere('req.processStatus = :processStatus', { processStatus: query.processStatus });
            }

            if (query?.eofficeAccount) {
                qb.andWhere('(req.eofficeAccount = :eofficeAccount OR req.currentHandlerId = :eofficeAccount)', {
                    eofficeAccount: query.eofficeAccount,
                });
            }

            if (query?.q) {
                const searchTerm = `%${query.q.trim()}%`;
                qb.andWhere(
                    '(req.requestCode LIKE :q OR req.fullName LIKE :q OR req.email LIKE :q OR req.note LIKE :q)',
                    { q: searchTerm },
                );
            }

            // Subquery 1: Đếm số lượng hộ chiếu trong phiếu trả (item.length)
            qb.addSelect((subQuery) => {
                return subQuery
                    .select('COUNT(item.id)', 'totalItems')
                    .from(PassportReturnRequestItemEntity, 'item')
                    .where('item.returnRequestId = req.id');
            }, 'totalItems');

            // Subquery 2: Đếm tổng số hộ chiếu của chủ sở hữu này đang có trong hệ thống
            qb.addSelect((subQuery) => {
                return subQuery
                    .select('COUNT(p.id)', 'totalOwnerPassports')
                    .from(PassportEntity, 'p')
                    .where('p.eofficeAccount = req.eofficeAccount AND p.isDeleted = :isDeleted', { isDeleted: false });
            }, 'totalOwnerPassports');

            qb.orderBy('req.createdAt', 'DESC').skip(skip).take(limit);

            const [entities, total] = await Promise.all([
                qb.getRawAndEntities().then(res => {
                    return res.entities.map((entity, index) => {
                        const rawRow = res.raw[index];
                        const totalItems = parseInt(rawRow?.totalItems || '0', 10);
                        const totalOwnerPassports = parseInt(rawRow?.totalOwnerPassports || '0', 10);
                        const passportCount = `${totalItems}/${totalOwnerPassports}`;

                        const pStatus = entity.processStatus || PassportReturnRequestStatus.DRAFT;
                        const processStatusLabel = PASSPORT_RETURN_STATUS_LABEL[pStatus] || pStatus;
                        const processStatusHtml = PASSPORT_RETURN_STATUS_HTML_MAP[pStatus] ||
                            `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#F3F4F6;color:#374151;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #D1D5DB;">${processStatusLabel}</div>`;

                        return {
                            ...entity,
                            items: undefined,            // KHÔNG trả về mảng items chi tiết
                            processStatus: processStatusHtml,
                            processStatusRaw: pStatus,
                            processStatusLabel,          // "Lưu nháp" | "Chờ ký nhận" | "Đã trả" | "Trả lại"
                            passportCount,               // Dạng chuỗi "3/10"
                            totalItems,                  // Số lượng HC trong phiếu trả
                            totalOwnerPassports,         // Tổng số HC sở hữu của user
                        };
                    });
                }),
                qb.getCount(),
            ]);

            return {
                statusCode: 200,
                message: 'Lấy danh sách phiếu trả hộ chiếu thành công',
                data: entities,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            this.logger.error(`Lỗi khi lấy danh sách phiếu trả hộ chiếu: ${error.message}`, error.stack);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi khi lấy danh sách phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Bước 2 (Gộp): QLHC Lập biên bản & Ký số biên bản trả hộ chiếu -> Chuyển đến Chủ hộ chiếu (WAITING_SIGN)
     */
    async createVoucher(id: string, userId: string, payload: any) {
        return this.signVoucherAndSend(id, userId, payload);
    }

    /**
     * Bước 2b: Trạng thái 2: Chờ ký nhận (WAITING_SIGN)
     * QLHC ký biên bản trả hộ chiếu & chuyển phiếu đến Chủ hộ chiếu
     */
    async signVoucherAndSend(id: string, userId: string, payload: any) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
                relations: ['items'],
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            // 1. Kiểm tra trạng thái phiếu hợp lệ để ký
            if (request.processStatus === PassportReturnRequestStatus.RETURNED || request.processStatus === PassportReturnRequestStatus.CANCELLED) {
                throw new BadRequestException('Phiếu trả hộ chiếu không ở trạng thái chờ ký hoặc đã hoàn tất/hủy');
            }

            // Lấy thông tin người ký (QLHC)
            const qlhcUser = await this.userRepo.findOne({ where: { id: userId } });
            const ownerUser = await this.userRepo.findOne({
                where: [
                    { id: request.eofficeAccount },
                    { username: request.eofficeAccount },
                ],
            });

            // 2. Kiểm tra quyền ký biên bản của người dùng
            const currentHandler = request.currentHandlerId || request.createdBy;
            if (userId !== 'SYSTEM' && currentHandler && currentHandler !== userId && request.createdBy !== userId) {
                throw new BadRequestException('Bạn không có quyền ký biên bản phiếu trả hộ chiếu này');
            }

            // 3. Tạo hoặc lấy biên bản (PassportVoucher)
            let voucher: PassportVoucherEntity | null = null;
            if (request.voucherId) {
                voucher = await this.voucherRepo.findOne({ where: { id: request.voucherId } });
            }

            const expectedVoucherCode = `BBT-${request.requestCode}`;
            if (!voucher) {
                voucher = await this.voucherRepo.findOne({
                    where: [
                        { requestId: request.id },
                        { voucherCode: expectedVoucherCode },
                    ],
                });
            }

            if (!voucher) {
                voucher = this.voucherRepo.create({
                    id: uuidv4(),
                    voucherCode: expectedVoucherCode,
                    voucherType: 'RETURN',
                });
            }

            voucher.requestId = request.id;
            voucher.unitName = payload?.unitName || request.unitName;
            voucher.departmentName = payload?.departmentName || request.departmentName;
            voucher.performerId = userId;
            voucher.performerName = payload?.performerName || qlhcUser?.name || qlhcUser?.fullName || 'Quản lý hộ chiếu';
            voucher.performerSignature = payload?.performerSignature || qlhcUser?.name || 'DIGITAL_SIGNED_QLHC';
            voucher.performerSignedAt = new Date();
            voucher.receiverId = payload?.receiverId || (ownerUser ? ownerUser.id : request.eofficeAccount);
            voucher.receiverName = payload?.receiverName || request.fullName || ownerUser?.name || 'Chủ hộ chiếu';
            voucher.note = payload?.note || request.note;
            voucher.status = 'WAIT_RECEIVER_SIGN'; // Chờ chủ hộ chiếu ký nhận
            voucher.createdBy = voucher.createdBy || userId;
            voucher.updatedBy = userId;

            const savedVoucher = await this.voucherRepo.save(voucher);

            // 4. Lưu items của biên bản (Lọc theo selectedItemIds và ghi nhận itemNotes nếu có)
            let itemsToSave = request.items || [];
            if (payload?.selectedItemIds && Array.isArray(payload.selectedItemIds) && payload.selectedItemIds.length > 0) {
                const selectedSet = new Set(payload.selectedItemIds.map(String));
                itemsToSave = itemsToSave.filter(i => selectedSet.has(String(i.id)) || selectedSet.has(String(i.passportId)));
            }

            if (itemsToSave.length > 0) {
                await this.voucherItemRepo.delete({ voucherId: savedVoucher.id });

                const voucherItems = itemsToSave.map((item) => {
                    const itemNote = payload?.itemNotes
                        ? (payload.itemNotes[item.id] || payload.itemNotes[item.passportId] || item.note)
                        : item.note;

                    return this.voucherItemRepo.create({
                        id: uuidv4(),
                        voucherId: savedVoucher.id,
                        requestId: null,
                        passportId: item.passportId,
                        fullName: item.fullName,
                        passportNumber: item.passportNumber,
                        passportType: item.passportType,
                        expiryDate: item.expiryDate,
                        note: itemNote || null,
                    });
                });

                await this.voucherItemRepo.save(voucherItems);
            }

            // 5. Cập nhật phiếu trả hộ chiếu sang Trạng thái 2: WAITING_SIGN (Chờ ký nhận)
            const ownerUserId = ownerUser ? ownerUser.id : request.eofficeAccount;
            request.voucherId = savedVoucher.id;
            request.processStatus = PassportReturnRequestStatus.WAITING_SIGN; // Trạng thái 2: Chờ ký nhận
            request.currentHandlerId = ownerUserId;
            request.updatedBy = userId;

            await this.returnRequestRepo.save(request);

            // 6. Chuyển node tự động qua BpmnEngineService
            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || qlhcUser?.name || userId;

            await this.moveToNextNode(
                request.id,
                userId,
                displayName,
                'CHUYEN_PHIEU',
                'Ký biên bản trả hộ chiếu và chuyển đến Chủ hộ chiếu (Chờ ký nhận)',
                ownerUserId,
                savedVoucher.id,
            );

            if (ownerUserId && ownerUserId !== userId) {
                try {
                    await this.notificationService.create({
                        recipientId: ownerUserId,
                        senderId: userId,
                        content: `Bạn có phiếu trả hộ chiếu mới ${request.requestCode} cần ký nhận.`,
                        key: NotificationKey.VIEW_PASSPORT_RETURN_SLIP,
                        type: NotificationType.PASSPORT_RETURN_SIGNED.value,
                        recordId: request.id,
                    });
                } catch (err) {
                    this.logger.warn(`Lỗi gửi thông báo cho ownerUserId ${ownerUserId}: ${err.message}`);
                }
            }

            return this.findOne(request.id);
        } catch (error) {
            this.logger.error(`Lỗi khi ký biên bản trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi ký biên bản trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Bước 3: Chủ hộ chiếu Tiếp nhận phiếu trả hộ chiếu (TIEP_NHAN)
     */
    async receiveRequest(id: string, userId: string) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            if (request.processStatus !== PassportReturnRequestStatus.WAITING_SIGN && (request.processStatus as any) !== 'WAITING_OWNER_RECEIVE') {
                throw new BadRequestException('Phiếu trả hộ chiếu không ở trạng thái chờ tiếp nhận');
            }

            const ownerId = request.eofficeAccount;
            if (userId !== 'SYSTEM' && userId !== ownerId && request.currentHandlerId !== userId) {
                throw new BadRequestException('Bạn không có quyền tiếp nhận phiếu trả hộ chiếu này');
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || userId;
            const voucherId = request.voucherId || undefined;

            await this.moveToNextNode(
                request.id,
                userId,
                displayName,
                'TIEP_NHAN',
                'Chủ hộ chiếu đã tiếp nhận phiếu trả hộ chiếu',
                userId,
                voucherId,
            );

            if (request.createdBy && request.createdBy !== userId) {
                try {
                    await this.notificationService.create({
                        recipientId: request.createdBy,
                        senderId: userId,
                        content: `Chủ hộ chiếu đã tiếp nhận phiếu trả hộ chiếu ${request.requestCode}.`,
                        key: NotificationKey.VIEW_PASSPORT_RETURN_SLIP,
                        type: NotificationType.PASSPORT_RETURN_SIGNED.value,
                        recordId: request.id,
                    });
                } catch (err) {
                    this.logger.warn(`Lỗi gửi thông báo cho createdBy ${request.createdBy}: ${err.message}`);
                }
            }

            return this.findOne(request.id);
        } catch (error) {
            this.logger.error(`Lỗi khi tiếp nhận phiếu trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi tiếp nhận phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Trạng thái 3: Đã trả (RETURNED)
     * Chủ hộ chiếu ký nhận hộ chiếu -> Hoàn tất quy trình & Cập nhật trạng thái hộ chiếu về STORING
     */
    async ownerReceiveAndSign(id: string, userId: string, payload: any) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
                relations: ['items'],
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            // 1. Kiểm tra trạng thái phiếu: Phải đang ở trạng thái WAITING_SIGN (Chờ ký nhận)
            if (request.processStatus !== PassportReturnRequestStatus.WAITING_SIGN && (request.processStatus as any) !== 'WAITING_OWNER_RECEIVE') {
                throw new BadRequestException('Phiếu trả hộ chiếu không ở trạng thái chờ chủ hộ chiếu ký nhận hoặc đã hoàn tất');
            }

            // 2. Kiểm tra quyền ký nhận: Chỉ chính chủ eofficeAccount mới có quyền ký nhận
            const ownerId = request.eofficeAccount;
            if (userId !== 'SYSTEM' && userId !== ownerId && request.currentHandlerId !== userId) {
                throw new BadRequestException('Bạn không có quyền ký nhận biên bản phiếu trả hộ chiếu này');
            }

            // 3. Cập nhật thông tin chữ ký bên nhận vào biên bản voucher
            if (request.voucherId) {
                const voucher = await this.voucherRepo.findOne({ where: { id: request.voucherId } });
                if (voucher) {
                    const receiverUser = await this.userRepo.findOne({ where: { id: userId } });
                    const receiverName = receiverUser?.name || receiverUser?.fullName || request.fullName || 'Chủ hộ chiếu';

                    voucher.receiverId = userId;
                    voucher.receiverName = receiverName;
                    voucher.receiverSignature = payload?.receiverSignature || receiverName;
                    voucher.receiverSignedAt = new Date();
                    voucher.status = 'COMPLETED';
                    voucher.updatedBy = userId;
                    await this.voucherRepo.save(voucher);
                }
            }

            // 4. Cập nhật trạng thái của tất cả hộ chiếu trong phiếu về 'RETURNED' (Đã trả / Vô hiệu hóa)
            if (request.items && request.items.length > 0) {
                const passportIds = request.items.map((i) => i.passportId).filter(Boolean);
                if (passportIds.length > 0) {
                    await this.passportRepo.update(
                        { id: In(passportIds) },
                        { usageStatus: 'RETURNED' },
                    );
                }
            }

            // 5. Cập nhật phiếu trả hộ chiếu sang Trạng thái 3: RETURNED (Đã trả)
            request.processStatus = PassportReturnRequestStatus.RETURNED; // Trạng thái 3: Đã trả
            request.currentHandlerId = null;
            request.updatedBy = userId;

            await this.returnRequestRepo.save(request);

            // 6. Chuyển node tự động qua BpmnEngineService (KY_NHAN)
            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || userId;

            const voucherId = request.voucherId || undefined;
            await this.moveToNextNode(
                request.id,
                userId,
                displayName,
                'KY_NHAN',
                'Chủ hộ chiếu đã ký nhận hộ chiếu (Đã trả)',
                undefined,
                voucherId,
            );

            if (request.createdBy && request.createdBy !== userId) {
                try {
                    await this.notificationService.create({
                        recipientId: request.createdBy,
                        senderId: userId,
                        content: `Chủ hộ chiếu đã ký nhận hoàn thành phiếu trả hộ chiếu ${request.requestCode}.`,
                        key: NotificationKey.VIEW_PASSPORT_RETURN_SLIP,
                        type: NotificationType.PASSPORT_RETURN_COMPLETED.value,
                        recordId: request.id,
                    });
                } catch (err) {
                    this.logger.warn(`Lỗi gửi thông báo hoàn thành cho createdBy ${request.createdBy}: ${err.message}`);
                }
            }

            return this.findOne(request.id);
        } catch (error) {
            this.logger.error(`Lỗi khi ký nhận hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi ký nhận hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Trạng thái 4: Trả lại (REJECTED)
     * Chủ hộ chiếu trả lại phiếu do thông tin chưa chính xác
     */
    async ownerRejectRequest(id: string, userId: string, reason?: string) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            // 1. Kiểm tra trạng thái phiếu
            if (request.processStatus !== PassportReturnRequestStatus.WAITING_SIGN && (request.processStatus as any) !== 'WAITING_OWNER_RECEIVE') {
                throw new BadRequestException('Phiếu trả hộ chiếu không ở trạng thái chờ ký nhận để trả lại');
            }

            // 2. Kiểm tra quyền trả lại: Chỉ chính chủ eofficeAccount hoặc người đang giữ phiếu mới có quyền trả lại
            const ownerId = request.eofficeAccount;
            if (userId !== 'SYSTEM' && userId !== ownerId && request.currentHandlerId !== userId) {
                throw new BadRequestException('Bạn không có quyền trả lại phiếu trả hộ chiếu này');
            }

            // Cập nhật Trạng thái 4: REJECTED (Trả lại)
            request.processStatus = PassportReturnRequestStatus.REJECTED; // Trạng thái 4: Trả lại
            request.currentHandlerId = request.createdBy;
            if (reason) {
                request.note = request.note
                    ? `${request.note}\n[Chủ HC trả lại]: ${reason}`
                    : `[Chủ HC trả lại]: ${reason}`;
            }
            request.updatedBy = userId;

            await this.returnRequestRepo.save(request);

            // Xóa các biên bản cũ liên quan đến phiếu trả hộ chiếu này
            try {
                const expectedVoucherCode = `BBT-${request.requestCode}`;
                const oldVouchers = await this.voucherRepo.find({
                    where: [
                        { requestId: request.id },
                        { id: request.voucherId || '00000000-0000-0000-0000-000000000000' },
                        { voucherCode: expectedVoucherCode },
                    ],
                });

                if (oldVouchers.length > 0) {
                    const voucherIds = oldVouchers.map((v) => v.id);
                    for (const vId of voucherIds) {
                        await this.voucherItemRepo.delete({ voucherId: vId });
                        await this.voucherRepo.delete({ id: vId });
                    }
                }
            } catch (err) {
                this.logger.warn(`Lỗi khi xóa biên bản cũ của phiếu trả ${request.id}: ${err.message}`);
            }

            request.voucherId = null;

            // Chuyển node tự động qua BpmnEngineService (TRA_LAI)
            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || userId;

            await this.moveToNextNode(
                request.id,
                userId,
                displayName,
                'TRA_LAI',
                `Trả lại phiếu trả hộ chiếu. Lý do: ${reason || 'Thông tin chưa đúng'}`,
                request.createdBy || undefined,
            );

            if (request.createdBy && request.createdBy !== userId) {
                try {
                    await this.notificationService.create({
                        recipientId: request.createdBy,
                        senderId: userId,
                        content: `Chủ hộ chiếu đã trả lại phiếu trả hộ chiếu ${request.requestCode}. Lý do: ${reason || 'Thông tin chưa đúng'}`,
                        key: NotificationKey.VIEW_PASSPORT_RETURN_SLIP,
                        type: NotificationType.PASSPORT_RETURN_REJECTED.value,
                        recordId: request.id,
                    });
                } catch (err) {
                    this.logger.warn(`Lỗi gửi thông báo trả lại cho createdBy ${request.createdBy}: ${err.message}`);
                }
            }

            return this.findOne(request.id);
        } catch (error) {
            this.logger.error(`Lỗi khi trả lại phiếu trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi trả lại phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Chỉnh sửa phiếu trả hộ chiếu (QLHC)
     */
    async update(id: string, dto: UpdatePassportReturnRequestDto, userId: string) {
        try {
            // Không load relations để tránh cascade re-save gây lỗi NULL return_request_id
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            // Cập nhật thông tin phiếu trực tiếp bằng UPDATE (không dùng save để tránh cascade)
            await this.returnRequestRepo.update(id, {
                fullName: dto.fullName ?? request.fullName,
                email: dto.email ?? request.email,
                positionTitle: dto.positionTitle !== undefined ? dto.positionTitle : request.positionTitle,
                note: dto.note !== undefined ? dto.note : request.note,
                unitName: dto.unitName !== undefined ? dto.unitName : request.unitName,
                departmentName: dto.departmentName !== undefined ? dto.departmentName : request.departmentName,
                divisionName: dto.divisionName !== undefined ? dto.divisionName : request.divisionName,
                updatedBy: userId,
            });

            // Cập nhật danh sách hộ chiếu nếu được truyền lại
            if (dto.passportListReturn && dto.passportListReturn.length > 0) {
                // Xóa items cũ trực tiếp qua itemRepo (không qua cascade)
                await this.itemRepo.delete({ returnRequestId: id });

                const newItems = dto.passportListReturn.map((item) => {
                    return this.itemRepo.create({
                        id: uuidv4(),
                        returnRequestId: id,
                        passportId: item.passportId || item.id,
                        passportNumber: item.passportNumber || null,
                        passportType: item.passportType || null,
                        fullName: item.fullName || request.fullName,
                        issueDate: item.issueDate ? new Date(item.issueDate) : null,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        issuePlace: item.issuePlace || null,
                        usageStatus: item.usageStatus || null,
                        eofficeAccount: request.eofficeAccount,
                        note: item.note || null,
                    });
                });

                await this.itemRepo.save(newItems);
            }

            // Ghi Audit Log qua BpmnEngine
            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || userId;

            await this.addAuditRecord(request.id, {
                userId,
                displayName,
                role: 'Quản lý hộ chiếu',
                actionCode: '5. Chính sửa phiếu trả hộ chiếu',
                fromNodeId: 'Activity_0ik2ham',
                toNodeId: 'Activity_0ik2ham',
                action: `QLHC chỉnh sửa thông tin phiếu trả hộ chiếu ${request.requestCode}`,
            });

            return this.findOne(request.id);
        } catch (error) {
            this.logger.error(`Lỗi khi cập nhật phiếu trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi cập nhật phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Hủy / Xóa mềm phiếu trả hộ chiếu (Đặt status = 3, isDeleted = true)
     */
    async cancel(id: string, userId: string) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            // Cập nhật status = 3 (Xóa mềm bản ghi) và processStatus = REJECTED
            request.status = 3;
            request.isDeleted = true;
            request.processStatus = PassportReturnRequestStatus.REJECTED;
            request.currentHandlerId = null;
            request.updatedBy = userId;

            await this.returnRequestRepo.save(request);

            // Chuyển node tự động qua BpmnEngineService (HUY_PHIEU)
            const user: any = await this.sqlsvRepo.getUserById(userId);
            const displayName = user?.name || userId;

            await this.moveToNextNode(
                request.id,
                userId,
                displayName,
                'HUY_PHIEU',
                `Hủy phiếu trả hộ chiếu ${request.requestCode} - Kết luồng (Đã xóa mềm)`,
            );

            return {
                statusCode: 200,
                message: 'Hủy phiếu trả hộ chiếu thành công (đã xóa mềm)',
                data: { id: request.id, status: 3, isDeleted: true },
            };
        } catch (error) {
            this.logger.error(`Lỗi khi hủy phiếu trả hộ chiếu ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi hủy phiếu trả hộ chiếu: ${error.message}`);
        }
    }

    /**
     * Lấy riêng danh sách các hộ chiếu của phiếu trả (PassportReturnRequestItems)
     */
    async getReturnRequestItems(id: string, userId?: string) {
        try {
            const request = await this.returnRequestRepo.findOne({
                where: { id, isDeleted: false, status: Not(3) },
                relations: ['items'],
            });

            if (!request) {
                throw new NotFoundException('Phiếu trả hộ chiếu không tồn tại');
            }

            const items = (request.items || []).map((item) => ({
                id: item.id,
                returnRequestId: item.returnRequestId,
                passportId: item.passportId,
                passportNumber: item.passportNumber,
                passportType: item.passportType,
                fullName: item.fullName,
                issueDate: item.issueDate,
                expiryDate: item.expiryDate,
                issuePlace: item.issuePlace,
                usageStatus: item.usageStatus,
                eofficeAccount: item.eofficeAccount,
                note: item.note,
            }));

            return {
                statusCode: 200,
                message: 'Lấy danh sách hộ chiếu của phiếu trả thành công',
                data: {
                    returnRequestId: request.id,
                    requestCode: request.requestCode,
                    processStatus: request.processStatus,
                    totalItems: items.length,
                    items,
                },
            };
        } catch (error) {
            this.logger.error(`Lỗi khi lấy danh sách hộ chiếu của phiếu trả ${id}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi lấy danh sách hộ chiếu của phiếu trả: ${error.message}`);
        }
    }

    /**
     * Xóa mềm 1 hoặc nhiều phiếu trả hộ chiếu (method DELETE nhận mảng ids)
     */
    async softDelete(ids: string[], userId: string) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new BadRequestException('Danh sách id cần xóa không được để trống');
        }

        const success: string[] = [];
        const failed: { id: string; reason: string }[] = [];

        for (const id of ids) {
            try {
                const request = await this.returnRequestRepo.findOne({
                    where: { id, isDeleted: false },
                });

                if (!request) {
                    failed.push({ id, reason: 'Phiếu trả hộ chiếu không tồn tại hoặc đã bị xóa' });
                    continue;
                }

                if (request.processStatus !== PassportReturnRequestStatus.DRAFT) {
                    failed.push({
                        id,
                        reason: `Chỉ được xóa phiếu ở trạng thái Lưu nháp. Phiếu trả hộ chiếu ${request.requestCode || id} đang ở trạng thái khác (${request.processStatus})`,
                    });
                    continue;
                }

                request.status = 3;
                request.isDeleted = true;
                request.processStatus = PassportReturnRequestStatus.CANCELLED;
                request.currentHandlerId = null;
                request.updatedBy = userId;

                await this.returnRequestRepo.save(request);

                try {
                    await this.closeOpenWorkItems(request.id, 'cancelled');
                } catch (e) {
                    this.logger.warn(`Lỗi đóng work items khi xóa mềm phiếu trả ${id}: ${e.message}`);
                }

                success.push(id);
            } catch (error) {
                failed.push({ id, reason: error.message || 'Lỗi khi xóa' });
            }
        }

        if (success.length === 0 && failed.length > 0) {
            const reasons = failed.map((f) => f.reason).join('; ');
            throw new BadRequestException({
                message: reasons,
                failed,
            });
        }

        return {
            statusCode: 200,
            message: `Đã xóa ${success.length}/${ids.length} phiếu trả hộ chiếu thành công`,
            deleted: success,
            failed,
        };
    }
}
