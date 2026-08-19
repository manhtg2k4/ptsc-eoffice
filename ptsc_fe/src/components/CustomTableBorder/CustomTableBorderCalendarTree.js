import React, { useEffect, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import ViewJob from "@pages/WorkManagement/components/ViewJob";
import ViewJobToDocument from "@pages/WorkManagement/components/ViewJobToDocument";
import ViewJobToMeeting from "@pages/WorkManagement/components/ViewJobToMeeting";
import {
  StyledBoxBoder,
  StyledBoxBoderBox,
  StyledBoxTableBoder,
  StyledCheckboxTable,
  StyledIconButton,
  StyleBoxCH,
  StyleBoxDropDown,
  StyleTyprographyDropDown,
  StyleIconDropDown,
  StyleBoxDrop,
  StyleFomControl,
  StyleBoxDrown,
  StyleBoxButton,
  StyleButtonH,
  StyleButtonAD,
} from "@styles/customTableBorder.style";
import {
  Box,
  Button,
  MenuItem,
  Popover,
  Tooltip,
  Typography,
  FormControlLabel,
  IconButton,
  Select,
  InputLabel,
  Checkbox,
  ClickAwayListener,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import configTable from "./config";
import { addDataFieldConfig } from "@redux/slices/FormDesign/formDesignSlice";
import { useDispatch } from "react-redux";
import { API_DYNAMIC } from "@EnvironmentFile/constants/urlConfig";
import AddIcon from "@mui/icons-material/Add";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import {
  Search as SearchIcon,
  GetApp as GetAppIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import TuneIcon from "@builder-table/components/TuneIcon";
import { clearWidthSpace } from "@utils/Common/Common";
import {
  ToolbarContent,
  FilterBox,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  ActionsContainer,
  ActionsBox,
  ExportButton,
  PopoverContainer,
  StyledToolbarkanba,
} from "@styles/CustomTable.styles";
import DebounceTextField from "@components/DynamicForm/DebouncedTextField";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
import { globalComponentRegistry } from "../../builder-table/components/componentRegistry";
import { upDateColumnTable } from "@redux/slices/CustomTable/CustomTableSlice";
// import CustomButton from "@components/CustomButton";
import { StyledPopoverActionButton } from "@styles/CustomTableTree.styles";

// Options will be created dynamically inside the component to avoid circular dependency TDZ

// SVG Icons for Calendar Events
const FlagIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={(size * 23) / 24}
    viewBox="0 0 24 23"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      opacity="0.5"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.5 1.75C6.5 1.55109 6.42098 1.36032 6.28033 1.21967C6.13968 1.07902 5.94891 1 5.75 1C5.55109 1 5.36032 1.07902 5.21967 1.21967C5.07902 1.36032 5 1.55109 5 1.75V21.75C5 21.9489 5.07902 22.1397 5.21967 22.2803C5.36032 22.421 5.55109 22.5 5.75 22.5C5.94891 22.5 6.13968 22.421 6.28033 22.2803C6.42098 22.1397 6.5 21.9489 6.5 21.75V1.75Z"
      fill="#4A5565"
    />
    <g opacity="0.5">
      <path
        d="M13.349 3.78999L13.145 3.70799C11.5819 3.08425 9.8715 2.92724 8.221 3.25599L6.5 3.59999V13.6L8.22 13.256C9.87082 12.927 11.5816 13.0841 13.145 13.708C14.8386 14.385 16.7025 14.5113 18.472 14.069L18.686 14.016C18.9898 13.9402 19.2596 13.7649 19.4524 13.5181C19.6452 13.2713 19.75 12.9672 19.75 12.654V5.28699C19.7499 5.10476 19.7084 4.92493 19.6284 4.76116C19.5485 4.59739 19.4324 4.45396 19.2887 4.34178C19.1451 4.22959 18.9779 4.15158 18.7996 4.11367C18.6214 4.07577 18.4368 4.07895 18.26 4.12299C16.6286 4.53056 14.9102 4.41469 13.349 3.78999Z"
        fill="white"
      />
      <path
        d="M8.26953 3.50146C9.8724 3.1822 11.5338 3.33432 13.0518 3.93994L13.2559 4.02197C14.8659 4.66619 16.6381 4.78591 18.3203 4.36572C18.4603 4.33086 18.6069 4.3279 18.748 4.35791C18.889 4.38794 19.0212 4.4499 19.1348 4.53857C19.2484 4.62731 19.3401 4.74109 19.4033 4.87061C19.4665 5.00012 19.4999 5.14251 19.5 5.28662V12.6538C19.5 12.911 19.4141 13.161 19.2559 13.3638C19.0974 13.5666 18.8747 13.7106 18.625 13.7729L18.4121 13.8267H18.4111C16.6929 14.2561 14.8829 14.1334 13.2383 13.4761H13.2373C11.6291 12.8343 9.86908 12.6728 8.1709 13.0112L6.75 13.2944V3.8042L8.26953 3.50146Z"
        stroke="black"
        strokeOpacity="0.3"
        strokeWidth="0.5"
      />
    </g>
  </svg>
);

const CheckCircle = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Clock = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertCircle = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const XCircle = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const Edit3 = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const VN_WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

const iconOptions = [
  { name: "Add", icon: <AddOutlinedIcon />, displayName: "Thêm mới" },
  { name: "Edit", icon: <EditOutlinedIcon />, displayName: "Cập nhật" },
  { name: "Delete", icon: <DeleteOutlinedIcon />, displayName: "Xóa" },
  { name: "Search", icon: <SearchOutlinedIcon />, displayName: "Tìm kiếm" },
  { name: "Save", icon: <SaveOutlinedIcon />, displayName: "Lưu" },
  {
    name: "Download",
    icon: <DownloadOutlinedIcon />,
    displayName: "Tải xuống",
  },
  { name: "Settings", icon: <SettingsOutlinedIcon />, displayName: "Cài đặt" },
  {
    name: "Visibility",
    icon: <VisibilityOutlinedIcon />,
    displayName: "Xem chi tiết",
  },
  {
    name: "Reason",
    icon: <RateReviewOutlinedIcon />,
    displayName: "Thu hồi",
  },
  { name: "Cancel", icon: <HighlightOffIcon />, displayName: "Hủy lịch" },
];

const StyledIconButtonBorder = styled(IconButton)(({ theme, isSelected }) => ({
  backgroundColor: isSelected ? theme.palette.action.selected : "transparent",
  color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const BuilderIconButton = styled(Button)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "white" : "inherit",
}));

const BuilderTypographyBox = styled(Typography)(() => ({
  fontWeight: 500,
  fontSize: "0.9rem",
  mb: 0.5,
  wordBreak: "break-word",
  color: "#333 !important", // Thêm !important
}));

const StyledBoxContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1.5),
}));

const AddJobButton = styled('button')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '40px',
  padding: '0 16px',
  fontSize: '0.875rem',
  fontWeight: 600,
  borderRadius: '12px',
  border: 'none',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'background-color 0.18s ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '& svg': {
    fontSize: '1.25rem',
  },
}));

const StyledBox = styled(Box)(
  ({
    styleAlignItems,
    styleJustifyContent,
    styleDisplay,
    styleFlexDirection,
    styleGap,
    stylePadding,
  }) => ({
    display: styleDisplay || "flex",
    alignItems: styleAlignItems || "center",
    justifyContent: styleJustifyContent || "flex-start",
    flexDirection: styleFlexDirection || "row",
    gap: styleGap,
    padding: stylePadding,
  })
);

const StyledBoxTable = styled(Box)(() => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
}));

const StyledBoxTableFlag = styled(Box)(() => ({
  flex: 1,
  minWidth: 0,
}));

const StyledBoxFlagIcon = styled(FlagIcon)(() => ({
  flexShrink: 0,
}));

const StyledFlagIconLarge = styled(StyledBoxFlagIcon)(() => ({
  width: "24px",
  height: "24px",
  color: "#666",
  minWidth: "24px",
}));

const StyledFormControlTable = styled(Select)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

// const FilterWrapper = styled(Box)({
//   position: "relative",
// });

