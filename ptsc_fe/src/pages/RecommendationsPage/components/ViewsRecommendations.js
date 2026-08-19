import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { withFormWrapper } from "@components/common/FormWrapper";
import withSharedComponents from "@components/WrapperComponent";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MenuIcon from "@mui/icons-material/Menu";
import { FileUploadOutlined as FileUploadOutlinedIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import {
  FormContainer,
  MainCard,
  SectionTitle,
  FileTableContainer,
  StyledTableHead,
  StyledTableRow,
  FileNameCell,
  StatusBadgeGreen,
  HistoryCard,
  TitleBox,
  TimelineWrapper,
  TimelineItem,
  StatusWrapper,
  TimelineTitle,
  TimelineText,
  TimelineDate,
  SectionHeader,
  LabelText,
  InfoBox,
  BlueButton,
  BoldText,
  SectionTitleNoMargin,
  FlexInfoBox,
  ActionButtonRedWithMargin,
  ActionButtonsWrapper,
  ReasonText,
  MarginBox,
  UploadButton,
  UploadHeader,
  SaveButton,
  BlueMenuIconWrapper,
  BlueVisibilityIcon,
  BlueDownloadIcon,
  RedDeleteIcon,
  RedListItemText
} from "./RecommendationsForm.styles";
import { useSelector } from "react-redux";
import { API_REFLECT_SUGGESTIONS, API_VIEW_FILE, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { FileViewerDialog } from "@components/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import EvaluationRecommendationDialog from "./EvaluationRecommendationDialog";
import ViewEvaluationRecommendationDialog from "./ViewEvaluationRecommendationDialog";
import CancelRecommendationDialog from "./CancelRecommendationDialog";
import DOMPurify from "dompurify";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
const recommendationSchema = yup.object().shape({
  recommendationType: yup.string().required("Loại phản ánh là bắt buộc"),
  urgency: yup.string().required("Vui lòng chọn mức độ"),
  title: yup.string().required("Tiêu đề là bắt buộc"),
  content: yup.string().required("Nội dung là bắt buộc"),
});





function ViewsRecommendations({ open, onClose, data, sharedComponents, setReloadData }) {
  const { toast, InputComponents: BaseInput } = sharedComponents;

  const [isReady, setIsReady] = useState(false);
  const [showProcessInfo, setShowProcessInfo] = useState(true);
  const [showResultInfo, setShowResultInfo] = useState(true);
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [viewEvaluationOpen, setViewEvaluationOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  
  const [displayData, setDisplayData] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isReUpdateFlow, setIsReUpdateFlow] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Wrapper components to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);
  const deadlineVal = displayData?.deadlineHighlight || displayData?.deadline;
  const fileInputRef = React.useRef(null);

  const { crmSource } = useSelector((state) => state.config);
  const recommendationTypeOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIPHANANH")?.data || [],
    [crmSource]
  );

  const urgencyOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIMUCDO")?.data || [],
    [crmSource]
  );

  const defaultValues = useMemo(
    () => ({
      recommendationType: "",
      urgency: "",
      title: "",
      content: "",
    }),
    []
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues,
    resolver: yupResolver(recommendationSchema),
  });

  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: "",
    name: "",
    type: "",
  });

  const handleViewFile = useCallback(async (file) => {
    if (!file) return;

    const fileName = file.file_name || file.name;
    const lower = fileName.toLowerCase();
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

    // Local file (not yet saved)
    if (file.rawFile && isBrowserFile) {
      const objectUrl = URL.createObjectURL(file.rawFile);
      let fileType = null;
      if (["jpg", "jpeg", "png", "gif", "webp"].some(ext => lower.endsWith(ext))) {
        fileType = "image";
      } else if (lower.endsWith("pdf")) {
        fileType = "pdf";
      }

      setViewingFile({
        open: true,
        url: objectUrl,
        name: fileName,
        type: fileType,
      });
      return;
    }

    // Server file or complex local file
    const fileId = file.id || file._id;
    if (!fileId && !file.rawFile) {
      toast("File không hợp lệ.", "warning");
      return;
    }

    try {
      setFetching(true);
      let blob;
      let previewType = null;

      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const res = await axiosInstance.get(conversionApi, { responseType: "blob" });
        blob = new Blob([res.data || res], { type: "application/pdf" });
        previewType = "pdf";
      } else if (isExcel) {
        let fileBlob;
        if (file.rawFile) {
          fileBlob = file.rawFile;
        } else {
          const downloadRes = await axiosInstance.get(`${APP_BASE}/api/files/download/${fileId}`, { responseType: "blob" });
          fileBlob = downloadRes.data || downloadRes;
        }

        const formData = new FormData();
        formData.append("file", new File([fileBlob], fileName));
        const res = await axiosInstance.post(API_XLSX_TO_PDF, formData, { responseType: "blob" });
        blob = new Blob([res.data || res], { type: "application/pdf" });
        previewType = "pdf";
      } else if (isBrowserFile) {
        if (file.rawFile) {
          blob = file.rawFile;
        } else {
          const res = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, { responseType: "blob" });
          blob = res.data || res;
        }
        
        if (["jpg", "jpeg", "png", "gif", "webp"].some(ext => lower.endsWith(ext))) {
          previewType = "image";
        } else if (lower.endsWith("pdf")) {
          previewType = "pdf";
        }
      } else {
        toast("Định dạng file không được hỗ trợ xem trước.", "warning");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      setViewingFile({
        open: true,
        url: objectUrl,
        name: fileName,
        type: previewType,
      });
    } catch (error) {
      toast("Không thể tải file để xem trước.", "error");
    } finally {
      setFetching(false);
    }
  }, [toast]);

  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);

  const handleFileMenuClick = useCallback((event, file) => {
    event.stopPropagation();
    setFileMenuAnchor(event.currentTarget);
    setSelectedFileForMenu(file);
  }, []);

  const handleFileMenuClose = useCallback(() => {
    setFileMenuAnchor(null);
    setSelectedFileForMenu(null);
  }, []);

  const handleMenuViewFile = useCallback(() => {
    if (selectedFileForMenu) {
       handleViewFile(selectedFileForMenu);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, handleViewFile, handleFileMenuClose]);

  const handleDownloadFile = useCallback(async () => {
    if (!selectedFileForMenu) return;
    const fileId = selectedFileForMenu.id || selectedFileForMenu._id;
    if (!fileId) {
      if (selectedFileForMenu.rawFile) {
        // Support downloading locally uploaded files before save
        const url = window.URL.createObjectURL(selectedFileForMenu.rawFile);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", selectedFileForMenu.name);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      handleFileMenuClose();
      return;
    }

    try {
      setFetching(true);
      const res = await axiosInstance.get(`${APP_BASE}/api/files/download/${fileId}`, {
        responseType: "blob",
      });
      const blob = res.data || res;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", selectedFileForMenu.file_name || selectedFileForMenu.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast("Không thể tải file.", "error");
    } finally {
      setFetching(false);
      handleFileMenuClose();
    }
  }, [selectedFileForMenu, toast, handleFileMenuClose]);

  const handleRemoveFile = useCallback((id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id && f._id !== id));
  }, []);

  const handleMenuRemoveFile = useCallback(() => {
    if (selectedFileForMenu) {
       handleRemoveFile(selectedFileForMenu.id || selectedFileForMenu._id);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, handleRemoveFile, handleFileMenuClose]);

  const createViewFileHandler = useCallback((file) => () => {
    handleViewFile(file);
  }, [handleViewFile]);

  const createMenuClickHandler = useCallback((file) => (e) => {
    handleFileMenuClick(e, file);
  }, [handleFileMenuClick]);

  const fetchData = useCallback(async () => {
    if (!open || !data) return;
    const id = data.id || data._id;
    if (!id) return;

    try {
      setFetching(true);
      const res = await axiosInstance.get(`${API_REFLECT_SUGGESTIONS}/${id}`);
      const result = res?.data?.data || res?.data || res;
      setDisplayData(result);
      reset({
        recommendationType: result.types || "",
        urgency: result.priority || "",
        title: result.title || "",
        content: result.content || ""
      });
      setUploadedFiles(result.files || []);
    } catch (error) {
      toast("Không thể tải thông tin phản ánh!", "error");
    } finally {
      setFetching(false);
    }
  }, [open, data, toast, reset]);

  useEffect(() => {
    if (open && data) {
      fetchData();
    } else {
      setDisplayData(null);
      reset(defaultValues);
      setUploadedFiles([]);
      setIsEditMode(false);
    }
  }, [open, data, fetchData, reset, defaultValues]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const toggleProcessInfo = useCallback(() => {
    setShowProcessInfo((prev) => !prev);
  }, []);

  const toggleResultInfo = useCallback(() => {
    setShowResultInfo((prev) => !prev);
  }, []);

  const handleOpenEvaluation = useCallback(() => {
    setEvaluationOpen(true);
  }, []);

  const handleCloseEvaluation = useCallback(() => {
    setEvaluationOpen(false);
  }, []);

  const handleOpenViewEvaluation = useCallback(() => {
    setViewEvaluationOpen(true);
  }, []);

  const handleCloseViewEvaluation = useCallback(() => {
    setViewEvaluationOpen(false);
  }, []);

  const handleSaveEvaluation = useCallback(async (evaluationData) => {
    if (evaluationData.rating === 0) {
      toast("Vui lòng chọn mức độ đánh giá!", "warning");
      return;
    }

    try {
      setIsProcessing(true);
      const id = displayData?.id || displayData?._id;
      const payload = {
        score: evaluationData.rating,
        satisfactionLevel: evaluationData.satisfactionLevel, // Add satisfaction level
        ratingComment: evaluationData.comment
      };

      await axiosInstance.post(`${API_REFLECT_SUGGESTIONS}/${id}/rating`, payload);

      toast("Gửi đánh giá thành công!", "success");
      setEvaluationOpen(false);
      fetchData(); // Reload details
      setReloadData?.(prev => prev + 1);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi gửi đánh giá!", "error");
    } finally {
      setIsProcessing(false);
    }
  }, [displayData, toast, setReloadData, fetchData]);

  const handleOpenCancel = useCallback(() => {
    setCancelOpen(true);
  }, []);

  const handleCloseCancel = useCallback(() => {
    setCancelOpen(false);
  }, []);

  const handleConfirmCancel = useCallback(async (reason) => {
    if (!reason?.trim()) {
      toast("Vui lòng nhập lý do hủy!", "warning");
      return;
    }

    try {
      setIsCanceling(true);
      const id = displayData?.id || displayData?._id;
      
      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}`, {
        cancelReason: reason,
        status: "3"
      });

      toast("Hủy phản ánh kiến nghị thành công!", "success");
      setCancelOpen(false);
      fetchData(); // Reload details
      setReloadData?.(prev => prev + 1);
    } catch (error) {
      toast(error?.response?.data?.message || "Có lỗi xảy ra khi hủy phản ánh!", "error");
    } finally {
      setIsCanceling(false);
    }
  }, [displayData, toast, setReloadData, fetchData]);


  const handleEditClick = useCallback(() => {
    setIsReUpdateFlow(false);
    setIsEditMode(true);
  }, []);

  const handleReUpdateClick = useCallback(() => {
    setIsReUpdateFlow(true);
    setIsEditMode(true);
  }, []);

  const onSubmit = useCallback(async (formData) => {
    try {
      setIsProcessing(true);
      const payload = {
        types: formData.recommendationType,
        priority: formData.urgency,
        title: formData.title,
        content: formData.content,
        files: [] // Gửi mảng rỗng để không bị ảnh hưởng file cũ (logic backend)
      };

      const id = displayData?.id || displayData?._id;
      const url = isReUpdateFlow ? `${API_REFLECT_SUGGESTIONS}/${id}/re-update` : `${API_REFLECT_SUGGESTIONS}/${id}`;
      await axiosInstance.patch(url, payload);

      if (id && uploadedFiles.length > 0) {
        for (const item of uploadedFiles) {
          if (item.rawFile) {
            try {
              await apiUploadFile(item.rawFile, "feedback_suggestions", id);
            } catch (err) {
              toast(`Tải lên tệp ${item.name} thất bại.`, "warning");
            }
          }
        }
      }

      toast("Cập nhật phản ánh thành công!", "success");
      setIsEditMode(false);
      fetchData(); // Reload details
      setReloadData?.(prev => prev + 1);
    } catch (error) {
       toast(error?.response?.data?.message || "Cập nhật phản ánh thất bại!", "error");
    } finally {
       setIsProcessing(false);
    }
  }, [displayData, toast, setReloadData, uploadedFiles, isReUpdateFlow, fetchData]);


  const handleFileUpload = useCallback((event) => {
    const files = Array.from(event.target.files);
    
    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const validFiles = files.filter((file) => {
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (!isValidExtension) {
        toast(`File ${file.name} không đúng định dạng. Chỉ chấp nhận pdf, doc, docx, xls, xlsx, jpg, jpeg, png.`, "error");
      }
      
      if (!isValidSize) {
        toast(`File ${file.name} vượt quá dung lượng tối đa 10MB.`, "error");
      }

      return isValidExtension && isValidSize;
    });

    const newFiles = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + "KB",
      type: file.type,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      rawFile: file,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    event.target.value = null;
  }, [toast]);

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current.click();
  }, []);

  const handleCloseFileViewer = useCallback(() => {
    setViewingFile((prev) => {
      if (prev.url && !prev.isLocal) { // Check if we should revoke
         // We might need a flag to know if it's local or server to avoid revoking wrong things
         // But usually it's fine
      }
      return { ...prev, open: false, url: "" };
    });
  }, []);

  const renderRecommendationType = useCallback(({ field }) => (
    <InputComponents
      select
      fullWidth
      label="Loại phản ánh"
      options={recommendationTypeOptions}
      customLabel="title"
      customValue="value"
      isView={!isEditMode}
      {...field}
      error={!!errors.recommendationType}
      helperText={errors.recommendationType?.message}
    />
  ), [errors.recommendationType, recommendationTypeOptions, InputComponents, isEditMode]);

  const renderUrgency = useCallback(({ field }) => (
    <InputComponents
      select
      fullWidth
      label="Mức độ"
      options={urgencyOptions}
      customLabel="title"
      customValue="value"
      isView={!isEditMode}
      {...field}
      error={!!errors.urgency}
      helperText={errors.urgency?.message}
    />
  ), [errors.urgency, urgencyOptions, InputComponents, isEditMode]);

  const renderTitle = useCallback(({ field }) => (
    <InputComponents
      fullWidth
      label="Tiêu đề"
      required
      placeholder="Nhập tiêu đề phản ánh"
      isView={!isEditMode}
      {...field}
      error={!!errors.title}
      helperText={errors.title?.message}
    />
  ), [errors.title, InputComponents, isEditMode]);

  const renderContent = useCallback(({ field }) => (
    <InputComponents
      fullWidth
      label="Nội dung"
      required
      placeholder="Nhập nội dung"
      multiline
      rows={4}
      isView={!isEditMode}
      {...field}
      error={!!errors.content}
      helperText={errors.content?.message}
    />
  ), [errors.content, InputComponents, isEditMode]);

  return (
    <>
      <CustomSwipper
        open={open && isReady}
        onClose={handleClose}
        title={isEditMode ? "Chỉnh sửa phản ánh kiến nghị" : "Chi tiết phản ánh kiến nghị"}
        type={isEditMode ? "edit" : "view"}
        footer={
          <>
            <FlexGrowBox />
            <FooterActions>
              {isEditMode ? (
                <ActionButtonsWrapper>
                  <SaveButton variant="contained" onClick={handleSubmit(onSubmit)} disabled={isProcessing}>
                    LƯU
                  </SaveButton>
                </ActionButtonsWrapper>
              ) : (
                <ActionButtonsWrapper>
                  {displayData?.flags?.canEdit && (
                    <BlueButton variant="contained" onClick={handleEditClick}>
                      CHỈNH SỬA
                    </BlueButton>
                  )}
                  {displayData?.flags?.canUpdateFeedbackSuggest && (
                    <BlueButton variant="contained" onClick={handleReUpdateClick}>
                      CHỈNH SỬA LẠI
                    </BlueButton>
                  )}
                  {displayData?.flags?.canReview && (
                    <BlueButton variant="contained" onClick={handleOpenEvaluation}>
                      ĐÁNH GIÁ
                    </BlueButton>
                  )}
                  {displayData?.flags?.canViewReview && (
                    <BlueButton variant="contained" onClick={handleOpenViewEvaluation}>
                      XEM ĐÁNH GIÁ
                    </BlueButton>
                  )}
                  {displayData?.flags?.canCancel && (
                    <ActionButtonRedWithMargin variant="contained" onClick={handleOpenCancel}>
                      HỦY PHẢN ÁNH
                    </ActionButtonRedWithMargin>
                  )}
                </ActionButtonsWrapper>
              )}
            </FooterActions>
          </>
        }
      >
        <FormContainer>
          <Grid container spacing={2}>
            {/* Left Column */}
            <Grid item xs={12} md={isEditMode ? 12 : 9}>
              {/* Section 1: Thông tin phản ánh */}
              <MainCard>
                <TitleBox>
                  <SectionTitle>THÔNG TIN PHẢN ÁNH KIẾN NGHỊ</SectionTitle>
                  <StatusWrapper>
                    {displayData?.processStatus ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${displayData.processStatus}</p>`) }} />
                    ) : (
                      <StatusBadgeGreen>{displayData?.processStatusLabel || (isEditMode ? "Chờ điều phối" : "")}</StatusBadgeGreen>
                    )}
                  </StatusWrapper>
                </TitleBox>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="recommendationType"
                        control={control}
                        render={renderRecommendationType}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name="urgency"
                        control={control}
                        render={renderUrgency}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="title"
                        control={control}
                        render={renderTitle}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Controller
                        name="content"
                        control={control}
                        render={renderContent}
                      />
                    </Grid>
                  </Grid>
              </MainCard>

              {/* Section File */}
              {(isEditMode || uploadedFiles.length > 0) && (
                <MainCard>
                  <SectionTitle>FILE MINH CHỨNG</SectionTitle>
                  {isEditMode && (
                    <UploadHeader>
                      <UploadButton
                        variant="contained"
                        onClick={handleUploadButtonClick}
                        startIcon={<FileUploadOutlinedIcon />}
                      >
                        Tải Lên
                      </UploadButton>
                    </UploadHeader>
                  )}
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />

                  {uploadedFiles.length > 0 && (
                    <FileTableContainer>
                      <Table size="small" stickyHeader>
                        <StyledTableHead>
                          <TableRow>
                            <TableCell align="center">STT</TableCell>
                            <TableCell align="left">Tên file</TableCell>
                            <TableCell align="center">Hành động</TableCell>
                          </TableRow>
                        </StyledTableHead>
                        <TableBody>
                          {uploadedFiles.map((file, index) => (
                            <StyledTableRow key={file.id || file._id}>
                              <TableCell align="center">{index + 1}</TableCell>
                              <FileNameCell onClick={createViewFileHandler(file)}>
                                {file.file_name || file.name}
                              </FileNameCell>
                              <TableCell align="center">
                                    <IconButton size="small" onClick={createMenuClickHandler(file)}>
                                      <BlueMenuIconWrapper>
                                        <MenuIcon />
                                      </BlueMenuIconWrapper>
                                    </IconButton>
                              </TableCell>
                            </StyledTableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </FileTableContainer>
                  )}
                </MainCard>
              )}

              {!isEditMode && (
                <>
                  {/* Section 2: Thông tin xử lý */}
                  {displayData?.flags?.canInfoHandle && (
                    <MainCard>
                    <SectionHeader onClick={toggleProcessInfo}>
                      <SectionTitleNoMargin>THÔNG TIN XỬ LÝ</SectionTitleNoMargin>
                      {showProcessInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </SectionHeader>
                    {showProcessInfo && (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <LabelText>Đơn vị xử lý</LabelText>
                          <InfoBox>{displayData?.unitName || ""}</InfoBox>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <LabelText>Người xử lý</LabelText>
                          <InfoBox>{displayData?.processorName || ""}</InfoBox>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <LabelText>Hạn xử lý (SLA)</LabelText>
                          <FlexInfoBox>
                            <BoldText variant="body2">
                              {deadlineVal?.includes('<') ? (
                                <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(deadlineVal) }} />
                              ) : (
                                deadlineVal ? (dayjs(deadlineVal).isValid() ? dayjs(deadlineVal).format('DD/MM/YYYY, HH:mm:ss') : deadlineVal) : ""
                              )}
                            </BoldText>
                          </FlexInfoBox>
                        </Grid>
                        <Grid item xs={12}>
                          <LabelText>Ghi chú</LabelText>
                          <InfoBox>
                            {displayData?.note || ""}
                          </InfoBox>
                        </Grid>
                      </Grid>
                    )}
                  </MainCard>
                  )}

                  {/* Section 3: Kết quả xử lý */}
                  {displayData?.flags?.canResultHandle && (
                    <MainCard>
                      <SectionHeader onClick={toggleResultInfo}>
                        <SectionTitleNoMargin>KẾT QUẢ XỬ LÝ</SectionTitleNoMargin>
                        {showResultInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </SectionHeader>
                      {showResultInfo && (
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <LabelText>Kết quả xử lý</LabelText>
                            <InfoBox>{displayData?.result || ""}</InfoBox>
                          </Grid>
                          {displayData?.isOverdue && (
                            <Grid item xs={12}>
                            <LabelText>Lý do quá hạn</LabelText>
                            <InfoBox>{displayData?.overdueReason || ""}</InfoBox>
                          </Grid>
                          )}
                          <Grid item xs={12}>
                            <LabelText>Ghi chú kết quả</LabelText>
                            <InfoBox>{displayData?.note || ""}</InfoBox>
                          </Grid>
                        </Grid>
                      )}
                    </MainCard>
                  )}

                  {/* Section File Kết quả */}
                  {displayData?.flags?.canFileResult && (
                    <MainCard>
                      <SectionTitle>FILE MINH CHỨNG KẾT QUẢ</SectionTitle>
                      <FileTableContainer>
                        <Table size="small" stickyHeader>
                          <StyledTableHead>
                            <TableRow>
                              <TableCell align="center">STT</TableCell>
                              <TableCell align="left">Tên file</TableCell>
                              <TableCell align="center"></TableCell>
                            </TableRow>
                          </StyledTableHead>
                          <TableBody>
                            {(displayData?.resultFiles || []).map((file, index) => (
                              <StyledTableRow key={file.id || file._id}>
                                <TableCell align="center">{index + 1}</TableCell>
                                <FileNameCell onClick={createViewFileHandler(file)}>
                                  {file.file_name || file.name}
                                </FileNameCell>
                                <TableCell align="center">
                                  <IconButton size="small" onClick={createMenuClickHandler(file)}>
                                    <BlueMenuIconWrapper>
                                      <MenuIcon />
                                    </BlueMenuIconWrapper>
                                  </IconButton>
                                </TableCell>
                              </StyledTableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </FileTableContainer>
                    </MainCard>
                  )}
                </>
              )}
            </Grid>

            {/* Right Column: History */}
            {!isEditMode && (
              <Grid item xs={12} md={3}>
                <HistoryCard>
                  <TimelineTitle variant="subtitle2">
                    LỊCH SỬ YÊU CẦU
                  </TimelineTitle>
                  <TimelineWrapper>
                    {(displayData?.histories || []).map((history) => (
                      <TimelineItem key={history.id}>
                        <TimelineText variant="body2">{history.action || ""}</TimelineText>
                        {(history.reason || (history.isShowNote && history.note) || (history.isShowDispatchNote && history.note)) && (
                          <MarginBox>
                            <ReasonText variant="caption">
                              <strong>{history.isShowDispatchNote ? "Ghi chú:" : "Lý do:"}</strong> {history.reason || history.note}
                            </ReasonText>
                          </MarginBox>
                        )}
                        <MarginBox>
                          <TimelineDate variant="caption">
                            {dayjs(history.performedAt).format('DD/MM/YYYY, HH:mm:ss')} | {history.performer?.name || history.performer?.username || ""}
                            {history.performer?.organizationName ? ` - ${history.performer.organizationName}` : ''}
                          </TimelineDate>
                        </MarginBox>
                      </TimelineItem>
                    ))}
                    {!(displayData?.histories?.length) && (
                       <TimelineItem>
                          <TimelineText variant="body2">Chưa có lịch sử trạng thái</TimelineText>
                       </TimelineItem>
                    )}
                  </TimelineWrapper>
                </HistoryCard>
              </Grid>
            )}
          </Grid>
        </FormContainer>
      </CustomSwipper>

      <EvaluationRecommendationDialog
        open={evaluationOpen}
        onClose={handleCloseEvaluation}
        onConfirm={handleSaveEvaluation}
        data={displayData}
        isLoading={isProcessing}
        sharedComponents={sharedComponents}
        recommendationTypeOptions={recommendationTypeOptions}
      />

      <ViewEvaluationRecommendationDialog
        open={viewEvaluationOpen}
        onClose={handleCloseViewEvaluation}
        data={displayData}
        recommendationTypeOptions={recommendationTypeOptions}
      />

      <CancelRecommendationDialog
        open={cancelOpen}
        onClose={handleCloseCancel}
        onConfirm={handleConfirmCancel}
        data={displayData}
        isLoading={isCanceling}
        sharedComponents={sharedComponents}
      />

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={handleFileMenuClose}
      >
        <MenuItem onClick={handleMenuViewFile}>
          <ListItemIcon>
            <BlueVisibilityIcon />
          </ListItemIcon>
          <ListItemText>Xem</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownloadFile}>
          <ListItemIcon>
            <BlueDownloadIcon />
          </ListItemIcon>
          <ListItemText>Tải xuống</ListItemText>
        </MenuItem>
        {isEditMode && (
          <MenuItem onClick={handleMenuRemoveFile}>
            <ListItemIcon>
              <RedDeleteIcon />
            </ListItemIcon>
            <RedListItemText>Xóa</RedListItemText>
          </MenuItem>
        )}
      </Menu>

      <LoadingDialog open={isProcessing}>
        Đang xử lý, vui lòng đợi...
      </LoadingDialog>

      <LoadingDialog open={fetching}>
        {"Đang tải dữ liệu bản ghi, vui lòng đợi..."}
      </LoadingDialog>

      <LoadingDialog open={isCanceling}>
        Đang xử lý hủy phản ánh, vui lòng đợi...
      </LoadingDialog>
    </>
  );
}

export default withSharedComponents(ViewsRecommendations); 
