import {
  SkyBox,
  SkyButton,
  SkyGrid,
  SkyStack,
  SkyTextField,
  SkyTypography,
} from "@styles/SkyStyles";
import { styled } from "@mui/material/styles";
import { Divider, IconButton } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export const ActionBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1),
}));

export const OpinionHeader = styled(SkyBox)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
});

export const OpinionTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  margin: theme.spacing(2, 0),
}));

export const OpinionButton = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(1, 2.5),
}));

export const OpinionForm = styled("form")(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const OpinionContent = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  gap: theme.spacing(1),
}));

export const OpinionContentV2 = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  // flex: 1,
  gap: theme.spacing(1),
  marginTop: theme.spacing(6.25),
}));

// export const OpinionFormV2 = styled("form")(({ theme }) => ({
//   marginTop: theme.spacing(2),
//   // marginBottom: theme.spacing(2),
// 	display: "flex",
// 	width: "94%",
//   alignItems: "center",
// 	gap: theme.spacing(1),
// 	position: "absolute",
// 	bottom: 0,
// }));

export const OpinionFormV2 = styled("form")(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "100%",
  gap: theme.spacing(1),
  padding: theme.spacing(1, 0),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const SubmitOpinionButton = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  padding: theme.spacing(1, 2.5),
}));

export const StyledBoxInputCommentAndButtonSend = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "isDetailMeeting",
})(({ isDetailMeeting }) => ({
  display: "flex",
  alignItems: "center",
  gap: 1,
  width: "100%",
  ...(isDetailMeeting && {
    padding: "8px 0",
    gap: "8px",
  }),
}));

export const OpinionTextField = styled(SkyTextField)({
  flexGrow: 1,
});

export const SeeMoreButton = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginTop: theme.spacing(1),
  textTransform: "none",
}));

export const RecursiveCommentContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "level",
})(({ theme, level }) => {
  const MAX_LEVEL = 2;

  // level hiển thị dùng cho thụt
  const displayLevel = Math.min(level, MAX_LEVEL);

  let marginLeft = 0;
  if (level === 1) {
    marginLeft = 17;
  } else if (level > 1) {
    marginLeft = 61;
  }

  return {
    marginBottom: theme.spacing(2),
    marginTop: displayLevel > 0 ? theme.spacing(1) : 0,
    marginLeft: marginLeft,
    paddingLeft: 0,
    borderLeft: "none",
    maxWidth: "100%",
    boxSizing: "border-box",
  };
});

export const GeneralInfoGridContainer = styled(SkyGrid)(() => ({
  // marginTop: theme.spacing(0),
}));

export const StyledGridContainerInfo = styled(SkyGrid)(({ styledIsView }) => ({
  // marginTop: theme.spacing(1),
  display: styledIsView ? "flex" : null,
  gap: styledIsView ? "16px" : null,
  alignItems: styledIsView ? "stretch" : null,
}));

export const FormGridItem = styled(SkyGrid)({
  paddingTop: "0 !important",
});

export const FormGridComment = styled(SkyGrid)({
  paddingTop: "0 !important",
  padding: 2,
  borderRadius: 1,
});

export const StyledBoxContainerContent = styled(SkyBox, {
  shouldForwardProp: (prop) => !["isAdd", "styledMarginTop", "styledMarginBottom"].includes(prop),
})(({ theme, styledMarginTop, styledMarginBottom, isAdd }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 8,
  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  marginTop:
    typeof styledMarginTop === "number"
      ? styledMarginTop
      : styledMarginTop
        ? theme.spacing(2)
        : null,
  marginBottom:
    typeof styledMarginBottom === "number"
      ? styledMarginBottom
      : styledMarginBottom
        ? theme.spacing(2)
        : null,
  padding: theme.spacing(1.5, 2),
  transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
  "&:hover": {
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
  },
  ...(isAdd && {
    display: "flex",
    flexDirection: "column",
  }),
}));

export const BoxContainerContentIncommingDoc = styled(StyledBoxContainerContent, {
  shouldForwardProp: (prop) => !["isAdd", "styledMarginTop", "styledMarginBottom"].includes(prop),
})(() => ({
  boxShadow: "none",
}));

export const StyledHeaderContent = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isExpanded" && prop !== "isView",
})(() => ({
  fontWeight: "bold",
  margin: 0,
  display: "flex",
  alignItems: "center",
  fontSize: "20px",
  lineHeight: 1.5,
}));

export const StyledContainerUploadFile = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "noneBorder",
})(({ theme, noneBorder }) => ({
  marginBottom: theme.spacing(2),
  border: noneBorder ? "none" : `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f1"}`,
  borderRadius: 8,
  padding: noneBorder ? 0 : theme.spacing(2),
  backgroundColor: noneBorder ? "transparent" : (theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.2)" : "#fcfcfd"),
}));

export const StyledStack = styled(SkyStack)(() => ({
  alignItems: "flex-end",
}));

export const StyledBoxSenderUnit = styled(SkyBox)(() => ({
  flex: 1,
}));

export const StyledGridCustomComment = styled(SkyGrid)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  position: "relative",
}));

