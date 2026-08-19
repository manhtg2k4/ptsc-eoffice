import { Injectable, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Subject } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import axios from 'axios';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity, RolesByProcess, RoleItem } from 'src/users/entities/user.entity';
import { AuthConfigEntity } from 'src/auth-config/entities/auth-config.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { HrmJobMappingEntity } from 'src/group-users/entities/hrm-job-mapping.entity';

@Injectable()
export class HrmSyncService {
  private readonly logger = new Logger(HrmSyncService.name);
  private readonly progressSubject = new Subject<{ percentage: number; message: string; stage: string; current?: number; total?: number }>();

  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(AuthConfigEntity, 'mssqlConnection')
    private readonly authConfigRepository: Repository<AuthConfigEntity>,

    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,

    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private readonly organizationUnitRepository: Repository<OrganizationUnitEntity>,

    @InjectRepository(HrmJobMappingEntity, 'mssqlConnection')
    private readonly hrmJobMappingRepository: Repository<HrmJobMappingEntity>,

    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  getProgress() {
    return this.progressSubject.asObservable();
  }

  /**
   * Cron job chạy vào 3:00 sáng hàng ngày để đồng bộ dữ liệu HRM
   */
  @SafeCron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleCronSync() {
    try {
      await this.sync();
    } catch (error) {
      this.logger.error(`❌ Cron job đồng bộ HRM thất bại: ${error.message}`);
    }
  }

  async getHrmConfig() {
    // Sử dụng trực tiếp process.env theo yêu cầu
    const baseUrl = process.env.HRM_API_URL;
    const apiKey = process.env.HRM_API_KEY;

    if (baseUrl && apiKey) {
      return { baseUrl, apiKey };
    }

    this.logger.warn('⚠️ Thiếu cấu hình HRM_API_URL hoặc HRM_API_KEY trong file .env');
    return null;
  }

