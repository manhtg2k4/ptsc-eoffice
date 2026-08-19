import React, { memo, useEffect, useCallback, useState, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import CustomDialog from '@components/CustomDialog/CustomDialog';
// import CustomInput from '@components/CustomInput/CustomInputBase';
import { Radio, RadioGroup } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useToast } from "@components/common/ToastProvider";
import withSharedComponents from "@components/WrapperComponent";
import withFormWrapper from "@components/common/FormWrapper";


import {
    FormContainer,
    FormSection,
    // SectionTitle,
    FormRow,
    FormRowAlignStart,
    FormField,
    StyledFormLabel,
    StyledFormControlLabel
} from '@styles/Topic/Topic.styles';
import {
    defaultValue,
    schemaEdit,
    STATUS_OPTIONS
} from './constant';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from '@styles/CustomDialog.styles';
import { SkyFormControl } from '@styles/SkyStyles';

const StyledFormControl = styled(SkyFormControl)(({ theme }) => ({
    marginTop: theme.spacing(-0.8)
}));


function EditTopic(props) {
    const { open, onClose, setReloadData, documentId, sharedComponents } = props;
    const {
        InputComponents: BaseInput,
    } = sharedComponents;

    const InputComponents = useMemo(() => {
        const Wrapped = withFormWrapper(BaseInput, "input");
        const Component = (props) => <Wrapped {...props} />;
        Component.displayName = "InputComponents";
        return Component;
    }, [BaseInput]);

    const {
        control,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schemaEdit),
        defaultValues: defaultValue
    });

    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);




    const fetchData = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${APP_BASE}/api/topic/${documentId}`);
            if (res) {
                reset(res);
            }
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi lấy dữ liệu", "error");
        }
    }, [documentId, reset, toast]);

    useEffect(() => {
        if (documentId) {
            fetchData();
        }
    }, [documentId, fetchData]);


    const handleApprovalChange = useCallback((field) => (e) => {
        field.onChange(e.target.value === 'true');
    }, []);


    const onSubmit = useCallback(async (data) => {
        setIsLoading(true)
        try {
            const body = {
                name: data.name,
                href: data.href,
                displayOrder: data.displayOrder,
                status: data.status,
                requiresApproval: data.requiresApproval,
                description: data.description
            };

            const res = await axiosInstance.patch(`${APP_BASE}/api/topic/${documentId}`, body);
            if (res) {
                toast("Cập nhật chủ đề thành công", "success");
                reset(defaultValue);
                setReloadData(new Date() * 1);
                onClose();
            }
            setIsLoading(false)
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới chủ đề", "error");
            setIsLoading(false)
        }
    }, [documentId, onClose, setReloadData, toast, reset]);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title="Chỉnh sửa chủ đề"
            onSave={handleSubmit(onSubmit)}
            type="edit"
            size="md"
            titleButton="LƯU"
            cancelButtonText="Đóng"
            isLoading={isLoading}
        >
            <FormContainer>
                <FormSection>
                    {/* <SectionTitle>Thông tin chủ đề</SectionTitle> */}

                    {/* Row 1: Mã chủ đề và Tên chủ đề */}
                    <FormRow>
                        <FormField>
                            <Controller
                                name="href"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Mã chủ đề"
                                        placeholder="Mã chủ đề..."
                                        {...field}
                                        error={!!errors.href}
                                        helperText={errors.href?.message}
                                        fullWidth
                                    />
                                )}
                            />
                        </FormField>
                        <FormField>
                            <Controller
                                name="name"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Tên chủ đề"
                                        placeholder="Tên chủ đề..."
                                        {...field}
                                        error={!!errors.name}
                                        helperText={errors.name?.message}
                                        fullWidth
                                    />
                                )}
                            />
                        </FormField>
                    </FormRow>

                    {/* Row 2: Trạng thái và Thứ tự hiển thị */}
                    <FormRow>
                        <FormField>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Trạng thái"
                                        placeholder="Trạng thái..."
                                        select
                                        options={STATUS_OPTIONS}
                                        {...field}
                                        error={!!errors.status}
                                        helperText={errors.status?.message}
                                        required
                                        fullWidth
                                    />
                                )}
                            />
                        </FormField>
                        <FormField>
                            <Controller
                                name="displayOrder"
                                control={control}
                                render={({ field }) => (
                                    <InputComponents
                                        label="Thứ tự hiển thị"
                                        placeholder="Nhập thứ tự hiển thị..."
                                        type="number"
                                        {...field}
                                        error={!!errors.displayOrder}
                                        helperText={errors.displayOrder?.message}
                                        required
                                        fullWidth
                                    />
                                )}
                            />
                        </FormField>
                    </FormRow>

                    {/* Row 3: Cần phê duyệt */}
                    <FormRowAlignStart>
                        <FormField>
                            <StyledFormControl component="fieldset" fullWidth>
                                <StyledFormLabel component="legend">
                                    CẦN PHÊ DUYỆT
                                </StyledFormLabel>
                                <Controller
                                    name="requiresApproval"
                                    control={control}
                                    render={({ field }) => (
                                        <RadioGroup
                                            row
                                            onChange={handleApprovalChange(field)}
                                            value={field.value !== null && field.value !== undefined ? field.value.toString() : ""}
                                        >
                                            <StyledFormControlLabel
                                                value="true"
                                                control={<Radio size="small" />}
                                                label="Có"
                                            />
                                            <StyledFormControlLabel
                                                value="false"
                                                control={<Radio size="small" />}
                                                label="Không"
                                            />
                                        </RadioGroup>
                                    )}
                                />
                            </StyledFormControl>
                        </FormField>
                    </FormRowAlignStart>

                    {/* Row 4: Mô tả */}
                    <FormField>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <InputComponents
                                    label="Mô tả"
                                    placeholder="Mô tả..."
                                    multiline
                                    rows={4}
                                    {...field}
                                    fullWidth
                                />
                            )}
                        />
                    </FormField>
                </FormSection>
            </FormContainer>

            <LoadingDialog open={isLoading}>
                <StyledDialogContent>
                    Đang tải dữ liệu, vui lòng chờ trong giây lát...
                </StyledDialogContent>
            </LoadingDialog>

        </CustomDialog>
    );
}

EditTopic.displayName = "EditTopic";

export default withSharedComponents(memo(EditTopic));
