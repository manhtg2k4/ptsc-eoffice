import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useForm } from "react-hook-form";
import { Grid } from "@mui/material";
import { StyledBoxContainerContent } from "@pages/IncomingDocumentManagement/components/AddIncommingDoc/components/AddIncommingDoc.styles";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import withSharedComponents from "@components/WrapperComponent";
import {
  defaultValueRecordManagement,
  recordManagementSchema,
  // recordManagementSchema
} from "./constantsRecordManagement";
import {
  JobProfileTableContainer,
  SectionTitleV2,
  UploadSection,
} from "@pages/TextAway/Tab/SigningSubmissionTab/componentStyle/AddDialog.style";

import CustomTable from "@components/CustomTable/CustomTable";
import CustomButton from "@components/CustomButton";
import PopupAddIndex from "./PopupAddIndex";
import {
  deleteDocument,
  postDocument,
  postDocumentDraft,
} from "@redux/slices/RecordManagement/RecordManagementSlice";
import { useToast } from "@components/common/ToastProvider";
import {
  StyledContainerTitle,
  StyledGeneralInformation,
  StyledSupTitle,
  StyledTitleStatus,
} from "@styles/RecordManagement.styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { pickMoreActions } from "@pages/TextAway/Tab/SigningSubmissionTab/constants";
import { API_GET_LIST_UNIT } from "@EnvironmentFile/constants/urlConfig";
import axiosInstance from "@utils/axiosInstance";

