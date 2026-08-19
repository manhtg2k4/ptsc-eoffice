import { styled } from "@mui/material/styles";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { Flag } from "@mui/icons-material";

export const StyledKanbanStack = styled(Stack)(({ theme }) => ({
  overflowX: "auto",
  overflowY: "visible",
  alignItems: "flex-start",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
  height: "100%",
  flexWrap: "nowrap",
  // Quan trọng: cần width + minWidth để overflowX:auto hoạt động đúng
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",

  [theme.breakpoints.up("sm")]: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

export const StyledColumnWrapper = styled(Box)(({ theme }) => ({
  minWidth: 260,
  width: 260,
  maxWidth: "calc(100vw - 32px)",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",

  [theme.breakpoints.up("sm")]: {
    minWidth: 300,
    width: 300,
    maxWidth: 320,
  },

  [theme.breakpoints.up("md")]: {
    minWidth: 320,
    width: 320,
  },
}));

export const StyledColumnPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#F8FAFC",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#f1f5f9"}`,
  borderRadius: "16px",
  boxShadow: "none",
  padding: theme.spacing(1.25),

  // ✅ Bố cục để list cuộn bên trong cột
  display: "flex",
  flexDirection: "column",

  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(1.5),
    borderRadius: "16px",
  },
}));

export const StyledColumnHeader = styled(Box)(({ theme, styledBgcolor }) => ({
  backgroundColor: styledBgcolor || theme.palette.background.paper,
  borderRadius: "16px",
  paddingTop: theme.spacing(0.75),
  paddingBottom: theme.spacing(0.75),
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  textAlign: "center",
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,

  [theme.breakpoints.up("sm")]: {
    borderRadius: "20px",
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
}));

export const StyledColumnHeaderCount = styled(StyledColumnHeader)(
  ({ theme }) => ({
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,

    [theme.breakpoints.up("sm")]: {
      width: 40,
      height: 40,
      marginBottom: theme.spacing(3),
    },
  })
);

export const StyledColumnTitle = styled(Typography)(({ theme, textcolor }) => ({
  color: textcolor || theme.palette.text.primary,
  fontSize: "13px",
  fontWeight: 700,

  [theme.breakpoints.up("sm")]: {
    fontSize: "14px",
  },
}));

export const StyledCountBadge = styled(StyledColumnTitle)(
  () => ({
    minWidth: 18,
    height: 18,
    padding: "0 6px",
    borderRadius: 999,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  })
);

export const StyledCardList = styled(Box)(({ theme }) => ({
  minHeight: 100,
  maxHeight: "500px",
  overflowY: "auto",

  // ✅ tạo khung nhẹ cho vùng list (giống ảnh) - đã bỏ borderTop đứt đoạn
  borderTop: "none",
  paddingTop: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),

  paddingRight: theme.spacing(0.5),

  "&::-webkit-scrollbar": { width: "6px" },
  "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.background.paper,
      // theme.palette.mode === "dark"
      //   ? "rgba(255,255,255,0.3)"
      //   : "rgba(0,0,0,0.2)",
    borderRadius: "3px",
  },

  [theme.breakpoints.down("lg")]: { maxHeight: "450px" },
  [theme.breakpoints.down("md")]: { maxHeight: "300px" },
  [theme.breakpoints.down("sm")]: {
    maxHeight: "250px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": { display: "none" },
  },
}));

export const StyledKanbanCard = styled(Card)(
  ({ theme, isDragging, overdueDays }) => ({
    marginBottom: theme.spacing(1.5),
    boxShadow: isDragging 
      ? theme.shadows[4] 
      : "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
    borderRadius: "12px",
    backgroundColor: overdueDays 
      ? (theme.palette.mode === "dark" ? "#311818" : "#fff5f5") 
      : theme.palette.background.paper,
    border: `1px solid ${overdueDays 
      ? (theme.palette.mode === "dark" ? "#7f1d1d" : "#fee2e2") 
      : (theme.palette.mode === "dark" ? "#334155" : "#e2e8f0")}`,
    transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
    cursor: "grab",

    "&:hover": {
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      transform: "translateY(-2px)",
      borderColor: theme.palette.mode === "dark" ? "#475569" : "#cbd5e1",
    },

    "&:active": {
      cursor: "grabbing",
    },

    [theme.breakpoints.up("sm")]: {
      marginBottom: theme.spacing(2),
      borderRadius: "12px",
    },
  })
);

