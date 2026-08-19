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
import { UserEntity } from '../users/entities/user.entity';

@Entity('system_logs')
export class SystemLogEntity {
  @ApiProperty({ description: 'ID của log (từ _id của MongoDB)', example: '69387e80f1a89063ad205b04' })
  @PrimaryColumn()
  id: string;

  @ApiProperty({ description: 'Hành động thực hiện', example: 'GET' })
  @Column({ length: 50, nullable: true })
  action: string;

  @ApiProperty({ description: 'Chi tiết của log', example: 'Truy cập danh sách văn bản' })
  @Column('text', { nullable: true })
  details: string;

  @ApiProperty({ description: 'Phương thức HTTP', example: 'GET' })
  @Column({ length: 10, nullable: true })
  method: string;

  @ApiProperty({ description: 'Trạng thái (SUCCESS, FAILED)', example: 'SUCCESS' })
  @Column({ length: 20, nullable: true })
  status: string;

  @ApiProperty({ description: 'Loại log', example: 'DHVBTC' })
  @Column({ length: 50, nullable: true })
  type: string;

  @ApiProperty({ description: 'Loại phụ của log', example: 'DHVBTC' })
  @Column({ length: 50, nullable: true })
  subType: string;

  // @ApiProperty({
  //   description: 'Thông tin người dùng',
  //   type: 'object',
  //   properties: {
  //     fullName: { type: 'string' },
  //     userName: { type: 'string' },
  //     organization: { type: 'string' },
  //     ipAddress: { type: 'string' },
  //   },
  //   example: {
  //     fullName: 'phogiamdoc', userName: 'phogiamdoc',
  //     organization: 'Tổng Công ty Tân Cảng Sài Gòn', ipAddress: '192.168.0.1'
  //   }
  // })
  // @Column('simple-json', { nullable: true })
  // userInfo: { fullName: string; userName: string; organization: string; ipAddress: string };

  @ApiProperty({ description: 'Id người dùng' })
  @Column({ name: 'userInfo', length: 50 })
  userInfoId: string;

  // 🔹 Quan hệ JOIN
  @ApiProperty({
    description: 'Thông tin người dùng',
    type: () => UserEntity,
  })
  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'userInfo' })
  userInfo: UserEntity;

  @ApiProperty({ description: 'Địa chỉ', example: '' })
  @Column({ length: 50, nullable: true })
  ipAddress: string;

  @ApiProperty({ description: 'Thời gian ghi log' })
  @Column({ type: 'datetime' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}