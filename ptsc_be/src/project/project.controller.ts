import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { CreateProjectDisbursementDto } from './dto/create-project-disbursement.dto';
import { UpdateProjectDisbursementDto } from './dto/update-project-disbursement.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { RequireProjectPermission } from './decorators/project-permission.decorator';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';
import { Roles } from 'src/oauth/decorator/roles.decorator';
import { ProcessKey } from 'src/oauth/decorator/process-key.decorator';

@ApiTags('Quản lý Dự án')
@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly systemLogService: SystemLogServiceSql,
  ) { }

  @Post()
  @ProcessKey('CVDAN')
  @ApiOperation({ summary: 'Tạo dự án mới' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async create(@Body() createProjectDto: CreateProjectDto, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.create(createProjectDto, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Dự án: Tạo dự án mới mã ${result.code}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_CREATE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Dự án: Tạo dự án mới - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_CREATE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách dự án với bộ lọc nâng cao' })
  async findAll(@Query() query: any, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.findAll(query, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Truy cập danh sách dự án`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Truy cập danh sách dự án - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_LIST',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get('all/options')
  @ApiOperation({ summary: 'Lấy danh sách tối giản toàn bộ dự án (id, code, name)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm theo tên hoặc mã dự án' })
  async getProjectOptions(@Query('search') search: string, @Query('name') name: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.projectService.getProjectOptions(search || name, userId);
  }

  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('Project')
  @Get(':id/all-members')
  @ApiOperation({ summary: 'Lấy toàn bộ thành viên dự án' })
  async getProjectMembers(@Param('id') id: string, @Query('name') name?: string) {
    return this.projectService.getProjectMembers(Number(id), name);
  }

  @Get(':id')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('Project')
  @ApiOperation({ summary: 'Lấy chi tiết dự án' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.findOne(+id, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem chi tiết dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_DETAIL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Xem chi tiết dự án ID ${id} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_DETAIL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateGeneralInfo')
  @ApiOperation({ summary: 'Cập nhật thông tin dự án' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.update(+id, updateProjectDto, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Dự án: Cập nhật dự án ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Dự án: Cập nhật dự án ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete()
  @ProcessKey('CVDAN')
  @ApiOperation({ summary: 'Xóa mềm nhiều dự án (status=3)' })
  async remove(@Body('ids') ids: number[], @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.remove(ids, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Dự án: Xóa mềm danh sách dự án: ${ids?.join(', ')}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_DELETE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Dự án: Xóa mềm danh sách dự án - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_DELETE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Post(':id/members')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateParticipants')
  @ApiOperation({ summary: 'Thêm thành viên vào dự án' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.addMember(
        +id,
        addMemberDto.userId,
        addMemberDto.role,
        userId
      );
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Dự án: Thêm thành viên ${addMemberDto.userId} với vai trò ${addMemberDto.role} vào dự án ID ${id}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_ADD_MEMBER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Dự án: Thêm thành viên vào dự án ID ${id} - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_ADD_MEMBER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete(':id/members/:userId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateParticipants')
  @ApiOperation({ summary: 'Xóa thành viên khỏi dự án' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.removeMember(+id, memberUserId, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Dự án: Xóa thành viên ${memberUserId} khỏi dự án ID ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_REMOVE_MEMBER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Dự án: Xóa thành viên khỏi dự án ID ${id} - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_REMOVE_MEMBER',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Patch(':id/members/:userId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateParticipants')
  @ApiOperation({ summary: 'Cập nhật vai trò thành viên trong dự án' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.updateMemberRole(
        +id,
        memberUserId,
        updateRoleDto.role,
        userId
      );
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Dự án: Cập nhật vai trò thành viên ${memberUserId} thành ${updateRoleDto.role} trong dự án ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_MEMBER_ROLE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Dự án: Cập nhật vai trò thành viên trong dự án ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_MEMBER_ROLE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }


  @Get(':id/permissions/:role')
  @UseGuards(BpmnRoleGuard)
  @Roles('canView')
  @ProcessKey('Project')
  @ApiOperation({ summary: 'Lấy quyền hạn của một vai trò trong dự án' })
  async getRolePermissions(
    @Param('id') id: string,
    @Param('role') role: string,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      if (!userId) {
        throw new ForbiddenException('Bạn cần đăng nhập để thực hiện hành động này');
      }

      // Kiểm tra xem người dùng có phải là quản lý dự án hay không
      // const isManager = await this.projectService.isProjectManager(+id, userId);
      // if (!isManager) {
      //   throw new ForbiddenException('Bạn không phải quản lý của dự án này. Chỉ quản lý mới có quyền xem thông tin phân quyền.');
      // }

      const result = await this.projectService.getRolePermissions(+id, role);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem quyền hạn vai trò ${role} trong dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_GET_ROLE_PERMISSIONS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Xem quyền hạn vai trò ${role} trong dự án ID ${id} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_GET_ROLE_PERMISSIONS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Patch(':id/permissions/:role')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('setPermissions')
  @ApiOperation({ summary: 'Cập nhật quyền hạn cho một vai trò trong dự án' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async updateRolePermissions(
    @Param('id') id: string,
    @Param('role') role: string,
    @Body() updatePermissionsDto: UpdateRolePermissionsDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.updateRolePermissions(
        +id,
        role,
        updatePermissionsDto,
        userId
      );
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Dự án: Cập nhật quyền hạn vai trò ${role} trong dự án ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_ROLE_PERMISSIONS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Dự án: Cập nhật quyền hạn vai trò ${role} trong dự án ID ${id} - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_ROLE_PERMISSIONS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get(':id/statistics/overview')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Thống kê tổng quan dự án' })
  async getOverviewStatistics(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getProjectOverviewStatistics(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem thống kê tổng quan dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_STATS_OVERVIEW',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/statistics/status-distribution')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Thống kê phân bố trạng thái công việc' })
  async getStatusDistribution(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getProjectTaskStatusDistribution(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem phân bố trạng thái công việc dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_STATS_STATUS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/statistics/performance')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Thống kê hiệu suất công việc' })
  async getPerformance(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getProjectTaskPerformance(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem hiệu suất công việc dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_STATS_PERFORMANCE',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/statistics/members')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Thống kê thành viên dự án' })
  async getMemberStatistics(
    @Param('id') id: string,
    @Query('search') search: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getProjectMemberStatistics(+id, search, +page, +limit);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem thống kê thành viên dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_STATS_MEMBERS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/disbursements')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateGeneralInfo')
  @ApiOperation({ summary: 'Thêm mới một đợt giải ngân cho dự án' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async createDisbursement(
    @Param('id') id: string,
    @Body() createDisbursementDto: CreateProjectDisbursementDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.createDisbursement(+id, createDisbursementDto, userId);
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Dự án: Tạo mới đợt giải ngân cho dự án ID ${id}, số tiền ${createDisbursementDto.disbursementAmount}`,
        method: 'POST',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_CREATE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'POST',
        details: `Lỗi: Dự án: Tạo mới đợt giải ngân - ${error.message}`,
        method: 'POST',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_CREATE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get(':id/disbursements/summary')
  // @UseGuards(ProjectPermissionGuard)
  // @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Lấy thông tin tóm tắt giải ngân của dự án' })
  async getDisbursementSummary(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getDisbursementSummary(+id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem thông tin tóm tắt giải ngân dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENT_SUMMARY',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Xem thông tin tóm tắt giải ngân - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENT_SUMMARY',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get(':id/disbursements')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Lấy danh sách giải ngân của dự án' })
  async getDisbursementList(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 25,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getDisbursementList(+id, +page, +limit);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem danh sách giải ngân dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENTS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Xem danh sách giải ngân - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENTS',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Get(':id/disbursements/:disbursementId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('viewAnalysis')
  @ApiOperation({ summary: 'Lấy chi tiết một đợt giải ngân' })
  async getDisbursementById(
    @Param('id') id: string,
    @Param('disbursementId') disbursementId: string,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.getDisbursementById(+disbursementId, +id);
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Dự án: Xem chi tiết giải ngân ID ${disbursementId} của dự án ID ${id}`,
        method: 'GET',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENT_DETAIL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Lỗi: Dự án: Xem chi tiết giải ngân ID ${disbursementId} - ${error.message}`,
        method: 'GET',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_GET_DISBURSEMENT_DETAIL',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Patch(':id/disbursements/:disbursementId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateGeneralInfo')
  @ApiOperation({ summary: 'Cập nhật thông tin đợt giải ngân' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, skipMissingProperties: false }))
  async updateDisbursement(
    @Param('id') id: string,
    @Param('disbursementId') disbursementId: string,
    @Body() updateDisbursementDto: UpdateProjectDisbursementDto,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.updateDisbursement(
        +disbursementId,
        +id,
        updateDisbursementDto,
        userId
      );
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Dự án: Cập nhật đợt giải ngân ID ${disbursementId} của dự án ID ${id}`,
        method: 'PATCH',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'PATCH',
        details: `Lỗi: Dự án: Cập nhật đợt giải ngân - ${error.message}`,
        method: 'PATCH',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_UPDATE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  @Delete(':id/disbursements/:disbursementId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission('updateGeneralInfo')
  @ApiOperation({ summary: 'Xóa mềm một đợt giải ngân' })
  async deleteDisbursement(
    @Param('id') id: string,
    @Param('disbursementId') disbursementId: string,
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    try {
      const result = await this.projectService.deleteDisbursement(+disbursementId, +id);
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Dự án: Xóa đợt giải ngân ID ${disbursementId} của dự án ID ${id}`,
        method: 'DELETE',
        status: 'SUCCESS',
        type: 'PROJECT',
        subType: 'PROJECT_DELETE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      await this.systemLogService.createLogFromSystem({
        action: 'DELETE',
        details: `Lỗi: Dự án: Xóa đợt giải ngân - ${error.message}`,
        method: 'DELETE',
        status: 'ERROR',
        type: 'PROJECT',
        subType: 'PROJECT_DELETE_DISBURSEMENT',
        userInfo: userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
}
