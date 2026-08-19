import { styled, keyframes } from "@mui/material/styles";
import {
  Avatar,
  AvatarGroup,
  IconButton,
  LinearProgress,
  Box,
  Skeleton,
} from "@mui/material";
import {
  SkyBox,
  SkyTypography,
 
  SkyStack,
  SkyPaper,
  SkyTitle,
  SkyButton,
} from "@styles/SkyStyles.js";
import { ButtonOutline } from "@pages/RecallPage/components/ViewRecall.styles";

// ─── Keyframes ────────────────────────────────────────────────────────────────
export const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
`;

export const barGrow = keyframes`
  from { transform: scaleX(0); transform-origin: left; }
  to   { transform: scaleX(1); transform-origin: left; }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

export const PanelContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  position: "fixed",
  top: 63,
  right: 0,
  width: open ? "32%" : 0,
  
  height: "calc(100vh - 60px)",
  zIndex: 1300,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#FFFFFF",
  display: "flex",
  flexDirection: "column",
  boxShadow: open ? "-6px 0 28px rgba(0,0,0,0.07)" : "none",
  opacity: open ? 1 : 0,
  overflow: "hidden",
  transform: open ? "scale(1)" : "scale(0.95)",
  transformOrigin: "right center",
  transition: "opacity 350ms cubic-bezier(.4, 0, .2, 1), transform 350ms cubic-bezier(.4, 0, .2, 1), width 350ms cubic-bezier(.4, 0, .2, 1)",
  pointerEvents: open ? "auto" : "none",
  borderLeft: open ? `1px solid ${theme.palette.divider}` : "none",
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  "& *": {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif !important',
  },
  [theme.breakpoints.down("sm")]: {
    width: open ? "100vw" : 0,
    height: "100vh",
    top: 0,
  },
}));


export const PanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: 97,
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#FFF",
  flexShrink: 0,
}));

export const PanelTitleContainer = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  flex: 1,
  gap: 8,
  minWidth: 0,
});

export const PanelTitleLabel = styled(SkyTitle)(() => ({
  textTransform: "uppercase",
  color: '#323943',
  whiteSpace: "nowrap",
  fontSize:'1rem',
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginLeft: '30px',
  marginBottom:0
}));

export const PanelBody = styled(SkyBox)({
  flex: 1,
  overflowY: "auto",
  padding: "20px 30px 32px",
  animation: `${fadeSlideIn} 0.28s ease`,
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 4,
  },
});

export const XemThemButton = styled(ButtonOutline)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "4px 12px",
  border: `1px solid ${theme.palette.primary.main}`,
  color: theme.palette.primary.main,
  backgroundColor: "transparent",
  minWidth: 0,
  borderRadius: "25px",
  textTransform: "none",
 "&:hover": {
    backgroundColor: '#75b9e147',
    border: `1px solid #96d3f7ff`,
  },
}));

export const PillChip = styled(Box, {
  shouldForwardProp: (prop) => prop !== "colortype",
})(({ colortype }) => {
  const bgMap = {
    red: "#ef4444",
    blue: "#1d4ed8",
    orange: "#ea580c",
    green: "#16a34a",
    gray: "#64748b",
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 16,
    fontSize: 11,
    fontWeight: 700,
    color: "#FFFFFF",
    backgroundColor: bgMap[colortype] || colortype || bgMap.gray,
    textTransform: "uppercase",
  };
});

export const TaskTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.5rem",
  fontWeight: 700,
  marginTop: theme.spacing(2.3),
  marginBottom: theme.spacing(2.3),
}));

export const InfoCard = styled(SkyPaper)(() => ({
  borderRadius: 10,
  padding: "0 !important",
  boxShadow: "none",
  marginBottom: '30px',
}));

export const InfoLabel = styled(SkyTypography)({
  fontSize: "1rem",
  fontWeight: 700,
  marginBottom: "10px",
  color:'#323943'
});

export const TaskCodeLink = styled(SkyTypography)({
  color: "#2364B0",
  fontWeight: 700,
  fontSize: "1rem",
});

export const InfoValue = styled(SkyTypography)({
  fontWeight: 700,
  fontSize: "1rem",
});

