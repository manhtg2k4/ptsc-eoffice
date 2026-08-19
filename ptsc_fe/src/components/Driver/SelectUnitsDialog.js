import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  CircularProgress,
} from "@mui/material";
import {
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import api from "@services/api";
import { API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  SkyBox,
  SkyTextField,
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
} from "@styles/DialogDirective";

import {
  LeftPanelHeader,
  HeaderCol,
  RoleHeaderCol,
  PanelContent,
  LoadingContainer,
  NoDataContainer,
  NoDataTypography,
  TreeItemContainer,
  ExpandIconButton,
  TreeItemLabel,
  RoleColumn,
  RoleCheckBox,
  SelectedTd,
  NoSelectionTd,
  ActionIconButton,
  StyledBodyGridContainer,
  StyledPanelGridItem,
  StyledPanelNoPadding,
  StyledPanelContent,
  StyledSearchWrapper,
  StyledPanelHeaderWrapper,
  StyledPanelTitleLeft,
  StyledHeaderIcon,
  StyledTableContainer,
  StyledTable,
  StyledTableHead,
  HeaderRow,
  HeaderCell,
  UserNodeIcon,
} from "./SelectUnitsDialog.style";

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
  roleLabel: PropTypes.string,
  onRemove: PropTypes.func.isRequired,
};

// --- Helper Functions ---

const removeDiacritics = (str) => {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
};

const getInitialExpandedUnits = (nodes) => {
  const expanded = {};
  if (!nodes || nodes.length === 0) return expanded;
  
  if (nodes.length === 1) {
    nodes.forEach((rootNode) => {
      const rootId = rootNode.id || rootNode._id;
      expanded[rootId] = true;
    });
  }

  return expanded;
};

const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.data?.data)) return res.data.data.data;
  if (Array.isArray(res.data?.data?.items)) return res.data.data.items;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

const isFunctionalDepartment = (node) => {
  if (node?.code === "CTM") {
    return true;
  }
  const nodeName = node?.name || node?.title || '';
  const nodeNameNoTones = removeDiacritics(nodeName).toLowerCase();
  return nodeNameNoTones.includes("phong chuc nang") && nodeNameNoTones.includes("truc thuoc");
};

const isTypeDisabled = (node) => {
  const nodeType = node?.type || node?.types || node?.orgType || "";
  return nodeType === "Ban" || nodeType === "To";
};

const processNodes = (nodes) => {
  let result = [];
  if (!nodes || !Array.isArray(nodes)) return result;
  nodes.forEach(node => {
    if (isFunctionalDepartment(node)) {
      if (Array.isArray(node.child)) {
        node.child.forEach(c => {
          let processedChild = { ...c };
          if (Array.isArray(processedChild.child)) {
            const sub = processNodes(processedChild.child);
            processedChild.child = sub;
            processedChild.children = sub;
          }
          result.push(processedChild);
        });
      }
    } else {
      let newNode = { ...node };
      if (Array.isArray(newNode.child)) {
        const sub = processNodes(newNode.child);
        newNode.child = sub;
        newNode.children = sub;
      }
      result.push(newNode);
    }
  });
  return result;
};

const formatLibraryTree = (nodes) => {
  const safeNodes = extractArray(nodes);
  const processNodesRecursive = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(node => {
      const formattedUsers = (node.users || []).map(u => ({
        ...u,
        id: u.id || u._id,
        _id: u.id || u._id,
        name: u.name || u.fullName || u.username || u.title || "",
        title: u.name || u.fullName || u.username || u.title || "",
        types: "user",
        type: "user",
      }));
      
      const childUnits = Array.isArray(node.children || node.child)
        ? (node.children || node.child)
        : [];
      const childProcessed = processNodesRecursive(childUnits);
      
      const combinedChildren = [...formattedUsers, ...childProcessed];
      return {
        ...node,
        types: "company",
        child: combinedChildren,
        children: combinedChildren,
      };
    });
  };
  const formatted = processNodesRecursive(safeNodes);
  return processNodes(formatted);
};


