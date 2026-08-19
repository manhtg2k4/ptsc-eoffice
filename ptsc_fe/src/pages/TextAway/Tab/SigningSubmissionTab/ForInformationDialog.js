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
} from "./componentStyle/ReceivingUnitDialog.style";
import {
  getDataListUnit,
  getFullUsers,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { useToast } from "@components/common/ToastProvider";
import { removeVietnameseTones } from "@utils/Common/Common";
import { getUnitId } from "./constants";
// import api from "@services/api";

const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

// const buildTree = (items) => {
//   const tree = [];
//   const lookup = {};

//   if (!Array.isArray(items)) return tree;

//   items.forEach((item) => {
//     lookup[item._id] = { ...item, children: [] };
//   });

//   items.forEach((item) => {
//     if (item.parent && lookup[item.parent]) {
//       lookup[item.parent].children.push(lookup[item._id]);
//     } else {
//       tree.push(lookup[item._id]);
//     }
//   });

//   return tree;
// };

const CustomTreeItem = ({
  node,
  selectedUnits,
  onToggle,
  searchTerm,
  level = 0,
  isRightPanel = false,
}) => {
  const [expanded, setExpanded] = useState(true);
  // const hasChildren = node.children && node.children.length > 0;
  const hasChildren = !!(node?.child?.length > 0 || node?.children?.length > 0);
  const isSelected = !!selectedUnits[getUnitId(node)];
  // const isSelected = !!selectedUnits[node._id || node.id];

  const matchesSearch =
    !searchTerm ||
    removeDiacritics(node.name).includes(removeDiacritics(searchTerm));

  const childrenMatchSearch = (nodeToCheck) => {
    if (!nodeToCheck.child || nodeToCheck.child.length === 0) return false;
    return nodeToCheck.child.some(
      (child) =>
        removeDiacritics(child.name).includes(removeDiacritics(searchTerm)) ||
        childrenMatchSearch(child)
    );
  };

  const shouldShow = matchesSearch || childrenMatchSearch(node);

  if (!shouldShow && !isRightPanel) return null;

  if (isRightPanel) {
    const hasSelectedDescendant = (n) => {
      const children = n.child || n.children || [];
      for (const child of children) {
        if (selectedUnits[getUnitId(child)]) return true;
        if (hasSelectedDescendant(child)) return true;
      }
      return false;
    };
    if (!isSelected && !hasSelectedDescendant(node)) return null;
  }

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (hasChildren) {
      setExpanded(!expanded);
    }
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
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
          isUser={node.types === "user"}
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
            disabled={isRightPanel && !isSelected}
          />
        )}
      </TreeItemContainer>
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {(node.child || node.children || []).map((childNode) => (
            // {node.children.map((childNode) => (
            <CustomTreeItem
              key={getUnitId(childNode)}
              // key={childNode._id || childNode.id}
              node={childNode}
              selectedUnits={selectedUnits}
              onToggle={onToggle}
              searchTerm={searchTerm}
              level={level + 1}
              isRightPanel={isRightPanel}
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
};

const ForInformationDialog = ({
  open,
  onClose,
  onSave,
  dialogKey,
  initialSelectedUnits = [],
}) => {
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
  const toast = useToast();
  const finalUnits = dialogKey === "knowReceivers" ? units : localUnits;
  const finalLoading = dialogKey === "knowReceivers" ? isLoading : localLoading;
  const [selectedUnits, setSelectedUnits] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dataUsers, setDataUsers] = useState([]);
  // const [selectAllDonVi, setSelectAllDonVi] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const isFirstOpen = React.useRef(true);

  const fetchData = useCallback(async (query = "") => {
    try {
      const res = await dispatch(
        getFullUsers({
          page: 1,
          limit: 1000,
          query,
          code: query ? ["name", "username"] : undefined
        })
      ).unwrap();
      setDataUsers(res);
    } catch (error) {
      logger.log("Lỗi khi lấy danh sách người dùng!", error);
      toast("Lỗi khi lấy danh sách người dùng!", "error");
    }
  }, [dispatch, toast]);

  useEffect(() => {
    if (!open) {
      isFirstOpen.current = true;
      setSelectedUnits({});
      setLocalUnits([]);
      setLocalLoading(false);
      return;
    }

    if (isFirstOpen.current) {
      isFirstOpen.current = false;

      let map = {};
      if (initialSelectedUnits.length > 0) {
        initialSelectedUnits.forEach((u) => {
          map[getUnitId(u)] = u;
        });
      }

      setSelectedUnits(map);
      setSearchTerm("");
      
      if (isMobile) {
        setLeftPanelOpen(true);
        setRightPanelOpen(false);
      } else {
        setLeftPanelOpen(true);
        setRightPanelOpen(true);
      }
    }
  }, [open, isMobile, initialSelectedUnits]);

  useEffect(() => {
    if (!open) return;

    if (dialogKey === "knowReceivers") {
      dispatch(
        getDataListUnit({
          page: 1,
          limit: 500,
          query: debouncedSearchTerm,
          code: debouncedSearchTerm ? ["name"] : undefined,
        })
      );
    }

    fetchData(debouncedSearchTerm);
  }, [open, dialogKey, dispatch, debouncedSearchTerm, fetchData]);

  // const unitTree = useMemo(() => {
  //   if (!Array.isArray(finalUnits) || finalUnits.length === 0) {
  //     return [];
  //   }
  //   return buildTree(finalUnits);
  // }, [finalUnits]);

  const buildUnitTree = useCallback((units, parentId = null) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(safeUnits, getUnitId(u)), // Truyền safeUnits thay vì units
        // child: buildUnitTree(safeUnits, u._id), // Truyền safeUnits thay vì units
        types: "company",
      }));
  }, []);
  const [searchKDV] = useState(null);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!dataUsers || !finalUnits) return [];
    const organizationTree = buildUnitTree(finalUnits || []);
    const searchUnits = removeVietnameseTones(debouncedSearchTerm || "");

    const filterUnits = (units, kdvId) => {
      for (const unit of units) {
        if (getUnitId(unit) === kdvId) return [unit];
        // if (unit._id === kdvId || unit.id === kdvId) return [unit];
        if (unit.child && unit.child.length > 0) {
          const found = filterUnits(unit.child, kdvId);
          if (found.length > 0) return found;
        }
      }
      return [];
    };
  const hasUserInSubTree = (nodes = []) => {
      return nodes.some((node) => {
        if (node?.types === "user") return true;
        if (Array.isArray(node?.child) && node.child.length > 0) {
          return hasUserInSubTree(node.child);
        }
        return false;
      });
    };

    const processUnits = (units, users, parentMatched = false) => {
      return units
        .map((unit) => {
          // Kiểm tra xem unit có match searchTerm không
          const unitMatched =
            debouncedSearchTerm &&
            unit.name &&
            removeVietnameseTones(unit.name).includes(searchUnits);

          // Nếu parent đã match hoặc unit hiện tại match, lấy tất cả children
          const shouldIncludeAll = parentMatched || unitMatched;

          const matchedUsers = users?.filter(
            (user) => user?.parent === (getUnitId(unit))
            // (user) => user?.parent === (unit?._id ?? unit?.id)
          );
          let userNodes = matchedUsers.map((user) => {
            return {
              ...user,
              types: "user",
            };
          });

          // Nếu không có parent/unit match, filter users theo searchTerm
          if (debouncedSearchTerm && !shouldIncludeAll) {
            userNodes = userNodes.filter(
              (user) =>
                (user.name && removeVietnameseTones(user.name).includes(searchUnits)) ||
                (user.username && removeVietnameseTones(user.username).includes(searchUnits))
            );
          }

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          // Truyền shouldIncludeAll xuống để child units cũng được include
          const childProcessed = processUnits(
            childUnits,
            users,
            shouldIncludeAll
          );

          const hasRelevantData =
            shouldIncludeAll ||
            userNodes.length > 0 ||
            childProcessed.length > 0;

          if (debouncedSearchTerm && !hasRelevantData) return null;

          // Kiểm tra xem unit có user nào không (bao gồm cả user trong child units)
          // const hasUsers =
          //   userNodes.length > 0 ||
          //   childProcessed.some((child) => {
          //     // Kiểm tra xem child có user không
          //     return child?.child?.some((item) => item.types === "user");
          //   });
         const hasUsers = userNodes.length > 0 || hasUserInSubTree(childProcessed);

          // Nếu canTransferRoom = false và không có user nào, ẩn phòng ban
          if (!hasUsers) return null;

          return {
            ...unit,
            child: [...userNodes, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

    // searchKDV có thể là string (ID) hoặc object với _id/id
    const kdvId =
      typeof searchKDV === "string"
        ? searchKDV
        : getUnitId(searchKDV)
        // : searchKDV?._id || searchKDV?.id;
    const rootUnits = kdvId
      ? filterUnits(organizationTree, kdvId)
      : organizationTree;
    return processUnits(rootUnits, dataUsers);
  }, [finalUnits, dataUsers, debouncedSearchTerm, searchKDV, buildUnitTree]);

  // const getAllDescendants = (node) => {
  //   let result = [node];
  //   const children = node.child || node.children || [];
  //   children.forEach((child) => {
  //     result = result.concat(getAllDescendants(child));
  //   });
  //   return result;
  // };

  const findNodeInTree = (nodes, id) => {
    for (let n of nodes) {
      if (getUnitId(n) === id) return n;
      // if (n._id === id || n.id === id) return n;

      const children = n.child || n.children || [];
      if (children.length > 0) {
        const found = findNodeInTree(children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getDirectItems = (node) => {
    const result = [node];
    const children = node.child || node.children || [];
    children.forEach((child) => {
      if (child.types === "user" || child.type === "file") {
        result.push(child);
      }
    });
    return result;
  };

  const handleToggle = (node) => {
    const key = getUnitId(node);
    // const key = node._id || node.id;
    const newSelected = { ...selectedUnits };
    // Sử dụng dataMergeUserAndUnit để tìm node vì nó chứa cả user và unit
    const nodeInTree = findNodeInTree(dataMergeUserAndUnit, key);
    if (!nodeInTree) {
      logger.warn("Node not found in tree:", key);
      return;
    }

    const isCompany = nodeInTree.types === "company" || nodeInTree.type === "folder";
    const itemsToToggle = isCompany ? getDirectItems(nodeInTree) : [nodeInTree];

    if (newSelected[key]) {
      // ❌ BỎ CHỌN: xóa node + toàn bộ con trực tiếp
      itemsToToggle.forEach((d) => {
        delete newSelected[getUnitId(d)];
        // delete newSelected[d._id || d.id];
      });

      // Bỏ chọn các cha (ancestors) nếu đang được chọn
      let currentParentId = nodeInTree.parent;
      while (currentParentId) {
        if (newSelected[currentParentId]) {
          const parentNode = newSelected[currentParentId];
          delete newSelected[currentParentId];
          currentParentId = parentNode.parent;
        } else {
          break;
        }
      }
    } else {
      // ✅ CHỌN: thêm node + toàn bộ con trực tiếp
      itemsToToggle.forEach((d) => {
        newSelected[getUnitId(d)] = d;
        // newSelected[d._id || d.id] = d;
      });
    }

    setSelectedUnits(newSelected);
  };

  const handleSave = () => {
    onSave(Object.values(selectedUnits));
    onClose();
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

  return (
    <StyledDialogReceivingUnit open={open} onClose={onClose}>
      <DialogContainer>
        <DialogTitle>CHỌN NƠI NHẬN ĐỂ BIẾT</DialogTitle>
        <DialogContent>
          <Grid container>
            {/* Left Panel */}
            <Grid item xs={12} md={6}>
              <LeftPanel>
                <SearchBarContainer>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Tìm kiếm đơn vị, cá nhân..."
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
                        Nhận để biết
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
                    ) : dataMergeUserAndUnit.length === 0 ? (
                      <CenteredBox>
                        <StatusText>
                          {dataMergeUserAndUnit.length === 0
                            ? "Không có dữ liệu"
                            : "Đang xử lý dữ liệu..."}
                        </StatusText>
                      </CenteredBox>
                    ) : (
                      dataMergeUserAndUnit.map((node) => (
                        <CustomTreeItem
                          key={getUnitId(node)}
                          // key={node._id || node.id}
                          node={node}
                          selectedUnits={selectedUnits}
                          onToggle={handleToggle}
                          searchTerm={searchTerm}
                          isRightPanel={false}
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
                <PanelHeaderRight dialogKey={dialogKey}>
                  <PanelHeaderTitle variant="subtitle2">
                    Tên đơn vị, cá nhân
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
                      Nhận để biết
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
										) :
											( dataMergeUserAndUnit.map((node) => (
                        // unitTree.map((node) => (
                        <CustomTreeItem
                          key={getUnitId(node)}
                          // key={node._id || node.id}
                          node={node}
                          selectedUnits={selectedUnits}
                          onToggle={handleToggle}
                          searchTerm=""
                          isRightPanel
                        />
                      ))
											)
										}
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

ForInformationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ForInformationDialog;
