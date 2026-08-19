import CustomAsyncAutoComplete from '@components/CustomAsyncAutoComplete';
import { CustomDialog } from '@components/CustomDialog';
import { SkyBox, SkyFlexGap8 } from '@styles/SkyStyles';
import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import schema from './constant';
import LoadingDialog from '@components/LoadingDialog';
import { useToast } from '@components/common/ToastProvider';
import { API_CREATE_PERSONAL_TASK_DELEGATION, APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import axiosInstance from '@utils/axiosInstance';
import { styled } from '@mui/material';
import withFormWrapper from '@components/common/FormWrapper';
const CustomDatePicker = React.lazy(() => import("@components/CustomDateTimePicker"));

const StyleBox = styled(SkyBox)({
    marginBottom: "30px",

});

const FlexBox = styled(SkyBox)({
    flex: 1
});

const PersonalTaskDelegation = (props) => {
    const { open, onClose, setReloadData } = props;
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    const { control, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            toUserId: null,
            startDate: null,
            endDate: null,
        }
    });

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            const body = {
                toUserId: data.toUserId,
                startDate: data.startDate,
                endDate: data.endDate,
                status: 1
            }

            const res = await axiosInstance.post(API_CREATE_PERSONAL_TASK_DELEGATION, body)
            if (res) {
                toast("Uỷ quyền thành công!", "success");
                setReloadData(new Date() * 1);
                handleClose();
            }
        } catch (error) {

            toast(error?.response?.data?.message || error?.message || "Không thể tạo mới uỷ quyền", "error");

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
            });
        }
    }, [open, reset]);

    const WrappedCustomAsyncAutoComplete = useMemo(() => {
        const Wrapped = withFormWrapper(CustomAsyncAutoComplete, "asyncSelect");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedCustomAsyncAutoComplete";
        return Component;
    }, []);


    const WrappedCustomDatePicker = useMemo(() => {
        const Wrapped = withFormWrapper(CustomDatePicker, "date");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "WrappedDateTimeRangePicker";
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
            isLoading={isLoading}
            title="Tạo mới uỷ quyền"
        >
            <SkyBox>
                <StyleBox>
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
                                required
                                error={!!errors.toUserId}
                                helperText={errors.toUserId?.message}

                            />
                        )}
                    />
                </StyleBox>

                <SkyFlexGap8>
                    <FlexBox>
                        <Controller
                            name="startDate"
                            control={control}
                            render={({ field }) => (
                            <WrappedCustomDatePicker
                                    label="Ngày bắt đầu"
                                    required
                                    {...field}
                                    value={field.value || null}
                                    futureOnly
                                    onChange={handleDateChange(field.onChange)}
                                    showTime
                                    error={!!errors.startDate}
                                    helperText={errors.startDate?.message}
                                />
                            )}
                        />
                    </FlexBox>
                    <FlexBox>
                        <Controller
                            name="endDate"
                            control={control}
                            render={({ field }) => (
                                <WrappedCustomDatePicker
                                    label="Ngày kết thúc"
                                    {...field}
                                    required
                                    value={field.value || null}
                                    onChange={handleDateChange(field.onChange)}
                                    futureOnly
                                    showTime
                                    error={!!errors.endDate}
                                    helperText={errors.endDate?.message}
                                />
                            )}
                        />
                    </FlexBox>
                </SkyFlexGap8>

            </SkyBox>

            <LoadingDialog open={isLoading} >
                Đang tải dữ liệu, vui lòng đợi...
            </LoadingDialog>
        </CustomDialog>
    )
}

export default PersonalTaskDelegation