import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PassportVoucherEntity } from './entities/passport-voucher.entity';
import { PassportVoucherItemEntity } from './entities/passport-voucher-item.entity';
import { CreatePassportVoucherDto } from './dto/create-passport-voucher.dto';
import { PassportRequestEntity } from '../passport-requests/entities/passport-request.entity';
import { PassportEntity } from '../passports/entities/passport.entity';
import { UserEntity } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

import { PassportRequestsService, PASSPORT_TYPE_MAP } from '../passport-requests/passport-requests.service';
import { WorkItemEntity } from '../work-items/entities/work-item.entity';
import { Audit } from '../database/schema-sql/audit.entity';
import { RuntimeDbService } from '../bpmn/runtime-dbmssql.service';
import { SQLSVRepository } from '../database/sqlsvRepo';
import { MSSQL_REPO } from '../database/database.provider';
import { MSSQLRepository } from '../database/sqlRepo.mssql';
import { Inject, forwardRef } from '@nestjs/common';
import BpmnEngineService from '../bpmn/bpmn-engine.service';
import { getAllNodeExtensionProperties } from 'src/utils/util';
import { NotificationService } from '../notifycation/notification.service';
import { NotificationType, NotificationKey } from '../notifycation/notification.enum';

@Injectable()
export class PassportVouchersService {
    constructor(
        @InjectRepository(PassportVoucherEntity, 'mssqlConnection')
        private voucherRepo: Repository<PassportVoucherEntity>,
        @InjectRepository(PassportVoucherItemEntity, 'mssqlConnection')
        private itemRepo: Repository<PassportVoucherItemEntity>,
        @InjectRepository(PassportRequestEntity, 'mssqlConnection')
        private requestRepo: Repository<PassportRequestEntity>,
        @InjectRepository(PassportEntity, 'mssqlConnection')
        private passportRepo: Repository<PassportEntity>,
        @InjectRepository(UserEntity, 'mssqlConnection')
        private userRepo: Repository<UserEntity>,
        @InjectRepository(WorkItemEntity, 'mssqlConnection')
        private workItemRepo: Repository<WorkItemEntity>,
        @InjectRepository(Audit, 'mssqlConnection')
        private auditRepo: Repository<Audit>,
        private requestsService: PassportRequestsService,
        private runtimeDbService: RuntimeDbService,
        private sqlsvRepo: SQLSVRepository,
        @Inject(MSSQL_REPO) private sqlRepo: MSSQLRepository,
        private bpmnEngine: BpmnEngineService,
        private notificationService: NotificationService,
    ) { }

