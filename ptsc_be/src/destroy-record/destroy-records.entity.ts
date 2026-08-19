import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

const jsonTransformer = {
  to: (value: any) => (value == null ? null : JSON.stringify(value)),
  from: (value: string | null) => {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },
};

@Entity('destroy_records')
export class DestroyRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'destroy_batch_code', length: 100, unique: true })
  destroyBatchCode: string;

  @Column({ name: 'destroy_batch_name', length: 255 })
  destroyBatchName: string;

  /**
   * Tiêu đề lô tiêu hủy (có thể dùng để hiển thị hoặc tìm kiếm nhanh)
   */
  @Column({ name: 'title', length: 500, nullable: true })
  title?: string;

  /**
   * Lý do tiêu hủy (chi tiết, có thể dài)
   */
  @Column({ name: 'destroy_reason', type: 'nvarchar', length: 'max', nullable: true })
  destroyReason: string;

  /**
   * Tổng số hồ sơ đã tiêu hủy trong lô này
   */
  @Column({ name: 'total_destroyed_records', type: 'int', default: 0 })
  totalDestroyedRecords: number;

  /**
   * Trạng thái của lô tiêu hủy
   * Ví dụ: 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REJECTED'...
   */
  @Column({ length: 50 })
  status: string;

  /**
   * Người tạo lô tiêu hủy (username, user ID hoặc display name)
   * Thường lấy từ người dùng đang đăng nhập khi tạo
   */
  @Column({ name: 'created_by', length: 100, nullable: true })
  createdBy: string;

  /**
   * Version của quy trình BPMN được sử dụng cho lô tiêu hủy này
   * Giúp trace và audit khi quy trình thay đổi trong tương lai
   * Ví dụ: 'v1.0', 'QUY_TRINH_TIEU_HUY_HO_SO_v2025'
   */
  @Column({
    name: 'bpmn_version',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  bpmnVersion?: string;

  /**
   * Danh sách ID hồ sơ được đưa vào lô tiêu hủy
   * Lưu dưới dạng JSON array string
   */
  @Column({
    name: 'profile_ids',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: jsonTransformer,
  })
  profileIds?: string[];

  /**
   * Mã trạng thái nghiệp vụ (VD: 1,2,3,4,5,6...)
   */
  @Column({ type: 'nvarchar', length: 100, nullable: true, name: 'status_code' })
  statusCode?: string | null;
  
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}