const UnifiedSearchContainer = styled('div')(({ theme }) => ({
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

const PillFilterTrigger = styled('div')(({ theme }) => ({
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

const SearchInputWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  padding: '0 8px 0 12px',
  height: '100%',
  overflow: 'hidden',
});

const StyledPillInput = styled('input')(({ theme }) => ({
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

const PillClearButton = styled('button')(({ theme }) => ({
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

const PillTuneButton = styled('button')(({ theme }) => ({
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
    borderColor: "#0062AD",
  },
  '& svg': {
    fontSize: '1.25rem',
  }
}));

const BlueSearchButton = styled('button')(({ theme }) => ({
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
  }
}));

const StyledPopoverPaper = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[3],
  minWidth: 340,
  padding: 0,
  backgroundColor: theme.palette.background.paper,
}));

const StyledSearchWrap = styled('div')({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
});

const StyledFilterRelativeBox = styled('div')({
  position: 'relative',
  height: '100%',
});

const EventText = styled("span")({
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
  whiteSpace: "nowrap",
});

// Thêm vào sau phần styled components (sau StyledFormControlTable)
const TaskViewToggleWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: 11,
  marginLeft: 4,
  alignItems: "center",
  [theme.breakpoints.down("md")]: {
    flexWrap: "wrap",
  },
}));

const TaskViewToggleButton = styled('button')(({ active }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 20px",
  borderRadius: "12px",
  border: active ? "1.5px solid #1976d2" : "1.5px solid #e0e0e0",
  backgroundColor: active ? "#f7f7f7ff" : "#F9FAFB",
  color: active ? "#1976d2" : "#1a1a1a",
  fontWeight: 600,
  fontSize: "15px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  whiteSpace: "nowrap",
  boxShadow: active
    ? "0px 8px 20px rgba(25, 118, 210, 0.25)"
    : "0px 1px 3px rgba(0,0,0,0.08)",
  "&:hover": {
    backgroundColor: active ? "#d2e3fc" : "#ececec",
    borderColor: active ? "#1976d2" : "#bdbdbd",
  },
}));

const CalendarContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  paddingTop: theme.spacing(0),
  paddingBottom: theme.spacing(0),
  width: "100%",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "white", // Đổi từ #1a1a1a sang #2c3e50
  borderRadius: '8px 0 8px 8px',
  position: "relative",
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(91vh - 180px)",
  flex: 1,
  color: theme.palette.mode === "dark" ? "#fff" : "#333",
  overflow: "hidden",
  [theme.breakpoints.down("md")]: {
    padding: theme.spacing(2),
    maxHeight: "calc(100vh - 120px)",
  },
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1.5),
    maxHeight: "calc(100vh - 100px)",
  },
}));
const CalendarHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "20px",
  padding: '12px 20px',
  borderRadius: 8,
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(1),
  backgroundColor: '#F9FAFB',
  width: "100%",
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    marginBottom: theme.spacing(2),
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
  },
}));

// const CalendarButton = styled("button")(({ theme }) => ({
//   background: "none",
//   border: "none",
//   cursor: "pointer",
//   fontSize: "24px",
//   padding: theme.spacing(1),
//   color: theme.palette.mode === "dark" ? "#fff" : "#333",
//   "&:hover": {
//     backgroundColor:
//       theme.palette.mode === "dark"
//         ? "rgba(255, 255, 255, 0.1)"
//         : "rgba(0, 0, 0, 0.05)",
//     borderRadius: "4px",
//   },
//   [theme.breakpoints.down("sm")]: {
//     fontSize: "20px",
//     padding: theme.spacing(0.5),
//   },
// }));

const CalendarTitle = styled("h2")(({ theme }) => ({
  margin: 0,
  fontSize: "26px",
  fontWeight: "700",
  color: theme.palette.mode === "dark" ? "#f8fafc" : "#3b4758",
  [theme.breakpoints.down("sm")]: {
    fontSize: "1.25rem",
  },
}));

const CalendarButtonGroup = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#cbd5e1"}`,
  borderRadius: "10px",
  overflow: "hidden",
  height: "38px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
}));

const CalendarGroupButton = styled("button")(({ theme }) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "18px",
  width: "38px",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f5f9",
  },
}));

const CalendarTodayButton = styled("button")(({ theme }) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  height: "100%",
  padding: "0 16px",
  color: "#2364B0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f1f5f9",
  },
}));

const CalendarGroupDivider = styled("div")(({ theme }) => ({
  width: "1px",
  height: "22px",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
}));

const WeekdayHeader = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f5f5f5", // Đổi từ #2a2a2a sang #2c3e50
  fontWeight: "bold",
  fontSize: "0.875rem",
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.75rem",
  },
}));

const WeekdayCell = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(1),
  color: theme.palette.mode === "dark" ? "#bbb" : "#555",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(0.5),
  },
}));

const CalendarGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  border: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
  flex: 1,
  overflow: "auto",
  overflowX: "hidden",
  scrollbarWidth: "thin",
  scrollbarColor: `${theme.palette.mode === "dark" ? "#666 #1e293b" : "#ccc white"}`,
  msOverflowStyle: "auto",
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "white",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.mode === "dark" ? "#666" : "#ccc",
    borderRadius: "4px",
    "&:hover": {
      backgroundColor: theme.palette.mode === "dark" ? "#888" : "#999",
    },
  },
}));

// const EmptyDayCell = styled(Box)(({ theme }) => ({
//   minHeight: "120px",
//   borderRight: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
//   borderBottom: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
//   backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#fafafa", // Đổi từ #0d0d0d sang #34495e (tối hơn một chút so với #2c3e50)
//   [theme.breakpoints.down("md")]: {
//     minHeight: "100px",
//   },
//   [theme.breakpoints.down("sm")]: {
//     minHeight: "80px",
//   },
// }));
const DayCell = styled(Box, {
  shouldForwardProp: (prop) => !["isNextMonth"].includes(prop),
})(({ theme, isNextMonth }) => ({
  borderRight: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
  minHeight: "100px",
  height: "120px",
  // height: "100px",
  padding: theme.spacing(1),
  backgroundColor: isNextMonth
    ? theme.palette.mode === "dark"
      ? "#1a1a1a"
      : "#f0f0f0"
    : theme.palette.mode === "dark"
      ? "#1e293b"
      : "white",
  opacity: isNextMonth ? 0.5 : 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  cursor: isNextMonth ? "default" : "pointer",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: isNextMonth
      ? theme.palette.mode === "dark"
        ? "#1a1a1a"
        : "#f0f0f0"
      : theme.palette.mode === "dark"
        ? "#1e293b"
        : "#f9f9f9",
  },
  [theme.breakpoints.down("md")]: {
    minHeight: "90px",
    height: "90px",
    padding: theme.spacing(0.75),
  },
  [theme.breakpoints.down("sm")]: {
    minHeight: "75px",
    height: "75px",
    padding: theme.spacing(0.5),
  },
}));

const DayNumber = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isToday',
})(({ theme, isToday }) => ({
  fontWeight: "bold",
  fontSize: "0.95rem",
  color: isToday 
    ? "#fff" 
		: theme.palette.mode === "dark" ? "#fff" : "#333",	
  flexShrink: 0,
  backgroundColor: isToday 
    ? theme.palette.mode === "dark" ? "#4a90e2" : "#1976d2"
    : "transparent",
	borderRadius: isToday ? "50%" : "0",
	display: isToday ? "flex" : null,
	justifyContent: isToday ? "center" : null,
	alignItems: isToday ? "center" : null,
  width: isToday ? "30px" : "auto",
  height: isToday ? "30px" : "auto",
  transition: "all 0.2s",
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.8rem",
    width: isToday ? "28px" : "auto",
    height: isToday ? "28px" : "auto",
  },
}));

const EventsContainer = styled(Box)(() => ({
  flex: 1,
  // overflowY: "auto",
  // overflowX: "hidden",
  paddingRight: "4px",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
}));

const EventItem = styled(Box, {
  shouldForwardProp: (prop) =>
    !["selected", "customBg", "customBorder"].includes(prop),
})(({ theme, selected, customBg, customBorder }) => ({
  backgroundColor: customBg,
  borderLeft: `3px solid ${customBorder}`,
  borderRadius: "3px",
  padding: selected ? "2px 5px" : "3px 6px", // Điều chỉnh padding khi có border để tránh nhảy kích thước
  margin: "3px 0",
  fontSize: "0.7rem",
  color: customBorder || "#333",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  cursor: "pointer",
  transition: "all 0.1s",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  boxShadow: selected ? "0 0 0 1px rgba(25, 118, 210, 0.3)" : "none",
  "&:hover": {
    transform: "translateX(2px)",
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 2px 4px rgba(255,255,255,0.1)"
        : "0 2px 4px rgba(0,0,0,0.1)",
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.65rem",
    padding: "2px 4px",
    margin: "2px 0",
  },
}));
const ShowMoreButton = styled(Box)(({ theme }) => ({
  fontSize: "0.7rem",
  color: theme.palette.mode === "dark" ? "#64b5f6" : "#1976d2",
  padding: "3px 6px",
  margin: "3px 0",
  cursor: "pointer",
  fontWeight: "500",
  textDecoration: "underline",
  "&:hover": {
    color: theme.palette.mode === "dark" ? "#90caf9" : "#1565c0",
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.65rem",
    padding: "2px 4px",
  },
}));