export const StyleBoxComent = styled(SkyBox)(
  ({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    flexShrink: 1,
    height: "auto",
    minHeight: 0,
    flexBasis: "auto",
    overflow: "visible",
    [theme.breakpoints.up(1100)]: {
      flexBasis: 0,
      overflow: "hidden",
    },
  })
);
export const StyledSidebarBox = styled(SkyBox)(({ theme, styledMarginTop }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
  borderRadius: 8,
  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  padding: theme.spacing(2),
  height: "auto",
  [theme.breakpoints.up(1100)]: {
    height: "100%",
  },
  display: "flex",
  flexDirection: "column",
  marginBottom: 0,
  marginTop: typeof styledMarginTop === "number" ? styledMarginTop : (styledMarginTop ? theme.spacing(2) : 0),
  position: "relative",
  transition: "box-shadow 0.2s ease-in-out",
  "&:hover": {
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
  },
}));

export const StyledSidebarHeader = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  marginBottom: theme.spacing(2),
  // fontSize: "0.9rem",
  // color: theme.palette.primary.main,
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const StyledViewGridContainer = styled(SkyGrid, {
  shouldForwardProp: (prop) => prop !== "isAdd" && prop !== "isOverlayContainer",
})(({ theme, isView, isAdd, isOverlayContainer }) => ({
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  overflowX: "hidden",
  ...(isOverlayContainer && {
    position: "relative",
  }),
  [theme.breakpoints.up(1100)]: {
    ...(isView && {
      height: isOverlayContainer ? "calc(100dvh - 166px)" : "calc(100dvh - 160px)",
      overflow: "hidden",
    }),
  },
  [theme.breakpoints.up(820)]: {
    ...(isAdd && {
      height: isOverlayContainer ? "calc(100dvh - 210px)" : "calc(100dvh - 145px)",
      overflow: "hidden",
    }),
  },
}));

export const StyledMainColumn = styled(SkyGrid, {
  shouldForwardProp: (prop) => prop !== "isAdd" && prop !== "isSuggestionOpen",
})(({ theme, isView, isAdd, isSuggestionOpen }) => ({
  minWidth: 0,
  minHeight: 0,
  boxSizing: "border-box",
  ...(isSuggestionOpen && {
    "& .MuiGrid-item": {
      maxWidth: "100% !important",
      flexBasis: "100% !important",
    },
  }),
  [theme.breakpoints.up(1100)]: {
    ...(isSuggestionOpen && {
      flexBasis: "37.5% !important",
      maxWidth: "37.5% !important",
    }),
    ...(isView && !isSuggestionOpen && {
      flexBasis: "70.833333% !important",
      maxWidth: "70.833333% !important",
    }),
    ...(isView && {
      height: "100%",
      overflowY: "auto",
      paddingRight: theme.spacing(1),
      scrollbarWidth: "thin",
      scrollbarColor: "transparent transparent",
      "&::-webkit-scrollbar": {
        width: "6px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "transparent",
        borderRadius: "4px",
      },
      "&:hover": {
        scrollbarColor: "#e2e8f0 transparent",
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#e2e8f0",
        },
      },
    }),
  },
  [theme.breakpoints.up(820)]: {
    ...(isAdd && {
      height: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: theme.spacing(0.5),
      // Keep a small safe area for the swiper footer, avoid large blank space.
      paddingBottom: theme.spacing(2),
      scrollbarWidth: "thin",
      scrollbarColor: "transparent transparent",
      "&::-webkit-scrollbar": {
        width: "6px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "transparent",
        borderRadius: "4px",
      },
      "&:hover": {
        scrollbarColor: "#e2e8f0 transparent",
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#e2e8f0",
        },
      },
    }),
  },
}));

export const StyledSidebarColumn = styled(SkyGrid)(({ theme, isView }) => ({
  [theme.breakpoints.up(1100)]: {
    flexBasis: "29.166667% !important",
    maxWidth: "29.166667% !important",
    ...(isView && {
      height: "100%",
      overflowY: "hidden",
      msOverflowStyle: "none",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    }),
  },
}));

