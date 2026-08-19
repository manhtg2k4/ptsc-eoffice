import {
  Box,
  Grid,
  Collapse,
  IconButton,
  Paper,
  styled,
  TableCell,
  TableBody,
  TableRow,
  Typography,
	Avatar,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ReplyIcon from "@mui/icons-material/Reply";
import { StyledTableContainer as BaseStyledTableContainer, StyledTableCell as BaseStyledTableCell } from "@styles/CustomTable.styles";
import { WORKFLOW_STATUS_CONFIG } from "./workflow.utils";

export { TableBody, KeyboardArrowDownIcon, KeyboardArrowUpIcon };
export const StyledTableContainer = styled(BaseStyledTableContainer.withComponent(Paper))(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  overflowX: "auto",
    borderRadius: theme.shape.borderRadius, // ✅ Thêm bo góc
  overflow: "hidden",
}));

export const CollapseHeader = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(1),
  cursor: "pointer",
  userSelect: "none",
}));

export const HeaderTitle = styled(Typography)(({ theme, styledTextTransform }) => ({
  fontWeight: "bold",
  color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.main,
  // marginLeft: '12px',
  fontSize: '0.875rem',
  textTransform: styledTextTransform || "none",
}));

export const ToggleButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#94A3B8',
  fontSize: '1.125rem',
}));

export const RecipientCell = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "4px",
});

export const RecipientName = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isMain",
})(({ isMain }) => ({
  fontWeight: isMain ? "bold" : "normal",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: '#2364B0', 
}));

export const TimestampText = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  color:'#2364B0',
}));

export const StatusBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ theme, status }) => ({
  fontWeight: 500,
  color:
    status === "Đã xử lý"
      ? theme.palette.success.main
      : status === "Đã xem"
      ? theme.palette.info.main
      : theme.palette.error.main,
}));

export const SubRow = styled(TableRow)(({ theme }) => ({
  "& > *": {
    borderBottom: `1px solid ${theme.palette.divider} !important`,
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
  "& > td:nth-of-type(2)": { // Thụt lề cho cột thứ 2 (Tên người nhận)
    // paddingLeft: `${theme.spacing(7)} !important`,
  },
}));

export const SubChildRow = styled(SubRow)(() => ({
  "& > *": {
    backgroundColor: "rgba(0, 0, 0, 0.02) !important",
    fontSize: "13px !important",
  },
  "& .sub-child-name": {
    marginLeft: "40px",
  }
}));

export const SubRowCell = styled(TableCell)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  backgroundColor: theme.palette.action.hover,
  // Áp dụng các đường viền dựa trên cấu hình theme
  borderBottom: `1px solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
      : 'transparent'
  }`,
  borderLeft: `1px solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
      : 'transparent'
  }`,
  borderRight: `1px solid ${
    theme.components?.MuiTableCell?.styleOverrides?.root?.enableCustomBorder
      ? theme.components?.MuiTableCell?.styleOverrides?.root?.borderColor || theme.palette.divider
      : 'transparent'
  }`,
}));

export const SubRowContent = styled(Box)(({ theme }) => ({
    paddingLeft: theme.spacing(6),
}));


export const StyledTableCell = styled(BaseStyledTableCell)({
  fontWeight: "bold", // Giữ lại vì đây là style cụ thể cho header của bảng này
  whiteSpace: "nowrap", // Giữ lại
  padding: "8px 16px", // Giữ lại padding cụ thể nếu cần
  textAlign: "left",
  "&[align=center]": { textAlign: "center" },
  // textTransform: "uppercase",
});

export const FullWidthCollapse = styled(Collapse)({
  width: '100%',
});

export const SkyFlexGap8 = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StyledIconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "noBg",
})(({ theme, noBg }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.1)" : noBg ? "transparent" : "#edf2f9",
  flexShrink: 0,
}));

export const StytedDescriptionIcon = () => (
  <svg width="26" height="26" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
    <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
    <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
    <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
    <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
  </svg>
);

// --- CÁC STYLED COMPONENTS MỚI PHỤC VỤ TIMELINE + TABLE ---

export const TimelineTableCell = styled(BaseStyledTableCell)(({ theme }) => ({
  padding: "12px 16px",
  verticalAlign: "top",
  width: "240px",
  position: "relative",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#FAFAFA",
  borderRight: `1px solid ${theme.palette.divider}`,
}));

export const StepCellContent = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
});

export const TimelineNode = styled(Box)({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flexShrink: 0,
  height: "100%",
  minHeight: "36px",
});

export const TimelineConnector = styled(Box, {
  shouldForwardProp: (prop) => prop !== "status" && prop !== "isFirst" && prop !== "isLast",
})(({ status, isFirst, isLast }) => {
  const color = WORKFLOW_STATUS_CONFIG[status]?.color || "#CBD5E1";

  return {
    position: "absolute",
    left: "50%",
    width: "2px",
    backgroundColor: color,
    transform: "translateX(-50%)",
    top: isFirst ? "16px" : "0px",
    bottom: isLast ? "calc(100% - 16px)" : "0px",
    zIndex: 1,
  };
});

