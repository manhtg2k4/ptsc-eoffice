require('dotenv').config();
import './tracing';
import { DemoController } from './demo/demo.controller';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule, waitForDb } from './app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Logger, BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as session from 'express-session';
import * as qs from 'qs';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { formatErrors } from './formatError';
const MongoStore = require('connect-mongo');
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
// import { UserLogService } from './user-log/user-log.service'; // ✅ Commented - module deleted
// import { LogInterceptor } from './user-log/log.interceptor'; // ✅ Commented - module deleted
import axios from 'axios';
// import { createProxyMiddleware } from 'http-proxy-middleware';
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
import * as https from 'https';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BookDocumentsController } from './book-documents/book-documents.controller';
import { JwtAuthGuard } from './oauth/jwt.guard';
import { getMssqlPool, startPoolHealthCheck } from './database/mssql.pool';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { verifyKeycloakToken } from './utils/keycloak-verify';
import helmet from 'helmet';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { traceHeadersMiddleware } from './common/middleware/trace-headers.middleware';
import { createAppLogger, installConsoleLoggerBridge, shouldPatchConsole } from './common/logger/app-json.logger';

const appLogger = createAppLogger();
Logger.overrideLogger(appLogger);
if (shouldPatchConsole()) {
  installConsoleLoggerBridge(appLogger);
}


// 🟢 Hàm chuẩn hóa IP
function normalizeIp(ip: string | undefined): string {
  if (!ip) return '';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  return ip;
}

function isLogDebugEnabled(): boolean {
  return ['true', '1', 'yes', 'on'].includes((process.env.LOG_DEBUG || '').trim().toLowerCase());
}

/** 
 * ĐÃ CHUYỂN SANG ProxyController ĐỂ QUẢN LÝ TẬP TRUNG VÀ CHECK QUYỀN
 * 
function addProxySwaggerDocs(document: any) {
  if (!document?.paths) document.paths = {};

  const proxies = [
    {
      path: '/api/replace-hashkey-in-doc-url',
      target: `${process.env.APP_CONVERT_URL}/replace-hashkey-in-doc-url`,
      methods: ['post'],
    },
    {
      path: '/api/replace-text-in-excel',
      target: `${process.env.APP_CONVERT_URL}/replace-text-in-excel`,
      methods: ['post'],
    },
    {
      path: '/api/replace-text-in-word',
      target: `${process.env.APP_CONVERT_URL}/replace-text-in-word`,
      methods: ['post'],
    },
    {
      path: '/api/replace-text-in-pdf-tcsg',
      target: `${process.env.APP_CONVERT_URL}/replace-text-in-pdf-tcsg`,
      methods: ['post'],
    },
    {
      path: '/api/doc-url-to-pdf',
      target: `${process.env.APP_CONVERT_URL}/doc-url-to-pdf`,
      methods: ['post'],
    },
    {
      path: '/api/file-to-pdf',
      target: `${process.env.APP_CONVERT_URL}/file-to-pdf`,
      methods: ['post'],
    },
    {
      path: '/api/doc-to-pdf',
      target: `${process.env.APP_CONVERT_URL}/doc-to-pdf`,
      methods: ['post'],
    },
    {
      path: '/api/merge-file',
      target: `${process.env.APP_CONVERT_URL}/merge-word-urls`,
      methods: ['post'],
    },
    {
      path: '/api/scan-keywords',
      target: `${process.env.APP_CONVERT_URL}/signing/scan-keywords`,
      methods: ['post'],
    },
    {
      path: '/admin-api',
      target: process.env.APP_DHVB || 'https://administrator.lifetex.vn:295/api',
      methods: ['get', 'post', 'put', 'patch', 'delete'],
      description: 'Proxy to admin API (pathRewrite: ^/admin-api -> \'\')',
    },
    {
      path: '/builder-api',
      target: 'http://192.168.0.62:1111',
      methods: ['get', 'post', 'put', 'patch', 'delete'],
      description: 'Proxy to builder service (pathRewrite: ^/builder-api -> \'\')',
    },
  ];

  for (const proxy of proxies) {
    const pathItem = document.paths[proxy.path] || {};
    for (const method of proxy.methods) {
      const methodLower = method.toLowerCase();
      const operation: any = {
        tags: ['Proxy'],
        summary: `Proxy ${method.toUpperCase()} ${proxy.path}`,
        description: proxy.description || `Forward to ${proxy.target}`,
        responses: {
          '200': { description: 'Proxy response' },
          '400': { description: 'Proxy error' },
          '500': { description: 'Proxy error' },
          default: { description: 'Proxy error' },
        },
      };
      if (['post', 'put', 'patch'].includes(methodLower)) {
        operation.requestBody = {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
            },
          },
        };
      }
      pathItem[methodLower] = operation;
    }
    document.paths[proxy.path] = pathItem;
  }
}
*/

