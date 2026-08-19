/**
 * Script để tạo bảng trong MSSQL
 * Chạy: npx ts-node src/database/migrations/run-migrations.ts
 */

import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: parseInt(process.env.SQLSERVER_PORT || '1433', 10),
  user: process.env.SQLSERVER_USER || 'lifetex',
  password: process.env.SQLSERVER_PASSWORD || 'LTLT@2025',
  database: process.env.SQLSERVER_DATABASE || 'camunda',
  options: {
    encrypt: false,
    enableArithAbort: true,
    trustServerCertificate: true,
  },
};

async function runMigrations() {
  let pool: sql.ConnectionPool | null = null;

  try {

    pool = await sql.connect(config);

    const sqlFilePath = path.join(__dirname, 'create_tables.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Split by GO statements and execute each batch
    const batches = sqlScript.split(/\nGO\s*\n/i).filter(batch => batch.trim());

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          await pool.request().query(batch);
        } catch (err: any) {
          console.error(`❌ Error in batch ${i + 1}:`, err.message);
        }
      }
    }

  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

runMigrations();









