import { Injectable, Logger } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationType, NotificationKey } from 'src/notifycation/notification.enum';
import * as sql from 'mssql';

/**
 * IncomingDocumentReminderService
 *
 * Nhắc hẹn qua email:
 *   - Nhắc trước 24h (1 ngày) trước khi văn bản hết hạn
 *   - Nhắc sau khi hết hạn văn bản 1 ngày
 *
 * Logic chống trùng: mỗi ngày chỉ gửi 1 email/user/document/loại (expiring|expired)
 */
@Injectable()
export class IncomingDocumentReminderService {
    private readonly logger = new Logger(IncomingDocumentReminderService.name);
    private isJobRunning = false;
    private pool: sql.ConnectionPool;
    private dbname: string;
    private appUrl: string;
    private testEmail: string | null = null;

    // Chống trùng email + notification: mỗi ngày reset lại
    private sentEmailKeys = new Set<string>();
    private sentNotifKeys = new Set<string>();
    private lastResetDate = '';

    constructor(
        private readonly mailService: MailService,
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
    ) { }

    async onModuleInit() {
        this.dbname = this.configService.get<string>('SQLSERVER_DATABASE') || '';
        this.appUrl = this.configService.get<string>('REDIRECT_URI_FE', 'http://localhost:3000');
        this.testEmail = this.configService.get<string>('TEST_EMAIL_OVERRIDE', '') || null;
        if (this.testEmail) {
            this.logger.warn(`⚠️ TEST MODE: All reminder emails → ${this.testEmail}`);
        }
        try {
            this.pool = await this.createPool();
        } catch (err) {
            this.logger.error('❌ Failed to create MSSQL pool for reminders', err);
        }
    }

    private async createPool(): Promise<sql.ConnectionPool> {
        const config: sql.config = {
            server: this.configService.get('SQLSERVER_HOST', 'localhost'),
            port: Number(this.configService.get('SQLSERVER_PORT', 1433)),
            user: this.configService.get('SQLSERVER_USER'),
            password: this.configService.get('SQLSERVER_PASSWORD'),
            database: this.configService.get('SQLSERVER_DATABASE'),
            options: {
                encrypt: false,
                trustServerCertificate: true,
                useUTC: false,
                enableArithAbort: true,
                requestTimeout: 30000,
            },
            pool: { max: 3, min: 1, idleTimeoutMillis: 300000 },
        };
        const pool = new sql.ConnectionPool(config);
        await pool.connect();
        return pool;
    }

    private async ensurePool(): Promise<sql.ConnectionPool> {
        if (this.pool?.connected) return this.pool;
        this.pool = await this.createPool();
        return this.pool;
    }

    /**
     * Reset email tracking mỗi ngày mới
     * → mỗi ngày gửi tối đa 1 email/user/document/loại
     */
    private resetDailyIfNeeded() {
        const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
        if (today !== this.lastResetDate) {
            this.sentEmailKeys.clear();
            this.sentNotifKeys.clear();
            this.lastResetDate = today;
        }
    }

