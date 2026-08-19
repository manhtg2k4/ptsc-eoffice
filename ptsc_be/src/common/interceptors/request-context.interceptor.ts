import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContext } from '../context/request-context';

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    const userId = user?.userId || user?.id;
    const traceId = request?.traceId || firstHeaderValue(request?.headers?.['x-trace-id']);
    const spanId = request?.spanId || firstHeaderValue(request?.headers?.['x-span-id']);

    return new Observable((observer) => {
      RequestContext.run({ traceId, spanId, userId, user }, () => {
        const subscription = next.handle().subscribe({
          next: (val) => observer.next(val),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
        return () => subscription.unsubscribe();
      });
    });
  }
}
