
// import { useState, useCallback, useRef } from "react";
// import axios from "axios";
// import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

// export const useChatMessages = (currentUserId) => {
//   const [conversationMessages, setConversationMessages] = useState({});
//   const [paging, setPaging] = useState({});
//   const loadingRef = useRef({});
//   const openedRef = useRef(new Set());

//   /* ================= MAP API MESSAGE ================= */
//   const mapApiMessage = useCallback((msg) => {
//     const base = {
//       id: msg._id,
//       senderId: msg.sender.id,
//       senderName: msg.sender.name,      // ✅ THÊM
//       senderAvatar: msg.sender.avatar?.[0] || null, // ✅ optional
//       createdAt: msg.time.sentAt,
//     };

//     const results = [];
//     if (msg.content?.trim()) {
//       results.push({
//         ...base,
//         id: `${msg._id}_text`,
//         type: "text",
//         content: msg.content,
//       });
//     }
//     if (Array.isArray(msg.data)) {
//       msg.data.forEach((a, i) => {
//         let url = a.attachFile;
//         if (url && !url.startsWith("http")) {
//           url = `${APP_BASE}/api/files/download/${url}`;
//         }

//         results.push({
//           ...base,
//           id: `${msg._id}_file_${i}`,
//           type: a.type?.startsWith("image/")
//             ? "image"
//             : a.type?.startsWith("video/")
//             ? "video"
//             : "file",
//           content: a.name || a.file_name,
//           url,
//           alt: a.name,
//         });
//       });
//     }

//     if (results.length === 0) {
//       results.push({
//         ...base,
//         id: `${msg._id}_empty`,
//         type: "text",
//         content: "",
//       });
//     }

//     return results;
//   }, []);

//   /* ================= FETCH MESSAGES ================= */
//   const fetchMessages = useCallback(
//     async (conversationId, skip = 0, limit = 20) => {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`${APP_BASE}/api/api/messages`, {
//         headers: { Authorization: `Bearer ${token}` },
//         params: { conversationId, skip, limit, userId: currentUserId },
//       });

//       if (res.data?.status !== 1) {
//         throw new Error("Fetch messages failed");
//       }

//       return {
//         messages: res.data.data.flatMap(mapApiMessage),
//         count: res.data.count,
//       };
//     },
//     [mapApiMessage]
//   );

//   /* ================= LOAD FIRST (TIN MỚI NHẤT) ================= */
//   const loadFirstMessages = useCallback(async (convId) => {
//     // if (openedRef.current.has(convId)) return;

//     const limit = 20;

//     const { messages, count } = await fetchMessages(convId, 0, limit);

//     // 🔥 API trả DESC → đảo lại ASC
//     const ordered = [...messages];

//     setConversationMessages((prev) => ({
//       ...prev,
//       [convId]: ordered,
//     }));

//     setPaging((prev) => ({
//       ...prev,
//       [convId]: {
//         skip: messages.length,
//         limit,
//         count,
//         hasMore: messages.length < count,
//         loading: false,
//       },
//     }));

//     openedRef.current.add(convId);
//   }, [fetchMessages]);

//   /* ================= LOAD MORE (TIN CŨ) ================= */
//   const loadMoreMessages = useCallback(
//     async (convId) => {
//       const state = paging[convId];
//       if (!state) return;

//       if (loadingRef.current[convId]) return;
//       if (!state.hasMore) return;
//       if (state.skip >= state.count) return;

//       loadingRef.current[convId] = true;

//       setPaging((p) => ({
//         ...p,
//         [convId]: { ...state, loading: true },
//       }));

//       try {
//         const { messages, count } = await fetchMessages(
//           convId,
//           state.skip,
//           state.limit
//         );

//         if (messages.length === 0) {
//           setPaging((p) => ({
//             ...p,
//             [convId]: { ...state, hasMore: false, loading: false },
//           }));
//           return;
//         }

//         // 🔥 messages đang DESC → đảo lại
//         const ordered = [...messages];

//         setConversationMessages((prev) => ({
//           ...prev,
//           [convId]: [...ordered, ...(prev[convId] || [])],
//         }));

//         const newSkip = state.skip + messages.length;

//         setPaging((p) => ({
//           ...p,
//           [convId]: {
//             ...state,
//             skip: newSkip,
//             count,
//             hasMore: newSkip < count,
//             loading: false,
//           },
//         }));
//       } finally {
//         loadingRef.current[convId] = false;
//       }
//     },
//     [fetchMessages, paging]
//   );

//   /* ================= ADD MESSAGE (SOCKET / SEND) ================= */
//   const addMessage = useCallback((convId, message) => {
//     setConversationMessages((prev) => ({
//       ...prev,
//       [convId]: [...(prev[convId] || []), message],
//     }));
//   }, []);

