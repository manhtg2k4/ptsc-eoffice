import withSharedComponents from "@components/WrapperComponent";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { styled } from "@mui/material/styles";
import GeneralInformation from "./components/GeneralInformation";
import { useDispatch, useSelector } from "react-redux";
// Import API upload và các action
import {
  addIncomingDocument,
  updateIncomingDocument,
} from "@redux/slices/configSlice";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import api from "@services/api";
import { API_GROUP_USERS_IN_DOCUMENT } from "@EnvironmentFile/constants/urlConfig";

// import ProposedTreatment from './components/ProposedTreatment';
import { useToast } from "@components/common/ToastProvider";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { incomingDocumentSchema } from "@pages/IncomingDocumentManagement/Tab/Reception/constants";
import * as yup from "yup";
import {
  clearSelectedTextCopy,
  clearSelectedImportant,
  getDataIncomingDocumentDraft,
  deleteDataIncomingDocumentDraft,
} from "@redux/slices/IncomingDocument/IncommingDocSlice";
import FormButton from "@components/FormButton";
import LoadingDialog from "@components/LoadingDialog";
import { MAX_DEPTH_LEVEL } from '@variable';
// import Button from '@components/CustomButton';
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { Box, CircularProgress } from "@mui/material";
import { FooterActions, FlexGrowBox } from "@styles/BaseSwiper/BaseSwiper.style";

const StyledSaveButton = styled(Box)(() => ({
  "& .MuiButton-root": {
    backgroundColor: "#0062ac",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    padding: "8px 30px",
    "&:hover": {
      backgroundColor: "#004a82",
      border: "none",
    },
  }
}));


