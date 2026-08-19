type OpenTelemetrySdk = {
  start(): void;
  shutdown(): Promise<void>;
};

type OpenTelemetryModules = {
  diag: any;
  DiagConsoleLogger: new () => any;
  DiagLogLevel: Record<string, number>;
  getNodeAutoInstrumentations: (config?: Record<string, unknown>) => unknown[];
  OTLPTraceExporter: new () => any;
  NodeSDK: new (config: Record<string, unknown>) => OpenTelemetrySdk;
};

function envFlag(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return undefined;
}

function getDiagLogLevel(DiagLogLevel: Record<string, number>): number | undefined {
  const level = process.env.OTEL_DIAG_LOG_LEVEL?.trim().toUpperCase();

  switch (level) {
    case 'ALL':
      return DiagLogLevel.ALL;
    case 'DEBUG':
      return DiagLogLevel.DEBUG;
    case 'INFO':
      return DiagLogLevel.INFO;
    case 'WARN':
      return DiagLogLevel.WARN;
    case 'ERROR':
      return DiagLogLevel.ERROR;
    case 'NONE':
      return DiagLogLevel.NONE;
    default:
      return undefined;
  }
}

function loadOpenTelemetry(): OpenTelemetryModules | undefined {
  try {
    const api = require('@opentelemetry/api');
    const autoInstrumentations = require('@opentelemetry/auto-instrumentations-node');
    const exporter = require('@opentelemetry/exporter-trace-otlp-http');
    const sdkNode = require('@opentelemetry/sdk-node');

    return {
      diag: api.diag,
      DiagConsoleLogger: api.DiagConsoleLogger,
      DiagLogLevel: api.DiagLogLevel,
      getNodeAutoInstrumentations: autoInstrumentations.getNodeAutoInstrumentations,
      OTLPTraceExporter: exporter.OTLPTraceExporter,
      NodeSDK: sdkNode.NodeSDK,
    };
  } catch (error: any) {
    console.error(
      '[OTEL] tracing requested but OpenTelemetry packages are missing. Run npm install with package.json/package-lock.json updated.',
      error?.message || error,
    );
    return undefined;
  }
}

const tracingEnabled = process.env.OTEL_ENABLED?.trim().toLowerCase() === 'true';

let sdk: OpenTelemetrySdk | undefined;
let shuttingDown = false;

if (tracingEnabled) {
  const otel = loadOpenTelemetry();

  if (otel) {
    const diagLogLevel = getDiagLogLevel(otel.DiagLogLevel);
    if (diagLogLevel !== undefined) {
      otel.diag.setLogger(new otel.DiagConsoleLogger(), diagLogLevel);
    }

    sdk = new otel.NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME || 'be-tthc',
      traceExporter: new otel.OTLPTraceExporter(),
      instrumentations: [
        otel.getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: envFlag(process.env.OTEL_ENABLE_FS_INSTRUMENTATION) === true,
          },
        }),
      ],
    });

    sdk.start();

    console.log(
      `[OTEL] tracing enabled: service=${process.env.OTEL_SERVICE_NAME || 'be-tthc'}, endpoint=${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'default'}`,
    );
  }
} else {
  console.log('[OTEL] tracing disabled. Set OTEL_ENABLED=true and OTEL_EXPORTER_OTLP_ENDPOINT to enable.');
}

async function shutdownTracing(signal: NodeJS.Signals): Promise<void> {
  if (!sdk || shuttingDown) {
    process.exit(0);
  }

  shuttingDown = true;

  try {
    await sdk.shutdown();
    console.log(`[OTEL] tracing shutdown complete after ${signal}`);
  } catch (error: any) {
    console.error('[OTEL] tracing shutdown failed:', error?.message || error);
  } finally {
    process.exit(0);
  }
}

if (sdk) {
  process.once('SIGTERM', () => void shutdownTracing('SIGTERM'));
  process.once('SIGINT', () => void shutdownTracing('SIGINT'));
}
