/* eslint-disable react-hooks/exhaustive-deps */
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
  StyleScrollRenderTableTree,
} from "@styles/DialogDirective";

import { SwapHoriz } from "@mui/icons-material";
import { Box, Grid, Tooltip, useMediaQuery, useTheme } from "@mui/material";

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

const SuggestTransferProcess = (props) => {
  const {
    open = false,
    delay = 1000,
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
     docIds: docIdsProp,
    typeSe,
    secType,
  } = props;



  const canTransferRoom = canTransferRooms || canTransferRoomProcessor || canTransferRoomSupporter || canTransferRoomViewer;
  // logger.log("canTransferRoom", canTransferRoom);
  const { Input, toast, DatePicker, Button, LoadingDialog } = sharedComponents;

  const { dataUser: userProfile } = useSelector((state) => state.auth || {});
  const dispatch = useDispatch();
  const {
    usersData = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
  logger.log("usersData", usersData)

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
  const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [deadlineError, setDeadlineError] = useState(false); // Track lỗi DatePicker
  const [showRightPanel, setShowRightPanel] = useState(false);
  const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down("md"));
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
    } catch (error) {
      toast("Lỗi khi load dữ liệu", "error");
    }
  }, [docIds, dispatch, targetRole, dataDetail]);

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
      // Lấy body data từ UpdateIncommingDoc nếu có
      if ((isUpdate || isView) && getFormDataForUpdate) {
        const result = getFormDataForUpdate();
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
        // Bước 1: Kiểm tra và update văn bản nếu cần (từ UpdateIncommingDoc)
        // Nếu có isUpdate HOẶC data thay đổi => call updateIncomingDocument trước
        await fetchDataUpdate();

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
          buildSubAssignment("chiDao", "xuLyChinh", data.deadlineChiDao),
          buildSubAssignment("phoi", "phoiHop", data.deadlinePhoi),
          buildSubAssignment("nhanDeBiet", "nhanDeBiet", data.deadlineNhanDeBiet),
        ].filter(Boolean);

        const deadlineWithTime = data.deadlineChiDao
          ? dayjs(data.deadlineChiDao)
            .hour(dayjs().hour())
            .minute(dayjs().minute())
            .second(dayjs().second())
            .millisecond(dayjs().millisecond())
            .toISOString()
          : data.deadline
            ? dayjs(data.deadline)
              .hour(dayjs().hour())
              .minute(dayjs().minute())
              .second(dayjs().second())
              .millisecond(dayjs().millisecond())
              .toISOString()
            : null;

        const apiAction = subActionType === "transferView"
          ? "transferView"
          : (trueCount >= 2 ? "process" : "complete");

        const baseBody = {
          note: data.note,
          deadline: deadlineWithTime,
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
                      .map((a) => a.id),
                    organizationUnits: list
                      .filter((a) => a.chiDao && a.unitType === "company")
                      .map((a) => a.id),
                  }
                ],
                actionCode: subActionCode,
              }
              : {
                assignToUserId: chiDao.users.length > 0 ? chiDao.users[0] : null,
                actionCode: viewAndSupport === false ? actionCodeFromActions : actionCode
              };

        const currentWorkItem = workItems || (Array.isArray(selectedFullRows) && selectedFullRows.length > 0 ? selectedFullRows[0].workItem : null);
        const matchingWorkItem = currentWorkItem &&
          (currentWorkItem.assigneeUserId === userId ||
            currentWorkItem.assigneeUserId === parentId ||
            currentWorkItem.author === author)
          ? currentWorkItem
          : null;

        const idWorkItem = matchingWorkItem?.id;
        const idDocument = Array.isArray(docIds) ? docIds[0] : docIds;
        const endpoint = `${API_PROCCESS_DOCUMENT}/${idDocument}/${idWorkItem}/${apiAction}`;

        const body = {
          ...baseBody,
          ...specificBody,
          documentId: idDocument,
          docIds: Array.isArray(docIds) ? docIds : [idDocument]
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
      subActionType
    ]
  );

  const buildUnitTree = (units, parentId = null) => {
    const safeUnits = Array.isArray(units) ? units : [];

    return safeUnits
      ?.filter((u) => u.parent === parentId)
      .map((u) => ({
        ...u,
        child: buildUnitTree(safeUnits, u._id), // Truyền safeUnits thay vì units
        types: "company",
      }));
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

  const dataMergeUserAndUnit = useMemo(() => {
    if (!mainUsers || !organizationUnits) return [];
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
  const hasUserInSubTree = (nodes = []) => {
      return nodes.some((node) => {
        if (node?.types === "user") return true;
        if (Array.isArray(node?.child) && node.child.length > 0) {
          return hasUserInSubTree(node.child);
        }
        return false;
      });
    };

    const processUnits = (units, currentUsers, parentMatched = false) => {
      return units
        .map((unit) => {
          // Kiểm tra xem unit có match search không
          const unitMatched =
            debouncedSearch && unit.name && removeVietnameseTones(unit.name).includes(searchUnits);

          // Nếu parent đã match hoặc unit hiện tại match, lấy tất cả children
          const shouldIncludeAll = parentMatched || unitMatched;

          const matchedUsers = currentUsers?.filter(
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
          const childProcessed = processUnits(childUnits, currentUsers, shouldIncludeAll);

          const hasRelevantData =
            shouldIncludeAll || userNodes.length > 0 || childProcessed.length > 0;

          if (debouncedSearch && !hasRelevantData) return null;

          // Kiểm tra xem unit có user nào không (bao gồm cả user trong child units)
          // const hasUsers =
          //   userNodes.length > 0 ||
          //   childProcessed.some((child) => {
          //     // Kiểm tra xem child có user không
          //     return child?.child?.some((item) => item.types === "user");
          //   });
          const hasUsers = userNodes.length > 0 || hasUserInSubTree(childProcessed);

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
    return processUnits(rootUnits, mainUsers);
  }, [organizationUnits, mainUsers, debouncedSearch, searchKDV]);

  logger.log("suggestUsers", suggestUsers)
  const dataMergeUserAndUnitSuggest = useMemo(() => {
    if (!suggestUsers || suggestUsers.length === 0 || !organizationUnits) return [];
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

    const processUnits = (units, currentUsers, parentMatched = false) => {
      return units
        .map((unit) => {
          const unitMatched =
            debouncedSearch && unit.name && removeVietnameseTones(unit.name).includes(searchUnits);

          const shouldIncludeAll = parentMatched || unitMatched;

          const matchedUsers = currentUsers?.filter(
            (user) => user?.parent === (unit?._id ?? unit?.id)
          );

          let userNodes = matchedUsers.map((user) => {
            return {
              ...user,
              types: "user",
            };
          });

          if (debouncedSearch && !shouldIncludeAll) {
            userNodes = userNodes.filter(
              (user) =>
                user.name &&
                removeVietnameseTones(user.name).includes(searchUnits)
            );
          }

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          const childProcessed = processUnits(childUnits, currentUsers, shouldIncludeAll);

          const hasRelevantData =
            shouldIncludeAll || userNodes.length > 0 || childProcessed.length > 0;

          if (!hasRelevantData) return null;

          return {
            ...unit,
            child: [...userNodes, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

    const kdvId = typeof searchKDV === 'string'
      ? searchKDV
      : (searchKDV?._id || searchKDV?.id);
    const rootUnits = kdvId
      ? filterUnits(organizationTree, kdvId)
      : organizationTree;
    return processUnits(rootUnits, suggestUsers);
  }, [organizationUnits, suggestUsers, debouncedSearch, searchKDV]);

  // console.log("dataMergeUserAndUnit", dataMergeUserAndUnit);

  // Tự động chọn chiDao khi chỉ có một người dùng trong kết quả
  // CHỈ tự động chọn khi chưa có assignment nào được chọn trước đó
  // KHÔNG tự động chọn khi canTransferRoom = true (cho phép chọn nhiều người)
  useEffect(() => {
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

    const allUsers = getAllUsers(dataMergeUserAndUnit);

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
  }, [dataMergeUserAndUnit, canTransferRoom]);

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
      return assignment.unitType === "user" ? "Chỉ đạo" : "Xử lý chính";
    }
    if (assignment.phoi) return "Phối hợp";
    if (assignment.nhanDeBiet) return "Nhận để biết";
    return "";
  };

  const rolePriority = {
    "Chỉ đạo": 1,
    "Xử lý chính": 2,
    "Phối hợp": 3,
    "Nhận để biết": 4,
  };

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
                  <StyleScrollRenderTableTree customMaxHeight="300px" >
                      <RenderTableTree
                        isMobileOrTablet={isMobileOrTablet}
                        data={dataMergeUserAndUnit}
                        canTransferRoom={canTransferRoom}
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
                      />

                  </StyleScrollRenderTableTree>
                  {/* Suggestion Section - Separate table without checkboxes */}
                  {dataMergeUserAndUnitSuggest && dataMergeUserAndUnitSuggest.length > 0 && (

                    <>
                      <Box mt={1} mb={1}>
                        <StyledTitleText variant="h6" isBold>
                          Gợi ý danh sách đơn vị/cá nhân
                        </StyledTitleText>
                      </Box>
                      <StyleScrollRenderTableTree customMaxHeight="400px"  >

                        <RenderTableTree
                          isMobileOrTablet={isMobileOrTablet}
                          data={dataMergeUserAndUnitSuggest}
                          canTransferRoom={canTransferRoom}
                          isChecked={isChecked}
                          assignments={assignments}
                          handleCheckboxChange={handleCheckboxChange}
                          onCheckAll={handleCheckAll}
                          onCancelCheckAll={handleCancelCheckAll}
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
                        />
                      </StyleScrollRenderTableTree>
                    </>
                  )}
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
              Button={Button}
              onCloseDialog={handleClose}
              getRoleColor={getRoleColor}
              handleSubmit={handleSubmit(onSubmit)}
              control={control}
              deadlineError={deadlineError}
              isSuggestion={secType === "suggestion"}
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

SuggestTransferProcess.propTypes = {
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
};

SuggestTransferProcess.displayName = "SuggestTransferProcess";

export default memo(withSharedComponents(SuggestTransferProcess));
