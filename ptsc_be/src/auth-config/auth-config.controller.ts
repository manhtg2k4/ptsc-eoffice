import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AuthConfigService } from './auth-config.service';
import { CreateAuthConfigDto } from './dto/create-auth-config.dto';
import { UpdateAuthConfigDto } from './dto/update-auth-config.dto';
import { UseGuards } from '@nestjs/common';
import { AuthConfigPermissionGuard } from './guards/auth-config-permission.guard';
import { RequireAuthConfigPermission, AuthConfigPermissionAction } from './decorators/auth-config-permission.decorator';

@ApiTags('Cấu hình Xác thực')
@Controller('auth-config')
@UseGuards(AuthConfigPermissionGuard)
export class AuthConfigController {
  constructor(
    private readonly service: AuthConfigService,
  ) { }

  @Get('type/:authType')
  @RequireAuthConfigPermission(AuthConfigPermissionAction.VIEW)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Lấy cấu hình theo loại xác thực',
    description: 'Lấy thông tin cấu hình cho loại xác thực cụ thể (keycloak, sso, v.v...)',
  })
  @ApiParam({
    name: 'authType',
    type: String,
    description: 'Loại xác thực (keycloak, sso, ...)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy cấu hình thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Loại xác thực không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  async findByAuthType(@Param('authType') authType: string) {
    if (!authType || authType.trim() === '') {
      throw new BadRequestException('authType không được rỗng');
    }

    const config = await this.service.findByAuthType(authType);
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình cho authType: ${authType}`);
    }

    return config;
  }

  @Post()
  @RequireAuthConfigPermission(AuthConfigPermissionAction.CREATE)
  @HttpCode(201)
  @ApiOperation({
    summary: 'Tạo mới cấu hình xác thực',
    description: 'Tạo mới một cấu hình xác thực cho một hệ thống xác thực ngoài',
  })
  @ApiBody({
    type: CreateAuthConfigDto,
    description: 'Dữ liệu cấu hình',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  create(@Body() dto: CreateAuthConfigDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequireAuthConfigPermission(AuthConfigPermissionAction.UPDATE)
  @ApiOperation({
    summary: 'Cập nhật cấu hình xác thực',
    description: 'Cập nhật thông tin cấu hình xác thực theo ID',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID cấu hình',
  })
  @ApiBody({
    type: UpdateAuthConfigDto,
    description: 'Dữ liệu cập nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy cấu hình',
  })
  update(@Param('id') id: string, @Body() dto: UpdateAuthConfigDto) {
    return this.service.update(id, dto);
  }

  @Delete('bulk')
  @RequireAuthConfigPermission(AuthConfigPermissionAction.DELETE)
  @HttpCode(200)
  async bulkSoftDelete(@Body() ids: string[]) {
    return this.service.bulkSoftDelete(ids);
  }
  @Delete(':id')
  @RequireAuthConfigPermission(AuthConfigPermissionAction.DELETE)
  @HttpCode(200)
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id);
  }

}