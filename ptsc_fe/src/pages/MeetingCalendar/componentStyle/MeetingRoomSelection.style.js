import { styled } from "@mui/material/styles";
import { Chip, Box, Select } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { 
  SkyBox, 
  SkyTypography, 
} from "@styles/SkyStyles";
import { 
  StyledFilterButton,
  PopoverTitle,
  FilterActions,
  SearchFilterGrid,
  PopoverSearchIcon,
  PopoverFilterIcon,
  WhitePopoverSearchIcon,
  WhitePopoverFilterIcon,
  StyledInputAdornment,
  ClearSearchIconButton,
  PremiumTuneIcon,
  InputClearIcon
} from "./MeetingCommon.styles";

export const FilterPopoverContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  width: 480,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
}));

export { 
  StyledFilterButton,
  PopoverTitle,
  FilterActions,
  SearchFilterGrid,
  PopoverSearchIcon,
  PopoverFilterIcon,
  WhitePopoverSearchIcon,
  WhitePopoverFilterIcon,
  StyledInputAdornment,
  ClearSearchIconButton,
  PremiumTuneIcon,
  InputClearIcon
};

export const SearchToolbarBox = styled('div')(() => ({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  position: 'relative',
  zIndex: 100,
  overflow: 'visible',
}));




export const PopoverHeaderTitle = styled(SkyBox)(({ theme }) => ({
  fontWeight: 700,
  fontSize: "1.1rem",
  color: theme.palette.text.primary,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  paddingBottom: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "& svg": {
    color: theme.palette.primary.main,
    fontSize: "1.25rem",
  },
}));

export const PopoverFooterActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: theme.spacing(2),
  marginTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const PopoverFooterRightGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const PopoverOutlinedButton = styled("button")(({ theme }) => ({
  textTransform: "none",
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper,
  border: `1.5px solid ${theme.palette.primary.main}`,
  borderRadius: '8px',
  padding: '8px 18px',
  height: '38px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: "pointer",
  transition: 'all 0.2s ease',
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const PopoverContainedButton = styled("button")(({ theme }) => ({
  textTransform: "none",
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  border: `1.5px solid ${theme.palette.primary.main}`,
  borderRadius: '8px',
  padding: '8px 20px',
  height: '38px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: "pointer",
  transition: 'all 0.2s ease',
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
    borderColor: theme.palette.primary.dark,
  },
}));

export const UnifiedSearchContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  backgroundColor: theme.palette.background.paper,
  height: '40px',
  width: '320px',
  minWidth: '400px',
  maxWidth: '600px',
  overflow: 'visible',
  transition: 'border-color 0.2s',
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
  },
}));

export const PillFilterTrigger = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '0 12px',
  height: '100%',
  cursor: 'pointer',
  borderRight: `1px solid ${theme.palette.divider}`,
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderTopLeftRadius: '6px',
    borderBottomLeftRadius: '6px',
  },
  '& span': {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  '& svg': {
    fontSize: '1rem',
  }
}));

export const SearchInputWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  padding: '0 8px 0 12px',
  height: '100%',
  overflow: 'hidden',
});

export const StyledPillInput = styled('input')(({ theme }) => ({
  border: 'none',
  outline: 'none',
  width: '100%',
  minWidth: 0,
  height: '100%',
  backgroundColor: 'transparent',
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  '&::placeholder': {
    color: theme.palette.text.disabled,
  }
}));

export const PillClearButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
  },
  '& svg': {
    fontSize: '14px',
  },
}));

export const PillTuneButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '12px',
  background: 'transparent',
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  padding: '0 10px',
  height: '100%',
  '&:hover': {
    backgroundColor: "#F8F9FA",
    borderColor:"#0062AD",
  },
  '& svg': {
    fontSize: '1.25rem',
  }
}));

export const BlueSearchButton = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '12px',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& svg': {
    fontSize: '1.25rem',
  },
}));

const Spacer = styled(SkyBox)(() => ({
  flexGrow: 1,
}));

export { Spacer };

export const SelectedSection = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  marginBottom: 0,
  padding: theme.spacing(0.5, 1.5),
  backgroundColor: theme.palette.mode === "dark" ? "rgba(96, 165, 250, 0.1)" : "#f0f7ff",
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#1e40af" : "#bae0ff",
  borderRadius: 4,
  flexWrap: "wrap",
  maxHeight: "120px",
  overflowY: "auto",
  flexGrow: 1,
  minHeight: "40px",
  boxSizing: "border-box"
}));

