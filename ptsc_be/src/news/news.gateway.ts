import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { extractSocketToken } from '../utils/socket.util';
import { NewsService } from './news.service';
import { verifyKeycloakToken } from '../utils/keycloak-verify';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
    namespace: `${process.env.SOCKET_PATH || ''}/news`,
    path: `/socket.io`,
})
export class NewsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('NewsGateway');

    constructor(
        private readonly jwtService: JwtService,
        @Inject(forwardRef(() => NewsService))
        private readonly newsService: NewsService,
    ) { }

    afterInit(server: Server) {
        server.use(async (socket: Socket, next) => {
            try {
                let token = extractSocketToken(socket);
                if (!token && socket.handshake.headers.cookie) {
                    const cookies = socket.handshake.headers.cookie.split('; ');
                    const tokenCookie = cookies.find((c) => c.startsWith('tokenUser=') || c.startsWith('token='));
                    if (tokenCookie) token = tokenCookie.split('=')[1];
                }

                if (!token) {
                    return next(new Error('Authentication error: Missing token'));
                }

                const payload: any = await verifyKeycloakToken(token);

                const userId = payload.sub || payload.user || payload.userId || payload.id;
                if (!userId) throw new Error('Invalid token payload');

                socket.data.userId = userId;
                next();
            } catch (error) {
                this.logger.error(`🔴 Lỗi xác thực WebSocket: ${error.message}`);
                next(new Error('Authentication error'));
            }
        });
    }

    async handleConnection(client: Socket) {
        try {
            const userId = client.data.userId;
            if (!userId) throw new Error('Invalid token payload');

            // Lưu userId vào client và join room
            client.data.userId = userId;
            await client.join(userId);

        } catch (error) {
            this.logger.error(`🔴 Lỗi trong handleConnection News (${client.id}): ${error.message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.warn(`🔌 Client ngắt kết nối News: id=${client.id}, UserID=${client.data?.userId || 'N/A'}`);
    }

    // Emit khi có comment mới
    emitNewComment(newsId: number, comment: any) {
        this.server.to(`news_${newsId}`).emit('newComment', {
            newsId,
            comment,
        });
    }

    // Emit khi có comment được cập nhật
    emitUpdateComment(newsId: number, comment: any) {
        this.server.to(`news_${newsId}`).emit('updateComment', {
            newsId,
            comment,
        });
    }

    // Emit khi có comment bị xóa
    emitDeleteComment(newsId: number, commentId: number) {
        this.server.to(`news_${newsId}`).emit('deleteComment', {
            newsId,
            commentId,
        });
    }

    // Emit khi có like/dislike
    emitLikeUpdate(newsId: number, data: any) {

        const payload = {
            newsId,
            ...data,
        };

        // Emit tới room cụ thể của news
        const roomName = `news_${newsId}`;
        this.server.to(roomName).emit('likeUpdate', payload);

        // ALSO broadcast to ALL connected clients (để đảm bảo realtime)
        this.server.emit('likeUpdate', payload);
    }

    // Emit khi có comment được like/dislike
    emitCommentLikeUpdate(newsId: number, commentId: number, data: any) {
        this.server.to(`news_${newsId}`).emit('commentLikeUpdate', {
            newsId,
            commentId,
            ...data,
        });
    }

    @SubscribeMessage('likeNews')
    async handleLikeNews(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { type: string; objectId: number; isLike?: boolean },
    ) {
        const userId = client.data.userId;
        if (!userId) {
            this.logger.warn(`❌ Like attempt without userId from client ${client.id}`);
            client.emit('error', { message: 'Bạn cần đăng nhập để thực hiện hành động này' });
            return;
        }

        try {

            // Verify token để lấy thông tin user tin cậy
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) throw new Error('Unauthorized');

            const userFromJwt = await verifyKeycloakToken(token);

            // Gọi service để xử lý (Service này đã có code emit socket tới các client khác)
            const result = await this.newsService.likeNewsOrComment(payload, userFromJwt);


            // Trả về kết quả cho chính người gửi
            client.emit('likeUpdated', result);
        } catch (error) {
            this.logger.error(`❌ Error processing like: ${error.message}`);
            client.emit('error', { message: error.message });
        }
    }

    @SubscribeMessage('toggleLike')
    handleToggleLike(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { newsId: number; action: 'like' | 'unlike' },
    ) {
        const userId = client.data.userId;

        if (!payload.newsId || !['like', 'unlike'].includes(payload.action)) {
            client.emit('error', { message: 'Dữ liệu like không hợp lệ' });
            return;
        }

        const roomName = `news_${payload.newsId}`;

        // Giả lập: tính số lượt thích mới (thực tế bạn nên dùng DB để đếm chính xác)
        // Ví dụ: gọi service like/unlike và lấy tổng likesCount
        const likesCount = payload.action === 'like' ? 10 : 9; // giả lập

        this.server.to(roomName).emit('likeUpdate', {
            newsId: payload.newsId,
            likesCount,
            userId, // optional: ai vừa like
            action: payload.action,
        });


        client.emit('likeUpdated', { success: true, likesCount });
    }

    // Subscribe vào room của một tin tức cụ thể
    @SubscribeMessage('addComment')
    handleAddComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { newsId: number; content: string },
    ) {
        const userId = client.data.userId;

        if (!payload.newsId || !payload.content?.trim()) {
            client.emit('error', { message: 'Thiếu newsId hoặc nội dung bình luận' });
            this.logger.warn(`Invalid addComment from ${client.id}: missing fields`);
            return;
        }

        if (!Number.isInteger(payload.newsId) || payload.newsId <= 0) {
            client.emit('error', { message: 'newsId không hợp lệ' });
            return;
        }

        // Tạo object comment (bạn có thể thay bằng lưu vào DB thật)
        const comment = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
            authorId: userId,
            author: `User_${userId?.substring(0, 8) || 'Ẩn danh'}`,
            content: payload.content.trim(),
            createdAt: new Date().toISOString(),
            // avatar?: string; // nếu có
        };

        const roomName = `news_${payload.newsId}`;

        // Gửi cho **tất cả** client trong phòng (bao gồm cả người gửi nếu muốn)
        this.server.to(roomName).emit('newComment', {
            newsId: payload.newsId,
            comment,
        });


        // Optional: trả về cho người gửi để hiển thị ngay (optimistic UI)
        client.emit('commentSent', { success: true, comment });
    }

    @SubscribeMessage('joinNewsRoom')
    handleJoinNewsRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { newsId: number },
    ) {
        const roomName = `news_${data.newsId}`;
        client.join(roomName);
        return { success: true, message: `Joined room ${roomName}` };
    }

    // Leave room của tin tức
    @SubscribeMessage('leaveNewsRoom')
    handleLeaveNewsRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { newsId: number },
    ) {
        const roomName = `news_${data.newsId}`;
        client.leave(roomName);
        return { success: true, message: `Left room ${roomName}` };
    }
}
