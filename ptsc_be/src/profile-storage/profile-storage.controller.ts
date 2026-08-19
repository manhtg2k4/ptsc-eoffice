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
  ParseIntPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ProfileStorageService } from './profile-storage.service';
import { CreateStorageBatchDto } from './dto/create-profile-storage.dto';
import { UpdateStorageBatchDto } from './dto/update-profile-storage.dto';
import { ListStorageBatchDto } from './dto/list-storage-batch.dto';
import { ReturnError } from '../utils/util';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/oauth/decorator/public.decorator';
import { QueryParams } from '../interfaces';
import { formatErrors } from '../formatError';
import { ActionProfileStorageDto } from './dto/action-profile-storage.dto';
import * as jwt from 'jsonwebtoken';

@ApiTags('Quản lý Lưu trữ Hồ sơ [TẮT]')
@Controller('profile-storage')
export class ProfileStorageController {
  constructor(private readonly profileStorageService: ProfileStorageService) {}

  /**
   * Lấy userId từ request hoặc token
   * @param req Request object
   * @returns userId (string | null)
   */
  private getUserIdFromRequest(req: any): string | null {
    // Thử lấy từ req.user trước (nếu đã authenticate)
    let userId = 
      req?.user?.userId || 
      req?.user?.id || 
      req?.user?.user_id ||
      req?.user?._id ||
      req?.user?.sub ||
      null;

    // Nếu không có từ req.user, thử decode từ token trong header
    if (!userId) {
      try {
        const authHeader = req.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded: any = jwt.decode(token);
          
          // Theo jwt.strategy.ts, payload có field "user" và trả về { userId: payload.user }
          // Nên cần lấy từ decoded.user (là userId trong database)
          userId = 
            decoded?.user ||           // Theo JWT strategy: payload.user
            decoded?.userId || 
            decoded?.id || 
            decoded?.user_id ||
            decoded?._id ||
            decoded?.sub ||
            decoded?.user?.id ||
            null;
          
          if (userId) {
          }
        }
      } catch (e) {
        console.error('❌ Lỗi decode token:', e.message);
      }
    }

