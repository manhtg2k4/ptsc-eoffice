import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import CustomInput from '@components/CustomInput/CustomInputBase';
import { DeleteOutline, Edit,   SendOutlined } from '@mui/icons-material';
import {
    SkyIconButton,
    SkyMenu,
    SkyMenuItem,
    SkyListItemText,
    SkyBox,

} from '@styles/SkyStyles';
import dayjs from 'dayjs';
import {
    StyledListItemIcon,
    JobSectionTitle,
    ReasonsDelayJobItem,
    JobCommentAvatar,
    JobCommentBody,
    JobCommentBox,
    JobCommentHeader,
    JobCommentUserInfo,
    JobCommentUserName,
    JobCommentTime,
    JobCommentMenuIcon,
    JobCommentContent,
    JobCommentInputContainer,
    JobCommentSendIconButton,
    RedText,
    ReasonsDelayJobSection,
    JobContentWrapper,
    StyleJobComment
} from '@pages/WorkManagement/components/Job.styles';

import { styled } from '@mui/material';
import { useToast } from '@components/common/ToastProvider';
import { addCommentToJob, deleteCommentInJob, updateCommentInJob } from '@redux/slices/SharedCategory/managementUnitSlice';
import { useDispatch, useSelector } from 'react-redux';
import LoadingDialog from '@components/LoadingDialog';
import { CustomDialog } from '@components/CustomDialog';
import axiosInstance from '@utils/axiosInstance';
import { API_COMMON_WORK_COMMENTS } from '@EnvironmentFile/constants/urlConfig';


export const SkyEditIcon = styled(Edit)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

export const SkyDeleteIcon = styled(DeleteOutline)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

export const StyleSkyListItemText = styled(SkyListItemText)(({ theme }) => ({
    '& .MuiListItemText-primary': {
        color: theme.palette.primary.main,
    },
}));

const DelayPanel = styled(SkyBox)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#0f172a" : "#ffffff",
  border: `1px solid ${
    theme.palette.mode === "dark" ? "rgba(148, 163, 184, 0.25)" : "#dbe3eb"
  }`,
  borderRadius: 12,
  padding: theme.spacing(1.5),
  flex: 1,
  display: "flex",
  flexDirection: "column",
}));

