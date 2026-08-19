// File: src/components/ApproveNewsDialog/index.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Typography,
  Box,
  styled,
  Alert,
  Grid,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import axiosInstance from "@utils/axiosInstance";
import { API_NEWS_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";
import { Controller, useForm } from "react-hook-form";
import { CheckboxGridItem } from "./NewsForm.styles";

// ── Styled Components ──
const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}))

const InfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: theme.spacing(2),
  padding: theme.spacing(0, 0, 2.5, 0),
  borderRadius: theme.spacing(1),
}));

const InfoDescription = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.primary,
  lineHeight: 1.6,
}));

const ErrorAlertBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(0),
}));

const FieldContainer = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(2.5),
}));

/**
 * ApproveNewsDialog Component
 * 
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi duyệt thành công
 * @param {string} newsId - ID của tin tức cần duyệt
 * @param {function} toast - Hàm hiển thị thông báo
 */
function ApproveNewsDialog({
  open,
  onClose,
  onSuccess,
  newsId,
  sharedComponents,
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [newsDetail, setNewsDetail] = useState(null);

  const { control, reset, getValues } = useForm({
    defaultValues: {
      isComment: true,
      isImportant: "false",
    },
  });

  // Tải chi tiết tin tức khi mở Dialog
  useEffect(() => {
    if (open && newsId) {
      const fetchDetail = async () => {
        setError(null);
        try {
          const detailResponse = await axiosInstance.get(
            `${API_NEWS_MANAGEMENT}/${newsId}`,
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          const detail =
            detailResponse.data?.document ||
            detailResponse.data?.data ||
            detailResponse.data ||
            detailResponse;

          setNewsDetail(detail);
          reset({
            isComment: detail?.isComment !== false,
            isImportant: detail?.isImportant === true ? "true" : "false",
          });
        } catch (err) {
          setError("Không thể tải thông tin chi tiết tin tức.");
        }
      };
      fetchDetail();
    } else {
      setNewsDetail(null);
      setError(null);
      reset({
        isComment: true,
        isImportant: "false",
      });
    }
  }, [open, newsId, reset]);

  const handleSwitchChange = useCallback((field) => (e) => {
    field.onChange(e.target.checked);
  }, []);

  const handleImportantChange = useCallback(
    (field) => (e) => {
      field.onChange(e.target.checked ? "true" : "false");
    },
    []
  );

  const renderCommentSwitch = useCallback(
    ({ field }) => (
      <FormControlLabel
        control={
          <Checkbox
            checked={field.value}
            onChange={handleSwitchChange(field)}
            icon={<RadioButtonUncheckedIcon />}
            checkedIcon={<RadioButtonCheckedIcon />}
          />
        }
        label="Bình luận"
      />
    ),
    [handleSwitchChange]
  );

  const renderImportantRadio = useCallback(
    ({ field }) => (
      <FormControlLabel
        control={
          <Checkbox
            checked={field.value === "true"}
            onChange={handleImportantChange(field)}
            icon={<RadioButtonUncheckedIcon />}
            checkedIcon={<RadioButtonCheckedIcon />}
          />
        }
        label="Tin quan trọng"
      />
    ),
    [handleImportantChange]
  );

  const handleApprove = useCallback(async () => {
    if (!newsId) {
      setError("Không tìm thấy ID tin tức");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Gọi API cập nhật thông tin isComment và isImportant trước
      const formData = getValues();
      await axiosInstance.patch(`${API_NEWS_MANAGEMENT}/${newsId}`, {
        isComment: formData.isComment === true,
        isImportant: formData.isImportant === "true",
      }, {
        headers: { "Content-Type": "application/json" },
      });

      // Bước 1: Gọi API lấy chi tiết tin tức (hoặc dùng state newsDetail nếu có)
      let activeDetail = newsDetail;
      if (!activeDetail) {
        const detailResponse = await axiosInstance.get(
          `${API_NEWS_MANAGEMENT}/${newsId}`,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        activeDetail =
          detailResponse.data?.document ||
          detailResponse.data?.data ||
          detailResponse.data ||
          detailResponse;
      }

      // Bước 2: Lấy thông tin workItem
      const currentUserWorkItem = activeDetail?.currentUserWorkItem;
      if (!currentUserWorkItem || !currentUserWorkItem.id) {
        throw new Error("Không tìm thấy thông tin quy trình xử lý");
      }

      // Bước 3: Gọi API approve dựa trên quyền
      const flags = activeDetail?.actionFlags || activeDetail?.flags || {};

      if (flags.canPublished || flags.canApproveNews) {
        const payload = {
          workItemId: currentUserWorkItem.id,
          roleCode: currentUserWorkItem.role,
          processKey: currentUserWorkItem.bpmnVersion,
          note: "Phê duyệt và xuất bản ngay",
        };

        await axiosInstance.post(
          `${API_NEWS_MANAGEMENT}/${newsId}/approve`,
          payload,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } else if (flags.canPublishDirectly) {
        const payload = {
          workItemId: currentUserWorkItem.id,
        };

        await axiosInstance.post(
          `${API_NEWS_MANAGEMENT}/${newsId}/publish-directly`,
          payload,
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        throw new Error("Bạn không có quyền duyệt hoặc xuất bản tin tức này.");
      }

      toast?.("Duyệt tin tức thành công!", "success");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      let errorMessage = "Đã có lỗi xảy ra!";
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errorMessage = err.response.data.errors.map((e) => e.message).join("; ");
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast?.(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [newsId, toast, onSuccess, onClose, getValues, newsDetail]);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
    }
  }, [isSubmitting, onClose]);

  return (
    <>
      <CustomDialog
        open={open}
        onClose={handleCancel}
        onSave={handleApprove}
        title={
          <TitleContainer>
            Xác nhận duyệt tin
          </TitleContainer>
        }
        isLoading={isSubmitting}
        titleButton={isSubmitting ? "Đang xử lý..." : "Xác nhận duyệt"}
        size="sm"
      >
        {/* Info Box */}
        <InfoBox>
          <InfoDescription>
            Vui lòng xác định tin có được phép bình luận và mức độ quan trọng trước khi duyệt tin.
          </InfoDescription>
        </InfoBox>

        <FieldContainer container spacing={2}>
          <CheckboxGridItem item xs={6} sm={6}>
            <Controller
              name="isComment"
              control={control}
              render={renderCommentSwitch}
            />
          </CheckboxGridItem>
          <CheckboxGridItem item xs={6} sm={6}>
            <Controller
              name="isImportant"
              control={control}
              render={renderImportantRadio}
            />
          </CheckboxGridItem>
        </FieldContainer>

        {/* Error Alert */}
        {error && (
          <ErrorAlertBox>
            <Alert severity="error">
              {error}
            </Alert>
          </ErrorAlertBox>
        )}
      </CustomDialog>
    </>
  );
}

export default withSharedComponents(ApproveNewsDialog);