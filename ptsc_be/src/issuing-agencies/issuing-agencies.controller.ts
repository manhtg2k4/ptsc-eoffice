import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IssuingAgenciesService } from './issuing-agencies.service';
import { CreateIssuingAgencyDto } from './dto/create-issuing-agency.dto';
import { UpdateIssuingAgencyDto } from './dto/update-issuing-agency.dto';
import { DeleteMultipleDto } from './dto/delete-multiple.dto';

@ApiTags('Quản lý Cơ quan cấp hàng [TẮT]')
@Controller('issuing-agencies')
export class IssuingAgenciesController {
  constructor(private readonly issuingAgenciesService: IssuingAgenciesService) {}

  // ========== TẮT API ==========
  // /**
  //  * POST /issuing-agencies
  //  * @summary Tạo mới cơ quan cấp hàng
  //  * @description Tạo mới một cơ quan cấp hàng trong hệ thống
  //  * @param {CreateIssuingAgencyDto} body - Dữ liệu cơ quan cấp hàng cần tạo
  //  * @returns {object} 201 - Tạo thành công
  //  * @returns {object} 400 - Dữ liệu không hợp lệ
  //  */
  // @Post()
  // @ApiOperation({
  //   summary: 'Tạo mới cơ quan cấp hàng',
  //   description: 'Tạo mới một cơ quan cấp hàng trong hệ thống',
  // })
  // @ApiBody({
  //   type: CreateIssuingAgencyDto,
  //   description: 'Dữ liệu cơ quan',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Tạo thành công',
  // })
  // create(@Body() createIssuingAgencyDto: CreateIssuingAgencyDto) {
  //   return this.issuingAgenciesService.create(createIssuingAgencyDto);
  // }

  // /**
  //  * GET /issuing-agencies
  //  * @summary Lấy danh sách cơ quan cấp hàng
  //  * @description Lấy danh sách tất cả cơ quan cấp hàng với hỗ trợ phân trang và tìm kiếm
  //  * @param {number} [page] - Số trang (mặc định: 1)
  //  * @param {number} [limit] - Số bản ghi trên một trang (mặc định: 10)
  //  * @returns {object} 200 - Lấy danh sách thành công
  //  */
  // @Get()
  // @ApiOperation({
  //   summary: 'Lấy danh sách cơ quan cấp hàng',
  //   description: 'Lấy danh sách tất cả cơ quan cấp hàng với hỗ trợ phân trang và tìm kiếm',
  // })
  // @ApiQuery({
  //   name: 'page',
  //   type: Number,
  //   required: false,
  //   description: 'Số trang',
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   type: Number,
  //   required: false,
  //   description: 'Số bản ghi trên một trang',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lấy danh sách thành công',
  // })
  // findAll(@Query() queryParams: any) {
  //   return this.issuingAgenciesService.findAll(queryParams);
  // }

  // /**
  //  * DELETE /issuing-agencies/delete-multiple
  //  * @summary Xóa nhiều cơ quan cấp hàng
  //  * @description Xóa nhiều cơ quan cấp hàng cùng một lúc (soft delete)
  //  * @param {DeleteMultipleDto} body - Danh sách ID cần xóa
  //  * @returns {object} 200 - Xóa thành công
  //  * @returns {object} 400 - Dữ liệu không hợp lệ
  //  */
  // @Delete('/delete-multiple')
  // @ApiOperation({
  //   summary: 'Xóa nhiều cơ quan cấp hàng',
  //   description: 'Xóa nhiều cơ quan cấp hàng cùng một lúc',
  // })
  // @ApiBody({
  //   type: DeleteMultipleDto,
  //   description: 'Danh sách ID cần xóa',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Xóa thành công',
  // })
  // removeMany(@Body() deleteMultipleDto: DeleteMultipleDto) {
  //   return this.issuingAgenciesService.removeMany(deleteMultipleDto.ids);
  // }

  // /**
  //  * GET /issuing-agencies/:id
  //  * @summary Lấy chi tiết cơ quan cấp hàng
  //  * @description Lấy thông tin chi tiết của một cơ quan cấp hàng theo ID
  //  * @param {string} id - ID của cơ quan
  //  * @returns {object} 200 - Lấy chi tiết thành công
  //  * @returns {object} 404 - Không tìm thấy cơ quan
  //  */
  // @Get('/:id')
  // @ApiOperation({
  //   summary: 'Lấy chi tiết cơ quan cấp hàng',
  //   description: 'Lấy thông tin chi tiết của một cơ quan cấp hàng theo ID',
  // })
  // @ApiParam({
  //   name: 'id',
  //   type: String,
  //   description: 'ID của cơ quan',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Lấy chi tiết thành công',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Không tìm thấy cơ quan',
  // })
  // findOne(@Param('id') id: string) {
  //   return this.issuingAgenciesService.findOne(id);
  // }

  // /**
  //  * PUT /issuing-agencies/:id
  //  * @summary Cập nhật cơ quan cấp hàng
  //  * @description Cập nhật thông tin của một cơ quan cấp hàng theo ID (thay thế toàn bộ)
  //  * @param {string} id - ID của cơ quan cần cập nhật
  //  * @param {UpdateIssuingAgencyDto} body - Dữ liệu cập nhật
  //  * @returns {object} 200 - Cập nhật thành công
  //  * @returns {object} 404 - Không tìm thấy cơ quan
  //  */
  // @Put('/:id')
  // @ApiOperation({
  //   summary: 'Cập nhật cơ quan cấp hàng',
  //   description: 'Cập nhật thông tin của một cơ quan cấp hàng theo ID',
  // })
  // @ApiParam({
  //   name: 'id',
  //   type: String,
  //   description: 'ID của cơ quan cần cập nhật',
  // })
  // @ApiBody({
  //   type: UpdateIssuingAgencyDto,
  //   description: 'Dữ liệu cập nhật',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Cập nhật thành công',
  // })
  // update(
  //   @Param('id') id: string,
  //   @Body() updateIssuingAgencyDto: UpdateIssuingAgencyDto,
  // ) {
  //   return this.issuingAgenciesService.update(id, updateIssuingAgencyDto);
  // }

  // /**
  //  * DELETE /issuing-agencies/:id
  //  * @summary Xóa cơ quan cấp hàng
  //  * @description Xóa một cơ quan cấp hàng theo ID (soft delete)
  //  * @param {string} id - ID của cơ quan cần xóa
  //  * @returns {object} 200 - Xóa thành công
  //  * @returns {object} 404 - Không tìm thấy cơ quan
  //  */
  // @Delete('/:id')
  // @ApiOperation({
  //   summary: 'Xóa cơ quan cấp hàng',
  //   description: 'Xóa một cơ quan cấp hàng theo ID',
  // })
  // @ApiParam({
  //   name: 'id',
  //   type: String,
  //   description: 'ID của cơ quan cần xóa',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Xóa thành công',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'Không tìm thấy cơ quan',
  // })
  // remove(@Param('id') id: string) {
  //   return this.issuingAgenciesService.remove(id);
  // }
}
