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
} from '@nestjs/common';
import { Response } from 'express';
import { ArchivesManagementService } from './archives-management.service';
import { CreateArchivesDto, CreateDocumentIndexDto } from './dto/create-archives.dto';
import { UpdateArchivesDto, UpdateDocumentIndexDto } from './dto/update-archives.dto';
import { ListArchivesDto } from './dto/list-archives.dto';
import { DeleteManyArchivesDto } from './dto/delete-archives.dto';
import { ParseIntVnPipe } from '../common-source/pipes/parse-int-vn.pipe';
import { ReturnError } from '../utils/util';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { formatErrors } from '../formatError';

@ApiTags('Archives Management')
@Controller('archives')
export class ArchivesManagementController {
  constructor(private readonly archivesService: ArchivesManagementService) {}

  // ===== API Lấy danh sách hồ sơ nguồn cho SELECT =====
  
  @Get('source-storages')
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ nguồn cho SELECT (Tiêu đề hồ sơ)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async getSourceStorages(@Res() res: Response) {
    try {
      const result = await this.archivesService.getSourceStorages();
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Get('source-storages/:id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ nguồn theo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID hồ sơ nguồn' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ nguồn.' })
  async getSourceStorageById(@Param('id', new ParseIntVnPipe('ID hồ sơ nguồn')) id: number, @Res() res: Response) {
    try {
      const result = await this.archivesService.getSourceStorageById(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  // ===== API Draft =====

  @Post('draft')
  @ApiOperation({ summary: 'Tạo bản nháp hồ sơ - tự sinh archivesNumber' })
  @ApiResponse({ status: 201, description: 'Tạo bản nháp thành công.' })
  @ApiResponse({ status: 400, description: 'Có lỗi xảy ra.' })
  async createDraft(@Req() req: any, @Res() res: Response) {
    try {
      const userId = req?.user?.userId || undefined;
      const result = await this.archivesService.createDraft(userId);
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Delete('draft/:id')
  @ApiOperation({ summary: 'Xóa bản nháp hồ sơ (khi user thoát không lưu)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID bản nháp' })
  @ApiResponse({ status: 200, description: 'Xóa bản nháp thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bản nháp.' })
  async deleteDraft(@Param('id', new ParseIntVnPipe('ID bản nháp')) id: number, @Res() res: Response) {
    try {
      const result = await this.archivesService.deleteDraft(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  // ===== API CRUD =====
  @Post()
  @ApiOperation({ summary: 'Tạo mới hồ sơ + danh mục tài liệu (1 request)' })
  @ApiBody({ type: CreateArchivesDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async create(@Body() createDto: CreateArchivesDto, @Req() req: any, @Res() res: Response) {
    try {
      const userId = req?.user?.userId || undefined;
      const result = await this.archivesService.create(createDto, userId);
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ với phân trang và filter' })
  @ApiQuery({ type: ListArchivesDto })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  async findAll(@Query() query: ListArchivesDto, @Res() res: Response) {
    try {
      const result = await this.archivesService.findAll(query);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ theo ID (kèm danh mục tài liệu)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID hồ sơ' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async findOne(@Param('id', new ParseIntVnPipe('ID hồ sơ')) id: number, @Res() res: Response) {
    try {
      const result = await this.archivesService.findOne(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ + danh mục tài liệu' })
  @ApiParam({ name: 'id', type: Number, description: 'ID hồ sơ' })
  @ApiBody({ type: UpdateArchivesDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async update(
    @Param('id', new ParseIntVnPipe('ID hồ sơ')) id: number,
    @Body() updateDto: UpdateArchivesDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId || undefined;
      const result = await this.archivesService.update(id, updateDto, userId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều hồ sơ (soft delete)' })
  @ApiBody({ type: DeleteManyArchivesDto })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async deleteMany(@Body() dto: DeleteManyArchivesDto, @Res() res: Response) {
    try {
      const result = await this.archivesService.deleteMany(dto.ids);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  // ===== API XÓA VĨNH VIỄN (HARD DELETE) - Đặt trước :id =====

  @Delete('permanent')
  @ApiOperation({ summary: 'Xóa vĩnh viễn nhiều hồ sơ (hard delete - xóa hẳn khỏi DB)' })
  @ApiBody({ type: DeleteManyArchivesDto })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async hardDeleteMany(@Body() dto: DeleteManyArchivesDto, @Res() res: Response) {
    try {
      const result = await this.archivesService.hardDeleteMany(dto.ids);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Delete('permanent/:id')
  @ApiOperation({ summary: 'Xóa vĩnh viễn hồ sơ (hard delete - xóa hẳn khỏi DB)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID hồ sơ' })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async hardDelete(@Param('id', new ParseIntVnPipe('ID hồ sơ')) id: number, @Res() res: Response) {
    try {
      const result = await this.archivesService.hardDelete(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hồ sơ (soft delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID hồ sơ' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async delete(@Param('id', new ParseIntVnPipe('ID hồ sơ')) id: number, @Res() res: Response) {
    try {
      const result = await this.archivesService.delete(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  // ===== API QUẢN LÝ DANH MỤC TÀI LIỆU RIÊNG =====

  @Post(':archivesId/documents')
  @ApiOperation({ summary: 'Thêm danh mục tài liệu vào hồ sơ' })
  @ApiParam({ name: 'archivesId', type: Number, description: 'ID hồ sơ' })
  @ApiBody({ type: CreateDocumentIndexDto })
  @ApiResponse({ status: 201, description: 'Thêm thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async addDocumentIndex(
    @Param('archivesId', new ParseIntVnPipe('ID hồ sơ')) archivesId: number,
    @Body() dto: CreateDocumentIndexDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId || undefined;
      const result = await this.archivesService.addDocumentIndex(archivesId, dto, userId);
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Get(':archivesId/documents')
  @ApiOperation({ summary: 'Lấy danh sách danh mục tài liệu của hồ sơ' })
  @ApiParam({ name: 'archivesId', type: Number, description: 'ID hồ sơ' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy hồ sơ.' })
  async getDocumentIndexes(
    @Param('archivesId', new ParseIntVnPipe('ID hồ sơ')) archivesId: number,
    @Res() res: Response,
  ) {
    try {
      const result = await this.archivesService.getDocumentIndexes(archivesId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Put(':archivesId/documents/:docId')
  @ApiOperation({ summary: 'Cập nhật danh mục tài liệu' })
  @ApiParam({ name: 'archivesId', type: Number, description: 'ID hồ sơ' })
  @ApiParam({ name: 'docId', type: Number, description: 'ID danh mục tài liệu' })
  @ApiBody({ type: UpdateDocumentIndexDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục tài liệu.' })
  async updateDocumentIndex(
    @Param('archivesId', new ParseIntVnPipe('ID hồ sơ')) archivesId: number,
    @Param('docId', new ParseIntVnPipe('ID tài liệu')) docId: number,
    @Body() dto: UpdateDocumentIndexDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.archivesService.updateDocumentIndex(archivesId, docId, dto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  @Delete(':archivesId/documents/:docId')
  @ApiOperation({ summary: 'Xóa danh mục tài liệu (soft delete)' })
  @ApiParam({ name: 'archivesId', type: Number, description: 'ID hồ sơ' })
  @ApiParam({ name: 'docId', type: Number, description: 'ID danh mục tài liệu' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy danh mục tài liệu.' })
  async deleteDocumentIndex(
    @Param('archivesId', new ParseIntVnPipe('ID hồ sơ')) archivesId: number,
    @Param('docId', new ParseIntVnPipe('ID tài liệu')) docId: number,
    @Res() res: Response,
  ) {
    try {
      const result = await this.archivesService.deleteDocumentIndex(archivesId, docId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  // ===== Error Handler =====
  private handleError(error: any, res: Response) {
    // Xử lý lỗi validation từ class-validator
    if (error.response && Array.isArray(error.response.message)) {
      const formattedErrors = formatErrors(error.response.message);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: formattedErrors,
      });
    }

    // Xử lý lỗi từ service (BadRequestException, NotFoundException)
    if (error.response) {
      if (error.response.errors && Array.isArray(error.response.errors)) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      if (error.response.message) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.response.message,
          errors: [{ field: 'general', message: error.response.message }],
        });
      }
    }

    // Lỗi không xác định
    console.error('Unexpected error:', error);
    const errorResponse = ReturnError(error);
    return res.status(errorResponse.status).json({
      success: false,
      message: 'Có lỗi xảy ra',
      errors: [{ field: 'general', message: error.message || 'Có lỗi xảy ra' }],
    });
  }
}
