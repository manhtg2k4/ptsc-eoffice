import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
// import CustomTable from "@components/CustomTable/CustomTableClone_1";
import { columnsUsers, filtersUsers } from "./constantsDistrict";
import {
  ChangePassUsers,
  deleteUsers,
  getDataListUserByUnit,
  lockUsers,
} from "@redux/slices/managementUsersSlice";
import {
  Box,
  Checkbox,
  Grid,
  FormControlLabel,
  IconButton,
  useMediaQuery,
  Typography,
  LinearProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import DeleteDialog from "./components/DeleteDialog";
import { useToast } from "@components/common/ToastProvider";
import { normalizeApiData } from "./utilsDistrict";
import ChangePassword from "./components/ChangePassword";
import AdminChangePassword from "./components/AdminChangePassword";
import LockUser from "./components/LockUser";
// Button import removed; using styled `ButtonClickColor` from ViewUserDetail.styles

import {
  TableWrapper,
  LeftPanelContainer,
  LeftPanelHeader,
  LeftPanelContent,
  CollapsedMenuContainer,
  MainContentGrid,
  SyncProgressContainer,
  SyncProgressBar,
  SyncProgressPercentage,
  SyncLog,
  SyncStyles,
  MenuIconButton,
  DepartmentNodeLabel,
} from "@styles/ListUser.styles";
import CustomTableTreeLoadmore from "@components/CustomTable/CustomTableTreeLoadmore";
import UnLockUser from "./components/UnLockUser";
import CustomTable from "@components/CustomTable/CustomTable";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomTabsWithBadge from "@components/CustomTabs";
import { StyleTittleBox, StyleTittleTyprography } from "@builder-table/components/SearchSection.styles";
// import { getAuthConfig } from "../../AuthContext/AuthConfigForm/authConfigApi";
import {
  API_SYNC_WSO2,
  API_SYNC_PROGRESS,
  API_SYNC_KEYCLOAK,
  API_SYNC_KEYCLOAK_PROGRESS,
  API_LIST_MAPPING_PERMISSION,
  API_MAPPING_PERMISSION,
  API_SYNC_HRM_MANUAL,
  API_SYNC_HRM_PROGRESS,
  API_SYNC_TO_KEYCLOAK,
  API_GET_LIST_USERS,
  API_CANCEL_SYNC,
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import { EventSourcePolyfill } from "event-source-polyfill";
import ManagerUsers from "@pages/ManagerUsers";
import Swipper from "@components/Swipper/BaseSwiper";
import CustomButton from "@components/CustomButton";
// import CustomInput from "@components/CustomInput/CustomInput";
import CustomTableEditable from "@components/CustomTable/CustomTableEditable";
// import { keycloakUseEnvOnly } from "@variable";

const DepartmentNodeCell = React.memo(({ row, isActive, onNodeClick }) => {
  const handleClick = useCallback(() => onNodeClick(row), [onNodeClick, row]);
  return (
    <DepartmentNodeLabel isActive={isActive} onClick={handleClick}>
      {row.name}
    </DepartmentNodeLabel>
  );
});
DepartmentNodeCell.displayName = "DepartmentNodeCell";


const ListUsers = () => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [selectAll, setSelectAll] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const status = tabValue === 0 ? "1" : "0";
  const tabs = useMemo(() => [
    { label: "Người dùng đang hoạt động" },
    { label: "Người dùng ngừng hoạt động" }
  ], []);
  const [showSyncButton, setShowSyncButton] = useState(false);
  const [authType, setAuthType] = useState(null);
  const eventSourceRef = useRef(null);
  const syncTerminalStageRef = useRef(null);
  const syncLastErrorMessageRef = useRef("");
  const managerUsersRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [syncProgress, setSyncProgress] = useState({
    open: false,
    percentage: 0,
    message: "",
    log: "",
  });
  const [openDialogs, setOpenDialogs] = useState({
    view: false,
    lock: false,
    changePass: false,
    delete: false,
    add: false,
    unlock: false,
    edit: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState();
  const [openAdminChangePass, setOpenAdminChangePass] = useState(false);
  const [adminChangePassUserId, setAdminChangePassUserId] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);
  const [showMappingButton] = useState(false);
  const [openMappingDialog, setOpenMappingDialog] = useState(false);
  const [mappingData, setMappingData] = useState([]);
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const buildSSEUrl = (url, params = {}) => {
    try {
      const sseUrl = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          sseUrl.searchParams.set(key, value);
        }
      });
      return sseUrl.toString();
    } catch (err) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.set(key, value);
        }
      });
      const query = queryParams.toString();
      if (!query) return url;
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}${query}`;
    }
  };
  const getStoredToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    "";

  const createUserSyncRunId = (prefix) => {
    const randomPart =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${randomPart}`;
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);
  const [viewId, setViewId] = useState({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Bỏ API vì luôn dùng keycloak từ env
        setShowSyncButton(true);
        setAuthType("keycloak");
      } catch (error) {
        logger.error("Lỗi khi fetch auth config:", error);
      }
    };

    fetchConfig();
  }, [dispatch]);

  // when screen size changes above md, ensure mobile menu state resets
  useEffect(() => {
    if (!isMdDown) {
      setMobileMenuOpen(true);
    }
    // when first entering mdDown, keep menu open by default
  }, [isMdDown]);

  useEffect(() => {
    if (selectAll) {
      setSelectedNode(null);
      setActiveNodeId(null);
    }
  }, [selectAll]);

  const handleNodeClick = useCallback(async (node) => {
    setSelectedNode(node);
    setActiveNodeId(node._id || node.id);
    setSelectAll(false);
    // sessionStorage.setItem("activeNodeId", node._id);
  }, []);

  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const handleTabChange = useCallback((e, newValue) => {
    setTabValue(newValue);
  }, []);

  const getDataDistrictFromApi = useCallback(
    async ({ page, limit, query, code, sort }) => {
      try {
        const response = selectedNode
          ? await dispatch(
              getDataListUserByUnit({
                id: selectedNode._id || selectedNode.id,
                page,
                limit,
                query,
                code,
                sort,
                status,
              })
            ).unwrap()
          : await dispatch(
              getDataListUserByUnit({
                id: "all",
                page,
                limit,
                query,
                code,
                sort,
                status,
              })
            ).unwrap();

        return {
          data: response.data || [],
          total: response.total || response.length || 0,
        };
      } catch (error) {
        return { data: [], total: 0 };
      }
    },
    [dispatch, selectedNode, status]
  );

  const handleSelectAll = () => {
    setSelectAll((prev) => !prev);
    setSelectedNode(null);
    setActiveNodeId(null);
  };


  const fetchDepartmentData = useCallback(
    async ({ page = 1, limit = 15, ...rest }) => {
      const baseFilter = { parentId: "null", parent: "null" };
      let mergedFilter = baseFilter;

      if (rest.filter) {
        if (typeof rest.filter === "string") {
          try {
            const parsed = JSON.parse(rest.filter);
            if (rest.isTreeSearch) {
              mergedFilter = parsed;
            } else {
              mergedFilter = { ...baseFilter, ...parsed };
            }
          } catch (e) {
            mergedFilter = baseFilter;
          }
        } else if (typeof rest.filter === "object") {
          if (rest.isTreeSearch) {
            mergedFilter = rest.filter;
          } else {
            mergedFilter = { ...baseFilter, ...rest.filter };
          }
        }
      }

      const res = await api.get("api/organization-units", {
        params: {
          page,
          limit,
          ...rest,
          filter: JSON.stringify(mergedFilter),
        },
      });
      const items = res.data?.data || res.data || [];
      const total = res.data?.total || items.length;
      return {
        data: items.map((u) => ({
          ...u,
          _id: u.id || u._id,
          parent: u.parentId || u.parent,
          type: "folder",
        })),
        total,
      };
    },
    []
  );

  const fetchDepartmentChildren = useCallback(
    async ({ parentId, page = 1, limit = 20 }) => {
      try {
        const res = await api.get("api/organization-units/children", {
          params: { organizationId: parentId, includeSelf: false, page, limit },
        });
        
        const rawItems = res.data?.data || res.data || [];

        const items = rawItems.filter(
          (u) => String(u.id || u._id) !== String(parentId)
        );
        const mappedData = items.map((u) => ({
          ...u,
          _id: u.id || u._id,
          parent: u.parentId || u.parent,
          type: "folder",
        }));

        return {
          data: mappedData,
          total: res.data?.total || items.length,
        };
      } catch (err) {
        toast("Lỗi tải phòng ban con: " + (err.message || String(err)), "error");
        throw err;
      }
    },
    [toast]
  );

  const departmentColumns = useMemo(
    () => [
      {
        row: "name",
        name: "Tên phòng ban",
        isIcon: true,
        accessor: (row) => (
          <DepartmentNodeCell
            row={row}
            isActive={activeNodeId === row._id}
            onNodeClick={handleNodeClick}
          />
        ),
      },
    ],
    [activeNodeId, handleNodeClick]
  );

  const handleCloseDialog = (dialogKey) => {
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: false }));
  };
  const handleDelete = async () => {
    setIsLoading(true);
    if (!selectedIds?.length) {
      toast("Vui lòng chọn ít nhất một dòng để xóa!", "warning");
      return;
    }
    try {
      const results = await Promise.all(
        selectedIds.map((id) => dispatch(deleteUsers({ idUser: id })))
      );

      const failedDeletes = results.filter(
        (result) => !result.payload?.success
      );

      if (failedDeletes.length > 0) {
        const errorMessages = failedDeletes
          .map(
            (result) =>
              result.payload?.errors?.[0] ||
              result.payload?.message ||
              "Xóa thất bại"
          )
          .join("\n");
        toast(errorMessages, "error");
      } else {
        toast(`Đã xóa ${selectedIds.length} bản ghi thành công!`, "success");
      }

      handleCloseDialog("delete");
      setSelectedIds();
    } catch (error) {
      toast("Đã xảy ra lỗi khi xóa!", "error");
    } finally {
      setIsLoading(false);
    }
  };
  const handleLockUser = async () => {
    setIsLoading(true);
    try {
      let response;
      if (openDialogs.unlock) {
        response = await dispatch(
          lockUsers({ idUser: selectedIds, type: "unlock" })
        );
        handleCloseDialog("unlock");
      } else {
        response = await dispatch(
          lockUsers({ idUser: selectedIds, type: "lock" })
        );
        handleCloseDialog("lock");
      }
      if (response) {
        setSelectedIds();
        setIsLoading(false);
        toast(
          openDialogs.unlock
            ? "Đã mở khóa bản ghi thành công!"
            : `Đã khóa bản ghi thành công!`,
          "success"
        );
      }
    } catch (error) {
      toast("Đã xảy ra lỗi!", "error");
      setIsLoading(false);
    }
  };
  const handleOpenAdminChangePass = useCallback((id) => {
    setAdminChangePassUserId(id);
    setOpenAdminChangePass(true);
  }, []);

  const handleCloseAdminChangePass = useCallback(() => {
    setOpenAdminChangePass(false);
    setAdminChangePassUserId(null);
  }, []);

  const handleAdminChangePass = async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        newPassword: data.newPassword,
      };

      if (data.oldPassword) {
        payload.oldPassword = data.oldPassword;
      }

      const response = await api.put(`${API_GET_LIST_USERS}/${adminChangePassUserId}/password`, payload);

      if (response?.data?.success || response?.status === 200) {
        handleCloseAdminChangePass();
        toast("Đã thay đổi mật khẩu thành công", "success");
      } else {
        toast(response?.data?.message || "Đã xảy ra lỗi khi thay đổi mật khẩu!", "error");
      }
    } catch (error) {
      // Lấy thông báo lỗi chi tiết từ server nếu có
      const errorMsg = error.response?.data?.message || error.message || "Đã xảy ra lỗi khi thay đổi mật khẩu!";
      toast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePass = async (data) => {
    setIsLoading(true);
    const formattedData = normalizeApiData(data);
    try {
      const res = await dispatch(
        ChangePassUsers({ idUser: selectedIds, changePassData: formattedData })
      );
      if (res?.payload?.success) {
        handleCloseChangePassDialog();
        setSelectedIds();
        setIsLoading(false);
        toast(`Đã thay đổi mật khẩu thành công`, "success");
      } else {
        toast(
          res?.payload?.message || "Đã xảy ra lỗi khi thay đổi mật khẩu!",
          "error"
        );
      }
    } catch (error) {
      toast(error || "Đã xảy ra lỗi khi thay đổi mật khẩu!", "error");
      setIsLoading(false);
    }
  };
  const handleOpenDialog = async (dialogKey, idsOrRecord = null) => {
    if (idsOrRecord) {
      if (
        dialogKey === "delete" ||
        dialogKey === "lock" ||
        // || dialogKey === "changePass"
        dialogKey === "unlock"
      ) {
        setSelectedIds(
          Array.isArray(idsOrRecord) ? idsOrRecord : [idsOrRecord]
        );
      }
    }
    setOpenDialogs((prev) => ({ ...prev, [dialogKey]: true }));
  };

  const handleSyncKeycloak = () => {
    syncTerminalStageRef.current = null;
    syncLastErrorMessageRef.current = "";
    setSyncProgress({
      open: true,
      percentage: 0,
      message: "Đang kết nối đến máy chủ...",
      log: "",
    });

    const runId = createUserSyncRunId("from-keycloak");

    // Prefer polyfill which supports custom headers, fallback to native EventSource without URL token
    const tokenKeycloak = getStoredToken();
    if (tokenKeycloak) {
      try {
        eventSourceRef.current = new EventSourcePolyfill(
          buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId }),
          {
            headers: { Authorization: `Bearer ${tokenKeycloak}` },
          }
        );
      } catch (e) {
        // fallback
        eventSourceRef.current = new EventSource(
          buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId })
        );
      }
    } else {
      eventSourceRef.current = new EventSource(
        buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId })
      );
    }

    eventSourceRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSyncProgress((prev) => ({
        ...prev,
        percentage: data.percentage,
        message: data.message,
        log: data.heartbeat ? prev.log : prev.log + `[${Math.round(data.percentage)}%] ${data.message}\n`,
      }));

      if (data.stage === "error") {
        syncTerminalStageRef.current = "error";
        syncLastErrorMessageRef.current = data.message || "Đồng bộ Keycloak thất bại";
        toast(syncLastErrorMessageRef.current, "error");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
      } else if (data.stage === "completed" || data.percentage === 100) {
        syncTerminalStageRef.current = "completed";
        toast("Đồng bộ Keycloak hoàn tất!", "success");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
        setIsLoading((prev) => !prev); // Trigger reload table
      }
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current.close();
      if (syncTerminalStageRef.current) return;
      toast(syncLastErrorMessageRef.current || "Mất kết nối với máy chủ trong quá trình đồng bộ.", "error");
      setSyncProgress((prev) => ({
        ...prev,
        open: false,
        message: "Kết nối bị ngắt!",
      }));
    };

    api
      .post(API_SYNC_KEYCLOAK, { runId }, { timeout: 100000 })
      .then((response) => {
        logger.log("Response from sync Keycloak:", response);
        if (response?.data?.success === false) {
          toast(response.data.message || "Đồng bộ Keycloak thất bại.", "error");
          setSyncProgress((prev) => ({ ...prev, open: false }));
          if (eventSourceRef.current) eventSourceRef.current.close();
        }
      })
      .catch((error) => {
        toast(error.message || "Không thể bắt đầu quá trình đồng bộ.", "error");
        setSyncProgress({ open: false, percentage: 0, message: "", log: "" });
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      });
  };

  const handleSyncToKeycloak = () => {
    syncTerminalStageRef.current = null;
    syncLastErrorMessageRef.current = "";
    setSyncProgress({
      open: true,
      percentage: 0,
      message: "Đang kết nối đến máy chủ...",
      log: "",
    });

    const runId = createUserSyncRunId("to-keycloak");

    const token = getStoredToken();
    if (token) {
      try {
        eventSourceRef.current = new EventSourcePolyfill(buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId }), {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        eventSourceRef.current = new EventSource(buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId }));
      }
    } else {
      eventSourceRef.current = new EventSource(buildSSEUrl(API_SYNC_KEYCLOAK_PROGRESS, { runId }));
    }

    eventSourceRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSyncProgress((prev) => ({
        ...prev,
        percentage: data.percentage,
        message: data.message,
        log: data.heartbeat ? prev.log : prev.log + `[${Math.round(data.percentage)}%] ${data.message}${data.current ? ` (${data.current}/${data.total})` : ""}\n`,
      }));

      if (data.stage === "completed" || data.percentage === 100) {
        syncTerminalStageRef.current = "completed";
        toast("Đồng bộ lên Keycloak hoàn tất!", "success");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
        setIsLoading((prev) => !prev);
      } else if (data.stage === "error") {
        syncTerminalStageRef.current = "error";
        syncLastErrorMessageRef.current = data.message || "Đồng bộ lên Keycloak thất bại";
        toast(syncLastErrorMessageRef.current, "error");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
      }
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current.close();
      if (syncTerminalStageRef.current) return;
      toast(syncLastErrorMessageRef.current || "Mất kết nối với máy chủ trong quá trình đồng bộ lên Keycloak.", "error");
      setSyncProgress((prev) => ({
        ...prev,
        open: false,
        message: "Kết nối bị ngắt!",
      }));
    };

    api
      .post(API_SYNC_TO_KEYCLOAK, { runId })
      .then((response) => {
        logger.log("Response from sync TO Keycloak:", response);
      })
      .catch((error) => {
        toast(error.message || "Không thể bắt đầu quá trình đồng bộ lên Keycloak.", "error");
        setSyncProgress({ open: false, percentage: 0, message: "", log: "" });
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      });
  };

  const handleSyncWSO2 = () => {
    setSyncProgress({
      open: true,
      percentage: 0,
      message: "Đang kết nối đến máy chủ...",
      log: "",
    });

    // Prefer polyfill which supports custom headers, fallback to native EventSource without URL token
    const tokenWSO2 = getStoredToken();
    if (tokenWSO2) {
      try {
        eventSourceRef.current = new EventSourcePolyfill(API_SYNC_PROGRESS, {
          headers: { Authorization: `Bearer ${tokenWSO2}` },
        });
      } catch (e) {
        // fallback
        eventSourceRef.current = new EventSource(
          buildSSEUrl(API_SYNC_PROGRESS)
        );
      }
    } else {
      eventSourceRef.current = new EventSource(buildSSEUrl(API_SYNC_PROGRESS));
    }

    eventSourceRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSyncProgress((prev) => ({
        ...prev,
        percentage: data.percentage,
        message: data.message,
        log:
          prev.log +
          `[${Math.round(data.percentage)}%] ${data.message} (${data.current}/${data.total})\n`,
      }));

      if (data.stage === "error") {
        toast(data.message || "Đồng bộ WSO2 thất bại", "error");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
      } else if (data.stage === "completed" || data.percentage === 100) {
        toast("Đồng bộ WSO2 hoàn tất!", "success");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
        setIsLoading((prev) => !prev); // Trigger reload table
      }
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current.close();
      toast("Mất kết nối với máy chủ trong quá trình đồng bộ.", "error");
      setSyncProgress((prev) => ({
        ...prev,
        open: false,
        message: "Kết nối bị ngắt!",
      }));
    };

    // 2. Sau khi đã sẵn sàng lắng nghe, gửi yêu cầu bắt đầu đồng bộ
    // fetch(API_SYNC_WSO2, { method: 'POST' }).then(response => {
    api
      .post(
        API_SYNC_WSO2,
        {},
        {
          timeout: 100000,
        }
      )
      .then((response) => {
        logger.log("Response from sync WSO2:", response);
        if (response?.data?.success === false) {
          toast(response.data.message || "Đồng bộ WSO2 thất bại.", "error");
          setSyncProgress((prev) => ({ ...prev, open: false }));
          if (eventSourceRef.current) eventSourceRef.current.close();
        }
      })
      .catch((error) => {
        toast(error.message || "Không thể bắt đầu quá trình đồng bộ.", "error");
        setSyncProgress({ open: false, percentage: 0, message: "", log: "" });
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      });
  };

  const handleSyncUser = () => {
    if (authType === "wso2") {
      handleSyncWSO2();
    } else if (authType === "keycloak") {
      handleSyncKeycloak();
    }
  };

  const handleCancelSync = async () => {
    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // Gửi yêu cầu dừng tới backend
      await api.post(API_CANCEL_SYNC);
      
      setSyncProgress({ open: false, percentage: 0, message: "", log: "" });
      toast("Đã gửi yêu cầu hủy đồng bộ.", "warning");
    } catch (error) {
      logger.error("Lỗi khi hủy đồng bộ:", error);
      // Vẫn đóng dialog để người dùng không bị kẹt
      setSyncProgress({ open: false, percentage: 0, message: "", log: "" });
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  const handleAddUser = useCallback(() => {
    // navigate(`/manage-users/add`, { state: { view: 'add' } });
    handleOpenDialog("add");
    setViewId({ view: "add" });
  }, []);

  const handleEditUser = useCallback((id) => {
    handleOpenDialog("edit");
    setViewId({ id, view: "update" });
  }, []);

  const handleViewUser = useCallback((id) => {
    handleOpenDialog("view");
    setViewId({ id, view: "view" });
  }, []);

  const handleDeleteUser = useCallback((ids) => {
    handleOpenDialog("delete", ids);
  }, []);

  const handleLock = useCallback((ids) => handleOpenDialog("lock", ids), []);
  const handleUnlock = useCallback(
    (ids) => handleOpenDialog("unlock", ids),
    []
  );
  // const handleResetPassword = useCallback((ids) => handleOpenDialog("changePass", ids), []);
  const handleCloseDeleteDialog = useCallback(
    () => handleCloseDialog("delete"),
    []
  );
  const handleCloseChangePassDialog = useCallback(
    () => handleCloseDialog("changePass"),
    []
  );
  const handleCloseUnlockDialog = useCallback(
    () => handleCloseDialog("unlock"),
    []
  );
  const handleCloseLockDialog = useCallback(
    () => handleCloseDialog("lock"),
    []
  );
  const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), []);

  const handleCloseAddDialog = useCallback(() => {
    setViewId({});
    handleCloseDialog("add");
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setViewId({});
    handleCloseDialog("edit");
  }, []);

  const handleCloseViewDialog = useCallback(() => {
    setViewId({});
    handleCloseDialog("view");
  }, []);

  const handleCloseSwipper = useCallback((isSaved) => {
    if (viewId.view === "add") {
      handleCloseAddDialog();
    } else if (viewId.view === "update") {
      handleCloseEditDialog();
    } else {
      handleCloseViewDialog();
    }
    if (isSaved === true) {
      setIsLoading((prev) => !prev); // Trigger reload table
    }
  }, [
    handleCloseAddDialog,
    handleCloseEditDialog,
    handleCloseViewDialog,
    viewId.view,
  ]);

  const handleSaveClick = useCallback(() => {
    managerUsersRef.current?.submit();
  }, []);

  const handleOpenMapping = async () => {
    try {
      const response = await api.get(API_LIST_MAPPING_PERMISSION);
      if (response && response.data) {
        setMappingData(response.data);
      }
    } catch (error) {
       logger.error("Lỗi khi fetch mapping permission:", error);
    }
    setOpenMappingDialog(true);
  };

  const handleCloseMapping = () => {
    setOpenMappingDialog(false);
  };

  const handleSaveMapping = async () => {
    try {
      const payload = {
        mappings: mappingData
      };
      const response = await api.post(API_MAPPING_PERMISSION, payload);
      if (response) {
        toast("Lưu mapping quyền thành công", "success");
        // Reload lại dữ liệu
        const listRes = await api.get(API_LIST_MAPPING_PERMISSION);
        if (listRes && listRes.data) {
          setMappingData(listRes.data);
        }
      }
    } catch (error) {
      logger.error("Lỗi khi lưu mapping permission:", error);
      toast("Lưu mapping quyền thất bại", "error");
    }
  };

  const handleAddMappingRow = () => {
    setMappingData((prev) => [
      ...prev,
      { groupCode: "", realmRole: "", clientRole: "" },
    ]);
  };


  const handleDeleteMappingRow = (index) => {
    setMappingData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMappingInputChange = (index, field, value) => {
    setMappingData((prev) => {
      const nextData = [...prev];
      nextData[index][field] = value;
      return nextData;
    });
  };

  const handleSyncHrm = async () => {
    setSyncProgress({
      open: true,
      percentage: 0,
      message: "Đang kết nối đến máy chủ...",
      log: "",
    });

    const token = getStoredToken();
    if (token) {
      try {
        eventSourceRef.current = new EventSourcePolyfill(API_SYNC_HRM_PROGRESS, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        eventSourceRef.current = new EventSource(buildSSEUrl(API_SYNC_HRM_PROGRESS));
      }
    } else {
      eventSourceRef.current = new EventSource(buildSSEUrl(API_SYNC_HRM_PROGRESS));
    }

    eventSourceRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setSyncProgress((prev) => ({
        ...prev,
        percentage: data.percentage,
        message: data.message,
        log: prev.log + `[${Math.round(data.percentage)}%] ${data.message}${data.current ? ` (${data.current}/${data.total})` : ""}\n`,
      }));

      if (data.stage === "error") {
        toast(data.message || "Đồng bộ HRM thất bại", "error");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
      } else if (data.stage === "completed" || data.percentage === 100) {
        toast("Đồng bộ HRM hoàn tất!", "success");
        eventSourceRef.current.close();
        setTimeout(
          () => setSyncProgress((prev) => ({ ...prev, open: false })),
          2000
        );
        setIsLoading((prev) => !prev);
      }
    };

    eventSourceRef.current.onerror = () => {
      eventSourceRef.current.close();
      toast("Mất kết nối với máy chủ trong quá trình đồng bộ HRM.", "error");
      setSyncProgress((prev) => ({
        ...prev,
        open: false,
        message: "Kết nối bị ngắt!",
      }));
    };

    try {
      api.post(API_SYNC_HRM_MANUAL)
        .then((response) => {
          if (response?.data?.success === false) {
            toast(response.data.message || "Kích hoạt đồng bộ HRM thất bại.", "error");
            setSyncProgress((prev) => ({ ...prev, open: false }));
            if (eventSourceRef.current) eventSourceRef.current.close();
          }
        })
        .catch(error => {
          logger.error("Lỗi khi kích hoạt đồng bộ HRM:", error);
          toast(error.message || "Không thể kết nối để đồng bộ HRM.", "error");
          setSyncProgress((prev) => ({ ...prev, open: false }));
          if (eventSourceRef.current) eventSourceRef.current.close();
        });
    } catch (error) {
       logger.error("Lỗi khi đồng bộ HRM:", error);
    }
  };

  return (
    <>
      <Box>
        <Grid container spacing={2}>
          {/* Left column: full panel when open; collapsed small block when closed on small screens */}
          <Grid item xs={isMdDown ? (mobileMenuOpen ? 12 : 1) : 3}>
            <LeftPanelContainer mobileMenuOpen={mobileMenuOpen}>
              {mobileMenuOpen ? (
                <>
                  <LeftPanelHeader>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      }
                      label={<strong>Tất cả người dùng</strong>}
                    />
                    {/* Toggle/close button shown on small screens inside left panel */}
                    {isMdDown && (
                      <IconButton
                        onClick={handleCloseMobileMenu}
                        aria-label="collapse menu"
                      >
                        <CloseIcon />
                      </IconButton>
                    )}
                  </LeftPanelHeader>
                  <LeftPanelContent>
                    <CustomTableTreeLoadmore
                      rowKey="_id"
                      columns={departmentColumns}
                      fetchData={fetchDepartmentData}
                      fetchChildren={fetchDepartmentChildren}
                      filter={[{ name: "Tên phòng ban", code: "name" }]}
                      disablePagination
                      disableSynchronize
                      disableAdd
                      disableHeaderTable
                      disableDelete
                      disableEdit
                      disableDetail
                      disableAction
                      disableCheckbox
                      noneTitle
                      mainLimits={15}
                      childrenLimits={20}
											// disablePaperHeight
                      virtualListHeight="calc(100vh - 220px)"
											disableIcon
											autoFilter
                      mergeColumns
                      isTreeSearch
                    />
                  </LeftPanelContent>
                </>
              ) : (
                // Collapsed view: small block with toggle icon to expand
                <CollapsedMenuContainer>
                  <IconButton
                    onClick={handleOpenMobileMenu}
                    aria-label="open menu"
                  >
                    <MenuIconButton />
                  </IconButton>
                </CollapsedMenuContainer>
              )}
            </LeftPanelContainer>
          </Grid>
          <MainContentGrid
            item
            xs={isMdDown ? 12 : 9}
            isMdDown={isMdDown}
            mobileMenuOpen={mobileMenuOpen}
          >
            <TableWrapper>
              <StyleTittleBox>
                <StyleTittleTyprography variant="h5">
                  Quản lý người dùng
                </StyleTittleTyprography>
              </StyleTittleBox>
              <CustomTabsWithBadge
                tabs={tabs}
                value={tabValue}
                onChange={handleTabChange}
              />
              <CustomTable
                key={status}
                styledMaxHeight={194}
                codeModule="UserManagement"
                fetchData={getDataDistrictFromApi}
                disableSynchronize
                columns={columnsUsers}
                filter={filtersUsers}
                reload={isLoading}
                onAdd={handleAddUser}
                onDelete={handleDeleteUser}
                onEdit={handleEditUser}
                onView={handleViewUser}
                onLockUser={handleLock}
                onUnLockUser={handleUnlock}
                // onResetPassword={handleResetPassword}
                onSyncUser={showSyncButton ? handleSyncUser : undefined}
                onSyncToKeycloak={authType === "keycloak" ? handleSyncToKeycloak : undefined}
                onMappingPermission={showMappingButton ? handleOpenMapping : undefined}
                onSyncHrm={handleSyncHrm}
                uiPreset="unitModern"
                actionIconSize="medium"
                useModernActionColors
                addButtonLabel="Thêm mới"
                rowsPerPageOptions={[25, 50, 100, 500]}
								lockRowsPerPageOptions
								filterPopupAlignLeft
								encodeHtml
              />
            </TableWrapper>
          </MainContentGrid>
        </Grid>

        <DeleteDialog
          open={openDialogs.delete}
          onClose={handleCloseDeleteDialog}
          onSave={handleDelete}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />

        <ChangePassword
          open={openDialogs.changePass}
          onClose={handleCloseChangePassDialog}
          onSave={handleChangePass}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />

        <UnLockUser
          open={openDialogs.unlock}
          onClose={handleCloseUnlockDialog}
          onSave={handleLockUser}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />
        <LockUser
          open={openDialogs.lock}
          onClose={handleCloseLockDialog}
          onSave={handleLockUser}
          selectedIds={selectedIds}
          isLoading={isLoading}
        />
      </Box>
      <CustomDialog
        open={syncProgress.open}
        onClose={handleCancelSync}
        title="Đang đồng bộ người dùng"
        disableSave // Chỉ hiển thị nút "Hủy"
        size="sm"
      >
        <Box>
          <Typography variant="body1" gutterBottom>
            {syncProgress.message}
          </Typography>
          <SyncProgressContainer>
            <SyncProgressBar>
              <LinearProgress
                variant="determinate"
                value={syncProgress.percentage || 0}
              />
            </SyncProgressBar>
            <SyncProgressPercentage>
              {/* <Typography variant="body2" color="text.secondary">{`${Math.round(syncProgress.percentage || 0)}%`}</Typography> */}
              <SyncStyles>
                {`${Math.round(syncProgress.percentage || 0)}%`}
              </SyncStyles>
            </SyncProgressPercentage>
          </SyncProgressContainer>
          <SyncLog>{syncProgress.log}</SyncLog>
        </Box>
      </CustomDialog>

      <Swipper
        open={openDialogs.add || openDialogs.edit || openDialogs.view}
        title={
          viewId.view === "add"
            ? "Thêm mới người dùng"
            : viewId.view === "update"
              ? "Cập nhật người dùng"
              : "Xem chi tiết người dùng"
        }
        onClose={handleCloseSwipper}
        type={viewId.view}
        moreActions={
          <>
            {viewId.view !== "view" && (
              <CustomButton variant="primary" onClick={handleSaveClick}>
                Lưu
              </CustomButton>
            )}
          </>
        }
      >
        <ManagerUsers
          ref={managerUsersRef}
          props={{
            id: viewId.id,
            view: viewId.view,
            onClose: handleCloseSwipper,
            onOpenAdminChangePass: handleOpenAdminChangePass,
            inputLabelLayout: "stacked",
          }}
        />
      </Swipper>

      <AdminChangePassword
        open={openAdminChangePass}
        onClose={handleCloseAdminChangePass}
        onSave={handleAdminChangePass}
        isLoading={isLoading}
      />

      <CustomDialog
        open={openMappingDialog}
        onClose={handleCloseMapping}
        title="Mapping Quyền"
        size="lg"
        onSave={handleSaveMapping}
      >
        <CustomTableEditable
          columns={[
            { title: "Mã nhóm", name: "groupCode", width: "150px" },
            { title: "Realm Role", name: "realmRole", width: "200px" },
            { title: "Client Role", name: "clientRole", width: "200px" },
          ]}
          data={mappingData}
          onInputChange={handleMappingInputChange}
          onDeleteRow={handleDeleteMappingRow}
          onAddRow={handleAddMappingRow}
          addButtonText="Thêm mới"
        />
      </CustomDialog>
    </>
  );
};

export default ListUsers;
