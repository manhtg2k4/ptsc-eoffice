import React, { useEffect, useCallback, useMemo } from "react";
import {
  SkyGrid as Grid,
  SkyMenu as Menu,
  SkyMenuItem as MenuItem,
  SkyListItemText as ListItemText,
} from "@styles/SkyStyles";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
// import ClearIcon from "@mui/icons-material/Clear";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Visibility, DeleteOutline } from "@mui/icons-material";

import {
  API_LIST_DRIVERS,
  API_FILES_UPLOAD,
  API_GET_LIST_DRIVER_ABOURT_GROUP_DRIVER,
//   API_VIEW_FILE,
//   APP_BASE
} from '@EnvironmentFile/constants/urlConfig';
import dayjs from "dayjs";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";

import {
  JobMainContent,
  // VehicleSectionTitle as StyledHeaderContent,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  // BlueActionButton,
  // ImageGalleryContainer,
  // GalleryImageItem,
  // ImageCloseButton,
  // ImagePlaceholderText,
  HiddenInput,
  // StyledGalleryImage,
  // JobButtonContainer,
  JobUploadPlaceholderBox,
  JobPlaceholderText as JobPlaceholderTextBase,
  StyledMenuIcon,
  StyledListItemIcon,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";

import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";

import LoadingDialog from "@components/LoadingDialog";
// import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { useSelector } from "react-redux";
import { withFormWrapper } from "@components/common/FormWrapper";
const AddDrivers = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Thêm mới tài xế",
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    DatePicker: BaseDatePicker,
    AsyncAutoCompleted: BaseAsyncAutoCompleted,
    ButtonOutline
  } = sharedComponents;
  const InputComponents = React.useMemo(() => {
      return withFormWrapper(BaseInput, "input");
    }, [BaseInput]);
  
    const DatePicker = React.useMemo(() => {
      return withFormWrapper(BaseDatePicker, "date");
    }, [BaseDatePicker]);
      const AsyncAutoCompleted = React.useMemo(() => {
          return withFormWrapper(BaseAsyncAutoCompleted, "asyncSelect");
        }, [BaseAsyncAutoCompleted]);
  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const { crmSource } = useSelector((state) => state.config);

  // License class options (Loại bằng)
  const licenseClassOptions = crmSource.find((item) => item.code === "HB")?.data || [];

  // File management for images
  const [driverImages, setDriverImages] = React.useState([]);
  const fileInputRef = React.useRef(null);

  // File menu and preview state
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const schema = yup.object().shape({
    fullName: yup.string().required("Vui lòng chọn tài xế"),
    phoneNumber: yup.string().required("Vui lòng nhập số điện thoại").transform((value) => value.replace(/\s/g, '')).matches(/^(0|84)[0-9]{8,10}$/, "Số điện thoại không đúng định dạng (Bắt đầu bằng 0 hoặc 84, từ 9-11 số)"),
    idCard: yup.string().required("Vui lòng nhập số CMND/CCCD").max(12, "Số CMND/CCCD không được vượt quá 12 ký tự"),
    email: yup.string().email("Email không hợp lệ").nullable(),
    address: yup.string().max(500, "Địa chỉ không được vượt quá 500 ký tự"),
    licenseNumber: yup.string().required("Vui lòng nhập số bằng lái").max(12, "Số bằng lái không được vượt quá 12 ký tự"),
    licenseClass: yup.string().required("Vui lòng chọn Loại bằng"),
    licenseIssuedDate: yup.date()
      .required("Vui lòng chọn ngày cấp bằng")
      .max(new Date(), "Ngày cấp bằng không được là ngày tương lai")
      .typeError("Ngày cấp bằng không hợp lệ"),
    note: yup.string().max(500, "Ghi chú không được vượt quá 500 ký tự"),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      idCard: "",
      email: "",
      address: "",
      licenseNumber: "",
      licenseClass: "",
      licenseIssuedDate: null,
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        fullName: "",
        phoneNumber: "",
        idCard: "",
        email: "",
        address: "",
        licenseNumber: "",
        licenseClass: "",
        licenseIssuedDate: null,
        note: "",
      });
      setDriverImages([]);
    }
  }, [open, reset]);

  const onSubmit = useCallback(async (data) => {
    setIsLoading(true);
    try {
      const payload = {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        idCard: data.idCard,
        email: data.email || null,
        address: data.address || null,
        licenseNumber: data.licenseNumber,
        licenseClass: data.licenseClass,
        licenseIssuedDate: data.licenseIssuedDate ? dayjs(data.licenseIssuedDate).format("YYYY-MM-DD") : null,
        note: data.note || null,
      };

      const response = await axiosInstance.post(API_LIST_DRIVERS, payload);
      const newDriverId = response?.id || response?.data?.id;

      if (newDriverId && driverImages.length > 0) {
        for (const img of driverImages) {
          if (img.file) {
            const formData = new FormData();
            formData.append("file", img.file);
            formData.append("object_type", "listDrivers");
            formData.append("object_id", newDriverId);
            await axiosInstance.post(API_FILES_UPLOAD, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }
        }
      }

      toast("Thêm mới tài xế thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onClose, toast, driverImages]);

  const handleSave = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit]);


  const handleImageUpload = useCallback((event) => {
     const files = Array.from(event.target.files);
     const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"];
     const MAX_SIZE_MB = 10;
     const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

     const validFiles = [];
     for (const file of files) {
       const extension = file.name.split(".").pop().toLowerCase();
       if (!ALLOWED_EXTENSIONS.includes(extension)) {
         toast(`Định dạng tệp ${file.name} không được hỗ trợ. Chỉ chấp nhận pdf, doc, docx, xls, xlsx, jpg, jpeg, png.`, "error");
         continue;
       }
       if (file.size > MAX_SIZE_BYTES) {
         toast(`Tệp ${file.name} vượt quá dung lượng tối đa 10MB.`, "error");
         continue;
       }
       validFiles.push(file);
     }
     
     if (driverImages.length + validFiles.length > 10) {
       toast("Vượt số lượng cho phép 10 file", "error");
       event.target.value = null;
       return;
     }

     if (validFiles.length > 0) {
       const newImages = validFiles.map((file, index) => ({
           id: (Date.now() + index).toString(),
           file: file, // Store actual file object
           name: file.name,
           url: URL.createObjectURL(file)
       }));
       setDriverImages(prev => [...prev, ...newImages]);
     }
     event.target.value = null;
  }, [toast, driverImages.length]);

  const handleFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    setSelectedFileId(fileId);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

  const handleViewFile = useCallback(() => {
    const fileObj = driverImages.find(img => img.id === selectedFileId);
    if (fileObj) {
      setPreviewUrl(fileObj.url);
      setPreviewFileName(fileObj.name);
      setPreviewOpen(true);
    }
    handleCloseFileMenu();
  }, [driverImages, selectedFileId, handleCloseFileMenu]);

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
    handleCloseFileMenu();
  }, [handleCloseFileMenu]);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  const handleDeleteFile = useCallback(() => {
    setDriverImages((prev) => {
      const filtered = prev.filter((img) => img.id !== selectedFileId);
      const deleted = prev.find((img) => img.id === selectedFileId);
      if (deleted && deleted.url) {
        URL.revokeObjectURL(deleted.url);
      }
      return filtered;
    });
    setIsDeleteDialogOpen(false);
  }, [selectedFileId]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewUrl("");
    setPreviewFileName("");
  }, []);

  const fileTreeData = React.useMemo(() => {
    return driverImages.map((file) => ({
      id: file.id,
      name: file.name,
      file: file.file,
      isFolder: false
    }));
  }, [driverImages]);

  //   const handleImageUpload = useCallback((event) => {
  //    const files = Array.from(event.target.files);
  //    const newImages = files.map((file, index) => ({
  //        id: Date.now() + index,
  //        file: file,
  //        name: file.name,
  //        url: URL.createObjectURL(file)
  //    }));
  //    setDriverImages(prev => [...prev, ...newImages]);
  // }, []);
  useEffect(() => {
    return () => {
      driverImages.forEach(img => {
        if (img.url) URL.revokeObjectURL(img.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadClick = useCallback(() => {
    if (driverImages.length >= 10) {
      toast("Vượt số lượng cho phép 10 file", "error");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [driverImages.length, toast]);

  return (
    <BaseSwipper
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      hideBackdrop
      isLoading={isLoading}
      footer={
              <>
                              <FlexGrowBox />
                              <FooterActions>
        <ButtonOutline
          onClick={handleSave}
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
        {/* SECTION 1: THÔNG TIN TÀI XẾ */}
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
              THÔNG TIN TÀI XẾ
            </StyledHeaderContent>
            </div>
          </SectionHeaderContainer>
<StyledDivider />
          <Grid container spacing={2}>
            {/* ROW 1: fullName, phoneNumber, idCard */}
            <Grid item xs={12} md={4}>
              <Controller
                name="fullName"
                control={control}
                render={({ field }) => (
                  <AsyncAutoCompleted
                    label="Họ tên"
                    placeholder="Chọn tên tài xế"
                    {...field}
                    url={API_GET_LIST_DRIVER_ABOURT_GROUP_DRIVER}
                    dataPath="data"
                    queryParam="name"
                    optionLabel="name"
                    optionValue="id"
                    required
                    error={!!errors.fullName}
                    helperText={errors.fullName?.message}
                    selectedOptions={(selected) => {
                      if (selected) {
                        setValue("phoneNumber", selected.phoneNumberUser || "");
                        setValue("email", selected.emailUser || "");
                        setValue("address", selected.addressUser || "");
                        setValue("idCard", selected.identificationCard || "");
                      }
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Số điện thoại"
                    placeholder="0xxxxxxxxx"
                    required
                    {...field}
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="idCard"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="CMND/CCCD"
                    placeholder="xxxxxxxxxxxx"
                    required
                    {...field}
                    error={!!errors.idCard}
                    helperText={errors.idCard?.message}
                  />
                )}
              />
            </Grid>

            {/* ROW 2: email, address */}
            <Grid item xs={12} md={4}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Email"
                    placeholder="taixe123@gmail.com"
                    {...field}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Địa chỉ"
                    placeholder="ABC, abc, acb"
                    {...field}
                    error={!!errors.address}
                    helperText={errors.address?.message}
                  />
                )}
              />
            </Grid>

            {/* ROW 3: licenseNumber, licenseClass, licenseIssuedDate */}
            <Grid item xs={12} md={4}>
              <Controller
                name="licenseNumber"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Số bằng lái"
                    placeholder="xxxxxxxx"
                    required
                    {...field}
                    error={!!errors.licenseNumber}
                    helperText={errors.licenseNumber?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="licenseClass"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Loại bằng"
                    placeholder="Hạng B2"
                    required
                    options={licenseClassOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.licenseClass}
                    helperText={errors.licenseClass?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="licenseIssuedDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày cấp bằng"
                    placeholder="dd/mm/yyyy"
                    required
                    {...field}
                    maxDate={dayjs()}
                    error={!!errors.licenseIssuedDate}
                    helperText={errors.licenseIssuedDate?.message}
                  />
                )}
              />
            </Grid>

            {/* ROW 4: note */}
            <Grid item xs={12}>
              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Ghi chú"
                    placeholder="Nhập ghi chú"
                    multiline
                    rows={4}
                    {...field}
                    error={!!errors.note}
                    helperText={errors.note?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

        {/* SECTION 2: HÌNH ẢNH BẰNG LÁI */}
        <StyledBoxContainerContent styledMarginTop>
                    <Grid item xs={12}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
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
               HÌNH ẢNH BẰNG LÁI
           </StyledHeaderContent>
           </div>
           <HiddenInput 
              type="file" 
              multiple 
              ref={fileInputRef}
              onChange={handleImageUpload}
           />

            {/* <BlueActionButton
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadClick}
           >
              Tải Lên
           </BlueActionButton>

           <ImageGalleryContainer>
                {driverImages.map((img) => (
                    <GalleryImageItem key={img.id}>
                        {img.url ? (
                            <StyledGalleryImage src={img.url} alt={img.name} />
                        ) : (
                            <ImagePlaceholderText>{img.name}</ImagePlaceholderText>
                        )}
                        <ImageCloseButton 
                           data-id={img.id}
                           onClick={handleDeleteImage}
                        >
                            <ClearIcon />
                        </ImageCloseButton>
                    </GalleryImageItem>
                ))}
           </ImageGalleryContainer> */}
        
              <ButtonOutline
                 variant="contained"
                 startIcon={<CloudUploadIcon />}
                 onClick={handleUploadClick}
              >
                 Tải Lên
              </ButtonOutline>
              </div>
              <StyledDivider />
              </Grid>
           {driverImages.length > 0 ? (
                <>
                    <FileTreeTable
                        data={fileTreeData}
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
                        <MenuItem onClick={handleOpenDeleteDialog}>
                            <StyledListItemIcon>
                                <DeleteOutline />
                            </StyledListItemIcon>
                            <ListItemText>Xóa</ListItemText>
                        </MenuItem>
                    </Menu>
                </>
           ) : (
                <JobUploadPlaceholderBox>
                    <JobPlaceholderTextBase variant="body2">Chưa có tài liệu nào được tải lên.</JobPlaceholderTextBase>
                </JobUploadPlaceholderBox>
           )}
        </StyledBoxContainerContent>
      </JobMainContent>

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
      />

      <LoadingDialog open={isLoading}>
        Đang xử lý, vui lòng đợi...
      </LoadingDialog>
    </BaseSwipper>
  );
};

export default withSharedComponents(AddDrivers);