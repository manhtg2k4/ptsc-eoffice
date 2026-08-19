import React, { useCallback } from "react";
import * as Styles from "./styles/Chat.styles";
import dayjs from "dayjs";

const MediaGrid = ({ mediaByDate, onOpenMediaPreview }) => {
  const handlePreviewClick = useCallback(
    (event) => {
      const messageId = event.currentTarget.dataset.messageId;
      if (!messageId) return;
      onOpenMediaPreview?.(messageId);
    },
    [onOpenMediaPreview]
  );

  const handlePreviewKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter") return;
      const messageId = event.currentTarget.dataset.messageId;
      if (!messageId) return;
      onOpenMediaPreview?.(messageId);
    },
    [onOpenMediaPreview]
  );

  return (
    <Styles.MediaWrapper>
      {Object.entries(mediaByDate).map(([date, items]) => (
        <Styles.MediaDateGroup key={date}>
          <Styles.MediaDateText variant="body2">
            Ngày {dayjs(date, "DD/MM/YYYY").format("DD [Tháng] MM")}
          </Styles.MediaDateText>

          <Styles.MediaGridContainer>
            {items.map((item) => (
              <Styles.MediaItem
                key={item.id}
                role="button"
                tabIndex={0}
                data-message-id={item.id}
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
          </Styles.MediaGridContainer>
        </Styles.MediaDateGroup>
      ))}
    </Styles.MediaWrapper>
  );
};

export default MediaGrid;
