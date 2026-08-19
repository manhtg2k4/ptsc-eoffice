import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Brackets } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TaskRecurringConfigEntity } from '../entity/task-recurring-config.entity';
import { RED_FLAG_SVG, WHITE_FLAG_SVG } from '../entity/task.constants';
import { ListTaskDto } from '../dto/list-task.dto';
import * as dayjs from 'dayjs';

@Injectable()
export class TaskRecurringConfigRepository extends Repository<TaskRecurringConfigEntity> {
    constructor(
        @InjectDataSource('mssqlConnection')
        private readonly dataSource: DataSource,
    ) {
        super(TaskRecurringConfigEntity, dataSource.createEntityManager());
    }

    private async loadAccessibleRecurringConfigs(userId: string): Promise<TaskRecurringConfigEntity[]> {
        const rootConfigs = await this.createQueryBuilder('config')
            .where('config.status <> :deletedStatus', { deletedStatus: 3 })
            .andWhere('config.parentId IS NULL')
            .andWhere(new Brackets((qb) => {
                qb.where('config.createdById = :userId', { userId })
                    .orWhere(`
                        config.taskId IN (
                            SELECT tu.task_id
                            FROM dbo.task_users tu
                            WHERE LOWER(tu.process_id) = LOWER(:userId)
                        )
                    `, { userId });
            }))
            .getMany();

        if (rootConfigs.length === 0) {
            return [];
        }

        const allConfigs = [...rootConfigs];
        const seenIds = new Set(rootConfigs.map((item) => item.id));
        let parentIds = rootConfigs.map((item) => item.id);

        while (parentIds.length > 0) {
            const children = await this.createQueryBuilder('config')
                .where('config.status <> :deletedStatus', { deletedStatus: 3 })
                .andWhere('config.parentId IN (:...parentIds)', { parentIds })
                .getMany();

            const nextParentIds: number[] = [];
            for (const child of children) {
                if (seenIds.has(child.id)) {
                    continue;
                }
                seenIds.add(child.id);
                allConfigs.push(child);
                nextParentIds.push(child.id);
            }

            parentIds = nextParentIds;
        }

        return allConfigs;
    }

