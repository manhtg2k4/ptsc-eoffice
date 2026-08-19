import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { In, Repository, IsNull, EntityManager } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isLeapYear from 'dayjs/plugin/isLeapYear';

import { MeetingEntity } from '../entities/meeting.entity';
import {
  MeetingRecurrenceEntity,
  RecurrenceType,
} from '../entities/meeting-recurrence.entity';

import { getMeetingStartTime } from '../helper/build.meeting.filter';
import { MEETING_PARTICIPANT_STATE, MEETING_STATE } from '../helper/meeting.mapper';
import { MeetingRoomRepository } from 'src/meeting-rooms/meeting-rooms.repository';
import { MeetingParticipantEntity, ParticipantState } from '../entities/meeting-participant.entity';
import { MeetingService } from '../meeting.service';
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import BpmnEngineService from 'src/bpmn/bpmn-engine.service';
import { BackgroundGoogleCalendarSyncService } from '../background-google-calendar-sync.service';
import { GoogleCalendarEventInput } from '../google-calendar-service';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isLeapYear);

const BATCH_SIZE = 30;

@Injectable()
export class MeetingStatusCronService {
  private readonly logger = new Logger(MeetingStatusCronService.name);

  private isRunning = false;
  private isGenerating = false;
  private isTriggering = false;
  private ruleCache = new Map<string, any>()
  constructor(
    private readonly runtimeDbService: RuntimeDbService,
    private readonly bpmnEngine: BpmnEngineService,
    private readonly sqlRepo: MSSQLRepository,
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private readonly meetingRepo: Repository<MeetingEntity>,

    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private readonly meetingParticipantRepo: Repository<MeetingParticipantEntity>,

    private readonly meetingRoomRepo: MeetingRoomRepository,
    @Inject(forwardRef(() => MeetingService))
    private readonly meetingService: MeetingService,
    @Inject(forwardRef(() => BackgroundGoogleCalendarSyncService))
    private readonly backgroundGoogleCalendarSyncService: BackgroundGoogleCalendarSyncService,
  ) { }

  private async acquireLock(manager: EntityManager, lockName: string): Promise<boolean> {
    try {
      const result = await manager.query(
        `DECLARE @res INT;
         EXEC @res = sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
         SELECT @res as result;`,
        [lockName]
      );
      const code = result?.[0]?.result;
      return code === 0 || code === 1;
    } catch (e) {
      this.logger.error(`Error acquiring lock ${lockName}`, e);
      return false;
    }
  }

  /* ===================================================
     CRON UPDATE STATE & AUTO FINISH (MERGED)
  ====================================================== */
  async handleCron(): Promise<void> {
    const today = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
    const yesterday = dayjs().tz('Asia/Ho_Chi_Minh').subtract(1, 'day').format('YYYY-MM-DD');
    const tomorrow = dayjs().tz('Asia/Ho_Chi_Minh').add(1, 'day').format('YYYY-MM-DD');
    const meetings = await this.meetingRepo
      .createQueryBuilder('m')
      .setLock('dirty_read')
      .where('CONVERT(VARCHAR(10), m.meeting_date, 23) BETWEEN :yesterday AND :tomorrow', { yesterday, tomorrow })
      .andWhere('m.meetingState IN (:...states)', {
        states: [
          MEETING_STATE.DU_KIEN,
          MEETING_STATE.DIEU_CHINH,
          MEETING_STATE.CHUAN_BI,
          MEETING_STATE.DANG_HOP,
        ],
      })
      .andWhere('m.is_template = 0')
      .andWhere('(m.status = :status OR m.status IS NULL)', { status: '1' })
      .getMany();

    // this.logger.log(`[handleCron] Quet thay ${meetings.length} cuoc hop trong khoang ngay ${yesterday} den ${today}`);

    await Promise.all(
      meetings.map(async (meeting) => {
        if (
          meeting.meetingState === MEETING_STATE.DU_KIEN ||
          meeting.meetingState === MEETING_STATE.DIEU_CHINH
        ) {
          await this.processMeeting(meeting);
        }

        if (
          meeting.meetingState === MEETING_STATE.CHUAN_BI &&
          meeting.meetingMode === 'OUTSIDETHECOMPANY' &&
          !meeting.isCancelled
        ) {
          await this.processStartMeeting(meeting);
        }

        if (
          (meeting.meetingState === MEETING_STATE.DANG_HOP ||
            meeting.meetingState === MEETING_STATE.CHUAN_BI) &&
          !meeting.isCancelled
        ) {
          await this.processAutoFinish(meeting);
        }
      })
    );
  }

