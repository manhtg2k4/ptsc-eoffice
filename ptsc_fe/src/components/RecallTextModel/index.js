import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import sharedComponents from "@components/WrapperComponent";
import { styled } from "@mui/material/styles";
import { SkyBox } from "@styles/SkyStyles";
import {
  StyleBoxFoodterEnd,
  StyledDialogTitle,
  StyledRowBox,
  StyledTitleText,
  StyleDialogBody,
  StyledSendIcon,
  OpinionHeader,
  OpinionTitle,
} from "@styles/DialogDirective";
import {
  StyledDialog,
  StyledDialogContent,
  CancelButton,
  SaveButton,
  CloseIconButton,
} from "@styles/CustomDialog.styles";
import CloseIcon from "@mui/icons-material/Close";
// import { Search } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { removeVietnameseTones } from "@utils/Common/Common";
import TableRecallText from "./components/TableRecallText";
import {
  // fetchDataDoc,
  postRecallDoc,
} from "@redux/slices/RecallText/RecallTextSlice";
import { getSideBarMenu } from "@redux/slices/ManagerMenu/managementMenuSlice";
const RecallDialogBody = styled(StyleDialogBody)(({ theme }) => ({
  padding: theme.spacing(2.5, 4),
  backgroundColor: theme.palette.background.paper,
  gap: theme.spacing(2.5),
}));

const RecallPanel = styled(SkyBox)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  backgroundColor: theme.palette.background.paper,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
}));

const RecallSearchBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(2, 2, 1),
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
  },
}));

const RecallOpinionSection = styled(SkyBox)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
  },
  "& textarea": {
    minHeight: 56,
  },
}));

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getItemId = (item) =>
  item?._id || item?.id || item?.userId || item?.documentId || "";