    return userId ? String(userId) : null;
  }

  /**
   * Tạo mới đợt lưu trữ và danh mục hồ sơ cần lưu trữ
   * @param createDto Dữ liệu tạo mới
   * @param req Request object
   * @param res Response object
   */
  /*
  @Post()
  @ApiOperation({ summary: 'Tạo mới đợt lưu trữ + danh mục hồ sơ cần lưu trữ (1 request)' })
  @ApiBody({ type: CreateStorageBatchDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async create(@Body() createDto: CreateStorageBatchDto, @Req() req: any, @Res() res: Response) {
    try {
      // Lấy userId từ request hoặc token
      const userId = this.getUserIdFromRequest(req);

      const result = await this.profileStorageService.createBatchWithSources(createDto, userId);
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
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
        // Nếu có errors array thì trả về chi tiết
        if (error.response.errors && Array.isArray(error.response.errors)) {
          return res.status(error.status || HttpStatus.BAD_REQUEST).json({
            success: error.response.success || false,
            message: error.response.message || 'Dữ liệu không hợp lệ',
            errors: error.response.errors,
          });
        }
        // Nếu chỉ có message thì format lại
        if (error.response.message) {
          return res.status(error.status || HttpStatus.BAD_REQUEST).json({
            success: error.response.success || false,
            message: error.response.message || 'Dữ liệu không hợp lệ',
            errors: [
              {
                field: 'general',
                message: error.response.message,
              },
            ],
      });
        }
      }

      // Lỗi không xác định - log và trả về lỗi chung
      console.error('Unexpected error in create:', error);
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: [
          {
            field: 'general',
            message: errorResponse.body?.message || error.message || 'Có lỗi xảy ra khi tạo mới đợt lưu trữ',
          },
        ],
      });
    }
  }
  */

  /**
   * Lấy danh sách đợt lưu trữ với phân trang và filter
   * @param query Tham số phân trang và lọc
   * @param res Response object
   */
  /*
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đợt lưu trữ với phân trang và filter (format chung)' })
  @ApiQuery({ type: ListStorageBatchDto })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  async findAll(@Query() query: ListStorageBatchDto, @Res() res: Response) {
    try {
      const result = await this.profileStorageService.findAll(query);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Lấy chi tiết đợt lưu trữ theo ID (kèm danh sách hồ sơ)
   * @param id ID của đợt lưu trữ
   * @param res Response object
   */
  /*
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đợt lưu trữ theo ID (kèm danh sách hồ sơ)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const result = await this.profileStorageService.findOne(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.NOT_FOUND).json({
          success: error.response.success || false,
          message: error.response.message || 'Không tìm thấy đợt lưu trữ',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Cập nhật thông tin đợt lưu trữ và danh mục hồ sơ
   * @param id ID của đợt lưu trữ
   * @param updateDto Dữ liệu cập nhật
   * @param res Response object
   */
  /*
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật đợt lưu trữ và danh mục hồ sơ' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiBody({ type: UpdateStorageBatchDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateStorageBatchDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.profileStorageService.update(id, updateDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      // Xử lý lỗi validation từ class-validator
      if (error.response && Array.isArray(error.response.message)) {
        const formattedErrors = formatErrors(error.response.message);
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
        });
      }

      // Xử lý lỗi từ service
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }

      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Xóa một đợt lưu trữ (soft delete)
   * @param id ID của đợt lưu trữ
   * @param res Response object
   */
  /*
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đợt lưu trữ (soft delete)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async delete(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    try {
      const result = await this.profileStorageService.delete(id);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.NOT_FOUND).json({
          success: error.response.success || false,
          message: error.response.message || 'Không tìm thấy đợt lưu trữ',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Xóa nhiều đợt lưu trữ cùng lúc
   * @param ids Mảng các ID cần xóa
   * @param res Response object
   */
  /*
  @Delete()
  @ApiOperation({ summary: 'Xóa nhiều đợt lưu trữ (soft delete)' })
  @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'number' } } } } })
  @ApiResponse({ status: 200, description: 'Xóa thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ nào.' })
  async deleteMany(@Body('ids') ids: number[], @Res() res: Response) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
          errors: [
            {
              field: 'ids',
              message: 'Danh sách ID không được để trống',
            },
          ],
        });
      }

      const result = await this.profileStorageService.deleteMany(ids);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  // ===== Workflow actions =====
  /**
   * Trình phê duyệt đợt lưu trữ
   * @param id ID của đợt lưu trữ
   * @param actionDto Dữ liệu hành động (người thực hiện, ghi chú)
   * @param req Request object
   * @param res Response object
   */
  /*
  @Post(':id/submit')
  @ApiOperation({ summary: 'Trình phê duyệt đợt lưu trữ' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiBody({ type: ActionProfileStorageDto })
  @ApiResponse({ status: 200, description: 'Trình phê duyệt thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @Body() actionDto: ActionProfileStorageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // Lấy userId từ request hoặc token và gán vào actedBy nếu chưa có
      const userId = this.getUserIdFromRequest(req);
      if (userId && !actionDto.actedBy) {
        actionDto.actedBy = userId;
      }

      const result = await this.profileStorageService.submit(id, actionDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
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
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Phê duyệt đợt lưu trữ
   * @param id ID của đợt lưu trữ
   * @param actionDto Dữ liệu hành động (người thực hiện, ghi chú)
   * @param req Request object
   * @param res Response object
   */
  /*
  @Post(':id/approve')
  @ApiOperation({ summary: 'Phê duyệt đợt lưu trữ' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiBody({ type: ActionProfileStorageDto })
  @ApiResponse({ status: 200, description: 'Phê duyệt thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() actionDto: ActionProfileStorageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // Lấy userId từ request hoặc token và gán vào actedBy nếu chưa có
      const userId = this.getUserIdFromRequest(req);
      if (userId && !actionDto.actedBy) {
        actionDto.actedBy = userId;
      }

      const result = await this.profileStorageService.approve(id, actionDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
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
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */

  /**
   * Trả lại hoặc từ chối phê duyệt đợt lưu trữ
   * @param id ID của đợt lưu trữ
   * @param actionDto Dữ liệu hành động (người thực hiện, ghi chú)
   * @param req Request object
   * @param res Response object
   */
  /*
  @Post(':id/reject')
  @ApiOperation({ summary: 'Trả lại/Không phê duyệt đợt lưu trữ' })
  @ApiParam({ name: 'id', type: Number, description: 'ID đợt lưu trữ' })
  @ApiBody({ type: ActionProfileStorageDto })
  @ApiResponse({ status: 200, description: 'Trả lại thành công.' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đợt lưu trữ.' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() actionDto: ActionProfileStorageDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // Lấy userId từ request hoặc token và gán vào actedBy nếu chưa có
      const userId = this.getUserIdFromRequest(req);
      if (userId && !actionDto.actedBy) {
        actionDto.actedBy = userId;
      }

      const result = await this.profileStorageService.reject(id, actionDto);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
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
      if (error.response && error.response.errors) {
        return res.status(error.status || HttpStatus.BAD_REQUEST).json({
          success: error.response.success || false,
          message: error.response.message || 'Có lỗi xảy ra',
          errors: error.response.errors,
        });
      }
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  */
}

