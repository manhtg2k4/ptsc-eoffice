import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('keycloak_group_mapping')
export class KeycloakGroupMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'group_code', type: 'nvarchar', length: 255 })
  @Index()
  groupCode: string;

  @Column({ name: 'realm_role', type: 'nvarchar', length: 255, nullable: true })
  realmRole: string;

  @Column({ name: 'client_role', type: 'nvarchar', length: 255, nullable: true })
  clientRole: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
