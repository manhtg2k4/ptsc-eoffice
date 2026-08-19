import { styled } from "@mui/material/styles";
import {
  Box,
  Paper,
  Grid,
  Stack,
  Divider,
  Toolbar,
  Button,
  IconButton,
  Typography,
  TextField,
  Select,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Radio,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  RadioGroup,
  Autocomplete,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
  List,
  ListItem,
  Tooltip,
  Pagination,
  InputAdornment,
  FormControl,
  SvgIcon,
  ClickAwayListener,
  FormLabel,
  Link,
  Alert,
  CircularProgress,
  Collapse
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// ==========================================
// Layout & Containers
// ==========================================

export const SkyBox = styled(Box)(() => ({
  // Inherits default Box behavior
}));

export const SkyFlexGap8 = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const SkyFlexGap16 = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

export const SkyPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  width: "100%",
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  backgroundColor: theme.palette.background.paper,
}));

export const SkyGrid = styled(Grid)(() => ({
  // Inherits default Grid behavior
}));

export const SkyStack = styled(Stack)(() => ({
  // Inherits default Stack behavior
}));
export const SkyLink = styled(Link)(() => ({
  // Inherits default Link behavior
}));

export const SkyDivider = styled(Divider)(({ theme }) => ({
  margin: theme.spacing(2, 0),
  borderColor: theme.palette.divider,
}));

export const SkyToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: "0 !important",
  padding: theme.spacing(1, 0),
}));

// ==========================================
// Buttons
// ==========================================

export const SkyButton = styled(Button)(() => ({
  textTransform: "none",
  borderRadius: "6px",
  fontWeight: 600,
}));

export const SkySubmitButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const SkyCancelButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const SkyIconButton = styled(IconButton)(({theme}) => ({
  color : theme.palette.primary.main,
  // Inherits default IconButton behavior
}));

export const SkyClickAwayListener = styled(ClickAwayListener)(() => ({
  // Inherits default ClickAwayListener behavior
}));

// ==========================================
// Typography
// ==========================================

export const SkyTypography = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "isTextAlign" && prop !== "styledMarginBottom",
})(({ theme, isTextAlign }) => ({
	color: theme.palette.text.primary,
	textAlign: isTextAlign ? "center" : "unset",
}));

export const SkyTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "1.4rem",
  marginBottom: theme.spacing(1),
}));

export const SkySectionTitle = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

// ==========================================
// Form & Inputs
// ==========================================

export const SkyTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "16px",
  },
  "& .MuiInputBase-input": {
    fontSize: "16px",
  },
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

export const SkyFieldLabel = styled(SkyTypography)(({ theme, styledMarginBottom }) => ({
  fontSize: "16px",
  fontWeight: 500,
  marginBottom:
    styledMarginBottom !== undefined ? styledMarginBottom : theme.spacing(1),
  "& .required": {
    color: theme.palette.error.main,
    marginLeft: "4px",
  },
}));

export const SkyErrorText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: "12px",
  marginTop: "4px",
}));

export const SkyHiddenInput = styled("input")({
  display: "none",
});

export const SkySelect = styled(Select)(() => ({
  borderRadius: "6px",
  minWidth: 120,
  fontSize: "16px",
}));

export const SkyInputLabel = styled(InputLabel)(() => ({
  // Inherits default InputLabel behavior
}));

export const SkyFormControlLabel = styled(FormControlLabel)(() => ({
  marginLeft: 0,
}));

export const SkyCheckbox = styled(Checkbox)(({ theme }) => ({
  color: theme.palette.text.secondary,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
}));

export const SkyRadio = styled(Radio)(({ theme }) => ({
  color: theme.palette.text.secondary,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
}));

export const SkyRadioGroup = styled(RadioGroup)(() => ({
  // Inherits default RadioGroup behavior
}));

export const SkyChip = styled(Chip)(() => ({
  borderRadius: "6px",
 
}));

// ==========================================
// Data Display (Tables)
// ==========================================

export const SkyTableContainer = styled(TableContainer)(({ theme }) => ({
  width: "100%",
  overflowX: "auto",
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
}));

export const SkyTable = styled(Table)(() => ({
  minWidth: 650,
}));

export const SkyTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
}));

export const SkyTableBody = styled(TableBody)(() => ({
  // Inherits default TableBody behavior
}));

export const SkyTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

export const SkyTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderColor: theme.palette.divider,
  backgroundColor: 'inherit',
}));

// ==========================================
// Feedback & Overlays (Dialogs)
// ==========================================

export const SkyAlert = styled(Alert)(() => ({
  width: "100%",
}));

export const SkyCircularProgress = styled(CircularProgress)(() => ({}));

export const SkyCollapse = styled(Collapse)(() => ({}));

export const SkyDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: "12px",
    padding: theme.spacing(1),
  },
}));

export const SkyDialogTitle = styled(DialogTitle)(() => ({
  fontWeight: "bold",
  fontSize: "1.25rem",
}));

export const SkyDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
}));

export const SkyDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
  justifyContent: "flex-end",
  gap: theme.spacing(1),
}));

// ==========================================
// Menus
// ==========================================

export const SkyMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: "8px",
    boxShadow: theme.shadows[3],
  },
}));

export const SkyMenuItem = styled(MenuItem)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SkyListItemIcon = styled(ListItemIcon)(({ theme }) => ({
  minWidth: "auto",
  marginRight: theme.spacing(1.5),
  color: theme.palette.primary.main,
}));

