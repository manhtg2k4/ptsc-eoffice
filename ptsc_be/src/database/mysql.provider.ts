// src/database/mysql.provider.ts
import { createPool, Pool } from 'mysql2/promise';

export const MYSQL_POOL = 'MYSQL_POOL';

export const mysqlProvider = {
  provide: MYSQL_POOL,
  useFactory: async (): Promise<Pool> => {
    const {
      MYSQL_HOST = 'localhost',
      MYSQL_PORT = '3306',
      MYSQL_USER,
      MYSQL_PASSWORD,
      MYSQL_DATABASE,
    } = process.env;

    if (!MYSQL_USER || !MYSQL_DATABASE) {
      throw new Error('MYSQL_USER and MYSQL_DATABASE are required');
    }

    return createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      timezone: '+07:00',
      dateStrings: true,
      charset: 'utf8mb4',
      connectTimeout: 10000,
    });
  },
};