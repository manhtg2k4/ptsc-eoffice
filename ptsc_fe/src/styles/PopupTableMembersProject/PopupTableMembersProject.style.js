import { styled } from "@mui/material/styles";

import {
  SkyBox,
  SkyButton,
  SkyCheckbox,
  SkyChip,
  SkyDialog,
  SkyDialogContent,
  SkyIconButton,
  SkyMenuItem,
  SkySelect,
  SkyTooltip,
  SkyTypography,
  SkyDialogTitle,
  SkyDialogActions
} from "@styles/SkyStyles";
import { Backdrop as MuiBackdrop, InputAdornment, Collapse as MuiCollapse, CircularProgress as MuiCircularProgress } from "@mui/material";
import CustomInputBase from "@components/CustomInput/CustomInputBase";
import { ChipContainer } from '@styles/CustomInput.styles';
import { memo, useCallback } from "react";
import ClearIcon from '@mui/icons-material/Clear';
import {
  StyledTableCell,
  StyledTableCellActions,
  StyledTableRow,
  StyledToolbar,
  SearchContainer,
  ToolbarContent
} from "@styles/CustomTable.styles";

export const DialogContainer = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  height: "75vh",
});

export const LeftPanel = styled(SkyBox)(({ theme }) => ({
  // border: `1px solid ${theme.palette.divider}`,
  // borderRadius: "4px",
  padding: "16px",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
  overflow: 'hidden',
  height: '100%',
}));

export const RightPanel = styled(SkyBox)(({ theme }) => ({
  // border: `1px solid ${theme.palette.divider}`,
  // borderRadius: "4px",  
  padding: "16px",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.paper,
  overflow: 'hidden',
  height: '100%',
}));

export const SelectionWrapper = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: "8px",
  display: "flex",
  height: "600px", // Cố định chiều cao cho vùng chọn
  width: "100%",
  overflow: "hidden",
}));

export const VerticalDivider = styled(SkyBox)(({ theme }) => ({
  width: '1px',
  backgroundColor: theme.palette.divider,
  height: '100%',
}));

export const PanelHeader = styled(SkyBox)({
  marginBottom: "16px",
});

export const ResultBox = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
});

export const ResultItem = styled(SkyBox)({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
});

export const CloseIconButton = styled(SkyIconButton)({
  color: "red",
  fontWeight: "bold",
});

export const SearchButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  minWidth: "auto",
  padding: "8px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const StyledButton = styled(SkyButton)(({ theme, color }) => ({
  backgroundColor:
    color === "primary" ? theme.palette.success.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "primary"
        ? theme.palette.success.dark
        : theme.palette.error.dark,
  },
}));


export const TreeItemContainer = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== 'level',
})(({ theme }) => ({
  display: "flex",
  alignItems: "stretch", // Đảm bảo con cao bằng cha để border nối liền
  transition: 'all 0.3s ease',
  border: `1px solid ${theme.palette.divider}`,
  borderTop: 'none',
  height: '40px', // Khớp với header height
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.02)"
  }
}));

export const TreeItemLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'isRightPanel' && prop !== 'isSelected',
})(({ isRightPanel, isSelected, theme, isUser, level }) => ({
  flexGrow: 1,
  cursor: isRightPanel && !isSelected ? 'pointer' : 'pointer',
  userSelect: 'none',
  fontSize: '14px',
  color: isUser ? theme.palette.primary.main : (isRightPanel && !isSelected ? theme.palette.text.secondary : "inherit"),
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: theme.spacing(1 + (level || 0) * 2),
  borderRight: isRightPanel ? `1px solid ${theme.palette.divider}` : 'none',
  height: '100%',
  boxSizing: 'border-box',
  '& > .MuiIconButton-root': {
    marginRight: theme.spacing(0.5),
  }
}));

export const TreeItemAction = styled(SkyBox)(() => ({
  width: '100px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  flexShrink: 0,
}));

export const StyledCheckbox = styled(SkyCheckbox)(({ theme }) => ({
  color: theme.palette.primary.main,
  "&.Mui-checked": {
    color: theme.palette.primary.main,
  },
  "&.Mui-disabled": {
    color: `${theme.palette.action.disabled} !important`,
  },
  "&.Mui-checked.Mui-disabled": {
    color: `${theme.palette.action.disabled} !important`,
  },
  padding: '4px'
}));

