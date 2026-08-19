import { Avatar, LinearProgress, Slider, ListItemIcon, styled, Box, ListItem, Popover } from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import MenuIcon from "@mui/icons-material/Menu";
import EditIcon from "@mui/icons-material/Edit";
import { SkyBox, SkyGrid, SkyTypography, SkyDivider, SkyIconButton, SkyButton, SkyTableContainer, SkyTableCell, SkyFormControlLabel } from "@styles/SkyStyles";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { VisibilityOutlined, ExpandMore, ExpandLess, Apps, CheckCircleOutlined, ChatBubbleOutlineOutlined, HistoryOutlined, GroupOutlined } from "@mui/icons-material";


export const StyledBoxContainerContent = styled(SkyBox, {
  shouldForwardProp: (prop) =>
    prop !== "styledMarginTop" &&
    prop !== "fullHeight" &&
    prop !== "styledMargin" &&
    prop !== "fixedHeight",
})(({ theme, styledMarginTop, fullHeight, fixedHeight }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 6,
  border: `1px solid #c9c5c5 `,
  // marginBottom: theme.spacing(2),
  marginTop: styledMarginTop ? theme.spacing(2.5) : 0,
  padding: '10px 20px 20px 20px',
  ...(fullHeight && { height: "100%" }),
  ...(fixedHeight && {
    height: fixedHeight,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  }),
  [theme.breakpoints.down("lg")]: {
    // Add margin bottom when stacked
    marginBottom: 16,
  }
}));

// Wrapper cố định chiều cao cho FileTreeTable bên trong box tài liệu
export const JobFileTreeWrapper = styled(SkyBox)(() => ({
  flex: 1,
  height: 280,
  overflowY: "auto",
  overflowX: "hidden",
}));

// Wrapper scroll cho nội dung lịch sử & bình luận bên trong box cố định chiều cao
export const JobScrollWrapper = styled(SkyBox)(() => ({
  flex: 1,
  // overflowY: "auto",
  // overflowX: "hidden",
}));

export const JobMainContent = styled(SkyBox)(({ theme }) => ({
  paddingTop: theme.spacing(1.25),
  // backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F9FAFB",
}));

export const JobSectionTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mt" && prop !== "mb",
})(({ theme, mt, mb }) => ({
  marginTop: mt ? theme.spacing(mt) : 0,
  marginBottom: mb !== undefined ? theme.spacing(mb) : theme.spacing(2), // Tăng lên ~20px
  // color: theme.palette.primary.main,
  fontWeight: "600",
  fontSize: "1.25rem", // Đảm bảo kích thước chuẩn
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  color: '#17191C'
}));

export const JobButtonContainer = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  ...(theme.palette.mode === 'dark' && {
    '& .MuiButton-root': {
      color: 'white',
    },
  }),
}));

export const StyledClearIcon = styled(ClearIcon)(() => ({
  fontSize: "1.25rem",
  cursor: "pointer",
}));

export const JobCommentGridContainer = styled(SkyGrid, {
  shouldForwardProp: (prop) => prop !== "styledMarginTop",
})(({ theme, styledMarginTop }) => ({
  marginTop: styledMarginTop ? theme.spacing(2.5) : 0,
  alignItems: "stretch",
  "& > .MuiGrid-item": {
    display: "flex",
    flexDirection: "column",
  },
}));

export const JobUploadPlaceholderBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const JobPlaceholderText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const JobDeleteIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const JobContentWrapper = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  maxHeight: "500px",
}));





export const JobCommentSection = styled(SkyBox)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(1),
  flex: 1,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "4px",
}));

export const ReasonsDelayJobSection = styled(SkyBox)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  // padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  overflowY: "auto",
  flex: 1,
}));

export const StyleJobComment = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));


