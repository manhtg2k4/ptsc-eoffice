// src/bpmn/bpmn-engine.service.ts - reload cache trigger
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
// import * as BpmnModdle from 'bpmn-moddle';
import actionCatalog from '../variable/action-catalog';
import { getAllNodeExtensionProperties, mapStringToBoolean, parseFlagsButton } from 'src/utils/util';
import { trusted } from 'mongoose';
import { GROUP_CODES, stageStatusDoc, stageStatusMapV2 } from 'src/variable/CONST_STATUS';
import { GroupUserService } from 'src/group-users/group-users.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { ServiceTaskExecutorService } from 'src/service-task/service-task-executor.service';
import Redis from 'ioredis';
const BpmnModdle = require('bpmn-moddle');
const readFile = promisify(fs.readFile);

interface FlowElement {
    id: string;
    name?: string;
    $type: string;
    sourceRef?: { id: string };
    targetRef?: { id: string; $type?: string };
    default?: { id: string };
}
export interface BpmnProcess {
    id: string;
    flowElements?: any[];
    laneSets?: any[];
}

export interface BpmnDefinitions {
    rootElements: any[];
}

export interface BpmnIndexes {
    nodes: Map<string, any>;
    outgoingBySource: Map<string, any[]>;
    laneMap: Map<string, string>;
    laneMapName: Map<string, string>;
    lanes: Array<{ id: string; name: string; role: string; properties: Record<string, string> }>;
}

export interface NextInteractiveResult {
    node?: any;
    passed: any[];
}

export interface AvailableAction {
    code: string;
    label: string;
    type: 'transfer' | 'return' | 'complete';
    selectionMode: 'single' | 'multi';
    targetRole?: string;
    targetRoles?: string[];
    flowId?: string;
    requiresAssignee?: boolean;
    candidates?: any[];
    returnTo?: { userId: string; displayName?: string };
    subActions?: AvailableAction[];
    canExecute: boolean;
}

export interface ComputeActionsResult {
    node: any;
    availableActions: AvailableAction[];
    flags: {
        canProcess: boolean;
        canReturn: boolean;
        canComplete: boolean;
        canApproveProposals?: boolean;
        canProposedTreatment?: boolean;
    };
}

@Injectable()
export class BpmnEngineService {
    private moddle: any;
    private readonly ACTION_CACHE_TTL_SECONDS = 180;

    constructor(
        @Inject(forwardRef(() => GroupUserService))
        private readonly groupUserService: GroupUserService,
        @Inject('MSSQL_REPO')
        private readonly repo: MSSQLRepository,
        private readonly serviceTaskExecutor: ServiceTaskExecutorService,
        @Inject('REDIS_CLIENT') private readonly redis: Redis,
    ) {
        this.moddle = new BpmnModdle();  // OK
    }

    // Chuyển tên tiếng Việt → role code (VD: "Phòng Hành chính" → PHONG_HANH_CHINH)
    toRoleCode(name?: string): string | undefined {
        if (!name) return undefined;

        // 1. Tách dấu tiếng Việt
        const normalized = name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''); // xoá dấu

        // 2. Đổi đ -> d
        const replaced = normalized.replace(/đ/gi, 'd');

