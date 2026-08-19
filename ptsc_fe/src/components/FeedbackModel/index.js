import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
// import PropTypes from "prop-types";
import sharedComponents from "@components/WrapperComponent";
import {
  PanelHeader,
  StyleDialogBody,
  StylePanel,
  StyleBoxFoodterEnd,
  // StyleContainer,
  StyledDialogTitle,
  StyledGridContainer,
  StyledRowBox,
  StyledSearchContainer,
  StyledSendIcon,
  StyledTitleText,
  OpinionHeader,
  OpinionTitle,
} from "@styles/DialogDirective";
import {
  StyledDialog,
  StyledDialogContent,
  SaveButton,
  CancelButton,
  CloseIconButton,
} from "@styles/CustomDialog.styles";
import CloseIcon from "@mui/icons-material/Close";
import RenderTableTree from "./RenderTableTreeFeedback";
import axiosInstance from "@utils/axiosInstance";
import { API_GIVE_FEEDBACK } from "@EnvironmentFile/constants/ulrConfigNew";
import { removeVietnameseTones } from "@utils/Common/Common";
import {
  fetchOrganizationUnits,
  fetchUsers,
} from "@redux/slices/Directive/Directive";
import { useDispatch, useSelector } from "react-redux";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
import { Grid } from "@mui/material";

// import { a } from "framer-motion/dist/types.d-Cjd591yU";

