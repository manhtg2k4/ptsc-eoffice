// src/work-items/work-items.controller.ts
import { Controller, Post, Param, Body, Query, Req, UseGuards, Get, Logger } from '@nestjs/common';
import { WorkItemsService } from './work-items.service';
import { ProcessWorkItemDto, ProcessWorkItemDtoDraft } from './dto/process-work-item.dto';
import { CompleteMultiProcessDto } from './dto/complete-multi-process.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SetProcessItemDto } from './dto/set-processor.dto';
import { SetProcessorsItemDto } from './dto/set-processors.dto';
import { AuthorityStages, CheckAuthority, EffectiveUser, AuthorityGuard, AuthorizedUser, OriginalUser } from 'src/authority-documents';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { WorkItemDto, WorkItemTransferDto } from './dto/work-item.dto';
import { CompleteSuggesteHandlingDto } from './dto/complete-suggeste-handling.dto';
import { SignDocumentDto } from 'src/outgoing-documents/dto/sign-document.dto';
import { DocumentsService } from 'src/documents/documents.service';

@ApiTags('WorkItems')
@Controller('work-items')
@UseGuards(AuthorityGuard) // Apply guard cho toàn bộ controller
export class WorkItemsController {
  private readonly logger = new Logger(WorkItemsController.name);

  constructor(
    private readonly workItemsService: WorkItemsService,
    private readonly userLogHelper: UserLogHelper,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly documentsService: DocumentsService,
  ) { }

