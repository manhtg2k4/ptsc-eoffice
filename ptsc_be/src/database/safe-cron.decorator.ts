import { Cron, CronOptions } from '@nestjs/schedule';

function isTruthy(value?: string): boolean {
  return ['true', '1', 'yes', 'on'].includes(
    (value || '').trim().toLowerCase(),
  );
}

function isCronDisabled(): boolean {
  return isTruthy(process.env.DISABLE_CRON);
}

function isLogDebugEnabled(): boolean {
  return isTruthy(process.env.LOG_DEBUG);
}

function shouldSkipCronByInstance(): boolean {
  return !!process.env.HOSTNAME && process.env.HOSTNAME !== '0';
}

export function SafeCron(cronExpression: string, options?: CronOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    let isRunning = false;

    descriptor.value = async function (...args: any[]) {
      const cronName = `${target.constructor.name}.${propertyKey}`;
      const nodeAppInstance = process.env.HOSTNAME || 'undefined';
      const disableCron = process.env.DISABLE_CRON || 'false';

      if (isLogDebugEnabled()) {
        console.log(
          `[SafeCron] [${cronName}] HOSTNAME=${nodeAppInstance}, DISABLE_CRON=${disableCron}`,
        );
      }

      if (isCronDisabled()) {
        if (isLogDebugEnabled()) {
          console.warn(
            `[SafeCron] [${cronName}] DISABLE_CRON is enabled, skip cron.`,
          );
        }
        return;
      }

      // if (shouldSkipCronByInstance()) {
      //   console.warn(
      //     `[SafeCron] [${cronName}] HOSTNAME=${nodeAppInstance}, only instance 0 runs cron. Skip.`,
      //   );
      //   return;
      // }

      if (isRunning) {
        console.warn(
          `[SafeCron] [${cronName}] Previous run has not finished, skip this tick.`,
        );
        return;
      }

      isRunning = true;
      try {
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        console.error(
          `[SafeCron ERROR] Fatal error at [${cronName}]:`,
          error?.message || error,
        );
        if (error?.stack) {
          console.error(error.stack);
        }
      } finally {
        isRunning = false;
      }
    };

    if (options) {
      Cron(cronExpression, options)(target, propertyKey, descriptor);
    } else {
      Cron(cronExpression)(target, propertyKey, descriptor);
    }
  };
}
