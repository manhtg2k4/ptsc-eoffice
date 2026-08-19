import React, { useState, useCallback, useEffect } from "react";
import axiosInstance from "@utils/axiosInstance";
import { API_ADD_MEETING_SCHEDULE } from "@EnvironmentFile/constants/urlConfig";
import withSharedComponents from "@components/WrapperComponent";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyBox, SkyFormControlLabel, SkyRadio, SkyRadioGroup, SkyTypography } from "@styles/SkyStyles";
import { styled } from "@mui/material/styles";

const ConfirmScopeTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const ConfirmScopeRadio = styled(SkyRadio)(({ theme }) => ({
  color: theme.palette.primary.main,
  '&.Mui-checked': {
    color: theme.palette.primary.main,
  },
}));

const ConfirmScopeLabel = styled(SkyTypography, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'dimmed',
})(({ theme, active, dimmed }) => ({
  fontWeight: active ? 600 : 400,
  color: active ? theme.palette.primary.main : (dimmed ? theme.palette.text.secondary : theme.palette.text.primary),
  transition: 'all 0.2s ease',
}));

/**
 * CancelMeetingDialog Component
 *
 * @param {boolean} open - Trạng thái mở/đóng dialog
 * @param {function} onClose - Callback khi đóng dialog
 * @param {function} setReloadData - Callback khi hủy thành công
 * @param {string} meetingId - ID của lịch họp cần hủy
 * @param {string} actionCode - Mã hành động từ API (ví dụ: HUY_LICH_LAP)
 * @param {function} onSuccess - Callback khi đóng dialog
 */
function CancelMeetingDialog({
  open,
  onClose,
  setReloadData,
  meetingId,
  id, // Builder pass id
  sharedComponents,
  actionCode,
  onSuccess
}) {
  const { toast, InputComponents } = sharedComponents;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");
  const [cancelRecurrenceType, setCancelRecurrenceType] = useState("ONLY_THIS");

  const realMeetingId = meetingId || id;
  const isRecurrence = actionCode === "HUY_LICH_LAP";

  useEffect(() => {
    if (open) {
      setReason("");
      setValidationError("");
      setCancelRecurrenceType("ONLY_THIS");
    }
  }, [open]);

  const handleCancelRecurrenceTypeChange = (event) => {
    setCancelRecurrenceType(event.target.value);
  };

  const handleCancelMeeting = useCallback(async () => {
    if (!reason.trim()) {
      setValidationError("Vui lòng nhập lý do hủy lịch họp");
      return;
    }

    if (!realMeetingId) {
      toast?.("Không tìm thấy ID lịch họp", "error");
      return;
    }

    setIsSubmitting(true);
    setValidationError("");

    try {
      if (isRecurrence) {
        const payload = {
          note: reason.trim(),
          isToday: cancelRecurrenceType === "ONLY_THIS",
          isNextDay: cancelRecurrenceType === "ALL_FOLLOWING"
        };
        await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${realMeetingId}/cancel-recurring`, payload);
      } else {
        const payload = {
          note: reason.trim()
        };
        await axiosInstance.post(`${API_ADD_MEETING_SCHEDULE}/${realMeetingId}/cancel`, payload);
      }

      toast?.("Hủy lịch họp thành công!", "success");
      setReloadData?.(new Date());
      onClose?.();
      onSuccess?.();
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
  }, [realMeetingId, reason, toast, setReloadData, onClose, onSuccess, isRecurrence, cancelRecurrenceType]);

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
      onSave={handleCancelMeeting}
      title="Xác nhận hủy lịch họp"
      isLoading={isSubmitting}
      titleButton="Xác nhận"
      size="sm"
    >
      <SkyBox p={isRecurrence ? 2 : 1}>
        {isRecurrence && (
          <>
            <ConfirmScopeTitle variant="body1">
              Lịch họp này thuộc một chuỗi lịch lặp. Vui lòng chọn phạm vi hủy.
            </ConfirmScopeTitle>
            <SkyRadioGroup
              value={cancelRecurrenceType}
              onChange={handleCancelRecurrenceTypeChange}
            >
              <SkyFormControlLabel 
                value="ONLY_THIS" 
                control={<ConfirmScopeRadio />} 
                label={
                  <ConfirmScopeLabel 
                    variant="body1" 
                    active={cancelRecurrenceType === 'ONLY_THIS'}
                  >
                    Chỉ hủy phiên họp này
                  </ConfirmScopeLabel>
                } 
              />
              <SkyFormControlLabel 
                value="ALL_FOLLOWING" 
                control={<ConfirmScopeRadio />} 
                label={
                  <ConfirmScopeLabel 
                    variant="body1" 
                    active={cancelRecurrenceType === 'ALL_FOLLOWING'}
                    dimmed={cancelRecurrenceType !== 'ALL_FOLLOWING'}
                  >
                    Hủy phiên này và các phiên sau
                  </ConfirmScopeLabel>
                } 
              />
            </SkyRadioGroup>
          </>
        )}
        <SkyBox mt={isRecurrence ? 2 : 1}>
          <InputComponents
            fullWidth
            multiline
            rows={4}
            placeholder="Nhập lý do hủy lịch họp..."
            value={reason}
            onChange={handleReasonChange}
            variant="outlined"
            disabled={isSubmitting}
            error={!!validationError}
            helperText={validationError}
          />
        </SkyBox>
      </SkyBox>
    </CustomDialog>
  );
}

export default withSharedComponents(CancelMeetingDialog);