export const StyledCardContent = styled(CardContent)(({ theme }) => ({
  padding: "12px !important",

  [theme.breakpoints.up("sm")]: {
    padding: "16px !important",
  },
}));

export const StyledCardContentBox = styled(Box)({
  display: "flex",
  alignItems: "flex-start",
});

export const StyledCardTextBox = styled(Box)({
  flex: 1,
});

export const StyledCardTitleRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  marginBottom: theme.spacing(1),
}));

export const StyledCardTitle = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  fontSize: "14px",
  marginBottom: 0,
  color: theme.palette.text.primary,
  fontWeight: 700,
  lineHeight: 1.5,
  wordBreak: "break-word",
}));

export const StyledInfoText = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  marginBottom: theme.spacing(0.5),
  color: theme.palette.text.secondary,
}));

export const StyledFlagIcon = styled(Flag)(({ theme, flagcolor }) => ({
  color: flagcolor || theme.palette.text.disabled,
}));

export const FilterWrapper = styled(Box)({
  position: "relative",
});

export const CenteredBox = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  maxHeight: "calc(80vh - 200px)",
  overflowY: "auto",
  padding: theme.spacing(4),
}));

export const ErrorText = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
  fontWeight: 600,
}));

export const StyledTimeSelect = styled(TextField)(({ theme }) => ({
  minWidth: 120,
  marginLeft: theme.spacing(1),
  "& .MuiOutlinedInput-root": {
    height: 40,
  }
}));

export const CalendarHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "20px",
  marginBottom: theme.spacing(3),
  borderRadius: 8,
  backgroundColor: '#F9FAFB',
  padding: '12px 20px',
  // marginTop: 30,
  width: "100%",
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    marginBottom: theme.spacing(2),
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
  },
}));

export const CalendarTitle = styled("h2")(({ theme }) => ({
  margin: 0,
  fontSize: "26px",
  fontWeight: "700",
  color: theme.palette.mode === "dark" ? "#f8fafc" : "#3b4758",
  [theme.breakpoints.down("sm")]: {
    fontSize: "1.25rem",
  },
}));

export const CalendarButtonGroup = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#cbd5e1"}`,
  borderRadius: "10px",
  overflow: "hidden",
  height: "38px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#ffffff",
}));

export const CalendarGroupButton = styled("button")(({ theme }) => ({
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

export const CalendarTodayButton = styled("button")(({ theme }) => ({
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

export const CalendarGroupDivider = styled("div")(({ theme }) => ({
  width: "1px",
  height: "22px",
  backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
}));

export const SegmentedButtonGroup = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#cbd5e1"}`,
  borderRadius: "10px",
  overflow: "hidden",
  height: "38px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
  marginLeft: "auto",
  [theme.breakpoints.down("sm")]: {
    marginLeft: 0,
    marginTop: theme.spacing(1),
  },
}));

export const SegmentedButton = styled("button", {
  shouldForwardProp: (prop) => prop !== "active",
})(({ theme, active }) => ({
  background: active ? (theme.palette.mode === "dark" ? "#334155" : "#ffffff") : "none",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: active ? "600" : "500",
  height: "100%",
  padding: "0 16px",
  color: active 
    ? (theme.palette.mode === "dark" ? "#ffffff" : "#1e293b") 
    : (theme.palette.mode === "dark" ? "#94a3b8" : "#64748b"),
  transition: "all 0.2s",
  boxShadow: active ? "0 1px 3px rgba(0, 0, 0, 0.05)" : "none",
  "&:hover": {
    backgroundColor: active ? (theme.palette.mode === "dark" ? "#334155" : "#ffffff") : "rgba(0,0,0,0.02)",
  },
}));
