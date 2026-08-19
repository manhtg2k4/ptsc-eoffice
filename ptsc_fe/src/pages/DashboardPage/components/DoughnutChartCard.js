import React from "react";
import PropTypes from "prop-types";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useTheme } from "@mui/material/styles";

import {
  DoughnutCardWrapper,
  DoughnutCardHeader,
  DoughnutCardTitle,
  DoughnutBadgeChip,
  DoughnutChartBox,
} from "@styles/DashboardPage.styles";
import {
  // DonutLegend,
  // DonutLegendDot,
  // DonutSummaryValuePercent,
  // DonutLegendRow,
  DonutLegendLabel,
  DonutLegendPercent,
  DonutSummary,
  DonutSummaryItem,
  DonutSummaryValue,
  DonutWrap,
} from "@styles/DashboardPageMedium.styles";

ChartJS.register(ArcElement, Tooltip, Legend);

const centerTextPlugin = {
	id: "centerTextPlugin",
  afterDraw(chart, args, pluginOptions) {
    const centerText = pluginOptions?.centerText;
    const fontFamily = pluginOptions?.fontFamily || "inherit";
    const valueColorFromTheme = pluginOptions?.theme?.palette?.text?.primary;
    const labelColorFromTheme = pluginOptions?.theme?.palette?.text?.secondary;
    if (!centerText?.value) {
      return;
    }

    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return;
    }

    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    const valueOffsetY = -12;
    const labelOffsetY = 14;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = centerText.valueColor || valueColorFromTheme || "#14191F";
    // ctx.fillStyle = centerText.valueColor || "#0A2240";
    ctx.font = `700 35px ${fontFamily}`;
    ctx.fillText(centerText.value, x, y + valueOffsetY);

    if (centerText.label) {
      ctx.fillStyle = centerText.labelColor || labelColorFromTheme || "#8A97A8";
      ctx.font = `400 12px ${fontFamily}`;
      ctx.fillText(centerText.label, x, y + labelOffsetY);
    }
    ctx.restore();
  },
};

const DoughnutChartCard = ({
  title,
  badge,
  chartData,
  variant = "default",
  centerText,
  // legendItems,
  summaryItems,
}) => {
  const theme = useTheme();
  const fontFamily = theme.typography.fontFamily;
  const safeChartData = chartData && typeof chartData === "object" ? chartData : {};
  const labels = Array.isArray(safeChartData.labels) ? safeChartData.labels : [];
  const values = Array.isArray(safeChartData.values) ? safeChartData.values : [];
  const colors = Array.isArray(safeChartData.colors)
    ? safeChartData.colors
    : values.map(() => "#D9E2EC");

  const bgColor = theme.palette.background.default;

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: bgColor,
        hoverOffset: variant === "approval" ? 2 : 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: variant === "approval" ? "72%" : "68%",
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1100,
      easing: "easeOutCubic",
    },
    plugins: {
      centerTextPlugin: {
        centerText,
        fontFamily,
        theme,
      },
      legend: {
        display: variant !== "approval",
        position: "bottom",
        labels: {
          color: "#64748b",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          font: {
            family: fontFamily,
            size: 13,
            weight: 500,
          },
        },
      },
    },
  };

  const chartElement = (
    <Doughnut
      data={data}
      options={options}
      plugins={centerText?.value ? [centerTextPlugin] : []}
    />
  );

  if (variant === "approval") {
    return (
      <>
        <DonutWrap nonePdTop>
          <DoughnutChartBox>
            {chartElement}
          </DoughnutChartBox>

          {/* {legendItems?.length ? (
            <DonutLegend>
              {legendItems.map((item) => (
                <DonutLegendRow key={item.id}>
                  <DonutLegendDot dotColor={item.color} />
                  <DonutLegendLabel>{item.label}</DonutLegendLabel>
                  <DonutLegendPercent textColor={item.color}>
                    {item.percent}%
                  </DonutLegendPercent>
                </DonutLegendRow>
              ))}
            </DonutLegend>
          ) : null} */}
        </DonutWrap>

        {summaryItems?.length ? (
          <DonutSummary>
            {summaryItems.map((item) => (
              <DonutSummaryItem key={item.id}>
                <DonutSummaryValue textColor={item.color}>
                  {item.value}
                </DonutSummaryValue>
								<DonutLegendLabel>{item.label}</DonutLegendLabel>
								<DonutLegendPercent textColor={item.color}>
                  {item.percent}%
                </DonutLegendPercent>
              </DonutSummaryItem>
            ))}
          </DonutSummary>
        ) : null}
      </>
    );
  }

  return (
    <DoughnutCardWrapper>
      <DoughnutCardHeader>
        <DoughnutCardTitle>{title}</DoughnutCardTitle>
        {badge ? (
          <DoughnutBadgeChip
            label={badge.text}
            size="small"
            badgeType={badge.type}
          />
        ) : null}
      </DoughnutCardHeader>

      <DoughnutChartBox>
        {chartElement}
      </DoughnutChartBox>
    </DoughnutCardWrapper>
  );
};

DoughnutChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  badge: PropTypes.shape({
    text: PropTypes.string,
    type: PropTypes.string,
  }),
  variant: PropTypes.oneOf(["default", "approval"]),
  centerText: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string,
    valueColor: PropTypes.string,
    labelColor: PropTypes.string,
  }),
  legendItems: PropTypes.array,
  summaryItems: PropTypes.array,
  chartData: PropTypes.shape({
    labels: PropTypes.array,
    values: PropTypes.array,
    colors: PropTypes.array,
  }),
};

export default DoughnutChartCard;
