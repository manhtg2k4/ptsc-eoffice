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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Visibility, DeleteOutline } from "@mui/icons-material";
import DOMPurify from "dompurify";
import {
  API_LIST_CARS,
  API_FILES_UPLOAD,
  API_VIEW_FILE,
  APP_BASE,
  API_FILE_INFO,
  API_LIST_DRIVERS,
  API_XLSX_TO_PDF
} from '@EnvironmentFile/constants/urlConfig';
import {
  JobMainContent,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  // JobButtonContainer,
  JobUploadPlaceholderBox,
  JobPlaceholderText as JobPlaceholderTextBase,
  StyledMenuIcon,
  StyledListItemIcon,
  HiddenInput,
  StatusContainer,
  StatusLabel,
  StatusTag,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
import { 
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import { withFormWrapper } from "@components/common/FormWrapper";

import FileTreeTable from "@components/FileTreeTable";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import CustomDialog from "@components/CustomDialog/CustomDialog";

import LoadingDialog from "@components/LoadingDialog";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import api from "@services/api";

const UpdateCar = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Chỉnh sửa thông tin xe",
  id
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    AsyncAutoCompleted: BaseAsyncAutoCompleted,
    ButtonOutline
  } = sharedComponents;

  const InputComponents = React.useMemo(() => {
      return withFormWrapper(BaseInput, "input");
    }, [BaseInput]);

  const AsyncAutoCompleted = React.useMemo(() => {
      return withFormWrapper(BaseAsyncAutoCompleted, "asyncSelect");
    }, [BaseAsyncAutoCompleted]);

  const toast = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [initialManagerId, setInitialManagerId] = React.useState(null);
  const { crmSource } = useSelector((state) => state.config);

  const carTypeOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "LOAI_XE")?.data || [], [crmSource]);
  const statusOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "BDX")?.data || [], [crmSource]);

  // File management for images
  const [carImages, setCarImages] = React.useState([]);
  const fileInputRef = React.useRef(null);

  // File menu and preview state
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [documentDetail, setDocumentDetail] = React.useState(null);

  const schema = yup.object().shape({
    licensePlate: yup.string().required("Vui lòng nhập biển số xe"),
    carType: yup.string().required("Vui lòng nhập loại xe"),
    carBrand: yup.string().required("Vui lòng nhập hãng xe").max(255, "Hãng xe không được vượt quá 255 ký tự"),
    seats: yup
      .number()
      .transform((value, originalValue) => (String(originalValue).trim() === "" ? null : value))
      .nullable()
      .typeError("Vui lòng chỉ nhập số")
      .min(1, "Số chỗ ngồi phải lớn hơn 0"),
    manager: yup.mixed().required("Vui lòng chọn người quản lý"),
    status: yup.string().required("Vui lòng chọn trạng thái bảo dưỡng"),
    note: yup.string().max(500, "Ghi chú không được vượt quá 500 ký tự"),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
      watch,
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      licensePlate: "",
      carType: "",
      carBrand: "",
      seats: "",
      manager: "",
      status: "",
      note: "",
    },
  });

    const selectedCarType = watch("carType");

  useEffect(() => {
    if (!selectedCarType) return;
    const found = carTypeOptions.find((opt) => opt.value === selectedCarType);
    if (found) {
      // Ưu tiên field seatCount/seats nếu có trong data
      const seatsFromData = found.seatCount ?? found.seats ?? found.seat_count;
      if (seatsFromData != null) {
        setValue("seats", String(seatsFromData));
      } else {
        // Fallback: parse số từ tên loại xe (vd: "7 chỗ" → "7")
        const match = (found.title || found.label || found.name || "").match(/(\d+)/);
        if (match) {
          setValue("seats", match[1]);
        }
      }
    }
  }, [selectedCarType, carTypeOptions, setValue]);

  useEffect(() => {
    const fetchCarDetails = async () => {
      if (open && id) {
        setIsLoading(true);
        try {
          const response = await axiosInstance.get(`${API_LIST_CARS}/${id}`);
          // Adjust based on actual API response structure
          const carData = response?.data || response;
          if (carData) {
            setInitialManagerId(carData.manager?.id || null);
                        setDocumentDetail(response);

            reset({
              licensePlate: carData.licensePlate || "",
              carType: carData.carType || "",
              carBrand: carData.brand || "",
              seats: carData.seatCount ? String(carData.seatCount) : "",
              manager: carData.manager ? { ...carData.manager, driverId: carData.manager.id, name: carData.manager.fullName } : "",
              status: carData.maintenance || "",
              note: carData.note || "",
            });
            
            // If images are returned from the detail API
            if (carData.images && Array.isArray(carData.images)) {
                setCarImages(carData.images.map(img => ({
                    id: img.id.toString(),
                    name: img.file_name || img.fileName || img.name,
                    url: img.filePath || img.url
                })));
            }
          }
        } catch (error) {
          toast("Không thể tải thông tin xe!", "error");
          logger.error("Error fetching car details:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchCarDetails();
  }, [open, id, reset, toast]);

  useEffect(() => {
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
    fetchImages();
  }, [open, id]);

  const onSubmit = useCallback(async (formData) => {
    setIsLoading(true);
    try {
      const payload = {
        licensePlate: formData.licensePlate,
        carType: formData.carType,
        brand: formData.carBrand,
        seatCount: formData.seats ? Number(formData.seats) : null,
        manager: typeof formData.manager === "object" ? (formData.manager?.driverId || formData.manager?.id) : formData.manager,
        maintenance: formData.status,
        note: formData.note,
      };

      await axiosInstance.patch(`${API_LIST_CARS}/${id}`, payload);

      // Handle image uploads if any new images were added (logic similar to AddNewCar)
      const newImages = carImages.filter(img => img.file);
      if (newImages.length > 0) {
        for (const img of newImages) {
          const fd = new FormData();
          fd.append("file", img.file);
          fd.append("object_type", 'listCars');
          fd.append("object_id", id);
          await axiosInstance.post(API_FILES_UPLOAD, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      toast("Cập nhật thông tin xe thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, onSuccess, onClose, toast, carImages]);

  const handleSave = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit]);

  // const handleDeleteImage = useCallback((event) => {
  //   const imgId = event.currentTarget.getAttribute('data-id');
  //   setCarImages((prev) => {
  //       const filtered = prev.filter((img) => img.id.toString() !== imgId);
  //       const deleted = prev.find((img) => img.id.toString() === imgId);
  //       if (deleted && deleted.url && deleted.file) {
  //         URL.revokeObjectURL(deleted.url);
  //       }
  //       // If it's an existing file on server, maybe call an API to delete?
  //       // For now just removing from UI state
  //       return filtered;
  //   });
  // }, []);

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

     if (carImages.length + validFiles.length > 10) {
       toast("Vượt số lượng cho phép 10 file", "error");
       event.target.value = null;
       return;
     }

     if (validFiles.length > 0) {
       const newImages = validFiles.map((file, index) => ({
           id: (Date.now() + index).toString(),
           file: file,
           name: file.name,
           url: URL.createObjectURL(file)
       }));
       setCarImages(prev => [...prev, ...newImages]);
     }
     event.target.value = null;
  }, [toast, carImages.length]);

  const handleFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    setSelectedFileId(fileId);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

  const handleViewFile = useCallback(async () => {
    const fileObj = carImages.find(img => img.id === selectedFileId);
    if (!fileObj) {
      handleCloseFileMenu();
      return;
    }

    const fileName = fileObj.name || "Tài liệu";
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
  }, [carImages, selectedFileId, handleCloseFileMenu, toast]);

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
      const fileToDelete = carImages.find(img => img.id === selectedFileId);
      if (fileToDelete && !fileToDelete.file) {
        await axiosInstance.delete(`${API_FILE_INFO}/${selectedFileId}`);
      }
      
      setCarImages((prev) => {
        const filtered = prev.filter((img) => img.id !== selectedFileId);
        if (fileToDelete && fileToDelete.url && fileToDelete.file) {
          URL.revokeObjectURL(fileToDelete.url);
        }
        return filtered;
      });
      toast("Xóa tệp thành công!", "success");
    } catch (error) {
      toast(error?.response?.data?.message || "Không thể xóa tệp!", "error");
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  }, [selectedFileId, carImages, toast]);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      const isCarImageUrl = carImages.some(img => img.url === previewUrl);
      if (!isCarImageUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
    setPreviewUrl("");
    setPreviewFileName("");
  }, [previewUrl, carImages]);

  const fileTreeData = React.useMemo(() => {
    return carImages.map((file) => ({
      id: file.id,
      name: file.name,
      file: file.file,
      isFolder: false
    }));
  }, [carImages]);

  // Cleanup for object URLs
  useEffect(() => {
    return () => {
      carImages.forEach(img => {
        if (img.url && img.file) URL.revokeObjectURL(img.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadClick = useCallback(() => {
    if (carImages.length >= 10) {
      toast("Vượt số lượng cho phép 10 file", "error");
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [carImages.length, toast]);

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
        {/* SECTION 1: THÔNG TIN XE */}
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
              THÔNG TIN XE
            </StyledHeaderContent>
            </div>
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
                    label="Loại xe"
                    placeholder="Nhập loại xe"
                    required
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
                    number
                    {...field}
                    error={!!errors.seats}
                    helperText={errors.seats?.message}
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
                   url={`${API_LIST_DRIVERS}?unassignedManager=true${initialManagerId ? `&currentManagerId=${initialManagerId}` : ''}`}
                   dataPath="items"
                   queryParam="fullName"
                   optionLabel="fullName"
                   optionValue="driverId"
                   required
                   error={!!errors.manager}
                   helperText={errors.manager?.message}
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
                    error={!!errors.note}
                    helperText={errors.note?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>

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
               HÌNH ẢNH XE
           </StyledHeaderContent>
           </div>
           <HiddenInput
              type="file" 
              multiple 
              ref={fileInputRef}
              onChange={handleImageUpload}
           />
          
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

           {carImages.length > 0 ? (
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

export default withSharedComponents(UpdateCar);