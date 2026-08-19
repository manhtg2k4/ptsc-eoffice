import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Box,
  Collapse,
  CircularProgress,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { DialogContainer, LeftPanel, RightPanel } from "./componentStyle/style";
import {
  TreeItemContainer,
  TreeItemLabel,
  StyledCheckbox,
  ExpandIconButton,
  // PanelHeader,
  PanelHeaderTitle,
  PanelHeaderActions,
  PanelContent,
  PanelHeaderActionText,
  // PanelHeaderSecondaryTitle,
  CenteredBox,
  EmptyStateText,
  StatusText,
  SearchBarContainer,
  SaveButton,
  CloseButton,
  StyledDialogReceivingUnit,
  PanelHeaderLeft,
  PanelHeaderRight,
  StyledBoxQuickSelectUser,
  DialogHeaderBar,
  DialogHeaderCloseButton,
  StyledTitleTextDialog,
} from "./componentStyle/ReceivingUnitDialog.style";
import { getDataListUnit } from "@redux/slices/SharedCategory/managementUnitSlice";
import {
  // API_EXTRA_INDUSTRY_UNIT,
  // API_INTRA_INDUSTRY_UNIT,
  // API_FAKE_ORG,
  API_GET_COMMON_SOURCE,
  API_GET_LIST_UNIT,
} from "@EnvironmentFile/constants/urlConfig";

// import api from "@services/api";
import withSharedComponents from "@components/WrapperComponent";
import { getUnitId } from "./constants";
// import api from "@services/api";

const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const hasVisibleNodes = (nodes, term) => {
  if (!term) return nodes.length > 0;
  return nodes.some((node) => {
    const matchesSearch = removeDiacritics(node.name).includes(
      removeDiacritics(term)
    );
    const childrenMatchSearch =
      node.children &&
      node.children.length > 0 &&
      hasVisibleNodes(node.children, term);
    return matchesSearch || childrenMatchSearch;
  });
};

const buildTree = (items) => {
  const tree = [];
  const lookup = {};

  if (!Array.isArray(items)) return tree;

  items.forEach((item) => {
    const id = getUnitId(item);
    if (id) {
      const safeId = String(id).toLowerCase();
      lookup[safeId] = { ...item, children: [] };
    }
  });

  items.forEach((item) => {
    const id = getUnitId(item);
    if (!id) return;

    const safeId = String(id).toLowerCase();
    const parent = item.parent;
    const parentId = (parent && (typeof parent === "object" ? getUnitId(parent) : parent)) || item.parentId;
    const safeParentId = parentId ? String(parentId).toLowerCase() : "";

    if (safeParentId) {
      if (lookup[safeParentId]) {
        lookup[safeParentId].children.push(lookup[safeId]);
      }
    } else {
      tree.push(lookup[safeId]);
    }
  });

  return tree;
};

const hasSelectedDescendants = (node, selectedUnits) => {
  if (!node.children || node.children.length === 0) return false;
  return node.children.some((child) => {
    const childId = String(getUnitId(child) || "").toLowerCase();
    return !!selectedUnits[childId] || hasSelectedDescendants(child, selectedUnits);
  });
};