//   const addMessages = useCallback((convId, messages) => {
//     setConversationMessages((prev) => ({
//       ...prev,
//       [convId]: [...(prev[convId] || []), ...messages],
//     }));
//   }, []);

//   /* ================= CLEANUP ================= */
//   const clearMessages = useCallback((convId) => {
//     setConversationMessages((prev) => {
//       const next = { ...prev };
//       delete next[convId];
//       return next;
//     });

//     setPaging((prev) => {
//       const next = { ...prev };
//       delete next[convId];
//       return next;
//     });

//     openedRef.current.delete(convId);
//   }, []);

//   const removeTypingMessage = useCallback((convId) => {
//     setConversationMessages((prev) => ({
//       ...prev,
//       [convId]: (prev[convId] || []).filter((m) => !m.isTyping),
//     }));
//   }, []);

//   /* ================= SEND MESSAGE (REST – fallback) ================= */
//   const sendMessage = useCallback(
//     async (convId, content, files = []) => {
//       const token = localStorage.getItem("token");
//       const payload = {
//         conversationId: convId,
//         content,
//         sendId: currentUserId,
//         type: 1,
//         data: files.map((f) => ({
//           attachFile: f.url,
//           name: f.name,
//           size: f.size,
//           type: f.type,
//         })),
//       };

//       const res = await axios.post(
//         `${APP_BASE}/api/api/messages`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       return mapApiMessage(res.data.data);
//     },
//     [currentUserId, mapApiMessage]
//   );

//   return {
//     conversationMessages,
//     paging,

//     loadFirstMessages,
//     loadMoreMessages,

//     addMessage,
//     addMessages,
//     removeTypingMessage,
//     clearMessages,
//     sendMessage,
//     mapApiMessage,
//   };
// };
import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

