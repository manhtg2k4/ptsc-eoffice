import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException, 
  ConflictException, 
  InternalServerErrorException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { CreateAmenitiesDto } from './dto/create-amenities.dto';
import { UpdateAmenitiesDto } from './dto/update-amenities.dto';
import { DeleteAmenitiesDto } from './dto/delete-amenities.dto';
import { STATUS } from 'src/variables/CONST_STATUS';
import * as sql from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import { AmenitiesEntity } from './entities/amenities.entity';

/**
 * Repository: CRUD cho bảng amenities (master data)
 */
@Injectable()
export class AmenitiesRepository {
  private readonly logger = new Logger(AmenitiesRepository.name);
  private pool: sql.ConnectionPool | null = null;

  constructor(
    @InjectRepository(AmenitiesEntity, 'mssqlConnection')
    private readonly repo: Repository<AmenitiesEntity>,
    private readonly configService: ConfigService,
  ) {}

  private async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool && this.pool.connected) return this.pool;
    this.pool = await getMssqlPool(this.configService);
    if (!this.pool.connected) throw new Error('MSSQL pool not connected');
    return this.pool;
  }

  /** CREATE - Tạo master amenity */
  async create(dto: CreateAmenitiesDto): Promise<AmenitiesEntity> {
    // Validate duplicate name
    const existing = await this.repo.findOne({
      where: { name: dto.name, status: Not(STATUS.DELETED) },
    });
    if (existing) {
      throw new ConflictException(`Thiết bị đã tồn tại: ${dto.name}`);
    }

    const amenity = this.repo.create({
      name: dto.name,
      note: dto.note,
      status: dto.status ?? STATUS.ACTIVED,
    });

    const saved = await this.repo.save(amenity);
    return saved;
  }

  /** FIND BY ID */
  async getDetail(id: string): Promise<AmenitiesEntity> {
    const amenity = await this.repo.findOne({
      where: { id, status: Not(STATUS.DELETED) },
      relations: ['roomLinks', 'roomLinks.meetingRoom'],
    });
    if (!amenity) {
      throw new NotFoundException(`Không tìm thấy Thiết bị: ${id}`);
    }
    return amenity;
  }

  /** UPDATE */
  async update(id: string, dto: UpdateAmenitiesDto): Promise<AmenitiesEntity> {
    const amenity = await this.repo.findOne({
      where: { id, status: Not(STATUS.DELETED) },
    });
    if (!amenity) {
      throw new NotFoundException(`Không tìm thấy Thiết bị: ${id}`);
    }

    // Validate duplicate code if changed
    if (dto.name && dto.name !== amenity.name) {
      const existing = await this.repo.findOne({
        where: { name: dto.name, status: Not(STATUS.DELETED), id: Not(id) },
      });
      if (existing) {
        throw new ConflictException(`Thiết bị đã tồn tại: ${dto.name}`);
      }
      amenity.name = dto.name;
    }

    // Update fields
    if (dto.name !== undefined) amenity.name = dto.name;
    if (dto.note !== undefined) amenity.note = dto.note;
    if (dto.status !== undefined) amenity.status = dto.status;

    const updated = await this.repo.save(amenity);
    return updated;
  }

  /** DELETE (soft delete) */
  async delete(dto: DeleteAmenitiesDto) {
    if (!dto.ids?.length) {
      throw new BadRequestException('Cần cung cấp danh sách ID để xóa.');
    }

    const count = await this.repo.count({
      where: { id: In(dto.ids), status: Not(STATUS.DELETED) },
    });
    if (count === 0) {
      throw new NotFoundException('Không tìm thấy Thiết bị hợp lệ để xóa.');
    }
    if (count !== dto.ids.length) {
      throw new ConflictException('Một hoặc nhiều Thiết bị không tồn tại hoặc đã bị xoá.');
    }

    // Soft delete
    await this.repo.update({ id: In(dto.ids) }, { status: STATUS.DELETED });

    return {
      deletedCount: dto.ids.length,
      message: `Đã xóa thành công ${dto.ids.length} Thiết bị.`,
    };
  }

  /**
   * Execute list query
   */
  async executeListQuery(params: {
    selectFields?: string;
    whereClause: string;
    joins: string;
    orderBy: string;
    pagination: { page: number; limit: number; offset: number };
  }): Promise<{ items: any[]; total: number }> {
    const { selectFields, whereClause, joins, orderBy, pagination } = params;
    const pool = await this.getPool();

    const totalSql = `SELECT COUNT(*) AS total FROM amenities ${joins} ${whereClause}`;
    const rowsSql = `
      SELECT ${selectFields} 
      FROM amenities ${joins} 
      ${whereClause} 
      ORDER BY ${orderBy} 
      OFFSET ${pagination.offset} ROWS 
      FETCH NEXT ${pagination.limit} ROWS ONLY
    `;
    try {
      const [totalResult, rowsResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(rowsSql),
      ]);

      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      return { items, total };
    } catch (error) {
      this.logger.error('Query error:', error);
      throw new InternalServerErrorException('Lỗi truy vấn dữ liệu');
    }
  }
}