import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "@services/api";
import axiosInstance from "@utils/axiosInstance";
import { 
  API_VEHICLE_REQUEST, 
  APP_BASE, 
  API_VIEW_FILE ,
  API_XLSX_TO_PDF
} from "@EnvironmentFile/constants/urlConfig";
import { typeFlagMap } from "@components/FormButton/constant";
import { useToast } from "@components/common/ToastProvider";
import {
  SkyGrid as Grid,
  SkyMenu as Menu,
  SkyMenuItem as MenuItem,
  SkyListItemText as ListItemText,
} from "@styles/SkyStyles";
import { Controller, useForm, useWatch } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import { Visibility } from "@mui/icons-material";
import { withFormWrapper } from "@components/common/FormWrapper";
import { 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  JobMainContent,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  TimelineContainer,
  TimelineItem,
  TimelineLine,
  TimelineDotBox,
  TimelineContent,
  TimelineAction,
  TimelineTime,
  TimelineDivider,
  // StatusTag,
  StatusLabel,
  StatusContainer,
  // BlueActionButton,
  // CancelButton,
  // HeaderGridContainer,
  HistoryDot,
  CoordinationContainer,
  CoordinationHeader,
  // CoordinationStatusBadge,
  CoordinationSummaryRow,
  SummaryDemand,
  SummaryVehicleStats,
  StatItem,
  // CoordinatedItemBox,
  // // CoordinatedInfo,
  // // InfoLabel,
  // InfoValue,
  // DriverBox,
  // ReCoordinateButton,
  SuccessStatusTag,
  CreatorInfoContainer,
  StyledGroupIcon,
  // StyledDirectionsCarIcon,
  // StyledEventSeatIcon,
  StyledListItemIcon,
  StyledMenuIcon,
  // StyledPersonOutlineIcon,
  // CoordinatedInfoGroup,
  // // CoordinatedInfoRow,
  // CoordinatedValue,
  // ActionGridItem,
  // CoordinatedItemGridContainer,
  // CapacityBox,
  // CoordinationItemStatus,
  SelectionTable,
	TimelineProfile,
  // SmallConfirmButton,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";

import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import FormButton from "@components/FormButton";
import { StyleBoxButton } from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import CoordinateRequests from "./CoordinateRequests";
import UpdateNewRequest from "./UpdateNewRequest";
import ConfirmRemindTheDriverDialog from "./ConfirmRemindTheDriverDialog";
import ViewRequestCoordination from "./ViewRequestCoordination";
import DOMPurify from "dompurify";

// Simple Timeline Component for Request History
const HistoryTimeline = ({ history = [] }) => {
  return (
    <TimelineContainer>
      {history.map((item, index) => (
        <TimelineItem key={item.id || index}>
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
              {item.opinion ? item.opinion : (
                `${item.time || ''} ${item.time && item.user ? '|' : ''} ${item.user || ''} ${item.department ? '- ' + item.department : ''}`
              )}
            </TimelineTime>
						{item?.drivers?.map((item) => {
							return (
								<TimelineProfile key={item?.order}>
									{item?.text}
								</TimelineProfile>
							)
						})}
            {index !== history.length - 1 && <TimelineDivider />}
          </TimelineContent>
        </TimelineItem>
      ))}
    </TimelineContainer>
  );
};



const ViewRequest = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chi tiết yêu cầu đăng ký xe",
  data = {}, // Data passed from the list
  vehicleRegistrationId,
  documentId,
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    // ButtonOutline
  } = sharedComponents;
 const isView = true;
   const InputComponents = useMemo(() => {
     const Wrapped = withFormWrapper(BaseInput, "input");
     const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
     Component.displayName = "InputComponents";
     return Component;
   }, [BaseInput, isView]);
 
   const DateTimePicker = useMemo(() => {
     const Wrapped = withFormWrapper(BaseDateTimePicker, "date");
     const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : isView} />;
     Component.displayName = "DatePicker";
     return Component;
   }, [BaseDateTimePicker, isView]);
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCoordinated, setIsCoordinated] = React.useState(false);
  const [isCreator, setIsCreator] = React.useState(false);
  const [fileList, setFileList] = React.useState([]);
  const [documentDetail, setDocumentDetail] = React.useState(null);
  const [openCoordinate, setOpenCoordinate] = React.useState(false);
  const [openUpdateDrivers, setOpenUpdateDrivers] = React.useState(false);
  const [coordinateActionData, setCoordinateActionData] = React.useState(null);
  const [openRemindTheDriver, setOpenRemindTheDriver] = React.useState(false);
  const [openRecoordinate, setOpenRecoordinate] = React.useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");
  const { crmSource } = useSelector((state) => state.config);

  const requestTypeOptions =
    crmSource.find((item) => item.code === "LYCDKX")?.data || [];
  // const priorityOptions =
  //   crmSource.find((item) => item.code === "DOUUTIENDATXE")?.data || [];
  // const importantGuestsOptions =
  //   crmSource.find((item) => item.code === "TIEPKHACHQUANTRONG")?.data || [];
  const dataForFormButton = React.useMemo(() => {
    if (!documentDetail) return null;

    const flags = {};
    const actions = documentDetail.availableActions || [];

    actions.forEach(a => {
      const flagName = typeFlagMap[a.type];
      if (flagName) flags[flagName] = true;
    });

    return {
      ...documentDetail,
      flags: flags
    };
  }, [documentDetail]);

  const [historyData, setHistoryData] = React.useState([]);

  // Mock Files Data
  // const fileTreeData = [
  //   { id: "1", name: "tepdinhkem1.pdf", 'parent_id': null },
  //   { id: "2", name: "tepdinhkem1.pdf", 'parent_id': null },
  //   { id: "3", name: "tepdinhkem1.pdf", 'parent_id': null },
  // ];

  const {
    control,
    reset,
  } = useForm({
    defaultValues: {
      requestType: "",
      // priority: "",
      // isImportantGuest: "",
      departureTime: null,
      returnTime: null,
      departurePoint: "",
      destination: "",
      passengerCount: "",
      contactPerson: "",
      contactPhone: "",
      // purpose: "",
      note: "",
      username: "",
      positions: "",
      department: "",
      "created_at": "",
    },
  });

  // Mock Coordination Data
  const coordinationDataComputed = React.useMemo(() => {
    const vehicleData = documentDetail?.data || data || {};
    const coordinationInformation = Array.isArray(vehicleData.coordinationInformation) 
      ? vehicleData.coordinationInformation 
      : [];
    
    return {
      // status: vehicleData.coordinationInformation?.confirmed || vehicleData.statusCar || "Chưa điều phối",
      demand: vehicleData.passengerCount || 0,
      vehicleCount: vehicleData.totalCoordinatedCars,
      seatCount: vehicleData.totalSeats,
      items: coordinationInformation
    };
  }, [documentDetail, data]);

  // const isImportantGuest = useWatch({ control, name: "isImportantGuest" });
  const isImportantGuest = "khong";
  const watchedRequestType = useWatch({ control, name: "requestType" });
  // const watchedPriority = useWatch({ control, name: "priority" });
  // const watchedPriority = "";
  const watchedDepartureTime = useWatch({ control, name: "departureTime" });
  const watchedReturnTime = useWatch({ control, name: "returnTime" });
  const watchedDeparturePoint = useWatch({ control, name: "departurePoint" });
  const watchedDestination = useWatch({ control, name: "destination" });
  const watchedPassengerCount = useWatch({ control, name: "passengerCount" });

  const handleProcessingAction = React.useCallback((type, actionData) => {
    if (type === "agree_vehicle_registrant") {
      const actionCode = actionData?.action?.code
        || documentDetail?.availableActions?.find(a => a.type === type)?.code
        || '';
      const workItem = documentDetail?.data?.workItem || documentDetail?.workItem || {};
      setCoordinateActionData({ actionCode, workItem });
      setOpenCoordinate(true);
    }
    if (type === "edit_vehicle_registrant" || type === "edit") {
      setOpenUpdateDrivers(true);
    }
    if (type === "noti_vehicle_registrant" || type === "NotiVehicleRegistrant") {
      setOpenRemindTheDriver(true);
    }
    if (type === "agree_vehicle_registrant_again" || type === "AgreeVehicleRegistrantAgain") {
      const actionCode = actionData?.action?.code
        || documentDetail?.availableActions?.find(a => a.type === type)?.code
        || '';
      const workItem = documentDetail?.data?.workItem || documentDetail?.workItem || {};
      setCoordinateActionData({ actionCode, workItem });
      setOpenRecoordinate(true);
    }
  }, [documentDetail]);

  const fetchRequestDetails = React.useCallback(async () => {
    const requestId = vehicleRegistrationId || documentId;
    if (open && requestId) {
      setIsLoading(true);
      try {
        const res = await api.get(`${API_VEHICLE_REQUEST}/${requestId}`);
        const response = res.data;
        
        if (response && response.success) {
          const vehicleData = response.data;
          setIsCoordinated(vehicleData.isCoordinated === true);
          setIsCreator(vehicleData.isCreator === true);
          setDocumentDetail(response);
          reset({
            requestType: vehicleData.requestType,
            departureTime: vehicleData.departureTime,
            returnTime: vehicleData.returnTime,
            departurePoint: vehicleData.departurePoint,
            destination: vehicleData.destination,
            passengerCount: vehicleData.passengerCount,
            contactPerson: vehicleData.contactPerson,
            contactPhone: vehicleData.contactPhone,
            note: vehicleData.notes,
            username: vehicleData.createdByInfo.name,
            position: vehicleData.createdByInfo.position || "",
            department: vehicleData.createdByInfo.department || "",
            "created_at": vehicleData.createdByInfo.createdAt,
          });
        }
      } catch (error) {
        const errorMessage = error?.response?.data?.message || error?.message || "Không thể tải thông tin yêu cầu!";
        toast(errorMessage, "error");
        logger.error("Error fetching vehicle request:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [open, vehicleRegistrationId, documentId, reset, toast]);

  const fetchFiles = React.useCallback(async () => {
    const requestId = vehicleRegistrationId || documentId;
    if (requestId) {
      try {
        const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=vehicleRegistration&object_id=${requestId}`);
        if (response) {
          setFileList(response);
        }
      } catch (error) {
        logger.error("Error fetching files:", error);
      }
    }
  }, [vehicleRegistrationId, documentId]);

  const fetchHistory = React.useCallback(async () => {
    const requestId = vehicleRegistrationId || documentId;
    if (requestId) {
      try {
        const res = await api.get(`${API_VEHICLE_REQUEST}/${requestId}/history`);
        if (res.data) {
          setHistoryData(res.data.map(item => ({
            action: item.action,
            opinion: item.opinion,
            processor: item.processor,
            time: "",
            user: "",
            department: "",
            drivers: item?.details?.drivers,
            order: item?.order,
          })));
        }
      } catch (error) {
        logger.error("Error fetching history:", error);
      }
    }
  }, [vehicleRegistrationId, documentId]);

  useEffect(() => {
    fetchRequestDetails();
    fetchFiles();
    fetchHistory();
  }, [fetchRequestDetails, fetchFiles, fetchHistory]);

  const handleCloseConfirmDialog = React.useCallback(() => {
   setOpenCoordinate(false)
  }, []);
  const handleCloseUpdateDriversDialog =  React.useCallback(() => {
   setOpenUpdateDrivers(false)
  }, []);
  const handleCloseRemindDialog = React.useCallback(() => {
    setOpenRemindTheDriver(false);
  }, []);
  const handleCloseRecoordinateSwipper = React.useCallback(() => {
    setOpenRecoordinate(false);
  }, []);

  const handleSuccessCoordination = React.useCallback(() => {
    setOpenCoordinate(false);
    setOpenRecoordinate(false);
    fetchRequestDetails();
    fetchFiles();
    fetchHistory();
    if (onSuccess) onSuccess();
  }, [onSuccess, fetchRequestDetails, fetchFiles, fetchHistory]);

  const handleFileMenuClick = React.useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    setSelectedFileId(fileId);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = React.useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

    const handleViewFile = React.useCallback(async () => {
    const fileObj = fileList.find(img => String(img.id) === String(selectedFileId));
    if (!fileObj) {
      handleCloseFileMenu();
      return;
    }

    const fileId = fileObj.id;
    const fileName = fileObj.file_name || fileObj.name || "Tài liệu";
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
  }, [fileList, selectedFileId, handleCloseFileMenu, toast]);

  // const handleDownloadFile = React.useCallback(async () => {
  //   const fileObj = fileList.find(img => img.id === selectedFileId);
  //   if (!fileObj) {
  //     handleCloseFileMenu();
  //     return;
  //   }
  //   const fileId = fileObj.id;
  //   const fileName = fileObj.file_name || fileObj.name || "Tài liệu";
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
  // }, [fileList, selectedFileId, handleCloseFileMenu, toast]);

    const handleClosePreview = React.useCallback(() => {
      setPreviewOpen(false);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      setPreviewFileName("");
    }, [previewUrl]);

    const handleDownloadInPreview = React.useCallback(async () => {
      if (!selectedFileId) return;

      const fileObj = fileList.find((img) => String(img.id) === String(selectedFileId));
      const fileName = fileObj?.file_name || fileObj?.name || "Tai_lieu";

      setIsLoading(true);
      try {
        const downloadUrl = `${APP_BASE}/api/files/download/${selectedFileId}?public=true`;
        const response = await axiosInstance.get(downloadUrl, {
          responseType: "blob",
          timeout: 0,
        });
        const blob = response instanceof Blob ? response : response?.data;
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        toast("Tai file that bai.", "error");
      } finally {
        setIsLoading(false);
      }
    }, [selectedFileId, fileList, toast]);
  
  const SuccsetOpenUpdateDrivers = React.useCallback((onSuccess) => {
   setOpenUpdateDrivers(false);
            if (onSuccess) onSuccess(); 
         
  }, []);
    const handleClose = React.useCallback(() => {
        onSuccess?.();
        onClose();
      }, [onSuccess, onClose]);
  




  return (
    <>
    <BaseSwipper
      title={title}
      open={open}
      onClose={handleClose}
      type="view"
      hideBackdrop
      isLoading={isLoading}
       moreActions={
        <StyleBoxButton>
          <FormButton
            dataDetail={dataForFormButton}
            onAction={handleProcessingAction}
            setReloadData={() => {
              fetchRequestDetails();
              fetchFiles();
              fetchHistory();
              onSuccess?.();
            }}
            disabled={isLoading}
            sharedComponents={sharedComponents}
            onClose={onClose}
            isView={true}
          />
        </StyleBoxButton>
              }
    >
      <JobMainContent>
        <Grid container spacing={2}>
          {/* LEFT COLUMN: Request Info & Attachments */}
          <Grid item xs={12} md={9}>
            <StyledBoxContainerContent>
             <SectionHeaderContainer>
                       <StyledHeaderContent variant="h6">
                         THÔNG TIN YÊU CẦU ĐĂNG KÝ XE
                       </StyledHeaderContent>
                        <StatusContainer direction="row" align="center">
                         <StatusLabel variant="body2">Trạng thái hồ sơ:</StatusLabel>
                         {documentDetail?.data?.vehicleStateBadge ? (
                           <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(documentDetail.data.vehicleStateBadge) }} />
                         ) : (
                           <SuccessStatusTag>
                             Đã điều phối
                           </SuccessStatusTag>
                         )}
                       </StatusContainer>
                     </SectionHeaderContainer>
                     <StyledDivider />

              <Grid container spacing={2}>
                {/* Information Fields */}
                <Grid item xs={12} md={6}>
                  <Controller
                    name="requestType"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Loại yêu cầu"
                        disabled
                        options={requestTypeOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                      />
                    )}
                  />
                </Grid>
                {/* <Grid item xs={12} md={6}>
                  <Controller
                    name="priority"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        select
                        label="Mức độ ưu tiên"
                        disabled
                        options={priorityOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                      />
                    )}
                  />
                </Grid>
                            <Grid item xs={12} md={6}>
                              <Controller
                                name="isImportantGuest"
                                control={control}
                                render={({ field }) => (
                                  <InputComponents
                                    select
                                    label="Tiếp khách quan trọng"
                                    disabled
                                    options={importantGuestsOptions}
                                    customLabel="title"
                                    customValue="value"
                                    {...field}
                                  />
                                )}
                              />
                            </Grid> */}
                            <Grid item xs={12} md={6}>
                              <Controller
                                name="passengerCount"
                                control={control}
                                render={({ field }) => (
                                  <InputComponents
                                    label="Số lượng người đi"
                                    disabled
                                    {...field}
                                  />
                                )}
                              />
                            </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="departureTime"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Dự kiến thời gian đi"
                        showTime
                        disabled
                        value={field.value}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="returnTime"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Dự kiến thời gian về"
                        showTime
                        disabled
                        value={field.value}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="departurePoint"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Nơi xuất phát"
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="destination"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Nơi đến"
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="contactPerson"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Người liên hệ"
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="contactPhone"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Số điện thoại liên hệ"
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>

                {/* <Grid item xs={12}>
                  <Controller
                    name="passengerCount"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Số lượng người đi"
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid> */}

                {/* <Grid item xs={12}>
                  <Controller
                    name="purpose"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Mục đích công tác"
                        multiline
                        rows={2}
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid> */}

                <Grid item xs={12}>
                  <Controller
                    name="note"
                    control={control}
                    render={({ field }) => (
                      <InputComponents
                        label="Ghi chú"
                        multiline
                        rows={2}
                        disabled
                        {...field}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </StyledBoxContainerContent>

            {/* ATTACHMENTS SECTION */}
            {isImportantGuest === "co" && (
              <StyledBoxContainerContent styledMarginTop>
                <StyledHeaderContent variant="h6" gutterBottom>
                  TỆP ĐÍNH KÈM TIẾP KHÁCH QUAN TRỌNG
                </StyledHeaderContent>

                <FileTreeTable
                  data={fileList}
                  // isView
                  fileName="Tai_lieu_yeu_cau_dat_xe"
                  onFileMenuClick={handleFileMenuClick}
                  MenuIcon={StyledMenuIcon}
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
                      <Visibility />
                    </StyledListItemIcon>
                    <ListItemText>Xem chi tiết</ListItemText>
                  </MenuItem>
                  {/* <MenuItem onClick={handleDownloadFile}>
                    <StyledListItemIcon>
                      <FileDownload />
                    </StyledListItemIcon>
                    <ListItemText>Tải xuống</ListItemText>
                  </MenuItem> */}
                </Menu>
              </StyledBoxContainerContent>
            )}

            {/* COORDINATION RESULTS SECTION */}
            {isCoordinated && (
              <CoordinationContainer>
                <CoordinationHeader>
                  <StyledHeaderContent variant="h6" mb={0}>
                    KẾT QUẢ ĐIỀU PHỐI
                  </StyledHeaderContent>
                  {/* <CoordinationStatusBadge>
                    {coordinationDataComputed.status}
                  </CoordinationStatusBadge> */}
                </CoordinationHeader>

                <CoordinationSummaryRow>
                  <SummaryDemand>
                    <StyledGroupIcon />
                    Nhu cầu: {coordinationDataComputed.demand} người
                  </SummaryDemand>
                  <SummaryVehicleStats>
                    <StatItem>
                      <svg width="21" height="15" viewBox="0 0 21 15" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.5425 6.06001L15.525 3.90751L13.62 0.652507L13.56 0.562507C13.4196 0.387102 13.2415 0.245489 13.039 0.148128C12.8365 0.0507678 12.6147 0.000147842 12.39 7.42626e-06H6.39C6.14235 -0.000771769 5.89836 0.0597779 5.67981 0.176251C5.46126 0.292725 5.27495 0.461499 5.1375 0.667508L2.595 4.50001H0.75C0.551088 4.50001 0.360322 4.57903 0.21967 4.71968C0.0790176 4.86033 0 5.0511 0 5.25001V12C0 12.1989 0.0790176 12.3897 0.21967 12.5303C0.360322 12.671 0.551088 12.75 0.75 12.75H2.355C2.52771 13.3855 2.90475 13.9466 3.42795 14.3466C3.95114 14.7465 4.59142 14.9633 5.25 14.9633C5.90858 14.9633 6.54886 14.7465 7.07205 14.3466C7.59525 13.9466 7.97229 13.3855 8.145 12.75H12.855C13.0277 13.3855 13.4048 13.9466 13.9279 14.3466C14.4511 14.7465 15.0914 14.9633 15.75 14.9633C16.4086 14.9633 17.0489 14.7465 17.5721 14.3466C18.0952 13.9466 18.4723 13.3855 18.645 12.75H20.25C20.4489 12.75 20.6397 12.671 20.7803 12.5303C20.921 12.3897 21 12.1989 21 12V6.75001C20.9999 6.60279 20.9564 6.45886 20.8751 6.33616C20.7937 6.21346 20.6781 6.11742 20.5425 6.06001ZM5.25 13.5C4.95333 13.5 4.66332 13.412 4.41665 13.2472C4.16997 13.0824 3.97771 12.8481 3.86418 12.574C3.75065 12.2999 3.72094 11.9983 3.77882 11.7074C3.8367 11.4164 3.97956 11.1491 4.18934 10.9393C4.39912 10.7296 4.66639 10.5867 4.95736 10.5288C5.24834 10.471 5.54994 10.5007 5.82403 10.6142C6.09811 10.7277 6.33238 10.92 6.4972 11.1667C6.66203 11.4133 6.75 11.7033 6.75 12C6.75 12.3978 6.59196 12.7794 6.31066 13.0607C6.02936 13.342 5.64782 13.5 5.25 13.5ZM15.75 13.5C15.4533 13.5 15.1633 13.412 14.9166 13.2472C14.67 13.0824 14.4777 12.8481 14.3642 12.574C14.2506 12.2999 14.2209 11.9983 14.2788 11.7074C14.3367 11.4164 14.4796 11.1491 14.6893 10.9393C14.8991 10.7296 15.1664 10.5867 15.4574 10.5288C15.7483 10.471 16.0499 10.5007 16.324 10.6142C16.5981 10.7277 16.8324 10.92 16.9972 11.1667C17.162 11.4133 17.25 11.7033 17.25 12C17.25 12.3978 17.092 12.7794 16.8107 13.0607C16.5294 13.342 16.1478 13.5 15.75 13.5ZM19.5 11.25H18.645C18.4723 10.6145 18.0952 10.0534 17.5721 9.65346C17.0489 9.25347 16.4086 9.03676 15.75 9.03676C15.0914 9.03676 14.4511 9.25347 13.9279 9.65346C13.4048 10.0534 13.0277 10.6145 12.855 11.25H8.145C7.97229 10.6145 7.59525 10.0534 7.07205 9.65346C6.54886 9.25347 5.90858 9.03676 5.25 9.03676C4.59142 9.03676 3.95114 9.25347 3.42795 9.65346C2.90475 10.0534 2.52771 10.6145 2.355 11.25H1.5V6.00001H3C3.12353 5.99937 3.24499 5.96823 3.35359 5.90935C3.46219 5.85047 3.55456 5.76568 3.6225 5.66251L6.405 1.50001H12.405L14.3775 4.87501C14.458 5.01526 14.5816 5.12575 14.73 5.19001L19.5 7.24501V11.25Z" fill="black"/>
  </svg>

                      Xe: {coordinationDataComputed.vehicleCount}
                    </StatItem>
                    <StatItem>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 14.5C14 14.6326 13.9473 14.7598 13.8535 14.8535C13.7598 14.9473 13.6326 15 13.5 15H6.99998C6.86737 15 6.7402 14.9473 6.64643 14.8535C6.55266 14.7598 6.49998 14.6326 6.49998 14.5C6.49998 14.3674 6.55266 14.2402 6.64643 14.1464C6.7402 14.0527 6.86737 14 6.99998 14H13.5C13.6326 14 13.7598 14.0527 13.8535 14.1464C13.9473 14.2402 14 14.3674 14 14.5ZM13 8.99999H8.98623L6.99998 4.99999L7.88686 3.35499C7.88952 3.35061 7.89182 3.34601 7.89373 3.34124C8.01224 3.10411 8.03174 2.82962 7.94794 2.57811C7.86415 2.32661 7.68391 2.11866 7.44686 1.99999L7.41748 1.98624L5.31248 1.09812C5.07612 0.985236 4.80491 0.969596 4.55714 1.05456C4.30937 1.13953 4.10483 1.31832 3.98748 1.55249L2.60498 4.30249C2.53593 4.44156 2.5 4.59473 2.5 4.74999C2.5 4.90526 2.53593 5.05843 2.60498 5.19749L6.23686 12.4475C6.31959 12.614 6.44727 12.7539 6.60544 12.8516C6.76362 12.9492 6.94597 13.0006 7.13186 13H13C13.2652 13 13.5196 12.8946 13.7071 12.7071C13.8946 12.5196 14 12.2652 14 12V9.99999C14 9.73478 13.8946 9.48042 13.7071 9.29289C13.5196 9.10535 13.2652 8.99999 13 8.99999Z" fill="black"/>
  </svg>

                      Ghế: {coordinationDataComputed.seatCount}
                    </StatItem>
                  </SummaryVehicleStats>
                </CoordinationSummaryRow>

                <SelectionTable>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Hãng xe</th>
                      <th>Biển số xe</th>
                      <th>Loại xe</th>
                      <th>Tài xế</th>
                      <th>Thông tin liên hệ</th>
                      <th>Trạng thái tiếp nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinationDataComputed.items.length > 0 ? (
                      coordinationDataComputed.items.map((item, index) => (
                        <tr key={item.carId || index}>
                          <td>{index + 1}</td>
                          <td>{item?.brand || "—"}</td>
                          <td>{item?.licensePlate || "—"}</td>
                          <td>{item?.carType || "—"}</td>
                          <td>{item.driver?.fullName || item.driverName || "—"}</td>
                          <td>{item?.contact || "—"}</td>
                          <td>{item?.confirmed || "—"}</td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                          Chưa có thông tin điều phối
                        </td>
                      </tr>
                    )}
                  </tbody>
                </SelectionTable>
              </CoordinationContainer>
            )}

            {/* CREATOR INFO SECTION */}
            {isCreator && (
              <CreatorInfoContainer>
                <StyledHeaderContent variant="h6" gutterBottom>
                  THÔNG TIN NGƯỜI TẠO
                </StyledHeaderContent>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Người tạo"
                          disabled
                          {...field}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="position"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Chức vụ"
                          disabled
                          {...field}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="department"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Phòng ban"
                          disabled
                          {...field}
                        />
                      )}
                    />

                  </Grid>
                    <Grid item xs={12}  md={3}>
                    <Controller
                      name="created_at"
                      control={control}
                      render={({ field }) => (
                        <InputComponents
                          label="Thời gian tạo"
                          disabled
                          {...field}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CreatorInfoContainer>
            )}
          </Grid>

          {/* RIGHT COLUMN: History Sidebar */}
          <Grid item xs={12} md={3}>
            <StyledBoxContainerContent fullHeight>
              <StyledHeaderContent variant="h6" mb={3}>
                LỊCH SỬ YÊU CẦU
              </StyledHeaderContent>
              <HistoryTimeline history={historyData} />
            </StyledBoxContainerContent>
          </Grid>
        </Grid>
      </JobMainContent>
    </BaseSwipper>

    {/* Màn điều phối yêu cầu */}
    {openCoordinate && (
      <CoordinateRequests
        open={openCoordinate}
        onClose={handleCloseConfirmDialog}
        sharedComponents={sharedComponents}
        vehicleRegistrationId={vehicleRegistrationId}
        documentId={documentId}
        data={data}
        actionCode={coordinateActionData?.actionCode}
        workItem={coordinateActionData?.workItem}
        onSuccess={handleSuccessCoordination}
      />
    )}

     {/* Màn Chỉnh sửa yêu cầu */}
    {openUpdateDrivers && (
      <UpdateNewRequest
         open={openUpdateDrivers}
         onClose={handleCloseUpdateDriversDialog}
         sharedComponents={sharedComponents}
         vehicleRegistrationId={vehicleRegistrationId}
         documentId={documentId}
         onSuccess={SuccsetOpenUpdateDrivers}
      />
    )}

    {/* Dialog Nhắc nhở tài xế */}
    {openRemindTheDriver && (
      <ConfirmRemindTheDriverDialog
        open={openRemindTheDriver}
        onClose={handleCloseRemindDialog}
        formValues={{
          requestType: watchedRequestType,
          // priority: watchedPriority,
          // isImportantGuest: isImportantGuest,
          departureTime: watchedDepartureTime,
          returnTime: watchedReturnTime,
          departurePoint: watchedDeparturePoint,
          destination: watchedDestination,
          passengerCount: watchedPassengerCount,
        }}
        // Mocking car data to populate the table (In real use, map this from coordinationInfo)
        // selectedCars={coordinationData.items.map(item => ({
        //   id: item.id,
        //   "car_type": item.capacity,
        //   brand: item.brand,
        //   "license_plate": item.plate,
        //   manager: item.driver
        // }))}
        vehicleRegistrationId={vehicleRegistrationId}
        documentId={documentId}
        requestTypeOptions={requestTypeOptions}
        // priorityOptions={priorityOptions}
      />
    )}

    {/* Màn điều phối lại yêu cầu */}
    {openRecoordinate && (
      <ViewRequestCoordination
        open={openRecoordinate}
        onClose={handleCloseRecoordinateSwipper}
        sharedComponents={sharedComponents}
        vehicleRegistrationId={vehicleRegistrationId}
        documentId={documentId}
        data={documentDetail}
        actionCode={coordinateActionData?.actionCode}
        workItem={coordinateActionData?.workItem}
        onSuccess={handleSuccessCoordination}
      />
    )}

    <FilePreviewDialog
      open={previewOpen}
      onClose={handleClosePreview}
      fileName={previewFileName}
      url={previewUrl}
      onDownload={handleDownloadInPreview}
    />
    </>
  );
};

export default withSharedComponents(ViewRequest);
