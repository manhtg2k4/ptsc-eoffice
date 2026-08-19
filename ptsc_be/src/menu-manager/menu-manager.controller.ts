import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaticPermissionGuard } from 'src/users/guards/static-permission.guard';
import { RequireStaticPermission } from 'src/users/decorators/static-permission.decorator';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { Response } from 'express';
import { ReturnError } from '../utils/util';
import { CreateMenuManagerDto, UpdateMenuManagerDto } from './menu-manager.dto';
import { MenuManagerService } from './menu-manager.service';
import { Public } from 'src/oauth/decorator/public.decorator';
import { AuthorityGuard, AuthorityStages, CheckAuthority, EffectiveUser, OriginalUser } from 'src/authority-documents';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';

// ===== FAKE DATA IMPORT =====


@ApiTags('Quản lý Menu')
@Controller('menu-manager')
@UseGuards(AuthorityGuard, StaticPermissionGuard)
export class MenuManagerController {
  constructor(
    private readonly organizationService: MenuManagerService
  ) { }

  @ApiOperation({
    summary: 'Tạo menu mới',
    description: 'Tạo một menu mới trong hệ thống',
  })
  @ApiBody({
    type: CreateMenuManagerDto,
    description: 'Dữ liệu menu cần tạo',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo menu thành công',
  })
  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createDto: CreateMenuManagerDto, @Res() res: Response) {
    try {
      const data = await this.organizationService.create(createDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      return res
        .status(error.status || HttpStatus.BAD_REQUEST)
        .json({
          success: false,
          message: error.message || 'Lỗi server',
        });
    }
  }

  @ApiOperation({
    summary: 'Sửa đường dẫn menu',
    description: 'Sửa chữa và cập nhật đường dẫn của các menu',
  })
  @ApiResponse({
    status: 200,
    description: 'Sửa đường dẫn thành công',
  })
  @Post('fix-paths')
  @UseGuards(AdminGuard)
  async fixPaths(@Res() res: Response) {
    try {
      const message = await this.organizationService.fixPaths();
      return res.status(HttpStatus.OK).json({
        success: true,
        message,
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi server',
      });
    }
  }

  // @ApiOperation({
  //   summary: 'Lấy danh sách menu',
  //   description: 'Lấy danh sách tất cả menu với các tham số lọc',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lấy danh sách thành công',
  // })
  // @Get()
  // async list(
  //   @Query() queryParams: Record<string, string>,
  //   @Req() req: any,
  //   @Res() res: Response,
  // ) {
  //   try {
  //     const userId = req?.user?.userId;
  //     const data = await this.organizationService.findAll(queryParams, userId);
  //     if (!data) {
  //       return res.status(HttpStatus.BAD_REQUEST).json({
  //         success: false,
  //         data: null,
  //       });
  //     }
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       ...data,
  //     });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }


  // @Public()
  @Get('/list-menu')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async findAllMenu(
    @Query() queryParams: Record<string, string>,
    @OriginalUser() originalUserId: string,
    @Res() res: Response,
    @Req() req: Request,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      const userId = (req as any).user?.userId;
      const data = await this.organizationService.findMenuByUser(queryParams, userId, false);
      // const data = await this.organizationService.findAllMenu(queryParams, userId, effectiveUserId);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/menu-count')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async getMenuCount(
    @Query() queryParams: Record<string, string>,
    @OriginalUser() originalUserId: string,
    @Res() res: Response,
    @Req() req: Request,
    @EffectiveUser() effectiveUserId: string
  ) {
    try {
      const userId = (req as any).user?.userId;
      const data = await this.organizationService.findMenuCountsByUser(queryParams, userId);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/list-menu-for-app')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  async findAllMenuForApp(
    @Query() queryParams: Record<string, string>,
    @OriginalUser() originalUserId: string,
    @Res() res: Response,
    @Req() req: Request,
    @EffectiveUser() effectiveUserId: string,
  ) {
    try {
      const userId = (req as any).user?.userId;
      const data = await this.organizationService.findMenuForApp(queryParams, userId);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/list-menu-with-feature')
  @UseGuards(AdminGuard)
  async findAllMenuWithFeature(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      const data = await this.organizationService.findAllMenuWithFeature(queryParams, userId);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Post('delete-multiple')
  @UseGuards(AdminGuard)
  async deleteMultiple(@Body('ids') ids: string[], @Res() res: Response) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
        });
      }

      const isDeleted = await this.organizationService.deleteManyByIds(ids);
      return res.status(HttpStatus.OK).json({
        success: isDeleted,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }


  @ApiOperation({
    summary: 'Lấy số lượng (count) cho các menu',
    description: 'Lấy số lượng, đường dẫn và loại cho các mã menu được cung cấp',
  })
  @ApiQuery({
    name: 'codes',
    description: 'Danh sách các mã menu (cách nhau bằng dấu phẩy)',
    required: false,
  })
  @Get('menu-counts')
  async getMenuCounts(
    @Query('codes') codes: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userId = req?.user?.userId;
      const parsedCodes = codes ? codes.split(',').map((c) => c.trim()) : undefined;
      const data = await this.organizationService.getMenuCounts(userId, parsedCodes);
      return res.status(HttpStatus.OK).json(data);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }


  @Get(':id')
  async findById(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.organizationService.findById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data.data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch('/list-menu/:id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() updateDto: UpdateMenuManagerDto, @Res() res: Response) {
    try {
      const data = await this.organizationService.update(id, updateDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // @Post('/sync/mongo-to-mssql')
  // async syncMongoToMssql(@Res() res: Response) {
  //   try {
  //     const result = await this.organizationService.syncFromMongo();
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       ...result,
  //     });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }

  //   @Delete('/list-menu/:id')
  //  async remove(@Param('id') id: string , @Res() res: Response) {
  //   try {
  //     await this.organizationService.delete(id);
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: `Người dùng với ID ${id} đã được  xóa`,
  //     });
  //   } catch (error) {
  //     return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
  //       success: false,
  //       message: error.message || 'Lỗi server',
  //     });
  //   }
  //   }

  @Delete('/list-menu/:id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const { deletedCount } = await this.organizationService.delete(id);

      if (deletedCount === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `Không tìm thấy menu nào để xóa với ID ${id}`,
        });
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Menu và tất cả menu con đã được xóa`,
        deletedCount,
      });
    } catch (error) {
      return res
        .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
        .json({
          success: false,
          message: error.message || 'Lỗi server',
        });
    }
  }



}
