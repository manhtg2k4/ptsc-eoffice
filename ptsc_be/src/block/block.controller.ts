import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { BlocksService, BlockItem, SaveBlocksDto } from './block.service';
import { Block } from './entities/block.entity';
// import { Public } from '../oauth/decorator/public.decorator';
import { AdminGuard } from 'src/users/guards/admin.guard';

@ApiTags('Quản lý Khối')
// @Public()

@Controller('pages')
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) { }
  @ApiOperation({
    summary: 'Lấy danh sách khối của trang',
    description: 'Lấy tất cả các khối (blocks) của một trang theo ID trang',
  })
  @ApiParam({
    name: 'pageId',
    description: 'ID của trang',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách khối thành công',
  })
  /**
   * GET /pages/:pageId
   * Lấy blocks của một trang theo pageId
   */
  @Get(':pageId')
  async getBlocks(
    @Param('pageId') pageId: string,
  ): Promise<BlockItem[]> {
    return this.blocksService.getBlocksByPage(pageId);
  }

  @ApiOperation({
    summary: 'Lưu khối của trang',
    description: 'Lưu hoặc cập nhật toàn bộ các khối của một trang',
  })
  @ApiBody({
    // type: saveBookDto,
    description: 'Dữ liệu các khối cần lưu',
  })
  @ApiResponse({
    status: 201,
    description: 'Lưu khối thành công',
  })
  /**
   * POST /pages
   * Lưu/cập nhật toàn bộ blocks của một trang
   * Body: { pageId, blocks: [...], replaceAll?: boolean }
   */
  @UseGuards(AdminGuard)
  @Post()
  async saveBlocks(@Body() dto: SaveBlocksDto): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const savedBlocks = await this.blocksService.saveBlocks(dto);
    return {
      message: 'Đã lưu blocks thành công',
      data: savedBlocks,
    };
  }

  @ApiOperation({
    summary: 'Cập nhật khối cụ thể',
    description: 'Cập nhật thông tin của một khối cụ thể trong trang',
  })
  @ApiParam({
    name: 'pageId',
    description: 'ID của trang',
    required: true,
  })
  @ApiParam({
    name: 'blockKey',
    description: 'Key của khối cần cập nhật',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      description: 'Dữ liệu cập nhật cho khối',
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật khối thành công',
  })
  /**
   * PUT /pages/:pageId/blocks/:blockKey
   * Cập nhật một block cụ thể
   * Body: { ...block updates }
   */
  @Put(':pageId/blocks/:blockKey')
  @UseGuards(AdminGuard)
  async updateBlock(
    @Param('pageId') pageId: string,
    @Param('blockKey') blockKey: string,
    @Body() updates: Partial<BlockItem>,
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.updateBlock(
      pageId,
      blockKey,
      updates,
    );
    return {
      message: 'Đã cập nhật block thành công',
      data: blocks,
    };
  }

  @ApiOperation({
    summary: 'Thêm khối mới',
    description: 'Thêm một khối mới vào trang',
  })
  @ApiParam({
    name: 'pageId',
    description: 'ID của trang',
    required: true,
  })
  @ApiBody({
    // type: BlockItem,
    description: 'Dữ liệu khối mới',
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm khối thành công',
  })
  /**
   * POST /pages/:pageId/blocks
   * Thêm block mới vào trang
   * Body: { key, name, order, ...other fields }
   */
  @Post(':pageId/blocks')
  @UseGuards(AdminGuard)
  async addBlock(
    @Param('pageId') pageId: string,
    @Body() newBlock: BlockItem,
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.addBlock(pageId, newBlock);
    return {
      message: 'Đã thêm block thành công',
      data: blocks,
    };
  }

  @ApiOperation({
    summary: 'Thêm mục menu',
    description: 'Thêm một mục menu mới vào header của trang',
  })
  @ApiParam({
    name: 'pageId',
    description: 'ID của trang',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Tên hiển thị của menu' },
        href: { type: 'string', description: 'Đường dẫn của menu' },
      },
      required: ['label', 'href'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm menu thành công',
  })
  /**
   * POST /pages/:pageId/header/menu
   * Thêm menu item mới vào header
   * Body: { label: "...", href: "..." }
   */
  @Post(':pageId/header/menu')
  @UseGuards(AdminGuard)
  async addMenuItem(
    @Param('pageId') pageId: string,
    @Body() menuItem: { label: string; href: string },
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.addMenuItem(pageId, menuItem);
    return {
      message: 'Đã thêm menu item thành công',
      data: blocks,
    };
  }

  @ApiOperation({
    summary: 'Xóa mục menu',
    description: 'Xóa một mục menu khỏi header của trang',
  })
  @ApiParam({
    name: 'pageId',
    description: 'ID của trang',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Tên hiển thị của menu' },
        href: { type: 'string', description: 'Đường dẫn của menu' },
      },
      required: ['label', 'href'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa menu thành công',
  })
  /**
   * DELETE /pages/:pageId/header/menu
   * Xóa menu item khỏi header
   * Body: { label: "...", href: "..." }
   */
  @Delete(':pageId/header/menu')
  @UseGuards(AdminGuard)
  async removeMenuItem(
    @Param('pageId') pageId: string,
    @Body() menuItem: { label: string; href: string },
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.removeMenuItem(pageId, menuItem);
    return {
      message: 'Đã xóa menu item thành công',
      data: blocks,
    };
  }

  /**
   * PUT /pages/:pageId/header/menu
   * Cập nhật menu item trong header
   * Body: { old: { label, href }, new: { label, href } }
   */
  @UseGuards(AdminGuard)
  @Put(':pageId/header/menu')
  async updateMenuItem(
    @Param('pageId') pageId: string,
    @Body()
    body: {
      old: { label: string; href: string };
      new: { label: string; href: string };
    },
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.updateMenuItem(pageId, body);
    return {
      message: 'Đã cập nhật menu item thành công',
      data: blocks,
    };
  }


  /**
   * DELETE /pages/:pageId/blocks/:blockKey
   * Xóa block khỏi trang
   */
  @UseGuards(AdminGuard)
  @Delete(':pageId/blocks/:blockKey')
  async deleteBlock(
    @Param('pageId') pageId: string,
    @Param('blockKey') blockKey: string,
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.deleteBlock(pageId, blockKey);
    return {
      message: 'Đã xóa block thành công',
      data: blocks,
    };
  }

  /**
   * PUT /pages/:pageId/reorder
   * Sắp xếp lại thứ tự blocks
   * Body: { blocks: [{ key, order }, ...] }
   */
  @UseGuards(AdminGuard)
  @Put(':pageId/reorder')
  async reorderBlocks(
    @Param('pageId') pageId: string,
    @Body() body: { blocks: Array<{ key: string; order: number }> },
  ): Promise<{
    message: string;
    data: BlockItem[];
  }> {
    const blocks = await this.blocksService.reorderBlocks(
      pageId,
      body.blocks,
    );
    return {
      message: 'Đã sắp xếp lại blocks thành công',
      data: blocks,
    };
  }

  /**
   * DELETE /pages/:pageId
   * Xóa toàn bộ trang
   */
  @UseGuards(AdminGuard)
  @Delete(':pageId')
  async deletePage(
    @Param('pageId') pageId: string,
  ): Promise<{
    message: string;
  }> {
    await this.blocksService.deletePage(pageId);
    return {
      message: 'Đã xóa trang thành công',
    };
  }

  /**
   * GET /pages?page=1&limit=10
   * Lấy tất cả trang (pagination)
   */
  @Get()
  async getAllPages(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    message: string;
    data: Block[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Giới hạn max limit để bảo vệ DoS (CWE-400)
    const maxLimit = parseInt(process.env.MAX_PAGE_LIMIT || '100', 10);
    const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
    const safePage = Math.max(page, 1);
    const result = await this.blocksService.getAllPages(safePage, safeLimit);
    return {
      message: 'Lấy danh sách trang thành công',
      ...result,
    };
  }
}