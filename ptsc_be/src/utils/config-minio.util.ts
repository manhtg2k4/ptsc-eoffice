import { Injectable, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export interface MinioConfig {
  active_type?: string;
  fs_base_path?: string;
  minio_endpoint?: string;
  minio_access_key?: string;
  minio_secret_key?: string;
  minio_bucket?: string;
}

@Injectable()
export class MinioConfigService {
  private storageConfigService: any;

  constructor(private readonly moduleRef: ModuleRef) {}

  async getMinioConfig(): Promise<MinioConfig> {
    const useEnv = process.env.CONFIG_MINIO_FROM_ENV === 'true';
    if (useEnv) {
      return {
        active_type: process.env.ACTIVE_TYPE,
        minio_endpoint: process.env.MINIO_ENDPOINT,
        minio_access_key: process.env.MINIO_ACCESS_KEY,
        minio_secret_key: process.env.MINIO_SECRET_KEY,
        minio_bucket: process.env.MINIO_BUCKET,
        fs_base_path: process.env.FS_BASE_PATH,
      };
    } 

    // Lazy load StorageConfigService dynamically to avoid static circular import dependencies
    // if (!this.storageConfigService) {
    //   const { StorageConfigService } = await import('../storage-config/storage-config.service');
    //   this.storageConfigService = this.moduleRef.get(StorageConfigService, { strict: false });
    // }

    // const dbConfig = await this.storageConfigService.getConfig();
    // return {
    //   active_type: dbConfig.active_type as 'filesystem' | 'minio',
    //   fs_base_path: dbConfig.fs_base_path,
    //   minio_endpoint: dbConfig.minio_endpoint,
    //   minio_access_key: dbConfig.minio_access_key,
    //   minio_secret_key: dbConfig.minio_secret_key,
    //   minio_bucket: dbConfig.minio_bucket,
    // };

    return {
      active_type: process.env.ACTIVE_TYPE,
      minio_endpoint: process.env.MINIO_ENDPOINT,
      minio_access_key: process.env.MINIO_ACCESS_KEY,
      minio_secret_key: process.env.MINIO_SECRET_KEY,
      minio_bucket: process.env.MINIO_BUCKET,
      fs_base_path: process.env.FS_BASE_PATH,
    };
  }
}

@Module({
  providers: [MinioConfigService],
  exports: [MinioConfigService],
})
export class MinioConfigModule {}
