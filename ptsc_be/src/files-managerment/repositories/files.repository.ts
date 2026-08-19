import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConnectionPool, Transaction, Request } from 'mssql';
import * as sql from 'mssql';
import * as path from 'path';

@Injectable()
export class FilesRepository {
  constructor(@Inject('MSSQL_POOL') private readonly pool: ConnectionPool) { }

  /**
   * Tạo request gắn với transaction (nếu có) hoặc pool mặc định
   */
  private getRequest(transaction?: Transaction): Request {
    return transaction ? new sql.Request(transaction) : this.pool.request();
  }

  async getActiveStorageConfig() {
    try {
      const request = this.getRequest();
      const result = await request.query(
        `SELECT TOP 1 * FROM storage_config ORDER BY id DESC`,
      );
      return result.recordset[0];
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async createFile(data: any, transaction?: Transaction): Promise<number> {
    const request = this.getRequest(transaction);

    // Check if parent_id exists in files table to avoid FK conflict
    let validParentId = null;
    if (data.parent_id) {
      const checkRequest = this.getRequest(transaction);
      checkRequest.input('pid', data.parent_id);
      const parentCheck = await checkRequest.query(`SELECT id FROM files WHERE id = @pid`);
      if (parentCheck.recordset.length > 0) {
        validParentId = data.parent_id;
      }
    }

    request.input('file_name', data.file_name);
    request.input('storage_type', data.storage_type);
    request.input('storage_path', data.storage_path);
    request.input('file_path', data.file_path);
    request.input('mime_type', data.mime_type);
    request.input('file_size', data.file_size);
    request.input('parent_id', validParentId);
    request.input('description', data.description || null);
    request.input('created_by', data.created_by);
    request.input('version', data.version || '1.0');
    request.input('is_signed_file', data.is_signed_file || 0);
    request.input('number_of_signed_file', data.number_of_signed_file || 0);
    request.input('typeSize', data.typeSize || null);
    request.input('is_important', data.is_important || data.isImportant || false);
    request.input('is_directory', data.is_directory === 1 || data.is_directory === true ? 1 : 0);

    const query = `
      INSERT INTO files
      (file_name, storage_type, storage_path, file_path, mime_type, file_size,
      is_directory, parent_id, description, status, created_by, version,
      is_signed_file, number_of_signed_file, typeSize, updated_at, is_important)
      OUTPUT inserted.id
      VALUES
      (@file_name, @storage_type, @storage_path, @file_path, @mime_type, @file_size,
      @is_directory, @parent_id, @description, 1, @created_by, @version, @is_signed_file, @number_of_signed_file, @typeSize, GETUTCDATE(), @is_important);
    `;

    const result = await request.query(query);
    return result.recordset[0].id;
  }

  async createFileRelation(
    data: { object_type: string; object_id: string | number; file_id: number },
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('object_type', data.object_type);
    request.input('object_id', data.object_id);
    request.input('file_id', data.file_id);

    await request.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM file_relations
        WHERE object_type = @object_type
          AND CAST(object_id AS NVARCHAR(255)) = CAST(@object_id AS NVARCHAR(255))
          AND file_id = @file_id
          AND status = 1
      )
      BEGIN
        INSERT INTO file_relations (object_type, object_id, file_id, status)
        VALUES (@object_type, @object_id, @file_id, 1);
      END
    `);
  }

  async getActiveFileRelationsByFileIdAndType(
    fileId: number,
    objectType: string,
    transaction?: Transaction,
  ): Promise<Array<{ object_id: string; object_type: string }>> {
    const request = this.getRequest(transaction);
    request.input('file_id', fileId);
    request.input('object_type', objectType);

    const result = await request.query(`
      SELECT object_id, object_type
      FROM file_relations
      WHERE file_id = @file_id
        AND object_type = @object_type
        AND status = 1
      ORDER BY id DESC
    `);

    return result.recordset;
  }

  async setCertifiedCopyRelation(
    objectId: string,
    fileId: number | null,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('objectId', objectId);

    await request.query(`
      UPDATE file_relations
      SET status = 0
      WHERE object_type = 'attachments_cert_copy'
        AND object_id = @objectId
        AND status = 1;
    `);

    if (fileId) {
      const request2 = this.getRequest(transaction);
      request2.input('object_type', 'attachments_cert_copy');
      request2.input('object_id', objectId);
      request2.input('file_id', fileId);

      await request2.query(`
        INSERT INTO file_relations (object_type, object_id, file_id, status)
        VALUES (@object_type, @object_id, @file_id, 1);
      `);
    }
  }

  async getFileById(id: number | string, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('id', id);
    const result = await request.query(`SELECT * FROM files WHERE id = @id`);
    return result.recordset[0];
  }


  async getFileByPublicId(publicId: string, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('publicId', publicId);
    const result = await request.query(`SELECT * FROM files WHERE public_id = @publicId`);
    return result.recordset[0];
  }

  async resolveInternalId(idOrUuid: string | number, transaction?: Transaction): Promise<number | null> {
    const request = this.getRequest(transaction);
    request.input('rawId', String(idOrUuid ?? '').trim());
    const result = await request.query(`
      DECLARE @raw NVARCHAR(100) = @rawId;
      DECLARE @num BIGINT = TRY_CONVERT(BIGINT, @raw);

      IF (@num IS NOT NULL)
      BEGIN
        SELECT TOP 1 CAST(id AS BIGINT) AS id
        FROM files
        WHERE id = @num AND status = 1;
      END
      ELSE IF COL_LENGTH('files', 'public_id') IS NOT NULL
      BEGIN
        SELECT TOP 1 CAST(id AS BIGINT) AS id
        FROM files
        WHERE CAST(public_id AS NVARCHAR(36)) = @raw AND status = 1;
      END
      ELSE
      BEGIN
        SELECT CAST(NULL AS BIGINT) AS id;
      END
    `);

    const value = result.recordset?.[0]?.id;
    return value !== null && value !== undefined ? Number(value) : null;
  }

  async getFileUuidById(id: number, transaction?: Transaction): Promise<string | null> {
    const request = this.getRequest(transaction);
    request.input('id', id);
    const result = await request.query(`
      IF COL_LENGTH('files', 'public_id') IS NOT NULL
      BEGIN
        SELECT TOP 1 CAST(public_id AS NVARCHAR(36)) AS public_id
        FROM files
        WHERE id = @id;
      END
      ELSE
      BEGIN
        SELECT CAST(NULL AS NVARCHAR(36)) AS public_id;
      END
    `);

    return result.recordset?.[0]?.public_id ?? null;
  }
  async getItemsByIds(ids: number[]) {
    const request = this.getRequest();
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    ids.forEach((id, i) => request.input(`id${i}`, id));

    const result = await request.query(
      `SELECT id, is_directory, file_name, is_signed_file FROM files WHERE id IN (${placeholders}) AND status = 1`,
    );
    return result.recordset;
  }

  async getDocumentLibraryTreeByIds(ids: number[]) {
    if (!ids || ids.length === 0) return [];
    const request = this.getRequest();
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    ids.forEach((id, i) => request.input(`id${i}`, id));

    const query = `
      WITH RecursiveDocs AS (
        SELECT 
          d.id, d.name, d.type, d.parent_id, d.file_id, d.status,
          CAST(d.name AS NVARCHAR(MAX)) AS relativePath,
          d.id AS root_id
        FROM document_library d
        WHERE d.id IN (${placeholders}) AND d.status = 1

        UNION ALL

        SELECT 
          child.id, child.name, child.type, child.parent_id, child.file_id, child.status,
          CAST(parent.relativePath + '/' + child.name AS NVARCHAR(MAX)) AS relativePath,
          parent.root_id
        FROM document_library child
        INNER JOIN RecursiveDocs parent ON child.parent_id = parent.id
        WHERE child.status = 1
      )
      SELECT * FROM RecursiveDocs;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  async updateFile(id: number, data: any, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('id', id);
    request.input('file_name', data.file_name);
    request.input('file_path', data.file_path);
    request.input('storage_path', data.storage_path);
    request.input('mime_type', data.mime_type);
    request.input('file_size', data.file_size);
    request.input('typeSize', data.typeSize);

    await request.query(`
      UPDATE files SET
        file_name = @file_name,
        file_path = @file_path,
        storage_path = @storage_path,
        mime_type = @mime_type,
        file_size = @file_size,
        typeSize = @typeSize,
        updated_at = GETUTCDATE()
      WHERE id = @id
    `);
  }

  async updateParentFile(id: number, parentId: number, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('id', id);
    request.input('parent_id', parentId);
    await request.query(`
      UPDATE files SET
        parent_id = @parent_id,
        updated_at = GETUTCDATE()
      WHERE id = @id
    `);
  }

  async updateSignedCount(
    id: number,
    count: number,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('id', id);
    request.input('signed_count', count);
    await request.query(
      `UPDATE files SET number_of_signed_file = @signed_count WHERE id = @id`,
    );
  }

  async getLatestVersion(
    parentId: number,
    transaction?: Transaction,
  ): Promise<number> {
    const request = this.getRequest(transaction);
    request.input('parent_id', parentId);
    const versions = await request.query(`
      SELECT CAST(version AS DECIMAL(10,1)) AS version
      FROM files WHERE parent_id = @parent_id OR id = @parent_id
      ORDER BY CAST(version AS DECIMAL(10,1)) DESC
    `);

    if (versions.recordset.length) {
      return versions.recordset[0].version || 1.0;
    }
    return 1.0;
  }

  async getFilesByDocumentIds(
    dbname: string,
    documentIds: string[],
    objectTypes?: string[],
  ) {
    const cleanDocIds = documentIds.filter(id => id && id.trim() !== '');
    if (!cleanDocIds.length) return [];

    const request = this.getRequest();
    const docPlaceholders = cleanDocIds
      .map((id, i) => {
        const key = `docId${i}`;
        request.input(key, sql.NVarChar(100), id);
        return `@${key}`;
      })
      .join(',');

    let typeCondition = '';
    if (objectTypes?.length) {
      const typePlaceholders = objectTypes
        .map((type, i) => {
          const key = `type${i}`;
          request.input(key, sql.NVarChar(50), type);
          return `@${key}`;
        })
        .join(',');
      typeCondition = `AND fr.object_type IN (${typePlaceholders})`;
    }

    const queryStr = `
      SELECT
        fr.object_id AS documentId,
        fr.object_type,
        fr.status AS relationStatus,
        f.id AS fileId,
        f.file_name AS fileName,
        f.file_size AS fileSize,
        f.mime_type AS mimeType,
        f.file_path AS filePath,
        f.is_directory AS isDirectory,
        f.parent_id AS parentId,
        f.created_at AS createdAt,
        f.updated_at AS updatedAt,
        f.is_important AS isImportant,
        f.is_signed_file AS isSignedFile,
        f.number_of_signed_file AS numberOfSignedFile,
        f.created_by AS createdBy
      FROM ${dbname}.dbo.file_relations fr WITH (NOLOCK)
      JOIN ${dbname}.dbo.files f WITH (NOLOCK) ON fr.file_id = f.id
      WHERE fr.object_id IN (${docPlaceholders})
        ${typeCondition}
        AND f.status = 1
        AND fr.status = 1
      ORDER BY f.created_at DESC
    `;

    const result = await request.query(queryStr);
    return result.recordset;
  }

  async getFileMeta(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(
      `SELECT id, is_directory, file_name FROM files WHERE id = @id AND status = 1`,
    );
    return result.recordset[0];
  }

  async getFileInfo(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(`
      SELECT
        f.id,
        f.file_name,
        f.mime_type,
        f.file_size,
        f.storage_type,
        f.storage_path,
        f.file_path,
        f.is_directory,
        f.status,
        f.version,
        f.parent_id,
        f.description,
        f.created_at,
        f.updated_at,
        f.created_by,
        u.name AS created_by_name
      FROM files f
      LEFT JOIN users u ON u.id = f.created_by
      WHERE f.id = @id AND f.status = 1
    `);
    return result.recordset[0] ?? null;
  }

  async getFilesByObjectAndStatus(type: string, objectId: string, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('type', type);
    request.input('objectId', objectId);
    const result = await request.query(`
      SELECT DISTINCT f.*, fr.object_type, fr.object_id
      FROM file_relations fr
      JOIN files f ON fr.file_id = f.id
      WHERE fr.object_type = @type AND fr.object_id = @objectId AND f.status = 1 AND fr.status = 1
      ORDER BY f.created_at DESC
    `);
    return result.recordset;
  }

  /**
   * Batch: lấy files cho nhiều objectId cùng lúc (dùng để tránh N+1 query)
   * Trả về tất cả rows, mỗi row có fr.object_id để map về từng item
   * Xử lý chunk arrays để tránh lỗi "Too many parameters" (max 2100 ở SQL Server)
   */
  async getFilesByObjectIds(type: string, objectIds: string[], selectColumns?: string[]) {
    if (!objectIds || objectIds.length === 0) return [];

    // SQL Server giới hạn tối đa 2100 parameter, chunkSize = 1000 an toàn tuyệt đối 
    const chunkSize = 1000;
    let allResults: any[] = [];

    const selectCols = selectColumns && selectColumns.length > 0
      ? selectColumns.map(c => `f.${c}`).join(', ')
      : 'f.*';

    for (let i = 0; i < objectIds.length; i += chunkSize) {
      const chunk = objectIds.slice(i, i + chunkSize);

      const request = this.getRequest();
      request.input('type', sql.VarChar(50), type);
      const placeholders = chunk
        .map((id, index) => {
          request.input(`objId${index}`, sql.VarChar(50), id);
          return `@objId${index}`;
        })
        .join(',');

      const result = await request.query(`
        SELECT ${selectCols}, fr.object_type, fr.object_id
        FROM file_relations fr WITH (FORCESEEK)
        JOIN files f ON fr.file_id = f.id
        WHERE fr.object_type = @type 
          AND fr.object_id IN (${placeholders}) 
          AND f.status = 1 
          AND fr.status = 1
        ORDER BY f.created_at DESC
      `);

      allResults = allResults.concat(result.recordset);
    }

    return allResults;
  }

  async getFirstCertifiedCopyFileId(objectId: string, transaction?: Transaction): Promise<number | null> {
    const request = this.getRequest(transaction);
    request.input('objectId', objectId);

    const result = await request.query(`
      SELECT TOP 1 fr.file_id AS fileId
      FROM file_relations fr
      WHERE fr.object_type = 'attachments_cert_copy'
        AND fr.object_id = @objectId
        AND fr.status = 1
      ORDER BY fr.id DESC
    `);

    return result.recordset?.[0]?.fileId ?? null;
  }

  async getLatestObjectTypeByFileId(fileId: number): Promise<string | null> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    const result = await request.query(`
      SELECT TOP 1 object_type
      FROM file_relations
      WHERE file_id = @fileId AND status = 1
      ORDER BY id DESC
    `);
    return result.recordset?.[0]?.object_type ?? null;
  }

  async getPreviousFileIdByFileId(fileId: number): Promise<number | null> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    const result = await request.query(`
      ;WITH current_relations AS (
        SELECT
          fr.id,
          LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))) AS object_type,
          LTRIM(RTRIM(CAST(fr.object_id AS NVARCHAR(255)))) AS object_id
        FROM file_relations fr
        WHERE fr.file_id = @fileId
          AND fr.status = 1
      )
      SELECT TOP 1 prev.file_id
      FROM current_relations cur
      CROSS APPLY (
        SELECT TOP 1 fr2.file_id, fr2.id
        FROM file_relations fr2
        WHERE fr2.status = 1
          AND fr2.id < cur.id
          AND fr2.file_id <> @fileId
          AND LTRIM(RTRIM(CAST(fr2.object_type AS NVARCHAR(255)))) = cur.object_type
          AND LTRIM(RTRIM(CAST(fr2.object_id AS NVARCHAR(255)))) = cur.object_id
        ORDER BY fr2.id DESC
      ) prev
      ORDER BY cur.id DESC, prev.id DESC
    `);
    const value = result.recordset?.[0]?.file_id;
    return value ? Number(value) : null;
  }

