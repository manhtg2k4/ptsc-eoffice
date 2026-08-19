import React, { useState, useEffect } from "react";
import { Grid, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";
import axiosInstance from "@utils/axiosInstance";
import { API_CONFIRM_REJECT_INCOMING } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";
import CustomInput from "@components/CustomInput/CustomInput";

const CenteredTypography = styled(Typography)({
  textAlign: "center",
});

const RefuseIncomingTextDialog = ({ open, onClose, onSuccess, docIds, documentData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!docIds) {
      toast("Không tìm thấy thông tin văn bản để từ chối.", "error");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        documentIds: [docIds],
        note: reason,
      };
      await axiosInstance.patch(API_CONFIRM_REJECT_INCOMING, payload);
      toast("Từ chối văn bản thành công!", "success");
      onSuccess();
    } catch (error) {
      toast(
        error.response?.data?.message || "Từ chối văn bản thất bại!",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };
const handleChangeNote = (e) => {
  setReason(e.target.value);
  if (e.target.value.trim()) {
    setError(null);
  }
};

  return (
    <CustomDialog
      title="THÔNG BÁO"
      open={open}
      onClose={handleClose}
      onSave={handleSave}
      titleButton="Đồng ý"
      cancelButtonText="Hủy"
      type="delete"
      isLoading={isLoading}
      titleAlign="center"
      size="sm"
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <CenteredTypography>
            Bạn có đồng ý từ chối văn bản {documentData?.toBook || docIds} không?
          </CenteredTypography>
        </Grid>
        <Grid item xs={12}>
          <CustomInput
            label="Lý do từ chối"
            placeholder="Nhập lý do..."
            multiline
            rows={3}
            value={reason}
            onChange={handleChangeNote}
            fullWidth
            error={!!error}
            helperText={error}
            required
          />
        </Grid>
      </Grid>
    </CustomDialog>
  );
};
RefuseIncomingTextDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  docIds: PropTypes.string,
  documentData: PropTypes.object,
};

RefuseIncomingTextDialog.defaultProps = {
  docIds: null,
  documentData: null,
};

export default RefuseIncomingTextDialog;
