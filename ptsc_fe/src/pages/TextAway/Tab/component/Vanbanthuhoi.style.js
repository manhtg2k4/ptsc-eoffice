import { TableCell, TableContainer, Table } from "@mui/material";
import { styled } from "@mui/material/styles";

export const StyledTableContainer = styled(TableContainer)(() => ({
  maxWidth: '100%',
  overflowX: 'auto',
}));

export const StyledTable = styled(Table)(() => ({
  minWidth: 650,
}));

export const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 500,
  fontSize: "13px",
  color: theme.palette.text.secondary,
  padding: "12px 16px",
  backgroundColor: theme.palette.action.hover,
  borderBottom: `1px solid ${theme.palette.divider}`,

  // Định nghĩa chiều rộng cho từng cột
  "&:nth-of-type(1)": { width: "16.66%" }, // Số ký hiệu văn bản
  "&:nth-of-type(2)": { width: "16.66%" }, // Ngày ban hành
  "&:nth-of-type(3)": { width: "25%" },     // Trích yếu
  "&:nth-of-type(4)": { width: "16.66%" }, // File dự thảo
  "&:nth-of-type(5)": { width: "8.33%" },  // Xem chi tiết
  "&:nth-of-type(6)": { width: "8.33%" },  // Tải file
  "&:nth-of-type(7)": { width: "8.33%" },  // Hành động
}));