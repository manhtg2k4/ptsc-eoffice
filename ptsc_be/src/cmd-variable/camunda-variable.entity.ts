import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

const jsonTransformer = {
    to: (value: any) => (value ? JSON.stringify(value) : null),
    from: (value: any) => {
        try {
            return value ? JSON.parse(value) : null;
        } catch {
            return null;
        }
    },
};

@Entity('CamundaVariable')
export class CamundaVariableEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'nvarchar', length: 255 })
    processKey: string;

    @Column({ type: 'nvarchar', length: 255, nullable: true })
    processInstanceId?: string;

    @Column({ type: 'nvarchar', length: 'max', nullable: true, transformer: jsonTransformer })
    variables: Record<string, any> | null;

    @CreateDateColumn({ type: 'datetime' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updatedAt: Date;
}

