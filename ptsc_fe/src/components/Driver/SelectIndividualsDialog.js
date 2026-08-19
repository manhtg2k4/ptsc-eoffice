import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  CircularProgress,
  Collapse,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { getListUnitLibrary } from "@redux/slices/SharedCategory/managementUnitSlice";
import { useToast } from "@components/common/ToastProvider";
import {
  SkyBox,
  SkyTypography,
  SkyCheckbox,
  SkyIconButton,
  // SkyDialogContent,
  SkyGrid,
  SkyTextField,
  SkyTableCell,
  SkyTableRow,
  SkyTableHead,
  SkyTable
} from "@styles/SkyStyles";
import {
  StyledDialog,
  CancelButton,
  SaveButton,
  CloseIconButton,
} from "@styles/CustomDialog.styles";
import CloseIcon from "@mui/icons-material/Close";
// --- Styled Components ---
import {
  StyleBoxFoodterEnd,
  StyledRowBox,
  StyledDialogTitle,
  StyledTitleText,
  StyleDialogBody,
  StylePanel,
  StylePanelHeader,
  StylePanelTitle,
} from "@styles/DialogDirective";







// const SearchBarContainer = styled(SkyBox)(({ theme }) => ({
//   display: 'flex',
//   gap: '8px',
//   marginBottom: theme.spacing(2),
//   flexShrink: 0,
//   '& .MuiInputBase-root': {
//     backgroundColor: theme.palette.background.paper,
//     color: theme.palette.text.primary,
//     '& fieldset': {
//       borderColor: theme.palette.divider,
//     },
//   },
// }));

const LeftPanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1, 0),
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(1),
  flexShrink: 0,
}));

const HeaderCol = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold",
  fontSize: "13px",
  color: theme.palette.text.primary,
  flexGrow: 1,
}));

const RoleHeaderCol = styled(HeaderCol)(() => ({
  width: 100,
  textAlign: "center",
  flexGrow: 0,
  whiteSpace: "nowrap",
}));

const PanelContent = styled(SkyBox)({
  flexGrow: 1,
  overflowY: "auto",
  minHeight: "500px",
  maxHeight: "500px",
  paddingRight: 4,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "#ccc", borderRadius: 3 },
  "&::-webkit-scrollbar-thumb:hover": { background: "#aaa" },
});

const LoadingContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
}));

const NoDataContainer = styled(SkyBox)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3),
}));

const NoDataTypography = styled(SkyTypography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const TreeItemContainer = styled(SkyBox, {
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

const StyledPanelGridItem = styled(SkyGrid)(() => ({
  display: "flex",
  flexDirection: "column",
   minHeight: 0,
}));
const StyledPanelNoPadding = styled(StylePanel)(() => ({
  margin: 0,
  padding: 0,
   display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
}));

const StyledPanelContent = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
}));
const StyledSearchWrapper = styled(SkyBox)({
  marginBottom: '16px',
});

const StyledHeaderIcon = styled(SkyBox)(({ theme }) => ({
  color: theme.palette.primary.main,
  display: "flex",
  alignItems: "center",
  "& svg": {
    fontSize: "20px",
  },
}));

const StyledPanelHeaderWrapper = styled(StylePanelHeader)(() => ({
  justifyContent: "flex-start",
  gap: "8px",
}));

const StyledPanelTitleLeft = styled(StylePanelTitle)(() => ({
  textAlign: "left",
}));