    async create(createDto: CreatePassportVoucherDto, userId: string) {
        // 1. Kiểm tra requestId
        if (!createDto.requestId) {
            throw new BadRequestException('Vui lòng cung cấp requestId để tạo biên bản');
        }

        // 2. Lấy dữ liệu request và passport tương ứng
        const request = await this.requestRepo.findOne({
            where: { id: createDto.requestId, isDeleted: false },
            relations: ['passport', 'requester', 'delegationItems'],
        });

        if (!request) {
            throw new BadRequestException('Yêu cầu không tồn tại');
        }

        // 3. Lấy tên người thực hiện (người giao) - ưu tiên fromName từ FE, fallback về DB
        const performer = await this.userRepo.findOne({ where: { id: userId } });
        const performerName = createDto.fromName || performer?.name || userId;

        // Lấy tất cả các biên bản bàn giao liên quan để tổng hợp dữ liệu
        const handoverVouchers = await this.voucherRepo.find({
            where: {
                requestId: createDto.requestId,
                voucherType: 'HANDOVER',
                status: In(['COMPLETED', 'SIGN_VOUCHER']),
            },
            relations: ['items'],
        });
        const handoverItems = handoverVouchers.flatMap(v => v.items || []);

        // Lấy biên bản bàn giao gần nhất để làm mặc định cho một số thông tin (đơn vị, người nhận...)
        const handoverVoucher = handoverVouchers.length > 0
            ? [...handoverVouchers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
            : null;

        // 4. Tạo voucher code (BBBG-YYYYMMDD-XXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = createDto.voucherType === 'HANDOVER' ? 'BBBG' : 'BBHT';
        const count = await this.voucherRepo.count({
            where: { voucherType: createDto.voucherType },
        });
        const voucherCode = `${prefix}-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

        // 5. Tính toán summaryMeta (tổng số lượng theo loại hộ chiếu)
        const passportSummary: Record<string, number> = {};
        const selectedIds = createDto.selectedItemIds || [];
        const isSelected = (id: string, passportId?: string | null) => {
            if (!selectedIds || selectedIds.length === 0) return true; // Mặc định chọn tất cả hợp lệ nếu không truyền lên
            return selectedIds.includes(id) || (!!passportId && selectedIds.includes(passportId));
        };
        if (request.typeRequest === 'organization' || request.typeRequest === 'organizational') {
            if (handoverItems.length > 0) {
                // Ưu tiên lấy từ tổng hợp các biên bản bàn giao
                handoverItems.forEach((item: any) => {
                    // Đối với đoàn ra, ID từ FE truyền lên (selectedIds) chính là ID của item trong biên bản bàn giao
                    if (isSelected(item.id, item.passportId) && item.passportId) {
                        const type = item.passportType || 'Khác';
                        passportSummary[type] = (passportSummary[type] || 0) + 1;
                    }
                });
            } else if (request.delegationItems && request.delegationItems.length > 0) {
                request.delegationItems.forEach(member => {
                    if (isSelected(member.id, member.passportId) && member.passportId) {
                        const type = member.passportType || 'Khác';
                        passportSummary[type] = (passportSummary[type] || 0) + 1;
                    }
                });
            }
        } else {
            if (isSelected(request.id, request.passportId) && request.passportId) {
                const type = request.passportType || 'Khác';
                passportSummary[type] = (passportSummary[type] || 0) + 1;
            }
        }
        const summary = {
            ...passportSummary,
            ...(createDto.performerRole ? { performerRole: createDto.performerRole } : {}),
        };

        // 6. Lưu Voucher
        const voucher = this.voucherRepo.create({
            id: uuidv4(),
            voucherCode,
            voucherType: createDto.voucherType,
            requestId: createDto.requestId,
            unitName: createDto.unitName || handoverVoucher?.unitName || request.requester?.organizationName || null,
            departmentName: createDto.departmentName || handoverVoucher?.departmentName || null,
            receiverName: createDto.receiverName || (
                createDto.voucherType === 'RETURN'
                    ? null  // BPCT: sẽ lấy tên theo handlerId bên dưới
                    : (handoverVoucher?.receiverName || request.requester?.name || null)
            ),
            receiverId: createDto.receiverId || (
                createDto.voucherType === 'RETURN'
                    ? (request.handlerId || null)  // BPCT là người nhận lại HC khi hoàn trả
                    : (handoverVoucher?.receiverId || request.requesterId || null)
            ),
            performerId: userId,
            performerName: performerName,
            performerSignature: performerName,
            performerSignedAt: new Date(),
            note: createDto.note,
            partialReturnReason: createDto.partialReturnReason || null,
            summaryMeta: summary,
            status: 'WAIT_RECEIVER_SIGN',
            createdBy: userId,
        });

        const savedVoucher = await this.voucherRepo.save(voucher);

        // --- Gửi thông báo cho người nhận (cần ký) ---
        if (savedVoucher.receiverId) {
            const content = savedVoucher.voucherType === 'HANDOVER'
                ? `Bạn có biên bản bàn giao hộ chiếu mới cần ký xác nhận (${savedVoucher.voucherCode})`
                : `Có biên bản hoàn trả hộ chiếu ${savedVoucher.voucherCode} cần ký xác nhận.`;

            await this.notificationService.create({
                content,
                recipientId: savedVoucher.receiverId,
                senderId: userId,
                key: 'VIEW_REQUEST_LIST',
                type: NotificationType.PASSPORT_BORROW_FORWARDED.value,
                recordId: request.id,
            });
        }

        const items: PassportVoucherItemEntity[] = [];
        const itemNotes = createDto.itemNotes || {};

        // Lấy thông tin trạng thái hộ chiếu để lọc
        const allPassportIds: string[] = [];
        handoverItems.forEach(i => i.passportId && allPassportIds.push(i.passportId));
        if (request.delegationItems) request.delegationItems.forEach(i => i.passportId && allPassportIds.push(i.passportId));
        if (request.passportId) allPassportIds.push(request.passportId);

        const passportList = allPassportIds.length > 0 ? await this.passportRepo.find({ where: { id: In(allPassportIds) } }) : [];
        const passportMap = new Map(passportList.map(p => [p.id, p]));

        // --- VALIDATION: Chặn mượn chồng cho Biên bản BÀN GIAO ---
        if (createDto.voucherType === 'HANDOVER') {
            const unavailablePassports: string[] = [];

            if (request.typeRequest === 'organization' || request.typeRequest === 'organizational') {
                if (request.delegationItems && request.delegationItems.length > 0) {
                    for (const member of request.delegationItems) {
                        if (isSelected(member.id, member.passportId) && member.passportId) {
                            const p = passportMap.get(member.passportId);
                            if (p && p.usageStatus !== 'STORING') {
                                unavailablePassports.push(`${member.fullName || 'Thành viên'} (${p.passportNumber})`);
                            }
                        }
                    }
                }
            } else {
                if (isSelected(request.id, request.passportId) && request.passportId) {
                    const p = passportMap.get(request.passportId);
                    if (p && p.usageStatus !== 'STORING') {
                        unavailablePassports.push(`${request.passport?.fullName || request.requester?.name || 'Cá nhân'} (${p.passportNumber})`);
                    }
                }
            }

            if (unavailablePassports.length > 0) {
                throw new BadRequestException(`Không thể lập biên bản bàn giao. Các hộ chiếu sau đang được đơn khác mượn (Trạng thái khác Sẵn sàng): ${unavailablePassports.join(', ')}`);
            }
        }

        // Lấy danh sách PassportId đã nằm trong các biên bản hoàn trả (RETURN) hiện có (trừ các biên bản bị từ chối/huỷ nếu có)
        let returnedPassportIds: string[] = [];
        if (createDto.voucherType === 'RETURN') {
            const existingReturnItems = await this.itemRepo.createQueryBuilder('item')
                .innerJoin('item.voucher', 'v')
                .where('item.requestId = :requestId', { requestId: createDto.requestId })
                .andWhere('v.voucherType = :voucherType', { voucherType: 'RETURN' })
                .andWhere('v.status NOT IN (:...excludeStatuses)', { excludeStatuses: ['REJECTED', 'REJECT_VOUCHER', 'CANCELLED'] })
                .select('item.passportId', 'passportId')
                .getRawMany();
            returnedPassportIds = existingReturnItems.map(i => i.passportId).filter(pid => !!pid);
        }

        const isSelectable = (passportId: string | null) => {
            if (!passportId) return true;

            // Nếu hộ chiếu đã nằm trong một biên bản hoàn trả khác (đang chờ ký hoặc đã xong) thì không cho chọn lại
            if (createDto.voucherType === 'RETURN' && returnedPassportIds.includes(passportId)) {
                return false;
            }

            const p = passportMap.get(passportId);
            if (createDto.voucherType === 'HANDOVER') {
                return p?.usageStatus === 'STORING';
            }
            if (createDto.voucherType === 'RETURN') {
                return p?.usageStatus === 'IN_USE'; // Chỉ hoàn trả hộ chiếu đang sử dụng
            }
            return true;
        };

        // Ưu tiên lấy từ danh sách đã bàn giao (nếu là biên bản hoàn trả)
        if (createDto.voucherType === 'RETURN' && handoverItems.length > 0) {
            // Tạo item hoàn trả từ các item đã bàn giao
            for (const hItem of handoverItems) {
                if (isSelected(hItem.id, hItem.passportId) && hItem.passportId && isSelectable(hItem.passportId)) {
                    const passport = passportMap.get(hItem.passportId);
                    const pNumber = hItem.passportNumber || passport?.passportNumber;

                    if (!pNumber) continue; // Bỏ qua nếu không có số hộ chiếu

                    const item = new PassportVoucherItemEntity();
                    item.id = uuidv4();
                    item.voucherId = savedVoucher.id;
                    item.requestId = request.id;
                    item.passportId = hItem.passportId;
                    item.fullName = hItem.fullName || null;
                    item.passportNumber = pNumber;
                    item.passportType = hItem.passportType || null;
                    item.expiryDate = hItem.expiryDate || passport?.expiryDate || null;
                    item.itemCondition = 'Tốt';
                    item.note = itemNotes[hItem.id] || itemNotes[hItem.passportId!] || null;
                    items.push(item);
                }
            }
        } else if (request.delegationItems && request.delegationItems.length > 0) {
            for (const member of request.delegationItems) {
                if (isSelected(member.id, member.passportId) && member.passportId && isSelectable(member.passportId)) {
                    const passport = passportMap.get(member.passportId);
                    const pNumber = member.passportNumber || passport?.passportNumber;

                    if (!pNumber) continue; // Bỏ qua nếu không có số hộ chiếu

                    const item = new PassportVoucherItemEntity();
                    item.id = uuidv4();
                    item.voucherId = savedVoucher.id;
                    item.requestId = request.id;
                    item.passportId = member.passportId;
                    item.fullName = member.fullName || null;
                    item.passportNumber = pNumber;
                    item.passportType = member.passportType || null;
                    item.expiryDate = member.expiryDate || passport?.expiryDate || null;
                    item.itemCondition = 'Tốt';
                    item.note = itemNotes[member.id] || null;
                    items.push(item);
                }
            }
        } else {
            // Fallback cho trường hợp cũ hoặc chưa kịp migrate (nếu có)
            if (isSelected(request.id, request.passportId) && request.passportId && isSelectable(request.passportId)) {
                const passport = passportMap.get(request.passportId);
                const pNumber = request.passportNumber || passport?.passportNumber;

                if (pNumber) {
                    const item = new PassportVoucherItemEntity();
                    item.id = uuidv4();
                    item.voucherId = savedVoucher.id;
                    item.requestId = request.id;
                    item.passportId = request.passportId;
                    item.fullName = request.passport?.fullName || request.requester?.name || null;
                    item.passportNumber = pNumber;
                    item.passportType = request.passportType || null;
                    item.expiryDate = request.passport?.expiryDate || null;
                    item.itemCondition = 'Tốt';
                    item.note = itemNotes[request.id] || itemNotes[request.passportId!] || null;
                    items.push(item);
                }
            }
        }

        if (items.length === 0) {
            // Rollback voucher nếu không có bản ghi nào để lưu
            await this.voucherRepo.delete(savedVoucher.id);
            throw new BadRequestException('Không có hộ chiếu hợp lệ nào (đầy đủ số hộ chiếu) để đưa vào biên bản. Vui lòng kiểm tra lại thông tin hộ chiếu hoặc danh sách đoàn ra.');
        }

        await this.itemRepo.save(items);

        // === BPMN: 1. Khởi tạo luồng cho chính bản thân biên bản này ===
        try {
            const bpmnUser: any = await this.sqlsvRepo.getUserById(userId);
            const ouId = bpmnUser?.parent?.id;
            if (ouId) {
                // Sửa: Lấy luồng của Voucher thay vì Request (nếu Voucher có luồng riêng)
                // Nếu Voucher dùng chung luồng của Request thì giữ nguyên, nhưng thường là có luồng riêng
                const flowConfig = await this.sqlsvRepo.getFlowByUnit(String(ouId), 'PassportRequest');
                if (flowConfig) {
                    const bpmnXML = await this.runtimeDbService.getBpmnFile(flowConfig.id);

                    // Chuẩn bị thông tin chi tiết để lưu vào Audit log của BPMN
                    const auditDetails = items.map(item => ({
                        fullName: item.fullName,
                        passportNumber: item.passportNumber,
                        passportType: item.passportType,
                        note: item.note
                    }));

                    await this.runtimeDbService.createDocumentAtNodeVoucher({
                        bpmnXML,
                        data: {
                            documentId: savedVoucher.id,
                            requestId: request.id, // Truyền requestId để BPMN kế thừa node
                            receiverId: createDto.receiverId,
                            receiverUnit: createDto.unitName,
                            statusCode: savedVoucher.status,
                            voucherType: savedVoucher.voucherType,
                            details: auditDetails, // Truyền chi tiết items/notes
                        },
                        assigneeUserId: userId,
                        flowId: String(flowConfig.id),
                    });
                }
            }
        } catch (bpmnError) {
            console.error('[Voucher BPMN] Lỗi khởi tạo luồng cho biên bản:', bpmnError.message);
        }

        // === Xử lý nghiệp vụ bổ sung sau khi tạo biên bản ===
        const processedRequests = new Set<string>();

        // 8. Nếu là biên bản RETURN -> Tạo audit record cho Request (BPMN đã được xử lý trong createDocumentAtNodeVoucher)
        if (createDto.voucherType === 'RETURN') {
            // const requestData = await this.requestRepo.findOne({ where: { id: request.id } });
            // Tạo audit record cho Request
            await this.addAuditRecord(request.id, {
                userId: userId,
                receiverName: performerName,
                actionCode: 'IN_USE',
                action: 'BPCT lập biên bản hoàn trả',
                stageStatus: 'CHUA_XU_LY',
                curStatusCode: 'IN_USE',
                receiver: createDto.receiverId,
                typeDocument: 'PassportRequest',
            });
        }
        // 9. Nếu là biên bản HANDOVER -> Chuyển yêu cầu về "Chờ tiếp nhận"
        else if (createDto.voucherType === 'HANDOVER') {
            // Cập nhật trạng thái yêu cầu và chuyển bước BPMN sang "Chờ ký xác nhận"
            await this.requestRepo.update(request.id, { status: 'WAIT_RECEIVE', updatedBy: userId });

            const receiverId = request.requesterId || request.createdBy || undefined;
            await this.requestsService.advanceToVoucherSign(request.id, userId, receiverId);

            // Tạo audit record CHUYEN_XU_LY trỏ đến người tạo yêu cầu
            await this.addAuditRecord(request.id, {
                userId: userId,
                displayName: performerName,
                actionCode: 'CHUYEN_XU_LY',
                action: 'BPCT lập biên bản bàn giao',
                stageStatus: 'CHUA_XU_LY',
                curStatusCode: 'WAIT_RECEIVE',
                receiver: receiverId,
                typeDocument: 'PassportRequest',
            });
        }

        // Ánh xạ summaryMeta sang hiển thị tiếng Việt trước khi trả về
        const mappedSummary: Record<string, number> = {};
        if (savedVoucher.summaryMeta) {
            Object.keys(savedVoucher.summaryMeta).forEach(key => {
                const title = PASSPORT_TYPE_MAP[key] || key;
                mappedSummary[title] = savedVoucher.summaryMeta[key];
            });
        }

        return {
            statusCode: 201,
            message: createDto.voucherType === 'HANDOVER'
                ? 'Tạo biên bản bàn giao thành công. Chờ bên nhận ký xác nhận.'
                : 'Tạo biên bản hoàn trả thành công và đã cập nhật trạng thái các yêu cầu.',
            data: {
                ...savedVoucher,
                summaryMeta: mappedSummary,
            },
        };
    }

    async signVoucher(id: string, userId: string) {
        const voucher = await this.voucherRepo.findOne({
            where: { id },
            relations: ['items', 'items.request'],
        } as any);

        if (!voucher) throw new NotFoundException('Biên bản không tồn tại');
        if (voucher.status !== 'WAIT_RECEIVER_SIGN') {
            throw new BadRequestException('Biên bản không ở trạng thái chờ ký hoặc đã hoàn tất');
        }

        if (voucher.receiverId !== userId) {
            throw new BadRequestException('Bạn không có quyền ký biên bản này');
        }

        // 1. Lấy tên người ký (người nhận)
        const receiver = await this.userRepo.findOne({ where: { id: userId } });
        const receiverName = receiver?.name || userId;

        // 2. Cập nhật thông tin chữ ký bên nhận
        await this.voucherRepo.update(id, {
            receiverSignature: receiverName,
            receiverSignedAt: new Date(),
            status: 'COMPLETED',
            updatedBy: userId,
        });

        // 3. Chuyển bước BPMN cho biên bản
        await this.moveToNextNode(id, userId, receiverName, 'SIGN_VOUCHER', 'Ký biên bản');

        // --- Gửi thông báo cho người lập biên bản (BPCT) ---
        if (voucher.performerId) {
            const content = voucher.voucherType === 'HANDOVER'
                ? `Biên bản bàn giao ${voucher.voucherCode} đã được ký xác nhận.`
                : `Biên bản hoàn trả ${voucher.voucherCode} đã được ký xác nhận.`;

            await this.notificationService.create({
                content,
                recipientId: voucher.performerId,
                senderId: userId,
                key: voucher.voucherType === 'RETURN' ? NotificationKey.VIEW_PASSPORT_RETURN_SLIP : NotificationKey.VIEW_PASSPORT_LIST,
                type: voucher.voucherType === 'HANDOVER'
                    ? NotificationType.PASSPORT_HANDOVER_SIGNED.value
                    : NotificationType.PASSPORT_RETURN_SIGNED.value,
                recordId: voucher.items?.[0]?.requestId || id,
            });
        }

        // 1. Cập nhật trạng thái của TẤT CẢ hộ chiếu trong biên bản trước để các hàm kiểm tra sau đó (như checkAndCompleteRequest) có dữ liệu chính xác
        const passportIds = voucher.items.map(i => i.passportId).filter(id => !!id);
        if (passportIds.length > 0) {
            const usageStatus = voucher.voucherType === 'RETURN' ? 'STORING' : 'IN_USE';
            await this.passportRepo.update({ id: In(passportIds) }, { usageStatus, updatedBy: userId });
        }

        // 2. Thực hiện các bước nghiệp vụ cho từng yêu cầu duy nhất trong biên bản
        const processedRequests = new Set<string>();

        for (const item of voucher.items) {
            try {
                // Tính số lượng hộ chiếu của yêu cầu này trong biên bản hiện tại
                const requestItemsInVoucher = voucher.items.filter(i => i.requestId === item.requestId);
                const itemCount = requestItemsInVoucher.length;

                if (voucher.voucherType === 'HANDOVER') {
                    // Chuyển trạng thái yêu cầu sang IN_USE và hoàn thành bước BPMN
                    if (item.requestId && !processedRequests.has(item.requestId)) {
                        await this.requestsService.handover(item.requestId, userId, voucher.voucherCode, itemCount);

                        // Thêm Audit log trạng thái IN_USE cho Request
                        await this.sqlRepo.addAudit(item.requestId, {
                            userId: userId,
                            displayName: receiverName,
                            action: 'Bàn giao hộ chiếu',
                            actionCode: 'IN_USE',
                            stage_status: 'DA_XU_LY',
                            curStatusCode: 'IN_USE',
                            typeDocument: 'PassportRequest',
                            receiver: voucher.receiverId,
                        });

                        // Chuyển bước BPMN của yêu cầu: KY_XAC_NHAN → hoàn tất
                        await this.requestsService.advanceAfterVoucherSigned(item.requestId, userId, voucher.performerId || undefined);
                        processedRequests.add(item.requestId);
                    }
                } else if (voucher.voucherType === 'RETURN') {
                    // Kiểm tra và hoàn tất yêu cầu + chuyển Request BPMN sang hoàn thành
                    if (item.requestId && !processedRequests.has(item.requestId)) {
                        const note = voucher.note || `Hoàn trả ${itemCount} hộ chiếu qua biên bản ${voucher.voucherCode}`;
                        await this.requestsService.checkAndCompleteRequest(item.requestId, userId, note, voucher.voucherCode, itemCount);
                        processedRequests.add(item.requestId);
                    }
                }
            } catch (error) {
                console.error(`Lỗi xử lý yêu cầu ${item.requestId} khi ký biên bản ${voucher.voucherType}: ${error.message}`);
            }
        }



        return {
            statusCode: 200,
            message: voucher.voucherType === 'HANDOVER'
                ? 'Ký xác nhận biên bản thành công. Hộ chiếu đã được bàn giao và đang sử dụng.'
                : 'Ký xác nhận biên bản thành công. Hộ chiếu đã được hoàn trả về kho.',
        };
    }

    async rejectVoucher(id: string, userId: string, rejectReason?: string) {
        const voucher = await this.voucherRepo.findOne({
            where: { id },
            relations: ['items'],
        } as any);

        if (!voucher) {
            throw new NotFoundException('Biên bản không tồn tại');
        }

        if (voucher.status !== 'WAIT_RECEIVER_SIGN') {
            throw new BadRequestException('Biên bản không ở trạng thái chờ ký để từ chối');
        }

        if (voucher.receiverId !== userId) {
            throw new BadRequestException('Bạn không có quyền từ chối biên bản này');
        }

        const rejector = await this.userRepo.findOne({ where: { id: userId } });
        const rejectorName = rejector?.name || userId;
        const normalizedReason = rejectReason?.trim() || 'Từ chối ký xác nhận biên bản';

        const mergedNote = [voucher.note, `[REJECT] ${normalizedReason}`]
            .filter(Boolean)
            .join('\n');

        await this.voucherRepo.update(id, {
            status: 'REJECTED',
            updatedBy: userId,
            note: mergedNote,
        });

        if (voucher.voucherType === 'RETURN') {
            const relatedRequestIds = [...new Set(
                (voucher.items || [])
                    .map(item => item.requestId)
                    .filter((requestId): requestId is string => !!requestId),
            )];

            const historyNote = `Biên bản hoàn trả ${voucher.voucherCode} bị từ chối ký${normalizedReason ? `: ${normalizedReason}` : '.'}`;
            await Promise.all(
                relatedRequestIds.map((requestId) =>
                    this.requestsService.recordReturnVoucherRejectedHistory(requestId, userId, historyNote),
                ),
            );
        }

        await this.moveToNextNode(id, userId, rejectorName, 'REJECT_VOUCHER', 'Từ chối biên bản', normalizedReason);

        if (voucher.performerId) {
            const content = voucher.voucherType === 'HANDOVER'
                ? `Biên bản bàn giao ${voucher.voucherCode} đã bị từ chối ký.`
                : `Biên bản hoàn trả ${voucher.voucherCode} đã bị từ chối ký.`;

            await this.notificationService.create({
                content,
                recipientId: voucher.performerId,
                senderId: userId,
                key: voucher.voucherType === 'RETURN' ? NotificationKey.VIEW_PASSPORT_RETURN_SLIP : NotificationKey.VIEW_PASSPORT_LIST,
                type: voucher.voucherType === 'HANDOVER'
                    ? NotificationType.PASSPORT_BORROW_REJECTED.value
                    : NotificationType.PASSPORT_RETURN_REJECTED.value,
                recordId: voucher.items?.[0]?.requestId || id,
            });
        }

        return {
            statusCode: 200,
            message: 'Từ chối biên bản thành công',
            data: {
                id,
                status: 'REJECTED',
                rejectReason: normalizedReason,
            },
        };
    }

    private async addAuditRecord(documentId: string, data: any) {
        const audit = this.auditRepo.create({
            documentId,
            time: new Date(),
            userId: data.userId,
            displayName: data.displayName,
            role: data.role,
            actionCode: data.actionCode,
            fromNodeId: data.fromNodeId,
            toNodeId: data.toNodeId,
            createdBy: data.createdBy,
            receiver: data.receiver,
            receiverUnit: data.receiverUnit,
            roleProcess: data.roleProcess,
            action: data.action,
            deadline: data.deadline,
            stageStatus: data.stageStatus,
            details: data.details,
            curStatusCode: data.curStatusCode,
            typeDocument: data.typeDocument || 'PassportVoucher',
        } as any);
        await this.auditRepo.save(audit);
    }

    private async closeOpenWorkItems(documentId: string, state: string) {
        await this.workItemRepo.update({ documentId, state: 'open' }, { state });
    }

    private async moveToNextNode(
        documentId: string,
        userId: string,
        displayName: string,
        actionCode: string,
        actionLabel: string,
        details?: string,
    ) {
        try {
            const openWi = await this.workItemRepo.findOne({
                where: { documentId, state: 'open' },
            });
            if (!openWi) return;

            const bpmnVersion = openWi.bpmnVersion;
            const bpmnXML = await this.sqlRepo.getBpmnFile(bpmnVersion || '');
            if (!bpmnXML) return;

            const { indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
            const currentNode = indexes.nodes.get(openWi.nodeId);
            if (!currentNode) return;

            const flow = this.selectOutgoingFlow(currentNode, actionCode);
            const { node: nextNode } = this.bpmnEngine.nextInteractiveFromFlow(flow, indexes);

            await this.closeOpenWorkItems(documentId, 'completed');

            if (!nextNode) {
                // End node
                await this.addAuditRecord(documentId, {
                    userId, displayName, role: openWi.role,
                    actionCode, fromNodeId: openWi.nodeId, toNodeId: null,
                    createdBy: userId, receiver: userId,
                    stageStatus: 'DA_XU_LY', curStatusCode: 'COMPLETED',
                    typeDocument: 'PassportVoucher', action: actionLabel, details,
                });
                return;
            }

            // If there's a next node, create a new workItem
            const nextNodeId = nextNode.id;
            const nextRole = indexes.laneMap.get(nextNodeId);
            const nextStatusCode = getAllNodeExtensionProperties(nextNode)?.statusCode || actionCode;

            // Lấy thông tin voucher để xác định người nhận WorkItem
            const voucher = await this.voucherRepo.findOne({ where: { id: documentId } });
            const performerId = voucher?.performerId;
            const receiverId = voucher?.receiverId;

            // Biên bản RETURN: người bàn giao trước đó (receiverId) là người cần ký xác nhận hoàn trả
            // Biên bản HANDOVER: người tạo biên bản (performerId) tiếp tục xử lý
            const assigneeId = voucher?.voucherType === 'RETURN'
                ? (receiverId || performerId || userId)
                : (performerId || userId);

            const newWiId = `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await this.workItemRepo.save({
                id: newWiId,
                documentId,
                nodeId: nextNodeId,
                role: nextRole || openWi.role,
                assigneeUserId: assigneeId,
                nodeType: nextNode.$type,
                state: 'open',
                createdAt: new Date(),
                bpmnVersion,
            });

            await this.addAuditRecord(documentId, {
                userId,
                displayName,
                role: openWi.role,
                actionCode,
                fromNodeId: openWi.nodeId,
                toNodeId: nextNodeId,
                createdBy: userId,
                receiver: assigneeId,
                stageStatus: 'CHUA_XU_LY',
                curStatusCode: nextStatusCode,
                typeDocument: 'PassportVoucher',
                action: actionLabel,
                details,
            });

            // Cập nhật trạng thái Voucher đồng bộ
            await this.sqlRepo.updateVoucherStatus(documentId, nextStatusCode);
        } catch (error) {
            console.error('[Voucher BPMN] Error moving to next node:', error, error.message);
        }
    }

