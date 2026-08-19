import { Injectable, Logger } from '@nestjs/common';
import { calendar_v3, google, Auth } from 'googleapis';
import { UserEntity } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface GoogleCalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  reminders?: Array<{
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  }>;
}

export interface GoogleCalendarEventResponse {
  googleEventId: string;
  success: boolean;
  message?: string;
}

export interface GoogleTokensFromCodeResponse {
  tokens: Auth.Credentials;
  email?: string | null;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  constructor(
    @InjectRepository(UserEntity, 'mssqlConnection')
    private readonly userRepo: Repository<UserEntity>,
  ) {}
  
  async saveGoogleTokens(userId: string, tokens: { access_token: string, refresh_token: string, email: string }) {
    await this.userRepo.update(userId, {
      googleAccessToken: tokens.access_token,
      googleRefreshToken: tokens.refresh_token,
      googleEmail: tokens.email,
      isGoogleCalendarVerified: true,
      emailUser: tokens.email,
    });
    return { success: true };
  }
  // =========================
  // CREATE OAUTH CLIENT PER USER
  // =========================
  private getClient(user: Partial<UserEntity>): any {
    const clientId = process.env.GG_CLIENT_ID;
    const clientSecret = process.env.GG_CLIENT_SECRET;
    const redirectUri = process.env.GG_REDIRECT_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Google OAuth env config');
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
    });

    return oauth2Client;
  }

  private getCalendar(user: Partial<UserEntity>): calendar_v3.Calendar {
    return google.calendar({
      version: 'v3',
      auth: this.getClient(user),
    });
  }

  // =========================
  // AUTH URL (CONNECT GOOGLE)
  // =========================
  
  generateAuthUrl(userId: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GG_CLIENT_ID,
      process.env.GG_CLIENT_SECRET,
      process.env.GG_REDIRECT_URL,
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId, // Dùng để định danh user khi quay lại
    });
  }

  // =========================
  // GET TOKENS FROM CODE
  // =========================
  async getTokensFromCode(code: string): Promise<GoogleTokensFromCodeResponse> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GG_CLIENT_ID,
      process.env.GG_CLIENT_SECRET,
      process.env.GG_REDIRECT_URL,
    );

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);
    
    const accessToken = tokens.access_token;

    if (!accessToken) {
      throw new Error('Invalid Google access_token');
    }

    await oauth2Client.getTokenInfo(accessToken);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      tokens,
      email: userInfo.data.email,
    };
  }

  // =========================
  // CREATE EVENT (GIỮ NGUYÊN LOGIC)
  // =========================
  async createEvent(
    user: Partial<UserEntity>,
    input: GoogleCalendarEventInput,
  ): Promise<GoogleCalendarEventResponse> {
    try {
      const calendar = this.getCalendar(user);

      const event: any = {
        summary: input.title,
        description: input.description || '',
        start: {
          dateTime: input.startTime, 
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        end: {
          dateTime: input.endTime, 
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        attendees: (input.attendees || []).map(email => ({ email })),
      };
      // Only add location if provided
      if (input.location) {
        event.location = input.location;
      }

      // Add reminders if provided (60 minutes before by default)
      if (input.reminders && input.reminders.length > 0) {
        event.reminders = {
          useDefault: false,
          overrides: input.reminders,
        };
      } else {
        // Default: 60 minutes email reminder
        event.reminders = {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 60,
            },
          ],
        };
      }

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });
      return {
        googleEventId: res.data.id!,
        success: true,
        message: 'Created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Create event error user ${user?.id}: ${error.message}`,
      );
      throw error;
    }
  }

  // =========================
  // UPDATE EVENT (FIXED)
  // =========================
  async updateEvent(
    user: Partial<UserEntity>,
    eventId: string,
    input: GoogleCalendarEventInput,
  ) {
    try {
      const calendar = this.getCalendar(user);
      const event: any = {
        summary: input.title,
        description: input.description || '',
        start: {
          dateTime: input.startTime,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        end: {
          dateTime: input.endTime,
          timeZone: 'Asia/Ho_Chi_Minh',
        },
        attendees: (input.attendees || []).map(email => ({ email })),
      };
      // Only add location if provided
      if (input.location) {
        event.location = input.location;
      }

      // Add reminders if provided (60 minutes before by default)
      if (input.reminders && input.reminders.length > 0) {
        event.reminders = {
          useDefault: false,
          overrides: input.reminders,
        };
      } else {
        // Default: 60 minutes email reminder
        event.reminders = {
          useDefault: false,
          overrides: [
            {
              method: 'email',
              minutes: 60,
            },
          ],
        };
      }

      const res = await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      return {
        googleEventId: res.data.id,
        success: true,
        message: 'Updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Update event error ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  // =========================
  // DELETE EVENT (FIXED)
  // =========================
  async deleteEvent(user: Partial<UserEntity>, eventId: string) {
    try {
      const calendar = this.getCalendar(user);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });

      return {
        success: true,
        message: 'Deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Delete event error ${eventId}: ${error.message}`,
      );

      if (error.code === 404) {
        return { success: true, message: 'Already deleted' };
      }

      throw error;
    }
  }

  // =========================
  // GET EVENT (FIXED)
  // =========================
  async getEvent(user: Partial<UserEntity>, eventId: string) {
    try {
      const calendar = this.getCalendar(user);

      const res = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      return res.data;
    } catch (error) {
      this.logger.error(
        `Get event error ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }
}
