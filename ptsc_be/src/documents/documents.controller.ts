import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  InternalServerErrorException,
  HttpException
} from '@nestjs/common';
import { DocumentPolicy } from './incomming-document/policies/document.policy';
import { DocumentsService } from './documents.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { validateFileSecurity, sanitizeFileContent } from 'src/utils/file-security.util';
import { UserLogHelper } from './helpers/user-log.helper';
import { ListDocumentsDto, ListDocumentsNoTypeDto } from './dto/list-documents.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssignBookDto } from './dto/assign-document.dto';
import { SetProcessItemDto } from 'src/work-items/dto/set-processor.dto';
import {
  AuthorityGuard,
  AuthorityStages,
  CheckAuthority,
  EffectiveUser,
  OriginalUser,
} from 'src/authority-documents';
import { Response } from 'express';
import { ReturnError } from 'src/utils/util';
import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';
import { checkAdminPermission } from 'src/common/guards/admin-check.helper';


@ApiBearerAuth()
@ApiTags('Văn bản')
@Controller('documents')
@UseGuards(AuthorityGuard)
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Post('assign-book')
  @ApiOperation({ summary: 'Gán sổ cho 1 hoặc nhiều văn bản theo bookDocumentId' })
  async assignBookToDocuments(
    @Body() body: AssignBookDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    try {
      const docInfo = await this.documentsService.getDocumentInfoForLog(body.documentIds as string[]);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Gán sổ cho ${body.documentIds?.length || 0} văn bản [${docInfo}], bookId: ${body.bookDocumentId}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log assignBookToDocuments', error);
    }

    try {
      const start = Date.now();
      const userId =
        effectiveUserId ||
        req?.user?.userId ||
        req?.user?.id ||
        req?.user?.sub ||
        '';
      const result = await this.documentsService.assignBookToDocuments(
        body.documentIds,
        body.bookDocumentId,
        userId || undefined,
      );
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi gán sổ cho văn bản: ${error?.message || error}`,
          method: 'POST',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình gán sổ.');
    }
  }

  @Get('pending-count')
  // @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Lấy tổng số lượng văn bản đi và đến cần xử lý' })
  async getPendingCount(
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ) {
    const userId = effectiveUserId || req?.user?.userId || '';
    return this.documentsService.getPendingCount(userId);
  }

  @Post('star-change')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Đánh dấu / gỡ đánh dấu văn bản theo documentIds' })
  async starChange(
    @Body() body: { documentIds: string[]; starObj: Record<string, string[]>; isStar: boolean },
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    try {
      const docInfo = await this.documentsService.getDocumentInfoForLog(body.documentIds);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `${body.isStar ? 'Đánh dấu' : 'Gỡ đánh dấu'} ${body.documentIds?.length || 0} văn bản [${docInfo}]`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log starChange', error);
    }

    try {
      const start = Date.now();
      const { documentIds, starObj, isStar } = body;
      const result = await this.documentsService.starChange(documentIds, starObj, isStar, userId);
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi đánh dấu/gỡ đánh dấu văn bản: ${error?.message || error}`,
          method: 'POST',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình đánh dấu/gỡ đánh dấu văn bản.');
    }
  }

  @Post('export-body')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @UseGuards(DocumentPermissionGuard)
  @ApiOperation({ summary: 'Build body xuất văn bản (FE tự call proxy)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { documentId: { type: 'string', description: 'ID văn bản cần xuất' } },
      required: ['documentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Build export body thành công', schema: { type: 'object', additionalProperties: true } })
  @ApiResponse({ status: 400, description: 'Input không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy văn bản' })
  async exportBody(
    @Body('documentId') documentId: string,
    @Body('typeDocument') typeDocument: string,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ): Promise<Record<string, any>> {
    if (!documentId || !typeDocument) {
      throw new BadRequestException('documentId hoặc typeDocument không được để trống');
    }

    const loaiVB = typeDocument === 'OutGoingDocument' ? 'Văn bản đi' : 'Văn bản đến';
    let docInfo = documentId;
    try { docInfo = await this.documentsService.getDocumentInfoForLog([documentId]); } catch (e) { }

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Xuất nội dung văn bản [${docInfo}], loại: ${loaiVB}`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log exportBody', error);
    }

    try {
      const start = Date.now();
      const result = await this.documentsService.exportBody(documentId, userId, typeDocument);
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi xuất nội dung văn bản [${docInfo}]: ${error?.message || error}`,
          method: 'POST',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình xuất nội dung văn bản.');
    }
  }

  @Get('/get-list-export-excel')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async getFileExportList(
    @Query() queryParams: Record<string, string>,
    @EffectiveUser() userId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const start = Date.now();
    await this.logExportListAction(req, queryParams);

    try {
      const { buffer, filename, contentType } = await this.documentsService.getFileExportList(
        queryParams,
        userId,
      );
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename.replace(/"/g, ''))}`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi xuất file ${queryParams.exportType || 'excel'}: ${error?.message || error}`,
          method: 'GET',
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
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('count')
  @ApiOperation({ summary: 'Đếm số lượng chưa xử lý' })
  @ApiResponse({ status: 200, description: 'Số lượng chưa xử lý' })
  async getTotalCounts(@Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Đếm số lượng văn bản chưa xử lý`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log getTotalCounts', error);
    }

    try {
      return await this.documentsService.totalCounts(req.user.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi đếm số lượng văn bản: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình đếm số lượng văn bản.');
    }
  }

  @Get('list/main-process')
  @ApiOperation({ summary: 'Danh sách văn bản: Xử lý chính' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async mainProcess(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản xử lý chính, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log mainProcess', error);
    }

    try {
      return await this.documentsService.mainProcess(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB xử lý chính: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình đếm số lượng văn bản.');
    }
  }

  @Get('list/receive')
  @ApiOperation({ summary: 'Danh sách văn bản tiếp nhận' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async receive(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản tiếp nhận, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log receive', error);
    }

    try {
      return await this.documentsService.receive(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB tiếp nhận: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB tiếp nhận.');
    }
  }

  @Get('list/implementation-coordination')
  @ApiOperation({ summary: 'Danh sách văn bản phối hợp' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async implementation(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản phối hợp, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log implementation', error);
    }

    try {
      return await this.documentsService.implementation(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB phối hợp: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB phối hợp.');
    }
  }

  @Get('list/recipient-to-know')
  @ApiOperation({ summary: 'Danh sách văn bản nhận để biết' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  async viewer(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản nhận để biết, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log viewer', error);
    }

    try {
      return await this.documentsService.viewer(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB nhận để biết: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB nhận để biết.');
    }
  }

  @Get('list/document-reply')
  @ApiOperation({ summary: 'Danh sách văn bản phúc đáp' })
  @ApiQuery({ type: ListDocumentsNoTypeDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async reply(@Query() query: ListDocumentsNoTypeDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản phúc đáp, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log reply', error);
    }

    try {
      return await this.documentsService.reply(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB phúc đáp: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB phúc đáp.');
    }
  }

  @Get('outgoing/list/recipient-to-know')
  @ApiOperation({ summary: 'Danh sách văn bản đi nhận để biết' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async outgoingview(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản đi nhận để biết, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log outgoingview', error);
    }

    try {
      return await this.documentsService.outgoingviewer(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB đi nhận để biết: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB đi nhận để biết.');
    }
  }

  @Get('outgoing/list/document-signer-process')
  @ApiOperation({ summary: 'Danh sách văn bản đi xử lý trình ký' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async signerProcess(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách VB đi xử lý trình ký, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log signerProcess', error);
    }

    try {
      return await this.documentsService.signerProcess(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB đi trình ký: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB đi trình ký.');
    }
  }

  @Get('outgoing/list/document-promulgate')
  @ApiOperation({ summary: 'Danh sách văn bản ban hành' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async promulgateDocuments(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản ban hành, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log promulgateDocuments', error);
    }

    try {
      return await this.documentsService.outgoingPromulgateDocuments(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB ban hành: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB ban hành.');
    }
  }

  @Get('outgoing/list/process')
  @ApiOperation({ summary: 'Danh sách văn bản xử lý' })
  @ApiQuery({ type: ListDocumentsDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async outgoingProcessDocuments(@Query() query: ListDocumentsDto, @Req() req: any) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản xử lý, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log outgoingProcessDocuments', error);
    }

    try {
      return await this.documentsService.outgoingProcessDocuments(query, req?.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB xử lý: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách VB xử lý.');
    }
  }

  @Get(':id/details')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @UseGuards(DocumentPermissionGuard)
  @ApiOperation({ summary: 'Chi tiết văn bản cho người dùng cụ thể' })
  @ApiParam({ name: 'id', description: 'ID văn bản' })
  @ApiQuery({ name: 'userId', description: 'ID người dùng', required: false })
  @ApiQuery({ name: 'roles', description: 'Vai trò người dùng, phân tách bằng dấu phẩy', required: false })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  @ApiResponse({ status: 200, description: 'Chi tiết văn bản trả về', type: Object })
  async getDetails(
    @Param('id') documentId: string,
    @Query('roles') roles: string,
    @EffectiveUser() userIin: string,
    @OriginalUser() userusIin: string,
    @Query('bpmn') bpmn?: string,
    @Query('isAuthority') isAuthority?: string,
    @Req() req?: any,
  ) {
    const userId = userIin || req?.user?.userId;
    const docInfo = documentId;
    // try { docInfo = await this.documentsService.getDocumentInfoForLog([documentId]); } catch (e) { }

    // try {
    //   await this.systemLogService.createLogFromSystem({
    //     action: 'GET',
    //     details: `Xem chi tiết văn bản [${docInfo}]`,
    //     method: 'GET',
    //     status: 'SUCCESS',
    //     type: process.env.CLIENT_LOG || 'DHVBTC',
    //     subType: process.env.CLIENT_LOG || 'DHVBTC',
    //     userInfo: userId || '',
    //     ipAddress: req?.socket?.remoteAddress || 'Unknown',
    //     timestamp: new Date().toISOString(),
    //   });
    // } catch (error) {
    //   this.logger.error('Lỗi ghi log getDetails', error);
    // }

    try {
      return await this.documentsService.getDetails(
        documentId,
        userId,
        (roles || '').split(',').filter(Boolean),
        bpmn,
        isAuthority,
      );
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi xem chi tiết văn bản [${docInfo}]: ${error?.message || error}`,
          method: 'GET',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }

      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy chi tiết văn bản.');
    }
  }

  @Get('documents-history/list')
  @UseGuards(DocumentPermissionGuard)
  @ApiOperation({ summary: 'Danh sách lịch sử xử lý văn bản' })
  @ApiQuery({ name: 'documentId', description: 'ID văn bản', required: true })
  @ApiResponse({ status: 200, description: 'Danh sách lịch sử xử lý', type: Object })
  async documentsHistory(@Query('documentId') documentId: string, @Req() req: any) {
    let docInfo = documentId;
    try { docInfo = await this.documentsService.getDocumentInfoForLog([documentId]); } catch (e) { }

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xem lịch sử xử lý văn bản [${docInfo}]`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log documentsHistory', error);
    }

    try {
      return await this.documentsService.getDocumentHistory(documentId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi xem lịch sử văn bản [${docInfo}]: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy lịch sử xử lý văn bản.');
    }
  }

  @Delete('update-status')
  @ApiOperation({ summary: 'Danh sách lịch sử xử lý văn bản' })
  async updateStatus(@Body() body: { ids: string[] }, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id;
    const isAdmin = await checkAdminPermission(userId).catch(() => false);

    try {
      const docInfo = await this.documentsService.getDocumentInfoForLog(body.ids);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Cập nhật trạng thái ${body.ids?.length || 0} văn bản [${docInfo}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log updateStatus', error);
    }

    try {
      return await this.documentsService.deleteDocument(body.ids, isAdmin);
    } catch (err) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Lỗi cập nhật trạng thái văn bản: ${err?.message || err}`,
          method: 'DELETE',
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
      throw new BadRequestException(err.message);
    }
  }

  @Delete('delete-outgoing-document')
  @ApiOperation({ summary: 'Xóa văn bản dự thảo' })
  async deleteOutgoingDocument(@Body() body: { ids: string[] }, @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id;
    const isAdmin = await checkAdminPermission(userId).catch(() => false);

    try {
      const docInfo = await this.documentsService.getDocumentInfoForLog(body.ids);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Xóa ${body.ids?.length || 0} văn bản dự thảo [${docInfo}]`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log deleteOutgoingDocument', error);
    }

    try {
      return await this.documentsService.deleteOutgoingDocument(body.ids, isAdmin);
    } catch (err) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Lỗi xóa văn bản dự thảo: ${err?.message || err}`,
          method: 'DELETE',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      throw new BadRequestException(err.message);
    }
  }

  @Post('outgoing/list/incomming-document-internal')
  @ApiOperation({ summary: 'Danh sách văn bản đến ban hành từ đơn vị nhận nội bộ theo id văn bản đi' })
  async listIncommingDocumentInternal(@Body() body: { ids: string[] }, @Req() req: any) {
    let docInfo = body.ids?.join(', ') || '';
    try { docInfo = await this.documentsService.getDocumentInfoForLog(body.ids); } catch (e) { }

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản đến ban hành từ đơn vị nhận nội bộ [${docInfo}]`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log listIncommingDocumentInternal', error);
    }

    try {
      return await this.documentsService.listIncommingDocumentInternal(body.ids);
    } catch (err) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB đến nội bộ: ${err?.message || err}`,
          method: 'GET',
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
      throw new BadRequestException(err.message);
    }
  }

  @Post('/outgoing/recall')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Thu hồi văn bản đi (outgoing)' })
  async recallWorkItemOutgoing(
    @Body() body: { outgoingDocId: string; incommingDocIds?: string[]; note?: string },
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    const { outgoingDocId, incommingDocIds, note } = body;
    if (!outgoingDocId) {
      throw new BadRequestException('Vui lòng cung cấp outgoingDocId và danh sách incomingDocIds.');
    }
    let docInfoOutgoing = outgoingDocId;
    try { docInfoOutgoing = await this.documentsService.getDocumentInfoForLog([outgoingDocId]); } catch (e) { }

    try {
      // Check quyền thu hồi VB đi
      const auditList = await this.documentsService.getAuditForRecall(outgoingDocId);
      const permission = DocumentPolicy.validateRecallPermission(auditList, userId, 'OutGoingDocument', 'thu hồi văn bản đi');
      if (!permission.allowed) {
        throw new ForbiddenException(permission.reason);
      }

      const result = await this.documentsService.recallWorkItemOutgoing(outgoingDocId, userId, incommingDocIds || [''], note || '');
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Thu hồi xử lý văn bản đi [${docInfoOutgoing}]`,
          method: 'POST',
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
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thu hồi xử lý văn bản đi.');
    }
  }

  @Post('/outgoing/recall-doc')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Thu hồi văn bản đến từ văn bản đi (outgoing)' })
  async recallInternalReceive(
    @Body() body: {
      outgoingDocId: string;
      unitIds?: string[];
      receiveUnits?: string[];
      processors?: string[];
      knowReceivers?: string[];
      incommingDocIds?: string[];
      note?: string;
    },
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    const { outgoingDocId, incommingDocIds, note, unitIds, receiveUnits, processors, knowReceivers } = body;
    if (!outgoingDocId) {
      throw new BadRequestException('Vui lòng cung cấp outgoingDocId và danh sách incomingDocIds.');
    }
    let docInfoOutgoing2 = outgoingDocId;
    let docInfoIncoming = incommingDocIds?.join(', ') || '';
    try { docInfoOutgoing2 = await this.documentsService.getDocumentInfoForLog([outgoingDocId]); } catch (e) { }
    try { docInfoIncoming = await this.documentsService.getDocumentInfoForLog(incommingDocIds || []); } catch (e) { }

    try {
      // Check quyền thu hồi đơn vị nhận nội bộ
      const auditList = await this.documentsService.getAuditForRecall(outgoingDocId);
      const permission = DocumentPolicy.validateRecallInternalPermission(auditList, userId, 'thu hồi đơn vị nhận nội bộ');
      if (!permission.allowed) {
        throw new ForbiddenException(permission.reason);
      }

      const result = await this.documentsService.recallIncommingDocument(outgoingDocId, userId, {
        receiveUnits: (receiveUnits && receiveUnits.length > 0 ? receiveUnits : unitIds) || [],
        processors: processors || [],
        knowReceivers: knowReceivers || [],
        incommingDocIds: incommingDocIds || [],
        note: note || '',
      });
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Thu hồi văn bản đến [${docInfoIncoming}] từ văn bản đi [${docInfoOutgoing2}]`,
          method: 'POST',
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
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thu hồi văn bản đến nội bộ.');
    }
  }

  @Post('/incoming/recall')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Thu hồi văn bản đến (incoming)' })
  async recallWorkItem(
    @Body() payload: SetProcessItemDto,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    let docInfoRecall = payload.docIds || '';
    try { docInfoRecall = await this.documentsService.getDocumentInfoForLog([payload.docIds].flat()); } catch (e) { }
    try {
      // Check quyền thu hồi VB đến
      const docId = Array.isArray(payload.docIds) ? payload.docIds[0] : payload.docIds;
      const [auditList, userOrgId] = await Promise.all([
        this.documentsService.getAuditForRecall(docId),
        this.documentsService.getUserOrgId(userId),
      ]);
      const permission = DocumentPolicy.validateRecallPermission(auditList, userId, 'IncommingDocument', 'thu hồi văn bản đến', userOrgId);
      if (!permission.allowed) {
        throw new ForbiddenException(permission.reason);
      }
      const result = await this.documentsService.recallWorkItem(payload, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Thu hồi văn bản đến [${docInfoRecall}]`,
          method: 'POST',
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
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thu hồi văn bản đến.');
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê văn bản theo phòng ban của người dùng' })
  @ApiQuery({ name: 'startDate', description: 'Ngày bắt đầu (ISO 8601)', required: false })
  @ApiQuery({ name: 'endDate', description: 'Ngày kết thúc (ISO 8601)', required: false })
  @ApiResponse({ status: 200, description: 'Dữ liệu thống kê chi tiết' })
  async getStatistics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!req?.user?.userId) throw new BadRequestException('Yêu cầu thông tin người dùng');

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập thống kê văn bản, từ ${startDate || 'không xác định'} đến ${endDate || 'không xác định'}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log getStatistics', error);
    }

    try {
      return await this.documentsService.getStatistics(req.user.userId, startDate, endDate);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi thống kê văn bản: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình thống kê văn bản.');
    }
  }

  @Get('getAllByText')
  @ApiResponse({ status: 200, description: 'Dữ liệu thống kê chi tiết' })
  async getAllByText(
    @Req() req: any,
    @Query('searchText') searchText?: string,
    @Query('limit') limit?: string,
  ) {
    if (!req?.user?.userId) throw new BadRequestException('Yêu cầu thông tin người dùng');
    const take = Math.min(Number(limit) || 20, 100);

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Tìm kiếm văn bản theo nội dung: "${searchText || ''}" với limit ${take}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log getAllByText', error);
    }

    try {
      return await this.documentsService.getAllByText(req.user.userId, searchText?.trim(), take);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi tìm kiếm văn bản theo nội dung: ${error?.message || error}`,
          method: 'GET',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình tìm kiếm văn bản theo nội dung.');
    }
  }

  @Post('excel-to-pdf')
  // @UseGuards(FilesViewPermissionGuard)
  @ApiOperation({ summary: 'Chuyển đổi file Excel sang PDF' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileId: { type: 'string', description: 'ID của file để kiểm tra quyền' }
      },
    },
  })
  async convertExcelToPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileId') fileId: string,
    @Res() res: Response,
    @Req() req: any
  ) {
    if (!file) throw new BadRequestException('File is required');

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    await validateFileSecurity(file);
    await sanitizeFileContent(file);

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Chuyển đổi file Excel sang PDF: ${file.originalname} (${file.size} bytes)`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log convertExcelToPdf', error);
    }

    try {
      const result = await this.documentsService.convertExcelToPdf({
        buffer: file.buffer,
        filename: file.originalname,
      });
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        'Content-Length': result.buffer.length,
      });
      res.end(result.buffer);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi chuyển đổi Excel sang PDF: ${error?.message || error}`,
          method: 'POST',
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
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  @Post('excel-to-pdf-v2')
  // @UseGuards(FilesViewPermissionGuard)
  @ApiOperation({ summary: 'Chuyển đổi file Excel sang PDF (v2 - Fit Page)' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        fileId: { type: 'string', description: 'ID của file để kiểm tra quyền' },
        applyWatermark: { type: 'boolean', default: false },
        watermarkText: { type: 'string', nullable: true },
      },
    },
  })
  async convertExcelToPdfv2(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileId') fileId: string,
    @Body('applyWatermark') applyWatermarkRaw: string | boolean,
    @Body('watermarkText') watermarkText: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const applyWatermark = applyWatermarkRaw === true || applyWatermarkRaw === 'true' || applyWatermarkRaw === '1';

    // Bảo mật file: Kiểm tra phần mở rộng, magic bytes và làm sạch nội dung
    await validateFileSecurity(file);
    await sanitizeFileContent(file);

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Chuyển đổi file Excel sang PDF (v2): ${file.originalname} (${file.size} bytes)`,
        method: 'POST',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Lỗi ghi log convertExcelToPdfv2', error);
    }

    try {
      const result = await this.documentsService.convertExcelToPdf({
        buffer: file.buffer,
        filename: file.originalname,
      }, {
        applyWatermark,
        watermarkText,
        printedBy: req?.user?.name || req?.user?.username || req?.user?.userId || '',
      });
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        'Content-Length': result.buffer.length,
      });
      res.end(result.buffer);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi chuyển đổi Excel sang PDF (v2): ${error?.message || error}`,
          method: 'POST',
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
      res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }

  private async logExportListAction(req: any, queryParams: Record<string, string>): Promise<void> {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Xuất file danh sách (${queryParams.processFn || 'unknown'}), trang: ${queryParams.page || 1}, limit: ${queryParams.limit || 25}, exportType: ${queryParams.exportType || 'excel'}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('[get-list-export-excel] Lỗi ghi log xuất file', error);
    }
  }
}
