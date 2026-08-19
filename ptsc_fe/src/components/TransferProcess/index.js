import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  PanelHeader,
  StyleBoxContainer,
  StyleBoxContainerRight,
  StyleContainer,
  StyledContainer,
  StyledGridContainer,
  StyleDialog,
  StyledToggleButton,
  StyledDialogTitle,
  StyledDialogContentMobile,
  StyledTitleText,
  StyledSearchContainer,
} from "@styles/DialogDirective";

import { SwapHoriz } from "@mui/icons-material";
import { Grid, Tooltip, useMediaQuery, useTheme } from "@mui/material";

import { useDispatch, useSelector } from "react-redux";
import {
  fetchOrganizationUnits,
  fetchUsers,
} from "@redux/slices/Directive/Directive";
import { updateIncomingDocument } from "@redux/slices/configSlice";
import { removeVietnameseTones } from "@utils/Common/Common";
import { flattenUnits } from "@utils/utils";
import ListUnitsUser from "./ListUnitsUser";
import { useForm } from "react-hook-form";
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import withSharedComponents from "@components/WrapperComponent";
import RenderTableTree from "@components/TransferProcess/RenderTableTree";
import axiosInstance from "@utils/axiosInstance";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";

import dayjs from "dayjs";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

/**
 * DialogDirective
 * Props của DialogDirective:
 * @param {boolean} [open=true] - Mở/đóng dialog
 * @param {string} [label="Chuyển xử lý"] - Tiêu đề dialog
 * @param {function} [onClose] - Callback khi đóng dialog
 * @param {function} [onCloseAppBar] - Callback khi đóng app bar (nếu có)
 * @param {function} [onCloseDialog] - Callback khi đóng dialog từ nội dung
 * @param {string} [docId] - ID của văn bản cần chuyển xử lý
 * @param {Array} [selectedFullRows] - Danh sách các row được chọn (nếu docId không có)
 * @param {Object} [dataDetail] - Thông tin chi tiết văn bản
 * @param {function} [onSubmit] - Callback khi submit form
 * @param {boolean}  [isCXL =true] Chuyển đề xuất
 * @param {boolean}  [isDXXL =true] Chuyển đề xuất
 *
 * Internal State:
 * - search, searchKDV: search text
 * - assignments: lưu trữ các phân công (chiDao, phoi, nhanDeBiet)
 * - loadingTransfer: trạng thái loading khi gửi dữ liệu
 *
 * @example
 * <DialogDirective
 *   open={true}
 *   label="Chuyển xử lý"
 *   sharedComponents={sharedComponents}
 *   docId="123456"
 *   onClose={() => setOpen(false)}
 * />
 */

