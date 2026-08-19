import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import withSharedComponents from "@components/WrapperComponent";
import { useToast } from "@components/common/ToastProvider";

const PopupAddIndex = ({
  open,
  onSave,
  onClose,
  sharedComponents,
  initialValue = "",
  title = "Thêm danh mục tài liệu",
  existingNames = [],
}) => {
  const { Dialog, InputComponents } = sharedComponents;
  const [value, setValue] = useState(initialValue);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
    }
  }, [open, initialValue]);

  const handleSave = () => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      toast("Vui lòng nhập tên danh mục", "error");
      return;
    }

    // Kiểm tra trùng tên (không tính chính nó nếu đang sửa)
    const isDuplicate = existingNames.some(
      (name) => name?.toLowerCase() === trimmedValue.toLowerCase() && name?.toLowerCase() !== initialValue?.trim()?.toLowerCase()
    );

    if (isDuplicate) {
      toast("Tên danh mục đã tồn tại", "error");
      return;
    }

    if (onSave) {
      onSave(trimmedValue);
    }
    onClose?.();
  };

  const handleInputChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <Dialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleSave}
      titleButton="Đồng ý"
      size="sm"
    >
      <Grid container>
        <Grid item xs={12} md={12}>
          <InputComponents
            label="Tên danh mục tài liệu"
            placeholder="Nhập tên danh mục tài liệu..."
            required
            value={value}
            onChange={handleInputChange}
            fullWidth
          />
        </Grid>
      </Grid>
    </Dialog>
  );
};

PopupAddIndex.propTypes = {
  open: PropTypes.bool,
  onSave: PropTypes.func,
  onClose: PropTypes.func,
  initialValue: PropTypes.string,
  title: PropTypes.string,
};

export default withSharedComponents(PopupAddIndex);
