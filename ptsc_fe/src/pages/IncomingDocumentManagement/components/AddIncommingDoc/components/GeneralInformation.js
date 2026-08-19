import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import { Grid, Typography, useMediaQuery, useTheme, Button, Collapse } from "@mui/material";
import { Controller, useWatch } from "react-hook-form";
import Comment from "@components/Comment";
import { FormContainerGeneralInformation } from "@styles/FormList.styles";
import RecipientInfoTable from "./RecipientInfoTable";
import UploadFile from "@components/UploadFile";
import api from "@services/api";
import {
  RecursiveCommentContainer,
  GeneralInfoGridContainer,
  FormGridItem,
  StyledHeaderContent,
  StyledSidebarBox,
  StyleBoxComent,
  StyledViewGridContainer,
  StyledMainColumn,
  StyledSidebarColumn,
  StyledSuggestionColumn,
  SeeMoreToggleButton,
  FadeInGridItem,
  StyledDivider,
  UrgencyBadge,
  StyledIconWrapper,
  AbstractSummaryBox,
  AbstractSummaryContent,
  AbstractSummaryTitle,
  AbstractSummaryText,
  StyledInfoIcon,
  SenderUnitGridItem,
  BoxContainerContentIncommingDoc,
} from "./AddIncommingDoc.styles";

import { useDispatch, useSelector } from "react-redux";
import { fetchDhvbConfig } from "@redux/slices/configSlice";
import {
  getDataListUnit,
  getCommentsByDocument,
  replyToCommentInDocument,
  getDocumentHistory,
} from "@redux/slices/SharedCategory/managementUnitSlice";
import { addCustomSenderUnit, deleteCustomSenderUnit } from "@redux/slices/DocSendingUnitMgmt/DocSendingUnitMgmtSlice";
import {
  API_SO_VANBANDEN_V2,
  API_CUSTOM_SENDER_UNITS,
  API_GET_LIST_UNIT,
  API_GROUP_USERS_IN_DOCUMENT,
} from "@EnvironmentFile/constants/urlConfig";
import CustomComment from "@components/CustomComment";
import { SectionCard } from "@styles/BaseSwiper/BaseSwiper.style";

const getVal = (val, key = "_id") => {
  if (val && typeof val === 'object') return val[key] || "";
  return val || "";
};

const mapDetailToFormValues = (detail) => {
  const doc = detail?.document || detail;
  if (!doc) return {};
  const mapped = {
    ...doc,
    senderUnit: getVal(doc.senderUnit, "_id"),
    receiveMethod: getVal(doc.receiveMethod, "value"),
    privateLevel: getVal(doc.privateLevel, "value"),
    urgencyLevel: getVal(doc.urgencyLevel, "value"),
    documentField: getVal(doc.documentField, "value"),
    toBookCode: doc.toBookCode != null ? String(doc.toBookCode) : "",
    bookDocumentId: (doc.bookDocumentId && typeof doc.bookDocumentId === 'object')
      ? String(doc.bookDocumentId.bookDocumentId || doc.bookDocumentId.book_document_id || doc.bookDocumentId.id || doc.bookDocumentId._id || "")
      : (doc.bookDocumentId ? String(doc.bookDocumentId) : ""),
  };

  // Chỉ set receiverUnit nếu có giá trị, nếu rỗng bỏ qua để form tự handle logic mặc định
  if (doc.receiverUnit) {
    mapped.receiverUnit = doc.receiverUnit;
  }

  return mapped;
};