const hasAnyDescendantExpandChanged = (item, prevExpanded, nextExpanded) => {
  if (!item) return false;
  const itemId = item._id || item.id;
  if ((prevExpanded?.[itemId] ?? false) !== (nextExpanded?.[itemId] ?? false)) {
    return true;
  }
  if (Array.isArray(item.children)) {
    for (let i = 0; i < item.children.length; i++) {
      if (hasAnyDescendantExpandChanged(item.children[i], prevExpanded, nextExpanded)) {
        return true;
      }
    }
  }
  return false;
};

const hasAnyDescendantSelectionChanged = (item, prevSelected, nextSelected) => {
  if (!item) return false;
  const itemId = item._id || item.id;
  if (Boolean(prevSelected[itemId]) !== Boolean(nextSelected[itemId])) {
    return true;
  }
  if (Array.isArray(item.children)) {
    for (let i = 0; i < item.children.length; i++) {
      if (hasAnyDescendantSelectionChanged(item.children[i], prevSelected, nextSelected)) {
        return true;
      }
    }
  }
  return false;
};

// --- Components ---

const CustomTreeItem = React.memo(function CustomTreeItem({ 
  node, 
  level, 
  searchTerm, 
  onToggle, 
  selectedMap,
  expandedUnits,
  onToggleExpand,
  isParentSelected = false
}) {
  const nodeId = node.id || node._id;
  const nodeName = node.name || node.title;
  const isSelfSelected = Boolean(selectedMap[nodeId]);
  const isChecked = isSelfSelected || isParentSelected;
  const isDisabled = isParentSelected || isTypeDisabled(node);

  const expanded = Boolean(expandedUnits[nodeId]);
  const hasChildren = Boolean(node.children && node.children.length > 0);
  
  const matchesSearch = useMemo(() => {
    const trimmed = (searchTerm || "").trim();
    return !trimmed || removeDiacritics(nodeName).includes(removeDiacritics(trimmed));
  }, [nodeName, searchTerm]);
  
  const hasVisibleChild = useCallback((children) => {
    const trimmed = (searchTerm || "").trim();
    return children.some(child => 
      removeDiacritics(child.name || child.title).includes(removeDiacritics(trimmed)) || 
      (child.children && hasVisibleChild(child.children))
    );
  }, [searchTerm]);

  const shouldShow = useMemo(() => {
    return matchesSearch || (hasChildren && hasVisibleChild(node.children));
  }, [matchesSearch, hasChildren, node.children, hasVisibleChild]);

  const handleExpandClick = useCallback((e) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(nodeId);
    }
  }, [hasChildren, onToggleExpand, nodeId]);

  const handleToggle = useCallback(() => {
    if (isDisabled) return;
    onToggle(node);
  }, [onToggle, node, isDisabled]);

  if (!shouldShow) return null;

  return (
    <SkyBox>
      <TreeItemContainer level={level}>
        <ExpandIconButton hasChildren={hasChildren} onClick={handleExpandClick}>
          {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
        </ExpandIconButton>
        {node.types === "user" ? (
          <UserNodeIcon disabled={isDisabled} />
        ) : null}
        <TreeItemLabel variant="body2" disabled={isDisabled} onClick={handleExpandClick}>
          {nodeName}
        </TreeItemLabel>
        <RoleColumn>
          <RoleCheckBox 
            size="small" 
            checked={isChecked} 
            disabled={isDisabled}
            onChange={handleToggle}
          />
        </RoleColumn>
      </TreeItemContainer>
      {hasChildren && expanded && (
        <SkyBox>
          {node.children.map(child => {
            const childId = child.id || child._id;
            return (
              <CustomTreeItem 
                key={childId} 
                node={child} 
                level={level + 1} 
                searchTerm={searchTerm} 
                onToggle={onToggle}
                selectedMap={selectedMap}
                expandedUnits={expandedUnits}
                onToggleExpand={onToggleExpand}
                isParentSelected={isChecked}
              />
            );
          })}
        </SkyBox>
      )}
    </SkyBox>
  );
}, (prevProps, nextProps) => {
  const nodeId = prevProps.node.id || prevProps.node._id;
  const prevChecked = Boolean(prevProps.selectedMap[nodeId]) || Boolean(prevProps.isParentSelected);
  const nextChecked = Boolean(nextProps.selectedMap[nodeId]) || Boolean(nextProps.isParentSelected);
  const prevExpanded = Boolean(prevProps.expandedUnits[nodeId]);
  const nextExpanded = Boolean(nextProps.expandedUnits[nodeId]);

  return (
    prevProps.node === nextProps.node &&
    prevProps.level === nextProps.level &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.onToggle === nextProps.onToggle &&
    prevProps.onToggleExpand === nextProps.onToggleExpand &&
    prevProps.isParentSelected === nextProps.isParentSelected &&
    prevChecked === nextChecked &&
    prevExpanded === nextExpanded &&
    !hasAnyDescendantSelectionChanged(prevProps.node, prevProps.selectedMap, nextProps.selectedMap) &&
    !hasAnyDescendantExpandChanged(prevProps.node, prevProps.expandedUnits, nextProps.expandedUnits)
  );
});

