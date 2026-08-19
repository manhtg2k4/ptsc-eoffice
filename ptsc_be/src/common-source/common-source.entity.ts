import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { STATUS } from '../variables/CONST_STATUS';

export interface CommonSourceDataItem {
  title: string;
  value: string;
  index?: number;
  extraValue?: Record<string, any>;
}

@Entity({
  name: 'commonsources',
  schema: 'dbo',
})
@Index(['code'], { unique: true })
export class CommonSourceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  code: string;

  @Column({ type: 'nvarchar', length: 500 })
  title: string;

  @Column({ type: 'bit', default: false })
  canDragDrop: boolean;

  @Column({ type: 'nvarchar', length: 255 })
  type: string;

  @Column({ type: 'simple-json', default: [] })
  data: CommonSourceDataItem[];

  @Column({ type: 'int', default: STATUS.ACTIVED })
  status: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}

