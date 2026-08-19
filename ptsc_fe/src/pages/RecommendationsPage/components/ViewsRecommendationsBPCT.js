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
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MenuIcon from "@mui/icons-material/Menu";
import dayjs from "dayjs";
import {
  FormContainer,
  MainCard,
  FileTableContainer,
  StyledTableHead,
  StyledTableRow,
  FileNameCell,
  ActionButtonsWrapper,
  StatusBadgeRed,
  HistoryCard,
  TitleBox,
  TimelineWrapper,
  TimelineItem,
  StatusWrapper,
  TimelineTitle,
  TimelineText,
  TimelineDate,
  SectionHeader,
  BlueButton,
  GreenButton,
  OrangeButton,
  SectionTitle,
  SectionTitleNoMargin,
  MarginBox,
  ReasonText,
  ActionButtonRed,
  BlueMenuIconWrapper,
  BlueVisibilityIcon,
  BlueDownloadIcon
} from "./RecommendationsForm.styles";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { API_REFLECT_SUGGESTIONS, API_VIEW_FILE, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import { FileViewerDialog } from "@components/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import DispatchProcess from "./DispatchProcess";
import RejectRecommendationDialog from "./RejectRecommendationDialog";
import RejectFBSuggestPendingDialog from "./RejectFBSuggestPendingDialog";
import AcceptRecommendationDialog from "./AcceptRecommendationDialog";
import ResultUpdateProcess from "./ResultUpdateProcess";
import ViewEvaluationRecommendationDialog from "./ViewEvaluationRecommendationDialog";
import DOMPurify from "dompurify";
import CustomSwipper from "@components/Swipper/BaseSwiper";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";

function ViewsRecommendations({ open, onClose, data, documentId, sharedComponents, setReloadData }) {
  const { toast, InputComponents: BaseInput } = sharedComponents;

  // Wrapper components to move labels above inputs
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={true} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const [isReady, setIsReady] = useState(false);
  const [showProcessInfo, setShowProcessInfo] = useState(true);
  const [showResultInfo, setShowResultInfo] = useState(true);
  const [viewEvaluationOpen, setViewEvaluationOpen] = useState(false);
  
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const deadlineVal = displayData?.deadlineHighlight || displayData?.deadline;
  
  const [dispatchProcessOpen, setDispatchProcessOpen] = useState(false);
  const [, setDispatchDialogTitle] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectPendingDialogOpen, setRejectPendingDialogOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [resultUpdateOpen, setResultUpdateOpen] = useState(false);
  
  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  const handleCloseFileViewer = useCallback(() => {
    if (viewingFile.url) URL.revokeObjectURL(viewingFile.url);
    setViewingFile({ open: false, url: null, name: "", type: null });
  }, [viewingFile.url]);

  const handleViewFile = useCallback(async (file) => {
    if (!file) return;

    const fileName = file.file_name || file.name;
    const lower = fileName.toLowerCase();
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|txt)$/i.test(lower);

    // Server file check
    const fileId = file.id || file._id;
    if (!fileId) {
      toast("File không hợp lệ.", "warning");
      return;
    }

    try {
      setLoading(true);
      let blob;
      let previewType = null;

      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const res = await axiosInstance.get(conversionApi, { responseType: "blob" });
        blob = new Blob([res.data || res], { type: "application/pdf" });
        previewType = "pdf";
      } else if (isExcel) {
        const downloadRes = await axiosInstance.get(`${APP_BASE}/api/files/download/${fileId}`, { responseType: "blob" });
        const fileBlob = downloadRes.data || downloadRes;

        const formData = new FormData();
        formData.append("file", new File([fileBlob], fileName));
        const res = await axiosInstance.post(API_XLSX_TO_PDF, formData, { responseType: "blob" });
        blob = new Blob([res.data || res], { type: "application/pdf" });
        previewType = "pdf";
      } else if (isBrowserFile) {
        const res = await axiosInstance.get(`${API_VIEW_FILE}/${fileId}`, { responseType: "blob" });
        blob = res.data || res;
        
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
      toast("File không hợp lệ để tải xuống.", "warning");
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
    handleFileMenuClick(e, file);
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

  const fetchData = useCallback(async () => {
    const id = data?.id || data?._id || documentId;
    if (!id) return;

    try {
      setLoading(true);
      const res = await axiosInstance.get(`${API_REFLECT_SUGGESTIONS}/${id}`);
      setDisplayData(res?.data?.data || res?.data || res);
    } catch (error) {
      toast("Không thể tải thông tin phản ánh!", "error");
    } finally {
      setLoading(false);
    }
  }, [data, documentId, toast]);

  useEffect(() => {
    if (open && (data || documentId)) {
      fetchData();
    } else {
      setDisplayData(null);
    }
  }, [open, data, documentId, fetchData]);

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

  const handleOpenViewEvaluation = useCallback(() => {
    setViewEvaluationOpen(true);
  }, []);

  const handleCloseViewEvaluation = useCallback(() => {
    setViewEvaluationOpen(false);
  }, []);



  const handleOpenDispatchDialog = useCallback((title) => {
    setDispatchDialogTitle(title);
    setDispatchProcessOpen(true);
  }, []);

  const handleDispatchClick = useCallback(() => {
    handleOpenDispatchDialog("Điều phối phản ánh");
  }, [handleOpenDispatchDialog]);

  const handleReDispatchClick = useCallback(() => {
    handleOpenDispatchDialog("Điều phối lại phản ánh");
  }, [handleOpenDispatchDialog]);

  const handleCloseDispatchDialog = useCallback(() => {
    setDispatchProcessOpen(false);
  }, []);

  const handleConfirmDispatch = useCallback(() => {
    toast("Thực hiện thành công!", "success");
    setDispatchProcessOpen(false);
    fetchData();
    setReloadData?.(prev => prev + 1);
  }, [toast, fetchData, setReloadData]);

  const handleOpenRejectDialog = useCallback(() => {
    setRejectDialogOpen(true);
  }, []);

  const handleCloseRejectDialog = useCallback(() => {
    setRejectDialogOpen(false);
  }, []);

  const handleConfirmReject = useCallback(async (reason) => {
    if (!reason.trim()) {
      toast("Vui lòng nhập lý do từ chối!", "warning");
      return;
    }
    
    try {
      setIsRejecting(true);
      const id = displayData?.id || displayData?._id;
      const payload = {
        overdueReason: reason
      };
      
      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}/reject-dispatch`, payload);
      
      toast("Từ chối phản ánh thành công!", "success");
      setRejectDialogOpen(false);
      fetchData();
      setReloadData?.(prev => prev + 1);
    } catch (error) {
      toast("Có lỗi xảy ra khi từ chối phản ánh!", "error");
    } finally {
      setIsRejecting(false);
    }
  }, [displayData, toast, setReloadData, fetchData]);

  const handleOpenRejectPendingDialog = useCallback(() => {
    setRejectPendingDialogOpen(true);
  }, []);

  const handleCloseRejectPendingDialog = useCallback(() => {
    setRejectPendingDialogOpen(false);
  }, []);

  const handleConfirmRejectPending = useCallback(async ({ reason, returnTarget }) => {
    try {
      setIsRejecting(true);
      const id = displayData?.id || displayData?._id;
      const payload = {
        overdueReason: reason,
        returnTo: returnTarget // creator or dispatcher
      };
      
      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}/reject-unit`, payload);
      
      toast("Từ chối xử lý thành công!", "success");
      setRejectPendingDialogOpen(false);
      fetchData();
      setReloadData?.(prev => prev + 1);
    } catch (error) {
      toast("Có lỗi xảy ra khi từ chối xử lý!", "error");
    } finally {
      setIsRejecting(false);
    }
  }, [displayData, toast, setReloadData, fetchData]);

  const handleAcceptClick = useCallback(() => {
    setAcceptDialogOpen(true);
  }, []);

  const handleCloseAcceptDialog = useCallback(() => {
    setAcceptDialogOpen(false);
  }, []);

  const handleConfirmAccept = useCallback(async () => {
    try {
      setIsAccepting(true);
      const id = displayData?.id || displayData?._id;
      const payload = {
        overdueReason: "Nội dung xử lý"
      };
      
      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}/accept`, payload);
      
      toast("Tiếp nhận phản ánh thành công!", "success");
      setAcceptDialogOpen(false);
      fetchData();
      setReloadData?.(prev => prev + 1);
    } catch (error) {
      toast("Có lỗi xảy ra khi tiếp nhận phản ánh!", "error");
    } finally {
      setIsAccepting(false);
    }
  }, [displayData, toast, setReloadData, fetchData]);

  const handleUpdateResultClick = useCallback(() => {
    setResultUpdateOpen(true);
  }, []);

  const handleCloseResultUpdate = useCallback(() => {
    setResultUpdateOpen(false);
  }, []);

  const handleConfirmResultUpdate = useCallback(() => {
    toast("Cập nhật kết quả thành công!", "success");
    setResultUpdateOpen(false);
    fetchData();
    setReloadData?.(prev => prev + 1);
  }, [toast, fetchData, setReloadData]);

  return (
    <>
      <CustomSwipper
        open={open && isReady}
        onClose={handleClose}
        title="Chi tiết phản ánh kiến nghị"
        type="view"
        footer={
          <>
          <FlexGrowBox />
                    <FooterActions>
                      <ActionButtonsWrapper>
            {displayData?.flags?.canCoordination && (
              <BlueButton 
                  variant="contained" 
                  disabled={loading}
                  onClick={handleDispatchClick}
              >
                ĐIỀU PHỐI
              </BlueButton>
            )}
            {displayData?.flags?.canRedispatch && (
              <BlueButton 
                  variant="contained" 
                  disabled={loading}
                  onClick={handleReDispatchClick}
              >
                ĐIỀU PHỐI LẠI
              </BlueButton>
            )}
            {displayData?.flags?.canAcceptFeedback && (
              <GreenButton
                  variant="contained"
                  disabled={loading}
                  onClick={handleAcceptClick}
              >
                TIẾP NHẬN
              </GreenButton>
            )}
            {displayData?.flags?.canUpdateResult && (
              <OrangeButton
                  variant="contained"
                  disabled={loading}
                  onClick={handleUpdateResultClick}
              >
                CẬP NHẬT KẾT QUẢ
              </OrangeButton>
            )}
            {displayData?.flags?.canViewReview && (
              <BlueButton 
                  variant="contained" 
                  disabled={loading}
                  onClick={handleOpenViewEvaluation}
              >
                XEM ĐÁNH GIÁ
              </BlueButton>
            )}
             {displayData?.flags?.canRejectFBSuggest && (
              <ActionButtonRed 
                  variant="contained" 
                  disabled={loading}
                  onClick={handleOpenRejectDialog}
              >
                TỪ CHỐI
              </ActionButtonRed>
            )}
            {displayData?.flags?.canRejectFBSuggestPenDing && (
              <ActionButtonRed 
                  variant="contained" 
                  disabled={loading}
                  onClick={handleOpenRejectPendingDialog}
              >
                TỪ CHỐI
              </ActionButtonRed>
            )}
          </ActionButtonsWrapper>
                    </FooterActions>
          </>
        }
      >
        <FormContainer>
          <Grid container spacing={2}>
            {/* Left Column */}
            <Grid item xs={12} md={9}>
              {/* Section 1: Thông tin phản ánh */}
              <MainCard>
                <TitleBox>
                  <SectionTitleNoMargin>THÔNG TIN PHẢN ÁNH KIẾN NGHỊ</SectionTitleNoMargin>
                  <StatusWrapper>
                  {displayData?.processStatus ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${displayData?.processStatus}</p>`) }} />
                  ) : (
                    <StatusBadgeRed>Chưa cập nhật</StatusBadgeRed>
                  )}
                </StatusWrapper>
                </TitleBox>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <InputComponents
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
                    <InputComponents
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
                    <InputComponents
                      fullWidth
                      label="Tiêu đề"
                      value={displayData?.title || ""}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <InputComponents
                      fullWidth
                      label="Nội dung"
                      value={displayData?.content || ""}
                      multiline
                    />
                  </Grid>
                </Grid>
              </MainCard>

              {/* Section File Minh chứng */}
              {(displayData?.files?.length > 0) && (
                <MainCard>
                  <SectionTitle>FILE MINH CHỨNG</SectionTitle>
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
                        {(displayData?.files || []).map((file, index) => (
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

              {/* Section 2: Thông tin xử lý */}
             {displayData?.flags?.canInfoHandle && (
               <MainCard>
                <SectionHeader onClick={toggleProcessInfo}>
                  <SectionTitleNoMargin>THÔNG TIN XỬ LÝ</SectionTitleNoMargin>
                  {showProcessInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </SectionHeader>
                {showProcessInfo && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <InputComponents
                        fullWidth
                        label="Đơn vị xử lý"
                        value={displayData?.unitName || ""}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <InputComponents
                        fullWidth
                        label="Người xử lý"
                        value={displayData?.processorName || ""}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <InputComponents
                        fullWidth
                        label="Hạn xử lý (SLA)"
                        value={
                          deadlineVal?.includes('<') ? (
                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(deadlineVal) }} />
                          ) : (
                            deadlineVal ? (/^\d{4}-\d{2}-\d{2}/.test(deadlineVal) ? dayjs(deadlineVal).format('DD/MM/YYYY, HH:mm:ss') : deadlineVal) : ""
                          )
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <InputComponents
                        fullWidth
                        label="Ghi chú"
                        value={displayData?.note || ""}
                        multiline
                      />
                    </Grid>
                  </Grid>
                )}
              </MainCard>
             )}

              {/* Section 3: Kết quả xử lý */}
             {displayData?.flags.canResultHandle && (
               <MainCard>
                <SectionHeader onClick={toggleResultInfo}>
                  <SectionTitleNoMargin>KẾT QUẢ XỬ LÝ</SectionTitleNoMargin>
                  {showResultInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </SectionHeader>
                {showResultInfo && (
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <InputComponents
                        fullWidth
                        label="Kết quả xử lý"
                        value={displayData?.result || ""}
                        multiline
                      />
                    </Grid>
                    {displayData?.isOverdue && (
                      <Grid item xs={12}>
                        <InputComponents
                          fullWidth
                          label="Lý do quá hạn"
                          value={displayData?.overdueReason || ""}
                          multiline
                        />
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <InputComponents
                        fullWidth
                        label="Ghi chú kết quả"
                        value={displayData?.note || ""}
                        multiline
                      />
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

              {/* Section 4: Thông tin người tạo */}
              {displayData?.flags?.canInfoPeopleCreate && (
                <MainCard>
                  <SectionHeader>
                    <SectionTitleNoMargin>THÔNG TIN NGƯỜI TẠO</SectionTitleNoMargin>
                  </SectionHeader>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={3}>
                      <InputComponents
                        fullWidth
                        label="Người tạo"
                        value={displayData?.createdBy?.name || displayData?.creator?.name || ""}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <InputComponents
                        fullWidth
                        label="Chức vụ"
                        value={displayData?.createdBy?.position || displayData?.creator?.position || ""}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <InputComponents
                        fullWidth
                        label="Phòng ban"
                        value={displayData?.createdBy?.parent?.name || ""}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <InputComponents
                        fullWidth
                        label="Thời gian tạo"
                        value={displayData?.createdAt ? dayjs(displayData.createdAt).format('DD/MM/YYYY HH:mm:ss') : ""}
                      />
                    </Grid>
                  </Grid>
                </MainCard>
              )}
            </Grid>

            {/* Right Column: History */}
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
          </Grid>
        </FormContainer>
      </CustomSwipper>

      <DispatchProcess
        open={dispatchProcessOpen}
        onClose={handleCloseDispatchDialog}
        onSuccess={handleConfirmDispatch}
        isChild={true}
        data={displayData}
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

      <ViewEvaluationRecommendationDialog
        open={viewEvaluationOpen}
        onClose={handleCloseViewEvaluation}
        data={displayData}
        recommendationTypeOptions={recommendationTypeOptions}
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
      </Menu>

      <RejectRecommendationDialog
        open={rejectDialogOpen}
        onClose={handleCloseRejectDialog}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
      />

      <RejectFBSuggestPendingDialog
        open={rejectPendingDialogOpen}
        onClose={handleCloseRejectPendingDialog}
        onConfirm={handleConfirmRejectPending}
        isLoading={isRejecting}
      />

      <AcceptRecommendationDialog
        open={acceptDialogOpen}
        onClose={handleCloseAcceptDialog}
        onConfirm={handleConfirmAccept}
        data={displayData}
        isLoading={isAccepting}
      />

      <ResultUpdateProcess
        open={resultUpdateOpen}
        onClose={handleCloseResultUpdate}
        onSuccess={handleConfirmResultUpdate}
        isChild={true}
        data={displayData}
      />

      <LoadingDialog open={isRejecting}>
        Đang xử lý từ chối, vui lòng đợi...
      </LoadingDialog>
      
      <LoadingDialog open={isAccepting}>
        Đang xử lý tiếp nhận, vui lòng đợi...
      </LoadingDialog>

      <LoadingDialog open={loading}>
        {"Đang tải dữ liệu bản ghi, vui lòng đợi..."}
      </LoadingDialog>
    </>
  );
}

export default withSharedComponents(ViewsRecommendations);
