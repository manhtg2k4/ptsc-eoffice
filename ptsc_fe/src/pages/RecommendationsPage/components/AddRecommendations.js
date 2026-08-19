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
  ListItemText
} from "@mui/material";
import withSharedComponents from "@components/WrapperComponent";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { withFormWrapper } from "@components/common/FormWrapper";
import {
  FormContainer,
  MainCard,
  SectionTitle,
  UploadButton,
  SaveButton,
  FileTableContainer,
  StyledTableHead,
  StyledTableRow,
  FileNameCell,
  UploadHeader,
  BlueMenuIconWrapper,
  BlueVisibilityIcon,
  RedDeleteIcon,
  RedListItemText
} from "./RecommendationsForm.styles";
import { useSelector } from "react-redux";

// Icons
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import MenuIcon from "@mui/icons-material/Menu";
import { API_REFLECT_SUGGESTIONS, API_VIEW_FILE, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import LoadingDialog from "@components/LoadingDialog";
import { FileViewerDialog } from "@components/CustomDialog";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";

const recommendationSchema = yup.object().shape({
  recommendationType: yup.string().required("Loại phản ánh không được để trống"),
  urgency: yup.string().required("Tính chất phản ánh không được để trống"),
  title: yup.string().required("Tiêu đề không được để trống"),
  content: yup.string().required("Nội dung không được để trống"),
});



function AddRecommendations({ open, onClose, onSuccess, sharedComponents }) {
  const {
    // CustomSwipper,
    InputComponents: BaseInput,
    toast,
  } = sharedComponents;

  // Wrapper components to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = React.useRef(null);
  
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);

  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url && viewingFile.url.startsWith('blob:')) {
      URL.revokeObjectURL(viewingFile.url);
    }
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

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
      setIsLoading(true);
      let blob;
      let previewType = null;

      if (isDoc) {
        let fileBlob;
        if (file.rawFile) {
          fileBlob = file.rawFile;
        } else {
          const downloadRes = await axiosInstance.get(`${APP_BASE}/api/files/download/${fileId}`, { responseType: "blob" });
          fileBlob = downloadRes.data || downloadRes;
        }

        const formData = new FormData();
        formData.append("file", new File([fileBlob], fileName));
        const res = await axiosInstance.post(`${APP_BASE}/api/file-to-pdf`, formData, { responseType: "blob" });
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
      setIsLoading(false);
    }
  }, [toast]);

  const removeFile = useCallback((id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

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
      reset(defaultValues);
      setUploadedFiles([]);
    }
  }, [open, reset, defaultValues]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);



  const handleFileMenuClick = useCallback((event, file) => {
    event.stopPropagation();
    setFileMenuAnchor(event.currentTarget);
    setSelectedFileForMenu(file);
  }, []);

  const handleFileMenuClose = useCallback(() => {
    setFileMenuAnchor(null);
    setSelectedFileForMenu(null);
  }, []);

  const handleMenuRemoveFile = useCallback(() => {
    if (selectedFileForMenu) {
       removeFile(selectedFileForMenu.id);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, removeFile, handleFileMenuClose]);

  const handleMenuViewFile = useCallback(() => {
    if (selectedFileForMenu) {
      handleViewFile(selectedFileForMenu);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, handleViewFile, handleFileMenuClose]);

  const onSubmit = useCallback(async (data) => {
    try {
      setIsLoading(true);
      const payload = {
        types: data.recommendationType,
        priority: data.urgency,
        title: data.title,
        content: data.content,
        files: []
      };

      const response = await axiosInstance.post(API_REFLECT_SUGGESTIONS, payload);
      const newId = response?.data?.data?.id || response?.data?.id || response?.id || response?.data?.data?._id || response?.data?._id;

      if (newId && uploadedFiles.length > 0) {
        for (const item of uploadedFiles) {
          if (item.rawFile) {
            try {
              await apiUploadFile(item.rawFile, "feedback_suggestions", newId);
            } catch (err) {
              toast(`Tải lên tệp ${item.name} thất bại.`, "warning");
            }
          }
        }
      }

      toast("Gửi phản ánh thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
       toast(error?.response?.data?.message || "Gửi phản ánh thất bại!", "error");
    } finally {
       setIsLoading(false);
    }
  }, [toast, onSuccess, onClose, uploadedFiles]);

  const handleSaveClick = useCallback(() => {
    handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

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

  const createMenuClickHandler = useCallback((file) => (e) => {
    handleFileMenuClick(e, file);
  }, [handleFileMenuClick]);

  const renderRecommendationType = useCallback(({ field }) => (
    <InputComponents
      select
      fullWidth
      label="Loại phản ánh"
      required
      options={recommendationTypeOptions}
      customLabel="title"
      customValue="value"
      {...field}
      error={!!errors.recommendationType}
      helperText={errors.recommendationType?.message}
    />
  ), [errors.recommendationType, recommendationTypeOptions]);

  const renderUrgency = useCallback(({ field }) => (
    <InputComponents
      select
      fullWidth
      label="Mức độ"
      required
      options={urgencyOptions}
      customLabel="title"
      customValue="value"
      {...field}
      error={!!errors.urgency}
      helperText={errors.urgency?.message}
    />
  ), [errors.urgency, urgencyOptions]);

  const renderTitle = useCallback(({ field }) => (
    <InputComponents
      fullWidth
      label="Tiêu đề"
      required
      placeholder="Nhập tiêu đề phản ánh"
      {...field}
      error={!!errors.title}
      helperText={errors.title?.message}
    />
  ), [errors.title]);

  const renderContent = useCallback(({ field }) => (
    <InputComponents
      fullWidth
      label="Nội dung"
      required
      placeholder="Nhập nội dung phản ánh"
      multiline
      rows={4}
      {...field}
      error={!!errors.content}
      helperText={errors.content?.message}
    />
  ), [errors.content]);

  return (
    <>
      <CustomSwipper
        open={open && isReady}
        onClose={handleClose}
        title="Thêm mới phản ánh"
        type="add"
        footer={
          <>
          <FlexGrowBox />
            <FooterActions>
              <SaveButton
                variant="contained"
                onClick={handleSaveClick}
                disabled={isLoading}
              >
            {isLoading ? "ĐANG LƯU..." : "LƯU"}
          </SaveButton>
                    </FooterActions>
          </>
        }
      >
        <FormContainer>
          <MainCard>
            <SectionTitle>Thông tin phản ánh kiến nghị</SectionTitle>
            <Grid container spacing={3}>
              {/* Loại phản ánh & Độ khẩn cấp */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="recommendationType"
                  control={control}
                  render={renderRecommendationType}
                />
              </Grid>
              <Grid item xs={12} sm={6}>    
                <Controller
                  name="urgency"
                  control={control}
                  render={renderUrgency}
                />
              </Grid>

              {/* Tiêu đề */}
              <Grid item xs={12}>
                <Controller
                  name="title"
                  control={control}
                  render={renderTitle}
                />
              </Grid>

              {/* Nội dung */}
              <Grid item xs={12}>
                <Controller
                  name="content"
                  control={control}
                  render={renderContent}
                />
              </Grid>
            </Grid>
          </MainCard>

          {/* File minh chứng */}
          <MainCard>
                <SectionTitle>FILE MINH CHỨNG</SectionTitle>
                <UploadHeader>
                  <UploadButton
                    variant="contained"
                    onClick={handleUploadButtonClick}
                    startIcon={<FileUploadOutlinedIcon />}
                  >
                    Tải lên
                  </UploadButton>
                </UploadHeader>
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
                      <TableCell align="center"></TableCell>
                    </TableRow>
                  </StyledTableHead>
                  <TableBody>
                    {uploadedFiles.map((file, index) => (
                      <StyledTableRow key={file.id}>
                        <TableCell align="center">{index + 1}</TableCell>
                        <FileNameCell>
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
        </FormContainer>
        
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
          <MenuItem onClick={handleMenuRemoveFile}>
            <ListItemIcon>
              <RedDeleteIcon />
            </ListItemIcon>
            <RedListItemText>Xóa</RedListItemText>
          </MenuItem>
        </Menu>
      </CustomSwipper>

      <FileViewerDialog
        open={viewingFile.open}
        onClose={handleCloseFileViewer}
        fileUrl={viewingFile.url}
        fileName={viewingFile.name}
        fileType={viewingFile.type}
        title={`Xem file: ${viewingFile.name}`}
      />

      <LoadingDialog open={isLoading}>
        Đang tạo phản ánh, vui lòng đợi...
      </LoadingDialog>
    </>
  );
}

export default withSharedComponents(AddRecommendations);
