import { styled } from "@mui/material/styles";
import { 
  SkyBox, 
  SkyTypography,
  SkyCheckbox, 
  SkyIconButton, 
  SkyGrid, 
  SkyDivider, 
  SkyTableContainer, 
  SkyButton, 
  SkyTableCell 
} from "@styles/SkyStyles";
import { 
  Avatar, 
  LinearProgress, 
  Slider, 
  ListItemIcon, 
  Tooltip, 
  tooltipClasses, 
  Button,
  Radio
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import MenuIcon from "@mui/icons-material/Menu";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PeopleIcon from "@mui/icons-material/People";
export const StyledBoxContainerContent = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "styledMarginTop" && prop !== "fullHeight" && prop !== "styledPadding",
})(({ theme, styledMarginTop, fullHeight, styledPadding }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 6,
  border: "1px solid #e8eaf1",
  marginBottom: theme.spacing(2),
  marginTop: styledMarginTop ? theme.spacing(2) : 0,
  padding: styledPadding ? theme.spacing(styledPadding) : theme.spacing(1.5),
  ...(fullHeight && { height: "100%" }),
}));

export const JobMainContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2.25, 0, 1),
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(2.25, 0, 1.5),
  },
}));

export const JobSectionTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "mt" && prop !== "mb" && prop !== "$uppercase",
})(({ theme, mt, mb, $uppercase }) => ({
  marginTop: mt !== undefined ? theme.spacing(mt) : theme.spacing(1),
  marginBottom: mb !== undefined ? theme.spacing(mb) : theme.spacing(2.5),
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  ...($uppercase && {
    textTransform: 'uppercase',
    marginBottom: 0,
  }),
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: theme.spacing(0.5),
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
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
}));

export const JobDeleteIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const JobCommentSection = styled(SkyBox)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  maxHeight: "400px",
  overflowY: "auto",
}));
export const JobCommentBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark"
    ? theme.palette.action.hover
    : "#f1f3f5",
  borderRadius: 8,
  padding: theme.spacing(2),
  flex: 1,
}));

export const JobCommentItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
  marginLeft: level ? theme.spacing(level * 6) : 0,
  maxWidth: "45%",
  [theme.breakpoints.down("sm")]: {
    maxWidth: "100%",
  },
}));

export const JobCommentHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: theme.spacing(0.5),
}));
export const JobCommentUserInfo = styled(SkyBox)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

export const JobCommentAvatar = styled(Avatar)(() => ({
  width: 40,
  height: 40,
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

export const JobCommentActionText = styled(SkyTypography)(({ theme }) => ({
  cursor: "pointer",
  color: theme.palette.text.secondary,
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

export const SectionHeaderContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

export const BoldCompanyLabel = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const CompanyCheckbox = styled(SkyCheckbox)(() => ({
  padding: '4px',
  color: '#dbdde0',
  '&.Mui-checked': {
    color: '#3b82f6',
  },
}));

export const JobSubTaskHeader = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const JobSubTaskTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
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
  <Button {...props} variant="outlined" color={getStatusColor(taskStatus)} />
))({});

export const JobCommentDivider = styled(SkyDivider)(({ theme }) => ({
  margin: theme.spacing(3, 0),
}));

export const JobCommentInputContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

export const JobSlider = styled(Slider)(() => ({
  color: "#1b8ae4ff",
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

export const HistoryTableContainer = styled(SkyTableContainer)(() => ({
    maxHeight: "465px",
}));

export const StyledMenuIcon = styled(MenuIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
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
})(({  width }) => ({
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
export const StyledListItemIcon = styled(ListItemIcon)(() => ({
  color: 'inherit',           // Kế thừa từ parent (MenuItem)
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
      ? theme.palette.primary.main
      : "transparent",
  },
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
  backgroundColor: "#fff",
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
  color: "white",
}));

export const ParticipantHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(2),
}));

export const ParticipantStats = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
}));


export const StatText = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "colorType",
})(({ theme, colorType }) => ({
  fontSize: "14px",
  fontWeight: 500,
  color: colorType === "green" ? theme.palette.success.main : colorType === "red" ? theme.palette.error.main : theme.palette.text.secondary,
}));

