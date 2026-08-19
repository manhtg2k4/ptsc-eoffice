import { Controller } from '@nestjs/common';
import {
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Res,
  Query,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StaticPermissionGuard } from 'src/users/guards/static-permission.guard';
import { RequireStaticPermission } from 'src/users/decorators/static-permission.decorator';
import { ApiTags } from '@nestjs/swagger';
import { GroupUserService } from './group-users.service';
import { CreateGroupUserDto, UpdateGroupUserDto } from './group-users.dto';
import { ReturnError } from '../utils/util';
import { Response } from 'express';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
@ApiTags('Quản lý Nhóm Người dùng')
@Controller('group-users')
@UseGuards(StaticPermissionGuard)
export class GroupUsersController {
  constructor(
    private readonly groupUserService: GroupUserService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly userLogHelper: UserLogHelper,
  ) { }

  @Post()
  @RequireStaticPermission({ code: 'VT1', action: 'add' })
  async create(
    @Body() createGroupUserDto: CreateGroupUserDto,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'POST',
        `Tạo mới nhóm người dùng: ${createGroupUserDto.name}`
      );

      const data = await this.groupUserService.create(createGroupUserDto);
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

  @Get()
  @RequireStaticPermission({ code: 'VT1', action: 'view' })
  async list(
    @Query() queryParams: Record<string, any>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách nhóm người dùng`
      );

      const data = await this.groupUserService.findAll(queryParams);
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

  @Get(':id')
  @RequireStaticPermission({ code: 'VT1', action: 'view' })
  async findById(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem chi tiết nhóm người dùng ID: [${id}]`
      );

      const data = await this.groupUserService.findById(id);
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

  @Get('code/:groupCode/users')
  @RequireStaticPermission({ code: 'VT1', action: 'view' })
  async findUsersByGroupCode(
    @Param('groupCode') code: string,
    @Req() req: any,
    @Res() res: Response,
    @Query() queryParams: QueryParams,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy danh sách người dùng thuộc mã nhóm: [${code}]`
      );

      const data = await this.groupUserService.findUsersByGroupCode(
        code,
        queryParams,
      );
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

  @Get(':groupId/users')
  @RequireStaticPermission({ code: 'VT1', action: 'view' })
  async findUsersByGroupId(
    @Param('groupId') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query() queryParams: QueryParams,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy danh sách người dùng thuộc nhóm ID: [${id}]`
      );

      const data = await this.groupUserService.findUsersByGroupId(
        id,
        queryParams,
      );
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        //total : data.total,
        // page : data.page,
        //limit : data.limit,
        //totalPages : data.totalPages,
        ...data,
        //filter: data.filter,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get(':groupId/organizationUnit')
  @RequireStaticPermission({ code: 'VT1', action: 'view' })
  async findOrganizationUnitByGroupId(
    @Param('groupId') id: string,
    @Req() req: any,
    @Res() res: Response,
    @Query() queryParams: QueryParams,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy danh sách đơn vị thuộc nhóm ID: [${id}]`
      );

      const data = await this.groupUserService.findOrganizationUnitByGroupId(
        id,
        queryParams,
      );
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        //total : data.total,
        //page : data.page,
        //limit : data.limit,
        //totalPages : data.totalPages,
        ...data,
        //filter: data.filter,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post(':groupId/organizationUnit')
  @RequireStaticPermission({ code: 'VT1', action: 'add' })
  async addOrganizationUnitToGroup(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Body('orgId') orgId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userInfo = req?.user?.userId;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.logAction(
      userInfo,
      ipAddress,
      'POST',
      `Thêm đơn vị [${orgId}] vào nhóm [${groupId}]`
    );
    return this.groupUserService.addOrganizationUnitToGroup(groupId, orgId);
  }

  @Put(':groupId/organizationUnit')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async updateOrganizationUnitsInGroup(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Body('organizationUnitIds') organizationUnitIds: string[],
  ): Promise<{ success: boolean; message: string }> {
    const userInfo = req?.user?.userId;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.logAction(
      userInfo,
      ipAddress,
      'PUT',
      `Cập nhật danh sách đơn vị trong nhóm [${groupId}]`
    );
    return this.groupUserService.updateOrganizationUnitsInGroup(
      groupId,
      organizationUnitIds,
    );
  }

  @Delete(':groupId/organizationUnit/:orgId')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async removeOrganizationUnitFromGroup(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Param('orgId') orgId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userInfo = req?.user?.userId;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.logAction(
      userInfo,
      ipAddress,
      'DELETE',
      `Xóa đơn vị [${orgId}] khỏi nhóm [${groupId}]`
    );
    return this.groupUserService.removeOrganizationUnitFromGroup(
      groupId,
      orgId,
    );
  }

  @Delete(':groupId/users/:userId')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async removeUserFromGroup(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Param('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const userInfo = req?.user?.userId;
    const ipAddress = req?.socket?.remoteAddress || 'Unknown';
    // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
    await this.logAction(
      userInfo,
      ipAddress,
      'DELETE',
      `Xóa người dùng [${userId}] khỏi nhóm [${groupId}]`
    );
    return this.groupUserService.removeUserFromGroup(groupId, userId);
  }

  @Post(':groupId/users')
  @RequireStaticPermission({ code: 'VT1', action: 'add' })
  async addUsersToGroup(
    @Param('groupId') groupId: string,
    @Req() req: any,
    @Body('userIds') userIds: string[],
    @Res() res: Response,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'POST',
        `Thêm người dùng vào nhóm [${groupId}]`
      );

      if (!Array.isArray(userIds)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách userIds không hợp lệ',
        });
      }
      const result = await this.groupUserService.addUsersToGroup(
        groupId,
        userIds,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGroupUserDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'PATCH',
        `Cập nhật nhóm người dùng ID: [${id}]`
      );

      const data = await this.groupUserService.update(id, updateDto);
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
  @Delete(':id')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async remove(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'DELETE',
        `Xóa nhóm người dùng ID: [${id}]`
      );

      await this.groupUserService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Nhóm người dùng với ID ${id} đã được xóa`,
      });
    } catch (error) {
      const err = error as any;
      return res.status(err?.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err?.message || 'Lỗi server',
      });
    }
  }

  @Post('delete-multiple')
  @RequireStaticPermission({ code: 'VT1', action: 'edit' })
  async deleteMultiple(@Body('ids') ids: string[], @Req() req: any, @Res() res: Response) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'POST',
        `Xóa nhiều nhóm người dùng: [${ids.join(', ')}]`
      );

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Danh sách ID không hợp lệ',
        });
      }

      const isDeleted = await this.groupUserService.deleteManyByIds(ids);
      return res.status(HttpStatus.OK).json({
        success: isDeleted,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  private async logAction(userInfo: string, ipAddress: string, action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', details: string) {
    try {
      await this.systemLogService.createLogFromSystem({
        action,
        details,
        method: action,
        status: 'SUCCESS',
        type: 'GROUP_USER_MANAGEMENT',
        subType: 'GROUP_USER_MANAGEMENT',
        userInfo,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to log action: ${details}`, error);
    }
  }
}
interface QueryParams {
  page?: string | number;
  limit?: string | number;
  sort?: string;
  [key: string]: any;
}
