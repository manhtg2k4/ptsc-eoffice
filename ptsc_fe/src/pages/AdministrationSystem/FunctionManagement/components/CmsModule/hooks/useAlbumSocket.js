import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@pages/AdministrationSystem/FunctionManagement/components/CmsModule/components/EnvironmentFile/urlConfig';

export const useAlbumSocket = (albumId, user) => {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!albumId) return;

        socketRef.current = getSocket('/album');
        const socket = socketRef.current;

        const onConnect = () => {
            setIsConnected(true);
            socket.emit('joinAlbumRoom', { albumId: albumId });
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
            socket.emit('leaveAlbumRoom', { albumId: albumId });
            // Note: We don't disconnect here because getSocket manages the singleton/shared instance
        };
    }, [albumId, user]);

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

export const useNotificationSocket = (filterKey = 'NEWS_CALENDAR_TAG') => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [total, setTotal] = useState(0);
    const socketRef = useRef(null);

    const fetchNotifications = (page = 1, limit = 10, key = filterKey) => {
        if (socketRef.current) {
            socketRef.current.emit('fetchNotifications', { page, limit, key });
        }
    };

    useEffect(() => {
        // We pass query as part of extraOptions. 
        // Note: For now, if connection already exists, it returns it. 
        // If we need to reconnect on filterKey change, we might need to handle it.
        // Actually, we can just ensure we use getSocket with the correct parameters.
        socketRef.current = getSocket('/notifications', {
            query: {
                key: filterKey,
                page: 1
            }
        });
        const socket = socketRef.current;

        // If the socket was already connected but with a DIFFERENT query, 
        // we might need to disconnect and reconnect. 
        // But for simplicity, we assume one notification socket per user session for now.
        // If filterKey is critical, maybe we should disconnect it manually here if it's already there.

        const onNotificationList = (data) => {
            // logger.log('🔔 Real-time notifications updated:', data.data);
            setNotifications(data.data || []);
            setTotal(data.total || 0);
            setUnreadCount(data.unreadCount || 0);
        };

        socket.on('notificationList', onNotificationList);
        
        // Initial fetch if connected
        if (socket.connected) {
            fetchNotifications();
        } else {
            socket.on('connect', () => fetchNotifications());
        }

        return () => {
            socket.off('notificationList', onNotificationList);
            socket.off('connect');
        };
    }, [filterKey]); 

    return {
        notifications,
        unreadCount,
        total,
        fetchNotifications,
        socket: socketRef.current
    };
};
