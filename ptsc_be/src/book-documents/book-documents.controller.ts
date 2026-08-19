import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AuthorityGuard } from 'src/authority-documents';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { BookDocumentsService } from './book-documents.service';
import {
  CreateBookDocumentDto,
  ListBookDocumentsDto,
  UpdateBookDocumentDto,
  DeleteBookDocumentsDto,
} from './dto/book-documents.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { Response } from 'express';
import { ReturnError } from 'src/utils/util';
import { BookDocumentGuard } from './guards/book-document-guard';
import { RequireBookDocumentPermission } from './decorators/book-document-permission.decorator';


@ApiTags('BookDocuments')
@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('book-documents')
export class BookDocumentsController {
  constructor(private readonly bookDocumentsService: BookDocumentsService,
    private readonly userLogHelper: UserLogHelper,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @Post()
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Tạo một sổ văn bản mới' })
  @ApiResponse({ status: 201, description: 'Tạo sổ văn bản thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền tạo sổ văn bản' })
  async create(@Body() createBookDocumentDto: CreateBookDocumentDto, @Req() req: any) {
    const userId = req.user?.userId;

    try {
      const result = await this.bookDocumentsService.create(
        createBookDocumentDto,
        userId,
      );

      return { success: true, data: result };
    } catch (error) {
      throw error;
    }
  }

  @Get('listv2')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Liệt kê danh sách sổ văn bản bằng bộ lọc' })
  @ApiQuery({ type: ListBookDocumentsDto, style: 'deepObject', explode: true })
  async findAllV2(@Query() query: ListBookDocumentsDto, @Req() req: any) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Liệt kê danh sách sổ văn bản (v2)`, req);
    } catch (logError) {
      console.error('Logging failed for findAllV2 book document:', logError);
    }
    return this.bookDocumentsService.findAllV2(query, req.user?.userId);
  }
  @Get('list')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiQuery({ type: ListBookDocumentsDto, style: 'deepObject', explode: true })
  @ApiOperation({ summary: 'Liệt kê danh sách sổ văn bản bằng bộ lọc' })
  async findAll(@Query() query: ListBookDocumentsDto, @Req() req: any) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Truy cập danh sách sổ văn bản`, req);
    } catch (logError) {
      console.error('Logging failed for findAll book document:', logError);
    }
    return this.bookDocumentsService.findAll(query, req.user?.userId);
  }

  @Post('generate-code')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tạo mã sổ văn bản mới cho bookDocumentId' })
  async generateCode(@Body('bookDocumentId') bookDocumentId: string, @Req() req: any) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'POST', `Tạo mã sổ văn bản cho bookDocumentId: ${bookDocumentId}`, req);
    } catch (logError) {
      console.error('Logging failed for generateCode book document:', logError);
    }
    if (!bookDocumentId) {
      return { error: 'bookDocumentId is required' };
    }
    const newCode = await this.bookDocumentsService.generateToBookCode(bookDocumentId);
    return { bookDocumentId, toBookCode: newCode };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một sổ văn bản' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId || req.userId;
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(userId, req);
      await this.logAction(userInfo, 'GET', `Xem chi tiết sổ văn bản ID: ${id}`, req);
    } catch (logError) {
      console.error('Logging failed for findOne book document:', logError);
    }
    return this.bookDocumentsService.findOne(userId, id);
  }

  @Patch(':id')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Cập nhật một sổ văn bản' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateBookDocumentDto: UpdateBookDocumentDto, @Req() req: any) {
    try {
      const result = await this.bookDocumentsService.update(
        id,
        updateBookDocumentDto,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  @Delete('')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Xóa nhiều sổ văn bản' })
  async removeMany(
    @Body() deleteBookDocumentsDto: DeleteBookDocumentsDto,
    @Req() req: any,
  ) {
    // Ép tất cả về number[]
    const ids: number[] = (deleteBookDocumentsDto.ids || []).map(id =>
      typeof id === 'string' ? Number(id) : id,
    );

    // Optional: lọc ID không hợp lệ
    const validIds = ids.filter(id => !isNaN(id));

    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(
        req.user?.userId,
        req,
      );
      await this.logAction(
        userInfo,
        'DELETE',
        `Xóa nhiều sổ văn bản với IDs: ${validIds.join(', ')}`,
        req,
      );
    } catch (logError) {
      console.error('Logging failed for removeMany book document:', logError);
    }

    return this.bookDocumentsService.removeMany(validIds);
  }


  // @Delete(':id') // Giữ lại endpoint xóa một để tương thích ngược
  // @ApiOperation({ summary: 'Xóa một sổ văn bản' })
  // async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
  //   const userId = req.user?.userId || req.userId;
  //   try {
  //     const userInfo = await this.userLogHelper.getUserLogInfo(userId, req);
  //     await this.logAction(userInfo, 'DELETE', `Xóa sổ văn bản ID: ${id}`);
  //   } catch (logError) {
  //     console.error('Logging failed for remove book document:', logError);
  //   }
  //   return this.bookDocumentsService.remove(userId, id);
  // }

  @Get(':id/incomming-documents')
  @ApiOperation({ summary: 'Lấy danh sách văn bản đến thuộc về một sổ' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  async findIncommingDocuments(
    @Param('id') id: string,
    @Query() query: Record<string, any>, // tất cả query param gửi lên
    @Req() req: any,
  ) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Lấy văn bản đến thuộc sổ ID: ${id}`, req);
    } catch (logError) {
      console.error('Logging failed for findIncommingDocuments:', logError);
    }
    const { page, limit, sort, ...filters } = query;
    const userId = req.user?.userId || req.user?.id || req.userId;
    return this.bookDocumentsService.findIncommingDocuments(
      id,
      page,
      limit,
      filters,  // tất cả field còn lại là filter
      sort || 'created_at DESC',
      userId,
    );
  }

  @Get(':id/incomming-documents/export')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Xuất excel danh sách văn bản đến thuộc về một sổ' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], description: 'Loại file xuất ra' })
  async exportIncommingDocuments(
    @Param('id') id: string,
    @Query() query: Record<string, any>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Xuất excel văn bản đến thuộc sổ ID: ${id}`, req);
      const { buffer, filename, contentType } = await this.bookDocumentsService.exportIncommingDocuments(id, query, req.user?.userId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':id/outgoing_documents')
  @ApiOperation({ summary: 'Lấy danh sách văn bản đi thuộc về một sổ' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findOutgoingDocuments(
    @Param('id') id: string,
    @Query() query: Record<string, any>,
    @Req() req?: any,
  ) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Lấy văn bản đi thuộc sổ ID: ${id}`, req);
    } catch (logError) {
      console.error('Logging failed for findOutgoingDocuments:', logError);
    }
    const { page, limit, sort, ...filters } = query;
    const userId = req.user?.userId || req.user?.id || req.userId;
    return this.bookDocumentsService.findOutgoingDocuments(id, page, limit, filters, sort, userId);
  }

  @Get(':id/outgoing_documents/export')
  @UseGuards(BookDocumentGuard)
  @RequireBookDocumentPermission()
  @ApiOperation({ summary: 'Xuất excel danh sách văn bản đi thuộc về một sổ' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, type: String })
  @ApiQuery({ name: 'exportType', required: false, enum: ['excel', 'pdf'], description: 'Loại file xuất ra' })
  async exportOutgoingDocuments(
    @Param('id') id: string,
    @Query() query: Record<string, any>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userInfo = await this.userLogHelper.getUserLogInfo(req.user?.userId, req);
      await this.logAction(userInfo, 'GET', `Xuất excel văn bản đi thuộc sổ ID: ${id}`, req);
      const { buffer, filename, contentType } = await this.bookDocumentsService.exportOutgoingDocuments(id, query, req.user?.userId);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  private async logAction(userInfo: any, action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', details: string, req: any) {
    try {
      const a = await this.systemLogService.createLogFromSystem({
        action,
        details,
        method: action,
        status: 'SUCCESS',
        type: 'DHVBTC',
        subType: 'DHVBTC',
        userInfo: req.user?.userId, // Chuyển userInfo thành chuỗi JSON
        timestamp: new Date().toISOString(),
        ipAddress: req.socket.remoteAddress,
      });
      // console .log('aaaa', JSON.stringify(a, null, 2))
    } catch (error) {
      console.error(`Failed to log action: ${details}`, error);
    }
  }
}