    // ─── CRON: mỗi giờ ─────────────────────────────────────────
    @SafeCron(CronExpression.EVERY_HOUR)
    async handleDocumentDeadlineReminder() {
        if (this.isJobRunning) return;
        this.isJobRunning = true;

        let emailCount = 0;

        try {
            this.resetDailyIfNeeded();

            const pool = await this.ensurePool();

            // 1️⃣ Nhắc trước 24h trước khi văn bản hết hạn
            const expiringDocs = await this.getDocumentsNearingDeadline(pool);

            for (const doc of expiringDocs) {
                const users = await this.getUnprocessedUsers(pool, doc.document_id);
                const vb = doc.to_book ? `số ${doc.to_book} ` : '';
                const deadlineStr = this.formatDateTime(doc.deadline);

                for (const user of users) {
                    // --- In-app notification ---
                    const notifKey = `${user.receiver}_${doc.document_id}_expiring`;
                    if (!this.sentNotifKeys.has(notifKey)) {
                        try {
                            await this.notificationService.create({
                                recipientId: user.receiver,
                                senderId: 'system',
                                title: `Văn bản đến sắp đến hạn xử lý: “${doc.abstract_note}”`,
                                content: `Văn bản số ${vb} cần được xử lý trước ${deadlineStr}.`,
                                recordId: doc.document_id,
                                link: `/incomming-documents/${doc.document_id}`,
                                key: NotificationKey.VIEW_INCOMING_DOC,
                                type: NotificationType.INCOMING_DOC_DUE_1_DAY.value,
                                time: new Date(),
                                status: 1,
                            });
                            this.sentNotifKeys.add(notifKey);
                        } catch (e) {
                            this.logger.error(`❌ Notification failed for ${user.receiver}: ${e.message}`);
                        }
                    }

                    // --- Email ---
                    const targetEmail = this.testEmail || user.email_user;
                    if (!targetEmail) continue;

                    const dedupKey = `${user.receiver}_${doc.document_id}_expiring`;
                    if (this.sentEmailKeys.has(dedupKey)) continue;

                    const sent = await this.sendEmailReminder(targetEmail, user, doc, 'expiring');
                    if (sent) {
                        this.sentEmailKeys.add(dedupKey);
                        emailCount++;
                    }
                }
            }

            // 2️⃣ Nhắc sau khi hết hạn văn bản 1 ngày
            const expiredDocs = await this.getDocumentsExpired(pool);

            for (const doc of expiredDocs) {
                const users = await this.getUnprocessedUsers(pool, doc.document_id);
                const vb = doc.to_book ? `số ${doc.to_book} ` : '';

                for (const user of users) {
                    // --- In-app notification ---
                    const notifKey = `${user.receiver}_${doc.document_id}_expired`;
                    if (!this.sentNotifKeys.has(notifKey)) {
                        try {
                            await this.notificationService.create({
                                recipientId: user.receiver,
                                senderId: 'system',
                                title: `Văn bản đến quá hạn xử lý: “${doc.abstract_note}”`,
                                content: `Văn bản số ${vb} đã quá hạn. Đề nghị xử lý ngay.`,
                                recordId: doc.document_id,
                                link: `/incomming-documents/${doc.document_id}`,
                                key: NotificationKey.VIEW_INCOMING_DOC,
                                type: NotificationType.INCOMING_DOC_OVERDUE_1_DAY.value,
                                time: new Date(),
                                status: 1,
                            });
                            this.sentNotifKeys.add(notifKey);
                        } catch (e) {
                            this.logger.error(`❌ Notification failed for ${user.receiver}: ${e.message}`);
                        }
                    }

                    // --- Email ---
                    const targetEmail = this.testEmail || user.email_user;
                    if (!targetEmail) continue;

                    const dedupKey = `${user.receiver}_${doc.document_id}_expired`;
                    if (this.sentEmailKeys.has(dedupKey)) continue;

                    const sent = await this.sendEmailReminder(targetEmail, user, doc, 'expired');
                    if (sent) {
                        this.sentEmailKeys.add(dedupKey);
                        emailCount++;
                    }
                }
            }

        } catch (error) {
            this.logger.error('❌ IncomingDocumentReminder cron error', error);
        } finally {
            this.isJobRunning = false;
        }
    }

    // ─── QUERY: VB sắp hết hạn (deadline trong 24h tới) ───────
    // Tìm văn bản có deadline > bây giờ và <= bây giờ + 24h
    // = văn bản sẽ hết hạn trong vòng 1 ngày tới
    private async getDocumentsNearingDeadline(
        pool: sql.ConnectionPool,
    ): Promise<Array<{ document_id: string; abstract_note: string; to_book: string; deadline: Date }>> {
        const request = pool.request();
        const result = await request.query(`
            SELECT d.document_id, d.abstract_note, d.to_book, d.deadline
            FROM ${this.dbname}.dbo.incomming_documents d
            WHERE d.deadline IS NOT NULL
              AND d.deadline > GETDATE()
              AND d.deadline <= DATEADD(HOUR, 24, GETDATE())
              AND NOT EXISTS (
                SELECT 1 FROM ${this.dbname}.dbo.audit a_end
                WHERE a_end.document_id = d.document_id
                  AND a_end.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
              )
        `);
        return result.recordset;
    }

    // ─── QUERY: VB đã quá hạn 1 ngày ───────────────────────────
    // Tìm văn bản có deadline đã qua từ 24h đến 48h
    // = văn bản đã quá hạn đúng 1 ngày → lúc đó mới gửi thông báo
    private async getDocumentsExpired(
        pool: sql.ConnectionPool,
    ): Promise<Array<{ document_id: string; abstract_note: string; to_book: string; deadline: Date }>> {
        const request = pool.request();
        const result = await request.query(`
            SELECT d.document_id, d.abstract_note, d.to_book, d.deadline
            FROM ${this.dbname}.dbo.incomming_documents d
            WHERE d.deadline IS NOT NULL
              AND d.deadline < DATEADD(HOUR, -24, GETDATE())
              AND d.deadline >= DATEADD(HOUR, -48, GETDATE())
              AND NOT EXISTS (
                SELECT 1 FROM ${this.dbname}.dbo.audit a_end
                WHERE a_end.document_id = d.document_id
                  AND a_end.stage_status IN ('HOAN_THANH_VAN_BAN', 'HOAN_THANH')
              )
        `);
        return result.recordset;
    }

    // ─── QUERY: Người chưa xử lý + email + đơn vị ─────────────
    private async getUnprocessedUsers(
        pool: sql.ConnectionPool,
        documentId: string,
    ): Promise<Array<{
        receiver: string;
        name: string;
        email_user: string | null;
        organization_name: string | null;
    }>> {
        const request = pool.request();
        request.input('docId', sql.NVarChar, documentId);
        const result = await request.query(`
            SELECT DISTINCT
                a.receiver,
                u.name,
                u.email_user,
                ISNULL(u.organization_name, ou.name) AS organization_name
            FROM ${this.dbname}.dbo.audit a
            JOIN ${this.dbname}.dbo.users u ON u.id = a.receiver
            LEFT JOIN ${this.dbname}.dbo.organization_units ou ON ou.id = u.parent
            WHERE a.document_id = @docId
              AND a.stage_status = 'CHUA_XU_LY'
              AND a.receiver IS NOT NULL
        `);
        return result.recordset;
    }

