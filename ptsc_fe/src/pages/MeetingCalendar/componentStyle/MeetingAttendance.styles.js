import { styled } from "@mui/material/styles";
import DescriptionIcon from "@mui/icons-material/Description";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { 
  SkyBox, 
  SkyTypography, 
  SkyPaper, 
  SkyButton, 
  SkyTextField, 
  SkyFormControlLabel, 
  SkyCheckbox,
  // SkyIconButton
} from "@styles/SkyStyles";
import { InfoValue, InfoLabel } from "./MeetingManagement.styles";
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
  AttendanceStatsBanner,
  AttendanceStatsBannerLabel,
  AttendanceStatsBannerRight,
  AttendanceParticipantGrid,
  AttendanceParticipantCard,
  ParticipantCardInfo,
  ParticipantCardName,
  ParticipantCardSubInfo,
  AttendanceStatusBadge,
  AttendanceTableWrapper,
  MeetingHeaderWrapper,
  IconTextWrapper,
  StatBannerItem,
  PopoverPaperProps,
  StyledInputAdornmentEnd,
  StatSep,
} from "./MeetingCommon.styles";

export const AttendanceContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  padding: 0,
}));

export const InfoSection = styled(SkyPaper)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  borderRadius: "8px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  border: `1px solid ${theme.palette.mode === "dark" ? "#d1d5db" : "#e2e8f0"}`,
  boxShadow: 'none',
}));

export const AttendanceActionBar = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  border: `1px solid ${theme.palette.mode === "dark" ? "#d1d5db" : "#e2e8f0"}`,
  borderRadius: '8px',
  marginBottom: theme.spacing(1),
}));

export const AttendanceSuccessBox = styled(SkyBox)(() => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
}));

export const AttendanceSuccessText = styled(SkyTypography)(() => ({
    color: '#10b981',
    fontWeight: 600,
    fontSize: '0.95rem',
}));

export const AttendanceSuccessTime = styled(SkyTypography)(() => ({
    color: '#64748b',
    fontSize: '0.8rem',
}));

export const AttendanceActionButton = styled(StyledActionButton, {
  shouldForwardProp: (prop) => prop !== "isGray",
})(({ theme, isGray }) => ({
  backgroundColor: isGray ? "#494b4eff" : theme.palette.primary.main,
  color: '#fff',
  '&:hover': {
    backgroundColor: isGray ? "#494b4eff" : theme.palette.primary.dark,
  },
  '&.Mui-disabled': {
    backgroundColor: isGray ? "#494b4eff" : "rgba(0, 0, 0, 0.12)",
    color: isGray ? "#fff" : "rgba(0, 0, 0, 0.26)",
    cursor: 'not-allowed',
    pointerEvents: 'auto'
  }
}));

export const ParticipantAttendanceButton = styled(StyledActionButton, {
  shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => ({
  minWidth: "140px",
  backgroundColor: variantType === 'present' ? "#10b981" : "#8c8c8c",
  color: "#fff",
  "&:hover": { 
    backgroundColor: variantType === 'present' ? "#059669" : "#707070" 
  },
}));

export const StatusIndicator = styled(SkyBox)(() => ({
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '6px 16px',
    borderRadius: '40px',
    fontSize: '0.875rem',
    fontWeight: 500,
}));

// Migrated common components are exported from the header

// Migrated AttendanceHeaderBox, AttendanceTitle, AttendanceStats, AttendanceRow

export const StatusButton = styled(SkyButton, {
  shouldForwardProp: (prop) => prop !== "variantType",
})(({ variantType }) => {
  const styles = {
    textTransform: "none",
    minWidth: "140px",
    borderRadius: "6px",
    fontWeight: 500,
    fontSize: '0.875rem',
  };

  if (variantType === 'present') {
    return {
      ...styles,
      backgroundColor: "#10b981",
      color: "#fff",
      "&:hover": { backgroundColor: "#059669" },
    };
  }
  if (variantType === 'waiting') {
    return {
      ...styles,
      backgroundColor: "#8c8c8c",
      color: "#fff",
      "&:hover": { backgroundColor: "#707070" },
    };
  }
  if (variantType === 'absent') {
      return {
          ...styles,
          backgroundColor: "#3b82f6",
          color: "#fff",
          "&:hover": { backgroundColor: "#2563eb" },
      };
  }
  
  return styles;
});

export const NoAttendanceFormLabel = styled(SkyFormControlLabel)(({ theme }) => ({
    marginRight: theme.spacing(4),
    '& .MuiTypography-root': {
        fontSize: '0.875rem',
        color: theme.palette.text.secondary,
    }
}));

export const CustomCheckbox = styled(SkyCheckbox)(() => ({
    color: '#3b82f6',
    '&.Mui-checked': {
        color: '#3b82f6',
    },
}));

export const InfoValueBold = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const LinkInfoLabel = styled(InfoLabel)(() => ({
  marginBottom: 0,
}));

// export const OnlineLinkText = styled(Typography)(({ theme }) => ({
//   cursor: 'pointer',
//   textDecoration: 'underline',
//   color: theme.palette.primary.main,
// }));

export const TransparentAccordionHeader = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  backgroundColor: 'transparent',
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
}));

