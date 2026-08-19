import { Controller, Get, Query, UseGuards, InternalServerErrorException, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PassportStatisticsService } from './passport-statistics.service';
import {
    PassportManagedQueryDto,
    PassportHistoryQueryDto,
    PassportDeptStatsQueryDto,
    BusinessTripQueryDto
} from './dtos/passport-statistics.dto';
import { JwtAuthGuard } from '../oauth/jwt.guard';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';

@ApiTags('Passport Statistics - Báo cáo Hộ chiếu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('passport-statistics')
export class PassportStatisticsController {
    constructor(
        private readonly statisticsService: PassportStatisticsService,
        private readonly systemLogService: SystemLogServiceSql,
    ) {}

    @Get('managed')
    @ApiOperation({ summary: 'Báo cáo 9.1: Danh sách hộ chiếu đang quản lý' })
    async getManagedPassports(@Query() query: PassportManagedQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getManagedPassports(query, userId, ipAddress);
            
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Xem danh sách hộ chiếu đang quản lý',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_MANAGED_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem báo cáo hộ chiếu: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_MANAGED_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    @Get('history')
    @ApiOperation({ summary: 'Báo cáo 9.2: Lịch sử mượn trả hộ chiếu' })
    async getBorrowHistory(@Query() query: PassportHistoryQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getBorrowHistory(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Xem lịch sử mượn trả hộ chiếu',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_HISTORY_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem lịch sử mượn trả: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_HISTORY_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    @Get('dept-stats')
    @ApiOperation({ summary: 'Báo cáo 9.3: Thống kê hộ chiếu theo phòng ban' })
    async getDeptStats(@Query() query: PassportDeptStatsQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getDeptStats(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Xem thống kê hộ chiếu theo phòng ban',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_DEPT_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem thống kê phòng ban: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_DEPT_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    @Get('business-trips')
    @ApiOperation({ summary: 'Báo cáo 9.4: Thống kê chuyến công tác nước ngoài' })
    async getBusinessTrips(@Query() query: BusinessTripQueryDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        try {
            const result = await this.statisticsService.getBusinessTrips(query, userId, ipAddress);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Xem thống kê chuyến công tác nước ngoài',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_TRIPS_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lỗi khi xem thống kê chuyến công tác: ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_TRIPS_CONTROLLER',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
}
