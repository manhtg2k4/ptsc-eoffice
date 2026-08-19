import { Injectable, Inject, InternalServerErrorException, BadRequestException, NotFoundException, ForbiddenException, forwardRef } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { MSSQLRepository } from 'src/database/sqlRepo.mssql';
import { ConnectionPool } from 'mssql';
import { NotificationService } from 'src/notifycation/notification.service';
import { Any } from 'typeorm';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
interface Comment {
    id: number;
    documentId: string;
    parentId: number | null;
    userId: string;
    userName: string;
    positionName?: string;
    avatar?: string;
    content: string;
    type: string;
    isEdited: boolean;
    createdAt: Date;
    replies: Comment[];
}

interface MentionUser {
    userId: string;
}

import { ProjectService } from 'src/project/project.service';
import { NewsService } from 'src/news/news.service';
import { escapeHtml } from 'src/utils/html-sanitize.util';

@Injectable()
export class CommentsService {
    constructor(
        @Inject('MSSQL_REPO') private mssqlRepo: MSSQLRepository,
        private readonly notificationService: NotificationService,
        @Inject(forwardRef(() => ProjectService))
        private readonly projectService: ProjectService,
        @Inject(forwardRef(() => NewsService))
        private readonly newsService: NewsService,
        @InjectDataSource('mssqlConnection')
        private readonly dataSource: DataSource,
    ) { }

    private escapeCommentContent(content: unknown): string {
        return typeof content === 'string' ? escapeHtml(content) : '';
    }

    private async completeMonthlyOverdueReasonRequest(
        taskId: string,
        userId: string,
        commentId: string,
    ): Promise<void> {
        const updated: Array<{ notificationId: number }> = await this.dataSource.query(
            `UPDATE n
             SET content = CONCAT(
                   N'Bạn đang có ', remaining.remaining_count,
                   N' công việc trễ hạn cần cập nhật lý do. Vui lòng kiểm tra và xử lý.'
                 ),
                 isRead = CASE WHEN remaining.remaining_count = 0 THEN 1 ELSE 0 END,
                 updatedAt = GETDATE()
             OUTPUT INSERTED.id AS notificationId
             FROM notifications n
             CROSS APPLY (
               SELECT COUNT(DISTINCT t.id) AS remaining_count
               FROM task t
               INNER JOIN task_users tu ON tu.task_id = t.id
               WHERE t.status = 1
                 AND t.end_date IS NOT NULL AND t.end_date < n.createdAt
                 AND (t.process_status IS NULL OR t.process_status NOT IN ('4', '8'))
                 AND tu.role = 'director' AND tu.type = 1
                 AND LTRIM(RTRIM(tu.process_id)) = @0
                 AND NOT EXISTS (
                   SELECT 1 FROM document_comments c
                   WHERE c.document_id = CONVERT(NVARCHAR(50), t.id)
                     AND c.user_id = @0 AND c.type = 'slowReason'
                     AND c.created_at >= n.createdAt
                 )
             ) remaining
             WHERE n.id = (
                 SELECT TOP 1 latest.id
                 FROM notifications latest
                 WHERE latest.recipientId = @0
                   AND latest.type = 'TASK_OVERDUE_REASON_REQUIRED'
                 ORDER BY latest.id DESC
               )
               AND EXISTS (
                 SELECT 1 FROM task t
                 INNER JOIN task_users tu ON tu.task_id = t.id
                 WHERE t.id = @1 AND t.status = 1
                   AND t.end_date IS NOT NULL AND t.end_date < n.createdAt
                   AND (t.process_status IS NULL OR t.process_status NOT IN ('4', '8'))
                   AND tu.role = 'director' AND tu.type = 1
                   AND LTRIM(RTRIM(tu.process_id)) = @0
               )
               AND EXISTS (
                 SELECT 1 FROM document_comments current_comment
                 WHERE current_comment.id = @2
                   AND current_comment.document_id = CONVERT(NVARCHAR(50), @1)
                   AND current_comment.user_id = @0
                   AND current_comment.type = 'slowReason'
                   AND current_comment.created_at >= n.createdAt
               )`,
            [userId, Number(taskId), commentId],
        );
        if (updated.length) this.notificationService.notifyUserChanged(userId);
    }

