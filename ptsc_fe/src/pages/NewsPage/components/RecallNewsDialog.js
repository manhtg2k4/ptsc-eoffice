// File: src/components/RecallNewsDialog/index.jsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  Box,
  styled,
} from "@mui/material";
import axiosInstance from "@utils/axiosInstance";
import { API_NEWS_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import {
  ModalTextField,
} from "./styles";

const ErrorAlertBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

/**
 * RecallNewsDialog Component
 *
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi thu hồi tin thành công
 * @param {string} newsId - ID của tin tức cần thu hồi
 * @param {function} toast - Hàm hiển thị thông báo
 * @param {string} [initialReason=""] - Lý do mặc định (nếu có sẵn từ trước)
 */
function RecallNewsDialog({
  open,
  onClose,
  onSuccess,
  newsId,
  sharedComponents,
  initialReason = "",
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState(initialReason);
  const [validationError, setValidationError] = useState("");

  // Reset state khi dialog mở
  useEffect(() => {
    if (open) {
      setError(null);
      setReason(initialReason);
      setValidationError("");
    }
  }, [open, initialReason]);

  const handleRecallNews = useCallback(async () => {
    // Validation
    if (!reason.trim()) {
      setValidationError("Vui lòng nhập lý do thu hồi tin");
      return;
    }

    if (!newsId) {
      setError("Không tìm thấy ID tin tức");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationError("");

    try {
      // Bước 1: Lấy chi tiết tin tức
      const detailResponse = await axiosInstance.get(
        `${API_NEWS_MANAGEMENT}/${newsId}`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const newsDetail =
        detailResponse.data?.document ||
        detailResponse.data?.data ||
        detailResponse.data ||
        detailResponse;

      // Bước 2: Lấy thông tin workItem
      const currentUserWorkItem = newsDetail?.currentUserWorkItem;
      if (!currentUserWorkItem || !currentUserWorkItem.id) {
        throw new Error("Không tìm thấy thông tin quy trình xử lý");
      }

      // Bước 3: Gọi API thu hồi
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        reason: reason.trim(),
        note: "Thu hồi để chỉnh sửa thông tin",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/recall`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast?.("Thu hồi tin tức thành công!", "success");
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
  }, [newsId, reason, toast, onSuccess, onClose, initialReason]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
    }
  }, [isSubmitting, onClose]);

  const handleReasonChange = useCallback((e) => {
    setReason(e.target.value);
    if (validationError) {
      setValidationError("");
    }
  }, [validationError]);

  return (
      <CustomDialog
        open={open}
        onClose={handleClose}
        onSave={handleRecallNews}
        title="Lý do thu hồi tin"
        isLoading={isSubmitting}
        titleButton="Thu hồi"
        size="sm"
      >
        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Nhập lý do thu hồi tin..."
          value={reason ?? ""}
          onChange={handleReasonChange}
          variant="outlined"
          disabled={isSubmitting}
          error={!!validationError}
          helperText={validationError}
        />

        {error && (
          <ErrorAlertBox>
            <Alert severity="error">
              {error}
            </Alert>
          </ErrorAlertBox>
        )}
      </CustomDialog>
  );
}

export default withSharedComponents(RecallNewsDialog);