export const StatItem = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "colorType" && prop !== "$stats",
})(({ theme, colorType, $stats }) => ({
  fontSize: "0.875rem",
  fontWeight: 600,
  color: colorType === "red" ? theme.palette.error.main : theme.palette.primary.main,
  ...($stats && {
    fontSize: '14px',
  }),
  "& span": {
    marginLeft: theme.spacing(0.5),
  },
}));

export const BoardSection = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const BoardGrid = styled(SkyGrid)(() => ({
  marginTop: 0,
  marginBottom: 0,
  '& > .MuiGrid-item': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
  }
}));

export const BoardCard = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(2, 3),
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' 
    ? (type === "chair" ? "rgba(124, 58, 237, 0.15)" : "rgba(245, 158, 11, 0.15)")
    : (type === "chair" ? "#F5F3FF" : "#FFFBEB"),
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? (type === "chair" ? "rgba(124, 58, 237, 0.3)" : "rgba(245, 158, 11, 0.3)")
      : (type === "chair" ? "#DDD6FE" : "#FEF3C7")
  }`,
  height: "100%",
  minHeight: "110px",
  position: 'relative',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  }
}));

export const BoardAvatar = styled(Avatar)(({ theme }) => ({
  width: 64,
  height: 64,
  borderRadius: '50%',
  marginRight: theme.spacing(3),
  border: `2px solid #fff`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}));

export const BoardIconBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === 'dark'
    ? (type === "chair" ? "rgba(25, 118, 210, 0.2)" : "rgba(46, 125, 50, 0.2)")
    : (type === "chair" ? "#e1effe" : "#e6f4ea"),
  marginRight: theme.spacing(2),
  "& svg": {
    fontSize: "1.5rem",
    color: theme.palette.mode === 'dark'
      ? (type === "chair" ? "#64b5f6" : "#66bb6a")
      : (type === "chair" ? "#1a56db" : "#10b981"),
  },
}));

export const BoardInfo = styled(SkyBox)(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}));

export const BoardLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1.25),
  letterSpacing: '0.05em',
}));

export const BoardName = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== "$small",
})(({ theme, $small }) => ({
  fontSize: "1.25rem",
  fontWeight: 700,
  color: theme.palette.mode === 'dark' ? "#fff" : "#1E293B",
  marginBottom: '2px',
  ...($small && {
    fontSize: '16px',
  })
}));

export const BoardTitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "alignEnd",
})(({ theme, alignEnd }) => ({
  fontSize: "0.875rem",
  color: theme.palette.mode === "dark" ? "#94a3b8" : "#6b7280",
  ...(alignEnd && {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  }),
}));

export const AttendanceSection = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const DepartmentAccordion = styled(SkyBox)(({ theme }) => ({
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e5e7eb",
  borderRadius: 8,
  marginBottom: theme.spacing(2),
  overflow: "hidden",
}));

export const DepartmentHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f9fafb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e5e7eb"}`,
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#2d3748" : "#f3f4f6",
  },
}));

export const DepartmentTitle = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== "$full",
})(({ $full }) => ({
  display: "flex",
  flexDirection: "column",
  ...($full && {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  })
}));

export const DepartmentName = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== "$uppercase",
})(({ theme, $uppercase }) => ({
  fontSize: "0.95rem",
  fontWeight: 700,
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#374151",
  ...($uppercase && {
    textTransform: 'uppercase',
  })
}));

export const ActionLink = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8125rem",
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#2563eb",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  marginTop: theme.spacing(0.5),
  "&:hover": {
    textDecoration: "underline",
  },
}));

export const DepartmentContent = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== "$slate",
})(({ theme, $slate }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
  ...($slate && {
    backgroundColor: theme.palette.mode === 'dark' ? "#1e293b" : "#F8FAFC",
  })
}));