    private selectOutgoingFlow(currentNode: any, actionCode: string) {
        const outgoingFlows = currentNode?.outgoing || [];
        if (outgoingFlows.length <= 1) {
            return outgoingFlows[0];
        }

        const normalizedAction = String(actionCode || '').toUpperCase();
        const isRejectAction = normalizedAction.includes('REJECT') || normalizedAction.includes('TU_CHOI');
        const keywords = isRejectAction
            ? ['TU_CHOI', 'REJECT', 'TỪ CHỐI', 'TU CHOI']
            : ['KY_XAC_NHAN', 'SIGN', 'XAC_NHAN', 'KÝ XÁC NHẬN', 'KY XAC NHAN'];

        const matchedFlow = outgoingFlows.find((flow: any) => {
            const values = [
                flow?.id,
                flow?.name,
                flow?.businessObject?.id,
                flow?.businessObject?.name,
                flow?.targetRef?.id,
                flow?.targetRef?.name,
                flow?.sourceRef?.id,
                flow?.sourceRef?.name,
            ]
                .filter(Boolean)
                .map((value: any) => String(value).toUpperCase());

            return keywords.some((keyword) => values.some((value: string) => value.includes(keyword)));
        });

        return matchedFlow || outgoingFlows[0];
    }

    async findAll(params: any) {
        const { page = 1, limit = 20, type } = params;
        const qb = this.voucherRepo.createQueryBuilder('v')
            .orderBy('v.created_at', 'DESC');

        if (type) {
            qb.andWhere('v.voucher_type = :type', { type });
        }

        const [items, total] = await qb
            .skip((+page - 1) * +limit)
            .take(+limit)
            .getManyAndCount();

        return {
            statusCode: 200,
            data: items,
            total,
            page: +page,
            limit: +limit,
        };
    }