export const SelectedLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "0.9rem",
  fontWeight: 500,
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc",
  whiteSpace: "nowrap",
}));
export const StickyHeader = styled("div")(({ theme }) => ({
  position: "sticky",
  top: "-20px", // Compensate for default DialogContent top padding
  zIndex: 10,
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff", 
  paddingTop: theme.spacing(2), // Restore padding visual
  paddingBottom: theme.spacing(1),
  marginBottom: theme.spacing(2),
  marginLeft: "-24px", // Compensate for side padding (MUI default is usually 24px)
  marginRight: "-24px",
  paddingLeft: "24px",
  paddingRight: "24px",
}));

export const RoomChip = styled(Chip)(() => ({
  backgroundColor: "#0052cc",
  color: "#fff",
  borderRadius: 16,
  minHeight: 28,
  height: 28,
  maxHeight: 28,
  overflow: "auto",
  alignItems: "center",

  /* Scrollbar */
  "&::-webkit-scrollbar": {
    height: 4,
    width: 4,
    opacity: 0.3, // mờ
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#fff",
    borderRadius: 4,
    opacity: 0.3, // mờ
  },
  "&:hover::-webkit-scrollbar-thumb": {
    opacity: 0.7, // hover thì rõ hơn
  },

  /* Firefox */
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(255,255,255,0.3) transparent",

  "& .MuiChip-label": {
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: "28px",
  },
  "& .MuiChip-deleteIcon": {
    color: "#fff",
    fontSize: "1rem",
  },
  "&:hover": {
    backgroundColor: "#0041a3",
  },
}));



export const RoomCard = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "selected",
})(({ theme, selected }) => ({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  border: selected ? "2px solid" : "1px solid",
  borderColor: selected 
    ? (theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc") 
    : (theme.palette.mode === "dark" ? "#334155" : "#e0e0e0"),
  borderRadius: 12,
  overflow: "hidden",
  cursor: "pointer",
  transition: "all 0.2s",
  position: "relative",
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
  "&:hover": {
    borderColor: theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  ...(selected && {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(96, 165, 250, 0.05)" : "rgba(0, 82, 204, 0.02)",
  }),
}));

export const RoomImageWrapper = styled(SkyBox)(({ theme }) => ({
  position: "relative",
  height: "160px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
  "& img": {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 1,
  },
}));

export const NoImageTypography = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  zIndex: 0,
}));

export const StatusBadge = styled(SkyBox)(() => ({
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 2,
  // All other styles (colors, padding, border-radius) are provided by backend HTML
  "& > div": {
    // Ensure the inner div from backend HTML displays properly
    display: "flex",
  },
}));

export const SelectionIcon = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "selected",
})(({ selected, theme }) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 40,
  height: 40,
  borderRadius: "50%",
  backgroundColor: "transparent",
  border: `4px solid ${theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc"}`,
  display: selected ? "flex" : "none", // Hide when not selected
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  zIndex: 2,
  "& svg": {
    fontSize: "28px",
    fontWeight: "bold",
  },
}));


export const RoomInfo = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  flexGrow: 1,
}));

export const RoomName = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "selected",
})(({ theme, selected }) => ({
  fontWeight: "bold",
  fontSize: "1rem",
  color: selected ? (theme.palette.mode === "dark" ? "#60a5fa" : "#0052cc") : theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  wordBreak: "break-word",
}));

export const InfoItem = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "alignTop",
})(({ theme, alignTop }) => ({
  display: "flex",
  alignItems: alignTop ? "flex-start" : "center",
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
  fontSize: "0.85rem",
  "& svg": {
    fontSize: "1.1rem",
    color: theme.palette.action.active,
  },
}));

export const AmenitiesIcon = styled("div")(({ theme }) => ({
  display: "flex",
  marginTop: theme.spacing(0.25),
}));

export const AmenitiesText = styled("span")(() => ({
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  wordBreak: "break-word",
  flex: 1,
}));


export const LoadingWrapper = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  padding: theme.spacing(5),
}));

/* Timeline Styles */