export const SectionLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#475569",
  marginBottom: 8,
  marginTop: theme.spacing(1),
}));

export const ProgressNumber = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ theme, col }) => ({
  fontSize: 42,
  fontWeight: 800,
  lineHeight: 1,
  color: col || "#2364B0",
  [theme.breakpoints.down("lg")]: {
    fontSize: 36,
  },
  [theme.breakpoints.down("md")]: {
    fontSize: 28,
  },
}));

export const DeadlineText = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: "#EF4444",
  textTransform: "uppercase",
  textAlign: "right",
  [theme.breakpoints.down("lg")]: {
    fontSize: 12,
  },
  [theme.breakpoints.down("md")]: {
    fontSize: 10,
  },
}));

export const StyledProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  height: 15,
  borderRadius: 999,
  overflow: "hidden",

  // màu nền
  backgroundColor: `${col || "#e2e8f0"}33`,

  "& .MuiLinearProgress-bar": {
    borderRadius: 999,

    // màu progress lấy từ API
    backgroundColor: `${col} !important`,

    animation: `${barGrow} 0.8s cubic-bezier(.4,0,.2,1)`,
  },
}));

export const DateHintText = styled(SkyTypography)({
  fontSize: 13,
  color: "#323943",
  fontWeight: 600,
  fontStyle:'italic'
});

export const AvatarRoleBox = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
});

export const RoleLabel = styled(SkyTypography)({
  fontSize: 12,
  fontWeight: 700,
  color: "#323943",
  textTransform: "uppercase",
});

// ─── Custom Layouts to avoid inline style props ───

export const HeaderActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const CloseButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.text.primary,
  "& .MuiSvgIcon-root": {
    fontSize: "1.25rem",
  },
}));

export const StatusContainer = styled(SkyStack)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const InfoCardContent = styled(SkyBox)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

export const InfoCardRight = styled(SkyBox)({
  textAlign: "right",
});

export const DescriptionWrapper = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(4),
}));

export const DescriptionBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#0F172A" : "#F3F5F6",
  borderRadius: 16,
  padding: theme.spacing(2, 2.5),
  border: `1px solid ${theme.palette.divider}`,
  minHeight: 115,
  display: "flex",
  alignItems: "flex-start",
  marginTop: theme.spacing(2.5),
}));

export const DescriptionText = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  fontStyle: "italic",
  color: theme.palette.text.secondary,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  overflow: "hidden",
 
  textOverflow: "ellipsis",
}));

export const ProgressHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(3),
}));

export const DateHintContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
}));

export const ParticipantsContainer = styled(SkyBox)(( ) => ({
  marginTop: '24px',
  marginBottom: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  width: "100%",
}));

 

export const StyledAvatarGroup = styled(AvatarGroup)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  // toàn bộ avatar trong group
  "& .MuiAvatarGroup-avatar": {
    width: 40,
    height: 40,
    fontSize: 12,
    fontWeight: 700,
    border: "2px solid #fff",

    // QUAN TRỌNG
    marginLeft: "-12px !important",

    backgroundColor: "#f1f5f9",
    color: "#475569",
    boxSizing: "border-box",
  },

 
});

export const AssignerAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  backgroundColor: `${col || "#dbeafe"} !important`,
  color: "#ffffff !important",
}));

export const DirectorAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  backgroundColor: `${col || "#dcfce7"} !important`,
  color: "#ffffff !important",
}));

export const SupporterAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  backgroundColor: `${col || "#fef3c7"} !important`,
  color: "#ffffff !important",
}));

export const ViewerAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  backgroundColor: `${col || "#f3e8ff"} !important`,
  color: "#ffffff !important",
}));

export const SurplusAvatar = styled(Avatar)({
  backgroundColor: "#f1f5f9 !important",
  color: "#475569 !important",
  fontSize: "12px",
  fontWeight: 700,
});

// ─── Subtask Section ─────────────────────────────────────────────────────────

export const SubtaskSectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: '30px',
  marginBottom: theme.spacing(1.5),
}));

export const SubtaskTitleLabel = styled(SkyTypography)({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#475569",
});

export const SubtaskCard = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 16,
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.mode === "dark" ? "#0F172A" : "#FFFFFF",
  maxHeight: 180,
  overflowY: "auto",
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 4,
  },
}));

