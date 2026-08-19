import {
  Link,
  styled,
} from "@mui/material";
import { 
  SkyBox, 
  SkyGrid, 
  SkyStack, 
  SkyButton, 
  SkyTypography, 
  SkyTextField, 
  SkyIconButton
} from "@styles/SkyStyles";

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

export const OpinionForm = styled(SkyBox)(({ theme }) => ({
	marginTop: theme.spacing(2),
	marginBottom: theme.spacing(2),
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
}));

export const OpinionContent = styled(SkyBox)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	gap: theme.spacing(1),
}));

export const OpinionContentV2 = styled(SkyBox)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	// flex: 1,
	gap: theme.spacing(1),
	marginTop: theme.spacing(6.25),
}));

export const OpinionFormV2 = styled(SkyBox)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "flex-start",
	width: "calc(100% - 1px)", // Fill the container width
	left: 0,
	gap: theme.spacing(1),
	position: "absolute",
	bottom: 0,
	padding: theme.spacing(1.5),
	// backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF", // Solid background
	borderTop: `1px solid ${theme.palette.divider}`,
	zIndex: 10,
	boxShadow: "0px -4px 10px rgba(0, 0, 0, 0.1)", // Shadow to separate from list
	borderRadius: "0 0 6px 6px",
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
  };
});

export const GeneralInfoGridContainer = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(1),
 
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

export const StyledBoxContainerContent = styled(SkyBox)(
  ({ theme, styledMarginTop }) => ({
    backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#FFFFFF",
    borderRadius: 8,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
    border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
    marginTop: typeof styledMarginTop === "number" ? styledMarginTop : (styledMarginTop ? theme.spacing(2) : null),
    padding: theme.spacing(2),
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    },
  })
);

export const StyledComment = styled(StyledBoxContainerContent)(() => ({
  height: "100%",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
}));

export const StyledHeaderContent = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== "isExpanded" && prop !== "isView",
})(({ theme, isExpanded, isView }) => ({
  marginBottom: isExpanded !== false && !isView ? theme.spacing(3) : 0,
}));

export const StyledContainerUploadFile = styled(SkyBox)(({ theme, noneBorder }) => ({
  marginBottom: theme.spacing(2),
  border: noneBorder ? "none" : "1px solid #e8eaf1",
  borderRadius: 4,
  padding: noneBorder ? 0 : theme.spacing(2),
}));

export const StyledStack = styled(SkyStack)(() => ({
  alignItems: "flex-start",
}));

export const StyledBoxSenderUnit = styled(SkyBox)(() => ({
  flex: 1,
}));

export const StyledGridCustomComment = styled(SkyGrid)(({ theme }) => ({
	paddingTop: theme.spacing(1),
	position: "sticky",
	top: 92,
	alignSelf: "flex-start",
	zIndex: 1,
}));

export const StickyStepperContainer = styled(SkyBox)(({ theme }) => ({
	position: "sticky",
	top: '-8px',
	zIndex: 1200,
	backgroundColor: theme.palette.mode === "dark" ? "#1E293B" : "#FFFFFF",
	padding: theme.spacing(0, 1, 1, 1),
	marginBottom: theme.spacing(1),
}));

export const StyleBoxComent = styled(SkyBox)(
  ({ type }) => ({
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height:
      type === "incoming"
        ? "430px"
        : type === "outgoing"
          ? "100%"
          : "auto",
  })
);

export const StyledCompactStyleBoxComent = styled(StyleBoxComent)({
  flex: "none",
  // height: "auto",
});

export const StyledDraftFileContainer = styled(SkyBox)(( ) => ({
  // height: "300px",
  // minHeight: "300px",
  flexShrink: 0,
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "transparent transparent",
  // marginBottom: theme.spacing(2),
  "&::-webkit-scrollbar": {
    width: "4px",
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
}));

export const StyledTabsContainer = styled(SkyBox)(({ theme }) => ({
  // marginTop: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  "& .MuiTabs-flexContainer": {
    paddingLeft: "0 !important",
  },
}));

export const StyledTabsContainerOutGoingDoc = styled(StyledTabsContainer)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}));

export const StyledSubTabGrid = styled(SkyGrid)(() => ({
  marginTop: 0,
}));

export const StyledTypography = styled(SkyTypography)(() => ({}));
export const StyledLink = styled(Link)(() => ({}));
export const StyledGrid = styled(SkyGrid)(() => ({}));
export const AttachedDocLabel = styled(StyledTypography)(() => ({
	color: "#0062AD",
	fontWeight: 700,
	marginLeft: "10px",
  fontSize: "14.8571px",
}));
export const StyledFlexGrowBox = styled(SkyBox)(() => ({
  flexGrow: 1,
}));

export const StyledIconKeyboardArrow = styled(SkyIconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  color: theme.palette.primary.main,
}));


export const SummaryHeaderBox = styled(SkyBox)(({ theme, styledMarginBottom }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: typeof styledMarginBottom === "number" ? theme.spacing(styledMarginBottom) : theme.spacing(1.5),
  // borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const SummaryTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "1.4rem",
  color:  theme.palette.primary.main
}));

export const StatusBadge = styled(SkyBox)(({ theme, statusColor }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: "16px",
  backgroundColor: statusColor ? `${statusColor}20` : "#fef3c7",
  color: statusColor || "#d97706",
  fontSize: "1.05rem",
  fontWeight: "600",
  "&::before": {
    content: '""',
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: statusColor || "#d97706",
  },
}));

export const SummaryField = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: theme.spacing(2),
}));

export const SummaryLabel = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.05rem",
  color: theme.palette.text.secondary,
}));

export const SummaryValue = styled(SkyTypography)(({ theme }) => ({
  fontSize: "1.25rem",
  fontWeight: "500",
  color: theme.palette.text.primary,
}));

export const SummaryAbstractBox = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
  padding: theme.spacing(2),
  borderRadius: "8px",
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  marginTop: theme.spacing(2),
}));

export const StyledViewGridContainer = styled(SkyGrid)(({ theme, isView }) => ({
  [theme.breakpoints.up("md")]: {
    ...(isView && {
      height: "calc(100dvh - 250px)",
      overflow: "hidden",
      paddingTop: theme.spacing(1.5),
    }),
  },
}));

export const StyledMainColumn = styled(SkyGrid)(({ theme, isView }) => ({
  [theme.breakpoints.up("md")]: {
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
}));

export const StyledSidebarColumn = styled(SkyGrid)(({ theme, isView }) => ({
  [theme.breakpoints.up("md")]: {
    ...(isView && {
      height: "100%",
      overflowY: "auto",
      paddingRight: theme.spacing(1),
      scrollbarWidth: "thin",
      scrollbarColor: "transparent transparent",
      "&::-webkit-scrollbar": {
        width: "4px",
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