export const StyledSuggestionColumn = styled(SkyGrid)(({ theme }) => ({
  [theme.breakpoints.up(1100)]: {
    flexBasis: "62.5% !important",
    maxWidth: "62.5% !important",
  },
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

export const StyledExpandMoreIcon = styled(KeyboardArrowDownIcon)(({ theme }) => ({
  color: theme.palette.text.primary,
}));


export const StyledExpandLessIcon = styled(KeyboardArrowUpIcon)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

export const SeeMoreToggleButton = styled(SkyButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  textTransform: "none",
  fontWeight: 600,
  fontSize: "0.875rem",
  padding: theme.spacing(0.5, 1.5),
  borderRadius: "20px",
  backgroundColor: theme.palette.mode === "dark"
    ? "rgba(56, 189, 248, 0.1)"
    : "rgba(30, 64, 175, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.3)" : "rgba(30, 64, 175, 0.2)"}`,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark"
      ? "rgba(56, 189, 248, 0.2)"
      : "rgba(30, 64, 175, 0.1)",
    transform: "translateY(-1px)",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
  },
  "&:active": {
    transform: "translateY(0)",
  },
}));

// Keyframes cho hiệu ứng fade-in mượt mà (chỉ dùng opacity + transform = GPU tối ưu)
export const FadeInGridItem = styled(SkyGrid)({
  "@keyframes fadeSlideIn": {
    from: {
      opacity: 0,
      transform: "translateY(-8px)",
    },
    to: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
  animation: "fadeSlideIn 0.8s ease-out both",
});

export const StyledFormLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "13px !important",
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
  display: "flex",
  alignItems: "center",
  textTransform: "uppercase",
}));

export const StyledIconWrapper = styled(SkyBox)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(56, 189, 248, 0.1)" : "#edf2f9",
  flexShrink: 0,
}));

export const UrgencyBadge = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "urgencyCode" && prop !== "urgencyLabel",
})(({ urgencyCode, urgencyLabel }) => {
  let bgColor = "#64748b"; // Default gray
  const code = (urgencyCode || "").toString().toUpperCase();
  const label = (urgencyLabel || "").toString().toUpperCase();

  if (code.includes("HOA_TOC") || label.includes("HỎA TỐC")) bgColor = "#b91c1c";
  else if (code.includes("THUONG_KHAN") || label.includes("THƯỢNG KHẨN")) bgColor = "#ef4444";
  else if (code.includes("KHAN") || label.includes("KHẨN")) bgColor = "#f59e0b";
  else if (code.includes("BINH_THUONG") || label.includes("BÌNH THƯỜNG")) bgColor = "#10b981";

  return {
    padding: "6px 16px",
    borderRadius: "100px",
    backgroundColor: bgColor,
    color: "#FFFFFF",
    fontSize: "0.75rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    textTransform: "none",
    whiteSpace: "nowrap",
  };
});

export const StyledDivider = styled(Divider)(({ theme }) => ({
  marginBottom: theme.spacing(2), // 16px
  borderColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
}));

export const ViewFieldBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#F8FAFC",
  padding: "8px 14px",
  borderRadius: "8px",
  minHeight: "60px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#F1F5F9"}`,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#F1F5F9",
  },
}));

export const ViewFieldLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "13px !important", // 13px
  color: theme.palette.mode === "dark" ? "#94A3B8" : "#64748B",
  textTransform: "uppercase",
  fontWeight: 600,
  marginBottom: "2px",
  letterSpacing: "0.05em",
}));

export const ViewFieldValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1rem",
  color: theme.palette.mode === "dark" ? "#F1F5F9" : "#1E293B",
  fontWeight: 700,
  lineHeight: 1.4,
  minHeight: "1.4em", // Prevent collapse when empty
}));

export const AbstractSummaryBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.5)" : "#F8FAFC",
  padding: "20px",
  borderRadius: "12px",
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#F1F5F9"}`,
  width: "100%",
}));

export const AbstractSummaryContent = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  flex: 1,
});

export const AbstractSummaryTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1rem",
  fontWeight: 700,
  color: theme.palette.mode === "dark" ? "#38bdf8" : "#2364B0",
}));

export const AbstractSummaryText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.0625rem", // ~17px
  color: theme.palette.text.primary,
  lineHeight: 1.6,
  fontWeight: 500,
  whiteSpace: "pre-line",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
}));

export const StyledInfoIcon = styled(InfoOutlinedIcon)(({ theme }) => ({
  color: theme.palette.mode === "dark" ? "#38bdf8" : "#2364B0",
  fontSize: "24px",
  marginTop: "2px",
}));

export const StyledIconAddSendngUnit = styled(IconButton)(({ theme }) => ({
  // color: theme.palette.mode === "dark" ? "#38bdf8" : "#2364B0",
  color: "primary",
  marginBottom: theme.spacing(0.5),
}));


export const SenderUnitGridItem = styled(FadeInGridItem)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(1.5),
  position: "relative",
  "& > :first-child": {
    flex: 1,
    minWidth: 0, // Allow input to shrink to give space to the button
  },
  "& .MuiOutlinedInput-root": {
    paddingRight: "0 !important",
  },
}));

export const SenderUnitAddButton = styled("div")(({ theme }) => ({
  marginTop: "24px",
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  "& .MuiButton-root": {
    minWidth: "120px !important", // Override global !important from StyledButton
    width: "auto !important",      // Override fixed width
    height: "44px !important",
    padding: "0 20px !important",  // Add space for text
    borderRadius: "8px",
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    color: theme.palette.mode === "dark" ? "#FFFFFF" : "#000000",
    border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
    boxShadow: "none",
    textTransform: "none",
    whiteSpace: "nowrap",
    fontWeight: 600,
    "&:hover": {
      backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#f8fafc",
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    },
    "& .MuiSvgIcon-root": {
      fontSize: "24px",
    },
  },
}));

// export const SenderUnitAutocompleteStyles = {
//   '& .MuiOutlinedInput-root': {
//     paddingRight: '50px !important',
//   },
// };