    async findOne(id: string, userId?: string) {
        const voucher = await this.voucherRepo.findOne({
            where: { id },
            relations: ['items'],
        });

        if (!voucher) throw new NotFoundException('Biên bản không tồn tại');

        // Lấy thông tin trạng thái hộ chiếu thực tế cho từng item
        const passportIds = (voucher.items || []).map(i => i.passportId).filter(pid => !!pid);
        const passports = passportIds.length > 0
            ? await this.passportRepo.find({ where: { id: In(passportIds) } })
            : [];
        const passportMap = new Map(passports.map(p => [p.id, p]));

        // Ánh xạ summaryMeta
        const mappedSummary: Record<string, number> = {};
        if (voucher.summaryMeta) {
            Object.keys(voucher.summaryMeta).forEach(key => {
                const title = PASSPORT_TYPE_MAP[key] || key;
                mappedSummary[title] = voucher.summaryMeta[key];
            });
        }

        // Lấy danh sách PassportId đã nằm trong các biên bản hoàn trả (RETURN) đã hoàn tất/ký
        const returnedItems = await this.itemRepo.createQueryBuilder('item')
            .innerJoin('item.voucher', 'v')
            .where('item.requestId = :requestId', { requestId: voucher.requestId })
            .andWhere('v.voucherType = :voucherType', { voucherType: 'RETURN' })
            .andWhere('v.status IN (:...statuses)', { statuses: ['COMPLETED', 'SIGN_VOUCHER'] })
            .select('item.passportId', 'passportId')
            .getRawMany();
        const returnedPassportIds = returnedItems.map(i => i.passportId).filter(pid => !!pid);

        // Ánh xạ items.passportType và đính kèm trạng thái sử dụng thực tế, đánh dấu đã trả
        const mappedItems = (voucher.items || []).map(item => {
            const p = item.passportId ? passportMap.get(item.passportId) : null;
            const isAlreadyReturned = item.passportId ? returnedPassportIds.includes(item.passportId) : false;

            return {
                ...item,
                expiryDate: item.expiryDate || p?.expiryDate || null,
                passportType: item.passportType ? { value: item.passportType, title: PASSPORT_TYPE_MAP[item.passportType] || item.passportType } : null,
                usageStatus: p?.usageStatus || 'IN_USE', // Trạng thái hiện tại từ kho
                isReturned: isAlreadyReturned, // Đánh dấu hộ chiếu này đã được hoàn trả tại biên bản khác
            };
        })
        // }).filter(item => item.usageStatus === 'IN_USE');

        // Tính tổng số từng loại hộ chiếu trên danh sách đã lọc
        const stats = mappedItems.reduce(
            (acc, item) => {
                const type = (item.passportType as any)?.value?.toUpperCase();
                if (type === 'DIPLOMATIC') acc.totalDiplomaticPassports += 1;
                if (type === 'OFFICIAL') acc.totalOfficialPassports += 1;
                if (type === 'ORDINARY') acc.totalOrdinaryPassports += 1;
                return acc;
            },
            {
                totalDiplomaticPassports: 0,
                totalOfficialPassports: 0,
                totalOrdinaryPassports: 0,
            }
        );

        // ===== Compute available actions (BPMN) =====
        const availableActions: any[] = [];
        let flags: Record<string, boolean> = {};
        const perItems: any[] = [];

        if (userId) {
            try {
                const openWorkItems = await this.workItemRepo.find({
                    where: { documentId: id, state: 'open' },
                });

                if (openWorkItems.length > 0) {
                    const bpmnVersion = openWorkItems[0].bpmnVersion;
                    const bpmnXML = bpmnVersion ? await this.sqlRepo.getBpmnFile(bpmnVersion) : null;

                    if (bpmnXML) {
                        const { process, indexes } = await this.runtimeDbService.getModelFromXml(bpmnXML);
                        const audit = await this.auditRepo.find({
                            where: { documentId: id },
                            order: { time: 'DESC' },
                        } as any);

                        for (const wi of openWorkItems) {
                            const res = await this.bpmnEngine.computeAvailableActions({
                                process,
                                indexes,
                                currentNodeId: wi.nodeId || '',
                                workItem: wi as any,
                                document: voucher,
                                userId,
                                userRoles: [],
                                getUsersByRole: (role) => this.sqlsvRepo.getUsersByRoleMongoDB(role),
                                audit: audit as any[],
                            });

                            perItems.push({
                                workItem: {
                                    id: wi.id,
                                    nodeId: wi.nodeId,
                                    role: wi.role,
                                    assigneeUserId: wi.assigneeUserId,
                                    state: wi.state,
                                },
                                availableActions: res.availableActions,
                                flags: res.flags,
                            });

                            // Merge available actions and flags
                            res.availableActions.forEach((act: any) => {
                                if (!availableActions.find((a) => a.code === act.code)) {
                                    availableActions.push(act);
                                }
                            });
                            flags = { ...flags, ...res.flags };
                        }
                    }
                }
            } catch (bpmnError) {
                console.error('[BPMN Voucher] Error computing actions:', bpmnError.message);
            }

            flags.canRejectVoucher = voucher.status === 'WAIT_RECEIVER_SIGN' && voucher.receiverId === userId;
            flags.canCreateReturnVoucher = voucher.voucherType === 'HANDOVER' && voucher.status === 'COMPLETED';
        }

        return {
            statusCode: 200,
            data: {
                ...voucher,
                summaryMeta: mappedSummary,
                items: mappedItems,
                ...stats,
                availableActions,
                flags,
                perItems,
            },
        };
    }
}
