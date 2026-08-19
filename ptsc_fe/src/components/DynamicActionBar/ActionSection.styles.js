import { styled } from "@mui/material/styles";
import { Box, Popover, IconButton, Typography, Button, Dialog, ToggleButtonGroup } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';

export const ActionContainer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
});

export const ActionWrapper = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5), // Giảm gap mặc định
  [theme.breakpoints.down(768)]: {
    gap: theme.spacing(0.5), // Giảm gap đáng kể trên màn hình nhỏ
  },
}));

export const ButtonWrapper = styled(Box)({
  position: "relative",
  display: "inline-flex",
});

export const ConfigIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isopen",
})(({ theme, isopen }) => ({
  position: "absolute",
  top: -15,
  right: -15,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  transition: "transform 0.3s ease",
  color: theme.palette.text.secondary,
  transform: isopen ? "rotate(30deg)" : "rotate(0deg)",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const ConfigPopover = styled(Popover)({});

export const PopoverContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(2),
  minWidth: 200,
}));

export const PopoverSection = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

export const StyledTypography = styled(Typography)({});
// export const StyledActionButton = styled(Button)(({iscolor}) => ({
//   color: iscolor,
// }))
export const StyledActionButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "styleColor",
})(({ theme, styleColor }) => {
  const finalStyles = {
    minWidth: 30,
    height: 30,
    padding: 0,
  };

  // Apply color styles only if styleColor is provided
  if (styleColor && theme.palette[styleColor]) {
    finalStyles.backgroundColor = theme.palette[styleColor].main;
    finalStyles.color = theme.palette[styleColor].contrastText;
    finalStyles["&:hover"] = {
      backgroundColor: theme.palette[styleColor].dark,
    };
  }
  return finalStyles;
});


export const ActionSettingsIcon = styled(SettingsIcon)({
  fontSize: "small"
});

export const StyledActionDialog = styled(Dialog)({
  //  maxWidth: "sm"
});

export const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => {
  const buttonHeight = theme.components?.MuiOutlinedInput?.styleOverrides?.root?.height || 40;
  
  return {
    marginLeft: 15,
    height: buttonHeight,
    '& .MuiToggleButton-root': {
      width: buttonHeight,
      height: buttonHeight,
      padding: 0,
      border: `1px solid ${theme.palette.divider}`,
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      },
    },
  };
});
