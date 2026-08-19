import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { styled } from "@mui/material/styles";
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Typography,
  Tooltip
} from "@mui/material";

// --- IMPORT LOGIC ---
// import { removeVietnameseTones } from "@utils/Common/Common";
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
// import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import {
  StyledDialog,
  CancelButton,
  SaveButton,
  CloseIconButton,
  StyledDialogContent,
} from "@styles/CustomDialog.styles";
import CloseIcon from "@mui/icons-material/Close";
import withSharedComponents from "@components/WrapperComponent";
import { fetchOrganizationUnits } from "@redux/slices/Directive/Directive";
import { useDispatch, useSelector } from "react-redux";
import RenderTableTree from "@components/SigningSubmission/RenderTableTree";
import { getUserInflow } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import { SkyBox, SkyGrid, SkyTable, SkyTableBody, SkyTableCell, SkyTableHead, SkyTableRow } from "@styles/SkyStyles";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { DragIndicator } from "@mui/icons-material";
import axiosInstance from "@utils/axiosInstance";
import { API_OUTGOING_DRAFT_SIGNERS, API_GET_USER_INFLOW } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import {
  OrgAvatar,
  OrgEmptyBox,
  OrgListHeader,
  OrgListTitle,
  OrgLoadingOverlay,
  OrgPagination,
  OrgPaginationBox,
  OrgRows,
  OrgSearchBox,
  OrgUserCheckbox,
  OrgUserName,
  OrgUserPicker,
  OrgUserRow,
  OrgUserSub,
  OrgUserTextBox,
  SelectAllBox,
} from "./DigitalSignatureProposalPopup.styles";

// ==========================================
// --- STYLED COMPONENTS (KHÔNG SX, KHÔNG INLINE STYLE) ---
// ==========================================

const StyledTableContainer = styled(SkyBox)(({ theme }) => ({
  overflowY: 'auto',
  overflowX: 'hidden',
  height: '600px',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  width: '100%',
  '& .MuiTable-root': {
    borderCollapse: 'separate', // Quan trọng để sticky header hoạt động
    borderSpacing: 0,
  },
  '& thead th': {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    backgroundColor: "#f8fafd", // Matching mockup light background
    borderBottom: `1px solid ${theme.palette.divider}`,
  }
}));

const StyledSearchWrapper = styled(SkyBox)({
  marginBottom: '16px',
});

const StyledTreeContainer = styled(SkyBox)({
  overflow: 'hidden',
  maxHeight: '600px',
  minHeight: '600px',
  flex: 1,
});

const StyledTable = styled(SkyTable)(({ theme }) => ({
  borderCollapse: 'separate',
  width: '100%',
  minWidth: 'auto',
  tableLayout: 'fixed',
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

const StyledOrderText = styled('span')(({ theme }) => ({
  fontWeight: 'bold',
  textAlign: 'center',
  display: 'block',
  // Số thứ tự 3 có màu xanh lá như ảnh mẫu
  color:  theme.palette.text.primary,
}));

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

const OrderCell = styled(HeaderCell)(({ theme }) => ({
  width: 100,
  textAlign: "center",
  backgroundColor: "#f8fafd",
  color: theme.palette.primary.main,
}));

const RemoveCell = styled(HeaderCell)(({ theme }) => ({
  width: 80,
  textAlign: "center",
  backgroundColor: "#f8fafd",
  color: theme.palette.primary.main,
}));

const StyledBodyGridContainer = styled(SkyGrid)(({ theme }) => ({
  padding: theme.spacing(1.5),
  flex: 1,
  minHeight: 0,
}));

const StyledPanelGridItem = styled(SkyGrid)(() => ({
  display: "flex",
  flexDirection: "column",
}));

const StyledPanelNoPadding = styled(StylePanel)(() => ({
  margin: 0,
  padding: 0,
}));

const StyledPanelContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

const StyledHeaderIcon = styled(Box)(({ theme }) => ({
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

const DraggableTableRow = styled(SkyTableRow, {
  shouldForwardProp: (prop) => prop !== 'isDragging',
})(({ theme, isDragging }) => ({
  backgroundColor: isDragging ? theme.palette.action.hover : 'inherit',
  display: isDragging ? 'table' : 'table-row',
}));

const StyledUserInfoBox = styled(SkyBox)({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

const StyledDragIndicator = styled(DragIndicator)(({ theme }) => ({
  color: theme.palette.action.active,
  cursor: 'grab',
  fontSize: '1.25rem',
}));

const StyledSelectedUserName = styled('span')({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  minWidth: 0,
  fontSize: '13px',
});

const StyledTableCellEllipsis = styled(SkyTableCell)({
  overflow: 'hidden',
});

const StyledUserInfoBoxEllipsis = styled(StyledUserInfoBox)({
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
});

const StyledDragIndicatorShrink = styled(StyledDragIndicator)({
  flexShrink: 0,
});

const ExecutionModeBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: theme.spacing(1, 2),
  paddingTop: theme.spacing(1),
}));

const ExecutionModeLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: "13px",
  fontWeight: 600,
}));

const ExecutionModeOptions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing(1),
}));

