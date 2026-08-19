import { Logger } from '@nestjs/common';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContext } from '../context/request-context';

const TRACE_ID_HEADER = 'X-Trace-Id';
const SPAN_ID_HEADER = 'X-Span-Id';
const httpLifecycleTracer = trace.getTracer('doffice-be.http-lifecycle');
const httpAccessLogger = new Logger('HttpAccess');
const SAFE_PARAM_KEYS = new Set([
  'id',
  'fileId',
  'taskId',
  'documentId',
  'processId',
  'processKey',
  'userId',
  'meetingId',
  'requestId',
]);

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseTraceparent(traceparent: string | undefined): string | undefined {
  if (!traceparent) return undefined;

  const parts = traceparent.trim().split('-');
  if (parts.length < 4) return undefined;

  const traceId = parts[1];
  if (!/^[0-9a-f]{32}$/i.test(traceId) || /^0{32}$/.test(traceId)) {
    return undefined;
  }

  return traceId;
}

function getActiveSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

function getActiveTraceContext(activeSpan = getActiveSpan()): { traceId?: string; spanId?: string } {
  const spanContext = activeSpan?.spanContext();

  return {
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
  };
}

function createTraceId(): string {
  return randomBytes(16).toString('hex');
}

function canWriteSpan(span: Span | undefined): span is Span {
  try {
    return Boolean(span?.isRecording());
  } catch {
    return false;
  }
}

function setStringAttribute(span: Span | undefined, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  if (!canWriteSpan(span)) return;

  try {
    span.setAttribute(key, String(value));
  } catch {
    // Span can be ended by OpenTelemetry before Express finish handlers run.
  }
}

function setNumberAttribute(span: Span | undefined, key: string, value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return;
  if (!canWriteSpan(span)) return;

  try {
    span.setAttribute(key, numberValue);
  } catch {
    // Keep tracing best-effort; header propagation must not create runtime log noise.
  }
}

function addSpanEvent(span: Span | undefined, name: string, attributes: Record<string, string | number>) {
  if (!canWriteSpan(span)) return;

  try {
    span.addEvent(name, attributes);
  } catch {
    // Keep tracing best-effort; avoid SDK diagnostics for ended spans.
  }
}

function setSpanErrorStatus(span: Span | undefined, statusCode: number) {
  if (!canWriteSpan(span)) return;

  try {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `HTTP ${statusCode}`,
    });
  } catch {
    // Keep tracing best-effort; avoid SDK diagnostics for ended spans.
  }
}

function getQueryKeys(req: Request): string {
  return Object.keys(req.query || {}).sort().join(',');
}

function getRequestPath(req: Request): string {
  return req.originalUrl || req.url || req.path || '';
}

function getUserInfo(req: Request): Record<string, unknown> {
  const user = (req as any).user || {};

  return {
    id: user.id || user.userId || user.sub || user._id,
    username: user.username || user.preferred_username || user.email || user.name,
    orgId: user.organizationUnitId || user.orgId || user.organization_id || user.parent,
    role: user.role || user.roles,
  };
}

function getRequestRoute(req: Request): string {
  const routePath = (req.route?.path && String(req.route.path)) || '';
  const baseUrl = req.baseUrl || '';

  if (routePath) {
    return `${baseUrl}${routePath}`;
  }

  return req.path || req.url || '';
}

function setSafeParams(span: Span | undefined, params: Request['params']) {
  for (const [key, value] of Object.entries(params || {})) {
    if (!SAFE_PARAM_KEYS.has(key)) continue;

    setStringAttribute(span, `app.route.params.${key}`, value);
  }
}

function addRequestAttributes(span: Span | undefined, req: Request, traceId: string, spanId?: string) {
  setStringAttribute(span, 'app.trace_id', traceId);
  setStringAttribute(span, 'app.span_id', spanId);
  setStringAttribute(span, 'app.request.start_time', new Date().toISOString());
  setStringAttribute(span, 'app.http.method', req.method);
  setStringAttribute(span, 'app.http.path', req.path || req.url);
  setStringAttribute(span, 'app.http.query_keys', getQueryKeys(req));
  setStringAttribute(span, 'app.client.ip', req.ip || req.socket?.remoteAddress);
  setStringAttribute(span, 'app.client.user_agent', req.headers['user-agent']);
  setStringAttribute(span, 'app.request.content_type', req.headers['content-type']);
  setNumberAttribute(span, 'app.request.content_length', req.headers['content-length']);

  addSpanEvent(span, 'request.received', {
    'app.http.method': req.method,
    'app.http.path': req.path || req.url || '',
  });
}

function addResponseAttributes(span: Span | undefined, req: Request, res: Response, durationMs: number) {
  const userInfo = getUserInfo(req);

  setStringAttribute(span, 'app.http.route', getRequestRoute(req));
  setNumberAttribute(span, 'app.duration_ms', durationMs);
  setNumberAttribute(span, 'app.response.status_code', res.statusCode);
  setStringAttribute(span, 'app.response.status_message', res.statusMessage);
  setNumberAttribute(span, 'app.response.content_length', res.getHeader('content-length'));
  setStringAttribute(span, 'app.user.id', userInfo.id);
  setStringAttribute(span, 'app.user.username', userInfo.username);
  setStringAttribute(span, 'app.user.org_id', userInfo.orgId);
  setStringAttribute(span, 'app.user.role', userInfo.role);
  setSafeParams(span, req.params);

  addSpanEvent(span, 'request.finished', {
    'app.duration_ms': durationMs,
    'app.response.status_code': res.statusCode,
  });

  if (res.statusCode >= 500) {
    setSpanErrorStatus(span, res.statusCode);
  }
}

