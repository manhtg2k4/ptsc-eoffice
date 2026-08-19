import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';
import { customLookup, getCachedAddresses, setCachedAddresses } from './dns-lookup';

let activePoolInstance: sql.ConnectionPool | null = null;
let connectingPromise: Promise<sql.ConnectionPool> | null = null;
let failoverInProgress = false;
let lastFailoverTime = 0;
let lastFailoverCheckTime = 0;
const FAILOVER_CHECK_COOLDOWN = 2000; // Không check quá nhanh

// Track DNS failover events
(process as any).on('SQL_FAILOVER_DETECTED', (event: any) => {
  console.warn(`[mssql.pool] FAILOVER EVENT: ${event.hostname}`);
  console.warn(`[mssql.pool] Old IPs: ${event.oldIps.join(', ')}`);
  console.warn(`[mssql.pool] New IPs: ${event.newIps.join(', ')}`);
  
  // Trigger pool reset after short delay
  const now = Date.now();
  if (now - lastFailoverTime > 5000) { // Prevent rapid resets
    lastFailoverTime = now;
    handleFailover();
  }
});

async function findActiveIp(ips: string[], port: number): Promise<string | null> {
  const checkPort = (ipAddress: string, tcpPort: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const socket = new (require('net').Socket)();
      socket.setTimeout(1000); // 1 second timeout for quick scanning
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect(tcpPort, ipAddress);
    });
  };

  for (const ip of ips) {
    console.log(`[mssql.pool] Scanning IP ${ip} on port ${port} during failover...`);
    const isOk = await checkPort(ip, port);
    if (isOk) {
      console.log(`[mssql.pool] Found active database port 1433 open on IP: ${ip}`);
      return ip;
    }
  }
  return null;
}

async function handleFailover() {
  if (failoverInProgress) {
    console.log('[mssql.pool] Failover already in progress, skipping...');
    return;
  }

  failoverInProgress = true;
  try {
    console.log('[mssql.pool] Starting failover recovery...');
    
    // Close old pool
    if (activePoolInstance) {
      try {
        await activePoolInstance.close();
      } catch (e: any) {
        console.error('[mssql.pool] Error closing pool during failover:', e.message);
      }
      activePoolInstance = null;
    }

    // Small delay to allow DNS to stabilize
    await new Promise(resolve => setTimeout(resolve, 300));


    // // Dynamic scan and update SQLSERVER_ACTIVE_IP
    // try {
    //   const dns = require('dns').promises;
    //   const hostname = process.env.SQLSERVER_HOST || 'uat-sql-01.snp.local';
    //   const port = Number(process.env.SQLSERVER_PORT || 1433);
    //   console.log(`[mssql.pool] Failover: Resolving DNS for host ${hostname}...`);
    //   const addresses = await dns.resolve4(hostname);
    //   const activeIp = await findActiveIp(addresses, port);
    //   if (activeIp) {
    //     process.env.SQLSERVER_ACTIVE_IP = activeIp;
    //     console.log(`[mssql.pool] Failover: Successfully updated SQLSERVER_ACTIVE_IP to: ${activeIp}`);
    //   } else {
    //     console.warn(`[mssql.pool] Failover: Could not find any IP with database port ${port} open in resolved list.`);
    //   }
    // } catch (e: any) {
    //   console.error('[mssql.pool] Failover: Error scanning IPs:', e.message);
    // }

    // New connection will be established on next getMssqlPool() call
    console.log('[mssql.pool] ✓ Failover recovery complete');
  } catch (error) {
    console.error('[mssql.pool] Failover recovery failed:', error);
  } finally {
    failoverInProgress = false;
  }
}

export const mssqlPoolProxy = new Proxy({} as sql.ConnectionPool, {
  get(target, prop) {
    if (!activePoolInstance) {
      throw new Error('MSSQL Pool (Singleton) has not been initialized.');
    }
    const val = Reflect.get(activePoolInstance, prop);
    if (typeof val === 'function') {
      return val.bind(activePoolInstance);
    }
    return val;
  },
  set(target, prop, value) {
    if (!activePoolInstance) {
      throw new Error('MSSQL Pool (Singleton) has not been initialized.');
    }
    return Reflect.set(activePoolInstance, prop, value);
  }
});

