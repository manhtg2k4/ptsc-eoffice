import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";
import { StyledButton } from "@styles/CustomTable.styles";

export const MainContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const SubtabContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  marginBottom: theme.spacing(1),
  display: show ? "flex" : "none",
  width: "100%",
  alignItems: "center",
  justifyContent: "flex-start",
}));

export const SearchContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  marginBottom: theme.spacing(1),
  display: show ? "flex" : "none",
  width: "100%",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: theme.spacing(1),
}));

export const SearchContent = styled(Box)(({ theme }) => ({
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const ActionsContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: "flex",
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing(1),
}));

export const PaginationContent = styled(Box)(({ theme }) => ({
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const ActionButtonsContent = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const DeleteMultiButton = styled(StyledButton)(({ theme }) => ({
  marginLeft: theme.spacing(1.5),
  color: 'error'
}));

export const TableContent = styled(Box)(({ theme }) => ({
  minHeight: 120,
  borderRadius: theme.shape.borderRadius,
}));

export const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isBuilder",
})(({ theme, isBuilder }) => ({
  display: "flex",
  alignItems: "center",
  // minHeight: 70,
  // justifyContent: "flex-end",
  minHeight: 120, justifyContent: 'center',
  border: isBuilder ? `2px dashed ${theme.palette.primary.main}` : "none",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: isBuilder ? "transparent" : "inherit",
}));

export const ChildWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isBuilder" && prop !== "isFlex",
})(({ isBuilder, isFlex }) => ({
  display: "flex",
  alignItems: "center",
  minHeight: 32,
  position: "relative",
  cursor: isBuilder ? "grab" : "default",
  flex: isFlex,
}));