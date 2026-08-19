/**
 * Script migrate dữ liệu từ MongoDB sang MSSQL
 * Sử dụng: node scripts/migrate-data-from-mongodb.js
 */

const { MongoClient } = require('mongodb');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// MSSQL Config
const mssqlConfig = {
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

// MongoDB Config
const mongoHost = process.env.MONGO_HOST || 'mongodb://localhost:27017';
const mongoUsername = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDbName = process.env.MONGO_DATABASE || 'kho_tthc';

// Tạo connection string với authentication nếu có
let mongoUri = mongoHost;
if (mongoUsername && mongoPassword) {
  // Nếu MONGO_HOST đã có username/password thì dùng luôn, nếu không thì thêm vào
  if (!mongoHost.includes('@')) {
    mongoUri = mongoHost.replace('mongodb://', `mongodb://${mongoUsername}:${encodeURIComponent(mongoPassword)}@`);
  }
}

let mongoClient;
let mssqlPool;

async function connectDatabases() {
  console.log('🔌 Đang kết nối đến databases...');
  
  // Kết nối MongoDB
  try {
    const mongoOptions = {
      authSource: 'admin', // Thường là 'admin' cho MongoDB có authentication
    };
    
    mongoClient = new MongoClient(mongoUri, mongoOptions);
    await mongoClient.connect();
    console.log('✅ Đã kết nối MongoDB');
  } catch (error) {
    throw new Error(`Lỗi kết nối MongoDB: ${error.message}`);
  }

  // Kết nối MSSQL
  try {
    mssqlPool = await sql.connect(mssqlConfig);
    console.log('✅ Đã kết nối MSSQL\n');
  } catch (error) {
    throw new Error(`Lỗi kết nối MSSQL: ${error.message}`);
  }
}

async function migrateUserOrganizationUnits() {
  console.log('📦 Bước 1: Migrate User - OrganizationUnit...');
  
  const mongoDb = mongoClient.db(mongoDbName);
  const usersCollection = mongoDb.collection('users');
  
  // Lấy tất cả users có parent
  const users = await usersCollection.find({ parent: { $exists: true, $ne: null } }).toArray();
  
  console.log(`   Tìm thấy ${users.length} users có parent`);
  
  let updated = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      // Chuyển ObjectId sang string
      const userId = user._id.toString();
      const orgUnitId = user.parent.toString();
      
      // Kiểm tra user và orgUnit có tồn tại trong MSSQL không
      const userCheck = await mssqlPool.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT id FROM users WHERE id = @userId');
      
      const orgCheck = await mssqlPool.request()
        .input('orgId', sql.VarChar, orgUnitId)
        .query('SELECT id FROM organization_units WHERE id = @orgId');
      
      if (userCheck.recordset.length === 0) {
        console.log(`   ⚠️  User ${userId} không tồn tại trong MSSQL, bỏ qua`);
        continue;
      }
      
      if (orgCheck.recordset.length === 0) {
        console.log(`   ⚠️  OrganizationUnit ${orgUnitId} không tồn tại trong MSSQL, bỏ qua`);
        continue;
      }
      
      // Update organization_unit_id
      await mssqlPool.request()
        .input('userId', sql.NVarChar, userId)
        .input('orgUnitId', sql.VarChar, orgUnitId)
        .query(`
          UPDATE users 
          SET organization_unit_id = @orgUnitId 
          WHERE id = @userId AND organization_unit_id IS NULL
        `);
      
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`   Đã cập nhật ${updated}/${users.length} users...`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Lỗi khi update user ${user._id}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Hoàn thành: ${updated} updated, ${errors} errors\n`);
}

async function migrateUserGroupUsers() {
  console.log('📦 Bước 2: Migrate User - GroupUser (ManyToMany)...');
  
  const mongoDb = mongoClient.db(mongoDbName);
  const usersCollection = mongoDb.collection('users');
  
  // Lấy tất cả users có GroupUser
  const users = await usersCollection.find({ 
    GroupUser: { $exists: true, $ne: [], $not: { $size: 0 } } 
  }).toArray();
  
  console.log(`   Tìm thấy ${users.length} users có GroupUser`);
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      const userId = user._id.toString();
      const groupUserIds = (user.GroupUser || []).map(id => id.toString());
      
      // Kiểm tra user có tồn tại không
      const userCheck = await mssqlPool.request()
        .input('userId', sql.NVarChar, userId)
        .query('SELECT id FROM users WHERE id = @userId');
      
      if (userCheck.recordset.length === 0) {
        skipped++;
        continue;
      }
      
      for (const groupUserId of groupUserIds) {
        try {
          // MongoDB ObjectId là 24 ký tự hex, cần tìm group_user trong MSSQL
          // Có thể group_users.id trong MSSQL là GUID mới, cần tìm mapping
          // Hoặc kiểm tra xem có field nào lưu ObjectId gốc không (như userId field)
          
          // Thử tìm group_user bằng cách:
          // 1. Kiểm tra xem có field nào lưu ObjectId gốc không
          // 2. Hoặc tìm theo code/name nếu có mapping
          
          // Tạm thời: Tìm group_user trong MongoDB để lấy thông tin
          const mongoGroupUser = await mongoDb.collection('groupusers').findOne({ 
            _id: require('mongodb').ObjectId(groupUserId) 
          });
          
          if (!mongoGroupUser) {
            continue;
          }
          
          // Tìm group_user trong MSSQL bằng code hoặc name
          let mssqlGroupUser = null;
          if (mongoGroupUser.code) {
            const groupCheck = await mssqlPool.request()
              .input('code', sql.NVarChar, mongoGroupUser.code)
              .query('SELECT id FROM group_users WHERE code = @code');
            
            if (groupCheck.recordset.length > 0) {
              mssqlGroupUser = groupCheck.recordset[0];
            }
          }
          
          // Nếu không tìm thấy bằng code, thử tìm bằng name
          if (!mssqlGroupUser && mongoGroupUser.name) {
            const groupCheck = await mssqlPool.request()
              .input('name', sql.NVarChar, mongoGroupUser.name)
              .query('SELECT id FROM group_users WHERE name = @name');
            
            if (groupCheck.recordset.length > 0) {
              mssqlGroupUser = groupCheck.recordset[0];
            }
          }
          
          if (!mssqlGroupUser) {
            console.log(`   ⚠️  Không tìm thấy group_user trong MSSQL cho ObjectId: ${groupUserId}`);
            continue;
          }
          
          const mssqlGroupUserId = mssqlGroupUser.id;
          
          // Insert vào bảng phụ (tránh duplicate)
          await mssqlPool.request()
            .input('userId', sql.NVarChar, userId)
            .input('groupId', sql.UniqueIdentifier, mssqlGroupUserId)
            .query(`
              IF NOT EXISTS (
                SELECT 1 FROM user_group_users 
                WHERE user_id = @userId AND group_user_id = @groupId
              )
              BEGIN
                INSERT INTO user_group_users (user_id, group_user_id)
                VALUES (@userId, @groupId)
              END
            `);
          
          inserted++;
        } catch (error) {
          // Bỏ qua nếu đã tồn tại
          if (!error.message.includes('duplicate') && !error.message.includes('PRIMARY KEY')) {
            errors++;
            console.error(`   ❌ Lỗi khi insert user ${userId} - group ${groupUserId}: ${error.message}`);
          }
        }
      }
      
      if (inserted % 100 === 0) {
        console.log(`   Đã insert ${inserted} quan hệ...`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Lỗi khi xử lý user ${user._id}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Hoàn thành: ${inserted} inserted, ${skipped} skipped, ${errors} errors\n`);
}

