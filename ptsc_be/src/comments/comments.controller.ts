
// src/comments/comments.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UpdateCommentDto } from './dto/update-comment.dto'; // Tạo DTO mới cho update
import { DocumentPermissionGuard } from 'src/common/guards/document-permission.guard';
@ApiTags('Comments')
@Controller() // Không cần prefix vì đã có trong module
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @ApiOperation({ summary: 'Thêm một ý kiến vào văn bản' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiBearerAuth()
    @UseGuards(DocumentPermissionGuard)
    @Post('documents/:id/comments')
    create(
        @Param('id') documentId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        return this.commentsService.create(documentId, createCommentDto, userId);
    }

    @ApiOperation({ summary: 'Lấy danh sách tất cả ý kiến của 1 văn bản' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiBearerAuth()
    @UseGuards(DocumentPermissionGuard)
    @Get('documents/:id/comments')
    findAll(
        @Param('id') documentId: string, 
        @Req() req: any) {
            const userId = req.user?.userId;
            if (!userId) {
                return { status: 0, error: 'User not authenticated' };
            }
            return this.commentsService.findAllByDocumentId(documentId, userId);
    }


    @ApiOperation({ summary: 'Trả lời ý kiến' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiParam({ name: 'commentId', description: 'The comment ID being replied' })
    @UseGuards(DocumentPermissionGuard)
    @Post('documents/:id/comments/:commentId/reply')
    async replyComment(
        @Param('id') documentId: string,
        @Param('commentId') commentId: string,
        @Body() dto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        dto.userId = userId;

        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        if (!dto.content) {
            return { status: 0, error: 'nội dung là bắt buộc' };
        }
        const reply = await this.commentsService.replyComment(dto, documentId, commentId, userId);

        return { status: 1, message: 'Đã trả lời ý kiến', data: reply };
    }

    // --- Thêm API update comment ---
    @ApiOperation({ summary: 'Cập nhật 1 ý kiến với  id' })
    @ApiParam({ name: 'commentId', description: 'The comment ID' })
    @ApiBearerAuth()
    @Put('comments/:commentId')
    async update(
        @Param('commentId') commentId: string,
        @Body() updateCommentDto: UpdateCommentDto,
    ) {
        const updatedComment = await this.commentsService.updateContent(commentId, updateCommentDto.content);

        if (!updatedComment) {
            return { status: 0, error: 'Không tìm thấy ý kiến để cập nhật.' };
        }

        return { status: 1, message: 'Đã cập nhật ý kiến', data: updatedComment };
    }

    @ApiOperation({ summary: 'Xóa một ý kiến' })
    @ApiParam({ name: 'commentId', description: 'Comment ID to delete' })
    @ApiBearerAuth()
    @Delete('comments/:commentId')
    async delete(@Param('commentId') commentId: string) {
        const deleted = await this.commentsService.deleteCommentAndReplies(commentId);
        if (!deleted) {
            return { status: 0, error: 'Không tìm thấy ý kiến để xoá.' };
        }
        return { status: 1, message: 'Đã xóa ý kiến' };
    }

    // ----- API CHUNG tạo bình luận -----

    @ApiOperation({ summary: 'Tạo bình luận chung (document / task / meeting-task / news)' })
    @ApiQuery({ name: 'refType', enum: ['document', 'task', 'meeting-task', 'news'], description: 'Loại đối tượng' })
    @ApiQuery({ name: 'refId', description: 'ID của đối tượng' })
    @ApiBearerAuth()
    @Post('comments')
    async createComment(
        @Query('refType') refType: string,
        @Query('refId') refId: string,
        @Body() dto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        if (!refId) {
            return { status: 0, error: 'refId là bắt buộc' };
        }
        switch (refType) {
            case 'document':
                return this.commentsService.create(refId, dto, userId);
            case 'task':
                return this.commentsService.createCommentForTask(refId, dto, userId);
            case 'meeting-task':
                return this.commentsService.createCommentForMeetingTask(refId, dto, userId);
            case 'news':
                return this.commentsService.createCommentForNews(refId, dto, userId);
            default:
                return { status: 0, error: `refType không hợp lệ. Dùng: document | task | meeting-task | news` };
        }
    }

    // ----- Bình luận trong công việc -----

    @ApiOperation({ summary: 'Thêm một bình luận vào công việc' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiBearerAuth()
    @Post('task/:id/comments')
    createCommentForTask(
        @Param('id') taskId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        return this.commentsService.createCommentForTask(taskId, createCommentDto, userId);
    }

    @ApiOperation({ summary: 'Lấy danh sách tất cả bình luận của 1 công việc' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiBearerAuth()
    @Get('task/:id/comments')
    async findAllCommentForTask(
        @Param('id') taskId: string,
        // @Query('type') type: string,
        @Query('filter') filter: any,
        @Req() req: any) {
            const userId = req.user?.userId;
            if (!userId) {
                return { status: 0, error: 'User not authenticated' };
            }
            const comments = await this.commentsService.findAllByTaskId(taskId, userId, filter);
            return {
                ...comments,
                data: comments.data.map(c => ({
                    ...c,
                    isCreated: c.userId === userId
                }))
            };
    }

    @ApiOperation({ summary: 'Trả lời bình luận' })
    @ApiParam({ name: 'id', description: 'The document ID' })
    @ApiParam({ name: 'commentId', description: 'The comment ID being replied' })
    @Post('task/:id/comments/:commentId/reply')
    async replyCommentForTask(
        @Param('id') taskId: string,
        @Param('commentId') commentId: string,
        @Body() dto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }

        if (!dto.content) {
            return { status: 0, error: 'nội dung là bắt buộc' };
        }
        const reply = await this.commentsService.replyCommentForTask(dto, taskId, commentId, userId);

        return { status: 1, message: 'Đã trả lời bình luận', data: reply };
    }

    @ApiOperation({ summary: 'Cập nhật 1 bình luận với id' })
    @ApiParam({ name: 'commentId', description: 'The comment ID' })
    @ApiBearerAuth()
    @Put('task/:commentId')
    async updateCommentForTask(
        @Query('id') taskId: string,
        @Param('commentId') commentId: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        const comment = await this.commentsService.findOne(commentId);
       
        if (comment?.createdAt ) {
            const createdAt = new Date(comment.createdAt);
            const newDate = new Date();
            const diff = newDate.getTime() - createdAt.getTime();
            const FIVE_MINUTES = 5 * 60 * 1000;
            if (diff > FIVE_MINUTES) {
                return { status: 0, error: 'Không có quyền cập nhật bình luận này.' };
            }
        }
        const updatedComment = await this.commentsService.updateCommentForTask(taskId, commentId, updateCommentDto.content, userId);

        if (!updatedComment) {
            return { status: 0, error: 'Không tìm thấy bình luận để cập nhật.' };
        }

        return { status: 1, message: 'Đã cập nhật bình luận', data: {...updatedComment, isEdited: true, } };
    }

    @ApiOperation({ summary: 'Xóa một bình luận' })
    @ApiParam({ name: 'commentId', description: 'Comment ID to delete' })
    @ApiBearerAuth()
    @Delete('task/:commentId')
    async deleteCommentForTask(@Param('commentId') commentId: string, @Req() req: any){
        const userId = req.user?.userId;
        const comment = await this.commentsService.findOne(commentId);
        if (comment?.userId && userId !== comment.userId) {
            return { status: 0, error: 'Không có quyền xóa bình luận này.' };
        }
        const deleted = await this.commentsService.deleteCommentAndReplies(commentId);
        if (!deleted) {
            return { status: 0, error: 'Không tìm thấy bình luận để xoá.' };
        }
        return { status: 1, message: 'Đã xóa bình luận' };
    }

    @ApiOperation({ summary: 'Thích or bỏ thích bình luận' })
    @ApiParam({ name: 'commentId', description: 'Comment ID to delete' })
    @ApiBearerAuth()
    @Put('task/:commentId/like')
    async likeCommentForTask(@Param('commentId') commentId: string, @Req() req: any, @Query('type') type: string, @Query('taskId') taskId: string ) {
        if (!commentId && req.user?.userId) {
            return { status: 0, error: 'Thiếu thông tin commentId và người dùng.' };
        }
        const result = await this.commentsService.likeCommentForTask(commentId, req.user?.userId, type, taskId);
        if (!result) {
            return { status: 0, error: 'Không tìm thấy bình luận để xoá.', length: 0 };
        }
        return {
            status: 1,
            message: 'Like hoặc bỏ like bình luận thành công',
            length: result.length,
            likes: result.likes,
            likedUsers: result.likedUsers,
        };
    }

    // ----- Bình luận trong lịch họp -----
    @ApiOperation({ summary: 'Thêm một bình luận vào lịch họp' })
    @ApiParam({ name: 'id', description: 'The meeting task ID' })
    @ApiBearerAuth()
    @Post('meeting-task/:id/comments')
    createCommentForMeetingTask(
        @Param('id') meetingTaskId: string,
        @Body() createCommentDto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        return this.commentsService.createCommentForMeetingTask(meetingTaskId, createCommentDto, userId);
    }

    @ApiOperation({ summary: 'Lấy danh sách tất cả ý kiến của 1 lịch họp' })
    @ApiParam({ name: 'id', description: 'The meeting task ID' })
    @ApiBearerAuth()
    @Get('meeting-task/:id/comments')
    findAllCommentForMeetingTask(
        @Param('id') meetingTaskId: string, 
        @Req() req: any) {
            const userId = req.user?.userId;
            if (!userId) {
                return { status: 0, error: 'User not authenticated' };
            }
            return this.commentsService.findAllByMeetingTaskId(meetingTaskId, userId);
    }

    @ApiOperation({ summary: 'Trả lời bình luận' })
    @ApiParam({ name: 'id', description: 'The meeting task ID' })
    @ApiParam({ name: 'commentId', description: 'The comment ID being replied' })
    @Post('meeting-task/:id/comments/:commentId/reply')
    async replyCommentForMeetingTask(
        @Param('id') meetingTaskId: string,
        @Param('commentId') commentId: string,
        @Body() dto: CreateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }

        if (!dto.content) {
            return { status: 0, error: 'nội dung là bắt buộc' };
        }
        const reply = await this.commentsService.replyCommentForMeetingTask(dto, meetingTaskId, commentId, userId);

        return { status: 1, message: 'Đã trả lời bình luận', data: reply };
    }

    @ApiOperation({ summary: 'Cập nhật 1 bình luận với id' })
    @ApiParam({ name: 'commentId', description: 'The comment ID' })
    @ApiBearerAuth()
    @Put('meeting-task/:commentId')
    async updateCommentForMeetingTask(
        @Query('id') meetingTaskId: string,
        @Param('commentId') commentId: string,
        @Body() updateCommentDto: UpdateCommentDto,
        @Req() req: any,
    ) {
        const userId = req.user?.userId;
        if (!userId) {
            return { status: 0, error: 'User not authenticated' };
        }
        const updatedComment = await this.commentsService.updateCommentForMeetingTask(meetingTaskId, commentId, updateCommentDto.content, userId);

        if (!updatedComment) {
            return { status: 0, error: 'Không tìm thấy bình luận để cập nhật.' };
        }

        return { status: 1, message: 'Đã cập nhật bình luận', data: updatedComment };
    }

    @ApiOperation({ summary: 'Xóa một bình luận' })
    @ApiParam({ name: 'commentId', description: 'Comment ID to delete' })
    @ApiBearerAuth()
    @Delete('meeting-task/:commentId')
    async deleteCommentForMeetingTask(@Param('commentId') commentId: string) {
        const deleted = await this.commentsService.deleteCommentAndReplies(commentId);
        if (!deleted) {
            return { status: 0, error: 'Không tìm thấy bình luận để xoá.' };
        }
        return { status: 1, message: 'Đã xóa bình luận' };
    }

    @ApiOperation({ summary: 'Thích or bỏ thích bình luận' })
    @ApiParam({ name: 'commentId', description: 'Comment ID to delete' })
    @ApiBearerAuth()
    @Put('meeting-task/:commentId/like')
    async likeCommentForMeetingTask(
        @Param('commentId') commentId: string, 
        @Req() req: any, 
        @Query('type') type: string, 
        @Query('taskId') meetingTaskId: string
    ) {
        if (!commentId && req.user?.userId) {
            return { status: 0, error: 'Thiếu thông tin commentId và người dùng.' };
        }
        const result = await this.commentsService.likeCommentForMeetingTask(commentId, req.user?.userId, type, meetingTaskId);
        if (!result) {
            return { status: 0, error: 'Không tìm thấy bình luận để xoá.', length: 0 };
        }
        return {
            status: 1,
            message: 'Like hoặc bỏ like bình luận thành công',
            length: result.length,
            likes: result.likes,
            likedUsers: result.likedUsers,
        };
    }

}
