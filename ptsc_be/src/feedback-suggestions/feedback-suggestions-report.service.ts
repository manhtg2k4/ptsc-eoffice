import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import * as dayjs from 'dayjs';
import { FeedbackSuggestionEntity } from './entities/feedback-suggestion.entity';
import { FeedbackHistoryEntity } from './entities/feedback-history.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from '../users/entities/user.entity';
import { FeedbackReportFilterDto, FeedbackTypeReportFilterDto, FeedbackUnitReportFilterDto, FeedbackOverdueReportFilterDto, FeedbackSatisfactionReportFilterDto } from './dto/report-filters.dto';
import { CrmSourcesService } from '../crmsource/crmsource.service';

// Reusing constants from the main service if possible, or defining them here
const FEEDBACK_STATUS = {
    WAITING_DISPATCH: 1,
    WAITING_PROCESS: 2,
    PROCESSING: 3,
    COMPLETED: 4,
    REJECTED: 5,
};

const PROCESS_STATUS_LABEL: Record<number, string> = {
    1: 'Chờ điều phối',
    2: 'Chờ xử lý',
    3: 'Đang xử lý',
    4: 'Đã xử lý',
    5: 'Từ chối',
};

@Injectable()
export class FeedbackSuggestionsReportService {
    private readonly logger = new Logger(FeedbackSuggestionsReportService.name);

    constructor(
        @InjectRepository(FeedbackSuggestionEntity, 'mssqlConnection')
        private readonly feedbackRepo: Repository<FeedbackSuggestionEntity>,
        @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
        private readonly unitRepo: Repository<OrganizationUnitEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepo: Repository<UserEntity>,
        @InjectRepository(FeedbackHistoryEntity, 'mssqlConnection')
        private readonly historyRepo: Repository<FeedbackHistoryEntity>,
        private readonly crmSourcesService: CrmSourcesService,
    ) { }

    private async getFeedbackTypeMap(): Promise<Record<string, { id: string; title: string }>> {
        try {
            const crmData = await this.crmSourcesService.findByCode('LOAIPHANANH');
            const map: Record<string, { id: string; title: string }> = {};
            if (crmData?.items) {
                crmData.items.forEach((item: any) => {
                    map[item.value] = { id: item.id, title: item.title };
                });
            }
            return map;
        } catch (error) {
            this.logger.error(`Error fetching LOAIPHANANH CRM Source: ${error.message}`);
            // Fallback static map if CRM source fails
            const fallback: Record<string, string> = {
                '1': 'Thủ tục hành chính nội bộ',
                '2': 'Chính sách chế độ',
                '3': 'Cơ sở vật chất',
                '4': 'Môi trường làm việc',
                '5': 'Đồng nghiệp lãnh đạo',
                '6': 'Kiến nghị cải tiến quy trình',
                '7': 'Khác',
            };
            const map: Record<string, { id: string; title: string }> = {};
            Object.keys(fallback).forEach(key => {
                map[key] = { id: key, title: fallback[key] };
            });
            return map;
        }
    }

    /** Map processStatus (số) → HTML badge giống module công việc */
    private mapProcessStatusToHtml(processStatus: number | null | undefined): string {
        switch (Number(processStatus)) {
            case 1:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF9C2;color:#FFA600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Chờ điều phối</div>`;
            case 2:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFE8CC;color:#C05600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Chờ xử lý</div>`;
            case 3:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#ACCBFF;color:#002089;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Đang xử lý</div>`;
            case 4:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#D0FFDE;color:#007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Đã xử lý</div>`;
            case 5:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFDCD9;color:#F44336;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #c73535ff;">Từ chối</div>`;
            default:
                return `<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E0E0E0;color:#555;font-weight:700;font-size:14px;border-radius:15px;">Không xác định</div>`;
        }
    }

