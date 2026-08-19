
import React from "react";
import PropTypes from "prop-types";
import { StyledIconButton } from "@styles/UploadFile/UploadFile.style";


const CustomIconButton = (props) => {
  const { children } = props;

  return (
    <>
      <StyledIconButton {...props}>{children}</StyledIconButton>
    </>
  );
};
CustomIconButton.propTypes = {
  children: PropTypes.node,
};

export default CustomIconButton;
