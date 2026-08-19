import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { RedisOptions } from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private pubClient: Redis;
  private subClient: Redis;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.appContext.get(ConfigService);
    const redisOptions: RedisOptions = {
      host: configService.get<string>('REDIS_HOST') || 'localhost',
      port: Number(configService.get<string>('REDIS_PORT') || 6379),
      password: configService.get<string>('REDIS_PASSWORD') || undefined,
      db: Number(configService.get<string>('REDIS_DB') || 0),
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    };

    this.pubClient = new Redis(redisOptions);
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

    this.adapterConstructor = createAdapter(this.pubClient, this.subClient, {
      key: configService.get<string>('SOCKET_REDIS_KEY') || 'socket.io',
    });

    this.logger.log(
      `Socket.IO Redis adapter connected: ${redisOptions.host}:${redisOptions.port}/${redisOptions.db}`,
    );
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
