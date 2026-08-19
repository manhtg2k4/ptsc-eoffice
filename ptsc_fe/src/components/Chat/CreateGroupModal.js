import React, {
  useState,
  useMemo,
  useContext,
  useCallback,
  useEffect,
} from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Checkbox,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Box,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";

import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CloseIcon from "@mui/icons-material/Close";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

import * as Styles from "./styles/CreateGroupModal.styles";
// import { useConversations } from "./hooks/useConversations";
import { AuthContext } from "@AuthContext/AuthProvider";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const UPLOAD_URL = `${APP_BASE}/api/files/upload`;
const DOWNLOAD_BASE = `${APP_BASE}/api/files/download`;

const CreateGroupModal = ({ open, onClose, users = [], fetchConversations, createGroupConversation }) => {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.user?.id;


  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  // const [searchLoading, setSearchLoading] = useState(false);

  const [groupAvatar, setGroupAvatar] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  //search
  const searchUsersAPI = useCallback(async (q) => {
    if (!q?.trim()) {
      setSearchUsers([]);
      return;
    }

    // setSearchLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${APP_BASE}/api/users/simple-users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { q },
        }
      );

      // chuẩn hóa ID
      const list = (res.data?.data || []).map((u) => ({
        ...u,
        id: String(u._id || u.id), // 🔑 ID DUY NHẤT
      }));

      setSearchUsers(list);
    } catch (e) {
      setSearchUsers([]);
    } finally {
      // setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsersAPI(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, searchUsersAPI]);

  /* Users selectable */
  const selectableUsers = useMemo(
    () =>
      users
        .filter((u) => u.userId !== currentUserId)
        .map((u) => ({ ...u, id: String(u.id) })),
    [users, currentUserId]
  );

  const displayUsers = useMemo(() => {
    if (search.trim()) return searchUsers;
    return selectableUsers;
  }, [search, searchUsers, selectableUsers]);

  ////////
  /* Reset state when open */
  useEffect(() => {
    if (!open) return;
    setName("");
    setSelected([]);
    setSearch("");
    setGroupAvatar(null);
    setUploadingAvatar(false);
  }, [open]);

  

  /* Search */
  // const filteredUsers = useMemo(() => {
  //   const q = search.trim().toLowerCase();
  //   if (!q) return selectableUsers;
  //   return selectableUsers.filter((u) =>
  //     [u.name, u.email].some((v) =>
  //       (v || "").toLowerCase().includes(q)
  //     )
  //   );
  // }, [selectableUsers, search]);

  /* Toggle user */
  const toggleUser = useCallback((id) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }, []);

  /* Pick avatar */
  const handlePickAvatar = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);

    setGroupAvatar((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return { file, previewUrl };
    });

    e.target.value = "";
  }, []);

  /* Remove avatar */
  const handleRemoveAvatar = useCallback(() => {
    setGroupAvatar((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  /* Upload avatar */
  const uploadGroupAvatarIfAny = useCallback(async () => {
    if (!groupAvatar?.file) return null;

    const token = localStorage.getItem("token");
    if (!token) throw new Error("Missing token");

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", groupAvatar.file);

      const res = await axios.post(UPLOAD_URL, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const fileId = res.data?.id;
      if (!fileId) {
        throw new Error("Upload thành công nhưng không có file id");
      }

      return `${DOWNLOAD_BASE}/${fileId}`;
    } finally {
      setUploadingAvatar(false);
    }
  }, [groupAvatar]);

  /* Create group */
  const handleCreate = useCallback(async () => {
    if (!name.trim() || selected.length === 0) return;

    try {
      setLoading(true);

      const avatarUrl = await uploadGroupAvatarIfAny();

      await createGroupConversation({
        name: name.trim(),
        avatar: avatarUrl,
        backgroundImage: null,
        memberIds: [currentUserId, ...selected],
      });
      await fetchConversations();
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [
    name,
    selected,
    currentUserId,
    uploadGroupAvatarIfAny,
    createGroupConversation,
    onClose,
    fetchConversations,
  ]);

  
  const handleNameChange = useCallback((e) => {
    setName(e.target.value);
  }, []);
    const handleDeleteUser = useCallback(
    (id) => () => {
        toggleUser(id);
    },
    [toggleUser]
    );
const handleSearchChange = useCallback((e) => {
  setSearch(e.target.value);
}, []);
const handleToggleUser = useCallback(
  (id) => () => {
    toggleUser(id);
  },
  [toggleUser]
);
const handleCheckboxClick = useCallback((e) => {
  e.stopPropagation();
}, []);


  const canCreate =
    Boolean(name.trim()) &&
    selected.length > 0 &&
    !loading &&
    !uploadingAvatar;

  return (
    <Styles.StyledDialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
    >
      {/* Header */}
      <Styles.Header>
        {/* <Avatar>
          <GroupAddIcon />
        </Avatar> */}

        <Box>
          <Styles.Title>Tạo nhóm chat</Styles.Title>
          {/* <Styles.Subtitle variant="caption">
            Đặt tên & chọn thành viên
          </Styles.Subtitle> */}
        </Box>
      </Styles.Header>

      {/* Content */}
      <Styles.StyledContent dividers>
        {/* Avatar + name */}
        <Styles.HeaderGrid>
          <Styles.AvatarWrapper>
            <Styles.GroupAvatar src={groupAvatar?.previewUrl}>
              {!groupAvatar?.previewUrl && <GroupAddIcon />}
            </Styles.GroupAvatar>

            <Tooltip title="Chọn ảnh nhóm">
              <Styles.CameraButton
                size="small"
                component="label"
                disabled={loading || uploadingAvatar}
              >
                <PhotoCameraIcon size="small" />
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={handlePickAvatar}
                />
              </Styles.CameraButton>
            </Tooltip>

            {groupAvatar && (
              <Tooltip title="Bỏ ảnh">
                <Styles.RemoveAvatarButton
                  size="small"
                  onClick={handleRemoveAvatar}
                  disabled={loading || uploadingAvatar}
                >
                  <CloseIcon size="small" />
                </Styles.RemoveAvatarButton>
              </Tooltip>
            )}
          </Styles.AvatarWrapper>

          <TextField
            fullWidth
            label="Tên nhóm"
            placeholder="VD: Team Frontend"
            value={name}
            onChange={handleNameChange}
          />

          {uploadingAvatar && (
            <Styles.Subtitle variant="caption">
              Đang tải avatar…
            </Styles.Subtitle>
          )}
        </Styles.HeaderGrid>

        {/* Selected users */}
        {selected.length > 0 && (
          <Box mb={2}>
            <Styles.Subtitle variant="caption">
              Đã chọn ({selected.length})
            </Styles.Subtitle>
            <Styles.Stacks direction="row" spacing={1} mt={1}>
              {selected.map((id) => {
                const u = users.find(
                  (x) => String(x.userId) === id || x.id === id
                );

                return (
                  <Chip
                    key={id}
                    avatar={<Avatar src={u?.avatar?.[0]} />}
                    label={u?.name}
                    onDelete={handleDeleteUser(id)}
                    size="small"
                  />
                );
              })}
            </Styles.Stacks>
          </Box>
        )}

        <Divider />

        {/* Search */}
        <Styles.TextFields
          fullWidth
          size="small"
          placeholder="Tìm nhân viên…"
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <Styles.InputAdornmentd>
                <SearchOutlinedIcon size="small" />
              </Styles.InputAdornmentd>
            ),
          }}
        />

        <Styles.Subtitle variant="caption" mt={1}>
          Chọn thành viên
        </Styles.Subtitle>

        {/* Users list */}
        <Styles.UserList dense>
          {displayUsers.map((u) => {
            const checked = selected.includes(u.id);

            return (
              <Styles.UserItem
                key={u.id}
                checked={checked}
                onClick={handleToggleUser(u.id)}
              >
                <Checkbox
                  checked={checked}
                  onClick={handleCheckboxClick}
                />

                <ListItemAvatar>
                  <Avatar src={u.avatar?.[0]}>
                    {u.name?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={u.name}
                  secondary={u.email}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </Styles.UserItem>
            );
          })}

          {displayUsers.length === 0 && (
            <Styles.Subtitle
              variant="body2"
              align="center"
              mt={2}
            >
              Không có người dùng phù hợp
            </Styles.Subtitle>
          )}
        </Styles.UserList>
      </Styles.StyledContent>

      {/* Actions */}
      <Styles.StyledActions>
        <Button onClick={onClose} disabled={loading || uploadingAvatar}>
          Huỷ
        </Button>
        <Button
          variant="contained"
          disabled={!canCreate}
          onClick={handleCreate}
        >
          {loading ? "Đang tạo…" : "Tạo nhóm"}
        </Button>
      </Styles.StyledActions>
    </Styles.StyledDialog>
  );
};

export default CreateGroupModal;
