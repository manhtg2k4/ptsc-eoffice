import { styled } from "@mui/material/styles";
import { Box, Typography, Divider } from "@mui/material";

/* Root */
export const PanelRoot = styled(Box)(() => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

/* Tabs */
export const TabsWrapper = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(1),
}));

export const TabsRow = styled(Box)(() => ({
  display: "flex",
  gap: 16,
  justifyContent:"space-between"
}));

export const TabItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "$active",
})(({ theme, $active }) => ({
  cursor: "pointer",
  fontWeight: $active ? 600 : 400,
  paddingBottom: 4,
  borderBottom: $active ? "2px solid" : "none",
  borderColor: theme.palette.primary.main,
}));

export const PanelDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));

/* Content */
export const ContentArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: "auto",
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));

/* Media */
export const MediaWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

export const MediaDate = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

export const MediaGrid = styled(Box)(() => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
}));

export const MediaItem = styled(Box)(({ theme }) => ({
  position: "relative",
  aspectRatio: "1 / 1",
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  cursor: "pointer",
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[900]
      : theme.palette.grey[200],
}));

export const MediaImage = styled("img")(() => ({
  width: "100%",
  height: "100%",
  objectFit: "cover",
}));

export const VideoOverlay = styled(Box)(() => ({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: "#fff",
  fontSize: 24,
}));

/* File & Link items */
export const ListItem = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

export const EmptyText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));


