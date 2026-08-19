import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IncomingService } from '../documents/incomming-document/incoming.service';
import { OutgoingDocumentsService } from '../outgoing-documents/outgoing-documents.service';
import { NewsWorkflowService } from '../news/news-workflow.service';
import { MeetingService } from '../meeting/meeting.service';
import { TaskService } from '../task/task.service';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FeatureManagementEntity } from 'src/feature-management/feature-management.entity';
import { SqlRepoCountService } from '../database/sqlRepoCount.mssql';

import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class GlobalCountService {
  constructor(
    @Inject(forwardRef(() => IncomingService))
    private readonly incomingService: IncomingService,
    @Inject(forwardRef(() => OutgoingDocumentsService))
    private readonly outgoingService: OutgoingDocumentsService,
    private readonly newsWorkflowService: NewsWorkflowService,
    private readonly meetingService: MeetingService,
    private readonly taskService: TaskService,
    private readonly userService: UsersService,
    @InjectRepository(FeatureManagementEntity, 'mssqlConnection')
    private readonly featureManagementRepo: Repository<FeatureManagementEntity>,
    private readonly countService: SqlRepoCountService,
    @Inject(forwardRef(() => DocumentsService))
    private readonly documentsService: DocumentsService,
  ) { }

  async getGlobalCount(userId: string) {
    const userInfo = await this.userService.findRoleInformationById(userId);
    const receiverUnit = userInfo.parent?.id;

    // 1. Fetch count promises for documents, news, meetings in parallel with user task process role info
    const [pendingDocs, mergedIncomingCount, news, meeting, processRoleInfo] = await Promise.all([
      this.documentsService.getPendingCount(userId),
      this.incomingService.countDocumentsMergedWaiting(userId).catch(() => 0),
      this.newsWorkflowService.countNewsWaitingMyApproval({ processFn: 'dscdTP' }, userId),
      this.meetingService.listMeetingPerson({ processFn: 'LICHCANHANCHOXN', workstate: 'waiting' } as any, userId),
      this.userService.findProcessRoleInfoById(userId),
    ]);

    const incomingCount = Number(mergedIncomingCount ?? pendingDocs?.incomingCount ?? 0);
    const outgoingCount = pendingDocs?.outgoingCount || 0;
    const newsCount = typeof news === 'number' ? news : (news as any)?.total || 0;
    const meetingCount = typeof meeting === 'number' ? meeting : (meeting as any)?.total || 0;

    const processFns: string[] = processRoleInfo?.roles ?? [];
    let taskCount = 0;

    if (processFns.length > 0) {
      const features = await this.featureManagementRepo.find({
        where: { status: 1, code: In(processFns) },
        select: ['code'],
      });

      const activeCodes = new Set(features.map(f => f.code));

      const taskHandlers: Record<string, (uid: string) => Promise<number>> = {
        approve: async (uid) => {
          const rs = await this.countService.countTaskApprovePending({ userId: uid });
          return Number(rs?.total ?? 0);
        },
        qlcvall: async (uid) => {
          const rs = await this.countService.countTaskDynamic({ userId: uid, typeTask: 'general', tab: 'waiting' });
          return Number(rs?.total ?? 0);
        },
        cvtvbpb: async (uid) => {
          const rs = await this.countService.countTaskDocument({ userId: uid, tab: 'waiting' });
          return Number(rs?.total ?? 0);
        },
        cvtchpb: async (uid) => {
          const rs = await this.countService.countTaskMeeting({ userId: uid, tab: 'waiting' });
          return Number(rs?.total ?? 0);
        },
        cvllpb: async (uid) => {
          const rs = await this.countService.countTaskRecurringConfig({ userId: uid });
          return Number(rs?.total ?? 0);
        },
      };

      const activeTaskCodes = processFns.filter(code => code in taskHandlers && activeCodes.has(code));

      if (activeTaskCodes.length > 0) {
        const taskCounts = await Promise.all(
          activeTaskCodes.map(async (code) => {
            const count = await taskHandlers[code](userId);
            return count;
          }),
        );
        taskCount = taskCounts.reduce((sum, count) => sum + count, 0);
      } else {
        // Fallback to the old default approve pending if no other task features are configured
        try {
          const oldApprove = await this.taskService.findAllApprove({ processFn: 'approve', type: 'pending' } as any, userId);
          const fallbackCount = typeof oldApprove === 'number' ? oldApprove : (oldApprove as any)?.total || 0;
          taskCount = fallbackCount;
        } catch (err) {
          console.error('[GlobalCount] Fallback task count error:', err);
        }
      }
    } else {
      // Fallback to the old default approve pending if processFns is empty
      try {
        const oldApprove = await this.taskService.findAllApprove({ processFn: 'approve', type: 'pending' } as any, userId);
        const fallbackCount = typeof oldApprove === 'number' ? oldApprove : (oldApprove as any)?.total || 0;
        taskCount = fallbackCount;
      } catch (err) {
        console.error('[GlobalCount] Fallback task count error:', err);
      }
    }

    return {
      success: true,
      data: {
        incoming: incomingCount,
        outgoing: outgoingCount,
        news: newsCount,
        meeting: meetingCount,
        task: taskCount,
        total: incomingCount + outgoingCount + newsCount + meetingCount + taskCount,
      },
    };
  }

  async getGlobalCountApprove(userId: string) {
    const [pendingDocs, mergedIncomingCount, news, meeting, approveTaskCountResult] = await Promise.all([
      this.documentsService.getPendingCount(userId),
      this.incomingService.countDocumentsMergedWaiting(userId).catch(() => 0),
      this.newsWorkflowService.countNewsWaitingMyApproval({ processFn: 'dscdTP' }, userId),
      this.meetingService.listMeetingPerson({ processFn: 'LICHCANHANCHOXN', workstate: 'waiting' } as any, userId),
      this.countService.countTaskApprovePending({ userId }),
    ]);

    const incomingCount = Number(mergedIncomingCount ?? pendingDocs?.incomingCount ?? 0);
    const outgoingCount = pendingDocs?.outgoingCount || 0;
    const newsCount = typeof news === 'number' ? news : (news as any)?.total || 0;
    const meetingCount = typeof meeting === 'number' ? meeting : (meeting as any)?.total || 0;
    const taskCount = Number(approveTaskCountResult?.total ?? 0);

    return {
      success: true,
      data: {
        incoming: incomingCount,
        outgoing: outgoingCount,
        news: newsCount,
        meeting: meetingCount,
        task: taskCount,
        total: incomingCount + outgoingCount + newsCount + meetingCount + taskCount,
      },
    };
  }
}
