import React from "react";
import { Breadcrumbs, styled } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { 
  BreadcrumbBar, 
  StyledBreadcrumbLink, 
  StyledActiveBreadcrumb, 
  // BackButton 
} from "./CategoryHierarchyStyles";
import PropTypes from "prop-types";
const Separator = styled(NavigateNextIcon )(() => ({
  fontSize: "small",
}));
/**
 * HierarchyHeader
 * Props:
 *  items: Array<{ label: string, onClick?: fn }> - Danh sách các mục breadcrumb
 *  onBack: fn - Hàm xử lý khi click nút back (mũi tên trái)
 */
function HierarchyHeader({ items = [],  }) {
  return (
    <BreadcrumbBar>
      <Breadcrumbs 
        separator={<Separator/>} 
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          if (isLast) {
            return (
              <StyledActiveBreadcrumb key={index}>
                {item.label}
              </StyledActiveBreadcrumb>
            );
          }
          
          return (
            <StyledBreadcrumbLink 
              key={index} 
              onClick={item.onClick}
            >
              {item.label}
            </StyledBreadcrumbLink>
          );
        })}
      </Breadcrumbs>
    </BreadcrumbBar>
  );
}

HierarchyHeader.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func,
    })
  ),
  onBack: PropTypes.func,
};

export default HierarchyHeader;
