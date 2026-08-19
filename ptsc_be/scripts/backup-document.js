const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Cấu hình lưu trữ
const BACKUP_DIR = path.join(__dirname, '../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
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

async function backupDocument() {
  const documentId = process.argv[2];
  if (!documentId) {
    console.error('❌ Vui lòng cung cấp document_id. Ví dụ: node scripts/backup-document.js 726949903703');
    process.exit(1);
  }

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const backupData = {
      document_id: documentId,
      backup_at: new Date().toISOString(),
      tables: {}
    };

    const tables = [
      { name: 'outgoing_documents', column: 'document_id' },
      { name: 'audit', column: 'document_id' },
      { name: 'outgoing_document_users', column: 'document_id' },
      { name: 'work_items', column: 'document_id' },
      { name: 'file_relations', column: 'object_id' },
      { name: 'outgoing_current_state', column: 'document_id' },
      { name: 'outgoing_assignment', column: 'document_id' },
      { name: 'document_comments', column: 'document_id' },
      { name: 'document_current_state', column: 'document_id' },
      { name: 'document_history', column: 'document_id' }
    ];

    for (const table of tables) {
      try {
        // Kiểm tra bảng tồn tại
        const tableCheck = await pool.request()
          .input('tableName', sql.VarChar, table.name)
          .query(`SELECT OBJECT_ID(@tableName, 'U') AS table_id`);
        
        if (!tableCheck.recordset[0].table_id) {
          console.log(`⏭️  Bỏ qua bảng ${table.name} (không tồn tại trong DB)`);
          continue;
        }

        console.log(`⏳ Đang lấy dữ liệu từ bảng ${table.name}...`);
        const result = await pool.request()
          .input('id', sql.VarChar, documentId)
          .query(`SELECT * FROM ${table.name} WHERE ${table.column} = @id`);
        
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️  Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    // Lấy dữ liệu bảng files dựa trên file_relations
    console.log(`⏳ Đang lấy dữ liệu từ bảng files...`);
    const fileRelations = backupData.tables['file_relations'];
    if (fileRelations && fileRelations.length > 0) {
      const fileIds = fileRelations.map(fr => fr.file_id);
      const result = await pool.request()
        .query(`SELECT * FROM files WHERE id IN (${fileIds.join(',')})`);
      
      backupData.tables['files'] = result.recordset;
      console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ files`);
    } else {
      backupData.tables['files'] = [];
      console.log(`ℹ️  Không có file đính kèm nào.`);
    }

    const fileName = `backup_${documentId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n============================================');
    console.log(`✅ Sao lưu hoàn tất!`);
    console.log(`📂 File: ${filePath}`);
    console.log('============================================');

  } catch (error) {
    console.error('❌ Lỗi khi sao lưu:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Đã đóng kết nối');
    }
  }
}

backupDocument();