const Legend = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  justifyContent: "flex-start",
  marginTop: theme.spacing(3),
  flexWrap: "wrap",
  borderTop: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#f0f0f0"}`,
  paddingTop: theme.spacing(2),
  flexShrink: 0,
  fontSize: "0.85rem",
  marginBottom: 10,
  minHeight: "fit-content",
  [theme.breakpoints.down("md")]: {
    justifyContent: "flex-start",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2),
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.75rem",
    gap: theme.spacing(1),
  },
}));

const LegendItem = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
}));

const LegendItemBox = styled(Box)(() => ({
  display: "flex",
  gap: 0.75,
  flexShrink: 0,
  marginTop: 0,
}));

const LegendBox = styled(Box, {
  shouldForwardProp: (prop) => !["customBg", "customBorder", "statusLabel"].includes(prop),
})(({ customBorder }) => {
  return {
    width: "14px",
    height: "14px",
    borderRadius: "4px",
    backgroundColor: customBorder || "#9e9e9e",
    flexShrink: 0,
  };
});

const Modal = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "white", // Đổi từ #1a1a1a sang #2c3e50
  color: theme.palette.mode === "dark" ? "#fff" : "#333",
  borderRadius: "8px",
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 8px 32px rgba(0, 0, 0, 0.8)"
      : "0 8px 32px rgba(0, 0, 0, 0.2)",
  zIndex: 1000,
  minWidth: "400px",
  maxWidth: "600px",
  maxHeight: "80vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.down("md")]: {
    minWidth: "90vw",
    maxWidth: "90vw",
    maxHeight: "70vh",
  },
  [theme.breakpoints.down("sm")]: {
    minWidth: "95vw",
    maxWidth: "95vw",
    maxHeight: "80vh",
  },
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  padding: "24px 20px 0px 20px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  [theme.breakpoints.down("sm")]: {
    padding: "20px 16px 12px 16px",
  },
}));

const ModalDateBadge = styled(Box)(() => ({
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  backgroundColor: "#0062AD",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: "18px",
  marginBottom: "4px",
}));

const ModalDayName = styled(Typography)(() => ({
  color: "#0062AD",
  fontWeight: "550",
  fontSize: "20px",
  textAlign: "center",
}));

const ModalCloseButton = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: "8px",
  right: "8px",
  color: theme.palette.mode === "dark" ? "#aaa" : "#666",
  transition: "all 0.2s",
  "&:hover": {
    color: theme.palette.error.main,
    transform: "rotate(90deg)",
    backgroundColor: "transparent",
  },
  "& .MuiSvgIcon-root": {
    fontSize: "28px",
    fontWeight: "bold",
  }
}));

const ModalContent = styled(Box)(({ theme }) => ({
  padding: "20px",
  overflowY: "auto",
  flex: 1,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  [theme.breakpoints.down("sm")]: {
    padding: "16px",
  },
}));

const ModalEventItem = styled(Box, {
  shouldForwardProp: (prop) =>
    !["selected", "customBg", "customBorder"].includes(prop),
})(({ theme, selected, customBg, customBorder }) => ({
  backgroundColor: customBg,
  borderRadius: "8px",
  padding: "12px 16px",
  paddingLeft: "28px",
  marginBottom: "12px",
  cursor: "pointer",
  transition: "all 0.2s",
  display: "flex",
  gap: "12px",
  alignItems: "center",
  color: theme.palette.mode === "dark" ? "#fff" : "#333",
  position: "relative",
  overflow: "hidden",
  border: selected ? `2px solid ${theme.palette.primary.main}` : "none",
  boxShadow: selected ? "0 0 0 1px rgba(25, 118, 210, 0.3)" : "none",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.1)" : "rgba(0,0,0,0.03)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "8px",
    backgroundColor: customBorder || "#0062AD",
    borderRadius: "8px 0 0 8px",
  },
  [theme.breakpoints.down("sm")]: {
    padding: "10px 14px",
    paddingLeft: "24px",
    marginBottom: "10px",
    gap: "10px",
  },
}));
// const ModalFooter = styled(Box)(({ theme }) => ({
//   padding: "12px 20px",
//   borderTop: `1px solid ${theme.palette.mode === "dark" ? "#444" : "#e0e0e0"}`,
//   display: "flex",
//   justifyContent: "flex-end",
//   gap: "8px",
//   [theme.breakpoints.down("sm")]: {
//     padding: "10px 16px",
//   },
// }));

// const ModalButton = styled("button", {
//   shouldForwardProp: (prop) => prop !== "buttonType",
// })(({ theme, buttonType }) => ({
//   padding: "8px 20px",
//   backgroundColor:
//     buttonType === "primary"
//       ? theme.palette.mode === "dark"
//         ? "#4a90e2"
//         : "#1976d2"
//       : theme.palette.mode === "dark"
//         ? "#2a2a2a"
//         : "#f5f5f5",
//   color:
//     buttonType === "primary"
//       ? "white"
//       : theme.palette.mode === "dark"
//         ? "#fff"
//         : "#333",
//   border:
//     buttonType === "primary"
//       ? "none"
//       : `1px solid ${theme.palette.mode === "dark" ? "#444" : "#ddd"}`,
//   borderRadius: "4px",
//   cursor: "pointer",
//   fontSize: "0.9rem",
//   fontWeight: "500",
//   transition: "all 0.2s",
//   "&:hover": {
//     backgroundColor:
//       buttonType === "primary"
//         ? theme.palette.mode === "dark"
//           ? "#5a9ff2"
//           : "#1565c0"
//         : theme.palette.mode === "dark"
//           ? "#3a3a3a"
//           : "#e0e0e0",
//   },
//   [theme.breakpoints.down("sm")]: {
//     padding: "6px 16px",
//     fontSize: "0.85rem",
//   },
// }));

const Backdrop = styled(Box)(() => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  zIndex: 999,
}));

const ComponentSelector = ({ componentKey, onChange }) => {
  const componentRegistryOptions = useMemo(() => {
    return Object.keys(globalComponentRegistry).map((key) => ({
      key,
      ...globalComponentRegistry[key],
    }));
  }, []);

  const handleComponentChange = (e) => {
    const selectedKey = e.target.value;
    const selectedComponent = componentRegistryOptions.find(
      (c) => c.key === selectedKey
    );
    onChange("componentKey", selectedKey);
    if (selectedComponent) {
      onChange("popupName", selectedComponent.title);
    }
  };

  return (
    <>
      <Typography variant="subtitle2" mt={1}>
        Chọn Component hiển thị
      </Typography>
      <Select
        fullWidth
        size="small"
        value={componentKey || ""}
        onChange={handleComponentChange}
      >
        {componentRegistryOptions.map((opt) => (
          <MenuItem key={opt.key} value={opt.key}>
            {opt.title}
          </MenuItem>
        ))}
      </Select>
    </>
  );
};

const sizeOptions = ["xs", "sm", "md", "lg", "xl"];

