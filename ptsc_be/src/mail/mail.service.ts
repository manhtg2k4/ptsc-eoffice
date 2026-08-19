import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { MailConfigEntity } from './mail-config.entity';

export interface SendMailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
}

export interface ApprovalMailData {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    taskName: string;
    taskId: number;
    note?: string;
    taskDeadline?: string;
    type?: 'approval' | 'adjustment' | 'approval_approved' | 'approval_rejected' | 'adjustment_approved' | 'adjustment_rejected';
}

export interface MailConfig {
    mailHost: string;
    mailPort: number;
    mailUser: string;
    mailPass: string;
    mailSecure: boolean;
    mailFrom: string;
    appUrl: string;
}

@Injectable()
export class MailService implements OnModuleInit {
    private readonly logger = new Logger(MailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured = false;
    private mailConfig: MailConfig | null = null;

    constructor(
        @InjectRepository(MailConfigEntity, 'mssqlConnection')
        private readonly mailConfigRepository: Repository<MailConfigEntity>,
        private readonly configService: ConfigService,
    ) { }

    async onModuleInit() {
        await this.loadConfigFromDatabase();
    }

    /**
     * Load mail configuration from database
     */
    async loadConfigFromDatabase(): Promise<void> {
        try {
            // 1. Thử lấy cấu hình từ biến môi trường trước
            const rawEnvPass = process.env.MAIL_PASS;
            const envHost = process.env.MAIL_HOST?.trim();
            const envPort = process.env.MAIL_PORT?.trim();
            const envUser = process.env.MAIL_USER?.trim();
            const envPass = rawEnvPass?.trim();
            const envSecureStr = process.env.MAIL_SECURE?.trim();
            const envFrom = process.env.MAIL_FROM?.trim();
            const envAppUrl = process.env.REDIRECT_URI_FE?.trim() || process.env.URL_NESTJS?.trim();

            const missingRequiredEnvKeys = [
                ['MAIL_HOST', envHost],
                ['MAIL_USER', envUser],
                ['MAIL_PASS', envPass],
            ]
                .filter(([, value]) => !value)
                .map(([key]) => key);

            if (missingRequiredEnvKeys.length > 0) {
                this.logger.warn(
                    `[MailService][config:env] Missing required process.env keys: ${missingRequiredEnvKeys.join(', ')}. Fallback to database.`
                );
            }

            if (envHost && envUser && envPass) {
                const isSecure = envSecureStr === 'true' || envSecureStr === '1' || Number(envPort) === 465;
                this.mailConfig = {
                    mailHost: envHost,
                    mailPort: envPort ? Number(envPort) : 587,
                    mailUser: envUser,
                    mailPass: envPass,
                    mailSecure: isSecure,
                    mailFrom: envFrom || `"Hệ thống quản lý công việc" <${envUser}>`,
                    appUrl: envAppUrl || 'http://localhost:3000',
                };
                this.initializeTransporter();
                return;
            }

            // 2. Fallback về Database
            // Tìm config active đầu tiên
            let config = await this.mailConfigRepository.findOne({
                where: { isActive: true },
                order: { id: 'ASC' },
            });

            // Nếu không có config, tạo config mặc định
            if (!config) {
                this.logger.warn('[MailService][config:db] No active mail_config found. Creating default empty config.');
                config = await this.createDefaultConfig();
            }

            if (config && config.mailUser && config.mailPass) {
                this.mailConfig = {
                    mailHost: config.mailHost,
                    mailPort: config.mailPort,
                    mailUser: config.mailUser,
                    mailPass: config.mailPass,
                    mailSecure: config.mailSecure,
                    mailFrom: config.mailFrom || `"Hệ thống quản lý công việc" <${config.mailUser}>`,
                    appUrl: config.appUrl || this.configService.get<string>('URL_NESTJS', 'http://localhost:3000'),
                };
                this.initializeTransporter();
            } else {
                this.logger.warn(
                    `[MailService] Cấu hình Mail từ Database chưa hoàn thiện!\n` +
                    `- Mail Host: ${config?.mailHost || 'Trống'}\n` +
                    `- Mail User: ${config?.mailUser ? `Đã thiết lập: ${config?.mailUser}` : 'TRỐNG'}\n` +
                    `- Mail Pass: ${config?.mailPass ? `Đã thiết lập: ${config?.mailPass}` : 'TRỐNG'}`
                );
                this.isConfigured = false;
            }
        } catch (error) {
            this.logger.error(`Tải cấu hình Mail thất bại: ${error.message}`, error.stack);
            this.isConfigured = false;
        }
    }

    private formatConfigValue(value: string | number | boolean | undefined | null): string {
        if (value === undefined || value === null) {
            return 'EMPTY';
        }

        const normalizedValue = String(value).replace(/\s+/g, ' ').trim();
        return normalizedValue || 'EMPTY';
    }

    private formatSecretStatus(value: string | undefined | null): string {
        const rawValue = value ?? '';
        const trimmedValue = rawValue.trim();

        if (!trimmedValue) {
            return 'EMPTY';
        }

        return [
            'SET',
            `rawLength=${rawValue.length}`,
            `trimmedLength=${trimmedValue.length}`,
            `hasWhitespace=${/\s/.test(trimmedValue)}`,
            `hasEdgeWhitespace=${rawValue !== trimmedValue}`,
        ].join('|');
    }

    private describeMailConfig(config: MailConfig | null): string {
        if (!config) {
            return 'config=NULL';
        }

        return [
            `host=${this.formatConfigValue(config.mailHost)}`,
            `port=${this.formatConfigValue(config.mailPort)}`,
            `secure=${this.formatConfigValue(config.mailSecure)}`,
            `user=${this.formatConfigValue(config.mailUser)}`,
            `pass=${this.formatSecretStatus(config.mailPass)}`,
            `from=${this.formatConfigValue(config.mailFrom)}`,
            `appUrl=${this.formatConfigValue(config.appUrl)}`,
        ].join(' ');
    }

    private formatSmtpError(error: unknown): string {
        const smtpError = error as Error & {
            code?: string;
            command?: string;
            response?: string;
            responseCode?: number;
            syscall?: string;
            address?: string;
            port?: number;
        };

        return [
            `name=${this.formatConfigValue(smtpError?.name)}`,
            `message=${this.formatConfigValue(smtpError?.message)}`,
            `code=${this.formatConfigValue(smtpError?.code)}`,
            `command=${this.formatConfigValue(smtpError?.command)}`,
            `responseCode=${this.formatConfigValue(smtpError?.responseCode)}`,
            `response=${this.formatConfigValue(smtpError?.response)}`,
            `syscall=${this.formatConfigValue(smtpError?.syscall)}`,
            `address=${this.formatConfigValue(smtpError?.address)}`,
            `port=${this.formatConfigValue(smtpError?.port)}`,
        ].join(' | ');
    }

    private getBooleanEnv(name: string, defaultValue: boolean): boolean {
        const rawValue = process.env[name]?.trim().toLowerCase();
        if (rawValue === undefined || rawValue === '') {
            return defaultValue;
        }

        return ['true', '1', 'yes', 'y', 'on'].includes(rawValue);
    }

    private getNumberEnv(name: string, defaultValue: number): number {
        const rawValue = process.env[name]?.trim();
        if (!rawValue) {
            return defaultValue;
        }

        const parsedValue = Number(rawValue);
        return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : defaultValue;
    }

    private getMailTimeoutMs(): number {
        return this.getNumberEnv('MAIL_TIMEOUT_MS', 30000);
    }

    private getMailClientName(): string {
        const explicitName = process.env.MAIL_CLIENT_NAME?.trim();
        if (explicitName) {
            return explicitName;
        }

        const appUrl = this.mailConfig?.appUrl;
        if (appUrl) {
            try {
                const hostname = new URL(appUrl).hostname;
                if (hostname && hostname !== 'localhost') {
                    return hostname;
                }
            } catch (error) {
                // Ignore malformed appUrl and continue with SMTP host fallback.
            }
        }

        return this.mailConfig?.mailHost || 'localhost';
    }

    private getMessageIdDomain(): string {
        const explicitDomain = process.env.MAIL_MESSAGE_ID_DOMAIN?.trim();
        if (explicitDomain) {
            return explicitDomain;
        }

        const appUrl = this.mailConfig?.appUrl;
        if (appUrl) {
            try {
                const hostname = new URL(appUrl).hostname;
                if (hostname && hostname !== 'localhost') {
                    return hostname;
                }
            } catch (error) {
                // Ignore malformed appUrl and continue with account/SMTP fallbacks.
            }
        }

        const userDomain = this.mailConfig?.mailUser?.includes('@')
            ? this.mailConfig.mailUser.split('@').pop()
            : '';
        if (userDomain) {
            return userDomain;
        }

        return (this.mailConfig?.mailHost || 'localhost').replace(/^mail\./i, '');
    }

    private createMailTraceId(): string {
        return `be-mail-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    private quoteDisplayName(name: string): string {
        return name.replace(/"/g, '\\"');
    }

    private resolveMailFrom(defaultFrom: string): string {
        const addressFrom = process.env.MAIL_ADDRESS_FROM?.trim() || process.env.MAIL_FROM_ADDRESS?.trim();
        const configuredFrom = process.env.MAIL_FROM?.trim();
        const fromName = process.env.MAIL_FROM_NAME?.trim() || configuredFrom;

        if (addressFrom) {
            if (configuredFrom?.includes('<') && configuredFrom?.includes('>')) {
                return configuredFrom;
            }
            if (fromName) {
                return `"${this.quoteDisplayName(fromName)}" <${addressFrom}>`;
            }
            return addressFrom;
        }

        return defaultFrom;
    }

    private createMailTransporter(config: MailConfig): nodemailer.Transporter {
        const timeoutMs = this.getMailTimeoutMs();
        const requireTLS = this.getBooleanEnv('MAIL_REQUIRE_TLS', config.mailPort === 587 && !config.mailSecure);
        const ignoreTLS = this.getBooleanEnv('MAIL_IGNORE_TLS', false);
        const rejectUnauthorized = this.getBooleanEnv('MAIL_TLS_REJECT_UNAUTHORIZED', true);
        const clientName = this.getMailClientName();

        const transportOptions: any = {
            host: config.mailHost,
            port: config.mailPort,
            secure: config.mailSecure,
            name: clientName,
            requireTLS,
            ignoreTLS,
            connectionTimeout: this.getNumberEnv('MAIL_CONNECTION_TIMEOUT_MS', timeoutMs),
            greetingTimeout: this.getNumberEnv('MAIL_GREETING_TIMEOUT_MS', timeoutMs),
            socketTimeout: this.getNumberEnv('MAIL_SOCKET_TIMEOUT_MS', timeoutMs),
            auth: {
                user: config.mailUser,
                pass: config.mailPass,
            },
            tls: {
                servername: config.mailHost,
                rejectUnauthorized,
            },
        };

        return nodemailer.createTransport(transportOptions);
    }
    private toStringList(value: unknown): string[] {
        if (!Array.isArray(value)) {
            return [];
        }

        return value.map((item) => String(item)).filter(Boolean);
    }

    private hasMailAddress(value: string): boolean {
        const trimmedValue = value.trim();
        return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(trimmedValue)
            || /<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>/.test(trimmedValue);
    }

    private extractMailAddress(value: string): string {
        const trimmedValue = (value || '').trim();
        const wrappedAddress = trimmedValue.match(/<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/);
        if (wrappedAddress?.[1]) {
            return wrappedAddress[1].toLowerCase();
        }

        const plainAddress = trimmedValue.match(/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/);
        return plainAddress ? trimmedValue.toLowerCase() : '';
    }

    private getMailValidationWarnings(from: string): string[] {
        const warnings: string[] = [];
        const fromAddress = this.extractMailAddress(from);
        const smtpUser = (this.mailConfig?.mailUser || '').trim().toLowerCase();
        const smtpHost = (this.mailConfig?.mailHost || '').trim().toLowerCase();

        if (!fromAddress) {
            warnings.push('FROM_ADDRESS_MISSING');
        }

        if (smtpUser.includes('@') && fromAddress && fromAddress !== smtpUser) {
            warnings.push(`FROM_ADDRESS_DIFFERS_FROM_SMTP_USER:${fromAddress}:smtpUser=${smtpUser}`);
        }

        if (smtpHost.includes('gmail') && smtpUser.includes('@') && fromAddress && fromAddress !== smtpUser) {
            warnings.push(`GMAIL_FROM_ALIAS_MAY_BE_REJECTED_OR_REWRITTEN:${fromAddress}:smtpUser=${smtpUser}`);
        }

        return warnings;
    }

    private logMailValidationWarnings(context: string, traceId: string, from: string, recipients: string, subject: string): string[] {
        const warnings = this.getMailValidationWarnings(from);
        for (const warning of warnings) {
            this.logger.warn(
                `[MailService][${context}:config:warn] traceId=${traceId} reason=${warning} ` +
                `to=${recipients} subject=${this.formatConfigValue(subject)} from=${this.formatConfigValue(from)} ` +
                `${this.describeMailConfig(this.mailConfig)}`
            );
        }

        return warnings;
    }

    private extractSmtpTracking(response: string | undefined): { internalId: string; exchangeHostname: string; queuedForDelivery: boolean } {
        const rawResponse = response || '';
        const internalId = rawResponse.match(/\bInternalId=([^,\]\s]+)/i)?.[1] || '';
        const exchangeHostname = rawResponse.match(/\bHostname=([^,\]\s]+)/i)?.[1] || '';

        return {
            internalId,
            exchangeHostname,
            queuedForDelivery: /Queued mail for delivery/i.test(rawResponse),
        };
    }

    private buildSendResultReport(result: unknown): {
        accepted: string[];
        rejected: string[];
        pending: string[];
        messageId: string;
        response: string;
        envelopeFrom: string;
        envelopeTo: string[];
        internalId: string;
        exchangeHostname: string;
        queuedForDelivery: boolean;
    } {
        const info = result as {
            accepted?: unknown[];
            rejected?: unknown[];
            pending?: unknown[];
            messageId?: string;
            response?: string;
            envelope?: {
                from?: unknown;
                to?: unknown;
            };
        };
        const tracking = this.extractSmtpTracking(info?.response);
        const envelopeTo = Array.isArray(info?.envelope?.to)
            ? info.envelope.to.map((item) => String(item)).filter(Boolean)
            : info?.envelope?.to
                ? [String(info.envelope.to)]
                : [];

        return {
            accepted: this.toStringList(info?.accepted),
            rejected: this.toStringList(info?.rejected),
            pending: this.toStringList(info?.pending),
            messageId: info?.messageId || '',
            response: info?.response || '',
            envelopeFrom: info?.envelope?.from ? String(info.envelope.from) : '',
            envelopeTo,
            internalId: tracking.internalId,
            exchangeHostname: tracking.exchangeHostname,
            queuedForDelivery: tracking.queuedForDelivery,
        };
    }

    private describeSendResult(result: unknown): string {
        const report = this.buildSendResultReport(result);

        return [
            `accepted=${report.accepted.join(',')}`,
            `rejected=${report.rejected.join(',')}`,
            `pending=${report.pending.join(',') || 'N/A'}`,
            `messageId=${this.formatConfigValue(report.messageId)}`,
            `internalId=${this.formatConfigValue(report.internalId)}`,
            `exchangeHostname=${this.formatConfigValue(report.exchangeHostname)}`,
            `queuedForDelivery=${report.queuedForDelivery}`,
            `envelopeFrom=${this.formatConfigValue(report.envelopeFrom)}`,
            `envelopeTo=${report.envelopeTo.join(',')}`,
            `response=${this.formatConfigValue(report.response)}`,
        ].join(' ');
    }

    private logMailDeliveryOutcome(context: string, traceId: string, result: unknown, from: string, recipients: string, subject: string, duration: number): void {
        const report = this.buildSendResultReport(result);
        const baseMessage =
            `traceId=${traceId} duration=${duration}ms to=${recipients} subject=${this.formatConfigValue(subject)} ` +
            `from=${this.formatConfigValue(from)} accepted=${report.accepted.join(',')} rejected=${report.rejected.join(',')} ` +
            `pending=${report.pending.join(',') || 'N/A'} messageId=${this.formatConfigValue(report.messageId)} ` +
            `internalId=${this.formatConfigValue(report.internalId)} exchangeHostname=${this.formatConfigValue(report.exchangeHostname)} ` +
            `queuedForDelivery=${report.queuedForDelivery} envelopeFrom=${this.formatConfigValue(report.envelopeFrom)} ` +
            `envelopeTo=${report.envelopeTo.join(',')} response=${this.formatConfigValue(report.response)}`;

        if (!this.hasMailAddress(from)) {
            this.logger.warn(`[MailService][${context}:from:warn] reason=FROM_ADDRESS_MISSING ${baseMessage}`);
        }

        if (report.rejected.length > 0) {
            this.logger.error(`[MailService][${context}:rejected] ${baseMessage}`);
        }

        if (report.pending.length > 0) {
            this.logger.warn(`[MailService][${context}:pending] ${baseMessage}`);
        }

    }

    /**
     * Create default mail config in database
     */
    private async createDefaultConfig(): Promise<MailConfigEntity> {
        const defaultConfig = this.mailConfigRepository.create({
            mailHost: 'smtp.gmail.com',
            mailPort: 587,
            mailUser: '', // Để trống, user cần cấu hình
            mailPass: '', // Để trống, user cần cấu hình
            mailSecure: false,
            mailFrom: '',
            appUrl: this.configService.get<string>('URL_NESTJS', 'http://localhost:3000'),
            isActive: true,
            description: 'Default mail configuration',
        });

        return await this.mailConfigRepository.save(defaultConfig);
    }

    /**
     * Initialize nodemailer transporter with config from database
     */
    private initializeTransporter(): void {
        if (!this.mailConfig) {
            this.logger.warn('Dịch vụ Mail chưa được cấu hình. Bỏ qua việc gửi email.');
            this.isConfigured = false;
            return;
        }

        const { mailUser, mailPass } = this.mailConfig;

        // Kiểm tra xem có cấu hình credentials hay không
        if (!mailUser || !mailPass) {
            this.logger.warn('Dịch vụ Mail chưa được cấu hình: yêu cầu phải có mailUser và mailPass. Bỏ qua việc gửi email.');
            this.isConfigured = false;
            return;
        }

        this.transporter = this.createMailTransporter(this.mailConfig);

        this.isConfigured = true;

        // Verify transporter configuration
        const startTime = Date.now();
        this.transporter.verify((error) => {
            const duration = Date.now() - startTime;
            if (error) {
                this.logger.error(`[MailService][smtp:verify:error] duration=${duration}ms ${this.formatSmtpError(error)}`);
                this.logger.error(
                    `[MailService] Kết nối tới máy chủ SMTP thất bại! (Thời gian kiểm tra: ${duration}ms)\n` +
                    `- SMTP Host: ${this.mailConfig?.mailHost}:${this.mailConfig?.mailPort}\n` +
                    `- SMTP User: ${this.mailConfig?.mailUser}\n` +
                    `- Chi tiết lỗi: ${error.message}`
                );
                this.isConfigured = false;
            }
        });
    }

    /**
     * Reload mail configuration from database
     * Có thể gọi khi cập nhật config
     */
    async reloadConfig(): Promise<void> {
        await this.loadConfigFromDatabase();
    }

    /**
     * Get current mail configuration
     */
    getMailConfig(): MailConfig | null {
        return this.mailConfig;
    }

    /**
     * Update mail configuration in database
     */
    async updateMailConfig(configId: number, updateData: Partial<MailConfigEntity>): Promise<MailConfigEntity> {
        await this.mailConfigRepository.update(configId, updateData);
        const updated = await this.mailConfigRepository.findOne({ where: { id: configId } });

        // Reload transporter với config mới
        await this.reloadConfig();

        return updated!;
    }

    /**
     * Kiểm tra xem mail service đã được cấu hình chưa
     */
    isMailConfigured(): boolean {
        return this.isConfigured && this.transporter !== null;
    }

    async testConnection(): Promise<Record<string, unknown>> {
        if (!this.mailConfig) {
            return {
                status: 'NOT_CONFIGURED',
                isConfigured: this.isConfigured,
                hasTransporter: this.transporter !== null,
            };
        }

        const startTime = Date.now();
        const transporter = this.createMailTransporter(this.mailConfig);
        try {
            await transporter.verify();
            const from = this.resolveMailFrom(this.mailConfig.mailFrom);
            return {
                status: 'SUCCESS',
                durationMs: Date.now() - startTime,
                host: this.mailConfig.mailHost,
                port: this.mailConfig.mailPort,
                secure: this.mailConfig.mailSecure,
                user: this.mailConfig.mailUser,
                from,
                warnings: this.getMailValidationWarnings(from),
                clientName: this.getMailClientName(),
                requireTLS: this.getBooleanEnv('MAIL_REQUIRE_TLS', this.mailConfig.mailPort === 587 && !this.mailConfig.mailSecure),
                timeoutMs: this.getMailTimeoutMs(),
            };
        } catch (error) {
            return {
                status: 'FAILED',
                durationMs: Date.now() - startTime,
                host: this.mailConfig.mailHost,
                port: this.mailConfig.mailPort,
                secure: this.mailConfig.mailSecure,
                user: this.mailConfig.mailUser,
                error: this.formatSmtpError(error),
            };
        } finally {
            transporter.close();
        }
    }

    async sendDiagnosticMail(to: string, subject?: string, text?: string, html?: string): Promise<Record<string, unknown>> {
        const finalSubject = subject || `[Mail Diagnostic] BE_TTHC ${new Date().toISOString()}`;
        const finalText = text || `Mail diagnostic from BE_TTHC at ${new Date().toISOString()}`;

        if (!this.mailConfig) {
            this.logger.warn(`[MailService][diagnostic:send:skip] reason=mailConfig=NULL to=${to}`);
            return {
                success: false,
                to,
                subject: finalSubject,
                error: 'Mail config is not loaded',
            };
        }

        const startTime = Date.now();
        const traceId = this.createMailTraceId();
        const messageId = `<${traceId}@${this.getMessageIdDomain()}>`;
        const from = this.resolveMailFrom(this.mailConfig.mailFrom || '"Hệ thống quản lý công việc" <noreply@example.com>');
        const validationWarnings = this.logMailValidationWarnings('diagnostic:send', traceId, from, to, finalSubject);
        const transporter = this.createMailTransporter(this.mailConfig);

        try {
            const mailOptions: nodemailer.SendMailOptions = {
                from,
                to,
                subject: finalSubject,
                text: finalText,
                html: html || `<p>${finalText}</p>`,
                messageId,
                headers: {
                    'X-App-Mail-Trace-Id': traceId,
                    'X-App-Mail-Mode': 'diagnostic-direct',
                },
            };

            const result = await transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;
            this.logMailDeliveryOutcome('diagnostic:send', traceId, result, from, to, finalSubject, duration);

            return {
                success: true,
                to,
                subject: finalSubject,
                traceId,
                messageId,
                durationMs: duration,
                result: this.describeSendResult(result),
                tracking: this.buildSendResultReport(result),
                warnings: validationWarnings,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(
                `[MailService][diagnostic:send:error] traceId=${traceId} duration=${duration}ms ` +
                `to=${to} subject=${this.formatConfigValue(finalSubject)} ${this.formatSmtpError(error)}`
            );

            return {
                success: false,
                to,
                subject: finalSubject,
                traceId,
                messageId,
                durationMs: duration,
                error: this.formatSmtpError(error),
                warnings: validationWarnings,
            };
        } finally {
            transporter.close();
        }
    }
    /**
     * Send an email
     */
    async sendMail(options: SendMailOptions): Promise<boolean> {
        // Kiểm tra cấu hình trước khi gửi
        if (!this.isMailConfigured()) {
            this.logger.warn(`[MailService][send:skip] isConfigured=${this.isConfigured} hasTransporter=${this.transporter !== null} ${this.describeMailConfig(this.mailConfig)}`);
            this.logger.warn('Dịch vụ Mail chưa được cấu hình. Bỏ qua việc gửi email.');
            return false;
        }

        const startTime = Date.now();
        const recipients = Array.isArray(options.to) ? options.to.join(',') : options.to;
        const traceId = this.createMailTraceId();
        const messageId = `<${traceId}@${this.getMessageIdDomain()}>`;
        try {
            const configuredFrom = this.mailConfig?.mailFrom || '"Hệ thống quản lý công việc" <noreply@example.com>';
            const from = this.resolveMailFrom(configuredFrom);
            this.logMailValidationWarnings('send', traceId, from, recipients, options.subject);

            const mailOptions: nodemailer.SendMailOptions = {
                from,
                to: recipients,
                subject: options.subject,
                text: options.text,
                html: options.html,
                messageId,
                headers: {
                    'X-App-Mail-Trace-Id': traceId,
                    ...(options.headers || {}),
                },
            };

            const result = await this.transporter!.sendMail(mailOptions);
            const duration = Date.now() - startTime;
            this.logMailDeliveryOutcome('send', traceId, result, from, recipients, options.subject, duration);
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`[MailService][send:error] traceId=${traceId} duration=${duration}ms to=${recipients} subject=${this.formatConfigValue(options.subject)} ${this.formatSmtpError(error)}`);
            this.logger.error(
                `[MailService] Gửi email thất bại! (Thời gian thực thi: ${duration}ms)\n` +
                `- Người nhận (To): ${recipients}\n` +
                `- Tiêu đề (Subject): ${options.subject}\n` +
                `- SMTP Host: ${this.mailConfig?.mailHost}:${this.mailConfig?.mailPort}\n` +
                `- SMTP User: ${this.mailConfig?.mailUser}\n` +
                `- Chi tiết lỗi: ${error.message}`,
                error.stack
            );
            return false;
        }
    }

    /**
     * Send approval/adjustment notification email
     * @param data - ApprovalMailData containing recipient and task info
     */
    async sendApprovalNotificationMail(data: ApprovalMailData): Promise<boolean> {
        const { recipientEmail, recipientName, senderName, taskName, taskId, note, taskDeadline, type = 'approval' } = data;

        if (!recipientEmail) {
            this.logger.warn('Không thể gửi email phê duyệt: recipientEmail (địa chỉ người nhận) bị trống');
            return false;
        }

        const appUrl = this.mailConfig?.appUrl || this.configService.get<string>('URL_NESTJS', 'http://localhost:3000');
        let taskLink = `${appUrl}/task/detail/${taskId}`;
        if (type === 'approval' || type === 'adjustment') {
            taskLink = `${appUrl}/task/approve/${taskId}`;
        }

        // Format thời gian hiện tại
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const sentTime = `${pad(now.getHours())}:${pad(now.getMinutes())} - ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

        let subject = '';
        let contentHtml = '';

        switch (type) {
            case 'approval': // 1.1.2 - Người chủ trì gửi yêu cầu phê duyệt → Email cho Người giao
                subject = `[Phê duyệt kết quả] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Kính gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;"><strong>${senderName}</strong> đã hoàn thành và gửi kết quả công việc <strong>${taskName}</strong> để phê duyệt.</p>
                    ${taskDeadline ? `<p style="margin-bottom: 15px;">Hạn công việc: <strong>${taskDeadline}</strong></p>` : ''}
                    <p style="margin-bottom: 15px;">Thời gian gửi: <strong>${sentTime}</strong></p>
                `;
                break;

            case 'adjustment': // 1.2.2 - Người chủ trì gửi yêu cầu phê duyệt điều chỉnh → Email cho Người giao
                subject = `[Điều chỉnh] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Kính gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;">Công việc <strong>${taskName}</strong> do <strong>${senderName}</strong> gửi yêu cầu phê duyệt điều chỉnh thông tin.</p>
                    ${note ? `<p style="margin-bottom: 15px;">Lý do điều chỉnh: ${note}</p>` : ''}
                    <p style="margin-bottom: 15px;">Thời gian gửi: <strong>${sentTime}</strong></p>
                `;
                break;

            case 'approval_approved': // 2.1.2 - Phê duyệt kết quả → Email cho Người thực hiện
                subject = `[Đã phê duyệt] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;">Kết quả công việc <strong>${taskName}</strong> đã được <strong>${senderName}</strong> phê duyệt.</p>
                    <p style="margin-bottom: 15px;">Thời gian phê duyệt: <strong>${sentTime}</strong></p>
                `;
                break;

            case 'approval_rejected': // 2.2.2 - Từ chối phê duyệt kết quả → Email cho Người thực hiện
                subject = `[Từ chối phê duyệt] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;">Kết quả công việc <strong>${taskName}</strong> đã bị <strong>${senderName}</strong> từ chối phê duyệt.</p>
                    ${note ? `<p style="margin-bottom: 15px;">Lý do từ chối: ${note}</p>` : ''}
                    <p style="margin-bottom: 15px;">Thời gian xử lý: <strong>${sentTime}</strong></p>
                `;
                break;

            case 'adjustment_approved': // 2.3.2 - Phê duyệt điều chỉnh → Email cho Người thực hiện
                subject = `[Đã phê duyệt] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;">Kết quả công việc <strong>${taskName}</strong> đã được <strong>${senderName}</strong> phê duyệt.</p>
                    <p style="margin-bottom: 15px;">Thời gian phê duyệt: <strong>${sentTime}</strong></p>
                `;
                break;

            case 'adjustment_rejected': // 2.4.2 - Từ chối phê duyệt điều chỉnh → Email cho Người thực hiện
                subject = `[Từ chối phê duyệt điều chỉnh] ${taskName}`;
                contentHtml = `
                    <p style="margin-bottom: 15px;">Gửi Đ/c <strong>${recipientName}</strong>,</p>
                    <p style="margin-bottom: 15px;">Yêu cầu điều chỉnh thông tin công việc <strong>${taskName}</strong> đã bị <strong>${senderName}</strong> từ chối phê duyệt.</p>
                    ${note ? `<p style="margin-bottom: 15px;">Lý do từ chối: ${note}</p>` : ''}
                    <p style="margin-bottom: 15px;">Thời gian xử lý: <strong>${sentTime}</strong></p>
                `;
                break;

            default:
                // Fallback cũ nếu có type lạ
                subject = `[Thông báo] Công việc: ${taskName}`;
                contentHtml = `
                    <p>Có cập nhật mới liên quan đến công việc <strong>${taskName}</strong>.</p>
                    <p>Vui lòng truy cập hệ thống để xem chi tiết.</p>
                `;
        }

        const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px;">

          ${contentHtml}

          <p style="margin-bottom: 15px;">Trân trọng.</p>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
          </p>

        </div>
      </body>
      </html>
    `;

        const text = `
${subject}

${contentHtml.replace(/<[^>]*>/g, '').trim()}

Trân trọng.

---

Email này được gửi tự động từ Hệ thống quản lý công việc.
Vui lòng không trả lời email này.
    `.trim();

        return this.sendMail({
            to: recipientEmail,
            subject,
            html,
            text,
        });
    }

}