    /**
     * BÁO CÁO 10.1: DANH SÁCH PHẢN ÁNH, KIẾN NGHỊ THEO THỜI GIAN
     */
    async getListReport(filters: any, userId?: string) {
        filters = this.applyFrontendFilters(filters);
        const qb = this.feedbackRepo.createQueryBuilder('f')
            .leftJoinAndSelect('f.createdBy', 'cu')
            .leftJoin(UserEntity, 'pu', 'f.processor_id = pu.id')
            .leftJoin(OrganizationUnitEntity, 'ou', 'f.unit_id = ou.id')
            .select('f.id', 'f_id')
            .addSelect('f.code', 'f_code')
            .addSelect('f.createdAt', 'f_created_at')
            .addSelect('f.types', 'f_types')
            .addSelect('f.title', 'f_title')
            .addSelect('f.deadline', 'f_deadline')
            .addSelect('f.processStatus', 'f_process_status')
            .addSelect('cu.name', 'cu_name')
            .addSelect('pu.name', 'pu_name')
            .addSelect('ou.name', 'ou_name');

        if (filters.fromDate) {
            qb.andWhere('f.createdAt >= :fromDate', { fromDate: dayjs(filters.fromDate).startOf('day').toDate() });
        }
        if (filters.toDate) {
            qb.andWhere('f.createdAt <= :toDate', { toDate: dayjs(filters.toDate).endOf('day').toDate() });
        }
        if (filters.type) {
            qb.andWhere('f.types = :type', { type: filters.type });
        }
        if (filters.unitId) {
            qb.andWhere('f.unitId = :unitId', { unitId: filters.unitId });
        }
        if (filters.processStatus) {
            qb.andWhere('f.processStatus = :processStatus', { processStatus: filters.processStatus });
        }
        if (filters.processorId) {
            qb.andWhere('f.processor_id = :processorId', { processorId: filters.processorId });
        }
        if (filters.code) {
            qb.andWhere('f.code LIKE :code', { code: `%${filters.code}%` });
        }
        if (filters.title) {
            qb.andWhere('f.title LIKE :title', { title: `%${filters.title}%` });
        }

        // --- SCOPING / ISOLATION (CWE-285 Remediation) ---
        if (userId) {
            const isBPCT = await this.checkIsBPCT(userId);
            if (!isBPCT) {
                // Nếu không phải admin/BPCT, chỉ xem được của mình hoặc nhân viên cấp dưới
                const subordinateIds = await this.getSubordinateIds(userId);
                const allowedUserIds = [userId, ...subordinateIds];
                qb.andWhere('f.created_by_id IN (:...allowedUserIds)', { allowedUserIds });
            }
        }
        // --- End Scoping ---

        const total = await qb.getCount();

        if (filters.page && filters.limit) {
            qb.skip((filters.page - 1) * filters.limit).take(filters.limit);
        }

        const data = await qb.orderBy('f.createdAt', 'DESC').getRawMany();
        const typeMap = await this.getFeedbackTypeMap();

        const items = data.map((item, index) => ({
            id: item.f_id,
            stt: filters.page && filters.limit ? (filters.page - 1) * filters.limit + index + 1 : index + 1,
            maPA: item.f_code,
            ngayGui: dayjs(item.f_created_at).format('DD/MM/YYYY'),
            nguoiGui: item.cu_name || '',
            loaiPA: typeMap[item.f_types]?.title || item.f_types,
            tieuDe: item.f_title,
            nguoiXuLy: item.pu_name || '',
            donViXuLy: item.ou_name || '',
            hanXuLy: item.f_deadline ? dayjs(item.f_deadline).format('DD/MM/YYYY') : '',
            trangThai: this.mapProcessStatusToHtml(item.f_process_status)
        }));

        return {
            items,
            total,
            page: filters.page ? Number(filters.page) : 1,
            limit: filters.limit ? Number(filters.limit) : total
        };
    }

    /**
     * Kiểm tra user có thuộc Bộ phận chuyên trách không
     * (có roleCode = 'BO_PHAN_CHUYEN_TRACH' trong rolesByProcess)
     */
    async canAccessListByTimeReport(userId: string): Promise<boolean> {
        if (!userId) return false;

        try {
            if (await this.checkIsBPCT(userId)) return true;

            const managerSql = `
                SELECT TOP 1 1
                FROM user_group_users ugu
                INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                WHERE ugu.user_id = @0
                  AND gu.code IN ('truongphong', 'photruongphong')
            `;
            const managerRs = await this.userRepo.query(managerSql, [userId]);
            if (managerRs.length > 0) return true;

            const user = await this.userRepo.findOne({
                where: { id: userId },
                select: ['id', 'role'],
            });
            return String(user?.role || '').toUpperCase() === 'ADMIN';
        } catch (e) {
            this.logger.error(`canAccessListByTimeReport error: ${e.message}`);
            return false;
        }
    }