const SolutionToFix = (props) => {
    // These props would normally come from a parent container
    const {

        handleEditReason,

        currentTaskId,
    } = props;

    const [anchorEl, setAnchorEl] = useState(null);
    const [dataSolutionToFix, setDataSolutionToFix] = useState([]);
    const [selectedReason, setSelectedReason] = useState(null);
    const [reasonText, setReasonText] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [confirmDeleteComment, setConfirmDeleteComment] = useState(false);
    const [loading, setIsLoading] = useState(false);
    const { dataUser: authUser } = useSelector((state) => state.auth || {});
    const userData = useMemo(() => authUser || {}, [authUser]);

    const dispatch = useDispatch();
    const toast = useToast();

    const handleOpenMenu = useCallback((event, reason) => {
        setAnchorEl(event.currentTarget);
        setSelectedReason(reason);
    }, []);

    const handleCloseMenu = useCallback(() => {
        setAnchorEl(null);
        setSelectedReason(null);
    }, []);

    const handleReasonChange = useCallback((e) => {
        setReasonText(e.target.value);
    }, []);

    const onEdit = useCallback(() => {
        if (handleEditReason && selectedReason) {
            handleEditReason(selectedReason);
        }
        // Luôn set editing state để handleReason biết đây là update
        if (selectedReason) {
            setEditingCommentId(selectedReason.id);
            setReasonText(selectedReason.content);
        }
        handleCloseMenu();
    }, [handleEditReason, selectedReason, handleCloseMenu]);


    const handleDeleteComment = () => {
        setConfirmDeleteComment(true);
        setAnchorEl(null); // Chỉ đóng menu, không xóa comment đang chọn
    };

    const fecthDataSolutionToFix = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await axiosInstance.get(
                `${API_COMMON_WORK_COMMENTS}/${currentTaskId}/comments`,
                {
                    params: {
                        filter: {
                            type: "solution",
                        },
                    },
                }
            );
            setDataSolutionToFix(res);
            setIsLoading(false);
        } catch (error) {
            logger.error(error);
            setIsLoading(false);
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
        } finally {
            setIsLoading(false);
        }
    }, [currentTaskId, toast]);

    const onDelete = useCallback(async () => {
        try {
            setIsLoading(true);
            await dispatch(deleteCommentInJob({
                documentId: currentTaskId,
                commentId: selectedReason.id
            })).unwrap();
            await fecthDataSolutionToFix?.();
            toast("Xóa giải pháp khắc phục công việc thành công", "success");
            setConfirmDeleteComment(false);
            handleCloseMenu();
            setIsLoading(false);
        } catch (error) {

            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
            setIsLoading(false);
        }
    }, [currentTaskId, dispatch, fecthDataSolutionToFix, toast, selectedReason, handleCloseMenu]);


    const handleReason = useCallback(async () => {
        try {
            setIsLoading(true);
            const body = {
                type: "solution",
                userId: userData?.user?._id,
                userName: userData?.user?.name,
                content: reasonText,
                fileId: [],
                mentionIds: [],

            }
            if (editingCommentId) {
                await dispatch(updateCommentInJob({
                    documentId: currentTaskId,
                    commentId: editingCommentId,
                    content: reasonText
                })).unwrap();
                toast("Cập nhật giải pháp khắc phục công việc thành công", "success");
            } else {
                await dispatch(addCommentToJob({ documentId: currentTaskId, commentData: body })).unwrap();
                toast("Thêm giải pháp khắc phục công việc thành công", "success");
            }

            await fecthDataSolutionToFix?.();

            setEditingCommentId(null);
            setReasonText("");
            handleCloseMenu?.();
            setIsLoading(false);
        } catch (error) {
            logger.error(error);
            toast(error?.response?.data?.message || "Có lỗi xảy ra", "error");
            setIsLoading(false);
        }
    }, [currentTaskId, reasonText, userData, dispatch, fecthDataSolutionToFix, toast, handleCloseMenu, editingCommentId])

    const handleCloseDialog = () => {
        setConfirmDeleteComment(false);
    };

    useEffect(() => {
        fecthDataSolutionToFix?.();
    }, [currentTaskId, fecthDataSolutionToFix]);

    return (
        <JobContentWrapper>
            <JobSectionTitle variant="h6" mt={1.8} mb={1.5}>
                <svg width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.8667 9.13C15.8667 5.00444 12.67 1.66 8.72669 1.66C4.78337 1.66 1.58667 5.00444 1.58667 9.13C1.58667 13.2556 4.78337 16.6 8.72669 16.6C12.67 16.6 15.8667 13.2556 15.8667 9.13ZM17.4534 9.13C17.4534 14.1723 13.5463 18.26 8.72669 18.26C3.90708 18.26 0 14.1723 0 9.13C0 4.08764 3.90708 0 8.72669 0C13.5463 0 17.4534 4.08764 17.4534 9.13Z" fill="#2364B0"/>
<path d="M7.92969 9.11875L7.92969 5.79875C7.92969 5.34036 8.28486 4.96875 8.72302 4.96875C9.16118 4.96875 9.51636 5.34036 9.51636 5.79875V9.11875C9.51636 9.57716 9.16118 9.94875 8.72302 9.94875C8.28486 9.94875 7.92969 9.57716 7.92969 9.11875Z" fill="#2364B0"/>
<path d="M8.7308 11.6328L8.81211 11.6369C9.21211 11.6794 9.52413 12.033 9.52413 12.4628C9.52413 12.8926 9.21211 13.2462 8.81211 13.2887L8.7308 13.2928H8.72302C8.28486 13.2928 7.92969 12.9212 7.92969 12.4628C7.92969 12.0044 8.28486 11.6328 8.72302 11.6328H8.7308Z" fill="#2364B0"/>
</svg>
                <RedText>GIẢI PHÁP KHẮC PHỤC</RedText>
            </JobSectionTitle>

            <DelayPanel>
                <ReasonsDelayJobSection>
                {dataSolutionToFix?.map((reason, i) => (
                    <ReasonsDelayJobItem key={reason.id || i}>
                        {/* Reason Content Box */}
                        <JobCommentBox hasLeftBorder isNewest={i === 0}>
                            {/* Avatar */}
                            <JobCommentAvatar>
                                {reason.userName ? reason.userName.charAt(0).toUpperCase() : "U"}
                            </JobCommentAvatar>

                            <JobCommentBody>
                                <JobCommentHeader>
                                    <JobCommentUserInfo>
                                        <JobCommentUserName variant="subtitle2">
                                            {reason.userName}
                                        </JobCommentUserName>
                                        <JobCommentTime variant="caption">
                                            {reason.createdAt
                                                ? dayjs(reason.createdAt).format("DD/MM/YYYY HH:mm")
                                                : ""}
                                        </JobCommentTime>
                                    </JobCommentUserInfo>

                                </JobCommentHeader>

                                <StyleJobComment>
                                    <JobCommentContent variant="body2">
                                        {reason.content}
                                    </JobCommentContent>
                                    <ReasonMenu reason={reason} handleOpenMenu={handleOpenMenu} />
                                </StyleJobComment>
                            </JobCommentBody>
                        </JobCommentBox>
                    </ReasonsDelayJobItem>
                ))}
            </ReasonsDelayJobSection>

            {/* Input Container */}
            <JobCommentInputContainer>
                <CustomInput
                    fullWidth
                    placeholder="Nhập giải pháp khắc phục của dự án..."
                    size="small"
                    value={reasonText}
                    onChange={handleReasonChange}
                    InputProps={{
                        endAdornment: (
                            <JobCommentSendIconButton size="small" onClick={handleReason}>
                                <SendOutlined />
                            </JobCommentSendIconButton>
                        )
                    }}
                />
            </JobCommentInputContainer>
            </DelayPanel>

            <SkyMenu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <SkyMenuItem onClick={onEdit}>
                    <StyledListItemIcon>
                        <SkyEditIcon />
                    </StyledListItemIcon>
                    <StyleSkyListItemText primary="Sửa" />
                </SkyMenuItem>
                <SkyMenuItem onClick={handleDeleteComment}>
                    <StyledListItemIcon>
                        <SkyDeleteIcon />
                    </StyledListItemIcon>
                    <StyleSkyListItemText primary="Xóa" />
                </SkyMenuItem>
            </SkyMenu>

            <LoadingDialog open={loading} >
                Đang tải tài liệu, vui lòng đợi...
            </LoadingDialog>
            <CustomDialog
                open={confirmDeleteComment}
                onClose={handleCloseDialog}
                onSave={onDelete}
                title="Xác nhận xóa"

                type="delete"
                size="sm"
            >
                Bạn có muốn xóa không?
            </CustomDialog>

        </JobContentWrapper>
    );

};

const ReasonMenu = memo(({ reason, handleOpenMenu }) => {
    const onClick = useCallback((e) => {
        handleOpenMenu(e, reason);
    }, [handleOpenMenu, reason]);

    return (
        <SkyIconButton size="small" onClick={onClick}>
            <JobCommentMenuIcon />
        </SkyIconButton>
    );
});

ReasonMenu.displayName = "ReasonMenu";

export default memo(SolutionToFix);