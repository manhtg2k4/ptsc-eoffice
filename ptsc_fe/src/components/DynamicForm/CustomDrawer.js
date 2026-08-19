import React from "react";
import CloseIcon from "@mui/icons-material/Close";
import PropTypes from "prop-types";

import {
  ActionButton,
  ActionsContainer,
  CloseButton,
  DrawerContainer,
  DrawerHeader,
  DrawerTitle,
  HeaderLeftContainer,
  StyledDrawer,
} from "@styles/CustomDrawer.styles";

const CustomDrawer = ({ open, onClose, onOpen, title, children, actions, disabled }) => {
  return (
    <StyledDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      onOpen={onOpen || (() => { })}
    >
      <DrawerContainer>
        {/* Header */}
        <DrawerHeader>
          {/* Nút X góc trái */}
          <HeaderLeftContainer>
            <CloseButton onClick={onClose}>
              <CloseIcon />
            </CloseButton>

            <DrawerTitle>{title}</DrawerTitle>
          </HeaderLeftContainer>

          {/* Action buttons góc phải */}
          <ActionsContainer>
            {actions?.map((btn, index) => (
              <ActionButton
                key={index}
                onClick={btn.onClick}
                disabled={disabled}
              >
                {btn.label}
              </ActionButton>
            ))}
          </ActionsContainer>
        </DrawerHeader>

        {/* <Box flex={1} overflow="auto"> */}
          {children}
        {/* </Box> */}
      </DrawerContainer>
    </StyledDrawer>
  );
};

export default CustomDrawer;

CustomDrawer.propTypes = {
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
  disabled: PropTypes.bool,
};