    private async checkIsBPCT(userId: string): Promise<boolean> {
        try {
            const sql = `
                SELECT TOP 1 u.id
                FROM users u
                CROSS APPLY OPENJSON(CASE WHEN ISJSON(u.roles_by_process) > 0 THEN u.roles_by_process ELSE '[]' END) AS p
                CROSS APPLY OPENJSON(JSON_QUERY(p.value, '$.roles')) AS r
                WHERE u.id = @0
                  AND JSON_VALUE(r.value, '$.roleCode') = 'BO_PHAN_CHUYEN_TRACH'
                  AND u.status = 1
            `;
            const result = await this.userRepo.query(sql, [userId]);
            if (result.length > 0) return true;

            // Fallback: kiểm tra trường role trực tiếp
            const user = await this.userRepo.findOne({
                where: { id: userId },
                select: ['id', 'role'],
            });
            return user?.role === 'BO_PHAN_CHUYEN_TRACH' || user?.role === 'ADMIN';
        } catch (e) {
            this.logger.error(`checkIsBPCT error: ${e.message}`);
            return false;
        }
    }

    /**
     * Lấy danh sách ID của nhân viên do userId quản lý
     * (users có trường leader = userId)
     */
    private async getSubordinateIds(userId: string): Promise<string[]> {
        try {
            const subordinates = await this.userRepo.find({
                where: { leader: userId, status: 1 } as any,
                select: ['id'],
            });
            return subordinates.map(u => u.id);
        } catch (e) {
            this.logger.error(`getSubordinateIds error: ${e.message}`);
            return [];
        }
    }


    /**
     * BÁO CÁO 10.2: THỐNG KÊ PHẢN ÁNH THEO LOẠI
     */
    async getTypeStatisticsReport(filters: any, userId?: string) {
        filters = this.applyFrontendFilters(filters);
        const qb = this.feedbackRepo.createQueryBuilder('f');

        if (filters.fromDate) {
            qb.andWhere('f.createdAt >= :fromDate', { fromDate: dayjs(filters.fromDate).startOf('day').toDate() });
        }
        if (filters.toDate) {
            qb.andWhere('f.createdAt <= :toDate', { toDate: dayjs(filters.toDate).endOf('day').toDate() });
        }
        if (filters.senderUnitId) {
            qb.innerJoin('f.createdBy', 'cu', 'cu.parent = :unitId', { unitId: filters.senderUnitId });
        }
        if (filters.type) {
            qb.andWhere('f.types = :type', { type: filters.type });
        }

        // Subquery for completion time
        const completionSubQuery = this.historyRepo.createQueryBuilder('h')
            .select('h.feedback_id', 'feedbackId')
            .addSelect('MAX(h.performed_at)', 'completedAt')
            .where("h.action = N'Hoàn tất xử lý phản ánh'")
            .groupBy('h.feedback_id');

        qb.leftJoin(`(${completionSubQuery.getQuery()})`, 'hc', 'hc.feedbackId = f.id')
            .setParameters(completionSubQuery.getParameters());

        qb.select('f.types', 'loaiPA')
            .addSelect('COUNT(*)', 'total')
            .addSelect(`SUM(CASE WHEN f.process_status = ${FEEDBACK_STATUS.COMPLETED} THEN 1 ELSE 0 END)`, 'completed')
            .addSelect(`SUM(CASE WHEN f.process_status = ${FEEDBACK_STATUS.PROCESSING} THEN 1 ELSE 0 END)`, 'processing')
            .addSelect(`SUM(CASE WHEN f.process_status = ${FEEDBACK_STATUS.WAITING_DISPATCH} OR f.process_status = ${FEEDBACK_STATUS.WAITING_PROCESS} THEN 1 ELSE 0 END)`, 'waiting')
            .addSelect(`SUM(CASE WHEN (f.process_status != ${FEEDBACK_STATUS.COMPLETED} AND f.deadline < GETDATE()) OR (hc.completedAt > f.deadline) THEN 1 ELSE 0 END)`, 'overdue')
            .addSelect(`AVG(CASE WHEN f.process_status = ${FEEDBACK_STATUS.COMPLETED} THEN CAST(DATEDIFF(minute, f.created_at, hc.completedAt) AS DECIMAL(10,2)) / 1440.0 END)`, 'avgTime')
            .groupBy('f.types');

        const stats = await qb.getRawMany();
        const typeMap = await this.getFeedbackTypeMap();

        let items = stats.map((s, index) => ({
            id: typeMap[s.loaiPA]?.id || s.loaiPA,
            stt: index + 1,
            loaiPhanAnh: typeMap[s.loaiPA]?.title || s.loaiPA,
            soLuong: Number(s.total) || 0,
            daXuLy: Number(s.completed) || 0,
            dangXuLy: Number(s.processing) || 0,
            choXuLy: Number(s.waiting) || 0,
            quaHan: Number(s.overdue) || 0,
            tgXuLyTB: (s.avgTime !== null && s.avgTime !== undefined) ? Number(s.avgTime).toFixed(1) : '0'
        }));

        if (filters.avgTimeThreshold !== undefined && filters.avgTimeThreshold !== null) {
            items = items.filter(item => Number(item.tgXuLyTB) >= filters.avgTimeThreshold!);
        }

        const total = items.length;

        if (filters.page && filters.limit) {
            const page = Number(filters.page);
            const limit = Number(filters.limit);
            const start = (page - 1) * limit;
            items = items.slice(start, start + limit);
            items = items.map((item, index) => ({ ...item, stt: start + index + 1 }));
        }

        return {
            items,
            total,
            page: filters.page ? Number(filters.page) : 1,
            limit: filters.limit ? Number(filters.limit) : total
        };
    }

