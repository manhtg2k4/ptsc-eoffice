// File: src/components/ViewArchiveStorage/index.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Grid,
  styled,
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme,
  Stack,
  IconButton,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller } from "react-hook-form";
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
  minHeight: "100vh",
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
    marginBottom: theme.spacing(1.5),
  },
}));

const CardHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: theme.spacing(3),
  flexWrap: "wrap",
  gap: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: theme.spacing(2),
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

const SectionTitleStatus = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.secondary,
  [theme.breakpoints.down("sm")]: {
    fontSize: "12px",
  },
}));

const StatusBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  flexWrap: "wrap",
}));

const StatusButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#2C3E50" : "#FFF9E6",
  color: "#F5A623",
  textTransform: "none",
  border: `1px solid #F5A623`,
  fontSize: "12px",
  padding: theme.spacing(0.5, 2),
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#34495E" : "#FFF4D6",
  },
  cursor: "default",
  [theme.breakpoints.down("sm")]: {
    fontSize: "11px",
    padding: theme.spacing(0.5, 1.5),
  },
}));

const BoxContainer = styled(Box)(() => ({
  display: "flex",
  gap: 2,
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

const DeleteFileButton = styled(IconButton)(() => ({
  color: "#d32f2f",
  padding: "2px",
}));

const FixedHeightInputWrapper = styled(Box)(() => ({
  "& .MuiInputBase-root": {
    height: "41px",
  },
}));

const InputCell = styled(Grid)(() => ({
  display: "flex",
  flexDirection: "column",
  position: "relative",
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

const FileUploadInputWrapper = styled(Box)(() => ({
  flex: 1,
  width: "100%",
}));

const FileUploadIconWrapper = styled(Box)(({ theme }) => ({
  [theme.breakpoints.down("sm")]: {
    alignSelf: "flex-end",
  },
}));

const FileListContainer = styled(Box)(({ theme }) => ({
  maxHeight: "200px",
  overflowY: "auto",
  marginTop: theme.spacing(1),
}));

const FileListItem = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  marginTop: "8px",
}));

const FileLink = styled(Typography)(({ theme }) => ({
  flex: 1,
  cursor: "pointer",
  color: theme.palette.mode === "dark" ? "#FFFFFF" : "#0066CC",
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
  wordBreak: "break-word",
}));

const ActionIconDescriptionIcon = styled(DescriptionIcon)(() => ({
  color: "#0066CC",
  fontSize: 20,
  mr: 0.5,
}));

const StyledTable = styled(Table)(({ theme }) => ({
  minWidth: 650,
  backgroundColor: theme.palette.background.paper,
}));

const StyledTableHead = styled(TableHead)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#2C3E50" : "#F5F5F5",
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "14px",
  backgroundColor: theme.palette.mode === "dark" ? "#2C3E50" : "#F5F5F5",
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.action.hover
        : "rgba(0, 0, 0, 0.02)",
  },
}));

const ActionIcon = styled(Box)(() => ({
  color: "#0066CC",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "25px",
  "&:hover": { opacity: 0.7 },
}));

const HistorySectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
  textTransform: "uppercase",
}));

const MobileRecordCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
}));

const MobileRecordField = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  "&:last-child": { marginBottom: 0 },
}));

const MobileFieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: "12px",
  fontWeight: 600,
  color: theme.palette.text.secondary,
}));

