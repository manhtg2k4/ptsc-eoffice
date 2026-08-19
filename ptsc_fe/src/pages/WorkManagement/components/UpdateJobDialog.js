import React, { useCallback, useEffect, useMemo } from "react";
import { Grid, styled } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import withSharedComponents from "@components/WrapperComponent";
import { API_ADD_COMMON_WORK, API_GET_COMMON_WORK_ORG, API_GET_COMMON_WORK_USER, API_TEMPLATE, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import PersonOrUnitAsyncInput from "@components/PersonOrUnitAsyncInput";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import LoadingDialog from "@components/LoadingDialog";
import { useToast } from "@components/common/ToastProvider";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import dayjs from "dayjs";
import PopupTemplate from "./PopupTemplate";
import CustomAutoComplete from "@components/CustomAutoCompleteSearch";
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


const UpdateJobDialog = (props) => {
  const {
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
    setReloadData,
    fetchSubTasksData,
    parentType = false,
    parentName,
    startDateParent,
    endDateParent
  } = props;
 
  const { Dialog, InputComponents: BaseInput } = sharedComponents;
  const [isLoading, setIsLoading] = React.useState(false);
  const [checkPermision, setCheckPermision] = React.useState(false);
  const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState(null);
  const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
    templateName: "",
    requiredDays: 0,
    availableDays: 0
  });
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
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      taskName: "",
      startDate: null,
      deadline: null,
      assigner: null,
      leader: null,
      coordinators: [],
      viewers: [],
      priority: "",
      topic: "",
      description: "",
      status: "",
      reminderTime: "",
      templateName: null,
      templateId: null,
      isApprovalRequired: false,
    },
  });
  const toast = useToast();
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
    } else if (data && Object.keys(data).length > 0) {
      reset({
        ...data,
        isApprovalRequired: !!data.isApprovalRequired
      });
      if (data.leaderType) setLeaderType(data.leaderType);
      if (data.coordinatorType) setCoordinatorType(data.coordinatorType);
    }
  }, [open, dataDetail, data, reset, type]);

  // Reset popup template state khi đóng dialog
  useEffect(() => {
    if (!open) {
      setOpenPopupTemplate(false);
      setPendingPayload(null);
      setTemplateWarningInfo({
        templateName: "",
        requiredDays: 0,
        availableDays: 0
      });
    }
  }, [open]);

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
          topic: updatedData.topic,
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
      await axiosInstance.patch(`${API_ADD_COMMON_WORK}/${id}`, payload);
      toast("Cập nhật công việc thành công!", "success");

      onClose();
      fetchHistory?.();
      fetchJobDetail?.();
      setIsUpdated?.(true);
      setReloadData?.(new Date() * 1);
      setIsLoading(false);
      fetchSubTasksData?.();
      // onSuccess?.();
    } catch (error) {
      setIsLoading(false);

      logger.log("error", error);
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
      toast(error?.response?.data?.message || error?.message || "Có lỗi xảy ra!", "error");
    }
  }, [currentTaskId, documentId, dataDetail, type, statusOptions, updateDialogState, toast, onClose, fetchHistory, fetchJobDetail, setIsUpdated, setReloadData, fetchSubTasksData]);


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

  useEffect(() => {
    if (open && checkPermision?.disableSuporter) {
      const autoFillAssigner = async () => {
        try {
          const res = await axiosInstance.get(`${API_GET_COMMON_WORK_USER}?typeTaskUser=director`);
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

  const WapperCustomAutoComplete = useMemo(() => {
    const Wrapped = withFormWrapper(CustomAutoComplete, "asyncSelect");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WapperCustomAutoComplete";
    return Component;
  }, []);


  const WrappedCustomInput = useMemo(() => {
    const Wrapped = withFormWrapper(CustomInput, "input");
    const Component = (props) => <Wrapped {...props} />;
    Component.displayName = "WrappedCustomInputt";
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
      onSave={handleSubmit(handleSaveForm)}
      type="edit"
      isLoading={isLoading}
      size={type === "status" ? "xs" : "lg"}
    >
      <Grid container spacing={2} mt={0}>
        {type === "general" && (
          <>
            <Grid item xs={12} md={4}>
              <Controller
                name="taskName"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Tên công việc"
                    {...field}
                    required
                    error={!!errors.taskName}
                    helperText={errors.taskName?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
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
                startLabel="Ngày bắt đầu"
                endLabel="Hạn xử lý"
                required
                error={!!(errors.startDate || errors.deadline)}
                helperText={errors.startDate?.message || errors.deadline?.message}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller
                name="reminderTime"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    select
                    label="Thời gian nhắc hạn"
                    placeholder="Chọn thời gian nhắc hạn..."
                    options={timeOptions}
                    customLabel="title"
                    customValue="value"
                    {...field}
                    error={!!errors.reminderTime}
                    helperText={errors.reminderTime?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              {
                data?.templateName ? (
                  <Controller
                    name="templateName"
                    control={control}
                    render={({ field }) => (
                      <WrappedCustomInput
                        label="Quy trình"
                        {...field}
                        disabled
                      />
                    )}
                  />

                ) :
                  <>
                    <Controller
                      name="templateId"
                      control={control}
                      render={({ field }) => (
                        <WrappedAsyncAutoComplete
                          label="Quy trình"
                          placeholder="Tìm kiếm"
                          {...field}
                          url={`${API_TEMPLATE}`}
                          queryParam="name"
                          optionLabel="name"
                          optionValue="id"
                        />
                      )}
                    />
                  </>
              }
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <WrappedCustomInput
                    select
                    label="Độ ưu tiên"
                    placeholder="Nhập dữ liệu..."
                    options={urgencyOptions}
                    optionLabel="title"
                    optionValue="value"
                    {...field}
                    error={!!errors.priority}
                    helperText={errors.priority?.message}
                  />
                )}
              />
            </Grid>


            {!(parentName && parentType) && <Grid item xs={12} md={4}>
              <Controller
                name="topic"
                control={control}
                render={({ field }) => (
                  <WapperCustomAutoComplete
                    label="Chủ đề"
                    placeholder="Tìm kiếm"
                    code='CDCV'
                    {...field}
                  />
                )}
              />
            </Grid>}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputComponents
                    label="Mô tả"
                    multiline
                    rows={4}
                    {...field}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
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
                      {...field}
                      label="Người chủ trì"
                      url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      optionLabel="name"
                      queryParams={["name", "email"]}
                      optionValue="id"
                      optionSubLabel="parentName"

                    /> :
                    <WrappedPersonOrUnitAsyncInput
                      {...field}
                      label="Người chủ trì"
                      personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${getId(watchAssigner) || ""}&excludeId=${leaderExcludeIds}`}
                      unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                      personQueryParams={["name", "email"]}
                      unitQueryParams={["name"]}
                      onTypeChange={setLeaderType}
                      defaultType={leaderType}
                      disabled={!(checkPermision?.directorSelectDepartment)}
                      disabledInput={checkPermision?.disableSuporter}
                    />
                )}
              />
            </Grid>
            {!checkPermision?.disableSuporter && !hideCoordinators && <Grid item xs={12} md={6}>
              <Controller
                name="coordinators"
                control={control}
                render={({ field }) => (
                  !(checkPermision?.supporterSelectDepartment) ?
                    <WrappedAsyncAutoComplete
                      {...field}
                      label="Người phối hợp"
                      url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                      queryParams={["name", "email"]}
                      optionLabel="name"
                      isMulti
                      limitTags={3}
                      optionValue="id"
                      optionSubLabel="parentName"
                    /> :
                    <WrappedPersonOrUnitAsyncInput
                      {...field}
                      label="Người phối hợp"
                      personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${getId(watchAssigner) || ""}&excludeId=${coordinatorExcludeIds}`}
                      unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                      personQueryParams={["name", "email"]}
                      unitQueryParams={["name"]}
                      isMulti
                      limitTags={2}
                      disabled={!(checkPermision?.supporterSelectDepartment)}
                      onTypeChange={setCoordinatorType}
                      defaultType={coordinatorType}
                    />
                )}
              />
            </Grid>
            }
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
                    optionValue="id"
                    optionSubLabel="parentName"
                    limitTags={3}
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

export default withSharedComponents(UpdateJobDialog);