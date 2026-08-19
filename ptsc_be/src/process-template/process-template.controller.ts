import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ProcessTemplateService } from './process-template.service';
import { CreateProcessTemplateDto } from './dto/create-process-template.dto';
import { UpdateProcessTemplateDto } from './dto/update-process-template.dto';
import { ListProcessTemplateDto } from './dto/list-process-template.dto';
import { DeleteManyDto } from './dto/delete-many.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';

@ApiTags('Quản lý Mẫu Quy trình')
@Controller('process-template')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProcessTemplateController {
    constructor(
        private readonly processTemplateService: ProcessTemplateService,
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    @Post()
    @ApiOperation({
      summary: 'Tạo mới mẫu quy trình',
      description: 'Tạo mới một mẫu quy trình với định nghĩa các tác vụ và điều kiện',
    })
    @ApiBody({
      type: CreateProcessTemplateDto,
      description: 'Dữ liệu mẫu quy trình',
    })
    @ApiResponse({
      status: 201,
      description: 'Tạo thành công',
    })
    @ApiResponse({
      status: 400,
      description: 'Dữ liệu không hợp lệ',
    })
    async create(@Body() createDto: CreateProcessTemplateDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.create(createDto, userId),
            'POST', 'Thêm mới quy trình', userId, req
        );
    }

    @Get()
    @ApiOperation({
      summary: 'Lấy danh sách mẫu quy trình',
      description: 'Lấy danh sách tất cả các mẫu quy trình với hỗ trợ phân trang, tìm kiếm và sắp xếp',
    })
    @ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      description: 'Số trang',
    })
    @ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: 'Số bản ghi trên một trang',
    })
    @ApiResponse({
      status: 200,
      description: 'Lấy danh sách thành công',
    })
    async findAll(@Query() query: ListProcessTemplateDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.findAll(query),
            'GET', 'Lấy danh sách quy trình', userId, req, false
        );
    }
    @Get('no-filter')
    @ApiOperation({
      summary: 'Lấy danh sách mẫu quy trình không lọc',
      description: 'Lấy danh sách tất cả mẫu quy trình mà không có bẹ lọc quyền',
    })
    @ApiResponse({
      status: 200,
      description: 'Lấy danh sách thành công',
    })
    async findAllNoFilter(@Query() query: ListProcessTemplateDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.findAllNoFilter(query),
            'GET', 'Lấy danh sách quy trình', userId, req, false
        );
    }

    @Get(':id')
    @ApiOperation({
      summary: 'Lấy chi tiết mẫu quy trình',
      description: 'Lấy thông tin chi tiết của một mẫu quy trình theo ID',
    })
    @ApiParam({
      name: 'id',
      type: String,
      description: 'ID của mẫu quy trình',
    })
    @ApiResponse({
      status: 200,
      description: 'Lấy chi tiết thành công',
    })
    @ApiResponse({
      status: 404,
      description: 'Không tìm thấy mẫu quy trình',
    })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.findOne(id),
            'GET', `Lấy chi tiết quy trình ID ${id}`, userId, req, false
        );
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateProcessTemplateDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.update(id, updateDto, userId),
            'PATCH', `Cập nhật quy trình ID ${id}`, userId, req
        );
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.remove(id, userId),
            'DELETE', `Xóa quy trình ID ${id}`, userId, req
        );
    }

    @Delete()
    async deleteMany(@Body() dto: DeleteManyDto, @Req() req: any) {
        const userId = req?.user?.userId || "";
        return this.executeAndLog(
            () => this.processTemplateService.removeMany(dto.ids, userId),
            'DELETE', `Xóa nhiều quy trình`, userId, req
        );
    }

    /**
     * Helper xử lý thực thi và ghi log tự động
     */
    private async executeAndLog(action: () => Promise<any>, method: string, details: string, userId: string, req: any, rethrow = true) {
        try {
            const result = await action();
            await this.log(method, details, 'SUCCESS', userId, req);
            return result;
        } catch (error) {
            await this.log(method, `${details} THẤT BẠI: ${error.message}`, 'ERROR', userId, req);
            if (rethrow) throw error;
            return { error: error.message }; // For non-throwing methods if any
        }
    }

    private async log(method: string, details: string, status: string, userId: string, req: any) {
        try {
            await this.systemLogService.createLogFromSystem({
                action: method,
                details: `Quy trình mẫu: ${details}`,
                method: method,
                status: status,
                type: 'PROCESS_TEMPLATE',
                subType: 'PROCESS_TEMPLATE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi khi ghi log hệ thống:', error);
        }
    }
}