  async getLatestRelationByFileId(
    fileId: number,
  ): Promise<{ object_type: string; object_id: string } | null> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    const result = await request.query(`
      SELECT TOP 1 object_type, CAST(object_id AS NVARCHAR(255)) AS object_id
      FROM file_relations
      WHERE file_id = @fileId AND status = 1
      ORDER BY id DESC
    `);
    return result.recordset?.[0] ?? null;
  }

  async getIncomingDocumentSummary(documentId: string): Promise<{
    document_id: string;
    abstract_note: string | null;
    to_book: string | null;
  } | null> {
    const request = this.getRequest();
    request.input('documentId', documentId);
    const result = await request.query(`
      SELECT TOP 1
        CAST(document_id AS NVARCHAR(255)) AS document_id,
        abstract_note,
        to_book
      FROM incomming_documents
      WHERE document_id = @documentId
    `);
    return result.recordset?.[0] ?? null;
  }

  async getOutgoingDocumentSummary(documentId: string): Promise<{
    document_id: string;
    abstract_note: string | null;
    to_book: string | null;
  } | null> {
    const request = this.getRequest();
    request.input('documentId', documentId);
    const result = await request.query(`
      SELECT TOP 1
        CAST(document_id AS NVARCHAR(255)) AS document_id,
        abstract_note,
        to_book
      FROM outgoing_documents
      WHERE document_id = @documentId
    `);
    return result.recordset?.[0] ?? null;
  }

  async getLatestRecordActivityByRecord(
    recordId: string,
    key: string,
    recipientId?: string,
  ): Promise<any | null> {
    const request = this.getRequest();
    request.input('recordId', recordId);
    request.input('key', key);

    let recipientClause = '';
    if (recipientId) {
      request.input('recipientId', recipientId);
      recipientClause = 'AND recipientId = @recipientId';
    }

    const result = await request.query(`
      SELECT TOP 1
        id,
        recipientId,
        senderId,
        content,
        title,
        link,
        isRead,
        [key],
        recordId,
        status,
        createdAt,
        updatedAt
      FROM notifications
      WHERE recordId = @recordId
        AND [key] = @key
        AND status <> 3
        ${recipientClause}
      ORDER BY createdAt DESC, id DESC
    `);

    return result.recordset?.[0] ?? null;
  }

  async getParentOutgoingDocIdByIncomingDocId(incomingDocId: string): Promise<string | null> {
    const request = this.getRequest();
    request.input('incomingDocId', incomingDocId);
    const result = await request.query(`
      SELECT TOP 1 CAST(parent_doc AS NVARCHAR(255)) AS parent_doc
      FROM incomming_documents
      WHERE document_id = @incomingDocId
    `);
    return result.recordset?.[0]?.parent_doc ?? null;
  }

  async getMaxOrderSignerUserIdByOutgoingDocId(outgoingDocId: string): Promise<string | null> {
    const request = this.getRequest();
    request.input('outgoingDocId', outgoingDocId);
    const result = await request.query(`
      SELECT TOP 1 CAST(user_id AS NVARCHAR(255)) AS user_id
      FROM outgoing_document_users
      WHERE document_id = @outgoingDocId
        AND signer_type = 'reportSigner'
        AND user_id IS NOT NULL
      ORDER BY sign_order DESC, created_at DESC, id DESC
    `);
    return result.recordset?.[0]?.user_id ?? null;
  }

  async getReleaseDateByOutgoingDocId(outgoingDocId: string): Promise<string | null> {
    const request = this.getRequest();
    request.input('outgoingDocId', outgoingDocId);
    const result = await request.query(`
      SELECT TOP 1 CAST(release_date AS NVARCHAR(255)) AS release_date
      FROM outgoing_documents
      WHERE document_id = @outgoingDocId
    `);
    return result.recordset?.[0]?.release_date ?? null;
  }

  async getFileForView(id: number, backup?: boolean | string) {
    const request = this.getRequest();
    request.input('id', id);
    let sql: string;
    if (backup || backup === 'true') {
      sql = `SELECT * FROM file_backups WHERE id = @id`;
    } else {
      sql = `SELECT * FROM files WHERE id = @id AND is_directory = 0 AND status = 1`;
    }
    const result = await request.query(sql);
    return result.recordset[0];
  }

  async getFolderRoot(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(
      `SELECT * FROM files WHERE id = @id AND is_directory = 1 AND status = 1`,
    );
    return result.recordset[0];
  }

  async getFolderTree(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(`
      WITH RecursiveFiles AS (
        SELECT * FROM files WHERE id = @id AND status = 1
        UNION ALL
        SELECT f.* FROM files f INNER JOIN RecursiveFiles rf ON f.parent_id = rf.id WHERE f.status = 1
      )
      SELECT * FROM RecursiveFiles WHERE id <> @id
    `);
    return result.recordset;
  }

  async createFolder(data: any, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('folder_name', data.fileName);
    request.input('parent_id', data.parent_id || null);
    request.input('description', data.description || null);
    request.input('created_by', data.userId || null);
    const result = await request.query(`
      INSERT INTO files (file_name, file_path, mime_type, file_size, is_directory, parent_id, description, status, created_at, created_by)
      OUTPUT inserted.id
      VALUES (@folder_name, NULL, NULL, NULL, 1, @parent_id, @description, 1, GETUTCDATE(), @created_by);
    `);
    return result.recordset[0].id;
  }

  async getFilesByObjectWithPagination(
    type: string,
    objectId: string,
    is_signed_file: number | undefined,
    offset: number,
    limit: number,
    fileName?: string,
  ) {
    const request = this.getRequest();
    const conditions: string[] = ['f.status = 1', 'fr.status = 1'];

    if (fileName) {
      conditions.push('f.file_name LIKE @fileName');
      request.input('fileName', `%${fileName}%`);
    }

    if (type) {
      conditions.push('fr.object_type = @type');
      request.input('type', type);
    }
    if (objectId) {
      conditions.push('fr.object_id = @objectId');
      request.input('objectId', objectId);
    }
    if (typeof is_signed_file === 'number') {
      conditions.push('f.is_signed_file = @is_signed_file');
      request.input('is_signed_file', is_signed_file);
    } else {
      conditions.push('(f.is_signed_file IS NULL OR f.is_signed_file = 0)');
    }

    const whereClause = conditions.length
      ? ` WHERE ${conditions.join(' AND ')}`
      : '';

    // Count
    const countQuery = `SELECT COUNT(f.id) as total FROM file_relations fr JOIN files f ON fr.file_id = f.id ${whereClause}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0]?.total || 0;

    if (total === 0) return { data: [], total };

    request.input('limit', limit);
    request.input('offset', offset);
    const dataQuery = `
      SELECT f.*, fr.object_type, fr.object_id
      FROM file_relations fr JOIN files f ON fr.file_id = f.id
      ${whereClause}
      ORDER BY f.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const rowsResult = await request.query(dataQuery);
    return { data: rowsResult.recordset, total };
  }

  async getFilesByObjectWithPaginationIncludeChildren(
    type: string,
    objectId: string,
    is_signed_file: number | undefined,
    offset: number,
    limit: number,
    fileName?: string,
  ) {
    const request = this.getRequest();

    // Lấy tất cả task con, cháu... của task gốc
    const taskIdsQuery = `
      WITH RecursiveTasks AS (
        -- Task gốc
        SELECT id FROM task WHERE id = TRY_CAST(@objectId AS BIGINT)
        UNION ALL
        -- Tất cả task con
        SELECT t.id 
        FROM task t
        INNER JOIN RecursiveTasks rt ON t.parent = rt.id
      )
      SELECT id FROM RecursiveTasks
    `;

    request.input('objectId', objectId);
    const taskIdsResult = await request.query(taskIdsQuery);
    const taskIds = taskIdsResult.recordset.map(row => String(row.id));

    if (taskIds.length === 0) {
      return { data: [], total: 0 };
    }

    // Tạo placeholders cho IN clause
    const placeholders = taskIds.map((_, i) => `@taskId${i}`).join(',');
    taskIds.forEach((id, i) => request.input(`taskId${i}`, id));

    const conditions: string[] = ['f.status = 1', 'fr.status = 1'];

    if (type) {
      conditions.push('fr.object_type = @type');
      request.input('type', type);
    }

    // Thay vì object_id cụ thể, dùng IN với tất cả task IDs
    conditions.push(`fr.object_id IN (${placeholders})`);

    if (fileName) {
      conditions.push('f.file_name LIKE @fileName');
      request.input('fileName', `%${fileName}%`);
    }

    if (typeof is_signed_file === 'number') {
      conditions.push('f.is_signed_file = @is_signed_file');
      request.input('is_signed_file', is_signed_file);
    } else {
      conditions.push('(f.is_signed_file IS NULL OR f.is_signed_file = 0)');
    }

    const whereClause = conditions.length
      ? ` WHERE ${conditions.join(' AND ')}`
      : '';

    // Count
    const countQuery = `SELECT COUNT(f.id) as total FROM file_relations fr JOIN files f ON fr.file_id = f.id ${whereClause}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0]?.total || 0;

    if (total === 0) return { data: [], total };

    request.input('limit', limit);
    request.input('offset', offset);
    const dataQuery = `
      SELECT 
        f.*, 
        fr.object_type, 
        fr.object_id,
        CAST(p.public_id AS NVARCHAR(36)) AS parent_public_id,
        t.name as task_name,
        t.code as task_code
      FROM file_relations fr 
      JOIN files f ON fr.file_id = f.id
      LEFT JOIN files p ON p.id = f.parent_id
      LEFT JOIN task t ON fr.object_id = CAST(t.id AS NVARCHAR(100))
      ${whereClause}
      ORDER BY f.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const rowsResult = await request.query(dataQuery);
    const data = rowsResult.recordset.map((row: any) => ({
      ...row,
      parent_id: row.parent_public_id ?? null,
    }));
    return { data, total };
  }

  async getFilesForProjectWithPagination(
    objectId: string,
    is_signed_file: number | undefined,
    offset: number,
    limit: number,
    fileName?: string,
  ) {
    const request = this.getRequest();

    // 1. Lấy tất cả task thuộc về dự án và các task con/cháu của nó bằng Recursive CTE
    const taskIdsQuery = `
      WITH RecursiveTasks AS (
        SELECT id FROM task WHERE project_id = TRY_CAST(@objectId AS INT) AND status = 1
        UNION ALL
        SELECT t.id 
        FROM task t
        INNER JOIN RecursiveTasks rt ON t.parent = rt.id
        WHERE t.status = 1
      )
      SELECT id FROM RecursiveTasks
    `;

    request.input('objectId', objectId);
    const taskIdsResult = await request.query(taskIdsQuery);
    const taskIds = taskIdsResult.recordset.map(row => String(row.id));

    const conditions: string[] = ['f.status = 1', 'fr.status = 1'];

    if (fileName) {
      conditions.push('f.file_name LIKE @fileName');
      request.input('fileName', `%${fileName}%`);
    }

    if (typeof is_signed_file === 'number') {
      conditions.push('f.is_signed_file = @is_signed_file');
      request.input('is_signed_file', is_signed_file);
    } else {
      conditions.push('(f.is_signed_file IS NULL OR f.is_signed_file = 0)');
    }

    // 2. Gộp: lấy file của project (object_type = 'project') OR file của các task con (object_type = 'taskdocuments')
    if (taskIds.length > 0) {
      const placeholders = taskIds.map((_, i) => `@taskId${i}`).join(',');
      taskIds.forEach((id, i) => request.input(`taskId${i}`, id));
      
      conditions.push(`(
        (fr.object_type = 'project' AND fr.object_id = @objectId)
        OR
        (fr.object_type = 'taskdocuments' AND fr.object_id IN (${placeholders}))
      )`);
    } else {
      conditions.push("fr.object_type = 'project' AND fr.object_id = @objectId");
    }

    const whereClause = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    // Count tổng số file để phân trang
    const countQuery = `SELECT COUNT(f.id) as total FROM file_relations fr JOIN files f ON fr.file_id = f.id ${whereClause}`;
    const totalResult = await request.query(countQuery);
    const total = totalResult.recordset[0]?.total || 0;

    if (total === 0) return { data: [], total };

    request.input('limit', limit);
    request.input('offset', offset);
    
    // Query lấy thông tin file cùng thông tin task chứa file
    const dataQuery = `
      SELECT 
        f.*, 
        fr.object_type, 
        fr.object_id,
        CAST(p.public_id AS NVARCHAR(36)) AS parent_public_id,
        t.name as task_name,
        t.code as task_code
      FROM file_relations fr 
      JOIN files f ON fr.file_id = f.id
      LEFT JOIN files p ON p.id = f.parent_id
      LEFT JOIN task t ON fr.object_id = CAST(t.id AS NVARCHAR(100)) AND fr.object_type = 'taskdocuments'
      ${whereClause}
      ORDER BY f.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const rowsResult = await request.query(dataQuery);
    const data = rowsResult.recordset.map((row: any) => ({
      ...row,
      parent_id: row.parent_public_id ?? null,
    }));
    return { data, total };
  }

  async getFilePath(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(
      `SELECT file_name, file_path FROM files WHERE id = @id AND is_directory = 0 AND status = 1`,
    );
    return result.recordset[0];
  }

  async getFileAndChildren(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(
      `SELECT id, file_path, is_directory FROM files WHERE id = @id AND status = 1`,
    );
    if (!result.recordset.length) return null;

    const file = result.recordset[0];
    let ids = [id];

    if (file.is_directory === 1) {
      const childResult = await request.query(`
          WITH RecursiveFiles AS (
            SELECT id FROM files WHERE parent_id = @id AND status = 1
            UNION ALL
            SELECT f.id FROM files f INNER JOIN RecursiveFiles rf ON f.parent_id = rf.id WHERE f.status = 1
          )
          SELECT id FROM RecursiveFiles
        `);
      ids = ids.concat(childResult.recordset.map((r) => r.id));
    }
    return ids;
  }

  async softDeleteFileRelations(ids: number[], transaction?: Transaction) {
    const request = this.getRequest(transaction);
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    ids.forEach((id, i) => request.input(`id${i}`, id));
    await request.query(
      `UPDATE file_relations SET status = 3 WHERE file_id IN (${placeholders})`,
    );
  }

  async softDeleteFileRelationsByObject(type: string, objectId: string, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('type', type);
    request.input('objectId', objectId);
    await request.query(
      `UPDATE file_relations SET status = 3 WHERE object_type = @type AND object_id = @objectId AND status = 1`,
    );
  }

  async softDeleteFiles(ids: number[], transaction?: Transaction) {
    const request = this.getRequest(transaction);
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    ids.forEach((id, i) => request.input(`id${i}`, id));
    const result = await request.query(
      `UPDATE files SET status = 3 WHERE id IN (${placeholders})`,
    );
    return result.rowsAffected[0];
  }

  async updateFileStoragePath(id: number, path: string) {
    const request = this.getRequest();
    request.input('storage_path', path);
    request.input('id', id);
    await request.query(
      `UPDATE files SET storage_path = @storage_path WHERE id = @id`,
    );
  }

  async updateFileConversion(id: number, data: any, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('file_name', data.file_name);
    request.input('file_path', data.file_path);
    request.input('mime_type', data.mime_type);
    request.input('file_size', data.file_size);
    request.input('parent_id', data.parent_id);
    request.input('description', data.description);
    request.input('storage_path', data.storage_path);
    request.input('id', id);
    await request.query(`
      UPDATE files SET
        file_name = @file_name,
        file_path = @file_path,
        mime_type = @mime_type,
        file_size = @file_size,
        parent_id = @parent_id,
        description = @description,
        storage_path = @storage_path,
        version = '1.0'
      WHERE id = @id
    `);
  }

  async getFileStorageInfo(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(
      `SELECT storage_type, storage_path FROM files WHERE id = @id`,
    );
    return result.recordset[0];
  }

  async updateFileSizeAndDate(id: number, size: number) {
    const request = this.getRequest();
    request.input('file_size', size);
    request.input('id', id);
    await request.query(
      `UPDATE files SET file_size = @file_size, updated_at = GETDATE() WHERE id = @id`,
    );
  }

  async getFileParent(id: number) {
    const request = this.getRequest();
    request.input('fileId', id);
    const result = await request.query(
      `SELECT TOP 1 id, parent_id FROM files WHERE id = @fileId`,
    );
    return result.recordset[0];
  }

  async getFileVersions(rootId: number) {
    const request = this.getRequest();
    request.input('rootId', rootId);
    const result = await request.query(`
      SELECT id, parent_id, created_at, created_by, updated_at, version
      FROM files
      WHERE id = @rootId OR parent_id = @rootId
      ORDER BY TRY_CONVERT(decimal(10,2), version) ASC, created_at ASC
    `);
    return result.recordset;
  }

  async getFileVersionsFull(rootId: number) {
    const request = this.getRequest();
    request.input('rootId', rootId);
    const result = await request.query(`
      SELECT *
      FROM files
      WHERE id = @rootId OR parent_id = @rootId
      ORDER BY TRY_CONVERT(decimal(18,4), version) ASC, id ASC
    `);
    return result.recordset;
  }

  async checkFileRelation(
    fileId: number,
    objectType: string,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('file_id', fileId);
    request.input('object_type', objectType);
    const result = await request.query(
      `SELECT id FROM file_relations WHERE file_id = @file_id AND object_type = @object_type`,
    );
    return result.recordset[0];
  }

  async updateFileRelationObjectId(
    fileId: number,
    objectType: string,
    objectId: string,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('file_id', fileId);
    request.input('object_type', objectType);
    request.input('object_id', objectId);
    await request.query(
      `UPDATE file_relations SET object_id = @object_id, status = 1 WHERE file_id = @file_id AND object_type = @object_type`,
    );
  }

  async insertFileRelationFull(
    fileId: number,
    objectType: string,
    objectId: string,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('file_id', fileId);
    request.input('object_type', objectType);
    request.input('object_id', objectId);
    await request.query(
      `INSERT INTO file_relations (object_type, object_id, file_id, status) VALUES (@object_type, @object_id, @file_id, 1)`,
    );
  }

  async generateUniqueFileName(
    originalName: string,
    objectType: string,
    objectId: string,
  ): Promise<string> {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);

    const result = await this.pool
      .request()
      .input('object_type', objectType)
      .input('object_id', objectId)
      .input('base', baseName).query(`
        SELECT f.file_name
        FROM files f
        INNER JOIN file_relations fr ON fr.file_id = f.id
        WHERE fr.object_type = @object_type
          AND fr.object_id = @object_id
          AND fr.status = 1
          AND f.status = 1
          AND f.is_directory = 0
          AND (
            f.file_name = @base + '${ext}'
            OR f.file_name LIKE @base + ' (%)${ext}'
          )
      `);

    if (!result.recordset.length) {
      return originalName;
    }

    let maxIndex = 0;
    const regex = new RegExp(`^${baseName} \\((\\d+)\\)\\${ext}$`);

    for (const row of result.recordset) {
      const match = row.file_name.match(regex);
      if (match) {
        maxIndex = Math.max(maxIndex, Number(match[1]));
      }
    }

    return `${baseName} (${maxIndex + 1})${ext}`;
  }

  async generateUniqueFileNameSign(
    originalName: string,
    objectType: string,
    objectId: string,
  ): Promise<string> {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);

    // 🔹 Tên sau khi ký
    const signedBaseName = `${baseName}_signed`;

    const result = await this.pool
      .request()
      .input('object_type', objectType)
      .input('object_id', objectId)
      .input('base', signedBaseName).query(`
        SELECT f.file_name
        FROM files f
        INNER JOIN file_relations fr ON fr.file_id = f.id
        WHERE fr.object_type = @object_type
          AND fr.object_id = @object_id
          AND fr.status = 1
          AND f.status = 1
          AND f.is_directory = 0
          AND (
            f.file_name = @base + '${ext}'
            OR f.file_name LIKE @base + ' (%)${ext}'
          )
      `);

    // ✅ Chưa có file signed nào
    if (!result.recordset.length) {
      return `${signedBaseName}${ext}`;
    }

    // 🔢 Tìm index lớn nhất
    let maxIndex = 0;
    const regex = new RegExp(`^${signedBaseName} \\((\\d+)\\)\\${ext}$`);

    for (const row of result.recordset) {
      const match = row.file_name.match(regex);
      if (match) {
        maxIndex = Math.max(maxIndex, Number(match[1]));
      }
    }

    return `${signedBaseName} (${maxIndex + 1})${ext}`;
  }

  async generateUniqueFileNameFolder(
    originalName: string,
    objectType: string,
    objectId: string,
  ): Promise<string> {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);

    const result = await this.pool
      .request()
      .input('object_type', objectType)
      .input('object_id', objectId)
      .input('base', baseName).query(`
        SELECT f.file_name
        FROM files f
        INNER JOIN file_relations fr ON fr.file_id = f.id
        WHERE fr.object_type = @object_type
          AND fr.object_id = @object_id
          AND fr.status = 1
          AND f.status = 1
          AND f.is_directory = 1
          AND (
            f.file_name = @base + '${ext}'
            OR f.file_name LIKE @base + ' (%)${ext}'
          )
      `);

    if (!result.recordset.length) {
      return originalName;
    }

    let maxIndex = 0;
    const regex = new RegExp(`^${baseName} \\((\\d+)\\)\\${ext}$`);

    for (const row of result.recordset) {
      const match = row.file_name.match(regex);
      if (match) {
        maxIndex = Math.max(maxIndex, Number(match[1]));
      }
    }

    return `${baseName} (${maxIndex + 1})${ext}`;
  }

  async getBackupByFileId(fileId: number) {
    const result = await this.pool
      .request()
      .input('file_id', fileId)
      .query(`
        SELECT
          id,
          file_id,
          storage_path,
          storage_type,
          created_by,
          created_at,
          file_name,
          mime_type,
          file_size,
          version,
          is_signed_file,
          number_of_signed_file,
          status
        FROM file_backups
        WHERE file_id = @file_id
      `);

    return result.recordset[0] ?? null;
  }

  async createBackupIfNotExists(input: {
    fileId: number;
    storagePath: string;
    storageType?: string;
    fileSize: number;
    createdBy?: string;
  }) {
    await this.pool
      .request()
      .input('file_id', input.fileId)
      .input('storage_path', input.storagePath)
      .input('storage_type', input.storageType ?? null)
      .input('file_size', input.fileSize)
      .input('created_by', input.createdBy ?? null)
      .query(`
        INSERT INTO file_backups (
          file_id,
          storage_path,
          storage_type,
          created_by,
          file_name,
          mime_type,
          file_size,
          version,
          is_signed_file,
          number_of_signed_file,
          status
        )
        SELECT
          f.id,
          @storage_path,
          COALESCE(@storage_type, f.storage_type),
          @created_by,
          f.file_name,
          f.mime_type,
          @file_size,
          f.version,
          f.is_signed_file,
          f.number_of_signed_file,
          f.status
        FROM files f
        WHERE f.id = @file_id
          AND NOT EXISTS (
            SELECT 1 FROM file_backups fb WHERE fb.file_id = f.id
          )
      `);
  }

  async updateFileMetadataAfterOverwrite(input: {
    fileId: number;
    storagePath: string;
    storageType?: string;
    fileSize: number;
    mimeType?: string;
    updatedBy?: string;
  }) {
    await this.pool
      .request()
      .input('file_id', input.fileId)
      .input('storage_path', input.storagePath)
      .input('storage_type', input.storageType ?? null)
      .input('file_size', input.fileSize)
      .input('mime_type', input.mimeType ?? null)
      .input('updated_by', input.updatedBy ?? null)
      .query(`
        UPDATE f
        SET
          f.file_size = @file_size,
          f.mime_type = COALESCE(@mime_type, f.mime_type),
          f.storage_path = @storage_path,
          f.storage_type = COALESCE(@storage_type, f.storage_type),
          f.updated_at = GETDATE(),
          f.created_by = COALESCE(@updated_by, f.created_by)
        FROM files f
        WHERE f.id = @file_id
      `);
  }
  async getFilesByIdsFull(ids: number[], currentUserId: string) {
    if (!ids || ids.length === 0) return [];

    const request = this.getRequest();
    const placeholders = ids.map((_, i) => `@id${i}`).join(',');
    ids.forEach((id, i) => request.input(`id${i}`, id));
    request.input('currentUserId', currentUserId);

    const query = `
      SELECT
        f.*,
        fr.object_type,
        fr.object_id,
        t.name as task_name,
        t.code as task_code,
        u.name as created_by_name,
        CASE WHEN f.created_by = @currentUserId THEN 1 ELSE 0 END as is_uploader
      FROM files f
      LEFT JOIN file_relations fr ON f.id = fr.file_id
      LEFT JOIN task t ON fr.object_id = CAST(t.id AS NVARCHAR(100)) AND fr.object_type = 'finaldocuments'
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.id IN (${placeholders}) 
      ORDER BY f.created_at DESC
    `;

    const result = await request.query(query);
    return result.recordset.map(item => ({
      ...item,
      is_uploader: item.is_uploader === 1
    }));
  }

  async canUserViewFile(
    fileId: string,
    userId: string,
  ): Promise<boolean> {
    const request = this.getRequest();
    request.input('file_id', fileId);
    request.input('user_id', userId);

    const result = await request.query(`
        SELECT TOP 1 1 AS hasAccess
        FROM files f
        WHERE f.id = @file_id
          AND f.status = 1
          AND (
            f.created_by = @user_id 
            OR EXISTS (
              SELECT 1
              FROM file_relations fr
              WHERE fr.file_id = f.id 
                AND fr.status = 1
                AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) IN (
                  'docdraft',
                  'outgoingdocument',
                  'incommingdocument',
                  'incomingdocument',
                  'attachmentscertcopy',
                  'docAttachments'
                )
                AND (
                  EXISTS (
                    SELECT 1
                    FROM audit au
                    WHERE au.document_id = fr.object_id
                      AND (
                        au.user_id = @user_id
                        OR au.created_by = @user_id
                        OR au.processed_by = @user_id
                        OR au.receiver = @user_id
                      )
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM incomming_documents idoc
                    CROSS APPLY STRING_SPLIT(idoc.view_group, ',') s
                    INNER JOIN group_users gu ON (gu.id = LTRIM(RTRIM(s.value)) OR gu.code = LTRIM(RTRIM(s.value)))
                    INNER JOIN user_group_users ugu ON ugu.group_user_id = gu.id
                    WHERE idoc.document_id = fr.object_id
                      AND ugu.user_id = @user_id
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM outgoing_documents od
                    CROSS APPLY OPENJSON(od.document_viewer_groups) vg
                    INNER JOIN user_group_users ugu ON ugu.group_user_id = vg.value
                    WHERE od.document_id = fr.object_id
                      AND ugu.user_id = @user_id
                      AND ISJSON(od.document_viewer_groups) = 1
                  )
                )
            )
            OR EXISTS (
              SELECT 1
              FROM file_relations fr
              INNER JOIN outgoing_document_users odu
                ON CAST(odu.document_id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
              WHERE fr.file_id = f.id
                AND fr.status = 1
                AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) IN (
                  'docdraft',
                  'outgoingdocument',
                  'docAttachments'
                )
                AND CAST(odu.user_id AS NVARCHAR(255)) = @user_id
            )
            OR EXISTS (
              SELECT 1
              FROM file_relations fr
              WHERE fr.file_id = f.id
                AND fr.status = 1
                AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) = 'news'
            )
          );
      `);

    return result.recordset.length > 0;
  }

  async canUserEditFileForCollabora(
    fileId: string,
    userId: string,
  ): Promise<boolean> {
    const request = this.getRequest();
    request.input('file_id', fileId);
    request.input('user_id', userId);

    const result = await request.query(`
      WITH UserContext AS (
        SELECT TOP 1
          CAST(id AS NVARCHAR(255)) AS id,
          CAST(parent AS NVARCHAR(255)) AS parentId,
          roles_by_process
        FROM users WITH (NOLOCK)
        WHERE CAST(id AS NVARCHAR(255)) = @user_id
           OR CAST(keycloak_user_id AS NVARCHAR(255)) = @user_id
      ),
      UserRoles AS (
        SELECT DISTINCT CAST(roleJson.roleCode AS NVARCHAR(255)) AS roleCode
        FROM UserContext u
        CROSS APPLY OPENJSON(
          CASE WHEN ISJSON(u.roles_by_process) > 0 THEN u.roles_by_process ELSE '[]' END
        ) WITH (
          roles NVARCHAR(MAX) '$.roles' AS JSON
        ) processJson
        CROSS APPLY OPENJSON(
          CASE WHEN ISJSON(processJson.roles) > 0 THEN processJson.roles ELSE '[]' END
        ) WITH (
          roleCode NVARCHAR(255) '$.roleCode'
        ) roleJson
        WHERE roleJson.roleCode IS NOT NULL
      )
      SELECT TOP 1 1 AS hasAccess
      FROM files f WITH (NOLOCK)
      WHERE f.id = @file_id
        AND f.status = 1
        AND (
          CAST(f.created_by AS NVARCHAR(255)) = @user_id
          OR EXISTS (
            SELECT 1
            FROM file_relations fr WITH (NOLOCK)
            INNER JOIN outgoing_documents od WITH (NOLOCK)
              ON CAST(od.document_id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
              OR CAST(od.id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
            WHERE fr.file_id = f.id
              AND fr.status = 1
              AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) IN (
                'docproposal',
                'docdraft',
                'docattachments',
                'docanswer',
                'docrecall',
                'docreplacement'
              )
              AND (
                CAST(od.drafter AS NVARCHAR(255)) = @user_id
                OR EXISTS (
                  SELECT 1
                  FROM work_items wi WITH (NOLOCK)
                  LEFT JOIN UserContext uc ON 1 = 1
                  WHERE CAST(wi.document_id AS NVARCHAR(255)) = CAST(od.document_id AS NVARCHAR(255))
                    AND wi.state = 'open'
                    AND (
                      CAST(wi.assignee_user_id AS NVARCHAR(255)) = @user_id
                      OR (uc.parentId IS NOT NULL AND CAST(wi.assignee_user_id AS NVARCHAR(255)) = uc.parentId)
                      OR EXISTS (
                        SELECT 1
                        FROM UserRoles ur
                        WHERE ur.roleCode = CAST(wi.role AS NVARCHAR(255))
                      )
                    )
                )
              )
          )
          OR EXISTS (
            SELECT 1
            FROM file_relations fr WITH (NOLOCK)
            INNER JOIN incomming_documents ind WITH (NOLOCK)
              ON CAST(ind.document_id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
              OR CAST(ind.id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
            WHERE fr.file_id = f.id
              AND fr.status = 1
              AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) IN (
                'incommingdocument',
                'incomingdocument',
                'attachmentscertcopy'
              )
              AND (
                CAST(ind.created_by AS NVARCHAR(255)) = @user_id
                OR EXISTS (
                  SELECT 1
                  FROM work_items wi WITH (NOLOCK)
                  LEFT JOIN UserContext uc ON 1 = 1
                  WHERE CAST(wi.document_id AS NVARCHAR(255)) = CAST(ind.document_id AS NVARCHAR(255))
                    AND wi.state = 'open'
                    AND (
                      CAST(wi.assignee_user_id AS NVARCHAR(255)) = @user_id
                      OR (uc.parentId IS NOT NULL AND CAST(wi.assignee_user_id AS NVARCHAR(255)) = uc.parentId)
                      OR EXISTS (
                        SELECT 1
                        FROM UserRoles ur
                        WHERE ur.roleCode = CAST(wi.role AS NVARCHAR(255))
                      )
                    )
                )
              )
          )
        );
    `);

    return result.recordset.length > 0;
  }
  async canUserUpdateSignStatus(
    fileId: string,
    userId: string,
  ): Promise<boolean> {
    const request = this.getRequest();
    request.input('file_id', fileId);
    request.input('user_id', userId);

    const result = await request.query(`
      SELECT TOP 1 1 AS hasAccess
      FROM files f
      WHERE f.id = @file_id
        AND f.status = 1
        AND (
          f.created_by = @user_id
          OR EXISTS (
            SELECT 1
            FROM file_relations fr
            INNER JOIN outgoing_document_users odu
              ON CAST(odu.document_id AS NVARCHAR(255)) = CAST(fr.object_id AS NVARCHAR(255))
            WHERE fr.file_id = f.id
              AND fr.status = 1
              AND LOWER(REPLACE(REPLACE(LTRIM(RTRIM(CAST(fr.object_type AS NVARCHAR(255)))), '_', ''), '-', '')) IN (
                'docdraft',
                'outgoingdocument'
              )
              AND CAST(odu.user_id AS NVARCHAR(255)) = @user_id
          )
        );
    `);

    return result.recordset.length > 0;
  }

  async isUserInMeetingOfFile(fileId: string, userId: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    request.input('userId', userId);

    const result = await request.query(`
      SELECT TOP 1 1
      FROM file_relations fr
      WHERE fr.file_id = @fileId
        AND fr.status = 1
        AND (
          -- Nhánh 1: object_id trỏ thẳng đến meetings
          EXISTS (
            SELECT 1
            FROM meetings m
            WHERE CAST(m.id AS NVARCHAR(255)) = fr.object_id
              AND (
                m.chairman_id = @userId
                OR m.secretary_id = @userId
                OR EXISTS (
                  SELECT 1
                  FROM meeting_units mu
                  INNER JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                  WHERE mu.meeting_id = m.id
                    AND mp.user_id = @userId
                )
              )
          )
          OR
          -- Nhánh 2: object_id trỏ đến meeting_tasks
          EXISTS (
            SELECT 1
            FROM meeting_tasks mt
            INNER JOIN meetings m ON m.id = mt.meeting_id
            WHERE CAST(mt.id AS NVARCHAR(255)) = fr.object_id
              AND (
                m.chairman_id = @userId
                OR m.secretary_id = @userId
                OR EXISTS (
                  SELECT 1
                  FROM meeting_units mu
                  INNER JOIN meeting_participants mp ON mp.meeting_unit_id = mu.id
                  WHERE mu.meeting_id = m.id
                    AND mp.user_id = @userId
                )
              )
          )
        )
    `);

    return result.recordset.length > 0;
  }

  async isUserInVehicleRegistration(fileId: string, userId: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    request.input('userId', userId);

    const result = await request.query(`
      SELECT TOP 1 1 AS hasAccess
      FROM files f WITH (NOLOCK)
      JOIN file_relations fr WITH (NOLOCK) ON fr.file_id = f.id
      WHERE f.id = @fileId
        AND f.status = 1
        AND fr.status = 1
        AND (
          -- Case 1: Người tạo file
          f.created_by = @userId
          
          -- Case 2: Tài xế được phân công (tài xế có thể chưa có trong audit log nếu chưa thao tác gì)
          OR EXISTS (
            SELECT 1 
            FROM vehicle_registration_assignments vra WITH (NOLOCK)
            WHERE vra.registration_id = fr.object_id
              AND vra.driver_id = @userId
          )
          
          -- Case 3: Người tham gia xử lý lịch sử quy trình (bao gồm người tạo phiếu đăng ký xe và người duyệt/xử lý)
          OR EXISTS (
            SELECT 1 
            FROM audit a WITH (NOLOCK)
            WHERE a.document_id = fr.object_id
              AND (
                a.user_id = @userId
                OR a.created_by = @userId
                OR a.receiver = @userId
                OR a.processed_by = @userId
                OR a.acting_as = @userId
              )
          )
        );
    `);

    return result.recordset.length > 0;
  }

  async isUserInPassportRequestOfFile(fileId: string, userId: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    request.input('userId', userId);

    // 1. Lấy thông tin vai trò (roles_by_process) của user cho quy trình PassportRequest
    const userResult = await request.query(`
      SELECT roles_by_process 
      FROM users WITH (NOLOCK) 
      WHERE id = @userId
    `);

    const rolesByProcessStr = userResult.recordset?.[0]?.roles_by_process;
    const userRoles: string[] = [];
    if (rolesByProcessStr) {
      try {
        const parsed = JSON.parse(rolesByProcessStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((rbp: any) => {
            if (rbp.processKey === 'PassportRequest') {
              (rbp.roles || []).forEach((r: any) => { if (r.roleCode) userRoles.push(r.roleCode); });
            }
          });
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // 2. Tạo SQL Filter cho Roles
    let userRolesFilterSQL = '';
    if (userRoles.length > 0) {
      userRoles.forEach((role, index) => {
        request.input(`role${index}`, role);
      });
      userRolesFilterSQL = `OR (wi.role IN (${userRoles.map((_, i) => `@role${i}`).join(',')}))`;
    }

    // 3. Thực thi query kiểm tra quyền xem file theo các phân quyền của Passport Request
    const result = await request.query(`
      SELECT TOP 1 1
      FROM (
        SELECT DISTINCT p.id, p.created_by, p.requester_id, p.name_passport_request
        FROM file_relations fr WITH (NOLOCK)
        INNER JOIN passport_borrow_requests p WITH (NOLOCK) ON (
          (fr.object_id = p.passport_id)
          OR EXISTS (
            SELECT 1 
            FROM passport_delegation_items pdi WITH (NOLOCK)
            WHERE pdi.passport_id = fr.object_id AND pdi.request_id = p.id
          )
          OR (fr.object_id = p.id)
        )
        WHERE fr.file_id = @fileId
          AND fr.status = 1
          AND p.is_deleted = 0
      ) AS req
      WHERE 
        -- 1. Yêu cầu do mình tạo
        req.created_by = @userId
        -- 2. Mình là người yêu cầu
        OR req.requester_id = @userId
        -- 3. Mình là người mượn
        OR req.name_passport_request = @userId
        -- 4. Được ủy quyền
        OR EXISTS (
          SELECT 1 
          FROM passport_delegation_items di WITH (NOLOCK) 
          WHERE di.request_id = req.id AND di.user_id = @userId
        )
        -- 5. Đang được gán xử lý trực tiếp hoặc theo vai trò phù hợp
        OR EXISTS (
          SELECT 1 
          FROM work_items wi WITH (NOLOCK) 
          WHERE wi.document_id = req.id 
            AND wi.state = 'open' 
            AND (
              wi.assignee_user_id = @userId
              ${userRolesFilterSQL}
            )
        )
        -- 6. Đã từng thao tác (audit: user_id)
        OR EXISTS (
          SELECT 1 
          FROM audit a WITH (NOLOCK) 
          WHERE a.document_id = req.id 
            AND a.type_document = 'PassportRequest' 
            AND a.user_id = @userId
        )
        -- 7. Nằm trong danh sách nhận (audit: receiver)
        OR EXISTS (
          SELECT 1 
          FROM audit a WITH (NOLOCK) 
          WHERE a.document_id = req.id 
            AND a.type_document = 'PassportRequest' 
            AND a.receiver = @userId
        )
    `);

    return result.recordset.length > 0;
  }

  async isUserInProjectOfFile(fileId: string, userId: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('fileId', fileId);
    request.input('userId', userId);

    const result = await request.query(`
      SELECT TOP 1 1 as allow 
      FROM project_members pm 
      JOIN file_relations fr ON fr.object_id = CAST(pm.project_id AS NVARCHAR(255))
      WHERE pm.user_id = @userId 
        AND fr.file_id = @fileId
        AND fr.object_type = 'project'
        AND fr.status = 1
    `);

    return result.recordset.length > 0;
  }

  async isNotSigned(fileId: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('fileId', fileId);

    const result = await request.query(`
      SELECT TOP 1 1
      FROM files f 
      WHERE f.id = @fileId
        AND (f.number_of_signed_file = 0 OR f.number_of_signed_file IS NULL);
    `);

    return result.recordset.length > 0;
  }

  // ==================== EXAMPLE FILES METHODS ====================

  async getExampleFileByKey(exampleKey: string) {
    const request = this.getRequest();
    request.input('example_key', exampleKey);
    const result = await request.query(`
      SELECT 
        id,
        file_name,
        example_key,
        example_type,
        file_size,
        mime_type,
        storage_path,
        storage_type,
        created_at,
        updated_at,
        created_by
      FROM files 
      WHERE example_key = @example_key AND status = 1
    `);
    return result.recordset[0] ?? null;
  }

  async getExampleFiles(
    type?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const request = this.getRequest();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE example_key IS NOT NULL AND status = 1';
    if (type) {
      request.input('example_type', type);
      whereClause += ' AND example_type = @example_type';
    }

    const countResult = await request.query(
      `SELECT COUNT(*) as total FROM files ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    const dataResult = await request.query(`
      SELECT 
        id,
        file_name,
        example_key,
        example_type,
        file_size,
        mime_type,
        storage_path,
        storage_type,
        created_at,
        updated_at,
        created_by
      FROM files 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    return {
      data: dataResult.recordset,
      total,
      page,
      limit,
    };
  }

  async updateExampleFile(
    exampleKey: string,
    data: any,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('example_key', exampleKey);

    const updates: string[] = [];

    if (data.example_type !== undefined) {
      request.input('example_type', data.example_type);
      updates.push('example_type = @example_type');
    }
    if (data.file_name !== undefined) {
      request.input('file_name', data.file_name);
      updates.push('file_name = @file_name');
    }
    if (data.description !== undefined) {
      request.input('description', data.description);
      updates.push('description = @description');
    }
    if (data.storage_path !== undefined) {
      request.input('storage_path', data.storage_path);
      updates.push('storage_path = @storage_path');
    }
    if (data.file_path !== undefined) {
      request.input('file_path', data.file_path);
      updates.push('file_path = @file_path');
    }
    if (data.mime_type !== undefined) {
      request.input('mime_type', data.mime_type);
      updates.push('mime_type = @mime_type');
    }
    if (data.file_size !== undefined) {
      request.input('file_size', data.file_size);
      updates.push('file_size = @file_size');
    }
    if (data.storage_type !== undefined) {
      request.input('storage_type', data.storage_type);
      updates.push('storage_type = @storage_type');
    }

    if (updates.length === 0) return;

    request.input('updated_at', new Date());
    updates.push('updated_at = @updated_at');

    const query = `
      UPDATE files 
      SET ${updates.join(', ')}
      WHERE example_key = @example_key
    `;

    await request.query(query);
  }

  async checkExampleKeyExists(exampleKey: string): Promise<boolean> {
    const request = this.getRequest();
    request.input('example_key', exampleKey);
    const result = await request.query(
      `SELECT COUNT(*) as count FROM files WHERE example_key = @example_key`
    );
    return result.recordset[0].count > 0;
  }

  async softDeleteExampleFile(exampleKey: string, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('example_key', exampleKey);
    request.input('updated_at', new Date());
    await request.query(`
      UPDATE files 
      SET status = 0, updated_at = @updated_at
      WHERE example_key = @example_key
    `);
  }

  async getExampleFileById(id: number) {
    const request = this.getRequest();
    request.input('id', id);
    const result = await request.query(`
      SELECT 
        id,
        file_name,
        example_key,
        example_type,
        file_size,
        mime_type,
        storage_path,
        storage_type,
        description,
        created_at,
        updated_at,
        created_by
      FROM files 
      WHERE id = @id AND status = 1
    `);
    return result.recordset[0] ?? null;
  }

  async updateExampleFileById(
    id: number,
    data: any,
    transaction?: Transaction,
  ) {
    const request = this.getRequest(transaction);
    request.input('id', id);

    const updates: string[] = [];

    if (data.example_type !== undefined) {
      request.input('example_type', data.example_type);
      updates.push('example_type = @example_type');
    }
    if (data.file_name !== undefined) {
      request.input('file_name', data.file_name);
      updates.push('file_name = @file_name');
    }
    if (data.description !== undefined) {
      request.input('description', data.description);
      updates.push('description = @description');
    }
    if (data.storage_path !== undefined) {
      request.input('storage_path', data.storage_path);
      updates.push('storage_path = @storage_path');
    }
    if (data.file_path !== undefined) {
      request.input('file_path', data.file_path);
      updates.push('file_path = @file_path');
    }
    if (data.mime_type !== undefined) {
      request.input('mime_type', data.mime_type);
      updates.push('mime_type = @mime_type');
    }
    if (data.file_size !== undefined) {
      request.input('file_size', data.file_size);
      updates.push('file_size = @file_size');
    }
    if (data.storage_type !== undefined) {
      request.input('storage_type', data.storage_type);
      updates.push('storage_type = @storage_type');
    }

    if (updates.length === 0) return;

    request.input('updated_at', new Date());
    updates.push('updated_at = @updated_at');

    await request.query(`
      UPDATE files 
      SET ${updates.join(', ')}
      WHERE id = @id
    `);
  }

  async softDeleteExampleFileById(id: number, transaction?: Transaction) {
    const request = this.getRequest(transaction);
    request.input('id', id);
    request.input('updated_at', new Date());
    await request.query(`
      UPDATE files 
      SET status = 0, updated_at = @updated_at
      WHERE id = @id
    `);
  }

  async checkFilesBelongToDeletedDocument(fileIds: (string | number)[]): Promise<boolean> {
    if (!fileIds || fileIds.length === 0) return false;
    const numericIds = fileIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    if (numericIds.length === 0) return false;

    const placeholders = numericIds.map((_, i) => `@id${i}`).join(', ');
    const request = this.getRequest();
    numericIds.forEach((id, i) => request.input(`id${i}`, id));

    const sql = `
      SELECT TOP 1 1 AS isDeleted
      FROM file_relations fr WITH (NOLOCK)
      LEFT JOIN incomming_documents id WITH (NOLOCK) ON fr.object_id = id.document_id
      LEFT JOIN outgoing_documents od WITH (NOLOCK) ON fr.object_id = od.document_id
      WHERE fr.file_id IN (${placeholders})
        AND fr.status = 1
        AND (id.status = 3 OR od.status = 3)
    `;
    const res = await request.query(sql);
    return res.recordset.length > 0;
  }
}

