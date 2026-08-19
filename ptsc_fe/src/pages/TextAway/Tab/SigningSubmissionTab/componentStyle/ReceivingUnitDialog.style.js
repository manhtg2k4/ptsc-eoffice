import { styled } from "@mui/material/styles";
import { Box, Typography, Checkbox as MuiCheckbox, IconButton as MuiIconButton, Dialog, Select as MuiSelect, MenuItem, DialogContent, Backdrop as MuiBackdrop } from "@mui/material";
import { StyledTitleText } from "@styles/DialogDirective";

export const TreeItemContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'level',
})(({ theme, level }) => ({
  display: "flex",
  alignItems: "center",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingRight: theme.spacing(1),
  paddingLeft: theme.spacing(level * 3 + 1),
  transition: 'all 0.3s ease',
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.mode === 'dark' ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)"
  }
}));

export const TreeItemLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isRightPanel' && prop !== 'isSelected',
})(({ isRightPanel, isSelected, theme, isUser }) => ({
  flexGrow: 1,
  cursor: isRightPanel && !isSelected ? 'default' : 'pointer',
  userSelect: 'none',
  fontSize: '14px',
  color: isUser ? theme.palette.primary.main : (isRightPanel && !isSelected ? theme.palette.text.secondary : "inherit"),
  fontWeight: isRightPanel && !isSelected ? 600 : 400,
  display: 'flex',
  alignItems: 'center',
  '& > .MuiIconButton-root': {
    marginRight: theme.spacing(0.5),
  }
}));

export const StyledCheckbox = styled(MuiCheckbox)(({ theme }) => ({
  color: theme.palette.primary.main,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  "&.Mui-disabled": {
    color: theme.palette.action.disabled,
  },
  padding: '4px'
}));

export const ExpandIconButton = styled(MuiIconButton, {
  shouldForwardProp: (prop) => prop !== 'hasChildren',
})(({ theme, hasChildren }) => ({
  visibility: hasChildren ? 'visible' : 'hidden',
  width: 28,
  height: 28,
  padding: '4px',
  marginLeft: '8px',
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 'medium',
  }
}));

export const PanelHeaderTitle = styled(Typography)({
  flexGrow: 1,
  fontWeight: 'bold',
  fontSize: 15,
});

export const PanelHeaderTitleRight = styled(Typography)(() => ({
  flexGrow: 1,
  fontWeight: 'bold',
}));

export const PanelHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const PanelHeaderActions = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

export const PanelHeaderActionText = styled(Typography)(() => ({
  marginBottom: 0,
  fontWeight: 'bold',
  fontSize: 15,
}));

export const PanelHeaderSecondaryTitle = styled(Typography)({
  width: 100,
  textAlign: 'center',
  fontWeight: 'bold',
});

export const PanelContent = styled(Box)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '450px'
});

export const PanelContentLeft = styled(PanelContent)(({ theme }) => ({
  overflow: 'hidden',
  overflowX: 'auto',
  height: '445px',
  minWidth: 0,
  "& .MuiToolbar-root": {
    margin: "0 0 14px",
    width: "100%",
  },
  "& .MuiToolbar-root > *": {
    width: "100%",
  },
  "& .MuiToolbar-root .MuiBox-root": {
    width: "100%",
    paddingLeft: 0,
  },
  "& .MuiToolbar-root .MuiFormControl-root": {
    width: "100%",
    maxWidth: "none",
  },
  "& .MuiToolbar-root .MuiOutlinedInput-root": {
    borderRadius: 6,
  },
  "& .MuiTableHead-root th": {
    backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.default : "#f0f0f0 !important",
    color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#111 !important",
    fontWeight: "700 !important",
    fontSize: "15px !important",
    height: 46,
    borderTop: `1px solid ${theme.palette.divider} !important`,
  },
  "& colgroup col:nth-of-type(1)": {
    width: "36px !important",
  },
  "& .MuiTableHead-root th:nth-of-type(1)": {
    width: "36px !important",
    minWidth: "36px !important",
    maxWidth: "36px !important",
    padding: "0 !important",
  },
  "& .MuiTableHead-root th:nth-of-type(2)": {
    paddingLeft: "16px !important",
  },
  "& .MuiTableHead-root th:nth-of-type(3)": {
    textAlign: "right !important",
    paddingRight: "16px !important",
  },
  "& .custom-table-tree-virtual-list-wrapper": {
    height: "calc(445px - 52px - 46px - 16px) !important",  // 445 - toolbar search - table header - bottom spacing
    paddingBottom: "8px",
  },
  "& .custom-table-tree-virtual-row-table td": {
    height: "52px !important",
    fontSize: "14px !important",
    borderBottom: `1px solid ${theme.palette.divider} !important`,
    color: theme.palette.text.primary,
  },
  "& .custom-table-tree-virtual-row-table td:nth-of-type(1)": {
    width: "36px !important",
    minWidth: "36px !important",
    maxWidth: "36px !important",
    padding: "0 !important",
    textAlign: "center !important",
    backgroundColor: "inherit !important",
  },
  "& .custom-table-tree-virtual-row-table tbody tr:hover td:nth-of-type(1)": {
    backgroundColor: "inherit !important",
  },
  "& .custom-table-tree-virtual-row-table td:nth-of-type(1) .MuiIconButton-root": {
    marginLeft: "0 !important",
    width: "20px !important",
    height: "20px !important",
    backgroundColor: "transparent !important",
  },
  "& .custom-table-tree-virtual-row-table td:nth-of-type(1) .MuiIconButton-root:hover": {
    backgroundColor: "transparent !important",
  },
  "& .custom-table-tree-virtual-row-table td:nth-of-type(2)": {
    paddingLeft: "8px !important",
  },
  "& .custom-table-tree-virtual-row-table td:nth-of-type(3)": {
    textAlign: "right !important",
    paddingRight: "16px !important",
  },
  "& .MuiPaper-root, & > div": {
    boxShadow: "none",
    padding: 0
  }
}));

