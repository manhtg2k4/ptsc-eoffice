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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { extractSocketToken } from '../utils/socket.util';

import { verifyKeycloakToken } from '../utils/keycloak-verify';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
    namespace: `${process.env.SOCKET_PATH || ''}/album`,
    path: `/socket.io`,
})
export class AlbumGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('AlbumGateway');

    constructor(private readonly jwtService: JwtService) { }

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
                this.logger.error(`🔴 Lỗi xác thực WebSocket Album: ${error.message}`);
                next(new Error('Authentication error'));
            }
        });
    }

    async handleConnection(client: Socket) {
        try {
            const userId = client.data.userId;
            if (!userId) throw new Error('Invalid token payload');

            await client.join(userId);

        } catch (error) {
            this.logger.error(`🔴 Lỗi trong handleConnection Album (${client.id}): ${error.message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.warn(`🔌 Client ngắt kết nối Album: id=${client.id}, UserID=${client.data?.userId || 'N/A'}`);
    }

    // Emit khi có like/dislike album
    emitAlbumLikeUpdate(albumId: string, data: any) {
        this.server.to(`album_${albumId}`).emit('albumLikeUpdate', {
            albumId,
            ...data,
        });
    }

    @SubscribeMessage('joinAlbumRoom')
    handleJoinAlbumRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { albumId: string },
    ) {
        const roomName = `album_${data.albumId}`;
        client.join(roomName);
        return { success: true, message: `Joined room ${roomName}` };
    }

    @SubscribeMessage('leaveAlbumRoom')
    handleLeaveAlbumRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { albumId: string },
    ) {
        const roomName = `album_${data.albumId}`;
        client.leave(roomName);
        return { success: true, message: `Left room ${roomName}` };
    }
}