export const SubtaskRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1.5, 0),
  "&:not(:last-child)": {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

export const SubtaskInfo = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  width: 270,
  flexShrink: 0,
});

export const SubtaskName = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
}));

export const SubtaskDate = styled(SkyTypography)({
  fontSize: 12,
  fontStyle: "italic",
  color: "#64748B",
});

export const SubtaskRight = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  flex: 1,
  minWidth: 0,
  paddingLeft: 16,
});

export const SubtaskProgressWrapper = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
});

export const SubtaskProgressBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  flex: 1,
  height: 8,
  borderRadius: 999,
  backgroundColor: `${col || "#1D4ED8"}33`,
  "& .MuiLinearProgress-bar": {
    borderRadius: 999,
    backgroundColor: `${col || "#1D4ED8"} !important`,
  },
}));

export const SubtaskProgressText = styled(SkyTypography)({
  fontSize: 13,
  fontWeight: 700,
  color: "#1D4ED8",
});

export const SubtaskAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  width: 28,
  height: 28,
  fontSize: 12,
  fontWeight: 700,
  backgroundColor: `${col || "#dbeafe"} !important`,
  color: "#ffffff !important",
}));

// ─── Attachment Section ──────────────────────────────────────────────────────

export const AttachmentSectionHeader = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: '30px',
  marginBottom: '12px',
}));

export const AttachmentCardContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "customMaxHeight",
})(({ theme, customMaxHeight }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 16,
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.mode === "dark" ? "#0F172A" : "#FFFFFF",
  maxHeight: customMaxHeight || 180,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 4,
  },
}));

export const EmptyText = styled(SkyTypography)({
  padding: 16,
  textAlign: "center",
  color: "#64748B",
  fontSize: 13,
});


export const AttachmentRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1, 1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F8FAFC",
  cursor: "pointer",
}));


export const AttachmentIconBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "col",
})(({ col }) => ({
  width: 40,
  height: 40,
  borderRadius: 10,
  backgroundColor: "#FFFFFF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.05)",
  color: col || "#1D4ED8",
}));

export const AttachmentInfo = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
});

export const AttachmentName = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}));

export const AttachmentSize = styled(SkyTypography)({
  fontSize: 12,
  color: "#64748B",
});

// ─── Tab Section ─────────────────────────────────────────────────────────────

export const TabBarContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F1F5F9",
  borderRadius: 999,
  padding: "4px 5px",
  marginTop: '30px',
  marginBottom: theme.spacing(2),
}));

export const TabButton = styled("button", {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  flex: 1,
  minWidth: 0,
  width: "100%",
  height: 28,
  padding: "0 16px",
  border: "none",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  backgroundColor: active ? (theme.palette.mode === "dark" ? "#0F172A" : "#FFFFFF") : "transparent",
  color: active ? "#1D4ED8" : "#64748B",
  boxShadow: active ? "0px 2px 4px rgba(0, 0, 0, 0.05)" : "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
  "& svg": {
    width: 14,
    height: 14,
    fontSize: "14px !important",
  },
  "&:hover": {
    color: active ? "#1D4ED8" : theme.palette.text.primary,
  },
}));

export const TabContentContainer = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 150,
});

// ─── Source Section ──────────────────────────────────────────────────────────

export const SourceCardContainer = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#F8FAFC",
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const SourceBadge = styled(SkyBox)(({ theme }) => ({
  width: 42,
  height: 42,
  borderRadius: 10,
  backgroundColor: theme.palette.mode === "dark" ? "#0F172A" : "#E0E7FF",
  color: "#1D4ED8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 16,
  flexShrink: 0,
}));

export const SourceInfo = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
});

export const SourceTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: theme.palette.text.primary,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.3,
}));

export const SourceSubtitle = styled(SkyTypography)({
  fontSize: 12,
  color: "#64748B",
  fontStyle: "italic",
  marginTop: 2,
});

export const SourceAvatarWrapper = styled(SkyBox)({
  position: "absolute",
  top: -15,
  right: 20,
  boxShadow: "0 4px 10px rgba(29, 78, 216, 0.3)",
  borderRadius: "50%",
  border: "2px solid #FFFFFF",
});


