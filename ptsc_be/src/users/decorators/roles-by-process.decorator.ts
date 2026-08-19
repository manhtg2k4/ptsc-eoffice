import { SetMetadata } from '@nestjs/common';

export interface ProcessRoleRequirement {
  processKey: string;
  roleCode?: string;
}

export const PROCESS_ROLE_KEY = 'process_role_key';
export const RequireProcessRole = (...requirements: ProcessRoleRequirement[]) => 
  SetMetadata(PROCESS_ROLE_KEY, requirements);
