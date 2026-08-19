import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';

import { ConfigurationDocument, Configuration } from 'src/view-config/configuration.schema';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { CreateAuthorityProcessDto } from './dto/authority-process.create.dto';
import { UpdateAuthorityProcessDto } from './dto/authority-process.update.dto';
import { ConnectionPool } from 'mssql';
import { SafeCron } from 'src/database/safe-cron.decorator';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import c from 'config';
import { validateAndParseSortParam, getDtoKeys, getEntityKeys } from 'src/utils/sort-validator.util';
import { AuthorityDocumentEntity } from './authority-process.entity';

export interface AuthorityDocumentSQL {
  id: string;
  author: string;
  authorized: string;
  startDate: Date;
  endDate: Date;
  originalEndDate?: Date;
  stage: string;
  status: string;
  files?: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AuthorityProcessService {
  private readonly logger = new Logger(AuthorityProcessService.name);
  constructor(
    @Inject('BPMN_RUNTIME') private readonly runtime: any,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementsRepo: Repository<FeatureManagementEntity>,
    @Inject('MSSQL_POOL') private readonly pool: ConnectionPool,
  ) { }

  async createAuthorityProcess(dto: CreateAuthorityProcessDto, userId: string) {
    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    // Validate ngày hợp lệ
    if (!dto.startDate || !dto.endDate)
      throw new BadRequestException('Vui lòng nhập ngày bắt đầu và kết thúc');

    // Convert string sang Date trước khi gửi xuống SQL Server
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start)
      throw new BadRequestException('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');

    // Validate người được ủy quyền
    if (!dto.authorized)
      throw new BadRequestException('Người được ủy quyền không hợp lệ');

    // Check conflict MSSQL repo
    const conflict = await this.runtime.repo.checkAuthorConflict(userId, start, end);
    if (conflict)
      throw new BadRequestException('Bạn không thể ủy quyền cho nhiều người cùng lúc trong khoảng thời gian này');

    const authorizedConflict = await this.runtime.repo.checkAuthorizedConflict(dto.authorized, start, end);
    if (authorizedConflict)
      throw new BadRequestException('Người này đã được ủy quyền khác trong khoảng thời gian này');

    const createDto = {
      authorized: dto.authorized,
      startDate: start,
      endDate: end,
      files: dto.files || [],
    };
    const created = await this.runtime.repo.createAuthority(createDto, userId);

    return created;
  }

  async getAuthorityProcessDetail(userId: string, id: string) {
    const detail = await this.runtime.repo.getAuthorityDetail(userId, id);
    return detail || null;
  }

  @SafeCron('*/5 * * * *')
  async handleExpiredAuthorities() {
    const updatedCount = await this.updateExpiredAuthorities();
  }

  async updateExpiredAuthorities(): Promise<number> {
    const expiredAuthorities = await this.runtime.repo.updateExpiredAuthorities()
    return expiredAuthorities;
  }

  async deleteAuthorityProcesses(ids: string[] | string) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (!idArray.length) throw new BadRequestException('Không có ID hợp lệ');

