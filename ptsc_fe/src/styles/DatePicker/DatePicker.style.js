// ========== Custom for ScrollColumn ===========
export const StyledScrollList = styled(PageContainer)(({ theme }) => ({
  height: ITEM_H * 5,
  overflowY: "scroll",
  overflowX: "hidden",
  scrollSnapType: "y mandatory",
  "&::-webkit-scrollbar": { width: 0 },
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
	position: "relative",
	padding: "unset",
	display: "unset",
	justifyContent: "unset",
}));

export const StyledScrollListCustom = styled(StyledScrollList)(() => ({
  height: 180,
  paddingTop: 70,
  paddingBottom: 70,
  overflowY: 'auto',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}));

// ========== Custom for DateTimeRangePicker ===========
export const StyledScrollColumnWrapper = styled('div')(() => ({
  width: 30,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

export const StyledScrollColumnLabelSpacer = styled('div')(() => ({
  height: 4,
}));

export const StyledScrollColumnListContainer = styled(PageContainer)(() => ({
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: 0,
}));

export const StyledMonthSelectorRowFlex = styled('div')(() => ({
  display: 'flex',
  justifyContent: 'center',
}));

export const StyledTimePanelWrapper = styled('div')(() => ({
  width: 110,
  paddingLeft: 12,
  boxSizing: 'border-box',
}));

export const StyledTimePanelInner = styled('div')(() => ({
  borderLeft: '1px solid #E5E7EB',
  paddingLeft: 12,
  height: '100%',
}));

export const StyledTimePanelTitle = styled('div')(() => ({
  fontSize: 13,
  color: '#667085',
  marginBottom: 8,
  textAlign: 'center',
  fontWeight: 500,
}));


export const StyledTimePickerColon = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
  fontSize: 18,
  paddingTop: 28,
}));

export const StyledDateTimeRangeGrid = styled('div')(() => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 40,
  width: '100%',
  padding: '12px 16px 4px',
  boxSizing: 'border-box',
}));

export const StyledDateTimeRangeLabel = styled('div')(() => ({
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
}));

export const StyledDateTimeRangeRow = styled('div')(() => ({
  display: 'flex',
  gap: 10,
}));

export const inputLabelPropsStyle = {
  shrink: true,
  sx: (theme) => ({
    color: theme.palette.text.primary,
    fontWeight: 500,
    "& .MuiFormLabel-asterisk": {
      color: theme.palette.error.main,
    },
    "&.Mui-focused": {
      color: theme.palette.primary.main,
    },
    "& .MuiOutlinedInput-input": {
      padding: theme.spacing(1.5, 1.75),
    },
  }),
};

export const textFieldSx = (theme) => ({
  "& .MuiOutlinedInput-input": {
    padding: theme.spacing(1.5, 1.75),
  },
  // Border mặc định cho DatePicker
  "& .MuiOutlinedInput-notchedOutline": {
    border: `1px solid ${theme.palette.divider}`,
  },
  // Disabled state cho DatePicker
  "& .MuiOutlinedInput-root.Mui-disabled": {
    backgroundColor:
      (theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
        "&.Mui-disabled"
      ]?.backgroundColor ||
        (theme.palette.mode === "dark" ? "#334155" : "#EBEBEB")) + " !important",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.divider,
    },
    "& .MuiOutlinedInput-input": {
      color:
        (theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
          "&.Mui-disabled"
        ]?.color ||
          (theme.palette.mode === "dark" ? "#94a3b8" : "#000000")) + " !important",
      WebkitTextFillColor:
        (theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
          "&.Mui-disabled"
        ]?.color || (theme.palette.mode === "dark" ? "#94a3b8" : "#000000")) + " !important",
    },
    // ✅ Không hiển thị border khi hover vào disabled input
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.divider,
    },
  },

  // ✅ Giữ label màu bình thường khi disabled (không bị mờ)
  "& .MuiInputLabel-root.Mui-disabled": {
    color: theme.palette.text.primary + " !important",
  },

  // Hover effect - giống CustomInput (chỉ khi không disabled)
  "& .MuiOutlinedInput-root:not(.Mui-disabled):hover .MuiOutlinedInput-notchedOutline":
    {
      borderColor: theme.palette.primary.main,
    },

  // Focused effect - giống CustomInput
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
});