export const JobCommentBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level" && prop !== "isNewest" && prop !== "hasLeftBorder",
})(({ theme, level, isNewest, hasLeftBorder }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  backgroundColor: isNewest ? "rgba(233, 92, 106, 0.04)" : '#ffff',
  border: `1px solid ${theme.palette.mode === "dark" ? "transparent" : "#e2e8f0"}`,
  borderLeft: hasLeftBorder ? `4px solid ${isNewest ? "#E95C6A" : "#E2E8F0"}` : undefined,
  borderRadius: 12,
  padding: theme.spacing(2),
  maxWidth: "100%",
  width: "98%",
  boxSizing: "border-box",
  boxShadow: theme.palette.mode === "dark"
    ? "none"
    : level > 0
      ? "none"
      : "0 2px 8px rgba(0, 0, 0, 0.04)",
}));

export const JobCommentItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  display: "block",
  marginBottom: theme.spacing(2.5),
  marginLeft: level ? theme.spacing(level * 6) : 0,
  width: "auto", // Để margin-left hoạt động mà không bị tràn
  boxSizing: "border-box",
}));

export const ReasonsDelayJobItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  display: "block",
  marginBottom: theme.spacing(4),
  marginLeft: level ? theme.spacing(level * 6) : 0,
  width: "auto",
  boxSizing: "border-box",
}));

export const JobCommentHeader = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  // marginBottom: theme.spacing(0.5),
}));
export const JobCommentUserInfo = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: '100%',
}));

export const JobCommentAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
}));

export const JobCommentContent = styled(SkyTypography)(({ theme }) => ({
  marginTop: theme.spacing(1.5), // Tăng khoảng cách từ text lên header
  color: theme.palette.text.primary,
  overflowWrap: "break-word",
  wordBreak: "break-word",

  "& *": {
    overflowWrap: "break-word",
    wordBreak: "break-word",
  },
}));

export const JobCommentActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(1),
}));

export const JobCommentActionText = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "userLiked",
})(({ theme, userLiked }) => ({
  cursor: "pointer",
  color: userLiked ? theme.palette.primary.main : theme.palette.text.secondary,
  fontWeight: userLiked ? "bold" : "normal",
  "&:hover": {
    color: theme.palette.primary.main,
  },
}));

export const JobProgressWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const JobProgressBarContainer = styled(SkyBox)(() => ({
  flexGrow: 1,
}));

export const JobLinearProgress = styled(LinearProgress)(() => ({
  height: 12,
  borderRadius: 6,
  backgroundColor: "#e0e0e0",
  "& .MuiLinearProgress-bar": {
    backgroundColor: "#ffb400",
  },
}));

export const JobProgressPercentText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  color: theme.palette.text.primary,
}));

export const JobHeaderSubtitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mb",
})(({ theme, mb }) => ({
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(mb !== undefined ? mb : 1),
}));

export const JobStatusColumn = styled(SkyGrid)(({ theme }) => ({
  textAlign: "left",
  [theme.breakpoints.up("md")]: {
    textAlign: "right",
  },
}));

export const JobStatusContainer = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "100%",
}));

export const JobHeaderWrapper = styled(SkyBox)(() => ({
  // Removed padding to allow Grid container to align with other blocks properly
}));


export const JobStatusText = styled(SkyTypography)(() => ({
  display: 'inline-block',
}));

export const JobStatusButtonWrapper = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "noMarginTop",
})(({ theme, noMarginTop }) => ({
  marginTop: noMarginTop ? 0 : theme.spacing(1),
  display: "inline-block",
  '& .MuiButton-root': {
    borderRadius: '50%',
    minWidth: 0,
    width: 40,
    height: 40,
    padding: 0,
    ...(theme.palette.mode === 'dark' && {
      color: 'white',
      borderColor: 'rgba(255, 255, 255, 0.5)',
    }),
  },
}));

export const JobSectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  // marginBottom: theme.spacing(2),
  ...(theme.palette.mode === 'dark' && {
    '& .MuiButton-root': {
      color: 'white',
    },
  }),
}));

export const JobSubTaskHeader = styled(SkyBox)(() => ({
  marginTop: '24px',
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const JobSubTaskTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  marginTop: theme.spacing(0),
  maxHeight: "unset",
}));

export const JobSubTaskProgressWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const JobSubTaskProgress = styled(LinearProgress)(() => ({
  width: 100,
  height: 8,
  borderRadius: 4,
}));

