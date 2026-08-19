import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('mail_config')
export class MailConfigEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'mail_host', type: 'nvarchar', length: 255, default: 'smtp.gmail.com' })
    mailHost: string;

    @Column({ name: 'mail_port', type: 'int', default: 587 })
    mailPort: number;

    @Column({ name: 'mail_user', type: 'nvarchar', length: 255, nullable: true })
    mailUser: string;

    @Column({ name: 'mail_pass', type: 'nvarchar', length: 255, nullable: true })
    mailPass: string;

    @Column({ name: 'mail_secure', type: 'bit', default: false })
    mailSecure: boolean;

    @Column({ name: 'mail_from', type: 'nvarchar', length: 500, nullable: true })
    mailFrom: string; // "Hệ thống quản lý công việc" <[EMAIL_ADDRESS]> là title mặc định

    @Column({ name: 'app_url', type: 'nvarchar', length: 500, nullable: true })
    appUrl: string;

    @Column({ name: 'is_active', type: 'bit', default: true })
    isActive: boolean;

    @Column({ name: 'description', type: 'nvarchar', length: 500, nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
