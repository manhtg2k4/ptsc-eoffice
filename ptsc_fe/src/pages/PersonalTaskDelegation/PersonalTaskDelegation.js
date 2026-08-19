import CustomAsyncAutoComplete from '@components/CustomAsyncAutoComplete';
import { CustomDialog } from '@components/CustomDialog';
import { SkyBox, SkyFlexGap8 } from '@styles/SkyStyles';
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import schema from './constant';
import LoadingDialog from '@components/LoadingDialog';
import { useToast } from '@components/common/ToastProvider';
import { API_CREATE_PERSONAL_TASK_DELEGATION, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import axiosInstance from '@utils/axiosInstance';
import { styled, } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CustomInput from '@components/CustomInput/CustomInputBase';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);
import CustomButton from '@components/CustomButton';
import withFormWrapper from '@components/common/FormWrapper';
const CustomDatePicker = React.lazy(() => import("@components/CustomDateTimePicker"));

const StyleBox = styled(SkyBox)({
    marginBottom: "30px",
});

const EditButton = styled(CustomButton)({
    backgroundColor: '#0062ac',
    color: '#fff',
    '&:hover': {
        backgroundColor: '#004a82',
    },
});

const FlexItem = styled(SkyBox)({
    flex: 1,
});


const PersonalTask = (props) => {
    const { open, onClose, setReloadData, id, type } = props;
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const toast = useToast();
    const { crmSource } = useSelector((state) => state.config);
    const statusOptions = useMemo(
        () => crmSource.find((item) => item.code === "STATUS_PERSONAL_TASK_DELEGATION")?.data || [],
        [crmSource]
    );

    const { control, handleSubmit, formState: { errors }, reset, watch } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            toUserId: null,
            startDate: null,
            endDate: null,
            statusNumber: null
        }
    });

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            const body = {
                toUserId: typeof data.toUserId === 'object' ? data.toUserId?.id : data.toUserId,
                startDate: data.startDate ? dayjs(data.startDate).toISOString() : null,
                endDate: data.endDate ? dayjs(data.endDate).toISOString() : null,
                status: data.statusNumber !== null ? Number(data.statusNumber) : null
            }

            const res = await axiosInstance.patch(`${API_CREATE_PERSONAL_TASK_DELEGATION}/${id}`, body)
            if (res) {
                toast("Cập nhật uỷ quyền thành công!", "success");
                setReloadData(new Date() * 1);
                handleClose();
            }
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Không thể cập nhật uỷ quyền", "error");
        } finally {
            setIsLoading(false);
        }
    }

    const handleClose = () => {
        onClose();
        reset({
            toUserId: null,
            startDate: null,
            endDate: null,
        });
        setReloadData(new Date() * 1);
        setIsEditMode(false);
    };

    const handleEdit = () => {
        setIsEditMode(true);
    };

    const handleDateChange = (onChange) => {
        return (value) => {
            onChange(value);
        };
    };

    useEffect(() => {
        if (open) {
            reset({
                toUserId: null,
                startDate: null,
                endDate: null,
                statusNumber: null
            });
            setIsEditMode(type === "edit");
        }
    }, [open, type, reset]);

    const watchStatus = watch("statusNumber");

    const getDataDetail = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await axiosInstance.get(`${API_CREATE_PERSONAL_TASK_DELEGATION}/${id}`);
            if (res) {
                reset({
                    toUserId: res?.toUserId ? { id: res.toUserId, name: res.toUser } : null,
                    startDate: res?.startDate ? dayjs(res.startDate, "HH:mm DD/MM/YYYY").toDate() : null,
                    endDate: res?.endDate ? dayjs(res.endDate, "HH:mm DD/MM/YYYY").toDate() : null,
                    statusNumber: res?.statusNumber || null
                });
            }
        } catch (error) {
            toast(error?.response?.data?.message || error?.message || "Không thể lấy thông tin uỷ quyền", "error");
        } finally {
            setIsLoading(false);
        }
    }, [id, reset, toast])


    useEffect(() => {
        if (open) {
            getDataDetail();
        }
    }, [open, getDataDetail]);

    const WrappedCustomAsyncAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
        Component.displayName = "WrappedCustomAsyncAutoComplete";
        return Component;
    }, []);

    const WrappedCustomInput = useMemo(() => {
        const Wrapped = withFormWrapper(CustomInput, "input");
        const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
        Component.displayName = "WrappedCustomInput";
        return Component;
    }, []);

  const WrappedCustomDatePicker= useMemo(() => {
        const Wrapped = withFormWrapper(CustomDatePicker, "date");
        const Component = (props) => <Wrapped {...props} isView={props.isView !== undefined ? props.isView : true} />;
        Component.displayName = "WrappedCustomDatePicker";
        return Component;
    }, []);



    return (
        <CustomDialog
            open={open}
            onClose={handleClose}
            fullWidth
            size='md'
            onSave={handleSubmit(onSubmit)}
            titleButton="Lưu"
            disableSave={type === "view" && !isEditMode}
            isLoading={isLoading}
            title={type === "edit" || isEditMode ? "Cập nhật uỷ quyền" : "Chi tiết uỷ quyền"}
            customButtons={
                type === "view" && !isEditMode && watchStatus !== 2 && (
                    <EditButton
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={handleEdit}
                    >
                        Chỉnh sửa
                    </EditButton>
                )
            }
        >
            <SkyBox>
                <StyleBox>
                    <SkyFlexGap8>
                        <FlexItem>
                            <Controller
                                name="toUserId"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomAsyncAutoComplete
                                        label="Người được uỷ quyền"
                                        placeholder="Tìm kiếm"
                                        {...field}
                                        url={`${APP_BASE}/api/users/by-task-role?typeTaskUser=director`}
                                        queryParam="name"
                                        optionLabel="name"
                                        optionValue="id"
                                        returnObject={false}
                                        required={type === "edit" || isEditMode}
                                        error={!!errors.toUserId}
                                        disabled={type !== "edit" && !isEditMode}
                                        helperText={errors.toUserId?.message}
                                        fullWidth
                                        isView={type === "view"}
                                    />
                                )}
                            />
                        </FlexItem>
                        <FlexItem>
                            <Controller
                                name="statusNumber"
                                control={control}
                                render={({ field }) => (
                                    <WrappedCustomInput
                                        select
                                        label="Trạng thái ủy quyền"
                                        options={statusOptions}
                                        customLabel="title"
                                        customValue="value"
                                        {...field}
                                        disabled={type !== "edit" && !isEditMode}
                                        fullWidth
                                        isView={type !== "edit" && !isEditMode}
                                    />
                                )}
                            />
                        </FlexItem>
                    </SkyFlexGap8>
                </StyleBox>
                <SkyFlexGap8>
                    <FlexItem>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                                <WrappedCustomDatePicker
                                    label="Ngày bắt đầu"
                                    required={type === "edit" || isEditMode}
                                    {...field}
                                    value={field.value || null}
                                    isEdit={!!id}
                                    futureOnly
                                    onChange={handleDateChange(field.onChange)}
                                    showTime
                                    error={!!errors.startDate}
                                    disabled={type !== "edit" && !isEditMode}
                                    helperText={errors.startDate?.message}
                                    fullWidth
                                    isView={type !== "edit" && !isEditMode}
                                />
                            )}
                        />
                    </FlexItem>
                    <FlexItem>
                        <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                                <WrappedCustomDatePicker
                                    label="Ngày kết thúc"
                                    {...field}
                                    required={type === "edit" || isEditMode}
                                    value={field.value || null}
                                    isEdit={!!id}
                                    onChange={handleDateChange(field.onChange)}
                                    futureOnly
                                    showTime
                                    error={!!errors.endDate}
                                    disabled={type !== "edit" && !isEditMode}
                                    helperText={errors.endDate?.message}
                                    fullWidth
                                    isView={type !== "edit" && !isEditMode}
                                />
                            )}
                        />
                    </FlexItem>
                </SkyFlexGap8>

            </SkyBox>

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </CustomDialog>
    )
}

export default PersonalTask