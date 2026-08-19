import { styled } from "@mui/material/styles";
import { Step, StepLabel, Typography, Box } from "@mui/material";
import { MarginControlBox } from "./ThemeConfig.styles";

export const StepperWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  width: "100%",
  // padding: theme.spacing(2, 0),
  overflow: "visible",
  [theme.breakpoints.down(1025)]: {
    width: "max-content",
    minWidth: "100%",
  },
}));

export const StepItemContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  flex: 1,
  [theme.breakpoints.down(1025)]: {
    minWidth: "180px",
    flexShrink: 0,
  },
}));

export const DiamondConnector = styled("div")(({ isCompleted }) => ({
  position: "absolute",
  top: "75px",
  left: "calc(100% - 20px)", // Centered at the boundary between two StepItemContainers
  width: "40px",
  borderTop: `2px dotted ${isCompleted ? "#919191" : "#919191"}`, // Defaulting to one grey but logic remains for future
  zIndex: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  "&::before, &::after": {
    content: '""',
    display: "block",
    height: "10px",
    width: "2px",
    // borderLeft: `1.5px solid ${isCompleted ? "#0062AD" : "#BDBDBD"}`,
    marginTop: "-6px",
  },
  "&::before": {
    borderRadius: "4px 0 0 4px",
    transform: "rotate(10deg)",
  },
  "&::after": {
    borderRadius: "0 4px 4px 0",
    transform: "rotate(-10deg)",
    borderLeft: "none",
    // borderRight: `1.5px solid ${isCompleted ? "#0062AD" : "#BDBDBD"}`,
  }
}));

export const DiamondShape = styled(Box, {
  shouldForwardProp: (prop) => !['isSelected', 'isCompleted', 'isProcessing', 'canSelect'].includes(prop),
})(({ theme, isSelected, isCompleted, isProcessing, canSelect, disabled }) => {
  let borderColor = "#919191";
  if (isCompleted) borderColor = "#54C977";
  else if (isProcessing) borderColor = "#FFC85B";
  else if (isSelected || canSelect) borderColor = "#0062AD";

  const backgroundColor = theme.palette.common.white;
  const boxShadow = isSelected ? "0 0 10px rgba(0, 98, 173, 0.3)" : "none";

  return {
    width: "48px",
    height: "48px",
    backgroundColor: backgroundColor,
    border: `2px solid ${borderColor}`,
    borderRadius: "12px",
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "default" : "pointer",
    boxShadow: boxShadow,
    transition: "all 0.3s ease",
    zIndex: 1,
    "&:hover": {
      borderColor: disabled ? borderColor : (isCompleted ? "#54C977" : (isProcessing ? "#FFC85B" : "#0062AD")),
      transform: disabled ? "rotate(45deg)" : "rotate(45deg) scale(1.05)",
    },
  };
});

export const DiamondContent = styled(Box, {
  shouldForwardProp: (prop) => !['isSelected', 'isCompleted', 'isProcessing', 'canSelect'].includes(prop),
})(({ isSelected, isCompleted, isProcessing, canSelect }) => {
  let color = "#919191";
  if (isCompleted) color = "#54C977";
  else if (isProcessing) color = "#FFC85B";
  else if (isSelected || canSelect) color = "#0062AD";

  return {
    transform: "rotate(-45deg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: color,
  };
});

export const StepNumber = styled(Typography)(() => ({
  fontSize: "10px",
  fontWeight: "bold",
  lineHeight: 1,
  marginBottom: "4px",
}));

export const StepIconBox = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& svg": {
    fontSize: "20px",
  },
}));

export const StepLabelText = styled(Typography, {
  shouldForwardProp: (prop) => !['isSelected', 'isCompleted', 'isProcessing', 'canSelect'].includes(prop),
})(({ theme, isSelected, isCompleted, isProcessing, canSelect }) => {
  let color = "#919191";
  if (isCompleted) color = "#54C977";
  else if (isProcessing) color = "#FFC85B";
  else if (isSelected || canSelect) color = "#0062AD";

  return {
    marginBottom: theme.spacing(3), // Space to rotated diamond
    fontSize: "12px",
    fontWeight: isSelected ? 700 : 600,
    textAlign: "center",
    color: color,
    textTransform: "uppercase",
    // maxWidth: "120px",
    lineHeight: 1.2,
  };
});

export const InteractiveStep = styled(Step)(({ theme }) => ({
  position: "relative",
  "&:hover": { cursor: "pointer" },
  padding: theme.spacing(1),
  marginBottom: theme.spacing(3.125),
  // marginBottom: !alternativeLabel ? theme.spacing(3.125) : "unset",
  [theme.breakpoints.down(768)]: {
    padding: 0,
    border: "none",
  },
}));

