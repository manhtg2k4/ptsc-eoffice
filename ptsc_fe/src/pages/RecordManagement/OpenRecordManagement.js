import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Controller, useForm } from "react-hook-form";
import { Grid, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import { 
  StyledBoxContainerContent,
  StyledIconWrapper,
  StyledHeaderContent,
  StyledDivider
} from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import withSharedComponents from "@components/WrapperComponent";
import { withFormWrapper } from "@components/common/FormWrapper";
import {
  defaultValueRecordManagement,
  recordManagementSchema,
} from "./constantsRecordManagement";
import { API_PROFILE, API_GET_DATA_FILE } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import {
} from "@styles/RecordManagement.styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { useToast } from "@components/common/ToastProvider";
import FolderSelectionDialog from "./FolderSelectionDialog";
import SearchIcon from "@mui/icons-material/Search";
import { 
  FlexGrowBox,
  FooterActions
} from "@styles/BaseSwiper/BaseSwiper.style";
// import axiosInstance from "@utils/axiosInstance";

const StyledConfirmButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  textTransform: 'none',
  padding: '6px 16px',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  }
}));

// const StyledSearchButtonWrapper = styled(Grid)(({ theme }) => ({
//   display: 'flex',
//   alignItems: 'flex-end',
//   paddingBottom: theme.spacing(0.5)
// }));

const StyledSearchFromCategoryButton = styled(Button)(() => ({
  height: '40px',
  textTransform: 'none',
  whiteSpace: 'nowrap'
}));

