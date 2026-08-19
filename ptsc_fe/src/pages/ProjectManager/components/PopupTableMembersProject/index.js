import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import {
    useMediaQuery,

} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

import {
    TreeItemContainer,
    TreeItemLabel,
    StyledCheckbox,
    ExpandIconButton,
    PanelHeaderTitle,
    PanelHeaderActionText,
    CenteredBox,
    EmptyStateText,
    SaveButton,
    CloseButton,
    StyledDialogReceivingUnit,
    PanelHeaderRight,

    PanelContentRight,
    StyledBackdrop,
    DialogContainer, LeftPanel, RightPanel,

    StyledDialogContent,
    StyledDialogActions,
    StyledBox,
    StyledCollapse,
    StyledCircularProgress,
    RightPanelTitle,
    TreeItemAction,
    SelectionWrapper,
    VerticalDivider,
    LeftPanelTitle
} from "@styles/PopupTableMembersProject/PopupTableMembersProject.style";
import CustomTableTreeLoadmore from "./CustomTableTreeLoadmore";
import {
    getDataListUnit,
    getDataListUserByUnit,
    getDataListUserAllByUnitExclude,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { API_GET_TREE_ORGANIZATIONS } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import LoadingDialog from "@components/LoadingDialog";

import { SkyIconButton } from "@styles/SkyStyles";

const getUnitId = (val) => val?.id || val?._id || val;

// Helper: lấy parentId đúng — BE trả `parent` là object {id, name,...}, không phải string
const getParentId = (u) => {
    if (!u) return "";
    // Ưu tiên parentId (string UUID trực tiếp)
    if (u.parentId && u.parentId !== "NULL" && u.parentId !== "null") return String(u.parentId);
    // Fallback: lấy từ object parent
    if (u.parent && typeof u.parent === "object") return String(u.parent.id || u.parent._id || "");
    // Nếu parent là string UUID
    if (u.parent && typeof u.parent === "string" && u.parent !== "NULL" && u.parent !== "null") return String(u.parent);
    return "";
};

const getUserParentId = (user) => {
    const rawParent = user?.parent || user?.groupId || user?.unitId || user?.organizationUnitId || user?.organizationUnit;
    if (!rawParent) return null;
    if (typeof rawParent === "object") {
        return String(rawParent.id || rawParent._id || "");
    }
    return String(rawParent);
};

const removeDiacritics = (str) => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
};

const deleteDescendantsFromSelected = (selected, rootKey) => {
    delete selected[rootKey];

    const toDelete = new Set([String(rootKey)]);
    let changed = true;

    while (changed) {
        changed = false;
        Object.keys(selected).forEach((k) => {
            const item = selected[k];
            const parentId = String(item?.parent || "");
            if (toDelete.has(parentId)) {
                toDelete.add(String(k));
                delete selected[k];
                changed = true;
            }
        });
    }
};


