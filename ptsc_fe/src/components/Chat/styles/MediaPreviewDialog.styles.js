import { styled } from "@mui/material/styles";
import { Box, IconButton, Dialog } from "@mui/material";

/* ================= Dialog ================= */

export const PreviewDialog = styled(Dialog)(() => ({
  "& .MuiPaper-root": {
    backgroundColor: "rgba(0,0,0,0.96)",
    color: "#fff",
  },
  zIndex:1000000,
}));

/* ================= Top bar ================= */

export const TopBar = styled(Box)(() => ({
  height: 56,
  padding: "0 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
}));

export const TopBarLeft = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
}));

export const TopBarRight = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: 4,
}));

export const WhiteIconButton = styled(IconButton)(() => ({
  color: "#fff",
}));

/* ================= Main ================= */

export const MainArea = styled(Box)(() => ({
  position: "relative",
  height: "calc(100vh - 56px - 92px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
}));

export const NavButtonLeft = styled(IconButton)(() => ({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#fff",
  backgroundColor: "rgba(255,255,255,0.08)",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  left:10,
}));
export const NavButtonRight = styled(IconButton)(() => ({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  color: "#fff",
  backgroundColor: "rgba(255,255,255,0.08)",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  right:10,
}));
export const MediaContainer = styled(Box)(() => ({
  width: "100%",
  height: "100%",
  overflow: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 16px",
}));

export const PreviewImage = styled("img")(({ $zoom }) => ({
  maxWidth: "100%",
  maxHeight: "100%",
  transform: `scale(${$zoom})`,
  transformOrigin: "center center",
  borderRadius: 12,
  userSelect: "none",
}));

export const PreviewVideo = styled("video")(() => ({
  maxWidth: "100%",
  maxHeight: "100%",
  borderRadius: 12,
}));

/* ================= Thumbnails ================= */

export const ThumbsBar = styled(Box)(() => ({
  height: 92,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  padding: "0 8px",
  overflowX: "auto",
  gap: 8,
}));

export const ThumbItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== "$active",
})(({ $active }) => ({
  width: 72,
  height: 72,
  flexShrink: 0,
  borderRadius: 8,
  overflow: "hidden",
  cursor: "pointer",
  outline: $active
    ? "2px solid rgba(255,255,255,0.9)"
    : "1px solid rgba(255,255,255,0.12)",
  position: "relative",
  opacity: $active ? 1 : 0.75,
}));

export const ThumbImage = styled("img")(() => ({
  width: "100%",
  height: "100%",
  objectFit: "cover",
}));

export const VideoThumb = styled(Box)(() => ({
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
}));
