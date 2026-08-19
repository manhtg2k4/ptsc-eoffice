import { CustomDialog } from '@components/CustomDialog';
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SkyBox, SkyGrid, SkyPopover, SkyRadio, SkyCheckbox } from '@styles/SkyStyles';
import { styled } from '@mui/material';
import CustomDateTimePicker from '@components/CustomDateTimePicker';
import { Controller, useForm } from 'react-hook-form';
import CustomInputBase from '@components/CustomInput/CustomInputBase';
import { DateCell, DateGridContainer, InlineGroup, NarrowInputWrapper, RadioContainer, StyledFormControlLabel, StyledRadioGroup, StyleSkyBox, StyleSkyBoxContainer, StyleTypography } from './styles';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultValues, schema, weekDays, weekdayOptions, weekOfMonthOptions, monthInQuarterOptions } from './constant';
import { useSelector } from 'react-redux';
import { API_GET_COMMON_WORK_ORG, API_GET_COMMON_WORK_USER, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import PersonOrUnitAsyncInput from '@components/PersonOrUnitAsyncInput';
import LoadingDialog from '@components/LoadingDialog';
import { useToast } from '@components/common/ToastProvider';
import dayjs from 'dayjs';
import axiosInstance from '@utils/axiosInstance';
import CustomAsyncAutoComplete from '@components/CustomAsyncAutoComplete';
import PopupTemplate from '@pages/WorkManagement/components/PopupTemplate';
import CustomAutoComplete from "@components/CustomAutoCompleteSearch";
import { BoldSkyFormControlLabel } from '@pages/WorkManagement/components/Job.styles';
import withFormWrapper from '@components/common/FormWrapper';
import DOMPurify from "dompurify";

const UpdateRepetiviveWork = ({ open, onClose, type, data, setReloadData, fetchData }) => {
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
        trigger,
        setValue
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: defaultValues
    });
    const toast = useToast();
    const [openPopupTemplate, setOpenPopupTemplate] = React.useState(false);
    const [pendingPayload, setPendingPayload] = React.useState(null);
    const [templateWarningInfo, setTemplateWarningInfo] = React.useState({
        templateName: "",
        requiredDays: 0,
        availableDays: 0
    });
    const { dataUser } = useSelector((state) => state.auth);
    logger.log("dataUser", dataUser);

    const user = dataUser
    const [dateGridAnchor, setDateGridAnchor] = useState(null);
    const { crmSource } = useSelector((state) => state.config);
    const optionModeOfWork =
        crmSource.find((item) => item.code === "CONGVIECDUOCLAPLAI")?.data || [];
    const urgencyOptions =
        crmSource.find((item) => item.code === "DOUUTIEN")?.data || [];
    // const toast = useToast();
    const repeatTask = watch("repetitiveTask");
    const watchLeader = watch("directors");
    const watchCoordinators = watch("supporters");
    const watchViewers = watch("viewers");

    const getId = (val) => val?._id || val?.id || val?.processId || (typeof val === 'string' ? val : null);

    const leaderExcludeIds = React.useMemo(() => {
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

    const coordinatorExcludeIds = React.useMemo(() => {
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

    const viewerExcludeIds = React.useMemo(() => {
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
    const isDateGridOpen = Boolean(dateGridAnchor);
    const handleSingleDaySelect = (day, onChange, setAnchor) => {
        onChange(day);
        setAnchor(null);
    };
    const [checkPermision, setCheckPermision] = React.useState(false);

    const [quarterDateGridAnchor, setQuarterDateGridAnchor] = useState(null);
    const isQuarterDateGridOpen = Boolean(quarterDateGridAnchor);
    const [leaderType, setLeaderType] = React.useState("person");
    const [coordinatorType, setCoordinatorType] = React.useState("person");
    const [isLoading, setIsLoading] = React.useState(false);
    const timeOptions =
        crmSource.find((item) => item.code === "S34")?.data || [];




    const checkPermission = useCallback(async () => {
        try {
            const response = await axiosInstance.get(`${APP_BASE}/api/tasks/check-create-permission`);
            setCheckPermision(response);
        } catch (error) {
            logger.log("Error checking permission:", error);

        }
    }, []);

    useEffect(() => {
        checkPermission();
    }, [checkPermission])

    useEffect(() => {
        if (open && data) {
            const transformedData = {
                ...defaultValues,
                name: data?.name || "",
                note: data?.note || "",
                priority: data?.priority || null,
                templateName: data?.templateName || null,
                topic: data?.topic || "",
                reminderTime: data?.reminderTime || "24h",
                repetitiveTask: data?.repetitiveTask || "tuan",
                daysOfWeek: data?.daysOfWeek || "2",
                durationDays: data?.durationDays || 1,
                code: data?.code || "",
                assigners: data?.assigners || null,
                directors: Array.isArray(data?.directors) ? data.directors[0] : (data?.directors || null),
                supporters: Array.isArray(data?.supporters) ? data.supporters : [],
                viewers: Array.isArray(data?.viewers) ? data.viewers : [],
                templateId: data?.templateId || null,
                startTime: data?.startTime
                    ? (() => {
                        // Check if HH:mm format
                        if (typeof data.startTime === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(data.startTime)) {
                            const [hours, minutes] = data.startTime.split(':');
                            return dayjs().set('hour', hours).set('minute', minutes).set('second', 0).toDate();
                        }
                        // Convert GMT string or Date string to Date object
                        const dateFromValue = new Date(data?.startTime);
                        return dayjs(dateFromValue).isValid() ? dayjs(dateFromValue).toDate() : data?.startTime;
                    })()
                    : null,
                isApprovalRequired: !!data?.isApprovalRequired,
            };

            if (data?.leaderType) setLeaderType(data?.leaderType);
            if (data?.coordinatorType) setCoordinatorType(data?.coordinatorType);
            if (data?.repetitiveTask === 'thang') {
                if (data?.executionType === 'relative_day') {
                    transformedData.monthPattern = 'weekday';
                    transformedData.monthWeekday = data?.relativeDay;
                    transformedData.monthWeekPosition = data?.relativeWeek;
                } else if (data?.executionType === 'specific_day') {
                    transformedData.monthPattern = 'dayOfMonth';
                    transformedData.monthDay = data?.dayOfMonth;
                } else if (data?.executionType === 'last_day') {
                    transformedData.monthPattern = 'lastDay';
                }
            }

            if (data?.repetitiveTask === 'quy') {
                // transformedData.monthInQuarter = data?.monthInQuarter || 1; // Already set above

                if (data?.executionType === 'relative_day') {
                    transformedData.quarterPattern = 'weekday';
                    transformedData.quarterWeekday = data?.relativeDay;
                    transformedData.quarterWeekPosition = data?.relativeWeek;
                } else if (data?.executionType === 'specific_day') {
                    transformedData.quarterPattern = 'dayOfMonth';
                    transformedData.quarterDay = data?.dayOfMonth;
                } else if (data?.executionType === 'last_day') {
                    transformedData.quarterPattern = 'lastDay';
                }
            }

            reset(transformedData);
        }
    }, [open, data, reset]);


    const handleUpdateData = useCallback(async (value, bypassFlag = false) => {
        setIsLoading(true);
        const getId = (val) => val?._id || val?.id || val?.processId || val;
        const isBypass = typeof bypassFlag === 'boolean' ? bypassFlag : false;


        try {
            let body;
            type === "general" ?
                body = {
                    // Xây dựng body cơ bản

                    name: value?.name,
                    note: value?.note,
                    startTime: value?.startTime ? dayjs(value.startTime).format('HH:mm') : '',
                    reminderTime: value?.reminderTime,
                    topic: value?.topic,
                    priority: value?.priority,
                    repetitiveTask: value?.repetitiveTask,
                    templateId: value?.templateId?.id,
                    monthInQuarter: value?.monthInQuarter,
                    bypassTemplateTimeValidation: isBypass
                } : body = {
                    // assigners: value?.assigners ? [{ processId: getId(value?.assigners) }] : [],
                    directors: value?.directors ? [{ processId: getId(value?.directors), type: leaderType === 'person' ? 1 : 2 }] : [],
                    supporters: Array.isArray(value?.supporters) ? value?.supporters.map(item => ({ processId: getId(item), type: coordinatorType === 'person' ? 1 : 2 })) : [],
                    viewers: Array.isArray(value?.viewers) ? value?.viewers.map(item => ({ processId: getId(item) })) : [],
                    isApprovalRequired: value?.isApprovalRequired,
                }

            // Chỉ thêm durationDays nếu repetitiveTask !== 'ngay'
            if (value?.repetitiveTask !== 'ngay') {
                body.durationDays = value?.durationDays?.toString();
            }
            // Xử lý logic theo loại lặp lại
            if (value?.repetitiveTask === 'tuan') {
                // Cho tuần: gửi daysOfWeek
                body.daysOfWeek = value?.daysOfWeek;
            } else if (value?.repetitiveTask === 'thang') {
                // Cho tháng: xác định executionType dựa trên monthPattern
                if (value?.monthPattern === 'weekday') {
                    // Trường hợp 1: Vào [Thứ X] [Tuần Y] của tháng
                    body.executionType = 'relative_day';
                    body.relativeWeek = value?.monthWeekPosition; // 'first', 'second', 'third', 'fourth', 'last'
                    body.relativeDay = value?.monthWeekday; // 0-6 (CN-T7)
                } else if (value?.monthPattern === 'dayOfMonth') {
                    // Trường hợp 2: Vào ngày [X] của tháng
                    body.executionType = 'specific_day';
                    body.dayOfMonth = value?.monthDay; // 1-31
                } else if (value?.monthPattern === 'lastDay') {
                    // Trường hợp 3: Vào ngày cuối cùng của tháng
                    body.executionType = 'last_day';
                }
            } else if (value?.repetitiveTask === 'quy') {
                body.monthInQuarter = Number(value?.monthInQuarter) || 1;

                if (value?.quarterPattern === 'weekday') {
                    // Trường hợp 1: Vào Thứ X, Tuần Y của tháng Z
                    body.executionType = 'relative_day';
                    body.relativeWeek = value?.quarterWeekPosition; // 'first'/'last'
                    body.relativeDay = value?.quarterWeekday; // 0-6
                } else if (value?.quarterPattern === 'dayOfMonth') {
                    // Trường hợp 2: Vào ngày X của tháng Z
                    body.executionType = 'specific_day';
                    body.dayOfMonth = value?.quarterDay; // 1-31
                } else if (value?.quarterPattern === 'lastDay') {
                    // Trường hợp 3: Vào ngày cuối của tháng Z
                    body.executionType = 'last_day';
                }
            }

            const res = await axiosInstance.put(`${APP_BASE}/api/tasks/recurring/${data?.id}`, body)
            if (res) {
                toast(type === "general" ? "Cập nhật công việc thành công!" : "Cập nhật người tham gia thành công!", "success");
                onClose();
                fetchData?.();
                setReloadData?.(new Date() * 1);
                setIsLoading(false);
                reset();

            }

        } catch (error) {
            setIsLoading(false);
            const errorData = error?.response?.data;

            if (errorData?.code === "TEMPLATE_TIME_EXCEEDED") {
                setPendingPayload(value); // Lưu updatedData để giữ lại templateId
                setTemplateWarningInfo({
                    templateName: errorData.templateName,
                    requiredDays: errorData.requiredDays || 0,
                    availableDays: errorData.availableDays || 0
                });
                setOpenPopupTemplate(true); // Mở popup confirm
                setIsLoading(false); // Tắt loading
                return; // Không hiển thị toast error
            }
            toast(error?.response?.data?.message || "Cập nhật công việc thất bại!", "error");
        }

    }, [type, data, leaderType, coordinatorType, toast, reset, onClose, fetchData, setReloadData])


    const onInvalid = useCallback((errors) => {
        logger.log('Validation errors:', errors);
        toast("Vui lòng kiểm tra lại thông tin nhập liệu!", "error");
    }, [toast]);

    const StyleSkyBoxStatus = styled(SkyBox)({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
    });

    const StyleSkyBoxStatusCompact = styled(StyleSkyBoxStatus)({
        marginBottom: -10,
        marginTop: -15,
    });

    const handleClose = () => {
        onClose();
    };


    const handleConfirmBypassTemplate = useCallback(async () => {
        if (pendingPayload) {
            // Gọi lại onSubmit với flag bypassTemplateWarning = true
            await handleUpdateData(pendingPayload, true);
        }
    }, [pendingPayload, handleUpdateData])

    const handleClosePopupTemplate = useCallback(() => {
        setOpenPopupTemplate(false);
        setPendingPayload(null); // Clear pending payload khi đóng popup
        setTemplateWarningInfo({
            templateName: "",
            requiredDays: 0,
            availableDays: 0
        });

    }, []);

    // Handler cho Tên công việc - validate realtime để hiện lỗi đỏ khi vượt 500 ký tự
    const handleNameChange = useCallback((field) => (e) => {
        field.onChange(e);
        trigger("name");
    }, [trigger]);

    // Handler cho Mô tả - validate realtime để hiện lỗi đỏ khi vượt 3000 ký tự
    const handleNoteChange = useCallback((field) => (e) => {
        field.onChange(e);
        trigger("note");
    }, [trigger]);

    useEffect(() => {
        if (open && checkPermision?.disableSuporter) {
            const autoFillAssigner = async () => {
                try {
                    const res = await axiosInstance.get(`${API_GET_COMMON_WORK_USER}?typeTaskUser=director`);
                    if (res) {
                        setValue("directors", res[0]);
                    }
                } catch (error) {
                    logger.log('error', error);
                }
            }
            autoFillAssigner();
        }
    }, [checkPermision?.disableSuporter, setValue, open])

    const CustomInput = useMemo(() => {
        const Wrapped = withFormWrapper(CustomInputBase, "input");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "CustomInput";
        return Component;
    }, []);

    const WapperCustomAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WapperCustomAutoComplete";
        return Component;
    }, []);

    const WrappedDateTimeRangePicker = useMemo(() => {
        const Wrapped = withFormWrapper(CustomDateTimePicker, "date");
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


    return (
        <CustomDialog
            open={open}
            onClose={handleClose}
            onSave={handleSubmit(handleUpdateData, onInvalid)}
            title={
                type === "general" ? "THÔNG TIN CHUNG"
                    : "THÔNG TIN NGƯỜI THAM GIA"

            }
            size={"xl"}
            isLoading={isLoading}

        >
            <>
                {type === "participants" && !checkPermision?.disableSuporter && (
                    <StyleSkyBoxStatusCompact>
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
                    </StyleSkyBoxStatusCompact>
                )}
                {type === "general" &&
                    <>
                        <StyleSkyBoxStatus >
                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data?.statusText) }} />
                        </StyleSkyBoxStatus>
                        <SkyGrid container spacing={2} mb={4}>
                            {/* Cột 1: Tên CV, Thời gian nhắc, Chủ đề, Ngày bắt đầu/kết thúc, Số ngày/Giờ lặp */}
                            <SkyGrid item xs={12} md={4}>
                                <SkyGrid container spacing={2}>
                                    {/* Tên công việc */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="name"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    label="Tên công việc"
                                                    placeholder="Nhập tên công việc"
                                                    {...field}
                                                    required
                                                    onChange={handleNameChange(field)}
                                                    inputProps={{ maxLength: 501 }}
                                                    error={!!errors.name}
                                                    helperText={errors.name?.message}
                                                />
                                            )}
                                        />
                                    </SkyGrid>

                                    {/* Thời gian nhắc hạn */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="reminderTime"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    select
                                                    label="Thời gian nhắc hạn"
                                                    placeholder="Chọn thời gian"
                                                    customLabel="label"
                                                    customValue="value"
                                                    {...field}
                                                    options={timeOptions}
                                                    error={!!errors.reminderTime}
                                                    helperText={errors.reminderTime?.message}
                                                />
                                            )}
                                        />
                                    </SkyGrid>

                                    {/* Chủ đề */}
                                    <SkyGrid item xs={12}>
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
                                    </SkyGrid>



                                    {/* Số ngày và Giờ lặp - CÙNG HÀNG */}
                                    {repeatTask !== 'ngay' && (
                                        <SkyGrid item xs={6}>
                                            <Controller
                                                name="durationDays"
                                                control={control}
                                                render={({ field }) => (
                                                    <CustomInput
                                                        type="number"
                                                        required
                                                        label="Số ngày thực hiện"
                                                        placeholder="Nhập số ngày"
                                                        {...field}
                                                        error={!!errors.durationDays}
                                                        helperText={errors.durationDays?.message}
                                                    />
                                                )}
                                            />
                                        </SkyGrid>
                                    )}
                                    <SkyGrid item xs={repeatTask && repeatTask !== 'ngay' ? 6 : 12}>
                                        <Controller
                                            name="startTime"
                                            control={control}
                                            render={({ field }) => (
                                                <WrappedDateTimeRangePicker
                                                    timeOnly
                                                    label="Giờ lặp"
                                                    {...field}
                                                    required
                                                    error={!!errors.startTime}
                                                    helperText={errors.startTime?.message}
                                                />
                                            )}
                                        />
                                    </SkyGrid>
                                </SkyGrid>
                            </SkyGrid>

                            {/* Cột 2: Quy trình, Độ ưu tiên, CV lặp lại, Ngày trong tuần */}
                            <SkyGrid item xs={12} md={4}>
                                <SkyGrid container spacing={2}>
                                    {/* Mã công việc */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="code"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    label="Mã công việc lặp lại"
                                                    {...field}
                                                    disabled
                                                />
                                            )}
                                        />
                                    </SkyGrid>
                                    {/* Quy trình */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="templateName"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    label="Quy trình"
                                                    {...field}
                                                    disabled
                                                />
                                            )}
                                        />
                                    </SkyGrid>

                                    {/* Độ ưu tiên */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="priority"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    select
                                                    label="Độ ưu tiên"
                                                    placeholder="Chọn độ ưu tiên"
                                                    options={urgencyOptions}
                                                    customLabel="label"
                                                    customValue="value"
                                                    {...field}
                                                    error={!!errors.priority}
                                                    helperText={errors.priority?.message}
                                                />
                                            )}
                                        />
                                    </SkyGrid>

                                    {/* Công việc lặp lại */}
                                    <SkyGrid item xs={12}>
                                        <Controller
                                            name="repetitiveTask"
                                            control={control}
                                            render={({ field }) => (
                                                <CustomInput
                                                    select
                                                    label="Công việc lặp lại"
                                                    options={optionModeOfWork}
                                                    customLabel="title"
                                                    customValue="value"
                                                    {...field}
                                                    error={!!errors.repetitiveTask}
                                                    helperText={errors.repetitiveTask?.message}
                                                />
                                            )}
                                        />
                                    </SkyGrid>

                                    {/* Conditional sections cho tuần/tháng/quý */}
                                    <SkyGrid item xs={12}>
                                        {/* ===== CHO TUẦN ===== */}
                                        {repeatTask === 'tuan' && (
                                            <Controller
                                                name="daysOfWeek"
                                                control={control}
                                                render={({ field }) => (
                                                    <SkyBox>
                                                        <StyledRadioGroup
                                                            row
                                                            value={field.value || ''}
                                                            onChange={field.onChange}
                                                        >
                                                            {weekDays.map((day) => (
                                                                <StyledFormControlLabel
                                                                    key={day.value}
                                                                    value={day.value}
                                                                    control={<SkyRadio size="small" />}
                                                                    label={day.label}
                                                                />
                                                            ))}
                                                        </StyledRadioGroup>
                                                    </SkyBox>
                                                )}
                                            />
                                        )}


                                        {/* ===== CHO THÁNG ===== */}
                                        {repeatTask === 'thang' && (
                                            <SkyGrid container spacing={2}>
                                                {/* Radio: Vào thứ X + Đầu tiên của tháng */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="monthPattern"
                                                        control={control}
                                                        render={({ field }) => {
                                                            const handleWeekdayChange = () => field.onChange('weekday');
                                                            return (
                                                                <RadioContainer>
                                                                    <InlineGroup>
                                                                        <SkyRadio
                                                                            checked={field.value === 'weekday'}
                                                                            onChange={handleWeekdayChange}
                                                                            size="small"
                                                                        />
                                                                        <StyleTypography>Vào</StyleTypography>
                                                                    </InlineGroup>
                                                                    <StyleSkyBoxContainer>
                                                                        <Controller
                                                                            name="monthWeekday"
                                                                            control={control}
                                                                            render={({ field: weekdayField }) => (
                                                                                <StyleSkyBox flx={1} mWidth="80px">
                                                                                    <CustomInput
                                                                                        select
                                                                                        options={weekdayOptions}
                                                                                        customLabel="label"
                                                                                        customValue="value"
                                                                                        {...weekdayField}
                                                                                    />
                                                                                </StyleSkyBox>
                                                                            )}
                                                                        />
                                                                        <Controller
                                                                            name="monthWeekPosition"
                                                                            control={control}
                                                                            render={({ field: positionField }) => (
                                                                                <StyleSkyBox flx={1.5} mWidth="120px">
                                                                                    <CustomInput
                                                                                        select
                                                                                        options={weekOfMonthOptions}
                                                                                        customLabel="label"
                                                                                        customValue="value"
                                                                                        {...positionField}
                                                                                    />
                                                                                </StyleSkyBox>
                                                                            )}
                                                                        />
                                                                    </StyleSkyBoxContainer>
                                                                </RadioContainer>
                                                            );
                                                        }}
                                                    />
                                                </SkyGrid>
                                                {/* dayofMonth */}
                                                {/* Radio: Vào ngày + Date Grid Popup */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="monthPattern"
                                                        control={control}
                                                        render={({ field }) => {
                                                            const handleDayOfMonthChange = () => field.onChange('dayOfMonth');
                                                            return (
                                                                <SkyBox>
                                                                    <RadioContainer>
                                                                        <SkyRadio
                                                                            checked={field.value === 'dayOfMonth'}
                                                                            onChange={handleDayOfMonthChange}
                                                                            size="small"
                                                                        />
                                                                        <StyleTypography>Vào ngày</StyleTypography>
                                                                        <Controller
                                                                            name="monthDay"
                                                                            control={control}
                                                                            render={({ field: dayField }) => {
                                                                                const handleInputClick = (event) => {
                                                                                    setDateGridAnchor(event.currentTarget);
                                                                                };

                                                                                const handlePopoverClose = () => {
                                                                                    setDateGridAnchor(null);
                                                                                };

                                                                                return (
                                                                                    <>
                                                                                        <NarrowInputWrapper onClick={handleInputClick}>
                                                                                            <CustomInput
                                                                                                type="number"
                                                                                                {...dayField}
                                                                                                readOnly
                                                                                                inputProps={{ min: 1, max: 28 }}
                                                                                            />
                                                                                        </NarrowInputWrapper>

                                                                                        <SkyPopover
                                                                                            open={isDateGridOpen}
                                                                                            anchorEl={dateGridAnchor}
                                                                                            onClose={handlePopoverClose}
                                                                                            anchorOrigin={{
                                                                                                vertical: 'bottom',
                                                                                                horizontal: 'left',
                                                                                            }}
                                                                                            transformOrigin={{
                                                                                                vertical: 'top',
                                                                                                horizontal: 'left',
                                                                                            }}
                                                                                        >
                                                                                            <DateGridContainer>
                                                                                                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                                                                                                    const isSelected = Number(dayField.value) === day;
                                                                                                    const handleClick = () => handleSingleDaySelect(day, dayField.onChange, setDateGridAnchor);
                                                                                                    return (
                                                                                                        <DateCell
                                                                                                            key={day}
                                                                                                            isSelected={isSelected}
                                                                                                            onClick={handleClick}
                                                                                                        >
                                                                                                            {day}
                                                                                                        </DateCell>
                                                                                                    );
                                                                                                })}
                                                                                            </DateGridContainer>
                                                                                        </SkyPopover>
                                                                                    </>
                                                                                );
                                                                            }}
                                                                        />
                                                                        <StyleTypography>của tháng</StyleTypography>
                                                                    </RadioContainer>
                                                                </SkyBox>
                                                            );
                                                        }}
                                                    />
                                                </SkyGrid>

                                                {/* Radio: Vào ngày cuối */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="monthPattern"
                                                        control={control}
                                                        render={({ field }) => {
                                                            const handleLastDayChange = () => field.onChange('lastDay');
                                                            return (
                                                                <RadioContainer>
                                                                    <SkyRadio
                                                                        checked={field.value === 'lastDay'}
                                                                        onChange={handleLastDayChange}
                                                                        size="small"
                                                                    />
                                                                    <StyleTypography>Vào ngày cuối</StyleTypography>
                                                                </RadioContainer>
                                                            );
                                                        }}
                                                    />
                                                </SkyGrid>
                                            </SkyGrid>
                                        )}

                                        {/* ===== CHO QUÝ ===== */}
                                        {repeatTask === 'quy' && (
                                            <SkyGrid container spacing={2}>
                                                {/* Chọn tháng trong quý */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="monthInQuarter"
                                                        control={control}
                                                        render={({ field }) => (
                                                            <CustomInput
                                                                select
                                                                label="Chọn tháng lặp trong quý"
                                                                options={monthInQuarterOptions}
                                                                customLabel="label"
                                                                customValue="value"
                                                                {...field}
                                                                required
                                                            />
                                                        )}
                                                    />
                                                </SkyGrid>

                                                {/* Radio: Vào ngày X của tháng + Popup Grid Selection */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="quarterPattern"
                                                        control={control}
                                                        render={({ field }) => {
                                                            const handleQuarterDayPatternChange = () => field.onChange('dayOfMonth');
                                                            return (
                                                                <SkyBox>
                                                                    <RadioContainer>
                                                                        <SkyRadio
                                                                            checked={field.value === 'dayOfMonth'}
                                                                            onChange={handleQuarterDayPatternChange}
                                                                            size="small"
                                                                        />
                                                                        <StyleTypography>Vào ngày</StyleTypography>
                                                                        <Controller
                                                                            name="quarterDay"
                                                                            control={control}
                                                                            render={({ field: dayField }) => {
                                                                                const handleInputClick = (event) => {
                                                                                    setQuarterDateGridAnchor(event.currentTarget);
                                                                                };

                                                                                const handlePopoverClose = () => {
                                                                                    setQuarterDateGridAnchor(null);
                                                                                };

                                                                                return (
                                                                                    <>
                                                                                        <NarrowInputWrapper onClick={handleInputClick}>
                                                                                            <CustomInput
                                                                                                type="number"
                                                                                                {...dayField}
                                                                                                readOnly
                                                                                                inputProps={{ min: 1, max: 28 }}
                                                                                            />
                                                                                        </NarrowInputWrapper>

                                                                                        <SkyPopover
                                                                                            open={isQuarterDateGridOpen}
                                                                                            anchorEl={quarterDateGridAnchor}
                                                                                            onClose={handlePopoverClose}
                                                                                            anchorOrigin={{
                                                                                                vertical: 'bottom',
                                                                                                horizontal: 'left',
                                                                                            }}
                                                                                            transformOrigin={{
                                                                                                vertical: 'top',
                                                                                                horizontal: 'left',
                                                                                            }}
                                                                                        >
                                                                                            <DateGridContainer>
                                                                                                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                                                                                                    const isSelected = Number(dayField.value) === day;
                                                                                                    const handleClick = () => handleSingleDaySelect(day, dayField.onChange, setQuarterDateGridAnchor);
                                                                                                    return (
                                                                                                        <DateCell
                                                                                                            key={day}
                                                                                                            isSelected={isSelected}
                                                                                                            onClick={handleClick}
                                                                                                        >
                                                                                                            {day}
                                                                                                        </DateCell>
                                                                                                    );
                                                                                                })}
                                                                                            </DateGridContainer>
                                                                                        </SkyPopover>
                                                                                    </>
                                                                                );
                                                                            }}
                                                                        />
                                                                        <StyleTypography>của tháng</StyleTypography>
                                                                    </RadioContainer>
                                                                </SkyBox>
                                                            );
                                                        }}
                                                    />
                                                </SkyGrid>

                                                {/* Radio: Vào ngày cuối cùng của tháng */}
                                                <SkyGrid item xs={12}>
                                                    <Controller
                                                        name="quarterPattern"
                                                        control={control}
                                                        render={({ field }) => {
                                                            const handleLastDayChange = () => field.onChange('lastDay');
                                                            return (
                                                                <RadioContainer>
                                                                    <SkyRadio
                                                                        checked={field.value === 'lastDay'}
                                                                        onChange={handleLastDayChange}
                                                                        size="small"
                                                                    />
                                                                    <StyleTypography>Vào ngày cuối cùng của tháng</StyleTypography>
                                                                </RadioContainer>
                                                            );
                                                        }}
                                                    />
                                                </SkyGrid>
                                            </SkyGrid>
                                        )}
                                    </SkyGrid>
                                </SkyGrid>
                            </SkyGrid>

                            {/* Cột 3: Mô tả */}
                            <SkyGrid item xs={12} md={4}>
                                <Controller
                                    name="note"
                                    control={control}
                                    render={({ field }) => (
                                        <CustomInput
                                            multiline
                                            rows={10}
                                            label="Mô tả"
                                            placeholder="Nhập mô tả"
                                            {...field}
                                            onChange={handleNoteChange(field)}
                                            inputProps={{ maxLength: 3001 }}
                                            error={!!errors.note}
                                            helperText={errors.note?.message}
                                        />
                                    )}
                                />
                            </SkyGrid>
                        </SkyGrid>
                    </>
                }

                {type === "participants" &&
                    <SkyGrid container spacing={2} mb={1}>
                        <SkyGrid item xs={12} md={6}>
                            <WrappedAsyncAutoComplete
                                label="Người giao việc"
                                disabled
                                isMulti
                                options={data?.assigners?.[0] ? [data.assigners[0]] : []}
                                value={data?.assigners?.[0] ? [data.assigners[0]] : []}
                                optionValue="_id"
                                optionLabel="name"
                                optionSubLabel="parentName"
                            />
                        </SkyGrid>

                        <SkyGrid item xs={12} md={6}>
                            <Controller
                                name="directors"
                                control={control}
                                render={({ field }) => (
                                    !(checkPermision?.directorSelectDepartment) ?
                                        <WrappedAsyncAutoComplete
                                            {...field}
                                            label="Người chủ trì"
                                            url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${user?.id || ""}&excludeId=${leaderExcludeIds}`}
                                            queryParams={["name", "email"]}
                                            optionLabel="name"
                                            optionValue="id"
                                            optionSubLabel="parentName"

                                        /> : <WrappedPersonOrUnitAsyncInput
                                            {...field}
                                            label="Người chủ trì"
                                            personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=director&leaderId=${user?.id || ""}&excludeId=${leaderExcludeIds}`}
                                            unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=director`}
                                            personQueryParams={["name", "email"]}
                                            unitQueryParams={["name"]}
                                            optionValue="id"
                                            onTypeChange={setLeaderType}
                                            defaultType={leaderType}
                                            optionSubLabel="parentName"
                                        />
                                )}
                            />
                        </SkyGrid>

                        {!checkPermision?.disableSuporter &&
                            <SkyGrid item xs={12} md={6}>
                                <Controller
                                    name="supporters"
                                    control={control}
                                    render={({ field }) => (
                                        !(checkPermision?.supporterSelectDepartment) ?
                                            <WrappedAsyncAutoComplete
                                                {...field}
                                                label="Người phối hợp"
                                                url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${user?.id || ""}&excludeId=${coordinatorExcludeIds}`}
                                                queryParams={["name", "email"]}
                                                optionLabel="name"
                                                isMulti
                                                limitTags={3}
                                                optionValue="id"
                                                optionSubLabel="parentName"
                                            /> : <WrappedPersonOrUnitAsyncInput
                                                {...field}
                                                label="Người phối hợp"
                                                personUrl={`${API_GET_COMMON_WORK_USER}?typeTaskUser=supporter&leaderId=${user?.id || ""}&excludeId=${coordinatorExcludeIds}`}
                                                unitUrl={`${API_GET_COMMON_WORK_ORG}?typeTaskUser=supporter`}
                                                personQueryParams={["name", "email"]}
                                                unitQueryParams={["name"]}
                                                isMulti
                                                limitTags={2}
                                                optionValue="id"
                                                onTypeChange={setCoordinatorType}
                                                defaultType={coordinatorType}
                                                optionSubLabel="parentName"
                                            />
                                    )}
                                />
                            </SkyGrid>
                        }

                        <SkyGrid item xs={12} md={6}>
                            <Controller
                                name="viewers"
                                control={control}
                                render={({ field }) => (
                                    <WrappedAsyncAutoComplete
                                        isMulti
                                        label="Người xem"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${API_GET_COMMON_WORK_USER}?typeTaskUser=viewer&leaderId=${user?.id || ""}&excludeId=${viewerExcludeIds}`}
                                        queryParams={["name", "email"]}
                                        optionLabel="name"
                                        optionValue="id"
                                        limitTags={3}
                                        optionSubLabel="parentName"
                                    />
                                )}
                            />
                        </SkyGrid>
                    </SkyGrid>

                }
            </>
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
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </CustomDialog>

    )
}

export default UpdateRepetiviveWork