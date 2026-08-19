// File: src/components/AddArchiveStorage/index.jsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  styled,
  Box,
  Typography,
  IconButton,
  Paper,
  Button,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import ArchiveScopeDropdown from "./ArchiveScopeDropdown";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";
import * as XLSX from "xlsx";
import { API_STORAGE_DOT_MANAGEMENT, API_UPLOAD_FILESS, APP_BASE } from "@EnvironmentFile/constants/urlConfig";

// ── Styled Components ──
const FormContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  // minHeight: "100vh",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "#E0E0E0"}`,
  borderRadius: theme.spacing(1),
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 2px 4px rgba(0,0,0,0.3)"
      : "0 2px 4px rgba(0,0,0,0.08)",
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(2),
  },
}));

const CardHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(3),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: theme.spacing(2),
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "16px",
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));

const SectionTitleStatus = styled(Typography)(() => ({
  fontSize: "14px",
  color: "text.secondary",
}));

const SectionBoxIconButton = styled(IconButton)(() => ({
  color: "#0066CC",
}));

const SectionDelete = styled(DeleteIcon)(() => ({
  fontSize: "big",
}));

const SectionBoxTop = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const SectionAttachFileIcon = styled(AttachFileIcon)(() => ({
  color: "#0066CC",
  fontSize: "24px",
  cursor: "pointer",
  "&:hover": {
    opacity: 0.7,
  },
}));

const HiddenFileInput = styled("input")({
  display: "none",
});

const SectionIconButton = styled(IconButton)(({ theme }) => ({
  color: "#d32f2f",
  "&:hover": {
    backgroundColor: "rgba(211, 47, 47, 0.04)",
  },
  "&.Mui-disabled": {
    color: theme.palette.action.disabled,
  },
}));

const StatusBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    justifyContent: "space-between",
  },
}));

const RecordRowGrid = styled(Grid)(() => ({
  alignItems: "stretch",
}));

const SectionSTTVisible = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  height: "22px",
  visibility: "visible",
}));

const SectionSTTHidden = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: theme.spacing(1),
  height: "22px",
  visibility: "hidden",
}));

const ActionIconDescriptionIcon = styled(DescriptionIcon)(() => ({
  color: "#0066CC",
  fontSize: 20,
  mr: 0.5,
}));

const SectionSTTBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.mode === "dark" ? theme.palette.divider : "rgba(0, 0, 0, 0.23)"}`,
  borderRadius: theme.spacing(1),
  textAlign: "center",
  backgroundColor: theme.palette.background.paper,
  minHeight: "41px",
  minWidth: "60px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  color: theme.palette.text.primary,
  "&:hover": {
    borderColor:
      theme.palette.mode === "dark"
        ? theme.palette.text.primary
        : "rgba(0, 0, 0, 0.87)",
  },
  [theme.breakpoints.down("sm")]: {
    minWidth: "50px",
    minHeight: "36px",
    fontSize: "14px",
  },
}));

const SectionBoxRecord = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}));

const SectionBoxRecordWithBorder = styled(Box)(() => ({
  //   borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StatusButton = styled(Button)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === "dark" ? theme.palette.grey[700] : "#E0E0E0",
  color: theme.palette.mode === "dark" ? theme.palette.grey[300] : "#666",
  textTransform: "none",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark" ? theme.palette.grey[600] : "#D0D0D0",
  },
  cursor: "default",
}));

const AddButton = styled(Button)(({ theme }) => ({
  backgroundColor: "#0066CC",
  color: "#FFFFFF",
  textTransform: "none",
  fontWeight: 600,
  padding: theme.spacing(1, 3),
  "&:hover": {
    backgroundColor: "#0052A3",
  },
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    padding: theme.spacing(1.5, 2),
  },
}));

const DocumentLink = styled(Typography)(({ theme }) => ({
  color: "#0066CC",
  textDecoration: "none",
  fontSize: "14px",
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  cursor: "pointer",
  marginTop: theme.spacing(1),
  "&:hover": {
    textDecoration: "underline",
  },
}));

const FileUploadContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
}));

const FileUploadInputWrapper = styled(Box)(({ theme }) => ({
  flex: 1,
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

const FileUploadIconWrapper = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    alignSelf: "flex-end",
  },
}));

const FileListContainer = styled(Box)(({ theme }) => ({
  maxHeight: "200px",
  overflowY: "auto",
  overflowX: "hidden",
  marginTop: theme.spacing(1),
  paddingRight: theme.spacing(0.5),
  "&::-webkit-scrollbar": {
    width: "8px",
  },
  "&::-webkit-scrollbar-track": {
    background:
      theme.palette.mode === "dark" ? theme.palette.grey[800] : "#f1f1f1",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb": {
    background:
      theme.palette.mode === "dark" ? theme.palette.grey[600] : "#888",
    borderRadius: "4px",
    "&:hover": {
      background:
        theme.palette.mode === "dark" ? theme.palette.grey[500] : "#555",
    },
  },
}));

const FileListItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  marginTop: "8px",
  [theme.breakpoints.down("sm")]: {
    flexWrap: "wrap",
  },
}));

const FileLink = styled(DocumentLink)(({ theme }) => ({
  flex: 1,
  cursor: "pointer",
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC", // Thêm color cho dark mode
  textDecoration: "none", // Đảm bảo không có gạch chân mặc định
  "&:hover": {
    textDecoration: "underline",
    color: theme.palette.mode === "dark" ? "#E0E0E0" : "#0052A3", // Hover color cho cả 2 mode
  },
  [theme.breakpoints.down("sm")]: {
    wordBreak: "break-all",
    fontSize: "13px",
  },
}));

const DeleteFileButton = styled(IconButton)(() => ({
  color: "#d32f2f",
  padding: "2px",
}));

const STTCell = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "60px",
}));

const InputCell = styled(Grid)(() => ({
  display: "flex",
  flexDirection: "column",
  position: "relative",
}));

const DeleteCell = styled(Grid)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingTop: "10px",
}));

const InputWrapper = styled(Box)(() => ({
  flex: 1,
  position: "relative",
}));

const HelperTextError = styled(Typography)(() => ({
  position: "absolute",
  bottom: -20,
  left: 0,
  fontSize: "12px",
  color: "#d32f2f",
}));

const CenteredBox = styled(Box)(() => ({
  textAlign: "center",
}));

// Wrapper mới để áp dụng chiều cao cố định cho InputComponents
const FixedHeightInputWrapper = styled(Box)(({ theme }) => ({
  "& .MuiInputBase-root": {
    height: "41px",
  },
  "& .MuiInputBase-input": {
    color:
      theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
  },
  "& .MuiInputLabel-root": {
    color:
      theme.palette.mode === "dark" ? "#B0B0B0" : theme.palette.text.secondary,
  },
  "& .MuiInputBase-input.Mui-disabled": {
    color:
      theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
    WebkitTextFillColor:
      theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
  },
  "& .MuiOutlinedInput-root.Mui-disabled": {
    "& .MuiInputBase-input": {
      color:
        theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
      WebkitTextFillColor:
        theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
    },
  },
}));

const DeleteButtonWithMargin = styled(SectionIconButton)(() => ({
  marginTop: "20px",
}));

// Schema validation
const archiveStorageSchema = yup.object().shape({
  archiveName: yup.string().required("Tên đợt lưu trữ là bắt buộc"),
  archiveCode: yup.string().required("Mã đợt lưu trữ là bắt buộc"),
  archiveScope: yup
    .mixed()
    .required("Phạm vi đợt lưu trữ là bắt buộc")
    .test("valid-scope", "Vui lòng chọn đầy đủ thông tin phạm vi", (value) => {
      if (!value) return false;
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed.scope && parsed.value;
      } catch {
        return false;
      }
    }),
  createdDate: yup.date().required("Ngày khởi tạo là bắt buộc").nullable(),
  reason: yup.string().required("Lý do/căn cứ là bắt buộc"),
  notes: yup.string(),
  fileids: yup.array(),
  records: yup.array().of(
    yup.object().shape({
      recordNumber: yup.string().required("Số và ký hiệu hồ sơ là bắt buộc"),
      recordTitle: yup.string().required("Tiêu đề hồ sơ là bắt buộc"),
      recordType: yup.string().required("Loại hồ sơ là bắt buộc"),
    })
  ),
});

const AddArchiveStorage = ({ open, onClose, onSuccess, sharedComponents }) => {
  const {
    CustomSwipper,
    ButtonOutline,
    InputComponents,
    DateTimePicker,
    toast,
  } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);
  const recordTypeOptions = [
    { _id: "text", name: "Nội dung trường thông tin (Text)" },
    { _id: "number", name: "Số" },
    { _id: "date", name: "Ngày tháng" },
  ];

  const defaultFormValues = useMemo(
    () => ({
      archiveName: "",
      archiveCode: "",
      archiveScope: "",
      createdDate: dayjs(),
      reason: "",
      notes: "",
      fileids: [],
      records: [
        {
          recordNumber: "",
          recordTitle: "",
          recordType: "",
        },
      ],
    }),
    []
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(archiveStorageSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "records",
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
    if (open) {
      reset(defaultFormValues);
      setUploadedFiles([]);
    }
  }, [open, reset, defaultFormValues]);

 const onSubmitForm = useCallback(
    async (data) => {
      try {
        let archiveScopeData = data.archiveScope;
        let scopeValue = "";

        if (typeof archiveScopeData === "string") {
          try {
            const parsed = JSON.parse(archiveScopeData);
            // Xử lý nếu value là object (custom date range)
            if (typeof parsed.value === "object" && parsed.value !== null) {
              scopeValue = JSON.stringify(parsed.value);
            } else {
              scopeValue = parsed.value?.toString() || archiveScopeData;
            }
          } catch (e) {
            scopeValue = archiveScopeData;
          }
        } else if (
          typeof archiveScopeData === "object" &&
          archiveScopeData?.value
        ) {
          // Xử lý nếu value là object (custom date range)
          if (typeof archiveScopeData.value === "object") {
            scopeValue = JSON.stringify(archiveScopeData.value);
          } else {
            scopeValue = archiveScopeData.value.toString();
          }
        } else {
          scopeValue = archiveScopeData;
        }

        // Map recordType từ ID sang tên hiển thị
        const getRecordTypeName = (typeId) => {
          const typeMap = {
            text: "Nội dung trường thông tin",
            number: "Số",
            date: "Ngày tháng",
          };
          return typeMap[typeId] || typeId;
        };

        // Xây dựng payload để tạo đợt lưu trữ
        const payload = {
          code: data.archiveCode,
          name: data.archiveName,
          scope: scopeValue,
          storageStartDate: data.createdDate
            ? dayjs(data.createdDate).format("YYYY-MM-DD")
            : null,
          createReason: data.reason,
          note: data.notes || null,
          sources: data.records.map((record) => ({
            textSymbol: record.recordNumber,
            title: record.recordTitle,
            type: getRecordTypeName(record.recordType),
          })),
        };

        // Step 1: Tạo đợt lưu trữ mới
        const createResponse = await axiosInstance.post(API_STORAGE_DOT_MANAGEMENT, payload);
        
        const newArchiveId = 
          createResponse.data?.data?.id || 
          createResponse.data?.data?._id || 
          createResponse.data?.id || 
          createResponse.data?._id ||
          createResponse.id ||
          createResponse._id;

        if (!newArchiveId) {
          logger.error("Response data:", createResponse.data);
          throw new Error("Không lấy được ID của đợt lưu trữ vừa tạo");
        }

        // Step 2: Upload files (nếu có) với object_id vừa tạo
        if (uploadedFiles.length > 0) {
          const uploadPromises = uploadedFiles.map((file) => {
            if (file.rawFile) {
              const formData = new FormData();
              formData.append("file", file.rawFile);
              formData.append("object_type", "archivestorage");
              formData.append("object_id", newArchiveId);
              return api.post(API_UPLOAD_FILESS, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            }
            return Promise.resolve(null);
          });

          await Promise.all(uploadPromises);
        }

        toast("Thêm mới đợt lưu trữ thành công!", "success");
        onSuccess();
      } catch (error) {
        let errorMessage = "Đã có lỗi xảy ra!";
                if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors
            .map((err) => err.message)
            .join("; ");
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        toast(errorMessage, "error");
      }
    },
    [toast, onSuccess, uploadedFiles]
  );

  const handleSaveClick = useCallback(() => {
    handleSubmit(onSubmitForm, (errs) => {
      const firstError = Object.values(errs)[0];
      toast(firstError?.message || "Vui lòng kiểm tra lại thông tin!", "error");
    })();
  }, [handleSubmit, onSubmitForm, toast]);

  const handleAddRecord = useCallback(() => {
    append({
      recordNumber: "",
      recordTitle: "",
      recordType: "",
    });
  }, [append]);

  const handleRemoveRecord = useCallback(
    (index) => {
      if (fields.length > 1) {
        remove(index);
      }
    },
    [remove, fields.length]
  );

  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);

  const handleFileUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        const newFiles = files.map((file) => ({
          _id: `temp_${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          rawFile: file,
        }));

        setUploadedFiles((prev) => [...prev, ...newFiles]);
        toast(`Đã thêm ${files.length} file`, "success");

        event.target.value = "";
      }
    },
    [toast]
  );

  const handleRemoveFile = useCallback(
    (fileId) => {
      setUploadedFiles((prev) => prev.filter((f) => f._id !== fileId));
      toast("Đã xóa file", "success");
    },
    [toast]
  );

  const handleFileClick = useCallback(
    async (file) => {
      const fileName = file.fileName || file.name || file.file_name || "file";
      const lower = fileName.toLowerCase();

      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isPpt = /\.(ppt|pptx)$/i.test(lower);
      const isOtherOffice = isExcel || isPpt;
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

      // Kiểm tra xem file có rawFile hoặc là file tạm chưa upload
      const isLocalOrTempFile = file.rawFile instanceof File || file._id?.startsWith("temp_");
      
      if (isLocalOrTempFile && file.rawFile) {
        setIsUploading(true);
        try {
          if (isDoc) {
            const formData = new FormData();
            formData.append("file", file.rawFile);

            const response = await api.post(
              `${APP_BASE}/api/file-to-pdf`,
              formData,
              { responseType: "blob", timeout: 0 }
            );

            const pdfBlob = new Blob([response.data], {
              type: "application/pdf",
            });
            setPreviewUrl(URL.createObjectURL(pdfBlob));
            setPreviewFileName(fileName);
            setIsPreviewOpen(true);
            return;
          }
          if (isOtherOffice) {
            const arrayBuffer = await file.rawFile.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const htmlString = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            const htmlBlob = new Blob([htmlString], { type: "text/html" });
            setPreviewUrl(URL.createObjectURL(htmlBlob));
            setPreviewFileName(fileName);
            setIsPreviewOpen(true);
            return;
          }
          if (isBrowserFile) {
            const blobUrl = URL.createObjectURL(file.rawFile);
            setPreviewUrl(blobUrl);
            setPreviewFileName(fileName);
            setIsPreviewOpen(true);
            return;
          }
          toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        } catch (e) {
          toast("Không thể xem trước file này.", "error");
        } finally {
          setIsUploading(false);
        }
        return;
      }

      if (file._id || file.id) {
        setIsUploading(true);
        const fileId = file._id || file.id;

        try {
          let blob;
          let previewName = fileName;

          if (isDoc) {
            const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
            const res = await api.get(conversionApi, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], { type: "application/pdf" });
            previewName = fileName;
          } else if (isBrowserFile) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 0,
            });
            blob = new Blob([res.data], {
              type: res.headers["content-type"] || res.data.type,
            });
            previewName = fileName;
          } else if (isOtherOffice) {
            const viewUrl = `${APP_BASE}/api/files/view/${fileId}`;
            const res = await api.get(viewUrl, {
              responseType: "blob",
              timeout: 0,
            });
            const arrayBuffer = await res.data.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: "array" });
            const html = XLSX.utils.sheet_to_html(
              workbook.Sheets[workbook.SheetNames[0]]
            );
            blob = new Blob([html], { type: "text/html" });
            previewName = fileName;
          } else {
            throw new Error("Định dạng file không được hỗ trợ xem trước.");
          }

          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFileName(previewName);
          setIsPreviewOpen(true);
        } catch (e) {
          toast("Không thể xem trước tài liệu.", "error");
        } finally {
          setIsUploading(false);
        }
        return;
      }
      toast("Không xác định được nguồn file để xem trước.", "error");
    },
    [toast]
  );
  
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFileName("");
  }, [previewUrl]);

  const createHandleFileClick = useCallback(
    (file) => {
      return () => handleFileClick(file);
    },
    [handleFileClick]
  );

  const handleDeXuatXuLy = useCallback(() => {}, []);
  const handleChuyenXuLy = useCallback(() => {}, []);

  const createHandleRemoveRecord = useCallback(
    (index) => {
      return () => handleRemoveRecord(index);
    },
    [handleRemoveRecord]
  );

  const createHandleRemoveFile = useCallback(
    (fileId) => {
      return () => handleRemoveFile(fileId);
    },
    [handleRemoveFile]
  );

  return (
    <CustomSwipper
      key={open ? "add-archive-storage-open" : "add-archive-storage-closed"}
      open={open && isReady}
      onClose={onClose}
      title="Tạo mới đợt lưu trữ"
      type="add"
      screenType="archive"
      onDeXuatXuLy={handleDeXuatXuLy}
      onChuyenXuLy={handleChuyenXuLy}
      moreActions={
        <ButtonOutline
          type="button"
          onClick={handleSaveClick}
          variant="outlined"
        >
          Lưu
        </ButtonOutline>
      }
      hideBackdrop
    >
      <FormContainer>
        {/* CARD 1: THÔNG TIN CHUNG */}
        <StyledCard>
          <CardHeader>
            <SectionTitle>THÔNG TIN CHUNG</SectionTitle>
            <StatusBox>
              <SectionTitleStatus>Trạng thái hồ sơ:</SectionTitleStatus>
              <StatusButton size="small" disableRipple>
                Chưa phê duyệt
              </StatusButton>
            </StatusBox>
          </CardHeader>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="archiveName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên đợt lưu trữ"
                    placeholder="Nhập tên đợt lưu trữ..."
                    required
                    error={!!errors?.archiveName}
                    helperText={errors?.archiveName?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="archiveCode"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mã đợt lưu trữ"
                    placeholder="Nhập mã đợt lưu trữ..."
                    required
                    error={!!errors?.archiveCode}
                    helperText={errors?.archiveCode?.message}
                    {...field}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="archiveScope"
                control={control}
                render={({ field }) => {
                  const handleThisScopeChange = (data) => {
                    field.onChange(JSON.stringify(data));
                  };

                  return (
                    <ArchiveScopeDropdown
                      value={field.value}
                      onChange={handleThisScopeChange}
                      error={!!errors?.archiveScope}
                      helperText={errors?.archiveScope?.message}
                    />
                  );
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="createdDate"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Ngày khởi tạo đợt lưu trữ"
                    value={field.value}
                    onChange={handleDateChange(field.onChange)}
                    showTime={false}
                    required
                    error={!!errors?.createdDate}
                    helperText={errors?.createdDate?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Box>
                    <FileUploadContainer>
                      <FileUploadInputWrapper>
                        <InputComponents
                          label="Lý do/căn cứ khởi tạo đợt"
                          placeholder="Nhập lý do/căn cứ..."
                          // multiline
                          required
                          error={!!errors?.reason}
                          helperText={errors?.reason?.message}
                          {...field}
                        />
                      </FileUploadInputWrapper>
                      <FileUploadIconWrapper>
                        <SectionBoxIconButton onClick={handleFileUploadClick}>
                          <SectionAttachFileIcon />
                        </SectionBoxIconButton>
                        <HiddenFileInput
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          accept="*/*"
                        />
                      </FileUploadIconWrapper>
                    </FileUploadContainer>
                    <FileListContainer>
                      {uploadedFiles.map((file) => (
                        <FileListItem key={file._id}>
                          <ActionIconDescriptionIcon />
                          <FileLink
                            // component="a"
                            // href="#"
                            onClick={createHandleFileClick(file)}
                          >
                            {file.name}
                          </FileLink>
                          <DeleteFileButton
                            size="medium"
                            onClick={createHandleRemoveFile(file._id)}
                          >
                            <SectionDelete />
                          </DeleteFileButton>
                        </FileListItem>
                      ))}
                    </FileListContainer>
                  </Box>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* Empty space */}
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Ghi chú"
                    placeholder="Nhập ghi chú..."
                    multiline
                    rows={2}
                    error={!!errors?.notes}
                    helperText={errors?.notes?.message}
                    {...field}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledCard>

        {/* CARD 2: DANH MỤC HỒ SƠ CẦN LƯU TRỮ */}
        <StyledCard>
          <CardHeader>
            <SectionTitle>
              DANH MỤC HỒ SƠ CẦN LƯU TRỮ ({fields.length})
            </SectionTitle>
          </CardHeader>

          {fields.map((field, index) => {
            const isLastItem = index === fields.length - 1;
            const BoxComponent = isLastItem
              ? SectionBoxRecord
              : SectionBoxRecordWithBorder;
            const STTComponent =
              index === 0 ? SectionSTTVisible : SectionSTTHidden;

            return (
              <BoxComponent key={field.id}>
                <RecordRowGrid container spacing={2}>
                  {/* STT */}
                  <STTCell item xs={12} sm={1}>
                    <CenteredBox>
                      <STTComponent>STT</STTComponent>
                      <SectionSTTBox>{index + 1}</SectionSTTBox>
                    </CenteredBox>
                  </STTCell>

                  {/* Số và ký hiệu hồ sơ */}
                  <InputCell item xs={12} sm={3.5}>
                    <STTComponent>Số và ký hiệu hồ sơ *</STTComponent>
                    <Controller
                      name={`records.${index}.recordNumber`}
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <InputWrapper>
                          <FixedHeightInputWrapper>
                            <InputComponents
                              placeholder="Nội dung trường thông tin (Text)"
                              required={index === 0}
                              error={!!error}
                              {...field}
                            />
                          </FixedHeightInputWrapper>
                          {error && (
                            <HelperTextError>{error.message}</HelperTextError>
                          )}
                        </InputWrapper>
                      )}
                    />
                  </InputCell>

                  {/* Tiêu đề hồ sơ */}
                  <InputCell item xs={12} sm={3.5}>
                    <STTComponent>Tiêu đề hồ sơ *</STTComponent>
                    <Controller
                      name={`records.${index}.recordTitle`}
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <InputWrapper>
                          <FixedHeightInputWrapper>
                            <InputComponents
                              placeholder="Nội dung trường thông tin (Text)"
                              required={index === 0}
                              error={!!error}
                              {...field}
                            />
                          </FixedHeightInputWrapper>
                          {error && (
                            <HelperTextError>{error.message}</HelperTextError>
                          )}
                        </InputWrapper>
                      )}
                    />
                  </InputCell>

                  {/* Loại hồ sơ */}
                  <InputCell item xs={12} sm={3.5}>
                    <STTComponent>Loại hồ sơ *</STTComponent>
                    <Controller
                      name={`records.${index}.recordType`}
                      control={control}
                      render={({ field, fieldState: { error } }) => (
                        <InputWrapper>
                          <FixedHeightInputWrapper>
                            <InputComponents
                              select
                              options={recordTypeOptions}
                              customLabel="name"
                              customValue="_id"
                              placeholder="Nội dung trường thông tin (Text)"
                              required={index === 0}
                              error={!!error}
                              {...field}
                            />
                          </FixedHeightInputWrapper>
                          {error && (
                            <HelperTextError>{error.message}</HelperTextError>
                          )}
                        </InputWrapper>
                      )}
                    />
                  </InputCell>

                  {/* Icon delete */}
                  <DeleteCell item xs={12} sm={0.5}>
                    <DeleteButtonWithMargin
                      size="small"
                      onClick={createHandleRemoveRecord(index)}
                      disabled={fields.length === 1}
                    >
                      <DeleteIcon />
                    </DeleteButtonWithMargin>
                  </DeleteCell>
                </RecordRowGrid>
              </BoxComponent>
            );
          })}

          <SectionBoxTop>
            <AddButton onClick={handleAddRecord}>THÊM MỘT DÒNG</AddButton>
          </SectionBoxTop>
        </StyledCard>
      </FormContainer>

      <FilePreviewDialog
        open={isPreviewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl || ""}
      />
    </CustomSwipper>
  );
};

export default withSharedComponents(AddArchiveStorage);