  async getHrmJobs() {
    const config = await this.getHrmConfig();
    if (!config) return [];

    const { baseUrl, apiKey } = config;
    const axiosInstance = axios.create({
      baseURL: `${baseUrl}/api/v1`,
      headers: { 'X-Api-Key': apiKey },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 600000,
    });

    try {
      const response = await axiosInstance.get('/jobs');
      return response.data.data;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi lấy danh sách Jobs từ HRM: ${error.message}`);
      return [];
    }
  }

  // async sync() {
  //   // 0% - Bắt đầu đồng bộ
  //   this.progressSubject.next({ percentage: 0, message: 'Bắt đầu quá trình đồng bộ HRM...', stage: 'start' });
  //   const config = await this.getHrmConfig();
  //   if (!config) return;

  //   const { baseUrl, apiKey } = config;
  //   const axiosInstance = axios.create({
  //     baseURL: `${baseUrl}/api/v1`,
  //     headers: { 'X-Api-Key': apiKey },
  //     httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  //   });

  //   try {
  //     // 1. Đồng bộ Phòng ban (Organization Units)
  //     const orgUrl = `${baseUrl}/organization-units`;
  //     this.progressSubject.next({ percentage: 5, message: 'Đang tải phòng ban từ HRM...', stage: 'departments' });
  //     this.logger.log(`🔄 Đang gọi API đồng bộ phòng ban: GET ${orgUrl}`);
      
  //     const orgResponse = await axiosInstance.get('/organization-units');
  //     const hrmOrgs = orgResponse.data.data || [];
  //     this.logger.log(`📦 Nhận về ${hrmOrgs.length} đơn vị phòng ban từ HRM.`);

  //     // GIAI ĐOẠN 1: Lưu tạm vào Redis (Staging)
  //     const REDIS_ORG_KEY = 'sync:hrm_org_units';
  //     await this.redis.del(REDIS_ORG_KEY);
  //     const pipeline = this.redis.pipeline();
  //     for (const hrmOrg of hrmOrgs) {
  //       pipeline.hset(REDIS_ORG_KEY, hrmOrg.id.toString(), JSON.stringify(hrmOrg));
  //     }
  //     await pipeline.exec();
  //     this.logger.log(`💾 Đã lưu tạm ${hrmOrgs.length} phòng ban vào Redis.`);

  //     // GIAI ĐOẠN 2: Dựng cây và Đồng bộ theo cấu trúc phân cấp (BFS)
  //     this.progressSubject.next({ percentage: 10, message: 'Đang dựng cây và đồng bộ phòng ban...', stage: 'departments' });
      
  //     const hrmIdToDbId = new Map<string, string>(); // Map ánh xạ ID HRM -> ID DB thực tế
  //     const hrmIdToChildrenMap = new Map<string | null, any[]>(); // Map để dựng cây
  //     const allHrmOrgsMap = new Map<string, any>(); // Map để tra cứu nhanh dữ liệu gốc

  //     // 2.1 Chuẩn bị dữ liệu để dựng cây
  //     for (const hrmOrg of hrmOrgs) {
  //       const idStr = hrmOrg.id.toString();
  //       const parentIdStr = hrmOrg.parent_id ? hrmOrg.parent_id.toString() : null;
        
  //       allHrmOrgsMap.set(idStr, hrmOrg);
  //       let children = hrmIdToChildrenMap.get(parentIdStr);
  //       if (!children) {
  //         children = [];
  //         hrmIdToChildrenMap.set(parentIdStr, children);
  //       }
  //       children.push(hrmOrg);
  //     }

  //     // 2.2 Xác định các nút Gốc (Root)
  //     // Nút gốc là nút có parent_id là null HOẶC parent_id không tồn tại trong danh sách hrmOrgs
  //     const roots = hrmOrgs.filter(o => !o.parent_id || !allHrmOrgsMap.has(o.parent_id.toString()));
  //     this.logger.log(`🌳 Tìm thấy ${roots.length} đơn vị cấp gốc.`);

  //     // 2.3 Duyệt cây bằng BFS (Breadth-First Search) để đảm bảo Cha luôn xong trước Con
  //     const queue = [...roots];
  //     let processedUnits = 0;

  //     while (queue.length > 0) {
  //       const hrmOrg = queue.shift();
  //       const hrmIdStr = hrmOrg.id.toString();
        
  //       // Tìm kiếm linh hoạt: Ưu tiên theo ID HRM, sau đó đến CODE
  //       let org = await this.organizationUnitRepository.findOne({ 
  //         where: [
  //           { id: hrmIdStr },
  //           { code: hrmOrg.code }
  //         ]
  //       });

  //       // Lấy ID cha thực tế từ Map (nếu có)
  //       const localParentId = hrmOrg.parent_id ? hrmIdToDbId.get(hrmOrg.parent_id.toString()) : null;

  //       const orgData = {
  //         name: hrmOrg.name_vn,
  //         nameEn: hrmOrg.name_en,
  //         parentId: localParentId,
  //         blockId: hrmOrg.block_id?.toString() || null,
  //         remark: hrmOrg.remark || null,
  //         status: 1,
  //         order: hrmOrg.order || 0,
  //       };

  //       if (org) {
  //         Object.assign(org, orgData);
  //         org = await this.organizationUnitRepository.save(org);
  //       } else {
  //         org = this.organizationUnitRepository.create({
  //           id: hrmIdStr,
  //           code: hrmOrg.code,
  //           ...orgData,
  //           mpath: '',
  //         });
  //         org = await this.organizationUnitRepository.save(org);
  //       }

  //       // Lưu ánh xạ ID và đánh dấu đã xử lý
  //       hrmIdToDbId.set(hrmIdStr, org.id);
  //       processedUnits++;

  //       // Đẩy các con của nút này vào hàng đợi để xử lý tiếp
  //       const children = hrmIdToChildrenMap.get(hrmIdStr);
  //       if (children) {
  //         queue.push(...children);
  //       }

  //       // Cập nhật tiến độ nhỏ
  //       if (processedUnits % 10 === 0 || processedUnits === hrmOrgs.length) {
  //         const orgPercentage = 10 + Math.floor((processedUnits / hrmOrgs.length) * 10);
  //         this.progressSubject.next({ 
  //           percentage: orgPercentage, 
  //           message: `Đã đồng bộ ${processedUnits}/${hrmOrgs.length} phòng ban`, 
  //           stage: 'departments' 
  //         });
  //       }
  //     }

  //     await this.redis.del(REDIS_ORG_KEY);
  //     this.logger.log(`✅ Hoàn thành đồng bộ cây phòng ban. (Đã xử lý: ${processedUnits}/${hrmOrgs.length})`);

  //     // 2. Lấy danh sách HRM Jobs để map ID -> Code (Không còn tự động tạo nhóm)
  //     const jobUrl = `${baseUrl}/jobs`;
  //     this.progressSubject.next({ percentage: 20, message: 'Đang tải danh sách chức danh HRM...', stage: 'jobs' });
  //     this.logger.log(`🔄 Đang gọi API lấy danh sách chức danh: GET ${jobUrl}`);
      
  //     const jobResponse = await axiosInstance.get('/jobs');
  //     const hrmJobsArr = jobResponse.data.data || [];
  //     this.logger.log(`📋 Nhận về ${hrmJobsArr.length} chức danh từ HRM.`);
      
  //     const hrmJobIdToCodeMap = new Map<number, string>();
  //     for (const j of hrmJobsArr) {
  //       hrmJobIdToCodeMap.set(j.id, j.code);
  //     }

  //     // 2.1 Lấy toàn bộ mapping đã cấu hình
  //     const allMappings = await this.hrmJobMappingRepository.find();
  //     this.logger.log(`🔗 Tìm thấy ${allMappings.length} quy tắc ánh xạ chức danh -> nhóm người dùng.`);
      
  //     const jobCodeToGroupIdsMap = new Map<string, string[]>();
  //     for (const m of allMappings) {
  //       if (!jobCodeToGroupIdsMap.has(m.hrmJobCode)) {
  //         jobCodeToGroupIdsMap.set(m.hrmJobCode, []);
  //       }
  //       const groupIds = jobCodeToGroupIdsMap.get(m.hrmJobCode);
  //       if (groupIds) {
  //         groupIds.push(m.groupUserId);
  //       }
  //     }

  //     // 2.2 Tải cache cho GroupUserRepository để tránh gọi DB liên tục trong loop
  //     this.logger.log('📦 Đang tải bộ nhớ đệm cho các nhóm người dùng...');
  //     const allGroupIdsReferenced = Array.from(jobCodeToGroupIdsMap.values()).flat();
  //     const uniqueGroupIds = [...new Set(allGroupIdsReferenced)];
  //     const groupsCache = await this.groupUserRepository.find({
  //       where: { id: In(uniqueGroupIds) }
  //     });
  //     const groupsMap = new Map<string, GroupUserEntity>();
  //     for (const g of groupsCache) {
  //       groupsMap.set(g.id, g);
  //     }

  //     // 3. Đồng bộ Nhân viên (Employees)
  //     const empUrl = `${baseUrl}/employees`;
  //     this.progressSubject.next({ percentage: 40, message: 'Đang tải danh sách nhân viên từ HRM...', stage: 'employees' });
  //     this.logger.log(`🔄 Đang gọi API danh sách nhân viên: GET ${empUrl}`);
      
  //     const empResponse = await axiosInstance.get('/employees');
  //     const hrmEmps = empResponse.data.data || [];
  //     const totalEmps = hrmEmps.length;
  //     this.logger.log(`📦 Nhận về ${totalEmps} nhân viên từ HRM.`);

  //     // GIAI ĐOẠN 1: Lưu tạm Nhân viên vào Redis (Staging)
  //     const REDIS_EMP_KEY = 'sync:hrm_employees';
  //     await this.redis.del(REDIS_EMP_KEY);
  //     const empPipeline = this.redis.pipeline();
  //     for (const hrmEmp of hrmEmps) {
  //       empPipeline.hset(REDIS_EMP_KEY, hrmEmp.employee_number.toString(), JSON.stringify(hrmEmp));
  //     }
  //     await empPipeline.exec();
  //     this.logger.log(`💾 Đã lưu tạm ${hrmOrgs.length} nhân viên vào Redis.`);

  //     // 3.1 Tải toàn bộ USER hiện có vào Map theo codeND và username để tra cứu O(1)
  //     this.logger.log('🗂️ Đang xây dựng bộ nhớ đệm người dùng hiện tại (MSSQL)...');
  //     this.progressSubject.next({ percentage: 45, message: 'Đang chuẩn bị dữ liệu đối chiếu...', stage: 'employees' });
  //     const allLocalUsers = await this.userRepository.find({
  //       relations: ['groupUsers']
  //     });
  //     const userByCodeNDMap = new Map<string, UserEntity>();
  //     const userByUsernameMap = new Map<string, UserEntity>();
  //     for (const u of allLocalUsers) {
  //       if (u.codeND) userByCodeNDMap.set(u.codeND.trim(), u);
  //       if (u.username) userByUsernameMap.set(u.username.trim(), u);
  //     }

  //     const parseDate = (dateStr: string) => {
  //       if (!dateStr) return null;
  //       const d = new Date(dateStr);
  //       return isNaN(d.getTime()) ? null : d;
  //     };

  //     let successCount = 0;
  //     let failCount = 0;
  //     let updateCount = 0;
  //     let createCount = 0;
  //     let reactivateCount = 0;

  //     // 3.2 Xử lý theo LÔ từ Redis để "xử lý dần" theo yêu cầu
  //     const allEmpKeys = await this.redis.hkeys(REDIS_EMP_KEY);
  //     const batchSize = 100;
  //     this.logger.log(`🚀 Bắt đầu xử lý đồng bộ từ Redis cho ${allEmpKeys.length} nhân viên...`);

  //     for (let i = 0; i < allEmpKeys.length; i += batchSize) {
  //       const batchKeys = allEmpKeys.slice(i, i + batchSize);
  //       const batchData = await this.redis.hmget(REDIS_EMP_KEY, ...batchKeys);
        
  //       // Nhường quyền thực thi cho Event Loop
  //       await new Promise(resolve => setImmediate(resolve));

  //       for (const rawData of batchData) {
  //         if (!rawData) continue;
  //         const hrmEmp = JSON.parse(rawData);
          
  //         try {
  //           const employeeNumber = (hrmEmp.employee_number || '').trim();
  //           if (!employeeNumber) continue;

  //           const userData = {
  //             name: hrmEmp.name_vn,
  //             nameEn: hrmEmp.name_en,
  //             emailUser: hrmEmp.email,
  //             phoneNumberUser: hrmEmp.mobile_phone || null,
  //             addressUser: hrmEmp.per_address || null,
  //             birthday: parseDate(hrmEmp.date_of_birth),
  //             gender: hrmEmp.gender || null,
  //             identificationCard: hrmEmp.idno || null,
  //             jobId: hrmEmp.job_id || null,
  //             workerTypeId: hrmEmp.worker_type_id || null,
  //             armyRankId: hrmEmp.id_quan_ham || null,
  //             passportNumber: hrmEmp.pass_number || null,
  //             passportExpireDate: parseDate(hrmEmp.pass_expire_date),
  //             joinDateState: parseDate(hrmEmp.join_date_state),
  //             ngayVaoCang: parseDate(hrmEmp.ngay_vao_cang),
  //             terminationDate: parseDate(hrmEmp.ter_effect_date),
  //             terminationReason: hrmEmp.ter_reason || null,
  //             remark: hrmEmp.remark || null,
  //             parent: hrmEmp.organization_unit_id && hrmIdToDbId.get(hrmEmp.organization_unit_id.toString()) 
  //               ? ({ id: hrmIdToDbId.get(hrmEmp.organization_unit_id.toString()) } as any) 
  //               : null,
  //           };

  //           // Tra cứu từ Map cache thay vì gọi DB
  //           let user = userByCodeNDMap.get(employeeNumber) || userByUsernameMap.get(employeeNumber);

  //           if (user) {
  //             if (user.status === 3) reactivateCount++;
  //             else updateCount++;

  //             user.status = 1; 
  //             user.codeND = employeeNumber; 
  //             Object.assign(user, userData);
              
  //             if (hrmEmp.job_id) {
  //               const jobCode = hrmJobIdToCodeMap.get(hrmEmp.job_id);
  //               if (jobCode) {
  //                 const groupIds = jobCodeToGroupIdsMap.get(jobCode) || [];
  //                 if (groupIds.length > 0) {
  //                   const currentGroupIds = user.groupUsers?.map(g => g.id) || [];
  //                   const newGroups = groupIds
  //                     .map(id => groupsMap.get(id))
  //                     .filter((g): g is GroupUserEntity => !!g && !currentGroupIds.includes(g.id));
                    
  //                   if (newGroups.length > 0) {
  //                     user.groupUsers = [...(user.groupUsers || []), ...newGroups];
  //                   }
  //                 }
  //               }
  //             }
  //           } else {
  //             createCount++;
  //             user = this.userRepository.create({
  //               id: uuidv4(),
  //               username: employeeNumber,
  //               codeND: employeeNumber,
  //               ...userData,
  //               status: 1,
  //               password: await bcrypt.hash('12345678', 10),
  //               groupUsers: [],
  //             });

  //             if (hrmEmp.job_id) {
  //               const jobCode = hrmJobIdToCodeMap.get(hrmEmp.job_id);
  //               if (jobCode) {
  //                 const groupIds = jobCodeToGroupIdsMap.get(jobCode) || [];
  //                 user.groupUsers = groupIds
  //                   .map(id => groupsMap.get(id))
  //                   .filter((g): g is GroupUserEntity => !!g);
  //               }
  //             }
  //           }

  //           // Tự động cập nhật quyền (Inline logic của updateUserPermissions để tránh thêm save)
  //           const groups = user.groupUsers || [];
  //           let updatedRolesByProcess: RolesByProcess[] = [];
  //           for (const group of groups) {
  //             if (group.status === 1 && group.roleType === 'dynamic' && group.roles_dynamic?.length) {
  //               const mapped = this.mapRolesDynamicToRolesByProcess(group.roles_dynamic, group.id);
  //               updatedRolesByProcess = this.mergeRolesByProcess(updatedRolesByProcess, mapped);
  //             }
  //           }
  //           user.rolesByProcess = updatedRolesByProcess;

  //           await this.userRepository.save(user);
  //           successCount++;
  //         } catch (err) {
  //           failCount++;
  //           this.logger.error(`❌ Lỗi đồng bộ nhân viên ${hrmEmp.employee_number}: ${err.message}`);
  //         }
  //       }

  //       // Báo cáo tiến độ sau mỗi lô
  //       const processedCount = Math.min(i + batchSize, totalEmps);
  //       const currentPercentage = 50 + (processedCount / totalEmps) * 50;
  //       this.progressSubject.next({
  //         percentage: Math.min(Math.round(currentPercentage), 99),
  //         message: `Đang xử lý nhân viên ${processedCount}/${totalEmps}`,
  //         stage: 'employees',
  //         current: processedCount,
  //         total: totalEmps,
  //       });
  //     }

  //     await this.redis.del(REDIS_EMP_KEY);
  //     this.progressSubject.next({ percentage: 100, message: 'Hoàn thành đồng bộ HRM.', stage: 'completed' });
  //     this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //     this.logger.log('✅ HOÀN THÀNH ĐỒNG BỘ HRM (Employees)');
  //     this.logger.log(`   - Tổng số nhân viên: ${totalEmps}`);
  //     this.logger.log(`   - Thành công: ${successCount}`);
  //     this.logger.log(`   - Thất bại: ${failCount}`);
  //     this.logger.log(`   - Chi tiết: ${createCount} tạo mới, ${updateCount} cập nhật, ${reactivateCount} kích hoạt lại`);
  //     this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  //   } catch (error) {
  //     const REDIS_ORG_KEY = 'sync:hrm_org_units';
  //     const REDIS_EMP_KEY = 'sync:hrm_employees';
  //     await this.redis.del(REDIS_ORG_KEY);
  //     await this.redis.del(REDIS_EMP_KEY);
  //     this.progressSubject.next({ percentage: 100, message: `Lỗi đồng bộ: ${error.message}`, stage: 'error' });
  //     this.logger.error(`❌ Lỗi trong quá trình đồng bộ HRM: ${error.message}`, error.stack);
  //     throw new HttpException(`Lỗi đồng bộ HRM: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

async sync() {
  const syncStartTime = Date.now();
  this.progressSubject.next({ percentage: 0, message: 'Bắt đầu quá trình đồng bộ HRM...', stage: 'start' });

  const config = await this.getHrmConfig();
  if (!config) return;

  const { baseUrl, apiKey } = config;
  const axiosInstance = axios.create({
    baseURL: `${baseUrl}/api/v1`,
    headers: { 'X-Api-Key': apiKey },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    timeout: 600_000, // 10 phút
  });

  // =========================================================================
  // Axios interceptor — đo thời gian MỌI request HRM tự động
  // =========================================================================
  axiosInstance.interceptors.request.use((config) => {
    (config as any).__startTime = Date.now();
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      const elapsed     = Date.now() - (response.config as any).__startTime;
      const recordCount = Array.isArray(response.data?.data) ? response.data.data.length : '?';
      const slow        = elapsed > 10_000 ? ' 🐢 CHẬM!' : '';
      if (elapsed > 30_000) {
        this.logger.warn(
          `🚨 [HRM TIMEOUT RISK] ${response.config.url} mất ${elapsed}ms — vượt 30s!`,
        );
      }
      return response;
    },
    (error) => {
      const elapsed    = error.config?.__startTime ? Date.now() - error.config.__startTime : -1;
      const url        = error.config?.url ?? 'unknown';
      const code       = error.code ?? 'UNKNOWN';
      const httpStatus = error.response?.status ?? 'no-response';
      this.logger.error(
        `❌ [HRM ERROR] ${url} → code=${code} | HTTP=${httpStatus} | ${elapsed}ms | ${error.message}`,
      );
      if (code === 'ECONNABORTED') {
        this.logger.error(`   ⛔ TIMEOUT tại ${url} sau ${elapsed}ms`);
      }
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
        this.logger.error(`   ⛔ Không thể kết nối HRM server: ${baseUrl}`);
      }
      return Promise.reject(error);
    },
  );

  const REDIS_EMP_KEY = 'sync:hrm_employees';

  // =========================================================================
  // Helper: MERGE org theo chunk — bypass TypeORM tree recalculation
  // Thay vì repository.save() gây 18s, dùng raw MERGE SQL ~1-3s
  // =========================================================================
  const orgTableName = this.organizationUnitRepository.metadata.tableName;

  const mergeOrgChunk = async (
    qr: any,
    chunk: any[],
  ): Promise<void> => {
    if (!chunk.length) return;

    // TypeORM MSSQL driver dùng positional params @p0, @p1, ...
    // KHÔNG hỗ trợ named params (@id0, @name0...) trong manager.query()
    const FIELDS_PER_ROW = 8; // id, name, nameEn, parentId, blockId, remark, status, order
    const params: any[] = [];

    const valuePlaceholders = chunk
      .map((e, i) => {
        const base = i * FIELDS_PER_ROW;
        params.push(
          e.id,
          e.name     ?? null,
          e.nameEn   ?? null,
          e.parentId ?? null,
          e.blockId  ?? null,
          e.remark   ?? null,
          e.status   ?? 1,
          e.order    ?? 0,
        );
        return `(@p${base}, @p${base+1}, @p${base+2}, @p${base+3}, @p${base+4}, @p${base+5}, @p${base+6}, @p${base+7})`;
      })
      .join(',\n        ');

    // Truyền params[] theo positional order
    await qr.manager.query(`
      MERGE [${orgTableName}] AS target
      USING (VALUES
        ${valuePlaceholders}
      ) AS source (id, name, nameEn, parentId, blockId, remark, status, [order])
        ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET
        target.name     = source.name,
        target.nameEn   = source.nameEn,
        target.parentId = source.parentId,
        target.blockId  = source.blockId,
        target.remark   = source.remark,
        target.status   = source.status,
        target.[order]  = source.[order],
        target.code     = source.code
      WHEN NOT MATCHED THEN INSERT
        (id, name, nameEn, parentId, blockId, remark, status, [order], mpath, code)
      VALUES
        (source.id, source.name, source.nameEn, source.parentId,
         source.blockId, source.remark, source.status, source.[order], '', '');
    `, params);
  };

  try {
    // =========================================================================
    // BƯỚC 1: Đồng bộ Phòng ban (Organization Units)
    //
    // FIX CHÍNH: Dùng raw MERGE SQL thay vì repository.save()
    // → Từ 18.9s xuống ~1-3s, không chiếm hết MSSQL connection pool
    // =========================================================================
    this.progressSubject.next({ percentage: 5, message: 'Đang tải phòng ban từ HRM...', stage: 'departments' });

    const orgApiStart = Date.now();
    const orgResponse = await axiosInstance.get('/organization-units');

    const hrmOrgs: any[] = orgResponse.data.data || [];

    this.progressSubject.next({ percentage: 7, message: 'Đang tải phòng ban từ DB...', stage: 'departments' });

    const dbOrgStart   = Date.now();
    const existingOrgs = await this.organizationUnitRepository.find();

    const existingOrgById   = new Map(existingOrgs.map(o => [o.id, o]));
    const existingOrgByCode = new Map(existingOrgs.map(o => [o.code, o]));

    this.progressSubject.next({ percentage: 9, message: 'Đang dựng cây phòng ban...', stage: 'departments' });

    const allHrmOrgsMap      = new Map<string, any>();
    const hrmIdToChildrenMap = new Map<string | null, any[]>();

    for (const hrmOrg of hrmOrgs) {
      const idStr       = hrmOrg.id.toString();
      const parentIdStr = hrmOrg.parent_id ? hrmOrg.parent_id.toString() : null;
      allHrmOrgsMap.set(idStr, hrmOrg);
      if (!hrmIdToChildrenMap.has(parentIdStr)) hrmIdToChildrenMap.set(parentIdStr, []);
      hrmIdToChildrenMap.get(parentIdStr)!.push(hrmOrg);
    }

    const roots = hrmOrgs.filter(
      o => !o.parent_id || !allHrmOrgsMap.has(o.parent_id.toString()),
    );

    const hrmIdToDbId  = new Map<string, string>();
    const orgsByLevel: Array<Array<{ entity: any; isNew: boolean }>> = [];

    const bfsQueue: Array<{ hrmOrg: any; level: number }> =
      roots.map(r => ({ hrmOrg: r, level: 0 }));
    let processedUnits = 0;

    while (bfsQueue.length > 0) {
      const { hrmOrg, level } = bfsQueue.shift()!;
      const hrmIdStr = hrmOrg.id.toString();

      const localParentId = hrmOrg.parent_id
        ? (hrmIdToDbId.get(hrmOrg.parent_id.toString()) ?? null)
        : null;

      const orgData = {
        name:     hrmOrg.name_vn,
        nameEn:   hrmOrg.name_en,
        parentId: localParentId,
        blockId:  hrmOrg.block_id?.toString() || null,
        remark:   hrmOrg.remark || null,
        status:   1,
        order:    hrmOrg.order || 0,
      };

      let org   = existingOrgById.get(hrmIdStr) ?? existingOrgByCode.get(hrmOrg.code);
      let isNew = false;

      if (org) {
        Object.assign(org, orgData);
      } else {
        isNew = true;
        org   = this.organizationUnitRepository.create({
          id:    hrmIdStr,
          code:  hrmOrg.code,
          mpath: '',
          ...orgData,
        });
      }

      hrmIdToDbId.set(hrmIdStr, org.id);
      processedUnits++;

      if (!orgsByLevel[level]) orgsByLevel[level] = [];
      orgsByLevel[level].push({ entity: org, isNew });

      const children = hrmIdToChildrenMap.get(hrmIdStr);
      if (children) {
        for (const child of children) bfsQueue.push({ hrmOrg: child, level: level + 1 });
      }
    }


    // ── Batch save theo level dùng MERGE — không trigger tree recalculation ──
    for (let lvl = 0; lvl < orgsByLevel.length; lvl++) {
      const items        = orgsByLevel[lvl];
      const newItems     = items.filter(i => i.isNew).map(i => i.entity);
      const updItems     = items.filter(i => !i.isNew).map(i => i.entity);
      const lvlSaveStart = Date.now();

      const qr = this.organizationUnitRepository.manager.connection.createQueryRunner();
      await qr.connect();
      try {
        await qr.startTransaction();
        try {
          // INSERT org mới — dùng insert() thuần, không trigger tree recalc
          for (let c = 0; c < newItems.length; c += 50) {
            const chunk = newItems.slice(c, c + 50);
            if (!chunk.length) continue;
            await qr.manager
              .createQueryBuilder()
              .insert()
              .into(this.organizationUnitRepository.target)
              .values(chunk)
              .execute();
          }

          // UPDATE org cũ — dùng MERGE SQL, 1 câu/50 records thay vì N queries
          for (let c = 0; c < updItems.length; c += 50) {
            await mergeOrgChunk(qr, updItems.slice(c, c + 50));
          }

          await qr.commitTransaction();
        } catch (err) {
          await qr.rollbackTransaction();
          throw err;
        }
      } finally {
        // Đảm bảo luôn release dù connect() hoặc startTransaction() có throw
        await qr.release();
      }


      const pct = 10 + Math.floor(((lvl + 1) / orgsByLevel.length) * 10);
      this.progressSubject.next({
        percentage: pct,
        message:    `Level ${lvl}: đã lưu ${items.length} phòng ban (${newItems.length} mới)`,
        stage:      'departments',
      });
    }

    // Fix 6: Warning về mpath chưa recalculate — tree materialized path sẽ stale
    this.logger.warn('⚠️ mpath recalculation chưa implemented — tree queries có thể sai nếu org hierarchy thay đổi');

    // =========================================================================
    // FIX 5: Deactivate org không còn trong HRM
    // =========================================================================
    const hrmOrgIds = new Set(hrmOrgs.map(o => o.id.toString()));
    const localOrgsToDeactivate = existingOrgs.filter(o => !hrmOrgIds.has(o.id));
    if (localOrgsToDeactivate.length > 0) {
      const deactivateOrgStart = Date.now();
      await this.organizationUnitRepository
        .createQueryBuilder()
        .update()
        .set({ status: 0 })
        .whereInIds(localOrgsToDeactivate.map(o => o.id))
        .execute();
    }

    // =========================================================================
    // BƯỚC 2: Tải Jobs và chuẩn bị mapping chức danh → nhóm
    // =========================================================================
    this.progressSubject.next({ percentage: 20, message: 'Đang tải chức danh HRM...', stage: 'jobs' });

    const jobApiStart = Date.now();
    const jobResponse = await axiosInstance.get('/jobs');

    const hrmJobsArr: any[] = jobResponse.data.data || [];

    const hrmJobIdToCodeMap = new Map<number, string>();
    for (const j of hrmJobsArr) hrmJobIdToCodeMap.set(j.id, j.code);

    const dbMappingStart = Date.now();
    const allMappings    = await this.hrmJobMappingRepository.find();

    const jobCodeToGroupIdsMap = new Map<string, string[]>();
    for (const m of allMappings) {
      if (!jobCodeToGroupIdsMap.has(m.hrmJobCode)) jobCodeToGroupIdsMap.set(m.hrmJobCode, []);
      jobCodeToGroupIdsMap.get(m.hrmJobCode)!.push(m.groupUserId);
    }

    const uniqueGroupIds = [...new Set([...jobCodeToGroupIdsMap.values()].flat())];
    const dbGroupStart   = Date.now();
    const groupsCache    = await this.groupUserRepository.find({ where: { id: In(uniqueGroupIds) } });

    const groupsMap = new Map<string, GroupUserEntity>(groupsCache.map(g => [g.id, g]));

    // =========================================================================
    // BƯỚC 3: Tải nhân viên từ HRM → staging vào Redis
    // =========================================================================
    this.progressSubject.next({ percentage: 30, message: 'Đang tải danh sách nhân viên từ HRM...', stage: 'employees' });

    const empApiStart = Date.now();
    const empResponse = await axiosInstance.get('/employees');
    const empApiMs    = Date.now() - empApiStart;
    if (empApiMs > 30_000) {
      this.logger.warn(`   🚨 /employees mất ${empApiMs}ms — nguy cơ timeout!`);
    }

    const hrmEmps: any[] = empResponse.data.data || [];
    const totalEmps      = hrmEmps.length;

    const redisStart  = Date.now();
    await this.redis.del(REDIS_EMP_KEY);
    const empPipeline = this.redis.pipeline();
    for (const hrmEmp of hrmEmps) {
      empPipeline.hset(REDIS_EMP_KEY, hrmEmp.employee_number.toString(), JSON.stringify(hrmEmp));
    }
    await empPipeline.exec();

    // =========================================================================
    // BƯỚC 4: Cache user DB để đối chiếu
    // =========================================================================
    this.progressSubject.next({ percentage: 40, message: 'Đang chuẩn bị dữ liệu đối chiếu...', stage: 'employees' });

    const dbUserStart   = Date.now();
    const allLocalUsers = await this.userRepository.find({
      select: ['id', 'username', 'codeND', 'status', 'emailUser'],
    });

    const userByCodeNDMap   = new Map<string, UserEntity>();
    const userByUsernameMap = new Map<string, UserEntity>();
    const userByEmailMap    = new Map<string, UserEntity>();
    const allLocalCodeNDs   = new Set<string>();

    for (const u of allLocalUsers) {
      if (u.codeND) {
        userByCodeNDMap.set(u.codeND.trim(), u);
        allLocalCodeNDs.add(u.codeND.trim());
      }
      if (u.username) userByUsernameMap.set(u.username.trim(), u);
      if (u.emailUser) userByEmailMap.set(u.emailUser.trim().toLowerCase(), u);
    }

    const bcryptStart         = Date.now();
    const defaultPasswordHash = await bcrypt.hash('12345678', 10);

    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const hrmEmployeeNumbers = new Set<string>();

    let successCount    = 0;
    let failCount       = 0;
    let updateCount     = 0;
    let createCount     = 0;
    let reactivateCount = 0;
    let deactivateCount = 0;

    // =========================================================================
    // BƯỚC 5: Xử lý nhân viên theo lô từ Redis
    // =========================================================================
    this.progressSubject.next({ percentage: 45, message: 'Bắt đầu xử lý nhân viên...', stage: 'employees' });

    const allEmpKeys   = await this.redis.hkeys(REDIS_EMP_KEY);
    const batchSize    = 100;
    const totalBatches = Math.ceil(allEmpKeys.length / batchSize);

    let totalRelationsMs = 0;
    let totalDbSaveMs    = 0;
    let totalProcessMs   = 0;

    for (let i = 0; i < allEmpKeys.length; i += batchSize) {
      const batchStartTime  = Date.now();
      const batchKeys       = allEmpKeys.slice(i, i + batchSize);
      const batchData       = await this.redis.hmget(REDIS_EMP_KEY, ...batchKeys);
      const currentBatchIdx = Math.floor(i / batchSize) + 1;

      // ── Phase A: Load relations cho batch ──────────────────────────────────
      const relStart       = Date.now();
      const batchUserIds: string[] = [];
      for (const rawData of batchData) {
        if (!rawData) continue;
        const hrmEmp         = JSON.parse(rawData);
        const employeeNumber = (hrmEmp.employee_number || '').trim();
        const liteUser       = userByCodeNDMap.get(employeeNumber) ?? userByUsernameMap.get(employeeNumber);
        if (liteUser) batchUserIds.push(liteUser.id);
      }

      const fullUsersMap = new Map<string, UserEntity>();
      if (batchUserIds.length > 0) {
        const fullUsers = await this.userRepository.find({
          where:     { id: In(batchUserIds) },
          relations: ['groupUsers'],
        });
        fullUsers.forEach(u => fullUsersMap.set(u.id, u));
      }
      const relMs = Date.now() - relStart;
      totalRelationsMs += relMs;

      // Nhường Event Loop
      await new Promise(resolve => setImmediate(resolve));

      // ── Phase B: Process từng nhân viên ────────────────────────────────────
      const processStart  = Date.now();
      const usersToSave: UserEntity[] = [];

      for (const rawData of batchData) {
        if (!rawData) continue;
        const hrmEmp = JSON.parse(rawData);

        try {
          const employeeNumber = (hrmEmp.employee_number || '').trim();
          if (!employeeNumber) continue;

          hrmEmployeeNumbers.add(employeeNumber);

          const isActiveInHrm   = !hrmEmp.work_status || hrmEmp.work_status === 'active';
          const terminationDate = parseDate(hrmEmp.ter_effect_date);
          // isTerminated = true khi work_status cho biết terminated, HOẶC có terminationDate <= now
          // Fix: không phụ thuộc terminationDate có null hay không
          const isTerminated    = !isActiveInHrm ||
            (hrmEmp.work_status === 'terminated' || hrmEmp.work_status === 3) ||
            (!!terminationDate && terminationDate <= new Date());

          const userData = {
            name:               hrmEmp.name_vn,
            nameEn:             hrmEmp.name_en,
            emailUser:          hrmEmp.email,
            phoneNumberUser:    hrmEmp.mobile_phone     || null,
            addressUser:        hrmEmp.per_address      || null,
            birthday:           parseDate(hrmEmp.date_of_birth),
            gender:             hrmEmp.gender           || null,
            identificationCard: hrmEmp.idno             || null,
            jobId:              hrmEmp.job_id           || null,
            workerTypeId:       hrmEmp.worker_type_id   || null,
            armyRankId:         hrmEmp.id_quan_ham      || null,
            passportNumber:     hrmEmp.pass_number      || null,
            passportExpireDate: parseDate(hrmEmp.pass_expire_date),
            joinDateState:      parseDate(hrmEmp.join_date_state),
            ngayVaoCang:        parseDate(hrmEmp.ngay_vao_cang),
            terminationDate,
            terminationReason:  hrmEmp.ter_reason       || null,
            remark:             hrmEmp.remark           || null,
            organizationCode:   hrmEmp.organization_unit_id
              ? (allHrmOrgsMap.get(hrmEmp.organization_unit_id.toString())?.code ?? null)
              : null,
            parent: hrmEmp.organization_unit_id && hrmIdToDbId.get(hrmEmp.organization_unit_id.toString())
              ? ({ id: hrmIdToDbId.get(hrmEmp.organization_unit_id.toString()) } as any)
              : null,
          };

          const email = hrmEmp.email?.trim().toLowerCase();
          const liteUserLookup = email && userByEmailMap.has(email)
            ? userByEmailMap.get(email)
            : (userByCodeNDMap.get(employeeNumber) ?? userByUsernameMap.get(employeeNumber));
          let user = liteUserLookup ? fullUsersMap.get(liteUserLookup.id) : null;

          if (user) {
            const wasTerminated = user.status === 3;

            if (isTerminated) {
              // user.status = 3;
            } else if (wasTerminated) {
              user.status = 1;
              reactivateCount++;
            } else {
              user.status = 1;
              updateCount++;
            }

            user.codeND = employeeNumber;
            Object.assign(user, userData);

            if (hrmEmp.job_id && !isTerminated) {
              const jobCode  = hrmJobIdToCodeMap.get(hrmEmp.job_id);
              const groupIds = jobCode ? (jobCodeToGroupIdsMap.get(jobCode) ?? []) : [];
              // Fix: THAY THẾ groups từ job mapping, không CỘNG THÊM
              // Nếu job_code không map trong config → groups = rỗng (revoke hết quyền HRM)
              user.groupUsers = groupIds
                .map(id => groupsMap.get(id))
                .filter((g): g is GroupUserEntity => !!g);

              // Log: gán user vào nhóm quyền từ job mapping
              const assignedGroupNames = user.groupUsers.map(g => g.name).join(', ');
            }
          } else {
            createCount++;
            const emailUsername = hrmEmp.email
              ? (hrmEmp.email.includes('@') ? hrmEmp.email.split('@')[0].trim() : hrmEmp.email.trim())
              : employeeNumber;
            user = this.userRepository.create({
              id:         uuidv4(),
              username:   emailUsername || employeeNumber,
              codeND:     employeeNumber,
              ...userData,
              status:     isTerminated ? 3 : 1,
              password:   defaultPasswordHash,
              groupUsers: [],
            });

            if (hrmEmp.job_id && !isTerminated) {
              const jobCode  = hrmJobIdToCodeMap.get(hrmEmp.job_id);
              const groupIds = jobCode ? (jobCodeToGroupIdsMap.get(jobCode) ?? []) : [];
              user.groupUsers = groupIds
                .map(id => groupsMap.get(id))
                .filter((g): g is GroupUserEntity => !!g);
            }
          }

          // Tính lại rolesByProcess từ groupUsers hiện tại
          const groups = user.groupUsers ?? [];
          let updatedRolesByProcess: RolesByProcess[] = [];
          for (const group of groups) {
            if (group.status === 1 && group.roleType === 'dynamic' && group.roles_dynamic?.length) {
              const mapped = this.mapRolesDynamicToRolesByProcess(group.roles_dynamic, group.id);
              updatedRolesByProcess = this.mergeRolesByProcess(updatedRolesByProcess, mapped);
            }
          }
          user.rolesByProcess = updatedRolesByProcess;

          usersToSave.push(user);
          successCount++;
        } catch (err) {
          failCount++;
          this.logger.error(`❌ Lỗi nhân viên ${hrmEmp.employee_number}: ${err.message}`);
        }
      }
      const processMs = Date.now() - processStart;
      totalProcessMs += processMs;

      // ── Phase C: Batch save DB ─────────────────────────────────────────────
      let dbSaveMs = 0;
      if (usersToSave.length > 0) {
        const dbSaveStart = Date.now();
        await this.userRepository.save(usersToSave, { chunk: 50 });
        dbSaveMs = Date.now() - dbSaveStart;
        totalDbSaveMs += dbSaveMs;
      }

      const batchTotalMs   = Date.now() - batchStartTime;
      const processedCount = Math.min(i + batchSize, totalEmps);


      if (batchTotalMs > 10_000) {
        this.logger.warn(
          `   🐢 Batch ${currentBatchIdx} chậm (${batchTotalMs}ms)` +
          ` — relations=${relMs}ms, dbSave=${dbSaveMs}ms`,
        );
      }

      this.progressSubject.next({
        percentage: totalEmps > 0
          ? Math.min(Math.round(50 + (processedCount / totalEmps) * 45), 95)
          : 95,
        message:    `Đang xử lý nhân viên ${processedCount}/${totalEmps}`,
        stage:      'employees',
        current:    processedCount,
        total:      totalEmps,
      });
    }

    await this.redis.del(REDIS_EMP_KEY);


    // =========================================================================
    // BƯỚC 6: Deactivate nhân viên không còn trong HRM
    // =========================================================================
    this.progressSubject.next({ percentage: 96, message: 'Đang kiểm tra nhân viên đã nghỉ...', stage: 'deactivate' });

    const usersToDeactivate: UserEntity[] = [];

    for (const codeND of allLocalCodeNDs) {
      if (!hrmEmployeeNumbers.has(codeND)) {
        const user = userByCodeNDMap.get(codeND);
        if (user && user.status === 1) {
          user.status = 3;
          usersToDeactivate.push(user);
          deactivateCount++;
        }
      }
    }
 
    if (usersToDeactivate.length > 0) {
      const deactivateStart = Date.now();
      // Dùng update() thay vì save() — save() với lite user sẽ ghi NULL lên các field không có trong entity!
      const deactivateIds = usersToDeactivate.map(u => u.id);
      await this.userRepository
        .createQueryBuilder()
        .update()
        .set({ status: 3 })
        .whereInIds(deactivateIds)
        .execute();
    }

    // =========================================================================
    // KẾT THÚC
    // =========================================================================
    const totalSyncMs = Date.now() - syncStartTime;
    this.progressSubject.next({ percentage: 100, message: 'Hoàn thành đồng bộ HRM.', stage: 'completed' });


  } catch (error) {
    await this.redis.del(REDIS_EMP_KEY);

    const totalSyncMs = Date.now() - syncStartTime;
    this.progressSubject.next({
      percentage: 100,
      message:    `Lỗi đồng bộ: ${error.message}`,
      stage:      'error',
    });

    if (error.isAxiosError) {
      const code       = error.code;
      const url        = error.config?.url ?? 'unknown';
      const httpStatus = error.response?.status;
      const elapsed    = error.config?.__startTime ? Date.now() - error.config.__startTime : -1;

      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.logger.error(`❌ LỖI API HRM sau ${totalSyncMs}ms`);
      this.logger.error(`   URL      : ${url}`);
      this.logger.error(`   Code     : ${code}`);
      this.logger.error(`   HTTP     : ${httpStatus ?? 'no-response'}`);
      this.logger.error(`   Elapsed  : ${elapsed}ms`);
      this.logger.error(`   Message  : ${error.message}`);
      if (code === 'ECONNABORTED') {
        this.logger.error(`   ⛔ TIMEOUT — request vượt quá ${axiosInstance.defaults.timeout}ms`);
      }
      if (error.response?.data) {
        const responseBody = error.response.data;
        const responseBodySize = typeof responseBody === 'string'
          ? responseBody.length
          : Buffer.byteLength(JSON.stringify(responseBody));
        this.logger.error(`   Body     : [REDACTED] size=${responseBodySize}`);
      }
      this.logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      this.logger.error(
        `❌ Lỗi trong quá trình đồng bộ HRM (${totalSyncMs}ms): ${error.message}`,
        error.stack,
      );
    }

    throw new HttpException(`Lỗi đồng bộ HRM: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  /**
   * Tính toán lại quyền (rolesByProcess) cho người dùng dựa trên tất cả các nhóm mà họ tham gia.
   */
  async updateUserPermissions(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['groupUsers'],
    });

    if (!user) return;

    // Lấy tất cả các nhóm của user thông qua quan hệ ManyToMany
    // Chú ý: user_group_users join table
    const groups = user.groupUsers || [];
    
    let updatedRolesByProcess: RolesByProcess[] = [];

    for (const group of groups) {
      if (group.status === 1 && group.roleType === 'dynamic' && group.roles_dynamic?.length) {
        const mapped = this.mapRolesDynamicToRolesByProcess(group.roles_dynamic, group.id);
        updatedRolesByProcess = this.mergeRolesByProcess(updatedRolesByProcess, mapped);
      }
    }

    user.rolesByProcess = updatedRolesByProcess;
    await this.userRepository.save(user);
  }



  /**
   * Đồng bộ từ file nội bộ theo yêu cầu của user
   */
  async syncFromLocalFiles(userPath: string, orgPath: string) {
    this.progressSubject.next({ percentage: 0, message: 'Bắt đầu đọc file...', stage: 'local-start' });

    try {
      // 1. Đọc file
      const orgData = JSON.parse(fs.readFileSync(orgPath, 'utf8')).data;
      const userData = JSON.parse(fs.readFileSync(userPath, 'utf8'));


      // 2. Đồng bộ Đơn vị (Sử dụng 2 bước để tránh lỗi Foreign Key do cha chưa tồn tại)
      this.progressSubject.next({ percentage: 10, message: 'Đang đồng bộ đơn vị (bước 1)...', stage: 'local-org' });
      
      // Bước 2.1: Upsert tất cả đơn vị nhưng bỏ qua parentId
      for (let i = 0; i < orgData.length; i++) {
        const item = orgData[i];
        let orgUnit = await this.organizationUnitRepository.findOne({ where: { id: item.id } }); // Dùng ID gốc để đồng bộ chính xác
        if (!orgUnit) {
          // Nếu không tìm thấy theo ID, thử tìm theo CODE
          orgUnit = await this.organizationUnitRepository.findOne({ where: { code: item.code } });
          if (!orgUnit) {
            orgUnit = this.organizationUnitRepository.create({ 
              id: item.id || uuidv4(),
              order: 0
            });
          }
        }
        orgUnit.code = item.code;
        orgUnit.name = item.name_vn;
        orgUnit.nameEn = item.name_en;
        orgUnit.blockId = item.block_id;
        // Tạm thời bỏ qua parentId để tránh lỗi FK
        orgUnit.status = item.status === 'A' ? 1 : 0;
        orgUnit.order = orgUnit.order || 0;
        await this.organizationUnitRepository.save(orgUnit);
        
        if (i % 100 === 0) {
          this.progressSubject.next({ 
            percentage: 10 + Math.floor((i / orgData.length) * 15), 
            message: `Đang khởi tạo đơn vị ${i}/${orgData.length}`, 
            stage: 'local-org' 
          });
        }
      }

      // Bước 2.2: Cập nhật parentId sau khi tất cả đơn vị đã tồn tại
      this.progressSubject.next({ percentage: 25, message: 'Đang thiết lập quan hệ cha-con...', stage: 'local-org' });
      for (let i = 0; i < orgData.length; i++) {
        const item = orgData[i];
        if (item.parent_id) {
          // Kiểm tra xem parent có tồn tại trong batch này hoặc DB không
          const parentExists = await this.organizationUnitRepository.findOne({ where: { id: item.parent_id } });
          if (parentExists) {
            await this.organizationUnitRepository.update(item.id, { parentId: item.parent_id });
          } else {
            this.logger.warn(`⚠️ Đơn vị ${item.code} có cha ${item.parent_id} không tìm thấy. Bỏ qua quan hệ cha.`);
          }
        }
        
        if (i % 100 === 0) {
          this.progressSubject.next({ 
            percentage: 25 + Math.floor((i / orgData.length) * 15), 
            message: `Đang liên kết đơn vị ${i}/${orgData.length}`, 
            stage: 'local-org' 
          });
        }
      }

      // 3. Đồng bộ Người dùng
      this.progressSubject.next({ percentage: 40, message: 'Đang đồng bộ người dùng...', stage: 'local-users' });
      const defaultPassword = await bcrypt.hash('12345678', 10);
      
      for (let i = 0; i < userData.length; i++) {
        const item = userData[i];
        const username = (item['TÊN ĐĂNG NHẬP'] || '').trim();
        const codeND = (item['MÃ NHÂN VIÊN(*)'] || '').trim();
        if (!username) continue;

        let user = await this.userRepository.findOne({ 
          where: [
            { username },
            { codeND }
          ], 
          relations: ['groupUsers'] 
        });
        
        if (!user) {
          user = this.userRepository.create({ 
            id: uuidv4(),
            username: username,
            codeND: codeND,
            password: defaultPassword
          });
        }

        user.status = 1; // Luôn kích hoạt lại nếu tìm thấy trong file đồng bộ
        user.name = item['TÊN NHÂN VIÊN(*)'] || user.name;
        user.emailUser = item['EMAIL(*)'] || user.emailUser;
        user.codeND = codeND || user.codeND;
        user.gender = item['GIỚI TÍNH'] || user.gender;
        user.birthday = (item['NGÀY SINH'] && item['NGÀY SINH'] !== 'NaN') ? new Date(item['NGÀY SINH']) : user.birthday;
        user.identificationCard = item['SỐ CMND/CCCD'] || user.identificationCard;
        user.phoneNumberUser = item['SỐ ĐIỆN THOẠI'] || user.phoneNumberUser;
        user.addressUser = item['ĐỊA CHỈ'] || user.addressUser;
        user.organizationCode = item['PHÒNG BAN'] || user.organizationCode;
        user.status = 1;

        // Lưu user trước để có ID nếu là mới
        user = await this.userRepository.save(user);

        // 4. Gán nhóm dựa trên MÃ VAI TRÒ (Job Mapping)
        const jobCode = item['MÃ VAI TRÒ'];
        if (jobCode) {
          const mappings = await this.hrmJobMappingRepository.find({
            where: { hrmJobCode: jobCode }, // Sửa từ hrmJobId -> hrmJobCode
            relations: ['groupUser']
          });

          if (mappings.length > 0) {
            const groupsToAssign = mappings.map(m => m.groupUser).filter(Boolean);
            if (groupsToAssign.length > 0) {
              // Cập nhật quan hệ ManyToMany
              user.groupUsers = groupsToAssign;
              await this.userRepository.save(user);
              
              // Cập nhật rolesByProcess cho user bằng hàm có sẵn
              await this.updateUserPermissions(user.id);
            }
          }
        }

        if (i % 50 === 0) {
          this.progressSubject.next({ 
            percentage: 40 + Math.floor((i / userData.length) * 50), 
            message: `Đang xử lý người dùng ${i}/${userData.length}`, 
            stage: 'local-users' 
          });
        }
      }

      this.progressSubject.next({ percentage: 100, message: 'Đồng bộ hoàn tất!', stage: 'local-done' });

    } catch (error) {
      this.logger.error(`❌ Lỗi đồng bộ từ file: ${error.message}`);
      throw error;
    }
  }

  private mergeRolesByProcess(current: RolesByProcess[], incoming: RolesByProcess[]): RolesByProcess[] {
    const resultMap = new Map<string, { name: string; roles: RoleItem[] }>();

    for (const item of current) {
      resultMap.set(item.processKey, {
        name: item.name ?? item.processKey,
        roles: [...item.roles],
      });
    }

    for (const item of incoming) {
      const existed = resultMap.get(item.processKey);
      if (existed) {
        // Thêm các role chưa tồn tại
        for (const incomingRole of item.roles) {
          const alreadyHas = existed.roles.some(r => r.roleCode === incomingRole.roleCode);
          if (!alreadyHas) {
            existed.roles.push(incomingRole);
          }
        }
      } else {
        resultMap.set(item.processKey, {
          name: item.name ?? item.processKey,
          roles: [...item.roles],
        });
      }
    }

    return Array.from(resultMap.entries()).map(([processKey, value]) => ({
      processKey,
      name: value.name,
      roles: value.roles,
    }));
  }

  private mapRolesDynamicToRolesByProcess(
    rolesDynamic: { processKey: string; roleCode: string; name: string }[],
    groupId: string,
  ): RolesByProcess[] {
    const map = new Map<string, RoleItem[]>();

    for (const r of rolesDynamic) {
      if (!map.has(r.processKey)) {
        map.set(r.processKey, []);
      }

      map.get(r.processKey)!.push({
        roleCode: r.roleCode,
        name: r.name,
        __groupId: groupId, // Lưu vết ID nhóm để có thể gỡ nếu cần (tùy chọn)
      } as any);
    }

    return Array.from(map.entries()).map(([processKey, roles]) => ({
      processKey,
      name: processKey,
      roles,
    }));
  }
}