async function migrateGroupUserOrganizationUnits() {
  console.log('📦 Bước 3: Migrate GroupUser - OrganizationUnit (ManyToMany)...');
  
  const mongoDb = mongoClient.db(mongoDbName);
  const groupUsersCollection = mongoDb.collection('groupusers');
  
  // Lấy tất cả groupUsers có organizationUnits
  const groupUsers = await groupUsersCollection.find({ 
    organizationUnits: { $exists: true, $ne: [], $not: { $size: 0 } } 
  }).toArray();
  
  console.log(`   Tìm thấy ${groupUsers.length} groupUsers có organizationUnits`);
  
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const groupUser of groupUsers) {
    try {
      const groupUserId = groupUser._id.toString();
      const orgUnitIds = (groupUser.organizationUnits || []).map(id => id.toString());
      
      // Tìm group_user trong MSSQL bằng cách tương tự
      let mssqlGroupUser = null;
      if (groupUser.code) {
        const groupCheck = await mssqlPool.request()
          .input('code', sql.NVarChar, groupUser.code)
          .query('SELECT id FROM group_users WHERE code = @code');
        
        if (groupCheck.recordset.length > 0) {
          mssqlGroupUser = groupCheck.recordset[0];
        }
      }
      
      if (!mssqlGroupUser && groupUser.name) {
        const groupCheck = await mssqlPool.request()
          .input('name', sql.NVarChar, groupUser.name)
          .query('SELECT id FROM group_users WHERE name = @name');
        
        if (groupCheck.recordset.length > 0) {
          mssqlGroupUser = groupCheck.recordset[0];
        }
      }
      
      if (!mssqlGroupUser) {
        console.log(`   ⚠️  Không tìm thấy group_user trong MSSQL cho ObjectId: ${groupUserId}`);
        skipped++;
        continue;
      }
      
      const mssqlGroupUserId = mssqlGroupUser.id;
      
      for (const orgUnitId of orgUnitIds) {
        try {
          // Kiểm tra organizationUnit có tồn tại không
          const orgCheck = await mssqlPool.request()
            .input('orgId', sql.VarChar, orgUnitId)
            .query('SELECT id FROM organization_units WHERE id = @orgId');
          
          if (orgCheck.recordset.length === 0) {
            continue;
          }
          
          // Insert vào bảng phụ (tránh duplicate)
          await mssqlPool.request()
            .input('groupId', sql.UniqueIdentifier, mssqlGroupUserId)
            .input('orgId', sql.VarChar, orgUnitId)
            .query(`
              IF NOT EXISTS (
                SELECT 1 FROM group_user_organization_units 
                WHERE group_user_id = @groupId AND organization_unit_id = @orgId
              )
              BEGIN
                INSERT INTO group_user_organization_units (group_user_id, organization_unit_id)
                VALUES (@groupId, @orgId)
              END
            `);
          
          inserted++;
        } catch (error) {
          // Bỏ qua nếu đã tồn tại
          if (!error.message.includes('duplicate') && !error.message.includes('PRIMARY KEY')) {
            errors++;
            console.error(`   ❌ Lỗi khi insert group ${groupUserId} - org ${orgUnitId}: ${error.message}`);
          }
        }
      }
      
      if (inserted % 100 === 0) {
        console.log(`   Đã insert ${inserted} quan hệ...`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Lỗi khi xử lý groupUser ${groupUser._id}: ${error.message}`);
    }
  }
  
  console.log(`   ✅ Hoàn thành: ${inserted} inserted, ${skipped} skipped, ${errors} errors\n`);
}

async function verifyData() {
  console.log('🔍 Bước 4: Kiểm tra dữ liệu sau migration...\n');
  
  try {
    // Đếm users có organization_unit_id
    const userCount = await mssqlPool.request()
      .query(`
        SELECT 
          COUNT(*) AS total_users,
          COUNT(organization_unit_id) AS users_with_org_unit
        FROM users
      `);
    
    console.log('   Users:');
    console.log(`     - Tổng số: ${userCount.recordset[0].total_users}`);
    console.log(`     - Có organization_unit_id: ${userCount.recordset[0].users_with_org_unit}`);
    
    // Đếm quan hệ User - GroupUser
    const userGroupCount = await mssqlPool.request()
      .query('SELECT COUNT(*) AS count FROM user_group_users');
    
    console.log(`   User - GroupUser relations: ${userGroupCount.recordset[0].count}`);
    
    // Đếm quan hệ GroupUser - OrganizationUnit
    const groupOrgCount = await mssqlPool.request()
      .query('SELECT COUNT(*) AS count FROM group_user_organization_units');
    
    console.log(`   GroupUser - OrganizationUnit relations: ${groupOrgCount.recordset[0].count}\n`);
    
  } catch (error) {
    console.error(`   ❌ Lỗi khi kiểm tra: ${error.message}\n`);
  }
}

async function main() {
  try {
    await connectDatabases();
    
    console.log('============================================');
    console.log('🚀 BẮT ĐẦU MIGRATION DỮ LIỆU');
    console.log('============================================\n');
    
    await migrateUserOrganizationUnits();
    await migrateUserGroupUsers();
    await migrateGroupUserOrganizationUnits();
    await verifyData();
    
    console.log('============================================');
    console.log('✅ MIGRATION HOÀN TẤT!');
    console.log('============================================');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
      console.log('\n🔌 Đã đóng kết nối MongoDB');
    }
    if (mssqlPool) {
      await mssqlPool.close();
      console.log('🔌 Đã đóng kết nối MSSQL');
    }
  }
}

// Chạy migration
main();

