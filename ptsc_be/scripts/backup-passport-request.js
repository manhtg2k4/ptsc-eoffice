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

async function backupPassportRequest() {
  const requestId = process.argv[2];
  if (!requestId) {
    console.error('❌ Vui lòng cung cấp passport_request_id. Ví dụ: node scripts/backup-passport-request.js 726949903703');
    process.exit(1);
  }

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const backupData = {
      passport_request_id: requestId,
      backup_at: new Date().toISOString(),
      tables: {}
    };

    // 1. Sao lưu các bảng phụ thuộc trực tiếp theo request_id
    const directTables = [
      { name: 'passport_borrow_requests', column: 'id' },
      { name: 'passport_delegation_items', column: 'request_id' },
      { name: 'passport_histories', column: 'request_id' },
      { name: 'passport_vouchers', column: 'request_id' },
      { name: 'passport_voucher_items', column: 'request_id' }
    ];

    for (const table of directTables) {
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
          .input('id', sql.VarChar, requestId)
          .query(`SELECT * FROM ${table.name} WHERE ${table.column} = @id`);
        
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️  Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    // Kiểm tra bản ghi yêu cầu chính có tồn tại không
    if (!backupData.tables['passport_borrow_requests'] || backupData.tables['passport_borrow_requests'].length === 0) {
      console.error(`❌ Không tìm thấy yêu cầu mượn hộ chiếu với ID: ${requestId}`);
      process.exit(1);
    }

    // Lấy danh sách ID biên bản liên quan
    const vouchers = backupData.tables['passport_vouchers'] || [];
    const voucherIds = vouchers.map(v => `'${v.id}'`);

    // 2. Sao lưu các bảng quy trình, chuyển bước, nhận xét và quan hệ file (liên kết với request_id hoặc voucher_id)
    const processTables = [
      { name: 'work_items', column: 'document_id' },
      { name: 'audit', column: 'document_id' },
      { name: 'document_comments', column: 'document_id' },
      { name: 'file_relations', column: 'object_id' }
    ];

    for (const table of processTables) {
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
        let queryStr = `SELECT * FROM ${table.name} WHERE ${table.column} = @id`;
        const request = pool.request().input('id', sql.VarChar, requestId);
        
        if (voucherIds.length > 0) {
          queryStr += ` OR ${table.column} IN (${voucherIds.join(',')})`;
        }
        
        const result = await request.query(queryStr);
        backupData.tables[table.name] = result.recordset;
        console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ ${table.name}`);
      } catch (err) {
        console.warn(`⚠️  Lỗi khi lấy dữ liệu từ bảng ${table.name}:`, err.message);
      }
    }

    // 3. Sao lưu bảng files dựa trên các file_relations thu được
    console.log(`⏳ Đang lấy dữ liệu từ bảng files...`);
    const fileRelations = backupData.tables['file_relations'] || [];
    if (fileRelations.length > 0) {
      const fileIds = fileRelations.map(fr => `'${fr.file_id}'`);
      const result = await pool.request()
        .query(`SELECT * FROM files WHERE id IN (${fileIds.join(',')})`);
      
      backupData.tables['files'] = result.recordset;
      console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ files`);
    } else {
      backupData.tables['files'] = [];
      console.log(`ℹ️  Không có file đính kèm nào.`);
    }

    // 4. Sao lưu bảng passports dựa trên các hộ chiếu được tham chiếu trong yêu cầu hoặc đoàn ra hoặc biên bản
    console.log(`⏳ Đang lấy dữ liệu từ bảng passports...`);
    const passportIdsSet = new Set();
    
    const requestRows = backupData.tables['passport_borrow_requests'] || [];
    requestRows.forEach(r => r.passport_id && passportIdsSet.add(r.passport_id));

    const delegationRows = backupData.tables['passport_delegation_items'] || [];
    delegationRows.forEach(d => d.passport_id && passportIdsSet.add(d.passport_id));

    const voucherItemRows = backupData.tables['passport_voucher_items'] || [];
    voucherItemRows.forEach(vi => vi.passport_id && passportIdsSet.add(vi.passport_id));

    const passportIds = Array.from(passportIdsSet).map(id => `'${id}'`);
    if (passportIds.length > 0) {
      const result = await pool.request()
        .query(`SELECT * FROM passports WHERE id IN (${passportIds.join(',')})`);
      
      backupData.tables['passports'] = result.recordset;
      console.log(`✅ Đã lấy ${result.recordset.length} bản ghi từ passports`);
    } else {
      backupData.tables['passports'] = [];
      console.log(`ℹ️  Không có hộ chiếu nào được tham chiếu.`);
    }

    const fileName = `backup_passport_request_${requestId}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('\n============================================');
    console.log(`✅ Sao lưu hoàn tất!`);
    console.log(`🆔 Yêu cầu sao lưu: ${requestId}`);
    console.log(`📅 Thời gian: ${backupData.backup_at}`);
    console.log(`📂 File: ${filePath}`);
    console.log('--------------------------------------------');
    console.log('Thống kê bản ghi sao lưu:');
    Object.keys(backupData.tables).forEach(tableName => {
      console.log(` - Bảng ${tableName}: ${backupData.tables[tableName].length} bản ghi`);
    });
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

backupPassportRequest();
