import {
  Controller,
  All,
  Get,
  Post,
  Req,
  Res,
  Next,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { verifyKeycloakToken } from '../utils/keycloak-verify';
import { FilesViewPermissionGuard } from 'src/files-managerment/guards/files-view-permission.guard';
import { FilesManagementService } from '../files-managerment/files-management-mssql.service';

const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: chuẩn hóa base URL của chính BE (dùng để build safeDocUrl)
// ─────────────────────────────────────────────────────────────────────────────
function resolveBaseUrl(req: Request): string {
  const configuredHost = (process.env.URL_NESTJS || '').trim();
  if (configuredHost) return configuredHost;

  const forwardedProto = (req.headers['x-forwarded-proto'] as string)
    ?.split(',')[0]
    ?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string)
    ?.split(',')[0]
    ?.trim();
  const host = forwardedHost || (req.headers.host as string)?.trim();
  const proto = forwardedProto || req.protocol || 'http';
  if (host) return `${proto}://${host}`;
  return `${process.env.URL_NESTJS || 'localhost'}:${process.env.PORT || 3000}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: xác thực Bearer token + ánh xạ id/docUrl → safeDocUrl
// Dùng cho các route cần kiểm tra quyền trước khi proxy tới convert service
// ─────────────────────────────────────────────────────────────────────────────
async function secureDocUrlMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.method === 'OPTIONS') return next();

  // 1. Xác thực Bearer token
  const authHeader = req.headers?.authorization || (req.headers as any)?.Authorization;
  const rawQueryToken = (req.query as any)?.accessToken || (req.query as any)?.access_token;
  const token =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : typeof rawQueryToken === 'string'
        ? rawQueryToken
        : '';

  if (!token) {
    console.warn('[secureDocUrlMiddleware] Missing Bearer token');
    return res.status(401).json({ message: 'Unauthorized: missing Bearer token' });
  }

  try {
    const decoded = await verifyKeycloakToken(token);
    (req as any).user = decoded;
  } catch (err: any) {
    console.error('[secureDocUrlMiddleware] Token verification failed:', err.message);
    return res
      .status(401)
      .json({ message: 'Unauthorized: invalid token', error: err.message });
  }

  // 2. Lấy fileId từ query/body hoặc extract từ docUrl (backward compat)
  let fileId: string | undefined =
    (req.query as any)?.id || (req.body as any)?.id;
  let rawDocUrl: string | undefined =
    (req.query as any)?.docUrl || (req.body as any)?.docUrl;

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

      const match = urlObj.pathname.match(
        /\/api\/files\/(?:download|raw|view|download-tool|download-new)\/([^/?#]+)/,
      );
      if (match?.[1]) {
        fileId = match[1];
      } else {
        return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
      }
    } catch {
      return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
    }
  }

  if (!fileId) {
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
  }

  // 4. Build lại URL an toàn từ BE domain nội bộ
  const backendDomain = resolveBaseUrl(req);
  const safeDocUrl = `${backendDomain}/api/files/download-tool/${fileId}`;

  // 5. Ghi đè URL an toàn vào cả query/body
  (req.query as any).docUrl = safeDocUrl;
  if (req.body && typeof req.body === 'object') {
    req.body.docUrl = safeDocUrl;
  } else {
    req.body = { docUrl: safeDocUrl };
  }

  // Đồng bộ req.url để proxy forward đúng query mới
  const parsedUrl = new URL(req.url, 'http://localhost');
  parsedUrl.searchParams.set('docUrl', safeDocUrl);
  req.url = `${parsedUrl.pathname}${parsedUrl.search}`;

  return next();
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory: tạo proxy handler dùng trong controller action
// ─────────────────────────────────────────────────────────────────────────────
function makeProxy(options: Parameters<typeof createProxyMiddleware>[0]) {
  const proxy = createProxyMiddleware(options);
  return (req: Request, res: Response, next: NextFunction) =>
    proxy(req, res, next);
}

// ─────────────────────────────────────────────────────────────────────────────
// ProxyController
// ─────────────────────────────────────────────────────────────────────────────
@ApiTags('Proxy')
@ApiBearerAuth()
@Controller()
export class ProxyController {
  constructor(
    private readonly fileService: FilesManagementService,
  ) {}

  private async resolveLegacyFileId(idOrUuid: string | number): Promise<number> {
    return this.fileService.resolveFileIdOrThrow(idOrUuid);
  }

  // Test route - verify controller is working
  @Get('test-proxy-route')
  @ApiOperation({ summary: 'Test route to verify ProxyController is working' })
  async testProxyRoute(@Req() req: Request, @Res() res: Response) {
    console.log('================ [TEST PROXY ROUTE] HIT =================');
    return res.json({ success: true, message: 'ProxyController is working!' });
  }

  // ── 1. replace-hashkey-in-doc-url ──────────────────────────────────────────
  @All('replace-hashkey-in-doc-url')
  @ApiOperation({ summary: 'Proxy POST /replace-hashkey-in-doc-url → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async replaceHashkeyInDocUrl(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/replace-hashkey-in-doc-url': '/replace-hashkey-in-doc-url' },
      onProxyReq(proxyReq: any, innerReq: any) {
        console.log(
          'Proxying /replace-hashkey-in-doc-url request to',
          process.env.APP_CONVERT_URL,
        );
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    })(req, res, next);
  }

  // ── 2. replace-text-in-excel ───────────────────────────────────────────────
  @All('replace-text-in-excel')
  @ApiOperation({ summary: 'Proxy POST /replace-text-in-excel → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async replaceTextInExcel(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      selfHandleResponse: false,
      pathRewrite: { '^/api/replace-text-in-excel': '/replace-text-in-excel' },
      proxyTimeout: 120_000,
      timeout: 120_000,
      on: {
        proxyReq(proxyReq: any, innerReq: any) {
          if (innerReq.method === 'POST' && innerReq.body) {
            const bodyData = JSON.stringify(innerReq.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        },
      },
    })(req, res, next);
  }

  // ── 3. replace-text-in-pdf-tcsg ────────────────────────────────────────────
  @All('replace-text-in-pdf-tcsg')
  @ApiOperation({ summary: 'Proxy POST /replace-text-in-pdf-tcsg → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async replaceTextInPdfTcsg(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/replace-text-in-pdf-tcsg': '/replace-text-in-pdf-tcsg' },
      onProxyReq(proxyReq: any, innerReq: any) {
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.removeHeader('Content-Length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    })(req, res, next);
  }

  // ── 4. replace-text-in-word  (secureDocUrl → proxy) ───────────────────────
  @All('replace-text-in-word')
  @ApiOperation({
    summary: 'Proxy POST /replace-text-in-word → convert service (token + secureDocUrl)',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async replaceTextInWord(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    // Chạy middleware xác thực + ánh xạ URL trước
    await new Promise<void>((resolve, reject) => {
      secureDocUrlMiddleware(req, res, (err?: any) => {
        if (err) return reject(err);
        resolve();
      });
    }).catch(() => {
      // res đã được trả về bởi middleware
    });

    if (res.headersSent) return;

    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      selfHandleResponse: false,
      pathRewrite: { '^/api/replace-text-in-word': '/replace-text-in-word' },
      proxyTimeout: 120_000,
      timeout: 120_000,
      on: {
        proxyReq(proxyReq: any, innerReq: any) {
          fixRequestBody(proxyReq, innerReq);
        },
        error(err: any, _req: any, innerRes: any) {
          console.error('[replace-text-in-word proxy error]', err.message);
          if (innerRes && !innerRes.headersSent) {
            innerRes.status(502).json({ error: err.message });
          }
        },
      },
    })(req, res, next);
  }

  // ── 5. doc-url-to-pdf ──────────────────────────────────────────────────────
  @Get('doc-url-to-pdf')
  @Post('doc-url-to-pdf')
  // @UseGuards(FilesViewPermissionGuard) // Temporarily disabled for testing
  @ApiOperation({ summary: 'Proxy /doc-url-to-pdf → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async docUrlToPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    let id = req.query?.id as string;
    const docUrl = req.query?.docUrl as string;
    if (!id && docUrl) {
      try {
        const urlObj = new URL(docUrl);
        const match = urlObj.pathname.match(
          /\/api\/files\/(?:download|raw|view|download-tool|download-new)\/([^/?#]+)/,
        );
        if (match?.[1]) {
          id = match[1];
        }
      } catch {
        // ignore
      }
    }

    // if (id) {
    //   const numericId = await this.resolveLegacyFileId(id);
    //   const isRecall = await this.fileService.checkIsRecall(numericId);
    //   if (isRecall) {
    //     throw new ForbiddenException('Tài liệu đã được đánh dấu thu hồi, không thể tải xuống');
    //   }
    // }

    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: (_path: string, innerReq: any) => {
        if (innerReq.query?.id) {
          const baseUrl = (process.env.URL_NESTJS || '').trim();
          const fileUrl = `${baseUrl}/api/files/download-tool/${innerReq.query.id}`;
          return `/doc-url-to-pdf?docUrl=${encodeURIComponent(fileUrl)}`;
        }
        return '/doc-url-to-pdf';
      },
      onProxyReq(proxyReq: any, innerReq: any) {
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.removeHeader('Content-Length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
      onError(err: any, innerReq: any, innerRes: any) {
        console.error('================ [doc-url-to-pdf] PROXY ERROR =================');
        console.error('[doc-url-to-pdf] Proxy error:', {
          target: process.env.APP_CONVERT_URL,
          method: innerReq?.method,
          url: innerReq?.url,
          code: err?.code,
          message: err?.message,
        });
        console.error('===============================================================');
        if (!innerRes.headersSent) {
          innerRes.status(502).json({
            message: 'Proxy to convert service failed',
            code: err?.code || null,
            detail: err?.message || 'Unknown proxy error',
          });
        }
      },
    })(req, res, next);
  }

  // ── 6. file-to-pdf ─────────────────────────────────────────────────────────
  @All('file-to-pdf')
  @ApiOperation({ summary: 'Proxy POST /file-to-pdf → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async fileToPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/file-to-pdf': '/file-to-pdf' },
      onProxyReq(proxyReq: any, innerReq: any) {
        console.log('Proxying /file-to-pdf request to', process.env.APP_CONVERT_URL);
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    })(req, res, next);
  }

  // ── 7. doc-to-pdf ──────────────────────────────────────────────────────────
  @All('doc-to-pdf')
  @ApiOperation({ summary: 'Proxy POST /doc-to-pdf → convert service' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async docToPdf(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      onProxyReq(proxyReq: any, innerReq: any) {
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    })(req, res, next);
  }

  // ── 8. merge-file ──────────────────────────────────────────────────────────
  @All('merge-file')
  @ApiOperation({ summary: 'Proxy POST /merge-file → convert service /merge-word-urls' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async mergeFile(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/merge-file': '/merge-word-urls' },
      onProxyReq(proxyReq: any, innerReq: any) {
        if (innerReq.method === 'POST' && innerReq.body) {
          const bodyData = JSON.stringify(innerReq.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          proxyReq.end();
        }
      },
    })(req, res, next);
  }

  // ── 9. scan-keywords ───────────────────────────────────────────────────────
  @All('scan-keywords')
  @ApiOperation({ summary: 'Proxy /scan-keywords → convert service /signing/scan-keywords' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async scanKeywords(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: process.env.APP_CONVERT_URL,
      changeOrigin: true,
      pathRewrite: { '^/api/scan-keywords': '/signing/scan-keywords' },
      timeout: 30_000,
      proxyTimeout: 30_000,
    })(req, res, next);
  }

  // ── 10. admin-api ──────────────────────────────────────────────────────────
  @All('admin-api')
  @All('admin-api/(.*)')
  @ApiOperation({
    summary: 'Proxy /admin-api/* → APP_DHVB (pathRewrite: ^/admin-api → "")',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async adminApi(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target:
        process.env.APP_DHVB || 'https://administrator.lifetex.vn:295/api',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/admin-api': '' },
      onProxyReq(proxyReq: any, innerReq: any) {
        if (innerReq.body) {
          proxyReq.write(JSON.stringify(innerReq.body));
        }
      },
    })(req, res, next);
  }

  // ── 11. builder-api ────────────────────────────────────────────────────────
  @All('builder-api')
  @All('builder-api/(.*)')
  @ApiOperation({
    summary: 'Proxy /builder-api/* → builder service http://192.168.0.62:1111',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true }, required: false })
  async builderApi(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    return makeProxy({
      target: 'http://192.168.0.62:1111',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/builder-api': '' },
      onProxyReq(proxyReq: any, innerReq: any) {
        console.log(
          `Proxying: ${innerReq.method} ${innerReq.originalUrl} → http://192.168.0.62:1111${innerReq.path}`,
        );
        if (innerReq.body) {
          proxyReq.write(JSON.stringify(innerReq.body));
        }
      },
      onError(err: any, _req: any, innerRes: any) {
        console.error('Proxy Error:', err.code, err.message);
        if (!innerRes.headersSent) {
          innerRes.status(502).json({
            error: 'Cannot connect to Builder',
            target: '192.168.0.62:1111',
            suggestion: 'Check network or Builder service',
          });
        }
      },
    })(req, res, next);
  }
}