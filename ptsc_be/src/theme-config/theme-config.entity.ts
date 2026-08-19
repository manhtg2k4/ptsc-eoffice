import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('theme_configs')
export class ThemeConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_key', type: 'nvarchar', length: 255, unique: true, default: 'main_theme' })
  configKey: string;

  @Column({
    name: 'options',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: any) => {
        try {
          return value ? JSON.parse(value) : { mode: 'light' };
        } catch {
          return { mode: 'light' };
        }
      },
    },
  })
  options: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}

@Entity('custom_themes')
export class CustomThemeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'nvarchar', length: 255 })
  name: string;

  @Column({ name: 'created_by', type: 'nvarchar', length: 255 })
  createdBy: string;

  @Column({
    name: 'options',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    transformer: {
      to: (value: any) => (value ? JSON.stringify(value) : null),
      from: (value: any) => {
        try {
          return value ? JSON.parse(value) : {};
        } catch {
          return {};
        }
      },
    },
  })
  options: Record<string, any>;

  @Column({ name: 'is_default', type: 'bit', default: false })
  isDefault: boolean;

  @Column({ name: 'status', type: 'int', default: 1 })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;
}









