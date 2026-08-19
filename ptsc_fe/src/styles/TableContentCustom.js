import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import Tab from "@mui/material/Tab";

export const WrapperTabCustom = styled(Box)(() => ({
  marginTop: 20,
}));

export const TabCustom = styled(Tab)(({ theme }) => ({
  "&.Mui-selected": {
    backgroundColor: theme.palette.action.selected,
    borderRadius: "5px",
    color: theme.palette.text.primary,
  },
  fontWeight: "bold",
  // border: '1px solid red'
}));

export const BoxTabCustom = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
}));
