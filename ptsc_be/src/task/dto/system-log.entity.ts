import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from 'src/users/entities/user.entity';

@Entity('system_log_tasks')
export class SystemLogEntity {
  @ApiProperty({
    description: 'ID của log (từ _id của MongoDB)',
    example: '69387e80f1a89063ad205b04',
  })
  @PrimaryColumn({ name: 'id' })
  id: string;

  @ApiProperty({ description: 'Hành động thực hiện', example: 'GET' })
  @Column({ name: 'actions', length: 50, nullable: true })
  actions: string;

  @ApiProperty({ description: 'Chi tiết của log', example: 'Truy cập danh sách văn bản' })
  @Column({ name: 'details', type: 'nvarchar', nullable: true })
  details: string;

  @ApiProperty({ description: 'Id người dùng' })
  @Column({ name: 'user_info', length: 50, nullable: true })
  userInfoId: string;

  @ApiProperty({
    description: 'Thông tin người dùng',
    type: () => UserEntity,
  })
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_info' })
  userInfo: UserEntity;

  @ApiProperty({ description: 'Thời gian ghi log' })
  @Column({ name: 'timestamps', type: 'datetime', nullable: true })
  timestamps: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Id công việc' })
  @Column({ name: 'task_id', type: 'varchar', length: 1000, nullable: true })
  taskId: string;

  @ApiProperty({ description: 'Ghi chú log' })
  @Column({ name: 'note', type: 'nvarchar', length: 500, nullable: true })
  note: string;
}
