import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    Res,
    HttpStatus,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { OrganizationUnitService } from './organization-unit-service-sql';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { OrganizationUnitEntity } from './organization-unit.entity';
import {
    CreateOrganizationUnitDto,
    UpdateOrganizationUnitDto,
} from '../organization-unit.dto';
import { ReturnError } from '../../utils/util';
import { QueryParams } from 'src/interfaces';
import { GetChildOrganizationsDto, GetChildOrganizationsResponseDto } from '../dto/get-child-organizations.dto';
import { EffectiveUser } from 'src/authority-documents';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { RoleByProcessGuard } from 'src/users/guards/role-by-process.guard';
@ApiTags('Organization Units (SQL)')
@Controller('organization-units') // Sử dụng một route khác để tránh xung đột
@UseGuards(RoleByProcessGuard)
export class OrganizationUnitControllerSql {
    constructor(private readonly organizationService: OrganizationUnitService) { }

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiOperation({ summary: 'Tạo một đơn vị tổ chức mới' })
    @ApiBody({ type: CreateOrganizationUnitDto })
    @ApiResponse({ status: 201, description: 'Tạo thành công.', type: OrganizationUnitEntity })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc mã đơn vị đã tồn tại.' })
    async create(
        @Body() createDto: CreateOrganizationUnitDto,
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.create(createDto);
            return res.status(HttpStatus.OK).json({
                success: true,
                data,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }

    @Get('by-task-role')
    async listByTaskRole(
        @Req() req: any,
        @Query() queryParams: Record<string, string>,
        @Res() res: Response,
    ) {
        try {
            //   await this.systemLogService.createLogFromSystem({
            //     action: 'GET',
            //     details: `Truy cập danh sách đơn vị theo vai trò công việc`,
            //     method: 'GET',
            //     status: 'SUCCESS',
            //     type: 'ORGANIZATION_UNIT',
            //     subType: 'ORGANIZATION_UNIT',
            //     userInfo: req?.user?.userId,
            //     ipAddress: req?.ip || 'Unknown',
            //     timestamp: new Date().toISOString(),
            //   });

            const data =
                await this.organizationService.findAllByTaskRole(queryParams);

            if (data?.data?.length > 0) {
                data.data = data.data.map((item) => ({
                    ...item,
                    name: `${item.name} - ${item.code}`,
                })) as typeof data.data;
            }

            return res.status(HttpStatus.OK).json({
                ...data,
                success: true,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách đơn vị tổ chức (phân trang, lọc, sắp xếp)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng trên một trang' })
    @ApiQuery({ name: 'filter', required: false, type: String, description: 'Lọc theo các trường, ví dụ: `{"name": "Phòng"}`' })
    @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp theo trường, ví dụ: name,ASC' })
    @ApiQuery({ name: 'noLimit', required: false, type: Boolean, description: 'Bỏ qua giới hạn và trả về tất cả kết quả' })
    @ApiQuery({ name: 'excludeAncestors', required: false, type: Boolean, description: 'Không lấy các nút cha/tổ tiên của các nút khớp kết quả' })
    async list(
        @EffectiveUser('id') userId: string,
        @Query() queryParams: QueryParams,
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.findAll(queryParams, userId);
            return res.status(HttpStatus.OK).json({
                ...data,
                success: true,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }

    // @Post('sync-from-mongo')
    // @ApiOperation({ summary: 'Đồng bộ dữ liệu đơn vị từ MongoDB sang MySQL' })
    // @ApiResponse({
    //     status: 200, description: 'Đồng bộ thành công.', schema: {
    //         properties: {
    //             success: { type: 'boolean', example: true },
    //             message: { type: 'string', example: 'Đồng bộ hoàn tất.' },
    //             data: { type: 'object', properties: { total: { type: 'number' }, synced: { type: 'number' }, errors: { type: 'array', items: { type: 'object' } } } }
    //         }
    //     }
    // })
    // @ApiResponse({ status: 500, description: 'Lỗi server khi đồng bộ.' })
    // async syncFromMongo(@Res() res: Response) {
    //     try {
    //         console.log('Starting synchronization from MongoDB...');
    //         const result = await this.organizationService.syncFromMongo();
    //         console.log('Synchronization finished.', result);
    //         return res.status(HttpStatus.OK).json({
    //             success: true,
    //             message: 'Đồng bộ hoàn tất.',
    //             data: result,
    //         });
    //     } catch (error) {
    //         console.error('Synchronization failed:', error);
    //         const errorResponse = ReturnError(error);
    //         return res.status(errorResponse.status).json(errorResponse.body);
    //     }
    // }

    @Get('all')
    @ApiOperation({ summary: 'Lấy tất cả đơn vị tổ chức (dạng cây)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công.', type: [OrganizationUnitEntity] })
    async listAll(
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.findAllActive();
            return res.status(HttpStatus.OK).json({
                success: true,
                data,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }

    @Get('org-fake')
    @ApiOperation({ summary: 'Lấy danh sách đơn vị tổ chức (phân trang, lọc, sắp xếp)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng trên một trang' })
    @ApiQuery({ name: 'filter', required: false, type: String, description: 'Lọc theo các trường, ví dụ: `{"name": "Phòng"}`' })
    @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sắp xếp theo trường, ví dụ: name,ASC' })
    async orgFake(
        @Query() queryParams: QueryParams,
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.orgFakeData(queryParams);
            return res.status(HttpStatus.OK).json({
                ...data,
                success: true,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }
    @Post('delete-multiple')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiOperation({ summary: 'Xóa nhiều đơn vị tổ chức theo danh sách ID' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiResponse({
        status: 200, description: 'Xóa thành công.', schema: {
            properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object', properties: { affected: { type: 'number', example: 1 } } }
            }
        }
    })
    async deleteMultiple(@Body('ids') ids: string[], @Res() res: Response) {
        try {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'Danh sách ID không hợp lệ',
                });
            }

            const result = await this.organizationService.deleteManyByIds(ids);
            return res.status(HttpStatus.OK).json({
                success: true,
                data: result,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }
    @Get('tree')
    @ApiOperation({
        summary: 'Lấy cây phòng ban (dùng mpath để trace)',
        description: 'Lấy cấp cha (level=1) khi không có organizationId. Khi có organizationId thì lấy con trực tiếp. tracePath dùng mpath để truy vết ancestors.',
    })
    @ApiQuery({ name: 'organizationId', required: false, type: String, description: 'ID phòng ban cha' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'noLimit', required: false, type: Boolean })
    @ApiQuery({ name: 'tracePath', required: false, type: String, description: 'Danh sách id cách nhau bởi dấu phẩy, dùng mpath để truy vết ancestor' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        type: GetChildOrganizationsResponseDto,
    })
    async getOrganizationTree(
        @EffectiveUser('id') userId: string,
        @Query() dto: GetChildOrganizationsDto,
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.getOrganizationTree(userId, dto);
            return res.status(HttpStatus.OK).json({
                ...data,
                success: true,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }

    @Get('children')
    @ApiOperation({
        summary: 'Lấy danh sách phòng ban con',
        description: 'Lấy tất cả các phòng ban con (bao gồm cả cháu, chắt...) của một phòng ban',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        type: GetChildOrganizationsResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'User chưa được gán phòng ban',
    })
    @ApiResponse({
        status: 404,
        description: 'Phòng ban không tồn tại',
    })
    async getChildOrganizations(
        @EffectiveUser('id') userId: string,
        @Query() dto: GetChildOrganizationsDto,
    ): Promise<GetChildOrganizationsResponseDto> {
        return this.organizationService.getChildOrganizations(userId, dto);
    }

    @Get('children-by-code')
    @ApiOperation({
        summary: 'Lấy danh sách phòng ban con',
        description: 'Lấy tất cả các phòng ban con (bao gồm cả cháu, chắt...) của một phòng ban',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        type: GetChildOrganizationsResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'User chưa được gán phòng ban',
    })
    @ApiResponse({
        status: 404,
        description: 'Phòng ban không tồn tại',
    })
    async getChildOrganizationsByCode(
        @EffectiveUser('id') userId: string,
        @Query() dto: GetChildOrganizationsDto,
    ): Promise<GetChildOrganizationsResponseDto> {
        return this.organizationService.getChildOrganizationsByCode(userId, dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin chi tiết một đơn vị theo ID' })
    @ApiParam({ name: 'id', description: 'ID của đơn vị', type: String })
    @ApiResponse({ status: 200, description: 'Tìm thấy đơn vị.', type: OrganizationUnitEntity })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị.' })
    async findById(@Param('id') id: string, @Res() res: Response) {
        try {
            const data = await this.organizationService.findById(id);
            if (!data) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: 'Không tìm thấy đơn vị hoặc đơn vị không hoạt động.',
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

    @Get('update/:id')
    @ApiOperation({ summary: 'Lấy thông tin đơn vị để cập nhật' })
    @ApiParam({ name: 'id', description: 'ID của đơn vị', type: String })
    @ApiResponse({ status: 200, description: 'Tìm thấy đơn vị.', type: OrganizationUnitEntity })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị.' })
    async findByIdUpdate(@Param('id') id: string, @Res() res: Response) {
        try {
            const data = await this.organizationService.findByIdUpdate(id);
            if (!data) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: 'Không tìm thấy đơn vị hoặc đơn vị không hoạt động.',
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
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiOperation({ summary: 'Cập nhật thông tin một đơn vị' })
    @ApiParam({ name: 'id', description: 'ID của đơn vị', type: String })
    @ApiBody({ type: UpdateOrganizationUnitDto })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công.', type: OrganizationUnitEntity })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị.' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateOrganizationUnitDto,
        @Res() res: Response,
    ) {
        try {
            const data = await this.organizationService.update(id, updateDto);
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
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiOperation({ summary: 'Xóa một đơn vị và các đơn vị con của nó' })
    @ApiParam({ name: 'id', description: 'ID của đơn vị', type: String })
    @ApiResponse({
        status: 200, description: 'Xóa thành công.', schema: {
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Đơn vị với ID ... và các đơn vị con đã được xóa.' }
            }
        }
    })
    async remove(@Param('id') id: string, @Res() res: Response) {
        try {
            await this.organizationService.delete(id);
            return res.status(HttpStatus.OK).json({
                success: true,
                message: `Đơn vị với ID ${id} và các đơn vị con đã được xóa (cập nhật trạng thái).`,
            });
        } catch (error) {
            const errorResponse = ReturnError(error);
            return res.status(errorResponse.status).json(errorResponse.body);
        }
    }


}