    // Helper function để normalize commanders - đảm bảo luôn là mảng đơn giản
    private normalizeCommanders(commanders: any): string[] {
        if (!commanders) return [];

        // Nếu là string, parse nó
        let parsed: any = commanders;
        if (typeof commanders === 'string') {
            try {
                parsed = JSON.parse(commanders);
            } catch {
                return [];
            }
        }

        // Nếu không phải array, trả về mảng rỗng
        if (!Array.isArray(parsed)) {
            return [];
        }

        // Flatten mảng lồng nhau và chuyển tất cả thành string
        const flatten = (arr: any[]): string[] => {
            const result: string[] = [];
            for (const item of arr) {
                if (Array.isArray(item)) {
                    result.push(...flatten(item));
                } else if (item != null && item !== '') {
                    result.push(String(item));
                }
            }
            return result;
        };

        const flattened = flatten(parsed);

        // Loại bỏ duplicate và trả về
        return [...new Set(flattened)];
    }

    // src/comments/comments.service.ts
    async createv1(documentId: string, dto: any) {
        // === 1. VALIDATE ===
        if (!documentId?.trim()) {
            throw new BadRequestException('documentId là bắt buộc');
        }
        if (!dto.userId?.trim()) {
            throw new BadRequestException('userId là bắt buộc');
        }

        // === 2. DÙNG MSSQL: createComment ===
        if (!this.mssqlRepo) {
            throw new InternalServerErrorException('MSSQL không khả dụng');
        }

        try {
            // Lấy userName từ database
            const userName = (await this.mssqlRepo.getUserNameById(dto.userId)) || dto.userName || 'Unknown';

            const commentId = await this.mssqlRepo.createComment({
                documentId,
                userId: dto.userId,
                userName,
                content: this.escapeCommentContent(dto.content),
                type: dto.type || 'comment',
                parentId: dto.parentId || null,
                fileId: dto.fileId || null,   // 👈 THÊM DÒNG NÀY
            });
            // === 3. TRẢ VỀ ĐÚNG FORMAT ===
            return {
                data: commentId,
                message: 'Thêm ý kiến thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            throw new InternalServerErrorException('Thêm ý kiến thất bại');
        }
    }


    async create(documentId: string, dto: any, userId: any) {
        // === 1. VALIDATE ===
        if (!documentId?.toString().trim()) {
            throw new BadRequestException('documentId là bắt buộc');
        }

        // Lấy userId từ token (currentUser), KHÔNG tin vào dto.userId//
        if (!userId?.trim()) {
            throw new BadRequestException('Không xác định được người dùng');
        }

        if (!this.mssqlRepo) {
            throw new InternalServerErrorException('MSSQL không khả dụng');
        }

        const projectId = parseInt(documentId, 10);
        if (!isNaN(projectId)) {
            const projectStatus = await this.projectService.getProjectStatus(projectId);
            if (projectStatus === 3 || projectStatus === 4) {
                throw new BadRequestException(
                    `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể bình luận hoặc thêm thông tin.`
                );
            }
        }

        // === Check permission for slowReason ===
        // if (dto.type === 'slowReason') {
        //     const projectId = parseInt(documentId);
        //     if (!isNaN(projectId)) {
        //         const hasPermission = await this.projectService.hasPermission(userId, projectId, 'inputDelayReason');
        //         if (!hasPermission) {
        //             throw new ForbiddenException('Bạn không có quyền nhập lý do chậm tiến độ cho dự án này');
        //         }
        //     }
        // }

        try {
            // === 2. Tìm feedback request theo document_id ===
            const feedback = await this.mssqlRepo.getFeedbackRequestByDocumentId(documentId);

            let shouldUpdateFeedback = false;
            let commandersStatus: Record<string, string> = {};

            if (feedback) {
                let commanders: string[] = [];

                try {
                    const parsed = typeof feedback.commanders === 'string'
                        ? JSON.parse(feedback.commanders)
                        : Array.isArray(feedback.commanders) ? feedback.commanders : [];
                    commanders = this.normalizeCommanders(parsed);

                    commandersStatus = typeof feedback.commanders_status === 'string'
                        ? JSON.parse(feedback.commanders_status || '{}')
                        : feedback.commanders_status || {};
                } catch (e) {
                    console.error('Parse JSON commanders error:', e);
                }

                // Kiểm tra userId có trong danh sách được xin ý kiến không
                if (commanders.includes(userId) && commandersStatus[userId] !== 'given') {
                    commandersStatus[userId] = 'given';
                    shouldUpdateFeedback = true;
                }
            }

            // Lấy userName từ database
            const userName = (await this.mssqlRepo.getUserNameById(userId)) || dto.userName || 'Unknown';

            // === 3. Tạo comment ===
            const commentId = await this.mssqlRepo.createComment({
                documentId: documentId.toString(),
                userId,
                userName,
                content: this.escapeCommentContent(dto.content),
                type: dto.type || 'comment',
                parentId: dto.parentId || null,
                fileId: dto.fileId || null,
            });

            // === 4. Cập nhật feedback_requests nếu cần ===
            if (shouldUpdateFeedback && feedback) {
                const newCountNotGive = Math.max(0, (feedback.count_not_give || 0) - 1);
                const newCountGave = (feedback.count_gave || 0) + 1;

                await this.mssqlRepo.updateFeedbackRequestStatus(
                    feedback.id,
                    {
                        commanders_status: JSON.stringify(commandersStatus),
                        count_not_give: newCountNotGive,
                        count_gave: newCountGave,
                    }
                );

                // Xóa work item xin ý kiến của user này (nếu có)
                await this.mssqlRepo.removeOpinionWorkItem(documentId.toString(), userId);

                // Gửi thông báo cho NGƯỜI XIN Ý KIẾN (feedback.employee_id)
                if (feedback.employee_id && feedback.employee_id !== userId) {
                    try {
                        const senderName = userName || 'Một đồng chí';
                        const doc = await this.mssqlRepo.getOutgoingDocument(documentId).catch(() => null);
                        const docTitle = doc?.abstractNote || doc?.abstract_note || '';
                        const titleText = docTitle ? `: “${docTitle}”` : '';
                        const contentText = docTitle ? ` về văn bản “${docTitle}”.` : ` về văn bản.`;

                        await this.notificationService.create({
                            recipientId: feedback.employee_id,
                            senderId: userId,
                            content: `Đồng chí ${senderName} đã cho ý kiến${contentText}`,
                            title: `Văn bản đi đã được cho ý kiến${titleText}`,
                            recordId: documentId.toString(),
                            link: `/outgoing-documents/${documentId}`,
                            key: 'VIEW_OUTCOMING_DOC',
                            type: 'OUTGOING_DOC_OPINION_PROVIDED',
                            time: new Date(),
                            status: 1,
                        });
                    } catch (e) {
                        console.error('Error sending feedback provided notification:', e);
                    }
                }
            }
            // === 5. Thêm TAG (mention) nếu FE truyền lên ===
            if (Array.isArray(dto.mentionIds) && dto.mentionIds.length > 0) {
                const insertTagPromises = dto.mentionIds.map((targetUserId: string) => {
                    return this.mssqlRepo.insertCommentTag({
                        commentId: commentId.id,
                        taggedUserId: targetUserId,
                        taggedBy: userId,
                    });
                });

                await Promise.all(insertTagPromises);
            }

            return {
                data: commentId,
                message: 'Thêm ý kiến thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            throw new InternalServerErrorException('Thêm ý kiến thất bại');
        }
    }

    async findAllByDocumentId(documentId: string, userId: any) {
        try {
            const data = await this.mssqlRepo.listCommentsByDocumentId(documentId, userId);

            const htmlData = data.map(item => {
                let content = item.content || '';
                // Lấy avatarId và avatarPath từ avatar object
                let avatarId = null;
                let avatarPath = null;
                if (item.avatar) {
                    const avatar = typeof item.avatar === 'string' ? JSON.parse(item.avatar) : item.avatar;
                    avatarId = avatar?.id || null;
                    avatarPath = avatar?.path || null;
                }
                // CASE 1: Có dấu :
                if (content.includes(':')) {
                    content = content.replace(
                        /^([^:]+:)\s*([^.\n]+)(\.)/,
                        (_, label, target, dot) => {
                            // Deduplicate tên bị lặp (vd: "tonggiamdoc, tonggiamdoc" → "tonggiamdoc")
                            const names = target.split(',').map((n: string) => n.trim()).filter(Boolean);
                            const uniqueNames = [...new Set(names)].join(', ');
                            return `${label} <span style="color:#1e88e5; font-weight:500;">${uniqueNames}</span>${dot}`;
                        }
                    );
                }
                // CASE 2: Không có dấu :, legacy "cho ..."
                else {
                    content = content.replace(
                        /(^|[ \t])(cho\s+)([^.\n]+)(\.)/i,
                        (_, space, prefix, target, dot) =>
                            `${space}${prefix}<span style="color:#1e88e5; font-weight:500;">${target}</span>${dot}`
                    );
                }
                // giữ nguyên hành vi xuống dòng
                content = content.replace(/\r\n|\r|\n/g, '<br/>');
                return {
                    ...item,
                    avatarId,
                    avatarPath,
                    content,
                };
            });

            return {
                data: htmlData,
                message: 'Lấy danh sách ý kiến thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw new InternalServerErrorException('Lấy danh sách ý kiến thất bại');
        }
    }

    // src/comments/comments.service.ts
    async updateContent(commentId: string, content: string) {
        if (!content || content.trim() === '') {
            throw new BadRequestException('Nội dung mới là bắt buộc.');
        }

        const comment = await this.mssqlRepo.getCommentById(commentId);
        if (comment) {
            const projectId = parseInt(comment.documentId, 10);
            if (!isNaN(projectId)) {
                const projectStatus = await this.projectService.getProjectStatus(projectId);
                if (projectStatus === 3 || projectStatus === 4) {
                    throw new BadRequestException(
                        `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể cập nhật bình luận.`
                    );
                }
            }
        }

        const updatedComment = await this.mssqlRepo.updateCommentContent(
            commentId, // commentId là string
            this.escapeCommentContent(content).trim(),
        );

        if (!updatedComment) {
            throw new NotFoundException('Không tìm thấy ý kiến để cập nhật.');
        }

        return updatedComment;
    }

    async replyComment(dto: any, documentId: any, commentId: any, userId: any) {
        const parentComment = await this.mssqlRepo.getCommentById(commentId);
        if (!parentComment) {
            return { status: 0, error: 'Không tìm thấy ý kiến gốc để trả lời.' };
        }

        const projectId = parseInt(parentComment.documentId, 10);
        if (!isNaN(projectId)) {
            const projectStatus = await this.projectService.getProjectStatus(projectId);
            if (projectStatus === 3 || projectStatus === 4) {
                throw new BadRequestException(
                    `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể trả lời bình luận.`
                );
            }
        }

        // Lấy userName từ database
        const userName = (await this.mssqlRepo.getUserNameById(dto.userId)) || dto.userName || 'Unknown';

        const reply = await this.mssqlRepo.createComment({
            documentId: parentComment.documentId,
            userId,
            userName,
            content: this.escapeCommentContent(dto.content),
            parentId: commentId,
            type: 'reply',
        });
        return reply;
    }
    async deleteCommentAndReplies(commentId: string) {
        const comment = await this.mssqlRepo.getCommentById(commentId);
        if (comment) {
            const projectId = parseInt(comment.documentId, 10);
            if (!isNaN(projectId)) {
                const projectStatus = await this.projectService.getProjectStatus(projectId);
                if (projectStatus === 3 || projectStatus === 4) {
                    throw new BadRequestException(
                        `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể xóa bình luận.`
                    );
                }
            }
        }
        // GỌI THẲNG HÀM CÓ SẴN – đúng như Express cũ
        const deleted = await this.mssqlRepo.deleteCommentAndReplies(
            commentId, // hoặc parseInt nếu cần
        );

        if (!deleted) {
            {
                throw new NotFoundException('Không tìm thấy ý kiến để xóa');
            }
        }
        return { status: 1, message: 'Đã xóa ý kiến' };
    }

    // Bình luận trong công việc
    async createCommentForTask(taskId: string, dto: any, userId: any) {
        // === 1. VALIDATE ===
        if (!taskId?.toString().trim()) {
            throw new BadRequestException('documentId là bắt buộc');
        }

        // Lấy userId từ token (currentUser), KHÔNG tin vào dto.userId//
        if (!userId?.trim()) {
            throw new BadRequestException('Không xác định được người dùng');
        }

        if (!this.mssqlRepo) {
            throw new InternalServerErrorException('MSSQL không khả dụng');
        }

        const task = await this.mssqlRepo.getTaskById(taskId);
        if (task?.projectId) {
            const projectStatus = await this.projectService.getProjectStatus(Number(task.projectId));
            if (projectStatus === 3 || projectStatus === 4) {
                throw new BadRequestException(
                    `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể bình luận hoặc thêm thông tin cho công việc.`
                );
            }
        }

        // === Check permission for slowReason hoặc Solution ===
        if (dto.type === 'slowReason' || dto.type === 'solution') {
            if (task?.projectId) {
                const isTaskParticipant = await this.mssqlRepo.isTaskParticipant(taskId, userId);
                if (!isTaskParticipant) {
                    const hasPermission = await this.projectService.hasPermission(userId, task.projectId, 'inputDelayReason');
                    if (!hasPermission) {
                        const msg = dto.type === 'slowReason' ? 'lý do chậm tiến độ' : 'giải pháp khắc phục';
                        throw new ForbiddenException(`Bạn không có quyền nhập ${msg} cho dự án này`);
                    }
                }
            }
        }

        try {

            // Lấy userName từ database
            const userName = (await this.mssqlRepo.getUserNameById(userId)) || dto.userName || 'Unknown';

            // === Tạo comment ===
            const commentId = await this.mssqlRepo.createComment({
                documentId: taskId.toString(),
                userId,
                userName,
                content: this.escapeCommentContent(dto.content),
                type: dto.type || 'comment',
                parentId: dto.parentId || null,
                fileId: dto.fileId || null,
            });

            // Tái sử dụng đúng luồng lý do hiện có: comment type=slowReason.
            if (dto.type === 'slowReason') {
                await this.completeMonthlyOverdueReasonRequest(
                    taskId,
                    userId,
                    String(commentId.id),
                );
            }

            // ===  Thêm TAG (mention) nếu FE truyền lên ===
            if (Array.isArray(dto.mentionIds) && dto.mentionIds.length > 0) {
                const insertTagPromises = dto.mentionIds.map((targetUserId: string) => {
                    return this.mssqlRepo.insertCommentTag({
                        commentId: commentId.id,
                        taggedUserId: targetUserId,
                        taggedBy: userId,
                    });
                });

                await Promise.all(insertTagPromises);
            }

            // Gửi thông báo
            await this.createNotifications(taskId, dto.mentionIds, userId, '', dto.type || 'comment')

            return {
                data: commentId,
                message: 'Thêm bình luận thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error creating comment:', error);
            throw new InternalServerErrorException('Thêm bình luận thất bại');
        }
    }

    async findAllByTaskId(taskId: string, userId: any, filter: any) {
        try {
            if (filter?.type && !Array.isArray(filter.type)) {
                filter.type = [filter.type];
            }
            const data = await this.mssqlRepo.listCommentsByTaskId(taskId, userId, filter);
            await this.enrichCommentTreeLikedUsers(data);
            return {
                data,
                message: 'Lấy danh sách bình luận thành công',
                success: true,
                status: 1,
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw new InternalServerErrorException('Lấy danh sách bình luận thất bại');
        }
    }

    async replyCommentForTask(dto: any, taskId: any, commentId: any, userId: any) {
        const parentComment = await this.mssqlRepo.getCommentById(commentId);
        if (!parentComment) {
            return { status: 0, error: 'Không tìm thấy ý kiến gốc để trả lời.' };
        }

        const task = await this.mssqlRepo.getTaskById(taskId);
        if (task?.projectId) {
            const projectStatus = await this.projectService.getProjectStatus(Number(task.projectId));
            if (projectStatus === 3 || projectStatus === 4) {
                throw new BadRequestException(
                    `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể trả lời bình luận cho công việc.`
                );
            }
        }

        // Lấy userName từ database
        const userName = (await this.mssqlRepo.getUserNameById(userId)) || dto.userName || 'Unknown';

        const reply = await this.mssqlRepo.createComment({
            documentId: parentComment.documentId,
            userId,
            userName,
            content: this.escapeCommentContent(dto.content),
            parentId: commentId,
            type: 'reply',
        });

        // Gửi thông báo
        await this.createNotifications(taskId, dto.mentionIds, userId, '', 'reply')

        return reply;
    }

    async updateCommentForTask(taskId: string, commentId: string, content: string, userId: any) {
        if (!content || content.trim() === '') {
            throw new BadRequestException('Nội dung mới là bắt buộc.');
        }

        const comment = await this.mssqlRepo.getCommentById(commentId);
        const task = await this.mssqlRepo.getTaskById(taskId);
        if (task?.projectId) {
            const projectStatus = await this.projectService.getProjectStatus(Number(task.projectId));
            if (projectStatus === 3 || projectStatus === 4) {
                throw new BadRequestException(
                    `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể cập nhật bình luận cho công việc.`
                );
            }
        }

        // === Check permission for slowReason hoặc Solution ===
        if (comment?.type === 'slowReason' || comment?.type === 'solution') {
            if (task?.projectId) {
                const isTaskParticipant = await this.mssqlRepo.isTaskParticipant(taskId, userId);
                if (!isTaskParticipant) {
                    const hasPermission = await this.projectService.hasPermission(userId, task.projectId, 'inputDelayReason');
                    if (!hasPermission) {
                        const msg = comment.type === 'slowReason' ? 'lý do chậm tiến độ' : 'giải pháp khắc phục';
                        throw new ForbiddenException(`Bạn không có quyền chỉnh sửa ${msg} trong dự án này`);
                    }
                }
            }
        }

        const updatedComment = await this.mssqlRepo.updateCommentContent(
            commentId, // commentId là string
            this.escapeCommentContent(content).trim(),
        );

        if (!updatedComment) {
            throw new NotFoundException('Không tìm thấy ý kiến để cập nhật.');
        }

        // Gửi thông báo
        await this.createNotifications(taskId, [], userId, '', comment?.type || 'comment')

        return updatedComment;
    }

    async deleteCommentForTaskAndReplies(commentId: string) {
        const comment = await this.mssqlRepo.getCommentById(commentId);
        if (comment) {
            const task = await this.mssqlRepo.getTaskById(comment.documentId);
            if (task?.projectId) {
                const projectStatus = await this.projectService.getProjectStatus(Number(task.projectId));
                if (projectStatus === 3 || projectStatus === 4) {
                    throw new BadRequestException(
                        `Dự án đã ở trạng thái ${projectStatus === 3 ? 'Hoàn thành' : 'Hủy'}, không thể xóa bình luận của công việc.`
                    );
                }
            }
        }

        const deleted = await this.mssqlRepo.deleteCommentAndReplies(
            commentId, // hoặc parseInt nếu cần
        );

        if (!deleted) {
            {
                throw new NotFoundException('Không tìm thấy ý kiến để xóa');
            }
        }
        return { status: 1, message: 'Đã xóa ý kiến' };
    }

    async likeCommentForTask(commentId: string, userId: string, type: string, taskId: string) {
        const parentComment = await this.mssqlRepo.getCommentById(commentId);
        if (!parentComment) {
            {
                throw new NotFoundException('Không tìm thấy bình luận để like');
            }
        }
        let likesNew: string[] = [];

        const likesOll = parentComment.likes;

        let newLikesStr = '';
        const userIdStr = userId.toString();
        if (likesOll) {
            const likes: string[] = JSON.parse(likesOll);
            if (likes.includes(userIdStr)) {
                likesNew = likes.filter(i => i !== userIdStr);
            } else {
                likesNew = [...likes, userIdStr];
            }
            newLikesStr = JSON.stringify(likesNew);
        } else {
            likesNew = [userIdStr];
            newLikesStr = JSON.stringify(likesNew);
        }
        await this.mssqlRepo.updateCommentLikesForTask(commentId, newLikesStr);
        if (type === 'like') {
            await this.createNotifications(taskId, [], userId, commentId, type)
        }

        const likedUsers = await this.mapUserIdsToLikedUsers(likesNew);
        return {
            length: likesNew.length,
            likes: likesNew,
            likedUsers,
        };
    }

    async createNotifications(
        taskId: string,
        mentionIds: string[],
        userId: string,
        commentId: string,
        type: string
    ) {
        if (!taskId) return;
        let result;
        if (commentId && type === 'like') {
            result = await this.mssqlRepo.getUserNotifiComment({ taskId, commentId });
        } else {
            result = await this.mssqlRepo.getUserNotifiTask({ taskId, userId });
        }

        if (!result?.data?.length) return;

        const data = result.data as MentionUser[];

        const uniqueData: MentionUser[] = Array.from(
            new Map<string, MentionUser>(
                data.map(u => [u.userId, u])
            ).values(),
        );

        for (const user of uniqueData) {
            let content = '';
            if (type === 'like') {
                content = 'Đồng chí có bình luận được thích trong công việc';
            } else if (type === 'slowReason') {
                content = 'Đồng chí có lý do chậm tiến độ trong công việc';
            } else if (type === 'solution') {
                content = 'Đồng chí có giải pháp khắc phục trong công việc';
            } else {
                content = mentionIds.includes(user.userId)
                    ? 'Đồng chí được tag vào công việc'
                    : 'Đồng chí có bình luận trong công việc';
            }

            await this.notificationService.create({
                recipientId: user.userId,
                senderId: userId,
                content,
                recordId: taskId,
                link: '',
                key: 'VIEW_TASK',
                time: new Date(),
                status: 1,
            });
        }
    }

    // Bình luận trong lịch họp
    async createCommentForMeetingTask(meetingTaskId: string, dto: any, userId: any) {
        // === 1. VALIDATE ===
        if (!meetingTaskId?.toString().trim()) {
            throw new BadRequestException('meetingTaskId là bắt buộc');
        }

        // Lấy userId từ token (currentUser), KHÔNG tin vào dto.userId
        if (!userId?.trim()) {
            throw new BadRequestException('Không xác định được người dùng');
        }

        if (!this.mssqlRepo) {
            throw new InternalServerErrorException('MSSQL không khả dụng');
        }

        try {
            // Lấy userName từ database
            const userName = (await this.mssqlRepo.getUserNameById(userId)) || dto.userName || 'Unknown';

            // === Tạo comment ===
            const commentId = await this.mssqlRepo.createComment({
                documentId: meetingTaskId.toString(),
                userId,
                userName,
                content: this.escapeCommentContent(dto.content),
                type: dto.type || 'comment',
                parentId: dto.parentId || null,
                fileId: dto.fileId || null,
            });

            // === Thêm TAG (mention) nếu FE truyền lên ===
            if (Array.isArray(dto.mentionIds) && dto.mentionIds.length > 0) {
                const insertTagPromises = dto.mentionIds.map((targetUserId: string) => {
                    return this.mssqlRepo.insertCommentTag({
                        commentId: commentId.id,
                        taggedUserId: targetUserId,
                        taggedBy: userId,
                    });
                });

                await Promise.all(insertTagPromises);
            }

            // Gửi thông báo
            await this.createNotificationsForMeetingTask(meetingTaskId, dto.mentionIds, userId, '', '');

            return {
                data: commentId,
                message: 'Thêm bình luận thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error creating comment for meeting task:', error);
            throw new InternalServerErrorException('Thêm bình luận thất bại');
        }
    }

    async findAllByMeetingTaskId(meetingTaskId: string, userId: any) {
        try {
            const data = await this.mssqlRepo.listCommentsByMeetingTaskId(meetingTaskId, userId);
            await this.enrichCommentTreeLikedUsers(data);
            return {
                data,
                message: 'Lấy danh sách bình luận thành công',
                success: true,
                status: 1,
            };
        } catch (error) {
            console.error('Error fetching comments for meeting task:', error);
            throw new InternalServerErrorException('Lấy danh sách bình luận thất bại');
        }
    }

    async replyCommentForMeetingTask(dto: any, meetingTaskId: any, commentId: any, userId: any) {
        const parentComment = await this.mssqlRepo.getCommentById(commentId);
        if (!parentComment) {
            return { status: 0, error: 'Không tìm thấy ý kiến gốc để trả lời.' };
        }

        // Lấy userName từ database
        const userName = (await this.mssqlRepo.getUserNameById(userId)) || dto.userName || 'Unknown';

        const reply = await this.mssqlRepo.createComment({
            documentId: parentComment.documentId,
            userId,
            userName,
            content: this.escapeCommentContent(dto.content),
            parentId: commentId,
            type: 'reply',
        });

        // Gửi thông báo
        await this.createNotificationsForMeetingTask(meetingTaskId, dto.mentionIds, userId, '', '');

        return reply;
    }

    async updateCommentForMeetingTask(meetingTaskId: string, commentId: string, content: string, userId: any) {
        if (!content || content.trim() === '') {
            throw new BadRequestException('Nội dung mới là bắt buộc.');
        }

        const updatedComment = await this.mssqlRepo.updateCommentContent(
            commentId,
            this.escapeCommentContent(content).trim(),
        );

        if (!updatedComment) {
            throw new NotFoundException('Không tìm thấy ý kiến để cập nhật.');
        }

        // Gửi thông báo
        await this.createNotificationsForMeetingTask(meetingTaskId, [], userId, '', '');

        return updatedComment;
    }

    async deleteCommentForMeetingTaskAndReplies(commentId: string) {
        const deleted = await this.mssqlRepo.deleteCommentAndReplies(commentId);

        if (!deleted) {
            throw new NotFoundException('Không tìm thấy ý kiến để xóa');
        }
        return { status: 1, message: 'Đã xóa ý kiến' };
    }

    async likeCommentForMeetingTask(commentId: string, userId: string, type: string, meetingTaskId: string) {
        const parentComment = await this.mssqlRepo.getCommentById(commentId);
        if (!parentComment) {
            throw new NotFoundException('Không tìm thấy bình luận để like');
        }

        let likesNew: string[] = [];
        const likesOld = parentComment.likes;
        let newLikesStr = '';
        const userIdStr = userId.toString();

        if (likesOld) {
            const likes: string[] = JSON.parse(likesOld);
            if (likes.includes(userIdStr)) {
                likesNew = likes.filter(i => i !== userIdStr);
            } else {
                likesNew = [...likes, userIdStr];
            }
            newLikesStr = JSON.stringify(likesNew);
        } else {
            likesNew = [userIdStr];
            newLikesStr = JSON.stringify(likesNew);
        }

        await this.mssqlRepo.updateCommentLikes(commentId, newLikesStr);

        if (type === 'like') {
            await this.createNotificationsForMeetingTask(meetingTaskId, [], userId, commentId, type);
        }

        const likedUsers = await this.mapUserIdsToLikedUsers(likesNew);
        return {
            length: likesNew.length,
            likes: likesNew,
            likedUsers,
        };
    }

    async createNotificationsForMeetingTask(
        meetingTaskId: string,
        mentionIds: string[],
        userId: string,
        commentId: string,
        type: string
    ) {
        if (!meetingTaskId) return;
        const meetingId = meetingTaskId;

        let result;
        if (commentId && type === 'like') {
            result = await this.mssqlRepo.getUserNotifiCommentForMeetingTask({ meetingTaskId, commentId });
        } else {
            result = await this.mssqlRepo.getUserParticipantMeeting({ meetingId });
        }

        if (!result?.data?.length) return;

        const data = result.data as MentionUser[];

        const uniqueData: MentionUser[] = Array.from(
            new Map<string, MentionUser>(
                data.map(u => [u.userId, u])
            ).values(),
        );

        for (const user of uniqueData) {
            let content = '';
            if (type === 'like') {
                content = 'Đồng chí có bình luận được thích trong lịch họp';
            } else {
                content = mentionIds.includes(user.userId)
                    ? 'Đồng chí được tag vào lịch họp'
                    : 'Đồng chí có bình luận trong lịch họp';
            }

            await this.notificationService.create({
                recipientId: user.userId,
                senderId: userId,
                content,
                recordId: meetingTaskId,
                link: '',
                key: 'VIEW_MEETING_TASK',
                time: new Date(),
                status: 1,
            });
        }
    }

    async findOne(commentId: string) {
        const dataFind = await this.mssqlRepo.findOne(
            commentId,
        );

        if (!dataFind) {
            {
                throw new NotFoundException('Không tìm thấy bình luận');
            }
        }
        return dataFind;
    }

    private async mapUserIdsToLikedUsers(
        userIds: string[],
    ): Promise<{ userId: string; userName: string }[]> {
        if (!userIds.length) return [];
        const names = await this.mssqlRepo.getUserNamesByIds(userIds);
        return userIds.map((id) => ({
            userId: id,
            userName: names[id] ?? id,
        }));
    }

    private flattenCommentTree(comments: any[]): any[] {
        const out: any[] = [];
        for (const c of comments) {
            out.push(c);
            if (Array.isArray(c.replies) && c.replies.length) {
                out.push(...this.flattenCommentTree(c.replies));
            }
        }
        return out;
    }

    /** Gắn likes (mảng userId) và likedUsers ({ userId, userName }) cho cây bình luận (task / meeting). */
    private async enrichCommentTreeLikedUsers(comments: any[]): Promise<void> {
        if (!comments?.length) return;
        const flat = this.flattenCommentTree(comments);
        const allIds = new Set<string>();
        for (const c of flat) {
            let ids: string[] = [];
            const raw = c.likes;
            if (raw) {
                try {
                    ids =
                        typeof raw === 'string'
                            ? JSON.parse(raw)
                            : Array.isArray(raw)
                              ? raw.map(String)
                              : [];
                } catch {
                    ids = [];
                }
            }
            if (!Array.isArray(ids)) ids = [];
            (c as { _parsedLikeIds?: string[] })._parsedLikeIds = ids;
            ids.forEach((id) => allIds.add(String(id)));
        }
        const nameMap =
            allIds.size > 0
                ? await this.mssqlRepo.getUserNamesByIds([...allIds])
                : ({} as Record<string, string>);
        for (const c of flat) {
            const ids = (c as { _parsedLikeIds?: string[] })._parsedLikeIds ?? [];
            delete (c as { _parsedLikeIds?: string[] })._parsedLikeIds;
            c.likes = ids;
            c.likedUsers = ids.map((userId) => ({
                userId,
                userName: nameMap[userId] ?? userId,
            }));
        }
    }

    // Bình luận cho tin tức
    async createCommentForNews(newsId: string, dto: any, userId: any) {
        if (!newsId) {
            throw new BadRequestException('newsId là bắt buộc');
        }
        
        const idNumber = parseInt(newsId);
        if (isNaN(idNumber)) {
            throw new BadRequestException('newsId phải là số');
        }

        // NewsService.addComment(newsId: number, dto: any, userFromJwt: any, ipAddress?: string)
        // Chúng ta giả lập userFromJwt bằng cách truyền object chứa userId
        return this.newsService.addComment(idNumber, { ...dto, content: this.escapeCommentContent(dto?.content) }, { userId });
    }
}
