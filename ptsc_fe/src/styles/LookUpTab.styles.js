import { Box, Button, Paper, Grid } from "@mui/material";
import { styled } from "@mui/material/styles";

export const SearchContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[1],
}));

export const SearchButton = styled(Button)(({ theme }) => ({
  height: theme.spacing(5),
  minWidth: theme.spacing(15),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  textTransform: "none",
  fontSize: theme.typography.pxToRem(14),
  fontWeight: theme.typography.fontWeightMedium,
  borderRadius: theme.shape.borderRadius,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const ButtonContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "center",
  marginTop: theme.spacing(2.5),
  gap: theme.spacing(1.5),
}));

export const FormGrid = styled(Grid)({
  // Container grid không cần style đặc biệt
});

// Grid item cho ô tìm kiếm đầu tiên (rộng hơn)
export const GridItemLarge = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: {
    flexBasis: "100%",
    maxWidth: "100%",
  },
  [theme.breakpoints.up("md")]: {
    flexBasis: "25%",
    maxWidth: "25%",
  },
}));

// Grid item cho các ô còn lại (nhỏ hơn)
export const GridItemSmall = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: {
    flexBasis: "100%",
    maxWidth: "100%",
  },
  [theme.breakpoints.up("md")]: {
    flexBasis: "18.75%",
    maxWidth: "18.75%",
  },
}));