const OpenRecordManagement = ({
  open,
  onClose,
  sharedComponents,
  title,
  setReloadData,
  initialFolder,
  hiddenSearchCategory = false
}) => {
  const {
    BaseSwipper,
    InputComponents: BaseInput,
    DatePicker: BaseDatePicker,
  } = sharedComponents;

  const InputComponents = React.useMemo(() => {
    return withFormWrapper(BaseInput, "input");
  }, [BaseInput]);

  const DatePicker = React.useMemo(() => {
    return withFormWrapper(BaseDatePicker, "date");
  }, [BaseDatePicker]);
  // const dispatch = useDispatch();
  const toast = useToast();
  const { crmSource } = useSelector((state) => state.config);
  // const [organizationUnitOptions, setOrganizationUnitOptions] = useState([]);
  const [openFolderDialog, setOpenFolderDialog] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(recordManagementSchema),
    defaultValues: {
      ...defaultValueRecordManagement,
      archivesStartDate: dayjs().toISOString(),
      archivesEndDate: null,
    },
  });

  // useEffect(() => {
  //   const fetchOrganizationUnits = async () => {
  //     try {
  //       const response = await axiosInstance.get(API_GET_LIST_UNIT);
  //       if (response) {
  //           setOrganizationUnitOptions(Array.isArray(response) ? response : []);
  //       }
  //     } catch (error) {
  //       logger.error("Error fetching organization units:", error);
  //     }
  //   };
  //   fetchOrganizationUnits();
  // }, []);

  // const archivesOrganizationUnitOptions = organizationUnitOptions;
  const archivesDeadlineOptions =
    crmSource.find((item) => item.code === "S96")?.data || [];
  const archivesLanguageOptions =
    crmSource.find((item) => item.code === "S95")?.data || [];
  const archivesModeOptions =
    crmSource.find((item) => item.code === "S94")?.data || [];

  const handleDateChange = useCallback(
    (field) => (newDate) => {
      field.onChange(newDate ? dayjs(newDate).toISOString() : null);
    },
    []
  );

  const handleSave = handleSubmit(async (data) => {
    try {
      const payload = {
        title: data.archivesName,
        category: data.category,
        relatedDepartment: Array.isArray(data.archivesOrganizationUnit) ? data.archivesOrganizationUnit.join(",") : data.archivesOrganizationUnit,
        formationYear: dayjs(data.archivesYear).year().toString(),
        retentionPeriod: data.archivesDeadline,
        usageMode: data.archivesMode,
        language: data.archivesLanguage,
        startDate: data.archivesStartDate ? dayjs(data.archivesStartDate).format("YYYY-MM-DD") : null,
        endDate: data.archivesEndDate ? dayjs(data.archivesEndDate).format("YYYY-MM-DD") : null,
        notes: data.archivesNote,
        recordState: "1"
      };
      
      await api.post(API_PROFILE, payload);
      toast("Mở hồ sơ thành công!", "success");
      onClose();
      if (setReloadData) setReloadData(new Date() * 1);
    } catch (error) {
       toast(error?.response?.data?.message || "Lỗi khi mở hồ sơ!", "error");
    }
  });

  const handleOpenFolderDialog = () => setOpenFolderDialog(true);
  const handleCloseFolderDialog = () => setOpenFolderDialog(false);

  const handleSelectFolder = useCallback((folder) => {
    if (folder) {
      let normalized = { ...folder };

      // 1. Check if tree response format
      if (folder.folders && Array.isArray(folder.folders)) {
        const f = folder.folders[0];
        const fl = f?.files?.[0];
        const doc = fl?.documents?.[0];

        normalized = {
          id: doc?.id || folder.id,
          folderTitle: f?.profileHeading,
          fileTitle: fl?.archivesOrganizationUnit || fl?.fileSymbol,
          documentTitle: doc?.archivesName,
          documentSymbol: doc?.archivesNumber,
          year: folder.year,
          retentionPeriod: doc?.archiveRecord?.retentionPeriod,
          usageMode: doc?.archiveRecord?.usageMode,
          language: doc?.archiveRecord?.language,
          notes: doc?.archiveRecord?.notes,
        };
      }
      // 2. Check if nested document response from /api/record-catalog/document
      else if (folder.fileRecord || folder.yearCategory || folder.archiveRecord) {
        normalized = {
          id: folder.id,
          folderTitle: folder.fileRecord?.folderDetail?.title || "",
          fileTitle: folder.fileRecord?.title || folder.fileRecord?.fileSymbol,
          documentTitle: folder.documentTitleOriginal || folder.documentTitle,
          documentSymbol: folder.documentSymbol,
          year: folder.yearCategory?.year || folder.yearCategory?.title,
          retentionPeriod: folder.archiveRecord?.retentionPeriod,
          usageMode: folder.archiveRecord?.usageMode,
          language: folder.archiveRecord?.language,
          notes: folder.archiveRecord?.notes,
        };
      }

      let title = normalized.documentTitleOriginal || normalized.documentTitle;
      try {
        if (title && typeof title === 'string' && title.includes('<')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(title, 'text/html');
          const span = doc.querySelector('span');
          if (span) {
            title = span.textContent?.trim() || "";
          } else {
            title = doc.body.textContent?.trim() || "";
          }
        }
      } catch (e) {
        logger.error(e);
      }

      setValue("profileHeading", normalized.folderTitle || "", { shouldValidate: true });
      setValue("archivesOrganizationUnit", normalized.fileTitle ? [normalized.fileTitle] : [], { shouldValidate: true });
      setValue("archivesName", title || "", { shouldValidate: true });
      setValue("archivesNumber", normalized.documentSymbol || "", { shouldValidate: true });
      
      const year = normalized.year;
      if (year && !isNaN(year)) {
        const yearDate = dayjs(`${year}-01-01`).toISOString();
        setValue("archivesYear", yearDate, { shouldValidate: true });
      }
      if (normalized.retentionPeriod) {
        setValue("archivesDeadline", normalized.retentionPeriod, { shouldValidate: true });
      }
      if (normalized.usageMode) {
        setValue("archivesMode", normalized.usageMode, { shouldValidate: true });
      }
      if (normalized.language) {
        setValue("archivesLanguage", normalized.language, { shouldValidate: true });
      }
      if (normalized.notes) {
        setValue("archivesNote", normalized.notes, { shouldValidate: true });
      }
      setValue("category", normalized._id || normalized.id);
    }
  }, [setValue]);

  React.useEffect(() => {
    if (open) {
      setValue("archivesStartDate", dayjs().toISOString(), { shouldValidate: true });
    }
  }, [open, setValue]);

  React.useEffect(() => {
    if (open && initialFolder) {
      const docId = initialFolder.id || initialFolder._id || (typeof initialFolder === 'string' ? initialFolder : null);

      if (docId && (!initialFolder.folderTitle || !initialFolder.fileTitle)) {
        const fetchTreeData = async () => {
          try {
            const res = await api.get(`${API_GET_DATA_FILE}/${docId}`);
            const treeData = res.data;
            if (treeData && treeData.folders) {
              handleSelectFolder(treeData);
            } else {
              handleSelectFolder(initialFolder);
            }
          } catch (err) {
            logger.error("Failed to load document tree data:", err);
            handleSelectFolder(initialFolder);
          }
        };
        fetchTreeData();
      } else {
        handleSelectFolder(initialFolder);
      }
    }
  }, [open, initialFolder, handleSelectFolder]);

  return (
    <>
      <BaseSwipper
        title={title || "Mở hồ sơ"}
        open={open}
        onClose={onClose}
        onSave={handleSave}
        type="add"
        hideBackdrop
          footer={
          <>
          <FlexGrowBox />
                        <FooterActions>
                          <StyledConfirmButton
            onClick={handleSave}
            variant="contained"
          >
            XÁC NHẬN MỞ HỒ SƠ
          </StyledConfirmButton>
                          </FooterActions></>
          
        }
      >
        <StyledBoxContainerContent styledMarginTop={10}>
          <Grid container spacing={2}>
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
                  <StyledHeaderContent variant="h6" noWrap>
                    Thông tin chung
                  </StyledHeaderContent>
                </div>
                {!hiddenSearchCategory && (
                  <StyledSearchFromCategoryButton
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleOpenFolderDialog}
                  >
                    TÌM KIẾM TỪ HỒ SƠ
                  </StyledSearchFromCategoryButton>
                )}
              </div>
              <StyledDivider />
            </Grid>
             <Grid item xs={12} md={6}>
                          <Controller
                            name="profileHeading"
                            control={control}
                            render={({ field }) => (
                              <InputComponents
                                label="Đề mục hồ sơ"
                                placeholder="Nhập đề mục hồ sơ"
                                disabled
                                required
                                {...field}
                                error={!!errors.profileHeading}
                                helperText={errors.profileHeading?.message}
                              />
                            )}
                          />
                        </Grid>
                         <Grid item xs={12} md={6}>
                                      <Controller
                                        name="archivesOrganizationUnit"
                                        control={control}
                                        render={({ field }) => (
                                          <InputComponents
                                            // select
                                            // multiple
                                            label="Phòng ban/đơn vị liên quan"
                                            placeholder="Chọn phòng ban đơn vị con"
                                            // options={archivesOrganizationUnitOptions}
                                            // customLabel="name"
                                            // customValue="id"
                                            {...field}
                                            // value={Array.isArray(field.value) ? field.value : []}
                                            required
                                            error={!!errors.archivesOrganizationUnit}
                                            helperText={errors.archivesOrganizationUnit?.message}
                                            disabled
                                          />
                                        )}
                                      />
                                    </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tiêu đề hồ sơ"
                    placeholder="Tìm kiếm từ danh mục"
                    disabled
                    required
                    {...field}
                    error={!!errors.archivesName}
                    helperText={errors.archivesName?.message}
                  />
                )}
              />
            </Grid>
          

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesNumber"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Số và ký hiệu hồ sơ"
                    placeholder="Nhập dữ liệu..."
                    {...field}
                    required
                    disabled
                    error={!!errors.archivesNumber}
                    helperText={errors.archivesNumber?.message}
                  />
                )}
              />
            </Grid>
      

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesYear"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Năm hình thành"
                    placeholder="Chọn năm hình thành"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={handleDateChange(field)}
                    required
                    disabled
                    views={['year']}
                    format="YYYY"
                    error={!!errors.archivesYear}
                    helperText={errors.archivesYear?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesDeadline"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Thời hạn bảo quản"
                    placeholder="Chọn thời hạn bảo quản"
                    options={archivesDeadlineOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    required
                    error={!!errors.archivesDeadline}
                    helperText={errors.archivesDeadline?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesMode"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Chế độ sử dụng"
                    placeholder="Chọn chế độ sử dụng"
                    options={archivesModeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    required
                    error={!!errors.archivesMode}
                    helperText={errors.archivesMode?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesLanguage"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Ngôn ngữ"
                    placeholder="Chọn ngôn ngữ"
                    options={archivesLanguageOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.archivesLanguage}
                    helperText={errors.archivesLanguage?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="archivesStartDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày bắt đầu"
                    value={field.value ? dayjs(field.value) : null}
                    required
                    onChange={handleDateChange(field)}
                    error={!!errors.archivesStartDate}
                    helperText={errors.archivesStartDate?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="archivesEndDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Ngày kết thúc"
                    value={field.value ? dayjs(field.value) : null}
                    required
                    onChange={handleDateChange(field)}
                    error={!!errors.archivesEndDate}
                    helperText={errors.archivesEndDate?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="archivesNote"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Ghi chú"
                    placeholder="Nhập ghi chú"
                    {...field}
                    error={!!errors.archivesNote}
                    helperText={errors.archivesNote?.message}
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
          </Grid>
        </StyledBoxContainerContent>
      </BaseSwipper>

      <FolderSelectionDialog
        open={openFolderDialog}
        onClose={handleCloseFolderDialog}
        onSave={handleSelectFolder}
      />
    </>
  );
};

OpenRecordManagement.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sharedComponents: PropTypes.object.isRequired,
  title: PropTypes.string,
  setReloadData: PropTypes.func,
};

export default withSharedComponents(OpenRecordManagement);
