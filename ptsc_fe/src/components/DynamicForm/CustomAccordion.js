import React, { useCallback, useState } from "react";
import { Accordion, AccordionSummary, AccordionDetails, Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import { ExpandMore } from "@mui/icons-material";
import PropTypes from "prop-types";
import {
  ConfigContainer,
  SettingsButton,
  TitleInput,
  TitleTypography,
  SizeInputTextField,
} from "@styles/CustomAccordion.styles";

const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  "&.Mui-focusVisible": {
    outline: "none",
    background: "transparent",
  },
  marginTop: theme.spacing(-1),
}));

// Main Component
const sizeLabels = {
  xs: "Điện thoại",
  sm: "Máy tính bảng",
  md: "Laptop",
  lg: "Màn hình lớn",
};

const CustomAccordion = ({
  item,
  title,
  children,
  defaultExpanded = false,
  mode,
  onTitleChange = () => { },
  onSizeChange = () => { },
  onKeyDown = () => { },
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showConfig, setShowConfig] = useState(false);

  const handleSummaryClick = (e) => {
    if (e.target.closest('input, [role="textbox"]')) {
      return;
    }
    setExpanded((prev) => !prev);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === " ") {
        onTitleChange(title + " ");
      }
    }
  };

  const handleTitleChange = useCallback(
    (e) => onTitleChange(e.target.value),
    [onTitleChange]
  );

  // 2. Handler cho SettingsButton
  const handleSettingsClick = useCallback(
    (e) => {
      e.stopPropagation();
      setShowConfig((prev) => !prev);
    },
    []
  );

  // 3. Handler cho SizeInputTextField
  const handleSizeChange = useCallback(
    (key) => (e) => {
      onSizeChange(e, key);
    },
    [onSizeChange]
  );

  const handleStopPropagation = useCallback((e) => {
  e.stopPropagation();
}, []);


  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      expanded={expanded}
    >
      <StyledAccordionSummary
        expandIcon={<ExpandMore />}
        onClick={handleSummaryClick}
      >
        <TitleTypography>
          {mode === "builder" ? (
            <div 
            // onClick={(e) => e.stopPropagation()}
            onClick={handleStopPropagation}
            >
              <TitleInput
                value={title}
                placeholder="Nhập tiêu đề..."
                // onChange={(e) => onTitleChange(e.target.value)}
                onChange={handleTitleChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          ) : (title)}
        </TitleTypography>

        {mode === "builder" && (
          <Box>
            <SettingsButton
              // onClick={(e) => {
              //   e.stopPropagation();
              //   setShowConfig(!showConfig);
              // }}
              onClick={handleSettingsClick}
              title="Cấu hình"
              isconfigopen={showConfig ? 1 : 0}
            >
              <SettingsIcon />
            </SettingsButton>
          </Box>
        )}
      </StyledAccordionSummary>
      <AccordionDetails>
        {mode === "builder" && showConfig && (
          <ConfigContainer>
            {["xs", "sm", "md", "lg"].map((key) => (
              <Box key={key}>
                <TitleTypography>
                  {sizeLabels[key]}:
                </TitleTypography>
                <SizeInputTextField
                  type="number"
                  value={item.props?.size?.[key] || ""}
                  // onChange={(e) => onSizeChange(e, key)}
                  onChange={handleSizeChange(key)}
                  onKeyDown={onKeyDown}
                  inputProps={{ min: 1, max: 12 }}
                />
              </Box>
            ))}
            <TitleTypography>
              Tổng số cột mỗi hàng là 12
            </TitleTypography>
          </ConfigContainer>
        )}
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

CustomAccordion.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  item: PropTypes.object,
  defaultExpanded: PropTypes.bool,
  mode: PropTypes.oneOf(["builder", "runtime"]),
  onTitleChange: PropTypes.func,
  onSizeChange: PropTypes.func,
  onKeyDown: PropTypes.func,
};

CustomAccordion.defaultProps = {
  children: null,
  defaultExpanded: false,
};

export default CustomAccordion;