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
  Tooltip,
  Box
} from "@mui/material";
import { styled } from "@mui/material/styles";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import MenuIcon from "@mui/icons-material/Menu";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { API_REFLECT_SUGGESTIONS, API_VIEW_FILE, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { FileViewerDialog } from "@components/CustomDialog";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import ConfirmFinishProcessDialog from "./ConfirmFinishProcessDialog";
import LoadingDialog from "@components/LoadingDialog";
import {
  FormContainer,
  MainCard,
  SectionTitleNoMargin,
  FileTableContainer,
  StyledTableHead,
  StyledTableRow,
  FileNameCell,
  StatusWrapper,
  StatusLabel,
  StatusBadgeBlue,
  TitleBox,
  BlueButton,
  UploadHeader,
  UploadButton,
  SectionTitleWithBottomMargin,
  BlueMenuIconWrapper,
  BlueVisibilityIcon,
  BlueDownloadIcon,
  RedDeleteIcon,
  RedListItemText
} from "./RecommendationsForm.styles";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import DOMPurify from "dompurify";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
const SectionTitleNoMarginWithBottom = styled(SectionTitleNoMargin)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));





function ResultUpdateProcess({ open, onClose, data, sharedComponents, onSuccess, isChild = false, setReloadData }) {
  const { InputComponents, toast } = sharedComponents;

  const ViewInputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(InputComponents, "input");
    const Component = (props) => <Wrapped {...props} isView={true} />;
    Component.displayName = "ViewInputComponents";
    return Component;
  }, [InputComponents]);

  const FormInputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(InputComponents, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "FormInputComponents";
    return Component;
  }, [InputComponents]);

  const [isReady, setIsReady] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const deadlineVal = displayData?.deadlineHighlight || displayData?.deadline;
  
  // Update state
  const [resultContent, setResultContent] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const fileInputRef = React.useRef(null);

  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  const handleCloseFileViewer = useCallback(() => {
    setViewingFile((prev) => ({ ...prev, open: false, url: "" }));
  }, []);

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
      setLoading(true);
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
      setLoading(false);
    }
  }, [toast]);

  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);
  const [isViewOnlyMenu, setIsViewOnlyMenu] = useState(false);

  const handleFileMenuClick = useCallback((event, file, viewOnly = false) => {
    event.stopPropagation();
    setFileMenuAnchor(event.currentTarget);
    setSelectedFileForMenu(file);
    setIsViewOnlyMenu(viewOnly);
  }, []);

  const handleFileMenuClose = useCallback(() => {
    setFileMenuAnchor(null);
    setSelectedFileForMenu(null);
    setIsViewOnlyMenu(false);
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id && f._id !== id));
  }, []);

  const handleMenuRemoveFile = useCallback(() => {
    if (selectedFileForMenu) {
      handleRemoveFile(selectedFileForMenu.id || selectedFileForMenu._id);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, handleRemoveFile, handleFileMenuClose]);

  const handleMenuViewFile = useCallback(() => {
    if (selectedFileForMenu) {
       handleViewFile(selectedFileForMenu);
    }
    handleFileMenuClose();
  }, [selectedFileForMenu, handleViewFile, handleFileMenuClose]);

  const handleDownloadFile = useCallback(async () => {
    if (!selectedFileForMenu) return;
    
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
      handleFileMenuClose();
      return;
    }

    const fileId = selectedFileForMenu.id || selectedFileForMenu._id;
    if (!fileId) {
      handleFileMenuClose();
      return;
    }

    try {
      setLoading(true);
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
      setLoading(false);
      handleFileMenuClose();
    }
  }, [selectedFileForMenu, toast, handleFileMenuClose]);

  const createViewFileHandler = useCallback((file) => () => {
    handleViewFile(file);
  }, [handleViewFile]);

  const createMenuClickHandler = useCallback((file) => (e) => {
    handleFileMenuClick(e, file, false);
  }, [handleFileMenuClick]);

  const createViewOnlyMenuClickHandler = useCallback((file) => (e) => {
    handleFileMenuClick(e, file, true);
  }, [handleFileMenuClick]);

  const { crmSource } = useSelector((state) => state.config);
  const recommendationTypeOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIPHANANH")?.data || [],
    [crmSource]
  );

  const urgencyOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIMUCDO")?.data || [],
    [crmSource]
  );

  const handleResultChange = useCallback((e) => {
    setResultContent(e.target.value);
  }, []);

  const handleNoteChange = useCallback((e) => {
    setNote(e.target.value);
  }, []);

  const handleFileUpload = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);

    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const validFiles = selectedFiles.filter((file) => {
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
      rawFile: file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = null;
  }, [toast]);

  const handleUploadButtonClick = useCallback(() => {
    fileInputRef.current.click();
  }, []);

  const fetchData = useCallback(() => {
    if (open && data) {
      const id = data.id || data._id;
      if (id) {
        setLoading(true);
        axiosInstance.get(`${API_REFLECT_SUGGESTIONS}/${id}`)
          .then(res => {
            setDisplayData(res?.data?.data || res?.data || res);
          })
          .catch(() => {
            toast("Không thể tải thông tin phản ánh!", "error");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [open, data, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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



  const handleFinish = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  const handleConfirmFinish = useCallback(async () => {
    try {
      setLoading(true);
      const id = displayData?.id || displayData?._id;
      const payload = {
        result: resultContent,
        note: note,
        overdueReason: null
      };

      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}/complete`, payload);

      // Upload file nếu có
      if (files.length > 0) {
        for (const fileItem of files) {
          if (fileItem.rawFile) {
            try {
              await apiUploadFile(fileItem.rawFile, "feedback_suggestions_result", id);
            } catch (err) {
              // toast(`Tải lên tệp ${fileItem.name} thất bại.`, "warning");
            }
          }
        }
      }

      toast("Hoàn tất cập nhật kết quả!", "success");
      setConfirmDialogOpen(false);
      if (isChild) {
        onSuccess?.();
        onClose();
      } else {
        fetchData();
        setReloadData?.(prev => prev + 1);
      }
    } catch (error) {
      toast("Cập nhật kết quả thất bại!", "error");
    } finally {
      setLoading(false);
    }
  }, [displayData, resultContent, note, files, toast, onSuccess, onClose, isChild, fetchData, setReloadData]);

  return (
    <CustomSwipper
      open={open && isReady}
      onClose={handleClose}
      title="Cập nhật kết quả xử lý"
      type="view"
      footer={
        <>
          <FlexGrowBox />
          <FooterActions>
            <BlueButton variant="contained" disabled={loading} onClick={handleFinish}>
              HOÀN TẤT
            </BlueButton>
          </FooterActions>
        </>
      }
    >
      <FormContainer>
        <Grid container spacing={2}>
          {/* Cột trái: Thông tin phiếu và Thông tin xử lý */}
          <Grid item xs={12} md={6}>
            <MainCard>
              <TitleBox>
                <SectionTitleNoMargin>THÔNG TIN PHẢN ÁNH KIẾN NGHỊ</SectionTitleNoMargin>
                <StatusWrapper>
                  <StatusLabel>Trạng thái hồ sơ:</StatusLabel>
                  {displayData?.processStatus ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${displayData.processStatus}</p>`) }} />
                  ) : (
                    <StatusBadgeBlue>Đang xử lý</StatusBadgeBlue>
                  )}
                </StatusWrapper>
              </TitleBox>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <ViewInputComponents
                    select
                    fullWidth
                    label="Loại phản ánh"
                    value={displayData?.types || ""}
                    options={recommendationTypeOptions}
                    customLabel="title"
                    customValue="value"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <ViewInputComponents
                    select
                    fullWidth
                    label="Mức độ"
                    value={displayData?.priority || ""}
                    options={urgencyOptions}
                    customLabel="title"
                    customValue="value"
                  />
                </Grid>
                <Grid item xs={12}>
                  <ViewInputComponents
                    fullWidth
                    label="Tiêu đề"
                    value={displayData?.title || ""}
                  />
                </Grid>
                <Grid item xs={12}>
                  <ViewInputComponents
                    fullWidth
                    label="Nội dung"
                    value={displayData?.content || ""}
                    multiline
                  />
                </Grid>
              </Grid>
            </MainCard>

            <MainCard>
              <SectionTitleWithBottomMargin>FILE MINH CHỨNG</SectionTitleWithBottomMargin>
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
                    {(displayData?.files || []).map((file, index) => (
                      <StyledTableRow key={file.id || file._id}>
                        <TableCell align="center">{index + 1}</TableCell>
                        <FileNameCell onClick={createViewFileHandler(file)}>
                          {file.file_name || file.name}
                        </FileNameCell>
                        <TableCell align="center">
                          <BlueMenuIconWrapper size="small" onClick={createViewOnlyMenuClickHandler(file)}>
                            <MenuIcon />
                          </BlueMenuIconWrapper>
                        </TableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </FileTableContainer>
            </MainCard>

            <MainCard>
              <SectionTitleNoMarginWithBottom>THÔNG TIN XỬ LÝ</SectionTitleNoMarginWithBottom>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={4}>
                  <Tooltip title={displayData?.unitName || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Đơn vị xử lý"
                        value={displayData?.unitName || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                  <Tooltip title={displayData?.processorName || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Người xử lý"
                        value={displayData?.processorName || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                  <Tooltip 
                    title={deadlineVal?.includes('<') ? "Hạn xử lý đặc biệt" : (deadlineVal ? (dayjs(deadlineVal).isValid() ? dayjs(deadlineVal).format('DD/MM/YYYY, HH:mm') : deadlineVal) : "")} 
                    placement="top" 
                    arrow
                  >
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Hạn xử lý (SLA)"
                        value={deadlineVal?.includes('<') ? deadlineVal.replace(/<[^>]*>?/gm, '') : (deadlineVal ? (dayjs(deadlineVal).isValid() ? dayjs(deadlineVal).format('DD/MM/YYYY, HH:mm') : deadlineVal) : "")}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12}>
                  <ViewInputComponents
                    fullWidth
                    label="Ghi chú"
                    value={displayData?.note || ""}
                    multiline
                  />
                </Grid>
              </Grid>
            </MainCard>

            <MainCard>
              <SectionTitleWithBottomMargin>THÔNG TIN NGƯỜI TẠO</SectionTitleWithBottomMargin>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdBy?.name || displayData?.creator?.name || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Người tạo"
                        value={displayData?.createdBy?.name || displayData?.creator?.name || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdBy?.position || displayData?.creator?.position || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Chức vụ"
                        value={displayData?.createdBy?.position || displayData?.creator?.position || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdBy?.parent?.name || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Phòng ban"
                        value={displayData?.createdBy?.parent?.name || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdAt ? dayjs(displayData.createdAt).format('DD/MM/YYYY HH:mm:ss') : ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Thời gian tạo"
                        value={displayData?.createdAt ? dayjs(displayData.createdAt).format('DD/MM/YYYY HH:mm:ss') : ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>

          {/* Cột phải: Form cập nhật kết quả */}
          <Grid item xs={12} md={6}>
            <MainCard>
              <SectionTitleNoMarginWithBottom>KẾT QUẢ XỬ LÝ</SectionTitleNoMarginWithBottom>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormInputComponents
                    fullWidth
                    label="Kết quả xử lý"
                    required
                    multiline
                    rows={1}
                    placeholder="Nhập nội dung kết quả"
                    value={resultContent}
                    onChange={handleResultChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormInputComponents
                    fullWidth
                    label="Ghi chú"
                    multiline
                    rows={1}
                    placeholder="Nhập nội dung ghi chú"
                    value={note}
                    onChange={handleNoteChange}
                  />
                </Grid>
              </Grid>
            </MainCard>

            <MainCard>
              <SectionTitleWithBottomMargin>FILE MINH CHỨNG KẾT QUẢ</SectionTitleWithBottomMargin>
              <UploadHeader>
                <UploadButton
                  variant="contained"
                  startIcon={<FileUploadOutlinedIcon />}
                  onClick={handleUploadButtonClick}
                >
                  Tải Lên
                </UploadButton>
              </UploadHeader>
              <input
                type="file"
                hidden
                multiple
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
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
                    {files.map((file, index) => (
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
          </Grid>
        </Grid>
      </FormContainer>

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
        {!isViewOnlyMenu && (
          <MenuItem onClick={handleDownloadFile}>
            <ListItemIcon>
              <BlueDownloadIcon />
            </ListItemIcon>
            <ListItemText>Tải xuống</ListItemText>
          </MenuItem>
        )}
        {!isViewOnlyMenu && (
          <MenuItem onClick={handleMenuRemoveFile}>
            <ListItemIcon>
              <RedDeleteIcon />
            </ListItemIcon>
            <RedListItemText>Xóa</RedListItemText>
          </MenuItem>
        )}
      </Menu>

      <ConfirmFinishProcessDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmFinish}
        data={displayData}
        resultContent={resultContent}
        isLoading={loading}
      />

      <LoadingDialog open={loading}>
        {"Đang xử lý hoàn tất, vui lòng đợi..."}
      </LoadingDialog>
    </CustomSwipper>
  );
}

export default withSharedComponents(ResultUpdateProcess);