        // 3. Chuyển về ASCII + xử lý role code
        return replaced
            .replace(/[^A-Za-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toUpperCase();
    }


    private isInteractive(el: any): boolean {
        return !!el && (
            el.$type === 'bpmn:UserTask' ||
            el.$type === 'bpmn:ExclusiveGateway' ||
            el.$type === 'bpmn:InclusiveGateway' ||
            el.$type === 'bpmn:ServiceTask'
            // || el.$type === 'bpmn:ManualTask'
        );
    }


    public getCamundaProperties(node: any) {
        const result: Record<string, any> = {};
        if (!node?.extensionElements?.values) return result;

        for (const ext of node.extensionElements.values) {
            if (ext.$type === "camunda:properties") {
                const props = ext.values || ext.$children || [];
                for (const p of props) {
                    result[p.name] = p.value;
                }
            }
        }
        return result;
    }

    private checkAllowSendToUnit(node: any): boolean {
        if (!node) return false;
        const value = String(
            node?.extensionElements?.values?.[0]?.$children
                ?.find((p: any) => p.name === 'allowSendToUnit')?.value ??
            node?.extensionElements?.values?.[0]?.values
                ?.find((p: any) => p.name === 'allowSendToUnit')?.value
        ).toLowerCase();
        return value === 'true';
    }

    /**
     * Đọc extension properties từ flow để định nghĩa action một cách linh hoạt
     * @param flow - BPMN flow element
     * @returns Object chứa các thuộc tính: actionLabel, actionType, actionGroup, actionCode, selectionMode, groupLabel, flags
     */
    public getFlowExtensionProperties(flow: any): {
        flagInTask?: string;
        flagNotNextNode?: string;
        flagGctGph?: string;
        actionLabel?: string;
        actionType?: string;
        actionSecType?: string;
        actionGroup?: string;
        actionCode?: string;
        selectionMode?: 'single' | 'multi';
        groupLabel?: string;
        flags?: string;
        flagsButton?: string;
        ROLE_XIN_Y_KIEN?: string;
        order?: number;
        requiredGroup?: string;
        childProcessKey?: string;
        assignmentType?: string;
        isClone?: string;
        isFurtherAssign?: string;
        recallClone?: string;
    } {
        if (!flow?.extensionElements?.values) return {};

        const props: any = {};
        for (const ext of flow.extensionElements.values) {
            if (ext.$type === 'camunda:properties') {
                const values = ext.values || ext.$children || [];
                for (const p of values) {
                    if (p.name === 'actionLabel') props.actionLabel = p.value;
                    if (p.name === 'actionType') props.actionType = p.value;
                    if (p.name === 'actionSecType') props.actionSecType = p.value;
                    if (p.name === 'actionGroup') props.actionGroup = p.value;
                    if (p.name === 'actionCode') props.actionCode = p.value;
                    if (p.name === 'groupLabel') props.groupLabel = p.value;
                    if (p.name === 'flags') props.flags = p.value;
                    if (p.name === 'flagsButton') {
                        props.flagsButton = props.flagsButton ? `${props.flagsButton},${p.value}` : p.value;
                    }
                    if (p.name === 'flagNotNextNode') props.flagNotNextNode = p.value;
                    if (p.name === 'flagInTask') props.flagInTask = p.value;
                    if (p.name === 'flagGctGph') props.flagGctGph = p.value;
                    if (p.name === 'selectionMode' && (p.value === 'single' || p.value === 'multi')) {
                        props.selectionMode = p.value;
                    }
                    if (p.name === 'ROLE_XIN_Y_KIEN') props.ROLE_XIN_Y_KIEN = p.value;
                    if (p.name === 'order') props.order = Number(p.value);
                    if (p.name === 'requiredGroup') props.requiredGroup = p.value;
                    if (p.name === 'childProcessKey') props.childProcessKey = p.value;
                    if (p.name === 'assignmentType') props.assignmentType = p.value;
                    if (p.name === 'isClone') props.isClone = p.value;
                    if (p.name === 'isFurtherAssign') props.isFurtherAssign = p.value;
                    if (p.name === 'recallClone') props.recallClone = p.value;
                }
            }
        }
        return props;
    }
    public getLaneProperties(lane: any): Record<string, string> {
        const bo = lane?.businessObject || lane; // hỗ trợ bpmn-js

        if (!bo?.extensionElements?.values) return {};

        const result: Record<string, string> = {};

        for (const ext of bo.extensionElements.values) {
            if (ext.$type !== 'camunda:properties') continue;

            const values = ext.values || ext.$children || [];

            for (const p of values) {
                if (p?.name && p?.value !== undefined) {
                    result[p.name] = p.value;
                }
            }
        }

        return result;
    }
    public getLanePropertiesByRole(
        lanes: [{
            id: string;
            name: string;
            role: string;
            properties: Record<string, string>;
        }],
        role: string
    ): Record<string, string> | null {
        if (!role) return null;

        const lane = lanes.find(l => l.role === role);

        return lane ? lane.properties : null;
    }

    /**
     * Parse keySign từ BPMN extension property
     * Format: "default: ./., 1: //, 2: /./"
     * @param keySignValue - Giá trị chuỗi keySign từ BPMN
     * @param signOrder - Thứ tự ký hiện tại
     * @returns Giá trị keySign tương ứng hoặc default
     */
    public async parseKeySign(keySignValue?: string, signOrder?: number, indexes?: any, documentId?: string): Promise<string | null> {
        if (!keySignValue) return null;
        const allNode = indexes?.nodes;
        const keySignMap: Record<string, string> = {};

        // Parse chuỗi "default: ./., 1: //, 2: /./"
        const entries = keySignValue.split(',').map(e => e.trim());

        for (const entry of entries) {
            const [key, value] = entry.split(':').map(s => s.trim());
            if (key && value) {
                keySignMap[key] = value;
            }
        }
        if (keySignMap?.location) {
            const [signType, position] = keySignMap.location.split('-');
            const numberPosition = Number(position);

            const signOrderArr = await this.repo.getSignersFromOutgoingDocumentUsers(
                documentId || '',
                signType,
                1
            );

            if (Array.isArray(signOrderArr) && signOrderArr.length > 0) {

                let targetItem;

                if (numberPosition === 1) {
                    // Lấy sign_order lớn nhất
                    targetItem = signOrderArr.reduce((max, cur) =>
                        cur.sign_order > max.sign_order ? cur : max
                    );
                }
                else if (numberPosition === -1) {
                    // Lấy sign_order nhỏ nhất
                    targetItem = signOrderArr.reduce((min, cur) =>
                        cur.sign_order < min.sign_order ? cur : min
                    );
                }

                if (targetItem?.sign_key) {
                    return targetItem.sign_key;
                }
            }

            // Fallback theo location như cũ
            const location = Number(position);
            return keySignMap[location] || null;
        }

        // Ưu tiên lấy theo signOrder, nếu không có thì lấy default
        if ((signOrder !== undefined && signOrder !== null)) {
            const orderKey = String(signOrder);
            if (keySignMap[orderKey]) {
                return keySignMap[orderKey];
            }
        }

        return keySignMap['default'] || null;
    }

    async loadBpmn(
        filePath: string
    ): Promise<{ definitions: BpmnDefinitions; process: BpmnProcess }> {

        const absPath = path.resolve(filePath);
        const xml = await readFile(absPath, 'utf8');

        const { rootElement } = await this.moddle.fromXML(xml);

        const definitions = rootElement as unknown as BpmnDefinitions;

        const process = this.getMainProcess(definitions) as BpmnProcess;

        if (!process) {
            throw new Error('No bpmn:Process found in diagram');
        }

        return { definitions, process };
    }
    async loadBpmnFromString(
        xmlContent: string
    ): Promise<{ definitions: BpmnDefinitions; process: BpmnProcess }> {
        const { rootElement } = await this.moddle.fromXML(xmlContent);
        const definitions = rootElement as unknown as BpmnDefinitions;
        const process = this.getMainProcess(definitions) as BpmnProcess;

        if (!process) {
            throw new Error('No bpmn:Process found in diagram');
        }

        return { definitions, process };
    }



    private getMainProcess(definitions: BpmnDefinitions): BpmnProcess | null {
        const processes = (definitions.rootElements || []).filter(e => e.$type === 'bpmn:Process');
        if (processes.length > 0) return processes[0];

        const collaborations = (definitions.rootElements || []).filter(e => e.$type === 'bpmn:Collaboration');
        for (const col of collaborations) {
            for (const p of col.participants || []) {
                if (p.processRef) return p.processRef;
            }
        }
        return null;
    }

    buildIndexes(process: BpmnProcess): BpmnIndexes {
        const nodes = new Map<string, any>();
        const outgoingBySource = new Map<string, any[]>();
        const laneMap = new Map<string, string>();
        const laneMapName = new Map<string, string>();
        const lanes: Array<{ id: string; name: string; role: string; properties: Record<string, string> }> = [];

        for (const el of process.flowElements || []) {
            if (el.$type === 'bpmn:SequenceFlow' && el.sourceRef?.id) {
                if (!outgoingBySource.has(el.sourceRef.id)) {
                    outgoingBySource.set(el.sourceRef.id, []);
                }
                outgoingBySource.get(el.sourceRef.id)!.push(el);
            } else if (el.id) {
                nodes.set(el.id, el);
            }
        }

        for (const laneSet of process.laneSets || []) {
            for (const lane of laneSet.lanes || []) {
                // const role = this.toRoleCode(lane.name || lane.id);
                const role = this.getLaneProperties(lane).candidateGroups;
                if (role) {
                    lanes.push({ id: lane.id, name: lane.name || '', role, properties: this.getLaneProperties(lane) });
                    for (const ref of lane.flowNodeRef || []) {
                        if (ref?.id) {
                            laneMap.set(ref.id, role);
                            laneMapName.set(ref.id, lane.name || '');
                        }
                    }
                }
            }
        }

        // Mark default flows
        for (const node of nodes.values()) {
            if (node.default?.id) {
                const outs = outgoingBySource.get(node.id) || [];
                for (const f of outs) {
                    if (f.id === node.default.id) f.__isDefault = true;
                }
            }
        }

        return { nodes, outgoingBySource, laneMap, laneMapName, lanes };
    }
    /**
     * Lấy tất cả SequenceFlow trong BPMN Process (kể cả trong SubProcess)
     */
    async getAllSequenceFlowsFromXML(
        bpmnXML: string
    ): Promise<Array<any>> {

        const moddle = new BpmnModdle();
        const result: Array<any> = [];

        const { rootElement } = await moddle.fromXML(bpmnXML);

        // 🔹 tìm process
        const process = rootElement.rootElements.find(
            (el: any) => el.$type === 'bpmn:Process'
        );

        if (!process) return result;

        const visit = (elements?: any[]) => {
            if (!elements) return;

            for (const el of elements) {
                // ⚠️ đúng type là bpmn:SequenceFlow (S viết hoa)
                if (el.$type === 'bpmn:SequenceFlow') {
                    result.push(el);
                }

                // SubProcess / EventSubProcess
                if (el.flowElements && Array.isArray(el.flowElements)) {
                    visit(el.flowElements);
                }
            }
        };

        visit(process.flowElements);
        return result;
    }

    nextNodeByFlow(
        flow: any,
        indexes: any,
    ): { node: any | null; flow: any | null } {

        if (!flow?.targetRef?.id) {
            return { node: null, flow: null };
        }

        const node = indexes.nodes.get(flow.targetRef.id) || null;

        return {
            node,
            flow,
        };
    }


    nextInteractiveFromFlow(flow: any, indexes: any): { node: any, passed: any[] } {
        try {
            const { nodes, laneMap, outgoingBySource } = indexes;

            let cur = flow?.targetRef?.id ? nodes.get(flow.targetRef.id) : null;
            if (!cur) return { node: undefined, passed: [] };

            const passed: any[] = [];
            const visited = new Set<string>();

            let sourceNode = flow?.sourceRef?.id ? nodes.get(flow.sourceRef.id) : null;
            // Lưu sourceNode ban đầu để kiểm tra luồng
            const initialSourceNode = sourceNode;
            const isInitialSourceInclusiveGateway = initialSourceNode?.$type === 'bpmn:InclusiveGateway';
            const isInitialSourceStartEvent = initialSourceNode?.$type === 'bpmn:StartEvent';
            let count = 0;
            while (cur) {
                if (visited.has(cur.id)) {
                    cur = undefined;
                    break;
                }
                visited.add(cur.id);

                const isUserTask = cur.$type === 'bpmn:UserTask';
                const isSourceUserTask = sourceNode && sourceNode.$type === 'bpmn:UserTask';
                const isSourceExclusiveGateway =
                    sourceNode && sourceNode.$type === 'bpmn:ExclusiveGateway';
                const isManualTask = cur.$type === 'bpmn:ManualTask';
                const isSourceManualTask = sourceNode?.$type === 'bpmn:ManualTask';
                const isExclusiveGateway = cur.$type === 'bpmn:ExclusiveGateway';
                const isInclusiveGateway = cur.$type === 'bpmn:InclusiveGateway';
                const isSourceStartTask = sourceNode.$type === "bpmn:StartEvent";
                const isGateway = isExclusiveGateway || isInclusiveGateway; // Check chung cho Gateway

                const outs = outgoingBySource.get(cur.id) || [];
                const firstOut = outs[0];
                const isInclusiveGatewayOut = firstOut?.targetRef?.$type === 'bpmn:InclusiveGateway';
                const secondOut = outs[1];

                const nextNodeFromOut = firstOut?.targetRef;

                const nextNodeFromSecondOut = secondOut?.targetRef;
                // Lấy object node tiếp theo từ danh sách nodes để kiểm tra kỹ hơn
                const nextNodeObj = nextNodeFromSecondOut ? nodes.get(nextNodeFromSecondOut?.id) : null;

                // ========================================================================
                // RULE NEW: Gateway (1) → UserTask → Gateway (2) ==> DỪNG Ở Gateway (2)
                // Logic: Bỏ qua Gateway đầu và UserTask ở giữa
                // ========================================================================
                // if (isGateway && nextNodeObj?.$type === 'bpmn:UserTask' && count !== 1 && !isSourceManualTask) {
                //     // Kiểm tra đường đi ra của UserTask kế tiếp
                //     const nextNodeOuts = outgoingBySource.get(nextNodeObj.id) || [];

                //     // Chỉ xử lý nếu đường đi là tuyến tính (1 đường ra)
                //     if (nextNodeOuts.length === 1) {
                //         const nextNextFlow = nextNodeOuts[0];
                //         const nextNextNode = nextNextFlow?.targetRef ? nodes.get(nextNextFlow.targetRef.id) : null;

                //         // Kiểm tra nếu node sau UserTask là một Gateway nữa
                //         if (nextNextNode && (
                //             nextNextNode.$type === 'bpmn:ExclusiveGateway' ||
                //             nextNextNode.$type === 'bpmn:InclusiveGateway'
                //         )) {
                //             // 1. Ghi nhận đã đi qua Gateway hiện tại
                //             passed.push(cur);

                //             // 2. Ghi nhận đã đi qua UserTask ở giữa
                //             passed.push(nextNodeObj);

                //             // 3. Nhảy cóc đến Gateway thứ 2
                //             sourceNode = nextNodeObj; // UserTask trở thành source của bước tiếp theo
                //             cur = nextNextNode;       // Gateway 2 trở thành node hiện tại

                //             // 4. Tiếp tục vòng lặp (để xử lý tiếp tại Gateway 2)
                //             continue;
                //         }
                //     }
                // }
                if (isGateway && nextNodeObj?.$type === 'bpmn:UserTask' && count == 1 && !isManualTask && isInitialSourceStartEvent) {
                    // Kiểm tra đường đi ra của UserTask kế tiếp
                    const nextNodeOuts = outgoingBySource.get(nextNodeObj.id) || [];

                    // Chỉ xử lý nếu đường đi là tuyến tính (1 đường ra)
                    if (nextNodeOuts.length === 1) {
                        const nextNextFlow = nextNodeOuts[0];
                        const nextNextNode = nextNextFlow?.targetRef ? nodes.get(nextNextFlow.targetRef.id) : null;

                        // Kiểm tra nếu node sau UserTask là một Gateway nữa
                        if (nextNextNode && (
                            nextNextNode.$type === 'bpmn:ExclusiveGateway' ||
                            nextNextNode.$type === 'bpmn:InclusiveGateway'
                        )) {
                            // 1. Ghi nhận đã đi qua Gateway hiện tại
                            passed.push(cur);

                            // 2. Ghi nhận đã đi qua UserTask ở giữa
                            passed.push(nextNodeObj);

                            // 3. Nhảy cóc đến Gateway thứ 2
                            sourceNode = nextNodeObj; // UserTask trở thành source của bước tiếp theo
                            cur = nextNextNode;       // Gateway 2 trở thành node hiện tại

                            // 4. Tiếp tục vòng lặp (để xử lý tiếp tại Gateway 2)
                            continue;
                        }
                    }
                }


                if (isUserTask && outs.length === 0 && !isSourceExclusiveGateway) {
                    cur = sourceNode;
                    break;
                }
                // if (isUserTask && !isSourceUserTask && isSourceExclusiveGateway && count === 0) {
                //     cur = flow?.targetRef?.id ? nodes.get(flow.targetRef.id) : undefined;
                //     break;
                // }
                // ===============================
                // 1 RULE: ExclusiveGateway → UserTask → SKIP ở node tiếp theo cho phép dùng lại ngay ở usertask
                // ===============================
                // if (isSourceExclusiveGateway && isUserTask) {
                //     passed.push(cur);

                //     const outs = outgoingBySource.get(cur.id) || [];
                //     if (outs.length !== 1 && outs.length === 0) {
                //         cur = cur
                //         // cur = undefined;
                //         break;
                //     }

                //     const nextFlow = outs[0];
                //     sourceNode = cur;
                //     cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                //     count++;
                //     continue;
                // }

                // ===============================
                // 2 RULE: UserTask → UserTask → DO NOT SKIP
                // ===============================
                if (isSourceUserTask && isUserTask &&
                    nextNodeFromOut?.$type !== 'bpmn:ReceiveTask' &&
                    nextNodeFromOut?.$type !== 'bpmn:InclusiveGateway') {
                    break; // interactive, stop here
                }

                // ===============================
                // 3 RULE: Skip non-interactive nodes
                // ===============================
                if (!this.isInteractive(cur)) {
                    passed.push(cur);


                    const outs = outgoingBySource.get(cur.id) || [];
                    if (outs.length === 0) {
                        if (cur.$type === 'bpmn:EndEvent') {
                            break;
                        } else {
                            cur = undefined;
                            break;
                        }
                    }
                    const nextFlow = outs[0];
                    sourceNode = cur;
                    cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                    count++;
                    continue;
                }
                // ===============================
                // 4. RULE: ManualTask → UserTask + có ExclusiveGateway sau → skip ManualTask
                // ===============================
                // if (isSourceManualTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:ExclusiveGateway') {
                //     passed.push(cur);

                //     if (outs.length !== 1) {
                //         cur = undefined;
                //         break;
                //     }

                //     sourceNode = cur;
                //     cur = firstOut.targetRef?.id ? nodes.get(firstOut.targetRef.id) : undefined;
                //     continue;
                // }

                // ===============================
                // 5. RULE: UserTask → ReceiveTask → bỏ qua ReceiveTask
                // ===============================
                if (isSourceUserTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:ReceiveTask') {
                    const receiveOuts = outgoingBySource.get(nextNodeFromOut.id) || [];
                    if (receiveOuts.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    passed.push(nextNodeFromOut);
                    const nextFlow = receiveOuts[0];
                    cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                    sourceNode = nextNodeFromOut;
                    continue;
                }

                // ===============================
                // 6 RULE: Skip node usetask nếu trước nó là 1 manual node và sau nó chỉ đi đến 1 luồng
                // ===============================
                if (isManualTask && isUserTask && outs.length === 1) {
                    passed.push(cur);

                    const outs = outgoingBySource.get(cur.id) || [];
                    if (outs.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    const nextFlow = outs[0];
                    sourceNode = cur;
                    cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                    break;
                }
                // ===============================
                // 7 node source là 1 startevent và node cur là 1 usetask và node next là includegatewaay
                // ===============================
                if (isSourceStartTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:InclusiveGateway') {
                    passed.push(cur);

                    const outs = outgoingBySource.get(cur.id) || [];
                    if (outs.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    const nextFlow = outs[0];
                    sourceNode = cur;
                    cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                    break;
                }
                // if(isExclusiveGateway)

                // ===============================
                // 8 Found interactive node → stop
                // ===============================
                break;
            }

            return { node: cur, passed };
        } catch (e) {
            throw new Error(`nextInteractiveFromFlow: ${e.message}`);
        }
    }

    findNextGatewayFromFlow(
        flow: any,
        indexes: any,
    ): { node: any; passed: any[] } {
        const { nodes, outgoingBySource } = indexes;

        let cur = flow?.targetRef?.id ? nodes.get(flow.targetRef.id) : null;
        if (!cur) return { node: undefined, passed: [] };

        const passed: any[] = [];
        const visited = new Set<string>();

        while (cur) {
            if (visited.has(cur.id)) {
                cur = undefined;
                break;
            }
            visited.add(cur.id);

            const isGateway =
                cur.$type === 'bpmn:ExclusiveGateway' ||
                cur.$type === 'bpmn:InclusiveGateway';

            // 🎯 gặp Gateway đầu tiên thì dừng
            if (isGateway) {
                return { node: cur, passed };
            }

            passed.push(cur);

            const outs = outgoingBySource.get(cur.id) || [];

            if (outs.length === 0) break;

            let nextFlow;
            if (outs.length === 1) {
                nextFlow = outs[0];
            } else {
                // Nếu có nhiều đường ra, ưu tiên lấy flow default, nếu không có thì lấy flow đầu tiên
                nextFlow = outs.find(f => f.__isDefault) || outs[0];
            }

            cur = nextFlow.targetRef?.id
                ? nodes.get(nextFlow.targetRef.id)
                : undefined;
        }

        return { node: undefined, passed };
    }


    nextInteractiveFromFlowOutGoing(flow: any, indexes: any): { node: any, passed: any[] } {
        try {
            const { nodes, outgoingBySource } = indexes;

            // Bảo vệ ngay từ đầu
            if (!flow || !flow.targetRef?.id) {
                return { node: undefined, passed: [] };
            }

            let cur = nodes.get(flow.targetRef.id) || null;
            if (!cur) return { node: undefined, passed: [] };

            const passed: any[] = [];
            const visited = new Set<string>();

            let sourceNode = flow.sourceRef?.id ? nodes.get(flow.sourceRef.id) : null;
            let count = 0;

            while (cur) {
                if (visited.has(cur.id)) {
                    cur = undefined;
                    break;
                }
                visited.add(cur.id);

                const isUserTask = cur.$type === 'bpmn:UserTask';
                const isManualTask = cur.$type === 'bpmn:ManualTask'; // sửa: ManualTask → Task (chuẩn BPMN)
                const isExclusiveGateway = cur.$type === 'bpmn:ExclusiveGateway';
                const isInclusiveGateway = cur.$type === 'bpmn:InclusiveGateway';
                const isReceiveTask = cur.$type === 'bpmn:ReceiveTask';
                const isGateway = isExclusiveGateway || isInclusiveGateway; // Check chung cho Gateway
                const isSourceUserTask = sourceNode?.$type === 'bpmn:UserTask';
                const isSourceManualTask = sourceNode?.$type === 'bpmn:ManualTask';
                const isSourceExclusiveGateway = sourceNode?.$type === 'bpmn:ExclusiveGateway';

                const outs = outgoingBySource.get(cur.id) || [];
                const firstOut = outs[0];
                const secondOut = outs[1];
                const nextNodeFromOut = firstOut?.targetRef;
                const nextNodeFromSecondOut = secondOut?.targetRef;
                // Lấy object node tiếp theo từ danh sách nodes để kiểm tra kỹ hơn
                const nextNodeObj = nextNodeFromSecondOut ? nodes.get(nextNodeFromSecondOut?.id) : null;

                // ========================================================================
                // RULE NEW: Gateway (1) → UserTask → Gateway (2) ==> DỪNG Ở Gateway (2)
                // Logic: Bỏ qua Gateway đầu và UserTask ở giữa
                // ========================================================================
                if (isGateway && nextNodeObj?.$type === 'bpmn:UserTask') {
                    // Kiểm tra đường đi ra của UserTask kế tiếp
                    const nextNodeOuts = outgoingBySource.get(nextNodeObj.id) || [];

                    // Chỉ xử lý nếu đường đi là tuyến tính (1 đường ra)
                    if (nextNodeOuts.length === 1) {
                        const nextNextFlow = nextNodeOuts[0];
                        const nextNextNode = nextNextFlow?.targetRef ? nodes.get(nextNextFlow.targetRef.id) : null;

                        // Kiểm tra nếu node sau UserTask là một Gateway nữa
                        if (nextNextNode && (
                            nextNextNode.$type === 'bpmn:ExclusiveGateway' ||
                            nextNextNode.$type === 'bpmn:InclusiveGateway'
                        )) {
                            // 1. Ghi nhận đã đi qua Gateway hiện tại
                            passed.push(cur);

                            // 2. Ghi nhận đã đi qua UserTask ở giữa
                            passed.push(nextNodeObj);

                            // 3. Nhảy cóc đến Gateway thứ 2
                            sourceNode = nextNodeObj; // UserTask trở thành source của bước tiếp theo
                            cur = nextNextNode;       // Gateway 2 trở thành node hiện tại

                            // 4. Tiếp tục vòng lặp (để xử lý tiếp tại Gateway 2)
                            continue;
                        }
                    }
                }
                // ===============================
                // 1. RULE: ExclusiveGateway → UserTask → SKIP (nếu chỉ có 1 đường ra)
                // ===============================
                if (isSourceExclusiveGateway && isUserTask) {
                    passed.push(cur);

                    if (outs.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    sourceNode = cur;
                    cur = firstOut.targetRef?.id ? nodes.get(firstOut.targetRef.id) : undefined;
                    count++;
                    continue;
                }

                // ===============================
                // 2. RULE: UserTask → UserTask → DỪNG (interactive)
                // ===============================
                if (isSourceUserTask && isUserTask &&
                    nextNodeFromOut?.$type !== 'bpmn:ReceiveTask' &&
                    nextNodeFromOut?.$type !== 'bpmn:InclusiveGateway') {
                    break;
                }

                // ===============================
                // 3. RULE: Bỏ qua các node không tương tác (ServiceTask, ScriptTask, v.v.)
                // ===============================
                // if (!this.isInteractive(cur)) {
                if (!this.isInteractive(cur)) {
                    passed.push(cur);

                    if (outs.length === 0) {
                        cur = undefined;
                        break;
                    }
                    sourceNode = cur;
                    cur = firstOut.targetRef?.id ? nodes.get(firstOut.targetRef.id) : undefined;
                    continue;
                }

                // ===============================
                // 4. RULE: ManualTask → UserTask + có ExclusiveGateway sau → skip ManualTask
                // ===============================
                if (isSourceManualTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:ExclusiveGateway') {
                    passed.push(cur);

                    if (outs.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    sourceNode = cur;
                    cur = firstOut.targetRef?.id ? nodes.get(firstOut.targetRef.id) : undefined;
                    continue;
                }

                // ===============================
                // 5. RULE: UserTask → ReceiveTask → bỏ qua ReceiveTask
                // ===============================
                if (isSourceUserTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:ReceiveTask') {
                    const receiveOuts = outgoingBySource.get(nextNodeFromOut.id) || [];
                    if (receiveOuts.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    passed.push(nextNodeFromOut);
                    const nextFlow = receiveOuts[0];
                    cur = nextFlow.targetRef?.id ? nodes.get(nextFlow.targetRef.id) : undefined;
                    sourceNode = nextNodeFromOut;
                    continue;
                }

                // ===============================
                // 6. RULE: InclusiveGateway sau UserTask → skip UserTask trung gian
                // ===============================
                if (isSourceUserTask && isUserTask && nextNodeFromOut?.$type === 'bpmn:InclusiveGateway') {
                    passed.push(cur);

                    if (outs.length !== 1) {
                        cur = undefined;
                        break;
                    }

                    sourceNode = cur;
                    cur = firstOut.targetRef?.id ? nodes.get(firstOut.targetRef.id) : undefined;
                    count++;
                    continue;
                }

                // ===============================
                // 7. RULE: Đã tìm thấy node tương tác → DỪNG
                // ===============================
                if (this.isInteractive(cur)) {
                    // if (this.isInteractive(cur)) {
                    break;
                }

                // Nếu không rơi vào case nào → thoát vòng lặp (tránh vòng lặp vô hạn)
                cur = undefined;
            }

            return { node: cur, passed };
        } catch (e) {
            console.error('nextInteractiveFromFlowOutGoing error:', e);
            return { node: undefined, passed: [] };
        }
    }
    resolveReturnTarget(flow: any, indexes: BpmnIndexes, currentRole?: string): { node?: any; role?: string } {
        const { laneMap, outgoingBySource } = indexes;
        let { node } = this.nextInteractiveFromFlow(flow, indexes);
        let hops = 0;

        while (node && hops++ < 50) {
            const role = laneMap.get(node.id);
            if (role && role !== currentRole) {
                return { node, role };
            }
            const outs = outgoingBySource.get(node.id) || [];
            if (outs.length !== 1) break;
            const next = this.nextInteractiveFromFlow(outs[0], indexes);
            if (!next.node || next.node.id === node.id) break;
            node = next.node;
        }

        return node ? { node, role: laneMap.get(node.id) } : { node: undefined, role: undefined };
    }

    private async findNextSelectedSignerStepForAction({
        currentNode,
        indexes,
        documentId,
        maxDepth = 10,
    }: {
        currentNode: any;
        indexes: BpmnIndexes;
        documentId?: string;
        maxDepth?: number;
    }): Promise<{ nextNode: any; typeSign: string | null; skippedSteps: string[] }> {
        if (!currentNode || !documentId) {
            return { nextNode: null, typeSign: null, skippedSteps: [] };
        }

        const queue: Array<{ node: any; skippedSteps: string[]; depth: number }> = [
            { node: currentNode, skippedSteps: [], depth: 0 },
        ];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current?.node || current.depth >= maxDepth || visited.has(current.node.id)) {
                continue;
            }
            visited.add(current.node.id);

            const outs = (indexes.outgoingBySource.get(current.node.id) || [])
                .filter((flow: any) => {
                    const name = String(flow.name || '').toUpperCase();
                    return !name.includes('TRA_LAI') && !name.includes('XIN_Y_KIEN');
                });

            for (const flow of outs) {
                const { node: nextNode } = this.nextInteractiveFromFlow(flow, indexes);
                if (!nextNode || visited.has(nextNode.id)) continue;

                if (nextNode.$type === 'bpmn:EndEvent') {
                    continue;
                }

                const nextProps = getAllNodeExtensionProperties(nextNode);
                const typeSign = nextProps.signerRequired || nextProps.processRequired || null;

                if (typeSign === 'signStamp') {
                    return { nextNode, typeSign, skippedSteps: current.skippedSteps };
                }

                if (typeSign) {
                    const hasPendingSigner = await this.hasPendingOutgoingDocumentSigner(documentId, typeSign);
                    if (hasPendingSigner) {
                        return { nextNode, typeSign, skippedSteps: current.skippedSteps };
                    }
                }

                queue.push({
                    node: nextNode,
                    skippedSteps: typeSign ? [...current.skippedSteps, typeSign] : current.skippedSteps,
                    depth: current.depth + 1,
                });
            }
        }

        return { nextNode: null, typeSign: null, skippedSteps: [] };
    }

    private getSignerTypeFromNode(node: any): string | null {
        const props = getAllNodeExtensionProperties(node);
        return props?.signerRequired || props?.processRequired || null;
    }

    private async hasPendingOutgoingDocumentSigner(
        documentId?: string,
        signerType?: string | null,
    ): Promise<boolean> {
        if (!documentId || !signerType) return false;
        if (this.isOfficialSignerType(signerType)) {
            const signers = await this.repo.getAllSignersFromOutgoingDocumentUsers(documentId);
            return (signers || []).some((signer: any) =>
                Number(signer?.is_signed || 0) === 0 && this.isOfficialSignerType(signer?.signer_type),
            );
        }
        const signers = await this.repo.getSignersFromOutgoingDocumentUsers(documentId, signerType);
        return Array.isArray(signers) && signers.length > 0;
    }

    private isOfficialSignerType(signerType?: string | null): boolean {
        return ['officialSigner1', 'officialSigner2', 'officialSigner3'].includes(String(signerType || ''));
    }

    private async buildSubActionForFlow(
        flow: any,
        indexes: BpmnIndexes,
        getUsersByRole: (role: string) => Promise<any[]> | any[],
        immediateTarget?: any,
    ): Promise<any> {
        const flags: Record<string, boolean> = {};
        // Đọc extension properties từ flow
        const extProps = this.getFlowExtensionProperties(flow);
        const flagsButton: Record<string, any> = {};
        if (extProps.flagsButton) {
            const entries = extProps.flagsButton
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            for (const entry of entries) {
                const [key, value] = entry.split(':').map(s => s.trim());

                if (key) {
                    let finalValue: any = value;
                    if (value === 'true') {
                        finalValue = true;
                    } else if (value === 'false') {
                        finalValue = false;
                    }
                    flagsButton[key] = finalValue ?? true;
                }
            }
        }
        // Ưu tiên extension properties, fallback về action-catalog
        const rawCode = extProps.actionCode || actionCatalog.inclusiveSubActionFor(flow.name);
        const code = rawCode || flow.name || `SUB_${flow.id}`;
        const { node: nextNode } = this.nextInteractiveFromFlow(flow, indexes);
        const targetRole = nextNode ? indexes.laneMap.get(nextNode.id) : undefined;
        const targetRoleName = nextNode ? indexes.laneMapName.get(nextNode.id) : undefined;
        const candidates = targetRole ? await this.resolveCandidates(getUsersByRole, targetRole) : [];

        // Kiểm tra allowSendToUnit từ immediateTarget hoặc nextNode
        const targetNodeForCheck = immediateTarget || nextNode;
        const canTransferRoom = this.checkAllowSendToUnit(targetNodeForCheck);
        // const meta = actionCatalog.actions[code] || { label: flow.name || code };
        const meta = this.classifyAction(code);
        if (extProps.actionType) {
            meta.type = extProps.actionType;
        }
        if (extProps.actionSecType) {
            meta.secType = extProps.actionSecType;
        }
        if (extProps.selectionMode) {
            meta.selectionMode = extProps.selectionMode;
        }
        if (extProps.flags) {
            const flagKeys = extProps.flags.split(',').map(k => k.trim());
            for (const flagKey of flagKeys) {
                // Tự động tạo flag mới nếu chưa tồn tại
                flags[flagKey] = true;
            }
        }
        const label = extProps.actionLabel || extProps.groupLabel || meta.label || code;
        return {
            code,
            label,
            flowId: flow.id,
            targetRole,
            candidates,
            min: meta.constraints?.min ?? 0,
            max: meta.constraints?.max ?? null,
            targetRoleName,
            canTransferRoom,
            actionGroup: extProps.actionGroup,
            type: meta.type,
            secType: meta.secType,
            selectionMode: meta.selectionMode,
            groupLabel: extProps.groupLabel,
            actionLabel: extProps.actionLabel,
            flags: flags,
            ...flagsButton,
            order: extProps.order !== undefined ? Number(extProps.order) : (flagsButton.order !== undefined ? Number(flagsButton.order) : undefined),
        };
    }

    private async resolveCandidates(
        getUsersByRole: (role: string) => Promise<any[]> | any[],
        roleCode?: string,
    ): Promise<any[]> {
        if (!roleCode || !getUsersByRole) return [];
        const result = getUsersByRole(roleCode);
        return result && typeof (result as any).then === 'function' ? await result : result;
    }
    classifyAction(code: any) {
        try {
            const meta = actionCatalog.actions[code] || {};
            const type = meta.type || (actionCatalog.isReturn(code) ? 'return' : null);
            const selectionMode = meta.selectionMode || 'single';
            // code === 'HOAN_THANH_PHOI_HOP' ? code = 'HOAN_THANH' : code; // fix actionCode vào kho hoàn thành phối hợp
            const secType = meta.secType || null;
            return { code, label: meta.label || code, type, selectionMode, constraints: meta.constraints, getLabel: meta.getLable, secType };
        } catch (e) {
            throw new Error(`classifyAction: ${e.message}`);
        }
    }

    flowActionCode(flow: any): string | null {
        try {
            // Prefer sequenceFlow.name as business action code, fallback to id
            return (flow && flow.name) ? String(flow.name).toUpperCase() : flow.id;
        } catch (e) {
            throw new Error(`flowActionCode: ${e.message}`);
        }
    }

    canUserExecute(
        userId: string,
        userRoles: string[],
        workItem: { role?: string; assigneeUserId?: string },
        userParent?: string,
        userGroupIds: string[] = [],
    ): boolean {
        if (!workItem) return false;

        // 1. If work item has specific assignee, only that user can execute
        // if (workItem.assigneeUserId) {
        //     return (
        //         workItem.assigneeUserId === userId 
        //     );
        // }
        if (workItem.assigneeUserId) {
            return (
                workItem.assigneeUserId === userId ||
                workItem.assigneeUserId === userParent ||
                !!(userGroupIds || []).includes(workItem.assigneeUserId)
            );
        }

        return !!(userRoles || []).includes(workItem.role || '');
    }

    findPreviousAssigneeForRole(audit: any[], roleCode?: string) {
        if (!audit || audit.length === 0) return null;

        for (let i = audit.length - 1; i >= 0; i--) {
            const entry = audit[i];
            if (entry.role === roleCode && entry.userId) {
                return { userId: entry.userId, role: roleCode, displayName: entry.displayName };
            }
        }

        return null;
    }

    async computeAvailableActions({
        process,
        indexes,
        currentNodeId,
        workItem,
        document,
        userId,
        userRoles = [],
        userGroupIds = [],
        getUsersByRole,
        audit = [],
        userParent,
        documentId,
        bpmnXML,
        priorityRole,
        latestAssignmentInfo,
        skipRedisRead = false,
        skipRedisWrite = false,
    }: {
        process: any;
        indexes: any;
        currentNodeId: string;
        workItem: { role?: string; assigneeUserId?: string, nodeId?: string };
        document: any,
        userId: string;
        userRoles?: string[];
        userGroupIds?: string[];
        getUsersByRole: (role: string) => Promise<any[]> | any[];
        audit?: { role?: string; userId?: string; displayName?: string, receiver?: string, roleProcess?: string, toNodeId?: string, fromNodeId?: string, stageStatus?: string, actionCode?: string, action?: string, createdBy?: string, updatedAt?: Date, details?: string | any, typeDocument?: string }[];
        userParent?: string;
        documentId?: string;
        bpmnXML?: any;
        priorityRole?: string;
        latestAssignmentInfo?: { roleProcess?: string | null; parentDocClone?: string | null } | null;
        skipRedisRead?: boolean;
        skipRedisWrite?: boolean;
    }): Promise<any> {
        const docId = documentId || document?.id || document?.documentId || 'unknownDoc';
        const typeDoc = audit?.[0]?.typeDocument || document?.typeDocument || 'Unknown';
        const cacheKey = docId ? `bpmn:actions:${typeDoc}:${docId}:${userId}:${currentNodeId}` : null;

        if (cacheKey && !skipRedisRead) {
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            } catch (err) {
                console.error('[REDIS] Get cache error:', err.message);
            }
        }

        try {
            const { nodes, outgoingBySource, laneMap, laneMapName } = indexes;
            let effNodeId = currentNodeId;
            const tempNode = nodes.get(effNodeId);
            if (tempNode && tempNode.$type === 'bpmn:IntermediateThrowEvent') {
                // Chỉ tự động nhảy cóc nếu KHÔNG có Work Item nào đang mở tại chính sự kiện này
                const isWorkItemActiveAtEvent = workItem && workItem.nodeId === tempNode.id;
                if (!isWorkItemActiveAtEvent) {
                    const outs = outgoingBySource.get(effNodeId) || [];
                    if (outs.length > 0 && outs[0].targetRef) {
                        effNodeId = outs[0].targetRef.id || outs[0].targetRef;
                    }
                }
            }
            currentNodeId = effNodeId;

            const node = nodes.get(currentNodeId);
            if (!node) {
                console.warn('BPMN missing node =', currentNodeId);
                return {
                    node: null,
                    availableActions: [],
                    flags: {
                        canProcess: false,
                        canReturn: false,
                        canComplete: false,
                        canSigningSubmission: false,
                        canGiveFeedback: false,
                        hasNextKySaoY: false,
                    },
                    flagsProcess: {
                        hasNextKySaoY: false,
                    }
                };
            }
            // Tạo RoleMap: roleCode -> displayName
            const RoleMap = Object.fromEntries(
                [...laneMap.entries()].map(([nodeId, roleCode]) => [
                    roleCode,                // key: VAN_THU_CUC
                    laneMapName.get(nodeId), // value: Văn thư cục
                ])
            );

            function getRoleDisplayName(role: string): string {
                return RoleMap[role] || role;
            }

            let canExec = this.canUserExecute(userId, userRoles, workItem, userParent, userGroupIds || []);
            if (canExec && priorityRole && userRoles.includes(priorityRole)) {
                const targetRole = workItem?.role || laneMap.get(currentNodeId);
                if (targetRole && targetRole !== priorityRole) {
                    canExec = false;
                }
            }
            const flags = {
                canProcess: false,
                canReturn: false,
                canComplete: false,
                canCompleteDoc: false,
                canProcessSupport: false,
                canReturnSupport: false,
                canCompleteSupport: false,
                canViewed: false,
                // canTransferRoom: false,
                canSigningSubmission: false,
                canGiveFeedback: false,
                canSucessFull: true,
                canApprove: true,
                canCompleteProposal: false,
                canIssueProposal: false,
                canTransferFeedback: false,
                canSetNumber: false,
                canSuggestPromulgate: false,
                canRecall: false,
                canTransferOptions: false,
                canSignDraft: false,
                canSignCertificate: false,
                canDigitalSign: false,
                canOfficialSigner1: false,
                canOfficialSigner2: false,
                canOfficialSigner3: false,
                canApproveNews: false,
                canRejectNews: false,
                canCancelNews: false,
                canSubmitNews: false,
                canSaveDraftNews: false,
                canRecallNews: false,
                canReject: false,
                canSaveBook: false,
                canPublished: false,
                canEditFile: true,
                hasNextKySaoY: false,
            };
            const flagsProcess: any = {
                hasNextKySaoY: false,
            };
            const availableActions: any[] = [];


            const currentRole = laneMap.get(currentNodeId);
            // Thu hồi
            flags.canRecall = this.canRecallDocument(audit, userId, audit[0]?.typeDocument, userParent);

            if (!canExec) {
                return { node, availableActions, flags, flagsProcess };
            }

            const curNodeProps = getAllNodeExtensionProperties(node);
            const signerType = curNodeProps?.signerRequired || curNodeProps?.processRequired;
            if (signerType) {
                if (signerType === 'officialSigner1') {
                    flags.canOfficialSigner1 = true;
                } else if (signerType === 'officialSigner2') {
                    flags.canOfficialSigner2 = true;
                } else if (signerType === 'officialSigner3') {
                    flags.canOfficialSigner3 = true;
                } else if (signerType === 'signContentDraft') {
                    flags.canSignDraft = true;
                } else if (signerType === 'signFormatDraft') {
                    flags.canSignCertificate = true;
                }
            }

            // Kiểm tra transfer option completion
            const transferOptionResult = this.checkTransferOptionCompletion(audit, userId);
            if (transferOptionResult.shouldReturn) {
                flags.canComplete = true;
                availableActions.push(transferOptionResult.action);
                return {
                    node: null,
                    availableActions,
                    flags: transferOptionResult.flags,
                    flagsProcess: transferOptionResult.flagsProcess || flagsProcess
                };
            }

            // ============================================================
            // 1️⃣ InclusiveGateway (grouped multi-assign)
            // ============================================================
            const prvNode = node?.incoming?.[0]?.sourceRef;
            const exten = getAllNodeExtensionProperties(prvNode)
            const allExtensionscur = getAllNodeExtensionProperties(node);
            const signKey = {
                keySign: null,
                signaturePlacement: null,
                isBackground: false
            }
            if (!exten.ROLE_XIN_Y_KIEN && allExtensionscur.NEWS && !allExtensionscur.assignmentAll) {
                // Set cờ dựa trên action code của từng flow trong gateway
                const outs = outgoingBySource.get(node.id) || [];
                for (const f of outs) {
                    const actionCode = this.flowActionCode(f);
                    const flowExtProps = this.getFlowExtensionProperties(f);

                    if (actionCode === 'DUYET') {
                        flags.canApproveNews = true;
                    } else if (actionCode === 'TRA_LAI' || actionCode === 'TRA_LAI_TIN') {
                        flags.canRejectNews = true;
                    } else if (actionCode === 'HUY_TIN') {
                        flags.canCancelNews = true;
                    } else if (actionCode === 'TRINH_DUYET') {
                        flags.canSubmitNews = true;
                    } else if (actionCode === 'LUU_NHAP') {
                        flags.canSaveDraftNews = true;
                    } else if (actionCode === 'THU_HOI') {
                        flags.canRecallNews = true;
                    } else if (actionCode === 'XUAT_BAN') {
                        flags.canPublished = true;
                    }

                    // Kiểm tra flow DUYET_TOPIC với extension property flags=TOPICS
                    // Nếu có, kiểm tra topic.requiresApproval của tin tức
                    if (actionCode === 'DUYET_TOPIC' || (flowExtProps.flags && flowExtProps.flags.includes('TOPICS'))) {
                        // Mặc định: ẩn nhánh này (cần duyệt)
                        // Chỉ hiển thị nếu topic KHÔNG yêu cầu duyệt (requiresApproval = false)
                        const topicRequiresApproval = document?.topicRequiresApproval ?? document?.topicEntity?.requiresApproval ?? true;
                        (flags as any).canPublishDirectly = !topicRequiresApproval; // true nếu topic không cần duyệt → hiển thị nhánh auto-approve
                    }
                }
            }
            // if (node.$type === 'bpmn:InclusiveGateway' && !exten.ROLE_XIN_Y_KIEN && !allExtensionscur.NEWS && !allExtensionscur.assignmentAll) {
            //     const outs = outgoingBySource.get(node.id) || [];
            //     const subActions: any[] = [];

            //     for (const f of outs) {
            //         const sa = await this.buildSubActionForFlow(f, indexes, getUsersByRole);
            //         subActions.push(sa);
            //     }

            //     if (subActions.length > 0) {
            //         const groupedByRole = subActions.reduce((acc, a) => {
            //             const { targetRole, ...rest } = a;
            //             if (!targetRole) return acc;
            //             if (!acc[targetRole]) {
            //                 acc[targetRole] = { targetRole, actions: [] };
            //             }
            //             acc[targetRole].actions.push(rest);
            //             return acc;
            //         }, {});

            //         const groupedSubActions = Object.values(groupedByRole);

            //         const targetRoles = [
            //             ...new Set(subActions.map(a => a.targetRole).filter(Boolean)),
            //         ];

            //         availableActions.push({
            //             day: 1,
            //             code: 'PHAN_CONG',
            //             label: actionCatalog.actions.PHAN_CONG?.label || 'Phân công',
            //             type: 'transfer',
            //             selectionMode: 'multi',
            //             targetRoles,
            //             subActions: groupedSubActions.map((sa: any) => ({
            //                 ...sa,
            //                 actions: (sa.actions || []).map((a: any) => ({ ...a, canSetProcessor: true }))
            //             })),
            //             canExecute: true,
            //         });

            //         flags.canProcess = true;

            //     }

            //     return { node, availableActions, flags };
            // }

            // ============================================================
            // 2️⃣ Default flows
            // ============================================================
            const outs = outgoingBySource.get(node.id) || [];

            // Check for KY_SAO_Y look-ahead
            for (const f of outs) {
                const { node: nextNode } = this.nextInteractiveFromFlow(f, indexes);
                if (nextNode) {
                    const nextOuts = outgoingBySource.get(nextNode.id) || [];
                    if (nextOuts.some(nf => this.flowActionCode(nf) === 'KY_SAO_Y')) {
                        (flags as any).hasNextKySaoY = true;
                        flagsProcess.hasNextKySaoY = true;
                        break;
                    }
                }
            }

            let targetRoleTransferOptions: string[] = [];
            const currentLaneExt = this.getLanePropertiesByRole(indexes.lanes as any, currentRole);
            let isBuiltXinYKienFromLane = false;
            const disableXinYKienByNode = String(allExtensionscur?.ROLE_XIN_Y_KIEN ?? '').toLowerCase() === 'false';

            for (const f of outs) {
                const immediateTarget = f?.targetRef ? nodes.get(f?.targetRef.id) : null;
                const extProps = this.getFlowExtensionProperties(f);
                const code = extProps.actionCode || this.flowActionCode(f);
                const meta = this.classifyAction(code);
                const flagsButton = parseFlagsButton(extProps?.flagsButton);
                const isXinYKienFlow = String(code || '').toUpperCase() === 'XIN_Y_KIEN';
                if (extProps?.flags) {
                    // Gộp flags từ flow và lane
                    const flagKeys = [
                        ...(extProps?.flags?.split(',') ?? [])
                    ]
                        .map(k => k.trim())
                        .filter(Boolean);

                    for (const flagKey of flagKeys) {
                        flags[flagKey] = true;
                    }
                }
                if (isXinYKienFlow && disableXinYKienByNode) {
                    continue;
                }
                if (immediateTarget?.$type === "bpmn:ServiceTask") {
                    // Nếu luồng đi vào ServiceTask là luồng tự động ngầm (không có actionCode hoặc name)
                    // thì đây là luồng xử lý ngầm hệ thống, không tạo nút bấm giao diện
                    const hasExplicitAction = !!(extProps?.actionCode || f.name);
                    if (!hasExplicitAction) {
                        continue;
                    }

                    let hasPushedAction = false;
                    try {
                        const serviceTaskResult = await this.serviceTaskExecutor.executeIfServiceTask(
                            {
                                nodeId: immediateTarget.id,
                                bpmnXml: bpmnXML,
                                variables: {
                                    curNodeId: node,
                                    documentId,
                                    meetingId: documentId || (document as any)?.id,
                                    receiverUnit: userParent || workItem?.assigneeUserId || userId,
                                    workItem,
                                    userId: userId,
                                    audit,
                                    indexes,
                                    latestAssignmentInfo,
                                    nodeId: immediateTarget.id,
                                    bpmnXml: bpmnXML,
                                    isSimulation: true,
                                },
                            },
                        );
                        if (serviceTaskResult && serviceTaskResult?.outs?.length > 0) {
                            for (const outFlow of serviceTaskResult?.outs) {
                                const action = await this.processFlowAction(outFlow, {
                                    nodes,
                                    laneMap,
                                    indexes,
                                    audit,
                                    userId,
                                    workItem,
                                    currentRole,
                                    getUsersByRole,
                                    targetRoleTransferOptions,
                                    flags,
                                    immediateTarget,
                                    signKey,
                                    curNode: node,
                                    documentId
                                });

                                if (action) {
                                    availableActions.push(action);
                                    hasPushedAction = true;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn(`[computeAvailableActions] ServiceTask simulation fallback for ${immediateTarget?.id}:`, err?.message);
                    }

                    // Fallback an toàn: Nếu ServiceTask không tạo ra action nào, sử dụng trực tiếp luồng f hiện tại
                    if (!hasPushedAction) {
                        const action = await this.processFlowAction(f, {
                            nodes,
                            laneMap,
                            indexes,
                            audit,
                            userId,
                            workItem,
                            currentRole,
                            getUsersByRole,
                            targetRoleTransferOptions,
                            flags,
                            immediateTarget,
                            signKey,
                            curNode: node,
                            documentId
                        });

                        if (action) {
                            availableActions.push(action);
                        }
                    }
                    continue;
                }
                // Build xin y kien
                if (isXinYKienFlow && !isBuiltXinYKienFromLane) {
                    let roleStr;
                    if (exten?.ROLE_XIN_Y_KIEN || extProps?.ROLE_XIN_Y_KIEN) {
                        roleStr = exten?.ROLE_XIN_Y_KIEN || extProps?.ROLE_XIN_Y_KIEN;
                    } else {
                        roleStr = currentLaneExt?.ROLE_XIN_Y_KIEN;
                    }
                    const hasRoleXinYKien = roleStr && roleStr !== 'false';
                    if (hasRoleXinYKien) {
                        const feedbackMeta = this.classifyAction('XIN_Y_KIEN');
                        const roleSource = (exten?.ROLE_XIN_Y_KIEN || extProps?.ROLE_XIN_Y_KIEN)
                            ? 'prev_or_flow'
                            : 'lane';
                        const roles = String(roleStr)
                            .split(',')
                            .map(r => r.trim())
                            .filter(Boolean);

                        const groupUsersByCode = new Map<string, any>();
                        try {
                            const groupUsersRes = await this.groupUserService.findNamesByCodes(roles);
                            const returnedCodes = (groupUsersRes?.data || []).map((gu: any) => gu?.code).filter(Boolean);
                            const missingRoles = roles.filter((r) => !returnedCodes.includes(r));

                            for (const gu of groupUsersRes?.data || []) {
                                if (gu?.code) {
                                    groupUsersByCode.set(gu.code, gu);
                                }
                            }
                        } catch (error) {
                        }

                        for (const role of roles) {
                            const groupUser = groupUsersByCode.get(role);
                            if (!groupUser) {
                                continue;
                            }

                            const candidates = await this.resolveCandidates(getUsersByRole, role);
                            const targetRoleName = groupUser?.name || getRoleDisplayName(role);
                            const labelName = feedbackMeta?.getLabel ? feedbackMeta?.label : 'XIN_Y_KIEN';
                            availableActions.push({
                                code: feedbackMeta.code,
                                label: targetRoleName,
                                type: feedbackMeta.type,
                                targetRole: role,
                                candidates,
                                min: 0,
                                max: null,
                                requiresAssignee: candidates.length === 0,
                                selectionMode: 'single',
                                targetRoleName,
                                canExecute: true,
                            });
                        }

                        flags.canGiveFeedback = true;
                        isBuiltXinYKienFromLane = true;
                        continue;
                    }
                }
                if (isXinYKienFlow && isBuiltXinYKienFromLane) {
                    continue;
                }
                // Nếu node hiện tại là InclusiveGateway có assignmentAll, gom tất cả flows

                // ------------------------------------------------------------
                // Flow → InclusiveGateway (chỉ khi target là InclusiveGateway, không phải node hiện tại)
                // ------------------------------------------------------------
                if (immediateTarget && immediateTarget.$type === 'bpmn:InclusiveGateway') {
                    const gatewayOuts = outgoingBySource.get(immediateTarget.id) || [];
                    const subActions: any[] = [];
                    const flagsButton: Record<string, any> = {};
                    // await this.processFlowAction(f, {
                    //     nodes,
                    //     laneMap,
                    //     indexes,
                    //     audit,
                    //     userId,
                    //     workItem,
                    //     currentRole,
                    //     getUsersByRole,
                    //     targetRoleTransferOptions,
                    //     flags,
                    //     immediateTarget,
                    //     signKey,
                    //     curNode: node,
                    //     documentId
                    // });
                    for (const gf of gatewayOuts) {
                        const extProps = this.getFlowExtensionProperties(gf);
                        const code = extProps.actionCode || gf.name;
                        if (!code) {
                            continue;
                        }
                        const gatewayTarget = gf?.targetRef ? nodes.get(gf?.targetRef.id) : null;
                        const sa = await this.buildSubActionForFlow(gf, indexes, getUsersByRole, gatewayTarget);
                        subActions.push(sa);
                    }

                    if (subActions.length > 0) {
                        const groupedByRole = subActions.reduce((acc, a) => {
                            if (actionCatalog.isChuyenTuyChon(a.code)) {
                                acc.chuyenTuyChon.push(a);
                                return acc;
                            }
                            const { targetRole, targetRoleName, ...rest } = a;
                            if (!targetRole) return acc;
                            if (!acc.byRole[targetRole]) {
                                acc.byRole[targetRole] = {
                                    targetRole,
                                    label: targetRoleName,
                                    actions: [],
                                };
                            }

                            acc.byRole[targetRole].actions.push(rest);
                            return acc;
                        },
                            {
                                byRole: {},          // group theo role
                                chuyenTuyChon: [],
                            });
                        const transferTargetRoles = [
                            ...new Set(
                                subActions
                                    .filter(a => !actionCatalog.isChuyenTuyChon(a.code))
                                    .map(a => a.targetRole)
                                    .filter(Boolean)
                            )
                        ];
                        // Chuyển canTransferRoom từ các action lên level subAction
                        const roleSubActions = Object.values(groupedByRole.byRole).map((subAction: any) => {
                            const flagState: Record<string, boolean> = {
                                canTransferRoomProcessor: false,
                                canTransferRoomSupporter: false,
                                canTransferRoomViewer: false,
                                canSetProcessor: false,
                                canSetSupporter: false,
                                canSetViewer: false,
                            };

                            let viewAndSupport = false;

                            const updatedActions = (subAction.actions || []).map((action: any) => {
                                const flags = action.flags || {};
                                const actionCode = action.code;

                                /** ---------------------
                                 * 1️⃣ FLAGS MỚI (ƯU TIÊN)
                                 * --------------------- */
                                Object.entries(flags).forEach(([key, value]) => {
                                    if (value === true) {
                                        flagState[key] = true;
                                    }
                                });

                                /** ---------------------
                                 * 2️⃣ FALLBACK LOGIC CŨ
                                 * (chỉ khi flag tương ứng CHƯA được set)
                                 * --------------------- */
                                if (!Object.keys(flags).length) {
                                    if (actionCode === 'XU_LY_CHINH') {
                                        flagState.canSetProcessor = true;
                                        if (action.canTransferRoom === true) {
                                            flagState.canTransferRoomProcessor = true;
                                        }
                                    }

                                    if (actionCode === 'PHOI_HOP') {
                                        flagState.canSetSupporter = true;
                                        if (action.canTransferRoom === true) {
                                            flagState.canTransferRoomSupporter = true;
                                        }
                                    }

                                    if (actionCode === 'NHAN_DE_BIET') {
                                        flagState.canSetViewer = true;
                                        if (action.canTransferRoom === true) {
                                            flagState.canTransferRoomViewer = true;
                                        }
                                    }
                                }

                                // clean action
                                const { flags: _, canTransferRoom, ...cleanAction } = action;
                                return cleanAction;
                            });

                            /** ---------------------
                             * 3️⃣ TÍNH viewAndSupport
                             * --------------------- */
                            const setCount = [
                                flagState.canSetProcessor,
                                flagState.canSetSupporter,
                                flagState.canSetViewer,
                            ].filter(Boolean).length;

                            if (setCount >= 2) {
                                viewAndSupport = true;
                            }

                            return {
                                ...subAction,
                                actions: updatedActions,
                                ...flagState,
                                viewAndSupport,
                            };
                        });

                        const transferTargetRolesString = transferTargetRoles.join(',');
                        const optionSubActions = groupedByRole.chuyenTuyChon.map(a => ({
                            targetRole: transferTargetRolesString,
                            code: 'CHUYEN_TUY_CHON',
                            label: 'Chuyển tùy chọn',
                            actions: [
                                {
                                    code: 'CHUYEN_TUY_CHON',
                                    label: 'Chuyển tùy chọn',
                                    flowId: a.flowId,
                                    candidates: a.candidates || [],
                                    min: 0,
                                    max: null,
                                }
                            ],
                            canTransferRoomProcessor: false,
                            canTransferRoomSupporter: false,
                            canTransferRoomViewer: false,
                            canSetProcessor: true,
                            canSetSupporter: false,
                            canSetViewer: false,
                            canTransferOptions: true,
                            SelectionMode: extProps.selectionMode || 'single',

                        }));
                        //* khối kiểm tra không gồm điều kiện phải là CHUYEN_TUY_CHON bak
                        // optionSubActions is an array; collect its targetRole values (each entry already represents a CHUYEN_TUY_CHON action)
                        // const optionTargetRole = optionSubActions
                        //     .map(sa => sa.targetRole)
                        //     .filter(Boolean)
                        //     .join(',');
                        const optionTargetRole = optionSubActions
                            .filter(a => actionCatalog.isChuyenTuyChon(a.code))
                            .map(a => a.targetRole)
                            .filter(Boolean)
                            .join(',');
                        const targetRoles = [
                            ...new Set([
                                ...subActions
                                    .filter(a => !actionCatalog.isChuyenTuyChon(a.code))
                                    .map(a => a.targetRole)
                                    .filter(Boolean),
                                optionTargetRole,
                            ].filter(Boolean)),
                        ];
                        // const targetRolesString = transferTargetRoles.join(',');
                        const groupedSubActions = [
                            ...roleSubActions,
                            ...optionSubActions,
                        ];
                        if (extProps.flagsButton) {
                            const entries = extProps.flagsButton
                                .split(',')
                                .map(item => item.trim())
                                .filter(Boolean);

                            for (const entry of entries) {
                                const [key, value] = entry.split(':').map(s => s.trim());

                                if (key) {
                                    let finalValue: any = value;
                                    if (value === 'true') {
                                        finalValue = true;
                                    } else if (value === 'false') {
                                        finalValue = false;
                                    }
                                    flagsButton[key] = finalValue ?? true;
                                }
                            }
                        }
                        if (roleSubActions.length === 1) {
                            // Flatten: single role → flat actions + flags at top level
                            const single = roleSubActions[0];
                            availableActions.push({
                                day: 2,
                                code: extProps?.actionCode || 'CHUYEN_XU_LY_PHAN_CONG',
                                label: extProps?.groupLabel || extProps.actionLabel || 'Phân công',
                                type: extProps?.actionType,
                                typeSe: 'multi-transfer',
                                targetRole: single.targetRole,
                                selectionMode: 'single',
                                actions: single.actions,
                                subActions: groupedSubActions,
                                canTransferRoomProcessor: single.canTransferRoomProcessor,
                                canTransferRoomSupporter: single.canTransferRoomSupporter,
                                canTransferRoomViewer: single.canTransferRoomViewer,
                                canSetProcessor: single.canSetProcessor,
                                canSetSupporter: single.canSetSupporter,
                                canSetViewer: single.canSetViewer,
                                viewAndSupport: single.viewAndSupport,
                                canExecute: true,
                                ...flagsButton
                            });
                        } else {
                            availableActions.push({
                                day: 2,
                                code: extProps?.actionCode || 'CHUYEN_XU_LY_PHAN_CONG',
                                label: extProps?.groupLabel || 'Phân công',
                                type: extProps?.actionType,
                                typeSe: 'multi-transfer',
                                targetRoles,
                                subActions: groupedSubActions,
                                canExecute: true,
                                ...flagsButton
                            });
                        }

                        flags.canProcess = true;
                    }

                    // return { node, availableActions, flags };
                    continue;
                }

                const outgoingOfNextNode = outgoingBySource.get(immediateTarget?.id) || [];
                // const afterTrlaiNode = outgoingOfNextNode[0]?.targetRef;
                // const outsAfterTrlaiNode = outgoingBySource.get(afterTrlaiNode?.id) || [];
                // const isTraLai = outsAfterTrlaiNode.some(f => f.name === 'TRA_LAI');
                // if (outgoingOfNextNode[0]?.targetRef?.$type === "bpmn:ExclusiveGateway" && isTraLai && extProps.actionType === 'return' && meta.type === 'return') {
                if (outgoingOfNextNode[0]?.targetRef?.$type === "bpmn:ExclusiveGateway" && extProps.actionType === 'return' && meta.type === 'return') {
                    // const flowImediateTarget = this.getFlowExtensionProperties(f);
                    const gatewayOuts = outgoingBySource.get(outgoingOfNextNode[0]?.targetRef.id) || [];
                    let subActions: any[] = [];
                    for (const gf of gatewayOuts) {
                        const flagsButton: Record<string, any> = {};
                        const gatewayTarget = gf?.targetRef ? nodes.get(gf?.targetRef.id) : null;
                        const flowExtProps = this.getFlowExtensionProperties(gf);
                        const sa = await this.buildSubActionForFlow(gf, indexes, getUsersByRole, gatewayTarget);
                        let traLaiTheoLuong;
                        if (flowExtProps.flagsButton) {
                            const entries = flowExtProps.flagsButton
                                .split(',')
                                .map(item => item.trim())
                                .filter(Boolean);

                            for (const entry of entries) {
                                const [key, value] = entry.split(':').map(s => s.trim());
                                if (key) {
                                    let finalValue: any = value;
                                    if (value === 'true') {
                                        finalValue = true;
                                    } else if (value === 'false') {
                                        finalValue = false;
                                    }
                                    flagsButton[key] = finalValue ?? true;
                                }
                            }
                        }
                        if (gf?.__isDefault) {
                            traLaiTheoLuong = true;
                            const fp = audit
                                .slice()
                                .reverse()
                                .find(x =>
                                    x.receiver === userId &&
                                    x.toNodeId === workItem.nodeId
                                ) || null;
                            if (fp) {
                                const saTheoLuong = {
                                    ...sa,
                                    targetRole: fp.role,
                                    targetRoleName: indexes.laneMapName.get(fp?.fromNodeId),

                                }
                                subActions.push({ ...saTheoLuong, flagsButton, traLaiTheoLuong });
                                continue;
                            }

                        }
                        subActions.push({ ...sa, flagsButton, traLaiTheoLuong });
                    }

                    const fp = (() => {
                        for (let i = audit.length - 1; i >= 0; i--) {
                            const x = audit[i];
                            if (x.receiver === userId && x.toNodeId === workItem.nodeId) {
                                return x;
                            }
                        }
                        return null;
                    })();
                    // Tìm nhánh Văn thư
                    const vanThuAction = subActions.find(x => x.flagsButton?.priority);

                    // Tìm nhánh theo role đã gửi (nếu có)
                    const roleAction = subActions.find(x => x.targetRole !== fp?.role);
                    const roleActionTheoLuong = subActions.find(x => x.traLaiTheoLuong);

                    // Kết hợp theo luật
                    subActions = [];
                    if (vanThuAction) subActions.push(vanThuAction);

                    if (roleAction && !roleAction.flagsButton?.priority) {
                        subActions.push(roleAction);
                    }

                    if (roleActionTheoLuong) subActions.push(roleActionTheoLuong);
                    if (subActions.length > 0) {
                        // const targetRoles = [
                        //     ...new Set(subActions.map(a => a.targetRole).filter(Boolean)),
                        // ];
                        availableActions.push(
                            ...subActions.map((action: any) => ({
                                ...action.flagsButton,
                                code: action.code,
                                label: action.actionLabel || action.targetRoleName,
                                flowId: action.flowId,
                                type: action.type,
                                secType: action.secType,
                                selectionMode: action.selectionMode,
                                targetRole: action.targetRole,
                                requiresAssignee: action.requiresAssignee,
                                canExecute: true,
                                canTransferRoom: action.canTransferRoom ?? false,
                                actionGroup: action.actionGroup,
                                groupLabel: action.groupLabel,
                                canSetProcessor: true,
                            }))
                        );
                        // availableActions.push({
                        //     code: flowImediateTarget?.actionCode || 'TRA_LAI',
                        //     label: flowImediateTarget?.groupLabel || flowImediateTarget?.actionLabel || 'Trả lại',
                        //     type: flowImediateTarget?.actionType || 'return',
                        //     selectionMode: flowImediateTarget?.selectionMode || 'multi',
                        //     targetRoles,
                        //     subActions: Object.values(groupedByRole).map((sa: any) => ({
                        //         ...sa,
                        //         actions: (sa.actions || []).map((action: any) => ({
                        //             ...action,
                        //             canTransferRoom: action.canTransferRoom ?? false,
                        //             canSetProcessor: true,
                        //         }))
                        //     }))
                        // });

                        flags.canReturn = true;
                    }


                    continue;
                }
                const hasExplicitAction = !!(extProps?.actionCode || f.name);
                if (immediateTarget && immediateTarget?.$type === 'bpmn:ExclusiveGateway' && !flagsButton?.isConcurrent && !hasExplicitAction) {
                    const outs = outgoingBySource.get(immediateTarget.id) || [];
                    for (const f of outs) {
                        const innerImmediateTarget = f?.targetRef ? nodes.get(f?.targetRef.id) : null;

                        const action = await this.processFlowAction(f, {
                            nodes,
                            laneMap,
                            indexes,
                            audit,
                            userId,
                            workItem,
                            currentRole,
                            getUsersByRole,
                            targetRoleTransferOptions,
                            flags,
                            immediateTarget: innerImmediateTarget,
                            signKey,
                            curNode: node,
                            documentId
                        });

                        if (action) {
                            availableActions.push(action);
                        }
                    }
                    continue;
                }


                // ------------------------------------------------------------
                // Normal action
                // ------------------------------------------------------------
                const action = await this.processFlowAction(f, {
                    nodes,
                    laneMap,
                    indexes,
                    audit,
                    userId,
                    workItem,
                    currentRole,
                    getUsersByRole,
                    targetRoleTransferOptions,
                    flags,
                    immediateTarget,
                    signKey,
                    curNode: node,
                    documentId
                });

                if (action) {
                    availableActions.push(action);
                }
            }

            // Loại bỏ duplicates từ targetRoleTransferOptions
            targetRoleTransferOptions = [...new Set(targetRoleTransferOptions)];

            // Loại bỏ role hiện tại của người dùng khỏi danh sách
            if (currentRole) {
                targetRoleTransferOptions = targetRoleTransferOptions.filter(role => role !== currentRole);
            }

            // Nếu có CHUYEN_TUY_CHON action, gán targetRole từ targetRoleTransferOptions
            if (targetRoleTransferOptions.length > 0) {
                const targetRolesString = targetRoleTransferOptions.join(',');
                availableActions.forEach(action => {
                    if (!action) return;
                    if (actionCatalog.isChuyenTuyChon(action.code)) {
                        action.targetRole = targetRolesString;
                    }
                });
            }

            // ============================================================
            // 3️⃣ Group transfer actions
            // ============================================================
            if (availableActions.length > 0) {
                if (availableActions.some(a => a.subActions && a.subActions.length > 1 && !actionCatalog.isReturn(a.code))) {
                    return { node, availableActions, flags };
                }

                // Tách actions có actionGroup và không có actionGroup
                const actionsWithGroup = availableActions.filter(a => a.actionGroup);
                const actionsWithoutGroup = availableActions.filter(a => !a.actionGroup);

                // Group các actions có cùng actionGroup
                const groupedByActionGroup = actionsWithGroup.reduce((acc, action) => {
                    const groupKey = action.actionGroup;
                    if (!acc[groupKey]) {
                        acc[groupKey] = [];
                    }
                    acc[groupKey].push(action);
                    return acc;
                }, {} as Record<string, any[]>);

                // Xử lý các actions có actionGroup
                const groupedActions: any[] = [];
                const standaloneGroupActions: any[] = [];

                for (const [groupKey, actions] of Object.entries(groupedByActionGroup) as [string, any[]][]) {
                    if (actions.length > 1) {
                        // Gom chung thành 1 nút với subActions
                        const targetRoles = [...new Set(actions.map(a => a.targetRole).filter(Boolean))];
                        const subActions = actions.map(a => ({
                            code: a.code,
                            label: a.label || getRoleDisplayName(a.targetRole),
                            flowId: a.flowId,
                            targetRole: a.targetRole,
                            candidates: a.candidates || [],
                            min: a.min ?? 0,
                            max: a.max ?? null,
                            secType: a.secType || null,
                            requiresAssignee: a.requiresAssignee,
                            selectionMode: a.selectionMode,
                            canTransferRoom: a.canTransferRoom ?? false,
                            canSetProcessor: a.type !== 'transferSupport' ? true : false,
                            canTransferOptions: a.canTransferOptions || false,
                            ...a,
                        }));

                        // Lấy thông tin từ action đầu tiên làm đại diện (ưu tiên action không phải transferView)
                        const firstAction = actions.find(a => a.type !== 'transferView') ?? actions[0];
                        // Ưu tiên groupLabel nếu có, nếu không thì dùng label của firstAction
                        const groupLabel = firstAction.groupLabel || firstAction.label;
                        groupedActions.push({
                            code: firstAction.code,
                            label: groupLabel,
                            type: firstAction.type,
                            selectionMode: 'multi',
                            targetRoles,
                            subActions,
                            canExecute: actions.some(a => a.canExecute),
                            actionGroup: groupKey,
                        });
                    } else {
                        // Chỉ có 1 action trong group → tạo nút riêng
                        standaloneGroupActions.push({ ...actions[0], canSetProcessor: true });
                    }
                }

                // Xử lý actions không có actionGroup theo logic cũ (dựa vào type)
                const transferActions = actionsWithoutGroup.filter(a => (a.type === 'transfer' || a.type === 'transferSupport') && a.typeSe !== 'multi-transfer');
                const multiTransferActions = actionsWithoutGroup.filter(a => a.typeSe === 'multi-transfer' && (a.type === 'transfer' || a.type === 'transferSupport'));
                const returnActions = actionsWithoutGroup.filter(a => a.type === 'return');
                const feedbackActions = actionsWithoutGroup.filter(a => a.type === 'feedback');
                const transferFeedbackAction = actionsWithoutGroup.filter(a => a.type === 'transferFeedback');
                const submitActions = actionsWithoutGroup.filter(a => a.type === 'signingSubmission');
                const transferOptionsActions = actionsWithoutGroup.filter(a => a.type === 'transferOptions');
                const otherActions = actionsWithoutGroup.filter(a => a.type !== 'transfer' && a.type !== 'transferSupport'
                    && a.type !== 'return'
                    && a.type !== 'feedback'
                    && a.type !== 'signingSubmission'
                    && a.type !== 'transferFeedback'
                    && a.type !== 'transferOptions'
                    && a.type !== null);
                let finalActions: any[] = [];

                // Thêm các grouped actions (từ actionGroup)
                finalActions.push(...groupedActions);

                // Thêm các standalone group actions
                finalActions.push(...standaloneGroupActions);


                if (transferActions.length > 0) {
                    const targetRoles = [
                        ...new Set(transferActions.map(a => a.targetRole).filter(Boolean)),
                    ];

                    const arrSubActions = transferActions.map(a => ({
                        code: a.code,
                        label: a.label,
                        flowId: a.flowId,
                        targetRole: a.targetRole,
                        candidates: a.candidates || [],
                        min: a.min ?? 0,
                        max: a.max ?? null,
                        requiresAssignee: a.requiresAssignee,
                        selectionMode: a.selectionMode,
                        canTransferRoom: a.canTransferRoom ?? false,
                        canSetProcessor: true,
                        canTransferOptions: a.canTransferOptions || false,
                    }));

                    const groupCode = 'CHUYEN_XU_LY';
                    const groupLabel =
                        actionCatalog.actions[groupCode]?.label || 'Chuyển xử lý';

                    if (arrSubActions.length === 1) {
                        finalActions.push({ ...transferActions[0], ...arrSubActions[0], canExecute: transferActions[0].canExecute });
                    } else {
                        finalActions.push({
                            code: groupCode,
                            label: groupLabel,
                            type: transferActions.find(a => a.type === 'transferSupport')?.type || 'transfer',
                            selectionMode: 'multi',
                            targetRoles,
                            subActions: arrSubActions,
                            canExecute: transferActions.some(a => a.canExecute),
                        });
                    }
                }
                if (returnActions.length > 0) {
                    // Lấy toàn bộ targetRole từ returnActions
                    const targetRoles = [
                        ...new Set(returnActions.map(a => a.targetRole).filter(Boolean)),
                    ];

                    // Chuẩn hóa subActions đúng cấu trúc
                    const arrSubActions = returnActions.map(a => ({
                        code: a.code,
                        label: a.label,
                        flowId: a.flowId,
                        targetRole: a.targetRole,
                        candidates: a.candidates || [],
                        min: a.min ?? 0,
                        max: a.max ?? null,
                        requiresAssignee: a.requiresAssignee,
                        selectionMode: a.selectionMode,
                        canTransferRoom: a.canTransferRoom ?? false,
                        canSetProcessor: true,
                    }));

                    const groupCode = 'TRA_LAI';
                    const groupLabel = actionCatalog.actions[groupCode]?.label;

                    if (arrSubActions.length === 1) {
                        finalActions.push({ ...returnActions[0], ...arrSubActions[0], canExecute: returnActions[0].canExecute });
                    } else {
                        finalActions.push({
                            code: groupCode,
                            label: groupLabel,
                            type: returnActions.find(a => a.type === 'return')?.type,
                            selectionMode: 'single',
                            targetRoles,
                            subActions: arrSubActions,
                            canExecute: returnActions.some(a => a.canExecute),
                        });
                    }
                }
                if (submitActions.length > 0) {
                    const targetRoles = [
                        ...new Set(submitActions.map(a => a.targetRole).filter(Boolean)),
                    ];

                    const arrSubActions = submitActions.map(a => ({
                        code: a.code,
                        label: a.label,
                        flowId: a.flowId,
                        targetRole: a.targetRole,
                        candidates: a.candidates || [],
                        min: a.min ?? 0,
                        max: a.max ?? null,
                        requiresAssignee: a.requiresAssignee,
                        selectionMode: a.selectionMode,
                        canSetProcessor: true,
                    }));

                    // const groupCode = 'TRINH_VAN_BAN';
                    const groupCode = 'TRINH_VAN_BAN';
                    const groupLabel =
                        actionCatalog.actions[groupCode]?.label || 'Trình văn bản';

                    if (arrSubActions.length === 1) {
                        finalActions.push({ ...submitActions[0], ...arrSubActions[0], canExecute: submitActions[0].canExecute });
                    } else {
                        finalActions.push({
                            code: groupCode,
                            label: groupLabel,
                            type: submitActions.find(a => a.type === 'signingSubmission')?.type || 'transfer',
                            selectionMode: 'multi',
                            targetRoles,
                            subActions: arrSubActions,
                            canExecute: submitActions.some(a => a.canExecute),
                        });
                    }
                }
                if (feedbackActions.length > 0) {

                    // Loại bỏ các action có targetRole = role hiện tại của người đăng nhập
                    const filteredFeedbackActions = feedbackActions.filter(
                        a => a.targetRole !== currentRole
                    );

                    if (filteredFeedbackActions.length === 0) {
                        // Nếu không còn action nào sau khi filter, bỏ qua
                        // (không tạo group action)
                    } else {
                        const targetRoles = [
                            ...new Set(filteredFeedbackActions.map(a => a.targetRole).filter(Boolean)),
                        ];

                        const arrSubActions = filteredFeedbackActions.map(a => ({
                            code: a.code,
                            label: a.label || a.targetRoleName,
                            flowId: a.flowId,
                            targetRole: a.targetRole,
                            candidates: a.candidates || [],
                            min: a.min ?? 0,
                            max: a.max ?? null,
                            requiresAssignee: a.requiresAssignee,
                            selectionMode: a.selectionMode,
                            canSetProcessor: true,
                        }));

                        const groupCode = 'XIN_Y_KIEN';
                        const groupLabel =
                            actionCatalog.actions[groupCode]?.label || 'Xin ý kiến';

                        finalActions.push({
                            code: groupCode,
                            label: groupLabel,
                            type: filteredFeedbackActions.find(a => a.type === 'feedback')?.type || 'transfer',
                            selectionMode: 'multi',
                            targetRoles,
                            subActions: arrSubActions,
                            canExecute: filteredFeedbackActions.some(a => a.canExecute),
                        });
                    }
                }
                // ============ ĐÃ LOẠI BỎ CHỨC NĂNG "CHUYÊN CHO Ý KIẾN" ============
                // if (transferFeedbackAction.length > 0) {
                //     const targetRoles = [
                //         ...new Set(transferFeedbackAction.map(a => a.targetRole).filter(Boolean)),
                //     ];
                //
                //     const arrSubActions = transferFeedbackAction.map(a => ({
                //         code: a?.code,
                //         label: a?.label,
                //         flowId: a?.flowId,
                //         targetRole: a?.targetRole,
                //         candidates: a?.candidates || [],
                //         min: a?.min ?? 0,
                //         max: a?.max ?? null,
                //         requiresAssignee: a?.requiresAssignee,
                //         selectionMode: a?.selectionMode,
                //         canSetProcessor: true,
                //     }));
                //
                //     const groupCode = 'CHUYEN_CHO_Y_KIEN';
                //     const groupLabel =
                //         actionCatalog.actions[groupCode]?.label || 'Chuyển cho ý kiến';
                //
                //     finalActions.push({
                //         code: groupCode,
                //         label: groupLabel,
                //         type: transferFeedbackAction.find(a => a.type === 'transferFeedback')?.type || 'transferFeedback',
                //         selectionMode: 'multi',
                //         targetRoles,
                //         subActions: arrSubActions,
                //         canExecute: transferFeedbackAction.some(a => a.canExecute),
                //     });
                // }
                if (multiTransferActions.length > 0) {
                    const firstAction = multiTransferActions[0];
                    const addProcess = multiTransferActions.find(a => a?.addProcess === 'addProcess')?.addProcess;
                    if (multiTransferActions.some(x => x?.selectionMode === 'single')) {
                        finalActions.push({
                            day: firstAction.day,
                            code: firstAction.code,
                            label: firstAction.label,
                            type: firstAction.type,
                            typeSe: firstAction.typeSe,
                            targetRole: multiTransferActions[0]?.targetRole,
                            selectionMode: 'single',
                            actions: multiTransferActions.flatMap(a => a.actions || []),
                            canTransferRoomProcessor: multiTransferActions.some(a => a.canTransferRoomProcessor),
                            canTransferRoomSupporter: multiTransferActions.some(a => a.canTransferRoomSupporter),
                            canTransferRoomViewer: multiTransferActions.some(a => a.canTransferRoomViewer),
                            canSetProcessor: multiTransferActions.some(a => a.canSetProcessor),
                            canSetSupporter: multiTransferActions.some(a => a.canSetSupporter),
                            canSetViewer: multiTransferActions.some(a => a.canSetViewer),
                            viewAndSupport: multiTransferActions.some(a => a.viewAndSupport),
                            addProcess,
                            canExecute: multiTransferActions.some(a => a.canExecute),
                            ...multiTransferActions[0]
                        });
                    } else {
                        finalActions.push({
                            day: firstAction.day,
                            code: firstAction.code,
                            label: firstAction.label,
                            type: firstAction.type,
                            typeSe: firstAction.typeSe,
                            targetRoles: [
                                ...new Set(multiTransferActions.flatMap(a => a.targetRoles || []))
                            ],
                            subActions: multiTransferActions.flatMap(a => a.subActions || []),
                            addProcess,
                            canExecute: multiTransferActions.some(a => a.canExecute),
                        });
                    }

                }
                // if(transferOptionsActions.length > 0) {
                //     if (targetRoleTransferOptions.length > 0) {
                //         const targetRolesString = targetRoleTransferOptions.join(',');
                //         transferOptionsActions.forEach(action => {
                //             if (action.type === 'transferOptions') {
                //                 action.targetRole = targetRolesString;
                //                 flags.canTransferOptions = true;
                //             }
                //         });
                //     }

                //     finalActions.push(...transferOptionsActions);
                // }
                finalActions = [...finalActions, ...otherActions];
                // console.log('actionCatalog', actionCatalog);

                finalActions.sort((a, b) => {
                    const orderA = a.order !== undefined ? Number(a.order) : actionCatalog.getOrder(a.code);
                    const orderB = b.order !== undefined ? Number(b.order) : actionCatalog.getOrder(b.code);
                    return orderA - orderB;
                });

                const filteredActions = flags.canRecall
                    ? finalActions
                    : finalActions.filter((a: any) => {
                        const code = String(a?.code ?? '')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/\s+/g, '_')
                            .trim()
                            .toUpperCase();
                        return code !== 'THU_HOI' && code !== 'RECALL';
                    });
                const result = { node, availableActions: filteredActions, flags, flagsProcess, signKey };
                if (cacheKey && !skipRedisWrite) {
                    try {
                        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.ACTION_CACHE_TTL_SECONDS);
                    } catch (err) {
                        console.error('[REDIS] Set cache error:', err.message);
                    }
                }
                return result;
            }

            const filteredActions = flags.canRecall
                ? availableActions
                : availableActions.filter((a: any) => {
                    const code = String(a?.code ?? '')
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '_')
                        .trim()
                        .toUpperCase();
                    return code !== 'THU_HOI' && code !== 'RECALL';
                });
            const result = { node, availableActions: filteredActions, flags, flagsProcess, signKey };
            if (cacheKey && !skipRedisWrite) {
                try {
                    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.ACTION_CACHE_TTL_SECONDS);
                } catch (err) {
                    console.error('[REDIS] Set cache error:', err.message);
                }
            }
            return result;

        } catch (e) {
            console.error(e);
            throw new Error(`computeAvailableActions: \n${e.stack}`);
        }
    }

    private async processFlowAction(
        f: any,
        {
            nodes,
            laneMap,
            indexes,
            audit,
            userId,
            workItem,
            currentRole,
            getUsersByRole,
            targetRoleTransferOptions,
            flags,
            immediateTarget,
            signKey,
            curNode,
            documentId
        }: {
            nodes: Map<string, any>;
            laneMap: Map<string, string>;
            indexes: any;
            audit: any[];
            userId: string;
            workItem: any;
            currentRole: string;
            getUsersByRole: (role: string) => Promise<any[]> | any[];
            targetRoleTransferOptions: string[];
            flags: any;
            immediateTarget?: any;
            signKey?: any;
            curNode?: any;
            documentId?: string;
        }
    ): Promise<any | null> {
        // Đọc extension properties từ flow
        const extProps = this.getFlowExtensionProperties(f);
        const extLanes = this.getLanePropertiesByRole(indexes.lanes, currentRole);
        // Ưu tiên extension properties cho code và type
        let code = extProps.actionCode || this.flowActionCode(f);
        let meta = this.classifyAction(code);
        // Override type và selectionMode nếu có trong extension properties
        if (extProps.actionType) {
            meta.type = extProps.actionType;
        }
        if (extProps.actionSecType) {
            meta.secType = extProps.actionSecType;
        }
        if (extProps.selectionMode) {
            meta.selectionMode = extProps.selectionMode;
        }
        if (meta.type === 'issueProposal') {
            flags.canSetNumber = true;
        }
        const flagsButton: Record<string, boolean | string> = {};

        // Xử lý flags từ BPMN (động)
        if (extProps.flagsButton) {
            const entries = extProps.flagsButton
                .split(',')
                .map(item => item.trim())
                .filter(Boolean);

            for (const entry of entries) {
                const [key, value] = entry.split(':').map(s => s.trim());

                if (key) {
                    let finalValue: any = value;
                    if (value === 'true') {
                        finalValue = true;
                    } else if (value === 'false') {
                        finalValue = false;
                    }
                    flagsButton[key] = finalValue ?? true;
                }
            }
        }

        const fp = audit.find(x =>
            x.receiver === userId &&
            x.toNodeId === workItem.nodeId
        );

        // Chỉ đổi nếu là supporter và action là loại hoàn thành
        if (fp && fp.roleProcess === 'supporter' && meta.type === 'complete') {
            code = 'HOAN_THANH_PHOI_HOP';
            meta = this.classifyAction(code);
        }

        let { node: nextNode } = this.nextInteractiveFromFlow(f, indexes);
        let targetRole = nextNode ? laneMap.get(nextNode.id) : undefined;
        let targetRoleName = nextNode ? indexes.laneMapName.get(nextNode.id) : undefined;
        let skippedSignerSteps: string[] = [];
        let skipToTypeSign: string | null = null;

        // Thu thập targetRole vào array
        const targetLaneProps = targetRole
            ? this.getLanePropertiesByRole(indexes.lanes, targetRole)
            : null;

        if (targetLaneProps?.skipLane === 'true' && documentId && nextNode) {
            const targetSignerType = this.getSignerTypeFromNode(nextNode);
            const hasSelectedSignerAtTargetStep = await this.hasPendingOutgoingDocumentSigner(
                documentId,
                targetSignerType,
            );

            if (targetSignerType && !hasSelectedSignerAtTargetStep) {
                const skipResult = await this.findNextSelectedSignerStepForAction({
                    currentNode: nextNode,
                    indexes,
                    documentId,
                });

                if (skipResult.nextNode && skipResult.typeSign) {
                    nextNode = skipResult.nextNode;
                    targetRole = nextNode ? laneMap.get(nextNode.id) : undefined;
                    targetRoleName = nextNode ? indexes.laneMapName.get(nextNode.id) : undefined;
                    skippedSignerSteps = [targetSignerType, ...skipResult.skippedSteps];
                    skipToTypeSign = skipResult.typeSign;
                }
            }
        }

        if (targetRole && meta.type !== 'complete') {
            targetRoleTransferOptions.push(targetRole);
        }

        // Return loại đặc biệt
        if (meta.type === 'return') {
            const resolved = this.resolveReturnTarget(f, indexes, currentRole);
            if (resolved?.role) targetRole = resolved.role;
        }

        // Kiểm tra allowSendToUnit
        const targetNodeForCheck = immediateTarget || nextNode;
        const canTransferRoom = this.checkAllowSendToUnit(targetNodeForCheck);
        // Ưu tiên label từ extension properties
        const actionLabel = extProps.actionLabel || (meta.getLabel ? meta.label : targetRoleName) || extProps.groupLabel;
        const action: any = {
            code: meta.code,
            label: actionLabel,
            flowId: f.id,
            type: meta.type,
            secType: meta.secType || null,
            selectionMode: meta.selectionMode,
            targetRole,
            requiresAssignee:
                ((meta.type === 'transfer' || meta.type === 'transferSupport')
                    && meta.selectionMode === 'single'
                    && !!targetRole
                    && nextNode?.$type !== 'bpmn:InclusiveGateway'
                    && meta.type === 'transferSupport'
                ) || meta.type === 'transferFeedback',
            canExecute: true,
            canTransferRoom,
            actionGroup: extProps.actionGroup,
            groupLabel: extProps.groupLabel,
            actionLabel: extProps.actionLabel,
            skippedSignerSteps,
            skipToTypeSign,
            ...flagsButton,
            order: extProps.order !== undefined ? Number(extProps.order) : (flagsButton.order !== undefined ? Number(flagsButton.order) : undefined),
        };

        // Xử lý flags từ BPMN động vẫn giữ các type fix cứng theo if else bên dưới
        if (extProps.flags || extLanes?.flags) {
            // Gộp flags từ flow và lane
            const flagKeys = [
                ...(extProps?.flags?.split(',') ?? []),
                ...(extLanes?.flags?.split(',') ?? [])
            ]
                .map(k => k.trim())
                .filter(Boolean);
            for (const entry of flagKeys) {
                const [key, value] = entry.split(':').map(s => s.trim());

                if (key) {
                    let finalValue: any = value;
                    if (value === 'true') {
                        finalValue = true;
                    } else if (value === 'false') {
                        finalValue = false;
                    }
                    flagsButton[key] = finalValue ?? true;
                }
            }

            for (const entry of flagKeys) {
                // Extract key từ entry (ví dụ: "canEditFile:false" → "canEditFile")
                const [key] = entry.split(':').map(s => s.trim());

                if (!key) continue;

                // Điều kiện đặc biệt cho canTaoDuThao
                if (key === 'canTaoDuThao') {
                    // Tìm audit entry trước đó (người gửi đến node hiện tại)
                    const auditPrv = audit.find((x) => x.toNodeId === curNode?.id);
                    const userPrv = auditPrv ? auditPrv.createdBy : null;

                    if (userPrv) {
                        const roles = [GROUP_CODES.VAN_THU, GROUP_CODES.TONG_GIAM_DOC];
                        let hasPermission = false;

                        for (const role of roles) {
                            try {
                                const dataGroupUser = await this.groupUserService.findByCode(role);
                                const groupUserId = dataGroupUser?.data?.users?.map(user => user?.id).filter(Boolean) || [];

                                if (groupUserId.includes(userPrv)) {
                                    hasPermission = true;
                                    break;
                                }
                            } catch (error) {
                                console.error(`Error checking group ${role}:`, error);
                            }
                        }

                        // Chỉ set flag nếu user trước đó thuộc VAN_THU_TCT hoặc LANH_DAO_TCT
                        if (hasPermission) {
                            flags[key] = true;
                        }
                        else {
                            flags[key] = false;
                        }
                    }
                } else {
                    // Các flags khác lấy giá trị từ flagsButton (có thể true/false tùy extLanes?.flags)
                    flags[key] = flagsButton[key] ?? true;
                }
            }
        }
        // Xử lý Return
        // if (meta.type === 'return') {
        //     const prev = this.findPreviousAssigneeForRole(audit, targetRole);
        //     let candidates: any[] = [];
        //     if (prev) {
        //         flags.canReturn = true;
        //     } else {
        //         action.requiresAssignee = true;
        //         candidates = await this.resolveCandidates(getUsersByRole, targetRole);
        //         flags.canReturn = true;
        //     }

        //     const subAction = {
        //         code: meta.code,
        //         label: meta.getLabel ? meta.label : targetRoleName,
        //         flowId: f.id,
        //         candidates: candidates,
        //         min: 0,
        //         max: null,
        //         canTransferRoom,
        //     };

        //     action.targetRoles = [targetRole];
        //     action.subActions = [{
        //         targetRole: targetRole,
        //         label: targetRoleName,
        //         actions: [subAction]
        //     }];

        //     delete action.targetRole;
        //     delete action.requiresAssignee;
        //     delete action.canTransferRoom;
        // }
        // Xử lý Complete và các loại khác
        if (meta.type === 'return') {
            flags.canReturn = true;

        }
        else if (meta.type === 'complete') {
            flags.canComplete = true;
        }
        else if (meta.type === 'completeSupport') {
            flags.canCompleteSupport = true;
        }
        else if (meta.type === 'viewed') {
            flags.canViewed = true;
        }
        else if (meta.type === 'signingSubmission') {
            flags.canSigningSubmission = true;
        }
        else if (meta.type === 'feedback') {
            flags.canGiveFeedback = true;
        }
        else if (meta.type === 'approve') {
            flags.canApprove = true;
        }
        else if (meta.type === 'completeProposal') {
            flags.canCompleteProposal = true;
        }
        else if (meta.type === 'issueProposal') {
            flags.canIssueProposal = true;
            flags.canSetNumber = true;
        }
        else if (meta.type === 'transferFeedback') {
            flags.canTransferFeedback = true;
        }
        else if (meta.type === 'suggestPromulgate') {
            flags.canSuggestPromulgate = true;
        }
        else if (meta.type === 'transferOptions' || actionCatalog.isChuyenTuyChon(meta.code)) {
            action.canTransferOptions = true;
        }
        else if (meta.type === 'completeDoc') {
            flags.canCompleteDoc = true;
        }
        else {
            flags.canProcess = true;
        }
        const isKy = audit.some(x => x.actionCode === 'KY_NHAY_NOI_DUNG'
            || x.actionCode === 'KY_NHAY_THE_THUC' ||
            x.actionCode === 'KY_SO' ||
            x.actionCode === 'KY_NHAY' ||
            x.actionCode === 'DONG_DAU'
        )
        if (isKy) {
            flags.canEditFile = false;
        }
        // const nextNode = immediateTarget || this.safeNextInteractive(f, indexes)?.node;
        const extNextNode = getAllNodeExtensionProperties(immediateTarget);

        // Parse và lấy keySign theo thứ tự ký
        if (extNextNode.keySign) {
            const signerType = getAllNodeExtensionProperties(curNode)?.signerRequired;
            const currentSignOrder = await this.repo.getOrderSignerById(documentId || '', signerType, userId);
            signKey.keySign = await this.parseKeySign(extNextNode.keySign, currentSignOrder?.sign_order, indexes, documentId);
            signKey.signaturePlacement = extNextNode?.signaturePlacement;
            signKey.isBackground = mapStringToBoolean(extNextNode?.isBackground) || false;
        }

        // Resolve candidates if required
        if (action.requiresAssignee) {
            action.candidates = await this.resolveCandidates(getUsersByRole, targetRole);
        }

        return action;
    }

    private checkTransferOptionCompletion(
        audit: any[],
        userId: string
    ): { shouldReturn: boolean; action?: any; flags?: any; flagsProcess?: any } {
        const lastAuditCurrentNode = audit.filter(a => a.receiver === userId);
        if (lastAuditCurrentNode.length > 0) {
            try {
                const lastAudit = lastAuditCurrentNode[lastAuditCurrentNode.length - 1];
                const details = typeof lastAudit.details === 'string'
                    ? JSON.parse(lastAudit.details)
                    : (lastAudit.details || {});

                if (details.isTransferOption === true &&
                    lastAudit.receiver &&
                    lastAudit.stageStatus !== 'Hoàn thành xử lý') {

                    const action = {
                        code: 'HOAN_THANH',
                        label: 'Hoàn thành xử lý',
                        flowId: 'HT_CTC',
                        type: 'complete',
                        selectionMode: 'single',
                        targetRole: null,
                        requiresAssignee: false,
                        canExecute: true,
                        canTransferRoom: false,
                    };

                    const flags = {
                        canProcess: false,
                        canReturn: false,
                        canComplete: true,
                        canProcessSupport: false,
                        canReturnSupport: false,
                        canCompleteSupport: false,
                        canViewed: false,
                        canSigningSubmission: false,
                        canGiveFeedback: false,
                        canApprove: false,
                        canCompleteProposal: false,
                        canIssueProposal: false,
                        canTransferFeedback: false,
                        canSetNumber: false,
                        canSuggestPromulgate: false,
                        canRecall: false,
                        canTransferOptions: false,
                    };

                    const flagsProcess = {
                        hasNextKySaoY: false,
                    };

                    return { shouldReturn: true, action, flags, flagsProcess };
                }
            } catch (e) {
                // Nếu parse details lỗi, bỏ qua
            }
        }

        return { shouldReturn: false };
    }

    private safeNextInteractive(flow: any, indexes: any): { node: any } | null {
        if (!flow?.targetRef?.id) return null;
        try {
            const result = this.nextInteractiveFromFlowOutGoing(flow, indexes);
            return result?.node ? result : null;
        } catch {
            return null;
        }
    }
    public canRecallDocument = (
        audit: any[],
        userId: string,
        typeDocument?: string,
        userOrgId?: string
    ): boolean => {
        if (!audit || audit.length === 0) return false;
        const normalizedType = String(typeDocument ?? '')
            .trim()
            .toLowerCase();
        const isIncomingType =
            normalizedType === 'incommingdocument' ||
            normalizedType === 'incomingdocument';
        const isRecallAction = (actionCode: any) => {
            const normalized = String(actionCode ?? '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .trim()
                .toUpperCase();
            return normalized === 'THU_HOI' || normalized === 'RECALL' || normalized === 'THU_HOI_PHAN_CONG';
        };
        const getTime = (a: any) => {
            const t = a?.time || a?.updatedAt || a?.createdAt;
            if (!t) return 0;
            if (t instanceof Date) return t.getTime();
            if (typeof t === 'number') return t;
            if (typeof t === 'string') {
                const s = t.trim();
                // If it is in DD/MM/YYYY format, handle it first to avoid wrong month parsing
                const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
                if (m) {
                    const [_, dd, mm, yyyy] = m;
                    const timePart = s.split(' ')[1] || '';
                    let hh = 0, min = 0, ss = 0;
                    const tm = timePart.match(/^(\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
                    if (tm) {
                        hh = parseInt(tm[1], 10) || 0;
                        min = parseInt(tm[2], 10) || 0;
                        ss = parseInt(tm[3], 10) || 0;
                    }
                    const d = new Date(+yyyy, +mm - 1, +dd, hh, min, ss);
                    return isNaN(d.getTime()) ? 0 : d.getTime();
                }
                const d = new Date(s);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            return 0;
        };

        const isNewer = (a: any, b: any) => {
            if (a?.id && b?.id) {
                const idA = parseInt(a.id, 10);
                const idB = parseInt(b.id, 10);
                if (!isNaN(idA) && !isNaN(idB)) {
                    return idA > idB;
                }
            }
            return getTime(a) > getTime(b);
        };

        // ================= VB ĐẾN =================
        if (isIncomingType) {
            const isStatus = (val: string, ...targets: string[]) =>
                targets.some(t => val === t);

            const userAuditsForLatest = audit.filter(
                (a) => a && (a.receiver === userId || (userOrgId && a.receiver === userOrgId)) && !isRecallAction(a.actionCode),
            );
            const latestUserAudit = userAuditsForLatest[userAuditsForLatest.length - 1];
            if (
                latestUserAudit &&
                (
                    isStatus(latestUserAudit.stageStatus || '', 'Chưa xử lý', 'CHUA_XU_LY') ||
                    isRecallAction(latestUserAudit.actionCode)
                )
            ) {
                return false;
            }

            // Kiểm tra user hoặc đơn vị nhận có bất kỳ record nào trong audit không
            const userAudits = audit.filter(
                (a) =>
                    a &&
                    (a.receiver === userId ||
                        a.createdBy === userId ||
                        (a.processedBy || a.processed_by) === userId ||
                        (a.userId || a.user_id) === userId ||
                        (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))),
            );
            if (userAudits.length === 0) {
                return false;
            }

            let latestAudit: any = null;

            for (let i = audit.length - 1; i >= 0; i--) {
                const a = audit[i];
                if (!a) continue;

                // Trả lại liên tiếp
                if (
                    (a.receiver === userId ||
                        a.createdBy === userId ||
                        (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))) &&
                    isStatus(a.stageStatus, 'Trả lại', 'TRA_LAI')
                ) {
                    let nextValidAudit: any = null;
                    for (let k = i + 1; k < audit.length; k++) {
                        const next = audit[k];
                        if (!next) continue;
                        if (isStatus(next.stageStatus, 'Trả lại', 'TRA_LAI')) continue;
                        nextValidAudit = next;
                        break;
                    }
                    if (
                        isStatus(nextValidAudit?.stageStatus || '', 'Chưa xử lý', 'CHUA_XU_LY') ||
                        isRecallAction(nextValidAudit?.actionCode)
                    ) {
                        return false;
                    }
                }

                // Cấp dưới đã xử lý chính hoàn thành
                if (
                    (a.receiver === userId ||
                        (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))) &&
                    isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG')
                ) {
                    for (let j = i + 1; j < audit.length; j++) {
                        const nextAudit = audit[j];
                        if (!nextAudit) break;
                        if (nextAudit.createdBy !== userId && (nextAudit.processedBy || nextAudit.processed_by) !== userId) break;
                        if (nextAudit.action !== 'Xử lý chính' && nextAudit.action !== 'XU_LY_CHINH') continue;
                        if (
                            isStatus(nextAudit.stageStatus,
                                'Hoàn thành văn bản', 'HOAN_THANH_VAN_BAN',
                                'Hoàn thành xử lý', 'HOAN_THANH_XU_LY',
                                'Hoàn thành', 'HOAN_THANH'
                            )
                        ) {
                            return false;
                        }
                    }
                }

                // Lấy audit mới nhất
                if (
                    (a.receiver === userId ||
                        (userOrgId && (a.receiver === userOrgId || (a.receiverUnit || a.receiver_unit) === userOrgId))) &&
                    !isRecallAction(a.actionCode) &&
                    isStatus(a.stageStatus, 'Đã xử lý', 'DA_XU_LY', 'Đã phân công', 'DA_PHAN_CONG')
                ) {
                    if (!latestAudit || isNewer(a, latestAudit)) {
                        latestAudit = a;
                    }
                }
            }

            if (!latestAudit) return false;
            if (isStatus(latestAudit.stageStatus || '', 'Chưa xử lý', 'CHUA_XU_LY')) {
                return false;
            }

            // Check details note Thu hồi xử lý
            let isRecallNote = false;
            if (latestAudit.details) {
                try {
                    let parsed = latestAudit.details;
                    if (typeof parsed === 'string') {
                        parsed = JSON.parse(parsed);
                    }
                    if (typeof parsed === 'string') {
                        parsed = JSON.parse(parsed);
                    }
                    if (parsed?.note === 'Thu hồi xử lý') {
                        isRecallNote = true;
                        const hasSubsequentAction = audit.some(
                            (a) =>
                                a &&
                                String(a.id || a._id) !== String(latestAudit.id || latestAudit._id) &&
                                (a.userId === userId || a.createdBy === userId || a.user_id === userId || a.created_by === userId) &&
                                isNewer(a, latestAudit)
                        );
                        if (hasSubsequentAction) {
                            isRecallNote = false;
                        }
                    }
                } catch (err) {
                    // console.warn('Invalid JSON details', err);
                }
            }
            if (isRecallNote) {
                return false;
            }

            return !!latestAudit && !isRecallAction(latestAudit.actionCode);
        }

        // ================= VB ĐI =================
        // Đồng bộ theo rule nghiệp vụ chuẩn của policy:
        // chỉ người xử lý gần nhất ngay trước bước hiện tại mới được thu hồi.
        // Nếu đã có người xử lý tiếp theo sau bước của user thì user cũ mất quyền.

        // [MỚI] Danh sách action_code được phép thu hồi - chỉ cho phép thu hồi khi VB chưa ký
        // Nếu audit mới nhất của toàn bộ VB không thuộc danh sách này → không cho thu hồi
        const RECALLABLE_ACTION_CODES = ['TRINH_KY', 'TRINH_DUYET', 'LUAN_CHUYEN_VAN_BAN_DI', 'TRINH_KIEM_TRA_TT'];
        // Danh sách stageStatus chặn thu hồi (sau khi getAudit map sang Vietnamese display string)
        const BLOCKED_RECALL_STAGE_STATUSES = [
            'đã thu hồi', 'thu_hoi',
            'trả lại', 'tra_lai',
        ];
        const allAuditsSortedDesc = [...audit]
            .filter(a => a != null)
            .sort((a, b) => {
                // Ưu tiên sort theo id (auto-increment DB) vì id cao hơn = record mới hơn
                // Giải quyết trường hợp THU_HOI và TRINH_KY cùng timestamp nhưng khác id
                if (a.id != null && b.id != null) {
                    const diff = Number(b.id) - Number(a.id);
                    if (diff !== 0) return diff;
                }
                return getTime(b) - getTime(a);
            });
        const globalLatestAudit = allAuditsSortedDesc.length > 0 ? allAuditsSortedDesc[0] : null;

        // Chặn thu hồi nếu:
        // 1. Không có audit nào
        // 2. actionCode mới nhất không nằm trong danh sách cho phép thu hồi
        // 3. stageStatus mới nhất là trạng thái đã thu hồi/trả lại/chưa xử lý
        //    (VD: khi recall, audit mới có actionCode = TRINH_KY gốc nhưng stageStatus = 'Đã thu hồi')
        const globalStageStatus = String(globalLatestAudit?.stageStatus || '').trim().toLowerCase();
        if (
            !globalLatestAudit ||
            !RECALLABLE_ACTION_CODES.includes(globalLatestAudit.actionCode) ||
            BLOCKED_RECALL_STAGE_STATUSES.includes(globalStageStatus)
        ) {
            return false;
        }

        const sortedOutgoingAudit = [...audit]
            .filter((a) => a != null)
            .sort((a, b) => getTime(a) - getTime(b));

        const isProcessedStatus = (val: any) =>
            val === stageStatusDoc.DA_XU_LY ||
            val === stageStatusMapV2.DA_XU_LY ||
            val === 'DA_XU_LY' ||
            val === 'Đã xử lý';

        const isRecallEligibleStatus = (auditRow: any) =>
            isRecallAction(auditRow?.actionCode) ||
            isProcessedStatus(auditRow?.stageStatus);

        const isUnprocessedStatus = (val: any) =>
            val === stageStatusDoc.CHUA_XU_LY ||
            val === stageStatusMapV2.CHUA_XU_LY ||
            val === 'CHUA_XU_LY' ||
            val === 'Chưa xử lý';

        const isFinalBlockedStatus = (val: any) =>
            val === stageStatusMapV2.DONG_Y_VBDT ||
            val === stageStatusDoc.DONG_Y_VBDT ||
            val === stageStatusMapV2.DE_NGHI_BH ||
            val === stageStatusDoc.DE_NGHI_BH ||
            val === stageStatusMapV2.CHO_SO ||
            val === stageStatusDoc.CHO_SO ||
            val === stageStatusMapV2.DA_BAN_HANH ||
            val === stageStatusDoc.DA_BAN_HANH ||
            val === stageStatusMapV2.DA_DONG_DAU ||
            val === stageStatusDoc.DA_DONG_DAU ||
            val === stageStatusMapV2.CHO_DONG_DAU ||
            val === stageStatusDoc.CHO_DONG_DAU;

        let latestProcessedIndex = -1;
        let latestProcessedAudit: any = null;

        for (let i = sortedOutgoingAudit.length - 1; i >= 0; i--) {
            const a = sortedOutgoingAudit[i];
            if (!a) continue;

            // Xác định xem bản ghi audit có thuộc về user hiện tại hay không
            // Kiểm tra cả receiver (người nhận) VÀ userId/createdBy (người gửi/trình)
            const isUserAudit = a.receiver === userId;
            const isUserSender = (a.userId === userId || a.createdBy === userId)
                && RECALLABLE_ACTION_CODES.includes(a.actionCode);

            if ((isUserAudit || isUserSender) && isRecallEligibleStatus(a)) {
                latestProcessedIndex = i;
                latestProcessedAudit = a;
                break;
            }

            // Người trình VB (sender) cũng được thu hồi nếu bản ghi SUBMIT của họ
            // chưa bị ký/xử lý bởi người nhận
            if (isUserSender && isUnprocessedStatus(a.stageStatus)) {
                // Kiểm tra xem sau bản ghi này có ai đã xử lý chưa
                let hasBeenProcessedAfter = false;
                for (let j = i + 1; j < sortedOutgoingAudit.length; j++) {
                    const next = sortedOutgoingAudit[j];
                    if (!next) continue;
                    if (isProcessedStatus(next.stageStatus) && next.receiver !== userId) {
                        hasBeenProcessedAfter = true;
                        break;
                    }
                    if (isFinalBlockedStatus(next.stageStatus)) {
                        hasBeenProcessedAfter = true;
                        break;
                    }
                    if (next.actionCode === 'KY_SO' || next.actionCode === 'KY_NHAY_NOI_DUNG') {
                        hasBeenProcessedAfter = true;
                        break;
                    }
                }
                if (!hasBeenProcessedAfter) {
                    latestProcessedIndex = i;
                    latestProcessedAudit = a;
                    break;
                }
            }
        }

        if (!latestProcessedAudit) {
            return false;
        }

        for (let i = latestProcessedIndex + 1; i < sortedOutgoingAudit.length; i++) {
            const next = sortedOutgoingAudit[i];
            if (!next) continue;

            if (next.actionCode === 'Thu hồi' || next.actionCode === 'THU_HOI' || isRecallAction(next.actionCode)) {
                return false;
            }

            if (isFinalBlockedStatus(next.stageStatus)) {
                return false;
            }

            if (
                isProcessedStatus(next.stageStatus) &&
                next.receiver &&
                next.receiver !== userId &&
                next.toNodeId !== latestProcessedAudit.toNodeId // Không chặn nếu là bước song song (cùng đích đến)
            ) {
                return false;
            }

            if (
                isUnprocessedStatus(next.stageStatus) &&
                next.receiver === userId
            ) {
                return false;
            }

            if (
                next.actionCode === 'KY_NHAY_NOI_DUNG' &&
                (isProcessedStatus(next.stageStatus) || next.stageStatus === 'CHO_KY_BAN_HANH')
            ) {
                return false;
            }

            if (
                next.actionCode === 'KY_SO' &&
                isProcessedStatus(next.stageStatus)
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Invalidate toàn bộ cache availableActions của một document
     */
    async invalidateDocCache(typeDocument: string, documentId: string) {
        if (!documentId) return;
        try {
            const pattern = `bpmn:actions:${typeDocument}:${documentId}:*`;
            const stream = this.redis.scanStream({
                match: pattern,
                count: 100,
            });

            stream.on('data', async (keys) => {
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            });

            stream.on('error', (err) => {
                console.error('[REDIS] Scan cache error:', err.message);
            });
        } catch (error) {
            console.error('[REDIS] Error invalidating cache:', error.message);
        }
    }
}

export default BpmnEngineService;
