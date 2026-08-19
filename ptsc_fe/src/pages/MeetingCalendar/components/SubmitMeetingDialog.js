import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "@utils/axiosInstance";
import { API_WORK_ITEMS } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

/**
 * SubmitMeetingDialog Component (Trình duyệt lịch họp)
 *
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} setReloadData - Callback khi trình thành công
 * @param {object} dataDetail - Dữ liệu dòng chứa meetingId và workItem
 */
function SubmitMeetingDialog({
  open,
  onClose,
  setReloadData,
  dataDetail,
  id, // Builder pass id
  sharedComponents,
}) {
  const { toast } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const meetingId = id || dataDetail?.id || dataDetail?._id || dataDetail?.meetingId;
  const workItemId = dataDetail?.workItem?.id || dataDetail?.workItemId;
  const actionCode = dataDetail?.openDialog?.actionCode || dataDetail?.actionCode || dataDetail?.availableActions?.[0]?.code;

  // Lấy userId từ redux
  const { dataUser: authUser } = useSelector((state) => state.auth || {});
  const currentUserId = authUser?.user?._id || authUser?.user?.id;

  useEffect(() => {
    if (open) {
      // Logic when opening dialog
    }
  }, [open]);

  const handleSubmitMeeting = useCallback(async () => {
    if (!meetingId || !workItemId) {
      toast?.("Thiếu thông tin lịch họp hoặc quy trình xử lý", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        meetingId: meetingId,
        userId: currentUserId,
        actionCode: actionCode,
      };

      await axiosInstance.post(`${API_WORK_ITEMS}/${meetingId}/${workItemId}/propose`, payload);

      toast?.("Trình duyệt lịch họp thành công!", "success");
      setReloadData?.(new Date());
      onClose?.();
    } catch (error) {
      let errorMessage = "Đã có lỗi xảy ra!";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage =  error.message;
      }

      toast?.(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [meetingId, workItemId, currentUserId, actionCode, toast, setReloadData, onClose]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose?.();
    }
  }, [isSubmitting, onClose]);

  return (
    <CustomDialog
      open={open}
      onClose={handleClose}
      onSave={handleSubmitMeeting}
      title="Xác nhận trình duyệt lịch họp"
      isLoading={isSubmitting}
      titleButton="Trình duyệt"
      size="sm"
    >
      <SkyBox mt={1}>
        <SkyTypography mb={1}>
          Bạn có chắc chắn muốn <b>trình duyệt</b> lịch họp này không?
        </SkyTypography>
        {/* <InputComponents
          fullWidth
          multiline
          rows={3}
          placeholder="Nhập ghi chú (nếu có)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          variant="outlined"
          disabled={isSubmitting}
        /> */}
      </SkyBox>


    </CustomDialog>
  );
}

export default withSharedComponents(SubmitMeetingDialog);
