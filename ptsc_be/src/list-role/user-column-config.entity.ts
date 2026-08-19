import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_column_configs')
@Unique(['userId', 'codeModule'])
export class UserColumnConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'nvarchar', length: 255 })
  userId: string;

  @Column({ name: 'code_module', type: 'nvarchar', length: 255 })
  codeModule: string;

  @Column({
    name: 'columns',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: any) => {
        try {
          return value ? JSON.parse(value) : [];
        } catch {
          return [];
        }
      },
    },
  })
  columns: { row: string; name: string; visible: boolean; width?: string }[];

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}









