import { Controller, Post, Get, Body, Query, Param, Req, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { PassportVouchersService } from './passport-vouchers.service';
import { CreatePassportVoucherDto } from './dto/create-passport-voucher.dto';

@ApiTags('Biên bản Hộ chiếu')
@Controller('passport-vouchers')
export class PassportVouchersController {
    constructor(private readonly vouchersService: PassportVouchersService) { }

    @Post()
    @ApiOperation({ 
      summary: 'Tạo biên bản bàn giao/hoàn trả hộ chiếu',
      description: 'Tạo mới một biên bản bàn giao hoặc hoàn trả hộ chiếu'
    })
    @ApiBody({
      type: CreatePassportVoucherDto,
      description: 'Dữ liệu biên bản',
    })
    @ApiResponse({
      status: 201,
      description: 'Tạo thành công',
    })
    async create(@Body() createDto: CreatePassportVoucherDto, @Req() req: any) {
        const userId = req.user?.userId || 'admin'; // Fallback nếu không qua guard
        return this.vouchersService.create(createDto, userId);
    }

    @Get()
    @ApiOperation({ 
      summary: 'Lấy danh sách biên bản',
      description: 'Lấy danh sách tất cả các biên bản bàn giao/hoàn trả'
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
    async findAll(@Query() query: any) {
        return this.vouchersService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ 
      summary: 'Xem chi tiết biên bản',
      description: 'Lấy thông tin chi tiết của một biên bản theo ID'
    })
    @ApiParam({
      name: 'id',
      type: String,
      description: 'ID của biên bản',
    })
    @ApiResponse({
      status: 200,
      description: 'Lấy chi tiết thành công',
    })
    @ApiResponse({
      status: 404,
      description: 'Không tìm thấy biên bản',
    })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const userId = req.user?.userId || 'admin';
        return this.vouchersService.findOne(id, userId);
    }

    @Patch(':id/sign')
    @ApiOperation({ 
      summary: 'Bên nhận ký xác nhận biên bản',
      description: 'Bên nhận thực hiện ký xác nhận nhận hộ chiếu'
    })
    @ApiParam({
      name: 'id',
      type: String,
      description: 'ID của biên bản',
    })
    @ApiResponse({
      status: 200,
      description: 'Ký thành công',
    })
    @ApiResponse({
      status: 400,
      description: 'Dữ liệu k hông hợp lệ',
    })
    async sign(
        @Param('id') id: string,
        @Req() req: any
    ) {
        const userId = req.user?.userId || 'admin';
        return this.vouchersService.signVoucher(id, userId);
    }

    @Patch(':id/reject')
    @ApiOperation({
      summary: 'Bên nhận từ chối biên bản',
      description: 'Bên nhận từ chối ký xác nhận biên bản bàn giao hoặc hoàn trả hộ chiếu'
    })
    @ApiParam({
      name: 'id',
      type: String,
      description: 'ID của biên bản',
    })
    @ApiResponse({
      status: 200,
      description: 'Từ chối biên bản thành công',
    })
    @ApiResponse({
      status: 400,
      description: 'Dữ liệu không hợp lệ hoặc không đúng trạng thái',
    })
    async reject(
        @Param('id') id: string,
        @Body('rejectReason') rejectReason: string,
        @Req() req: any
    ) {
        const userId = req.user?.userId || 'admin';
        return this.vouchersService.rejectVoucher(id, userId, rejectReason);
    }
}
