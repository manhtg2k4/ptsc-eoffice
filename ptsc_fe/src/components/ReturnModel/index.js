/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import sharedComponents from "@components/WrapperComponent";
import { styled } from "@mui/material/styles";
import { SkyBox } from "@styles/SkyStyles";
import {
  StyleDialogBody,
  StyleBoxFoodterEnd,
  StyledDialogTitle,
  StyledRowBox,
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
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import { useDispatch, useSelector } from "react-redux";
import {
  // fetchOrganizationUnits,
  fetchUsersReturn,
} from "@redux/slices/Directive/Directive";
import CloseIcon from "@mui/icons-material/Close";
import RenderTableTree from "./RenderTableTree";
import axiosInstance from "@utils/axiosInstance";
import { API_PROCCESS_DOCUMENT } from "@EnvironmentFile/constants/ulrConfigNew";
import { removeVietnameseTones } from "@utils/Common/Common";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";

const ReturnDialogBody = styled(StyleDialogBody)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: theme.palette.background.paper,
  gap: theme.spacing(2),
}));

const ReturnPanel = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: theme.palette.background.paper,
}));

const ReturnPanelHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(1.25, 1.75),
  backgroundColor: "#f5f8fc",
  borderBottom: `1px solid ${theme.palette.divider}`,
  color: theme.palette.primary.main,
  fontWeight: 700,
  fontSize: 14,
  "& svg": {
    fontSize: 18,
  },
}));

const SearchBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(1.5, 1.5, 1),
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
  },
}));

const OpinionSection = styled(SkyBox)(({ theme }) => ({
  paddingTop: theme.spacing(0.5),
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
  },
}));

const getFirstVisibleUser = (nodes) => {
  if (!nodes || !Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node.types === "user" || node.type === "user") {
      return node;
    }
    if (node.child && Array.isArray(node.child)) {
      const found = getFirstVisibleUser(node.child);
      if (found) return found;
    }
  }
  return null;
};

// const buildUnitTree = (units, parentId = null) => {
//   const safeUnits = Array.isArray(units) ? units : [];

//   return safeUnits
//     ?.filter((u) => u.parent === parentId)
//     .map((u) => ({
//       ...u,
//       child: buildUnitTree(safeUnits, u._id),
//       types: "company",
//     }));
// };

