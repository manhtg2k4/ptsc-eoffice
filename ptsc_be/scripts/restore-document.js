const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: parseInt(process.env.SQLSERVER_PORT) || 1433,
  user: process.env.SQLSERVER_USER || 'lifetex',
  password: process.env.SQLSERVER_PASSWORD || 'LTLT@2025',
  database: process.env.SQLSERVER_DATABASE || 'app_tancang',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function restoreDocument() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('❌ Vui lòng cung cấp đường dẫn file backup. Ví dụ: node scripts/restore-document.js backup_726949903703.json');
    process.exit(1);
  }

  let filePath = path.isAbsolute(backupFile) ? backupFile : path.join(__dirname, '..', backupFile);
  
  // Nếu không thấy ở thư mục gốc, thử tìm trong thư mục backups/
  if (!fs.existsSync(filePath)) {
    const backupInSubDir = path.join(__dirname, '../backups', backupFile);
    if (fs.existsSync(backupInSubDir)) {
      filePath = backupInSubDir;
    } else {
      console.error(`❌ Không tìm thấy file: ${backupFile} ở thư mục gốc hoặc thư mục backups/`);
      process.exit(1);
    }
  }

  const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { document_id, tables } = backupData;

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log(`\n🗑️  Đang xóa dữ liệu cũ cho document_id: ${document_id}...`);
      
      // Xóa theo thứ tự ngược lại để tránh xung đột khóa ngoại (nếu có)
      const deleteQueries = [
        { table: 'outgoing_current_state', column: 'document_id' },
        { table: 'outgoing_assignment', column: 'document_id' },
        { table: 'document_comments', column: 'document_id' },
        { table: 'document_current_state', column: 'document_id' },
        { table: 'document_history', column: 'document_id' },
        { table: 'work_items', column: 'document_id' },
        { table: 'file_relations', column: 'object_id' },
        { table: 'outgoing_document_users', column: 'document_id' },
        { table: 'audit', column: 'document_id' },
        { table: 'outgoing_documents', column: 'document_id' }
      ];

      // Lưu trữ fileIds để xóa bảng files
      const fileIds = tables['file_relations']?.map(fr => fr.file_id) || [];

      for (const dq of deleteQueries) {
        try {
          const tableCheck = await transaction.request()
            .input('tableName', sql.VarChar, dq.table)
            .query(`SELECT OBJECT_ID(@tableName, 'U') AS table_id`);
          
          if (!tableCheck.recordset[0].table_id) continue;

          await transaction.request()
            .input('id', sql.VarChar, document_id)
            .query(`DELETE FROM ${dq.table} WHERE ${dq.column} = @id`);
          console.log(`   - Đã xóa từ ${dq.table}`);
        } catch (err) {
          console.warn(`   ⚠️  Bỏ qua xóa từ ${dq.table}:`, err.message);
        }
      }

      if (fileIds.length > 0) {
        await transaction.request()
          .query(`DELETE FROM files WHERE id IN (${fileIds.join(',')})`);
        console.log(`   - Đã xóa ${fileIds.length} bản ghi từ files`);
      }

      console.log(`\n📥 Đang chèn lại dữ liệu từ backup...`);

      // Thứ tự chèn để đảm bảo khóa ngoại
      const insertOrder = [
        'outgoing_documents', 
        'audit', 
        'outgoing_document_users', 
        'work_items', 
        'files', 
        'file_relations',
        'outgoing_current_state',
        'outgoing_assignment',
        'document_comments',
        'document_current_state',
        'document_history'
      ];

      for (const tableName of insertOrder) {
        const rows = tables[tableName];
        if (!rows || rows.length === 0) continue;

        const fullTableName = tableName.includes('.') ? tableName : `dbo.${tableName}`;

        // Kiểm tra bảng tồn tại
        const tableIdResult = await transaction.request()
          .input('t', sql.VarChar, tableName)
          .query(`SELECT OBJECT_ID(@t, 'U') as id1, OBJECT_ID('dbo.' + @t, 'U') as id2`);
        
        if (!tableIdResult.recordset[0].id1 && !tableIdResult.recordset[0].id2) {
          console.log(`⏭️  Bỏ qua bảng ${tableName} (không tồn tại trong DB)`);
          continue;
        }

        console.log(`⏳ Đang khôi phục bảng ${tableName} (${rows.length} bản ghi)...`);

        // Kiểm tra xem bảng có cột IDENTITY không
        const identityCheck = await transaction.request()
          .input('tableName', sql.VarChar, tableName)
          .query(`
            SELECT TOP 1 1 as has_id
            FROM sys.identity_columns 
            WHERE object_id = OBJECT_ID(@tableName)
               OR object_id = OBJECT_ID('dbo.' + @tableName)
          `);
        
        const hasIdentity = identityCheck.recordset.length > 0;
        console.log(`   🔍 Identity: ${hasIdentity ? 'CÓ' : 'KHÔNG'}`);

        for (const row of rows) {
          const columns = Object.keys(row);
          const values = columns.map(col => `@${col}`);
          
          let query = '';
          if (hasIdentity) {
            query += `SET IDENTITY_INSERT ${fullTableName} ON; `;
          }
          
          query += `INSERT INTO ${fullTableName} (${columns.join(', ')}) VALUES (${values.join(', ')}); `;
          
          if (hasIdentity) {
            query += `SET IDENTITY_INSERT ${fullTableName} OFF; `;
          }
          
          const request = transaction.request();
          columns.forEach(col => {
            request.input(col, row[col]);
          });
          
          await request.query(query);
        }
        console.log(`   - Hoàn thành ${tableName}`);
      }

      await transaction.commit();
      console.log('\n============================================');
      console.log('✅ Khôi phục hoàn tất!');
      console.log('============================================');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Lỗi khi khôi phục:', error.message);
    if (error.originalError) {
      console.error('Chi tiết:', error.originalError.message);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Đã đóng kết nối');
    }
  }
}

restoreDocument();
