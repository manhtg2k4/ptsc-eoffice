import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleState {
  CHO_DIEU_PHOI = 'CHO_DIEU_PHOI',     // Chờ điều phối
  DA_PHAN_CONG = 'DA_PHAN_CONG',       // Đã phân công
  TRONG_TIEN_TRINH = 'TRONG_TIEN_TRINH',   // Trong tiến trình
  HOAN_THANH = 'HOAN_THANH',           // Hoàn thành
  TU_CHOI = 'TU_CHOI',                 // Từ chối
  DA_HUY = 'DA_HUY',                   // Đã hủy
}
@Entity('vehicle_registrations')
export class VehicleRegistrationEntity {
  /**
   * ID tự tăng (Primary Key)
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tên phiếu đăng ký / tiêu đề yêu cầu
   */
  @Column({ type: 'nvarchar', length: 255 })
  name: string;
  
  @Column({
    name: 'request_code',
    type: 'nvarchar',
    length: 30,
    nullable: true,
  })
  requestCode: string;
  /**
   * Loại yêu cầu (VD: Công tác, Đón khách, Nội bộ...)
   */
  @Column({ type: 'nvarchar', length: 255, name: 'request_type' })
  requestType: string;

  /**
   * Mức độ ưu tiên (THUONG, KHAN, HOA_TOC...)
   */
  @Column({ type: 'nvarchar', length: 50, nullable: true })
  priority: string;

  /**
   * Có khách quan trọng hay không (YES/NO)
   */
  @Column({ type: 'nvarchar', length: 10, name: 'is_important_guest', nullable: true })
  isImportantGuest: string;

  /**
   * Số lượng hành khách
   */
  @Column({ type: 'int', name: 'passenger_count' })
  passengerCount: number;

  /**
   * Thời gian xuất phát
   */
  @Column({ type: 'datetime2', name: 'departure_time' })
  departureTime: Date;

  /**
   * Thời gian kết thúc / quay về
   */
  @Column({ type: 'datetime2', name: 'return_time' })
  returnTime: Date;

  /**
   * Điểm xuất phát
   */
  @Column({ type: 'nvarchar', length: 500, name: 'departure_point' })
  departurePoint: string;

  /**
   * Điểm đến
   */
  @Column({ type: 'nvarchar', length: 500 })
  destination: string;

  /**
   * Người liên hệ chính
   */
  @Column({ type: 'nvarchar', length: 255, name: 'contact_person' })
  contactPerson: string;

  /**
   * Số điện thoại liên hệ
   */
  @Column({ type: 'nvarchar', length: 20, name: 'contact_phone' })
  contactPhone: string;

  /**
   * Tổng số người tham gia (có thể khác passengerCount)
   */
  @Column({ type: 'int', nullable: true, name: 'total_people' })
  totalPeople?: number;

  /**
   * Mục đích sử dụng xe
   */
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  purpose: string;

  /**
   * Ghi chú bổ sung
   */
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  notes?: string;

