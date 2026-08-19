// src/crmsource/crmsource.mysql.repository.ts

import { Injectable } from '@nestjs/common';
import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { ConfigService } from '@nestjs/config';
import { createPool } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export interface CrmSourceRow extends RowDataPacket {
  id: string;
  code: string;
  title: string;
  originalName?: string;
  canDragDrop: boolean;
  canDelete: boolean;
  status?: number;
  state?: string;
  type?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataItem {
  title: string;
  value: string;
}

export interface CrmSourceDTO {
  id?: string;
  code: string;
  title: string;
  originalName?: string;
  canDragDrop?: boolean;
  canDelete?: boolean;
  status?: number;
  state?: string;
  type?: string;
  data?: DataItem[];
  extraFields?: string[];
  originalData?: any[];
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class CrmSourceMySQLRepository {
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = this.createPool();
  }

  private createPool(): Pool {
    const {
      MYSQL_HOST = 'localhost',
      MYSQL_PORT = 3306,
      MYSQL_USER,
      MYSQL_PASSWORD,
      MYSQL_DATABASE,
    } = process.env;

    return createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }

  /**
   * Convert DB row to DTO
   */
  private mapRowToDTO(row: CrmSourceRow): CrmSourceDTO {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      originalName: row.originalName,
      canDragDrop: Boolean(row.canDragDrop),
      canDelete: Boolean(row.canDelete),
      status: row.status,
      state: row.state,
      type: row.type,
      data: [],
      extraFields: [],
      originalData: [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * CREATE - Tạo mới CRM Source
   */
  async create(dto: CrmSourceDTO, tx?: PoolConnection): Promise<CrmSourceDTO | null> {
    const executor = tx || this.pool;
    const id = uuidv4();

    const query = `
      INSERT INTO crm_sources (
        id, code, title, originalName, canDragDrop,
        canDelete,status, state, type, createdAt,
        updatedAt
      ) VALUES (
       ?, ?, ?, ?, ?,
       ?, ?, ?, ?, NOW(),
       NOW())
    `;

    await executor.execute<ResultSetHeader>(query, [
      id,
      dto.code,
      dto.title,
      dto.originalName || null,
      dto.canDragDrop ? 1 : 0,
      dto.canDelete ? 1 : 0,
      dto.status || 1,
      dto.state || null,
      dto.type || null,
    ]);

    return this.findById(id, tx);
  }

  /**
   * READ - Lấy một CRM Source theo ID
   */
  async findById(id: string, tx?: PoolConnection): Promise<CrmSourceDTO | null> {
    const executor = tx || this.pool;
    const [rows] = await executor.execute<CrmSourceRow[]>(
      'SELECT * FROM crm_sources WHERE id = ? LIMIT 1',
      [id],
    );

    return rows.length ? this.mapRowToDTO(rows[0]) : null;
  }

  /**
   * READ - Lấy CRM Source theo code
   */
  async findByCode(code: string, tx?: PoolConnection): Promise<CrmSourceDTO | null> {
    const executor = tx || this.pool;
    const [rows] = await executor.execute<CrmSourceRow[]>(
      'SELECT * FROM crm_sources WHERE code = ? LIMIT 1',
      [code],
    );

    return rows.length ? this.mapRowToDTO(rows[0]) : null;
  }

  /**
   * READ - Lấy tất cả CRM Sources
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    sort?: string,
    filters?: { [key: string]: any }
  ): Promise<{ items: CrmSourceDTO[]; total: number }> {
    if (!this.pool) {
      throw new Error('MySQL connection pool is not initialized.');
    }

    const offset = (page - 1) * limit;
    let baseQuery = 'FROM crm_sources WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      for (const key in filters) {
        if (Object.prototype.hasOwnProperty.call(filters, key) && filters[key] !== undefined && filters[key] !== '') {
          // Chuyển camelCase (VD: canDelete) thành snake_case (VD: can_delete)
          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          baseQuery += ` AND ${dbKey} LIKE ?`;
          params.push(`%${filters[key]}%`);
        }
      }
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as count ${baseQuery}`;
    const [countRows] = await this.pool.execute<RowDataPacket[]>(countQuery, params);
    const total = (countRows[0] as any)?.count || 0;

    // Sắp xếp
    let orderBy = 'ORDER BY createdAt DESC'; // Mặc định
    if (sort) {
      try {
        const sortObj = JSON.parse(sort);
        const sortKey = Object.keys(sortObj)[0];
        const sortDirection = sortObj[sortKey] === 1 ? 'ASC' : 'DESC';
        const dbSortKey = sortKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Validate để tránh SQL Injection
        if (['code', 'title', 'createdAt', 'updatedAt'].includes(sortKey)) {
          orderBy = `ORDER BY ${dbSortKey} ${sortDirection}`;
        }
      } catch (e) {
        // Bỏ qua nếu parse lỗi, dùng sort mặc định
      }
    }

    // Fetch paginated data
    const dataQuery = `SELECT * ${baseQuery} ${orderBy} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await this.pool.query<CrmSourceRow[]>(dataQuery, params);

    return {
      items: rows.map(r => this.mapRowToDTO(r)),
      total,
    };
  }

  /**
   * UPDATE - Cập nhật CRM Source
   */
  async update(id: string, dto: Partial<CrmSourceDTO>, tx?: PoolConnection): Promise<CrmSourceDTO | null> {
    const executor = tx || this.pool;

    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: any[] = [];

    if (dto.code !== undefined) {
      fields.push('code = ?');
      values.push(dto.code);
    }
    if (dto.title !== undefined) {
      fields.push('title = ?');
      values.push(dto.title);
    }
    if (dto.originalName !== undefined) {
      fields.push('originalName = ?');
      values.push(dto.originalName || null);
    }
    if (dto.canDragDrop !== undefined) {
      fields.push('canDragDrop = ?');
      values.push(dto.canDragDrop ? 1 : 0);
    }
    if (dto.canDelete !== undefined) {
      fields.push('canDelete = ?');
      values.push(dto.canDelete ? 1 : 0);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.state !== undefined) {
      fields.push('state = ?');
      values.push(dto.state || null);
    }
    if (dto.type !== undefined) {
      fields.push('type = ?');
      values.push(dto.type || null);
    }

    if (fields.length === 0) return this.findById(id, tx);

    fields.push('updatedAt = NOW()');
    values.push(id);

    const query = `UPDATE crm_sources SET ${fields.join(', ')} WHERE id = ?`;
    await executor.execute(query, values);

    return this.findById(id, tx);
  }

  /**
   * DELETE - Xóa CRM Source
   */
  async delete(id: string, tx?: PoolConnection): Promise<boolean> {
    const executor = tx || this.pool;
    const [result] = await executor.execute<ResultSetHeader>(
      'DELETE FROM crm_sources WHERE id = ?',
      [id],
    );

    return result.affectedRows > 0;
  }

  /**
   * SOFT DELETE MANY - Cập nhật status của nhiều CRM Source
   */
  async softDeleteMany(ids: string[], tx?: PoolConnection): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }
    const executor = tx || this.pool;

    const placeholders = ids.map(() => '?').join(',');

    const query = `UPDATE crm_sources SET status = 3, updatedAt = NOW() WHERE id IN (${placeholders})`;

    const [result] = await executor.execute<ResultSetHeader>(query, ids);

    return result.affectedRows;
  }


  /**
   * Check if code already exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM crm_sources WHERE code = ?';
    const params: any[] = [code];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await this.pool.execute<RowDataPacket[]>(query, params);
    return (rows[0] as any)?.count > 0;
  }

  /**
   * TRANSACTION - Get connection
   */
  async beginTransaction(): Promise<PoolConnection> {
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    return conn;
  }

  /**
   * TRANSACTION - Commit
   */
  async commit(tx: PoolConnection): Promise<void> {
    if (tx) {
      try {
        await tx.commit();
      } finally {
        await tx.release();
      }
    }
  }

  /**
   * TRANSACTION - Rollback
   */
  async rollback(tx: PoolConnection): Promise<void> {
    if (tx) {
      try {
        await tx.rollback();
      } finally {
        await tx.release();
      }
    }
  }

  /**
   * Close pool connection
   */
  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
