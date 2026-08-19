import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Not, In } from 'typeorm';
import { TaskDelegationEntity } from './entity/task-delegation.entity';
import { CreateTaskDelegationDto } from './dto/create-task-delegation.dto';
import { UpdateTaskDelegationDto } from './dto/update-task-delegation.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { GroupUserEntity } from 'src/group-users/entities/group-users.entity';
import { GROUP_CODES } from 'src/variable/CONST_STATUS';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class TaskDelegationService {
  constructor(
    @InjectRepository(TaskDelegationEntity, 'mssqlConnection')
    private readonly delegationRepository: Repository<TaskDelegationEntity>,
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(GroupUserEntity, 'mssqlConnection')
    private readonly groupUserRepository: Repository<GroupUserEntity>,
  ) { }

  private formatDate(date: Date | string | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  }

  private async validateDelegation(fromUserId: string, toUserId: string) {
    const fromUser = await this.userRepository.findOne({
      where: { id: fromUserId },
      relations: ['groupUsers', 'parent'],
    });

    if (!fromUser) throw new BadRequestException('Người uỷ quyền không tồn tại');

    const groupCodes = fromUser.groupUsers?.map(g => g.code) || [];
    const isLeader = groupCodes.includes(GROUP_CODES.TONG_GIAM_DOC) || groupCodes.includes(GROUP_CODES.PHO_GIAM_DOC);
    const isHead = groupCodes.includes(GROUP_CODES.TRUONG_PHONG);

    if (!isLeader && !isHead) {
      throw new BadRequestException('Chỉ Lãnh đạo hoặc Trưởng phòng mới có quyền uỷ quyền');
    }

    if (isHead && !isLeader) {
      // Nếu chỉ là trưởng phòng -> Kiểm tra toUser có cùng phòng ban không
      const toUser = await this.userRepository.findOne({
        where: { id: toUserId },
        relations: ['parent'],
      });
      if (!toUser) throw new BadRequestException('Người được uỷ quyền không tồn tại');

      if (String(fromUser.parent?.id) !== String(toUser.parent?.id)) {
        throw new BadRequestException('Trưởng phòng chỉ có thể uỷ quyền cho thành viên trong phòng ban của mình');
      }
    }
  }

  private async checkOverlap(fromUserId: string, startDate: Date, endDate: Date, excludeId?: number): Promise<void> {
    const qb = this.delegationRepository
      .createQueryBuilder('d')
      .where('d.fromUserId = :fromUserId', { fromUserId })
      .andWhere('d.status = 1')
      .andWhere('d.startDate <= :endDate', { endDate })
      .andWhere('d.endDate >= :startDate', { startDate });

    if (excludeId) {
      qb.andWhere('d.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new BadRequestException(
        'Bạn đã có bản ghi uỷ quyền đang có hiệu lực trong khoảng thời gian này. Vui lòng kiểm tra lại.',
      );
    }
  }

  async create(createDto: CreateTaskDelegationDto, userId: string): Promise<TaskDelegationEntity> {
    const fromUserId = userId; // Enforce fromUserId = authenticated userId
    // await this.validateDelegation(fromUserId, createDto.toUserId);

    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    await this.checkOverlap(fromUserId, startDate, endDate);

    const delegation = this.delegationRepository.create({
      ...createDto,
      fromUserId,
      startDate,
      endDate,
      createdById: userId,
    });
    return this.delegationRepository.save(delegation);
  }

  async findAll(query: any, userId?: string): Promise<{ data: TaskDelegationEntity[]; total: number }> {
    const { fromDate, endDate, toUserId, status } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    // Nếu không có fromUserId trong query, dùng userId hiện tại (phục vụ cả list lẫn export)
    const fromUserId = query.fromUserId || userId || null;
    const qb = this.delegationRepository.createQueryBuilder('d')
      .leftJoinAndSelect('d.fromUser', 'fromUser')
      .leftJoinAndSelect('fromUser.parent', 'fromParent')
      .leftJoinAndSelect('d.toUser', 'toUser')
      .leftJoinAndSelect('toUser.parent', 'toParent')
      .where('d.status != :deleted', { deleted: 3 });

    if (fromDate) {
      qb.andWhere('d.startDate >= :fromDate', { fromDate: new Date(fromDate) });
    }
    if (endDate) {
      qb.andWhere('d.endDate <= :endDate', { endDate: new Date(endDate) });
    }
    if (toUserId) {
      qb.andWhere('d.toUserId = :toUserId', { toUserId });
    }
    if (fromUserId) {
      qb.andWhere('d.fromUserId = :fromUserId', { fromUserId });
    }

    const now = new Date();
    if (status) {
      if (status === '1' || status === 1) { // Active
        qb.andWhere('d.status = 1 AND d.startDate <= :now AND d.endDate >= :now', { now });
      } else if (status === '2' || status === 2) { // Expired
        qb.andWhere('d.status = 1 AND d.endDate < :now', { now });
      }
    }

    qb.orderBy('d.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const transformedData = data.map(item => {
      let statusText = 'Hết hiệu lực';
      let statusBgColor = '#FFDCD9';
      let statusTextColor = '#F44336';

      if (item.status === 1 && now <= item.endDate) {
        statusText = 'Có hiệu lực';
        statusBgColor = '#D0FFDE';
        statusTextColor = '#007222';
      }

      return {
        ...item,
        fromUser: item.fromUser?.name,
        toUser: item.toUser?.name,
        startDate: this.formatDate(item.startDate),
        endDate: this.formatDate(item.endDate),
        createdAt: this.formatDate(item.createdAt),
        statusText: statusText,
        // statusBgColor: statusBgColor,
        // statusTextColor: statusTextColor,
        status: `<div style="background-color: ${statusBgColor}; color: ${statusTextColor}; text-align: center; border-radius: 20px; padding: 4px 12px; font-weight: 500; display: inline-block; min-width: 100px;">${statusText}</div>`,
      };
    });

    return { data: transformedData as any, total };
  }

  async findOne(id: number): Promise<any> {
    const delegation = await this.delegationRepository.findOne({
      where: { id, status: Not(3) },
      relations: ['fromUser', 'toUser', 'fromUser.parent', 'toUser.parent'],
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${id} not found`);
    }

    const now = new Date();
    let statusText = 'Hết hiệu lực';
    let statusBgColor = '#FFDCD9';
    let statusTextColor = '#F44336';

    if (delegation.status === 1 && now <= delegation.endDate) {
      statusText = 'Có hiệu lực';
      statusBgColor = '#D0FFDE';
      statusTextColor = '#007222';
    }

    return {
      ...delegation,
      fromUser: delegation.fromUser?.name,
      fromUserUnit: delegation.fromUser?.parent?.name,
      toUser: delegation.toUser?.name,
      toUserUnit: delegation.toUser?.parent?.name,
      startDate: this.formatDate(delegation.startDate),
      endDate: this.formatDate(delegation.endDate),
      createdAt: this.formatDate(delegation.createdAt),
      statusText: statusText,
      statusNumber: delegation.status,
      status: `<div style="background-color: ${statusBgColor}; color: ${statusTextColor}; text-align: center; border-radius: 20px; padding: 4px 12px; font-weight: 500; display: inline-block; min-width: 100px;">${statusText}</div>`,
    };
  }

  async findActiveByToUser(toUserId: string): Promise<any[]> {
    const now = new Date();
    const delegations = await this.delegationRepository.find({
      where: {
        toUserId,
        status: 1,
        startDate: LessThanOrEqual(now),
        endDate: MoreThanOrEqual(now),
      },
      relations: ['fromUser', 'fromUser.parent'],
    });

    return delegations.map(item => {
      let statusText = 'Hết hiệu lực';
      let statusBgColor = '#FFDCD9';
      let statusTextColor = '#F44336';

      if (item.status === 1 && now <= item.endDate) {
        statusText = 'Có hiệu lực';
        statusBgColor = '#D0FFDE';
        statusTextColor = '#007222';
      }

      return {
        ...item,
        fromUser: item.fromUser?.name,
        toUser: item.toUser?.name,
        startDate: this.formatDate(item.startDate),
        endDate: this.formatDate(item.endDate),
        createdAt: this.formatDate(item.createdAt),
        statusText: statusText,
        // statusBgColor: statusBgColor,
        // statusTextColor: statusTextColor,
        status: `<div style="background-color: ${statusBgColor}; color: ${statusTextColor}; text-align: center; border-radius: 20px; padding: 4px 12px; font-weight: 500; display: inline-block; min-width: 100px;">${statusText}</div>`,
      };
    });
  }

  async findActiveEntitiesByToUser(toUserId: string): Promise<TaskDelegationEntity[]> {
    return this.delegationRepository.find({
      where: {
        toUserId,
        status: 1,
      },
      relations: ['fromUser', 'fromUser.parent', 'fromUser.groupUsers'],
    });
  }

  async update(id: number, updateDto: UpdateTaskDelegationDto, userId: string): Promise<TaskDelegationEntity> {
    const delegation = await this.delegationRepository.findOne({ where: { id } });
    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${id} not found`);
    }
    // if (updateDto.fromUserId || updateDto.toUserId) {
    //   await this.validateDelegation(
    //     updateDto.fromUserId || delegation.fromUserId,
    //     updateDto.toUserId || delegation.toUserId
    //   );
    // }

    const newStartDate = updateDto.startDate ? new Date(updateDto.startDate) : delegation.startDate;
    const newEndDate = updateDto.endDate ? new Date(updateDto.endDate) : delegation.endDate;

    await this.checkOverlap(delegation.fromUserId, newStartDate, newEndDate, id);

    if (updateDto.startDate) (delegation as any).startDate = new Date(updateDto.startDate);
    if (updateDto.endDate) (delegation as any).endDate = new Date(updateDto.endDate);

    Object.assign(delegation, updateDto);
    return this.delegationRepository.save(delegation);
  }

  async remove(id: number): Promise<void> {
    const delegation = await this.delegationRepository.findOne({ where: { id } });
    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${id} not found`);
    }
    delegation.status = 3;
    await this.delegationRepository.save(delegation);
  }

  async removeMany(ids: number[]): Promise<void> {
    await this.delegationRepository.createQueryBuilder()
      .update(TaskDelegationEntity)
      .set({ status: 3 })
      .where("id IN (:...ids)", { ids })
      .execute();
  }
}
