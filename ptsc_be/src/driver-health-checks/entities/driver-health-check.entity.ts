import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';

@Entity('driver_health_checks')
export class DriverHealthCheckEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 40, name: 'driver_id' })
  driverId: string;

  @Column({ type: 'datetime2', name: 'checkup_date' })
  checkupDate: Date;

  @Column({ type: 'simple-json', nullable: true, name: 'attachments' })
  attachments: any[];

  @Column({ type: 'int', default: 1 })
  status: number;

  @Column({ type: 'nvarchar', length: 1000, name: 'note', nullable: true })
  note: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime2', name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      this.id = `HC-${timestamp}-${random}`;
    }
  }
}
