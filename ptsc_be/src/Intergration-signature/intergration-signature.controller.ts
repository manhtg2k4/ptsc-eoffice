import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { multerOptions } from "src/file-manager/multer.config";
import { validateFileSecurity, sanitizeFileContent } from "src/utils/file-security.util";
import { FilesManagementService } from "src/files-managerment/files-management-mssql.service";
import { Public } from "src/oauth/decorator/public.decorator";
import { WorkItemsService } from "src/work-items/work-items.service";
import { UploadFileRemoteSingningDto } from "./dto/uploadFileRemoteSingningDto.dto";
import { SystemLogServiceSql } from "src/systemLogManagement/system-log-service-sql";
import { SetProcessItemDto } from "src/work-items/dto/set-processor.dto";
import { ProcessWorkItemDto } from "src/work-items/dto/process-work-item.dto";
import { MSSQLRepository } from "src/database/sqlRepo.mssql";
import { MSSQL_REPO } from "src/database/database.provider";
import { OutgoingDocumentsService } from "src/outgoing-documents/outgoing-documents.service";
import { mapActionToLabelCommon } from "src/documents/helpers/build.filter";
import { IntegrationSignatureService } from "./intergration-signature.service";
import { CallbackAuthGuard } from "./guards/callback-auth.guard";

@ApiTags('Tích hợp Chữ ký')
@Controller('integration-signature')
export class IntergrationSignatureController {
    constructor(
        private readonly fileService: FilesManagementService,
        private readonly workItemsService: WorkItemsService,
        private readonly systemLogService: SystemLogServiceSql,
        @Inject(MSSQL_REPO) private readonly repo: MSSQLRepository,
        private readonly outgoingDocumentService: OutgoingDocumentsService,
        private readonly intergrationSignatureService: IntegrationSignatureService,
    ) { }
    private async safeCreateSystemLog(payload: any): Promise<void> {
        try {
            await this.systemLogService.createLogFromSystem(payload);
        } catch (error) {
            console.error('[integration-signature][callback] Lỗi ghi log:', error);
        }
    }

