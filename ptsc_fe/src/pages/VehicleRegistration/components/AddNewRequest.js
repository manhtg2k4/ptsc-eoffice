import React, { useEffect, useCallback } from "react";
import {
  SkyGrid as Grid,
//   SkyTypography as Typography,
//   SkyFormControlLabel as FormControlLabel,
//   SkyCheckbox as Checkbox,
  SkyListItemText as ListItemText,
  SkyMenu as Menu,
  SkyMenuItem as MenuItem,
} from "@styles/SkyStyles";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { DeleteOutline, Visibility } from "@mui/icons-material";
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
  // VehicleSectionTitle as JobSectionTitle,
  StyledBoxContainerContent,
  SectionHeaderContainer,
  // JobButtonContainer,
  JobUploadPlaceholderBox,
  JobPlaceholderText,
  StyledMenuIcon,
  // BlueActionButton,
  // HeaderGridContainer,
//   ImportantGuestLabel,
  StyledListItemIcon,
} from "@pages/VehicleRegistration/componentStyle/VehicleRequest.styles";

import FileTreeTable from "@components/FileTreeTable";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import LoadingDialog from "@components/LoadingDialog";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { API_VEHICLE_REQUEST, API_ACTIONS_ADD_REQUEST, APP_BASE, API_XLSX_TO_PDF } from "@EnvironmentFile/constants/urlConfig";
import { apiUploadFile } from "@services/FileUpload/fileUpload";
import FilePreviewDialog from "@components/UploadFile/components/FilePreviewDialog";
import api from "@services/api";
import FormButton from "@components/FormButton";
import { typeFlagMap } from "@components/FormButton/constant";
import { withFormWrapper } from "@components/common/FormWrapper";
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const AddNewRequest = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  title = "Thêm mới yêu cầu",
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
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const [isLoading, setIsLoading] = React.useState(false);
  const [dataForFormButton, setDataForFormButton] = React.useState({
    availableActions: [],
    flags: {},
  });
  // const [, setReloadData] = React.useState(null);
  const { crmSource } = useSelector((state) => state.config);

  const requestTypeOptions = React.useMemo(() =>
    crmSource.find((item) => item.code === "LYCDKX")?.data || [], [crmSource]);
  // const priorityOptions = React.useMemo(() =>
  //   crmSource.find((item) => item.code === "DOUUTIENDATXE")?.data || [], [crmSource]);
  // const importantGuestsOptions = React.useMemo(() =>
  //   crmSource.find((item) => item.code === "TIEPKHACHQUANTRONG")?.data || [], [crmSource]);
  
  // File management states
  const [uploadedFiles, setUploadedFiles] = React.useState([]);
  const [fileMenuAnchor, setFileMenuAnchor] = React.useState(null);
  const [selectedFileId, setSelectedFileId] = React.useState(null);
