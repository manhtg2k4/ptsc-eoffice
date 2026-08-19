import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  // useMemo,
} from "react";
import {
  Paper,
  useTheme,
  useMediaQuery,
  Dialog,
  styled,
  DialogContent,
} from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import ConversationsSidebar from "./ConversationsSidebar";
import ChatWindow from "./ChatWindow";
import FilesLinksPanel from "./FilesLinksPanel";
import { AuthContext } from "@AuthContext/AuthProvider";
import {
  FullscreenDialogContent,
  LeftSidebarWrapper,
  ChatMainWrapper,
  RightPanelWrapper,
  FloatingPopover,
  FloatingPopoverPaper,
} from "./styles/Chat.styles";

import { useChatMessages } from "./hooks/useChatMessages";
import { useAIChat } from "./hooks/useAIChat";
import useFileUpload from "./hooks/useFileUpload";
import { useConversations } from "./hooks/useConversations";
import { useChatMessageHandler } from "./hooks/useChatMessageHandler";
import { useChatSocket } from "./hooks/useChatSocket";
import getSocket from "../../socket";

import MediaPreviewDialog from "./MediaPreviewDialog";

dayjs.extend(relativeTime);
dayjs.locale("vi");

const StyledFloatingChatPaper = styled(Paper)(({ index }) => ({
  position: "fixed",
  bottom: 16,
  right: 36 + 340 + index * 340,
  width: 320,
  display: "flex",
  flexDirection: "column",
  zIndex: 1300,
  height: "43%",
}));

const DialogContentNoPadding = styled(DialogContent)({
  padding: 0,
});

const Chat = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [searchQuery, setSearchQuery] = useState("");
  const [openConversations, setOpenConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messageInputs, setMessageInputs] = useState({});
  const [maximizedChat, setMaximizedChat] = useState(null);
  const [maximizedActiveChat, setMaximizedActiveChat] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  const [showFilesPanel, setShowFilesPanel] = useState(false);

  const [mediaPreview, setMediaPreview] = useState({
    open: false,
    conversationId: null,
    items: [],
    index: 0,
  });

  const messagesEndRefs = useRef({});



  const { user } = useContext(AuthContext);
  const currentUserId = user?.user?.id;

  const {
    conversationMessages,
    addMessage,
    addMessages,
    // setMessages,
    removeTypingMessage,
    clearMessages,
    mapApiMessage,
    loadMoreMessages,
    loadFirstMessages,
    paging,
    
  } = useChatMessages(currentUserId);

  const convMsgsRef = useRef(conversationMessages);
  useEffect(() => {
    convMsgsRef.current = conversationMessages;
  }, [conversationMessages]);

  
  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const conversationId = detail.conversationId;
      const messageId = detail.messageId;
      if (!conversationId) return;

      const msgs = convMsgsRef.current?.[conversationId] || [];
      const media = msgs.filter(
        (m) => m.type === "image" || m.type === "video"
      );
      if (media.length === 0) return;

      const idx = messageId
        ? media.findIndex((m) => m.id === messageId)
        : 0;

      setMediaPreview({
        open: true,
        conversationId,
        items: media.map((m) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          content: m.content,
          createdAt: m.createdAt,
        })),
        index: idx >= 0 ? idx : 0,
      });
    };

    window.addEventListener("chat:open-media-preview", handler);
    return () =>
      window.removeEventListener("chat:open-media-preview", handler);
  }, []);

const openMediaPreview = useCallback(
  (conversationId, messageId) => {
    if (!conversationId) return;

    const msgs = conversationMessages?.[conversationId];
    if (!Array.isArray(msgs)) return;

    const media = msgs.filter(
      (m) => m && (m.type === "image" || m.type === "video")
    );
    if (media.length === 0) return;

    const idx = messageId
      ? media.findIndex((m) => m?.id === messageId)
      : 0;

    setMediaPreview({
      open: true,
      items: media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        content: m.content,
        createdAt: m.createdAt,
      })),
      index: idx >= 0 ? idx : 0,
    });
  },
  [conversationMessages]
);

