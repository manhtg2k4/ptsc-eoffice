import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";

import {
  Dialog,
  DialogTitle,
  // DialogContent,
  DialogActions,
  Grid,
  TextField,
  Box,
  Collapse,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { DialogContainer, LeftPanel } from "./componentStyle/style";
import {
  TreeItemContainer,
  TreeItemLabel,
  StyledCheckbox,
  ExpandIconButton,
  PanelHeader,
  PanelHeaderTitle,
  PanelHeaderActions,
  PanelContent,
  PanelHeaderActionText,
  CenteredBox,
  StatusText,
  SearchBarContainer,
  SaveButton,
  CloseButton,
  PaginationContainer,
  PaginationInfo,
  PaginationNav,
  NavButton,
  PageNumber,
  EllipsisText,
  RowsPerPageSelect,
  MenuItemStyled,
  PageSizeSelector,
  LabelText,
  DialogContentStyle,
} from "./componentStyle/ReceivingUnitDialog.style";
import api from "@services/api";
import { API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";

const removeDiacritics = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: theme.breakpoints.values.md, // Giảm kích thước dialog
    width: "100%",
  },
}));

const buildTree = (items) => {
  const tree = [];
  const lookup = {};
  
  if (!Array.isArray(items)) return tree;
  
  items.forEach((item) => {
    lookup[item._id] = { ...item, children: [] };
  });

  items.forEach((item) => {
    if (item.parent && lookup[item.parent]) {
      lookup[item.parent].children.push(lookup[item._id]);
    } else {
      tree.push(lookup[item._id]);
    }
  });
  
  return tree;
};

