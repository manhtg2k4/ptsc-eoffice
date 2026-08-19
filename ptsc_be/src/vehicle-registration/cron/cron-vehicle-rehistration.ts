import { Injectable, Logger } from '@nestjs/common'
import { CronExpression } from '@nestjs/schedule'
import { SafeCron } from 'src/database/safe-cron.decorator'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as timezone from 'dayjs/plugin/timezone'

import { VehicleRegistrationEntity, VehicleState } from '../entities/vehicle-registration.entity'
import { RuntimeDbService } from 'src/bpmn/runtime-dbmssql.service'
import { MSSQLRepository } from 'src/database/sqlRepo.mssql'
import { getAllNodeExtensionProperties } from 'src/utils/util'
import { NotificationService } from 'src/notifycation/notification.service'
import { ListDriverEntity } from 'src/list-drivers/entities/list-driver.entity'
import { CarStatus, ListCarEntity } from 'src/list-cars/entities/list-car.entity'
import { VehicleRegistrationService } from '../vehicle-registration.service'
import { stageStatusVehicle } from 'src/variable/CONST_STATUS'
import c from 'config'
import { ResourceStatusSyncService } from '../resource-status-sync.service'

dayjs.extend(utc)
dayjs.extend(timezone)

const BATCH_SIZE = 50

@Injectable()
export class VehicleRegistrationCron {
    private isRunning = false;
    private readonly logger = new Logger(VehicleRegistrationCron.name)

    private ruleCache = new Map<string, { rules: any; createdAt: number }>()

    constructor(
        private readonly runtimeDbService: RuntimeDbService,
        private readonly sqlRepo: MSSQLRepository,
        private readonly notificationService: NotificationService,
        private readonly vehicleRegistrationService: VehicleRegistrationService,
        @InjectRepository(ListDriverEntity, 'mssqlConnection')
        private readonly listDriverRepo: Repository<ListDriverEntity>,
        @InjectRepository(ListCarEntity, 'mssqlConnection')
        private readonly listCarRepo: Repository<ListCarEntity>,

        @InjectRepository(VehicleRegistrationEntity, 'mssqlConnection')
        private readonly repo: Repository<VehicleRegistrationEntity>,
        private readonly resourceStatusSyncService: ResourceStatusSyncService,
    ) { }


