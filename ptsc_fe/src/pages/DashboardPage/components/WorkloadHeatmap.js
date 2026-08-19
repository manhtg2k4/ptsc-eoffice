import React from "react";
import PropTypes from "prop-types";
// import { Box, Typography } from "@mui/material";
// import { styled } from "@mui/material/styles";
// import { PageTitle } from "@styles/ThemeConfig.styles";
import { HeatmapCell, HeatmapColumnLabel, HeatmapColumnLabels, HeatmapGrid, HeatmapLegend, HeatmapLegendDot, HeatmapLegendLabel, HeatmapTitle, HeatmapWeekLabel, HeatmapWrap } from "@styles/DashboardPagePremium.styles";

// const HeatmapWrap = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "variantType",
// })(({ variantType }) => ({
//   padding: variantType === "premium" ? 0 : "14px 18px",
// }));

// const HeatmapTitle = styled(PageTitle, {
//   shouldForwardProp: (prop) => prop !== "variantType",
// })(({ variantType, theme }) => ({
//   fontSize: variantType === "premium" ? 12 : 11,
//   color: variantType === "premium" ? "#1A1D23" : theme.palette.text.secondary,
//   // color: variantType === "premium" ? "#1A1D23" : "#546e8a",
//   marginBottom: variantType === "premium" ? 10 : 8,
//   fontWeight: variantType === "premium" ? 700 : 500,
//   textTransform: variantType === "premium" ? "uppercase" : "none",
//   letterSpacing: variantType === "premium" ? 0.5 : 0,
// }));

// const HeatmapColumnLabels = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "columnCount",
// })(({ columnCount }) => ({
//   display: "grid",
//   gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
//   gap: 3,
//   marginBottom: 4,
// }));

// const HeatmapColumnLabel = styled(Typography, {
//   shouldForwardProp: (prop) => prop !== "variantType",
// })(({ variantType }) => ({
//   fontSize: variantType === "premium" ? 10 : 9.5,
//   color: variantType === "premium" ? "#8D96A3" : "#8fa8bf",
//   textAlign: "center",
//   fontWeight: 500,
// }));

// const HeatmapGrid = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "columnCount" && prop !== "hasWeekLabels",
// })(({ columnCount, hasWeekLabels }) => ({
//   display: "grid",
//   gridTemplateColumns: hasWeekLabels
//     ? `auto repeat(${columnCount}, 1fr)`
//     : `repeat(${columnCount}, 1fr)`,
//   gap: 3,
//   marginBottom: 8,
// }));

// const HeatmapWeekLabel = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "variantType",
// })(({ variantType }) => ({
//   fontWeight: 500,
//   color: variantType === "premium" ? "#5F6B7A" : "#546e8a",
//   padding: "4px 6px 4px 0",
//   textAlign: "right",
//   fontSize: variantType === "premium" ? 11 : 10,
//   display: "flex",
//   alignItems: "center",
// }));

// const HeatmapCell = styled(Box, {
//   shouldForwardProp: (prop) =>
//     prop !== "cellColor" && prop !== "variantType" && prop !== "showValue",
// })(({ cellColor, variantType, showValue }) => ({
//   height: variantType === "premium" ? 26 : 26,
//   borderRadius: variantType === "premium" ? 3 : 4,
//   transition: "transform .15s",
//   background: cellColor,
//   display: "flex",
//   alignItems: "center",
//   justifyContent: "center",
//   fontSize: showValue ? 10 : 0,
//   fontWeight: 600,
//   color: showValue ? "#0F172A" : "transparent",
//   cursor: "pointer",
//   animation: "heatmapBoot .45s ease-out",
//   "&:hover": {
//     transform: "scale(1.08)",
//   },
//   "@keyframes heatmapBoot": {
//     from: {
//       opacity: 0,
//       transform: "scale(.85)",
//     },
//     to: {
//       opacity: 1,
//       transform: "scale(1)",
//     },
//   },
// }));