export const TimelineContainer = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(3),
  borderTop: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  position: "sticky",
  bottom: "-24px", // Đặt lại -24px để che khít phần padding dưới của DialogContent
  zIndex: 10,
  marginLeft: "-24px", // mở rộng ra sát viền trái
  marginRight: "-24px", // mở rộng ra sát viền phải
  marginBottom: "-24px", // kéo giãn xuống dưới cùng qua lớp padding
  paddingTop: theme.spacing(1.5),
  paddingBottom: "36px", // 24px offset + 12px padding thực tế
  paddingLeft: "24px",
  paddingRight: "24px",
  boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
  // Vẽ viền dưới giả lập nằm ngay trên vùng bị che khuất (24px) để luôn hiển thị và che các item cuộn phía dưới
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "24px",
    height: "1px",
    backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0',
  }
}));


export const TimelineContainerHeader = styled(SkyBox)(({ theme, styleMb }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fff",
  marginLeft: "-24px",
  marginRight: "-24px",
  padding: theme.spacing(1.5, 3),
  marginTop: "unset",
  marginBottom: styleMb ? theme.spacing(styleMb) : 0,
  position: "relative",
  zIndex: 100,
  overflow: "visible",
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#334155' : '#e2e8f0'}`,
}));

export const TimelineContainerV2 = styled(TimelineContainer)(({theme}) => ({
  marginTop: theme.spacing(-3.125),
  position: "relative",
  zIndex: 1,
  marginBottom: theme.spacing(3.125)
}));


export const TimelineHeaderWrapper = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: theme.spacing(2.5),
  marginBottom: theme.spacing(2),
  width: '100%',
  flexWrap: 'wrap',
}));

export const TimelineTitle = styled(SkyTypography)(() => ({
  fontWeight: 'bold',
  color: '#0062AD',
  textTransform: 'uppercase',
  fontSize: '0.9rem',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap',
}));

export const DateNavigator = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1'}`,
  borderRadius: 8,
  fontWeight: 500,
  padding: '0 6px',
  height: '32px',
  boxSizing: 'border-box',
  backgroundColor: theme.palette.background.paper,
  '& svg': {
    cursor: 'pointer',
    color: theme.palette.text.primary,
  }
}));

export const TimelineLegend = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2.5),
  alignItems: 'center',
  marginLeft: 'auto',
}));

export const LegendItem = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: '0.85rem',
  color: theme.palette.text.primary,
}));

export const LegendDot = styled('span', {
  shouldForwardProp: (prop) => prop !== 'dotColor',
})(({ dotColor }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: dotColor,
  border: dotColor === '#ffffff' ? '1px solid #d9d9d9' : 'none',
  display: 'inline-block',
}));

export const TimelineTrack = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  height: 36,
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#f0f2f5',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#475569' : '#d9d9d9'}`,
  borderRadius: 12,
  marginTop: theme.spacing(2),
  overflow: 'hidden',
}));

export const TimelineBlock = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'blockColor' && prop !== 'blockWidth' && prop !== 'blockLeft',
})(({ blockColor, blockWidth, blockLeft }) => ({
  position: 'absolute',
  height: '100%',
  backgroundColor: blockColor,
  width: `${blockWidth}%`,
  left: `${blockLeft}%`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  padding: '0 4px',
}));

export const TimelineLabels = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  height: 20,
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(1),
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  '& span': {
    position: 'absolute',
    transform: 'translateX(-50%)',
  }
}));

export const TimelineLoadingWrapper = styled(LoadingWrapper)(({ theme }) => ({
  padding: theme.spacing(2.5),
}));

export const StyledChevronLeftIcon = styled(ChevronLeftIcon, {
  shouldForwardProp: (prop) => prop !== 'disabled',
})(({ disabled }) => ({
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontSize: '1.2rem !important',
}));

export const StyledChevronRightIcon = styled(ChevronRightIcon)({
  cursor: 'pointer',
  fontSize: '1.2rem !important',
});

export const StyledDateBox = styled(Box)({
  width: '125px', // giảm chiều rộng phù hợp với cỡ chữ nhỏ hơn
  margin: '0 4px',
  padding: '0px',
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  cursor: 'pointer',
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent !important', // Đảm bảo nền trong suốt để không che mất viền của DateNavigator
    height: '100%',
    cursor: 'pointer',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  // Style trực tiếp ô input để không bị cắt chữ và có chiều cao gọn gàng
  '& .MuiOutlinedInput-input': {
    padding: '2px 0px !important',
    fontSize: '0.85rem !important',
    textAlign: 'center',
    height: '20px',
    cursor: 'pointer !important',
    pointerEvents: 'none',
  },
  '& .MuiInputAdornment-root': {
    marginLeft: '0px !important',
    marginRight: '-4px !important',
  },
  '& .MuiIconButton-root': {
    padding: '4px !important',
  },
  '& svg': {
    fontSize: '1.1rem !important',
  }
});