// const handleOpenMediaPreview = useCallback(
//   (messageId) => {
//     if (!maximizedActiveChat?.id) return;
//     openMediaPreview(maximizedActiveChat.id, messageId);
//   },
//   [openMediaPreview, maximizedActiveChat?.id]
// );

const handleOpenMediaPreview = useCallback(
  (payload) => {
    // ✅ CASE 1: FilesLinksPanel truyền { items, startIndex }
    if (payload?.items && Array.isArray(payload.items)) {
      setMediaPreview({
        open: true,
        items: payload.items,
        index: payload.startIndex || 0,
      });
      return;
    }

    // ✅ CASE 2: ChatWindow truyền messageId (giữ backward-compatible)
    const messageId = payload;
    if (!maximizedActiveChat?.id) return;

    openMediaPreview(maximizedActiveChat.id, messageId);
  },
  [openMediaPreview, maximizedActiveChat?.id]
);


const handleOpenMediaPreviewActivechat = useCallback(
  (messageId) => {
    if (!activeChat?.id) return;
    openMediaPreview(activeChat.id, messageId);
  },
  [openMediaPreview, activeChat?.id]
);

  const closeMediaPreview = useCallback(() => {
    setMediaPreview((p) => ({ ...p, open: false }));
  }, []);

  useChatSocket({
    addMessages,
    mapApiMessage,
    currentUserId,
  });

  const {
    aiSessionId,
    aiLoading,
    setAiLoading,
    sendMessageToAI,
    initializeSession,
    resetSession,
  } = useAIChat();

  const {
    attachedFiles,
    handleFileSelect,
    handleRemoveFile,
    clearAttachedFiles: clearFiles,
    getAttachedFiles,
    isUploading,
    setAttachedFiles,
  } = useFileUpload();

  const {
    conversations,
    users,
    createConversation,
    updateConversationLastMessage,
    clearUnreadCount,
    findConversation,
    loadMoreUsers,
    hasMoreUsers,
    loadingUsers,
    fetchConversations,
    searchUsers,
    searchLoading,
    searchSimpleUsers,
    searchConversations,
    deleteConversation,
    createGroupConversation,
    // AI_CONVERSATION,
  } = useConversations(currentUserId);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  useEffect(() => {
    if (!userSearchQuery) return;

    searchSimpleUsers({
      q: userSearchQuery,
      page: 1,
      limit: 10,
    });
  }, [userSearchQuery, searchSimpleUsers]);

  const { handleSendMessage } = useChatMessageHandler({
    currentUserId,
    messageInputs,
    setMessageInputs,
    attachedFiles,
    setAttachedFiles,
    clearFiles,
    openConversations,
    activeChat,
    maximizedActiveChat,
    aiLoading,
    setAiLoading,
    aiSessionId,
    initializeSession,
    sendMessageToAI,
    addMessage,
    addMessages,
    removeTypingMessage,
    sendMessage: undefined, 
    updateConversationLastMessage,
    getAttachedFiles,
  });

  const isOwnMessage = useCallback(
    (senderId) => senderId === currentUserId,
    [currentUserId]
  );

  const scrollToBottom = useCallback((convId) => {
    const el = messagesEndRefs.current?.[convId];
    if (!el) return;
    el.scrollIntoView({ behavior: "auto" });
  }, []);

  const loadMessagesForConversation = useCallback(
    async (conv) => {
      // ===== AI =====
      if (conv.isAI) {
        if (!aiSessionId) {
          initializeSession();
        }

        if (!conversationMessages[conv.id]) {
          const welcomeMessage = {
            id: 1,
            type: "text",
            content:"Xin chào! Tôi là trợ lý AI. Tôi có thể giúp bạn tìm kiếm văn bản, trả lời các câu hỏi về tài liệu. Hãy hỏi tôi bất cứ điều gì!",
            senderId: conv.userId,
            createdAt: new Date().toISOString(),
          };

          addMessages(conv.id, [welcomeMessage]);
        }

        requestAnimationFrame(() => {
          scrollToBottom(conv.id);
        });

        return; // 🔥 CỰC KỲ QUAN TRỌNG
      }

      // ===== NON AI =====
      // if (!conversationMessages[conv.id]) {
      // }
      await loadFirstMessages(conv.id);

      requestAnimationFrame(() => {
        scrollToBottom(conv.id);
      });
    },
    [
      aiSessionId,
      conversationMessages,
      initializeSession,
      loadFirstMessages,
			scrollToBottom,
			addMessages
    ]
  );

  const handleUserClick = async (user) => {
    const existingConv = findConversation(user.userId, false);

    if (existingConv) {
      handleOpenConversation(existingConv);
      return;
    }

    const newConv = await createConversation(user);
    if (newConv) {
      handleOpenConversation(newConv);
    }
  };

  const joinedConversationsRef = useRef(new Set());
  
  const handleOpenConversation = useCallback(
    async (conv) => {
      const socket = getSocket();

      if (!joinedConversationsRef.current.has(conv.id)) {
        socket.emit("join", { conversationId: conv.id });
        joinedConversationsRef.current.add(conv.id);
      }
      setActiveConversationId(conv.id);
      if (isMobile) {
        setActiveChat(conv);
      } else {
        setOpenConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) return prev;

          if (prev.length >= 2) {
            return [...prev.slice(1), conv];
          }

          return [...prev, conv];
        });
      }

      await loadMessagesForConversation(conv);
      clearUnreadCount(conv.id);
    },
    [isMobile, clearUnreadCount, loadMessagesForConversation]
  );

  const handleCloseConversation = useCallback(
    (convId) => {
      const conv = [...openConversations, activeChat, maximizedActiveChat].find(
        (c) => c?.id === convId
      );
      if (conv?.isAI) {
        resetSession();
        clearMessages(convId);
      }

      clearFiles(convId);

      if (!isMobile) {
        setOpenConversations((prev) => prev.filter((c) => c.id !== convId));
      } else {
        setActiveChat(null);
      }
    },
    [
      openConversations,
      activeChat,
      maximizedActiveChat,
      isMobile,
      resetSession,
      clearMessages,
      clearFiles,
    ]
  );

  const handleMinimizeConversation = useCallback(
    (convId) => {
      if (!isMobile) {
        handleCloseConversation(convId);
      }
    },
    [isMobile, handleCloseConversation]
  );

  const handleMaximize = useCallback((conv) => {
    setMaximizedChat(conv);
    setMaximizedActiveChat(conv);
  }, []);

  const handleCloseMaximized = useCallback(() => {
    setShowFilesPanel(false);
    setMaximizedChat(null);
    setMaximizedActiveChat(null);
  }, []);

  const handleMinimizeMaximized = useCallback(() => {
    setMaximizedChat(null);
    setMaximizedActiveChat(null);
  }, []);

  const handleOpenMaximizedConversation = useCallback(
    async (conv) => {
      setActiveConversationId(conv.id);
      setMaximizedActiveChat(conv);
      await loadMessagesForConversation(conv);
      clearUnreadCount(conv.id);
    },
    [clearUnreadCount, loadMessagesForConversation]
  );

  const getInitials = useCallback((name) => {
    if (!name) return "";
    const names = name.split(" ");
    const initials =
      names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`
        : name.substring(0, 2);
    return initials.toUpperCase();
  }, []);

  // const filteredConversations = useMemo(() => {
  //   const query = (searchQuery || "").toLowerCase();
  //   return conversations.filter(
  //     (conv) =>
  //       (conv.userName || "").toLowerCase().includes(query) ||
  //       (conv.lastMessage || "").toLowerCase().includes(query)
  //   );
  // }, [conversations, searchQuery]);

  const handleCloseSidebar = useCallback(() => {
    if (isMobile && activeChat) {
      setActiveChat(null);
    }
    if (onClose) onClose();
  }, [isMobile, activeChat, onClose]);

  const getChatHandlers = useCallback(
    (convId, mode = "floating") => {
      const common = {
        onSendMessage: () => handleSendMessage(convId),
        onInputChange: (value) =>
          setMessageInputs((prev) => ({ ...prev, [convId]: value })),
        onFileSelect: handleFileSelect,
        onRemoveFile: (index) => handleRemoveFile(convId, index),
        messagesEndRef: (el) => {
          messagesEndRefs.current[convId] = el;
        },
        scrollToBottom: () => scrollToBottom(convId),
        attachedFiles: getAttachedFiles(convId),
        isUploading: isUploading(convId),
        onLoadMore: () => loadMoreMessages(convId),
      };

      if (mode === "mobile") {
        return {
          ...common,
          onMaximize: () => {},
          onMinimize: () => {},
          onClose: () => setActiveChat(null),
        };
      } else if (mode === "maximized") {
        return {
          ...common,
          onMinimize: handleMinimizeMaximized,
          onClose: handleCloseMaximized,
        };
      } else {
        return {
          ...common,
          onMinimize: () => handleMinimizeConversation(convId),
          onClose: () => handleCloseConversation(convId),
        };
      }
    },
    [
      handleSendMessage,
      handleFileSelect,
      handleRemoveFile,
      getAttachedFiles,
      isUploading,
      loadMoreMessages,
      scrollToBottom,
      handleMinimizeMaximized,
      handleCloseMaximized,
      handleMinimizeConversation,
      handleCloseConversation,
    ]
  );

  const handleUserClickInMaximized = async (user) => {
    const existingConv = findConversation(user.userId, false);

    let conv = existingConv;
    if (!conv) {
      conv = await createConversation(user);
    }

    if (conv) {
      setMaximizedActiveChat(conv);
      await loadMessagesForConversation(conv);
      clearUnreadCount(conv.id);

      const socket = getSocket();
      socket.emit("join", { conversationId: conv.id });
    }
  };

  useEffect(() => {
    const handler = async (e) => {
      const { conversationId } = e.detail || {};
      if (!conversationId) return;

      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;

      await handleOpenConversation(conv);
    };

    window.addEventListener("open-chat-conversation", handler);

    return () => {
      window.removeEventListener("open-chat-conversation", handler);
    };
  }, [conversations, handleOpenConversation]);

  useEffect(() => {
    if (open && currentUserId) {
      fetchConversations();
    }
  }, [open, currentUserId, fetchConversations]);

  const handleToggleFilesPanel = useCallback(() => {
    setShowFilesPanel((prev) => !prev);
  }, []);

  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxConversations, setInboxConversations] = useState([]);
useEffect(() => {
  if (!inboxSearch.trim()) {
    setInboxConversations(conversations);
    return;
  }

  const timer = setTimeout(async () => {
    const data = await searchConversations({
      search: inboxSearch,
      skip: 0,
      limit: 20,
    });

    setInboxConversations(data);
  }, 400);

  return () => clearTimeout(timer);
}, [inboxSearch, conversations, searchConversations]);

const handleClearInboxSearch = useCallback(() => {
  setInboxSearch("");
  setInboxConversations(conversations);
}, [conversations]);


const handleDeleteConversation = useCallback(async (conversationId) => {

  await deleteConversation(conversationId);
  setInboxConversations(prev =>
    prev.filter(c => c.id !== conversationId)
  );
  if (activeConversationId === conversationId) {
    setActiveChat(null);
    setMaximizedActiveChat(null);
  }

}, [deleteConversation, activeConversationId]);

const createMediaPreviewHandler = useCallback(
  (convId) => (messageId) => {
    openMediaPreview(convId, messageId);
  },
  [openMediaPreview]
);

  if (maximizedChat) {
    return (
      <Dialog
        fullScreen
        open
        onClose={handleCloseMaximized}
        PaperProps={{
          style: { height: "100vh", margin: 0 },
        }}
        keepMounted
      >
        <DialogContentNoPadding>
          <FullscreenDialogContent>
            <LeftSidebarWrapper>
              <ConversationsSidebar
                // conversations={filteredConversations}
                conversations={inboxSearch ? inboxConversations : conversations}
                users={userSearchQuery ? searchUsers : users}
                loadMoreUsers={!userSearchQuery ? loadMoreUsers : undefined}
                hasMoreUsers={userSearchQuery ? false : hasMoreUsers}
                loadingUsers={userSearchQuery ? searchLoading : loadingUsers}
                isMaximized
                activeConversationId={activeConversationId}
                onConvClick={handleOpenMaximizedConversation}
                onUserClick={handleUserClickInMaximized}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onClose={handleCloseMaximized}
                getInitials={getInitials}
                onUserSearchChange={setUserSearchQuery}
                onInboxSearchChange={setInboxSearch}
                onDeleteConversation={handleDeleteConversation}
                onClearInboxSearch={handleClearInboxSearch}
                fetchConversations={fetchConversations}
                createGroupConversation={createGroupConversation}
              />
            </LeftSidebarWrapper>

            <ChatMainWrapper>
              {maximizedActiveChat &&
                (() => {
                  const handlers = getChatHandlers(
                    maximizedActiveChat.id,
                    "maximized"
                  );

                  return (
                    <ChatWindow
                      key={maximizedActiveChat.id}
                      conv={maximizedActiveChat}
                      messages={
                        conversationMessages[maximizedActiveChat.id] || []
                      }
                      messageInput={messageInputs[maximizedActiveChat.id] || ""}
                      attachedFiles={handlers.attachedFiles}
                      isMaximized
                      isMobile={isMobile}
                      isOwnMessage={isOwnMessage}
                      onSendMessage={handlers.onSendMessage}
                      onInputChange={handlers.onInputChange}
                      onFileSelect={handlers.onFileSelect}
                      onRemoveFile={handlers.onRemoveFile}
                      onMaximize={handleMaximize}
                      onMinimize={handlers.onMinimize}
                      onClose={handlers.onClose}
                      messagesEndRef={handlers.messagesEndRef} // ✅ callback ref
                      scrollToBottom={handlers.scrollToBottom}
                      getInitials={getInitials}
                      aiLoading={maximizedActiveChat.isAI ? aiLoading : false}
                      isUploading={handlers.isUploading}
                      onLoadMore={handlers.onLoadMore}
                      hasMore={paging[maximizedActiveChat.id]?.hasMore}
                      onToggleFilesPanel={handleToggleFilesPanel}
                      isFilesPanelOpen={showFilesPanel}
                      onOpenMediaPreview={handleOpenMediaPreview}
                    />
                  );
                })()}
            </ChatMainWrapper>

            {/* <RightPanelWrapper>
              {maximizedActiveChat && (
                <FilesLinksPanel
                  convId={maximizedActiveChat.id}
                  conversationMessages={conversationMessages}
                />
              )}
            </RightPanelWrapper> */}
            {showFilesPanel && (
              <RightPanelWrapper>
                {/* <FilesLinksPanel
                  convId={maximizedActiveChat.id}
                  conversationMessages={conversationMessages}
                  onOpenMediaPreview={handleOpenMediaPreview}
                /> */}
                <FilesLinksPanel
                  convId={maximizedActiveChat.id}
                  onOpenMediaPreview={handleOpenMediaPreview}
                />
              </RightPanelWrapper>
            )}
          </FullscreenDialogContent>
        </DialogContentNoPadding>
        <MediaPreviewDialog
          open={mediaPreview.open}
          items={mediaPreview.items}
          startIndex={mediaPreview.index}
          onClose={closeMediaPreview}
        />        
      </Dialog>
    );
  }

  return (
    <>
      <FloatingPopover
        open={open}
        onClose={handleCloseSidebar}
        anchorReference="none"
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
        hideBackdrop
        PaperProps={{
          component: FloatingPopoverPaper,
        }}
      >
        {isMobile && activeChat ? (
          (() => {
            const handlers = getChatHandlers(activeChat.id, "mobile");
            return (
              <ChatWindow
                key={activeChat.id}
                conv={activeChat}
                messages={conversationMessages[activeChat.id] || []}
                messageInput={messageInputs[activeChat.id] || ""}
                attachedFiles={handlers.attachedFiles}
                isMaximized={false}
                isMobile={isMobile}
                isOwnMessage={isOwnMessage}
                onSendMessage={handlers.onSendMessage}
                onInputChange={handlers.onInputChange}
                onFileSelect={handlers.onFileSelect}
                onRemoveFile={handlers.onRemoveFile}
                onMaximize={handleMaximize}
                onMinimize={handlers.onMinimize}
                onClose={handlers.onClose}
                messagesEndRef={handlers.messagesEndRef} // ✅ callback ref
                scrollToBottom={handlers.scrollToBottom}
                getInitials={getInitials}
                aiLoading={activeChat.isAI ? aiLoading : false}
                isUploading={handlers.isUploading}
                onLoadMore={handlers.onLoadMore}
                hasMore={paging[activeChat.id]?.hasMore}
                onOpenMediaPreview={handleOpenMediaPreviewActivechat}
              />
            );
          })()
        ) : (
          <ConversationsSidebar
            // conversations={filteredConversations}
            conversations={inboxSearch ? inboxConversations : conversations}
            users={userSearchQuery ? searchUsers : users}
            loadMoreUsers={!userSearchQuery ? loadMoreUsers : undefined}
            hasMoreUsers={userSearchQuery ? false : hasMoreUsers}
            loadingUsers={userSearchQuery ? searchLoading : loadingUsers}
            isMaximized={false}
            activeConversationId={activeConversationId}
            onConvClick={handleOpenConversation}
            onUserClick={handleUserClick}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={handleCloseSidebar}
            getInitials={getInitials}
            onUserSearchChange={setUserSearchQuery}
            onInboxSearchChange={setInboxSearch}
            onDeleteConversation={handleDeleteConversation}
            onClearInboxSearch={handleClearInboxSearch}
            fetchConversations={fetchConversations}
            createGroupConversation={createGroupConversation}
          />
        )}
      </FloatingPopover>

      {!isMobile &&
        openConversations.map((conv, index) => (
          <StyledFloatingChatPaper key={conv.id} elevation={8} index={index}>
            {(() => {
              const handlers = getChatHandlers(conv.id, "floating");
              return (
                <ChatWindow
                  key={conv.id}
                  conv={conv}
                  messages={conversationMessages[conv.id] || []}
                  messageInput={messageInputs[conv.id] || ""}
                  attachedFiles={handlers.attachedFiles}
                  isMaximized={false}
                  isMobile={isMobile}
                  isOwnMessage={isOwnMessage}
                  onSendMessage={handlers.onSendMessage}
                  onInputChange={handlers.onInputChange}
                  onFileSelect={handlers.onFileSelect}
                  onRemoveFile={handlers.onRemoveFile}
                  onMaximize={handleMaximize}
                  onMinimize={handlers.onMinimize}
                  onClose={handlers.onClose}
                  messagesEndRef={handlers.messagesEndRef} // ✅ callback ref
                  scrollToBottom={handlers.scrollToBottom}
                  getInitials={getInitials}
                  aiLoading={conv.isAI ? aiLoading : false}
                  isUploading={handlers.isUploading}
                  onLoadMore={handlers.onLoadMore}
                  hasMore={paging[conv.id]?.hasMore}
                  onOpenMediaPreview={createMediaPreviewHandler(conv.id)}
                />
              );
            })()}
          </StyledFloatingChatPaper>
        ))}

      <MediaPreviewDialog
        open={mediaPreview.open}
        items={mediaPreview.items}
        startIndex={mediaPreview.index}
        onClose={closeMediaPreview}
      />     
    </>
  );
};

export default Chat;
