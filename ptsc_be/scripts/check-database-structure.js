/**
 * Script kiểm tra cấu trúc database
 */

const sql = require('mssql');
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

async function checkDatabase() {
  let pool;
  
  try {
    console.log('🔌 Đang kết nối đến SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Đã kết nối thành công!\n');

    // Kiểm tra bảng group_users
    console.log('📋 Kiểm tra bảng group_users:');
    const groupUsersCheck = await pool.request()
      .query(`
        SELECT 
          COUNT(*) AS total,
          COUNT(DISTINCT id) AS unique_ids
        FROM group_users
      `);
    
    console.log(`   - Tổng số records: ${groupUsersCheck.recordset[0].total}`);
    console.log(`   - Unique IDs: ${groupUsersCheck.recordset[0].unique_ids}`);
    
    // Kiểm tra kiểu dữ liệu của id
    const idTypeCheck = await pool.request()
      .query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'group_users' AND COLUMN_NAME = 'id'
      `);
    
    if (idTypeCheck.recordset.length > 0) {
      const col = idTypeCheck.recordset[0];
      console.log(`   - Kiểu dữ liệu id: ${col.DATA_TYPE}`);
    }
    
    // Kiểm tra bảng user_group_users
    console.log('\n📋 Kiểm tra bảng user_group_users:');
    const junctionCheck = await pool.request()
      .query(`
        SELECT 
          CASE WHEN OBJECT_ID('user_group_users', 'U') IS NOT NULL THEN 'Tồn tại' ELSE 'Không tồn tại' END AS table_exists
      `);
    console.log(`   - Bảng: ${junctionCheck.recordset[0].table_exists}`);
    
    if (junctionCheck.recordset[0].table_exists === 'Tồn tại') {
      const fkCheck = await pool.request()
        .query(`
          SELECT 
            fk.name AS ForeignKey,
            OBJECT_NAME(fk.parent_object_id) AS TableName,
            COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
            OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
            COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferencedColumn
          FROM sys.foreign_keys AS fk
          INNER JOIN sys.foreign_key_columns AS fc ON fk.object_id = fc.constraint_object_id
          WHERE OBJECT_NAME(fk.parent_object_id) = 'user_group_users'
        `);
      
      console.log(`   - Foreign Keys:`);
      fkCheck.recordset.forEach(fk => {
        console.log(`     * ${fk.ForeignKey}: ${fk.ColumnName} → ${fk.ReferencedTable}.${fk.ReferencedColumn}`);
      });
    }
    
    // Kiểm tra sample data
    console.log('\n📋 Sample data từ group_users:');
    const sampleData = await pool.request()
      .query(`
        SELECT TOP 5 id, code, name 
        FROM group_users
      `);
    
    sampleData.recordset.forEach(row => {
      console.log(`   - ID: ${row.id} (${typeof row.id}), Code: ${row.code}, Name: ${row.name}`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Đã đóng kết nối');
    }
  }
}

checkDatabase();

