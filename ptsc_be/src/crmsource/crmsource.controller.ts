// src/crm-sources/crm-sources.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { CrmSourcesService } from './crmsource.service';
import { CreateCrmsourceDto } from './dto/create-crmsource.dto';
import { UpdateCrmsourceDto } from './dto/update-crmsource.dto';
import { ApiExcludeEndpoint, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCrmSourceDataDto } from './dto/create-crmsource-data.dto';
import { UpdateCrmSourceDataDto } from './dto/update-crmsource-data.dto';
import { DeleteCrmSourceDataDto } from './dto/delete-crmsource-data.dto';

@ApiTags('Quản lý Nguồn CRM')
@Controller('crm-sources')
export class CrmSourcesController {
  private readonly logger = new Logger(CrmSourcesController.name);

  constructor(private readonly crmSourcesService: CrmSourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Tạo nguồn CRM (bao gồm data items)' })
  async create(@Body() createDto: CreateCrmsourceDto) {
    try {
      const result = await this.crmSourcesService.create(createDto);
      return {
        success: true,
        message: 'Tạo nguồn CRM thành công',
        data: result,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error('POST /crm-sources - Lỗi tạo mới', trace);
      console.error('POST /crm-sources - Lỗi tạo mới', error);
      // Rethrow so Nest exception filters handle response
      throw error;
    }
  }  
  
  @Get('code')
  @ApiOperation({ summary: 'Lấy nguồn CRM theo code' })
  async findByCode(@Query('code') code: string) {
    try {
      const result = await this.crmSourcesService.findByCode(code);
      return {
        success: true,
        message: 'Lấy nguồn CRM thành công',
        data: result.items,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error('POST /crm-sources - Lỗi lấy nguồn CRM', trace);
      console.error('POST /crm-sources - Lỗi lấy nguồn CRM', error);
      throw error;
    }
  }

  @Post('draft')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Tạo một bản nháp CRM Source và trả về ID' })
  async createDraft() {
    try {
      // Giả định service có phương thức createDraft() để tạo một bản ghi trống/nháp
      const result = await this.crmSourcesService.createDraft();
      return {
        success: true,
        message: 'Tạo bản nháp CRM Source thành công.',
        data: result, // Nên trả về toàn bộ object hoặc ít nhất là ID
      };
    } catch (error) {
      const trace =
        error &&
        (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error('POST /crm-sources/draft - Lỗi tạo bản nháp', trace);
      throw error;
    }
  }

  @Get('get-all')
  @ApiExcludeEndpoint()
  async findAll(@Query() queryParams: any) {
    try {
      const { page = 1, limit = 20 } = queryParams;
      const data = await this.crmSourcesService.findAll(queryParams);
      return {
        success: true,
        message: 'Lấy danh sách nguồn CRM thành công',
        data: data.items,
        total: data.total,
        page,
        limit,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error('GET /crm-sources/get-all - Lỗi lấy danh sách', trace);
      // Ném lại lỗi gốc để NestJS Exception Filter xử lý
      // Điều này sẽ trả về mã trạng thái HTTP và thông báo lỗi phù hợp hơn
      throw error;
    }
  }

  @Get('get-all/doc-module')
  @ApiExcludeEndpoint()
  async getDataListByCodeDoc(@Query() queryParams: any) {
    try {
      const { page = 1, limit = 20 } = queryParams;
      const data = await this.crmSourcesService.getAllDataByCodeDoc(queryParams);
      return {
        success: true,
        message: 'Lấy danh sách nguồn CRM thành công',
        data: data.items,
        total: data.total,
        page,
        limit,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error('GET /crm-sources/get-all/doc-module - Lỗi lấy danh sách', trace);
      // Ném lại lỗi gốc để NestJS Exception Filter xử lý
      // Điều này sẽ trả về mã trạng thái HTTP và thông báo lỗi phù hợp hơn
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.crmSourcesService.findOne(id);
      return {
        success: true,
        message: 'Lấy thông tin chi tiết thành công',
        data,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error(`GET /crm-sources/${id} - Lỗi`, trace);
      console.error(`GET /crm-sources/${id} - Lỗi`, error);
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() updateDto: UpdateCrmsourceDto) {
    try {
      const result = await this.crmSourcesService.update(id, updateDto);
      return {
        success: true,
        message: 'Cập nhật nguồn CRM thành công',
        data: result,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error(`PATCH /crm-sources/${id} - Lỗi cập nhật`, trace);
      console.error(`PATCH /crm-sources/${id} - Lỗi cập nhật`, error);
      throw error;
    }
  }

  @Delete('delete-many')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa nhiều nguồn CRM theo danh sách ID (xóa mềm)' })
  async deleteMany(@Body() body: { ids: string[] }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('Mảng ids không được rỗng.');
    }
    try {
      const result = await this.crmSourcesService.softDeleteMany(body.ids);
      return {
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} mục.`,
        data: result,
      };
    } catch (error) {
      const trace =
        error &&
        (error.stack ||
          (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error(`DELETE /crm-sources/delete-many - Lỗi xóa nhiều`, trace);
      console.error(`DELETE /crm-sources/delete-many - Lỗi xóa nhiều`, error);
      throw error;
    }
  }

  @Delete('data')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa một hoặc nhiều mục dữ liệu (danh mục con)' })
  async deleteDataItems(@Body() deleteDto: DeleteCrmSourceDataDto) {
    try {
      const result = await this.crmSourcesService.deleteDataItems(deleteDto.ids);
      return {
        success: true,
        message: `Đã xóa thành công ${result.deletedCount} mục dữ liệu.`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`DELETE /crm-sources/data - Lỗi`, (error as Error).stack);
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    try {
      const result = await this.crmSourcesService.softDelete(id);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error(`DELETE /crm-sources/${id} - Lỗi xóa mềm`, trace);
      console.error(`DELETE /crm-sources/${id} - Lỗi xóa mềm`, error);
      throw error;
    }
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async hardDelete(@Param('id') id: string) {
    try {
      const result = await this.crmSourcesService.hardDelete(id);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      const trace = error && (error.stack || (typeof error === 'object' ? JSON.stringify(error) : String(error)));
      this.logger.error(`DELETE /crm-sources/${id}/hard - Lỗi xóa vĩnh viễn`, trace);
      console.error(`DELETE /crm-sources/${id}/hard - Lỗi xóa vĩnh viễn`, error);
      throw error;
    }
  }

  // =================================================================
  // API for CrmSourceData (Danh mục con)
  // =================================================================

  @Post(':sourceId/data')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Thêm một mục dữ liệu (danh mục con) vào CrmSource' })
  async addDataItem(
    @Param('sourceId') sourceId: string,
    @Body() createDataDto: CreateCrmSourceDataDto,
  ) {
    try {
      const result = await this.crmSourcesService.addDataItem(sourceId, createDataDto);
      return {
        success: true,
        message: 'Thêm mục dữ liệu thành công.',
        data: result,
      };
    } catch (error) {
      this.logger.error(`POST /crm-sources/${sourceId}/data - Lỗi`, (error as Error).stack);
      throw error;
    }
  }

  @Get(':sourceId/data')
  @ApiOperation({ summary: 'Lấy tất cả mục dữ liệu (danh mục con) của một CrmSource' })
  async getDataItems(@Param('sourceId') sourceId: string, @Query() queryParams: any) {
    try {
      const { page = 1, limit = 20 } = queryParams;
      const result = await this.crmSourcesService.findDataItemsBySourceId(sourceId, queryParams);
      return {
        success: true,
        message: 'Lấy danh sách mục dữ liệu thành công.',
        data: result.items,
        total: result.total,
        page: parseInt(String(page), 10),
        limit: parseInt(String(limit), 10),
      };
    } catch (error) {
      this.logger.error(`GET /crm-sources/${sourceId}/data - Lỗi`, (error as Error).stack);
      throw error;
    }
  }

  @Get('data/:dataId')
  @ApiOperation({ summary: 'Lấy chi tiết một mục dữ liệu (danh mục con)' })
  async findDataItemById(@Param('dataId') dataId: string) {
    try {
      const result = await this.crmSourcesService.findDataItemById(dataId);
      return {
        success: true,
        message: 'Lấy chi tiết mục dữ liệu thành công.',
        data: result,
      };
    } catch (error) {
      this.logger.error(`GET /crm-sources/data/${dataId} - Lỗi`, (error as Error).stack);
      throw error;
    }
  }

  @Patch('data/:dataId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Cập nhật một mục dữ liệu (danh mục con)' })
  async updateDataItem(
    @Param('dataId') dataId: string,
    @Body() updateDataDto: UpdateCrmSourceDataDto,
  ) {
    try {
      const result = await this.crmSourcesService.updateDataItem(dataId, updateDataDto);
      return {
        success: true,
        message: 'Cập nhật mục dữ liệu thành công.',
        data: result,
      };
    } catch (error) {
      this.logger.error(`PATCH /crm-sources/data/${dataId} - Lỗi`, (error as Error).stack);
      throw error;
    }
  }

  
}