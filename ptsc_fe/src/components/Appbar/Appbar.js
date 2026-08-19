import React from "react";
import {
  Toolbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  DialogContainer,
  StyledAppBar,
  TitleTypography,
  RequiredAsterisk,
  ActionsContainer,
  ActionButton,
  LoadingSpinner,
  ContentBox,
  OpinionButton,
  SigningButton,
  RightActionsContainer,
	StyleIconButton,
} from "./Appbar.style";

const FullScreenDialog = ({
  open,
  onClose,
  title,
  onSave = () => {},
  children = null,
  type = 'add',
  disableSave = false,
  isLoading = false,
  saveButtonText,
  hideActions = false,
  onKeyDown,
  appBarColor = 'primary',
  showCloseIcon = true,
  customActions,
  onGetOpinion,
  onSubmitForSigning,
  sidebarWidth = 240,
  required = false,
}) => {
  // const isDelete = type === "delete";
  const isView = type === "view";

  const defaultSaveText = () => {
    switch (type) {
      case "delete":
        return "Xác nhận";
      case "add":
        return "Lưu";
      case "edit":
        return "Cập nhật";
      default:
        return "Lưu";
    }
  };


  const handleKeyDown = (event) => {
    if (onKeyDown) {
      onKeyDown(event);
      return;
    }
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "Enter" && event.ctrlKey && !disableSave && !isLoading) {
      onSave();
    }
  };

  const handleSaveClick = () => {
    if (!isLoading && !disableSave) {
      onSave();
    }
  };

  if (!open) return null;

  const handleDXAlertClick = () => {
    alert("Đề xuất xử lý clicked")
  }

  const handleCXLAlertClick = () => {
    alert("Chuyển xử lý clicked")
  }

  return (
    <DialogContainer onKeyDown={handleKeyDown} sidebarWidth={sidebarWidth}>
			<StyledAppBar appBarColor={appBarColor}>
      {/* <StyledAppBar position="relative" color={appBarColor}> */}
        <Toolbar>
          {showCloseIcon && (
						<StyleIconButton
							edge="start"
							// color="inherit"
							onClick={onClose}
							disabled={isLoading}>
              <CloseIcon />
            </StyleIconButton>
					)}
          <TitleTypography showCloseIcon={showCloseIcon} variant="h6">
            {title} {required && <RequiredAsterisk>*</RequiredAsterisk>}
          </TitleTypography>

          {customActions ? (
            customActions
          ) : (
            !hideActions && (
              <ActionsContainer>
                {!disableSave && !isView && (
                  <ActionsContainer>
                    <ActionButton
                      // color="inherit"
                      onClick={handleDXAlertClick}
                      disabled={isLoading}
                      variant="appBar"
                    >
                      Trình ký
                    </ActionButton>
                    <ActionButton
                      // color="inherit"
                      onClick={handleCXLAlertClick}
                      disabled={isLoading}
                      variant="appBar"
                    >
                      Lưu và Đóng
                    </ActionButton>
                    <ActionButton
                      autoFocus
                      // color={isDelete ? "error" : "inherit"}
                      onClick={handleSaveClick}
                      disabled={isLoading}
                      variant="appBar"
                      startIcon={
                        isLoading ? <LoadingSpinner size={16} /> : null
                      }
                    >
                      {isLoading
                        ? "Đang xử lý..."
                        : saveButtonText || defaultSaveText()}
                    </ActionButton>
                  </ActionsContainer>
                )}
              </ActionsContainer>
            )
          )}
          <RightActionsContainer>
            {onGetOpinion && (
              <OpinionButton
                // color="inherit"
                variant="appBar"
                onClick={onGetOpinion}
                disabled={isLoading}
              >
                Xin ý kiến
              </OpinionButton>
            )}
            {onSubmitForSigning && (
              <SigningButton
                // color="inherit"
                variant="appBar"
                onClick={onSubmitForSigning}
                disabled={isLoading}
              >
                Trình ký
              </SigningButton>
            )}
          </RightActionsContainer>
        </Toolbar>
      </StyledAppBar>

      <ContentBox>{children}</ContentBox>
    </DialogContainer>
  );
};

export default FullScreenDialog;