    async findAll(userId: string, query: ListTaskDto) {
        const { page = 1, limit = 10, filter, sort } = query;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        let allData = await this.loadAccessibleRecurringConfigs(userId);

        const {
            name,
            status,
            code,
            priority,
            repetitiveTask,
            createdAt,
            lastExecutionDate,
            nextExecutionDate,
            myAssign,
            myDirector,
            mySupporter,
            myJob,
        } = filter || {};

        const configTaskIds = allData.map(c => c.taskId).filter(Boolean);
        const userRolesMap = new Map<number, string[]>();
        if (configTaskIds.length > 0 && userId) {
            try {
                const rows = await this.dataSource.query(
                    `SELECT task_id, role FROM task_users WHERE task_id IN (${configTaskIds.join(',')}) AND LOWER(process_id) = LOWER(@0)`,
                    [userId]
                );
                rows.forEach((row: any) => {
                    if (!userRolesMap.has(row.task_id)) {
                        userRolesMap.set(row.task_id, []);
                    }
                    userRolesMap.get(row.task_id)!.push(row.role);
                });
            } catch (e) {
                console.error('Error fetching user roles for configs:', e);
            }
        }

        const isMyAssign = myAssign === true || myAssign === 'true';
        const isMyDirector = myDirector === true || myDirector === 'true';
        const isMySupporter = mySupporter === true || mySupporter === 'true';

        if (isMyAssign || isMyDirector || isMySupporter) {
            const allowedRoles: string[] = [];
            if (isMyAssign) allowedRoles.push('assigner');
            if (isMyDirector) allowedRoles.push('director');
            if (isMySupporter) allowedRoles.push('supporter');

            allData = allData.filter(c => {
                const roles = userRolesMap.get(c.taskId) || [];
                return roles.some(role => allowedRoles.includes(role));
            });
        }

        if (myJob === true || myJob === 'true') {
            allData = allData.filter(c => {
                const roles = userRolesMap.get(c.taskId) || [];
                return roles.includes('director') || roles.includes('supporter');
            });
        }

        if (name || code) {
            allData = allData.filter(c => {
                const nameMatch = name ? c.name?.toLowerCase().includes(name.toLowerCase()) : false;
                const codeMatch = code ? c.code?.toLowerCase().includes(code.toLowerCase()) : false;
                return nameMatch || codeMatch;
            });
        }

        if (status !== undefined && status !== null) {
            const statuses = Array.isArray(status) ? status.map(Number) : [Number(status)];
            allData = allData.filter(c => statuses.includes(c.status));
        }

        if (priority) {
            if (priority === 'binhthuong') {
                allData = allData.filter(c => !c.priority || c.priority === '' || c.priority === 'binhthuong');
            } else {
                allData = allData.filter(c => c.priority === priority);
            }
        }

        if (repetitiveTask) {
            allData = allData.filter(c => c.repetitiveTask === repetitiveTask);
        }

        if (createdAt) {
            const startDate = createdAt.startDate || createdAt.endDate;
            const endDate = createdAt.endDate || createdAt.startDate;
            const start = startDate ? dayjs(startDate).startOf('day') : null;
            const end = endDate ? dayjs(endDate).endOf('day') : null;

            allData = allData.filter(c => {
                const d = dayjs(c.createdAt);
                if (start && d.isBefore(start)) return false;
                if (end && d.isAfter(end)) return false;
                return true;
            });
        }

        if (lastExecutionDate) {
            const startDate = lastExecutionDate.startDate || lastExecutionDate.endDate;
            const endDate = lastExecutionDate.endDate || lastExecutionDate.startDate;
            const start = startDate ? dayjs(startDate).startOf('day') : null;
            const end = endDate ? dayjs(endDate).endOf('day') : null;

            allData = allData.filter(c => {
                if (!c.lastExecutedAt) return false;
                const d = dayjs(c.lastExecutedAt);
                if (start && d.isBefore(start)) return false;
                if (end && d.isAfter(end)) return false;
                return true;
            });
        }

        let filteredData = allData.map(config => {
            const nextDate = this.calculateNextExecutionDate(config);
            return {
                ...config,
                nextExecutionDate: nextDate,
            };
        });

        if (nextExecutionDate) {
            const startDate = nextExecutionDate.startDate || nextExecutionDate.endDate;
            const endDate = nextExecutionDate.endDate || nextExecutionDate.startDate;
            const start = startDate ? dayjs(startDate).startOf('day') : null;
            const end = endDate ? dayjs(endDate).endOf('day') : null;

            filteredData = filteredData.filter(item => {
                if (!item.nextExecutionDate) return false;
                const d = dayjs(item.nextExecutionDate);
                if (start && d.isBefore(start)) return false;
                if (end && d.isAfter(end)) return false;
                return true;
            });
        }

        if (sort && typeof sort === 'object') {
            Object.entries(sort).forEach(([key, direction]) => {
                const dir = String(direction).toUpperCase() === 'ASC' ? 1 : -1;
                filteredData.sort((a, b) => {
                    const aVal = (a as any)[key];
                    const bVal = (b as any)[key];

                    if (aVal == null && bVal == null) return 0;
                    if (aVal == null) return dir;
                    if (bVal == null) return -dir;

                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return aVal.localeCompare(bVal, 'vi') * dir;
                    }

                    if (aVal < bVal) return -dir;
                    if (aVal > bVal) return dir;
                    return 0;
                });
            });
        } else {
            filteredData.sort((a, b) => b.id - a.id);
        }

        const total = filteredData.length;
        const paginatedData = filteredData.slice(skip, skip + limitNum);

        const userIds = new Set<string>();
        paginatedData.forEach(c => {
            if (c.createdById) userIds.add(c.createdById);
            if (c.updatedById) userIds.add(c.updatedById);
        });

        const userMap = new Map<string, any>();
        if (userIds.size > 0) {
            try {
                const userIdList = Array.from(userIds).map(id => `'${id}'`).join(',');
                const users = await this.dataSource.query(`SELECT id, name, email_user as emailUser FROM users WHERE id IN (${userIdList})`);
                users.forEach((u: any) => userMap.set(u.id, u));
            } catch (e) {
                console.error('Error fetching user info:', e);
            }
        }

        const taskIds = paginatedData.map(c => c.taskId).filter(id => id);
        const taskCodeMap = new Map<number, string>();
        if (taskIds.length > 0) {
            try {
                const tasks = await this.dataSource.query(`SELECT id, code FROM task WHERE id IN (${taskIds.join(',')})`);
                tasks.forEach((t: any) => taskCodeMap.set(t.id, t.code));
            } catch (e) {
                console.error('Error fetching task codes:', e);
            }
        }