    @Post('upload-remote-signing')
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UploadFileRemoteSingningDto })
    @UseInterceptors(FileInterceptor('file', multerOptions))
    @ApiOperation({
        summary: 'Upload file để ký số từ xa',
        description: 'Upload file để ký số từ xa và nhận về thông tin ký số',
    })
    async uploadFileRemoteSigning(@UploadedFile() file: Express.Multer.File, @Body() body: UploadFileRemoteSingningDto, @Req() req) {
        const dto: UploadFileRemoteSingningDto = req.body;
        const userId = req?.authorizedUser || req?.user?.userId || req?.user?.id;
        if (dto?.userId && String(dto.userId) !== String(userId)) {
            throw new BadRequestException('userId trong body không khớp với user đang đăng nhập');
        }
        dto.userId = userId;
        if (!userId) {
            throw new UnauthorizedException(
                'Thông tin người dùng không tồn tại trong request.',
            );
        }

        // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
        await validateFileSecurity(file);
        // await sanitizeFileContent(file);

        return this.fileService.uploadFileRemoteSigning(dto, file);
    }

    @Public()
    async debugDoc(@Param('docId') docId: string) {
        return this.intergrationSignatureService.debugWorkItems(docId);
    }

    @Public()
    @Post('callback')
    @UseGuards(CallbackAuthGuard)
    @ApiConsumes('application/json')
    @ApiOperation({ summary: 'Câp nhật trang thai văn bản khi người ngôn', description: 'Callback của ký số cập nhật trạng thái văn bản' })
    async handleCallback(@Body() body: any, @Req() req) {
        try {
            // Kiểm tra lỗi xác thực từ CallbackAuthGuard (guard ghi vào req thay vì throw)
            if (req.__callbackAuthError) {
                return {
                    success: false,
                    message: `Lỗi xác thực callback: ${req.__callbackAuthError}`,
                    data: null,
                };
            }

            let resSingDoc: any;
            let targetRole = "";
            let workItemId: string;
            let payload = {};
            const data = body ?? {};
            const callbackData = data?.data ?? {};
            const userId = callbackData?.handleBy || callbackData?.userId;
            const docId = callbackData?.document_id;
            const action = data?.action;
            let payloadSign = callbackData?.payloadSign;

            if (!action || typeof action !== 'string') {
                return {
                    success: false,
                    message: 'Action callback không hợp lệ hoặc bị thiếu',
                    data: null,
                };
            }

            if (Array.isArray(payloadSign)) {
                const matched = payloadSign.find(paySign => paySign.userId === userId);
                if (matched) {
                    payloadSign = matched;
                } else {
                    console.warn(`[handleCallback] userId="${userId}" khong khop voi bat ky payloadSign.userId nao. Fallback lay phan tu dau tien.`);
                    payloadSign = payloadSign[0];
                }
                targetRole = payloadSign?.targetRole;
                workItemId = payloadSign?.workItemId;
            } else {
                targetRole = payloadSign?.targetRole;
                workItemId = payloadSign?.workItemId;
            }

            switch (action) {
                case 'update-file-signature':
                    try {
                        const fileSigned = await this.fileService.uploadFileSinged(data);
                        resSingDoc = await this.workItemsService.signDoc(workItemId, payloadSign, userId, req);
                        let objetMessage = {
                            action: 'POST',
                            details: `Cập nhật file ký số thành công ở ký số tập trung, workItemId: ${workItemId}`,
                            method: 'POST',
                            status: 'SUCCESS',
                            type: process.env.CLIENT_LOG || 'DHVBTC',
                            subType: process.env.CLIENT_LOG || 'DHVBTC',
                            userInfo: userId || "",
                            ipAddress: req?.socket?.remoteAddress || 'Unknown',
                            timestamp: new Date().toISOString(),
                        };
                        if (!fileSigned.success || !resSingDoc?.status) {
                            objetMessage.details = `Cập nhật file ký số thất bại ở ký số tập trung, workItemId: ${workItemId}`;
                            objetMessage.status = 'FAILED';
                        }
                        await this.safeCreateSystemLog(objetMessage);
                        const res = data?.data?.payloadSign.filter(pay => pay.userId !== userId);

                        return res;
                    } catch (error) {
                        const errDetail = {
                            message: error?.message,
                            // stack: error?.stack,
                            responseData: error?.response?.data,
                            responseStatus: error?.response?.status,
                        };
                        console.error('[handleCallback][update-file-signature] Lỗi chi tiết:', JSON.stringify(errDetail, null, 2));
                        return {
                            success: false,
                            message: `Lỗi xử lý callback update-file-signature: ${error?.message}`,
                            details: errDetail,
                        };
                    }

                case 'update-file-signature-last':
                    try {
                        if (payloadSign) {
                            payloadSign.actionCode = data?.extensionProps?.actionCodeSignDoc;
                        }
                        const fileSignedLast = await this.fileService.uploadFileSinged(data);
                        resSingDoc = await this.workItemsService.signDoc(workItemId, payloadSign, userId, req);
                        const arrayTaskLast = resSingDoc?.nextNode?.tasks || [];

                        let msgLast = {
                            action: 'POST',
                            details: `Cập nhật file ký số (last) thành công`,
                            method: 'POST',
                            status: 'SUCCESS',
                            type: process.env.CLIENT_LOG || 'DHVBTC',
                            subType: process.env.CLIENT_LOG || 'DHVBTC',
                            userInfo: userId || "",
                            ipAddress: req?.socket?.remoteAddress || 'Unknown',
                            timestamp: new Date().toISOString(),
                        };

                        if (!fileSignedLast.success || !resSingDoc?.status) {
                            msgLast.details = `Cập nhật file ký số (last) thất bại, workItemId: ${workItemId}`;
                            msgLast.status = 'FAILED';
                        }

                        await this.safeCreateSystemLog(msgLast);

                        let newWorkItemId = arrayTaskLast;
                        let assigneesArr = data?.data?.assignees || data?.data?.assignee || [];
                        const nextWorkitem = newWorkItemId.find(workItem => workItem.assignee === userId);

                        if (data?.extensionProps?.actionCode) {
                            const setProcessItem = {
                                actionCode: data?.extensionProps?.actionCode,
                                userId: userId,
                                docIds: docId,
                                targetRole: resSingDoc?.nextNode?.targetRole,
                                assignToUserId: assigneesArr
                            } as SetProcessItemDto;

                            if (!nextWorkitem?.workItemId) {
                                throw new BadRequestException('Khong tim thay work item tiep theo de setProcessor');
                            }
                            const resSetProcessor = await this.workItemsService.setProcessor(nextWorkitem.workItemId, setProcessItem, userId);

                            const payloadSignAfterSetProcessor = resSetProcessor?.nextNode?.tasks?.map(task => ({
                                workItemId: task.workItemId,
                                docIds: docId,
                                actionCode: resSetProcessor?.nextNode?.actionCode || '_',
                                userId: task.assignee,
                                targetRole: resSetProcessor?.nextNode?.targetRole
                            })) || [];

                            return {
                                payloadSign: payloadSignAfterSetProcessor
                            }
                        } else {
                            const assigneesFromTasks = arrayTaskLast?.map(task => task.assignee) || [];
                            const payloadSignDirect = arrayTaskLast?.map(task => ({
                                workItemId: task.workItemId,
                                docIds: docId,
                                actionCode: resSingDoc?.nextNode?.actionCode || '_',
                                userId: task.assignee,
                                targetRole: resSingDoc?.nextNode?.targetRole
                            })) || [];

                            return {
                                assignees: assigneesFromTasks,
                                payloadSign: payloadSignDirect
                            };
                        }
                    } catch (error) {
                        const errDetail = {
                            message: error?.message,
                            // stack: error?.stack,
                            responseData: error?.response?.data,
                            responseStatus: error?.response?.status,
                        };
                        console.error('[handleCallback][update-file-signature-last] Lỗi chi tiết:', JSON.stringify(errDetail, null, 2));
                        return {
                            success: false,
                            message: `Lỗi xử lý callback update-file-signature-last: ${error?.message}`,
                            details: errDetail,
                        };
                    }

                case 'update-approve-draft':
                    payload = {
                        actionCode: 'KY_SO_TAP_TRUNG',
                        userId,
                        note: 'Ký số tập trung thành công',
                        docIds: docId,
                        targetRole: targetRole,
                        assignToUserId: userId
                    };
                    await this.safeCreateSystemLog({
                        action: 'POST',
                        details: `Đồng ý dự thảo, workItemId: ${workItemId}`,
                        method: 'POST',
                        status: 'SUCCESS',
                        type: process.env.CLIENT_LOG || 'DHVBTC',
                        subType: process.env.CLIENT_LOG || 'DHVBTC',
                        userInfo: userId || "",
                        ipAddress: req?.socket?.remoteAddress || 'Unknown',
                        timestamp: new Date().toISOString(),
                    });
                    try {
                        return await this.workItemsService.approveDraft(workItemId, payload as SetProcessItemDto, userId, userId);
                    } catch (error) {
                        return {
                            success: false,
                            message: `Lỗi xử lý callback update-approve-draft: ${error?.message || error}`,
                            data: null,
                        };
                    }

                case 'update-return-workitem':
                    payload = {
                        actionCode: 'TRA_LAI',
                        userId: userId,
                        displayName: "",
                        assignToUserId: userId,
                        selections: payloadSign?.selections || [],
                        assignments: payloadSign?.assignments || [],
                        deadline: payloadSign?.deadline || null,
                        note: 'Trả lại văn bản đi sau khi ký số tập trung',
                        roles: targetRole
                    } as ProcessWorkItemDto;
                    await this.safeCreateSystemLog({
                        action: 'POST',
                        details: `Trả lại công việc (work item) của văn bản đi, docId: ${docId}, workItemId: ${workItemId}`,
                        method: 'POST',
                        status: 'SUCCESS',
                        type: process.env.CLIENT_LOG || 'DHVBTC',
                        subType: process.env.CLIENT_LOG || 'DHVBTC',
                        userInfo: req?.user?.userId || "",
                        ipAddress: req?.socket?.remoteAddress || 'Unknown',
                        timestamp: new Date().toISOString(),
                    });
                    try {
                        return await this.workItemsService.returnOutgoing(docId, workItemId, payload as ProcessWorkItemDto, userId, userId);
                    } catch (error) {
                        return {
                            success: false,
                            message: `Lỗi xử lý callback update-return-workitem: ${error?.message || error}`,
                            data: null,
                        };
                    }

                default:
                    await this.safeCreateSystemLog({
                        action,
                        details: `Callback ký số từ xa với trạng thái ${action} và payload: ${JSON.stringify(payloadSign)}`,
                        method: action,
                        status: 'FAIL',
                        type: 'DHVBTC',
                        subType: 'DHVBTC',
                        userInfo: userId,
                        timestamp: new Date().toISOString(),
                        ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    });

                    return {
                        success: false,
                        message: `Action Callback Ký số tập trung không xác định: ${action}`,
                        data: null,
                    };
            }
        } catch (error) {
            console.error('[handleCallback] Unhandled error:', {
                message: error?.message,
                stack: error?.stack,
            });
            return {
                success: false,
                message: `Lỗi xử lý callback integration-signature: ${error?.message || 'Unknown error'}`,
                data: null,
            };
        }
    }

    @Public()
    @Get('test-map-data')
    async testMapData(@Query('docId') docId: string): Promise<any> {
        const userId = '351AA98C-9DBD-42A5-B87B-9369466373AB';
        const roles = [];
        const docDetail = await this.outgoingDocumentService.getDetails(docId, userId, roles);

        if (docDetail?.document?.statusCode || docDetail?.document?.status_code) {
            const statusCode = docDetail.document.statusCode || docDetail.document.status_code;
            docDetail.document.statusCode = mapActionToLabelCommon(statusCode);
        }

        return docDetail;
    }
}
