import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingEntity } from './entities/meeting.entity';
import { MeetingParticipantEntity } from './entities/meeting-participant.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { GoogleCalendarService, GoogleCalendarEventInput } from './google-calendar-service';
import { BackgroundGoogleCalendarSyncService } from './background-google-calendar-sync.service';

@Injectable()
export class GoogleCalendarSyncService {
  private readonly logger = new Logger(GoogleCalendarSyncService.name);

  constructor(
    @InjectRepository(MeetingEntity, 'mssqlConnection')
    private meetingRepo: Repository<MeetingEntity>,

    @InjectRepository(MeetingParticipantEntity, 'mssqlConnection')
    private participantRepo: Repository<MeetingParticipantEntity>,

    @InjectRepository(UserEntity, 'mssqlConnection')
    private userRepo: Repository<UserEntity>,

    @Inject(forwardRef(() => GoogleCalendarService))
    private googleCalendarService: GoogleCalendarService,

    @Inject(forwardRef(() => BackgroundGoogleCalendarSyncService))
    private backgroundGoogleCalendarSyncService: BackgroundGoogleCalendarSyncService,
  ) { }

  // =========================
  // SAFE GUARD
  // =========================
  private isGoogleReady(): boolean {
    return !!this.googleCalendarService;
  }

  // =========================
  // GET GOOGLE USER (FIX CRITICAL)
  // =========================
  private async getGoogleUser(participant: MeetingParticipantEntity) {
    const user = await this.userRepo.findOne({
      where: { id: participant.userId },
      select: ['id', 'googleAccessToken', 'googleRefreshToken', 'googleEmail'],
    });

    if (!user?.googleAccessToken || !user?.googleRefreshToken) {
      return null;
    }

    return {
      googleAccessToken: user.googleAccessToken,
      googleRefreshToken: user.googleRefreshToken,
    };
  }