//   const [selectedIsFolder, setSelectedIsFolder] = React.useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSwitchWarningOpen, setIsSwitchWarningOpen] = React.useState(false);
  // const [pendingGuestValue, setPendingGuestValue] = React.useState(null);
  const [pendingFiles, setPendingFiles] = React.useState([]);

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewFileName, setPreviewFileName] = React.useState("");

  const schema = yup.object().shape({
    requestType: yup.string().required("Vui lòng chọn loại yêu cầu"),
    // isImportantGuest: yup.string().nullable().required("Vui lòng chọn tiếp khách quan trọng"),
    // priority: yup.string().required("Vui lòng chọn mức độ ưu tiên"),
    departureTime: yup.date().required("Vui lòng chọn Dự kiến thời gian đi").typeError("Dự kiến thời gian đi không hợp lệ").min(new Date(), "Dự kiến thời gian đi không được trong quá khứ"),
    returnTime: yup.date().required("Vui lòng chọn Dự kiến thời gian về").typeError("Dự kiến thời gian về không hợp lệ").min(yup.ref('departureTime'), "Dự kiến thời gian về phải lớn hơn hoặc bằng Dự kiến thời gian đi"),
    departurePoint: yup.string().required("Vui lòng nhập nơi xuất phát").max(300, "Nơi xuất phát tối đa 300 ký tự"),
    destination: yup.string().required("Vui lòng nhập nơi đến").max(300, "Nơi đến tối đa 300 ký tự"),
    passengerCount: yup.number().transform((value, originalValue) => (String(originalValue).trim() === "" ? null : value)).nullable().required("Vui lòng nhập số lượng người đi").min(1, "Số lượng người đi phải từ 1 đến 50").max(50, "Số lượng người đi phải từ 1 đến 50").typeError("Vui lòng chỉ nhập số"),
    contactPerson: yup.string().required("Vui lòng nhập người liên hệ").max(100, "Người liên hệ tối đa 100 ký tự"),
    contactPhone: yup.string().required("Vui lòng nhập số điện thoại liên hệ").transform((value) => value.replace(/\s/g, '')).matches(/^(0|84)[0-9]{8,10}$/, "Số điện thoại không đúng định dạng (Bắt đầu bằng 0 hoặc 84, từ 9-11 số)"),
    // purpose: yup.string().required("Vui lòng nhập mục đích công tác").max(500, "Mục đích công tác tối đa 500 ký tự"),
    notes: yup.string().max(500, "Ghi chú tối đa 500 ký tự"),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    // setValue,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      requestType: "",
      // isImportantGuest: null,
      // priority: "",
      departureTime: null,
      returnTime: null,
      departurePoint: "",
      destination: "",
      passengerCount: null,
      contactPerson: "",
      contactPhone: "",
      // purpose: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      let currentUser = authUser?.user || {};

      reset({
        requestType: requestTypeOptions[0]?.value || "",
        // isImportantGuest: importantGuestsOptions[0]?.value || null,
        // priority: priorityOptions[0]?.value || "",
        departureTime: null,
        returnTime: null,
        departurePoint: "",
        destination: "",
        passengerCount: 1,
        contactPerson: currentUser.fullName || currentUser.name || "",
        // purpose: "",
        notes: "",
      });
      setUploadedFiles([]);

      // Fetch dynamic actions for Add New
      const fetchActions = async () => {
        try {
          const response = await axiosInstance.get(API_ACTIONS_ADD_REQUEST);
          const responseData = response?.data || response;
          const availableActions = responseData.availableActions || [];
          const flags = {};
          availableActions.forEach(a => {
            const flagName = typeFlagMap[a.type];
            if (flagName) flags[flagName] = true;
          });
          setDataForFormButton({
            ...responseData,
            availableActions,
            flags: flags
          });
        } catch (error) {
          logger.error("Error fetching actions for Add New Request:", error);
        }
      };
      fetchActions();
    }
  }, [open, reset, requestTypeOptions, authUser?.user]);

  // const getPreviousWorkingDay = (date) => {
  //   let prev = date.subtract(1, "day");
  //   while (prev.day() === 0 || prev.day() === 6) {
  //     prev = prev.subtract(1, "day");
  //   }
  //   return prev;
  // };

  const onSubmit = async (data, actionParams = {}) => {
    setIsLoading(true);
    try {
      // const now = dayjs();
      // const departureTime = dayjs(data.departureTime);
      
      // const selectedType = requestTypeOptions.find(opt => opt.value === data.requestType);
      // const typeTitle = selectedType?.title?.toLowerCase() || "";
      // const isTrongThanhPho = typeTitle.includes("trong thành phố") || typeTitle.includes("trong tp");
      // const isDiTinh = typeTitle.includes("đi tỉnh") || typeTitle.includes("ngoại tỉnh");

      // if (isTrongThanhPho) {
      //    const deadline = getPreviousWorkingDay(departureTime).set('hour', 16).set('minute', 0).set('second', 0);
      //    if (now.isAfter(deadline)) {
      //       toast("Yêu cầu đi trong thành phố phải được tạo trước 16:00 ngày làm việc trước ngày khởi hành.", "error");
      //       setIsLoading(false);
      //       return;
      //    }
      // } else if (isDiTinh) {
      //    if (departureTime.diff(now, 'hour', true) < 24) {
      //       toast("Yêu cầu đi tỉnh phải được tạo trước ít nhất 24 giờ so với thời gian khởi hành.", "error");
      //       setIsLoading(false);
      //       return;
      //    }
      // }

      if (data.departureTime && data.returnTime) {
        if (dayjs(data.departureTime).isSameOrAfter(dayjs(data.returnTime))) {
           toast("Dự kiến thời gian đi phải nhỏ hơn dự kiến thời gian về", "error");
           setIsLoading(false);
           return;
        }
      }

      // if (data.isImportantGuest === "co" && uploadedFiles.length === 0) {
      //   toast("Vui lòng tải lên tệp đính kèm tiếp khách quan trọng", "error");
      //   setIsLoading(false);
      //   return;
      // }

      const payload = {
        ...data,
        passengerCount: data.passengerCount ? Number(data.passengerCount) : null,
        ...actionParams, // Add flowConfig, actionCode, workItem if provided
      };

      const response = await axiosInstance.post(API_VEHICLE_REQUEST, payload);
      
      // Try to get the ID from various possible locations in the response
      const newRequestId = response?.data?._id || response?._id || response?.id || response?.data?.id || response?.data?.id || response?.data?.data?.id || response?.data?.data?._id;

      if (uploadedFiles.length > 0) {
        if (!newRequestId) {
           logger.warn("Could not find ID in response:", response);
           toast("Tạo yêu cầu thành công nhưng không thể tải file (không tìm thấy ID)", "warning");
        } else {
           const uploadPromises = uploadedFiles.map(file => 
              apiUploadFile(file, "vehicleRegistration", newRequestId)
           );
           await Promise.all(uploadPromises);
        }
      }
      
      toast("Thêm mới yêu cầu đặt xe thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra!";
      toast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessingAction = (type, actionInfo) => {
    if (type === 'submit_vehicle_registrant') {
      const { action } = actionInfo;
      handleSubmit((data) => onSubmit(data, {
        flowConfig: action.flowConfig || dataForFormButton?.flowConfig?.id,
        actionCode: action.actionCode || action.code,
        workItem: action.workItem || dataForFormButton?.workItem
      }))();
    }
  };

  const MAX_FILES = 10;

  // const isImportantGuestValue = useWatch({ control, name: "isImportantGuest" });
  const departureTimeValue = useWatch({ control, name: "departureTime" });
  const showAttachmentSection = false; // isImportantGuestValue === "co";


  const handleFilesChange = useCallback((event) => {
    const newFiles = Array.from(event.target.files);
    if (!newFiles.length) return;

    // Filter by type and size
    const validFiles = [];
    for (const file of newFiles) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        toast(`File ${file.name} không đúng định dạng cho phép (${ALLOWED_EXTENSIONS.join(', ')})`, "error");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast(`File ${file.name} vượt quá dung lượng tối đa 10MB`, "error");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      event.target.value = null;
      return;
    }

    const remainingSlots = MAX_FILES - uploadedFiles.length;
    if (remainingSlots <= 0) {
      toast("Vượt số lượng cho phép 10 file", "error");
      event.target.value = null;
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);
    if (validFiles.length > remainingSlots) {
      toast("Vượt số lượng cho phép 10 file", "error");
    }

    // Simplified duplicate check for now (based on name)
    const isDuplicate = filesToAdd.some(nf => 
      uploadedFiles.some(ef => ef.name === nf.name)
    );

    if (isDuplicate) {
      setPendingFiles(filesToAdd);
      setIsConfirmDialogOpen(true);
    } else {
      setUploadedFiles((prev) => [...prev, ...filesToAdd]);
    }
    event.target.value = null;
  }, [uploadedFiles, toast]);

  const handleConfirmUpload = useCallback(() => {
    // Basic auto-rename logic for duplicates
    const renamedFiles = pendingFiles.map(f => {
      let newName = f.name;
      let counter = 1;
      while (uploadedFiles.some(ef => ef.name === newName)) {
        const parts = f.name.split('.');
        if (parts.length > 1) {
          const ext = parts.pop();
          newName = `${parts.join('.')} (${counter}).${ext}`;
        } else {
          newName = `${f.name} (${counter})`;
        }
        counter++;
      }
      return new File([f], newName, { type: f.type });
    });
    setUploadedFiles((prev) => [...prev, ...renamedFiles]);
    setPendingFiles([]);
    setIsConfirmDialogOpen(false);
  }, [pendingFiles, uploadedFiles]);

  const handleFileMenuClick = useCallback((event) => {
    const fileId = event.currentTarget.getAttribute('data-file-id');
    // const isFolder = event.currentTarget.getAttribute('data-is-folder') === '1';
    setSelectedFileId(fileId);
    // setSelectedIsFolder(isFolder);
    setFileMenuAnchor(event.currentTarget);
  }, []);

  const handleCloseFileMenu = useCallback(() => {
    setFileMenuAnchor(null);
  }, []);

  const handleDeleteFile = useCallback(() => {
    setUploadedFiles((prev) => prev.filter((_, index) => index.toString() !== selectedFileId));
    setIsDeleteDialogOpen(false);
    handleCloseFileMenu();
  }, [selectedFileId, handleCloseFileMenu]);

  const fileTreeData = React.useMemo(() => {
    // Simplified conversion for now since we don't have folders yet in this form
    return uploadedFiles.map((file, index) => ({
      id: index.toString(),
      name: file.name,
      file: file,
      isFolder: false
    }));
  }, [uploadedFiles]);

  const handleViewFile = useCallback(async () => {
    const fileObj = uploadedFiles[selectedFileId];
    if (!fileObj) {
      handleCloseFileMenu();
      return;
    }

    const fileName = fileObj.name || "T\u00e0i li\u1ec7u";
    const lower = fileName.toLowerCase();
    const isDoc = /\.(doc|docx)$/i.test(lower);
    const isExcel = /\.(xls|xlsx)$/i.test(lower);
    const isBrowserFile = /\.(pdf|jpeg|jpg|png|gif|webp|bmp)$/i.test(lower);

    if (isDoc || isExcel) {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", fileObj);

        const urlEndpoint = isDoc ? `${APP_BASE}/api/file-to-pdf` : API_XLSX_TO_PDF;
        const response = await api.post(urlEndpoint, formData, {
          responseType: "blob",
          timeout: 0,
        });

        const pdfBlob = new Blob([response.data || response], {
          type: "application/pdf",
        });
        const url = URL.createObjectURL(pdfBlob);
        setPreviewUrl(url);
        setPreviewFileName(fileName);
        setPreviewOpen(true);
      } catch (error) {
        toast("Lỗi xem file", "error");
      } finally {
        setIsLoading(false);
        handleCloseFileMenu();
      }
      return;
    }

    if (isBrowserFile) {
      const url = URL.createObjectURL(fileObj);
      setPreviewUrl(url);
      setPreviewFileName(fileName);
      setPreviewOpen(true);
    } else {
      toast(
        "Vui lòng kiểm tra lại file.",
        "warning"
      );
    }

    handleCloseFileMenu();
  }, [uploadedFiles, selectedFileId, handleCloseFileMenu, toast]);

  const handleClosePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewOpen(false);
    setPreviewUrl("");
    setPreviewFileName("");
  }, [previewUrl]);

  const handleOpenDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCloseConfirmDialog = useCallback(() => {
    setIsConfirmDialogOpen(false);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  // const handleImportantGuestChange = useCallback((e) => {
  //   const newValue = e?.target ? e.target.value : e;
  //   if (isImportantGuestValue === "co" && newValue === "khong" && uploadedFiles.length > 0) {
  //     setPendingGuestValue(newValue);
  //     setIsSwitchWarningOpen(true);
  //   } else {
  //     setValue("isImportantGuest", newValue, { shouldValidate: true });
  //   }
  // }, [isImportantGuestValue, uploadedFiles.length, setValue]);

  const handleConfirmSwitch = () => {
    setUploadedFiles([]);
    // setValue("isImportantGuest", pendingGuestValue);
    setIsSwitchWarningOpen(false);
  };

  const handleCloseSwitchWarning = () => {
    setIsSwitchWarningOpen(false);
  };

  const handleUploadClick = useCallback((e) => {
    if (uploadedFiles.length >= MAX_FILES) {
      e.preventDefault();
      toast("Vượt số lượng cho phép 10 file", "error");
    }
  }, [uploadedFiles.length, toast]);

	return (
		<BaseSwipper
			title={title}
			open={open}
			onClose={onClose}
			onSave={handleSubmit(onSubmit)}
			type="add"
			hideBackdrop
			isLoading={isLoading}
			footer={
				<>
					<FlexGrowBox />
					<FooterActions>
						<FormButton
							dataDetail={dataForFormButton}
							setReloadData={onSuccess}
							onClose={onClose}
							onAction={handleProcessingAction}
						/>
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
									<path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
									<path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
									<path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
									<path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
									<path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
								</svg>
							</StyledIconWrapper>
							<StyledHeaderContent variant="h6">
								THÔNG TIN YÊU CẦU ĐĂNG KÝ XE

							</StyledHeaderContent>
						</div>
						{/* <FormControlLabel
              control={
                <Controller
                  name="isImportantGuest"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      size="small"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              }
              label={<ImportantGuestLabel>Tiếp khách quan trọng</ImportantGuestLabel>}
              labelPlacement="start"
            /> */}
					</SectionHeaderContainer>
					<StyledDivider />
					<Grid container spacing={2}>
						{/* ROW 1 */}
						<Grid item xs={12} md={6}>
							<Controller
								name="requestType"
								control={control}
								render={({ field }) => (
									<InputComponents
										select
										label="Loại yêu cầu"
										required
										options={requestTypeOptions}
										customLabel="title"
										customValue="value"
										{...field}
										error={!!errors.requestType}
										helperText={errors.requestType?.message}
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
										required
										options={priorityOptions}
										customLabel="title"
										customValue="value"
										{...field}
										error={!!errors.priority}
										helperText={errors.priority?.message}
									/>
								)}
							/>
						</Grid> */}
						{/* <Grid item xs={12} md={6}>
							<Controller
								name="isImportantGuest"
								control={control}
								render={({ field }) => (
									<InputComponents
										select
										label="Tiếp khách quan trọng"
										required
										options={importantGuestsOptions}
										customLabel="title"
										customValue="value"
										{...field}
										onChange={handleImportantGuestChange}
										error={!!errors.isImportantGuest}
										helperText={errors.isImportantGuest?.message}
									/>
								)}
							/>
						</Grid> */}
						{/* ROW 5: Full width */}
						<Grid item xs={12} md={6}>
							<Controller
								name="passengerCount"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Số lượng người đi"
										placeholder="Nhập số lượng người đi"
										number
										required
										{...field}
										error={!!errors.passengerCount}
										helperText={errors.passengerCount?.message}
									/>
								)}
							/>
						</Grid>

						{/* ROW 2 */}
						<Grid item xs={12} md={6}>
							<Controller
								name="departureTime"
								control={control}
								render={({ field }) => (
									<DateTimePicker
										label="Dự kiến thời gian đi"
										required
										showTime
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

						{/* ROW 3 */}
						<Grid item xs={12} md={6}>
							<Controller
								name="departurePoint"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Nơi xuất phát"
										placeholder="Nhập nơi xuất phát"
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
										placeholder="Nhập nơi đến"
										required
										{...field}
										error={!!errors.destination}
										helperText={errors.destination?.message}
									/>
								)}
							/>
						</Grid>

						{/* ROW 4 */}
						<Grid item xs={12} md={6}>
							<Controller
								name="contactPerson"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Người liên hệ"
										placeholder="Nhập người liên hệ"
										required
										{...field}
										error={!!errors.contactPerson}
										helperText={errors.contactPerson?.message}
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
										placeholder="Nhập số điện thoại liên hệ"
										required
										{...field}
										error={!!errors.contactPhone}
										helperText={errors.contactPhone?.message}
									/>
								)}
							/>
						</Grid>



						{/* ROW 6: Full width */}
						{/* <Grid item xs={12}>
							<Controller
								name="purpose"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Mục đích công tác"
										placeholder="Nhập mục đích công tác"
										required
										{...field}
										error={!!errors.purpose}
										helperText={errors.purpose?.message}
									/>
								)}
							/>
						</Grid> */}

						{/* ROW 7: Full width */}
						<Grid item xs={12}>
							<Controller
								name="notes"
								control={control}
								render={({ field }) => (
									<InputComponents
										label="Ghi chú"
										placeholder="Nhập ghi chú"
										multiline
										rows={2}
										{...field}
										error={!!errors.notes}
										helperText={errors.notes?.message}
									/>
								)}
							/>
						</Grid>
					</Grid>
				</StyledBoxContainerContent>

				{/* SECTION 2: TỆP ĐÍNH KÈM TIẾP KHÁCH QUAN TRỌNG - chỉ hiển thị khi isImportantGuest === "co" */}
				{showAttachmentSection && (
					<StyledBoxContainerContent styledMarginTop>
						<Grid item xs={12}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
									<StyledIconWrapper>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M2.53027 16.6411L2.53027 3.36109C2.53027 2.7007 2.7928 2.06756 3.25977 1.60059C3.72673 1.13362 4.35988 0.871094 5.02027 0.871094L12.4903 0.871094L12.5721 0.875144C12.7622 0.893977 12.9409 0.978023 13.0771 1.11426L17.2271 5.26426C17.3828 5.41992 17.4703 5.63096 17.4703 5.85109L17.4703 16.6411C17.4703 17.3015 17.2077 17.9346 16.7408 18.4016C16.2738 18.8686 15.6407 19.1311 14.9803 19.1311L5.02027 19.1311C4.35988 19.1311 3.72673 18.8686 3.25977 18.4016C2.7928 17.9346 2.53027 17.3014 2.53027 16.6411ZM4.19027 16.6411C4.19027 16.8612 4.27778 17.0723 4.43344 17.2279C4.5891 17.3836 4.80014 17.4711 5.02027 17.4711L14.9803 17.4711C15.2004 17.4711 15.4115 17.3836 15.5671 17.2279C15.7228 17.0723 15.8103 16.8612 15.8103 16.6411L15.8103 6.19476L12.1466 2.53109L5.02027 2.53109C4.80014 2.53109 4.5891 2.6186 4.43344 2.77426C4.27778 2.92992 4.19027 3.14096 4.19027 3.36109L4.19027 16.6411Z" fill="#2364B0" />
											<path d="M10.8506 5.00156L10.8506 1.68156C10.8506 1.22317 11.2222 0.851563 11.6806 0.851563C12.139 0.851563 12.5106 1.22317 12.5106 1.68156L12.5106 5.00156C12.5106 5.22169 12.5981 5.43274 12.7538 5.5884C12.9094 5.74406 13.1205 5.83156 13.3406 5.83156L16.6606 5.83156C17.119 5.83156 17.4906 6.20317 17.4906 6.66156C17.4906 7.11995 17.119 7.49156 16.6606 7.49156L13.3406 7.49156C12.6802 7.49156 12.047 7.22903 11.5801 6.76207C11.1131 6.2951 10.8506 5.66195 10.8506 5.00156Z" fill="#2364B0" />
											<path d="M8.32984 6.67188C8.78825 6.67188 9.15984 7.04348 9.15984 7.50187C9.15984 7.96027 8.78825 8.33187 8.32984 8.33187H6.66984C6.21145 8.33187 5.83984 7.96027 5.83984 7.50187C5.83984 7.04348 6.21145 6.67188 6.66984 6.67188L8.32984 6.67188Z" fill="#2364B0" />
											<path d="M13.3206 10C13.779 10 14.1506 10.3716 14.1506 10.83C14.1506 11.2884 13.779 11.66 13.3206 11.66L6.68059 11.66C6.22219 11.66 5.85059 11.2884 5.85059 10.83C5.85059 10.3716 6.22219 10 6.68059 10L13.3206 10Z" fill="#2364B0" />
											<path d="M13.3206 13.3398C13.779 13.3398 14.1506 13.7114 14.1506 14.1698C14.1506 14.6283 13.779 14.9998 13.3206 14.9998L6.68059 14.9998C6.22219 14.9998 5.85059 14.6283 5.85059 14.1698C5.85059 13.7114 6.22219 13.3398 6.68059 13.3398L13.3206 13.3398Z" fill="#2364B0" />
										</svg>
									</StyledIconWrapper>
									<StyledHeaderContent variant="h6" gutterBottom>
										TỆP ĐÍNH KÈM TIẾP KHÁCH QUAN TRỌNG
									</StyledHeaderContent>
								</div>


								<ButtonOutline
									component="label"
									startIcon={<CloudUploadIcon />}
									variant="contained"
									onClick={handleUploadClick}
								>
									Tải Lên
									<input type="file" hidden multiple onChange={handleFilesChange} />
								</ButtonOutline>
								{/* <BlueActionButton 
                startIcon={<DocumentScannerIcon />}
                variant="contained"
              >
                Quét
              </BlueActionButton> */}
							</div>
							<StyledDivider />
						</Grid>

						{/* Danh sách tệp đính kèm theo dạng bảng */}
						{uploadedFiles.length > 0 ? (
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
								<JobPlaceholderText variant="body2">Chưa có tài liệu nào được tải lên.</JobPlaceholderText>
							</JobUploadPlaceholderBox>
						)}
					</StyledBoxContainerContent>
				)}
			</JobMainContent>

			<CustomDialog
				isLoading={isLoading}
				open={isConfirmDialogOpen}
				onClose={handleCloseConfirmDialog}
				onSave={handleConfirmUpload}
				title="Xác nhận tải lên"
				titleButton="Tiếp tục"
				cancelButtonText="Hủy"
				size="sm"
			>
				Phát hiện tệp trùng tên. Bạn có muốn tiếp tục tải lên và tự động đổi tên các tệp trùng lặp không?
			</CustomDialog>

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

			<CustomDialog
				isLoading={isLoading}
				open={isSwitchWarningOpen}
				onClose={handleCloseSwitchWarning}
				onSave={handleConfirmSwitch}
				title="THÔNG BÁO"
				titleButton="ĐỒNG Ý"
				cancelButtonText="ĐÓNG"
				size="sm"
				type="delete" // Use red button style
			>
				Thay đổi này sẽ xóa toàn bộ tệp đính kèm tiếp khách quan trọng. Bạn có chắc chắn muốn tiếp tục?
			</CustomDialog>

			<LoadingDialog open={isLoading}>
				Đang xử lý, vui lòng đợi...
			</LoadingDialog>

			<FilePreviewDialog
				open={previewOpen}
				onClose={handleClosePreview}
				fileName={previewFileName}
				url={previewUrl}
			/>
		</BaseSwipper>
	);
};

export default withSharedComponents(AddNewRequest);

