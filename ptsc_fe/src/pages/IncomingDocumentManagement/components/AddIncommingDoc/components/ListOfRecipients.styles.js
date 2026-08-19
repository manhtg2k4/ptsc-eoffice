import {
  styled,
  Box,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  InputAdornment,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import SearchIcon from "@mui/icons-material/Search";

// Exporting components that are used directly in the main file
export {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  KeyboardArrowDown,
  KeyboardArrowUp,
  SearchIcon,
  InputAdornment,
};

export const ListContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

export const SearchField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  width: '400px',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    paddingLeft: '4px',
  },
  '& input::placeholder': {
    color: '#9e9e9e',
    opacity: 1,
  }
}));

export const HeaderBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1.5, 0),
  cursor: 'pointer',
  userSelect: 'none',
}));

export const HeaderTitleBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flexGrow: 1,
}));

export const HeaderTitle = styled(Typography)({
  fontWeight: 500,
});

export const ToggleIcon = styled(Box)(({ theme }) => ({
  fontSize: 20,
  color: theme.palette.primary.main,
}));

export const CountBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'count',
})(({ theme, count }) => ({
  backgroundColor: count > 0 ? theme.palette.primary.lighter : 'transparent',
  color: count > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
  fontWeight: 700,
  fontSize: '0.9rem',
  padding: theme.spacing(0.5, 1.5),
  borderRadius: theme.shape.borderRadius,
  minWidth: 80,
  textAlign: 'center',
}));

export const CollapseContent = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

export const Divider = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  margin: theme.spacing(2, 0),
}));

export const StyledTableHeadRow = styled(TableRow)(({ theme }) => ({ backgroundColor: theme.palette.action.hover }));

export const EmptyTableCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.text.disabled,
  padding: theme.spacing(6, 0),
}));

export const BoldTableCell = styled(TableCell)({
  fontWeight: "normal",
});

export const ActionLink = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  cursor: 'pointer',
  color: theme.palette.primary.main,
}));

export const StatusChipBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color',
})(({ theme, color }) => ({
  backgroundColor: `${color}22`,
  color,
  fontWeight: 600,
  fontSize: '0.8rem',
  padding: theme.spacing(0.4, 1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${color}44`,
  display: 'inline-block',
}));

export const SearchIconStyled = styled(SearchIcon)({
  color: '#555',
  fontSize: 20,
});

export const StyledTableCell = styled(TableCell, {
  shouldForwardProp: (prop) => prop !== 'width',
})(({ width }) => ({
  width: width,
  fontWeight: 'bold',
}));

export const StyledTableCell50 = styled(TableCell)(({ theme }) => ({
  width: 50,
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  backgroundColor: 'inherit',
}));
export const StyledTableCell260 = styled(TableCell)(({ theme }) => ({
  width: 220,
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  backgroundColor: 'inherit',
}));
export const StyledTableCell70 = styled(TableCell)(({ theme }) => ({
  width: 70,
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  backgroundColor: 'inherit',
}));

export const StyledTableCell90 = styled(TableCell)(({ theme }) => ({
  width: 90,
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  backgroundColor: 'inherit',
}));



export const StyledTableCellAuto = styled(TableCell)(({ theme }) => ({
  // Để trống để table tự động tính toán
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  backgroundColor: 'inherit',
}));