const getStatusColor = (status) => {
  if (status === "Hoàn thành") return "success";
  if (status === "Đang thực hiện") return "primary";
  return "inherit";
};

export const JobSubTaskStatusButton = styled(({ taskStatus, ...props }) => (
  // eslint-disable-next-line react/forbid-component-props
  <SkyButton {...props} variant="outlined" color={getStatusColor(taskStatus)} />
))({});

export const JobCommentDivider = styled(SkyDivider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
}));
export const BoderBox = styled(Box)(() => ({
  border: "1px solid #b9c1cb",
  padding: "20px",
  borderRadius: "10px"
}));

export const JobCommentInputContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  position: "relative",
  "& .MuiInputBase-root": {
    minHeight: 69,
    borderRadius: "16px",
    paddingRight: "56px",
    paddingLeft: "16px",
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#E2E8F0"}`,
    boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 2px 8px ${theme.palette.primary.main}15`,
    },
    "&.Mui-focused": {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}20`,
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none !important",
  }
}));

export const JobSlider = styled(Slider)(({ $colr }) => ({
  // MUI Slider dùng CSS var này internally
  height: 12,
  "& .MuiSlider-track": {
    border: "none",
    backgroundColor: $colr,
  },
  "& .MuiSlider-thumb": {
    height: 24,
    width: 24,
    backgroundColor: "#fff",
    border: "2px solid currentColor",
    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "inherit",
    },
    "&:before": {
      display: "none",
    },
  },
  "& .MuiSlider-rail": {
    opacity: 1,
    backgroundColor: "#e0e0e0",
  },
  color: "#2364B0", // giữ lại để set thumb/track shorthand
}));

export const HistoryTableContainer = styled(SkyTableContainer)(() => ({
  flex: 1,
  overflowY: "auto",
}));

export const StyledMenuIcon = styled(MenuIcon)(() => ({
  color: '#565D6D',
}));

export const JobEditButton = styled(SkyButton)(({ theme }) => ({
  borderRadius: '50%',
  minWidth: 0,
  width: 40,
  height: 40,
  padding: 0,
  ...(theme.palette.mode === 'dark' && {
    color: 'white',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  }),
}));

export const JobWhiteButton = styled(SkyButton)(({ theme }) => ({
  ...(theme.palette.mode === 'dark' && { color: 'white' }),
}));

export const JobMoreActionsContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  ...(theme.palette.mode === 'dark' && {
    '& .MuiButton-root': { color: 'white' },
  }),
}));

export const JobActionOutlineButton = styled(SkyButton)(() => ({
  color: '#475569',
  backgroundColor: '#fff',
  textTransform: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  padding: '6px 16px',
  border: '1px solid #E2E8F0',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    boxShadow: 'none',
  },
  '& .MuiSvgIcon-root': {
    color: '#475569',
    fontSize: '18px',
  }
}));

export const JobPillOutlineButton = styled(SkyButton)(() => ({
  color: '#2364B0',
  backgroundColor: '#fff',
  textTransform: 'none',
  borderRadius: '20px',
  fontWeight: 500,
  padding: '2px 12px',
  border: '1px solid #94A3B8',
  fontSize: '13px',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    boxShadow: 'none',
  },
}));

export const JobSubTaskActionContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

export const JobCommentUserName = styled(SkyTypography)(() => ({
  fontWeight: "bold",
}));

export const StyledHistoryTableCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) => prop !== "width",
})(({ width }) => ({
  width: width || "auto",
}));

export const mentionPopoverPaperStyle = {
  width: "300px",
  maxHeight: "250px",
  overflow: "auto"
};

export const JobDeleteButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const JobCommentTime = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const JobCommentMenuIcon = styled(StyledMenuIcon)(() => ({
  fontSize: "1.25rem",
}));

export const HistoryActionCell = styled(SkyTableCell)(() => ({
  width: "45%",
}));

export const HistoryUserCell = styled(SkyTableCell)(() => ({
  width: "30%",
}));

