import { Controller, Post, Get, Put, Delete, Body, Param, Req, Query, BadRequestException, ForbiddenException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/oauth/jwt.guard';
import { AuthorityGuard } from 'src/authority-documents';
import { AuthorityProcessService } from './authority-process.service';
import { CreateAuthorityProcessDto } from './dto/authority-process.create.dto';
import { UpdateAuthorityProcessDto } from './dto/authority-process.update.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { UsersService } from 'src/users/users.service';


@ApiTags('Uỷ quyền')
@UseGuards(JwtAuthGuard, AuthorityGuard)
@Controller('authority')
export class AuthorityProcessController {
  constructor(
    private readonly service: AuthorityProcessService,
    private readonly systemLogService: SystemLogServiceSql,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  async create(@Body() dto: CreateAuthorityProcessDto, @Req() req) {
    const userId = req.user?.userId;
    return this.service.createAuthorityProcess(dto, userId);
  }

  @Get('list')
  async listAuthorityProcessesDynamic(@Req() req: any, @Query() query: Record<string, any>) {
    const { page = '1', limit = '20', sort, search, processFn, ...filters } = query;
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
    const searchValue = search?.trim() || undefined;
    const userId = req?.userId || req?.user?.userId;

    // Check authorization: user must have 'DanhSachUyQuyen' permission
    if (userId) {
      const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
      const hasPermission = roleInfo?.roles?.includes('DanhSachUyQuyen') ||
        roleInfo?.roleCodes?.includes('DanhSachUyQuyen');
      if (!hasPermission) {
        throw new ForbiddenException('Bạn không có quyền truy cập màn danh sách ủy quyền');
      }
    }

    if (!userId) throw new BadRequestException('Không xác định được user'); try {
      await this.systemLogService.createLogFromSystem({
        action: 'GET',
        details: `Truy cập tra cứu quản lý quỷ quyền trang: ${query.page}, limit: ${query.limit}`,
        method: 'GET',
        status: 'SUCCESS',
        type: process.env.CLIENT_LOG || 'DHVBTC',
        subType: process.env.CLIENT_LOG || 'DHVBTC',
        userInfo: req?.user?.userId || "",
        ipAddress: req?.socket?.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Lỗi ghi log:', error);
    }
    return this.service.listAuthorityProcessesDynamic({
      pageNumber,
      pageSize,
      search: searchValue,
      filter: filters,
      sort: sort,
      processFn,
      userId
    });
  }

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Req() req,
  ) {
    const userId = req?.userId || req?.user?.userId;
    return this.service.getAuthorityProcessDetail(userId, id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAuthorityProcessDto, @Req() req) {
    const userId = req.user?.userId;
    return this.service.updateAuthorityProcess(id, dto, userId);
  }

  @Delete()
  async remove(@Body('ids') ids: string[] | string) {
    return this.service.deleteAuthorityProcesses(ids);
  }
}