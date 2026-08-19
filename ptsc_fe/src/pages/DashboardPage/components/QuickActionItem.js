import React from "react";
import PropTypes from "prop-types";
import { getIconComponent } from "./SectionCard";
import {
  QuickActionButton,
  QuickActionIconBox,
  QuickActionBadge,
  QuickActionLabel,
  QuickActionInnerIcon,
  // getSoftBg,
  getColorValue,
} from "@styles/DashboardPage.styles";

const KEY_TO_ICON = {
  VIEW_TASK_MANAGEMENT: "task",
  VIEW_INCOMING_DOCUMENTS: "inbox",
  VIEW_OUTGOING_DOCUMENTS: "send",
  VIEW_PERSONAL_CALENDAR: "calendar",
  VIEW_BOOK_A_CAR: "car",
  VIEW_PASSPORT: "passport",
  VIEW_FEEDBACK: "feedback",
};

const QuickActionItem = ({ data, onClick }) => {
  const resolvedIcon = data.icon || KEY_TO_ICON[data.key] || "task";
  const IconComp = getIconComponent(resolvedIcon);
  const badgeValue =
    typeof data.badge?.value === "number" && data.badge.value > 99
      ? "99+"
      : data.badge?.value;

  return (
    <QuickActionButton fullWidth variant="text" onClick={onClick}>
      <QuickActionIconBox
        // styledBgColor={getSoftBg(data.color || "blue")}
        styledIconColor={getColorValue(data.color || "blue")}
      >
        <QuickActionInnerIcon>
          {IconComp && <IconComp />}
        </QuickActionInnerIcon>
        {data.badge ? (
          <QuickActionBadge
            badgeColor={getColorValue(data.badge.color || "red")}
          >
            {badgeValue}
          </QuickActionBadge>
        ) : null}
      </QuickActionIconBox>

      <QuickActionLabel>{data.label}</QuickActionLabel>
    </QuickActionButton>
  );
};

QuickActionItem.propTypes = {
  data: PropTypes.shape({
    icon: PropTypes.string,
    color: PropTypes.string,
    label: PropTypes.string,
    onClick: PropTypes.func,
    badge: PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
    }),
  }).isRequired,
};

export default QuickActionItem;
