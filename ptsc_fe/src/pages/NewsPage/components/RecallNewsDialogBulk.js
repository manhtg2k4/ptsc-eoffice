// File: src/pages/NewsPage/components/RecallNewsDialogBulk.js
import React, { useState, useCallback } from "react";
import axiosInstance from "@utils/axiosInstance";
import { API_NEWS_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";

import {
  Typography,
  Box,
  styled,
  Alert,
  TextField,
} from "@mui/material";

// ── Styled Components ──
const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const InfoBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1.5),
  padding: theme.spacing(0, 0, 2.5, 0),
}));

const InfoDescription = styled(Typography)(({ theme }) => ({
  fontSize: "14px",
  color: theme.palette.text.primary,
  lineHeight: 1.6,
}));

const ModalTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    fontSize: "14px",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    borderRadius: "4px",
    "& fieldset": {
      borderColor: theme.palette.divider,
    },
    "&:hover fieldset": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
    },
    alignItems: "flex-start",
  },
}));

const StyledAlert = styled(Alert)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

/**
 * RecallNewsDialogBulk Component
 * 
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi thu hồi thành công
 * @param {Array} newsIds - Danh sách ID của tin tức cần thu hồi
 * @param {Array} dataDetail - Danh sách dữ liệu chi tiết
 * @param {function} toast - Hàm hiển thị thông báo
 */
function RecallNewsDialogBulk({
  open,
  onClose,
  onSuccess,
  newsIds = [],
  dataDetail = [],
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

  const handleRecall = useCallback(async () => {
    if (!reason.trim()) {
      setValidationError("Vui lòng nhập lý do thu hồi tin");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setValidationError("");

    try {
      const itemsToProcess = dataDetail && dataDetail.length > 0 ? dataDetail : [];
      
      const ids = itemsToProcess.map(item => 
        item?.documentId || item?.document?.documentId || item?.document?.id || item?.id || item?._id
      ).filter(Boolean);

      const workItemIds = itemsToProcess.map(item => 
        item?.workItem?.id || 
        item?.currentUserWorkItem?.id || 
        item?.perItems?.[0]?.workItem?.id || 
        item?.workItemId ||
        (item?.documentId && item?.id ? item?.id : null)
      ).filter(Boolean);
      
      if (ids.length === 0) {
        setError("Không tìm thấy danh sách tin tức cần thu hồi");
        return;
      }

      if (workItemIds.length === 0) {
        setError("Không tìm thấy danh sách work item để xử lý");
        return;
      }

      const firstItem = itemsToProcess[0];
      const workItemInfo = firstItem?.workItem || firstItem?.currentUserWorkItem || firstItem?.perItems?.[0]?.workItem;

      const payload = {
        ids: ids,
        workItemIds: workItemIds,
        roleCode: workItemInfo?.role || firstItem?.roleCode,
        processKey: workItemInfo?.bpmnVersion || firstItem?.processKey,
        reason: reason.trim(),
        note: "Thu hồi tin tức hàng loạt",
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/recall/bulk`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast?.(`Đã thu hồi ${ids.length} tin tức thành công!`, "success");
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
  }, [dataDetail, reason, toast, onSuccess, onClose]);

  const handleCancel = useCallback(() => {
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
        onClose={handleCancel}
        onSave={handleRecall}
        title={
          <TitleContainer>
            Xác nhận thu hồi tin hàng loạt
          </TitleContainer>
        }
        isLoading={isSubmitting}
        titleButton={isSubmitting ? "Đang xử lý..." : "Xác nhận thu hồi"}
        colorType="error"
        size="sm"
      >
        <InfoBox>
          <InfoDescription>
            Bạn có chắc chắn muốn thu hồi <b>{newsIds?.length || dataDetail?.length || 0}</b> tin tức đã chọn?
          </InfoDescription>
        </InfoBox>

        <ModalTextField
          fullWidth
          rows={4}
          placeholder="Nhập lý do thu hồi tin..."
          value={reason}
          onChange={handleReasonChange}
          variant="outlined"
          disabled={isSubmitting}
          error={!!validationError}
          helperText={validationError}
        />

        {error && (
          <StyledAlert severity="error">
            {error}
          </StyledAlert>
        )}
      </CustomDialog>
  );
}

export default withSharedComponents(RecallNewsDialogBulk);
