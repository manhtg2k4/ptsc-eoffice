import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
  BadGatewayException,
  BadRequestException,
  Inject,
  UseGuards,
  Res,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { DocumentPolicy } from './policies/document.policy';
import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';

import { OutgoingDocumentsService } from './outgoing-documents.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { MSSQL_REPO } from 'src/database/database.provider';
import { BpmnVersionService } from 'src/bpmn-version/bpmn-version.service';
import { TransferOpinionDto } from './dto/transfer-opinion.dto';
import { OutgoingDraftCountDto } from './dto/outgoing-stats.dto';
import { ListDocumentsDto, ListDocumentsNoTypeDto } from 'src/documents/dto/list-documents.dto';
import { AuthorityGuard, AuthorityStages, AuthorizedUser, CheckAuthority, EffectiveUser, OriginalUser } from 'src/authority-documents';
import { PostStorageAiService } from 'src/post-storage-ai/post-storage-ai.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { CreateOutDocDto } from 'src/demo/dto/create-demo.dto';
import { Public } from 'src/oauth/decorator/public.decorator';
import { UpdateOutDocDto } from 'src/demo/dto/update-demo.dto';
import { SignDocumentDto } from './dto/sign-document.dto';
import { WorkItemDto } from 'src/meeting/dto/meeting-participants.dto';
import { StatisticProcessSignQueryDto } from './dto/statistic-process-sign.dto';
import { StatisticReportProcessResponseDto } from './dto/statistic-process-sign-respone.dto';
import { ListReportOutgoingByTimeDto } from 'src/documents/dto/list-reports-documents-by-time.dto';
import { OutgoingStatisticsBySignerDto } from './dto/statistics-by-signer.dto';
import { UpdateDraftSignersDto } from './dto/update-draft-signers.dto';
// import { SignerProgressStatsQueryDto } from './dto/signer-progress-stats.dto';