const uniqueById = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const id = getItemId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function RecallTextModel(props) {
  const {
    sharedComponents,
    open = false,
    delay = 1000,
    onClose = () => {},
    onCloseAppBar = () => {},
    onCloseDialog = () => {},
    dataDetail,
    setReloadData,
    size,
    subActionType,
  } = props;
  const { Input, LoadingDialog, toast } = sharedComponents;
  const dispatch = useDispatch();
  const { users = [], loading } = useSelector((state) => state.user);
  const [content, setContent] = useState("");
  const [assignments, setAssignments] = useState({});
  // const [incommingDocIds, setIncommingDocIds] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);
    return () => clearTimeout(handler);
  }, [search, delay]);
  // const dataOutDocRef = useRef([]);

  const documentData = useMemo(
    () => dataDetail?.document || dataDetail || {},
    [dataDetail]
  );
  const idDocument =
    documentData?.documentId ||
    documentData?._id ||
    documentData?.id ||
    dataDetail?.documentId ||
    dataDetail?._id ||
    dataDetail?.id;
  const authority = documentData?.isAuthority || dataDetail?.isAuthority;

  const resetLocalState = useCallback(() => {
    setAssignments({});
    // setIncommingDocIds([]);
    setContent("");
    setSearch("");
    // dataOutDocRef.current = [];
  }, []);

  useEffect(() => {
    resetLocalState();
  }, [open, resetLocalState]);

  const isChecked = useCallback(
    (item, type) => {
      const id = getItemId(item);
      return assignments[id]?.[type] === true;
    },
    [assignments]
  );

  const handleCheckboxChange = useCallback(
    (item, type, checked) => {
      const id = getItemId(item);
      if (!id) return;

      setAssignments((prev) => {
        if (checked) {
          return { ...prev, [id]: { [type]: true } };
        }
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    },
    []
    // [subActionType]
  );

  useEffect(() => {
    if (!open) return;

    if (users && users.length === 1) {
      const singleUser = users[0];
      const userId = getItemId(singleUser);
      if (!userId) return;

      setAssignments({
        [userId]: { traLai: true },
      });
    } else if (users.length > 1) {
      setAssignments({});
    }
  }, [open, users]);

  const onSubmit = useCallback(async () => {
    if (!idDocument) {
      toast("Không xác định được văn bản cần thu hồi", "error");
      return;
    }

    const selectedIds = Object.keys(assignments);
    if (selectedIds.length === 0) {
      toast("Vui lòng chọn đơn vị/cá nhân cần thu hồi", "warning");
      return;
    }

    const targetKey =
      subActionType === "recallUserReceive"
        ? "knowReceivers"
        : subActionType === "recallCommentUser"
          ? "processors"
          : "receiveUnits";

    try {
      const body = {
        outgoingDocId: idDocument,
        [targetKey]: selectedIds,
        note: content,
      };
      const params = authority ? { isAuthority: authority } : undefined;

      await dispatch(postRecallDoc({ body, params })).unwrap();
      resetLocalState();
      onCloseDialog();
      onCloseAppBar();
      onClose();
      dispatch(getSideBarMenu());
      if (setReloadData) setReloadData(new Date() * 1);
      toast("Thu hồi thành công", "success");
    } catch (error) {
      toast(
        error?.response?.data?.message || error?.message || "Có lỗi xảy ra",
        "error"
      );
    }
  }, [
    authority,
    content,
    dispatch,
    idDocument,
    assignments,
    onClose,
    onCloseAppBar,
    onCloseDialog,
    resetLocalState,
    setReloadData,
    subActionType,
    toast,
  ]);

  const handleClose = useCallback(() => {
    resetLocalState();
    onCloseDialog();
    onClose();
  }, [onClose, onCloseDialog, resetLocalState]);

  const handleChangeContent = (e) => {
    setContent(e.target.value);
  };

  const handleChangeSearch = (e) => {
    setSearch(e.target.value);
  };

  const title = useMemo(() => {
    if (subActionType === "recallUserReceive")
      return "THU HỒI VĂN BẢN CÁ NHÂN NHẬN";
    if (subActionType === "recallCommentUser")
      return "CHỌN CÁ NHÂN XIN Ý KIẾN THU HỒI";
    return "CHỌN ĐƠN VỊ NHẬN THU HỒI";
  }, [subActionType]);

  const tableHeader = useMemo(() => {
    return "Phòng ban";
  }, []);

  const dataDepartment = useMemo(() => {
    let list = [];
    if (subActionType === "recallUserReceive") {
      list = safeArray(documentData.knowReceivers);
    } else if (subActionType === "recallCommentUser") {
      list = safeArray(documentData.processor);
      if (!list.length) {
        list = safeArray(documentData.commentUsers);
      }
    } else {
      list = safeArray(documentData.internalReceivingDept);
    }

    const listFilter = uniqueById(list.filter((e) => !e?.isRecall));

    const keyword = removeVietnameseTones(debouncedSearch || "").toLowerCase();
    if (!keyword) return listFilter;

    return listFilter.filter((dept) => {
      const name = removeVietnameseTones(dept?.name || "").toLowerCase();
      const code = removeVietnameseTones(dept?.code || "").toLowerCase();
      const position = removeVietnameseTones(
        dept?.position || ""
      ).toLowerCase();
      return (
        name.includes(keyword) ||
        code.includes(keyword) ||
        position.includes(keyword)
      );
    });
  }, [documentData, debouncedSearch, subActionType]);

  return (
    <>
      <StyledDialog open={open} onClose={handleClose} dialogSize={size}>
        <StyledDialogTitle>
          <StyledTitleText component="span">{title}</StyledTitleText>
          <CloseIconButton onClick={handleClose} aria-label="close">
            <CloseIcon />
          </CloseIconButton>
        </StyledDialogTitle>
        <RecallDialogBody>
          <RecallPanel>
            <RecallSearchBox>
              <Input
                size="small"
                fullWidth
                placeholder="Tìm kiếm đơn vị, cá nhân..."
                value={search}
                onChange={handleChangeSearch}
              />
            </RecallSearchBox>
            <TableRecallText
              data={dataDepartment}
              isChecked={isChecked}
              handleCheckboxChange={handleCheckboxChange}
              label={tableHeader}
              customHeight="300px"
              customMinHeight="300px"
            />
          </RecallPanel>

          <RecallOpinionSection>
            <OpinionHeader>
              <StyledSendIcon />
              <OpinionTitle>Lý do thu hồi</OpinionTitle>
            </OpinionHeader>

            <Input
              fullWidth
              multiline
              rows={3}
              value={content}
              onChange={handleChangeContent}
              placeholder="Nhập nội dung trả lại tại đây..."
            />
          </RecallOpinionSection>
        </RecallDialogBody>
        <StyleBoxFoodterEnd>
          <StyledRowBox>
            <CancelButton onClick={handleClose}>HỦY</CancelButton>
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

RecallTextModel.displayName = "RecallTextModel";

export default memo(sharedComponents(RecallTextModel));
