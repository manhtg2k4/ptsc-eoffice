/**
 * Background Google Calendar Sync Service
 * Handles non-blocking, fire-and-forget Google Calendar synchronization
 * Uses EventEmitter pattern for background task queuing
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Repository, In, Not, IsNull } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingEntity } from './entities/meeting.entity';
import { MeetingParticipantEntity, UserType } from './entities/meeting-participant.entity';
import { OrganizationUnitEntity } from 'src/organization-unit/organization-unit_sql/organization-unit.entity';
import { GoogleCalendarSyncService } from './google-calendar-sync-service';
import { GoogleCalendarEventInput } from './google-calendar-service';
import { SQLSVRepository } from 'src/database/sqlsvRepo';

interface SyncQueueItem {
  participantId: string;
  meetingId: string;
  eventInput?: GoogleCalendarEventInput;
  action: 'sync' | 'delete' | 'hide';
  retryCount?: number;
  // For deletion: old participant data (captured before DB deletion)
  participantData?: {
    id: string;
    googleCalendarEventId: string | null;
    googleCalendarHidden: boolean;
    googleEmail: string | null;
    userId: string;
  };
}

@Injectable()
export class BackgroundGoogleCalendarSyncService {
  private readonly logger = new Logger(BackgroundGoogleCalendarSyncService.name);
  private syncQueue: SyncQueueItem[] = [];
  private syncEventEmitter: EventEmitter;
  private isProcessing = false;
  private readonly BATCH_PROCESS_INTERVAL = 5000; // Process queue every 5 seconds

  constructor(
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private participantRepo: Repository<MeetingParticipantEntity>,
    @InjectRepository(OrganizationUnitEntity, 'mssqlConnection')
    private organizationUnitRepo: Repository<OrganizationUnitEntity>,
    @Inject(forwardRef(() => GoogleCalendarSyncService))
    private googleCalendarSyncService: GoogleCalendarSyncService,
    private sqlsvRepo: SQLSVRepository,
  ) {
    this.syncEventEmitter = new EventEmitter();
    this.initializeQueueProcessor();
  }
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /**
   * Initialize the background queue processor
   */
  private async initializeQueueProcessor(): Promise<void> {
    while (true) {
      if (this.syncQueue.length === 0) {
        await this.sleep(1000);
        continue;
      }

      const item = this.syncQueue.shift();
      if (!item) continue;

      try {
        await this.processSyncItem(item);

        // delay giữa mỗi request (quan trọng)
        await this.sleep(500); // 300–1000ms

      } catch (error) {
        this.logger.error(
          `Error processing sync item for participant ${item.participantId}: ${error.message}`,
        );

        item['retryCount'] = (item['retryCount'] || 0) + 1;

        if (item['retryCount'] <= 3) {
          this.syncQueue.push(item);
        } else {
          this.logger.error(`[DROP] ${item.participantId}`);
        }
      }
    }
  }

  /**
   * Queue a participant for Google Calendar sync (non-blocking, fire-and-forget)
   * @param participantId Participant ID
   * @param meetingId Meeting ID
   * @param eventInput Optional event input data
   */
  queueParticipantSync(
    participantId: string,
    meetingId: string,
    eventInput?: GoogleCalendarEventInput,
  ): void {
    this.syncQueue.push({
      participantId,
      meetingId,
      eventInput,
      action: 'sync',
    });
  }

  /**
   * Queue a participant for deletion from Google Calendar (non-blocking)
   * @param participantId Participant ID
   * @param meetingId Meeting ID
   * @param participantData Old participant data (with googleCalendarEventId, email, etc.)
   */
  queueParticipantDeletion(
    participantId: string,
    meetingId: string,
    participantData?: {
      id: string;
      googleCalendarEventId: string | null;
      googleCalendarHidden: boolean;
      googleEmail: string | null;
      userId: string;
    },
  ): void {
    this.syncQueue.push({
      participantId,
      meetingId,
      action: 'delete',
      participantData,
    });
  }

  /**
   * Queue a participant for hiding from Google Calendar (non-blocking)
   * Used when meeting is cancelled or participant removed
   * @param participantId Participant ID
   * @param meetingId Meeting ID
   */
  queueParticipantHide(participantId: string, meetingId: string): void {
    this.syncQueue.push({
      participantId,
      meetingId,
      action: 'hide',
    });
  }

  /**
   * Queue all participants of a meeting for syncing (non-blocking)
   * Used after meeting confirmation or state change
   * @param meetingId Meeting ID
   * @param eventInput Event input data
   * @param participantFilter Optional filter to sync only specific participants
   */
  async queueMeetingParticipantsSync(
    meetingId: string,
    eventInput: GoogleCalendarEventInput,
    participantFilter?: { ids?: string[]; states?: string[] },
  ): Promise<void> {
    try {
      let query = this.participantRepo.createQueryBuilder('p').where('p.meeting_unit_id IN (SELECT id FROM meeting_units WHERE meeting_id = :meetingId)', { meetingId });

      if (participantFilter?.ids && participantFilter.ids.length > 0) {
        query = query.andWhere('p.id IN (:...ids)', { ids: participantFilter.ids });
      }

      if (participantFilter?.states && participantFilter.states.length > 0) {
        query = query.andWhere('p.participant_state IN (:...states)', { states: participantFilter.states });
      }

      const participants = await query.getMany();

      for (const participant of participants) {
        this.queueParticipantSync(participant.id, meetingId, eventInput);
      }

    } catch (error) {
      this.logger.error(`Error queuing meeting participants: ${error.message}`, error);
    }
  }

  /**
   * Queue all participants for deletion/hiding when meeting is cancelled (non-blocking)
   * @param meetingId Meeting ID
   */
  async queueMeetingCancellation(meetingId: string): Promise<void> {
    try {
      const participants = await this.participantRepo.find({
        where: {
          unit: {
            meetingId: meetingId,
          },
        },
      });

      for (const participant of participants) {
        this.queueParticipantDeletion(participant.id, meetingId);
      }

    } catch (error) {
      this.logger.error(`Error queuing meeting cancellation: ${error.message}`, error);
    }
  }

  /**
   * Tự động đồng bộ toàn bộ các cuộc họp đã xác nhận tham gia của một người dùng lên Google Calendar
   * Được gọi ngay sau khi người dùng đăng nhập/kết nối Google Calendar thành công
   */
  async triggerInitialSyncForUser(userId: string): Promise<void> {
    try {
      this.logger.log(`[Initial Sync] Starting sync for user: ${userId}`);

      const participants = await this.participantRepo.find({
        where: {
          userId: userId,
          participantState: In(['CONFIRMED', 'DONE', 'PROCESSING']),
        },
        relations: ['unit', 'unit.meeting'],
      });

      this.logger.log(
        `[Initial Sync] Found ${participants.length} confirmed/done meeting participations for user ${userId}`,
      );

      let queuedCount = 0;
      for (const participant of participants) {
        const meeting = participant.unit?.meeting;
        if (!meeting || meeting.status === '0' || meeting.isCancelled) {
          continue;
        }

        // Cập nhật googleEmail cho người tham gia nếu chưa có để đảm bảo quá trình đồng bộ hoạt động đúng
        if (!participant.googleEmail) {
          const user = await this.sqlsvRepo.getUserById(userId);
          const email = user?.googleEmail || user?.emailUser || null;
          if (email) {
            participant.googleEmail = email;
            await this.participantRepo.update(participant.id, { googleEmail: email });
          }
        }

        // Đẩy yêu cầu đồng bộ vào queue
        this.queueParticipantSync(participant.id, meeting.id);
        queuedCount++;
      }

      this.logger.log(
        `[Initial Sync] Queued ${queuedCount} meetings for user ${userId} to sync with Google Calendar`,
      );
    } catch (error) {
      this.logger.error(
        `Error triggering initial sync for user ${userId}: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Xóa toàn bộ các sự kiện đã đồng bộ lên Google Calendar của một người dùng cụ thể
   * Đồng thời khôi phục trạng thái đồng bộ về trạng thái chưa đồng bộ trong DB
   */
  async clearAllSyncedEventsForUser(userId: string): Promise<void> {
    try {
      this.logger.log(`[Clear Google Events] Starting deletion of all events for user: ${userId}`);

      const participants = await this.participantRepo.find({
        where: {
          userId: userId,
          googleCalendarEventId: Not(IsNull()),
        },
        relations: ['unit', 'unit.meeting'],
      });

      this.logger.log(
        `[Clear Google Events] Found ${participants.length} synced events to clear for user ${userId}`,
      );

      let queuedCount = 0;
      for (const participant of participants) {
        const meeting = participant.unit?.meeting;
        const meetingId = meeting?.id || 'UNKNOWN';

        // Đẩy yêu cầu xóa vào queue ngầm
        this.queueParticipantDeletion(participant.id, meetingId);
        queuedCount++;
      }

      this.logger.log(
        `[Clear Google Events] Queued ${queuedCount} events for deletion for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error clearing all synced events for user ${userId}: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Resolve participant's Google email address
   * Handles both USER and UNIT type participants
   * @param participant Participant entity
   * @param meeting Meeting entity (used to get secretary info if needed)
   * @returns Email address or null
   */
  async resolveParticipantEmail(
    participant: MeetingParticipantEntity,
    meeting: MeetingEntity,
  ): Promise<string | null> {
    try {
      // If email already stored in participant, use it
      if (participant.googleEmail) {
        return participant.googleEmail;
      }

      let email: string | null = null;

      if (participant.userType === UserType.USER) {
        // Direct user participant - get email from user_id
        const user = await this.sqlsvRepo.getUserById(participant.userId);
        email = user?.emailUser || user?.googleEmail || null;

        // Fallback: if user not found, try using getEmailsByUserIds
        if (!email && participant.userId) {
          const emails = await this.sqlsvRepo.getEmailsByUserIds([participant.userId]);
          email = emails?.[0] || null;
        }
      } else if (participant.userType === UserType.UNIT) {
        const emails = await this.sqlsvRepo.getEmailsByUserIds([participant.userId]);
        email = emails?.[0] || null;
      } else {
        const emails = await this.sqlsvRepo.getEmailsByUserIds([participant.userId]);
        email = emails?.[0] || null;
      }

      // Store resolved email in participant for next time
      if (email) {
        await this.participantRepo.update(
          { id: participant.id },
          { googleEmail: email },
        );
      }

      return email;
    } catch (error) {
      this.logger.warn(
        `Error resolving email for participant ${participant.id}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Resolve email for meeting secretary (when secretary is a unit)
   * Gets the leader's email or organizational unit's email
   * @param secretaryUnitId Unit ID of the secretary
   * @returns Email address or null
   */
  private async resolveMeetingSecretaryEmail(secretaryUnitId: string): Promise<string | null> {
    try {
      // For now, use the organizational unit's email field if available
      // In a more complex scenario, you might want to get the unit leader's email
      const unit = await this.organizationUnitRepo.findOne({
        where: { id: secretaryUnitId },
      });

      if (unit) {
        // Try unit email first
        if (unit.email) {
          return unit.email;
        }

        // Try to get leader's email if leader is set
        if (unit.leader) {
          const leaderUser = await this.sqlsvRepo.getUserById(unit.leader);
          if (leaderUser?.emailUser) {
            return leaderUser.emailUser;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Error resolving meeting secretary email for unit ${secretaryUnitId}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Resolve contact email for an organizational unit
   * Gets the unit's email or leader's email
   * @param unitId Unit ID
   * @returns Email address or null
   */
  private async resolveUnitContactEmail(unitId: string): Promise<string | null> {
    try {
      const unit = await this.organizationUnitRepo.findOne({
        where: { id: unitId },
      });

      if (unit) {
        // Try unit email first
        if (unit.email) {
          return unit.email;
        }

        // Try to get leader's email if leader is set
        if (unit.leader) {
          const leaderUser = await this.sqlsvRepo.getUserById(unit.leader);
          if (leaderUser?.emailUser) {
            return leaderUser.emailUser;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(`Error resolving unit contact email for unit ${unitId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Process the sync queue in batches (runs in background)
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const item = this.syncQueue.shift();
    if (!item) return;

    try {
      await this.processSyncItem(item);
      await this.sleep(500);
    } catch (error) {
      this.logger.error(
        `Error processing ${item.participantId}: ${error.message}`,
      );

      item.retryCount = (item.retryCount || 0) + 1;

      if (item.retryCount <= 3) {
        this.syncQueue.push(item);
      } else {
        this.logger.error(`[DROP] ${item.participantId}`);
      }
    }
  }

  /**
   * Process a single sync queue item
   */
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    // For DELETE action: use participantData passed from meeting update if available
    if (item.action === 'delete' && item.participantData) {
      await this.performDeleteWithData(item.participantData, item.meetingId);
      return;
    }

    // For SYNC/HIDE actions: query participant from database
    const participant = await this.participantRepo.findOne({
      where: { id: item.participantId },
    });

    if (!participant) {
      this.logger.warn(`Participant ${item.participantId} not found, skipping sync`);
      return;
    }

    const meeting = await this.meetingRepo.findOne({
      where: { id: item.meetingId },
    });

    if (!meeting) {
      this.logger.warn(`Meeting ${item.meetingId} not found, skipping sync`);
      return;
    }

    // Resolve email if not already set
    if (item.action === 'sync') {
      const email =
        participant.googleEmail ||
        (await this.resolveParticipantEmail(participant, meeting));

      if (!email) {
        this.logger.warn(`[SKIP] No email for ${item.participantId}`);
        return;
      }
    }

    switch (item.action) {
      case 'sync':
        await this.performSync(participant, meeting, item.eventInput);
        break;
      case 'hide':
        await this.performHide(participant, meeting);
        break;
      case 'delete':
        await this.performDelete(participant, meeting);
        break;
    }
  }

  /**
   * Perform sync operation for a participant
   */
  private async performSync(
    participant: MeetingParticipantEntity,
    meeting: MeetingEntity,
    eventInput?: GoogleCalendarEventInput,
  ): Promise<void> {
    if (!eventInput) {
      this.logger.log(
        `[SYNC] No event input provided for participant ${participant.id}. Constructing it from meeting details.`,
      );
      
      const startTimeStr = meeting.meetingTime?.split('-')[0]?.trim() || '09:00';
      const endTimeStr = meeting.meetingTime?.split('-')[1]?.trim() || '10:00';

      let meetingDateStr: string;

      if (typeof meeting.meetingDate === 'string') {
        if (meeting.meetingDate.includes('-')) {
          meetingDateStr = meeting.meetingDate;
        } else {
          const [day, month, year] = meeting.meetingDate.split('/');
          meetingDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      } else {
        const d = new Date(meeting.meetingDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        meetingDateStr = `${year}-${month}-${day}`;
      }

      const startDateTime = `${meetingDateStr}T${startTimeStr}:00+07:00`;
      const endDateTime = `${meetingDateStr}T${endTimeStr}:00+07:00`;

      eventInput = {
        title: meeting.title,
        description: meeting.content,
        startTime: startDateTime,
        endTime: endDateTime,
      };
    }

    try {
      const result = await this.googleCalendarSyncService.syncParticipantMeetingToGoogleCalendar(
        participant.id,
        meeting.id,
        eventInput,
      );

      if (result.success) {
      } else {
        this.logger.warn(
          `[SYNC_FAILED] Participant ${participant.id} sync failed: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[SYNC_ERROR] Error syncing participant ${participant.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Perform delete operation for a participant using passed data (participant already deleted from DB)
   * This is called when participantData is passed in the queue item
   */
  private async performDeleteWithData(
    participantData: {
      id: string;
      googleCalendarEventId: string | null;
      googleCalendarHidden: boolean;
      googleEmail: string | null;
      userId: string;
    },
    meetingId: string,
  ): Promise<void> {
    try {
      // If no googleCalendarEventId, nothing to delete
      if (!participantData.googleCalendarEventId) {
        return;
      }

      // Use the passed data instead of querying (since participant is already deleted from DB)
      await this.googleCalendarSyncService.deleteParticipantMeetingFromGoogleCalendarWithData(
        participantData.id,
        participantData.googleCalendarEventId,
        participantData.userId,
        true, // hideInstead
      );

    } catch (error) {
      this.logger.error(
        `[DELETE_ERROR] Error deleting participant ${participantData.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Perform delete operation for a participant
   */
  private async performDelete(
    participant: MeetingParticipantEntity,
    meeting: MeetingEntity,
  ): Promise<void> {
    try {
      if (participant.googleCalendarEventId) {
        await this.googleCalendarSyncService.deleteParticipantMeetingFromGoogleCalendar(
          participant.id,
          true,
        );
      }
    } catch (error) {
      this.logger.error(
        `[DELETE_ERROR] Error deleting participant ${participant.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Perform hide operation for a participant (soft delete)
   */
  private async performHide(
    participant: MeetingParticipantEntity,
    meeting: MeetingEntity,
  ): Promise<void> {
    try {
      if (participant.googleCalendarEventId) {
        // Mark as hidden without deleting
        await this.participantRepo.update(
          { id: participant.id },
          {
            googleCalendarHidden: true,
            googleCalendarSyncAt: new Date(),
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `[HIDE_ERROR] Error hiding participant ${participant.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get current queue size (for monitoring/debugging)
   */
  getQueueSize(): number {
    return this.syncQueue.length;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { queueSize: number; isProcessing: boolean; items: SyncQueueItem[] } {
    return {
      queueSize: this.syncQueue.length,
      isProcessing: this.isProcessing,
      items: [...this.syncQueue],
    };
  }
}
