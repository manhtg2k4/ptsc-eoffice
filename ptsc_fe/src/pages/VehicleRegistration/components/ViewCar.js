import React, { useEffect, useMemo } from "react";
import {
  SkyGrid as Grid,
  SkyBox,
  SkyMenu as Menu,
  SkyMenuItem as MenuItem,
  SkyListItemText as ListItemText,
} from "@styles/SkyStyles";
import { 
  Popover, 
  // Button as MuiButton,
  // FormControl,
  // InputLabel,
  // Select,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
// import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { withFormWrapper } from "@components/common/FormWrapper";
import { 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";

import {
  API_LIST_CARS,
  API_VIEW_FILE,
  APP_BASE, API_LIST_DRIVERS,
  API_VEHICLE_REQUEST,
  API_XLSX_TO_PDF
} from '@EnvironmentFile/constants/urlConfig';
import ViewRequest from "./ViewRequest";
import {
  JobMainContent,
  // StyledGalleryImage,
  TimelineContainer,
  TimelineItem,
  TimelineDotBox,
  TimelineContent,
  TimelineAction,
  TimelineTime,
  TimelineDivider,
  HistoryDot,
  TimelineLine,
  JobUploadPlaceholderBox,
  // JobPlaceholderText as JobPlaceholderTextBase,
  StyledMenuIcon,
  StyledListItemIcon,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  BlueHeaderPopoverContainer,
  BlueHeaderPopoverTitle,
  PopoverHeaderText,
  QuickDateRow,
  QuickDateItem,
  DateInputsRow,
  FilterActionsSpaced,
  BlueFilterIcon,
  DarkEventIcon,
  QuickDateText,
  PopoverContent,
  DateRangeLabel,
  DateRangeInputGroup,
  CenteredJobPlaceholderText,
  SmallVisibilityIcon,
  // FilterPopoverContent,
  // PopoverTitle,
  TimelineCreatorText,
  NotificationBadge,
  FilterOutlinedButton,
  FilterApplyButton,
  FlexGapBox,
  SidebarTabContainer,
  SidebarTabItem,
  HistorySummaryBox,
  HistorySummaryItem,
  SummaryLabel,
  SummaryValue,
  TripListContainer,
  TripItemBox,
  TripTitle,
  TripDetail,
  TripStatus,
  ViewAllLink,
  StatusTag,
  StatusContainer,
  StatusLabel,
  StyledFilterIcon,
  FilterLabel,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";

import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";

import LoadingDialog from "@components/LoadingDialog";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import HistoryIcon from "@mui/icons-material/History";
// import EventIcon from '@mui/icons-material/Event';
// import FilterListIcon from "@mui/icons-material/FilterList";
// import FilterListIcon from "@mui/icons-material/FilterList";

import dayjs from "dayjs";
import api from "@services/api";
import { useToast } from "@components/common/ToastProvider";
// import EditIcon from "@mui/icons-material/Edit";
import UpdateCar from "./UpdateCar";
import DOMPurify from "dompurify";
const HistoryTimeline = ({ history = [], onItemClick }) => {
  const makeHandleClick = (id) => () => {
    if (onItemClick) {
      onItemClick(id);
    }
  };

  return (
    <TimelineContainer>
      {history.map((item, index) => (
        <TimelineItem key={item.id || index} onClick={makeHandleClick(item.id)}>
          {/* Vertical Line */}
          {index !== history.length - 1 && <TimelineLine />}
          {/* Dot */}
          <TimelineDotBox>
            <HistoryDot />
          </TimelineDotBox>
          {/* Content */}
          <TimelineContent>
            <TimelineAction variant="body2">
              {item.action}
            </TimelineAction>
            <TimelineTime variant="caption">
               {item.time}
            </TimelineTime>
            {item.user && (
              <TimelineCreatorText variant="caption">
                Người tạo: {item.user}
              </TimelineCreatorText>
            )}
            {index !== history.length - 1 && <TimelineDivider />}
          </TimelineContent>
        </TimelineItem>
      ))}
    </TimelineContainer>
  );
};

const ViewCar = ({
  open,
  onClose,
  id,
  // onSuccess,
  sharedComponents,
  title = "Chi tiết xe",
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    AsyncAutoCompleted: BaseAsyncAutoCompleted,
    DatePicker,
    ButtonOutline
  } = sharedComponents;

  const isView = true;
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput, isView]);

  const AsyncAutoCompleted = useMemo(() => {
    const Wrapped = withFormWrapper(BaseAsyncAutoCompleted, "asyncSelect");
    const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
    Component.displayName = "AsyncAutoCompleted";
    return Component;
  }, [BaseAsyncAutoCompleted, isView]);

  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("schedule"); // 'schedule' or 'history'
  const { crmSource } = useSelector((state) => state.config);
const [historyData, setHistoryData] = React.useState([]);
  const [historyTrips, setHistoryTrips] = React.useState([]);
  const [historySummary, setHistorySummary] = React.useState({ total: 0, month: 0 });
  const carTypeOptions =
    crmSource.find((item) => item.code === "LOAI_XE")?.data || [];
  const statusOptions =
    crmSource.find((item) => item.code === "BDX")?.data || [];
  
  // File management for images
  const [carImages, setCarImages] = React.useState([]);

  // File menu and preview state
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");
  const [documentDetail, setDocumentDetail] = React.useState(null);
  const [selectedRequestId, setSelectedRequestId] = React.useState(null);
  const [openViewRequest, setOpenViewRequest] = React.useState(false);
  const [openUpdateCar, setOpenUpdateCar] = React.useState(false);

  const schema = yup.object().shape({
    licensePlate: yup.string().required("Vui lòng nhập biển số xe"),
    carType: yup.string().required("Vui lòng chọn loại xe"),
    carBrand: yup.string().required("Vui lòng nhập hãng xe"),
    seats: yup.string(),
    manager: yup.string().required("Vui lòng chọn người quản lý"),
    status: yup.string().required("Vui lòng chọn trạng thái bảo dưỡng"),
    note: yup.string(),
  });

  const [filterAnchorEl, setFilterAnchorEl] = React.useState(null);
  const [filterValues, setFilterValues] = React.useState({
    driverId: "all",
    fromDate: null,
    toDate: null,
  });
  const [appliedFilters, setAppliedFilters] = React.useState({
    driverId: "all",
    fromDate: null,
    toDate: null,
  });

  const handleFilterClick = React.useCallback((event) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);

  const handleFilterClose = React.useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  const handleOpenRequestDetail = React.useCallback((requestId) => {
    if (requestId) {
        setSelectedRequestId(requestId);
        setOpenViewRequest(true);
    }
  }, []);

  const makeHandleOpenRequestDetail = (requestId) => () => {
    handleOpenRequestDetail(requestId);
  };

  const handleCloseRequestDetail = React.useCallback(() => {
    setOpenViewRequest(false);
    setSelectedRequestId(null);
  }, []);

  const handleFilterInputChange = React.useCallback((field) => (event) => {
    const value = event?.target ? event.target.value : (event || 'all');
    setFilterValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleApplyFilter = React.useCallback(() => {
    setAppliedFilters(filterValues);
    handleFilterClose();
  }, [filterValues, handleFilterClose]);

  const handleResetFilter = React.useCallback(() => {
    const defaultFilters = {
      driverId: "all",
      fromDate: null,
      toDate: null,
    };
    setFilterValues(defaultFilters);
    setAppliedFilters(defaultFilters);
    handleFilterClose();
  }, [handleFilterClose]);

  const handleOpenUpdateCar = React.useCallback(() => {
    setOpenUpdateCar(true);
  }, []);

  const handleCloseUpdateCar = React.useCallback(() => {
    setOpenUpdateCar(false);
  }, []);

  const handleUpdateCarSuccess = React.useCallback(() => {
    setOpenUpdateCar(false);
    onClose();
  }, [onClose]);


  const handleQuickDate = React.useCallback((type) => () => {
    const today = dayjs();
    let fromDate, toDate;
    
    if (type === 'today') {
      fromDate = today;
      toDate = today;
    } else if (type === 'week') {
      fromDate = today.startOf('week');
      toDate = today.endOf('week');
    } else if (type === 'month') {
      fromDate = today.startOf('month');
      toDate = today.endOf('month');
    }
    
    setFilterValues(prev => ({
      ...prev,
      fromDate: fromDate.toDate(),
      toDate: toDate.toDate()
    }));
  }, []);

  const {
    control,
    // handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      manager: "",
      status: "",
      note: "",
    },
  });

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (open && id) {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get(`${API_LIST_CARS}/${id}`);
          const carData = response?.data || response;
          if (carData) {
                        setDocumentDetail(response);

            reset({
              licensePlate: carData.licensePlate || "",
              carType: carData.carType || "",
              carBrand: carData.brand || "",
              seats: carData.seatCount ? String(carData.seatCount) : "",
              manager: typeof carData.manager === "object" && carData.manager ? { ...carData.manager, name: carData.manager.fullName } : (carData.manager || ""),
              status: carData.maintenance || "",
              note: carData.note || "",
            });
          }
        } catch (error) {
          toast("Không thể tải thông tin xe!", "error");
        } finally {
          setIsLoading(false);
        }
      }
    };

    const fetchImages = async () => {
        if (open && id) {
          try {
            const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=listCars&object_id=${id}`);
            if (response && Array.isArray(response)) {
              setCarImages(response.map(img => ({
                id: img.id.toString(),
                name: img.file_name || img.fileName || img.name,
                url: `${API_VIEW_FILE}/${img.id}`
              })));
            }
          } catch (error) {
            logger.error("Error fetching car images:", error);
          }
        }
    };
     const fetchHistory = async () => {
      if (id) {
        try {
          const res = await api.get(`${API_VEHICLE_REQUEST}/${id}/history-car?type=pending`);
          if (res.data) {
            setHistoryData((res.data.items || res.data || []).map(item => ({
              action: `${item.departurePoint || '-'} ➔ ${item.destination || '-'}`,
              opinion: item.opinion || item.notes || "",
              processor: item.processor,
              time: `${item.departureTime || ''} - ${item.returnTime || ''} | ${item.driverName || ''}`,
              user: item.createdBy || "",
              department: item.department || "",
              id: item.id || item._id
            })));
          }
        } catch (error) {
          logger.error("Error fetching history:", error);
        }
      }
    };

  

    fetchCarDetails();
    fetchImages();
    fetchHistory();
  }, [open, id, reset, toast]);

  useEffect(() => {
    const fetchHistoryActivities = async () => {
      if (id) {
        try {
          const queryParams = new URLSearchParams();
          if (appliedFilters.fromDate) queryParams.append('filter[departureTime][startDate]', dayjs(appliedFilters.fromDate).format('YYYY-MM-DD'));
          if (appliedFilters.toDate) queryParams.append('filter[returnTime][endDate]', dayjs(appliedFilters.toDate).format('YYYY-MM-DD'));
          if (appliedFilters.driverId && appliedFilters.driverId !== 'all') queryParams.append('filter[driverIds]', appliedFilters.driverId);

          const qs = queryParams.toString();
          const res = await api.get(`${API_VEHICLE_REQUEST}/${id}/history-car${qs ? `?${qs}` : ''}`);
          if (res.data && res.data.success) {
             const mappedTrips = (res.data.items || []).map(item => ({
               title: `${item.departurePoint || '-'} ➔ ${item.destination || '-'}`,
               time: `${item.departureTime || ''} - ${item.returnTime || ''}`,
               user: item.driverName || item.createdBy || '-',
               status: item.vehicleState || item.status || '-',
               statusCode: item.statusCode || 'UNKNOWN',
               id: item.id || item._id
             }));
             setHistoryTrips(mappedTrips);
             setHistorySummary({
                total: res.data.totalTrips || 0,
                month: res.data.totalTripsMonth || 0
             });
          }
        } catch (error) {
           logger.error("Error fetching history activities:", error);
        }
      }
    };

    fetchHistoryActivities();
  }, [id, appliedFilters]);



  const filteredTrips = historyTrips;

  const handleSwitchToSchedule = React.useCallback(() => {
    setActiveTab("schedule");
  }, []);

  const handleSwitchToHistory = React.useCallback(() => {
    setActiveTab("history");
  }, []);

  // const onSubmit = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     // Backend integration logic
  //     toast("Thêm mới xe thành công!", "success");
  //     onSuccess?.();
  //     onClose();
  //   } catch (error) {
  //     toast(error?.message || "Có lỗi xảy ra!", "error");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [onSuccess, onClose, toast]);

  // const handleSave = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit]);

  const handleFileMenuClick = React.useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    setSelectedFileId(fileId);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = React.useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

  const handleViewFile = React.useCallback(async () => {
    const fileObj = carImages.find(img => img.id === selectedFileId);
    if (!fileObj) {
      handleCloseFileMenu();
      return;
    }

    const fileId = fileObj.id;
    const fileName = fileObj.name || "Tài liệu";
    const lower = fileName.toLowerCase();

    setIsLoading(true);
    try {
      const isDoc = /\.(doc|docx)$/i.test(lower);
      const isExcel = /\.(xls|xlsx)$/i.test(lower);
      const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

      let objectUrl = "";

      if (isDoc) {
        const conversionApi = `${APP_BASE}/api/doc-url-to-pdf?id=${fileId}`;
        const res = await api.get(conversionApi, {
          responseType: "blob",
          timeout: 0,
        });
        const blob = new Blob([res.data], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(blob);
      } else if (isExcel) {
        const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
        const fileRes = await api.get(downloadUrl, {
          responseType: "blob",
          timeout: 0,
        });

        const formData = new FormData();
        formData.append("file", new File([fileRes.data], fileName));

        const res = await api.post(API_XLSX_TO_PDF, formData, {
          responseType: "blob",
          timeout: 0,
        });

        const blob = new Blob([res.data], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(blob);
      } else if (isBrowserFile) {
        const response = await axiosInstance.get(
          `${API_VIEW_FILE}/${fileId}?public=true`,
          { responseType: "blob" }
        );
        const blob = response?.data || response;
        const fileExtension = fileName.split(".").pop().toLowerCase();
        const type = fileExtension === "pdf" ? "application/pdf" : blob.type || "image/jpeg";
        const newBlob = new Blob([blob], { type });
        objectUrl = URL.createObjectURL(newBlob);
      } else {
        const response = await axiosInstance.get(
          `${API_VIEW_FILE}/${fileId}?public=true`,
          { responseType: "blob" }
        );
        const blob = response?.data || response;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: blob.type }));
      }

      if (objectUrl) {
        setPreviewUrl(objectUrl);
        setPreviewFileName(fileName);
        setPreviewOpen(true);
      }
    } catch (error) {
      toast("Không thể tải file để xem trước.", "error");
    } finally {
      setIsLoading(false);
      handleCloseFileMenu();
    }
  }, [carImages, selectedFileId, handleCloseFileMenu, toast]);

  // const handleDownloadFile = React.useCallback(async () => {
  //   const fileObj = carImages.find(img => img.id === selectedFileId);
  //   if (!fileObj) {
  //     handleCloseFileMenu();
  //     return;
  //   }
  //   const fileId = fileObj.id;
  //   const fileName = fileObj.name || "Tài liệu";
  //   setIsLoading(true);
  //   try {
  //     const downloadUrl = `${APP_BASE}/api/files/download/${fileId}`;
  //     const response = await api.get(downloadUrl, {
  //       responseType: "blob",
  //       timeout: 0,
  //     });
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement("a");
  //     link.href = url;
  //     link.setAttribute("download", fileName);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.parentNode.removeChild(link);
  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     toast("Tải file thất bại.", "error");
  //   } finally {
  //     setIsLoading(false);
  //     handleCloseFileMenu();
  //   }
  // }, [carImages, selectedFileId, handleCloseFileMenu, toast]);

  const handleClosePreview = React.useCallback(() => {
    setPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setPreviewFileName("");
  }, [previewUrl]);

  const fileTreeData = React.useMemo(() => {
    return carImages.map((file) => ({
      id: file.id,
      name: file.name,
      isFolder: false
    }));
  }, [carImages]);

  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      type="view"
      hideBackdrop
      isLoading={isLoading}
      moreActions={
        (documentDetail?.statusCarOrigin || documentDetail?.data?.statusCarOrigin) !== "DANG_SU_DUNG" && (
          <ButtonOutline
            variant="contained"
            onClick={handleOpenUpdateCar}
          >
            Chỉnh sửa
          </ButtonOutline>
        )
      }
    >
      <JobMainContent>
        <Grid container spacing={2}>
          {/* LEFT COLUMN: INFO + IMAGES */}
          <Grid item xs={12} md={8.5}>
            {/* SECTION 1: THÔNG TIN XE */}
            <StyledBoxContainerContent>
              <SectionHeaderContainer>
                <StyledHeaderContent variant="h6">
                  THÔNG TIN XE
                </StyledHeaderContent>
                <StatusContainer>
                    <StatusLabel>Trạng thái hồ sơ:</StatusLabel>
                     {documentDetail?.statusCar ? (
                           <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${documentDetail.statusCar}</p>`) }} />
                         ) : (
                    <StatusTag>Sẵn sàng</StatusTag>
                )}
                </StatusContainer>
         
              </SectionHeaderContainer>

       <StyledDivider />
              <Grid container spacing={2}>
                {/* ROW 1 */}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="licensePlate"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Biển số xe"
                        placeholder="Nhập biển số xe"
                        required
                        {...field}
                        error={!!errors.licensePlate}
                        helperText={errors.licensePlate?.message}
                        disabled
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="carType"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Loại xe"
                        placeholder="Chọn loại xe"
                        required
                        options={carTypeOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                        error={!!errors.carType}
                        helperText={errors.carType?.message}
                        disabled
                      />
                    )}
                  />
                </Grid>

                {/* ROW 2 */}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="carBrand"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Hãng xe"
                        placeholder="Nhập hãng xe"
                        required
                        {...field}
                        error={!!errors.carBrand}
                        helperText={errors.carBrand?.message}
                        disabled
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="seats"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Số chỗ ngồi"
                        placeholder="Nhập số chỗ ngồi"
                        {...field}
                        disabled
                      />
                    )}
                  />
                </Grid>

                {/* ROW 3 */}
                <Grid item xs={12} md={6}>
                             <Controller
                               name="manager"
                               control={control}
                               render={({ field }) => (
                                   <AsyncAutoCompleted
                                                                    label="Người quản lý"
                                                                    placeholder="Chọn người quản lý"
                                                                    {...field}
                                                                    url={`${API_LIST_DRIVERS}?unassignedManager=true`}
                                                                    dataPath="items"
                                                                    queryParam="fullName"
                                                                    optionLabel="fullName"
                                                                    optionValue="id"
                                                                    required
                                                                    error={!!errors.manager}
                                                                    helperText={errors.manager?.message}
                                                                    disabled
                                                                  />
                               )}
                             />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Bảo dưỡng"
                        required
                        options={statusOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                        error={!!errors.status}
                        helperText={errors.status?.message}
                        disabled
                      />
                    )}
                  />
                </Grid>

                {/* ROW 4 */}
                <Grid item xs={12}>
                  <Controller
                    name="note"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Ghi chú"
                        placeholder="Nhập ghi chú"
                        multiline
                        rows={2}
                        {...field}
                        disabled
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </StyledBoxContainerContent>

            <StyledBoxContainerContent styledMarginTop>
              <StyledHeaderContent variant="h6">
                HÌNH ẢNH XE
              </StyledHeaderContent>
                     <StyledDivider />

              {carImages.length > 0 ? (
                <>
                    <FileTreeTable
                        data={fileTreeData}
                        onFileMenuClick={handleFileMenuClick}
                        MenuIcon={StyledMenuIcon}
                        // isView={true}
                        // hideDownload={true}
                        showStt
                    />
                    <Menu
                        anchorEl={fileMenuAnchor}
                        open={Boolean(fileMenuAnchor)}
                        onClose={handleCloseFileMenu}
                        id="file-menu"
                    >
                        <MenuItem onClick={handleViewFile}>
                            <StyledListItemIcon>
                                <SmallVisibilityIcon />
                            </StyledListItemIcon>
                            <ListItemText>Xem chi tiết</ListItemText>
                        </MenuItem>
                        {/* <MenuItem onClick={handleDownloadFile}>
                            <StyledListItemIcon>
                                <FileDownloadIcon />
                            </StyledListItemIcon>
                            <ListItemText>Tải xuống</ListItemText>
                        </MenuItem> */}
                    </Menu>
                </>
              ) : (
                <JobUploadPlaceholderBox>
                    <CenteredJobPlaceholderText>
                      Chưa có tài liệu nào được tải lên.
                    </CenteredJobPlaceholderText>
                </JobUploadPlaceholderBox>
              )}
            </StyledBoxContainerContent>
          </Grid>

          {/* RIGHT COLUMN: SIDEBAR */}
          <Grid item xs={12} md={3.5}>
            <StyledBoxContainerContent fullHeight styledPadding={2}>
              <SidebarTabContainer>
                <SidebarTabItem
                  active={activeTab === "schedule"}
                  onClick={handleSwitchToSchedule}
                >
                  <CalendarTodayIcon />
                </SidebarTabItem>
                <SidebarTabItem
                  active={activeTab === "history"}
                  onClick={handleSwitchToHistory}
                >
                  <HistoryIcon />
                  <NotificationBadge />
                </SidebarTabItem>
              </SidebarTabContainer>

              {activeTab === "schedule" ? (
                <>
                  <StyledHeaderContent variant="h6" mb={2}>
                    LỊCH SẮP TỚI
                  </StyledHeaderContent>
                  <HistoryTimeline history={historyData} onItemClick={handleOpenRequestDetail} />
                </>
              ) : (
                <>
                  <SectionHeaderContainer>
                    <StyledHeaderContent variant="h6" mb={0}>
                      LỊCH SỬ HOẠT ĐỘNG
                    </StyledHeaderContent>
                    <StyledFilterIcon onClick={handleFilterClick} />
                  </SectionHeaderContainer>

                  <Popover
                    open={Boolean(filterAnchorEl)}
                    anchorEl={filterAnchorEl}
                    onClose={handleFilterClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ style: { borderRadius: '8px', overflow: 'hidden' } }}
                  >
                      <BlueHeaderPopoverContainer>
                        <BlueHeaderPopoverTitle>
                           <PopoverHeaderText>Bộ lọc</PopoverHeaderText>
                           <BlueFilterIcon />
                        </BlueHeaderPopoverTitle>
                        <PopoverContent>
                           <QuickDateRow>
                              <QuickDateItem onClick={handleQuickDate('today')}>
                                 <DarkEventIcon /> <QuickDateText>Hôm nay</QuickDateText>
                              </QuickDateItem>
                              <QuickDateItem onClick={handleQuickDate('week')}>
                                 <DarkEventIcon /> <QuickDateText>Tuần này</QuickDateText>
                              </QuickDateItem>
                              <QuickDateItem onClick={handleQuickDate('month')}>
                                 <DarkEventIcon /> <QuickDateText>Tháng này</QuickDateText>
                              </QuickDateItem>
                           </QuickDateRow>

                           <DateInputsRow>
                              <DateRangeLabel>Khoảng ngày</DateRangeLabel>
                              <DateRangeInputGroup>
                                  <DatePicker 
                                     value={filterValues.fromDate}
                                     onChange={handleFilterInputChange('fromDate')}
                                     placeholder="dd/mm/yyyy"
                                        
                                  />
                                  <DatePicker 
                                     value={filterValues.toDate}
                                     onChange={handleFilterInputChange('toDate')}
                                     placeholder="dd/mm/yyyy"
                                     
                                  />
                              </DateRangeInputGroup>
                           </DateInputsRow>

                           <SkyBox mb={2}>
                              <FilterLabel>Tài xế</FilterLabel>
                              <AsyncAutoCompleted
                                  placeholder="Tất cả"
                                  value={filterValues.driverId === 'all' ? null : filterValues.driverId}
                                  onChange={handleFilterInputChange('driverId')}
                                  url={`${API_LIST_DRIVERS}?carId=${id}`}
                                  dataPath="items"
                                  queryParam="fullName"
                                  optionLabel="fullName"
                                  optionValue="driverId"
                                  isView={false}
                               />
                           </SkyBox>

                           <FilterActionsSpaced>
                              <FilterOutlinedButton onClick={handleResetFilter}>Đặt lại</FilterOutlinedButton>
                              <FlexGapBox>
                                 <FilterOutlinedButton onClick={handleFilterClose}>Hủy</FilterOutlinedButton>
                                 <FilterApplyButton onClick={handleApplyFilter}>Áp dụng lọc</FilterApplyButton>
                              </FlexGapBox>
                           </FilterActionsSpaced>
                        </PopoverContent>
                     </BlueHeaderPopoverContainer>
                  </Popover>

                  <HistorySummaryBox>
                    <HistorySummaryItem>
                      <SummaryLabel>Tổng số chuyến đi</SummaryLabel>
                      <SummaryValue>{historySummary.total || 0}</SummaryValue>
                    </HistorySummaryItem>
                    <HistorySummaryItem>
                      <SummaryLabel>Tháng này</SummaryLabel>
                      <SummaryValue>{historySummary.month || 0}</SummaryValue>
                    </HistorySummaryItem>
                  </HistorySummaryBox>

                  <TripListContainer>
                    {filteredTrips.map((trip, idx) => (
                      <TripItemBox key={trip.id || idx} onClick={makeHandleOpenRequestDetail(trip.id)}>
                        <TripTitle>{trip.title}</TripTitle>
                        <TripDetail>{trip.time} | {trip.user}</TripDetail>
                        <TripStatus status={trip.statusCode}>
                          Trạng thái: {trip.status}
                        </TripStatus>
                      </TripItemBox>
                    ))}
                    {filteredTrips.length === 0 && (
                       <CenteredJobPlaceholderText>
                         Không tìm thấy chuyến đi nào.
                       </CenteredJobPlaceholderText>
                    )}
                  </TripListContainer>
                  <ViewAllLink>Xem tất cả các chuyến</ViewAllLink>
                </>
              )}
            </StyledBoxContainerContent>
          </Grid>
        </Grid>
      </JobMainContent>

      <LoadingDialog open={isLoading}>
        Đang xử lý, vui lòng đợi...
      </LoadingDialog>

      <FilePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
      />

      <ViewRequest
        open={openViewRequest}
        onClose={handleCloseRequestDetail}
        vehicleRegistrationId={selectedRequestId}
        sharedComponents={sharedComponents}
      />
      <UpdateCar
        open={openUpdateCar}
        onClose={handleCloseUpdateCar}
        id={id}
        onSuccess={handleUpdateCarSuccess}
        sharedComponents={sharedComponents}
      />
    </BaseSwipper>
  );
};

export default withSharedComponents(ViewCar);
