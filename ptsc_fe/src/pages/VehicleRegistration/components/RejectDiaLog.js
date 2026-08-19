import React, { useState, useCallback, useEffect } from "react";
import axiosInstance from "@utils/axiosInstance";
import { API_REJECT_REQUEST } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox } from "@styles/SkyStyles";


/**
 * RejectDiaLog Component
 *
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} setReloadData - Callback khi hủy thành công
 * @param {string} meetingId - ID của lịch họp cần hủy
 * @param {string} actionCode - Mã hành động từ API (ví dụ: HUY_LICH_LAP)
 * @param {function} onSuccess - Callback khi đóng dialog
 */
function RejectDiaLog({
  open,
  onClose,
  setReloadData,
  id,
  workItemId,
  actionCode,
  workItem, // Bổ sung để nhận cả object workItem từ danh sách
  availableActions = [], // Bổ sung để tự lấy actionCode nếu thiếu
  onSuccess,
  sharedComponents,
}) {
  const { toast, InputComponents } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setValidationError("");
    }
  }, [open]);

  const handleConfirmReject = useCallback(async () => {
    if (!reason.trim()) {
      setValidationError("Vui lòng nhập lý do từ chối");
      return;
    }

    if (!id) {
      toast("Không tìm thấy ID yêu cầu", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Ưu tiên lấy từ availableActions trong row nếu actionCode prop không có
      const finalActionCode = 
        actionCode || 
        availableActions.find(a => a.code?.startsWith("TU_CHOI"))?.code || 
        "";

      const payload = {
        actionCode: finalActionCode,
        workItem: workItem || workItemId, // Gửi cả object workItem nếu có (từ danh sách)
        noteDetail: reason.trim()
      };
      await axiosInstance.post(`${API_REJECT_REQUEST}/${id}`, payload);
      toast("Đã từ chối yêu cầu đăng ký xe thành công", "success");
      setReloadData?.(new Date());
      onClose?.();
      onSuccess?.();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [reason, id, workItemId, workItem, actionCode, availableActions, toast, setReloadData, onClose, onSuccess]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
      onSuccess?.();
    }
  }, [isSubmitting, onClose, onSuccess]);

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
      onSave={handleConfirmReject}
      title="Lý do từ chối"
      isLoading={isSubmitting}
      titleButton="Xác nhận"
      size="sm"
    >
      <SkyBox mt={1}>
        <InputComponents
          fullWidth
          multiline
          rows={4}
          placeholder="Nhập lý do từ chối..."
          value={reason}
          onChange={handleReasonChange}
          variant="outlined"
          disabled={isSubmitting}
          error={!!validationError}
          helperText={validationError}
        />
      </SkyBox>
    </CustomDialog>
  );
}

export default withSharedComponents(RejectDiaLog);
