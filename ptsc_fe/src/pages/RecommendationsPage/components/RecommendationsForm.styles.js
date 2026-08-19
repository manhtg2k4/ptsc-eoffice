import {
  styled,
  Grid,
  Box,
  Typography,
  Paper,
  Button,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  ListItemText
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ArchiveIcon from "@mui/icons-material/Archive";
import ImageIcon from "@mui/icons-material/Image";
import { VisibilityOutlined, DeleteOutline, DownloadOutlined } from "@mui/icons-material";

export const FormContainer = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const MainCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 700,
  color: "#0066CC",
  marginBottom: theme.spacing(3),
  textTransform: "uppercase",
}));

export const FileGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const FileCard = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  transition: "all 0.2s",
  cursor: "pointer",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
}));

export const FileIcon = styled(Box)(() => ({
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
  "& svg": {
    fontSize: "24px",
  },
}));

export const FileInfo = styled(Box)({
  flex: 1,
  overflow: "hidden",
});

export const FileName = styled(Typography)({
  fontSize: "13px",
  fontWeight: 500,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const FileSize = styled(Typography)(({ theme }) => ({
  fontSize: "11px",
  color: theme.palette.text.secondary,
}));

export const RemoveFileButton = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "-8px",
  right: "-8px",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  backgroundColor: theme.palette.mode === "dark" ? "#475569" : "#94a3b8",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "12px",
  "&:hover": {
    backgroundColor: theme.palette.error.main,
  },
}));

export const SmallImagePreview = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const ImagePreviewWrapper = styled(Box)(({ theme }) => ({
  width: "40px",
  height: "40px",
  borderRadius: theme.spacing(0.5),
  overflow: "hidden",
  flexShrink: 0,
}));

export const SaveButton = styled(Button)(() => ({
  backgroundColor: "#0066CC",
  color: "#fff",
  textTransform: "none",
  padding: "6px 24px",
  "&:hover": {
    backgroundColor: "#0052A3",
  },
}));

export const UploadButton = styled(Button)(() => ({
  textTransform: "none",
  backgroundColor: "#0066CC",
  color: "#fff",
  border: "none",
  padding: "6px 16px",
  borderRadius: "4px",
  fontWeight: 600,
  "&:hover": {
    backgroundColor: "#0052A3",
  },
}));

export const HeaderContainer = styled(Grid)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(4),
}));

export const FlexBox = styled(Box)({
  flex: 1,
});

// Styled Icons to avoid 'color' prop errors
export const BlueImageIcon = styled(ImageIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const RedPdfIcon = styled(PictureAsPdfIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const InfoDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.info.main,
}));

export const WarningArchiveIcon = styled(ArchiveIcon)(({ theme }) => ({
  color: theme.palette.warning.main,
}));

export const DisabledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.action.disabled,
}));

export const StatusBadge = styled(Box)(() => ({
  padding: "4px 12px",
  borderRadius: "16px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#fef9c3", // light yellow for pending
  color: "#854d0e",
  display: "inline-flex",
  alignItems: "center",
}));

export const StatusBadgeRed = styled(Box)(() => ({
  padding: "4px 12px",
  borderRadius: "16px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  display: "inline-flex",
  alignItems: "center",
}));

export const StatusLabel = styled(Typography)(({ theme }) => ({
  fontSize: "0.875rem",
  fontWeight: 400,
  marginRight: theme.spacing(1),
}));

export const OverdueText = styled(Typography)(() => ({
  color: "#d32f2f",
  fontSize: "0.75rem",
  fontWeight: 600,
  marginLeft: "8px",
}));

