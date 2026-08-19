import { useState, useCallback } from 'react';
import axios from 'axios';
import { APP_CHAT } from '@EnvironmentFile/constants/ulrConfigNew';

const generateSessionId = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

export const useAIChat = () => {
  const [aiSessionId, setAiSessionId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const sendMessageToAI = useCallback(async (query, sessionId) => {
    const response = await axios.post(
      `${APP_CHAT}/api/chat/final/`,
      {
        query,
        // eslint-disable-next-line camelcase
        session_id: sessionId,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    return (
      data?.answer ||
      data?.response ||
      "Xin lỗi, tôi không thể trả lời lúc này."
    );
  }, []);

  const initializeSession = useCallback(() => {
    if (!aiSessionId) {
      const newSessionId = generateSessionId();
      setAiSessionId(newSessionId);
      return newSessionId;
    }
    return aiSessionId;
  }, [aiSessionId]);

  const resetSession = useCallback(() => {
    setAiSessionId(null);
  }, []);

  return {
    aiSessionId,
    aiLoading,
    setAiLoading,
    sendMessageToAI,
    initializeSession,
    resetSession,
  };
};