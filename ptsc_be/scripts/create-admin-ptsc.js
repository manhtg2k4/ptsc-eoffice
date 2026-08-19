const sql = require('mssql');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '/Users/admin/eoffice_ptsc/ptsc_be/.env' });

const config = {
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  server: process.env.SQLSERVER_HOST,
  port: parseInt(process.env.SQLSERVER_PORT, 10),
  database: process.env.SQLSERVER_DATABASE,
  options: { encrypt: false, trustServerCertificate: true }
};

async function createAdminPtscUser() {
  const pool = await sql.connect(config);
  console.log('Connected to MSSQL Database');

  const username = 'admin-ptsc';
  const plainPassword = process.env.ADMIN_DEFAULT_PASSWORD || '12345678';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Check if user already exists
  const existingUser = await pool.request()
    .input('username', sql.NVarChar, username)
    .query('SELECT id, username FROM users WHERE username = @username');

  let userId;
  if (existingUser.recordset.length > 0) {
    userId = existingUser.recordset[0].id;
    console.log(`User ${username} exists with ID: ${userId}. Updating permissions & full admin rights...`);
  } else {
    userId = uuidv4();
    console.log(`Creating new user ${username} with ID: ${userId}...`);
  }

  // 1. Fetch all active roles_process
  const activeRolesProcess = await pool.request().query(`
    SELECT id, role_code, role_name, process_key 
    FROM roles_process 
    WHERE is_active = 1
  `);

  const rolesByProcessMap = {};
  for (const rp of activeRolesProcess.recordset) {
    if (!rp.process_key) continue;
    if (!rolesByProcessMap[rp.process_key]) {
      rolesByProcessMap[rp.process_key] = {
        process_key: rp.process_key,
        name: rp.process_key,
        roles: []
      };
    }
    rolesByProcessMap[rp.process_key].roles.push({
      role_code: rp.role_code,
      name: rp.role_name || rp.role_code
    });
  }
  const rolesByProcessJson = JSON.stringify(Object.values(rolesByProcessMap));

  // 2. Insert or update the user in `users`
  const now = new Date();
  if (existingUser.recordset.length > 0) {
    await pool.request()
      .input('id', sql.NVarChar, userId)
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, 'Admin PTSC')
      .input('fullName', sql.NVarChar, 'Quản trị viên PTSC')
      .input('emailUser', sql.NVarChar, 'admin-ptsc@ptsc.com.vn')
      .input('position', sql.NVarChar, 'Admin')
      .input('role', sql.NVarChar, 'ADMIN')
      .input('rolesByProcess', sql.NVarChar, rolesByProcessJson)
      .input('status', sql.Int, 1)
      .input('updatedAt', sql.DateTime, now)
      .query(`
        UPDATE users 
        SET password = @password,
            name = @name,
            FullName = @fullName,
            email_user = @emailUser,
            position = @position,
            role = @role,
            roles_by_process = @rolesByProcess,
            status = @status,
            updated_at = @updatedAt
        WHERE id = @id
      `);
  } else {
    const keycloakUserId = uuidv4();
    await pool.request()
      .input('id', sql.NVarChar, userId)
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, 'Admin PTSC')
      .input('fullName', sql.NVarChar, 'Quản trị viên PTSC')
      .input('username', sql.NVarChar, username)
      .input('emailUser', sql.NVarChar, 'admin-ptsc@ptsc.com.vn')
      .input('position', sql.NVarChar, 'Admin')
      .input('role', sql.NVarChar, 'ADMIN')
      .input('rolesByProcess', sql.NVarChar, rolesByProcessJson)
      .input('keycloakUserId', sql.NVarChar, keycloakUserId)
      .input('status', sql.Int, 1)
      .input('createdAt', sql.DateTime, now)
      .input('updatedAt', sql.DateTime, now)
      .query(`
        INSERT INTO users (
          id, password, name, FullName, username, email_user, position, role, 
          roles_by_process, keycloak_user_id, status, created_at, updated_at, avatar
        ) VALUES (
          @id, @password, @name, @fullName, @username, @emailUser, @position, @role, 
          @rolesByProcess, @keycloakUserId, @status, @createdAt, @updatedAt, '[]'
        )
      `);
  }
  console.log(`✓ User record ${username} saved.`);

  // 3. Add user to admin groups
  const adminGroups = await pool.request().query(`
    SELECT id, code, name 
    FROM group_users 
    WHERE status = 1 
      AND (
        code IN ('ADMIN', 'NHOMquytrinh', 'VT_ADMIN', 'QUAN_TRI')
        OR name LIKE '%admin%'
        OR name LIKE '%Quản trị%'
      )
  `);

  for (const group of adminGroups.recordset) {
    await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('groupId', sql.NVarChar, group.id)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM user_group_users WHERE user_id = @userId AND group_user_id = @groupId)
        BEGIN
          INSERT INTO user_group_users (user_id, group_user_id) VALUES (@userId, @groupId);
        END
      `);
    console.log(`✓ Added to group: ${group.name}`);
  }

  // 4. Batch insert all active roles in `roles_process_users`
  console.log(`Batch inserting all active roles_process for user...`);
  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      INSERT INTO roles_process_users (user_id, role_id)
      SELECT @userId, rp.id
      FROM roles_process rp
      WHERE rp.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM roles_process_users rpu 
          WHERE rpu.user_id = @userId AND rpu.role_id = rp.id
        )
    `);
  console.log(`✓ All roles_process assigned in batch.`);

  // 5. Query and verify
  const createdUser = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT id, username, name, email_user, position, role, status, keycloak_user_id 
      FROM users 
      WHERE id = @userId
    `);

  const assignedGroups = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT g.id, g.code, g.name 
      FROM user_group_users ug
      JOIN group_users g ON ug.group_user_id = g.id
      WHERE ug.user_id = @userId
    `);

  const rolesCount = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`
      SELECT COUNT(*) as totalRoles
      FROM roles_process_users
      WHERE user_id = @userId
    `);

  console.log('\n=== USER INFO ===');
  console.table(createdUser.recordset);

  console.log('\n=== ASSIGNED GROUPS ===');
  console.table(assignedGroups.recordset);

  console.log('\n=== TOTAL BPMN / PROCESS ROLES ASSIGNED ===');
  console.log(`Total: ${rolesCount.recordset[0].totalRoles} roles`);

  await pool.close();
  console.log('\nSuccessfully created and configured admin-ptsc with full permissions!');
}

createAdminPtscUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
