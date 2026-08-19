import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { PassportEntity } from './entities/passport.entity';
import { CreatePassportDto } from './dto/create-passport.dto';
import { ListPassportDto } from './dto/list-passport.dto';
import { UpdatePassportDto } from './dto/update-passport.dto';
import { UserEntity } from '../users/entities/user.entity';
import { PassportQueryBuilder } from './helpers/passport-query.builder';
import { getMssqlPool } from 'src/database/mssql.pool';
import { v4 as uuidv4 } from 'uuid';
import { CrmSourcesService } from '../crmsource/crmsource.service';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { FilesManagementService } from '../files-managerment/files-management-mssql.service';
import { FilesRepository } from '../files-managerment/repositories/files.repository';


import { PassportPermissionEntity } from '../passport-requests/entities/passport-permission.entity';

@Injectable()
export class PassportsService {
  constructor(
    @InjectRepository(PassportEntity, 'mssqlConnection')
    private readonly passportRepo: Repository<PassportEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
    private readonly queryBuilder: PassportQueryBuilder,
    private readonly configService: ConfigService,
    private readonly crmSourcesService: CrmSourcesService,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly unitRepo: Repository<OrganizationUnitEntity>,
    private readonly filesManagementService: FilesManagementService,
    private readonly filesRepository: FilesRepository,
    @InjectRepository(PassportPermissionEntity, 'mssqlConnection')
    private readonly passportPermissionRepo: Repository<PassportPermissionEntity>,
  ) { }


  private getCountryCodes(): string[] {
    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };

    if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
      try {
        return intlWithSupportedValues
          .supportedValuesOf('region')
          .filter((code) => /^[A-Z]{2}$/.test(code));
      } catch {
        // Một số runtime có supportedValuesOf nhưng không hỗ trợ key "region"
      }
    }

    const fallbackCodes: string[] = [];
    const displayNames = new Intl.DisplayNames(['vi', 'en'], {
      type: 'region',
    });

    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        const name = displayNames.of(code);
        if (name && name !== code) {
          fallbackCodes.push(code);
        }
      }
    }

    return fallbackCodes;
  }

  async getAllCountries(
    params: {
      page?: number;
      limit?: number;
      title?: string;
      value?: string;
    } = {},
  ) {
    const res = await this.crmSourcesService.findByCode('COUNTRY');
    const all = res.items || [];

    const titleSearch = params.title ? params.title.toLowerCase() : '';
    const valueSearch = params.value ? params.value.toLowerCase() : '';

    let filtered = all;
    if (titleSearch) {
      filtered = filtered.filter(c => c.title?.toLowerCase().includes(titleSearch));
    }
    if (valueSearch) {
      filtered = filtered.filter(c => c.value?.toLowerCase().includes(valueSearch));
    }

    const pageNum = Math.max(Number(params.page) || 1, 1);
    const limitNum = Math.max(Number(params.limit) || 10, 1);
    const offset = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(offset, offset + limitNum);

    return {
      success: true,
      data: paginated,
      total: filtered.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filtered.length / limitNum),
    };
  }


  /**
   * Lấy danh sách đơn vị DISTINCT từ bảng passports
   * Dùng cho bộ lọc nâng cao - cột Đơn vị
   */
  async getFilterUnits() {
    const rows = await this.passportRepo.query(
      `SELECT DISTINCT department_name FROM passports WHERE is_deleted = 0 AND department_name IS NOT NULL`,
    );
    const unitNames = rows.map((r: any) => r.department_name);
    return {
      success: true,
      data: unitNames.map((name: string) => ({ value: name, title: name })),
    };
  }


  /**
   * Lấy danh sách phòng ban DISTINCT từ bảng passports
   * Dùng cho bộ lọc nâng cao - cột Phòng
   */
  async getFilterDepartments() {
    const rows = await this.passportRepo.query(
      `SELECT DISTINCT department_name FROM passports WHERE is_deleted = 0 AND department_name IS NOT NULL`,
    );
    const unitNames = rows.map((r: any) => r.department_name);
    return {
      success: true,
      data: unitNames.map((name: string) => ({ value: name, title: name })),
    };
  }


  /**
   * Danh sách nhân viên từ file fake TypeScript
   */
  async getAllEmployees(params: any) {
    try {
      const { page = 1, limit = 10, nameVn } = params;

      const qb = this.userRepo.createQueryBuilder('u')
        .leftJoinAndSelect('u.parent', 'p')
        .where('u.status = 1');

      if (nameVn) {
        qb.andWhere('(u.name LIKE :search OR u.username LIKE :search OR u.code_nd LIKE :search)', { search: `%${nameVn}%` });
      }

      const [items, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        success: true,
        data: items.map(u => ({
          id: u.id,
          employeeNumber: u.codeND,
          nameVn: u.name,
          nameEn: u.name,
          email: u.emailUser,
          idNumber: u.identificationCard,
          position: u.position,
          organization: u.parent?.id,
          organizationName: u.parent?.name,
          phoneNumber: u.phoneNumberUser,
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi lấy danh sách nhân viên: ${error.message}`);
    }
  }

  async getAllOrganizationUnits(params: any) {
    try {
      const { page = 1, limit = 10, search } = params;

      const qb = this.unitRepo.createQueryBuilder('u')
        .where('u.status = 1');

      if (search) {
        qb.andWhere('(u.name LIKE :search OR u.code LIKE :search)', { search: `%${search}%` });
      }

      const [items, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        success: true,
        data: items.map(u => ({
          id: u.id,
          nameVn: u.name,
          nameEn: u.name,
          parentId: u.parentId,
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi lấy danh sách đơn vị tổ chức: ${error.message}`);
    }
  }


  /**
   * Danh sách phòng ban (lọc theo đơn vị cha)
   */
  async getAllDepartments(params: any) {
    return this.getAllOrganizationUnits(params);
  }


  async getAllWorkerTypes(params: any) {
    return this.findCrmDropdown('WORKER_TYPE', params);
  }

  async getAllPositions(params: any) {
    return this.findCrmDropdown('POSITION', params);
  }

  async getAllJobs(params: any) {
    return this.findCrmDropdown('JOB', params);
  }

  async getAllArmyRanks(params: any) {
    return this.findCrmDropdown('ARMY_RANK', params);
  }


  /**
   * Chi tiết nhân viên theo ID
   */
  private async findCrmDropdown(code: string, params: any) {
    const { page = 1, limit = 10, search } = params;
    const res = await this.crmSourcesService.findByCode(code);
    let all = res.items || [];
    if (search) {
      const s = search.toLowerCase();
      all = all.filter((c: any) => c.title?.toLowerCase().includes(s) || c.value?.toLowerCase().includes(s));
    }
    const paginated = all.slice((page - 1) * limit, page * limit);
    return {
      success: true,
      data: paginated,
      total: all.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(all.length / limit),
    };
  }

  async getEmployeeById(id: string) {
    try {
      const u = await this.userRepo.findOne({ where: { id }, relations: ['parent'] });
      if (!u) throw new NotFoundException(`Không tìm thấy nhân viên`);
      return {
        success: true,
        data: {
          id: u.id,
          employeeNumber: u.codeND,
          nameVn: u.name,
          email: u.emailUser,
          position: u.position,
          organization: u.parent ? { id: u.parent.id, nameVn: u.parent.name } : null,
          phoneNumber: u.phoneNumberUser,
          gender: u.gender,
          dateOfBirth: u.birthday,
          idNumber: u.identificationCard,
        }
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi lấy chi tiết nhân viên: ${error.message}`);
    }
  }

  async getOrganizationUnitById(id: string) {
    try {
      const unit = await this.unitRepo.findOne({ where: { id }, relations: ['parent'] });
      if (!unit) throw new NotFoundException(`Không tìm thấy đơn vị`);
      return {
        success: true,
        data: {
          id: unit.id,
          nameVn: unit.name,
          parentId: unit.parent ? { id: unit.parent.id, nameVn: unit.parent.name } : null,
        }
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi lấy chi tiết đơn vị: ${error.message}`);
    }
  }


  async getWorkerTypeById(id: string) {
    return this.findCrmItemById('WORKER_TYPE', id);
  }

  async getPositionById(id: string) {
    return this.findCrmItemById('POSITION', id);
  }

  async getJobById(id: string) {
    return this.findCrmItemById('JOB', id);
  }

  async getArmyRankById(id: string) {
    return this.findCrmItemById('ARMY_RANK', id);
  }

  private async findCrmItemById(code: string, id: string) {
    const res = await this.crmSourcesService.findByCode(code);
    const item = (res.items || []).find((i: any) => String(i.id) === String(id) || String(i.value) === String(id));
    if (!item) throw new NotFoundException(`Không tìm thấy thông tin ${code} với ID: ${id}`);
    return { success: true, data: item };
  }


  /**
   * Danh sách hộ chiếu (search, filter, pagination, sort)
   * Pattern giống AmenitiesService.list() — raw SQL + buildDocumentCriteriaHelper
   */
  async findAll(params: ListPassportDto) {
    try {
      const {
        page = 1,
        limit = 20,
        q,
        searchFields,
        filter: rawFilter,
        tab = 'all',
        sort,
        processFn,
      } = params as any;

      // Tách expiryStatus ra khỏi filter trước khi build criteria
      const expiryStatus: string = rawFilter?.expiryStatus || 'all';
      const filter = rawFilter ? { ...rawFilter } : {};
      delete filter.expiryStatus;

      // Map processFn từ FE sang tab filter
      const processFnTabMap = {
        dsDangLuuTruHoChieu: 'dang_luu_tru',
        dsHoChieuDangLuuTru: 'dang_luu_tru',
        dsDangSuDungHoChieu: 'dang_su_dung',
        dsHoChieuDangSuDung: 'dang_su_dung',
      };
      const effectiveTab = processFnTabMap[processFn] || tab;

      // Step 1: Build criteria from filter + search
      const filterCriteria = this.queryBuilder.buildCriteriaFromFilter(filter);
      const searchCriteria = this.queryBuilder.buildSearchCriteria(
        q,
        searchFields,
      );
      const allCriteria = [...filterCriteria, ...searchCriteria];

      // Step 2: Build WHERE clause via buildDocumentCriteriaHelper
      const { whereClause, joins } =
        this.queryBuilder.buildWhereClause(allCriteria);

      // Step 3: Build tab filter
      let tabCondition = '';
      if (effectiveTab === 'dang_luu_tru') {
        tabCondition = ` AND passports.usage_status = 'STORING'`;
      } else if (effectiveTab === 'dang_su_dung') {
        tabCondition = ` AND passports.usage_status = 'IN_USE'`;
      }

      // Step 3b: Build expiry status filter (từ filter[expiryStatus])
      let expiryCondition = '';
      if (expiryStatus === 'qua_han') {
        // Quá hạn: ngày hết hiệu lực < hôm nay
        expiryCondition = ` AND passports.expiry_date < CAST(GETDATE() AS DATE)`;
      } else if (expiryStatus === 'sap_het_han') {
        // Sắp hết hạn: còn hạn nhưng trong vòng 6 tháng tới
        expiryCondition = ` AND passports.expiry_date >= CAST(GETDATE() AS DATE) AND passports.expiry_date <= DATEADD(month, 6, CAST(GETDATE() AS DATE))`;
      } else if (expiryStatus === 'con_han') {
        // Còn hạn: ngày hết hiệu lực > 6 tháng tới
        expiryCondition = ` AND passports.expiry_date > DATEADD(month, 6, CAST(GETDATE() AS DATE))`;
      }

      // Step 4: Build pagination
      const pagination = this.queryBuilder.buildPagination(page, limit);

      // Step 5: Build ORDER BY — map FE camelCase → DB snake_case
      const sortAliases = {
        full_name: 'fullName',
        eoffice_account: 'eofficeAccount',
        passport_number: 'passportNumber',
        passport_type: 'passportType',
        identification_card: 'identificationCard',
        phone_number: 'phoneNumber',
        issue_date: 'issueDate',
        expiry_date: 'expiryDate',
        issue_place: 'issuePlace',
        usage_status: 'usageStatus',
        position_title: 'positionTitle',
        rank: 'rank',
        unit_name: 'unitName',
        department_name: 'departmentName',
        division_name: 'divisionName',
        email: 'email',
        birthday: 'birthday',
        gender: 'gender',
        address: 'address',
        nationality: 'nationality',
        place_of_birth: 'placeOfBirth',
        note: 'note',
        countries_visited: 'countriesVisited',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
      };
      const orderBy =
        this.queryBuilder.buildOrderBy(sort, sortAliases) ||
        'passports.created_at DESC';

      // Step 6: Build final WHERE (Loại bỏ các hộ chiếu đã trả RETURNED khỏi danh sách chung)
      const baseWhere = `WHERE passports.is_deleted = 0 AND passports.usage_status != 'RETURNED'${tabCondition}${expiryCondition}${whereClause}`;

      // Step 7: Execute raw SQL queries
      const pool = await getMssqlPool(this.configService);

      const lastReqApply = `
        OUTER APPLY (
          SELECT TOP 1 pr.borrow_date, pr.return_date
          FROM passport_borrow_requests pr
          LEFT JOIN passport_delegation_items pdi ON pdi.request_id = pr.id
          WHERE (pr.passport_id = passports.id OR pdi.passport_id = passports.id)
            AND pr.is_deleted = 0
            AND pr.status NOT IN ('REJECTED', 'CANCELLED')
          ORDER BY pr.created_at DESC
        ) last_req
      `;

      const totalSql = `SELECT COUNT(*) AS total FROM passports ${joins} ${baseWhere}`;
      const rowsSql = `
        SELECT passports.*, 
               last_req.borrow_date AS req_borrow_date, 
               last_req.return_date AS req_return_date,
               COALESCE(ou_id.name, ou_code.name) AS department_mapped_name
        FROM passports ${joins}
        LEFT JOIN organization_units ou_id ON passports.department_name = ou_id.id
        LEFT JOIN organization_units ou_code ON passports.department_name = ou_code.code
        ${lastReqApply}
        ${baseWhere}
        ORDER BY ${orderBy}
        OFFSET ${pagination.offset} ROWS
        FETCH NEXT ${pagination.limit} ROWS ONLY
      `;

      // Count by status (cho tab badges) — luôn lấy tổng không phụ thuộc filter
      const countSql = `
        SELECT usage_status, COUNT(*) AS count 
        FROM passports 
        WHERE is_deleted = 0 
        GROUP BY usage_status
      `;

      const [totalResult, rowsResult, countResult] = await Promise.all([
        pool.request().query(totalSql),
        pool.request().query(rowsSql),
        pool.request().query(countSql),
      ]);
      const total = totalResult.recordset[0]?.total ?? 0;
      const items = rowsResult.recordset;

      // Lấy tất cả file scan quan hệ theo lô (batch) để tránh N+1
      const passportIds = items.map(it => it.id).filter(Boolean);
      const allRelatedFiles = await this.filesRepository.getFilesByObjectIds('scanPassport', passportIds);

      // Nhóm files theo passportId
      const filesMap: Record<string, any[]> = {};
      for (const f of allRelatedFiles) {
        const pid = String(f.object_id);
        if (!filesMap[pid]) filesMap[pid] = [];
        filesMap[pid].push({
          id: f.id,
          fileName: f.file_name,
          filePath: f.file_path,
          fileSize: f.file_size,
          mimeType: f.mime_type,
          createdAt: f.created_at,
        });
      }

      const countByStatus: Record<string, number> = {
        STORING: 0,
        IN_USE: 0,
      };
      let totalAll = 0;
      for (const row of countResult.recordset) {
        countByStatus[row.usage_status] = parseInt(row.count, 10);
        totalAll += parseInt(row.count, 10);
      }

      // Compute expiry warnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setDate(threeMonthsLater.getDate() + 90);

      const data = items.map((item) => {
        const expiry = item.expiry_date ? new Date(item.expiry_date) : null;
        if (expiry) expiry.setHours(0, 0, 0, 0);

        const passportTypeMap: Record<string, string> = {
          ORDINARY: 'Hộ chiếu phổ thông',
          DIPLOMATIC: 'Hộ chiếu ngoại giao',
          OFFICIAL: 'Hộ chiếu công vụ',
        };

        const usageStatusMap: Record<string, string> = {
          STORING: 'Đang lưu trữ',
          IN_USE: 'Đang sử dụng',
          RETURNED: 'Vô hiệu hóa (Đã trả)',
        };

        const getUsageStatusBadge = (status: string) => {
          const configMap: Record<string, { text: string; color: string; bgColor: string; borderColor: string }> = {
            STORING: {
              text: 'Đang lưu trữ',
              color: '#007222',
              bgColor: '#D0FFDE',
              borderColor: '#6EB884',
            },
            IN_USE: {
              text: 'Đang sử dụng',
              color: '#0062AD',
              bgColor: '#DBEAFE',
              borderColor: '#82B8FF',
            },
            RETURNED: {
              text: 'Vô hiệu hóa (Đã trả)',
              color: '#DC2626',
              bgColor: '#FEE2E2',
              borderColor: '#F87171',
            },
          };
          const config = configMap[status] || {
            text: status || 'Không xác định',
            color: '#6B7280',
            bgColor: '#F3F4F6',
            borderColor: '#AEB5BE',
          };
          return `<div style="display:flex; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; align-items:center; justify-content:center; width:100%; height:30px; padding:0 16px; font-weight:700; font-size:14px; border-radius:15px; background:${config.bgColor}; color:${config.color}; border:1px solid ${config.borderColor};">${config.text}</div>`;
        };

        const formatDate = (d: any) => {
          if (!d) return null;
          const date = new Date(d);
          if (isNaN(date.getTime())) return d;
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };

        let borrowDays: number | null = null;
        if (item.usage_status === 'IN_USE' && item.req_borrow_date) {
          const returnOrToday = item.req_return_date
            ? new Date(item.req_return_date)
            : new Date();
          const diff =
            returnOrToday.getTime() - new Date(item.req_borrow_date).getTime();
          borrowDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (borrowDays < 0) borrowDays = 0;
        }

        // Logic Scan File: Lấy từ bảng quan hệ trước, nếu không có mới tìm ở cột cũ (fallback)
        let scanFiles = filesMap[item.id] || [];
        if (scanFiles.length === 0 && item.scan_file) {
          try {
            const parsed = typeof item.scan_file === 'string' ? JSON.parse(item.scan_file) : item.scan_file;
            scanFiles = Array.isArray(parsed) ? parsed : [parsed];
          } catch (e) {
            scanFiles = [item.scan_file];
          }
        }

        return {
          id: item.id,
          eofficeAccount: item.eoffice_account,
          borrowDays,
          fullName: item.full_name,
          passportNumber: item.passport_number,
          passportType: passportTypeMap[item.passport_type] || item.passport_type,
          passportTypeRaw: item.passport_type,
          passportTypeLabel: passportTypeMap[item.passport_type] || item.passport_type,
          identificationCard: item.identification_card,
          phoneNumber: item.phone_number,
          issueDate: formatDate(item.issue_date),
          expiryDate: (() => {
            const formattedDate = formatDate(item.expiry_date);
            if (!expiry || !formattedDate) return formattedDate;

            // if (item.usage_status === 'IN_USE') {
            if (expiry < today) {
              return `<span style="color: #FF4D4D; font-weight: bold;">${formattedDate}</span>`;
            } else if (expiry <= threeMonthsLater) {
              return `<span style="color: #FFA600; font-weight: bold;">${formattedDate}</span>`;
            }
            // }
            return formattedDate;
          })(),
          issuePlace: item.issue_place,
          usageStatus: getUsageStatusBadge(item.usage_status),
          usageStatusRaw: item.usage_status,
          usageStatusLabel: usageStatusMap[item.usage_status] || item.usage_status,
          usageStatusText: usageStatusMap[item.usage_status] || item.usage_status,
          positionTitle: item.position_title,
          rank: item.rank,
          unitName: item.department_mapped_name || item.department_name,
          departmentName: item.department_mapped_name || item.department_name,
          divisionName: item.division_name,
          email: item.email,
          birthday: formatDate(item.birthday),
          gender: item.gender,
          address: item.address,
          nationality: item.nationality,
          scanFile: scanFiles,
          countriesVisited: item.countries_visited,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          createdBy: item.created_by,
          updatedBy: item.updated_by,
          isExpired: expiry ? expiry < today : false,
          isExpiringSoon: expiry ? expiry >= today && expiry <= threeMonthsLater : false,
          expiryWarning: (() => {
            if (!expiry) return null;
            if (expiry < today) return { level: 'red', text: 'Đã quá hạn' };
            const diffMs = expiry.getTime() - today.getTime();
            const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30);
            if (diffMonths <= 1)
              return { level: 'red', text: 'Sắp hết hạn (còn dưới 1 tháng)' };
            if (diffMonths <= 6)
              return { level: 'yellow', text: `Sắp hết hạn (còn ${Math.ceil(diffMonths)} tháng)` };
            return null;
          })(),
        };
      });

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        countByStatus: {
          all: totalAll,
          dangLuuTru: countByStatus['STORING'] || 0,
          dangSuDung: countByStatus['IN_USE'] || 0,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Lỗi khi lấy danh sách hộ chiếu',
      );
    }
  }


  /**
   * Báo cáo tháng: hộ chiếu sắp hết hạn + đã hết hạn
   */
  async getMonthlyReport() {
    const pool = await getMssqlPool(this.configService);

    const lastReqApply = `
        OUTER APPLY (
          SELECT TOP 1 pr.borrow_date, pr.return_date
          FROM passport_borrow_requests pr
          LEFT JOIN passport_delegation_items pdi ON pdi.request_id = pr.id
          WHERE (pr.passport_id = passports.id OR pdi.passport_id = passports.id)
            AND pr.is_deleted = 0
            AND pr.status NOT IN ('REJECTED', 'CANCELLED')
          ORDER BY pr.created_at DESC
        ) last_req
    `;

    // Hộ chiếu sắp hết hạn (trong 6 tháng tới)
    const expiringSql = `
      SELECT passports.id, passports.passport_number, passports.full_name, passports.unit_name, passports.department_name,
             passports.expiry_date, passports.usage_status, last_req.borrow_date AS req_borrow_date, last_req.return_date AS req_return_date
      FROM passports
      ${lastReqApply}
      WHERE passports.is_deleted = 0
        AND passports.expiry_date > GETDATE()
        AND passports.expiry_date <= DATEADD(month, 6, GETDATE())
      ORDER BY passports.expiry_date ASC
    `;

    // Hộ chiếu đã hết hạn
    const expiredSql = `
      SELECT passports.id, passports.passport_number, passports.full_name, passports.unit_name, passports.department_name,
             passports.expiry_date, passports.usage_status, last_req.borrow_date AS req_borrow_date, last_req.return_date AS req_return_date
      FROM passports
      ${lastReqApply}
      WHERE passports.is_deleted = 0
        AND passports.expiry_date < GETDATE()
      ORDER BY passports.expiry_date DESC
    `;

    const [expiringResult, expiredResult] = await Promise.all([
      pool.request().query(expiringSql),
      pool.request().query(expiredSql),
    ]);

    const formatDate = (date: Date | string | null) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const mapRow = (item: any) => {
      let borrowDays: number | null = null;
      if (item.usage_status === 'IN_USE' && item.req_borrow_date) {
        const returnOrToday = item.req_return_date
          ? new Date(item.req_return_date)
          : new Date();
        const diff =
          returnOrToday.getTime() - new Date(item.req_borrow_date).getTime();
        borrowDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (borrowDays < 0) borrowDays = 0;
      }

      return {
        id: item.id,
        passportNumber: item.passport_number,
        fullName: item.full_name,
        unitName: item.unit_name,
        departmentName: item.department_name,
        expiryDate: formatDate(item.expiry_date),
        usageStatus: item.usage_status,
        borrowDays,
      };
    };

    return {
      expiring: (expiringResult.recordset || []).map(mapRow),
      expired: (expiredResult.recordset || []).map(mapRow),
      summary: {
        expiringCount: expiringResult.recordset?.length || 0,
        expiredCount: expiredResult.recordset?.length || 0,
      },
    };
  }

  /**
   * Thêm mới hộ chiếu
   */
  async create(createDto: CreatePassportDto, userId: string) {
    // 1. Validate ngày tháng
    const issueDate = new Date(createDto.issueDate);
    const expiryDate = new Date(createDto.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (issueDate >= expiryDate) {
      throw new BadRequestException('Ngày cấp phải nhỏ hơn ngày hết hiệu lực');
    }

    if (issueDate > today) {
      throw new BadRequestException(
        'Ngày cấp không được lớn hơn ngày hiện tại',
      );
    }

    if (expiryDate <= today) {
      throw new BadRequestException(
        'Ngày hết hiệu lực phải lớn hơn ngày hiện tại',
      );
    }

    // 2. Tra cứu tài khoản eOffice từ bảng users
    // const eofficeUser = await this.userRepo.findOne({
    //   where: { username: createDto.eofficeAccount },
    //   relations: ['parent'],
    // });

    // if (!eofficeUser) {
    //   throw new BadRequestException(
    //     `Tài khoản eOffice "${createDto.eofficeAccount}" không tồn tại trong hệ thống`,
    //   );
    // }

    // 3. Kiểm tra trùng số hộ chiếu (chưa bị xóa mềm) // const eofficeUser = await this.userRepo.findOne({
    //   where: { username: createDto.eofficeAccount },
    //   relations: ['parent'],
    // });

    // if (!eofficeUser) {
    //   throw new BadRequestException(
    //     `Tài khoản eOffice "${createDto.eofficeAccount}" không tồn tại trong hệ thống`,
    //   );
    // }

    // 3. Kiểm tra trùng số hộ chiếu (chưa bị xóa mềm)
    const existingPassport = await this.passportRepo.findOne({
      where: {
        passportNumber: createDto.passportNumber,
        isDeleted: false,
      },
    });

    if (existingPassport) {
      throw new BadRequestException(
        `Số hộ chiếu "${createDto.passportNumber}" đã tồn tại trong hệ thống`,
      );
    }

    // 3. Tạo bản ghi hộ chiếu mới với thông tin từ DTO
    const passport = this.passportRepo.create({
      id: uuidv4(),
      // Thông tin hộ chiếu từ DTO
      eofficeAccount: createDto.eofficeAccount,
      passportNumber: createDto.passportNumber,
      passportType: createDto.passportType,
      issueDate: issueDate,
      expiryDate: expiryDate,
      issuePlace: createDto.issuePlace || null,
      countriesVisited: createDto.countriesVisited || null,
      // Thông tin người dùng từ DTO (hỗ trợ cả field name từ FE và field name cũ)
      fullName: createDto?.fullName || createDto?.name || null,
      email: createDto?.email || createDto?.emailUser || null,
      positionTitle: createDto?.positionTitle
        ? String(createDto.positionTitle)
        : createDto?.position || null,
      birthday: createDto?.birthday ? new Date(createDto.birthday) : null,
      gender: createDto?.gender || null,
      identificationCard: createDto?.identificationCard || null,
      phoneNumber: createDto?.phoneNumber || createDto?.phoneNumberUser || null,
      rank: createDto?.rank ? String(createDto.rank) : null,
      unitName: createDto?.unitName
        ? String(createDto.unitName)
        : createDto?.organizationName || null,
      departmentName: createDto?.departmentName
        ? String(createDto.departmentName)
        : createDto?.parent?.name || null,
      divisionName: createDto?.divisionName
        ? String(createDto.divisionName)
        : null,
      address: createDto?.address || createDto?.addressUser || null,
      nationality: createDto?.nationality || null,
      // System fields
      usageStatus: 'STORING',
      isDeleted: false,
      userId: createDto?.id ? String(createDto.id) : null,
      createdBy: userId,
      scanFile: null, // Ngừng lưu trực tiếp vào cột scan_file
    });


    const savedPassport = await this.passportRepo.save(passport);

    // Xử lý File Scan qua bảng quan hệ
    if (createDto.scanFile) {
      let scanFileIds: number[] = [];
      if (Array.isArray(createDto.scanFile)) {
        scanFileIds = createDto.scanFile.map(f => (typeof f === 'object' && f !== null) ? (f as any).id : f).filter(Boolean);
      } else {
        const id = (typeof createDto.scanFile === 'object' && createDto.scanFile !== null) ? (createDto.scanFile as any).id : createDto.scanFile;
        if (id) scanFileIds = [Number(id)];
      }

      for (const fileId of scanFileIds) {
        await this.filesRepository.createFileRelation({
          object_id: savedPassport.id,
          object_type: 'scanPassport',
          file_id: fileId,
        });
      }
    }

    return {
      success: true,
      message: 'Thêm mới hộ chiếu thành công',
      data: savedPassport,
    };
  }

  /**
   * Kiểm tra một tài khoản có thuộc nhóm bộ phận chuyên trách (BPCT) quản lý hộ chiếu hay không
   */
  async checkIsAdminPassport(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    try {
      const uId: string = userId;
      // 1. Kiểm tra trực tiếp trên UserEntity (role hoặc rolesByProcess)
      const user = await this.userRepo.findOne({
        where: [
          { id: uId },
          { username: uId },
        ],
      });

      if (user) {
        if (user.role && ['ADMIN', 'BPCT001'].includes(user.role)) {
          return true;
        }

        if (user.rolesByProcess && Array.isArray(user.rolesByProcess)) {
          const bpctRoles = ['BPCT001'];
          const hasRoleInProcess = user.rolesByProcess.some((p: any) =>
            Array.isArray(p.roles) && p.roles.some((r: any) => bpctRoles.includes(r.roleCode))
          );
          if (hasRoleInProcess) return true;
        }
      }

      // 2. Query trực tiếp từ mssql pool hoặc group_users
      try {
        const pool = await getMssqlPool(this.configService);
        if (pool) {
          const bpctCodes = ['BPCT001'];
          const query = `
            SELECT gu.id, gu.code, gu.roles_dynamic, gu.userId
            FROM group_users gu
            LEFT JOIN user_group_users ugu ON ugu.group_user_id = gu.id
            WHERE gu.status = 1 
              AND (ugu.user_id = @userId OR gu.userId LIKE @userIdSearch)
          `;
          const result = await pool.request()
            .input('userId', sql.NVarChar, userId)
            .input('userIdSearch', sql.NVarChar, `%${userId}%`)
            .query(query);

          const matchedGroups = result.recordset || [];
          for (const g of matchedGroups) {
            if (bpctCodes.includes(g.code)) return true;
            if (g.roles_dynamic) {
              try {
                const roles = typeof g.roles_dynamic === 'string' ? JSON.parse(g.roles_dynamic) : g.roles_dynamic;
                if (Array.isArray(roles)) {
                  const isBpctRole = roles.some((r: any) =>
                    ['BPCT001'].includes(r.roleCode)
                  );
                  if (isBpctRole) return true;
                }
              } catch (e) { }
            }
          }
        }
      } catch (poolErr) {
        console.warn('Lỗi query pool mssql trong checkIsAdminPassport:', poolErr.message);
      }

      return false;
    } catch (error) {
      console.warn('Lỗi khi kiểm tra checkIsAdminPassport:', error.message);
      return false;
    }
  }

  /**
   * Xem chi tiết hộ chiếu
   */
  async findOne(id: string, currentUserId?: string) {
    const passport = await this.passportRepo.findOne({
      where: { id, isDeleted: false },
    });

    if (!passport) {
      throw new NotFoundException('Hộ chiếu không tồn tại hoặc đã bị xóa');
    }

    const isAdminPassport = await this.checkIsAdminPassport(currentUserId);

    const user = await this.userRepo.findOne({
      where: { id: passport.eofficeAccount },
    });

    // Logic Scan File: Lấy từ bảng quan hệ trước, nếu không có mới tìm ở cột cũ (fallback)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    const expiry = passport.expiryDate ? new Date(passport.expiryDate) : null;

    const relatedFiles = await this.filesRepository.getFilesByObjectAndStatus('scanPassport', id);
    let scanFiles = (relatedFiles || []).map(f => ({
      id: f.id,
      fileName: f.file_name,
      filePath: f.file_path,
      fileSize: f.file_size,
      mimeType: f.mime_type,
      createdAt: f.created_at,
    }));

    if (scanFiles.length === 0 && passport.scanFile) {
      try {
        const parsed = typeof passport.scanFile === 'string' ? JSON.parse(passport.scanFile) : passport.scanFile;
        scanFiles = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        scanFiles = [passport.scanFile];
      }
    }

    // Mapping loại hộ chiếu
    const passportTypeMap: Record<string, string> = {
      ORDINARY: 'Hộ chiếu phổ thông',
      DIPLOMATIC: 'Hộ chiếu ngoại giao',
      OFFICIAL: 'Hộ chiếu công vụ',
    };

    const usageStatusHtmlMap: Record<string, string> = {
      STORING:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #6EB884;">Đang lưu trữ</div>',
      IN_USE:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#DBEAFE;color:#0062AD;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #82B8FF;">Đang sử dụng</div>',
      RETURNED:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEE2E2;color:#DC2626;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #F87171;">Vô hiệu hóa (Đã trả)</div>',
    };

    return {
      ...passport,
      isAdminPassport,
      scanFile: scanFiles,
      eofficeAccount: user ? {
        id: user.id,
        nameVn: user.name,
        username: user.username,
      } : passport.eofficeAccount,
      passportType: passportTypeMap[passport.passportType]
        ? {
          title: passportTypeMap[passport.passportType],
          value: passport.passportType,
        }
        : passport.passportType,
      usageStatus: usageStatusHtmlMap[passport.usageStatus]
        ? {
          title: usageStatusHtmlMap[passport.usageStatus],
          value: passport.usageStatus,
        }
        : passport.usageStatus,
      // Expiry warnings
      isExpired: expiry ? expiry < today : false,
      isExpiringSoon: expiry
        ? expiry >= today && expiry <= sixMonthsLater
        : false,
      borrowHistory: [],
    };

  }

  /**
   * Cập nhật thông tin hộ chiếu
   * - Không cho sửa số hộ chiếu
   * - Không cho cập nhật HC đã bị khóa hoặc hủy
   */
  async update(id: string, updateDto: UpdatePassportDto, userId: string) {
    const passport = await this.passportRepo.findOne({
      where: { id, isDeleted: false },
    });

    if (!passport) {
      throw new NotFoundException('Hộ chiếu không tồn tại hoặc đã bị xóa');
    }

    // Kiểm tra trạng thái - không cho cập nhật nếu hộ chiếu đang sử dụng
    if (passport.usageStatus === 'IN_USE') {
      throw new BadRequestException(
        'Không thể cập nhật hộ chiếu đang ở trạng thái "Đang sử dụng"',
      );
    }

    // Validate ngày tháng nếu có thay đổi
    const issueDate = updateDto.issueDate
      ? new Date(updateDto.issueDate)
      : passport.issueDate;
    const expiryDate = updateDto.expiryDate
      ? new Date(updateDto.expiryDate)
      : passport.expiryDate;

    if (issueDate && expiryDate && issueDate >= expiryDate) {
      throw new BadRequestException('Ngày cấp phải nhỏ hơn ngày hết hiệu lực');
    }

    // Cập nhật các trường được phép sửa
    if (updateDto.passportType !== undefined)
      passport.passportType = updateDto.passportType;
    if (updateDto.issueDate !== undefined)
      passport.issueDate = new Date(updateDto.issueDate);
    if (updateDto.expiryDate !== undefined)
      passport.expiryDate = new Date(updateDto.expiryDate);
    if (updateDto.issuePlace !== undefined)
      passport.issuePlace = updateDto.issuePlace;
    if (updateDto.countriesVisited !== undefined)
      passport.countriesVisited = updateDto.countriesVisited;
    if (updateDto.scanFile !== undefined)
      passport.scanFile = updateDto.scanFile;
    if (updateDto.passportNumber !== undefined)
      passport.passportNumber = updateDto.passportNumber;

    // Ghi log người sửa và thời gian
    passport.updatedBy = userId;
    passport.updatedAt = new Date();

    const savedPassport = await this.passportRepo.save(passport);

    // Đồng bộ File Scan quan hệ
    if (updateDto.scanFile !== undefined) {
      // 1. Xóa tất cả quan hệ cũ
      await this.filesRepository.softDeleteFileRelationsByObject('scanPassport', id);

      // 2. Thêm lại quan hệ mới
      let scanFileIds: number[] = [];
      if (Array.isArray(updateDto.scanFile)) {
        scanFileIds = updateDto.scanFile.map(f => (typeof f === 'object' && f !== null) ? (f as any).id : f).filter(Boolean);
      } else {
        const fid = (typeof updateDto.scanFile === 'object' && updateDto.scanFile !== null) ? (updateDto.scanFile as any).id : updateDto.scanFile;
        if (fid) scanFileIds = [Number(fid)];
      }

      for (const fileId of scanFileIds) {
        await this.filesRepository.createFileRelation({
          object_id: id,
          object_type: 'scanPassport',
          file_id: Number(fileId),
        });
      }
    }

    return {
      success: true,
      message: 'Cập nhật hộ chiếu thành công',
      data: savedPassport,
    };
  }

  /**
   * Xóa mềm hộ chiếu - hỗ trợ xóa 1 hoặc nhiều
   * @param ids - 1 ID hoặc mảng ID
   */
  async remove(ids: string | string[], userId: string) {
    const idArray = Array.isArray(ids) ? ids : [ids];

    if (!idArray.length) {
      throw new BadRequestException('Vui lòng cung cấp ít nhất 1 ID để xóa');
    }

    const results: {
      success: string[];
      failed: { id: string; passportNumber: string; reason: string }[];
    } = { success: [], failed: [] };

    for (const id of idArray) {
      const passport = await this.passportRepo.findOne({
        where: { id, isDeleted: false },
      });

      if (!passport) {
        results.failed.push({
          id,
          passportNumber: '',
          reason: 'Hộ chiếu không tồn tại hoặc đã bị xóa',
        });
        continue;
      }

      if (passport.usageStatus === 'IN_USE') {
        results.failed.push({
          id,
          passportNumber: passport.passportNumber,
          reason: `Hộ chiếu số ${passport.passportNumber} đang được sử dụng (cho mượn), không thể xóa. Vui lòng thu hồi hộ chiếu trước khi xóa.`,
        });
        continue;
      }

      passport.isDeleted = true;
      passport.updatedBy = userId;
      passport.updatedAt = new Date();
      await this.passportRepo.save(passport);

      results.success.push(id);
    }

    if (results.success.length === 0 && results.failed.length > 0) {
      // Gộp lý do cụ thể vào message để FE hiển thị trực tiếp
      const reasons = results.failed.map((f) => f.reason).join('; ');
      throw new BadRequestException({
        message: reasons,
        failed: results.failed,
      });
    }

    return {
      success: true,
      message: `Đã xóa ${results.success.length}/${idArray.length} hộ chiếu thành công`,
      deleted: results.success,
      failed: results.failed,
    };
  }

  /**
   * Lịch sử mượn hộ chiếu theo passportId
   * GET /passports/:id/borrow-history
   * Trả về danh sách các lần mượn của hộ chiếu đó, gồm:
   *   - action             : Loại mượn (cá nhân / đoàn ra)
   *   - performerName      : Tên người mượn
   *   - performerDepartment: Phòng ban người mượn
   *   - performedTime      : Thời gian mượn (borrowDate → returnDate)
   *   - approver           : Người phê duyệt yêu cầu (lấy từ lịch sử hành động "Duyệt yêu cầu")
   *   - statusPassport     : Trạng thái hiện tại của hộ chiếu (dạng HTML badge)
   */
  async getPassportBorrowHistory(passportId: string) {
    const passport = await this.passportRepo.findOne({
      where: { id: passportId, isDeleted: false },
    });

    if (!passport) {
      throw new NotFoundException('Hộ chiếu không tồn tại hoặc đã bị xóa');
    }

    const pool = await getMssqlPool(this.configService);

    // Lấy tất cả yêu cầu mượn liên quan đến hộ chiếu này
    // (bao gồm cả yêu cầu cá nhân qua passport_id và yêu cầu đoàn ra qua passport_delegation_items)
    const requestsSql = `
      SELECT DISTINCT
        pr.id                     AS requestId,
        pr.request_code           AS requestCode,
        pr.type_request           AS typeRequest,
        pr.borrow_date            AS borrowDate,
        pr.return_date            AS returnDate,
        pr.status                 AS status,
        pr.requester_id           AS requesterId,
        pr.name_passport_request  AS namePassportRequest,
        pr.created_at             AS createdAt,
        -- Tên người mượn: ưu tiên từ bảng passports (eoffice_account = namePassportRequest)
        pborrower.full_name       AS borrowerFullName,
        pborrower.department_name AS borrowerDepartment,
        pborrower.division_name   AS borrowerDivision,
        pborrower.unit_name       AS borrowerUnit,
        -- Fallback: thông tin từ bảng users (requester)
        u.name                    AS requesterName,
        u.organization_name       AS requesterOrgName,
        -- Người phê duyệt (hành động "Duyệt yêu cầu" trong passport_histories)
        approver_user.name        AS approverName,
        approver_user.organization_name AS approverOrgName
      FROM passport_borrow_requests pr
      -- Tìm thông tin người mượn qua eoffice_account
      LEFT JOIN passports pborrower
        ON pborrower.eoffice_account = pr.name_passport_request
        AND pborrower.is_deleted = 0
      -- Thông tin requester từ bảng users
      LEFT JOIN users u ON u.id = pr.requester_id
      -- Người phê duyệt: lấy bản ghi history mới nhất với action = 'Duyệt yêu cầu'
      OUTER APPLY (
        SELECT TOP 1 ph.performer_id
        FROM passport_histories ph
        WHERE ph.request_id = pr.id
          AND ph.action = N'Duyệt yêu cầu'
        ORDER BY ph.performed_at ASC
      ) approver_history
      LEFT JOIN users approver_user ON approver_user.id = approver_history.performer_id
      WHERE pr.is_deleted = 0
        AND (
          pr.passport_id = @passportId
          OR pr.id IN (
            SELECT pdi.request_id
            FROM passport_delegation_items pdi
            WHERE pdi.passport_id = @passportId
          )
        )
      ORDER BY pr.created_at DESC
    `;

    const result = await pool
      .request()
      .input('passportId', passportId)
      .query(requestsSql);

    // HTML badge map cho status passport
    const usageStatusHtmlMap: Record<string, string> = {
      STORING:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #6EB884;">Đang lưu trữ</div>',
      IN_USE:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#DBEAFE;color:#0062AD;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #82B8FF;">Đang sử dụng</div>',
      RETURNED:
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEE2E2;color:#DC2626;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #F87171;">Vô hiệu hóa (Đã trả)</div>',
    };

    const typeRequestMap: Record<string, string> = {
      user: 'Mượn hộ chiếu cá nhân',
      delegation: 'Mượn hộ chiếu theo đoàn',
    };

    const formatDate = (d: any): string | null => {
      if (!d) return null;
      const date = new Date(d);
      if (isNaN(date.getTime())) return null;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}/${date.getFullYear()}`;
    };

    const data = result.recordset.map((row: any) => {
      // Resolve borrower name: ưu tiên passport record, fallback user record
      const performerName =
        row.borrowerFullName ||
        row.requesterName ||
        row.namePassportRequest ||
        null;

      // Resolve borrower department
      const performerDepartment =
        row.borrowerDepartment ||
        row.borrowerUnit ||
        row.requesterOrgName ||
        null;

      // Khoảng thời gian mượn
      const fromDate = formatDate(row.borrowDate);
      const toDate = formatDate(row.returnDate);
      const performedTime = fromDate
        ? toDate
          ? `Từ ${fromDate} đến ${toDate}`
          : `Từ ${fromDate}`
        : null;

      return {
        requestId: row.requestId,
        requestCode: row.requestCode,
        action: typeRequestMap[row.typeRequest] || 'Mượn hộ chiếu',
        performerName,
        performerDepartment,
        performedTime,
        borrowDate: formatDate(row.borrowDate),
        returnDate: formatDate(row.returnDate),
        approver: row.approverName || null,
        approverOrgName: row.approverOrgName || null,
        statusRequest: row.status,
        statusPassport:
          usageStatusHtmlMap[passport.usageStatus] ||
          '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E0E0E0;color:#555;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Không xác định</div>',
      };
    });

    const currentStatusHtml =
      usageStatusHtmlMap[passport.usageStatus] ||
      '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E0E0E0;color:#555;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Không xác định</div>';

    return {
      statusCode: 200,
      passportNumber: passport.passportNumber,
      passportType: passport.passportType,
      currentStatus: currentStatusHtml,
      data,
      total: data.length,
    };
  }

  /**
   * Lấy danh sách hộ chiếu cá nhân người dùng (Bao gồm sở hữu và được phân quyền mượn)
   */
  async findMyPassports(userId: string, query: any = {}) {
    if (!userId) {
      throw new BadRequestException('Chưa xác thực thông tin người dùng');
    }

    const page = Math.max(1, parseInt(query?.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query?.limit || '25', 10)));
    const skip = (page - 1) * limit;

    const user = await this.userRepo.findOne({
      where: [
        { id: userId },
        { username: userId },
      ],
    });

    const userIdentifiers = new Set<string>();
    userIdentifiers.add(userId);
    if (user?.username) userIdentifiers.add(user.username);
    if (user?.emailUser) userIdentifiers.add(user.emailUser);
    if ((user as any)?.codeND) userIdentifiers.add((user as any).codeND);

    const idList = Array.from(userIdentifiers);

    let permittedPassportIds: string[] = [];
    try {
      const pool = await getMssqlPool(this.configService);
      // 1. Lấy danh sách hộ chiếu từ lịch sử mượn
      const q = `
        SELECT DISTINCT item.passport_id
        FROM passport_delegation_items item
        INNER JOIN passport_borrow_requests req ON req.id = item.request_id
        WHERE (req.requester_id IN (${idList.map((_, i) => `@id${i}`).join(',')})
           OR req.created_by IN (${idList.map((_, i) => `@id${i}`).join(',')}))
          AND req.is_deleted = 0
          AND item.passport_id IS NOT NULL
      `;
      const reqSql = pool.request();
      idList.forEach((val, i) => reqSql.input(`id${i}`, sql.NVarChar, val));
      const res = await reqSql.query(q);
      permittedPassportIds = (res.recordset || []).map(r => r.passport_id).filter(Boolean);

      // 2. Lấy danh sách hộ chiếu được ủy quyền từ bảng passport_permissions (Phân quyền mượn hộ chiếu)
      const permissions = await this.passportPermissionRepo.find({
        where: idList.map(id => ({ authPersonsPassport: id })),
      });

      for (const row of permissions) {
        const scope = row.passportBorrowScope;
        if (scope === 'byPermissionList' && row.officerList) {
          let list: any[] = [];
          try {
            list = typeof row.officerList === 'string' ? JSON.parse(row.officerList) : row.officerList;
          } catch (e) {
            list = Array.isArray(row.officerList) ? row.officerList : [];
          }
          if (Array.isArray(list)) {
            const officerUserIds = list
              .map((item: any) => (typeof item === 'string' ? item : item?.userId || item?.id || item?.eofficeAccount || item?.codeND || null))
              .filter(Boolean);

            if (officerUserIds.length > 0) {
              const offSql = pool.request();
              officerUserIds.forEach((val, i) => offSql.input(`oid${i}`, sql.NVarChar, val));
              const offRes = await offSql.query(`
                SELECT id FROM passports
                WHERE is_deleted = 0
                  AND (eoffice_account IN (${officerUserIds.map((_, i) => `@oid${i}`).join(',')})
                    OR user_id IN (${officerUserIds.map((_, i) => `@oid${i}`).join(',')}))
              `);
              const pIds = (offRes.recordset || []).map(r => r.id).filter(Boolean);
              permittedPassportIds.push(...pIds);
            }
          }
        } else if (scope === 'sameUnit' && (user?.organizationCode || (user as any)?.parent?.code)) {
          const orgCode = user?.organizationCode || (user as any)?.parent?.code;
          const unitSql = pool.request();
          unitSql.input('orgCode', sql.NVarChar, orgCode);
          const unitRes = await unitSql.query(`
            SELECT p.id FROM passports p
            INNER JOIN users u ON p.eoffice_account = u.id OR p.user_id = u.id
            WHERE p.is_deleted = 0 AND (u.organization_code = @orgCode OR u.parent_id = @orgCode)
          `);
          const pIds = (unitRes.recordset || []).map(r => r.id).filter(Boolean);
          permittedPassportIds.push(...pIds);
        }
      }
      permittedPassportIds = Array.from(new Set(permittedPassportIds));
    } catch (e) {
      throw new BadRequestException(`Lỗi khi kiểm tra quyền hạn mượn hộ chiếu: ${e.message}`);
    }

    const qb = this.passportRepo.createQueryBuilder('p')
      .where('p.isDeleted = :isDeleted', { isDeleted: false });

    if (permittedPassportIds.length > 0) {
      qb.andWhere(
        '(p.eofficeAccount IN (:...idList) OR p.userId IN (:...idList) OR p.createdBy IN (:...idList) OR p.id IN (:...permittedPassportIds))',
        { idList, permittedPassportIds }
      );
    } else {
      qb.andWhere(
        '(p.eofficeAccount IN (:...idList) OR p.userId IN (:...idList) OR p.createdBy IN (:...idList))',
        { idList }
      );
    }

    if (query?.q) {
      const search = `%${query.q.trim()}%`;
      qb.andWhere('(p.passportNumber LIKE :search OR p.fullName LIKE :search OR p.eofficeAccount LIKE :search)', { search });
    }

    if (query?.usageStatus) {
      qb.andWhere('p.usageStatus = :usageStatus', { usageStatus: query.usageStatus });
    }

    qb.orderBy('p.createdAt', 'DESC').skip(skip).take(limit);

    const [entities, total] = await qb.getManyAndCount();

    const PASSPORT_TYPE_MAP: Record<string, string> = {
      DIPLOMATIC: 'Hộ chiếu ngoại giao',
      OFFICIAL: 'Hộ chiếu công vụ',
      ORDINARY: 'Hộ chiếu phổ thông',
    };

    const USAGE_STATUS_MAP: Record<string, string> = {
      STORING: 'Đang lưu trữ',
      IN_USE: 'Đang sử dụng',
      RETURNED: 'Vô hiệu hóa (Đã trả)',
    };

    const getUsageStatusBadge = (status: string) => {
      const configMap: Record<string, { text: string; color: string; bgColor: string; borderColor: string }> = {
        STORING: {
          text: 'Đang lưu trữ',
          color: '#007222',
          bgColor: '#D0FFDE',
          borderColor: '#6EB884',
        },
        IN_USE: {
          text: 'Đang sử dụng',
          color: '#0062AD',
          bgColor: '#DBEAFE',
          borderColor: '#82B8FF',
        },
        RETURNED: {
          text: 'Vô hiệu hóa (Đã trả)',
          color: '#DC2626',
          bgColor: '#FEE2E2',
          borderColor: '#F87171',
        },
      };
      const config = configMap[status] || {
        text: USAGE_STATUS_MAP[status] || status || 'Không xác định',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        borderColor: '#AEB5BE',
      };
      return `<div style="display:flex; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; align-items:center; justify-content:center; width:100%; height:30px; padding:0 16px; font-weight:700; font-size:14px; border-radius:15px; background:${config.bgColor}; color:${config.color}; border:1px solid ${config.borderColor};">${config.text}</div>`;
    };

    const data = entities.map(item => ({
      ...item,
      passportType: PASSPORT_TYPE_MAP[item.passportType] || item.passportType,
      usageStatus: getUsageStatusBadge(item.usageStatus),
      isOwnedByMe: idList.includes(item.eofficeAccount || '') || idList.includes(item.userId || '') || idList.includes(item.createdBy || ''),
    }));

    return {
      statusCode: 200,
      message: 'Lấy danh sách hộ chiếu cá nhân thành công',
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
