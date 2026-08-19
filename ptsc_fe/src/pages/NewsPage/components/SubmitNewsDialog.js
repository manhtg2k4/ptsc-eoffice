import React, { useState, useCallback } from "react";
import { Typography, Alert } from "@mui/material";
import axiosInstance from "@utils/axiosInstance";
import { API_NEWS_MANAGEMENT, APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";

const API_NEWS_SUBMIT = `${APP_BASE}/api/news/submit`;

/**
 * SubmitNewsDialog Component
 * 
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi trình duyệt thành công
 * @param {string} newsId - ID của tin tức cần trình duyệt
 * @param {function} toast - Hàm hiển thị thông báo
 * @param {function} onConfirm - Callback khi người dùng xác nhận (tùy chọn, nếu có sẽ bỏ qua logic internal)
 */
function SubmitNewsDialog({
  open,
  onClose,
  onSuccess,
  newsId,
  onConfirm,
  sharedComponents,
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state khi dialog đóng/mở
  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    // Nếu có onConfirm từ bên ngoài, gọi nó và đóng dialog
    if (onConfirm) {
      onConfirm();
      onClose?.();
      return;
    }

    if (!newsId) {
      setError("Không tìm thấy ID tin tức");
      return;
    }

    setIsSubmitting(true);
    setError(null);

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
      const currentWorkItem = newsDetail?.currentUserWorkItem;
      if (!currentWorkItem || !currentWorkItem.id) {
        throw new Error("Không tìm thấy thông tin quy trình xử lý");
      }

      // Bước 3: Kiểm tra quyền trình duyệt
      const availableActions = newsDetail?.availableActions || [];
      const submitAction = availableActions.find(
        (action) => action.code === "TRINH_DUYET"
      );

      if (!submitAction || !submitAction.canExecute) {
        throw new Error("Không có quyền trình duyệt tin tức này");
      }

      // Bước 4: Lấy roleCode và processKey
      const roleCode = "NGUOI_PHE_DUYET";
      const processKey = currentWorkItem.bpmnVersion;

      if (!roleCode || !processKey) {
        throw new Error("Không tìm thấy thông tin roleCode hoặc processKey");
      }

      // Bước 5: Gọi API submit
      const submitPayload = {
        ids: [newsId],
        roleCode: roleCode,
        processKey: processKey,
        note: "Đề nghị phê duyệt tin tức này",
      };

      await axiosInstance.post(
        `${API_NEWS_SUBMIT}/${currentWorkItem.id}`,
        submitPayload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // Thành công
      toast?.("Trình duyệt tin tức thành công!", "success");
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
  }, [newsId, toast, onSuccess, onClose, onConfirm]);

  const handleCancel = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
    }
  }, [isSubmitting, onClose]);

  return (
    <CustomDialog
      open={open}
      title="Trình duyệt tin tức"
      onClose={handleCancel}
      onSave={handleSubmit}
      titleButton="Đồng ý"
      size="sm"
      isLoading={isSubmitting}
    >
      <Typography>
        Bạn có chắc chắn muốn gửi tin tức này đến người phê duyệt không?
      </Typography>
      
      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}
    </CustomDialog>
  );
}

export default withSharedComponents(SubmitNewsDialog);
