import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { SwapHoriz, Group } from "@mui/icons-material";
import { useMediaQuery, useTheme, Drawer, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";

import { useDispatch, useSelector } from "react-redux";
import { updateIncomingDocument } from "@redux/slices/configSlice";
import { getDocumentHistory } from "@redux/slices/SharedCategory/managementUnitSlice";
import { removeVietnameseTones } from "@utils/Common/Common";
import { flattenUnits } from "@utils/utils";
import ListUnitsUser from "./ListUnitsUser";
import { useForm } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import RenderTableTree from "@components/TransferProcess/RenderTableTree";
import axiosInstance from "@utils/axiosInstance";
import { API_ORAGANI_UNIT, API_PROCCESS_DOCUMENT, API_USER } from "@EnvironmentFile/constants/ulrConfigNew";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";

import dayjs from "dayjs";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { APP_BASE, API_GROUP_USERS_IN_DOCUMENT } from "@EnvironmentFile/constants/urlConfig";
import {
  SkyBox,
  SkyTypography,
  SkyIconButton
} from "@styles/SkyStyles";

const PremiumDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== "isContained" && prop !== "inline",
})(({ theme, isContained, inline }) => ({
  ...(isContained && {
    position: "absolute",
    inset: 0,
  }),
  ...(inline && {
    position: "relative",
    width: "100%",
    height: "100%",
  }),
  "& .MuiBackdrop-root": {
    ...(isContained && {
      position: "absolute",
      inset: 0,
      backgroundColor: "transparent",
    }),
  },
  "& .MuiDrawer-paper": {
    width: "1200px",


    maxWidth: "100%",
    height: "100%",
    backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
    borderLeft: "none",
    boxShadow: isContained ? "none" : "-10px 0 25px -5px rgba(0,0,0,0.1), -10px 0 10px -5px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...(isContained && {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      height: "100%",
    }),
    ...(inline && {
      position: "relative",
      width: "100%",
      height: "100%",
      boxShadow: "none",
      border: "none",
      borderLeft: `1px solid ${theme.palette.divider}`,
      borderTopRightRadius: "8px",
      borderBottomRightRadius: "8px",
    }),
  },
}));

const PanelHeaderWrapper = styled(SkyBox)(({ theme }) => ({
  padding: "16px 24px",
  backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "#fff",
  borderBottom: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f1f5f9"}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  zIndex: 10,
  minHeight: "64px",
}));



const PanelContent = styled(SkyBox)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "row",
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#fff",
  padding: "0",
  gap: "16px",
  overflowY: "auto",
  position: "relative",
  [theme.breakpoints.down("xl")]: {
    flexDirection: "column",
    gap: "16px",
    paddingBottom: "24px",
  },
}));

const StyledLeftPanel = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#fff",
  borderRadius: "8px",
  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  overflow: "hidden",
  [theme.breakpoints.down("xl")]: {
    width: "100%",
    height: "auto",
    maxHeight: "calc(100dvh - 100px)",
    minHeight: 0,
    flex: "none",
  },
  [theme.breakpoints.down("sm")]: {
    display: show ? "flex" : "none",
  },
}));

const StyledRightPanel = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "show",
})(({ theme, show }) => ({
  width: "500px",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.8)" : "#fff",
  borderRadius: "8px",
  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
  border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#e2e8f0"}`,
  overflow: "hidden",
  [theme.breakpoints.down("xl")]: {
    width: "100%",
    height: "auto",
    maxHeight: "calc(100dvh - 100px)",
    minHeight: 0,
    flex: "none",
  },
  [theme.breakpoints.down("sm")]: {
    display: show ? "flex" : "none",
  },
}));

const PanelBody = styled(SkyBox, {
  shouldForwardProp: (prop) => prop !== "$noPadding",
})(({ theme, $noPadding }) => ({
  flex: 1,
  padding: $noPadding ? "0" : "16px 16px",

  [theme.breakpoints.down("md")]: {
    padding: $noPadding ? "0" : "12px 16px",
  },
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: "10px",
  },
}));

const SearchWrapper = styled(SkyBox)(() => ({
  marginBottom: "16px",
}));

const TreeWrapper = styled(SkyBox)({
  height: "100%",
  flex: 1,
  minHeight: "400px",
  overflowY: "auto",
  overflowX: "hidden",


  "&::-webkit-scrollbar": {
    width: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: "10px",
  },
});

const StyledHeaderIcon = styled(Group)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledHeaderTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 700,
  color: theme.palette.text.primary,
  fontSize: "1.1rem",
}));
const StyledMobileToggle = styled(SkyIconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}));

const PanelHeaderTitleGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const LoadingContent = styled(SkyBox)({
  padding: "20px",
});

