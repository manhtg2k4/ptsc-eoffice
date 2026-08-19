import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_setting_log')
export class SystemSettingClearLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  timeSave: number;

  @Column({ type: 'bit', nullable: true })
  autoClean: boolean;

  @Column({ type: 'int', nullable: true, default: 7 })
  newArticlesDays: number; // Tin được coi là mới nếu được tạo trong vòng X ngày

  @Column({ type: 'int', nullable: true, default: 100 })
  mostViewedArticlesThreshold: number; // Tin được coi là xem nhiều nếu lượt xem >= X

  @Column({ type: 'int', nullable: true, default: 20 })
  favoriteArticlesThreshold: number; // Tin được coi là yêu thích nếu lượt like >= X

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  updater: string | null;

  @Column({ type: 'datetime', default: () => 'GETDATE()' })
  updatedAt: Date;

  @Column({
    type: 'nvarchar',
    length: 255,
    nullable: true,
    default: 'SystemLog',
  })
  type: string;
}
