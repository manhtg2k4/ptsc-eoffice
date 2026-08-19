import {
  Entity,
  Column,
  PrimaryColumn,
} from 'typeorm';

@Entity({
  name: 'work_items',
  schema: 'dbo',
})
export class WorkItemEntity {
  @PrimaryColumn({
    type: 'varchar',
    length: 64,
  })
  id?: string;

  @Column({
    name: 'document_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  documentId?: string;

  @Column({
    name: 'node_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  nodeId?: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  role?: string;

  @Column({
    name: 'assignee_user_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  assigneeUserId?: string;

  @Column({
    name: 'bpmn_version',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  bpmnVersion?: string;

  @Column({
    name: 'node_type',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  nodeType?: string;

  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  state?: string;

  @Column({
    name: 'created_at',
    type: 'datetime',
    nullable: true,
  })
  createdAt?: Date;
}