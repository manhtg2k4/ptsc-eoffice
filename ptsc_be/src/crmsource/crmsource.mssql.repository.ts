// src/crmsource/crmsource.mssql.repository.ts

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, Request, ConnectionPool, VarChar } from 'mssql';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { MSSQL_REPO } from '../database/database.provider';

export interface CrmSourceRow {
  id: string;
  code: string;
  title: string;
  originalName?: string;
  canDragDrop: number;
  canDelete: number;
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
export class CrmSourceMSSQLRepository {
  constructor(@Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository) {}

  /** Tạo Request: nếu có transaction thì dùng transaction, không thì dùng pool */
  private request(tx?: Transaction): Request {
    return tx ? tx.request() : this.sqlRepo.getPool().request();
  }

  /** Transaction helpers */
  async beginTransaction(): Promise<Transaction> {
    const tx = new Transaction(this.sqlRepo.getPool());
    await tx.begin();
    return tx;
  }

  async commit(tx: Transaction): Promise<void> {
    await tx.commit();
  }

  async rollback(tx: Transaction): Promise<void> {
    await tx.rollback();
  }

  private mapRowToDTO(row: CrmSourceRow): CrmSourceDTO {
    return {
      id: row.id,
      code: row.code,
      title: row.title,
      originalName: row.originalName,
      canDragDrop: !!row.canDragDrop,
      canDelete: !!row.canDelete,
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

  // CREATE
  async create(dto: CrmSourceDTO, tx?: Transaction): Promise<CrmSourceDTO | null> {
    const id = uuidv4();
    const req = this.request(tx);

    await req
      .input('id', id)
      .input('code', dto.code)
      .input('title', dto.title)
      .input('originalName', dto.originalName || null)
      .input('canDragDrop', dto.canDragDrop ? 1 : 0)
      .input('canDelete', dto.canDelete ? 1 : 0)
      .input('status', dto.status ?? 1)
      .input('state', dto.state || null)
      .input('type', dto.type || null)
      .query(`
        INSERT INTO crm_sources (
          id, code, title, originalName, canDragDrop, canDelete,
          status, state, type, createdAt, updatedAt
        )
        VALUES (
          @id, @code, @title, @originalName,
          @canDragDrop, @canDelete, @status, @state, @type,
          GETDATE(), GETDATE()
        )
      `);

    return this.findById(id, tx);
  }
  
  async softDeleteMany(ids: string[], tx?: Transaction): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }
    const req = this.request(tx);

    const idParams = ids.map((_, i) => `@id${i}`);
    ids.forEach((id, i) => {
      req.input(`id${i}`, VarChar, id);
    });

    const query = `UPDATE crm_sources SET status = 3, updatedAt = GETDATE() WHERE id IN (${idParams.join(',')})`;

    const result = await req.query(query);

    return result.rowsAffected[0];
  }

  // READ one by ID
  async findById(id: string, tx?: Transaction): Promise<CrmSourceDTO | null> {
    const req = this.request(tx);
    const result = await req.input('id', id).query(`
      SELECT * FROM crm_sources WHERE id = @id
    `);

    return result.recordset.length ? this.mapRowToDTO(result.recordset[0]) : null;
  }

  // READ by code
  async findByCode(code: string, tx?: Transaction): Promise<CrmSourceDTO | null> {
    const req = this.request(tx);
    const result = await req.input('code', code).query(`
      SELECT * FROM crm_sources WHERE code = @code
    `);

    return result.recordset.length ? this.mapRowToDTO(result.recordset[0]) : null;
  }

