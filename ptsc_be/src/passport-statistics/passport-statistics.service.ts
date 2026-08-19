import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets } from 'typeorm';
import { PassportEntity } from '../passports/entities/passport.entity';
import { PassportRequestEntity } from '../passport-requests/entities/passport-request.entity';
import { OrganizationUnitEntity } from '../organization-unit/organization-unit_sql/organization-unit.entity';
import { UserEntity } from '../users/entities/user.entity';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';
import * as dayjs from 'dayjs';
import {
    PassportManagedQueryDto,
    PassportHistoryQueryDto,
    PassportDeptStatsQueryDto,
    BusinessTripQueryDto
} from './dtos/passport-statistics.dto';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { CrmSourcesService } from '../crmsource/crmsource.service';


@Injectable()
export class PassportStatisticsService {
    constructor(
        @InjectRepository(PassportEntity, 'mssqlConnection')
        private readonly passportRepository: Repository<PassportEntity>,
        @InjectRepository(PassportRequestEntity, 'mssqlConnection')
        private readonly requestRepository: Repository<PassportRequestEntity>,
        @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
        private readonly unitRepository: Repository<OrganizationUnitEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepository: Repository<UserEntity>,
        private readonly systemLogService: SystemLogServiceSql,
        private readonly sqlsvRepo: SQLSVRepository,
        private readonly crmSourcesService: CrmSourcesService,
    ) { }


    private normalizeFilterParams(query: any) {
        const filter = query.filter || query || {};
        const { page = 1, limit = 10, sort, ...rest } = query;

        let parsedSort = {};
        if (sort) {
            try { parsedSort = typeof sort === 'string' ? JSON.parse(sort) : sort; } catch (e) { }
        } else if (filter?.sort) {
            try { parsedSort = typeof filter.sort === 'string' ? JSON.parse(filter.sort) : filter.sort; } catch (e) { }
        }

        // Động hóa bóc tách các dải DateRange (ví dụ: borrowDate, _remainingDays) lên thẳng root (fromDate / toDate) để các hàm dùng chung mốc biến độc lập
        let rootFromDate = filter?.fromDate || query?.fromDate || filter?.startDate;
        let rootToDate = filter?.toDate || query?.toDate || filter?.endDate;

        if (!rootFromDate && !rootToDate && filter) {
            const dateKey = Object.keys(filter).find(k => {
                const v = filter[k];
                return v && typeof v === 'object' && (v.startDate || v.endDate || v.fromDate || v.toDate);
            });
            if (dateKey) {
                const nested = filter[dateKey];
                rootFromDate = nested.startDate || nested.fromDate;
                rootToDate = nested.endDate || nested.toDate;
            }
        }

        return {
            ...rest,
            ...filter,
            page: Number(page),
            limit: Number(limit),
            sort: parsedSort,
            fromDate: rootFromDate,
            toDate: rootToDate
        };
    }

