import React from "react";
import PropTypes from "prop-types";
import {
  LeadPanelWrapper,
  LeadPanelHeader,
  LeadPanelTitleGroup,
  LeadPanelLink,
  LeadBadgeCount,
} from "@styles/DashboardPageMedium.styles";

const LeadPanelCard = ({ title, actionText, onActionClick, badgeCount, children, dragHandleNode }) => {
  return (
    <LeadPanelWrapper>
      <LeadPanelHeader>
        <LeadPanelTitleGroup>
          {dragHandleNode}
          <span>{title}</span>
          {badgeCount ? <LeadBadgeCount>{badgeCount}</LeadBadgeCount> : null}
        </LeadPanelTitleGroup>
        {actionText ? (
          <LeadPanelLink onClick={onActionClick}>{actionText}</LeadPanelLink>
        ) : null}
      </LeadPanelHeader>
      {children}
    </LeadPanelWrapper>
  );
};

LeadPanelCard.propTypes = {
  title: PropTypes.string.isRequired,
  actionText: PropTypes.string,
  onActionClick: PropTypes.func,
  badgeCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  children: PropTypes.node,
  dragHandleNode: PropTypes.node,
};

export default LeadPanelCard;
