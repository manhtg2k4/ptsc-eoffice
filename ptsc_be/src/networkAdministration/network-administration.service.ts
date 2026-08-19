import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NetworkAdministrationEntity } from './network-administration.entity';

@Injectable()
export class NetworkAdministrationService {
  private readonly logger = new Logger(NetworkAdministrationService.name);

  constructor(
    @InjectRepository(NetworkAdministrationEntity, 'mssqlConnection')
    private readonly networkAdminRepo: Repository<NetworkAdministrationEntity>,
  ) { }

  /*
  async create(body: { ips: string[]; type: string }): Promise<NetworkAdministrationEntity[]> {
    const { ips, type } = body;
    const created: NetworkAdministrationEntity[] = [];

    for (const ip of ips) {
      try {
        const entity = this.networkAdminRepo.create({
          ip: ip.trim(),
          type,
        });
        const saved = await this.networkAdminRepo.save(entity);
        created.push(saved);
      } catch (error) {
        // Bỏ qua lỗi trùng IP (unique constraint)
        if (error.code === '23505') { // PostgreSQL unique violation - có thể khác với MSSQL
          this.logger.warn(`IP đã tồn tại, bỏ qua: ${ip}`);
        } else {
          this.logger.error(`Lỗi khi tạo IP ${ip}:`, error);
        }
      }
    }

    // Sắp xếp theo createdAt giảm dần (mới nhất trước)
    return created.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findAll(options: {
    page: number;
    limit: number;
    ip?: string;
    type?: string;
  }): Promise<any> {
    const { page, limit, ip, type } = options;
    const skip = (page - 1) * limit;

    const qb = this.networkAdminRepo.createQueryBuilder('na');

    // Dùng ILike đúng cách (TypeORM hỗ trợ ILike cho PostgreSQL, với MSSQL dùng LOWER + LIKE)
    if (ip) {
      qb.andWhere('LOWER(na.ip) LIKE LOWER(:ip)', { ip: `%${ip}%` });
    }
    if (type) {
      qb.andWhere('LOWER(na.type) LIKE LOWER(:type)', { type: `%${type}%` });
    }

    // Nếu cả ip và type đều có → tự động OR
    if (ip && type) {
      qb.andWhere(
        '(LOWER(na.ip) LIKE LOWER(:ip) OR LOWER(na.type) LIKE LOWER(:type))',
        { ip: `%${ip}%`, type: `%${type}%` },
      );
    }

    const [data, total] = await qb
      .orderBy('na.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      total,
      page,
      limit,
      totalPages,
      data,
    };
  }

  async findOne(id: string): Promise<NetworkAdministrationEntity> {
    const item = await this.networkAdminRepo.findOne({ where: { id: Number(id) } });
    if (!item) {
      throw new NotFoundException(`NetworkAdministration with ID "${id}" not found`);
    }
    return item;
  }

  async update(
    oldIp: string,
    updateDto: { ip: string; type: string },
  ): Promise<NetworkAdministrationEntity> {
    const existing = await this.networkAdminRepo.findOne({ where: { ip: oldIp } });
    if (!existing) {
      throw new NotFoundException(`NetworkAdministration with IP "${oldIp}" not found`);
    }

    // Kiểm tra IP mới có bị trùng không (nếu thay đổi)
    if (updateDto.ip && updateDto.ip !== oldIp) {
      const duplicate = await this.networkAdminRepo.findOne({ where: { ip: updateDto.ip } });
      if (duplicate) {
        throw new BadRequestException(`IP "${updateDto.ip}" đã tồn tại`);
      }
    }

    existing.ip = updateDto.ip || existing.ip;
    existing.type = updateDto.type || existing.type;

    return this.networkAdminRepo.save(existing);
  }

  async remove(ids: string[]): Promise<any> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Mảng IDs không được rỗng');
    }

    const result = await this.networkAdminRepo.delete({ id: In(ids.map(Number)) });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy bản ghi nào với các ID đã cung cấp');
    }

    return { message: `Đã xóa thành công ${result.affected} bản ghi.` };
  }

  async getBlockedIps(): Promise<string[]> {
    try {
      const entries = await this.networkAdminRepo.find({
        select: ['ip'],
      });
      return entries.map(e => e.ip);
    } catch (error) {
      this.logger.error('Lỗi khi lấy danh sách IP bị chặn:', error);
      return [];
    }
  }
  */
}