const AddIncommingDoc = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  setReloadData,
  mode = "add",
}) => {
  const {
    // CustomSwipper,
    // CustomTabsWithBadge,
    ButtonOutline,
    TransferProcess,
    SubmitProposal,
  } = sharedComponents;
  const [draftId, setDraftId] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);

  const [dataDetail, setDataDetail] = useState(null);
  const [transferConfig, setTransferConfig] = useState(null);
  const transferSuccessfulRef = useRef(false); // Dùng ref để tracking transfer success (không cần re-render, kiểm tra synchronously)
  // const [tabValue, setTabValue] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const toast = useToast();
  // 	const [selectedTextCopy, setSelectedTextCopy] = useState("");
  // logger.log('selectedTextCopy', selectedTextCopy)
  // const tabs = [ { label: "Thông tin chung" }, { label: "Đề xuất xử lý" } ];
  const dispatch = useDispatch();
  // const { crmSource } = useSelector((state) => state.config);
  const selectedTextCopy = useSelector(
    (state) => state.incommingDoc.selectedTextCopy
  );
  const selectedImportant = useSelector(
    (state) => state.incommingDoc.selectedImportant
  );

  const defaultFormValues = useMemo(() => {
    // const getFirstValue = (code) => crmSource.find(item => item.code === code)?.data?.[0]?.value;
    return {
      toBook: "",
      senderUnit: "",
      bookDocumentId: "",
      documentDate: null,
      receiveDate: mode === "add" ? new Date() : null,
      toBookDate: null,
      receiveMethod: "",
      privateLevel: "",
      urgencyLevel: "",
      documentType: "",
      documentField: "",
      signer: "",
      abstractNote: "",
      secondBook: "",
      fileids: [],
      pageCount: 1,
      copyCount: 1,
      viewGroup: "",
      toBookCode: "",
    };
  }, [mode]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    reset,
    setValue,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(
      incomingDocumentSchema.shape({
        pageCount: yup
          .number()
          .transform((value, originalValue) =>
            String(originalValue).trim() === "" ? null : value
          )
          .nullable()
          .min(0, "Không được nhập số âm"),
        copyCount: yup
          .number()
          .transform((value, originalValue) =>
            String(originalValue).trim() === "" ? null : value
          )
          .nullable()
          .min(0, "Không được nhập số âm"),
      })
    ),
  });

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  useEffect(() => {
    const createDraft = async () => {
      if (!open) return;
      try {
        setLoadingDraft(true);
        const res = await dispatch(getDataIncomingDocumentDraft()).unwrap();
        const data = res?.document || {};

        const updatedData = { ...data };
        if (mode === "add" && !updatedData.receiveDate) {
          updatedData.receiveDate = new Date();
        }

        if (mode === "add" && !updatedData.viewGroup) {
          try {
            const groupRes = await api.get(`${API_GROUP_USERS_IN_DOCUMENT}?isDefaultIncoming=true`);
            const groups = groupRes?.data?.items || groupRes?.data?.data || groupRes?.data || [];
            if (groups && groups.length > 0) {
              updatedData.viewGroup = groups[0];
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error fetching default view group", e);
          }
        }

        const updatedRes = {
          ...res,
          document: updatedData,
        };

        reset(updatedData);
        setDataDetail(updatedRes);
        setDraftId(updatedData.documentId || null);
      } catch (error) {
        logger.log("Lỗi khi tạo bản nháp!", error);
        toast("Lỗi khi tạo bản nháp!", "error");
      } finally {
        setLoadingDraft(false);
      }
    };
    createDraft();
  }, [open, dispatch, toast, reset, mode]);

  // useEffect(() => {
  //   if (open) reset(defaultFormValues);
  // }, [open, reset, defaultFormValues]);

  // const renderTabContent = () => {
  //     switch (tabValue) {
  //         case 0: return <GeneralInformation control={control} errors={errors} setValue={setValue} disableReceiverUnitTreeView />;
  //         case 1: return <ProposedTreatment control={control} errors={errors} />;
  //         default: return null;
  //     }
  // };

  // const handleTabChange = (event, newValue) => setTabValue(newValue);
  const handleDeXuatXuLy = useCallback(() => { }, []);
  const handleChuyenXuLy = useCallback(() => { }, []);

  // --- HÀM SO SÁNH FILE (KO DÙNG ID) ---
  const isFileMatch = useCallback((fileItem, selectedFile) => {
    if (!fileItem || !selectedFile) return false;

    // Lấy rawFile từ fileItem
    const fileToCompare = fileItem.rawFile || fileItem;
    const selectedRawFile = selectedFile.rawFile || selectedFile;

    // Cách 1: So sánh bằng rawFile object (nếu có)
    if (fileToCompare === selectedRawFile) return true;

    // Cách 2: So sánh bằng name + size + lastModified (ổn định nhất)
    const fileName1 = fileToCompare?.name || fileItem?.name || "";
    const fileSize1 = fileToCompare?.size || fileItem?.size || 0;
    const fileTime1 =
      fileToCompare?.lastModified || fileItem?.lastModified || 0;

    const fileName2 = selectedRawFile?.name || selectedFile?.name || "";
    const fileSize2 = selectedRawFile?.size || selectedFile?.size || 0;
    const fileTime2 =
      selectedRawFile?.lastModified || selectedFile?.lastModified || 0;

    return (
      fileName1 === fileName2 &&
      fileSize1 === fileSize2 &&
      fileTime1 === fileTime2
    );
  }, []);

  const onUpdate = useCallback(
    async (data, isDraftUpdate = false) => {
      try {
        // Dữ liệu từ form (data) đã chứa documentId khi bạn load chi tiết
        const documentId = data?._id || data?.documentId || draftId;

        // Helper trích xuất ID
        const getVal = (val, key = "_id") => {
          if (val && typeof val === "object") return val[key] || "";
          return val || "";
        };

        // Đảm bảo các trường string không bị null/undefined và convert number sang string
        const sanitizedData = {
          ...data,
          senderUnit: getVal(data.senderUnit),
          receiverUnit: getVal(data.receiverUnit),
          receiveMethod: getVal(data.receiveMethod, "value"),
          privateLevel: getVal(data.privateLevel, "value"),
          urgencyLevel: getVal(data.urgencyLevel, "value"),
          documentType: getVal(data.documentType, "value"),
          documentField: getVal(data.documentField, "value"),
          viewGroup: getVal(data.viewGroup, "code"),
          toBookCode: data.toBookCode ? String(data.toBookCode) : "",
          toBook: data.toBook ? String(data.toBook) : "",
          secondBook: data.secondBook ? String(data.secondBook) : "",
          signer: data.signer ? String(data.signer) : "",
          abstractNote: data.abstractNote ? String(data.abstractNote) : "",
          documentId,
        };

        // Bỏ fileids khỏi payload để tránh backend tự động nhân đôi file đã đính kèm
        delete sanitizedData.fileids;

        const res = await dispatch(
          updateIncomingDocument(sanitizedData)
        ).unwrap();
        if (!isDraftUpdate) {
          dispatch(clearSelectedTextCopy());
          dispatch(clearSelectedImportant());
          toast("Thêm mới văn bản thành công!", "success");
          onSuccess(); // Gọi hàm onSuccess để đóng form và tải lại bảng
        }
        return res;
      } catch (error) {
        toast(error.message || "Đã có lỗi xảy ra!", "error");
        return null;
      }
    },
    [dispatch, toast, onSuccess, draftId]
  );

  // Logic chuyển xử lý (dùng cho FormButton)
  const getFormDataFromAddDialog = useCallback(async () => {
    // Validate form trước khi thực hiện chức năng (giống button Lưu)
    const isValid = await new Promise((resolve) => {
      handleSubmit(
        () => resolve(true),
        (errs) => {
          const firstErrorKey = Object.keys(errs)[0];
          toast(
            (firstErrorKey && errs[firstErrorKey]?.message) || "Vui lòng kiểm tra lại thông tin!",
            "error"
          );
          resolve(false);
        }
      )();
    });
    if (!isValid) return null;

    // Luôn update bản nháp trước khi chuyển xử lý
    const formData = getValues();
    const result = await onUpdate(formData, true);

    if (result) {
      const documentIdToReturn = result.documentId || formData?._id || formData?.documentId || draftId;

      // --- UPLOAD FILE (giống như onSubmitForm) ---
      const uploadedFileIds = [];
      const { fileids } = formData;

      if (fileids && fileids.length > 0) {
        for (const fileItem of fileids) {
          // Nếu là file tạm (rawFile) -> Upload
          if (fileItem.rawFile) {
            try {
              // Kiểm tra file này có match với selectedTextCopy ko
              const isCertifiedCopyFile = isFileMatch(
                fileItem,
                selectedTextCopy
              );
              const isImportantFile = isFileMatch(
                fileItem,
                selectedImportant
              );
              const resFile = await apiUploadFile(
                fileItem.rawFile,
                "incommingdocument",
                documentIdToReturn,
                {
                  ...(isCertifiedCopyFile && { isCertifiedCopy: true }),
                  ...(isImportantFile && { isImportant: true, "is_important": true }),
                }
              );
              // Lấy ID file trả về
              const uploadedId =
                resFile?.data?._id || resFile?._id || resFile?.id;
              if (uploadedId) uploadedFileIds.push(uploadedId);
            } catch (err) {
              logger.error(`Lỗi upload file ${fileItem.name}`, err);
            }
          }
          // Nếu là file cũ (đã có ID)
          else if (fileItem._id) {
            uploadedFileIds.push(fileItem._id);
          }
        }

        // Cập nhật lại bản ghi với file IDs nếu có
        if (uploadedFileIds.length > 0) {
          const strFileIds = uploadedFileIds.join(",");
          await onUpdate({ ...formData, documentId: documentIdToReturn, fileids: strFileIds }, true);
        }
      }

      // Chuẩn bị fileids dưới dạng chuỗi
      let arrConvertedStringIds = "";
      if (Array.isArray(formData.fileids)) {
        const newFileIds = formData.fileids.filter((file) => file._id);
        const getStringIds = newFileIds.map((file) => file._id);
        arrConvertedStringIds = getStringIds.join(",");
      } else if (typeof formData.fileids === "string") {
        arrConvertedStringIds = formData.fileids;
      }

      return {
        body: {
          ...formData,
          documentId: documentIdToReturn,
          fileids: arrConvertedStringIds
        },
        hasChanged: false, // Vì là bản nháp mới tạo nên luôn coi như chưa thay đổi
        isCreated: true,
        newDocId: documentIdToReturn,
        newWorkItem: result.workItem
      };
    }
    return null;
  }, [getValues, handleSubmit, onUpdate, toast, draftId, isFileMatch, selectedTextCopy, selectedImportant]);

  // --- LOGIC SUBMIT FORM 3 BƯỚC ---
  // Lưu: Nếu có draft thì update, nếu không thì add mới
  const onSubmitForm = useCallback(
    async (data) => {
      try {
        // 1. Tách file tạm ra khỏi data submit
        const { fileids, ...dataToCreate } = data;
        let documentId = data?._id || data?.documentId || draftId;
        let isDraft = !!documentId;
        let resultAdd = null;

        if (!isDraft) {
          // --- BƯỚC 1: TẠO BẢN GHI ---
          // Normalize data trước khi tạo
          const getVal = (val, key = "_id") => {
            if (val && typeof val === "object") return val[key] || "";
            return val || "";
          };

          const payload = {
            ...dataToCreate,
            senderUnit: getVal(dataToCreate.senderUnit),
            receiverUnit: getVal(dataToCreate.receiverUnit),
            receiveMethod: getVal(dataToCreate.receiveMethod, "value"),
            privateLevel: getVal(dataToCreate.privateLevel, "value"),
            urgencyLevel: getVal(dataToCreate.urgencyLevel, "value"),
            documentType: getVal(dataToCreate.documentType, "value"),
            documentField: getVal(dataToCreate.documentField, "value"),
            viewGroup: getVal(dataToCreate.viewGroup, "code"),
          };

          resultAdd = await dispatch(
            addIncomingDocument(payload)
          ).unwrap();
          documentId =
            resultAdd?.data?._id ||
            resultAdd?._id ||
            resultAdd?.data?.documentId ||
            resultAdd?.document?.documentId;
          if (!documentId) {
            throw new Error("Tạo văn bản thành công nhưng không lấy được ID.");
          }
        }

        // Nếu không có file thì xong
        if (!fileids || fileids.length === 0) {
          if (isDraft) {
            await onUpdate({ ...data, documentId });
          } else {
            toast("Thêm mới thành công!", "success");
            onSuccess();
          }
          return;
        }

        // --- BƯỚC 2: UPLOAD FILE (Gán objectId = documentId) ---
        const uploadedFileIds = [];
        for (const fileItem of fileids) {
          // Nếu là file tạm (rawFile) -> Upload
          if (fileItem.rawFile) {
            try {
              // Kiểm tra file này có match với selectedTextCopy ko
              const isCertifiedCopyFile = isFileMatch(
                fileItem,
                selectedTextCopy
              );
              const isImportantFile = isFileMatch(
                fileItem,
                selectedImportant
              );
              const resFile = await apiUploadFile(
                fileItem.rawFile,
                "incommingdocument",
                documentId, // QUAN TRỌNG: Gán vào bản ghi vừa tạo
                {
                  ...(isCertifiedCopyFile && { isCertifiedCopy: true }),
                  ...(isImportantFile && { isImportant: true, "is_important": true }),
                }
              );
              // Lấy ID file trả về
              const uploadedId =
                resFile?.data?._id || resFile?._id || resFile?.id;
              if (uploadedId) uploadedFileIds.push(uploadedId);
            } catch (err) {
              logger.error(`Lỗi upload file ${fileItem.name}`, err);
            }
          }
          // Nếu là file cũ (đã có ID)
          else if (fileItem._id) {
            uploadedFileIds.push(fileItem._id);
          }
        }

        // --- BƯỚC 3: CẬP NHẬT LẠI BẢN GHI (Lưu chuỗi ID file nếu backend cần) ---
        if (uploadedFileIds.length > 0) {
          const strFileIds = uploadedFileIds.join(",");
          await onUpdate({ ...data, documentId, fileids: strFileIds });
        } else {
          await onUpdate({ ...data, documentId });
        }
      } catch (error) {
        toast(error?.response?.data?.message || error?.message || "Đã có lỗi xảy ra!", "error");
      }
    },
    [dispatch, toast, onSuccess, isFileMatch, selectedTextCopy, selectedImportant, onUpdate, draftId]
  );
  // Khi đóng form, nếu có draft thì xóa draft (nhưng không xóa nếu đã chuyển xử lý thành công)
  const handleClose = useCallback(async () => {
    dispatch(clearSelectedTextCopy());
    dispatch(clearSelectedImportant());
    if (draftId && !transferSuccessfulRef.current) {
      try {
        await dispatch(deleteDataIncomingDocumentDraft(draftId)).unwrap();
      } catch (err) {
        logger.error("Lỗi xóa bản nháp", err);
      }
    }
    transferSuccessfulRef.current = false; // Reset flag khi đóng
    onClose();
  }, [draftId, dispatch, onClose]);

  const handleSaveClick = useCallback(() => {
    handleSubmit(onSubmitForm, (errs) => {
      const firstErrorKey = Object.keys(errs)[0];
      toast(
        (firstErrorKey && errs[firstErrorKey]?.message) || "Vui lòng kiểm tra lại thông tin!",
        "error"
      );
    })();
  }, [handleSubmit, onSubmitForm, toast]);

  const handleTransferSuccess = useCallback(() => {
    transferSuccessfulRef.current = true;
  }, []);
  const panelContainerRef = useRef(null);

  // Callback khi FormButton mở TransferProcess/SubmitProposal inline
  const handleOpenInlineTransfer = useCallback((config) => {
    setTransferConfig(config);
  }, []);

  // Đóng inline transfer panel
  const handleCloseInlineTransfer = useCallback(() => {
    setTransferConfig(null);
  }, []);

  // Callback khi chuyển xử lý thành công → đóng cả form thêm mới
  const handleTransferSuccessAndClose = useCallback(() => {
    transferSuccessfulRef.current = true;
    setTransferConfig(null);
    onClose();
  }, [onClose]);

  // Render inline TransferProcess/SubmitProposal tương tự cách ViewIncommingDoc render SuggestTransferProcess
  const renderInlineTransferInterface = useMemo(() => {
    if (!transferConfig) return null;

    const ComponentToRender =
      transferConfig.secType === 'suggestionHandling'
        ? SubmitProposal
        : TransferProcess;

    return (
      <ComponentToRender
        {...transferConfig}
        open
        inline
        isUpdate
        onClose={handleCloseInlineTransfer}
        onCloseDialog={handleCloseInlineTransfer}
        onCloseAppBar={handleTransferSuccessAndClose}
        onTransferSuccess={handleTransferSuccess}
        getFormDataForUpdate={getFormDataFromAddDialog}
        maxDepthLevel={MAX_DEPTH_LEVEL}
      />
    );
  }, [transferConfig, handleCloseInlineTransfer, handleTransferSuccessAndClose, handleTransferSuccess, getFormDataFromAddDialog, SubmitProposal, TransferProcess]);

  return (
    <>
      <CustomSwipper
        key={open ? "add-incoming-doc-open" : "add-incoming-doc-closed"}
        open={open && isReady}
        onClose={handleClose}
        title="Thêm mới tiếp nhận văn bản đến"
        type="add"
        screenType="incoming"
        onDeXuatXuLy={handleDeXuatXuLy}
        onChuyenXuLy={handleChuyenXuLy}
        footer={
          <>
            <FlexGrowBox />
            <FooterActions>
              <FormButton
                dataDetail={dataDetail}
                setReloadData={setReloadData}
                onClose={handleClose}
                mode={mode}
                isUpdate
                getFormDataForUpdate={getFormDataFromAddDialog}
                onTransferSuccess={handleTransferSuccess}
                panelContainerRef={panelContainerRef}
                onOpenInlineTransfer={handleOpenInlineTransfer}
              />
              <StyledSaveButton>
                <ButtonOutline
                  type="button"
                  onClick={handleSaveClick}
                  variant="outlined"
                >
                  LƯU
                </ButtonOutline>
              </StyledSaveButton>
            </FooterActions>
          </>
        }
        hideBackdrop
        noneOverflow
      >
        <div style={{ height: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <GeneralInformation
            control={control}
            errors={errors}
            setValue={setValue}
            disableReceiverUnitTreeView
            isColumnOfTextToCopy
            mode={mode}
            panelContainerRef={panelContainerRef}
            isSuggestionOpen={!!transferConfig}
            suggestionInterface={renderInlineTransferInterface}
            dataDetail={dataDetail}
            allowMultipleDelete
          />
        </div>
      </CustomSwipper>
      <LoadingDialog 
        open={loadingDraft}
        PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', border: 'none' } }}
      >
        <CircularProgress />
      </LoadingDialog>
    </>
  );
};

export default withSharedComponents(AddIncommingDoc);
