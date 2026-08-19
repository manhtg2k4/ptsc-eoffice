import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { BatchCreateBannersDto } from './dto/update-banner.dto';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner, 'mssqlConnection')
    private bannerRepository: Repository<Banner>,
  ) { }

  // API 1: Lấy tất cả banner
  async findAll(query?: { status?: number; bannerKey?: string }) {
    try {
      const where: any = {};

      if (query?.bannerKey) {
        where.bannerKey = query.bannerKey;
      }

      if (query?.status !== undefined) {
        where.status = query.status;
      } else {
        where.status = 1;
      }

      const banners = await this.bannerRepository.find({
        where,
        order: {
          order: 'ASC',
          createdAt: 'DESC',
        },
      });

      return {
        success: true,
        data: banners,
        total: banners.length,
      };
    } catch (error) {
      throw new BadRequestException('Lỗi khi lấy danh sách banner: ' + error.message);
    }
  }

  // API 2: Thêm mới hoặc cập nhật banner theo batch
  async batchCreateOrUpdate(dto: BatchCreateBannersDto, userFromJwt: any) {
    try {
      const userId = userFromJwt?.user || userFromJwt?.sub || userFromJwt?.userId || userFromJwt?.id || 'system';
      const results: Banner[] = [];

      for (const bannerData of dto.banners) {
        const existingBanner = await this.bannerRepository.findOne({
          where: { bannerKey: bannerData.bannerKey },
        });

        if (existingBanner) {
          existingBanner.imageUrl = bannerData.imageUrl ?? null;
          existingBanner.linkUrl = bannerData.linkUrl || null;
          existingBanner.idfile = bannerData.idfile || null;

          if (bannerData.order !== undefined) {
            existingBanner.order = bannerData.order;
          }

          if (bannerData.status !== undefined) {
            existingBanner.status = bannerData.status;
          }

          existingBanner.updatedBy = String(userId);
          const updated = await this.bannerRepository.save(existingBanner);
          results.push(updated);
        } else {
          const newBanner = this.bannerRepository.create({
            bannerKey: bannerData.bannerKey,
            imageUrl: bannerData.imageUrl,
            linkUrl: bannerData.linkUrl,
            idfile: bannerData.idfile,
            status: bannerData.status ?? 1,
            order: bannerData.order ?? 0,
            createdBy: String(userId),
            updatedBy: String(userId),
          });
          const created = await this.bannerRepository.save(newBanner);
          results.push(created);
        }
      }

      return {
        success: true,
        message: 'Tạo/Cập nhật banner thành công',
        data: results,
      };
    } catch (error) {
      console.error('Lỗi batch create/update banner:', error);
      throw new BadRequestException('Lỗi khi tạo/cập nhật banner: ' + error.message);
    }
  }

  // API 3: Lấy chi tiết banner theo ID
  async findOne(id: number) {
    try {
      const banner = await this.bannerRepository.findOne({
        where: { id },
      });

      if (!banner) {
        throw new BadRequestException(`Không tìm thấy banner với ID: ${id}`);
      }

      return {
        success: true,
        data: banner,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi lấy chi tiết banner: ' + error.message);
    }
  }

  // API 4: Lấy chi tiết banner theo bannerKey
  async findByKey(bannerKey: string) {
    try {
      const banner = await this.bannerRepository.findOne({
        where: { bannerKey },
      });

      if (!banner) {
        throw new BadRequestException(`Không tìm thấy banner với bannerKey: ${bannerKey}`);
      }

      return {
        success: true,
        data: banner,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi lấy chi tiết banner: ' + error.message);
    }
  }

  // API 5: Xóa banner theo ID
  async remove(id: number) {
    try {
      const banner = await this.bannerRepository.findOne({
        where: { id },
      });

      if (!banner) {
        throw new BadRequestException(`Không tìm thấy banner với ID: ${id}`);
      }

      await this.bannerRepository.remove(banner);

      return {
        success: true,
        message: 'Xóa banner thành công',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Lỗi khi xóa banner: ' + error.message);
    }
  }
}