// Middleware kết hợp: xác thực token + ánh xạ ID thành URL an toàn cho các route convert
/**
 * ĐÃ CHUYỂN VÀO ProxyController VÀ FilesViewPermissionGuard
 * 
async function secureDocUrlMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  // 1. Xác thực Bearer token
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const rawQueryToken = req.query?.accessToken || req.query?.access_token;
  const token = (typeof authHeader === 'string' && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7).trim()
    : (typeof rawQueryToken === 'string' ? rawQueryToken : '');

  if (!token) {
    console.warn('[secureDocUrlMiddleware] Missing Bearer token');
    return res.status(401).json({ message: 'Unauthorized: missing Bearer token' });
  }

  try {
    const decoded = await verifyKeycloakToken(token);
    req.user = decoded;
  } catch (err: any) {
    console.error('[secureDocUrlMiddleware] Token verification failed:', err.message);
    return res.status(401).json({ message: 'Unauthorized: invalid token', error: err.message });
  }

  // 2. Lấy fileId từ query/body (FE gửi id) hoặc extract từ docUrl (backward compat)
  const resolveBaseUrl = () => {
    const configuredHost = (process.env.URL_NESTJS || '').trim();
    if (configuredHost) return configuredHost;

    const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
    const forwardedHost = (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim();
    const host = forwardedHost || (req.headers.host as string)?.trim();
    const proto = forwardedProto || req.protocol || 'http';
    if (host) return `${proto}://${host}`;
    return `${process.env.URL_NESTJS || 'localhost'}:${process.env.PORT || 3000}`;
  };

  let fileId = req.query?.id || req.body?.id;
  let rawDocUrl = req.query?.docUrl || req.body?.docUrl;

  // Handle array case from qs parser
  if (Array.isArray(fileId)) fileId = fileId[0] as string;
  if (Array.isArray(rawDocUrl)) rawDocUrl = rawDocUrl[0] as string;

  if (!rawDocUrl && !fileId) {
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
  }

  // 3. Nếu FE gửi docUrl thay vì id, extract ID từ URL
  if (rawDocUrl && !fileId) {
    try {
      const urlObj = new URL(String(rawDocUrl));

      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
      }

      const match = urlObj.pathname.match(/\/api\/files\/(?:download|raw|view|download-tool|download-new)\/([^/?#]+)/);
      if (match && match[1]) {
        fileId = match[1];
      } else {
        return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
      }
    } catch (e) {
      return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
    }
  }

  if (!fileId) {
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
  }

  // 4. Build lại URL an toàn từ BE domain nội bộ
  const backendDomain = resolveBaseUrl();
  // Chỉ giữ luồng fileId/public_id: dựng URL tải file trực tiếp từ id đã nhận.
  const safeDocUrl = `${backendDomain}/api/files/download-tool/${fileId}`;

  // 5. Ghi đè URL an toàn vào cả query/body để service downstream đọc kiểu nào cũng đúng
  (req.query as any).docUrl = safeDocUrl;

  if (req.body && typeof req.body === 'object') {
    req.body.docUrl = safeDocUrl;
  } else {
    req.body = { docUrl: safeDocUrl };
  }

  // Giữ req.url đồng bộ để proxy forward đúng query mới
  const parsedUrl = new URL(req.url, 'http://localhost');
  parsedUrl.searchParams.set('docUrl', safeDocUrl);
  req.url = `${parsedUrl.pathname}${parsedUrl.search}`;

  return next();
}
*/

process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection] Phát hiện lỗi chạy ngầm không được try-catch:', reason?.message || reason);
  if (reason?.stack) {
    console.error(reason.stack);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception] Ngoại lệ nghiêm trọng toàn cục:', error.message);
  console.error(error.stack);
});

