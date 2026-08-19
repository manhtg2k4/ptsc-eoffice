import { styled } from "@mui/material/styles";
import { Button, IconButton } from "@mui/material";
import { SkyBox, SkyGrid } from "@styles/SkyStyles";

export const DialogContainer = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  height: "80vh",
  "& .MuiDialogContent-root": {
    padding: "16px 20px 12px",
  },
  "& .MuiDialogActions-root": {
    padding: "0 20px 20px",
  },
}));

export const DialogGrid = styled(SkyGrid)(({ theme }) => ({
  height: "100%",
  border: `1px solid ${theme.palette.divider}`,
  overflow: "hidden",
  "& > .MuiGrid-item": {
    minWidth: 0,
    display: "flex",
  },
}));

export const LeftPanel = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#d9e2ec'}`,
  borderRadius: "8px",
  overflow: "hidden",
  minWidth: 0,
  width: "100%",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#fff",
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

export const RightPanel = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.divider : '#d9e2ec'}`,
  borderRadius: "8px",
  overflow: "hidden",
  minWidth: 0,
  width: "100%",
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : "#fff",
  height: "100%",
  display: "flex",
  flexDirection: "column",
}));

export const PanelHeader = styled(SkyBox)({
  marginBottom: "16px",
});

export const ResultBox = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
});

export const ResultItem = styled(SkyBox)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
});

export const CloseIconButton = styled(IconButton)({
  color: "red",
  fontWeight: "bold",
});

export const SearchButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  minWidth: "auto",
  padding: "8px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyledButton = styled(Button)(({ theme, color }) => ({
  backgroundColor:
    color === "primary" ? theme.palette.success.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "primary"
        ? theme.palette.success.dark
        : theme.palette.error.dark,
  },
}));
