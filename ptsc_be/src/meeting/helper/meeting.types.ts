export interface Node {
  id: string;
  $type: string;
  targetRole: string;
}

export interface ResolvedContext {
  pool: any;
  userContext: {
    userId: string;
    roles: string[];
  };
  featureManagement: any;
}

export interface FilterCriteria {
  name: string;
  operator: string;
  value: string | string[];
}

export interface WhereResult {
  whereClause: string;
  filterJoins: string;
  from: string;
}

export interface PaginatedIdsResult {
  total: number;
  meetingIds: string[];
}

export type UnitState =
  | 'RECEIVED'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'DONE';

export type WorkState =
  | 'waiting'
  | 'comfirmed'
  | 'delegated'
  | 'notpaticipate'
  | 'all';

export enum MeetingType {
  COMPANY = 'COMPANY',
  UNIT = 'UNIT',
  USER = 'USER',
}

export type RoomConflict = {
  roomId: string;
  roomName: string;
  meetingTime: string;
  meetingDate: string;
  meetingId: string;
};
export type UserUnitCache = {
  name: string;
  unitId: string | null;
  unitName: string | null;
};

import { MeetingUnitEntity } from '../entities/meeting-unit.entity';
import { MeetingParticipantEntity } from '../entities/meeting-participant.entity';
import { MeetingTaskEntity } from '../entities/meeting-task.entity';

/**
 * Phạm vi dữ liệu người dùng được phép xem
 */
export type DataScope =
  | 'ALL_CUC'
  | 'ALL_PHONG'
  | 'SELF';

/**
 * Các thay đổi khi cập nhật cuộc họp
 */
export interface MeetingChangeSet {
  addedUnits: MeetingUnitEntity[];
  updatedUnits: MeetingUnitEntity[];
  removedUnits: MeetingUnitEntity[];

  addedParticipants: MeetingParticipantEntity[];
  updatedParticipants: MeetingParticipantEntity[];
  removedParticipants: MeetingParticipantEntity[];

  addedTasks: MeetingTaskEntity[];
  updatedTasks: MeetingTaskEntity[];
  removedTasks: MeetingTaskEntity[];
}
export const NOT_CONFIRMED_STATES = new Set([
  'RECEIVED',
  'PENDING',
  'CANCELED',
  'NOT_PARTICIPATE'
])