interface FakeTask {
  taskName: string;           // Tên công việc
  taskContent: string;        // Nội dung công việc
  confidentiality: string;    // Độ mật
  documentType: string;       // Loại hồ sơ
  assignee: string;           // Người xử lý chính
  collaborators: string[];    // Người phối hợp
  status: string;             // Trạng thái
  assignedDate: string;       // Ngày giao (ISO string)
  dueDate: string;            // Hạn xử lý (ISO string)
}
interface additionalRelease {
  documentId: string,
  receiveUnits?: string[],
  knowReceivers?: string[],
  processors?: string[],
  deadline: Date | null
}
@ApiTags('Quản lý Văn bản Đi')
@Controller('outgoing-documents')
@UseGuards(AuthorityGuard)
export class OutgoingDocumentsController {
  constructor(
    private readonly service: OutgoingDocumentsService,
    private readonly runtimeService: RuntimeDbService,
    @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
    private readonly sqlsvRepo: SQLSVRepository,
    private readonly bpmnVersionService: BpmnVersionService,
    private readonly postStorageAiService: PostStorageAiService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  private getEffectiveUserId(req: any, effectiveUserId?: string, isAuthority?: string): string | null {
    if (isAuthority === 'true' && effectiveUserId) {
      return effectiveUserId;
    }
    return req?.user?.userId || req?.user?.id || null;
  }

  private readonly fakeData: FakeTask[] = [
    {
      taskName: "Dự thảo Quyết định ban hành Quy chế công tác văn thư, lưu trữ",
      taskContent: "Soạn thảo và trình lãnh đạo phê duyệt Quy chế công tác văn thư, lưu trữ năm 2025 trước ngày 15/12/2025",
      confidentiality: "THƯỜNG",
      documentType: "Văn bản dự thảo",
      assignee: "Nguyễn Văn An",
      collaborators: ["Trần Thị Bé", "Lê Văn Cường"],
      status: "Đang xử lý",
      assignedDate: "2025-11-20T08:00:00+07:00",
      dueDate: "2025-12-10T17:00:00+07:00"
    },
    {
      taskName: "Soạn thảo công văn trả lời Công văn số 1234/UBND-VP của UBND Tỉnh",
      taskContent: "Nghiên cứu nội dung công văn đến, phối hợp với các phòng ban liên quan để dự thảo công văn trả lời, trình lãnh đạo trước ngày 28/11",
      confidentiality: "KHẨN",
      documentType: "Văn bản trả lời công văn đến",
      assignee: "Phạm Thị Hương",
      collaborators: ["Vũ Minh Hoàng", "Đỗ Quang Huy"],
      status: "Chờ xử lý",
      assignedDate: "2025-11-24T09:30:00+07:00",
      dueDate: "2025-11-28T17:00:00+07:00"
    },
    {
      taskName: "Lập hồ sơ trình duyệt chủ trương đầu tư dự án năm 2026",
      taskContent: "Tập hợp hồ sơ, tài liệu đầy đủ, phối hợp với phòng Tài chính - Kế hoạch để hoàn thiện báo cáo trình",
      confidentiality: "MẬT",
      documentType: "Hồ sơ công việc",
      assignee: "Hoàng Văn Nam",
      collaborators: ["Nguyễn Thị Lan Anh"],
      status: "Đang xử lý",
      assignedDate: "2025-11-15T14:00:00+07:00",
      dueDate: "2025-12-05T17:00:00+07:00"
    },
    {
      taskName: "Rà soát, thu hồi các văn bản hết hiệu lực đã ban hành năm 2024",
      taskContent: "Tổng hợp danh sách các văn bản hết hiệu lực, đề xuất phương án thu hồi, thay thế hoặc bãi bỏ",
      confidentiality: "THƯỜNG",
      documentType: "Thu hồi văn bản",
      assignee: "Trần Văn Dũng",
      collaborators: ["Lê Thị Mai", "Phạm Văn Tuấn"],
      status: "Đã hoàn thành",
      assignedDate: "2025-11-10T08:00:00+07:00",
      dueDate: "2025-11-25T17:00:00+07:00"
    },
    {
      taskName: "Xây dựng Kế hoạch công tác năm 2026",
      taskContent: "Dự thảo kế hoạch công tác năm 2026, lấy ý kiến các phòng ban, trình lãnh đạo phê duyệt",
      confidentiality: "THƯỜNG",
      documentType: "Văn bản dự thảo",
      assignee: "Bùi Thị Ngọc",
      collaborators: ["Nguyễn Văn Hùng", "Đinh Văn Long", "Hoàng Thị Hoa"],
      status: "Đang xử lý",
      assignedDate: "2025-11-18T10:00:00+07:00",
      dueDate: "2025-12-20T17:00:00+07:00"
    }
  ];

  @Get('search')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Tra cứu văn bản đi' })
  @ApiQuery({ type: ListDocumentsNoTypeDto, style: 'deepObject', explode: true })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về' })
  async searchOutcoming(
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId?: string,
    @Query('isAuthority') isAuthority?: string,
  ) {
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập tra cứu văn bản đi trang: ${query.page}, limit: ${query.limit}`,
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
    const { filter, sort, processFn, isExport, countOnly } = query;

    try {
      return await this.service.outgoingRecipients({
        page,
        limit,
        sort,
        processFn,
        filter,
        userId,
        isExport,
        countOnly,
      });
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi tra cứu văn bản đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình tra cứu văn bản đi.');
    }
  }

  @Get('fake-tasks')
  getFakeTasks() {
    return {
      success: true,
      data: this.fakeData,
      total: this.fakeData.length,
      message: "Successfully retrieved fake task list"
    };
  }
  // 📌 LIST
  @Get()
  async list(@Query() query: any, @Req() req) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản đi`,
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
      return await this.service.list(query, req.user?.userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách văn bản đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách văn bản đi.');
    }
  }


  @Get('pending-feedbacks')
  async getMyPendingFeedbacks(
    @Req() req,
    @Query() query: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Ý kiến - tab [Chờ cho ý kiến], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.getPendingFeedbacks(userId, query);
      return {
        success: true,
        message: result.data.length > 0
          ? `Tìm thấy ${result.data.length} văn bản đang chờ ý kiến`
          : 'Không có văn bản nào đang chờ bạn cho ý kiến',
        ...result,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Ý kiến - tab [Chờ cho ý kiến]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get('given-feedbacks')
  async getGivenFeedbacks(
    @Req() req,
    @Query() query: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Ý kiến - tab [Đã cho ý kiến], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.getGivenFeedbacks(userId, query);
      return {
        success: true,
        message: result.data.length > 0
          ? `Tìm thấy ${result.data.length} văn bản đã cho ý kiến`
          : 'Không có văn bản nào đã cho ý kiến',
        ...result,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Ý kiến - tab [Đã cho ý kiến]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }
  @Get('my-sent-feedbacks')
  async getMySentFeedbacks(
    @Req() req,
    @Query() query: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Ý kiến - tab [Đã xin ý kiến], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.getMySentFeedbacks(userId, query);
      return {
        success: true,
        message: result.data.length > 0
          ? `Tìm thấy ${result.data.length} văn bản đã cho ý kiến`
          : 'Không có văn bản nào đã cho ý kiến',
        ...result,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Ý kiến - tab [Đã xin ý kiến]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }
  @Get('my-complete-feedbacks')
  async getMyCompletedFeedbacks(
    @Req() req,
    @Query() query: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Ý kiến - tab [Đã được cho ý kiến], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.getMyCompletedFeedbacks(userId, query);
      return {
        success: true,
        message: result.data.length > 0
          ? `Tìm thấy ${result.data.length} văn bản đã cho ý kiến`
          : 'Không có văn bản nào đã cho ý kiến',
        ...result,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Ý kiến - tab [Đã được cho ý kiến]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  //api danh sách văn bản đã nhận được yêu cầu cho ý kiến
  @Get('my-receive-feedbacks')
  async getMyReceivedFeedbackRequests(
    @Req() req,
    @Query() query: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Ý kiến - tab [Đã chuyển cho ý kiến], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.getMyReceivedFeedbackRequests(userId, query);
      return {
        success: true,
        message: result.data.length > 0
          ? `Tìm thấy ${result.data.length} văn bản đã cho ý kiến`
          : 'Không có văn bản nào đã cho ý kiến',
        ...result,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Ý kiến - tab [Đã chuyển cho ý kiến]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get('list-evict')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Thay thế' })
  @ApiQuery({ type: ListDocumentsNoTypeDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listEvict(
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
    @Query('isAuthority') isAuthority?: string,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    const userId = this.getEffectiveUserId(req, effectiveUserId, isAuthority);
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản thay thế trang: ${query.page}, limit: ${query.limit}`,
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
    if (!userId) {
      throw new BadRequestException('Thiếu thông tin người dùng');
    }

    try {
      return await this.service.listEvict(userId, query);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách văn bản thay thế: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình xử lý văn bản thay thế.');
    }
  }

  @Get('list-replaced')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Bị thay thế' })
  @ApiQuery({ type: ListDocumentsNoTypeDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listReplacedDocuments(
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId || req.user.id;
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản bị thay thế trang: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.listReplacedDocuments(userId, query);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách văn bản bị thay thế: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  // outgoing-documents.controller.ts
  @Post('transfer-opinion')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async transferOpinion(
    @Body() dto: TransferOpinionDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.userId;
    if (!currentUserId) throw new UnauthorizedException();

    try {
      // Check quyền: user phải là assignee của work item
      if (dto.workItemId && dto.docIds?.[0]) {
        const workItem = await this.sqlRepo.getWorkItem(dto.docIds[0], dto.workItemId);
        const user = await this.sqlsvRepo.getUserById(currentUserId);
        const userName = user?.name || currentUserId;
        const permission = DocumentPolicy.validateWorkItemPermission(userName, currentUserId, workItem, 'chuyển ý kiến');
        if (!permission.allowed) {
          throw new ForbiddenException(permission.reason);
        }
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile('XIN_Y_KIEN');
      const unitStr = await this.sqlRepo.getBpmnOrg('XIN_Y_KIEN');
      const allowedUnitIds = unitStr
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || [];

      const result = await this.runtimeService.transferOpinion({
        docIds: dto.docIds,
        workItemId: dto.workItemId,
        receiverUserIds: dto.receiverUserIds,
        note: dto.note,
        currentUserId,
        bpmnXML,
        allowedUnitIds,
      });
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Chuyển ý kiến thành công`,
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
      return {
        success: true,
        message: 'Chuyển ý kiến thành công',
        data: result,
      };
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
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get('draft-count')
  async getDraftCount(@Req() req: any): Promise<OutgoingDraftCountDto> {
    const userId = req.user?.userId;
    try {
      const result = await this.sqlRepo.getOutgoingDraftCount(userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập số lượng dự thảo VB đi`,
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
          details: `Lỗi truy cập số lượng dự thảo VB đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get('report-signers')
  @ApiOperation({ summary: 'Lấy danh sách người ký phát hành từ BPMN flow' })
  @ApiQuery({ name: 'docType', required: false, description: 'Loại văn bản (VD: OutGoingDocument)' })
  @ApiQuery({ name: 'processKey', required: false, description: 'Mã quy trình BPMN (nếu đã biết)' })
  @ApiQuery({ name: 'typeSign', required: false, description: 'Loại ký (mặc định: reportSigner)' })
  @ApiResponse({ status: 200, description: 'Danh sách người có thể ký phát hành' })
  async getReportSigners(
    @Req() req: any,
    @Query('docType') docType?: string,
    @Query('processKey') processKey?: string,
    @Query('typeSign') typeSign?: string,
  ) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    try {
      const result = await this.service.getReportSigners({
        userId,
        docType: docType || 'OutGoingDocument',
        processKey,
        typeSign: typeSign || 'reportSigner',
      });
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách người ký phát hành`,
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
      return {
        success: true,
        data: result,
        total: result.length,
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách người ký phát hành: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  // @Get('stats/signer-progress')
  // @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  // @ApiOperation({ summary: 'Thống kê tiến độ trình ký văn bản đi theo phòng ban' })
  // // @ApiQuery({ type: SignerProgressStatsQueryDto })
  // async signerProgressStats(
  //   @Query() query: any,
  //   @Req() req: any,
  //   @OriginalUser() originalUserId: string,
  //   @EffectiveUser() effectiveUserId: string,
  //   @Query('isAuthority') isAuthority?: string,
  // ) {
  //   let userId = req.user?.userId || req.user?.id;
  //   if (isAuthority === 'true') userId = effectiveUserId;
  //   if (!userId) throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
  //   return this.service.getSignerProgressStats(query, userId, originalUserId);
  // }

  // @Get('stats/signer-progress/documents')
  // @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  // @ApiOperation({ summary: 'Danh sách chi tiết văn bản trình ký theo phòng ban' })
  // @ApiQuery({ name: 'departmentId', required: true, description: 'ID phòng ban' })
  // @ApiQuery({ name: 'month', required: false, description: 'Tháng (1-12)' })
  // @ApiQuery({ name: 'year', required: false, description: 'Năm (yyyy)' })
  // @ApiQuery({ name: 'documentType', required: false, description: 'Loại văn bản' })
  // @ApiQuery({ name: 'page', required: false, description: 'Trang (mặc định 1)' })
  // @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang (mặc định 20)' })
  // async signerProgressDocumentsByDepartment(
  //   @Query() query: any,
  //   @Req() req: any,
  //   @OriginalUser() originalUserId: string,
  //   @EffectiveUser() effectiveUserId: string,
  //   @Query('isAuthority') isAuthority?: string,
  // ) {
  //   let userId = req.user?.userId || req.user?.id;
  //   if (isAuthority === 'true') userId = effectiveUserId;
  //   if (!userId) throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
  //   return this.service.getSignerProgressDocumentsByDepartment(query, userId);
  // }

  @Get('check-bpmn-stamp-option')
  @ApiOperation({ summary: 'Kiểm tra xem quy trình BPMN có hỗ trợ tùy chọn đóng dấu không' })
  @ApiQuery({ name: 'bpmnVersion', description: 'ID hoặc process key của quy trình BPMN', required: true })
  async checkBpmnStampOption(@Query('bpmnVersion') bpmnVersion: string) {
    return await this.service.checkBpmnStampOption(bpmnVersion);
  }

  @Get('my-feedback-requests')
  async getMyFeedbackRequests(@Req() req: any) {
    const userId = req.user.userId;
    try {
      const result = await this.service.listRequestFeedback(userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Truy cập danh sách yêu cầu xin ý kiến`,
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
          details: `Lỗi truy cập danh sách yêu cầu xin ý kiến: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }
  // 📌 DETAIL
  // @Get(':id')
  // async detail(@Param('id') id: string, @Req() req) {
  //   return this.service.detail(id, req.user?.userId);
  // }

  // 📌 CREATE
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() CreateOutDocDto: CreateOutDocDto, @Req() req) {

    try {
      // console.log(bpmnXML);
      const { assigneeUserId, ...docData } = CreateOutDocDto;
      const userId = req?.user?.userId;

      // const documentId = String(Date.now());
      // const data = { documentId, ...docData };

      // if (await this.sqlRepo.checkExistsDocument({ toBook: data.toBook, senderUnit: data.senderUnit, receiverUnit: data.receiverUnit, documentDate: data.documentDate })) {
      //   throw new ConflictException('Văn bản đến bị trùng. Vui lòng kiểm tra lại');
      // }
      const user: any = await this.sqlsvRepo.getUserById(userId);
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      let flowConfig;
      if (docData.typeOfProcess) {
        flowConfig = docData.typeOfProcess;
      }
      else {
        const bpmn = await this.sqlsvRepo.getFlowByUnit(
          String(user.parent.id), 'OutGoingDocument'
        );
        flowConfig = bpmn?.id;
      }
      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }
      const dataDoc = { bpmnVersion: flowConfig, ...CreateOutDocDto }
      const result = await this.service.create(dataDoc, req.user?.userId);
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig || 'VAN_BAN_DI'); // lấy trực tiếp từ service


      // 👇 GỌI AI SYNC TẠI ĐÂY
      this.postStorageAiService
        .trySyncOutgoing({
          documentId: String(result.documentId),
          metadata: result,       // metadata raw chính là data trả ra từ create
          event: 'metadata',      // bật timeout 60s chờ file
        })
        .catch((err) => {
          console.error('PostStorageAI sync failed (create):', err);
        });
      const doc = await this.runtimeService.createDocumentAtNodeOutgoing({
        bpmnXML,
        data: result,
        assigneeUserId: assigneeUserId || userId,
        bpmnVersion: flowConfig || 'VAN_BAN_DI',
      });

      try {
        // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Thêm mới văn bản dự thảo`,
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

      return { status: 1, data: result };
    }
    catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi thêm mới văn bản dự thảo: ${error?.message || error}`,
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


  @Post('draft-create')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createDraft(
    @Body() body: CreateOutDocDto,
    @Req() req,
    @Query('roles') roles: string
  ) {
    console.time(`[DEBUG_LAG_DRAFT] total draft-create`);
    try {
      const { documentId, ...docData } = body || {};
      const userId = req?.userId || req?.user?.userId;
      body.drafter = userId;

      console.time(`[DEBUG_LAG_DRAFT] getUserById`);
      const user: any = await this.sqlsvRepo.getUserById(userId);
      console.timeEnd(`[DEBUG_LAG_DRAFT] getUserById`);
      if (!user?.parent?.id) {
        throw new BadRequestException('Người dùng không có parent');
      }
      if (documentId) {
        console.time(`[DEBUG_LAG_DRAFT] deleteDraftById`);
        await this.service.deleteDraftById(documentId);
        console.timeEnd(`[DEBUG_LAG_DRAFT] deleteDraftById`);
      }

      console.time(`[DEBUG_LAG_DRAFT] getFlowByUnitLatest`);
      let flowConfig;
      if (docData.typeOfProcess) {
        flowConfig = docData.typeOfProcess;
      } else {
        const bpmn = await this.sqlsvRepo.getFlowByUnitLatest(
          String(user.parent.id),
          'OutGoingDocument',
        );
        flowConfig = bpmn?.id;
      }
      console.timeEnd(`[DEBUG_LAG_DRAFT] getFlowByUnitLatest`);

      if (!flowConfig) {
        throw new BadRequestException('Không tìm thấy luồng cho người dùng');
      }

      const draftData = this.service.buildDraftData({
        raw: body,
        creatorUserId: userId,
        bpmnVersion: flowConfig,
      });

      console.time(`[DEBUG_LAG_DRAFT] db service.create`);
      const result = await this.service.create(draftData, req.user?.userId);
      console.timeEnd(`[DEBUG_LAG_DRAFT] db service.create`);

      console.time(`[DEBUG_LAG_DRAFT] getBpmnFile`);
      const bpmnXML = await this.sqlRepo.getBpmnFile(flowConfig || 'VAN_BAN_DI');
      console.timeEnd(`[DEBUG_LAG_DRAFT] getBpmnFile`);

      console.time(`[DEBUG_LAG_DRAFT] createDocumentAtNodeOutgoing`);
      const doc = await this.runtimeService.createDocumentAtNodeOutgoing({
        bpmnXML,
        data: result,
        assigneeUserId: userId,
        bpmnVersion: flowConfig || 'VAN_BAN_DI',
      });
      console.timeEnd(`[DEBUG_LAG_DRAFT] createDocumentAtNodeOutgoing`);

      // Trả về ngay document vừa tạo, KHÔNG gọi getDetails (~640ms)
      // Frontend sẽ redirect sang trang chi tiết và tự gọi GET /api/outgoing-documents/:id
      this.postStorageAiService
        .trySyncOutgoing({
          documentId: String(result.documentId),
          metadata: result,
          event: 'metadata',
        })
        .catch((err) => {
          console.error('PostStorageAI sync failed (create):', err);
        });

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Tạo mới dự thảo văn bản đi (draft-create), documentId: ${result.documentId}`,
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

      console.timeEnd(`[DEBUG_LAG_DRAFT] total draft-create`);
      // doc đã chứa: { document, workItem, availableActions, flags, flagsProcess }
      return doc;
    } catch (error) {
      console.timeEnd(`[DEBUG_LAG_DRAFT] total draft-create`);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi tạo dự thảo VB đi (draft-create): ${error?.message || error}`,
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

  @Delete('draft/:id')
  async deleteDraft(@Param('id') documentId: string, @Req() req: any) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }

    try {
      await this.service.deleteDraftById(documentId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Xóa dự thảo văn bản đi, documentId: ${documentId}`,
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
      return { status: 1, message: 'Draft deleted' };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Lỗi xóa dự thảo VB đi, documentId: ${documentId}: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  // 📌 CREATE DRAFT (PUT) - FE gọi khi tạo dự thảo lần đầu
  @Put('draft/:id/signers')
  @UseGuards(DocumentPermissionGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Cap nhat nguoi ky cho van ban du thao' })
  @ApiParam({ name: 'id', description: 'document_id cua van ban du thao' })
  @ApiBody({ type: UpdateDraftSignersDto })
  async updateDraftSigners(
    @Param('id') documentId: string,
    @Body() payload: UpdateDraftSignersDto,
    @Req() req: any,
  ) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }

    try {
      const result = await this.service.updateDraftSigners(documentId, payload);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Cap nhat nguoi ky du thao VB di, documentId: ${documentId}`,
          method: 'PUT',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Loi ghi log:', logErr?.message || logErr);
      }
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Loi cap nhat nguoi ky du thao VB di, documentId: ${documentId}: ${error?.message || error}`,
          method: 'PUT',
          status: 'ERROR',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Loi ghi log:', logErr?.message || logErr);
      }
      console.error(error);
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('Da co loi xay ra, vui long thu lai sau.');
    }
  }

  @Put('create-draft/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Tạo dự thảo văn bản đi (lưu lần đầu)' })
  @ApiBody({ type: UpdateOutDocDto })
  async createDraftUpdate(@Param('id') docid: string, @Body() updateOutDocDto: UpdateOutDocDto, @Req() req: any) {
    try {
      const userId = req?.userId || req?.user?.userId || req?.user?.id;
      const result = await this.service.update(docid, { ...updateOutDocDto, fromCreateDraf: true }, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Tạo mới dự thảo văn bản đi, documentId: ${docid}, trích yếu: ${updateOutDocDto.abstractNote || 'N/A'}`,
          method: 'PUT',
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
          action: 'PUT',
          details: `Lỗi tạo mới dự thảo VB đi, documentId: ${docid}: ${error?.message || error}`,
          method: 'PUT',
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

  // 📌 UPDATE
  @Put(':id')
  @UseGuards(DocumentPermissionGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Cập nhật văn bản đi' })
  @ApiBody({ type: UpdateOutDocDto })
  async update(
    @Param('id') docid: string,
    @Body() updateOutDocDto: UpdateOutDocDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    const userId = effectiveUserId || req?.user?.userId || req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }

    // const document = await this.service.getOutgoingDocumentByFields({
    //   documentId: docid,
    //   select: ['createdBy'],
    // });
    // if (!document) {
    //   throw new NotFoundException(`Không tìm thấy văn bản đi: ${docid}`);
    // }
    // if (!DocumentPolicy.canEdit({ userId }, document)) {
    //   throw new ForbiddenException('Không có quyền sửa văn bản đi');
    // }

    let isFirstSave = false;
    try {
      isFirstSave = await this.service.isFirstSave(docid);
    } catch (_) { /* bỏ qua lỗi check isFirstSave */ }

    try {
      updateOutDocDto.drafter = userId;
      const result = await this.service.update(docid, updateOutDocDto, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: isFirstSave
            ? `Tạo mới dự thảo văn bản đi, documentId: ${docid}, trích yếu: ${updateOutDocDto.abstractNote || 'N/A'}`
            : `Cập nhật văn bản dự thảo, documentId: ${docid}, trích yếu: ${updateOutDocDto.abstractNote || 'N/A'}`,
          method: 'PUT',
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
          action: 'PUT',
          details: `Lỗi cập nhật VB dự thảo, documentId: ${docid}: ${error?.message || error}`,
          method: 'PUT',
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
  // 📌 DELETE (nhiều ID)
  @Delete()
  async delete(@Body('ids') documentIds: string[], @Req() req: any) {
    const userId = req?.user?.userId || req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp danh sách ID');
    }

    const documents = await Promise.all(
      documentIds.map(async (documentId) => {
        const document = await this.service.getOutgoingDocumentByFields({
          documentId,
          select: ['documentId', 'createdBy'],
        });
        if (!document) {
          throw new NotFoundException(`Văn bản đi không tồn tại: ${documentId}`);
        }
        return document;
      }),
    );

    const unauthorized = documents.filter((doc) => !DocumentPolicy.canDeleteOutgoingDocument({ userId }, doc));
    if (unauthorized.length > 0) {
      throw new ForbiddenException(`Không có quyền xóa văn bản đi: ${unauthorized.map((doc) => doc.documentId).join(', ')}`);
    }

    try {
      const result = await this.service.delete(documentIds);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'DELETE',
          details: `Xóa văn bản đi thành công, số lượng: ${documentIds?.length || 0}`,
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
          details: `Lỗi xóa văn bản đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Post('set-number')
  async setNumber(@Body() data: any, @Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) throw new BadGatewayException('Không tìm thấy người dùng');

    try {
      const result = await this.service.setNumber(data, userId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Cấp số văn bản đi thành công`,
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
          details: `Lỗi cấp số văn bản đi: ${error?.message || error}`,
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
  @Put(':id/sign-number')
  async updateIsSignNumber(
    @Param('id') id: string,
    @Body('isNumbered') isNumbered: number,
    @EffectiveUser() userId?: string,
    @Req() req?: any,
  ) {
    const currentUserId = userId || req?.user?.userId;
    try {
      const result = await this.service.updateIsSignNumber(id, isNumbered, currentUserId);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'PUT',
          details: `Cập nhật trạng thái ký số văn bản đi, id: ${id}`,
          method: 'PUT',
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
          action: 'PUT',
          details: `Lỗi cập nhật trạng thái ký số VB đi, id: ${id}: ${error?.message || error}`,
          method: 'PUT',
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
  @Post('request-feedback/:workItemId')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  // @HttpCode(HttpStatus.OK)
  async requestLeadershipFeedback(
    @Param('workItemId') workItemId: any,
    @Req() req: any,
    @Body() dto: any,
    @EffectiveUser() userId: string,
  ) {
    try {
      // Check quyền: user phải là assignee của work item
      if (workItemId && dto.docIds?.[0]) {
        const workItem = await this.sqlRepo.getWorkItem(dto.docIds[0], workItemId);
        const user = await this.sqlsvRepo.getUserById(userId);
        const userName = user?.name || userId;
        const permission = DocumentPolicy.validateWorkItemPermission(userName, userId, workItem, 'yêu cầu phản hồi');
        if (!permission.allowed) {
          throw new ForbiddenException(permission.reason);
        }
      }

      const bpmnXML = await this.sqlRepo.getBpmnFile('XIN_Y_KIEN');
      const unitStr = await this.sqlRepo.getBpmnOrg('XIN_Y_KIEN');
      const allowedUnitIds = unitStr
        ?.split(',')
        .map(s => s.trim())
        .filter(Boolean) || [];
      const result = await this.service.requestLeadershipFeedback(userId, dto, workItemId, bpmnXML, allowedUnitIds);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Gửi xin ý kiến lãnh đạo thành công, workItemId: ${workItemId}`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: req?.user?.userId || userId || "",
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error('Lỗi ghi log:', logErr?.message || logErr);
      }
      return {
        success: true,
        data: result,
        message: result.message || 'Gửi xin ý kiến thành công',
      };
    } catch (error: any) {
      console.error('[request-feedback] Lỗi:', error);
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lý do: ${error?.message || error}`,
          method: 'POST',
          status: 'FAILED',
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get(':id')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Chi tiết văn bản cho người dùng cụ thể' })
  @ApiParam({ name: 'id', description: 'ID văn bản' })
  @ApiQuery({ name: 'userId', description: 'ID người dùng', required: false })
  @ApiQuery({ name: 'roles', description: 'Vai trò người dùng, phân tách bằng dấu phẩy', required: false })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  @ApiQuery({ name: 'bpmnVersion', description: 'Tên quy trình BPMN (VD: XIN_Y_KIEN)', required: false })
  @ApiResponse({ status: 200, description: 'Chi tiết văn bản trả về', type: Object })
  async getDetails(
    @Param('id') documentId: string,
    @Query('roles') roles: string,
    @EffectiveUser() userIin?: string,
    @Query('bpmn') bpmn?: string,
    @Query('isAuthority') isAuthority?: string,
    @Query('bpmnVersion') bpmnVersion?: string,
    @Req() req?: any,
  ) {
    const userId = userIin || req?.user?.userId;
    try {
      const result = await this.service.getDetails(
        documentId,
        userId,
        (roles || '').split(',').filter(Boolean),
        bpmn,
        isAuthority,
        bpmnVersion,
      );
      // 🔥 CHUẨN HOÁ JSON FIELD Ở ĐIỂM CUỐI
      const document = result?.document;
      if (document) {
        const jsonFields = [
          'docWorkFiles',
          'docProposal',
          'docDraft',
          'docAttachments',
          'docRecall',
          'docReplacement',
          'docAnswer',
          'knowReceivers',
          'vieweds',
          'commanders',
          'recipientIds',
          'viewers',
        ];

        jsonFields.forEach(field => {
          const val = document[field];
          if (typeof val === 'string') {
            try {
              document[field] = JSON.parse(val);
            } catch {
              document[field] = [];
            }
          }
        });

        const knowReceivers = Array.isArray(document.knowReceivers) ? document.knowReceivers : [];
        const vieweds = Array.isArray(document.vieweds) ? document.vieweds : [];
        document.isKnowReceiver = knowReceivers.some((r: any) =>
          (typeof r === 'string' ? r : r?.id) === userId
        );
        document.isViewed = vieweds.some((r: any) =>
          (typeof r === 'string' ? r : r?.id) === userId
        );
      }
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Xem chi tiết văn bản dự thảo, documentId: ${documentId}`,
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
          details: `Lỗi xem chi tiết VB dự thảo, documentId: ${documentId}: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình xem chi tiết văn bản.');
    }
  }

  @Post('mark-viewed')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Đánh dấu đã xem văn bản đi' })
  @ApiBody({ schema: { type: 'object', properties: { documentIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu đã xem văn bản' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy văn bản' })
  async markViewed(@Body('documentIds') documentIds: string[], @Req() req: any) {
    const userId = req.user.userId;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new BadRequestException('documentIds phải là mảng không rỗng');
    }
    try {
      const results = await Promise.all(
        documentIds.map((documentId) => this.service.markViewed(documentId, userId)),
      );
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Đánh dấu đã xem văn bản đi, số lượng: ${documentIds.length}`,
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
      return results;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi đánh dấu đã xem VB đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình đánh dấu đã xem.');
    }
  }

  @Get('list/signer-process')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Trình ký' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async signerProcess(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const signerProcessTabMap: Record<string, string> = {
      'draft': 'Dự thảo',
      'signed': 'Đã trình ký',
      'pending_publication': 'Chờ ban hành',
      'published': 'Đã phát hành',
      'processing': 'Đang xử lý',
      'dang_xu_ly': 'Đang xử lý',
      'completed': 'Đã hoàn thành',
      'hoan_thanh': 'Đã hoàn thành',
      'replaced': 'Bị thay thế',
      'thay_the': 'Bị thay thế',
      'bi_thay_the': 'Bị thay thế',
      'cho_phat_hanh': 'Chờ phát hành',
      'cho_ban_hanh': 'Chờ ban hành',
    };
    const tabName = signerProcessTabMap[query.type] || query.type || 'Không xác định';
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Trình ký - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log signer-process:', error);
    }
    try {
      return await this.service.listSignerProcessDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Trình ký - tab [${tabName}]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách văn bản trình ký.');
    }
  }


  /**
   * API gộp danh sách Văn bản Đang Xử lý + Văn bản Nhận để biết (Dashboard style)
   */
  @Get('list/combined-dashboard')
  @ApiOperation({
    summary: 'Gộp danh sách Văn bản Đang Xử lý và Nhận để biết',
    description: 'Trả về danh sách kết hợp giữa "Xử lý" (Processor) và "Nhận để biết" (Viewer) với type=waiting'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'processFnProcess', required: false, type: String, example: 'ChoXuLyTP' })
  @ApiQuery({ name: 'processFnViewer', required: false, type: String, example: 'ChuaXuLyTP' })
  @ApiQuery({ name: 'authority', required: false, type: String, example: 'false' })
  @ApiQuery({ name: 'isExport', required: false, type: String, example: 'false' })
  @ApiQuery({ type: ListDocumentsNoTypeDto, style: 'deepObject', explode: true })
  async listCombinedProcessAndViewer(
    @Query() query: ListDocumentsNoTypeDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;   // tùy theo cách lưu user trong JWT của bạn

    if (!userId) {
      return {
        success: false,
        message: 'Không tìm thấy thông tin người dùng',
      };
    }

    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách văn bản gộp (Xử lý + Nhận để biết), trang: ${query.page}, limit: ${query.limit}`,
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

    const authorId = query.authority === 'true'
      ? (query as any).authorId || (query as any).author_id
      : undefined;

    try {
      const result = await this.service.listCombinedProcessAndViewer(
        query,
        userId,
        authorId as string | undefined
      );

      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách văn bản gộp: ${error?.message || error}`,
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
      console.error('Error in listCombinedProcessAndViewer:', error);
      return {
        success: false,
        message: 'Lỗi khi lấy danh sách văn bản kết hợp',
        error: error.message,
      };
    }
  }

  @Get('list/process')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Xử lý' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async outgoingProcessDocuments(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const processTabMap: Record<string, string> = {
      'waiting': 'Chờ xử lý',
      'processed': 'Đã xử lý',
      'published': 'Đã ban hành',
    };
    const tabName = processTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Xử lý - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      const result = await this.service.listProcessDocumentsDynamic(query, originalUserId, effectiveUserId);
      return result;
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Xử lý - tab [${tabName}]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách văn bản xử lý.');
    }
  }

  @Get('list/promulgate')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Ban hành' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async outgoingPromulgateDocuments(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Query() query: ListDocumentsDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    const promulgateTabMap: Record<string, string> = {
      'waiting': 'Chờ phát hành',
      'processed': 'Đã phát hành',
    };
    const tabName = promulgateTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Phát hành - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.listPromulgateDocumentsDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Phát hành - tab [${tabName}]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách văn bản ban hành.');
    }
  }

  @Get('list/recipient-to-know')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Nhận để biết' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async outgoingViewDocuments(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const viewTabMap: Record<string, string> = {
      'waiting': 'Chờ xử lý',
      'processed': 'Đã xem',
    };
    const tabName = viewTabMap[query.type] || query.type || 'Không xác định';
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Nhận để biết - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.listViewDocumentsDynamic(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Nhận để biết - tab [${tabName}]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Get('list/next-stage-notification')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản đi được thông báo cho giai đoạn tiếp theo' })
  @ApiQuery({ type: ListDocumentsDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async listNextStageNotificationDocuments(
    @OriginalUser() originalUserId: string,
    @Query() query: ListDocumentsDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string
  ) {
    const tabName =
      query.type === 'waiting'
        ? 'Chưa đọc'
        : query.type === 'processed'
          ? 'Đã đọc'
          : 'Tất cả';
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập VB đi - Thông báo giai đoạn tiếp theo - tab [${tabName}], processFn: ${query.processFn || 'N/A'}, trang: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.listNextStageNotificationDocuments(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập VB đi - Thông báo giai đoạn tiếp theo - tab [${tabName}]: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách văn bản được thông báo cho giai đoạn tiếp theo.');
    }
  }

  @Get('by-incoming/:incomingId')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách dự thảo/văn bản đi được tạo từ 1 văn bản đến (lọc theo reply_incomming_doc)' })
  @ApiParam({ name: 'incomingId', description: 'document_id của văn bản đến' })
  @ApiQuery({ name: 'page', required: false, description: 'Trang (mặc định 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số bản ghi mỗi trang (mặc định 20)' })
  @ApiResponse({ status: 200, description: 'Danh sách dự thảo/văn bản đi liên quan văn bản đến' })
  async listByIncoming(
    @Param('incomingId') incomingId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách VB đi theo VB đến, incomingId: ${incomingId}`,
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
      return await this.service.listOutgoingByIncomingId({
        incomingId,
        query,
      });
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập danh sách VB đi theo VB đến: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra, vui lòng thử lại sau.');
    }
  }

  @Post('additional-release')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Phát hành bổ sung' })
  @ApiBody({
    schema: {
      type: 'object', properties: {
        documentId: { type: 'string' },
        receiveUnits: { type: 'array', items: { type: 'string' } },
        knowReceivers: { type: 'array', items: { type: 'string' } },
        processors: { type: 'array', items: { type: 'string' } },
        deadline: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Đã phát hành bổ sung' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy văn bản' })
  async additionalRelease(
    @Body() body: additionalRelease,
    @EffectiveUser() userId: string,
    @Req() req: any,
  ) {
    const effectiveUserId = userId || req.user.userId;
    const receiveUnits = Array.isArray((body as any).receiveUnits)
      ? (body as any).receiveUnits
      : Array.isArray((body as any).unitIds)
        ? (body as any).unitIds
        : [];
    const knowReceivers = Array.isArray((body as any).knowReceivers)
      ? (body as any).knowReceivers
      : Array.isArray((body as any).know_receivers)
        ? (body as any).know_receivers
        : [];
    const processors = Array.isArray((body as any).processors)
      ? (body as any).processors
      : Array.isArray((body as any).processor)
        ? (body as any).processor
        : [];

    if (!body.documentId) {
      throw new BadRequestException('documentId bắt buộc phải có');
    }
    const hasReceivers =
      receiveUnits.length > 0 ||
      knowReceivers.length > 0 ||
      processors.length > 0;
    if (!hasReceivers) {
      throw new BadRequestException('Phải chọn ít nhất một đơn vị hoặc cá nhân để phát hành bổ sung');
      throw new BadRequestException('receiveUnits bắt buộc phải có');
    }

    try {
      await this.service.additionalReleaseOutgoingDocument(
        body.documentId,
        receiveUnits,
        knowReceivers,
        processors,
        body.deadline,
        effectiveUserId,
      );

      // Ghi log sau khi thực hiện thành công
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Phát hành bổ sung cho văn bản`,
          method: 'POST',
          status: 'SUCCESS',
          type: process.env.CLIENT_LOG || 'DHVBTC',
          subType: process.env.CLIENT_LOG || 'DHVBTC',
          userInfo: userId || '',
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Lỗi ghi log:', logError);
      }

      return {
        success: true,
        message: 'Phát hành bổ sung thành công.',
      };
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi phát hành bổ sung văn bản: ${error?.message || error}`,
          method: 'POST',
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
      console.error('Lỗi phát hành bổ sung:', error);
      return {
        success: true,
        message: 'Lỗi khi phát hành bổ sung',
        error: error.message,
      };
    }
  }

  @Post(':docId/:workItemId/stampDoc')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Hoàn thành một công việc(work item) của văn bản - merge files và trả về PDF' })
  @ApiBearerAuth()
  @ApiParam({ name: 'docId', description: 'ID của văn bản' })
  @ApiParam({ name: 'workItemId', description: 'ID của công việc' })
  @ApiQuery({ name: 'bpmn', description: 'Đường dẫn file BPMN', required: false })
  async stampDoc(
    @Req() req: any,
    @Res() res: any,
    // @OriginalUser() userId: string,
    @EffectiveUser() userId: string,
    @Param('docId') docId: string,
    @Param('workItemId') workItemId: string,
    @Body() payload: {
      roles: string;
      actionCode: string;
      fileOrigin: string;
      fileExample: string;
      recipientsText?: string;
    },
    @AuthorizedUser() authorizedBy: string | null,
    @Query('bpmn') bpmn?: string,
  ) {
    try {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      const rawQueryToken = req.query.accessToken || req.query.access_token;
      const queryToken = Array.isArray(rawQueryToken) ? rawQueryToken[0] : rawQueryToken;

      const accessToken = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7).trim()
        : (typeof queryToken === 'string' ? queryToken : undefined);

      const result = await this.service.stampDoc(docId, workItemId, payload, userId, authorizedBy, bpmn, accessToken);
      const buffer = result.buffer || result;

      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Hoàn thành công việc (work item) của văn bản, docId: ${docId}, workItemId: ${workItemId}`,
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
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="merged.pdf"',
        'Content-Length': buffer.length,
      });
      return res.end(buffer);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'POST',
          details: `Lỗi hoàn thành work item, docId: ${docId}, workItemId: ${workItemId}: ${error?.message || error}`,
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

  @Get('list/report-outgoing-by-time')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách văn bản: Thống kê theo thời gian' })
  @ApiQuery({ type: ListReportOutgoingByTimeDto })
  @ApiResponse({ status: 200, description: 'Danh sách văn bản trả về, gồm các trường: items, total, page, limit, totalPages' })
  async reportOutgoingByTime(
    @OriginalUser() originalUserId: string,
    @Req() req: any,
    @Query() query: ListReportOutgoingByTimeDto,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê văn bản đi theo thời gian: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.reportOutgoingByTime(query, originalUserId, effectiveUserId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê VB đi theo thời gian: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy thống kê.');
    }
  }

  @Get('list/statistics-by-signer')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Thống kê văn bản đi theo người ký' })
  @ApiQuery({ type: OutgoingStatisticsBySignerDto })
  @ApiResponse({
    status: 200,
    description: [
      'Kết quả: { data, total, page, limit, totalPages }.',
      'Mỗi phần tử data: { stt, signer, role, total, officialLetter, decision, announcement, report, other }.',
      'Khi countOnly=true: { total }.',
    ].join(' '),
  })
  async statisticsBySigner(
    @Query() query: OutgoingStatisticsBySignerDto,
    @Req() req: any,
    @EffectiveUser() effectiveUserId: string,
    @Query('isAuthority') isAuthority?: string,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê văn bản đi theo người ký, trang: ${query.page}, limit: ${query.limit}`,
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
    if (isAuthority === 'true') userId = effectiveUserId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin user từ token');
    }
    // Service đã map toàn bộ sang English camelCase keys — không cần remap tại controller.
    try {
      return await this.service.statisticsBySigner(query, userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê VB đi theo người ký: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy thống kê VB.');
    }
  }

  @Get('/list/statistic-process-sign')
  @ApiOperation({
    summary: 'Báo cáo văn bản đến theo phòng ban gửi',
    description: 'Trả về thống kê số lượng văn bản đến theo phòng ban gửi',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy báo cáo thành công',
    type: StatisticReportProcessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số không hợp lệ',
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server',
  })
  async getStatisticReportOfSenderUnitController(
    @Query() query: StatisticProcessSignQueryDto,
    @EffectiveUser() effectiveUserId: string,
    @Req() req: any,
  ): Promise<StatisticReportProcessResponseDto> {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Thống kê tiến độ trình ký văn bản đi, trang: ${query.page}, limit: ${query.limit}`,
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
      return await this.service.getStatisticReportOfSenderUnitService(query, userId);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Thống kê tiến độ trình ký VB đi: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy báo cáo.');
    }
  }

  @Get('list/interoperability-status')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Theo dõi trạng thái liên thông văn bản' })
  @ApiResponse({ status: 200, description: 'Danh sách trạng thái liên thông văn bản' })
  async getInteroperabilityStatus(
    @Query() query: any,
    @Req() req: any,
  ) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập Theo dõi trạng thái liên thông văn bản, trang: ${query?.page}, limit: ${query?.limit}`,
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
      return await this.service.getInteroperabilityStatus(query);
    } catch (error) {
      try {
        await this.systemLogService.createLogFromSystem({
          action: 'GET',
          details: `Lỗi truy cập Theo dõi trạng thái liên thông văn bản: ${error?.message || error}`,
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
      throw new InternalServerErrorException('Đã có lỗi xảy ra trong quá trình lấy danh sách trạng thái liên thông văn bản.');
    }
  }
}
