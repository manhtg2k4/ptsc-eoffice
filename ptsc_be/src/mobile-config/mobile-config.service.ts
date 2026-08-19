import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateMobileAppVersionConfigDto } from './dto/update-mobile-app-version-config.dto';
import {
  MobileAppVersionConfigEntity,
  MobilePlatform,
} from './entities/mobile-app-version-config.entity';

export type MobileAppVersionConfigResponse = {
  version: string | null;
  buildNumber: number | null;
  updateUrl: string | null;
  forceUpdate: boolean;
};

const emptyConfig = (): MobileAppVersionConfigResponse => ({
  version: null,
  buildNumber: null,
  updateUrl: null,
  forceUpdate: false,
});

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const toNumberValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeConfig = (
  value: unknown,
): MobileAppVersionConfigResponse | null => {
  if (!value || typeof value !== 'object') return null;

  const config = value as Record<string, unknown>;
  return {
    version: toStringValue(config.version),
    buildNumber: toNumberValue(config.buildNumber),
    updateUrl: toStringValue(config.updateUrl),
    forceUpdate: toBooleanValue(config.forceUpdate),
  };
};

@Injectable()
export class MobileConfigService {
  constructor(
    @InjectRepository(MobileAppVersionConfigEntity, 'mssqlConnection')
    private readonly appVersionConfigRepo: Repository<MobileAppVersionConfigEntity>,
  ) {}

  normalizePlatform(platform?: string, useDefault = true): MobilePlatform {
    const normalized = platform?.trim().toLowerCase();

    if (!normalized && useDefault) return 'android';
    if (normalized === 'android' || normalized === 'ios') return normalized;

    throw new BadRequestException('Config cho hệ điều hành android hoặc ios');
  }

  async findAllAppVersionConfigs(): Promise<MobileAppVersionConfigEntity[]> {
    return this.appVersionConfigRepo.find({
      order: { platform: 'ASC' },
    });
  }

  async getAppVersionConfig(
    platform?: string,
  ): Promise<MobileAppVersionConfigResponse> {
    const normalizedPlatform = this.normalizePlatform(platform);
    const config = await this.appVersionConfigRepo.findOne({
      where: { platform: normalizedPlatform },
    });

    if (config) return this.toResponse(config);

    return this.getEnvFallbackConfig(normalizedPlatform) ?? emptyConfig();
  }

  async updateAppVersionConfig(
    platform: string,
    dto: UpdateMobileAppVersionConfigDto,
  ): Promise<MobileAppVersionConfigEntity> {
    const normalizedPlatform = this.normalizePlatform(platform, false);
    let config = await this.appVersionConfigRepo.findOne({
      where: { platform: normalizedPlatform },
    });

    if (!config) {
      config = this.appVersionConfigRepo.create({
        platform: normalizedPlatform,
        forceUpdate: false,
      });
    }

    if (dto.version !== undefined) config.version = toStringValue(dto.version);
    if (dto.buildNumber !== undefined) {
      config.buildNumber = toNumberValue(dto.buildNumber);
    }
    if (dto.updateUrl !== undefined)
      config.updateUrl = toStringValue(dto.updateUrl);
    if (dto.forceUpdate !== undefined) config.forceUpdate = dto.forceUpdate;

    return this.appVersionConfigRepo.save(config);
  }

  private toResponse(
    config: MobileAppVersionConfigEntity,
  ): MobileAppVersionConfigResponse {
    return {
      version: config.version,
      buildNumber: config.buildNumber,
      updateUrl: config.updateUrl,
      forceUpdate: Boolean(config.forceUpdate),
    };
  }

  private getEnvFallbackConfig(
    platform: MobilePlatform,
  ): MobileAppVersionConfigResponse | null {
    const rawConfig = toStringValue(process.env.MOBILE_APP_VERSION_CONFIG);

    if (rawConfig) {
      try {
        const configByPlatform = JSON.parse(rawConfig) as Record<
          string,
          unknown
        >;
        const platformConfig = normalizeConfig(configByPlatform[platform]);
        if (platformConfig) return platformConfig;
      } catch {
        return null;
      }
    }

    const commonConfig = normalizeConfig({
      version: process.env.MOBILE_APP_VERSION,
      buildNumber: process.env.MOBILE_APP_BUILD_NUMBER,
      updateUrl: process.env.MOBILE_APP_UPDATE_URL,
      forceUpdate: process.env.MOBILE_APP_FORCE_UPDATE,
    });

    if (!commonConfig?.version && commonConfig?.buildNumber === null)
      return null;
    return commonConfig;
  }
}