  private async autoDeleteRecalledFiles() {
    try {
      const today = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      const yesterday = dayjs().tz('Asia/Ho_Chi_Minh').subtract(1, 'day').format('YYYY-MM-DD');

      const endedMeetings = await this.meetingRepo
        .createQueryBuilder('m')
        .setLock('dirty_read')
        .where('CONVERT(VARCHAR(10), m.meeting_date, 23) BETWEEN :yesterday AND :today', { yesterday, today })
        .andWhere('m.meetingState = :state', { state: MEETING_STATE.KET_THUC })
        .andWhere('m.isRecalledFilesDeleted = :isDeleted', { isDeleted: false })
        .andWhere('m.is_template = 0')
        .andWhere('(m.status = :status OR m.status IS NULL)', { status: '1' })
        .getMany();

      if (!endedMeetings.length) return;

      const tz = 'Asia/Ho_Chi_Minh';
      const now = dayjs().tz(tz);
      const meetingIdsToDeleteFiles: string[] = [];

      for (const meeting of endedMeetings) {
        let endedTime: dayjs.Dayjs;

        if (meeting.endedAt) {
          endedTime = dayjs(meeting.endedAt).tz(tz);
        } else if (meeting.meetingTime && meeting.meetingDate) {
          const [start, end] = meeting.meetingTime.split('-');
          if (!end) continue;
          const dateStr = typeof meeting.meetingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meeting.meetingDate)
            ? meeting.meetingDate
            : dayjs(meeting.meetingDate).tz(tz).format('YYYY-MM-DD');
          endedTime = dayjs.tz(`${dateStr} ${end.trim()}`, 'YYYY-MM-DD HH:mm', tz);
        } else {
          continue;
        }

        const diffMinutes = now.diff(endedTime, 'minute');
        if (diffMinutes >= 30) {
          meetingIdsToDeleteFiles.push(meeting.id);
        }
      }

      if (meetingIdsToDeleteFiles.length > 0) {
        const dbName = process.env.SQLSERVER_DATABASE ? `${process.env.SQLSERVER_DATABASE}.dbo` : 'dbo';
        const placeholders = meetingIdsToDeleteFiles.map((_, i) => `@${i}`).join(',');
        const queryUpdate = `
          UPDATE fr
          SET fr.status = 3
          FROM ${dbName}.file_relations fr
          JOIN ${dbName}.files f ON fr.file_id = f.id
          JOIN ${dbName}.meeting_tasks mt ON fr.object_id = CONVERT(nvarchar(36), mt.id)
          WHERE fr.object_type = 'MeetingTask'
            AND mt.meeting_id IN (${placeholders})
            AND f.is_recall = 1
            AND fr.status = 1;

          UPDATE f
          SET f.status = 3, f.updated_at = GETUTCDATE()
          FROM ${dbName}.files f
          JOIN ${dbName}.file_relations fr ON fr.file_id = f.id
          JOIN ${dbName}.meeting_tasks mt ON fr.object_id = CONVERT(nvarchar(36), mt.id)
          WHERE fr.object_type = 'MeetingTask'
            AND mt.meeting_id IN (${placeholders})
            AND f.is_recall = 1
            AND f.status = 1;

          UPDATE meetings
          SET is_recalled_files_deleted = 1, updated_at = GETUTCDATE()
          WHERE id IN (${placeholders});
        `;
        await this.meetingRepo.query(queryUpdate, meetingIdsToDeleteFiles);
        this.logger.log(`Auto deleted recalled files and marked meetings: ${meetingIdsToDeleteFiles.join(', ')}`);
      }
    } catch (e) {
      this.logger.error('Error in autoDeleteRecalledFiles', e);
    }
  }

  private async processAutoFinish(meeting: MeetingEntity) {
    try {
      const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
      const now = dayjs().tz(tz);

      if (!meeting.meetingTime) return;

      const [start, end] = meeting.meetingTime.split('-');
      if (!end) return;

      const dateStr = typeof meeting.meetingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(meeting.meetingDate)
        ? meeting.meetingDate
        : dayjs(meeting.meetingDate).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');

      // build end datetime
      let endDateTime = dayjs.tz(`${dateStr} ${end}`, 'YYYY-MM-DD HH:mm', tz);
      if (meeting.meetingMode !== 'OUTSIDETHECOMPANY') {
        endDateTime = endDateTime.add(30, 'minute'); // +30 phút grace
      }

      if (now.isAfter(endDateTime)) {
        if (meeting.meetingState !== MEETING_STATE.KET_THUC) {
          meeting.meetingState = MEETING_STATE.KET_THUC;
          meeting.attendanceLocked = true;
          meeting.endedAt = now.toDate();

          await this.meetingRepo.save(meeting);

          // Xóa toàn bộ workitem của cuộc họp
          await this.meetingService.deleteWorkItemsByDocumentIds([meeting.id]);

          const attendanceStart = Date.now();

          const subQuery = this.meetingParticipantRepo
            .createQueryBuilder()
            .subQuery()
            .select('mu.id')
            .from('meeting_units', 'mu')
            .where('mu.meeting_id = :meetingId')
            .getQuery();

          const result = await this.meetingParticipantRepo
            .createQueryBuilder()
            .update(MeetingParticipantEntity)
            .set({
              attendanceState: 'NOT_CHECKED',
            })
            .where(`meeting_unit_id IN ${subQuery}`)
            .andWhere(
              '(attendance_state IS NULL OR attendance_state NOT IN (:...excludedStates))',
              {
                excludedStates: ['CHECKED', 'NOT_REQUIRED'],
              },
            )
            .setParameter('meetingId', meeting.id)
            .execute();

          const attendanceEnd = Date.now();


        }
      }
    } catch (e) {
      this.logger.error(
        `[${meeting.id}] Auto finish failed`,
        e,
      );
    }
  }

  private async processMeeting(meeting: MeetingEntity) {
    try {
      const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
      const now = dayjs().tz(tz);

      const startTime = getMeetingStartTime(
        meeting.meetingDate,
        meeting.meetingTime,
        tz,
      );

      const prepareTime = startTime.subtract(30, 'minute');

      //this.logger.log(
      // `[processMeeting] Kiem tra cuoc hop ID=${meeting.id}, Title="${meeting.title}", State=${meeting.meetingState}, Ngay=${meeting.meetingDate}, Gio=${meeting.meetingTime}, Now=${now.format('YYYY-MM-DD HH:mm:ss')}, PrepareTime=${prepareTime.format('YYYY-MM-DD HH:mm:ss')}`
      // );

      if (now.isBefore(prepareTime)) {
        // this.logger.log(`[processMeeting] Bo qua do chua den gio chuan bi (can >= ${prepareTime.format('YYYY-MM-DD HH:mm:ss')})`);
        return;
      }

      if (meeting.meetingState !== MEETING_STATE.CHUAN_BI) {
        this.logger.log(`[processMeeting] Cuộc họp ID=${meeting.id}, Title="${meeting.title}", needConfirmation=${meeting.needConfirmation} (type: ${typeof meeting.needConfirmation}) đã đến mốc trước 30 phút (PrepareTime=${prepareTime.format('YYYY-MM-DD HH:mm:ss')}). Chuyển trạng thái sang CHUAN_BI.`);
        meeting.meetingState = MEETING_STATE.CHUAN_BI;
        await this.meetingRepo.save(meeting);
      }
    } catch (e) {
      this.logger.error(`[${meeting.id}] update state failed`, e);
    }
  }

  private async processStartMeeting(meeting: MeetingEntity) {
    try {
      const tz = meeting.timezone || 'Asia/Ho_Chi_Minh';
      const now = dayjs().tz(tz);

      const startTime = getMeetingStartTime(
        meeting.meetingDate,
        meeting.meetingTime,
        tz,
      );

      if (now.isAfter(startTime) || now.isSame(startTime)) {
        meeting.meetingState = MEETING_STATE.DANG_HOP;
        meeting.startedAt = now.toDate();
        await this.meetingRepo.save(meeting);
      }
    } catch (e) {
      this.logger.error(`[${meeting.id}] update state to DANG_HOP failed`, e);
    }
  }


  /* =======================
     CRON SINH PHIÊN ĐẦU TIÊN
     Chỉ chạy khi template đã duyệt nhưng chưa có phiên instance nào
  ======================== */
  @SafeCron('0 0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async generateRecurringInstances(): Promise<void> {
    // this.logger.log('Bat dau cron job: generateRecurringInstances (0 0 2 * * *)');
    if (this.isGenerating) {
      // this.logger.log('Bo qua generateRecurringInstances: dang chay');
      return;
    }
    this.isGenerating = true;

    try {
      const templates = await this.meetingRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.recurrence', 'r')
        .where('t.isTemplate = :isTemplate', { isTemplate: true })
        .andWhere('t.parentId IS NULL')
        .andWhere('t.isCancelled = :isCancelled', { isCancelled: false })
        .andWhere('t.nextInstanceScheduled = :scheduled', { scheduled: false })
        .andWhere((qb) => {
          const subQuery = qb
            .subQuery()
            .select('1')
            .from('meetings', 'm')
            .where('m.parent_id = t.id')
            .andWhere('m.status IN (:...statuses)', { statuses: ['1', '0', '2', '4'] })
            .getQuery();
          return `NOT EXISTS ${subQuery}`;
        })
        .getMany();

      // this.logger.log(`generateRecurringInstances: Tim thay ${templates.length} template de xu ly`);

      for (const template of templates) {
        try {
          const recurrence = template.recurrence;
          if (!recurrence) continue;
          if (recurrence.type === RecurrenceType.KHONG) continue;

          // Sử dụng transaction và applock để tránh việc chạy song song từ nhiều instance
          await this.meetingRepo.manager.transaction(async (manager) => {
            const lockName = `meeting_recurrence_template_${template.id}`;
            const acquired = await this.acquireLock(manager, lockName);
            if (!acquired) {
              // this.logger.log(`Template ${template.id} bi khoa boi tien trinh khac. Bo qua.`);
              return;
            }

            // Lấy tất cả các instance đang hoạt động của template này
            const instances = await manager.find(MeetingEntity, {
              where: {
                parentId: template.id,
                status: In(['1', '0', '2', '4']), // Đang hoạt động (không phải '3')
              },
              order: {
                createdAt: 'ASC',
              },
            });

            const activeInstance = instances.length > 0 ? instances[0] : null;
            if (instances.length > 1) {
              // Có trùng lặp -> Soft delete những cái trùng lặp sau
              const duplicates = instances.slice(1);
              const duplicateIds = duplicates.map((d) => d.id);
              this.logger.warn(`Clean up duplicate meetings for template ${template.id}: ${duplicateIds.join(', ')}`);
              await manager.update(MeetingEntity, { id: In(duplicateIds) }, { status: '3' });
            }

            // Chỉ tạo phiên đầu nếu chưa có bất kỳ instance nào
            if (activeInstance) return;

            // Kiểm tra đã duyệt chưa
            const approved = await this.meetingService.isMeetingApproved(template.id);
            if (!approved) return;

            // Tạo phiên đầu tiên = ngày của template
            const firstDate = typeof template.meetingDate === 'string'
              ? template.meetingDate
              : dayjs(template.meetingDate).format('YYYY-MM-DD');

            // Kiểm tra hết hạn trước khi tạo phiên đầu
            if (
              recurrence.endDate &&
              dayjs(firstDate).isAfter(dayjs(recurrence.endDate))
            ) {
              return;
            }

            // this.logger.log(`Dang sinh phien recurring dau tien cho template ${template.id} vao ngay ${firstDate}`);
            const instance = await this.meetingService.cloneMeetingFromSource(
              template.id,
              firstDate,
              template.id,
            );

            await manager.save(instance);
            await this.meetingService.cloneAudit(template.id, instance.id);

            // Cập nhật work item và thành phần như hàm update
            await this.meetingService.autoConfirmMeeting(instance.id, { addedTasks: true });
          });

        } catch (e) {
          this.logger.error(
            `[${template.id}] Sinh phien dau tien that bai`,
            e,
          );
        }
      }
    } catch (e) {
      this.logger.error('Loi nghiem trong trong generateRecurringInstances', e);
    } finally {
      this.isGenerating = false;
      // this.logger.log('Hoan thanh cron job: generateRecurringInstances');
    }
  }

  /* =======================
     CRON SINH PHIÊN TIẾP THEO
     Khi 1 phiên kết thúc (KET_THUC) → sinh phiên tiếp theo theo lịch lặp
  ======================== */
  @SafeCron('0 0 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async triggerNextRecurringInstance(): Promise<void> {
    // this.logger.log('Bat dau cron job: triggerNextRecurringInstance (0 0 1 * * *)');
    if (this.isTriggering) {
      // this.logger.log('Bo qua triggerNextRecurringInstance: dang chay');
      return;
    }
    this.isTriggering = true;

    try {
      // 1. Tìm các phiên đã kết thúc, chưa sinh phiên tiếp theo (lọc trong khoảng 2 ngày gần đây)
      const today = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
      const startDate = dayjs().tz('Asia/Ho_Chi_Minh').subtract(2, 'day').format('YYYY-MM-DD');

      const endedInstances = await this.meetingRepo
        .createQueryBuilder('m')
        .setLock('dirty_read')
        .where('m.meetingState = :state', { state: MEETING_STATE.KET_THUC })
        .andWhere('m.isTemplate = :isTemplate', { isTemplate: false })
        .andWhere('m.parentId IS NOT NULL')
        .andWhere('m.isCancelled = :cancelled', { cancelled: false })
        .andWhere('m.nextInstanceScheduled = :scheduled', { scheduled: false })
        .andWhere('CONVERT(VARCHAR(10), m.meeting_date, 23) BETWEEN :startDate AND :today', { startDate, today })
        .getMany();

      // 2. Tự động phục hồi (healing): Lấy tất cả template hoạt động, tìm phiên mới nhất của từng template.
      // Nếu phiên mới nhất đã KET_THUC, đưa vào danh sách xử lý để đảm bảo luôn có phiên tiếp theo.
      const templates = await this.meetingRepo
        .createQueryBuilder('m')
        .setLock('dirty_read')
        .where('m.isTemplate = :isTemplate', { isTemplate: true })
        .andWhere('m.parentId IS NULL')
        .andWhere('m.isCancelled = :cancelled', { cancelled: false })
        .andWhere('m.nextInstanceScheduled = :scheduled', { scheduled: false })
        .getMany();

      for (const template of templates) {
        const latestInstance = await this.meetingRepo
          .createQueryBuilder('m')
          .setLock('dirty_read')
          .where('m.parentId = :parentId', { parentId: template.id })
          .andWhere('m.isCancelled = :cancelled', { cancelled: false })
          .andWhere('m.status IN (:...statuses)', { statuses: ['1', '0', '2', '4'] })
          .orderBy('m.meetingDate', 'DESC')
          .addOrderBy('m.createdAt', 'DESC')
          .getOne();

        if (latestInstance && latestInstance.meetingState === MEETING_STATE.KET_THUC && !latestInstance.nextInstanceScheduled) {
          if (!endedInstances.some((inst) => inst.id === latestInstance.id)) {
            endedInstances.push(latestInstance);
          }
        }
      }

      // this.logger.log(`triggerNextRecurringInstance: Tim thay ${endedInstances.length} phien da ket thuc/moi nhat de xu ly`);

      for (const instance of endedInstances) {
        try {
          // this.logger.log(`Dang xu ly kich hoat phien tiep theo cho cuoc hop ${instance.id}`);
          await this.handleNextRecurringInstance(instance);
        } catch (e) {
          this.logger.error(
            `[${instance?.id}] Sinh phien tiep theo that bai`,
            e,
          );
        }
      }
    } catch (e) {
      if (e.message?.includes('next_instance_scheduled')) {
        this.logger.warn('Column next_instance_scheduled missing in DB. Please run: ALTER TABLE meetings ADD next_instance_scheduled BIT DEFAULT 0 NOT NULL');
      } else {
        this.logger.error('Loi nghiem trong trong triggerNextRecurringInstance', e);
      }
    } finally {
      this.isTriggering = false;
      // this.logger.log('Hoan thanh cron job: triggerNextRecurringInstance');
    }
  }

  async handleNextRecurringInstance(instance: MeetingEntity): Promise<void> {
    const rootParentId = instance.parentId;
    if (!rootParentId) return;

    await this.meetingRepo.manager.transaction(async (manager) => {
      const lockName = `meeting_next_instance_${instance.id}`;
      const acquired = await this.acquireLock(manager, lockName);
      if (!acquired) {
        // this.logger.log(`Instance ${instance.id} is locked by another process. Skipping.`);
        return;
      }

      // Load lại instance trong transaction để xem đã bị update nextInstanceScheduled chưa
      const currentInstance = await manager.findOne(MeetingEntity, {
        where: { id: instance.id },
      });

      if (!currentInstance || currentInstance.isCancelled) {
        return;
      }

      if (currentInstance.nextInstanceScheduled) {
        return;
      }

      // Load template + recurrence
      const template = await manager.findOne(MeetingEntity, {
        where: { id: rootParentId },
        relations: ['recurrence'],
      });

      if (template && !template.recurrence) {
        if (template.recurrenceGroupId) {
          template.recurrence = (await manager.findOne(MeetingRecurrenceEntity, {
            where: { id: template.recurrenceGroupId },
          })) ?? undefined;
        } else {
          template.recurrence = (await manager.findOne(MeetingRecurrenceEntity, {
            where: { meeting: { id: template.id } },
          })) ?? undefined;
        }
      }

      if (!template?.recurrence) {
        // Không có recurrence → đánh dấu để không xử lý lại
        currentInstance.nextInstanceScheduled = true;
        await manager.save(currentInstance);
        return;
      }

      const recurrence = template.recurrence;
      if (recurrence.type === RecurrenceType.KHONG) {
        currentInstance.nextInstanceScheduled = true;
        await manager.save(currentInstance);
        return;
      }

      const currentDate = typeof currentInstance.meetingDate === 'string'
        ? currentInstance.meetingDate
        : dayjs(currentInstance.meetingDate).format('YYYY-MM-DD');

      // Tính ngày tiếp theo
      const nextDate = this.calcNextRecurrenceDate(recurrence, currentDate);

      // Đánh dấu đã xử lý instance này (dù có tạo hay không)
      currentInstance.nextInstanceScheduled = true;
      await manager.save(currentInstance);

      // Kiểm tra xem đã hết lịch lặp chưa
      const isEnded = !nextDate || (recurrence.endDate && dayjs(nextDate).isAfter(dayjs(recurrence.endDate)));

      if (isEnded) {
        // Đã hết lịch lặp -> Đánh dấu cả template chính để sau này không quét lại nữa
        template.nextInstanceScheduled = true;
        await manager.save(template);
        return;
      }

      // Kiểm tra phiên cho nextDate đã tồn tại chưa
      const existedInstances = await manager.find(MeetingEntity, {
        where: {
          parentId: rootParentId,
          meetingDate: nextDate,
          status: In(['1', '0', '2', '4']),
        },
        order: {
          createdAt: 'ASC',
        },
      });

      if (existedInstances.length > 0) {
        if (existedInstances.length > 1) {
          // Có trùng lặp -> Dọn dẹp
          const duplicates = existedInstances.slice(1);
          const duplicateIds = duplicates.map((d) => d.id);
          this.logger.warn(`Clean up duplicate meetings for parent ${rootParentId} on date ${nextDate}: ${duplicateIds.join(', ')}`);
          await manager.update(MeetingEntity, { id: In(duplicateIds) }, { status: '3' });
        }
        return; // Đã tồn tại phiên cho ngày này rồi
      }

      // Lấy phiên gần nhất để clone (chính là instance vừa kết thúc)
      const nextInstance = await this.meetingService.cloneMeetingFromSource(
        currentInstance.id,
        nextDate,
        rootParentId,
      );

      await manager.save(nextInstance);
      await this.meetingService.cloneAudit(currentInstance.id, nextInstance.id);

      // Cập nhật work item và thành phần như hàm update
      await this.meetingService.autoConfirmMeeting(nextInstance.id, { addedTasks: true });
    });
  }

  /* =======================
     TÍNH NGÀY TIẾP THEO theo loại lịch lặp
  ======================== */
  private calcNextRecurrenceDate(
    recurrence: MeetingRecurrenceEntity,
    currentDate: string,
  ): string | null {
    const current = dayjs(currentDate);
    const start = dayjs(recurrence.startDate); // ngày gốc, dùng cho THANG / TUY_CHINH

    switch (recurrence.type) {

      // ── NGAY: mỗi ngày kế tiếp ──────────────────────────────────────────
      case RecurrenceType.NGAY:
        return current.add(1, 'day').format('YYYY-MM-DD');

      // ── TUAN: tìm ngày kế tiếp trong danh sách daysOfWeek ───────────────
      // matchRecurrence dùng date.format('ddd').toUpperCase() → "MON","TUE"…
      case RecurrenceType.TUAN: {
        if (!recurrence.daysOfWeek) return null;

        // Ánh xạ tên viết tắt 3 chữ → số dayjs (0=Sun … 6=Sat)
        const DAY_MAP: Record<string, number> = {
          SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
        };

        const allowedDays = recurrence.daysOfWeek
          .split(',')
          .map((d) => DAY_MAP[d.trim().toUpperCase()])
          .filter((n) => n !== undefined);

        if (!allowedDays.length) return null;

        // Tìm ngày tiếp theo (bắt đầu từ currentDate + 1, tối đa 7 ngày)
        let next = current.add(1, 'day');
        for (let i = 0; i < 7; i++) {
          if (allowedDays.includes(next.day())) {
            return next.format('YYYY-MM-DD');
          }
          next = next.add(1, 'day');
        }
        return null;
      }

      // ── THANG: cùng ngày-gốc (startDate.date()), tháng sau ─────────────
      // Dùng startDate để không bị drift khi tháng trước ngắn hơn
      case RecurrenceType.THANG: {
        const originalDay = start.date(); // ngày của lần đầu tạo lịch
        const nextMonth = current.add(1, 'month');
        const lastDay = nextMonth.daysInMonth();
        const targetDay = Math.min(originalDay, lastDay);
        return nextMonth.date(targetDay).format('YYYY-MM-DD');
      }

      // ── NAM: dùng recurrence.dayOfYear (MM-DD), năm sau ─────────────────
      // matchRecurrence dùng dayOfYear, xử lý cả 29/02 năm nhuận
      case RecurrenceType.NAM: {
        if (!recurrence.dayOfYear) return null;

        const [monthStr, dayStr] = recurrence.dayOfYear.split('-').map(Number);
        const nextYear = current.add(1, 'year');

        // Xử lý 29/02 trong năm không nhuận → dùng 28/02
        if (monthStr === 2 && dayStr === 29 && !nextYear.isLeapYear()) {
          return nextYear.month(1).date(28).format('YYYY-MM-DD'); // month() là 0-based
        }

        const targetMonth = nextYear.month(monthStr - 1);
        const lastDay = targetMonth.daysInMonth();
        const targetDay = Math.min(dayStr, lastDay);
        return targetMonth.date(targetDay).format('YYYY-MM-DD');
      }

      // ── TUY_CHINH: mỗi N ngày tính từ startDate ─────────────────────────
      // matchRecurrence: diff = date.diff(start, 'day'), hợp lệ khi diff % interval === 0
      // → Next = current + interval ngày (luôn khớp vì cùng bội số)
      case RecurrenceType.TUY_CHINH: {
        const interval = Number(recurrence.intervalValue || 1);
        return current.add(interval, 'day').format('YYYY-MM-DD');
      }

      default:
        return null;
    }
  }


  // Lấy các node để lấy config
  private async getRules(version?: string) {

    if (!version) return null

    if (this.ruleCache.has(version))
      return this.ruleCache.get(version)

    const xml = await this.sqlRepo.getBpmnFile(version)

    const { indexes } = await this.runtimeDbService.getModelFromXml(xml)

    const rules = {}

    for (const node of indexes.nodes.values()) {

      if (!node.$type?.includes('Event')) continue

      const ext = getAllNodeExtensionProperties(node)

      if (!ext?.actionCode) continue

      const after = Number(ext.afterTime || 0)
      const noticeTime = Number(ext.noticeTime || 0)
      const roleNode = indexes.laneMap.get(node.id);
      rules[ext.actionCode] = {
        id: node.id,
        role: roleNode,
        node,
        after,
        notice: noticeTime
      }

    }

    this.ruleCache.set(version, rules)

    return rules

  }
  /**
   * Cron mỗi 5 phút
   */
  @SafeCron('*/5 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async run() {
    const nowStr = dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
    const systemNowStr = dayjs().format('YYYY-MM-DD HH:mm:ss');
    // this.logger.log(`Bat dau cron job: run (moi 2 phut) luc ${nowStr} (System UTC/Local: ${systemNowStr})`);
    if (this.isRunning) {
      this.logger.warn('SKIP: cron van dang chay');
      return;
    }

    this.isRunning = true;

    try {
      // 1. Cập nhật trạng thái cuộc họp (Tránh chạy song song)
      await this.handleCron();

      // Gửi cảnh báo trước 24h cho người tạo và người tham gia chưa xác nhận
      await this.meetingService.send24hMeetingWarnings();

      // Tự động xóa tài liệu thu hồi của cuộc họp kết thúc > 30 phút
      await this.autoDeleteRecalledFiles();

      // 2. Xử lý phê duyệt và đồng bộ Google Calendar
      const records = await this.fetchCandidateRecords();
      if (records.length > 0) {
        // this.logger.log(`Cron job run: Tim thay ${records.length} ban ghi phu hop de dong bo Google Calendar.`);
      }

      for (const r of records) {
        try {
          const meetingDateStr = r.meetingDate ? dayjs(r.meetingDate).tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD') : '';
          this.logger.log(`[GoogleCalendarSync & Cron] Đang xử lý cuộc họp ID=${r.id}, Title="${r.title}", needConfirmation=${r.needConfirmation} (type: ${typeof r.needConfirmation}), Ngay=${meetingDateStr}, Gio=${r.meetingTime}`);
          // 1. Giành quyền xử lý cuộc họp (Claim record)
          const claimResult = await this.meetingRepo.update(
            { id: r.id, googleCalendarProcessedByCron: false },
            { googleCalendarProcessedByCron: true },
          );

          if (claimResult.affected === 0) {
            continue; // Đã có server khác giành quyền xử lý bản ghi này trước
          }

          await this.processRecordWithRetry(r);
        } catch (err) {
          // 2. Trả lại quyền xử lý (Revert claim) nếu bị lỗi để có thể chạy lại ở lần sau
          await this.meetingRepo.update(
            { id: r.id },
            { googleCalendarProcessedByCron: false },
          ).catch(revertErr => this.logger.error(`Revert claim that bai cho record ${r.id}`, revertErr));

          // Log and continue to next record - failed records will be retried on next cron tick
          const errMsg = String(err?.message || '').toLowerCase();
          const isDeadlock = err?.number === 1205 || errMsg.includes('deadlock');
          if (isDeadlock) {
            this.logger.warn(`[Deadlock] Record ${r.id} that bai sau tat ca lan thu, se thu lai o tick sau.`);
          } else {
            this.logger.error(`Record ${r.id} xu ly that bai`, err);
          }
        }
      }

    } finally {
      this.isRunning = false;
      // this.logger.log('Hoan thanh cron job: run');
    }
  }
  /**
   * Query record cần xử lý
   * Exclude meetings that have already been processed by cron
   */
  private async fetchCandidateRecords() {
    const startDate = dayjs().tz('Asia/Ho_Chi_Minh').subtract(2, 'day').format('YYYY-MM-DD');
    return this.meetingRepo
      .createQueryBuilder('m')
      .setLock('dirty_read')
      .where('m.meetingState = :state', { state: MEETING_STATE.CHUAN_BI })
      .andWhere('m.googleCalendarProcessedByCron = :processed', { processed: false })
      .andWhere('m.isCancelled = :isCancelled', { isCancelled: false })
      .andWhere('m.isTemplate = :isTemplate', { isTemplate: false })
      .andWhere('m.meetingDate >= :startDate', { startDate })
      .orderBy('m.createdAt', 'DESC')
      .limit(BATCH_SIZE)
      .getMany()
  }

  private async processRecordWithRetry(r: any, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.processRecord(r);
      } catch (err) {
        const errMsg = String(err?.message || err?.originalError?.message || '').toLowerCase();
        const errCode = String(err?.code || err?.originalError?.code || '').toUpperCase();
        const errNumber = err?.number || err?.originalError?.info?.number || err?.originalError?.number;

        const isDeadlock =
          errNumber === 1205 ||
          errCode === 'EDEADLOCK' ||
          errMsg.includes('deadlock') ||
          errMsg.includes('deadlocked');

        if (isDeadlock && attempt < maxRetries) {
          const delay = attempt * 1000 + Math.random() * 500;
          this.logger.warn(
            `[Deadlock] Record ${r.id}, retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms. Error: ${err?.message}`,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }
  }

  private async processRecord(r: any) {
    const rules = await this.getRules(r.bpmnVersion);
    if (!rules) return;

    const xml = await this.sqlRepo.getBpmnFile(r.bpmnVersion);
    const { indexes } = await this.runtimeDbService.getModelFromXml(xml);

    const meetingId = r.id;
    this.logger.log(`[processRecord] Đang kiểm tra cuộc họp ID=${meetingId}, Title="${r.title}", needConfirmation=${r.needConfirmation} (type: ${typeof r.needConfirmation}), bpmnVersion=${r.bpmnVersion}`);

    const { participants, selectedUnits } = await this.sqlRepo.getParticipantsAndSelectedUnits(meetingId);
    const workItems = await this.sqlRepo.getOpenWorkItemsByMeeting(meetingId);

    const hasTaskUsers = participants.filter(p => p.hasTask);
    const noTaskUsers = participants.filter(p => !p.hasTask);
    const unitIds = selectedUnits.map(u => u.unitId);

    const userRule = r.needConfirmation === false ? rules['AUTO_COMFIRM_USER'] : null;
    const unitRule = r.needConfirmation === false ? rules['AUTO_COMFIRM_UNIT'] : null;

    // ===== TẠO MAPPING userId → nextNodeId =====
    const userNodeMap: Record<string, string> = {};
    if (userRule) {
      const node = userRule.node;
      const outs = indexes.outgoingBySource.get(node.id) || [];

      for (const f of outs) {
        const target = f.targetRef;
        let nextFlows = outs;

        if (target && (target.$type === 'bpmn:ExclusiveGateway' || target.$type === 'bpmn:InclusiveGateway')) {
          nextFlows = indexes.outgoingBySource.get(target.id) || [];
        }

        for (const flow of nextFlows) {
          let condition = flow.conditionExpression?.body?.trim() || '';
          if (condition.startsWith('{') && condition.endsWith('}')) {
            condition = condition.slice(1, -1);
          }
          const condStr = condition.toLowerCase().replace(/\s+/g, '');
          const { node: nextNode } = this.bpmnEngine.nextNodeByFlow(flow, indexes);
          if (!nextNode) continue;

          if (condStr.includes('hastask')) {
            hasTaskUsers.forEach(u => userNodeMap[u.userId] = nextNode.id);
          }
          if (condStr.includes('notask')) {
            noTaskUsers.forEach(u => userNodeMap[u.userId] = nextNode.id);
          }
        }
      }
    }

    // ===== TẠO MAPPING unitId → nextNodeId =====
    const unitNodeMap: Record<string, string> = {};
    if (unitRule && unitIds.length) {
      const node = unitRule.node;
      const outs = indexes.outgoingBySource.get(node.id) || [];
      for (const flow of outs) {
        const { node: nextNode } = this.bpmnEngine.nextNodeByFlow(flow, indexes);
        if (nextNode) unitIds.forEach(u => unitNodeMap[u] = nextNode.id);
      }
    }

    // ===== LOG tổng hợp mapping trước khi update =====
    // console.log('[INFO] User → Next Node mapping:', userNodeMap);
    // console.log('[INFO] Unit → Next Node mapping:', unitNodeMap);

    // ===== XỬ LÝ TỪNG WORK ITEM VỚI TRANSACTION RIÊNG =====
    this.logger.log(`[processRecord] Cuộc họp ID=${meetingId}: Giá trị needConfirmation = ${r.needConfirmation} (type: ${typeof r.needConfirmation}), Đánh giá điều kiện bỏ qua = ${r.needConfirmation !== false && r.needConfirmation !== 0}`);

    if (r.needConfirmation !== false && r.needConfirmation !== 0) {
      // Bỏ qua chuyển bước tự động BPMN khi cuộc họp cần xác nhận để người dùng giữ nút tại "Tiếp nhận" (Activity_1kmmgo3)
      this.logger.log(`[processRecord] Cuộc họp ID=${meetingId} có needConfirmation = ${r.needConfirmation} -> KẾT LUẬN: BỎ QUA không tự động cập nhật.`);
      return true;
    }

    this.logger.log(`[processRecord] Cuộc họp ID=${meetingId} có needConfirmation = ${r.needConfirmation} -> KẾT LUẬN: BẮT ĐẦU tự động cập nhật cho ${workItems.length} work items và ${participants.length} người tham gia.`);

    for (const wi of workItems) {
      const assigneeId = wi.assignee_user_id;
      if (!assigneeId) continue;

      const currentNodeId = wi.node_id;
      const nextNodeId = userNodeMap[assigneeId] || unitNodeMap[assigneeId];

      if (!nextNodeId) continue;
      if (currentNodeId === nextNodeId) continue;

      const tx = await this.sqlRepo.begin({ lowDeadlockPriority: true });
      try {
        // ===== UPDATE WORK ITEM OR DELETE IF ENDEVENT =====
        const nextNode = indexes.nodes.get(nextNodeId);
        const isEndEvent = nextNode?.$type === 'bpmn:EndEvent';
        if (isEndEvent) {
          await this.sqlRepo.removeWorkItem(meetingId, wi.id, tx);
          await this.sqlRepo.removeWorkItemByConditions({
            documentId: meetingId,
            assigneeUserId: assigneeId,
          }, tx);
        } else {
          await this.sqlRepo.updateWorkItemNode(wi.id, nextNodeId, tx);
          wi.node_id = nextNodeId;
        }

        // ===== UPDATE PARTICIPANT nếu là user (Chỉ áp dụng khi cuộc họp không cần xác nhận needConfirmation = false) =====
        if (r.needConfirmation === false && (hasTaskUsers.some(p => p.userId === assigneeId) || noTaskUsers.some(p => p.userId === assigneeId))) {
          const isNoTask = noTaskUsers.some(p => p.userId === assigneeId);
          const targetState = isNoTask ? MEETING_PARTICIPANT_STATE.DONE : MEETING_PARTICIPANT_STATE.CONFIRMED;
          this.logger.log(`[processRecord] Cuộc họp ID=${meetingId}: Tự động cập nhật participant userId=${assigneeId} sang trạng thái ${targetState}`);
          await this.sqlRepo.updateParticipantStateByUserTx(
            meetingId,
            assigneeId,
            targetState,
            tx
          );
        }

        // ===== UPDATE UNIT nếu là unit =====
        if (unitIds.includes(assigneeId)) {
          this.logger.log(`[processRecord] Cuộc họp ID=${meetingId}: Tự động xác nhận đơn vị unitId=${assigneeId}`);
          await this.sqlRepo.confirmUnitJoinMeeting(tx, meetingId, assigneeId);
        }

        await this.sqlRepo.commit(tx);
      } catch (err) {
        await this.sqlRepo.rollback(tx);
        throw err;
      }
    }

    this.logger.log(`[processRecord] Cuộc họp ID=${meetingId}: Đã hoàn thành xử lý tự động cập nhật.`);

    // try {
    //   await this.meetingService.autoConfirmMeeting(meetingId);
    // } catch (autoConfirmErr) {
    //   this.logger.error(`[processRecord] autoConfirmMeeting failed for meeting ID=${meetingId}`, autoConfirmErr);
    // }

    // ===== MARK MEETING AS PROCESSED FOR GOOGLE CALENDAR SYNC =====
    await this.meetingRepo.update(
      { id: meetingId },
      { googleCalendarProcessedByCron: true },
    );

    // ===== QUEUE GOOGLE CALENDAR SYNC (NON-BLOCKING) =====
    // Get confirmed participants and queue them for async sync
    const confirmedParticipants = await this.meetingParticipantRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.unit', 'unit')
      .where('p.participantState IN (:...states)', {
        states: ['CONFIRMED', 'DONE']
      })
      .andWhere('unit.meetingId = :meetingId', { meetingId })
      .getMany();

    if (confirmedParticipants.length > 0) {
      // Validate meeting date and time
      if (!r.meetingDate) {
        this.logger.warn(
          `Cannot sync: Meeting ${meetingId} has no meetingDate`,
        );
      } else {
        const startTimeStr =
          r.meetingTime?.split('-')[0] || '09:00';
        const endTimeStr =
          r.meetingTime?.split('-')[1] || '10:00';

        let meetingDateStr: string;

        if (typeof r.meetingDate === 'string') {
          // nếu đã là YYYY-MM-DD thì dùng luôn
          if (r.meetingDate.includes('-')) {
            meetingDateStr = r.meetingDate;
          } else {
            // fallback DD/MM/YYYY
            const [day, month, year] = r.meetingDate.split('/');
            meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else {
          // ❌ KHÔNG dùng toISOString (tránh lệch ngày)
          const d = new Date(r.meetingDate);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          meetingDateStr = `${year}-${month}-${day}`;
        }

        // ✅ giữ timezone +07:00
        const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
        const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

        const eventInput: GoogleCalendarEventInput = {
          title: r.title,
          description: r.content,
          startTime: startDateTime,
          endTime: endDateTime,
          reminders: [
            {
              method: 'email',
              minutes: 60,
            },
          ],
        };

        // Queue each participant for sync
        for (const participant of confirmedParticipants) {
          this.backgroundGoogleCalendarSyncService.queueParticipantSync(
            participant.id,
            meetingId,
            eventInput,
          );
        }

      }
    }

    return true;
  }
}
