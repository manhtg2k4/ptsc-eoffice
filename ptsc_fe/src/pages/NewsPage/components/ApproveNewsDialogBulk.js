// File: src/pages/NewsPage/components/ApproveNewsDialogBulk.js
import React, { useState, useCallback } from "react";
import {
  Typography,
  Box,
  styled,
  Alert,
} from "@mui/material";
import axiosInstance from "@utils/axiosInstance";
import { API_NEWS_MANAGEMENT } from "@EnvironmentFile/constants/urlConfig";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import withSharedComponents from "@components/WrapperComponent";

// ── Styled Components ──
const TitleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

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

/**
 * ApproveNewsDialogBulk Component
 * 
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} onSuccess - Callback khi duyệt thành công
 * @param {Array} newsIds - Danh sách ID của tin tức cần duyệt
 * @param {function} toast - Hàm hiển thị thông báo
 */
function ApproveNewsDialogBulk({
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

  // Reset state khi dialog đóng/mở
  React.useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  const handleApprove = useCallback(async () => {
    if (!newsIds || newsIds.length === 0) {
      setError("Không tìm thấy danh sách tin tức cần duyệt");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Lấy thông tin từ dataDetail để bóc tách IDs và workItemIds
      const itemsToProcess = dataDetail && dataDetail.length > 0 ? dataDetail : [];
      
      // Bóc tách ID bản ghi (news IDs)
      const ids = itemsToProcess.map(item => 
        item?.documentId || item?.document?.documentId || item?.document?.id || item?.id || item?._id
      ).filter(Boolean);

      // Bóc tách Work Item ID
      const workItemIds = itemsToProcess.map(item => 
        item?.workItem?.id || 
        item?.currentUserWorkItem?.id || 
        item?.perItems?.[0]?.workItem?.id || 
        item?.workItemId ||
        (item?.documentId && item?.id ? item?.id : null) // Nếu có cả documentId và id, thì id thường là workItemId
      ).filter(Boolean);
      
      if (ids.length === 0) {
        setError("Không tìm thấy danh sách tin tức cần duyệt");
        return;
      }

      if (workItemIds.length === 0) {
        setError("Không tìm thấy danh sách work item để xử lý");
        return;
      }

      // Lấy thông tin từ bản ghi đầu tiên để làm mẫu cho roleCode và processKey
      const firstItem = itemsToProcess[0];
      const workItemInfo = firstItem?.workItem || firstItem?.currentUserWorkItem || firstItem?.perItems?.[0]?.workItem;
      const payload = {
        ids: ids,
        workItemIds: workItemIds,
        roleCode: workItemInfo?.role || firstItem?.roleCode,
        processKey: workItemInfo?.bpmnVersion || firstItem?.processKey,
        note: "Phê duyệt và xuất bản ngay",
        publishImmediately: true,
      };

      await axiosInstance.post(
        `${API_NEWS_MANAGEMENT}/approve/bulk`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      toast?.(`Đã duyệt ${ids.length} tin tức thành công!`, "success");
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
  }, [newsIds, dataDetail, toast, onSuccess, onClose]);

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
            Xác nhận duyệt tin hàng loạt
          </TitleContainer>
        }
        isLoading={isSubmitting}
        titleButton={isSubmitting ? "Đang xử lý..." : "Xác nhận duyệt"}
        size="sm"
      >
        {/* Info Box */}
        <InfoBox>
          <InfoDescription>
            Bạn có chắc chắn muốn duyệt <b>{newsIds?.length || dataDetail?.length || 0}</b> tin tức đã chọn? Các tin tức sẽ được xuất bản ngay sau khi duyệt.
          </InfoDescription>
        </InfoBox>

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

export default withSharedComponents(ApproveNewsDialogBulk);
