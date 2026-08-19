import { styled } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
// import FilterListIcon from "@mui/icons-material/FilterList";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ClearIcon from "@mui/icons-material/Clear";
import TuneIcon from "@builder-table/components/TuneIcon";
import LockIcon from "@mui/icons-material/Lock";
import { SkyBox, SkyTypography, SkyTitle, SkyTextField, SkyButton, SkyIconButton, SkySelect } from "@styles/SkyStyles";
import { InputAdornment } from "@mui/material";

// ==========================================
// Common Containers
// ==========================================

export const SectionTitle = styled(SkyTitle)(({ theme }) => ({
  fontSize: "1.1rem",
  fontWeight: 700,
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#0062ac",
  marginBottom: theme.spacing(1),
}));

export const AttendanceHeaderBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(1),
}));

export const AttendanceTitle = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#0062ac",
  fontWeight: 700,
}));

export const LinkBox = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const OnlineLinkText = styled(SkyTypography)(({ theme }) => ({
  cursor: "pointer",
  textDecoration: "underline",
  color: theme.palette.primary.main,
}));

export const DocumentAccordionItem = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  borderRadius: "8px",
  overflow: "hidden",
  marginBottom: theme.spacing(2),
}));

export const DocumentAccordionHeader = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isNested"
})(({ theme, isNested }) => ({
  padding: theme.spacing(1.5, 2),
  backgroundColor: isNested ? "transparent" : (theme.palette.mode === "dark" ? "#334155" : "#f8fafc"),
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
}));

// ==========================================
// Search & Filter
// ==========================================

export const SearchContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: 0,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
  width: "fit-content",
  marginBottom: theme.spacing(2),
}));

export const StyledFilterButton = styled(SkyButton)(({ theme }) => ({
  height: 40,
  borderRadius: 0,
  textTransform: "none",
  fontWeight: 600,
  padding: "0 16px",
  backgroundColor: "transparent",
  color: theme.palette.text.primary,
  borderRight: `1px solid ${theme.palette.divider}`,
  minWidth: "fit-content",
  fontSize: "0.9rem",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .MuiButton-startIcon": {
    marginRight: 8,
    color: "#000",
    "& svg": {
      fontSize: "1.25rem",
    }
  },
}));

export const StyledSearchField = styled(SkyTextField)(({ theme }) => ({
  width: 400,
  marginTop: 0,
  marginBottom: 0,
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    height: 40,
    backgroundColor: "transparent",
    paddingRight: 0,
    "& fieldset": {
      border: "none",
    },
  },
  "& .MuiInputBase-input": {
    padding: "8px 12px",
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
    "&::placeholder": {
      color: "#94a3b8",
      opacity: 1,
    }
  },
}));

export const StyledSearchButton = styled(SkyButton)(({ theme }) => ({
  height: 40,
  minWidth: 48,
  padding: 0,
  borderRadius: 0, // Will be rounded by container overflow:hidden, but we can be explicit
  backgroundColor: theme.palette.primary.main,
  color: "#fff",
  border: "none",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
  "& svg": {
    fontSize: "1.5rem",
  }
}));

export const FilterPopoverContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export const PopoverTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

export const FilterActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
}));

export const SearchFilterGrid = styled(SkyBox)(() => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px",
}));

// ==========================================
// Icons
// ==========================================

export const PopoverSearchIcon = styled(SearchIcon)(() => ({
  fontSize: "1.25rem",
}));

export const PopoverFilterIcon = styled(FilterAltIcon)(() => ({
  fontSize: "1.25rem",
  color: "#000",
}));

export const WhitePopoverSearchIcon = styled(PopoverSearchIcon)(() => ({
  color: "#fff",
}));

export const WhitePopoverFilterIcon = styled(PopoverFilterIcon)(() => ({
  color: "#fff",
}));

export const StyledAddIcon = styled(AddIcon)(() => ({
  fontSize: "1.25rem",
}));

