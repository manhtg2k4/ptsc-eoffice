import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

export const PopupBuilderContainer = styled(Box)({
  display: "flex",
});

export const SidebarContainer = styled(Box)({
  minWidth: "15%",
});

export const CanvasWrapper = styled(Box)(({ theme }) => ({
  width: "85%",
  display: "flex",
  height: "93vh",
  overflow: "auto",
  paddingBottom: theme.spacing(2),
}));