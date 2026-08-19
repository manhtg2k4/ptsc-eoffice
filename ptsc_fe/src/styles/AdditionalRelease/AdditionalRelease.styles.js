import { styled } from "@mui/material/styles";
import { Box, Typography, Checkbox as MuiCheckbox, IconButton as MuiIconButton, Dialog } from "@mui/material";

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
    backgroundColor: "rgba(0, 0, 0, 0.02)"
  }
}));

export const TreeItemLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isRightPanel' && prop !== 'isSelected',
})(({ isRightPanel, isSelected,theme, isUser }) => ({
  flexGrow: 1,
  cursor: isRightPanel && !isSelected ? 'default' : 'pointer',
  userSelect: 'none',
  fontSize: '14px',
  color: isUser ? theme.palette.primary.main : (isRightPanel && !isSelected ? theme.palette.text.secondary  : "inherit"),
  fontWeight: isRightPanel && !isSelected ? 600 : 400,
  display: 'flex',
  alignItems: 'center',
  '& > .MuiIconButton-root': { // Nhắm vào ExpandIconButton bên trong
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
    opacity: 0.5,
    cursor: 'not-allowed',
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
  '& .MuiSvgIcon-root': { // Áp dụng cho các icon bên trong
    fontSize: 'medium',
  }
}));

// export const PanelHeader = styled(Box)({
//   display: 'flex',
//   paddingTop: '12px',
//   paddingBottom: '12px',
//   paddingLeft: '8px',
//   paddingRight: '8px',
//   borderBottom: '2px solid #e0e0e0',
//   backgroundColor: '#fafafa'
// });

export const PanelHeaderTitle = styled(Typography)({
  flexGrow: 1,
  fontWeight: 'bold',
});

export const PanelHeaderTitleRight = styled(Typography)(() => ({
  flexGrow: 1,
    fontWeight: 'bold',
    // color: theme.palette.common.white
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
  // Thêm padding để căn chỉnh với checkbox bên dưới
//   paddingRight: theme.spacing(0.2),
}));

export const PanelHeaderActionText = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontWeight: 'bold',
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

export const RightPanelContent = styled(Box)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '380px' // Giảm chiều cao để có không gian cho ô select
});

export const CenteredBox = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px'
});

export const EmptyStateText = styled(Typography)({
  color: 'text.secondary',
  fontStyle: 'italic'
});

export const StatusText = styled(Typography)({
  color: 'text.secondary',
});

export const SearchBarContainer = styled(Box)({
  display: 'flex',
  gap: '8px',
  marginBottom: '24px'
});

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
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const CloseButton = styled('button')(({ theme }) => ({
  ...baseButtonStyles,
  backgroundColor: theme.palette.error.main,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));


export const StyledDialogReceivingUnit = styled(Dialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        maxWidth: theme.breakpoints.values.lg, // Sử dụng breakpoint 'lg' của theme
        width: "100%", // Tương đương với fullWidth
    },
}));

export const PanelHeaderLeft = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
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
    backgroundColor: '#0566AF',
    color: theme.palette.common.white
}));

export const StyledBoxQuickSelectUser = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

