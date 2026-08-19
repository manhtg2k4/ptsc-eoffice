import { Controller, Get, Query, Req, UnauthorizedException, UseGuards, Patch, Body, BadRequestException, Param, Res, HttpStatus, Delete, Post, UploadedFile, InternalServerErrorException, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ExtendDeadlineDto, ListDocumentsDto, IncomingStatisticsByTimeDto, ListDocumentsNoTypeDto, ListDocumentsOverDueDto } from '../dto/list-documents.dto';
import { AuthorityStages, CheckAuthority, EffectiveUser, AuthorityGuard, OriginalUser, AuthorizedUser } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { Response } from 'express';
import { ReturnError, defaultFilterStartDateToThisYear } from 'src/utils/util';
import { StatisticReportResponseDto } from '../dto/statistic-report-response.dto';
import { StatisticReportQueryDto } from '../dto/statistic-report-query.dto';
import { StatisticReportSenderUnitQueryDto } from '../dto/statistic-report-sender-unit.dto';
import { StatisticReportSenderUnitResponseDto } from '../dto/statistic-report-sender-unit-response.dto';
import { IncomingService } from './incoming.service';
import { TaskService } from 'src/task/task.service';
import { OutgoingDocumentsService } from 'src/outgoing-documents/outgoing-documents.service';
import { Inject, forwardRef } from '@nestjs/common';

import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';

@ApiTags('Incoming')
@Controller('incoming')
@UseGuards(AuthorityGuard) // Apply guard cho toàn bộ controller
export class IncomingController {
  constructor(
    private readonly incomingService: IncomingService,
    private readonly systemLogService: SystemLogServiceSql,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
    @Inject(forwardRef(() => OutgoingDocumentsService))
    private readonly outgoingDocumentsService: OutgoingDocumentsService,
  ) { }

  @Get('related-counts/:incomingId')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @UseGuards(DocumentPermissionGuard)
  @ApiOperation({ summary: 'Lấy số lượng liên kết VBDI, CVPS, VBTT' })
  async getRelatedCounts(
    @Param('incomingId') incomingId: string,
    @EffectiveUser() userId: string,
  ) {
    if (!incomingId) {
      throw new BadRequestException('incomingId bắt buộc phải có');
    }

    try {
      const cvpsRes = await this.taskService.findOneSelectFormDoc(incomingId, 1, 1, userId, '');
      const vbttRes = await this.incomingService.listReplacedDocuments(userId, incomingId, { limit: 1 });
      const vbdiRes = await this.outgoingDocumentsService.listOutgoingByIncomingId({ incomingId, query: { limit: 1 } });

      return {
        VBDI: vbdiRes?.total || 0,
        CVPS: cvpsRes?.total || 0,
        VBTT: vbttRes?.total || 0,
      };
    } catch (error) {
      console.error('Error in getRelatedCounts:', error);
      throw new InternalServerErrorException('Lỗi lấy dữ liệu đếm liên kết');
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê văn bản đến theo user từ token' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thống kê',
  })
  async getStatistics(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập thống kê văn bản đến`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    try {
      return await this.incomingService.getStatistics(userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập thống kê văn bản đến: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thông kê văn bản.');
    }
  }

  @Get('search')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Tra cứu văn bản đến' })
  @ApiQuery({ type: ListDocumentsNoTypeDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async searchIncoming(
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId?: string,
    @Query('isAuthority') isAuthority?: string,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập tra cứu văn bản đến trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    let userId = req.user?.userId || req.user?.id;
    if (isAuthority === 'true' || query.authority === 'true') {
      userId = effectiveUserId;
    }
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    // Ép kiểu số
    const page = query.page ? Number(query.page) : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const { filter, sort, processFn, isExport, countOnly, skipActions } = query as any;
    const skipActionsVal = skipActions !== undefined ? skipActions : 'true';
    const shouldLoadFiles = false
    try {
      return await this.incomingService.incomingRecipients({
        page,
        limit,
        sort,
        processFn,
        filter,
        userId,
        isExport,
        countOnly,
        skipActions: skipActionsVal,
        shouldLoadFiles,
      });
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi tra cứu văn bản đến: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }

      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình tra cứu văn bản.');
    }
  }

  @Get('list/main-process')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Xử lý chính' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async mainProcess(
    @Req() req: any,
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    const mainProcessTabMap: Record<string, string> = {
      'urgent': 'Khẩn',
      'deadline': 'Hạn xử lý',
      'other': 'Khác',
      'processed': 'Đã xử lý',
      'incompleted': 'Chưa hoàn thành',
      'completed': 'Đã hoàn thành',
      'notComplete': 'Chưa xử lý xong',
      'notDone': 'Chưa hoàn thành (người phân công đã hoàn thành)',
    };
    const tabName = mainProcessTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đến - Xử lý chính - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    // console.log('[mainProcess] Call listDocumentsMainProcessDynamic:', {
    //   query,
    //   originalUserId,
    //   effectiveUserId,
    //   tabName,
    // });
    try {
      return await this.incomingService.listDocumentsMainProcessDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đến - Xử lý chính - tab [${tabName}]: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản xử lý chính.');
    }
  }

  @Get('list/receive')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Tiếp nhận' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async receive(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản tiếp nhận, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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

    try {
      return await this.incomingService.listDocumentsReceiveDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB tiếp nhận: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản tiếp nhận.');
    }
  }

  @Get('list/for-task')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản nguồn cho công việc' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async receiveV1(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    defaultFilterStartDateToThisYear(query, true);
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản nguồn cho công việc`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsForTask(query, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB nguồn cho công việc: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản nguồn cho công việc.');
    }
  }


