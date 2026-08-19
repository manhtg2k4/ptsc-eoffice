import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  // IconButton,
  InputAdornment,
  Menu, 
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CloseIcon from "@mui/icons-material/Close";
import * as Styles from "./styles/Chat.styles";
import dayjs from "dayjs";
// import SmartToyIcon from "@mui/icons-material/SmartToy";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CreateGroupModal from "./CreateGroupModal";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { AuthContext } from "@AuthContext/AuthProvider";
// import defaultLogo from '@assets/logo_lifetex.png'; 
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

const ConversationsSidebar = ({
  conversations,
  users,
  loadMoreUsers,
  hasMoreUsers,
  loadingUsers,
  onUserClick,
  onConvClick,
  searchQuery,
  onSearchChange,
  onClose,
  getInitials,
  onUserSearchChange,
  activeConversationId,
  onInboxSearchChange,
  onDeleteConversation,
  onClearInboxSearch,
  fetchConversations,
  createGroupConversation,
}) => {
  const [activeTab, setActiveTab] = useState('conversations'); 
  const [inboxSearch, setInboxSearch] = useState("");

  /* ================= SCROLL LOAD USERS ================= */
  const handleUserScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      if (!el) return;

      const { scrollTop, scrollHeight, clientHeight } = el;

      const nearBottom = scrollTop + clientHeight >= scrollHeight - 80;

      if (nearBottom && hasMoreUsers && !loadingUsers) {
        loadMoreUsers();
      }
    },
    [hasMoreUsers, loadingUsers, loadMoreUsers]
  );
  /////////////////
  const isActiveConv = useCallback(
    (convId) => convId === activeConversationId,
    [activeConversationId]
  );
  
  const [userSearchInput, setUserSearchInput] = useState("");
  
  // const regularConversations = useMemo(() => {
  //   const q = inboxSearch.trim().toLowerCase();
  //   if (!q) return conversations.slice(1);

  //   return conversations.slice(1).filter((conv) => {
  //     return (
  //       (conv.userName || "").toLowerCase().includes(q) ||
  //       (conv.lastMessage || "").toLowerCase().includes(q)
  //     );
  //   });
  // }, [conversations, inboxSearch]);

useEffect(() => {
  if (activeTab !== "users") return;

  // ⛔ không gọi API nếu rỗng
  if (!userSearchInput.trim()) {
    onUserSearchChange?.("");
    return;
  }

  const timer = setTimeout(() => {
    onUserSearchChange?.(userSearchInput);
  }, 400); // ⏱ 400ms là đẹp

  return () => clearTimeout(timer);
}, [userSearchInput, activeTab, onUserSearchChange]);


  const filteredUsers = useMemo(() => {
    const q = searchQuery?.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) =>
      (u.name || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const [inputValue, setInputValue] = useState("");


  const handleTabChange = (_, newValue) => {
    setActiveTab(newValue);
  };
// ConversationsSidebar 
  // const handleConvClick = useCallback(() => {
  //   if (!conversations[0]) return;
  //   onConvClick(conversations[0]);
  // }, [onConvClick, conversations]);

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;

      // ✅ LUÔN update input
      setInputValue(value);

      if (activeTab === "users") {
        setUserSearchInput(value); // gọi API
      } else {
        onSearchChange(value); // lọc local
      }
    },
    [activeTab, onSearchChange]
  );

  const handleUserClick = useCallback(
    (user) => () => {
      onUserClick(user);
    },
    [onUserClick]
  );

  const [openCreateGroup, setOpenCreateGroup] = useState(false);

  const handleOpenCreateGroup = useCallback(() => {
    setOpenCreateGroup(true);
  }, []);

  const handleCloseCreateGroup = useCallback(() => {
    setOpenCreateGroup(false);
  }, []);

  /////////////////////
  const { user } = useContext(AuthContext);
  const { unreadByConversation,fetchUnread  } = useUnreadMessages();
  const currentUserId = user?.user?._id;
  const handleConvClick1 = useCallback(
    (conv) => () => {
      onConvClick({
        ...conv,
        openAt: Date.now(), 
      });
      fetchUnread(currentUserId);
      
      // ✅ FE chủ động phát event
      window.dispatchEvent(
        new CustomEvent("chat:conversation-opened", {
          detail: { conversationId: conv.id }
        })
      );
    },
    [onConvClick, currentUserId, fetchUnread]
  );

  useEffect(() => {
    if (!user?.user?._id) return;

    // ✅ GỌI LẦN ĐẦU
    fetchUnread(user.user._id);
    const handler = () => {
      if (currentUserId) {
        fetchUnread(currentUserId);
      }
    };

    window.addEventListener("chat:refresh-unread", handler);
    return () => {
      window.removeEventListener("chat:refresh-unread", handler);
    };
  }, [currentUserId, fetchUnread, user?.user?._id]);
