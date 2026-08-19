import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CustomSenderUnitService } from './custom-sender-unit.service';
import { CreateCustomSenderUnitDto } from './dto/create-custom-sender-unit.dto';
import { UpdateCustomSenderUnitDto } from './dto/update-custom-sender-unit.dto';
import { ReturnError } from '../utils/util';
import { UserEntity } from '../users/entities/user.entity';

@ApiTags('Đơn vị gửi tùy chỉnh')
@Controller('custom-sender-units')
export class CustomSenderUnitController {
  constructor(
    private readonly service: CustomSenderUnitService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Kiểm tra user có phải admin/văn thư
   */
  private async isAdminOrVanThu(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['position', 'role'],
      });

      if (!user) return false;

      // Kiểm tra position: Admin hoặc Vanthu
      const pos = user.position || '';
      const posString = String(pos).toLowerCase();
      const isAdminByPosition =
        posString === 'admin' ||
        posString.includes('admin') ||
        posString === 'vanthu' ||
        posString === 'văn thư' ||
        posString.includes('văn thư') ||
        posString.includes('vanthu');

      // Kiểm tra role
      const role = user.role || '';
      const roleString = String(role).toLowerCase();
      const isAdminByRole =
        roleString.includes('admin') ||
        roleString.includes('quản trị') ||
        roleString.includes('văn thư') ||
        roleString.includes('vanthu');

