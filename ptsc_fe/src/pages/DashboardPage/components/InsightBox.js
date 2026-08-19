import React from "react";
import PropTypes from "prop-types";
import {
  InsightBoxWrapper,
  InsightText,
  StyledEmojiEvents,
  StyledErrorOutline,
  StyledHourglassTop,
  StyledInfoOutlined,
  themeColors,
} from "@styles/DashboardPage.styles";

const insightConfig = {
  danger: {
    bg: "rgba(214, 48, 49, 0.1)",
    color: themeColors.danger,
    icon: <StyledErrorOutline />,
  },
  warning: {
    bg: "rgba(253, 203, 110, 0.22)",
    color: "#d68910",
    icon: <StyledHourglassTop />,
  },
  success: {
    bg: "rgba(0, 184, 148, 0.1)",
    color: themeColors.success,
    icon: <StyledEmojiEvents />,
  },
  info: {
    bg: "rgba(116, 185, 255, 0.16)",
    color: themeColors.primary,
    icon: <StyledInfoOutlined />,
  },
};

const InsightBox = ({ type, text }) => {
  const current = insightConfig[type] || insightConfig.info;

  return (
    <InsightBoxWrapper styledBgColor={current.bg} textColor={current.color}>
      {current.icon}
      <InsightText>{text}</InsightText>
    </InsightBoxWrapper>
  );
};

InsightBox.propTypes = {
  type: PropTypes.oneOf(["danger", "warning", "success", "info"]),
  text: PropTypes.string.isRequired,
};

export default InsightBox;