export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const StyledAvatar32 = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "$avatarColor",
})(({ $avatarColor }) => ({
  width: 32,
  height: 32,
  fontSize: 12,
  fontWeight: 700,
  backgroundColor: $avatarColor,
}));

export const FileListWrapper = styled(SkyBox)`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

export const StyledDynamicAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "$avatarColor",
})(({ $avatarColor }) => ({
  backgroundColor: $avatarColor,
  fontSize: 14,
  fontWeight: 700,
  width: 40,
  height: 40,
}));



export const SectionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

export const SectionTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: theme.palette.text.secondary,
}));

export const SubTaskCard = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
}));

export const SubTaskListContainer = styled(SkyBox)(({ theme }) => ({
  maxHeight: 220,
  overflowY: "auto",
  paddingRight: theme.spacing(0.5),
  "&::-webkit-scrollbar": { width: "4px" },
  "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: "4px" },
}));

export const SubTaskInfo = styled(SkyBox)({
  flex: 1,
  minWidth: 0,
});

export const SubTaskTitle = styled(SkyTypography)({
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const SubTaskDate = styled(SkyTypography)({
  fontSize: 12,
  color: "#94a3b8",
  fontStyle: "italic",
});

export const SubTaskProgressWrapper = styled(SkyBox)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: 150,
});

export const MiniProgress = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  flex: 1,
  backgroundColor: "#e2e8f0",
  "& .MuiLinearProgress-bar": {
    borderRadius: 4,
    backgroundColor: theme.palette.primary.main,
  },
}));

export const ProgressPercent = styled(SkyTypography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: theme.palette.primary.main,
  minWidth: 35,
}));

export const FileCard = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1.5),
  borderRadius: 12,
  backgroundColor: "#f8fafc",
  gap: theme.spacing(2),
  flex: 1,
  minWidth: "calc(50% - 8px)",
}));

export const FileIconWrapper = styled(SkyBox)(({ theme, type }) => ({
width: 44,
  height: 44,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff",
  border: `1px solid ${theme.palette.divider}`,
  "& svg": {
    fontSize: 24,
    color: type === "pdf" ? "#ef4444" : type === "xls" ? "#16a34a" : "#64748b",
  },
}));

export const FileInfo = styled(SkyBox)({
  flex: 1,
  minWidth: 0,
});

export const FileName = styled(SkyTypography)({
  fontSize: 14,
  fontWeight: 700,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const FileSize = styled(SkyTypography)({
  fontSize: 12,
  color: "#94a3b8",
});

export const TabsContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(4),
  backgroundColor: "#f1f5f9",
  borderRadius: 999,
  padding: 4,
  display: "flex",
  gap: 4,
}));

export const TabItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  flex: 1,
  height: 42,
  padding: "0 8px",
  textAlign: "center",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
  backgroundColor: active ? "#fff" : "transparent",
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  boxShadow: active ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
  "& svg": {
    fontSize: 16,
  },
}));

export const HistoryList = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 12,
  backgroundColor: "#fff",
  padding: "4px",
  maxHeight: 420,
  minHeight: 60,
  overflowY: "auto",
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 999,
  },
}));

export const HistoryItem = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": {
    borderBottom: "none",
  },
}));

export const HistoryIconWrapper = styled(SkyBox)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "#dbeafe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.primary.main,
  "& svg": {
    fontSize: 18,
  },
}));

export const HistoryContent = styled(SkyBox)({
  flex: 1,
});

export const HistoryTitle = styled(SkyTypography)({
  fontSize: 14,
  fontWeight: 600,
});

export const HistoryTime = styled(SkyTypography)({
  fontSize: 12,
  color: "#94a3b8",
});

export const UploadButton = styled(SkyButton)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 16px",
  borderRadius: 20,
  textTransform: "none",
  border: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.primary,
  "& .MuiButton-startIcon": {
    marginRight: 4,
  },
}));

// --- New Styled Components to fix ESLint forbid-component-props ---

export const StyledSkeletonText = styled(Skeleton)`
  height: 40px;
  width: 60%;
`;

export const StyledSkeletonRectLarge = styled(Skeleton)`
  height: 200px;
