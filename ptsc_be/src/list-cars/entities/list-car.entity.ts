import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
export enum CarStatus {
  SAN_SANG = 'SAN_SANG',
  DANG_SU_DUNG = 'DANG_SU_DUNG',
  BAO_DUONG = 'BAO_DUONG',
}

@Entity('list_cars')
export class ListCarEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'nvarchar', length: 50, name: 'license_plate' })
  licensePlate: string;

  @Column({ type: 'nvarchar', length: 100, name: 'car_type' })
  carType: string;

  @Column({ type: 'nvarchar', length: 100, name: 'brand' })
  brand: string;

  @Column({ type: 'int', name: 'seat_count', nullable: true })
  seatCount: number;

  @Column({ type: 'nvarchar', length: 255, name: 'manager' })
  manager: string;

  @Column({
    type: 'nvarchar',
    length: 50,
    name: 'status_car',
    default: CarStatus.SAN_SANG,
  })
  statusCar: CarStatus;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'nvarchar', length: 1000, name: 'note', nullable: true })
  note: string;

  // ✅ thêm mới
  @Column({ type: 'int', name: 'total_trips', default: 0 })
  totalTrips: number;

  @Column({ type: 'bit', name: 'booking_available', default: true })
  bookingAvailable: boolean;

  @Column({ type: 'nvarchar', length: 50, name: 'maintenance', nullable: true })
  maintenance: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.id = `LC-${timestamp}-${random}`;
    }
  }
}