export const ParticipantRow = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1.5),
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#f3f4f6",
  borderRadius: 8,
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

export const DocumentBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "indented",
})(({ theme, indented }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#ffffff",
  borderRadius: 8,
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
  marginBottom: theme.spacing(indented ? 1.5 : 2),
  marginLeft: indented ? theme.spacing(2) : 0,
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    borderColor: '#94a3b8',
  }
}));

export const DocumentTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: 700,
  textTransform: "uppercase",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1.5),
}));

export const DocumentInfoRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  "&:last-child": {
    marginBottom: 0,
  },
}));

export const DocumentLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
  // width: 60,
  flexShrink: 0,
}));

export const DocumentValue = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "preLine",
})(({ theme, preLine }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.primary,
  fontWeight: 500,
  whiteSpace: preLine ? "pre-line" : "normal",
}));

export const EditParticipantButton = styled(SkyButton)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  textTransform: "none",
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.primary.main : "#0062ac",
  color: "#fff",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.primary.dark : "#004a82",
  },
}));

export const SectionSubtitle = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "small" && prop !== "greyText" && prop !== "$blue" && prop !== "$noMargin",
})(({ theme, small, greyText, $blue, $noMargin }) => ({
  fontWeight: 700,
  color: greyText ? "#666" : ($blue ? '#0066CC' : "#6b7280"),
  marginBottom: theme.spacing(1.5),
  marginTop: theme.spacing(small && greyText ? 2 : 0.5),
  textTransform: "uppercase",
  fontSize: small ? "0.75rem" : "15px",
  ...($blue && {
    marginBottom: theme.spacing(1),
  }),
  ...($noMargin && {
    marginBottom: 0,
  })
}));

export const StatDivider = styled(SkyDivider)(({ theme }) => ({
  margin: theme.spacing(0, 1),
}));

export const ParticipantName = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#2563eb",
  fontSize: "0.875rem",
}));

export const StyledAddIcon = styled(AddIcon)(({ theme }) => ({
  fontSize: "1rem",
  marginRight: theme.spacing(0.5),
}));

export const DocumentHeaderBox = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}));

export const DocumentActionIcon = styled(MoreVertIcon)(() => ({
  color: "#2563eb",
  fontSize: "1.25rem",
  cursor: "pointer",
}));

export const ArrowUpIcon = styled(KeyboardArrowUpIcon)(() => ({
  color: "#6b7280",
}));

export const ArrowDownIcon = styled(KeyboardArrowDownIcon)(() => ({
  color: "#6b7280",
}));

export const EmptyStateText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: "italic",
  padding: theme.spacing(2),
  textAlign: 'center',
  width: '100%',
}));
export const StyleBoxButton = styled(SkyBox)(({ theme }) => ({
 display: "flex",
   gap: theme.spacing(2),
   padding: 0,
}));

export const LightTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.common.white,
    color: 'rgba(0, 0, 0, 0.87)',
    boxShadow: theme.shadows[1],
    fontSize: 11,
    maxWidth: 300,
    border: '1px solid #dadde9',
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.common.white,
  },
}));

// TaskIcons styled components
export const TaskIconsContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const TaskActionLink = styled(ActionLink)(({ theme }) => ({
  minWidth: 'auto',
  marginRight: theme.spacing(1),
}));

export const TaskAddIcon = styled(StyledAddIcon)(() => ({
  marginRight: 0,
}));

export const TooltipContentBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1),
}));

export const TooltipTitle = styled(SkyTypography)(() => ({
  fontWeight: 'bold',
}));

export const TaskCountText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 'bold',
  cursor: 'pointer',
  '&:hover': {
    opacity: 0.8,
  }
}));

export const TaskExpandToggleText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontWeight: 'bold',
  cursor: 'pointer',
  marginLeft: theme.spacing(0.5),
  opacity: 0.7,
  '&:hover': {
    opacity: 1,
  }
}));

