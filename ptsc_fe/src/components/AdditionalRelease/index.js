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
import { useTheme, styled } from "@mui/material/styles";
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
    PanelHeaderActions,
    PanelContent,
    PanelHeaderActionText,
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
} from "@styles/AdditionalRelease/AdditionalRelease.styles";

import { getDataListUnit } from "@redux/slices/SharedCategory/managementUnitSlice";
import {
    API_GET_LIST_USERS,
    APP_BASE,

} from "@EnvironmentFile/constants/urlConfig";


import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete"; // This was already here
import { useToast } from "@components/common/ToastProvider";
import axiosInstance from "@utils/axiosInstance";
// import api from "@services/api";

const removeDiacritics = (str) => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
};

const hasVisibleNodes = (nodes, term) => {
    if (!term) return nodes.length > 0;
    return nodes.some(node => {
        const matchesSearch = removeDiacritics(node.name).includes(removeDiacritics(term));
        const childrenMatchSearch = node.children && node.children.length > 0 && hasVisibleNodes(node.children, term);
        return matchesSearch || childrenMatchSearch;
    });
};

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

export const DialogContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    height: "80vh",
});

export const LeftPanel = styled(Box)({
    border: "1px solid #ccc",
    // borderRadius: "4px",
    padding: "16px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
});

export const RightPanel = styled(Box)({
    border: "1px solid #ccc",
    // borderRadius: "4px",
    padding: "16px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
});

const CustomTreeItem = ({
    node,
    selectedUnits,
    onToggle,
    searchTerm,
    level = 0,
    isRightPanel = false,
    lockedUnitIds = new Set(),
}) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = !!selectedUnits[node._id];
    const isLocked = lockedUnitIds.has(node._id);

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

    // Trong right panel, chỉ hiển thị node nếu nó hoặc con của nó được chọn
    if (isRightPanel) {
        const hasSelectedChildren =
            node.children && node.children.some((child) => selectedUnits[child._id]);
        if (!isSelected && !hasSelectedChildren) return null;
    }

    const handleExpandClick = (e) => {
        e.stopPropagation();
        if (hasChildren) {
            setExpanded(!expanded);
        }
    };

    const handleCheckboxClick = (e) => {
        e.stopPropagation();
        // Không cho phép bỏ chọn nếu unit bị locked
        if (isLocked && isSelected) {
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
                        disabled={(isRightPanel && !isSelected) || (isLocked && isSelected)}
                    />
                )}
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
                            isRightPanel={isRightPanel}
                            lockedUnitIds={lockedUnitIds}
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
    lockedUnitIds: PropTypes.instanceOf(Set),
};