    /**
     * BÁO CÁO 10.3: DANH SÁCH PHẢN ÁNH QUÁ HẠN XỬ LÝ
     */
    async getOverdueListReport(filters: any, userId?: string) {
        filters = this.applyFrontendFilters(filters);
        const qb = this.feedbackRepo.createQueryBuilder('f')
            .leftJoin(UserEntity, 'pu', 'f.processor_id = pu.id')
            .leftJoin(OrganizationUnitEntity, 'ou', 'f.unit_id = ou.id')
            .select('f.id', 'f_id')
            .addSelect('f.code', 'f_code')
            .addSelect('f.createdAt', 'f_created_at')
            .addSelect('f.types', 'f_types')
            .addSelect('f.title', 'f_title')
            .addSelect('f.deadline', 'f_deadline')
            .addSelect('f.overdueReason', 'f_overdue_reason')
            .addSelect('f.processStatus', 'f_process_status')
            .addSelect('pu.name', 'pu_name')
            .addSelect('ou.name', 'ou_name');

        if (filters.fromDate) {
            qb.andWhere('f.createdAt >= :fromDate', { fromDate: dayjs(filters.fromDate).startOf('day').toDate() });
        }
        if (filters.toDate) {
            qb.andWhere('f.createdAt <= :toDate', { toDate: dayjs(filters.toDate).endOf('day').toDate() });
        }
        if (filters.type) {
            qb.andWhere('f.types = :type', { type: filters.type });
        }

        const completionSubQuery = this.historyRepo.createQueryBuilder('h')
            .select('h.feedback_id', 'feedbackId')
            .addSelect('MAX(h.performed_at)', 'completedAt')
            .where("h.action = N'Hoàn tất xử lý phản ánh'")
            .groupBy('h.feedback_id');

        qb.leftJoin(`(${completionSubQuery.getQuery()})`, 'hc', 'hc.feedbackId = f.id')
            .setParameters(completionSubQuery.getParameters());

        qb.andWhere(new Brackets(sqb => {
            sqb.where(`f.process_status != ${FEEDBACK_STATUS.COMPLETED} AND f.deadline < GETDATE()`)
                .orWhere('hc.completedAt > f.deadline');
        }));

        const data = await qb.orderBy('f.deadline', 'ASC').getRawMany();
        const typeMap = await this.getFeedbackTypeMap();

        return data.map((item, index) => {
            const deadline = dayjs(item.f_deadline);
            const completedAt = item.hc_completedAt ? dayjs(item.hc_completedAt) : null;
            const now = dayjs();

            let overdueDays = 0;
            if (item.f_process_status === FEEDBACK_STATUS.COMPLETED && completedAt) {
                overdueDays = completedAt.diff(deadline, 'day');
            } else {
                overdueDays = now.diff(deadline, 'day');
            }

            return {
                stt: index + 1,
                maPA: item.f_code,
                ngayGui: dayjs(item.f_created_at).format('DD/MM/YYYY'),
                loaiPA: typeMap[item.f_types]?.title || item.f_types,
                tieuDe: item.f_title,
                nguoiXuLy: item.pu_name || '',
                donViXuLy: item.ou_name || '',
                hanXuLy: item.f_deadline ? dayjs(item.f_deadline).format('DD/MM/YYYY') : '',
                soNgayQua: overdueDays > 0 ? overdueDays : 0,
                lyDo: item.f_overdue_reason || '',
                trangThai: this.mapProcessStatusToHtml(item.f_process_status)
            };
        });
    }