const MobileFieldValue = styled(Typography)(({ theme }) => ({
  fontSize: "13px",
  color: theme.palette.mode === "dark" ? "#FFFFFF" : theme.palette.text.primary,
  wordBreak: "break-word",
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
});

const ViewArchiveStorage = ({ open, onClose, archiveId, sharedComponents }) => {
  const {
    CustomSwipper,
    ButtonOutline,
    InputComponents,
    DateTimePicker,
    toast,
  } = sharedComponents;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [isReady, setIsReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [detailData, setDetailData] = useState({});
  const [recordsData, setRecordsData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const recordTypeOptions = [
    { _id: "text", name: "Nội dung trường thông tin (Text)" },
    { _id: "number", name: "Số" },
    { _id: "date", name: "Ngày tháng" },
  ];

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      archiveName: "",
      archiveCode: "",
      archiveScope: "",
      createdDate: null,
      reason: "",
      notes: "",
    },
    resolver: yupResolver(archiveStorageSchema),
  });

  useEffect(() => {
    const fetchDetail = async () => {
      if (open && archiveId) {
        try {
          const response = await axiosInstance.get(`${API_STORAGE_DOT_MANAGEMENT}/${archiveId}`);
          const data = response?.data || response;

          const mappedFormData = {
            archiveName: data.name || "",
            archiveCode: data.code || "",
            archiveScope: data.scope ? JSON.stringify({ scope: "year", value: data.scope }) : "",
            createdDate: data.storageStartDate ? dayjs(data.storageStartDate, "DD/MM/YYYY") : null,
            reason: data.createReason || "",
            notes: data.note || "",
          };

          const mappedRecords = (data.sources || []).map((source, idx) => ({
            id: idx + 1,
            recordNumber: source.textSymbol || "",
            recordTitle: source.title || "",
            recordType: (() => {
              const typeMap = {
                "Nội dung trường thông tin (Text)": "text",
                "Số": "number",
                "Ngày tháng": "date",
              };
              return typeMap[source.type] || "text";
            })(),
          }));

          let fileList = [];
          // Lấy từ attachmentFile trong response trước
          if (data.attachmentFile && Array.isArray(data.attachmentFile)) {
            fileList = data.attachmentFile.map((file) => ({
              _id: file.fileId || file._id || `file_${Date.now()}_${Math.random()}`,
              documentId: file.documentId || "",
              name: file.fileName || file.name || "",
              size: file.fileSize || 0,
              url: file.filePath || file.url || "",
            }));
          } else {
            // Nếu không có attachmentFile, lấy từ API files
            try {
              const objectType = "archivestorage";
              const filesUrl = `${APP_BASE}/api/files/by-object?object_type=${objectType}&object_id=${archiveId}`;
              const filesRes = await axiosInstance.get(filesUrl);
              const filesData = Array.isArray(filesRes) ? filesRes : (filesRes.data || []);
              fileList = filesData.map((file) => ({
                _id: file.id || file._id,
                name: file.file_name || file.name,
                url: file.file_url || `${APP_BASE}${file.file_path}`,
              }));
            } catch (err) {
              logger.error("Lỗi lấy file:", err);
            }
          }

          reset(mappedFormData);
          setDetailData(data);
          setRecordsData(mappedRecords);
          setHistoryData(data.history || []);
          setUploadedFiles(fileList);
          setIsReady(true);
        } catch (error) {
          logger.error("Lỗi lấy chi tiết:", error);
          toast("Có lỗi xảy ra khi tải thông tin đợt lưu trữ", "error");
          onClose();
        }
      } else {
        setIsReady(false);
        setIsEditMode(false);
        setUploadedFiles([]);
      }
    };

    fetchDetail();
  }, [open, archiveId, reset, toast, onClose]);

  const handleEnableEdit = () => setIsEditMode(true);

  const handleCancelEdit = () => {
    const original = {
      archiveName: detailData.name || "",
      archiveCode: detailData.code || "",
      archiveScope: detailData.scope ? JSON.stringify({ scope: "year", value: detailData.scope }) : "",
      createdDate: detailData.storageStartDate ? dayjs(detailData.storageStartDate) : null,
      reason: detailData.createReason || "",
      notes: detailData.note || "",
    };
    reset(original);
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    handleSubmit(
      async (data) => {
        try {
          let scopeValue = "";
          if (typeof data.archiveScope === "string") {
            try {
              const parsed = JSON.parse(data.archiveScope);
              // Xử lý nếu value là object (custom date range)
              if (typeof parsed.value === "object" && parsed.value !== null) {
                scopeValue = `${parsed.value.from} - ${parsed.value.to}`;
              } else {
                scopeValue = parsed.value?.toString() || data.archiveScope;
              }
            } catch {
              scopeValue = data.archiveScope;
            }
          } else if (data.archiveScope?.value) {
            // Xử lý nếu value là object (custom date range)
            if (typeof data.archiveScope.value === "object") {
              scopeValue = `${data.archiveScope.value.from} - ${data.archiveScope.value.to}`;
            } else {
              scopeValue = data.archiveScope.value.toString();
            }
          }

          // Step 1: Upload tất cả file mới lên server (song song dùng Promise.all)
          const uploadPromises = uploadedFiles
            .filter((file) => file.rawFile) // Chỉ upload file mới (có rawFile)
            .map((file) => {
              const formData = new FormData();
              formData.append("file", file.rawFile);
              return api.post(API_UPLOAD_FILESS, formData, {
                headers: { "Content-Type": "multipart/form-data" },
              });
            });

          const uploadResults = await Promise.all(uploadPromises);

          // Step 2: Xây dựng danh sách file (file cũ + file mới upload)
          const newUploadedFiles = uploadResults
            .filter((result) => result !== null)
            .map((result) => ({
              name: result.data.file_name || result.data.name,
              url: `${APP_BASE}/api/files/download/${result.data.id}`,
              id: result.data.id,
            }));

          // Kết hợp file cũ (không có rawFile) + file mới
          const attachmentFileList = uploadedFiles
            .filter((file) => !file.rawFile) // File cũ từ API
            .map((file) => ({
              name: file.name,
              url: file.url,
              id: file._id || file.id,
            }))
            .concat(newUploadedFiles); // Thêm file mới vào

          // Step 3: Xây dựng payload để update đợt lưu trữ
          const payload = {
            code: data.archiveCode,
            name: data.archiveName,
            scope: scopeValue,
            storageStartDate: data.createdDate ? dayjs(data.createdDate).format("YYYY-MM-DD") : null,
            createReason: data.reason,
            note: data.notes || null,
            attachmentFile: attachmentFileList,
          };

          // Step 4: Gửi payload lên API để update đợt lưu trữ
          await axiosInstance.put(`${API_STORAGE_DOT_MANAGEMENT}/${archiveId}`, payload);

          toast("Cập nhật đợt lưu trữ thành công!", "success");
          setIsEditMode(false);
          onClose();
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
      (errs) => {
        const firstError = Object.values(errs)[0];
        toast(firstError?.message || "Vui lòng kiểm tra lại thông tin!", "error");
      }
    )();
  };

  const handleFileClick = async (file) => {
    const fileName = file.fileName || file.name || file.file_name || "file";
    const lower = fileName.toLowerCase();

    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isPpt = /\.(ppt|pptx)$/i.test(lower);
    const isOtherOffice = isExcel || isPpt;
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

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

    if ((file._id || file.id) && !file._id?.startsWith("temp_")) {
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
  };
  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFileName("");
  };

  const createHandleFileClick = (file) => () => handleFileClick(file);

  const handleFileUploadClick = () => {
    if (isEditMode) fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map((file) => ({
        _id: `temp_${Date.now()}_${Math.random()}`,
        name: file.name,
        rawFile: file,
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast(`Đã thêm ${files.length} file`, "success");
      event.target.value = "";
    }
  };

  const handleRemoveFile = async (fileId) => {
    if (isEditMode) {
      try {
        const file = uploadedFiles.find((f) => f._id === fileId);
        
        // Nếu file từ server (không phải file temp), gọi API DELETE
        if (file && !file._id.startsWith("temp_")) {
          await axiosInstance.delete(`${APP_BASE}/api/files/${fileId}`);
        }
        
        setUploadedFiles((prev) => prev.filter((f) => f._id !== fileId));
        toast("Đã xóa file", "success");
      } catch (error) {
        const errorMessage =
          error?.response?.data?.message || error?.message || "Lỗi xóa file";
        toast(errorMessage, "error");
      }
    }
  };

  const createHandleRemoveFile = (fileId) => () => handleRemoveFile(fileId);

  const handleDateChange = (onChange) => (date) => onChange(date);

  function handleScopeChange(data, onChange) {
    onChange(JSON.stringify(data));
  }

  const renderMobileRecords = () => (
    <Box>
      {recordsData.map((record, index) => (
        <MobileRecordCard key={record.id}>
          <Stack spacing={1}>
            <MobileRecordField>
              <MobileFieldLabel>STT</MobileFieldLabel>
              <MobileFieldValue>{index + 1}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Số và ký hiệu hồ sơ</MobileFieldLabel>
              <MobileFieldValue>{record.recordNumber}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Tiêu đề hồ sơ</MobileFieldLabel>
              <MobileFieldValue>{record.recordTitle}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Loại hồ sơ</MobileFieldLabel>
              <MobileFieldValue>
                {recordTypeOptions.find((opt) => opt._id === record.recordType)?.name || record.recordType}
              </MobileFieldValue>
            </MobileRecordField>
            {detailData.status === "Đã duyệt" && (
              <MobileRecordField>
                <ActionIcon title="Tạo lập hồ sơ">≡</ActionIcon>
              </MobileRecordField>
            )}
          </Stack>
        </MobileRecordCard>
      ))}
    </Box>
  );

  const renderMobileHistory = () => (
    <Box>
      {historyData.map((item, index) => (
        <MobileRecordCard key={item.id || index}>
          <Stack spacing={1}>
            <MobileRecordField>
              <MobileFieldLabel>STT</MobileFieldLabel>
              <MobileFieldValue>{index + 1}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Ý kiến xử lý</MobileFieldLabel>
              <MobileFieldValue>{item.event || item.description}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Hành động</MobileFieldLabel>
              <MobileFieldValue>{item.action}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Người xử lý</MobileFieldLabel>
              <MobileFieldValue>{item.handler || item.user}</MobileFieldValue>
            </MobileRecordField>
            <MobileRecordField>
              <MobileFieldLabel>Ngày ý kiến</MobileFieldLabel>
              <MobileFieldValue>{item.date}</MobileFieldValue>
            </MobileRecordField>
          </Stack>
        </MobileRecordCard>
      ))}
    </Box>
  );

  return (
    <CustomSwipper
      open={open && isReady}
      onClose={onClose}
      title="Xem chi tiết đợt lưu trữ"
      type="view"
      screenType="archive"
      moreActions={
        isEditMode ? (
          <BoxContainer>
            <ButtonOutline onClick={handleCancelEdit} variant="outlined">
              Hủy
            </ButtonOutline>
            <ButtonOutline onClick={handleSaveEdit} variant="outlined">
              Lưu
            </ButtonOutline>
          </BoxContainer>
        ) : (
          <ButtonOutline onClick={handleEnableEdit} variant="outlined">
            Chỉnh sửa
          </ButtonOutline>
        )
      }
      hideBackdrop
    >
      <FormContainer>
        <StyledCard>
          <CardHeader>
            <SectionTitle>THÔNG TIN CHUNG</SectionTitle>
            <StatusBox>
              <SectionTitleStatus>Trạng thái hồ sơ:</SectionTitleStatus>
              <StatusButton disableRipple>
                {detailData.statusCodeText || "Chưa xác định"}
              </StatusButton>
            </StatusBox>
          </CardHeader>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <InputCell>
                <Controller
                  name="archiveName"
                  control={control}
                  render={({ field }) => (
                    <FixedHeightInputWrapper>
                      <InputComponents
                        label="Tên đợt lưu trữ"
                        required
                        disabled={!isEditMode}
                        error={!!errors.archiveName}
                        helperText={errors.archiveName?.message}
                        {...field}
                      />
                    </FixedHeightInputWrapper>
                  )}
                />
              </InputCell>
            </Grid>

            <Grid item xs={12} sm={6}>
              <InputCell>
                <Controller
                  name="archiveCode"
                  control={control}
                  render={({ field }) => (
                    <FixedHeightInputWrapper>
                      <InputComponents
                        label="Mã đợt lưu trữ"
                        required
                        disabled={!isEditMode}
                        error={!!errors.archiveCode}
                        helperText={errors.archiveCode?.message}
                        {...field}
                      />
                    </FixedHeightInputWrapper>
                  )}
                />
              </InputCell>
            </Grid>

            <Grid item xs={12} sm={6}>
              <InputCell>
                <Controller
                  name="archiveScope"
                  control={control}
                  render={({ field }) => {
                    function onScopeChange(data) {
                      handleScopeChange(data, field.onChange);
                    }
                    return isEditMode ? (
                      <ArchiveScopeDropdown
                        value={field.value}
                        onChange={onScopeChange}
                        error={!!errors.archiveScope}
                        helperText={errors.archiveScope?.message}
                      />
                    ) : (
                      <InputComponents
                        label="Phạm vi đợt lưu trữ"
                        value={field.value ? JSON.parse(field.value).value : ""}
                        disabled
                      />
                    );
                  }}
                />
              </InputCell>
            </Grid>

            <Grid item xs={12} sm={6}>
              <InputCell>
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
                      disabled={!isEditMode}
                      error={!!errors.createdDate}
                      helperText={errors.createdDate?.message}
                    />
                  )}
                />
              </InputCell>
            </Grid>

            <Grid item xs={12} sm={6}>
              <InputCell>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <FileUploadContainer>
                        <FileUploadInputWrapper>
                          <InputComponents
                            label="Lý do/căn cứ khởi tạo đợt"
                            // multiline
                            required
                            disabled={!isEditMode}
                            error={!!errors.reason}
                            helperText={errors.reason?.message}
                            {...field}
                          />
                        </FileUploadInputWrapper>
                        {isEditMode && ( 
                          <FileUploadIconWrapper>
                            <IconButton onClick={handleFileUploadClick}>
                              <SectionAttachFileIcon />
                            </IconButton>
                            <HiddenFileInput
                              ref={fileInputRef}
                              type="file"
                              multiple
                              onChange={handleFileChange}
                              accept="*/*"
                            />
                          </FileUploadIconWrapper>
                        )}
                      </FileUploadContainer>

                      <FileListContainer>
                        {uploadedFiles.map((file) => (
                          <FileListItem key={file._id}>
                            <ActionIconDescriptionIcon />
                            <FileLink onClick={createHandleFileClick(file)}>
                              {file.name}
                            </FileLink>
                            {isEditMode && (
                              <DeleteFileButton onClick={createHandleRemoveFile(file._id)}>
                                <DeleteIcon />
                              </DeleteFileButton>
                            )}
                          </FileListItem>
                        ))}
                      </FileListContainer>
                    </Box>
                  )}
                />
              </InputCell>
            </Grid>

            <Grid item xs={12}>
              <InputCell>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Ghi chú"
                      multiline
                      rows={2}
                      disabled={!isEditMode}
                      {...field}
                    />
                  )}
                />
              </InputCell>
            </Grid>
          </Grid>
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <SectionTitle>DANH MỤC HỒ SƠ CẦN LƯU TRỮ ({recordsData.length})</SectionTitle>
          </CardHeader>

          {isMobile ? renderMobileRecords() : (
            <TableContainer>
              <StyledTable>
                <StyledTableHead>
                  <TableRow>
                    <StyledHeaderCell align="center">STT</StyledHeaderCell>
                    <StyledHeaderCell>Số và ký hiệu hồ sơ</StyledHeaderCell>
                    <StyledHeaderCell>Tiêu đề hồ sơ</StyledHeaderCell>
                    <StyledHeaderCell>Loại hồ sơ</StyledHeaderCell>
                    {detailData.status === "Đã duyệt" && <StyledHeaderCell align="center">Hành động</StyledHeaderCell>}
                  </TableRow>
                </StyledTableHead>
                <TableBody>
                  {recordsData.map((record, index) => (
                    <StyledTableRow key={record.id}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell>{record.recordNumber}</TableCell>
                      <TableCell>{record.recordTitle}</TableCell>
                      <TableCell>
                        {recordTypeOptions.find((opt) => opt._id === record.recordType)?.name || record.recordType}
                      </TableCell>
                      {detailData.status === "Đã duyệt" && (
                        <TableCell align="center">
                          <ActionIcon title="Tạo lập hồ sơ">≡</ActionIcon>
                        </TableCell>
                      )}
                    </StyledTableRow>
                  ))}
                </TableBody>
              </StyledTable>
            </TableContainer>
          )}
        </StyledCard>

        <StyledCard>
          <CardHeader>
            <HistorySectionTitle>THÔNG TIN XỬ LÝ</HistorySectionTitle>
          </CardHeader>

          {isMobile ? renderMobileHistory() : (
            <TableContainer>
              <StyledTable>
                <StyledTableHead>
                  <TableRow>
                    <StyledHeaderCell align="center">STT</StyledHeaderCell>
                    <StyledHeaderCell>Ý kiến xử lý</StyledHeaderCell>
                    <StyledHeaderCell>Hành động</StyledHeaderCell>
                    <StyledHeaderCell>Người xử lý</StyledHeaderCell>
                    <StyledHeaderCell>Ngày ý kiến</StyledHeaderCell>
                  </TableRow>
                </StyledTableHead>
                <TableBody>
                  {historyData.map((item, index) => (
                    <StyledTableRow key={item.id || index}>
                      <TableCell align="center">{index + 1}</TableCell>
                      <TableCell>{item.event || item.description || "-"}</TableCell>
                      <TableCell>{item.action || "-"}</TableCell>
                      <TableCell>{item.handler || item.user || "-"}</TableCell>
                      <TableCell>{item.date || "-"}</TableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </StyledTable>
            </TableContainer>
          )}
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

export default withSharedComponents(ViewArchiveStorage);