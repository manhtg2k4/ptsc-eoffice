import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const PAGE_SIZE = 500;

/**
 * Map 1 message -> nhiều item (file/image/video)
 * ĐÚNG theo data API của bạn
 */
const mapMessageToPanelItems = (msg) => {
  if (!Array.isArray(msg.data)) return [];

  return msg.data.map((a, index) => {
    const mime = a.type || "";

    let itemType = "file";
    if (mime.startsWith("image/")) itemType = "image";
    else if (mime.startsWith("video/")) itemType = "video";
    else if (mime === "link") itemType = "link";

    return {
      id: `${msg.id}_${index}`,
      messageId: msg.id,               // 🔥 dùng cho MediaPreviewDialog
      type: itemType,
      url: a.attachFile,
      name: a.name || a.file_name || "file",
      createdAt: msg.createdAt || msg.time?.sentAt,
      sender: msg.sender,
      raw: a,
    };
  });
};

export const useFilesLinksPanelPaging = ({ convId, tab }) => {
  const [items, setItems] = useState([]);
  const [skip, setSkip] = useState(0);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  const hasMore = count == null ? true : skip < count;

  const reset = useCallback(() => {
    setItems([]);
    setSkip(0);
    setCount(null);
    loadingRef.current = false;
  }, []);

  const fetchPage = useCallback(
    async (nextSkip) => {
      if (!convId) return;
      if (loadingRef.current) return;

      const token = localStorage.getItem("token");
      if (!token) return;

      loadingRef.current = true;
      setLoading(true);

      try {
        const res = await axios.get(`${APP_BASE}/api/api/messages`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            conversationId: convId,
            skip: nextSkip,
            limit: PAGE_SIZE,
          },
        });

        if (res.data?.status !== 1) return;

        const list = Array.isArray(res.data.data) ? res.data.data : [];
        const total = typeof res.data.count === "number" ? res.data.count : null;

        // 🔥 FLATTEN message -> attachment
        const panelItems = list.flatMap(mapMessageToPanelItems);

        // 🔥 FILTER theo tab
        const allowedTypes =
          tab === 0 ? ["image", "video"] :
          tab === 1 ? ["file"] :
          ["link"];

        const filtered = panelItems.filter(i =>
          allowedTypes.includes(i.type)
        );

        setItems(prev => [...prev, ...filtered]);
        setSkip(nextSkip + list.length);
        setCount(total);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [convId, tab]
  );

  const loadFirst = useCallback(() => {
    reset();
    fetchPage(0);
  }, [fetchPage, reset]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    fetchPage(skip);
  }, [fetchPage, skip, hasMore]);

  // 🔁 đổi conversation / đổi tab -> reload
  useEffect(() => {
    if (!convId) return;
    loadFirst();
  }, [convId, tab]); // eslint-disable-line

  return {
    items,
    loadMore,
    hasMore,
    loading,
  };
};