export const ExpandIconButton = styled(SkyIconButton, {
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

// export const PanelHeader = styled(SkyBox)({
//   display: 'flex',
//   paddingTop: '12px',
//   paddingBottom: '12px',
//   paddingLeft: '8px',
//   paddingRight: '8px',
//   borderBottom: '2px solid #e0e0e0',
//   backgroundColor: '#fafafa'
// });

export const PanelHeaderTitle = styled(SkyTypography)(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 600,
  fontSize: '14px',
  color: 'inherit',
  textAlign: 'center',
  borderRight: `1px solid rgba(255, 255, 255, 0.3)`,
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: theme.spacing(1), // Đồng bộ padding với row
}));

export const PanelHeaderTitleRight = styled(SkyTypography)(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 600,
  fontSize: '14px',
  color: theme.palette.text.primary,
}));



export const PanelHeaderActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  // Thêm padding để căn chỉnh với checkbox bên dưới
  //   paddingRight: theme.spacing(0.2),
}));

export const PanelHeaderActionText = styled(SkyTypography)(() => ({
  fontWeight: 600,
  fontSize: '14px',
  textAlign: 'center',
  color: 'inherit',
  width: '100px', // Cố định chiều rộng cho cột action
}));

export const PanelHeaderSecondaryTitle = styled(SkyTypography)({
  width: 100,
  textAlign: 'center',
  fontWeight: 'bold',
});

export const PanelContent = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '450px',
  scrollbarGutter: 'stable',
  scrollbarWidth: 'none',        // Firefox
  msOverflowStyle: 'none',       // IE/Edge
  '&::-webkit-scrollbar': {      // Chrome/Safari
    display: 'none',
  },
});

export const PanelContentLeft = styled(PanelContent)({
  overflow: 'auto',
  maxHeight: 'unset',
  "& .custom-table-tree-virtual-list-wrapper": {
    height: "400px !important"
  },
  "& .MuiPaper-root, & > div": {
    boxShadow: "none",
    padding: 0
  }
});

export const RightPanelContent = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
  maxHeight: '380px' // Giảm chiều cao để có không gian cho ô select
});

export const CenteredBox = styled(SkyBox)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '200px'
});

export const EmptyStateText = styled(SkyTypography)({
  color: 'text.secondary',
  fontStyle: 'italic'
});

export const PanelContentRight = styled(PanelContent)({
  position: "relative",
});

export const StyledBackdrop = styled(MuiBackdrop)(({ theme }) => ({
  position: "absolute",
  zIndex: 10,
  backgroundColor: "rgba(255,255,255,0.6)",
  borderRadius: theme.shape.borderRadius || 4,
}));

export const StatusText = styled(SkyTypography)({
  color: 'text.secondary',
});

export const SearchBarContainer = styled(SkyBox)({
  display: 'flex',
  gap: '8px',
  marginBottom: '24px'
});

export const SaveButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: '6px 16px',
  fontSize: '13px',
  textTransform: 'none',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const CloseButton = styled(SkyButton)(({ theme }) => ({
  backgroundColor: theme.palette.grey[300],
  color: theme.palette.text.primary,
  padding: '6px 16px',
  fontSize: '13px',
  textTransform: 'none',
  borderRadius: '4px',
  '&:hover': {
    backgroundColor: theme.palette.grey[400],
  },
}));


export const StyledDialogReceivingUnit = styled(SkyDialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: theme.breakpoints.values.lg,
    width: "100%",
  },
  "& .MuiDialogContent-root": {
    overflow: "hidden",
  },
}));

export const PanelHeaderLeft = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.action.hover,
}));

export const PanelHeaderRight = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  border: `1px solid ${theme.palette.primary.main}`,
  height: '40px',
  scrollbarGutter: 'stable',
  boxSizing: 'border-box',
}));

export const RightPanelTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '15px',
  marginBottom: '25px',
  color: theme.palette.text.primary,
  display: 'block',
  textAlign: 'left',
  textTransform: 'lowercase',
  '&:first-letter': {
    textTransform: 'uppercase',
  }
}));

export const LeftPanelTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '16px',
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  display: 'block',
  textAlign: 'left',
  textTransform: 'uppercase',
}));

export const StyledBoxQuickSelectUser = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

export const PaginationContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  gap: theme.spacing(2),
  fontSize: '13px',
  color: theme.palette.text.secondary,
}));

