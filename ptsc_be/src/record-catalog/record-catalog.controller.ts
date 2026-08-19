import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { RecordCatalogService } from './record-catalog.service';
import { CreateYearCategoryDto } from './dto/create-year-category.dto';
import { UpdateYearCategoryDto } from './dto/update-year-category.dto';
import { CreateFileRecordDto } from './dto/create-file-record.dto';
import { CreateRecordDocumentDto } from './dto/create-record-document.dto';
import { UpdateFileRecordDto } from './dto/update-file-record.dto';
import { SearchFileRecordDto } from './dto/search-file-record.dto';
import { SearchYearDto } from './dto/search-year.dto';
import { UpdateRecordDocumentDto } from './dto/update-record-document.dto';
import { SearchRecordDocumentDto } from './dto/search-record-document.dto';
import { DeleteMultipleDocumentsDto } from './dto/delete-multiple-documents.dto';
import { CreateFolderDetailDto } from './dto/create-folder-detail.dto';
import { UpdateFolderDetailDto } from './dto/update-folder-detail.dto';
import { SearchFolderDetailDto } from './dto/search-folder-detail.dto';
import { SearchDocumentProfileDto } from './dto/search-document-profile.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EffectiveUser } from 'src/authority-documents';
import { SystemLogServiceSql } from 'src/systemLogManagement/system-log-service-sql';
import { RecordCatalogPermissionGuard } from './guards/record-catalog-permission.guard';
import { RecordCatalogPermissionAction, RequireRecordCatalogPermission } from './decorators/record-catalog-permission.decorator';


@ApiTags('Danh mục Hồ sơ')
@Controller('record-catalog')
@UseGuards(RecordCatalogPermissionGuard)
export class RecordCatalogController {
    constructor(
        private readonly recordCatalogService: RecordCatalogService,
        private readonly systemLogService: SystemLogServiceSql,
    ) { }