export const HistoryTimeCell = styled(SkyTableCell)(() => ({
  width: "25%",
}));
export const StyledListItemIcon = styled(ListItemIcon)(({ theme }) => ({
  color: theme.palette.primary?.main,          // Kế thừa từ parent (MenuItem)
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,               // (tùy chọn) giữ khoảng cách đẹp
  '& .MuiSvgIcon-root': {
    fontSize: '1.25rem',      // (tùy chọn) đồng bộ kích thước icon
  },
}));

export const JobCommentActionsLeft = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  flexWrap: "wrap",
}));

export const JobCommentLikeContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "userLiked",
})(({ theme, userLiked }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  cursor: "pointer",
  // color: userLiked ? theme.palette.primary.main : theme.palette.text.disabled,/
  fontWeight: userLiked ? "bold" : "normal",
}));

export const JobLike = styled(SkyIconButton, {
  shouldForwardProp: (prop) => prop !== "userLiked",
})(({ theme, userLiked }) => ({
  cursor: "pointer",
  color: userLiked ? "#fff" : theme.palette.text.disabled,
  fontWeight: userLiked ? "bold" : "normal",
  backgroundColor: userLiked ? theme.palette.primary.main : "transparent",
  borderRadius: "50%",
  width: 28,
  height: 28,
  padding: 0,

  "&:hover": {
    backgroundColor: userLiked
      ? theme.palette.primary.main // giữ nguyên màu khi liked
      : "transparent",             // không bị phủ hover mặc định
  },
}));


export const JobCommentEditedText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
export const JobCommentBody = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
}));

export const JobLikeCount = styled(SkyTypography)(() => ({
  fontWeight: "inherit",
}));

export const JobLikeIcon = styled(ThumbUpIcon)(() => ({
  fontSize: "1.1rem",
}));

export const JobCommentReplyToggleContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: 'flex',
}));

export const JobCommentReplyToggle = styled(JobCommentActionText)(() => ({
  display: 'flex',
  alignItems: 'center',
  fontWeight: 500,
}));

export const JobCommentSendIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: "#fff",
  backgroundColor: theme.palette.primary.main,
  width: 36,
  height: 36,
  borderRadius: "50%",
  position: "absolute",
  right: 12,
  bottom: 12,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
  boxShadow: "0px 3px 10px rgba(21, 101, 192, 0.4)",
  transition: "all 0.2s ease-in-out",
  zIndex: 2,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    boxShadow: "0px 5px 14px rgba(21, 101, 192, 0.5)",
    transform: "scale(1.05)",
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.2rem",
    color: "#fff",
    transform: "translate(3px, -2px) rotate(-45deg)",
  },
  "&.Mui-disabled": {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    boxShadow: "none",
  }
}));

export const JobExpandMoreIcon = styled(ExpandMore)(() => ({
  fontSize: "1.1rem",
  marginRight: 4,
}));

export const JobExpandLessIcon = styled(ExpandLess)(() => ({
  fontSize: "1.1rem",
  marginRight: 4,
}));

export const JobLikePopoverPaperProps = {
  style: { width: 250, maxHeight: 300 }
};

export const JobLikePopover = styled(Popover)(() => ({
  pointerEvents: 'none',
}));

export const JobLikeListItem = styled(ListItem)(() => ({
  padding: '8px 16px 4px 16px',
}));

export const JobLikeListItemDense = styled(ListItem)(() => ({
  padding: '8px 16px',
}));

export const JobLikeAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  fontSize: '0.9rem',
  marginRight: theme.spacing(1.5),
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
}));

export const JobBreadcrumbContainer = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  padding: 0,
  background: "transparent",
  borderRadius: "0px",
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap",
  overflow: "hidden",
  gap: "4px",
}));

export const JobBreadcrumbItem = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isLast",
})(({ theme, isLast }) => ({
  fontSize: 13,
  fontWeight: isLast ? 600 : 400,
  color: isLast ? "#1e88e5" : "#64748B",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "180px",
  cursor: isLast ? "default" : "pointer",
  "&:hover": {
    color: isLast ? "#1e88e5" : theme.palette.primary.main,
    ...(!isLast && { textDecoration: "underline" }),
  },
}));

