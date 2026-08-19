import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AuthorityGuard } from 'src/authority-documents';
import { BookDocumentGuard } from './guards/book-document-guard';
import { RequireBookDocumentPermission } from './decorators/book-document-permission.decorator';
import { DocumentNumberReservationService } from './document-number-reservation.service';
import {
  CreateReservationDto,
  UpdateReservationDto,
  FilterReservationDto,
} from './dto/document-number-reservation.dto';

@ApiTags('DocumentNumberReservations')
@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('document-number-reservations')
export class DocumentNumberReservationController {
  constructor(
    private readonly reservationService: DocumentNumberReservationService,
  ) {}

  @Post()
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Tạo đơn giữ số văn bản mới' })
  @ApiResponse({ status: 201, description: 'Giữ số thành công' })
  @ApiResponse({
    status: 409,
    description: 'Số văn bản đã được giữ hoặc đã sử dụng',
  })
  async create(
    @Body() createDto: CreateReservationDto,
    @Req() req: { user?: { userId?: string; id?: string } },
  ) {
    const currentUserId = req.user?.userId || req.user?.id;
    return this.reservationService.createReservation(createDto, currentUserId);
  }

  @Get()
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({
    summary: 'Lấy danh sách số đã giữ (Hỗ trợ lọc theo sổ, phân trang)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách giữ số thành công' })
  async findAll(@Query() filterDto: FilterReservationDto) {
    return this.reservationService.findAllReservations(filterDto);
  }

  @Patch(':id')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({
    summary: 'Cập nhật thông tin đơn giữ số (Ghi chú / Danh sách user giữ)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật đơn giữ số thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn giữ số' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateReservationDto,
  ) {
    return this.reservationService.updateReservation(id, updateDto);
  }

  @Patch(':id/use')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Đánh dấu số giữ đã được sử dụng' })
  @ApiResponse({ status: 200, description: 'Đánh dấu sử dụng thành công' })
  @ApiResponse({ status: 400, description: 'Số giữ đã được đánh dấu sử dụng trước đó' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn giữ số' })
  async markAsUsed(@Param('id') id: string) {
    return this.reservationService.markAsUsed(id);
  }
}
