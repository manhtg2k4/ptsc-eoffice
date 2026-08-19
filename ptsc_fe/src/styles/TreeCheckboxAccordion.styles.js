import { styled } from "@mui/material/styles";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  ListItem,
} from "@mui/material";

// Accordion tổng
export const StyledAccordion = styled(Accordion)({
  boxShadow: "none",
  "&::before": { display: "none" },
  borderBottom: "1px solid #e0e0e0",
});

// AccordionSummary (Header)
export const StyledAccordionSummary = styled(AccordionSummary)({
  display: "flex",
  alignItems: "center",
  padding: 0,
  cursor: "pointer",
  "& .MuiFormControlLabel-root": {
    marginRight: "16px",
  },
});

// AccordionDetails (Chi tiết bên trong)
export const StyledAccordionDetails = styled(AccordionDetails)({
  paddingLeft: "32px",
});

// Hộp tiêu đề
export const StyledTitleBox = styled(Box)({
  flexGrow: 1,
  padding: "8px 0 8px 16px",
});

// ListItem con bên trong
export const StyledListItem = styled(ListItem)({
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
});
