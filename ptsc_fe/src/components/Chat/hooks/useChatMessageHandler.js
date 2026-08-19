import { useCallback } from "react";
import { getSocket } from "../../../socket";

export const useChatMessageHandler = ({
  currentUserId,
  messageInputs,
  setMessageInputs,
  clearFiles,
  openConversations,
  activeChat,
  maximizedActiveChat,
  aiLoading,
  setAiLoading,
  initializeSession,
  sendMessageToAI,
  addMessage,
  removeTypingMessage,
  updateConversationLastMessage,
  getAttachedFiles,
}) => {
  const socket = getSocket();

  const handleSendMessage = useCallback(async (convId) => {
    const messageInput = messageInputs[convId]?.trim();
    const localAttachments = getAttachedFiles(convId);

    const uploadedFiles = localAttachments
      .filter((x) => x.status === "uploaded")
      .map((x) => ({
        attachFile: x.url,
        name: x.name,
        size: x.size,
        type: x.type,
      }));

    if (!messageInput && uploadedFiles.length === 0) return;

    const conv = [...openConversations, activeChat, maximizedActiveChat]
      .find((c) => c?.id === convId);

    /* ================= AI FLOW ================= */
    if (conv?.isAI) {
      if (aiLoading) return;
      setAiLoading(true);

      setMessageInputs((p) => ({ ...p, [convId]: "" }));

      addMessage(convId, {
        id: Date.now().toString(),
        type: "text",
        content: messageInput,
        senderId: currentUserId,
        createdAt: new Date().toISOString(),
      });

      const sessionId = initializeSession();

      addMessage(convId, {
        id: `${Date.now()}_typing`,
        type: "text",
        content: "Đang suy nghĩ...",
        senderId: conv.userId,
        createdAt: new Date().toISOString(),
        isTyping: true,
      });

      const aiResponse = await sendMessageToAI(messageInput, sessionId);
      removeTypingMessage(convId);

      addMessage(convId, {
        id: `${Date.now()}_ai`,
        type: "text",
        content: aiResponse,
        senderId: conv.userId,
        createdAt: new Date().toISOString(),
      });

      setAiLoading(false);
      return;
    }

    /* ================= CHAT SOCKET FLOW ================= */

    // 🔑 clientTempId để replace optimistic
    const clientTempId = Date.now().toString();

    // 1️⃣ Optimistic message
    addMessage(convId, {
      id: clientTempId,
      clientTempId,
      type: "text",
      content: messageInput,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      pending: true,
    });

    // 2️⃣ Clear input & files
    setMessageInputs((p) => ({ ...p, [convId]: "" }));
    clearFiles(convId);

    // 3️⃣ Emit socket
    socket.emit("send_message", {
      conversationId: convId,
      content: messageInput,
      sendId: currentUserId,
      clientTempId,
      type: 1,
      data: uploadedFiles,
    });

    updateConversationLastMessage(
      convId,
      messageInput || `${uploadedFiles.length} file(s)`,
      new Date().toISOString()
    );
  }, [
    socket,
    messageInputs,
    getAttachedFiles,
    clearFiles,
    openConversations,
    activeChat,
    maximizedActiveChat,
    currentUserId,
    aiLoading,
    setAiLoading,
    initializeSession,
    sendMessageToAI,
    addMessage,
    removeTypingMessage,
    setMessageInputs,
    updateConversationLastMessage,
  ]);

  return { handleSendMessage };
};