const ActionConfigItem = React.memo(
  ({ action, onChange, onRemove, selectOptions }) => {
    const handleDeleteApiUrlChange = useCallback(
      (e) => {
        onChange(action.id, "deleteApiUrl", e.target.value);
      },
      [action.id, onChange]
    );

    const handlePopupNameChange = useCallback(
      (e) => {
        onChange(action.id, "popupName", e.target.value);
      },
      [action.id, onChange]
    );

    const getIcon = useCallback(
      (name) => iconOptions.find((opt) => opt.name === name)?.icon,
      []
    );

    const [formOptions, setFormOptions] = useState([]);
    useEffect(() => {
      const fetchData = async () => {
        try {
          const res = await api.get(API_DYNAMIC, {
            params: { limit: 9999 },
          });
          setFormOptions(res.data?.data || []);
        } catch (err) {
          logger.error("Error fetching form data:", err);
        }
      };

      fetchData();
    }, []);

    const handleRemove = useCallback(() => {
      onRemove(action.id);
    }, [onRemove, action.id]);

    const handleDisplayNameChange = useCallback(
      (e) => {
        onChange(action.id, "displayName", e.target.value);
      },
      [onChange, action.id]
    );

    const handleSelectIcon = useCallback(
      (event) => {
        const iconName = event.currentTarget.dataset.iconName;
        onChange(action.id, "icon", iconName);
      },
      [action.id, onChange]
    );

    const handleSelectActionType = useCallback(
      (e) => {
        onChange(action.id, "actionType", e.target.value);
      },
      [onChange, action.id]
    );

    const handleDisplayTypeChange = useCallback(
      (e) => {
        onChange(action.id, "displayType", e.target.value);
      },
      [onChange, action.id]
    );

    const handleComponentSelectorChange = useCallback(
      (key, value) => {
        onChange(action.id, key, value);
      },
      [onChange, action.id]
    );

    const handleSizeChange = useCallback(
      (e) => {
        onChange(action.id, "size", e.target.value);
      },
      [onChange, action.id]
    );

    const handleFnCodeExportChange = useCallback(
      (e) => {
        onChange(action.id, "fnCodeExport", e.target.value);
      },
      [onChange, action.id]
    );

    const handleMultiFormsChange = useCallback(
      (e) => {
        onChange(action.id, "multiForms", e.target.value);
      },
      [onChange, action.id]
    );

    const handleAllowSignDigitalChange = useCallback(
      (e) => {
        onChange(action.id, "allowSignDigital", e.target.checked);
      },
      [onChange, action.id]
    );

    const handleAllowSignInitialChange = useCallback(
      (e) => {
        onChange(action.id, "allowSignInitial", e.target.checked);
      },
      [onChange, action.id]
    );

    return (
      <StyledBoxContainer>
        <StyledBox
          styleAlignItems="center"
          styleJustifyContent="space-between"
          mb={1}
        >
          <Tooltip title={action.config.displayName}>
            <StyledIconButton styleColor={action.config.color}>
              {getIcon(action.config.icon)}
            </StyledIconButton>
          </Tooltip>
          <StyledIconButton
            size="small"
            styleColor="error"
            onClick={handleRemove}
          >
            <DeleteOutlineIcon size="small" /> Xóa
          </StyledIconButton>
        </StyledBox>

        <DebounceTextField
          fullWidth
          size="small"
          label="Tên hiển thị (Tooltip)"
          value={action.config.displayName || ""}
          onChange={handleDisplayNameChange}
        />

        <Typography variant="subtitle2">Chọn Icon</Typography>
        <StyledBoxTable mb={1}>
          {iconOptions.map((opt) => (
            <StyledIconButtonBorder
              key={opt.name}
              data-icon-name={opt.name}
              onClick={handleSelectIcon}
              isSelected={action.config.icon === opt.name}
            >
              {opt.icon}
            </StyledIconButtonBorder>
          ))}
        </StyledBoxTable>

        <Typography variant="subtitle2" mt={1}>
          Loại hành động
        </Typography>
        <Select
          fullWidth
          size="small"
          value={action.config.actionType || ""}
          onChange={handleSelectActionType}
        >
          <MenuItem value="update">Cập nhật</MenuItem>
          <MenuItem value="view">Chỉ xem</MenuItem>
          <MenuItem value="delete">Xóa</MenuItem>
          <MenuItem value="export">Xuất biểu mẫu</MenuItem>
        </Select>

        {action.config.actionType === "delete" && (
          <>
            <Typography variant="subtitle2" mt={1}>
              URL API Xóa
            </Typography>
            <DebounceTextField
              fullWidth
              size="small"
              label="Nhập URL API"
              value={action.config.deleteApiUrl || ""}
              onChange={handleDeleteApiUrlChange}
            />
          </>
        )}
        {action.config.actionType !== "delete" &&
          action.config.actionType !== "export" && (
            <>
              <>
                <Typography variant="subtitle2" mt={1}>
                  Loại hiển thị
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={action.config.displayType || "popup"}
                  onChange={handleDisplayTypeChange}
                >
                  <MenuItem value="popup">Popup</MenuItem>
                  <MenuItem value="swiper">Swiper</MenuItem>
                </Select>
              </>

              {action.config.displayType === "swiper" && (
                <ComponentSelector
                  componentKey={action.config.componentKey}
                  onChange={handleComponentSelectorChange}
                />
              )}

              {action.config.displayType === "popup" && (
                <>
                  <Typography variant="subtitle1" mt={1}>
                    Chọn kích thước
                  </Typography>
                  <Select
                    fullWidth
                    value={action.config?.size}
                    onChange={handleSizeChange}
                  >
                    {sizeOptions.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </>
              )}

              <Box mt={1}>
                <DebounceTextField
                  fullWidth
                  size="small"
                  label="Tên popup"
                  value={action.config.popupName || ""}
                  onChange={handlePopupNameChange}
                />
              </Box>
            </>
          )}

        {action.config.actionType === "export" && (
          <>
            <Select
              fullWidth
              size="small"
              value={action.config.fnCodeExport || ""}
              onChange={handleFnCodeExportChange}
            >
              <MenuItem value="">None</MenuItem>
              {selectOptions.map((opt) => (
                <MenuItem key={opt._id} value={opt.code}>
                  {opt.name}
                </MenuItem>
              ))}
            </Select>
            <StyledFormControlTable fullWidth size="small">
              <InputLabel id="multi-form-select-label">
                Chọn nhiều biểu mẫu
              </InputLabel>
              <Select
                labelId="multi-form-select-label"
                multiple
                value={action.config.multiForms || []}
                onChange={handleMultiFormsChange}
                renderValue={(selected) =>
                  formOptions
                    .filter((f) => selected.includes(f.code))
                    .map((f) => f.name)
                    .join(", ")
                }
              >
                {formOptions.map((opt) => (
                  <MenuItem key={opt._id} value={opt.code}>
                    {opt.name}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControlTable>
          </>
        )}

        <FormControlLabel
          control={
            <StyledCheckboxTable
              checked={action.config.allowSignDigital || false}
              onChange={handleAllowSignDigitalChange}
            />
          }
          label="Cho phép ký số"
        />

        <FormControlLabel
          control={
            <StyledCheckboxTable
              checked={action.config.allowSignInitial || false}
              onChange={handleAllowSignInitialChange}
            />
          }
          label="Cho phép ký nháy"
        />
      </StyledBoxContainer>
    );
  }
);

ActionConfigItem.displayName = "ActionConfigItem";

ActionConfigItem.propTypes = {
  action: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  selectOptions: PropTypes.array.isRequired,
  featureType: PropTypes.string.isRequired,
};

const CustomTableBorderCalendarTree = ({
  type,
  data = [],
  onSelect,
  onSelectAll,
  defaultValues = [],
  disabled = false,
  formatId = "id",
  dataColumn,
  mode = "runtime",
  item = {},
  onPropChange = () => {},
  funcDataForm = [],
  reload,
  allowColumnDrag = false,
  isAuthorized,
  authorizedFunction,
  fnCode,
  onSearch,
  renderAfterSearch,
  filterOptions = [],
  onAdd,
  onExport,
  disableAdd = false,
  onAdvancedSearch,
  addButtonLabel = "Thêm công việc",
  onMyAssign,
  onMyDirector,
  onMySupporter,
  activeTaskView,
}) => {
  const toast = useToast();
  const safeData = useMemo(() => data || [], [data]);
  const dispatch = useDispatch();

  const [columns, setColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState(defaultValues || []);
  const [anchorEl, setAnchorEl] = useState(null);
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [settingMoreAnchor, setSettingMoreAnchor] = useState(null);
  const [actionConfigAnchor, setActionConfigAnchor] = useState(null);
  const [actions, setActions] = useState(item?.props?.configs || []);
  const featureType = item?.props?.featureType;
  const selectOptions = funcDataForm;
  const [, setColumnWidths] = useState(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.name || c.key] = c.width;
    });
    return map;
  });
  const [resizingCol, setResizingCol] = useState(null);
  const [startX] = useState(0);
  const [startWidth] = useState(0);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMoreEvents, setShowMoreEvents] = useState(null);
  const MAX_VISIBLE_EVENTS = 2;
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [, setReloadData] = useState(false);

  // Search & Filter State
  const [searchText, setSearchText] = useState("");
  const [openFilter, setOpenFilter] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState(
    filterOptions?.map((col) => col.name) || []
  );
  const [tempSelectedColumns, setTempSelectedColumns] = useState(selectedColumns);

  // Click ra ngoài để đóng filter
  const handleClickAway = useCallback(() => {
    setOpenFilter(false);
  }, []);

  // Toggle mở/đóng filter
  const handleToggleFilter = useCallback(() => {
    setOpenFilter((prev) => !prev);
  }, []);

  // Checkbox toggle từng cột
  const handleToggleFilterColumn = useCallback((columnName) => () => {
    setTempSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((val) => val !== columnName)
        : [...prev, columnName]
    );
  }, []);

  // Chọn/Bỏ chọn tất cả cột
  const handleSelectAllFilterColumns = useCallback(() => {
    if (tempSelectedColumns.length === filterOptions.length) {
      setTempSelectedColumns([]);
    } else {
      setTempSelectedColumns(filterOptions.map((col) => col.name));
    }
  }, [tempSelectedColumns, filterOptions]);

  // Áp dụng bộ lọc
  const handleApplyFilter = useCallback(() => {
    setSelectedColumns(tempSelectedColumns);
    setOpenFilter(false);
  }, [tempSelectedColumns]);

  // Xử lý thay đổi ô tìm kiếm
  // const handleSearchChange = useCallback((e) => {
  //   const value = clearWidthSpace(e.target.value);
  //   setSearchText(value);
  // }, []);

  const handleSearchFilter = (e) => {
    const inputValue = e.target.value;
    const normalized = inputValue.normalize("NFC");
    const forbiddenCharsRegex = /[~!@#$%^*.,`]/;
    if (forbiddenCharsRegex.test(normalized)) {
      e.preventDefault();
      return;
    }
    setSearchText(clearWidthSpace(inputValue).trimStart());
  };

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  // Xử lý khi nhấn nút tìm kiếm
  const handleSearchButtonClick = useCallback(() => {
    if (onSearch) {
      const selectedCodes = filterOptions
        .filter((col) => selectedColumns.includes(col.name))
        .map((col) => col.code);
      onSearch(searchText, selectedCodes);
    }
  }, [onSearch, searchText, selectedColumns, filterOptions]);  const handleOpenExport = useCallback((event) => {
    setExportAnchorEl(event.currentTarget);
  }, []);

  const handleCloseExport = useCallback(() => {
    setExportAnchorEl(null);
  }, []);

  const handleExportExcel = useCallback(() => {
    if (onExport) {
      onExport("xlsx");
    }
    handleCloseExport();
  }, [onExport, handleCloseExport]);

  const handleExportPdf = useCallback(() => {
    if (onExport) {
      onExport("pdf");
    }
    handleCloseExport();
  }, [onExport, handleCloseExport]);

  // Xử lý khi nhấn phím Enter trong ô tìm kiếm
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      handleSearchButtonClick();
    }
  }, [handleSearchButtonClick]);

  // Determine date field keys with fallback logic
  const dateFieldKey = useMemo(() => {
    // First try explicit config
    if (item?.props?.dateFieldKey) return item.props.dateFieldKey;
    // Then check columns for date fields
    if (columns.length > 0) {
      const dateColumn = columns.find(
        (col) =>
          col.type === "date" ||
          col.key === "storageStartDate" ||
          col.key === "startDate" ||
					col.key === "createdDate" ||
					col.key === "start_date_from" ||
					col.key === "end_date_from"
      );
      if (dateColumn) return dateColumn.key;
    }

    // Default fallback
    return "createdDate";
  }, [item?.props?.dateFieldKey, columns]);

  // Tự động tìm field endDate
  const endDateFieldKey = useMemo(() => {
    if (item?.props?.endDateFieldKey) return item.props.endDateFieldKey;

    if (columns.length > 0) {
      const endDateColumn = columns.find(
        (col) => col.key === "endDate" || col.key === "storageEndDate"
      );
      if (endDateColumn) return endDateColumn.key;
    }

    return "endDate";
  }, [item?.props?.endDateFieldKey, columns]);

  const allPossibleColumns = useMemo(() => {
    if (dataColumn?.length) {
      return dataColumn.map(({ name, showInList, ...rest }) => ({
        ...rest,
        key: name || rest.key,
        name: name || rest.name,
        isShow:
          showInList !== undefined
            ? showInList
            : rest.isShow !== undefined
              ? rest.isShow
              : true,
      }));
    }
    return (configTable[type] || []).map((c) => ({ ...c, isShow: true }));
  }, [type, dataColumn]);

  useEffect(() => {
    if (reload !== null) {
      setSelectedRows([]);
    }
  }, [reload]);

  useEffect(() => {
    setSelectedRows([]);
    if (onSelect) onSelect([], []);
    if (onSelectAll) onSelectAll(false);
  }, [data, onSelect, onSelectAll]);

  useEffect(() => {
    setActions(item?.props?.configs || []);
  }, [item?.props?.configs]);

  useEffect(() => {
    if (allPossibleColumns.length > 0) {
      setColumns(allPossibleColumns);
      dispatch(addDataFieldConfig(allPossibleColumns));
    }
  }, [type, dataColumn, dispatch, allPossibleColumns]);

  useEffect(() => {
    const map = {};
    (columns || []).forEach((c) => {
      if (c?.width) map[c.name || c.key] = c.width;
    });
    setColumnWidths((prev) => ({ ...prev, ...map }));
  }, [columns]);

  useEffect(() => {
    setSelectedRows(defaultValues || []);
  }, [defaultValues]);

  useEffect(() => {
    if (onPropChange && item?.id) {
      onPropChange(item.id, "configs", actions);
    }
  }, [actions, onPropChange, item?.id]);

  const handleCheckboxChange = useCallback(
    (rowId, rows) => {
      const newSelected = selectedRows.includes(rowId)
        ? selectedRows.filter((id) => id !== rowId)
        : [...selectedRows, rowId];
      setSelectedRows(newSelected);
      if (onSelect) onSelect(newSelected, rows);
    },
    [selectedRows, onSelect]
  );

  const getRowId = useCallback(
    (row, index) =>
      row?.[formatId] ||
      row?._id ||
      row?.id ||
      row?.documentId ||
      row?.bookDocumentId ||
      index,
    [formatId]
  );

  useEffect(() => {
    if (!resizingCol) return undefined;
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const newWidth = Math.max(40, startWidth + dx);
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: newWidth }));
    };
    const onUp = () => {
      setResizingCol(null);
      setColumnWidths(async (currentWidths) => {
        const updatedColumns = columns.map((col) => {
          const colIdentifier = col.name || col.key;
          if (currentWidths[colIdentifier]) {
            const newWidth = parseFloat(currentWidths[colIdentifier]);
            return { ...col, width: `${newWidth}px` };
          }
          return col;
        });
        dispatch(addDataFieldConfig(updatedColumns));
        setColumns(updatedColumns);
        if (allowColumnDrag) {
          (async () => {
            try {
              const body = {
                columns: updatedColumns,
                module:
                  isAuthorized === true && authorizedFunction
                    ? authorizedFunction
                    : fnCode,
              };
              await dispatch(upDateColumnTable(body)).unwrap();
              toast("Lưu cấu hình độ rộng cột thành công", "success");
            } catch (err) {
              toast("Lưu cấu hình độ rộng cột thất bại", "error");
            }
          })();
        }
        return currentWidths;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [
    resizingCol,
    startX,
    startWidth,
    columns,
    dispatch,
    allowColumnDrag,
    toast,
    fnCode,
    isAuthorized,
    authorizedFunction,
  ]);

  const handleSettingsClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleToggleColumn = useCallback(
    (columnKey) => {
      const visibleColumnsCount = columns.filter((c) => c.isShow).length;
      const targetColumn = columns.find((c) => c.key === columnKey);
      if (visibleColumnsCount <= 1 && targetColumn?.isShow) return;
      const newColumns = columns.map((c) =>
        c.key === columnKey ? { ...c, isShow: !c.isShow } : c
      );
      setColumns(newColumns);
      dispatch(addDataFieldConfig(newColumns));
    },
    [columns, dispatch]
  );

  const handleOpenActionConfig = useCallback((e) => {
    setActionConfigAnchor(e.currentTarget);
  }, []);

  const handleOpenSettingMore = useCallback((e) => {
    setSettingMoreAnchor(e.currentTarget);
  }, []);

  const handleCloseActionConfig = useCallback(() => {
    setActionConfigAnchor(null);
  }, []);

  const handleCloseSettingMore = useCallback(() => {
    setSettingMoreAnchor(null);
  }, []);

  const handleActionPropChange = useCallback((id, key, value) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a
      )
    );
  }, []);

  const handleAddAction = useCallback(() => {
    setActions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        config: { icon: "Edit", color: "primary", url: "" },
      },
    ]);
  }, []);

  const handleRemoveAction = useCallback((id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleToggleColumnClick = useCallback(
    (columnKey) => (event) => {
      event.stopPropagation();
      handleToggleColumn(columnKey);
    },
    [handleToggleColumn]
  );

  const handleIsShowSTTChange = useCallback(
    (itemId) => (e) => {
      if (itemId) {
        onPropChange(itemId, "isShowSTT", e.target.checked);
      }
    },
    [onPropChange]
  );

  const handlePropChange = useCallback(
    (itemId, propKey) => (e) => {
      if (itemId) {
        onPropChange(itemId, propKey, e.target.checked);
      }
    },
    [onPropChange]
  );

  const handleMultiDeleteApiUrlChange = useCallback(
    (e) => {
      onPropChange(item.id, "multiDeleteApiUrl", e.target.value);
    },
    [onPropChange, item.id]
  );

  const handleShowStarFilterChange = useCallback(
    (e) => {
      if (item?.id) {
        onPropChange(item.id, "showStarFilterConfig", e.target.checked);
      }
    },
    [onPropChange, item?.id]
  );

  const handleToggleAllColumns = (event) => {
    event.stopPropagation?.();
    const checked = event.target.checked;
    const newColumns = columns.map((col) => ({ ...col, isShow: checked }));
    setColumns(newColumns);
    dispatch(addDataFieldConfig(newColumns));
  };

  // Calendar utility functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add previous month days to fill the grid
    const startDayOfWeek = getStartDayOfWeek(date);
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (
      let i = prevMonthLastDay - startDayOfWeek + 1;
      i <= prevMonthLastDay;
      i++
    ) {
      days.push({ date: new Date(year, month - 1, i), isCurrentMonth: false });
    }

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push({ date: new Date(d), isCurrentMonth: true });
    }

    // Add next month days to fill the grid
    const totalCells = 35; // 5 rows * 7 days
    const currentMonthDays = lastDay.getDate();
    const filledCells = startDayOfWeek + currentMonthDays;
    const nextMonthDaysNeeded = totalCells - filledCells;

    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getStartDayOfWeek = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const day = firstDay.getDay();
    return day === 0 ? 6 : day - 1;
  };

  /**
   * Parse date string từ format dd/MM/yyyy hoặc các format khác
   * @param {string|Date} dateStr - String date hoặc Date object
   * @returns {Date|null} - Date object hoặc null nếu parse thất bại
   */
  const parseEventDate = (dateStr) => {
    if (!dateStr) return null;

    // Nếu đã là Date object
    if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
      return dateStr;
    }

    // Convert to string
    const str = String(dateStr).trim();

    // Thử parse format dd/MM/yyyy
    const ddMMyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddMMyyyyMatch) {
      const [, day, month, year] = ddMMyyyyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Thử parse format yyyy-MM-dd (ISO)
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Thử default parsing
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;

    return null;
  };

  const formatDate = (date) => {
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatMonth = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  };

  const getEventsForDay = (day) => {
    if (!Array.isArray(safeData)) return [];
    const filtered = safeData.filter((event) => {
      const startDateValue = event[dateFieldKey];
      const endDateValue = event[endDateFieldKey];

      // Nếu không có startDate, bỏ qua
      if (!startDateValue) {
        return false;
      }

      // Parse startDate
      const eventStartDate = parseEventDate(startDateValue);
      if (!eventStartDate) {
        logger.log("Failed to parse startDate for event:", startDateValue);
        return false;
      }

      // Parse endDate (nếu có)
      const eventEndDate = endDateValue ? parseEventDate(endDateValue) : null;

      // Format ngày để so sánh
      const dayFormatted = formatDate(day);
      const startFormatted = formatDate(eventStartDate);

      // Nếu có endDate, kiểm tra xem day có nằm trong khoảng [startDate, endDate]
      if (eventEndDate) {
        const endFormatted = formatDate(eventEndDate);
        // Kiểm tra day >= startDate && day <= endDate
        return dayFormatted >= startFormatted && dayFormatted <= endFormatted;
      }

      // Nếu không có endDate, chỉ hiển thị vào ngày startDate
      return dayFormatted === startFormatted;
    });

    return filtered;
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
    setShowMoreEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
    setShowMoreEvents(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setShowMoreEvents(null);
  };

  const handleShowMore = (day, allEvents) => {
    setShowMoreEvents({ day, events: allEvents });
  };

  const handleCloseModal = () => {
    setShowMoreEvents(null);
  };

  const statusConfig = {
    1: {
      bg: "#e0e0e0",
      border: "#9e9e9e",
      label: "Công việc mới",
      icon: Clock,
    },
    2: {
      bg: "#DBEAFE",
      border: "#0062AD",
      label: "Đang thực hiện",
      icon: Clock,
    },
    3: {
      bg: "#FEF9C2",
      border: "#FFA600",
      label: "Chờ phê duyệt",
      icon: AlertCircle,
    },
    4: {
      bg: "#D0FFDE",
      border: "#007222",
      label: "Hoàn thành",
      icon: CheckCircle,
    },
    5: {
      bg: "#ffe0e0",
      border: "#ef5350",
      label: "Hủy",
      icon: XCircle,
    },
    6: {
      bg: "#ffe4cc",
      border: "#ff9800",
      label: "Điều chỉnh",
      icon: Edit3,
		},
		// pending: {
    //   bg: "#e0e0e0",
    //   border: "#9e9e9e",
    //   label: "Không xác định",
    //   icon: Clock,
    // }
  };

  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setOpenDetailModal(true);
  }, []);

  // Calendar event handlers
  const handleCalendarEventClick = useCallback(
    (rowId, event) => {
      handleCheckboxChange(rowId, [event]);
      handleTaskClick(event);
    },
    [handleCheckboxChange, handleTaskClick]
  );

  const handleCalendarShowMore = useCallback((day, dayEvents) => {
    handleShowMore(day, dayEvents);
  }, []);

  // Wrapper for calendar item clicks to avoid inline functions
  const createCalendarItemClickHandler = useCallback(
    (rowId, event) => () => handleCalendarEventClick(rowId, event),
    [handleCalendarEventClick]
  );

  // Wrapper for show more button clicks
  const createShowMoreClickHandler = useCallback(
    (day, dayEvents) => () => handleCalendarShowMore(day, dayEvents),
    [handleCalendarShowMore]
  );

  const renderDetailModal = () => {
    if (!selectedTask || !openDetailModal) return null;

    const handleCloseModal = () => {
      setOpenDetailModal(false);
      setSelectedTask(null);
    };

    const handleJobDetailSuccess = () => {
      setReloadData((prev) => !prev);
      handleCloseModal();
    };

    const commonProps = {
      open: openDetailModal,
      onClose: handleCloseModal,
      onSuccess: handleJobDetailSuccess,
      documentId: selectedTask?.sourceId || selectedTask?.id,
      setReloadData,
    };

    switch (selectedTask?.typeTask) {
      case "general":
        return <ViewJob {...commonProps} />;
      case "form_doc":
        return <ViewJobToDocument {...commonProps} />;
      case "form_meeting":
        return <ViewJobToMeeting {...commonProps} />;
      default:
        return <ViewJob {...commonProps} />;
    }
  };

  const handleDateFieldKeyChange = useCallback(
    (itemId) => (e) => {
      if (itemId) {
        onPropChange(itemId, "dateFieldKey", e.target.value);
      }
    },
    [onPropChange]
  );

  return (
    <StyledBoxTableBoder>
      <CalendarContainer>

         {(onSearch || renderAfterSearch) && (
        <StyledToolbarkanba>
          <ToolbarContent>
            <StyledSearchWrap>
              <UnifiedSearchContainer>
                <ClickAwayListener onClickAway={handleClickAway}>
                  <StyledFilterRelativeBox>
                    <PillFilterTrigger onClick={onAdvancedSearch}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7398 2.01172L1.33984 2.01172L6.69984 8.34992L6.69984 12.7317L9.37984 14.0717L9.37984 8.34992L14.7398 2.01172Z" stroke="currentColor" strokeWidth="1.34" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Bộ lọc</span>
                    </PillFilterTrigger>

                    {openFilter && (
                      <FilterBox alignRight={false}>
                        <StyleBoxActionDropDown>
                          <span>Lọc tìm kiếm</span>
                          <SearchIcon />
                        </StyleBoxActionDropDown>

                        <StyleActionCheckBox>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={
                                  tempSelectedColumns?.length ===
                                  filterOptions?.length
                                }
                                indeterminate={
                                  tempSelectedColumns?.length > 0 &&
                                  tempSelectedColumns?.length <
                                    filterOptions?.length
                                }
                                onChange={handleSelectAllFilterColumns}
                                size="small"
                              />
                            }
                            label="Tất cả"
                          />
                        </StyleActionCheckBox>

                        <StyleActionCellCheckBox>
                          {filterOptions?.map((column) => (
                            <FormControlLabel
                              key={column.code}
                              control={
                                <Checkbox
                                  checked={tempSelectedColumns.includes(
                                    column.name
                                  )}
                                  onChange={handleToggleFilterColumn(column.name)}
                                  size="small"
                                />
                              }
                              label={column.name}
                            />
                          ))}
                        </StyleActionCellCheckBox>

                        <StyleActionButton>
                          <StyleActionButtonCancel onClick={handleClickAway}>
                            Hủy
                          </StyleActionButtonCancel>
                          <StyleActionButtonApply
                            variant="contained"
                            onClick={handleApplyFilter}
                          >
                            Áp dụng
                          </StyleActionButtonApply>
                        </StyleActionButton>
                      </FilterBox>
                    )}
                  </StyledFilterRelativeBox>
                </ClickAwayListener>

                <SearchInputWrapper>
                  <StyledPillInput
                    placeholder="Tìm kiếm..."
                    value={searchText}
                    onChange={handleSearchFilter}
                    onKeyDown={handleKeyDown}
                  />
                  {searchText && (
                    <PillClearButton onClick={handleClearSearch}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </PillClearButton>
                  )}
                </SearchInputWrapper>

                <PillTuneButton onClick={handleToggleFilter}>
                  <TuneIcon />
                </PillTuneButton>
              </UnifiedSearchContainer>

              <BlueSearchButton onClick={handleSearchButtonClick}>
                <Tooltip title="Tìm kiếm">
                  <SearchIcon />
                </Tooltip>
              </BlueSearchButton>
            </StyledSearchWrap>

            {renderAfterSearch && renderAfterSearch({ hideButton: true })}

            {/* Nút toggle bộ lọc nhanh */}
            {(onMyAssign || onMyDirector || onMySupporter) && (
              <TaskViewToggleWrapper>
                {onMyAssign && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.myAssign || activeTaskView === 'myAssign') ? 1 : 0}
                    onClick={onMyAssign}
                    title="Việc tôi giao"
                  >
                    Việc tôi giao
                  </TaskViewToggleButton>
                )}
                {onMyDirector && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.myDirector || activeTaskView === 'myDirector') ? 1 : 0}
                    onClick={onMyDirector}
                    title="Việc tôi chủ trì"
                  >
                    Việc tôi chủ trì
                  </TaskViewToggleButton>
                )}
                {onMySupporter && (
                  <TaskViewToggleButton
                    active={(activeTaskView?.mySupporter || activeTaskView === 'mySupporter') ? 1 : 0}
                    onClick={onMySupporter}
                    title="Việc tôi phối hợp"
                  >
                    Việc tôi phối hợp
                  </TaskViewToggleButton>
                )}
              </TaskViewToggleWrapper>
            )}
          </ToolbarContent>

          <ActionsContainer>
            <ActionsBox>
              {onExport && (
                <>
                  <ExportButton onClick={handleOpenExport}>
                    <Tooltip title="Xuất">
                      <GetAppIcon />
                    </Tooltip>
                  </ExportButton>
                  <Popover
                    open={Boolean(exportAnchorEl)}
                    anchorEl={exportAnchorEl}
                    onClose={handleCloseExport}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <PopoverContainer>
                      <StyledPopoverActionButton
                        fullWidth
                        startIcon={<ExcelIcon />}
                        onClick={handleExportExcel}
                      >
                        Xuất Excel
                      </StyledPopoverActionButton>
                      <StyledPopoverActionButton
                        fullWidth
                        startIcon={<PdfIcon />}
                        onClick={handleExportPdf}
                      >
                        Xuất PDF
                      </StyledPopoverActionButton>
                    </PopoverContainer>
                  </Popover>
                </>
              )}
               {onAdd && !disableAdd && (
                <AddJobButton onClick={onAdd}>
                    <AddIcon />
                    {addButtonLabel}
                </AddJobButton>
              )}
            </ActionsBox>
          </ActionsContainer>
        </StyledToolbarkanba>
      )}

      {mode === "builder" && (
        <StyledBoxBoder>
          <Tooltip title="Cấu hình cột">
            <BuilderIconButton onClick={handleSettingsClick}>
              <ViewColumnIcon />
            </BuilderIconButton>
          </Tooltip>
          <Tooltip title="Cấu hình hành động">
            <BuilderIconButton
              onClick={handleOpenActionConfig}
              disabled={disabled}
            >
              <SettingsIcon />
            </BuilderIconButton>
          </Tooltip>
          <Tooltip title="Cấu hình thêm">
            <BuilderIconButton
              onClick={handleOpenSettingMore}
              disabled={disabled}
            >
              <AutoAwesomeIcon />
            </BuilderIconButton>
          </Tooltip>
          <Popover
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleSettingsClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            onBackdropClick={handleSettingsClose}
            PaperProps={{
              component: StyledPopoverPaper,
            }}
          >
            <StyleBoxCH>
              <StyleBoxDropDown>
                <StyleTyprographyDropDown variant="subtitle1">
                  Cấu hình bảng
                </StyleTyprographyDropDown>
                <StyleIconDropDown />
              </StyleBoxDropDown>
              <StyleBoxDrop>
                <StyleFomControl
                  control={
                    <Checkbox
                      checked={columns.every((c) => c.isShow)}
                      indeterminate={
                        columns.some((c) => c.isShow) &&
                        !columns.every((c) => c.isShow)
                      }
                      onChange={handleToggleAllColumns}
                      size="small"
                    />
                  }
                  label="Tất cả"
                />
              </StyleBoxDrop>
              <StyleBoxDrown>
                {columns.map((colConfig) => (
                  <StyleFomControl
                    key={colConfig.key}
                    control={
                      <Checkbox
                        checked={colConfig.isShow}
                        onChange={handleToggleColumnClick(colConfig.key)}
                        size="small"
                      />
                    }
                    label={colConfig.label}
                  />
                ))}
              </StyleBoxDrown>
              <StyleBoxButton>
                <StyleButtonH
                  variant="text"
                  size="small"
                  onClick={handleSettingsClose}
                >
                  Hủy
                </StyleButtonH>
                <StyleButtonAD
                  variant="contained"
                  size="small"
                  onClick={handleSettingsClose}
                >
                  Áp dụng
                </StyleButtonAD>
              </StyleBoxButton>
            </StyleBoxCH>
          </Popover>
          <Popover
            open={Boolean(actionConfigAnchor)}
            anchorEl={actionConfigAnchor}
            onClose={handleCloseActionConfig}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            onBackdropClick={handleCloseActionConfig}
          >
            <StyledBoxBoderBox p={2}>
              <Typography variant="h6" mb={1}>
                Cấu hình hành động
              </Typography>
              {actions.map((action) => (
                <ActionConfigItem
                  key={action.id}
                  action={action}
                  onChange={handleActionPropChange}
                  onRemove={handleRemoveAction}
                  selectOptions={selectOptions}
                  featureType={featureType}
                />
              ))}
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={handleAddAction}
                fullWidth
              >
                Thêm hành động
              </Button>
            </StyledBoxBoderBox>
          </Popover>
          <Popover
            open={Boolean(settingMoreAnchor)}
            anchorEl={settingMoreAnchor}
            onClose={handleCloseSettingMore}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            onBackdropClick={handleCloseSettingMore}
          >
            <StyledBoxBoderBox p={2}>
              <Typography variant="h6" mb={1}>
                Cấu hình thêm
              </Typography>
              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.isShowSTT}
                    onChange={handleIsShowSTTChange(item.id)}
                  />
                }
                label="Hiện STT"
              />
              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.multiDelete}
                    onChange={handlePropChange(item.id, "multiDelete")}
                  />
                }
                label="Hiện nút xóa nhiều"
              />
              {item?.props?.multiDelete && (
                <>
                  <Typography variant="subtitle2" mt={1}>
                    URL API Xóa nhiều
                  </Typography>
                  <DebounceTextField
                    fullWidth
                    size="small"
                    label="Nhập URL API xóa nhiều"
                    value={item?.props?.multiDeleteApiUrl || ""}
                    onChange={handleMultiDeleteApiUrlChange}
                  />
                </>
              )}
              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.hasTabs}
                    onChange={handlePropChange(item.id, "hasTabs")}
                  />
                }
                label="Hiện thị các tab ở trong chi tiết"
              />
              <FormControlLabel
                control={
                  <StyledCheckboxTable
                    checked={item?.props?.showStarFilterConfig || false}
                    onChange={handleShowStarFilterChange}
                  />
                }
                label="Bộ lọc bản ghi quan trọng"
              />

              <Typography variant="subtitle2" mt={2} mb={1}>
                Trường ngày hiển thị trên calendar
              </Typography>
              <Select
                fullWidth
                size="small"
                value={item?.props?.dateFieldKey || "createdDate"}
                onChange={handleDateFieldKeyChange(item.id)}
              >
                {columns
                  .filter(
                    (col) => col.type === "date" || col.key.includes("Date")
                  )
                  .map((col) => (
                    <MenuItem key={col.key} value={col.key}>
                      {col.label}
                    </MenuItem>
                  ))}
              </Select>
            </StyledBoxBoderBox>
          </Popover>
        </StyledBoxBoder>
      )}

        {/* Calendar Header */}
        <CalendarHeader>
          <CalendarTitle>Tháng {formatMonth(currentDate)}</CalendarTitle>
          <CalendarButtonGroup>
            <CalendarGroupButton onClick={handlePrevMonth}>&#8249;</CalendarGroupButton>
            <CalendarGroupDivider />
            <CalendarTodayButton onClick={handleToday}>Hôm nay</CalendarTodayButton>
            <CalendarGroupDivider />
            <CalendarGroupButton onClick={handleNextMonth}>&#8250;</CalendarGroupButton>
          </CalendarButtonGroup>
        </CalendarHeader>

        {/* Weekday Header */}
        <WeekdayHeader>
          {[
            "Thứ hai",
            "Thứ ba",
            "Thứ tư",
            "Thứ năm",
            "Thứ sáu",
            "Thứ bảy",
            "Chủ nhật",
          ].map((day) => (
            <WeekdayCell key={day}>{day}</WeekdayCell>
          ))}
        </WeekdayHeader>

        {/* Calendar Grid */}
        <CalendarGrid>
          {getDaysInMonth(currentDate).map((dayObj) => {
            const day = dayObj.date;
            const isNextMonth = !dayObj.isCurrentMonth;
            const dayEvents = getEventsForDay(day);
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS;
            
            // Check if this day is today
            const today = new Date();
            const isToday = day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();

            return (
              <DayCell key={day.toString()} isNextMonth={isNextMonth}>
                <DayNumber isToday={isToday}>{day.getDate()}</DayNumber>
                <EventsContainer>
                  {visibleEvents.map((event) => {
                    const rowId = getRowId(event, 0);
                    const isSelected = selectedRows.includes(rowId);
                    const status =
                      event.processStatus || event.state || "pending";
                    // const status = event.status || event.state || "pending";
                    const config = statusConfig[status] || statusConfig.pending;
                    const eventName =
                      event.name ||
                      event[columns[0]?.key] ||
                      event.title ||
                      "Không có tiêu đề";

                    return (
                      <EventItem
                        key={rowId}
                        onClick={createCalendarItemClickHandler(rowId, event)}
                        selected={isSelected}
                        title={eventName}
                        customBg={config.bg}
                        customBorder={config.border}
                      >
                        <StyledBoxFlagIcon size={20} />
                        <EventText>{eventName}</EventText>
                      </EventItem>
                    );
                  })}
                  {remainingCount > 0 && (
                    <ShowMoreButton
                      onClick={createShowMoreClickHandler(day, dayEvents)}
                    >
                      +{remainingCount} khác
                    </ShowMoreButton>
                  )}
                </EventsContainer>
              </DayCell>
            );
          })}
        </CalendarGrid>

        {/* Legend */}
        <Legend>
          {Object.entries(statusConfig)
            .filter(([key]) => key !== "pending")
            .map(([key, config]) => (
              <LegendItem key={key}>
                <LegendBox customBg={config.bg} customBorder={config.border} statusLabel={config.label} />
                <span>{config.label}</span>
              </LegendItem>
            ))}
        </Legend>
      </CalendarContainer>

      {renderDetailModal()}

      {/* Show More Modal */}
      {showMoreEvents && (
        <>
          <Backdrop onClick={handleCloseModal} />

          <Modal>
            <ModalHeader>
              <ModalDateBadge>
                {showMoreEvents.day.getDate()}
              </ModalDateBadge>
              <ModalDayName>
                {VN_WEEKDAYS[showMoreEvents.day.getDay()]}
              </ModalDayName>
              <ModalCloseButton onClick={handleCloseModal}>
                <CloseIcon />
              </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
              {showMoreEvents.events.map((event, index) => {
                const rowId = getRowId(event, index);
                const isSelected = selectedRows.includes(rowId);
                const status = event.processStatus || event.status || event.state || "pending";
                const config = statusConfig[status] || statusConfig.pending;
                const eventName =
                  event.name ||
                  event[columns[0]?.key] ||
                  event.title ||
                  "Không có tiêu đề";
                return (
                  <ModalEventItem
                    key={rowId}
                    onClick={createCalendarItemClickHandler(rowId, event)}
                    selected={isSelected}
                    customBg={config.bg}
                    customBorder={config.border}
                  >
                    <LegendItemBox>
                      <StyledFlagIconLarge />
                    </LegendItemBox>
                    <StyledBoxTableFlag>
                      <BuilderTypographyBox>
                        {eventName}
                      </BuilderTypographyBox>
                    </StyledBoxTableFlag>
                  </ModalEventItem>
                );
              })}
            </ModalContent>

            {/* <ModalFooter>
              <ModalButton onClick={handleCloseModal} buttonType="secondary">
                Hủy
              </ModalButton>
              <ModalButton onClick={handleCloseModal} buttonType="primary">
                Xác nhận
              </ModalButton>
            </ModalFooter> */}
          </Modal>
        </>
      )}
    </StyledBoxTableBoder>
  );
};

