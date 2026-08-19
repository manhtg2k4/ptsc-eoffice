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
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/auth-sso/jwt.guard';
import { AdminGuard } from 'src/users/guards/admin.guard';
import { UseGuards } from '@nestjs/common';
import { FeatureManagementServiceSql } from './feature-management-service-sql';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateFeatureManagementDto,
  updateFeatureManagementDto,
} from '../feature-management.validation';
import { ReturnError } from '../../utils/util';
import { QueryParams } from 'src/interfaces';

@ApiTags('Feature Management (SQL)')
@Controller('feature-management-sql')
@UseGuards(JwtAuthGuard)
export class FeatureManagementControllerSql {
  constructor(
    private readonly featureService: FeatureManagementServiceSql,
  ) { }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new feature' })
  async create(@Body() createDto: CreateFeatureManagementDto, @Res() res: Response) {
    try {
      const data = await this.featureService.create(createDto);
      return res.status(HttpStatus.CREATED).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all features' })
  async list(@Req() req: any, @Query() queryParams: QueryParams, @Res() res: Response) {
    try {
      const data = await this.featureService.findAll(queryParams, req?.user?.userId);
      return res.status(HttpStatus.OK).json({ success: true, ...data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  // @Post('sync-from-mongo')
  // @ApiOperation({ summary: 'Sync data from MongoDB to SQL Server' })
  // async syncFromMongo(@Res() res: Response) {
  //   try {
  //     const result = await this.featureService.syncFromMongo();
  //     return res.status(HttpStatus.OK).json({
  //       success: true,
  //       message: 'Sync process started.',
  //       data: result,
  //     });
  //   } catch (error) {
  //     const errorResponse = ReturnError(error);
  //     return res.status(errorResponse.status).json(errorResponse.body);
  //   }
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Get a feature by ID' })
  async findById(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.featureService.findById(id);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update a feature' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: updateFeatureManagementDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.featureService.update(id, updateDto);
      return res.status(HttpStatus.OK).json({ success: true, data });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete a feature' })
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      await this.featureService.delete(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Feature with ID ${id} and its children have been deleted.`,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }

  @Post('delete-multiple')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete multiple features' })
  @ApiBody({
    schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } },
  })
  async deleteMultiple(@Body('ids') ids: string[], @Res() res: Response) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid IDs list',
        });
      }
      const result = await this.featureService.deleteManyByIds(ids);
      return res.status(HttpStatus.OK).json({ success: true, data: result });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}