    @Post('year')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.CREATE)
    @ApiOperation({ summary: 'Create a new year category' })
    async createYear(
        @Body() createYearDto: CreateYearCategoryDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.createYear(createYearDto);
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo mới danh mục năm: ${createYearDto.year}`,
                method: 'POST',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'POST',
                    details: `Tạo mới danh mục năm: ${createYearDto.year} thất bại`,
                    method: 'POST',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log createYear:', logError);
            }
            throw error;
        }
    }

    @Get('year')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get all year categories' })
    async findAllYears(
        @Query() searchDto: SearchYearDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findAllYears(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập Danh mục năm (page: ${searchDto.page || 1}, limit: ${searchDto.limit || 25})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập Danh mục năm thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findAllYears:', logError);
            }
            throw error;
        }
    }

    @Get('year/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get year category detail' })
    async findOneYear(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findOneYear(id);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem chi tiết danh mục năm (ID: ${id})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xem chi tiết danh mục năm (ID: ${id}) thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findOneYear:', logError);
            }
            throw error;
        }
    }

    @Patch('year/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.UPDATE)
    @ApiOperation({ summary: 'Update year category' })
    async updateYear(
        @Param('id') id: string,
        @Body() updateYearDto: UpdateYearCategoryDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.updateYear(id, updateYearDto);
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Cập nhật danh mục năm (ID: ${id}) sang năm: ${updateYearDto.year}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'PATCH',
                    details: `Cập nhật danh mục năm (ID: ${id}) thất bại`,
                    method: 'PATCH',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log updateYear:', logError);
            }
            throw error;
        }
    }

    @Delete('year/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.DELETE)
    @ApiOperation({ summary: 'Delete year category' })
    async removeYear(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.removeYear(id);
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa danh mục năm (ID: ${id})`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa danh mục năm (ID: ${id}) thất bại`,
                    method: 'DELETE',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log removeYear:', logError);
            }
            throw error;
        }
    }

    @Post('file')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.CREATE)
    @ApiOperation({ summary: 'Create a new file record' })
    async createFile(
        @Body() createFileDto: CreateFileRecordDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.createFile(createFileDto);
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo mới hồ sơ tra cứu: ${createFileDto.title} (${createFileDto.fileSymbol})`,
                method: 'POST',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'POST',
                    details: `Tạo mới hồ sơ tra cứu: ${createFileDto.title} thất bại`,
                    method: 'POST',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log createFile:', logError);
            }
            throw error;
        }
    }

    @Get('file')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get file records with filter' })
    async findAllFiles(
        @Query() searchDto: SearchFileRecordDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findAllFiles(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập Danh sách hồ sơ tra cứu (page: ${searchDto.page || 1}, limit: ${searchDto.limit || 25})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập Danh sách hồ sơ tra cứu thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findAllFiles:', logError);
            }
            throw error;
        }
    }

    @Get('file/exports')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Xuất danh sách hồ sơ phòng (Excel/PDF)' })
    async exportFileRecords(
        @Query() searchDto: SearchFileRecordDto,
        @Res() res: Response,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const { buffer, contentType, filename } = await this.recordCatalogService.exportFileRecords(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xuất danh sách hồ sơ phòng (Type: ${searchDto.exportType || 'excel'})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });

            res.send(buffer);
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xuất danh sách hồ sơ phòng thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi chi tiết exportFileRecords:', logError);
            }
            throw error;
        }
    }

    @Get('file/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get file record detail' })
    async findOneFile(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findOneFile(id);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem chi tiết hồ sơ tra cứu (ID: ${id})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xem chi tiết hồ sơ tra cứu (ID: ${id}) thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findOneFile:', logError);
            }
            throw error;
        }
    }

    @Patch('file/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.UPDATE)
    @ApiOperation({ summary: 'Update file record' })
    async updateFile(
        @Param('id') id: string,
        @Body() updateFileDto: UpdateFileRecordDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.updateFile(id, updateFileDto);
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Cập nhật hồ sơ tra cứu (ID: ${id}): ${updateFileDto.title}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'PATCH',
                    details: `Cập nhật hồ sơ tra cứu (ID: ${id}) thất bại`,
                    method: 'PATCH',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log updateFile:', logError);
            }
            throw error;
        }
    }



    @Delete('file/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.DELETE)
    @ApiOperation({ summary: 'Delete file record' })
    async removeFile(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.removeFile(id);
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa hồ sơ tra cứu (ID: ${id})`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa hồ sơ tra cứu (ID: ${id}) thất bại`,
                    method: 'DELETE',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log removeFile:', logError);
            }
            throw error;
        }
    }

    @Post('document')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.CREATE)
    @ApiOperation({ summary: 'Create a new record document inside a file' })
    async createDocument(
        @Body() createDocDto: CreateRecordDocumentDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.createDocument(createDocDto);
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo mới văn bản tra cứu: ${createDocDto.documentTitle} (${createDocDto.documentSymbol})`,
                method: 'POST',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'POST',
                    details: `Tạo mới văn bản tra cứu: ${createDocDto.documentTitle} thất bại`,
                    method: 'POST',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log createDocument:', logError);
            }
            throw error;
        }
    }

    @Get('unopened-document-profiles')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Lấy tất cả danh mục hồ sơ từ hệ thống với điều kiện chưa mở (status = 0)' })
    async getUnopenedDocumentProfiles(
        @Query() searchDto: SearchDocumentProfileDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.getUnopenedDocumentProfiles(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập Danh sách hồ sơ chọn mở mới (page: ${searchDto.page || 1}, limit: ${searchDto.limit || 10})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập Danh sách hồ sơ chọn mở mới thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log getUnopenedDocumentProfiles:', logError);
            }
            throw error;
        }
    }

    @Get('document')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get list of documents with filter' })
    async findAllDocuments(
        @Query() searchDto: SearchRecordDocumentDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findAllDocuments(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập Danh sách văn bản tra cứu (page: ${searchDto.page || 1}, limit: ${searchDto.limit || 25})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập Danh sách văn bản tra cứu thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findAllDocuments:', logError);
            }
            throw error;
        }
    }

    @Get('document/tree/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get tree by document id' })
    /**
     * Get tree by document id
     * @param {string} id - document id
     * @returns {Promise<RecordCatalogTreeDto>} - tree by document id
     * @throws {BadRequestException} - if id is empty
     */
    async getTreeByDocumentId(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            if (!id) {
                throw new BadRequestException('Thiếu documentId');
            }

            const result = await this.recordCatalogService.getTreeByDocumentId(id);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập cây phân cấp theo documentId: ${id}`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress:
                    req?.headers['x-forwarded-for'] ||
                    req?.socket?.remoteAddress ||
                    req?.ip ||
                    'Unknown',
                timestamp: new Date().toISOString(),
            });

            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập cây document thất bại: ${id}`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress:
                        req?.headers['x-forwarded-for'] ||
                        req?.socket?.remoteAddress ||
                        req?.ip ||
                        'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log getTreeByDocumentId:', logError);
            }
            throw error;
        }
    }

    @Get('document/exports')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Export documents to Excel/PDF' })
    @ApiQuery({ type: SearchRecordDocumentDto, style: 'deepObject', explode: true })
    async exportDocuments(
        @Query() searchDto: SearchRecordDocumentDto,
        @Res() res: Response,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const { buffer, contentType, filename } = await this.recordCatalogService.exportDocuments(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xuất danh sách văn bản tra cứu (Type: ${searchDto.exportType || 'excel'})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });

            res.send(buffer);
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xuất danh sách văn bản tra cứu thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log exportDocuments:', logError);
            }
            throw error;
        }
    }

    @Get('document/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Get document detail' })
    async findOneDocument(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findOneDocument(id);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem chi tiết văn bản tra cứu (ID: ${id})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xem chi tiết văn bản tra cứu (ID: ${id}) thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findOneDocument:', logError);
            }
            throw error;
        }
    }

    @Patch('document/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.UPDATE)
    @ApiOperation({ summary: 'Update document info' })
    async updateDocument(
        @Param('id') id: string,
        @Body() updateDocDto: UpdateRecordDocumentDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.updateDocument(id, updateDocDto);
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Cập nhật văn bản tra cứu (ID: ${id}): ${updateDocDto.documentTitle}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'PATCH',
                    details: `Cập nhật văn bản tra cứu (ID: ${id}) thất bại`,
                    method: 'PATCH',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log updateDocument:', logError);
            }
            throw error;
        }
    }

    @Delete('document/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.DELETE)
    @ApiOperation({ summary: 'Delete a document' })
    async removeDocument(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.removeDocument(id);
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa văn bản tra cứu (ID: ${id})`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa văn bản tra cứu (ID: ${id}) thất bại`,
                    method: 'DELETE',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log removeDocument:', logError);
            }
            throw error;
        }
    }

    @Delete('document')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.DELETE)
    @ApiOperation({ summary: 'Delete multiple documents' })
    async removeMultipleDocuments(
        @Body() deleteDto: DeleteMultipleDocumentsDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.removeMultipleDocuments(deleteDto.ids);
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa nhiều văn bản tra cứu (Số lượng: ${deleteDto.ids?.length || 0})`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa nhiều văn bản tra cứu thất bại`,
                    method: 'DELETE',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log removeMultipleDocuments:', logError);
            }
            throw error;
        }
    }

    // =========================================================
    // FOLDER DETAIL ENDPOINTS (Level 1 - Tiêu đề mục hồ sơ)
    // =========================================================

    @Post('folder-detail')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.CREATE)
    @ApiOperation({ summary: 'Tạo mới đề mục hồ sơ (Level 1)' })
    async createFolderDetail(
        @Body() dto: CreateFolderDetailDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.createFolderDetail(dto);
            await this.systemLogService.createLogFromSystem({
                action: 'POST',
                details: `Tạo mới đề mục hồ sơ: ${dto.title}`,
                method: 'POST',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'POST',
                    details: `Tạo mới đề mục hồ sơ: ${dto.title} thất bại`,
                    method: 'POST',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log createFolderDetail:', logError);
            }
            throw error;
        }
    }

    @Get('folder-detail')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Lấy danh sách đề mục hồ sơ (Level 1), lọc theo yearCategoryId' })
    @ApiQuery({ type: SearchFolderDetailDto, style: 'deepObject', explode: true })
    async findAllFolderDetails(
        @Query() searchDto: SearchFolderDetailDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findAllFolderDetails(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Truy cập danh sách đề mục hồ sơ (yearCategoryId: ${searchDto.yearCategoryId || 'all'})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Truy cập danh sách đề mục hồ sơ thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findAllFolderDetails:', logError);
            }
            throw error;
        }
    }



    @Get('folder-detail/exports')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Xuất danh sách đề mục hồ sơ (Excel/PDF)' })
    async exportFolderDetails(
        @Query() searchDto: SearchFolderDetailDto,
        @Res() res: Response,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const { buffer, contentType, filename } = await this.recordCatalogService.exportFolderDetails(searchDto);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xuất danh sách đề mục hồ sơ (Type: ${searchDto.exportType || 'excel'})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });

            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': buffer.length,
            });

            res.send(buffer);
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xuất danh sách đề mục hồ sơ thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi chi tiết exportFolderDetails:', logError);
            }
            throw error;
        }
    }

    @Get('folder-detail/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.VIEW)
    @ApiOperation({ summary: 'Xem chi tiết đề mục hồ sơ (Level 1)' })
    async findOneFolderDetail(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.findOneFolderDetail(id);
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Xem chi tiết đề mục hồ sơ (ID: ${id})`,
                method: 'GET',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'GET',
                    details: `Xem chi tiết đề mục hồ sơ (ID: ${id}) thất bại`,
                    method: 'GET',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log findOneFolderDetail:', logError);
            }
            throw error;
        }
    }

    @Patch('folder-detail/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.UPDATE)
    @ApiOperation({ summary: 'Cập nhật đề mục hồ sơ (Level 1)' })
    async updateFolderDetail(
        @Param('id') id: string,
        @Body() dto: UpdateFolderDetailDto,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.updateFolderDetail(id, dto);
            await this.systemLogService.createLogFromSystem({
                action: 'PATCH',
                details: `Cập nhật đề mục hồ sơ (ID: ${id}): ${dto.title}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'PATCH',
                    details: `Cập nhật đề mục hồ sơ (ID: ${id}) thất bại`,
                    method: 'PATCH',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log updateFolderDetail:', logError);
            }
            throw error;
        }
    }

    @Delete('folder-detail/:id')
    @RequireRecordCatalogPermission(RecordCatalogPermissionAction.DELETE)
    @ApiOperation({ summary: 'Xóa đề mục hồ sơ (Level 1) - sẽ cascade xóa các hồ sơ phòng bên trong' })
    async removeFolderDetail(
        @Param('id') id: string,
        @Req() req: any,
        @EffectiveUser() effectiveUserId: string,
    ) {
        try {
            const result = await this.recordCatalogService.removeFolderDetail(id);
            await this.systemLogService.createLogFromSystem({
                action: 'DELETE',
                details: `Xóa đề mục hồ sơ (ID: ${id})`,
                method: 'DELETE',
                status: 'SUCCESS',
                type: process.env.CLIENT_LOG || 'DHVBTC',
                subType: process.env.CLIENT_LOG || 'DHVBTC',
                userInfo: req?.user?.userId || effectiveUserId || '',
                ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                timestamp: new Date().toISOString(),
            });
            return result;
        } catch (error) {
            try {
                await this.systemLogService.createLogFromSystem({
                    action: 'DELETE',
                    details: `Xóa đề mục hồ sơ (ID: ${id}) thất bại`,
                    method: 'DELETE',
                    status: 'FAILED',
                    type: process.env.CLIENT_LOG || 'DHVBTC',
                    subType: process.env.CLIENT_LOG || 'DHVBTC',
                    userInfo: req?.user?.userId || effectiveUserId || '',
                    ipAddress: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || 'Unknown',
                    timestamp: new Date().toISOString(),
                });
            } catch (logError) {
                console.error('Lỗi ghi log removeFolderDetail:', logError);
            }
            throw error;
        }
    }

  @Post('folder-detail/import')
  async importFolderDetails(@Body() body: any, @Req() req: any) {
    const userId = req?.user?.userId || "";
    try {
      await this.recordCatalogService.importFolderDetails(body.data, userId);
      
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'CREATE',
          details: `Import danh mục hồ sơ từ Excel`,
          method: 'POST',
          status: 'SUCCESS',
          type: 'RECORD_CATALOG',
          subType: 'FOLDER_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      return { status: 1, message: 'Import thành công' };
    } catch (error) {
      if (userId) {
        await this.systemLogService.createLogFromSystem({
          action: 'CREATE',
          details: `Lỗi: Import danh mục hồ sơ từ Excel - ${error.message}`,
          method: 'POST',
          status: 'ERROR',
          type: 'RECORD_CATALOG',
          subType: 'FOLDER_DETAIL',
          userInfo: userId,
          ipAddress: req?.socket?.remoteAddress || 'Unknown',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }
}

