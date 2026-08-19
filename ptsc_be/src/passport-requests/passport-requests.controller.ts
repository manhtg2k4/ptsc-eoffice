import {
    Controller,
    Post,
    Get,
    Put,
    Patch,
    Delete,
    Body,
    Query,
    Param,
    Req,
    Res,
    UsePipes,
    ValidationPipe,
    NotFoundException,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BpmnRoleGuard } from 'src/oauth/bpmn-role.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { PassportRequestsService } from './passport-requests.service';
import { Roles } from 'src/oauth/decorator/roles.decorator';
import { ProcessKey } from 'src/oauth/decorator/process-key.decorator';
import { PassportEntity } from '../passports/entities/passport.entity';
import { CreatePassportRequestDto } from './dto/create-passport-request.dto';
import { UpdatePassportRequestDto } from './dto/update-passport-request.dto';
import { ListPassportRequestDto } from './dto/list-passport-request.dto';
import { CreatePassportPermissionDto } from './dto/create-passport-permission.dto';
import { UpdatePassportPermissionDto } from './dto/update-passport-permission.dto';
import { ListPassportPermissionDto } from './dto/list-passport-permission.dto';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';



const resolveFromList = (list: any[], idValue: string | null) => {
    if (!idValue) return null;
    const numId = Number(idValue);
    if (isNaN(numId)) return { id: null, name: idValue };
    const found = list.find((item: any) => item.id === numId);
    return found ? { id: found.id, name: found.name_vn } : { id: numId, name: idValue };
};