        const mappedData = await Promise.all(paginatedData.map(async (config) => {
            const nextDate = (config as any).nextExecutionDate;

            const parentConfig = (config.parentId && config.parentId !== config.id)
                ? config.parentId || null
                : null;

            const newConfig: any = {
                ...config,
                nextExecutionDate: nextDate ? dayjs(nextDate).format('DD-MM-YYYY') : null,
                lastExecutionDate: config.lastExecutedAt ? dayjs(config.lastExecutedAt).format('DD-MM-YYYY') : null,
                code: config.code || (config.taskId ? taskCodeMap.get(config.taskId) || null : null),
                parent: parentConfig,
            };
            delete newConfig.startDate;
            delete newConfig.endDate;

            const mappingFields = [
                { code: 'DOUUTIEN', value: config.priority, key: 'priority' },
                { code: 'CDCV', value: config.topic, key: 'topic' },
                { code: 'CONGVIECLAPLAI', value: config.repetitiveTask, key: 'repetitiveTask' },
            ].filter(f => f.value && String(f.value).trim() !== '');

            if (mappingFields.length) {
                const conditions = mappingFields.map((_, i) => `(cs.code = @${i * 2} AND csd.value = @${i * 2 + 1})`).join(' OR ');
                const params = mappingFields.flatMap((f) => [f.code, String(f.value)]);
                const query = `
                  SELECT cs.code, csd.value, csd.title
                  FROM crm_sources cs
                  JOIN crm_source_data csd ON cs.id = csd.source_id
                  WHERE ${conditions}
                `;
                try {
                    const rows = await this.dataSource.query(query, params);
                    rows.forEach((row: any) => {
                        const field = mappingFields.find(f => f.code === row.code && String(f.value) === String(row.value));
                        if (field) newConfig[field.key] = row.title;
                    });
                } catch (e) {
                    console.error('Error mapping CRM titles:', e);
                }
            }

            if (config.createdAt) {
                newConfig.createdAt = dayjs(config.createdAt).format('DD-MM-YYYY');
            }
            if (config.durationDays) {
                newConfig.durationDays = `${config.durationDays} ngày`;
            }

            let statusLabel = 'Không xác định';
            let bgColor = '#E0E0E0';
            let borderColor = '#AEB5BE';
            let textColor = '#555555';

            switch (config.status) {
                case 0:
                    statusLabel = 'Kết thúc';
                    bgColor = '#FFDCD9';
                    borderColor = '#c73535ff';
                    textColor = '#F44336';
                    break;
                case 1:
                    statusLabel = 'Hoạt động';
                    bgColor = '#D0FFDE';
                    borderColor = '#ADECC0';
                    textColor = '#007D3E';
                    break;
                case 2:
                    statusLabel = 'Tạm dừng';
                    bgColor = '#FEF9C2';
                    borderColor = '#AEB5BE';
                    textColor = '#FFA600';
                    break;
            }
            newConfig.statusText = statusLabel;
            newConfig.status = `<div style="display: flex; align-items: center; justify-content: center; width: 142px; height: 24px; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 22px; color: ${textColor}; font-size: 0.75rem; font-weight: 700; text-transform: none; box-sizing: border-box;">${statusLabel}</div>`;
            newConfig.flag = newConfig.priority === 'Gấp' ? RED_FLAG_SVG : WHITE_FLAG_SVG;

            if (config.createdById) {
                const creator = userMap.get(config.createdById);
                newConfig.createdBy = creator?.name || config.createdById;
            }
            if (config.updatedById) {
                const updater = userMap.get(config.updatedById);
                newConfig.updatedBy = updater?.name || config.updatedById;
            }

            return newConfig;
        }));

        return { data: mappedData, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    }

    async findActiveDueCandidates(checkMoment: dayjs.Dayjs): Promise<TaskRecurringConfigEntity[]> {
        const startOfDay = checkMoment.startOf('day').toDate();

        return this.createQueryBuilder('config')
            .select([
                'config.id',
                'config.name',
                'config.repetitiveTask',
                'config.daysOfWeek',
                'config.monthInQuarter',
                'config.executionType',
                'config.dayOfMonth',
                'config.relativeWeek',
                'config.relativeDay',
                'config.startTime',
                'config.durationDays',
                'config.startDate',
                'config.endDate',
                'config.taskData',
                'config.bpmnId',
                'config.docType',
                'config.flowId',
                'config.routingKey',
                'config.status',
                'config.lastExecutedAt',
                'config.createdById',
                'config.updatedById',
                'config.isApprovalRequired',
            ])
            .where('config.status = :status', { status: 1 })
            .andWhere('(config.lastExecutedAt IS NULL OR config.lastExecutedAt < :startOfDay)', { startOfDay })
            .orderBy('config.id', 'ASC')
            .getMany();
    }

