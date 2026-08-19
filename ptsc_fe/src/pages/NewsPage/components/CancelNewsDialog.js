// File: src/components/CancelNewsDialog/index.jsx
import React, { useState, useCallback } from "react";
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
  ErrorText,
} from "./styles";

const ErrorAlertBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

/**
 * CancelNewsDialog Component
 * 
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi hủy tin thành công
 * @param {string} newsId - ID của tin tức cần hủy
 * @param {function} toast - Hàm hiển thị thông báo
 */
function CancelNewsDialog({
  open,
  onClose,
  onSuccess,
  newsId,
  sharedComponents,
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset state khi dialog đóng/mở
  React.useEffect(() => {
    if (open) {
      setError(null);
      setReason("");
      setValidationError("");
    }
  }, [open]);

  const handleCancelNews = useCallback(async () => {
    // Validation
    if (!reason.trim()) {
      setValidationError("Vui lòng nhập lý do hủy tin");
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
      // Bước 1: Gọi API lấy chi tiết tin tức
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

      // Bước 3: Gọi API cancel
      const payload = {
        workItemId: currentUserWorkItem.id,
        roleCode: currentUserWorkItem.role,
        reason: reason.trim(),
        note: "Hủy do thay đổi chính sách",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/${newsId}/cancel`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast?.("Hủy tin tức thành công!", "success");
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
  }, [newsId, reason, toast, onSuccess, onClose]);

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
    <>
      <CustomDialog
        open={open}
        onClose={handleClose}
        onSave={handleCancelNews}
        title="Lý do hủy tin"
        isLoading={isSubmitting}
        titleButton="Hủy tin"
        size="sm"
      >
        {/* Reason Input */}
        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Lý do hủy tin..."
          value={reason}
          onChange={handleReasonChange}
          variant="outlined"
          disabled={isSubmitting}
          error={!!validationError}
        />
        {validationError && <ErrorText>{validationError}</ErrorText>}

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

export default withSharedComponents(CancelNewsDialog);