// const HeatmapLegend = styled(Box)({
//   display: "flex",
//   gap: 5,
// 	alignItems: "center",
// 	justifyContent: "end"
// });

// const HeatmapLegendLabel = styled(Typography, {
//   shouldForwardProp: (prop) => prop !== "variantType",
// })(({ variantType }) => ({
//   fontSize: variantType === "premium" ? 11 : 10,
//   color: variantType === "premium" ? "#8D96A3" : "#8fa8bf",
// }));

// const HeatmapLegendDot = styled(Box, {
//   shouldForwardProp: (prop) => prop !== "dotColor",
// })(({ dotColor }) => ({
//   width: 12,
//   height: 12,
//   borderRadius: 2,
//   background: dotColor,
// }));

const WorkloadHeatmap = ({
  title,
  days,
  values,
  legendColors,
  resolveColor,
  variant,
  weekLabels,
  showWeekLabels,
  showCellValues,
}) => {
  const safeDays = Array.isArray(days) ? days : [];
  const safeValues = Array.isArray(values) ? values : [];
  const safeLegendColors = Array.isArray(legendColors) ? legendColors : [];

  if (!safeDays.length || !safeValues.length) return null;

  return (
    <HeatmapWrap variantType={variant}>
      {title ? <HeatmapTitle variantType={variant}>{title}</HeatmapTitle> : null}

      <HeatmapColumnLabels columnCount={safeDays.length} hasWeekLabels={showWeekLabels}>
        {showWeekLabels ? <div aria-hidden="true" /> : null}
        {safeDays.map((day) => (
          <HeatmapColumnLabel key={day} variantType={variant}>
            {day}
          </HeatmapColumnLabel>
        ))}
      </HeatmapColumnLabels>

      <HeatmapGrid columnCount={safeDays.length} hasWeekLabels={showWeekLabels}>
        {safeValues.map((week, weekIndex) => {
          const weekKey = weekLabels?.[weekIndex] || `week-${week.join("-")}`;
          return (
            <React.Fragment key={weekKey}>
              {showWeekLabels ? (
                <HeatmapWeekLabel>
                  {weekLabels?.[weekIndex] || `Tuần ${weekIndex + 1}`}
                </HeatmapWeekLabel>
              ) : null}

              {week.map((value, dayIndex) => {
                const dayKey = safeDays[dayIndex] || `day-${dayIndex}`;
                return (
                  <HeatmapCell
                    key={`${weekKey}-${dayKey}`}
                    cellColor={resolveColor(value)}
                    variantType={variant}
                    showValue={showCellValues}
                    title={`${weekLabels?.[weekIndex] || `Tuần ${weekIndex + 1}`}, ${dayKey}: ${value}%`}
                  >
                    {showCellValues ? value : null}
                  </HeatmapCell>
                );
              })}
            </React.Fragment>
          );
        })}
      </HeatmapGrid>

      <HeatmapLegend>
        <HeatmapLegendLabel variantType={variant}>Thấp</HeatmapLegendLabel>
        {safeLegendColors.map((color) => (
          <HeatmapLegendDot key={color} dotColor={color} />
        ))}
        <HeatmapLegendLabel variantType={variant}>Cao</HeatmapLegendLabel>
      </HeatmapLegend>
    </HeatmapWrap>
  );
};

WorkloadHeatmap.propTypes = {
  title: PropTypes.string,
  days: PropTypes.arrayOf(PropTypes.string).isRequired,
  values: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  legendColors: PropTypes.arrayOf(PropTypes.string).isRequired,
  resolveColor: PropTypes.func.isRequired,
  variant: PropTypes.oneOf(["medium", "premium"]),
  weekLabels: PropTypes.arrayOf(PropTypes.string),
  showWeekLabels: PropTypes.bool,
  showCellValues: PropTypes.bool,
};

WorkloadHeatmap.defaultProps = {
  title: "",
  variant: "medium",
  weekLabels: undefined,
  showWeekLabels: false,
  showCellValues: false,
};

export default WorkloadHeatmap;
