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

async function inspect() {
  const pool = await sql.connect(config);
  console.log('Connected to MSSQL');

  // 1. Inspect organization_units
  console.log('--- ORGANIZATION UNITS ---');
  const orgs = await pool.request().query(`
    SELECT * 
    FROM organization_units 
    WHERE status = 1 
  `);
  console.table(orgs.recordset.map(o => ({
    id: o.id,
    name: o.name,
    code: o.code,
    parentId: o.parentId,
    type: o.type
  })));

  // 2. Inspect group_users
  console.log('--- GROUP USERS ---');
  const groups = await pool.request().query(`
    SELECT id, code, name, roleType, status 
    FROM group_users 
    WHERE status = 1
  `);
  console.table(groups.recordset);

  // 3. Inspect user columns & sample
  console.log('--- SAMPLE USERS ---');
  const users = await pool.request().query(`
    SELECT TOP 5 id, username, name, email_user, phone_number_user, position, parent, organization_name, organization_code
    FROM users 
    WHERE status = 1
  `);
  console.table(users.recordset);

  // 4. Inspect user_group_users join table
  console.log('--- USER GROUP USERS SAMPLE ---');
  const userGroups = await pool.request().query(`
    SELECT TOP 10 * FROM user_group_users
  `);
  console.table(userGroups.recordset);

  await pool.close();
}

inspect().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
