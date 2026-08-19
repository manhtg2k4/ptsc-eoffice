import { Injectable, BadRequestException, NotFoundException, Inject, Logger, forwardRef } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { validateAndParseSortParam, getDtoKeys } from 'src/utils/sort-validator.util';
import { SystemLogServiceSql } from '../systemLogManagement/system-log-service-sql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Brackets } from 'typeorm';
import { PassportHistoryEntity } from './entities/passport-history.entity';
import { PassportRequestEntity } from './entities/passport-request.entity';
import { PassportDelegationItemEntity } from './entities/passport-delegation-item.entity';
import { CreatePassportRequestDto } from './dto/create-passport-request.dto';
import { UpdatePassportRequestDto } from './dto/update-passport-request.dto';
import { ListPassportRequestDto } from './dto/list-passport-request.dto';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PassportVoucherEntity } from '../passport-vouchers/entities/passport-voucher.entity';
import { PassportVoucherItemEntity } from '../passport-vouchers/entities/passport-voucher-item.entity';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notifycation/notification.service';
import { NotificationType } from 'src/notifycation/notification.enum';
import { PassportPermissionEntity } from './entities/passport-permission.entity';
import { CreatePassportPermissionDto } from './dto/create-passport-permission.dto';
import { UpdatePassportPermissionDto } from './dto/update-passport-permission.dto';
import { ListPassportPermissionDto } from './dto/list-passport-permission.dto';

export const PASSPORT_TYPE_MAP = {
    ORDINARY: 'Hộ chiếu phổ thông',
    DIPLOMATIC: 'Hộ chiếu ngoại giao',
    OFFICIAL: 'Hộ chiếu công vụ',
};
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { SQLSVRepository } from '../database/sqlsvRepo';

import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { CrmSourcesService } from '../crmsource/crmsource.service';

import { Audit } from '../database/schema-sql/audit.entity';
import BpmnEngineService from '../bpmn/bpmn-engine.service';
import { MSSQL_REPO } from '../database/database.provider';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { GroupUserService } from '../group-users/group-users.service';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { SqlRepoCountService } from '../database/sqlRepoCount.mssql';
import { FilesManagementService } from 'src/files-managerment/files-management-mssql.service';

// Map status code → tên hiển thị tiếng Việt
const STATUS_MAP: Record<string, string> = {
    'PENDING': 'Chờ phê duyệt',
    'WAIT_COMMANDER': 'Chờ chỉ huy',
    'WAIT_RECEIVE': 'Chờ tiếp nhận',
    'IN_USE': 'Đang sử dụng',
    'WAIT_SIGN': 'Chờ ký biên bản',
    'COMPLETED': 'Hoàn tất',
    'APPROVED': 'Đã phê duyệt',
    'REJECTED': 'Từ chối',
    'CANCELLED': 'Đã hủy',
};

const STATUS_HTML_MAP: Record<string, string> = {
    PENDING:  // Chờ duyệt
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FEF9C2;color:#FFA600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #BAB046;">Chờ phê duyệt</div>',

    WAIT_SIGN:  // Chờ tiếp nhận (hoặc Chờ ký)
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E6F7FF;color:#0369A1;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #A8D8FF;">Chờ tiếp nhận</div>',

    WAIT_COMMANDER:  // Chờ chỉ huy → Đổi sang nâu
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFE8CC;color:#C05600;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #C05600;">Chờ chỉ huy</div>',

    WAIT_RECEIVE:  // Chờ tiếp nhận (nếu có key riêng)
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E6F7FF;color:#0369A1;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #A8D8FF;">Chờ tiếp nhận</div>',

    IN_USE:  // Đang sử dụng
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#ACCBFF;color:#002089;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #579FFF;">Đang sử dụng</div>',

    APPROVED:  // Đã phê duyệt (nếu vẫn dùng key này, mình giữ màu xanh dương giống Đang sử dụng)
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#DBEAFE;color:#0062AD;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #82B8FF;">Đã phê duyệt</div>',

    COMPLETED:  // Hoàn tất
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background: #D0FFDE;color: #007222;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #35AB59;">Hoàn tất</div>',

    REJECTED:  // Từ chối
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#FFDCD9;color:#F44336;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #FFA2A2;">Từ chối</div>',

    CANCELLED:  // Đã hủy
        '<div style="display:flex;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-items:center;justify-content:center;width:100%;height:30px;padding:0 16px;background:#E0E0E0;color:#555555;font-weight:700;font-size:14px;border-radius:15px;border:1px solid #AEB5BE;">Đã hủy</div>',
}
const UNSIGNED_VOUCHER_SVG = `<svg width="20" height="17" viewBox="0 0 23 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-left: 4px;">
<path d="M18.7 10.9L13 16.6H10.7V14.3L16.4 8.6L18.7 10.9ZM22.1 10.1C22.1 10.4 21.8 10.7 21.5 11L19 13.5L18.1 12.6L20.7 10L20.1 9.4L19.4 10.1L17.1 7.8L19.3 5.7C19.5 5.5 19.9 5.5 20.2 5.7L21.6 7.1C21.8 7.3 21.8 7.7 21.6 8C21.4 8.2 21.2 8.4 21.2 8.6C21.2 8.8 21.4 9 21.6 9.2C21.9 9.5 22.2 9.8 22.1 10.1ZM2 18V2H9V7H14V8.5L16 6.5V6L10 0H2C0.9 0 0 0.9 0 2V18C0 19.1 0.9 20 2 20H14C15.1 20 16 19.1 16 18H2ZM10 15.1C9.8 15.1 9.6 15.2 9.5 15.2L9 13H7.5L5.4 14.7L6 12H4.5L3.5 17H5L7.9 14.4L8.5 16.7H9.5L10 16.6V15.1Z" fill="#FF0000"/>
</svg>`;

const NO_HANDOVER_VOUCHER_SVG = `<svg width="25" height="25" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-left: 4px;">
<path d="M15 11V14H3V11H1V14C1 15.1 1.9 16 3 16H15C16.1 16 17 15.1 17 14V11H15Z" fill="#E0E0E0"/>
<path d="M3 11H6L7.5 13H10.5L12 11H15V9H3V11Z" fill="#3A86FF"/>
<path d="M9 2V9H6.5L9 11.5L11.5 9H9V2Z" fill="#FF4D4D" />
</svg>`;


@Injectable()
export class PassportRequestsService {
    private readonly logger = new Logger(PassportRequestsService.name);
    private readonly typeDocument = 'PassportRequest';

    private normalizeBorrowerId(value?: string | null): string | null {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        return trimmed.replace(/^['"]|['"]$/g, '');
    }

    private resolveBorrowerName(value?: string | null): string | null {
        const normalizedId = this.normalizeBorrowerId(value);
        if (!normalizedId) return null;

        // Trả về null để buildBorrowerNameMap thực hiện truy vấn DB tìm tên thực
        return null;
    }

    async getLeaderList(borrowerId: string, search?: string) {
        // 1. Tìm thông tin người mượn để lấy đơn vị và cấp bậc
        const borrower = await this.userRepo.createQueryBuilder('user')
            .leftJoinAndSelect(
                'user.groupUsers',
                'groupUsers',
                'groupUsers.status != :status',
                { status: 3 }
            )
            .leftJoinAndSelect('user.parent', 'unit')
            .where('user.id = :id', { id: borrowerId })
            .getOne();
        if (!borrower) {
            return { statusCode: 200, data: [], defaultLeaderId: null };
        }

        // Xác định cấp bậc của người mượn (Lấy Order lớn nhất để tìm được nhiều lãnh đạo hơn)
        // Nếu không thuộc nhóm nào có order, mặc định rank là cấp thấp nhất (ví dụ 6)
        const borrowerRank = (borrower.groupUsers || [])
            .filter(g => g.order !== null && g.order !== undefined)
            .reduce((max, g) => Math.max(max, g.order), 6);

        // Xác định danh sách ID các phòng ban (hiện tại + cha) để lấy lãnh đạo
        let unitIds: string[] = [];
        if (borrower.parent) {
            const mpath = borrower.parent.mpath || '';
            unitIds = mpath.split('/').filter(id => !!id);
            if (unitIds.length === 0) {
                unitIds = [borrower.parent.id];
            }
        }

        // 2. Tìm danh sách "cấp trên" thuộc các phòng ban này
        // Một người được coi là lãnh đạo nếu thuộc ít nhất một nhóm có order < borrowerRank
        const qb = this.userRepo.createQueryBuilder('u')
            .leftJoinAndSelect('u.groupUsers', 'gu')
            .select(['u.id', 'u.username', 'u.name', 'u.position', 'u.organizationName']);

        if (unitIds.length > 0) {
            qb.where('u.parent IN (:...unitIds)', { unitIds });
        } else {
            qb.where('u.organizationCode = :orgCode', { orgCode: borrower.organizationCode });
        }

        qb.andWhere('gu.order IS NOT NULL')
            .andWhere('gu.order < :borrowerRank', { borrowerRank })
            .limit(100);

        if (search) {
            qb.andWhere('(u.name LIKE :search OR u.username LIKE :search)', { search: `%${search}%` });
        }

        const users = await qb.getMany();

        // Loại bỏ kết quả trùng lặp nếu user thuộc nhiều nhóm lãnh đạo
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());

        const data = uniqueUsers.map(u => ({
            id: u.id,
            name: u.name,
            nameVn: u.name,
            username: u.username,
            position: u.position,
            organizationName: u.organizationName,
            isDefault: false,
            label: `${u.name} (${u.username}) - ${u.position || 'N/V'}`,
        }));

        return {
            statusCode: 200,
            data,
            defaultLeaderId: data.length > 0 ? data[0].id : null,
        };
    }

    async getUserById(id: string) {
        const user = await this.userRepo.findOne({
            where: { id },
            select: ['id', 'username', 'name', 'position', 'organizationName'],
        });
        return user;
    }

    /**
     * Lấy danh sách nhân viên tham gia đoàn ra
     */
    async getDelegationUsers(search?: string) {
        const qb = this.userRepo.createQueryBuilder('u')
            .leftJoinAndSelect('u.parent', 'unit')
            .leftJoinAndSelect('unit.parent', 'parentUnit')
            .leftJoinAndSelect('u.groupUsers', 'g')
            .select([
                'u.id', 'u.username', 'u.name', 'u.position', 'u.organizationName',
                'unit.id', 'unit.name',
                'parentUnit.id', 'parentUnit.name',
                'g.id', 'g.name', 'g.code'
            ])
            .take(100);

        if (search) {
            qb.andWhere('(u.name LIKE :search OR u.username LIKE :search)', { search: `%${search}%` });
        }

        const users = await qb.getMany();

        // Lấy danh mục positionCate từ CRM để map sang Tiếng Việt
        const positionMap = new Map<string, string>();
        try {
            const positionItems = await this.crmSourcesService.findByCode('positionCate');
            const items = positionItems?.items || positionItems?.data || (Array.isArray(positionItems) ? positionItems : []);
            items.forEach((item: any) => {
                const title = item?.title || item?.value || '';
                if (item?.value) positionMap.set(String(item.value).trim().toLowerCase(), title);
                if (item?.id) positionMap.set(String(item.id).trim().toLowerCase(), title);
                if (item?.title) positionMap.set(String(item.title).trim().toLowerCase(), title);
            });
        } catch (err) {
            this.logger.warn(`Lỗi khi lấy danh mục positionCate từ CRM: ${err?.message || err}`);
        }

        const data = users.map(u => {
            // Đơn vị cha (Parent unit)
            const parentUnitName = u.parent?.parent?.name || u.parent?.name || u.organizationName || '';

            // Chức danh lấy từ u.position và map sang Tiếng Việt từ crm positionCate
            const rawPosition = u.position ? String(u.position).trim() : '';
            const userPosition = positionMap.get(rawPosition.toLowerCase()) || rawPosition;

            return {
                id: u.id,
                userId: u.id,
                username: u.username,
                fullName: u.name,
                nameVn: u.name,
                position: userPosition,
                unit: parentUnitName,
                label: `${u.name} (${u.username}) - ${userPosition || 'N/V'}`,
            };
        });

        return { statusCode: 200, data, total: data.length };
    }

    /**
     * Lấy danh sách trưởng đoàn (tất cả nhân viên)
     */
    async getDelegationLeaders(search?: string) {
        // Theo yêu cầu mới: Lấy tất cả nhân viên làm trưởng đoàn
        return this.getDelegationUsers(search);
    }

    /**
     * Lấy danh sách người dùng cho việc mượn hộ chiếu (đã lọc theo phân quyền)
     */
    async getUsers(currentUserId: string, search?: string, excludeIds?: string | string[]) {
        if (!currentUserId) {
            return { statusCode: 200, data: [], total: 0 };
        }

        // 1. Tìm cấu hình phân quyền của người dùng hiện tại
        const permission = await this.permissionRepo.findOne({
            where: { authPersonsPassport: currentUserId }
        });

        const qb = this.userRepo.createQueryBuilder('u')
            .innerJoin(PassportEntity, 'p', 'p.eofficeAccount = u.id')
            .leftJoinAndSelect('u.parent', 'unit')
            .leftJoinAndSelect('unit.parent', 'parentUnit')
            .leftJoinAndSelect('u.groupUsers', 'g')
            .where('p.isDeleted = :isDeleted', { isDeleted: false })
            .select([
                'u.id', 'u.username', 'u.name', 'u.position', 'u.organizationName', 'u.organizationCode',
                'unit.id', 'unit.name',
                'parentUnit.id', 'parentUnit.name',
                'g.id', 'g.name', 'g.code'
            ]);

        if (search) {
            qb.andWhere('(u.name LIKE :search OR u.username LIKE :search)', { search: `%${search}%` });
        }

        if (excludeIds) {
            let excludeArray: string[] = [];
            if (Array.isArray(excludeIds)) {
                excludeArray = excludeIds;
            } else if (typeof excludeIds === 'string') {
                let cleaned = excludeIds.trim();
                if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
                    cleaned = cleaned.substring(1, cleaned.length - 1);
                }
                excludeArray = cleaned
                    .split(',')
                    .map(id => id.trim().replace(/^['"]|['"]$/g, ''));
            }
            const validExcludeArray = excludeArray.filter(Boolean);
            if (validExcludeArray.length > 0) {
                qb.andWhere('u.id NOT IN (:...validExcludeArray)', { validExcludeArray });
            }
        }

        // 2. Áp dụng bộ lọc dựa trên phân quyền
        if (!permission) {
            // Trường hợp 1: Không có cấu hình -> Chỉ được mượn cho chính mình
            qb.andWhere('u.id = :currentUserId', { currentUserId });
        } else {
            const { passportBorrowScope, officerList } = permission;

            if (passportBorrowScope === 'sameUnit') {
                // Trường hợp 2: Cùng đơn vị
                const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } });
                if (currentUser?.organizationCode) {
                    qb.andWhere('(u.organizationCode = :orgCode OR u.id = :currentUserId)', { orgCode: currentUser.organizationCode, currentUserId });
                } else {
                    qb.andWhere('u.id = :currentUserId', { currentUserId });
                }
            } else if (passportBorrowScope === 'byPermissionList') {
                // Trường hợp 3: Theo danh sách được cấp phép
                const rawList = Array.isArray(officerList) ? officerList : [];
                const allowedIds = rawList
                    .map((item: any) => {
                        if (typeof item === 'string') return item;
                        return item?.userId || item?.id || null;
                    })
                    .filter((id: any) => typeof id === 'string' && id.trim() !== '');

                if (allowedIds.length > 0) {
                    qb.andWhere('(u.id IN (:...allowedIds) OR u.id = :currentUserId)', { allowedIds, currentUserId });
                } else {
                    qb.andWhere('u.id = :currentUserId', { currentUserId });
                }
            }
        }

        const users = await qb.getMany();
        const positionMap = new Map<string, string>();
        try {
            const positionItems = await this.crmSourcesService.findByCode('positionCate');
            const items = positionItems?.items || positionItems?.data || (Array.isArray(positionItems) ? positionItems : []);
            items.forEach((item: any) => {
                const title = item?.title || item?.value || '';
                if (item?.value) positionMap.set(String(item.value).trim().toLowerCase(), title);
                if (item?.id) positionMap.set(String(item.id).trim().toLowerCase(), title);
                if (item?.title) positionMap.set(String(item.title).trim().toLowerCase(), title);
            });
        } catch (err) {
            this.logger.warn(`Lỗi khi lấy danh mục positionCate từ CRM: ${err?.message || err}`);
        }

        const data = users.map(u => {
            const parentUnitName = u.parent?.parent?.name || u.parent?.name || u.organizationName || '';
            const rawPosition = u.position ? String(u.position).trim() : '';
            const mappedPosition = positionMap.get(rawPosition.toLowerCase()) || rawPosition;

            return {
                id: u.id,
                username: u.username,
                nameVn: u.name,
                fullName: u.name,
                position: mappedPosition,
                unit: parentUnitName,
                label: `${u.name} (${u.username}) - ${mappedPosition || 'N/V'}`,
            };
        });

        return { statusCode: 200, data, total: data.length };

        return { statusCode: 200, data, total: data.length };
    }

    /**
     * Lấy danh sách hộ chiếu của một người dùng cụ thể
     */
    async getPassportsByUserId(userId: string) {
        if (!userId) {
            throw new BadRequestException('userId là bắt buộc');
        }

        const passports = await this.passportRepo.find({
            where: {
                eofficeAccount: userId,
                isDeleted: false,
                usageStatus: Not('RETURNED'),
            },
            select: [
                'id',
                'passportNumber',
                'passportType',
                'fullName',
                'expiryDate',
                'usageStatus',
                'issueDate',
                'issuePlace',
                'eofficeAccount',
            ],
            order: { createdAt: 'DESC' },
        });

        const USAGE_STATUS_MAP: Record<string, string> = {
            STORING: 'Đang lưu trữ',
            IN_USE: 'Đang sử dụng',
            RETURNED: 'Vô hiệu hóa (Đã trả)',
        };

        const data = passports.map(p => ({
            id: p.id,
            passportId: p.id,
            passportNumber: p.passportNumber,
            passportType: PASSPORT_TYPE_MAP[p.passportType] || p.passportType,
            fullName: p.fullName,
            expiryDate: p.expiryDate,
            issueDate: p.issueDate,
            issuePlace: p.issuePlace,
            usageStatus: USAGE_STATUS_MAP[p.usageStatus] || p.usageStatus,
            eofficeAccount: p.eofficeAccount,
            label: `${p.passportNumber} - ${p.fullName || 'N/A'} (${PASSPORT_TYPE_MAP[p.passportType] || p.passportType})`,
        }));

        return { statusCode: 200, data, total: data.length };
    }


