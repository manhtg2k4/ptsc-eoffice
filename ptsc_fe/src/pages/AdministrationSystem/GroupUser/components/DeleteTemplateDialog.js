import React from "react";
import { Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";

const DeleteTemplateDialog = ({ open, onClose, onSave }) => {
  return (
    <CustomDialog
      title="Xác nhận xóa"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="delete"
    >
      <Typography>
        Bạn có chắc chắn muốn xóa bản ghi này không?
      </Typography>
    </CustomDialog>
  );
};
DeleteTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default DeleteTemplateDialog;