export const TaskFileIcon = styled(InsertDriveFileIcon)(() => ({
  color: '#FBC02D',
  fontSize: 20,
}));

export const StatusBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "variantType",
})(({ theme, variantType }) => {
  const isDark = theme.palette.mode === 'dark';
  const styles = {
    success: {
      backgroundColor: isDark ? "rgba(22, 163, 74, 0.2)" : "#e6f4ea",
      color: isDark ? "#4ade80" : "#1e7e34",
    },
    error: {
      backgroundColor: isDark ? "rgba(220, 38, 38, 0.2)" : "#fdecea",
      color: isDark ? "#f87171" : "#d32f2f",
    },
    warning: {
      backgroundColor: isDark ? "rgba(234, 88, 12, 0.2)" : "#fff4e5",
      color: isDark ? "#fb923c" : "#b95000",
    },
    default: {
      backgroundColor: isDark ? "rgba(107, 114, 128, 0.2)" : "#f3f4f6",
      color: isDark ? "#9ca3af" : "#6b7280",
    },
  };
  const style = styles[variantType] || styles.default;
  return {
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "0.75rem",
    fontWeight: 600,
    backgroundColor: style.backgroundColor,
    color: style.color,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  };
});

export const StatsSummary = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  fontSize: "0.8125rem",
  fontWeight: 600,
}));

export const StatChip = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "colorType" && prop !== "$noBackground",
})(({ theme, colorType, $noBackground }) => {
  const isDark = theme.palette.mode === 'dark';
  const colors = {
    blue: { bg: isDark ? "rgba(37, 99, 235, 0.15)" : "#EFF6FF", text: isDark ? "#60a5fa" : "#2563eb", dot: "#2563eb" },
    red: { bg: isDark ? "rgba(220, 38, 38, 0.15)" : "#FEF2F2", text: isDark ? "#f87171" : "#dc2626", dot: "#dc2626" },
    green: { bg: isDark ? "rgba(22, 163, 74, 0.15)" : "#F0FDF4", text: isDark ? "#4ade80" : "#16a34a", dot: "#16a34a" },
    grey: { bg: isDark ? "rgba(107, 114, 128, 0.15)" : "#F9FAFB", text: isDark ? "#9ca3af" : "#6b7280", dot: "#6b7280" },
  };
  const c = colors[colorType] || colors.grey;
  return {
    display: 'flex',
    alignItems: 'center',
    padding: $noBackground ? '4px 0' : '4px 12px',
    borderRadius: '20px',
    backgroundColor: $noBackground ? 'transparent' : c.bg,
    color: c.text,
    fontSize: '14px',
    fontWeight: 500,
    gap: '8px',
    '&::before': {
      content: '""',
      width: '3px',
      height: '14px',
      borderRadius: '2px',
      backgroundColor: c.dot,
    }
  };
});

export const ParticipantCard = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1.5, 2),
  borderRadius: 12,
  backgroundColor: theme.palette.mode === 'dark' ? "#1e293b" : "#FFFFFF",
  border: `1px solid ${theme.palette.mode === 'dark' ? "#334155" : "#F1F5F9"}`,
  height: "100%",
  transition: 'all 0.2s',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
    borderColor: theme.palette.primary.light,
  }
}));

export const ParticipantAvatarBox = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  marginRight: theme.spacing(1.5),
}));

export const ParticipantContent = styled(SkyBox)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
});

export const ParticipantStatus = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => {
  const isDark = theme.palette.mode === 'dark';
  const colors = {
    success: { bg: isDark ? "rgba(22, 163, 74, 0.1)" : "#ECFDF5", text: isDark ? "#34d399" : "#059669" },
    error: { bg: isDark ? "rgba(220, 38, 38, 0.1)" : "#FEF2F2", text: isDark ? "#f87171" : "#dc2626" },
    info: { bg: isDark ? "rgba(37, 99, 235, 0.1)" : "#EFF6FF", text: isDark ? "#60a5fa" : "#2563eb" },
  };
  const c = colors[type] || { bg: '#F3F4F6', text: '#6B7280' };
  return {
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: c.bg,
    color: c.text,
    fontSize: '11px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
});

