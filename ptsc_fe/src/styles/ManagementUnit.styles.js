import { styled } from "@mui/material/styles";
import { AppBar, Box, Checkbox, Grid, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";

export const StyledAppBar = styled(AppBar)(({ isOpen }) => ({
  backgroundColor: "#fff",
  transition: "margin 0.3s ease, width 0.3s ease",
  width: `calc(100% - ${isOpen ? 240 : 60}px)`,
  marginLeft: isOpen ? "240px" : "60px",
  boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.1)",
}));

export const StyledDiv = styled(Box)(({ theme }) => ({
  width: "600px",
  marginLeft: "20px",
  [theme.breakpoints.down("md")]: {
    width: "100%",
    marginLeft: "0",
  },
}));

export const StyledDivDeital = styled(Box)(() => ({
  width: "100%",
}));

export const StyledExpand = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  [theme.breakpoints.down("sm")]: {
    fontSize: "0.9rem",
  },
}));

export const StyledGridUnit = styled(Box)(() => ({
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
}));

export const StyledTypography = styled(Typography)(() => ({
  fontWeight: "bold",
}));

export const RotatableIconButton = styled(ExpandMore)(({ open }) => ({
  transition: "transform 0.3s",
  transform: open ? "rotate(180deg)" : "rotate(0deg)",
}));

export const StyledGridUnitView = styled(Grid)(() => ({
  alignItems: "center",
  mb: 2,
}));

export const StyledCheckBox = styled(Checkbox)(() => ({
  color: "primary",
}));

export const StyledGridContainer = styled(Grid)(() => ({
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  marginTop: "10px",
}));
