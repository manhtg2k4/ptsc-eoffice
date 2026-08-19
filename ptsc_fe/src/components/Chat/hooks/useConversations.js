import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import { useToast } from '@components/common/ToastProvider';

const AI_CONVERSATION = {
  id: 'ai-chatbot',
  userId: 'ai-assistant',
  userName: 'Life AI',
  userAvatar: "🤖",
  lastMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
  lastMessageTime: new Date().toISOString(),
  unreadCount: 0,
  isOnline: true,
  isAI: true,
};
const PAGE_SIZE = 30;
export const useConversations = (currentUserId) => {
	const toast = useToast();
  const [conversations, setConversations] = useState([]);
  /* ================= USERS (ĐỒNG NGHIỆP) ================= */
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  ////////////////////////////////////////////////////
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchSimpleUsers = useCallback(
    async ({ q = "" }) => {
      setSearchLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${APP_BASE}/api/users/simple-users`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { q },
        });

        setSearchUsers(res.data?.data ?? []);
      } catch (err) {
        setSearchUsers([]);
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );
  ///////////////////////////////////////////////////
  const fetchConversations = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${APP_BASE}/api/conversations`,
        {
          params: { userId: currentUserId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const apiData = response.data.data;

      const mappedConversations = apiData.map((conv) => {
        const isGroup = conv.type === "group";

        let otherUser = null;
        let displayName = conv.name || "Nhóm chat";
        let displayAvatar = conv.avatar || null;

        if (!isGroup && conv.members?.length) {
          otherUser = conv.members.find(
            (m) => m._id !== currentUserId
          );

          if (otherUser) {
            displayName = otherUser.name;
            displayAvatar = otherUser.avatar?.[0] || null;
          }
        }

        // const unreadCount =
        //   conv.memberStates?.find(
        //     (s) => s.userId === currentUserId
        //   )?.unread
        //     ? 1
        //     : 0;

        return {
          id: conv._id,
          userId: isGroup ? conv._id : otherUser?._id,
          userName: displayName,
          userAvatar: displayAvatar,
          lastMessage:
            conv.lastMessagePreview || "Bắt đầu trò chuyện mới",
          lastMessageTime:
            conv.lastMessageAt || conv.createdAt,
          // unreadCount,
          isOnline: false,
          isAI: false,
          type: conv.type,
          members: conv.members,
        };
      });

      setConversations(mappedConversations);
    } catch (err) {
      setConversations([]);
    }
  }, [currentUserId]);

  const fetchUsers = useCallback(
		async (page = 1) => {
			try {
				const token = localStorage.getItem("token");
      	if (!token || !currentUserId) return;

      	const res = await axios.get(
        	`${APP_BASE}/api/users/simple-users`,
        	{
          	headers: { Authorization: `Bearer ${token}` },
          	params: {
            	page,
            	limit: PAGE_SIZE,
            	excludeSelf: currentUserId,
          	},
        	}
      	);

      	const list = (res.data?.data || []).map(u => ({
          ...u,
          id: u._id || u.id
        }));

      	setUsers((prev) => (page === 1 ? list : [...prev, ...list]));
      	// setHasMoreUsers(list.length === PAGE_SIZE);
      	const total = res.data.total;
      	if (typeof total === "number") {
        	setHasMoreUsers(page * PAGE_SIZE < total);
      	}else {
        	setHasMoreUsers(list.length > 0);
      	}
      	setUserPage(page + 1);
				} catch (error) {
					logger.log("Lỗi khi tải danh sách người dùng!", error)
					toast("Lỗi khi tải danh sách người dùng!", "error")
				}
    	},[currentUserId, toast]
  );

  useEffect(() => {
    if (!currentUserId) return;
    setUsers([]);
    setUserPage(1);
    setHasMoreUsers(true);

    fetchConversations();
    fetchUsers(1);
  }, [currentUserId, fetchConversations, fetchUsers]);
//////////////
  const loadMoreUsers = useCallback(async () => {
    if (loadingUsers || !hasMoreUsers) return;

    setLoadingUsers(true);
    try {
      await fetchUsers(userPage);
    } finally {
      setLoadingUsers(false);
    }
  }, [fetchUsers, userPage, hasMoreUsers, loadingUsers]);
/////////////
  const createConversation = useCallback(async (user) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${APP_BASE}/api/conversations`,
        {
          userId: currentUserId,
          type: "direct",
          memberIds: [currentUserId, user.id],
          name: null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const conv = response.data.data;
      const convId = conv._id || conv.id;

      const newConv = {
        id: convId,
        userId: user.id || user._id,
        userName: user.name,
        userAvatar: user.avatar || null,
        lastMessage: "Bắt đầu trò chuyện mới",
        lastMessageTime: conv.createdAt,
        unreadCount: 0,
        isOnline: user.isOnline || false,
        isAI: false,
        type: "direct",
        members: conv.members,
      };

      setConversations(prev => {
        const exists = prev.find(c => c.id === newConv.id);
        if (exists) return prev;
        return [newConv, ...prev];
      });

      return newConv;
    } catch (error) {
      if (error.response?.data?.message?.includes("đã tồn tại") || error.response?.data?.status === 0) {
        const targetUserId = user.id || user._id;
        const existing = conversations.find(c => 
          c.type === "direct" && 
          c.members?.some(m => (m._id || m.id) === targetUserId)
        );
        if (existing) return existing;
      }
      // console.error("Lỗi khi tạo cuộc hội thoại:", error);
      return null;
    }
  }, [currentUserId, conversations]);

  const updateConversationLastMessage = useCallback((convId, lastMessage, lastMessageTime) => {
    setConversations(prev => prev.map(c => 
      c.id === convId 
        ? {
            ...c,
            lastMessage,
            lastMessageTime,
          }
        : c
    ));
  }, []);

  const clearUnreadCount = useCallback((convId) => {
    setConversations(prev => prev.map(c => 
      c.id === convId ? {...c, unreadCount: 0} : c
    ));
  }, []);

  const findConversation = useCallback((userId, isAI = false) => {
    return conversations.find(
      (conv) => conv.userId === userId && conv.isAI === isAI
    );
  }, [conversations]);

  const createGroupConversation = useCallback(
    async ({ name, avatar, backgroundImage, memberIds }) => {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${APP_BASE}/api/conversations`,
        {
          userId: currentUserId,
          name,
          type: "group",
          avatar,
          backgroundImage,
          memberIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const conv = res.data.data;

      const newConv = {
        id: conv._id,
        userId: conv._id, // group → dùng id
        userName: conv.name,
        userAvatar: conv.avatar || null,
        lastMessage: "Nhóm chat vừa được tạo",
        lastMessageTime: conv.createdAt,
        unreadCount: 0,
        isOnline: false,
        isAI: false,
        type: "group",
        members: conv.members,
      };

      setConversations((prev) => [
        prev[0], // AI chat
        ...prev.slice(1),
        newConv,
      ]);

      return newConv;
    },
    [currentUserId]
  );

  // const deleteConversation = useCallback(
  //   async (conversationId) => {
  //     const token = localStorage.getItem("token");

  //     await axios.delete(
  //       `${APP_BASE}/api/conversations/${conversationId}`,
  //       {
  //         data: {
  //           userId: currentUserId,
  //         },
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     setConversations((prev) =>
  //       prev.filter((c) => c.id !== conversationId)
  //     );
  //   },
  //   [currentUserId]
  // );
const mapConversation = (conv, currentUserId) => {
  const isGroup = conv.type === "group";

  let otherUser = null;
  let displayName = conv.name || "Nhóm chat";
  let displayAvatar = conv.avatar || null;

  if (!isGroup && conv.members?.length) {
    otherUser = conv.members.find(m => m._id !== currentUserId);
    if (otherUser) {
      displayName = otherUser.name;
      displayAvatar = otherUser.avatar?.[0] || null;
    }
  }

  return {
    id: conv._id,
    userId: isGroup ? conv._id : otherUser?._id,
    userName: displayName,
    userAvatar: displayAvatar,
    lastMessage: conv.lastMessagePreview || "Bắt đầu trò chuyện mới",
    lastMessageTime: conv.lastMessageAt || conv.createdAt,
    isOnline: false,
    isAI: false,
    type: conv.type,
    members: conv.members,
  };
};

const searchConversations = useCallback(
  async ({ search = "", skip = 0, limit = 20 }) => {
    const token = localStorage.getItem("token");
    if (!token || !currentUserId) return [];

    const res = await axios.get(`${APP_BASE}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userId: currentUserId, skip, limit, search },
    });

    const list = res.data?.data || [];

    return list.map(conv => mapConversation(conv, currentUserId));
  },
  [currentUserId]
);


  const deleteConversation = useCallback(
    async (conversationId) => {
      const token = localStorage.getItem("token");

      await axios.delete(
        `${APP_BASE}/api/conversations/${conversationId}/hard`,
        {
          data: { userId: currentUserId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
    },
    [currentUserId]
  );

  return {
    conversations,
    users,
    setConversations,
    createConversation,
    createGroupConversation,
    updateConversationLastMessage,
    deleteConversation,
    clearUnreadCount,
    findConversation,
    AI_CONVERSATION,
    fetchConversations,
    loadMoreUsers,
    hasMoreUsers,
    loadingUsers,
    searchUsers,
    searchLoading,
    searchSimpleUsers,
    searchConversations,
  };
};