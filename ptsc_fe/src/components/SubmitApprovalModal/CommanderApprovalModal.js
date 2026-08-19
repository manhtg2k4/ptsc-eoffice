import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
    Box,
    Grid,
    Collapse,
    styled,
    CircularProgress,
} from '@mui/material';
import {
    Search as SearchIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import axiosInstance from '@utils/axiosInstance';
import { API_GET_USERS_IN_FLOW, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import { useToast } from "@components/common/ToastProvider";
import {
    SkyBox,
    SkyTypography,
    SkyCheckbox,
    SkyIconButton,
    SkyTextField,
    SkyDialog,
    SkyDialogTitle,
    SkyDialogContent,
    SkyInputAdornment,
} from "@styles/SkyStyles";

// --- Styled Components ---

const StyledDialog = styled(SkyDialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        maxWidth: theme.breakpoints?.values.xl,
        width: "100%",
        height: "90vh",
        display: "flex",
        flexDirection: "column",
    },
}));

StyledDialog.defaultProps = {
    maxWidth: 'xl',
};

const StyledDialogTitle = styled(SkyDialogTitle)({
    fontWeight: 'bold',
    flexShrink: 0,
});

const StyledDialogContent = styled(SkyDialogContent)(() => ({
    padding: '0 !important',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
}));

const LeftPanel = styled(SkyBox)(({ theme }) => ({
    borderRight: `1px solid ${theme.palette.divider}`,
    padding: "16px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
    overflow: "hidden",
}));

const RightPanel = styled(SkyBox)(({ theme }) => ({
    padding: "16px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
    overflow: "hidden",
}));

const SkyInputAdornmentStyled = styled(SkyInputAdornment)(() => ({
   position: "start"
}));

const SearchBarContainer = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    gap: '8px',
    marginBottom: theme.spacing(2),
    flexShrink: 0,
}));

const LeftPanelHeader = styled(SkyBox)(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1, 0),
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(1),
    flexShrink: 0,
    backgroundColor: theme.palette.background.default,
}));

const HeaderCol = styled(SkyTypography)(({ theme }) => ({
    fontWeight: "bold",
    fontSize: "13px",
    color: theme.palette.text.primary,
    flexGrow: 1,
    paddingLeft: theme.spacing(1),
}));

const RoleHeaderCol = styled(HeaderCol)(() => ({
    width: 140,
    textAlign: "center",
    flexGrow: 0,
    whiteSpace: "normal",
}));

const PanelContent = styled(SkyBox)({
    flexGrow: 1,
    overflowY: "auto",
    minHeight: 0,
    "&::-webkit-scrollbar": { width: 8 },
    "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
    "&::-webkit-scrollbar-thumb": { background: "#888", borderRadius: 4 },
    "&::-webkit-scrollbar-thumb:hover": { background: "#555" },
});