margin-top: 16px;
  border-radius: 8px;
`;

export const StyledSkeletonRectSmall = styled(Skeleton)`
  height: 100px;
  margin-top: 16px;
  border-radius: 8px;
`;

export const LoadingWrapper = styled(SkyBox)`
  padding: 16px;
`;



export const FullWidthCenterText = styled(SkyTypography)`
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding-top: 16px;
  padding-bottom: 16px;
  width: 100%;
`;

export const HistoryEmptyText = styled(SkyTypography)`
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding-top: 16px;
  padding-bottom: 16px;
`;

export const DiscussionList = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  maxHeight: 420,
  minHeight: 60,
  overflowY: "auto",
  paddingRight: theme.spacing(0.5),
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 999,
  },
}));

export const DiscussionCard = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  display: "flex",
  gap: theme.spacing(1.5),
  padding: theme.spacing(2),
  borderRadius: 18,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
  marginLeft: level ? theme.spacing(Math.min(level, 2) * 4) : 0,
}));

export const DiscussionAvatar = styled(Avatar)(({ theme }) => ({
  width: 52,
  height: 52,
  fontSize: 16,
  fontWeight: 700,
  flexShrink: 0,
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#dbeafe",
  color: theme.palette.primary.main,
}));

export const DiscussionMain = styled(SkyBox)({
  flex: 1,
  minWidth: 0,
});

export const DiscussionHeader = styled(SkyBox)({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
});

export const DiscussionAuthor = styled(SkyTypography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1.25,
}));

export const DiscussionDate = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
  paddingTop: 2,
}));

export const DiscussionMessage = styled(SkyTypography)(({ theme }) => ({
  fontSize: 15,
  marginTop: theme.spacing(0.75),
  color: theme.palette.text.primary,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  "& span": {
    color: "#0f5cb6",
    fontWeight: 500,
  },
}));

export const DiscussionActions = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1.25),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const DiscussionActionText = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "userLiked",
})(({ theme, userLiked }) => ({
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  color: userLiked ? theme.palette.primary.main : "#0f5cb6",
  "&:hover": {
    opacity: 0.85,
  },
}));

export const DiscussionLikeBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "userLiked",
})(({ theme, userLiked }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  cursor: "pointer",
  color: userLiked ? theme.palette.primary.main : "#64748b",
  "& svg": {
    fontSize: 20,
  },
}));

export const DiscussionLikeCount = styled(SkyTypography)({
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1,
});

export const TimelineList = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  marginTop: theme.spacing(2),
  paddingLeft: theme.spacing(3.5),
  maxHeight: 420,
  minHeight: 60,
  overflowY: "auto",
  "&::before": {
    content: '""',
    position: "absolute",
    left: 14,
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#dbe4ef",
  },
  "&::-webkit-scrollbar": { width: 4 },
  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e1",
    borderRadius: 999,
  },
}));

export const TimelineItem = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  paddingBottom: theme.spacing(3),
  "&:last-child": {
    paddingBottom: 0,
  },
}));

export const TimelineDot = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  left: -22,
  top: 4,
  width: 12,
  height: 12,
  borderRadius: "50%",
  backgroundColor: "#2364b0",
  border: `2px solid ${theme.palette.background.paper}`,
  boxShadow: "0 0 0 1px rgba(35, 100, 176, 0.2)",
}));

export const TimelineBody = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

export const TimelineTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isRejected",
})(({ theme, isRejected }) => ({
  fontSize: 15,
  lineHeight: 1.35,
  color: isRejected ? "#2364b0" : theme.palette.text.primary,
  "& strong": {
    fontWeight: 700,
    color: isRejected ? "#2364b0" : theme.palette.text.primary,
  },
}));

export const TimelineTime = styled(SkyTypography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: theme.palette.text.secondary,
  "& svg": {
    fontSize: 20,
  },
}));

export const TimelineNoteButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  color: "#2364b0",
  padding: 2,
  verticalAlign: "middle",
  "& svg": {
    fontSize: 20,
  },
}));

export const DialogNoteContent = styled(SkyTypography)(({ theme }) => ({
  fontSize: 14,
  lineHeight: 1.6,
  color: theme.palette.text.primary,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
}));