@ApiTags('Yêu cầu Mượn Hộ chiếu')
@ApiBearerAuth()
@Controller('passport-requests')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PassportRequestsController {
    constructor(
        private readonly service: PassportRequestsService,
        private readonly systemLogService: SystemLogServiceSql,
        @InjectRepository(PassportEntity, 'mssqlConnection')
        private readonly passportRepo: Repository<PassportEntity>,
    ) { }

    @Post('permissions/draft')
    @ApiOperation({ summary: 'Tạo bản nháp Phân quyền Hộ chiếu (Body có thể trống)' })
    async createPermissionDraft(
        @Body() createDto: CreatePassportPermissionDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo bản nháp phân quyền hộ chiếu`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_PERMISSIONS',
                subType: 'CREATE_DRAFT',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.createPermissionDraft(createDto);
    }

    /**
     * DELETE /api/passport-requests/permissions
     * Xóa nhiều bản ghi Phân quyền
     */
    @Delete('permissions/delete')
    @ApiOperation({ summary: 'Xóa nhiều bản ghi Phân quyền' })
    async deletePermission(
        @Body() body: { ids: string[] },
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa bản ghi phân quyền: ${body.ids?.join(', ')}`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: 'PASSPORT_PERMISSIONS',
                subType: 'DELETE_PERMISSION',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.deletePermission(body.ids);
    }

    /**
     * PATCH /api/passport-requests/permissions/:id
     * Cập nhật bản ghi Phân quyền
     */
    @Patch('permissions/:id')
    @ApiOperation({ summary: 'Cập nhật bản ghi Phân quyền' })
    async updatePermission(
        @Param('id') id: string,
        @Body() updateDto: UpdatePassportPermissionDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Cập nhật bản ghi phân quyền: ${id}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_PERMISSIONS',
                subType: 'UPDATE_PERMISSION',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.updatePermission(id, updateDto);
    }

    /**
     * GET /api/passport-requests/permissions
     * Lấy danh sách Phân quyền Hộ chiếu
     */
    @Get('permissions')
    @ApiOperation({ summary: 'Lấy danh sách Phân quyền Hộ chiếu' })
    async findAllPermissions(@Query() query: ListPassportPermissionDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Lấy danh sách phân quyền hộ chiếu, trang: ${query.page}, limit: ${query.limit}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_PERMISSIONS',
                subType: 'GET_LIST',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.findAllPermissions(query);
    }

    /**
     * GET /api/passport-requests/permissions/:id
     * Xem chi tiết Phân quyền Hộ chiếu
     */
    @Get('permissions/:id')
    @ApiOperation({ summary: 'Xem chi tiết Phân quyền Hộ chiếu' })
    async getPermissionDetail(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem chi tiết phân quyền: ${id}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_PERMISSIONS',
                subType: 'GET_DETAIL',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.getPermissionDetail(id);
    }

    /**
     * GET /api/passport-requests/borrowers?search=xxx
     * Fake API: Danh sách người mượn (thay thế HRM sau này)
     */
    @Get('borrowers')
    @ApiOperation({ summary: 'Lấy danh sách người mượn' })
    async getBorrowers(@Query('search') search: string, @Query('name') name: string) {
        const qb = this.passportRepo
            .createQueryBuilder('passport')
            .leftJoinAndSelect('passport.user', 'user')
            .select([
                'passport.id',
                'passport.userId',
                'passport.eofficeAccount',
                'passport.fullName',
                'passport.email',
                'passport.positionTitle',
                'passport.rank',
                'passport.unitName',
                'passport.departmentName',
                'passport.divisionName',
                'passport.passportNumber',
                'passport.createdAt',
                'user.id',
                'user.name',
                'user.username',
                'user.emailUser',
                'user.phoneNumberUser',
                'user.position',
                'user.organizationName',
                'user.organizationCode',
                'user.organizationType',
                'user.status',
                'passport.passportType',
            ])
            .where('passport.isDeleted = :isDeleted', { isDeleted: false })
            // Chỉ lấy passport mới nhất cho 1 user(fix lỗi trả về trùng user)
            .andWhere(`passport.id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY eoffice_account ORDER BY created_at DESC) AS rn
                    FROM passports
                    WHERE is_deleted = 0
                ) t WHERE t.rn = 1
            )`);

        if (search && search.trim() || name && name.trim()) {
            const keyword = `%${(search || name).trim()}%`;
            const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
            qb.andWhere(
                `(
                    passport.fullName ${collation} LIKE :keyword ${collation}
                    OR passport.eofficeAccount ${collation} LIKE :keyword ${collation}
                    OR passport.email ${collation} LIKE :keyword ${collation}
                    OR passport.passportNumber ${collation} LIKE :keyword ${collation}
                    OR user.name ${collation} LIKE :keyword ${collation}
                    OR user.username ${collation} LIKE :keyword ${collation}
                    OR user.emailUser ${collation} LIKE :keyword ${collation}
                )`,
                { keyword },
            );
        }

        const passports = await qb.orderBy('passport.createdAt', 'DESC').getMany();

        const data = passports.map((passport) => ({
            id: passport.id,
            passportId: passport.id,
            passportNumber: passport.passportNumber,
            passportType: passport.passportType,
            eofficeAccount: passport.eofficeAccount,
            nameVn: passport.fullName,
            email: passport.email,
            account: passport.user || null,
        }));

        return { statusCode: 200, data, total: data.length };
    }


    /**
     * GET /api/passport-requests/leaders?borrowerId=xxx
     * Fake API: Danh sách lãnh đạo (auto-fill theo người mượn + cho chọn thêm)
     */
    @Get('leaders')
    @ApiOperation({ summary: 'Lấy danh sách lãnh đạo' })
    async getLeaders(
        @Query('borrowerId') borrowerId: string,
        @Query('nameVn') nameVn?: string,
    ) {
        return this.service.getLeaderList(borrowerId, nameVn);
    }


    /**
     * GET /api/passport-requests/passports
     * Lấy danh sách hộ chiếu đang lưu trữ
     */
    @Get('passports')
    @ApiOperation({ summary: 'Lấy danh sách hộ chiếu đang lưu trữ' })
    async getPassports(
        @Query('search') search: string,
        @Query('eofficeAccount') eofficeAccount: string
    ) {
        const qb = this.passportRepo
            .createQueryBuilder('passport')
            .select([
                'passport.id',
                'passport.passportNumber',
                'passport.passportType',
                'passport.fullName',
                'passport.expiryDate',
                'passport.usageStatus',
                'passport.eofficeAccount',
                'passport.email',
                'passport.positionTitle',
                'passport.rank',
                'passport.unitName',
                'passport.departmentName',
                'passport.divisionName',
                'passport.createdAt',
            ])
            .where('passport.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('passport.usageStatus = :usageStatus', { usageStatus: 'STORING' });

        if (eofficeAccount && eofficeAccount.trim()) {
            qb.andWhere('passport.eofficeAccount = :eofficeAccount', { eofficeAccount: eofficeAccount.trim() });
        } else if (!search) {
            // Nếu không có eofficeAccount và không có search, trả về rỗng để tránh load quá nhiều
            return { statusCode: 200, data: [], total: 0 };
        }

        if (search && search.trim()) {
            qb.andWhere(`LOWER(ISNULL(passport.passportNumber, '')) LIKE :search`, {
                search: `%${search.trim().toLowerCase()}%`,
            });
        }

        const passports = await qb.orderBy('passport.createdAt', 'DESC').getMany();
        const data = passports.map((passport) => ({
            id: passport.id,
            passportId: passport.id,
            passportNumber: passport.passportNumber,
            passportType: passport.passportType,
            fullName: passport.fullName,
            eofficeAccount: passport.eofficeAccount,
            email: passport.email,
            position: passport.positionTitle,
            rank: passport.rank,
            unit: passport.unitName,
            department: passport.departmentName,
            division: passport.divisionName,
            expiryDate: passport.expiryDate,
            usageStatus: passport.usageStatus,
            label: `${passport.passportNumber} - ${passport.fullName || 'N/A'}`,
        }));

        return { statusCode: 200, data, total: data.length };
    }

    /**
     * GET /api/passport-requests/delegations
     * Fake API: Danh sách đoàn ra (tên đoàn, trưởng đoàn, chức vụ)
     */
    @Get('delegations')
    @ApiOperation({ summary: 'Danh sách nhân viên (cho đoàn ra)' })
    async getDelegations(@Query('nameVn') nameVn?: string) {
        return this.service.getDelegationUsers(nameVn);
    }


    /**
     * GET /api/passport-requests/delegation-leaders
     * Lấy danh sách trưởng đoàn (tất cả nhân viên)
     */
    @Get('delegation-leaders')
    @ApiOperation({ summary: 'Danh sách trưởng đoàn' })
    async getDelegationLeaders(@Query('nameVn') nameVn?: string) {
        return this.service.getDelegationLeaders(nameVn);
    }

    /**
     * GET /api/passport-requests/users?search=xxx
     * Lấy danh sách người dùng
     */
    @Get('users')
    @UseGuards(BpmnRoleGuard)
    @ApiOperation({ summary: 'Lấy danh sách người dùng' })
    async getUsers(
        @Req() req: any,
        @Query('nameVn') nameVn?: string,
        @Query('excludeIds') excludeIds?: string | string[],
    ) {
        const userId = req?.user?.userId || '';
        return this.service.getUsers(userId, nameVn, excludeIds);
    }

    /**
     * GET /api/passport-requests/users/:id/passports
     * Lấy danh sách hộ chiếu của một người dùng
     */
    @Get('users/:id/passports')
    @ApiOperation({ summary: 'Lấy danh sách hộ chiếu của một người dùng' })
    @ApiParam({ name: 'id', description: 'ID người dùng' })
    async getPassportsByUser(@Param('id') id: string) {
        return this.service.getPassportsByUserId(id);
    }


    /**
     * GET /api/passport-requests/delegation-leaders/:id
     * Fake API: Chi tiết trưởng đoàn
     */
    @Get('delegation-leaders/:id')
    @ApiOperation({ summary: 'Xem chi tiết trưởng đoàn (giả lập)' })
    async getDelegationLeaderById(@Param('id') id: string) {
        const leader = await this.service.getUserById(id);
        if (!leader) {
            throw new NotFoundException(`Không tìm thấy trưởng đoàn với ID: ${id}`);
        }
        return { statusCode: 200, data: leader };
    }


    /**
     * GET /api/passport-requests/borrowers/:id
     * Chi tiết người mượn
     */
    @Get('borrowers/:id')
    @ApiOperation({ summary: 'Xem chi tiết người mượn' })
    async getBorrowerById(@Param('id') id: string) {
        const passport = await this.passportRepo
            .createQueryBuilder('passport')
            .leftJoinAndSelect('passport.user', 'user')
            .select([
                'passport.id',
                'passport.userId',
                'passport.eofficeAccount',
                'passport.fullName',
                'passport.email',
                'passport.positionTitle',
                'passport.rank',
                'passport.unitName',
                'passport.departmentName',
                'passport.divisionName',
                'passport.passportNumber',
                'passport.passportType',
                'passport.birthday',
                'passport.gender',
                'passport.phoneNumber',
                'passport.identificationCard',
                'passport.address',
                'passport.nationality',
                'passport.issueDate',
                'passport.expiryDate',
                'passport.issuePlace',
                'passport.usageStatus',
                'passport.createdAt',
                'passport.updatedAt',
                'user.id',
                'user.name',
                'user.username',
                'user.emailUser',
                'user.phoneNumberUser',
                'user.position',
                'user.organizationName',
                'user.organizationCode',
                'user.organizationType',
                'user.status',
            ])
            .where('passport.id = :id', { id })
            .andWhere('passport.isDeleted = :isDeleted', { isDeleted: false })
            .getOne();

        if (!passport) {
            throw new NotFoundException(`Không tìm thấy người mượn với ID: ${id}`);
        }

        return {
            statusCode: 200,
            data: {
                id: passport.id,
                passportId: passport.id,
                passportNumber: passport.passportNumber,
                passportType: passport.passportType,
                eofficeAccount: passport.eofficeAccount,
                nameVn: passport.fullName,
                email: passport.email,
                position: passport.positionTitle,
                rank: passport.rank,
                unit: passport.unitName,
                department: passport.departmentName,
                division: passport.divisionName,
                birthday: passport.birthday,
                gender: passport.gender,
                phoneNumber: passport.phoneNumber,
                identificationCard: passport.identificationCard,
                address: passport.address,
                nationality: passport.nationality,
                issueDate: passport.issueDate,
                expiryDate: passport.expiryDate,
                issuePlace: passport.issuePlace,
                usageStatus: passport.usageStatus,
                userId: passport.userId,
                account: passport.user || null,
                defaultLeader: null,
            },
        };
    }

    /**
     * GET /api/passport-requests/leaders/:id
     * Chi tiết lãnh đạo
     */
    async getLeaderById(@Param('id') id: string) {
        const leader = await this.service.getUserById(id);
        if (!leader) {
            throw new NotFoundException(`Không tìm thấy lãnh đạo với ID: ${id}`);
        }
        return {
            statusCode: 200,
            data: {
                ...leader,
                subordinatesCount: 0,
                subordinates: [],
            },
        };
    }



    /**
     * GET /api/passport-requests/passports/:id
     * Chi tiết hộ chiếu đang lưu trữ
     */
    @Get('passports/:id')
    @ApiOperation({ summary: 'Xem chi tiết hộ chiếu đang lưu trữ' })
    async getPassportById(@Param('id') id: string) {
        const passport = await this.passportRepo
            .createQueryBuilder('passport')
            .select([
                'passport.id',
                'passport.userId',
                'passport.eofficeAccount',
                'passport.fullName',
                'passport.email',
                'passport.positionTitle',
                'passport.birthday',
                'passport.gender',
                'passport.identificationCard',
                'passport.phoneNumber',
                'passport.rank',
                'passport.unitName',
                'passport.departmentName',
                'passport.divisionName',
                'passport.address',
                'passport.nationality',
                'passport.passportNumber',
                'passport.passportType',
                'passport.issueDate',
                'passport.expiryDate',
                'passport.issuePlace',
                'passport.countriesVisited',
                'passport.usageStatus',
                'passport.createdAt',
                'passport.updatedAt',
            ])
            .where(
                new Brackets((qb) => {
                    qb.where('passport.id = :id', { id })
                        .orWhere('passport.passportNumber = :passportNumber', { passportNumber: id });
                }),
            )
            .andWhere('passport.isDeleted = :isDeleted', { isDeleted: false })
            // .andWhere('passport.usageStatus = :usageStatus', { usageStatus: 'STORING' })
            .getOne();

        if (!passport) {
            throw new NotFoundException(
                `Không tìm thấy hộ chiếu đang lưu trữ với ID hoặc số hộ chiếu: ${id}`,
            );
        }

        return {
            statusCode: 200,
            data: {
                id: passport.id,
                passportId: passport.id,
                passportNumber: passport.passportNumber,
                passportType: passport.passportType,
                fullName: passport.fullName,
                eofficeAccount: passport.eofficeAccount,
                email: passport.email,
                position: passport.positionTitle,
                birthday: passport.birthday,
                gender: passport.gender,
                identificationCard: passport.identificationCard,
                phoneNumber: passport.phoneNumber,
                rank: passport.rank,
                unit: passport.unitName,
                department: passport.departmentName,
                division: passport.divisionName,
                address: passport.address,
                nationality: passport.nationality,
                issueDate: passport.issueDate,
                expiryDate: passport.expiryDate,
                issuePlace: passport.issuePlace,
                countriesVisited: passport.countriesVisited,
                usageStatus: passport.usageStatus,
                userId: passport.userId,
                createdAt: passport.createdAt,
                updatedAt: passport.updatedAt,
            },
        };
    }

    /**
     * GET /api/passport-requests/export-excel
     * Xuất file Excel báo cáo thống kê đoàn ra
     */
    @Get('export-excel')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Xuất file Excel báo cáo thống kê đoàn ra' })
    async exportExcel(@Query() query: ListPassportRequestDto, @Req() req: any, @Res() res: Response) {
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'EXPORT',
                details: `Xuất Excel báo cáo thống kê đoàn ra`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'EXPORT_EXCEL_DELEGATION',
                userInfo: req?.user?.userId || '',
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const userId = req?.user?.userId || '';
        const { buffer, filename } = await this.service.exportDelegationStatisticsExcel(query, userId);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
    }

    /**
     * GET /api/passport-requests
     * Danh sách tất cả yêu cầu mượn hộ chiếu (Lọc theo vai trò và sự tham gia)
     */
    @Get()
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Lấy tất cả danh sách yêu cầu mượn hộ chiếu' })
    async findAll(@Query() query: ListPassportRequestDto, @Req() req: any) {
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập danh sách mượn hộ chiếu, trang: ${query.page}, limit: ${query.limit}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: req?.user?.userId || '',
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const userId = req?.user?.userId || '';
        return this.service.findAll(query, userId);
    }

    /**
     * GET /api/passport-requests/status-counts
     * Đếm số lượng theo trạng thái
     */
    @Get('status-counts')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng yêu cầu theo các trạng thái' })
    async getStatusCounts(@Req() req: any) {
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập thống kê trạng thái yêu cầu mượn hộ chiếu`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: req?.user?.userId || '',
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const userId = req?.user?.userId || '';
        return this.service.getStatusCounts(userId);
    }

    /**
     * GET /api/passport-requests/approval
     * Danh sách yêu cầu chờ phê duyệt (dành cho Chỉ huy đơn vị)
     */
    @Get('approval')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu chờ phê duyệt (Chỉ huy đơn vị)' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findAllForApproval(@Query() query: ListPassportRequestDto, @Req() req: any) {
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập danh sách yêu cầu chờ phê duyệt, trang: ${query.page}, limit: ${query.limit}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: req?.user?.userId || '',
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const userId = req?.user?.userId || '';
        return this.service.findAllForApproval(query, userId);
    }

    @Get('count-approval')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng yêu cầu chờ phê duyệt' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async countAllForApproval(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countAllForApproval(query, userId);
        return { statusCode: 200, data: count };
    }

    /**
     * PATCH /api/passport-requests/:id/approve
     * Phê duyệt yêu cầu
     */
    @Patch(':id/approve')
    @UseGuards(BpmnRoleGuard)
    @Roles('canApprove')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Phê duyệt yêu cầu' })
    async approve(
        @Param('id') id: string,
        @Body('approvalReason') approvalReason: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Phê duyệt yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.approve(id, userId, approvalReason, ipAddress);
    }

    /**
     * PATCH /api/passport-requests/:id/reject
     * Từ chối yêu cầu (bắt buộc nhập lý do)
     */
    @Patch(':id/reject')
    @UseGuards(BpmnRoleGuard)
    @Roles('canReject')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Từ chối yêu cầu' })
    async reject(
        @Param('id') id: string,
        @Body('approvalReason') approvalReason: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Từ chối yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.reject(id, approvalReason, userId, ipAddress);
    }

    // ===========================================================
    // USERS TRONG LUỒNG
    // ===========================================================

    /**
     * GET /api/passport-requests/flow-users?roleCode=TRUONG_PHONG
     * Lấy danh sách người dùng có thể xử lý trong luồng PassportRequest
     * - Không truyền roleCode → trả về tất cả roles + users
     * - Truyền roleCode → chỉ lấy users của role đó
     */
    @Get('flow-users')
    @ApiOperation({ summary: 'Lấy danh sách người có thể xử lý trong luồng' })
    async getFlowUsers(
        @Query('roleCode') roleCode: string,
        @Query('name') name: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Req() req: any
    ) {
        const userId = req?.user?.userId || '';
        return this.service.getFlowUsers(
            userId,
            roleCode || undefined,
            name || undefined,
            page ? +page : undefined,
            limit ? +limit : undefined
        );
    }

    // ===========================================================
    // DANH SÁCH THEO TRẠNG THÁI
    // ===========================================================

    /**
     * GET /api/passport-requests/list/wait-commander
     * Chờ chỉ huy VP chuyển xử lý (dành cho Chỉ huy VP)
     */
    @Get('list/wait-commander')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách chờ chỉ huy VP chuyển xử lý' })
    async findAllWaitCommander(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllWaitCommander(query, userId);
    }

    @Get('list/count-wait-commander')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng chờ chỉ huy VP' })
    async countPRWaitCommander(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRWaitCommander(query, userId);
        return { statusCode: 200, data: count };
    }
    /**
     * GET /api/passport-requests/list/wait-receive
     * Chờ tiếp nhận & bàn giao HC (dành cho Bộ phận chuyên trách)
     */
    @Get('list/wait-receive')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách chờ tiếp nhận & bàn giao (Chuyên trách)' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findAllWaitReceive(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllWaitReceive(query, userId);
    }

    /**
     * GET /api/passport-requests/list/in-use
     * Đang sử dụng (của người tạo)
     */
    @Get('list/in-use')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu mượn hộ chiếu đang sử dụng' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findAllInUse(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllInUse(query, userId);
    }

    @Get('list/count-in-use')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng đang sử dụng' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async countPRInUse(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRInUse(query, userId);
        return { statusCode: 200, data: count };
    }

    /**
     * GET /api/passport-requests/list/completed
     * Hoàn tất (của người tạo)
     */
    @Get('list/completed')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu đã hoàn tất' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findAllCompleted(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllCompleted(query, userId);
    }

    @Get('list/count-completed')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng hoàn tất' })
    async countPRCompleted(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRCompleted(query, userId);
        return { statusCode: 200, data: count };
    }

    /**
     * GET /api/passport-requests/list/rejected
     * Từ chối (của người tạo)
     */
    @Get('list/rejected')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu bị từ chối' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findAllRejected(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllRejected(query, userId);
    }

    @Get('list/count-rejected')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng bị từ chối' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async countPRRejected(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRRejected(query, userId);
        return { statusCode: 200, data: count };
    }

    /**
     * GET /api/passport-requests/list/cancelled
     * Đã hủy (của người tạo)
     */
    @Get('list/cancelled')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu đã hủy' })
    async findAllCancelled(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findAllCancelled(query, userId);
    }

    @Get('list/count-cancelled')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng đã hủy' })
    async countPRCancelled(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRCancelled(query, userId);
        return { statusCode: 200, data: count };
    }

    // @Get('list/count-all')
    // @UseGuards(BpmnRoleGuard)
    // @Roles('canView')
    // @ProcessKey('PassportRequest')
    // @ApiOperation({ summary: 'Đếm tất cả các yêu cầu hộ chiếu liên quan' })
    // async countPRAll(@Query() query: ListPassportRequestDto, @Req() req: any) {
    //     const userId = req?.user?.userId || '';
    //     const count = await this.service.countPRAll(query, userId);
    //     return { statusCode: 200, data: count };
    // }

    // ===========================================================
    // ACTION: Chuyển xử lý / Bàn giao / Hoàn trả
    // ===========================================================

    /**
     * PATCH /api/passport-requests/:id/commander-transfer
     * Chỉ huy chuyển xử lý (truyền handlerUserId = người nhận)
     */
    @Patch(':id/commander-transfer')
    @UseGuards(BpmnRoleGuard)
    @Roles('canApprove')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Chỉ huy chuyển xử lý' })
    async commanderTransfer(
        @Param('id') id: string,
        @Body() body: any,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        // Hỗ trợ cả 2 tên field: handlerUserId (chuẩn) và handleUserId (frontend gửi)
        const handlerUserId = body?.handlerUserId || body?.handleUserId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Chỉ huy chuyển xử lý yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.commanderTransfer(id, handlerUserId || userId, userId);
    }

    /**
     * PATCH /api/passport-requests/:id/commander-reject
     * Chỉ huy từ chối yêu cầu
     */
    @Patch(':id/commander-reject')
    @UseGuards(BpmnRoleGuard)
    @Roles('canReject')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Chỉ huy từ chối yêu cầu' })
    async commanderReject(
        @Param('id') id: string,
        @Body('approvalReason') approvalReason: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Chỉ huy từ chối yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.commanderReject(id, approvalReason, userId);
    }

    /**
     * PATCH /api/passport-requests/:id/specialist-reject
     * Bộ phận chuyên trách từ chối yêu cầu (Bước 5 trong quy trình)
     */
    @Patch(':id/specialist-reject')
    @UseGuards(BpmnRoleGuard)
    @Roles('canReject')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Bộ phận chuyên trách từ chối' })
    async specialistReject(
        @Param('id') id: string,
        @Body('approvalReason') approvalReason: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Bộ phận chuyên trách từ chối yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.specialistReject(id, approvalReason, userId);
    }

    /**
     * PATCH /api/passport-requests/:id/receive
     * Bộ phận chuyên trách tiếp nhận yêu cầu
     */
    @Patch(':id/receive')
    @UseGuards(BpmnRoleGuard)
    @Roles('canApprove')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Tiếp nhận yêu cầu' })
    async receive(@Param('id') id: string, @Body('approvalReason') approvalReason: string, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH', details: `Tiếp nhận yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.receive(id, userId, approvalReason);
    }

    /**
     * PATCH /api/passport-requests/:id/handover
     * Bộ phận chuyên trách bàn giao hộ chiếu
     */
    @Patch(':id/handover')
    @UseGuards(BpmnRoleGuard)
    @Roles('canApprove')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Bàn giao hộ chiếu' })
    async handover(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH', details: `Bàn giao HC cho yêu cầu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.handover(id, userId);
    }

    /**
     * PATCH /api/passport-requests/:id/return-passport
     * Người mượn hoàn trả hộ chiếu
     */
    @Patch(':id/return-passport')
    @UseGuards(BpmnRoleGuard)
    @Roles('canUpdate')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Người mượn hoàn trả hộ chiếu' })
    async returnPassport(
        @Param('id') id: string,
        @Body('returnNote') returnNote: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH', details: `Hoàn trả HC cho yêu cầu: ${id}`,
                method: 'PATCH', status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS', subType: 'PASSPORT_REQUESTS',
                userInfo: userId, ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) { console.error('Lỗi ghi log:', error); }
        return this.service.returnPassport(id, userId, returnNote);
    }

    /**
     * GET /api/passport-requests/:id/history
     * Xem lịch sử xử lý của yêu cầu
     */
    @Get(':id/history')
    @ApiOperation({ summary: 'Xem lịch sử xử lý của yêu cầu' })
    async findHistory(@Param('id') id: string) {
        return this.service.findHistory(id);
    }


    /**
     * POST /api/passport-requests
     * Tạo yêu cầu mới (cá nhân / đoàn ra)
     */
    @Post()
    @UseGuards(BpmnRoleGuard)
    @Roles('canCreate')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Tạo yêu cầu mượn hộ chiếu mới (cá nhân / đoàn ra)' })
    async create(@Body() createDto: CreatePassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo yêu cầu mượn hộ chiếu (${createDto.typeRequest || 'user'})`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.create(createDto, userId, ipAddress);
    }

    @Get('mine')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Danh sách yêu cầu của tôi (Lọc & Sắp xếp nâng cao)' })
    async findAllMine(@Query() query: any, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập danh sách "Yêu cầu của tôi" nâng cao, trang: ${query.page || 1}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS_MINE',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (e) { }
        return this.service.findAllMine(query, userId);
    }

    /**
     * GET /api/passport-requests/:id
     * Xem chi tiết yêu cầu mượn hộ chiếu theo ID
     */
    @Get(':id')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView', 'canUpdate', 'canApprove')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Xem chi tiết yêu cầu mượn hộ chiếu' })
    async findOne(@Param('id') id: string, @Req() req: any) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập chi tiết yêu cầu mượn hộ chiếu: ${id}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        return this.service.findOne(id, userId);
    }

    /**
     * PUT /api/passport-requests/:id
     * Chỉnh sửa yêu cầu (chỉ khi Chờ phê duyệt)
     */
    @Put(':id')
    @UseGuards(BpmnRoleGuard)
    @Roles('canUpdate')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Chỉnh sửa yêu cầu (khi Chờ phê duyệt)' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdatePassportRequestDto,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'PUT',
                details: `Chỉnh sửa yêu cầu mượn hộ chiếu: ${id}`,
                method: 'PUT',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.update(id, updateDto, userId, ipAddress);
    }



    @Get('count-wait-receive')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Đếm số lượng chờ tiếp nhận' })
    async countPRWaitReceive(@Query() params: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        const count = await this.service.countPRWaitReceive(params, userId);
        return { statusCode: 200, data: count };
    }

    /**
     * PATCH /api/passport-requests/soft-delete
     * Xóa mềm yêu cầu — hỗ trợ xóa 1 hoặc nhiều (giống passports module)
     */
    @Delete('soft-delete')
    @UseGuards(BpmnRoleGuard)
    @Roles('canDelete')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Xóa mềm nhiều yêu cầu mượn hộ chiếu' })
    async softDelete(
        @Body() body: { ids: string[] },
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa mềm yêu cầu mượn hộ chiếu: ${body.ids?.join(', ')}`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.softDelete(body.ids, userId, ipAddress);
    }

    /**
     * GET /api/passport-requests/:id/delegation-items
     * Lấy danh sách đoàn ra
     */
    @Get(':id/delegation-items')
    @ApiOperation({ summary: 'Lấy danh sách đoàn ra theo ID yêu cầu' })
    async getDelegationItems(@Param('id') id: string) {
        return this.service.getDelegationItems(id);
    }


    /**
     * DELETE /api/passport-requests/:id
     * Hủy yêu cầu (chỉ khi Chờ phê duyệt)
     */
    @Delete(':id')
    @UseGuards(BpmnRoleGuard)
    @Roles('canDelete')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Hủy yêu cầu' })
    async cancel(
        @Param('id') id: string,
        @Body('cancelReason') cancelReason: string,
        @Req() req: any,
    ) {
        const userId = req?.user?.userId || '';
        try {
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Hủy yêu cầu mượn hộ chiếu: ${id}`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'PASSPORT_REQUESTS',
                userInfo: userId,
                ipAddress: req?.socket?.remoteAddress || 'Unknown',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Lỗi ghi log:', error);
        }
        const ipAddress = req?.socket.remoteAddress || '127.0.0.1';
        return this.service.cancel(id, cancelReason, userId, ipAddress);
    }

    // =====================================================================
    // MY MONITORING ENDPOINTS
    // =====================================================================

    @Get('list/my-monitoring/pending')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đang chờ phê duyệt' })
    async findMyMonitoringPending(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringPending(query, userId);
    }

    @Get('list/my-monitoring/wait-commander')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đang chờ chỉ huy' })
    async findMyMonitoringWaitCommander(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringWaitCommander(query, userId);
    }

    @Get('list/my-monitoring/wait-receive')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đang chờ tiếp nhận' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findMyMonitoringWaitReceive(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringWaitReceive(query, userId);
    }

    @Get('list/my-monitoring/in-use')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đang sử dụng' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findMyMonitoringInUse(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringInUse(query, userId);
    }

    @Get('list/my-monitoring/completed')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đã hoàn tất' })
    async findMyMonitoringCompleted(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringCompleted(query, userId);
    }

    @Get('list/my-monitoring/rejected')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi bị từ chối' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findMyMonitoringRejected(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringRejected(query, userId);
    }

    @Get('list/my-monitoring/cancelled')
    @UseGuards(BpmnRoleGuard)
    @Roles('canView')
    @ProcessKey('PassportRequest')
    @ApiOperation({ summary: 'Yêu cầu của tôi đã hủy' })
    @ApiQuery({ type: ListPassportRequestDto, style: 'deepObject', explode: true })
    async findMyMonitoringCancelled(@Query() query: ListPassportRequestDto, @Req() req: any) {
        const userId = req?.user?.userId || '';
        return this.service.findMyMonitoringCancelled(query, userId);
    }

    // @Get('list/my-monitoring/count-all')
    // @UseGuards(BpmnRoleGuard)
    // @Roles('canView')
    // @ProcessKey('PassportRequest')
    // @ApiOperation({ summary: 'Đếm tất cả yêu cầu hộ chiếu của tôi' })
    // async countMyPassportAll(@Query() query: ListPassportRequestDto, @Req() req: any) {
    //     const userId = req?.user?.userId || '';
    //     const count = await this.service.countMyPassportAll(query, userId);
    //     return { statusCode: 200, data: count };
    // }

}