export const JobBreadcrumbSeparator = styled(SkyTypography)(() => ({
  margin: "0 4px",
  fontSize: 13,
  color: "#64748B",
}));

export const StyledBoxContainerContentHeader = styled(StyledBoxContainerContent)(() => ({
  padding: '16px',
  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
}));

export const JobTitleText = styled(SkyTypography)(() => ({
  fontWeight: 600,
  color: '#1E293B',
  marginBottom: '4px',
  fontSize: '30px !important',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

export const JobSubtext = styled(SkyTypography)(() => ({
  color: '#64748B',
  marginBottom: '16px',
}));

export const JobProgressLabel = styled(JobHeaderSubtitle)(() => ({
  color: '#64748B',
  textTransform: 'uppercase',
  marginBottom: '8px',
}));

export const JobProgressFlexContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}));

export const JobProgressBarContainerHeader = styled(JobProgressBarContainer)(() => ({
  width: '100%',
  padding: 0,
}));

export const JobProgressPercent = styled(SkyTypography)(() => ({
  fontWeight: 700,
  color: '#2364B0',
}));

export const JobProgressHeaderRow = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
}));

export const JobStatusBox = styled(StyledBoxContainerContent)(({ theme }) => ({
  backgroundColor: '#D4E4F7',
  padding: '26px',
  borderRadius: '8px',
  border: 'none',
  boxShadow: theme.palette.mode === "dark" ? "none" : "0px 4px 24px rgba(0, 0, 0, 0.08)",
}));

export const JobStatusTitle = styled(SkyTypography)(() => ({
  color: '#64748B',
  marginBottom: '8px',
}));

export const JobStatusPillRow = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '16px',
}));

export const JobStatusPill = styled(Box)(() => ({
  backgroundColor: '#2364B0',
  color: '#fff',
  padding: '4px 16px',
  borderRadius: '16px',
  fontWeight: 700,
  fontSize: '14px',
}));

export const JobStatusPillProject = styled(Box)(() => ({
  // backgroundColor: '#2364B0',
  color: '#fff',
  padding: '4px 0px',
  borderRadius: '16px',
  fontWeight: 700,
  fontSize: '14px',
}));

export const JobStatusEditButton = styled(Box)(() => ({
  backgroundColor: '#2364B0',
  color: '#fff',
  borderRadius: '50%',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  '& svg': {
    fontSize: '18px',
  },
}));

export const JobStatusDatesRow = styled(Box)(() => ({
  display: 'flex',
  gap: '16px',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  marginBottom: '16px',
}));

export const JobStatusDateItem = styled(Box)(() => ({
}));

export const JobStatusDateLabel = styled(SkyTypography)(() => ({
  color: '#0D2540B3'
}));

export const JobStatusDateValue = styled(SkyTypography)(() => ({
  fontWeight: 700,
  color: '#0D2540',
}));

export const JobStatusPriorityRow = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  marginTop: '4px',
}));

export const JobStatusPriorityIcon = styled('span')(() => ({
  color: '#EF4444',
  border: '1px solid #EF4444',
  borderRadius: '50%',
  width: '16px',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 700,
}));

export const JobStatusEditIcon = styled(EditIcon)(() => ({
  fontSize: '14px',
}));

export const JobTooltipContainer = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
}));

export const JobTooltipText = styled(SkyTypography)(() => ({

}));



export const WeeklyDaysContainer = styled(SkyBox)(() => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0px 20px',
  // marginTop: theme.spacing(1),
}));

export const WeeklyDaysGridItem = styled(SkyGrid)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  paddingBottom: theme.spacing(1),
}));

export const MonthlyOptionRow = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'mb',
})(({ theme, mb }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(mb || 1),
  flexWrap: 'wrap',
}));

export const RecurringFieldsGrid = styled(SkyGrid, {
  shouldForwardProp: (prop) => prop !== 'mt',
})(({ theme, mt }) => ({
  marginTop: mt ? theme.spacing(mt) : 0,
}));

