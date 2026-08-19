import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { verifyKeycloakToken } from '../utils/keycloak-verify';
import { extractSocketToken } from '../utils/socket.util';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
    namespace: `${process.env.SOCKET_PATH || ''}/videos`,
    path: `/socket.io`,
})
export class VideoGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('VideoGateway');

    constructor(private readonly jwtService: JwtService) { }

    afterInit(server: Server) {
    }

    async handleConnection(client: Socket) {
        try {
            const token = extractSocketToken(client);

            if (!token) {
                client.disconnect(true);
                return;
            }

            let tokenUser = client.handshake.headers['token'] as string || client.handshake.auth?.token;
      
            if (!tokenUser && client.handshake.headers.cookie) {
              const cookies = client.handshake.headers.cookie.split('; ');
              const tokenCookie = cookies.find((c) => c.startsWith('tokenUser=') || c.startsWith('token='));
              if (tokenCookie) {
                tokenUser = tokenCookie.split('=')[1];
              }
            }

            const payload = await verifyKeycloakToken(tokenUser || token);
            client.data.user = payload;

            const userId = payload.sub || payload.user || payload.userId || payload.id;
            if (!userId) throw new Error('Invalid token payload');

            client.data.userId = userId;
            await client.join(userId);

        } catch (error) {
            this.logger.error(`🔴 Lỗi trong handleConnection Video (${client.id}): ${error.message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.warn(`🔌 Client ngắt kết nối Video: id=${client.id}, UserID=${client.data?.userId || 'N/A'}`);
    }

    // Emit khi có like/dislike video
    emitVideoLikeUpdate(videoId: string, data: any) {
        this.server.to(`video_${videoId}`).emit('videoLikeUpdate', {
            videoId,
            ...data,
        });
    }

    @SubscribeMessage('joinVideoRoom')
    handleJoinVideoRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { videoId: string },
    ) {
        const roomName = `video_${data.videoId}`;
        client.join(roomName);
        return { success: true, message: `Joined room ${roomName}` };
    }

    @SubscribeMessage('leaveVideoRoom')
    handleLeaveVideoRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { videoId: string },
    ) {
        const roomName = `video_${data.videoId}`;
        client.leave(roomName);
        return { success: true, message: `Left room ${roomName}` };
    }
}
