import { styled } from "@mui/material/styles";
import { Box, RadioGroup, FormControlLabel } from "@mui/material";

export const FilterCalendarContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "20px",
  padding: "4px 16px",
  height: 40,
  marginLeft: theme.spacing(1),
  marginTop: 8,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  [theme.breakpoints.down("md")]: {
    marginLeft: 0,
    width: "100%",
    overflowX: "auto",
    whiteSpace: "nowrap",
  },
}));

export const StyledRadioGroup = styled(RadioGroup)({
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: "16px",
});

export const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  "& .MuiFormControlLabel-label": {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: theme.palette.text.primary,
    marginLeft: "4px",
  },
  "& .MuiRadio-root": {
    padding: "4px",
    "&.Mui-checked": {
      color: theme.palette.primary.main,
    },
  },
}));

export const CountText = styled("span")(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginLeft: "4px",
  fontSize: "0.75rem",
}));