export const SkyListItemText = styled(ListItemText)(() => ({
  // Inherits default ListItemText behavior
}));

export const SkyAutocomplete = styled(Autocomplete)(({ theme }) => ({
  "& .MuiAutocomplete-inputRoot": {
    flexWrap: "wrap",
    height: "auto",

    "& .MuiAutocomplete-input": {
      fontSize: "16px",
      width: 0,
      flexGrow: 1,
    },
    "&.Mui-disabled": {
      backgroundColor:
        theme.components?.MuiOutlinedInput?.styleOverrides?.root?.[
          "&.Mui-disabled"
        ]?.backgroundColor ||
        (theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.background.default),

      color:
        theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
          "&.Mui-disabled"
        ]?.color ||
        theme.palette.text.disabled,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.divider,
      },
    },
  },
  "& .MuiAutocomplete-tag": {
    margin: 0,
  },
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor:
      theme.components?.MuiOutlinedInput?.styleOverrides?.input?.[
        "&.Mui-disabled"
      ]?.color ||
      theme.palette.text.disabled,
  },
  // ✅ Không hiển thị border khi hover vào disabled input
  "&:hover .MuiAutocomplete-inputRoot.Mui-disabled .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
}));


export const SkyPopover = styled(Popover)(() => ({

}));

export const SkyList = styled(List)(() => ({

}));

export const SkyListItem = styled(ListItem)(() => ({

}));

export const SkyPagination = styled(Pagination)(() => ({

}));

export const SkyInputAdornment = styled(InputAdornment)(() => ({

}));

export const SkyFormControl = styled(FormControl)(() => ({

}));

export const SkyTooltip = styled(Tooltip)(() => ({

}));

export const SkyFormLabel = styled(FormLabel)(() => ({

}));

// ==========================================
// Media & Uploads
// ==========================================

export const SkyGridAlbumType = styled(SkyGrid)(() => ({
  paddingTop: "0px !important",
}));

export const SkyGridTopicContainer = styled(SkyGrid)(({ theme }) => ({
  marginTop: theme.spacing(0.75),
}));

export const SkyUploadArea = styled(SkyBox)(({ theme }) => ({
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : theme.palette.background.default,
  minHeight: "200px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SkyUploadIcon = styled(SkyBox)(({ theme }) => ({
  width: "48px",
  height: "48px",
  margin: "0 auto 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  backgroundColor:
    theme.palette.mode === "dark" ? theme.palette.action.selected : theme.palette.action.hover,
  "& svg": {
    fontSize: "24px",
    color: theme.palette.primary.main,
  },
}));

export const SkyUploadText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "16px",
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
}));

export const SkyUploadSubText = styled(SkyTypography)(({ theme }) => ({
  fontSize: "12px",
  color: theme.palette.text.disabled || theme.palette.text.secondary,
}));

export const SkyPreviewImage = styled(SkyBox)({
  width: "100%",
  maxHeight: "200px",
  objectFit: "contain",
  borderRadius: "8px",
});

export const SkyVideoPlayerBox = styled(SkyBox)(({ theme }) => ({
  width: "100%",
  marginTop: "16px",
  borderRadius: "8px",
  overflow: "hidden",
  backgroundColor: theme.palette.common.black,
  aspectRatio: "16/9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
}));

export const SkyDeleteMediaButton = styled(SkyIconButton)(({ theme }) => ({
  position: "absolute",
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  color: theme.palette.common.white,
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));

export const SkyMediaCaption = styled(SkyTypography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  display: "block",
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

export const SkyMediaFileName = styled(SkyTypography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  display: "block",
  textAlign: "center",
  fontSize: "12px",
  color: theme.palette.text.secondary,
}));

export const SkyLoadingBox = styled(SkyBox)({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px",
});

export const SkyRelativeBox = styled(SkyBox)({
  position: "relative",
});

export const SkyBlueSpan = styled("span")(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 500,
}));

 

export const SkySvgIcon = styled(SvgIcon)(() => ({
    
}));

export const SkyMenuIcon = styled(MenuIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

export const SkyEditIcon = styled(EditIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const SkyDeleteIcon = styled(DeleteIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const SkyAddIcon = styled(AddIcon)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
}));

export const SkyDeleteOutlineIcon = styled(DeleteOutlineIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));


export const BoxContainer = styled(Box)(() => ({
  width: "100%",
  height: "100%",
  overflowX: "hidden",
  overflowY: "hidden",
}));

// ==========================================
// Specialized Layouts (Errors, Session, Permissions)
// ==========================================

export const SkyErrorOverlay = styled(SkyBox)(() => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: "#f5f5f5",
  padding: "20px"
}));

export const SkyErrorCard = styled(SkyPaper)(({ theme }) => ({
  maxWidth: "550px",
  width: "100%",
  textAlign: "center",
  padding: `${theme.spacing(5)} !important`,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
}));

export const SkyFlexRowCenter = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1.25),
  justifyContent: "center",
  marginTop: theme.spacing(4),
}));

export const SkyErrorTitle = styled(SkyTitle)(({ theme }) => ({
  color: theme.palette.error.main,
  marginBottom: theme.spacing(2.5),
}));

export const SkyErrorDescription = styled(SkyTypography)(() => ({
  fontSize: "18px",
  lineHeight: "1.6",
  color: "#333",
}));
