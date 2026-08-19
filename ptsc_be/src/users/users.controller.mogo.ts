// // src/users/users.controller.ts
// import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
// import { GetPendingItemsDto } from './dto/get-pending-items.dto';
// import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
// import { GetRolesDto } from './dto/get-roles.dto';
// import { UsersService } from './users.service';

// @ApiTags('Users')
// @Controller('userss')
// export class UsersController {
//   constructor(private readonly usersService: UsersService) { }


//   @Get('/users-in-same-org')
//   @ApiOperation({ summary: 'Danh sách người dùng cùng phòng ban với user hiện tại' })
//   @ApiQuery({ name: 'limit', required: false })
//   @ApiQuery({ name: 'page', required: false })
//   @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
//   async getUsersInSameOrg(
//     @Req() req: any,
//     @Query('limit') limitQuery?: string,
//     @Query('page') pageQuery?: string,
//     @Query('name') name?: string,
//   ) {
//     const userId = req?.user?.userId;
//     const limit = parseInt(limitQuery || '10');
//     const page = parseInt(pageQuery || '1');

//     return this.usersService.getUsersInSameOrg(userId, limit, page, name);
//   }

//   @Get(':userId/pending')
//   @ApiOperation({ summary: 'Danh sách công việc đang chờ xử lý của người dùng' })
//   @ApiParam({ name: 'userId', description: "ID của người dùng" })
//   getPendingItems(
//     @Param('userId') userId: string,
//     @Query() query: GetPendingItemsDto,
//   ) {
//     const roles = (query.roles || '').split(',').filter(Boolean);
//     const includeUnassigned = query.includeUnassigned === 'true';
//     return this.usersService.getPendingItems(userId, includeUnassigned, roles, query.nodeIdFilter);
//   }

//   @Get(':userId/processed')
//   @ApiOperation({ summary: 'Danh sách văn bản đã xử lý gần đây của người dùng' })
//   @ApiParam({ name: 'userId', description: 'ID của người dùng' })
//   getProcessedItems(
//     @Param('userId') userId: string,
//     @Query('since') since?: string,
//     @Query('limit') limit?: number
//   ) {
//     return this.usersService.getProcessedItems(userId, {
//       since,
//       limit: limit ? +limit : undefined,
//     });
//   }
//   @Post('/inflow')
//   @ApiOperation({ summary: 'Danh sách người dùng trong luồng xử lý văn bản' })
//   @ApiBody({ type: GetRolesDto })
//   @ApiQuery({ name: 'limit', required: false })
//   @ApiQuery({ name: 'page', required: false })
//   @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên người dùng' })
//   async getUsersInFlow(
//     @Body() payload: any,
//     @Query('limit') limitQuery?: string,
//     @Query('page') pageQuery?: string,
//     @Query('name') name?: string,
//     @Req() req?: any,
//   ) {
//     const limit = parseInt(limitQuery || '10');
//     const page = parseInt(pageQuery || '1');
//     payload.userId = payload.userId || req?.user?.userId;

//     return this.usersService.getUsersInFlow(
//       payload.userId,
//       payload.documentId,
//       limit,
//       page,
//       payload?.roles,
//       name,
//       payload?.documentType
//     );
//   }
//   @Post('/return-user')
//   @ApiOperation({ summary: 'Danh sách người dùng có thể trả lại trong luồng xử lý' })
//   @ApiBody({ type: GetRolesDto })
//   async getReturnUser(
//     @Body() payload: GetRolesDto,
//     @Query('limit') limitQuery?: string,
//     @Query('page') pageQuery?: string,
//     @Query('name') name?: string,
//   ) {
//     const limit = parseInt(limitQuery || '100');
//     const page = parseInt(pageQuery || '1');

//     return this.usersService.getReturnUser(payload, limit, page, name);
//   }

//   // @Post('/organization-units-byFlow')
//   @ApiOperation({ summary: 'Danh sách phòng ban trong luồng xử lý văn bản' })
//   @ApiQuery({ name: 'limit', required: false })
//   @ApiQuery({ name: 'page', required: false })
//   @ApiQuery({ name: 'filter', required: false })
//   @ApiQuery({ name: 'byRoles', required: true })
//   @ApiQuery({ name: 'name', required: false, description: 'Tìm kiếm theo tên đơn vị' })
//   @ApiBody({ type: GetRolesDto })
//   async getOrganizationUnit(
//     @Body() payload: GetRolesDto,
//     @Query('limit') limitQuery?: string,
//     @Query('page') pageQuery?: string,
//     @Query('filter') filterQuery?: string,
//     @Query('byRoles') byRoles?: string,
//     @Query('name') name?: string,
//   ) {
//     const limit = parseInt(limitQuery || '10');
//     const page = parseInt(pageQuery || '1');
//     const filter = filterQuery ? JSON.parse(filterQuery) : {};
//     filter.status = 1;

//     return this.usersService.getOrganizationUnit(
//       payload,
//       filter,
//       limit,
//       page,
//       byRoles === 'true',
//       name,
//     );
//   }
//   @Post('/organization-units-byFlow')
//   @ApiOperation({ summary: 'Danh sách phòng ban trong luồng xử lý văn bản' })
//   async getOrgUnitsByFlow(
//     @Body() payload: any,
//     // @Body() payload: GetRolesDto,
//     @Query('limit') limitQuery?: string,
//     @Query('page') pageQuery?: string,
//     @Query('name') name?: string,
//     @Query('unit') unit?: string,
//   ) {
//     const limit = parseInt(limitQuery || '100');
//     const page = parseInt(pageQuery || '1');

//     return this.usersService.getOrganizationUnitsByFlow(
//       payload,
//       limit,
//       page,
//       name,
//     );
//   }

// }
