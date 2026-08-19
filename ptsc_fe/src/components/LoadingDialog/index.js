import React from "react";
import PropTypes from "prop-types";
import { StyledLoadingDialog, StyledDialogContent } from "@styles/CustomDialog.styles";

function LoadingDialog(props) {
  const { children, open, hideBackdrop = true, ...rest } = props;
  return (
    <StyledLoadingDialog 
      open={open ?? false} 
      hideBackdrop={hideBackdrop}
      {...rest}
    >
      <StyledDialogContent>{children}</StyledDialogContent>
    </StyledLoadingDialog>
  );
}

LoadingDialog.propTypes = {
  children: PropTypes.object,
};

export default LoadingDialog;