const GeneralInformation = ({
  control,
  errors,
  sharedComponents,
  isView = false,
  dataDetail,
  dataDetailFull,
  disableReceiverUnitTreeView = false,
  setValue,
  documentId,
  onToggleCertifiedSign,
  onToggleImportant,
  isColumnOfTextToCopy,
  setReloadDoc,
  children,
  mode,
  panelContainerRef,
  isSuggestionOpen = false,
  suggestionInterface = null,
  allowMultipleDelete = false,
}) => {
  const {
    InputComponents: BaseInput,
    DatePicker: BaseDatePicker,
    AsyncAutoCompletes: BaseAsyncAutoCompletes,
    AsyncAutoComplete: BaseAsyncAutoComplete,
    Dialog,
    toast,
  } = sharedComponents;

  // Wrapper components to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={isView} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [isView, BaseInput]);

  const DatePicker = useMemo(() => {
    const Wrapped = withFormWrapper(BaseDatePicker, "date");
    const Component = (props) => <Wrapped {...props} isView={isView} />;
    Component.displayName = "DatePicker";
    return Component;
  }, [isView, BaseDatePicker]);

  const AsyncAutoCompletes = useMemo(() => {
    const Wrapped = withFormWrapper(BaseAsyncAutoCompletes, "asyncSelect");
    const Component = (props) => <Wrapped {...props} isView={isView} />;
    Component.displayName = "AsyncAutoCompletes";
    return Component;
  }, [isView, BaseAsyncAutoCompletes]);

  const AsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(BaseAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} isView={isView} />;
    Component.displayName = "AsyncAutoComplete";
    return Component;
  }, [isView, BaseAsyncAutoComplete]);

  const [refreshSenderUnit, setRefreshSenderUnit] = useState(Date.now());
  const [newlyAddedSenderUnit, setNewlyAddedSenderUnit] = useState(null);

  const receiverUnitValue = useWatch({ control, name: "receiverUnit" });
  const bookDocumentIdValue = useWatch({ control, name: "bookDocumentId" });
  const documentDateValue = useWatch({ control, name: "documentDate" });
  const receiveDateValue = useWatch({ control, name: "receiveDate" });
  // const viewGroupValue = useWatch({ control, name: "viewGroup" });
  const urgencyLevelValue = useWatch({ control, name: "urgencyLevel" });
  // const receiveMethodValue = useWatch({ control, name: "receiveMethod" });

  const [isGeneralExpanded,] = useState(true);
  const [isOpenAttachments, setIsOpenAttachments] = useState(true);
  const handleToggleAttachments = useCallback((open) => {
    setIsOpenAttachments((prev) => (typeof open === "boolean" ? open : !prev));
  }, []);
  const [showAll, setShowAll] = useState(false);
  const toggleShowAll = () => setShowAll((prev) => !prev);
  const [openDialog, setOpenDialog] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(1100));
  // State để điều khiển việc hiển thị ô nhập comment trên mobile
  const [showCommentInput, setShowCommentInput] = useState(false);
  const hasSetDefaultReceiverUnit = useRef(false); // Track đã set mặc định chưa
  const fetchedBookRef = useRef(null);
  const allBooksRef = useRef([]);
  const lastFetchedCommentsIdRef = useRef(null);

  // Chặn gõ các phím không phải số nguyên (e, E, +, -, ., ,)
  const handleNumberKeyDown = useCallback((e) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  }, []);

  // Hàm xử lý thay đổi cho các trường nhập số, lọc bỏ các ký tự không phải số
  const handleNumberInputChange = useCallback(
    (onChange) => (e) => {
      const rawValue = e.target.value ?? "";
      const cleanValue = String(rawValue).replace(/\D/g, "");
      onChange(cleanValue === "" ? "" : parseInt(cleanValue, 10));
    },
    []
  );
  const handleCloseDialog = () => {
    setOpenDialog(false);
    if (setValue) {
      setValue("newUnitCode", "");
      setValue("newUnitName", "");
      setValue("newUnitParent", "");
    }
  };
  const dispatch = useDispatch();
  const { listUnit } = useSelector((state) => state.unit);
  const { crmSource } = useSelector((state) => state.config);
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const { commentsList: comments } = useSelector((state) => state.unit);
  const [bookDocumentOptions, setBookDocumentOptions] = useState([]);
  const { documentHistory } = useSelector((state) => state.unit);
  const [, setReceiverUnitOptions] = useState([]);

  // Hàm định dạng ngày tháng
  const formatVietnameseDate = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleString("vi-VN");
    } catch (error) {
      return isoString;
    }
  };

  // const methodOptions = useMemo(
  //   () => crmSource.find((item) => item.code === "S27")?.data || [],
  //   [crmSource]
  // );
  // const groupOptions = useMemo(
  //   () => crmSource.find((item) => item.code === "NHOMXEMVANBAN")?.data || [],
  //   [crmSource]
  // );
  const urgencyOptions =
    crmSource.find((item) => item.code === "S20")?.data || [];
  const documentTypeOptions =
    crmSource.find((item) => item.code === "S19")?.data || [];

  useEffect(() => {
    if (!isView) {
      dispatch(getDataListUnit({ page: 1, limit: 9999 }));
    }
    dispatch(fetchDhvbConfig());
  }, [dispatch, isView]);

  const updateBookOptions = useCallback((baseOptions) => {
    let options = [...baseOptions];
    const documentData = dataDetail?.document || dataDetail;

    if (documentData && documentData.bookDocumentId && typeof documentData.bookDocumentId === 'object') {
      const detailBook = documentData.bookDocumentId;
      const detailBookId = detailBook.bookDocumentId || detailBook.book_document_id || detailBook.id || detailBook._id;

      const isAlreadyInOptions = options.some(opt => String(opt.bookDocumentId) === String(detailBookId));

      if (detailBookId && !isAlreadyInOptions) {
        const newOption = {
          name: detailBook.name,
          bookDocumentId: String(detailBookId),
          count: detailBook.count,
          "to_book_code": detailBook.to_book_code,
        };
        options = [newOption, ...options];
      }
    }
    setBookDocumentOptions(options);
  }, [dataDetail]);

  useEffect(() => {
    const fetchBookDocuments = async () => {
      if (fetchedBookRef.current === documentId) return;
      fetchedBookRef.current = documentId;
      try {
        const result = await api.get(API_SO_VANBANDEN_V2, {
          params: {
            'type_document': "IncommingDocument",
            processFn: "SoVBden",
          },
        });
        const items = result?.data?.items || [];
        allBooksRef.current = items;
        updateBookOptions(items);
      } catch (error) {
        fetchedBookRef.current = null;
        logger.error("Lỗi khi tải danh sách sổ văn bản:", error);
        updateBookOptions([]);
      }
    };
    fetchBookDocuments();
  }, [documentId, updateBookOptions]);

  useEffect(() => {
    updateBookOptions(allBooksRef.current || []);
  }, [dataDetail, updateBookOptions]);

  // Ensure "Ngay tren van ban" never goes after "Ngay den"
  useEffect(() => {
    if (!setValue || !documentDateValue || !receiveDateValue) return;

    const arrivalDate = dayjs(receiveDateValue);
    const documentOnTextDate = dayjs(documentDateValue);
    if (!arrivalDate.isValid() || !documentOnTextDate.isValid()) return;

    if (documentOnTextDate.isAfter(arrivalDate, "day")) {
      setValue("documentDate", arrivalDate.toDate(), {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [documentDateValue, receiveDateValue, setValue]);

  // Tự động điền Sổ văn bản + Số đến:
  // - Chế độ thêm mới
  // - Hoặc dữ liệu chi tiết không trả về bookDocumentId
  useEffect(() => {
    if (!setValue || bookDocumentOptions.length === 0) return;

    const documentData = dataDetail?.document || dataDetail;
    const detailBookDocumentId =
      documentData?.bookDocumentId && typeof documentData.bookDocumentId === "object"
        ? (documentData.bookDocumentId.book_document_id ||
          documentData.bookDocumentId.id ||
          documentData.bookDocumentId._id)
        : documentData?.bookDocumentId;

    const currentBookDocumentId =
      bookDocumentIdValue && typeof bookDocumentIdValue === "object"
        ? (bookDocumentIdValue.book_document_id ||
          bookDocumentIdValue.bookDocumentId ||
          bookDocumentIdValue.id ||
          bookDocumentIdValue._id)
        : bookDocumentIdValue;

    if (currentBookDocumentId) return;

    const shouldAutoFillDefaultBook = mode === "add" || !detailBookDocumentId;
    if (!shouldAutoFillDefaultBook) return;

    const defaultBook = bookDocumentOptions.find((book) => book?.isDefault === true);
    if (!defaultBook?.bookDocumentId) return;
    setValue("bookDocumentId", defaultBook.bookDocumentId);
    if (defaultBook.count) {
      setValue("toBookCode", String(defaultBook.count), { shouldValidate: true });
    }
  }, [mode, isView, dataDetail, bookDocumentOptions, setValue, bookDocumentIdValue]);

  // Map lại dữ liệu chi tiết từ API sang giá trị phù hợp cho form khi có dataDetail
  useEffect(() => {
    if (dataDetail && setValue) {
      const mapped = mapDetailToFormValues(dataDetail);
      Object.entries(mapped).forEach(([key, value]) => {
        setValue(key, value);
      });

      // Nếu draft có receiverUnit, đánh dấu đã set rồi
      if (mapped.receiverUnit) {
        hasSetDefaultReceiverUnit.current = true;
      }
    }
  }, [dataDetail, setValue]);

  // Set mặc định receiverUnit từ userData trong localStorage - CHỈ CHẠY 1 LẦN
  useEffect(() => {
    if (isView || !setValue) return;

    // Nếu form đã có receiverUnit rồi thì thôi (kể cả do draft map vào)
    if (receiverUnitValue) return;

    const userUnit = authUser?.parent;

    if (userUnit?._id && userUnit?.name) {
      setReceiverUnitOptions([{ _id: userUnit._id, name: userUnit.name }]);

      setValue("receiverUnit", userUnit._id, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [isView, setValue, receiverUnitValue, authUser]);


  useEffect(() => {
    const activeDocId = dataDetail?.document?.documentId || documentId;
    if (!activeDocId) return;

    if (lastFetchedCommentsIdRef.current === activeDocId) return;
    lastFetchedCommentsIdRef.current = activeDocId;

    dispatch(
      getCommentsByDocument({
        documentId: activeDocId,
        type: "incoming",
      })
    );
    dispatch(getDocumentHistory(activeDocId));
  }, [dispatch, dataDetail?.document?.documentId, documentId]);

  // useEffect(() => {
  //   if (documentId) return; // Không tự động điền giá trị mặc định ở màn chỉnh sửa/xem chi tiết
  //   if (!setValue || groupOptions.length === 0) return;

  //   const currentViewGroupValue =
  //     viewGroupValue && typeof viewGroupValue === "object"
  //       ? viewGroupValue?.value
  //       : viewGroupValue;

  //   if (currentViewGroupValue) return;

  //   const defaultViewGroup = groupOptions.find(
  //     (option) => option?.value === "BAN_GIAM_DOC"
  //   );

  //   setValue(
  //     "viewGroup",
  //     defaultViewGroup?.value || "BAN_GIAM_DOC",
  //     { shouldValidate: true }
  //   );
  // }, [groupOptions, setValue, viewGroupValue, documentId]);


  // useEffect(() => {
  //   if (dataDetail?.document?.documentId) {
  //     dispatch(getCommentsByDocument(dataDetail.document.documentId));
  //     dispatch(getDocumentHistory(dataDetail.document.documentId));
  //   }
  // }, [dispatch, dataDetail?.document?.documentId]);

  const handleReplyComment = async (rootCommentId, parentId, replyText) => {
    if (!replyText.trim()) return;
    try {
      const replyData = {
        userId: authUser?._id,
        userName: authUser?.name,
        content: replyText,
      };

      await dispatch(
        replyToCommentInDocument({
          documentId: dataDetail.document.documentId,
          commentId: parentId || rootCommentId,
          replyData,
        })
      ).unwrap();
    } catch (error) {
      logger.error("Lỗi khi gửi trả lời:", error);
    }
  };

  const RecursiveComment = ({ comment, rootCommentId, level = 0 }) => {
    const MAX_LEVEL = 2;
    const onReply = useCallback(
      (replyText, parentId) => {
        handleReplyComment(rootCommentId, parentId, replyText);
      },
      [rootCommentId]
    );

    return (
      <RecursiveCommentContainer key={comment.id} level={level}>
        <Comment
          username={comment.userName}
          content={<Typography variant="body2">{comment.content}</Typography>}
          time={formatVietnameseDate(comment.createdAt)}
          onReply={onReply}
          commentId={comment.id}
          rootCommentId={rootCommentId}
        />
        {level < MAX_LEVEL &&
          Array.isArray(comment.replies) &&
          comment.replies.length > 0 &&
          [...comment.replies]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((reply) => (
              <RecursiveComment
                key={reply.id}
                comment={reply}
                rootCommentId={rootCommentId}
                level={level + 1}
              />
            ))}
      </RecursiveCommentContainer>
    );
  };

  // const handAddSendingUnit = useCallback(() => {
  //   setOpenDialog(true);
  // }, []);

  const handleSenderUnitChange = useCallback(async (val) => {
    // val là string khi người dùng gõ text mới (do freeSolo)
    if (typeof val === 'string' && val.trim() !== '') {
      try {
        const payload = {
          name: val,
          code: val,
          parentId: null,
          isSenderUnit: true
        };
        const result = await dispatch(addCustomSenderUnit(payload)).unwrap();
        if (result?.success) {
          toast("Hệ thống đã tự động lưu đơn vị gửi mới!", "success");
          setRefreshSenderUnit(Date.now());
          // Giữ lại giá trị vừa nhập thay vì reset về rỗng
          if (result?.data?._id) {
            setNewlyAddedSenderUnit({ _id: result.data._id, name: val });
          }
          setValue("senderUnit", result?.data?._id || val, { shouldValidate: true, shouldDirty: true });
        } else {
          setValue("senderUnit", val, { shouldValidate: true, shouldDirty: true });
        }
      } catch (error) {
        setValue("senderUnit", val, { shouldValidate: true, shouldDirty: true });
      }
    }
    // val là object khi người dùng click chọn từ danh sách (do returnObject={true})
    else if (val && typeof val === 'object') {
      // Chỉ lưu chuỗi _id vào form để tránh lỗi Yup validation
      setValue("senderUnit", val._id || val.id || val.value, { shouldValidate: true, shouldDirty: true });
    }
    // val là null khi người dùng clear ô input
    else {
      setValue("senderUnit", null, { shouldValidate: true, shouldDirty: true });
    }
  }, [dispatch, toast, setValue]);

  const handleDeleteSenderUnit = useCallback(async (option) => {
    const id = option._id || option.id;
    await dispatch(deleteCustomSenderUnit(id)).unwrap();
  }, [dispatch]);

  const handleSaveNewUnit = async () => {
    // Lấy giá trị từ form thông qua watch hoặc trực tiếp từ control nếu cần
    const code = control._formValues.newUnitCode;
    const name = control._formValues.newUnitName;
    const parent = control._formValues.newUnitParent;

    if (!name || !code) {
      toast("Vui lòng nhập đầy đủ tên và mã đơn vị!", "error");
      return;
    }

    try {
      const payload = {
        name,
        code,
        parentId: parent || null,
      };

      const result = await dispatch(addCustomSenderUnit(payload)).unwrap();

      if (result?.success) {
        toast("Thêm mới đơn vị gửi thành công!", "success");
        setOpenDialog(false);
        // Reset giá trị sau khi lưu thành công
        if (setValue) {
          setValue("newUnitCode", "");
          setValue("newUnitName", "");
          setValue("newUnitParent", "");
        }
        // Gọi lại API lấy danh sách đơn vị để cập nhật dropdown
        dispatch(getDataListUnit({ page: 1, limit: 9999 }));
      } else {
        toast(result?.message || "Thêm mới đơn vị gửi thất bại!", "error");
      }
    } catch (error) {
      toast(typeof error === 'string' ? error : (error?.message || "Lỗi khi thêm mới đơn vị gửi!"), "error");
    }
  };

  const handleOpenResponeComment = () => {
    setShowCommentInput(true)
  }

  return (
    <FormContainerGeneralInformation>
      <GeneralInfoGridContainer container spacing={2}>
        <FormGridItem item xs={12}>
          <StyledViewGridContainer
            ref={panelContainerRef}
            container
            spacing={2}
            isView={isView}
            isAdd={mode === "add" || mode === "edit"}
            isOverlayContainer={!!panelContainerRef}
          >
            {/* Main Column */}
            <StyledMainColumn
              item
              xs={12}
              lg={isSuggestionOpen ? 4.5 : (isView ? 8.5 : 12)}
              isView={isView}
              isAdd={mode === "add" || mode === "edit"}
              isSuggestionOpen={isSuggestionOpen}
            >
              <BoxContainerContentIncommingDoc isAdd={mode === "add" || mode === "edit"}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isGeneralExpanded ? "16px" : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <StyledIconWrapper>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
                        <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
                        <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
                        <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
                        <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
                      </svg>
                    </StyledIconWrapper>
                    <StyledHeaderContent variant="h6" noWrap isExpanded={isGeneralExpanded} isView={isView}>
                      THÔNG TIN CHUNG
                    </StyledHeaderContent>
                    {isView && (
                      <SeeMoreToggleButton onClick={toggleShowAll}>
                        {showAll ? "Thu gọn" : "Xem thêm"}
                      </SeeMoreToggleButton>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {urgencyLevelValue && (
                      <UrgencyBadge
                        urgencyCode={typeof urgencyLevelValue === 'object' ? urgencyLevelValue?.value : urgencyLevelValue}
                        urgencyLabel={urgencyOptions.find(opt => opt.value === (typeof urgencyLevelValue === 'object' ? urgencyLevelValue?.value : urgencyLevelValue))?.title}
                      >
                        {urgencyOptions.find(opt => opt.value === (typeof urgencyLevelValue === 'object' ? urgencyLevelValue?.value : urgencyLevelValue))?.title || "Bình thường"}
                      </UrgencyBadge>
                    )}
                    {/* {mode !== "add" && (
                        <IconButton onClick={toggleGeneralInfo} size="small">
                          {isGeneralExpanded ? <StyledExpandLessIcon /> : <StyledExpandMoreIcon />}
                        </IconButton>
                      )} */}
                  </div>
                </div>
                {isGeneralExpanded && <StyledDivider />}

                <Collapse in={isGeneralExpanded}>
                  <Grid
                    container
                    spacing={mode === "add" || mode === "edit" ? 3 : 1.5}
                    rowSpacing={mode === "add" || mode === "edit" ? 3.5 : 1.5}
                    columnSpacing={mode === "add" || mode === "edit" ? 3 : 1.5}
                  >
                    {/* ROW 1: SỐ VĂN BẢN, SỔ VĂN BẢN, ĐƠN VỊ NHẬN */}

                    <Grid item xs={12} sm={isView ? 4 : 6} md={4}>
                      <Controller
                        name="bookDocumentId"
                        control={control}
                        render={({
                          field: { value, onChange, ...field },
                        }) => {
                          // const initialBookDocumentId = dataDetail?.bookDocumentId;
                          // CHỈ KHÓA KHI BACKEND ĐÃ CÓ SỐ (ĐÃ VÀO SỔ THẬT SỰ)
                          // const isLocked = isView || initialBookDocumentId != null ;
                          const handleBookChange = (selectedBookId) => {
                            // Gọi hàm onChange gốc để cập nhật giá trị của react-hook-form
                            onChange(selectedBookId);

                            // Tìm sổ văn bản được chọn trong options
                            const selectedBook = bookDocumentOptions.find(
                              (book) => book.bookDocumentId === selectedBookId
                            );
                            // Nếu có, cập nhật trường toBookCode
                            if (selectedBook && selectedBook.count) {
                              setValue("toBookCode", String(selectedBook.count), { shouldValidate: true });
                            }
                          };
                          return (
                            <InputComponents
                              select
                              label="Sổ văn bản"
                              placeholder="Tìm kiếm"
                              options={bookDocumentOptions}
                              customLabel="name"
                              customValue="bookDocumentId"
                              {...field}
                              value={isView ? (dataDetail?.document?.bookDocumentId || dataDetail?.bookDocumentId || value) : value}
                              onChange={handleBookChange}
                              error={!!errors?.bookDocumentId}
                              helperText={errors?.bookDocumentId?.message}
                              required={!isView}
                              disableEndIcon={isView}
                              disabled={isView}
                            />
                          );
                        }}
                      />
                    </Grid>

                    {(!isView || showAll) && (
                      <Grid item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="toBook"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              label="Số văn bản"
                              placeholder="Nhập số văn bản..."
                              {...field}
                              InputLabelProps={{ shrink: true }}
                              error={!!errors?.toBook}
                              disabled={isView}
                              helperText={errors?.toBook?.message}
                              required={!isView}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </Grid>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="receiverUnit"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              select
                              label="Đơn vị nhận"
                              options={isView && typeof field.value === "object" ? [field.value] : listUnit}
                              customLabel="name"
                              customValue="_id"
                              treeView={!disableReceiverUnitTreeView}
                              placeholder="Chọn đơn vị..."
                              {...field}
                              value={
                                typeof field.value === "object"
                                  ? field.value?._id
                                  : field.value
                              }
                              error={!!errors?.receiverUnit}
                              disabled
                              helperText={errors?.receiverUnit?.message}
                              required={!isView}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {/* ROW 2: ĐƠN VỊ GỬI, SỐ ĐẾN */}
                    <SenderUnitGridItem item xs={12} sm={isView ? (showAll ? 4 : 8) : 6} md={isView ? (showAll ? 4 : 8) : 8}>
                      <Controller
                        name="senderUnit"
                        control={control}
                        render={({ field, fieldState: { error } }) => {
                          const getSenderUnitValue = () => {
                            const detailSender = dataDetail?.document?.senderUnit || dataDetail?.senderUnit;
                            const detailSenderId = detailSender?._id || detailSender?.id;

                            if (isView) {
                              return detailSender || field.value;
                            }
                            if (newlyAddedSenderUnit && field.value === newlyAddedSenderUnit._id) {
                              return newlyAddedSenderUnit;
                            }
                            if (typeof field.value === "string" && field.value === detailSenderId) {
                              return detailSender;
                            }
                            return field.value && typeof field.value === "object" ? field.value?._id : field.value;
                          };

                          return (
                            <AsyncAutoCompletes
                              key={`senderUnit-${refreshSenderUnit}`}
                              fullWidth
                              label="Đơn vị gửi"
                              placeholder="Tìm kiếm hoặc nhập mới..."
                              {...field}
                              freeSolo
                              onChange={handleSenderUnitChange}
                              value={getSenderUnitValue()}
                              url={`${API_GET_LIST_UNIT}?isMergeCustom=true&excludeAncestors=true`}
                              queryParam="name"
                              optionLabel="name"
                              optionValue="_id"
                              disabled={isView}
                              error={!!error}
                              helperText={error?.message}
                              required={!isView}
                              returnObject
                              disableEndIcon={isView}
                              labelOnBorder
                              ListboxProps={{ style: { maxHeight: 300 } }}
                              onDeleteOption={!isView}
                              urlDelete={handleDeleteSenderUnit}
                              deleteCondition={(option) => option.isSenderUnit === true}
                            />
                          );
                        }}
                      />
                    </SenderUnitGridItem>

                    {(isView && !showAll) && (
                      <Grid item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="toBook"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              label="Số văn bản"
                              placeholder="Nhập số văn bản..."
                              {...field}
                              InputLabelProps={{ shrink: true }}
                              error={!!errors?.toBook}
                              disabled={isView}
                              helperText={errors?.toBook?.message}
                              required={!isView}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </Grid>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="toBookCode"
                          control={control}
                          render={({ field: { ...restField }, fieldState }) => (
                            <InputComponents
                              label="Số đến"
                              placeholder="Nhập số đến..."
                              {...restField}
                              error={!!fieldState.error}
                              required={!isView}
                              helperText={fieldState.error?.message}
                              disabled
                              readOnly
                              inputProps={{
                                readOnly: true,
                              }}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {/* ROW 3: NGÀY ĐẾN, NGÀY TRÊN VĂN BẢN, HẠN TRẢ LỜI */}
                    <Grid item xs={12} sm={isView ? 4 : 6} md={4}>
                      <Controller
                        name="receiveDate"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            label="Ngày đến"
                            value={field.value || null}
                            onChange={field.onChange}
                            error={!!errors?.receiveDate}
                            disabled={isView}
                            helperText={errors?.receiveDate?.message}
                            required={!isView}
                            restrictFuture
                            disableEndIcon={isView}
                          />
                        )}
                      />
                    </Grid>

                    {(isView && showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="resolutionDeadline"
                          control={control}
                          render={({ field }) => (
                            <DatePicker
                              label="Hạn giải quyết văn bản"
                              value={field.value || null}
                              onChange={field.onChange}
                              error={!!errors?.resolutionDeadline}
                              disabled={isView}
                              helperText={errors?.resolutionDeadline?.message}
                              futureOnly
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    <Grid item xs={12} sm={isView ? 4 : 6} md={4}>
                      <Controller
                        name="documentDate"
                        control={control}
                        render={({ field }) => (
                          <DatePicker
                            label="Ngày trên văn bản"
                            value={field.value || null}
                            onChange={field.onChange}
                            maxDate={receiveDateValue || undefined}
                            error={!!errors?.documentDate}
                            disabled={isView}
                            helperText={errors?.documentDate?.message}
                            required={!isView}
                            restrictFuture
                            disableEndIcon={isView}
                          />
                        )}
                      />
                    </Grid>

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="deadline"
                          control={control}
                          render={({ field }) => (
                            <DatePicker
                              label="Hạn trả lời"
                              value={field.value || null}
                              onChange={field.onChange}
                              error={!!errors?.deadline}
                              disabled={isView}
                              helperText={errors?.deadline?.message}
                              futureOnly
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {/* ROW 4: HẠN GIẢI QUYẾT VĂN BẢN, NHÓM XEM VĂN BẢN, LOẠI VĂN BẢN */}
                    {!isView && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="resolutionDeadline"
                          control={control}
                          render={({ field }) => (
                            <DatePicker
                              label="Hạn giải quyết văn bản"
                              value={field.value || null}
                              onChange={field.onChange}
                              error={!!errors?.resolutionDeadline}
                              disabled={isView}
                              helperText={errors?.resolutionDeadline?.message}
                              futureOnly
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="viewGroup"
                          control={control}
                          render={({ field }) => (
                            <AsyncAutoComplete
                              fullWidth
                              label="Nhóm xem văn bản"
                              placeholder="Tìm kiếm nhóm xem văn bản..."
                              {...field}
                              url={`${API_GROUP_USERS_IN_DOCUMENT}?isDefaultIncoming=true`}
                              queryParam="name"
                              optionLabel="name"
                              optionValue="code"
                              returnObject={false}
                              error={!!errors?.viewGroup}
                              helperText={errors?.viewGroup?.message}
                              disabled={isView}
                              disableEndIcon={isView}
                              required={!isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="documentType"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              select
                              label="Loại văn bản"
                              placeholder="Nhập loại văn bản..."
                              options={documentTypeOptions}
                              customLabel="title"
                              customValue="value"
                              {...field}
                              value={
                                typeof field.value === "object"
                                  ? field.value?.value
                                  : field.value
                              }
                              error={!!errors?.documentType}
                              disabled={isView}
                              helperText={errors?.documentType?.message}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {/* ROW 5: PHƯƠNG THỨC NHẬN, SỐ BẢN, SỐ TRANG, ĐỘ KHẨN */}
                    {/* {(!isView || showAll) && (
                        <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="receiveMethod"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              select
                              label="Phương thức nhận"
                              placeholder="Tìm kiếm"
                              options={methodOptions}
                              customLabel="title"
                              customValue="value"
                              {...field}
                              value={
                                typeof field.value === "object"
                                  ? field.value?.value
                                  : field.value
                              }
                              error={!!errors?.receiveMethod}
                              disabled={isView}
                              helperText={errors?.receiveMethod?.message}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                       )} */}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="copyCount"
                          control={control}
                          render={({ field: { onChange, ...field } }) => (
                            <InputComponents
                              label="Số bản"
                              placeholder="Nhập số bản..."
                              {...field}
                              type="number"
                              error={!!errors?.copyCount}
                              disabled={isView}
                              helperText={errors?.copyCount?.message}
                              onChange={handleNumberInputChange(onChange)}
                              onKeyDown={handleNumberKeyDown}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="pageCount"
                          control={control}
                          render={({ field: { onChange, ...field } }) => (
                            <InputComponents
                              label="Số trang"
                              placeholder="Nhập số trang..."
                              {...field}
                              type="number"
                              error={!!errors?.pageCount}
                              disabled={isView}
                              helperText={errors?.pageCount?.message}
                              onChange={handleNumberInputChange(onChange)}
                              onKeyDown={handleNumberKeyDown}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {(!isView || showAll) && (
                      <FadeInGridItem item xs={12} sm={isView ? 4 : 6} md={4}>
                        <Controller
                          name="urgencyLevel"
                          control={control}
                          render={({ field }) => (
                            <InputComponents
                              select
                              label="Độ khẩn"
                              placeholder="Tìm kiếm"
                              options={urgencyOptions}
                              customLabel="title"
                              customValue="value"
                              {...field}
                              value={
                                typeof field.value === "object"
                                  ? field.value?.value
                                  : field.value
                              }
                              error={!!errors?.urgencyLevel}
                              disabled={isView}
                              helperText={errors?.urgencyLevel?.message}
                              disableEndIcon={isView}
                            />
                          )}
                        />
                      </FadeInGridItem>
                    )}

                    {/* ROW 6: TRÍCH YẾU */}
                    <Grid item xs={12} sm={12}>
                      <Controller
                        name="abstractNote"
                        control={control}
                        render={({ field }) => {
                          if (isView) {
                            return (
                              <AbstractSummaryBox>
                                <StyledInfoIcon />
                                <AbstractSummaryContent>
                                  <AbstractSummaryTitle>TRÍCH YẾU</AbstractSummaryTitle>
                                  <AbstractSummaryText>
                                    {field.value || ""}
                                  </AbstractSummaryText>
                                </AbstractSummaryContent>
                              </AbstractSummaryBox>
                            );
                          }
                          return (
                            <InputComponents
                              label="Trích yếu"
                              placeholder="Nhập trích yếu..."
                              {...field}
                              error={!!errors?.abstractNote}
                              disabled={isView}
                              helperText={errors?.abstractNote?.message}
                              multiline
                              rows={mode === "add" ? 4 : 2}
                              required={!isView}
                              // InputLabelProps={{ shrink: true }}
                              disableEndIcon={isView}
                            />
                          );
                        }}
                      />
                    </Grid>
                  </Grid>
                </Collapse>
              </BoxContainerContentIncommingDoc>

              {/* Khối riêng biệt cho VĂN BẢN ĐÍNH KÈM (Nút Quét/Tải lên và Bảng file) */}
              <Collapse in={isGeneralExpanded}>
                {(!isView) && (
                  <SectionCard withMarginTop={mode === "add"}>
                    <Controller
                      name="fileids"
                      control={control}
                      defaultValue={[]}
                      render={({ field, fieldState }) => (
                        <UploadFile
                          {...field}
                          id="doc-upload-file-edit"
                          label="VĂN BẢN ĐÍNH KÈM"
                          value={field.value}
                          onChange={field.onChange}
                          isView={isView}
                          objectType="incommingdocument"
                          objectId={documentId || null}
                          sharedComponents={sharedComponents}
                          manualUpload={!documentId}
                          documentDetail={dataDetail}
                          documentDetailFull={dataDetailFull}
                          hiddenUploadAndScan={isView}
                          onToggleCertifiedSign={onToggleCertifiedSign}
                          onToggleImportant={onToggleImportant}
                          isColumnOfTextToCopy={isColumnOfTextToCopy}
                          setReloadDoc={setReloadDoc}
                          showDownloadAll={isView}
                          hiddenDownload={mode === "add"}
                          hiddenPreview={mode === "add"}
                          hiddenTitle={false}
                          hiddenToggleIcon={false}
                          useSecondaryLayout
                          hiddenTypeAndSize
                          isCollapsible
                          isOpen={isOpenAttachments}
                          onToggle={handleToggleAttachments}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                          hiddenNeedCertifiedSign={(dataDetail?.document?.bpmnVersion == 'PHUC_DAP_DV_CON' || dataDetail?.bpmnVersion == 'PHUC_DAP_DV_CON')}
                          allowMultipleDelete={allowMultipleDelete}
                        />
                      )}
                    />
                  </SectionCard>
                )}
              </Collapse>

              {isView && (
                <BoxContainerContentIncommingDoc styledMarginTop={16}>
                  {children}
                </BoxContainerContentIncommingDoc>
              )}
              {isView && (
                <BoxContainerContentIncommingDoc styledMarginTop={16}>
                  <RecipientInfoTable
                    data={documentHistory?.history || []}
                    headerTitle="Thông tin luân chuyển"
                    styledTextTransform="uppercase"
                  />
                </BoxContainerContentIncommingDoc>
              )}
            </StyledMainColumn>

            {/* Sidebar Area (View Mode Only) */}
            {isView && !isSuggestionOpen && (
              <StyledSidebarColumn
                item
                xs={12}
                lg={3.5}
                isView={isView}
              >
                <StyledSidebarBox /*styledMarginTop={24}*/>
                  {isMobile && !showCommentInput ? (
                    <Button variant="outlined" onClick={handleOpenResponeComment} fullWidth>
                      Cho ý kiến
                    </Button>
                  ) : (
                    <StyleBoxComent type="incoming">
                      <CustomComment
                        documentId={dataDetail ? dataDetail?.document?.documentId : documentId}
                        comments={comments}
                        type="incoming"
                        autoFocusInput={isMobile && showCommentInput}
                        label="Luồng ý kiến"
                      />
                    </StyleBoxComent>
                  )}
                </StyledSidebarBox>
              </StyledSidebarColumn>
            )}

            {/* Suggestion Interface Column */}
            {isSuggestionOpen && (
              <StyledSuggestionColumn
                item
                xs={12}
                lg={7.5}
              >
                {suggestionInterface}
              </StyledSuggestionColumn>
            )}
          </StyledViewGridContainer>
        </FormGridItem>
      </GeneralInfoGridContainer>

      {/* Dialog thêm đơn vị gửi */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        title="THÊM MỚI ĐƠN VỊ GỬI"
        titleAlign="left"
        type="add"
        onSave={handleSaveNewUnit}
        titleButton="LƯU"
        cancelButtonText="HỦY"
      >
        <Grid container spacing={2}>

          <Grid item xs={12}>
            <Controller
              name="newUnitName"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Tên đơn vị"
                  placeholder="Nhập dữ liệu..."
                  required
                  {...field}
                  error={!!errors?.newUnitName}
                  helperText={errors?.newUnitName?.message}
                />
              )}
            />
          </Grid>
          <Grid item xs={12}>
            <Controller
              name="newUnitCode"
              control={control}
              render={({ field }) => (
                <InputComponents
                  label="Mã đơn vị"
                  placeholder="Nhập dữ liệu..."
                  required
                  {...field}
                  error={!!errors?.newUnitCode}
                  helperText={errors?.newUnitCode?.message}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="newUnitParent"
              control={control}
              render={({ field }) => (
                <AsyncAutoCompletes
                  fullWidth
                  label="Đơn vị cha"
                  placeholder="Tìm kiếm"
                  {...field}
                  url={`${API_CUSTOM_SENDER_UNITS}/all`}
                  queryParam="name"
                  optionLabel="name"
                  optionValue="_id"
                  returnObject={false}
                  error={!!errors?.newUnitParent}
                  helperText={errors?.newUnitParent?.message}
                  ListboxProps={{ style: { maxHeight: 300 } }}
                />
              )}
            />
          </Grid>
        </Grid>
      </Dialog>
    </FormContainerGeneralInformation>
  );
};

GeneralInformation.propTypes = {
  sharedComponents: PropTypes.object.isRequired,
  control: PropTypes.object,
  errors: PropTypes.object,
  documentId: PropTypes.string,
  isView: PropTypes.bool,
  dataDetail: PropTypes.object,
  dataDetailFull: PropTypes.object,
  setValue: PropTypes.func,
  disableReceiverUnitTreeView: PropTypes.bool,
  onToggleCertifiedSign: PropTypes.func,
  onToggleImportant: PropTypes.func,
  isColumnOfTextToCopy: PropTypes.bool,
  setReloadDoc: PropTypes.func,
  panelContainerRef: PropTypes.shape({
    current: PropTypes.instanceOf(typeof Element !== "undefined" ? Element : Object),
  }),
  isSuggestionOpen: PropTypes.bool,
  suggestionInterface: PropTypes.node,
  allowMultipleDelete: PropTypes.bool,
};

// GeneralInformation vẫn dùng HOC để nhận sharedComponents, sau đó truyền xuống UploadFile
export default withSharedComponents(GeneralInformation);
