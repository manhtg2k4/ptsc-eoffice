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

async function backupVehicle() {
  const registrationId = process.argv[2];
  if (!registrationId) {
    console.error('❌ Vui lòng cung cấp registration_id (uuid). Ví dụ: node scripts/backup-vehicle.js 3fa85f64-5717-4562-b3fc-2c963f66afa6');
    process.exit(1);
  }

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const backupData = {
      registration_id: registrationId,
      backup_at: new Date().toISOString(),
      tables: {}
    };

    // 1. Check & backup vehicle_registrations table
    console.log(`⏳ Đang lấy dữ liệu từ bảng vehicle_registrations...`);
    const regResult = await pool.request()
      .input('registrationId', sql.VarChar, registrationId)
      .query(`SELECT * FROM vehicle_registrations WHERE id = @registrationId`);

    if (regResult.recordset.length === 0) {
      console.error(`❌ Không tìm thấy đăng ký xe với ID: ${registrationId}`);
      process.exit(1);
    }
    backupData.tables['vehicle_registrations'] = regResult.recordset;

    // Danh sách các bảng liên kết trực tiếp
    const directTables = [
      { name: 'vehicle_registration_assignments', column: 'registration_id' },
      { name: 'work_items', column: 'document_id' },
      { name: 'audit', column: 'document_id' },
      { name: 'file_relations', column: 'object_id' }
    ];

    for (const table of directTables) {
      try {
        console.log(`⏳ Đang lấy dữ liệu từ bảng ${table.name}...`);
        const result = await pool.request()
          .input('registrationId', sql.VarChar, registrationId)
          .query(`SELECT * FROM ${table.name} WHERE ${table.column} = @registrationId`);
        
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️ Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    // Lấy thông tin chi tiết bảng files
    const fileRelations = backupData.tables['file_relations'] || [];
    if (fileRelations.length > 0) {
      const fileIds = [...new Set(fileRelations.map(fr => fr.file_id).filter(Boolean))];
      if (fileIds.length > 0) {
        console.log(`⏳ Đang lấy dữ liệu từ bảng files...`);
        const fileIdList = fileIds.map(id => `'${id}'`).join(',');
        const result = await pool.request()
          .query(`SELECT * FROM files WHERE id IN (${fileIdList})`);
        
        backupData.tables['files'] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ files`);
      } else {
        backupData.tables['files'] = [];
      }
    } else {
      backupData.tables['files'] = [];
    }

    const fileName = `backup_vehicle_${registrationId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n============================================');
    console.log(`✅ Sao lưu đăng ký xe hoàn tất!`);
    console.log(`📂 File: ${filePath}`);
    console.log('============================================');

  } catch (error) {
    console.error('❌ Lỗi khi sao lưu đăng ký xe:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Đã đóng kết nối');
    }
  }
}

backupVehicle();
