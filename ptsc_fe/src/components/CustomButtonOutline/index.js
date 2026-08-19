import React from "react";

import PropTypes from "prop-types";
import { StyledActionButton } from "@styles/ButtonOutline";

function CustomButtonOutline(props) {
  const { children, disabled, variant = 'primary', ...restProps } = props;

  return (
    <StyledActionButton 
      disabled={disabled} 
      variant={variant} 
      {...restProps}
    >
      {children}
    </StyledActionButton>
  );
}

CustomButtonOutline.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'error', 'warning', 'info', 'success', 'text', 'outlined', 'contained']),
};

export default CustomButtonOutline;
