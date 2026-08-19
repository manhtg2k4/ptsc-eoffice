import React from "react";
import {
  CancelButton,
  // CloseButton,
  DeleteButton,
  StyledDialog,
  StyledDialogActions,
  StyledDialogContent,
  StyledDialogTitle,
  SaveButton,
} from "@styles/CustomDialogStyle.styles";
import PropTypes from "prop-types";

const CustomDialogStyle = ({
  open,
  onClose,
  title,
  onSave,
  children,
  type,
  disableSave,
  isLoading,
  size = "md",
  disabledClose,
  // $height,
  dialogHeight, // mới thêm
}) => {
  const isDelete = type === "delete";

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      dialogSize={size}
            // styleHeight={$height}
      dialogHeight={dialogHeight}
      fullWidth
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      disablePortal
    >
      <StyledDialogTitle>
        {title}
      </StyledDialogTitle>
      <StyledDialogContent>{children}</StyledDialogContent>
      <StyledDialogActions>
        {disabledClose ? null : (
          <CancelButton onClick={onClose}>
            {disableSave ? "Đóng" : "Hủy"}
          </CancelButton>
        )}
        {!disableSave &&
          (isDelete ? (
            <DeleteButton onClick={onSave} disabled={isLoading}>
              Xác nhận
            </DeleteButton>
          ) : (
            <SaveButton onClick={onSave} disabled={isLoading}>
              Lưu
            </SaveButton>
          ))}
      </StyledDialogActions>
    </StyledDialog>
  );
};

CustomDialogStyle.propTypes = {
  open: PropTypes.bool.isRequired, // open phải là boolean và bắt buộc
  $height: PropTypes.string, // chiều cao của dialog
  onClose: PropTypes.func.isRequired, // onClose phải là function và bắt buộc
  title: PropTypes.string.isRequired, // title phải là string và bắt buộc
  onSave: PropTypes.func, // onSave có thể là function hoặc không bắt buộc
  children: PropTypes.node, // children có thể là bất kỳ phần tử React nào
  type: PropTypes.oneOf(["add", "edit", "delete"]), // Chỉ nhận 3 giá trị cụ thể
  disableSave: PropTypes.bool, // disableSave phải là boolean
  isLoading: PropTypes.bool, // disableSave phải là boolean
  disabledClose: PropTypes.bool, // disableSave phải là boolean
  dialogHeight: PropTypes.string,


  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]), // Kích thước giới hạn theo MUI
};

// Giá trị mặc định nếu prop không được truyền
CustomDialogStyle.defaultProps = {
  onSave: null, // Mặc định không có hàm onSave
  children: null, // Không có nội dung bên trong dialog
  type: "add", // Mặc định là dialog thêm mới
  disableSave: false, // Mặc định nút Lưu không bị disable
  size: "sm", // Mặc định kích thước nhỏ
};

export default CustomDialogStyle;