import { styled, alpha } from "@mui/material/styles";
import {
  Button,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import { PageContainer } from "@styles/Common.styles";
import { DateCalendar, DateRangeIcon, PickersDay } from "@mui/x-date-pickers";
import { ConfigTextField, PageTitle, StyledPaper } from "@styles/ThemeConfig.styles";
import { StyledAccessTimeIcon } from "@components/Notification/Notification.styles";

export const StyledInputAdornment = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginRight: theme.spacing(0.5),
}));

export const StyledClearIconButton = styled(IconButton)({
  padding: "2px",
});

export const StyledClearIcon = styled(ClearIcon)({
  fontSize: "1.1rem",
});

export const StyledDateTimePickerContainer = styled(PageContainer)(
  ({
    theme,
    showRangeBg,
    isStartWithRange,
    isEndOfRange,
    bgOpacity,
    styledOpacity,
    styledPointerEvents,
  }) => ({
    position: "relative",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 36,
    padding: "unset",
    // reset PageContainer defaults
    backgroundColor: "transparent",
    overflow: "visible",
    flexDirection: "column",
    ...(styledOpacity !== undefined && { opacity: styledOpacity }),
    ...(styledPointerEvents !== undefined && {
      pointerEvents: styledPointerEvents,
    }),
    ...(showRangeBg && {
      "&::before": {
        content: '""',
        position: "absolute",
        top: 2,
        bottom: 2,
        left: isStartWithRange ? "50%" : 0,
        right: isEndOfRange ? "50%" : 0,
        backgroundColor: alpha(theme.palette.primary.main, bgOpacity),
        zIndex: 0,
      },
    }),
  })
);

export const StyledPickersDay = styled(PickersDay)(
  ({ theme, d, previewEnd, styledOpacity, styledPointerEvents }) => ({
    zIndex: 1,
    position: "relative",
    ...(previewEnd &&
      d.isSame(previewEnd, "day") && {
        border: "2px dashed",
        borderColor: theme.palette.primary.main,
        backgroundColor: "transparent",
      }),
    ...(styledOpacity !== undefined && { opacity: styledOpacity }),
    ...(styledPointerEvents !== undefined && {
      pointerEvents: styledPointerEvents,
    }),
  })
);

export const StyledRangeDayContainer = styled(PageContainer)(() => ({
  flexDirection: "column",
  alignItems: "center",
  width: 52,
  padding: "unset",
  justifyContent: "unset",
  // reset PageContainer defaults
  backgroundColor: "transparent",
  height: "auto",
  overflow: "visible",
}));

export const StyledRangeDayTypography = styled(PageTitle)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
  height: 18,
}));

export const StyledStartTimeTypography = styled(PageTitle)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const ITEM_H = 36;

export const StyledScrollItem = styled(PageContainer, {
  shouldForwardProp: (prop) => prop !== "isSelected",
})(({ theme, isSelected }) => ({
  height: ITEM_H,
  alignItems: "center",
  scrollSnapAlign: "start",
  cursor: "pointer",
  fontWeight: isSelected ? 700 : 400,
  fontSize: 14,
  color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
  backgroundColor: isSelected
    ? theme.palette.primary[50] ?? theme.palette.primary.light
    : "transparent",
  borderRadius: theme.shape.borderRadius / 2,
  userSelect: "none",
  transition: "background 0.15s",
	"&:hover": { backgroundColor: theme.palette.action.hover },
	padding: "unset",
}));

export const StyledTimePickerWrapper = styled(PageContainer)(() => ({
  display: "inline-flex",
	alignItems: "center",
	padding: "unset",
	justifyContent: "unset",
}));