const TransferProcess = (props) => {
  const {
    open = false,
    label = "Chuyển xử lý",
    delay = 1000,
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
    signedCopyFiles
  } = props;
   const canTransferRoom = canTransferRooms || canTransferRoomProcessor || canTransferRoomSupporter || canTransferRoomViewer;
  const { Input, toast, DatePicker, Button, LoadingDialog } = sharedComponents;
  const isNhanDeBiet = isNhanDeBietProp;
  // logger.log("dataDetail", dataDetail);



  const dispatch = useDispatch();
  const {
    users = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
	const { dataUser } = useSelector((state) => state.auth);

	const isUserMain = useMemo(() => {
	  if (!dataUser || !dataDetail) return false;
	  const userId = dataUser?._id || dataUser?.id;
	  const target = dataDetail?.workItem?.assigneeUserId;
	  return target?.includes(userId) || false;
	}, [dataUser, dataDetail]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchKDV] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  const [assignments, setAssignments] = useState({});
  const [initialAssignments, setInitialAssignments] = useState({});
  const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [deadlineError, setDeadlineError] = useState(false); // Track lỗi DatePicker
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // State quản lý việc chỉnh sửa khi Duyệt đề xuất
  const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
   
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

  const isDisabledInteraction = canConfirmPropose && availableActionsType === 'confirmPropose' && !isEditMode;

  const { control, handleSubmit, reset, watch, setError, clearErrors, getValues, formState: { errors } } = useForm({
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



  const fetchData = useCallback(async () => {
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
      await Promise.all([
        dispatch(fetchUsers({ body: bodyUser })),
        dispatch(fetchOrganizationUnits({ body: bodyUser })),
      ]);
    } catch (error) {
      toast("Lỗi khi load dữ liệu", "error");
    }
  }, [docIds, dispatch, targetRole, dataDetail, toast, userId]);

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
    if (!xuLyChinhHandler) return new Set();
    return new Set(xuLyChinhHandler.users || []);
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
        if (result) {
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
          logger.log('getFormDataForUpdate trả về null');
        }
      } else {
        logger.log('Bỏ qua fetchDataUpdate vì:', { isUpdate, hasGetFormDataForUpdate: !!getFormDataForUpdate });
      }
    } catch (error) {
      logger.error('Lỗi trong fetchDataUpdate:', error);
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
      throw error;
    }
  }, [isUpdate, isView, getFormDataForUpdate, dispatch, toast]);


  const onSubmit = useCallback(
    async (data) => {
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
        const chiDao = {
          users: list
            .filter((a) => a.chiDao && a.unitType === "user")
            .map((a) => a.id),
          organizationUnits: list
            .filter((a) => a.chiDao && a.unitType === "company")
            .map((a) => a.id),
        };

        const nhanDeBietSelection = {
          users: list
            .filter((a) => a.nhanDeBiet && a.unitType === "user")
            .map((a) => a.id),
          organizationUnits: list
            .filter((a) => a.nhanDeBiet && a.unitType === "company")
            .map((a) => a.id),
        };

        const formVals = typeof getValues === 'function' ? getValues() : data;

        const findDynamicDeadline = (prefix) => {
          const directVal = formVals[prefix];
          if (directVal) return directVal;
          const dynamicKey = Object.keys(formVals).find(k => k.startsWith(`${prefix}_`) && formVals[k]);
          return dynamicKey ? formVals[dynamicKey] : null;
        };

        const actualDeadlineChiDao = findDynamicDeadline("deadlineChiDao");
        const actualDeadlinePhoi = findDynamicDeadline("deadlinePhoi");
        const actualDeadlineNhanDeBiet = findDynamicDeadline("deadlineNhanDeBiet");

        const buildSubAssignment = (type, key, deadline) => {
          const users = list
            .filter((a) => a[type] && a.unitType === "user")
            .map((a) => a.id);
          const organizationUnits = list
            .filter((a) => a[type] && a.unitType === "company")
            .map((a) => a.id);

          if (users.length === 0 && organizationUnits.length === 0) return null;

          const deadlineWithTime = deadline
            ? dayjs(deadline)
              .hour(dayjs().hour())
              .minute(dayjs().minute())
              .second(dayjs().second())
              .millisecond(dayjs().millisecond())
              .toISOString()
            : null;

          return {
            subActionCode: actionCodeMap[key] || null,
            users,
            organizationUnits,
            deadline: deadlineWithTime,
          };
        };

        const newAssignments = [
          buildSubAssignment("chiDao", "xuLyChinh", actualDeadlineChiDao),
          buildSubAssignment("phoi", "phoiHop", actualDeadlinePhoi),
          buildSubAssignment("nhanDeBiet", "nhanDeBiet", actualDeadlineNhanDeBiet),
        ].filter(Boolean);

        const deadlineWithTime = actualDeadlineChiDao
          ? dayjs(actualDeadlineChiDao)
            .hour(dayjs().hour())
            .minute(dayjs().minute())
            .second(dayjs().second())
            .millisecond(dayjs().millisecond())
            .toISOString()
          : null;

        const deadlineNhanDeBietWithTime = actualDeadlineNhanDeBiet
          ? dayjs(actualDeadlineNhanDeBiet)
            .hour(dayjs().hour())
            .minute(dayjs().minute())
            .second(dayjs().second())
            .millisecond(dayjs().millisecond())
            .toISOString()
          : null;

        const baseBody = {
          note: data.note,
          deadline: deadlineWithTime,
          userId,
          isAuthority: authority,
          roles: targetRole,
          actionCode
        };

        const specificBody = isNhanDeBietAction
          ? {
            ...(nhanDeBietSelection.users.length > 0 || nhanDeBietSelection.organizationUnits.length > 0
              ? {
                assignments: [
                  {
                    users: nhanDeBietSelection.users,
                    organizationUnits: nhanDeBietSelection.organizationUnits,
                    deadline: deadlineNhanDeBietWithTime || deadlineWithTime, // Ưu tiên deadlineNhanDeBiet
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
                          .map((a) => a.id),
                        organizationUnits: list
                          .filter((a) => a.chiDao && a.unitType === "company")
                          .map((a) => a.id),
                        deadline: deadlineWithTime,
                      }
                    ]
                  }
                  : {}),

                actionCode: subActionCode,
              }
              : {
                assignToUserId: chiDao.users.length > 0 ? chiDao.users[0] : (list.find(a => a.unitType === "user")?.id || null),
                actionCode: viewAndSupport === false ? actionCodeFromActions : actionCode
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

        const  res =  await axiosInstance.post(endpoint, body);
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
          setReloadData(new Date() * 1);
          toast("Chuyển xử lý thành công", "success");

          if (dataDetail?.flags?.hasNextKySaoY) {
            const kySaoYBody = {
              id: signedCopyFiles?.id,
              assignment: list
                ?.find((a) => a.chiDao && a.unitType === "user")?.id,
              texts: {},
              auto: []
            };
           
            await axiosInstance.post(`${APP_BASE}/api/files/insert-user-info-to-pdf`,kySaoYBody);
          }
        }

      } catch (error) {
        toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
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
      getValues
    ]
  );

  const buildUnitTree = useCallback((units, parentId = null) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(safeUnits, u._id), // Truyền safeUnits thay vì units
        types: "company",
      }));
  }, []);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!users || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits || []);
    const searchUnits = removeVietnameseTones(debouncedSearch || "");

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

    const processUnits = (units, users, parentMatched = false) => {
      return units
        .map((unit) => {
          // Kiểm tra xem unit có match search không
          const unitMatched =
            debouncedSearch && unit.name && removeVietnameseTones(unit.name).includes(searchUnits);

          // Nếu parent đã match hoặc unit hiện tại match, lấy tất cả children
          const shouldIncludeAll = parentMatched || unitMatched;

          const matchedUsers = users?.filter(
            (user) => user?.parent === (unit?._id ?? unit?.id)
          );

          let userNodes = matchedUsers.map((user) => {
            return {
              ...user,
              types: "user",
            };
          });

          // Nếu không có parent/unit match, filter users theo search
          if (debouncedSearch && !shouldIncludeAll) {
            userNodes = userNodes.filter(
              (user) =>
                user.name &&
                removeVietnameseTones(user.name).includes(searchUnits)
            );
          }

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          // Truyền shouldIncludeAll xuống để child units cũng được include
          const childProcessed = processUnits(childUnits, users, shouldIncludeAll);

          const hasRelevantData =
            shouldIncludeAll || userNodes.length > 0 || childProcessed.length > 0;

          if (debouncedSearch && !hasRelevantData) return null;

          // Kiểm tra xem unit có user nào không (bao gồm cả user trong child units)
          const hasUsers =
            userNodes.length > 0 ||
            childProcessed.some((child) => {
              // Kiểm tra xem child có user không
              return child?.child?.some((item) => item.types === "user");
            });

          // Nếu canTransferRoom = false và không có user nào, ẩn phòng ban
          if (!canTransferRoom && !hasUsers) return null;

          return {
            ...unit,
            child: [...userNodes, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

    // searchKDV có thể là string (ID) hoặc object với _id/id
    const kdvId = typeof searchKDV === 'string'
      ? searchKDV
      : (searchKDV?._id || searchKDV?.id);
    const rootUnits = kdvId
      ? filterUnits(organizationTree, kdvId)
      : organizationTree;
    return processUnits(rootUnits, users);
  }, [organizationUnits, users, debouncedSearch, searchKDV, buildUnitTree, canTransferRoom]);

  // Auto-select based on suggesteHandling if isUserMain is true
  useEffect(() => {
    const suggestedHandling =
      dataDetail?.suggestedHandling ||
      dataDetail?.document?.suggesteHandling ||
      [];

    if (!isUserMain || !Array.isArray(suggestedHandling) || suggestedHandling.length === 0 || !users?.length || !(canConfirmPropose && availableActionsType === 'confirmPropose')) return;
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
        suggestedUserIds.forEach((id) => {
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
        });
      }

      // 🏢 Units
      if (Array.isArray(suggestedUnitIds)) {
        suggestedUnitIds.forEach((id) => {
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
        });
      }
    });

    if (Object.keys(newAssignments).length > 0) {
      setAssignments(newAssignments);
      setInitialAssignments(newAssignments);
    }
  }, [isUserMain, dataDetail, users, organizationUnits, canConfirmPropose, availableActionsType]);

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
        selectedUserIds.forEach((id) => {
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
  }, [isDisableProcessorByUserPhanCong, users, organizationUnits, userPhanCongData]);

  // Tự động chọn chiDao khi chỉ có một người dùng trong kết quả
  // CHỈ tự động chọn khi chưa có assignment nào được chọn trước đó
  // KHÔNG tự động chọn khi canTransferRoom = true (cho phép chọn nhiều người)
  useEffect(() => {
    // Nếu canTransferRoom = true hoặc không phải chế độ duyệt đề xuất, không tự động chọn
    if (canTransferRoom || !(canConfirmPropose && availableActionsType === 'confirmPropose')) {
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

    //  Nếu chỉ có một người dùng trong kết quả VÀ chưa có assignment nào
    if (allUsers.length === 1) {
      const user = allUsers[0];
      const userId = user._id || user.id;
      const key = getAssignmentKey(userId);

      const newAssignments = {
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
      };

      setAssignments(newAssignments);
      setInitialAssignments(newAssignments);
    }
    // KHÔNG reset assignments khi có nhiều user - giữ nguyên lựa chọn cũ
  }, [dataMergeUserAndUnit, canTransferRoom, assignments, canConfirmPropose, availableActionsType]);

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
          // Case nhanDeBiet: tự động bỏ tích người TRỰC TIẾP trong phòng ban đó nếu uncheck phòng ban
          if (isNhanDeBiet && type === "nhanDeBiet" && (unitType === "company" || item?.types === "company") && item?.child) {
            item.child.forEach((directChild) => {
              const descendantId = directChild._id || directChild.id;
              const dKey = getAssignmentKey(descendantId);
              if (updated[dKey]) {
                updated[dKey].nhanDeBiet = false;
                if (!updated[dKey].chiDao && !updated[dKey].phoi && !updated[dKey].nhanDeBiet) {
                  delete updated[dKey];
                }
              }
            });
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
                updated[parentId].nhanDeBiet = false;
                if (!updated[parentId].chiDao && !updated[parentId].phoi && !updated[parentId].nhanDeBiet) {
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
          if (typeSe === 'multi-transfer') {
            const currentUnitType = unitType ?? prevAssignment.unitType ?? (item?.types === "user" || item?.type === "user" ? "user" : "company");

            if (currentUnitType === "user") {
              // Nếu là user thì chỉ được chọn 1 người làm xử lý chính
              Object.keys(updatedAssignments)?.forEach((k) => {
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
              parentId: item?.parentId || item?.parent || prevAssignment.parentId,
              chiDao: true,
              phoi: false,
              nhanDeBiet: false,
            };
          } else {
            // chiDao chỉ cho phép chọn duy nhất 1 (luôn uncheck các item khác)
            // TRỪ KHI đang ở chế độ Nhận để biết
            if (!isNhanDeBiet) {
              Object.keys(updatedAssignments)?.forEach((k) => {
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
            }

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

          // Yêu cầu: khi chọn phòng ban thì tự động tích luôn cả người TRỰC TIẾP trong phòng ban đó (khi isNhanDeBiet true)
          // Chỉ lấy user trực tiếp (không đệ quy vào phòng ban con)
          if (isNhanDeBiet && currentUnitType === "company" && item?.child) {
            item.child.forEach((directChild) => {
              if (directChild.types === "user" || directChild.type === "user") {
                const descendantId = directChild._id || directChild.id;
                const dKey = getAssignmentKey(descendantId);
                updatedAssignments[dKey] = {
                  id: descendantId,
                  key: dKey,
                  name: directChild.name || "",
                  code: directChild.code || "",
                  unitType: "user",
                  parentId: directChild.parentId || directChild.parent,
                  chiDao: false,
                  phoi: false,
                  nhanDeBiet: true,
                };
              }
            });
          }
        }

        return updatedAssignments;
      });
    },
    [getUnitName, users, isNhanDeBiet, typeSe]
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
    // Tạo Set các ID đang được chọn để tra cứu nhanh
    const activeIds = new Set(entries.map(([id]) => id));

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

        // Nếu là user và có phòng ban (parentId) đang được chọn, thì ẩn user này đi
        // TRỪ khi isNhanDeBiet = true (vì user được auto-select riêng lẻ cùng phòng ban)
        if (!isNhanDeBiet && item.unitType === "user" && item.parentId && activeIds.has(item.parentId)) {
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
  }, [assignments, getAssignmentRole, rolePriority, isNhanDeBiet]);

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
          parentId: firstUnit.parentId || firstUnit.parent,
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

  const handleCheckAllOfUnit = useCallback((unit, type) => {
    // Không tự động lấy con để check hàng loạt nữa
    const allChildUnits = [];

    setAssignments((prev) => {
      const updatedAssignments = { ...prev };
      const isChecking = !isChecked(unit, type);

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
            updatedAssignments[uKey][type] = false;
            if (!updatedAssignments[uKey].chiDao && !updatedAssignments[uKey].phoi && !updatedAssignments[uKey].nhanDeBiet) {
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
          updatedAssignments[unitKey][type] = false;
          if (!updatedAssignments[unitKey].chiDao && !updatedAssignments[unitKey].phoi && !updatedAssignments[unitKey].nhanDeBiet) {
            delete updatedAssignments[unitKey];
          }
        }
      }

      return updatedAssignments;
    });
  }, [isChecked]);

  const handleCancelCheckAll = useCallback((type) => {
    setAssignments((prev) => {
      if (!type) {
        return {};
      }

      // Chỉ xóa các assignment có type được chỉ định, giữ lại các assignment khác
      const updatedAssignments = {};
      Object.entries(prev || {})?.forEach(([key, assignment]) => {
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
    setInitialAssignments({});
    setSearch("");
    setIsEditMode(false);
    reset();
  };

  return (
    <>
      <StyleDialog open={open} onClose={onClose} fullWidth isheight="95vh">
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
                  <StyledGridContainer container spacing={2}>
                    {/* <StyledGridItemLeft item>
                      <Autocomplete
                        maxLength={1000}
                        placeholder="Tìm kiếm"
                        label="Khối đơn vị"
                        value={searchKDV}
                        onChange={handleSearchKDV}
                        options={organizationUnits}
                        getOptionLabel={(o) => o.name || o.title || ""}
                        size="small"
                      />
                    </StyledGridItemLeft> */}

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
                    canTransferRoom={canTransferRoom}
                    //   handleToggleExpand={handleToggleExpand}
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
                    chiDao={chiDao}
                    actionsBySub={actionsBySub}
                    label={label}
                    isNhanDeBiet={isNhanDeBiet}
                    disableProcessorColumn={isDisableProcessorByUserPhanCong}
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
                  />


                </PanelHeader>
              </StyledContainer>
            </StyledDialogContentMobile>
          </StyleBoxContainer>
          <StyleBoxContainerRight
            $isMobileOrTablet={isMobileOrTablet}
            $showPanel={showRightPanel}
          >
            <StyledDialogTitle>
              <StyledTitleText component="span">
                Danh sách đơn vị/cá nhân được tham gia
              </StyledTitleText>
              {isMobileOrTablet && (
                <Tooltip
                  title={isMobileOrTablet && `Danh sách chọn đơn vị/cá nhân `}
                >
                  <StyledToggleButton onClick={handleTogglePanel} size="small">
                    <SwapHoriz />
                    {/* Danh sách đối tượng */}
                  </StyledToggleButton>
                </Tooltip>
              )}
            </StyledDialogTitle>
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
              availableActionsType={availableActionsType}
              lockedPhanCongIds={lockedPhanCongIds}
              initialAssignments={initialAssignments}
              hasUserPhanCong={hasUserPhanCong}
              isDirectAssign
              enableInlineFooter
            />

          </StyleBoxContainerRight>
        </StyleContainer>
      </StyleDialog>

      <LoadingDialog open={loading || loadingTranfer}>
        <StyledDialogContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </StyledDialogContent>
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
  signedCopyFiles: PropTypes.object,
};

TransferProcess.displayName = "TransferProcess";

export default memo(withSharedComponents(TransferProcess));
