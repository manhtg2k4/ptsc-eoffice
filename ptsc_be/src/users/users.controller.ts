// src/users/users.controller.ts
import { Body, Controller, Get, HttpStatus, Param, Post, UseGuards, Query, Req, Res, Put, Patch, Delete, BadRequestException, Request, Inject } from '@nestjs/common';
import { GetPendingItemsDto } from './dto/get-pending-items.dto';
import { StaticAdminPermissionGuard } from 'src/users/guards/static-admin-permission.guard';
import { ChangePasswordGuard } from 'src/users/guards/change-password.guard';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetRolesDto } from './dto/get-roles.dto';
import { UsersService } from './users.service';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
// import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
import { ReturnError, checkIsAdmin } from 'src/utils/util';
import { Response } from 'express';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, UpdateProfileDto } from './dto/user.dto';
import { TaskUserRole } from 'src/task/entity/task.constants';
import * as jwt from 'jsonwebtoken';
import { AuthorityStages, CheckAuthority, EffectiveUser, AuthorityGuard, AuthorizedUser, OriginalUser } from 'src/authority-documents';
import { AdminGuard } from './guards/admin.guard';
import { LeadersPermissionGuard } from './guards/leaders-permission.guard';
import { UsersByProcessRoleGuard } from './guards/users-by-process-role.guard';
import { RequireTaskRoleScreen } from './decorators/task-role-screen.decorator';
import { TaskRoleScreenGuard } from './guards/task-role-screen.guard';
import { OrganizationUnitsByFlowDto } from './dto/organization.dto';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService,
    private readonly systemLogService: SystemLogServiceSql,
    @Inject('MSSQL_REPO') private readonly repo: MSSQLRepository,
    // private readonly userLogHelper: UserLogHelper,
  ) { }
  /**
     * Helper method to create a log entry.
     * @param userInfo - The user information for the log.
     * @param action - The action being logged (e.g., 'GET', 'POST').
     * @param details - A description of the action.
     */
  private async logAction(userInfo: string, ipAddress: string, action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', details: string) {
    try {
      await this.systemLogService.createLogFromSystem({
        action,
        details,
        method: action,
        status: 'SUCCESS',
        type: 'USER_MANAGEMENT',
        subType: 'USER_MANAGEMENT',
        userInfo,
        ipAddress,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to log action: ${details}`, error);
    }
  }
  /* ==========================================
     1. Lấy danh sách user cùng phòng ban
  ========================================== */

  @Get('/role-detail/:id')
  async findProcessRoleInfoById(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem chi tiết vai trò quy trình của người dùng ID: [${id}]`
      ).catch((err) => console.error('Failed to log action:', err));
      // --- End Logging ---

      const data = await this.usersService.findProcessRoleInfoById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });

    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('by-task-role')
  @RequireTaskRoleScreen('qlcvall', 'cvtcvbpb', 'cvtchpb', 'cvllpb')
  @UseGuards(TaskRoleScreenGuard)
  @ApiOperation({
    summary:
      'Lấy danh sách người dùng theo vai trò công việc',
  })
  @ApiQuery({
    name: 'typeTaskUser',
    enum: TaskUserRole,
    required: true,
  })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    description: 'ID của người đã được chọn ở vai trò đối lập (vd: đã chọn người chủ trì thì truyền id đó vào khi lấy danh sách người phối hợp)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Lọc theo email',
  })
  async getUsersByTaskRole(
    @Query('typeTaskUser') typeTaskUser: TaskUserRole, @Query() query: any, @Req() req: any,
  ) {
    const userId = req?.user?.userId;
    return this.usersService.getUsersByTaskRole(typeTaskUser, userId, query);
    // return this.usersService.getUsersByTaskRole(typeTaskUser);
  }

  @Get('by-task-role-form-meeting')
  @RequireTaskRoleScreen('qlcvall', 'cvtcvbpb', 'cvtchpb', 'cvllpb')
  @UseGuards(TaskRoleScreenGuard)
  @ApiOperation({
    summary:
      'Lấy danh sách người dùng theo vai trò công việc',
  })
  @ApiQuery({
    name: 'typeTaskUser',
    enum: TaskUserRole,
    required: true,
  })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    description: 'ID của người đã được chọn ở vai trò đối lập',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Lọc theo email',
  })
  async getUsersByTaskRoleFormMeeting(
    @Query('typeTaskUser') typeTaskUser: TaskUserRole, @Query() query: any, @Req() req: any,
  ) {
    const userId = req?.user?.userId;
    return this.usersService.getUsersByTaskRoleFormMeeting(typeTaskUser, userId, query);
    // return this.usersService.getUsersByTaskRole(typeTaskUser);
  }

  @Get('by-task-role-form-doc')
  @RequireTaskRoleScreen('qlcvall', 'cvtcvbpb', 'cvtchpb', 'cvllpb')
  @UseGuards(TaskRoleScreenGuard)
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({
    summary:
      'Lấy danh sách người dùng theo vai trò công việc',
  })
  @ApiQuery({
    name: 'typeTaskUser',
    enum: TaskUserRole,
    required: true,
  })
  @ApiQuery({
    name: 'excludeId',
    required: false,
    description: 'ID của người đã được chọn ở vai trò đối lập',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Lọc theo email',
  })
  async getUsersByTaskRoleFormDoc(
    @Query('typeTaskUser') typeTaskUser: TaskUserRole, @Query() query: any, @Req() req: any,
    @EffectiveUser() userId: string,
  ) {
    // const userId = req?.user?.userId;
    return this.usersService.getUsersByTaskRoleFormDoc(typeTaskUser, userId, query);
    // return this.usersService.getUsersByTaskRole(typeTaskUser);

  }


  @Get('/hide-download-file')
  @ApiOperation({ summary: 'Kiểm tra người dùng có thuộc nhóm văn thư Tổng công ty hay không' })
  async isVanThuTct(@Req() req: any, @Res() res: Response) {
    try {
      const userId = req?.user?.userId;
      const isVanThu = await this.usersService.checkVanThuTct(userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        isVanThu: isVanThu,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/users-in-same-org')
  @ApiOperation({ summary: 'Danh sách người dùng cùng phòng ban với user hiện tại' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  async getUsersInSameOrg(
    @Req() req: any,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
  ) {
    const userId = req?.user?.userId;
    const limit = parseInt(limitQuery || '9999');
    const page = parseInt(pageQuery || '1');

    // --- Logging ---
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách người dùng cùng phòng ban`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'USER_MANAGEMENT',
        subType: 'USER_MANAGEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Logging failed for getUsersInSameOrg:', logError);
    }
    // --- End Logging ---

    return this.usersService.getUsersInSameOrg(userId, limit, page, name);
  }

  @Get('/users-by-org-unit')
  @ApiOperation({ summary: 'Danh sách người dùng theo phòng ban' })
  @ApiQuery({ name: 'departmentId', required: true, description: 'ID phòng ban' })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  async getUsersByOrganizationUnit(
    @Req() req: any,
    @Query('organizationUnit') organizationUnitId: string,
    @Query('name') name?: string,
  ) {
    // --- Logging ---
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách người dùng theo phòng ban`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'USER_MANAGEMENT',
        subType: 'USER_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Logging failed for getUsersByDepartment:', logError);
    }
    // --- End Logging ---

    return this.usersService.getUsersByOrganizationUnit(
      organizationUnitId,
      name,
    );
  }
  @Get('/users-by-org-unit_pending')
  @ApiOperation({ summary: 'Danh sách người dùng theo phòng ban kết hợp với vai trò động đơn vị xử lý' })
  @ApiQuery({ name: 'departmentId', required: true, description: 'ID phòng ban' })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  async getUsersByOrganizationUnitPending(
    @Req() req: any,
    @Query('organizationUnit') organizationUnitId: string,
    @Query('name') name?: string,
    @Query('countProcessingFeedback') countProcessingFeedback?: string,
  ) {
    // --- Logging ---
    try {
      // const userInfo = await this.userLogHelper.getUserLogInfo(req?.user?.userId, req);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách người dùng theo phòng ban`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'USER_MANAGEMENT',
        subType: 'USER_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Logging failed for getUsersByDepartment:', logError);
    }
    // --- End Logging ---

    return this.usersService.getUsersByOrganizationUnitPending(
      organizationUnitId,
      name,
      countProcessingFeedback === 'true',
    );
  }

  @Get('/users-assigners')
  async getUsersAssigners(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.usersService.getUsersAssigners(userId);
  }

  @Get('/project-users')
  @ApiOperation({ summary: 'Danh sách người dùng theo đơn vị cấu hình trong bpmn-design của dự án' })
  @ApiQuery({ name: 'processKey', required: false, description: 'Process key của quy trình, mặc định CVDAN' })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên, username hoặc email' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'excludeId', required: false, description: 'Danh sách user id cần loại trừ, ngăn cách bằng dấu phẩy' })
  async getProjectUsers(@Query() queryParams: any) {
    return this.usersService.getProjectUsersByProcessKey(queryParams);
  }

  @Get('/users-directors')
  async getUsersDirectors(@Req() req: any) {
    const userId = req?.user?.userId;
    return this.usersService.getUsersDirectors(userId);
  }
  @Get('/users-suporters')
  async getUsersSupporters(@Req() req: any, @Query('directorIds') directorIds: string) {
    const userId = req?.user?.userId;
    return this.usersService.getUsersSupporters(userId, directorIds);
  }


  @Post('/users-by-org-unit')
  @ApiOperation({ summary: 'Danh sách người dùng theo phòng ban' })
  async getUsersByOrganizationUnitV1(
    @Req() req: any,
    @Body('organizationUnit') organizationUnitIds: string[],
    @Body('name') name?: string,
  ) {
    // --- Logging ---
    try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập danh sách người dùng theo phòng ban`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'USER_MANAGEMENT',
        subType: 'USER_MANAGEMENT',
        userInfo: req?.user?.userId || '',
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Logging failed for getUsersByOrganizationUnit:', logError);
    }
    // --- End Logging ---

    return this.usersService.getUsersByOrganizationUnitV1(
      organizationUnitIds,
      name,
    );
  }


  // Note: Routes with specific paths must come before dynamic :id routes
  // to avoid route conflicts

  /* ==========================================
     4. Lấy user theo luồng xử lý văn bản
  ========================================== */
  @Post('/inflow')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách người dùng trong luồng xử lý văn bản' })
  @ApiBody({ type: GetRolesDto })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false })
  async getUsersInFlow(
    @Body() payload: any,
    @EffectiveUser() userId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Req() req?: any,
  ) {
    const limit = parseInt(limitQuery || '1000');
    const page = parseInt(pageQuery || '1');

    const effectiveUserId = userId || req?.user?.userId || payload.userId;

    // Ưu tiên keySearch từ payload, nếu không có thì dùng name từ query parameter
    const searchName = payload?.keySearch || name;

    // Dùng getUsersInFlow (code cũ) thay vì getUsersRoleFeature (RBAC)
    return this.usersService.getUsersInFlow(
      effectiveUserId,
      payload,
      limit,
      page,
      searchName,
    );
  }

  /* ==========================================
     5. Lấy danh sách user có thể trả lại
  ========================================== */
  @Post('/return-user')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @UseGuards(DocumentPermissionGuard)
  @ApiOperation({ summary: 'Danh sách người dùng có thể trả lại' })
  @ApiBody({ type: GetRolesDto })
  async getReturnUser(
    @Body() payload: GetRolesDto,
    @EffectiveUser() userId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Req() req?: any,
  ) {
    try {
      const limit = parseInt(limitQuery || '100');
      const page = parseInt(pageQuery || '1');
      payload.userId = userId || payload.userId || req?.user;
      return this.usersService.getReturnUser(payload, limit, page, name);
    } catch (error) {
      throw new Error("Lỗi không lấy được người dùng" + error.message);

    }

  }

  /* ==========================================
     6. Lấy phòng ban trong luồng xử lý
  ========================================== */
  @ApiOperation({ summary: 'Danh sách phòng ban trong luồng xử lý văn bản' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'filter', required: false })
  @ApiQuery({ name: 'byRoles', required: true })
  @ApiQuery({ name: 'name', required: false })
  @ApiBody({ type: GetRolesDto })
  async getOrganizationUnit(
    @Body() payload: GetRolesDto,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('filter') filterQuery?: string,
    @Query('byRoles') byRoles?: string,
    @Query('name') name?: string,
  ) {
    try {
      const limit = parseInt(limitQuery || '10');
      const page = parseInt(pageQuery || '1');

      const filter = filterQuery ? JSON.parse(filterQuery) : {};
      filter.status = 1;

      return this.usersService.getOrganizationUnit(
        payload,
        filter,
        limit,
        page,
        byRoles === 'true',
        name,
      );
    } catch (error) {
      throw new Error("Lỗi lấy đơn vị");

    }

  }

  /* ==========================================
     7. Lấy phòng ban theo flow (query mới)
  ========================================== */
  @Post('/organization-units-byFlow')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách phòng ban trong luồng xử lý (flow)' })
  async getOrgUnitsByFlow(
    @Body() payload: OrganizationUnitsByFlowDto,
    @EffectiveUser() userId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Req() req?: any,
  ) {
    try {
      const limit = parseInt(limitQuery || '100');
      const page = parseInt(pageQuery || '1');
      return this.usersService.getOrganizationUnitsByFlow(
        payload,
        userId,
        limit,
        page,
        name,
      );
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy phòng ban theo flow' + error.message);
    }
  }

  @Get('permissions/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Xem quyền của người dùng' })
  async getUserPermissions(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem quyền của người dùng ID: [${id}]`
      );
      // --- End Logging ---

      const data = await this.usersService.getUserPermissions(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/all')
  // @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Danh sách tất cả người dùng' })
  @ApiQuery({ name: 'email', required: false, description: 'Tìm kiếm theo email' })
  async allUsers(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách tất cả người dùng`
      );
      // --- End Logging ---

      queryParams.userId = userInfo;
      const data = await this.usersService.findAllUser(queryParams);
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

  @Get('list/all-by-role-scope')
  @ApiOperation({ summary: 'Lọc danh sách người dùng phân quyền theo vai trò (Lãnh đạo công ty/Lãnh đạo phòng/Cán bộ)' })
  async allUsersByRoleScope(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách người dùng theo phân quyền vai trò`
      );

      queryParams.userId = userInfo;
      const data = await this.usersService.findAllUserScoped(queryParams);
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

  @Get('/all-no-limit')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Danh sách tất cả người dùng không giới hạn limit' })
  async allUsersNoLimit(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách tất cả người dùng`
      );
      // --- End Logging ---

      const data = await this.usersService.findAllUserNoLimit();
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

  @Get('/leaders')
  @UseGuards(LeadersPermissionGuard)
  @ApiOperation({ summary: 'Danh sách tất cả lãnh đạo' })
  async allLeaders(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        'Truy cập danh sách lãnh đạo',
      );
      // --- End Logging ---

      const data = await this.usersService.findAllLeader(queryParams);

      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post()
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Tạo mới người dùng' })
  @ApiBody({ type: CreateUserDto })
  async create(@Req() req: Request, @Body() createUserDto: CreateUserDto, @Res() res: Response) {
    try {
      // --- Logging ---
      // const userInfo = await this.userLogHelper.getUserLogInfo((req as any).user.userId, req);
      const userInfo = (req as any).user.userId;
      const ipAddress = (req as any).socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'POST',
        `Tạo mới người dùng: ${createUserDto.username}`
      );
      // --- End Logging ---

      const newUser = await this.usersService.create(createUserDto);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        data: newUser,
      });
    } catch (error) {
      return res.status(error.status || HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Lỗi server',
        error: error.message
      });
    }
  }

  @Delete(':userId/unit/:unitId')
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Xóa người dùng khỏi đơn vị' })
  @ApiParam({ name: 'userId', required: true })
  @ApiParam({ name: 'unitId', required: true })
  async removeFromUnit(
    @Param('userId') userId: string,
    @Param('unitId') unitId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'DELETE',
        `Xóa người dùng [${userId}] khỏi đơn vị [${unitId}]`
      );
      // --- End Logging ---
      await this.usersService.removeFromUnit(userId, unitId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa người dùng khỏi đơn vị thành công',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete(':id')
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiParam({ name: 'id', required: true })
  async delete(@Param('id') userId: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'DELETE',
        `Xóa người dùng ID: [${userId}]`
      );
      // --- End Logging ---

      await this.usersService.delete(userId);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa người dùng thành công',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('by-process-role')
  @UseGuards(UsersByProcessRoleGuard)
  @ApiOperation({ summary: 'Tìm người dùng theo vai trò quy trình' })
  @ApiQuery({ name: 'processKey', required: true })
  @ApiQuery({ name: 'roleCode', required: true })
  @ApiQuery({ name: 'name', required: false })
  async findUsersByProcessRole(
    @Query('processKey') processKey: string,
    @Query('roleCode') roleCode: string,
    @Query() queryParams: { page?: number; limit?: number; name?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Tìm người dùng theo vai trò quy trình: [${processKey}/${roleCode}]`
      );
      // --- End Logging ---

      const data = await this.usersService.findUsersByProcessRole(
        processKey,
        roleCode,
        queryParams,
      );
      return res.status(HttpStatus.OK).json({ success: true, ...data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('report-signers')
  @ApiOperation({ summary: 'Tìm người ký tờ trình' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'roleCode', required: false })
  @ApiQuery({ name: 'processKey', required: false })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  async findReportSigners(
    @Query() queryParams: { page?: number; limit?: number, roleCode?: string; processKey?: string; name?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `TTìm người ký tờ trình`
      );
      // --- End Logging ---

      const data = await this.usersService.findReportSigners(queryParams, userInfo);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('assignedReceiver')
  @ApiOperation({ summary: 'Tìm người nhận được chỉ định' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'roleCode', required: false })
  async findassignedReceiver(
    @Query() queryParams: { page?: number; limit?: number, roleCode?: string, name: string, queryParams?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Tìm người nhận được chỉ định`
      );
      // --- End Logging ---

      const data = await this.usersService.findassignedReceiver(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('incomingRecipient')
  @ApiOperation({ summary: 'Tìm người nhận văn bản đến' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'roleCode', required: false })
  async findincomingRecipient(
    @Query() queryParams: { page?: number; limit?: number, roleCode?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Tìm người nhận văn bản đến`
      );
      // --- End Logging ---

      const data = await this.usersService.findincomingRecipient(queryParams);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('draft-signers')
  @ApiOperation({ summary: 'Tìm người ký dự thảo' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'processKey', required: false })
  async findDraftSigners(
    @Query() queryParams: { page?: number; limit?: number, processKey?: string },
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Tìm người ký dự thảo`
      );
      // --- End Logging ---

      const data = await this.usersService.findDraftSigners(queryParams, userInfo);
      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('draft-signers/:id')
  @ApiOperation({ summary: 'Xem chi tiết người ký dự thảo' })
  @ApiParam({ name: 'id', required: true })
  async findDraftSignerDetail(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem chi tiết người ký dự thảo ID: [${id}]`
      );
      // --- End Logging ---

      const data = await this.usersService.findById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/authorized-permissions')
  @ApiOperation({ summary: 'Lấy danh sách quyền được người khác ủy quyền' })
  async getAuthorizedPermissions(@Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy quyền được ủy quyền`
      );
      // --- End Logging ---

      const userId = req?.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Không xác định được người dùng.',
        });
      }
      const data = await this.usersService.getAuthorizedPermissionsV1(userId);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('/data-profile/:id')
  @ApiOperation({ summary: 'Xem thông tin hồ sơ người dùng' })
  @ApiParam({ name: 'id', required: true })
  async findRoleInformationById(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem thông tin hồ sơ người dùng ID: [${id}]`
      );
      // --- End Logging ---

      const data = await this.usersService.findRoleInformationById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }


  @Put(':id/block')
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Khóa người dùng' })
  @ApiParam({ name: 'id', required: true })
  async blockUser(@Param('id') userId: string, @Req() req: any, @Res() res: Response): Promise<any> {
    try {
      // --- Logging ---
      const currentUserId = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        currentUserId,
        ipAddress,
        'PUT',
        `Khóa người dùng ID: [${userId}]`
      );
      // --- End Logging ---
      const result = await this.usersService.blockUser(userId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Put(':id/unBlock')
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Mở khóa người dùng' })
  @ApiParam({ name: 'id', required: true })
  async unBlockUser(@Param('id') userId: string, @Req() req: any, @Res() res: Response): Promise<any> {
    try {
      // --- Logging ---
      const currentUserId = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        currentUserId,
        ipAddress,
        'PUT',
        `Mở khóa người dùng ID: [${userId}]`
      );
      // --- End Logging ---
      const result = await this.usersService.unBlockUser(userId);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Người dùng cập nhật thông tin cá nhân' })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto, @Req() req: any, @Res() res: Response): Promise<any> {
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      if (!userInfo) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Không xác định được thông tin người dùng đăng nhập',
        });
      }

      // --- Logging ---
      await this.logAction(
        userInfo,
        ipAddress,
        'PATCH',
        `Người dùng cập nhật thông tin cá nhân`
      );
      // --- End Logging ---

      const data = await this.usersService.Update(userInfo, updateProfileDto as UpdateUserDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  @UseGuards(StaticAdminPermissionGuard)
  @ApiOperation({ summary: 'Cập nhật người dùng' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateUserDto })
  async update(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any, @Res() res: Response): Promise<any> {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'PATCH',
        `Cập nhật người dùng ID: [${userId}]`
      );
      // --- End Logging ---

      const data = await this.usersService.Update(userId, updateUserDto);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Put(':id/password')
  @UseGuards(ChangePasswordGuard)
  @ApiOperation({ summary: 'Thay đổi mật khẩu người dùng' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Param('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<any> {
    try {
      const currentUserId = req?.user?.userId;

      // Kiểm tra xem user có phải là admin (role ADMIN hoặc static permission ADMIN)
      let isAdmin = false;
      if (currentUserId) {
        const roleInfo = await this.usersService.findProcessRoleInfoById(currentUserId);
        const isAdminRole = roleInfo?.roleCodes?.includes('ADMIN');
        const hasAdminPermission = checkIsAdmin(roleInfo?.staticPermissions);
        isAdmin = isAdminRole || hasAdminPermission;
      }

      const result = await this.usersService.changePassword(
        userId,
        changePasswordDto,
        isAdmin,
      );
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get('user-by-code')
  @ApiOperation({ summary: 'Danh sách người dùng' })
  async listUser(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách người dùng`
      );
      // --- End Logging ---

      const data = await this.usersService.findUsersByUserId(userInfo, queryParams);
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


  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng' })
  async list(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách người dùng`
      );
      // --- End Logging ---

      const data = await this.usersService.findAll(queryParams);
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

  // Api lấy ra dữ liệu người dùng và cả nhóm người dùng
  @Get('principals')
  @ApiOperation({ summary: 'Danh sách người dùng' })
  async listPrincipals(
    @Query() queryParams: Record<string, string>,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Truy cập danh sách người dùng`
      );
      // --- End Logging ---

      const data = await this.usersService.findAllPrincipals(queryParams);
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

  /* ==========================================
     2. Công việc đang chờ xử lý
  ========================================== */
  @Get(':userId/pending')
  @ApiOperation({ summary: 'Danh sách công việc đang chờ xử lý của người dùng' })
  @ApiParam({ name: 'userId' })
  getPendingItems(
    @Param('userId') userId: string,
    @Query() query: GetPendingItemsDto,
  ) {
    const roles = (query.roles || '').split(',').filter(Boolean);
    return this.usersService.getPendingItems(
      userId,
      query.includeUnassigned === 'true',
      roles,
      query.nodeIdFilter,
    );
  }

  /* ==========================================
     3. Công việc đã xử lý
  ========================================== */
  @Get(':userId/processed')
  @ApiOperation({ summary: 'Danh sách văn bản đã xử lý gần đây' })
  @ApiParam({ name: 'userId' })
  getProcessedItems(
    @Param('userId') userId: string,
    @Query('since') since?: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getProcessedItems(userId, {
      since,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':documentId/document-users')
  @ApiOperation({ summary: 'Danh sách người dùng trong luồng xử lý của một văn bản' })
  @ApiParam({ name: 'documentId', required: true, description: 'ID của văn bản' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  @UseGuards(DocumentPermissionGuard)
  async getDocumentUsers(
    @Req() req: any,
    @Param('documentId') documentId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
  ) {
    if (!documentId) {
      throw new BadRequestException('documentId is required');
    }

    // --- Logging ---
    try {
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Lấy người dùng theo văn bản ID: [${documentId}]`
      );
    } catch (logError) {
      console.error('Logging failed for getDocumentUsers:', logError);
    }
    // --- End Logging ---

    const userId = req?.user?.userId;
    const limit = parseInt(limitQuery || '10');
    const page = parseInt(pageQuery || '1');

    return this.usersService.getDocumentUsers(userId, documentId, limit, page, name);
  }

  @Get('simple-users')
  simpleUsers(
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '9999999',
    @Query('excludeSelf') excludeSelf?: string,
  ) {
    return this.usersService.getSimpleUsersSQL({
      q,
      page: Number(page),
      limit: Number(limit),
      excludeSelf,
    });
  }


  @Get('/get-signers-by-type')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Tìm người ký dự thảo' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'processKey', required: false })
  @ApiQuery({ name: 'name', required: false }) // Đảm bảo khai báo Swagger nhận diện
  async findSignersByType(
    @Query() queryParams: { page?: number; limit?: number; processKey?: string; typeSign: string; name?: string }, // Thêm name vào kiểu dữ liệu nhận diện
    @Req() req: any,
    @Res() res: Response,
    @EffectiveUser() effectiveUserId?: string,
  ) {
    try {
      const userInfo = effectiveUserId || req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Tìm người ký theo loại`
      );

      // Truyền nguyên vẹn queryParams (bao gồm cả name) sang Service
      const data = await this.usersService.findSignersByType(queryParams, userInfo);

      return res.status(HttpStatus.OK).json({
        success: true,
        ...data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // Dynamic routes with :id must come last to avoid conflicts
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết người dùng' })
  @ApiParam({ name: 'id', required: true })
  async findById(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // --- Logging ---
      const userInfo = req?.user?.userId;
      const ipAddress = req?.socket?.remoteAddress || 'Unknown';
      // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
      await this.logAction(
        userInfo,
        ipAddress,
        'GET',
        `Xem chi tiết người dùng ID: [${id}]`
      );
      // --- End Logging ---

      const data = await this.usersService.findById(id);
      if (!data) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          data: null,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: data,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  // @Post('/sync-from-mongo')
  // @ApiResponse({ status: 500, description: 'Lỗi server khi đồng bộ.' })
  // async syncFromMongo(@Res() res: Response) {
  //   try {
  //     console.log('Starting synchronization from MongoDB...');
  //     const result = await this.usersService.syncFromMongo();
  //     console.log('Synchronization finished.', result);
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: 'Đồng bộ hoàn tất.',
  //       data: result,
  //     });
  //   } catch (error) {
  //     console.error('Synchronization failed:', error);
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }

  @Get(':taskId/task-users')
  @ApiOperation({ summary: 'Danh sách người dùng trong công việc' })
  @ApiParam({ name: 'taskId', required: true, description: 'ID của văn bản' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
  async getUsersForTask(
    @Req() req: any,
    @Param('taskId') taskId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
  ) {
    if (!taskId) {
      throw new BadRequestException('taskId is required');
    }

    const userId = req?.user?.userId;
    const limit = parseInt(limitQuery || '10000');
    const page = parseInt(pageQuery || '1');

    return this.usersService.getUsersForTask(userId, taskId, limit, page, name);
  }


  @Get('get-token/sign')
  @CheckAuthority(AuthorityStages.DOCUMENT_SIGN)
  @ApiOperation({ summary: 'Tạo token cho việc ký' })
  async createTokenForSign(
    @Req() req: any,
    @Res() res: Response,
    @EffectiveUser() userId: string,
  ) {
    try {
      // const user = req?.user;
      // const userId = user?.userId || user?.id;

      if (!userId) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Không xác định được user để tạo token',
        });
      }

      const keySign = await this.repo.getSigningConfig();
      const secret = keySign?.secretSign || process.env.SECRET_SIGN;
      if (!secret) {
        console.error('SECRET_SIGN is not configured');
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Server chưa cấu hình SECRET_SIGN',
        });
      }
      const expiresIn = keySign?.expiresIn || (process.env.EXPIRES_IN_TOKEN_SIGN as string) || '300s';

      const data = await this.usersService.findById(userId);
      // Sign a minimal payload to avoid serializing the full request user object
      const payload = {
        userId: data.id,
        username: data.username,
        email: data.emailUser,
        phoneNumber: data.phoneNumberUser || null,
        iss: process.env.REDIRECT_URI_FE,
        sub: 'service:document-service',
        aud: ['signing-service']
      };
      const token = jwt.sign(payload, secret, { expiresIn } as any);

      return res.status(HttpStatus.OK).json({
        success: true,
        data: { token },
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Post('/get-users-suggestion')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách người dùng trong luồng xử lý văn bản' })
  @ApiBody({ type: GetRolesDto })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false })
  async getUserSuggestion(
    @Body() payload: any,
    @EffectiveUser() userId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Req() req?: any,
  ) {
    try {
      const limit = parseInt(limitQuery || '500');
      const page = parseInt(pageQuery || '1');

      const effectiveUserId = userId || req?.user?.userId;

      return this.usersService.getUserSuggestion(
        effectiveUserId,
        payload,
        limit,
        page,
        name,
      );
    } catch (error) {
      throw new Error("Lỗi lấy user" + error.message);

    }
  }
  @Post('/get-users-suggestion-handling')
  @CheckAuthority(AuthorityStages.DOCUMENT_APPROVAL)
  @ApiOperation({ summary: 'Danh sách người dùng trong luồng xử lý văn bản' })
  @ApiBody({ type: GetRolesDto })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'name', required: false })
  async getUserSuggestionHandling(
    @Body() payload: any,
    @EffectiveUser() userId: string,
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Req() req?: any,
  ) {
    try {
      const limit = parseInt(limitQuery || '1000');
      const page = parseInt(pageQuery || '1');

      const effectiveUserId = userId || req?.user?.userId;

      return this.usersService.getUserSuggestionHandling(
        effectiveUserId,
        payload,
        limit,
        page,
        name,
      );
    } catch (error) {
      throw new Error("Lỗi lấy user" + error.message);

    }
  }


  @Post('/get-ou-signers-by-type')
  @ApiOperation({ summary: 'Danh sách phòng ban trong luồng xử lý (flow)' })
  async getOuSignersByType(
    @Query('limit') limitQuery?: string,
    @Query('page') pageQuery?: string,
    @Query('name') name?: string,
    @Body() payload?: any,
  ) {
    const limit = parseInt(limitQuery || '100');
    const page = parseInt(pageQuery || '1');
    const { ids, processKey } = payload;
    return this.usersService.getOrganizationUnitsForUser(
      ids,
      processKey,
      name
    );
  }
}
