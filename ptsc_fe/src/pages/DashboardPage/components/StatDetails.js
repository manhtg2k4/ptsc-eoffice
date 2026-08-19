import React from "react";
import PropTypes from "prop-types";
import { Divider } from "@mui/material";
import {
  StatDetailsWrapper,
  StyledBoxStatDetails,
  StatDetailValue,
  StatDetailLabel,
} from "@styles/DashboardPage.styles";

const StatDetails = ({ details = [], onStatBlockClick, parentData }) => {
  return (
    <StatDetailsWrapper divider={<Divider orientation="vertical" flexItem />}>
      {details.map((item, index) => {
        const isClickable = typeof onStatBlockClick === "function";
        const itemKey = item.id || item.key || item.label || index;
        return (
          <StyledBoxStatDetails
            key={itemKey}
            isClickable={isClickable}
            onClick={
              isClickable
                ? (e) => {
                    e.stopPropagation();
                    onStatBlockClick({ ...item, parentCard: parentData }, parentData);
                  }
                : undefined
            }
          >
            <StatDetailValue valueColor={item.color || "blue"}>
              {item.value}
            </StatDetailValue>
            <StatDetailLabel>{item.label}</StatDetailLabel>
          </StyledBoxStatDetails>
        );
      })}
    </StatDetailsWrapper>
  );
};

StatDetails.propTypes = {
  details: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      color: PropTypes.string,
    })
  ),
  onStatBlockClick: PropTypes.func,
  parentData: PropTypes.object,
};

export default StatDetails;