CustomTreeItem.displayName = "CustomTreeItem";

const SelectUnitsDialog = ({ open, onClose, onSave, title, roleLabel, initialSelected = [], delay = 1000 }) => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchTermError, setSearchTermError] = useState("");
  const [selectedMap, setSelectedMap] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const toast = useToast();
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (open) {
      isFirstRenderRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);
    return () => clearTimeout(handler);
  }, [searchTerm, delay]);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY);
      const rawTree = extractArray(response);
      const formattedTree = formatLibraryTree(rawTree);
      setUnits(formattedTree);
    } catch (error) {
      toast("Không thể tải danh sách đơn vị và người dùng", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchUnits();
      const map = {};
      (initialSelected || []).forEach(id => {
          if (typeof id === 'string') map[id] = { id };
          else if (id && (id.id || id._id)) map[id.id || id._id] = id;
      });
      setSelectedMap(map);
      setSearchTerm("");
      setSearchTermError("");
      setExpandedUnits({});
    }
  }, [open, initialSelected, fetchUnits]);

  // Iterative node collector for high performance without array-spreading garbage collection overhead
  const getAllNodesIterative = useCallback((rootNode) => {
    const result = [];
    const stack = [rootNode];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current) {
        result.push(current);
        if (current.children && current.children.length > 0) {
          for (let i = 0; i < current.children.length; i++) {
            stack.push(current.children[i]);
          }
        }
      }
    }
    return result;
  }, []);

  const handleToggle = useCallback((node) => {
    setSelectedMap(prev => {
      const newMap = { ...prev };
      const id = node.id || node._id;
      const isCurrentlySelected = !!newMap[id];

      if (isCurrentlySelected) {
        delete newMap[id];
      } else {
        newMap[id] = node;
        // Clean up any descendant nodes from selectedMap so only parent remains
        const descendantNodes = getAllNodesIterative(node);
        descendantNodes.forEach(n => {
          const childId = n.id || n._id;
          if (childId !== id) {
            delete newMap[childId];
          }
        });
      }
      
      return newMap;
    });
  }, [getAllNodesIterative]);

  const handleRemove = useCallback((id) => {
    setSelectedMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  }, []);

  const handleConfirmSave = useCallback(() => {
    const selected = Object?.values(selectedMap);
    if (selected.length === 0) {
      toast("Vui lòng chọn ít nhất một phòng ban hoặc người dùng", "warning");
      return;
    }
    const selectedUnits = selected.filter(item => item.types !== "user");
    const selectedUsers = selected.filter(item => item.types === "user");

    onSave(selected, { units: selectedUnits, users: selectedUsers });
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

  const handleToggleExpand = useCallback(async (id) => {
    // 1. Toggle expanded state
    setExpandedUnits((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    // 2. Helper to find and update a node recursively in the tree
    const updateNodeInTree = (nodesList, targetId, childNodes, userNodes) => {
      return nodesList.map(node => {
        const nodeId = node.id || node._id;
        if (String(nodeId) === String(targetId)) {
          const combined = [...userNodes, ...childNodes];
          return {
            ...node,
            child: combined,
            children: combined,
            isLoaded: true,
          };
        }
        if (node.children && node.children.length > 0) {
          const updatedSub = updateNodeInTree(node.children, targetId, childNodes, userNodes);
          return {
            ...node,
            children: updatedSub,
            child: updatedSub,
          };
        }
        return node;
      });
    };

    // 3. Helper to check if a node is already loaded
    const isNodeLoaded = (nodesList, targetId) => {
      for (const node of nodesList) {
        const nodeId = node.id || node._id;
        if (String(nodeId) === String(targetId)) {
          return node.isLoaded;
        }
        if (node.children && node.children.length > 0) {
          const loaded = isNodeLoaded(node.children, targetId);
          if (loaded !== undefined) return loaded;
        }
      }
      return undefined;
    };

    // Check if the node is already loaded or is a search result
    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
      return; // Do not lazy load during active search
    }

    const loaded = isNodeLoaded(units, id);
    if (loaded) {
      return; // Already loaded, no need to fetch again
    }

    // 4. Fetch child nodes from API
    try {
      const response = await api.get(API_GET_LIST_UNITS_INDIVIDUAL_LIBRARY, {
        params: { parentId: id }
      });
      const rawChildren = response?.data?.data || [];
      const childrenNodes = [];
      const userNodes = [];

      rawChildren.forEach(item => {
        if (item.types === 'user') {
          const formattedUser = {
            ...item,
            id: item.id || item._id,
            _id: item.id || item._id,
            name: item.name || item.fullName || item.username || item.title || "",
            title: item.name || item.fullName || item.username || item.title || "",
            types: "user",
            type: "user",
          };
          userNodes.push(formattedUser);
        } else {
          childrenNodes.push({
            ...item,
            id: item.id || item._id,
            _id: item.id || item._id,
            name: item.name || item.title || "",
            title: item.name || item.title || "",
            types: "company",
            type: "company",
            children: [],
            child: [],
            users: [],
            isLoaded: false,
            hasChildren: item.hasChildren,
          });
        }
      });

      // Update state with newly loaded children
      setUnits(prevUnits => updateNodeInTree(prevUnits, id, childrenNodes, userNodes));
    } catch (error) {
      toast("Không thể tải danh sách đơn vị con", "error");
    }
  }, [units, debouncedSearchTerm, toast]);

  const treeUnits = useMemo(() => {
    return units;
  }, [units]);

  // Auto-expand paths to selected units and search matches
  useEffect(() => {
    if (!units || units.length === 0) return;

    setExpandedUnits((prev) => {
      const isFirstRender = isFirstRenderRef.current;
      let newExpanded;
      if (isFirstRender) {
        newExpanded = getInitialExpandedUnits(treeUnits);
        isFirstRenderRef.current = false;
      } else {
        newExpanded = { ...prev };
      }

      // 1. If searching, expand all nodes that contain matching descendants
      if (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") {
        const expandMatching = (nodes) => {
          let hasMatch = false;
          nodes.forEach((node) => {
            const nodeId = node.id || node._id;
            const nodeName = node.name || node.title;
            const matches = removeDiacritics(nodeName).includes(
              removeDiacritics(debouncedSearchTerm.trim())
            );

            let childMatches = false;
            if (node.children && node.children.length > 0) {
              childMatches = expandMatching(node.children);
            }

            if (matches || childMatches) {
              hasMatch = true;
              if (node.children && node.children.length > 0) {
                newExpanded[nodeId] = true;
              }
            }
          });
          return hasMatch;
        };
        expandMatching(treeUnits);
      } else if (isFirstRender) {
        // 2. Expand ancestor paths to already selected items on initial dialog load only
        const selectedIds = new Set(Object.keys(selectedMap));
        if (selectedIds.size > 0) {
          const expandSelected = (nodes) => {
            let hasSelected = false;
            nodes.forEach((node) => {
              const nodeId = node.id || node._id;
              const isSel = selectedIds.has(nodeId);
              let childSel = false;
              if (node.children && node.children.length > 0) {
                childSel = expandSelected(node.children);
              }
              if (childSel) {
                hasSelected = true;
                if (node.children && node.children.length > 0) {
                  newExpanded[nodeId] = true;
                }
              } else if (isSel) {
                hasSelected = true;
              }
            });
            return hasSelected;
          };
          expandSelected(treeUnits);
        }
      }

      return newExpanded;
    });
  }, [debouncedSearchTerm, treeUnits, units, selectedMap]);

  const selectableRootNodes = useMemo(() => {
    if (!units || units.length === 0) return [];
    return units.filter(n => !isTypeDisabled(n));
  }, [units]);

  const isAllSelected = useMemo(() => {
    if (selectableRootNodes.length === 0) return false;
    return selectableRootNodes.every(n => !!selectedMap[n.id || n._id]);
  }, [selectableRootNodes, selectedMap]);

  const isSomeSelected = useMemo(() => {
    if (selectableRootNodes.length === 0) return false;
    const selectedCount = Object.keys(selectedMap).length;
    return selectedCount > 0 && !isAllSelected;
  }, [selectableRootNodes, selectedMap, isAllSelected]);

  const handleHeaderToggleAll = useCallback((e) => {
    const checked = e.target.checked;
    setSelectedMap(() => {
      if (!checked) {
        return {};
      }
      const newMap = {};
      selectableRootNodes.forEach(n => {
        const id = n.id || n._id;
        if (id) newMap[id] = n;
      });
      return newMap;
    });
  }, [selectableRootNodes]);

  const selectedList = useMemo(() => Object?.values(selectedMap), [selectedMap]);

  return (
        <StyledDialog open={open} onClose={onClose} dialogSize="lg" fullWidth>
               <StyledDialogTitle>
              <StyledTitleText component="span">{title || "CHỌN ĐƠN VỊ CÓ QUYỀN"}</StyledTitleText>
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
                   <RoleHeaderCol>
                     <RoleCheckBox
                       size="small"
                       checked={isAllSelected}
                       indeterminate={isSomeSelected}
                       onChange={handleHeaderToggleAll}
                     />
                   </RoleHeaderCol>
                 </LeftPanelHeader>

                 <PanelContent nonePaddingRight>
                   {loading ? (
                     <LoadingContainer><CircularProgress /></LoadingContainer>
                   ) : units.length === 0 ? (
                     <NoDataContainer>
                         <NoDataTypography>Không có dữ liệu</NoDataTypography>
                     </NoDataContainer>
                   ) : (
                     treeUnits.map(node => {
                       const nodeId = node.id || node._id;
                       return (
                         <CustomTreeItem 
                           key={nodeId} 
                           node={node} 
                           level={0} 
                           searchTerm={debouncedSearchTerm} 
                           onToggle={handleToggle}
                           selectedMap={selectedMap}
                           expandedUnits={expandedUnits}
                           onToggleExpand={handleToggleExpand}
                         />
                       );
                     })
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
                    Danh sách đã chọn có quyền chỉnh sửa thư mục
                  </StyledPanelTitleLeft>
                </StyledPanelHeaderWrapper>
                <StyledPanelContent>
                  <StyledTableContainer>
                    <StyledTable size="small">
                      <StyledTableHead>
                        <HeaderRow>
                          <HeaderCell widthd="50px">STT</HeaderCell>
                          <HeaderCell align="left">Phòng ban</HeaderCell>
                          <HeaderCell widthd="80px">Bỏ chọn</HeaderCell>
                           </HeaderRow>
                       </StyledTableHead>
                      <tbody>
                        {selectedList.length === 0 ? (
                          <tr>
                            <NoSelectionTd colSpan={4}>
                              Chưa có đơn vị nào được chọn
                            </NoSelectionTd>
                          </tr>
                        ) : (
                          selectedList.map((item, idx) => (
                            <SelectedRow 
                              key={item.id || item._id} 
                              item={item} 
                              idx={idx} 
                              roleLabel={roleLabel} 
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


SelectUnitsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  title: PropTypes.string,
  roleLabel: PropTypes.string,
  initialSelected: PropTypes.array
};

export default SelectUnitsDialog;

