import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useState, useCallback } from "react";
import dayjs from "dayjs";

export const useUnreadMessages = () => {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState({});

  /**
   * 🔥 fetchUnread
   * @param {string} userId - bắt buộc
   * @param {string=} conversationId - optional
   */
  const fetchUnread = useCallback(
    async (userId) => {
      if (!userId) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const params = new URLSearchParams();
      params.append("userId", userId);

      // if (conversationId) {
      //   params.append("conversationId", conversationId);
      // }

      const [totalRes, byConvRes] = await Promise.all([
        fetch(
          `${APP_BASE}/api/api/messages/unread-count?${params.toString()}`,
          { headers }
        ),
        fetch(
          `${APP_BASE}/api/api/messages/unread-by-conversation?${params.toString()}`,
          { headers }
        ),
      ]);

      const totalJson = await totalRes.json();
      const byConvJson = await byConvRes.json();

      setTotalUnread(totalJson?.data?.totalUnread || 0);

      const map = {};
      (byConvJson?.data || []).forEach((item) => {
        map[item.conversationId] = item.unreadCount;
      });

      setUnreadByConversation(map);
    },
    []
  );

  return {
    totalUnread,
    unreadByConversation,
    fetchUnread,
  };
};

/* ================= DATE HELPERS ================= */

export const isDifferentDay = (a, b) => {
  if (!a || !b) return true;
  return !dayjs(a).isSame(dayjs(b), "day");
};

export const formatChatDate = (date) => {
  const d = dayjs(date);

  if (d.isSame(dayjs(), "day")) return "Hôm nay";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Hôm qua";

  return d.format("DD/MM/YYYY");
};