  // LIST + FILTER + PAGING
  async findAll(
    page = 1,
    limit = 20,
    sort?: string,
    filters?: { status?: number; state?: string; code?: string; title?: string },
  ): Promise<{ items: CrmSourceDTO[]; total: number }> {
    const offset = (page - 1) * limit;
    const req = this.request();

    const whereClauses: string[] = [];

    // Các bộ lọc luôn dùng AND
    if (filters?.status !== undefined) {
      whereClauses.push('status = @status');
      req.input('status', filters.status);
    }
    if (filters?.state) {
      whereClauses.push('state = @state');
      req.input('state', filters.state);
    }

    // Các bộ lọc dùng OR (code, title)
    const orConditions: string[] = [];
    if (filters?.code) {
      orConditions.push('code COLLATE Vietnamese_CI_AI LIKE @code');
      req.input('code', `%${filters.code}%`);
    }
    if (filters?.title) {
      orConditions.push('title COLLATE Vietnamese_CI_AI LIKE @title');
      req.input('title', `%${filters.title}%`);
    }

    if (orConditions.length > 0) {
      whereClauses.push(`(${orConditions.join(' OR ')})`);
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Secure sort handling
    let orderBy = 'ORDER BY createdAt DESC'; // Default sort
    if (sort) {
      // Whitelist columns to prevent SQL injection
      const allowedColumns = ['id', 'code', 'title', 'createdAt', 'updatedAt', 'status', 'state'];
      let column: string | undefined;
      let sortDirection = 'ASC';

      try {
        // Try parsing as JSON first (e.g., {"title":1} or {"title":-1})
        const sortObj = JSON.parse(sort);
        const keys = Object.keys(sortObj);
        if (keys.length > 0) {
          column = keys[0];
          sortDirection = sortObj[column] === -1 ? 'DESC' : 'ASC';
        }
      } catch (e) {
        // Fallback to 'column:direction' format
        const parts = sort.split(':');
        column = parts[0];
        sortDirection = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      }

      if (column && allowedColumns.includes(column)) {
        orderBy = `ORDER BY ${column} ${sortDirection}`;
      }
    }



    req.input('limit', limit);
    req.input('offset', offset);

    const count = await req.query(`
      SELECT COUNT(*) AS total
      FROM crm_sources
      ${where}
    `);

    const total = count.recordset[0].total;

    const data = await req.query(`
      SELECT *
      FROM crm_sources
      ${where}
      ${orderBy}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    return {
      items: data.recordset.map(r => this.mapRowToDTO(r)),
      total,
    };
  }

  // UPDATE
  async update(id: string, dto: Partial<CrmSourceDTO>, tx?: Transaction): Promise<CrmSourceDTO | null> {
    const req = this.request(tx);
    const set: string[] = [];

    if (dto.code !== undefined) {
      set.push('code = @code');
      req.input('code', dto.code);
    }
    if (dto.title !== undefined) {
      set.push('title = @title');
      req.input('title', dto.title);
    }
    if (dto.originalName !== undefined) {
      set.push('originalName = @originalName');
      req.input('originalName', dto.originalName ?? null);
    }
    if (dto.canDragDrop !== undefined) {
      set.push('canDragDrop = @canDragDrop');
      req.input('canDragDrop', dto.canDragDrop ? 1 : 0);
    }
    if (dto.canDelete !== undefined) {
      set.push('canDelete = @canDelete');
      req.input('canDelete', dto.canDelete ? 1 : 0);
    }
    if (dto.status !== undefined) {
      set.push('status = @status');
      req.input('status', dto.status);
    }
    if (dto.state !== undefined) {
      set.push('state = @state');
      req.input('state', dto.state ?? null);
    }
    if (dto.type !== undefined) {
      set.push('type = @type');
      req.input('type', dto.type ?? null);
    }

    if (!set.length) return this.findById(id);

    req.input('id', id);

    await req.query(`
      UPDATE crm_sources
      SET ${set.join(', ')}, updatedAt = GETDATE()
      WHERE id = @id
    `);

    return this.findById(id, tx);
  }

  // DELETE
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const req = this.request(tx);
    const result = await req.input('id', id).query(`
      DELETE FROM crm_sources WHERE id = @id
    `);
    return result.rowsAffected[0] > 0;
  }

  // CHECK CODE EXISTS
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const req = this.request();
    req.input('code', code);

    let sql = `SELECT COUNT(*) AS count FROM crm_sources WHERE code = @code AND status = 1`;

    if (excludeId) {
      sql += ` AND id != @excludeId`;
      req.input('excludeId', excludeId);
    }

    const result = await req.query(sql);
    return result.recordset[0].count > 0;
  }
}