function setRequestLogContext(req: Request, res: Response, durationMs: number) {
  RequestContext.set('method', req.method);
  RequestContext.set('path', getRequestPath(req));
  RequestContext.set('route', getRequestRoute(req));
  RequestContext.set('statusCode', res.statusCode);
  RequestContext.set('responseTimeMs', durationMs);
}

function shouldSkipHttpAccessLog(req: Request): boolean {
  return req.url?.includes('health-check') ?? false;
}

function logHttpAccess(req: Request, res: Response, durationMs: number) {
  setRequestLogContext(req, res, durationMs);

  if (shouldSkipHttpAccessLog(req)) return;

  const message = getRequestPath(req);
  if (res.statusCode >= 500) {
    httpAccessLogger.error(message);
    return;
  }

  if (res.statusCode >= 400) {
    httpAccessLogger.warn(message);
    return;
  }

  httpAccessLogger.log(message);
}

export function traceHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  const activeSpan = getActiveSpan();
  const lifecycleSpan = httpLifecycleTracer.startSpan('http.response.lifecycle', {
    attributes: {
      'http.request.method': req.method,
      'url.path': req.path || req.url,
    },
  });
  let lifecycleEnded = false;
  let headersWrittenAt: bigint | undefined;
  let endCalledAt: bigint | undefined;
  let bodyBytesWritten = 0;

  const elapsedMs = (at = process.hrtime.bigint()) =>
    Math.round((Number(at - startedAt) / 1_000_000) * 100) / 100;
  const chunkSize = (chunk: unknown, encoding?: BufferEncoding): number => {
    if (chunk === undefined || chunk === null) return 0;
    if (Buffer.isBuffer(chunk)) return chunk.length;
    if (typeof chunk === 'string') return Buffer.byteLength(chunk, encoding);
    if (chunk instanceof Uint8Array) return chunk.byteLength;
    return 0;
  };
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  const originalWriteHead = res.writeHead.bind(res);

  (res.writeHead as any) = (...args: any[]) => {
    if (!headersWrittenAt) {
      headersWrittenAt = process.hrtime.bigint();
      lifecycleSpan.addEvent('response.headers_written', {
        'app.elapsed_ms': elapsedMs(headersWrittenAt),
        'http.response.status_code': res.statusCode,
      });
    }
    return originalWriteHead(...args);
  };

  (res.write as any) = (chunk: unknown, encoding?: BufferEncoding, callback?: () => void) => {
    bodyBytesWritten += chunkSize(chunk, encoding);
    return originalWrite(chunk as any, encoding as any, callback as any);
  };

  (res.end as any) = (chunk?: unknown, encoding?: BufferEncoding, callback?: () => void) => {
    if (!endCalledAt) {
      endCalledAt = process.hrtime.bigint();
      bodyBytesWritten += chunkSize(chunk, encoding);
      lifecycleSpan.addEvent('response.end_called', {
        'app.elapsed_ms': elapsedMs(endCalledAt),
        'app.response.body_bytes_written': bodyBytesWritten,
      });
    }
    return originalEnd(chunk as any, encoding as any, callback as any);
  };

  const endLifecycleSpan = (eventName: 'response.finished' | 'response.closed') => {
    if (lifecycleEnded) return;
    lifecycleEnded = true;
    const durationMs = elapsedMs();
    lifecycleSpan.addEvent(eventName, {
      'app.elapsed_ms': durationMs,
      'http.response.status_code': res.statusCode,
    });
    lifecycleSpan.setAttributes({
      'app.response.lifecycle_ms': durationMs,
      'app.response.headers_written_ms': headersWrittenAt ? elapsedMs(headersWrittenAt) : -1,
      'app.response.end_called_ms': endCalledAt ? elapsedMs(endCalledAt) : -1,
      'app.response.body_bytes_written': bodyBytesWritten,
      'app.response.content_length': Number(res.getHeader('content-length')) || 0,
      'http.response.status_code': res.statusCode,
      'app.response.completed': eventName === 'response.finished',
    });
    if (eventName === 'response.closed' && !res.writableFinished) {
      lifecycleSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Response closed before finish' });
    }
    lifecycleSpan.end();
  };
  const activeTraceContext = getActiveTraceContext(activeSpan);
  const incomingTraceId =
    firstHeaderValue(req.headers['x-trace-id']) ||
    parseTraceparent(firstHeaderValue(req.headers.traceparent));
  const incomingSpanId = firstHeaderValue(req.headers['x-span-id']);

  const traceId = activeTraceContext.traceId || incomingTraceId || createTraceId();
  const spanId = activeTraceContext.spanId || incomingSpanId;

  req.headers['x-trace-id'] = traceId;
  (req as any).traceId = traceId;

  if (spanId) {
    req.headers['x-span-id'] = spanId;
    (req as any).spanId = spanId;
  }

  if (!res.headersSent) {
    res.setHeader(TRACE_ID_HEADER, traceId);
    if (spanId) {
      res.setHeader(SPAN_ID_HEADER, spanId);
    }
  }

  const baseRequestContext = {
    traceId,
    spanId,
    method: req.method,
    path: getRequestPath(req),
  };

  RequestContext.run(baseRequestContext, () => {
    addRequestAttributes(activeSpan, req, traceId, spanId);

    res.on('finish', () => {
      RequestContext.run(baseRequestContext, () => {
        const durationMs = elapsedMs();
        addResponseAttributes(activeSpan, req, res, durationMs);
        logHttpAccess(req, res, durationMs);
        endLifecycleSpan('response.finished');
      });
    });
    res.on('close', () => endLifecycleSpan('response.closed'));

    next();
  });
}
