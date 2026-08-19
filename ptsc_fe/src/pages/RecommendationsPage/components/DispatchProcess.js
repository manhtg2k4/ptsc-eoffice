import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from "@mui/material";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { API_REFLECT_SUGGESTIONS, API_VIEW_FILE, API_GET_LIST_UNIT, API_GET_LIST_USERS, APP_BASE, API_XLSX_TO_PDF, API_GET_LIST_USER_BY_ORGANIZATION_UNIT_PENDING } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";
import { FileViewerDialog } from "@components/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import DispatchRecommendationDialog from "./DispatchRecommendationDialog";
import {
  FormContainer,
  MainCard,
  SectionTitle,
  FileTableContainer,
  StyledTableHead,
  StyledTableRow,
  FileNameCell,
  StatusBadge,
  TitleBox,
  StatusWrapper,
  LabelText,
  BlueButton,
  SectionTitleNoMargin,
  BlueMenuIconWrapper,
  BlueVisibilityIcon
} from "./RecommendationsForm.styles";
import { styled } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DOMPurify from "dompurify";
import { FlexGrowBox, FooterActions } from "@styles/BaseSwiper/BaseSwiper.style";
import CustomSwipper from "@components/Swipper/BaseSwiper";

const CustomRadioBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(0.5),
  padding: theme.spacing(0, 2),
  backgroundColor: theme.palette.background.paper,
  minHeight: "41px",
  gap: theme.spacing(2),
}));

const SLAMessageBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(2),
}));

const DateInputWrapper = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  width: '100%',
  borderRadius: theme.spacing(0.5),
  padding: theme.spacing(0.5),
}));


const MainCardFullHeight = styled(MainCard)({
  
});

// const RightAlignBox = styled(Box)({
//   flexGrow: 1,
//   textAlign: "right",
// });

const CaptionTextSecondary = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.75rem",
}));

// const BlueBoldSpan = styled("span")({
//   color: "#0066CC",
//   fontWeight: 600,
// });

const OptionContent = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  flex: 1,
});

const TaskBadge = styled(Box)({
  backgroundColor: "#f5f5f5",
  color: "#1976d2",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.75rem",
});