    // Cập nhật kinh nghiệm lái xe của tài xế
    /**
     * Cron 1 h sáng mỗi ngày
     */
    @SafeCron('0 0 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async updateDriverExperience() {
        // this.logger.log('VehicleRegistrationCron: Starting updateDriverExperience job...');
        try {
            await this.listDriverRepo.query(`
        UPDATE list_drivers
        SET experience_years = CASE 
            WHEN YEAR(GETDATE()) - YEAR(license_issued_date) < 0 THEN 0 
            ELSE YEAR(GETDATE()) - YEAR(license_issued_date) 
        END
        WHERE license_issued_date IS NOT NULL
          AND (experience_years IS NULL OR experience_years <> CASE 
              WHEN YEAR(GETDATE()) - YEAR(license_issued_date) < 0 THEN 0 
              ELSE YEAR(GETDATE()) - YEAR(license_issued_date) 
          END)
      `);
            // this.logger.log('VehicleRegistrationCron: updateDriverExperience completed successfully.');
        } catch (err) {
            this.logger.error('Failed to update driver experience in batch', err);
        }
    }
    /**
     * Cron mỗi 3 phút
     */
    @SafeCron('0 */3 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
    async run() {
        if (this.isRunning) {
            // this.logger.warn('SKIP: cron still running');
            return;
        }

        this.isRunning = true;
        // this.logger.log('VehicleRegistrationCron: Starting cron job check...');

        try {
            const records = await this.fetchCandidateRecords();
            // if (records.length > 0) {
            //     this.logger.log(`VehicleRegistrationCron: Found ${records.length} records to process.`);
            // } else {
            //     this.logger.log('VehicleRegistrationCron: No candidate records to process.');
            // }

            for (const r of records) {
                // this.logger.log(`VehicleRegistrationCron: Processing record ${r.id} (code: ${r.requestCode}, state: ${r.vehicleState})`);
                // Chiếm quyền xử lý bản ghi (Claim lock)
                const claimResult = await this.repo.createQueryBuilder()
                    .update(VehicleRegistrationEntity)
                    .set({ isProcessing: true })
                    .where("id = :id AND (isProcessing = :falseVal OR isProcessing IS NULL)", { id: r.id, falseVal: false })
                    .execute();

                if (!claimResult.affected) {
                    // this.logger.warn(`VehicleRegistrationCron: Record ${r.id} is already being processed by another worker.`);
                    continue; // Bản ghi đã được server khác chiếm, chuyển sang dòng tiếp theo
                }

                try {
                    await this.processRecordWithRetry(r);
                    // this.logger.log(`VehicleRegistrationCron: Successfully processed record ${r.id}`);
                } catch (err) {
                    const errMsg = String(err?.message || '').toLowerCase();
                    const isDeadlock = err?.number === 1205 || errMsg.includes('deadlock');
                    if (isDeadlock) {
                        this.logger.warn(`[Deadlock] Record ${r.id} failed after all retries, will retry next tick.`);
                    } else {
                        this.logger.error(`Record ${r.id} processing failed`, err);
                    }
                } finally {
                    // Giải phóng lock (hoàn tác) sau khi xử lý xong hoặc gặp lỗi
                    try {
                        await this.repo.update({ id: r.id }, { isProcessing: false });
                    } catch (releaseErr) {
                        this.logger.error(`Failed to release lock for record ${r.id}`, releaseErr);
                    }
                }
            }

            // ✅ Tự động đồng bộ lại toàn bộ trạng thái sau mỗi lượt chạy
            await this.resourceStatusSyncService.syncAll();

        } finally {
            this.isRunning = false;
            // this.logger.log('VehicleRegistrationCron: Cron job check finished.');
        }
    }

    private async processRecordWithRetry(r: VehicleRegistrationEntity, maxRetries = 3) {
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

    /**
     * Query record cần xử lý
     */
    private async fetchCandidateRecords(): Promise<VehicleRegistrationEntity[]> {

        const rows = await this.repo.query(`
      SELECT TOP (${BATCH_SIZE})
        id,
        request_code AS requestCode,
        bpmn_version AS bpmnVersion,
        timezone,
        vehicle_state AS vehicleState,
        request_submitted_at AS requestSubmittedAt,
        waiting_confirmed_at AS waitingConfirmedAt,
        departure_time AS departureTime,
        is_all_drivers_confirmed AS isAllDriversConfirmed,
        driver_notice_count AS driverNoticeCount,
        leader_notice_count AS leaderNoticeCount,
        leader_escalated_at AS leaderEscalatedAt,
        leader_notice_times AS leaderNoticeTimes,
        driver_notice_times AS driverNoticeTimes,
        coordination_information AS coordinationInformation,
        departure_reminder_sent AS departureReminderSent
      FROM vehicle_registrations WITH (READPAST)
      WHERE status = 1
        AND (is_processing = 0 OR is_processing IS NULL)
        AND (
          -- 1. Chờ điều phối (bất kể đã chuyển phó hay chưa)
          (vehicle_state = 'CHO_DIEU_PHOI')
          OR
          -- 2. Đã phân công nhưng tài xế chưa xác nhận hết (cần gửi nhắc nhở)
          (vehicle_state = 'DA_PHAN_CONG' AND is_all_drivers_confirmed = 0)
          OR
          -- 3. Đã phân công, tài xế đã xác nhận hết và ĐÃ ĐẾN GIỜ KHỞI HÀNH (hoặc quá giờ)
          (vehicle_state = 'DA_PHAN_CONG' AND is_all_drivers_confirmed = 1 AND departure_time <= GETDATE())
        )
      ORDER BY created_at
    `)

        return rows.map(r => this.repo.create(r))
    }

    /**
     * Xử lý từng record
     */
    private async processRecord(r: VehicleRegistrationEntity) {
        const rules = await this.getRules(r.bpmnVersion)
        if (!rules) return

        const tz = r.timezone || 'Asia/Ho_Chi_Minh'
        const now = dayjs().tz(tz)

        /**
         * ============================
         * CHỜ ĐIỀU PHỐI
         * ============================
         */
        if (r.vehicleState === 'CHO_DIEU_PHOI') {
            if (r.requestSubmittedAt) {
                const start = dayjs.utc(r.requestSubmittedAt).tz(tz)
                const diff = now.diff(start, 'minute')
                await this.handleApprovalReplacement(r, diff, rules)
            }

            if (r.departureTime) {
                const departureTime = dayjs.utc(r.departureTime).tz(tz)
                const diffToDeparture = departureTime.diff(now, 'minute')
                // this.logger.log(`VehicleRegistrationCron: Record ${r.id} is ${diffToDeparture} minutes away from departure.`);

                if (diffToDeparture <= 0) {
                    // this.logger.log(`VehicleRegistrationCron: Record ${r.id} has reached departure time. Triggering autoCancelTrip.`);
                    await this.autoCancelTrip(r)
                } else if (diffToDeparture <= 120 && !r.departureReminderSent) {
                    // this.logger.log(`VehicleRegistrationCron: Record ${r.id} is within 2 hours of departure. Triggering sendDepartureReminder.`);
                    await this.sendDepartureReminder(r)
                }
            }
        }

        /**
         * ============================
         * CHỜ TÀI XẾ XÁC NHẬN
         * ============================
         */
        if (r.vehicleState === 'DA_PHAN_CONG' && r.waitingConfirmedAt) {

            const waiting = dayjs.utc(r.waitingConfirmedAt).tz(tz)
            const diff = now.diff(waiting, 'minute')

            await this.handleDriverReminder(r, diff, rules)

        }

        /**
         * ============================
         * TRIP START
         * ============================
         */
        if (r.departureTime && r.isAllDriversConfirmed) {

            const departure = dayjs.utc(r.departureTime).tz(tz)

            if (now.isAfter(departure)) {
                await this.startTrip(r)
            }

        }

    }

    /**
     * DRIVER REMINDER (SAFE + NO DUPLICATE)
     */
    private async handleDriverReminder(
        r: VehicleRegistrationEntity,
        diff: number,
        rules: any
    ) {

        if (r.isAllDriversConfirmed) return

        const rule = rules['DRIVER_REMINDER']
        if (!rule) return

        const noticeTime = Number(rule.notice)
        const afterTime = Number(rule.after)
        if (!noticeTime || !afterTime) return

        const maxTimes = Math.floor(afterTime / noticeTime)

        const requestCode = r.requestCode || r.id
        const drivers = await this.getDrivers(r)
        if (!drivers.length) return

        const tz = r.timezone || 'Asia/Ho_Chi_Minh'
        const now = dayjs().tz(tz)

        const currentNoticeCount = r.driverNoticeCount || 0
        const driverTimes: string[] = JSON.parse(r.driverNoticeTimes || '[]')

        if (!r.waitingConfirmedAt) return

        const startTime = dayjs.utc(r.waitingConfirmedAt).tz(tz)

        let lastTime = startTime
        if (driverTimes.length > 0) {
            lastTime = dayjs.utc(driverTimes[driverTimes.length - 1]).tz(tz)
        }

        const minutesFromStart = now.diff(startTime, 'minute')
        const minutesFromLast = now.diff(lastTime, 'minute')

        // =========================
        // STOP nếu đủ số lần
        // =========================
        if (currentNoticeCount >= maxTimes) return

        // =========================
        // ESCALATE (dựa vào startTime)
        // =========================
        if (minutesFromStart >= afterTime) {
            const newTimes = [...driverTimes, new Date().toISOString()]

            const result = await this.repo.createQueryBuilder()
                .update(VehicleRegistrationEntity)
                .set({
                    vehicleState: VehicleState.CHO_DIEU_PHOI,
                    driverNoticeCount: maxTimes,
                    driverNoticeTimes: JSON.stringify(newTimes)
                })
                .where("id = :id", { id: r.id })
                .andWhere("driverNoticeCount = :current", { current: currentNoticeCount })
                .execute()

            if (!result.affected) {
                // this.logger.warn(`SKIP duplicate escalation ${r.id}`)
                return
            }

            // this.logger.error(`Driver escalation ${r.id}`)

            await this.notificationService.createForRecipients({
                recipientIds: drivers,
                senderId: 'system',
                content: `Chuyến xe ${requestCode} vẫn chưa được tiếp nhận, đề nghị xác nhận ngay.`,
                recordId: r.id,
                link: `/vehicle-registration/${r.id}`,
                key: 'VIEW_NEW_REQUEST',
                time: new Date(),
                status: 0
            })

            const coordinators = await this.sqlRepo.findCoordinatorInfor(r.id)

            if (coordinators) {
                await this.notificationService.createForRecipients({
                    recipientIds: [coordinators],
                    senderId: 'system',
                    content: `Tài xế chưa tiếp nhận chuyến xe ${requestCode}, đề nghị kiểm tra và xử lý điều phối.`,
                    recordId: r.id,
                    link: `/vehicle-registration/${r.id}`,
                    key: 'VIEW_NEW_REQUEST',
                    time: new Date(),
                    status: 0
                })
            }

            return
        }

        // =========================
        // REMINDER (dựa vào lastTime)
        // =========================
        if (minutesFromLast >= noticeTime) {
            const newTimes = [...driverTimes, new Date().toISOString()]

            const result = await this.repo.createQueryBuilder()
                .update(VehicleRegistrationEntity)
                .set({
                    driverNoticeCount: currentNoticeCount + 1,
                    driverNoticeTimes: JSON.stringify(newTimes)
                })
                .where("id = :id", { id: r.id })
                .andWhere("driverNoticeCount = :current", { current: currentNoticeCount })
                .execute()

            if (!result.affected) {
                // this.logger.warn(`SKIP duplicate reminder ${r.id}`)
                return
            }

            // this.logger.warn(`Driver reminder ${r.id} - lần ${currentNoticeCount + 1}`)

            await this.notificationService.createForRecipients({
                recipientIds: drivers,
                senderId: 'system',
                content: `Chuyến xe ${requestCode} đã được phân công nhưng chưa tiếp nhận, đề nghị xác nhận.`,
                recordId: r.id,
                link: `/vehicle-registration/${r.id}`,
                key: 'VIEW_NEW_REQUEST',
                time: new Date(),
                status: 0
            })
        }
    }
    /**
     * Lấy tài xế
     */
    private async getDrivers(r: VehicleRegistrationEntity): Promise<string[]> {

        const coordination = JSON.parse((r as any).coordinationInformation || '[]')

        if (!coordination.length) return []

        const drivers: string[] = []
        const carIdsToLookup: string[] = []

        for (const item of coordination) {
            if (item.driverId) {
                drivers.push(item.driverId)
            } else if (item.carId) {
                carIdsToLookup.push(item.carId)
            }
        }

        if (carIdsToLookup.length > 0) {
            const uniqueCarIds = [...new Set(carIdsToLookup)]
            const cars = await this.repo.query(
                `
        SELECT manager
        FROM list_cars
        WHERE id IN (${uniqueCarIds.map((_, i) => `@${i}`).join(', ')})
        `,
                uniqueCarIds.map((id, i) => ({ name: `${i}`, value: id }))
            )

            if (cars?.length) {
                for (const car of cars) {
                    if (car.manager) {
                        drivers.push(car.manager)
                    }
                }
            }
        }

        return [...new Set(drivers)] // remove duplicate
    }
    /**
     * APPROVAL REPLACEMENT
     */
    private async handleApprovalReplacement(
        r: VehicleRegistrationEntity,
        diff: number,
        rules: any
    ) {
        const rule = rules['APPROVAL_REPLACEMENT']
        if (!rule) return

        const noticeTime = Number(rule.notice)
        const afterTime = Number(rule.after)
        const roleAssignment = rule.role || 'PHONG_HAU_CAN_DOI_XE';
        if (!noticeTime || !afterTime) return
        if (!r.requestSubmittedAt) return

        const tz = r.timezone || 'Asia/Ho_Chi_Minh'
        const now = dayjs().tz(tz)

        const startTime = dayjs.utc(r.requestSubmittedAt).tz(tz)

        const leaderTimes: string[] = JSON.parse(r.leaderNoticeTimes || '[]')
        const currentCount = r.leaderNoticeCount || 0

        let lastTime = startTime
        if (leaderTimes.length > 0) {
            lastTime = dayjs.utc(leaderTimes[leaderTimes.length - 1]).tz(tz)
        }

        const minutesFromStart = now.diff(startTime, 'minute')
        const minutesFromLast = now.diff(lastTime, 'minute')

        const maxTimes = Math.floor(afterTime / noticeTime)

        const requestCode = r.requestCode
        /**
         * ========================
         * 1. CHUYỂN PHÓ (CHECK TRƯỚC)
         * ========================
         */
        if (minutesFromStart >= afterTime) {
            // đã chuyển rồi thì stop
            if (r.leaderEscalatedAt) return

            const newTimes = [...leaderTimes, new Date().toISOString()]

            const result = await this.repo.createQueryBuilder()
                .update(VehicleRegistrationEntity)
                .set({
                    leaderEscalatedAt: new Date(),
                    leaderNoticeCount: maxTimes,
                    leaderNoticeTimes: JSON.stringify(newTimes)
                })
                .where("id = :id", { id: r.id })
                .andWhere("leaderEscalatedAt IS NULL")
                .execute()

            if (!result.affected) {
                // this.logger.warn(`SKIP duplicate deputy transfer ${r.id}`)
                return
            }

            // this.logger.error(`TRANSFER TO DEPUTY: ${r.id}`)

            try {
                if (!r.bpmnVersion) return

                const resultTransfer = await this.vehicleRegistrationService.transferredDeputy(
                    r.id,
                    r.bpmnVersion
                )

                const workitems = await this.sqlRepo.findAllWorkItemsByDocumentAndRole(
                    r.id,
                    roleAssignment,
                );

                const assignmentUsers = [
                    ...new Set(
                        workitems.map(w => w.assignee_user_id).filter(Boolean)
                    ),
                ];

                if (assignmentUsers.length) {
                    await this.notificationService.createForRecipients({
                        recipientIds: assignmentUsers,
                        senderId: 'system',
                        content: `Chuyến xe ${requestCode} đã được chuyển quyền sang phó trưởng phòng do quá hạn xử lý.`,
                        recordId: r.id,
                        link: `/vehicle-registration/${r.id}`,
                        key: 'TRANSFER_TO_DEPUTY',
                        time: new Date(),
                        status: 0
                    });
                }
                // this.logger.log(
                //   `System transferred to deputy node ${resultTransfer.nextNodeId} - ${r.id}`
                // )

            } catch (error) {
                this.logger.error(`Transfer deputy failed ${r.id}: ${error.message}`)
            }

            return
        }

        /**
         * ========================
         * 2. NHẮC TRƯỞNG PHÒNG
         * ========================
         */
        if (currentCount >= maxTimes) return

        if (minutesFromLast >= noticeTime) {
            const newTimes = [...leaderTimes, new Date().toISOString()]

            const result = await this.repo.createQueryBuilder()
                .update(VehicleRegistrationEntity)
                .set({
                    leaderNoticeCount: currentCount + 1,
                    leaderNoticeTimes: JSON.stringify(newTimes)
                })
                .where("id = :id", { id: r.id })
                .andWhere("leaderNoticeCount = :current", { current: currentCount })
                .execute()

            if (!result.affected) {
                // this.logger.warn(`SKIP duplicate leader reminder ${r.id}`)
                return
            }

            const workitems = await this.sqlRepo.findAllWorkItemsByDocumentAndRole(
                r.id,
                roleAssignment,
            );

            const assignmentUsers = workitems.map(w => w.assignee_user_id).filter(Boolean);

            // gửi notify trưởng phòng ở đây
            await this.notificationService.createForRecipients({
                recipientIds: assignmentUsers,
                senderId: 'system',
                content: `Chuyến xe ${requestCode} chưa được điều phối, đề nghị điều phối ngay.`,
                recordId: r.id,
                link: `/vehicle-registration/${r.id}`,
                key: 'VIEW_NEW_REQUEST',
                time: new Date(),
                status: 0
            })

            // this.logger.warn(`Leader reminder ${r.id} - lần ${currentCount + 1}`)
        }
    }

    /**
     * TRIP START
     */
    private async startTrip(r: VehicleRegistrationEntity) {

        if (r.vehicleState !== 'DA_PHAN_CONG') return
        if (!r.isAllDriversConfirmed) return


        const result = await this.repo.update(
            {
                id: r.id,
                vehicleState: VehicleState.DA_PHAN_CONG
            },
            {
                vehicleState: VehicleState.TRONG_TIEN_TRINH
            }
        )

        if (!result.affected) return

        // this.logger.log(`VehicleRegistrationCron: [startTrip SUCCESS] Record ${r.id} (code: ${r.requestCode || r.id}) transitioned to TRONG_TIEN_TRINH.`);

        try {

            // 1️⃣ Lấy BPMN
            const xml = await this.sqlRepo.getBpmnFile(r.bpmnVersion)
            const { indexes } = await this.runtimeDbService.getModelFromXml(xml)

            /**
             * =============================
             * XÓA TOÀN BỘ WORKITEM CŨ
             * =============================
             */
            await this.sqlRepo.removeAllWorkItems(r.id);

            /**
             * =============================
             * TẠO WORKITEM IN_PROCESS
             * =============================
             */

            const nodesInProcess: any[] = [];
            for (const node of indexes.nodes.values()) {
                if (!node.$type || !node.$type.includes('Event')) continue;
                if (!node.outgoing || node.outgoing.length === 0) continue;
                const ext = getAllNodeExtensionProperties(node);
                if (['IN_PROCESS', 'IN_PROCESS_DRIVER'].includes(ext.actionCode) || node.name === 'IN_PROCESS' || node.id === 'IN_PROCESS') {
                    nodesInProcess.push(node);
                }
            }

            if (nodesInProcess.length === 0) {
                // this.logger.warn(`No IN_PROCESS nodes found for ${r.id}`);
                return;
            }
            // Lấy danh sách tài xế từ bảng vehicle_registration_assignments
            const assignments = await this.repo.query(
                `
         SELECT driver_id AS driverId
         FROM vehicle_registration_assignments
         WHERE registration_id = @0 AND driver_id IS NOT NULL
         `,
                [r.id]
            );
            const driverIds: string[] = assignments.map((a: any) => String(a.driverId)).filter(Boolean);

            const rules = await this.getRules(r.bpmnVersion);
            const driverRule = rules?.['IN_PROCESS_DRIVER'];
            const driverRole = driverRule?.role;

            for (const nodeInProcess of nodesInProcess) {
                const roleInProcess = indexes.laneMap.get(nodeInProcess.id);
                if (!roleInProcess) continue;

                // Lấy node tiếp theo (UserTask) của throw event
                const outgoing = indexes.outgoingBySource.get(nodeInProcess.id) || [];
                const nextFlow = outgoing[0];
                const targetNode = nextFlow?.targetRef || nodeInProcess;

                const exist = await this.repo.query(
                    `
          SELECT TOP 1 id
          FROM work_items
          WHERE document_id = @0
          AND node_id = @1
          AND role = @2
          `,
                    [r.id, targetNode.id, roleInProcess]
                );

                if (exist?.length) {
                    // this.logger.warn(`WorkItem IN_PROCESS already exists for node ${targetNode.id} with role ${roleInProcess} of request ${r.id}`);
                    continue;
                }

                // Kiểm tra xem vai trò hiện tại của node có trùng với vai trò của Tài xế hay không
                const isDriverRole = driverRole && roleInProcess === driverRole;

                if (isDriverRole) {
                    // ==========================================
                    // TRƯỜNG HỢP: VAI TRÒ TÀI XẾ
                    // ==========================================
                    // Tạo công việc riêng cho từng tài xế đã được phân công để họ xác nhận/hoàn thành
                    for (const driverId of driverIds) {
                        await this.sqlRepo.addWorkItem(
                            r.id,
                            {
                                id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                                nodeId: targetNode.id,
                                role: roleInProcess,
                                assigneeUserId: driverId, // Gán ID tài xế cụ thể nhận công việc
                                nodeType: targetNode.$type,
                            },
                            undefined,
                            r.bpmnVersion
                        );
                    }
                } else {
                    // ==========================================
                    // TRƯỜNG HỢP: VAI TRÒ ĐIỀU PHỐI (ĐỘI TRƯỞNG / ĐỘI PHÓ)
                    // ==========================================
                    // Tạo công việc chung (assigneeUserId = null) để bất kỳ ai có vai trò này đều có quyền bấm
                    await this.sqlRepo.addWorkItem(
                        r.id,
                        {
                            id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                            nodeId: targetNode.id,
                            role: roleInProcess,
                            assigneeUserId: null, // Để trống người nhận
                            nodeType: targetNode.$type,
                        },
                        undefined,
                        r.bpmnVersion
                    );
                }
            }


            const baseAudit = {
                user_id: 'Hệ thống',
                role: null,
                action_code: 'Khởi hành chuyến đi',
                receiver_unit: null,
                group_: null,
                roleProcess: 'processor',
                created_by: 'Hệ thống',
                origin_id: null,
                deadline: null,
                created_at: new Date(),
                updated_at: new Date(),
                typeDocument: 'VEHICLE_REGISTRATION',
            };

            /**
             * =============================
             * XÓA WORKITEM NHẮC NHỞ & ĐIỀU PHỐI LẠI
             * =============================
             */
            const lifecycleNodeIds = Array.from(indexes.nodes.values())
                .filter((node: any) => {
                    const props = getAllNodeExtensionProperties(node);
                    return props?.isReminderNode === 'true' || props?.isReCoordinationNode === 'true';
                })
                .map((node: any) => node.id);

            if (lifecycleNodeIds.length > 0) {
                for (const nodeId of lifecycleNodeIds) {
                    await this.repo.query(
                        `DELETE FROM work_items WHERE document_id = @0 AND node_id = @1`,
                        [r.id, nodeId]
                    );
                }
            }

            await this.sqlRepo.addAudit(r.id, {
                ...baseAudit,
                receiver: 'Hệ thống',
                display_name: 'Khởi hành chuyến đi',
                action: 'Khởi hành chuyến đi',
                details: 'Khởi hành chuyến đi',
                stage_status: stageStatusVehicle.DA_XU_LY,
                curStatusCode: null,
                from_node_id: null,
                to_node_id: null,
            },);



        } catch (err) {

            this.logger.error(
                `startTrip workflow failed ${r.id}: ${err.message}`
            )

        }

    }

    private async autoCancelTrip(r: VehicleRegistrationEntity) {
        const result = await this.repo.update(
            {
                id: r.id,
                vehicleState: VehicleState.CHO_DIEU_PHOI,
            },
            {
                vehicleState: VehicleState.DA_HUY,
                rejectionReason: 'Hệ thống tự động hủy do quá hạn điều phối',
            }
        )
        if (!result.affected) return

        // this.logger.log(`VehicleRegistrationCron: [autoCancelTrip SUCCESS] Record ${r.id} (code: ${r.requestCode || r.id}) auto-cancelled successfully.`);

        try {
            const creatorId = await this.sqlRepo.findCreatorId(r.id)

            const roleCodes = ['PHONG_HAU_CAN_DOI_XE', 'PHONG_HAU_CAN_DOI_XE_PHO', 'PHO_DOI_TRUONG_PHONG_HAU_CAN_XE'];
            const coordinatorIds: string[] = [];
            for (const roleCode of roleCodes) {
                const users = await this.sqlRepo.getUsersByRoleSQL(roleCode);
                if (users?.length) {
                    coordinatorIds.push(...users.map((u: any) => u._id));
                }
            }

            await this.sqlRepo.removeAllWorkItems(r.id)

            const baseAudit = {
                user_id: 'Hệ thống',
                role: null,
                action_code: 'Tự động hủy',
                receiver_unit: null,
                group_: null,
                roleProcess: 'processor',
                created_by: 'Hệ thống',
                origin_id: null,
                deadline: null,
                created_at: new Date(),
                updated_at: new Date(),
                typeDocument: 'VEHICLE_REGISTRATION',
            }

            await this.sqlRepo.addAudit(r.id, {
                ...baseAudit,
                receiver: 'Hệ thống',
                display_name: 'Tự động hủy chuyến đi',
                action: 'Hệ thống tự động hủy',
                details: 'Hệ thống tự động hủy do quá hạn điều phối (đến giờ khởi hành nhưng chưa được điều phối tài xế)',
                stage_status: stageStatusVehicle.DA_XU_LY,
                curStatusCode: null,
                from_node_id: null,
                to_node_id: null,
            })

            const recipientIds = [...new Set([
                ...(creatorId ? [creatorId] : []),
                ...coordinatorIds,
            ])]

            if (recipientIds.length > 0) {
                await this.notificationService.createForRecipients({
                    recipientIds,
                    senderId: 'system',
                    content: `Yêu cầu đăng ký xe ${r.requestCode || r.id} đã bị hệ thống tự động hủy do quá hạn điều phối.`,
                    recordId: r.id,
                    link: `/vehicle-registration/${r.id}`,
                    key: 'VIEW_NEW_REQUEST',
                    time: new Date(),
                    status: 0,
                })
            }
        } catch (err) {
            this.logger.error(`autoCancelTrip failed for ${r.id}: ${err.message}`)
        }
    }

    private async sendDepartureReminder(r: VehicleRegistrationEntity) {
        const result = await this.repo.update(
            {
                id: r.id,
                departureReminderSent: false,
            },
            {
                departureReminderSent: true,
            }
        )
        if (!result.affected) return

        try {
            const roleCodes = ['PHONG_HAU_CAN_DOI_XE', 'PHONG_HAU_CAN_DOI_XE_PHO', 'PHO_DOI_TRUONG_PHONG_HAU_CAN_XE'];
            const coordinatorIds: string[] = [];
            for (const roleCode of roleCodes) {
                const users = await this.sqlRepo.getUsersByRoleSQL(roleCode);
                if (users?.length) {
                    coordinatorIds.push(...users.map((u: any) => u._id));
                }
            }

            if (coordinatorIds.length > 0) {
                await this.notificationService.createForRecipients({
                    recipientIds: coordinatorIds,
                    senderId: 'system',
                    content: `Chuyến xe ${r.requestCode || r.id} còn 2 tiếng sẽ khởi hành nhưng chưa được điều phối, đề nghị xử lý ngay.`,
                    recordId: r.id,
                    link: `/vehicle-registration/${r.id}`,
                    key: 'VIEW_NEW_REQUEST',
                    time: new Date(),
                    status: 0,
                })
            }
        } catch (err) {
            this.logger.error(`sendDepartureReminder failed for ${r.id}: ${err.message}`)
        }
    }

    /**
     * Load BPMN rules
     */
    private async getRules(version?: string) {

        if (!version) return null

        const TTL = 10 * 60 * 1000 // 10 phút tính bằng mili-giây
        const now = Date.now()

        const cached = this.ruleCache.get(version)
        if (cached && (now - cached.createdAt < TTL)) {
            return cached.rules
        }

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

        this.ruleCache.set(version, { rules, createdAt: now })

        return rules

    }

}