const CustomTreeItem = ({
    node,
    selectedUnits,
    onToggle,
    searchTerm,
    level = 0,
    isRightPanel = false,
    readOnly = false,
}) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = !!(node?.child?.length > 0 || node?.children?.length > 0);
    const isSelected = !!selectedUnits[getUnitId(node)];

    const handleExpandClick = useCallback((e) => {
        e.stopPropagation();
        if (hasChildren) {
            setExpanded(!expanded);
        }
    }, [hasChildren, expanded]);

    const handleCheckboxClick = useCallback((e) => {
        if (readOnly) return;
        e.stopPropagation();
        if (!isRightPanel || isSelected) {
            onToggle(node);
        }
    }, [isRightPanel, isSelected, onToggle, node, readOnly]);

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

    // Determine if this is a group/folder node (not a user) for right panel display
    const isGroupNode = node.types === "company" || node.type === "folder";

    return (
        <StyledBox>
            <TreeItemContainer level={level}>
                <TreeItemLabel
                    variant="body2"
                    isRightPanel={isRightPanel}
                    isSelected={isSelected}
                    onClick={handleExpandClick}
                    isUser={node.types === "user"}
                    isPlaceholder={isRightPanel && node._isPlaceholder === true}
                    level={level}
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
                {isRightPanel ? (
                    // In right panel: group nodes show as non-deselectable header,
                    // user nodes show with deselect checkbox
                    isGroupNode ? (
                        // Show checkbox only if group was explicitly selected (not a placeholder)
                        isSelected && !node._isPlaceholder ? (
                            <TreeItemAction>
                                <StyledCheckbox
                                    checked
                                    onClick={handleCheckboxClick}
                                    disabled={readOnly}
                                />
                            </TreeItemAction>
                        ) : null
                    ) : (
                        <TreeItemAction>
                            <StyledCheckbox
                                checked
                                onClick={handleCheckboxClick}
                                disabled={readOnly}
                            />
                        </TreeItemAction>
                    )
                ) : (
                    <StyledCheckbox
                        checked={isSelected && !selectedUnits[getUnitId(node)]?._isPlaceholder}
                        onChange={handleCheckboxClick}
                        disabled={readOnly}
                    />
                )}
            </TreeItemContainer>
            {hasChildren && (
                <StyledCollapse in={expanded} timeout="auto" unmountOnExit>
                    {(node.child || node.children || []).map((childNode) => (
                        <CustomTreeItem
                            key={getUnitId(childNode)}
                            node={childNode}
                            selectedUnits={selectedUnits}
                            onToggle={onToggle}
                            searchTerm={searchTerm}
                            level={level + 1}
                            isRightPanel={isRightPanel}
                            readOnly={readOnly}
                        />
                    ))}
                </StyledCollapse>
            )}
        </StyledBox>
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

const SelectionCheckboxCell = ({ row, selectedUnits, onToggle, readOnly }) => {
    const handleClick = useCallback((event) => {
        event.stopPropagation();
    }, []);

    const handleChange = useCallback(
        (event) => {
            if (readOnly) return;
            event.stopPropagation();
            onToggle(row);
        },
        [onToggle, row, readOnly]
    );

    return (
        <StyledCheckbox
            checked={!!selectedUnits[getUnitId(row)] && !selectedUnits[getUnitId(row)]?._isPlaceholder}
            onClick={handleClick}
            onChange={handleChange}
            disabled={readOnly}
        />
    );
};

SelectionCheckboxCell.propTypes = {
    row: PropTypes.object.isRequired,
    selectedUnits: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
};

const PopupTableMembersProject = ({
    open,
    onClose,
    onSave,
    dialogKey,
    initialSelectedUnits = [],
    excludeId,
    readOnly = false,
}) => {
    const dispatch = useDispatch();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const toast = useToast();
    const [selectedUnits, setSelectedUnits] = useState({});
    const [isToggleLoading, setIsToggleLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const cancelFetchRef = useRef(false);
    // Cache: unitId -> unit object, populated once when dialog opens
    const unitCacheRef = useRef({});
    const fetchAllUnitsPromiseRef = useRef(null);
    // const matchingUsersRef = useRef([]);

    const initialUnitsKey = useMemo(() => {
        return JSON.stringify(
            (Array.isArray(initialSelectedUnits) ? initialSelectedUnits : []).map(u => u.id || u._id || u.userId)
        );
    }, [initialSelectedUnits]);

    const getAllUnits = useCallback(async () => {
        if (fetchAllUnitsPromiseRef.current) {
            return fetchAllUnitsPromiseRef.current;
        }

        const promise = (async () => {
            // Gọi /tree với noLimit=true để lấy toàn bộ 858+ đơn vị trong 1 request
            // Tránh loop nhiều trang và bỏ sót đơn vị ở trang sau (vd: "Đơn vị ngoài hệ thống" id=2167)
            const res = await dispatch(getDataListUnit({
                page: 1,
                limit: 9999,
                noLimit: true
            })).unwrap();

            const allUnits = res?.data || [];
            const cache = {};
            allUnits.forEach((u) => { cache[String(getUnitId(u))] = u; });
            unitCacheRef.current = cache;
            return allUnits;
        })();

        fetchAllUnitsPromiseRef.current = promise;
        return promise;
    }, [dispatch]);

    useEffect(() => {
        if (!open) {
            cancelFetchRef.current = true;
            fetchAllUnitsPromiseRef.current = null;
            return;
        }
        cancelFetchRef.current = false;

        // Fetch units + build reverse map userId→unitId, then set selectedUnits
        const initializeSelectedUnits = async () => {
            setIsLoading(true);
            try {
                // 1. Lấy danh sách tất cả đơn vị
                await getAllUnits();
                const cache = unitCacheRef.current;

                // 2. Kiểm tra xem có thành viên nào thiếu thông tin phòng ban không
                const safeInitial = Array.isArray(initialSelectedUnits) ? initialSelectedUnits : [];
                const usersNeedingParent = safeInitial.filter(
                    (u) => (u.types === "user" || u.type === "file" || u.userId || u.role)
                        && !u.groupId && !u.parent && !u.unitId
                );

                // 3. (TÌM KIẾM CÓ MỤC TIÊU) Chỉ lấy nhân viên cho các đơn vị đã được chọn
                // để kiểm tra xem các thành viên chưa có cha có thuộc về chúng không.
                const userToUnitMap = {};
                if (usersNeedingParent.length > 0) {
                    const selectedUnitIds = safeInitial
                        .filter(u => u.types === "company" || u.type === "folder" || u.isDepartment || !!cache[String(u.id || u._id)])
                        .map(u => String(u.id || u._id || getUnitId(u)));

                    if (selectedUnitIds.length > 0) {
                        const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;
                        await Promise.all(
                            selectedUnitIds.map(async (uid) => {
                                try {
                                    const r = await dispatch(actionToUse({ id: uid, page: 1, limit: 100, excludeId })).unwrap();
                                    (r?.data || []).forEach((usr) => {
                                        const usrId = String(usr.userId || getUnitId(usr));
                                        userToUnitMap[usrId] = uid;
                                    });
                                } catch (_) { /* bỏ qua */ }
                            })
                        );
                    }
                }
                // 4. Xây dựng map cuối cùng với thông tin cha đầy đủ
                const map = {};
                safeInitial.forEach((u) => {
                    const id = String(u.userId || getUnitId(u));
                    const isDept = u.types === "company" || u.type === "folder" || u.isDepartment || !!cache[id];
                    const cachedUnit = cache[id];

                    // Kiểm tra nhiều trường có thể chứa ID cha
                    let resolvedParent = getUserParentId(u);

                    // MỚI: Nếu là phòng ban và thiếu cha, lấy từ cache
                    if (isDept && !resolvedParent && cachedUnit) {
                        resolvedParent = getParentId(cachedUnit) || null;
                    }

                    // Sử dụng map tìm kiếm mục tiêu cho nhân viên nếu vẫn chưa thấy cha
                    if (!resolvedParent && !isDept) {
                        resolvedParent = userToUnitMap[id] || null;
                    }

                    const enriched = {
                        ...u,
                        id: id,
                        _id: id,
                        name: u.name || (isDept && cachedUnit ? cachedUnit.name : u.name),
                        types: isDept ? "company" : (u.types || "user"),
                        type: isDept ? "folder" : (u.type || "file"),
                        parent: resolvedParent ? String(resolvedParent) : null,
                        groupId: resolvedParent ? String(resolvedParent) : null,
                        groupName: u.groupName || (resolvedParent ? cache[String(resolvedParent)]?.name : null)
                    };
                    map[id] = enriched;
                });

                // 5. Tự động thêm các nút cha đệ quy cho bất kỳ node nào thiếu cha trong map
                const injectParent = (node) => {
                    // node.parent có thể là string UUID (đã được normalize khi set enriched)
                    const pId = node.parent || node.groupId;
                    if (pId && !map[String(pId)] && cache[String(pId)]) {
                        const parentUnit = cache[String(pId)];
                        const resolvedGrandParent = getParentId(parentUnit);
                        const parentNode = {
                            ...parentUnit,
                            id: String(getUnitId(parentUnit)),
                            _id: String(getUnitId(parentUnit)),
                            name: parentUnit.name,
                            types: "company",
                            type: "folder",
                            parent: resolvedGrandParent || null,
                            groupId: resolvedGrandParent || null,
                            isPlaceholder: true // Đánh dấu là node tự động thêm
                        };
                        map[parentNode.id] = parentNode;
                        // Tiếp tục thêm cấp cao hơn nếu cần
                        injectParent(parentNode);
                    }
                };

                Object.values(map).forEach(injectParent);

                if (!cancelFetchRef.current) setSelectedUnits(map);
            } catch (_) {
                // Fallback: just set raw initial units
                const map = {};
                (Array.isArray(initialSelectedUnits) ? initialSelectedUnits : []).forEach((u) => {
                    const id = u.id || u._id || u.userId;
                    map[id] = { ...u, id, _id: id, types: u.types || "user", type: u.type || "file" };
                });
                setSelectedUnits(map);
            } finally {
                setIsLoading(false);
            }
        };

        initializeSelectedUnits();

        if (isMobile) {
            setLeftPanelOpen(true);
            setRightPanelOpen(false);
        } else {
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isMobile, initialUnitsKey, dispatch, excludeId, getAllUnits]);

    const buildUnitTree = useCallback((units) => {
        const safeUnits = Array.isArray(units) ? units : [];
        const unitMap = new Map();

        safeUnits.forEach((u) => {
            unitMap.set(String(getUnitId(u)), { ...u, child: [] });
        });

        const roots = [];
        safeUnits.forEach((u) => {
            const node = unitMap.get(String(getUnitId(u)));
            const parentId = getParentId(u) || String(u.groupId || "");

            if (parentId && unitMap.has(parentId)) {
                unitMap.get(parentId).child.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }, []);


    const buildSelectedTree = useCallback((selectedUnitsMap) => {
        const items = Object.values(selectedUnitsMap);

        // Collect existing group/folder ids already in selectedUnits
        const existingGroupIds = new Set(
            items
                .filter((u) => u.types === "company" || u.type === "folder")
                .map((u) => String(getUnitId(u)))
        );

        // Build placeholder parent nodes for users whose parent group is not selected
        const placeholders = {};
        items.forEach((u) => {
            if (u.types !== "user" && u.type !== "file") return;

            const parentId = u.parent || u.groupId;
            if (!parentId) return;

            const parentKey = String(parentId);
            if (existingGroupIds.has(parentKey)) return; // parent already in map
            if (placeholders[parentKey]) return;         // placeholder already created

            const cachedUnit = unitCacheRef.current[parentKey];
            const resolvedName = cachedUnit?.name || u.groupName || parentKey;
            placeholders[parentKey] = {
                ...(cachedUnit || {}),
                id: parentId,
                _id: parentId,
                name: resolvedName,
                types: "company",
                type: "folder",
                _isPlaceholder: true,
            };
        });

        // Merge real selected items + placeholder parents into one map for tree building
        const merged = { ...selectedUnitsMap, ...placeholders };
        return buildUnitTree(Object.values(merged));
    }, [buildUnitTree]);

    const fetchAllDescendants = useCallback(
        async (parentId) => {
            const PAGE_SIZE = 100;
            const CONCURRENCY = 10;

            const fetchOnePage = async (action, params) => {
                if (cancelFetchRef.current) return { data: [], done: true };
                const res = await dispatch(action(params)).unwrap();
                const data = res?.data || [];
                return { data, done: data.length < PAGE_SIZE };
            };

            const fetchAllPagesParallel = async (action, unitIds) => {
                const usersByUnit = {};
                unitIds.forEach((id) => { usersByUnit[id] = []; });

                let pendingUnits = unitIds.map((id) => ({ id, page: 1 }));

                while (pendingUnits.length > 0 && !cancelFetchRef.current) {
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

            const allUnits = await getAllUnits();
            if (cancelFetchRef.current) return [];

            const descendantUnits = [];
            const queue = [String(parentId)];
            const visited = new Set([String(parentId)]);

            while (queue.length > 0) {
                const currentId = queue.shift();
                const children = allUnits.filter(
                    (u) => String(u?.parent || "") === currentId && !visited.has(String(getUnitId(u)))
                );

                children.forEach((child) => {
                    const childId = String(getUnitId(child));
                    visited.add(childId);
                    descendantUnits.push({
                        ...child,
                        types: "company",
                        id: getUnitId(child),
                        type: "folder",
                    });
                    queue.push(childId);
                });
            }

            if (cancelFetchRef.current) return [];

            const unitIdsToFetch = [String(parentId), ...descendantUnits.map((u) => getUnitId(u))];
            const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;
            const actionWithExclude = (params) => actionToUse({ ...params, excludeId });
            const allUserRaw = await fetchAllPagesParallel(actionWithExclude, unitIdsToFetch);

            const allUsers = allUserRaw.map((u) => ({
                ...u,
                types: "user",
                id: getUnitId(u),
                type: "file",
            }));

            return [...descendantUnits, ...allUsers];
        },
        [dispatch, excludeId]
    );

    const handleToggle = useCallback(async (node) => {
        if (readOnly) return;
        const key = getUnitId(node);

        // Sử dụng functional update để tránh closure cũ của selectedUnits
        setSelectedUnits((prevSelected) => {
            const isCurrentlySelected = !!prevSelected[key] && !prevSelected[key]?._isPlaceholder;
            const newSelected = { ...prevSelected };

            if (isCurrentlySelected) {
                deleteDescendantsFromSelected(newSelected, key);
                return newSelected;
            } else {
                // Nếu là phòng ban, cần kiểm tra thành viên trước khi thêm vào state.
                // Do đây là hàm đồng bộ của state setter, không thể await.
                // Chúng ta xử lý check bất đồng bộ ở phía dưới.
                return prevSelected;
            }
        });

        // Kiểm tra bất đồng bộ cho các phòng ban
        const isCurrentlySelected = !!selectedUnits[key] && !selectedUnits[key]?._isPlaceholder;
        if (!isCurrentlySelected && (node.types === "company" || node.type === "folder")) {
            setIsToggleLoading(true);
            try {
                const descendants = await fetchAllDescendants(key);
                const userMembers = descendants.filter(d => d.types === "user" || d.type === "file");

                if (userMembers.length === 0) {
                    toast(`Phòng ban "${node.name}" không có nhân viên để chọn.`, "warning");
                    setIsToggleLoading(false);
                    return;
                }

                setSelectedUnits((prev) => {
                    const updated = { ...prev };
                    updated[key] = node;
                    descendants.forEach((d) => {
                        updated[getUnitId(d)] = d;
                    });
                    return updated;
                });
            } catch (error) {
                toast(error?.response?.data?.message || "Lỗi khi lấy danh sách con!", "error");
            } finally {
                setIsToggleLoading(false);
            }
        } else if (!isCurrentlySelected) {
            // Chọn cá nhân (đồng bộ)
            setSelectedUnits(prev => ({ ...prev, [key]: node }));
        }
    }, [selectedUnits, fetchAllDescendants, readOnly, toast]);

    // FIX: Use buildSelectedTree instead of buildUnitTree for the right panel
    const selectedTree = useMemo(() => {
        return buildSelectedTree(selectedUnits);
    }, [selectedUnits, buildSelectedTree]);

    const tableFilter = useMemo(
        () => [{ name: "Đơn vị/cá nhân", code: "name" }],
        []
    );

    const tableColumns = useMemo(
        () => [
            {
                row: "name",
                name: "Tên đơn vị, cá nhân",
                width: "auto",
                isIcon: true,
            },
            {
                row: "receive",
                name: "Chọn thành viên",
                width: 130,
                align: "center",
                accessor: (row) => (
                    <SelectionCheckboxCell
                        row={row}
                        selectedUnits={selectedUnits}
                        onToggle={handleToggle}
                        readOnly={readOnly}
                    />
                ),
            },
        ],
        [selectedUnits, handleToggle, readOnly]
    );

    // const getDataDistrictFromTable = useCallback(
    //     async ({ page = 1, limit = 10, name }) => {
    //         const allUnits = await getAllUnits();

    //         let allowedRootIds = new Set();
    //         let hasSearch = !!name;

    //         if (hasSearch) {
    //             const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;
    //             try {
    //                 const usersRes = await dispatch(
    //                     actionToUse({
    //                         page: 1,
    //                         limit: 9999,
    //                         excludeId,
    //                         code: ["name"]
    //                     })
    //                 ).unwrap();

    //                 const matchingUsers = usersRes?.data || [];
    //                 matchingUsersRef.current = matchingUsers;

    //                 matchingUsers.forEach((user) => {
    //                     let currParentId = getUserParentId(user);
    //                     let lastValidId = null;
    //                     while (currParentId) {
    //                         lastValidId = currParentId;
    //                         const parentUnit = unitCacheRef.current[currParentId];
    //                         currParentId = parentUnit?.parent || parentUnit?.groupId ? String(parentUnit.parent || parentUnit.groupId) : null;
    //                     }
    //                     if (lastValidId) {
    //                         allowedRootIds.add(lastValidId);
    //                     }
    //                 });
    //             } catch (e) {
    //                 logger.error("Error fetching matching users for root filtering", e);
    //             }
    //         }

    //         const allRoots = allUnits.filter((u) => {
    //             if (u.parent) return false;
    //             if (!hasSearch) return true;
    //             const matchesName = removeDiacritics(u.name || "").includes(removeDiacritics(name));
    //             const isUserRoot = allowedRootIds.has(String(getUnitId(u)));
    //             return matchesName || isUserRoot;
    //         });

    //         const total = allRoots.length;
    //         const start = (page - 1) * limit;
    //         const remaining = total - start;
    //         const currentLimit = remaining >= limit ? limit : remaining > 0 ? remaining : 0;
    //         const pagedRoots = allRoots.slice(start, start + currentLimit);

    //         return {
    //             data: pagedRoots.map((unit) => ({
    //                 ...unit,
    //                 types: "company",
    //                 id: getUnitId(unit),
    //                 type: "folder",
    //             })),
    //             total: allRoots.length,
    //         };
    //     },
    //     [dispatch, excludeId, getAllUnits]
    // );

    // const getChildrenFromTable = useCallback(
    //     async ({ parentId, page = 1, limit = 10, name }) => {
    //         const allUnits = await getAllUnits();
    //         const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;

    //         let rawUsers = [];
    //         let totalUsers = 0;

    //         if (name) {
    //             rawUsers = matchingUsersRef.current || [];
    //             totalUsers = rawUsers.length;
    //         } else {
    //             const usersRes = await dispatch(
    //                 actionToUse({
    //                     id: parentId,
    //                     page,
    //                     limit,
    //                     excludeId,
    //                     query: undefined,
    //                 })
    //             ).unwrap();
    //             rawUsers = usersRes?.data || [];
    //             totalUsers = usersRes?.total || 0;
    //         }

    //         const ancestorsSet = new Set();
    //         if (name) {
    //             rawUsers.forEach((user) => {
    //                 let currParentId = getUserParentId(user);
    //                 const path = [];
    //                 let foundParentId = false;
    //                 while (currParentId) {
    //                     if (String(currParentId) === String(parentId)) {
    //                         foundParentId = true;
    //                         break;
    //                     }
    //                     path.push(currParentId);
    //                     const parentUnit = unitCacheRef.current[currParentId];
    //                     currParentId = parentUnit?.parent || parentUnit?.groupId ? String(parentUnit.parent || parentUnit.groupId) : null;
    //                 }
    //                 if (foundParentId) {
    //                     path.forEach(id => ancestorsSet.add(id));
    //                 }
    //             });
    //         }

    //         const childUnitsRaw = allUnits.filter((unit) => String(unit?.parent || "") === String(parentId));
    //         const filteredUnits = name
    //             ? childUnitsRaw.filter((unit) => {
    //                 const unitId = String(getUnitId(unit));
    //                 const matchesName = removeDiacritics(unit.name || "").includes(removeDiacritics(name));
    //                 const isAncestor = ancestorsSet.has(unitId);
    //                 return matchesName || isAncestor;
    //             })
    //             : childUnitsRaw;

    //         const childUnits = filteredUnits.map((unit) => ({
    //             ...unit,
    //             types: "company",
    //             id: getUnitId(unit),
    //             type: "folder",
    //         }));

    //         const filteredUsers = name
    //             ? rawUsers.filter((user) => String(getUserParentId(user)) === String(parentId))
    //             : rawUsers;

    //         const childUsers = filteredUsers.map((user) => ({
    //             ...user,
    //             types: "user",
    //             id: getUnitId(user),
    //             type: "file",
    //             parent: parentId,
    //         }));

    //         const combined = [...childUnits, ...childUsers];

    //         return {
    //             data: combined,
    //             total: childUnits.length + (name ? filteredUsers.length : totalUsers),
    //             ancestorsToExpand: Array.from(ancestorsSet),
    //         };
    //     },
    //     [dispatch, excludeId, getAllUnits]
    // );

    const searchUsersCacheRef = useRef([]);

    const fetchDataLazy = useCallback(
        async ({ page = 1, limit = 30, ...rest }) => {
            await getAllUnits();
            let allUnits = Object.values(unitCacheRef.current);
            const idSet = new Set(allUnits.map(u => String(getUnitId(u))));

            // Check for search term either in `name` or `filter[name]`
            const searchTermRaw = rest["filter[name]"] || rest.name;
            if (searchTermRaw) {
                const searchTerm = String(searchTermRaw).toLowerCase();
                const matchedUnits = allUnits.filter(u =>
                    (u.name || "").toLowerCase().includes(searchTerm) ||
                    (u.code || "").toLowerCase().includes(searchTerm)
                );

                // Gọi API tìm kiếm users 1 lần duy nhất
                const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;
                const usersRes = await dispatch(
                    actionToUse({
                        page: 1,
                        limit: 500, // Lấy nhiều để search tree chính xác
                        excludeId,
                        query: searchTermRaw,
                        code: ["name"],
                        email: searchTermRaw,
                    })
                ).unwrap();

                searchUsersCacheRef.current = usersRes?.data || [];

                const userParentIds = [...new Set(
                    searchUsersCacheRef.current
                        .map(u => u.organizationUnitId || u.unitId || u.parent)
                        .filter(Boolean)
                )];

                if (userParentIds.length > 0) {
                    try {
                        const traceRes = await dispatch(getDataListUnit({
                            page: 1,
                            limit: 30,
                            noLimit: false,
                            apiUrl: API_GET_TREE_ORGANIZATIONS,
                            extraParams: { tracePath: userParentIds.join(',') }
                        })).unwrap();

                        const traceUnits = traceRes?.data || [];
                        const cache = unitCacheRef.current;
                        traceUnits.forEach(u => {
                            cache[String(getUnitId(u))] = u;
                        });
                        // Cập nhật lại allUnits từ cache mới nhất
                        allUnits = Object.values(unitCacheRef.current);
                    } catch (e) {
                        // Bỏ qua lỗi nếu API thất bại
                    }
                }

                // Tính toán tổ tiên (ancestors) cần giữ lại
                const ancestorsSet = new Set();
                // Build lookup map để tìm unit nhanh (tránh allUnits.find O(n))
                const unitLookup = new Map(allUnits.map(u => [String(getUnitId(u)), u]));

                const collectAncestors = (startId) => {
                    const visited = new Set();
                    let curr = String(startId || '');
                    while (curr && !visited.has(curr)) {
                        visited.add(curr);
                        ancestorsSet.add(curr);
                        const parentUnit = unitLookup.get(curr);
                        const nextId = parentUnit ? getParentId(parentUnit) : '';
                        curr = nextId || '';
                    }
                };

                // Add matched units and their ancestors
                matchedUnits.forEach(u => collectAncestors(getUnitId(u)));

                // Add matched users' parents and their ancestors
                searchUsersCacheRef.current.forEach(u => {
                    const startId = u.organizationUnitId || u.unitId || u.parent;
                    if (startId) collectAncestors(startId);
                });

                // Tính toán các tổ tiên cần expand (chỉ dành cho các node dẫn tới matched users)
                const userAncestorsSet = new Set();
                const collectUserAncestors = (startId) => {
                    const visited = new Set();
                    let curr = String(startId || '');
                    while (curr && !visited.has(curr)) {
                        visited.add(curr);
                        userAncestorsSet.add(curr);
                        const parentUnit = unitLookup.get(curr);
                        const nextId = parentUnit ? getParentId(parentUnit) : '';
                        curr = nextId || '';
                    }
                };

                searchUsersCacheRef.current.forEach(u => {
                    const startId = u.organizationUnitId || u.unitId || u.parent;
                    if (startId) collectUserAncestors(startId);
                });

                // Chỉ trả về các ROOT units của cây search
                const rootItems = allUnits.filter(u => {
                    const id = String(getUnitId(u));
                    if (!ancestorsSet.has(id)) return false;
                    const pId = getParentId(u);

                    if (!pId || !ancestorsSet.has(pId)) return true;

                    // Nếu parent có trong ancestorsSet nhưng không được trả về từ API (ví dụ do includeSelf=false)
                    // Thì node này buộc phải trở thành root để hiển thị
                    const parentExistsInUnits = allUnits.some(parent => String(getUnitId(parent)) === pId);
                    if (!parentExistsInUnits) return true;

                    return false;
                });

                const start = (page - 1) * limit;
                const pagedMatches = rootItems.slice(start, start + limit);
                // Normalize parent thành string UUID — giống Users/index.js
                const childUnits = pagedMatches.map((u) => ({
                    ...u,
                    type: "folder",
                    types: "company",
                    parent: getParentId(u) || null,
                }));

                return {
                    data: childUnits,
                    total: rootItems.length,
                    ancestorsToExpand: Array.from(userAncestorsSet)
                };
            }

            // Lazy loading: root units (units whose parentId is not in the fetched list)
            const rootItems = allUnits.filter(u => {
                const pId = getParentId(u);
                return !pId || !idSet.has(pId);
            });

            // Paginate root items locally
            const start = (page - 1) * limit;
            const pagedRoots = rootItems.slice(start, start + limit);

            return {
                // Normalize parent thành string UUID — giống Users/index.js: item.parentId || item.parent?.id || null
                data: pagedRoots.map((u) => ({
                    ...u,
                    type: "folder",
                    types: "company",
                    parent: getParentId(u) || null,
                })),
                total: rootItems.length,
            };
        },
        [dispatch, getAllUnits]
    );

    const fetchChildrenLazy = useCallback(
        async ({ parentId, page = 1, limit = 30, ...rest }) => {
            // 1. Fetch child units locally from cache
            await getAllUnits();
            const allUnits = Object.values(unitCacheRef.current);

            // Nếu parentId không phải là một phòng ban (ví dụ: là một user bị auto-expand), ta return rỗng luôn để tránh gọi API thừa.
            const isUnit = allUnits.some(u => String(getUnitId(u)) === String(parentId));
            if (!isUnit && parentId) {
                return { data: [], total: 0 };
            }

            let childUnitsRaw = [];
            let childUnitsTotal = 0;

            if (rest.name || rest["filter[name]"]) {
                childUnitsRaw = allUnits.filter(u => getParentId(u) === String(parentId));
                const searchStr = String(rest.name || rest["filter[name]"]).toLowerCase();

                // Dùng lại cache để tính ancestorsSet
                const ancestorsSet = new Set();

                // Build lookup map để tìm unit nhanh
                const unitLookup2 = new Map(allUnits.map(u => [String(getUnitId(u)), u]));

                const collectAncestors2 = (startId) => {
                    const visited = new Set();
                    let curr = String(startId || '');
                    while (curr && !visited.has(curr)) {
                        visited.add(curr);
                        ancestorsSet.add(curr);
                        const parentUnit = unitLookup2.get(curr);
                        const nextId = parentUnit ? getParentId(parentUnit) : '';
                        curr = nextId ? String(nextId) : '';
                    }
                };

                // Cây phòng ban
                allUnits.forEach(u => {
                    if ((u.name || '').toLowerCase().includes(searchStr) || (u.code || '').toLowerCase().includes(searchStr)) {
                        collectAncestors2(getUnitId(u));
                    }
                });

                // Cây user
                searchUsersCacheRef.current.forEach(u => {
                    const startId = u.organizationUnitId || u.unitId || u.parent;
                    if (startId) collectAncestors2(startId);
                });

                // Chỉ giữ lại những unit nằm trong ancestorsSet
                childUnitsRaw = childUnitsRaw.filter(u => ancestorsSet.has(String(getUnitId(u))));

                // Lấy user trực tiếp thuộc unit này từ cache
                const matchedUsers = searchUsersCacheRef.current.filter(u =>
                    String(u.organizationUnitId || u.unitId || u.parent) === String(parentId)
                );

                const childUnits = childUnitsRaw.map((u) => ({
                    ...u,
                    type: "folder",
                    types: "company",
                    parent: getParentId(u) || parentId,
                }));
                const childUsers = matchedUsers.map((u) => ({ ...u, type: "file", types: "user", parent: parentId }));

                return {
                    data: [...childUnits, ...childUsers],
                    total: childUnits.length + childUsers.length,
                    // KHÔNG trả ancestorsToExpand từ fetchChildrenLazy
                    // vì nó sẽ khởi động loadChildren đệ quy → fetchChildrenLazy → ancestorsToExpand → vòng lặp vô hạn
                };
            } else {
                // Normal mode: API BE với ?parent=id trả về toàn bộ subtree (không chỉ direct children)
                // → Dùng cache từ getAllUnits() (/tree) để filter direct children chính xác
                // Cache đã được populate bởi getAllUnits() ở đầu hàm
                const cachedDirectChildren = allUnits.filter(u => getParentId(u) === String(parentId));

                if (cachedDirectChildren.length > 0) {
                    // Đã có trong cache → dùng ngay, không cần gọi API thêm
                    childUnitsRaw = cachedDirectChildren;
                    childUnitsTotal = cachedDirectChildren.length;
                } else {
                    // Chưa có trong cache → gọi API, nhận về subtree và cập nhật cache
                    const childUnitsRes = await dispatch(getDataListUnit({
                        page: 1,
                        limit: 500,    // lấy nhiều để có đủ toàn bộ subtree
                        noLimit: false,
                        extraParams: { parent: parentId }
                    })).unwrap();
                    const allReturnedUnits = childUnitsRes?.data || [];

                    // Cập nhật cache với toàn bộ subtree trả về
                    const cache = unitCacheRef.current;
                    allReturnedUnits.forEach(u => {
                        cache[String(getUnitId(u))] = u;
                    });

                    // Chỉ lấy direct children: parentId trực tiếp === parentId đang expand
                    childUnitsRaw = allReturnedUnits.filter(u => getParentId(u) === String(parentId));
                    childUnitsTotal = childUnitsRaw.length;
                }
            }

            // Phân trang đơn vị con (chỉ dùng local slice cho search mode, normal mode đã phân trang qua API)
            const pagedChildUnits = (rest.name || rest["filter[name]"])
                ? childUnitsRaw.slice((page - 1) * limit, page * limit)
                : childUnitsRaw;

            // 2. Fetch users in this unit (Normal Load)
            const actionToUse = excludeId ? getDataListUserAllByUnitExclude : getDataListUserByUnit;
            const usersRes = await dispatch(
                actionToUse({
                    page,
                    limit,
                    excludeId,
                    id: parentId, // Rất quan trọng: Chỉ lấy user thuộc unit này!
                })
            ).unwrap();

            // Normalize parent thành string UUID cho cả child units và child users
            const childUnits = pagedChildUnits.map((u) => ({
                ...u,
                type: "folder",
                types: "company",
                parent: getParentId(u) || parentId,  // luôn gắn đúng parent
            }));
            const childUsers = (usersRes?.data || []).map((u) => ({ ...u, type: "file", types: "user", parent: parentId }));

            return {
                data: [...childUnits, ...childUsers],
                total: (rest.name || rest["filter[name]"])
                    ? (childUnitsRaw.length + childUsers.length)
                    : (childUnitsTotal + (usersRes?.total || 0)),
            };
        },
        [dispatch, excludeId, getAllUnits]
    );

    const handleSave = () => {
        const allSelected = Object.values(selectedUnits);

        const parentMap = {};
        allSelected.forEach((u) => {
            if (u.types === "company" || u.type === "folder") {
                parentMap[getUnitId(u)] = u;
            }
        });

        const selectedPeople = allSelected
            .filter((u) => (u.types === "user" || u.type === "file") && !u._isPlaceholder)
            .map((u) => {
                const parentId = u.parent || u.groupId;
                const parentNode = parentId ? parentMap[String(parentId)] : null;
                return {
                    ...u,
                    groupId: parentId || null,
                    groupName: parentNode?.name || u.groupName || null,
                };
            });

        const selectedDepartments = allSelected
            .filter((u) => (u.types === "company" || u.type === "folder") && !u._isPlaceholder)
            .map((u) => ({
                ...u,
                isDepartment: true,
            }));

        onSave([...selectedPeople, ...selectedDepartments]);
        onClose();
    };

    const handleApply = () => {
        if (readOnly) {
            onClose();
            return;
        }
        handleSave();
    };

    const handleToggleRightPanel = () => {
        setRightPanelOpen(!rightPanelOpen);
        setLeftPanelOpen(rightPanelOpen);
    };

    return (
        <StyledDialogReceivingUnit open={open} onClose={onClose}>
            {open && (
                <>
                    <DialogContainer>
                        <StyledDialogContent>
                            <SelectionWrapper>
                                {/* Left Panel */}
                                <LeftPanel>
                                    <LeftPanelTitle>CHỌN THÀNH VIÊN DỰ ÁN</LeftPanelTitle>
                                    <StyledCollapse
                                        in={!isMobile || leftPanelOpen}
                                        timeout="auto"
                                        unmountOnExit
                                    >
                                        <CustomTableTreeLoadmore
                                            rowKey="id"
                                            columns={tableColumns}
                                            fetchData={fetchDataLazy}
                                            fetchChildren={fetchChildrenLazy}
                                            filter={tableFilter}
                                            disablePagination
                                            disableSynchronize
                                            disableAdd
                                            disableHeaderTable={false}
                                            disableDelete
                                            disableEdit
                                            disableDetail
                                            disableAction
                                            disableCheckbox
                                            noneTitle
                                            mainLimits={30}
                                            childrenLimits={30}
                                            disablePaperHeight
                                            disableIcon
                                            autoFilter
                                        />
                                    </StyledCollapse>
                                </LeftPanel>

                                <VerticalDivider />

                                {/* Right Panel */}
                                <RightPanel>
                                    <RightPanelTitle>Danh sách thành viên dự án</RightPanelTitle>
                                    <PanelHeaderRight dialogKey={dialogKey}>
                                        <PanelHeaderTitle variant="subtitle2">
                                            Tên thành viên
                                            {isMobile && (
                                                <SkyIconButton size="small" onClick={handleToggleRightPanel}>
                                                    {rightPanelOpen ? (
                                                        <ExpandLessIcon />
                                                    ) : (
                                                        <ExpandMoreIcon />
                                                    )}
                                                </SkyIconButton>
                                            )}
                                        </PanelHeaderTitle>
                                        {!isMobile && (
                                            <PanelHeaderActionText variant="subtitle2">
                                                Bỏ chọn
                                            </PanelHeaderActionText>
                                        )}
                                    </PanelHeaderRight>
                                    <StyledCollapse
                                        in={!isMobile || rightPanelOpen}
                                        timeout="auto"
                                        unmountOnExit
                                    >
                                        <PanelContentRight>
                                            {isToggleLoading && (
                                                <StyledBackdrop open>
                                                    <StyledCircularProgress size={32} />
                                                </StyledBackdrop>
                                            )}
                                            {Object.values(selectedUnits).length === 0 && !isToggleLoading ? (
                                                <CenteredBox>
                                                    <EmptyStateText variant="body2">
                                                        Chưa có đơn vị nào được chọn
                                                    </EmptyStateText>
                                                </CenteredBox>
                                            ) :
                                                (selectedTree.map((node) => (
                                                    <CustomTreeItem
                                                        key={getUnitId(node)}
                                                        node={node}
                                                        selectedUnits={selectedUnits}
                                                        onToggle={handleToggle}
                                                        searchTerm=""
                                                        isRightPanel
                                                        readOnly={readOnly}
                                                    />
                                                ))
                                                )
                                            }
                                        </PanelContentRight>
                                    </StyledCollapse>
                                </RightPanel>
                            </SelectionWrapper>
                        </StyledDialogContent>
                        <StyledDialogActions>
                            {readOnly
                                ? <CloseButton onClick={onClose}>Đóng</CloseButton>
                                : <>
                                    <CloseButton onClick={onClose}>Hủy</CloseButton>
                                    <SaveButton onClick={handleApply} disabled={isToggleLoading}>Áp dụng</SaveButton>
                                </>
                            }
                        </StyledDialogActions>
                    </DialogContainer>
                    <LoadingDialog open={isLoading}>
                        Đang tải dữ liệu, vui lòng đợi...
                    </LoadingDialog>
                </>
            )}
        </StyledDialogReceivingUnit>
    );
};

PopupTableMembersProject.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

export default PopupTableMembersProject;