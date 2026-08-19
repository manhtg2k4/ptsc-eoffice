/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  PanelHeader,
  StyleBoxContainer,
  StyleContainer,
  StyledContainer,
  StyledGridContainer,
  StyledToggleButton,
  StyledDialogTitle,
  StyledDialogContentMobile,
  StyledTitleText,
  StyleBoxFoodterEnd,
  StyledRowBox,
  StyledSearchContainer,
} from "@styles/DialogDirective";

import { SwapHoriz } from "@mui/icons-material";
import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// import { removeVietnameseTones } from "@utils/Common/Common";
import { StyledDialog, StyledDialogContent } from "@styles/CustomDialog.styles";
import withSharedComponents from "@components/WrapperComponent";
import { flattenUnits } from "@utils/utils";
import {
  fetchOrganizationUnits,
  // fetchUsers,
} from "@redux/slices/Directive/Directive";
import { useDispatch, useSelector } from "react-redux";
import RenderTableTree from "@components/SigningSubmission/RenderTableTree";
import { getUserInflow } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import { API_OUTGOING_DRAFT_SIGNERS, API_GET_USER_INFLOW } from "@EnvironmentFile/constants/urlConfig";
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

const ExecutionModeBox = styled(Box)(({ theme }) => ({
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

const ExecutionModeOptions = styled(Box)(({ theme }) => ({
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

  const subLabel = getUserSubLabel(user);

  return (
    <OrgUserRow onClick={handleToggle}>
      <OrgAvatar>{getUserInitials(user?.name)}</OrgAvatar>
      <OrgUserTextBox>
        <OrgUserName title={user?.name || ""}>{user?.name || ""}</OrgUserName>
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

OrgUserListItem.propTypes = {
  user: PropTypes.object,
  checked: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

const DigitalSignatureProposalPopup = (props) => {
  const {
    open = false,
    label = "Đề xuất ký số",
    sharedComponents,
    onClose = () => {},
    onCloseDialog = () => {},
    docId,
    // selectedFullRows,
    dataDetail,
    actionCode,
    targetRole,
    multiSelect,
    initialSelectedUsers = [],
    stepKey,
    selectedStep,
    selectedTypeOfProcess,
    onSelectUsers,
    delay = 500,
    executionMode: executionModeProp,
    allowUserChangeExcMode: allowUserChangeExcModeProp,
    // setReloadData = () => {},
  } = props;

  const { Input, toast, Button, LoadingDialog } = sharedComponents;
  const dispatch = useDispatch();
  const { organizationUnits, loading } = useSelector((state) => state.user);
  const { users } = useSelector((state) => state.outGoingDoc);
  const isShowOrg = selectedStep?.flag?.showOrg !== "true" || selectedStep?.flag?.showOrg !== true;
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

  // const profile = localStorage.getItem("userData");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [searchKDV] = useState("");
  const [assignments, setAssignments] = useState({});
  const [loadingTransfer, setLoadingTransfers] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [displayUsers, setDisplayUsers] = useState([]); // Local state để tránh nháy khi search 
  const [hasFetched, setHasFetched] = useState(false); // Tránh đồng bộ data cũ từ Redux khi mount
  const [orgUsers, setOrgUsers] = useState([]);
  const [orgUserTotal, setOrgUserTotal] = useState(0);
  const [orgUserTotalPages, setOrgUserTotalPages] = useState(1);
  const [orgUserPage, setOrgUserPage] = useState(1);
  const [orgUserLimit] = useState(10);
  const [orgUserLoading, setOrgUserLoading] = useState(false);
  const [pinnedSelectedUserIds, setPinnedSelectedUserIds] = useState([]);
  const [selectedExecutionMode, setSelectedExecutionMode] = useState(executionMode);
  
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isMountedRef = useRef(true);
  const orgLatestRequestRef = useRef(0);
  const resolvedProcessCode = useMemo(
    () =>
      Array.isArray(selectedTypeOfProcess)
        ? selectedTypeOfProcess?.[0]?.processKey || selectedTypeOfProcess?.[0]?.id
        : selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id,
    [selectedTypeOfProcess]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      setSelectedExecutionMode(executionMode);
    }
  }, [open, stepKey, executionMode]);

  const fetchOrgUsers = useCallback(
    async (searchKeyword = "", page = 1) => {
      const requestId = ++orgLatestRequestRef.current;
      const normalizedSearch = `${searchKeyword || ""}`.trim();

      if (normalizedSearch.length > 0 && normalizedSearch.length < 2) {
        setOrgUserLoading(false);
        return;
      }

      try {
        setOrgUserLoading(true);

        const isAuthority = dataDetail?.document
          ? dataDetail?.document?.isAuthority
          : dataDetail?.isAuthority;

        const params = {
          typeSign: selectedStep?.action || "",
          processKey: resolvedProcessCode,
          page,
          limit: orgUserLimit,
          name: normalizedSearch ? normalizedSearch : undefined,
          username: normalizedSearch ? normalizedSearch : undefined,
          roles: selectedStep?.lane || undefined,
          ...(isAuthority === true && { isAuthority: true }),
        };

        const response = await api.get(API_GET_USER_INFLOW, {
          params,
          timeout: 60_000,
        });

        if (!isMountedRef.current || requestId !== orgLatestRequestRef.current) {
          return;
        }

        const payload = response?.data ?? response;
        const items = getPayloadItems(payload);
        const total = getPayloadTotal(payload, items.length);
        const totalPages = getPayloadTotalPages(
          payload,
          Math.max(1, Math.ceil(total / orgUserLimit))
        );
        setOrgUsers(items);
        setOrgUserTotal(total);
        setOrgUserTotalPages(totalPages);
      } catch (error) {
        if (!isMountedRef.current || requestId !== orgLatestRequestRef.current) {
          return;
        }
        logger.log("Lỗi khi load danh sách cá nhân:", error);
        toast("Lỗi khi lấy danh sách cá nhân!", "error");
      } finally {
        if (isMountedRef.current && requestId === orgLatestRequestRef.current) {
          setOrgUserLoading(false);
        }
      }
    },
    [dataDetail, selectedStep, resolvedProcessCode, orgUserLimit, toast]
  );

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

  useEffect(() => {
    if (open && !isShowOrg) {
      const trimmed = debouncedSearch.trim();
      if (trimmed.length === 0 || trimmed.length >= 3) {
        fetchData(debouncedSearch);
      }
    }
  }, [open, debouncedSearch, stepKey, isShowOrg]);

  useEffect(() => {
    if (open && isShowOrg) {
      setOrgUserPage(1);
    }
  }, [open, isShowOrg, stepKey, resolvedProcessCode, selectedStep?.action]);

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
    const trimmed = debouncedSearch.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      setDisplayUsers([]);
    }
  }, [debouncedSearch, isShowOrg]);

  // Đồng bộ displayUsers khi Redux có data mới (chỉ sau khi đã fetch cho instance hiện tại)
  useEffect(() => {
    if (hasFetched) {
      setDisplayUsers(users || []);
    }
  }, [users, hasFetched]);

  // Khôi phục assignments từ initialSelectedUsers theo step khi mở popup
  useEffect(() => {
    if (!open) return;
    const initial = Array.isArray(initialSelectedUsers)
      ? initialSelectedUsers
      : [];

    if (initial.length > 0) {
      const restoredAssignments = {};
      const restoredUserIds = [];
      initial.forEach((user) => {
        const userId = user.userId || user.id || user._id;
        if (userId) {
          restoredUserIds.push(`${userId}`);
        }
        restoredAssignments[userId] = {
          id: userId,
          key: userId,
          name: user.name,
          code: user.code,
          parentName: user.parentName,
          unitType: user.unitType,
          chiDao: true,
        };
      });
      setAssignments(restoredAssignments);
      setPinnedSelectedUserIds(restoredUserIds);
      setHasAutoSelected(true);

      if (isShowOrg) {
        setOrgUserPage(1);
      }
    } else {
      // Step mới không có lựa chọn trước đó → xóa để tránh carryover
      setAssignments({});
      setPinnedSelectedUserIds([]);
      setHasAutoSelected(false);

      if (isShowOrg) {
        setSearch("");
        setDebouncedSearch("");
        setSubmittedSearch("");
        setOrgUserPage(1);
      }
    }
  }, [open, stepKey, initialSelectedUsers, isShowOrg]);

  // Reset toàn bộ state khi đóng popup hoặc thay đổi stepKey để bảo đảm 100% sạch sẽ
  useEffect(() => {
    if (!open) {
      orgLatestRequestRef.current += 1;
      setSearch("");
      setDebouncedSearch("");
      setSubmittedSearch("");
      setAssignments({});
      setDisplayUsers([]);
      setHasFetched(false);
      setHasAutoSelected(false);
      setPinnedSelectedUserIds([]);
      setOrgUsers([]);
      setOrgUserTotal(0);
      setOrgUserTotalPages(1);
      setOrgUserPage(1);
      setOrgUserLoading(false);
    }
  }, [open, stepKey]);

  const fetchData = async (searchKeyword = "") => {
    try {
      if (!isShowOrg) {
        setLoadingTransfers(true);
      }
      const processCode = Array.isArray(selectedTypeOfProcess)
        ? selectedTypeOfProcess?.[0]?.processKey || selectedTypeOfProcess?.[0]?.id
        : selectedTypeOfProcess?.processKey || selectedTypeOfProcess?.id;

      const bodyUser = {
        processKey: processCode,
				roles: targetRole || selectedStep?.lane || actionCode
      };
      const isAuthority = dataDetail?.document
        ? dataDetail?.document?.isAuthority
        : dataDetail?.isAuthority;
      const params = {
        typeSign: selectedStep?.action || "",
        processKey: processCode,
        name: searchKeyword ? searchKeyword : undefined, // Gửi name lên API
        username: searchKeyword ? searchKeyword : undefined,
        roles: selectedStep?.lane || undefined,
        ...(isAuthority === true && { isAuthority: true }),
      };

      const orgParams = {
        ...(isAuthority === true && { isAuthority: true }),
      };

      const fetchPromises = [
        // dispatch(fetchUsers(bodyUser)),
        dispatch(fetchOrganizationUnits({ body: bodyUser, params: orgParams, })).unwrap(),
      ];

      if (!isShowOrg) {
        fetchPromises.push(dispatch(getUserInflow(params)).unwrap());
      }

      await Promise.all(fetchPromises);

      if (isMountedRef.current) {
        setHasFetched(true);
      }
    } catch (error) {
      logger.log("Lỗi khi load dữ liệu:", error);
      toast("Lỗi khi lấy dữ liệu!", "error");
    } finally {
      if (isMountedRef.current && !isShowOrg) {
        setLoadingTransfers(false);
      }
    }
  };

  const onSubmit = useCallback(async () => {
    const selectedData = Object.entries(assignments).map(
      ([userId, assignment]) => ({
        userId: assignment.id || userId,
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
      docId ||
      dataDetail?.document?.documentId ||
      dataDetail?.documentId ||
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
    
    // Reset cục bộ khi submit thành công
    setSearch("");
    setDebouncedSearch("");
    setSubmittedSearch("");
    setAssignments({});
    setDisplayUsers([]);
    setHasFetched(false);
    setHasAutoSelected(false);
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

  const buildUnitTree = useCallback((units, parentId = null) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(safeUnits, u._id), 
        types: "company",
      }));
  }, []);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!displayUsers || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits || []);

    const filterUnits = (units, kdvId) => {
      for (const unit of units) {
        if (unit._id === kdvId || unit.id === kdvId) return [unit];
        if (unit.child && unit.child.length > 0) {
          const found = filterUnits(unit.child, kdvId);
          if (found.length > 0) return found;
        }
      }
      return [];
    };

    const processUnits = (units, usersList) => {
      return units
        .map((unit) => {
          const userNodes = (usersList || [])
            .filter((user) => user?.parent === (unit?._id ?? unit?.id))
            .map((user) => ({ ...user, types: "user" }));

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          const childProcessed = processUnits(childUnits, usersList).filter(
            Boolean
          );

          const hasUsers = userNodes.length > 0 || childProcessed.length > 0;

          if (!hasUsers) return null;

          return {
            ...unit,
            child: [...userNodes, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

    const rootUnits = searchKDV
      ? filterUnits(organizationTree, searchKDV._id || searchKDV.id)
      : organizationTree;
    return processUnits(rootUnits, displayUsers);
  }, [displayUsers, organizationUnits, buildUnitTree, searchKDV]);

  const getAssignmentKey = (unitId) => `${unitId}`;

  // Tự động chọn nếu chỉ có 1 người dùng khi KHÔNG có initialSelectedUsers
  useEffect(() => {
    // Nếu đã auto-select rồi hoặc popup chưa mở, bỏ qua
    if (hasAutoSelected || !open) return;

    // Nếu selectedStep === 1 → auto-select tất cả users và disable
    if (selectedStep === 1) {
      const getAllUsers = (units) => {
        let allUsers = [];
        units.forEach((unit) => {
          if (unit.child && Array.isArray(unit.child)) {
            unit.child.forEach((child) => {
              if (child.types === "user") {
                allUsers.push(child);
              } else if (child.child) {
                allUsers = allUsers.concat(getAllUsers([child]));
              }
            });
          }
        });
        return allUsers;
      };

      const allUsers = getAllUsers(dataMergeUserAndUnit);

      // Auto-select tất cả users
      const autoAssignments = {};
      allUsers.forEach((user) => {
        const userId = user._id || user.id;
        autoAssignments[userId] = {
          id: userId,
          key: userId,
          name: user.name || "",
          code: user.code || "",
          unitType: "user",
          chiDao: true,
        };
      });

      if (Object.keys(autoAssignments).length > 0) {
        setAssignments(autoAssignments);
        setHasAutoSelected(true); 
      }
      return;
    }
  }, [
    dataMergeUserAndUnit,
    initialSelectedUsers,
    selectedStep,
    hasAutoSelected,
    open,
  ]);

  const getUnitName = useCallback(
    (unitId) => {
      const unit = flattenUnits(dataMergeUserAndUnit).find(
        (u) => (u._id || u.id) === unitId
      );
      return unit ? unit.name : "";
    },
    [dataMergeUserAndUnit]
  );

  const handleCheckboxChange = useCallback(
    (unitId, type, unitType, item) => {
      const key = getAssignmentKey(unitId);
      setAssignments((prev) => {
        const prevAssignment = prev?.[key] || {};
        const isCurrentlyChecked = prevAssignment.chiDao ?? false;

        // Nếu đang tích rồi → BỎ CHỌN hoàn toàn
        if (isCurrentlyChecked) {
          const newAssignments = Object.fromEntries(
            Object.entries(prev).filter(([k]) => k !== key)
          );
          logger.log("Unchecking - new assignments:", newAssignments);
          return newAssignments;
        }

        // Nếu multi-select enabled → thêm vào danh sách chọn
        if (multiSelect) {
          const newAssignments = {
            ...prev,
            [key]: {
              id: unitId,
              key,
              name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
              code: item?.code ?? prevAssignment.code,
              unitType:
                unitType ??
                prevAssignment.unitType ??
                (item?.types === "user" || item?.type === "user"
                  ? "user"
                  : "company"),
              chiDao: true,
            },
          };
          return newAssignments;
        }

        // Single-select: chỉ được chọn 1 người duy nhất
        const newAssignments = {
          [key]: {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType:
              unitType ??
              prevAssignment.unitType ??
              (item?.types === "user" || item?.type === "user"
                ? "user"
                : "company"),
            chiDao: true,
          },
        };
        return newAssignments;
      });
    },
    [getUnitName, multiSelect]
  );

  const isChecked = useCallback(
    (item, type) => {
      const itemId = item._id || item.id;
      if (!itemId) {
        return false;
      }

      // Tối ưu: Check trực tiếp assignment trước
      const key = getAssignmentKey(itemId);
      const assignment = assignments?.[key];

      if (assignment?.[type]) {
        return true;
      }

      // Trường hợp có child - chỉ check khi thực sự cần
      if (item?.child && Array.isArray(item.child) && item.child.length > 0) {
        return item.child.every((child) => {
          const childId = child._id || child.id;
          const childKey = getAssignmentKey(childId);
          return assignments?.[childKey]?.[type] === true;
        });
      }

      return false;
    },
    [assignments]
  );

  const handleTogglePanel = () => {
    setShowRightPanel((prev) => !prev);
  };

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const handleExecutionModeChange = useCallback((event) => {
    if (!canChangeExecutionMode || !event.target.checked) return;

    const nextExecutionMode = normalizeExecutionMode(event.target.value);
    if (nextExecutionMode) {
      setSelectedExecutionMode(nextExecutionMode);
    }
  }, [canChangeExecutionMode]);

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

  const displayedOrgUsers = useMemo(() => {
    const shouldPinSelectedUsers =
      isShowOrg && orgUserPage === 1 && submittedSearch.trim() === "";

    if (!shouldPinSelectedUsers) return orgUsers;

    const pinnedIds = new Set(pinnedSelectedUserIds);
    const selectedUsers = Object.values(assignments || {})
      .filter((assignment) => {
        const assignmentId = assignment?.id || assignment?.userId || assignment?._id || assignment?.key;
        return assignment?.chiDao && pinnedIds.has(`${assignmentId}`);
      })
      .map((assignment) => ({
        ...assignment,
        id: assignment.id || assignment.userId || assignment._id || assignment.key,
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

  const isAllCurrentOrgUsersSelected =
    currentOrgUserIds.length > 0 &&
    currentOrgUserIds.every((id) => assignments?.[id]?.chiDao === true);

  const isSomeCurrentOrgUsersSelected =
    currentOrgUserIds.some((id) => assignments?.[id]?.chiDao === true) &&
    !isAllCurrentOrgUsersSelected;

  const handleSelectAllOrgUsers = useCallback(() => {
    if (!multiSelect || currentOrgUserIds.length === 0) return;

    setAssignments((prev) => {
      if (isAllCurrentOrgUsersSelected) {
        return Object.fromEntries(
          Object.entries(prev).filter(([key]) => !currentOrgUserIds.includes(key))
        );
      }

      const next = { ...prev };
      displayedOrgUsers.forEach((user) => {
        const userId = getUserId(user);
        if (!userId) return;
        const key = `${userId}`;
        next[key] = {
          id: userId,
          key,
          name: user?.name || "",
          code: user?.code,
          parentName: user?.parentName,
          unitType: "user",
          chiDao: true,
        };
      });
      return next;
    });
  }, [multiSelect, currentOrgUserIds, isAllCurrentOrgUsersSelected, displayedOrgUsers]);

  const handleOrgPageChange = useCallback((_, page) => {
    setOrgUserPage(page);
  }, []);

  const resolvedOrgUserTotal = orgUserTotal || orgUsers.length;
  const resolvedOrgUserTotalPages = Math.max(
    1,
    orgUserTotalPages || Math.ceil(resolvedOrgUserTotal / orgUserLimit)
  );

  const handleClose = () => {
    onCloseDialog();
    onClose();
    
    // Reset toàn bộ khi đóng popup
    setSearch("");
    setDebouncedSearch("");
    setSubmittedSearch("");
    setAssignments({});
    setDisplayUsers([]);
    setHasFetched(false);
    setHasAutoSelected(false);
    setPinnedSelectedUserIds([]);
    setOrgUsers([]);
    setOrgUserTotal(0);
    setOrgUserTotalPages(1);
    setOrgUserPage(1);
    setOrgUserLoading(false);
  };

  return (
    <>
      <StyledDialog open={open} onClose={handleClose} dialogSize="sm" fullWidth>
        <StyleContainer>
          <StyleBoxContainer
            $isMobileOrTablet={isMobileOrTablet}
            $showPanel={!showRightPanel}
          >
            <StyledDialogTitle>
              <StyledTitleText component="span">{label}</StyledTitleText>
              {isMobileOrTablet && (
                <Tooltip
                  title={isMobileOrTablet && "Danh sách đơn vị/cá nhân đã chọn"}
                >
                  <StyledToggleButton onClick={handleTogglePanel} size="small">
                    <SwapHoriz />
                  </StyledToggleButton>
                </Tooltip>
              )}
            </StyledDialogTitle>
            <StyledDialogContentMobile>
              <StyledContainer>
                <PanelHeader>
                  {isShowOrg ? (
                    <OrgUserPicker scrollSize={isMobileOrTablet ? "58vh" : "65vh"}>
                      <OrgSearchBox>
                        <Input
                          size="small"
                          placeholder="Tìm kiếm cá nhân..."
                          onChange={handleSearch}
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
                            const key = `${userId || user?.code || user?.name}`;
                            const checked = assignments?.[`${userId}`]?.chiDao === true;

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
                                ? (orgUserPage - 1) * orgUserLimit + 1
                                : 0}
                              -
                              {Math.min(
                                orgUserPage * orgUserLimit,
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
                            size={isMobileOrTablet ? "small" : "medium"}
                          />
                        </OrgPaginationBox>
                      )}
                    </OrgUserPicker>
                  ) : (
                    <>
                      <StyledGridContainer container spacing={2}>
                        <Grid item xs={12}>
                          <StyledSearchContainer>
                            <Input
                              size="small"
                              label="Tìm kiếm đơn vị, cá nhân..."
                              placeholder="Tìm kiếm đơn vị, cá nhân..."
                              onChange={handleSearch}
                              value={search}
                            />
                          </StyledSearchContainer>
                        </Grid>
                      </StyledGridContainer>
                      <RenderTableTree
                        isMobileOrTablet={isMobileOrTablet}
                        data={dataMergeUserAndUnit}
                        //   handleToggleExpand={handleToggleExpand}
                        assignments={assignments}
                        isChecked={isChecked}
                        handleCheckboxChange={handleCheckboxChange}
                        targetTitle="Tên đơn vị, cá nhân"
                        selectedTitle="Xử lý"
                        multiSelect={multiSelect}
                        disableCheckbox={selectedStep === 1}
                      />
                    </>
                  )}
                  {executionMode && (
                    <ExecutionModeBox>
                      <ExecutionModeLabel>
                        Loại hình thực hiện ký tại bước này:
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
                  <br />
                </PanelHeader>
              </StyledContainer>
            </StyledDialogContentMobile>
          </StyleBoxContainer>
        </StyleContainer>
        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <Button variant="error" onClick={handleClose}>
              Đóng
            </Button>
            &emsp;
            <Button
              onClick={onSubmit}
              variant="primary"
              disabled={
                selectedStep === 1 ||
                !assignments ||
                Object.keys(assignments).length === 0
              }
            >
              Áp dụng
            </Button>
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

DigitalSignatureProposalPopup.propTypes = {
  sharedComponents: PropTypes.object,
  open: PropTypes.bool,
  label: PropTypes.string,
  onClose: PropTypes.func,
  onCloseAppBar: PropTypes.func,
  onCloseDialog: PropTypes.func,
  docId: PropTypes.string,
  selectedFullRows: PropTypes.array,
  dataDetail: PropTypes.object,
  onSelectUsers: PropTypes.func,
  multiSelect: PropTypes.bool,
  initialSelectedUsers: PropTypes.array,
  stepKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedStep: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  isCXL: PropTypes.bool,
  isDXXL: PropTypes.bool,
  selectedTypeOfProcess: PropTypes.object,
  executionMode: PropTypes.oneOf([
    EXECUTION_MODES.PARALLEL,
    EXECUTION_MODES.SEQUENTIAL,
  ]),
  allowUserChangeExcMode: PropTypes.bool,
};

export default memo(withSharedComponents(DigitalSignatureProposalPopup));