const ExpandIconButton = styled(SkyIconButton, {
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

const StyledTableContainer = styled(SkyBox)(({ theme }) => ({
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
const TreeItemLabel = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== 'isUser',
})(({ theme, isUser }) => ({
  flexGrow: 1,
  fontSize: '14px',
  color: isUser ? theme.palette.primary.main : theme.palette.text.primary,
  cursor: 'pointer',
  userSelect: 'none',
  fontWeight: isUser ? 500 : 400,
}));

const RoleColumn = styled(SkyBox)({
  width: 100,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexShrink: 0,
});
const StyledBodyGridContainer = styled(SkyGrid)(({ theme }) => ({
  padding: theme.spacing(1.5),
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
}));

const RoleCheckBox = styled(SkyCheckbox)(({ theme }) => ({
  padding: theme.spacing(0.5),
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
}));

// const PanelTitleHeader = styled(SkyTypography)(({ theme }) => ({
//   fontSize: "1.25rem",
//   fontWeight: "bold",
//   marginBottom: theme.spacing(2),
//   color: theme.palette.text.primary,
//   flexShrink: 0,
// }));

// const SelectedTableContainer = styled(SkyBox)(({ theme }) => ({
//   marginTop: theme.spacing(2),
//   border: `1px solid ${theme.palette.divider}`,
//   borderRadius: "4px",
//   overflow: "hidden",
//   flex: 1,
//   display: 'flex',
//   flexDirection: 'column',
// }));

// const SelectedTable = styled('table')(({ theme }) => ({
//   width: "100%",
//   borderCollapse: "collapse",
//   backgroundColor: theme.palette.background.paper,
// }));

// const SelectedTh = styled('th', {
//   shouldForwardProp: (prop) => !['$align', '$width'].includes(prop),
// })(({ theme, $align, $width }) => ({
//   backgroundColor: "#0062ac",
//   color: "white",
//   padding: theme.spacing(1.5, 1),
//   fontSize: "13px",
//   border: `1px solid #005a9e`,
//   textAlign: $align || "center",
//   width: $width || "auto",
//   position: "sticky",
//   top: 0,
//   zIndex: 1,
// }));

const SelectedTd = styled('td', {
  shouldForwardProp: (prop) => prop !== 'align',
})(({ theme, align }) => ({
  padding: theme.spacing(1.5, 1),
  fontSize: "14px",
  border: `1px solid ${theme.palette.divider}`,
  textAlign: align || "left",
  color: theme.palette.text.primary,
}));

const NoSelectionTd = styled(SelectedTd)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  textAlign: 'center',
}));

const ActionIconButton = styled(SkyIconButton)(({ theme }) => ({
  padding: 4,
  '&:hover': {
    color: theme.palette.error.main,
  },
  '& .MuiSvgIcon-root': {
    fontSize: '20px',
  },
}));

// const FooterActions = styled(SkyBox)(({ theme }) => ({
//   display: 'flex',
//   justifyContent: 'flex-end',
//   gap: theme.spacing(2),
//   padding: theme.spacing(2),
//   borderTop: `1px solid ${theme.palette.divider}`,
//   flexShrink: 0,
// }));

// const PrimaryButton = styled('button')(({ theme }) => ({
//   backgroundColor: theme.palette.primary.main,
//   color: 'white',
//   padding: '8px 24px',
//   borderRadius: '4px',
//   border: 'none',
//   cursor: 'pointer',
//   fontWeight: 'bold',
//   fontSize: '14px',
//   '&:hover': {
//     backgroundColor: theme.palette.primary.dark,
//   },
// }));

