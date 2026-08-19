import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Popover,
  // Box,
  // Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
// import RemoveIcon from "@mui/icons-material/Remove";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import CloseIcon from "@mui/icons-material/Close";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import * as Styles from "./styles/ChatWindow.styles";
import dayjs from "dayjs";
import { formatChatDate, isDifferentDay } from "./hooks/useUnreadMessages";
import defaultLogo from '@assets/logo_lifetex.png'; 
import ZoomInMap from "@mui/icons-material/ZoomInMap";
// Danh sách emoji phổ biến
const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
  "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
  "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
  "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
  "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
  "🤢", "🤮", "🤧", "🥵", "🥶", "😶‍🌫️", "😵", "🤯",
  "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁",
  "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧",
  "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣",
  "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠",
  "🤬", "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘",
  "🤙", "👈", "👉", "👆", "👇", "☝️", "👋", "🤚",
  "🖐️", "✋", "🖖", "👏", "🙌", "👐", "🤲", "🤝",
  "🙏", "✍️", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
  "🦻", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅",
  "👄", "💋", "💘", "💝", "💖", "💗", "💓", "💞",
  "💕", "💟", "❣️", "💔", "❤️", "🧡", "💛", "💚",
  "💙", "💜", "🤎", "🖤", "🤍", "💯", "💢", "💥",
  "💫", "💦", "💨", "🕳️", "💬", "👁️‍🗨️", "🗨️", "🗯️",
  "💭", "💤", "🔥", "⭐", "🌟", "✨", "⚡", "☀️",
];

const ChatWindow = ({
  conv,
  messages = [],
  messageInput,
  attachedFiles = [],
  isMaximized = false,
  isMobile = false,
  isOwnMessage,
  onSendMessage,
  onInputChange,
  onFileSelect,
  onRemoveFile,
  onMaximize,
  // onMinimize,
  onClose,
  messagesEndRef,
  scrollToBottom,
  getInitials,
  aiLoading = false,
  isUploading = false,
  onLoadMore,
  hasMore,
  onToggleFilesPanel,
  isFilesPanelOpen,
  onOpenMediaPreview,
}) => {
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const loadingRef = useRef(false);
  const inputRef = useRef(null);
  const [isComposing, setIsComposing] = useState(false);
  // State cho emoji picker
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const emojiOpen = Boolean(emojiAnchorEl);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (isComposing || e.nativeEvent?.isComposing) return;
      e.preventDefault();
      onSendMessage();
    }
  };
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