  @Get('list/replaced-by-incoming/:incomingId')
  async listReplacedByIncoming(
    @Param('incomingId') incomingId: string,
    @Query() query: any,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách VB thay thế theo VB đến, incomingId: ${incomingId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    try {
      return await this.incomingService.listReplacedDocuments(userId, incomingId, query);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB thay thế theo VB đến: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản.');
    }
  }

  @Get('list/implementation-coordination')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Phối hợp' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async implementation(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const implCoordTabMap: Record<string, string> = {
      'waiting': 'Chờ xử lý',
      'processed': 'Đã xử lý',
      'incompleted': 'Chờ hoàn thành',
      'notDone': 'Chưa hoàn thành',
      'completed': 'Hoàn thành',
    };
    const tabName = implCoordTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đến - Phối hợp - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsImplementationDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đến - Phối hợp - tab [${tabName}]: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản phối hợp.');
    }
  }

  @Get('list/recipient-to-know')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Nhận để biết' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async viewer(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const recipientTabMap: Record<string, string> = {
      'waiting': 'Chờ xử lý',
      'processed': 'Đã xử lý',
    };
    const tabName = recipientTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đến - Nhận để biết - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsViewerDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đến - Nhận để biết - tab [${tabName}]: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản.');
    }
  }

  @Get('list/combined-dashboard')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Gộp "chờ xử lý": Xử lý chính (deadline) + Phối hợp (waiting) + Nhận để biết (waiting)' })
  @ApiQuery({ type: ListDocumentsNoTypeDto })
  @ApiResponse({ status: 200, description: 'Danh sách gộp 3 loại VB đến đang chờ xử lý' })
  async mergedWaiting(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đến - Gộp chờ xử lý, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error?.message || error);
    }
    try {
      return await this.incomingService.listDocumentsMergedWaiting(query, originalUserId, effectiveUserId);
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản.');
    }
  }

  @Get('count/merged-waiting')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Lấy số lượng văn bản đến gộp "chờ xử lý"' })
  async countMergedWaiting(
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const count = await this.incomingService.countDocumentsMergedWaiting(effectiveUserId || originalUserId);
      return { success: true, total: count };
    } catch (error) {
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy số lượng văn bản.');
    }
  }

  @Get('list/reply')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Nhận để biết' })
  @ApiQuery({ type: ListDocumentsNoTypeDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async reply(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản phúc đáp, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsReplyDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách văn bản phúc đáp: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản.');
    }
  }

  //Api từ chối tiếp nhận các văn bản đến được gửi nhầm từ văn bản đi => Đổi trạng thái (stage_status ) vb đến thành 0 ( từ chối tiếp nhận)
  @Patch('reject')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Từ chối tiếp nhận các văn bản đến' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Danh sách ID của văn bản cần từ chối',
        },
        note: {
          type: 'string',
          description: 'Lý do từ chối (bắt buộc)',
        },
      },
      required: ['documentIds', 'note'],
    },
  })
  @ApiResponse({ status: 200, description: 'Từ chối thành công' })
  @ApiResponse({ status: 401, description: 'Không có quyền' })
  @ApiResponse({ status: 400, description: 'Thiếu thông tin bắt buộc' })
  async rejectIncomingDocuments(
    @Body() body: { documentIds: string[]; note: string },
    @Req() req: any,
    // @OriginalUser() originalUserId: string,
  ) {
    const originalUserId = req.user?.userId || req.user?.id;
    if (!originalUserId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user');
    }
    if (!body.note || !body.note.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }
    try {
      const result = await this.incomingService.rejectIncomingDocuments(body.documentIds, originalUserId, body.note);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Từ chối tiếp nhận văn bản đến thành công. Lý do: ${body.note}`,
          method: 'PATCH',
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
          action: 'PATCH',
          details: `Lỗi từ chối tiếp nhận văn bản đến: ${error?.message || error}`,
          method: 'PATCH',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình từ chối tiếp nhận văn bản đến.');
    }
  }

  @Get('get-user-in-flow')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Lấy danh sách người xử lý trong luồng của 1 văn bản đến' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách người xử lý trong luồng thành công', })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 400, description: 'Thiếu thông tin bắt buộc' })
  @ApiQuery({ name: 'documentId', required: true, description: 'ID văn bản đến' })
  async getUserInFlow(
    @Query('documentId') documentId: string,
    @EffectiveUser() effectiveUserId: string,
    @Req() req?: any,
  ) {
    try {
      if (!documentId) {
        throw new BadRequestException('Vui lòng nhập id văn bản đến');
      }
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách người xử lý trong luồng, documentId: ${documentId}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || effectiveUserId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      }).catch(() => { });
      const result = await this.incomingService.getUserInFlow(documentId, effectiveUserId);
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi lấy danh sách người xử lý trong luồng: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách người xử lý trong luồng.');
    }
  }

  @Patch(':documentId/extend-deadline')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Gia hạn xử lý cho người dùng trong luồng' })
  @ApiResponse({ status: 200, description: 'Gia hạn thành công.' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 400, description: 'Thiếu thông tin bắt buộc' })
  @ApiParam({ name: 'documentId', required: true, description: 'ID văn bản đến' })
  @ApiBody({ type: ExtendDeadlineDto })
  async extensionDeadlineUser(
    @Param('documentId') documentId: string,
    @Body() extendDeadlineDto: ExtendDeadlineDto,
    @Res() res: Response,
    @EffectiveUser() effectiveUserId: string,
    @Req() req?: any,
  ) {
    try {
      if (!documentId) {
        throw new BadRequestException('Vui lòng nhập id văn bản đến');
      }
      const result = await this.incomingService.extensionDeadlineUser(documentId, extendDeadlineDto, effectiveUserId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Gia hạn xử lý văn bản đến, documentId: ${documentId}`,
          method: 'PATCH',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Lỗi gia hạn xử lý văn bản đến, documentId: ${documentId}: ${error?.message || error}`,
          method: 'PATCH',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || effectiveUserId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('list/documents-by-sender')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Văn bản theo đơn vị gửi' })
  @ApiQuery({ type: ListDocumentsOverDueDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async documentsBySender(
    @Req() req: any,
    @Query() query: ListDocumentsOverDueDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Danh sách văn bản theo đơn vị gửi, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsBySender(query, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Danh sách VB theo đơn vị gửi: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản theo đơn vị.');
    }
  }

  @Get('list/statistics-by-time')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Báo cáo thống kê văn bản đến theo thời gian' })
  @ApiQuery({ type: IncomingStatisticsByTimeDto })
  @ApiResponse({ status: 200, description: 'Danh sách thống kê văn bản đến theo thời gian' })
  async statisticsByTime(
    @Query() query: IncomingStatisticsByTimeDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê văn bản đến theo thời gian, trang: ${query?.page}, limit: ${query?.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.statisticsByTime(query, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê VB đến theo thời gian: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thống kê văn bản.');
    }
  }

  @Get('list/overdue')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Báo cáo thống kê văn bản quá hạn' })
  @ApiQuery({ type: ListDocumentsOverDueDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async overdue(
    @Req() req: any,
    @Query() query: ListDocumentsOverDueDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Danh sách văn bản đến quá hạn, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsDeadline(query, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Danh sách VB đến quá hạn: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản quá hạn.');
    }
  }

  @Get('list/directive')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Báo cáo thống kê văn bản chỉ đạo' })
  @ApiQuery({ type: ListDocumentsOverDueDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async directive(
    @Req() req: any,
    @Query() query: ListDocumentsOverDueDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Chỉ đạo của ban lãnh đạo theo văn bản đến, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
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
    try {
      return await this.incomingService.listDocumentsDirective(query, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Chỉ đạo của ban lãnh đạo: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy chỉ đạo.');
    }
  }

  @Get('list/statistic-report')
  @ApiQuery({ type: StatisticReportQueryDto, style: 'deepObject', explode: true })
  @ApiOperation({
    summary: 'Báo cáo tiến độ xử lý văn bản đến theo phòng ban',
    description: 'Trả về thống kê số lượng văn bản đúng hạn, trễ hạn, chưa xử lý theo từng phòng ban',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy báo cáo thành công',
    type: StatisticReportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server',
  })
  async getStatisticReport(
    @Query() query: StatisticReportQueryDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ): Promise<StatisticReportResponseDto> {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê tiến độ xử lý văn bản đến, trang: ${query?.page}, limit: ${query?.limit}`,
        method: 'GET',
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
    const userId = effectiveUserId;
    try {
      return await this.incomingService.getStatisticReport(query, userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê tiến độ xử lý VB đến: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thống kê văn bản đến.');
    }
  }

  @Get('list/statistic-report-sender-unit')
  @ApiQuery({ type: StatisticReportSenderUnitQueryDto, style: 'deepObject', explode: true })
  @ApiOperation({
    summary: 'Báo cáo văn bản đến theo phòng ban gửi',
    description: 'Trả về thống kê số lượng văn bản đến theo phòng ban gửi',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy báo cáo thành công',
    type: StatisticReportSenderUnitResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server',
  })
  async getStatisticReportOfSenderUnit(
    @Query() query: StatisticReportSenderUnitQueryDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ): Promise<StatisticReportSenderUnitResponseDto> {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê văn bản theo đơn vị gửi, trang: ${query?.page}, limit: ${query?.limit}`,
        method: 'GET',
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
    const userId = effectiveUserId;
    try {
      return await this.incomingService.getStatisticReportOfSenderUnit(query, userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê VB theo đơn vị gửi: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy văn bản đến.');
    }
  }

  @Delete(':documentId/draft')
  @ApiOperation({ summary: 'Xoá văn bản nháp' })
  async deleteDraft(
    @Param('documentId') documentId: string,
    @Req() req?: any,
  ) {
    if (!documentId) {
      throw new BadRequestException('Thiếu documentId');
    }
    try {
      const result = await this.incomingService.deleteDraftById(documentId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Xóa văn bản nháp VB đến thành công, documentId: ${documentId}`,
          method: 'DELETE',
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
          action: 'DELETE',
          details: `Lỗi xóa văn bản nháp VB đến, documentId: ${documentId}: ${error?.message || error}`,
          method: 'DELETE',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình xóa văn bản nháp.');
    }
  }

  @Post(':docId/:workItemId/submit-file')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async submitFileStampDoc(
    @Req() req: any,
    // @OriginalUser() userId: string,
    @EffectiveUser() userId: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: {
      fileOrigin: string;   // URL file gốc (file cần tạo sao y)
      fileBase64: string;  // File đã preview ở bước 1
      fileName: string;
      roles?: string;
      actionCode: string,
    },
    @AuthorizedUser() authorizedBy: string,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const result = await this.incomingService.submitFileStampDoc(docId, workItemId, payload, userId, authorizedBy);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành công việc (work item) của văn bản đến, docId: ${docId}, workItemId: ${workItemId}`,
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
          details: `Lỗi hoàn thành công việc VB đến, docId: ${docId}: ${error?.message || error}`,
          method: 'POST',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Patch(':documentId/change-book')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Thay đổi sổ văn bản đến (chỉ văn thư, chưa chuyển xử lý)' })
  @ApiParam({ name: 'documentId', required: true, description: 'ID văn bản đến' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bookDocumentId: {
          type: 'string',
          description: 'ID sổ văn bản mới muốn đổi sang',
        },
        toBookDate: {
          type: 'string',
          example: '2024-05-10',
          description: 'Ngày lưu sổ (không truyền mặc định là ngày hiện tại)',
        },
      },
      required: ['bookDocumentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Đổi sổ thành công, trả về số đến mới' })
  @ApiResponse({ status: 400, description: 'Văn bản đã được chuyển xử lý hoặc thiếu thông tin' })
  @ApiResponse({ status: 403, description: 'Không có quyền (chỉ văn thư)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy văn bản hoặc sổ văn bản' })
  async changeBook(
    @Param('documentId') documentId: string,
    @Body() body: { bookDocumentId: string; toBookDate?: string },
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
  ) {
    const userId = effectiveUserId || req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    if (!body?.bookDocumentId) {
      throw new BadRequestException('Vui lòng cung cấp bookDocumentId');
    }
    try {
      const result = await this.incomingService.changeBook(documentId, body.bookDocumentId, userId, body.toBookDate);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PATCH',
          details: `Đổi sổ văn bản đến, documentId: ${documentId}, sổ mới: ${body.bookDocumentId}`,
          method: 'PATCH',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || '',
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
          action: 'PATCH',
          details: `Lỗi đổi sổ văn bản đến, documentId: ${documentId}: ${error?.message || error}`,
          method: 'PATCH',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }
}