const ExecutionModeOption = styled(FormControlLabel)(({ theme }) => ({
  marginLeft: 0,
  marginRight: theme.spacing(2),
  "& .MuiFormControlLabel-label": {
    color: theme.palette.text.primary,
    fontSize: "13px",
  },
  "& .MuiFormControlLabel-label.Mui-disabled": {
    color: theme.palette.text.primary,
  },
}));

const ExecutionModeCheckbox = styled(Checkbox)(({ theme }) => ({
  padding: theme.spacing(0.5),
  "&.Mui-disabled.Mui-checked": {
    color: theme.palette.primary.main,
  },
}));

// ==========================================
// --- MAIN COMPONENT ---
// ==========================================

// --- SUB COMPONENT TO AVOID INLINE FUNCTIONS ---
const SelectedUserRow = memo(({ item, index, onRemove, provided, snapshot }) => {
  const handleRemove = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  return (
    <DraggableTableRow
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      isDragging={snapshot.isDragging}
    >
      <StyledTableCellEllipsis>
        <StyledUserInfoBoxEllipsis>
          <StyledDragIndicatorShrink />
          <Tooltip title={item.name} placement="top" arrow>
            <StyledSelectedUserName>
              {item.name}
            </StyledSelectedUserName>
          </Tooltip>
        </StyledUserInfoBoxEllipsis>
      </StyledTableCellEllipsis>
      <SkyTableCell>
        <StyledOrderText index={index + 1}>
          {index + 1}
        </StyledOrderText>
      </SkyTableCell>
      <SkyTableCell align="center">
        <Checkbox
          size="small"
          checked
          onChange={handleRemove}
        />
      </SkyTableCell>
    </DraggableTableRow>
  );
});

SelectedUserRow.displayName = "SelectedUserRow";

const ORG_USER_LIMIT = 10;
const EXECUTION_MODES = {
  PARALLEL: "PARALLEL",
  SEQUENTIAL: "SEQUENTIAL",
};

const normalizeExecutionMode = (value) => {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim().toUpperCase();
  return Object.values(EXECUTION_MODES).includes(normalizedValue)
    ? normalizedValue
    : null;
};

const getExecutionModeFromUsers = (users) => {
  if (!Array.isArray(users)) return null;

  const matchedUser = users.find((user) =>
    normalizeExecutionMode(user?.executionMode)
  );

  return normalizeExecutionMode(matchedUser?.executionMode);
};

const resolveExecutionModeFromDetail = ({
  dataDetail,
  initialSelectedUsers,
  selectedStep,
  stepKey,
}) => {
  const stepKeys = [
    stepKey,
    selectedStep?.action,
    selectedStep?.lane,
  ].filter(
    (key, index, keys) =>
      typeof key === "string" &&
      key.length > 0 &&
      key !== "default" &&
      keys.indexOf(key) === index
  );
  const detailSources = [dataDetail?.document, dataDetail].filter(
    (source, index, sources) =>
      source &&
      typeof source === "object" &&
      !Array.isArray(source) &&
      sources.indexOf(source) === index
  );

  for (const source of detailSources) {
    for (const key of stepKeys) {
      const mode = getExecutionModeFromUsers(source?.[key]);
      if (mode) return mode;
    }
  }

  for (const source of detailSources) {
    for (const value of Object.values(source)) {
      const matchingUsers = Array.isArray(value)
        ? value.filter((user) => stepKeys.includes(user?.signUserType))
        : [];
      const mode = getExecutionModeFromUsers(matchingUsers);
      if (mode) return mode;
    }
  }

  return (
    getExecutionModeFromUsers(initialSelectedUsers) ||
    getExecutionModeFromUsers(selectedStep?.assigned) ||
    normalizeExecutionMode(selectedStep?.executionMode)
  );
};

const getPayloadItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.docs)) return payload.docs;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.docs)) return payload.data.docs;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const getPayloadTotal = (payload, fallback) => {
  const total =
    payload?.total ??
    payload?.count ??
    payload?.totalCount ??
    payload?.totalItems ??
    payload?.totalRecords ??
    payload?.totalDocs ??
    payload?.data?.total ??
    payload?.data?.count ??
    payload?.data?.totalCount ??
    payload?.data?.totalItems ??
    payload?.data?.totalRecords ??
    payload?.data?.totalDocs;

  return Number.isFinite(Number(total)) ? Number(total) : fallback;
};

