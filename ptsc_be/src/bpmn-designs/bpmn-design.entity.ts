import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FieldType {
  STRING = 'string',
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  LONG = 'long',
}

@Entity('bpmn_design')
export class BpmnDesignEntity {
  @PrimaryColumn({ name: 'id', type: 'nvarchar', length: 255 })
  id: string;

  @Column({ name: 'name', type: 'nvarchar', length: 500, nullable: true })
  name?: string;

  @Column({ name: 'description', type: 'nvarchar', length: 'max', nullable: true })
  description?: string;

  @Column({ name: 'has_start_form', type: 'bit', default: false })
  hasStartForm: boolean;

  @Column({ name: 'show_in_permission_detail', type: 'bit', default: false })
  showInPermissionDetail: boolean;

  @Column({ name: 'start_form_id', type: 'nvarchar', length: 255, nullable: true })
  startFormId?: string;

  @Column({
    name: 'fields',
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
  fields: any[];

  @Column({ name: 'status', type: 'int', default: 1 })
  status: number;

  @Column({ name: 'base64_file', type: 'nvarchar', length: 'max', nullable: true, select: false })
  base64File?: string;

  @Column({ name: 'process_key', type: 'nvarchar', length: 255, nullable: true })
  processKey?: string;

  @Column({
    name: 'process_instance_definition_key',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  processInstanceDefinitionKey?: string;

  @Column({
    name: 'process_deployment_id',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  processDeploymentId?: string;

  @Column({
    name: 'document_type',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  documentType?: string;

  @Column({
    name: 'process_select',
    type: 'nvarchar',
    length: 255,
    nullable: true,
  })
  processSelect?: string;

  @Column({
    name: 'unit',
    type: 'nvarchar',
    length: 'max',
    nullable: true,
    select: false,
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
  unit: string[];


  @Column({
    name: 'related_processes',
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
  relatedProcesses: string[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime2',
    precision: 0,
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime2',
    precision: 0,
  })
  updatedAt: Date;
}