/////////////////////

useEffect(() => {
  if (activeTab !== "conversations") {
    setInboxSearch("");
  }
}, [activeTab]);
// const handleInboxSearchChange = useCallback((e) => {
//   setInboxSearch(e.target.value);
// }, []);

const [menuAnchor, setMenuAnchor] = useState(null);
const [menuConv, setMenuConv] = useState(null);

// const openMenu = (conv, e) => {
//   e.stopPropagation();
//   setMenuAnchor(e.currentTarget);
//   setMenuConv(conv);
// };

const closeMenu = useCallback(() => {
  setMenuAnchor(null);
  setMenuConv(null);
}, []);


const handleInboxSearchChange = useCallback((e) => {
  const value = e.target.value;
  setInboxSearch(value);
  onInboxSearchChange?.(value); // 👈 GỌI API
}, [onInboxSearchChange]);

/////xoá//////
const [deleteTarget, setDeleteTarget] = useState(null);
// const { deleteConversation } = useConversations(currentUserId);

// const handleAskDelete = useCallback((conv, e) => {
//   e.stopPropagation(); // ⛔ không mở chat
//   setDeleteTarget(conv);
// }, []);

const handleCancelDelete = () => {
  setDeleteTarget(null);
};

const handleConfirmDelete = async () => {
  if (!deleteTarget) return;

  if (typeof onDeleteConversation === "function") {
    await onDeleteConversation(deleteTarget.id);
  }

  setDeleteTarget(null);
};

// const handleOpenMenu = useCallback(
//   (conv) => (event) => {
//     openMenu(conv, event);
//   },
//   [openMenu]
// );

const handleDeleteConversation = useCallback(() => {
  setDeleteTarget(menuConv);
  closeMenu();
}, [menuConv, setDeleteTarget, closeMenu]);

const handleMenuClick = useCallback((event) => {
  event.stopPropagation();
}, []);

useEffect(() => {
  if (activeTab !== "conversations") {
    setInboxSearch("");
    onClearInboxSearch?.(); // 🔥 reset ở Chat.js
  }
}, [activeTab, onClearInboxSearch]);

