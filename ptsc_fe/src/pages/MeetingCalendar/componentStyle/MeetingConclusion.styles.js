import { styled } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { 
  SkyBox, 
  SkyTypography, 
  SkyPaper, 
  SkyTable, 
  SkyTableHead, 
  SkyIconButton, 
  SkyTableCell,
  SkySvgIcon
} from "@styles/SkyStyles";
import { StyledActionButton } from "@styles/ButtonOutline";
import { 
  SectionTitle,
  StyledAddIcon,
  StyledCloseIcon,
  NoDataBox
} from "./MeetingCommon.styles";

export {
  SectionTitle,
  StyledAddIcon,
  StyledCloseIcon,
  NoDataBox
};

export const ConclusionContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(3),
  padding: 0,
}));

export const ConclusionSection = styled(SkyBox)(({ theme }) => ({
  // borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
}));

// Migrated SectionTitle

export const StyledTable = styled(SkyTable)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  borderCollapse: "collapse",
  "& .MuiTableCell-root": {
    border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
    padding: theme.spacing(1.5),
  },
  marginTop: theme.spacing(2),
}));

export const StyledTableHead = styled(SkyTableHead)(({ theme }) => ({
  "& .MuiTableCell-root": {
    backgroundColor: theme.palette.mode === "dark" ? "#1e40af" : "#0062ac",
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
  },
}));

export const AddItemLink = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: theme.palette.primary.main,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(2),
  fontWeight: 500,
  "&:hover": {
    textDecoration: "underline",
  },
}));

export const RelatedMeetingCard = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  marginBottom: theme.spacing(2),
  position: "relative",
}));

export const RelatedMeetingTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.95rem",
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

export const RelatedMeetingTime = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
}));

export const RelatedConclusionList = styled(SkyBox)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  "& .item": {
    fontSize: "0.85rem",
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(0.5),
    display: "flex",
    gap: theme.spacing(1),
  },
}));

export const RemoveIconButton = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1),
  right: theme.spacing(1),
  cursor: "pointer",
  color: theme.palette.text.secondary,
  "&:hover": {
    color: theme.palette.error.main,
  },
}));

export const UploadContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
  padding: theme.spacing(3),
  borderRadius: "8px",
  minHeight: "120px",
  position: "relative",
  justifyContent: "center",
}));

export const FileItemContainer = styled(SkyPaper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  boxShadow: 'none',
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
}));

export const FileItemInfo = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const FileName = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 500,
  color: theme.palette.primary.main,
  fontSize: "0.9rem",
}));

export const FileMeta = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.75rem",
}));

export const UploadConclusionButton = styled(StyledActionButton, {
  shouldForwardProp: (prop) => prop !== 'isRelative',
})(({ theme, isRelative }) => ({
  width: 'fit-content',
  position: isRelative ? 'relative' : "absolute",
  top: isRelative ? 'auto' : 16,
  left: isRelative ? 'auto' : 16,
  marginBottom: isRelative ? theme.spacing(1) : 0,
  zIndex: 1,
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const AddConclusionButton = styled(StyledActionButton)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const AddLinkConclusionButton = styled(StyledActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));



export const NoFileText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
      marginTop: theme.spacing(1),
}));

export const StyledDeleteIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const StyledDeleteIcon = styled(DeleteOutlineIcon)(() => ({
  fontSize: "1.25rem",
}));

// Migrated StyledAddIcon

export const AddLinkBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));





// Migrated StyledCloseIcon

export const TableCellSTT = styled(SkyTableCell)(() => ({
  width: 60,
}));

export const TableCellAction = styled(SkyTableCell)(() => ({
  width: 120,
}));

export const TableCellCheckbox = styled(SkyTableCell)(() => ({
  width: 50,
}));

export const BulkExportButton = styled(StyledActionButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& .MuiButton-startIcon': {
    marginRight: theme.spacing(1),
  }
}));

export const ExportIcon = (props) => (
  <SkySvgIcon {...props} widths="18" heights="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.5327 2.22907L16.1433 0.549771C15.8734 0.209912 15.4636 0 14.9938 0H2.99875C2.52895 0 2.11912 0.209912 1.83923 0.549771L0.459808 2.22907C0.169929 2.56893 0 3.01874 0 3.49854V15.9933C0 17.0929 0.899625 17.9925 1.99917 17.9925H15.9933C17.0929 17.9925 17.9925 17.0929 17.9925 15.9933V3.49854C17.9925 3.01874 17.8226 2.56893 17.5327 2.22907ZM8.99625 14.494L3.49854 8.99625H6.99708V6.99708H10.9954V8.99625H14.494L8.99625 14.494ZM2.11912 1.99917L2.92878 0.999583H14.9238L15.8634 1.99917H2.11912Z" fill="currentColor"/>
  </SkySvgIcon>
);
export const SelectedCountBox = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const SelectedCountText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledInsertDriveFileIcon = styled(InsertDriveFileIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const FileListContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const FileRowInfo = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const FileNameButton = styled(FileName)(() => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  textAlign: 'left',
}));

export const FileMetaRow = styled(FileMeta)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

export const StyledDownloadIcon = () => (
<svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.4 5.33203V6.93203H1.06667V5.33203H0V6.93203V7.9987H7.46667V6.93203V5.33203H6.4Z" fill="#555555"/>
<path d="M5.86628 3.73333H4.79961V0H2.66628V3.73333H1.59961L3.73294 6.4L5.86628 3.73333Z" fill="#555555"/>
</svg>
);

export const FileDescriptionBox = styled(SkyBox)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export const TopRightActionBox = styled(SkyBox)(({ theme }) => ({
  position: "absolute",
  top: "50%",
  right: theme.spacing(1),
  transform: "translateY(-50%)",
  zIndex: 1,
}));

export const SectionHeader = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

export const HeaderActionBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
}));

export const TotalTaskSummaryText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.8rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
}));

export const TaskGroup = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px',
  marginBottom: theme.spacing(2),
  overflow: 'hidden',
}));

export const TaskGroupHeader = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#fff',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
  },
}));

export const TaskGroupTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.9rem',
  fontWeight: 600,
  color: theme.palette.text.primary,
  display: 'flex',
  gap: theme.spacing(1),
}));

export const TaskGroupAction = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

export const TaskCountBadge = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 700,
  color: theme.palette.success.main,
}));

export const TaskTableContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#fff',
}));
