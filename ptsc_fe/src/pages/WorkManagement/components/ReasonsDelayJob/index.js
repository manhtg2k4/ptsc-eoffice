import React, { memo, useCallback, useMemo, useState } from "react";
import CustomInput from "@components/CustomInput/CustomInputBase";
import {
  DeleteOutline,
  Edit,
  InfoOutlined,
  Menu as MenuIcon,
  SendOutlined,
} from "@mui/icons-material";
import { styled } from "@mui/material";
import {
  SkyBox,
  SkyIconButton,
  SkyListItemText,
  SkyMenu,
  SkyMenuItem,
  SkyTypography,
} from "@styles/SkyStyles";
import dayjs from "dayjs";
import { StyledListItemIcon } from "@pages/WorkManagement/components/Job.styles";
import { useToast } from "@components/common/ToastProvider";
import {
  addCommentToJob,
  deleteCommentInJob,
  updateCommentInJob,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { useDispatch, useSelector } from "react-redux";
import LoadingDialog from "@components/LoadingDialog";
import { CustomDialog } from "@components/CustomDialog";

const SkyEditIcon = styled(Edit)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const SkyDeleteIcon = styled(DeleteOutline)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyleSkyListItemText = styled(SkyListItemText)(({ theme }) => ({
  "& .MuiListItemText-primary": {
    color: theme.palette.primary.main,
  },
}));

const DelayWrapper = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
}));

const DelayTitleRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(1.8),
}));

const DelayTitleIcon = styled(InfoOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: "1.35rem",
  marginRight: theme.spacing(2.4),
  marginLeft: theme.spacing(1),
}));

const DelayTitleText = styled(SkyTypography)(() => ({
  fontWeight: 600,
  fontSize: "1.25rem",
  color: "#1f2937",
}));

const DelayPanel = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#ffffff",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.25)" : "#dbe3eb"
    }`,
  borderRadius: 12,
  padding: theme.spacing(1.5),
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

const DelayListSection = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  maxHeight: 320,
  overflowY: "auto",
  paddingRight: theme.spacing(0.5),
}));

const DelayItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isNewest",
})(({ theme, isNewest }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
  backgroundColor: isNewest ? "#fff4f6" : "#ffffff",
  border: `1px solid ${isNewest ? "#f3d8de" : "#e5e7eb"}`,
  borderRadius: 12,
  padding: theme.spacing(1.5),
}));

const DelayAccentBar = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isNewest",
})(({ isNewest }) => ({
  width: 4,
  minWidth: 4,
  borderRadius: 999,
  alignSelf: "stretch",
  backgroundColor: isNewest ? "#ef5b6a" : "#d1d5db",
}));

const DelayAvatar = styled(SkyBox)(() => ({
  width: 36,
  height: 36,
  minWidth: 36,
  borderRadius: "50%",
  backgroundColor: "#cbd5e1",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.95rem",
  fontWeight: 700,
  marginTop: 2,
}));

const DelayItemBody = styled(SkyBox)(() => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
}));

const DelayItemHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const DelayUserName = styled(SkyTypography)(() => ({
  fontWeight: 700,
  color: "#111827",
  fontSize: "1.15rem",
}));

const DelayTime = styled(SkyTypography)(() => ({
  color: "#6b7280",
  fontSize: "0.95rem",
  whiteSpace: "nowrap",
}));

const DelayItemContentRow = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(0.75),
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: theme.spacing(1.5),
}));

const DelayContentText = styled(SkyTypography)(() => ({
  flex: 1,
  color: "#1f2937",
  fontSize: "1.03rem",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}));

const DelayMenuButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#9ca3af" : "#6b7280",
  padding: 4,
  marginBottom: 2,
}));

const DelayMenuIcon = styled(MenuIcon)(() => ({
  fontSize: "1.1rem",
}));

const DelayInputSection = styled(SkyBox)(({ theme }) => ({
  marginTop: "auto",
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.35)" : "#dbe3eb"
    }`,
}));