const TreeItemContainer = styled(SkyBox, {
    shouldForwardProp: (prop) => prop !== 'level',
})(({ theme, level }) => ({
    display: "flex",
    alignItems: "center",
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    paddingRight: theme.spacing(1),
    paddingLeft: theme.spacing(level * 3 + 1),
    transition: 'all 0.2s ease',
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:hover": {
        backgroundColor: theme.palette.action.hover
    }
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

const TreeItemLabel = styled(SkyTypography, {
    shouldForwardProp: (prop) => prop !== 'isRoot',
})(({ theme, isRoot }) => ({
    flexGrow: 1,
    fontSize: '14px',
    fontWeight: isRoot ? 'bold' : 'normal',
    color: theme.palette.text.primary,
    cursor: 'pointer',
    userSelect: 'none',
}));

const RoleColumn = styled(SkyBox)({
    width: 120,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
});

const PanelTitleHeader = styled(SkyTypography)(({ theme }) => ({
    fontSize: "1rem",
    fontWeight: "bold",
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
    flexShrink: 0,
    textTransform: 'uppercase',
}));

const SelectedTableContainer = styled(SkyBox)(({ theme }) => ({
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px",
    overflow: "hidden",
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
}));

const SelectedTable = styled('table')(({ theme }) => ({
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: theme.palette.background.paper,
}));

const SelectedTh = styled('th')(({ theme }) => ({
    backgroundColor: "#0062ac",
    color: "white",
    padding: theme.spacing(1.5, 1),
    fontSize: "13px",
    border: `1px solid #005a9e`,
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 1,
}));

const SttTh = styled(SelectedTh)({
    width: "60px",
});

const NameTh = styled(SelectedTh)({
    textAlign: "left",
});

const RoleTh = styled(SelectedTh)({
    width: "120px",
});

const ActionTh = styled(SelectedTh)({
    width: "80px",
});

const SelectedTd = styled('td', {
    shouldForwardProp: (prop) => prop !== 'align',
})(({ theme, align }) => ({
    padding: theme.spacing(1.2, 1),
    fontSize: "14px",
    border: `1px solid ${theme.palette.divider}`,
    textAlign: align || "left",
    color: theme.palette.text.primary,
}));

const NoSelectionTd = styled(SelectedTd)(({ theme }) => ({
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing(4),
}));

const ActionIconButton = styled(SkyIconButton)(({ theme }) => ({
    padding: 4,
    color: theme.palette.error.main,
    '&:hover': {
        color: theme.palette.error.dark,
        backgroundColor: theme.palette.error.light + '20',
    },
    '& .MuiSvgIcon-root': {
        fontSize: '20px',
    },
}));

const FooterActions = styled(SkyBox)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
}));

const PrimaryButton = styled('button')(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    padding: '8px 24px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    minWidth: '100px',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

const DangerButton = styled('button')(() => ({
    backgroundColor: '#d32f2f',
    color: 'white',
    padding: '8px 24px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    minWidth: '100px',
    '&:hover': {
        backgroundColor: '#b71c1c',
    },
}));

const RootContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
});

const MainGridContainer = styled(Grid)({
    flex: 1,
    minHeight: 0,
    height: '100%',
});

const PanelGridItem = styled(Grid)({
    height: '100%',
});

const RoleRoleCell = styled(SelectedTd)({
    color: '#ff4d4f',
    fontWeight: 500,
});

const LoadingContainer = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
}));

const ErrorTypography = styled(SkyTypography)(({ theme }) => ({
    color: theme.palette.error.main,
    textAlign: 'center',
    marginTop: theme.spacing(4),
}));

const EmptyTypography = styled(SkyTypography)(({ theme }) => ({
    textAlign: 'center',
    marginTop: theme.spacing(4),
    color: theme.palette.text.secondary,
}));

const SearchBarIconArr = styled(SearchIcon)(() => ({
    fontSize: '1.25rem',
}));

// --- Helper Functions ---

const SelectedRow = memo(function SelectedRow({ item, idx, onRemove }) {
    const handleRemove = useCallback(function handleRemove() {
        onRemove(item.id || item._id);
    }, [item.id, item._id, onRemove]);

    return (
        <tr>
            <SelectedTd align="center">{idx + 1}</SelectedTd>
            <SelectedTd>
                {item.name}
                {item.position && ` - ${item.position}`}
            </SelectedTd>
            <RoleRoleCell align="center">
                Xử lý chính
            </RoleRoleCell>
            <SelectedTd align="center">
                <ActionIconButton onClick={handleRemove}>
                    <DeleteIcon />
                </ActionIconButton>
            </SelectedTd>
        </tr>
    );
});

