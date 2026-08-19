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

async function detail() {
  const pool = await sql.connect(config);

  console.log('=== ALL ORG UNITS ===');
  const orgs = await pool.request().query(`
    SELECT id, name, code, parentId, type, status 
    FROM organization_units 
    WHERE status = 1 
    ORDER BY name ASC
  `);
  console.table(orgs.recordset);

  console.log('=== VAN THU GROUPS ===');
  const vtGroups = await pool.request().query(`
    SELECT id, code, name, roleType, roles_dynamic 
    FROM group_users 
    WHERE name LIKE N'%văn thư%' OR name LIKE N'%Văn thư%' OR code LIKE '%VT%' OR code LIKE '%vanthu%'
  `);
  console.table(vtGroups.recordset.map(g => ({
    id: g.id,
    code: g.code,
    name: g.name,
    roleType: g.roleType,
    rolesDynamicLength: (g.roles_dynamic || '').length
  })));

  await pool.close();
}

detail().catch(console.error);
