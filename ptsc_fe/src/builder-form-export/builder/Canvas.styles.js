import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";

export const CanvasContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  justifyItems: "space-between",
  width: "100%",
});

export const CanvasArea = styled(Box)({
  flex: 1,
  minHeight: 400,
  width: "100%",
  overflow: "auto",
});

export const EmptyCanvasBox = styled(Box)(({ theme }) => ({
  border: `1px dashed ${theme.palette.divider}`,
  padding: theme.spacing(4),
  textAlign: "center",
  backgroundColor: theme.palette.grey[50],
  color: theme.palette.text.disabled,
  fontStyle: "italic",
  transition: "all 0.3s ease",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 150,
  height: "100%",
}));

export const StyledAddIcon = styled(AddBoxOutlinedIcon)(({ theme }) => ({
  fontSize: 40,
  marginBottom: theme.spacing(1),
  opacity: 0.6,
}));