function FeedbackModel(props) {
  const {
    sharedComponents,
    open = false,
    delay = 1000,
    label,
    onClose = () => { },
    onCloseAppBar = () => { },
    onCloseDialog = () => { },
    docId,
    dataDetail,
    size = "md",
    setReloadData = () => { },
    targetRole,
    showIcon = true, // Default to true as per mockup
  } = props;
  const {Input, LoadingDialog, toast } = sharedComponents;
  const {
    users = [],
    organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
  const { dataUser } = useSelector((state) => state.auth);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  const [searchKDV] = useState("");
  const [note, setNote] = useState("");

  const userId = dataUser?._id || dataUser?.id || dataUser?.user?._id;
  const dispatch = useDispatch();
  // const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState({});
  // const docIds = docId
  //   ? [docId]
  //   : // : Array.isArray(selectedFullRows)
  //     //   ? selectedFullRows.map((row) => row.id)
  //     [];
  const workItems = dataDetail?.workItem?.id;

  const docIds = useMemo(() => {
    return docId ? [docId] : [];
  }, [docId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchData = async () => {
    try {
      const type = dataDetail?.availableActions?.find(x => x.type === 'feedback')?.type;
      const bodyUser = {
        documentId: docId.toString(),
        userId,
        roles: targetRole,
        documentType: dataDetail?.document?.isIncomming || dataDetail?.isIncomming
          ? "incomingdocument"
          : "outgoingdocument",
        type: type,
      };
      const isAuthority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority; 
      const params = isAuthority? {isAuthority: true}: undefined;
      await Promise.all([
        dispatch(fetchUsers({body: bodyUser, params})),
        dispatch(fetchOrganizationUnits({body: bodyUser, params})),
      ]);
    } catch (error) {
      logger.error("Lỗi khi load dữ liệu:", error);
      toast("Lỗi khi load dữ liệu", "error");
    }
  };

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

    const processUnits = (units, users, parentMatched = false) => {
      return units
        .map((unit) => {
          // Kiểm tra xem unit hiện tại có match search không
          const unitItselfMatchesSearch =
            debouncedSearch &&
            unit.name &&
            removeVietnameseTones(unit.name).includes(searchUnits);

          // Nếu parent đã match hoặc unit hiện tại match, lấy tất cả children
          const shouldIncludeAll = parentMatched || unitItselfMatchesSearch;

          // Lấy tất cả users thuộc unit này
          const allUsersOfUnit = (users || [])
            .filter((user) => user?.parent === (unit?._id ?? unit?.id))
            .map((user) => ({ ...user, types: "user" }));

          // Nếu shouldIncludeAll, lấy tất cả users
          // Nếu không, chỉ lấy users match search
          const userNodes = shouldIncludeAll
            ? allUsersOfUnit
            : allUsersOfUnit.filter(
              (user) =>
                !debouncedSearch ||
                (user.name &&
                  removeVietnameseTones(user.name).includes(searchUnits))
            );

          const childUnits = Array.isArray(unit.child) ? unit.child : [];
          // Truyền shouldIncludeAll xuống để child units cũng được include
          const childProcessed = processUnits(childUnits, users, shouldIncludeAll).filter(
            Boolean
          );

          const hasRelevantData =
            shouldIncludeAll ||
            userNodes.length > 0 ||
            childProcessed.length > 0;

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

          // Nếu không có user nào, ẩn phòng ban
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
      // Nếu đã chọn, thì bỏ chọn (toggle)
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
        [userId]: { xinYkien: true },
      });
      return;
    }
    if (users.length > 1) {
      setAssignments({});
    }
  }, [users]);


  const onSubmit = useCallback(async () => {
    try {
      const assignmentIds = Object.keys(assignments).filter(
        (id) => assignments[id].xinYkien === true
			);
			
      const body = {
        docIds: [docIds?.toString()],
        commanders: assignmentIds,
        note,
				isAuthority: dataDetail?.document?.isAuthority || dataDetail?.isAuthority,
				role: targetRole
			};
			// logger.log("Body gửi phản hồi:", body);
      const res = await axiosInstance.post(
        `${API_GIVE_FEEDBACK}/${workItems}`,
        body
      );
      if (res) {
        setAssignments({});
        onCloseDialog();
        onCloseAppBar();
        setSearch("");
        onClose();
        setNote("");
        dispatch(getSideBarMenu());
        setReloadData(new Date() * 1);
        toast(res?.message || "Chuyển xử lý thành công", "success");
      }
    } catch (error) {
      logger.error("Lỗi khi gửi dữ liệu:", error);
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    }
  }, [
    assignments,
    dispatch,
    docIds,
    note,
    workItems,
    onCloseDialog,
    onCloseAppBar,
    onClose,
    setReloadData,
    toast,
    dataDetail?.document?.isAuthority,
		dataDetail?.isAuthority,
		dataDetail?.availableActions
  ]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleClose = () => {
    onCloseDialog();
    setAssignments({});
    setSearch("");
   };


  const handleChangeNote = useCallback((e) => {
    setNote(e.target.value);
  }, []);


  return (
    <>
      <StyledDialog open={open} onClose={onClose} dialogSize={size}>
        <StyledDialogTitle>
          <StyledTitleText component="span">{label}</StyledTitleText>
          <CloseIconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </CloseIconButton>
        </StyledDialogTitle>
        <StyleDialogBody>
          <StylePanel>
            <PanelHeader>
              <StyledGridContainer container spacing={2}>
                <Grid item xs={12}>
                  <StyledSearchContainer>
                    <Input
                      size="small"
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
                customHeight="380px"
                customMinHeight="380px"
              />
              <br />
                <OpinionHeader>
                  <OpinionTitle>Nội dung xin ý kiến</OpinionTitle>
                </OpinionHeader>
              <Input
                multiline
                placeholder="Nhập nội dung xin ý kiến..."
                rows={4}
                value={note}
                onChange={handleChangeNote}
              />
            </PanelHeader>
          </StylePanel>
        </StyleDialogBody>
        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <CancelButton onClick={handleClose}>
              HỦY
            </CancelButton>
            <SaveButton
              onClick={onSubmit}
              disabled={!assignments || Object.keys(assignments).length === 0}
              startIcon={showIcon ? <StyledSendIcon /> : null}
            >
              XIN Ý KIẾN
            </SaveButton>
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

FeedbackModel.displayName = "FeedbackModel";

export default memo(sharedComponents(FeedbackModel));