export const StyledCloseIcon = styled(CloseIcon)(() => ({
  fontSize: "1.25rem",
}));

export const PremiumTuneIcon = styled(TuneIcon)(({ theme }) => ({
    fontSize: 28,
    color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#637381',
}));

export const InputClearIcon = styled(ClearIcon)(() => ({
    fontSize: "1.1rem",
}));

// ==========================================
// Attendance UI Components
// ==========================================

export const AttendanceInfoWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

export const AttendanceLockInfo = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  color: theme.palette.text.secondary,
  fontSize: "0.875rem",
}));

export const AttendanceSeparator = styled(SkyBox)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  color: "#94a3b8",
}));

export const AttendanceLockIcon = styled(LockIcon)(() => ({
  fontSize: 16,
  marginRight: 8,
  color: "#666",
}));

// ==========================================
// Data & Status
// ==========================================

export const AttendanceStats = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(3),
  marginBottom: theme.spacing(2),
  fontSize: "0.85rem",
  color: theme.palette.text.secondary,
  "& span": {
    fontWeight: 700,
    color: theme.palette.mode === "dark" ? theme.palette.text.primary : theme.palette.text.primary,
  },
}));

export const AttendanceRow = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#f1f5f9"}`,
}));

export const MemberInfoBox = styled(SkyBox)(() => ({
  flex: 1,
}));

export const MemberRoleText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const ActionsBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const NoDataBox = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isGrid"
})(({ theme, isGrid }) => ({
  padding: theme.spacing(3),
  textAlign: "center",
  ...(isGrid && {
    gridColumn: "1 / -1",
  })
}));

// ==========================================
// Colored Items
// ==========================================

export const StatItemBlue = styled("div")(() => ({
  color: "#3b82f6",
}));

export const StatItemGreen = styled("div")(() => ({
  color: "#10b981",
}));

export const StatItemRed = styled("div")(() => ({
  color: "#ef4444",
}));

export const StatItemGrey = styled("div")(() => ({
  color: "#64748b",
}));

// ==========================================
// Pagination
// ==========================================

export const PaginationWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-end",
  width: "100%",
  flexShrink: 0,
  marginTop: theme.spacing(2),
  padding: theme.spacing(0, 0, 1, 0),
}));

export const PaginationContainerStyled = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: theme.spacing(0, 0),
  flexShrink: 0,
  minHeight: "56px",
}));

export const PaginationActionsBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const StyleDropDown = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  fontSize: "0.875rem",
  color: "#64748b",
}));

export const StyleNavButton = styled(SkyButton)(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  minWidth: "60px",
  height: "32px",
  fontSize: "0.875rem",
  borderRadius: "6px",
  "&:disabled": {
    color: theme.palette.text.disabled,
    borderColor: theme.palette.divider,
  },
}));

export const StyleActionPage = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

export const StylePageButton = styled(SkyButton, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  minWidth: "32px",
  width: "32px",
  height: "32px",
  padding: 0,
  fontSize: "0.875rem",
  borderRadius: "6px",
  backgroundColor: active ? theme.palette.primary.main : "transparent",
  color: active ? "#fff" : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

export const StylePageDots = styled(SkyTypography)(() => ({
  padding: "0 4px",
  color: "#64748b",
}));

export const PageInfoText = styled(SkyTypography)(() => ({
  fontSize: "0.875rem",
  color: "#64748b",
}));

export const StyledSelect = styled(SkySelect)(() => ({
  height: "32px",
  fontSize: "0.875rem",
}));

export const PageSizeBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

// ==========================================
// Table/Grid Misc
// ==========================================

export const StyledInputAdornment = styled(InputAdornment)(({ theme }) => ({
  height: "100%",
  maxHeight: "none",
  margin: 0,
  marginLeft: theme.spacing(1),
}));

export const StyledInputAdornmentEnd = styled(StyledInputAdornment)({});
StyledInputAdornmentEnd.defaultProps = {
  position: 'end',
};

export const StatSep = styled('span', {
  shouldForwardProp: (prop) => prop !== '$color'
})(({ $color }) => ({
  backgroundColor: $color,
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  marginRight: '8px',
  display: 'inline-block',
}));

export const PopoverPaperProps = {
  sx: { 
    mt: 1, 
    borderRadius: '8px', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
  }
};

export const MeetingHeaderWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(2),
}));

