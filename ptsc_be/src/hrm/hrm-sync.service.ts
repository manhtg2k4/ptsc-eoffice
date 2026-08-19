import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { HrmSyncEmployeeDto } from './dto/hrm-sync.dto';
import { HrmCompareService } from './hrm-compare.service';
import { HrmHistoryService } from './hrm-history.service';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { HrmEmployeeQueryDto } from './dto/hrm-employee-query.dto';
import { SyncEmployeesDto } from './dto/sync-employees.dto';
import * as moment from 'moment';

@Injectable()
export class HrmSyncServiceNew {

  private readonly logger = new Logger(HrmSyncServiceNew.name);


  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepository: Repository<OrganizationUnitEntity>,
    private readonly compareService: HrmCompareService,
    private readonly historyService: HrmHistoryService,
  ) { }

  /**
   * Phương thức đồng bộ chính nhận DTO linh hoạt
   */
  async syncEmployees(syncDto: SyncEmployeesDto) {
    try {
      const effectiveStatus = syncDto?.status ?? 1;

      let hrmEmployees = this.extractEmployeesFromDto(syncDto);

      // Nếu không có dữ liệu, lấy từ bảng user để đồng bộ (phục vụ test hoặc re-sync)
      if (!Array.isArray(hrmEmployees) || hrmEmployees.length === 0) {
        hrmEmployees = await this.getEmployeesFromLocalDb();
      }

      if (!Array.isArray(hrmEmployees) || hrmEmployees.length === 0) {
        this.logger.warn('[HRM_SYNC] No employees found after extraction and local fetch');
        const lastHistory = await this.historyService.getLastSync();
        return {
          added: 0,
          updated: 0,
          unchanged: 0,
          total: 0,
          lastSyncTime: this.formatDateTime(lastHistory?.syncTime),
          message: 'Không tìm thấy danh sách nhân viên để đồng bộ',
        };
      }

      // Lọc theo trạng thái hiệu lực
      const filteredEmployees = hrmEmployees.filter((item) => {
        if (!item) return false;
        const itemStatus = Number(item.status ?? 1);
        return itemStatus === effectiveStatus;
      });

      return this.sync(filteredEmployees);
    } catch (error) {
      this.logger.error(`[HRM_SYNC] Crash in syncEmployees: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu từ bảng user hiện tại để dùng làm payload đồng bộ
   */
  public async getEmployeesFromLocalDb(): Promise<HrmSyncEmployeeDto[]> {
    const users = await this.userRepository.find({
      where: { status: 1 },
    });

    return users.map((user) => ({
      name: user.name,
      emailUser: user.emailUser || undefined,
      phoneNumberUser: user.phoneNumberUser || undefined,
      position: user.position || undefined,
      codeND: user.codeND || '',
      birthday: user.birthday && !isNaN(new Date(user.birthday).getTime())
        ? new Date(user.birthday).toISOString()
        : undefined,
      gender: user.gender || undefined,
      identificationCard: user.identificationCard || undefined,
      status: user.status ?? 1,
      leader: user.leader || undefined,
      department: user.organizationCode || undefined,
    }));
  }


  /**
   * Logic đồng bộ nghiệp vụ (giữ nguyên quy tắc source code cũ)
   */
  async sync(payload: HrmSyncEmployeeDto[]) {
    const startedAt = new Date();

    const activeEmployees = (payload || []).filter((item) => item.codeND);
    const total = activeEmployees.length;
    if (!total) {
      const lastHistory = await this.historyService.getLastSync();
      return {
        added: 0,
        updated: 0,
        unchanged: 0,
        total: 0,
        lastSyncTime: this.formatDateTime(lastHistory?.syncTime),
      };
    }

    const normalized = activeEmployees.map((item) => this.compareService.normalize(item));
    const uniqueByCode = new Map<string, (typeof normalized)[number]>();
    for (const employee of normalized) {
      uniqueByCode.set(employee.codeND, employee);
    }
    const deduped = Array.from(uniqueByCode.values());
    const codeNds = deduped.map((item) => item.codeND);

    const existingUsers = await this.userRepository.find({
      where: { codeND: In(codeNds) },
    });
    const existingByCode = new Map(existingUsers.map((u) => [u.codeND, u]));

    const toInsert: UserEntity[] = [];
    const toUpdate: UserEntity[] = [];
    let unchanged = 0;

    for (const item of deduped) {
      const existing = existingByCode.get(item.codeND);
      if (!existing) {
        const created = this.userRepository.create({
          ...item,
          username: item.codeND,
          password: null,
        });
        toInsert.push(created);
        continue;
      }

      if (!this.compareService.hasChanged(existing, item)) {
        unchanged++;
        continue;
      }

      Object.assign(existing, item);
      toUpdate.push(existing);
    }

    if (toInsert.length) {
      await this.userRepository.save(toInsert, { chunk: 200 });
    }
    if (toUpdate.length) {
      await this.userRepository.save(toUpdate, { chunk: 200 });
    }

    const history = await this.historyService.writeHistory({
      added: toInsert.length,
      updated: toUpdate.length,
      unchanged,
      total: deduped.length,
    });


    return {
      added: toInsert.length,
      updated: toUpdate.length,
      unchanged,
      total: deduped.length,
      lastSyncTime: this.formatDateTime(history.syncTime),
    };
  }

  private extractEmployeesFromDto(dto: SyncEmployeesDto): HrmSyncEmployeeDto[] {
    if (!dto) return [];

    const candidates = [
      dto.employees,
      dto.data,
      dto.payload,
      dto.items,
      dto.result,
      (dto as any).records,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        // Kiểm tra xem có đúng là mảng nhân viên không
        const first = candidate[0];
        if (first && typeof first === 'object' && ((first as any).codeND || (first as any).employee_number)) {
          return candidate.map(item => ({
            ...item,
            codeND: (item as any).codeND || (item as any).employee_number
          }));
        }
      }
    }

    // Nếu dto chính là một mảng
    if (Array.isArray(dto)) {
      return dto;
    }

    return [];
  }

  async getDashboard() {
    try {
      const totalEmployeeResult = await this.userRepository.createQueryBuilder('u')
        .select('COUNT(DISTINCT u.codeND)', 'count')
        .where('u.codeND IS NOT NULL AND u.codeND != \'\'')
        .andWhere('u.status = 1')
        .getRawOne();
      const totalEmployee = parseInt(totalEmployeeResult.count, 10) || 0;

      const working = totalEmployee;



      const departments = await this.organizationUnitRepository.count({
        where: { status: 1 },
      });
      const updatedToday = await this.historyService.getTodayUpdatedCount();
      const lastSync = await this.historyService.getLastSync();

      return {
        totalEmployee,
        working,
        departments,
        updatedToday,
        lastSyncTime: this.formatDateTime(lastSync?.syncTime),
      };
    } catch (error) {
      this.logger.error(`[HRM_DASHBOARD] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEmployees(query: HrmEmployeeQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;

    const qb = this.userRepository.createQueryBuilder('u');
    qb.where('u.codeND IS NOT NULL AND u.codeND != \'\'')
      .andWhere('u.status = 1')
      .andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('MIN(u2.id)')
          .from(UserEntity, 'u2')
          .where('u2.codeND = u.codeND')
          .getQuery();
        return 'u.id = (' + subQuery + ')';
      });



    const filter = query.filter || {};

    // Nhóm các trường tìm kiếm nhanh (Sử dụng OR)
    if (filter.name || filter.email || filter.phone || filter.codeND) {
      qb.andWhere(new Brackets(sb => {
        if (filter.name) {
          sb.orWhere('u.name COLLATE Vietnamese_CI_AI LIKE :name COLLATE Vietnamese_CI_AI', { name: `%${filter.name}%` });
        }
        if (filter.email) {
          sb.orWhere('u.emailUser COLLATE Vietnamese_CI_AI LIKE :email COLLATE Vietnamese_CI_AI', { email: `%${filter.email}%` });
        }
        if (filter.phone) {
          sb.orWhere('u.phoneNumberUser COLLATE Vietnamese_CI_AI LIKE :phone COLLATE Vietnamese_CI_AI', { phone: `%${filter.phone}%` });
        }
        if (filter.codeND) {
          sb.orWhere('u.codeND COLLATE Vietnamese_CI_AI LIKE :codeND COLLATE Vietnamese_CI_AI', { codeND: `%${filter.codeND}%` });
        }
      }));
    }

    // Các bộ lọc nâng cao (Sử dụng AND)
    if (filter.department) {
      qb.andWhere('u.organizationCode LIKE :department', { department: `%${filter.department}%` });
    }
    if (filter.position) {
      qb.andWhere('u.position COLLATE Vietnamese_CI_AI LIKE :position COLLATE Vietnamese_CI_AI', { position: `%${filter.position}%` });
    }

    qb.orderBy('u.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const mappedData = data.map(user => {
      const item: any = {};
      item.id = user.id;
      if (user.name) item.name = user.name;
      if (user.emailUser) item.emailUser = user.emailUser;
      if (user.codeND) item.codeND = user.codeND;
      if (user.birthday) item.birthday = moment(user.birthday).format('DD/MM/YYYY');
      if (user.identificationCard) item.identificationCard = user.identificationCard;
      if (user.status !== undefined) item.status = user.status;

      // Các trường bổ sung theo yêu cầu
      item.organizationName = user.organizationName || '';
      item.leader = user.leader || '';
      item.ngayVaoCang = user.ngayVaoCang ? this.formatDateTime(user.ngayVaoCang) : '';
      item.createdAt = user.createdAt ? moment(user.createdAt).format('DD/MM/YYYY') : '';
      item.position = user.position || '';

      return item;

    });


    return {
      data: mappedData,

      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEmployeeDetail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id: id, status: 1 },
    });

    if (!user) {
      return null;
    }

    // Trả về toàn bộ thông tin chi tiết, format các trường ngày tháng
    return {
      ...user,
      ngayVaoCang: user.ngayVaoCang ? this.formatDateTime(user.ngayVaoCang) : null,
      createdAt: user.createdAt ? this.formatDateTime(user.createdAt) : null,
      updatedAt: user.updatedAt ? this.formatDateTime(user.updatedAt) : null,
      birthday: user.birthday ? this.formatDateTime(new Date(user.birthday)) : null,
      joinDateState: user.joinDateState ? this.formatDateTime(user.joinDateState) : null,
      passportExpireDate: user.passportExpireDate ? this.formatDateTime(user.passportExpireDate) : null,
      terminationDate: user.terminationDate ? this.formatDateTime(user.terminationDate) : null,
      contactTime: user.contactTime ? this.formatDateTime(user.contactTime) : null,
    };
  }

  private formatDateTime(value?: Date | string): string | null {
    if (!value) return null;
    return moment(value).format('YYYY-MM-DD HH:mm:ss');
  }
}

