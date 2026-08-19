import React from "react";
import PropTypes from "prop-types";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";
import { StyledTrendChip } from "@styles/DashboardPage.styles";

const TrendChip = ({ type, value }) => {
  const isUp = type === "up";

  return (
    <StyledTrendChip
      size="small"
      icon={isUp ? <ArrowUpward /> : <ArrowDownward />}
      label={value}
      isUp={isUp}
    />
  );
};

TrendChip.propTypes = {
  type: PropTypes.oneOf(["up", "down"]).isRequired,
  value: PropTypes.string.isRequired,
};

export default TrendChip;