export const RightPanelContent = styled(Box)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '380px'
});

export const CenteredBox = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px',
  minHeight: '200px',
});

export const EmptyStateText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  fontSize: 14,
}));

export const PanelContentRight = styled(PanelContent)({
  position: "relative",
  height: "445px",
  overflow: "auto",
  minWidth: 0,
  "& > .MuiBox-root:first-of-type": {
    borderTop: 0,
  },
});

export const StyledBackdrop = styled(MuiBackdrop)(({ theme }) => ({
  position: "absolute",
  zIndex: 10,
  backgroundColor: theme.palette.mode === 'dark' ? "rgba(0, 0, 0, 0.4)" : "rgba(255,255,255,0.6)",
  borderRadius: theme.shape.borderRadius || 4,
}));

export const StatusText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const SearchBarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  padding: theme.spacing(2, 2, 0, 2),
  marginBottom: theme.spacing(2)
}));

const baseButtonStyles = {
  border: 'none',
  padding: '10px 16px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: '500',
  color: 'white',
};

export const SaveButton = styled('button')(({ theme }) => ({
  ...baseButtonStyles,
  backgroundColor: theme.palette.primary.main,
  minWidth: '92px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&:disabled': {
    backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#c7d7ee',
    color: theme.palette.mode === 'dark' ? '#64748b' : '#ffffff',
    cursor: 'not-allowed',
  },
}));

export const CloseButton = styled('button')(({ theme }) => ({
  ...baseButtonStyles,
  backgroundColor: theme.palette.error.main,
  minWidth: '92px',
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

export const StyledDialogReceivingUnit = styled(Dialog)(() => ({
  "& .MuiDialog-paper": {
    maxWidth: '1240px',
    width: "calc(100% - 32px)",
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.16)',
  },
  "& .MuiDialogContent-root": {
    overflow: "hidden",
  },
  "& .MuiDialogTitle-root": {
    display: 'none',
  },
}));

export const DialogHeaderBar = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '56px',
  padding: theme.spacing(0, 6),
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#eef3f7',
}));

export const DialogHeaderCloseButton = styled(MuiIconButton)(({ theme }) => ({
  position: 'absolute',
  right: theme.spacing(1),
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#98a2b3',
}));

export const PanelHeaderLeft = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc',
}));

export const PanelHeaderRight = styled(Box, {
  shouldForwardProp: (prop) => prop !== "dialogKey",
})(({ theme, dialogKey }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding:
    dialogKey === "externalDepartment"
      ? theme.spacing(1, 1)
      : theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor:
    theme.palette.mode === "light" ? theme.palette.primary.main : '#0566AF',
  color: theme.palette.common.white,
  "& .MuiTypography-root, & .MuiSvgIcon-root, & .MuiIconButton-root": {
    color: `${theme.palette.common.white} !important`,
  },
}));

export const StyledBoxQuickSelectUser = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2, 0, 2),
  marginBottom: theme.spacing(2),
}));

export const PaginationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(2),
  fontSize: '13px',
  color: theme.palette.text.secondary,
}));

export const PaginationInfo = styled(Typography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.primary,
}));

export const PaginationNav = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

export const NavButton = styled(MuiIconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  '&.Mui-disabled': {
    color: theme.palette.action.disabled,
  },
}));

export const PageNumber = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isActive',
})(({ theme, isActive }) => ({
  minWidth: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: isActive ? theme.palette.action.selected : theme.palette.action.hover,
  borderRadius: '2px',
  fontSize: '13px',
  color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
  fontWeight: isActive ? 'bold' : 'normal',
  cursor: 'pointer',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
    color: theme.palette.primary.main,
  },
}));

export const EllipsisText = styled(Typography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.secondary,
  userSelect: 'none',
  padding: '0 4px',
}));

export const RowsPerPageSelect = styled(MuiSelect)(({ theme }) => ({
  '& .MuiSelect-select': {
    padding: '2px 24px 2px 8px !important',
    fontSize: '13px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.divider,
  },
  height: '28px',
  minWidth: '60px',
}));

export const MenuItemStyled = styled(MenuItem)({
  fontSize: '13px',
});

export const PageSizeSelector = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const LabelText = styled(Typography)({
  fontSize: '13px',
});

export const DialogContentStyle = styled(DialogContent)({
  padding: '10px 24px',
});

export const StyledTitleTextDialog = styled(StyledTitleText)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : "#f0f4f8",
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: "12px 24px",
  color: theme.palette.primary.main,
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1.5,
  textAlign: "center",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  width: "100%",
}));