/* Timeline Continuous Track & Label Styled Components (Matching Attached Designs) */

export const IntervalSelectWrapper = styled(Select)(({ theme }) => ({
  height: '32px',
  borderRadius: '8px',
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff',
  fontSize: '0.85rem',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.mode === 'dark' ? '#64748b' : '#94a3b8',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#0062AD',
  },
  '& .MuiSelect-select': {
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    boxSizing: 'border-box',
  },
  '& .interval-label': {
    color: theme.palette.text.secondary,
    fontWeight: 400,
    whiteSpace: 'nowrap',
    marginRight: '6px',
  },
  '& .interval-value': {
    color: theme.palette.text.primary,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
}));

export const TimelineSlotsScrollWrapper = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'interval',
})(({ theme, interval }) => ({
  width: '100%',
  overflowX: interval === 60 ? 'hidden' : 'auto',
  overflowY: 'hidden',
  marginTop: theme.spacing(1.5),
  paddingBottom: '8px',
  '&::-webkit-scrollbar': {
    height: '6px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  }
}));

export const TimelineInnerWidthContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'interval' && prop !== 'totalSlots',
})(({ interval, totalSlots }) => ({
  width: interval === 60 
    ? '100%' 
    : `${Math.max(100, (totalSlots / 24) * 100)}%`,
  minWidth: interval === 60 
    ? '100%' 
    : `${Math.max(100, (totalSlots / 24) * 100)}%`,
}));

export const ContinuousTrackBar = styled(SkyBox)(({ theme }) => ({
  position: 'relative',
  height: '38px',
  backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#eef2f6',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#475569' : '#cbd5e1'}`,
  borderRadius: '12px',
  overflow: 'hidden',
  userSelect: 'none',
}));

export const TrackBlock = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'blockColor' && prop !== 'blockWidth' && prop !== 'blockLeft' && prop !== 'isSelection',
})(({ blockColor, blockWidth, blockLeft, isSelection }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: `${blockLeft}%`,
  width: `${blockWidth}%`,
  backgroundColor: isSelection ? 'rgba(35, 100, 176, 0.3)' : blockColor,
  border: isSelection ? '1px solid #2364B0' : 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontSize: '0.72rem',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  padding: '0 4px',
  boxSizing: 'border-box',
  zIndex: isSelection ? 6 : 2,
  pointerEvents: isSelection ? 'none' : 'auto',
  transition: 'all 0.2s ease',
}));

export const SlotOverlayGrid = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'totalSlots',
})(({ totalSlots }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'grid',
  gridTemplateColumns: `repeat(${totalSlots}, 1fr)`,
  zIndex: 5,
}));

export const SlotOverlayCell = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'isBusy' && prop !== 'isSelected',
})(({ theme, isBusy, isSelected }) => ({
  borderRight: isSelected 
    ? 'none' 
    : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  height: '100%',
  cursor: isBusy ? 'not-allowed' : 'pointer',
  transition: 'background-color 0.15s ease',
  backgroundColor: 'transparent',
  boxSizing: 'border-box',
  '&:hover': {
    backgroundColor: (!isBusy && !isSelected) ? 'rgba(35, 100, 176, 0.15)' : undefined,
  },
  '&:last-child': {
    borderRight: 'none',
  }
}));

export const TimelineScaleRow = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'totalSlots',
})(({ theme, totalSlots }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${totalSlots}, 1fr)`,
  marginTop: '6px',
  color: theme.palette.text.secondary,
  fontSize: '0.68rem',
  fontWeight: 500,
  userSelect: 'none',
}));

export const ScaleLabelItem = styled('span')({
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'visible',
  display: 'inline-block',
});

export const SelectionSummaryText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '0.85rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
  marginRight: theme.spacing(2),
}));

/* Backward compatibility exports */
export const TimelineSlotsContainer = TimelineInnerWidthContainer;
export const TimelineSlotItem = SlotOverlayCell;
export const SlotTimeText = ScaleLabelItem;



