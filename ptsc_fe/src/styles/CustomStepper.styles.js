import { styled } from "@mui/material/styles";
import { Box, Step, StepLabel, Typography } from "@mui/material";
import { MarginControlBox } from "./ThemeConfig.styles";

export const InteractiveStep = styled(Step, {
  shouldForwardProp: (prop) => prop !== "visualVariant",
})(({ theme, visualVariant }) => ({
  position: "relative",
  "&:hover": { cursor: "pointer" },
  padding: theme.spacing(1),
  marginBottom: theme.spacing(3.125),
  ...(visualVariant === "bpmnEdit" && {
    marginBottom: 0,
    padding: theme.spacing(0.8, 0.4),
  }),
  // marginBottom: !alternativeLabel ? theme.spacing(3.125) : "unset",
  [theme.breakpoints.down(768)]: {
    padding: 0,
    border: "none",
  },
}));

export const InteractiveStepLabel = styled(StepLabel, {
  shouldForwardProp: (prop) =>
    ![
      "isActive",
      "alternativeLabel",
      "canSelect",
      "isCompleted",
      "visualVariant",
      "isCurrentStep",
    ].includes(prop),
})(
  ({
    theme,
    alternativeLabel,
    canSelect,
    isCompleted,
    isActive,
    visualVariant,
    isCurrentStep,
  }) => {
    if (visualVariant === "bpmnEdit") {
      const inactiveLabelColor =
        theme.palette.mode === "dark" ? theme.palette.text.secondary : "#575E6B";

      return {
        "&:hover": { cursor: "pointer" },
        pointerEvents: "auto",
        "& .MuiStepLabel-iconContainer": {
          padding: 0,
          marginRight: 0,
        },
        "& .MuiStepLabel-labelContainer": {
          marginTop: theme.spacing(1),
          [theme.breakpoints.down(768)]: {
            display: "none",
          },
        },
        "& .MuiStepLabel-label": {
          marginTop: 0,
          textAlign: "center",
          whiteSpace: "nowrap",
          fontSize: "0.95rem",
          fontWeight: isCurrentStep ? 600 : 500,
          color: isCurrentStep ? theme.palette.primary.main : inactiveLabelColor,
        },
      };
    }

    // Calculate values by state to avoid duplicate object keys
    // Duplicate keys in object literals will be overwritten.
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

      // Circle border via box-shadow to avoid MUI default focus ring conflicts.
      "& .MuiStepLabel-iconContainer": {
        padding: 0,
        borderRadius: "50%",
        boxShadow: iconBoxShadow,
      },

      // MUI StepIcon uses currentColor for the circle fill.
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

      // Step number text
      "& .MuiStepIcon-root .MuiStepIcon-text": { fill: textFill },

      // Step label text styles; keep selector specific to avoid overrides.
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
        // Use shorter selector so we do not override colors defined above.
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
        // Use shorter selector so we do not override colors defined above.
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
  }
);

export const BpmnStepIconRoot = styled(Box, {
  shouldForwardProp: (prop) =>
    !["active", "completed", "disabled"].includes(prop),
})(({ theme, active, completed, disabled }) => {
  const borderColor = active
    ? theme.palette.primary.main
    : completed
    ? theme.palette.primary.main
    : theme.palette.divider;

  return {
    width: 42,
    height: 42,
    transform: "rotate(45deg)",
    borderRadius: 9,
    border: `2px solid ${borderColor}`,
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    opacity: disabled ? 0.6 : 1,
  };
});

export const BpmnStepIconCircle = styled(Box, {
  shouldForwardProp: (prop) =>
    !["active", "completed", "disabled"].includes(prop),
})(({ theme, active, completed, disabled }) => {
  const circleColor = active
    ? theme.palette.primary.main
    : completed
    ? theme.palette.primary.main
    : theme.palette.mode === "dark"
    ? theme.palette.action.disabled
    : "#919191";

  return {
    width: 28,
    height: 28,
    borderRadius: "50%",
    backgroundColor: circleColor,
    color: theme.palette.primary.contrastText,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: "rotate(-45deg)",
    fontSize: "0.9rem",
    fontWeight: 600,
    lineHeight: 1,
    opacity: disabled ? 0.8 : 1,
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

export const StyleStepperContainer = styled(MarginControlBox, {
  shouldForwardProp: (prop) => prop !== "visualVariant",
})(({ theme, selectedUsersByStep, alternativeLabel, visualVariant }) => ({
  width: "unset",
  position: "relative",
  paddingBottom:
    Object.keys(selectedUsersByStep).length > 0 && !alternativeLabel ? "20px" : 0,
  ...(visualVariant === "bpmnEdit" && {
    "& .MuiStepper-root": {
      alignItems: "flex-start",
    },
    "& .MuiStepConnector-root": {
      top: 22,
      left: "calc(-50% + 21px)",
      right: "calc(50% + 21px)",
    },
    "& .MuiStepConnector-line": {
      borderTopStyle: "dashed",
      borderTopWidth: 2,
      borderColor: theme.palette.divider,
      width: 46,
      marginLeft: "auto",
      marginRight: "auto",
    },
    "& .MuiStepConnector-root.Mui-active .MuiStepConnector-line, & .MuiStepConnector-root.Mui-completed .MuiStepConnector-line":
      {
        borderColor: theme.palette.divider,
      },
    [theme.breakpoints.down(768)]: {
      "& .MuiStepConnector-root": {
        display: "none",
      },
    },
  }),
}));

export const StyleStepperUserContainer = styled(MarginControlBox)(
  ({ theme }) => ({
    width: "unset",
    maxWidth: "220px",
    minWidth: 0,
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    marginTop: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(0.5),
    zIndex: 1,
    whiteSpace: "nowrap",
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

export const StyleStepperUser = styled("span")(
  () => ({
    display: "block",
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "center",
    fontSize: "14px",
  })
);
export const StyleStepperMoreUser = styled(StyleStepperUser)(({ theme }) => ({
  cursor: "pointer",
  color: theme.palette.primary.main,
}));