const [mentionOpen, setMentionOpen] = useState(false);
const [mentionAnchor, setMentionAnchor] = useState(null);

  
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = useCallback(
    (event) => {
      const index = Number(event.currentTarget.getAttribute("data-index"));
      if (Number.isNaN(index)) return;
      onRemoveFile(index);
    },
    [onRemoveFile]
  );

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(conv.id, files);
      e.target.value = "";
    }
  };

  // Xử lý emoji
  // const handleEmojiClick = (event) => {
  //   setEmojiAnchorEl(event.currentTarget);
  // };
  
  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const handleEmojiSelect = useCallback((emoji) => {
    const input = inputRef.current?.querySelector("textarea");

    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newValue =
        messageInput.slice(0, start) + emoji + messageInput.slice(end);

      onInputChange(newValue);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onInputChange(messageInput + emoji);
    }

    handleEmojiClose();
  }, [messageInput, onInputChange, handleEmojiClose]);

 const handleEmojiClick = useCallback(
    (e) => {
      const emoji = e.currentTarget.getAttribute("data-emoji");
      if (!emoji) return;

      handleEmojiSelect(emoji);
    },
    [handleEmojiSelect]
  );

  const handleEmojiButtonClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const formatFileSize = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
      return "Unknown size";
    }
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (file) => {
    const type = file.type || file.file?.type || "";

    if (type.startsWith("image/")) {
      const src = file.previewUrl || file.url;
      if (src) {
        return <Styles.FilePreviewImage src={src} alt="Preview" />;
      }
    }

    if (type.startsWith("video/")) return <VideoLibraryIcon />;
    if (type === "application/pdf") return <PictureAsPdfIcon />;
    if (type.includes("word") || type.includes("document"))
      return <DescriptionIcon />;
    if (type.includes("sheet") || type.includes("excel"))
      return <DescriptionIcon />;

    return <InsertDriveFileIcon />;
  };

  const handleOpenMediaPreview = useCallback(
    (messageId) => {
      if (!onOpenMediaPreview) return;
      onOpenMediaPreview(messageId);
    },
    [onOpenMediaPreview]
  );
  const handleMediaKeyDown = useCallback(
    (event, messageId) => {
      if (event.key === "Enter") {
        handleOpenMediaPreview(messageId);
      }
    },
    [handleOpenMediaPreview]
  );

  const renderMessageContent = (msg) => {
    if (msg.isTyping) {
      return (
        <Styles.TypingRow>
          <CircularProgress size={16} />
          <Styles.TypingText>{msg.content}</Styles.TypingText>
        </Styles.TypingRow>
      );
    }

    switch (msg.type) {
      case "image":
        return (
          // <Styles.MediaWrapper>
          <Styles.MediaWrapper
            role="button"
            tabIndex={0}
            data-message-id={msg.id}
            onClick={handleOpenMediaPreview}
            onKeyDown={handleMediaKeyDown}
          >
            <img
              src={msg.url}
              alt={msg.alt || "Hình ảnh"}
              role="img"
              loading="lazy"
            />
          </Styles.MediaWrapper>
        );
      case "video":
        return (
          <Styles.MediaWrapper>
            <video controls aria-label="Video">
              <source src={msg.url} type="video/mp4" />
              Trình duyệt không hỗ trợ video.
            </video>
          </Styles.MediaWrapper>
        );
      case "file":
        return (
          <Styles.FileBubble>
            <a href={msg.url} target="_blank" rel="noopener noreferrer" download>
              📎 {msg.content}
            </a>
          </Styles.FileBubble>
        );
      case "link":
        return (
          <Styles.FileBubble>
            <a href={msg.content} target="_blank" rel="noopener noreferrer">
              🔗 {msg.content}
            </a>
          </Styles.FileBubble>
        );
      default:
        return <Styles.TextMessage> {renderTextWithMentions(msg.content, conv.members)}</Styles.TextMessage>;
    }
  };

  const getLastActivity = () => {
    if (!conv.lastMessageTime) return "Mới";
    return dayjs(conv.lastMessageTime).fromNow();
  };

  const renderEmptyState = () => (
    <Styles.EmptyState>
      <Typography variant="body2">
        {conv.isAI ? "Hỏi tôi bất cứ điều gì về văn bản..." : "Bắt đầu trò chuyện mới"}
      </Typography>
    </Styles.EmptyState>
  );

  const handleMaximize = useCallback(() => {
    onMaximize(conv);
  }, [onMaximize, conv]);

  // const handleInputChange = (e) => {
  //   onInputChange(e.target.value);
  // };
const handleInputChange = (e) => {
  const value = e.target.value;
  onInputChange(value);

  // nếu vừa gõ @ thì mở mention
  if (value.slice(-1) === "@") {
    setMentionAnchor(e.currentTarget);
    setMentionOpen(true);
  }
};
const handleSelectMention = useCallback((member) => {
  const value = messageInput;
  const newValue = value.replace(/@$/, `@${member.name} `);

  onInputChange(newValue);
  setMentionOpen(false);
}, [messageInput, onInputChange]);
const handleMentionClick = useCallback(
  (member) => () => {
    handleSelectMention(member);
  },
  [handleSelectMention]
);

const handleCloseMention = useCallback(() => {
  setMentionOpen(false);
}, []);


  const canSendMessage = () => {
    const hasText = messageInput.trim().length > 0;
    const hasFiles = attachedFiles.length > 0;
    return (hasText || hasFiles) && !aiLoading && !isUploading;
  };

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return false;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = async () => {
    const el = containerRef.current;
    if (!el || !onLoadMore) return;
    if (!hasMore) return;
    if (loadingRef.current) return;
    if (el.scrollTop <= 20) {
      loadingRef.current = true;
      const prevScrollHeight = el.scrollHeight;
      const prevScrollTop = el.scrollTop;
      await onLoadMore();
      requestAnimationFrame(() => {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        loadingRef.current = false;
      });
    }
  };

