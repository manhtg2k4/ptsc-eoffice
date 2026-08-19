import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/oauth/decorator/public.decorator';
import { PortalSearchService } from './portal-search.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

@ApiTags('Tìm kiếm Cổng thông tin')
@Controller('portal-search')
export class PortalSearchController {
    constructor(
        private readonly portalSearchService: PortalSearchService,
        private readonly systemLogService: SystemLogServiceSql
    ) { }

    // @Public()
    @Get()
    @ApiOperation({ summary: 'Tìm kiếm tổng hợp Tin tức, Hình ảnh, Video và Chủ đề' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'q', required: false, type: String, description: 'Từ khóa tìm kiếm chung' })
    @ApiQuery({ name: 'filter[title]', required: false, type: String, description: 'Tìm kiếm theo tiêu đề' })
    @ApiQuery({ name: 'filter[tags]', required: false, type: String, description: 'Tìm kiếm theo tags' })
    @ApiQuery({ name: 'filter[content]', required: false, type: String, description: 'Tìm kiếm theo nội dung' })
    @ApiQuery({ name: 'filter[news]', required: false, type: String, description: 'Lọc lấy tin tức (true/false)' })
    @ApiQuery({ name: 'filter[video]', required: false, type: String, description: 'Lọc lấy video (true/false)' })
    @ApiQuery({ name: 'filter[album]', required: false, type: String, description: 'Lọc lấy album ảnh (true/false)' })
    async search(
        @Query() query: any,
        @Req() req: any
    ) {
        const userId = req?.user?.userId || req?.user?.id || req?.user?.sub || "";
        try {
            const result = await this.portalSearchService.search(query);

            if (userId && query.q) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Tìm kiếm tổng hợp: từ khóa "${query.q}", trang: ${query.page || 1}`,
                    method: 'GET',
                    status: 'SUCCESS',
                    type: 'SEARCH',
                    subType: 'PORTAL_SEARCH',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            return result;
        } catch (error) {
            if (userId && query.q) {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Lỗi Tìm kiếm tổng hợp: từ khóa "${query.q}" - ${error.message}`,
                    method: 'GET',
                    status: 'ERROR',
                    type: 'SEARCH',
                    subType: 'PORTAL_SEARCH',
                    userInfo: userId,
                    ipAddress: req?.socket?.remoteAddress || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            }
            throw error;
        }
    }
}
