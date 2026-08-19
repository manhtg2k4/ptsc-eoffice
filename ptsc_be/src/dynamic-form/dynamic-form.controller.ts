import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DynamicFormService } from './dynamic-form.service';
import { DynamicForm } from './dynamic-form.schema';
import { ReturnError } from 'src/utils/util';
import { Response } from 'express';

@ApiTags('Biểu mẫu Động')
@Controller('dynamic-form')
export class DynamicFormController {
  constructor(private readonly dynamicFormServices: DynamicFormService) { }

  // API thêm mới
  @Post()
  async create(@Body() data: Partial<DynamicForm>) {
    return this.dynamicFormServices.create(data);
  }

  @Get()
  async list(
    @Query() queryParams: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const result = await this.dynamicFormServices.findAll(queryParams);

      return res.status(HttpStatus.OK).json({
        success: true,
        ...result,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<DynamicForm>,
    @Res() res: Response,
  ) {
    try {
      // Validate ID
      if (!id || id === 'undefined') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid ID parameter',
        });
      }

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ID must be a valid number',
        });
      }

      const updated = await this.dynamicFormServices.update(numericId, data);
      if (!updated) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `DynamicForm with id ${id} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Delete(':id')
  async delete(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate ID
      if (!id || id === 'undefined') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid ID parameter',
        });
      }

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ID must be a valid number',
        });
      }

      const deleted = await this.dynamicFormServices.delete(numericId);
      if (!deleted) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `DynamicForm with id ${id} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Xóa thành công',
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
  @Get(':id')
  async detail(@Param('id') id: string, @Res() res: Response) {
    try {
      // Validate ID
      if (!id || id === 'undefined') {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Invalid ID parameter',
        });
      }

      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'ID must be a valid number',
        });
      }

      const form = await this.dynamicFormServices.findById(numericId);
      if (!form) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: `DynamicForm with id ${id} not found`,
        });
      }
      return res.status(HttpStatus.OK).json({
        success: true,
        data: form,
      });
    } catch (error) {
      const errorResponse = ReturnError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
  }
}