  // =========================
  // SYNC CREATE / UPDATE
  // =========================
  async syncParticipantMeetingToGoogleCalendar(
    participantId: string,
    meetingId: string,
    input: GoogleCalendarEventInput,
  ): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
    try {
      if (!this.isGoogleReady()) {
        const msg = 'GOOGLE_CALENDAR_NOT_CONFIGURED';

        await this.participantRepo.update(
          { id: participantId },
          {
            googleCalendarSyncStatus: 'FAILED',
            googleCalendarSyncError: msg,
          },
        );

        return { success: false, error: msg };
      }

      const participant = await this.participantRepo.findOne({
        where: { id: participantId },
      });

      if (!participant) throw new Error('Participant not found');

      const meeting = await this.meetingRepo.findOne({
        where: { id: meetingId },
      });

      if (!meeting) throw new Error('Meeting not found');

      // =========================
      // RESOLVE EMAIL
      // =========================
      let email = participant.googleEmail;

      if (!email) {
        email =
          await this.backgroundGoogleCalendarSyncService.resolveParticipantEmail(
            participant,
            meeting,
          );
      }

      if (!email) {
        // await this.participantRepo.update(
        //   { id: participantId },
        //   {
        //     googleCalendarSyncStatus: 'SKIPPED',
        //     googleCalendarSyncError: 'NO_EMAIL',
        //   },
        // );

        return {
          success: false,
          error: 'NO_EMAIL',
        };
      }
      const user = await this.getGoogleUser(participant);
      if (!user) {
        await this.participantRepo.update(
          { id: participantId },
          {
            googleCalendarSyncStatus: 'SKIPPED',
            googleCalendarSyncError: 'USER_NOT_CONNECTED',
          },
        );

        return {
          success: false,
          error: 'USER_NOT_CONNECTED',
        };
      }
      const finalInput: GoogleCalendarEventInput = {
        ...input,
        attendees: input.attendees?.length ? input.attendees : [email],
      };

      let googleEventId = participant.googleCalendarEventId;

      // =========================
      // CREATE / UPDATE
      // =========================
      if (!googleEventId) {
        const result = await this.googleCalendarService.createEvent(
          user,
          finalInput,
        );

        googleEventId = result.googleEventId;
      } else {
        await this.googleCalendarService.updateEvent(
          user,
          googleEventId,
          finalInput,
        );
      }

      // =========================
      // UPDATE DB
      // =========================
      await this.participantRepo.update(
        { id: participantId },
        {
          googleCalendarEventId: googleEventId,
          googleCalendarSynced: true,
          googleCalendarSyncAt: new Date(),
          googleCalendarSyncStatus: 'SYNCED',
          googleCalendarSyncError: null,
          googleCalendarHidden: false,
        },
      );

      return { success: true, googleEventId };
    } catch (error) {
      await this.participantRepo.update(
        { id: participantId },
        {
          googleCalendarSyncStatus: 'FAILED',
          googleCalendarSyncError: error.message,
        },
      );

      return { success: false, error: error.message };
    }
  }

  // =========================
  // UPDATE
  // =========================
  async updateParticipantMeetingOnGoogleCalendar(
    participantId: string,
    input: GoogleCalendarEventInput,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const participant = await this.participantRepo.findOne({
        where: { id: participantId },
      });

      if (!participant?.googleCalendarEventId) {
        throw new Error('Not synced');
      }

      const user = await this.getGoogleUser(participant);
      if (!user) {
        await this.participantRepo.update(
          { id: participantId },
          {
            googleCalendarSyncStatus: 'SKIPPED',
            googleCalendarSyncError: 'USER_NOT_CONNECTED',
          },
        );

        return {
          success: false,
          error: 'USER_NOT_CONNECTED',
        };
      }
      await this.googleCalendarService.updateEvent(
        user,
        participant.googleCalendarEventId,
        input,
      );

      await this.participantRepo.update(
        { id: participantId },
        {
          googleCalendarSyncAt: new Date(),
          googleCalendarSyncStatus: 'SYNCED',
          googleCalendarSyncError: null,
        },
      );

      return { success: true };
    } catch (error) {
      await this.participantRepo.update(
        { id: participantId },
        {
          googleCalendarSyncStatus: 'FAILED',
          googleCalendarSyncError: error.message,
        },
      );

      return { success: false, error: error.message };
    }
  }

  // =========================
  // DELETE / HIDE
  // =========================
  /**
   * Delete participant from Google Calendar using pre-captured data
   * This method is used when participant data is passed directly (participant already deleted from DB)
   */
  async deleteParticipantMeetingFromGoogleCalendarWithData(
    participantId: string,
    googleCalendarEventId: string,
    userId: string,
    hideInstead = true,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!googleCalendarEventId) {
        return { success: true };
      }

      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['id', 'googleAccessToken', 'googleRefreshToken', 'googleEmail'],
      });
      if (!user) {
        await this.participantRepo.update(
          { id: participantId },
          {
            googleCalendarSyncStatus: 'SKIPPED',
            googleCalendarSyncError: 'USER_NOT_CONNECTED',
          },
        );

        return {
          success: false,
          error: 'USER_NOT_CONNECTED',
        };
      }
      if (!user?.googleAccessToken || !user?.googleRefreshToken) {
        this.logger.warn(
          `[DELETE] User ${userId} not connected to Google Calendar, skipping deletion of event ${googleCalendarEventId}`,
        );
        return { success: false, error: 'User not connected to Google Calendar' };
      }

      // ✅ FIX: chỉ truyền đúng field cần thiết
      await this.googleCalendarService.deleteEvent(
        {
          googleAccessToken: user.googleAccessToken,
          googleRefreshToken: user.googleRefreshToken,
        },
        googleCalendarEventId,
      );


      return { success: true };
    } catch (error) {
      this.logger.error(
        `[DELETE_ERROR] Error deleting participant ${participantId} from Google Calendar: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  async deleteParticipantMeetingFromGoogleCalendar(
    participantId: string,
    hideInstead = true,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const participant = await this.participantRepo.findOne({
        where: { id: participantId },
      });

      if (!participant?.googleCalendarEventId) {
        return { success: true };
      }

      const user = await this.getGoogleUser(participant);

      if (!user) {
        await this.participantRepo.update(
          { id: participantId },
          {
            googleCalendarSyncStatus: 'SKIPPED',
            googleCalendarSyncError: 'USER_NOT_CONNECTED',
          },
        );

        return {
          success: false,
          error: 'USER_NOT_CONNECTED',
        };
      }
      await this.googleCalendarService.deleteEvent(
        user,
        participant.googleCalendarEventId,
      );

      await this.participantRepo.update(
        { id: participantId },
        hideInstead
          ? {
            googleCalendarHidden: true,
            googleCalendarSyncStatus: 'SYNCED',
          }
          : {
            googleCalendarEventId: null,
            googleCalendarSynced: false,
            googleCalendarSyncStatus: 'PENDING',
            googleCalendarHidden: true,
            googleCalendarSyncError: null,
          },
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =========================
  // HIDE ALL
  // =========================
  async hideMeetingFromAllParticipantCalendars(meetingId: string) {
    const participants = await this.participantRepo.find({
      where: {
        meetingUnitId: meetingId,
        googleCalendarSynced: true,
        googleCalendarHidden: false,
      },
    });

    let hiddenCount = 0;

    for (const p of participants) {
      const res =
        await this.deleteParticipantMeetingFromGoogleCalendar(
          p.id,
          true,
        );

      if (res.success) hiddenCount++;
    }

    return { success: true, hiddenCount };
  }

  // =========================
  // RETRY FAILED
  // =========================
  async retryFailedSyncs(): Promise<void> {
    const failed = await this.participantRepo.find({
      where: { googleCalendarSyncStatus: 'FAILED' },
      relations: ['unit'],
    });

    for (const p of failed) {
      if (!p.unit?.meetingId) continue;

      const meeting = await this.meetingRepo.findOne({
        where: { id: p.unit.meetingId },
      });

      if (!meeting) continue;

      const input: GoogleCalendarEventInput = {
        title: meeting.title,
        description: meeting.content || undefined,
        location: meeting.location || meeting.roomIds || undefined,
        startTime: new Date(
          `${meeting.meetingDate}T${meeting.meetingTime}`,
        ).toISOString(),
        endTime: new Date(
          `${meeting.meetingDate}T${meeting.meetingTime}`,
        ).toISOString(),
      };

      await this.syncParticipantMeetingToGoogleCalendar(
        p.id,
        meeting.id,
        input,
      );
    }
  }

  // =========================
  // STATUS
  // =========================
  async getParticipantSyncStatus(participantId: string) {
    const participant = await this.participantRepo.findOne({
      where: { id: participantId },
      select: [
        'id',
        'googleCalendarEventId',
        'googleCalendarSynced',
        'googleCalendarSyncStatus',
        'googleCalendarSyncError',
        'googleCalendarSyncAt',
        'googleCalendarHidden',
      ],
    });

    if (!participant) throw new Error('Not found');

    return {
      isSynced: participant.googleCalendarSynced,
      googleEventId: participant.googleCalendarEventId,
      status: participant.googleCalendarSyncStatus,
      error: participant.googleCalendarSyncError,
      syncedAt: participant.googleCalendarSyncAt,
      isHidden: participant.googleCalendarHidden,
    };
  }
}