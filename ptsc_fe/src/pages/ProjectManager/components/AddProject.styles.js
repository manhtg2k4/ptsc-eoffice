import {
  styled,
  Avatar,
  LinearProgress,
  Slider,
  Switch,
  FormControlLabel,
  Grid,
} from "@mui/material";
import {
  Clear as ClearIcon,
  Menu as MenuIcon,
  ThumbUp as ThumbUpIcon,
  Search as SearchMuiIcon,
  Security as ShieldIcon,
  Settings as SettingsIcon,
  Flag as FlagIcon,
  VisibilityOutlined,
  InfoOutlined as InfoIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { ResponsiveContainer } from "recharts";
import {
  SkyBox,
  SkyGrid,
  SkyTypography,
  SkyButton,
  SkyIconButton,
  SkyDivider,
  SkyPaper,
  SkyTextField,
  SkySelect,
  SkyTableContainer,
  SkyTableCell,
  SkyDialog,
  SkyDialogTitle,
  SkyDialogContent,
  SkyDialogActions,
  SkyListItemIcon
} from "@styles/SkyStyles";

export const StyledBoxContainerContent = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "styledMarginTop" && prop !== "fullHeight" && prop !== "fixedHeight" && prop !== "flexColumn",
})(({ theme, styledMarginTop, fullHeight, fixedHeight, flexColumn }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 6,
  border: `1px solid ${theme.palette.divider} `,
  marginTop: styledMarginTop ? theme.spacing(2) : 0,
  padding: '10px 30px',
  ...(fullHeight && { height: "100%" }),
  ...(fixedHeight && { height: fixedHeight }),
  ...(flexColumn && { display: 'flex', flexDirection: 'column' }),
}));

export const JobMainContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
  [theme.breakpoints.up("md")]: {
    // padding: theme.spacing(3),
  },
}));

export const JobSectionTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
  marginTop: mt ? theme.spacing(mt) : theme.spacing(1),
  marginBottom: theme.spacing(1.5),
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000", // Deep blue or White for dark mode
  fontWeight: 700,
  fontSize: '14px',
  textTransform: 'uppercase',
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

export const JobUploadPlaceholderBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const JobPlaceholderText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: "italic",
}));

export const JobBlueButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: "#2364B0",
  color: "#FFFFFF",
  padding: '0 12px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Các style mặc định cho trạng thái disabled, áp dụng bất kể variant
  '&.Mui-disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
  },

  // Các style cụ thể cho nút outlined với color="inherit"
  // Điều này nhắm mục tiêu vào lớp mà MuiButton thêm vào khi sử dụng variant="outlined" và color="inherit".
  '&.MuiButton-outlinedInherit': {
    // borderColor: '#fff', // Buộc viền màu trắng
    // color: '#fff',       // Buộc chữ màu trắng
    // Tùy chọn: Thêm style hover cho variant cụ thể này nếu không muốn style mặc định
    '&:hover': {
      borderColor: 'rgba(255, 255, 255, 0.7)', // Viền nhạt hơn khi hover
      backgroundColor: 'rgba(255, 255, 255, 0.08)', // Nền mờ khi hover
    },
  },
}));

export const JobDeleteIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const JobCommentSection = styled(SkyBox)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  flex: 1,
  overflowY: "auto",
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: '10px',
  },
}));

export const JobCommentBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark"
    ? "rgba(255, 255, 255, 0.05)"
    : "#F8FAFC",
  borderRadius: 12,
  padding: theme.spacing(1.5, 2),
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "#e8ecf0"}`,
  boxShadow: theme.palette.mode === "dark" ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
}));

export const JobCommentItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  marginBottom: theme.spacing(2),
  marginLeft: level ? theme.spacing(level * 6) : 0,
}));

export const JobCommentHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(0.75),
}));

export const JobCommentUserInfo = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

export const JobCommentAvatar = styled(Avatar)(({ theme }) => ({
  width: 44,
  height: 44,
  flexShrink: 0,
  backgroundColor: theme.palette.primary.main,
  fontSize: '1rem',
  fontWeight: 700,
}));

export const JobCommentContent = styled(SkyTypography)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  color: theme.palette.text.primary,
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
  color: userLiked ? theme.palette.primary.main : theme.palette.primary.main,
  fontWeight: userLiked ? 600 : 400,
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
  fontWeight: 500,
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

export const JobStatusText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.action.hover,
  padding: theme.spacing(0.5, 2),
  borderRadius: '16px',
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
  marginBottom: theme.spacing(2),
  ...(theme.palette.mode === 'dark' && {
    '& .MuiButton-root': {
      color: 'white',
    },
  }),
}));

export const JobSectionHeaderWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const JobSectionHeaderLeft = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const JobSectionDivider = styled(SkyDivider)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  opacity: 0.6,
}));

export const JobSubTaskHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(2),
  },
}));

export const JobSubTaskTableContainer = styled(SkyTableContainer)(() => ({
  maxHeight: "unset",
  border: "none",
  boxShadow: "none",
  background: "transparent",
  borderRadius: 0
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

export const JobCommentInputContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
  padding: theme.spacing(1, 1.5),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#d0d7de"}`,
  borderRadius: 8,
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': { border: 'none' },
    '&:hover fieldset': { border: 'none' },
    '&.Mui-focused fieldset': { border: 'none' },
  },
}));

