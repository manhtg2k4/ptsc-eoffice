import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';

export enum DriverStatus {
  SAN_SANG = 'SAN_SANG',
  DANG_SU_DUNG = 'DANG_SU_DUNG',
  NGUNG_HOAT_DONG = 'NGUNG_HOAT_DONG',
}

@Entity('list_drivers')
export class ListDriverEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'nvarchar', length: 100, name: 'driver_id', nullable: true })
  driverId: string;

  @Column({ type: 'nvarchar', length: 255, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 20, name: 'phone_number' })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 20, name: 'id_card' })
  idCard: string;

  @Column({ type: 'nvarchar', length: 255, name: 'email', nullable: true })
  email: string;

  @Column({ type: 'nvarchar', length: 500, name: 'address', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, name: 'license_number' })
  licenseNumber: string;

  @Column({ type: 'nvarchar', length: 50, name: 'license_class' })
  licenseClass: string;

  @Column({ type: 'datetime2', name: 'license_issued_date' })
  licenseIssuedDate: Date;

  @Column({ type: 'nvarchar', length: 1000, name: 'note', nullable: true })
  note: string;

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'int', name: 'total_trips', default: 0 })
  totalTrips: number;

  @Column({ type: 'int', name: 'experience_years', default: 0, nullable: true })
  experienceYears: number;

  @Column({ type: 'nvarchar', length: 50, name: 'status_driver', default: DriverStatus.SAN_SANG })
  statusDriver: DriverStatus;

  @Column({ type: 'bit', name: 'booking_available', default: true })
  bookingAvailable: boolean;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId?() {
    if (!this.id) {
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.id = `DR-${timestamp}-${random}`;
    }
  }
}
