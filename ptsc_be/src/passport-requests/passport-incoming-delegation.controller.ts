import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Res, StreamableFile } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { PassportIncomingDelegationService } from "./passport-incoming-delegation.service";
import { PassportIncomingDelegationsEntity } from "./entities/passport-incoming-delegations.entity";
import { CreateIncomingDelegationDto } from "./dto/create-incoming-delegation.dto";
import { SystemLogServiceSql } from "src/systemLogManagement/system-log-service-sql";
import { UpdateIncomingDelegationDto } from "./dto/update-incoming-delegation.dto";

@ApiBearerAuth()
@Controller('passport-incoming-delegations')
export class PassportIncomingDelegationController {
	constructor(
		private readonly passportIncomingDelegationService: PassportIncomingDelegationService,
		private readonly systemLogService: SystemLogServiceSql,
	) { }

	@Get()
	async findAll(@Query() query: any, @Req() req): Promise<{ data: PassportIncomingDelegationsEntity[] | null, total: number, page: number, limit: number, totalPages: number, success: boolean, message: string }> {
		const userId = req?.user?.userId || '';
		try {
			await this.systemLogService.createLogFromSystem({
				action: 'GET',
				details: `Lấy danh sách đoàn vào thành công`,
				method: 'GET',
				status: 'SUCCESS',
				type: 'PASSPORT_REQUESTS',
				subType: 'PASSPORT_REQUESTS',
				userInfo: userId,
				ipAddress: req?.socket?.remoteAddress || 'Unknown',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Lỗi ghi log:', error);
		}
		return this.passportIncomingDelegationService.findAll(query);
	}

	@Get(':id')
	async findOne(@Param('id') id: string, @Req() req): Promise<{ data: PassportIncomingDelegationsEntity | null, message: string }> {
		const userId = req?.user?.userId || '';
		try {
			await this.systemLogService.createLogFromSystem({
				action: 'GET',
				details: `Lấy chi tiết đoàn vào: ${id}`,
				method: 'GET',
				status: 'SUCCESS',
				type: 'PASSPORT_REQUESTS',
				subType: 'PASSPORT_REQUESTS',
				userInfo: userId,
				ipAddress: req?.socket?.remoteAddress || 'Unknown',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Lỗi ghi log:', error);
		}
		return this.passportIncomingDelegationService.findOne(id);
	}

	@Post()
	async create(@Body() createDto: CreateIncomingDelegationDto, @Req() req): Promise<{ data: PassportIncomingDelegationsEntity | null, message: string }> {
		const userId = req?.user?.userId || '';
		try {
			await this.systemLogService.createLogFromSystem({
				action: 'POST',
				details: `Tạo đoàn vào thành công`,
				method: 'POST',
				status: 'SUCCESS',
				type: 'PASSPORT_REQUESTS',
				subType: 'PASSPORT_REQUESTS',
				userInfo: userId,
				ipAddress: req?.socket?.remoteAddress || 'Unknown',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Lỗi ghi log:', error);
		}
		return this.passportIncomingDelegationService.create(createDto);
	}

	@Put(':id')
	async update(@Param('id') id: string, @Body() updateDto: UpdateIncomingDelegationDto, @Req() req): Promise<{ data: PassportIncomingDelegationsEntity | null, message: string }> {
		const userId = req?.user?.userId || '';
		try {
			await this.systemLogService.createLogFromSystem({
				action: 'PUT',
				details: `Cập nhật đoàn vào thành công`,
				method: 'PUT',
				status: 'SUCCESS',
				type: 'PASSPORT_REQUESTS',
				subType: 'PASSPORT_REQUESTS',
				userInfo: userId,
				ipAddress: req?.socket?.remoteAddress || 'Unknown',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Lỗi ghi log:', error);
		}
		return this.passportIncomingDelegationService.update(id, updateDto);
	}

	@Delete('delete-many')
	async deleteMany(@Body('ids') ids: string[], @Req() req): Promise<{ success: boolean, message: string }> {
		const userId = req?.user?.userId || '';
		try {
			await this.systemLogService.createLogFromSystem({
				action: 'DELETE',
				details: `Xóa hàng loạt đoàn vào: ${ids.join(', ')}`,
				method: 'DELETE',
				status: 'SUCCESS',
				type: 'PASSPORT_REQUESTS',
				subType: 'PASSPORT_REQUESTS',
				userInfo: userId,
				ipAddress: req?.socket?.remoteAddress || 'Unknown',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error('Lỗi ghi log:', error);
		}
		return this.passportIncomingDelegationService.softDeleteMany(ids);
	}
}