export const JobSlider = styled(Slider)(() => ({
  color: "#1b8ae4ff",
  cursor: "default",
  height: 12,
  "& .MuiSlider-track": {
    border: "none",
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
}));

export const HistoryTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  flex: 1,
  overflowY: "auto",
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderRadius: '10px',
  },
  "& .MuiTableCell-root": {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
  },
  "& .MuiTableHead-root .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F2F4F7",
    fontWeight: 700,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  "& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#F8F9FA",
  },
  "& .MuiTableBody-root .MuiTableCell-root": {
    borderBottom: "none",
  },
}));

export const SeeMoreToggleButton = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "14px",
  padding: theme.spacing(0.5, 1.5),
  borderRadius: "20px",
  backgroundColor: theme.palette.mode === "dark"
    ? "rgba(56, 189, 248, 0.1)"
    : "rgba(30, 64, 175, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.3)" : "rgba(30, 64, 175, 0.2)"}`,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark"
      ? "rgba(56, 189, 248, 0.2)"
      : "rgba(30, 64, 175, 0.1)",
    transform: "translateY(-1px)",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
}));

export const AbstractSummaryBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#F8FAFC",
  padding: "20px",
  borderRadius: "12px",
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  border: `1px solid ${theme.palette.divider}`,
  width: "100%",
}));

export const AbstractSummaryContent = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
});

export const AbstractSummaryTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 700,
  color: theme.palette.mode === "dark" ? "#38bdf8" : "#2364B0",
  textTransform: "uppercase",
}));

export const AbstractSummaryText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1rem",
  color: theme.palette.text.primary,
  lineHeight: 1.6,
  fontWeight: 500,
}));

export const StyledInfoIcon = styled(InfoIcon)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#38bdf8" : "#2364B0",
  fontSize: "24px",
  marginTop: "2px",
}));


export const StyledMenuIcon = styled(MenuIcon)(() => ({
  color: "#005596",
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

export const HistoryActionCell = styled(SkyTableCell)(({ theme }) => ({
  width: "45%",
  paddingLeft: theme.spacing(3),
}));

export const HistoryUserCell = styled(SkyTableCell)(({ theme }) => ({
  width: "30%",
  paddingLeft: theme.spacing(3),
}));

export const HistoryTimeCell = styled(SkyTableCell)(({ theme }) => ({
  width: "25%",
  paddingLeft: theme.spacing(3),
}));
export const StyledListItemIcon = styled(SkyListItemIcon)(() => ({
  color: "#005596",          // Kế thừa từ parent (MenuItem)
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
  color: userLiked ? theme.palette.primary.main : theme.palette.text.disabled,
  fontWeight: userLiked ? "bold" : "normal",
}));

export const JobCommentEditedText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
export const JobCommentBody = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
}));

export const JobLikeCount = styled(SkyTypography)(() => ({
  fontWeight: "inherit",
}));

export const JobLikeIcon = styled(ThumbUpIcon)(() => ({
  fontSize: "1.25rem",
}));

export const JobBreadcrumbContainer = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.2, 2),
  background: theme.palette.mode === "dark" ? "#1E293B" : "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: "6px",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "6px",
}));

export const JobBreadcrumbItem = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isLast",
})(({ isLast }) => ({
  fontSize: 14,
  fontWeight: isLast ? 600 : 400,
  color: isLast ? "#1e88e5" : "#555",
  whiteSpace: "nowrap",
  cursor: isLast ? "default" : "pointer",

}));

export const JobBreadcrumbSeparator = styled(SkyTypography)(({ theme }) => ({
  margin: theme.spacing(0, 0.5),
  fontSize: 14,
  color: "#999",
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
  gap: '0px 33px',
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

export const JobTabsContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(4),
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
  padding: "0 8px",
}));

export const JobTabItem = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  padding: theme.spacing(1.5, 0),
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: active ? 700 : 500,
  color: active ? "#005596" : theme.palette.text.secondary,
  position: "relative",
  textTransform: "uppercase",
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: active ? "#005596" : "transparent",
    transition: "background-color 0.3s",
  },
  "&:hover": {
    color: "#005596",
  },
}));

export const JobAnalysisCardTitle = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  marginBottom: theme.spacing(1),
}));

export const JobAnalysisCardValue = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  fontSize: "2rem",
  fontWeight: 800,
  color: colorType === "success" ? theme.palette.success.main :
    colorType === "warning" ? theme.palette.warning.main :
      theme.palette.primary.main,
}));

export const JobAnalysisChartPlaceholder = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(10, 0),
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.text.secondary,
}));
export const JobReasonTitle = styled(SkyTypography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
  color: theme.palette.error.main, // Red color for delay reason
  fontWeight: 700,
  fontSize: '1rem',
  textTransform: 'uppercase',
}));

export const StyledIconWrapper = styled(SkyBox)(({ theme, noBg }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.1)" : noBg ? "transparent" : "#edf2f9",
  flexShrink: 0,
}));

// ANALYSIS SECTION STYLES
export const JobDelayReasonInput = styled(SkyTextField)(() => ({
  backgroundColor: "#fff",
  borderRadius: "8px",
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
  }
}));

// ANALYSIS SECTION STYLES
export const AnalysisSummaryCard = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  borderRadius: '12px',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', // Hiệu ứng đổ bóng nhẹ
  border: theme.palette.mode === 'dark' ? '1px solid #303642' : '1px solid #f0f0f0',
}));

export const AnalysisSummaryTitle = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : theme.palette.text.secondary,
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}));

export const AnalysisSummaryValue = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'valColor',
})(({ theme, valColor }) => ({
  fontSize: '28px',
  fontWeight: 700,
  color: valColor || (theme.palette.mode === 'dark' ? 'white' : '#333'),
}));

export const AnalysisSummarySubText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: '4px',
}));

export const AnalysisProgressContainer = styled(SkyBox)(({ theme }) => ({
  width: '100%',
  marginTop: theme.spacing(1),
}));

export const AnalysisLinearProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'barColor',
})(({ barColor }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: '#f0f0f0',
  '& .MuiLinearProgress-bar': {
    backgroundColor: barColor || '#0288d1',
    borderRadius: 4,
  },
}));

export const AnalysisIconWrapper = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'iconColor',
})(({ iconColor }) => ({
  display: 'flex',
  alignItems: 'center',
  '& svg': {
    fontSize: '16px',
    color: iconColor || 'inherit',
  }
}));

export const AnalysisChartBox = styled(StyledBoxContainerContent)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  minHeight: '350px',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '12px', // Bo góc
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', // Đổ bóng nhẹ
  border: theme.palette.mode === 'dark' ? '1px solid #303642' : '1px solid #f0f0f0', // Viền nhẹ
}));

export const AnalysisChartTitle = styled(SkyTypography)(() => ({
  fontSize: '16px',
  fontWeight: 700,
  color: '#004b8d',
  marginLeft: 8
}));

export const AnalysisChartWrapper = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flex: 1,
  width: '100%',
}));

export const AnalysisLegend = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  minWidth: '150px',
}));

export const AnalysisLegendItem = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  gap: theme.spacing(1),
  padding: '6px 0',
}));

export const AnalysisLegendTable = styled(SkyBox)(() => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 1fr) 60px 50px',
  width: '100%',
  fontSize: '12px',
}));

export const AnalysisLegendHeader = styled(SkyBox)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, 1fr) 60px 50px',
  paddingBottom: theme.spacing(1),
  marginBottom: theme.spacing(1),
  color: theme.palette.text.secondary,
  fontSize: '11px',
  fontWeight: 600,
  borderBottom: '1px solid #eee',
  width: '100%',
}));

export const AnalysisLegendCell = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'align',
})(({ align }) => ({
  textAlign: align || 'left',
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
}));

export const AnalysisLegendDot = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'dotColor',
})(({ dotColor }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: dotColor,
  marginRight: '8px',
}));

export const AnalysisSearchWrapper = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  width: '100%',
  maxWidth: '400px',
  position: 'relative',
}));

export const AnalysisSearchBar = styled(SkyTextField)(() => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px 0 0 8px',
    backgroundColor: '#fff',
    '& fieldset': {
      borderColor: '#e0e0e0',
    },
  },
  flex: 1,
}));

export const AnalysisSearchButton = styled(SkyIconButton)(() => ({
  backgroundColor: '#005596',
  color: '#fff',
  borderRadius: '0 8px 8px 0',
  padding: '8px 12px',
  height: '100%',
  '&:hover': {
    backgroundColor: '#004b8d',
  },
}));

export const AnalysisTableContainer = styled(SkyBox)(() => ({
  // marginTop: theme.spacing(3),
  '& .MuiTableCell-head': {
    backgroundColor: '#f8f9fa',
    fontWeight: 700,
    fontSize: '12px',
    color: '#333',
    borderBottom: '2px solid #eee',
  },
  '& .MuiTableCell-body': {
    fontSize: '12px',
    padding: '12px 8px',
  },
  '& .MuiTableRow-root:nth-of-type(even)': {
    backgroundColor: '#fcfcfc',
  },
}));
// CHART STYLES
export const AnalysisChartCenterBox = styled(SkyBox)(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
}));

export const AnalysisChartContainer = styled(SkyBox)(() => ({
  width: '200px',
  height: '200px',
  position: 'relative',
}));

export const AnalysisMainWrapper = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(0),
}));

export const AnalysisGridContainer = styled(SkyGrid)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const AnalysisMemberName = styled('span', {
  shouldForwardProp: (prop) => prop !== 'isPlaceholder',
})(({ isPlaceholder }) => ({
  fontWeight: isPlaceholder ? 400 : 600,
  fontSize: '12px',
}));

export const AnalysisLegendText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.mode === 'dark' ? 'white' : '#666',
}));

export const AnalysisLegendPercentage = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
  minWidth: '40px',
  textAlign: 'right',
}));

export const AnalysisResponsiveContainer = styled(ResponsiveContainer)(() => ({
  width: '100%',
  height: '100%',
}));

export const AnalysisTypography = styled(SkyTypography)(() => ({
  variant: "caption"
}));

export const AnalysisTypographyWeight = styled(SkyTypography)(() => ({
  variant: "h5",
  fontWeight: 700
}));

export const AnalysisSearchMuiIcon = styled(SearchMuiIcon)(() => ({
  fontSize: "small"
}));

// DECENTRALIZATION SECTION STYLES
export const DecentralizationMainBox = styled(StyledBoxContainerContent)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(2),
  borderRadius: '12px',
  boxShadow: '0px 4px 4px 0px #00000040',
  border: theme.palette.mode === 'dark' ? '1px solid #303642' : '1px solid #f0f0f0',

}));

export const DecentralizationHeaderBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(4),
}));

export const DecentralizationShieldIconStyled = styled(ShieldIcon)(({ theme }) => ({
  fontSize: '24px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#333',
  marginTop: '4px',
}));

export const DecentralizationTitleText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '16px',
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? '#fff' : '#333',
  marginBottom: theme.spacing(0.5),
}));

export const DecentralizationSubtitleText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.secondary,
}));

export const DecentralizationRoleCard = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '12px',
  border: theme.palette.mode === 'dark' ? '1px solid #303642' : '1px solid #f0f0f0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  position: 'relative',
  boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)', // Hiệu ứng đổ bóng nhẹ
}));

export const RoleBadgeBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'badgeColor',
})(({ badgeColor }) => ({
  backgroundColor: badgeColor || '#4caf50',
  color: '#fff',
  padding: '6px 16px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'inline-block',
}));

export const RolePermissionCountText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.secondary,
}));

export const DecentralizationActionButton = styled(SkyButton)(({ theme }) => ({
  textTransform: 'none',
  color: theme.palette.mode === 'dark' ? '#fff' : '#333',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : '#e0e0e0',
  borderRadius: '8px',
  padding: '6px 16px',
  width: '100%',
  justifyContent: 'center',
  marginTop: 'auto',
  fontWeight: 600,
  '&:hover': {
    borderColor: theme.palette.mode === 'dark' ? '#fff' : '#bdbdbd',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5',
  },
}));

export const DecentralizationSettingsIconStyled = styled(SettingsIcon)(() => ({
  fontSize: '18px',
}));

// NEW JOB DIALOG STYLES
export const JobDialog = styled(SkyDialog)(() => ({
  // Inherits rounded styles from SkyDialog
}));

export const JobDialogTitle = styled(SkyDialogTitle)(() => ({
  borderBottom: '1px solid #e0e0e0',
  marginBottom: '16px',
}));

export const JobDialogContent = styled(SkyDialogContent)(() => ({
  // Inherits standard padding
}));

export const JobDialogActions = styled(SkyDialogActions)(() => ({
  borderTop: '1px solid #e0e0e0',
  marginTop: '16px',
}));

// GENERAL BUTTONS
export const JobActionButton = styled(SkyButton)(({ variant, color }) => ({
  backgroundColor: variant === 'contained' && color === 'primary' ? '#005596' : undefined,
  color: variant === 'contained' && color === 'primary' ? '#fff' : undefined,
  '&:hover': {
    backgroundColor: variant === 'contained' && color === 'primary' ? '#00447a' : undefined,
  },
}));

// PERMISSION DIALOG STYLES (Specific)
export const PermissionGroupTitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
  fontSize: '14px',
}));

export const PermissionItemBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5, 0),
  borderBottom: '1px solid #f5f5f5',
  '&:last-child': {
    borderBottom: 'none',
  },
}));

export const PermissionLabel = styled(SkyTypography)(() => ({
  fontWeight: 600,
  fontSize: '13px',
}));

export const PermissionDescription = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
}));

export const PermissionSwitch = styled(Switch)(() => ({
  // Custom switch styles if needed
}));

// LIST PAGE STYLES (JobProjectList.js)
export const JobFilterButton = styled(SkyButton)(({ active }) => ({
  fontSize: '13px',
  backgroundColor: active ? '#fff' : 'transparent',
  color: active ? '#333' : '#666',
  boxShadow: active ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
  '&:hover': {
    backgroundColor: active ? '#fff' : 'rgba(0,0,0,0.05)',
  },
  '& .MuiButton-startIcon': {
    marginRight: '6px',
  },
}));

export const JobActionToolbar = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  gap: theme.spacing(2),
}));

export const JobSearchFilterBox = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'stretch',
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  overflow: 'hidden',
  flex: 1,
  maxWidth: '400px',
}));

export const JobSearchInput = styled(SkyTextField)(() => ({
  '& .MuiOutlinedInput-root': {
    border: 'none',
    borderRadius: 0,
    '& fieldset': { border: 'none' },
  },
  marginTop: 0,
  marginBottom: 0,
  flex: 1,
}));

export const JobAddButton = styled(SkyButton)(() => ({
  backgroundColor: '#005596',
  color: '#fff',
  borderRadius: '8px',
  padding: '8px 16px',
  '&:hover': {
    backgroundColor: '#004b8d',
  },
}));

export const JobStatusBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'status',
})(({ status }) => {
  let bgColor = '#e0e0e0';
  let color = '#333';
  let borderColor = 'transparent';

  switch (status) {
    case 'new': bgColor = '#f3f4f6'; color = '#374151'; break; // Gray
    case 'inprogress': bgColor = '#e0f2fe'; color = '#0284c7'; break; // Blue
    case 'completed': bgColor = '#dcfce7'; color = '#15803d'; break; // Green
    case 'pending': bgColor = '#fef3c7'; color = '#d97706'; break; // Yellow
    case 'adjusted': bgColor = '#fff3e0'; color = '#ef6c00'; break;
    case 'cancelled': bgColor = '#ffebee'; color = '#d32f2f'; break;
    default: break;
  }

  return {
    backgroundColor: bgColor,
    color: color,
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'center',
    border: `1px solid ${borderColor}`,
    width: 'fit-content',
    margin: '0 auto',
  };
});

export const JobProgressIndicator = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'type',
})(({ type }) => {
  let color = '#666';
  if (type === 'early') color = '#2e7d32';
  if (type === 'overdue') color = '#d32f2f';
  if (type === 'inprogress') color = '#1976d2';

  return {
    backgroundColor: type === 'early' ? '#e8f5e9' : (type === 'overdue' ? '#ffebee' : (type === 'inprogress' ? '#e3f2fd' : '#e9ecef')),
    color: color,
    padding: '2px 10px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: 'fit-content',
  };
});

export const JobTaskNameBox = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
}));

export const JobFlagIconStyled = styled(FlagIcon, {
  shouldForwardProp: (prop) => prop !== 'flagColor',
})(({ flagColor }) => ({
  fontSize: '16px',
  color: flagColor || '#bdbdbd',
}));

// JOB FOOTER STYLES
export const JobFooterBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTop: '1px solid #eee',
  backgroundColor: '#fafafa',
}));

export const JobFooterSummary = styled(SkyTypography)(() => ({
  fontSize: '13px',
  color: '#666',
}));

export const JobPaginationBox = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}));

export const JobPageSizeSelect = styled(SkySelect)(() => ({
  height: '32px',
  fontSize: '13px',
  '& .MuiSelect-select': {
    paddingTop: '4px',
    paddingBottom: '4px',
  },
}));

export const JobTableWrapper = styled(SkyBox)(() => ({
  border: '1px solid #eee',
  borderRadius: '8px',
  overflow: 'hidden',
}));
export const JobSubTaskToolbar = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const ViewSwitcherContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F3F4F6",
  padding: "6px 8px",
  borderRadius: "20px 20px 0 0",
  boxShadow: "none",
  border: "1px solid #e2e8f0",
  gap: "4px",
  [theme.breakpoints.down("sm")]: {
    maxWidth: "100%",
    overflowX: "auto",
    MsOverflowStyle: "none",  /* IE and Edge */
    scrollbarWidth: "none",  /* Firefox */
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
}));

export const ViewSwitcherItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
  padding: "6px 19px",
  borderRadius: "24px",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
  backgroundColor: active
    ? (theme.palette.mode === "dark" ? "#334155" : "#FFFFFF")
    : "transparent",
  color: active
    ? (theme.palette.mode === "dark" ? "#FFFFFF" : "#111827")
    : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.5)" : "#9CA3AF"),
  boxShadow: active && theme.palette.mode !== "dark" ? "0px 1px 3px rgba(0, 0, 0, 0.1)" : "none",
  "&:hover": {
    backgroundColor: active
      ? (theme.palette.mode === "dark" ? "#334155" : "#FFFFFF")
      : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
  },
  "& .MuiSvgIcon-root": {
    fontSize: "1.25rem",
  }
}));

export const ViewSwitcherLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  fontSize: "0.875rem",
  fontWeight: active ? 600 : 600,
  whiteSpace: "nowrap",
  color: active
    ? (theme.palette.mode === "dark" ? "#FFFFFF" : "#111827")
    : (theme.palette.mode === "dark" ? "rgba(255,255,255,0.5)" : "#9CA3AF"),
}));

export const StyledPlaceholderText = styled(SkyTypography)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: "center",
  color: theme.palette.text.secondary,
}));

export const JobSubTaskHeaderSpacer = styled(SkyBox)(() => ({
  flex: 1,
}));

// ADDED MISSING PERMISSION DIALOG STYLES
export const PermissionDialogContainer = styled(SkyDialog)(() => ({
  '& .MuiDialog-paper': {
    borderRadius: '16px',
    padding: '0',
    maxWidth: '600px',
  },
}));

export const PermissionDialogHeader = styled(SkyDialogTitle)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: '1px solid #f0f0f0',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
}));

export const PermissionHeaderRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

export const PermissionItemContent = styled(SkyDialogContent)(({ theme }) => ({
  maxHeight: '400px',
  overflowY: 'auto',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#fff',
}));

export const PermissionTextContainer = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flex: 1,
  marginRight: '16px',
}));

export const PermissionTitleText = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '14px',
  color: theme.palette.text.primary,
}));

export const PermissionDescText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
}));

export const PermissionSwitchStyled = styled(Switch)(() => ({
  padding: 8,
  '& .MuiSwitch-track': {
    borderRadius: 22 / 2,
    '&:before, &:after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      width: 16,
      height: 16,
    },
  },
  '& .MuiSwitch-thumb': {
    boxShadow: 'none',
    width: 16,
    height: 16,
    margin: 2,
  },
}));

export const PermissionDialogActionsStyled = styled(SkyDialogActions)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderTop: '1px solid #f0f0f0',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fff',
  gap: theme.spacing(1.5),
}));

export const PermissionCancelBtn = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.action.hover,
  fontWeight: 600,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

export const PermissionSaveBtn = styled(SkyButton)(() => ({
  backgroundColor: '#005596',
  color: '#fff',
  fontWeight: 600,
  padding: '6px 24px',
  '&:hover': {
    backgroundColor: '#00447a',
  },
}));
export const JobNoteContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  height: "100%",
  padding: theme.spacing(0.5),
  borderRadius: "6px",
  border: `1px solid ${theme.palette.divider}`,
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
  // paddingLeft: theme.spacing(1.2),
}));

// ADVANCED FILTER STYLES
export const AdvancedFilterButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: "#0062AD",
  color: "#FFFFFF",
  fontWeight: 600,
  textTransform: "none",
  padding: "4px 16px",
  borderRadius: "6px",
  height: "40px", // Đã tăng từ 32px lên 40px để khớp với nút Tìm kiếm
  fontSize: "14px",
  marginLeft: theme.spacing(1),
  "&:hover": {
    backgroundColor: "#004b8d",
  },
  "& .MuiButton-startIcon": {
    marginRight: theme.spacing(0.5),
  },
  [theme.breakpoints.down("sm")]: {
    width: "fit-content",
    marginLeft: theme.spacing(1),
    marginTop: 0,
  },
}));

export const FilterPopOverContainer = styled(SkyBox)(({ theme }) => ({
  width: "650px", // Tăng từ 450px lên 500px để ô input ngày rỗng rãi hơn
  padding: "20px",
  backgroundColor: theme.palette.background.paper,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    width: "90vw",
    padding: "16px",
  },
}));

export const FilterPopoverHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  paddingBottom: theme.spacing(1),
  "& .MuiTypography-root": {
    fontWeight: 700,
    fontSize: "18px",
    color: "#1e293b",
  },
  "& .MuiSvgIcon-root": {
    color: "#0062AD",
  },
}));

export const FilterPopoverContent = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2.5),
}));

export const FilterPopoverRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  "& > .MuiFormControl-root, & > .MuiBox-root": {
    flex: 1,
  },
}));

export const FilterPopoverFooter = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const FilterLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
  display: "block",
}));

export const FilterDateRangeBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  "& > .MuiFormControl-root": {
    flex: 1,
  },
}));

export const FilterSeparator = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "14px",
  padding: "0 4px",
}));

export const FilterCheckboxContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(3),
  marginTop: theme.spacing(1),
  flexWrap: "wrap",
}));

export const FilterFormControlLabel = styled(FormControlLabel)(() => ({
  display: 'flex',
  justifyContent: 'flex-end',
  width: '100%',
  marginLeft: 0,
  marginRight: 0,
}));

export const FilterGridContainer = styled(Grid)(() => ({
  alignItems: 'center',
}));

export const FlexGridItem = styled(Grid)(() => ({
  display: "flex",
}));

export const FilterActionWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

const baseButtonStyles = {
  borderRadius: "8px",
  textTransform: "none",
  fontSize: "13px",
  fontWeight: 600,
  padding: "6px 16px",
};

export const FilterResetButton = styled(SkyButton)(() => ({
  ...baseButtonStyles,
}));

export const FilterCancelButton = styled(SkyButton)(() => ({
  ...baseButtonStyles,
}));

export const FilterApplyButton = styled(SkyButton)(() => ({
  ...baseButtonStyles,
  backgroundColor: "#0062AD",
  color: "#FFFFFF",
  "&:hover": {
    backgroundColor: "#004b8d",
  },
}));

export const JobLoadingBox = styled(SkyBox)(() => ({
  minWidth: "300px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
}));

export const ProjectStatusBlueBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.05)" : "#e8f2fc",
  padding: theme.spacing(2, 2.5),
  borderRadius: "12px",
  minHeight: "180px",
  height: "100%",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
}));

export const ProjectInfoRow = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
}));

export const ProjectInfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  textTransform: "none",
}));

export const ProjectInfoValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

export const ProjectLargeTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.75rem",
  fontWeight: 600,
  color: theme.palette.text.primary,
  lineHeight: 1.2,
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    fontSize: "1.25rem",
  },
}));

export const ProjectSubInfoText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
}));

export const ProjectStatusPill = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "statusColor",
})(({ theme, statusColor }) => ({
  backgroundColor: statusColor || theme.palette.primary.main,
  color: "#FFFFFF",
  padding: "6px 16px",
  borderRadius: "20px",
  fontSize: "14px",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const ProjectInfoContainer = styled(StyledBoxContainerContent)(() => ({
  padding: '16px 24px',
  minHeight: '180px',
  height: '100%',
  flex: 1,
}));

export const ProgressHeaderBox = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
}));

export const ProgressLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  fontWeight: 500,
}));

export const ProgressValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '2.125rem',
  color: theme.palette.primary.main,
  fontWeight: 800,
}));

export const StatusHeaderBox = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}));

export const EditIconButton = styled(SkyIconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const PriorityBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StyledPriorityFlagIcon = styled(FlagIcon)(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: '1rem',
}));

export const StyledEditIcon = styled(EditIcon)(() => ({
  fontSize: '1.25rem',
}));





// ============================================================
// RESPONSIVE HEADER COMPONENTS CHO ViewsProject
// ============================================================

export const ProjectHeaderWrapper = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const ProjectHeaderContentBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 12,
  border: `1px solid #c9c5c5 `,
  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  padding: '20px 24px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    padding: '16px',
  },
  [theme.breakpoints.down("sm")]: {
    padding: '12px',
  },
}));