export const InteractiveStepLabel = styled(StepLabel, {
  shouldForwardProp: (prop) =>
    !["isActive", "alternativeLabel", "canSelect", "isCompleted"].includes(
      prop
    ),
})(({ theme, alternativeLabel, canSelect, isCompleted, isActive }) => {
  // Tính toán giá trị theo trạng thái — tránh duplicate key trong JS object
  // (duplicate key trong object literal sẽ bị ghi đè, mất màu)
  const iconBoxShadow =
    isCompleted || isActive
      ? "0 0 0 1px rgba(145,145,145,0.2)"
      : canSelect
      ? "0 0 0 1.5px #0062AD"
      : "0 0 0 1.5px #919191";

  const iconColor = isActive ? "#FFC85B" : theme.palette.common.white;

  const textFill =
    isCompleted || isActive
      ? theme.palette.common.white
      : canSelect
      ? "#0062AD"
      : "#919191";

  const labelColor = isCompleted
    ? "#54C977"
    : isActive
    ? "#FFC85B"
    : canSelect
    ? "#0062AD"
    : "#919191";

  const labelFontWeight = isActive ? 700 : isCompleted || canSelect ? 600 : 500;

  return {
    "&:hover": { cursor: "pointer" },
    pointerEvents: "auto",

    // Viền tròn qua box-shadow (không dùng overflow:hidden để tránh vòng xanh mặc định MUI)
    "& .MuiStepLabel-iconContainer": {
      padding: 0,
      borderRadius: "50%",
      boxShadow: iconBoxShadow,
    },

    // MUI StepIcon SVG dùng evenodd fill-rule: circle fill = currentColor, check = lỗ hổng trắng
    // Cần selector .Mui-completed để override MUI default { color: primary.main }
    "& .MuiStepIcon-root": {
      color: iconColor,
      display: "block",
    },
    // Override MUI default .Mui-active/.Mui-completed { color: primary.main }
    "& .MuiStepIcon-root.Mui-active": {
      color: "#FFC85B",
    },
    "& .MuiStepIcon-root.Mui-completed": {
      color: "#54C977",
    },

    // Số bên trong step
    "& .MuiStepIcon-root .MuiStepIcon-text": { fill: textFill },

    // Chữ phía trên/dưới step — selector dài hơn để tránh bị override bởi layout block
    "& .MuiStepLabel-labelContainer .MuiStepLabel-label": {
      color: labelColor,
      fontWeight: labelFontWeight,
    },

    /* ===============================
       CASE 1: alternativeLabel = true
    ================================ */
    ...(alternativeLabel && {
      "& .MuiStepLabel-labelContainer": {
        [theme.breakpoints.down(768)]: { display: "none" },
      },
      // Dùng selector ngắn hơn để không ghi đè màu ở trên
      "& .MuiStepLabel-label": {
        marginTop: theme.spacing(1),
        textAlign: "center",
      },
    }),

    /* ===============================
       CASE 2: alternativeLabel = false
    ================================ */
    ...(!alternativeLabel && {
      "&.MuiStepLabel-root": {
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "center",
        gap: theme.spacing(0.5),
      },
      // Dùng selector ngắn hơn để không ghi đè màu ở trên
      "& .MuiStepLabel-label": {
        marginTop: 0,
        textAlign: "center",
        whiteSpace: "nowrap",
      },
      "& .MuiStepLabel-labelContainer": {
        [theme.breakpoints.down(768)]: { display: "none" },
      },
    }),
  };
});

export const ActiveStepTitleContainer = styled(MarginControlBox)(
  ({ theme }) => ({
    marginTop: theme.spacing(1),
    textAlign: "center",
    width: "unset",
  })
);

export const BoldTypography = styled(Typography)({
  fontWeight: "bold",
});

export const StyleStepperContainer = styled(MarginControlBox)(
  ({ theme }) => ({
    width: "unset",
    position: "relative",
    [theme.breakpoints.down(1025)]: {
      overflowX: "auto",
      overflowY: "hidden",
      width: "100%",
      WebkitOverflowScrolling: "touch",
      paddingBottom: theme.spacing(1.5),
      "&::-webkit-scrollbar": {
        height: "6px",
      },
      "&::-webkit-scrollbar-track": {
        backgroundColor: "transparent",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        borderRadius: "3px",
        "&:hover": {
          backgroundColor: "rgba(0, 0, 0, 0.3)",
        },
      },
    },
  })
);

export const StyleStepperUserContainer = styled(MarginControlBox)(
  ({ theme }) => ({
    width: "unset",
    maxWidth: "220px",
    minWidth: 0,
    
    marginTop: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(0.5),
    zIndex: 1,
  })
);

export const StyleStepperUserInTooltip = styled(MarginControlBox)(
  () => ({
    width: "unset",
    display: "flex",
    flexDirection: "column",
    gap: 0.5,
  })
);

export const StyleStepperUser = styled("span", {
  shouldForwardProp: (prop) => !['isSigned', 'isCompleted', 'isProcessing', 'isActive'].includes(prop),
})(({ isSigned, isCompleted, isProcessing, isActive, theme }) => ({
    display: "block",
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
    fontSize: "14px",
    color: isSigned 
      ? "#54C977" 
      : (isCompleted 
          ? "#54C977" 
          : (isProcessing 
              ? "#FFC85B" 
              : (isActive ? "#0062AD" : theme.palette.text.primary)))
  })
)
export const StyleStepperMoreUser = styled(StyleStepperUser)(
    ({theme}) => ({
        cursor: 'pointer',
        color: theme.palette.primary.main,
    })
)
