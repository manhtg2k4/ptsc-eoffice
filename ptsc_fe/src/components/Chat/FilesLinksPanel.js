import React, { useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import * as Styles from "./styles/FilesLinksPanel.styles";
import { useFilesLinksPanelPaging } from "./hooks/useFilesLinksPanelPaging";

const FilesLinksPanel = ({ convId,onOpenMediaPreview }) => {
  const [tab, setTab] = useState(0);
  // const openPreview = useCallback(
  //   (messageId) => {
  //     window.dispatchEvent(
  //       new CustomEvent("chat:open-media-preview", {
  //         detail: { conversationId: convId, messageId },
  //       })
  //     );
  //   },
  //   [convId]
  // );
  const { items, loadMore, hasMore, loading } = useFilesLinksPanelPaging({convId,tab,});

 const openPreview = useCallback(
  (messageId) => {
    if (!messageId) return;

    // 🔥 tìm index trong items của FilesLinksPanel
    const index = items.findIndex(
      (i) => i.messageId === messageId
    );

    if (index < 0) return;

    onOpenMediaPreview?.({
      items,
      startIndex: index,
    });
  },
  [items, onOpenMediaPreview]
);

  /* ---------------- handlers (stable) ---------------- */
  const handleTab0 = useCallback(() => setTab(0), []);
  const handleTab1 = useCallback(() => setTab(1), []);
  const handleTab2 = useCallback(() => setTab(2), []);

  const tabHandlers = useMemo(
    () => [handleTab0, handleTab1, handleTab2],
    [handleTab0, handleTab1, handleTab2]
  );

  /* ---------------- data processing ---------------- */
  // const getStorageData = useCallback(
  //   (convId) => {
  //     const msgs = conversationMessages[convId] || [];

  //     const media = msgs.filter(
  //       (m) => m.type === "image" || m.type === "video"
  //     );
  //     const files = msgs.filter((m) => m.type === "file");
  //     const links = msgs.filter((m) => m.type === "link");

  //     const mediaByDate = media.reduce((acc, item) => {
  //       const date = dayjs(item.createdAt).format("DD/MM/YYYY");
  //       acc[date] = acc[date] || [];
  //       acc[date].push(item);
  //       return acc;
  //     }, {});

  //     return { mediaByDate, files, links };
  //   },
  //   [conversationMessages]
  // );

  // const { mediaByDate, files, links } = getStorageData(convId);

  const media = useMemo(
    () => items.filter((m) => m.type === "image" || m.type === "video"),
    [items]
  );
  const files = useMemo(() => items.filter((m) => m.type === "file"), [items]);
  const links = useMemo(() => items.filter((m) => m.type === "link"), [items]);

  const mediaByDate = useMemo(() => {
    return media.reduce((acc, item) => {
      const date = dayjs(item.createdAt).format("DD/MM/YYYY");
      acc[date] = acc[date] || [];
      acc[date].push(item);
      return acc;
    }, {});
  }, [media]);
  const handleScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (!el) return;

      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        if (hasMore && !loading) {
          loadMore();
        }
      }
    },
    [hasMore, loading, loadMore]
  );

const handlePreviewClick = useCallback(
  (event) => {
    const messageId = event.currentTarget.dataset.messageId;
    if (!messageId) return;
    openPreview(messageId);
  },
  [openPreview]
);

const handlePreviewKeyDown = useCallback(
  (event) => {
    if (event.key !== "Enter") return;
    const messageId = event.currentTarget.dataset.messageId;
    if (!messageId) return;
    openPreview(messageId);
  },
  [openPreview]
);


  /* ---------------- render ---------------- */
  return (
    <Styles.PanelRoot>
      {/* Tabs */}
      <Styles.TabsWrapper>
        <Styles.TabsRow>
          {["Ảnh/Video", "Files", "Links"].map((label, index) => (
            <Styles.TabItem
              key={label}
              $active={tab === index}
              onClick={tabHandlers[index]} // ✅ ESLint OK
            >
              {label}
            </Styles.TabItem>
          ))}
        </Styles.TabsRow>
      </Styles.TabsWrapper>

      <Styles.PanelDivider />

      {/* Content */}
      <Styles.ContentArea onScroll={handleScroll}>
        {tab === 0 && (
          <Styles.MediaWrapper>
            {Object.entries(mediaByDate).map(([date, items]) => (
              <div key={date}>
                <Styles.MediaDate variant="body2">
                  Ngày{" "}
                  {dayjs(date, "DD/MM/YYYY").format("DD [Tháng] MM")}
                </Styles.MediaDate>

                <Styles.MediaGrid>
                  {items.map((item) => (
                    <Styles.MediaItem
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      data-message-id={item.messageId}
                      onClick={handlePreviewClick}
                      onKeyDown={handlePreviewKeyDown}
                    >
                      <Styles.MediaImage
                        src={item.thumbnail || item.url}
                        alt=""
                      />
                      {item.type === "video" && (
                        <Styles.VideoOverlay>▶</Styles.VideoOverlay>
                      )}
                    </Styles.MediaItem>
                  ))}
                </Styles.MediaGrid>
              </div>
            ))}
          </Styles.MediaWrapper>
        )}

        {tab === 1 &&
          (files.length === 0 ? (
            <Styles.EmptyText variant="body2">
              Chưa có file
            </Styles.EmptyText>
          ) : (
            files.map((file) => (
              <Styles.ListItem key={file.id}>
                📎{" "}
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.name}
                </a>
              </Styles.ListItem>
            ))
          ))}

        {tab === 2 &&
          (links.length === 0 ? (
            <Styles.EmptyText variant="body2">
              Chưa có link
            </Styles.EmptyText>
          ) : (
            links.map((link) => (
              <Styles.ListItem key={link.id}>
                🔗{" "}
                <a href={link.content} target="_blank" rel="noopener noreferrer">
                  {link.name}
                </a>
              </Styles.ListItem>
            ))
          ))}
      </Styles.ContentArea>

      {loading && (
        <Styles.EmptyText variant="body2">
          Đang tải...
        </Styles.EmptyText>
      )}

      {!hasMore && items.length > 0 && (
        <Styles.EmptyText variant="body2">
          Đã tải hết
        </Styles.EmptyText>
      )}

    </Styles.PanelRoot>
  );
};

export default FilesLinksPanel;
