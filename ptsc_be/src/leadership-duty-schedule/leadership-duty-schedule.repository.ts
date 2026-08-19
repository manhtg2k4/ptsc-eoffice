import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In, QueryRunner } from 'typeorm';
import {
  LeadershipDutySchedule,
  LeadershipDutyDetail,
} from 'src/leadership-duty-schedule/entity/leadership-duty-schedule.entity';

@Injectable()
export class LeadershipDutyScheduleRepository {
  private readonly logger = new Logger(LeadershipDutyScheduleRepository.name);

  constructor(
    @InjectRepository(LeadershipDutySchedule, 'mssqlConnection')
    private readonly repository: Repository<LeadershipDutySchedule>,
    @InjectDataSource('mssqlConnection')
    private readonly dataSource: DataSource,
  ) {}

  async withTransaction<T>(callback: (queryRunner: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    let isTransactionStarted = false;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      isTransactionStarted = true;

      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (isTransactionStarted) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }

  // ==================== TRANSACTION METHODS ====================

  async createWithTransaction(
    queryRunner: QueryRunner,
    data: Partial<LeadershipDutySchedule>,
  ): Promise<LeadershipDutySchedule> {
    const schedule = this.repository.create(data);
    return queryRunner.manager.save(LeadershipDutySchedule, schedule);
  }

  async updateWithTransaction(
    queryRunner: QueryRunner,
    schedule: LeadershipDutySchedule,
  ): Promise<LeadershipDutySchedule> {
    return queryRunner.manager.save(LeadershipDutySchedule, schedule);
  }

  async deleteWithTransaction(queryRunner: QueryRunner, id: string): Promise<void> {
    await queryRunner.manager.update(
      LeadershipDutySchedule,
      { id },
      { status: 0, updatedAt: new Date() },
    );
  }

  async deleteManyWithTransaction(queryRunner: QueryRunner, ids: string[]): Promise<number> {
    if (!ids?.length) return 0;

    const result = await queryRunner.manager.update(
      LeadershipDutySchedule,
      { id: In(ids) },
      { status: 0, updatedAt: new Date() },
    );
    return result.affected || 0;
  }

  // ==================== QUERY METHODS ====================

  async findById(id: string): Promise<LeadershipDutySchedule | null> {
    if (!id) return null;
    return this.repository.findOne({ where: { id, status: 1 } });
  }

  async findByIdWithCreator(id: string): Promise<any> {
    if (!id) return null;

    return this.repository
      .createQueryBuilder('s')
      .leftJoin('users', 'u', 's.created_by = u.id')
      .select([
        's.id',
        's.title',
        's.week',
        's.year',
        's.from_date',
        's.to_date',
        's.schedule_date',
        's.schedule_time',
        's.created_by',
        'u.name as created_by_name',
        's.created_at',
        's.updated_at',
      ])
      .where('s.id = :id', { id })
      .andWhere('s.status = 1')
      .getRawOne();
  }

  async checkDuplicateSchedule(week: number, year: number, excludeId?: string): Promise<boolean> {
    const query = this.repository
      .createQueryBuilder('schedule')
      .where('schedule.week = :week', { week })
      .andWhere('schedule.year = :year', { year })
      .andWhere('schedule.status = 1');

    if (excludeId) query.andWhere('schedule.id != :excludeId', { excludeId });

    const count = await query.getCount();
    return count > 0;
  }

  async executeListQuery(params: {
    selectFields: string;
    whereClause: string;
    joins: string;
    orderBy: string;
    pagination: { offset: number; limit: number };
  }): Promise<{ items: any[]; total: number }> {
    const { selectFields, whereClause, joins, orderBy, pagination } = params;

    // Count + data query chạy song song - tiết kiệm ~40-60% thời gian list
    const countSql = `
      SELECT COUNT(DISTINCT lds.id) as total
      FROM leadership_duty_schedules lds
      ${joins}
      ${whereClause}
    `;

    const dataSql = `
      SELECT ${selectFields}
      FROM leadership_duty_schedules lds
      ${joins}
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET ${pagination.offset} ROWS
      FETCH NEXT ${pagination.limit} ROWS ONLY
    `;

    const [countResult, items] = await Promise.all([
      this.dataSource.query(countSql),
      this.dataSource.query(dataSql),
    ]);

    const total = parseInt(countResult[0]?.total || '0', 10);
    return { items, total };
  }

  async getScheduledWeeks(year: number): Promise<number[]> {
    if (!year || Number.isNaN(Number(year))) return [];

    const rows = await this.repository
      .createQueryBuilder('s')
      .select('DISTINCT s.week', 'week')
      .where('s.year = :year', { year })
      .andWhere('s.status = :status', { status: 1 })
      .orderBy('s.week', 'DESC')
      .getRawMany();

    return rows.map(r => Number(r.week));
  }
}

@Injectable()
export class LeadershipDutyDetailRepository {
  constructor(
    @InjectRepository(LeadershipDutyDetail, 'mssqlConnection')
    private readonly repository: Repository<LeadershipDutyDetail>,
  ) {}

