import React, { memo, useState, useCallback, useMemo } from 'react';
import CustomDialog from '@components/CustomDialog/CustomDialog';
import CustomInput from '@components/CustomInput/CustomInputBase';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '@utils/axiosInstance';
import { API_YEAR_CATEGORY } from '@EnvironmentFile/constants/urlConfig';
import { useToast } from "@components/common/ToastProvider";

const schema = yup.object().shape({
    year: yup.string().required('Vui lòng chọn năm'),
});

const defaultValue = {
    year: new Date().getFullYear().toString(),
};

function AddYearCategory({ open, onClose, setReloadData }) {
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

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            years.push({ value: i.toString(), label: i.toString() });
        }
        return years;
    }, []);

    const onSubmit = useCallback(async (data) => {
        try {
            setIsLoading(true);
            const payload = {
                year: Number(data.year),
                description: `Năm ${data.year}`
            };

            const res = await axiosInstance.post(API_YEAR_CATEGORY, payload);
            if (res) {
                toast("Thêm mới danh mục năm thành công", "success");
                reset(defaultValue);
                setReloadData && setReloadData(new Date() * 1);
                onClose();
            }
        } catch (error) {
            toast(error?.response?.data?.message || "Có lỗi xảy ra khi thêm mới danh mục năm", "error");
        } finally {
            setIsLoading(false);
        }
    }, [onClose, setReloadData, reset, toast]);

    return (
        <CustomDialog
            open={open}
            onClose={onClose}
            title="Thêm danh mục năm"
            onSave={handleSubmit(onSubmit)}
            type="add"
            size="sm"
            titleButton="THÊM"
            cancelButtonText="ĐÓNG"
            isLoading={isLoading}
        >
            <Controller
                name="year"
                control={control}
                render={({ field }) => (
                    <CustomInput
                        label="Danh mục năm"
                        placeholder="Chọn năm"
                        select
                        options={yearOptions}
                        {...field}
                        error={!!errors.year}
                        helperText={errors.year?.message}
                        required
                        fullWidth
                    />
                )}
            />
        </CustomDialog>
    );
}

AddYearCategory.displayName = "AddYearCategory";

export default memo(AddYearCategory);