const renderTextWithMentions = (text, members = []) => {
  if (!text) return text;

  let parts = [text];

  members.forEach((m) => {
    const mention = `@${m.name}`;
    parts = parts.flatMap((part) => {
      if (typeof part !== "string") return part;

      const split = part.split(mention);
      if (split.length === 1) return part;

      return split.flatMap((p, i) =>
        i === split.length - 1
          ? p
          : [
              p,
              <span
                key={`${m._id}-${i}`}
                style={{ 
                  color: "#FFFFFF",
                  padding: "3px 4px",
                  borderRadius: "6px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  textDecorationLine: "underline",
                  textDecorationThickness: "1px",
                  textUnderlineOffset: "3px",
                }}
              >
                {mention}
              </span>,
            ]
      );
    });
  });

  return parts;
};

  return (
    <Styles.ChatRoot $maximized={isMaximized}>
      {/* Header */}
      <Styles.ChatHeader $maximized={isMaximized}>
        <Styles.ChatHeaderLeft>
          <Styles.OnlineBadge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            $online={conv.isOnline}
          >
            <Styles.Avatar40
                src={
                  conv.isAI
                    ? defaultLogo
                    : conv.userAvatar || undefined
                }
              >
                {!conv.isAI && !conv.userAvatar &&
                  getInitials(conv.userName)
                }
            </Styles.Avatar40>
          </Styles.OnlineBadge>

          <Styles.ChatUserInfo>
            <Styles.ChatUserName>{conv.userName}</Styles.ChatUserName>
            <Styles.ChatStatus>
              {conv.isAI
                ? aiLoading
                  ? "Đang trả lời..."
                  : "Sẵn sàng hỗ trợ"
                : conv.isOnline
                ? "Đang hoạt động"
                : `Hoạt động ${getLastActivity()}`}
            </Styles.ChatStatus>
          </Styles.ChatUserInfo>
        </Styles.ChatHeaderLeft>
        <div>
          <Styles.HeaderActions>
            {isMobile && (
              <Styles.HeaderIconButton size="small" onClick={onClose}>
                <ArrowBackIcon size="small" />
              </Styles.HeaderIconButton>
            )}

            {!isMobile && (
              <>
                {/* Desktop - Màn bình thường */}
                {!isMaximized && (
                  <>
                    <Styles.HeaderIconButton size="small" onClick={handleMaximize}>
                      <FullscreenIcon size="small" />
                    </Styles.HeaderIconButton>

                    <Styles.HeaderIconButton size="small" onClick={onClose}>
                      <CloseIcon size="small" />
                    </Styles.HeaderIconButton>
                  </>
                )}

                {/* Desktop - Màn to */}
                {isMaximized && (
                  <>
                    <Styles.HeaderIconButton size="small" onClick={onClose}>
                      <ZoomInMap size="small" />
                    </Styles.HeaderIconButton>
                    <Styles.HeaderIconButton
                      size="small"
                      onClick={onToggleFilesPanel}
                      title="Files & Links"
                    >
                      <Styles.StyledIcon active={isFilesPanelOpen} />
                    </Styles.HeaderIconButton>                                
                  </>
                )}
              </>
            )}
          </Styles.HeaderActions>

        </div>
      </Styles.ChatHeader>

      {/* Messages */}
      <Styles.MessagesContainer
        $maximized={isMaximized}
        ref={containerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0
          ? renderEmptyState()
          : messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDate =
                !prevMsg || isDifferentDay(msg.createdAt, prevMsg.createdAt);

              const isOwn = isOwnMessage(msg.senderId);
              const time = dayjs(msg.createdAt || new Date()).format("HH:mm");

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <Styles.ChatDateDivider>
                      {formatChatDate(msg.createdAt)}
                    </Styles.ChatDateDivider>
                  )}

                  {isOwn ? (
                    <Styles.MessageRow $own>
                      <Styles.MessageBubble $own>
                        {renderMessageContent(msg)}
                      </Styles.MessageBubble>
                      <Styles.MessageTime>{time}</Styles.MessageTime>
                    </Styles.MessageRow>
                  ) : (
                    <Styles.MessageRow $own={false}>
                      <Styles.MessageOtherWrapper>
                        <Styles.OtherMessageBody>
                          {conv.type === "direct" &&(
                          <Styles.SenderName variant="caption">
                            {conv.userName}
                          </Styles.SenderName>
                          )}
                          {conv.type === "group" && (
                            <Styles.SenderName variant="caption">
                              {msg.senderName}
                            </Styles.SenderName>
                          )}
                          <Styles.MessageBubble $own={false}>
                            {renderMessageContent(msg)}
                          </Styles.MessageBubble>
                        </Styles.OtherMessageBody>
                      </Styles.MessageOtherWrapper>

                      <Styles.MessageTime>{time}</Styles.MessageTime>
                    </Styles.MessageRow>
                  )}
                </React.Fragment>
              );
            })}
        <div ref={messagesEndRef} />
      </Styles.MessagesContainer>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <Styles.AttachmentsWrapper>
          {attachedFiles.map((file, index) => {
            const displayName = file.name || file.file?.name || "Unknown file";
            const displaySize = file.size ?? file.file?.size;

            return (
              <Tooltip
                key={file.key || file.id || index}
                title={displayName}
                placement="top"
              >
                <Styles.FileChip
                  icon={getFileIcon(file)}
                  size="medium"
                  onDelete={handleRemoveFile}
                  data-index={index}
                  label={
                    <Styles.FileChipLabel>
                      <Styles.FileName variant="caption" noWrap>
                        {displayName}
                      </Styles.FileName>
                      <Styles.FileSize variant="caption">
                        {formatFileSize(displaySize)}
                      </Styles.FileSize>
                    </Styles.FileChipLabel>
                  }
                />
              </Tooltip>
            );
          })}
        </Styles.AttachmentsWrapper>
      )}

      {/* Input */}
      <Styles.InputArea>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        {!conv.isAI && (
          <>
            <Tooltip title="Đính kèm file">
              <span>
                <IconButton
                  size="small"
                  onClick={handleFileClick}
                  disabled={aiLoading || isUploading}
                >
                  <Styles.BlackAttachFileIcon size="small"/>
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Chọn emoji">
              <span>
                <IconButton
                  size="small"
                  onClick={handleEmojiButtonClick}
                  disabled={aiLoading || isUploading}
                >
                  <Styles.BlackEmojiIcon size="small"/>
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}

        {/* Emoji Picker Popover */}
        <Popover
          open={emojiOpen}
          anchorEl={emojiAnchorEl}
          onClose={handleEmojiClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Styles.EmojiGrid>
            {EMOJI_LIST.map((emoji, index) => (
              <Styles.EmojiItem
                key={index}
                data-emoji={emoji}
                onClick={handleEmojiClick}
              >
                {emoji}
              </Styles.EmojiItem>
            ))}
          </Styles.EmojiGrid>
        </Popover>

        <Styles.MessageInput
          ref={inputRef}
          fullWidth
          size="small"
          multiline
          rows={1}
          maxRows={4}
          placeholder={
            isUploading
              ? "Đang tải file lên..."
              : conv.isAI
              ? "Hỏi AI về văn bản..."
              : "Nhập tin nhắn..."
          }
          value={messageInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          disabled={aiLoading || isUploading}
        />

        <Tooltip
          title={
            isUploading
              ? "Đang tải file..."
              : aiLoading
              ? "AI đang trả lời..."
              : !canSendMessage()
              ? "Nhập tin nhắn hoặc chọn file"
              : "Gửi tin nhắn"
          }
        >
          <span>
            <Styles.SendButton
              onClick={onSendMessage}
              disabled={!canSendMessage()}
            >
              {isUploading || aiLoading ? (
                <CircularProgress size={20} />
              ) : (
                <SendIcon size="small" />
              )}
            </Styles.SendButton>
          </span>
        </Tooltip>
      </Styles.InputArea>
      <Popover
        open={mentionOpen}
        anchorEl={mentionAnchor}
        onClose={handleCloseMention}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Styles.MentionPopoverContent>
          {conv.members?.map((m) => (
            <Styles.MentionItem
              key={m._id}
              onClick={handleMentionClick(m)}
            >
              <Styles.Avatar41
                src={m.avatar?.[0]}
              >
                {m.name?.[0]}
              </Styles.Avatar41>

              <Styles.MentionName>
                {m.name}
              </Styles.MentionName>
            </Styles.MentionItem>
          ))}
        </Styles.MentionPopoverContent>
      </Popover>

    </Styles.ChatRoot>
  );
};

export default ChatWindow;