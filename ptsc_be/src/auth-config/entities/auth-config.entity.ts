import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('auth_config')
export class AuthConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auth_type', unique: true })
  @Index()
  authType: string;

  @Column({ type: 'simple-json', default: '{}' })
  config: Record<string, any>;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'int', default: 1 }) // 1: active, 3: deleted
  status: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
