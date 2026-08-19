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

async function backupDestroyRecord() {
  const destroyRecordId = process.argv[2];
  if (!destroyRecordId) {
    console.error('❌ Vui lòng cung cấp destroy_record_id. Ví dụ: node scripts/backup-destroy-record.js da4d237b-9c71-47bb-a982-fa810427339d');
    process.exit(1);
  }

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const backupData = {
      destroy_record_id: destroyRecordId,
      document_type: 'destroy-record',
      backup_at: new Date().toISOString(),
      tables: {}
    };

    const tables = [
      { name: 'destroy_records', column: 'id' },
      { name: 'audit', column: 'document_id' },
      { name: 'work_items', column: 'document_id' }
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
          .input('id', sql.VarChar, destroyRecordId)
          .query(`SELECT * FROM ${table.name} WHERE ${table.column} = @id`);
        
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️  Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    const fileName = `backup_destroy_record_${destroyRecordId}.json`;
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

backupDestroyRecord();
