import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
// import PropTypes from "prop-types";
import sharedComponents from "@components/WrapperComponent";
import {
  PanelHeader,
  StyleBoxContainer,
  StyleBoxFoodterEnd,
  StyleContainer,
  StyledContainer,
  StyledDialogContentMobile,
  StyledDialogTitle,
  StyledGridContainer,
  StyledRowBox,
  StyledSearchContainer,
  StyledTitleText,
} from "@styles/DialogDirective";
import { StyledDialog, StyledDialogContent } from "@styles/CustomDialog.styles";
import RenderTableTree from "./RenderTableTreeTranferFeedback";
import { removeVietnameseTones } from "@utils/Common/Common";
import {
  fetchOrganizationUnits,
  fetchUsers,
} from "@redux/slices/Directive/Directive";
import { useDispatch, useSelector } from "react-redux";
import { postTransferFeedback } from "@redux/slices/TransferFeedback/TransferFeedbackSlice";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { Grid } from "@mui/material";

function TransferFeedback(props) {
  const {
    sharedComponents,
    open = false,
    label,
    onClose = () => { },
    onCloseAppBar = () => { },
    onCloseDialog = () => { },
    docId,
    dataDetail,
    size,
    setReloadData = () => { },
    targetRole,
    keyActions,
    delay = 1000
  } = props;
  const { Button, Input, LoadingDialog, toast } = sharedComponents;
  const {
    users = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchKDV] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  const [note, setNote] = useState("");
  const { dataUser: userProfile } = useSelector((state) => state.auth || {});
  const userId = userProfile?._id;
  const dispatch = useDispatch();
  const [assignments, setAssignments] = useState({});
  const workItems = dataDetail?.workItem?.id;

  const docIds = useMemo(() => {
    return docId ? [docId] : [];
  }, [docId]);


  const fetchData = useCallback(async () => {
    try {
      const bodyUser = {
        documentId: docId.toString(),
        userId,
        roles: targetRole,
        documentType: dataDetail?.document?.isIncomming || dataDetail?.isIncomming
          ? "incomingdocument"
          : "outgoingdocument",
      };
      logger.log("bodyUser", bodyUser);
      await Promise.all([
        dispatch(fetchUsers({body: bodyUser})),
        dispatch(fetchOrganizationUnits({body: bodyUser})),
      ]);
    } catch (error) {
      logger.error("Lỗi khi load dữ liệu:", error);
      toast("Lỗi khi load dữ liệu", "error");
    }
  }, [
    dispatch,
    docId,
    userId,
    targetRole,
    dataDetail?.document?.isIncomming,
    dataDetail?.isIncomming,
    toast
  ]);


  useEffect(() => {
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchData]);

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
  const hasUserInSubTree = (nodes = []) => {
      return nodes.some((node) => {
        if (node?.types === "user") return true;
        if (Array.isArray(node?.child) && node.child.length > 0) {
          return hasUserInSubTree(node.child);
        }
        return false;
      });
    };

    const processUnits = (units, users) => {
      return units
        .map((unit) => {
          // Kiểm tra xem unit có match search không
          const unitItselfMatchesSearch =
            debouncedSearch &&
            unit.name &&
            removeVietnameseTones(unit.name).includes(searchUnits);

          // Lấy users thuộc unit này
          const allUsersOfUnit = (users || [])
            .filter((user) => user?.parent === (unit?._id ?? unit?.id))
            .map((user) => ({ ...user, types: "user" }));

          // Nếu unit match search, lấy tất cả users của nó
          // Nếu không, chỉ lấy users match search
          const userNodes = unitItselfMatchesSearch
            ? allUsersOfUnit
            : allUsersOfUnit.filter(
              (user) =>
                !debouncedSearch ||
                (user.name &&
                  removeVietnameseTones(user.name).includes(searchUnits))
            );

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          const childProcessed = processUnits(childUnits, users).filter(
            Boolean
          );

          const hasRelevantData =
            userNodes.length > 0 ||
            childProcessed.length > 0 ||
            unitItselfMatchesSearch;

          if (!hasRelevantData) {
            return null;
          }

          // const hasUsers =
          //   userNodes.length > 0 ||
          //   childProcessed.some((child) => {
          //     // Kiểm tra xem child có user không
          //     return child?.child?.some((item) => item.types === "user");
          //   });
         const hasUsers = userNodes.length > 0 || hasUserInSubTree(childProcessed);

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
    return processUnits(rootUnits, users);
  }, [users, organizationUnits, buildUnitTree, debouncedSearch, searchKDV]);

  const handleCheckboxChange = useCallback((item, type) => {
    const id = item._id || item.id;
    setAssignments((prev) => {
      if (prev[id]?.[type]) {
        const updated = { ...prev };
        const updatedItem = { ...updated[id] };
        delete updatedItem[type];
        if (Object.keys(updatedItem).length === 0) {
          delete updated[id];
        } else {
          updated[id] = updatedItem;
        }
        return updated;
      }
      return {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [type]: true,
        },
      };
    });
  }, []);


  useEffect(() => {
    if (users && users.length === 1) {
      const singleUser = users[0];
      const userId = singleUser._id || singleUser.id;
      setAssignments({
        [userId]: { chuyenChoYKien: true },
      });
    } else if (users.length > 1) {
      setAssignments({});
    }
  }, [users]);

  const onSubmit = useCallback(async () => {
    try {
      const receiverUserIds = Object.keys(assignments).filter(
        (id) => assignments[id]?.[keyActions] === true
      );
      const body = {
        docIds: docIds,
        receiverUserIds: receiverUserIds,
        workItemId: workItems,
        note,
        isAuthority: dataDetail?.document?.isAuthority || dataDetail?.isAuthority
      };
      const res = await dispatch(postTransferFeedback(body)).unwrap();
      if (res) {
        setAssignments({});
        onCloseDialog();
        onCloseAppBar();
        setSearch("");
        onClose();
        setNote("");
        dispatch(getSideBarMenu());

        setReloadData(new Date() * 1);
        toast(res?.message || "Chuyển cho ý kiến thành công", "success");
      }
    } catch (error) {
      logger.error("Chuyển cho ý kiến thất bại!", error);
      toast(error?.response?.data?.message || "Chuyển cho ý kiến thất bại!", "error");
    }
  }, [
    assignments,
    docIds,
    note,
    workItems,
    onCloseDialog,
    onCloseAppBar,
    onClose,
    setReloadData,
    toast,
    dispatch,
    keyActions,
    dataDetail?.document?.isAuthority,
    dataDetail?.isAuthority,

  ]);


  const handleClose = () => {
    onCloseDialog();
    setAssignments({});
    setSearch("");

  };

  const handleChangeNote = useCallback((e) => {
    setNote(e.target.value);
  }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };


  return (
    <>
      <StyledDialog open={open} onClose={onClose} dialogSize={size}>
        <StyleContainer>
          <StyleBoxContainer>
            <StyledDialogTitle>
              <StyledTitleText component="span">{label}</StyledTitleText>
            </StyledDialogTitle>
            <StyledDialogContentMobile>
              <StyledContainer>
                <PanelHeader>
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
                    data={dataMergeUserAndUnit}
                    assignments={assignments}
                    handleCheckboxChange={handleCheckboxChange}
                    keyActions={keyActions}
                    titleName="Tên đơn vị, cá nhân"
                    titleAction="Chuyển cho ý kiến"
                  />
                  <br />

                  <Input
                    label="Nội dung"
                    multiline
                    rows={4}
                    value={note}
                    onChange={handleChangeNote}
                  />
                </PanelHeader>
              </StyledContainer>
            </StyledDialogContentMobile>
          </StyleBoxContainer>
        </StyleContainer>
        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <Button
              variant="primary"
              onClick={onSubmit}
              disabled={!assignments || Object.keys(assignments).length === 0}
            >
              Gửi
            </Button>
            &emsp;
            <Button variant="error" onClick={handleClose}>
              Đóng
            </Button>
          </StyledRowBox>
        </StyleBoxFoodterEnd>
      </StyledDialog>

      <LoadingDialog open={loading}>
        <StyledDialogContent>
          Đang tải dữ liệu, vui lòng chờ trong giây lát...
        </StyledDialogContent>
      </LoadingDialog>
    </>
  );
}

TransferFeedback.displayName = "TranferFeedback";

export default memo(sharedComponents(TransferFeedback));
