import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  Req,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DestroyRecordsService } from './destroy-records.service';
import { UpdateDestroyRecordDto } from './destroy-records.dto';
import { ReturnError } from '../utils/util';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser, AuthorityGuard } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import * as moment from 'moment';

import { DESTROY_COMMANDER_STATUS_LABELS, DESTROY_LEADER_STATUS_LABELS, DESTROY_REASON_MAP, DESTROY_STATUS_LABELS, STATUS_MAP } from './destroy-records.constants';
import { DestroyRecordPermissionGuard } from './guard/destroy-record-permission.guard';
import { DestroyRecordPermissionAction, RequireDestroyRecordPermission } from './decorators/destroy-record-permission.decorators';

@ApiTags('Quản lý Tiêu Hủy Hồ Sơ')
@Controller('destroy-records')
@UseGuards(AuthorityGuard)
@UseGuards(DestroyRecordPermissionGuard)
export class DestroyRecordsController {
  constructor(
    private readonly service: DestroyRecordsService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @ApiOperation({
    summary: 'Lấy tùy chọn tiêu hủy',
    description: 'Lấy danh sách các tùy chọn lý do và trạng thái cho đợt tiêu hủy hồ sơ',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy tùy chọn thành công',
  })
  @Get('options')
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  async getOptions(@Res() res: Response, @Req() req: Request) {
    try {
      const data = {
        reasons: DESTROY_REASON_MAP,
        statuses: STATUS_MAP,
      };
      await this.logAction(req, 'GET', 'Lấy các tùy chọn cho đợt tiêu hủy', 'SUCCESS');
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      await this.logAction(req, 'GET', 'Lấy các tùy chọn cho đợt tiêu hủy thất bại', 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @ApiOperation({
    summary: 'Lấy hành động khả dụng',
    description: 'Lấy danh sách các hành động mà người dùng có thể thực hiện trong quy trình tiêu hủy',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy hành động thành công',
  })
  // Lấy nút lưu và trình duyệt từ luồng (start)
  @Get('get-action')
  // @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  async getActionAvailableByUser(
    @OriginalUser() originalUserId: string,
    @Req() req: Request,
  ) {
    try {
      const result = await this.service.getActionAvailableByUser(originalUserId);
      await this.logAction(req, 'GET', 'Lấy danh sách hành động khả dụng (Tiêu hủy)', 'SUCCESS');
      return result;
    } catch (error) {
      await this.logAction(req, 'GET', 'Lấy danh sách hành động khả dụng (Tiêu hủy) thất bại', 'FAILED');
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Lấy người nhận trong luồng',
    description: 'Lấy danh sách người nhận có thể được chỉ định trong quy trình tiêu hủy hồ sơ',
  })
  @ApiQuery({
    name: 'roles',
    description: 'Vai trò cần tìm (tùy chọn)',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả (mặc định: 100)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại (mặc định: 1)',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'name',
    description: 'Tên người dùng cần tìm',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @Get('get-users-in-flow')
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  async getUserInFlowSubmit(
    @Query() query: any,
    @EffectiveUser() userId: string,
    @Req() req: Request,
  ) {
    const details = 'Lấy danh sách người nhận trong luồng (Tiêu hủy)';
    try {
      // Nếu truyền trực tiếp roles (ví dụ: ?roles=chp), dùng logic lấy user theo role
      if (query.roles) {
        const result = await this.service.getUsersInFlow(
          userId,
          query,
          query.limit ? Number(query.limit) : 500,
          query.page ? Number(query.page) : 1,
          query.name
        );
        await this.logAction(req, 'GET', details, 'SUCCESS');
        return result;
      }

      // Ngược lại, dùng logic tính toán bước tiếp theo của workflow
      // Lưu ý: Nếu workItem gửi lên dạng string, cần parse JSON
      const dto = {
        ...query,
        workItem: typeof query.workItem === 'string' ? JSON.parse(query.workItem) : query.workItem
      };

      const result = await this.service.getUserInFlowSubmit(dto);
      await this.logAction(req, 'GET', details, 'SUCCESS');
      return result;
    } catch (error) {
      await this.logAction(req, 'GET', details + ' thất bại', 'FAILED');
      throw new BadRequestException('Lỗi khi lấy người trong luồng', error);
    }
  }

  // --- List routes (Placed above :id to avoid conflicts) ---

  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu khai thác',
    description: 'Lấy danh sách các yêu cầu khai thác hồ sơ với các trạng thái: tất cả, chưa trình, chờ phê duyệt, đã trả lại, đã phê duyệt, hoàn thành',
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get('list/record-exploitation-requests')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  async listRequests(
    @Req() req: Request,
    @OriginalUser() originalUserId: string,
    @Query() query: UpdateDestroyRecordDto,
    @EffectiveUser() effectiveUserId: string,
    @Res() res: Response,
  ) {
    const TAB_MAP = {
      all: 'Tất cả',
      draft: 'Chưa trình',
      waiting: 'Chờ phê duyệt',
      refuse: 'Đã trả lại',
      approved: 'Đã phê duyệt',
      complete: 'Hoàn thành',
    };
    try {
      const result = await this.service.listRecordExploitationRequests(query, originalUserId, effectiveUserId);
      result.items = (result.items || []).map(item => this.formatResult(item));
      await this.logListAccess(req, query, 'Người khai thác', 'SUCCESS', TAB_MAP);
      return res.status(HttpStatus.OK).json({
        ...result,
        success: true,
      });
    } catch (error) {
      await this.logListAccess(req, query, 'Người khai thác', 'FAILED', TAB_MAP);
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @ApiOperation({
    summary: 'Lấy danh sách đợt tiêu hủy (Lãnh đạo)',
    description: 'Lấy danh sách các đợt tiêu hủy hồ sơ cho lãnh đạo đơn vị phê duyệt với các trạng thái: tất cả, chờ phê duyệt, đã xử lý, đã trả lại',
  })
  @ApiQuery({
    name: 'page',
    description: 'Trang hiện tại',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Số lượng kết quả trên trang',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get('list/leader-destroy-records')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  @ApiQuery({ type: UpdateDestroyRecordDto, style: 'deepObject', explode: true })
  async listLeaderRecords(
    @Req() req: Request,
    @OriginalUser() originalUserId: string,
    @Query() query: UpdateDestroyRecordDto,
    @EffectiveUser() effectiveUserId: string,
    @Res() res: Response,
  ) {
    const TAB_MAP = {
      all: 'Tất cả',
      pending: 'Chờ phê duyệt',
      approved: 'Đã phê duyệt',
      processed: 'Đã xử lý',
      refuse: 'Đã trả lại',
      refure: 'Đã trả lại',
    };
    try {
      const result = await this.service.listLeaderRecordExploitationRequests(query, originalUserId, effectiveUserId);
      result.items = (result.items || []).map(item => this.formatLeaderResult(item));
      await this.logListAccess(req, query, 'Lãnh đạo đơn vị', 'SUCCESS', TAB_MAP);
      return res.status(HttpStatus.OK).json({
        ...result,
        success: true,
      });
    } catch (error) {
      await this.logListAccess(req, query, 'Lãnh đạo đơn vị', 'FAILED', TAB_MAP);
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('list/comander-destroy-records')
  @CheckAuthority(AuthorityStages.MEETING_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách đợt tiêu hủy hồ sơ hồ sơ (Chánh văn phòng)' })
  @ApiQuery({ type: UpdateDestroyRecordDto, style: 'deepObject', explode: true })
  async listComanderRecords(
    @Req() req: Request,
    @OriginalUser() originalUserId: string,
    @Query() query: UpdateDestroyRecordDto,
    @EffectiveUser() effectiveUserId: string,
    @Res() res: Response,
  ) {
    const TAB_MAP = {
      all: 'Tất cả',
      pending: 'Chờ phê duyệt',
      processed: 'Đã xử lý',
      approved: 'Đã phê duyệt',
      refuse: 'Đã trả lại',
      refure: 'Đã trả lại',
    };
    try {
      const result = await this.service.listComanderRecordExploitationRequests(query, originalUserId, effectiveUserId);
      result.items = (result.items || []).map(item => this.formatCommanderResult(item));
      await this.logListAccess(req, query, 'Chánh văn phòng', 'SUCCESS', TAB_MAP);
      return res.status(HttpStatus.OK).json({
        ...result,
        success: true,
      });
    } catch (error) {
      await this.logListAccess(req, query, 'Chánh văn phòng', 'FAILED', TAB_MAP);
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post()
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.CREATE)
  @ApiOperation({ summary: 'Tạo mới đợt tiêu hủy hồ sơ' })
  @ApiBody({ type: UpdateDestroyRecordDto })
  async create(
    @Body() dto: UpdateDestroyRecordDto,
    @Req() req: Request,
    @EffectiveUser() userIdEffective: string,
  ) {
    try {
      const result = await this.service.create(dto, userIdEffective);
      await this.logAction(req, 'POST', `Tạo mới đợt tiêu hủy hồ sơ: ${dto.destroyBatchCode}`, 'SUCCESS');
      return result;
    } catch (error) {
      await this.logAction(req, 'POST', `Tạo mới đợt tiêu hủy hồ sơ: ${dto.destroyBatchCode} thất bại`, 'FAILED');
      throw error;
    }
  }
  @Get(':id')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.VIEW)
  @ApiOperation({ summary: 'Lấy chi tiết đợt tiêu hủy' })
  async findOne(
    @Param('id') id: string,
    @EffectiveUser() userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.findOne(id, userId);
      await this.logAction(req, 'GET', `Xem chi tiết đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({
        success: true,
        data: this.formatResult(result),
      });
    } catch (error) {
      await this.logAction(req, 'GET', `Xem chi tiết đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Put(':id')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.UPDATE)
  @ApiOperation({ summary: 'Cập nhật đợt tiêu hủy' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDestroyRecordDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const result = await this.service.update(id, dto);
      await this.logAction(req, 'PUT', `Cập nhật đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({
        success: true,
        data: this.formatResult(result),
      });
    } catch (error) {
      await this.logAction(req, 'PUT', `Cập nhật đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete(':id')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa đợt tiêu hủy' })
  async remove(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    try {
      await this.service.remove(id);
      await this.logAction(req, 'DELETE', `Xóa đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, message: 'Xóa thành công!' });
    } catch (error) {
      await this.logAction(req, 'DELETE', `Xóa đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete()
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.DELETE)
  @ApiOperation({ summary: 'Xóa nhiều đợt tiêu hủy' })
  async removeMany(@Body('ids') ids: string[], @Res() res: Response, @Req() req: Request) {
    try {
      const result = await this.service.removeMany(ids);
      await this.logAction(req, 'DELETE', `Xóa nhiều đợt tiêu hủy hồ sơ: [${ids.join(', ')}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      await this.logAction(req, 'DELETE', `Xóa nhiều đợt tiêu hủy hồ sơ thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // Trình phê duyệt của người khai thác
  @Post(':id/leaders-destroy-records')
  @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Trình phê duyệt' })
  @ApiBody({ type: UpdateDestroyRecordDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async submitleaders_mining_records(
    @Body() dto: UpdateDestroyRecordDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('id') id: string,
    @Query('authority') authority: string,
    @Req() req: Request,
  ) {
    try {
      const author = authority === 'true' ? true : false
      const result = await this.service.submitleadersMiningRecords(id, dto, effectiveUserId, author);
      await this.logAction(req, 'POST', `Trình phê duyệt đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return result;
    } catch (error) {
      console.error('Error submitting leader destruction record:', error);
      await this.logAction(req, 'POST', `Trình phê duyệt đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      throw new BadRequestException(error.message || 'Lỗi khi trình phê duyệt');
    }
  }

  // Trình phê duyệt của Chánh văn phòng
  @Post(':id/commanders-destroy-records')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Chánh văn phòng trình lãnh đạo phê duyệt' })
  @ApiBody({ type: UpdateDestroyRecordDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async submitcommander_mining_records(
    @Body() dto: UpdateDestroyRecordDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('id') id: string,
    @Query('authority') authority: string,
    @Req() req: Request,
  ) {
    try {
      const author = authority === 'true' ? true : false
      const result = await this.service.submitcommanderMiningRecords(id, dto, effectiveUserId, author);
      await this.logAction(req, 'POST', `Chánh văn phòng trình lãnh đạo phê duyệt đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return result;
    } catch (error) {
      console.error('Error submitting commander destruction record:', error);
      await this.logAction(req, 'POST', `Chánh văn phòng trình lãnh đạo phê duyệt đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      throw new BadRequestException(error.message || 'Lỗi khi trình phê duyệt');
    }
  }

  // Lãnh đạo phê duyệt và chọn người thực hiện
  @Post(':id/leaders-approve-destroy-records')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Lãnh đạo phê duyệt và chọn người thực hiện' })
  @ApiBody({ type: UpdateDestroyRecordDto })
  @ApiResponse({ status: 201, description: 'Phê duyệt thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async submit_leader_approve_mining_records(
    @Body() dto: UpdateDestroyRecordDto,
    @OriginalUser() originalUserId: string,
    @EffectiveUser() effectiveUserId: string,
    @Param('id') id: string,
    @Query('authority') authority: string,
    @Req() req: Request,
  ) {
    try {
      const author = authority === 'true' ? true : false
      const result = await this.service.submitLeaderApproveMiningRecords(id, dto, effectiveUserId, author);
      await this.logAction(req, 'POST', `Lãnh đạo phê duyệt và chọn người thực hiện đợt tiêu hủy hồ sơ ID: [${id}]`, 'SUCCESS');
      return result;
    } catch (error) {
      console.error('Error leader approving destruction record:', error);
      await this.logAction(req, 'POST', `Lãnh đạo phê duyệt và chọn người thực hiện đợt tiêu hủy hồ sơ ID: [${id}] thất bại`, 'FAILED');
      throw new BadRequestException(error.message || 'Lỗi khi phê duyệt');
    }
  }

  // @Post(':id/submit')
  // @CheckAuthority(AuthorityStages.ARCHIVE_RECORD)
  // @ApiOperation({ summary: 'Trình phê duyệt đợt tiêu hủy' })
  // @ApiBody({ type: UpdateDestroyRecordDto })
  // async submit(
  //   @Param('id') id: string,
  //   @Body() dto: UpdateDestroyRecordDto,
  //   @EffectiveUser() userId: string,
  //   @OriginalUser() originalUser: string,
  //   @Res() res: Response,
  //   @Req() req: Request,
  // ) {
  //   try {
  //     await this.logAction(req, 'POST', `Trình phê duyệt đợt tiêu hủy hồ sơ ID: [${id}]`);
  //     const result = await this.service.submit(id, userId, originalUser, dto);
  //     return res.status(HttpStatus.OK).json({ success: true, data: result });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }



  @Post(':id/simple-next')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Chuyển xử lý/Phê duyệt đợt tiêu hủy' })
  async simpleNext(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object (như người dùng yêu cầu)
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.simpleNext(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `Chuyển xử lý đợt tiêu hủy hồ sơ ID: [${docId}], action: ${dto.actionCode}`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `Chuyển xử lý đợt tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/approve')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Phê duyệt đợt tiêu hủy' })
  async approve(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.approveNext(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `Phê duyệt đợt tiêu hủy hồ sơ ID: [${docId}], action: ${dto.actionCode}`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `Phê duyệt đợt tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/reject')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Trả lại đợt tiêu hủy' })
  async reject(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.rejectNext(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `Trả lại đợt tiêu hủy hồ sơ ID: [${docId}], action: ${dto.actionCode || 'REJECT'}`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `Trả lại đợt tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/leader-approve')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Ban lãnh đạo phê duyệt đợt tiêu hủy' })
  async leaderApprove(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.leaderApproveNext(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `BLD phê duyệt đợt tiêu hủy hồ sơ ID: [${docId}], action: ${dto.actionCode}`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `BLD phê duyệt đợt tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/leader-reject')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Ban lãnh đạo trả lại đợt tiêu hủy' })
  async leaderReject(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.leaderRejectNext(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `BLD trả lại đợt tiêu hủy hồ sơ ID: [${docId}], action: ${dto.actionCode || 'REJECT'}`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `BLD trả lại đợt tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/execute')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Thực hiện tiêu hủy hồ sơ' })
  async execute(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.executeDestruction(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `Thực hiện tiêu hủy hồ sơ ID: [${docId}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `Thực hiện tiêu hủy hồ sơ ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':id/clerical-execute')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @RequireDestroyRecordPermission(DestroyRecordPermissionAction.PROCESS)
  @ApiOperation({ summary: 'Văn thư thực hiện tiêu hủy hồ sơ' })
  async clericalExecute(
    @Param('id') docId: string,
    @Body() dto: UpdateDestroyRecordDto,
    @EffectiveUser() userId: string,
    @OriginalUser() originalUser: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    try {
      const { workItem } = dto;
      let workItemId = workItem?.id;
      // Xử lý trường hợp workItem.id là một object
      if (typeof workItemId === 'object' && workItemId !== null) {
        workItemId = (workItemId as any).id;
      }

      if (!workItemId) throw new BadRequestException('workItemId là bắt buộc');

      const result = await this.service.clericalExecuteDestruction(docId, workItemId, dto, userId, originalUser);
      await this.logAction(req, 'POST', `Văn thư thực hiện tiêu hủy ID: [${docId}]`, 'SUCCESS');
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      await this.logAction(req, 'POST', `Văn thư thực hiện tiêu hủy ID: [${docId}] thất bại`, 'FAILED');
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  private formatResult(item: any) {
    if (!item) return null;
    const status = (item.status || '0').toString();
    return {
      ...item,
      statusCode: status,
      createdAt: item.createdAt || item.created_at ? moment.utc(item.createdAt || item.created_at).format('DD/MM/YYYY') : null,
      status: this.getStatusLabel(status),
      destroyReason: DESTROY_REASON_MAP[item.destroyReason || item.destroy_reason] || item.destroyReason || item.destroy_reason,
    };
  }

  private getStatusLabel(status: string) {
    const statusConfig = {
      '0': { text: DESTROY_STATUS_LABELS['0'], color: '#6B7280', bgColor: '#c8cdd1', bdColor: '#AEB5BE' },
      '1': { text: DESTROY_STATUS_LABELS['1'], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' },
      '2': { text: DESTROY_STATUS_LABELS['2'], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' },
      '3': { text: DESTROY_STATUS_LABELS['3'], color: '#2563EB', bgColor: '#DBEAFE', bdColor: '#AEB5BE' },
      '4': { text: DESTROY_STATUS_LABELS['4'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
      '5': { text: DESTROY_STATUS_LABELS['5'], color: '#059669', bgColor: '#DCFCE7', bdColor: '#ADECC0' },
      '6': { text: DESTROY_STATUS_LABELS['6'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
      '7': { text: DESTROY_STATUS_LABELS['7'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
    };
    const config = statusConfig[status] || { text: 'Không xác định', color: '#6B7280', bgColor: '#c8cdd1', bdColor: '#AEB5BE' };
    return `<div style="display: flex; width: 100%; justify-content: center; align-items: center; padding: 4px 12px; border-radius: 16px; background-color: ${config.bgColor}; color: ${config.color}; border: 1px solid ${config.bdColor}; font-size: 14px; font-weight: 700; white-space: nowrap;">${config.text}</div>`;
  }

  private formatLeaderResult(item: any) {
    if (!item) return null;
    const status = (item.status || '0').toString();
    return {
      ...item,
      statusCode: status,
      createdAt: item.createdAt || item.created_at ? moment.utc(item.createdAt || item.created_at).format('DD/MM/YYYY') : null,
      status: this.getLeaderStatusLabel(status),
      destroyReason: DESTROY_REASON_MAP[item.destroyReason || item.destroy_reason] || item.destroyReason || item.destroy_reason,
    };
  }

  private getLeaderStatusLabel(status: string) {
    let label = { text: 'Không xác định', color: '#6B7280', bgColor: '#c8cdd1', bdColor: '#AEB5BE' };
    if (status === '1' || status === '2') {
      label = { text: DESTROY_LEADER_STATUS_LABELS[status], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' };
    } else if (status === '3') {
      label = { text: DESTROY_LEADER_STATUS_LABELS[status], color: '#2563EB', bgColor: '#DBEAFE', bdColor: '#AEB5BE' };
    } else if (status === '5') {
      label = { text: DESTROY_LEADER_STATUS_LABELS[status], color: '#059669', bgColor: '#DCFCE7', bdColor: '#ADECC0' };
    } else if (status === '4' || status === '6' || status === '7') {
      label = { text: DESTROY_LEADER_STATUS_LABELS[status], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' };
    }
    return `<div style="display: flex; width: 100%; justify-content: center; align-items: center; padding: 4px 12px; border-radius: 16px; background-color: ${label.bgColor}; color: ${label.color}; border: 1px solid ${label.bdColor}; font-size: 14px; font-weight: 700; white-space: nowrap;">${label.text}</div>`;
  }

  private formatCommanderResult(item: any) {
    if (!item) return null;
    const status = (item.status || '0').toString();
    return {
      ...item,
      statusCode: status,
      createdAt: item.createdAt || item.created_at ? moment.utc(item.createdAt || item.created_at).format('DD/MM/YYYY') : null,
      status: this.getCommanderStatusLabel(status),
      destroyReason: DESTROY_REASON_MAP[item.destroyReason || item.destroy_reason] || item.destroyReason || item.destroy_reason,
    };
  }

  private getCommanderStatusLabel(status: string) {
    const statusConfig = {
      '0': { text: DESTROY_COMMANDER_STATUS_LABELS['0'], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' },
      '1': { text: DESTROY_COMMANDER_STATUS_LABELS['1'], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' },
      '2': { text: DESTROY_COMMANDER_STATUS_LABELS['2'], color: '#D97706', bgColor: '#FEF3C7', bdColor: '#FFE8BE' },
      '3': { text: DESTROY_COMMANDER_STATUS_LABELS['3'], color: '#2563EB', bgColor: '#DBEAFE', bdColor: '#AEB5BE' },
      '4': { text: DESTROY_COMMANDER_STATUS_LABELS['4'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
      '5': { text: DESTROY_COMMANDER_STATUS_LABELS['5'], color: '#059669', bgColor: '#DCFCE7', bdColor: '#ADECC0' },
      '6': { text: DESTROY_COMMANDER_STATUS_LABELS['6'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
      '7': { text: DESTROY_COMMANDER_STATUS_LABELS['7'], color: '#EF4444', bgColor: '#FEE2E2', bdColor: '#FFC3C6' },
    };
    const config = statusConfig[status] || { text: 'Không xác định', color: '#6B7280', bgColor: '#c8cdd1', bdColor: '#AEB5BE' };
    return `<div style="display: flex; width: 100%; justify-content: center; align-items: center; padding: 4px 12px; border-radius: 16px; background-color: ${config.bgColor}; color: ${config.color}; border: 1px solid ${config.bdColor}; font-size: 14px; font-weight: 700; white-space: nowrap;">${config.text}</div>`;
  }

  private async logAction(req: Request, method: string, details: string, status: string = 'SUCCESS') {
    try {
      await this.systemLogService.createLogFromSystem({
        action: method,
        details,
        method,
        status,
        type: 'DESTROY_RECORDS',
        subType: 'DESTROY_RECORDS',
        userInfo: (req as any)?.user?.userId || '',
        ipAddress: req?.ip || (req?.headers['x-forwarded-for'] as string) || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Lỗi ghi log:', e);
    }
  }

  private async logListAccess(req: Request, query: any, roleName: string, status: string = 'SUCCESS', tabMap?: Record<string, string>) {
    const DEFAULT_TAB_MAP: Record<string, string> = {
      all: 'Tất cả',
      daft: 'Chưa trình',
      waiting: 'Chờ phê duyệt',
      refuse: 'Đã trả lại',
      refure: 'Đã trả lại',
      approved: 'Đã phê duyệt',
      complete: 'Hoàn thành',
      pending: 'Chờ phê duyệt',
      processed: 'Đã xử lý',
    };
    const resolvedMap = tabMap || DEFAULT_TAB_MAP;
    const tabName = resolvedMap[query.type] || `Tab: ${query.type || 'Tất cả'}`;

    // Build thông tin filter nếu có
    const filterParts: string[] = [];
    if (query.filter && typeof query.filter === 'object') {
      for (const [key, val] of Object.entries(query.filter)) {
        if (val !== null && val !== undefined && val !== '') {
          const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          filterParts.push(`${key}=${displayVal}`);
        }
      }
    }
    const filterInfo = filterParts.length ? ` | Lọc: [${filterParts.join(', ')}]` : '';
    const searchInfo = query.search ? ` | Tìm kiếm: "${query.search}"` : '';

    const suffix = status === 'FAILED' ? ' thất bại' : '';

    await this.logAction(
      req,
      'GET',
      `Truy cập danh sách đợt tiêu hủy hồ sơ tab [${tabName}] - ${roleName}` +
      `, trang: ${query.page || 1}, limit: ${query.limit || 50}` +
      filterInfo +
      searchInfo +
      suffix,
      status
    );
  }
}
