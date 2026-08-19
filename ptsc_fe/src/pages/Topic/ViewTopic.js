import React, { memo, useEffect, useCallback, useMemo } from 'react';
import CustomDialog from '@components/CustomDialog/CustomDialog';
// import CustomInput from '@components/CustomInput/CustomInputBase';
import { FormControl, Radio, RadioGroup } from '@mui/material';
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
    STATUS_OPTIONS,

} from './constant';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';


function ViewTopic(props) {
    const { open, onClose, documentId, sharedComponents } = props;
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

        formState: { errors },
        reset
    } = useForm({
        resolver: yupResolver(schemaEdit),
        defaultValues: defaultValue
    });

    const toast = useToast();


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



    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title="Xem chi tiết chủ đề"
            type="edit"
            size="md"
            disableSave
            cancelButtonText="Đóng"
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
                                        disabled
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
                                        disabled
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
                                        options={STATUS_OPTIONS}
                                        disabled
                                        select

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
                                        placeholder="Chọn thứ tự hiển thị "


                                        disabled
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
                            <FormControl component="fieldset" fullWidth>
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
                                            disabled
                                        >
                                            <StyledFormControlLabel
                                                value="true"
                                                control={<Radio size="small" />}
                                                label="Có"
                                                disabled
                                            />
                                            <StyledFormControlLabel
                                                value="false"
                                                control={<Radio size="small" />}
                                                label="Không"
                                                disabled
                                            />
                                        </RadioGroup>
                                    )}
                                />
                            </FormControl>
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
                                    disabled
                                    {...field}
                                    fullWidth
                                />
                            )}
                        />
                    </FormField>
                </FormSection>
            </FormContainer>
        </CustomDialog>
    );
}

ViewTopic.displayName = "ViewTopic";

export default withSharedComponents(memo(ViewTopic));
