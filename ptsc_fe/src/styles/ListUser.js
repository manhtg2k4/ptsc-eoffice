import { styled } from "@mui/material/styles";
import { ScrollTableContainer } from "./Common.styles";

// Định nghĩa styled component cho đường kẻ dọc
export const VerticalLine = styled("div")(({ theme, level }) => ({
  position: "absolute",
  left: `${level * 20 - 10}px`,
  top: "0",
  bottom: "0",
  width: "2px",
  height: "100%",
  backgroundColor: theme.palette.divider,
}));

export const NodeContainer = styled("div")(({ theme, level, active }) => ({
  display: "flex",
  paddingLeft: `${level * 20}px`,
  alignItems: "center",
  color: active ? theme.palette.primary.dark : theme.palette.text.primary,
  position: "relative",
}));

export const HorizontalLine = styled("div")(
  ({ theme, level, hasChildren }) => ({
    position: "absolute",
    left: `${level * 20 - 10}px`,
    top: "48%",
    width: hasChildren ? "10px" : level === 1 ? "35px" : `${level * 10}px`,
    height: "2px",
    backgroundColor: theme.palette.divider,
  })
);

export const ToggleButton = styled("span")(({ theme }) => ({
  cursor: "pointer",
  width: "24px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "18px",
  border: `1px solid ${theme.palette.divider}`,
}));

export const NodeName = styled("span")(() => ({
  padding: "8px",
  cursor: "pointer",
  color: "inherit", // Kế thừa màu chữ từ NodeContainer
}));

export const TableWrapper = styled(ScrollTableContainer)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  height: `calc(100vh - ${theme.spacing(15)})`,
  "& .MuiTable-root": {
    minWidth: 4500,
    "& .MuiTableCell-root": {
      whiteSpace: "nowrap",
      padding: "0px 10px",
      fontSize: theme.typography.pxToRem(13),
      height: theme.layout?.dynamicTable?.rowHeight || "55px",
      "tbody tr:hover &": {
        backgroundColor: `${theme.palette.action.hover} !important`,
      },
    },
  },
  "& .MuiTableContainer-root": {
    maxWidth: "100%",
  },
}));
