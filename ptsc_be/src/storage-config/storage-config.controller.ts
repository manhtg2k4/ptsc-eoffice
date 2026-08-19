// // storage-config.controller.ts
// import { Controller, Get, Put, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
// import { StorageConfigService } from './storage-config.service';
// import { UpdateStorageConfigDto } from './update-storage-config.dto';
// import { AuthorityGuard } from 'src/authority-documents';
// import { UsersService } from 'src/users/users.service';
// import { checkIsAdmin } from 'src/utils/util';
// import { AdminGuard } from 'src/users/guards/admin.guard';

// @ApiTags('Cấu hình Lưu trữ')
// @Controller('storage-config')
// @UseGuards(AuthorityGuard)
// @UseGuards(AdminGuard)

// export class StorageConfigController {
//   constructor(
//     private readonly storageConfigService: StorageConfigService,
//     private readonly usersService: UsersService,
//   ) {}

//   @Get()
//   @ApiOperation({
//     summary: 'Lấy cấu hình lưu trữ',
//     description: 'Lấy thông tin cấu hình lưu trữ hiện tại (filesystem hoặc MinIO)',
//   })
//   @ApiResponse({
//     status: 200,
//     description: 'Lấy cấu hình thành công',
//     schema: {
//       example: {
//         active_type: 'filesystem',
//         minio_endpoint: 'http://localhost:9000',
//       },
//     },
//   })
//   async getConfig(@Req() req: any): Promise<any> { // explicit return type
//     const userId = req.user?.userId;
//     if (!userId) {
//       throw new ForbiddenException('Không tìm thấy thông tin người dùng.');
//     }
//     const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
//     if (!checkIsAdmin(roleInfo?.staticPermissions)) {
//       throw new ForbiddenException('Bạn không có quyền thao tác (yêu cầu quyền ADMIN).');
//     }

//     const config = await this.storageConfigService.getConfig();
//     return config;
//   }

//   @Put()
//   @ApiOperation({
//     summary: 'Cập nhật cấu hình lưu trữ',
//     description: 'Cập nhật cấu hình lưu trữ, bao gồm chuyển đổi giữa filesystem và MinIO',
//   })
//   @ApiBody({
//     type: UpdateStorageConfigDto,
//     description: 'Dữ liệu cấu hình lưu trữ',
//   })
//   @ApiResponse({
//     status: 200,
//     description: 'Cập nhật thành công',
//     schema: {
//       example: {
//         active_type: 'minio',
//         minio_endpoint: 'http://localhost:9000',
//         minio_access_key: '****',
//         minio_secret_key: '****',
//         minio_bucket: 'documents',
//       },
//     },
//   })
//   @ApiResponse({
//     status: 400,
//     description: 'Dữ liệu không hợp lệ',
//   })
//   async updateConfig(@Body() updateStorageConfigDto: UpdateStorageConfigDto, @Req() req: any): Promise<any> {
//     const userId = req.user?.userId;
//     if (!userId) {
//       throw new ForbiddenException('Không tìm thấy thông tin người dùng.');
//     }
//     const roleInfo = await this.usersService.findProcessRoleInfoById(userId);
//     if (!checkIsAdmin(roleInfo?.staticPermissions)) {
//       throw new ForbiddenException('Bạn không có quyền thao tác (yêu cầu quyền ADMIN).');
//     }

//     const updated = await this.storageConfigService.updateConfig(updateStorageConfigDto);
//     return updated;
//   }
// }

// storage-config.controller.ts
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { StorageConfigService } from './storage-config.service';
import { UpdateStorageConfigDto } from './update-storage-config.dto';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Cấu hình Lưu trữ')
@Controller('storage-config')
@UseGuards(AdminGuard)
export class StorageConfigController {
  constructor(private readonly storageConfigService: StorageConfigService) {}

  // @Get()
  // @ApiOperation({
  //   summary: 'Lấy cấu hình lưu trữ',
  //   description: 'Lấy thông tin cấu hình lưu trữ hiện tại (filesystem hoặc MinIO)',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lấy cấu hình thành công',
  //   schema: {
  //     example: {
  //       active_type: 'filesystem',
  //       minio_endpoint: 'http://localhost:9000',
  //     },
  //   },
  // })
  // async getConfig(): Promise<any> { // explicit return type
  //   const config = await this.storageConfigService.getConfig();
  //   return config;
  // }

  @Put()
  @ApiOperation({
    summary: 'Cập nhật cấu hình lưu trữ',
    description: 'Cập nhật cấu hình lưu trữ, bao gồm chuyển đổi giữa filesystem và MinIO',
  })
  @ApiBody({
    type: UpdateStorageConfigDto,
    description: 'Dữ liệu cấu hình lưu trữ',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        active_type: 'minio',
        minio_endpoint: 'http://localhost:9000',
        minio_access_key: '****',
        minio_secret_key: '****',
        minio_bucket: 'documents',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async updateConfig(@Body() updateStorageConfigDto: UpdateStorageConfigDto): Promise<any> {
    const updated = await this.storageConfigService.updateConfig(updateStorageConfigDto);
    return updated;
  }
}