    /**
     * BÁO CÁO 10.4: THỐNG KÊ PHẢN ÁNH THEO ĐƠN VỊ XỬ LÝ
     */
    async getUnitStatisticsReport(filters: any, userId?: string) {
        filters = this.applyFrontendFilters(filters);
        const qb = this.feedbackRepo.createQueryBuilder('f')
            .leftJoin(OrganizationUnitEntity, 'ou', 'f.unit_id = ou.id');

        if (filters.month) {
            qb.andWhere('MONTH(f.createdAt) = :month', { month: filters.month });
        }
        if (filters.year) {
            qb.andWhere('YEAR(f.createdAt) = :year', { year: filters.year });
        }

        if (filters.unitId) {
            qb.andWhere('f.unitId = :unitId', { unitId: filters.unitId });
        }

        if (filters.type) {
            qb.andWhere('f.types = :type', { type: filters.type });
        }

        const completionSubQuery = this.historyRepo.createQueryBuilder('h')
            .select('h.feedback_id', 'feedbackId')
            .addSelect('MAX(h.performed_at)', 'completedAt')
            .where("h.action = N'Hoàn tất xử lý phản ánh'")
            .groupBy('h.feedback_id');

        qb.leftJoin(`(${completionSubQuery.getQuery()})`, 'hc', 'hc.feedbackId = f.id')
            .setParameters(completionSubQuery.getParameters());

        qb.select('f.unit_id', 'unitId')
            .addSelect('ou.name', 'tenDonVi')
            .addSelect('COUNT(*)', 'total')
            .addSelect(`SUM(CASE WHEN f.process_status = ${FEEDBACK_STATUS.COMPLETED} THEN 1 ELSE 0 END)`, 'completed')
            .addSelect(`SUM(CASE WHEN f.process_status = ${FEEDBACK_STATUS.COMPLETED} AND hc.completedAt <= f.deadline THEN 1 ELSE 0 END)`, 'onTime')
            .addSelect(`SUM(CASE WHEN (hc.completedAt > f.deadline) OR (f.process_status != ${FEEDBACK_STATUS.COMPLETED} AND f.deadline < GETDATE()) THEN 1 ELSE 0 END)`, 'overdue')
            .addSelect(`AVG(CAST(DATEDIFF(minute, f.created_at, ISNULL(hc.completedAt, GETDATE())) AS DECIMAL(10,2)) / 1440.0)`, 'avgTime')
            .groupBy('f.unit_id')
            .addGroupBy('ou.name');

        const stats = await qb.getRawMany();
        const total = stats.length;

        let items = stats.map((s, index) => {
            const completed = Number(s.completed) || 0;
            const onTime = Number(s.onTime) || 0;
            const rate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

            return {
                unitid: s.unitId,
                stt: index + 1,
                donViXuLy: s.tenDonVi || 'Khác',
                soPANhan: Number(s.total) || 0,
                daXuLy: completed,
                dungHan: onTime,
                quaHan: Number(s.overdue) || 0,
                tgXuLyTB: (s.avgTime !== null && s.avgTime !== undefined) ? Number(s.avgTime).toFixed(1) : '0',
                tyLeDungHan: `${rate}%`
            };
        });

        if (filters.page && filters.limit) {
            const page = Number(filters.page);
            const limit = Number(filters.limit);
            const start = (page - 1) * limit;
            items = items.slice(start, start + limit);
            items = items.map((item, index) => ({ ...item, stt: start + index + 1 }));
        }

        return {
            items,
            total,
            page: filters.page ? Number(filters.page) : 1,
            limit: filters.limit ? Number(filters.limit) : total
        };
    }

