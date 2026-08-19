import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Inbox,
  Send,
  CalendarMonth,
  Assignment,
  InfoOutlined,
  DirectionsCar,
  Badge,
  ChatBubbleOutline,
  Newspaper,
  Star,
  Groups,
  TaskAlt,
  WarningAmber,
  BusinessCenter,
  ArrowForward,
  Contacts,
} from "@mui/icons-material";
import {
  SectionCardWrapper,
  SectionCardContent,
  SectionCardHeader,
  SectionCardTitleGroup,
  SectionCardTitle,
  SectionCardActionButton,
  // DashboardIconBox,
  // themeColors,
} from "@styles/DashboardPage.styles";

const iconMap = {
  inbox: Inbox,
  send: Send,
  calendar: CalendarMonth,
  task: Assignment,
  car: DirectionsCar,
  passport: Badge,
  feedback: ChatBubbleOutline,
  news: Newspaper,
  event: Star,
  project: BusinessCenter,
  group: Groups,
  warning: WarningAmber,
  done: TaskAlt,
  contacts: Contacts,
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || InfoOutlined;
};

const SectionCardRoot = styled(SectionCardWrapper, {
  shouldForwardProp: (prop) => prop !== "wrapperHeight" && prop !== "wrapperBgMode",
})(({ theme, wrapperHeight, wrapperBgMode }) => {
  const baseStyle = {
    ...(wrapperBgMode
      ? { backgroundColor: "#f9fafb",}
      // ? { backgroundColor: "#FFFFFF80",}
      // ? { backgroundColor: theme.palette.background.default,}
      : {}),
  };

  if (!wrapperHeight) return baseStyle;

  if (typeof wrapperHeight === "string") {
    return { ...baseStyle, height: wrapperHeight };
  }

  return {
    ...baseStyle,
    ...(wrapperHeight.xs ? { height: wrapperHeight.xs } : {}),
    ...(wrapperHeight.sm
      ? { [theme.breakpoints.up("sm")]: { height: wrapperHeight.sm } }
      : {}),
    ...(wrapperHeight.md
      ? { [theme.breakpoints.up("md")]: { height: wrapperHeight.md } }
      : {}),
    ...(wrapperHeight.lg
      ? { [theme.breakpoints.up("lg")]: { height: wrapperHeight.lg } }
      : {}),
    ...(wrapperHeight.xl
      ? { [theme.breakpoints.up("xl")]: { height: wrapperHeight.xl } }
      : {}),
  };
});

const SectionCardMain = styled(SectionCardContent, {
  shouldForwardProp: (prop) => prop !== "contentLayout",
})(({ contentLayout }) => ({ ...(contentLayout || {}) }));

const SectionCardBody = styled(Box, {
  shouldForwardProp: (prop) => prop !== "bodyLayout",
})(({ bodyLayout }) => ({ ...(bodyLayout || {}) }));

const SectionCard = ({
  title,
	// icon,
	customTitle,
	sizeTitle,
  actionText,
  onActionClick,
  children,
  dragHandleNode,
  styleHeader,
  wrapperHeight,
  wrapperBgMode,
  contentLayout,
  bodyLayout,
}) => {
  // const IconComp = getIconComponent(icon);

  return (
    <SectionCardRoot wrapperHeight={wrapperHeight} wrapperBgMode={wrapperBgMode}>
      <SectionCardMain contentLayout={contentLayout}>
        <SectionCardHeader styleHeader={styleHeader}>
          <SectionCardTitleGroup>
            {dragHandleNode}
            {/* <DashboardIconBox styledColor={themeColors.primary} styledFontSize={22}>
              {IconComp && <IconComp />}	
            </DashboardIconBox> */}
            {customTitle ? customTitle : <SectionCardTitle sizeTitle={sizeTitle}>{title}</SectionCardTitle>}
          </SectionCardTitleGroup>

          {actionText ? (
            <SectionCardActionButton
              onClick={onActionClick}
              endIcon={<ArrowForward />}
              size="small"
            >
              {actionText}
            </SectionCardActionButton>
          ) : null}
        </SectionCardHeader>

        <SectionCardBody bodyLayout={bodyLayout}>{children}</SectionCardBody>
      </SectionCardMain>
    </SectionCardRoot>
  );
};

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string,
  actionText: PropTypes.string,
  onActionClick: PropTypes.func,
  children: PropTypes.node,
  dragHandleNode: PropTypes.node,
  styleHeader: PropTypes.number,
  wrapperHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  wrapperBgMode: PropTypes.oneOf(["paper"]),
  contentLayout: PropTypes.object,
  bodyLayout: PropTypes.object,
};

export default SectionCard;