export const useChatMessages = (currentUserId) => {
  const [conversationMessages, setConversationMessages] = useState({});
  const [paging, setPaging] = useState({});
  const loadingRef = useRef({});
  const openedRef = useRef(new Set());

  /* ================= MAP API MESSAGE ================= */
  const mapApiMessage = useCallback((msg) => {
    // 🔥 FIX: API dùng 'id' chứ không phải '_id'
    const messageId = msg.id || msg._id;
    
    if (!messageId) {
      // console.warn('⚠️ Message missing id:', msg);
    }

    const base = {
      id: messageId,
      senderId: msg.sender?.id || msg.sender,
      senderName: msg.sender?.name || 'Unknown',
      senderAvatar: msg.sender?.avatar?.[0] || null,
      createdAt: msg.time?.sentAt || msg.createdAt || new Date().toISOString(),
    };

    const results = [];
    
    // Text content
    if (msg.content?.trim()) {
      results.push({
        ...base,
        id: `${messageId}_text`,
        type: "text",
        content: msg.content,
      });
    }
    
    // File attachments
    if (Array.isArray(msg.data) && msg.data.length > 0) {
      msg.data.forEach((a, i) => {
        let url = a.attachFile;
        if (url && !url.startsWith("http")) {
          url = `${APP_BASE}/api/files/download/${url}`;
        }

        results.push({
          ...base,
          id: `${messageId}_file_${i}`,
          type: a.type?.startsWith("image/")
            ? "image"
            : a.type?.startsWith("video/")
            ? "video"
            : "file",
          content: a.name || a.file_name,
          url,
          alt: a.name,
        });
      });
    }

    // Empty message fallback
    if (results.length === 0) {
      results.push({
        ...base,
        id: `${messageId}_empty`,
        type: "text",
        content: "",
      });
    }

    return results;
  }, []);

  /* ================= FETCH MESSAGES ================= */
  const fetchMessages = useCallback(
    async (conversationId, skip = 0, limit = 20) => {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${APP_BASE}/api/api/messages`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { conversationId, skip, limit, userId: currentUserId },
      });

      if (res.data?.status !== 1) {
        throw new Error("Fetch messages failed");
      }

      return {
        messages: res.data.data.flatMap(mapApiMessage),
        count: res.data.count,
      };
    },
    [mapApiMessage, currentUserId]
  );

  /* ================= LOAD FIRST (TIN MỚI NHẤT) ================= */
  const loadFirstMessages = useCallback(async (convId) => {
    const limit = 20;

    const { messages, count } = await fetchMessages(convId, 0, limit);

    // Tin mới nhất ở cuối → giữ nguyên thứ tự
    setConversationMessages((prev) => ({
      ...prev,
      [convId]: messages,
    }));

    setPaging((prev) => ({
      ...prev,
      [convId]: {
        skip: messages.length,
        limit,
        count,
        hasMore: messages.length < count,
        loading: false,
      },
    }));

    openedRef.current.add(convId);
  }, [fetchMessages]);

  /* ================= LOAD MORE (TIN CŨ) - FIXED ================= */
  const loadMoreMessages = useCallback(
    async (convId) => {
      const state = paging[convId];
      if (!state) {
        // console.log('❌ No paging state for:', convId);
        return;
      }

      if (loadingRef.current[convId]) {
        // console.log('⏳ Already loading:', convId);
        return;
      }
      if (!state.hasMore) {
        // console.log('✅ No more messages:', convId);
        return;
      }
      if (state.skip >= state.count) {
        // console.log('✅ Reached end:', convId, state.skip, '>=', state.count);
        return;
      }

      // console.log('📥 Load more:', { convId, skip: state.skip, limit: state.limit });

      loadingRef.current[convId] = true;

      setPaging((p) => ({
        ...p,
        [convId]: { ...state, loading: true },
      }));

      try {
        const { messages, count } = await fetchMessages(
          convId,
          state.skip,
          state.limit
        );

        // console.log('📦 Fetched:', { count: messages.length, total: count });

        if (messages.length === 0) {
          // console.log('⚠️ No new messages');
          setPaging((p) => ({
            ...p,
            [convId]: { ...state, hasMore: false, loading: false },
          }));
          loadingRef.current[convId] = false;
          return;
        }

        // 🔥 FIX: Lọc bỏ tin nhắn trùng lặp bằng Set
        setConversationMessages((prev) => {
          const existing = prev[convId] || [];
          const existingIds = new Set(existing.map(m => m.id));
          
          // console.log('📊 Before filter:', {
          //   existingCount: existing.length,
          //   newCount: messages.length,
          //   existingIds: Array.from(existingIds).slice(0, 5),
          //   newIds: messages.map(m => m.id).slice(0, 5),
          // });
          
          // Chỉ thêm tin nhắn chưa có
          const newMessages = messages.filter(m => !existingIds.has(m.id));
          
          // console.log('✅ After filter:', {
          //   filteredCount: newMessages.length,
          //   totalAfter: newMessages.length + existing.length,
          // });
          
          // 🔥 Tin cũ (messages) thêm vào ĐẦU, tin mới (existing) ở CUỐI
          return {
            ...prev,
            [convId]: [...newMessages, ...existing],
          };
        });

        const newSkip = state.skip + messages.length;

        // console.log('📍 Update skip:', state.skip, '→', newSkip);

        setPaging((p) => ({
          ...p,
          [convId]: {
            ...state,
            skip: newSkip,
            count,
            hasMore: newSkip < count,
            loading: false,
          },
        }));
      } catch (error) {
        // console.error("❌ Load more messages error:", error);
        setPaging((p) => ({
          ...p,
          [convId]: { ...state, loading: false },
        }));
      } finally {
        loadingRef.current[convId] = false;
      }
    },
    [fetchMessages, paging]
  );

  /* ================= ADD MESSAGE (SOCKET / SEND) ================= */
  const addMessage = useCallback((convId, message) => {
    setConversationMessages((prev) => {
      const existing = prev[convId] || [];
      
      // 🔥 Tránh thêm tin trùng lặp
      if (existing.some(m => m.id === message.id)) {
        return prev;
      }
      
      return {
        ...prev,
        [convId]: [...existing, message],
      };
    });
  }, []);

  const addMessages = useCallback((convId, messages) => {
    setConversationMessages((prev) => {
      const existing = prev[convId] || [];
      const existingIds = new Set(existing.map(m => m.id));
      
      // Chỉ thêm tin nhắn chưa có
      const newMessages = messages.filter(m => !existingIds.has(m.id));
      
      return {
        ...prev,
        [convId]: [...existing, ...newMessages],
      };
    });
  }, []);

  /* ================= CLEANUP ================= */
  const clearMessages = useCallback((convId) => {
    setConversationMessages((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });

    setPaging((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });

    openedRef.current.delete(convId);
  }, []);

  const removeTypingMessage = useCallback((convId) => {
    setConversationMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).filter((m) => !m.isTyping),
    }));
  }, []);

  /* ================= SEND MESSAGE (REST – fallback) ================= */
  const sendMessage = useCallback(
    async (convId, content, files = []) => {
      const token = localStorage.getItem("token");
      const payload = {
        conversationId: convId,
        content,
        sendId: currentUserId,
        type: 1,
        data: files.map((f) => ({
          attachFile: f.url,
          name: f.name,
          size: f.size,
          type: f.type,
        })),
      };

      const res = await axios.post(
        `${APP_BASE}/api/api/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return mapApiMessage(res.data.data);
    },
    [currentUserId, mapApiMessage]
  );

  return {
    conversationMessages,
    paging,

    loadFirstMessages,
    loadMoreMessages,

    addMessage,
    addMessages,
    removeTypingMessage,
    clearMessages,
    sendMessage,
    mapApiMessage,
  };
};