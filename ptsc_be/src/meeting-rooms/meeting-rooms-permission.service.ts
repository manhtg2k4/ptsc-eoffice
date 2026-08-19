import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SQLSVRepository } from 'src/database/sqlsvRepo';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { UsersService } from 'src/users/users.service';
import { MeetingRoomEntity } from './entities/meeting-rooms.entity';
import { POSITION_LEVEL } from 'src/variables/CONST_STATUS';


@Injectable()
export class MeetingRoomsPermissionService {
    constructor(
        @InjectRepository(MeetingRoomEntity, 'mssqlConnection')
        private readonly repo: Repository<MeetingRoomEntity>,
        private readonly sqlsvRepo: SQLSVRepository,
        private readonly userService: UsersService,
    ) { }

    // ─── HELPER PRIVATE ────────────────────────────────────────────────────────

    private async isAdmin(userId: string): Promise<boolean> {
        try {
            const user = await this.sqlsvRepo.getUserById(userId);
            if (!user) return false;

            // Check by Position Level
            if (user.position && POSITION_LEVEL[user.position] === POSITION_LEVEL.Admin) {
                return true;
            }

            // Check by Role string
            if (user.role) {
                const roleLower = user.role.toLowerCase();
                if (
                    roleLower.includes('admin') ||
                    roleLower.includes('quản trị') ||
                    roleLower.includes('administrator')
                ) {
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        }
    }

    private async getDefaultFlowId(userId: string): Promise<string> {
        const user = await this.sqlsvRepo.getUserById(userId);
        const flow = await this.sqlsvRepo.getFlowByUnit(user?.parent?.id, 'TaskMetting');
        return flow?.id || 'QUY_TRINH_PHONG_HOP';
    }

    private async getRecord(id: string): Promise<MeetingRoomEntity> {
        const item = await this.repo.findOne({ where: { id } });
        if (!item) throw new NotFoundException('Không tìm thấy phòng họp');
        return item;
    }

    /**
     * Check nhanh: user có trong luồng phòng họp không (dùng chung cho nhiều nơi)
     */
    private async isInFlow(userId: string, processKey: string): Promise<boolean> {
        const quick = await this.userService.isUserInFlowQuick(userId, processKey);
        if (quick) return true;

        const role = await this.sqlsvRepo.getUserRole(userId, processKey);
        if (role) return true;

        // Kiểm tra xem user có thuộc nhóm/group được cấu hình trong luồng này không
        const row = await this.repo.manager.createQueryBuilder()
            .select('1')
            .from('roles_process', 'rp')
            .innerJoin('roles_process_groups', 'rpg', 'rpg.role_id = rp.id')
            .innerJoin('user_group_users', 'ugu', 'ugu.group_user_id = rpg.group_id')
            .innerJoin('users', 'u', 'u.id = ugu.user_id AND u.status = 1')
            .where('rp.is_active = 1')
            .andWhere('rp.process_key = :processKey', { processKey })
            .andWhere('ugu.user_id = :userId', { userId })
            .getRawOne();

        return !!row;
    }


    // ─── PUBLIC CHECKS ─────────────────────────────────────────────────────────

    /** Kiểm tra quyền tạo phòng họp */
    async checkCreate(userId: string, flowConfig?: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;

        const processKey = flowConfig || (await this.getDefaultFlowId(userId));
        if (!processKey) return true;

        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền tạo phòng họp');
    }

    /** Kiểm tra quyền cập nhật phòng họp */
    async checkUpdate(userId: string, id: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;
        await this.getRecord(id);

        const processKey = await this.getDefaultFlowId(userId);
        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền chỉnh sửa phòng họp này');
    }

    /** Kiểm tra quyền xóa phòng họp */
    async checkDelete(userId: string, id: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;
        await this.getRecord(id);

        const processKey = await this.getDefaultFlowId(userId);
        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền xóa phòng họp này');
    }

    /** Kiểm tra quyền xem chi tiết phòng họp */
    async checkView(userId: string, id: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;
        await this.getRecord(id);

        const processKey = await this.getDefaultFlowId(userId);
        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền xem phòng họp này');
    }

    /** Kiểm tra quyền xử lý workflow (BPMN action) */
    async checkProcess(userId: string, id: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;
        await this.getRecord(id);

        // Vì Phòng họp (MeetingRoom) không có quy trình workflow (WorkItem) riêng, 
        // quyền xử lý sẽ phụ thuộc vào việc user có trong luồng hay không.
        const processKey = await this.getDefaultFlowId(userId);
        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền xử lý phòng họp này');
    }

    /**
     * Xem danh sách phòng họp (check nhanh).
     * Mọi user thuộc luồng phòng họp đều có thể xem danh sách.
     */
    async checkListAccess(userId: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;

        const processKey = await this.getDefaultFlowId(userId);
        if (!processKey) return true;

        if (await this.isInFlow(userId, processKey)) return true;

        throw new ForbiddenException('Bạn không có quyền xem danh sách phòng họp');
    }

    /** Kiểm tra quyền theo feature code (ma trận phân quyền) */
    async checkFeatureAccess(userId: string, featureCode: string): Promise<boolean> {
        if (await this.isAdmin(userId)) return true;

        const processKey = await this.getDefaultFlowId(userId);
        if (!processKey) return true;

        if (await this.isInFlow(userId, processKey)) return true;

        const permissions = await this.sqlsvRepo.getUserPermissions(userId, processKey);
        if (permissions.includes(featureCode)) return true;

        throw new ForbiddenException('Vai trò của bạn chưa được cấp quyền sử dụng chức năng này');
    }
}