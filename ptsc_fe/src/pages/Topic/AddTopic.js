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
    FormFieldHalf,
    StyledFormLabel,
    StyledFormControlLabel
} from '@styles/Topic/Topic.styles';
import {
    defaultValue,
    schema,
    STATUS_OPTIONS
} from './constant';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';
import LoadingDialog from '@components/LoadingDialog';
import { StyledDialogContent } from "@styles/CustomDialog.styles";
import { SkyFormControl } from '@styles/SkyStyles';

const StyledFormControl = styled(SkyFormControl)(({ theme }) => ({
    marginTop: theme.spacing(0.8)
}));



function AddTopic({ open, onClose, setReloadData, sharedComponents }) {
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
        resolver: yupResolver(schema),
        defaultValues: defaultValue
    });

    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            reset(defaultValue);
        }
    }, [open, reset]);


    const handleApprovalChange = useCallback((field) => (e) => {
        field.onChange(e.target.value === 'true');
    }, []);


    const onSubmit = useCallback(async (data) => {
        try {
            setIsLoading(true);
            const body = {
                name: data.name,
                href: data.href,
                status: data.status,
                requiresApproval: data.requiresApproval,
                description: data.description
            };

            const res = await axiosInstance.post(`${APP_BASE}/api/topic`, body);
            if (res) {
                toast("Thêm mới chủ đề thành công", "success");
                reset(defaultValue);
                setReloadData(new Date() * 1);
                onClose();
            }
            setIsLoading(false);
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới chủ đề", "error");
            setIsLoading(false);
        }
    }, [onClose, setReloadData, toast, reset]);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title="Thêm mới chủ đề"
            onSave={handleSubmit(onSubmit)}
            type="add"
            size="md"
            titleButton="LƯU"
            cancelButtonText="Đóng"
            isLoading={isLoading}
        >
            <FormContainer>
                <FormSection>
                    {/* <SectionTitle>Thông tin chủ đề</SectionTitle> */}

                    {/* Row 1: Tên chủ đề và Cần phê duyệt */}
                    <FormRow>
                         <FormFieldHalf>
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
                                        required
                                        fullWidth
                                    />
                                )}
                            />
                        </FormFieldHalf>
                        <FormFieldHalf>
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
                                        required
                                        fullWidth
                                    />
                                )}
                            />
                        </FormFieldHalf>
                    </FormRow>

                    {/* Row 2: Trạng thái và Cần phê duyệt */}
                    <FormRowAlignStart>
                        <FormFieldHalf>
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
                        </FormFieldHalf>
                            <FormFieldHalf>
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
                                                value={field.value !== null && field.value !== undefined ? field?.value?.toString() : ""}
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
                            </FormFieldHalf>
                    </FormRowAlignStart>

                    {/* Row 3: Mô tả */}
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

AddTopic.displayName = "AddTopic";

export default withSharedComponents(memo(AddTopic));