    const deletedCount = await this.runtime.repo.deleteAuthorityProcesses(idArray);
    return { status: true, message: `Xoá thành công ${deletedCount} bản ghi`, count: deletedCount };
  }

  async updateAuthorityProcess(id: string, dto: UpdateAuthorityProcessDto, userId: string) {
    if (!id) {
      throw new BadRequestException('ID ủy quyền không hợp lệ');
    }
    if (!userId) {
      throw new BadRequestException('Vui lòng cung cấp userId');
    }
    const current = await this.runtime.repo.getAuthorityDetail(userId, id);
    if (!current) {
      throw new BadRequestException('Ủy quyền không tồn tại');
    }
    if (current.stage !== '1') {
      throw new BadRequestException('Chỉ có thể cập nhật ủy quyền đang thực hiện');
    }
    const hasAnyField =
      dto.authorized !== undefined ||
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.files !== undefined ||
      dto.isForceEnd === true;
    if (!hasAnyField) {
      throw new BadRequestException('Không có dữ liệu nào để cập nhật');
    }
    if (dto.isForceEnd === true) {
      const updateData = {
        isForceEnd: true,
        endDate: new Date(),   // kết thúc ngay
      };

      const updated = await this.runtime.repo.updateAuthority(userId, id, updateData);

      return {
        status: true,
        message: 'Đã kết thúc ủy quyền',
        data: updated,
      };
    }
    const newAuthorized = dto.authorized !== undefined ? dto.authorized : current.authorized;
    const newStartDateStr = dto.startDate !== undefined ? dto.startDate : current.startDate;
    const newEndDateStr = dto.endDate !== undefined ? dto.endDate : current.endDate;
    const newStartDate = new Date(newStartDateStr);
    const newEndDate = new Date(newEndDateStr);

    if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
      throw new BadRequestException('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ');
    }

    if (newEndDate < newStartDate) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
    }
    if (typeof dto.authorized !== 'string' || dto.authorized.trim().length === 0 || dto.authorized.length > 64) {
      throw new BadRequestException('Người được ủy quyền không hợp lệ');
    }
    if (typeof newAuthorized !== 'string' || newAuthorized.trim().length === 0 || newAuthorized.length > 64) {
      throw new BadRequestException('Người được ủy quyền hiện tại không hợp lệ');
    }
    const authorConflict = await this.runtime.repo.checkAuthorConflictExceptId(
      userId,
      newStartDate,
      newEndDate,
      id,
    );
    if (authorConflict) {
      throw new BadRequestException('Bạn đang có ủy quyền khác trùng khoảng thời gian này');
    }
    const authorizedConflict = await this.runtime.repo.checkAuthorizedConflictExceptId(
      newAuthorized,
      newStartDate,
      newEndDate,
      id,
    );
    if (authorizedConflict) {
      throw new BadRequestException('Người này đã được ủy quyền khác trong khoảng thời gian này');
    }
    const updateData: any = {
      files: dto.files ?? current.files,
      isForceEnd: dto.isForceEnd ?? false,
    };
    if (dto.authorized !== undefined) updateData.authorized = dto.authorized;
    if (dto.startDate !== undefined) updateData.startDate = newStartDate;
    if (dto.endDate !== undefined) updateData.endDate = newEndDate;
    const updated = await this.runtime.repo.updateAuthority(userId, id, updateData);

    return {
      status: true,
      message: 'Cập nhật ủy quyền thành công',
      data: updated,
    };
  }

  async listAuthorityProcessesDynamic(params: {
    pageNumber: number;
    pageSize: number;
    search?: string;
    filter?: Record<string, any>;
    sort?: string;
    processFn: string;
    userId: string;
    isExport?: string;
  }) {
    const { pageNumber, pageSize, search, filter, sort, processFn, userId, isExport } = params;

    if (!userId) throw new BadRequestException('Vui lòng cung cấp userId');

    // Sort (dùng shared utility)
    const allowedSortFields = [
      ...getDtoKeys(CreateAuthorityProcessDto),
      'author', 'originalEndDate', 'stage', 'status','createdAt', 'updatedAt'
    ];
    validateAndParseSortParam(sort, allowedSortFields);

    const result = await this.runtime.repo.listAuthorityProcessesDynamic({ page: pageNumber, limit: pageSize, search, filter, sort, processFn, userId, isExport });

    return { ...result, page: pageNumber, limit: pageSize };
  }

  async getAuthorIdIfAuthorized(userId: string): Promise<string | null> {
    try {
      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        return null;
      }

      if (!this.runtime?.repo?.getAuthorIdIfAuthorized) {
        this.logger.error('runtime.repo.getAuthorIdIfAuthorized not found');
        return null;
      }

      const result = await this.runtime.repo.getAuthorIdIfAuthorized(userId);
      return result ?? null;
    } catch (error) {
      this.logger.error(
        'getAuthorIdIfAuthorized failed',
        error?.stack || error?.message,
      );
      return null;
    }
  }

  async getAuthorizedIdIfAuthor(userId: string): Promise<string | null> {
    try {
      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        return null;
      }

      if (!this.runtime?.repo?.getAuthorizedIdIfAuthor) {
        this.logger.error('runtime.repo.getAuthorizedIdIfAuthor not found');
        return null;
      }

      const result = await this.runtime.repo.getAuthorizedIdIfAuthor(userId);
      return result ?? null;
    } catch (error) {
      this.logger.error(
        'getAuthorizedIdIfAuthor failed',
        error?.stack || error?.message,
      );
      return null;
    }
  }
}

