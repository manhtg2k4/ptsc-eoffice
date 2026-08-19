import React, { useCallback, useEffect, useState } from 'react'
import CustomDialog from '@components/CustomDialog/CustomDialog';
import { Typography, styled } from '@mui/material';
import { useToast } from '@components/common/ToastProvider';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { defaultValue, schemaEdit } from '@pages/Topic/constant';
import axiosInstance from '@utils/axiosInstance';
import { APP_BASE } from '@EnvironmentFile/constants/urlConfig';

const StyledMessage = styled(Typography)(({ theme }) => ({
    fontSize: '18px',
    fontWeight: 500,
    color: theme.palette.text.primary,
}));

const StyledSubText = styled(Typography)(({ theme }) => ({
    fontSize: '14px',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
    fontStyle: 'italic',
}));

const ApplyProcessDialog = (prop) => {
    const { open, onClose, setReloadData, documentId } = prop;
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const {
        handleSubmit,
        reset,
        watch
    } = useForm({
        resolver: yupResolver(schemaEdit),
        defaultValues: defaultValue
    });

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

    const onSubmit = useCallback(async (data) => {
        setIsLoading(true)
        try {
            const body = {
                name: data.name,
                href: data.href,
                displayOrder: data.displayOrder,
                status: '1',
                requiresApproval: true,
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
            title="Xác nhận"
            onSave={handleSubmit(onSubmit)}
            type="add"
            size="md"
            titleButton="LƯU"
            cancelButtonText="Đóng"
            isLoading={isLoading}
        >
            <StyledMessage>
                Bạn có chắc chắn muốn áp dụng quy trình duyệt tin cho chủ đề “{watch('name')}”?
            </StyledMessage>
            <StyledSubText>
                Tác vụ này sẽ không thể hoàn tác
            </StyledSubText>
        </CustomDialog>
    )
}

export default ApplyProcessDialog