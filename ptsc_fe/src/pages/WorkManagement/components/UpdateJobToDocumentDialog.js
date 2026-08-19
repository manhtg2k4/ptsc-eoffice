import React, { useCallback, useEffect, useMemo } from "react";
import { Grid, styled } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { API_GET_COMMON_WORK_ORG, API_GET_COMMON_WORK_USER, API_JOB_TO_DOCUMENT, API_TEMPLATE, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import { useSelector } from "react-redux";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomDatePicker from "@components/CustomDatePicker";
import dayjs from "dayjs";
import DescriptionIcon from "@mui/icons-material/Description";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import LoadingDialog from "@components/LoadingDialog";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import PopupTemplate from "./PopupTemplate";
import PersonOrUnitAsyncInput from "@components/PersonOrUnitAsyncInput";
import DateTimeRangePicker from "@components/CustomDateTimePicker/DateTimeRangePicker";
import { SkyCheckbox, SkyBox } from "@styles/SkyStyles";
import { BoldSkyFormControlLabel } from "./Job.styles";
import withFormWrapper from "@components/common/FormWrapper";

const SkyFlexEnd = styled(SkyBox)({
  display: "flex",
  justifyContent: "flex-end",
});

const GridCompactItem = styled(Grid)({
  paddingTop: "0 !important",
  marginBottom: "-15px",
  marginTop: "-15px",
});


const StyledDescriptionIcon = styled(DescriptionIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));