const DelayInputContainer = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  "& .MuiInputBase-root": {
    minHeight: 96,
    borderRadius: 10,
    alignItems: "flex-start",
    padding: theme.spacing(1.5, 6.5, 1.5, 1.5),
    backgroundColor: theme.palette.mode === "dark" ? "#0b1220" : "#ffffff",
    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.35)" : "#dce3ea"
      }`,
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none !important",
  },
  "& .MuiInputBase-inputMultiline": {
    fontSize: "1rem",
    lineHeight: 1.5,
    padding: 0,
  },
}));

const DelaySendButton = styled(SkyIconButton)(({ theme }) => ({
  position: "absolute",
  right: 10,
  bottom: 10,
  width: 34,
  height: 34,
  borderRadius: "50%",
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  boxShadow: "0 4px 10px rgba(21, 101, 192, 0.35)",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.05rem",
    transform: "none",
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    boxShadow: "none",
  },
}));

const ReasonsDelayJob = (props) => {
  const { reasons, handleEditReason, currentTaskId, fecthDataReasonsDelayJob } =
    props;

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const userData = useMemo(() => authUser || {}, [authUser]);

  const dispatch = useDispatch();
  const toast = useToast();

  const handleOpenMenu = useCallback((event, reason) => {
    setAnchorEl(event.currentTarget);
    setSelectedReason(reason);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setSelectedReason(null);
  }, []);

  const handleReasonChange = useCallback((e) => {
    setReasonText(e.target.value);
  }, []);

  const onEdit = useCallback(() => {
    if (handleEditReason && selectedReason) {
      handleEditReason(selectedReason);
    }
    if (selectedReason) {
      setEditingCommentId(selectedReason.id);
      setReasonText(selectedReason.content || "");
    }
    handleCloseMenu();
  }, [handleEditReason, selectedReason, handleCloseMenu]);

  const handleDeleteComment = useCallback(() => {
    setConfirmDeleteComment(true);
    setAnchorEl(null);
  }, []);

  const onDelete = useCallback(async () => {
    try {
      if (!selectedReason?.id) return;
      setIsLoading(true);
      await dispatch(
        deleteCommentInJob({
          documentId: currentTaskId,
          commentId: selectedReason.id,
        })
      ).unwrap();
      await fecthDataReasonsDelayJob?.();
      toast("Xóa lý do chậm tiến độ công việc thành công", "success");
      setConfirmDeleteComment(false);
      handleCloseMenu();
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentTaskId,
    dispatch,
    fecthDataReasonsDelayJob,
    toast,
    selectedReason,
    handleCloseMenu,
  ]);

  const handleReason = useCallback(async () => {
    const content = reasonText?.trim();
    if (!content) return;

    try {
      setIsLoading(true);
      const body = {
        type: "slowReason",
        userId: userData?.user?._id,
        userName: userData?.user?.name,
        content,
        fileId: [],
        mentionIds: [],
      };

      if (editingCommentId) {
        await dispatch(
          updateCommentInJob({
            documentId: currentTaskId,
            commentId: editingCommentId,
            content,
          })
        ).unwrap();
        toast("Cập nhật lý do chậm tiến độ công việc thành công", "success");
      } else {
        await dispatch(
          addCommentToJob({ documentId: currentTaskId, commentData: body })
        ).unwrap();
        toast("Thêm lý do chậm tiến độ công việc thành công", "success");
      }

      await fecthDataReasonsDelayJob?.();
      setEditingCommentId(null);
      setReasonText("");
      handleCloseMenu?.();
    } catch (error) {
      toast(error?.response?.data?.message || error?.data?.message || error?.message || "Có lỗi xảy ra", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentTaskId,
    reasonText,
    userData,
    dispatch,
    fecthDataReasonsDelayJob,
    toast,
    handleCloseMenu,
    editingCommentId,
  ]);

  const handleCloseDialog = useCallback(() => {
    setConfirmDeleteComment(false);
  }, []);

  return (
    <DelayWrapper>
      <DelayTitleRow>
        <DelayTitleIcon />
        <DelayTitleText>Lý Do Chậm Tiến Độ</DelayTitleText>
      </DelayTitleRow>

      <DelayPanel>
        <DelayListSection>
          {reasons?.map((reason, i) => (
            <DelayItem key={reason.id || i} isNewest={i === 0}>
              <DelayAccentBar isNewest={i === 0} />
              <DelayAvatar>
                {reason.userName ? reason.userName.charAt(0).toUpperCase() : "U"}
              </DelayAvatar>

              <DelayItemBody>
                <DelayItemHeader>
                  <DelayUserName variant="subtitle2">
                    {reason.userName}
                  </DelayUserName>
                  <DelayTime variant="caption">
                    {reason.createdAt
                      ? dayjs(reason.createdAt).format("DD/MM/YYYY HH:mm")
                      : ""}
                  </DelayTime>
                </DelayItemHeader>

                <DelayItemContentRow>
                  <DelayContentText variant="body2">
                    {reason.content}
                  </DelayContentText>
                  <ReasonMenu reason={reason} handleOpenMenu={handleOpenMenu} />
                </DelayItemContentRow>
              </DelayItemBody>
            </DelayItem>
          ))}
        </DelayListSection>

        <DelayInputSection>
          <DelayInputContainer>
            <CustomInput
              fullWidth
              placeholder="Nhập lý do chậm tiến độ của công việc..."
              multiline
              minRows={3}
              value={reasonText}
              onChange={handleReasonChange}
            />
            <DelaySendButton
              size="small"
              onClick={handleReason}
              disabled={!reasonText?.trim()}
            >
              <SendOutlined />
            </DelaySendButton>
          </DelayInputContainer>
        </DelayInputSection>
      </DelayPanel>

      <SkyMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <SkyMenuItem onClick={onEdit}>
          <StyledListItemIcon>
            <SkyEditIcon />
          </StyledListItemIcon>
          <StyleSkyListItemText primary="Sửa" />
        </SkyMenuItem>
        <SkyMenuItem onClick={handleDeleteComment}>
          <StyledListItemIcon>
            <SkyDeleteIcon />
          </StyledListItemIcon>
          <StyleSkyListItemText primary="Xóa" />
        </SkyMenuItem>
      </SkyMenu>

      <LoadingDialog open={loading}>Đang tải tài liệu, vui lòng đợi...</LoadingDialog>
      <CustomDialog
        open={confirmDeleteComment}
        onClose={handleCloseDialog}
        onSave={onDelete}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
      >
        Bạn có muốn xóa không?
      </CustomDialog>
    </DelayWrapper>
  );
};

const ReasonMenu = memo(({ reason, handleOpenMenu }) => {
  const onClick = useCallback(
    (e) => {
      handleOpenMenu(e, reason);
    },
    [handleOpenMenu, reason]
  );

  return (
    <DelayMenuButton size="small" onClick={onClick}>
      <DelayMenuIcon />
    </DelayMenuButton>
  );
});

ReasonMenu.displayName = "ReasonMenu";

export default memo(ReasonsDelayJob);
