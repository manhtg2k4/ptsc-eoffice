import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('audit')
export class Audit {
  // STT 1: id - BIGINT, IDENTITY(1,1), Primary Key, Unique
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number; // ID lịch sử xử lý

  // STT 2: document_id - NVARCHAR(64), Foreign Key
  @Index()
  @Column({ type: 'nvarchar', length: 64, name: 'document_id', nullable: true })
  documentId: string | null; // ID văn bản (incoming / outgoing)

  // STT 3: time - DATETIME, Default: GETDATE()
  @Column({ type: 'datetime', nullable: true, default: () => 'GETDATE()' })
  time: Date | null; // Thời điểm ghi nhận hành động

  // STT 4: user_id - NVARCHAR(64)
  @Column({ type: 'nvarchar', length: 64, name: 'user_id', nullable: true })
  userId: string | null; // ID người thực hiện xử lý

  // STT 5: display_name - NVARCHAR(255)
  @Column({ type: 'nvarchar', length: 255, name: 'display_name', nullable: true })
  displayName: string | null; // Tên hiển thị người xử lý

  // STT 6: role - NVARCHAR(64)
  @Index()
  @Column({ type: 'nvarchar', length: 64, nullable: true })
  role: string | null; // Vai trò người xử lý

  // STT 7: action_code - NVARCHAR(64)
  @Column({ type: 'nvarchar', length: 64, name: 'action_code', nullable: true })
  actionCode: string | null; // Mã hành động xử lý

  // STT 8: from_node_id - NVARCHAR(128)
  @Column({ type: 'nvarchar', length: 128, name: 'from_node_id', nullable: true })
  fromNodeId: string | null; // Node nguồn trong BPMN

  // STT 9: to_node_id - NVARCHAR(128)
  @Column({ type: 'nvarchar', length: 128, name: 'to_node_id', nullable: true })
  toNodeId: string | null; // Node đích trong BPMN

  // STT 10: details - NVARCHAR(MAX)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  details: string | null; // Nội dung chi tiết / ghi chú

  // STT 11: origin_id - NVARCHAR(100)
  @Column({ type: 'nvarchar', length: 100, name: 'origin_id', nullable: true })
  originId: string | null; // ID node gốc / node khởi phát

  // STT 12: created_by - NVARCHAR(100)
  @Column({ type: 'nvarchar', length: 100, name: 'created_by', nullable: true })
  createdBy: string | null; // Người tạo hành động

  // STT 13: receiver - NVARCHAR(100)
  @Index()
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  receiver: string | null; // Người nhận xử lý

  // STT 14: receiver_unit - NVARCHAR(100)
  @Column({ type: 'nvarchar', length: 100, name: 'receiver_unit', nullable: true })
  receiverUnit: string | null; // Đơn vị nhận xử lý

  // STT 15: group_ - NVARCHAR(100)
  @Column({ type: 'nvarchar', length: 100, name: 'group_', nullable: true })
  groupField: string | null; // Nhóm xử lý

  // STT 16: roleProcess - NVARCHAR(100)
  @Column({ type: 'nvarchar', length: 100, name: 'roleProcess', nullable: true })
  roleProcess: string | null; // Vai trò xử lý (processor, supporter, ...)

  // STT 17: action - NVARCHAR(255)
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  action: string | null; // Tên hành động xử lý

  // STT 18: deadline - DATETIME
  @Column({ type: 'datetime', nullable: true })
  deadline: Date | null; // Hạn xử lý

  // STT 19: stage_status - NVARCHAR(100)
  @Index()
  @Column({ type: 'nvarchar', length: 100, name: 'stage_status', nullable: true })
  stageStatus: string | null; // Trạng thái xử lý (Đã xử lý, Chưa xử lý, ...)

  // STT 20: curStatusCode - NVARCHAR(64)
  @Column({ type: 'nvarchar', length: 64, name: 'curStatusCode', nullable: true })
  curStatusCode: string | null; // Mã trạng thái hiện tại

  // STT 21: created_at - DATETIME, Default: GETDATE()
  @Column({ type: 'datetime', name: 'created_at', nullable: true, default: () => 'GETDATE()' })
  createdAt: Date | null; // Thời điểm tạo bản ghi

  // STT 22: updated_at - DATETIME, Default: GETDATE()
  @Column({ type: 'datetime', name: 'updated_at', nullable: true, default: () => 'GETDATE()' })
  updatedAt: Date | null; // Thời điểm cập nhật bản ghi

  // STT 23: type_document - VARCHAR(100)
  @Column({ type: 'varchar', length: 100, name: 'type_document', nullable: true })
  typeDocument: string | null; // Loại văn bản (IncomingDocument / OutgoingDocument / StorageBatch)

  // STT 24: processed_by - VARCHAR(100)
  @Column({ type: 'varchar', length: 100, name: 'processed_by', nullable: true })
  processedBy: string | null; // Người xử lý thay người nhận

  // STT 25: acting_as - VARCHAR(100)
  @Column({ type: 'varchar', length: 100, name: 'acting_as', nullable: true })
  actingAs: string | null; // Người chuyển xử lý thay người nhận

  // STT 26: assignment_type - NVARCHAR(50)
  @Index()
  @Column({ type: 'nvarchar', length: 50, name: 'assignment_type', nullable: true })
  assignmentType: string | null; // Loại phân công (VAN_THU / TRUONG_PHONG)
}
