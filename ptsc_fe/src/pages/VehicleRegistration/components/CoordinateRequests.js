import React, { useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { API_VEHICLE_REQUEST, APP_BASE, API_DRIVER_LIST, API_CARS_LIST } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import {
  SkyGrid as Grid,
  SkyBox as Box,
} from "@styles/SkyStyles";
import { Controller, useForm, useWatch } from "react-hook-form";
import withSharedComponents from "@components/WrapperComponent";
import Popover from "@mui/material/Popover";
import IconButton from "@mui/material/IconButton";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DOMPurify from "dompurify";
import { 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import {
  JobMainContent,
  // VehicleSectionTitle as JobSectionTitle,
  StyledBoxContainerContent,
  SectionHeaderContainer,
//   TimelineContainer,
//   TimelineItem,
//   TimelineLine,
//   TimelineDotBox,
//   TimelineContent,
//   TimelineAction,
//   TimelineTime,
//   TimelineDivider,
  // StatusTag,
  StatusLabel,
  StatusContainer,
  // BlueActionButton,
  // CancelButton,
  // HeaderGridContainer,
//   HistoryDot,
  CoordinationContainer,
  CoordinationHeader,
  CoordinationStatusBadge,
  CoordinationSummaryRow,
  SummaryDemand,
  SummaryVehicleStats,
  StatItem,
//   CoordinatedItemBox,
//   // CoordinatedInfo,
//   InfoLabel,
//   InfoValue,
//   DriverBox,
//   ReCoordinateButton,
  SuccessStatusTag,
  // CreatorInfoContainer,
  StyledGroupIcon,
  // StyledDirectionsCarIcon,
  // StyledEventSeatIcon,
//   StyledPersonOutlineIcon,
//   CoordinatedInfoGroup,
//   CoordinatedInfoRow,
//   CapacityBox,
//   CoordinationItemStatus,
//   ReCoordinationBox,
//   ReCoordinationTitle,
//   ReCoordinationRow,
//   ReCoordinationLabel,
//   ReCoordinationValue,
//   TabButton,
//   ActionButtonsContainer,
  PlateValue,
  // SmallConfirmButton,
  TableWrapper,
//   SummaryBoxFlex,
  SelectionTable,
//   ConfirmButton,
  // SelectButton,
  // ReasonInputArea,
  // BlueActionButton,
  DriverPopoverItem,
  DriverPopoverName,
  // DriverPopoverSub,
  EmptyTableCell,
  UnselectedText,
  DeleteIconButton,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";

import FileTreeTable from "@components/FileTreeTable";
// import FormButton from "@components/FormButton";
// import { StyleBoxButton } from "@pages/MeetingCalendar/componentStyle/CreateMeetingSchedule.styles";
import ConfirmCoordinateRequestsDialog from "./ConfirmCoordinateRequestsDialog";
import api from "@services/api";
import { withFormWrapper } from "@components/common/FormWrapper";



const CoordinateRequests = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Điều phối yêu cầu đăng ký xe",
  data = {}, // Data passed from the list
  vehicleRegistrationId,
  documentId, 
  actionCode = '',
  workItem = {},
}) => {
  const {
    BaseSwipper,
 InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    ButtonOutline
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
  const [fileList, setFileList] = React.useState([]);
  const { crmSource } = useSelector((state) => state.config);

  const requestTypeOptions =
    crmSource.find((item) => item.code === "LYCDKX")?.data || [];
  const priorityOptions =
    crmSource.find((item) => item.code === "DOUUTIENDATXE")?.data || [];
    const importantGuestsOptions =
  crmSource.find((item) => item.code === "TIEPKHACHQUANTRONG")?.data || [];

  // const dataForFormButton = React.useMemo(() => {
  //   const flags = {};
  //   availableActions.forEach(a => {
  //     const flagName = typeFlagMap[a.type];
  //     if (flagName) flags[flagName] = true;
  //   });

  //   return {
  //     availableActions: availableActions,
  //     flags: flags
  //   };
  // }, [availableActions]);
  // Mock Re-coordination Data
//   const [activeTab, setActiveTab] = React.useState("car"); // "car" or "driver"
//   const [selectedItem, setSelectedItem] = React.useState(null);
  // const [reason, setReason] = React.useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [formValues, setFormValues] = React.useState({});
  const [documentDetail, setDocumentDetail] = React.useState(null);
  const [carsList, setCarsList] = React.useState([]);
  const [driverList, setDriverList] = React.useState([]);
  const [selectedCars, setSelectedCars] = React.useState([]);
  const [selectedDriverMap, setSelectedDriverMap] = React.useState({});
  const [driverPopoverAnchor, setDriverPopoverAnchor] = React.useState(null);
  const [activeRowId, setActiveRowId] = React.useState(null);

//   const handleOpenConfirmDialog = React.useCallback(() => {
//     setIsConfirmDialogOpen(true);
//   }, []);

  const handleCloseConfirmDialog = React.useCallback(() => {
    setIsConfirmDialogOpen(false);
  }, []);

  const handleOpenConfirmDialog = React.useCallback(() => {
    setIsConfirmDialogOpen(true);
  }, []);

//   const handleConfirmSuccess = React.useCallback(() => {
//     toast("Điều phối thành công!", "success");
//     setIsConfirmDialogOpen(false);
//   }, [toast]);

// //   const handleChangeTabCar = React.useCallback(() => {
// //     setActiveTab("car");
// //   }, []);

// //   const handleChangeTabDriver = React.useCallback(() => {
// //     setActiveTab("driver");
// //   }, []);

//   const handleReasonChange = useCallback((e) => {
//     setReason(e.target.value);
//   }, []);

  const handleOpenDriverPopover = useCallback((e, rowId) => {
    setActiveRowId(rowId);
    setDriverPopoverAnchor(e.currentTarget);
  }, []);

  const handleCloseDriverPopover = useCallback(() => {
    setDriverPopoverAnchor(null);
    setActiveRowId(null);
  }, []);

  const handleSelectDriver = useCallback((driver) => {
    if (activeRowId !== null) {
      setSelectedDriverMap(prev => ({ ...prev, [activeRowId]: driver }));
    }
    handleCloseDriverPopover();
  }, [activeRowId, handleCloseDriverPopover]);

  const handleSelectCar = useCallback((car) => {
    setSelectedCars(prev => {
      const exists = prev.some(c => c.id === car.id);
      if (exists) return prev; // prevent duplicates
      return [...prev, car];
    });
  }, []);

  const handleRemoveCar = useCallback((carId) => {
    setSelectedCars(prev => prev.filter(c => c.id !== carId));
  }, []);

  // Per-row callbacks to avoid anonymous arrow functions in JSX
  const makeRemoveCar = useCallback((carId) => () => handleRemoveCar(carId), [handleRemoveCar]);
  const makeOpenDriverPopover = useCallback(
    (carId) => (e) => handleOpenDriverPopover(e, carId),
    [handleOpenDriverPopover]
  );
  const makeSelectCar = useCallback((car) => () => handleSelectCar(car), [handleSelectCar]);
  const makeSelectDriver = useCallback((driver) => () => handleSelectDriver(driver), [handleSelectDriver]);

//   const oldCoordination = {
//     plate: "51A-123.45",
//     type: "7 chỗ",
//     brand: "Toyota",
//     driver: "Lê Văn A"
//   };

//   const newCoordination = {
//     plate: "51A-222.22",
//     type: "7 chỗ",
//     brand: "Toyota",
//     driver: "Hoàng Văn A"
//   };

  // --- Fields for the form ---
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
      priority: "",
      isImportantGuest: "",
      departureTime: null,
      returnTime: null,
      departurePoint: "",
      destination: "",
      passengerCount: "",
      contactPerson: "",
      contactPhone: "",
      purpose: "",
      note: "",
    },
  });

  // Dynamic Coordination Data
  const getSeatCount = (item) => {
    let seat = item.seatCount || item.car?.seatCount || item.carType || item.car?.carType || item.capacity || item.car?.capacity;
    if (typeof seat === 'number') return seat;
    if (typeof seat === 'string') {
        const match = seat.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  };
  const currentDemand = documentDetail?.data?.passengerCount || data?.passengerCount || 0;
  const currentSeatCount = selectedCars.reduce((sum, item) => sum + getSeatCount(item), 0);

  const filteredDrivers = useMemo(() => {
    // Get list of IDs of drivers selected in rows OTHER than the active one
    const otherSelectedIds = Object.entries(selectedDriverMap)
      .filter(([rowId]) => rowId !== activeRowId)
      .map(([, d]) => d.id);
    
    return driverList.filter(d => !otherSelectedIds.includes(d.id));
  }, [driverList, selectedDriverMap, activeRowId]);


  const effectiveActionCode = useMemo(() => {
    if (actionCode) return actionCode;
    // Fallback: tìm trong availableActions của documentDetail
    const actions = documentDetail?.data?.availableActions || data?.availableActions || [];
    return actions.find(a => a.type === 'agree_vehicle_registrant')?.code || '';
  }, [actionCode, documentDetail, data]);

  const coordinationData = {
    status: currentSeatCount >= currentDemand ? "Đã điều phối đủ" : "Chưa điều phối đủ",
    demand: currentDemand,
    vehicleCount: selectedCars.length,
    seatCount: currentSeatCount,
    items: selectedCars
  };

  const isImportantGuest = useWatch({ control, name: "isImportantGuest" });

  useEffect(() => {
    const fetchRequestDetails = async () => {
      const requestId = vehicleRegistrationId || documentId;
      if (open && requestId) {
        setIsLoading(true);
        try {
          const res = await api.get(`${API_VEHICLE_REQUEST}/${requestId}`);
          const response = res.data;
          if (response && response.success) {
            const vehicleData = response.data;
            setDocumentDetail(response);
            const values = {
              requestType: vehicleData.requestType,
              priority: vehicleData.priority,
              isImportantGuest: vehicleData.isImportantGuest,
              departureTime: vehicleData.departureTime,
              returnTime: vehicleData.returnTime,
              departurePoint: vehicleData.departurePoint,
              destination: vehicleData.destination,
              passengerCount: vehicleData.passengerCount,
              contactPerson: vehicleData.contactPerson,
              contactPhone: vehicleData.contactPhone,
              purpose: vehicleData.purpose,
              note: vehicleData.notes,
            };
            reset(values);
            setFormValues(values);
          }
        } catch (error) {
          toast("Không thể tải thông tin yêu cầu!", "error");
          logger.error("Error fetching vehicle request:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const fetchCarsAndDrivers = async () => {
      if (!open) return;
      try {
        const [carsRes, driversRes] = await Promise.all([
          api.get(API_CARS_LIST),
          api.get(API_DRIVER_LIST),
        ]);
        const carsData = carsRes.data;
        const driversData = driversRes.data;
        setCarsList(Array.isArray(carsData) ? carsData : (carsData?.data || []));
        setDriverList(Array.isArray(driversData) ? driversData : (driversData?.data || []));
      } catch (error) {
        logger.error("Error fetching cars/drivers:", error);
      }
    };

    const fetchFiles = async () => {
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
    };

    fetchRequestDetails();
    fetchCarsAndDrivers();
    fetchFiles();
  }, [open, data?.id, reset, toast, vehicleRegistrationId, documentId]);

  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      type="view"
      hideBackdrop
      isLoading={isLoading}
      //  moreActions={
      //           <StyleBoxButton>
      //             <FormButton
      //               // dataDetail={dataForFormButton}
      //               // onAction={handleProcessingAction}
      //               disabled={isLoading}
      //               sharedComponents={sharedComponents}
      //             />
      //           </StyleBoxButton>
      //         }
        moreActions={
              <ButtonOutline
                onClick={handleOpenConfirmDialog}
                disabled={isLoading || coordinationData.status !== "Đã điều phối đủ"}
                variant="contained"
              >
               Xác nhận & gửi điều phối
              </ButtonOutline>
            }
    >
      <JobMainContent>
        <Grid container spacing={2}>
          {/* LEFT COLUMN: Request Info & Attachments */}
          <Grid item xs={12} md={6}>
            <StyledBoxContainerContent>
             <SectionHeaderContainer>
                       <StyledHeaderContent variant="h6">
                         THÔNG TIN YÊU CẦU ĐĂNG KÝ XE
                       </StyledHeaderContent>
                       <StatusContainer direction="row" align="center">
                         <StatusLabel variant="body2">Trạng thái hồ sơ:</StatusLabel>
                            {documentDetail?.data?.vehicleStateBadge ? (
                           <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${documentDetail.data.vehicleStateBadge}</p>`) }} />
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
                <Grid item xs={12} md={6}>
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
                
            {/* ROW 2: Disabled */}
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
            </Grid>
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
                        label="Thời gian đi"
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
                        label="Thời gian về"
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

            

                <Grid item xs={12}>
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
                </Grid>

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
                  isView
                  fileName="Tai_lieu_yeu_cau_dat_xe"
                  showStt
                />
              </StyledBoxContainerContent>
            )}

            {/* COORDINATION RESULTS SECTION */}
            <CoordinationContainer>
              <CoordinationHeader>
                <StyledHeaderContent variant="h6" mb={0}>
                  KẾT QUẢ ĐIỀU PHỐI
                </StyledHeaderContent>
                <CoordinationStatusBadge $status={coordinationData.status === "Đã điều phối đủ" ? "success" : "pending"}>
                  {coordinationData.status}
                </CoordinationStatusBadge>
              </CoordinationHeader>

              <CoordinationSummaryRow>
                <SummaryDemand>
                  <StyledGroupIcon />
                  Nhu cầu: {coordinationData.demand} người
                </SummaryDemand>
                <SummaryVehicleStats>
                  <StatItem>
                    <svg width="21" height="15" viewBox="0 0 21 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20.5425 6.06001L15.525 3.90751L13.62 0.652507L13.56 0.562507C13.4196 0.387102 13.2415 0.245489 13.039 0.148128C12.8365 0.0507678 12.6147 0.000147842 12.39 7.42626e-06H6.39C6.14235 -0.000771769 5.89836 0.0597779 5.67981 0.176251C5.46126 0.292725 5.27495 0.461499 5.1375 0.667508L2.595 4.50001H0.75C0.551088 4.50001 0.360322 4.57903 0.21967 4.71968C0.0790176 4.86033 0 5.0511 0 5.25001V12C0 12.1989 0.0790176 12.3897 0.21967 12.5303C0.360322 12.671 0.551088 12.75 0.75 12.75H2.355C2.52771 13.3855 2.90475 13.9466 3.42795 14.3466C3.95114 14.7465 4.59142 14.9633 5.25 14.9633C5.90858 14.9633 6.54886 14.7465 7.07205 14.3466C7.59525 13.9466 7.97229 13.3855 8.145 12.75H12.855C13.0277 13.3855 13.4048 13.9466 13.9279 14.3466C14.4511 14.7465 15.0914 14.9633 15.75 14.9633C16.4086 14.9633 17.0489 14.7465 17.5721 14.3466C18.0952 13.9466 18.4723 13.3855 18.645 12.75H20.25C20.4489 12.75 20.6397 12.671 20.7803 12.5303C20.921 12.3897 21 12.1989 21 12V6.75001C20.9999 6.60279 20.9564 6.45886 20.8751 6.33616C20.7937 6.21346 20.6781 6.11742 20.5425 6.06001ZM5.25 13.5C4.95333 13.5 4.66332 13.412 4.41665 13.2472C4.16997 13.0824 3.97771 12.8481 3.86418 12.574C3.75065 12.2999 3.72094 11.9983 3.77882 11.7074C3.8367 11.4164 3.97956 11.1491 4.18934 10.9393C4.39912 10.7296 4.66639 10.5867 4.95736 10.5288C5.24834 10.471 5.54994 10.5007 5.82403 10.6142C6.09811 10.7277 6.33238 10.92 6.4972 11.1667C6.66203 11.4133 6.75 11.7033 6.75 12C6.75 12.3978 6.59196 12.7794 6.31066 13.0607C6.02936 13.342 5.64782 13.5 5.25 13.5ZM15.75 13.5C15.4533 13.5 15.1633 13.412 14.9166 13.2472C14.67 13.0824 14.4777 12.8481 14.3642 12.574C14.2506 12.2999 14.2209 11.9983 14.2788 11.7074C14.3367 11.4164 14.4796 11.1491 14.6893 10.9393C14.8991 10.7296 15.1664 10.5867 15.4574 10.5288C15.7483 10.471 16.0499 10.5007 16.324 10.6142C16.5981 10.7277 16.8324 10.92 16.9972 11.1667C17.162 11.4133 17.25 11.7033 17.25 12C17.25 12.3978 17.092 12.7794 16.8107 13.0607C16.5294 13.342 16.1478 13.5 15.75 13.5ZM19.5 11.25H18.645C18.4723 10.6145 18.0952 10.0534 17.5721 9.65346C17.0489 9.25347 16.4086 9.03676 15.75 9.03676C15.0914 9.03676 14.4511 9.25347 13.9279 9.65346C13.4048 10.0534 13.0277 10.6145 12.855 11.25H8.145C7.97229 10.6145 7.59525 10.0534 7.07205 9.65346C6.54886 9.25347 5.90858 9.03676 5.25 9.03676C4.59142 9.03676 3.95114 9.25347 3.42795 9.65346C2.90475 10.0534 2.52771 10.6145 2.355 11.25H1.5V6.00001H3C3.12353 5.99937 3.24499 5.96823 3.35359 5.90935C3.46219 5.85047 3.55456 5.76568 3.6225 5.66251L6.405 1.50001H12.405L14.3775 4.87501C14.458 5.01526 14.5816 5.12575 14.73 5.19001L19.5 7.24501V11.25Z" fill="black"/>
</svg>

                    Xe: {coordinationData.vehicleCount}
                  </StatItem>
                  <StatItem>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 14.5C14 14.6326 13.9473 14.7598 13.8535 14.8535C13.7598 14.9473 13.6326 15 13.5 15H6.99998C6.86737 15 6.7402 14.9473 6.64643 14.8535C6.55266 14.7598 6.49998 14.6326 6.49998 14.5C6.49998 14.3674 6.55266 14.2402 6.64643 14.1464C6.7402 14.0527 6.86737 14 6.99998 14H13.5C13.6326 14 13.7598 14.0527 13.8535 14.1464C13.9473 14.2402 14 14.3674 14 14.5ZM13 8.99999H8.98623L6.99998 4.99999L7.88686 3.35499C7.88952 3.35061 7.89182 3.34601 7.89373 3.34124C8.01224 3.10411 8.03174 2.82962 7.94794 2.57811C7.86415 2.32661 7.68391 2.11866 7.44686 1.99999L7.41748 1.98624L5.31248 1.09812C5.07612 0.985236 4.80491 0.969596 4.55714 1.05456C4.30937 1.13953 4.10483 1.31832 3.98748 1.55249L2.60498 4.30249C2.53593 4.44156 2.5 4.59473 2.5 4.74999C2.5 4.90526 2.53593 5.05843 2.60498 5.19749L6.23686 12.4475C6.31959 12.614 6.44727 12.7539 6.60544 12.8516C6.76362 12.9492 6.94597 13.0006 7.13186 13H13C13.2652 13 13.5196 12.8946 13.7071 12.7071C13.8946 12.5196 14 12.2652 14 12V9.99999C14 9.73478 13.8946 9.48042 13.7071 9.29289C13.5196 9.10535 13.2652 8.99999 13 8.99999Z" fill="black"/>
</svg>

                    Ghế: {coordinationData.seatCount}
                  </StatItem>
                </SummaryVehicleStats>
              </CoordinationSummaryRow>

              <TableWrapper>
              <SelectionTable>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Hãng xe</th>
                    <th>Biển số xe</th>
                    <th>Loại xe</th>
                    <th>Tài xế</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                   {selectedCars.length === 0 ? (
                    <tr>
                      <EmptyTableCell colSpan={6}>Chưa chọn xe nào</EmptyTableCell>
                    </tr>
                  ) : (
                    selectedCars.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.brand}</td>
                        <td>{item.licensePlate ? <PlateValue>{item.licensePlate}</PlateValue> : '-'}</td>
                        <td>{item.carType}</td>
                        <td>{selectedDriverMap[item.id]?.fullName || selectedDriverMap[item.id]?.full_name || item.manager.name || '-'}</td>
                        <td align="right">
                          <DeleteIconButton
                            size="small"
                            onClick={makeRemoveCar(item.id)}
                            title="Xóa"
                          >
                            <DeleteOutlineIcon />
                          </DeleteIconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </SelectionTable>
              </TableWrapper>
            </CoordinationContainer>

            {/* CREATOR INFO SECTION */}
            {/* <CreatorInfoContainer>
              <JobSectionTitle variant="h6" gutterBottom>
                THÔNG TIN NGƯỜI TẠO
              </JobSectionTitle>

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
            </CreatorInfoContainer> */}
          </Grid>

          {/* RIGHT COLUMN: Re-coordination Sidebar */}
          <Grid item xs={12} md={6}>
            {/* THÔNG TIN ĐIỀU PHỐI LẠI */}
            {/* <StyledBoxContainerContent>
              <SectionHeaderContainer>
                <JobSectionTitle variant="h6" mb={0}>
                  THÔNG TIN ĐIỀU PHỐI LẠI
                </JobSectionTitle>
                <ConfirmButton onClick={handleOpenConfirmDialog}>
                  Xác nhận
                </ConfirmButton>
              </SectionHeaderContainer>

              <SummaryBoxFlex>
                <ReCoordinationBox>
                  <ReCoordinationTitle>ĐIỀU PHỐI CŨ</ReCoordinationTitle>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Biển số xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{oldCoordination.plate}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Loại xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{oldCoordination.type}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Hãng xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{oldCoordination.brand}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Tài xế:</ReCoordinationLabel>
                    <ReCoordinationValue>{oldCoordination.driver}</ReCoordinationValue>
                  </ReCoordinationRow>
                </ReCoordinationBox>

                <ReCoordinationBox>
                  <ReCoordinationTitle>ĐIỀU PHỐI MỚI</ReCoordinationTitle>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Biển số xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{newCoordination.plate}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Loại xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{newCoordination.type}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Hãng xe:</ReCoordinationLabel>
                    <ReCoordinationValue>{newCoordination.brand}</ReCoordinationValue>
                  </ReCoordinationRow>
                  <ReCoordinationRow>
                    <ReCoordinationLabel>Tài xế:</ReCoordinationLabel>
                    <ReCoordinationValue>{newCoordination.driver}</ReCoordinationValue>
                  </ReCoordinationRow>
                </ReCoordinationBox>
              </SummaryBoxFlex>
            </StyledBoxContainerContent> */}

            {/* ĐIỀU PHỐI LẠI */}
            <StyledBoxContainerContent >
              <StyledHeaderContent variant="h6">
                ĐIỀU PHỐI XE - TÀI XẾ
              </StyledHeaderContent>

              {/* <ActionButtonsContainer>
                <TabButton 
                  active={activeTab === "car"} 
                  onClick={handleChangeTabCar}
                >
                  <StyledDirectionsCarIcon /> Đổi xe
                </TabButton>
                <TabButton 
                  active={activeTab === "driver"} 
                  onClick={handleChangeTabDriver}
                >
                  <StyledPersonOutlineIcon /> Đổi tài xế
                </TabButton>
              </ActionButtonsContainer> */}

              <TableWrapper>
              <SelectionTable>
                <thead>
                  <tr>
                    <th>Loại xe</th>
                    <th>Biển số xe</th>
                    <th>Hãng xe</th>
                    <th>Người phụ trách</th>
                    <th>Người thay thế</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {carsList.map((v, idx) => (
                    <tr key={v.id || idx}>
                      <td>{v.carType}</td>
                      <td>
                        {v.licensePlate ? (
                          <PlateValue>{v.licensePlate}</PlateValue>
                        ) : '-'}
                      </td>
                      <td>{v.brand}</td>
                      <td>{v.manager.name || '-'}</td>
                      <td>
                        {selectedDriverMap[v.id]?.fullName || selectedDriverMap[v.id]?.full_name || (
                          <UnselectedText>Chưa chọn</UnselectedText>
                        )}
                         <IconButton
                          size="small"
                          onClick={makeOpenDriverPopover(v.id)}
                          title="Chọn người thay thế"
                          disabled={selectedCars.some(c => c.id === v.id)}
                        >
                          <ArrowDropDownIcon />
                        </IconButton>
                      </td>
                      <td align="right">
                        <ButtonOutline  
                          variant="contained"
                          onClick={makeSelectCar(v)}
                          disabled={selectedCars.some(c => c.id === v.id)}
                        >
                          Chọn
                        </ButtonOutline>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SelectionTable>
              </TableWrapper>

              <Popover
                open={Boolean(driverPopoverAnchor)}
                anchorEl={driverPopoverAnchor}
                onClose={handleCloseDriverPopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ style: { minWidth: 220, maxHeight: 280, overflowY: 'auto' } }}
              >
                {filteredDrivers.length === 0 ? (
                  <Box p={2}>Không còn tài xế khả dụng</Box>
                ) : (
                  filteredDrivers.map((d) => (
                    <DriverPopoverItem
                      key={d.id}
                      onClick={makeSelectDriver(d)}
                    >
                      <DriverPopoverName>{d.nameAndTrip || d.fullName || d.full_name}</DriverPopoverName>
                      {/* <DriverPopoverSub>{d.phoneNumber || d.phone_number} — Bằng {d.licenseClass || d.license_class}</DriverPopoverSub> */}
                    </DriverPopoverItem>
                  ))
                )}
              </Popover>
              {/* <Box mt={3}>
                 <JobSectionTitle variant="h6" mb={1}>
                  Lý do điều phối lại
                </JobSectionTitle>
                <ReasonInputArea
                  placeholder="Nhập lý do ..." 
                  value={reason}
                  onChange={handleReasonChange}
                />
              </Box> */}
            </StyledBoxContainerContent>
          </Grid>
        </Grid>
      </JobMainContent>
      <ConfirmCoordinateRequestsDialog
        open={isConfirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        formValues={formValues}
        selectedCars={selectedCars}
        selectedDriverMap={selectedDriverMap}
        // noteDetail={reason}
        actionCode={effectiveActionCode}
        workItem={workItem}
        vehicleRegistrationId={vehicleRegistrationId}
        requestTypeOptions={requestTypeOptions}
        priorityOptions={priorityOptions}
        onSuccess={onSuccess}
        documentId={documentId}
      />
    </BaseSwipper>
  );
};

export default withSharedComponents(CoordinateRequests);