      return isAdminByPosition || isAdminByRole;
    } catch {
      return false;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới đơn vị gửi tùy chỉnh' })
  @ApiBody({ type: CreateCustomSenderUnitDto })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  async create(
    @Body() dto: CreateCustomSenderUnitDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      const userName = req?.user?.name || req?.user?.preferred_username || null;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const data = await this.service.create(dto, userId, userName);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: { ...data, _id: data.id },
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách đơn vị gửi của user hiện tại',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'name', required: false, type: String })
  async findByUser(
    @Query() queryParams: any,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const result = await this.service.findByUser(userId, queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('all')
  @ApiOperation({
    summary: 'Lấy tất cả đơn vị gửi tùy chỉnh (dành cho văn thư/admin)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'nameTree', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String })
  async findAll(
    @Query() queryParams: any,
    @Res() res: Response,
  ) {
    try {
      // Normalize frontend's `filter[...]` shape to flat query params
      const normalized: any = { ...queryParams };
      if (queryParams?.filter) {
        if (typeof queryParams.filter === 'string') {
          try {
            const parsed = JSON.parse(queryParams.filter);
            Object.assign(normalized, parsed);
          } catch {}
        } else if (typeof queryParams.filter === 'object') {
          Object.assign(normalized, queryParams.filter);
        }
      }

      const result = await this.service.findAll(normalized);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post('all/delete-multiple')
  @ApiOperation({ summary: 'Xóa nhiều đơn vị gửi (route tương thích builder-table)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: 'Danh sách ID cần xóa' },
      },
      required: ['ids'],
    },
  })
  async deleteMultipleFromAll(
    @Body('ids') ids: string[],
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const isAdmin = await this.isAdminOrVanThu(userId);
      const result = await this.service.removeMany(ids, userId, isAdmin);
      if (result.failedCount > 0) {
        const message = result.deletedCount > 0
          ? `Xóa thành công ${result.deletedCount} đơn vị, nhưng ${result.failedCount} thất bại.`
          : 'Không xóa được đơn vị gửi nào. Vui lòng kiểm tra các đơn vị con trước khi xóa.';
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message,
          ...result,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa đơn vị gửi thành công.',
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('children/:id')
  @ApiOperation({
    summary: 'Lấy danh sách đơn vị con (lazy-load tree)',
    description: 'Trả về các đơn vị gửi có parentId = id truyền vào. Mỗi item có flags.hasChildren.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID đơn vị cha' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getChildren(
    @Param('id') parentId: string,
    @Query() queryParams: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.getChildrenByParentId(parentId, queryParams);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn vị gửi' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'source', required: false, enum: ['custom', 'organization'], description: 'Tối ưu: chỉ định source (custom|organization) để query trực tiếp' })
  async findOne(
    @Param('id') id: string,
    @Query('source') source: 'custom' | 'organization' | undefined,
    @Res() res: Response,
  ) {
    try {
      const data = await this.service.findOne(id, source);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: { ...data, _id: data.id },
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật đơn vị gửi (chỉ owner hoặc văn thư)' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateCustomSenderUnitDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomSenderUnitDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const isAdmin = await this.isAdminOrVanThu(userId);

      const data = await this.service.update(id, dto, userId, isAdmin);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: { ...data, _id: data.id },
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn vị gửi (chỉ owner hoặc văn thư)' })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const isAdmin = await this.isAdminOrVanThu(userId);
      await this.service.remove(id, userId, isAdmin);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa đơn vị gửi thành công.',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post('delete-multiple')
  @ApiOperation({ summary: 'Xóa nhiều đơn vị gửi' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async removeMany(
    @Body('ids') ids: string[],
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const isAdmin = await this.isAdminOrVanThu(userId);
      const result = await this.service.removeMany(ids, userId, isAdmin);

      if (result.failedCount > 0) {
        const message = result.deletedCount > 0
          ? `Xóa thành công ${result.deletedCount} đơn vị, nhưng ${result.failedCount} thất bại.`
          : 'Không xóa được đơn vị gửi nào. Vui lòng kiểm tra các đơn vị con trước khi xóa.';

        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message,
          ...result,
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa đơn vị gửi thành công.',
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}

/**
 * Controller tương thích với builder-table
 * Route: /api/list-sending-unit-doc
 */
@Controller('list-sending-unit-doc')
export class ListSendingUnitDocController {
  constructor(private readonly service: CustomSenderUnitService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn vị gửi (tương thích builder-table)' })
  async listForBuilderTable(
    @Query() queryParams: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.findAll(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result.data,
        totalItems: result.total,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}

/**
 * Controller tương thích xóa đơn vị gửi (builder-table)
 * Builder-table gọi: DELETE /api/delete-sending-unit với body { ids: [...] }
 */
@Controller('delete-sending-unit')
export class DeleteSendingUnitDocController {
  constructor(
    private readonly service: CustomSenderUnitService,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Kiểm tra user có phải admin/văn thư
   */
  private async isAdminOrVanThu(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['position', 'role'],
      });

      if (!user) return false;

      const pos = user.position || '';
      const posString = String(pos).toLowerCase();
      const isAdminByPosition =
        posString === 'admin' ||
        posString.includes('admin') ||
        posString === 'vanthu' ||
        posString === 'văn thư' ||
        posString.includes('văn thư') ||
        posString.includes('vanthu');

      const role = user.role || '';
      const roleString = String(role).toLowerCase();
      const isAdminByRole =
        roleString.includes('admin') ||
        roleString.includes('quản trị') ||
        roleString.includes('văn thư') ||
        roleString.includes('vanthu');

      return isAdminByPosition || isAdminByRole;
    } catch {
      return false;
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa đơn vị gửi (tương thích builder-table)' })
  async deleteForBuilderTable(
    @Body('ids') ids: string[],
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Người dùng chưa đăng nhập',
        });
      }

      const isAdmin = await this.isAdminOrVanThu(userId);
      const result = await this.service.removeMany(ids, userId, isAdmin);
      
      if (result.failedCount > 0) {
        const message = result.deletedCount > 0
          ? `Xóa thành công ${result.deletedCount} đơn vị, nhưng ${result.failedCount} thất bại.`
          : 'Không xóa được đơn vị gửi nào. Vui lòng kiểm tra các đơn vị con trước khi xóa.';
        return res.status(HttpStatus.CONFLICT).json({
          success: false,
          message,
          ...result,
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa đơn vị gửi thành công.',
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}