export const GreenButtonOutline = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? "#4ade80" : "#2e7d32",
  borderColor: theme.palette.mode === 'dark' ? "#4ade80" : "#2e7d32",
  textTransform: 'none',
  fontWeight: 600,
  '&:hover': {
    borderColor: theme.palette.mode === 'dark' ? "#22c55e" : "#1b5e20",
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(74, 222, 128, 0.08)" : "rgba(46, 125, 50, 0.04)",
  },
  '&.Mui-disabled': {
    borderColor: theme.palette.action.disabledBackground,
  }
}));

export const BlueButtonOutline = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.mode === 'dark' ? "#60a5fa" : "#0052cc",
  borderColor: theme.palette.mode === 'dark' ? "#60a5fa" : "#0052cc",
  textTransform: 'none',
  fontWeight: 600,
  '&:hover': {
    borderColor: theme.palette.mode === 'dark' ? "#3b82f6" : "#0041a3",
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(96, 165, 250, 0.08)" : "rgba(0, 82, 204, 0.04)",
  },
  '&.Mui-disabled': {
    borderColor: theme.palette.action.disabledBackground,
  }
}));

export const ParticipantHeaderBox = styled(ParticipantHeader, {
  shouldForwardProp: (prop) => prop !== "isExpanded",
})(({ theme, isExpanded }) => ({
  cursor: 'pointer',
  borderBottom: isExpanded ? 'none' : 'none',
  paddingBottom: isExpanded ? theme.spacing(1) : 0,
}));

export const DepartmentStats = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1.5),
  alignItems: "center",
  marginTop: theme.spacing(0.5),
}));

export const ParticipantRowContent = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
}));

export const GreyCaption = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== "$block",
})(({ theme, $block }) => ({
  color: theme.palette.mode === "dark" ? "#94a3b8" : "#6b7280",
   fontSize: "0.875rem",
  ...($block && {
    display: 'block',
    marginTop: theme.spacing(0.5),
  })
}));

export const FlexBox = styled(SkyBox)(() => ({
  display: "flex",
}));

export const FlexCenterGap16 = styled(FlexBox)(({ theme }) => ({
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const FlexGap8 = styled(FlexBox)(({ theme }) => ({
  gap: theme.spacing(1),
}));

export const FlexGrowBox = styled(SkyBox)(() => ({
  flexGrow: 1,
}));

export const BoldSubtitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const UppercaseBoldSubtitle = styled(BoldSubtitle)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  color: '#666',
  textTransform: 'uppercase',
}));

export const FlexSpaceBetweenCenterBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 0,
  marginBottom: theme.spacing(2),
}));

export const TaskActionBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const GreyCaptionWithMargin = styled(GreyCaption)(() => ({
  marginLeft: 0,
}));

export const TaskTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  marginBottom: theme.spacing(1),
  color: theme.palette.text.primary,
}));

// Box with margin top 2
export const BoxMarginTop2 = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

// Flex box with space-between and flex-start alignment
export const FlexSpaceBetweenBox = styled(SkyBox)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
}));

// Box with flex: 1
export const FlexOneBox = styled(SkyBox)(() => ({
  flex: 1,
}));

// Styled TableContainer for file list
export const StyledTableContainer = styled(SkyTableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  boxShadow: 'none',
  border: '1px solid',
  borderColor: theme.palette.divider,
  backgroundImage: 'none',
  backgroundColor: 'transparent',
}));

// Styled Header Cell for tables
export const StyledHeaderCell = styled(SkyTableCell)(({ theme }) => ({
  fontWeight: 600,
  backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#f5f5f5',
  color: theme.palette.mode === 'dark' ? '#fff' : 'inherit',
}));

