import { styled } from "@mui/material/styles";
import PersonIcon from "@mui/icons-material/Person";
import {
  SkyBox,
  SkyTypography,
  SkyCheckbox,
  SkyIconButton,
  SkyGrid,
  SkyTable,
  SkyTableHead,
  SkyTableCell,
  SkyTableRow,
} from "@styles/SkyStyles";
import {
  StylePanel,
  StylePanelHeader,
  StylePanelTitle,
} from "@styles/DialogDirective";

export const LeftPanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingLeft: theme.spacing(1),
  paddingRight: "14px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
  flexShrink: 0,
}));

export const HeaderCol = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "13px",
  color: theme.palette.text.primary,
  flexGrow: 1,
}));

export const RoleHeaderCol = styled(SkyBox)({
  width: 100,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});

export const PanelContent = styled(SkyBox)(({nonePaddingRight})=>({
  flexGrow: 1,
  overflowY: "auto",
  minHeight: "500px",
  maxHeight: "500px",
  paddingRight: nonePaddingRight ? 0 : 4,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#ccc", borderRadius: 3 },
  "&::-webkit-scrollbar-thumb:hover": { background: "#aaa" },
}));

export const LoadingContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
}));

export const NoDataContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
}));

export const NoDataTypography = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export const TreeItemContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'level',
})(({ theme, level }) => ({
  display: "flex",
  alignItems: "center",
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  paddingRight: theme.spacing(1),
  paddingLeft: theme.spacing(level * 3 + 1),
  transition: 'all 0.3s ease',
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:hover": {
    backgroundColor: theme.palette.action.hover
  }
}));

export const ExpandIconButton = styled(SkyIconButton, {
  shouldForwardProp: (prop) => prop !== 'hasChildren',
})(({ theme, hasChildren }) => ({
  visibility: hasChildren ? 'visible' : 'hidden',
  width: 28,
  height: 28,
  padding: '4px',
  color: theme.palette.text.primary,
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  }
}));

export const TreeItemLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'disabled',
})(({ theme, disabled }) => ({
  flexGrow: 1,
  fontSize: '14px',
  color: disabled ? theme.palette.text.disabled || '#757575' : theme.palette.text.primary,
  cursor: disabled ? 'default' : 'pointer',
  userSelect: 'none',
}));

export const RoleColumn = styled(SkyBox)({
  width: 100,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});

export const RoleCheckBox = styled(SkyCheckbox)(({ theme }) => ({
  padding: theme.spacing(0.5),
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
  '&.Mui-disabled': {
    color: '#a0a0a0 !important',
  },
  '&.Mui-disabled.Mui-checked': {
    color: '#a0a0a0 !important',
  },
}));

export const SelectedTd = styled('td', {
  shouldForwardProp: (prop) => prop !== 'align',
})(({ theme, align }) => ({
  padding: theme.spacing(1.5, 1),
  fontSize: "14px",
  border: `1px solid ${theme.palette.divider}`,
  textAlign: align || "left",
  color: theme.palette.text.primary,
}));

export const NoSelectionTd = styled(SelectedTd)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  textAlign: 'center',
}));

export const ActionIconButton = styled(SkyIconButton)(({ theme }) => ({
  padding: 4,
  '&:hover': {
    color: theme.palette.error.main,
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  },
}));

export const StyledBodyGridContainer = styled(SkyGrid)(({ theme }) => ({
  padding: theme.spacing(1.5),
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
}));

export const StyledPanelGridItem = styled(SkyGrid)(() => ({
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
}));

export const StyledPanelNoPadding = styled(StylePanel)(() => ({
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
}));

export const StyledPanelContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
}));

export const StyledSearchWrapper = styled(SkyBox)({
  marginBottom: '16px',
});

export const StyledPanelHeaderWrapper = styled(StylePanelHeader)(() => ({
  justifyContent: "flex-start",
  gap: "8px",
}));

export const StyledPanelTitleLeft = styled(StylePanelTitle)(() => ({
  textAlign: "left",
}));

export const StyledHeaderIcon = styled(SkyBox)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: "flex",
  alignItems: "center",
  "& svg": {
    fontSize: "20px",
  },
}));

export const StyledTableContainer = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  height: "500px",
  minHeight: "500px",
  maxHeight: "500px",
  overflowY: "auto",
  overflowX: "hidden",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  width: "100%",

  "&::-webkit-scrollbar": {
    width: 6,
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#ccc",
    borderRadius: 3,
  },

  "& .MuiTable-root": {
    borderCollapse: "separate",
    borderSpacing: 0,
  },

  "& thead th": {
    position: "sticky",
    top: 0,
    zIndex: 10,
    backgroundColor: "#f8fafd",
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

export const StyledTable = styled(SkyTable)(({ theme }) => ({
  borderCollapse: 'separate',
  width: '100%',
  minWidth: 'auto',
  '& td, & th': {
    border: `1px solid ${theme.palette.divider}`,
    borderTop: 'none',
    borderLeft: 'none',
    padding: '10px 12px',
    fontSize: '13px',
  },
  '& tr td:first-of-type, & tr th:first-of-type': {
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  '& thead tr:first-of-type th': {
    borderTop: `1px solid ${theme.palette.divider}`,
  }
}));

export const StyledTableHead = styled(SkyTableHead)(({ theme }) => ({
  backgroundColor: "#f8fafd",
  '& th': {
    color: theme.palette.primary.main,
    fontWeight: 'bold',
    textAlign: 'center',
  }
}));

export const HeaderRow = styled(SkyTableRow)(() => ({
  backgroundColor: "#f8fafd",
  "&:hover": {
    backgroundColor: "#f8fafd",
  },
}));

export const HeaderCell = styled(SkyTableCell)(({ theme }) => ({
  fontWeight: 600,
  fontSize: 14,
  color: theme.palette.primary.main,
  padding: "10px 16px",
  backgroundColor: "#f8fafd",
}));

export const UserNodeIcon = styled(PersonIcon, {
  shouldForwardProp: (prop) => prop !== 'disabled',
})(({ theme, disabled }) => ({
  fontSize: 18,
  marginRight: 6,
  color: disabled ? '#a0a0a0' : theme.palette.primary.main,
}));