const TransferProcess = (props) => {
  const {
    open = false,
    label = "Chuyển xử lý",
    sharedComponents,
    onClose = () => { },
    onCloseAppBar = () => { },
    onCloseDialog = () => { },
    docId,
    selectedFullRows,
    dataDetail,
    actionCode,
    subActionType,
    targetRole,
    setReloadData = () => { },
    actionsCodeSubTab,
    codeAvailableActions,
    canTransferRooms,
    canTransferRoomProcessor,
    canTransferRoomSupporter,
    canTransferRoomViewer,
    canSetProcessor,
    canSetSupporter,
    canSetViewer,
    isUpdate,
    isView,
    getFormDataForUpdate,
    viewAndSupport,
    canTransferOption,
    canProcessSupport,
    onTransferSuccess = () => { }, // Callback khi chuyển xử lý thành công
    chiDao,
    actionsBySub,
    isNhanDeBiet: isNhanDeBietProp,
    docIds: docIdsProp,
    typeSe,
    canConfirmPropose,
    availableActionsType,
    signedCopyFiles,
    panelContainerRef,
    isDirectAssign = true,
    inline = false,
    delay = 1000,
    maxDepthLevel,
    profileButton,
  } = props;
  // logger.log("TransferProcess-profileButton", profileButton)
  // logger.log("TransferProcess-dataDetail", dataDetail)
  const canTransferRoom = useMemo(() => canTransferRooms || canTransferRoomProcessor || canTransferRoomSupporter || canTransferRoomViewer, [canTransferRooms, canTransferRoomProcessor, canTransferRoomSupporter, canTransferRoomViewer]);
  const fallbackContainer =
    typeof document !== "undefined"
      ? document.getElementById("incoming-list-overlay-root")
      : null;
  const drawerContainer = panelContainerRef?.current || fallbackContainer || null;
  const isContainedDrawer = Boolean(drawerContainer);
  const { Input, toast, DatePicker, Button, LoadingDialog } = sharedComponents;
  const isNhanDeBiet = isNhanDeBietProp;
  const bpmnVersion = props.bpmnVersion || dataDetail?.document?.bpmnVersion || dataDetail?.bpmnVersion;
  // logger.log("dataDetail", dataDetail);

  const isLanhDaoTCT = useMemo(() => {
    return dataDetail?.workItem?.role === "LANH_DAO_TCT"
  }, [dataDetail?.workItem?.role])

  const dispatch = useDispatch();
  const { dataUser } = useSelector((state) => state.auth);
  const { documentHistory } = useSelector((state) => state.unit);

  const alreadySentUserIds = useMemo(() => {
    const ids = new Set();
    const isNhanDeBietAction = isNhanDeBiet || actionCode === "CHUYEN_NHAN_DE_BIET" || codeAvailableActions === "CHUYEN_NHAN_DE_BIET";
    if (isNhanDeBietAction && Array.isArray(documentHistory)) {
      documentHistory.forEach(row => {
        if (row.receiver?._id) ids.add(row.receiver._id);
        if (row.receiver?.id) ids.add(row.receiver.id);

        if (Array.isArray(row.childs)) {
          row.childs.forEach(child => {
            if (child.receiver?._id) ids.add(child.receiver._id);
            if (child.receiver?.id) ids.add(child.receiver.id);
          });
        }
      });
    }
    return ids;
  }, [documentHistory, isNhanDeBiet, actionCode, codeAvailableActions]);

  const isUserMain = useMemo(() => {
    if (!dataUser || !dataDetail) return false;
    const userId = dataUser?._id || dataUser?.id;
    const target = dataDetail?.workItem?.assigneeUserId;
    return target?.includes(userId) || false;
  }, [dataUser, dataDetail]);

  const [users, setUsers] = useState([]);

  const assignedReceiverRolesMap = useMemo(() => {
    const map = new Map();
    if (profileButton?.isAssigned === true && Array.isArray(dataDetail?.assignedReceiverIds)) {
      dataDetail.assignedReceiverIds.forEach(item => {
        const uId = item?.userId || item?.unitId || item?.departmentId || item?.organizationId || item?.id || item?._id || item?.groupId;
        const role = item?.role;
        if (uId && role) {
          map.set(String(uId), String(role).toLowerCase());
        }
      });
    }
    return map;
  }, [profileButton?.isAssigned, dataDetail?.assignedReceiverIds]);

  const isThemPhanCongOrThemXuLy = useMemo(() => {
    return profileButton?.addProcess === "addProcess";
  }, [profileButton]);


  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchKDV] = useState(null);
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search.trim().length >= 2 || search.trim().length === 0) {
        setDebouncedSearch(search);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  const [organizationUnits, setOrganizationUnits] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [initialAssignments, setInitialAssignments] = useState({});
  const hasAutoSelectedRef = useRef(false);
  const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [loadingApi, setLoadingApi] = useState(false);
  const [deadlineError, setDeadlineError] = useState(false); // Track lỗi DatePicker
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // State quản lý việc chỉnh sửa khi Duyệt đề xuất
  const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("sm"));

  const userId = dataUser?._id || dataUser?.id; // lấy người dùng
  const author = dataUser?.author;
  const parentId = dataUser?.parent?._id;
  const flagsProcess = useMemo(() => {
    return {
      canSetProcessor,
      canSetSupporter,
      canSetViewer,
      canTransferOption,
    };
  }, [canSetProcessor, canSetSupporter, canSetViewer, canTransferOption]);

  const normalizedAvailableActionsType = useMemo(() => {
    if (typeof availableActionsType === "string" && availableActionsType.trim()) {
      return availableActionsType.trim();
    }
    if (Array.isArray(availableActionsType)) {
      const firstValidType = availableActionsType.find(
        (item) => typeof item === "string" && item.trim()
      );
      if (firstValidType) return firstValidType.trim();
    }
    if (typeof subActionType === "string" && subActionType.trim()) {
      return subActionType.trim();
    }
    if (typeof codeAvailableActions === "string" && /confirm[_-]?propose/i.test(codeAvailableActions)) {
      return "confirmPropose";
    }
    if (typeof actionCode === "string" && /confirm[_-]?propose/i.test(actionCode)) {
      return "confirmPropose";
    }
    return null;
  }, [availableActionsType, subActionType, codeAvailableActions, actionCode]);

  const isDisabledInteraction =
    canConfirmPropose &&
    normalizedAvailableActionsType === 'confirmPropose' &&
    !isEditMode;

  const { control, handleSubmit, reset, watch, setError, clearErrors, setValue, formState: { errors } } = useForm({
    shouldUnregister: false,
    defaultValues: {
      note: "",
      deadlineChiDao: null,
      deadlinePhoi: null,
      deadlineNhanDeBiet: null,
    },
  });

  const deadlineChiDao = watch("deadlineChiDao");
  const deadlinePhoi = watch("deadlinePhoi");

  useEffect(() => {
    if (deadlineChiDao && deadlinePhoi) {
      if (dayjs(deadlineChiDao).isBefore(dayjs(deadlinePhoi), 'day')) {
        setError("deadlineChiDao", {
          type: "manual",
          message: "Hạn xử lý chính không được trước hạn phối hợp"
        });
      } else {
        clearErrors("deadlineChiDao");
      }
    }
  }, [deadlineChiDao, deadlinePhoi, setError, clearErrors]);


  const workItems =
    dataDetail?.workItem

  // Lấy documentId từ nhiều nguồn: props docId, chi tiết (document.documentId), hoặc danh sách (documentId)
  const docIds = useMemo(() => {
    return (
      docIdsProp ||
      docId ||
      dataDetail?.document?.documentId ||
      dataDetail?.documentId ||
      (Array.isArray(selectedFullRows)
        ? selectedFullRows.map((row) => row.id)
        : [])
    );
  }, [docIdsProp, docId, dataDetail, selectedFullRows]);



  const fetchData = useCallback(async (shouldUpdate) => {
    try {
      const bodyUser = {
        documentId: Array.isArray(docIds) ? docIds[0] : docIds,
        userId,
        roles: targetRole,
        documentType:
          dataDetail?.document?.isIncomming || dataDetail?.isIncomming
            ? "incomingdocument"
            : null,
      };

      const currentLimit = 1000;

      const [usersResponse, organizationUnitsResponse, userGroupsResponse] = await Promise.all([
        axiosInstance.post(API_USER, bodyUser, {
          params: { page: 1, limit: currentLimit },
          skipUnwrap: true,
        }),
        axiosInstance.post(API_ORAGANI_UNIT, bodyUser),
        axiosInstance.get(`${API_GROUP_USERS_IN_DOCUMENT}/list-simple`).catch(() => [])
      ]);

      if (shouldUpdate()) {
        const initialUsers = usersResponse && Array.isArray(usersResponse.data) ? usersResponse.data : [];
        setUsers(initialUsers);
        setOrganizationUnits(
          Array.isArray(organizationUnitsResponse) ? organizationUnitsResponse : []
        );
        setUserGroups(
          Array.isArray(userGroupsResponse?.data?.data) ? userGroupsResponse.data.data : (Array.isArray(userGroupsResponse?.data) ? userGroupsResponse.data : (Array.isArray(userGroupsResponse) ? userGroupsResponse : []))
        );

        // Đọc total an toàn từ usersResponse.total hoặc usersResponse.data.total
        const totalUsers = usersResponse?.total !== undefined ? usersResponse.total : (usersResponse?.data?.total || 0);

        // Nếu dữ liệu trả về đạt limit và chưa lấy hết, tự động gọi thêm ở background
        if (initialUsers.length >= currentLimit && initialUsers.length < totalUsers) {
          const fetchMoreUsers = async (page) => {
            try {
              // Delay 200ms để người dùng quan sát việc tải dữ liệu tăng dần
              await new Promise((resolve) => setTimeout(resolve, 200));

              const res = await axiosInstance.post(API_USER, bodyUser, {
                params: { page, limit: currentLimit },
                skipUnwrap: true,
              });
              if (shouldUpdate() && res && Array.isArray(res.data) && res.data.length > 0) {
                // Đọc total mới nhất an toàn từ res.total hoặc res.data.total
                const nextTotal = res.total !== undefined ? res.total : (res.data?.total || 0);

                setUsers((prev) => {
                  const existingIds = new Set(prev.map((u) => u._id || u.id));
                  const newUsers = res.data.filter((u) => !existingIds.has(u._id || u.id));
                  const updated = [...prev, ...newUsers];

                  // Chỉ gọi tiếp nếu trang vừa rồi trả về đủ limit và tổng số đã lấy vẫn nhỏ hơn total mới nhất
                  if (res.data.length >= currentLimit && updated.length < nextTotal) {
                    fetchMoreUsers(page + 1);
                  }
                  return updated;
                });
              }
            } catch (err) {
              logger.error("Lỗi khi load thêm user inflow ở background:", err);
            }
          };

          fetchMoreUsers(2);
        }
      }
    } catch (error) {
      if (shouldUpdate()) {
        toast("Lỗi khi load dữ liệu", "error");
      }
    }
  }, [docIds, targetRole, dataDetail, toast, userId]);

  const resetState = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setUsers([]);
    setOrganizationUnits([]);
    setUserGroups([]);
    setAssignments({});
    setInitialAssignments({});
    setDeadlineError(false);
    setShowRightPanel(false);
    setIsEditMode(false);
    setLoadingApi(false);
    setLoadingTransfers(false);
    hasAutoSelectedRef.current = false;
    reset({
      note: "",
      deadlineChiDao: null,
      deadlinePhoi: null,
      deadlineNhanDeBiet: null,
    });
  }, [reset]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  // Reset các lựa chọn khi chuyển tab/chế độ (ví dụ từ Chuyển chỉ huy sang Chuyển xử lý)
  // Dùng JSON.stringify cho targetRole để tránh infinite loop nếu props truyền vào là inline array
  const targetRoleStr = JSON.stringify(targetRole);

  useEffect(() => {
    if (open) {
      setAssignments({});
      setInitialAssignments({});
      setUsers([]);
      setOrganizationUnits([]);
      setUserGroups([]);
      setSearch("");
      setDebouncedSearch("");
      hasAutoSelectedRef.current = false;
      reset({
        note: "",
        deadlineChiDao: null,
        deadlinePhoi: null,
        deadlineNhanDeBiet: null,
      });
    }
  }, [label, actionCode, targetRoleStr, open, reset]);

  useEffect(() => {
    // Chỉ fetch data khi dialog mở
    if (open) {
      const currentDocumentId = docId || dataDetail?.document?.documentId || dataDetail?.documentId || dataDetail?._id || dataDetail?.id;
      const isNhanDeBietAction = isNhanDeBiet || actionCode === "CHUYEN_NHAN_DE_BIET" || codeAvailableActions === "CHUYEN_NHAN_DE_BIET";

      let active = true;
      const shouldUpdate = () => active;

      const loadAllData = async () => {
        if (active) setLoadingApi(true);
        try {
          const promises = [fetchData(shouldUpdate)];
          if (currentDocumentId && isNhanDeBietAction) {
            promises.push(dispatch(getDocumentHistory(currentDocumentId)));
          }
          await Promise.all(promises);
        } catch (error) {
          logger.error("Lỗi khi load dữ liệu khởi tạo:", error);
        } finally {
          if (active) setLoadingApi(false);
        }
      };

      loadAllData();

      return () => {
        active = false;
      };
    }
  }, [open, fetchData, dispatch, docId, dataDetail, isNhanDeBiet, actionCode, codeAvailableActions]);

  // Tự động gán giá trị deadline từ assignedReceiverIds và activeReceiverIds vào form fields
  useEffect(() => {
    if (!open || !dataDetail) return;

    const parseDeadline = (d) => {
      if (!d) return null;
      if (dayjs.isDayjs(d)) return d;
      const p1 = dayjs(d, "DD/MM/YYYY HH:mm");
      if (p1.isValid()) return p1;
      const p2 = dayjs(d, "DD/MM/YYYY");
      if (p2.isValid()) return p2;
      const p3 = dayjs(d);
      if (p3.isValid()) return p3;
      return null;
    };

    const receiverLists = [
      ...(dataDetail?.assignedReceiverIds || []),
      ...(dataDetail?.activeReceiverIds || [])
    ];

    receiverLists.forEach((item) => {
      if (!item || !item.deadline) return;
      const rawId = item.userId || item.organizationId || item.groupId || item.unitId || item.id || item._id;
      if (!rawId) return;

      const uType = item.userId ? "user" : "company";
      let roleType = "ChiDao";
      const roleStr = String(item.role || item.roleProcess || "").toLowerCase();
      if (roleStr === "viewer" || roleStr === "nhan_de_biet") {
        roleType = "NhanDeBiet";
      } else if (roleStr === "supporter" || roleStr.includes("phoi")) {
        roleType = "Phoi";
      }

      const validDate = parseDeadline(item.deadline);
      if (!validDate) return;

      const ids = String(rawId).split(",").map((s) => s.trim()).filter(Boolean);
      ids.forEach((uId) => {
        const fieldName = `deadline${roleType}_${uType}_${uId}`;
        setValue(fieldName, validDate);
      });
    });
  }, [open, dataDetail, setValue]);




  // Tự động lấy subActionCode  Khi chuyển tùy chọn 
  const subActionCode = useMemo(() => {
    // Tìm trong availableActions của dataDetail
    const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
    for (const action of actions) {
      const subAction = action?.subActions?.find((sub) => sub.canTransferRoom === true);
      if (subAction) {
        return subAction.code;
      }
    }
    return null;
  }, [dataDetail]);

  // Lấy actionCode từ actions trong subActions có viewAndSupport === false
  const actionCodeFromActions = useMemo(() => {
    const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
    for (const action of actions) {
      for (const subAction of action?.subActions || []) {
        // Tìm subAction có viewAndSupport === false
        if (subAction?.viewAndSupport === false && subAction?.actions && Array.isArray(subAction?.actions) && subAction?.actions.length > 0) {
          // Lấy code từ action đầu tiên
          return subAction.actions[0].code;
        }
      }
    }
    return null;
  }, [dataDetail]);

  const isTransferMultiple = useMemo(() => {
    const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || dataDetail?.items?.[0]?.availableActions || [];
    return actions.some(action => action.type === "transferMultiple");
  }, [dataDetail]);

  const isCheckPCVT = useMemo(() => {
    const actions = dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
    return actions.some(action => action.checkPCVT === true);
  }, [dataDetail]);

  const userPhanCongData = useMemo(() => {
    return dataDetail?.userPhanCong || dataDetail?.document?.userPhanCong || [];
  }, [dataDetail]);

  const hasUserPhanCong = useMemo(() => {
    return Array.isArray(userPhanCongData) && userPhanCongData.length > 0;
  }, [userPhanCongData]);

  const isDisableProcessorByUserPhanCong = useMemo(() => {
    const availableActions =
      dataDetail?.availableActions || dataDetail?.document?.availableActions || [];
    const hasTransferAction = Array.isArray(availableActions)
      ? availableActions.some((action) => action?.type === "transfer")
      : false;

    return (
      hasTransferAction &&
      typeSe === "multi-transfer" &&
      Array.isArray(userPhanCongData) &&
      userPhanCongData.length > 0
    );
  }, [dataDetail, typeSe, userPhanCongData]);

  // IDs bị khóa: tất cả người được phân công XU_LY_CHINH từ userPhanCong
  const lockedPhanCongIds = useMemo(() => {
    if (!isDisableProcessorByUserPhanCong) return new Set();
    const xuLyChinhHandler = userPhanCongData.find((h) => h?.subActionCode === "XU_LY_CHINH");
    if (!xuLyChinhHandler || !Array.isArray(xuLyChinhHandler.users)) return new Set();
    const mappedIds = xuLyChinhHandler.users.map((item) => typeof item === "object" && item !== null ? item.userId : item).filter(Boolean);
    return new Set(mappedIds);
  }, [isDisableProcessorByUserPhanCong, userPhanCongData]);

  const preAssignedIds = useMemo(() => {
    if (!isDisableProcessorByUserPhanCong || !Array.isArray(userPhanCongData)) return new Set();
    const ids = new Set();
    userPhanCongData.forEach((handler) => {
      if (Array.isArray(handler.users)) {
        handler.users.forEach((item) => {
          const id = typeof item === "object" && item !== null ? item.userId : item;
          if (id) ids.add(String(id));
        });
      }
      if (Array.isArray(handler.organizationUnits)) {
        handler.organizationUnits.forEach((id) => {
          if (id) ids.add(String(id));
        });
      }
    });
    return ids;
  }, [isDisableProcessorByUserPhanCong, userPhanCongData]);


  const toCamelKey = (str) =>
    str.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const actionCodeMap = useMemo(() => {
    const codes = Array.isArray(actionsCodeSubTab)
      ? actionsCodeSubTab
      : (actionsCodeSubTab || "").split(",").filter(Boolean);

    // Thêm các code từ actionsBySub nếu có
    const codesFromActions = (actionsBySub || []).map(a => a.code);
    const allCodes = [...new Set([...codes, ...codesFromActions])];

    return allCodes.reduce((acc, code) => {
      const key = toCamelKey(code);
      acc[key] = code;
      return acc;
    }, {});
  }, [actionsCodeSubTab, actionsBySub]);


  const fetchDataUpdate = useCallback(async () => {
    try {
      // Lấy body data từ UpdateIncommingDoc hoặc AddIncommingDoc nếu có
      if ((isUpdate || isView) && getFormDataForUpdate) {
        const result = await getFormDataForUpdate();
        if (!result) {
          throw new Error("Validation_Failed");
        }
        const { body: updateBody, hasChanged } = result;

        if (hasChanged) {
          try {
            await dispatch(updateIncomingDocument(updateBody)).unwrap();
          } catch (error) {
            logger.error('Lỗi khi update văn bản:', error);
            throw error;
          }
        } else {
          logger.log('Không có thay đổi, bỏ qua việc update văn bản');
        }
      } else {
        logger.log('Bỏ qua fetchDataUpdate vì:', { isUpdate, hasGetFormDataForUpdate: !!getFormDataForUpdate });
      }
    } catch (error) {
      logger.error('Lỗi trong fetchDataUpdate:', error);
      if (error?.message !== 'Validation_Failed') {
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      }
      throw error;
    }
  }, [isUpdate, isView, getFormDataForUpdate, dispatch, toast]);


  const onSubmit = useCallback(
    async (data) => {
      // Guard: tránh submit ngoài ý muốn khi chưa có người nhận hoặc đang xử lý.
      if (loadingTranfer || Object.keys(assignments || {}).length === 0) {
        return;
      }
      setLoadingTransfers(true);

      try {
        // Bước 1: Kiểm tra và update văn bản nếu cần (từ UpdateIncommingDoc hoặc AddIncommingDoc)
        // Chờ hoàn toàn xong fetchDataUpdate trước khi tiếp tục
        await fetchDataUpdate();

        // Bước 2: Sau khi update xong, tiếp tục với logic chuyển xử lý
        const trueCount = Object.values(flagsProcess).filter(Boolean).length;
        const isNhanDeBietAction = isNhanDeBiet || actionCode === "CHUYEN_NHAN_DE_BIET" || codeAvailableActions === "CHUYEN_NHAN_DE_BIET";
        const apiAction = (subActionType === "transferView" || isNhanDeBietAction)
          ? (subActionType === "transferView" ? "transferView" : "process")
          : (trueCount >= 2 ? "process" : "complete");

        const list = Object.values(assignments || []).filter(a => {
          if (!hasUserPhanCong) return true;
          const initial = initialAssignments[a.key];
          if (!initial) return true;
          return a.chiDao !== initial.chiDao || a.phoi !== initial.phoi || a.nhanDeBiet !== initial.nhanDeBiet;
        });
        const isNhomXuLy = (id) => {
          return id === "ROOT_NHOM_XU_LY" || (Array.isArray(userGroups) && userGroups.some(g => (g.id || g._id) === id));
        };

        const chiDao = {
          users: list
            .filter((a) => a.chiDao && a.unitType === "user")
            .map((a) => a.id),
          organizationUnits: list
            .filter((a) => a.chiDao && a.unitType === "company" && !isNhomXuLy(a.id))
            .map((a) => a.id),
          groups: list
            .filter((a) => a.chiDao && a.unitType === "company" && isNhomXuLy(a.id))
            .map((a) => a.id),
        };

        const nhanDeBietSelection = {
          users: list
            .filter((a) => a.nhanDeBiet && a.unitType === "user")
            .map((a) => a.id),
          organizationUnits: list
            .filter((a) => a.nhanDeBiet && a.unitType === "company" && !isNhomXuLy(a.id))
            .map((a) => a.id),
          groups: list
            .filter((a) => a.nhanDeBiet && a.unitType === "company" && isNhomXuLy(a.id))
            .map((a) => a.id),
        };

        const mapItemWithDeadline = (a, type) => {
          const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
          const specificDeadlineKey = `deadline${typeCapitalized}_${a.unitType}_${a.id}`;
          const specificDeadline = data[specificDeadlineKey];
          if (specificDeadline) {
            const formattedDeadline = dayjs(specificDeadline).isValid()
              ? dayjs(specificDeadline).toISOString()
              : specificDeadline;
            if (a.unitType === "user") {
              return { userId: a.id, deadline: formattedDeadline };
            } else {
              return { organizationId: a.id, deadline: formattedDeadline };
            }
          }
          return a.id;
        };

        const getSingleItemDeadline = () => {
          for (const a of list) {
            const types = ["chiDao", "phoi", "nhanDeBiet"];
            for (const type of types) {
              if (a[type]) {
                const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
                const key = `deadline${typeCapitalized}_${a.unitType}_${a.id}`;
                if (data[key]) {
                  return dayjs(data[key]).isValid() ? dayjs(data[key]).toISOString() : data[key];
                }
              }
            }
          }
          const fallback = data.deadlineChiDao || data.deadlinePhoi || data.deadlineNhanDeBiet;
          if (fallback) {
            return dayjs(fallback).isValid() ? dayjs(fallback).toISOString() : fallback;
          }
          return null;
        };

        const singleDeadline = getSingleItemDeadline();

        const buildSubAssignment = (type, key) => {
          const users = list
            .filter((a) => a[type] && a.unitType === "user")
            .map((a) => mapItemWithDeadline(a, type));
          const organizationUnits = list
            .filter((a) => a[type] && a.unitType === "company" && !isNhomXuLy(a.id))
            .map((a) => mapItemWithDeadline(a, type));
          const groups = list
            .filter((a) => a[type] && a.unitType === "company" && isNhomXuLy(a.id))
            .map((a) => {
              const mapped = mapItemWithDeadline(a, type);
              if (typeof mapped === "object" && mapped !== null) {
                return { groupId: mapped.organizationId || mapped.userId || a.id, deadline: mapped.deadline };
              }
              return { groupId: a.id };
            });

          if (users.length === 0 && organizationUnits.length === 0 && groups.length === 0) return null;

          return {
            subActionCode: actionCodeMap[key] || null,
            users,
            organizationUnits,
            ...(groups.length > 0 ? { groups } : {})
          };
        };

        const newAssignments = [
          buildSubAssignment("chiDao", "xuLyChinh"),
          buildSubAssignment("phoi", "phoiHop"),
          buildSubAssignment("nhanDeBiet", "nhanDeBiet"),
        ].filter(Boolean);


        const baseBody = {
          note: data.note,
          userId,
          isAuthority: authority,
          roles: targetRole,
          actionCode
        };

        const specificBody = isNhanDeBietAction
          ? {
            ...(nhanDeBietSelection.users.length > 0 || nhanDeBietSelection.organizationUnits.length > 0 || nhanDeBietSelection.groups.length > 0
              ? {
                assignments: [
                  {
                    users: list
                      .filter((a) => a.nhanDeBiet && a.unitType === "user")
                      .map((a) => mapItemWithDeadline(a, "nhanDeBiet")),
                    organizationUnits: list
                      .filter((a) => a.nhanDeBiet && a.unitType === "company" && !isNhomXuLy(a.id))
                      .map((a) => mapItemWithDeadline(a, "nhanDeBiet")),
                    ...(nhanDeBietSelection.groups.length > 0
                      ? {
                        groups: list
                          .filter((a) => a.nhanDeBiet && a.unitType === "company" && isNhomXuLy(a.id))
                          .map((a) => {
                            const mapped = mapItemWithDeadline(a, "nhanDeBiet");
                            if (typeof mapped === "object" && mapped !== null) {
                              return { groupId: mapped.organizationId || mapped.userId || a.id, deadline: mapped.deadline };
                            }
                            return { groupId: a.id };
                          })
                      }
                      : {})
                  }
                ]
              }
              : {}),

            actionCode: actionCode || codeAvailableActions,
          }
          : trueCount >= 2
            ? {
              ...(newAssignments.length > 0 ? { assignments: newAssignments } : {}),
              actionCode: codeAvailableActions,
            }
            : canTransferRooms === true
              ? {
                ...(list.length > 0
                  ? {
                    assignments: [
                      {
                        subActionCode,
                        users: list
                          .filter((a) => a.chiDao && a.unitType === "user")
                          .map((a) => mapItemWithDeadline(a, "chiDao")),
                        organizationUnits: list
                          .filter((a) => a.chiDao && a.unitType === "company")
                          .map((a) => mapItemWithDeadline(a, "chiDao")),
                        // deadline: deadlineWithTime,
                      }
                    ]
                  }
                  : {}),

                actionCode: subActionCode,
              }
              : {
                assignToUserId: chiDao.users.length > 0 ? chiDao.users[0] : (list.find(a => a.unitType === "user")?.id || null),
                actionCode: viewAndSupport === false ? actionCodeFromActions : actionCode,
                ...(singleDeadline ? { deadline: singleDeadline } : {})
              };

        const currentWorkItem = workItems || (Array.isArray(selectedFullRows) && selectedFullRows.length > 0 ? selectedFullRows[0].workItem : null);
        const matchingWorkItem = currentWorkItem &&
          (currentWorkItem.assigneeUserId === userId ||
            currentWorkItem.assigneeUserId === parentId ||
            currentWorkItem.assigneeUserId === author)
          ? currentWorkItem
          : null;

        const isBatch = Array.isArray(docIds) && docIds.length > 1 && isTransferMultiple;
        const idDocument = Array.isArray(docIds) ? docIds[0] : docIds;
        const idWorkItem = matchingWorkItem?.id;

        let endpoint = "";
        let body = {
          ...baseBody,
          ...specificBody,
        };

        if (isBatch) {
          endpoint = `${API_PROCCESS_DOCUMENT}/incomming/complete-mutil-process`;
          body.assignToUserId = chiDao.users.length > 0 ? chiDao.users[0] : (list.find(a => a.unitType === "user")?.id || null);
          delete body.assignments;
          body.document = (selectedFullRows || []).map(row => {
            const rowWI = row.workItem;
            const matchWI = rowWI && (
              rowWI.assigneeUserId === userId ||
              rowWI.assigneeUsrId === parentId ||
              rowWI.assigneeUserId === author
            ) ? rowWI : rowWI;

            return {
              docId: row.id || row._id || row.documentId || row.docId,
              workItemId: matchWI?.id || row.workItemId || row.idWorkItem
            };
          });
        } else {
          endpoint = `${API_PROCCESS_DOCUMENT}/${idDocument}/${idWorkItem}/${apiAction}`;
          body.documentId = idDocument;
          body.docIds = [idDocument];
        }

        const res = await axiosInstance.post(endpoint, body);
        if (res) {
          reset();
          setAssignments({});
          setInitialAssignments({});
          onCloseDialog();
          onTransferSuccess();
          onCloseAppBar();
          onClose();
          setSearch("");
          dispatch(getSideBarMenu());
          setReloadData(prev => prev + 1);
          toast("Chuyển xử lý thành công", "success");

          if (dataDetail?.flags?.hasNextKySaoY) {
            const kySaoYBody = {
              id: signedCopyFiles?.id,
              assignment: list
                ?.find((a) => a.chiDao && a.unitType === "user")?.id,
              texts: {},
              auto: []
            };

            await axiosInstance.post(`${APP_BASE}/api/files/insert-user-info-to-pdf`, kySaoYBody);
          }
        }

      } catch (error) {
        if (error?.message !== 'Validation_Failed') {
          toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        }
      } finally {
        setLoadingTransfers(false);
      }
    },
    [dataDetail?.flags?.hasNextKySaoY,
      signedCopyFiles,
      flagsProcess,
      docIds,
      assignments,
      initialAssignments,
      codeAvailableActions,
      userId,
      actionCode,
      reset,
      onCloseDialog,
      onCloseAppBar,
      onClose,
      onTransferSuccess,
      dispatch,
      setReloadData,
      setAssignments,
      setInitialAssignments,
      setSearch,
      toast,
      parentId,
      author,
      loadingTranfer,
      selectedFullRows,
      actionCodeMap,
      authority,
      subActionCode,
      subActionType,
      isTransferMultiple,
      actionCodeFromActions,
      canTransferRooms,
      fetchDataUpdate,
      isNhanDeBiet,
      targetRole,
      viewAndSupport,
      workItems,
      hasUserPhanCong,
      userGroups
    ]
  );

  const getAbbreviatedRoomName = (roomName) => {
    if (!roomName) return '';
    let name = roomName.trim();
    if (name.toLowerCase().startsWith('phòng ')) {
      name = name.substring(6).trim();
    }
    const words = name.split(/\s+/).filter(w => w.length > 0);
    const abbr = words.map(w => w.charAt(0).toUpperCase()).join('');
    return `P.${abbr}`;
  };

  const buildUnitTree = useCallback((units, parentId = null, parentName = null, isParentPhong = false) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => {
        let finalName = u.name || '';
        const isCurrentPhong = u.type === 'Phong' || finalName.toLowerCase().startsWith('phòng ');

        if (isParentPhong && finalName.toLowerCase().startsWith('ban ')) {
          const abbr = getAbbreviatedRoomName(parentName);
          finalName = `${finalName} - ${abbr}`;
        }

        return {
          ...u,
          name: finalName,
          child: buildUnitTree(safeUnits, u._id, u.name, isCurrentPhong),
          types: "company",
        };
      });
  }, []);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!users || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits || []);
    const searchUnits = removeVietnameseTones(debouncedSearch || "").toLowerCase();

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

    const hasUserInSubTree = (nodes = []) => {
      return nodes.some((node) => {
        if (node?.types === "user") return true;
        if (Array.isArray(node?.child) && node.child.length > 0) {
          return hasUserInSubTree(node.child);
        }
        return false;
      });
    };

    const processUnits = (units, users, forceInclude = false) => {
      // Dùng flatMap để có thể loại bỏ node cha mà vẫn giữ lại các node con đã khớp
      return units.flatMap((unit) => {
        const matchedUsers = users?.filter(
          (user) => user?.parent === (unit?._id ?? unit?.id)
        );

        let userNodes = matchedUsers.map((user) => ({
          ...user,
          types: "user",
        }));

        const unitMatched =
          debouncedSearch &&
          ((unit.name &&
            removeVietnameseTones(unit.name)
              .toLowerCase()
              .includes(searchUnits)) ||
            (unit.codeND &&
              removeVietnameseTones(unit.codeND)
                .toLowerCase()
                .includes(searchUnits)) ||
            (unit.userName && unit.userName.toLowerCase() === searchUnits) ||
            (unit.username && unit.username.toLowerCase() === searchUnits));

        const shouldKeepAllChildren = forceInclude || unitMatched;
        // Giải thích comment: Bỏ `|| unitMatched` để không tự động lấy toàn bộ nhân viên con khi phòng ban cha khớp.
        // const shouldKeepAllChildren = forceInclude;

        if (debouncedSearch && !shouldKeepAllChildren) {
          userNodes = userNodes.filter(
            (user) =>
              (user.name &&
                removeVietnameseTones(user.name)
                  .toLowerCase()
                  .includes(searchUnits)) ||
              (user.codeND &&
                removeVietnameseTones(user.codeND)
                  .toLowerCase()
                  .includes(searchUnits)) ||
              (user.userName && user.userName.toLowerCase() === searchUnits) ||
              (user.username && user.username.toLowerCase() === searchUnits)
          );
        }

        const childUnits = Array.isArray(unit.child) ? unit.child : [];
        const childProcessed = processUnits(childUnits, users, shouldKeepAllChildren);

        // Đơn vị được giữ lại nếu:
        const hasRelevantData =
          !debouncedSearch ||
          shouldKeepAllChildren ||
          unitMatched || // Thêm unitMatched vào đây để bản thân unit khớp thì vẫn được hiển thị
          userNodes.length > 0 ||
          childProcessed.length > 0;

        if (!hasRelevantData) return [];

        // Kiểm tra xem unit có user nào không
        const hasUsers = userNodes.length > 0 || hasUserInSubTree(childProcessed);

        if (!canTransferRoom && !hasUsers) return [];

        // NẾU ĐANG TÌM KIẾM:
        if (debouncedSearch) {
          // Nếu unit này KHÔNG KHỚP (nhưng có con khớp), thì ta KHÔNG trả về unit này,
          // mà chỉ "nhấc" các con (userNodes và childProcessed) lên cấp hiện tại.
          if (!unitMatched && !forceInclude) {
            return [...userNodes, ...childProcessed];
          }
        }

        // Trường hợp bình thường hoặc unit này khớp: trả về unit với các child bên trong
        return [{
          ...unit,
          child: [...userNodes, ...childProcessed],
        }];
      });
    };

    // searchKDV có thể là string (ID) hoặc object với _id/id
    const kdvId = typeof searchKDV === 'string'
      ? searchKDV
      : (searchKDV?._id || searchKDV?.id);
    const rootUnits = kdvId
      ? filterUnits(organizationTree, kdvId)
      : organizationTree;
    const tree = processUnits(rootUnits, users);

    if (profileButton?.onlyUsers === true) {
      const extractOnlyUsers = (nodes) => {
        let userList = [];
        nodes.forEach((node) => {
          if (node.types === "user") {
            userList.push(node);
          }
          if (node.child && Array.isArray(node.child)) {
            userList = userList.concat(extractOnlyUsers(node.child));
          }
        });
        return userList;
      };
      const filteredUsers = extractOnlyUsers(tree);
      const parentMap = {};

      filteredUsers.forEach((user) => {
        const parentId = user?.parent;
        if (!parentId) return;

        if (!parentMap[parentId]) {
          const dept = organizationUnits?.find(
            (unit) => (unit?._id === parentId || unit?.id === parentId)
          );
          if (dept) {
            parentMap[parentId] = {
              ...dept,
              types: "company",
              child: [],
            };
          } else {
            parentMap[parentId] = {
              _id: parentId,
              id: parentId,
              name: "Phòng ban khác",
              types: "company",
              child: [],
            };
          }
        }
        parentMap[parentId].child.push(user);
      });

      return Object.values(parentMap);
    }

    // Khi label là "Phân công": bỏ node gốc (ROOT), hiển thị trực tiếp cấp PHÒNG.
    // Các popup khác (Chuyển xử lý, ...) vẫn hiển thị cây đầy đủ.
    const isPhanCong = (typeof label === 'string' && (
      label.toLowerCase().includes('phân công') ||
      label.toLowerCase().includes('phối hợp') ||
      label.toLowerCase().includes('thêm xử lý') ||
      label.toLowerCase().includes('chuyển xử lý')
    )) || isNhanDeBiet;
    let nodesToProcess = tree;
    let finalTree = tree;

    if (
      isPhanCong &&
      !debouncedSearch &&
      tree.length === 1 &&
      tree[0]?.types === "company" &&
      Array.isArray(tree[0]?.child) &&
      tree[0].child.length > 0
    ) {
      nodesToProcess = tree[0].child;
    }

    if (isPhanCong) {
      const isBanLanhDao = (node) => {
        return node?.code === "BLDBD" || (node?.name && removeVietnameseTones(node.name).toLowerCase().includes("ban lanh dao"));
      };

      const isFunctionalDepartment = (node) => {
        if (node?.code === "CTM") {
          return true;
        }
        const nodeName = node?.name || '';
        const nodeNameNoTones = removeVietnameseTones(nodeName).toLowerCase();
        return nodeNameNoTones.includes("phong chuc nang") && nodeNameNoTones.includes("truc thuoc");
      };

      const processNodes = (nodes) => {
        let result = [];
        nodes.forEach(node => {
          if (isFunctionalDepartment(node)) {
            // Chỉ ẩn "Phòng chức năng", đẩy các con của nó ra ngoài ngay tại vị trí hiện tại
            if (Array.isArray(node.child)) {
              node.child.forEach(c => {
                let processedChild = { ...c, isPhanCong: true };
                if (Array.isArray(processedChild.child)) {
                  processedChild.child = processNodes(processedChild.child);
                }
                result.push(processedChild);
              });
            }
          } else if (isBanLanhDao(node)) {
            let childUsers = [];
            let childUnits = [];

            if (Array.isArray(node.child)) {
              node.child.forEach(childNode => {
                if (childNode.types === "user") {
                  childUsers.push(childNode);
                } else {
                  childUnits.push(childNode);
                }
              });
            }

            // Giữ lại Ban Lãnh Đạo, giữ người dùng là con của nó (nếu không có tìm kiếm, hoặc Ban Lãnh Đạo khớp tìm kiếm, hoặc có con khớp)
            const processedChildUsers = processNodes(childUsers);
            const isMatched = debouncedSearch && (
              (node.name && removeVietnameseTones(node.name).toLowerCase().includes(searchUnits)) ||
              (node.codeND && removeVietnameseTones(node.codeND).toLowerCase().includes(searchUnits))
            );
            if (!debouncedSearch || processedChildUsers.length > 0 || isMatched) {
              let newNode = { ...node, isPhanCong: true, child: processedChildUsers };
              result.push(newNode);
            }

            // Lôi các đơn vị phòng ban khác ra ngoài và đặt ngang hàng Ban Lãnh Đạo
            childUnits.forEach(childNode => {
              if (isFunctionalDepartment(childNode)) {
                if (Array.isArray(childNode.child)) {
                  childNode.child.forEach(c => {
                    let processedChild = { ...c, isPhanCong: true };
                    if (Array.isArray(processedChild.child)) {
                      processedChild.child = processNodes(processedChild.child);
                    }
                    result.push(processedChild);
                  });
                }
              } else {
                let processedChild = { ...childNode, isPhanCong: true };
                if (Array.isArray(processedChild.child)) {
                  processedChild.child = processNodes(processedChild.child);
                }
                result.push(processedChild);
              }
            });
          } else {
            // Giữ nguyên toàn bộ cấu trúc gốc cho các node khác
            let newNode = { ...node, isPhanCong: true };
            if (Array.isArray(newNode.child)) {
              newNode.child = processNodes(newNode.child);
            }
            result.push(newNode);
          }
        });
        return result;
      };

      finalTree = processNodes(nodesToProcess);
    }

    const isStrictPhanCong = typeof label === 'string' && label.toLowerCase().includes('phân công');
    if (isStrictPhanCong && isCheckPCVT && Array.isArray(userGroups) && userGroups.length > 0) {
      const searchStr = removeVietnameseTones(debouncedSearch || "").toLowerCase();
      const userGroupsChildNodes = userGroups.map(g => ({
        ...g,
        _id: g.id || g._id,
        id: g.id || g._id,
        types: "company",
        isPhanCong: true,
        isNhomXuLyKoQuaLanhDao: true,
        child: []
      })).filter(g => {
        if (!searchStr) return true;
        return g.name && removeVietnameseTones(g.name).toLowerCase().includes(searchStr);
      });

      const rootNodeMatches = "nhom xu ly ko qua lanh dao".includes(searchStr);

      if (rootNodeMatches || userGroupsChildNodes.length > 0) {
        finalTree = [
          {
            _id: "ROOT_NHOM_XU_LY",
            id: "ROOT_NHOM_XU_LY",
            name: "Nhóm xử lý",
            types: "company",
            isPhanCong: true,
            isNhomXuLyKoQuaLanhDao: true,
            child: userGroupsChildNodes
          },
          ...finalTree
        ];
      }
    }

    if (bpmnVersion === "PHUC_DAP_DV_CON") {
      const isBanLanhDao = (node) => {
        return node?.code === "BLDBD" || (node?.name && removeVietnameseTones(node.name).toLowerCase().includes("ban lanh dao"));
      };

      const findNodeById = (nodes, targetId) => {
        if (!nodes || !Array.isArray(nodes)) return null;
        for (const node of nodes) {
          if ((node._id || node.id) === targetId) return node;
          if (node.child) {
            const found = findNodeById(node.child, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const filterOutBanLanhDao = (node) => {
        if (!node) return null;
        if (isBanLanhDao(node)) return null;
        let newNode = { ...node };
        if (Array.isArray(newNode.child)) {
          newNode.child = newNode.child.map(filterOutBanLanhDao).filter(Boolean);
        }
        return newNode;
      };

      const userDept = findNodeById(finalTree, parentId);
      if (userDept) {
        const filteredUserDept = filterOutBanLanhDao(userDept);
        return filteredUserDept ? [filteredUserDept] : [];
      }
    }

    return finalTree;
  }, [organizationUnits, users, debouncedSearch, searchKDV, buildUnitTree, canTransferRoom, profileButton, label, isNhanDeBiet, bpmnVersion, parentId, userGroups]);

  const flatMergeUnits = useMemo(() => {
    return flattenUnits(dataMergeUserAndUnit);
  }, [dataMergeUserAndUnit]);

  const childrenMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(organizationUnits)) {
      organizationUnits.forEach((unit) => {
        const uId = unit._id || unit.id;
        const pId = unit.parent || unit.parentId;
        if (pId && uId) {
          const pIdStr = String(pId);
          if (!map.has(pIdStr)) {
            map.set(pIdStr, []);
          }
          map.get(pIdStr).push({ id: uId, type: "company" });
        }
      });
    }
    if (Array.isArray(users)) {
      users.forEach((user) => {
        const userId = user._id || user.id;
        const pId = user.parent || user.parentId;
        if (pId && userId) {
          const pIdStr = String(pId);
          if (!map.has(pIdStr)) {
            map.set(pIdStr, []);
          }
          map.get(pIdStr).push({ id: userId, type: "user" });
        }
      });
    }
    return map;
  }, [organizationUnits, users]);

  const unitIdSet = useMemo(() => {
    if (!Array.isArray(organizationUnits)) return new Set();
    return new Set(organizationUnits.map((u) => String(u._id || u.id)));
  }, [organizationUnits]);

  const userGroupMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(userGroups)) {
      userGroups.forEach((g) => {
        const gId = String(g.id || g._id);
        if (gId) map.set(gId, g);
      });
    }
    return map;
  }, [userGroups]);

  const disabledDescendantIds = useMemo(() => {
    const disabledIds = new Set();
    if (!Array.isArray(organizationUnits) || !Array.isArray(users)) return disabledIds;

    const selectedUnitIds = [];
    Object.values(assignments || {}).forEach((a) => {
      if (a && (a.chiDao || a.phoi || a.nhanDeBiet)) {
        if (a.unitType === "company" || a.unitType === "unit") {
          selectedUnitIds.push(String(a.id));
        }
      }
    });

    if (assignedReceiverRolesMap) {
      assignedReceiverRolesMap.forEach((role, uId) => {
        if (unitIdSet.has(String(uId))) {
          selectedUnitIds.push(String(uId));
        }
      });
    }

    const addDescendants = (parentId) => {
      const children = childrenMap.get(String(parentId));
      if (children) {
        children.forEach((child) => {
          const childIdStr = String(child.id);
          if (!disabledIds.has(childIdStr)) {
            disabledIds.add(childIdStr);
            if (child.type === "company") {
              addDescendants(childIdStr);
            }
          }
        });
      }
    };

    selectedUnitIds.forEach((id) => {
      addDescendants(id);
    });

    // Disable individual users that belong to selected groups
    selectedUnitIds.forEach((id) => {
      const group = userGroupMap.get(id);
      if (group && Array.isArray(group.userIds)) {
        group.userIds.forEach((userId) => {
          disabledIds.add(String(userId));
        });
      }
    });

    return disabledIds;
  }, [organizationUnits, users, assignments, assignedReceiverRolesMap, childrenMap, unitIdSet, userGroupMap]);

  // Auto-select based on suggesteHandling if isUserMain is true
  useEffect(() => {
    const suggestedHandling =
      dataDetail?.suggestedHandling ||
      dataDetail?.document?.suggesteHandling ||
      [];

    if (!isUserMain || !Array.isArray(suggestedHandling) || suggestedHandling.length === 0 || !users?.length || !(canConfirmPropose && normalizedAvailableActionsType === 'confirmPropose')) return;
    const newAssignments = {};

    // 🔥 Tạo map để lookup nhanh O(1)
    const userMap = Object.fromEntries(
      users.map((u) => [(u._id || u.id), u])
    );

    const unitMap = Object.fromEntries(
      (organizationUnits || []).map((u) => [(u._id || u.id), u])
    );

    const typeMap = {
      XU_LY_CHINH: "chiDao",
      PHOI_HOP: "phoi",
      NHAN_DE_BIET: "nhanDeBiet",
    };

    suggestedHandling?.forEach((handler) => {
      const {
        subActionCode,
        users: suggestedUserIds = [],
        organizationUnits: suggestedUnitIds = [],
      } = handler;

      const type = typeMap[subActionCode];
      if (!type) return;

      // 👤 Users
      if (Array.isArray(suggestedUserIds)) {
        suggestedUserIds.forEach((item) => {
          const id = typeof item === "object" && item !== null ? item.userId : item;
          if (!id) return;
          const user = userMap[id];
          if (!user) return;

          const key = getAssignmentKey(id);

          if (!newAssignments[key]) {
            newAssignments[key] = {
              id,
              key,
              name: user.name || "",
              code: user.code || "",
              unitType: "user",
              chiDao: false,
              phoi: false,
              nhanDeBiet: false,
            };
          }

          newAssignments[key][type] = true;

          // Fill deadline if available
          if (typeof item === "object" && item !== null && item.deadline) {
            const fieldName = `deadline${type.charAt(0).toUpperCase() + type.slice(1)}_user_${id}`;
            setValue(fieldName, dayjs(item.deadline));
          }
        });
      }

      // 🏢 Units
      if (Array.isArray(suggestedUnitIds)) {
        suggestedUnitIds.forEach((item) => {
          const id = typeof item === "object" && item !== null ? (item.organizationId || item.id) : item;
          if (!id) return;
          const unit = unitMap[id];
          if (!unit) return;

          const key = getAssignmentKey(id);

          if (!newAssignments[key]) {
            newAssignments[key] = {
              id,
              key,
              name: unit.name || "",
              code: unit.code || "",
              unitType: "company",
              chiDao: false,
              phoi: false,
              nhanDeBiet: false,
            };
          }

          newAssignments[key][type] = true;

          // Fill deadline if available
          if (typeof item === "object" && item !== null && item.deadline) {
            const fieldName = `deadline${type.charAt(0).toUpperCase() + type.slice(1)}_company_${id}`;
            setValue(fieldName, dayjs(item.deadline));
          }
        });
      }
    });

    if (Object.keys(newAssignments).length > 0) {
      setAssignments(newAssignments);
      setInitialAssignments(newAssignments);
    }
  }, [isUserMain, dataDetail, users, organizationUnits, canConfirmPropose, normalizedAvailableActionsType, setValue]);

  // Auto-select theo userPhanCong khi ở chế độ multi-transfer và có action transfer
  useEffect(() => {
    if (!isDisableProcessorByUserPhanCong || !users?.length || !Array.isArray(userPhanCongData)) return;

    const newAssignments = {};
    const userMap = Object.fromEntries(users.map((u) => [u._id || u.id, u]));
    const unitMap = Object.fromEntries((organizationUnits || []).map((u) => [u._id || u.id, u]));

    const typeMap = {
      XU_LY_CHINH: "chiDao",
      PHOI_HOP: "phoi",
      NHAN_DE_BIET: "nhanDeBiet",
    };

    userPhanCongData.forEach((handler) => {
      const {
        subActionCode,
        users: selectedUserIds = [],
        organizationUnits: selectedUnitIds = [],
      } = handler || {};

      const type = typeMap[subActionCode];
      if (!type) return;

      if (Array.isArray(selectedUserIds)) {
        selectedUserIds.forEach((item) => {
          const id = typeof item === "object" && item !== null ? item.userId : item;
          if (!id) return;
          const user = userMap[id];
          if (!user) return;
          const key = getAssignmentKey(id);
          if (!newAssignments[key]) {
            newAssignments[key] = {
              id,
              key,
              name: user.name || "",
              code: user.code || "",
              unitType: "user",
              parentId: user.parentId || user.parent,
              chiDao: false,
              phoi: false,
              nhanDeBiet: false,
            };
          }
          newAssignments[key][type] = true;

          // Fill deadline if available
          if (typeof item === "object" && item !== null && item.deadline) {
            const fieldName = `deadline${type.charAt(0).toUpperCase() + type.slice(1)}_user_${id}`;
            setValue(fieldName, dayjs(item.deadline));
          }
        });
      }

      if (Array.isArray(selectedUnitIds)) {
        selectedUnitIds.forEach((id) => {
          const unit = unitMap[id];
          if (!unit) return;
          const key = getAssignmentKey(id);
          if (!newAssignments[key]) {
            newAssignments[key] = {
              id,
              key,
              name: unit.name || "",
              code: unit.code || "",
              unitType: "company",
              parentId: unit.parentId || unit.parent,
              chiDao: false,
              phoi: false,
              nhanDeBiet: false,
            };
          }
          newAssignments[key][type] = true;
        });
      }
    });

    if (Object.keys(newAssignments).length > 0) {
      setAssignments(newAssignments);
      setInitialAssignments(newAssignments);
    }
  }, [isDisableProcessorByUserPhanCong, users, organizationUnits, userPhanCongData, setValue]);

  // Tự động chọn chiDao khi chỉ có một người dùng trong kết quả (hoặc khi quy trình chỉ hiển thị phòng ban)
  // CHỈ tự động chọn khi chưa có assignment nào được chọn trước đó
  useEffect(() => {
    // Ưu tiên yêu cầu: tự động chọn người đầu tiên cho "Chỉ huy phòng"
    const isSpecialAction = targetRole === "CHI_HUY_PHONG" || (Array.isArray(targetRole) && targetRole.includes("CHI_HUY_PHONG"));
    const isPhucDapDVCon = bpmnVersion === "PHUC_DAP_DV_CON";

    // Nếu canTransferRoom = true (và không phải PHUC_DAP_DV_CON) hoặc không phải chế độ duyệt đề xuất, không tự động chọn
    if (!isPhucDapDVCon && (canTransferRoom || !(canConfirmPropose && normalizedAvailableActionsType === 'confirmPropose')) && !isSpecialAction) {
      return;
    }

    // Nếu đã tự động chọn trước đó trong phiên làm việc này, KHÔNG tự động chọn lại nữa (để người dùng có thể bỏ chọn/xóa)
    if (hasAutoSelectedRef.current) {
      return;
    }

    // Nếu đã có assignment nào được chọn, KHÔNG reset
    const hasExistingAssignments = Object.keys(assignments || {}).length > 0;
    if (hasExistingAssignments) {
      return;
    }

    if (!dataMergeUserAndUnit || dataMergeUserAndUnit.length === 0) {
      return;
    }

    // Lấy tất cả các user trong kết quả
    const getAllUsers = (units) => {
      let allUsers = [];
      units?.forEach((unit) => {
        if (unit.child && Array.isArray(unit.child)) {
          unit.child?.forEach((child) => {
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

    // Nếu chỉ có một người dùng trong kết quả HOẶC là hành động đặc biệt HOẶC quy trình chỉ hiển thị phòng ban PHUC_DAP_DV_CON
    if (allUsers.length === 1 || (allUsers.length > 0 && (isSpecialAction || isPhucDapDVCon))) {
      const user = allUsers[0];
      const userId = user._id || user.id;

      // Nếu user đầu tiên đã được phân công từ trước, không tự động check/tích hiển thị sang
      if (assignedReceiverRolesMap && assignedReceiverRolesMap.has(String(userId))) {
        return;
      }

      const key = getAssignmentKey(userId);

      const newAssignments = {
        [key]: {
          id: userId,
          key,
          name: user.name || "",
          code: user.code || "",
          unitType: "user",
          parentId: user.parentId || user.parent,
          chiDao: !isNhanDeBiet,
          phoi: false,
          nhanDeBiet: !!isNhanDeBiet,
        },
      };

      hasAutoSelectedRef.current = true;
      setAssignments(newAssignments);
      setInitialAssignments(newAssignments);
    }
    // KHÔNG reset assignments khi có nhiều user - giữ nguyên lựa chọn cũ
  }, [dataMergeUserAndUnit, canTransferRoom, assignments, canConfirmPropose, normalizedAvailableActionsType, label, isNhanDeBiet, targetRole, profileButton, bpmnVersion, assignedReceiverRolesMap]);

  const getAssignmentKey = (unitId) => `${unitId}`;

  const getUnitName = useCallback(
    (unitId) => {
      const unit = flatMergeUnits.find(
        (u) => (u._id || u.id) === unitId
      );
      return unit ? unit.name : "";
    },
    [flatMergeUnits]
  );

  const removeAssignment = (key) => {
    setAssignments((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const getAssignmentRole = useCallback((assignment) => {
    if (assignment.chiDao) {
      if (isNhanDeBiet) return "Nhận để biết";
      const isChiDao = (chiDao === true || chiDao === "true" || (actionsBySub && actionsBySub.length > 0 && actionsBySub.some(item => (item.chiDao === true || item.chiDao === "true"))));
      // Phân biệt LĐB (user) và đơn vị khác
      if (isChiDao) {
        return assignment.unitType === "user" ? "Chỉ đạo" : "Xử lý chính";
      }
      return "Xử lý chính";
    }
    if (assignment.phoi) return "Phối hợp";
    if (assignment.nhanDeBiet) return "Nhận để biết";
    return "";
  }, [chiDao, actionsBySub, isNhanDeBiet]);

  const rolePriority = useMemo(() => {
    return {
      "Chỉ đạo": 1,
      "Xử lý chính": 2,
      "Phối hợp": 3,
      "Nhận để biết": 4,
    };
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case "Chỉ đạo":
        return "#D9366D";
      case "Xử lý chính":
        return "#1460d7";
      case "Phối hợp":
        return "#d7af14";
      case "Nhận để biết":
        return "#C93EB1";
      default:
        return "default";
    }
  };

  // // Thêm hàm helper để kiểm tra user có thể chọn nhiều item không
  // const canSelectMultiple = useCallback(
  //   (userId) => {
  //     // Tìm user trong danh sách users
  //     const user = users.find((u) => u._id === userId);
  //     if (!user || !user.parent) return false;

  //     // Tìm đơn vị của user
  //     const userUnit = organizationUnits.find(
  //       (unit) => unit._id === user.parent
  //     );
  //     if (!userUnit) return false;
  //     return userUnit.parent !== null;
  //   },
  //   [users, organizationUnits]
  // );

  const handleCheckboxChange = useCallback(
    (unitId, type, unitType, item) => {
      if (item?.type === "Ban" || item?.type === "BanLD" || item?.type === "To") {
        return;
      }
      if (type === "chiDao" && (isDisableProcessorByUserPhanCong || (profileButton?.isDisableMainProcess === true && !isThemPhanCongOrThemXuLy))) {
        return;
      }
      const key = getAssignmentKey(unitId);

      setAssignments((prev) => {
        const prevAssignment = prev?.[key] || {};
        const isCurrentlyChecked = prevAssignment[type] ?? false;

        // Nếu tick lại cùng loại → bỏ chọn hoàn toàn
        if (isCurrentlyChecked) {
          const updated = { ...prev };
          const current = updated[key];
          if (current) {
            const updatedCurrent = { ...current, [type]: false };
            updated[key] = updatedCurrent;
            // Nếu không còn loại nào được chọn thì xóa luôn assignment
            if (!updatedCurrent.chiDao && !updatedCurrent.phoi && !updatedCurrent.nhanDeBiet) {
              delete updated[key];
            }
          }
          // Case nhanDeBiet: tự động bỏ tích người TRỰC TIẾP trong phòng ban đó nếu uncheck phòng ban
          if (isNhanDeBiet && type === "nhanDeBiet" && (unitType === "company" || item?.types === "company") && item?.child) {
            const removeDescendants = (node) => {
              node.child?.forEach((childNode) => {
                const descendantId = childNode._id || childNode.id;
                const dKey = getAssignmentKey(descendantId);
                if (updated[dKey]) {
                  const updatedChild = { ...updated[dKey], nhanDeBiet: false };
                  updated[dKey] = updatedChild;
                  if (!updatedChild.chiDao && !updatedChild.phoi && !updatedChild.nhanDeBiet) {
                    delete updated[dKey];
                  }
                }
                if (childNode.child) {
                  removeDescendants(childNode);
                }
              });
            };
            removeDescendants(item);
          }

          // Case nhanDeBiet: nếu bỏ tích 1 user → kiểm tra phòng ban cha
          // Nếu không còn user nào trong phòng đó được tích → tự động bỏ tích phòng ban
          if (isNhanDeBiet && type === "nhanDeBiet" && (unitType === "user" || item?.types === "user")) {
            const parentId = item?.parentId || item?.parent || prevAssignment.parentId;
            if (parentId && updated[parentId] && updated[parentId].nhanDeBiet) {
              // Tìm tất cả users trực tiếp trong phòng ban cha (dùng data từ users state)
              const siblingUsers = users?.filter(
                (u) => (u.parentId || u.parent) === parentId
              ) || [];

              const hasAnySelectedSibling = siblingUsers.some((sibling) => {
                const siblingId = sibling._id || sibling.id;
                if (siblingId === unitId) return false; // bỏ qua người vừa bỏ tích
                return updated[siblingId]?.nhanDeBiet === true;
              });

              if (!hasAnySelectedSibling) {
                // Không còn user nào trong phòng → bỏ tích phòng ban
                const updatedParent = { ...updated[parentId], nhanDeBiet: false };
                updated[parentId] = updatedParent;
                if (!updatedParent.chiDao && !updatedParent.phoi && !updatedParent.nhanDeBiet) {
                  delete updated[parentId];
                }
              }
            }
          }

          return updated;
        }

        const updatedAssignments = { ...prev };

        // Khi chọn một Phòng ban, ta nên xóa các lựa chọn của các cá nhân/phòng ban con bên trong
        // TRỪ trường hợp Nhận để biết khi isNhanDeBiet = true (theo yêu cầu auto-select users)
        if (unitType === 'company' && (!isNhanDeBiet || type !== 'nhanDeBiet')) {
          const allDescendants = flattenUnits([item]).filter(u => (u._id || u.id) !== unitId);
          allDescendants?.forEach(descendant => {
            const descendantKey = getAssignmentKey(descendant._id || descendant.id);
            delete updatedAssignments[descendantKey];
          });
        }

        // ✅ Xử lý theo từng loại
        if (type === "chiDao") {
          const currentUnitType =
            unitType ??
            prevAssignment.unitType ??
            (item?.types === "user" || item?.type === "user"
              ? "user"
              : "company");

          // Kiểm tra xem có phải "trình chánh ở văn thư tổng" hoặc "chuyển chỉ huy ở văn thư phòng" hay không.
          // Chỉ áp dụng ràng buộc duy nhất 1 người/đơn vị Xử lý chính (chiDao) cho 2 trường hợp này.
          const currentRole = String(dataDetail?.workItem?.role || "").toUpperCase();
          const targetRolesList = (Array.isArray(targetRole) ? targetRole : [targetRole]).map(r => String(r || "").toUpperCase());

          const isTrinhChanhVT =
            (currentRole === "VAN_THU_TCT" || currentRole === "VAN_THU") &&
            (targetRolesList.includes("CHANH_VAN_PHONG") || targetRolesList.includes("CHI_HUY_PHONG"));

          const isChuyenChiHuyVTP =
            currentRole === "VAN_THU_PHONG" &&
            targetRolesList.includes("CHI_HUY_PHONG");

          const shouldEnforceSingleSelection = isTrinhChanhVT || isChuyenChiHuyVTP;

          if (shouldEnforceSingleSelection) {
            // Xóa tất cả chiDao cũ ở các node khác để đảm bảo chỉ có duy nhất 1 người/đơn vị là Xử lý chính (Chỉ đạo)
            Object.keys(updatedAssignments).forEach((k) => {
              if (k !== key && updatedAssignments[k]?.chiDao) {
                const updatedItem = { ...updatedAssignments[k], chiDao: false };
                if (!updatedItem.phoi && !updatedItem.nhanDeBiet) {
                  delete updatedAssignments[k];
                } else {
                  updatedAssignments[k] = updatedItem;
                }
              }
            });
          }

          updatedAssignments[key] = {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType: currentUnitType,
            parentId: item?.parentId || item?.parent || prevAssignment.parentId,
            chiDao: true,
            phoi: false,
            nhanDeBiet: false,
          };
        }
        else if (type === "phoi") {
          // Phối hợp: có thể chọn nhiều item
          // Nếu item này đang có chiDao, thì bỏ chiDao của item này
          // (vì mỗi item chỉ có thể có 1 loại)
          updatedAssignments[key] = {
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
            parentId: item?.parentId || item?.parent || prevAssignment.parentId,
            chiDao: false,
            phoi: true,
            nhanDeBiet: false,
          };
        } else if (type === "nhanDeBiet") {
          // Nhận để biết: có thể chọn nhiều item
          // Nếu item này đang có chiDao, thì bỏ chiDao của item này
          const currentUnitType =
            unitType ??
            prevAssignment.unitType ??
            (item?.types === "user" || item?.type === "user"
              ? "user"
              : "company");

          updatedAssignments[key] = {
            id: unitId,
            key,
            name: item?.name ?? prevAssignment.name ?? getUnitName(unitId),
            code: item?.code ?? prevAssignment.code,
            unitType: currentUnitType,
            parentId: item?.parentId || item?.parent || prevAssignment.parentId,
            chiDao: false,
            phoi: false,
            nhanDeBiet: true,
          };

          // Yêu cầu: khi chọn phòng ban thì tự động tích luôn cả người TRỰC TIẾP trong phòng ban đó (khi isNhanDeBiet = true)
          // Đã sửa thành đệ quy để chọn cả phòng ban con và user con
          if (isNhanDeBiet && currentUnitType === "company" && item?.child) {
            const addDescendants = (node) => {
              node.child?.forEach((childNode) => {
                const descendantId = childNode._id || childNode.id;
                const dKey = getAssignmentKey(descendantId);
                const cUnitType = childNode.types === "user" || childNode.type === "user" ? "user" : "company";
                updatedAssignments[dKey] = {
                  id: descendantId,
                  key: dKey,
                  name: childNode.name || "",
                  code: childNode.code || "",
                  unitType: cUnitType,
                  parentId: childNode.parentId || childNode.parent,
                  chiDao: false,
                  phoi: false,
                  nhanDeBiet: true,
                };
                if (childNode.child) {
                  addDescendants(childNode);
                }
              });
            };
            addDescendants(item);
          }
        }

        return updatedAssignments;
      });
    },
    [getUnitName, users, isNhanDeBiet, isDisableProcessorByUserPhanCong, profileButton, isThemPhanCongOrThemXuLy]
  );

  const assignedList = useMemo(() => {
    const entries = Object.entries(assignments || {});
    // Tạo Set các ID đang được chọn thực sự để tra cứu nhanh
    const activeIds = new Set();
    entries.forEach(([id, item]) => {
      if (item && (item.chiDao || item.phoi || item.nhanDeBiet)) {
        activeIds.add(id);
      }
    });

    return entries
      .map(([key, assignment]) => {
        const role = getAssignmentRole(assignment);
        return {
          ...assignment,
          key,
          role,
        };
      })
      .filter((item) => {
        const isSelected = item.chiDao || item.phoi || item.nhanDeBiet;
        if (!isSelected) return false;

        // Bỏ qua các user/đơn vị đã được phân công cố định từ trước (có trong userPhanCongData)
        if (preAssignedIds.has(String(item.id)) || preAssignedIds.has(String(item.key))) {
          return false;
        }

        // Nếu là user và có phòng ban (parentId) đang được chọn, thì ẩn user này đi
        // TRỪ khi isNhanDeBiet = true (vì user được auto-select riêng lẻ cùng phòng ban)
        if (!isNhanDeBiet && item.unitType === "user" && item.parentId && activeIds.has(String(item.parentId))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const roleA = rolePriority[a.role] ?? Number.MAX_SAFE_INTEGER;
        const roleB = rolePriority[b.role] ?? Number.MAX_SAFE_INTEGER;
        if (roleA !== roleB) return roleA - roleB;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [assignments, getAssignmentRole, rolePriority, isNhanDeBiet, preAssignedIds]);

  const handleTogglePanel = () => {
    setShowRightPanel((prev) => !prev);
  };
  // const handleEnableEditMode = useCallback(() => {
  //   setIsEditMode(true);
  // }, []);

  const handleCheckAll = (key) => {
    const allUnits = flatMergeUnits.filter(
      (unit) => (unit.types === "user" || unit.level !== 0) && unit.type !== "Ban" && unit.type !== "BanLD"
    );

    if (allUnits.length === 0) return;

    // Nếu là chiDao (xử lý chính) mà bị disable thì không chọn
    if (key === "chiDao" && (isDisableProcessorByUserPhanCong || (profileButton?.isDisableMainProcess === true && !isThemPhanCongOrThemXuLy))) {
      return;
    }

    // Xử lý chọn tất cả cho Xử lý chính, Phối hợp và Nhận để biết
    setAssignments((prev) => {
      const next = { ...prev };
      allUnits.forEach((unit) => {
        const id = unit._id || unit.id;
        if (assignedReceiverRolesMap.has(String(id))) {
          return;
        }
        const uKey = getAssignmentKey(id);
        const prevAssignment = next[uKey] || {};

        // Mỗi item chỉ có 1 vai trò được chọn, nên khi chọn hàng loạt cho list này, ta ghi đè vai trò của chúng
        next[uKey] = {
          ...prevAssignment,
          id,
          key: uKey,
          name: unit.name || "",
          code: unit.code || "",
          unitType: unit.types === "user" ? "user" : "company",
          parentId: unit.parentId || unit.parent,
          position: unit.position || "",
          chiDao: key === "chiDao",
          phoi: key === "phoi",
          nhanDeBiet: key === "nhanDeBiet",
        };
      });
      return next;
    });
  };

  const handleCheckAllOfUnit = useCallback((unit, type) => {
    // Không tự động lấy con để check hàng loạt nữa
    const allChildUnits = [];

    setAssignments((prev) => {
      const updatedAssignments = { ...prev };
      const isChecking = !(prev?.[unit._id || unit.id]?.[type] === true);

      // Nếu là chiDao (Xử lý chính), chỉ dùng được nếu canSelectMultiple hoặc tương đương
      // Nhưng thường thì Nhận để biết và Phối hợp mới dùng chọn hàng loạt

      allChildUnits?.forEach(u => {
        const uId = u._id || u.id;
        const uKey = getAssignmentKey(uId);

        if (isChecking) {
          // Chấp nhận chọn cả người dùng và các phòng ban trung gian để hiển thị đồng bộ
          updatedAssignments[uKey] = {
            id: uId,
            key: uKey,
            name: u.name || "",
            code: u.code || "",
            unitType: u.types === "user" ? "user" : "company",
            parentId: u.parentId || u.parent,
            chiDao: type === "chiDao",
            phoi: type === "phoi",
            nhanDeBiet: type === "nhanDeBiet",
          };
        } else {
          // Bỏ chọn: chỉ bỏ chọn loại đang xét của con
          if (updatedAssignments[uKey]) {
            const updatedChild = { ...updatedAssignments[uKey], [type]: false };
            updatedAssignments[uKey] = updatedChild;
            if (!updatedChild.chiDao && !updatedChild.phoi && !updatedChild.nhanDeBiet) {
              delete updatedAssignments[uKey];
            }
          }
        }
      });

      // Cập nhật trạng thái cho chính nó
      const unitId = unit._id || unit.id;
      const unitKey = getAssignmentKey(unitId);
      if (isChecking) {
        updatedAssignments[unitKey] = {
          id: unitId,
          key: unitKey,
          name: unit.name || "",
          code: unit.code || "",
          unitType: "company",
          parentId: unit.parentId || unit.parent,
          chiDao: type === "chiDao",
          phoi: type === "phoi",
          nhanDeBiet: type === "nhanDeBiet",
        };
      } else {
        if (updatedAssignments[unitKey]) {
          const updatedUnit = { ...updatedAssignments[unitKey], [type]: false };
          updatedAssignments[unitKey] = updatedUnit;
          if (!updatedUnit.chiDao && !updatedUnit.phoi && !updatedUnit.nhanDeBiet) {
            delete updatedAssignments[unitKey];
          }
        }
      }

      return updatedAssignments;
    });
  }, []);

  const handleCancelCheckAll = useCallback((type) => {
    if (!type) {
      setAssignments((prev) => {
        const next = {};
        Object.keys(prev).forEach((key) => {
          if (assignedReceiverRolesMap.has(String(prev[key]?.id))) {
            next[key] = prev[key];
          }
        });
        return next;
      });
      return;
    }

    // Lấy các node hiện đang hiển thị để hủy chọn
    const visibleUnits = flatMergeUnits.filter(
      (unit) => (unit.types === "user" || unit.level !== 0) && unit.type !== "Ban" && unit.type !== "BanLD"
    );
    const visibleKeys = new Set(visibleUnits.map((u) => getAssignmentKey(u._id || u.id)));

    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (assignedReceiverRolesMap.has(String(next[key]?.id))) {
          return;
        }
        // Chỉ hủy chọn nếu key nằm trong danh sách đang hiển thị
        if (visibleKeys.has(key)) {
          const assignment = next[key];
          if (assignment && assignment[type]) {
            const updated = {
              ...assignment,
              [type]: false,
            };
            if (
              updated.chiDao ||
              (type !== "phoi" && updated.phoi) ||
              (type !== "nhanDeBiet" && updated.nhanDeBiet)
            ) {
              next[key] = updated;
            } else {
              delete next[key];
            }
          }
        }
      });
      return next;
    });
  }, [flatMergeUnits, assignedReceiverRolesMap]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleClose = () => {
    onCloseDialog();
    setAssignments({});
    setInitialAssignments({});
    setSearch("");
    setIsEditMode(false);
    reset();
  };

  return (
    <>
      <PremiumDrawer
        anchor="right"
        open={open}
        onClose={onClose}
        transitionDuration={400}
        container={inline ? undefined : (drawerContainer || undefined)}
        isContained={isContainedDrawer || inline}
        inline={inline}
        hideBackdrop={inline}
        variant={inline ? "persistent" : "temporary"}
        ModalProps={{
          keepMounted: true,
          disableScrollLock: true,
          disableAutoFocus: isContainedDrawer || inline,
          disableEnforceFocus: isContainedDrawer || inline,
          disableRestoreFocus: isContainedDrawer || inline,
        }}
      >
        <PanelContent>
          <StyledLeftPanel show={!showRightPanel}>
            <PanelHeaderWrapper>
              <PanelHeaderTitleGroup>
                <StyledHeaderIcon />
                <StyledHeaderTitle variant="h6">
                  {label}
                </StyledHeaderTitle>
              </PanelHeaderTitleGroup>
              {isMobileOrTablet && (
                <StyledMobileToggle onClick={handleTogglePanel} size="small">
                  <SwapHoriz />
                </StyledMobileToggle>
              )}
            </PanelHeaderWrapper>
            <PanelBody>
              <SearchWrapper>
                <Input
                  size="small"
                  fullWidth
                  placeholder="Tìm kiếm đơn vị, cá nhân..."
                  onChange={handleSearch}
                  value={search}
                  autoFocus
                />
              </SearchWrapper>

              <TreeWrapper>
                <RenderTableTree
                  isMobileOrTablet={isMobileOrTablet}
                  data={dataMergeUserAndUnit}
                  canTransferRoom={canTransferRoom}
                  onlyUsers={profileButton?.onlyUsers}
                  isExpandLess={profileButton?.isExpandLess}
                  debouncedSearch={debouncedSearch}

                  assignments={assignments}
                  assignedReceiverRolesMap={assignedReceiverRolesMap}
                  handleCheckboxChange={handleCheckboxChange}
                  onCheckAll={handleCheckAll}
                  onCancelCheckAll={handleCancelCheckAll}
                  canSetViewer={flagsProcess.canSetViewer}
                  canSetSupporter={flagsProcess.canSetSupporter || canProcessSupport}
                  canSetProcessor={flagsProcess.canSetProcessor && !canProcessSupport}
                  canTransferRooms={canTransferRooms || canTransferRoom}
                  canTransferOption={flagsProcess?.canTransferOption}
                  chiDao={chiDao}
                  actionsBySub={actionsBySub}
                  actionCode={actionCode}
                  targetRole={targetRole}
                  label={label}
                  isNhanDeBiet={isNhanDeBiet}
                  disableProcessorColumn={isDisableProcessorByUserPhanCong || (profileButton?.isDisableMainProcess === true && !isThemPhanCongOrThemXuLy)}
                  onCheckAllChild={handleCheckAllOfUnit}
                  control={control}
                  DatePicker={DatePicker}
                  errors={errors}
                  setDeadlineError={setDeadlineError}
                  isDisabledInteraction={isDisabledInteraction}
                  canConfirmPropose={canConfirmPropose}
                  lockedPhanCongIds={lockedPhanCongIds}
                  initialAssignments={initialAssignments}
                  hasUserPhanCong={hasUserPhanCong}
                  alreadySentUserIds={alreadySentUserIds}
                  maxDepthLevel={maxDepthLevel}
                  defaultCollapseAll={bpmnVersion !== "PHUC_DAP_DV_CON"}
                  defaultExpandAll={bpmnVersion === "PHUC_DAP_DV_CON"}
                  disableBan
                  disabledDescendantIds={disabledDescendantIds}
                />
              </TreeWrapper>
            </PanelBody>
          </StyledLeftPanel>

          <StyledRightPanel show={showRightPanel || !isMobileOrTablet}>
            <PanelHeaderWrapper>
              <PanelHeaderTitleGroup>
                <StyledHeaderIcon />
                <StyledHeaderTitle variant="h6">
                  Danh sách đã chọn tham gia
                </StyledHeaderTitle>
              </PanelHeaderTitleGroup>
              {isMobileOrTablet && (
                <StyledMobileToggle onClick={handleTogglePanel} size="small">
                  <SwapHoriz />
                </StyledMobileToggle>
              )}
            </PanelHeaderWrapper>
            <PanelBody $noPadding>
              <ListUnitsUser
                assignedList={assignedList}
                removeAssignment={removeAssignment}
                Input={Input}
                DatePicker={DatePicker}
                Button={Button}
                onCloseDialog={handleClose}
                getRoleColor={getRoleColor}
                handleSubmit={handleSubmit(onSubmit)}
                control={control}
                deadlineError={deadlineError}
                setDeadlineError={setDeadlineError}
                errors={errors}
                canConfirmPropose={canConfirmPropose}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                availableActionsType={normalizedAvailableActionsType}
                lockedPhanCongIds={lockedPhanCongIds}
                initialAssignments={initialAssignments}
                hasUserPhanCong={hasUserPhanCong}
                isDirectAssign={isDirectAssign}
                enableInlineFooter
                isLanhDaoTCT={isLanhDaoTCT}
              />
            </PanelBody>
          </StyledRightPanel>
          {loadingApi && (
            <StyledLoadingPopupSignDigital>
              <CircularProgress />
            </StyledLoadingPopupSignDigital>
          )}
        </PanelContent>
      </PremiumDrawer>

      <LoadingDialog open={loadingTranfer}>
        <LoadingContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </LoadingContent>
      </LoadingDialog>
    </>
  );
};

TransferProcess.propTypes = {
  sharedComponents: PropTypes.object,
  open: PropTypes.bool,
  label: PropTypes.string,
  onClose: PropTypes.func,
  onCloseAppBar: PropTypes.func,
  onCloseDialog: PropTypes.func,
  docId: PropTypes.string,
  selectedFullRows: PropTypes.array,
  dataDetail: PropTypes.object,
  onSubmit: PropTypes.func,
  isCXL: PropTypes.bool,
  isDXXL: PropTypes.bool,
  panelContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(typeof Element !== "undefined" ? Element : Object),
  }),
  signedCopyFiles: PropTypes.object,
  maxDepthLevel: PropTypes.number,
};

TransferProcess.displayName = "TransferProcess";

export default memo(withSharedComponents(TransferProcess));