async function bootstrap() {
  console.log('================ [MAIN BOOTSTRAP] START =================');
  console.log(
    `[Bootstrap] HOSTNAME=${process.env.HOSTNAME || 'undefined'}, DISABLE_CRON=${process.env.DISABLE_CRON || 'false'}`,
  );
  console.log('[MAIN BOOTSTRAP] URL_NESTJS:', process.env.URL_NESTJS);
  console.log('[MAIN BOOTSTRAP] PORT:', process.env.PORT);
  console.log('==========================================================');

  // 1️⃣ [Boot Precheck] Thực hiện phân giải DNS & TCP Port quét trước khi NestJS khởi động
  let host = process.env.SQLSERVER_HOST || '';
  let dbPort = Number(process.env.SQLSERVER_PORT || 1433);

  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    dbPort = Number(parts[1]) || dbPort;
    console.log(`[Boot Precheck] Tự động bóc tách Host: ${host} và Port: ${dbPort}`);
  }

  let resolvedHost = host;
  let connected = false;

  console.log(`📡 [Boot Precheck] Bắt đầu khởi tạo kết nối Database...`);
  console.log(`📡 [Boot Precheck] Cấu hình Host gốc: '${host}', Port: ${dbPort}`);

  if (host) {
    try {
      if (require('net').isIP(host) === 0) {
        console.log(`[Boot Precheck] Đang kiểm tra DNS của host '${host}' bằng dns.lookup chuẩn OS...`);
        const dns = require('dns');
        const { promisify } = require('util');
        const lookupAsync = promisify(dns.lookup);
        const res = await lookupAsync(host, { all: true });
        const ips = res.map((addr: any) => addr.address);
        console.log(`   -> Tìm thấy danh sách IP phân giải được: [${ips.join(', ')}]`);

        const checkPort = (ipAddress: string, tcpPort: number): Promise<boolean> => {
          return new Promise((resolve) => {
            const socket = new (require('net').Socket)();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
            socket.connect(tcpPort, ipAddress);
          });
        };

        const checkDbLogicalStateBoot = async (ipAddress: string, tcpPort: number): Promise<boolean> => {
          const hasPort = await checkPort(ipAddress, tcpPort);
          if (!hasPort) return false;

          const user = process.env.SQLSERVER_USER;
          const password = process.env.SQLSERVER_PASSWORD;
          const database = process.env.SQLSERVER_DATABASE;
          if (!user || !password || !database) {
            console.warn(`[Boot Precheck] Thiếu cấu hình credentials, chỉ sử dụng kết quả kiểm tra TCP Port.`);
            return true;
          }

          const sql = require('mssql');
          const encrypt = process.env.SQLSERVER_ENCRYPT === 'true';
          const trustServerCertificate = (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false';
          const enableArithAbort = process.env.SQLSERVER_ENABLE_ARITH_ABORT === 'true';
          const multiSubnetFailover = process.env.SQLSERVER_MULTI_SUBNET_FAILOVER === 'true';
          const cryptoCredentialsDetails = {
            minVersion: 'TLSv1',
          };
          console.log(`[Boot Precheck] trustServerCertificate = ${trustServerCertificate} cho IP ${ipAddress}`);
          const tempPool = new sql.ConnectionPool({
            server: ipAddress,
            port: tcpPort,
            user,
            password,
            database,
            connectionTimeout: 4000,
            requestTimeout: 4000,
            options: {
              encrypt,
              trustServerCertificate,
              enableArithAbort,
              multiSubnetFailover,
              cryptoCredentialsDetails,
            },
          });

          try {
            await tempPool.connect();
            const result = await tempPool.query(`SELECT DATABASEPROPERTYEX('${database}', 'Updateability') AS updateability`);
            const updateability = result.recordset?.[0]?.updateability;
            if (updateability === 'READ_WRITE') {
              return true;
            }
            console.warn(`[Boot Precheck] Trạng thái DB trên IP '${ipAddress}' là ${updateability} (không phải READ_WRITE).`);
            return false;
          } catch (err: any) {
            console.warn(`[Boot Precheck] Lỗi kết nối logic tới DB trên IP '${ipAddress}': ${err.message}`);
            return false;
          } finally {
            try {
              await tempPool.close();
            } catch (e) { }
          }
        };

        let primaryIp: string | null = null;
        let fallbackIp: string | null = null;

        for (const ip of ips) {
          console.log(`   -> Đang kiểm tra TCP Port ${dbPort} trên IP: '${ip}'...`);
          const portOk = await checkPort(ip, dbPort);
          if (portOk) {
            if (!fallbackIp) {
              fallbackIp = ip; // Save as the first TCP-alive fallback candidate
            }

            console.log(`   -> Port ${dbPort} mở. Đang kiểm tra logic DB & Always On replica role trên IP: '${ip}'...`);
            const logicalOk = await checkDbLogicalStateBoot(ip, dbPort);
            if (logicalOk) {
              primaryIp = ip;
              console.log(`   -> THÀNH CÔNG! Node '${ip}' hoạt động và ở trạng thái PRIMARY (READ_WRITE).`);
              break;
            }
          } else {
            console.log(`   -> Port ${dbPort} trên IP '${ip}' đóng.`);
          }
        }

        if (primaryIp) {
          resolvedHost = primaryIp;
          connected = true;
          process.env.SQLSERVER_ACTIVE_IP = resolvedHost;
        } else if (fallbackIp) {
          console.warn(`[Boot Precheck] Cảnh báo: Không tìm thấy node nào ở trạng thái PRIMARY (READ_WRITE). Sử dụng node fallback có port ${dbPort} mở: '${fallbackIp}'`);
          resolvedHost = fallbackIp;
          connected = true;
          process.env.SQLSERVER_ACTIVE_IP = resolvedHost;
        }
      } else {
        console.log(`[Boot Precheck] Host đã là IP: '${host}', bỏ qua DNS resolve.`);
        const checkPort = (ipAddress: string, tcpPort: number): Promise<boolean> => {
          return new Promise((resolve) => {
            const socket = new (require('net').Socket)();
            socket.setTimeout(3000);
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
            socket.connect(tcpPort, ipAddress);
          });
        };
        const checkDbLogicalStateBoot = async (ipAddress: string, tcpPort: number): Promise<boolean> => {
          const hasPort = await checkPort(ipAddress, tcpPort);
          if (!hasPort) return false;

          const user = process.env.SQLSERVER_USER;
          const password = process.env.SQLSERVER_PASSWORD;
          const database = process.env.SQLSERVER_DATABASE;
          if (!user || !password || !database) {
            return true;
          }

          const sql = require('mssql');
          const encrypt = process.env.SQLSERVER_ENCRYPT === 'true';
          const trustServerCertificate = (process.env.SQLSERVER_TRUST_SERVER_CERTIFICATE || '').trim().toLowerCase() !== 'false';

          const tempPool = new sql.ConnectionPool({
            server: ipAddress,
            port: tcpPort,
            user,
            password,
            database,
            connectionTimeout: 4000,
            requestTimeout: 4000,
            options: {
              encrypt,
              trustServerCertificate,
              enableArithAbort: true,
              cryptoCredentialsDetails: {
                minVersion: 'TLSv1',
              },
            },
          });

          try {
            await tempPool.connect();
            const result = await tempPool.query(`SELECT DATABASEPROPERTYEX('${database}', 'Updateability') AS updateability`);
            const updateability = result.recordset?.[0]?.updateability;
            if (updateability === 'READ_WRITE') {
              return true;
            }
            return false;
          } catch (err) {
            return false;
          } finally {
            try {
              await tempPool.close();
            } catch (e) { }
          }
        };

        const isPortOk = await checkPort(host, dbPort);
        if (isPortOk) {
          const isLogicalOk = await checkDbLogicalStateBoot(host, dbPort);
          resolvedHost = host;
          connected = true;
          process.env.SQLSERVER_ACTIVE_IP = resolvedHost;
          if (isLogicalOk) {
            console.log(`   -> THÀNH CÔNG! IP '${host}' hoạt động và ở trạng thái READ_WRITE.`);
          } else {
            console.warn(`   -> Cảnh báo! IP '${host}' mở cổng TCP nhưng kiểm tra Always On (PRIMARY) thất bại. Đang fallback sử dụng IP này.`);
          }
        }
      }
    } catch (e: any) {
      console.error(`[Boot Precheck] Lỗi DNS/Kết nối cho '${host}': ${e.message}`);
    }
  }

  if (connected) {
    console.log(`[Boot Precheck] KẾT QUẢ: Kiểm tra kết nối TCP ban đầu thành công tới IP hoạt động: '${resolvedHost}'`);
  } else {
    console.warn(`[Boot Precheck] KẾT QUẢ: Không tìm thấy IP nào hoạt động trên cổng ${dbPort} cho host '${host}'!`);
  }

  const app = await NestFactory.create(AppModule, { logger: appLogger });
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // 🟢 Cho phép Express tin tưởng proxy headers (Di chuyển lên đầu trước middleware)
  const expressApp = app.getHttpAdapter().getInstance() as express.Application;

  expressApp.use(traceHeadersMiddleware);

  // Logging middleware - proxy/gateway debug only.
  expressApp.use((req, res, next) => {
    if (isLogDebugEnabled() && (req.url.includes('doc-url-to-pdf') || req.url.includes('proxy'))) {
      console.debug('[EXPRESS MIDDLEWARE]', req.method, req.originalUrl);
      console.debug('[EXPRESS MIDDLEWARE] path:', req.path);
    }
    next();
  });

  // Tin tưởng tất cả proxy trong mạng nội bộ
  expressApp.set('trust proxy', true);

  // Cấu hình HTTP headers chống Clickjacking theo yêu cầu
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"],
      },
    },
    xFrameOptions: { action: 'sameorigin' },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use('/upload', express.static(join(__dirname, '..', 'upload')));
  app.use(cookieParser());

  const configService = app.get(ConfigService);

  // 🔥 init MSSQL pool singleton
  await getMssqlPool(configService);

  // Start pool health check every 30 seconds
  startPoolHealthCheck(configService, 60000);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  axios.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  // Dùng qs parser để nested query hoạt động
  expressApp.set('query parser', (str: string) => qs.parse(str, { allowDots: true }));

  // Disable ETag để tránh conflict với WOPI và caching issues
  expressApp.set('etag', false);

  app.use((req, res, next) => {
    const allowedFrameAncestors = process.env.ALLOWED_FRAME_ANCESTORS || '';
    // Hỗ trợ truyền nhiều domain qua env cách nhau bằng dấu phẩy
    const frameAncestorsString = allowedFrameAncestors.split(',').map(d => d.trim()).join(' ');

    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "img-src 'self' data: blob:; " +
      "media-src 'self' blob: data:; " +           // Quan trọng cho audio
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      `frame-ancestors 'self' ${frameAncestorsString};`
    );

    next();
  });

  // MongoDB connection is currently disabled
  // const connection = app.get<Connection>(getConnectionToken());
  // const client = connection.getClient();
  app.enableCors({
    origin: true,
    // origin: [
    //   'http://localhost:3156',
    //   'http://localhost:8080',
    //   'http://192.168.0.62:1111',
    //   process.env.REDIRECT_URI_FE,
    //   process.env.REDIRECT_URI_FE_TEST,
    //   process.env.REDIRECT_URI_FE_DEV,
    //   process.env.REDIRECT_URI_FE_PROD,
    //   'https://quan-ly-quy-trinh-luu-tru-so.lifetex.vn'
    // ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'X-WOPI-Override',
      'X-WOPI-Lock',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Token-Signing',
      'X-Service-Id',
      'Referer',
      'User-Agent',
      'Token',
      'Clientid',
      'X-Trace-Id',
      'X-Span-Id',
      'traceparent',
      'tracestate',
    ],
    exposedHeaders: [
      'Content-Length',
      'Content-Type',
      'Content-Disposition',
      'Authorization',
      'Token-Signing',
      'X-Trace-Id',
      'X-Span-Id',
    ],
    credentials: true,
  });
  // MongoDB is currently disabled, so use in-memory session store
  // In production, you should connect MongoDB and use MongoStore
  app.use(
    session({
      name: 'sid',
      secret: process.env.SESSION_SECRET ?? 'dev_secret_change_me',
      resave: false,
      saveUninitialized: false,
      // store: MongoStore.create({
      //   client,
      //   dbName: 'kho_tthc',
      //   collectionName: 'sessions',
      //   stringify: false,
      //   autoRemove: 'interval',
      //   autoRemoveInterval: 10,
      //   ttl: 60 * 60 * 24 * 7,
      // }),
      cookie: {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: '/',
      },
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [
      'admin-api/(.*)',
      'builder-api/(.*)',
    ],
  });

  /** ĐÃ CHUYỂN SANG ProxyController
  app.use(
    '/api/replace-hashkey-in-doc-url',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/replace-hashkey-in-doc-url`,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        console.log('Proxying /replace-hashkey-in-doc-url request to', process.env.APP_CONVERT_URL);
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );

  app.use(
    '/api/replace-text-in-excel',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/replace-text-in-excel`,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.removeHeader('Content-Length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );

  app.use(
    '/api/replace-text-in-pdf-tcsg',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/replace-text-in-pdf-tcsg`,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.removeHeader('Content-Length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );
  */

  app.use(express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf?.length ? buf.toString('utf8') : '';
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  /** ĐÃ CHUYỂN SANG ProxyController
  app.use('/api/replace-text-in-word', secureDocUrlMiddleware);
  app.use(
    '/api/replace-text-in-word',
    createProxyMiddleware({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      selfHandleResponse: false,
      pathRewrite: {
        '^/': '/replace-text-in-word',
      },
      proxyTimeout: 120000,
      timeout: 120000,
      on: {
        proxyReq(proxyReq: any, req: any) {
          fixRequestBody(proxyReq, req);
        },
        error(err: any, req: any, res: any) {
          console.error('[replace-text-in-word proxy error]', err.message);
          if (res && !res.headersSent) {
            res.status(502).json({ error: err.message });
          }
        },
      },
    }),
  );

  app.use(
    '/api/doc-url-to-pdf',
    createProxyMiddleware({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: (path, req: any) => {
        // Nếu frontend truyền ?id=... thì ánh xạ thành ?docUrl=... trỏ về API lấy file raw của chính mình
        if (req.query && req.query.id) {
          const baseUrl = (process.env.URL_NESTJS || '').trim();
          const fileUrl = `${baseUrl}/api/files/download-tool/${req.query.id}`;
          return `/doc-url-to-pdf?docUrl=${encodeURIComponent(fileUrl)}`;
        }
        return '/doc-url-to-pdf';
      },
      onProxyReq(proxyReq, req: any, res) {
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.removeHeader('Content-Length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
      onError(err: any, req: any, res: any) {
        console.error('[proxy:/doc-url-to-pdf] Proxy error:', {
          target: process.env.APP_CONVERT_URL,
          method: req?.method,
          url: req?.url,
          code: err?.code,
          message: err?.message,
        });
        if (!res.headersSent) {
          res.status(502).json({
            message: 'Proxy to convert service failed',
            code: err?.code || null,
            detail: err?.message || 'Unknown proxy error',
          });
        }
      },
    }),
  );
  app.use(
    '/api/file-to-pdf',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/file-to-pdf`,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        console.log('Proxying /file-to-pdf request to', process.env.APP_CONVERT_URL);
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );

  app.use(
    '/api/doc-to-pdf',
    createProxyMiddleware({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );
  app.use(
    '/api/merge-file',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/merge-word-urls`,
      changeOrigin: true,
      onProxyReq(proxyReq, req: any, res) {
        if (req.method === 'POST' && req.body) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    }),
  );

  app.use(
    '/api/scan-keywords',
    createProxyMiddleware({
      target: `${process.env.APP_CONVERT_URL}/signing/scan-keywords`,
      changeOrigin: true,
      timeout: 30000,
      proxyTimeout: 30000,
    }),
  );
  */


  //console.log('🟢 Proxy /doc-url-to-pdf to', process.env.APP_CONVERT_URL);
  /* ĐÃ CHUYỂN SANG ProxyController
  app.use(
    '/admin-api',
    createProxyMiddleware({
      target: process.env.APP_DHVB || 'https://administrator.lifetex.vn:295/api',
      changeOrigin: true,
      secure: false, // Bỏ qua kiểm tra chứng chỉ SSL nếu cần
      pathRewrite: {
        '^/admin-api': '', // Xóa tiền tố /admin-api khỏi đường dẫn
      },
      onProxyReq(proxyReq, req: any, res) {
        if (req.body) {
          proxyReq.write(JSON.stringify(req.body));
        }
      },
    }),
  );

  //  🟢 Proxy cho service "builder"
  app.use(
    '/builder-api', // Tiền tố API mà FE sẽ gọi đến backend của bạn
    createProxyMiddleware({
      target: 'http://192.168.0.62:1111', // URL của service "builder"
      changeOrigin: true, // Cần thiết để server ảo có thể host trên các domain khác nhau
      secure: false, // Bỏ qua kiểm tra SSL nếu service builder dùng HTTPS với chứng chỉ tự ký
      pathRewrite: {
        '^/builder-api': '', // Xóa tiền tố /builder-api trước khi chuyển tiếp request
      },
      onProxyReq(proxyReq, req: any, res) {
        // Bạn có thể thêm logic ở đây, ví dụ: thêm header, xử lý body, ...
        // Dòng code dưới đây đảm bảo body của request (nếu có) được gửi đi
        if (req.body) {
          proxyReq.write(JSON.stringify(req.body));
        }
      },
    }),
  );
  */
  // app.use(
  //     '/builder-api',
  //     createProxyMiddleware({
  //       target: 'http://192.168.0.62:1111',
  //       changeOrigin: true,
  //       secure: false,
  //       pathRewrite: {
  //         '^/builder-api': '', // Xóa /builder-api → gửi đúng path gốc
  //       },
  //       router: () => 'http://192.168.0.62:1111',
  //       onProxyReq: (proxyReq, req) => {
  //         console.log(`Proxying: ${req.method} ${req.originalUrl} → http://192.168.0.62:1111${req.path}`);
  //       },
  //       onError: (err, req, res) => {
  //         console.error('Proxy Error:', err.code, err.message);
  //         res.status(502).json({
  //           error: 'Cannot connect to Builder',
  //           target: '192.168.0.62:1111',
  //           suggestion: 'Check network or Builder service',
  //         });
  //       },
  //     }),
  //   );


  // app.enableCors({
  // 	origin: '*',
  // 	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  // 	allowedHeaders: '*',
  // });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const formattedErrors = formatErrors(errors);

        return new BadRequestException({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          errors: formattedErrors,
        });
      },
    }),
  );


  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('BPMN Engine API')
    .setDescription('API documentation for the BPMN Process Document Engine')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Proxy', 'Proxy endpoints defined in main.ts')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // addProxySwaggerDocs(document);
  // SwaggerModule.setup('api-docs', app, document);

  // Cấu hình Swagger riêng cho WOPI & Document - Lọc theo Tag 'WOPI'
  const wopiConfig = new DocumentBuilder()
    .setTitle('WOPI & Document API')
    .setDescription('Tài liệu hướng dẫn API cho tích hợp WOPI và Document Online')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const fullDocument = SwaggerModule.createDocument(app, wopiConfig);
  const wopiPaths = {};

  // Lọc chỉ lấy các path có tag 'WOPI'
  Object.keys(fullDocument.paths).forEach((path) => {
    const methods = fullDocument.paths[path];
    const filteredMethods = {};

    Object.keys(methods).forEach((method) => {
      if (methods[method].tags && methods[method].tags.includes('WOPI')) {
        filteredMethods[method] = methods[method];
      }
    });

    if (Object.keys(filteredMethods).length > 0) {
      wopiPaths[path] = filteredMethods;
    }
  });

  const wopiDocument: any = {
    ...fullDocument,
    paths: wopiPaths,
  };

  // SwaggerModule.setup('wopi-api', app, wopiDocument);

  // Xuất file JSON Swagger cho WOPI & Document
  // try {
  //   fs.writeFileSync(
  //     join(__dirname, '..', 'wopi-swagger.json'),
  //     JSON.stringify(wopiDocument, null, 2),
  //   );
  //   Logger.log('✅ Đã xuất file Swagger JSON: wopi-swagger.json', 'Bootstrap');
  // } catch (err) {
  //   Logger.error('❌ Lỗi khi xuất file Swagger JSON: ' + err.message, 'Bootstrap');
  // }

  // ✅ Commented - UserLogModule deleted
  // const logService = app.get(UserLogService);
  // // 🟢 Truyền reflector để interceptor đọc được @LogAction
  // app.useGlobalInterceptors(new LogInterceptor(logService, reflector));

  const dataSource = app.get(getDataSourceToken('mssqlConnection'));
  console.log('⏳ Waiting for Database...');
  await waitForDb(dataSource);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`🚀 Server đang chạy tại: http://localhost:${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error(`❌ Lỗi khởi động ứng dụng: ${err.message}`, err.stack, 'Bootstrap');
  process.exit(1);
});