export const IconTextWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

export const StatBannerItem = styled("span")(() => ({
  display: "flex",
  alignItems: "center",
}));

export const SearchOptionIconButton = styled(SkyIconButton)(({ theme }) => ({
  borderRadius: "4px",
  height: 32,
  width: 32,
  marginRight: theme.spacing(1),
  backgroundColor: "transparent",
  color: "#64748b",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "& svg": {
    fontSize: "1.25rem",
  }
}));

export const ClearSearchIconButton = styled(SkyIconButton)(({ theme }) => ({
  marginRight: theme.spacing(0.5),
}));

// ==========================================
// Attendance List - New Design Components
// ==========================================

export const AttendanceTableWrapper = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e5e7eb"}`,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f5f7fa",
  marginBottom: theme.spacing(2),
}));

export const AttendanceStatsBanner = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f5f7fa",
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e5e7eb"}`,
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

export const AttendanceStatsBannerLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: theme.palette.text.secondary,
}));

export const AttendanceStatsBannerRight = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2.5),
  fontSize: "0.82rem",
  color: theme.palette.text.secondary,
  flexWrap: "wrap",
  "& .stat-val": {
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  "& .stat-sep": {
    width: 3,
    height: 14,
    borderRadius: 2,
    display: "inline-block",
    marginRight: 6,
    verticalAlign: "middle",
  },
}));

export const AttendanceParticipantGrid = styled(SkyBox)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#f5f7fa",
  [theme.breakpoints.down("md")]: {
    gridTemplateColumns: "1fr",
  },
}));

export const AttendanceParticipantCard = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
  borderRadius: theme.shape.borderRadius,
  gap: theme.spacing(1),
}));

export const ParticipantCardInfo = styled(SkyBox)(() => ({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
}));

export const ParticipantCardName = styled(SkyTypography)(() => ({
  fontWeight: 700,
  fontSize: "0.9rem",
  lineHeight: 1.3,
}));

export const ParticipantCardSubInfo = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.8rem",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
  lineHeight: 1.4,
}));

export const AttendanceStatusBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "$statusKey",
})(({ theme, $statusKey }) => {
  const getColors = () => {
    switch ($statusKey) {
      case "CHECKED":
      case "present":
        return {
          color: theme.palette.mode === "dark" ? "#4ade80" : "#16a34a",
          backgroundColor: "transparent",
          border: "none",
          padding: 0,
        };
      case "NOT_CHECKED":
      case "absent":
        return {
          color: "#fff",
          backgroundColor: "#ef4444",
          border: "none",
          borderRadius: "4px",
          padding: "4px 12px",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          // "&::before": {
          //   content: '"✕"',
          //   fontSize: "0.8rem",
          // }
        };
      case "NO_REQUIRED":
        return {
          color: theme.palette.mode === "dark" ? "#60a5fa" : "#2563eb",
          backgroundColor: theme.palette.mode === "dark" ? "rgba(96,165,250,0.12)" : "#eff6ff",
          border: `1px solid ${theme.palette.mode === "dark" ? "#3b82f6" : "#bfdbfe"}`,
          borderRadius: "20px",
          padding: "2px 10px",
        };
      default:
        return {
          color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b",
          backgroundColor: theme.palette.mode === "dark" ? "rgba(148,163,184,0.1)" : "#f8fafc",
          border: `1px solid ${theme.palette.mode === "dark" ? "#475569" : "#d1d5db"}`,
          borderRadius: "20px",
          padding: "2px 10px",
        };
    }
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.78rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
    marginTop: 2,
    ...getColors(),
  };
});
