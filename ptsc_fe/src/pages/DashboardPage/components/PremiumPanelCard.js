import React from "react";
import PropTypes from "prop-types";
import {
  PremiumBadge,
  PremiumPanelHeader,
  PremiumPanelLink,
  PremiumPanelTitle,
  PremiumPanelWrapper,
} from "@styles/DashboardPagePremium.styles";

const PremiumPanelCard = ({ title, actionText, onActionClick, badgeCount, dragHandleNode, children, backgroundDf, nonePdBt }) => {
  return (
    <PremiumPanelWrapper backgroundDf={backgroundDf}>
      <PremiumPanelHeader nonePdBt={nonePdBt}>
        <PremiumPanelTitle>
          {dragHandleNode}
          <span>{title}</span>
          {badgeCount ? <PremiumBadge>{badgeCount}</PremiumBadge> : null}
        </PremiumPanelTitle>
        {actionText ? (
          <PremiumPanelLink onClick={onActionClick}>{actionText}</PremiumPanelLink>
        ) : null}
      </PremiumPanelHeader>
      {children}
    </PremiumPanelWrapper>
  );
};

PremiumPanelCard.propTypes = {
  title: PropTypes.string.isRequired,
  actionText: PropTypes.string,
  onActionClick: PropTypes.func,
  badgeCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  dragHandleNode: PropTypes.node,
  children: PropTypes.node,
  backgroundDf: PropTypes.bool,
  nonePdBt: PropTypes.bool,
};

export default PremiumPanelCard;
