import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Collapse, IconButton, Tooltip } from "@mui/material";
import PropTypes from "prop-types";
import React, { useCallback, useState } from "react";

import {
  StyledStack,
  TitleTypography,
} from "@styles/ConfigCollapse.styles";

 const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);
   const handleToggleConfig = useCallback(() => {
    setShowConfig((prev) => !prev);
  }, []);
  return (
    <>
      <StyledStack>
        <TitleTypography>{title}</TitleTypography>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton
          //  onClick={() => setShowConfig(!showConfig)}
           onClick={handleToggleConfig}
           >
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </StyledStack>

      <Collapse in={showConfig}>{children}</Collapse>
    </>
  );
};

ConfigCollapse.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
export default ConfigCollapse;