const UpdateJobToDocumentDialog = ({
  open,
  onClose,
  data,
  type, // 'general' | 'participants' | 'status'
  fetchJobDetail,
  fetchHistory,
  setIsUpdated,
  updateDialogState,
  currentTaskId,
  sharedComponents,
  documentId,
  dataDetail,
  fetchSubTasksData,
  setReloadData,
  startDateParent,
  endDateParent
}) => {

  const { Dialog, InputComponents: BaseInput } = sharedComponents;
  const [isLoading, setIsLoading] = React.useState(false);
  const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
    templateName: "",
    requiredDays: 0,
    availableDays: 0
  });
  const [checkPermision, setCheckPermision] = React.useState(false);
  // Schema validation tùy theo loại cập nhật
  const schema = yup.object().shape({
    ...(type === 'general' && {
      taskName: yup.string().required("Vui lòng nhập tên công việc").max(500, "Tên công việc không được vượt quá 500 ký tự"),
      description: yup.string().max(3000, "Mô tả không được vượt quá 3000 ký tự"),
      startDate: yup
        .date()
        .required("Vui lòng chọn ngày bắt đầu")
        .typeError("Ngày bắt đầu không hợp lệ")
        .test(
          'not-past',
          'Ngày bắt đầu không được ở trong quá khứ',
          function (value) {
            if (!value) return true;
            if (data?.startDate && dayjs(value).isSame(dayjs(data.startDate), 'minute')) return true;
            return dayjs(value).isSameOrAfter(dayjs(), 'minute');
          }
        ),

      deadline: yup
        .date()
        .required("Vui lòng chọn hạn xử lý")
        .typeError("Hạn xử lý không hợp lệ")
        .test(
          'not-past',
          'Hạn xử lý không được ở trong quá khứ',
          function (value) {
            if (!value) return true;
            if (data?.deadline && dayjs(value).isSame(dayjs(data.deadline), 'minute')) return true;
            return dayjs(value).isSameOrAfter(dayjs(), 'minute');
          }
        )
        .when("startDate", (startDate, schema) => {
          if (!startDate) return schema;

          return schema.test(
            "deadline-after-start",
            "Hạn xử lý phải lớn hơn hoặc bằng ngày bắt đầu",
            (deadline) => {
              if (!deadline) return true;
              return dayjs(deadline).isSameOrAfter(dayjs(startDate), "minute");
            }
          );
        }),
    }),
    ...(type === 'participants' && {
      assigner: yup.mixed().required("Vui lòng chọn người giao việc"),
    }),
    ...(type === 'status' && {
      status: yup.string().required("Vui lòng chọn trạng thái"),
    }),
  });


  const {
    control,
    handleSubmit,
    reset,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      isApprovalRequired: false,
    },
  });
  const [leaderType, setLeaderType] = React.useState("person");
  const [coordinatorType, setCoordinatorType] = React.useState("person");
  const watchAssigner = watch("assigner");
  const watchLeader = watch("leader");
  const watchCoordinators = watch("coordinators");
  const watchViewers = watch("viewers");

  const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === "string" ? val : null);

  const leaderExcludeIds = useMemo(() => {
    const ids = [];
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    if (Array.isArray(watchViewers)) {
      watchViewers.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchCoordinators, watchViewers]);

  const coordinatorExcludeIds = useMemo(() => {
    const ids = [];
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    if (Array.isArray(watchViewers)) {
      watchViewers.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchLeader, watchViewers]);

  const viewerExcludeIds = useMemo(() => {
    const ids = [];
    const leaderId = getId(watchLeader);
    if (leaderId) ids.push(leaderId);
    if (Array.isArray(watchCoordinators)) {
      watchCoordinators.forEach((item) => {
        const id = getId(item);
        if (id) ids.push(id);
      });
    }
    return ids.join(",");
  }, [watchLeader, watchCoordinators]);

  const hideCoordinators = useMemo(() => {
    const assignerId = getId(watchAssigner);
    const leaderId = getId(watchLeader);
    return !!(assignerId && leaderId && assignerId === leaderId);
  }, [watchAssigner, watchLeader]);

  useEffect(() => {
    if (hideCoordinators) {
      setValue("coordinators", []);
    }
  }, [hideCoordinators, setValue]);

  const toast = useToast();
  // Reset form khi mở dialog và nhận data mới
  useEffect(() => {
    if (!open) {
      setOpenPopupTemplate(false);
      setPendingPayload(null);
      setTemplateWarningInfo({
        templateName: "",
        requiredDays: 0,
        availableDays: 0
      });
    };

    if (dataDetail && type === 'participants') {
      setLeaderType(dataDetail.directors?.[0]?.type === 2 ? 'unit' : 'person');
      setCoordinatorType(dataDetail.supporters?.[0]?.type === 2 ? 'unit' : 'person')
      reset({

        assigner: dataDetail.assigners?.[0] ? {
          _id: dataDetail.assigners[0].processId,
          name: dataDetail.assigners[0].name
        } : null,
        leader: dataDetail.directors?.[0] ? {
          _id: dataDetail.directors[0].processId,
          name: dataDetail.directors[0].name
        } : null,
        coordinators: dataDetail.supporters?.map(item => ({
          _id: item.processId,
          name: item.name
        })) || [],
        viewers: dataDetail.viewers?.map(item => ({
          _id: item.processId,
          name: item.name
        })) || [],
        isApprovalRequired: !!dataDetail.isApprovalRequired,
      });
    } else if (open && data) {
      reset({
        ...data,
        isApprovalRequired: !!data.isApprovalRequired
      });
      if (data.leaderType) setLeaderType(data.leaderType);
      if (data.coordinatorType) setCoordinatorType(data.coordinatorType);
    }
  }, [open, data, type, reset, dataDetail]);

  const { crmSource } = useSelector((state) => state.config);
  const urgencyOptions = useMemo(() =>
    crmSource.find((item) => item.code === "DOUUTIEN")?.data || [], [crmSource]);
  const timeOptions = useMemo(() =>
    crmSource.find((item) => item.code === "S34")?.data || [], [crmSource]);
  const statusOptions = useMemo(() => {
    const options = crmSource.find((item) => item.code === "TTCV")?.data || [];
    const canStatusSucess = data?.flags?.canStatusSucess ?? dataDetail?.flags?.canStatusSucess;
    if (canStatusSucess === false) {
      return [{ title: "Đang thực hiện", value: 2 }];
    }
    return options;
  }, [crmSource, data?.flags?.canStatusSucess, dataDetail?.flags?.canStatusSucess]);
  //loại vb
  const documentTypeOptions =
    crmSource.find((item) => item.code === "S19")?.data || [];

  const handleSaveForm = (formData) => {
    handleSaveUpdate({ ...formData, leaderType, coordinatorType });
  };

  const handleSaveUpdate = useCallback(async (updatedData, bypassFlag = false) => {
    const getVal = (val) => val?.processId || val?._id || val?.id || val;
    try {
      setIsLoading(true);
      const id = currentTaskId || documentId?.id || dataDetail?.id;
      const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;

      let payload = {};

      if (type === 'status') {
        const selectedOption = statusOptions.find(opt => String(opt.value) === String(updatedData.status));
        const statusTitle = (selectedOption?.title || "").toLowerCase();
        let processStatus = updatedData.status;

        if (statusTitle.includes("hoàn thành")) {
          processStatus = "4";
        } else if (statusTitle.includes("hủy") || statusTitle.includes("huỷ")) {
          processStatus = "8";
        }
        payload = { processStatus };
      } else {
        payload = updateDialogState?.type === 'general' ? {
          name: updatedData.taskName,
          priority: updatedData.priority,
          topic: updatedData.mode,
          note: updatedData.description,
          reminderTime: updatedData.reminderTime,
          startDate: updatedData.startDate ? dayjs(updatedData.startDate).toISOString() : null,
          endDate: updatedData.deadline ? dayjs(updatedData.deadline).toISOString() : null,
          templateId: updatedData.templateId?.id,
          bypassTemplateTimeValidation: isBypass
        } : {
          assigners: updatedData.assigner ? [{ processId: getVal(updatedData.assigner) }] : [],
          directors: updatedData.leader ? [{
            processId: getVal(updatedData.leader),
            name: updatedData.leader?.name || '',
            type: updatedData.leaderType === 'unit' ? 2 : 1
          }] : [],
          supporters: Array.isArray(updatedData.coordinators) ? updatedData.coordinators.map(id => ({
            processId: getVal(id),
            type: updatedData.coordinatorType === 'unit' ? 2 : 1
          })) : [],
          viewers: Array.isArray(updatedData.viewers) ? updatedData.viewers.map(id => ({
            processId: getVal(id)
          })) : [],
          isApprovalRequired: !!updatedData.isApprovalRequired,
        }
      }
      await axiosInstance.patch(`${API_JOB_TO_DOCUMENT}/${id}`, payload);
      toast("Cập nhật công việc thành công!", "success");

      onClose();
      fetchHistory?.();
      fetchJobDetail?.();
      setIsUpdated?.(true);
      setIsLoading?.(false);
      setReloadData?.(new Date())
      fetchSubTasksData?.();
      // onSuccess?.();
    } catch (error) {
      setIsLoading(false);
      const errorData = error?.response?.data;

      if (errorData?.code === "TEMPLATE_TIME_EXCEEDED") {
        setPendingPayload(updatedData); // Lưu updatedData để giữ lại templateId
        setTemplateWarningInfo({
          templateName: errorData.templateName,
          requiredDays: errorData.requiredDays || 0,
          availableDays: errorData.availableDays || 0
        });
        setOpenPopupTemplate(true); // Mở popup confirm
        setIsLoading(false); // Tắt loading
        return; // Không hiển thị toast error
      }
      toast(error?.response?.data?.message || "Cập nhật thất bại!", "error");
    }
  }, [currentTaskId, documentId, dataDetail, type, statusOptions, updateDialogState, toast, onClose, fetchHistory, fetchJobDetail, setIsUpdated, setIsLoading, setReloadData, fetchSubTasksData]);


  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setValue("startDate", startDate, { shouldValidate: true });
    setValue("deadline", endDate, { shouldValidate: true });
    setTimeout(() => trigger(["startDate", "deadline"]), 0);
  }, [setValue, trigger]);



  const handleConfirmBypassTemplate = useCallback(async () => {
    if (pendingPayload) {
      // Gọi lại onSubmit với flag bypassTemplateWarning = true
      await handleSaveUpdate(pendingPayload, true);
    }
  }, [pendingPayload, handleSaveUpdate])

  const handleClosePopupTemplate = useCallback(() => {
    setOpenPopupTemplate(false);
    setPendingPayload(null); // Clear pending payload khi đóng popup
    setTemplateWarningInfo({
      templateName: "",
      requiredDays: 0,
      availableDays: 0
    });

  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission`);
      setCheckPermision(response);
    } catch (error) {
      logger.log("Error checking permission:", error);

    }
  }, []);

  useEffect(() => {
    if (open) {
      checkPermission();
    }
  }, [open, checkPermission]);

  // Handler cho Tên công việc - validate realtime để hiện lỗi đỏ khi vượt 500 ký tự
  const handleTaskNameChange = useCallback((field) => (e) => {
    field.onChange(e);
    trigger("taskName");
  }, [trigger]);

  // Handler cho Mô tả - validate realtime để hiện lỗi đỏ khi vượt 3000 ký tự
  const handleAbstractNoteChange = useCallback((field) => (e) => {
    field.onChange(e);
    trigger("description");
  }, [trigger]);


  useEffect(() => {
    if (open && checkPermision?.disableSuporter) {
      const autoFillAssigner = async () => {
        try {
          const res = await axiosInstance.get(`${APP_BASE}/api/users/by-task-role-form-doc?typeTaskUser=director`);
          if (res) {
            setValue("leader", res[0]);
          }
        } catch (error) {
          logger.log('error', error);
        }
      }
      autoFillAssigner();
    }
  }, [checkPermision?.disableSuporter, setValue, open])


  // Wrapper component to move labels above inputs (giống GeneralInformation.js)
  const InputComponents = useMemo(() => {
    const Wrapped = withFormWrapper(BaseInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "InputComponents";
    return Component;
  }, [BaseInput]);

  const WrappedDateTimeRangePicker = useMemo(() => {
    const Wrapped = withFormWrapper(DateTimeRangePicker, "date");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedDateTimeRangePicker";
    return Component;
  }, []);

  const WrappedAsyncAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedAsyncAutoComplete";
    return Component;
  }, []);
  const WrappedPersonOrUnitAsyncInput = useMemo(() => {
    const Wrapped = withFormWrapper(PersonOrUnitAsyncInput, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedPersonOrUnitAsyncInput";
    return Component;
  }, []);



  const WrappedCustomInput = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomInputt";
    return Component;
  }, []);

  const WrappedDate = useMemo(() => {
    const Wrapped = withFormWrapper(CustomDatePicker, "date");
    const Component = (props) => <Wrapped {...props} isview />;
    Component.displayName = "WrappedDate";
    return Component;
  }, []);

  const getParsedDate = useCallback((val) => {
    if (!val) return null;
    const parsed = dayjs(val, ["DD/MM/YYYY HH:mm", "DD/MM/YYYY", "YYYY-MM-DD HH:mm", "YYYY-MM-DD"], true);
    return parsed.isValid() ? parsed : dayjs(val);
  }, []);

  return (
    <Dialog
      title={
        type === "general"
          ? "THÔNG TIN CHUNG"
          : type === "participants"
            ? "THÔNG TIN NGƯỜI THAM GIA"
            : "TRẠNG THÁI CÔNG VIỆC"
      }
      open={open}
      onClose={onClose}
      onSave={handleSubmit(handleSaveForm, () => toast("Vui lòng kiểm tra lại các trường thông tin", "error"))}
      type="edit"
      isLoading={isLoading}
      size={type === "status" ? "xs" : "lg"}
    >
      <Grid container spacing={2} mt={0}>

        {type === "general" && (
          <>
            {/* Row 1: Nguồn văn bản */}
            <Grid item xs={12}>
              <Controller
                name="summary"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label="Nguồn văn bản"
                    {...field}
                    disabled
                    InputProps={{
                      readOnly: true,
                      startAdornment: field.value ? <StyledDescriptionIcon /> : null,
                    }}
                  />
                )}
              />
            </Grid>

            {/* Row 2: Số VB | Ngày VB | Loại VB */}
            <Grid item xs={12} md={4}>
              <Controller
                name="toBook"
                control={control}
                render={({ field }) => (
                  <InputComponents label="Số văn bản" {...field} disabled />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="documentDate"
                control={control}
                render={({ field }) => (
                  <WrappedDate label="Ngày trên văn bản" {...field} showTime disabled />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="documentType"
                control={control}
                render={({ field }) => (
                  <WrappedCustomInput
                    select
                    label="Loại văn bản"
                    {...field}
                    disabled
                    options={documentTypeOptions}
                    optionLabel="title"
                    optionValue="value"
                  />
                )}
              />
            </Grid>

            {/* Row 3: Tên công việc | Quy trình */}
            <Grid item xs={12} md={8}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên công việc"
                    {...field}
                    required
                    onChange={handleTaskNameChange(field)}
                    error={!!errors.taskName}
                    helperText={errors.taskName?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              {data?.templateName ? (
                <Controller
                  name="templateName"
                  control={control}
                  render={({ field }) => (
                    <WrappedCustomInput label="Quy trình" {...field} disabled />
                  )}
                />
              ) : (
                <Controller
                  name="templateId"
                  control={control}
                  render={({ field }) => (
                    <WrappedAsyncAutoComplete
                      label="Quy trình"
                      {...field}
                      url={`${API_TEMPLATE}`}
                      queryParam="name"
                      optionLabel="name"
                      optionValue="id"
                    />
                  )}
                />
              )}
            </Grid>

            {/* Row 4: Date range | Priority */}
            <Grid item xs={12} md={8}>
              <WrappedDateTimeRangePicker
                showTime
                label="Ngày bắt đầu - Hạn xử lý"
                value={{
                  startDate: watch("startDate"),
                  endDate: watch("deadline"),
                }}
                onChange={handleDateRangeChange}
                minDate={startDateParent ? getParsedDate(startDateParent) : dayjs()}
                maxDate={endDateParent ? getParsedDate(endDateParent) : undefined}
                required
                error={!!(errors.startDate || errors.deadline)}
                helperText={errors.startDate?.message || errors.deadline?.message}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <WrappedCustomInput
                    select
                    label="Độ ưu tiên"
                    options={urgencyOptions}
                    optionLabel="title"
                    optionValue="value"
                    {...field}
                  />
                )}
              />
            </Grid>

            {/* Row 5: Mô tả | Reminder + Code */}
            <Grid item xs={12} md={8}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mô tả"
                    multiline
                    rows={4}
                    {...field}
                    onChange={handleAbstractNoteChange(field)}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Controller
                    name="reminderTime"
                    control={control}
                    render={({ field }) => (
                      <WrappedCustomInput
                        select
                        label="Thời gian nhắc hạn"
                        options={timeOptions}
                        customLabel="title"
                        customValue="value"
                        {...field}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="code"
                    control={control}
                    render={({ field }) => (
                      <InputComponents label="Mã công việc" {...field} disabled />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>
          </>
        )}

        {type === "participants" && (
          <>
            {!checkPermision?.disableSuporter && !hideCoordinators && (
              <GridCompactItem item xs={12}>
                <SkyFlexEnd>
                  <Controller
                    name="isApprovalRequired"
                    control={control}
                    render={({ field }) => (
                      <BoldSkyFormControlLabel
                        control={
                          <SkyCheckbox
                            {...field}
                            checked={!!field.value}
                          />
                        }
                        label="Xác nhận hoàn thành"
                        labelPlacement="start"
                      />
                    )}
                  />
                </SkyFlexEnd>
              </GridCompactItem>
            )}
            <Grid item xs={12} md={6}>
              <Controller
                name="assigner"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    label="Người giao việc"
                    placeholder="Tìm kiếm"
                    url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=assigner`}
                    optionLabel="name"
                    queryParams={["name", "email"]}
                    optionValue="id"
                    optionSubLabel="parentName"
                    {...field}
                    required={checkPermision?.isVanThu}
                    error={!!errors.assigner}
                    helperText={errors.assigner?.message}
                    disabled={!(checkPermision?.isVanThu)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="leader"
                control={control}
                render={({ field }) => (
                  !(checkPermision?.directorSelectDepartment) ?
                    <WrappedAsyncAutoComplete
                      label="Người chủ trì"
                      placeholder="Tìm kiếm"
                      {...field}
                      url={`${APP_BASE}/api/users/by-task-role-form-doc?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      optionValue="id"
                      optionSubLabel="parentName"

                    />
                    :
                    <WrappedPersonOrUnitAsyncInput
                      {...field}
                      label="Người chủ trì"
                      personUrl={`${APP_BASE}/api/users/by-task-role-form-doc?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                      personQueryParams={["name", "email"]}
                      unitQueryParams={["name"]}
                      onTypeChange={setLeaderType}
                      defaultType={leaderType}
                      disabled={!(checkPermision?.directorSelectDepartment)}
                      disabledInput={checkPermision?.disableSuporter}
                      optionSubLabel="parentName"
                    />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="coordinators"
                control={control}
                render={({ field }) => (
                  !(checkPermision?.supporterSelectDepartment) ?
                    <WrappedAsyncAutoComplete
                      {...field}
                      label="Người phối hợp"
                      url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                      limitTags={3}
                      queryParams={["name", "email"]}
                      placeholder="Tìm kiếm"
                      isMulti
                      optionLabel="name"
                      optionValue="id"
                      optionSubLabel="parentName"
                    />
                    :
                    <WrappedPersonOrUnitAsyncInput
                      {...field}
                      label="Người phối hợp"
                      personUrl={`${APP_BASE}/api/users/by-task-role-form-doc?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                      unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                      personQueryParams={["name", "email"]}
                      unitQueryParams={["name"]}
                      isMulti
                      optionSubLabel="parentName"
                      onTypeChange={setCoordinatorType}
                      defaultType={coordinatorType}
                      disabled={!(checkPermision?.supporterSelectDepartment)}
                      disabledInput={checkPermision?.disableSuporter}
                    />

                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="viewers"
                control={control}
                render={({ field }) => (
                  <WrappedAsyncAutoComplete
                    isMulti
                    label="Người xem"
                    placeholder="Tìm kiếm"
                    url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&leaderId=${getId(watchAssigner) || ""}&excludeId=${viewerExcludeIds}`}
                    optionLabel="name"
                    queryParams={["name", "email"]}
                    limitTags={3}
                    optionValue="id"
                    optionSubLabel="parentName"
                    {...field}
                  />
                )}
              />
            </Grid>
          </>
        )}

        {type === "status" && (
          <Grid item xs={12}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <InputComponents
                  select
                  label="Trạng thái"
                  placeholder="Chọn trạng thái công việc..."
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
        )}
      </Grid>
      <PopupTemplate
        open={openPopupTemplate}
        onClose={handleClosePopupTemplate}
        onSave={handleConfirmBypassTemplate}
        templateWarningInfo={templateWarningInfo?.templateName}
        onCloseDialog={onClose}
        setReloadData={setReloadData}
        templateName={templateWarningInfo?.templateName}

      />
      <LoadingDialog open={isLoading} >
        Đang tải tài liệu, vui lòng đợi...
      </LoadingDialog>
    </Dialog>
  );
};

export default withSharedComponents(UpdateJobToDocumentDialog);