export const ProjectHeaderTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: '1.6rem',
  fontWeight: 700,
  color: theme.palette.text.primary,
  lineHeight: 1.3,
  [theme.breakpoints.down("lg")]: {
    fontSize: '1.35rem',
  },
  [theme.breakpoints.down("md")]: {
    fontSize: '1.2rem',
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: '1.05rem',
  },
}));

export const ProjectHeaderSubtext = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  '& span': {
    fontSize: '16px',
    color: "#5A5F68",
    lineHeight: 1.5,
  },
  '& span.dot': {
    color: theme.palette.text.disabled,
  },
  [theme.breakpoints.down("sm")]: {
    flexDirection: 'column',
    gap: 0,
    '& span.dot': {
      display: 'none',
    },
  },
}));

export const ProjectHeaderProgressWrapper = styled(SkyBox)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 'auto',
  paddingTop: '8px',
}));

export const ProjectHeaderProgressLabel = styled(SkyTypography)(() => ({
  fontSize: '14px',
  fontWeight: 600,
  color: "#5A5F68",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}));

export const ProjectHeaderProgressPercent = styled(SkyTypography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 800,
  color: theme.palette.primary.main,
  lineHeight: 1,
  [theme.breakpoints.down("md")]: {
    fontSize: '1.6rem',
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: '1.4rem',
  },
}));

