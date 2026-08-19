import React from "react";
import { DialogContent } from "@mui/material";
import PropTypes from "prop-types";

import {
  CancelButton,
  SaveButton,
  StyledDialog,
  StyledDialogActions,
  StyledDialogTitle,
} from "@styles/CustomPopup.styles";

const CustomPopup = ({ open, onClose, onOpen, title, children, actions, size, disabled }) => {
  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      onOpen={onOpen || (() => {})}
      dialogSize={size || "lg"}
      TransitionComponent={null}
      TransitionProps={{ timeout: 0 }}
      disablePortal
    >
      <StyledDialogTitle>{title}</StyledDialogTitle>
      <DialogContent>
        {children}
      </DialogContent>
      <StyledDialogActions>
        {actions?.map((btn, index) => (
          <SaveButton
            disabled={disabled}
            key={index}
            onClick={btn.onClick}
            colorType={btn.color}
          >
            {btn.label}
          </SaveButton>
        ))}
        <CancelButton onClick={onClose}>
          Hủy
        </CancelButton>
      </StyledDialogActions>
    </StyledDialog>
  );
};

CustomPopup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
  title: PropTypes.string,
  children: PropTypes.node,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      color: PropTypes.string,
    })
  ),
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  disabled: PropTypes.bool,
};

export default CustomPopup;
