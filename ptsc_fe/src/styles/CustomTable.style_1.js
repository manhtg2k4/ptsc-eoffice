import { styled } from "@mui/material/styles";
import {
  TableRow,
  TableCell,
  Button,
  Checkbox,
  Box,
  TablePagination,
  TableHead,
  TextField,
  TableContainer,
  Table,
  Grid,
} from "@mui/material";
import { ArrowDropUp, ArrowDropDown } from "@mui/icons-material";

export const StyledPaper = styled("div")(({ theme }) => ({
  width: "100%",
  overflow: "hidden",
  padding: 16,
  backgroundColor: theme.palette.background.default,
}));

export const StyledToolbar = styled(Box)(() => ({
  minHeight: "0 !important",
  display: "flex",
  // alignItems: "center",
  position: "relative",
  width: "100%",
  padding: 0,
  margin: 0,
}));

export const FilterBox = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: "108%",
  display: "flex",
  flexDirection: "column",
  background: theme.palette.background.paper,
  boxShadow: "rgba(0, 0, 0, 0.1) 0px 4px 10px",
  borderRadius: 5,
  padding: 10,
  zIndex: 10,
  width: "auto", // 🔹 Co giãn theo nội dung
  maxWidth: "90vw", // 🔹 Giới hạn chiều rộng tối đa
  whiteSpace: "nowrap", // 🔹 Ngăn chữ xuống dòng nếu cần

  "& .MuiFormControl-root": {
    width: "100%", // 🔹 Cho phép input mở rộng theo hộp
    marginBottom: 8,
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ccc !important", // Giữ nguyên màu viền
    },
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#fff !important", // Nền trắng cố định
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#ccc !important", // Viền đen cố định
      },
      "& .MuiInputBase-input": {
        color: "#000 !important", // Chữ đen cố định
      },
    },
  },
}));

export const StyledSearchField = styled(TextField)(() => ({
  maxWidth: 450,
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: "4px 0px 0px 4px",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#ccc !important", // Giữ nguyên màu viền
    },
    "& .MuiInputBase-input": {
      color: "#000 !important", // Giữ nguyên màu chữ đen
    },
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderRadius: "4px 0px 0px 4px",
  },
}));

export const StyledPaginationContainer = styled(Box)(() => ({
  display: "flex",
  justifyContent: "flex-start",
  width: "100%",
}));

export const StyledTablePagination = styled(TablePagination)(() => ({
  "& .MuiTablePagination-toolbar": {
    justifyContent: "flex-start",
  },
}));

export const StyledTableHead = styled(TableHead)(({ theme }) => ({
  borderBottom: "2px solid #ddd",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  backgroundColor: theme.palette.background.paper,
}));

export const StyledTableContainer = styled(TableContainer)(() => ({
  maxHeight: "calc(100vh - 320px)",
  overflowY: "auto",
  position: "relative",
}));

export const StyledTable = styled(Table)(() => ({
  borderCollapse: "separate !important",
}));

export const StyledTableRow = styled(TableRow)(({ theme, index }) => ({
  backgroundColor:
    index % 2 === 0
      ? theme.palette.background.paper
      : theme.palette.action.hover,
  borderBottom: "1px solid #ddd",
  color: theme.palette.text.primary,
}));

export const StyledTableCell = styled(TableCell)(
  ({ theme }) =>
    ({ borderLeft, alignCenter, align, width }) => ({
      // "&.MuiTableCell-root": {
      //   borderCollapse: "separate"
      // },
      minHeight: 41,
      height: 41,
      borderLeft: borderLeft ? "1px solid #ddd" : "none",
      textAlign: alignCenter ? "center" : align || "left",
      backgroundColor: "inherit", // Kế thừa màu nền từ hàng cha
      whiteSpace: "nowrap",
      width: width || null,
      zIndex: 2,
      "&:last-child": {
        width: 60,
        minWidth: 70,
        maxWidth: 200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        textAlign: "center",
        position: "sticky",
        backgroundColor: theme.palette.background.paper,
        right: 0,
        zIndex: 2,
      },
    })
);

export const StyledTableCells = styled(TableCell)(
  ({ theme }) =>
    ({ borderLeft, alignCenter, width }) => ({
      // "&.MuiTableCell-root": {
      //   borderCollapse: "separate"
      // },
      minHeight: 41,
      height: 41,
      borderLeft: borderLeft ? "1px solid #ddd" : "none",
      textAlign: alignCenter ? "center" : "left",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      overflow: "hidden",
      maxWidth: width || 200,
      backgroundColor: theme.palette.background.paper,
      position: "relative",
      zIndex: 1,

      "&:last-child": {
        // width: 60,
        minWidth: 70,
        maxWidth: 200,
        overflow: "hidden",
        textOverflow: "ellipsis",
        textAlign: "center",
        position: "sticky",
        backgroundColor: theme.palette.background.paper,
        right: 0,
        zIndex: 2,
      },
    })
);

export const StyledTableCellActions = styled(TableCell)(
  ({ theme, borderLeft, alignCenter, width, index }) => ({
    borderLeft: borderLeft ? "2px solid #ddd" : "none",
    textAlign: alignCenter ? "center" : "left",
    whiteSpace: "nowrap",
    width: width || null,
    zIndex: 2,
    backgroundColor:
      index % 2 === 0
        ? theme.palette.background.paper
        : theme.palette.action.hover,
    "&:last-child": {
      width: 60,
      minWidth: 180,
      maxWidth: 220,
      overflow: "hidden",
      textOverflow: "ellipsis",
      textAlign: "center",
      position: "sticky",
      right: 0,
      zIndex: 20,
      backgroundColor: theme.palette.background.paper,
      "&::after": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderLeft: "1px solid #ddd",
      },
    },
  })
);

export const StyledButton = styled(Button)(() => ({
  borderRadius: 4,
  height: 40,
  width: 40,
  minWidth: "40px !important",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
}));

export const StyledSearchButton = styled(Button)(({ theme }) => ({
  height: 40,
  width: 40,
  minWidth: "40px !important",
  color: theme.palette.primary.contrastText,
  borderRadius: "0px 8px 8px 0px !important",
}));

export const StyledFilterButton = styled(Button)(({ theme }) => ({
  height: 40,
  minWidth: "40px !important",
  color: `${theme.palette.text.secondary} !important`,
  backgroundColor: `${theme.palette.background.paper} !important`,
  borderRadius: "0px !important",
  borderLeft: "none !important",
  borderRight: `1px solid ${theme.palette.divider} !important`,
  borderTop: `1px solid ${theme.palette.divider} !important`,
  borderBottom: `1px solid ${theme.palette.divider} !important`,
}));

export const StyledCheckbox = styled(Checkbox)(() => ({
  color: "#0062AD",
}));

export const HeaderCellContainer = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center", // Căn giữa nội dung
  position: "relative",
}));

export const SortIconContainer = styled(Box)(() => ({
  position: "relative",
  width: 16,
  height: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: 4,
}));

export const StyledArrowUp = styled(ArrowDropUp)(({ theme, isActive }) => ({
  position: "absolute",
  top: -5,
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
}));

export const StyledArrowDown = styled(ArrowDropDown)(({ theme, isActive }) => ({
  position: "absolute",
  bottom: -4,
  color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
  opacity: isActive ? 1 : 0.3,
}));

export const StyledGrid = styled(Grid)(() => ({
  flexBasis: "23%",
  display: "flex",
}));
