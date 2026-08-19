import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { CreateConfigurationDto } from './dto/create-view-config.dto';
import { UpdateConfigurationDto } from './dto/update-view-config.dto';
import { Configuration } from './configuration.schema';

@ApiTags('Cấu hình Giao diện')
@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly ConfigurationService: ConfigurationService) { }


  @ApiOperation({
    summary: 'Tạo cấu hình mới',
    description: 'Tạo mới một cấu hình giao diện',
  })
  @ApiBody({
    type: CreateConfigurationDto,
    description: 'Dữ liệu cấu hình',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo cấu hình thành công',
  })
  @Post()
  async create(@Body() createConfigurationDto: CreateConfigurationDto): Promise<any> {
    return this.ConfigurationService.create(createConfigurationDto);
  }


  // @Get()
  // async findAll(): Promise<Configuration[]> {
  //   return this.ConfigurationService.findAll();
  // }

  @ApiOperation({
    summary: 'Lấy danh sách cấu hình',
    description: 'Lấy danh sách tất cả cấu hình giao diện',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
  })
  @Get()
  async findAll(@Query() queryParams: any) {
    return this.ConfigurationService.findAll(queryParams);
  }

  @ApiOperation({
    summary: 'Lấy cấu hình theo ID',
    description: 'Lấy thông tin cấu hình theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cấu hình',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  @Get(':id')
  async findById(@Param('id') id: string): Promise<any> {
    return this.ConfigurationService.findById(id);
  }
  @ApiOperation({
    summary: 'Lấy cấu hình theo mã',
    description: 'Lấy thông tin cấu hình theo mã code',
  })
  @ApiParam({
    name: 'code',
    description: 'Mã của cấu hình',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  @Get('find-by-code/:code')
  async findOne(@Param('code') code: string): Promise<any | null> {
    return this.ConfigurationService.findOne(code);
  }

  @ApiOperation({
    summary: 'Cập nhật cấu hình theo ID',
    description: 'Cập nhật thông tin cấu hình theo ID',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của cấu hình',
    required: true,
  })
  @ApiBody({
    type: UpdateConfigurationDto,
    description: 'Dữ liệu cập nhật',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  @Put(':id')
  async updateConfiguration(
    @Param('id') id: string,
    @Body() updateDto: UpdateConfigurationDto,
  ) {
    return this.ConfigurationService.update(id, updateDto);
  }
  @ApiOperation({
    summary: 'Cập nhật form cấu hình',
    description: 'Cập nhật form cấu hình theo mã code',
  })
  @ApiParam({
    name: 'code',
    description: 'Mã của cấu hình',
    required: true,
  })
  @ApiBody({
    type: UpdateConfigurationDto,
    description: 'Dữ liệu cập nhật form',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @Put('update-form/:code')
  async updateForm(
    @Param('code') code: string,
    @Body() updateDto: UpdateConfigurationDto,
  ) {
    return this.ConfigurationService.updateForm(code, updateDto);
  }
  @ApiOperation({
    summary: 'Xóa nhiều cấu hình',
    description: 'Xóa nhiều cấu hình theo danh sách ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách ID cần xóa',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
  })
  @Delete()
  async removeMany(@Body('ids') ids: string[]) {
    try {
      const result = await this.ConfigurationService.remove(ids);
      return {
        success: true,
        message: `Đã xóa ${result.modifiedCount} configuration.`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Lỗi khi xóa các configuration.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Delete('remove-by-code')
  async removeManyByCode(@Body('codes') codes: string[]) {
    try {
      const result = await this.ConfigurationService.removeByCode(codes);
      return {
        success: true,
        message: `Đã xóa ${result.modifiedCount} configuration.`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Lỗi khi xóa các configuration.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({
    summary: 'Lấy cấu hình theo mã code và processId',
    description: 'Lấy thông tin cấu hình theo mã code và processId',
  })
  @ApiParam({
    name: 'code',
    description: 'Mã của cấu hình',
    required: true,
  })
  @ApiParam({
    name: 'processId',
    description: 'ID của process',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  @Get('find-by-code-and-process/:code/:processId')
  async findOneByCodeAndProcessId(
    @Param('code') code: string,
    @Param('processId') processId: string,
  ): Promise<any> {
    return this.ConfigurationService.findOneByCodeAndProcessId(code, processId);
  }

  @Get('process-one/:processId')
  async findOneByProcessId(@Param('processId') processId: string): Promise<any> {
    return this.ConfigurationService.findOneByProcessId(processId);
  }

}
