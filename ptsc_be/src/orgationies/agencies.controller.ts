import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import {
  CreateAgencyDto,
  UpdateAgencyDto,
  FindAgenciesDto,
} from './agencies.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Quản lý Cơ quan [TẮT]')
@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  // ========== TẮT API ==========
  // /**
  //  * POST /agencies
  //  * @summary Tạo một đơn vị mới
  //  * @description Tạo mới một đơn vị/cơ quan trong hệ thống
  //  * @param {CreateAgencyDto} body - Dữ liệu đơn vị cần tạo
  //  * @returns {object} 201 - Đơn vị được tạo thành công
  //  * @returns {object} 400 - Dữ liệu không hợp lệ
  //  */
  // @Post()
  // @ApiOperation({ summary: 'Tạo một đơn vị mới' })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // create(@Body() createAgencyDto: CreateAgencyDto) {
  //   return this.agenciesService.create(createAgencyDto);
  // }

  /**
   * GET /agencies
   * @summary Tìm kiếm và liệt kê danh sách các đơn vị
   * @description Lấy danh sách các đơn vị với hỗ trợ lọc theo loại ngành, tìm kiếm và phân trang
   * @param {number} [industryType] - Loại ngành (1, 2)
   * @param {string} [search] - Từ khóa tìm kiếm
   * @param {number} [page] - Số trang (mặc định: 1)
   * @param {number} [limit] - Số bản ghi mỗi trang (mặc định: 10)
   * @returns {object} 200 - Danh sách đơn vị phân trang
   */
  @Get()
  @ApiOperation({ summary: 'Tìm kiếm và liệt kê danh sách các đơn vị' })
  @ApiQuery({ name: 'industryType', required: false, enum: [1, 2] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: FindAgenciesDto) {
    return this.agenciesService.findAll(query);
  }

  // /**
  //  * GET /agencies/:id
  //  * @summary Lấy thông tin chi tiết một đơn vị
  //  * @description Lấy thông tin đầy đủ của một đơn vị theo ID
  //  * @param {string} id - ID của đơn vị
  //  * @returns {object} 200 - Thông tin đơn vị
  //  * @returns {object} 404 - Không tìm thấy đơn vị
  //  */
  // @Get(':id')
  // @ApiOperation({ summary: 'Lấy thông tin chi tiết một đơn vị' })
  // findOne(@Param('id') id: string) {
  //   return this.agenciesService.findOne(id);
  // }

  // /**
  //  * PATCH /agencies/:id
  //  * @summary Cập nhật thông tin một đơn vị
  //  * @description Cập nhật các thông tin của đơn vị theo ID (chấp nhận cập nhật một phần)
  //  * @param {string} id - ID của đơn vị
  //  * @param {UpdateAgencyDto} body - Dữ liệu cập nhật
  //  * @returns {object} 200 - Cập nhật thành công
  //  * @returns {object} 404 - Không tìm thấy đơn vị
  //  */
  // @Patch(':id')
  // @ApiOperation({ summary: 'Cập nhật thông tin một đơn vị' })
  // @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // update(
  //   @Param('id') id: string,
  //   @Body() updateAgencyDto: UpdateAgencyDto,
  // ) {
  //   return this.agenciesService.update(id, updateAgencyDto);
  // }

  // /**
  //  * DELETE /agencies/:id
  //  * @summary Xóa một đơn vị (soft delete)
  //  * @description Đánh dấu đơn vị đã xóa bằng cách đặt status = 3
  //  * @param {string} id - ID của đơn vị
  //  * @returns {object} 200 - Xóa thành công
  //  * @returns {object} 404 - Không tìm thấy đơn vị
  //  */
  // @Delete(':id')
  // @ApiOperation({
  //   summary: 'Xóa một đơn vị (soft delete)',
  //   description: 'Đánh dấu status của đơn vị thành 3 (đã xóa).',
  // })
  // remove(@Param('id') id: string) {
  //   return this.agenciesService.remove(id);
  // }
}