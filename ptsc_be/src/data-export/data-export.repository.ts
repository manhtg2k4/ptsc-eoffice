/**
 * ============================================================
 * FILE 7/10: data-export.repository.ts
 *
 * Chịu trách nhiệm DUY NHẤT: truy vấn DB để lấy cấu hình cột.
 * Không có logic export ở đây.
 *
 * Hai nguồn cấu hình cột:
 *  1. TableConfig   → user's custom column order (ưu tiên)
 *  2. FeatureManagement → default column config
 *  3. ViewConfig    → dùng cho export từ chi tiết (viewConfigCode)
 * ============================================================
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { TableConfigEntity } from 'src/table-config/table-config.entity';
import { ViewConfigEntity } from 'src/view-config/entities/view-config.entity';

import {
  IColumnConfig,
  IColumnConfigResult,
  IDefaultApiMapping,
} from './interfaces/data-export.interface';

@Injectable()
export class DataExportRepository {
  private readonly logger = new Logger(DataExportRepository.name);

  /**
   * Fallback mapping: processFn → apiUrl.
   * Dùng khi không tìm thấy trong FeatureManagement DB.
   */
  private readonly defaultApiMappings: IDefaultApiMapping = {
    topicList:        'topic/list',
    dsChuDe:          'topic/list',
    albumList:        'album-images/list',
    dshinhanh:        'album-images/list',
    videoList:        'videos/list',
    dsvideott:        'videos/list',
    projectList:      'project/list',
    dsHoChieu:        'passports/list',
    dshochieu:        'passports/list',
    requestPassport:  'passport-requests/list',
  };

  constructor(
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,

    @InjectRepository(ViewConfigEntity, 'mssqlConnection')
    private readonly viewConfigRepo: Repository<ViewConfigEntity>,

    @InjectRepository(TableConfigEntity, 'mssqlConnection')
    private readonly tableConfigRepo: Repository<TableConfigEntity>,
  ) {}

  // ─── API URL resolution ───────────────────────────────────────────────────

  /**
   * Lấy apiUrl từ FeatureManagement, fallback về defaultApiMappings.
   * Trả về null nếu không tìm thấy.
   */
  async getApiUrlByProcessFn(processFn: string): Promise<string | null> {
    try {
      const feature = await this.featureManagementRepo.findOne({ where: { code: processFn } });
      if (feature?.apiUrl) return feature.apiUrl;

      const fallback = this.defaultApiMappings[processFn];
      if (fallback) {
        this.logger.warn(`processFn="${processFn}" not in DB, using fallback: ${fallback}`);
        return fallback;
      }

      this.logger.warn(`No apiUrl found for processFn: ${processFn}`);
      return null;
    } catch (err) {
      this.logger.error(`getApiUrlByProcessFn error for "${processFn}"`, err);
      return null;
    }
  }

  /**
   * Lấy apiUrlChildren từ FeatureManagement cho fetch children.
   * Nếu apiUrlChildren không có, fallback về apiUrl.
   * Trả về null nếu không tìm thấy cả hai.
   */
  async getApiUrlChildrenByProcessFn(processFn: string): Promise<string | null> {
    try {
      const feature = await this.featureManagementRepo.findOne({ where: { code: processFn } });
      if (feature?.apiUrlChildren) return feature.apiUrlChildren;
      if (feature?.apiUrl) return feature.apiUrl;

      const fallback = this.defaultApiMappings[processFn];
      if (fallback) {
        this.logger.warn(`processFn="${processFn}" not in DB, using fallback: ${fallback}`);
        return fallback;
      }

      this.logger.warn(`No apiUrlChildren/apiUrl found for processFn: ${processFn}`);
      return null;
    } catch (err) {
      this.logger.error(`getApiUrlChildrenByProcessFn error for "${processFn}"`, err);
      return null;
    }
  }

  /**
   * Lấy toàn bộ thông tin FeatureManagement cho processFn.
   * Dùng để lấy cả apiUrl lẫn valueField trong một lần query.
   */
  async getFeatureByProcessFn(processFn: string): Promise<FeatureManagementEntity | null> {
    try {
      return await this.featureManagementRepo.findOne({ where: { code: processFn } });
    } catch {
      return null;
    }
  }

  // ─── Column config resolution ─────────────────────────────────────────────

  /**
   * Lấy column config cho processFn.
   * Thứ tự ưu tiên: TableConfig (user custom) → FeatureManagement (default)
   */
  async getColumnsByProcessFn(processFn: string, userId: string): Promise<IColumnConfigResult> {
    const fromTable = await this.getColumnsByTableConfig(processFn, userId);
    if (fromTable) {
      return fromTable;
    }

    return this.getColumnsByFeatureManagement(processFn);
  }

  /**
   * Lấy column config từ ViewConfig (dùng cho export từ chi tiết).
   * @throws BadRequestException nếu không tìm thấy hoặc không có cột
   */
  async getColumnsByViewConfig(viewConfigCode: string): Promise<IColumnConfigResult> {
    let viewConfig = await this.viewConfigRepo.findOne({ where: { code: viewConfigCode } });
    const normalizedCode = viewConfigCode.trim().toUpperCase();

    if (!viewConfig && normalizedCode === 'AUDIO_TRANSCRIPT') {
      // Fallback cho Audio Transcript (không cần cấu hình cột phức tạp vì xuất Word toàn văn)
      return {
        columns: [{ key: 'transcriptText', header: 'Nội dung ghi âm', width: 50 }],
        nameOfList: 'Nội dung ghi âm cuộc họp',
        source: 'view_configs',
      };
    }

    if (!viewConfig) {
      throw new BadRequestException(`Không tìm thấy ViewConfig: ${viewConfigCode}`);
    }

    const nameOfList = viewConfig.name?.trim() || viewConfigCode;

    let parsedField: any;
    if (typeof viewConfig.field === 'string') {
      try { parsedField = JSON.parse(viewConfig.field); }
      catch { throw new BadRequestException(`ViewConfig.field không hợp lệ: ${viewConfigCode}`); }
    } else {
      parsedField = viewConfig.field;
    }

    const fields = Array.isArray(parsedField) ? parsedField : (parsedField?.field ?? []);
    if (!fields.length) throw new BadRequestException(`ViewConfig không có cột: ${viewConfigCode}`);

    const columns = this.normalizeColumns(fields);
    if (!columns.length) throw new BadRequestException(`Tất cả cột bị ẩn: ${viewConfigCode}`);

    return { columns, nameOfList, source: 'view_configs' };
  }

  /** Thêm custom default mapping từ bên ngoài (dùng trong module khác) */
  addDefaultApiMapping(processFn: string, apiUrl: string): void {
    this.defaultApiMappings[processFn] = apiUrl;
  }

  getDefaultApiMappings(): IDefaultApiMapping {
    return { ...this.defaultApiMappings };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getColumnsByTableConfig(
    processFn: string,
    userId: string,
  ): Promise<IColumnConfigResult | null> {
    try {
      const tableConfig = await this.tableConfigRepo.findOne({
        where: { module: processFn, owner: userId },
      });

      if (!tableConfig?.columns?.length) return null;

      const columns = this.normalizeColumns(tableConfig.columns);
      // nameOfList sẽ được resolve ở bước sau khi cần; tạm dùng processFn
      return { columns, nameOfList: processFn, source: 'table_configs' };
    } catch (err) {
      this.logger.error(`getColumnsByTableConfig error for "${processFn}"`, err);
      return null;
    }
  }

  private async getColumnsByFeatureManagement(processFn: string): Promise<IColumnConfigResult> {
    const feature = await this.featureManagementRepo.findOne({ where: { code: processFn } });

    if (!feature) {
      throw new BadRequestException(`FeatureManagement không có "${processFn}"`);
    }

    const nameOfList = this.resolveExportName(feature.name);

    let parsedValueField: any;
    if (typeof feature.valueField === 'string') {
      try { parsedValueField = JSON.parse(feature.valueField); }
      catch { throw new BadRequestException(`valueField không hợp lệ cho "${processFn}"`); }
    } else {
      parsedValueField = feature.valueField;
    }

    const fields = parsedValueField?.field ?? [];
    if (!fields.length) throw new BadRequestException(`Không có cột cho "${processFn}"`);

    const columns = this.normalizeColumns(fields);
    if (!columns.length) throw new BadRequestException(`Tất cả cột bị ẩn: "${processFn}"`);

    return { columns, nameOfList, source: 'feature_management' };
  }

  /**
   * Chuẩn hóa fields từ DB thành IColumnConfig[].
   * - Lọc isShow === false
   * - Deduplicate theo key
   * - Tính width (px / 6, min 5)
   */
  private normalizeColumns(fields: any[]): IColumnConfig[] {
    return fields
      .filter(f => f?.hidden !== true && f?.isShow !== false)
      .map(f => ({
        key:        f.key || f.name,
        header:     f.label || f.name,
        type:       f.type,
        valueInput: f.valueInput,
        format:     f.format,
        width:      f.width ? Math.max(5, Math.round(parseInt(f.width as any, 10) / 6)) : 1,
        isShow:     f.hidden !== true && f.isShow !== false,
      }))
      // Deduplicate by key — keep first occurrence
      .filter((col, idx, arr) => arr.findIndex(c => c.key === col.key) === idx);
  }

  /**
   * Loại bỏ hậu tố phân quyền khỏi tên danh sách.
   * Vd: "Danh sách văn bản đến GD" → "Danh sách văn bản đến"
   */
  private resolveExportName(featureName?: string): string {
    return (featureName?.trim() ?? '')
      .replace(/\s+(GD|TP|CB|VT|VTC|VTP|C|XL)\s*$/i, '')
      .trim();
  }
}