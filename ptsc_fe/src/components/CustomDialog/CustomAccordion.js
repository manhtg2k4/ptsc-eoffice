import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import PropTypes from "prop-types";

const CustomAccordion = ({ title, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleChange = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Accordion
      disableGutters // Bỏ padding mặc định
      elevation={0} // Xóa shadow nếu cần
      square // Bỏ border radius khi mở rộng
      expanded={expanded}
      onChange={handleChange}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Typography variant="h6">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

CustomAccordion.propTypes = {
  title: PropTypes.string.isRequired, // Tiêu đề bắt buộc phải là string
  children: PropTypes.node, // Nội dung bên trong có thể là bất kỳ thành phần React nào
  defaultExpanded: PropTypes.bool, // Mặc định có mở rộng hay không
};

// Giá trị mặc định nếu prop không được truyền
CustomAccordion.defaultProps = {
  children: null, // Mặc định không có nội dung bên trong
  defaultExpanded: false, // Mặc định accordion sẽ đóng
};

export default CustomAccordion;
