import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

// src/role/entities/method.entity.ts
export class Method {
    @Column({ type: 'nvarchar', length: 50 })
    name: string; // GET, POST, etc.

    @Column({ type: 'bit', default: false })
    allow: boolean;
}

export class RoleFunction {
    @Column({ type: 'nvarchar', length: 500 })
    titleFunction: string;

    @Column({ type: 'nvarchar', length: 200, unique: true }) // nếu cần unique
    codeModuleFunction: string;

    @Column({ type: 'nvarchar', length: 100 })
    clientId: string;

    @Column(() => Method)
    methods: Method[];
}

@Entity({ name: 'roles' })
export class RoleEntity {
    @PrimaryGeneratedColumn('uuid') // hoặc 'increment' nếu dùng number
    id: string;

    @Column({ type: 'nvarchar', length: 100 })
    clientId: string;

    @Column({ type: 'nvarchar', length: 200 })
    name: string;

    @Column({ type: 'nvarchar', length: 200, unique: true })
    code: string;

    @Column({ type: 'nvarchar', length: 500, nullable: true })
    description?: string;

    // Nhúng mảng RoleFunction dưới dạng JSON
    @Column({
        type: 'nvarchar',
        length: 'MAX',
        nullable: true,
        transformer: {
            to: (value: RoleFunction[]) => (value ? JSON.stringify(value) : null),
            from: (value: string) => (value ? JSON.parse(value) : []),
        },
    })
    roles: RoleFunction[];

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}