import { styled } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DescriptionIcon from "@mui/icons-material/Description";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SearchIcon from "@mui/icons-material/Search";
// import TuneIcon from "@builder-table/components/TuneIcon";
import MicIcon from "@mui/icons-material/Mic";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { 
  SkyBox, 
  SkyTypography, 
  SkyPaper, 
  SkyButton, 
  // SkyTextField, 
  // SkyFormControlLabel, 
  // SkyCheckbox,
  SkyIconButton
} from "@styles/SkyStyles";
import { StyledActionButton } from "@styles/ButtonOutline";
export { 
  SectionTitle,
  AttendanceHeaderBox,
  AttendanceTitle,
  AttendanceStats,
  AttendanceRow,
  NoDataBox,
  PopoverSearchIcon,
  PopoverFilterIcon,
  WhitePopoverSearchIcon,
  WhitePopoverFilterIcon,
  SearchContainer,
  StyledSearchField,
  StyledSearchButton,
  StyledFilterButton,
  FilterPopoverContent,
  PopoverTitle,
  FilterActions,
  SearchFilterGrid,
  MemberInfoBox,
  MemberRoleText,
  ActionsBox,
  LinkBox,
  OnlineLinkText,
  DocumentAccordionItem,
  DocumentAccordionHeader,
  StatItemBlue,
  StatItemGreen,
  StatItemRed,
  StatItemGrey,
  PaginationWrapper,
  PaginationContainerStyled,
  PaginationActionsBox,
  StyleDropDown,
  StyleNavButton,
  StyleActionPage,
  StylePageButton,
  StylePageDots,
  PageInfoText,
  StyledSelect,
  PageSizeBox,
  StyledInputAdornment,
  SearchOptionIconButton,
  ClearSearchIconButton,
  PremiumTuneIcon,
  InputClearIcon,
  AttendanceInfoWrapper,
  AttendanceLockInfo,
  AttendanceSeparator,
  AttendanceLockIcon,
  MeetingHeaderWrapper,
  IconTextWrapper,
  StatBannerItem,
  PopoverPaperProps,
  StyledInputAdornmentEnd,
} from "./MeetingCommon.styles";

export const RecordingHeaderWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const RecordingControlsWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));




export const ManagementContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: 0,
}));

export const HeaderActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
}));

export const HeaderButtons = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
}));

