import React from "react";
import { Typography } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";

const DeleteTemplateDialog = ({ open, onClose, onSave, selectedIds }) => {
  return (
    <CustomDialog
      title="Xác nhận xóa"
      open={open}
      onClose={onClose}
      onSave={onSave}
      type="delete"
    >
      <Typography>
        {selectedIds?.length > 1
          ? `Bạn có chắc chắn muốn xóa ${selectedIds?.length} bản ghi không?`
          : "Bạn có chắc chắn muốn xóa bản ghi này không?"}
      </Typography>
    </CustomDialog>
  );
};
DeleteTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string), // Hoặc PropTypes.number nếu ID là số
};

DeleteTemplateDialog.defaultProps = {
  selectedIds: [], // Giá trị mặc định nếu không có
};

export default DeleteTemplateDialog;
