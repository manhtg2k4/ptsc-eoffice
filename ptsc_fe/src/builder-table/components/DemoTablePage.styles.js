import { styled } from "@mui/material/styles";
import { Box, IconButton, TableCell, TableContainer } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export const DemoTablePageWrapper = styled(Box)({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export const TabPanelContainer = styled("div")({
  height: "100%",
  overflow: "auto",
});

export const TabPanelContent = styled(Box)({
  height: "100%",
  padding: 0,
});

export const TableContainerST = styled(TableContainer)({
  maxHeight: 400, boxShadow: "none", border: "1px solid #e0e0e0"
});
export const BoxTitle = styled(Box)({
   textAlign:'center',
   marginBottom:'20px'
});
export const TableCellST = styled(TableCell)({
  fontWeight: "bold", width: "50px"
});

export const TableCellBold = styled(TableCell)({
  fontWeight: "bold"
});

export const TableCellAction = styled(TableCell)({
  fontWeight: "bold", width: "120px"
});

export const STTableCell = styled(TableCell)({
  maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
});

export const IconButtonST = styled(IconButton)({
  color:"red"
});

export const DeleteIconST = styled(DeleteIcon)({
  fontSize: "20px",
});


export const TabsWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "effectiveDisplayType",
})({
  width: "100%",
  height: "100%", // Sửa lại để đảm bảo chiều cao luôn đúng
});

export const SpecificComponentWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "hasSubmenu",
})(({ hasSubmenu, globalState }) => ({
  height: hasSubmenu ? "calc(100vh - 500px)" : (globalState.hideSearch ? "calc(100vh - 250px)" : "calc(100vh - 270px)"),
  width: "100%",
}));

export const TaskDetailPanelWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ open }) => ({
  position: "absolute",
  top: 0,
  right: 0,
  height: "100%",
  width: 420,
  zIndex: 1000,
  backgroundColor: "transparent",
  opacity: open ? 1 : 0,
  transform: open ? "scale(1)" : "scale(0.95)",
  transformOrigin: "right center",
  transition: "opacity 350ms cubic-bezier(.4, 0, .2, 1), transform 350ms cubic-bezier(.4, 0, .2, 1)",
  pointerEvents: open ? "auto" : "none",
}));