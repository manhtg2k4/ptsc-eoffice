import { ConsoleLogger, ConsoleLoggerOptions, LogLevel } from '@nestjs/common';
import { context as otelContext, trace } from '@opentelemetry/api';
import { inspect } from 'util';
import { RequestContext } from '../context/request-context';

const DEFAULT_LOG_LEVELS: LogLevel[] = ['fatal', 'error', 'warn'];
const DEBUG_LOG_LEVELS: LogLevel[] = ['log', 'fatal', 'error', 'warn', 'debug', 'verbose'];
const VALID_LOG_LEVELS = new Set<LogLevel>(['log', 'fatal', 'error', 'warn', 'debug', 'verbose']);
const REDACTED = '[REDACTED]';
const REDACTED_SQL = '[REDACTED_SQL]';
const MAX_LOG_STRING_LENGTH = 4000;
const MAX_ARRAY_ITEMS = 50;

const SENSITIVE_KEY_PATTERNS = [
  /^authorization$/i,
  /^proxy-authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /^x-api-key$/i,
  /^api[-_]?key$/i,
  /^client[-_]?secret$/i,
  /^secret$/i,
  /^secret[-_]?sign$/i,
  /^pass(word)?$/i,
  /^passwd$/i,
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /private[-_]?key/i,
  /signature/i,
  /file[-_]?base64/i,
  /^base64$/i,
];

type JsonLogOptions = {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: 'stdout' | 'stderr';
  errorStack?: unknown;
};

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug';

const originalConsole: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>> = {};
let consoleBridgeInstalled = false;

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return defaultValue;
}

function parseLogLevels(value: string | undefined, debugEnabled: boolean): LogLevel[] {
  if (!value?.trim()) return debugEnabled ? DEBUG_LOG_LEVELS : DEFAULT_LOG_LEVELS;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'all') return DEBUG_LOG_LEVELS;

  const levels = normalized
    .split(',')
    .map((level) => level.trim())
    .filter((level): level is LogLevel => VALID_LOG_LEVELS.has(level as LogLevel));

  return levels.length > 0 ? levels : debugEnabled ? DEBUG_LOG_LEVELS : DEFAULT_LOG_LEVELS;
}