export const StepCircle = styled(Box, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ status }) => {
  const statusConfig = WORKFLOW_STATUS_CONFIG[status];
  const color = statusConfig?.color || "#919191";
  const borderColor = statusConfig?.color || "#CBD5E1";

  return {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: `2px solid ${borderColor}`,
    backgroundColor: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color,
    position: "relative",
    zIndex: 2,
  };
});

export const StatusIconMini = styled(Box, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})(({ statusColor }) => ({
  position: "absolute",
  bottom: -2,
  right: -6,
  width: 16,
  height: 16,
  borderRadius: "50%",
  backgroundColor: statusColor || "#94A3B8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
  border: "2.5px solid #fff",
}));

export const StepInfoContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const StepNameText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ status }) => {
  const statusConfig = WORKFLOW_STATUS_CONFIG[status];
  return {
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: "1.3",
    color: statusConfig?.color || (status === "waiting" ? "#919191" : "#1E293B"),
  };
});

export const StepNoteText = styled(Typography)({
  fontSize: "12px",
  color: "#64748B",
  fontWeight: "normal",
});

export const StepPeopleBadge = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  backgroundColor: "#E0F2FE", // Blue-100
  color: "#0369A1", // Blue-700
  fontSize: "11px",
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: "4px",
  marginTop: "4px",
  width: "fit-content",
});

export const UserRowContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const UserNameText = styled("span")({
  fontWeight: 600,
  color: "#1E293B",
  fontSize: "13px",
});

export const UserIndexText = styled(Typography)({
  fontSize: "13px",
  fontWeight: 700,
  color: "#64748B",
  minWidth: "16px",
  display: "inline-block",
});

export const UserMainInfo = styled(Box)({
  display: "flex",
  flexDirection: "column",
});

export const UserRoleSubtitle = styled(Typography)({
  fontSize: "12px",
  color: "#64748B",
  marginTop: "1px",
});

export const UserDeadlineText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isUrgent",
})(({ isUrgent }) => ({
  fontSize: "13px",
  fontWeight: isUrgent ? 600 : 400,
  color: isUrgent ? "#D32F2F" : "inherit",
}));

export const WorkflowStatusBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== "statusColor" && prop !== "textColor",
})(({ statusColor, textColor }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: statusColor || "#F1F5F9",
  color: textColor || "#475569",
  fontSize: "12px",
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  minWidth: "100px",
}));

export const HeaderTimelineTableCell = styled(StyledTableCell)({
  width: "240px",
});

export const HeaderStatusTableCell = styled(StyledTableCell)({
  width: "130px",
});

export const ContentTableCell = styled(StyledTableCell)({
  fontSize: "13px",
});

export const ReceiverTableCell = styled(ContentTableCell)({
  whiteSpace: "normal",
  wordBreak: "break-word",
  maxWidth: "240px",
  minWidth: "150px",
  "& .MuiBox-root, & span": {
    whiteSpace: "normal",
  },
});

export const MiniIconWrapper = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& svg": {
    fontSize: "10px",
    color: "#fff",
  },
});

export const ReturnReasonTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(213, 47, 47, 0.12)" : "#FFF5F5",
}));

export const ReturnReasonTableCell = styled(BaseStyledTableCell)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(213, 47, 47, 0.12)" : "#FFF5F5",
  padding: "10px 24px",
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "rgba(213, 47, 47, 0.3)" : "#FFCDD2"}`,
}));

export const ReturnReasonContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#D32F2F",
});

export const ReturnReasonText = styled(Typography)({
  fontSize: "13px",
  color: "#D32F2F",
  fontWeight: 400,
  "& strong": {
    fontWeight: 700,
  },
});

export const ReturnReasonIcon = styled(ReplyIcon)({
  color: "#D32F2F",
  fontSize: "18px",
});

export const ProcessorContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const ProcessorAvatarWrapper = styled(Box)({
  position: "relative",
  display: "inline-flex",
});

export const ProcessorAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})(({ statusColor }) => ({
  width: 34,
  height: 34,
  fontSize: "0.875rem",
  fontWeight: 600,
  backgroundColor: "transparent",
  border: `2px solid ${statusColor || "#94A3B8"}`,
  color: statusColor || "#94A3B8",
}));

export const ProcessorStatusIconMini = styled(Box, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})(({ statusColor }) => ({
  position: "absolute",
  bottom: -2,
  right: -4,
  width: 15,
  height: 15,
  borderRadius: "50%",
  backgroundColor: statusColor || "#94A3B8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 3,
  border: "2px solid #fff",
  "& svg": {
    fontSize: "10px",
    color: "#fff",
  },
}));

export const ProcessorInfoBox = styled(Box)({
  display: "flex",
  flexDirection: "column",
});

export const ProcessorNameText = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.2,
  fontSize: "0.875rem",
}));

export const ProcessorPositionText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.75rem",
  lineHeight: 1.3,
  marginTop: "2px",
}));

