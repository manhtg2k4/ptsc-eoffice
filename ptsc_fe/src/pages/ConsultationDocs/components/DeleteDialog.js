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
  open: PropTypes.bool.isRequired, // `open` phải là boolean và bắt buộc
  onClose: PropTypes.func.isRequired, // `onClose` phải là function và bắt buộc
  onSave: PropTypes.func.isRequired, // `onSave` phải là function và bắt buộc
  selectedIds: PropTypes.arrayOf(PropTypes.string), // `selectedIds` là mảng chứa chuỗi
};

DeleteDialog.defaultProps = {
  selectedIds: [], // Nếu không truyền `selectedIds`, mặc định là mảng rỗng
};

DeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  selectedIds: PropTypes.any.isRequired,

};

export default DeleteDialog;
