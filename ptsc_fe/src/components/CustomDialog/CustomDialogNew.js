import React from "react";
import {
  CancelButton,
  StyledDialog,
  StyledDialogActions,
  StyledDialogContent,
  StyledDialogTitle,
  SaveButton,
  ResetButton,
  TitleWithIcon,
} from "@styles/CustomDialogNew.styles";
import PropTypes from "prop-types";

const CustomDialog = ({
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
  isheight,
  titleButton,
  colorType,
  onReset,
  showReset = false,
  titleIcon, // ← THÊM MỚI: Icon cho title
}) => {
  const isDelete = type === "delete";

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      dialogSize={size}
      isheight={isheight}
      fullWidth
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      disablePortal
    >
      {/* ✅ Title với icon */}
      <StyledDialogTitle>
        <TitleWithIcon>
          <span>{title}</span>
          {titleIcon && <span className="title-icon">{titleIcon}</span>}
        </TitleWithIcon>
      </StyledDialogTitle>
      
      <StyledDialogContent>{children}</StyledDialogContent>
      
      <StyledDialogActions>
        {showReset && (
          <ResetButton onClick={onReset} disabled={isLoading}>
            Đặt lại
          </ResetButton>
        )}
        
        <div style={{ flex: 1 }} />
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {!disabledClose && (
            <CancelButton onClick={onClose}>
              {disableSave ? "Đóng" : "Hủy"}
            </CancelButton>
          )}
          
          {!disableSave && (
            <SaveButton colorType={colorType} onClick={onSave} disabled={isLoading}>
              {titleButton || (isDelete ? "Xác nhận" : "Áp dụng bộ lọc")}
            </SaveButton>
          )}
        </div>
      </StyledDialogActions>
    </StyledDialog>
  );
};

CustomDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  onSave: PropTypes.func,
  children: PropTypes.node,
  type: PropTypes.oneOf(["add", "edit", "delete"]),
  disableSave: PropTypes.bool,
  isLoading: PropTypes.bool,
  disabledClose: PropTypes.bool,
  isheight: PropTypes.string,
  titleButton: PropTypes.string,
  colorType: PropTypes.string,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  onReset: PropTypes.func,
  showReset: PropTypes.bool,
  titleIcon: PropTypes.node, // ← THÊM MỚI
};

CustomDialog.defaultProps = {
  onSave: null,
  children: null,
  type: "add",
  disableSave: false,
  size: "sm",
  onReset: null,
  showReset: false,
  titleIcon: null,
};

export default CustomDialog;