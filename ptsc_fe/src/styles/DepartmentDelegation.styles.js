import { styled, Avatar, Tooltip, Box, List, ListItem, alpha, InputAdornment } from "@mui/material";
import { 
  SkyTableCell, 
  SkyTableHead, 
  SkyTableRow,
  SkyBox, 
  SkyTypography,
  SkyDialog,
  SkyTextField,
} from "./SkyStyles";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
 import { AddOutlined,   DeleteOutline, EditOutlined } from "@mui/icons-material";

// Table Styles
export const DelegationTableHead = styled(SkyTableHead)(({ theme }) => {
  const headerBg = theme.components?.MuiTableHead?.styleOverrides?.root?.backgroundColor || 
                   (theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff');
  return {
    backgroundColor: headerBg,
    '& .MuiTableCell-root': {
      backgroundColor: headerBg,
      color: theme.palette.text.secondary,
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '0.05em',
      padding: theme.spacing(2, 1.5),
      borderBottom: `2px solid ${theme.palette.divider}`,
    }
  };
});

export const StyledTableRow = styled(SkyTableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette?.table?.rowOdd || 
                     (theme.palette.mode === "dark" ? "#2c3e50" : "#f4f6f8"),
  },
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette?.table?.rowEven || 
                     (theme.palette.mode === "dark" ? "#0f172a" : "#f9fafb"),
  },
  '&:hover': {
    backgroundColor: `${theme.palette.action.hover} !important`,
  },
}));

export const BoldTableCell = styled(SkyTableCell)({
  fontWeight: 'bold',
  backgroundColor: 'inherit',
});

export const STTTableCell = styled(SkyTableCell)({
  width: 80,
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: 'inherit',
});

export const AssigneeTableCell = styled(SkyTableCell)({
  width: 300,
  fontWeight: 'bold',
  backgroundColor: 'inherit',
});

export const ActionsTableCell = styled(SkyTableCell)({
  width: 120,
  textAlign: 'center',
  backgroundColor: 'inherit',
});

export const UserAvatar = styled(Avatar)(({ theme }) => ({
  width: 32,
  height: 32,
  backgroundColor: theme.palette.primary.main,
  fontSize: '14px',
}));

export const EmptyAssigneeText = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontStyle: 'italic',
  fontSize: '14px',
}));

export const UserNameText = styled(SkyTypography)({
  fontSize: '14px',
  fontWeight: 600,
});

export const UserTitleText = styled(SkyTypography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
}));

export const ActionsContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
});

// Modal Styles
export const StyledDialog = styled(SkyDialog)({
  "& .MuiDialog-paper": {
    maxWidth: "600px",
    width: "100%",
  },
});

export const SearchField = styled(SkyTextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(1),
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: theme.palette.background.paper
  }
}));

export const EmployeeList = styled(List)({
  paddingTop: 0,
});

export const EmployeeListItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'isSelected',
})(({ theme, isSelected }) => ({
  marginBottom: theme.spacing(1),
  borderRadius: '12px',
  border: '1px solid',
  borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
  backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
  '&:hover': {
    backgroundColor: isSelected ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.action.active, 0.04),
  },
  transition: 'all 0.2s',
  padding: '12px 16px'
}));

export const EmployeeAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== 'isSelected',
})(({ theme, isSelected }) => ({
  backgroundColor: isSelected ? theme.palette.primary.main : theme.palette.grey[300],
}));

export const SkyTooltip = styled(Tooltip)(() => ({
  // Inherit default Tooltip
}));

export const StyledSearchIcon = styled(SearchIcon)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontSize: '20px'
}));

export const StyledCheckCircleIcon = styled(CheckCircleIcon)(({ theme }) => ({
  color: theme.palette.primary.main
}));

export const BlueEditIcon = styled(EditOutlined)(({theme}) => ({
  color: theme.palette.primary.main,
 
}));

export const BlueAddIcon = styled(AddOutlined)(({theme}) => ({
  color: theme.palette.primary.main,
 
}));

export const RedDeleteIcon = styled(DeleteOutline)(() => ({
  color: 'red',
 
}));

export const PageContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(4),
}));

export const HeaderContainer = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

export const StyledInputAdornment = styled(InputAdornment, {
  shouldForwardProp: (prop) => prop !== 'adornmentPosition'
})(({ adornmentPosition }) => ({
  marginRight: adornmentPosition === 'start' ? '8px' : '0',
  marginLeft: adornmentPosition === 'end' ? '8px' : '0',
}));

export const SecondaryTypography = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));