function DispatchProcess({ open, onClose, data, sharedComponents, onSuccess, isChild = false, setReloadData }) {
  const { InputComponents, DatePicker, toast } = sharedComponents;

  // Wrapper components to move labels above inputs
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

  const FormAsyncAutoCompleted = useMemo(() => {
    const Wrapped = withFormWrapper(sharedComponents.AsyncAutoCompleted, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "FormAsyncAutoCompleted";
    return Component;
  }, [sharedComponents.AsyncAutoCompleted]);

  const FormDatePicker = useMemo(() => {
    const Wrapped = withFormWrapper(DatePicker, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "FormDatePicker";
    return Component;
  }, [DatePicker]);

  const [isReady, setIsReady] = useState(false);
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [unitId, setUnitId] = useState("");
  const [processorId, setProcessorId] = useState("");
  const [deadlineType, setDeadlineType] = useState("default");
  const [customDeadline, setCustomDeadline] = useState(dayjs().format('YYYY-MM-DD'));
  const [note, setNote] = useState("");

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedProcessor, setSelectedProcessor] = useState(null);

  const [viewingFile, setViewingFile] = useState({
    open: false,
    url: null,
    name: "",
    type: null,
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

	// Xác định số ngày hạn xử lý mặc định (1 ngày cho Khẩn cấp, 7 ngày cho Bình thường)
	const resolvedNumDay = useMemo(() => {
		if (displayData?.num_day) return parseInt(displayData.num_day);
		if (displayData?.priority?.includes("Khẩn cấp")) return 1;
		return 7;
	}, [displayData]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File menu states
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState(null);

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

  const createViewFileHandler = useCallback((file) => () => {
    handleViewFile(file);
  }, [handleViewFile]);

  const createMenuClickHandler = useCallback((file) => (e) => {
    handleFileMenuClick(e, file);
  }, [handleFileMenuClick]);

  useEffect(() => {
    // Tự động load khi mở nếu cần (AsyncAutoCompleted tự handle load on open)
  }, []);

  const handleChangeUnit = useCallback((e) => {
    const value = e?.target ? e.target.value : e;
    setUnitId(value);
    setProcessorId("");
    setSelectedProcessor(null);
  }, []);

  const handleChangeProcessor = useCallback((e) => {
    const value = e?.target ? e.target.value : e;
    setProcessorId(value);
  }, []);

  const handleChangeDeadlineType = useCallback((e) => {
    const value = e?.target ? e.target.value : e;
    setDeadlineType(value);
    
    // Khi chọn điều chỉnh hạn, fill sẵn ngày mặc định từ SLA
    if (value === "custom") {
      const defaultDate = dayjs().add(resolvedNumDay, 'day');
      setCustomDeadline(defaultDate.toDate());
    }
  }, [resolvedNumDay]);

  const handleChangeCustomDeadline = useCallback((date) => {
    setCustomDeadline(date);
  }, []);

  const handleChangeNote = useCallback((e) => {
    const value = e?.target ? e.target.value : e;
    setNote(value);
  }, []);

  const { crmSource } = useSelector((state) => state.config);
  
  const processorUrl = useMemo(() => {
    if (!unitId) return `${API_GET_LIST_USERS}/all?countProcessingFeedback=true`;
    return `${API_GET_LIST_USER_BY_ORGANIZATION_UNIT_PENDING}?organizationUnit=${unitId}&countProcessingFeedback=true`;
  }, [unitId]);

  const recommendationTypeOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIPHANANH")?.data || [],
    [crmSource]
  );

  const urgencyOptions = useMemo(
    () => crmSource.find((item) => item.code === "LOAIMUCDO")?.data || [],
    [crmSource]
  );

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



  const handleSendDispatch = useCallback(() => {
    if (!unitId || !processorId) {
      toast("Vui lòng chọn đầy đủ Đơn vị và Người xử lý!", "warning");
      return;
    }

    if (deadlineType === "custom") {
      if (!customDeadline) {
        toast("Vui lòng chọn ngày hạn xử lý!", "warning");
        return;
      }
    }

    setConfirmDialogOpen(true);
  }, [unitId, processorId, deadlineType, customDeadline, toast]);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (!unitId || !processorId) {
      toast("Vui lòng chọn đầy đủ đơn vị và người xử lý!", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const id = displayData?.id || displayData?._id;
      
      let calculatedDeadline;
      if (deadlineType === "custom") {
        calculatedDeadline = dayjs(customDeadline).endOf('day').toISOString();
      } else {
        calculatedDeadline = dayjs().add(resolvedNumDay, 'day').toISOString();
      }

      const payload = {
        deadline: calculatedDeadline,
        note: note || "Chuyển đơn vị xử lý",
        unitId: unitId,
        processorId: processorId
      };

      await axiosInstance.patch(`${API_REFLECT_SUGGESTIONS}/${id}/dispatch`, payload);
      
      toast("Gửi điều phối thành công!", "success");
      setConfirmDialogOpen(false);
      if (isChild) {
        onSuccess?.();
        onClose();
      } else {
        fetchData();
        setReloadData?.(prev => prev + 1);
      }
    } catch (error) {
      toast(error?.response?.data?.message || "Gửi điều phối thất bại!", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [displayData, deadlineType, customDeadline, note, unitId, processorId, toast, onSuccess, onClose, isChild, fetchData, setReloadData, resolvedNumDay]);

  return (
    <CustomSwipper
      open={open && isReady}
      onClose={handleClose}
      title="Điều phối xử lý"
      type="view"
      footer={
       <>
        <FlexGrowBox />
                 <FooterActions>
                   <BlueButton variant="contained" disabled={loading} onClick={handleSendDispatch}>
          GỬI ĐIỀU PHỐI
        </BlueButton>
                 </FooterActions>
       </>
      }
    >
      <FormContainer>
        <Grid container spacing={2}>
          {/* Cột trái: Thông tin phản ánh */}
          <Grid item xs={12} md={6}>
            <MainCard>
              <TitleBox>
                <SectionTitleNoMargin>THÔNG TIN PHẢN ÁNH KIẾN NGHỊ</SectionTitleNoMargin>
                <StatusWrapper>
                  {displayData?.processStatus ? (
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${displayData.processStatus}</p>`) }} />
                  ) : (
                    <StatusBadge>Chờ điều phối</StatusBadge>
                  )}
                </StatusWrapper>
              </TitleBox>

              <Grid container spacing={3}>
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
              <SectionTitleWithMargin>FILE MINH CHỨNG</SectionTitleWithMargin>
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
                    {(displayData?.files || [
                      { name: "fileminhchung.pdf", size: 205414, id: "2" },
                    ]).map((file, index) => (
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

            <MainCard>
              <SectionTitleWithMargin>THÔNG TIN NGƯỜI TẠO</SectionTitleWithMargin>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdBy?.name || displayData?.creator?.fullName || displayData?.creator?.name || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Người tạo"
                        value={displayData?.createdBy?.name || displayData?.creator?.fullName || displayData?.creator?.name || ""}
                      />
                    </Box>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <Tooltip title={displayData?.createdBy?.position || displayData?.creator?.positionName || displayData?.creator?.position || ""} placement="top" arrow>
                    <Box>
                      <ViewInputComponents
                        fullWidth
                        label="Chức vụ"
                        value={displayData?.createdBy?.position || displayData?.creator?.positionName || displayData?.creator?.position || ""}
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

          {/* Cột phải: Form điều phối */}
          <Grid item xs={12} md={6}>
            <MainCardFullHeight>
              <SectionTitle>ĐIỀU PHỐI XỬ LÝ PHẢN ÁNH</SectionTitle>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormAsyncAutoCompleted
                    fullWidth
                    label="Đơn vị xử lý"
                    placeholder="Tìm kiếm đơn vị"
                    value={unitId}
                    onChange={handleChangeUnit}
                    selectedOptions={setSelectedUnit}
                    url={API_GET_LIST_UNIT}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="_id"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormAsyncAutoCompleted
                    fullWidth
                    label="Người xử lý"
                    placeholder="Tìm kiếm người xử lý"
                    value={processorId}
                    onChange={handleChangeProcessor}
                    selectedOptions={setSelectedProcessor}
                    url={processorUrl}
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    required
                    renderOption={(props, option) => (
                      <li {...props}>
                        <OptionContent>
                          <Typography variant="body2">{option.name}</Typography>
                          <TaskBadge>
                            {option?.taskCount ?? option?.totalTask ?? 3} tasks
                          </TaskBadge>
                        </OptionContent>
                      </li>
                    )}
                  />
                </Grid>
                {!(displayData?.priority?.includes("Khẩn cấp")) && (
                  <Grid item xs={12}>
                    <LabelText>Điều chỉnh hạn xử lý</LabelText>
                    <CustomRadioBox>
                      <RadioGroup
                        row
                        value={deadlineType}
                        onChange={handleChangeDeadlineType}
                      >
                        <FormControlLabel 
                          value="default" 
                          control={<Radio size="small" />} 
                          label={<Typography variant="body2">Giữ mặc định</Typography>} 
                        />
                        <FormControlLabel 
                          value="custom" 
                          control={<Radio size="small" />} 
                          label={<Typography variant="body2">Điều chỉnh hạn xử lý</Typography>} 
                        />
                      </RadioGroup>
                      
                      <SLAMessageBox>
                        <CaptionTextSecondary>
                          Hạn mặc định theo SLA: {dayjs().add(resolvedNumDay, 'day').format('DD/MM/YYYY')}
                        </CaptionTextSecondary>
                      </SLAMessageBox>
                    </CustomRadioBox>
                    
                    {deadlineType === "custom" && (
                      <DateInputWrapper>
                        <FormDatePicker
                          label="Chọn ngày hạn xử lý"
                          value={customDeadline}
                          onChange={handleChangeCustomDeadline}
                          required
                          futureOnly
                        />
                      </DateInputWrapper>
                    )}
                  </Grid>
                )}
                <Grid item xs={12}>
                  <FormInputComponents
                    fullWidth
                    label="Ghi chú"
                    multiline
                    rows={6}
                    placeholder="Nhập ghi chú"
                    value={note}
                    onChange={handleChangeNote}
                  />
                </Grid>
              </Grid>
            </MainCardFullHeight>
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
      </Menu>

      <DispatchRecommendationDialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        onConfirm={handleConfirmSubmit}
        isLoading={isSubmitting}
        data={{
          ...displayData,
          unitId: unitId,
          processorId: processorId,
          unitName: selectedUnit?.name || "N/A",
          processorName: selectedProcessor?.name || "N/A",
          note: note,
          deadline: (deadlineType === "custom" 
            ? dayjs(customDeadline).endOf('day').toISOString()
            : dayjs().add(resolvedNumDay, 'day').toISOString())
        }}
        title="Điều phối phản ánh"
      />

      <LoadingDialog open={isSubmitting}>
        Đang gửi điều phối, vui lòng đợi...
      </LoadingDialog>
    </CustomSwipper>
  );
}

// Bổ sung style SectionTitle có margin bottom 2 đơn vị giống ViewsRecommendations
const SectionTitleWithMargin = styled(SectionTitleNoMargin)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

export default withSharedComponents(DispatchProcess);