//////////////
  return (
    <Styles.ConversationsSidebar>
      <Styles.SidebarHeader>
        <Styles.SidebarTitle>Tin nhắn</Styles.SidebarTitle>

        <div style={{ display: "flex", gap: 4 }}>
          <Styles.IconButtonGroupAddIcon
            size="small"
            title="Tạo nhóm chat"
            onClick={handleOpenCreateGroup}
          >
            <GroupAddIcon />
          </Styles.IconButtonGroupAddIcon>

          <Styles.CloseButton size="small" onClick={onClose}>
            <CloseIcon />
          </Styles.CloseButton>
        </div>
      </Styles.SidebarHeader>

      <Styles.SidebarTabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
      >
        <Styles.SidebarTab label="Tin nhắn" value="conversations" />
        <Styles.SidebarTab label="Đồng nghiệp" value="users" />
      </Styles.SidebarTabs>

      {activeTab === "users" && (
        <Styles.SearchInput
          fullWidth
          size="small"
          placeholder="Nhập tên người dùng..."
          value={inputValue}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment>
                <SearchOutlinedIcon />
              </InputAdornment>
            ),
          }}
        />
      )}
      {activeTab === "users" && (
        <Styles.SidebarDivider/>
      )}
      {activeTab === "conversations" && (
        <>
          <Styles.SearchInput
            fullWidth
            size="small"
            placeholder="Tìm kiếm tin nhắn..."
            value={inboxSearch}
            onChange={handleInboxSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment>
                  <SearchOutlinedIcon />
                </InputAdornment>
              ),
            }}
          />
          <Styles.SidebarDivider />
        </>
      )}

      <Styles.ConversationLists  onScroll={activeTab === "users" ? handleUserScroll : undefined}>
        {activeTab === 'conversations' ? (
          conversations.map((conv) => {
            const unread = unreadByConversation[conv.id] || 0;

            return (
              <Styles.ConversationItem
                key={conv.id}
                $isActive={isActiveConv(conv.id)}
                onClick={handleConvClick1(conv)}
              >
                <Styles.OnlineBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                  $online={conv.isOnline}
                >
                  <Styles.Avatar40 src={conv.userAvatar || undefined}>
                    {!conv.userAvatar && getInitials(conv.userName)}
                  </Styles.Avatar40>
                </Styles.OnlineBadge>

                <Styles.ConversationContent>
                  <Styles.ConversationHeader>
                    <Styles.UserName $unread={unread > 0}>
                      {conv.userName}
                    </Styles.UserName>
                    <Styles.RightMeta data-role="meta">
                      <Styles.MetaTime data-role="time">
                        {dayjs(conv.lastMessageTime).fromNow()}
                      </Styles.MetaTime>

                      <Styles.MetaMoreButton
                        data-role="more"
                        size="small"
                        // onClick={handleOpenMenu(conv)}
                      >
                        <MoreHorizIcon />
                      </Styles.MetaMoreButton>
                    </Styles.RightMeta>
                  </Styles.ConversationHeader>

                  <Styles.LastMessageRow>
                    <Styles.LastMessage $unread={unread > 0}>
                      {conv.lastMessage}
                    </Styles.LastMessage>

                    {unread > 0 && (
                      <Styles.UnreadBadge>
                        {unread}
                      </Styles.UnreadBadge>
                    )}
                  </Styles.LastMessageRow>

                </Styles.ConversationContent>
              </Styles.ConversationItem>
            );
          })
        ) : (
          filteredUsers.map((user) => (
            <Styles.ConversationItem
              key={user.id}
              $isActive={isActiveConv(user.id)}
              onClick={handleUserClick(user)}
            >
              <Styles.OnlineBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                $online={user.isOnline || false}
              >
                <Styles.Avatar40>
                  {getInitials(user.name)}
                </Styles.Avatar40>
              </Styles.OnlineBadge>

              <Styles.ConversationContent>
                <Styles.ConversationHeader>
                  <Styles.UserName $unread={false}>
                    {user.name}
                  </Styles.UserName>
                  <Styles.TimeText>
                    {user.status || 'Trực tuyến'}
                  </Styles.TimeText>
                </Styles.ConversationHeader>

                <Styles.LastMessageRow>
                  <Styles.LastMessage $unread={false}>
                    Bắt đầu trò chuyện mới
                  </Styles.LastMessage>
                </Styles.LastMessageRow>
              </Styles.ConversationContent>
            </Styles.ConversationItem>
          ))
        )}
        {/* ===== LOADING ===== */}
        {activeTab === "users" && loadingUsers && (
          <div
            style={{
              textAlign: "center",
              padding: 8,
              fontSize: 13,
              opacity: 0.6,
            }}
          >
            Đang tải thêm đồng nghiệp…
          </div>
        )}

        {/* ===== END ===== */}
        {activeTab === "users" && !hasMoreUsers && users.length > 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 8,
              fontSize: 12,
              opacity: 0.4,
            }}
          >
            Đã tải hết danh sách
          </div>
        )}
      </Styles.ConversationLists>
      <CreateGroupModal
        open={openCreateGroup}
        onClose={handleCloseCreateGroup}
        users={users}
        fetchConversations={fetchConversations}
        createGroupConversation={createGroupConversation}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        onClick={handleMenuClick}
      >
        <Styles.MenuItems
          onClick={handleDeleteConversation}
        >
          Xoá hội thoại
        </Styles.MenuItems>
      </Menu>

      <Dialog open={!!deleteTarget} onClose={handleCancelDelete}>
        <DialogTitle>Xoá cuộc hội thoại</DialogTitle>

        <DialogContent>
          Bạn có chắc chắn muốn xoá cuộc hội thoại này không?
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCancelDelete}>Huỷ</Button>
          <Button
            // color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Xoá
          </Button>
        </DialogActions>
      </Dialog>

    </Styles.ConversationsSidebar>
  );
};

export default ConversationsSidebar;