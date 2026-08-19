import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig';

export const useNewsSocket = (newsId, user) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!newsId) return;

        socketRef.current = getSocket('/news');
        const socket = socketRef.current;

        const onConnect = () => {
            setIsConnected(true);
            socket.emit('joinNewsRoom', { newsId: Number(newsId) });
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
            socket.emit('leaveNewsRoom', { newsId: Number(newsId) });
        };
    }, [newsId, user]);

    const sendComment = (content) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('addComment', { newsId: Number(newsId), content });
            return true;
        }
        return false;
    };

    const toggleLike = (action) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('toggleLike', { newsId: Number(newsId), action });
            return true;
        }
        return false;
    };

    const onEvent = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
            return () => socketRef.current.off(event, callback);
        }
    };

    return {
        isConnected,
        sendComment,
        toggleLike,
        onEvent,
        socket: socketRef.current
    };
};