CustomTableBorderCalendarTree.propTypes = {
  formatId: PropTypes.string,
  type: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  color: PropTypes.string,
  showIndexColumn: PropTypes.bool,
  showCheckboxColumn: PropTypes.bool,
  onSelect: PropTypes.func,
  defaultValues: PropTypes.array,
  disabled: PropTypes.bool,
  isDisablePage: PropTypes.bool,
  pagination: PropTypes.shape({
    total: PropTypes.number,
    page: PropTypes.number,
    rowsPerPage: PropTypes.number,
    totalPages: PropTypes.number,
  }),
  onPage: PropTypes.func,
  onSelectAll: PropTypes.func,
  selectAll: PropTypes.bool,
  dataColumn: PropTypes.array,
  mode: PropTypes.string,
  item: PropTypes.object,
  onPropChange: PropTypes.func,
  processId: PropTypes.string,
  onAction: PropTypes.func,
  onOrder: PropTypes.func,
  funcDataForm: PropTypes.array,
  onAdvancedSearch: PropTypes.func,
  isMobile: PropTypes.bool,
  onCellClick: PropTypes.func,
  allowColumnDrag: PropTypes.bool,
  reload: PropTypes.any,
  setReloadData: PropTypes.func,
  isAuthorized: PropTypes.bool,
  authorizedFunction: PropTypes.string,
  fnCode: PropTypes.string,
  addButtonLabel: PropTypes.string,
};

export default CustomTableBorderCalendarTree;