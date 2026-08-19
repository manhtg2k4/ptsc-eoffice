import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('vehicle_registration_assignments')
export class VehicleRegistrationAssignmentEntity {

  /**
   * ID tự sinh
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID phiếu đăng ký xe
   */
  @Column({
    type: 'uniqueidentifier',
    name: 'registration_id',
  })
  registrationId: string;

  /**
   * ID xe được phân công
   */
  @Column({
    type: 'nvarchar',
    length: 100,
    name: 'car_id',
  })
  carId: string;

  /**
   * ID tài xế được phân công
   */
  @Column({
    type: 'nvarchar',
    length: 100,
    name: 'driver_id',
  })
  driverId?: string;

  /**
   * Tài xế đã xác nhận chuyến hay chưa
   */
  @Column({
    type: 'bit',
    name: 'is_confirmed',
    default: false,
  })
  isConfirmed: boolean;

  /**
   * Thời điểm tài xế xác nhận
   */
  @Column({
    type: 'datetime2',
    name: 'confirmed_at',
    nullable: true,
  })
  confirmedAt?: Date;

  /**
   * Thời điểm tạo bản ghi
   */
  @CreateDateColumn({
    type: 'datetime2',
    name: 'created_at',
    default: () => 'SYSDATETIME()',
  })
  createdAt: Date;
}