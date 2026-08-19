import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConnectionPool, Transaction, Request } from 'mssql';

export interface CrmSourceDataDTO {
  id?: string;
  source_Id: string;
  title?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class CrmSourceDataMSSQLRepository {
  constructor(@Inject('MSSQL_POOL') private readonly pool: ConnectionPool) {}

  private mapRowToDTO(row: any): CrmSourceDataDTO {
    return {
      id: row.id,
      source_Id: row.source_id,
      title: row.title,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Lấy executor (transaction hoặc pool) */
  private getRequest(tx?: Transaction): Request {
    return tx ? tx.request() : this.pool.request();
  }

  /** CREATE */
  async create(dto: CrmSourceDataDTO, tx?: Transaction): Promise<CrmSourceDataDTO | null> {
    const req = this.getRequest(tx);
    const id = uuidv4();

    req.input('id', id);
    req.input('source_id', dto.source_Id);
    req.input('title', dto.title || null);
    req.input('value', dto.value || null);

    await req.query(`
      INSERT INTO crm_source_data (
        id, source_id, title, value, createdAt, updatedAt
      )
      VALUES (
        @id, @source_id, @title, @value, GETDATE(), GETDATE()
      )
    `);

    return this.findById(id, tx);
  }

  /** CREATE BATCH */
  async createBatch(dtos: CrmSourceDataDTO[], tx?: Transaction): Promise<CrmSourceDataDTO[]> {
    const result: CrmSourceDataDTO[] = [];
    for (const dto of dtos) {
      const created = await this.create(dto, tx);
      if (created) result.push(created);
    }
    return result;
  }

  /** READ: Find by ID */
  async findById(id: string, tx?: Transaction): Promise<CrmSourceDataDTO | null> {
    const req = this.getRequest(tx);
    req.input('id', id);

    const rs = await req.query(`
      SELECT *
      FROM crm_source_data
      WHERE id = @id
    `);

    if (!rs.recordset.length) return null;
    return this.mapRowToDTO(rs.recordset[0]);
  }

  /** READ: Find by sourceId and value */
  async findBySourceIdAndValue(sourceId: string, value: string, tx?: Transaction): Promise<CrmSourceDataDTO | null> {
    const req = this.getRequest(tx);
    req.input('source_id', sourceId);
    req.input('value', value);

    const rs = await req.query(`
      SELECT *
      FROM crm_source_data
      WHERE source_id = @source_id AND value = @value
    `);

    if (!rs.recordset.length) return null;
    return this.mapRowToDTO(rs.recordset[0]);
  }

  /**
   * READ: Find all by sourceId with pagination, sorting, and filtering
   */
  async findAll(
    sourceId: string,
    page: number,
    limit: number,
    sort?: string,
    filters?: Record<string, any>,
    tx?: Transaction,
  ): Promise<{ items: CrmSourceDataDTO[]; total: number }> {
    const req = this.getRequest(tx);
    req.input('source_id', sourceId);

    let whereClause = 'WHERE source_id = @source_id';
    const filterConditions: string[] = [];

    // Handle individual field filters (title, value)
    if (filters) {
      if (filters.title) {
        filterConditions.push(`title COLLATE Vietnamese_CI_AI LIKE @title`);
        req.input('title', `%${filters.title}%`);
      }
      if (filters.value) {
        filterConditions.push(`value COLLATE Vietnamese_CI_AI LIKE @value`);
        req.input('value', `%${filters.value}%`);
      }
      if (filters.search) {
        filterConditions.push(`(title COLLATE Vietnamese_CI_AI LIKE @search OR value COLLATE Vietnamese_CI_AI LIKE @search)`);
        req.input('search', `%${filters.search}%`);
      }
    }

    if (filterConditions.length > 0) {
      // Nối các điều kiện tìm kiếm bằng OR
      whereClause += ` AND (${filterConditions.join(' OR ')})`;
    }

    // Get total count
    const countResult = await req.query(`SELECT COUNT(*) as total FROM crm_source_data ${whereClause}`);
    const total = countResult.recordset[0].total;

    // Handle sorting
    let orderByClause = 'ORDER BY updatedAt DESC'; // Default sort
    if (sort) {
      try {
        // Thử parse JSON trước, ví dụ: {"value":1}
        const sortObj = JSON.parse(sort);
        const field = Object.keys(sortObj)[0];
        const order = sortObj[field] === 1 ? 'ASC' : 'DESC';
        if (field && ['title', 'value', 'updatedAt'].includes(field)) {
          orderByClause = `ORDER BY ${field} ${order}`;
        }
      } catch (e) {
        // Nếu không phải JSON, thử parse dạng "field:direction"
        const parts = sort.split(':');
        const field = parts[0];
        const order = parts[1] || 'asc';
        if (field && ['title', 'value', 'updatedAt'].includes(field) && ['asc', 'desc'].includes(order.toLowerCase())) {
          orderByClause = `ORDER BY ${field} ${order.toUpperCase()}`;
        }
      }
    }

    // Handle pagination
    const offset = (page - 1) * limit;
    req.input('offset', offset);
    req.input('limit', limit);

    const query = `
      SELECT * FROM crm_source_data
      ${whereClause}
      ${orderByClause}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const result = await req.query(query);

    return {
      items: result.recordset.map(row => this.mapRowToDTO(row)),
      total,
    };
  }

  /** READ: Get all by sourceId (non-paginated, for internal use) */
  async findBySourceId(sourceId: string, tx?: Transaction): Promise<CrmSourceDataDTO[]> {
    const result = await this.findAll(sourceId, 1, 1000, 'updatedAt:desc', {}, tx); // Default to a large limit
    return result.items;
  }
  /** UPDATE */
  async update(id: string, dto: Partial<CrmSourceDataDTO>, tx?: Transaction): Promise<CrmSourceDataDTO | null> {
    const req = this.getRequest(tx);

    const fields: string[] = [];

    if (dto.title !== undefined) {
      fields.push('title = @title');
      req.input('title', dto.title || null);
    }

    if (dto.value !== undefined) {
      fields.push('value = @value');
      req.input('value', dto.value || null);
    }

    if (!fields.length) return this.findById(id, tx);

    req.input('id', id);

    const setClause = `
      ${fields.join(', ')},
      updatedAt = GETDATE()
    `;

    await req.query(`
      UPDATE crm_source_data
      SET ${setClause}
      WHERE id = @id
    `);

    return this.findById(id, tx);
  }

  /** DELETE one */
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const req = this.getRequest(tx);
    req.input('id', id);

    const rs = await req.query(`
      DELETE FROM crm_source_data
      WHERE id = @id
    `);

    return rs.rowsAffected[0] > 0;
  }

  /** DELETE all by sourceId */
  async deleteBySourceId(sourceId: string, tx?: Transaction): Promise<number> {
    const req = this.getRequest(tx);
    req.input('source_id', sourceId);

    const rs = await req.query(`
      DELETE FROM crm_source_data
      WHERE source_id = @source_id
    `);

    return rs.rowsAffected[0] || 0;
  }

  /** DELETE many by IDs */
  async deleteMany(ids: string[], tx?: Transaction): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }

    const req = this.getRequest(tx);

    // Tạo các tham số động để tránh SQL Injection, ví dụ: @id0, @id1, ...
    const idParams = ids.map((_, i) => `@id${i}`);
    ids.forEach((id, i) => {
      req.input(`id${i}`, id);
    });

    // Tạo câu query với mệnh đề IN
    const query = `
      DELETE FROM crm_source_data
      WHERE id IN (${idParams.join(', ')})
    `;

    const result = await req.query(query);

    return result.rowsAffected[0] || 0;
  }
}
