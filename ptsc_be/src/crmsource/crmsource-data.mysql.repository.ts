// src/crmsource/crmsource-data.mysql.repository.ts

import { Injectable, Inject } from '@nestjs/common';
import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export interface CrmSourceDataRow extends RowDataPacket {
  id: string;
  source_id: string;
  title?: string;
  value?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmSourceDataDTO {
  id?: string;
  source_Id: string; // kept for compatibility with service
  title?: string;
  value?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class CrmSourceDataMySQLRepository {
  constructor(@Inject('MYSQL_POOL') private readonly pool: Pool) { }

  /**
   * Convert DB row (snake_case) to DTO (camelCase)
   */
  private mapRowToDTO(row: CrmSourceDataRow): CrmSourceDataDTO {
    return {
      id: row.id,
      source_Id: row.source_id,
      title: row.title,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * CREATE - Tạo mới data item cho CRM Source
   */
  async create(dto: CrmSourceDataDTO, tx?: PoolConnection): Promise<CrmSourceDataDTO | null> {
    const executor = tx || this.pool;
    const id = uuidv4();

    const query = `
      INSERT INTO crm_source_data (
        id, source_id, title, value, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;

    await executor.execute<ResultSetHeader>(query, [
      id,
      dto.source_Id,
      dto.title || null,
      dto.value || null,
    ]);

    return this.findById(id, tx);
  }

  /**
   * CREATE BATCH - Tạo nhiều data items cùng lúc
   */
  async createBatch(dtos: CrmSourceDataDTO[], tx?: PoolConnection): Promise<CrmSourceDataDTO[]> {
    const executor = tx || this.pool;
    const results: CrmSourceDataDTO[] = [];

    for (const dto of dtos) {
      const result = await this.create(dto, executor as PoolConnection);
      if (result) results.push(result);
    }

    return results;
  }

  /**
   * READ - Lấy một data item theo ID
   */
  async findById(id: string, tx?: PoolConnection): Promise<CrmSourceDataDTO | null> {
    const executor = tx || this.pool;
    const [rows] = await executor.execute<CrmSourceDataRow[]>(
      'SELECT * FROM crm_source_data WHERE id = ? LIMIT 1',
      [id],
    );

    return rows.length ? this.mapRowToDTO(rows[0]) : null;
  }

  /**
   * READ - Lấy tất cả data items của một CRM Source
   */
  async findBySourceId(sourceId: string, tx?: PoolConnection): Promise<CrmSourceDataDTO[]> {
    const executor = tx || this.pool;
    const [rows] = await executor.execute<CrmSourceDataRow[]>(
      'SELECT * FROM crm_source_data WHERE source_id = ? ORDER BY createdAt DESC',
      [sourceId],
    );

    return rows.map(r => this.mapRowToDTO(r));
  }

  /**
   * UPDATE - Cập nhật data item
   */
  async update(id: string, dto: Partial<CrmSourceDataDTO>, tx?: PoolConnection): Promise<CrmSourceDataDTO | null> {
    const executor = tx || this.pool;

    const fields: string[] = [];
    const values: any[] = [];

    if (dto.title !== undefined) {
      fields.push('title = ?');
      values.push(dto.title || null);
    }
    if (dto.value !== undefined) {
      fields.push('value = ?');
      values.push(dto.value || null);
    }

    if (fields.length === 0) return this.findById(id, tx);

    fields.push('updatedAt = NOW()');
    values.push(id); // WHERE id = ?

    const query = `UPDATE crm_source_data SET ${fields.join(', ')} WHERE id = ?`;
    await executor.execute(query, values);

    return this.findById(id, tx);
  }

  /**
   * DELETE - Xóa data item
   */
  async delete(id: string, tx?: PoolConnection): Promise<boolean> {
    const executor = tx || this.pool;
    const [result] = await executor.execute<ResultSetHeader>(
      'DELETE FROM crm_source_data WHERE id = ?',
      [id],
    );

    return result.affectedRows > 0;
  }

  /**
   * DELETE - Xóa tất cả data items của một CRM Source
   */
  async deleteBySourceId(sourceId: string, tx?: PoolConnection): Promise<number> {
    const executor = tx || this.pool;
    const [result] = await executor.execute<ResultSetHeader>(
      'DELETE FROM crm_source_data WHERE source_id = ?',
      [sourceId],
    );

    return result.affectedRows;
  }
}
