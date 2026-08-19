import { Box, styled } from "@mui/material";
import {
  DynamicButton,
  DynamicTableCellHead,
} from "@styles/DynamicTableCustom";

export const RequiredAsterisk = styled("span")(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const StyledHeaderCell = styled(DynamicTableCellHead, {
  shouldForwardProp: (prop) => prop !== "headerText",
})(({ theme, headerText }) => ({
  width:
    headerText === "STT"
      ? theme.layout.dynamicTable.indexCellWidth
      : headerText === "Thao tác"
      ? theme.layout.dynamicTable.actionsCellWidth
      : "auto",
}));

export const NoDataCell = styled(DynamicTableCellHead)({
  textAlign: "center",
  fontStyle: "italic",
});

export const AddButtonContainer = styled(Box)(({ theme }) => ({
  margin: theme.spacing(1),
}));

export const AddRowButton = styled(DynamicButton)(({ theme }) => ({
  variant: "contained",
  backgroundColor: theme.palette.primary.main, // Tương đương color="primary"
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));