const CustomTreeItem = ({
  node,
  selectedUnits,
  onToggle,
  searchTerm,
  level = 0,
  isRightPanel = false,
  disabledUnitIds = [],
  parentCode = "",
}) => {
  const [expanded, setExpanded] = useState(() => {
    if (isRightPanel) {
      return hasSelectedDescendants(node, selectedUnits);
    }
    // 1. Root node (level 0) is automatically expanded
    if (level === 0) return true;
    // 2. Node at level 1 with code = "BLDBD" is automatically expanded
    if (level === 1 && node.code && String(node.code).toUpperCase() === "BLDBD") return true;
    // 3. Node at level 2 with code = "CTM" inside "BLDBD" is automatically expanded
    if (
      level === 2 &&
      node.code &&
      String(node.code).toUpperCase() === "CTM" &&
      parentCode &&
      String(parentCode).toUpperCase() === "BLDBD"
    ) {
      return true;
    }
    return false;
  });
  const hasChildren = node.children && node.children.length > 0;
  const nodeId = String(getUnitId(node) || "").toLowerCase();
  const isSelected = !!selectedUnits[nodeId];
  const isDisabled = disabledUnitIds.map(id => String(id).toLowerCase()).includes(nodeId);

  const matchesSearch =
    !searchTerm ||
    removeDiacritics(node.name).includes(removeDiacritics(searchTerm));

  const childrenMatchSearch = (nodeToCheck) => {
    if (!nodeToCheck.children || nodeToCheck.children.length === 0)
      return false;
    return nodeToCheck.children.some(
      (child) =>
        removeDiacritics(child.name).includes(removeDiacritics(searchTerm)) ||
        childrenMatchSearch(child)
    );
  };

  const shouldShow = matchesSearch || childrenMatchSearch(node);

  if (!shouldShow && !isRightPanel) return null;

  // Trong right panel, chỉ hiển thị node nếu nó hoặc con/cháu của nó được chọn
  if (isRightPanel) {
    const hasActiveDescendant = hasSelectedDescendants(node, selectedUnits);
    if (!isSelected && !hasActiveDescendant) return null;
  }

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
    // Không cho phép bỏ chọn những đơn vị bị disable (từ initialSelectedUnits)
    if (isDisabled && isSelected) {
      return;
    }
    if (!isRightPanel || isSelected) {
      onToggle(node);
    }
  };

  return (
    <Box>
      <TreeItemContainer level={level}>
        <TreeItemLabel
          variant="body2"
          isRightPanel={isRightPanel}
          isSelected={isSelected}
          onClick={handleExpandClick}
        >
          {node.name}
          <ExpandIconButton
            size="small"
            onClick={handleExpandClick}
            hasChildren={hasChildren}
          >
            {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
          </ExpandIconButton>
        </TreeItemLabel>
        {(isSelected || !isRightPanel) && (
          <StyledCheckbox
            checked={isSelected}
            onChange={handleCheckboxClick}
            disabled={isDisabled || (isRightPanel && !isSelected)}
          />
        )}
      </TreeItemContainer>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {node.children.map((childNode) => (
            <CustomTreeItem
              key={getUnitId(childNode)}
              node={childNode}
              selectedUnits={selectedUnits}
              onToggle={onToggle}
              searchTerm={searchTerm}
              level={level + 1}
              isRightPanel={isRightPanel}
              disabledUnitIds={disabledUnitIds}
              parentCode={node.code || ""}
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
  isRightPanel: PropTypes.bool,
  disabledUnitIds: PropTypes.array,
  parentCode: PropTypes.string,
};

const getAllDescendants = (node) => {
  let descendants = [node];
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      descendants = [...descendants, ...getAllDescendants(child)];
    });
  }
  return descendants;
};

const ReceivingUnitDialog = ({
  open,
  onClose,
  onSave,
  dialogKey,
  initialSelectedUnits = [],
  disabledInitialUnits = [],
  sharedComponents,
  maxLevel,
}) => {
  const { AsyncAutoCompletes } = sharedComponents;
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const { units, isLoading } = useSelector((state) => {
    const managementUnit = state.unit || {};

    return {
      units: managementUnit.listUnit || [],
      isLoading: managementUnit.loading || false,
    };
  });

  const [localUnits, setLocalUnits] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const finalUnits =
    dialogKey === "internalUnit" || dialogKey === "internalReceivingDept"
      ? units
      : localUnits;
  const finalLoading =
    dialogKey === "internalUnit" || dialogKey === "internalReceivingDept"
      ? isLoading
      : localLoading;

  const [selectedUnits, setSelectedUnits] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [initialSelectedUnitIds, setInitialSelectedUnitIds] = useState([]);
  const [selectedQuickSelectUser, setSelectedQuickSelectUser] = useState(null);
  const [quickSelectedIds, setQuickSelectedIds] = useState([]); // NEW

  // logger.log("selectedQuickSelectUser", selectedQuickSelectUser);
  // const [selectAllDonVi, setSelectAllDonVi] = useState(false);

  const handleOpenDialog = useCallback(() => {
    // const fetchAgencies = async (url) => {
    //   setLocalLoading(true);
    //   try {
    //     const response = await api.get(url);
    //     setLocalUnits(response?.data?.data || []);
    //   } catch (error) {
    //     logger.error("Failed to fetch agencies:", error);
    //     setLocalUnits([]);
    //   } finally {
    //     setLocalLoading(false);
    //   }
    // };

    if (dialogKey === "internalUnit" || dialogKey === "internalReceivingDept") {
      const extraParams = maxLevel !== undefined ? { maxLevel } : {};
      dispatch(getDataListUnit({ page: 1, limit: 500, apiUrl: API_GET_LIST_UNIT, extraParams }));
    } 
    // else if (dialogKey === "externalDepartment") {
    //   // fetchAgencies(API_EXTRA_INDUSTRY_UNIT);
    // } else if (dialogKey === "internalDepartment") {
    //   // fetchAgencies(API_INTRA_INDUSTRY_UNIT);
    // }
      setLocalLoading(true);

    let map = {};
    if (initialSelectedUnits.length > 0) {
      initialSelectedUnits.forEach((u) => {
        const id = getUnitId(u);
        if (id) {
          map[String(id).toLowerCase()] = u;
        }
      });
    }

    // Only units from disabledInitialUnits should be locked (disabled)
    const disabledIds = [];
    if (disabledInitialUnits.length > 0) {
      disabledInitialUnits.forEach((u) => {
        const id = getUnitId(u);
        if (id) disabledIds.push(String(id).toLowerCase());
      });
    }

    setSelectedUnits(map);
    setInitialSelectedUnitIds(disabledIds);
    setSearchTerm("");
    if (isMobile) {
      setLeftPanelOpen(true);
      setRightPanelOpen(false);
    } else {
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogKey, dispatch, isMobile, JSON.stringify(initialSelectedUnits)]);

  useEffect(() => {
    if (open) {
      handleOpenDialog();
    } else {
      setSelectedUnits({});
      setLocalUnits([]);
      setSelectedQuickSelectUser(null);
      setQuickSelectedIds([]); // sẽ tạo ở phần 2
    }
  }, [open, handleOpenDialog]);

  const handleCloseDialog = () => {
    setSelectedQuickSelectUser(null);
    setQuickSelectedIds([]);
    onClose();
  };

  const unitTree = useMemo(() => {
    if (!Array.isArray(finalUnits) || finalUnits.length === 0) {
      return [];
    }
    return buildTree(finalUnits);
  }, [finalUnits]);

  const visibleNodesExist = useMemo(() => {
    if (!unitTree.length) return false;
    return hasVisibleNodes(unitTree, searchTerm);
  }, [unitTree, searchTerm]);

  // const getAllUnitsFlat = (nodes) => {
  //   let allUnits = [];
  //   nodes.forEach((node) => {
  //     allUnits = [...allUnits, ...getAllDescendants(node)];
  //   });
  //   return allUnits;
  // };

  // useEffect(() => {
  //   const allUnits = getAllUnitsFlat(unitTree);
  const handleToggle = (unit) => {
    const newSelected = { ...selectedUnits };
    const unitId = unit ? String(getUnitId(unit) || "").toLowerCase() : "";

    // Tìm node trong tree để lấy thông tin children
    const findNodeInTree = (nodes, id) => {
      for (let node of nodes) {
        const nodeId = String(getUnitId(node) || "").toLowerCase();
        if (nodeId === id) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeInTree(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const nodeInTree = findNodeInTree(unitTree, unitId);

    if (newSelected[unitId]) {
      // Bỏ chọn: xóa node và tất cả con của nó
      if (nodeInTree) {
        const descendants = getAllDescendants(nodeInTree);
        descendants.forEach((desc) => {
          delete newSelected[String(getUnitId(desc) || "").toLowerCase()];
        });
      }
    } else {
      // Chọn: thêm node và tất cả con của nó
      if (nodeInTree) {
        const descendants = getAllDescendants(nodeInTree);
        descendants.forEach((desc) => {
          newSelected[String(getUnitId(desc) || "").toLowerCase()] = desc;
        });
      }
    }

    setSelectedUnits(newSelected);

    // Cập nhật trạng thái selectAllDonVi
    // const allUnits = getAllUnitsFlat(unitTree);
    // const allDonViNhan = allUnits.filter((u) => !u.parent);
    // const allDonViSelected = allDonViNhan.every((u) => newSelected[u._id]);
    // setSelectAllDonVi(allDonViSelected);
  };

  // const handleSelectAllDonVi = (e) => {
  //   const checked = e.target.checked;
  //   setSelectAllDonVi(checked);

  //   const newSelected = { ...selectedUnits };
  //   const allUnits = getAllUnitsFlat(unitTree);
  //   const allDonViNhan = allUnits.filter((u) => !u.parent);

  //   if (checked) {
  //     // Chọn tất cả đơn vị nhận (root nodes)
  //     allDonViNhan.forEach((unit) => {
  //       const descendants = getAllDescendants(unit);
  //       descendants.forEach((desc) => {
  //         newSelected[desc._id] = desc;
  //       });
  //     });
  //   } else {
  //     // Bỏ chọn tất cả
  //     allUnits.forEach((unit) => {
  //       delete newSelected[unit._id];
  //     });
  //   }

  //   setSelectedUnits(newSelected);
  // };

  // const handleSave = () => {
  // 	const selectedIds = Object.keys(selectedUnits);
  // 	logger.log('selectedIds', selectedIds)
  //   onSave(selectedIds);
  //   onClose();
  // };

  const handleSave = () => {
    logger.log("selectedUnits", selectedUnits);
    onSave(Object.values(selectedUnits));
    handleCloseDialog();
  };

  // const handleSearch = () => {
  //   // Search is handled in CustomTreeItem
  // };

  const handleSearchTermChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleToggleLeftPanel = () => {
    setLeftPanelOpen(!leftPanelOpen);
    setRightPanelOpen(leftPanelOpen); // Mở ô phải nếu ô trái sắp bị đóng
  };

  const handleToggleRightPanel = () => {
    setRightPanelOpen(!rightPanelOpen);
    setLeftPanelOpen(rightPanelOpen); // Mở ô trái nếu ô phải sắp bị đóng
  };
  // logger.log("unitTree", unitTree);

  const handleQuickSelectUserChange = useCallback(
    (value) => {
      // 1) set UI value
      setSelectedQuickSelectUser(value);

      const selectedValue =
        value && value.value !== undefined ? value.value : value;

      // Nếu clear selection (null) thì remove hết nhóm quickSelectedIds cũ (trừ locked) và thoát
      const lockedIds = (initialSelectedUnitIds || []).map(id => String(id).toLowerCase());

      // Helper: find node
      const findNodeInTree = (nodes, id) => {
        for (let node of nodes) {
          const nodeId = String(getUnitId(node) || "").toLowerCase();
          if (nodeId === id) return node;
          if (node.children && node.children.length > 0) {
            const found = findNodeInTree(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      // Helper: collect ids include descendants
      const collectIdsWithDescendants = (rootIds) => {
        const ids = new Set();
        rootIds.forEach((id) => {
          const node = findNodeInTree(unitTree, id);
          if (node) {
            const descendants = getAllDescendants(node);
            descendants.forEach((d) => ids.add(String(getUnitId(d) || "").toLowerCase()));
          }
        });
        return Array.from(ids);
      };

      // 2) Remove nhóm quick cũ khỏi selectedUnits (không đụng locked)
      const newSelected = { ...selectedUnits };
      quickSelectedIds.forEach((id) => {
        const safeId = String(id).toLowerCase();
        if (!lockedIds.includes(safeId)) {
          delete newSelected[safeId];
        }
      });

      // Nếu không có selectedValue (user clear) -> chỉ remove nhóm cũ và set state
      if (!selectedValue) {
        setSelectedUnits(newSelected);
        setQuickSelectedIds([]);
        return;
      }

      // 3) Find matched root ids by type
      const flatUnits = Array.isArray(finalUnits) ? finalUnits : [];
      const matchedRootIds = flatUnits
        .filter(
          (u) =>
            String(u.type || "")
              .toLowerCase()
              .trim() === String(selectedValue).toLowerCase().trim()
        )
        .map((u) => String(getUnitId(u) || "").toLowerCase())
        .filter(Boolean);

      if (matchedRootIds.length === 0) {
        // Không match gì thì chỉ remove nhóm cũ
        setSelectedUnits(newSelected);
        setQuickSelectedIds([]);
        return;
      }

      // 4) Expand to descendants
      const idsToAdd = collectIdsWithDescendants(matchedRootIds);

      // 5) Add vào selectedUnits
      idsToAdd.forEach((id) => {
        // tìm node theo id để lưu object; nếu không tìm được thì fallback từ flatUnits
        const node = findNodeInTree(unitTree, id);
        if (node) newSelected[id] = node;
        else {
          const fallback = flatUnits.find((x) => String(getUnitId(x) || "").toLowerCase() === id);
          if (fallback) newSelected[id] = fallback;
        }
      });

      // 6) Nếu id được quick select trùng lockedIds thì locked vẫn giữ disable như bình thường
      // (không cần “bỏ disable” nữa vì requirement mới chỉ nói chọn nhanh, không nói mở khóa)

      setSelectedUnits(newSelected);
      setQuickSelectedIds(idsToAdd);
    },
    [
      finalUnits,
      unitTree,
      selectedUnits,
      quickSelectedIds,
      initialSelectedUnitIds,
    ]
  );

  return (
    <StyledDialogReceivingUnit open={open} onClose={handleCloseDialog}>
      <DialogContainer>
        <DialogTitle>CHỌN ĐƠN VỊ NHẬN</DialogTitle>
        <DialogHeaderBar>
          <StyledTitleTextDialog>CHỌN ĐƠN VỊ NHẬN</StyledTitleTextDialog>
          <DialogHeaderCloseButton onClick={handleCloseDialog} aria-label="Đóng">
            <CloseIcon />
          </DialogHeaderCloseButton>
        </DialogHeaderBar>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Left Panel */}
            <Grid item xs={12} md={6}>
              <LeftPanel>
                <SearchBarContainer>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Tìm kiếm đơn vị"
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    size="small"
                  />
                  {/* <SearchButton onClick={handleSearch}>
              <SearchIcon />
            </SearchButton> */}
                </SearchBarContainer>
                {/* Header row for Left Panel - Truyền dialogKey vào */}
                <PanelHeaderLeft dialogKey={dialogKey}>
                  <PanelHeaderTitle variant="subtitle2">
                    Phòng ban
                    {isMobile && (
                      <IconButton size="small" onClick={handleToggleLeftPanel}>
                        {leftPanelOpen ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    )}
                  </PanelHeaderTitle>
                  <PanelHeaderActions>
                    {!isMobile && (
                      <PanelHeaderActionText variant="subtitle2">
                        Đơn vị nhận
                      </PanelHeaderActionText>
                    )}
                    {/* <StyledCheckbox
                      checked={selectAllDonVi}
                      onChange={handleSelectAllDonVi}
                      title="Chọn tất cả đơn vị"
                    /> */}
                  </PanelHeaderActions>
                </PanelHeaderLeft>
                <Collapse
                  in={!isMobile || leftPanelOpen}
                  timeout="auto"
                  unmountOnExit
                >
                  <PanelContent>
                    {finalLoading ? (
                      <CenteredBox>
                        <CircularProgress />
                      </CenteredBox>
                    ) : !visibleNodesExist ? (
                      <CenteredBox>
                        <StatusText>Không có dữ liệu</StatusText>
                      </CenteredBox>
                    ) : (
                      unitTree.map((node) => (
                        <CustomTreeItem
                          key={getUnitId(node)}
                          node={node}
                          selectedUnits={selectedUnits}
                          onToggle={handleToggle}
                          searchTerm={searchTerm}
                          isRightPanel={false}
                          disabledUnitIds={initialSelectedUnitIds}
                        />
                      ))
                    )}
                  </PanelContent>
                </Collapse>
              </LeftPanel>
            </Grid>

            {/* Right Panel */}
            <Grid item xs={12} md={6}>
              <RightPanel>
                <StyledBoxQuickSelectUser>
                  <AsyncAutoCompletes
                    fullWidth
                    label="Tự động chọn đơn vị nhận"
                    placeholder="DVTT/CTC/..."
                    value={selectedQuickSelectUser}
                    url={`${API_GET_COMMON_SOURCE}/S001`}
                    queryParam="title"
                    optionLabel="title"
                    optionValue="value"
                    onChange={handleQuickSelectUserChange}
                  />
                </StyledBoxQuickSelectUser>
                <PanelHeaderRight dialogKey={dialogKey}>
                  <PanelHeaderTitle variant="subtitle2">
                    Phòng ban
                    {isMobile && (
                      <IconButton size="small" onClick={handleToggleRightPanel}>
                        {rightPanelOpen ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    )}
                  </PanelHeaderTitle>
                  {!isMobile && (
                    <PanelHeaderActionText variant="subtitle2">
                      Đơn vị nhận
                    </PanelHeaderActionText>
                  )}
                </PanelHeaderRight>
                <Collapse
                  in={!isMobile || rightPanelOpen}
                  timeout="auto"
                  unmountOnExit
                >
                  <PanelContent>
                    {Object.values(selectedUnits).length === 0 ? (
                      <CenteredBox>
                        <EmptyStateText variant="body2">
                          Chưa có đơn vị nào được chọn
                        </EmptyStateText>
                      </CenteredBox>
                    ) : (
                      unitTree.map((node) => (
                        <CustomTreeItem
                          key={getUnitId(node)}
                          node={node}
                          selectedUnits={selectedUnits}
                          onToggle={handleToggle}
                          searchTerm=""
                          isRightPanel
                          disabledUnitIds={initialSelectedUnitIds}
                        />
                      ))
                    )}
                  </PanelContent>
                </Collapse>
              </RightPanel>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <SaveButton onClick={handleSave}>LƯU</SaveButton>
          <CloseButton onClick={onClose}>ĐÓNG</CloseButton>
        </DialogActions>
      </DialogContainer>
    </StyledDialogReceivingUnit>
  );
};

ReceivingUnitDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  disabledInitialUnits: PropTypes.array,
};

export default withSharedComponents(ReceivingUnitDialog);
