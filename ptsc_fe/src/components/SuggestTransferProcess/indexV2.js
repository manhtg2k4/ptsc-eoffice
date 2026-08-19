/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { SwapHoriz, Group } from "@mui/icons-material";
import { useMediaQuery, useTheme, Drawer } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  SkyBox,
  SkyTypography,
  SkyIconButton
} from "@styles/SkyStyles";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrganizationUnits,
  fetchUsersData,
} from "@redux/slices/Directive/Directive";
import { updateIncomingDocument } from "@redux/slices/configSlice";
import { removeVietnameseTones } from "@utils/Common/Common";
import { flattenUnits } from "@utils/utils";
import ListUnitsUser from "./ListUnitsUser";
import { useForm } from "react-hook-form";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import withSharedComponents from "@components/WrapperComponent";
import RenderTableTree from "./RenderTableTreeSuggestTransferProcess";
import axiosInstance from "@utils/axiosInstance";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";

import dayjs from "dayjs";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";

/**
 * Premium Side Panel cho Chuyển xử lý
 */
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
    width: isContained ? "calc(100% - 34.5%)" : "1100px",
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
    }),
  },
}));

// const InlineWrapper = styled(SkyBox)(({ theme }) => ({
//   width: "100%",
//   height: "100%",
//   backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#FFFFFF",
//   display: "flex",
//   flexDirection: "column",
//   overflow: "hidden",
//   borderRadius: "12px",
//   border: `1px solid ${theme.palette.divider}`,
//   boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
// }));

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
  minHeight: 0,
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
  flexShrink: 0,
}));