// Styled Header Cell with specific width
export const StyledHeaderCellWithWidth = styled(StyledHeaderCell)(() => ({
  width: 50,
}));

// Error IconButton
export const ErrorIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const NavigationContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(2),
  marginTop: theme.spacing(mt !== undefined ? mt : 3),
}));

export const CompletionBox = styled(SkyBox)(({ theme }) => ({
  paddingTop: theme.spacing(6),
  paddingBottom: theme.spacing(6),
  textAlign: "center",
}));

export const CenterActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  gap: theme.spacing(2),
}));

export const StyledPrimaryButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const EmptyDocumentText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: "italic",
  padding: theme.spacing(1),
  textAlign: "center",
  width: "100%",
}));


export const BoxCommentSectionContainer = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}));

export const ConfirmScopeTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(2),
}));

export const ConfirmScopeLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "active" && prop !== "dimmed",
})(({ active, dimmed }) => ({
  fontWeight: active ? 'bold' : 'normal',
  color: dimmed ? '#999' : 'inherit',
}));

export const ConfirmScopeRadio = styled(Radio)(({ theme }) => ({
  color: theme.palette.primary.main,
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
}));

export const MeetingStatsBanner = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => {
  const isDark = theme.palette.mode === 'dark';
  const colors = {
    SUCCESS: {
      bg: isDark ? "rgba(22, 163, 74, 0.15)" : "#d4edda",
      border: isDark ? "rgba(22, 163, 74, 0.3)" : "#c3e6cb",
      color: isDark ? "#4ade80" : "#155724",
    },
    WARNING: {
      bg: isDark ? "rgba(234, 88, 12, 0.15)" : "#fff3cd",
      border: isDark ? "rgba(234, 88, 12, 0.3)" : "#ffeeba",
      color: isDark ? "#fb923c" : "#856404",
    },
    ERROR: {
      bg: isDark ? "rgba(220, 38, 38, 0.15)" : "#f8d7da",
      border: isDark ? "rgba(220, 38, 38, 0.3)" : "#f5c6cb",
      color: isDark ? "#f87171" : "#721c24",
    }
  };
  const color = colors[type] || colors.WARNING;
  return {
    padding: theme.spacing(1, 2),
    borderRadius: 8,
    backgroundColor: color.bg,
    border: `1px solid ${color.border}`,
    color: color.color,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    fontWeight: 500,
    fontSize: "14px",
    height: "44px",
    '& .dot': {
      width: 10,
      height: 10,
      borderRadius: '50%',
      backgroundColor: 'currentColor',
    }
  };
});

export const BoardGridContainer = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e5e7eb"}`,
  borderRadius: 8,
  padding: theme.spacing(0, 2, 2, 2),
  backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.02)" : "#f9fafb",
  marginTop: theme.spacing(1.5),
  overflow: "hidden",
}));

export const FlexAlignCenterGap = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
}));

export const FlexJustifyBetweenAlignCenterMargin = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== "mt",
})(({ theme, mt }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  ...(mt && { marginTop: theme.spacing(mt) }),
}));

export const FlexGap = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
}));

export const StyledPeopleIcon = styled(PeopleIcon)(() => ({
  color: '#2563eb',
  fontSize: '24px',
}));

export const MeetingStatsDetailsRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1),
  marginBottom: 0,
}));

export const MeetingStatPill = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ theme, status }) => {
  const isDark = theme.palette.mode === 'dark';
  const isSuccess = status === 'SUCCESS';
  return {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1.2),
    borderRadius: 20,
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor: isSuccess 
      ? (isDark ? "rgba(22, 163, 74, 0.1)" : "#d4edda")
      : (isDark ? "rgba(234, 88, 12, 0.1)" : "#fff3cd"),
    color: isSuccess
      ? (isDark ? "#4ade80" : "#155724")
      : (isDark ? "#fb923c" : "#856404"),
    '& svg': {
      fontSize: "14px",
    }
  };
});
