import React from "react";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Typography } from "@mui/material";
import PropTypes from "prop-types";

const DeleteDialog = ({ open, onClose, onSave, selectedIds }) => (
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
DeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  selectedIds: PropTypes.array,
};

DeleteDialog.defaultProps = {
  selectedIds: [],
};

export default DeleteDialog;
