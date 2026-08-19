const sql = require('mssql');
require('dotenv').config({ path: '/Users/admin/eoffice_ptsc/ptsc_be/.env' });

const config = {
  user: process.env.SQLSERVER_USER || 'lifetex',
  password: process.env.SQLSERVER_PASSWORD || 'LTLT@2025',
  server: process.env.SQLSERVER_HOST || '192.168.10.158',
  port: parseInt(process.env.SQLSERVER_PORT || '1433', 10),
  database: process.env.SQLSERVER_DATABASE || 'app_tancang',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function search() {
  const pool = await sql.connect(config);

  console.log('=== 1. SEARCH ORGANIZATION UNITS ===');
  const orgs = await pool.request().query(`
    SELECT id, name, code, parentId, type 
    FROM organization_units 
    WHERE name LIKE N'%Văn phòng%' 
       OR name LIKE N'%Tổng công ty%' 
       OR name LIKE N'%CNTT%' 
       OR name LIKE N'%Nghiên cứu%' 
       OR name LIKE N'%Chuyển đổi số%'
       OR code LIKE '%VP%'
       OR code LIKE '%CNTT%'
       OR code LIKE '%TCT%'
  `);
  console.table(orgs.recordset);

  console.log('=== 2. ALL GROUP USERS ===');
  const groups = await pool.request().query(`
    SELECT id, code, name, roleType, status, userId, roles_dynamic
    FROM group_users
  `);
  console.table(groups.recordset.map(g => ({
    id: g.id,
    code: g.code,
    name: g.name,
    roleType: g.roleType
  })));

  console.log('=== 3. SEARCH ROLES / PERMISSIONS ===');
  try {
    const roles = await pool.request().query(`
      SELECT TOP 30 * FROM roles
    `);
    console.table(roles.recordset.map(r => ({ id: r.id, name: r.name, code: r.code })));
  } catch (e) {
    console.log('No roles table or error:', e.message);
  }

  try {
    const roleGroups = await pool.request().query(`
      SELECT TOP 30 * FROM role_groups
    `);
    console.table(roleGroups.recordset.map(r => ({ id: r.id, name: r.name, code: r.code })));
  } catch (e) {
    console.log('No role_groups table or error:', e.message);
  }

  // Check if users exist already
  console.log('=== 4. CHECK IF USERS vanthu.tct or vanthu.pcntt EXIST ===');
  const checkUsers = await pool.request().query(`
    SELECT id, username, name, email_user, position, parent 
    FROM users 
    WHERE username IN ('vanthu.tct', 'vanthu.pcntt')
  `);
  console.table(checkUsers.recordset);

  await pool.close();
}

search().catch(console.error);
