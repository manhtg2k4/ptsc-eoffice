import React, { useState, useCallback } from "react";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

/**
 * RecallMeetingDialog Component
 *
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} setReloadData - Callback khi thu hồi thành công
 * @param {string} meetingId - ID của lịch họp cần thu hồi
 */
function RecallMeetingDialog({
  open,
  onClose,
  setReloadData,
  meetingId,
  id, // Builder pass id
  sharedComponents,
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const realMeetingId = meetingId || id;

  const handleRecallMeeting = useCallback(async () => {
    if (!realMeetingId) {
      toast?.("Không tìm thấy ID lịch họp", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${realMeetingId}/recall`);

      toast?.("Thu hồi lịch họp thành công!", "success");
      setReloadData?.(new Date());
      onClose?.();
    } catch (err) {
      let errorMessage = "Đã có lỗi xảy ra!";
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      toast?.(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [realMeetingId, toast, setReloadData, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
    }
  }, [isSubmitting, onClose]);

  return (
    <CustomDialog
      open={open}
      onClose={handleClose}
      onSave={handleRecallMeeting}
      title="Xác nhận thu hồi lịch họp"
      isLoading={isSubmitting}
      titleButton="Thu hồi"
      size="sm"
    >
      <SkyBox>
        <SkyTypography>
          Bạn có chắc chắn muốn <b>thu hồi</b> lịch họp này không?
        </SkyTypography>
      </SkyBox>

    
    </CustomDialog>
  );
}

export default withSharedComponents(RecallMeetingDialog);
