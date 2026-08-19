import {
  Box,
  Typography,
  Table, 
  TableHead, 
  TableRow,
  TableCell,
  styled,
} from "@mui/material";

export const DraftSectionContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(1.5), // Giảm thêm khoảng cách trên của mỗi section
  fontFamily: theme.typography.fontFamily,
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
}));

export const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  marginBottom: theme.spacing(1),
}));

export const SectionTitle = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  fontWeight: "bold",
  color: theme.palette.text.primary,
}));

export const CollapseContent = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(4),
}));

export const SubSectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontWeight: "bold",
  color: theme.palette.text.primary,
}));

export const IconContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: "flex",
  gap: theme.spacing(1.5),
}));

export const TableContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "noneBorder",
})(({ theme, noneBorder }) => ({
  border: noneBorder ? "none" : `1px solid ${theme.palette.divider}`,
  borderRadius: noneBorder ? 0 : theme.shape.borderRadius,
  overflowX: "auto",
}));

export const TableHeader = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  padding: theme.spacing(1, 2),
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

export const TableHeaderTitle = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

export const StyledTable = styled(Table)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  // Sử dụng màu nền nhẹ hơn, giống với các header khác trong hệ thống
  backgroundColor: theme.palette.action.hover,
  borderBottom: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 'bold',
  // Sử dụng màu primary của theme cho tiêu đề để nổi bật và đồng bộ
  color: theme.palette.text.primary, // Đổi thành màu đen cho chữ
  padding: '8px 16px',
  backgroundColor: 'inherit',
  whiteSpace: 'nowrap',
}));

export const EmptyTableRow = styled(TableRow)({});

export const EmptyTableCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.text.secondary,
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
}));

export const SubSectionContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
}));
