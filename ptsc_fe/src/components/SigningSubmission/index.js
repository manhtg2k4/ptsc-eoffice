import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  StyledDialogTitle,
  StyledTitleText,
  StyledDialogFooter,
  StyledDialogFooterButtons,
} from "@styles/DialogDirective";

import { StyledDialog, StyledDialogContent } from "@styles/CustomDialog.styles";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";
import { useDispatch, useSelector } from "react-redux";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { API_ADD_VANBANDI_DHVB } from "@EnvironmentFile/constants/urlConfig";
import { getKanbanProcessProgress } from "@redux/slices/OutGoingDoc/OutGoingDocSlice";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";
import { fetchUsers, fetchOrganizationUnits } from "@redux/slices/Directive/Directive";
import { flattenUnits } from "@utils/utils";
import { StyledLoadingPopupSignDigital } from "@styles/UploadFile/UploadFile.style";
import { CircularProgress } from "@mui/material";

const SigningSubmission = (props) => {
  const {
    open = false,
    label = "Trình ký",
    sharedComponents,
    onClose = () => {},
    onCloseAppBar = () => {},
    onCloseDialog = () => {},
    docId,
    selectedFullRows,
    dataDetail,
    actionCode,
    targetRole,
    setReloadData = () => {},
    getFormDataForUpdate,
    isUpdate,
    isView,
    mode,
    canSubmitToAllSecretary
  } = props;

  const { toast, Button } = sharedComponents;
  const dispatch = useDispatch();
  const {
    users = [],
    organizationUnits = [],
  } = useSelector((state) => state.user);
  const { dataUser } = useSelector((state) => state.auth);
  const { dataKanbanProcessProgress = [] } = useSelector(
    (state) => state.outGoingDoc
  );

  const userId = dataUser?._id || dataUser?.id || dataUser?.user?._id;
  const documentType =
    dataDetail?.document?.isIncomming || dataDetail?.isIncomming;

  const [loadingTranfer, setLoadingTransfers] = useState(false);
  const [loadingFetchData, setLoadingFetchData] = useState(false);
  const [currentWorkItem, setCurrentWorkItem] = useState(
    dataDetail?.workItem?.id
  );
  const [currentDocId, setCurrentDocId] = useState(docId);

  const authority =
    dataDetail?.document?.isAuthority || dataDetail?.isAuthority;

  const docIds = useMemo(() => {
    return currentDocId
      ? currentDocId
      : Array.isArray(selectedFullRows)
        ? selectedFullRows.map((row) => row.id)
        : [];
  }, [currentDocId, selectedFullRows]);

  // Đồng bộ state với props khi props thay đổi
  useEffect(() => {
    if (docId) {
      setCurrentDocId(docId);
    }
  }, [docId]);

  useEffect(() => {
    if (dataDetail?.workItem?.id) {
      setCurrentWorkItem(dataDetail.workItem.id);
    }
  }, [dataDetail]);

  const fetchData = useCallback(async () => {
    setLoadingFetchData(true);

    try {
      const bodyUser = {
        documentId: docIds?.toString(),
        userId,
        roles: targetRole,
        documentType: documentType ? "incomingdocument" : "outgoingdocument",
        unit: "same",
      };
      const results = await Promise.allSettled([
        dispatch(fetchUsers({ body: bodyUser })).unwrap(),
        dispatch(fetchOrganizationUnits({ body: bodyUser })).unwrap(),
      ]);

      const rejectedResult = results.find(
        (result) => result.status === "rejected"
      );
      if (rejectedResult) {
        throw rejectedResult.reason;
      }
    } catch (error) {
      logger.error("Lỗi khi load dữ liệu:", error);
      toast("Lỗi khi load dữ liệu", "error");
    } finally {
      setLoadingFetchData(false);
    }
  }, [docIds, userId, targetRole, documentType, dispatch, toast]);

  useEffect(() => {
    if (open && canSubmitToAllSecretary && docIds && docIds.length > 0) {
      fetchData();
    }
  }, [open, canSubmitToAllSecretary, docIds, fetchData]);

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

  const hasUserInSubTree = useCallback((nodes = []) => {
    return nodes.some((node) => {
      if (node?.types === "user") return true;
      if (Array.isArray(node?.child) && node.child.length > 0) {
        return hasUserInSubTree(node.child);
      }
      return false;
    });
  }, []);

  const dataMergeUserAndUnit = useMemo(() => {
    if (!canSubmitToAllSecretary) return [];
    if (!users || !organizationUnits) return [];
    const organizationTree = buildUnitTree(organizationUnits || []);

    const processUnits = (units, users) => {
      return units
        .map((unit) => {
          const allUsersOfUnit = (users || [])
            .filter((user) => user?.parent === (unit?._id ?? unit?.id))
            .map((user) => ({ ...user, types: "user" }));

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          const childProcessed = processUnits(childUnits, users).filter(
            Boolean
          );

          const hasRelevantData =
            allUsersOfUnit.length > 0 ||
            childProcessed.length > 0;

          if (!hasRelevantData) {
            return null;
          }

          const hasUsers = allUsersOfUnit.length > 0 || hasUserInSubTree(childProcessed);

          if (!hasUsers) return null;

          return {
            ...unit,
            child: [...allUsersOfUnit, ...childProcessed],
          };
        })
        .filter(Boolean);
    };

    return processUnits(organizationTree, users);
  }, [canSubmitToAllSecretary, users, organizationUnits, buildUnitTree, hasUserInSubTree]);

  useEffect(() => {
    if (!open || !dataDetail?.isDataFromList) return;
    const processCode = dataDetail?.bpmnVersionKey || "";
    const workItemId =
      dataDetail?.workItem?.id ||
      dataDetail?.workItem?.workItemId ||
      dataDetail?.workItemId;
    const targetDocId = currentDocId || docId || dataDetail?.documentId || dataDetail?.id;

    if (!processCode) return;

    dispatch(
      getKanbanProcessProgress({
        processCode,
        workItemId,
        docId: targetDocId,
        ...(authority === true && { isAuthority: true }),
      })
    );
  }, [
    open,
    dataDetail,
    currentDocId,
    docId,
    authority,
    dispatch,
  ]);

  const preselectedUsersFromProcessProgress = useMemo(() => {
    if (!dataDetail?.isDataFromList) return [];

    if (
      !Array.isArray(dataKanbanProcessProgress) ||
      dataKanbanProcessProgress.length === 0
    ) {
      return [];
    }

    const sortedSteps = [...dataKanbanProcessProgress].sort(
      (a, b) => (a?.order || 0) - (b?.order || 0)
    );

    let targetIndex = -1;

    const caseAIdx = sortedSteps.findIndex(
      (step) => step?.curWorkItem === true && step?.completed === false
    );

    if (caseAIdx !== -1 && caseAIdx < sortedSteps.length - 1) {
      targetIndex = caseAIdx + 1;
    } else {
      for (let i = 0; i < sortedSteps.length - 1; i += 1) {
        const cur = sortedSteps[i];
        const next = sortedSteps[i + 1];

        if (
          cur?.curWorkItem === true &&
          cur?.completed === true &&
          next?.curWorkItem === false &&
          next?.completed === false
        ) {
          targetIndex = i + 1;
          break;
        }
      }
    }

    if (targetIndex === -1 && sortedSteps.length > 1) {
      targetIndex = 1;
    }

    if (targetIndex === -1) return [];

    const normalizeUsers = (users = []) => {
      if (!Array.isArray(users)) return [];

      return users
        .map((user) => {
          if (typeof user === "string") {
            return {
              userId: user,
              id: user,
              key: user,
              unitType: "user",
              chiDao: true,
            };
          }

          const id = user?.userId || user?.id || user?._id;
          if (!id) return null;

          return {
            userId: id,
            id,
            key: id,
            name: user?.name || user?.userName || "",
            unitType: "user",
            chiDao: true,
          };
        })
        .filter(Boolean);
    };

    for (let i = targetIndex; i < sortedSteps.length; i += 1) {
      const users = normalizeUsers(sortedSteps[i]?.assigned);

      if (users.length > 0) {
        return users;
      }
    }

    return [];
  }, [dataDetail?.isDataFromList, dataKanbanProcessProgress]);

  const assignedUserIds = useMemo(() => {
    if (canSubmitToAllSecretary) {
      const visibleUsers = flattenUnits(dataMergeUserAndUnit).filter(
        (u) => u.types === "user"
      );
      const ids = visibleUsers
        .map((user) => user._id || user.id)
        .filter(Boolean);
      return [...new Set(ids)];
    }

    const allSelectedUsers = [];

    // 1. Ưu tiên cao nhất: initialPreselectedUsers từ bước đích
    const hasInitialPreselectedUsers =
      Array.isArray(props.initialPreselectedUsers) &&
      props.initialPreselectedUsers.length > 0;

    if (hasInitialPreselectedUsers) {
      allSelectedUsers.push(...props.initialPreselectedUsers);
    } else {
      // 2. Fallback: Check users từ step actionCode hiện tại
      const usersFromCurrentStep =
        actionCode && Array.isArray(props.selectedUsersByStep?.[actionCode])
          ? props.selectedUsersByStep[actionCode]
          : [];

      // 3. Fallback: users từ step signContentDraft đã lưu
      const usersFromSignContentDraft = Array.isArray(
        props.selectedUsersByStep?.signContentDraft
      )
        ? props.selectedUsersByStep.signContentDraft
        : [];

      if (usersFromCurrentStep.length > 0) {
        allSelectedUsers.push(...usersFromCurrentStep);
      } else if (usersFromSignContentDraft.length > 0) {
        allSelectedUsers.push(...usersFromSignContentDraft);
      } else if (preselectedUsersFromProcessProgress.length > 0) {
        allSelectedUsers.push(...preselectedUsersFromProcessProgress);
      } else if (dataDetail) {
        // 4. Fallback cuối: dữ liệu cũ từ dataDetail
        const signContentDraft =
          dataDetail.signContentDraftObject ||
          (actionCode && dataDetail[actionCode]) ||
          dataDetail.signContentDraft ||
          [];
        const normalizedSignContentDraft = Array.isArray(signContentDraft)
          ? signContentDraft
              .map((user) => {
                if (typeof user === "string") {
                  return {
                    userId: user,
                    id: user,
                    key: user,
                    unitType: "user",
                    chiDao: true,
                  };
                }
                const id = user?.userId || user?.id || user?._id;
                return id
                  ? {
                      userId: id,
                      id,
                      key: id,
                      name: user.name || "",
                      unitType: "user",
                      chiDao: true,
                    }
                  : null;
              })
              .filter(Boolean)
          : [];
        allSelectedUsers.push(...normalizedSignContentDraft);
      }
    }

    // Trích xuất các ID duy nhất
    const ids = allSelectedUsers
      .map((user) => user.userId || user.id || user._id)
      .filter(Boolean);
    return [...new Set(ids)];
  }, [
    props.initialPreselectedUsers,
    props.selectedUsersByStep,
    actionCode,
    preselectedUsersFromProcessProgress,
    dataDetail,
    canSubmitToAllSecretary,
    dataMergeUserAndUnit,
  ]);

  // call api cập nhật hoặc tạo mới
  const fetchDataUpdate = useCallback(async () => {
    if ((isUpdate || isView || mode === "add") && getFormDataForUpdate) {
      const result = await getFormDataForUpdate();
      if (!result) return false;

      const {
        body: updateBody,
        hasChanged,
        isCreated,
        newDocId,
        newWorkItem,
      } = result;

      if (isCreated && newDocId) {
        setCurrentDocId(newDocId);
        if (newWorkItem) {
          setCurrentWorkItem(newWorkItem);
        }
        return true;
      }
      
      if (dataDetail?.flags?.reqSignFormatDraft) {
        updateBody.reqSignFormatDraft = dataDetail.flags.reqSignFormatDraft;
      }

      if (hasChanged && (isUpdate || isView)) {
        try {
          await axiosInstance.put(
            `${API_ADD_VANBANDI_DHVB}/${dataDetail?.document?.id || dataDetail?.id}`,
            updateBody
          );
          logger.log("Cập nhật văn bản thành công");
          return true;
        } catch (error) {
          logger.error("Lỗi khi update văn bản:", error);
          toast(
            error?.response?.data?.message ||
              "Có lỗi xảy ra khi cập nhật văn bản",
            "error"
          );
          return false;
        }
      }
    }
    return true;
  }, [isUpdate, isView, mode, getFormDataForUpdate, toast, dataDetail]);

  const onSubmit = useCallback(async () => {
    setLoadingTransfers(true);

    try {
      const updateSuccess = await fetchDataUpdate();
      if (!updateSuccess) {
        setLoadingTransfers(false);
        return;
      }

      if (canSubmitToAllSecretary && assignedUserIds.length === 0) {
        toast("Chưa tải được danh sách văn thư, vui lòng thử lại", "error");
        setLoadingTransfers(false);
        return;
      }

      const userId = dataUser?._id || dataUser?.id || dataUser?.user?._id;

      const body = {
        targetRole,
        docIds: docIds.toString(),
        assignToUserId: assignedUserIds,
        userId,
        actionCode,
        note: "",
        isAuthority: authority,
        canSubmitToAllSecretary,
      };
      logger.log("body", body);

      await axiosInstance.post(
        `${API_PROCCESS_DOCUMENT}/${currentWorkItem}/set-processor`,
        body
      );

      onCloseDialog();
      onCloseAppBar();
      onClose();
      dispatch(getSideBarMenu());
      setReloadData(new Date() * 1);
      toast("Trình ký thành công", "success");
    } catch (error) {
      logger.log("Lỗi khi Trình ký:", error);
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    } finally {
      setLoadingTransfers(false);
    }
  }, [
    docIds,
    dataUser,
    dispatch,
    authority,
    actionCode,
    currentWorkItem,
    canSubmitToAllSecretary,
    fetchDataUpdate,
    onClose,
    onCloseAppBar,
    onCloseDialog,
    setReloadData,
    toast,
    targetRole,
    assignedUserIds
  ]);

  const handleClose = () => {
    onCloseDialog();
    onClose();
  };

  return (
    <>
      <StyledDialog
        open={open}
        onClose={handleClose}
        dialogSize="sm"
        fullWidth
      >
        <StyledDialogTitle>
          <StyledTitleText component="span">{label}</StyledTitleText>
        </StyledDialogTitle>

        <StyledDialogContent>
          <SkyBox mt={2}>
            <SkyTypography isTextAlign>
              <b>Bạn có chắc chắn muốn Trình văn bản không?</b>
            </SkyTypography>
          </SkyBox>
        </StyledDialogContent> 

        <StyledDialogFooter>
          <StyledDialogFooterButtons>
            <Button
              onClick={onSubmit}
              variant="primary"
            >
              Trình văn bản
            </Button>
            <Button variant="error" onClick={handleClose}>
              Hủy
            </Button>
          </StyledDialogFooterButtons>
        </StyledDialogFooter>
				{(loadingTranfer || (canSubmitToAllSecretary && loadingFetchData)) &&
					<StyledLoadingPopupSignDigital>
						<CircularProgress />
					</StyledLoadingPopupSignDigital>
				}
      </StyledDialog>
    </>
  );
};

SigningSubmission.propTypes = {
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
  selectedMultiple: PropTypes.bool,
  initialPreselectedUsers: PropTypes.array,
  selectedUsersByStep: PropTypes.object,
  canSubmitToAllSecretary: PropTypes.bool,
};

SigningSubmission.displayName = "SigningSubmission";

export default memo(withSharedComponents(SigningSubmission));