const getPayloadTotalPages = (payload, fallback) => {
  const totalPages =
    payload?.totalPages ??
    payload?.pageCount ??
    payload?.pages ??
    payload?.data?.totalPages ??
    payload?.data?.pageCount ??
    payload?.data?.pages;

  return Number.isFinite(Number(totalPages)) ? Number(totalPages) : fallback;
};

const getUserId = (user) => user?.id || user?._id || user?.userId;

const getUserInitials = (name = "") => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[words.length - 1][0] || ""}`.toUpperCase();
};

const getUserSubLabel = (user) =>
  user?.organizationName ||
  user?.position ||
  user?.jobTitle ||
  user?.roleName ||
  user?.parentName ||
  user?.unitName ||
  "";

const OrgUserListItem = memo(({ user, checked, onToggle }) => {
  const handleToggle = useCallback(() => {
    onToggle(user);
  }, [onToggle, user]);

  const handleCheckboxClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const userName = user?.name || user?.username || "";
  const subLabel = getUserSubLabel(user);

  return (
    <OrgUserRow onClick={handleToggle}>
      <OrgAvatar>{getUserInitials(userName)}</OrgAvatar>
      <OrgUserTextBox>
        <OrgUserName title={userName}>{userName}</OrgUserName>
        <OrgUserSub title={subLabel}>{subLabel}</OrgUserSub>
      </OrgUserTextBox>
      <OrgUserCheckbox
        checked={checked}
        onClick={handleCheckboxClick}
        onChange={handleToggle}
      />
    </OrgUserRow>
  );
});

OrgUserListItem.displayName = "OrgUserListItem";

const IsMultiSigner = (props) => {
  const {
    open = false,
    label = "CHỌN NGƯỜI KÝ NHÁY",
    sharedComponents,
    onClose = () => { },
    onCloseDialog = () => { },
    docId,
    dataDetail,
    multiSelect = true,
    initialSelectedUsers = [],
    stepKey,
    selectedStep,
    selectedTypeOfProcess,
    onSelectUsers,
    delay = 1000,
    executionMode: executionModeProp,
    allowUserChangeExcMode: allowUserChangeExcModeProp,
		targetRole,
		actionCode,
  } = props;

  const { Input, toast, LoadingDialog } = sharedComponents;
  const dispatch = useDispatch();
  const { organizationUnits, loading } = useSelector((state) => state.user);
  const { users } = useSelector((state) => state.outGoingDoc);
  const isShowOrg = selectedStep?.flag?.showOrg !== "true" && selectedStep?.flag?.showOrg !== true;
  const executionMode =
    executionModeProp !== undefined
      ? normalizeExecutionMode(executionModeProp)
      : resolveExecutionModeFromDetail({
          dataDetail,
          initialSelectedUsers,
          selectedStep,
          stepKey,
        });
  const allowUserChangeExcMode =
    allowUserChangeExcModeProp !== undefined
      ? allowUserChangeExcModeProp
      : selectedStep?.allowUserChangeExcMode;
  const canChangeExecutionMode =
    allowUserChangeExcMode === true || allowUserChangeExcMode === "true";

  // Process key dùng chung cho fetch cây và danh sách cá nhân.
  const processCode = useMemo(() => (
    Array.isArray(selectedTypeOfProcess)
      ? selectedTypeOfProcess?.[0]?.processKey || selectedTypeOfProcess?.[0]?.id
      : selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id
  ), [selectedTypeOfProcess]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loadingTransfer, setLoadingTransfers] = useState(false);
  const [displayUsers, setDisplayUsers] = useState([]); // State cục bộ tránh nháy
  const [hasFetched, setHasFetched] = useState(false); // Tránh hiển thị dữ liệu cũ khi mới mount

  const [orgUsers, setOrgUsers] = useState([]);
  const [orgUserTotal, setOrgUserTotal] = useState(0);
  const [orgUserTotalPages, setOrgUserTotalPages] = useState(1);
  const [orgUserPage, setOrgUserPage] = useState(1);
  const [orgUserLoading, setOrgUserLoading] = useState(false);
  const [pinnedSelectedUserIds, setPinnedSelectedUserIds] = useState([]);
  const [selectedExecutionMode, setSelectedExecutionMode] = useState(executionMode);

  const isMountedRef = useRef(true);
  const orgLatestRequestRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // --- CALLBACKS ---

  const fetchData = useCallback(async (searchKeyword = "") => {
    try {
      if (!isShowOrg) {
        setLoadingTransfers(true);
      }

      const isAuthority = dataDetail?.document ? dataDetail?.document?.isAuthority : dataDetail?.isAuthority;

      const params = {
        typeSign: selectedStep?.action || "",
        processKey: processCode,
        name: searchKeyword ? searchKeyword : undefined, // Đồng bộ key gửi đi là 'name'
        username: searchKeyword ? searchKeyword : undefined,
        roles: selectedStep?.lane || undefined,
        ...(isAuthority === true && { isAuthority: true }),
      };

			const body = {
				processKey: processCode,
				roles: targetRole || selectedStep?.lane || actionCode,
			}

      const fetchPromises = [
        dispatch(fetchOrganizationUnits({
          body: body,
          params: { ...(isAuthority === true && { isAuthority: true }) }
        })).unwrap(),
      ];

      if (!isShowOrg) {
        fetchPromises.push(dispatch(getUserInflow(params)).unwrap());
      }

      await Promise.all(fetchPromises);

      if (isMountedRef.current) {
        setHasFetched(true);
      }
    } catch (error) {
      logger.error("Fetch error:", error);
    } finally {
      if (isMountedRef.current && !isShowOrg) {
        setLoadingTransfers(false);
      }
    }
  }, [dispatch, processCode, dataDetail, selectedStep, actionCode, targetRole, isShowOrg]);

  const fetchOrgUsers = useCallback(async (searchKeyword = "", page = 1) => {
    const requestId = ++orgLatestRequestRef.current;
    const normalizedSearch = `${searchKeyword || ""}`.trim();

    if (normalizedSearch.length > 0 && normalizedSearch.length < 2) {
      setOrgUserLoading(false);
      return;
    }

    try {
      setOrgUserLoading(true);

      const isAuthority = dataDetail?.document ? dataDetail?.document?.isAuthority : dataDetail?.isAuthority;
      const params = {
        typeSign: selectedStep?.action || "",
        processKey: processCode,
        page,
        limit: ORG_USER_LIMIT,
        name: normalizedSearch ? normalizedSearch : undefined,
        username: normalizedSearch ? normalizedSearch : undefined,
        roles: selectedStep?.lane || undefined,
        ...(isAuthority === true && { isAuthority: true }),
      };

      const response = await api.get(API_GET_USER_INFLOW, {
        params,
        timeout: 60000,
      });

      if (!isMountedRef.current || requestId !== orgLatestRequestRef.current) return;

      const payload = response?.data ?? response;
      const items = getPayloadItems(payload);
      const total = getPayloadTotal(payload, items.length);
      const totalPages = getPayloadTotalPages(payload, Math.max(1, Math.ceil(total / ORG_USER_LIMIT)));

      setOrgUsers(items);
      setOrgUserTotal(total);
      setOrgUserTotalPages(totalPages);
    } catch (error) {
      if (!isMountedRef.current || requestId !== orgLatestRequestRef.current) return;
      logger.error("Fetch org users error:", error);
      toast("Không tải được danh sách cá nhân.", "error");
      setOrgUsers([]);
      setOrgUserTotal(0);
      setOrgUserTotalPages(1);
    } finally {
      if (isMountedRef.current && requestId === orgLatestRequestRef.current) {
        setOrgUserLoading(false);
      }
    }
  }, [dataDetail, processCode, selectedStep, toast]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleExecutionModeChange = useCallback((event) => {
    if (!canChangeExecutionMode || !event.target.checked) return;

    const nextExecutionMode = normalizeExecutionMode(event.target.value);
    if (nextExecutionMode) {
      setSelectedExecutionMode(nextExecutionMode);
    }
  }, [canChangeExecutionMode]);

  const handleClose = () => {
    onCloseDialog();
    onClose();
    
    // Reset toàn bộ state khi đóng
    setSearch("");
    setDebouncedSearch("");
    setSubmittedSearch("");
    setAssignments([]);
    setDisplayUsers([]);
    setHasFetched(false);
    setPinnedSelectedUserIds([]);
    setOrgUsers([]);
    setOrgUserTotal(0);
    setOrgUserTotalPages(1);
    setOrgUserPage(1);
    setOrgUserLoading(false);
  };

  const handleCheckboxChange = useCallback((id, type, unitType, item) => {
    setAssignments((prev) => {
      const existingIndex = prev.findIndex(a => a.id === `${id}`);
      
      // Remove item if exists
      if (existingIndex > -1) {
        return prev.filter((_, index) => index !== existingIndex);
      }
      
      const newUser = {
        id: `${id}`,
        name: item?.name || item?.username || "",
        code: item?.code || "",
        parentName: item?.parentName,
        unitType: "user",
        chiDao: true
      };

      // If multiSelect, check for duplicates by code
      if (multiSelect) {
        // Remove valid duplicates (same code)
        let newArr = [...prev];
        if (newUser.code) {
          newArr = newArr.filter(u => u.code !== newUser.code);
        }
        return [...newArr, newUser];
      }

      return [newUser];
    });
  }, [multiSelect]);

  const handleOrgUserToggle = useCallback((user) => {
    const userId = getUserId(user);
    if (!userId) return;

    handleCheckboxChange(userId, "chiDao", "user", {
      ...user,
      id: userId,
      types: "user",
      unitType: "user",
      parentName: user?.parentName,
    });
  }, [handleCheckboxChange]);

  const handleOrgPageChange = useCallback((_, page) => {
    setOrgUserPage(page);
  }, []);

  const onDragEnd = useCallback((result) => {
    if (!result.destination) return;

    setAssignments((prev) => {
      const items = Array.from(prev);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      return items;
    });
  }, []);

  const onSubmit = useCallback(async () => {
    const selectedData = assignments.map(
      (assignment) => ({
        userId: assignment.id,
        name: assignment.name,
        code: assignment.code,
        unitType: assignment.unitType,
        ...assignment,
      })
    );

    const signerType = stepKey || selectedStep?.action || selectedStep?.lane;
    const userIds = [...new Set(
      selectedData
        .map((user) => user?.userId || user?.id || user?._id)
        .filter(Boolean)
        .map((userId) => String(userId))
    )];
    const executionModeValue = selectedExecutionMode
      ? EXECUTION_MODES[selectedExecutionMode]
      : null;

    const resolvedDocId =
      dataDetail?.document?.documentId ||
      dataDetail?.documentId ||
      docId ||
      dataDetail?.document?.id ||
      dataDetail?.id ||
      dataDetail?._id;

    if (!resolvedDocId || !signerType) {
      toast("Không đủ thông tin để lưu người ký.", "warning");
      return;
    }

    try {
      await axiosInstance.put(API_OUTGOING_DRAFT_SIGNERS(resolvedDocId), {
        signerType,
        userIds,
        ...(executionModeValue && {
          executionMode: executionModeValue,
        }),
      });
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Lưu người ký thất bại.";
      toast(errorMessage, "error");
      return;
    }

    if (onSelectUsers) {
      await Promise.resolve(onSelectUsers(selectedData));
    }

    onCloseDialog();
    onClose();

    // Reset toàn bộ state khi submit thành công
    setSearch("");
    setDebouncedSearch("");
    setSubmittedSearch("");
    setAssignments([]);
    setDisplayUsers([]);
    setHasFetched(false);
    setPinnedSelectedUserIds([]);
    setOrgUsers([]);
    setOrgUserTotal(0);
    setOrgUserTotalPages(1);
    setOrgUserPage(1);
    setOrgUserLoading(false);
  }, [
    assignments,
    stepKey,
    selectedStep,
    docId,
    dataDetail,
    selectedExecutionMode,
    onSelectUsers,
    onCloseDialog,
    onClose,
    toast,
  ]);

  // --- EFFECTS ---

  useEffect(() => {
    if (open) {
      setSelectedExecutionMode(executionMode);
    }
  }, [open, stepKey, executionMode]);

  // Debounce tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      if (isShowOrg) {
        const trimmed = search.trim();
        if (trimmed.length > 0 && trimmed.length < 2) {
          orgLatestRequestRef.current += 1;
          setOrgUserLoading(false);
          return;
        }

        setSubmittedSearch(trimmed);
        setDebouncedSearch(trimmed);
        setOrgUserPage(1);
        return;
      }

      setDebouncedSearch(search);
    }, isShowOrg ? 500 : delay);

    return () => {
      clearTimeout(handler);
    };
  }, [search, delay, isShowOrg]);

  // Gọi API lấy dữ liệu mới
  useEffect(() => {
    if (open && !isShowOrg) {
      fetchData(debouncedSearch);
    }
  }, [open, debouncedSearch, stepKey, fetchData, isShowOrg]);

  useEffect(() => {
    if (!open || !isShowOrg) return;

    const trimmed = submittedSearch.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      orgLatestRequestRef.current += 1;
      setOrgUserLoading(false);
      return;
    }

    fetchOrgUsers(trimmed, orgUserPage);
  }, [open, isShowOrg, submittedSearch, orgUserPage, stepKey, fetchOrgUsers]);

  // Clear displayUsers khi debouncedSearch thay đổi (tránh nháy)
  useEffect(() => {
    if (isShowOrg) return;
    setDisplayUsers([]);
  }, [debouncedSearch, isShowOrg]);

  // Đồng bộ displayUsers khi Redux có data mới (chỉ sau khi đã fetch cho instance hiện tại)
  useEffect(() => {
    if (!isShowOrg && hasFetched) {
      setDisplayUsers(users || []);
    }
  }, [users, hasFetched, isShowOrg]);

  // Khôi phục danh sách đã chọn
  useEffect(() => {
    if (!open) return;
    const initial = Array.isArray(initialSelectedUsers) ? initialSelectedUsers : [];
    const restored = initial.map((user) => {
      const id = user.userId || user.id || user._id;
      return { ...user, id: `${id}`, chiDao: true };
    });
    setAssignments(restored);
    setPinnedSelectedUserIds(restored.map((user) => `${user.id}`).filter(Boolean));
  }, [open, stepKey, initialSelectedUsers]);

  // Reset toàn bộ state khi đóng popup hoặc thay đổi stepKey để bảo đảm 100% sạch sẽ
  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setSubmittedSearch("");
      setAssignments([]);
      setDisplayUsers([]);
      setHasFetched(false);
      setPinnedSelectedUserIds([]);
      setOrgUsers([]);
      setOrgUserTotal(0);
      setOrgUserTotalPages(1);
      setOrgUserPage(1);
      setOrgUserLoading(false);
    }
  }, [open, stepKey]);

  // --- MEMOS ---
  const isChecked = useCallback((item) => assignments.some(a => a.id === `${item._id || item.id}`), [assignments]);

  const selectedList = assignments;

  const displayedOrgUsers = useMemo(() => {
    const shouldPinSelectedUsers =
      isShowOrg && orgUserPage === 1 && submittedSearch.trim() === "";

    if (!shouldPinSelectedUsers) return orgUsers;

    const pinnedIds = new Set(pinnedSelectedUserIds);
    const selectedUsers = (assignments || [])
      .filter((assignment) => assignment?.chiDao && pinnedIds.has(`${assignment?.id}`))
      .map((assignment) => ({
        ...assignment,
        id: assignment?.id,
        types: "user",
        unitType: "user",
      }))
      .filter((user) => getUserId(user));

    if (selectedUsers.length === 0) return orgUsers;

    const seenIds = new Set(selectedUsers.map((user) => `${getUserId(user)}`));
    const apiUsers = orgUsers.filter((user) => {
      const userId = getUserId(user);
      if (!userId || seenIds.has(`${userId}`)) return false;
      seenIds.add(`${userId}`);
      return true;
    });

    return [...selectedUsers, ...apiUsers];
  }, [assignments, submittedSearch, isShowOrg, orgUserPage, orgUsers, pinnedSelectedUserIds]);

  const currentOrgUserIds = useMemo(
    () => displayedOrgUsers.map(getUserId).filter(Boolean).map((id) => `${id}`),
    [displayedOrgUsers]
  );

  const selectedOrgUserIds = useMemo(
    () => new Set(assignments.map((assignment) => `${assignment.id}`)),
    [assignments]
  );

  const isAllCurrentOrgUsersSelected =
    currentOrgUserIds.length > 0 &&
    currentOrgUserIds.every((id) => selectedOrgUserIds.has(id));

  const isSomeCurrentOrgUsersSelected =
    currentOrgUserIds.some((id) => selectedOrgUserIds.has(id)) &&
    !isAllCurrentOrgUsersSelected;

  const handleSelectAllOrgUsers = useCallback(() => {
    if (!multiSelect || currentOrgUserIds.length === 0) return;

    setAssignments((prev) => {
      if (isAllCurrentOrgUsersSelected) {
        return prev.filter((assignment) => !currentOrgUserIds.includes(`${assignment.id}`));
      }

      const next = [...prev];
      const existingIds = new Set(next.map((assignment) => `${assignment.id}`));

      displayedOrgUsers.forEach((user) => {
        const userId = getUserId(user);
        if (!userId) return;

        const key = `${userId}`;
        if (existingIds.has(key)) return;

        next.push({
          id: key,
          name: user?.name || user?.username || "",
          code: user?.code || "",
          parentName: user?.parentName,
          unitType: "user",
          chiDao: true,
        });
        existingIds.add(key);
      });

      return next;
    });
  }, [multiSelect, currentOrgUserIds, isAllCurrentOrgUsersSelected, displayedOrgUsers]);

  const resolvedOrgUserTotal = orgUserTotal || orgUsers.length;
  const resolvedOrgUserTotalPages = Math.max(
    1,
    orgUserTotalPages || Math.ceil(resolvedOrgUserTotal / ORG_USER_LIMIT)
  );

  const buildUnitTree = useCallback((units, parentId = null) => {
    return (units || [])
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(units, u._id),
        types: "company",
      }));
  }, []);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!displayUsers || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits);

    const processUnits = (units) => {
      return units.map((unit) => {
        const unitUsers = (displayUsers || [])
          .filter((u) => u?.parent === (unit?._id ?? unit?.id))
          .map((u) => ({ ...u, types: "user" }));

        const children = processUnits(unit.child || []).filter(Boolean);

        if (unitUsers.length === 0 && children.length === 0) return null;
        return { ...unit, child: [...unitUsers, ...children] };
      }).filter(Boolean);
    };
    return processUnits(organizationTree);
  }, [displayUsers, organizationUnits, buildUnitTree]);

  return (
    <>
      <StyledDialog open={open} onClose={handleClose} dialogSize="lg" fullWidth>
        <StyledDialogTitle>
          <StyledTitleText component="span">{label}</StyledTitleText>
          <CloseIconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </CloseIconButton>
        </StyledDialogTitle>

        <StyleDialogBody>
          <StyledBodyGridContainer container spacing={2}>
            {/* CỘT TRÁI */}
            <StyledPanelGridItem item xs={12} md={6}>
              <StyledPanelNoPadding>
                <StyledPanelContent>
                  {isShowOrg ? (
                    <OrgUserPicker scrollSize="70vh">
                      <OrgSearchBox>
                        <Input
                          fullWidth
                          size="small"
                          placeholder="Tìm kiếm cá nhân..."
                          onChange={handleSearchChange}
                          value={search}
                        />
                      </OrgSearchBox>
                      <OrgListHeader>
                        <OrgListTitle>
                          Danh sách cá nhân ({resolvedOrgUserTotal})
                        </OrgListTitle>
                        {multiSelect && (
                          <SelectAllBox>
                            <OrgUserCheckbox
                              checked={isAllCurrentOrgUsersSelected}
                              indeterminate={isSomeCurrentOrgUsersSelected}
                              onChange={handleSelectAllOrgUsers}
                            />
                            <Typography component="span">
                              Chọn tất cả cá nhân
                            </Typography>
                          </SelectAllBox>
                        )}
                      </OrgListHeader>
                      <OrgRows>
                        {orgUserLoading && displayedOrgUsers.length > 0 && (
                          <OrgLoadingOverlay>
                            <CircularProgress size={24} />
                          </OrgLoadingOverlay>
                        )}
                        {orgUserLoading && displayedOrgUsers.length === 0 ? (
                          <OrgEmptyBox>
                            <CircularProgress size={28} />
                          </OrgEmptyBox>
                        ) : displayedOrgUsers.length > 0 ? (
                          displayedOrgUsers.map((user) => {
                            const userId = getUserId(user);
                            const key = `${userId || user?.code || user?.name || user?.username}`;
                            const checked = selectedOrgUserIds.has(`${userId}`);

                            return (
                              <OrgUserListItem
                                key={key}
                                user={user}
                                checked={checked}
                                onToggle={handleOrgUserToggle}
                              />
                            );
                          })
                        ) : (
                          <OrgEmptyBox>
                            {submittedSearch.trim().length > 0 && submittedSearch.trim().length < 2
                              ? ""
                              : "Không tìm thấy cá nhân"}
                          </OrgEmptyBox>
                        )}
                      </OrgRows>
                      {resolvedOrgUserTotalPages > 1 && (
                        <OrgPaginationBox>
                          {orgUserTotal > 0 ? (
                            <Typography variant="body2">
                              Hiển thị{" "}
                              {orgUsers.length > 0
                                ? (orgUserPage - 1) * ORG_USER_LIMIT + 1
                                : 0}
                              -
                              {Math.min(
                                orgUserPage * ORG_USER_LIMIT,
                                resolvedOrgUserTotal
                              )}{" "}
                              trong tổng số {resolvedOrgUserTotal}
                            </Typography>
                          ) : (
                            <Typography variant="body2">
                              Trang {orgUserPage}/{resolvedOrgUserTotalPages}
                            </Typography>
                          )}
                          <OrgPagination
                            count={resolvedOrgUserTotalPages}
                            page={orgUserPage}
                            onChange={handleOrgPageChange}
                            size="small"
                          />
                        </OrgPaginationBox>
                      )}
                    </OrgUserPicker>
                  ) : (
                    <>
                      <StyledSearchWrapper>
                        <Input
                          fullWidth
                          size="small"
                          placeholder="Tìm kiếm đơn vị, cá nhân..."
                          onChange={handleSearchChange}
                          value={search}
                        />
                      </StyledSearchWrapper>
                      <StyledTreeContainer>
                        <RenderTableTree
                          data={dataMergeUserAndUnit}
                          assignments={assignments}
                          isChecked={isChecked}
                          handleCheckboxChange={handleCheckboxChange}
                          targetTitle="Tên đơn vị, cá nhân"
                          selectedTitle="Chọn người ký"
                          multiSelect={multiSelect}
                        />
                      </StyledTreeContainer>
                    </>
                  )}
                </StyledPanelContent>
              </StyledPanelNoPadding>
            </StyledPanelGridItem>

            {/* CỘT PHẢI */}
            <StyledPanelGridItem item xs={12} md={6}>
              <StyledPanelNoPadding>
                <StyledPanelHeaderWrapper>
                  <StyledHeaderIcon>
                    <PersonAddIcon />
                  </StyledHeaderIcon>
                  <StyledPanelTitleLeft>
                    Danh sách đã chọn tham gia
                  </StyledPanelTitleLeft>
                </StyledPanelHeaderWrapper>
                <StyledPanelContent>
                  <StyledTableContainer>
                    <StyledTable size="small">
                      <StyledTableHead>
                        <HeaderRow>
                          <HeaderCell>Tên cá nhân</HeaderCell>
                          <OrderCell>Thứ tự ký</OrderCell>
                          <RemoveCell>Bỏ chọn</RemoveCell>
                        </HeaderRow>
                      </StyledTableHead>
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="selected-users-list">
                          {(provided) => (
                             <SkyTableBody {...provided.droppableProps} ref={provided.innerRef}>
                              {selectedList.length > 0 ? (
                                selectedList.map((item, index) => (
                                  <Draggable key={item.id} draggableId={item.id} index={index}>
                                    {(draggableProvided, snapshot) => (
                                      <SelectedUserRow
                                        provided={draggableProvided}
                                        snapshot={snapshot}
                                        item={item}
                                        index={index}
                                        onRemove={handleCheckboxChange}
                                      />
                                    )}
                                  </Draggable>
                                ))
                              ) : (
                                <SkyTableRow>
                                  <SkyTableCell colSpan={3} align="center">
                                    Chưa có cá nhân nào được chọn
                                  </SkyTableCell>
                                </SkyTableRow>
                              )}
                              {provided.placeholder}
                            </SkyTableBody>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </StyledTable>
                  </StyledTableContainer>
                  {executionMode && (
                    <ExecutionModeBox>
                      <ExecutionModeLabel>
                        Loại hình thực hiện :
                      </ExecutionModeLabel>
                      <ExecutionModeOptions
                        role="group"
                        aria-label="Loại hình thực hiện ký tại bước này"
                      >
                        <ExecutionModeOption
                          control={
                            <ExecutionModeCheckbox
                              value={EXECUTION_MODES.PARALLEL}
                              checked={
                                selectedExecutionMode ===
                                EXECUTION_MODES.PARALLEL
                              }
                              onChange={handleExecutionModeChange}
                              disabled={!canChangeExecutionMode}
                            />
                          }
                          label="Ký song song"
                        />
                        <ExecutionModeOption
                          control={
                            <ExecutionModeCheckbox
                              value={EXECUTION_MODES.SEQUENTIAL}
                              checked={
                                selectedExecutionMode ===
                                EXECUTION_MODES.SEQUENTIAL
                              }
                              onChange={handleExecutionModeChange}
                              disabled={!canChangeExecutionMode}
                            />
                          }
                          label="Ký tuần tự"
                        />
                      </ExecutionModeOptions>
                    </ExecutionModeBox>
                  )}
                </StyledPanelContent>
              </StyledPanelNoPadding>
            </StyledPanelGridItem>
          </StyledBodyGridContainer>
        </StyleDialogBody>

        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <CancelButton onClick={handleClose}>ĐÓNG</CancelButton>
            <SaveButton onClick={onSubmit} disabled={selectedList.length === 0}>
              ÁP DỤNG
            </SaveButton>
          </StyledRowBox>
        </StyleBoxFoodterEnd>
      </StyledDialog>

      <LoadingDialog open={!isShowOrg && (loading || loadingTransfer)}>
        <StyledDialogContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </StyledDialogContent>
      </LoadingDialog>
    </>
  );
};

export default memo(withSharedComponents(IsMultiSigner));
