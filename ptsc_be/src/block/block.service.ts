import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from './entities/block.entity';

export interface BlockItem {
  key: string;
  name: string;
  order: number;
  type?: string;
  imageUrl?: string;
  height?: string | number;
  title?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  text?: string;
  vi?: string;
  en?: string;
  titleColor?: string;
  textColor?: string;
  logo?: string;
  menu?: Array<{
    label: string;
    href: string;
  }>;
  src?: string;
  width?: number;
  left?: string;
  right?: string;
  split?: string;
  desc?: string;
  childComponent?: string;
  content?: string;
  [key: string]: any;
}

export interface SaveBlocksDto {
  pageId: string;
  blocks: BlockItem[];
  replaceAll?: boolean;
}

@Injectable()
export class BlocksService {
  constructor(
    @InjectRepository(Block, 'mssqlConnection')
    private blockRepository: Repository<Block>,
  ) {}

  /**
   * Lấy blocks của một trang theo pageId
   */
  async getBlocksByPage(pageId: string): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({
      where: { pageId },
    });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    return page.getBlocksData().filter((b) => b.status !== 0);
  }

  /**
   * Lưu/cập nhật blocks cho một trang
   * Nếu replaceAll = true, sẽ xóa page cũ và tạo mới
   * Nếu replaceAll = false, sẽ cập nhật blocks nếu page tồn tại
   */
  async saveBlocks(dto: SaveBlocksDto): Promise<BlockItem[]> {
    const { pageId, blocks, replaceAll = true } = dto;

    if (!pageId || pageId.trim() === '') {
      throw new BadRequestException('pageId không được rỗng');
    }

    if (!Array.isArray(blocks)) {
      throw new BadRequestException('Blocks phải là một mảng');
    }

    // Validate only when there is data; allow empty array to initialize page
    if (blocks.length > 0) {
      this.validateBlocks(blocks);
    }

    let page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      // Tạo trang mới
      page = this.blockRepository.create({
        pageId,
        replaceAll: replaceAll ?? true,
        status: 1,
      });
    } else if (replaceAll) {
      // Xóa page cũ nếu replaceAll = true
      await this.blockRepository.delete({ pageId });
      page = this.blockRepository.create({
        pageId,
        replaceAll: true,
        status: 1,
      });
    }

    // Gán mặc định status: 1 cho các block mới lưu nếu chưa có status
    const processedBlocks = blocks.map((b) => ({
      ...b,
      status: b.status !== undefined ? b.status : 1,
    }));

    // Set blocks data
    page.setBlocksData(processedBlocks);

    // Lưu vào database
    const saved = await this.blockRepository.save(page);
    return saved.getBlocksData().filter((b) => b.status !== 0);
  }

  /**
   * Cập nhật một block trong mảng
   */
  async updateBlock(
    pageId: string,
    blockKey: string,
    updates: Partial<BlockItem>,
  ): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();
    const blockIndex = blocks.findIndex((b) => b.key === blockKey && b.status !== 0);

    if (blockIndex === -1) {
      throw new NotFoundException(
        `Không tìm thấy block với key: ${blockKey} hoặc block đã bị xóa`,
      );
    }

    // Cập nhật block
    blocks[blockIndex] = {
      ...blocks[blockIndex],
      ...updates,
    };

    // Lưu lại
    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Thêm block mới vào mảng
   */
  async addBlock(pageId: string, newBlock: BlockItem): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();

    // Kiểm tra key không trùng (chỉ xét block đang active)
    if (blocks.some((b) => b.key === newBlock.key && b.status !== 0)) {
      throw new BadRequestException(`Block với key "${newBlock.key}" đã tồn tại`);
    }

    // Nếu block đã tồn tại nhưng ở trạng thái xóa mềm, ghi đè/kích hoạt lại, ngược lại push mới
    const existingIndex = blocks.findIndex((b) => b.key === newBlock.key);
    const blockToAdd = {
      ...newBlock,
      status: 1,
    };

    if (existingIndex !== -1) {
      blocks[existingIndex] = blockToAdd;
    } else {
      blocks.push(blockToAdd);
    }

    // Sort theo order
    blocks.sort((a, b) => a.order - b.order);

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Xóa block khỏi mảng (Xóa mềm bằng cách cập nhật status = 0)
   */
  async deleteBlock(pageId: string, blockKey: string): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();
    const blockIndex = blocks.findIndex((b) => b.key === blockKey && b.status !== 0);

    if (blockIndex === -1) {
      throw new NotFoundException(
        `Không tìm thấy block với key: ${blockKey}`,
      );
    }

    // Cập nhật trạng thái thành 0 (xóa mềm)
    blocks[blockIndex].status = 0;

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Thêm menu item vào block header của trang
   */
  async addMenuItem(
    pageId: string,
    menuItem: { label: string; href: string },
  ): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();
    const headerBlock = blocks.find((b) => b.key === 'header');

    if (!headerBlock) {
      throw new NotFoundException('Không tìm thấy block header trong trang này');
    }

    if (!headerBlock.menu) {
      headerBlock.menu = [];
    }

    headerBlock.menu.push(menuItem);

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Xóa menu item khỏi block header của trang
   */
  async removeMenuItem(
    pageId: string,
    menuItem: { label: string; href: string },
  ): Promise<BlockItem[]> {
    if (menuItem.href) {
      const slug = menuItem.href.startsWith('/')
        ? menuItem.href.substring(1)
        : menuItem.href;
      const linkedPageId = `_${slug}`;

      const linkedPage = await this.blockRepository.findOne({
        where: { pageId: linkedPageId },
      });

      if (linkedPage) {
        await this.blockRepository.delete({ pageId: linkedPageId });
      }
    }

    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();
    const headerBlock = blocks.find((b) => b.key === 'header');

    if (!headerBlock) {
      throw new NotFoundException('Không tìm thấy block header trong trang này');
    }

    if (headerBlock.menu) {
      headerBlock.menu = headerBlock.menu.filter(
        (item) => item.href !== menuItem.href || item.label !== menuItem.label,
      );
    }

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Cập nhật menu item trong block header của trang
   */
  async updateMenuItem(
    pageId: string,
    data: {
      old: { label: string; href: string };
      new: { label: string; href: string };
    },
  ): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();
    const headerBlock = blocks.find((b) => b.key === 'header');

    if (!headerBlock) {
      throw new NotFoundException('Không tìm thấy block header trong trang này');
    }

    if (headerBlock.menu) {
      const index = headerBlock.menu.findIndex(
        (item) =>
          item.label === data.old.label && item.href === data.old.href,
      );

      if (index !== -1) {
        headerBlock.menu[index] = {
          ...headerBlock.menu[index],
          ...data.new,
        };
      } else {
        throw new NotFoundException('Không tìm thấy menu item để cập nhật');
      }
    }

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }

  /**
   * Xóa toàn bộ trang
   */
  async deletePage(pageId: string): Promise<void> {
    const result = await this.blockRepository.delete({ pageId });

    if (result.affected === 0) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }
  }

  /**
   * Sắp xếp lại thứ tự blocks
   */
  async reorderBlocks(
    pageId: string,
    orderedBlocks: Array<{ key: string; order: number }>,
  ): Promise<BlockItem[]> {
    const page = await this.blockRepository.findOne({ where: { pageId } });

    if (!page) {
      throw new NotFoundException(`Không tìm thấy trang: ${pageId}`);
    }

    const blocks = page.getBlocksData();

    // Cập nhật order theo dữ liệu gửi lên
    for (const item of orderedBlocks) {
      const block = blocks.find((b) => b.key === item.key);
      if (block) {
        block.order = item.order;
      }
    }

    // Sort theo order
    blocks.sort((a, b) => a.order - b.order);

    page.setBlocksData(blocks);
    await this.blockRepository.save(page);

    return blocks.filter((b) => b.status !== 0);
  }


  /**
   * Lấy tất cả trang (pagination)
   */
  async getAllPages(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Block[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.blockRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  /**
   * Validate blocks structure
   */
  private validateBlocks(blocks: BlockItem[]): void {
    if (!Array.isArray(blocks)) {
      throw new BadRequestException('Blocks phải là một mảng');
    }

    for (const block of blocks) {
      if (!block.key || !block.name) {
        throw new BadRequestException(
          'Mỗi block phải có key và name',
        );
      }

      if (typeof block.order !== 'number') {
        throw new BadRequestException(
          'Mỗi block phải có order là số',
        );
      }
    }
  }
}