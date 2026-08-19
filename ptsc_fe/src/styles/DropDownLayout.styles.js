import { styled } from "@mui/material/styles";
import { Box, Typography, IconButton, Select } from "@mui/material";

export const HeaderContentBox = styled(Box)({
  display: "flex",
  alignItems: "center",
});

// For ContentType component
export const SelectedContentTypeTypography = styled(Typography)(() => ({
  color: "#3c4858",
  fontWeight: 600,
  fontSize: 20,
  display: "inline-block",
}));

// For DropDownLayout component
export const LayoutWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "maxHeight",
})(({ theme, maxHeight }) => ({
  maxHeight: maxHeight,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

export const HeaderBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isMobile",
})(({ theme, isMobile }) => ({
  display: isMobile ? "block" : "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1.5),
  cursor: "pointer",
  width: "100%",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const ToggleIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const StyledSelect = styled(Select)(({ theme }) => ({
  minWidth: 150,
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 0.75,
  padding: theme.spacing(0.375),
}));

export const ContentWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "autoScroll",
})(({ theme, autoScroll }) => ({
  marginTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  overflow: autoScroll ? "auto" : "visible",
}));
