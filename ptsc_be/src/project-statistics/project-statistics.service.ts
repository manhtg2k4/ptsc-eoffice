import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { ProjectEntity } from '../project/entities/project.entity';
import { TaskEntity } from '../task/entity/task.entity';
import { ProjectMemberEntity } from '../project/entities/project-member.entity';
import { UserEntity } from '../users/entities/user.entity';
import * as dayjs from 'dayjs';
import { ProjectPerformanceQueryDto, ProjectSummaryQueryDto, ProjectTasksQueryDto } from './dtos/project-statistics.dto';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';
import { SQLSVRepository } from '../database/sqlsvRepo';

@Injectable()
export class ProjectStatisticsService {
    constructor(
        @InjectRepository(ProjectEntity, 'mssqlConnection')
        private readonly projectRepository: Repository<ProjectEntity>,
        @InjectRepository(TaskEntity, 'mssqlConnection')
        private readonly taskRepository: Repository<TaskEntity>,
        @InjectRepository(ProjectMemberEntity, 'mssqlConnection')
        private readonly memberRepository: Repository<ProjectMemberEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepository: Repository<UserEntity>,
        private readonly systemLogService: SystemLogServiceSql,
        private readonly sqlsvRepo: SQLSVRepository,
    ) { }

    /**
     * BÁO CÁO 5.1: TỔNG HỢP TÌNH TRẠNG DỰ ÁN
     */
    async getProjectSummary(query: ProjectSummaryQueryDto, userId: string, ipAddress: string) {
        try {
            const filter = this.normalizeQueryFilter(query);
            const { projectStatus, departmentId, year, managerId, processStatus } = filter;
            const pStatus = projectStatus || processStatus;
            const qb = this.projectRepository.createQueryBuilder('p')
                .leftJoinAndSelect('p.projectMembers', 'pm', 'pm.role = :role', { role: 'manager' })
                .leftJoinAndSelect('pm.user', 'manager')
                .where('p.status = 1');

            if (pStatus) {
                const pStatusArr = Array.isArray(pStatus) ? pStatus : [pStatus];
                qb.andWhere('p.projectStatus IN (:...pStatusArr)', { pStatusArr });
            }

            if (year) {
                const currentYear = Array.isArray(year) ? year[0] : year;
                qb.andWhere('YEAR(p.startDate) = :year', { year: currentYear });
            }

            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            // Lọc theo người hiện tại hoặc cấp dưới nếu không gửi managerId (bỏ qua nếu thuộc nhóm allStatistic)
            const hasManager = managerId && (Array.isArray(managerId) ? managerId.filter(Boolean).length > 0 : !!managerId);
            if (hasManager) {
                const managerIds = Array.isArray(managerId) ? managerId : [managerId];
                qb.andWhere('pm.userId IN (:...managerIds)', { managerIds });
            } else if (!isAllStatistic) {
                // Lấy danh sách userId cấp dưới (bao gồm bản thân)
                const managerIds = await this.sqlsvRepo.getSubordinateUserIds(userId);
                if (managerIds.length > 0) {
                    qb.andWhere('pm.userId IN (SELECT value FROM OPENJSON(:managerIdsJson))', { managerIdsJson: JSON.stringify(managerIds) });
                }
            }

            // Áp dụng sắp xếp nếu có
            this.applySort(qb, filter.sort, 'p', {
                projectCode: 'p.code',
                projectType: 'p.typeProject',
                projectName: 'p.name',
                budget: 'p.budget',
                pmName: 'manager.name',
                startDate: 'p.startDate',
                endDate: 'p.endDate',
                progress: 'p.progress',
                status: 'p.projectStatus'
            });

            // Lưu ý: ProjectEntity không có field departmentId trực tiếp trong entity đã xem, 
            // nhưng trong project.service.ts thấy có 'news.department'
            // Tôi sẽ kiểm tra lại column thực tế nếu lỗi.

            const projects = await qb.getMany();

            const result = projects.map((p, index) => {
                const budget = Number(p.budget) || 0;
                const progress = Number(p.progress) || 0;
                const volumeValue = (budget * progress) / 100;

                return {
                    stt: index + 1,
                    projectCode: p.code,
                    projectType: p.typeProject, // Cần join thêm label nếu muốn tên loại
                    projectName: p.name,
                    budget: budget,
                    pmName: p.projectMembers?.[0]?.user?.name || '',
                    startDate: p.startDate ? dayjs(p.startDate).format('DD/MM/YYYY') : '',
                    endDate: p.endDate ? dayjs(p.endDate).format('DD/MM/YYYY') : '',
                    progress: `${progress}%`,
                    status: this.mapProjectStatus(p.projectStatus),
                    volumeValue: volumeValue
                };
            });

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Báo cáo: Xem tổng hợp tình trạng dự án',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_SUMMARY',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                data: result,
                total: result.length
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem tổng hợp tình trạng dự án - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_SUMMARY',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in ProjectStatisticsService.getProjectSummary:', error);
            throw new InternalServerErrorException('Lỗi khi lấy báo cáo tổng hợp tình trạng dự án');
        }
    }

    /**
     * BÁO CÁO 5.2: TIẾN ĐỘ CÔNG VIỆC THEO DỰ ÁN
     */
    async getProjectTasks(query: any, userId: string, ipAddress: string) {
        try {
            const filter = this.normalizeQueryFilter(query);
            const { projectId, projectCode, code, processStatus, assigneeId, managerId, assigner, assignerId, page = 1, limit = 10 } = filter;
            const searchCode = projectCode || code;
            const finalAssignerIds = assigner || assignerId;

            const qb = this.taskRepository.createQueryBuilder('t')
                .leftJoinAndSelect('t.taskUsers', 'tu', "tu.role = 'director'")
                .leftJoinAndSelect('tu.user', 'assignee')
                .leftJoinAndSelect('t.taskUsers', 'tu_assigner', "tu_assigner.role = 'assigner'")
                .leftJoinAndSelect('tu_assigner.user', 'assigner_user')
                .leftJoinAndSelect('t.createdBy', 'creator')
                .leftJoinAndSelect('t.project', 'p')
                .leftJoin('p.projectMembers', 'pm', 'pm.role = :role', { role: 'manager' })
                .where('t.status = :status', { status: 1 })
                .andWhere('t.typeTask = :typeTask', { typeTask: 'project' });

            if (searchCode) {
                const searchText = Array.isArray(searchCode) ? searchCode[0] : searchCode;
                qb.andWhere('p.code LIKE :code', { code: `%${searchText}%` });
            } else if (projectId) {
                const pId = Array.isArray(projectId) ? projectId[0] : projectId;
                qb.andWhere('t.projectId = :projectId', { projectId: pId });
            }

            if (processStatus) {
                const pStatusArr = Array.isArray(processStatus) ? processStatus : [processStatus];
                qb.andWhere('t.processStatus IN (:...pStatusArr)', { pStatusArr });
            }

            if (finalAssignerIds) {
                const assignerArr = Array.isArray(finalAssignerIds) ? finalAssignerIds : [finalAssignerIds];
                const validAssigners = assignerArr.filter(id => id !== undefined && id !== null && String(id).trim() !== '');
                if (validAssigners.length > 0) {
                    qb.andWhere(qbInner => {
                        const subQuery = qbInner.subQuery()
                            .select('tu2.taskId')
                            .from('task_users', 'tu2')
                            .where("tu2.role = 'assigner'")
                            .andWhere('tu2.processId IN (:...validAssigners)')
                            .getQuery();
                        return 't.id IN ' + subQuery;
                    }).setParameter('validAssigners', validAssigners);
                }
            }

            const hasManager = managerId && (Array.isArray(managerId) ? managerId.filter(Boolean).length > 0 : !!managerId);
            const hasAssignee = assigneeId && (Array.isArray(assigneeId) ? assigneeId.filter(Boolean).length > 0 : !!assigneeId);

            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (hasManager || hasAssignee) {
                if (hasManager) {
                    const managerIds = Array.isArray(managerId) ? managerId : [managerId];
                    qb.andWhere('pm.userId IN (:...managerIds)', { managerIds });
                }
                if (hasAssignee) {
                    const assigneeIds = Array.isArray(assigneeId) ? assigneeId : [assigneeId];
                    qb.andWhere('tu.processId IN (:...assigneeIds)', { assigneeIds })
                        .andWhere('tu.type = 1');
                }
            } else if (!isAllStatistic) {
                // Nếu không gửi gì, lọc theo userId cấp dưới (Quản lý OR Phụ trách)
                const subordinateIds = await this.sqlsvRepo.getSubordinateUserIds(userId);
                if (subordinateIds.length > 0) {
                    qb.andWhere(new Brackets(qbInner => {
                        qbInner.where('pm.userId IN (SELECT value FROM OPENJSON(:subordinateIdsJson))', { subordinateIdsJson: JSON.stringify(subordinateIds) })
                            .orWhere('tu.processId IN (SELECT value FROM OPENJSON(:subordinateIdsJson))', { subordinateIdsJson: JSON.stringify(subordinateIds) });
                    }));
                }
            }

            // Áp dụng sắp xếp nếu có
            this.applySort(qb, filter.sort, 't', {
                code: 'p.code',
                taskCode: 't.code',
                taskName: 't.name',
                assigneeName: 'assignee.name',
                startDate: 't.startDate',
                endDate: 't.endDate',
                progress: 't.progress',
                status: 't.processStatus',
                dependency: 't.dependentTaskId'
            });

            // taskStatus: t.status (1 active, 3 deleted) -> query mặc định lấy 1
            const total = await qb.getCount();
            const skip = (Number(page) - 1) * Number(limit);
            qb.skip(skip).take(Number(limit));

            const tasks = await qb.getMany();

            // Fetch dependent tasks if any
            const dependentIds = tasks.map(t => t.dependentTaskId).filter((id): id is number => !!id);
            const dependentMap = new Map<number, string>();
            if (dependentIds.length > 0) {
                const depTasks = await this.taskRepository.find({
                    where: { id: In(dependentIds) }
                });
                depTasks.forEach(dt => dependentMap.set(dt.id, dt.code || ''));
            }

            const result = tasks.map((t, index) => {
                const assignerTaskUser = t.taskUsers?.find(u => u.role === 'assigner');
                const assignerName = assignerTaskUser?.user?.name || t.createdBy?.name || '';
                
                return {
                    stt: index + 1,
                    code: t.project?.code || '',
                    taskCode: t.code || '',
                    taskName: t.name || '',
                    assigneeName: t.taskUsers?.find(u => u.role === 'director')?.user?.name || '',
                    nguonGiao: assignerName,
                    assigner: assignerName,
                    nguoiTao: assignerName,
                    startDate: t.startDate ? dayjs(t.startDate).format('DD/MM/YYYY') : '',
                    endDate: t.endDate ? dayjs(t.endDate).format('DD/MM/YYYY') : '',
                    progress: `${t.progress || 0}%`,
                    status: this.mapTaskStatus(t.processStatus),
                    dependency: t.dependentTaskId ? (dependentMap.get(t.dependentTaskId) || t.dependentTaskId) : '-'
                };
            });

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo: Xem tiến độ công việc dự án ID: ${projectId || '-'}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_TASKS',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                data: result,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem tiến độ công việc dự án - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_TASKS',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in ProjectStatisticsService.getProjectTasks:', error);
            throw new InternalServerErrorException('Lỗi khi lấy báo cáo tiến độ công việc theo dự án');
        }
    }

    /**
     * BÁO CÁO 5.3: THỐNG KÊ HIỆU SUẤT THÀNH VIÊN DỰ ÁN
     */
    async getMemberPerformance(query: any, userId: string, ipAddress: string) {
        try {
            const filter = this.normalizeQueryFilter(query);
            const {
                projectId,
                projectCode,
                code,
                assigneeId,
                managerId,
                processStatus,
                page = 1,
                limit = 10,
            } = filter;
            const searchCode = projectCode || code;

            // Nhận cả startDate và endDate từ processDate
            const { startDate, endDate } = filter.processDate || {};

            // ────────────────────────────────────────────────
            // Query lấy danh sách member (giữ nguyên)
            // ────────────────────────────────────────────────
            const qb = this.memberRepository
                .createQueryBuilder('m')
                .leftJoinAndSelect('m.user', 'u')
                .leftJoinAndSelect('m.project', 'p')
                .leftJoin('p.projectMembers', 'pm', 'pm.role = :role', { role: 'manager' });

            if (searchCode) {
                const searchText = Array.isArray(searchCode) ? searchCode[0] : searchCode;
                qb.andWhere('p.code LIKE :code', { code: `%${searchText}%` });
            } else if (projectId) {
                const pId = Array.isArray(projectId) ? projectId[0] : projectId;
                qb.andWhere('m.projectId = :projectId', { projectId: pId });
            }

            // Lọc theo khoảng thời gian bắt đầu của dự án (p.startDate)
            if (startDate || endDate) {
                if (startDate && endDate) {
                    const from = dayjs(startDate).startOf('day').toDate();
                    const to = dayjs(endDate).endOf('day').toDate();
                    qb.andWhere('p.startDate BETWEEN :from AND :to', { from, to });
                } else if (startDate) {
                    const from = dayjs(startDate).startOf('day').toDate();
                    qb.andWhere('p.startDate >= :from', { from });
                } else if (endDate) {
                    const to = dayjs(endDate).endOf('day').toDate();
                    qb.andWhere('p.startDate <= :to', { to });
                }
            }

            const hasAssignee = assigneeId && (Array.isArray(assigneeId) ? assigneeId.filter(Boolean).length > 0 : !!assigneeId);
            const hasManager = managerId && (Array.isArray(managerId) ? managerId.filter(Boolean).length > 0 : !!managerId);

            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (hasAssignee || hasManager) {
                if (hasAssignee) {
                    const assigneeIds = Array.isArray(assigneeId) ? assigneeId : [assigneeId];
                    qb.andWhere('m.userId IN (:...assigneeIds)', { assigneeIds });
                }
                if (hasManager) {
                    const managerIds = Array.isArray(managerId) ? managerId : [managerId];
                    qb.andWhere('pm.userId IN (:...managerIds)', { managerIds });
                }
            } else if (!isAllStatistic) {
                const subordinateIds = await this.sqlsvRepo.getSubordinateUserIds(userId);
                if (subordinateIds.length > 0) {
                    qb.andWhere(
                        new Brackets((qbInner) => {
                            qbInner
                                .where('m.userId IN (SELECT value FROM OPENJSON(:subordinateIdsJson))', { subordinateIdsJson: JSON.stringify(subordinateIds) })
                                .orWhere('pm.userId IN (SELECT value FROM OPENJSON(:subordinateIdsJson))', { subordinateIdsJson: JSON.stringify(subordinateIds) });
                        }),
                    );
                }
            }

            // Áp dụng sắp xếp nếu có
            this.applySort(qb, filter.sort, 'm', {
                code: 'p.code',
                memberName: 'u.name',
                startDate: 'p.startDate',
                endDate: 'p.endDate',
                role: 'm.role'
            });

            const total = await qb.getCount();

            const skip = (Number(page) - 1) * Number(limit);
            qb.skip(skip).take(Number(limit));

            const members = await qb.getMany();

            // ────────────────────────────────────────────────
            // Xử lý từng member → thống kê task
            // ────────────────────────────────────────────────
            const result: any[] = [];
            const now = new Date();

            for (const member of members) {
                const taskQb = this.taskRepository
                    .createQueryBuilder('t')
                    .leftJoin('t.taskUsers', 'tu')
                    .where('t.projectId = :projectId', { projectId: member.projectId })
                    .andWhere('tu.processId = :userId', { userId: member.userId })
                    .andWhere('tu.type = 1')
                    .andWhere('t.status = 1')
                    .andWhere('t.typeTask = :typeTask', { typeTask: 'project' });

                if (processStatus) {
                    const statuses = Array.isArray(processStatus) ? processStatus : [processStatus];
                    taskQb.andWhere('t.processStatus IN (:...statuses)', { statuses });
                }



                const tasks = await taskQb.getMany();

                const totalTasks = tasks.length;
                const completedTasks = tasks.filter((t) => t.processStatus === '4').length;

                let onTime = 0;
                let overdue = 0;

                tasks.forEach((t) => {
                    if (t.processStatus === '4') {
                        const finishDate = t.updatedAt || now;
                        if (t.endDate && new Date(finishDate) <= new Date(t.endDate)) {
                            onTime++;
                        } else {
                            overdue++;
                        }
                    }
                });

                const onTimeRate = totalTasks > 0 ? Math.round((onTime / totalTasks) * 100) : 0;

                result.push({
                    stt: skip + result.length + 1,
                    code: member.project?.code || '',
                    memberName: member.user?.name || '',
                    startDate: member.project?.startDate ? dayjs(member.project.startDate).format('DD/MM/YYYY') : '',
                    endDate: member.project?.endDate ? dayjs(member.project.endDate).format('DD/MM/YYYY') : '',
                    role: this.mapMemberRole(member.role),
                    totalTasks,
                    completed: completedTasks,
                    onTime,
                    overdue,
                    onTimeRate: `${onTimeRate}%`,
                });
            }

            // Log success
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo: Xem hiệu suất thành viên dự án ID: ${projectId || '-'}`,
                method: 'GET',
                status: 'SUCCESS',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_PERFORMANCE',
                userInfo: userId,
                ipAddress,
                timestamp: new Date().toISOString(),
            });

            return {
                statusCode: 200,
                data: result,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem hiệu suất thành viên dự án - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PROJECT_STATISTICS',
                subType: 'PROJECT_STATISTICS_PERFORMANCE',
                userInfo: userId,
                ipAddress,
                timestamp: new Date().toISOString(),
            });

            console.error('Error in getMemberPerformance:', error);
            throw new InternalServerErrorException('Lỗi khi lấy báo cáo hiệu suất thành viên');
        }
    }

    private parseSort(sort: any): Record<string, number> | null {
        if (!sort) return null;

        if (typeof sort === 'string') {
            try {
                sort = JSON.parse(sort);
            } catch {
                return null;
            }
        }

        if (typeof sort !== 'object' || Array.isArray(sort) || sort === null) {
            return null;
        }

        const parsed: Record<string, number> = {};
        for (const [field, direction] of Object.entries(sort)) {
            if (direction === 1 || direction === '1' || String(direction).toLowerCase() === 'asc') {
                parsed[field] = 1;
            } else {
                parsed[field] = -1;
            }
        }

        return parsed;
    }

    private applySort(qb: any, sort: any, alias: string, fieldMap: Record<string, string> = {}) {
        const parsedSort = this.parseSort(sort);
        if (!parsedSort || Object.keys(parsedSort).length === 0) {
            qb.addOrderBy(`${alias}.id`, 'DESC');
            return;
        }

        for (const [field, direction] of Object.entries(parsedSort)) {
            const order = direction === 1 ? 'ASC' : 'DESC';
            const dbField = fieldMap[field] ?? `${alias}.${field}`;
            qb.addOrderBy(dbField, order);
        }
    }

    private normalizeQueryFilter(query: any): any {
        if (!query) return {};

        let filter: any = query.filter ?? query;

        if (typeof filter === 'string') {
            try {
                filter = JSON.parse(filter);
            } catch {
                filter = {};
            }
        }

        if (typeof filter !== 'object' || filter === null) {
            filter = {};
        }

        if (query && typeof query === 'object') {
            const SYSTEM_KEYS = new Set([
                'filter', 'userFilters', 'isExport', 'authority', 'recordId',
                'meetingConclusionId', 'viewConfigCode', 'processFn', 'exportType',
                'createdAt'
            ]);

            if (query.page !== undefined) {
                filter.page = query.page;
            }
            if (query.limit !== undefined) {
                filter.limit = query.limit;
            }
            if (query.sort !== undefined) {
                filter.sort = query.sort;
            }

            for (const key of Object.keys(query)) {
                if (!SYSTEM_KEYS.has(key) && key !== 'page' && key !== 'limit' && key !== 'sort' && query[key] !== undefined) {
                    if (filter[key] === undefined) {
                        filter[key] = query[key];
                    }
                }
            }
        }

        if (filter.sort && typeof filter.sort === 'string') {
            try {
                filter.sort = JSON.parse(filter.sort);
            } catch {
                // nếu parse fail thì giữ nguyên và bỏ qua sort
                filter.sort = undefined;
            }
        }

        return filter;
    }

    private mapTaskStatus(status?: string): string {
        const map: Record<string, { text: string; bg: string; color: string, border?: string }> = {
            '1': { text: 'Công việc mới', bg: '#a3a4a5', color: '#FFFFFF', border: '1px solid #777778' }, // Màu xám đậm
            '2': { text: 'Đang thực hiện', bg: '#dbeafe', color: '#0062ad', border: '1px solid #c1dcff' }, // Màu xanh lam đậm
            '3': { text: 'Chờ phê duyệt', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' }, // Màu cam
            '4': { text: 'Hoàn thành', bg: '#d0ffde', color: '#007222', border: '1px solid #adecc0' }, // Màu xanh lá
            '5': { text: 'Từ chối phê duyệt', bg: '#ffdcd9', color: '#f44336', border: '1px solid #ffcfcf' }, // Màu đỏ
            '6': { text: 'Chờ điều chỉnh', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' },
            '7': { text: 'Từ chối điều chỉnh', bg: '#ffdcd9', color: '#f44336', border: '1px solid #ffcfcf' },
            '8': { text: 'Hủy', bg: '#ffdcd9', color: '#f44336', border: '1px solid #ffcfcf' },
            '9': { text: 'điều chỉnh', bg: '#fef9c2', color: '#ffa600', border: '1px solid #ffe2ab' }
        };

        const config = status ? map[status] : null;
        if (!config) return '-';
        const borderStyle = config.border ? `border: ${config.border};` : '';
        return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background: ${config.bg};color:${config.color};font-weight:700;font-size:14px;border-radius:15px;${borderStyle}">${config.text}</div>`
    }

    private mapProjectStatus(status: number | string): string {
        const statusStr = String(status ?? '');
        const map: Record<string, { text: string; bg: string; color: string; border: string }> = {
            '1': { text: 'Khởi động', bg: '#E0E0E0', color: '#555555', border: '#AEB5BE' },
            '2': { text: 'Đang triển khai', bg: '#DBEAFE', color: '#0062AD', border: '#ACD0FF' },
            '3': { text: 'Hoàn thành', bg: '#D0FFDE', color: '#007222', border: '#ADECC0' },
            '4': { text: 'Hủy', bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5' },
            '5': { text: 'Tạm dừng', bg: '#FEF9C2', color: '#FFA600', border: '#FFD88F' }
        };


        const config = map[statusStr];
        if (!config) return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#fef9c2;color:#666;font-weight:700;font-size:14px;border-radius:15px;">${statusStr || '-'}</div>`;

        return `<div style="display:flex;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background: ${config.bg};color:${config.color};font-weight:700;font-size:14px;border-radius:15px;border: 1px solid ${config.border}">${config.text}</div>`;
    }

    private mapMemberRole(role?: string): string {
        const map: Record<string, string> = {
            'manager': 'Quản lý',
            'member': 'Thành viên',
            'viewer': 'Người xem'
        };
        return role ? (map[role.toLowerCase()] ?? role) : '-';
    }
}