export const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.divider}`,
  paddingBottom: theme.spacing(1),
  marginBottom: theme.spacing(2),
  cursor: "pointer",
}));

export const LabelText = styled(Typography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const InfoBox = styled(Box)(({ theme }) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "0 12px",
  backgroundColor: "#f1f5f9",
  borderRadius: theme.spacing(0.5),
  border: `1px solid ${theme.palette.divider}`,
  minHeight: "41px",
  display: "flex",
  alignItems: "center",
  wordBreak: "break-all",
  overflow: "hidden",
}));

export const HistoryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  height: "530px",
  display: "flex",
  flexDirection: "column",
}));

export const TitleBox = styled(Box)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
});

export const TimelineWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  paddingLeft: "24px",
  flex: 1,
  overflowY: "auto",
  paddingRight: theme.spacing(1),
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.divider,
    borderRadius: "3px",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: "7px",
    top: "8px",
    bottom: "0",
    width: "2px",
    backgroundColor: theme.palette.divider,
  },
}));

export const TimelineItem = styled(Box)(({ theme }) => ({
  position: "relative",
  marginBottom: theme.spacing(3),
  "&::after": {
    content: '""',
    position: "absolute",
    left: "-21px",
    top: "4px",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    border: "2px solid #fff",
    boxShadow: "0 0 0 2px " + theme.palette.primary.main,
  },
}));

export const ActionButtonRed = styled(Button)(() => ({
  backgroundColor: "#d32f2f",
  color: "#fff",
  textTransform: "none",
  padding: "6px 24px",
  "&:hover": {
    backgroundColor: "#b71c1c",
  },
}));

export const ActionButtonsWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
}));

export const StatusWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const UrgencyBox = styled(Box)(({ theme }) => ({
  border: "1px solid #e0e0e0",
  borderRadius: theme.spacing(0.5),
  padding: "0 12px",
  backgroundColor: "#f5f5f5",
  height: "41px", // Khớp với chiều cao của InputComponents
  display: "flex",
  alignItems: "center",
}));

export const UrgencyLabel = styled(Typography)(({ theme }) => ({
  fontSize: "0.75rem",
  fontWeight: 600,
  color: theme.palette.text.secondary,
  display: "block",
  marginBottom: "4px",
  paddingLeft: "4px",
}));

export const UploadHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

export const TimelineTitle = styled(Typography)({
  fontWeight: 700,
  color: "#0066CC",
});

export const TimelineText = styled(Typography)({
  fontWeight: 700,
  color: "#0066CC",
});

export const TimelineDate = styled(Typography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
}));

export const SecondaryTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const BlueButton = styled(Button)(() => ({
  textTransform: "none",
  backgroundColor: "#fff",
  color: "#0066CC",
  border: "1px solid #0066CC",
  borderRadius: "10px",
  fontWeight: 600,
  padding: "5px 16px",
  "&:hover": {
    backgroundColor: "#EBF3FC",
    borderColor: "#0052A3",
    color: "#0052A3",
  },
}));

export const GreenButton = styled(Button)(() => ({
  textTransform: "none",
  backgroundColor: "#0066CC",
  color: "#fff",
  "&:hover": {
    backgroundColor: "#0052A3",
  },
}));

export const OrangeButton = styled(Button)(() => ({
  textTransform: "none",
  backgroundColor: "#ed6c02",
  color: "#fff",
  "&:hover": {
    backgroundColor: "#e65100",
  },
}));

export const BoldText = styled(Typography)({
});

export const SectionTitleNoMargin = styled(SectionTitle)({
  marginBottom: 0,
});

export const SectionTitleWithBottomMargin = styled(SectionTitleNoMargin)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const FlexInfoBox = styled(InfoBox)({});

export const CaptionText = styled(Typography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  fontWeight: 600,
  display: "block",
  marginBottom: theme.spacing(0.5),
}));

export const DropdownWrapper = styled(Box)(() => ({
  marginTop: "21px",
}));

export const RedText = styled(Typography)(() => ({
  color: "#d32f2f",
  fontWeight: 600,
  fontSize: "0.875rem",
  display: "inline",
}));

export const ActionButtonRedWithMargin = styled(ActionButtonRed)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

export const CreatorInfoWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const CreatorInfoLabel = styled(Typography)(({ theme }) => ({
  fontSize: "0.875rem",
  color: theme.palette.text.secondary,
  display: "inline",
  marginRight: theme.spacing(1),
}));

export const CreatorInfoValue = styled(Typography)(() => ({
  fontSize: "0.875rem",
  fontWeight: 500,
  display: "inline",
}));

export const MarginBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(0.5),
}));

export const ReasonText = styled(Typography)(() => ({
}));

export const LoadingContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const StatusBadgeGreen = styled(Box)(() => ({
  padding: "4px 12px",
  borderRadius: "16px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#dcfce7",
  color: "#166534",
  display: "inline-flex",
  alignItems: "center",
}));

export const StatusBadgeBlue = styled(Box)(() => ({
  padding: "4px 12px",
  borderRadius: "16px",
  fontSize: "12px",
  fontWeight: 600,
  backgroundColor: "#e0f2fe",
  color: "#0369a1",
  display: "inline-flex",
  alignItems: "center",
}));

export const FileTableContainer = styled(TableContainer)(({ theme }) => ({
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  maxHeight: "300px",
  overflow: "auto",
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: "#f1f5f9",
  "& th": {
    fontWeight: 600,
    color: theme.palette.text.primary,
    borderBottom: `2px solid ${theme.palette.divider}`,
    padding: "12px 16px",
  },
  "& th:first-of-type": {
    width: "10%",
  },
  "& th:last-of-type": {
    width: "10%",
  }
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.background.paper,
  },
  "&:nth-of-type(even)": {
    backgroundColor: "#f8fafc",
  },
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& td": {
    padding: "8px 16px",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

export const FileNameCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.primary.main,
  cursor: "pointer",
  "&:hover": {
    textDecoration: "underline",
  },
}));

export const BlueMenuIconWrapper = styled(Box)(() => ({
  display: "inline-flex",
  color: "#0066CC", // Blue color
  "& svg": {
    fontSize: "1.2rem"
  }
}));

export const BlueVisibilityIcon = styled(VisibilityOutlined)(() => ({
  color: "#0066CC",
}));

export const BlueDownloadIcon = styled(DownloadOutlined)(() => ({
  color: "#0066CC",
}));

export const RedDeleteIcon = styled(DeleteOutline)(() => ({
  color: "#ff4d4f",
}));

export const RedListItemText = styled(ListItemText)(() => ({
  "& .MuiListItemText-primary": {
    color: "#ff4d4f",
  },
}));