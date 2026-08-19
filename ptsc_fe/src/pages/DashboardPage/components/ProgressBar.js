import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

const ProgressTrack = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "trackHeight" && prop !== "trackRadius" && prop !== "trackColor",
})(({ trackHeight, trackRadius, trackColor }) => ({
  width: "100%",
  height: trackHeight,
  borderRadius: trackRadius,
  overflow: "hidden",
  background: trackColor,
}));

const ProgressFill = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "fillWidth" && prop !== "fillColor" && prop !== "fillRadius",
})(({ fillWidth, fillColor, fillRadius }) => ({
  width: `${fillWidth}%`,
  height: "100%",
  borderRadius: fillRadius,
  background: fillColor,
  transition: "width .8s ease",
  transformOrigin: "left center",
  animation: "progressBoot .9s ease-out",
  "@keyframes progressBoot": {
    from: {
      transform: "scaleX(0)",
      opacity: 0.7,
    },
    to: {
      transform: "scaleX(1)",
      opacity: 1,
    },
  },
}));

const ProgressBar = ({
  value,
  fillColor,
  styledHeight = 6,
  radius = 3,
  trackColor = "#EEF0F4",
}) => {
  return (
    <ProgressTrack trackHeight={styledHeight} trackRadius={radius} trackColor={trackColor}>
      <ProgressFill fillWidth={value} fillColor={fillColor} fillRadius={radius} />
    </ProgressTrack>
  );
};

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  fillColor: PropTypes.string.isRequired,
  styledHeight: PropTypes.number,
  radius: PropTypes.number,
  trackColor: PropTypes.string,
};

export default ProgressBar;
