import { Injectable, Logger } from '@nestjs/common';
import { SafeCron } from 'src/database/safe-cron.decorator';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { getMssqlPool } from 'src/database/mssql.pool';
import { NotificationService } from 'src/notifycation/notification.service';
import { NotificationKey, NotificationType } from 'src/notifycation/notification.enum';

/**
 * PassportReminderService
 *
 * Cron chạy lúc 8h sáng mỗi ngày, kiểm tra hộ chiếu:
 *   - 6 tháng trước hạn: Nhắc chuẩn bị làm mới
 *   - 3 tháng trước hạn: Nhắc xử lý hồ sơ xin lại
 *   - 1 tháng trước hạn: Nhắc nhở gấp
 *   - Đã quá hạn: Cảnh báo quá hạn
 *
 * Pattern: TaskReminderService
 */
@Injectable()
export class PassportReminderService {
    private readonly logger = new Logger(PassportReminderService.name);
    private isJobRunning = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly notificationService: NotificationService,
    ) { }

    onModuleInit() {
    }

    /**
     * Cron chạy lúc 8h sáng mỗi ngày (0 8 * * *)
     */
    @SafeCron('0 1 * * *')
    async handlePassportExpiryReminder(callerUserId?: string, forceResend = false) {
        if (this.isJobRunning) return;
        this.isJobRunning = true;

        let sentCount = 0;

        try {

            const pool = await getMssqlPool(this.configService);

            // Query hộ chiếu theo 4 mốc
            const levels = [
                {
                    key: 'EXPIRY_6M',
                    label: '6 tháng',
                    condition: `expiry_date > GETDATE() AND expiry_date <= DATEADD(month, 6, GETDATE()) AND expiry_date > DATEADD(month, 3, GETDATE())`,
                    icon: '⚠️',
                    message: (num: string, date: string) =>
                        `⚠️ Hộ chiếu ${num} sắp hết hạn (${date}). Vui lòng chuẩn bị làm mới.`,
                },
                {
                    key: 'EXPIRY_3M',
                    label: '3 tháng',
                    condition: `expiry_date > GETDATE() AND expiry_date <= DATEADD(month, 3, GETDATE()) AND expiry_date > DATEADD(month, 1, GETDATE())`,
                    icon: '⚠️',
                    message: (num: string, date: string) =>
                        `⚠️ Hộ chiếu ${num} còn dưới 3 tháng nữa hết hạn (${date}). Nhắc xử lý hồ sơ xin lại.`,
                },
                {
                    key: 'EXPIRY_1M',
                    label: '1 tháng',
                    condition: `expiry_date > GETDATE() AND expiry_date <= DATEADD(month, 1, GETDATE())`,
                    icon: '🔴',
                    message: (num: string, date: string) =>
                        `🔴 Hộ chiếu ${num} sắp hết hạn trong 1 tháng (${date})! Cần xử lý gấp.`,
                },
                {
                    key: 'EXPIRED',
                    label: 'quá hạn',
                    condition: `expiry_date < GETDATE()`,
                    icon: '🚫',
                    message: (num: string, date: string) =>
                        `🚫 Hộ chiếu ${num} đã quá hạn (${date}). Không thể sử dụng cho mượn.`,
                },
            ];

            for (const level of levels) {
                const query = `
          SELECT id, passport_number, full_name, eoffice_account, user_id, created_by, expiry_date
          FROM passports
          WHERE is_deleted = 0
            AND (eoffice_account IS NOT NULL OR user_id IS NOT NULL OR created_by IS NOT NULL)
            AND ${level.condition}
        `;

                const result = await pool.request().query(query);
                const passports = result.recordset || [];


                for (const passport of passports) {
                    // Ưu tiên eoffice_account, fallback sang user_id/created_by
                    const ownerId = passport.eoffice_account || passport.user_id || passport.created_by;

                    // Danh sách người nhận: chủ HC + người đăng nhập (nếu có)
                    const recipientIds = new Set<string>();
                    if (ownerId) recipientIds.add(ownerId);
                    if (callerUserId) recipientIds.add(callerUserId);

                    if (recipientIds.size === 0) {
                        this.logger.warn(`⏭️ [${level.key}] Skip passport ${passport.passport_number}: không có người nhận`);
                        continue;
                    }

                    const expiryDateStr = this.formatDate(passport.expiry_date);
                    const content = level.message(
                        passport.passport_number,
                        expiryDateStr,
                    );

                    for (const recipientId of recipientIds) {
                        // recordId = plain passport ID (giống format các module khác)
                        const recordId = passport.id;

                        if (!forceResend) {
                            const existed = await this.checkExistsToday(
                                pool,
                                recipientId,
                                recordId,
                                level.key,
                            );

                            if (existed) {
                                continue;
                            }
                        }

                        await this.notificationService.create({
                            recipientId: recipientId,
                            senderId: recipientId,
                            title: 'Thông báo nhắc hạn hộ chiếu',
                            content,
                            recordId,
                            link: `/passports/${passport.id}`,
                            key: NotificationKey.VIEW_PASSPORT_LIST,
                            type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                            status: 1,
                        } as any);

                        sentCount++;
                    } // end for recipientIds
                } // end for passports
            }

        } catch (error) {
            this.logger.error('❌ [PassportReminder] Cron error', error);
        } finally {
            this.isJobRunning = false;
        }
    }

    /**
     * Cron chạy lúc 8h sáng mỗi ngày (0 8 * * *)
     * Kiểm tra các Yêu cầu mượn hộ chiếu đang IN_USE sắp đến hạn hoặc quá hạn trả
     */
    @SafeCron('0 2 * * *')
    async handlePassportReturnReminder() {

        try {
            const pool = await getMssqlPool(this.configService);
            const specialistIds = await this.getSpecialistUserIds(pool);

            const levels = [
                {
                    key: 'RETURN_DUE_SOON',
                    condition: `return_date >= CAST(GETDATE() AS DATE) AND return_date <= DATEADD(day, 2, GETDATE())`,
                    icon: '⚠️',
                    message: (reqName: string, date: string) =>
                        `⚠️ Yêu cầu mượn "${reqName}" sắp đến hạn trả (${date}). Vui lòng chuẩn bị trả lại hộ chiếu.`,
                },
                {
                    key: 'RETURN_OVERDUE',
                    condition: `return_date < CAST(GETDATE() AS DATE)`,
                    icon: '🔴',
                    message: (reqName: string, date: string) =>
                        `🔴 Yêu cầu mượn "${reqName}" đã quá hạn trả (${date})! Vui lòng hoàn tất thủ tục trả hộ chiếu ngay.`,
                },
            ];

            let sentCount = 0;

            for (const level of levels) {
                const query = `
                    SELECT id, name_passport_request, requestCode, requester_id, return_date
                    FROM passport_borrow_requests
                    WHERE is_deleted = 0
                      AND status = 'IN_USE'
                      AND ${level.condition}
                `;

                const result = await pool.request().query(query);
                const requests = result.recordset || [];


                for (const req of requests) {
                    const returnDateStr = this.formatDate(req.return_date);
                    const content = level.message(req.requestCode || req.name_passport_request, returnDateStr);

                    // Danh sách người nhận: người tạo + các cán bộ chuyên trách
                    const recipients = new Set<string>();
                    if (req.requester_id) recipients.add(req.requester_id);
                    specialistIds.forEach(id => recipients.add(id));

                    for (const recipientId of recipients) {
                        // Check duplicate notification today
                        const existed = await this.checkExistsTodayForRequest(
                            pool,
                            recipientId,
                            req.id,
                            level.key
                        );

                        if (existed) {
                            continue;
                        }

                        await this.notificationService.create({
                            recipientId,
                            senderId: recipientId,
                            title: 'Nhắc nhở trả hộ chiếu',
                            content,
                            recordId: req.id,
                            link: `/passport-requests/${req.id}`,
                            key: NotificationKey.VIEW_PASSPORT_LIST,
                            type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                            status: 1,
                        } as any);

                        sentCount++;
                    }
                }
            }


        } catch (error) {
            this.logger.error('❌ [PassportReturnReminder] Cron error', error);
        }
    }

    /**
     * STT 6: Cron chạy lúc 8h sáng mỗi ngày (0 8 * * *)
     * Nhắc nhở Yêu cầu đã đến ngày mượn nhưng chưa lập biên bản bàn giao
     */
    @SafeCron('0 3 * * *')
    async handleBorrowedButNoVoucherReminder() {

        try {
            const pool = await getMssqlPool(this.configService);
            const specialistIds = await this.getSpecialistUserIds(pool);

            // Tìm các yêu cầu đã đến ngày mượn nhưng chưa ở trạng thái IN_USE/COMPLETED (chưa có biên bản bàn giao)
            const query = `
                SELECT id, name_passport_request, requestCode, requester_id, borrow_date
                FROM passport_borrow_requests
                WHERE is_deleted = 0
                  AND status NOT IN ('IN_USE', 'COMPLETED', 'REJECTED', 'CANCELLED')
                  AND borrow_date <= CAST(GETDATE() AS DATE)
            `;

            const result = await pool.request().query(query);
            const requests = result.recordset || [];


            let sentCount = 0;
            for (const req of requests) {
                const content = `Có yêu cầu mượn hộ chiếu ${req.requestCode || req.name_passport_request} đã đến ngày mượn nhưng chưa lập biên bản bàn giao.`;

                const recipients = new Set<string>();
                if (req.requester_id) recipients.add(req.requester_id);
                specialistIds.forEach(id => recipients.add(id));

                for (const recipientId of recipients) {
                    const existed = await this.checkExistsTodayForRequest(
                        pool,
                        recipientId,
                        req.id,
                        'BORROWED_NO_VOUCHER'
                    );

                    if (existed) continue;

                    await this.notificationService.create({
                        recipientId,
                        senderId: recipientId,
                        title: 'Yêu cầu mượn hộ chiếu chưa bàn giao',
                        content,
                        recordId: req.id,
                        link: `/passport-requests/${req.id}`,
                        key: NotificationKey.VIEW_PASSPORT_LIST,
                        type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                        status: 1,
                    } as any);

                    sentCount++;
                }
            }

        } catch (error) {
            this.logger.error('❌ [BorrowedButNoVoucherReminder] Cron error', error);
        }
    }

    /**
     * Helper: Lấy danh sách UserIds thuộc vai trò Bộ phận chuyên trách
     */
    private async getSpecialistUserIds(pool: sql.ConnectionPool): Promise<string[]> {
        try {
            const query = `
                SELECT userId, roles_dynamic
                FROM group_users
                WHERE status = 1 
                  AND roles_dynamic LIKE '%BO_PHAN_CHUYEN_TRACH%'
            `;
            const result = await pool.request().query(query);
            const groups = result.recordset || [];

            const userIds = new Set<string>();
            for (const group of groups) {
                try {
                    const roles = JSON.parse(group.roles_dynamic || '[]');
                    if (Array.isArray(roles) && roles.some(r => r.processKey === 'PassportRequest' && r.roleCode === 'BO_PHAN_CHUYEN_TRACH')) {
                        const ids = JSON.parse(group.userId || '[]');
                        if (Array.isArray(ids)) {
                            ids.forEach(id => {
                                if (id) userIds.add(id);
                            });
                        }
                    }
                } catch (e) { }
            }
            return Array.from(userIds);
        } catch (error) {
            this.logger.error('Error fetching specialist user IDs', error);
            return [];
        }
    }

    /**
     * NQLHC gửi thông báo nhắc nhở thủ công cho hộ chiếu sắp hết hạn / đã hết hạn
     * Gửi về cho các thành viên trong nhóm BPCT001
     */
    async sendManualExpiryReminder(passportId: string, callerUserId?: string): Promise<{ success: boolean; message: string; sentCount?: number }> {
        try {
            if (!passportId) {
                return { success: false, message: 'Vui lòng cung cấp ID hộ chiếu' };
            }

            const pool = await getMssqlPool(this.configService);

            // 1. Kiểm tra hộ chiếu có tồn tại không
            const passportResult = await pool.request()
                .input('id', sql.NVarChar, passportId)
                .query(`
                    SELECT TOP 1 id, passport_number, full_name, eoffice_account, user_id, created_by, expiry_date, is_deleted
                    FROM passports
                    WHERE id = @id AND is_deleted = 0
                `);

            const passport = passportResult.recordset?.[0];
            if (!passport) {
                return { success: false, message: 'Không tìm thấy hộ chiếu trong hệ thống' };
            }

            if (!passport.expiry_date) {
                return { success: false, message: 'Hộ chiếu chưa có thông tin ngày hết hạn' };
            }

            // 2. Kiểm tra tình trạng hết hạn / sắp hết hạn
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            const expiryDate = new Date(passport.expiry_date);
            expiryDate.setHours(0, 0, 0, 0);

            const sixMonthsLater = new Date();
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            sixMonthsLater.setHours(23, 59, 59, 999);

            const isExpired = expiryDate < now;
            const isExpiringSoon = expiryDate >= now && expiryDate <= sixMonthsLater;

            if (!isExpired && !isExpiringSoon) {
                return {
                    success: false,
                    message: `Hộ chiếu số ${passport.passport_number} vẫn còn hạn sử dụng (hạn đến ${this.formatDate(passport.expiry_date)}), chưa thuộc diện sắp hết hạn hoặc quá hạn.`,
                };
            }

            // 3. Lấy danh sách User IDs thuộc nhóm BPCT001
            const recipientUserIds = await this.getBPCT001GroupUserIds(pool);

            // Thêm chủ hộ chiếu (ưu tiên eoffice_account, fallback user_id/created_by)
            const ownerIdentifier = passport.eoffice_account || passport.user_id || passport.created_by;
            if (ownerIdentifier) {
                recipientUserIds.add(ownerIdentifier);
                try {
                    const userRes = await pool.request()
                        .input('ownerAcc', sql.NVarChar, ownerIdentifier)
                        .query(`SELECT TOP 1 id, username FROM users WHERE id = @ownerAcc OR username = @ownerAcc`);
                    const ownerUser = userRes.recordset?.[0];
                    if (ownerUser) {
                        if (ownerUser.id) recipientUserIds.add(ownerUser.id);
                        if (ownerUser.username) recipientUserIds.add(ownerUser.username);
                    }
                } catch (e) {}
            }

            if (recipientUserIds.size === 0) {
                return { success: false, message: 'Không tìm thấy người dùng thuộc nhóm BPCT001 hoặc chủ hộ chiếu để gửi thông báo' };
            }

            // 4. Soạn nội dung thông báo
            const expiryDateStr = this.formatDate(passport.expiry_date);
            let title = '';
            let content = '';

            if (isExpired) {
                title = 'Cảnh báo hộ chiếu đã hết hạn';
                content = `🚫 Hộ chiếu số ${passport.passport_number} (${passport.full_name || 'Cán bộ'}) đã quá hạn (${expiryDateStr}). NQLHC gửi nhắc nhở kiểm tra và xử lý gấp.`;
            } else {
                title = 'Nhắc nhở hộ chiếu sắp hết hạn';
                content = `⚠️ Hộ chiếu số ${passport.passport_number} (${passport.full_name || 'Cán bộ'}) sắp hết hạn (${expiryDateStr}). NQLHC gửi nhắc nhở xử lý làm mới/nộp lại hộ chiếu.`;
            }

            // 5. Gửi thông báo & Email đến từng thành viên
            let sentCount = 0;
            const senderId = callerUserId || ownerIdentifier || 'SYSTEM';

            for (const recipientId of recipientUserIds) {
                await this.notificationService.create({
                    recipientId: recipientId,
                    senderId: senderId,
                    title: title,
                    content: content,
                    recordId: passport.id,
                    link: `/passports/${passport.id}`,
                    key: NotificationKey.VIEW_PASSPORT_LIST,
                    type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                    status: 1,
                } as any);

                sentCount++;
            }

            return {
                success: true,
                message: `Đã gửi thông báo/email nhắc nhở hộ chiếu số ${passport.passport_number} tới ${sentCount} thành viên nhóm BPCT001`,
                sentCount,
            };
        } catch (error) {
            this.logger.error(`Error in sendManualExpiryReminder for passportId ${passportId}`, error);
            return { success: false, message: `Có lỗi xảy ra: ${error?.message || error}` };
        }
    }

    /**
     * Helper: Lấy danh sách UserIds thuộc nhóm BPCT001 (hoặc Bộ phận chuyên trách)
     */
    private async getBPCT001GroupUserIds(pool: sql.ConnectionPool): Promise<Set<string>> {
        const userIds = new Set<string>();
        try {
            // 1. Query từ bảng user_group_users join group_users theo code BPCT001
            const queryUgu = `
                SELECT DISTINCT ugu.user_id
                FROM user_group_users ugu
                INNER JOIN group_users gu ON gu.id = ugu.group_user_id
                WHERE gu.status = 1 
                  AND (gu.code = 'BPCT001' OR gu.code = 'BO_PHAN_CHUYEN_TRACH' OR gu.roles_dynamic LIKE '%BO_PHAN_CHUYEN_TRACH%')
            `;
            const resultUgu = await pool.request().query(queryUgu);
            (resultUgu.recordset || []).forEach((r: any) => {
                if (r.user_id) userIds.add(String(r.user_id).trim());
            });

            // 2. Query từ cột userId (JSON array) trong bảng group_users theo code BPCT001
            const queryGu = `
                SELECT userId, roles_dynamic
                FROM group_users
                WHERE status = 1 
                  AND (code = 'BPCT001' OR code = 'BO_PHAN_CHUYEN_TRACH' OR roles_dynamic LIKE '%BO_PHAN_CHUYEN_TRACH%')
            `;
            const resultGu = await pool.request().query(queryGu);
            (resultGu.recordset || []).forEach((g: any) => {
                try {
                    const ids = typeof g.userId === 'string' ? JSON.parse(g.userId || '[]') : g.userId;
                    if (Array.isArray(ids)) {
                        ids.forEach((id: any) => {
                            if (id) userIds.add(String(id).trim());
                        });
                    }
                } catch (e) {}
            });

            // 3. Fallback dùng getSpecialistUserIds nếu 2 cách trên không có kết quả
            if (userIds.size === 0) {
                const specIds = await this.getSpecialistUserIds(pool);
                specIds.forEach(id => userIds.add(id));
            }
        } catch (error) {
            this.logger.error('Error in getBPCT001GroupUserIds', error);
        }
        return userIds;
    }

    /**
     * Check đã gửi notification cho user + recordId trong ngày hôm nay chưa
     */
    private async checkExistsTodayForRequest(
        pool: sql.ConnectionPool,
        recipientId: string,
        recordId: string,
        key: string,
    ): Promise<boolean> {
        const result = await pool.request()
            .input('recipientId', sql.NVarChar, recipientId)
            .input('recordId', sql.NVarChar, recordId)
            .input('key', sql.NVarChar, key)
            .query(`
                SELECT TOP 1 1 AS exists_flag
                FROM notifications
                WHERE recipientId = @recipientId
                  AND recordId = @recordId
                  AND [key] = @key
                  AND CAST(createdAt AS DATE) = CAST(GETDATE() AS DATE)
            `);

        return (result.recordset?.length || 0) > 0;
    }

    /**
     * Check đã gửi notification cho user + recordId trong ngày hôm nay chưa
     */
    private async checkExistsToday(
        pool: sql.ConnectionPool,
        recipientId: string,
        recordId: string,
        levelKey: string,
    ): Promise<boolean> {
        const result = await pool.request()
            .input('recipientId', sql.NVarChar, recipientId)
            .input('recordId', sql.NVarChar, recordId)
            .input('levelKey', sql.NVarChar, `%${levelKey}%`)
            .query(`
        SELECT TOP 1 1 AS exists_flag
        FROM notifications
        WHERE recipientId = @recipientId
          AND recordId = @recordId
          AND [key] = 'VIEW_PASSPORT_LIST'
          AND CAST(createdAt AS DATE) = CAST(GETDATE() AS DATE)
      `);

        return (result.recordset?.length || 0) > 0;
    }

    /**
     * Format date thành DD/MM/YYYY
     */
    private formatDate(date: Date | string | null): string {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
}
