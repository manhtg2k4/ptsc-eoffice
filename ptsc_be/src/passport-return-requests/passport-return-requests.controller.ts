import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PassportReturnRequestsService } from './passport-return-requests.service';
import { CreatePassportReturnRequestDto } from './dto/create-passport-return-request.dto';
import { UpdatePassportReturnRequestDto } from './dto/update-passport-return-request.dto';
import { CreateReturnVoucherDto, SignVoucherDto, OwnerSignDto, OwnerRejectDto } from './dto/sign-return-request.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

import { PassportReturnRequestStatus } from './entities/passport-return-request.entity';

@ApiTags('Passport Return Requests (Phiếu trả hộ chiếu)')
@ApiBearerAuth()
@Controller('passport-return-requests')
export class PassportReturnRequestsController {
    constructor(
        private readonly service: PassportReturnRequestsService,
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Bước 1: Tạo phiếu trả hộ chiếu (QLHC) - Trạng thái DRAFT (Lưu nháp)' })
    async create(@Body() dto: CreatePassportReturnRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        const ipAddress = req?.socket?.remoteAddress || 'Unknown';
        return this.service.create(dto, userId, ipAddress);
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách tất cả phiếu trả hộ chiếu (Tối ưu đếm chuỗi "3/10")' })
    async findAll(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.username;
        return this.service.findAll(query, userId);
    }

    @Get('draft')
    @ApiOperation({ summary: '1. API Danh sách phiếu trả hộ chiếu - Trạng thái LƯU NHÁP (DRAFT)' })
    async findDrafts(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.username;
        const eofficeAccount = query?.eofficeAccount === 'all' ? undefined : (query?.eofficeAccount || userId);
        return this.service.findAll({ ...query, eofficeAccount, processStatus: PassportReturnRequestStatus.DRAFT }, userId);
    }

    @Get('waiting-sign')
    @ApiOperation({ summary: '2. API Danh sách phiếu trả hộ chiếu - Trạng thái CHỜ KÝ NHẬN (WAITING_SIGN)' })
    async findWaitingSign(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.username;
        const eofficeAccount = query?.eofficeAccount === 'all' ? undefined : (query?.eofficeAccount || userId);
        return this.service.findAll({ ...query, eofficeAccount, processStatus: PassportReturnRequestStatus.WAITING_SIGN }, userId);
    }

    @Get('rejected')
    @ApiOperation({ summary: '3. API Danh sách phiếu trả hộ chiếu - Trạng thái TRẢ LẠI (REJECTED)' })
    async findRejected(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.username;
        const eofficeAccount = query?.eofficeAccount === 'all' ? undefined : (query?.eofficeAccount || userId);
        return this.service.findAll({ ...query, eofficeAccount, processStatus: PassportReturnRequestStatus.REJECTED }, userId);
    }

    @Get('completed')
    @ApiOperation({ summary: '4. API Danh sách phiếu trả hộ chiếu - Trạng thái HOÀN THÀNH / ĐÃ TRẢ (RETURNED)' })
    async findCompleted(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.username;
        const eofficeAccount = query?.eofficeAccount === 'all' ? undefined : (query?.eofficeAccount || userId);
        return this.service.findAll({ ...query, eofficeAccount, processStatus: PassportReturnRequestStatus.RETURNED }, userId);
    }

    @Get(':id/items')
    @ApiOperation({ summary: 'Lấy riêng danh sách các hộ chiếu của phiếu trả hộ chiếu' })
    async getReturnRequestItems(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id;
        return this.service.getReturnRequestItems(id, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Xem chi tiết phiếu trả hộ chiếu (Bao gồm WorkItems & Audit Logs)' })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id;
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập chi tiết phiếu trả hộ chiếu: ${id}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'GET_DETAIL',
                userInfo: userId || 'Unknown',
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.findOne(id, userId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Bước 5: QLHC Chỉnh sửa phiếu trả hộ chiếu' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdatePassportReturnRequestDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PUT',
                details: `Chỉnh sửa phiếu trả hộ chiếu: ${id}`,
                method: 'PUT',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'UPDATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.update(id, dto, userId);
    }

    @Post(':id/create-voucher')
    @ApiOperation({ summary: 'Bước 2 (Gộp): QLHC Lập & Ký biên bản trả hộ chiếu -> Chuyển đến Chủ hộ chiếu (WAITING_SIGN)' })
    @ApiBody({ type: CreateReturnVoucherDto })
    async createVoucher(
        @Param('id') id: string,
        @Body() payload: CreateReturnVoucherDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `QLHC Tạo và Ký biên bản trả hộ chiếu: ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'CREATE_VOUCHER',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.createVoucher(id, userId, payload);
    }

    @Post(':id/sign-voucher')
    @ApiOperation({ summary: 'Bước 2 (Gộp): QLHC Lập & Ký biên bản trả hộ chiếu -> Chuyển đến Chủ hộ chiếu (WAITING_SIGN)' })
    @ApiBody({ type: SignVoucherDto })
    async signVoucherAndSend(
        @Param('id') id: string,
        @Body() payload: SignVoucherDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `QLHC Ký biên bản trả hộ chiếu và chuyển phiếu: ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'SIGN_VOUCHER',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.signVoucherAndSend(id, userId, payload);
    }

    @Post(':id/receive')
    @ApiOperation({ summary: 'Bước 3: Chủ hộ chiếu Tiếp nhận phiếu trả hộ chiếu (TIEP_NHAN)' })
    async receiveRequest(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Chủ hộ chiếu Tiếp nhận phiếu trả hộ chiếu: ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'RECEIVE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.receiveRequest(id, userId);
    }

    @Post(':id/owner-sign')
    @ApiOperation({ summary: 'Bước 4: Chủ hộ chiếu Ký nhận hộ chiếu -> RETURNED (Đã trả / Hoàn tất)' })
    @ApiBody({ type: OwnerSignDto })
    async ownerReceiveAndSign(
        @Param('id') id: string,
        @Body() payload: OwnerSignDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Chủ hộ chiếu Ký nhận hộ chiếu: ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'OWNER_SIGN',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.ownerReceiveAndSign(id, userId, payload);
    }

    @Post(':id/owner-reject')
    @ApiOperation({ summary: 'Chủ hộ chiếu Trả lại phiếu do thông tin chưa chính xác -> REJECTED (Trả lại)' })
    @ApiBody({ type: OwnerRejectDto })
    async ownerRejectRequest(
        @Param('id') id: string,
        @Body() payload: OwnerRejectDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        const reason = payload?.reason || 'Thông tin hộ chiếu chưa chính xác';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Chủ hộ chiếu Trả lại phiếu ${id}. Lý do: ${reason}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'OWNER_REJECT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.ownerRejectRequest(id, userId, reason);
    }

    @Post(':id/cancel')
    @ApiOperation({ summary: 'Hủy phiếu trả hộ chiếu (Xóa mềm status = 3)' })
    async cancel(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Hủy phiếu trả hộ chiếu: ${id}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'CANCEL',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.cancel(id, userId);
    }

    @Delete()
    @ApiOperation({ summary: 'Xóa mềm 1 hoặc nhiều phiếu trả hộ chiếu' })
    async softDelete(
        @Body() body: { ids: string[] },
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || req?.user?.id || 'SYSTEM';
        const ids = Array.isArray(body?.ids) ? body.ids : (body?.ids ? [body.ids] : []);
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa mềm phiếu trả hộ chiếu: ${ids.join(', ')}`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: 'PASSPORT_RETURN_REQUESTS',
                subType: 'SOFT_DELETE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.softDelete(ids, userId);
    }
}
