import React, { useEffect, useCallback } from "react";
import {
  SkyGrid as Grid,
  SkyMenu as Menu,
  SkyMenuItem as MenuItem,
  SkyListItemText as ListItemText,
} from "@styles/SkyStyles";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import { Visibility, DeleteOutline } from "@mui/icons-material";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import {
  JobMainContent,
  // VehicleSectionTitle as JobSectionTitle,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  StyledListItemIcon,
  StyledMenuIcon,
  // BlueActionButton,
  // HeaderGridContainer,
  StatusTag,
  StatusLabel,
  StatusContainer,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import { withFormWrapper } from "@components/common/FormWrapper";
import {
  StyledIconWrapper, 
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";

import axiosInstance from "@utils/axiosInstance";
import { 
  API_VEHICLE_REQUEST, 
  APP_BASE, 
  API_VIEW_FILE, 
  API_FILE_INFO ,
  API_XLSX_TO_PDF
} from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";

const UpdateNewRequest = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chỉnh sửa yêu cầu đăng ký xe",
  data = {}, // Data to be updated
  vehicleRegistrationId,
}) => {
  const {
    BaseSwipper,
  InputComponents: BaseInput,
    DateTimePicker: BaseDateTimePicker,
    ButtonOutline
  } = sharedComponents;
  const InputComponents = React.useMemo(() => {
      return withFormWrapper(BaseInput, "input");
    }, [BaseInput]);

    const DateTimePicker = React.useMemo(() => {
      return withFormWrapper(BaseDateTimePicker, "date");
    }, [BaseDateTimePicker]);
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  // File management states
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [fileList, setFileList] = React.useState([]);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
   const [documentDetail, setDocumentDetail] = React.useState(null);

  const schema = yup.object().shape({
    departureTime: yup.date().required("Vui lòng chọn Dự kiến thời gian đi").typeError("Dự kiến thời gian đi không hợp lệ").min(new Date(), "Dự kiến thời gian đi không được trong quá khứ"),
    returnTime: yup.date().required("Vui lòng chọn Dự kiến thời gian về").typeError("Dự kiến thời gian về không hợp lệ").min(yup.ref('departureTime'), "Dự kiến thời gian về phải lớn hơn hoặc bằng Dự kiến thời gian đi"),
    departurePoint: yup.string().required("Vui lòng nhập nơi xuất phát").max(300, "Nơi xuất phát tối đa 300 ký tự"),
    destination: yup.string().required("Vui lòng nhập nơi đến").max(300, "Nơi đến tối đa 300 ký tự"),
    passengerCount: yup.number().transform((value, originalValue) => (String(originalValue).trim() === "" ? null : value)).nullable().min(1, "Số lượng người đi phải từ 1 đến 50").max(50, "Số lượng người đi phải từ 1 đến 50").typeError("Vui lòng chỉ nhập số"),
    contactPerson: yup.string().max(100, "Người liên hệ tối đa 100 ký tự"),
    contactPhone: yup.string().transform((value) => value ? value.replace(/\s/g, '') : value).matches(/^(0|84)[0-9]{8,10}$/, "Số điện thoại không đúng định dạng (Bắt đầu bằng 0 hoặc 84, từ 9-11 số)"),
    // purpose: yup.string().max(500, "Mục đích công tác tối đa 500 ký tự"),
    note: yup.string().max(1000, "Ghi chú tối đa 1000 ký tự"),
  });

  const { crmSource } = useSelector((state) => state.config);

  const requestTypeOptions =
  crmSource.find((item) => item.code === "LYCDKX")?.data || [];
  // const priorityOptions =
  // crmSource.find((item) => item.code === "DOUUTIENDATXE")?.data || [];
  // const importantGuestsOptions =
  // crmSource.find((item) => item.code === "TIEPKHACHQUANTRONG")?.data || [];

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      requestType: "",
      // priority: "",
      // isImportantGuest: "",
      passengerCount: "",
      departureTime: null,
      returnTime: null,
      departurePoint: "",
      destination: "",
      contactPerson: "",
      contactPhone: "",
      // purpose: "",
      note: "",
    },
  });
  
  const departureTimeValue = useWatch({ control, name: "departureTime" });
  // const isImportantGuest = useWatch({ control, name: "isImportantGuest" });
  const isImportantGuest = "khong";

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (open && vehicleRegistrationId) {
        setIsLoading(true);
        try {
          const res = await api.get(`${API_VEHICLE_REQUEST}/${vehicleRegistrationId}`);
           const response = res.data;
          
          if (response && response.success) {
            const vehicleData = response.data;
            setDocumentDetail(response);
            reset({
              requestType: vehicleData.requestType,
              // priority: vehicleData.priority,
              // isImportantGuest: vehicleData.isImportantGuest,
              passengerCount: vehicleData.passengerCount,
              departureTime: vehicleData.departureTime,
              returnTime: vehicleData.returnTime,
              departurePoint: vehicleData.departurePoint,
              destination: vehicleData.destination,
              contactPerson: vehicleData.contactPerson,
              contactPhone: vehicleData.contactPhone,
              // purpose: vehicleData.purpose,
              note: vehicleData.notes,
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
    };

    const fetchFiles = async () => {
      if (vehicleRegistrationId) {
        try {
          const response = await axiosInstance.get(`${APP_BASE}/api/files/by-object?object_type=vehicleRegistration&object_id=${vehicleRegistrationId}`);
          if (response) {
            setFileList(response);
          }
        } catch (error) {
          logger.error("Error fetching files:", error);
        }
      }
    };

    fetchRequestDetails();
    fetchFiles();
  }, [open, data?.id, reset, toast, vehicleRegistrationId]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (data.departureTime && data.returnTime) {
         if (dayjs(data.departureTime).isSameOrAfter(dayjs(data.returnTime))) {
            toast("Dự kiến thời gian đi phải nhỏ hơn Dự kiến thời gian về", "error");
            setIsLoading(false);
            return;
         }
      }
      const payload = {
        ...data,
        passengerCount: data.passengerCount ? Number(data.passengerCount) : null
      };
      
      await axiosInstance.patch(`${API_VEHICLE_REQUEST}/${vehicleRegistrationId}`, payload);
      
      toast("Cập nhật yêu cầu đặt xe thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra!";
      toast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    setSelectedFileId(fileId);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

   const handleViewFile = useCallback(async () => {
    const fileObj = fileList.find(img => String(img.id) === String(selectedFileId));
    if (!fileObj) {
      handleCloseFileMenu();
      return;
    }

    const fileName = fileObj.file_name || fileObj.name || "Tài liệu";
    const lower = fileName.toLowerCase();
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

    // Case 1: Local unsaved file
    if (fileObj.file) {
      if (isDoc || isExcel) {
        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append("file", fileObj.file);

          const urlEndpoint = isDoc ? `${APP_BASE}/api/file-to-pdf` : API_XLSX_TO_PDF;
          const response = await api.post(urlEndpoint, formData, {
            responseType: "blob",
            timeout: 0,
          });

          const pdfBlob = new Blob([response.data || response], {
            type: "application/pdf",
          });
          const objectUrl = URL.createObjectURL(pdfBlob);
          setPreviewUrl(objectUrl);
          setPreviewFileName(fileName);
          setPreviewOpen(true);
        } catch (error) {
          toast("Không thể chuyển đổi file để xem trước.", "error");
        } finally {
          setIsLoading(false);
          handleCloseFileMenu();
        }
      } else if (isBrowserFile) {
        setPreviewUrl(fileObj.url);
        setPreviewFileName(fileName);
        setPreviewOpen(true);
        handleCloseFileMenu();
      } else {
        toast("Định dạng không hỗ trợ xem trước khi chưa lưu.", "warning");
        handleCloseFileMenu();
      }
      return;
    }

    // Case 2: Server saved file
    const fileId = fileObj.id;
    setIsLoading(true);
    try {
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

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
    handleCloseFileMenu();
  }, [handleCloseFileMenu]);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const handleDeleteFile = useCallback(async () => {
    setIsLoading(true);
    try {
      await axiosInstance.delete(`${API_FILE_INFO}/${selectedFileId}`);
      setFileList((prev) => prev.filter((f) => f.id.toString() !== selectedFileId?.toString()));
      toast("Xóa tệp thành công!", "success");
    } catch (error) {
      toast(error?.response?.data?.message || "Không thể xóa tệp!", "error");
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedFileId, toast]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      const isFileUrl = fileList.some(img => img.url === previewUrl);
      if (!isFileUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    setPreviewUrl("");
    setPreviewFileName("");
  }, [previewUrl, fileList]);

  const handleDownloadInPreview = useCallback(() => {
    if (selectedFileId) {
      const downloadUrl = `${APP_BASE}/api/files/download/${selectedFileId}`;
      window.open(downloadUrl, "_blank");
    }
  }, [selectedFileId]);

  // Mock Files Data matching the design
  // const fileTreeData = [
  //   { id: "1", name: "tepdinhkem1.pdf", STT: 1, 'parent_id': null },
  //   { id: "2", name: "tepdinhkem1.pdf", STT: 2, 'parent_id': null },
  //   { id: "3", name: "tepdinhkem1.pdf", STT: 3, 'parent_id': null },
  // ];

  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleSubmit(onSubmit)}
      type="view" // Using view type but providing a save button to match the header design
      hideBackdrop
      isLoading={isLoading}
      footer={
            <>
                  <FlexGrowBox />
                                <FooterActions>
        <ButtonOutline
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          variant="contained"
        >
          Lưu
        </ButtonOutline>
         </FooterActions>
                </>
      }
    >
      <JobMainContent>
        {/* SECTION 1: THÔNG TIN YÊU CẦU ĐĂNG KÝ XE */}
        <StyledBoxContainerContent>
          <SectionHeaderContainer>
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <StyledIconWrapper>
                                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0"/>
                                            <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0"/>
                                            <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0"/>
                                            <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0"/>
                                            <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0"/>
                                          </svg>
                                          </StyledIconWrapper>
            <StyledHeaderContent variant="h6">
              THÔNG TIN YÊU CẦU ĐĂNG KÝ XE
            </StyledHeaderContent>
            </div>
            <StatusContainer direction="row" align="center">
              <StatusLabel variant="body2">Trạng thái hồ sơ:</StatusLabel>
                 {documentDetail?.data?.vehicleStateBadge ? (
                           <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(`<p>${documentDetail.data.vehicleStateBadge}</p>`) }} />
                         ) : (
              <StatusTag>
                Chờ điều phối
              </StatusTag>
                         )}
            </StatusContainer>
          </SectionHeaderContainer>
          <StyledDivider />

          <Grid container spacing={2}>
            {/* ROW 1: Disabled */}
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

            {/* ROW 3: Editable */}
            <Grid item xs={12} md={6}>
              <Controller
                name="departureTime"
                control={control}
                render={({ field }) => (
                  <DateTimePicker
                    label="Dự kiến thời gian đi"
                    showTime
                    required
                    futureOnly
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.departureTime}
                    helperText={errors.departureTime?.message}
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
                    required
                    showTime
                    futureOnly
                    minDateTime={departureTimeValue}
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.returnTime}
                    helperText={errors.returnTime?.message}
                  />
                )}
              />
            </Grid>

            {/* ROW 4: Editable */}
            <Grid item xs={12} md={6}>
              <Controller
                name="departurePoint"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Nơi xuất phát"
                    required
                    {...field}
                    error={!!errors.departurePoint}
                    helperText={errors.departurePoint?.message}
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
                    required
                    {...field}
                    error={!!errors.destination}
                    helperText={errors.destination?.message}
                  />
                )}
              />
            </Grid>

            {/* ROW 5: Disabled */}
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

            {/* ROW 6: Disabled Full width
            <Grid item xs={12}>
              <Controller
                name="purpose"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mục đích công tác"
                    multiline
                    rows={1}
                    disabled
                    {...field}
                  />
                )}
              />
            </Grid> */}

            {/* ROW 7: Disabled Full width */}
            <Grid item xs={12}>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Ghi chú"
                    multiline
                    rows={1}
                    disabled
                    {...field}
                     error={!!errors.note}
                    helperText={errors.note?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* SECTION 2: TỆP ĐÍNH KÈM TIẾP KHÁCH QUAN TRỌNG */}
        {isImportantGuest === "co" && (
        <StyledBoxContainerContent styledMarginTop>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <StyledIconWrapper>
                                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0"/>
                                                    <path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0"/>
                                                    <path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0"/>
                                                    <path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0"/>
                                                    <path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0"/>
                                                  </svg>
                                                </StyledIconWrapper>
          <StyledHeaderContent variant="h6" gutterBottom>
            TỆP ĐÍNH KÈM TIẾP KHÁCH QUAN TRỌNG
          </StyledHeaderContent>
          </div>
            <StyledDivider />

          <FileTreeTable
            data={fileList}
            onFileMenuClick={handleFileMenuClick}
            MenuIcon={StyledMenuIcon}
            // isView // Disable upload/delete in update mode as per design
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
            <MenuItem onClick={handleOpenDeleteDialog}>
              <StyledListItemIcon>
                <DeleteOutline />
              </StyledListItemIcon>
              <ListItemText>Xóa</ListItemText>
            </MenuItem>
          </Menu>
        </StyledBoxContainerContent>
        )}
      </JobMainContent>

      <LoadingDialog open={isLoading}>
        Đang xử lý, vui lòng đợi...
      </LoadingDialog>

      <CustomDialog
        isLoading={isLoading}
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onSave={handleDeleteFile}
        title="Xác nhận xóa"
        type="delete"
        size="sm"
      >
        Bạn có muốn xóa tệp này không?
      </CustomDialog>

      <FilePreviewDialog
        open={previewOpen}
        onClose={handleClosePreview}
        fileName={previewFileName}
        url={previewUrl}
        onDownload={handleDownloadInPreview}
      />
    </BaseSwipper>
  );
};

export default withSharedComponents(UpdateNewRequest);