import { Box, Button, Grid, IconButton, Table, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { SkyBox } from "./SkyStyles";

export const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

export const FormContainerGeneralInformation = styled(SkyBox)(() => ({
  // paddingTop: theme.spacing(1.25),
}));

export const StyledGridContainer = styled(Grid)(({ theme }) => ({
  // Áp dụng spacing tương đương spacing={2}
  margin: theme.spacing(-1),
  width: `calc(100% + ${theme.spacing(2)})`,
}));

export const AddRowButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  textTransform: "none", // Tương đương variant="text"
}));

export const SmallTable = styled(Table)({
  // Tương đương size="small"
  "& .MuiTableCell-root": {
    padding: "6px 16px",
  },
});

export const SmallTextField = styled(TextField)({
  // Tương đương size="small"
  // Chiều cao sẽ được quản lý bởi theme
});

export const ErrorIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const StyledGridItem = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: {
    flexBasis: "100%",
    maxWidth: "100%",
  },
  [theme.breakpoints.up("sm")]: {
    flexBasis: "25%",
    maxWidth: "25%",
  },
  padding: theme.spacing(1),
}));

export const FullWidthGridItem = styled(Grid)(({ theme, styleMaxWidth }) => ({
  flexBasis: "100%",
  maxWidth: styleMaxWidth || "100%",
  padding: theme.spacing(1),
}));