    // ─── Gửi email nhắc nhở ─────────────────────────────────────
    private async sendEmailReminder(
        email: string,
        user: { receiver: string; name: string; organization_name: string | null },
        doc: { document_id: string; abstract_note: string; to_book: string; deadline: Date },
        type: 'expiring' | 'expired',
    ): Promise<boolean> {
        try {
            const deadlineStr = this.formatDate(doc.deadline);
            const docLink = `${this.appUrl}`;

            let subject: string;
            let statusText: string;
            let messageText: string;

            if (type === 'expiring') {
                statusText = 'Bạn có Văn bản sắp hết hạn xử lý';
                subject = `[Thông báo] từ hệ thống Văn phòng số : "${statusText}"`;
                messageText = `Đến thời điểm hiện tại, văn bản nêu trên sắp hết hạn xử lý nhưng hệ thống chưa ghi nhận kết quả hoàn thành.\nĐề nghị Ông/Bà kiểm tra và thực hiện xử lý văn bản theo đúng quy định; đồng thời cập nhật trạng thái xử lý trên hệ thống để đảm bảo tiến độ chung.`;
            } else {
                statusText = 'Bạn có Văn bản quá hạn xử lý';
                subject = `[Thông báo] từ hệ thống Văn phòng số : "${statusText}"`;
                messageText = `Đến thời điểm hiện tại, văn bản nêu trên đã quá hạn xử lý nhưng hệ thống chưa ghi nhận kết quả hoàn thành.\nĐề nghị Ông/Bà kiểm tra và thực hiện xử lý văn bản theo đúng quy định; đồng thời cập nhật trạng thái xử lý trên hệ thống để đảm bảo tiến độ chung.`;
            }

            const bodyHtml = this.buildEmailHtml({
                recipientName: user.name || 'Quý Ông/Bà',
                toBook: doc.to_book || '',
                abstractNote: doc.abstract_note || '',
                organizationName: user.organization_name || '',
                deadline: deadlineStr,
                docLink,
                messageText,
            });

            const sent = await this.mailService.sendMail({
                to: email,
                subject,
                html: bodyHtml,
            });

            if (sent) {
            }
            return sent;
        } catch (error) {
            this.logger.error(`❌ Email failed for ${email}: ${error.message}`);
            return false;
        }
    }

    // ─── Template email HTML (giống mẫu VPS) ─────────────────────
    private buildEmailHtml(data: {
        recipientName: string;
        toBook: string;
        abstractNote: string;
        organizationName: string;
        deadline: string;
        docLink: string;
        messageText: string;
    }): string {
        return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:650px; margin:20px auto; background:#ffffff; border:1px solid #e0e0e0;">
    <tr>
      <td style="padding:30px 35px;">

        <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
          Kính gửi Ông/Bà: &nbsp;<strong>${data.recipientName}</strong>
        </p>

        <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
          Hệ thống Văn phòng số xin thông báo:
        </p>

        <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
          Văn bản: ${data.toBook}
        </p>
        <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
          Trích yếu: "${data.abstractNote}"
        </p>
        <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
          Đơn vị: ${data.organizationName}
        </p>
        <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.8;">
          Người được giao xử lý: ${data.recipientName}
        </p>
        <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.8;">
          Thời hạn xử lý: ${data.deadline}
        </p>

        <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
          ${data.messageText.replace(/\n/g, '<br>')}
        </p>

        <p style="margin:0 0 18px; color:#333; font-size:14px; line-height:1.6;">
          Đồng chí có thể nhấn vào đường dẫn: <a href="${data.docLink}" style="color:#1a73e8;">${data.docLink}</a> để xử lý.
        </p>

        <p style="margin:0 0 4px; color:#333; font-size:14px; line-height:1.6;">
          Trong trường hợp đã hoàn thành hoặc có vướng mắc trong quá trình xử lý, kính đề nghị phản hồi hoặc liên hệ với bộ phận quản trị hệ thống để được hỗ trợ.
        </p>

        <br>
        <p style="margin:0 0 4px; color:#333; font-size:14px;">Trân trọng,</p>
        <p style="margin:0 0 0; color:#0088cc; font-size:14px; font-weight:bold;">TỔNG CÔNG TY TÂN CẢNG SÀI GÒN</p>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:15px 35px; border-top:1px solid #e0e0e0;">
        <p style="margin:0 0 4px; color:#666; font-size:13px;">Hệ thống Văn phòng số</p>
        <p style="margin:0; color:#999; font-size:12px;">(Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.)</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // ─── Helper format date ──────────────────────────────────────
    private formatDate(date: Date | string | null): string {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // ─── Helper format date + time (HH:mm ngày DD/MM/YYYY) ──────
    private formatDateTime(date: Date | string | null): string {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hh}:${mm} ngày ${day}/${month}/${year}`;
    }
}