function getActiveOtelTraceContext(): { traceId?: string; spanId?: string } {
  const spanContext = trace.getSpan(otelContext.active())?.spanContext();

  return {
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
  };
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function truncateLogString(value: string): string {
  if (value.length <= MAX_LOG_STRING_LENGTH) return value;

  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}... [TRUNCATED:${value.length}]`;
}

function redactSql(value: string): string {
  const hasSqlStatement = /\b(select|insert|update|delete|merge)\b/i.test(value) &&
    /\b(from|where|values|join|set)\b/i.test(value);
  const hasSqlFragment = /^\s*(inner|left|right|full|cross)?\s*join\b/i.test(value) ||
    /^\s*where\b/i.test(value);

  if (!hasSqlStatement && !hasSqlFragment) return value;

  return value.replace(/\b(select|insert|update|delete|merge)\b[\s\S]*/i, REDACTED_SQL)
    .replace(/^\s*(inner|left|right|full|cross)?\s*join\b[\s\S]*/i, REDACTED_SQL)
    .replace(/^\s*where\b[\s\S]*/i, REDACTED_SQL);
}

function redactSensitiveString(value: string): string {
  let redacted = value;

  redacted = redacted.replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,"'}]+/gi, `$1${REDACTED}`);
  redacted = redacted.replace(/(bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, `$1${REDACTED}`);
  redacted = redacted.replace(/(basic\s+)[A-Za-z0-9+/=:_-]{10,}/gi, `$1${REDACTED}`);
  redacted = redacted.replace(
    /([?&](?:access_token|accessToken|refresh_token|refreshToken|id_token|idToken|token|client_secret|clientSecret|password|secret|api_key|apiKey|x-api-key|authorization)=)([^&\s]+)/gi,
    (match, prefix, sensitiveValue) => String(sensitiveValue).includes(REDACTED) ? match : `${prefix}${REDACTED}`,
  );
  redacted = redacted.replace(
    /(["']?(?:access_token|accessToken|refresh_token|refreshToken|id_token|idToken|token|client_secret|clientSecret|password|passwd|secret|secretSign|api_key|apiKey|x-api-key|authorization|cookie|set-cookie|jwt)["']?\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,;}\]]+)/gi,
    (match, prefix, sensitiveValue) => {
      const rawValue = String(sensitiveValue);
      if (rawValue.includes(REDACTED) || rawValue.includes('[REDACTED')) return match;

      const quote = rawValue.startsWith('"') ? '"' : rawValue.startsWith("'") ? "'" : '';
      return `${prefix}${quote}${REDACTED}${quote}`;
    },
  );
  redacted = redacted.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, REDACTED);
  redacted = redacted.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  redacted = redacted.replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/g, `data:${REDACTED}`);
  redacted = redactSql(redacted);

  return truncateLogString(redacted);
}

function redactSensitiveValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactSensitiveString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (value === null || value === undefined || typeof value !== 'object') return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveString(value.message),
      stack: value.stack ? redactSensitiveString(value.stack) : undefined,
    };
  }

  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer length=${value.length}]`;
  if (value instanceof Uint8Array) return `[Uint8Array length=${value.byteLength}]`;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactSensitiveValue(item, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[TRUNCATED:${value.length - MAX_ARRAY_ITEMS}]`);
    }
    return items;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redactSensitiveValue(nestedValue, seen);
  }

  return output;
}

function formatConsoleValue(value: unknown): string {
  const redactedValue = redactSensitiveValue(value);

  if (typeof redactedValue === 'string') return redactedValue;
  if (redactedValue === undefined) return 'undefined';

  try {
    const json = JSON.stringify(redactedValue);
    if (json !== undefined) return json;
  } catch {
    // Fall back to inspect for circular objects.
  }

  return redactSensitiveString(
    inspect(redactedValue, { depth: 5, compact: true, breakLength: Infinity, colors: false }),
  );
}

function toConsoleMessage(args: unknown[]): string {
  if (args.length === 0) return '';

  return args.map(formatConsoleValue).join(' ');
}

function findStack(args: unknown[]): string | undefined {
  const error = args.find((arg): arg is Error => arg instanceof Error);

  return error?.stack ? redactSensitiveString(error.stack) : undefined;
}

function getSeverity(logLevel: LogLevel): string {
  if (logLevel === 'log') return 'info';
  if (logLevel === 'verbose') return 'trace';

  return logLevel;
}

function formatResponseTime(responseTimeMs: number | undefined): string | null {
  if (responseTimeMs === undefined) return null;

  return `${(responseTimeMs / 1000).toFixed(2)} s`;
}

export class AppJsonLogger extends ConsoleLogger {
  private redactOptionalParams(optionalParams: any[]): any[] {
    return optionalParams.map((param) => redactSensitiveValue(param));
  }

  log(message: any, ...optionalParams: any[]): void {
    super.log(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  error(message: any, ...optionalParams: any[]): void {
    super.error(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  warn(message: any, ...optionalParams: any[]): void {
    super.warn(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  debug(message: any, ...optionalParams: any[]): void {
    super.debug(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  verbose(message: any, ...optionalParams: any[]): void {
    super.verbose(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  fatal(message: any, ...optionalParams: any[]): void {
    super.fatal(redactSensitiveValue(message), ...this.redactOptionalParams(optionalParams));
  }

  protected getJsonLogObject(message: unknown, options: JsonLogOptions) {
    const baseLogObject = super.getJsonLogObject(message, options);
    const logObject = redactSensitiveValue(baseLogObject) as typeof baseLogObject;
    const activeTraceContext = getActiveOtelTraceContext();
    const responseTimeMs = RequestContext.getResponseTimeMs();
    const path = RequestContext.getPath() || RequestContext.getRoute() || null;

    return {
      ...logObject,
      severity: getSeverity(options.logLevel),
      traceId: RequestContext.getTraceId() || activeTraceContext.traceId || null,
      spanId: RequestContext.getSpanId() || activeTraceContext.spanId || null,
      method: RequestContext.getMethod() || null,
      path,
      apiPath: path,
      route: RequestContext.getRoute() || null,
      statusCode: RequestContext.getStatusCode() ?? null,
      responseTimeMs: responseTimeMs ?? null,
      responseTime: formatResponseTime(responseTimeMs),
    };
  }
}

export function createAppLogger(): AppJsonLogger {
  const debugEnabled = parseBoolean(process.env.LOG_DEBUG, false);
  const options: ConsoleLoggerOptions = {
    logLevels: parseLogLevels(process.env.LOG_LEVELS, debugEnabled),
    json: parseBoolean(process.env.LOG_JSON, true),
    context: process.env.LOG_CONTEXT?.trim() || 'BE_VPS_UAT',
  };

  return new AppJsonLogger(options);
}

export function shouldPatchConsole(): boolean {
  return parseBoolean(process.env.LOG_PATCH_CONSOLE, parseBoolean(process.env.LOG_JSON, true));
}

export function installConsoleLoggerBridge(logger: AppJsonLogger): void {
  if (consoleBridgeInstalled) return;

  consoleBridgeInstalled = true;

  for (const method of ['log', 'info', 'warn', 'error', 'debug'] as ConsoleMethod[]) {
    originalConsole[method] = console[method].bind(console);
  }

  console.log = (...args: unknown[]) => logger.log(toConsoleMessage(args), 'Console');
  console.info = (...args: unknown[]) => logger.log(toConsoleMessage(args), 'Console');
  console.warn = (...args: unknown[]) => logger.warn(toConsoleMessage(args), 'Console');
  console.debug = (...args: unknown[]) => logger.debug(toConsoleMessage(args), 'Console');
  console.error = (...args: unknown[]) => {
    logger.error(toConsoleMessage(args), findStack(args), 'Console');
  };
}