    private formatDate(date: Date | string | number | null | undefined): string {
        if (!date) return '';

        if (typeof date === 'string') {
            const trimmed = date.trim();

            // Nếu đã là chuỗi dạng dd/mm/yyyy (ví dụ: 17/07/2026)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
                return trimmed;
            }

            // Nếu có tag HTML như <span style="...">17/07/2026</span>
            const htmlMatch = trimmed.match(/(\d{2}\/\d{2}\/\d{4})/);
            if (htmlMatch) {
                return htmlMatch[1];
            }

            // Nếu là dạng yyyy-mm-dd hoặc yyyy-mm-ddTHH:mm:ss...
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                const parts = trimmed.split('T')[0].split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
                }
            }

            // Nếu là dạng dd-mm-yyyy
            if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
                const [d, m, y] = trimmed.split('-');
                return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            }
        }

        const d = new Date(date);
        if (isNaN(d.getTime())) {
            if (typeof date === 'string' && date.includes('/')) {
                const parts = date.split(' ')[0].split('/');
                if (parts.length === 3) {
                    const day = parts[0].padStart(2, '0');
                    const month = parts[1].padStart(2, '0');
                    const year = parts[2].substring(0, 4);
                    return `${day}/${month}/${year}`;
                }
            }
            return String(date);
        }

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    private parseToDate(dateVal: any): Date | null {
        if (!dateVal) return null;
        if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

        if (typeof dateVal === 'string') {
            const trimmed = dateVal.replace(/<[^>]*>/g, '').trim();
            if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
                const parts = trimmed.split(' ')[0].split('/');
                return new Date(+parts[2], +parts[1] - 1, +parts[0]);
            }
            if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                const parts = trimmed.split('T')[0].split('-');
                return new Date(+parts[0], +parts[1] - 1, +parts[2]);
            }
        }

        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? null : d;
    }

    private async buildBorrowerNameMap(rawBorrowerIds: string[]): Promise<Record<string, string>> {
        const borrowerNameMap: Record<string, string> = {};
        const normalizedByRaw = new Map<string, string>();

        for (const rawId of rawBorrowerIds) {
            const normalizedId = this.normalizeBorrowerId(rawId);
            if (!normalizedId) continue;
            normalizedByRaw.set(rawId, normalizedId);

            const resolvedName = this.resolveBorrowerName(normalizedId);
            if (resolvedName) borrowerNameMap[rawId] = resolvedName;
        }

        const unresolvedNormalizedIds = [...new Set(
            rawBorrowerIds
                .filter((rawId) => !borrowerNameMap[rawId])
                .map((rawId) => normalizedByRaw.get(rawId))
                .filter((id): id is string => !!id),
        )];

        if (unresolvedNormalizedIds.length > 0) {
            const userNameById: Record<string, string> = {};
            for (let i = 0; i < unresolvedNormalizedIds.length; i += 1000) {
                const chunk = unresolvedNormalizedIds.slice(i, i + 1000);
                const users = await this.userRepo.find({
                    where: { id: In(chunk) },
                    select: ['id', 'username', 'name'],
                });
                users.forEach((u) => {
                    userNameById[u.id] = u.name || u.username || u.id;
                });
            }

            const stillUnresolvedNormalizedIds = unresolvedNormalizedIds.filter((id) => !userNameById[id]);
            const passportNameById: Record<string, string> = {};
            if (stillUnresolvedNormalizedIds.length > 0) {
                for (let i = 0; i < stillUnresolvedNormalizedIds.length; i += 1000) {
                    const chunk = stillUnresolvedNormalizedIds.slice(i, i + 1000);
                    const passports = await this.passportRepo.find({
                        where: { id: In(chunk), isDeleted: false },
                        select: ['id', 'fullName'],
                    });
                    passports.forEach((p) => {
                        if (p.fullName) passportNameById[p.id] = p.fullName;
                    });
                }
            }

            for (const rawId of rawBorrowerIds) {
                if (borrowerNameMap[rawId]) continue;
                const normalizedId = normalizedByRaw.get(rawId);
                if (!normalizedId) continue;

                const userName = userNameById[normalizedId];
                if (userName) {
                    borrowerNameMap[rawId] = userName;
                    continue;
                }

                const passportName = passportNameById[normalizedId];
                if (passportName) {
                    borrowerNameMap[rawId] = passportName;
                }
            }
        }

        return borrowerNameMap;
    }

    constructor(
        @InjectRepository(PassportRequestEntity, 'mssqlConnection')
        private readonly requestRepo: Repository<PassportRequestEntity>,
        @InjectRepository(PassportHistoryEntity, 'mssqlConnection')
        private readonly historyRepo: Repository<PassportHistoryEntity>,
        @InjectRepository(PassportEntity, 'mssqlConnection')
        private readonly passportRepo: Repository<PassportEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private readonly userRepo: Repository<UserEntity>,
        @InjectRepository(WorkItemEntity, 'mssqlConnection')
        private readonly workItemRepo: Repository<WorkItemEntity>,
        @InjectRepository(Audit, 'mssqlConnection')
        private readonly auditRepo: Repository<Audit>,
        private readonly runtimeDbService: RuntimeDbService,
        private readonly sqlsvRepo: SQLSVRepository,
        private readonly bpmnEngine: BpmnEngineService,
        private readonly groupUserService: GroupUserService,
        @Inject(MSSQL_REPO) private readonly sqlRepo: MSSQLRepository,
        @InjectRepository(PassportDelegationItemEntity, 'mssqlConnection')
        private readonly delegationRepo: Repository<PassportDelegationItemEntity>,
        @InjectRepository(PassportVoucherItemEntity, 'mssqlConnection')
        private readonly voucherItemRepo: Repository<PassportVoucherItemEntity>,
        @InjectRepository(PassportVoucherEntity, 'mssqlConnection')
        private readonly voucherRepo: Repository<PassportVoucherEntity>,
        private readonly notificationService: NotificationService,
        @Inject(forwardRef(() => SystemLogServiceSql))
        private readonly systemLogService: SystemLogServiceSql,
        private readonly crmSourcesService: CrmSourcesService,
        @InjectRepository(PassportPermissionEntity, 'mssqlConnection')
        private readonly permissionRepo: Repository<PassportPermissionEntity>,
        private readonly sqlRepoCount: SqlRepoCountService,
        @Inject(forwardRef(() => FilesManagementService))
        private readonly filesService: FilesManagementService,
    ) { }


    /**
     * Sinh mã yêu cầu tự động: HC-YYYYMMDD-XXX
     */
    private async generateRequestCode(): Promise<string> {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `HC-${dateStr}-`;

        const lastRequest = await this.requestRepo
            .createQueryBuilder('r')
            .where('r.request_code LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('r.request_code', 'DESC')
            .getOne();

        let nextNum = 1;
        if (lastRequest) {
            const lastNum = parseInt(lastRequest.requestCode.replace(prefix, ''), 10);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }

        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    /**
     * Sinh mã phân quyền tự động: PQ_YYYYMMXXX
     */
    private async generatePermissionCode(): Promise<string> {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const prefix = `PQ_${year}${month}`;

        const lastPermission = await this.permissionRepo
            .createQueryBuilder('p')
            .where('p.code LIKE :prefix', { prefix: `${prefix}%` })
            .orderBy('p.code', 'DESC')
            .getOne();

        let nextNum = 1;
        if (lastPermission && lastPermission.code) {
            const lastPart = lastPermission.code.slice(-3);
            const lastNum = parseInt(lastPart, 10);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }

        return `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    async getAvailablePassports() {
        const passports = await this.passportRepo.find({
            where: {
                isDeleted: false,  // is_deleted = 0 = chưa xóa
                usageStatus: 'STORING',
            },
            select: ['id', 'passportNumber', 'passportType', 'fullName', 'expiryDate', 'usageStatus'],
            order: { createdAt: 'DESC' },
        });

        const data = passports.map((p) => ({
            id: p.id,
            passportNumber: p.passportNumber,
            passportType: p.passportType,
            fullName: p.fullName,
            expiryDate: p.expiryDate,
            label: `${p.passportNumber} - ${p.fullName || 'N/A'}`,
        }));

        return { statusCode: 200, data, total: data.length };
    }

    /**
     * Validate ngày mượn/trả
     */
    private validateDates(borrowDate: string, returnDate?: string, departureDate?: Date | null) {
        const borrow = new Date(borrowDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Ngày mượn >= ngày hiện tại
        if (borrow < today) {
            throw new BadRequestException('Ngày dự kiến mượn không được nhỏ hơn ngày hiện tại');
        }

        // Ngày đi ≥ Ngày hiện tại + 5 ngày
        if (departureDate) {
            const minDepartureDate = new Date(today);
            minDepartureDate.setDate(minDepartureDate.getDate() + 5);
            if (departureDate < minDepartureDate) {
                throw new BadRequestException('Ngày đi phải cách ngày hiện tại ít nhất 5 ngày');
            }
        }

        if (returnDate) {
            const returnD = new Date(returnDate);
            if (returnD < borrow) {
                throw new BadRequestException('Ngày dự kiến trả phải >= ngày dự kiến mượn');
            }

            // // Khoảng mượn không quá 45 ngày (Tăng lên để bao quát logic mặc định 30 ngày + buffer)
            // const diffDays = Math.ceil((returnD.getTime() - borrow.getTime()) / (1000 * 60 * 60 * 24));
            // if (diffDays > 60) {
            //     throw new BadRequestException('Thời gian mượn không được quá 60 ngày');
            // }
        }
    }

    /**
     * Kiểm tra hộ chiếu: còn hạn, không trùng lịch
     */
    private async validatePassport(passportId: string, borrowDate: string, returnDate?: string, excludeRequestId?: string, skipExpiryCheck?: boolean) {
        const passport = await this.passportRepo.findOne({
            where: { id: passportId, isDeleted: false },
        });

        if (!passport) {
            throw new BadRequestException('Hộ chiếu không tồn tại hoặc đã bị xóa');
        }

        // 1. Kiểm tra trạng thái vật lý của hộ chiếu
        if (passport.usageStatus === 'IN_USE') {
            throw new BadRequestException(`Hộ chiếu ${passport.passportNumber} hiện đang được người khác sử dụng.`);
        }

        // 2. Kiểm tra hộ chiếu còn hạn
        if (!skipExpiryCheck) {
            const borrowD = new Date(borrowDate);
            const expiryD = new Date(passport.expiryDate);
            if (expiryD <= borrowD) {
                throw new BadRequestException(`Hộ chiếu ${passport.passportNumber} đã hết hạn (${passport.expiryDate})`);
            }
        }

        // 3. Kiểm tra trùng lịch mượn với yêu cầu đang thực sự sử dụng (IN_USE)
        const qb = this.requestRepo.createQueryBuilder('r')
            .where('r.is_deleted = :isDeleted', { isDeleted: false })
            .andWhere('r.status = :status', { status: 'IN_USE' }) // CHỈ CHECK CÁC YÊU CẦU ĐANG MƯỢN
            .andWhere('r.passport_id = :passportId', { passportId });

        if (excludeRequestId) {
            qb.andWhere('r.id != :excludeId', { excludeId: excludeRequestId });
        }

        // Kiểm tra overlap thời gian
        if (returnDate) {
            qb.andWhere('r.borrow_date <= :returnDate', { returnDate })
                .andWhere('(r.return_date >= :borrowDate OR r.return_date IS NULL)', { borrowDate });
        } else {
            qb.andWhere('(r.return_date >= :borrowDate OR r.return_date IS NULL)', { borrowDate });
        }

        const conflicting = await qb.getOne();
        if (conflicting) {
            throw new BadRequestException(
                `Hộ chiếu ${passport.passportNumber} đang được sử dụng bởi yêu cầu ${conflicting.requestCode} (đến ngày ${conflicting.returnDate || 'chưa xác định'})`,
            );
        }

        return passport;
    }

    /**
     * 1. Tạo yêu cầu mượn (cá nhân + đoàn ra)
     * FE gửi: namePassportRequest = Borrower ID (VD: "BR002")
     *         leader = Leader ID (VD: "LD003")
     *         passportNumber = Số HC (VD: "B16676028") — backend tự tra DB lấy passportId
     */
    async create(createDto: CreatePassportRequestDto, userId: string, ipAddress: string) {
        try {
            const { typeRequest = 'user' } = createDto;

            // Kiểm tra trùng lặp qua clientRequestId trước khi thực hiện
            if (createDto.clientRequestId) {
                const existingRequest = await this.requestRepo.findOne({
                    where: {
                        createdBy: userId,
                        clientRequestId: createDto.clientRequestId,
                        isDeleted: false,
                    },
                });
                if (existingRequest) {
                    return {
                        statusCode: 200,
                        message: 'Tạo yêu cầu mượn hộ chiếu thành công',
                        data: {
                            id: existingRequest.id,
                            requestCode: existingRequest.requestCode,
                            status: existingRequest.status,
                        },
                    };
                }
            }

            // Tự động tính toán ngày mượn/trả
            let borrowDateVal: string | undefined = createDto.borrowDate;
            let returnDateVal: string | undefined = createDto.returnDate;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (createDto.isSpecificDepartureDate && createDto.departureDate && createDto.arrivalDate) {
                const dep = new Date(createDto.departureDate);
                const arr = new Date(createDto.arrivalDate);

                // Ngày dự kiến mượn = Ngày đi - 5 ngày
                const bDate = new Date(dep);
                bDate.setDate(bDate.getDate() - 5);
                borrowDateVal = bDate.toISOString().split('T')[0];

                // Ngày dự kiến trả = Ngày về + 5 ngày
                const rDate = new Date(arr);
                rDate.setDate(rDate.getDate() + 5);
                returnDateVal = rDate.toISOString().split('T')[0];
            } else if (!borrowDateVal) {
                // Không nhập ngày đi/về: Ngày dự kiến mượn = Ngày tạo yêu cầu + 5 ngày
                const bDate = new Date(today);
                bDate.setDate(bDate.getDate() + 5);
                borrowDateVal = bDate.toISOString().split('T')[0];

                // Ngày dự kiến trả = Ngày dự kiến mượn + 30 ngày
                const rDate = new Date(bDate);
                rDate.setDate(rDate.getDate() + 30);
                returnDateVal = rDate.toISOString().split('T')[0];
            }

            // Gán lại vào createDto để các logic sau sử dụng
            createDto.borrowDate = borrowDateVal;
            createDto.returnDate = returnDateVal;

            // Validate ngày
            const depDate = createDto.departureDate ? new Date(createDto.departureDate) : null;
            const isGroupRequest = typeRequest === 'organization' || typeRequest === 'organizational';
            const skipValidate = isGroupRequest && createDto.isSpecificDepartureDate && createDto.departureDate && createDto.arrivalDate;

            if (!skipValidate) {
                if (typeRequest === 'user') {
                    this.validateDates(createDto.borrowDate!, createDto.returnDate, depDate);
                } else if (createDto.borrowDate) {
                    this.validateDates(createDto.borrowDate, createDto.returnDate, depDate);
                }
            }

            // Validate lý do (max 500 ký tự)
            if (createDto.reason && createDto.reason.trim().length > 500) {
                throw new BadRequestException('Lý do không được quá 500 ký tự');
            }

            // Lưu nguyên giá trị FE gửi lên cho namePassportRequest (ID hoặc "ID")
            const resolvedName = createDto.namePassportRequest;

            // === Resolve leader: Validate leader ID tồn tại trong DB và thuộc nhóm TRUONGPHONG ===
            if (typeRequest === 'user') {
                if (!createDto.leader) {
                    throw new BadRequestException('Vui lòng chọn lãnh đạo phê duyệt');
                }
                const leader = await this.userRepo.findOne({
                    where: { id: createDto.leader },
                    relations: ['groupUsers'],
                });
                if (!leader) {
                    throw new BadRequestException(`Lãnh đạo ID "${createDto.leader}" không tồn tại`);
                }
                // const isTP = (leader.groupUsers || []).some(g => g.code === 'truongphong');
                // if (!isTP) {
                //     // Cảnh báo nhưng có thể vẫn cho phép nếu hệ thống linh hoạt, 
                //     // nhưng theo yêu cầu là lấy theo Trưởng phòng nên ta validate chặt.
                //     throw new BadRequestException(`Người dùng "${leader.name}" không thuộc nhóm Trưởng phòng`);
                // }
            }


            // === Resolve passportNumber → passportId từ DB ===
            let resolvedPassportId: string | null = null;
            let resolvedPassportNumber: string | null = createDto.passportNumber || null;
            let resolvedPassportType: string | null = null;
            let passport: PassportEntity | undefined = undefined;

            if (typeRequest === 'user') {
                if (!createDto.passportNumber) {
                    throw new BadRequestException('Vui lòng chọn hộ chiếu');
                }

                // Tra DB bằng passportNumber
                passport = await this.passportRepo.findOne({
                    where: {
                        passportNumber: createDto.passportNumber,
                        isDeleted: false, // is_deleted = 0 = chưa xóa
                    },
                }) || undefined;

                if (!passport) {
                    throw new BadRequestException(
                        `Hộ chiếu số "${createDto.passportNumber}" không tồn tại hoặc không đang lưu trữ`,
                    );
                }

                resolvedPassportId = passport.id;
                resolvedPassportNumber = passport.passportNumber;
                resolvedPassportType = passport.passportType;

                await this.validatePassport(
                    resolvedPassportId,
                    createDto.borrowDate!,
                    createDto.returnDate,
                    undefined,
                    typeRequest === 'user',
                );
            }

            let destinationValue: string | null = null;
            if (createDto.destination) {
                if (Array.isArray(createDto.destination)) {
                    destinationValue = JSON.stringify(createDto.destination);
                } else {
                    destinationValue = createDto.destination;
                }
            }

            if (typeRequest === 'organization' || typeRequest === 'organizational') {
                if (!destinationValue && !createDto.destinationOther) {
                    throw new BadRequestException('Vui lòng nhập nơi đến');
                }

                // Validate từng HC trong danh sách đoàn
                if (createDto.listOfOrganizations && createDto.listOfOrganizations.length > 0) {
                    const passportNumbers = new Set<string>();
                    const userIds = new Set<string>();

                    for (const member of createDto.listOfOrganizations) {
                        const nameStr = member.fullName ? member.fullName.trim() : 'Không rõ tên';

                        // 1. Bắt buộc phải đi kèm số hộ chiếu
                        if (!member.passportNumber || !member.passportNumber.trim()) {
                            throw new BadRequestException(`Cán bộ "${nameStr}" bắt buộc phải đi kèm số hộ chiếu`);
                        }

                        const passportNum = member.passportNumber.trim().toUpperCase();

                        // 2. Mỗi người trong đoàn chỉ được xuất hiện 1 lần
                        if (passportNumbers.has(passportNum)) {
                            throw new BadRequestException(`Hộ chiếu số "${member.passportNumber}" bị lặp lại trong danh sách đoàn`);
                        }
                        passportNumbers.add(passportNum);

                        if (member.userId && member.userId.trim()) {
                            const uId = member.userId.trim();
                            if (userIds.has(uId)) {
                                throw new BadRequestException(`Cán bộ "${nameStr}" bị lặp lại nhiều lần trong danh sách đoàn`);
                            }
                            userIds.add(uId);
                        }

                        if (member.passportNumber && !member.passportId) {
                            // Resolve passportNumber → passportId cho từng thành viên
                            const memberPassport = await this.passportRepo.findOne({
                                where: {
                                    passportNumber: member.passportNumber,
                                    isDeleted: false,
                                },
                            });
                            if (memberPassport) {
                                member.passportId = memberPassport.id;
                                // Gán luôn passportType cho metadata nếu có
                                member.passportType = memberPassport.passportType;
                                await this.validatePassport(
                                    memberPassport.id,
                                    createDto.borrowDate!,
                                    createDto.returnDate,
                                    undefined,
                                    false,
                                );
                            }
                        } else if (member.passportId) {
                            await this.validatePassport(
                                member.passportId,
                                createDto.borrowDate!,
                                createDto.returnDate,
                                undefined,
                                false,
                            );
                        }
                    }
                }
            }

            // Sinh mã yêu cầu
            const requestCode = await this.generateRequestCode();

            // Xác định borrowDate: 
            // - Ưu tiên dùng giá trị từ createDto (đã được tính toán ở bước trên)
            let finalBorrowDate: Date;
            if (createDto.borrowDate) {
                finalBorrowDate = new Date(createDto.borrowDate);
            } else {
                // Mặc định là ngày hôm nay
                finalBorrowDate = new Date();
                finalBorrowDate.setHours(0, 0, 0, 0);
            }

            const request = this.requestRepo.create({
                id: uuidv4(),
                requestCode,
                typeRequest,
                requesterId: userId,
                namePassportRequest: resolvedName,

                // Cá nhân
                leader: createDto.leader || null,
                passportId: resolvedPassportId,
                passportNumber: resolvedPassportNumber,
                passportType: resolvedPassportType,
                reason: createDto.reason || null,

                // Thời gian
                borrowDate: finalBorrowDate,
                returnDate: createDto.returnDate ? new Date(createDto.returnDate) : null,

                // Đoàn ra
                delegationLeader: createDto.delegationLeader || null,
                position: createDto.position || null,
                destination: destinationValue,
                destinationOther: createDto.destinationOther || null,
                isSpecificDepartureDate: createDto.isSpecificDepartureDate || false,
                departureDate: createDto.departureDate ? new Date(createDto.departureDate) : null,
                arrivalDate: createDto.arrivalDate ? new Date(createDto.arrivalDate) : null,
                partner: createDto.partner || null,
                typeOfFunding: createDto.typeOfFunding || null,
                tripContent: createDto.tripContent || null,
                decision: createDto.decision || null,
                note: createDto.note || null,
                receivedGifts: createDto.receivedGifts || null,
                partnerGifts: createDto.partnerGifts || null,
                passportFile: createDto.passportFile || null,
                listOfOrganizations: createDto.listOfOrganizations || null,

                status: 'PENDING',
                createdBy: userId,
                clientRequestId: createDto.clientRequestId || null,
            });

            let initialWorkflowRecipients: string[] = [];
            try {
                await this.requestRepo.save(request);
            } catch (saveError) {
                if (createDto.clientRequestId) {
                    const existingRequest = await this.requestRepo.findOne({
                        where: {
                            createdBy: userId,
                            clientRequestId: createDto.clientRequestId,
                            isDeleted: false,
                        },
                    });
                    if (existingRequest) {
                        return {
                            statusCode: 200,
                            message: 'Tạo yêu cầu mượn hộ chiếu thành công',
                            data: {
                                id: existingRequest.id,
                                requestCode: existingRequest.requestCode,
                                status: existingRequest.status,
                            },
                        };
                    }
                }
                throw saveError;
            }

            // === Lưu Danh sách đoàn ra vào bảng mới ===
            const delegationItems: PassportDelegationItemEntity[] = [];

            if (typeRequest === 'user' && resolvedPassportId) {
                // Tự động tạo 1 item cho yêu cầu cá nhân
                const user = await this.userRepo.findOne({ where: { id: userId } });
                delegationItems.push(this.delegationRepo.create({
                    id: uuidv4(),
                    requestId: request.id,
                    userId: userId,
                    fullName: user?.name || 'Cá nhân',
                    passportId: resolvedPassportId,
                    passportNumber: resolvedPassportNumber,
                    passportType: resolvedPassportType,
                    expiryDate: (typeRequest === 'user' && passport) ? passport.expiryDate : null,
                }));
            } else if ((typeRequest === 'organization' || typeRequest === 'organizational') && createDto.listOfOrganizations && createDto.listOfOrganizations.length > 0) {
                createDto.listOfOrganizations.forEach((member) => {
                    delegationItems.push(this.delegationRepo.create({
                        id: uuidv4(),
                        requestId: request.id,
                        userId: member.userId ? String(member.userId) : null,
                        fullName: String(member.fullName),
                        passportId: member.passportId ? String(member.passportId) : null,
                        passportNumber: member.passportNumber ? String(member.passportNumber) : null,
                        passportType: member.passportType ? String(member.passportType) : null,
                        position: member.position ? String(member.position) : null,
                        rank: member.rank ? String(member.rank) : null,
                        unit: member.unit ? String(member.unit) : null,
                        cbType: member.cbType ? String(member.cbType) : null,
                        expiryDate: member.expiryDate ? new Date(member.expiryDate) : null,
                    }));
                });
            }

            if (delegationItems.length > 0) {
                await this.delegationRepo.save(delegationItems, { chunk: 100 });
            }

            // === BPMN Integration ===
            try {
                const bpmnUser: any = await this.sqlsvRepo.getUserById(userId);
                if (!bpmnUser?.parent?.id) {
                    throw new Error('Người dùng không thuộc đơn vị nào, không thể khởi tạo quy trình.');
                }
                // console.log('bpmnUser', bpmnUser);
                // --- Lấy vai trò của người dùng cho quy trình PassportRequest ---
                let userRole: string | null = null;
                try {
                    const userGroups = await this.sqlsvRepo.getDynamicRolesByUserId(userId);
                    for (const group of userGroups) {
                        const rolesDynamic = group.roles_dynamic;
                        if (Array.isArray(rolesDynamic)) {
                            const passportRole = rolesDynamic.find((r: any) => r.processKey === 'QT_MTHC');
                            if (passportRole?.roleCode) {
                                userRole = passportRole.roleCode;
                                break;
                            }
                        }
                    }
                } catch (e) {
                    this.logger.warn(`Lỗi khi lấy vai trò người dùng cho quy trình PassportRequest: ${e.message}`);
                }
                // -----------------------------------------------------------------

                const flowConfig = await this.sqlsvRepo.getFlowByUnit(
                    String(bpmnUser.parent.id), 'PassportRequest',
                );
                if (!flowConfig) {
                    throw new Error(`Đơn vị ${bpmnUser.parent.name || bpmnUser.parent.id} chưa cấu hình luồng PassportRequest.`);
                }

                const bpmnXML = await this.runtimeDbService.getBpmnFile(flowConfig.id);
                const workflowResult = await this.runtimeDbService.createDocumentAtNodePassport({
                    bpmnXML,
                    data: {
                        documentId: request.id,
                        receiverUnit: String(bpmnUser.parent.id),
                    },
                    assigneeUserId: userId,
                    flowId: String(flowConfig.id),
                    userRole,
                });
                initialWorkflowRecipients = Array.isArray(workflowResult?.data?.assigneeGroupIds)
                    ? workflowResult.data.assigneeGroupIds
                    : [];
            } catch (bpmnError) {
                // Rollback: Xóa bản ghi vừa tạo nếu không thể khởi tạo luồng xử lý
                await this.requestRepo.delete(request.id);
                console.error('[BPMN] Rollback yêu cầu do lỗi khởi tạo:', bpmnError.message);

                if (bpmnError instanceof BadRequestException) throw bpmnError;
                throw new BadRequestException(`Không thể khởi tạo quy trình xử lý: ${bpmnError.message}`);
            }
            // === END BPMN Integration ===

            await this.addHistory(request.id, 'CREATE', userId, createDto.note || 'Người dùng khởi tạo yêu cầu mượn hộ chiếu');

            // --- Gửi thông báo cho lãnh đạo ---
            for (const recipientId of initialWorkflowRecipients) {
                if (!recipientId || recipientId === request.leader) continue;
                await this.notifyPassportRequestRecipient(recipientId, {
                    content: `Có yêu cầu mượn hộ chiếu ${request.requestCode}, đề nghị phê duyệt.`,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    recordId: request.id,
                });
            }

            if (request.leader) {
                await this.notificationService.create({
                    content: `Có yêu cầu mượn hộ chiếu ${request.requestCode}, đề nghị phê duyệt.`,
                    recipientId: request.leader,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                    recordId: request.id,
                });
            }

            await this.systemLogService.createLogFromSystem({
                action: 'Tạo yêu cầu',
                details: `Tạo yêu cầu mượn hộ chiếu thành công: ${request.requestCode}`,
                method: 'POST',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'CREATE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            return {
                statusCode: 200,
                message: 'Tạo yêu cầu mượn hộ chiếu thành công',
                data: {
                    id: request.id,
                    requestCode: request.requestCode,
                    status: request.status,
                },
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'Tạo yêu cầu',
                details: `Lỗi tạo yêu cầu mượn hộ chiếu: ${error.message}`,
                method: 'POST',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'CREATE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });
            console.error('Error creating passport request:', error);
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi tạo yêu cầu: ${error.message}`);
        }
    }

    /**
     * 2. Danh sách yêu cầu mượn (của người tạo)
     */
    async findAll(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, search, status, typeRequest, sort, filter, isExport } = params as any;
            let parsedFilter = filter;
            if (typeof filter === 'string') {
                try {
                    parsedFilter = JSON.parse(filter);
                } catch {
                    parsedFilter = {};
                }
            }
            const finalTypeRequest: string = typeRequest || parsedFilter?.typeRequest;
            // =========================
            // 1. LẤY VAI TRÒ USER (1 query duy nhất)
            // =========================
            console.time(`[PERF] 1-roles`);
            const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'rolesByProcess'] });
            const userRoles: string[] = [];
            if (user && user.rolesByProcess) {
                user.rolesByProcess.forEach((rbp: any) => {
                    if (rbp.processKey === 'PassportRequest') {
                        (rbp.roles || []).forEach((r: any) => { if (r.roleCode) userRoles.push(r.roleCode); });
                    }
                });
            }
            console.timeEnd(`[PERF] 1-roles`);
            const userGroupIds = await this.getUserGroupIds(userId);
            const userGroupIdsSql = userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');

            // =========================
            // 2. XÂY DỰNG ĐIỀU KIỆN VISIBILITY (dùng chung cho cả data + count)
            // =========================
            // Tối ưu hóa cực hạn: Phân tách toàn bộ mệnh đề OR thành các UNION riêng biệt.
            // SQL Server cực kỳ yếu kém trong việc dùng Index khi có điều kiện OR (nhất là trên bảng 700k dòng).
            const userRolesCond = userRoles.length > 0
                ? `OR (wi.assignee_user_id IS NULL AND wi.role IN (${userRoles.map(r => `N'${r}'`).join(',')}))`
                : '';
            const userGroupsWorkItemCond = userGroupIds.length > 0
                ? `OR wi.assignee_user_id IN (${userGroupIdsSql})`
                : '';
            const userGroupsAuditCond = userGroupIds.length > 0
                ? `OR a.receiver IN (${userGroupIdsSql}) OR a.group_ IN (${userGroupIdsSql})`
                : '';

            const visibilityWhereSQL = `
                AND (
                    r.created_by = @0
                    OR r.requester_id = @0
                    OR r.name_passport_request = @0
                    OR EXISTS (
                        SELECT 1 FROM passport_delegation_items di WITH (NOLOCK)
                        WHERE di.request_id = r.id AND di.user_id = @0
                    )
                    OR EXISTS (
                        SELECT 1 FROM work_items wi WITH (NOLOCK)
                        WHERE wi.document_id = CAST(r.id AS varchar(64))
                          AND wi.state = 'open'
                          AND (
                              wi.assignee_user_id = @0
                              ${userGroupsWorkItemCond}
                              ${userRolesCond}
                          )
                    )
                    OR EXISTS (
                        SELECT 1 FROM audit a WITH (NOLOCK)
                        WHERE a.document_id = CAST(r.id AS nvarchar(64))
                          AND a.type_document = 'PassportRequest'
                          AND (
                              a.user_id = @0
                              OR a.receiver = @0
                              ${userGroupsAuditCond}
                          )
                    )
                )
            `;

            // =========================
            // 3. XÂY DỰNG ĐIỀU KIỆN LỌC
            // =========================
            let filterSQL = '';
            const filterParams: any[] = [userId]; // @0 = userId

            const returnStatus = params.returnStatus || parsedFilter?.returnStatus;
            if (returnStatus) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (returnStatus === 'expired') {
                    filterSQL += ` AND r.return_date < @${filterParams.length}`;
                    filterParams.push(today);
                } else if (returnStatus === 'expiringSoon') {
                    const soonDate = new Date(today);
                    soonDate.setDate(soonDate.getDate() + 3);
                    filterSQL += ` AND r.return_date BETWEEN @${filterParams.length} AND @${filterParams.length + 1}`;
                    filterParams.push(today, soonDate);
                } else if (returnStatus === 'valid') {
                    const soonDate = new Date(today);
                    soonDate.setDate(soonDate.getDate() + 3);
                    filterSQL += ` AND r.return_date > @${filterParams.length}`;
                    filterParams.push(soonDate);
                }
            }

            if (status && status !== 'all') {
                filterSQL += ` AND r.status = @${filterParams.length}`;
                filterParams.push(status);
            }
            if (finalTypeRequest) {
                filterSQL += ` AND r.type_request = @${filterParams.length}`;
                filterParams.push(finalTypeRequest);
            }
            if (search) {
                const searchParam = `%${search}%`;
                const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
                filterSQL += ` AND (
                    r.request_code ${collation} LIKE @${filterParams.length}
                    OR r.passport_number ${collation} LIKE @${filterParams.length}
                    OR r.name_passport_request ${collation} LIKE @${filterParams.length}
                    OR r.name_passport_request IN (
                        SELECT CAST(id AS nvarchar(100)) FROM users WITH (NOLOCK)
                        WHERE name ${collation} LIKE @${filterParams.length}
                           OR username ${collation} LIKE @${filterParams.length}
                    )
                )`;
                filterParams.push(searchParam);
            }

            // Advanced Filters
            if (parsedFilter && typeof parsedFilter === 'object') {
                for (const [key, value] of Object.entries(parsedFilter)) {
                    if (!value || key === 'returnStatus') continue;
                    if (key === 'requestCode') {
                        filterSQL += ` AND r.request_code LIKE @${filterParams.length}`;
                        filterParams.push(`%${value}%`);
                    } else if (key === 'passportNumber') {
                        filterSQL += ` AND r.passport_number LIKE @${filterParams.length}`;
                        filterParams.push(`%${value}%`);
                    } else if (key === 'namePassportRequest') {
                        //Tên đoàn lưu text, tên người lưu id từ bảng users.
                        filterSQL += ` AND (
                            r.name_passport_request COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                            OR r.name_passport_request IN (
                                SELECT CAST(id AS nvarchar(50)) FROM users WITH (NOLOCK)
                                WHERE name COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                                   OR username COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                            )
                        )`;
                        filterParams.push(`%${value}%`);
                    } else if ((key === 'borrowDate' || key === 'returnDate') && (value as any).startDate) {
                        const col = key === 'borrowDate' ? 'r.borrow_date' : 'r.return_date';
                        filterSQL += ` AND ${col} BETWEEN @${filterParams.length} AND @${filterParams.length + 1}`;
                        filterParams.push((value as any).startDate, (value as any).endDate);
                    }
                }
            }

            // Sort (dùng shared utility)
            let orderSQL = 'r.created_at DESC';
            const PASSPORT_SORT_FIELDS = [
                ...getDtoKeys(CreatePassportRequestDto),
                'createdAt', 'updatedAt'
            ];
            const colMap: Record<string, string> = {
                createdAt: 'r.created_at',
                requestCode: 'r.request_code',
                requesterId: 'r.requester_id',
                namePassportRequest: 'r.name_passport_request',
                passportNumber: 'r.passport_number',
                borrowDate: 'r.borrow_date',
                returnDate: 'r.return_date',
            };
            const sortResult1 = validateAndParseSortParam(sort, PASSPORT_SORT_FIELDS);
            if (Object.keys(sortResult1).length > 0) {
                const sortParts = Object.entries(sortResult1).map(([key, dir]) => {
                    const col = colMap[key] ?? `r.${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
                    return `${col} ${dir}`;
                });
                orderSQL = sortParts.join(', ');
            }

            const whereClause = `r.is_deleted = 0 ${filterSQL}`;

            // =========================
            // 4. THỰC THI: data + count SONG SONG, mỗi cái 1 query duy nhất
            // =========================
            console.time(`[PERF] 2-queries`);

            // Query lấy dữ liệu (OFFSET/FETCH, chỉ trả 20 rows)
            const dataSQL = `
                SELECT r.*
                FROM passport_borrow_requests r WITH (NOLOCK)
                WHERE ${whereClause}
                ${visibilityWhereSQL}
                ORDER BY ${orderSQL}
                OFFSET ${(+page - 1) * +limit} ROWS FETCH NEXT ${+limit} ROWS ONLY
            `;

            // Query đếm theo status (1 lần quét duy nhất cho cả total + status counts)
            const countSQL = `
                SELECT r.status, COUNT_BIG(1) as cnt
                FROM passport_borrow_requests r WITH (NOLOCK)
                WHERE ${whereClause}
                ${visibilityWhereSQL}
                GROUP BY r.status
            `;

            const [rawItems, statusRows] = await Promise.all([
                this.requestRepo.query(dataSQL, filterParams),
                this.requestRepo.query(countSQL, filterParams),
            ]);
            console.timeEnd(`[PERF] 2-queries`);

            // Map raw rows sang entity (TypeORM metadata)
            console.time(`[PERF] 3-hydrate`);
            const items = rawItems.map((row: any) => {
                const camelRow: any = {};
                for (const key in row) {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    camelRow[camelKey] = row[key];
                }
                if (typeof camelRow.listOfOrganizations === 'string') {
                    try { camelRow.listOfOrganizations = JSON.parse(camelRow.listOfOrganizations); } catch (e) { }
                }
                if (typeof camelRow.passportFile === 'string') {
                    try { camelRow.passportFile = JSON.parse(camelRow.passportFile); } catch (e) { }
                }
                return this.requestRepo.create(camelRow);
            });
            console.timeEnd(`[PERF] 3-hydrate`);

            // Tổng hợp countByStatus
            const countByStatus: Record<string, number> = {};
            let total = 0;
            statusRows.forEach((s: any) => {
                const cnt = parseInt(s.cnt, 10);
                countByStatus[s.status] = cnt;
                total += cnt;
            });
            countByStatus['all'] = total;

            // =========================
            // 5. ENRICHMENT: Map dữ liệu hiển thị
            // =========================
            console.time(`[PERF] 4-map`);
            const mappedItems = await this.mapRequestItems(items, userId, isExport === 'true');
            console.timeEnd(`[PERF] 4-map`);


            return {
                statusCode: 200,
                data: mappedItems,
                total,
                page: +page,
                limit: +limit,
                totalPages: Math.ceil(total / +limit),
                countByStatus,
            };

        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách: ${error.message}`);
        }
    }

    /**
     * BÁO CÁO THỐNG KÊ ĐOÀN RA (Excel Export)
     * GET /api/passport-requests/export-excel
     * Chỉ lấy dữ liệu các yêu cầu Đoàn ra (type_request != 'user')
     */
    async exportDelegationStatisticsExcel(params: ListPassportRequestDto, userId: string): Promise<{ buffer: Buffer; filename: string }> {
        try {
            const { search, status, filter } = params as any;
            let parsedFilter = filter;
            if (typeof filter === 'string') {
                try {
                    parsedFilter = JSON.parse(filter);
                } catch {
                    parsedFilter = {};
                }
            }

            // 1. Lấy vai trò user & groups
            const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'rolesByProcess'] });
            const userRoles: string[] = [];
            if (user && user.rolesByProcess) {
                user.rolesByProcess.forEach((rbp: any) => {
                    if (rbp.processKey === 'PassportRequest') {
                        (rbp.roles || []).forEach((r: any) => { if (r.roleCode) userRoles.push(r.roleCode); });
                    }
                });
            }
            const userGroupIds = await this.getUserGroupIds(userId);
            const userGroupIdsSql = userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');

            const userRolesCond = userRoles.length > 0
                ? `OR (wi.assignee_user_id IS NULL AND wi.role IN (${userRoles.map(r => `N'${r}'`).join(',')}))`
                : '';
            const userGroupsWorkItemCond = userGroupIds.length > 0
                ? `OR wi.assignee_user_id IN (${userGroupIdsSql})`
                : '';
            const userGroupsAuditCond = userGroupIds.length > 0
                ? `OR a.receiver IN (${userGroupIdsSql}) OR a.group_ IN (${userGroupIdsSql})`
                : '';

            const visibilityWhereSQL = `
                AND (
                    r.created_by = @0
                    OR r.requester_id = @0
                    OR r.name_passport_request = @0
                    OR EXISTS (
                        SELECT 1 FROM passport_delegation_items di WITH (NOLOCK)
                        WHERE di.request_id = r.id AND di.user_id = @0
                    )
                    OR EXISTS (
                        SELECT 1 FROM work_items wi WITH (NOLOCK)
                        WHERE wi.document_id = CAST(r.id AS varchar(64))
                          AND wi.state = 'open'
                          AND (
                              wi.assignee_user_id = @0
                              ${userGroupsWorkItemCond}
                              ${userRolesCond}
                          )
                    )
                    OR EXISTS (
                        SELECT 1 FROM audit a WITH (NOLOCK)
                        WHERE a.document_id = CAST(r.id AS nvarchar(64))
                          AND a.type_document = 'PassportRequest'
                          AND (
                              a.user_id = @0
                              OR a.receiver = @0
                              ${userGroupsAuditCond}
                          )
                    )
                )
            `;

            // 2. Điều kiện lọc (CHỈ LẤY ĐOÀN RA: type_request != 'user')
            let filterSQL = ` AND r.type_request <> N'user'`;
            const filterParams: any[] = [userId];

            const returnStatus = params.returnStatus || parsedFilter?.returnStatus;
            if (returnStatus) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (returnStatus === 'expired') {
                    filterSQL += ` AND r.return_date < @${filterParams.length}`;
                    filterParams.push(today);
                } else if (returnStatus === 'expiringSoon') {
                    const soonDate = new Date(today);
                    soonDate.setDate(soonDate.getDate() + 3);
                    filterSQL += ` AND r.return_date BETWEEN @${filterParams.length} AND @${filterParams.length + 1}`;
                    filterParams.push(today, soonDate);
                } else if (returnStatus === 'valid') {
                    const soonDate = new Date(today);
                    soonDate.setDate(soonDate.getDate() + 3);
                    filterSQL += ` AND r.return_date > @${filterParams.length}`;
                    filterParams.push(soonDate);
                }
            }

            if (status && status !== 'all') {
                filterSQL += ` AND r.status = @${filterParams.length}`;
                filterParams.push(status);
            }
            if (search) {
                const searchParam = `%${search}%`;
                const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
                filterSQL += ` AND (
                    r.request_code ${collation} LIKE @${filterParams.length}
                    OR r.passport_number ${collation} LIKE @${filterParams.length}
                    OR r.name_passport_request ${collation} LIKE @${filterParams.length}
                    OR r.name_passport_request IN (
                        SELECT CAST(id AS nvarchar(100)) FROM users WITH (NOLOCK)
                        WHERE name ${collation} LIKE @${filterParams.length}
                           OR username ${collation} LIKE @${filterParams.length}
                    )
                )`;
                filterParams.push(searchParam);
            }

            if (parsedFilter && typeof parsedFilter === 'object') {
                for (const [key, value] of Object.entries(parsedFilter)) {
                    if (!value || key === 'returnStatus' || key === 'typeRequest') continue;
                    if (key === 'requestCode') {
                        filterSQL += ` AND r.request_code LIKE @${filterParams.length}`;
                        filterParams.push(`%${value}%`);
                    } else if (key === 'passportNumber') {
                        filterSQL += ` AND r.passport_number LIKE @${filterParams.length}`;
                        filterParams.push(`%${value}%`);
                    } else if (key === 'namePassportRequest') {
                        filterSQL += ` AND (
                            r.name_passport_request COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                            OR r.name_passport_request IN (
                                SELECT CAST(id AS nvarchar(50)) FROM users WITH (NOLOCK)
                                WHERE name COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                                   OR username COLLATE Vietnamese_CI_AI LIKE @${filterParams.length}
                            )
                        )`;
                        filterParams.push(`%${value}%`);
                    } else if ((key === 'borrowDate' || key === 'returnDate') && (value as any).startDate) {
                        const col = key === 'borrowDate' ? 'r.borrow_date' : 'r.return_date';
                        filterSQL += ` AND ${col} BETWEEN @${filterParams.length} AND @${filterParams.length + 1}`;
                        filterParams.push((value as any).startDate, (value as any).endDate);
                    }
                }
            }

            const whereClause = `r.is_deleted = 0 ${filterSQL}`;

            const dataSQL = `
                SELECT r.*
                FROM passport_borrow_requests r WITH (NOLOCK)
                WHERE ${whereClause}
                ${visibilityWhereSQL}
                ORDER BY r.created_at DESC
            `;

            const rawItems = await this.requestRepo.query(dataSQL, filterParams);
            const items = rawItems.map((row: any) => {
                const camelRow: any = {};
                for (const key in row) {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    camelRow[camelKey] = row[key];
                }
                if (typeof camelRow.listOfOrganizations === 'string') {
                    try { camelRow.listOfOrganizations = JSON.parse(camelRow.listOfOrganizations); } catch (e) { }
                }
                if (typeof camelRow.passportFile === 'string') {
                    try { camelRow.passportFile = JSON.parse(camelRow.passportFile); } catch (e) { }
                }
                return this.requestRepo.create(camelRow);
            });

            const mappedItems = await this.mapRequestItems(items, userId, true);

            // 3. Tạo Excel Workbook
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Báo cáo thống kê đoàn ra', {
                views: [{ showGridLines: true }]
            });

            sheet.columns = [
                { key: 'colA', width: 38 },
                { key: 'colB', width: 22 },
                { key: 'colC', width: 25 },
                { key: 'colD', width: 25 },
                { key: 'colE', width: 22 },
            ];

            // Row 1: Tiêu đề
            sheet.mergeCells('A1:E1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = 'BÁO CÁO THỐNG KÊ ĐOÀN RA';
            titleCell.font = { name: 'Arial', size: 14, bold: true };
            titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
            sheet.getRow(1).height = 30;

            sheet.getRow(2).height = 10;

            // Row 3: Bảng Thống kê Chỉ tiêu Header
            const summaryHeaderRow = sheet.getRow(3);
            summaryHeaderRow.height = 24;
            sheet.getCell('A3').value = 'Chỉ tiêu';
            sheet.getCell('B3').value = 'Kết quả';
            sheet.getCell('C3').value = 'Cách tính';

            ['A3', 'B3', 'C3'].forEach(cellRef => {
                const cell = sheet.getCell(cellRef);
                cell.font = { name: 'Arial', size: 10, bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'D9E1F2' }
                };
                cell.alignment = { vertical: 'middle', horizontal: cellRef === 'B3' ? 'right' : 'left' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'BFBFBF' } },
                    left: { style: 'thin', color: { argb: 'BFBFBF' } },
                    bottom: { style: 'thin', color: { argb: 'BFBFBF' } },
                    right: { style: 'thin', color: { argb: 'BFBFBF' } },
                };
            });

            const startDetailRow = 11;
            const totalItemsCount = mappedItems.length;
            const endDetailRow = totalItemsCount > 0 ? startDetailRow + totalItemsCount - 1 : startDetailRow;

            let totalPassportsSum = 0;
            let totalDaysSum = 0;

            mappedItems.forEach(item => {
                let passCount = 0;
                if (Array.isArray(item.listOfOrganizations) && item.listOfOrganizations.length > 0) {
                    passCount = item.listOfOrganizations.length;
                } else if (item.delegationItems && item.delegationItems.length > 0) {
                    passCount = item.delegationItems.length;
                } else {
                    passCount = typeof item.totalPassports === 'number' ? item.totalPassports : parseInt(item.totalPassports, 10) || 0;
                }
                totalPassportsSum += passCount;

                let days = item.borrowDays;
                if (days === null || days === undefined || isNaN(days)) {
                    const bDate = this.parseToDate(item.borrowDate);
                    const rDate = this.parseToDate(item.returnDate);
                    if (bDate && rDate) {
                        const diffMs = rDate.getTime() - bDate.getTime();
                        days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    } else {
                        days = 0;
                    }
                }
                totalDaysSum += days;
            });

            const summaryRowsData = [
                {
                    row: 4,
                    title: 'Tổng số đoàn ra',
                    resultFormula: `COUNTA(A${startDetailRow}:A${endDetailRow})`,
                    resultValue: totalItemsCount,
                    note: 'Đếm tất cả bản ghi có "Hình thức" = "Đoàn ra" và có tên đoàn',
                },
                {
                    row: 5,
                    title: 'Số lượng người',
                    resultFormula: `SUM(B${startDetailRow}:B${endDetailRow})`,
                    resultValue: totalPassportsSum,
                    note: 'Cộng "Tổng số hộ chiếu" của tất cả các bản ghi Đoàn ra',
                },
                {
                    row: 6,
                    title: 'Tổng thời gian (ngày)',
                    resultFormula: `SUM(E${startDetailRow}:E${endDetailRow})`,
                    resultValue: totalDaysSum,
                    note: 'Tổng [(Ngày dự kiến trả - Ngày dự kiến mượn)] của tất cả Đoàn ra',
                },
            ];

            summaryRowsData.forEach(item => {
                const row = sheet.getRow(item.row);
                row.height = 22;
                const cellA = sheet.getCell(`A${item.row}`);
                const cellB = sheet.getCell(`B${item.row}`);
                const cellC = sheet.getCell(`C${item.row}`);

                cellA.value = item.title;
                cellB.value = totalItemsCount > 0 ? { formula: item.resultFormula, result: item.resultValue } : 0;
                cellC.value = item.note;

                cellA.font = { name: 'Arial', size: 10 };
                cellB.font = { name: 'Arial', size: 10, bold: true };
                cellC.font = { name: 'Arial', size: 10 };

                cellA.alignment = { vertical: 'middle', horizontal: 'left' };
                cellB.alignment = { vertical: 'middle', horizontal: 'right' };
                cellC.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

                [cellA, cellB, cellC].forEach(cell => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'D9D9D9' } },
                        left: { style: 'thin', color: { argb: 'D9D9D9' } },
                        bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
                        right: { style: 'thin', color: { argb: 'D9D9D9' } },
                    };
                });
            });

            sheet.getRow(7).height = 10;
            sheet.getRow(8).height = 10;
            const detailTitleRow = sheet.getRow(9);
            detailTitleRow.height = 24;
            sheet.getCell('A9').value = 'CHI TIẾT CÁC ĐOÀN RA';
            sheet.getCell('A9').font = { name: 'Arial', size: 11, bold: true };
            sheet.getCell('A9').alignment = { vertical: 'middle', horizontal: 'left' };

            const detailHeaderRow = sheet.getRow(10);
            detailHeaderRow.height = 24;
            const detailHeaders = [
                { cell: 'A10', text: 'Tên đoàn/ Người mượn', align: 'left' },
                { cell: 'B10', text: 'Tổng số hộ chiếu', align: 'right' },
                { cell: 'C10', text: 'Ngày dự kiến mượn', align: 'center' },
                { cell: 'D10', text: 'Ngày dự kiến trả', align: 'center' },
                { cell: 'E10', text: 'Thời gian (ngày)', align: 'right' },
            ];

            detailHeaders.forEach(h => {
                const cell = sheet.getCell(h.cell);
                cell.value = h.text;
                cell.font = { name: 'Arial', size: 10, bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'E2EFDA' }
                };
                cell.alignment = { vertical: 'middle', horizontal: h.align as any, wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'A6A6A6' } },
                    left: { style: 'thin', color: { argb: 'A6A6A6' } },
                    bottom: { style: 'thin', color: { argb: 'A6A6A6' } },
                    right: { style: 'thin', color: { argb: 'A6A6A6' } },
                };
            });

            mappedItems.forEach((item, idx) => {
                const r = startDetailRow + idx;
                const row = sheet.getRow(r);
                row.height = 22;

                const isEven = idx % 2 === 1;
                const bgColor = isEven ? 'EDF2F8' : 'FFFFFF';

                const nameStr = item.namePassportRequest || item.name_passport_request || item.requestCode || '--';

                let passCount = 0;
                if (Array.isArray(item.listOfOrganizations) && item.listOfOrganizations.length > 0) {
                    passCount = item.listOfOrganizations.length;
                } else if (item.delegationItems && item.delegationItems.length > 0) {
                    passCount = item.delegationItems.length;
                } else {
                    passCount = typeof item.totalPassports === 'number' ? item.totalPassports : parseInt(item.totalPassports, 10) || 0;
                }

                const borrowDateStr = this.formatDate(item.borrowDate);
                const returnDateStr = this.formatDate(item.returnDate);

                let days = item.borrowDays;
                if (days === null || days === undefined || isNaN(days)) {
                    const bDate = this.parseToDate(item.borrowDate);
                    const rDate = this.parseToDate(item.returnDate);
                    if (bDate && rDate) {
                        const diffMs = rDate.getTime() - bDate.getTime();
                        days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                    } else {
                        days = 0;
                    }
                }

                const cellA = sheet.getCell(`A${r}`);
                const cellB = sheet.getCell(`B${r}`);
                const cellC = sheet.getCell(`C${r}`);
                const cellD = sheet.getCell(`D${r}`);
                const cellE = sheet.getCell(`E${r}`);

                cellA.value = nameStr;
                cellB.value = passCount;
                cellC.value = borrowDateStr;
                cellD.value = returnDateStr;
                cellE.value = days;

                cellA.alignment = { vertical: 'middle', horizontal: 'left' };
                cellB.alignment = { vertical: 'middle', horizontal: 'right' };
                cellC.alignment = { vertical: 'middle', horizontal: 'center' };
                cellD.alignment = { vertical: 'middle', horizontal: 'center' };
                cellE.alignment = { vertical: 'middle', horizontal: 'right' };

                [cellA, cellB, cellC, cellD, cellE].forEach(cell => {
                    cell.font = { name: 'Arial', size: 10 };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: bgColor }
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'E0E0E0' } },
                        left: { style: 'thin', color: { argb: 'E0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
                        right: { style: 'thin', color: { argb: 'E0E0E0' } },
                    };
                });
            });

            const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
            return {
                buffer,
                filename: `Bao_cao_thong_ke_doan_ra.xlsx`,
            };
        } catch (error) {
            throw new BadRequestException(`Lỗi xuất Excel thống kê đoàn ra: ${error.message}`);
        }
    }

    /**
     * API Mới: Danh sách yêu cầu của tôi (là người mượn hoặc thành viên đoàn)
     * Thừa hưởng logic lọc linh hoạt từ findAllUser
     */
    async findAllMine(params: any, userId: string) {
        const start = Date.now();
        try {
            const { page = 1, limit = 20, sort, filter, ...rest } = params;
            const limitNum = Math.min(Number(limit), 100);
            const skip = (Number(page) - 1) * limitNum;

            // 1. Merge filters: filter object/string + direct query params
            let mergedFilter: any = {};
            if (filter) {
                if (typeof filter === 'string') {
                    try { mergedFilter = JSON.parse(filter); } catch (e) { /* ignore */ }
                } else if (typeof filter === 'object') {
                    mergedFilter = { ...filter };
                }
            }
            // Merge direct params if not already in mergedFilter
            Object.keys(rest).forEach(key => {
                if (rest[key] !== undefined && mergedFilter[key] === undefined) {
                    mergedFilter[key] = rest[key];
                }
            });

            const qb = this.requestRepo.createQueryBuilder('r')
                .where('r.is_deleted = :isDeleted', { isDeleted: false });

            // BIỆN PHÁP BẢO MẬT: Chỉ lấy bản ghi liên quan đến bản thân
            // Liên quan = (Người tạo OR Người mượn cá nhân OR Thành viên đoàn)
            qb.andWhere(new Brackets(inner => {
                inner.where('r.requester_id = :userId', { userId })
                    .orWhere('r.created_by = :userId', { userId })
                    .orWhere('r.name_passport_request = :userId', { userId })
                    .orWhere('r.id IN (SELECT di.request_id FROM passport_delegation_items di WHERE di.user_id = :userId)', { userId });
            }));

            // 3. Apply Filters (AND logic cho hầu hết các field, OR cho search)
            const filterFieldMap: Record<string, string> = {
                namePassportRequest: 'r.name_passport_request',
                passportNumber: 'r.passport_number',
                requestCode: 'r.request_code',
                typeRequest: 'r.type_request',
                status: 'r.status',
                borrowDate: 'r.borrow_date',
                returnDate: 'r.return_date',
                search: 'search_all', // special case
            };

            const exactMatchFields = new Set(['typeRequest', 'status', 'returnStatus']);
            const dateFields = new Set(['borrowDate', 'returnDate']);

            // Bỏ pre-query, sử dụng subquery trong apply filter bên dưới để tránh lỗi too many parameters

            let paramIdx = 0;
            for (const [key, value] of Object.entries(mergedFilter)) {
                if (!value || (!filterFieldMap[key] && !exactMatchFields.has(key) && !dateFields.has(key))) continue;

                if (key === 'search') {
                    const p = `search_${paramIdx++}`;
                    const collation = 'COLLATE SQL_Latin1_General_CP1_CI_AI';
                    qb.andWhere(
                        `(
                            r.request_code ${collation} LIKE :${p}
                            OR r.passport_number ${collation} LIKE :${p}
                            OR r.name_passport_request ${collation} LIKE :${p}
                            OR r.name_passport_request IN (
                                SELECT CAST(id AS nvarchar(100)) FROM users WITH (NOLOCK)
                                WHERE name ${collation} LIKE :${p}
                                   OR username ${collation} LIKE :${p}
                            )
                        )`,
                        { [p]: `%${value}%` }
                    );
                } else if (key === 'namePassportRequest' && typeof value === 'string') {
                    const p = `filter_${paramIdx++}`;
                    qb.andWhere(new Brackets(inner => {
                        inner.where('r.name_passport_request IN (SELECT id FROM users WHERE name COLLATE Vietnamese_CI_AI LIKE :' + p + ' OR username COLLATE Vietnamese_CI_AI LIKE :' + p + ')', { [p]: `%${value}%` })
                            .orWhere('r.name_passport_request COLLATE Vietnamese_CI_AI LIKE :' + p, { [p]: `%${value}%` });
                    }));
                } else if (exactMatchFields.has(key)) {
                    // Logic cũ cho returnStatus (expired, expiringSoon, valid)
                    if (key === 'returnStatus') {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (value === 'expired') qb.andWhere('r.return_date < :today', { today });
                        else if (value === 'expiringSoon') {
                            const soonDate = new Date(today); soonDate.setDate(soonDate.getDate() + 3);
                            qb.andWhere('r.return_date >= :today AND r.return_date <= :soonDate', { today, soonDate });
                        } else if (value === 'valid') {
                            const soonDate = new Date(today); soonDate.setDate(soonDate.getDate() + 3);
                            qb.andWhere('r.return_date > :soonDate', { soonDate });
                        }
                    } else {
                        const p = `filter_${paramIdx++}`;
                        qb.andWhere(`r.${key} = :${p}`, { [p]: value });
                    }
                } else if (dateFields.has(key)) {
                    // Xử lý object {startDate, endDate} hoặc string
                    if (typeof value === 'object') {
                        const { startDate, endDate } = value as any;
                        if (startDate) { const p = `d_${paramIdx++}`; qb.andWhere(`r.${key} >= :${p}`, { [p]: startDate }); }
                        if (endDate) { const p = `d_${paramIdx++}`; qb.andWhere(`r.${key} <= :${p}`, { [p]: endDate }); }
                    } else {
                        const p = `d_${paramIdx++}`;
                        qb.andWhere(`r.${key} = :${p}`, { [p]: value });
                    }
                } else if (filterFieldMap[key]) {
                    const p = `filter_${paramIdx++}`;
                    qb.andWhere(`${filterFieldMap[key]} COLLATE Vietnamese_CI_AI LIKE :${p}`, { [p]: `%${value}%` });
                }
            }

            // 4. Apply Sorting (dùng shared utility)
            const PASSPORT_SORT_FIELDS2 = [
                ...getDtoKeys(CreatePassportRequestDto),
                'createdAt', 'updatedAt'
            ];
            // Dùng fallback khi sort rỗng
            const effectiveSort = (sort && (typeof sort === 'string' ? sort.trim() !== '' : Object.keys(sort).length > 0)) ? sort : { createdAt: -1 };
            const sortResult2 = validateAndParseSortParam(effectiveSort, PASSPORT_SORT_FIELDS2);

            let isFirstSort = true;
            for (const [key, dir] of Object.entries(sortResult2)) {
                if (isFirstSort) {
                    qb.orderBy(`r.${key}`, dir);
                    isFirstSort = false;
                } else {
                    qb.addOrderBy(`r.${key}`, dir);
                }
            }

            // 5. Query and Map
            const [items, total] = await qb.skip(skip).take(limitNum).getManyAndCount();
            const { isExport } = params as any;
            const mappedItems = await this.mapRequestItems(items, userId, isExport === 'true');

            // Thêm thống kê trạng thái (chỉ tính trên các bản ghi mình có quyền xem)
            const countByStatus: Record<string, number> = {};
            const countQb = this.requestRepo.createQueryBuilder('r')
                .select('r.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .where('r.is_deleted = :isDeleted', { isDeleted: false });

            countQb.andWhere(new Brackets(inner => {
                inner.where('r.requester_id = :userId', { userId })
                    .orWhere('r.created_by = :userId', { userId })
                    .orWhere('r.name_passport_request = :userId', { userId })
                    .orWhere('r.id IN (SELECT di.request_id FROM passport_delegation_items di WHERE di.user_id = :userId)', { userId });
            }));

            const statusCounts = await countQb.groupBy('r.status').getRawMany();

            let totalAll = 0;
            statusCounts.forEach(s => {
                const c = parseInt(s.count, 10);
                countByStatus[s.status] = c;
                totalAll += c;
            });
            countByStatus['all'] = totalAll;

            return {
                statusCode: 200,
                data: mappedItems,
                total,
                page: +page,
                limit: +limitNum,
                totalPages: Math.ceil(total / limitNum),
                countByStatus
            };
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách yêu cầu của tôi: ${error.message}`);
        }
    }

    /**
     * 3. Xem chi tiết yêu cấu
     */
    async findOne(id: string, userId?: string) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
                // relations: ['delegationItems'],
            });

            if (!request) {
                throw new NotFoundException('Yêu cầu không tồn tại');
            }

            // Lấy thông tin các biên bản liên quan
            let handoverVoucherId: string | null = null;
            let returnVoucherId: string | null = null;
            let hasHandoverVoucher = false;
            let hasCompletedHandover = false;
            let hasReturnVoucher = false;
            let handoverVoucher: any = null;
            let returnVoucher: any = null;
            let returnHistory: any[] = [];
            let latestReturnVoucher: any = null;
            let hasPendingReturnVoucher = false;
            let hasUnsignedVoucher = false;

            const voucherItems = await this.voucherItemRepo.find({
                where: { requestId: id },
                relations: ['voucher'],
                order: {
                    voucher: {
                        createdAt: 'ASC'
                    }
                }
            });

            // Lấy danh sách đoàn ra và trạng thái hộ chiếu hiện tại
            const delegationItems = await this.delegationRepo.find({
                where: { requestId: id },
            });
            const passportIds = delegationItems.map(i => i.passportId).filter(pid => !!pid);
            if (request.passportId) passportIds.push(request.passportId);

            const passports = passportIds.length > 0
                ? await this.passportRepo.find({ where: { id: In(passportIds) } })
                : [];
            const passportMap = new Map(passports.map(p => [p.id, p]));

            // Tính tổng số HC
            let totalPassports = 0;
            if (request.typeRequest === 'user') {
                totalPassports = request.passportId ? 1 : 0;
            } else {
                totalPassports = (delegationItems || []).filter((m: any) => m.passportNumber).length;
            }

            // Tính toán tổng số lượng đã bàn giao vs đã hoàn trả
            let totalHandedOverCount = 0;
            let totalReturnedCount = 0;

            voucherItems.forEach((vi) => {
                const v = vi.voucher;
                if (!v) return;

                if (v.status !== 'COMPLETED' && v.status !== 'SIGN_VOUCHER') {
                    hasUnsignedVoucher = true;
                }

                if (v.voucherType === 'HANDOVER') {
                    handoverVoucherId = v.id;
                    handoverVoucher = v;
                    hasHandoverVoucher = true;
                    if (v.status === 'COMPLETED' || v.status === 'SIGN_VOUCHER') {
                        hasCompletedHandover = true;
                        totalHandedOverCount++;
                    }
                }

                if (v.voucherType === 'RETURN') {
                    hasReturnVoucher = true;
                    returnVoucherId = v.id;
                    returnVoucher = v;

                    if (v.status !== 'COMPLETED' && v.status !== 'SIGN_VOUCHER' && v.status !== 'REJECTED' && v.status !== 'CANCELLED' && v.status !== 'REJECT_VOUCHER') {
                        hasPendingReturnVoucher = true;
                    }
                    if (v.status === 'COMPLETED' || v.status === 'SIGN_VOUCHER') {
                        totalReturnedCount++;
                    }
                    // Tập hợp lịch sử hoàn trả
                    const existingHistory = returnHistory.find(h => h.id === v.id);
                    if (!existingHistory) {
                        returnHistory.push({
                            id: v.id,
                            voucherCode: v.voucherCode,
                            createdAt: v.createdAt,
                            performerName: v.performerName,
                            receiverName: v.receiverName,
                            performerSignature: v.performerSignature,
                            receiverSignature: v.receiverSignature,
                            status: v.status,
                            note: v.note,
                            itemCount: 1, // Bắt đầu từ 1
                        });
                    } else {
                        existingHistory.itemCount += 1;
                    }

                    // Tìm biên bản hoàn trả mới nhất để hiển thị header
                    if (!latestReturnVoucher || v.createdAt > latestReturnVoucher.createdAt) {
                        latestReturnVoucher = v;
                    }
                }
            });

            // Định dạng tiêu đề hiển thị và sắp xếp lịch sử theo thời gian giảm dần
            returnHistory = returnHistory.map(h => {
                const isSigned = h.performerSignature && h.receiverSignature;
                let signStatus = '';
                let signStatusIcon = '';

                if (!isSigned) {
                    signStatus = 'Chờ kí';
                    signStatusIcon = '⌛';
                } else {
                    if (totalReturnedCount === totalPassports) {
                        signStatus = 'Đã ký đủ';
                        signStatusIcon = '☑';
                    } else {
                        signStatus = 'Đã ký - chưa hoàn tất';
                        signStatusIcon = '⌛';
                    }
                }

                return {
                    ...h,
                    title: `Nhận ${h.itemCount}/${totalPassports} hộ chiếu`,
                    createdAtFormat: this.formatDate(h.createdAt),
                    totalItem: totalPassports,
                    signStatus,
                    signStatusIcon,
                };
            }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            const [
                passportDetail,
                requester,
                leaderInfo,
                borrowerNameMap,
                delegationLeaderInfo,
            ] = await Promise.all([
                request.passportId
                    ? this.passportRepo.findOne({ where: { id: request.passportId } })
                    : Promise.resolve(null),
                request.requesterId
                    ? this.userRepo.findOne({
                        where: { id: request.requesterId },
                        relations: ['parent'],
                    })
                    : Promise.resolve(null),
                request.leader
                    ? this.userRepo.findOne({
                        where: { id: request.leader },
                        select: ['id', 'username', 'name'],
                    })
                    : Promise.resolve(null),
                request.namePassportRequest
                    ? this.buildBorrowerNameMap([request.namePassportRequest])
                    : Promise.resolve({} as Record<string, string>),
                request.delegationLeader
                    ? this.userRepo.findOne({
                        where: { id: request.delegationLeader },
                        select: ['id', 'username', 'name'],
                    })
                    : Promise.resolve(null),
            ]);

            const requesterInfo = requester
                ? {
                    id: requester.id,
                    username: requester.username,
                    name: requester.name,
                    organizationName: requester.organizationName || (requester.parent as any)?.name || null,
                    position: requester.position || (requester.parent as any)?.position || null,
                }
                : null;

            const namePassportRequestInfo = request.namePassportRequest
                ? {
                    id: request.namePassportRequest,
                    nameVn: borrowerNameMap[request.namePassportRequest] || request.namePassportRequest,
                }
                : null;

            const leaderMapped = request.leader
                ? {
                    id: request.leader,
                    nameVn: leaderInfo?.name || leaderInfo?.username || request.leader,
                }
                : null;

            const delegationLeaderName =
                delegationLeaderInfo?.name ||
                delegationLeaderInfo?.username ||
                request.delegationLeader;

            const delegationLeaderMapped = request.delegationLeader
                ? {
                    id: request.delegationLeader,
                    name: delegationLeaderName,
                    nameVn: delegationLeaderName,
                }
                : null;


            const passportNumberMapped = request.passportNumber
                ? {
                    id: request.passportId,
                    passportNumber: request.passportNumber,
                    passportType: request.passportType,
                    fullName: passportDetail?.fullName || null,
                }
                : null;

            // Tổng số HC đã được tính ở trên

            // Tính số ngày mượn
            let borrowDays: number | null = null;
            if (request.borrowDate && request.returnDate) {
                const diff = new Date(request.returnDate).getTime() - new Date(request.borrowDate).getTime();
                borrowDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
            }

            // Đã có PASSPORT_TYPE_MAP toàn cục



            // ===== Compute available actions (BPMN) =====
            const availableActions: any[] = [];
            // totalHandedOverCount và totalReturnedCount đã được tính ở trên

            const allPassportsReturned = totalHandedOverCount > 0 && totalReturnedCount >= totalHandedOverCount;
            const isRequester = request.requesterId === userId || request.createdBy === userId;

            // Fetch open workitems and roles upfront for flag calculation
            const openWorkItems = userId ? await this.workItemRepo.find({
                where: { documentId: id, state: 'open' },
            }) : [];

            const userRoles: string[] = [];
            if (userId) {
                const user = await this.userRepo.findOne({ where: { id: userId } });
                if (user && user.rolesByProcess) {
                    user.rolesByProcess.forEach((rbp: any) => {
                        if (rbp.processKey === 'PassportRequest' || rbp.processKey === 'QT_MTHC') {
                            (rbp.roles || []).forEach((r: any) => {
                                if (r.roleCode) userRoles.push(r.roleCode);
                            });
                        }
                    });
                }
            }
            const userGroupIds = userId ? await this.getUserGroupIds(userId) : [];

            const isOpenActive = !!(userId && openWorkItems.some(wi =>
                wi.assigneeUserId === userId ||
                (wi.assigneeUserId && userGroupIds.includes(wi.assigneeUserId)) ||
                (!wi.assigneeUserId && wi.role && userRoles.includes(wi.role))
            ));

            let flags: any = {
                // canViewMinutes: true,
                canViewMinutes: voucherItems.length > 0,
                canCreateHandoverVoucher: isOpenActive && (request.status === 'WAIT_SIGN') && !hasHandoverVoucher,
                canCreateReturnVoucher: isRequester && hasCompletedHandover && !allPassportsReturned && !hasPendingReturnVoucher,
                totalHandedOverCount,
                totalReturnedCount,
            };
            const perItems: any[] = [];

            if (userId) {
                try {
                    if (openWorkItems.length > 0) {
                        const bpmnVersion = openWorkItems[0].bpmnVersion;
                        const bpmnXML = bpmnVersion ? await this.sqlRepo.getBpmnFile(bpmnVersion) : null;

                        if (bpmnXML) {
                            const { process, indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
                            const audit = await this.auditRepo.find({
                                where: { documentId: id },
                                order: { createdAt: 'DESC' },
                            });

                            for (const wi of openWorkItems) {
                                const res = await this.bpmnEngine.computeAvailableActions({
                                    process,
                                    indexes,
                                    currentNodeId: wi.nodeId || '',
                                    workItem: wi as any,
                                    document: request,
                                    userId,
                                    userRoles,
                                    userGroupIds,
                                    getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
                                    audit: audit as any[],
                                });

                                perItems.push({
                                    workItem: {
                                        id: wi.id,
                                        nodeId: wi.nodeId,
                                        role: wi.role,
                                        assigneeUserId: wi.assigneeUserId,
                                        state: wi.state,
                                    },
                                    availableActions: res.availableActions,
                                    flags: res.flags,
                                });

                                // Merge available actions and flags
                                res.availableActions.forEach((act: any) => {
                                    if (!availableActions.find((a) => a.code === act.code)) {
                                        availableActions.push(act);
                                    }
                                });
                                flags = { ...flags, ...res.flags };
                            }
                        }
                    }
                } catch (bpmnError) {
                    console.error('[BPMN] Error computing actions:', bpmnError.message);
                }

                // Luôn cập nhật cờ Update/Delete dựa trên trạng thái REJECT
                flags.canUpdateRequestPassport = (request.status === 'REJECTED' || request.status === 'PENDING') && (request.requesterId === userId || request.createdBy === userId);
                flags.canDestroyRequestPassport = (request.status === 'WAIT_APPROVE' || request.status === 'PENDING') && (request.requesterId === userId || request.createdBy === userId);
                flags.canUpdateResultTrip = (request.status === 'IN_USE') && (request.requesterId === userId || request.createdBy === userId);
            }

            let totalPassportDisplay = String(totalPassports);
            if (hasUnsignedVoucher)
                totalPassportDisplay += ` ${UNSIGNED_VOUCHER_SVG}`;
            if (request.status === 'WAIT_SIGN' && !hasHandoverVoucher) {
                totalPassportDisplay += ` ${NO_HANDOVER_VOUCHER_SVG}`;
            }
            let typeOfFundingMap: any = null;
            if (request.typeOfFunding) {
                const dataCrm =
                    await this.crmSourcesService.findByCode('typeOfFunding');
                const mapItem = dataCrm?.items?.find(
                    (i: any) => i.value === request.typeOfFunding,
                );
                typeOfFundingMap = mapItem ? mapItem : { value: request.typeOfFunding, title: request.typeOfFunding };
            }

            // Lấy ppResultTripFile cho chi tiết
            const ppResultTripFilesMap = await this.filesService.getLatestFilesByObjectIds('ppResultTripFile', [id]);
            const ppResultTripFile = ppResultTripFilesMap[id] || [];

            return {
                statusCode: 200,
                data: {
                    ...request,
                    statusName: STATUS_MAP[request.status] || request.status,
                    statusHtml: STATUS_HTML_MAP[request.status] || STATUS_MAP[request.status] || request.status,
                    typeOfFunding: typeOfFundingMap,
                    ppResultTripFile,
                    handoverVoucherId,
                    returnVoucherId,
                    returnHistory:
                        allPassportsReturned && returnHistory.length === 1
                            ? []
                            : returnHistory,
                    latestReturnInfo: {
                        lastReturnTime: latestReturnVoucher?.createdAt || null,
                        lastReturnTimeFormat: latestReturnVoucher ? this.formatDate(latestReturnVoucher.createdAt) : '--',
                        performerName: latestReturnVoucher?.performerName || '--',
                        receiverName: latestReturnVoucher?.receiverName || '--',
                        status: latestReturnVoucher?.status || '--',
                        voucherCode: latestReturnVoucher?.voucherCode || '--',
                        isFullyReturned: allPassportsReturned,
                        returnedCount: totalReturnedCount,
                        totalCount: totalPassports,
                        signStatus: (() => {
                            if (!latestReturnVoucher) return '--';
                            const isSigned = latestReturnVoucher.performerSignature && latestReturnVoucher.receiverSignature;
                            if (!isSigned) return 'Chờ kí';
                            return totalReturnedCount === totalPassports ? 'Đã ký đủ' : 'Đã ký - chưa hoàn tất';
                        })(),
                        signStatusIcon: (() => {
                            if (!latestReturnVoucher) return '';
                            const isSigned = latestReturnVoucher.performerSignature && latestReturnVoucher.receiverSignature;
                            if (!isSigned) return '⌛';
                            return totalReturnedCount === totalPassports ? '☑' : '⌛';
                        })(),
                    },
                    typeRequest: {
                        value: request.typeRequest,
                        title: request.typeRequest === 'user' ? 'Cá nhân' : 'Đoàn ra',
                    },
                    status: {
                        value: request.status,
                        title:
                            STATUS_HTML_MAP[request.status] ||
                            STATUS_MAP[request.status] ||
                            request.status,
                    },
                    namePassportRequest: namePassportRequestInfo,
                    leader: leaderMapped,
                    passportNumber: passportNumberMapped,
                    passportType: request.passportType
                        ? {
                            value: request.passportType,
                            title:
                                PASSPORT_TYPE_MAP[request.passportType] ||
                                request.passportType,
                        }
                        : null,
                    delegationItems: (delegationItems || []).map((item) => {
                        const p = item.passportId
                            ? passportMap.get(item.passportId)
                            : null;
                        return {
                            ...item,
                            passportType: item.passportType
                                ? {
                                    value: item.passportType,
                                    title:
                                        PASSPORT_TYPE_MAP[item.passportType] ||
                                        item.passportType,
                                }
                                : null,
                            usageStatus: p?.usageStatus || 'IN_USE', // Trạng thái hiện tại của HC
                        };
                    }),
                    destination: this.resolveDestinationList(request.destination, request.destinationOther),
                    destinationOther: request.destinationOther || null,
                    delegationLeader: delegationLeaderMapped,
                    passportDetail,
                    requesterInfo,
                    leaderInfo,
                    totalPassports: totalPassportDisplay,
                    borrowDays,
                    handoverVoucher,
                    returnVoucher: returnVoucher ? {
                        ...returnVoucher,
                        signStatus: (() => {
                            const isSigned = returnVoucher.performerSignature && returnVoucher.receiverSignature;
                            if (!isSigned) return 'Chờ ký';
                            return totalReturnedCount === totalPassports ? 'Đã ký đủ' : 'Đã ký - chưa hoàn tất';
                        })(),
                        signStatusIcon: (() => {
                            const isSigned = returnVoucher.performerSignature && returnVoucher.receiverSignature;
                            if (!isSigned) return '⌛';
                            return totalReturnedCount === totalPassports ? '☑' : '⌛';
                        })(),
                        signStatusColor: (() => {
                            const isSigned = returnVoucher.performerSignature && returnVoucher.receiverSignature;
                            if (!isSigned) return '#F59E0B';
                            return totalReturnedCount === totalPassports ? '#0D6EFD' : '#F59E0B';
                        })(),
                    } : {
                        signStatus: '--',
                        signStatusIcon: '',
                        signStatusColor: '',
                    },
                    availableActions,
                    flags,
                    perItems,
                },
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new BadRequestException(`Lỗi xem chi tiết: ${error.message}`);
        }
    }

    /**
     * 4. Chỉnh sửa yêu cầu (chỉ khi Chờ phê duyệt)
     */
    async update(id: string, updateDto: UpdatePassportRequestDto, userId: string, ipAddress: string) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
            });

            if (!request) {
                throw new NotFoundException('Yêu cầu không tồn tại');
            }

            // Tự động tính toán lại ngày mượn/trả nếu có thay đổi về lịch trình hoặc yêu cầu tính lại
            let borrowDateVal = updateDto.borrowDate || request.borrowDate?.toString();
            let returnDateVal = updateDto.returnDate || request.returnDate?.toString();

            const isSpecificDep = updateDto.isSpecificDepartureDate !== undefined ? updateDto.isSpecificDepartureDate : request.isSpecificDepartureDate;
            const depDateRaw = updateDto.departureDate !== undefined ? updateDto.departureDate : request.departureDate;
            const arrDateRaw = updateDto.arrivalDate !== undefined ? updateDto.arrivalDate : request.arrivalDate;

            if (isSpecificDep && depDateRaw && arrDateRaw) {
                const dep = new Date(depDateRaw);
                const arr = new Date(arrDateRaw);

                // Ngày dự kiến mượn = Ngày đi - 5 ngày
                const bDate = new Date(dep);
                bDate.setDate(bDate.getDate() - 5);
                borrowDateVal = bDate.toISOString().split('T')[0];

                // Ngày dự kiến trả = Ngày về + 5 ngày
                const rDate = new Date(arr);
                rDate.setDate(rDate.getDate() + 5);
                returnDateVal = rDate.toISOString().split('T')[0];

                // Cập nhật lại vào updateDto
                updateDto.borrowDate = borrowDateVal;
                updateDto.returnDate = returnDateVal;
            }

            // Validate ngày
            const finalDepDate = depDateRaw ? new Date(depDateRaw) : null;
            const isGroupRequest = request.typeRequest === 'organization' || request.typeRequest === 'organizational';
            const skipValidate = isGroupRequest && isSpecificDep && depDateRaw && arrDateRaw;

            if (!skipValidate) {
                this.validateDates(borrowDateVal!, returnDateVal, finalDepDate);
            }

            // Validate hộ chiếu nếu có thay đổi
            if (updateDto.passportId && updateDto.passportId !== request.passportId) {
                const passport = await this.validatePassport(
                    updateDto.passportId,
                    borrowDateVal!,
                    returnDateVal,
                    id,
                    request.typeRequest === 'user',
                );
                updateDto.passportNumber = passport.passportNumber;
                updateDto.passportType = passport.passportType;
            }

            // Validate đoàn ra nếu có thay đổi
            if (updateDto.listOfOrganizations && (request.typeRequest === 'organization' || request.typeRequest === 'organizational')) {
                const passportNumbers = new Set<string>();
                const userIds = new Set<string>();

                for (const member of updateDto.listOfOrganizations) {
                    const nameStr = member.fullName ? member.fullName.trim() : 'Không rõ tên';

                    // 1. Bắt buộc phải đi kèm số hộ chiếu
                    if (!member.passportNumber || !member.passportNumber.trim()) {
                        throw new BadRequestException(`Cán bộ "${nameStr}" bắt buộc phải đi kèm số hộ chiếu`);
                    }

                    const passportNum = member.passportNumber.trim().toUpperCase();

                    // 2. Mỗi người trong đoàn chỉ được xuất hiện 1 lần
                    if (passportNumbers.has(passportNum)) {
                        throw new BadRequestException(`Hộ chiếu số "${member.passportNumber}" bị lặp lại trong danh sách đoàn`);
                    }
                    passportNumbers.add(passportNum);

                    if (member.userId && member.userId.trim()) {
                        const uId = member.userId.trim();
                        if (userIds.has(uId)) {
                            throw new BadRequestException(`Cán bộ "${nameStr}" bị lặp lại nhiều lần trong danh sách đoàn`);
                        }
                        userIds.add(uId);
                    }

                    if (member.passportId) {
                        await this.validatePassport(
                            member.passportId,
                            borrowDateVal!,
                            returnDateVal,
                            id,
                            false,
                        );
                    }
                }
            }

            // Update fields
            const updateData: any = { updatedBy: userId };
            const allowedFields = [
                'namePassportRequest',
                'leader', 'passportId', 'passportNumber', 'passportType', 'reason',
                'borrowDate', 'returnDate',
                'delegationLeader', 'position', 'destination', 'destinationOther',
                'isSpecificDepartureDate', 'departureDate', 'arrivalDate',
                'partner', 'typeOfFunding', 'tripContent', 'decision', 'note',
                'receivedGifts', 'partnerGifts',
                'passportFile', 'listOfOrganizations',
            ];

            for (const field of allowedFields) {
                if (updateDto[field] !== undefined) {
                    if (['borrowDate', 'returnDate', 'departureDate', 'arrivalDate'].includes(field)) {
                        updateData[field] = updateDto[field] ? new Date(updateDto[field]) : null;
                    } else if (field === 'destination') {
                        if (Array.isArray(updateDto.destination)) {
                            updateData[field] = JSON.stringify(updateDto.destination);
                        } else {
                            updateData[field] = updateDto.destination;
                        }
                    } else {
                        updateData[field] = updateDto[field];
                    }
                }
            }

            await this.requestRepo.update(id, updateData);
            await this.bpmnEngine.invalidateDocCache(this.typeDocument, id);

            // === Xử lý nộp lại nếu đang ở trạng thái REJECTED ===
            if (request.status === 'REJECTED') {
                const refreshedRequest = await this.requestRepo.findOne({ where: { id } });

                await this.requestRepo.update(id, { status: 'PENDING' });
                await this.addHistory(id, 'UPDATE', userId, 'Người dùng đã cập nhật thông tin và nộp lại yêu cầu.');

                const user: any = await this.sqlsvRepo.getUserById(userId);
                // Đẩy quy trình BPMN đi tiếp từ node hiện tại
                // Không truyền refreshedRequest?.leader để đi lại theo luồng cho người tiếp theo (giống lúc tạo mới)
                await this.moveToNextNode(id, userId, user?.name || userId, 'SUBMIT', 'Gửi yêu cầu', undefined, 'WAIT_APPROVE');
            }

            // === Đồng bộ Danh sách đoàn ra ===
            if (updateDto.listOfOrganizations || updateDto.passportId || updateDto.passportNumber || updateDto.borrowDate || updateDto.returnDate) {
                // Xóa các item cũ
                await this.delegationRepo.delete({ requestId: id });

                const delegationItems: PassportDelegationItemEntity[] = [];

                // Case 1: Yêu cầu đoàn ra có danh sách mới
                if ((request.typeRequest === 'organization' || request.typeRequest === 'organizational') && updateDto.listOfOrganizations) {
                    for (const member of updateDto.listOfOrganizations) {
                        let memberPassportId = member.passportId || null;
                        let memberPassportType = member.passportType || null;

                        if (member.passportNumber && !memberPassportId) {
                            const memberPassport = await this.passportRepo.findOne({
                                where: { passportNumber: member.passportNumber, isDeleted: false },
                            });
                            if (memberPassport) {
                                memberPassportId = memberPassport.id;
                                memberPassportType = memberPassport.passportType;
                            }
                        }

                        delegationItems.push(this.delegationRepo.create({
                            id: uuidv4(),
                            requestId: id,
                            userId: member.userId ? String(member.userId) : null,
                            fullName: String(member.fullName),
                            passportId: memberPassportId ? String(memberPassportId) : null,
                            passportNumber: member.passportNumber ? String(member.passportNumber) : null,
                            passportType: memberPassportType ? String(memberPassportType) : null,
                            position: member.position ? String(member.position) : null,
                            rank: member.rank ? String(member.rank) : null,
                            unit: member.unit ? String(member.unit) : null,
                            cbType: member.cbType ? String(member.cbType) : null,
                            expiryDate: member.expiryDate ? new Date(member.expiryDate) : null,
                        }));
                    }
                }
                // Case 2: Yêu cầu cá nhân hoặc đoàn ra nhưng không gửi listOfOrganizations
                else {
                    const updatedRequest = await this.requestRepo.findOne({ where: { id } });
                    if (updatedRequest) {
                        if (updatedRequest.typeRequest === 'user' && updatedRequest.passportId) {
                            const user = await this.userRepo.findOne({ where: { id: updatedRequest.requesterId } });
                            const passport = updatedRequest.passportId
                                ? await this.passportRepo.findOne({ where: { id: updatedRequest.passportId, isDeleted: false } })
                                : null;
                            delegationItems.push(this.delegationRepo.create({
                                id: uuidv4(),
                                requestId: id,
                                userId: updatedRequest.requesterId,
                                fullName: user?.name || 'Cá nhân',
                                passportId: updatedRequest.passportId,
                                passportNumber: updatedRequest.passportNumber,
                                passportType: updatedRequest.passportType,
                                expiryDate: passport?.expiryDate || null,
                            }));
                        } else if ((updatedRequest.typeRequest === 'organization' || updatedRequest.typeRequest === 'organizational') && updatedRequest.listOfOrganizations) {
                            for (const member of updatedRequest.listOfOrganizations) {
                                delegationItems.push(this.delegationRepo.create({
                                    id: uuidv4(),
                                    requestId: id,
                                    userId: member.userId ? String(member.userId) : null,
                                    fullName: String(member.fullName),
                                    passportId: member.passportId ? String(member.passportId) : null,
                                    passportNumber: member.passportNumber ? String(member.passportNumber) : null,
                                    passportType: member.passportType ? String(member.passportType) : null,
                                    position: member.position ? String(member.position) : null,
                                    rank: member.rank ? String(member.rank) : null,
                                    unit: member.unit ? String(member.unit) : null,
                                    cbType: member.cbType ? String(member.cbType) : null,
                                    expiryDate: member.expiryDate ? new Date(member.expiryDate) : null,
                                }));
                            }
                        }
                    }
                }

                if (delegationItems.length > 0) {
                    await this.delegationRepo.save(delegationItems, { chunk: 100 });
                }
            }

            await this.systemLogService.createLogFromSystem({
                action: 'Cập nhật yêu cầu',
                details: `Cập nhật yêu cầu mượn hộ chiếu thành công: ${request.requestCode}`,
                method: 'PUT/PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'UPDATE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            return {
                statusCode: 200,
                message: 'Cập nhật yêu cầu thành công',
                data: { id },
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'Cập nhật yêu cầu',
                details: `Lỗi cập nhật yêu cầu mượn hộ chiếu: ${error.message}`,
                method: 'PUT/PATCH',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'UPDATE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi cập nhật: ${error.message}`);
        }
    }



    /**
     * 4.5 Lấy danh sách đoàn ra theo requestId
     */
    async getDelegationItems(requestId: string) {
        const items = await this.delegationRepo.find({
            where: { requestId },
            order: { createdAt: 'ASC' },
        });

        const stats = items.reduce(
            (acc, item) => {
                const type = item.passportType?.toUpperCase();
                if (type === 'DIPLOMATIC') acc.totalDiplomaticPassports += 1;
                if (type === 'OFFICIAL') acc.totalServicePassports += 1;
                if (type === 'ORDINARY') acc.totalOrdinaryPassports += 1;
                return acc;
            },
            {
                totalDiplomaticPassports: 0,
                totalServicePassports: 0,
                totalOrdinaryPassports: 0,
            },
        );

        return {
            statusCode: 200,
            ...stats,
            data: items.map(item => ({
                ...item,
                passportType: item.passportType
                    ? { value: item.passportType, title: PASSPORT_TYPE_MAP[item.passportType] || item.passportType }
                    : null,
            })),
        };
    }
    async cancel(id: string, cancelReason: string | undefined, userId: string, ipAddress: string) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
            });

            if (!request) {
                throw new NotFoundException('Yêu cầu không tồn tại');
            }

            // Chỉ người tạo yêu cầu mới được hủy
            if (request.requesterId !== userId) {
                throw new BadRequestException('Bạn không có quyền hủy yêu cầu này. Chỉ người tạo mới được hủy.');
            }

            if (request.status !== 'PENDING') {
                throw new BadRequestException('Chỉ được hủy yêu cầu ở trạng thái "Chờ phê duyệt"');
            }

            await this.requestRepo.update(id, {
                status: 'CANCELLED',
                updatedBy: userId,
            });

            await this.addHistory(id, 'Hủy yêu cầu', userId, cancelReason?.trim() || 'Đã hủy yêu cầu');
            await this.bpmnEngine.invalidateDocCache(this.typeDocument, id);

            await this.systemLogService.createLogFromSystem({
                action: 'Hủy yêu cầu',
                details: `Hủy yêu cầu mượn hộ chiếu thành công: ${request.requestCode}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'CANCEL',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            return {
                statusCode: 200,
                message: 'Hủy yêu cầu thành công',
                data: { id },
            };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'Hủy yêu cầu',
                details: `Lỗi hủy yêu cầu mượn hộ chiếu: ${error.message}`,
                method: 'PATCH',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'CANCEL',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi hủy yêu cầu: ${error.message}`);
        }
    }

    /**
     * 5b. Xóa mềm yêu cầu — hỗ trợ xóa 1 hoặc nhiều
     * Chỉ người tạo + chỉ khi CANCELLED/REJECTED/COMMANDER_REJECTED
     * @param ids - 1 ID hoặc mảng ID
     */
    async softDelete(ids: string | string[], userId: string, ipAddress: string) {
        const idArray = Array.isArray(ids) ? ids : [ids];

        if (!idArray.length) {
            throw new BadRequestException('Vui lòng cung cấp ít nhất 1 ID để xóa');
        }

        const deletableStatuses = ['CANCELLED', 'REJECTED', 'COMMANDER_REJECTED'];
        const results: { success: string[], failed: { id: string, reason: string }[] } = { success: [], failed: [] };

        for (const id of idArray) {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
            });

            if (!request) {
                results.failed.push({ id, reason: 'Yêu cầu không tồn tại hoặc đã bị xóa' });
                continue;
            }

            // Chỉ người tạo mới được xóa
            if (request.requesterId !== userId) {
                results.failed.push({ id, reason: 'Bạn không có quyền xóa yêu cầu này. Chỉ người tạo mới được xóa.' });
                continue;
            }

            // Chỉ xóa khi đã hủy hoặc bị từ chối
            if (!deletableStatuses.includes(request.status)) {
                results.failed.push({ id, reason: `Chỉ được xóa yêu cầu ở trạng thái "Đã hủy" hoặc "Từ chối". Hiện tại: ${STATUS_MAP[request.status] || request.status}` });
                continue;
            }

            await this.requestRepo.update(id, {
                isDeleted: true,
                updatedBy: userId,
            });

            results.success.push(id);
        }

        if (results.success.length === 0 && results.failed.length > 0) {
            const reasons = results.failed.map((f) => f.reason).join('; ');
            throw new BadRequestException({
                message: reasons,
                failed: results.failed,
            });
        }

        await this.systemLogService.createLogFromSystem({
            action: 'Xóa yêu cầu',
            details: `Xóa ${results.success.length} yêu cầu thành công. Thất bại: ${results.failed.length}`,
            method: 'DELETE',
            status: results.success.length > 0 ? 'SUCCESS' : 'FAILURE',
            type: 'PASSPORT_REQUESTS',
            subType: 'DELETE',
            userInfo: userId,
            ipAddress: ipAddress,
            timestamp: new Date().toISOString(),
        });

        if (results.failed.length > 0) {
            const reasons = results.failed.map((f) => f.reason).join('; ');
            await this.systemLogService.createLogFromSystem({
                action: 'Xóa yêu cầu',
                details: `Lỗi xóa một số yêu cầu: ${reasons}`,
                method: 'DELETE',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'DELETE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });
        }

        return {
            statusCode: 200,
            message: `Đã xóa ${results.success.length}/${idArray.length} yêu cầu thành công`,
            deleted: results.success,
            failed: results.failed,
        };
    }

    /**
     * 6. Danh sách yêu cầu chờ phê duyệt (dành cho Chỉ huy đơn vị)
     * Lấy từ audit: bản ghi audit mới nhất của document có action_code = 'WAIT_APPROVE' và receiver = userId
     */
    async findAllForApproval(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('PENDING', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách chờ phê duyệt: ${error.message}`);
        }
    }

    async countAllForApproval(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('PENDING', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng chờ phê duyệt: ${error.message}`);
        }
    }

    // =====================================================================
    // HELPER: Lấy documentIds từ audit (bản ghi mới nhất theo action_code)
    // =====================================================================
    private async buildAuditBasedDocumentIds(actionCodes: string | string[], receiverUserId: string): Promise<string[]> {
        const codes = Array.isArray(actionCodes) ? actionCodes : [actionCodes];
        const codesStr = codes.map(c => `'${c}'`).join(',');

        // Tối ưu: Lọc receiver ngay từ đầu và dùng top 1 partitioned
        const rows = await this.auditRepo.manager.query(
            `SELECT document_id
             FROM (
                 SELECT
                     document_id,
                     action_code,
                     ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY created_at DESC) AS rn
                 FROM audit
                 WHERE type_document = 'PassportRequest'
                   AND (receiver = @0 OR @0 IS NULL)
             ) ranked
             WHERE rn = 1
               AND action_code IN (${codesStr})`,
            [receiverUserId],
        );
        return rows.map((r: any) => String(r.document_id).trim()).filter((id: string) => id.length > 0);
    }
    private async buildAuditDocumentIds(actionCodes: string | string[], receiverUserId: string): Promise<string[]> {
        const codes = Array.isArray(actionCodes) ? actionCodes : [actionCodes];
        const codesStr = codes.map(c => `'${c}'`).join(',');

        // Tối ưu: Lọc receiver ngay từ đầu và dùng top 1 partitioned
        const rows = await this.auditRepo.manager.query(
            `SELECT document_id
                FROM (
                    SELECT
                        document_id,
                        action_code,
                        ROW_NUMBER() OVER (
                            PARTITION BY document_id
                            ORDER BY created_at DESC
                        ) AS rn
                    FROM audit
                    WHERE type_document = 'PassportRequest'
                    AND (receiver = @0 OR @0 IS NULL)
                    AND action_code IN (${codesStr})
                ) ranked
                WHERE rn = 1`,
            [receiverUserId],
        );
        return rows.map((r: any) => String(r.document_id).trim()).filter((id: string) => id.length > 0);
    }

    /**
     * Helper: Lấy IDs của tất cả bản ghi mà user đang là người nhận xử lý (mới nhất trong audit)
     */
    private async getAssignedDocumentIds(userId: string): Promise<string[]> {
        // 1. Lấy vai trò của user từ PassportRequest/QT_MTHC process
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const userRoles: string[] = [];
        if (user && user.rolesByProcess) {
            user.rolesByProcess.forEach((rbp: any) => {
                if (rbp.processKey === 'PassportRequest' || rbp.processKey === 'QT_MTHC') {
                    (rbp.roles || []).forEach((r: any) => {
                        if (r.roleCode) userRoles.push(r.roleCode);
                    });
                }
            });
        }

        // 2. Tìm các WorkItem đang mở gán trực tiếp cho User hoặc Vai trò của User
        const userGroupIds = await this.getUserGroupIds(userId);
        const qb = this.workItemRepo.createQueryBuilder('wi')
            .select('DISTINCT wi.documentId', 'documentId')
            .where('wi.state = :state', { state: 'open' });

        if (userRoles.length > 0) {
            if (userGroupIds.length > 0) {
                qb.andWhere('(wi.assigneeUserId = :userId OR wi.assigneeUserId IN (:...userGroupIds) OR (wi.assigneeUserId IS NULL AND wi.role IN (:...userRoles)))', { userId, userGroupIds, userRoles });
            } else {
                qb.andWhere('(wi.assigneeUserId = :userId OR (wi.assigneeUserId IS NULL AND wi.role IN (:...userRoles)))', { userId, userRoles });
            }
        } else {
            if (userGroupIds.length > 0) {
                qb.andWhere('(wi.assigneeUserId = :userId OR wi.assigneeUserId IN (:...userGroupIds))', { userId, userGroupIds });
            } else {
                qb.andWhere('wi.assigneeUserId = :userId', { userId });
            }
        }

        const rows = await qb.getRawMany();
        return rows.map(r => String(r.documentId).trim()).filter(id => id.length > 0);
    }

    private async getTouchedDocumentIds(userId: string): Promise<string[]> {
        const userGroupIds = await this.getUserGroupIds(userId);
        const groupFilter = userGroupIds.length > 0
            ? ` OR receiver IN (${userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')}) OR group_ IN (${userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')})`
            : '';
        const rows = await this.auditRepo.manager.query(
            `SELECT DISTINCT document_id FROM audit 
             WHERE type_document = 'PassportRequest' 
               AND (user_id = @0 OR receiver = @0${groupFilter})`,
            [userId]
        );
        return rows.map((r: any) => String(r.document_id).trim()).filter((id: string) => id.length > 0);
    }

    private async getUserGroupIds(userId: string): Promise<string[]> {
        if (!userId) return [];
        const rows = await this.userRepo.manager.query(
            `SELECT group_user_id FROM user_group_users WITH (NOLOCK) WHERE user_id = @0`,
            [userId],
        );
        return rows.map((r: any) => String(r.group_user_id || '').trim()).filter(Boolean);
    }

    private async mapRequestItems(items: PassportRequestEntity[], currentUserId?: string, isExport = false): Promise<any[]> {
        if (!items.length) return [];

        const tRolesStart = Date.now();
        // Fetch user roles once for flag calculation (chỉ select cột cần thiết)
        const userRoles: string[] = [];
        if (currentUserId) {
            const user = await this.userRepo.findOne({ where: { id: currentUserId }, select: ['id', 'rolesByProcess'] });
            if (user && user.rolesByProcess) {
                user.rolesByProcess.forEach((rbp: any) => {
                    if (rbp.processKey === 'PassportRequest' || rbp.processKey === 'QT_MTHC') {
                        (rbp.roles || []).forEach((r: any) => {
                            if (r.roleCode) userRoles.push(r.roleCode);
                        });
                    }
                });
            }
        }
        const userGroupIds = currentUserId ? await this.getUserGroupIds(currentUserId) : [];
        console.log(`🔍 [mapRequestItems Perf] Block 1 - User Roles & Groups: ${Date.now() - tRolesStart}ms`);

        const tUsersStart = Date.now();
        // ===== SONG SONG HÓA: Chạy đồng thời tất cả batch queries không phụ thuộc nhau =====
        const creatorIds = [...new Set(items.map((i) => i.createdBy).filter((id): id is string => !!id))];
        const borrowerIds = [...new Set(items.map((i) => i.namePassportRequest).filter((n): n is string => !!n))];
        const leaderIds = [
            ...new Set(
                items
                    .flatMap((i) => [i.leader, i.delegationLeader])
                    .filter((id): id is string => !!id),
            ),
        ];
        const requestIds = items.map((i) => i.id).filter((id): id is string => !!id);

        // Song song hóa: Chạy đồng thời creators, borrowers, leaders queries
        const [creatorMap, borrowerNameMap, leaderNameMap] = await Promise.all([
            // 1. Creators
            (async () => {
                const map: Record<string, string> = {};
                if (creatorIds.length > 0) {
                    for (let i = 0; i < creatorIds.length; i += 1000) {
                        const chunk = creatorIds.slice(i, i + 1000);
                        const creators = await this.userRepo.find({ where: { id: In(chunk) }, select: ['id', 'username', 'name'] });
                        creators.forEach((u) => { map[u.id] = u.name || u.username || u.id; });
                    }
                }
                return map;
            })(),
            // 2. Borrowers
            this.buildBorrowerNameMap(borrowerIds),
            // 3. Leaders
            (async () => {
                const map: Record<string, string> = {};
                if (leaderIds.length > 0) {
                    for (let i = 0; i < leaderIds.length; i += 1000) {
                        const chunk = leaderIds.slice(i, i + 1000);
                        const leaders = await this.userRepo.find({
                            where: { id: In(chunk) },
                            select: ['id', 'username', 'name'],
                        });
                        leaders.forEach((u) => {
                            map[u.id] = u.name || u.username || u.id;
                        });
                    }
                }
                return map;
            })(),
        ]);
        console.log(`🔍 [mapRequestItems Perf] Block 2 - Creators, Borrowers, Leaders Query: ${Date.now() - tUsersStart}ms`);

        const tBatchStart = Date.now();

        // Batch query: lấy chi tiết các biên bản liên quan (để phân loại HANDOVER/RETURN)
        const requestsWithCompletedHandover = new Set<string>();
        const requestsWithReturnVoucher = new Set<string>();
        const requestsWithAnyVoucher = new Set<string>();
        const requestsWithUnsignedVoucher = new Set<string>();
        const requestsWithPendingReturnVoucher = new Set<string>();
        const handoverCountMap: Record<string, number> = {};
        const returnCountMap: Record<string, number> = {};
        // Lưu ngày thực tế hoàn trả mới nhất của từng yêu cầu (tương đương returnVoucherData của FE)
        const returnVoucherDateMap: Record<string, Date> = {};

        // Chuẩn bị dữ liệu cho BPMN
        const workItemsMap: Record<string, WorkItemEntity[]> = {};
        const auditMap: Record<string, any[]> = {};
        const bpmnModelCache: Record<string, any> = {};

        // Batch fetch ppResultTripFile + audits + workItems + vouchers SONG SONG
        let ppResultTripFilesMap: Record<string, any> = {};

        if (requestIds.length > 0) {
            // Nếu isExport, chỉ cần lấy ppResultTripFile, bỏ qua audits/workItems/vouchers/BPMN
            if (isExport) {
                for (let i = 0; i < requestIds.length; i += 1000) {
                    const chunk = requestIds.slice(i, i + 1000);
                    const chunkMap = await this.filesService.getLatestFilesByObjectIds('ppResultTripFile', chunk);
                    ppResultTripFilesMap = { ...ppResultTripFilesMap, ...chunkMap };
                }
            } else {
                // Song song hóa: ppResultTripFile, audits, workItems, vouchers chạy đồng thời
                const [ppFilesResult, auditsResult, workItemsResult, voucherResult] = await Promise.all([
                    // ppResultTripFile — getLatestFilesByObjectIds đã tự handle chunk 1000 bên trong
                    (async () => {
                        const tSub = Date.now();
                        const res = await this.filesService.getLatestFilesByObjectIds('ppResultTripFile', requestIds);
                        console.log(`  ⏱️ [Block 3a] ppResultTripFile: ${Date.now() - tSub}ms`);
                        return res;
                    })(),
                    // Audits
                    (async () => {
                        const tSub = Date.now();
                        const map: Record<string, any[]> = {};
                        requestIds.forEach(id => { map[id] = []; });
                        for (let i = 0; i < requestIds.length; i += 1000) {
                            const chunk = requestIds.slice(i, i + 1000);
                            const allAudits = await this.auditRepo.find({
                                where: { documentId: In(chunk) },
                                order: { createdAt: 'DESC' },
                            });
                            allAudits.forEach(a => {
                                if (!a.documentId) return;
                                const docId = String(a.documentId).trim();
                                if (map[docId]) {
                                    map[docId].push(a);
                                }
                            });
                        }
                        console.log(`  ⏱️ [Block 3b] Audits: ${Date.now() - tSub}ms`);
                        return map;
                    })(),
                    // Work Items — raw SQL string concat (không giới hạn param như TypeORM In()),
                    //              gộp toàn bộ requestIds thành 1 query thay vì loop tuần tự
                    (async () => {
                        const tSub = Date.now();
                        const map: Record<string, any[]> = {};
                        if (requestIds.length > 0) {
                            const idList = requestIds.map(id => `'${id}'`).join(',');
                            const allWorkItems = await this.workItemRepo.manager.query(`
                                SELECT id, node_id AS nodeId, role, assignee_user_id AS assigneeUserId, node_type AS nodeType, state, bpmn_version AS bpmnVersion, document_id AS documentId
                                FROM work_items WITH (NOLOCK)
                                WHERE document_id IN (${idList})
                                  AND state = 'open'
                            `);
                            allWorkItems.forEach(wi => {
                                if (!wi.documentId) return;
                                const docId = String(wi.documentId).trim();
                                if (!map[docId]) map[docId] = [];
                                map[docId].push(wi);
                            });
                        }
                        console.log(`  ⏱️ [Block 3c] WorkItems: ${Date.now() - tSub}ms`);
                        return map;
                    })(),
                    // Vouchers
                    (async () => {
                        const tSub = Date.now();
                        const rows: any[] = [];
                        for (let i = 0; i < requestIds.length; i += 1000) {
                            const chunk = requestIds.slice(i, i + 1000);
                            const chunkVoucherRows = await this.voucherItemRepo
                                .createQueryBuilder('vi')
                                .innerJoin('vi.voucher', 'v')
                                .select('vi.request_id', 'requestId')
                                .addSelect('v.voucher_type', 'voucherType')
                                .addSelect('v.status', 'status')
                                .addSelect('v.created_at', 'createdAt')
                                .addSelect('v.performer_signed_at', 'performerSignedAt')
                                .addSelect('v.updated_at', 'updatedAt')
                                .where('vi.request_id IN (:...ids)', { ids: chunk })
                                .getRawMany();
                            rows.push(...chunkVoucherRows);
                        }
                        console.log(`  ⏱️ [Block 3d] Vouchers: ${Date.now() - tSub}ms`);
                        return rows;
                    })(),
                ]);

                ppResultTripFilesMap = ppFilesResult;
                Object.assign(auditMap, auditsResult);
                Object.assign(workItemsMap, workItemsResult);

                // Process voucher data
                voucherResult.forEach((r: any) => {
                    const rid = String(r.requestId).trim();
                    requestsWithAnyVoucher.add(rid);

                    if (!handoverCountMap[rid]) handoverCountMap[rid] = 0;
                    if (!returnCountMap[rid]) returnCountMap[rid] = 0;

                    if (r.voucherType === 'HANDOVER' && (r.status === 'COMPLETED' || r.status === 'SIGN_VOUCHER')) {
                        requestsWithCompletedHandover.add(rid);
                        handoverCountMap[rid]++;
                    }
                    if (r.voucherType === 'RETURN') {
                        requestsWithReturnVoucher.add(rid);
                        if (r.status === 'COMPLETED' || r.status === 'SIGN_VOUCHER') {
                            returnCountMap[rid]++;
                        }
                        if (r.status !== 'REJECTED' && r.status !== 'CANCELLED' && r.status !== 'REJECT_VOUCHER') {
                            if (r.status !== 'COMPLETED' && r.status !== 'SIGN_VOUCHER') {
                                requestsWithPendingReturnVoucher.add(rid);
                            }
                            const vDate = r.createdAt || r.performerSignedAt || r.updatedAt;
                            if (vDate) {
                                const newDate = new Date(vDate);
                                if (!returnVoucherDateMap[rid] || newDate > returnVoucherDateMap[rid]) {
                                    returnVoucherDateMap[rid] = newDate;
                                }
                            }
                        }
                    }
                    if (r.status !== 'COMPLETED' && r.status !== 'SIGN_VOUCHER') {
                        requestsWithUnsignedVoucher.add(rid);
                    }
                });

                // Tải trước BPMN Models
                const tBpmnStart = Date.now();
                const bpmnVersions = new Set<string>();
                Object.values(workItemsMap).forEach(wis => {
                    wis.forEach(wi => {
                        if (wi.bpmnVersion) bpmnVersions.add(wi.bpmnVersion);
                    });
                });

                for (const version of bpmnVersions) {
                    try {
                        const bpmnXML = await this.sqlRepo.getBpmnFile(version);
                        if (bpmnXML) {
                            bpmnModelCache[version] = await this.runtimeDbService.getModelFromXml(bpmnXML);
                        }
                    } catch (e) {
                        this.logger.error(`Error pre-loading BPMN version ${version}: ${e.message}`);
                    }
                }
                console.log(`🔍 [mapRequestItems Perf] Block 3.1 - Pre-load BPMN Models: ${Date.now() - tBpmnStart}ms`);
            }
        }
        console.log(`🔍 [mapRequestItems Perf] Block 3 - Batch DB queries (Files, Audits, WorkItems, Vouchers): ${Date.now() - tBatchStart}ms`);

        const tMapStart = Date.now();

        // Cache to avoid multiple redundant database calls for fetching users by role
        const rolesCache = new Map<string, any>();
        const cachedGetUsersByRole = async (role: string) => {
            if (rolesCache.has(role)) {
                return rolesCache.get(role);
            }
            const users = await this.sqlsvRepo.getUsersByRoleMongoDB(role);
            rolesCache.set(role, users);
            return users;
        };

        const results = await Promise.all(items.map(async (item) => {
            let totalPassports = 0;
            if (item.typeRequest === 'user') {
                totalPassports = item.passportId ? 1 : 0;
            } else {
                const members = item.listOfOrganizations || [];
                totalPassports = members.filter((m: any) => m.passportNumber).length;
            }
            let borrowDays: number | null = null;
            if (item.borrowDate && item.returnDate) {
                const diff = new Date(item.returnDate).getTime() - new Date(item.borrowDate).getTime();
                borrowDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
            }

            let totalPassportDisplay = String(totalPassports);
            if (!isExport) {
                if (requestsWithUnsignedVoucher.has(item.id)) totalPassportDisplay += ` ${UNSIGNED_VOUCHER_SVG}`;
                if ((item.status === 'WAIT_SIGN') && !requestsWithCompletedHandover.has(item.id)) {
                    totalPassportDisplay += ` ${NO_HANDOVER_VOUCHER_SVG}`;
                }
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let formattedReturnDate = this.formatDate(item.returnDate);
            if (item.returnDate) {
                const deadline = new Date(item.returnDate);
                deadline.setHours(0, 0, 0, 0);

                // Cách tính diffDays theo đúng logic FE:
                // returnVoucherDate = returnVoucherData?.createdAt || performerSignedAt || updatedAt
                // diffDays = actualReturn.startOf('day').diff(deadline.startOf('day'), 'day')
                // = (actualReturn - deadline) tính theo ngày, dương = quá hạn
                const returnVoucherDate = returnVoucherDateMap[item.id];
                let diffDays = 0;
                if (returnVoucherDate) {
                    const actualReturn = new Date(returnVoucherDate);
                    actualReturn.setHours(0, 0, 0, 0);
                    diffDays = Math.floor((actualReturn.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                } else {
                    diffDays = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                }

                if (!isExport && diffDays > 0) {
                    // Quá hạn - Đỏ (giống FE: isColor=true → #d32f2f)
                    formattedReturnDate = `<span style="color: #d32f2f;">${formattedReturnDate}</span>`;
                } else if (!isExport && !returnVoucherDate && item.status === 'IN_USE' && diffDays >= -2) {
                    // Sắp hết hạn (trong 2 ngày tới, chưa hoàn trả, đang sử dụng) - Cam
                    formattedReturnDate = `<span style="color: #FFA600;">${formattedReturnDate}</span>`;
                } else if (!isExport) {
                    // Mặc định - Đen
                    formattedReturnDate = `<span style="color: #000000;">${formattedReturnDate}</span>`;
                }
            } else if (!isExport) {
                formattedReturnDate = `<span style="color: #000000;">${formattedReturnDate}</span>`;
            }

            let formattedBorrowDate = this.formatDate(item.borrowDate);
            if (!isExport && formattedBorrowDate) {
                formattedBorrowDate = `<span style="color: #000000;">${formattedBorrowDate}</span>`;
            }

            const ppResultTripFile = ppResultTripFilesMap[item.id] || [];

            const baseItem = {
                ...item,
                typeRequest: item.typeRequest === 'user' ? 'Cá nhân' : 'Đoàn ra',
                typeRequestKey: item.typeRequest,
                status: isExport ? (STATUS_MAP[item.status] || item.status) : (STATUS_HTML_MAP[item.status] || STATUS_MAP[item.status] || item.status),
                namePassportRequest: item.namePassportRequest ? (borrowerNameMap[item.namePassportRequest] || item.namePassportRequest) : null,
                destination: (() => {
                    const destList = this.resolveDestinationList(item.destination, item.destinationOther);
                    return destList.length > 0 ? destList.map(d => d.title).join(', ') : null;
                })(),
                destinationOther: item.destinationOther || null,
                totalPassports: totalPassportDisplay,
                borrowDays,
                borrowDate: formattedBorrowDate,
                returnDate: formattedReturnDate,
                createdBy: item.createdBy ? (creatorMap[item.createdBy] || item.createdBy) : null,
                leader: item.leader ? (leaderNameMap[item.leader] || item.leader) : null,
                delegationLeader: item.delegationLeader ? (leaderNameMap[item.delegationLeader] || item.delegationLeader) : null,
                leaderName: item.leader ? (leaderNameMap[item.leader] || item.leader) : null,
                delegationLeaderName: item.delegationLeader ? (leaderNameMap[item.delegationLeader] || item.delegationLeader) : null,
                ppResultTripFile,
            };

            // Nếu export, trả về baseItem ngay không cần tính BPMN flags
            if (isExport) {
                return baseItem;
            }

            const handedOverCount = handoverCountMap[item.id] || 0;
            const returnedCount = returnCountMap[item.id] || 0;
            const allPassportsReturned = handedOverCount > 0 && returnedCount >= handedOverCount;
            const isRequester = item.requesterId === currentUserId || item.createdBy === currentUserId;
            const isNotEdit = !(isRequester && item.status === 'PENDING');

            // === Tích hợp BPMN Flags & Actions ===
            const openWIs = workItemsMap[item.id] || [];
            const isOpenActive = !!(currentUserId && openWIs.some(wi =>
                wi.assigneeUserId === currentUserId ||
                (wi.assigneeUserId && userGroupIds.includes(wi.assigneeUserId)) ||
                (!wi.assigneeUserId && wi.role && userRoles.includes(wi.role))
            ));
            const availableActions: any[] = [];
            let flags: Record<string, boolean> = {
                canUpdateRequestPassport: (item.status === 'REJECTED' || item.status === 'PENDING') && (item.requesterId === currentUserId || item.createdBy === currentUserId),
                canDestroyRequestPassport: (item.status === 'WAIT_APPROVE' || item.status === 'PENDING') && (item.requesterId === currentUserId || item.createdBy === currentUserId),
                canViewMinutes: requestsWithAnyVoucher.has(item.id),
                canCreateHandoverVoucher: isOpenActive && (item.status === 'WAIT_SIGN') && !requestsWithCompletedHandover.has(item.id),
                canCreateReturnVoucher: isRequester && requestsWithCompletedHandover.has(item.id) && !allPassportsReturned && !requestsWithPendingReturnVoucher.has(item.id),
                canUpdateResultTrip: item.status === 'IN_USE' && isRequester,
            };

            if (currentUserId && openWIs.length > 0) {
                for (const wi of openWIs) {
                    try {
                        const model = bpmnModelCache[wi.bpmnVersion || ''];
                        if (model) {
                            const res = await this.bpmnEngine.computeAvailableActions({
                                process: model.process,
                                indexes: model.indexes,
                                currentNodeId: wi.nodeId || '',
                                workItem: wi as any,
                                document: { ...item, typeDocument: 'PassportRequest' }, // Đảm bảo cache key đúng
                                userId: currentUserId,
                                userRoles,
                                userGroupIds,
                                getUsersByRole: cachedGetUsersByRole,
                                audit: auditMap[item.id] as any[],
                            });

                            res.availableActions.forEach((act: any) => {
                                if (!availableActions.find((a) => a.code === act.code)) {
                                    availableActions.push(act);
                                }
                            });
                            flags = { ...flags, ...res.flags };
                        }
                    } catch (e) {
                        this.logger.error(`Error mapping BPMN actions for ${item.id}: ${e.message}`);
                    }
                }
            }

            return {
                ...baseItem,
                isNotEdit,
                availableActions,
                flags,
            };
        }));
        console.log(`🔍 [mapRequestItems Perf] Block 4 - Array Mapping & BPMN Action Computation: ${Date.now() - tMapStart}ms`);
        return results;
    }

    // =====================================================================
    // HELPER: Áp dụng các filter chung vào QueryBuilder
    // Hỗ trợ 2 format:
    //   - Flat:   ?typeRequest=user&borrowDateFrom=2025-01-01
    //   - Object: ?filter[typeRequest]=user&filter[borrowDateFrom]=2025-01-01
    // =====================================================================
    private applyCommonFilters(qb: any, params: any) {
        // Merge filter object vào params (filter[] ưu tiên hơn nếu trùng key)
        const f = { ...params, ...(params.filter || {}) } as any;
        const { search, typeRequest, sort, borrowDateFrom, borrowDateTo, returnDateFrom, returnDateTo,
            namePassportRequest, createdBy, returnStatus } = f;

        if (typeRequest && typeRequest !== 'all') {
            qb.andWhere('r.type_request = :typeRequest', { typeRequest });
        }

        // Filter theo tình trạng hạn trả
        if (returnStatus) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (returnStatus === 'expired') {
                // Quá hạn: return_date < hôm nay
                qb.andWhere('r.return_date < :today', { today });
            } else if (returnStatus === 'expiringSoon') {
                // Sắp hết hạn: hôm nay <= return_date <= hôm nay + 3 ngày
                const soonDate = new Date(today);
                soonDate.setDate(soonDate.getDate() + 3);
                qb.andWhere('r.return_date >= :today AND r.return_date <= :soonDate', { today, soonDate });
            } else if (returnStatus === 'valid') {
                // Còn hạn: return_date > hôm nay + 3 ngày
                const soonDate = new Date(today);
                soonDate.setDate(soonDate.getDate() + 3);
                qb.andWhere('r.return_date > :soonDate', { soonDate });
            }
        }

        // Filter theo tên người mượn hộ chiếu:
        //   - Đoàn ra (organization): name_passport_request lưu text trực tiếp → LIKE thẳng
        //   - Cá nhân (user): name_passport_request lưu userId → tra qua bảng users
        if (namePassportRequest) {
            qb.andWhere(
                `(
                    r.name_passport_request COLLATE Vietnamese_CI_AI LIKE :namePassportRequestFilter
                    OR r.name_passport_request IN (
                        SELECT id FROM users
                        WHERE name COLLATE Vietnamese_CI_AI LIKE :namePassportRequestFilter
                           OR username COLLATE Vietnamese_CI_AI LIKE :namePassportRequestFilter
                    )
                )`,
                { namePassportRequestFilter: `%${namePassportRequest}%` },
            );
        }

        // Filter theo tên người tạo (createdBy lưu userId → tìm qua bảng users theo name)
        // if (createdBy) {
        //     qb.andWhere(
        //         `r.created_by IN (
        //             SELECT id FROM users
        //             WHERE name COLLATE Vietnamese_CI_AI LIKE :createdByFilter
        //                OR username COLLATE Vietnamese_CI_AI LIKE :createdByFilter
        //         )`,
        //         { createdByFilter: `%${createdBy}%` },
        //     );
        // }

        // Tìm kiếm OR toàn bộ các cột text
        if (search) {
            qb.andWhere(
                `(
                    r.request_code             COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.name_passport_request    COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.passport_number          COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.reason                   COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.destination              COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.destination_other        COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.delegation_leader        COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.partner                  COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.trip_content             COLLATE Vietnamese_CI_AI LIKE :search OR
                    r.decision                 COLLATE Vietnamese_CI_AI LIKE :search
                )`,
                { search: `%${search}%` },
            );
        }

        // Khoảng ngày mượn
        if (borrowDateFrom) {
            qb.andWhere('r.borrow_date >= :borrowDateFrom', { borrowDateFrom: new Date(borrowDateFrom) });
        }
        if (borrowDateTo) {
            const toDate = new Date(borrowDateTo);
            toDate.setDate(toDate.getDate() + 1);
            qb.andWhere('r.borrow_date < :borrowDateTo', { borrowDateTo: toDate });
        }

        // Khoảng ngày trả
        if (returnDateFrom) {
            qb.andWhere('r.return_date >= :returnDateFrom', { returnDateFrom: new Date(returnDateFrom) });
        }
        if (returnDateTo) {
            const toDate = new Date(returnDateTo);
            toDate.setDate(toDate.getDate() + 1);
            qb.andWhere('r.return_date < :returnDateTo', { returnDateTo: toDate });
        }

        // Sắp xếp
        const sortFieldMap: Record<string, string> = {
            typeRequest: 'r.type_request', namePassportRequest: 'r.name_passport_request',
            passportNumber: 'r.passport_number', borrowDate: 'r.borrow_date',
            returnDate: 'r.return_date', createdAt: 'r.created_at',
            requestCode: 'r.request_code', status: 'r.status',
        };
        let hasSortApplied = false;
        if (sort && typeof sort === 'object') {
            for (const [key, dirValue] of Object.entries(sort)) {
                const col = sortFieldMap[key];
                if (!col) continue;
                const dir = (dirValue === 1 || dirValue === '1' || dirValue === 'ASC' || dirValue === 'asc') ? 'ASC' : 'DESC';
                if (!hasSortApplied) { qb.orderBy(col, dir); hasSortApplied = true; }
                else { qb.addOrderBy(col, dir); }
            }
        }
        if (!hasSortApplied) qb.orderBy('r.created_at', 'DESC');
        return qb;
    }

    // =====================================================================
    // HELPER: Build query theo documentIds
    // =====================================================================
    private buildQueryByIds(documentIds: string[], params: any) {
        const qb = this.requestRepo.createQueryBuilder('r')
            .where('r.id IN (:...ids)', { ids: documentIds })
            .andWhere('r.is_deleted = :isDeleted', { isDeleted: false });
        return this.applyCommonFilters(qb, params);
    }

    // =====================================================================
    // HELPER: Build query theo status (kết hợp requester và audit)
    // =====================================================================
    private async buildQueryByStatus(status: string | string[], params: any, userId: string) {
        const statusArr = Array.isArray(status) ? status : [status];

        const qb = this.requestRepo.createQueryBuilder('r')
            .setLock('dirty_read')
            .where('r.status IN (:...statuses)', { statuses: statusArr })
            .andWhere('r.is_deleted = :isDeleted', { isDeleted: false });

        await this.applyVisibilityCondition(qb, userId);

        return this.applyCommonFilters(qb, params);
    }

    /**
     * HELPER: Build query chỉ lấy bản ghi CỦA TÔI (người tạo hoặc người mượn)
     */
    private async buildQueryOnlyMyRecordsByStatus(status: string | string[], params: any, userId: string) {
        const statusArr = Array.isArray(status) ? status : [status];

        const qb = this.requestRepo.createQueryBuilder('r')
            .setLock('dirty_read')
            .where('r.status IN (:...statuses)', { statuses: statusArr })
            .andWhere('r.is_deleted = :isDeleted', { isDeleted: false })
            .andWhere('(r.requester_id = :userId OR r.created_by = :userId)', { userId });

        return this.applyCommonFilters(qb, params);
    }

    // =====================================================================
    // HELPER: Đóng gói kết quả phân trang
    // =====================================================================
    private async paginateAndMap(qb: any, page: number, limit: number, currentUserId?: string, isExport = false) {
        const tCountStart = Date.now();

        // Thêm lock hint NOLOCK cho bảng chính nếu chưa có
        qb.setLock('dirty_read');

        // Nhân bản query builder để tránh xung đột ghi đè tham số khi chạy song song
        const countQb = qb.clone();

        const [items, total] = await Promise.all([
            qb.skip((page - 1) * limit).take(limit).getMany(),
            countQb.getCount()
        ]);
        console.log(`🔍 [WaitReceive Perf] Parallel DB Queries (retrieved ${items.length} items, total ${total}): ${Date.now() - tCountStart}ms`);

        const tMapStart = Date.now();
        const data = await this.mapRequestItems(items, currentUserId, isExport);
        console.log(`🔍 [WaitReceive Perf] mapRequestItems: ${Date.now() - tMapStart}ms`);

        return { statusCode: 200, data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Tab: Chờ chỉ huy VP - Các yêu cầu đã được Chỉ huy đơn vị duyệt, chờ tôi (Chỉ huy VP) chuyển xử lý
     */
    async findAllWaitCommander(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('WAIT_COMMANDER', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách chờ chỉ huy: ${error.message}`);
        }
    }

    async countPRWaitCommander(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('WAIT_COMMANDER', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng chờ chỉ huy: ${error.message}`);
        }
    }

    // async countPRAll(params: ListPassportRequestDto, userId: string): Promise<number> {
    //     try {
    //         const count = await this.sqlRepoCount.countPRAll({ userId });
    //         return count.total;
    //     } catch (error) {
    //         throw new BadRequestException(`Lỗi đếm tất cả yêu cầu: ${error.message}`);
    //     }
    // }

    /**
     * Tab: Chờ tiếp nhận - Bộ phận chuyên trách chờ tiếp nhận và bàn giao HC
     */
    async findAllWaitReceive(params: ListPassportRequestDto, userId: string) {
        try {
            const startTotal = Date.now();
            const { page = 1, limit = 20, isExport } = params as any;

            const tBuildStart = Date.now();
            const qb = await this.buildQueryByStatus(['WAIT_RECEIVE', 'WAIT_SIGN'], params, userId);
            console.log(`🔍 [WaitReceive Perf] buildQueryByStatus: ${Date.now() - tBuildStart}ms`);

            const result = await this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
            console.log(`🔍 [WaitReceive Perf] TOTAL wait-receive service execution: ${Date.now() - startTotal}ms`);
            return result;
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách chờ tiếp nhận: ${error.message}`);
        }
    }

    async countPRWaitReceive(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus(['WAIT_RECEIVE', 'WAIT_SIGN'], params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng chờ tiếp nhận: ${error.message}`);
        }
    }

    /**
     * Tab: Đang sử dụng
     * Lấy từ audit: bản ghi audit mới nhất có action_code = 'IN_USE' và receiver = userId
     */
    async findAllInUse(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('IN_USE', params, userId);
            const result = await this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
            return result;
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách đang sử dụng: ${error.message}`);
        }
    }

    async countPRInUse(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('IN_USE', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng đang sử dụng: ${error.message}`);
        }
    }
    async findAllCompleted(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('COMPLETED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách hoàn tất: ${error.message}`);
        }
    }

    // =====================================================================
    // MY MONITORING APIs (Chỉ lấy bản ghi của tôi)
    // =====================================================================

    async findMyMonitoringPending(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('PENDING', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách chờ phê duyệt: ${error.message}`); }
    }

    async findMyMonitoringWaitCommander(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('WAIT_COMMANDER', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách chờ chỉ huy: ${error.message}`); }
    }

    async findMyMonitoringWaitReceive(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus(['WAIT_RECEIVE', 'WAIT_SIGN'], params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách chờ tiếp nhận: ${error.message}`); }
    }

    async findMyMonitoringInUse(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('IN_USE', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách đang sử dụng: ${error.message}`); }
    }

    async findMyMonitoringCompleted(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('COMPLETED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách hoàn tất: ${error.message}`); }
    }

    async findMyMonitoringRejected(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('REJECTED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách từ chối: ${error.message}`); }
    }

    async findMyMonitoringCancelled(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryOnlyMyRecordsByStatus('CANCELLED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) { throw new BadRequestException(`Lỗi lấy danh sách đã hủy: ${error.message}`); }
    }

    // async countMyPassportAll(params: ListPassportRequestDto, userId: string): Promise<number> {
    //     try {
    //         const count = await this.sqlRepoCount.countMyPassportAll({ userId });
    //         return count.total;
    //     } catch (error) {
    //         throw new BadRequestException(`Lỗi đếm tất cả yêu cầu của tôi: ${error.message}`);
    //     }
    // }

    async countPRCompleted(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('COMPLETED', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng hoàn tất: ${error.message}`);
        }
    }

    /**
     * Tab: Hoàn tất
     */
    // async findAllCompleted(params: ListPassportRequestDto, userId: string) {
    //     try {
    //         const { page = 1, limit = 20 } = params as any;

    //         const qb = await this.buildQueryByStatus('COMPLETED', params, userId);
    //         return this.paginateAndMap(qb, +page, +limit, userId);
    //     } catch (error) {
    //         throw new BadRequestException(`Lỗi lấy danh sách hoàn tất: ${error.message}`);
    //     }
    // }

    /**
     * Tab: Từ chối
     */
    async findAllRejected(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('REJECTED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách từ chối: ${error.message}`);
        }
    }

    async countPRRejected(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('REJECTED', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng từ chối: ${error.message}`);
        }
    }

    /**
     * Tab: Đã hủy
     */
    async findAllCancelled(params: ListPassportRequestDto, userId: string) {
        try {
            const { page = 1, limit = 20, isExport } = params as any;
            const qb = await this.buildQueryByStatus('CANCELLED', params, userId);
            return this.paginateAndMap(qb, +page, +limit, userId, isExport === 'true');
        } catch (error) {
            throw new BadRequestException(`Lỗi lấy danh sách đã hủy: ${error.message}`);
        }
    }

    async countPRCancelled(params: ListPassportRequestDto, userId: string): Promise<number> {
        try {
            const qb = await this.buildQueryByStatus('CANCELLED', params, userId);
            return await qb.getCount();
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm số lượng đã hủy: ${error.message}`);
        }
    }

    async approve(id: string, userId: string, approvalReason: string, ipAddress: string) {
        console.time('approve-request-' + id);  // Bắt đầu đo thời gian, label có id để dễ trace nhiều request

        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');

            if (request.status !== 'PENDING') {
                throw new BadRequestException('Chỉ được phê duyệt yêu cầu ở trạng thái "Chờ phê duyệt"');
            }

            await this.requestRepo.update(id, {
                status: 'WAIT_COMMANDER',
                handlerId: userId,
                updatedBy: userId,
            });
            await this.addHistory(
                id,
                'APPROVE',
                userId,
                approvalReason?.trim() || 'Chỉ huy đơn vị đã phê duyệt yêu cầu'
            );
            // Gửi thông báo
            if (request.requesterId) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã được phê duyệt.`,
                    recipientId: request.requesterId,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_APPROVED.value,
                    recordId: request.id,
                });
            }

            // --- Gửi thông báo cho Chỉ huy văn phòng ---
            try {
                const officeLeaderRes = await this.getFlowUsers(userId, 'CHI_HUY_VP');
                if (officeLeaderRes && Array.isArray(officeLeaderRes.data)) {
                    for (const leader of officeLeaderRes.data) {
                        await this.notificationService.create({
                            content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã được phê duyệt, đề nghị chuyển xử lý.`,
                            recipientId: leader.id,
                            senderId: userId,
                            key: 'VIEW_REQUEST_LIST',
                            type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                            recordId: request.id,
                        });
                    }
                }
            } catch (err) {
                this.logger.error(`Lỗi gửi thông báo cho CH VP: ${err.message}`);
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            await this.moveToNextNode(id, userId, user?.name || userId, 'APPROVE', 'Phê duyệt');
            console.timeEnd('approve-request-' + id);  // Kết thúc đo, in ra console thời gian thực thi

            await this.systemLogService.createLogFromSystem({
                action: 'Phê duyệt',
                details: `Phê duyệt yêu cầu mượn hộ chiếu thành công: ${request.requestCode}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'APPROVE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            return {
                statusCode: 200,
                message: 'Phê duyệt yêu cầu thành công. Đã chuyển sang Chỉ huy VP.',
                data: { id, status: 'WAIT_COMMANDER' }
            };
        } catch (error) {
            // Luôn end timer ngay cả khi lỗi để không bị "treo"
            console.timeEnd('approve-request-' + id);

            await this.systemLogService.createLogFromSystem({
                action: 'Phê duyệt',
                details: `Lỗi phê duyệt yêu cầu mượn hộ chiếu: ${error.message}`,
                method: 'PATCH',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'APPROVE',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Lỗi phê duyệt yêu cầu: ${error.message}`);
        }
    }

    async reject(id: string, approvalReason: string | undefined, userId: string, ipAddress: string) {
        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');

            const rejectableStatuses = ['PENDING', 'WAIT_COMMANDER', 'WAIT_RECEIVE', 'WAIT_SIGN'];
            if (!rejectableStatuses.includes(request.status)) {
                throw new BadRequestException(`Không thể từ chối yêu cầu ở trạng thái "${STATUS_MAP[request.status] || request.status}"`);
            }

            await this.requestRepo.update(id, { status: 'REJECTED', handlerId: userId, updatedBy: userId });

            await this.addHistory(id, 'REJECT', userId, approvalReason?.trim() || 'Từ chối yêu cầu');

            // --- Gửi thông báo cho người tạo ---
            if (request.requesterId) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} bị từ chối.`,
                    recipientId: request.requesterId,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_REJECTED.value,
                    recordId: request.id,
                });
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            await this.moveToNextNode(id, userId, user?.name || userId, 'REJECT', 'Từ chối', request.requesterId ?? undefined);

            await this.systemLogService.createLogFromSystem({
                action: 'Từ chối',
                details: `Từ chối yêu cầu mượn hộ chiếu thành công: ${request.requestCode}`,
                method: 'PATCH',
                status: 'SUCCESS',
                type: 'PASSPORT_REQUESTS',
                subType: 'REJECT',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });

            return { statusCode: 200, message: 'Từ chối yêu cầu thành công', data: { id, status: 'REJECTED' } };
        } catch (error) {
            await this.systemLogService.createLogFromSystem({
                action: 'Từ chối',
                details: `Lỗi từ chối yêu cầu mượn hộ chiếu: ${error.message}`,
                method: 'PATCH',
                status: 'FAILURE',
                type: 'PASSPORT_REQUESTS',
                subType: 'REJECT',
                userInfo: userId,
                ipAddress: ipAddress,
                timestamp: new Date().toISOString(),
            });
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi từ chối yêu cầu: ${error.message}`);
        }
    }

    /**
     * Chỉ huy chuyển xử lý → Bộ phận chuyên trách
     * WAIT_COMMANDER → WAIT_RECEIVE, audit: CHUYEN_XU_LY
     * @param handlerUserId  ID người được tiếp nhận (có thể khác người gọi API)
     * @param userId         ID người đang gọi API (chỉ huy)
     */
    async commanderTransfer(id: string, handleUserId: string, userId: string) {
        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
            if (request.status !== 'WAIT_COMMANDER') {
                throw new BadRequestException('Chỉ có thể chuyển xử lý từ trạng thái "Chờ chỉ huy"');
            }

            await this.requestRepo.update(id, { status: 'WAIT_RECEIVE', updatedBy: userId });

            const handler = await this.userRepo.findOne({ where: { id: handleUserId } });
            const handlerGroup = handler ? null : await this.groupUserService.findByIdSafe(handleUserId);
            const handlerName = handler
                ? (handler.name || handler.username)
                : (handlerGroup?.data?.name || handleUserId);

            await this.addHistory(id, 'FORWARD', userId, `Chỉ huy chuyển tiếp cho: ${handlerName}`);

            // --- Gửi thông báo cho cán bộ chuyên trách ---
            if (handleUserId) {
                await this.notifyPassportRequestRecipient(handleUserId, {
                    content: `Có yêu cầu mượn hộ chiếu ${request.requestCode} cần tiếp nhận xử lý.`,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_COORDINATED.value,
                    recordId: id,
                });
            }

            // --- Gửi thông báo cho Người tạo và Chỉ huy đơn vị ---
            if (request.requesterId) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã được Chỉ huy văn phòng chuyển chuyên trách xử lý.`,
                    recipientId: request.requesterId,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                    recordId: id,
                });
            }
            if (request.leader) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã được Chỉ huy văn phòng chuyển chuyên trách xử lý.`,
                    recipientId: request.leader,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                    recordId: id,
                });
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            // Truyền handlerUserId để WorkItem được gán đúng cho người chỉ định (không gán theo role nhóm)
            await this.moveToNextNode(id, userId, user?.name || userId, 'CHUYEN_XU_LY', 'Chuyển xử lý', handleUserId);

            return { statusCode: 200, message: 'Đã chuyển xử lý sang Bộ phận chuyên trách', data: { id, status: 'WAIT_RECEIVE' } };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi chuyển xử lý: ${error.message}`);
        }
    }

    async commanderReject(id: string, approvalReason: string | undefined, userId: string) {
        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
            if (request.status !== 'WAIT_COMMANDER') {
                throw new BadRequestException('Chỉ có thể từ chối ở trạng thái "Chờ chỉ huy"');
            }

            await this.requestRepo.update(id, {
                status: 'REJECTED',
                handlerId: userId,
                updatedBy: userId,
            });

            await this.addHistory(id, 'REJECT_BACK', userId, approvalReason?.trim() || 'Chỉ huy đã từ chối yêu cầu');

            const recipientIds = Array.from(
                new Set(
                    [request.requesterId, request.createdBy].filter(
                        (recipientId): recipientId is string => !!recipientId,
                    ),
                ),
            );
            for (const recipientId of recipientIds) {
                await this.notifyPassportRequestRecipient(recipientId, {
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} bị Chỉ huy từ chối.`,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    recordId: request.id,
                });
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            await this.moveToNextNode(id, userId, user?.name || userId, 'REJECT', 'Chỉ huy từ chối', request.requesterId ?? undefined);

            return { statusCode: 200, message: 'Chỉ huy đã từ chối yêu cầu', data: { id, status: 'REJECTED' } };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi từ chối yêu cầu: ${error.message}`);
        }
    }

    async specialistReject(id: string, approvalReason: string | undefined, userId: string) {
        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
            if (request.status !== 'WAIT_RECEIVE' && request.status !== 'WAIT_SIGN') {
                throw new BadRequestException('Chỉ có thể từ chối ở trạng thái "Chờ tiếp nhận" hoặc "Chờ ký biên bản"');
            }

            await this.requestRepo.update(id, {
                status: 'REJECTED',
                handlerId: userId,
                updatedBy: userId,
            });

            await this.addHistory(id, 'REJECT_RECEIVE', userId, approvalReason?.trim() || 'Bộ phận chuyên trách đã từ chối yêu cầu');

            const recipientIds = Array.from(
                new Set(
                    [request.requesterId, request.createdBy].filter(
                        (recipientId): recipientId is string => !!recipientId,
                    ),
                ),
            );
            for (const recipientId of recipientIds) {
                await this.notifyPassportRequestRecipient(recipientId, {
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} bị Bộ phận chuyên trách từ chối.`,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    recordId: request.id,
                });
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            await this.moveToNextNode(id, userId, user?.name || userId, 'REJECT', 'BPCT từ chối', request.requesterId ?? undefined);

            return { statusCode: 200, message: 'Bộ phận chuyên trách đã từ chối yêu cầu', data: { id, status: 'REJECTED' } };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi từ chối yêu cầu: ${error.message}`);
        }
    }

    async receive(id: string, userId: string, approvalReason: string | undefined) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
                relations: ['delegationItems']
            });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
            if (request.status !== 'WAIT_RECEIVE') {
                throw new BadRequestException('Chỉ có thể tiếp nhận yêu cầu ở trạng thái "Chờ tiếp nhận"');
            }

            // --- VALIDATION: Chặn tiếp nhận nếu hộ chiếu đang được mượn ở đơn khác ---
            const passportIds: string[] = [];
            if (request.typeRequest === 'user' && request.passportId) {
                passportIds.push(request.passportId);
            } else if ((request.typeRequest === 'organization' || request.typeRequest === 'organizational') && request.delegationItems) {
                request.delegationItems.forEach(item => {
                    if (item.passportId) passportIds.push(item.passportId);
                });
            }

            if (passportIds.length > 0) {
                const passports = await this.passportRepo.find({ where: { id: In(passportIds) } });
                const unavailable = passports.filter(p => p.usageStatus !== 'STORING');
                if (unavailable.length > 0) {
                    const numbers = unavailable.map(p => p.passportNumber).join(', ');
                    throw new BadRequestException(`Không thể tiếp nhận. Các hộ chiếu sau đang được đơn khác mượn (Chưa về kho): ${numbers}`);
                }
            }

            await this.requestRepo.update(id, { status: 'WAIT_SIGN', handlerId: userId, updatedBy: userId });

            await this.addHistory(id, 'RECEIVE', userId, approvalReason?.trim() || 'Đã tiếp nhận yêu cầu. Chờ ký biên bản bàn giao.');

            const user: any = await this.sqlsvRepo.getUserById(userId);

            // --- Gửi thông báo cho người tạo ---
            if (request.requesterId) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã được tiếp nhận, đang chờ xử lý bàn giao.`,
                    recipientId: request.requesterId,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                    recordId: id,
                });
            }

            // Bước tiếp theo là 'Ký xác nhận bàn giao' thuộc Lane Bộ phận chuyên trách.
            // KHÔNG truyền requesterId ở đây — WorkItem phải được gán cho chính chuyên trách (userId)
            await this.moveToNextNode(id, userId, user?.name || userId, 'RECEIVE', 'Tiếp nhận');

            return { statusCode: 200, message: 'Tiếp nhận hộ chiếu thành công. Vui lòng lập và ký biên bản.', data: { id, status: 'WAIT_SIGN' } };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi tiếp nhận: ${error.message}`);
        }
    }

    async handover(id: string, userId: string, voucherCode?: string, itemCount?: number) {
        try {
            const request = await this.requestRepo.findOne({ where: { id, isDeleted: false } });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
            if (request.status !== 'WAIT_SIGN' && request.status !== 'WAIT_RECEIVE') {
                throw new BadRequestException('Chỉ có thể bàn giao HC từ trạng thái "Chờ tiếp nhận" hoặc "Chờ ký biên bản"');
            }

            await this.requestRepo.update(id, { status: 'IN_USE', handlerId: userId, updatedBy: userId });

            let historyNote = 'Đã hoàn tất ký biên bản và bàn giao hộ chiếu cho người mượn';
            if (voucherCode && itemCount !== undefined) {
                historyNote = `Đã bàn giao ${itemCount} hộ chiếu theo biên bản ${voucherCode}`;
                // Lưu metadata ẩn để findHistory có thể parse
                historyNote += ` [V_CODE:${voucherCode}] [V_COUNT:${itemCount}]`;
            }
            await this.addHistory(id, 'SIGN_HANDOVER', userId, historyNote);

            const user: any = await this.sqlsvRepo.getUserById(userId);
            const requestForBranch = await this.requestRepo.findOne({ where: { id } });
            // Sau bàn giao HC, Gateway sẽ rẽ nhánh theo Lane của người tạo yêu cầu để ký biên bản
            await this.moveToNextNode(id, userId, user?.name || userId, 'BAN_GIAO', 'Bàn giao HC', requestForBranch?.requesterId || undefined);

            return { statusCode: 200, message: 'Bàn giao hộ chiếu thành công. Đang được sử dụng.', data: { id, status: 'IN_USE' } };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi bàn giao HC: ${error.message}`);
        }
    }

    /**
     * Hoàn tất trả hộ chiếu (Dành cho Cán bộ xác nhận thủ công)
     */
    async returnPassport(id: string, userId: string, returnNote?: string) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
                relations: ['delegationItems'],
            });
            if (!request) throw new NotFoundException('Yêu cầu không tồn tại');

            // 1. Cập nhật tất cả hộ chiếu của yêu cầu này thành STORING
            const passportIds: string[] = [];
            if (request.typeRequest === 'user' && request.passportId) {
                passportIds.push(request.passportId);
            } else if ((request.typeRequest === 'organization' || request.typeRequest === 'organizational') && request.delegationItems) {
                request.delegationItems.forEach(item => {
                    if (item.passportId) passportIds.push(item.passportId);
                });
            }

            if (passportIds.length > 0) {
                await this.passportRepo.update({ id: In(passportIds) }, { usageStatus: 'STORING', updatedBy: userId });
            }

            // 2. Gọi hàm kiểm tra và hoàn tất (hàm này sẽ check biên bản đã ký chưa)
            const result = await this.checkAndCompleteRequest(id, userId, returnNote || 'Cán bộ xác nhận hoàn tất trả hộ chiếu');
            return result;
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi hoàn trả HC: ${error.message}`);
        }
    }

    /**
     * Kiểm tra và chuyển trạng thái yêu cầu sang COMPLETED nếu tất cả hộ chiếu đã được hoàn trả
     */
    async checkAndCompleteRequest(id: string, userId: string, returnNote?: string, voucherCode?: string, itemCount?: number) {
        try {
            const request = await this.requestRepo.findOne({
                where: { id, isDeleted: false },
                relations: ['delegationItems'],
            });
            if (!request) return;

            // Lấy danh sách PassportId cần kiểm tra
            const passportIds: string[] = [];
            if (request.typeRequest === 'user' && request.passportId) {
                passportIds.push(request.passportId);
            } else if ((request.typeRequest === 'organization' || request.typeRequest === 'organizational') && request.delegationItems) {
                request.delegationItems.forEach(item => {
                    if (item.passportId) passportIds.push(item.passportId);
                });
            }

            if (passportIds.length === 0) return;

            // Kiểm tra trạng thái của tất cả hộ chiếu
            const passports = await this.passportRepo.find({
                where: { id: In(passportIds) }
            });

            // 1. Nếu còn bất kỳ hộ chiếu nào KHÔNG phải STORING thì chưa hoàn thành yêu cầu
            const allReturned = passports.every(p => p.usageStatus === 'STORING');
            if (!allReturned) {
                let historyNote = returnNote || 'Đã trả một phần hộ chiếu qua biên bản hoàn trả.';
                if (voucherCode && itemCount !== undefined) {
                    historyNote = `Đã trả ${itemCount} hộ chiếu theo biên bản ${voucherCode}`;
                    historyNote += ` [V_CODE:${voucherCode}] [V_COUNT:${itemCount}]`;
                }
                await this.addHistory(id, 'CREATE_RETURN', userId, historyNote);
                return { statusCode: 200, message: 'Cập nhật trạng thái hộ chiếu thành công, yêu cầu vẫn đang xử lý trả lẻ.' };
            }

            // 2. Kiểm tra xem đã có ít nhất một biên bản hoàn trả (RETURN) chưa
            // Chúng ta nới lỏng kiểm tra biên bản để ưu tiên trạng thái vật lý của kho
            const hasReturnVoucher = await this.voucherRepo.createQueryBuilder('v')
                .innerJoin('v.items', 'item')
                .where('item.requestId = :requestId', { requestId: id })
                .andWhere('v.voucherType = :voucherType', { voucherType: 'RETURN' })
                .getExists();

            if (!hasReturnVoucher) {
                // Nếu hiếm hoi chưa có biên bản mà hộ chiếu đã về kho (có thể do cán bộ xác nhận thủ công)
                // vẫn cho phép hoàn tất nhưng log cảnh báo
                this.logger.warn(`Yêu cầu ${id} đã trả hết HC nhưng chưa tìm thấy biên bản hoàn trả liên quan.`);
            }

            // Nếu đã trả hết và hợp lệ -> Chuyển status COMPLETED
            await this.requestRepo.update(id, { status: 'COMPLETED', updatedBy: userId });

            let finalNote = returnNote || 'Tất cả hộ chiếu đã được hoàn trả. Yêu cầu hoàn tất.';
            if (voucherCode && itemCount !== undefined) {
                finalNote = `Hoàn tất trả ${itemCount} hộ chiếu theo biên bản ${voucherCode}. Yêu cầu hoàn tất.`;
                finalNote += ` [V_CODE:${voucherCode}] [V_COUNT:${itemCount}]`;
            }
            await this.addHistory(id, 'SIGN_RETURN', userId, finalNote);

            // --- Gửi thông báo cho người tạo ---
            if (request.requesterId) {
                await this.notificationService.create({
                    content: `Yêu cầu mượn hộ chiếu ${request.requestCode} đã hoàn tất.`,
                    recipientId: request.requesterId,
                    senderId: userId,
                    key: 'VIEW_REQUEST_LIST',
                    type: NotificationType.PASSPORT_RETURN_COMPLETED.value,
                    recordId: id,
                });
            }

            const user: any = await this.sqlsvRepo.getUserById(userId);
            const userName = user?.name || userId;

            // Thêm Audit log trạng thái COMPLETED cho Request
            await this.sqlRepo.addAudit(id, {
                userId: userId,
                displayName: userName,
                action: 'Hoàn tất trả hộ chiếu',
                actionCode: 'COMPLETED',
                stage_status: 'DA_XU_LY',
                curStatusCode: 'COMPLETED',
                typeDocument: 'PassportRequest',
                receiver: userId,
            });

            await this.moveToNextNode(id, userId, userName, 'HOAN_TRA', 'Hoàn tất trả HC');


            return { statusCode: 200, message: 'Tất cả hộ chiếu đã trả, yêu cầu hoàn tất.', data: { id, status: 'COMPLETED' } };
        } catch (error) {
            this.logger.error(`[checkAndCompleteRequest] Error: ${error.message}`);
        }
    }


    /**
     * 9. Đếm số lượng theo trạng thái
     */
    async getStatusCounts(userId: string) {
        try {
            const qb = this.requestRepo
                .createQueryBuilder('r')
                .select('r.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .where('r.is_deleted = :isDeleted', { isDeleted: false });

            await this.applyVisibilityCondition(qb, userId);

            const counts = await qb.groupBy('r.status').getRawMany();

            const result: Record<string, number> = {};
            let total = 0;
            counts.forEach((c) => {
                result[c.status] = parseInt(c.count, 10);
                total += parseInt(c.count, 10);
            });
            result['all'] = total;

            return { statusCode: 200, data: result };
        } catch (error) {
            throw new BadRequestException(`Lỗi đếm trạng thái: ${error.message}`);
        }
    }

    /**
     * Helper: Resolve country code → { value, title }
     */
    private resolveCountryCode(code: string): { value: string; title: string } {
        if (!code || typeof code !== 'string') return { value: '', title: '' };
        try {
            const displayNames = new Intl.DisplayNames(['vi', 'en'], { type: 'region' });
            const upperCode = code.toUpperCase();
            const title = displayNames.of(upperCode) || code;
            return { value: code.toLowerCase(), title };
        } catch {
            return { value: code, title: code };
        }
    }

    /**
     * Helper: Trộn destination (mảng mã quốc gia) và destinationOther thành mảng [{ value, title }]
     */
    private resolveDestinationList(destinationRaw: any, destinationOtherStr?: string | null): Array<{ value: string; title: string }> {
        let codes: string[] = [];
        if (Array.isArray(destinationRaw)) {
            codes = destinationRaw;
        } else if (typeof destinationRaw === 'string' && destinationRaw.trim()) {
            const trimmed = destinationRaw.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) codes = parsed;
                    else codes = [trimmed];
                } catch {
                    codes = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                }
            } else {
                codes = trimmed.split(',').map(s => s.trim()).filter(Boolean);
            }
        }

        const result: Array<{ value: string; title: string }> = [];

        for (const code of codes) {
            if (!code || typeof code !== 'string') continue;
            const res = this.resolveCountryCode(code);
            if (res.title && !result.some(r => r.value === res.value)) {
                result.push(res);
            }
        }

        if (destinationOtherStr && typeof destinationOtherStr === 'string' && destinationOtherStr.trim()) {
            const otherVal = destinationOtherStr.trim();
            if (!result.some(r => r.value === otherVal || r.title === otherVal)) {
                result.push({ value: otherVal, title: otherVal });
            }
        }

        return result;
    }

    /**
     * BPMN WORKFLOW HELPERS
     */

    private async moveToNextNode(
        documentId: string,
        userId: string,
        displayName: string,
        actionCode: string,
        actionLabel: string,
        receiverUserId?: string,
        overrideAuditCode?: string,
    ) {
        try {
            // 1. Lấy work item hiện tại
            const openWi = await this.workItemRepo.findOne({
                where: { documentId, state: 'open' },
            });
            if (!openWi) {
                this.logger.warn(`moveToNextNode: không tìm thấy open workItem cho ${documentId}`);
                return;
            }

            const currentNodeId = openWi.nodeId;
            const currentRole = openWi.role;
            const bpmnVersion = openWi.bpmnVersion;

            // 2. Load BPMN XML
            const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion || '');
            if (!bpmnXML) {
                this.logger.warn(`moveToNextNode: không tìm thấy BPMN file cho version ${bpmnVersion}`);
                return;
            }

            const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
            const currentNode = indexes.nodes.get(currentNodeId);
            if (!currentNode) {
                this.logger.warn(`moveToNextNode: không tìm thấy node ${currentNodeId} trong BPMN`);
                return;
            }

            // 3. Tìm outgoing flow
            const outgoingFlows = currentNode.outgoing || [];
            if (outgoingFlows.length === 0) {
                this.logger.warn(`moveToNextNode: node ${currentNodeId} không có outgoing flow`);
                return;
            }

            let flow = outgoingFlows[0];
            if (outgoingFlows.length > 1) {
                // Lấy thông tin request để biết ai là người tạo
                const request = await this.requestRepo.findOne({ where: { id: documentId } });
                const requesterId = request?.requesterId || request?.createdBy;

                // Xác định user cần rẽ nhánh cho: receiver hoặc người tạo
                const targetUserId = receiverUserId || userId;

                // Lấy vai trò thực của user này
                const groupRoles = await this.sqlsvRepo.getDynamicRolesByUserId(targetUserId);
                const userRoles = groupRoles.map((g: any) => g.roles_dynamic).filter((r: any) => !!r);

                // Bổ sung vai trò ảo 'NGUOI_TAO' nếu targetUser chính là người tạo yêu cầu
                if (requesterId && (targetUserId === requesterId)) {
                    userRoles.push('NGUOI_TAO');
                }


                // --- Bước 1: Ưu tiên lọc theo actionCode nếu có ---
                let candidateFlows = outgoingFlows.filter((f: any) => {
                    const extProps = this.bpmnEngine.getFlowExtensionProperties(f);
                    return (
                        extProps.actionGroup === actionCode ||
                        extProps.actionCode === actionCode
                    );
                });

                // --- Bước 2: Nếu không khớp actionCode hoặc còn nhiều nhánh, rẽ theo Lane của người nhận ---
                const flowsToCheck = candidateFlows.length > 0 ? candidateFlows : outgoingFlows;

                if (flowsToCheck.length === 1) {
                    flow = flowsToCheck[0];
                } else {
                    // Duyệt từng flow, tìm nhánh có Lane khớp với userRoles (ưu tiên NGUOI_TAO)
                    let foundFlow: any = null;
                    let fallbackFlow: any = null;

                    for (const f of flowsToCheck) {
                        // nextNodeByFlow trả về node ngay sau flow (có thể là Gateway nếu bên kia là Gateway)
                        // Ta cần lấy node thực sự (nextInteractiveFromFlow)
                        const { node: targetNode } = this.bpmnEngine.nextNodeByFlow(f, indexes);
                        if (!targetNode) continue;

                        const laneRole = indexes.laneMap.get(targetNode.id);
                        const lane = indexes.lanes.find((l: any) => l.role === laneRole);
                        const laneGroupCode = lane?.properties?.candidateGroups || laneRole || '';


                        // Khớp chính xác một trong userRoles với candidateGroups của Lane
                        if (userRoles.some((r: string) => laneGroupCode.split(',').map((s: string) => s.trim()).includes(r))) {
                            if (!fallbackFlow) fallbackFlow = f;

                            // Ưu tiên nhánh của NGUOI_TAO
                            if (laneGroupCode.includes('NGUOI_TAO')) {
                                foundFlow = f;
                                break;
                            }
                            foundFlow = f;
                        }
                    }

                    if (foundFlow) {
                        flow = foundFlow;
                    } else if (fallbackFlow) {
                        flow = fallbackFlow;
                    } else {
                        this.logger.warn(`moveToNextNode: Không khớp Lane nào, dùng nhánh đầu tiên`);
                        flow = flowsToCheck[0];
                    }
                }
            }

            const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

            // 4. Đóng work item cũ
            await this.closeOpenWorkItems(documentId, 'completed');

            if (!nextNode) {
                // End node
                await this.addAuditRecord(documentId, {
                    userId, displayName, role: currentRole,
                    actionCode, fromNodeId: currentNodeId, toNodeId: null,
                    createdBy: userId, receiver: receiverUserId || userId,
                    stageStatus: 'DA_XU_LY', curStatusCode: actionCode,
                    typeDocument: this.typeDocument, action: actionLabel,
                });
                return;
            }

            // 5. Xác định người nhận
            const nextNodeId = nextNode.id;
            const nextRole = indexes.laneMap.get(nextNodeId);
            const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode ?? actionCode;

            let assignees: string[] = [];
            let assignmentIsGroup = false;
            // Kiểm tra nếu receiverUserId là mã symbolic (VD: LD001, BR001, DL001) thì bỏ qua, coi như không gán đích danh
            const isSymbolicId = receiverUserId && (receiverUserId.startsWith('LD') || receiverUserId.startsWith('BR') || receiverUserId.startsWith('DL'));

            if (receiverUserId && !isSymbolicId) {
                // Ưu tiên gán đích danh nếu có thông tin người nhận thực
                assignees = [receiverUserId];
                assignmentIsGroup = !!(await this.groupUserService.findByIdSafe(receiverUserId));
            } else if (nextRole && bpmnVersion) {
                const nextNodeUsers = await this.groupUserService.getGroupIdsByRoleDynamic(bpmnVersion, nextRole);
                assignmentIsGroup = true;

                // Kiểm tra cấu hình Lane để xác định vai trò có phải là Toàn cục (Global) không
                const nextLane = indexes.lanes.find(l => l.role === nextRole);
                const laneProps = nextLane ? this.bpmnEngine.getLaneProperties(nextLane) : {};

                // Mặc định lọc theo phòng ban (isGlobal != true)
                // Bổ sung thêm fallback cho các vai trò Văn phòng/Chỉ huy văn phòng
                const isGlobal = assignmentIsGroup || laneProps.isGlobal === 'true' || nextRole.includes('VP') || nextRole.includes('VAN_PHONG') || nextRole.includes('CHI_HUY_VP');

                // Lọc theo phòng ban: Chỉ lấy những người thuộc cùng phòng với người thực hiện (hoặc người tạo)
                // Nếu là vai trò Global thì bỏ qua bước lọc này
                if (!isGlobal && userId && nextNodeUsers.length > 0) {
                    const actor = await this.sqlsvRepo.getUserById(userId);
                    const actorUnitId = actor?.parent?.id;
                    if (actorUnitId) {
                        const usersInfo = await this.sqlsvRepo.getUsersByIds(nextNodeUsers);
                        const sameUnitUsers = usersInfo
                            .filter(u => (u.parent as any)?.id === actorUnitId)
                            .map(u => u.id);

                        if (sameUnitUsers.length > 0) {
                            assignees = sameUnitUsers;
                        } else {
                            assignees = nextNodeUsers;
                        }
                    } else {
                        assignees = nextNodeUsers;
                    }
                } else {
                    // Đối với vai trò Global hoặc khi không có thông tin user, lấy tất cả người có vai trò đó
                    assignees = nextNodeUsers;
                }
            }

            if (assignees.length === 0) assignees = [userId];

            // 6. Tạo work item mớis
            for (const assigneeId of assignees) {
                const newWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await this.workItemRepo.save({
                    id: newWiId,
                    documentId,
                    nodeId: nextNodeId,
                    role: nextRole || currentRole,
                    assigneeUserId: assigneeId,
                    nodeType: nextNode.$type,
                    state: 'open',
                    createdAt: new Date(),
                    bpmnVersion,
                });

                await this.addAuditRecord(documentId, {
                    userId, displayName, role: currentRole,
                    actionCode: overrideAuditCode || actionCode,
                    fromNodeId: currentNodeId, toNodeId: nextNodeId,
                    createdBy: userId, receiver: assigneeId,
                    groupField: assignmentIsGroup ? assigneeId : undefined,
                    stageStatus: 'CHUA_XU_LY', curStatusCode: nextStatusCode,
                    typeDocument: this.typeDocument, action: actionLabel,
                });
            }
        } catch (error) {
            this.logger.error(`moveToNextNode error: ${error.message}`);
        } finally {
            await this.bpmnEngine.invalidateDocCache(this.typeDocument, documentId);
        }
    }

    private async closeOpenWorkItems(documentId: string, state: 'completed' | 'cancelled') {
        const openItems = await this.workItemRepo.find({
            where: { documentId, state: 'open' },
        });
        for (const wi of openItems) {
            wi.state = state;
            await this.workItemRepo.save(wi);
        }
    }

    private async addAuditRecord(documentId: string, payload: Partial<Audit>) {
        await this.auditRepo.save({
            documentId,
            userId: payload.userId ?? null,
            displayName: payload.displayName ?? null,
            role: payload.role ?? null,
            actionCode: payload.actionCode ?? null,
            fromNodeId: payload.fromNodeId ?? null,
            toNodeId: payload.toNodeId ?? null,
            createdBy: payload.createdBy ?? null,
            receiver: payload.receiver ?? null,
            groupField: (payload as any).groupField ?? null,
            roleProcess: payload.roleProcess ?? payload.role ?? null,
            action: payload.action ?? null,
            stageStatus: payload.stageStatus ?? null,
            curStatusCode: payload.curStatusCode ?? null,
            typeDocument: payload.typeDocument ?? this.typeDocument,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    /**
 * Công khai để PassportVouchersService gọi khi tạo biên bản.
 * Chuyển WorkItem của yêu cầu từ gateway sang nhánh KY_XAC_NHAN
 * (bước "Ký xác nhận bàn giao" trong BPMN PassportRequest).
 */
    async advanceToVoucherSign(requestId: string, performerId: string, receiverId?: string) {
        try {
            const performer: any = await this.sqlsvRepo.getUserById(performerId);
            const displayName = performer?.name || performerId;

            // Kiểm tra node hiện tại của BPMN
            const openWi = await this.workItemRepo.findOne({
                where: { documentId: requestId, state: 'open' },
            });

            if (openWi && openWi.nodeId === 'Gateway_0vit1df') {
                // Nếu đang ở "Chờ tiếp nhận", phải đi qua nhánh RECEIVE (Thực hiện Tiếp nhận)
                // để work item chạy vào Gateway_0mpqx8j trước
                await this.moveToNextNode(
                    requestId,
                    performerId,
                    displayName,
                    'RECEIVE',
                    'Tiếp nhận',
                );
            }

            await this.moveToNextNode(
                requestId,
                performerId,
                displayName,
                'KY_XAC_NHAN',
                'Lập biên bản bàn giao',
                receiverId,
            );
        } catch (error) {
            this.logger.error(`advanceToVoucherSign error for ${requestId}: ${error.message}`);
        }
    }

    /**
     * Advance Request BPMN 2 nodes khi tạo biên bản hoàn trả:
     * Node 1: qua gateway (HOAN_TRA) 
     * Node 2: đến node ký xác nhận
     */
    async advanceForReturnVoucher(requestId: string, performerId: string) {
        try {
            const performer: any = await this.sqlsvRepo.getUserById(performerId);
            const displayName = performer?.name || performerId;

            // Node 1: Qua gateway bằng action HOAN_TRA
            await this.moveToNextNode(
                requestId,
                performerId,
                displayName,
                'HOAN_TRA',
                'Lập biên bản hoàn trả',
            );

            // Node 2: Next thêm 1 node nữa đến node ký
            await this.moveToNextNode(
                requestId,
                performerId,
                displayName,
                'KY_XAC_NHAN',
                'Chờ ký xác nhận hoàn trả',
            );
        } catch (error) {
            this.logger.error(`advanceForReturnVoucher error for ${requestId}: ${error.message}`);
        }
    }

    /**
     * Công khai để PassportVouchersService gọi khi KÝ biên bản xong.
     * Chuyển WorkItem sang bước cuối (hoàn tất quy trình PassportRequest).
     */
    async advanceAfterVoucherSigned(requestId: string, performerId: string, receiverId?: string) {
        try {
            const performer: any = await this.sqlsvRepo.getUserById(performerId);
            const displayName = performer?.name || performerId;
            await this.moveToNextNode(
                requestId,
                performerId,
                displayName,
                'KY_XAC_NHAN',
                'Ký xác nhận bàn giao',
                receiverId,
            );
        } catch (error) {
            this.logger.error(`advanceAfterVoucherSigned error for ${requestId}: ${error.message}`);
        }
    }

    // =====================================================================
    // Lấy danh sách người dùng có thể xử lý ở các bước trong luồng
    // GET /passport-requests/flow-users?roleCode=KIEM_DUYET_TRUONG_PHONG
    // =====================================================================
    async getFlowUsers(userId: string, roleCode?: string, name?: string, page?: number, limit?: number) {
        try {
            // Lấy luồng BPMN theo đơn vị của user đang gọi
            const bpmnUser: any = await this.sqlsvRepo.getUserById(userId);
            if (!bpmnUser?.parent?.id) {
                throw new BadRequestException('Người dùng không thuộc đơn vị nào');
            }

            const flowConfig = await this.sqlsvRepo.getFlowByUnit(
                String(bpmnUser.parent.id), 'PassportRequest',
            );
            if (!flowConfig) {
                throw new BadRequestException('Đơn vị chưa cấu hình luồng PassportRequest');
            }

            const flowId = String(flowConfig.id);

            // Helper lấy thông tin người dùng tối ưu tốc độ và an toàn với mảng lớn
            const fetchUsersOptimized = async (ids: string[], searchName?: string, pageNum?: number, limitNum?: number) => {
                if (!ids || ids.length === 0) {
                    return { users: [], total: 0 };
                }

                const hasSearch = searchName && searchName.trim().length > 0;
                const hasPaging = pageNum !== undefined && limitNum !== undefined && pageNum > 0 && limitNum > 0;

                // TH1: Không tìm kiếm theo tên + có phân trang -> Chỉ query DB đúng số lượng user của trang đó (Cực nhanh: ~2ms)
                if (!hasSearch && hasPaging) {
                    const total = ids.length;
                    const skip = (pageNum - 1) * limitNum;
                    const pageIds = ids.slice(skip, skip + limitNum);

                    if (pageIds.length === 0) {
                        return { users: [], total };
                    }

                    const users = await this.userRepo.createQueryBuilder('u')
                        .select(['u.id', 'u.username', 'u.name'])
                        .where('u.id IN (:...pageIds)', { pageIds })
                        .getMany();

                    // Đảm bảo thứ tự hiển thị trùng với thứ tự trong pageIds
                    const userMap = new Map(users.map(u => [u.id, u]));
                    const orderedUsers = pageIds.map(id => userMap.get(id)).filter((u): u is UserEntity => !!u);

                    return { users: orderedUsers, total };
                }

                // TH2: Có tìm kiếm theo tên hoặc không phân trang -> Parallel chunk query (Tối ưu chống giới hạn 2100 param của MSSQL)
                const CHUNK_SIZE = 1000;
                const chunks: string[][] = [];
                for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                    chunks.push(ids.slice(i, i + CHUNK_SIZE));
                }

                const keyword = hasSearch ? `%${searchName.trim().toLowerCase()}%` : '';

                const chunkPromises = chunks.map(chunk => {
                    const qb = this.userRepo.createQueryBuilder('u')
                        .select(['u.id', 'u.username', 'u.name'])
                        .where('u.id IN (:...chunk)', { chunk });

                    if (hasSearch) {
                        qb.andWhere('(LOWER(u.name) LIKE :keyword OR LOWER(u.username) LIKE :keyword)', { keyword });
                    }

                    return qb.getMany();
                });

                const chunkResults = await Promise.all(chunkPromises);
                const allMatchedUsers = chunkResults.flat();
                const total = allMatchedUsers.length;

                if (hasPaging) {
                    const skip = (pageNum - 1) * limitNum;
                    const pagedUsers = allMatchedUsers.slice(skip, skip + limitNum);
                    return { users: pagedUsers, total };
                }

                return { users: allMatchedUsers, total };
            };

            // Nếu truyền roleCode cụ thể → chỉ lấy users của role đó
            if (roleCode) {
                let userIds: string[] = [];
                try {
                    userIds = await this.groupUserService.getUserIdsByRoleDynamic(flowId, roleCode);
                } catch (err) {
                    if (err instanceof BadRequestException) {
                        return {
                            statusCode: 200,
                            flowId,
                            roleCode,
                            data: [],
                            total: 0,
                            page: page || 1,
                            limit: limit || 20,
                            totalPages: 0,
                        };
                    }
                    throw err;
                }

                if (!userIds || userIds.length === 0) {
                    return {
                        statusCode: 200,
                        flowId,
                        roleCode,
                        data: [],
                        total: 0,
                        page: page || 1,
                        limit: limit || 20,
                        totalPages: 0,
                    };
                }

                const pageNum = page ? +page : 1;
                const limitNum = limit ? +limit : 20;

                const { users, total } = await fetchUsersOptimized(userIds, name, pageNum, limitNum);

                return {
                    statusCode: 200,
                    flowId,
                    roleCode,
                    data: users.map(u => ({ id: u.id, name: u.name || u.username })),
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                };
            }

            // Không truyền roleCode → lấy tất cả roles trong BPMN + users tương ứng
            // Đọc các lane (role) từ BPMN XML
            const bpmnXML = await this.runtimeDbService.getBpmnFile(flowId);
            const { indexes } = await this.runtimeDbService['getModelFromXml'](bpmnXML);

            const roleSet = new Set<string>();
            for (const [, role] of indexes.laneMap || new Map()) {
                if (role) roleSet.add(role);
            }

            const pageNum = page ? +page : undefined;
            const limitNum = limit ? +limit : undefined;

            const rolePromises = Array.from(roleSet).map(async (role) => {
                let userIds: string[] = [];
                try {
                    userIds = await this.groupUserService.getUserIdsByRoleDynamic(flowId, role);
                } catch {
                    return { role, users: [] };
                }

                if (!userIds || userIds.length === 0) {
                    return { role, users: [] };
                }

                const { users } = await fetchUsersOptimized(userIds, name, pageNum, limitNum);
                return { role, users: users.map(u => ({ id: u.id, name: u.name || u.username })) };
            });

            const roleResults = await Promise.all(rolePromises);
            const result: Record<string, any[]> = {};
            for (const { role, users } of roleResults) {
                result[role] = users;
            }

            return { statusCode: 200, flowId, data: result };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            throw new BadRequestException(`Lỗi lấy danh sách người xử lý: ${error.message}`);
        }
    }
    // =====================================================================
    // Lịch sử xử lý yêu cầu
    // =====================================================================
    private async notifyPassportRequestRecipient(
        recipientId: string,
        data: {
            content: string;
            senderId: string;
            key: string;
            recordId: string;
            title?: string;
            link?: string;
            type?: NotificationType;
        },
    ) {
        const group = await this.groupUserService.findByIdSafe(recipientId);
        if (group) {
            const recipientIds = await this.groupUserService.getUserIdsByGroup(recipientId);
            if (!recipientIds.length) {
                this.logger.warn(`Khong co user trong group nhan thong bao ho chieu: ${recipientId}`);
                return;
            }

            await this.notificationService.createForRecipients({
                ...data,
                recipientIds,
            });
            return;
        }

        await this.notificationService.create({
            ...data,
            recipientId,
        });
    }

    private async addHistory(requestId: string, action: string, performerId: string, note?: string) {
        try {
            await this.historyRepo.save(
                this.historyRepo.create({
                    id: uuidv4(),
                    requestId,
                    action,
                    performerId,
                    note: note || '',
                })
            );
        } catch (error) {
            this.logger.error(`Lỗi ghi lịch sử: ${error.message}`);
        }
    }

    async recordReturnVoucherRejectedHistory(requestId: string, performerId: string, note?: string) {
        await this.addHistory(requestId, 'REJECT_RETURN', performerId, note || 'Biên bản hoàn trả bị từ chối ký xác nhận');
    }

    async findHistory(requestId: string) {
        const history = await this.historyRepo.find({
            where: { requestId },
            relations: ['performer', 'performer.parent'],
            order: { performedAt: 'DESC' },
        });

        // Lấy thông tin yêu cầu để tính totalPassports
        const request = await this.requestRepo.findOne({
            where: { id: requestId },
            relations: ['delegationItems'],
        });

        let totalPassports = 0;
        if (request) {
            if (request.typeRequest === 'user') {
                totalPassports = 1;
            } else {
                totalPassports = (request.delegationItems || []).length;
            }
        }

        // Lấy thông tin từ các biên bản để tính số lượng hộ chiếu (x/n)
        const voucherItems = await this.voucherItemRepo.find({
            where: { requestId },
            relations: ['voucher'],
        });

        // Map action code sang tiêu đề tiếng Việt
        const ACTION_MAP: Record<string, string> = {
            'CREATE': 'Tạo mới yêu cầu mượn hộ chiếu',
            'UPDATE': 'Chỉnh sửa yêu cầu mượn hộ chiếu',
            'CANCEL': 'Hủy yêu cầu mượn hộ chiếu',
            'APPROVE': 'Phê duyệt yêu cầu',
            'REJECT': 'Từ chối phê duyệt yêu cầu',
            'FORWARD': 'Chuyển xử lý yêu cầu',
            'REJECT_BACK': 'Từ chối chuyển xử lý yêu cầu',
            'RECEIVE': 'Tiếp nhận xử lý yêu cầu',
            'REJECT_RECEIVE': 'Từ chối tiếp nhận yêu cầu',
            'CREATE_HANDOVER': 'Tạo biên bản bàn giao hộ chiếu',
            'SIGN_HANDOVER': 'Ký xác nhận hoàn tất bàn giao',
            'CREATE_RETURN': 'Tạo biên bản hoàn trả hộ chiếu',
            'SIGN_RETURN': 'Ký xác nhận hoàn tất hoàn trả',
            'REJECT_RETURN': 'Từ chối ký xác nhận hoàn trả',
        };

        return {
            statusCode: 200,
            data: history.map(h => {
                let actionTitle = ACTION_MAP[h.action] || h.action;
                let displayNote = h.note || '';

                // Trích xuất metadata nếu có: [V_CODE:...] [V_COUNT:...]
                const codeMatch = displayNote.match(/\[V_CODE:([^\]]+)\]/);
                const countMatch = displayNote.match(/\[V_COUNT:(\d+)\]/);

                if (codeMatch && countMatch) {
                    const vCode = codeMatch[1];
                    const vCount = countMatch[1];

                    if (h.action === 'SIGN_HANDOVER') {
                        actionTitle = `Bàn giao hộ chiếu (${vCount}/${totalPassports} hộ chiếu)`;
                    } else if (h.action === 'CREATE_RETURN' || h.action === 'SIGN_RETURN') {
                        const prefix = h.action === 'CREATE_RETURN' ? 'Tạo biên bản hoàn trả' : 'Ký xác nhận hoàn trả';
                        actionTitle = `${prefix} (${vCount}/${totalPassports} hộ chiếu)`;
                    }

                    // Ẩn metadata khỏi nội dung hiển thị cho người dùng
                    displayNote = displayNote.replace(/\[V_CODE:[^\]]+\]/g, '').replace(/\[V_COUNT:\d+\]/g, '').trim();
                } else if (['CREATE_RETURN', 'SIGN_RETURN', 'SIGN_HANDOVER'].includes(h.action)) {
                    // Fallback cho dữ liệu cũ chưa có metadata
                    const returnedInVouchers = voucherItems.filter(vi => vi.voucher?.voucherType === 'RETURN').length;
                    const handoverInVouchers = voucherItems.filter(vi => vi.voucher?.voucherType === 'HANDOVER').length;

                    if (h.action === 'SIGN_HANDOVER') {
                        actionTitle = `Hoàn tất bàn giao (${handoverInVouchers}/${totalPassports} hộ chiếu)`;
                    } else {
                        actionTitle = `${actionTitle} (${returnedInVouchers}/${totalPassports} hộ chiếu)`;
                    }
                }

                return {
                    id: h.id,
                    action: actionTitle,
                    note: displayNote,
                    performerName: h.performer?.name || h.performer?.username || 'Hệ thống',
                    performerDepartment: h.performer?.organizationName || h.performer?.parent?.name || null,
                    performedAt: h.performedAt,
                };
            }),
        };
    }

    /**
* Tạo bản nháp Phân quyền Hộ chiếu
*/
    async createPermissionDraft(dto: CreatePassportPermissionDto) {
        try {
            // Kiểm tra: Mỗi người chỉ được phép có 1 bản ghi phân quyền
            if (dto.authPersonsPassport) {
                const existing = await this.permissionRepo.findOne({
                    where: { authPersonsPassport: dto.authPersonsPassport },
                });
                if (existing) {
                    throw new BadRequestException('Người dùng này đã được phân quyền');
                }
            }

            const code = dto.code || await this.generatePermissionCode();

            const permission = this.permissionRepo.create({
                id: uuidv4(),
                code,
                passportBorrowScope: dto.passportBorrowScope || '',
                authPersonsPassport: dto.authPersonsPassport || '',
                officerList: dto.officerList || null,
            });

            const saved = await this.permissionRepo.save(permission);
            return { statusCode: 201, data: saved, message: 'Đã tạo bản nháp phân quyền thành công' };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(`Lỗi tạo bản nháp phân quyền: ${error.message}`);
            throw new BadRequestException(`Không thể tạo bản nháp phân quyền: ${error.message}`);
        }
    }

    /**
     * Xóa bản ghi Phân quyền Hộ chiếu (hỗ trợ xóa nhiều)
     */
    async deletePermission(ids: string[]) {
        try {
            if (!ids || ids.length === 0) {
                throw new BadRequestException('Danh sách ids không được để trống');
            }

            const permissions = await this.permissionRepo.findBy({ id: In(ids) });

            if (permissions.length === 0) {
                throw new NotFoundException('Không tìm thấy bản ghi nào khớp');
            }

            await this.permissionRepo.remove(permissions);
            return {
                statusCode: 200,
                message: `Đã xóa thành công ${permissions.length} bản ghi phân quyền`,
                deletedCount: permissions.length,
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            this.logger.error(`Lỗi xóa bản ghi phân quyền: ${error.message}`);
            throw new BadRequestException(`Không thể xóa bản ghi phân quyền: ${error.message}`);
        }
    }

    /**
     * Cập nhật bản ghi Phân quyền Hộ chiếu
     */
    async updatePermission(id: string, dto: UpdatePassportPermissionDto) {
        try {
            const permission = await this.permissionRepo.findOne({ where: { id } });
            if (!permission) {
                throw new NotFoundException(`Không tìm thấy bản ghi phân quyền với ID: ${id}`);
            }

            // --- Validate yêu cầu mới: Khi cập nhật không được để trống ---
            if (!dto.passportBorrowScope) {
                throw new BadRequestException('Phạm vi mượn không được để trống');
            }
            if (!dto.authPersonsPassport) {
                throw new BadRequestException('Người được cấp quyền không được để trống');
            }

            // Kiểm tra: Nếu thay đổi authPersonsPassport, đảm bảo người mới chưa được phân quyền
            if (dto.authPersonsPassport !== undefined && dto.authPersonsPassport !== permission.authPersonsPassport) {
                const existing = await this.permissionRepo.findOne({
                    where: { authPersonsPassport: dto.authPersonsPassport },
                });
                if (existing && existing.id !== id) {
                    throw new BadRequestException('Người dùng này đã được phân quyền');
                }
            }

            // Cập nhật các trường
            if (dto.code) permission.code = dto.code;
            if (dto.passportBorrowScope !== undefined) permission.passportBorrowScope = dto.passportBorrowScope;
            if (dto.authPersonsPassport !== undefined) permission.authPersonsPassport = dto.authPersonsPassport;
            if (dto.officerList !== undefined) permission.officerList = dto.officerList;

            const updated = await this.permissionRepo.save(permission);
            return { statusCode: 200, data: updated, message: 'Đã cập nhật bản ghi phân quyền thành công' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
            this.logger.error(`Lỗi cập nhật bản ghi phân quyền: ${error.message}`);
            throw new BadRequestException(`Không thể cập nhật bản ghi phân quyền: ${error.message}`);
        }
    }

    /**
     * Lấy danh sách Phân quyền Hộ chiếu
     */
    /**
     * Lấy danh sách Phân quyền Hộ chiếu
     */
    async findAllPermissions(query: ListPassportPermissionDto) {
        try {
            const { page = 1, limit = 20, search } = query;
            const skip = (page - 1) * limit;

            // Truy vấn cùng với Join bảng User để hỗ trợ tìm kiếm theo tên/username
            const qb = this.permissionRepo.createQueryBuilder('p')
                .leftJoin(UserEntity, 'u', 'u.id = p.authPersonsPassport');

            if (search && search.trim()) {
                const keyword = `%${search.trim().toLowerCase()}%`;
                qb.andWhere(
                    new Brackets((qbInner) => {
                        qbInner.where('LOWER(p.code) LIKE :keyword', { keyword })
                            .orWhere('LOWER(u.name) LIKE :keyword', { keyword })
                            .orWhere('LOWER(u.username) LIKE :keyword', { keyword });
                    }),
                );
            }

            // --- Bổ sung xử lý filter[] ---
            if (query.filter) {
                const filter = query.filter;
                // Nếu filter là object { field: value }
                if (typeof filter === 'object' && !Array.isArray(filter)) {
                    Object.entries(filter).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== '') {
                            if (key === 'authPersonsPassport') {
                                // Hỗ trợ tìm theo tên tiếng Việt hoặc username của người được phân quyền
                                qb.orWhere(
                                    new Brackets((qbAuth) => {
                                        qbAuth.where('u.name LIKE :authKeyword', { authKeyword: `%${value}%` })
                                            .orWhere('u.username LIKE :authKeyword', { authKeyword: `%${value}%` });
                                    }),
                                );
                            } else {
                                // Sử dụng LIKE để tìm kiếm tương đối cho các trường của Permission
                                qb.orWhere(`p.${key} LIKE :${key}`, { [key]: `%${value}%` });
                            }
                        }
                    });
                }
                // Nếu filter là array [{ name, operator, value }]
                else if (Array.isArray(filter)) {
                    filter.forEach((f, idx) => {
                        if (f.name && f.value !== undefined && f.value !== null && f.value !== '') {
                            const paramName = `pVal_${idx}`;
                            if (f.name === 'authPersonsPassport') {
                                // Hỗ trợ tìm theo tên hoặc username trong mảng filter
                                qb.orWhere(
                                    new Brackets((qbAuth) => {
                                        qbAuth.where(`u.name LIKE :authVal_${idx}`, { [`authVal_${idx}`]: `%${f.value}%` })
                                            .orWhere(`u.username LIKE :authVal_${idx}`, { [`authVal_${idx}`]: `%${f.value}%` });
                                    }),
                                );
                            } else {
                                const operator = f.operator === 'like' ? 'LIKE' : (f.operator || '=');
                                const finalValue = operator.toUpperCase() === 'LIKE' ? `%${f.value}%` : f.value;
                                qb.orWhere(`p.${f.name} ${operator} :${paramName}`, { [paramName]: finalValue });
                            }
                        }
                    });
                }
            }

            qb.orderBy('p.createdAt', 'DESC');
            qb.skip(skip).take(limit);

            const [entities, total] = await qb.getManyAndCount();

            // Map tên người dùng cho authPersonsPassport bằng getUserById
            const userIds = [...new Set(entities.map(p => p.authPersonsPassport).filter(id => !!id))];
            const userMap = new Map<string, string>();
            if (userIds.length > 0) {
                // Gọi song song getUserById cho từng ID duy nhất
                const userResults = await Promise.all(
                    userIds.map(id => this.getUserById(id))
                );
                // Build map với key lowercase để xử lý case mismatch
                userIds.forEach((id, idx) => {
                    const u = userResults[idx];
                    if (u) {
                        userMap.set(id.toLowerCase(), u.name || u.username || `User_${u.id}`);
                    }
                });
            }

            // Lấy dữ liệu CRM để map passportBorrowScope
            const crmData = await this.crmSourcesService.findByCode('passportBorrowScope');
            const scopeMap = new Map<string, string>((crmData?.items || []).map((i: any) => [i.value, i.title]));

            const mapData = await this.mapData(entities, userMap, scopeMap);

            return {
                statusCode: 200,
                data: mapData,
                total,
                page,
                limit,
            };
        } catch (error) {
            this.logger.error(`Lỗi khi lấy danh sách phân quyền: ${error.message}`, error.stack);
            throw new BadRequestException('Không thể lấy danh sách phân quyền. Vui lòng thử lại sau.');
        }
    }

    /**
     * Map passportBorrowScope sang {value, title}
     */
    private readonly PASSPORT_BORROW_SCOPE_MAP: Record<string, string> = {
        sameUnit: 'Cùng đơn vị',
        byPermissionList: 'Theo danh sách được cấp phép',
        allUnit: 'Tất cả đơn vị',
    };

    /**
     * Xem chi tiết Phân quyền Hộ chiếu
     */
    async getPermissionDetail(id: string) {
        try {
            const entity = await this.permissionRepo.findOne({ where: { id } });
            if (!entity) {
                throw new NotFoundException(`Không tìm thấy bản ghi phân quyền với ID: ${id}`);
            }

            // Map authPersonsPassport: ID → { id, name }
            let authPersonDetail: { id: string; name: string } | null = null;
            if (entity.authPersonsPassport) {
                const user = await this.getUserById(entity.authPersonsPassport);
                if (user) {
                    authPersonDetail = {
                        id: user.id,
                        name: user.name || user.username || `User_${user.id}`,
                    };
                }
            }

            let passportBorrowScopeMap: any = null;
            if (entity.passportBorrowScope) {
                const dataCrm =
                    await this.crmSourcesService.findByCode('passportBorrowScope');
                const mapItem = dataCrm?.items?.find(
                    (i: any) => i.value === entity.passportBorrowScope,
                );
                passportBorrowScopeMap = mapItem ? mapItem : { value: entity.passportBorrowScope, title: entity.passportBorrowScope };
            }

            return {
                statusCode: 200,
                data: {
                    ...entity,
                    passportBorrowScope: passportBorrowScopeMap,
                    authPersonsPassport: authPersonDetail,
                },
            };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logger.error(`Lỗi khi lấy chi tiết phân quyền: ${error.message}`, error.stack);
            throw new BadRequestException('Không thể lấy thông tin chi tiết phân quyền. Vui lòng thử lại sau.');
        }
    }

    /**
     * Hàm map data riêng biệt cho Phân quyền
     * Thay thế ID người dùng và mã phạm vi bằng tên hiển thị
     */
    private async mapData(entities: any[], userMap: Map<string, string>, scopeMap: Map<string, string>) {
        return entities.map(p => ({
            ...p,
            authPersonsPassport: userMap.get((p.authPersonsPassport || '').toLowerCase()) || p.authPersonsPassport,
            passportBorrowScope: scopeMap.get(p.passportBorrowScope) || p.passportBorrowScope
        }));
    }

    /**
     * Helper: Áp dụng điều kiện hiển thị (Visibility Condition) dùng subquery để tránh lỗi 2100 parameters
     */
    private async applyVisibilityCondition(qb: any, userId: string) {
        // Lấy vai trò của user (phục vụ check WorkItem)
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const userRoles: string[] = [];
        if (user && user.rolesByProcess) {
            user.rolesByProcess.forEach((rbp: any) => {
                if (rbp.processKey === 'PassportRequest' || rbp.processKey === 'QT_MTHC') {
                    (rbp.roles || []).forEach((r: any) => { if (r.roleCode) userRoles.push(r.roleCode); });
                }
            });
        }
        const userGroupIds = await this.getUserGroupIds(userId);
        const userGroupIdsSql = userGroupIds.length > 0
            ? userGroupIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',')
            : '';

        // Build dynamic filters cho work_items và audit
        const userRolesFilter = userRoles.length > 0
            ? `OR (wi.assignee_user_id IS NULL AND wi.role IN (${userRoles.map(r => `N'${r}'`).join(',')}))`
            : '';
        const userGroupsWorkItemFilter = userGroupIds.length > 0
            ? `OR wi.assignee_user_id IN (${userGroupIdsSql})`
            : '';
        const userGroupsAuditFilter = userGroupIds.length > 0
            ? `OR a.receiver IN (${userGroupIdsSql}) OR a.group_ IN (${userGroupIdsSql})`
            : '';

        qb.andWhere(new Brackets(inner => {
            inner.where('r.created_by = :userIdVisibility OR r.requester_id = :userIdVisibility OR r.name_passport_request = :userIdVisibility', { userIdVisibility: userId })
                .orWhere(`EXISTS (
                     SELECT 1 FROM passport_delegation_items pdi WITH (NOLOCK)
                     WHERE pdi.request_id = r.id AND pdi.user_id = :userIdVisibility
                 )`)
                .orWhere(`EXISTS (
                     SELECT 1 FROM work_items wi WITH (NOLOCK)
                     WHERE wi.document_id = CAST(r.id AS varchar(64)) AND wi.state = 'open'
                       AND (wi.assignee_user_id = :userIdVisibility ${userGroupsWorkItemFilter})
                       ${userRolesFilter}
                 )`)
                .orWhere(`EXISTS (
                     SELECT 1 FROM audit a WITH (NOLOCK)
                     WHERE a.document_id = CAST(r.id AS nvarchar(64))
                       AND a.type_document = 'PassportRequest'
                       AND (a.user_id = :userIdVisibility OR a.receiver = :userIdVisibility ${userGroupsAuditFilter})
                 )`);
        }));
    }
}
