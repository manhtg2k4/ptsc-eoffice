import React from "react";
import PropTypes from "prop-types";
import {
  PremiumAlertBanner,
  PremiumAlertIcon,
  PremiumAlertSeparator,
  PremiumAlertStrong,
  PremiumAlertText,
} from "@styles/DashboardPagePremium.styles";

const PremiumAlertBar = ({ alerts }) => {
  return (
    <PremiumAlertBanner>
      <PremiumAlertIcon>⚡</PremiumAlertIcon>
      <PremiumAlertText>
        {alerts.map((item, index) => (
          <React.Fragment key={item.id}>
            {item.emphasisFirst === false ? (
              <>
                {item.text} <PremiumAlertStrong>{item.emphasis}</PremiumAlertStrong>
                {item.suffix ? ` ${item.suffix}` : ""}
              </>
            ) : (
              <>
                <PremiumAlertStrong>{item.emphasis}</PremiumAlertStrong> {item.text}
              </>
            )}
            {index < alerts.length - 1 ? <PremiumAlertSeparator>·</PremiumAlertSeparator> : null}
          </React.Fragment>
        ))}
      </PremiumAlertText>
    </PremiumAlertBanner>
  );
};

PremiumAlertBar.propTypes = {
  alerts: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default PremiumAlertBar;