const AddRecordManagement = ({
  open,
  onClose,
  // onSuccess,
  sharedComponents,
  // mode = "add",
	title, // Nhận title từ props
	setReloadData
}) => {
  const {
    CustomSwipper,
    InputComponents,
    DatePicker,
    ButtonOutline,
  } = sharedComponents;
  const dispatch = useDispatch();
  const toast = useToast();
  // const [openDocumentReplyDialog, setOpenDocumentReplyDialog] = useState(false);
  const [documentIndexList, setDocumentIndexList] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const { crmSource } = useSelector((state) => state.config);
  const [organizationUnitOptions, setOrganizationUnitOptions] = useState([]);
  const draftIdRef = useRef(null);
  const isSavedRef = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    // reset,
  } = useForm({
    resolver: yupResolver(recordManagementSchema),
    defaultValues: defaultValueRecordManagement,
  });

  useEffect(() => {
    if (!open) return;
    isSavedRef.current = false;
    const fetchDraft = async () => {
      try {
        const res = await dispatch(postDocumentDraft({})).unwrap();
        draftIdRef.current = res.id;
        setValue("archivesNumber", res.archivesNumber, {
          shouldValidate: true,
        });
      } catch (error) {
        toast("Lỗi khi tự sinh Số và ký hiệu hồ sơ!", "error");
        logger.log("Draft error:", error);
      }
    };

    fetchDraft();
  }, [open, dispatch, setValue, toast]);

  useEffect(() => {
    dispatch(postDocumentDraft());
  }, [dispatch]);

  useEffect(() => {
    const fetchOrganizationUnits = async () => {
      try {
        const response = await axiosInstance.get(API_GET_LIST_UNIT);
        if (response) {
            setOrganizationUnitOptions(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        logger.error("Error fetching organization units:", error);
      }
    };
    fetchOrganizationUnits();
  }, []);

  useEffect(() => {
    setValue("listDocIndex", documentIndexList, { shouldValidate: true });
  }, [documentIndexList, setValue]);

  const existingCategoryNames = useMemo(() => {
    return documentIndexList.map((item) => item.groupName || item.nameDoc || "");
  }, [documentIndexList]);

  const archivesOrganizationUnitOptions = organizationUnitOptions;

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

  const handleSaveAddRecordManagement = handleSubmit(async (data) => {
    logger.log("data", data);
    try {
      const submitData = {
        title: data.archivesName,
        category: data.category,
        fileCode: data.archivesNumber,
        relatedDepartment: Array.isArray(data.archivesOrganizationUnit) ? data.archivesOrganizationUnit.join(",") : data.archivesOrganizationUnit,
        formationYear: data.archivesYear ? dayjs(data.archivesYear).year().toString() : "",
        retentionPeriod: data.archivesDeadline,
        usageMode: data.archivesMode,
        language: data.archivesLanguage,
        startDate: data.archivesStartDate ? dayjs(data.archivesStartDate).format("YYYY-MM-DD") : null,
        endDate: data.archivesEndDate ? dayjs(data.archivesEndDate).format("YYYY-MM-DD") : null,
        notes: data.archivesNote,
        recordState: "0", // Default state when adding
        items: documentIndexList.map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          groupName: item.groupName || item.nameDoc || "",
        })),
      };

      isSavedRef.current = true;
      await dispatch(postDocument(submitData)).unwrap();
      toast("Thêm mới hồ sơ thành công!", "success");
      onClose();
      if (setReloadData) setReloadData(new Date() * 1);
    } catch (error) {
      logger.log("Lỗi khi thêm mới!", error);
      toast("Lỗi khi thêm mới!", "error");
    }
  });

  // const handleToggleOpen = () => {
  //   // const key = e.currentTarget.dataset.section;

  //   // setIsOpen((prev) => ({
  //   //   ...prev,
  //   //   [key]: !prev[key],
  //   // }));
  //   setIsOpen((prev) => !prev);
  // };

  // const handleOpenReplyDialog = useCallback(() => {
  //   setOpenDocumentReplyDialog(true);
  // }, []);

  const handleOpenPopupAddIndex = () => {
    setIsOpen(true);
  };
  const handleClosePopupAddIndex = () => {
    setIsOpen(false);
  };

  const handleSaveAddIndex = (data) => {
    if (data && data.trim() !== "") {
      const newItem = {
        id: new Date().getTime(), // simple unique id
        nameDoc: data,
      };
      setDocumentIndexList((prevList) => [...prevList, newItem]);
    }
  };

  const handleCloseEditPopup = () => {
    setEditingIndex(null);
  };

  const handleSaveEditIndex = (editedName) => {
    if (!editingIndex || !editingIndex.item) return;
    if (editedName && editedName.trim() !== "") {
      setDocumentIndexList((prevList) =>
        prevList.map((item) => {
          const idToMatch = item.id || item.tempId;
          const editingIdToMatch = editingIndex.item.id || editingIndex.item.tempId;
          return idToMatch === editingIdToMatch
            ? { ...item, groupName: editedName }
            : item;
        })
      );
    }
    handleCloseEditPopup();
  };

  const handleMoreAction = useCallback((action, row) => {
    switch (action.id) {
      case "download": {
        logger.log("download", row);
        const file =
          row?.files && Array.isArray(row.files) && row.files.length > 0
            ? row.files[0]
            : null;
        if (!file) return;
        // createActionHandler(handleDownload, file)();
        break;
      }
      case "edit":
        setEditingIndex({ open: true, item: row });
        break;
      case "delete": {
        setDocumentIndexList((prevList) =>
          prevList.filter((item) => {
            const idToMatch = item.id || item.tempId;
            const rowIdToMatch = row.id || row.tempId;
            return idToMatch !== rowIdToMatch;
          })
        );
        break;
      }
      default:
        break;
    }
  }, []);

  const handleClosePopup = async () => {
    try {
      if (!isSavedRef.current && draftIdRef.current) {
        await dispatch(deleteDocument([draftIdRef.current])).unwrap();
        logger.log("Draft deleted successfully");
      }
    } catch (error) {
      logger.log("Delete draft error:", error);
      // toast("Xóa bản nháp thất bại!", "error");
    } finally {
      draftIdRef.current = null;
      onClose();
    }
  };

  return (
    <CustomSwipper
      title={title || "Thêm mới hồ sơ"}
      open={open}
      onClose={handleClosePopup}
      onSave={handleSaveAddRecordManagement} // Sử dụng hàm handleSaveAddRecordManagement nội bộ
      type="add"
      hideBackdrop
      moreActions={
        <ButtonOutline
          onClick={handleSaveAddRecordManagement}
          // disabled={isLoading}
          variant="outlined"
          // color="inherit"
        >
          Lưu
        </ButtonOutline>
      }
      // isLoading={isLoading}
    >
      <StyledBoxContainerContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <StyledContainerTitle>
              <StyledGeneralInformation variant="subtitle1">
                Thông tin chung
              </StyledGeneralInformation>
              <StyledTitleStatus variant="body2">
                Trạng thái hồ sơ:&nbsp;
                <StyledSupTitle component="span">
                  Chưa phê duyệt danh mục
                </StyledSupTitle>
              </StyledTitleStatus>
            </StyledContainerTitle>
          </Grid>

          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="archivesName"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Tiêu đề hồ sơ"
                      placeholder="Nhập tiêu đề hồ sơ..."
                      {...field}
                      required
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
                      error={!!errors.archivesNumber}
                      helperText={errors.archivesNumber?.message}
                      disabled
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
                      select
                      multiple
                      label="Phòng ban/đơn vị chịu trách nhiệm"
                      placeholder="Nhập dữ liệu..."
                      options={archivesOrganizationUnitOptions}
                      customLabel="name"
                      customValue="id"
                      {...field}
                      value={Array.isArray(field.value) ? field.value : []}
                      required
                      error={!!errors.archivesOrganizationUnit}
                      helperText={errors.archivesOrganizationUnit?.message}
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
                      value={field.value ? dayjs(field.value) : null}
                      onChange={handleDateChange(field)}
                      required
                      error={!!errors.archivesYear}
                      helperText={errors.archivesYear?.message}
                      views={['year']}
                      format="YYYY"
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
                      customValue="title"
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
                      placeholder="Chọn thời hạn bảo quản"
                      options={archivesModeOptions}
                      customLabel="title"
                      customValue="title"
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
                      required
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
                      required
                      value={field.value ? dayjs(field.value) : null}
                      onChange={handleDateChange(field)}
                      error={!!errors.archivesEndDate}
                      helperText={errors.archivesEndDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="archivesNote"
                  control={control}
                  render={({ field }) => (
                    <InputComponents
                      label="Ghi chú"
                      placeholder="Nhập dữ liệu..."
                      {...field}
                      error={!!errors.archivesNote}
                      helperText={errors.archivesNote?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </StyledBoxContainerContent>

      <StyledBoxContainerContent styledMarginTop>
        <UploadSection item xs={12} container noneMarginTop>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <StyledContainerTitle>
                  <SectionTitleV2>DANH MỤC TÀI LIỆU</SectionTitleV2>
                  <CustomButton
                    component="label"
                    variant="contained"
                    onClick={handleOpenPopupAddIndex}
                  >
                    THÊM DANH MỤC TÀI LIỆU
                  </CustomButton>
                </StyledContainerTitle>
              </Grid>
            </Grid>
          </Grid>
        </UploadSection>
        <PopupAddIndex
          open={isOpen}
          onClose={handleClosePopupAddIndex}
          onSave={handleSaveAddIndex}
          existingNames={existingCategoryNames}
        />

        {editingIndex?.open && (
          <PopupAddIndex
            open={editingIndex.open}
            onClose={handleCloseEditPopup}
            onSave={handleSaveEditIndex}
            initialValue={editingIndex.item.groupName || editingIndex.item.nameDoc}
            title="Đổi tên danh mục tài liệu"
            existingNames={existingCategoryNames}
          />
        )}

        {documentIndexList.length > 0 && (
          <JobProfileTableContainer item xs={12}>
            <CustomTable
              columns={[{ name: "Tên danh mục tài liệu", row: "groupName" }]}
              data={documentIndexList.map((item) => ({ 
                ...item, 
                groupName: item.groupName || item.nameDoc 
              }))}
              onlyTable
              disableCheckbox
              rowKey={(row) => row.id || row.tempId || row.stt}
              autoHeight
              enableMoreActions
              moreActions={pickMoreActions(["edit", "delete"])}
              onMoreAction={handleMoreAction}
							encodeHtml
            />
          </JobProfileTableContainer>
        )}
      </StyledBoxContainerContent>
    </CustomSwipper>
  );
};

AddRecordManagement.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  sharedComponents: PropTypes.object.isRequired,
  mode: PropTypes.string,
  title: PropTypes.string,
};

export default withSharedComponents(AddRecordManagement);
