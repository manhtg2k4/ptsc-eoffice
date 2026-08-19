import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorResponseBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

const TECHNICAL_ERROR_PATTERNS = [
  /\b(TypeError|ReferenceError|SyntaxError|RangeError|AxiosError)\b/i,
  /\b(ENOENT|EACCES|EPERM|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EPIPE)\b/i,
  /\b(MSSQL|SQL Server|RequestError|Tedious|MinIO|S3Error)\b/i,
  /\bCannot\s+(read|set|access|convert)\b/i,
  /\bundefined|null\b/i,
  /\bat\s+.+\.(ts|js):\d+:\d+/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|MERGE)\b/i,
  /\bduplicate key|foreign key|constraint|timeout|socket|certificate\b/i,
];

@Catch()
export class FilesApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FilesApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      this.logger.error(
        `[files-api] Error after headers sent: ${this.getLogMessage(exception)}`,
        this.getStack(exception),
      );
      return;
    }

    const status = this.getStatus(exception);
    const rawMessage = this.getRawMessage(exception);
    const message = this.toClientMessage(status, rawMessage);

    this.logger.error(
      `[files-api] ${request.method} ${request.originalUrl || request.url} failed: ${this.getLogMessage(exception)}`,
      this.getStack(exception),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      // path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getRawMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const body = exception.getResponse() as string | ErrorResponseBody;
      if (typeof body === 'string') return body;
      if (Array.isArray(body?.message)) return body.message.join('; ');
      if (body?.message) return String(body.message);
      if (body?.error) return String(body.error);
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return String(exception || '');
  }

  private toClientMessage(status: number, rawMessage: string): string {
    const normalized = String(rawMessage || '').trim();
    if (normalized && !this.isTechnicalMessage(normalized)) {
      return normalized;
    }

    if (status === HttpStatus.UNAUTHORIZED) return 'Phien dang nhap khong hop le hoac da het han';
    if (status === HttpStatus.FORBIDDEN) return 'Ban khong co quyen thao tac voi tep tin nay';
    if (status === HttpStatus.NOT_FOUND) return 'Khong tim thay tep tin';
    if (status === HttpStatus.CONFLICT) return 'Tep tin dang o trang thai khong the xu ly';
    if (status >= 400 && status < 500) return normalized || 'Yeu cau tep tin khong hop le';
    return 'Khong the xu ly tep tin luc nay';
  }

  private isTechnicalMessage(message: string): boolean {
    return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message));
  }

  private getLogMessage(exception: unknown): string {
    if (exception instanceof Error) return exception.message;
    try {
      return JSON.stringify(exception);
    } catch {
      return String(exception);
    }
  }

  private getStack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}
