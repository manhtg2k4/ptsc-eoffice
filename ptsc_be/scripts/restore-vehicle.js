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

async function restoreVehicle() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('❌ Vui lòng cung cấp đường dẫn file backup. Ví dụ: node scripts/restore-vehicle.js backup_vehicle_3fa85f64-5717-4562-b3fc-2c963f66afa6.json');
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
  const { registration_id, tables } = backupData;

  let pool;
  try {
    console.log(`🔌 Đang kết nối đến SQL Server...`);
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!');

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log(`\n🗑️  Đang xóa dữ liệu cũ cho registration_id: ${registration_id}...`);
      
      // 1. Xóa các bảng liên kết trực tiếp
      const directDeleteTables = [
        { table: 'vehicle_registration_assignments', column: 'registration_id' },
        { table: 'work_items', column: 'document_id' },
        { table: 'audit', column: 'document_id' }
      ];

      for (const item of directDeleteTables) {
        try {
          await transaction.request()
            .input('registrationId', sql.VarChar, registration_id)
            .query(`DELETE FROM ${item.table} WHERE ${item.column} = @registrationId`);
          console.log(`   - Đã xóa từ ${item.table}`);
        } catch (err) {
          console.warn(`   ⚠️  Bỏ qua xóa từ ${item.table}:`, err.message);
        }
      }

      // 2. Xóa file_relations và files
      const fileRelations = tables['file_relations'] || [];
      if (fileRelations.length > 0) {
        const directFileRelationIds = fileRelations.map(fr => fr.id).filter(Boolean);
        if (directFileRelationIds.length > 0) {
          const formattedFrIds = directFileRelationIds.map(id => `'${id}'`).join(',');
          await transaction.request().query(`DELETE FROM file_relations WHERE id IN (${formattedFrIds})`);
          console.log(`   - Đã xóa từ file_relations`);
        }

        const fileIds = tables['files']?.map(f => f.id).filter(Boolean) || [];
        if (fileIds.length > 0) {
          const formattedFileIds = fileIds.map(id => `'${id}'`).join(',');
          await transaction.request().query(`DELETE FROM files WHERE id IN (${formattedFileIds})`);
          console.log(`   - Đã xóa từ files`);
        }
      }

      // 3. Xóa bản ghi chính ở bảng vehicle_registrations
      await transaction.request()
        .input('registrationId', sql.VarChar, registration_id)
        .query(`DELETE FROM vehicle_registrations WHERE id = @registrationId`);
      console.log(`   - Đã xóa từ vehicle_registrations`);

      console.log(`\n📥 Đang chèn lại dữ liệu đăng ký xe từ backup...`);

      // Thứ tự chèn để đảm bảo khóa ngoại
      const insertOrder = [
        'vehicle_registrations',
        'vehicle_registration_assignments',
        'work_items',
        'audit',
        'files',
        'file_relations'
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

        // Lấy danh sách các cột computed
        const computedColsResult = await transaction.request()
          .input('tableName', sql.VarChar, tableName)
          .query(`
            SELECT name 
            FROM sys.columns 
            WHERE (object_id = OBJECT_ID(@tableName) OR object_id = OBJECT_ID('dbo.' + @tableName))
              AND is_computed = 1
          `);
        const computedCols = computedColsResult.recordset.map(r => r.name);
        if (computedCols.length > 0) {
          console.log(`   🔍 Bỏ qua các cột computed: ${computedCols.join(', ')}`);
        }

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
        if (hasIdentity) {
          console.log(`   🔍 Identity: CÓ`);
        }

        for (const row of rows) {
          const columns = Object.keys(row).filter(col => !computedCols.includes(col));
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
      console.log('✅ Khôi phục đăng ký xe hoàn tất!');
      console.log('============================================');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Lỗi khi khôi phục đăng ký xe:', error.message);
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

restoreVehicle();