export const EmptyDocBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: "rgba(0,0,0,0.02)",
  borderRadius: theme.shape.borderRadius,
  textAlign: "center",
}));

export const EmptyDocText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const ContentInfoValue = styled(InfoValue)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export const FileItemBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(1),
}));

export const StyledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const FileNameText = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const FileSizeText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const DiscussionBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  cursor: "pointer",
}));

export const StyledChatIcon = styled(ChatBubbleOutlineIcon)(({ theme }) => ({
  fontSize: "1.25rem",
  color: theme.palette.action.active,
}));

export const StyledExpandIcon = styled(ExpandLessIcon)(() => ({
  fontSize: "1.25rem",
}));

export const DiscussionTitle = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 700,
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

export const AvatarDiv = styled('div', {
  shouldForwardProp: (prop) => prop !== 'bgcolor',
})(({ bgcolor }) => ({
  width: 32,
  height: 32,
  borderRadius: "50%",
  backgroundColor: bgcolor,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.85rem",
  fontWeight: 600,
}));

export const TimeText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginLeft: theme.spacing(1),
}));

export const CommentTextField = styled(SkyTextField)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

export const SendButton = styled(SkyBox)(() => ({
  textTransform: "none",
  borderRadius: "4px",
}));

export const DialogTitleBox = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  color: '#f59e0b',
  fontWeight: 700,
}));

export const StyledWarningIcon = styled(WarningAmberIcon)(() => ({
  fontSize: '2rem',
}));

export const ConfirmText = styled(SkyTypography)(({ theme }) => ({
  textAlign: 'center',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

export const AttendanceListTitle = styled(SkyTypography)(({ theme }) => ({
  display: 'block',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  fontWeight: 600,
  color: theme.palette.text.secondary,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
}));

export const MemberNameText = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const StyledCheckIcon = styled(CheckIcon)(() => ({
  fontSize: '1rem',
}));

export const StatItem = styled('div', {
  shouldForwardProp: (prop) => prop !== 'color',
})(({ color }) => ({
  color: color,
}));

// Migrated SearchContainer, StyledSearchField, StyledSearchButton, StyledFilterButton, etc.

// Migrated Header groups and Search Filter items

export const UnitTitle = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const DocTitle = styled(SkyTypography)(() => ({
  fontWeight: 600,
}));

export const FileDetailsBox = styled(SkyBox)(() => ({
  flex: 1,
}));

export const CommentAuthorName = styled(SkyTypography)(() => ({
  fontWeight: 700,
}));

export const AvatarN = styled(AvatarDiv)(() => ({
  backgroundColor: '#f97316',
}));

export const AvatarT = styled(AvatarDiv)(() => ({
  backgroundColor: '#f59e0b',
}));

// export const StyledInputAdornment = styled(InputAdornment)(({ theme }) => ({
//   height: '100%',
//   maxHeight: 'none',
//   margin: 0,
//   marginLeft: theme.spacing(1),
// }));

// Migrated Pagination and Footer items
