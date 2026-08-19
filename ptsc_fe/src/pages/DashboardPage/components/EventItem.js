import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import {
  EventItemWrapper,
  EventDateBox,
  EventDay,
  EventMonth,
  EventTitle,
  EventDescription,
  getGradientByColor,
} from "@styles/DashboardPage.styles";

const EventItem = ({ data, onClick, styleCursor }) => {
  return (
    <EventItemWrapper onClick={onClick} styleCursor={styleCursor}>
      <EventDateBox styledbgColor={getGradientByColor(data.color || "green")}>
        <EventDay>{data.day}</EventDay>
        <EventMonth>{data.month}</EventMonth>
      </EventDateBox>

      <Box>
        <EventTitle>{data.title}</EventTitle>
        <EventDescription>{data.description}</EventDescription>
      </Box>
    </EventItemWrapper>
  );
};

EventItem.propTypes = {
  data: PropTypes.shape({
    color: PropTypes.string,
    day: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    month: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
  style: PropTypes.object,
};

export default EventItem;
