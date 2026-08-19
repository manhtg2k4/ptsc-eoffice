import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import axios from 'axios';

type FcmNotificationPayload = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class FcmPushService {
  private readonly logger = new Logger(FcmPushService.name);
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getProjectId(): string {
    return (this.configService.get<string>('FCM_PROJECT_ID') || '').trim();
  }

  private getClientEmail(): string {
    return (this.configService.get<string>('FCM_CLIENT_EMAIL') || '').trim();
  }

  private getPrivateKey(): string {
    const raw = this.configService.get<string>('FCM_PRIVATE_KEY') || '';
    return raw.replace(/\\n/g, '\n').trim();
  }

  private isConfigured(): boolean {
    return !!(this.getProjectId() && this.getClientEmail() && this.getPrivateKey());
  }

  public hasConfiguration(): boolean {
    return this.isConfigured();
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > now + 60_000) {
      return this.accessTokenCache.token;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.getClientEmail(),
        private_key: this.getPrivateKey(),
        project_id: this.getProjectId(),
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const accessToken = await auth.getAccessToken();
    if (!accessToken) {
      throw new Error('Khong lay duoc access token tu Google Auth');
    }

    this.accessTokenCache = {
      token: accessToken,
      expiresAt: now + 50 * 60 * 1000,
    };

    return accessToken;
  }

  async sendToDevice(payload: FcmNotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn('FCM chua duoc cau hinh day du, bo qua gui push');
      return;
    }

    const accessToken = await this.getAccessToken();
    const projectId = this.getProjectId();

    await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        message: {
          token: payload.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                contentAvailable: true,
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );
  }
}