const TreeWrapper = styled(SkyBox)({
  flex: "0 1 auto",
  maxHeight: "45%",
  minHeight: "50px",
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

const SuggestTreeWrapper = styled(TreeWrapper)({
  maxHeight: "none",
  minHeight: 0,
  flex: 1,
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

const StyledSuggestLabel = styled(SkyTypography)(({ theme }) => ({
  marginBottom: "8px",
  fontWeight: 700,
  color: theme.palette.text.secondary,
  textTransform: "uppercase",
  fontSize: "11px",
  flexShrink: 0,
}));

const PanelHeaderTitleGroup = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const SuggestionSectionWrapper = styled(SkyBox)(({ theme }) => ({
  marginTop: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: "150px",
}));

const SuggestTransferProcess = (props) => {
  const {
    open = false,
    delay = 1000,
    // label = "Chuyển xử lý",
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
    docIds: docIdsProp,
    typeSe,
    secType,
    panelContainerRef,
    inline = false,
    maxDepthLevel,
		profileButton
  } = props;
	// logger.log("profileButton", profileButton)
  const canTransferRoom = canTransferRooms || canTransferRoomProcessor || canTransferRoomSupporter || canTransferRoomViewer;
  const fallbackContainer =
    typeof document !== "undefined"
      ? document.getElementById("incoming-list-overlay-root")
      : null;
  const drawerContainer = panelContainerRef?.current || fallbackContainer || null;
  const isContainedDrawer = Boolean(drawerContainer);
  // logger.log("canTransferRoom", canTransferRoom);
  const { Input, toast, DatePicker, Button, LoadingDialog } = sharedComponents;

  const { dataUser: userProfile } = useSelector((state) => state.auth || {});
  const dispatch = useDispatch();
  const {
    usersData = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
  const { documentHistory } = useSelector((state) => state.unit || {});

  const alreadySentUserIds = useMemo(() => {
    const ids = new Set();
    const isThemXuLyAction = actionCode === "THEM_XU_LY" || codeAvailableActions === "THEM_XU_LY";
    if (isThemXuLyAction && Array.isArray(documentHistory)) {
      documentHistory.forEach((row) => {
        if (Array.isArray(row.childs)) {
          row.childs.forEach((child) => {
            if (child?.stageStatus !== "Đã xử lý") {
              if (child.receiver?._id) ids.add(child.receiver._id);
              if (child.receiver?.id) ids.add(child.receiver.id);
            }
          });
        }
      });
    }

    return ids;
  }, [documentHistory]);

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
  const [assignments, setAssignments] = useState({});
  const [isFreshDataLoaded, setIsFreshDataLoaded] = useState(false);
  const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [deadlineError, setDeadlineError] = useState(false); // Track lỗi DatePicker
  const [showRightPanel, setShowRightPanel] = useState(false);
  const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("sm"));
  const userId = userProfile?._id || userProfile?.id; // lấy người dùng
  const author = userProfile?.author;
  const parentId = userProfile?.parent?._id;
  const checkTransfer = usersData.find((item) => item.transfer === false);
 

  const flagsProcess = {
    canSetProcessor,
    canSetSupporter,
    canSetViewer,
    canTransferOption,
  };

  const { control, handleSubmit, reset, watch, setError, clearErrors, formState: { errors } } = useForm({
    shouldUnregister: false,
    defaultValues: {
      note: "",
      deadline: "",
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
  const docIds =
    docIdsProp ||
    docId ||
    dataDetail?.document?.documentId ||
    dataDetail?.documentId ||
    (Array.isArray(selectedFullRows)
      ? selectedFullRows.map((row) => row.id)
      : []);



  const fetchData = useCallback(async () => {
    try {
      const bodyUser = {
        processKey: dataDetail?.document?.bpmnVersion || dataDetail?.bpmnVersion,
        documentId: Array.isArray(docIds) ? docIds[0] : docIds,
        userId,
        roles: targetRole,
        documentType:
          dataDetail?.document?.isIncomming || dataDetail?.isIncomming
            ? "incomingdocument"
            : null,
        actionCode: actionCode,
        workitem: workItems?.nodeId,
      };
      const isAuthority = dataDetail?.document?.isAuthority;
      const params = isAuthority
        ? { isAuthority: true }
        : undefined;
      await Promise.all([
        dispatch(fetchUsersData({ body: bodyUser, params })),
        dispatch(fetchOrganizationUnits({ body: bodyUser, params })),
      ]);
      // FIX: Chỉ đánh dấu dữ liệu "sẵn sàng" SAU KHI fetch của chính popup này
      // (Chuyển văn thư) hoàn tất, để các effect tự động tích chọn người đầu tiên
      // chạy trên dữ liệu đúng, không bị dính data cũ từ popup Chuyển đề xuất.
      setIsFreshDataLoaded(true);
    } catch (error) {
      toast("Lỗi khi load dữ liệu", "error");
      // Vẫn mở khóa để tránh treo UI, dù fetch lỗi thì dataMergeUserAndUnit
      // cũng sẽ rỗng/không đổi nên không gây tích chọn sai.
      setIsFreshDataLoaded(true);
    }
  }, [docIds, dispatch, targetRole, dataDetail]);

  const resetState = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setAssignments({});
    setDeadlineError(false);
    setShowRightPanel(false);
    setLoadingTransfers(false);
    reset({
      note: "",
      deadline: "",
      deadlineChiDao: null,
      deadlinePhoi: null,
      deadlineNhanDeBiet: null,
    });
  }, [reset]);

  useEffect(() => {
    if (!open) {
      resetState();
    } else {
      setAssignments({});
      setSearch("");
      setDebouncedSearch("");
      reset({
        note: "",
        deadline: "",
        deadlineChiDao: null,
        deadlinePhoi: null,
        deadlineNhanDeBiet: null,
      });
    }
  }, [open, resetState, reset]);

  // FIX: Reset các lựa chọn khi chuyển loại thao tác (ví dụ từ "Chuyển đề xuất" sang "Chuyển văn thư")
  const targetRoleStr = JSON.stringify(targetRole);

  useEffect(() => {
    if (open) {
      setAssignments({});
      setSearch("");
      setDebouncedSearch("");
      reset({
        note: "",
        deadline: "",
        deadlineChiDao: null,
        deadlinePhoi: null,
        deadlineNhanDeBiet: null,
      });
    }
  }, [actionCode, targetRoleStr, open, reset]);

  // FIX: Dùng useLayoutEffect (không phải useEffect) để setIsFreshDataLoaded(false)
  useLayoutEffect(() => {
    if (open) {
      setIsFreshDataLoaded(false);
    }
  }, [open, actionCode, targetRoleStr]);

  useEffect(() => {
    // Chỉ fetch data khi dialog mở
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchData]);


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
          return subAction?.actions[0].code;
        }
      }
    }
    return null;
  }, [dataDetail]);


  const toCamelKey = (str) =>
    str.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const actionCodeMap = useMemo(() => {
    const codes = Array.isArray(actionsCodeSubTab)
      ? actionsCodeSubTab
      : (actionsCodeSubTab || "").split(",").filter(Boolean);
    return codes.reduce((acc, code) => {
      const key = toCamelKey(code);
      acc[key] = code;
      return acc;
    }, {});
  }, [actionsCodeSubTab]);


  const fetchDataUpdate = useCallback(async () => {
    try {
      if ((isUpdate || isView) && getFormDataForUpdate) {
        const result = await getFormDataForUpdate();
        if (!result) {
          throw new Error("Validation_Failed");
        }

        const { body: updateBody, hasChanged, isCreated, newDocId, newWorkItem } = result;

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
        
        return { isCreated, newDocId, newWorkItem };
      }
      return null;
    } catch (error) {
      logger.error('Lỗi trong fetchDataUpdate:', error);
      if (error.message !== "Validation_Failed") {
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      }
      throw error;
    }
  }, [isUpdate, isView, getFormDataForUpdate, dispatch, toast]);


  const onSubmit = useCallback(
    async (data) => {
      setLoadingTransfers(true);

      try {
        // Bước 1: Kiểm tra và update văn bản nếu cần (từ UpdateIncommingDoc)
        // Nếu có isUpdate HOẶC data thay đổi => call updateIncomingDocument trước
        const updateResult = await fetchDataUpdate();
        
        const trueCount = Object.values(flagsProcess).filter(Boolean).length;
        const list = Object.values(assignments || []);
        const chiDao = {
          users: list
            .filter((a) => a.chiDao && a.unitType === "user")
            .map((a) => a.id),
          organizationUnits: list
            .filter((a) => a.chiDao && a.unitType === "company")
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
          const fallback = data.deadlineChiDao || data.deadlinePhoi || data.deadlineNhanDeBiet || data.deadline;
          if (fallback) {
            return dayjs(fallback).isValid() ? dayjs(fallback).toISOString() : fallback;
          }
          return null;
        };

        const singleDeadline = getSingleItemDeadline();

        const buildSubAssignment = (type, key, deadline) => {
          const users = list
            .filter((a) => a[type] && a.unitType === "user")
            .map((a) => mapItemWithDeadline(a, type));
          const organizationUnits = list
            .filter((a) => a[type] && a.unitType === "company")
            .map((a) => mapItemWithDeadline(a, type));

          if (users.length === 0 && organizationUnits.length === 0) return null;

          const deadlineWithTime = deadline
            ? (dayjs(deadline).isValid() ? dayjs(deadline).toISOString() : deadline)
            : null;

          return {
            subActionCode: actionCodeMap[key] || null,
            users,
            organizationUnits,
            ...(deadlineWithTime ? { deadline: deadlineWithTime } : {}),
          };
        };
        const newAssignments = [
          buildSubAssignment("chiDao", "xuLyChinh", data.deadlineChiDao),
          buildSubAssignment("phoi", "phoiHop", data.deadlinePhoi),
          buildSubAssignment("nhanDeBiet", "nhanDeBiet", data.deadlineNhanDeBiet),
        ].filter(Boolean);

        const apiAction = subActionType === "transferView"
          ? "transferView"
          : (trueCount >= 2 ? "process" : "complete");

        const baseBody = {
          note: data.note,
          userId,
          isAuthority: authority,
          roles: targetRole,
          actionCode
        };

        const specificBody =
          trueCount >= 2
            ? {
              assignments: newAssignments,
              actionCode: codeAvailableActions,
            }
            : canTransferRooms === true
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
                  }
                ],
                actionCode: subActionCode,
              }
              : {
                assignToUserId: chiDao.users.length > 0 ? chiDao.users[0] : null,
                actionCode: viewAndSupport === false ? actionCodeFromActions : actionCode,
                ...(singleDeadline ? { deadline: singleDeadline } : {})
              };

        const currentWorkItem = workItems || (Array.isArray(selectedFullRows) && selectedFullRows.length > 0 ? selectedFullRows[0].workItem : null);
        const matchingWorkItem = currentWorkItem &&
          (currentWorkItem.assigneeUserId === userId ||
            currentWorkItem.assigneeUserId === parentId ||
            currentWorkItem.author === author)
          ? currentWorkItem
          : null;

        const idWorkItem = updateResult?.newWorkItem?.id || matchingWorkItem?.id;
        const idDocument = updateResult?.newDocId || (Array.isArray(docIds) ? docIds[0] : docIds);
        const endpoint = `${API_PROCCESS_DOCUMENT}/${idDocument}/${idWorkItem}/${apiAction}`;

        const body = {
          ...baseBody,
          ...specificBody,
          documentId: idDocument,
          docIds: updateResult?.newDocId ? [updateResult.newDocId] : (Array.isArray(docIds) ? docIds : [idDocument])
        };
        const isAuthorityDoc = dataDetail?.document?.isAuthority;
        const params = trueCount >= 2 && isAuthorityDoc
          ? { isAuthority: true }
          : undefined;

        const res = await axiosInstance.post(endpoint, body, { params });
        if (res) {
          reset();
          setAssignments({});
          onCloseDialog();
          onCloseAppBar();
          onClose();
          setSearch("");
          dispatch(getSideBarMenu());
          setReloadData(new Date() * 1);
          toast("Chuyển xử lý thành công", "success");
        }

      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      } finally {
        setLoadingTransfers(false);
      }
    },
    [
      flagsProcess,
      dataDetail?.document?.openWorkItems,
      docIds,
      assignments,
      codeAvailableActions,
      userId,
      actionCode,
      reset,
      onCloseDialog,
      onCloseAppBar,
      onClose,
      dispatch,
      setReloadData,
      toast,
      parentId,
      actionCodeMap,
      authority,
      subActionCode,
      subActionType,
      author,
      fetchDataUpdate,
      actionCodeFromActions,
      viewAndSupport,
      workItems,
      selectedFullRows
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

  const buildUnitTree = (units, parentId = null, parentName = null, isParentPhong = false) => {
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
  };

  const { mainUsers, suggestUsers } = useMemo(() => {
    if (!Array.isArray(usersData)) return { mainUsers: [], suggestUsers: [] };

    // Nếu dữ liệu có cấu trúc { transfer, user: [] }
    if (usersData.length > 0 && Object.prototype.hasOwnProperty.call(usersData[0], 'transfer')) {
      const main = usersData.find(u => u.transfer === true)?.user || [];
      const suggest = usersData.find(u => u.transfer === false)?.user || [];
      return { mainUsers: main, suggestUsers: suggest };
    }

    // Trường hợp dự phòng nếu dữ liệu đã được flatten sẵn hoặc cấu trúc khác
    return { mainUsers: usersData, suggestUsers: [] };
  }, [usersData]);
  const hasUserInSubTree = (nodes = []) => {
      return nodes.some((node) => {
        if (node?.types === "user") return true;
        if (Array.isArray(node?.child) && node.child.length > 0) {
          return hasUserInSubTree(node.child);
        }
        return false;
      });
    };

  const dataMergeUserAndUnit = useMemo(() => {
    if (!mainUsers || !organizationUnits) return [];
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

    const processUnits = (units, currentUsers, forceInclude = false) => {
      // Dùng flatMap để có thể loại bỏ node cha mà vẫn giữ lại các node con đã khớp
      return units.flatMap((unit) => {
        const matchedUsers = currentUsers?.filter(
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
        const childProcessed = processUnits(childUnits, currentUsers, shouldKeepAllChildren);

        // Đơn vị được giữ lại nếu:
        const hasRelevantData =
          !debouncedSearch ||
          shouldKeepAllChildren ||
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
    const tree = processUnits(rootUnits, mainUsers);

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

    return tree;
  }, [organizationUnits, mainUsers, debouncedSearch, searchKDV, profileButton]);

  // logger.log("suggestUsers", suggestUsers)
  const dataMergeUserAndUnitSuggest = useMemo(() => {
    if (!suggestUsers || suggestUsers.length === 0 || !organizationUnits) return [];
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

    const processUnits = (units, currentUsers, forceInclude = false) => {
      return units.flatMap((unit) => {
        const matchedUsers = currentUsers?.filter(
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

        // Nếu có tìm kiếm, chỉ giữ lại các user khớp từ khóa
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
        const childProcessed = processUnits(childUnits, currentUsers, shouldKeepAllChildren);

        // Đơn vị được giữ lại nếu:
        const hasRelevantData =
          !debouncedSearch ||
          shouldKeepAllChildren ||
          unitMatched || // Thêm unitMatched vào đây để bản thân unit khớp thì vẫn được hiển thị
          userNodes.length > 0 ||
          childProcessed.length > 0;

        if (!hasRelevantData) return [];

        if (debouncedSearch) {
           if (!unitMatched && !forceInclude) {
              return [...userNodes, ...childProcessed];
           }
        }

        return [{
          ...unit,
          child: [...userNodes, ...childProcessed],
        }];
      });
    };

    const kdvId = typeof searchKDV === 'string'
      ? searchKDV
      : (searchKDV?._id || searchKDV?.id);
    const rootUnits = kdvId
      ? filterUnits(organizationTree, kdvId)
      : organizationTree;
    const tree = processUnits(rootUnits, suggestUsers);

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

    return tree;
  }, [organizationUnits, suggestUsers, debouncedSearch, searchKDV, profileButton]);

  // console.log("dataMergeUserAndUnit", dataMergeUserAndUnit);

  // Tự động chọn chiDao khi chỉ có một người dùng trong kết quả
  // CHỈ tự động chọn khi chưa có assignment nào được chọn trước đó
  // KHÔNG tự động chọn khi canTransferRoom = true (cho phép chọn nhiều người)
  useEffect(() => {
    // FIX: Chờ dữ liệu của CHÍNH popup này load xong, tránh tích chọn nhầm trên
    // usersData/organizationUnits cũ còn sót lại từ popup Chuyển đề xuất.
    if (!isFreshDataLoaded) {
      return;
    }

    // Nếu canTransferRoom = true, không tự động chọn để user tự chọn nhiều người
    if (canTransferRoom) {
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

    //  Lấy tất cả các user trong kết quả
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

    const allUsers = getAllUsers(dataMergeUserAndUnit).filter((user) => {
      const uId = user._id || user.id;
      return !alreadySentUserIds.has(uId);
    });

    //  Nếu chỉ có một người dùng trong kết quả VÀ chưa có assignment nào
    if (allUsers.length === 1) {
      const user = allUsers[0];
      const userId = user._id || user.id;
      const key = getAssignmentKey(userId);

      setAssignments({
        [key]: {
          id: userId,
          key,
          name: user.name || "",
          code: user.code || "",
          unitType: "user",
          chiDao: true,
          phoi: false,
          nhanDeBiet: false,
        },
      });
    }
    // KHÔNG reset assignments khi có nhiều user - giữ nguyên lựa chọn cũ
  }, [dataMergeUserAndUnit, canTransferRoom, alreadySentUserIds, isFreshDataLoaded]);

  // Tự động tích sẵn phần tử đầu tiên khi roles là VAN_THU_TCT
  useEffect(() => {
    // FIX: Chờ dữ liệu của CHÍNH popup này load xong, tránh tích chọn nhầm trên
    // usersData/organizationUnits cũ còn sót lại từ popup Chuyển đề xuất.
    if (!isFreshDataLoaded) {
      return;
    }

    if (targetRole === "VAN_THU_TCT" && dataMergeUserAndUnit?.length > 0) {
      // Nếu đã có assignment nào được chọn, KHÔNG reset
      const hasExistingAssignments = Object.keys(assignments || {}).length > 0;
      if (hasExistingAssignments) {
        return;
      }

      const allUnits = flattenUnits(dataMergeUserAndUnit).filter(
        (unit) => unit.level > 0
      );

      const firstUser = allUnits.find((unit) => {
        const isUser = unit.types === "user" || unit.type === "user";
        if (!isUser) return false;
        const uId = unit._id || unit.id;
        return !alreadySentUserIds.has(uId);
      });

      if (firstUser) {
        const firstId = firstUser._id || firstUser.id;
        const firstKey = getAssignmentKey(firstId);

        setAssignments({
          [firstKey]: {
            id: firstId,
            key: firstKey,
            name: firstUser.name || "",
            code: firstUser.code || "",
            unitType: "user",
            chiDao: true,
            phoi: false,
            nhanDeBiet: false,
          },
        });
      }
    }
  }, [dataMergeUserAndUnit, targetRole, alreadySentUserIds, isFreshDataLoaded]);

  const getAssignmentKey = (unitId) => `${unitId}`;

  const getUnitName = useCallback(
    (unitId) => {
      const unit = flattenUnits(dataMergeUserAndUnit).find(
        (u) => (u._id || u.id) === unitId
      );
      return unit ? unit.name : "";
    },
    [dataMergeUserAndUnit]
  );

  const removeAssignment = (key) => {
    setAssignments((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const getAssignmentRole = (assignment) => {
    if (assignment.chiDao) {
      // Phân biệt LĐB (user) và đơn vị khác
      if (profileButton?.isDirect === false) {
        return "Xử lý";
      }
      return assignment.unitType === "user" ? "Chỉ đạo" : "Xử lý chính";
    }
    if (assignment.phoi) return "Phối hợp";
    if (assignment.nhanDeBiet) return "Nhận để biết";
    return "";
  };

  const rolePriority = {
    "Chỉ đạo": 1,
    "Xử lý": 1,
    "Xử lý chính": 2,
    "Phối hợp": 3,
    "Nhận để biết": 4,
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Chỉ đạo":
      case "Xử lý":
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

  // Thêm hàm helper để kiểm tra user có thể chọn nhiều item không
  const canSelectMultiple = useCallback(
    (userId) => {
      // Tìm user trong danh sách users
      const user = mainUsers.find((u) => u._id === userId);
      if (!user || !user.parent) return false;

      // Tìm đơn vị của user
      const userUnit = organizationUnits.find(
        (unit) => unit._id === user.parent
      );
      if (!userUnit) return false;
      return userUnit.parent !== null;
    },
    [mainUsers, organizationUnits]
  );

  const handleCheckboxChange = useCallback(
    (unitId, type, unitType, item) => {
      const key = getAssignmentKey(unitId);

      setAssignments((prev) => {
        const prevAssignment = prev?.[key] || {};
        const isCurrentlyChecked = prevAssignment[type] ?? false;

        // Nếu tick lại cùng loại → bỏ chọn hoàn toàn
        if (isCurrentlyChecked) {
          const updated = { ...prev };
          const current = updated[key];
          if (current) {
            current[type] = false;
            // Nếu không còn loại nào được chọn thì xóa luôn assignment
            if (!current.chiDao && !current.phoi && !current.nhanDeBiet) {
              delete updated[key];
            }
          }
          return updated;
        }

        const updatedAssignments = { ...prev };

        // ✅ Xử lý theo từng loại
        if (type === "chiDao") {

          if (typeSe === 'multi-transfer') {
            const currentUnitType = unitType ?? prevAssignment.unitType ?? (item?.types === "user" || item?.type === "user" ? "user" : "company");

            if (currentUnitType === "user") {
              // Nếu là user thì chỉ được chọn 1 người làm xử lý chính
              Object.keys(updatedAssignments).forEach((k) => {
                if (k !== key) {
                  const a = updatedAssignments[k];
                  if (a.unitType === "user" && a.chiDao) {
                    if (a.phoi || a.nhanDeBiet) {
                      updatedAssignments[k] = { ...a, chiDao: false };
                    } else {
                      delete updatedAssignments[k];
                    }
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
              chiDao: true,
              phoi: false,
              nhanDeBiet: false,
            };
          } else {
            // chiDao chỉ cho phép chọn duy nhất 1 (luôn uncheck các item khác)
            Object.keys(updatedAssignments).forEach((k) => {
              if (k !== key) {
                const a = updatedAssignments[k];
                if (a.chiDao) {
                  if (a.phoi || a.nhanDeBiet) {
                    updatedAssignments[k] = { ...a, chiDao: false };
                  } else {
                    delete updatedAssignments[k];
                  }
                }
              }
            });

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
              chiDao: true,
              phoi: false,
              nhanDeBiet: false,
            };
          }

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
            chiDao: false,
            phoi: true,
            nhanDeBiet: false,
          };
        } else if (type === "nhanDeBiet") {
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
            chiDao: false,
            phoi: false,
            nhanDeBiet: true,
          };
        }

        return updatedAssignments;
      });
    },
    [getUnitName, canSelectMultiple, mainUsers, organizationUnits]
  );

  const isChecked = useCallback(
    (item, type) => {
      const itemId = item._id || item.id;
      if (!itemId) return false;

      // Chỉ check trực tiếp item nếu nó có trong assignments
      // KHÔNG tự động check phòng ban cha khi child được chọn
      const assignment = assignments?.[itemId];
      return assignment?.[type] === true;
    },
    [assignments]
  );

  const assignedList = useMemo(() => {
    const entries = Object.entries(assignments || {});

    return entries
      .map(([key, assignment]) => {
        const role = getAssignmentRole(assignment);
        return {
          ...assignment,
          key,
          role,
        };
      })
      .filter((item) => item.chiDao || item.phoi || item.nhanDeBiet)
      .sort((a, b) => {
        const roleA = rolePriority[a.role] ?? Number.MAX_SAFE_INTEGER;
        const roleB = rolePriority[b.role] ?? Number.MAX_SAFE_INTEGER;
        if (roleA !== roleB) return roleA - roleB;
        return (a.name || "").localeCompare(b.name || "");
      });
  }, [assignments]);

  const handleTogglePanel = () => {
    setShowRightPanel((prev) => !prev);
  };

  const handleCheckAll = (key) => {
    const allUnits = flattenUnits(dataMergeUserAndUnit).filter(
      (unit) => unit.level > 0
    );

    // Nếu là chiDao (xử lý chính)
    if (key === "chiDao") {
      if (allUnits.length === 0) {
        setAssignments({});
        return;
      }

      // chiDao chỉ cho phép chọn duy nhất 1 (chọn item đầu tiên)
      const firstUnit = allUnits[0];
      const firstId = firstUnit._id || firstUnit.id;
      const firstKey = getAssignmentKey(firstId);

      setAssignments({
        [firstKey]: {
          id: firstId,
          key: firstKey,
          name: firstUnit.name || "",
          code: firstUnit.code || "",
          unitType: firstUnit.types === "user" ? "user" : "company",
          chiDao: true,
          phoi: false,
          nhanDeBiet: false,
        },
      });
      return;
    }

    // Phối hợp và Nhận để biết: có thể chọn nhiều item
    const allAssignments = allUnits.map((unit) => [
      unit._id || unit.id,
      {
        id: unit._id || unit.id || "",
        key: getAssignmentKey(unit._id || unit.id),
        name: unit.name || "",
        code: unit.code || "",
        unitType: unit.types === "user" ? "user" : "company",
        chiDao: false,
        phoi: false,
        nhanDeBiet: false,
        position: unit.position || "",
      },
    ]);

    // Đảm bảo mỗi item chỉ có 1 loại được chọn
    const result = allAssignments.map(([id, assignment]) => [
      id,
      {
        ...assignment,
        // Chỉ set loại được chọn = true, các loại khác = false
        chiDao: key === "chiDao",
        phoi: key === "phoi",
        nhanDeBiet: key === "nhanDeBiet",
      },
    ]);

    setAssignments(Object.fromEntries(result));
  };

  const handleCancelCheckAll = useCallback((type) => {
    setAssignments((prev) => {
      if (!type) {
        return {};
      }

      // Chỉ xóa các assignment có type được chỉ định, giữ lại các assignment khác
      const updatedAssignments = {};
      Object.entries(prev || {}).forEach(([key, assignment]) => {
        // Nếu assignment có type này, kiểm tra xem có type khác không
        if (assignment[type]) {
          // Tạo assignment mới không có type này
          const newAssignment = {
            ...assignment,
            [type]: false,
          };

          // Chỉ giữ lại nếu còn ít nhất một type khác (chiDao, phoi, hoặc nhanDeBiet)
          if (
            newAssignment.chiDao ||
            (type !== "phoi" && newAssignment.phoi) ||
            (type !== "nhanDeBiet" && newAssignment.nhanDeBiet)
          ) {
            updatedAssignments[key] = newAssignment;
          }
          // Nếu không còn type nào thì không thêm vào (xóa assignment)
        } else {
          // Giữ nguyên assignment không có type này
          updatedAssignments[key] = assignment;
        }
      });

      return updatedAssignments;
    });
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleClose = () => {
    onCloseDialog();
    setAssignments({});
    setSearch("");
    reset();
  };

  const content = (
    <>
      <PremiumDrawer
        anchor="right"
        open={open}
        onClose={onClose}
        transitionDuration={400}
        container={drawerContainer || undefined}
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
                  {profileButton?.label || "Đơn vị nhận xử lý"}
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
                  isChecked={isChecked}
                  assignments={assignments}
                  handleCheckboxChange={handleCheckboxChange}
                  onCheckAll={handleCheckAll}
                  onCancelCheckAll={handleCancelCheckAll}
                  canSetViewer={flagsProcess.canSetViewer}
                  canSetSupporter={flagsProcess.canSetSupporter || canProcessSupport}
                  canSetProcessor={flagsProcess.canSetProcessor && !canProcessSupport}
                  canTransferRooms={canTransferRooms || canTransferRoom}
                  canTransferOption={flagsProcess?.canTransferOption}
                  secType
                  checkTransfer={checkTransfer?.transfer}
                  control={control}
                  DatePicker={DatePicker}
                  errors={errors}
                  setDeadlineError={setDeadlineError}
                  disabledUserIds={alreadySentUserIds}
                  maxDepthLevel={maxDepthLevel}
                  profileButton={profileButton}
                  open={open}
                />
              </TreeWrapper>

              {dataMergeUserAndUnitSuggest && dataMergeUserAndUnitSuggest.length > 0 && (
                <SuggestionSectionWrapper>
                  <StyledSuggestLabel variant="subtitle2">
                    Gợi ý danh sách đơn vị/cá nhân
                  </StyledSuggestLabel>
                  <SuggestTreeWrapper>
                    <RenderTableTree
                      isMobileOrTablet={isMobileOrTablet}
                      data={dataMergeUserAndUnitSuggest}
                      canTransferRoom={canTransferRoom}
                      onlyUsers={profileButton?.onlyUsers}
                      isChecked={isChecked}
                      assignments={assignments}
                      handleCheckboxChange={handleCheckboxChange}
                      onCheckAll={handleCheckAll}
                      onCancelCheckAll={handleCheckAll}
                      canSetViewer={false}
                      canSetSupporter={false}
                      canSetProcessor={false}
                      canTransferRooms={canTransferRooms || canTransferRoom}
                      canTransferOption={false}
                      hideCheckboxes
                      checkTransfer={checkTransfer?.transfer}
                      control={control}
                      DatePicker={DatePicker}
                      errors={errors}
                      setDeadlineError={setDeadlineError}
                      disabledUserIds={alreadySentUserIds}
                      maxDepthLevel={maxDepthLevel}
                      profileButton={profileButton}
                      open={open}
                    />
                  </SuggestTreeWrapper>
                </SuggestionSectionWrapper>
              )}
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
                Button={Button}
                onCloseDialog={handleClose}
                getRoleColor={getRoleColor}
                handleSubmit={handleSubmit(onSubmit)}
                control={control}
                deadlineError={deadlineError}
                isSuggestion={secType === "suggestion"}
                enableInlineFooter
              />
            </PanelBody>
          </StyledRightPanel>
        </PanelContent>
      </PremiumDrawer>

      <LoadingDialog open={loading || loadingTranfer}>
        <StyledDialogContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </StyledDialogContent>
      </LoadingDialog>
    </>
  );

  return content;
};

SuggestTransferProcess.propTypes = {
  sharedComponents: PropTypes.object,
  open: PropTypes.bool,
  label: PropTypes.string,
  onClose: PropTypes.func,
  onCloseAppBar: PropTypes.func,
  onCloseDialog: PropTypes.func,
  inline: PropTypes.bool,
  docId: PropTypes.string,
  selectedFullRows: PropTypes.array,
  dataDetail: PropTypes.object,
  onSubmit: PropTypes.func,
  isCXL: PropTypes.bool,
  isDXXL: PropTypes.bool,
  panelContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(typeof Element !== "undefined" ? Element : Object),
  }),
};

SuggestTransferProcess.displayName = "SuggestTransferProcess";

export default memo(withSharedComponents(SuggestTransferProcess));