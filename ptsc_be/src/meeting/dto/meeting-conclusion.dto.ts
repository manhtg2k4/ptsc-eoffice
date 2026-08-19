// meeting-conclusion.types.ts

export interface UserInfo {
  id: string;
  name: string | null;
}

export interface MeetingFile {
  id: number;
  file_name: string;
  storage_type: string;
  file_path: string;
  object_type: string;
}

export interface MeetingTask {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: UserInfo | null;
  createdAt: string; // DD/MM/YYYY
  updatedAt: string | null; // DD/MM/YYYY
}

export interface ConclusionItem {
  id: number;
  meetingId: string;
  content: string;
  createdBy: UserInfo | null;
  createdAt: string; // DD/MM/YYYY
  tasks: MeetingTask[];
}

export interface RelatedMeeting {
  id: string;
  title: string;
  meetingType: string;
  meetingDate: string; // DD/MM/YYYY
  meetingTime: string;
  status: string;
  statusCode: string;
  createdAt: string; // DD/MM/YYYY
  relationType: string;
}

export interface MeetingConclusionDetailResponse {
  files: MeetingFile[];
  conclusionItems: ConclusionItem[];
  relatedMeetings: RelatedMeeting[];
}

export class MeetingConclusionDetailDto {
  success: boolean;
  data: MeetingConclusionDetailResponse;
}

// Raw types cho internal use
export interface MeetingConclusionRaw {
  id: number;
  meetingId: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

export interface MeetingTaskRaw {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  createdAt: Date;
  updatedAt: Date;
  conclusionId: number;
}

export interface RelatedMeetingRaw {
  id: string;
  title: string;
  meetingType: string;
  meetingDate: Date;
  meetingTime: string;
  status: string;
  statusCode: string;
  createdAt: Date;
  relationType: string;
}