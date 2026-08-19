import React from "react";
import PropTypes from "prop-types";
import {
  AlertAction,
  AlertBar,
  AlertDot,
  AlertEmphasis,
  AlertItems,
  AlertSeparator,
  AlertText,
} from "@styles/DashboardPageMedium.styles";

const LeadAlertBar = ({ alerts, actionText, onActionClick }) => {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  if (!safeAlerts.length) return null;
  return (
    <AlertBar>
      <AlertItems>
        <AlertDot>●</AlertDot>
        {safeAlerts.map((alert, index) => (
          <React.Fragment key={alert.id}>
            <AlertText component="span">
              {alert.emphasis ? <AlertEmphasis>{alert.text}</AlertEmphasis> : alert.text}{" "}
              {alert.suffixEmphasis ? (
                <AlertEmphasis>{alert.suffix}</AlertEmphasis>
              ) : (
                alert.suffix
              )}
            </AlertText>
            {index < safeAlerts.length - 1 ? <AlertSeparator>·</AlertSeparator> : null}
          </React.Fragment>
        ))}
      </AlertItems>
      <AlertAction onClick={onActionClick}>{actionText}</AlertAction>
    </AlertBar>
  );
};

LeadAlertBar.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.object).isRequired,
  actionText: PropTypes.string.isRequired,
  onActionClick: PropTypes.func,
};

export default LeadAlertBar;