export const StatusGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const StatusChip = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "type",
})(({ theme, type }) => ({
  padding: "6px 16px",
  borderRadius: "4px",
  fontSize: "0.85rem",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  backgroundColor: type === "success" 
    ? (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#ecfdf5")
    : (theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.2)" : "#eff6ff"),
  color: type === "success" ? "#10b981" : "#3b82f6",
  border: `1px solid ${type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
}));
export const StartMeetingButton = styled(StyledActionButton)(() => ({
  backgroundColor: '#10b981',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#059669',
  },
}));

export const EndMeetingButton = styled(StyledActionButton)(() => ({
  backgroundColor: '#ef4444',
  color: '#fff',
  '&:hover': {
    backgroundColor: '#dc2626',
  },
}));

export const SectionPaper = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
}));

// Migrated SectionTitle, AttendanceHeaderBox, AttendanceTitle

export const InfoGrid = styled(SkyBox)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
}));

export const InfoLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const InfoValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.95rem",
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

export const InfoValueBold = styled(InfoValue)(() => ({
  fontWeight: 700,
}));

// Migrated LinkBox, OnlineLinkText

export const RecordingControls = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
  borderRadius: "8px",
}));

export const RecordingButtons = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    gap: theme.spacing(1),
}));

export const ActionButton = styled(SkyButton, {
  shouldForwardProp: (prop) => prop !== "variantType",
})(({ theme, variantType }) => ({
  textTransform: "none",
  backgroundColor: variantType === "start" ? "#10b981" : variantType === "end" ? "#f59e0b" : theme.palette.primary.main,
  color: "#fff",
  "&:hover": {
    backgroundColor: variantType === "start" ? "#059669" : variantType === "end" ? "#d97706" : theme.palette.primary.dark,
  },
}));


export const SaveRecordingButton = styled(SkyButton)(({ theme }) => ({
    textTransform: "none", 
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    "&:hover": {
        backgroundColor: theme.palette.primary.dark,
    }
}));

export const RecordingDurationText = styled(SkyTypography)(() => ({
  backgroundColor: 'rgba(59, 130, 246, 0.08)',
  padding: '6px 16px',
  borderRadius: '6px',
  color: '#2364B0',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  minHeight: '40px',
  fontSize: '0.85rem',
}));

export const RecordingContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f1f5f9",
  borderRadius: "8px",
  minHeight: "150px",
  fontSize: "0.95rem",
  lineHeight: 1.6,
  color: theme.palette.text.primary,
}));

export const AudioFileBox = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f8fafc",
  borderRadius: "8px",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
}));

export const RecordingSplitWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(3),
  marginTop: theme.spacing(2),
  [theme.breakpoints.down("md")]: {
    flexDirection: "column",
  },
}));

export const RecordingTranscriptColumn = styled(SkyBox)(() => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
}));

export const RecordingFilesColumn = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  minWidth: 0,
}));

export const AudioFileItemCard = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  borderRadius: "8px",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  transition: "all 0.2s ease",
  "&:hover": {
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    borderColor: theme.palette.primary.main,
  },
}));

export const NewAudioFileItemCard = styled(AudioFileItemCard)(() => ({
  borderColor: '#10b981',
  backgroundColor: 'rgba(16, 185, 129, 0.05)',
}));

export const AudioFileHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1.5),
}));

export const AudioPlayerWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(1),
  "& .audio-player": {
    width: '100%',
    height: '35px',
  }
}));

export const AudioProgressBar = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  height: "4px",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0",
  borderRadius: "2px",
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    width: "0%",
    backgroundColor: theme.palette.primary.main,
    borderRadius: "2px",
  },
}));

export const AudioTimeText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const FileItemBox = styled(SkyBox)(({ theme }) => ({
    display: "flex", 
    alignItems: "center", 
    gap: theme.spacing(1), 
    padding: theme.spacing(1), 
    backgroundColor: "rgba(59,130,246,0.05)", 
    borderRadius: theme.shape.borderRadius 
}));

export const CommentBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  borderRadius: "8px",
  marginTop: theme.spacing(2),
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
}));

export const CommentItem = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  "& .avatar": {
    width: 32,
    height: 32,
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
}));

// Migrated Search/Filter Container items

// Migrated FilterButton

// Migrated AttendanceStats

export const AttendanceStatusButton = styled(StyledActionButton, {
  shouldForwardProp: (prop) => prop !== "status",
})(({ theme, status }) => ({
  minWidth: "120px",
  backgroundColor: status === "present" ? "#10b981" : status === "absent" ? "#ef4444" : status === "waiting" ? "#9ca3af" : theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: status === "present" ? "#059669" : status === "absent" ? "#dc2626" : status === "waiting" ? "#6b7280" : theme.palette.primary.dark,
  },
}));

// Migrated AttendanceRow

export const CheckBoxContainer = styled(SkyBox)(({ theme }) => ({
    display: "flex", 
    alignItems: "center", 
    gap: theme.spacing(1), 
    marginRight: theme.spacing(4)
}));

export const CheckBoxSquare = styled(SkyBox)(() => ({
    width: 16, 
    height: 16, 
    border: "1px solid #ccc", 
    borderRadius: "2px" 
}));



export const StyledAccessTimeIcon = styled(AccessTimeIcon)(() => ({
  fontSize: "1.25rem",
}));

export const LinkInfoLabel = styled(InfoLabel)(() => ({
  marginBottom: 0,
}));

export const UnitTitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const DocumentTitle = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const ContentInfoValue = styled(InfoValue)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const StyledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontSize: "1.25rem",
}));

export const FileNameText = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const StyledChatIcon = styled(ChatBubbleOutlineIcon)(() => ({
  fontSize: "1.25rem",
}));

export const CommentAuthor = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const MemberName = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const StyledSearchIcon = styled(SearchIcon)(({ theme }) => ({
  fontSize: "1.25rem",
  marginRight: theme.spacing(1),
  color: theme.palette.action.active,
}));

// Migrated Search/Filter popover items

// Migrated MemberInfoBox, MemberRoleText, ActionsBox

export const Spacer = styled(SkyBox)(() => ({
  flex: 1,
}));

export const FileSizeText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const StyledSendIconButton = styled(SkyIconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledMicIcon = styled(MicIcon)(() => ({
  fontSize: 20,
  color: '#2364B0',
}));

export const NewStyledMicIcon = styled(StyledMicIcon)(() => ({
  color: '#10b981',
}));

export const AudioFileNameText = styled(SkyTypography)(() => ({
  fontWeight: 500,
  flex: 1,
}));

export const NewAudioFileNameText = styled(AudioFileNameText)(() => ({
  color: '#10b981',
  fontWeight: 600,
}));

export const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
  fontSize: 20,
  cursor: "pointer",
  color: theme.palette.primary.main,
}));

export const NewStyledDownloadIcon = styled(StyledDownloadIcon)(() => ({
  color: '#10b981',
}));

export const StyledPlayArrowIcon = styled(PlayArrowIcon)(() => ({
  fontSize: 16,
  cursor: "pointer",
}));

export const AudioDurationText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const SmallAccessTimeIcon = styled(AccessTimeIcon)(() => ({
  fontSize: 14,
}));

// Migrated Pagination, PageInfoText, StyledSelect, PageSizeBox, NoDataBox

export const TranscriptionHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
}));

export const TranscriptionLabel = styled(InfoLabel)(() => ({
  marginBottom: 0,
}));

export const ExportIconButton = styled(SkyIconButton)(({ theme }) => ({
  padding: "2px",
  color: theme.palette.primary.main,
  "&:hover": {
    backgroundColor: "rgba(59, 130, 246, 0.04)",
  },
  "&.Mui-disabled": {
    color: theme.palette.action.disabled,
  },
}));

export const ExportLoadingSpinner = styled(SkyBox)(({ theme }) => ({
  width: 18,
  height: 18,
  border: "2px solid #ccc",
  borderRadius: "50%",
  borderTopColor: theme.palette.primary.main,
  animation: "spin 1s linear infinite",
  "@keyframes spin": {
    "0%": { transform: "rotate(0deg) " },
    "100%": { transform: "rotate(360deg)" },
  },
}));

export const EmptyFilesBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  border: '1px dashed #ccc',
  borderRadius: '8px',
}));

export const AudioLoadingBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
}));

export const AudioErrorText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.75rem",
  color: theme.palette.error.main,
}));