  // ==================== TRANSACTION METHODS ====================

  async bulkInsertWithTransaction(
    queryRunner: QueryRunner,
    details: Partial<LeadershipDutyDetail>[],
  ): Promise<LeadershipDutyDetail[]> {
    if (!details?.length) return [];
    const entities = details.map(d => this.repository.create(d));
    return queryRunner.manager.save(LeadershipDutyDetail, entities);
  }

  async deleteByScheduleIdWithTransaction(queryRunner: QueryRunner, scheduleId: string): Promise<void> {
    if (!scheduleId) return;
    await queryRunner.manager.update(
      LeadershipDutyDetail,
      { scheduleId },
      { status: 0, updatedAt: new Date() },
    );
  }

  async deleteByScheduleIdsWithTransaction(queryRunner: QueryRunner, scheduleIds: string[]): Promise<void> {
    if (!scheduleIds?.length) return;
    await queryRunner.manager.update(
      LeadershipDutyDetail,
      { scheduleId: In(scheduleIds) },
      { status: 0, updatedAt: new Date() },
    );
  }

  // ==================== QUERY METHODS ====================

  async findByScheduleId(scheduleId: string): Promise<LeadershipDutyDetail[]> {
    if (!scheduleId) return [];
    return this.repository.find({
      where: { scheduleId, status: 1 },
      order: { dutyDate: 'ASC' },
    });
  }

  async findByScheduleIdsWithLeader(scheduleIds: string[]): Promise<any[]> {
    if (!scheduleIds?.length) return [];

    return this.repository
      .createQueryBuilder('d')
      .leftJoin('users', 'u', 'd.leader_id = u.id')
      .select([
        'd.schedule_id as scheduleId',
        'd.id as id',
        'd.duty_date as dutyDate',
        'd.day_of_week as dayOfWeek',
        'd.leader_id as leaderId',
        'u.name as leaderName',
        'd.notes as notes',
        'd.status as status',
      ])
      .where('d.schedule_id IN (:...scheduleIds)', { scheduleIds })
      .andWhere('d.status = 1')
      .orderBy('d.duty_date', 'ASC')
      .getRawMany();
  }

  async findByScheduleIdWithLeader(scheduleId: string): Promise<any[]> {
    if (!scheduleId) return [];

    return this.repository
      .createQueryBuilder('d')
      .leftJoin('users', 'u', 'd.leader_id = u.id')
      .select([
        'd.id as d_id',
        'd.duty_date as duty_date',
        'd.day_of_week as day_of_week',
        'd.leader_id as leader_id',
        'u.name as leader_name',
        'd.notes as d_notes',
        'd.status as d_status',
      ])
      .where('d.schedule_id = :scheduleId', { scheduleId })
      .andWhere('d.status = 1')
      .orderBy('d.duty_date', 'ASC')
      .getRawMany();
  }

  create(data: Partial<LeadershipDutyDetail>): LeadershipDutyDetail {
    return this.repository.create(data);
  }
}