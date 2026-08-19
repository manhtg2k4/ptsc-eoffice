import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

export const TableBuilderContainer = styled(Box)({
  display: "flex",
});

export const SidebarContainer = styled(Box)({
  minWidth: "15%",
});

export const CanvasWrapper = styled(Box)(({ theme }) => ({
  width: "85%",
  display: "flex",
  flexDirection: "column",
  height: "93vh",
  overflowY: "auto",
  paddingBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.default,

}));