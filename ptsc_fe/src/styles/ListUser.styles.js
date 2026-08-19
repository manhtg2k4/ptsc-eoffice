import { styled } from "@mui/material/styles";
import { Box, Grid, TextField, Typography } from "@mui/material";
import { ScrollTableContainer } from "@styles/Common.styles";
import { syncDialogStyles } from "@pages/ListUsers/constantsDistrict";
import { Add, Menu, Remove } from "@mui/icons-material";
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

export const NodeWrapper = styled("div")({
  position: "relative",
});

export const ToggleButtonPlaceholder = styled("span")({
  width: "24px",
});

export const LeftPanelContainer = styled("div")(
  ({ theme, mobileMenuOpen }) => ({
    padding: mobileMenuOpen ? theme.spacing(2) : theme.spacing(1),
    alignItems: "flex-start",
    justifyContent: mobileMenuOpen ? "space-between" : "center",
    height: "100%",
  })
);

export const LeftPanelHeader = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
});

export const LeftPanelContent = styled("div")({
  flexBasis: "100%",
});

export const SearchBoxContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: "8px",
}));

export const SearchUnitTextField = styled(TextField)(({ theme }) => ({
  margin: theme.spacing(1, 0),
}));

export const TreeContainer = styled("div")({
  height: "calc(100vh - 300px)",
  overflow: "auto",
});

export const NoDataMessage = styled(Box)(({ theme }) => ({
  textAlign: "center",
  marginTop: theme.spacing(2),
  color: theme.palette.text.secondary,
}));

export const CollapsedMenuContainer = styled("div")({
  width: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const MainContentGrid = styled(Grid, {
  shouldForwardProp: (prop) => prop !== "isMdDown" && prop !== "mobileMenuOpen",
})(({ isMdDown, mobileMenuOpen }) => ({
  display: isMdDown && mobileMenuOpen ? "none" : "block",
}));

export const SyncProgressContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
});

export const SyncProgressBar = styled(Box)({
  width: "100%",
  marginRight: "8px",
});

export const SyncProgressPercentage = styled(Box)({
  minWidth: 35,
});

export const SyncStyles = styled(Typography)({
  variant: "body2",
  color: "text.secondary",
});
export const SyncLog = styled("pre")(
  ({ theme }) => syncDialogStyles(theme).logPre
);

export const DepartmentNodeLabel = styled("span", {
  shouldForwardProp: (prop) => prop !== "isActive",
})(({ theme, isActive }) => ({
  fontWeight: isActive ? 700 : 400,
  color: isActive ? theme.palette.primary.main : "inherit",
  cursor: "pointer",
  display: "block",
  width: "100%",
}));

export const TableWrapper = styled(ScrollTableContainer)(({ theme }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
  // height: `calc(100vh - ${theme.spacing(20)})`,
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

export const TreeNodeWrapper = styled("div")({
  position: "relative",
});

export const StyledRemoveIcon = styled(Remove)({
  color: "#ccc",
});

export const StyledAddIcon = styled(Add)({
  color: "#ccc",
});

export const IndentSpacer = styled("span")({
  width: "24px",
});



export const MenuIconButton = styled(Menu)(({ theme }) => ({
  color: theme.palette.primary.main,
}));