    async claimDueConfigForToday(
        configId: number,
        startOfDay: Date,
        claimedAt: Date,
    ): Promise<boolean> {
        const result = await this.createQueryBuilder()
            .update(TaskRecurringConfigEntity)
            .set({ lastExecutedAt: claimedAt })
            .where('id = :configId', { configId })
            .andWhere('status = :status', { status: 1 })
            .andWhere('(lastExecutedAt IS NULL OR lastExecutedAt < :startOfDay)', { startOfDay })
            .execute();

        return !!result.affected && result.affected > 0;
    }

    private calculateNextExecutionDate(config: TaskRecurringConfigEntity): Date | null {
        const today = dayjs().startOf('day');
        let current = today;
        if (config.lastExecutedAt && dayjs(config.lastExecutedAt).isSame(today, 'day')) {
            current = current.add(1, 'day');
        }

        for (let i = 0; i < 730; i++) {
            if (this.isRecurringConfigDue(config, current)) {
                return current.toDate();
            }
            current = current.add(1, 'day');
        }
        return null;
    }

    private isRecurringConfigDue(config: TaskRecurringConfigEntity, checkDate: dayjs.Dayjs): boolean {
        const { repetitiveTask, daysOfWeek, monthInQuarter } = config;

        const type = this.normalizeRecurringType(repetitiveTask || '');

        if (['daily', 'hang ngay', 'ngay'].includes(type)) return true;

        if (['weekly', 'tuan', 'tuần', 'theo tuần', 'hang tuan', 'hàng tuần'].includes(type)) {
            if (!daysOfWeek) return false;
            const selectedDays = daysOfWeek.split(',').map(d => parseInt(d.trim()));
            const currentDay = checkDate.day() === 0 ? 8 : checkDate.day() + 1;
            return selectedDays.includes(currentDay);
        }

        if (['monthly', 'thang', 'tháng', 'theo tháng', 'hang thang', 'hàng tháng'].includes(type)) {
            return this.isDayOfMonthMatch(config, checkDate);
        }

        if (['quarterly', 'quy', 'quý', 'theo quý', 'hang quy', 'hàng quý'].includes(type)) {
            if (monthInQuarter) {
                const currentMonthInQuarter = (checkDate.month() % 3) + 1;
                if (currentMonthInQuarter !== monthInQuarter) return false;
            }
            return this.isDayOfMonthMatch(config, checkDate);
        }

        return false;
    }

    private normalizeRecurringType(value: string): string {
        return (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    private isDayOfMonthMatch(config: TaskRecurringConfigEntity, date: dayjs.Dayjs): boolean {
        const { executionType, dayOfMonth, relativeWeek, relativeDay } = config;

        if (executionType === 'specific_day') {
            return date.date() === (dayOfMonth || 1);
        }

        if (executionType === 'last_day') {
            return date.date() === date.daysInMonth();
        }

        if (executionType === 'relative_day') {
            if (relativeDay === undefined || !relativeWeek) return false;

            let targetDayjsIndex = relativeDay - 1;
            if (relativeDay === 8) targetDayjsIndex = 0;

            const startOfMonth = date.startOf('month');
            let targetDate: dayjs.Dayjs;

            if (relativeWeek === 'last') {
                const endOfMonth = date.endOf('month');
                targetDate = endOfMonth.subtract((endOfMonth.day() - targetDayjsIndex + 7) % 7, 'day');
            } else {
                const firstOccurrence = startOfMonth.add((targetDayjsIndex - startOfMonth.day() + 7) % 7, 'day');
                const weeksToAdd = { first: 0, 1: 0, second: 1, 2: 1, third: 2, 3: 2, fourth: 3, 4: 3 }[relativeWeek] || 0;
                targetDate = firstOccurrence.add(weeksToAdd, 'week');
            }

            return date.isSame(targetDate, 'day');
        }
        return false;
    }
}