    /**
     * BÁO CÁO 10.5: ĐÁNH GIÁ MỨC ĐỘ HÀI LÒNG
     */
    async getSatisfactionReport(filters: any, userId?: string) {
        filters = this.applyFrontendFilters(filters);
        const qb = this.feedbackRepo.createQueryBuilder('f')
            .leftJoin(OrganizationUnitEntity, 'ou', 'f.unit_id = ou.id');

        if (filters.fromDate) {
            qb.andWhere('f.createdAt >= :fromDate', { fromDate: dayjs(filters.fromDate).startOf('day').toDate() });
        }
        if (filters.toDate) {
            qb.andWhere('f.createdAt <= :toDate', { toDate: dayjs(filters.toDate).endOf('day').toDate() });
        }
        if (filters.unitId) {
            qb.andWhere('f.unitId = :unitId', { unitId: filters.unitId });
        }
        if (filters.type) {
            qb.andWhere('f.types = :type', { type: filters.type });
        }
        if (filters.satisfactionLevel) {
            qb.andWhere('f.satisfactionLevel = :satisfactionLevel', { satisfactionLevel: filters.satisfactionLevel });
        }

        qb.select('f.unit_id', 'unitId')
            .addSelect('ou.name', 'tenDonVi')
            .addSelect('COUNT(*)', 'total')
            .addSelect(`SUM(CASE WHEN f.satisfaction_level = N'Hài lòng' THEN 1 ELSE 0 END)`, 'satisfied')
            .addSelect(`SUM(CASE WHEN f.satisfaction_level = N'Bình thường' THEN 1 ELSE 0 END)`, 'normal')
            .addSelect(`SUM(CASE WHEN f.satisfaction_level = N'Không hài lòng' THEN 1 ELSE 0 END)`, 'unsatisfied')
            .groupBy('f.unit_id')
            .addGroupBy('ou.name');

        const stats = await qb.getRawMany();

        return stats.map((s, index) => ({
            stt: index + 1,
            donViXuLy: s.tenDonVi || 'Khác',
            soLuongPA: Number(s.total) || 0,
            haiLong: Number(s.satisfied) || 0,
            binhThuong: Number(s.normal) || 0,
            khongHaiLong: Number(s.unsatisfied) || 0
        }));
    }

    /** Helper to map frontend filter structure to service expected keys */
    private applyFrontendFilters(filters: any) {
        if (!filters.filter) return filters;

        const f = filters.filter;
        const newFilters = { ...filters, ...f };

        // 1. Date range mapping (ngayGui)
        if (f.ngayGui) {
            if (f.ngayGui.startDate) newFilters.fromDate = f.ngayGui.startDate;
            if (f.ngayGui.endDate) newFilters.toDate = f.ngayGui.endDate;
        }

        // 2. Processor mapping (nguoiXuLy)
        if (f.nguoiXuLy) newFilters.processorId = f.nguoiXuLy;

        // 3. Status mapping (trangThai)
        if (f.trangThai) {
            const reverseMap: Record<string, number> = {
                'Chờ điều phối': 1,
                'Chờ xử lý': 2,
                'Đang xử lý': 3,
                'Đã xử lý': 4,
                'Hoàn thành': 4,
                'Từ chối': 5,
            };
            newFilters.processStatus = reverseMap[f.trangThai];
        }

        // 4. Unit mapping (donViXuLy & donViXuLyFilter)
        if (f.donViXuLy) newFilters.unitId = f.donViXuLy;
        if (f.donViXuLyFilter) newFilters.unitId = f.donViXuLyFilter;

        // 5. loaiPA mapping (types)
        if (f.loaiPA) newFilters.type = f.loaiPA;

        // 6. maPA mapping (code)
        if (f.maPA) newFilters.code = f.maPA;

        // 7. tieuDe mapping (title)
        if (f.tieuDe) newFilters.title = f.tieuDe;

        // 8. donViNguoiGui mapping (senderUnitId)
        if (f.donViNguoiGui) newFilters.senderUnitId = f.donViNguoiGui;

        // 9. tgXuLyTBFilter mapping (avgTimeThreshold)
        if (f.tgXuLyTBFilter) newFilters.avgTimeThreshold = Number(f.tgXuLyTBFilter);

        // 10. Month/Year mapping for Statistics by Unit
        if (f.month) newFilters.month = Number(f.month);
        if (f.year) newFilters.year = Number(f.year);

        // 11. Satisfaction level mapping
        if (f.mucDoHaiLong) newFilters.satisfactionLevel = f.mucDoHaiLong;

        return newFilters;
    }
}
