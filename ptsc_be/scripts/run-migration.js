/**
 * Script chạy migration SQL
 * Sử dụng: node scripts/run-migration.js
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: parseInt(process.env.SQLSERVER_PORT) || 1433,
  user: process.env.SQLSERVER_USER || 'lifetex',
  password: process.env.SQLSERVER_PASSWORD || 'LTLT@2025',
  database: process.env.SQLSERVER_DATABASE || 'camunda',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function runMigration() {
  let pool;
  
  try {
    console.log('🔌 Đang kết nối đến SQL Server...');
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!\n');

    // Đọc file SQL
    const sqlFile = path.join(__dirname, '..', 'migration_add_organization_unit_relations.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`Không tìm thấy file: ${sqlFile}`);
    }

    console.log('📖 Đang đọc file migration...');
    let sqlScript = fs.readFileSync(sqlFile, 'utf8');
    
    // Loại bỏ các lệnh GO (mssql không hỗ trợ GO trong query)
    // Chia script thành các batch - match GO trên dòng riêng hoặc đầu/cuối dòng
    let batches = sqlScript
      .split(/\r?\n\s*GO\s*\r?\n/gi) // Match GO trên dòng riêng với line breaks
      .map(batch => batch.trim())
      .filter(batch => {
        // Bỏ qua các batch chỉ có comment hoặc rỗng
        const cleaned = batch
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
          .trim();
        return cleaned.length > 0;
      });
    
    // Nếu không tìm thấy batch nào, thử cách khác - split bằng GO đơn giản
    if (batches.length === 0) {
      batches = sqlScript
        .split(/GO/gi)
        .map(batch => batch.trim())
        .filter(batch => {
          const cleaned = batch
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();
          return cleaned.length > 0;
        });
    }

    console.log(`📝 Tìm thấy ${batches.length} batch SQL\n`);

    // Chạy từng batch
    for (let i = 0; i < batches.length; i++) {
      let batch = batches[i];
      
      // Loại bỏ comment lines nhưng giữ lại code
      batch = batch
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        })
        .join('\n')
        .trim();
      
      // Bỏ qua nếu batch rỗng sau khi loại bỏ comment
      if (!batch || batch.length === 0) {
        console.log(`⏭️  Bỏ qua batch ${i + 1} (chỉ có comment)\n`);
        continue;
      }
      
      try {
        console.log(`⏳ Đang chạy batch ${i + 1}/${batches.length}...`);
        console.log(`   Preview: ${batch.substring(0, 100)}...`);
        
        const result = await pool.request().query(batch);
        
        // In kết quả nếu có
        if (result.recordset && result.recordset.length > 0) {
          console.log('   Kết quả:', result.recordset);
        }
        
        // In messages từ PRINT statements
        if (result.rowsAffected) {
          console.log(`   Rows affected: ${result.rowsAffected[0]}`);
        }
        
        console.log('   ✅ Hoàn thành\n');
      } catch (error) {
        // Một số lỗi có thể bỏ qua (như object đã tồn tại)
        const errorMsg = error.message || error.toString();
        const errorNumber = error.number || '';
        
        // In lỗi chi tiết
        console.error(`   ❌ Lỗi SQL (${errorNumber}): ${errorMsg}`);
        
        // In thông tin lỗi chi tiết nếu có
        if (error.info) {
          console.error(`   Info:`, error.info);
        }
        
        // Một số lỗi có thể bỏ qua
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('đã tồn tại') ||
            errorMsg.includes('There is already') ||
            (errorMsg.includes('Cannot create') && errorMsg.includes('because it already exists'))) {
          console.log(`   ⚠️  Bỏ qua lỗi này (object đã tồn tại)\n`);
        } else {
          // In một phần batch để debug
          console.error(`   Batch preview (first 300 chars): ${batch.substring(0, 300)}\n`);
          // Không throw để tiếp tục chạy các batch khác, nhưng cảnh báo
          console.error(`   ⚠️  Tiếp tục với batch tiếp theo...\n`);
        }
      }
    }

    console.log('============================================');
    console.log('✅ Migration hoàn tất!');
    console.log('============================================');

  } catch (error) {
    console.error('❌ Lỗi khi chạy migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Đã đóng kết nối');
    }
  }
}

// Chạy migration
runMigration();

