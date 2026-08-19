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

const updates = [
  { id: 'PHUC_DAP_DV_CON', file: 'phucdapcon.bpmn' },
  { id: 'PHUC_DAP_DV', file: 'phucdap.bpmn' }
];

async function run() {
  let pool;
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(config);
    console.log('Connected!');

    for (const update of updates) {
      const filePath = path.join(__dirname, '..', update.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${update.file} not found, skipping.`);
        continue;
      }
      console.log(`Reading ${update.file}...`);
      const fileBuffer = fs.readFileSync(filePath);
      const base64Str = fileBuffer.toString('base64');

      console.log(`Updating bpmn_design for id ${update.id} with ${update.file}...`);
      const result = await pool.request()
        .input('id', sql.VarChar, update.id)
        .input('base64', sql.NVarChar(sql.MAX), base64Str)
        .query('UPDATE bpmn_design SET base64_file = @base64 WHERE id = @id');
      
      console.log(`Rows affected: ${result.rowsAffected[0]}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (pool) await pool.close();
  }
}
run();