export async function resetMssqlPool(configService: ConfigService): Promise<sql.ConnectionPool> {
  if (activePoolInstance) {
    try {
      console.log('[mssql.pool] Closing old Singleton MSSQL Pool...');
      await activePoolInstance.close();
    } catch (e: any) {
      console.error('[mssql.pool] Error closing old pool:', e.message);
    }
    activePoolInstance = null;
  }

  let server = process.env.SQLSERVER_HOST || configService.get<string>('SQLSERVER_HOST') || '';
  let port = Number(configService.get<string>('SQLSERVER_PORT') ?? 1433);
  const user = configService.get<string>('SQLSERVER_USER');
  const password = configService.get<string>('SQLSERVER_PASSWORD');
  const database = configService.get<string>('SQLSERVER_DATABASE');

  if (!server || !user || !password || !database) {
    throw new Error('Missing SQL Server config');
  }

  if (server.includes(':')) {
    const parts = server.split(':');
    server = parts[0];
    port = Number(parts[1]) || port;
  }

  const newPool = new sql.ConnectionPool({
    server,
    port,
    user,
    password,
    database,
    // INCREASED TIMEOUTS FOR FAILOVER SCENARIOS
    connectionTimeout: 30000,
    requestTimeout: 60000,
    options: {
      encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
      trustServerCertificate: (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false',
      enableArithAbort: process.env.SQLSERVER_ENABLE_ARITH_ABORT === 'true',
      multiSubnetFailover: process.env.SQLSERVER_MULTI_SUBNET_FAILOVER === 'true',
      requestTimeout: 60000,
      appName: 'DiOffice_Backend_App_mssql_pool',
      useUTC: false,
      cryptoCredentialsDetails: {
        minVersion: 'TLSv1',
      },
      connectionTimeout: 30000,
      lookup: customLookup,
    } as any,
    pool: {
      max: 50,
      min: 2,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000, // Wait longer for connection
    },
  });

  // Add error handlers for pool
  newPool.on('error', err => {
    // 1. Log chi tiết lỗi kèm theo trạng thái kết nối hiện tại của Pool
    const poolSize = (newPool as any).pool?.size ?? 0;
    const poolAvailable = (newPool as any).pool?.available ?? 0;
    const poolPending = (newPool as any).pool?.pending ?? 0;
    
    console.error(
      `[mssql.pool] 🔴 Pool error: "${err.message}". ` + 
      `Code: "${(err as any).code}". ` +
      `Pool Status [Size: ${poolSize}, Available: ${poolAvailable}, Pending/Waiting: ${poolPending}]`
    );
    // 2. Chỉ trigger failover khi mất kết nối thực sự
    if (err.message?.includes('Connection lost') || (err as any).code === 'ECONNRESET') {
      console.warn('[mssql.pool] Connection lost. Triggering failover recovery...');
      handleFailover();
    } else {
      console.warn('[mssql.pool] Timeout/Busy error detected under high load. Skip failover reset to prevent request drops.');
    }
  });

  newPool.on('close', () => {
    console.warn('[mssql.pool] Pool closed unexpectedly');
    activePoolInstance = null;
  });

  await newPool.connect();
  activePoolInstance = newPool;
  console.log('[mssql.pool] MSSQL Pool initialized successfully');
  return activePoolInstance;
}

export async function getMssqlPool(
  configService: ConfigService,
): Promise<sql.ConnectionPool> {
  // 1️⃣ Pool is alive → return proxy
  if (activePoolInstance?.connected) {
    return mssqlPoolProxy;
  }

  // 2️⃣ Currently connecting → wait and return proxy
  if (connectingPromise) {
    await connectingPromise;
    return mssqlPoolProxy;
  }

  // 3️⃣ Create new pool (singleton)
  connectingPromise = (async () => {
    try {
      await resetMssqlPool(configService);
      return activePoolInstance!;
    } finally {
      connectingPromise = null;
    }
  })();

  await connectingPromise;
  return mssqlPoolProxy;
}

// ✅ HEALTH CHECK: Periodic validation
export async function startPoolHealthCheck(configService: ConfigService, intervalMs: number = 30000) {
  setInterval(async () => {
    if (!activePoolInstance?.connected) {
      console.warn('[mssql.pool] Pool health check: NOT CONNECTED');
      return;
    }

    try {
      const result = await activePoolInstance.request().query('SELECT 1');
    } catch (error: any) {
      console.error('[mssql.pool] Pool health check FAILED:', error.message);
      
      // Trigger failover on health check failure
      if (error.message?.includes('ETIMEOUT') || error.message?.includes('timeout')) {
        console.warn('[mssql.pool] Triggering failover due to health check failure');
        await handleFailover();
      }
    }
  }, intervalMs);
}

// ✅ NEW: On-demand failover check
export async function checkAndHandleFailover(
  configService: ConfigService,
): Promise<boolean> {
  const now = Date.now();
  
  // Prevent checking too frequently
  if (now - lastFailoverCheckTime < FAILOVER_CHECK_COOLDOWN) {
    return false;
  }
  
  lastFailoverCheckTime = now;

  try {
    const dns = require('dns').promises;
    const hostname = process.env.SQLSERVER_HOST || 'uat-sql-01.snp.local';
    
    const addresses = await dns.resolve4(hostname);
    const newIps = [...addresses].sort();
    const oldIps = [...getCachedAddresses()].sort();
    
    if (JSON.stringify(oldIps) !== JSON.stringify(newIps)) {
      console.warn(`[mssql.pool] 🔴 FAILOVER DETECTED via on-demand check`);
      console.warn(`[mssql.pool] Old: ${oldIps.join(', ')}`);
      console.warn(`[mssql.pool] New: ${newIps.join(', ')}`);
      
      setCachedAddresses(newIps);
      await handleFailover();
      return true;
    }
  } catch (error) {
    console.error(`[mssql.pool] Error in on-demand failover check:`, error);
  }
  
  return false;
}