export const StyledTimeButton = styled(Button)(({ theme }) => ({
  minWidth: 90,
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 1,
  color: theme.palette.text.primary,
  borderColor: theme.palette.divider,
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  paddingLeft: theme.spacing(1.25),
  paddingRight: theme.spacing(1.25),
  "&.Mui-disabled": {
    color: theme.palette.text.disabled,
  },
}));

export const StyledTimeSeparator = styled(PageTitle)(({ theme }) => ({
  paddingTop: theme.spacing(3),
  fontSize: 18,
  fontWeight: 700,
  color: theme.palette.text.secondary,
}));

export const StyledTimePickerPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius * 2,
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing(1),
  alignItems: "flex-start",
}));

export const StyledMonthYearSelect = styled(Select)(({ styleMinWidth }) => ({
  fontWeight: 600,
  fontSize: 13,
  minWidth: styleMinWidth ? styleMinWidth : "unset",
  "& .MuiSelect-select": { paddingTop: 0, paddingBottom: 0, paddingRight: "20px !important" },
}));

export const StyledSelectMenuItem = styled(MenuItem)(() => ({
  fontSize: 13,
}));

export const StyledPickerRoot = styled(PageContainer)(() => ({
	width: "100%",
	justifyContent: "unset",
	padding: "unset",
	display: "unset",
}));

export const StyledPopoverContent = styled(PageContainer)(() => ({
	padding: "16px 12px 12px",
	justifyContent: "unset",
	display: "unset",
}));

export const StyledMonthNavStack = styled(Stack)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
}));

export const StyledCalendarPopoverPaper = styled(StyledPaper)(({ theme }) => ({
  boxShadow: theme.shadows[8],
  borderRadius: theme.shape.borderRadius * 2,
	marginTop: theme.spacing(0.5),
	width: "unset",
	padding: "unset",
	backgroundColor: "unset",
}));

export const calendarSx = {
  height: 260,
  width: 280,
  "& .MuiPickersCalendarHeader-root": { display: "none" },
  "& .MuiDayCalendar-weekContainer": { margin: 0 },
};

export const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
}));

export const StyledCalendarDivider = styled(Divider)(() => ({
  alignSelf: "stretch",
  height: "auto",
  borderBottomWidth: 0,
  borderRightWidth: "thin",
}));

export const StyledMonthYearSelectorRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(0.5),
  alignItems: "center",
}));

export const StyledMonthSelectorRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(6),
  justifyContent: "center",
  flex: 1,
}));

export const StyledCalendarRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(1),
}));

export const StyledTimeRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(3),
  alignItems: "center",
  justifyContent: "center",
}));

export const StyledTimeSideRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(1),
  alignItems: "center",
}));

export const StyledActionRow = styled(Stack)(() => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
}));

export const StyledButtonRow = styled(Stack)(({ theme }) => ({
  flexDirection: "row",
  gap: theme.spacing(1),
}));

export const StyledDateCalendar = styled(DateCalendar)(({ calendarSx }) => ({
  ...calendarSx,
}));

export const StyledAccessTimeIconTimeSide = styled(StyledAccessTimeIcon)(() => ({
	fontSize: "small",
}));

export const StyledTriggerInput = styled(ConfigTextField)(({ triggerSx }) => ({
	marginTop: "unset",
	...triggerSx,
}));

export const StyledDateRangeIcon = styled(DateRangeIcon)(() => ({
	fontSize: "small"
}));

export const StyledInputAdornmentDateRange = styled(InputAdornment)(() => ({
	position: "end"
}));

export const StyledButtonDeleteTime = styled(Button)(({ theme }) => ({
	 color: theme.palette.text.primary,
}));

export const StyledButtonCancelTime = styled(Button)(({ theme }) => ({
	//  color: "inherit",
	color: theme.palette.text.primary,
}));

export const StyledButtonConfirmTime = styled(Button)(({ theme }) => ({
	color: theme.palette.common.white,
	backgroundColor: theme.palette.primary.main,
	"&:hover": {
		backgroundColor: theme.palette.primary.dark,
	},
}));

