import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  Query, UsePipes, ValidationPipe, Req, Res, HttpStatus
} from '@nestjs/common';
import { Response, Request } from 'express';
import { FeedbackSuggestionsService } from './feedback-suggestions.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { ReturnError } from '../utils/util';

import { CreateFeedbackSuggestionDto } from './dto/create-feedback-suggestion.dto';
import { UpdateFeedbackSuggestionDto } from './dto/update-feedback-suggestion.dto';
import { ListFeedbackSuggestionDto } from './dto/list-feedback-suggestion.dto';
import { DispatchFeedbackDto } from './dto/dispatch-feedback.dto';
import { RejectFeedbackDto } from './dto/reject-feedback.dto';
import { CompleteFeedbackDto } from './dto/complete-feedback.dto';
import { RatingFeedbackDto } from './dto/rating-feedback.dto';
import { ReUpdateFeedbackDto } from './dto/reupdate-feedback.dto';
import { UseGuards } from '@nestjs/common';
import { FeedbackPermissionGuard } from './guards/feedback-permission.guard';
import { RequireFeedbackPermission, FeedbackPermissionAction } from './decorators/feedback-permission.decorator';

@Controller('feedback-suggestions')
@UseGuards(FeedbackPermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FeedbackSuggestionsController {
  constructor(
    private readonly svc: FeedbackSuggestionsService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  // ──────────────────────────────────────────────
  // CRUD CƠ BẢN
  // ──────────────────────────────────────────────

  /** Tạo phản ánh mới */
  @Post()
  @RequireFeedbackPermission(FeedbackPermissionAction.CREATE)
  async create(@Body() dto: CreateFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      // [Tối ưu] Ghi log SAU action — tránh ghi SUCCESS trước khi biết kết quả
      const result = await this.svc.create(dto, userId);
      this.log('POST', 'Tạo phản ánh mới', 'SUCCESS', userId, req);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: result,
      });
    } catch (error) {
      this.log('POST', `Tạo phản ánh mới THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /** Cập nhật thông tin cơ bản */
  @Patch(':id')
  @RequireFeedbackPermission(FeedbackPermissionAction.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    const actionName = dto?.status === '3' ? 'Huỷ' : 'Cập nhật';
    try {
      const result = await this.svc.update(id, dto, userId);
      await this.log('PATCH', `${actionName} phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      await this.log('PATCH', `${actionName} phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /** Xóa mềm hàng loạt — DELETE /feedback-suggestions  body: { ids: string[] } */
  @Delete()
  @RequireFeedbackPermission(FeedbackPermissionAction.DELETE)
  async remove(@Body('ids') ids: string[], @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.remove(ids, userId);
      await this.log('DELETE', `Xóa mềm ${ids?.length ?? 0} phản ánh`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      await this.log('DELETE', `Xóa mềm phản ánh THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  // ──────────────────────────────────────────────
  // DANH SÁCH THEO TRẠNG THÁI (role-based trong service)
  // ──────────────────────────────────────────────

  /** Helper dùng chung: lấy userId + userRole từ JWT, gọi service */
  private async list(
    res: Response,
    query: ListFeedbackSuggestionDto,
    req: Request,
    description: string,
    actionCodes?: string[],
  ) {
    const userId = (req as any)?.user?.userId;
    try {
      const userRole = (req as any)?.user?.role || (req as any)?.user?.roleCode;
      const q = actionCodes ? { ...query, actionCodes } : query;
      const result = await this.svc.findAll(q, userId, userRole);
      await this.log('GET', `Xem danh sách: ${description}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, ...result });
    } catch (error) {
      await this.log('GET', `Xem danh sách ${description} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  private async listMy(
    res: Response,
    query: ListFeedbackSuggestionDto,
    req: Request,
    description: string,
    actionCodes?: string[],
  ) {
    const userId = (req as any)?.user?.userId;
    try {
      const q: any = { ...query, createdById: userId };
      // "Phản ánh của tôi" không áp tiêu chí theo processFn để tránh loại mất dữ liệu do cấu hình menu.
      delete q.processFn;
      if (actionCodes) q.actionCodes = actionCodes;
      const result = await this.svc.findAll(q, userId);
      await this.log('GET', `Xem phản ánh của tôi: ${description}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, ...result });
    } catch (error) {
      await this.log('GET', `Xem phản ánh của tôi: ${description} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  @Get()
  findAll(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Tất cả');
  }

  @Get('cho-dieu-phoi')             // actionCodes = CREATE, RESUBMIT, REJECT_UNIT_TO_DISPATCHER
  getWaitingDispatch(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Chờ điều phối', ['CREATE']);
  }

  @Get('cho-xu-ly')                 // actionCodes = DISPATCH, REDISPATCH
  getWaitingProcess(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Chờ xử lý', ['DISPATCH', 'REDISPATCH']);
  }

  @Get('dang-xu-ly')                // actionCodes = ACCEPT
  getProcessing(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Đang xử lý', ['ACCEPT']);
  }

  @Get('hoan-thanh')                // actionCodes = COMPLETE
  getCompleted(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Hoàn thành', ['COMPLETE']);
  }

  @Get('tu-choi')                   // actionCodes = REJECT_DISPATCH, REJECT_UNIT_TO_CREATOR
  getRejected(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.list(res, q, req, 'Từ chối', ['REJECT_DISPATCH']);
  }

  @Get('my-feedbacks')
  async getMyFeedbacks(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Tất cả');
  }

  @Get('my-feedbacks/cho-dieu-phoi')
  getMyWaitingDispatch(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Chờ điều phối', ['CREATE']);
  }

  @Get('my-feedbacks/cho-xu-ly')
  getMyWaitingProcess(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Chờ xử lý', ['DISPATCH', 'REDISPATCH']);
  }

  @Get('my-feedbacks/dang-xu-ly')
  getMyProcessing(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Đang xử lý', ['ACCEPT']);
  }

  @Get('my-feedbacks/hoan-thanh')
  getMyCompleted(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Hoàn thành', ['COMPLETE']);
  }

  @Get('my-feedbacks/tu-choi')
  getMyRejected(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    return this.listMy(res, q, req, 'Từ chối', ['REJECT_DISPATCH']);
  }

  @Get('my-feedbacks/da-huy')
  async getMyCancelled(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId;
    try {
      const result = await this.svc.findCancelled(q, userId);
      await this.log('GET', `Xem phản ánh của tôi: Đã huỷ`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, ...result });
    } catch (error) {
      await this.log('GET', `Xem phản ánh của tôi: Đã huỷ THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  @Get('da-huy')
  async getCancelled(@Query() q: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId;
    try {
      const result = await this.svc.findCancelled(q, userId);
      await this.log('GET', `Xem danh sách phản ánh đã huỷ`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, ...result });
    } catch (error) {
      await this.log('GET', `Xem danh sách phản ánh đã huỷ THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  // ──────────────────────────────────────────────
  // CÁC HÀNH ĐỘNG NGHIỆP VỤ
  // ──────────────────────────────────────────────

  /**
   * PATCH /feedback-suggestions/:id/dispatch
   * BPCT điều phối → Chờ xử lý
   */
  @Patch(':id/dispatch')
  @RequireFeedbackPermission(FeedbackPermissionAction.DISPATCH)
  async dispatch(@Param('id') id: string, @Body() dto: DispatchFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.dispatch(id, dto, userId);
      this.log('PATCH', `Điều phối phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      this.log('PATCH', `Điều phối phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/re-dispatch
   * BPCT điều phối lại sau khi đơn vị từ chối → Chờ xử lý
   */
  @Patch(':id/re-dispatch')
  @RequireFeedbackPermission(FeedbackPermissionAction.DISPATCH)
  async reDispatch(@Param('id') id: string, @Body() dto: DispatchFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.reDispatch(id, dto, userId);
      await this.log('PATCH', `Điều phối lại phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Điều phối lại phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/re-dispatch
   * tạo phản ánh  chỉnh sửa lại
   */
  @Patch(':id/re-update')
  @RequireFeedbackPermission(FeedbackPermissionAction.UPDATE)
  async reUpdate(@Param('id') id: string, @Body() dto: ReUpdateFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.reUpdate(id, dto, userId);
      await this.log('PATCH', `Cập nhật lại phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Cập nhật lại phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/reject-dispatch
   * BPCT từ chối điều phối → Từ chối
   */
  @Patch(':id/reject-dispatch')
  @RequireFeedbackPermission(FeedbackPermissionAction.REJECT)
  async rejectDispatch(@Param('id') id: string, @Body() dto: RejectFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.rejectDispatch(id, dto, userId);
      await this.log('PATCH', `Từ chối điều phối ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Từ chối điều phối ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/accept
   * Đơn vị tiếp nhận xử lý → Đang xử lý
   */
  @Patch(':id/accept')
  @RequireFeedbackPermission(FeedbackPermissionAction.ACCEPT)
  async accept(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.accept(id, userId);
      await this.log('PATCH', `Tiếp nhận xử lý ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Tiếp nhận xử lý ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/reject-unit
   * Đơn vị từ chối xử lý → Từ chối
   */
  @Patch(':id/reject-unit')
  async rejectUnit(@Param('id') id: string, @Body() dto: RejectFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.rejectUnit(id, dto, userId);
      await this.log('PATCH', `Từ chối xử lý ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Từ chối xử lý ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/complete
   * Đơn vị hoàn thành xử lý → Hoàn thành
   */
  @Patch(':id/complete')
  @RequireFeedbackPermission(FeedbackPermissionAction.COMPLETE)
  async complete(@Param('id') id: string, @Body() dto: CompleteFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.complete(id, dto, userId);
      await this.log('PATCH', `Hoàn thành phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Hoàn thành phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * PATCH /feedback-suggestions/:id/resubmit
   * Người phản ánh gửi lại sau khi bị từ chối
   */
  @Patch(':id/resubmit')
  @RequireFeedbackPermission(FeedbackPermissionAction.UPDATE)
  async resubmit(@Param('id') id: string, @Body() dto: Partial<CreateFeedbackSuggestionDto>, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.resubmit(id, dto, userId);
      await this.log('PATCH', `Gửi lại phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('PATCH', `Gửi lại phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * POST /feedback-suggestions/:id/rating
   * Người phản ánh đánh giá chất lượng xử lý
   */
  @Post(':id/rating')
  @RequireFeedbackPermission(FeedbackPermissionAction.RATING)
  async rating(@Param('id') id: string, @Body() dto: RatingFeedbackDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.rating(id, dto, userId);
      await this.log('POST', `Đánh giá phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('POST', `Đánh giá phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  // ──────────────────────────────────────────────
  // THỐNG KÊ & XUẤT DỮ LIỆU
  // ──────────────────────────────────────────────

  /**
   * GET /feedback-suggestions/stats
   * Thống kê tổng hợp theo trạng thái / loại / đơn vị
   */
  @Get('stats')
  async getStats(@Req() req: Request, @Res() res: Response, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.getStats(startDate, endDate, userId);
      await this.log('GET', 'Xem thống kê phản ánh', 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.log('GET', `Xem thống kê phản ánh THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /**
   * GET /feedback-suggestions/export
   * Xuất Excel danh sách (tối đa 5000 bản ghi)
   */
  @Get('export')
  async exportExcel(@Query() query: ListFeedbackSuggestionDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const userRole = (req as any)?.user?.role || (req as any)?.user?.roleCode;
      const data = await this.svc.exportData(query, userId, userRole);

      // Tạo workbook đơn giản
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Phản ánh kiến nghị');

      sheet.columns = [
        { header: 'Mã', key: 'code', width: 18 },
        { header: 'Loại phản ánh', key: 'types', width: 25 },
        { header: 'Mức độ', key: 'priority', width: 12 },
        { header: 'Tiêu đề', key: 'title', width: 40 },
        { header: 'Trạng thái', key: 'status', width: 18 },
        { header: 'Đơn vị xử lý', key: 'unitId', width: 20 },
        { header: 'Hạn xử lý', key: 'deadline', width: 20 },
        { header: 'Kết quả', key: 'result', width: 40 },
        { header: 'Ngày tạo', key: 'createdAt', width: 20 },
        { header: 'Phòng ban người tạo', key: 'creatorUnitName', width: 25 },
      ];

      sheet.getRow(1).font = { bold: true };
      for (const item of data) {
        sheet.addRow({
          code: item.code,
          types: item.types,
          priority: item.priority,
          title: item.title,
          status: item.status,
          unitId: item.unitId || '-',
          deadline: item.deadline || '-',
          result: item.result || '-',
          createdAt: new Date(item.createdAt).toLocaleString('vi-VN'),
          creatorUnitName: item.createdBy?.organizationName || '-',
        });
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=PhanAnh_${dateStr}.xlsx`);
      await workbook.xlsx.write(res);
      await this.log('GET', 'Xuất Excel danh sách phản ánh', 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).end();
    } catch (error) {
      await this.log('GET', `Xuất Excel danh sách phản ánh THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  /** Xem chi tiết phản ánh */
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any)?.user?.userId || '';
    try {
      const result = await this.svc.findOne(id, userId);
      await this.log('GET', `Xem chi tiết phản ánh ${id}`, 'SUCCESS', userId, req);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      await this.log('GET', `Xem chi tiết phản ánh ${id} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      const err = ReturnError(error);
      return res.status(err.status).json(err.body);
    }
  }

  // ──────────────────────────────────────────────
  // HELPER
  // ──────────────────────────────────────────────

  private async run(action: () => Promise<any>, method: string, details: string, userId: string, req: any) {
    try {
      const result = await action();
      await this.log(method, details, 'SUCCESS', userId, req);
      return result;
    } catch (error) {
      await this.log(method, `${details} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
      throw error;
    }
  }

  private async log(method: string, details: string, status: string, userId: string, req: Request) {
    try {
      await this.systemLogService.createLogFromSystem({
        action: method,
        details: `Phản ánh kiến nghị: ${details}`,
        method,
        status,
        type: 'FEEDBACK_SUGGESTION',
        subType: 'FEEDBACK_SUGGESTION',
        userInfo: userId,
        ipAddress: req?.ip || (req?.headers['x-forwarded-for'] as string) || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Lỗi ghi log FeedbackSuggestion:', e);
    }
  }
}