function ReturnModel(props) {
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
    setReloadData,
    targetRole,
    codeBySubTab,
    actionCode,
    size,
    priority,
  } = props;
  const { Input, LoadingDialog, toast } = sharedComponents;
  const dispatch = useDispatch();
  const {
    usersReturn = [],
    // organizationUnits = [],
    loading,
  } = useSelector((state) => state.user);
  const { dataUser } = useSelector((state) => state.auth);
  // logger.log("users", users);
  const [content, setContent] = useState("");
  const userId = dataUser?._id || dataUser?.id || dataUser?.user?._id;
  // const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState({});
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (open) {
      hasAutoSelected.current = false;
    }
  }, [open]);

  const authority = dataDetail?.document?.isAuthority || dataDetail?.isAuthority;
  const idDocument = dataDetail?.document?.documentId || dataDetail?.documentId || dataDetail?.id;
  const documentType = dataDetail?.document?.isIncomming || dataDetail?.isIncomming || dataDetail?.isIncomming
    ? "incomingdocument"
    : "outgoingdocument";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // const [searchKDV] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  // const docIds = docId
  //   ? [docId]
  //   : // : Array.isArray(selectedFullRows)
  //     //   ? selectedFullRows.map((row) => row.id)
  //     [];



  const fetchData = useCallback(async () => {
    try {
      const bodyUser = {
        documentId: idDocument?.toString(),
        userId,
        roles: targetRole,
        documentType,
        priority: priority || null,
			};
			const params = authority === true
  				? { isAuthority: true }
  				: undefined;
      await Promise.all([
        dispatch(fetchUsersReturn({body: bodyUser, params})),
        // dispatch(fetchOrganizationUnits({body: bodyUser, params})),
      ]);
    } catch (error) {
      toast("Lỗi khi load dữ liệu", "error");
    }
  }, [documentType, idDocument, targetRole, userId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchData]);

  const isChecked = useCallback(
    (item, type) => {
      const id = item._id || item.id;
      return assignments[id]?.[type] === true;
    },
    [assignments]
  );

  const handleCheckboxChange = useCallback((item, type, checked) => {
    const id = item._id || item.id;

    // tích nhiều ng
    // setAssignments((prev) => ({
    //   ...prev,
    //   [id]: {
    //     ...(prev[id] || {}),
    //     [type]: checked,
    //   },
    // }));

    setAssignments(() => {
      if (!checked) {
        return {};
      }

      return {
        [id]: { [type]: true },
      };
    });
  }, []);

  // // Auto-select khi danh sách chỉ trả về 1 người
  // useEffect(() => {
  //   if (usersReturn && usersReturn.length === 1) {
  //     const singleUser = usersReturn[0];
  //     const userId = singleUser._id || singleUser.id;
  //     setAssignments({
  //       [userId]: { traLai: true },
  //     });
  //   } else if (usersReturn.length > 1) {
  //     setAssignments({});
  //   }
  // }, [usersReturn]);



  const onSubmit = useCallback(async () => {
    if (!content || !content.trim()) {
      toast("Vui lòng nhập lý do trả lại", "error");
      return;
    }
    try {
      const traLais = Object.entries(assignments).find(([value]) => {
        return value;
      });
      const assignToUserId = traLais ? traLais[0] : null;

      const workItem = dataDetail?.workItem;
      const idWorkItem =
        workItem?.assigneeUserId === userId ? workItem?.id : null;

      const body = {
        userId,
        assignToUserId,
        note: content,
        actionCode: codeBySubTab?.toString() || actionCode,
        roles: targetRole,
        isAuthority: authority
      };
      const params = authority === true
  				? { isAuthority: true }
  				: undefined;
      const urlRequest = dataDetail?.document?.isIncomming || dataDetail?.isIncomming
        ? `${API_PROCCESS_DOCUMENT}/${idDocument || docId}/${idWorkItem}/return`
        : `${API_PROCCESS_DOCUMENT}/${idDocument || docId}/${idWorkItem}/return-outgoing`;

      await axiosInstance.post(urlRequest, body, {params});
      setAssignments({});
      onCloseDialog();
      onCloseAppBar();
      onClose();
      dispatch(getSideBarMenu());
      setContent("");
      setReloadData(new Date() * 1);
      toast("Trả lại thành công", "success");
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
    }
  }, [
    assignments,
    dataDetail?.workItem,
    dataDetail?.document?.isIncomming,
    dataDetail?.isIncomming,
    userId,
    content,
    codeBySubTab,
    targetRole,
    idDocument,
    docId,
    onCloseDialog,
    onCloseAppBar,
    onClose,
    dispatch,
    setReloadData,
    toast,
    authority,
  ]);


  // const hasUserInSubTree = (nodes = []) => {
  //     return nodes.some((node) => {
  //       if (node?.types === "user") return true;
  //       if (Array.isArray(node?.child) && node.child.length > 0) {
  //         return hasUserInSubTree(node.child);
  //       }
  //       return false;
  //     });
  //   };

  const dataMergeUserAndUnit = useMemo(() => {
    if (!usersReturn || !Array.isArray(usersReturn)) return [];

    const searchUnits = removeVietnameseTones(debouncedSearch || "").toLowerCase();

    // Map to group units by ID
    const grandParentsMap = new Map(); // grandParentId -> { _id, name, childMap: Map(parentId -> { _id, name, child: [] }), child: [] }
    const directParentsMap = new Map(); // parentId -> { _id, name, child: [] }
    
    usersReturn.forEach((user) => {
      // Check if user name or parentName or grandParentName matches search
      const userMatches = !debouncedSearch || 
        (user.name && removeVietnameseTones(user.name).toLowerCase().includes(searchUnits)) ||
        (user.parentName && removeVietnameseTones(user.parentName).toLowerCase().includes(searchUnits)) ||
        (user.grandParentName && removeVietnameseTones(user.grandParentName).toLowerCase().includes(searchUnits));
      if (!userMatches) return;

      const userNode = {
        ...user,
        types: "user",
      };

      const pId = user.parent;
      const pName = user.parentName;
      const gpId = user.grandParent;
      const gpName = user.grandParentName;

      if (gpId && gpName) {
        if (!grandParentsMap.has(gpId)) {
          grandParentsMap.set(gpId, {
            _id: gpId,
            id: gpId,
            name: gpName,
            types: "company",
            childMap: new Map(),
            child: [],
          });
        }
        const gpNode = grandParentsMap.get(gpId);
        
        if (!gpNode.childMap.has(pId)) {
          gpNode.childMap.set(pId, {
            _id: pId,
            id: pId,
            name: pName,
            types: "company",
            child: [],
          });
        }
        const pNode = gpNode.childMap.get(pId);
        pNode.child.push(userNode);
      } else if (pId && pName) {
        if (!directParentsMap.has(pId)) {
          directParentsMap.set(pId, {
            _id: pId,
            id: pId,
            name: pName,
            types: "company",
            child: [],
          });
        }
        const pNode = directParentsMap.get(pId);
        pNode.child.push(userNode);
      }
    });

    const finalTree = [];

    // Process grandparents
    grandParentsMap.forEach((gpNode) => {
      gpNode.childMap.forEach((pNode) => {
        gpNode.child.push(pNode);
      });
      delete gpNode.childMap;
      if (gpNode.child.length > 0) {
        finalTree.push(gpNode);
      }
    });

    // Process direct parents
    directParentsMap.forEach((pNode) => {
      let isAlreadyAdded = false;
      grandParentsMap.forEach((gpNode) => {
        if (gpNode.child.some((childP) => childP._id === pNode._id)) {
          isAlreadyAdded = true;
        }
      });
      
      if (!isAlreadyAdded && pNode.child.length > 0) {
        finalTree.push(pNode);
      }
    });

    return finalTree;
  }, [usersReturn, debouncedSearch]);

  // Auto-select thằng đầu tiên trong danh sách hiển thị
  useEffect(() => {
    if (!open) return;
    if (hasAutoSelected.current) return;

    const firstVisibleUser = getFirstVisibleUser(dataMergeUserAndUnit);
    if (firstVisibleUser) {
      const firstUserId = firstVisibleUser._id || firstVisibleUser.id;
      setAssignments({
        [firstUserId]: { traLai: true },
      });
      hasAutoSelected.current = true;
    }
  }, [dataMergeUserAndUnit, open]);

  const handleClose = () => {
    onCloseDialog();
    setAssignments({});
    setContent("");
    setSearch("");
  };

  const handleChangeContent = (e) => {
    setContent(e.target.value);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  return (
    <>
      <StyledDialog open={open} onClose={onClose} dialogSize={size}>
        <StyledDialogTitle>
          <StyledTitleText component="span">{label}</StyledTitleText>
          <CloseIconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </CloseIconButton>
        </StyledDialogTitle>
        <ReturnDialogBody>
          <ReturnPanel>
            <ReturnPanelHeader>
              <GroupOutlinedIcon />
              Tên Đơn vị / cá nhân
            </ReturnPanelHeader>
            <SearchBox>
              <Input
                size="small"
                fullWidth
                placeholder="Tìm kiếm đơn vị, cá nhân..."
                onChange={handleSearch}
                value={search}
              />
            </SearchBox>
              <RenderTableTree
                data={dataMergeUserAndUnit}
                isChecked={isChecked}
                handleCheckboxChange={handleCheckboxChange}
                customHeight="300px"
                customMinHeight="300px"
								textHeadCheckbox="Trả lại"
              />
          </ReturnPanel>

          <OpinionSection>
            <OpinionHeader>
              <OpinionTitle>
                Lý do trả lại <span style={{ color: "red" }}>*</span>
              </OpinionTitle>
            </OpinionHeader>
              <Input
                fullWidth
                multiline
                placeholder="Nhập lý do trả lại"
                rows={4}
                value={content}
                onChange={handleChangeContent}
              />
          </OpinionSection>
        </ReturnDialogBody>
        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <CancelButton onClick={handleClose}>
              HUỶ
            </CancelButton>
            <SaveButton
              onClick={onSubmit}
              disabled={!assignments || Object.keys(assignments).length === 0}
            >
              ĐỒNG Ý
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

ReturnModel.displayName = "ReturnModel";

export default memo(sharedComponents(ReturnModel));
