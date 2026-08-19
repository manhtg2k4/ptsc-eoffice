import { forwardRef, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { MSSQL_REPO } from 'src/database/database.provider';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { OutgoingDocumentsService } from 'src/outgoing-documents/outgoing-documents.service';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { mapActionToLabelCommon } from "src/documents/helpers/build.filter";

interface StartProcessPayload {
    processKey: string;
    variables: any;
    assigneeUserId?: string;
}

@Injectable()
export class IntegrationSignatureService {
    constructor(
        @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
        private readonly bpmnEngine: BpmnEngineService,
        @Inject(forwardRef(() => OutgoingDocumentsService))
        private readonly outgoingDocumentService: OutgoingDocumentsService,

    ) { }

    private buildSigningHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (process.env.KSTT_CLIENT_ID) {
            headers['x-client-id'] = process.env.KSTT_CLIENT_ID;
        }

        if (process.env.KSTT_API_KEY) {
            headers['x-api-key'] = process.env.KSTT_API_KEY;
        }

        return headers;
    }

    async updateSignatureStatusCamunda(
        userId: string[],
        document: any,
        node: any,
        indexes: any,
        wiIds: any,
        targetRole: string,
        docDetail?: any // Document det ail đã được map sẵn, truyền từ bên ngoài transaction
    ): Promise<any> {
        try {
            if (!document) {
                throw new Error('Document is required');
            }

            if (!document.documentId) {
                throw new Error('Document ID is required');
            }

            if (!node || !node.outgoing) {
                throw new Error('Invalid node or node outgoing is missing');
            }
            const PROCESS_KEY = process.env.PROCESS_KEY_SIGNATURE || 'qtksvbd';
            const docSend = document.documentId;
            const abstractNote = document.abstractNote || '';
            const files = await this.repo.getFileByDocId(docSend);
            const baseFileUrl = process.env.URL_NESTJS + '/api/files/download-tool';
            let assigneeUserId: string = '';

            let choosenNextNode: any;
            let actionCode: any;
            
            if (!files || files.length === 0) {
                throw new Error('No files found for document');
            }

            // Group files by objectType
            const duthaoFiles = files.filter(f => f.objectType === 'docDraft');
            const dinhkemFiles = files.filter(f => f.objectType === 'docAttachments');
            const dexuatFiles = files.filter(f => f.objectType === 'docProposal');

            if (!process.env.URL_NESTJS) {
                throw new Error('URL_NESTJS environment variable is not configured');
            }


            // Build documentFiles array
            const documentFiles: any[] = [];

            if (duthaoFiles.length > 0) {
                documentFiles.push({
                    title: 'VĂN BẢN DỰ THẢO',
                    name: 'duthao',
                    fileList: duthaoFiles.map(f => ({
                        name: f.fileName,
                        fileUrl: `${baseFileUrl}/${f.fileId}`,
                        objectType: f.objectType,
                        objectId: f.objectId
                    }))
                });
            }

            if (dinhkemFiles.length > 0) {
                documentFiles.push({
                    title: 'VĂN BẢN ĐÍNH KÈM',
                    name: 'vbdinhkem',
                    fileList: dinhkemFiles.map(f => ({
                        name: f.fileName,
                        fileUrl: `${baseFileUrl}/${f.fileId}`,
                        objectType: f.objectType,
                        objectId: f.objectId
                    }))
                });
            }
            if (dexuatFiles.length > 0) {
                documentFiles.push({
                    title: 'VĂN BẢN ĐỀ XUẤT',
                    name: 'vbdexuat',
                    fileList: dexuatFiles.map(f => ({
                        name: f.fileName,
                        fileUrl: `${baseFileUrl}/${f.fileId}`,
                        objectType: f.objectType,
                        objectId: f.objectId
                    }))
                });
            }

            for (const out of node.outgoing) {
                if (!out) continue;

                const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(out, indexes);
                actionCode = out.name || '';

                if (out.targetRef) {
                    const extnext = getAllNodeExtensionProperties(out.targetRef);
                    if (extnext?.keySign) {
                        choosenNextNode = nextNode;
                        break;
                    }
                }
            }

            // }

            // Sử dụng docDetail đã được truyền vào (đã fetch trước khi vào transaction)
            // Nếu docDetail không có, log warning và tiếp tục với dữ liệu cơ bản
            if (!docDetail) {
                console.warn('[updateSignatureStatusCamunda] docDetail is null, using basic document data');
            }

            // Map status code
            let statusCodeMapped = '_';
            if (docDetail?.document?.statusCode || docDetail?.document?.status_code) {
                const statusCode = docDetail.document.statusCode || docDetail.document.status_code;
                statusCodeMapped = mapActionToLabelCommon(statusCode);
            }

            let payloadSign: any[] = [];
            if (Array.isArray(wiIds) && wiIds.length > 0) {
                for (let i = 0; i < wiIds.length; i++) {
                    payloadSign.push({
                        workItemId: wiIds[i],
                        docIds: docSend,
                        actionCode: actionCode || '_',
                        userId: userId[i],
                        targetRole: targetRole
                    })
                }
            }

            const toCamundaISO = (dateStr?: any) => {
                if (!dateStr || dateStr === '_') return '_';

                try {
                    let d: Date;

                    if (dateStr instanceof Date) {
                        d = dateStr;
                    } else if (typeof dateStr === 'string') {
                        // Nếu là định dạng DD/MM/YYYY
                        if (dateStr.includes('/')) {
                            const [day, month, year] = dateStr.split('/');
                            d = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
                        } else {
                            // Thử parse như chuỗi ISO bình thường
                            d = new Date(dateStr);
                        }
                    } else {
                        return '_';
                    }

                    if (isNaN(d.getTime())) return '_';
                    return d.toISOString();
                } catch (e) {
                    console.error('[toCamundaISO] Error parsing date:', dateStr, e.message);
                    return '_';
                }
            };

            const payload: StartProcessPayload = {
                processKey: PROCESS_KEY,
                variables: {
                    nameProcess: "Quy trình ký số văn bản",
                    userId,
                    document_id: docSend || '_',
                    status_code: statusCodeMapped,
                    book_document_id: docDetail?.document?.bookDocumentId || '_',
                    abstract_note: abstractNote || '_',
                    to_book: docDetail?.document?.toBook || '_',
                    private_level: docDetail?.document?.privateLevel?.title || '_',
                    urgency_level: docDetail?.document?.urgencyLevel?.title || '_',
                    document_type: docDetail?.document?.documentType?.title || '_',
                    drafter: docDetail?.document?.drafter?.name || '_',
                    document_field: docDetail?.document?.documentField?.title || '_',
                    report_signer: docDetail?.document?.reportSigner?.name || '_',
                    to_book_text_symbol: docDetail?.document?.toBookTextSymbols || '_',
                    deadline_reply: docDetail?.document?.deadlineReply
                        ? toCamundaISO(docDetail.document.deadlineReply)
                        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    internal_receiving_unit: docDetail?.document?.internalReceivingUnit?.[0]?.name || '_',
                    draft_signer: docDetail?.document?.draftSigner || '_',
                    commanders_signer: docDetail?.document?.commandersSigner || '_',
                    release_no: docDetail?.document?.releaseNo || '_',
                    release_date: docDetail?.document?.releaseDate || '_',
                    doc_recall: docDetail?.document?.docRecall || '_',
                    doc_replacement: docDetail?.document?.docReplacement || '_',
                    doc_answer: docDetail?.document?.docAnswer || '_',
                    external_receiving_unit: docDetail?.document?.externalReceivingUnit?.[0]?.name || '_',
                    internal_receiving_dept: docDetail?.document?.internalReceivingDept?.[0]?.name || '_',
                    bpmn_version: docDetail?.document?.bpmnVersion || '_',
                    know_receivers: docDetail?.document?.knowReceivers?.[0]?.name || '_',
                    type_of_process: docDetail?.document?.typeOfProcess?.processKey || '_',
                    sign_type: docDetail?.document?.signType || '_',
                    internal_receiving_dept_old: docDetail?.document?.internalReceivingDeptOld?.[0] ? JSON.stringify(docDetail.document.internalReceivingDeptOld[0]) : '_',
                    sender_unit: docDetail?.document?.senderUnit?.name || '_',
                    report_document_symbol: docDetail?.document?.reportDocumentSymbol || '_',
                    documentFiles,
                    callbackUrl: process.env.URL_NESTJS + '/api/integration-signature/callback',
                    typeStorage: 'minio',
                    payloadSign: payloadSign,
                    targetRole
                }
            };
            // console.log('[IntegrationSignature] Start Proxy Payload:', JSON.stringify(payload));
            if (Array.isArray(userId) && userId.length <= 1) {
                payload.variables.assignee = userId[0];
            } else {
                payload.variables.assignees = userId;
            }
            // console.log('[IntegrationSignature] Start Proxy Payload:', JSON.stringify(payload));

            if (!process.env.KSTT_URL) {
                throw new Error('KSTT_URL environment variable is not configured');
            }
            const headers = this.buildSigningHeaders();
            const res = await axios.post(`${process.env.KSTT_URL}/api/bpmn-designs/start-form`, payload, { headers });

            if (!res || (res.status !== 200 && res.status !== 201)) {
                return false;
            }

            return true;
        } catch (error) {
            console.error(`Lỗi khi gửi văn bản đến hệ thống ký số`, error?.response?.status || '', error?.response?.data || '', error.message);
            return false;
        }
    }

    async callbackUpdateRemoteSignature(): Promise<any> {
        //     headers: {
        //         'Content-Type': 'application/json',
        //     }
        // });

        // if (!res || (res.status !== 200 && res.status !== 201)) {
        //     return false;
        // }

        // return true;
    }
    async debugWorkItems(docId: string): Promise<any> {
        try {
            const doc = await this.repo.getOutgoingDocument(docId);
            if (!doc) return { error: 'Document not found' };

            const workItems = await this.repo.listOpenWorkItems(docId);
            if (!workItems || workItems.length === 0) return { error: 'No open work items found', doc };

            const bpmnXML = await this.repo.getBpmnFile(doc.bpmnVersion);
            const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
            const indexes = this.bpmnEngine.buildIndexes(process);

            const result = workItems.map(wi => {
                const nodeId = wi.nodeId; // or node_id
                const outs = indexes.outgoingBySource.get(nodeId) || [];
                const availableActions = outs.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    target: o.targetRef?.id
                }));
                return {
                    workItemId: wi.id,
                    userId: wi.assigneeUserId,
                    nodeId: nodeId,
                    availableActions
                };
            });

            return result;
        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    }

    async getProperties(
        bpmnXML: string,
        docId: string,
        workItemId: string,
        actionCode: string
    ) {
        const { process } = await this.bpmnEngine.loadBpmnFromString(bpmnXML);
        const indexes = this.bpmnEngine.buildIndexes(process);

        const wi = await this.repo.getWorkItem(docId, workItemId);
        if (!wi) return {};

        const node = indexes.nodes.get(wi.nodeId);
        if (!node) return {};

        const outs = indexes.outgoingBySource.get(node.id) || [];

        let flow = outs.find((f: any) => (f.name && f.name.toUpperCase() === actionCode?.toUpperCase()) || f.id === actionCode);

        // Fallback: check extension properties for actionCode
        if (!flow && actionCode) {
            flow = outs.find((f: any) => {
                const props = this.bpmnEngine.getFlowExtensionProperties(f);
                return props.actionCode === actionCode;
            });
        }

        const mergedProperties = {};
        if (flow) {
            // 0. Flow properties
            Object.assign(mergedProperties, getAllNodeExtensionProperties(flow));

            // Trace path
            const { node: nextNode, passed } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

            // 1. Passed properties (Gateways)
            if (passed && passed.length > 0) {
                passed.forEach(p => {
                    Object.assign(mergedProperties, getAllNodeExtensionProperties(p));
                });
            }

            // 2. Next Node properties
            if (nextNode) {
                Object.assign(mergedProperties, getAllNodeExtensionProperties(nextNode));
            }
        }
        return mergedProperties;
    }

    async processCentralizedSignature(
        bpmnXML: string,
        docId: string,
        workItemId: string,
        actionCode: string,
        origin: 'setProcessor' | 'signDoc' = 'setProcessor',
        assignees?: string | string[], // Optional parameter for assignees
        nextAssignees?: string[], // Danh sách người dùng tiếp theo sau signDoc
        preProperties?: any // Properties đã fetch trước (dùng khi work item đã bị xóa)
    ) {
        if (origin === 'setProcessor') {
            return;
        }
        const doc = await this.repo.getOutgoingDocument(docId);
        if (!doc) return { error: 'Document not found' };
        // Dùng preProperties nếu có (vì work item có thể đã bị xóa sau signDoc)
        const properties: any = preProperties || await this.getProperties(bpmnXML, docId, workItemId, actionCode);

        const result: any = { properties };

        if (!result.properties.processKey) {
            return;
        }

        if (origin === 'signDoc') {
            result.processingUserId = assignees;
            try {

                if (!process.env.KSTT_URL) {
                    throw new Error('KSTT_URL environment variable is not configured');
                }
                const url = `${process.env.KSTT_URL}/api/bpmn-designs/find-and-submit-form-multi-instance`;
                // Parse condition dạng "quyetdinh=hoanthanh" thành variable
                const conditionVars: Record<string, any> = {};
                if (result.properties.condition) {
                    const parts = result.properties.condition.split('=');
                    if (parts.length === 2) {
                        conditionVars[parts[0].trim()] = parts[1].trim();
                    }
                }

                const payload = {
                    processKey: result.properties.processKey,
                    find: {
                        field: 'document_id',
                        value: docId
                    },
                    variables: {
                        ...conditionVars,
                        ...(nextAssignees && nextAssignees.length === 1 ? { assignee: nextAssignees[0] } : {}),
                        ...(nextAssignees && nextAssignees.length > 0 ? { assignees: nextAssignees } : {}),
                    },
                    currentUserId: assignees
                };
                const headers = this.buildSigningHeaders();
                await axios.post(url, payload, { headers }).catch(e => {
                    console.error('[processCentralizedSignature] API call failed:', e.message);
                });


                // Get all open work items to check for parallel processing
                const workItems = await this.repo.listOpenWorkItems(docId);
                if (workItems && workItems.length > 0) {
                    const currentWi = workItems.find((wi: any) => String(wi.id) === String(workItemId));
                    if (currentWi) {
                        const currentNodeId = currentWi.nodeId || currentWi.node_id;
                        // Count items on the same node (parallel instances)
                        const parallelCount = workItems.filter((wi: any) => (wi.nodeId || wi.node_id) === currentNodeId).length;
                        // If this is the last item on this node, mark as last version
                        result.isLastVersion = parallelCount <= 1;
                    } else {
                        // Work item not found (already completed?), treat as last version if no other items on same node?
                        // Safe fallback: true
                        result.isLastVersion = true;
                    }
                } else {
                    result.isLastVersion = true;
                }
            } catch (error) {
                console.warn('[processCentralizedSignature] Error checking parallel work items:', error);
                result.isLastVersion = true;
            }
        } else if (origin === 'setProcessor') {
            result.assignees = assignees;
        }
    }

}