export const ProjectStatusCard = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.07)" : "#D4E4F7",
  borderRadius: 12,
  boxShadow: theme.palette.mode === "dark" ? "none" : "0px 4px 24px rgba(0, 0, 0, 0.08)",
  padding: theme.spacing(2, 3.75),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(1.5, 2),
    // Khi stack xuống: layout ngang cho 2 cột dates
    gap: theme.spacing(1),
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
  },
}));

export const ProjectStatusCardTitle = styled(SkyTypography)(() => ({
  fontSize: '14px',
  fontWeight: 600,
  color: "#5A5F68",
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}));

export const ProjectStatusPillRow = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}));

export const ProjectStatusPillBadge = styled(SkyBox)(() => ({
  color: '#fff',
  padding: '5px 0px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& *': {
    color: '#fff',
  },
}));

export const ProjectStatusEditBtn = styled(SkyIconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  padding: '8px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& svg': {
    fontSize: '1rem',
  },
}));

export const ProjectStatusDatesGrid = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: theme.spacing(1.5),
}));

export const ProjectStatusDateCell = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}));

export const ProjectStatusDateCellKT = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  // marginLeft: "25px",
}));

export const ProjectStatusDateLabel = styled(SkyTypography)(() => ({
  fontSize: '14px',
  color: "#5A5F68",
  lineHeight: 1.3,
}));

export const ProjectStatusDateValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '16px',
  fontWeight: 700,
  color: theme.palette.text.primary,
  [theme.breakpoints.down("lg")]: {
    fontSize: '13px',
  },
}));

export const ProjectStatusPriorityRow = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.75),
  marginTop: theme.spacing(0.5),
}));

export const ProjectStatusPriorityBadge = styled(SkyBox)(({ theme }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `2px solid ${theme.palette.error.main}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  fontWeight: 700,
  color: theme.palette.error.main,
  flexShrink: 0,
}));

export const ProjectStatusPriorityValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: '16px',
  fontWeight: 700,
  color: theme.palette.text.primary,
}));