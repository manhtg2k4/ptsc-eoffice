import { Box, styled } from "@mui/material";
import { DynamicButton } from "@styles/DynamicTableCustom";

export const AddButtonContainer = styled(Box)(({ theme }) => ({
  margin: theme.spacing(1),
}));

export const AddRowButton = styled(DynamicButton)(({ theme }) => ({
  // Áp dụng các style tương đương với variant="contained" và color="primary"
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));
