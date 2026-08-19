// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Delete,
//   Query,
//   ValidationPipe,
//   HttpCode,
//   HttpStatus,
//   Req,
// } from '@nestjs/common';
// import { SystemLogManagementService } from './system-log-management.service';
// import { CreateSystemLogDto } from './create-system-log.dto';
// import { UpdateSystemLogDto } from './update-system-log.dto';
// import { UserLogHelper } from 'src/documents/helpers/user-log.helper';
// // import { CreateSystemLogDto } from './dto/create-system-log.dto';
// // import { UpdateSystemLogDto } from './dto/update-system-log.dto';

// @Controller('system-log-management')
// export class SystemLogManagementController {
//   constructor(
//     private readonly systemLogManagementService: SystemLogManagementService,
//     private readonly userLogHelper: UserLogHelper,
//   ) { }

//   @Post()
//   @HttpCode(HttpStatus.CREATED)
//   async create(
//     @Body(new ValidationPipe()) createSystemLogDto: CreateSystemLogDto,
//     @Req() req: any,
//   ) {
//     // Ghi log cho hành động tạo log (hơi meta, nhưng có thể hữu ích)
//     const userInfo = req?.user?.userId;
//     const ipAddress = req?.socket?.remoteAddress || 'Unknown';
//     // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
//     await this.logAction(
//       userInfo,
//       ipAddress,
//       'POST',
//       `Tạo một bản ghi log mới: ${createSystemLogDto.details}`
//     );

//     return this.systemLogManagementService.create(createSystemLogDto);
//   }

//   @Get()
//   async findAll(
//     @Query()
//     query: {
//       sort?: string;
//       page?: string;
//       limit?: string;
//       type?: string;
//       method?: string;
//       status?: string;
//       search?: string;
//     },
//     @Req() req: any,
//   ) {
//     // Ghi log cho hành động xem danh sách log
//     try {
//       const userInfo = req?.user?.userId;
//       const ipAddress = req?.socket?.remoteAddress || 'Unknown';
//       // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
//       await this.logAction(
//         userInfo,
//         ipAddress,
//         'GET',
//         `Truy cập danh sách log hệ thống`
//       );
//     } catch (error) {
//       // Bỏ qua lỗi ghi log để không ảnh hưởng đến chức năng chính
//     }

//     const page = parseInt(query.page || '1', 10);
//     const limit = parseInt(query.limit || '25', 10);
//     const sort = query.sort || '-timestamp';
//     return this.systemLogManagementService.findAll({
//       ...query,
//       page,
//       limit,
//       sort,
//     });
//   }

//   @Get(':id')
//   async findOne(@Param('id') id: string, @Req() req: any) {
//     const userInfo = req?.user?.userId;
//     const ipAddress = req?.socket?.remoteAddress || 'Unknown';
//     // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
//     await this.logAction(
//       userInfo,
//       ipAddress,
//       'GET',
//       `Xem chi tiết log ID: [${id}]`
//     );
//     return this.systemLogManagementService.findOne(id);
//   }

//   @Patch(':id')
//   async update(
//     @Param('id') id: string,
//     @Body(new ValidationPipe()) updateSystemLogDto: UpdateSystemLogDto,
//     @Req() req: any,
//   ) {
//     const userInfo = req?.user?.userId;
//     const ipAddress = req?.socket?.remoteAddress || 'Unknown';
//     // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
//     await this.logAction(
//       userInfo,
//       ipAddress,
//       'PATCH',
//       `Cập nhật log ID: [${id}]`
//     );
//     return this.systemLogManagementService.update(id, updateSystemLogDto);
//   }

//   @Delete()
//   @HttpCode(HttpStatus.OK)
//   async remove(@Body() body: { ids: string[] }, @Req() req: any) {
//     const userInfo = req?.user?.userId;
//     const ipAddress = req?.socket?.remoteAddress || 'Unknown';
//     // const userInfo = await this.userLogHelper.getUserLogInfo(req.user.userId, req);
//     await this.logAction(
//       userInfo,
//       ipAddress,
//       'DELETE',
//       `Xóa các bản ghi log: [${body.ids.join(', ')}]`
//     );

//     return this.systemLogManagementService.remove(body.ids);
//   }

//   private async logAction(
//     userInfo: string,
//     ipAddress: string,
//     action: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
//     details: string,
//   ) {
//     try {
//       await this.systemLogManagementService.createLogFromSystem({
//         action,
//         details,
//         method: action,
//         status: 'SUCCESS',
//         type: 'SYSTEM_LOG_ADMIN', // Loại log đặc biệt cho việc quản trị log
//         subType: 'SYSTEM_LOG_ADMIN',
//         userInfo,
//         ipAddress,
//         timestamp: new Date().toISOString(),
//       });
//     } catch (error) {
//       // Ghi lỗi ra console nhưng không ném exception để tránh vòng lặp
//       console.error(`Failed to log admin action: ${details}`, error);
//     }
//   }
// }