const CustomRenderTree = memo(function CustomRenderTree({ tree, level, onSelect, selectedIds, expanded, onExpandToggle }) {
    return (
        <>
            {Object.entries(tree).map(function renderRoot([rootName, data]) {
                const rootKey = `root:${rootName}`;
                const hasChildren = data.directUsers.length > 0 || Object.keys(data.subOrgs).length > 0;
                const isExpanded = !!expanded[rootKey];

                const handleToggleExpand = function handleToggleExpand(e) {
                    e.stopPropagation();
                    onExpandToggle(rootKey);
                };

                return (
                    <Box key={rootKey}>
                        <TreeItemContainer level={level}>
                            <ExpandIconButton
                                hasChildren={hasChildren}
                                onClick={handleToggleExpand}
                            >
                                {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </ExpandIconButton>
                            <TreeItemLabel variant="body2" isRoot onClick={handleToggleExpand}>
                                {rootName}
                            </TreeItemLabel>
                            <RoleColumn />
                        </TreeItemContainer>

                        <Collapse in={isExpanded}>
                            {data.directUsers.map(function renderUser(user) {
                                const userId = user._id || user.id;
                                const isUserSelected = selectedIds.includes(userId);
                                const handleUserSelect = function handleUserSelect() {
                                    onSelect(userId);
                                };
                                return (
                                    <TreeItemContainer key={userId} level={level + 1}>
                                        <ExpandIconButton hasChildren={false} />
                                        <TreeItemLabel variant="body2">
                                            {user.name} {user.position ? `- ${user.position}` : ''}
                                        </TreeItemLabel>
                                        <RoleColumn>
                                            <SkyCheckbox
                                                size="small"
                                                checked={isUserSelected}
                                                onChange={handleUserSelect}
                                            />
                                        </RoleColumn>
                                    </TreeItemContainer>
                                );
                            })}

                            {Object.entries(data.subOrgs).map(function renderSubOrg([subName, users]) {
                                const subKey = `sub:${rootName}:${subName}`;
                                const subIsExpanded = !!expanded[subKey];
                                const subHasChildren = users.length > 0;
                                const handleSubExpand = function handleSubExpand() {
                                    onExpandToggle(subKey);
                                };

                                return (
                                    <Box key={subKey}>
                                        <TreeItemContainer level={level + 1}>
                                            <ExpandIconButton
                                                hasChildren={subHasChildren}
                                                onClick={handleSubExpand}
                                            >
                                                {subIsExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                                            </ExpandIconButton>
                                            <TreeItemLabel variant="body2" onClick={handleSubExpand}>
                                                {subName}
                                            </TreeItemLabel>
                                            <RoleColumn />
                                        </TreeItemContainer>

                                        <Collapse in={subIsExpanded}>
                                            {users.map(function renderSubUser(user) {
                                                const userId = user._id || user.id;
                                                const isUserSelected = selectedIds.includes(userId);
                                                const handleSubUserSelect = function handleSubUserSelect() {
                                                    onSelect(userId);
                                                };
                                                return (
                                                    <TreeItemContainer key={userId} level={level + 2}>
                                                        <ExpandIconButton hasChildren={false} />
                                                        <TreeItemLabel variant="body2">
                                                            {user.name} {user.position ? `- ${user.position}` : ''}
                                                        </TreeItemLabel>
                                                        <RoleColumn>
                                                            <SkyCheckbox
                                                                size="small"
                                                                checked={isUserSelected}
                                                                onChange={handleSubUserSelect}
                                                            />
                                                        </RoleColumn>
                                                    </TreeItemContainer>
                                                );
                                            })}
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </Collapse>
                    </Box>
                );
            })}
        </>
    );
});

// --- Main Component ---

export default function CommanderApprovalModal({
    open,
    onClose,
    onConfirmWithAssignee,
    onSubmit,
    documentId,
    actionCode,
    workItem,
    flowConfig,
    title = "TRÌNH PHÊ DUYỆT",
    endpoint = "commanders-destroy-records",
    roles = "BAN_LANH_DAO",
    delay = 1000
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selected, setSelected] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const toast = useToast();

    useEffect(function fetchApproversEffect() {
        async function fetchApprovers() {
            if (open) {
                setLoading(true);
                setError(null);
                try {
                    const response = await axiosInstance.get(`${API_GET_USERS_IN_FLOW}?roles=${roles}`);
                    const data = response?.data || response || [];
                    setApprovers(data);
                } catch (err) {
                    setError('Không thể tải danh sách nhân sự');
                } finally {
                    setLoading(false);
                }
            }
        }

        fetchApprovers();
    }, [open, roles]);

    const handleSearchChange = useCallback(function handleSearchChange(e) {
        setSearchTerm(e.target.value);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, delay);
        return () => clearTimeout(handler);
    }, [searchTerm, delay]);

    const handleToggleSelect = useCallback(function handleToggleSelect(id) {
        setSelected(function toggleId(prev) {
            return prev.includes(id) ? [] : [id];
        });
    }, []);

    const handleRemoveSelected = useCallback(function handleRemoveSelected(id) {
        setSelected(function removeId(prev) {
            return prev.filter(function isNotMatch(item) {
                return item !== id;
            });
        });
    }, []);

    const handleToggleExpand = useCallback(function handleToggleExpand(key) {
        setExpandedGroups(function toggleGroup(prev) {
            return {
                ...prev,
                [key]: !prev[key]
            };
        });
    }, []);

    const filteredApprovers = useMemo(function filterApprovers() {
        if (!debouncedSearchTerm) return approvers;
        const normalizedSearch = debouncedSearchTerm.toLowerCase();
        return approvers.filter(function isMatch(approver) {
            return (approver.name || "").toLowerCase().includes(normalizedSearch) ||
                (approver.organizationName || "").toLowerCase().includes(normalizedSearch) ||
                (approver.rootOrganizationName || "").toLowerCase().includes(normalizedSearch);
        });
    }, [approvers, debouncedSearchTerm]);

    const treeApprovers = useMemo(function buildTree() {
        const tree = {};
        filteredApprovers.forEach(function processApprover(approver) {
            const rootName = approver.rootOrganizationName || "Khác";
            const orgName = approver.organizationName || rootName;

            if (!tree[rootName]) {
                tree[rootName] = { directUsers: [], subOrgs: {} };
            }

            if (orgName === rootName) {
                tree[rootName].directUsers.push(approver);
            } else {
                if (!tree[rootName].subOrgs[orgName]) {
                    tree[rootName].subOrgs[orgName] = [];
                }
                tree[rootName].subOrgs[orgName].push(approver);
            }
        });
        return tree;
    }, [filteredApprovers]);

    const selectedUsers = useMemo(function getSelectedUsers() {
        return approvers.filter(function isSelected(u) {
            return selected.includes(u._id || u.id);
        });
    }, [approvers, selected]);

    useEffect(function updateExpandedGroupsEffect() {
        if (Object.keys(treeApprovers).length > 0) {
            const initial = {};
            Object.entries(treeApprovers).forEach(function initExpand([rootName, data], index) {
                const rootKey = `root:${rootName}`;
                initial[rootKey] = index === 0;
                Object.keys(data.subOrgs).forEach(function initSubExpand(subName) {
                    initial[`sub:${rootName}:${subName}`] = true;
                });
            });
            setExpandedGroups(initial);
        }
    }, [treeApprovers]);

    const handleConfirm = useCallback(async function handleConfirm() {
        if (selected.length === 0) return;
        setLoading(true);
        try {
            if (onConfirmWithAssignee) {
                await onConfirmWithAssignee(selected[0]);
                setLoading(false);
                return;
            }

            const payload = {
                actionCode: actionCode || "CHP_PHE_DUYET_HHS",
                assigneeUserId: selected[0],
                workItem: workItem,
                flowConfig: flowConfig
            };
            
            await axiosInstance.post(`${APP_BASE}/api/destroy-records/${documentId}/${endpoint}`, payload);
            toast("Trình phê duyệt thành công", "success");
            if (onSubmit) {
                onSubmit(selected);
            }
            onClose();
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Lỗi khi trình phê duyệt", "error");
        } finally {
            setLoading(false);
        }
    }, [selected, documentId, onSubmit, onConfirmWithAssignee, onClose, toast, actionCode, workItem, flowConfig, endpoint]);

    const startAdornment = useMemo(function getStartAdornment() {
        return (
            <SkyInputAdornmentStyled>
                <SearchBarIconArr />
            </SkyInputAdornmentStyled>
        );
    }, []);

    const inputProps = useMemo(function getInputProps() {
        return {
            startAdornment: startAdornment,
        };
    }, [startAdornment]);

    return (
        <StyledDialog open={open} onClose={onClose}>
            <StyledDialogTitle>
                {title}
            </StyledDialogTitle>
            <StyledDialogContent>
                <RootContainer>
                    <MainGridContainer container>
                        <PanelGridItem item xs={12} md={6}>
                            <LeftPanel>
                                <SearchBarContainer>
                                    <SkyTextField
                                        fullWidth
                                        size="small"
                                        placeholder="Tìm kiếm đơn vị, cá nhân..."
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        InputProps={inputProps}
                                    />
                                </SearchBarContainer>

                                <LeftPanelHeader>
                                    <HeaderCol>Tên đơn vị, cá nhân</HeaderCol>
                                    <RoleHeaderCol>Chỉ đạo/Xử lý chính</RoleHeaderCol>
                                </LeftPanelHeader>

                                <PanelContent>
                                    {loading ? (
                                        <LoadingContainer>
                                            <CircularProgress />
                                        </LoadingContainer>
                                    ) : error ? (
                                        <ErrorTypography>{error}</ErrorTypography>
                                    ) : Object.keys(treeApprovers).length === 0 ? (
                                        <EmptyTypography>Không có dữ liệu</EmptyTypography>
                                    ) : (
                                        <CustomRenderTree
                                            tree={treeApprovers}
                                            level={0}
                                            onSelect={handleToggleSelect}
                                            selectedIds={selected}
                                            expanded={expandedGroups}
                                            onExpandToggle={handleToggleExpand}
                                        />
                                    )}
                                </PanelContent>
                            </LeftPanel>
                        </PanelGridItem>

                        <PanelGridItem item xs={12} md={6}>
                            <RightPanel>
                                <PanelTitleHeader>Danh sách đơn vị/cá nhân</PanelTitleHeader>

                                <SelectedTableContainer>
                                    <PanelContent>
                                        <SelectedTable>
                                            <thead>
                                                <tr>
                                                    <SttTh>STT</SttTh>
                                                    <NameTh>Tên đơn vị, cá nhân</NameTh>
                                                    <RoleTh>Vai trò</RoleTh>
                                                    <ActionTh>Bỏ chọn</ActionTh>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedUsers.length === 0 ? (
                                                    <tr>
                                                        <NoSelectionTd colSpan={4}>
                                                            Chưa có đơn vị/cá nhân nào được chọn
                                                        </NoSelectionTd>
                                                    </tr>
                                                ) : (
                                                    selectedUsers.map(function renderSelectedRow(item, idx) {
                                                        return (
                                                            <SelectedRow
                                                                key={item._id || item.id}
                                                                item={item}
                                                                idx={idx}
                                                                onRemove={handleRemoveSelected}
                                                            />
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </SelectedTable>
                                    </PanelContent>
                                </SelectedTableContainer>
                            </RightPanel>
                        </PanelGridItem>
                    </MainGridContainer>

                    <FooterActions>
                        <PrimaryButton onClick={handleConfirm} disabled={selected.length === 0}>TRÌNH</PrimaryButton>
                        <DangerButton onClick={onClose}>HUỶ</DangerButton>
                    </FooterActions>
                </RootContainer>
            </StyledDialogContent>
        </StyledDialog>
    );
}
