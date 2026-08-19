import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import {
  // DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Box,
  Collapse,
  useMediaQuery,
  IconButton,
  CircularProgress,
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
  // PanelContent,
  PanelHeaderActionText,
  // PanelHeaderSecondaryTitle,
  CenteredBox,
  EmptyStateText,
  SaveButton,
  CloseButton,
  StyledDialogReceivingUnit,
  PanelHeaderRight,
	PanelContentLeft,
  PanelContentRight,
  StyledBackdrop,
	StyledTitleTextDialog,
} from "./componentStyle/ReceivingUnitDialog.style";
import CustomTableTreeLoadmore from "@components/CustomTable/CustomTableTreeLoadmore";
import {
  getDataListUnit,
  getDataListUserByUnit,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { useToast } from "@components/common/ToastProvider";
import { getUnitId } from "./constants";
import { API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";
// import api from "@services/api";

const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const handleStopPropagation = (e) => e.stopPropagation();

const deleteDescendantsFromSelected = (selected, rootKey) => {
  const safeRootKey = String(rootKey).toLowerCase();
  delete selected[safeRootKey];

  const toDelete = new Set([safeRootKey]);
  let changed = true;

  while (changed) {
    changed = false;
    Object.keys(selected).forEach((k) => {
      const item = selected[k];
      
      const addedByParent = item?.addedByParent ? String(item.addedByParent).toLowerCase() : "";
      
      const parent = item?.parent;
      const parentId = parent && (typeof parent === "object" ? getUnitId(parent) : parent);
      const safeParentId = parentId ? String(parentId).toLowerCase() : "";

      const isUser = item?.types === "user" || item?.type === "file";
      const shouldDelete = isUser
        ? (addedByParent && toDelete.has(addedByParent))
        : (safeParentId && toDelete.has(safeParentId));

      if (shouldDelete) {
        const safeK = String(k).toLowerCase();
        if (!toDelete.has(safeK)) {
          toDelete.add(safeK);
          delete selected[safeK];
          changed = true;
        }
      }
    });
  }
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
  const nodeId = String(getUnitId(node) || "").toLowerCase();
  const isSelected = !!selectedUnits[nodeId];

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
        if (selectedUnits[String(getUnitId(child) || "").toLowerCase()]) return true;
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

const SelectionCheckboxCell = ({ row, selectedUnits, onToggle }) => {
  const handleClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleChange = useCallback(
    (event) => {
      event.stopPropagation();
      onToggle(row);
    },
    [onToggle, row]
  );

  return (
    <StyledCheckbox
      checked={!!selectedUnits[String(getUnitId(row) || "").toLowerCase()]}
      onClick={handleClick}
      onChange={handleChange}
    />
  );
};

SelectionCheckboxCell.propTypes = {
  row: PropTypes.object.isRequired,
  selectedUnits: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const ForInformationLoadmoreDialog = ({
  open,
  onClose,
  onSave,
  dialogKey,
  initialSelectedUnits = [],
  maxLevel,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const toast = useToast();
  const [selectedUnits, setSelectedUnits] = useState({});
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  // Ref to cancel ongoing fetches when dialog closes or user navigates away
  const cancelFetchRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Cancel any ongoing fetches when dialog closes
      cancelFetchRef.current = true;
      return;
    }
    // Reset cancel flag when dialog opens
    cancelFetchRef.current = false;

    const map = {};
    if (initialSelectedUnits.length > 0) {
      initialSelectedUnits.forEach((u) => {
        const id = getUnitId(u);
        if (id) {
          map[String(id).toLowerCase()] = u;
        }
      });
    }
    setSelectedUnits(map);

    if (isMobile) {
      setLeftPanelOpen(true);
      setRightPanelOpen(false);
    } else {
      setLeftPanelOpen(true);
      setRightPanelOpen(true);
    }
  }, [open, isMobile, initialSelectedUnits]);

  // const unitTree = useMemo(() => {
  //   if (!Array.isArray(finalUnits) || finalUnits.length === 0) {
  //     return [];
  //   }
  //   return buildTree(finalUnits);
  // }, [finalUnits]);

  const buildUnitTree = useCallback((units) => {
    const safeUnits = Array.isArray(units) ? units : [];
    const unitMap = new Map();

    safeUnits.forEach((u) => {
      unitMap.set(String(getUnitId(u)).toLowerCase(), { ...u, child: [] });
    });

    const roots = [];
    safeUnits.forEach((u) => {
      const node = unitMap.get(String(getUnitId(u)).toLowerCase());
      const parent = u.parent;
      const parentId = (parent && (typeof parent === "object" ? getUnitId(parent) : parent)) || u.parentId;
      const safeParentId = parentId ? String(parentId).toLowerCase() : "";

      if (safeParentId && unitMap.has(safeParentId)) {
        unitMap.get(safeParentId).child.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, []);

  const fetchAllDescendants = useCallback(
    async (parentId) => {
      const PAGE_SIZE = 100;
      const CONCURRENCY = 10; // Number of parallel requests at a time

      // Fetch a single page for a single unitId
      const fetchOnePage = async (action, params) => {
        if (cancelFetchRef.current) return { data: [], done: true };
        const res = await dispatch(action(params)).unwrap();
        const data = res?.data || [];
        return { data, done: data.length < PAGE_SIZE };
      };

      // Fetch all pages for ALL units in parallel.
      // Wave 1: page 1 for all units concurrently (in batches of CONCURRENCY)
      // Wave 2: page 2 for units that returned a full page in wave 1, etc.
      const fetchAllPagesParallel = async (action, unitIds) => {
        const usersByUnit = {}; // unitId -> [users]
        unitIds.forEach((id) => { usersByUnit[id] = []; });

        // Units that still need more pages fetched
        let pendingUnits = unitIds.map((id) => ({ id, page: 1 }));

        while (pendingUnits.length > 0 && !cancelFetchRef.current) {
          // Process in batches of CONCURRENCY
          const results = [];
          for (let i = 0; i < pendingUnits.length; i += CONCURRENCY) {
            if (cancelFetchRef.current) break;
            const batch = pendingUnits.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
              batch.map(({ id, page }) =>
                fetchOnePage(action, { id, page, limit: PAGE_SIZE })
                  .then(({ data, done }) => ({ id, page, data, done }))
              )
            );
            results.push(...batchResults);
          }

          // Accumulate results and figure out which units need more pages
          const nextPendingUnits = [];
          for (const { id, data, done } of results) {
            usersByUnit[id].push(...data);
            if (!done) {
              const completedEntry = results.find((r) => r.id === id);
              nextPendingUnits.push({ id, page: completedEntry.page + 1 });
            }
          }
          pendingUnits = nextPendingUnits;
        }

        return Object.values(usersByUnit).flat();
      };

      if (cancelFetchRef.current) return [];

      // Only fetch users belonging directly to the parent department (do not fetch sub-units and their users)
      const unitIdsToFetch = [String(parentId).toLowerCase()];
      const allUserRaw = await fetchAllPagesParallel(getDataListUserByUnit, unitIdsToFetch);

      const allUsers = allUserRaw.map((u) => ({
        ...u,
        types: "user",
        id: getUnitId(u),
        type: "file",
      }));

      return allUsers;
    },
    [dispatch]
  );

  const handleToggle = useCallback(async (node) => {
    const key = String(getUnitId(node) || "").toLowerCase();
    const isCurrentlySelected = !!selectedUnits[key];
    const newSelected = { ...selectedUnits };

    if (isCurrentlySelected) {
      deleteDescendantsFromSelected(newSelected, key);
      setSelectedUnits(newSelected);
    } else {
      // Phần tử con (user/file) => thêm trực tiếp vào danh sách đã chọn, không gọi API
      newSelected[key] = node;
      setSelectedUnits(newSelected);

      // Phần tử cha (company/folder) => gọi API lấy toàn bộ con cháu
      if (node.types === "company" || node.type === "folder") {
        setIsToggleLoading(true);
        try {
          const descendants = await fetchAllDescendants(key);
          setSelectedUnits((prev) => {
            const updated = { ...prev };
            descendants.forEach((d) => {
              const dKey = String(getUnitId(d) || "").toLowerCase();
              if (!updated[dKey]) {
                updated[dKey] = {
                  ...d,
                  addedByParent: key,
                };
              }
            });
            return updated;
          });
        } catch (error) {
          logger.log("Lỗi khi lấy danh sách con:", error);
          toast("Lỗi khi lấy danh sách con!", "error");
        } finally {
          setIsToggleLoading(false);
        }
      }
    }
  }, [selectedUnits, fetchAllDescendants, toast]);

  const selectedTree = useMemo(() => {
    const items = Object.values(selectedUnits);
    return buildUnitTree(items);
  }, [selectedUnits, buildUnitTree]);

  const tableFilter = useMemo(
    () => [{ name: "Đơn vị/cá nhân", code: "name" }],
    []
  );


  const tableColumns = useMemo(
    () => [
      {
        row: "name",
        name: (
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingRight: "16px", paddingLeft: "16px", alignItems: "center" }}>
            <span>Đơn vị/cá nhân</span>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Nhận để biết</span>
          </div>
        ),
        width: 450,
        isIcon: true,
        noEllipsis: true,
        accessor: (row) => (
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center"}}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: "8px" , display: "flex", justifyContent: "start"}} title={row.name}>
              <span>{row.name}</span>
            </div>
            <div onClick={handleStopPropagation} style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "85px" }}>
              <SelectionCheckboxCell
                row={row}
                selectedUnits={selectedUnits}
                onToggle={handleToggle}
              />
            </div>
          </div>
        ),
      },
    ],
    [selectedUnits, handleToggle]
  );

  const getDataDistrictFromTable = useCallback(
    async (paramsObj) => {
      const { page = 1, limit = 15, ...filterParams } = paramsObj;
      // Dùng API /children không có organizationId để lấy đúng root nodes (cấp 1)
      // Backend xử lý đúng: chỉ trả về các đơn vị có parentId = null
      const extraParams = { 
				...filterParams, 
				code: "BLDBD",
				...(maxLevel !== undefined ? { maxLevel } : {}) 
			};
      
      let queryStr = "";
      if (filterParams && filterParams["filter[name]"]) {
        queryStr = filterParams["filter[name]"];
        extraParams.name = queryStr;
      }

      if (queryStr) {
        // Gọi cả hai API đồng thời
        const [unitsRes, usersRes] = await Promise.all([
          dispatch(
            getDataListUnit({ 
              page, 
              limit, 
              noLimit: false, 
              apiUrl: `${API_GET_LIST_UNIT}/children-by-code`,
              extraParams 
            })
          ).unwrap(),
          dispatch(
            getDataListUserByUnit({
              page: 1,
              limit: 500, // Lấy nhiều kết quả người dùng khớp để dựng cây
              query: queryStr,
              code: ["name", "username"]
            })
          ).unwrap(),
        ]);

        const roots = unitsRes?.data || [];
        const users = usersRes?.data || [];

        const getParentId = (parent) => {
          if (!parent) return "";
          if (typeof parent === "object") {
            return getUnitId(parent) || "";
          }
          return parent;
        };

        const unitNodes = roots.map((unit) => ({
          ...unit,
          parent: unit.parentId,
          types: "company",
          id: getUnitId(unit),
          type: "folder",
        }));

        const unitIds = new Set(unitNodes.map((node) => String(node.id).toLowerCase()));

        const userNodes = users.map((user) => {
          const parentId = getParentId(user.parent);
          return {
            ...user,
            types: "user",
            id: getUnitId(user),
            type: "file",
            parent: parentId,
          };
        });

        userNodes.forEach((userNode) => {
          const userParentId = userNode.parent ? String(userNode.parent).toLowerCase() : "";
          if (userParentId && !unitIds.has(userParentId)) {
            const originalUser = users.find((u) => getUnitId(u) === userNode.id);
            const parentObj = originalUser?.parent;
            if (parentObj && typeof parentObj === "object") {
              const newUnitNode = {
                ...parentObj,
                id: getUnitId(parentObj),
                parent: parentObj.parentId,
                types: "company",
                type: "folder",
              };
              unitNodes.push(newUnitNode);
              unitIds.add(userParentId);
            }
          }
        });

        const combined = [...unitNodes, ...userNodes];

        return {
          data: combined,
          total: combined.length,
        };
      }

      const res = await dispatch(
        getDataListUnit({ 
          page, 
          limit, 
          noLimit: false, 
          apiUrl: `${API_GET_LIST_UNIT}/children-by-code`,
          extraParams 
        })
      ).unwrap();

      const roots = res?.data || [];

      return {
        data: roots.map((unit) => ({
          ...unit,
          parent: unit.parentId,   // CustomTableTreeLoadmore đọc field `parent` để xác định level
          types: "company",
          id: getUnitId(unit),
          type: "folder",
        })),
        total: res?.total || roots.length,
      };
    },
    [dispatch, maxLevel]
  );

  const getChildrenFromTable = useCallback(
    async (paramsObj) => {
      const { parentId, page = 1, limit = 100, ...filterParams } = paramsObj;
      
      let queryStr = "";
      if (filterParams && filterParams["filter[name]"]) {
        queryStr = filterParams["filter[name]"];
      }

      const [unitsRes, usersRes] = await Promise.all([
        dispatch(getDataListUnit({ 
          page, 
          limit, 
          noLimit: false, 
          apiUrl: `${API_GET_LIST_UNIT}/children`,
          extraParams: { organizationId: parentId, ...(maxLevel !== undefined ? { maxLevel } : {}), ...filterParams }
        })).unwrap(),
        dispatch(
          getDataListUserByUnit({
            id: parentId,
            page,
            limit,
            query: queryStr,
            code: queryStr ? ["name", "username"] : undefined
          })
        ).unwrap(),
      ]);

      const allUnits = unitsRes?.data || [];
      const parentIdStr = String(parentId).toLowerCase();
      const childUnits = allUnits
        .filter((unit) => {
          const uParent = unit?.parent || unit?.parentId;
          const uParentId = uParent && (typeof uParent === "object" ? getUnitId(uParent) : uParent);
          const uParentIdStr = uParentId ? String(uParentId).toLowerCase() : "";
          return uParentIdStr === parentIdStr;
        })
        .map((unit) => ({
          ...unit,
          parent: unit.parentId,   // CustomTableTreeLoadmore đọc field `parent` để xác định level
          types: "company",
          id: getUnitId(unit),
          type: "folder",
        }));

      const childUsers = (usersRes?.data || []).map((user) => ({
        ...user,
        types: "user",
        id: getUnitId(user),
        type: "file",
      }));

      const combined = [...childUnits, ...childUsers];

      return {
        data: combined,
        total: (unitsRes?.total || 0) + (usersRes?.total || 0) || combined.length,
      };
    },
    [dispatch, maxLevel]
  );

  const handleSave = () => {
    onSave(Object.values(selectedUnits));
    onClose();
  };

  // const handleSearch = () => {
  //   // Search is handled in CustomTreeItem
  // };

  const handleToggleRightPanel = () => {
    setRightPanelOpen(!rightPanelOpen);
    setLeftPanelOpen(rightPanelOpen); // Mở ô trái nếu ô phải sắp bị đóng
  };

  return (
    <StyledDialogReceivingUnit open={open} onClose={onClose}>
      <DialogContainer>
        <StyledTitleTextDialog>Cá nhân nhận văn bản</StyledTitleTextDialog>
        <DialogContent>
          <Grid container spacing={2}>
            {/* Left Panel */}
            <Grid item xs={12} md={6}>
              <LeftPanel>
                <Collapse
                  in={!isMobile || leftPanelOpen}
                  timeout="auto"
                  unmountOnExit
                >
                  <PanelContentLeft>
                    <CustomTableTreeLoadmore
                      rowKey="id"
                      columns={tableColumns}
                      fetchData={getDataDistrictFromTable}
                      fetchChildren={getChildrenFromTable}
                      filter={tableFilter}
                      disablePagination
                      disableSynchronize
                      disableAdd
                      disableDelete
                      disableEdit
                      disableDetail
                      disableAction
                      disableCheckbox
                      autoFilter
                      noneTitle
                      mainLimits={15}
                      childrenLimits={15}
											disablePaperHeight
											disableIcon
                      mergeColumns
                    />
                  </PanelContentLeft>
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
                  <PanelContentRight>
                    {isToggleLoading && (
                      <StyledBackdrop open>
                        <CircularProgress size={32} />
                      </StyledBackdrop>
                    )}
                    {Object.values(selectedUnits).length === 0 && !isToggleLoading ? (
                      <CenteredBox>
                        <EmptyStateText variant="body2">
                          Chưa có đơn vị nào được chọn
                        </EmptyStateText>
                      </CenteredBox>
										) :
											( selectedTree.map((node) => (
                        <CustomTreeItem
                          key={getUnitId(node)}
                          node={node}
                          selectedUnits={selectedUnits}
                          onToggle={handleToggle}
                          searchTerm=""
                          isRightPanel
                        />
                      ))
											)
										}
                  </PanelContentRight>
                </Collapse>
              </RightPanel>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <SaveButton onClick={handleSave} disabled={isToggleLoading}>LƯU</SaveButton>
          <CloseButton onClick={onClose}>ĐÓNG</CloseButton>
        </DialogActions>
      </DialogContainer>
    </StyledDialogReceivingUnit>
  );
};

ForInformationLoadmoreDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ForInformationLoadmoreDialog;
