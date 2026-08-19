import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  styled,
} from "@mui/material";
import { DynamicButton, DynamicTableCell } from "@styles/DynamicTableCustom";

export const IndexCell = styled(DynamicTableCell)(() => ({
  width: "5%",
  textAlign: "center",
}));

export const DefaultInputCell = styled(DynamicTableCell)(() => ({
  width: "23.75%",
  "& .MuiInputBase-input": {
    fontSize: "0.8rem",
  },
}));

export const ActionsCell = styled(DynamicTableCell)(({ theme }) => ({
  width: "23.75%",
  padding: theme.spacing(1),
  textAlign: "center",
}));

export const AdvancedOptionsCell = styled(DynamicTableCell)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.tableOdd,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const FieldContainer = styled(Box)({
  width: "100%",
});

export const ChipContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.5),
  flexWrap: "nowrap",
}));

export const ActionsContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const EnumDialogErrorBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
  backgroundColor: "rgba(214, 11, 11, 0.1)",
  color: theme.palette.error.dark,
  borderRadius: theme.shape.borderRadius,
  fontSize: theme.typography.body2.fontSize,
}));

export const EnumItemContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  alignItems: "flex-start",
  marginBottom: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const ErrorIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));

export const ErrorDynamicButton = styled(DynamicButton, {
  shouldForwardProp: (prop) => prop !== "dangerFilled",
})(({ theme, dangerFilled = false }) => ({
  ...(dangerFilled
    ? {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        "& .MuiSvgIcon-root": {
          color: "inherit",
        },
        "&:hover": {
          backgroundColor: theme.palette.error.dark,
        },
      }
    : {
        color: theme.palette.error.main,
      }),
}));

export const SuccessDynamicButton = styled(DynamicButton)(({ theme }) => ({
  backgroundColor: theme.palette.success.main,
  color: theme.palette.success.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.success.dark,
  },
}));

export const EnumManagementDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    // Tương đương maxWidth="sm"
    maxWidth: theme.breakpoints.values.sm,
  },
}));

export const DialogActionButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "isPrimary" && prop !== "isError" && prop !== "isCancel",
})(({ theme, isPrimary, isError, isCancel }) => ({
  ...(isPrimary && {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
  }),
  ...(!isPrimary && !isCancel && {
    color: theme.palette.text.primary,
  }),
  ...(isError && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  }),
  ...(isCancel && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  }),
}));

export const EnumItemTextField = styled(TextField)({
  width: "100%",
  "& .MuiInputBase-root": {
    height: "40px", // Tương đương size="small"
  },
});

export const AddValueButton = styled(Button)({
  textTransform: "none",
});

export const AddValueGrid = styled(Grid)({
  alignItems: "center",
});

export const AddGrid = styled(Grid)({
  mt: 1,
});
// Styled Grid items for advanced options
export const FormFieldGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: { flexBasis: "100%", maxWidth: "100%" },
  [theme.breakpoints.up("sm")]: { flexBasis: "50%", maxWidth: "50%" },
  [theme.breakpoints.up("md")]: { flexBasis: "25%", maxWidth: "25%" },
}));

export const FormFieldGridHalf = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: { flexBasis: "100%", maxWidth: "100%" },
  [theme.breakpoints.up("sm")]: { flexBasis: "50%", maxWidth: "50%" },
  [theme.breakpoints.up("md")]: {
    flexBasis: "20.833333%",
    maxWidth: "20.833333%",
  }, // md={2.5}
}));

export const FormFieldGridSmall = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: { flexBasis: "100%", maxWidth: "100%" },
  [theme.breakpoints.up("sm")]: { flexBasis: "50%", maxWidth: "50%" },
  [theme.breakpoints.up("md")]: {
    flexBasis: "16.666667%",
    maxWidth: "16.666667%",
  }, // md={2}
}));

export const CheckboxGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: { flexBasis: "50%", maxWidth: "50%" },
  [theme.breakpoints.up("sm")]: {
    flexBasis: "33.333333%",
    maxWidth: "33.333333%",
  },
  [theme.breakpoints.up("md")]: {
    flexBasis: "auto",
    maxWidth: "none",
    flexGrow: 1,
  },
}));

export const MarginSettingGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.up("xs")]: { flexBasis: "25%", maxWidth: "25%" }, // xs={3}
  [theme.breakpoints.up("sm")]: {
    flexBasis: "33.333333%",
    maxWidth: "33.333333%",
  }, // sm={4}
}));

export const StyledDialogTitleDynamicRow = styled(DialogTitle)(() => ({
	display: 'flex',
	justifyContent: 'space-between',
	alignItems: 'center',
	gap: 2,
}));