export const PaginationInfo = styled(SkyTypography)(({ theme }) => ({
  fontSize: '13px',
  color: theme.palette.text.primary,
}));

export const PaginationNav = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}));

export const NavButton = styled(SkyIconButton)(({ theme }) => ({
  padding: theme.spacing(0.5),
  '&.Mui-disabled': {
    color: theme.palette.action.disabled,
  },
}));

export const PageNumber = styled(SkyBox, {
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

export const EllipsisText = styled(SkyTypography)({
  fontSize: '13px',
  color: 'text.secondary',
  userSelect: 'none',
  padding: '0 4px',
});

export const RowsPerPageSelect = styled(SkySelect)(({ theme }) => ({
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

export const MenuItemStyled = styled(SkyMenuItem)({
  fontSize: '13px',
});

export const PageSizeSelector = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

export const LabelText = styled(SkyTypography)({
  fontSize: '13px',
});

export const DialogContentStyle = styled(SkyDialogContent)({
  padding: '10px 24px',
});

export const StyledCustomInput = styled(CustomInputBase)({
  '& .MuiInputBase-input': {
    width: '0px !important',
    flexGrow: '0 !important',
    padding: '0 !important',
  },
  '& .MuiOutlinedInput-root': {
    display: 'flex !important',
    position: 'relative !important',
    height: "auto !important",
    minHeight: '54px !important',
    overflowY: 'auto !important',
    borderRadius: '3px !important',
  },
  '& .MuiInputAdornment-positionStart': {
    flex: 1,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  '& .MuiInputAdornment-positionEnd': {
    marginLeft: 'auto',   // ✅ đẩy nút ❌ về cuối
    flexShrink: 0,
  },
});

export const StyledRecordChip = styled(SkyChip)(({ theme }) => ({
  marginRight: theme.spacing(0.5),
  marginBottom: theme.spacing(0.5),
}));

export const WrapChipContainer = styled(ChipContainer)({
  flexWrap: 'nowrap',
  width: '100%',
  overflowX: 'hidden',
  overflowY: 'hidden',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

// Card hiển thị thành viên dạng 2 dòng: Tên + Phòng ban
export const MemberCard = styled(SkyBox)(() => ({
  display: 'flex',
  alignItems: 'center',
  flex: '0 1 auto',
  minWidth: '80px',
  maxWidth: '220px',
  height: 'auto',
  padding: '7px 6px',
  border: '1px solid #cbd5e1',
  borderRadius: '7px',
  backgroundColor: 'transparent',
  overflow: 'hidden',
}));

export const MemberCardTextWrapper = styled(SkyBox)({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
});

export const MemberCardName = styled(SkyTypography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.1,
  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#16191D',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

export const MemberCardGroup = styled(SkyTypography)(() => ({
  fontSize: '10px',
  fontWeight: 400,
  lineHeight: 1.1,
  marginTop: '3px',
  textTransform: 'uppercase',
  color: '#575F6B',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

export const MemberCardDeleteButton = styled(SkyIconButton)(() => ({
  padding: '2px',
  marginLeft: '4px',
  flexShrink: 0,
  '& .MuiSvgIcon-root': {
    fontSize: '14px',
  },
}));

// Badge tròn hiển thị +N thành viên còn lại
export const MoreMembersBadge = styled(SkyBox)(({ theme }) => ({
  position: 'absolute',
  right: '38px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  backgroundColor: "#5A6573",
  color: theme.palette.background.paper,
  fontSize: '13px',
  fontWeight: 600,
  flexShrink: 0,
  cursor: 'pointer',
}));

export const MemberCardWrapper = memo(({ item, name, groupName, fullLabel, onDelete, readOnly = false }) => {
  const handleDelete = useCallback((e) => {
    e?.stopPropagation();
    if (onDelete) {
      onDelete(e, item);
    }
  }, [item, onDelete]);

  const displayName = name?.length > 20 ? `${name.substring(0, 20)}...` : name;

  return (
    <SkyTooltip title={fullLabel || (groupName ? `${name} - ${groupName}` : name)} arrow placement="top">
      <MemberCard>
        <MemberCardTextWrapper>
          <MemberCardName>{displayName}</MemberCardName>
          {groupName ? <MemberCardGroup>{groupName}</MemberCardGroup> : null}
        </MemberCardTextWrapper>
        {!readOnly && (
          <MemberCardDeleteButton size="small" onClick={handleDelete}>
            <ClearIconButton />
          </MemberCardDeleteButton>
        )}
      </MemberCard>
    </SkyTooltip>
  );
});

MemberCardWrapper.displayName = "MemberCardWrapper";

export const ClearableInputAdornment = styled(InputAdornment)(({ theme }) => ({
  marginRight: theme.spacing(3),
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
}));

ClearableInputAdornment.defaultProps = {
  position: "end",
};

export const RecordChip = memo(({ item, label, fullLabel, onDelete, readOnly = false }) => {
  const handleDelete = useCallback((e) => {
    if (onDelete) {
      onDelete(e, item);
    }
  }, [item, onDelete]);

  const displayLabel = label?.length > 12 ? `${label.substring(0, 12)}...` : label;

  return (
    <SkyTooltip title={fullLabel} arrow placement="top">
      <StyledRecordChip
        size="small"
        label={displayLabel}
        onDelete={readOnly ? undefined : handleDelete}
      />
    </SkyTooltip>
  );
});

RecordChip.displayName = "RecordChip";



export const ClearIconButton = styled(ClearIcon)(() => ({

  fontSize: '13px',
}));

export const StyledDialogTitle = styled(SkyDialogTitle)(() => ({
  textAlign: 'center',
  textTransform: 'uppercase',
  fontWeight: 'bold',
  fontSize: '18px',
}));

export const StyledDialogContent = styled(SkyDialogContent)(() => ({
  // Custom styles if needed
}));

export const StyledDialogActions = styled(SkyDialogActions)(() => ({
  // Custom styles if needed
}));

export const StyledCollapse = styled(MuiCollapse)(() => ({
  // Custom styles if needed
}));

export const StyledCircularProgress = styled(MuiCircularProgress)(() => ({
  // Custom styles if needed
}));

export const StyledBox = styled(SkyBox)(() => ({
  // Custom styles if needed
}));

export const RightTableContainer = styled(SkyBox)(({ theme }) => ({
  width: '100%',
  overflow: 'auto',
  maxHeight: '450px',
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
  },
  '& th': {
    textAlign: 'left',
    padding: '8px',
    borderBottom: `2px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    backgroundColor: theme.palette.grey[100],
    zIndex: 1,
  },
  '& td': {
    padding: '8px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: '13px',
  },
  '& tr:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const SearchInputWrapper = styled(SkyBox)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
}));

export const InheritedTableCell = styled(StyledTableCell, {
  shouldForwardProp: (prop) => prop !== 'hideBorderBottom'
})(({ theme, styledColor, styleTextAlign, hideBorderBottom }) => ({
  borderBottomStyle: hideBorderBottom ? 'none !important' : 'solid !important',
  borderBottomWidth: '1px !important',
  borderBottomColor: `${theme.palette.divider} !important`,
  color: styledColor === "primary" ? `${theme.palette.primary.main} !important` : "inherit",
  backgroundColor: 'inherit !important',
  height: '48px !important',
  boxSizing: 'border-box',
  boxShadow: hideBorderBottom ? 'none' : `0 -1px 0 inset ${theme.palette.divider}`, // Fallback border
  ...(styleTextAlign === 'center' && {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  })
}));

export const InheritedTableRow = styled(StyledTableRow)(({ theme }) => ({
  borderBottomStyle: 'solid !important',
  borderBottomWidth: '1px !important',
  borderBottomColor: `${theme.palette.divider} !important`,
  height: '48px !important',
  '& td': {
    borderBottomStyle: 'solid !important',
    borderBottomWidth: '1px !important',
    borderBottomColor: `${theme.palette.divider} !important`,
  },
  '&:hover td': {
    backgroundColor: `${theme.palette.action.hover} !important`,
  }
}));


export const InheritedTableCellActions = styled(StyledTableCellActions)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider} !important`,
  height: '48px !important',
}));

export const InheritedCheckboxHeaderCell = styled(InheritedTableCell)({
  width: "50px",
  padding: "0px 16px",
  textAlign: "center",
  verticalAlign: "middle",
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '48px !important',
});

export const InheritedToolbar = styled(StyledToolbar)({
  margin: '0 !important',
  padding: '0 !important',
  marginBottom: '8px !important',
});

export const InheritedSearchContainer = styled(SearchContainer)({
  width: '100% !important',
  padding: '0 !important',
});

export const InheritedToolbarContent = styled(ToolbarContent)({
  width: '100% !important',
});