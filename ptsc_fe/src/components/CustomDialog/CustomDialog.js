import React from "react";
import {
  CancelButton,
  CloseIconButton,
  DeleteButton,
  StyledDialog,
  StyledDialogActions,
  StyledDialogContent,
  StyledDialogTitle,
  SaveButton,
} from "@styles/CustomDialog.styles";
import PropTypes from "prop-types";
import { Box, CircularProgress } from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";

const BoxStyle = styled(Box)({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(255, 255, 255, 0.5)",
  zIndex: 10,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const LeftButtonsWrapper = styled(Box)({
  flexGrow: 1,
  display: "flex",
});

const CustomDialog = ({
  open,
  onClose,
  title,
  customTitleContent,
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
	titleAlign,
	cancelButtonText,
  hideFooter,
  customButtons,
  disabled,
  leftButtons,
  hiddenFooter,
  inputLabelLayout = "floating",
	textTransformTitle,
	unsetPaddingTop,
}) => {
  const isDelete = type === "delete";

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      dialogSize={size}
      // styleHeight={$height}
      isheight={isheight}
      fullWidth
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      PaperProps={{
        style: { position: "relative" },
      }}
      // disablePortal
    >
      {isLoading && (
        <BoxStyle>
          <CircularProgress />
        </BoxStyle>
      )}
      {customTitleContent ? (
        customTitleContent
      ) : (
        <StyledDialogTitle textTransformTitle={textTransformTitle} titleAlign={titleAlign}>
          {title}
          {!disabledClose && (
            <CloseIconButton onClick={onClose} aria-label="close">
              <CloseIcon />
            </CloseIconButton>
          )}
        </StyledDialogTitle>
      )}
      <FormFieldLayoutContext.Provider value={{ inputLabelLayout }}>
        <StyledDialogContent unsetPaddingTop={unsetPaddingTop}>{children}</StyledDialogContent>
      </FormFieldLayoutContext.Provider>
      {(!customTitleContent && !hideFooter) && (
        <StyledDialogActions>
          {leftButtons && (
            <LeftButtonsWrapper>
              {leftButtons}
            </LeftButtonsWrapper>
          )}
          {disabledClose ? null : (
            <CancelButton onClick={onClose}>
              {disableSave ? "ĐÓNG" : cancelButtonText || "HỦY"}
            </CancelButton>
          )}
          {!disableSave &&
            (isDelete ? (
              <DeleteButton onClick={onSave} disabled={isLoading}>
                XÁC NHẬN
              </DeleteButton>
            ) : (
              <SaveButton
                colorType={colorType}
                onClick={onSave}
                disabled={isLoading || disabled }
              >
                {titleButton || "LƯU"}
              </SaveButton>
            ))}
          {customButtons ? <>
            {customButtons}
          </> :  null}
        </StyledDialogActions>
      )}
      {(hiddenFooter) && (
        <StyledDialogActions>
          {leftButtons && (
            <LeftButtonsWrapper>
              {leftButtons}
            </LeftButtonsWrapper>
          )}
          {disabledClose ? null : (
            <CancelButton onClick={onClose}>
              {disableSave ? "ĐÓNG" : cancelButtonText || "HỦY"}
            </CancelButton>
          )}
          {!disableSave &&
            (isDelete ? (
              <DeleteButton onClick={onSave} disabled={isLoading}>
                XÁC NHẬN
              </DeleteButton>
            ) : (
              <SaveButton
                colorType={colorType}
                onClick={onSave}
                disabled={isLoading || disabled }
              >
                {titleButton || "LƯU"}  
              </SaveButton>
            ))}
          {customButtons ? <>
            {customButtons}
          </> :  null}
        </StyledDialogActions>
      )}
    </StyledDialog>
  );
};

CustomDialog.propTypes = {
  open: PropTypes.bool.isRequired, // open phải là boolean và bắt buộc
  $height: PropTypes.string, // chiều cao của dialog
  onClose: PropTypes.func.isRequired, // onClose phải là function và bắt buộc
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), // title có thể là string hoặc node
  customTitleContent: PropTypes.node,
  onSave: PropTypes.func, // onSave có thể là function hoặc không bắt buộc
  children: PropTypes.node, // children có thể là bất kỳ phần tử React nào
  type: PropTypes.oneOf(["add", "edit", "delete"]), // Chỉ nhận 3 giá trị cụ thể
  disableSave: PropTypes.bool, // disableSave phải là boolean
  isLoading: PropTypes.bool, // disableSave phải là boolean
  disabledClose: PropTypes.bool, // disableSave phải là boolean
  isheight: PropTypes.string, // chiều cao của dialog
  titleButton: PropTypes.string,
  colorType: PropTypes.string,
  titleAlign: PropTypes.string,
  cancelButtonText: PropTypes.string,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]), // Kích thước giới hạn theo MUI
  hideFooter: PropTypes.bool,
  leftButtons: PropTypes.node,
  hiddenFooter: PropTypes.bool,
  inputLabelLayout: PropTypes.oneOf(["floating", "stacked"]),
};

// Giá trị mặc định nếu prop không được truyền
CustomDialog.defaultProps = {
  onSave: null, // Mặc định không có hàm onSave
  children: null, // Không có nội dung bên trong dialog
  type: "add", // Mặc định là dialog thêm mới
  disableSave: false, // Mặc định nút Lưu không bị disable
  size: "sm", // Mặc định kích thước nhỏ
  hideFooter: false,
  customTitleContent: null,
  title: null,
  hiddenFooter: false,
  inputLabelLayout: "floating",
};

export default CustomDialog;