export const StyledCalendarSection = styled(Stack)(() => ({
	flexDirection: "column",
}));

export const StyledCalendarTimePanelRow = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	gap: theme.spacing(1),
}));

export const StyledTimePanelContainer = styled(Stack)(({ theme }) => ({
	borderLeft: `1px solid ${theme.palette.divider}`,
	paddingLeft: theme.spacing(1.5),
	paddingRight: theme.spacing(0.5),
	gap: theme.spacing(1.5),
	minWidth: 120,
	justifyContent: "flex-start",
	paddingTop: theme.spacing(1),
}));

export const StyledTimePanelLabel = styled(PageTitle)(({ theme }) => ({
	fontWeight: 600,
	fontSize: 13,
	color: theme.palette.text.primary,
	textAlign: "center",
}));

export const StyledDateDisplaySection = styled(Stack)(({ theme }) => ({
	gap: theme.spacing(1),
}));

export const StyledDateDisplayRow = styled(Stack)(({ theme }) => ({
	flexDirection: "row",
	alignItems: "center",
	gap: theme.spacing(1.5),
}));

export const StyledDateDisplayLabel = styled(PageTitle)(({ theme }) => ({
	fontSize: 13,
	fontWeight: 500,
	color: theme.palette.text.secondary,
	minWidth: 100,
}));

export const StyledDateDisplayBox = styled(PageContainer)(({ theme }) => ({
	padding: theme.spacing(0.5, 1),
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.shape.borderRadius,
	fontSize: 13,
	fontFamily: "monospace",
	color: theme.palette.text.primary,
	backgroundColor: "transparent",
	height: "auto",
	overflow: "visible",
	justifyContent: "center",
	alignItems: "center",
	display: "flex",
}));

export const StyledScrollItemCustom = styled(StyledScrollItem, {
  shouldForwardProp: (prop) => prop !== 'isDisabled',
})(({ isSelected, isDisabled }) => ({
  height: ITEM_H,
  lineHeight: `${ITEM_H}px`,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: isSelected ? 600 : 400,
  borderRadius: 8,
  margin: '2px 0',
  cursor: isDisabled ? 'default' : 'pointer',
  ...(isDisabled && {
    opacity: 0.3,
    pointerEvents: 'none',
  }),
}));

export const StyledMonthYearSelectorRowGrid = styled(StyledMonthYearSelectorRow)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}));

export const StyledMonthNavStackGrid = styled(StyledMonthNavStack)(() => ({
  display: 'grid',
  gridTemplateColumns: '32px 1fr 32px',
  alignItems: 'center',
  gap: 12,
  marginBottom: 8,
}));

export const StyledMonthSelectorRowGrid = styled(StyledMonthSelectorRow)(() => ({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 24,
  alignItems: 'center',
}));

export const StyledTimePickerPaperCustom = styled(StyledTimePickerPaper)(() => ({
  boxShadow: 'none',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  padding: '8px 6px',
  display: 'flex',
  justifyContent: 'center',
  gap: 6,
  background: '#fff',
}));

export const StyledCalendarTimePanelRowGrid = styled(StyledCalendarTimePanelRow)(({ showTimePanel }) => ({
  display: 'grid',
  alignItems: 'start',
  gridTemplateColumns: showTimePanel ? 'auto 110px' : 'auto',
  width: 'fit-content',
}));

export const StyledDateDisplayBoxDate = styled(StyledDateDisplayBox)(() => ({
  minWidth: 110,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: "1px solid #D0D5DD",
  borderRadius: 8,
  background: "#F2F4F7",
  fontSize: 15,
  fontWeight: 600,
  boxSizing: 'border-box',
}));

export const StyledDateDisplayBoxTime = styled(StyledDateDisplayBox)(({ open }) => ({
  cursor: 'pointer',
  minWidth: 88,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: open ? "1px solid #0E7490" : "1px solid #D0D5DD",
  borderRadius: 8,
  background: "#F2F4F7",
  fontSize: 15,
  fontWeight: 600,
  boxSizing: 'border-box',
}));
