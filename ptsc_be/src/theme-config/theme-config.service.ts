import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeConfigEntity, CustomThemeEntity } from './theme-config.entity';
import { CreateCustomThemeDto } from './create-custom-theme.dto';
import { UpdateCustomThemeDto } from './update-custom-theme.dto';
const deepmerge = require('lodash.merge');

@Injectable()
export class ThemeConfigService {
  private readonly logger = new Logger(ThemeConfigService.name);
  private readonly configKey = 'main_theme';

  constructor(
    @InjectRepository(ThemeConfigEntity, 'mssqlConnection')
    private themeConfigRepo: Repository<ThemeConfigEntity>,
    @InjectRepository(CustomThemeEntity, 'mssqlConnection')
    private customThemeRepo: Repository<CustomThemeEntity>,
  ) {}

  private cleanCustomThemeOptions(options: Record<string, any>): Record<string, any> {
    const cleanedOptions = deepmerge({}, options);
    const excludedPaths = [
      'app.logoText',
      'app.logoImage',
      'app.logoTab',
      'palette.sidebar.backgroundImage',
      'palette.navbar.backgroundImage',
      'palette.footer.backgroundImage',
    ];

    excludedPaths.forEach(path => {
      const keys = path.split('.');
      let current: any = cleanedOptions;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current && typeof current === 'object' && current.hasOwnProperty(keys[i])) {
          current = current[keys[i]];
        } else {
          current = null;
          break;
        }
      }
      if (current && typeof current === 'object' && current.hasOwnProperty(keys[keys.length - 1])) {
        delete current[keys[keys.length - 1]];
      }
    });

    return cleanedOptions;
  }

  async getConfig() {
    let configDoc = await this.themeConfigRepo.findOne({ where: { configKey: this.configKey } });

    const defaultConfig = {
      mode: 'light',
      app: {
        logoText: '',
        logoImage: null,
        logoTab: null,
        description: null,
      },
      palette: {},
    };

    if (configDoc) {
      const fullConfig = deepmerge({}, defaultConfig, configDoc.options);
      return fullConfig;
    }

    const newConfig = this.themeConfigRepo.create({
      configKey: this.configKey,
      options: defaultConfig,
    });
    await this.themeConfigRepo.save(newConfig);

    return newConfig.options;
  }

  async updateConfig(newOptions: any) {
    if (!newOptions || Object.keys(newOptions).length === 0) {
      this.logger.warn('Không có dữ liệu để cập nhật.');
      return this.getConfig();
    }

    let existingConfig = await this.themeConfigRepo.findOne({ where: { configKey: this.configKey } });
    const existingOptions = existingConfig ? existingConfig.options : {};
    const mergedOptions = deepmerge(existingOptions, newOptions);

    if (existingConfig) {
      existingConfig.options = mergedOptions;
      await this.themeConfigRepo.save(existingConfig);
    } else {
      existingConfig = this.themeConfigRepo.create({
        configKey: this.configKey,
        options: mergedOptions,
      });
      await this.themeConfigRepo.save(existingConfig);
    }

    return existingConfig.options;
  }

  async deleteConfig() {
    await this.themeConfigRepo.delete({ configKey: this.configKey });
    return { message: 'Theme config reset successfully' };
  }

  async createCustomTheme(userId: string, createDto: CreateCustomThemeDto) {
    const cleanedOptions = createDto.options;
    const newCustomTheme = this.customThemeRepo.create({
      name: createDto.name,
      createdBy: userId,
      options: cleanedOptions,
      isDefault: false,
      status: 1,
    });
    return this.customThemeRepo.save(newCustomTheme);
  }

  async getCustomThemes(userId: string) {
    return this.customThemeRepo.find({ where: { createdBy: userId, status: 1 } });
  }

  async getCustomThemeById(themeId: string, userId: string) {
    const theme = await this.customThemeRepo.findOne({ where: { id: themeId, createdBy: userId, status: 1 } });
    if (!theme) {
      throw new Error('Custom theme not found or you do not have permission.');
    }
    return theme;
  }

  async updateCustomTheme(themeId: string, userId: string, updateDto: UpdateCustomThemeDto) {
    
    const existingTheme = await this.customThemeRepo.findOne({ where: { id: themeId, createdBy: userId, status: 1 } });
    if (!existingTheme) {
      throw new Error('Custom theme not found or you do not have permission to update.');
    }

    if (updateDto.name) {
      existingTheme.name = updateDto.name;
    }
    if (updateDto.options) {
      existingTheme.options = updateDto.options;
    }

    return this.customThemeRepo.save(existingTheme);
  }

  async deleteCustomTheme(themeId: string, userId: string) {
    const result = await this.customThemeRepo.update(
      { id: themeId, createdBy: userId, status: 1 },
      { status: 3 },
    );

    if (result.affected === 0) {
      throw new Error('Custom theme not found or you do not have permission to delete.');
    }
    return { message: 'Custom theme deleted successfully' };
  }
}