  @Post(':docId/:workItemId/complete')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async complete(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.complete(docId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xử lý văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/completeSuggesteHandling')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành công việc và lưu đề xuất xử lý cho lãnh đạo' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeSuggesteHandling(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: CompleteSuggesteHandlingDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeSuggesteHandling(
        docId,
        workItemId,
        payload,
        userId,
        originalUser,
        authorizedBy,
        bpmn,
      );
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xử lý văn bản đề xuất thành công , docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xử lý văn bản đề xuất thất bại, Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('incomming/complete-mutil-process')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành nhiều công việc (work item) của văn bản đến' })
  @ApiBearerAuth()
  async completeMultiProcess(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @AuthorizedUser() authorizedBy: string | null,
    @Body() payload: CompleteMultiProcessDto,
  ) {
    const docIds = Array.isArray(payload?.document)
      ? payload.document.map(d => d.docId).filter(Boolean).join(', ')
      : '';
    try {
      const result = await this.workItemsService.completeMultiProcess(payload, userId, originalUser, authorizedBy);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xử lý nhiều văn bản đến thành công, docIds: ${docIds}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/complete-suport')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản phối hợp' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeSuport(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeSuport(docId, workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển phối hợp văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/return')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Trả lại văn bản về bước trước trong quy trình' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async return(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.return(docId, workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trả lại văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/return-outgoing')
  @ApiOperation({ summary: 'Trả lại công việc (work item) của văn bản đi' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản đi' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async returnOutgoing(
    @Req() req: any,
    @Param('docId') docId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.returnOutgoing(docId, workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trả lại công việc (work item) của văn bản đi thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trả lại VB đi thất bại, docId: ${docId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/complete-processing')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn tất xử lý công việc (work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeProcessing(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeProcessing(docId, workItemId, payload, bpmn, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành xử lý công việc thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành xử lý thất bại, docId: ${docId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/complete-and-transition')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn tất và chuyển tiếp công việc (work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeAndTransition(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeAndTransition(docId, workItemId, payload, bpmn, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn tiền tất và chuyển tiếp công việc thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      // Log failure...
      throw error;
    }
  }

  @Post(':docId/:workItemId/createdoc-draft')
  @ApiOperation({ summary: 'Tạo dự thảo (work item) của văn bản' })
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async createDocDraft(
    @Req() req: any,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: ProcessWorkItemDtoDraft,
    @Query('bpmn') bpmn?: string,
  ) {
    const userId = req?.user?.userId || "";
    return this.workItemsService.createDocDraft(docId, workItemId, payload, bpmn, userId);
  }

  @Post(':docId/:workItemId/complete-doc')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn tất toàn bộ văn bản' })
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeDoc(
    @Req() req: any,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeDoc(docId, workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn tất toàn bộ văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn tất VB thất bại, docId: ${docId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/process')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Xử lý công việc (work item) của văn bản' })
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async processDocument(
    @Req() req: any,
    @Param('docId') docId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: ProcessWorkItemDto,
    @AuthorizedUser() author: string,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.processDocument(docId, workItemId, payload, userId, originalUser, author, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Phân công (Chuyển xử lý) văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/set-processor')
  @ApiOperation({ summary: 'Trình ký văn bản' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async setProcessor(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: SetProcessItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.setProcessor(workItemId, payload, userId, bpmn, true);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trình ký văn bản thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trình ký thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/set-processors')
  @ApiOperation({ summary: 'Trình ký văn bản (nhiều người)' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async setProcessors(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: SetProcessorsItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.setProcessors(workItemId, payload, userId, bpmn, true);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trình ký văn bản (nhiều người) thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      console.error('ERROR in setProcessors:', error);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Trình ký (nhiều người) thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/viewer')
  @ApiOperation({ summary: 'Đã xem công việc được nhận để biết' })
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async updateViewerStatus(
    @Req() req: any,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,     // lấy user từ middleware JWT
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
    @EffectiveUser() userId?: string,

  ) {
    const effectiveUserId = userId || req?.user?.userId || "";
    try {
      const result = await this.workItemsService.updateViewerStatus(docId, workItemId, payload, bpmn, effectiveUserId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đã xem công việc được nhận để biết thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: effectiveUserId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đánh dấu đã xem thất bại, docId: ${docId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: effectiveUserId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }


  // @Public()
  @Post(':docId/:workItemId/completed')
  @ApiOperation({ summary: 'Hoàn thành công việc được nhận để biết' })
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async updateSupporterStatus(
    @Req() req: any,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,     // lấy user từ middleware JWT
    @Body() payload: ProcessWorkItemDto,
    @Query('bpmn') bpmn?: string,
    @EffectiveUser() userId?: string,
  ) {
    const effectiveUserId = userId || req?.user?.userId || "";
    try {
      const result = await this.workItemsService.updateSupporterStatus(docId, workItemId, payload, bpmn, effectiveUserId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành phối hợp công việc thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: effectiveUserId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành phối hợp thất bại, docId: ${docId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: effectiveUserId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/approve')
  @ApiOperation({ summary: 'Đồng ý dự thảo' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async approveDraft(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: SetProcessItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.approveDraft(workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đồng ý dự thảo thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đồng ý dự thảo thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/complete-draft')
  @ApiOperation({ summary: 'Hoàn thành văn bản tờ trình' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async completeDraft(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @Body() payload: SetProcessItemDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.completeDraft(workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành văn bản tờ trình thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành tờ trình thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/promulgate-doc')
  @ApiOperation({ summary: 'Ban hành văn bản' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async promulgateDocument(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @Body() payload: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Query('bpmn') bpmn?: string,
  ) {
    const logContext = {
      workItemId,
      docIds: payload?.docIds,
      actionCode: payload?.actionCode,
      userId,
      originalUser,
      ip: req?.socket?.remoteAddress || 'Unknown',
      bpmn: bpmn || null,
    };


    try {
      const result = await this.workItemsService.promulgateDocument(workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Ban hành văn bản thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      const statusCode = error?.status || error?.statusCode || 500;
      const errorResponse = typeof error?.getResponse === 'function'
        ? error.getResponse()
        : undefined;
      this.logger.error(
        `[promulgate-doc][api] Failed status=${statusCode} context=${JSON.stringify(logContext)} error=${error?.message || error}`,
        error?.stack,
      );
      if (errorResponse) {
        this.logger.error(
          `[promulgate-doc][api] ErrorResponse ${JSON.stringify(errorResponse)}`,
        );
      }
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Ban hành VB thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/propose-release')
  @ApiOperation({ summary: 'Đề nghị ban hành' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async proposeDocumentIssuance(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: SetProcessItemDto,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.proposeDocumentIssuance(workItemId, payload, userId, originalUser, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đề nghị ban hành thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đề nghị ban hành thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post('/:workItemId/sign-doc')
  @ApiOperation({ summary: 'Ký số' })
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async signDoc(
    @Req() req: any,
    @Param('workItemId') workItemId: string,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Body() payload: SignDocumentDto,
    @AuthorizedUser() authorizedBy: string | null
  ) {
    try {
      const result = await this.workItemsService.signDoc(workItemId, payload, userId, originalUser, undefined, req, undefined, true);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Ký số thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Ký số thất bại, workItemId: ${workItemId}. Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':meetingId/:workItemId/propose')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Trình một công việc (work item) của lịch họp cho phòng quản lý lịch họp' })
  @ApiBearerAuth()
  @ApiParam({ name: 'meetingId', description: 'ID của lịch họp' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async propose(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Trình một công việc (work item) của lịch họp, id: ${meetingId}, workItemId: ${workItemId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return this.workItemsService.propose(meetingId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
  }

  @Post(':meetingId/:workItemId/reject-meeting')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Từ chối một công việc (work item) của lịch họp cho phòng quản lý lịch họp' })
  @ApiBearerAuth()
  @ApiParam({ name: 'meetingId', description: 'ID của lịch họp' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async rejectMeeting(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Trình một công việc (work item) của lịch họp, id: ${meetingId}, workItemId: ${workItemId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return this.workItemsService.rejectMeeting(meetingId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
  }

  @Post(':meetingId/:workItemId/approve-meeting')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Phê duyệt một công việc (work item) của lịch họp cho phòng quản lý lịch họp' })
  @ApiBearerAuth()
  @ApiParam({ name: 'meetingId', description: 'ID của lịch họp' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async approveMeeting(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('meetingId') meetingId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Phê duyệt công việc (work item) của lịch họp, id: ${meetingId}, workItemId: ${workItemId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    return this.workItemsService.approveMeeting(meetingId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
  }

  @Get(':processKey/process-progress')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @ApiOperation({ summary: 'Quy trình và tiến độ quy trình' })
  @ApiBearerAuth()
  @ApiParam({ name: 'processKey', description: 'Mã của quy trình' })
  async processProgress(
    @Param('processKey') processKey: string,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    const { workItemId, docId, isStamp } = req.query;
    const hasStampQuery = Object.prototype.hasOwnProperty.call(req.query || {}, 'isStamp');
    try {
      const result = await this.workItemsService.processProgress({ processKey, workItemId, docId, userId, isStamp, hasStampQuery });
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lấy quy trình và tiến độ quy trình thành công, processKey: ${processKey}, workItemId: ${workItemId}, docId: ${docId}, userId: ${userId}, isStamp: ${isStamp}`,
          method: 'GET',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lấy quy trình và tiến độ quy trình thất bại, processKey: ${processKey}, workItemId: ${workItemId}, docId: ${docId}, userId: ${userId}, isStamp: ${isStamp}`,
          method: 'GET',
          status: 'FAIL',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/simple-next')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async simpleNext(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.simpleNext(docId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển bước tiếp thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }

  @Post(':docId/:workItemId/transferView')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Chuyển xem văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async transferView(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    const roleProcess = 'viewer';
    const isDelWorkItem = false;
    const typeDoc = 'incoming_document'
    try {
      const result = await this.workItemsService.transferViewService(docId, workItemId, payload, userId, originalUser, authorizedBy, typeDoc, undefined, bpmn, roleProcess, isDelWorkItem);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xem văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }
  @Post(':docId/:workItemId/transer-support')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async transferSupporController(
    @Req() req: any,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: WorkItemTransferDto,
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.workItemsService.transferSupportService(docId, workItemId, payload, userId, originalUser, authorizedBy, bpmn);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển xử lý văn bản thành công, docId: ${docId}, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw error;
    }
  }
}
