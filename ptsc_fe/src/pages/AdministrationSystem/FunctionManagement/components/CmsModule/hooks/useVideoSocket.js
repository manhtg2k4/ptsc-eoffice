import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig';

export const useVideoSocket = (videoId, user) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!videoId) return;

        socketRef.current = getSocket('/videos');
        const socket = socketRef.current;

        const onConnect = () => {
            setIsConnected(true);
            socket.emit('joinVideoRoom', { videoId: videoId });
        };

        const onDisconnect = () => {
            setIsConnected(false);
        };

        if (socket.connected) {
            onConnect();
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.emit('leaveVideoRoom', { videoId: videoId });
        };
    }, [videoId, user]);

    const onEvent = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
            return () => socketRef.current.off(event, callback);
        }
    };

    return {
        isConnected,
        onEvent,
        socket: socketRef.current
    };
};