  /**
   * Người đăng ký
   */
  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    name: 'created_by',
  })
  createdBy?: string;

  /**
   * Phòng ban
   */
  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  department?: string;

  /**
   * Thời lượng chuyến đi (tính bằng phút)
   */
  @Column({
    type: 'int',
    nullable: true,
    name: 'trip_duration_minutes',
  })
  tripDurationMinutes?: number;

  /**
   * Danh sách ID tài xế (lưu dạng chuỗi JSON hoặc comma)
   * Ví dụ: ["uuid1","uuid2"] hoặc "id1,id2"
   */
  @Column({
    type: 'nvarchar',
    nullable: true,
    name: 'driver_ids',
  })
  driverIds?: string;
  // Danh sách ID xe (lưu dạng chuỗi JSON hoặc comma)
  @Column({ name: 'car_ids', type: 'nvarchar', length: 'MAX', nullable: true })
  carIds: string;
  // Thông tin điều phối (có thể lưu dạng JSON hoặc chuỗi tùy ý)
  @Column({ name: 'coordination_information', type: 'nvarchar', length: 'MAX', nullable: true })
  coordinationInformation?: string;
  // Danh sách ID tài xế đã xác nhận (có thể lưu dạng JSON hoặc comma)
  @Column({
    name: 'confirmed_driver_ids',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  confirmedDriverIds?: string;
  // Kiểm tra xem đã tất cả tài xế xác nhận hay chưa (dựa trên driverIds và confirmedDriverIds)
  @Column({
    name: 'is_all_drivers_confirmed',
    type: 'bit',
    default: false,
  })
  isAllDriversConfirmed: boolean;
  /**
   * Trạng thái bản ghi
   * 1 = Hoạt động
   * 3 = Đã xóa (soft delete)
   */
  @Column({ type: 'int', default: () => '1' })
  status: number;
  
  /**
   * Ghi chú bổ sung
   */
  @Column({ name: 'rejection_reason',type: 'nvarchar', length: 'MAX', nullable: true })
  rejectionReason?: string;

  /**
   * Số lần đã gửi nhắc tài xế
   */
  @Column({
    name: 'driver_notice_count',
    type: 'int',
    default: () => '0',
  })
  driverNoticeCount: number;

  /**
   * Số lần đã gửi nhắc lãnh đạo / điều phối
   */
  @Column({
    name: 'leader_notice_count',
    type: 'int',
    default: () => '0',
  })
  leaderNoticeCount: number;
  /* ================= BPMN & WORKFLOW ================= */

  /**
   * Version quy trình BPMN tại thời điểm tạo phiếu
   */
  @Column({
    type: 'nvarchar',
    length: 50,
    nullable: true,
    name: 'bpmn_version',
  })
  bpmnVersion?: string;

  /**
   * Múi giờ áp dụng cho xử lý thời gian
   * Default: Asia/Ho_Chi_Minh
   */
  @Column({
    type: 'nvarchar',
    length: 100,
    default: () => "N'Asia/Ho_Chi_Minh'",
  })
  timezone: string;

  /**
   * Trạng thái xử lý nghiệp vụ
   * CHUA_TRINH | DA_TRINH | DA_DUYET | TU_CHOI
   */
  @Column({
    type: 'nvarchar',
    length: 50,
    name: 'vehicle_state',
    default: () => "N'CHO_DIEU_PHOI'",
  })
  vehicleState: VehicleState;

  /**
   * Mã trạng thái nghiệp vụ mở rộng (mapping BPMN)
   */
  @Column({
    type: 'nvarchar',
    length: 100,
    nullable: true,
    name: 'status_code',
  })
  statusCode?: string | null;

  @Column({
    name: 'is_edited',
    type: 'bit',
    default: false,
    nullable: true,
  })
  isEdited?: boolean;

  /* ================= BUSINESS TIME ================= */

  /**
   * Thời điểm người dùng gửi yêu cầu
   */
  @Column({
    type: 'datetime2',
    nullable: true,
    name: 'request_submitted_at',
  })
  requestSubmittedAt?: Date;

  /**
   * Thời điểm bắt đầu chờ xác nhận (ví dụ: sau khi trình)
   */
  @Column({
    type: 'datetime2',
    nullable: true,
    name: 'waiting_confirmed_at',
  })
  waitingConfirmedAt?: Date;

  /* ================= SYSTEM TIME ================= */

  /**
   * Thời điểm hệ thống tạo record
   */
  @CreateDateColumn({
    type: 'datetime2',
    name: 'created_at',
    default: () => 'GETDATE()',
  })
  createdAt: Date;

  /**
   * Thời điểm cập nhật gần nhất
   */
  @UpdateDateColumn({
    type: 'datetime2',
    name: 'updated_at',
    default: () => 'GETDATE()',
  })
  updatedAt: Date;

    /**
   * Thời gian các lần nhắc tài xế (lưu dạng JSON)
   * Ví dụ: ["2026-03-28T08:00:00", "2026-03-28T10:30:00"]
   */
  @Column({
    name: 'driver_notice_times',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  driverNoticeTimes?: string;

  /**
   * Thời gian các lần nhắc trưởng phòng / điều phối (lưu dạng JSON)
   */
  @Column({
    name: 'leader_notice_times',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  leaderNoticeTimes?: string;
  
  @Column({ name: 'leader_escalated_at', type: 'datetime', nullable: true })
  leaderEscalatedAt?: Date;

  @Column({
    name: 'is_processing',
    type: 'bit',
    default: false,
    nullable: true,
  })
  isProcessing?: boolean;

  @Column({
    name: 'departure_reminder_sent',
    type: 'bit',
    default: false,
    nullable: true,
  })
  departureReminderSent?: boolean;
}