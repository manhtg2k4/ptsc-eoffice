import React, { useState } from "react";
import { Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";
import axiosInstance from "@utils/axiosInstance";
import { API_CONFIRM_RECALL_INCOMING } from "@EnvironmentFile/constants/urlConfig";
import { useToast } from "@components/common/ToastProvider";

const CenteredTypography = styled(Typography)({
  textAlign: "center",
});

const RecallIncomingTextDialog = ({ open, onClose, onSuccess, docIds, documentData, recallType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

   const handleSave = async () => {
    if (!docIds) {
      toast("Không tìm thấy thông tin văn bản để thu hồi.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        docIds: docIds,
			};
      if (recallType && recallType !== "recallIncomingDoc") {
        payload.recallType = recallType;
      }
			const isAuthority = documentData?.isAuthority;
			const params = isAuthority ? { isAuthority } : {};
      await axiosInstance.post(API_CONFIRM_RECALL_INCOMING, payload, {params});
      toast("Thu hồi văn bản thành công!", "success");
      onSuccess();
  
    } catch (error) {
      toast(error.response?.data?.message || "Thu hồi văn bản thất bại!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };


  return (
    <CustomDialog
      title="THÔNG BÁO"
      open={open}
      onClose={handleClose}
      onSave={handleSave}
      titleButton="Đồng ý"
      cancelButtonText="Từ chối"
      type="recallIncomingDoc"
      isLoading={isLoading}
      titleAlign="center"
      size="sm"
    >
      <CenteredTypography>
        Bạn có đồng ý thu hồi văn bản {documentData?.document?.toBook || documentData?.toBook || docIds} không?
      </CenteredTypography>
    </CustomDialog>
  );
};
RecallIncomingTextDialog.propTypes = {
 open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  docIds: PropTypes.string,
  documentData: PropTypes.object,
  recallType: PropTypes.string,
};

RecallIncomingTextDialog.defaultProps = {
  docIds: null,
  documentData: null,
  recallType: null,
};

export default RecallIncomingTextDialog;