const AdditionalRelease = ({
    open,
    onClose,
    dialogKey,
    initialSelectedUnits = [],
    dataDetail,
    setReloadData,
    onCloseAppBar,
    delay = 1000
}) => {
    const dispatch = useDispatch();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [lockedUnitIds, setLockedUnitIds] = useState(new Set());
    const toast = useToast();
    const documentId = dataDetail?.document?.documentId
    const { units, isLoading } = useSelector((state) => {
        const managementUnit = state.unit || {};

        return {
            units: managementUnit.listUnit || [],
            isLoading: managementUnit.loading || false,
        };
    });

    const receivingUnit = useMemo(() => {
        const receivingUnitsRaw = dataDetail?.document?.internalReceivingDept;
        return Array.isArray(receivingUnitsRaw)
            ? receivingUnitsRaw.filter(u => u && u.isRecall !== true)
            : [];
    }, [dataDetail?.document?.internalReceivingDept]);


    const finalUnits = units;
    const finalLoading = isLoading;

    const [selectedUnits, setSelectedUnits] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, delay);
        return () => clearTimeout(handler);
    }, [searchTerm, delay]);
    // const [selectAllDonVi, setSelectAllDonVi] = useState(false);

    useEffect(() => {
        if (!open) {
            setSelectedUnits({});
            setLockedUnitIds(new Set());
            return;
        }

        dispatch(getDataListUnit({ page: 1, limit: 500 }));
        let map = {};
        const lockedIds = new Set();

        // Ưu tiên receivingUnit trước, nếu có
        if (receivingUnit && Array.isArray(receivingUnit) && receivingUnit.length > 0) {
            receivingUnit.forEach((u) => {
                const unitId = u._id || u.id;
                map[unitId] = u;
                lockedIds.add(unitId); // Đánh dấu là locked
            });
        } else if (initialSelectedUnits.length > 0) {
            // Nếu không có receivingUnit, dùng initialSelectedUnits
            initialSelectedUnits.forEach((u) => {
                map[u._id || u.id] = u;
            });
        }

        setSelectedUnits(map);
        setLockedUnitIds(lockedIds);
        setSearchTerm("");

        if (isMobile) {
            setLeftPanelOpen(true);
            setRightPanelOpen(false);
        } else {
            setLeftPanelOpen(true);
            setRightPanelOpen(true);
        }
    }, [open, dialogKey, dispatch, isMobile, receivingUnit]);

    const unitTree = useMemo(() => {
        if (!Array.isArray(finalUnits) || finalUnits.length === 0) {
            return [];
        }
        return buildTree(finalUnits);
    }, [finalUnits]);

    const visibleNodesExist = useMemo(() => {
        if (!unitTree.length) return false;
        return hasVisibleNodes(unitTree, debouncedSearch);
    }, [unitTree, debouncedSearch]);

    const getAllDescendants = (node) => {
        let descendants = [node];
        if (node.children && node.children.length > 0) {
            node.children.forEach((child) => {
                descendants = [...descendants, ...getAllDescendants(child)];
            });
        }
        return descendants;
    };

    const handleToggle = (unit) => {
        // Không cho phép bỏ chọn nếu unit bị locked
        if (lockedUnitIds.has(unit._id) && selectedUnits[unit._id]) {
            return;
        }

        const newSelected = { ...selectedUnits };

        // Tìm node trong tree để lấy thông tin children
        const findNodeInTree = (nodes, id) => {
            for (let node of nodes) {
                if (node._id === id) return node;
                if (node.children && node.children.length > 0) {
                    const found = findNodeInTree(node.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const nodeInTree = findNodeInTree(unitTree, unit._id);

        if (newSelected[unit._id]) {
            // Bỏ chọn: xóa node và tất cả con của nó (trừ locked units)
            if (nodeInTree) {
                const descendants = getAllDescendants(nodeInTree);
                descendants.forEach((desc) => {
                    // Chỉ xóa nếu không phải locked unit
                    if (!lockedUnitIds.has(desc._id)) {
                        delete newSelected[desc._id];
                    }
                });
            }
        } else {
            // Chọn: thêm node và tất cả con của nó
            if (nodeInTree) {
                const descendants = getAllDescendants(nodeInTree);
                descendants.forEach((desc) => {
                    newSelected[desc._id] = desc;
                });
            }
        }

        setSelectedUnits(newSelected);

    };


    const handleSave = useCallback(async () => {
        try {
            const body = {
                documentId: documentId,
                receiveUnits: Object.keys(selectedUnits),
					}
						const isAuthority = dataDetail?.document?.isAuthority;
						const params = isAuthority ? { isAuthority } : {};
            const res = await axiosInstance.post(`${APP_BASE}/api/outgoing-documents/additional-release`, body, {params})

            if (res) {
                toast("Phát hành bổ sung thành công", "success");
                onClose();
                onCloseAppBar()
                setReloadData(new Date() * 1);
            }

        } catch (error) {
            logger.log('error', error)
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        }

    }, [toast, onClose, selectedUnits, documentId, onCloseAppBar, setReloadData]);

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
    const handleUserChange = (newValue) => {
        setSelectedUser(newValue);
    };

    return (
        <StyledDialogReceivingUnit open={open} onClose={onClose}>
            <DialogContainer>
                <DialogTitle>CHỌN ĐƠN VỊ NHẬN</DialogTitle>
                <DialogContent>
                    <Grid container>
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
                                                <StatusText>
                                                    Không có dữ liệu
                                                </StatusText>
                                            </CenteredBox>
                                        ) : (
                                            unitTree.map((node) => (
                                                <CustomTreeItem
                                                    key={node._id}
                                                    node={node}
                                                    selectedUnits={selectedUnits}
                                                    onToggle={handleToggle}
                                                    searchTerm={debouncedSearch}
                                                    isRightPanel={false}
                                                    lockedUnitIds={lockedUnitIds}
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

                                    <CustomAsyncAutoComplete
                                        fullWidth
                                        label="Tự động chọn đơn vị nhận"
                                        placeholder="DVTT/CTC/..."
                                        value={selectedUser}
                                        onChange={handleUserChange}
                                        url={API_GET_LIST_USERS}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="_id"
                                        returnObject
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
                                                    key={node._id}
                                                    node={node}
                                                    selectedUnits={selectedUnits}
                                                    onToggle={handleToggle}
                                                    searchTerm=""
                                                    isRightPanel
                                                    lockedUnitIds={lockedUnitIds}
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

AdditionalRelease.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
};

export default AdditionalRelease;