    /**
     * BÁO CÁO 9.1: DANH SÁCH HỘ CHIẾU ĐANG QUẢN LÝ
     */
    async getManagedPassports(query: PassportManagedQueryDto, userId: string, ipAddress: string) {
        try {
            const filterParams = this.normalizeFilterParams(query);
            const { departmentId, usageStatus, remainingMonths, fromDate, toDate, _remainingDays, dayLeft, daysLeft, page = 1, limit = 10 } = filterParams;

            const qb = this.passportRepository.createQueryBuilder('p')
                .leftJoinAndSelect('p.user', 'u')
                .leftJoinAndSelect('u.parent', 'dept')
                .where('p.isDeleted = 0');

            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (departmentId) {
                qb.andWhere('u.parent = :departmentId', { departmentId });
            } else if (!isAllStatistic) {
                // Phân quyền theo cấp bậc: lọc theo phòng ban cấp dưới
                const subOrgIds = await this.sqlsvRepo.getSubordinateOrgIds(userId);
                if (subOrgIds.length > 0) {
                    qb.andWhere(new Brackets(qbInner => {
                        qbInner.where('u.parent IN (:...subOrgIds)', { subOrgIds })
                            .orWhere('p.departmentName IN (:...subOrgIds)', { subOrgIds });
                    }));
                }
            }

            if (usageStatus) {
                qb.andWhere('p.usageStatus = :usageStatus', { usageStatus });
            }

            const parsedFromDate = this.parseToDate(fromDate);
            const parsedToDate = this.parseToDate(toDate);

            if (parsedFromDate) {
                qb.andWhere('p.expiryDate >= :fromDate', { fromDate: parsedFromDate });
            }

            if (parsedToDate) {
                qb.andWhere('p.expiryDate <= :toDate', { toDate: dayjs(parsedToDate).endOf('day').toDate() });
            }

            const passports = await qb.getMany();
            const now = dayjs();

            const deptIds = [...new Set(passports.map(p => p.departmentName).filter(Boolean))];
            let deptMap = new Map<string, string>();
            if (deptIds.length > 0) {
                const departments = await this.unitRepository.find({ where: { id: In(deptIds) } });
                deptMap = new Map(departments.map(d => [d.id, d.name]));
            }

            const result = passports.map((p, index) => {
                const expiryDate = dayjs(p.expiryDate);
                const remainingDays = expiryDate.diff(now, 'day');
                const remainingMonthsValue = expiryDate.diff(now, 'month');

                return {
                    stt: index + 1,
                    passportNumber: p.passportNumber,
                    fullName: p.fullName || p.user?.name || '',
                    departmentId: (p.user?.parent?.name) || deptMap.get(p.departmentName || '') || p.departmentName || '',
                    issueDate: p.issueDate ? dayjs(p.issueDate).format('DD/MM/YYYY') : '',
                    expiryDate: p.expiryDate ? dayjs(p.expiryDate).format('DD/MM/YYYY') : '',
                    remainingDays: remainingDays > 0 ? `${remainingDays} ngày` : `-${remainingDays} ngày    `,
                    usageStatus: this.mapUsageStatus(p.usageStatus),
                    _remainingMonths: remainingMonthsValue,
                    _remainingDays: remainingDays // for internal filtering
                };
            }).filter(p => {

                if (remainingMonths !== undefined && remainingMonths !== null && remainingMonths !== '') {
                    if (p._remainingMonths < 0 || p._remainingMonths > Number(remainingMonths)) return false;
                }
                const targetDayLeft = _remainingDays !== undefined ? _remainingDays : (dayLeft || daysLeft);
                if (targetDayLeft !== undefined && targetDayLeft !== null && targetDayLeft !== '') {
                    if (typeof targetDayLeft === 'object') {
                        const { startDate, endDate } = targetDayLeft as any;
                        if (startDate !== undefined && startDate !== null && startDate !== '') {
                            if (p._remainingDays < Number(startDate)) return false;
                        }
                        if (endDate !== undefined && endDate !== null && endDate !== '') {
                            if (p._remainingDays > Number(endDate)) return false;
                        }
                    } else {
                        if (p._remainingDays < 0 || p._remainingDays > Number(targetDayLeft)) return false;
                    }
                }
                return true;
            });

            const skip = (Number(page) - 1) * Number(limit);
            const slicedResult = result.slice(skip, skip + Number(limit));

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Báo cáo: Xem danh sách hộ chiếu đang quản lý',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_MANAGED',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                data: slicedResult,
                total: result.length,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.length / Number(limit))
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem danh sách hộ chiếu đang quản lý - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_MANAGED',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in PassportStatisticsService.getManagedPassports:', error);
            throw new InternalServerErrorException('Lỗi khi lấy danh sách hộ chiếu đang quản lý');
        }
    }

    /**
     * BÁO CÁO 9.2: LỊCH SỬ MƯỢN TRẢ HỘ CHIẾU
     */
    async getBorrowHistoryv2ngon(query: PassportHistoryQueryDto) {
        try {
            const { fromDate, toDate, borrowerId, status, page = 1, limit = 10 } = this.normalizeFilterParams(query);

            const qb = this.requestRepository.createQueryBuilder('r')
                .leftJoinAndSelect('r.passport', 'p')
                .leftJoinAndSelect('r.delegationItems', 'di')
                .leftJoinAndSelect('r.requester', 'u')
                .leftJoinAndSelect('u.parent', 'dept')
                .where('r.isDeleted = :isDeleted', { isDeleted: false });

            if (fromDate) {
                qb.andWhere('r.borrowDate >= :fromDate', { fromDate });
            }
            if (toDate) {
                qb.andWhere('r.borrowDate <= :toDate', {
                    toDate: dayjs(toDate).endOf('day').toDate()
                });
            }

            // === LẤY DANH SÁCH REQUEST (phân trang ở mức request khi không lọc in-memory) ===
            if (!status && !borrowerId) {
                const skip = (Number(page) - 1) * Number(limit);
                qb.skip(skip).take(Number(limit) * 6); // lấy dư để tránh thiếu khi flatten
            }

            const requests = await qb.getMany();

            // === LẤY THÔNG TIN ĐÃ TRẢ TỪ VOUCHER (sửa tên bảng) ===
            const requestIds = requests.map(r => r.id);
            const returnedMap = new Set<string>();

            if (requestIds.length > 0) {
                const voucherItems = await this.requestRepository.manager
                    .createQueryBuilder()
                    .select(['vi.request_id AS requestId', 'vi.passport_number AS passportNumber'])
                    .from('passport_voucher_items', 'vi')           // <-- bảng này đúng
                    .innerJoin('passport_vouchers', 'v', 'v.id = vi.voucher_id')
                    .where('vi.request_id IN (:...requestIds)', { requestIds })
                    .andWhere('v.voucher_type = :vType', { vType: 'RETURN' })
                    .andWhere('v.status = :vStatus', { vStatus: 'COMPLETED' })
                    .getRawMany();

                voucherItems.forEach(item => {
                    if (item.requestId && item.passportNumber) {
                        returnedMap.add(`${item.requestId}_${item.passportNumber}`);
                    }
                });
            }

            // === FLATTEN RESULT ===
            const flattenedResult: any[] = [];

            for (const r of requests) {
                const borrowDateStr = r.borrowDate ? dayjs(r.borrowDate).format('DD/MM/YYYY') : '';
                const dueDateStr = r.returnDate ? dayjs(r.returnDate).format('DD/MM/YYYY') : '';
                const purpose = r.reason || r.tripContent || '';

                if (r.typeRequest === 'user' || r.passportId) {
                    const passportNum = r.passportNumber || r.passport?.passportNumber || '';
                    const isReturned = returnedMap.has(`${r.id}_${passportNum}`);

                    flattenedResult.push({
                        stt: 0,
                        passportNumber: passportNum,
                        borrowerId: r.requester?.name || '',
                        borrowDate: borrowDateStr,
                        purpose,
                        approver: '',
                        dueDate: dueDateStr,
                        returnDate: '',
                        status: this.mapIndividualPassportStatus(isReturned),
                    });
                }
                else if (r.delegationItems && r.delegationItems.length > 0) {
                    for (const di of r.delegationItems) {
                        const passportNum = di.passportNumber || '';
                        const isReturned = returnedMap.has(`${r.id}_${passportNum}`);

                        flattenedResult.push({
                            stt: 0,
                            passportNumber: passportNum,
                            borrowerId: di.fullName || '',
                            borrowDate: borrowDateStr,
                            purpose,
                            approver: '',
                            dueDate: dueDateStr,
                            returnDate: '',
                            status: this.mapIndividualPassportStatus(isReturned),
                        });
                    }
                }
            }

            // === LỌC THEO STATUS VÀ BORROWER (ở memory) ===
            let filtered = flattenedResult;

            if (status) {
                const s = status.toLowerCase();
                if (s.includes('tra') || s.includes('returned')) {
                    filtered = filtered.filter(item => item.status?.includes('Đã trả'));
                } else if (s.includes('dung') || s.includes('use')) {
                    filtered = filtered.filter(item => item.status?.includes('Đang sử dụng'));
                }
            }

            if (borrowerId) {
                // Tìm tên một lần
                let borrowerName = '';
                const user = await this.userRepository.findOne({ where: { id: borrowerId } });
                if (user) {
                    borrowerName = user.name;
                }


                const searchTerm = (borrowerName || borrowerId).toLowerCase();
                filtered = filtered.filter(item =>
                    item.borrowerId?.toLowerCase().includes(searchTerm)
                );
            }

            // Phân trang cuối
            const finalSkip = (Number(page) - 1) * Number(limit);
            const paginated = filtered.slice(finalSkip, finalSkip + Number(limit));

            paginated.forEach((item, idx) => {
                item.stt = finalSkip + idx + 1;
            });

            return {
                statusCode: 200,
                data: paginated,
                total: filtered.length,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(filtered.length / Number(limit))
            };

        } catch (error) {
            console.error('Error in getBorrowHistory:', error);
            throw new InternalServerErrorException('Lỗi khi lấy lịch sử mượn trả hộ chiếu');
        }
    }

    async getBorrowHistory(query: PassportHistoryQueryDto, userId: string, ipAddress: string) {
        try {
            const { fromDate, toDate, borrowerId, status, page = 1, limit = 10 } = this.normalizeFilterParams(query);

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const params: any[] = [];

            // Xây dựng WHERE
            let whereClause = 'r.is_deleted = 0';

            if (fromDate) {
                whereClause += ` AND r.borrow_date >= @${params.length}`;
                params.push(fromDate);
            }
            if (toDate) {
                whereClause += ` AND r.borrow_date <= @${params.length}`;
                params.push(toDate);
            }

            let borrowerCondition = '';
            let borrowerName = '';
            if (borrowerId) {
                const user = await this.userRepository.findOne({ where: { id: borrowerId } });
                if (user) {
                    borrowerName = user.name;
                }
            }
            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (borrowerName || borrowerId) {
                const searchValue = `%${borrowerName || borrowerId}%`;
                borrowerCondition = `
                AND (
                    u.name LIKE @${params.length}
                    OR 
                    di.full_name LIKE @${params.length}
                )
            `;
                params.push(searchValue);        // push 1 lần
            } else if (!isAllStatistic) {
                // Phân quyền theo cấp bậc: chỉ hiển thị lịch sử của phòng ban cấp dưới
                const subOrgIds = await this.sqlsvRepo.getSubordinateOrgIds(userId);
                if (subOrgIds.length > 0) {
                    const idList = subOrgIds.map((_, i) => `@${params.length + i}`).join(', ');
                    borrowerCondition = ` AND u.parent IN (${idList})`;
                    subOrgIds.forEach(id => params.push(id));
                }
            }

            let statusCondition = '';
            if (status) {
                const s = status.toLowerCase().trim();
                if (s.includes('tra') || s.includes('returned') || s === 'đã trả') {
                    statusCondition = `AND EXISTS (
                    SELECT 1 FROM passport_voucher_items vi 
                    INNER JOIN passport_vouchers v ON v.id = vi.voucher_id
                    WHERE vi.request_id = r.id AND v.voucher_type = 'RETURN' AND v.status = 'COMPLETED'
                )`;
                } else if (s.includes('dung') || s.includes('use') || s === 'đang sử dụng') {
                    statusCondition = `AND NOT EXISTS (
                    SELECT 1 FROM passport_voucher_items vi 
                    INNER JOIN passport_vouchers v ON v.id = vi.voucher_id
                    WHERE vi.request_id = r.id AND v.voucher_type = 'RETURN' AND v.status = 'COMPLETED'
                )`;
                }
            }

            // Thêm skip và take vào params
            const skipParamIndex = params.length;
            params.push(skip);

            const takeParamIndex = params.length;
            params.push(take);

            const sql = `
            WITH BorrowedItems AS (
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY r.borrow_date DESC) AS rn,
                    COALESCE(p.passport_number, di.passport_number) AS passportNumber,
                    CASE WHEN r.type_request = 'user' THEN u.name ELSE di.full_name END AS borrowerId,
                    r.borrow_date AS borrowDate,
                    COALESCE(r.reason, r.trip_content) AS purpose,
                    r.return_date AS dueDate,
                    CAST(NULL AS DATE) AS returnDate,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM passport_voucher_items vi 
                            INNER JOIN passport_vouchers v ON v.id = vi.voucher_id
                            WHERE vi.request_id = r.id 
                              AND v.voucher_type = 'RETURN' 
                              AND v.status = 'COMPLETED'
                        ) THEN N'<span style="background-color: #F6FFED; color: #389E0D; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">Đã trả</span>'
                        ELSE N'<span style="background-color: #E6F7FF; color: #1890FF; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">Đang sử dụng</span>'
                    END AS status
                FROM passport_borrow_requests r
                LEFT JOIN passports p ON p.id = r.passport_id
                LEFT JOIN users u ON u.id = r.requester_id
                LEFT JOIN passport_delegation_items di ON di.request_id = r.id
                WHERE ${whereClause}
                  ${borrowerCondition}
                  ${statusCondition}
            )
            SELECT 
                rn AS stt,
                passportNumber,
                borrowerId,
                FORMAT(borrowDate, 'dd/MM/yyyy') AS borrowDate,
                purpose,
                '' AS approver,
                FORMAT(dueDate, 'dd/MM/yyyy') AS dueDate,
                FORMAT(returnDate, 'dd/MM/yyyy') AS returnDate,
                status
            FROM BorrowedItems
            WHERE rn > @${skipParamIndex} 
              AND rn <= @${skipParamIndex} + @${takeParamIndex}
            ORDER BY borrowDate DESC;
        `;

            const dataSource = this.requestRepository.manager.connection;
            const result = await dataSource.query(sql, params);

            // Đếm tổng (không cần skip/take)
            const countSql = `
            SELECT COUNT(*) AS total
            FROM passport_borrow_requests r 
            LEFT JOIN passport_delegation_items di ON di.request_id = r.id
            LEFT JOIN users u ON u.id = r.requester_id
            WHERE ${whereClause}
              ${borrowerCondition}
              ${statusCondition}
        `;

            const totalRes = await dataSource.query(countSql, params.slice(0, skipParamIndex)); // chỉ lấy params trước skip
            const total = Number(totalRes[0]?.total || 0);

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Báo cáo: Xem lịch sử mượn trả hộ chiếu',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_HISTORY',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                data: result,
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take)
            };

        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem lịch sử mượn trả hộ chiếu - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_HISTORY',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in getBorrowHistory:', error);
            throw new InternalServerErrorException('Lỗi khi lấy lịch sử mượn trả hộ chiếu');
        }
    }

    /**
     * BÁO CÁO 9.3: THỐNG KÊ HỘ CHIẾU THEO PHÒNG BAN
     */
    async getDeptStats(query: PassportDeptStatsQueryDto, userId: string, ipAddress: string) {
        try {
            const filterParams = this.normalizeFilterParams(query);
            const { departmentId, page = 1, limit = 10 } = filterParams;

            const unitsQb = this.unitRepository.createQueryBuilder('u')
                .where('u.status = 1');

            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (departmentId) {
                unitsQb.andWhere('u.id = :departmentId', { departmentId });
            } else if (!isAllStatistic) {
                // Phân quyền theo cấp bậc: chỉ lấy các phòng ban trong cây con
                const subOrgIds = await this.sqlsvRepo.getSubordinateOrgIds(userId);
                if (subOrgIds.length > 0) {
                    unitsQb.andWhere('u.id IN (:...subOrgIds)', { subOrgIds });
                }
            }

            const units = await unitsQb.getMany();
            const result: any[] = [];

            const passports = await this.passportRepository.createQueryBuilder('p')
                .leftJoinAndSelect('p.user', 'u')
                .leftJoinAndSelect('u.parent', 'dept')
                .where('p.isDeleted = 0')
                .getMany();

            for (const unit of units) {
                const deptPassports = passports.filter(p => {
                    const passportDeptId = p.user?.parent?.id;
                    const passportDeptName = p.departmentName;
                    return passportDeptId === unit.id || passportDeptName === unit.id || passportDeptName === unit.name;
                });

                const total = deptPassports.length;
                const storing = deptPassports.filter(p => (p.usageStatus || '').toUpperCase() === 'STORING').length;
                const inUse = deptPassports.filter(p => (p.usageStatus || '').toUpperCase() === 'IN_USE').length;

                const now = dayjs();
                const expiringSoon = deptPassports.filter(p => {
                    if (!p.expiryDate) return false;
                    const diff = dayjs(p.expiryDate).diff(now, 'month');
                    return diff >= 0 && diff < 3;
                }).length;

                const expired = deptPassports.filter(p => p.expiryDate && dayjs(p.expiryDate).isBefore(now)).length;
                const borrowRate = total > 0 ? Math.round((inUse / total) * 100) : 0;

                result.push({
                    departmentId: unit.name,
                    total,
                    storing,
                    inUse,
                    expiringSoon,
                    expired,
                    borrowRate: `${borrowRate}%`
                });
            }

            const skip = (Number(page) - 1) * Number(limit);
            const slicedResult = result.slice(skip, skip + Number(limit));

            slicedResult.forEach((item, index) => {
                item.stt = skip + index + 1;
            });

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Báo cáo: Xem thống kê hộ chiếu theo phòng ban',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_DEPT',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });

            return {
                statusCode: 200,
                data: slicedResult,
                total: result.length,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(result.length / Number(limit))
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: `Báo cáo Lỗi: Xem thống kê hộ chiếu theo phòng ban - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_DEPT',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in PassportStatisticsService.getDeptStats:', error);
            throw new InternalServerErrorException('Lỗi khi thống kê hộ chiếu theo phòng ban');
        }
    }

    /**
     * BÁO CÁO 9.4: THỐNG KÊ CHUYẾN CÔNG TÁC NƯỚC NGOÀI
     */
    async getBusinessTrips(query: BusinessTripQueryDto, userId: string, ipAddress: string) {
        try {
            const filterParams = this.normalizeFilterParams(query);
            const { fromDate, toDate, destination, department, fullName, page = 1, limit = 10 } = filterParams;

            const qb = this.requestRepository.createQueryBuilder('r')
                .leftJoinAndSelect('r.requester', 'u')
                .leftJoinAndSelect('u.parent', 'dept')
                .where('r.isDeleted = 0')
                // Lọc thông qua status hiện tại HOẶC check lịch sử audit đã từng mượn (IN_USE) chống sót dữ liệu cập nhật
                // Thêm 'APPROVED' để hiển thị cả những người mượn chuẩn bị đi
                .andWhere(`(r.status IN ('APPROVED', 'IN_USE', 'COMPLETED') OR EXISTS (
                    SELECT 1 FROM audit a
                    WHERE a.document_id = r.id
                    AND a.type_document = 'PASSPORT_REQUEST'
                    AND a.curStatusCode = 'IN_USE'
                ))`);

            const parsedFromDate = this.parseToDate(fromDate);
            const parsedToDate = this.parseToDate(toDate);

            if (parsedFromDate) {
                qb.andWhere('r.departureDate >= :fromDate', { fromDate: parsedFromDate });
            }

            if (parsedToDate) {
                qb.andWhere('r.departureDate <= :toDate', { toDate: dayjs(parsedToDate).endOf('day').toDate() });
            }
            if (destination) {
                qb.andWhere('r.destination LIKE :destination', { destination: `%${destination}%` });
            }
            if (fullName) {
                qb.andWhere('r.requesterId = :fullName', { fullName });
            }
            const isAllStatistic = await this.sqlsvRepo.isUserInGroup(userId, 'allStatistic');
            if (department) {
                qb.andWhere('u.parent = :department', { department });
            } else if (!isAllStatistic) {
                // Phân quyền theo cấp bậc: lọc theo phòng ban cấp dưới
                const subOrgIds = await this.sqlsvRepo.getSubordinateOrgIds(userId);
                if (subOrgIds.length > 0) {
                    qb.andWhere('u.parent IN (:...subOrgIds)', { subOrgIds });
                }
            }

            const total = await qb.getCount();
            const skip = (Number(page) - 1) * Number(limit);
            qb.skip(skip).take(Number(limit));

            const trips = await qb.getMany();

            // Lấy danh sách quốc gia từ CRM một lần để map
            const countriesRes = await this.crmSourcesService.findByCode('COUNTRY');
            const countryMap = new Map((countriesRes.items || []).map((c: any) => [c.value?.toUpperCase(), c.title]));


            const result = trips.map((t, index) => {
                const start = dayjs(t.departureDate);
                const end = dayjs(t.arrivalDate);
                const days = t.departureDate && t.arrivalDate ? end.diff(start, 'day') + 1 : 0;

                const destUpper = String(t.destination || '').toUpperCase().trim();
                const mappedDestination = countryMap.get(destUpper) || t.destination || '';


                return {
                    stt: skip + index + 1,
                    fullName: t.requester?.name || '',
                    department: t.requester?.parent?.name || '',
                    destination: mappedDestination,
                    departureDate: t.departureDate ? dayjs(t.departureDate).format('DD/MM/YYYY') : '',
                    arrivalDate: t.arrivalDate ? dayjs(t.arrivalDate).format('DD/MM/YYYY') : '',
                    days: days || 0,
                    purpose: t.tripContent || t.reason || ''
                };
            });

            await this.systemLogService.createLogFromSystem({
                action: 'GET',
                details: 'Báo cáo: Xem thống kê chuyến công tác nước ngoài',
                method: 'GET',
                status: 'SUCCESS',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_TRIPS',
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
                details: `Báo cáo Lỗi: Xem thống kê chuyến công tác nước ngoài - ${error.message}`,
                method: 'GET',
                status: 'FAILURE',
                type: 'PASSPORT_STATISTICS',
                subType: 'PASSPORT_STATISTICS_TRIPS',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString()
            });
            console.error('Error in PassportStatisticsService.getBusinessTrips:', error);
            throw new InternalServerErrorException('Lỗi khi lấy thống kê chuyến công tác');
        }
    }

    private mapIndividualPassportStatus(isReturned: boolean): string {
        if (isReturned) {
            return `<span style="background-color: #F6FFED; color: #389E0D; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">Đã trả</span>`;
        }
        return `<span style="background-color: #E6F7FF; color: #1890FF; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">Đang sử dụng</span>`;
    }

    private mapUsageStatus(status: string): string {
        const map: Record<string, { text: string; bg: string; color: string }> = {
            'STORING': { text: 'Đang lưu trữ', bg: '#F6FFED', color: '#389E0D' },
            'IN_USE': { text: 'Đang sử dụng', bg: '#FFF7E6', color: '#D46B08' },
            'LOST': { text: 'Đã mất', bg: '#FFF1F0', color: '#CF1322' },
            'EXPIRED': { text: 'Hết hạn', bg: '#F4F5F7', color: '#6A7985' }
        };

        const config = map[status];
        if (!config) return status;
        return `<span style="background-color: ${config.bg}; color: ${config.color}; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">${config.text}</span>`;
    }

    private mapRequestStatus(status: string): string {
        const map: Record<string, { text: string; bg: string; color: string }> = {
            'PENDING': { text: 'Chờ phê duyệt', bg: '#FFF7E6', color: '#D46B08' },
            'APPROVED': { text: 'Đã phê duyệt', bg: '#E6F7FF', color: '#1890FF' },
            'REJECTED': { text: 'Từ chối', bg: '#FFF1F0', color: '#CF1322' },
            'COMPLETED': { text: 'Hoàn tất', bg: '#F6FFED', color: '#389E0D' },
            'IN_USE': { text: 'Đang sử dụng', bg: '#E6F7FF', color: '#1890FF' },
            'CANCELLED': { text: 'Đã hủy', bg: '#FFF1F0', color: '#CF1322' },
            'WAIT_COMMANDER': { text: 'Chờ chỉ huy', bg: '#FFF7E6', color: '#D46B08' },
            'WAIT_SIGN': { text: 'Chờ ký', bg: '#FFF7E6', color: '#D46B08' },
            'WAIT_RECEIVE': { text: 'Chờ tiếp nhận', bg: '#FFF7E6', color: '#D46B08' }
        };

        const config = map[status];
        if (!config) return status;
        return `<span style="background-color: ${config.bg}; color: ${config.color}; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; display: inline-block;">${config.text}</span>`;
    }

    private parseToDate(dateStr: any): Date | null {
        if (!dateStr || typeof dateStr !== 'string') return null;

        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const d = dayjs(dateStr, 'DD/MM/YYYY');
            return d.isValid() ? d.toDate() : null;
        }

        const d = dayjs(dateStr);
        return d.isValid() ? d.toDate() : null;
    }
}