const CustomTreeItem = ({ node, selectedUnits, onToggle, searchTerm, level = 0 }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = !!selectedUnits[node._id];

  const matchesSearch = !searchTerm || removeDiacritics(node.name).includes(removeDiacritics(searchTerm));
  
  const childrenMatchSearch = (nodeToCheck) => {
    if (!nodeToCheck.children || nodeToCheck.children.length === 0) return false
    return nodeToCheck.children.some(child => 
      removeDiacritics(child.name).includes(removeDiacritics(searchTerm)) ||
      childrenMatchSearch(child)
    );
  };
  
  const shouldShow = matchesSearch || childrenMatchSearch(node);
  
  if (!shouldShow) return null;

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    onToggle(node);
  };

  return (
    <Box>
      <TreeItemContainer level={level}>
        <TreeItemLabel
          variant="body2"
          isSelected={isSelected}
          onClick={handleExpandClick}
        >
          {node.name}
          <ExpandIconButton size="small" onClick={handleExpandClick} hasChildren={hasChildren}>
            {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ExpandIconButton>
        </TreeItemLabel>
        <StyledCheckbox checked={isSelected} onChange={handleCheckboxClick} />
      </TreeItemContainer>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {node.children.map((childNode) => (
            <CustomTreeItem
              key={childNode._id}
              node={childNode}
              selectedUnits={selectedUnits}
              onToggle={onToggle}
              searchTerm={searchTerm}
              level={level + 1}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

CustomTreeItem.propTypes = {
  node: PropTypes.object.isRequired,
  selectedUnits: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  searchTerm: PropTypes.string,
  level: PropTypes.number,
};

const PageItem = React.memo(({ pageNum, isActive, onClick }) => {
  const handleClick = useCallback(() => onClick(pageNum), [onClick, pageNum]);
  return (
    <PageNumber isActive={isActive} onClick={handleClick}>
      {pageNum}
    </PageNumber>
  );
});
PageItem.displayName = "PageItem";

PageItem.propTypes = {
  pageNum: PropTypes.number.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

const SinglePanelReceivingUnitDialog = ({
  open,
  onClose,
  onSave,
  initialSelectedIds = [],
  excludedIds = [],
}) => {
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedUnits, setSelectedUnits] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAllDonVi, setSelectAllDonVi] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      api.get(API_GET_LIST_UNIT, { params: { page, limit: pageSize } })
        .then((res) => {
          const allUnits = res.data?.data || [];
          setUnits(allUnits);
          setTotalItems(res.data?.total || allUnits.length);
        })
        .finally(() => setIsLoading(false));
    } else {
      setUnits([]);
      setSelectedUnits({});
      setSearchTerm("");
      setPage(1);
      setSelectAllDonVi(false);
    }
  }, [open, page, pageSize]);

  // Khởi tạo selectedUnits một lần duy nhất khi Dialog mở
  useEffect(() => {
    if (open) {
      const initialMap = {};
      (initialSelectedIds || []).forEach(id => {
        initialMap[id] = { _id: id, name: id }; 
      });
      setSelectedUnits(initialMap);
    }
  }, [open, initialSelectedIds]);

  // Cập nhật thông tin chi tiết (tên) khi dữ liệu units được nạp về
  useEffect(() => {
    if (units.length > 0) {
      setSelectedUnits(prev => {
        const next = { ...prev };
        let hasChange = false;
        units.forEach(unit => {
          // Chỉ cập nhật nếu đơn vị đang ở trạng thái 'chỉ có ID'
          if (next[unit._id] && next[unit._id].name === unit._id) {
            next[unit._id] = unit;
            hasChange = true;
          }
        });
        return hasChange ? next : prev;
      });
    }
  }, [units]);

  const filteredUnits = useMemo(() => {
    if (!Array.isArray(units)) return [];
    if (excludedIds.length === 0) return units;

    const excludedIdSet = new Set(excludedIds);
    return units.filter(unit => !excludedIdSet.has(unit._id));
  }, [units, excludedIds]);

  const unitTree = useMemo(() => {
    if (!Array.isArray(filteredUnits) || filteredUnits.length === 0) {
      return [];
    }
    return buildTree(filteredUnits);
  }, [filteredUnits]);

  const getAllDescendants = (node) => {
    let descendants = [node];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        descendants = [...descendants, ...getAllDescendants(child)];
      });
    }
    return descendants;
  };
  
  const handleToggle = (unit) => {
    const newSelected = { ...selectedUnits };
    const nodeInTree = unitTree.flatMap(getAllDescendants).find(u => u._id === unit._id);
    
    if (newSelected[unit._id]) {
      if (nodeInTree) {
        const descendants = getAllDescendants(nodeInTree);
        descendants.forEach(desc => delete newSelected[desc._id]);
      }
    } else {
      if (nodeInTree) {
        const descendants = getAllDescendants(nodeInTree);
        descendants.forEach(desc => newSelected[desc._id] = desc);
      }
    }
    setSelectedUnits(newSelected);
  };
  
  const handleSelectAllDonVi = (e) => {
    const checked = e.target.checked;
    setSelectAllDonVi(checked);
    
    const newSelected = { ...selectedUnits };
    const currentPageUnits = unitTree.flatMap(getAllDescendants);
    
    if (checked) {
      currentPageUnits.forEach(unit => {
        newSelected[unit._id] = unit;
      });
    } else {
      currentPageUnits.forEach(unit => {
        delete newSelected[unit._id];
      });
    }
    setSelectedUnits(newSelected);
  };

  const handleSave = () => {
    onSave(Object.values(selectedUnits));
    onClose();
  };

  const handleSearchTermChange = useCallback((event) => {
    setSearchTerm(event.target.value);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setPage(1);
    setPageSize(event.target.value);
  }, []);

  const handlePageClick = useCallback((pageNum) => {
    setPage(pageNum);
  }, []);

  const totalPages = Math.ceil(totalItems / pageSize);
  const startRange = (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, totalItems);

  const pageItems = useMemo(() => {
    const items = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push({ type: 'page', value: i, id: `page-${i}` });
    } else {
      // First 3 pages
      if (page <= 2) {
        items.push(
          { type: 'page', value: 1, id: 'page-1' },
          { type: 'page', value: 2, id: 'page-2' },
          { type: 'page', value: 3, id: 'page-3' },
          { type: 'ellipsis', value: '...', id: 'ellipsis-end' },
          { type: 'page', value: totalPages, id: `page-${totalPages}` }
        );
      } 
      // Last 3 pages
      else if (page >= totalPages - 1) {
        items.push(
          { type: 'page', value: 1, id: 'page-1' },
          { type: 'ellipsis', value: '...', id: 'ellipsis-start' },
          { type: 'page', value: totalPages - 2, id: `page-${totalPages - 2}` },
          { type: 'page', value: totalPages - 1, id: `page-${totalPages - 1}` },
          { type: 'page', value: totalPages, id: `page-${totalPages}` }
        );
      }
      // Middle pages
      else {
        items.push(
          { type: 'page', value: 1, id: 'page-1' },
          { type: 'ellipsis', value: '...', id: 'ellipsis-start' },
          { type: 'page', value: page, id: `page-${page}` },
          { type: 'ellipsis', value: '...', id: 'ellipsis-end' },
          { type: 'page', value: totalPages, id: `page-${totalPages}` }
        );
      }
    }
    return items;
  }, [totalPages, page]);

  const displayLimit = useMemo(() => (
    <PageSizeSelector>
      <LabelText variant="body2">Hiển thị</LabelText>
      <RowsPerPageSelect
        value={pageSize}
        onChange={handleRowsPerPageChange}
        size="small"
      >
        {/* <MenuItemStyled value={10}>10</MenuItemStyled> */}
        <MenuItemStyled value={25}>25</MenuItemStyled>
        <MenuItemStyled value={50}>50</MenuItemStyled>
        <MenuItemStyled value={100}>100</MenuItemStyled>
        <MenuItemStyled value={500}>500</MenuItemStyled>
      </RowsPerPageSelect>
    </PageSizeSelector>
  ), [pageSize, handleRowsPerPageChange]);

  return (
    <StyledDialog open={open} onClose={onClose}>
      <DialogContainer>
        <DialogTitle>Chọn phòng ban </DialogTitle>
        <DialogContentStyle >
          <SearchBarContainer>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Tìm kiếm đơn vị"
              value={searchTerm}
              onChange={handleSearchTermChange}
              size="small"
            />
          </SearchBarContainer>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <LeftPanel>
                <PanelHeader>
                  <PanelHeaderTitle variant="subtitle2">
                    Phòng ban
                  </PanelHeaderTitle>
                  <PanelHeaderActions>
                    <PanelHeaderActionText variant="subtitle2">
                      Chọn
                    </PanelHeaderActionText>
                    <StyledCheckbox checked={selectAllDonVi} onChange={handleSelectAllDonVi} title="Chọn tất cả đơn vị" />
                  </PanelHeaderActions>
                </PanelHeader>

                <PanelContent>
                  {isLoading ? (
                    <CenteredBox><CircularProgress /></CenteredBox>
                  ) : unitTree.length === 0 ? (
                    <CenteredBox><StatusText>Không có dữ liệu</StatusText></CenteredBox>
                  ) : (
                    unitTree.map((node) => (
                      <CustomTreeItem
                        key={node._id}
                        node={node}
                        selectedUnits={selectedUnits}
                        onToggle={handleToggle}
                        searchTerm={searchTerm}
                      />
                    ))
                  )}
                </PanelContent>

                {totalPages > 0 && (
                  <PaginationContainer>
                    <PaginationInfo variant="body2">
                      Tổng {totalItems} {startRange}-{endRange} Bản ghi
                    </PaginationInfo>
                    
                    <PaginationNav>
                      <NavButton 
                        onClick={handlePrevPage} 
                        disabled={page === 1}
                        size="small"
                      >
                        <NavigateBeforeIcon />
                      </NavButton>
                      
                      {pageItems.map((item) => (
                        item.type === 'ellipsis' ? (
                          <EllipsisText key={item.id}>{item.value}</EllipsisText>
                        ) : (
                          <PageItem 
                            key={item.id} 
                            pageNum={item.value}
                            isActive={page === item.value}
                            onClick={handlePageClick}
                          />
                        )
                      ))}
                      
                      <NavButton 
                        onClick={handleNextPage} 
                        disabled={page >= totalPages}
                        size="small"
                      >
                        <NavigateNextIcon />
                      </NavButton>
                    </PaginationNav>

                    {displayLimit}
                  </PaginationContainer>
                )}
              </LeftPanel>
            </Grid>
          </Grid>
        </DialogContentStyle>
        <DialogActions>
          <SaveButton onClick={handleSave}>LƯU</SaveButton>
          <CloseButton onClick={onClose}>ĐÓNG</CloseButton>
        </DialogActions>
      </DialogContainer>
    </StyledDialog>
  );
};

SinglePanelReceivingUnitDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialSelectedIds: PropTypes.array,
  excludedIds: PropTypes.array,
};

export default SinglePanelReceivingUnitDialog;