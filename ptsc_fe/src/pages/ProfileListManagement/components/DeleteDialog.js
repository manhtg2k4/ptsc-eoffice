import React from "react";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { SkyTypography } from "@styles/SkyStyles";
import PropTypes from "prop-types";

const DeleteDialog = ({ open, onClose, onConfirm, selectedIds }) => (
  <CustomDialog
    open={open}
    onClose={onClose}
    onSave={onConfirm}
    title="Xác nhận xóa"
    type="delete"
  >
    <SkyTypography>
      Bạn có chắc chắn muốn xóa {selectedIds?.length > 1 ? `${selectedIds.length} bản ghi` : "bản ghi này"} không?
    </SkyTypography>
  </CustomDialog>
);

DeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  selectedIds: PropTypes.array.isRequired,
};

export default DeleteDialog;