// const DangerButton = styled('button')(() => ({
//   backgroundColor: '#d32f2f',
//   color: 'white',
//   padding: '8px 24px',
//   borderRadius: '4px',
//   border: 'none',
//   cursor: 'pointer',
//   fontWeight: 'bold',
//   fontSize: '14px',
//   '&:hover': {
//     backgroundColor: '#b71c1c',
//   },
// }));
const StyledTable = styled(SkyTable)(({ theme }) => ({
  borderCollapse: 'separate',
  width: '100%',
  minWidth: 'auto',
  '& td, & th': {
    border: `1px solid ${theme.palette.divider}`,
    borderTop: 'none', // Tránh double border khi kết hợp với sticky header
    borderLeft: 'none',
    padding: '10px 12px',
    fontSize: '13px',
  },
  // Thêm lại border cho phần bên trái và trên cùng của bảng
  '& tr td:first-of-type, & tr th:first-of-type': {
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  '& thead tr:first-of-type th': {
    borderTop: `1px solid ${theme.palette.divider}`,
  }
}));
const StyledTableHead = styled(SkyTableHead)(({ theme }) => ({
  backgroundColor: "#f8fafd",
  '& th': {
    color: theme.palette.primary.main, // Blue text as in mockup
    fontWeight: 'bold',
    textAlign: 'center',
  }
}));

// const StyledOrderText = styled('span')(({ theme,  }) => ({
//   fontWeight: 'bold',
//   textAlign: 'center',
//   display: 'block',
//   // Số thứ tự 3 có màu xanh lá như ảnh mẫu
//   color:  theme.palette.text.primary,
// }));

const HeaderRow = styled(SkyTableRow)(() => ({
  backgroundColor: "#f8fafd",
  "&:hover": {
    backgroundColor: "#f8fafd",
  },
}));

const HeaderCell = styled(SkyTableCell)(({ theme }) => ({
  fontWeight: 600,
  fontSize: 14,
  color: theme.palette.primary.main,
  padding: "10px 16px",
  backgroundColor: "#f8fafd",
}));

// --- Helper Components ---

const SelectedRow = ({ item, idx, onRemove }) => {
  const handleRemoveClick = useCallback(() => {
    onRemove(item.id || item._id);
  }, [onRemove, item]);

  return (
    <tr>
      <SelectedTd align="center">{idx + 1}</SelectedTd>
      <SelectedTd>{item.name || item.title}</SelectedTd>
      <SelectedTd align="center">
        <ActionIconButton onClick={handleRemoveClick}>
          <DeleteIcon />
        </ActionIconButton>
      </SelectedTd>
    </tr>
  );
};

SelectedRow.propTypes = {
  item: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
};

// --- Helper Functions ---

const removeDiacritics = (str) => {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
};

const formatNodeId = (node) => node.id || node._id;

// --- Components ---

const CustomTreeItem = ({ node, level, searchTerm, onToggle, isSelected }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const isUser = node.types === 'user';
  const hasChildren = useMemo(() => (node.children && node.children.length > 0) || (node.users && node.users.length > 0), [node]);
  const matchesSearch = useMemo(() => {
    const trimmed = (searchTerm || "").trim();
    return !trimmed || removeDiacritics(node.name || node.title).includes(removeDiacritics(trimmed));
  }, [node, searchTerm]);
  
  const hasVisibleChild = useCallback((n, term) => {
    const trimmed = (term || "").trim();
    const childrenMatch = n.children?.some(child => 
      removeDiacritics(child.name || child.title).includes(removeDiacritics(trimmed)) || 
      hasVisibleChild(child, trimmed)
    );
    const usersMatch = n.users?.some(user => 
      removeDiacritics(user.name || user.title).includes(removeDiacritics(trimmed))
    );
    return childrenMatch || usersMatch;
  }, []);

  const shouldShow = useMemo(() => matchesSearch || (hasChildren && hasVisibleChild(node, searchTerm)), [matchesSearch, hasChildren, hasVisibleChild, node, searchTerm]);

  const handleExpandClick = useCallback((e) => {
    e.stopPropagation();
    if (hasChildren) setExpanded(prev => !prev);
  }, [hasChildren]);

  const handleToggle = useCallback(() => {
    onToggle(node);
  }, [onToggle, node]);

  if (!shouldShow) return null;

  return (
    <SkyBox>
      <TreeItemContainer level={level}>
        <ExpandIconButton hasChildren={hasChildren} onClick={handleExpandClick}>
          {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </ExpandIconButton>
        <TreeItemLabel isUser={isUser} variant="body2" onClick={handleExpandClick}>
          {node.name || node.title}
        </TreeItemLabel>
        <RoleColumn>
          {isUser && (
            <RoleCheckBox 
              size="small" 
              checked={isSelected(formatNodeId(node))} 
              onChange={handleToggle}
            />
          )}
        </RoleColumn>
      </TreeItemContainer>
      {hasChildren && (
        <Collapse in={expanded}>
          {node.children?.map(child => (
            <CustomTreeItem 
              key={formatNodeId(child)} 
              node={child} 
              level={level + 1} 
              searchTerm={searchTerm} 
              onToggle={onToggle}
              isSelected={isSelected}
            />
          ))}
          {node.users?.map(user => (
            <CustomTreeItem 
              key={formatNodeId(user)} 
              node={{ ...user, types: 'user' }} 
              level={level + 1} 
              searchTerm={searchTerm} 
              onToggle={onToggle}
              isSelected={isSelected}
            />
          ))}
        </Collapse>
      )}
    </SkyBox>
  );
};

const SelectIndividualsDialog = ({ open, onClose, onSave, title, roleLabel, initialSelected = [], filterUnitId, delay = 1000 }) => {
  const dispatch = useDispatch();
  const { listUnit: units, loading } = useSelector(state => state.unit);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTermError, setSearchTermError] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);
    return () => clearTimeout(handler);
  }, [searchTerm, delay]);
  const [selectedMap, setSelectedMap] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (open) {
      const extraParams = {
        ...(filterUnitId ? { 'filter[unitId]': filterUnitId } : {}),
        'filter[hasUser]': true
      };
      dispatch(getListUnitLibrary({ limit: 1000, extraParams }));
      const map = {};
      initialSelected.forEach(item => {
          const id = item.id || item._id;
          if (id) map[id] = item;
      });
      setSelectedMap(map);
      setSearchTerm("");
      setSearchTermError("");
    }
  }, [open, initialSelected, dispatch, filterUnitId]);

  const handleToggle = useCallback((node) => {
    const id = formatNodeId(node);
    setSelectedMap(prev => {
      const newMap = { ...prev };
      if (newMap[id]) {
        delete newMap[id];
      } else {
        newMap[id] = node;
      }
      return newMap;
    });
  }, []);

  const isSelected = useCallback((id) => !!selectedMap[id], [selectedMap]);

  const handleRemove = useCallback((id) => {
    setSelectedMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  }, []);

  const handleConfirmSave = useCallback(() => {
    const selected = Object.values(selectedMap);
    if (selected.length === 0) {
      toast("Vui lòng chọn ít nhất một cá nhân", "warning"); // Keeping "phòng ban" as per previous screen's generic warning requirement
      return;
    }
    onSave(selected);
    onClose();
  }, [onSave, onClose, selectedMap, toast]);

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    if (value.length > 500) {
      setSearchTermError("Không được nhập quá 500 ký tự");
      return;
    }
    setSearchTermError("");
    setSearchTerm(value);
  }, []);

  const selectedList = useMemo(() => Object.values(selectedMap), [selectedMap]);

  return (
    <StyledDialog open={open} onClose={onClose} dialogSize="lg" fullWidth>
           <StyledDialogTitle>
          <StyledTitleText component="span">{title || "CHỌN CÁ NHÂN CÓ QUYỀN"}</StyledTitleText>
          <CloseIconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </CloseIconButton>
        </StyledDialogTitle>
      
      <StyleDialogBody>
        <StyledBodyGridContainer container spacing={2}>
          <StyledPanelGridItem item xs={12} md={6}>
          <StyledPanelNoPadding>
          <StyledPanelContent>
          <StyledSearchWrapper>
            {/* Left Panel */}
            <SkyTextField
                
                    fullWidth
                    size="small"
                    placeholder="Tìm kiếm đơn vị, cá nhân..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    error={!!searchTermError}
                    helperText={searchTermError}
                  />
                
                </StyledSearchWrapper>
                <LeftPanelHeader>
                  <HeaderCol>Phòng ban</HeaderCol>
                  <RoleHeaderCol>{roleLabel || "Quyền chỉnh sửa"}</RoleHeaderCol>
                </LeftPanelHeader>

                <PanelContent>
                  {loading ? (
                    <LoadingContainer><CircularProgress /></LoadingContainer>
                  ) : units.length === 0 ? (
                    <NoDataContainer>
                        <NoDataTypography>Không có dữ liệu</NoDataTypography>
                    </NoDataContainer>
                  ) : (
                    units.map(node => (
                      <CustomTreeItem 
                        key={formatNodeId(node)} 
                        node={node} 
                        level={0} 
                        searchTerm={debouncedSearchTerm} 
                        onToggle={handleToggle}
                        isSelected={isSelected}
                      />
                    ))
                  )}
                </PanelContent>
              </StyledPanelContent>
              </StyledPanelNoPadding>
            </StyledPanelGridItem>

            {/* Right Panel */}
           <StyledPanelGridItem item xs={12} md={6}>
              <StyledPanelNoPadding>
                <StyledPanelHeaderWrapper>
                  <StyledHeaderIcon>
                    <PersonAddIcon />
                  </StyledHeaderIcon>
                  <StyledPanelTitleLeft>
                    Danh sách đã chọn có quyền xem thư mục
                  </StyledPanelTitleLeft>
                </StyledPanelHeaderWrapper>
                <StyledPanelContent>
                  <StyledTableContainer>
                    <StyledTable size="small">
                      <StyledTableHead>
                        <HeaderRow>
                          <HeaderCell widthd="50px">STT</HeaderCell>
                          <HeaderCell align="left">Họ và tên</HeaderCell>
                          <HeaderCell widthd="80px">Bỏ chọn</HeaderCell>
                           </HeaderRow>
                       </StyledTableHead>
                      <tbody>
                        {selectedList.length === 0 ? (
                          <tr>
                            <NoSelectionTd colSpan={4}>
                              Chưa có cá nhân nào được chọn
                            </NoSelectionTd>
                          </tr>
                        ) : (
                          selectedList.map((item, idx) => (
                            <SelectedRow 
                              key={formatNodeId(item)} 
                              item={item} 
                              idx={idx} 
                              onRemove={handleRemove} 
                            />
                          ))
                        )}
                      </tbody>
                        </StyledTable>
                                 </StyledTableContainer>
                                 </StyledPanelContent>
                               </StyledPanelNoPadding>
                             </StyledPanelGridItem>
                           </StyledBodyGridContainer>
                         </StyleDialogBody>

          
              <StyleBoxFoodterEnd>
                    <StyledRowBox>
                      <CancelButton onClick={onClose}>HUỶ</CancelButton>
                      <SaveButton onClick={handleConfirmSave}>
                        ÁP DỤNG
                      </SaveButton>
                    </StyledRowBox>
                  </StyleBoxFoodterEnd>
    </StyledDialog>
  );
};

SelectIndividualsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  title: PropTypes.string,
  roleLabel: PropTypes.string,
  initialSelected: PropTypes.array,
  filterUnitId: PropTypes.string
};

export default SelectIndividualsDialog;