export const RecurringFieldsSpacer = styled(SkyBox)(({ theme }) => ({
  height: theme.spacing(2),
}));



export const ConfirmDialogContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "justify",
}));

export const ConfirmDialogIconWrapper = styled(SkyBox)(() => ({
  // marginBottom: theme.spacing(2),
  "& .MuiSvgIcon-root": {
    fontSize: 40,
    color: "#ff9800",
  },
}));

export const ConfirmDialogText = styled(SkyTypography)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const ConfirmDialogSubText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const RedText = styled(SkyTypography)(() => ({
  color: "#000",
  fontWeight: "bold",
  fontSize: "1.25rem",
  marginLeft: 22
}));



export const JobNoteContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "100%",
  padding: theme.spacing(0.5),
  borderRadius: "6px",
}));

export const JobNoteIcon = styled(VisibilityOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: "pointer",
}));

export const JobNoteText = styled(SkyTypography)(({ theme, note }) => ({
  color: note ? theme.palette.primary.main : theme.palette.text.primary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const UploadDropZone = styled(Box, {
  shouldForwardProp: (prop) => !["isDragging", "flex", "maxHeightValue"].includes(prop),
})(({ theme, isDragging, flex, maxHeightValue }) => ({
  position: "relative",
  border: isDragging ? `2px dashed ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: isDragging ? "rgba(25, 118, 210, 0.08)" : "#fff",
  transition: "all 0.3s ease",
  minHeight: isDragging ? 180 : "50px",
  maxHeight: maxHeightValue || "600px",
  overflow: "auto",
  flex: flex || "none",
  "&::after": isDragging ? {
    content: '"Thả tệp hoặc thư mục vào đây để tải lên"',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(25, 118, 210, 0.12)",
    color: theme.palette.primary.main,
    fontWeight: "bold",
    fontSize: "1.1rem",
    zIndex: 100,
    pointerEvents: "none",
    borderRadius: 8,
    textAlign: "center",
    padding: theme.spacing(2),
  } : {},
}));

export const DocumentsGridItem = styled(SkyGrid)({
  display: 'flex',
  flexDirection: 'column',
});

export const DelegatedNoteText = styled(SkyTypography)(({ theme }) => ({
  color: '#ca1103ff',
  fontWeight: 'bold',
  marginLeft: theme.spacing(1),
}));

export const BoldSkyFormControlLabel = styled(SkyFormControlLabel)(({ theme }) => ({
  "& .MuiFormControlLabel-label": {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  "&.Mui-disabled .MuiFormControlLabel-label": {
    color: theme.palette.text.primary,
  },
}));

export const ParticipantInfoContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(6),
  paddingTop: 0,
  height: "100%",
}));

export const ParticipantInfoContainerCompact = styled(ParticipantInfoContainer)({
  marginBottom: -10,
  marginTop: -15,
});

export const SkyFlexGap16Center = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  gap: 30,
  marginBottom: 5
});

export const StytedDescriptionIcon = () => (
  <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
    <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
    <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
    <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
    <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
  </svg>
)

export const StytedPeopleIcon = styled(GroupOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  width: 26,
  height: 26,
}))

export const StyledCheckOutLineIcon = styled(CheckCircleOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  width: 26,
  height: 26,
}))

export const StytedAppsIcon = styled(Apps)(({ theme }) => ({
  color: theme.palette.primary.main,
  width: 26,
  height: 26,
}))
export const StytedChatBubbleIcon = styled(ChatBubbleOutlineOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  width: 26,
  height: 26,
}))

export const StytedHistoryIcon = styled(HistoryOutlined)(({ theme }) => ({
  color: theme.palette.primary.main,
  width: 26,
  height: 26,
}))

export const StyleLine = styled(SkyBox)({
  height: 1,
  borderBottom: `1px solid #dce0e5af`,
  marginTop: 20,
  marginBottom: 17,
  flex: 1,
})


export const StytedProgressWrapper = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
}))

export const StytedAddJob = styled(SkyGrid)(() => ({
  display: 'flex', alignItems: 'center'
}))