import React, { useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import PremiumPanelCard from "./PremiumPanelCard";
import ProgressBar from "./ProgressBar";
import WorkloadHeatmap from "./WorkloadHeatmap";
import DashboardTabs from "./DashboardTabs";
import {
  PremiumChartSvgWrap,
  PremiumContentBody,
  PremiumMiniProjectHeader,
  PremiumMiniProjectItem,
  PremiumMiniProjectList,
  PremiumMiniProjectMeta,
  PremiumMiniProjectName,
  PremiumMiniProjectPercent,
  PremiumMiniProjectProgressRow,
  PremiumScrollArea,
  PremiumSectionTitle,
  PremiumSummaryBox,
  PremiumSummaryGridFour,
  PremiumSummaryLabel,
  PremiumSummaryValue,
  PremiumOverviewStatCard,
  PremiumOverviewStatGrid,
  PremiumOverviewStatLabel,
  PremiumOverviewStatValue,
  PremiumStatusChip,
  NoDataContainer,
  NoDataTypography,
} from "@styles/DashboardPagePremium.styles";

const getHeatColor = (value) => {
  if (value >= 80) {
    return "#2364B0CC";
  }
  if (value >= 40) {
    return "#2364B066";
  }
  if (value >= 20) {
    return "#2364B033";
  }
  return "#2364B00D";
};

const getProjectStatusLabel = (status) => {
  if (status === "good") {
    return "● Đang thực hiện";
  }
  if (status === "warn") {
    return "◐ Chậm tiến độ";
  }
  return "● Quá hạn";
};

const getSummaryTone = (tone) => {
  if (tone === "danger") {
    return "danger";
  }
  if (tone === "success") {
    return "success";
  }
  return "default";
};



const createTrendSvg = (weeklyTrend) => {
  const trendValues =
    Array.isArray(weeklyTrend) && weeklyTrend.length > 0 ? weeklyTrend : [0];
  const width = 460;
  const height = 160;
  const topPadding = 20;
  const bottomPadding = 20;
  const leftPadding = 28;
  const rightPadding = 8;
  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = height - topPadding - bottomPadding;
  const minValue = 55;
  const maxValue = 100;

  const getX = (index) => {
    if (trendValues.length === 1) {
      return leftPadding + plotWidth / 2;
    }
    return leftPadding + (index / (trendValues.length - 1)) * plotWidth;
  };
  const getY = (value) =>
    topPadding +
    plotHeight -
    ((value - minValue) / (maxValue - minValue)) * plotHeight;

  const points = trendValues
    .map((value, index) => `${getX(index)},${getY(value)}`)
    .join(" ");
  const polygonPoints = `${getX(0)},${height - bottomPadding} ${points} ${getX(trendValues.length - 1)},${height - bottomPadding}`;

  return {
    width,
    height,
    leftPadding,
    rightPadding,
    bottomPadding,
    points,
    polygonPoints,
    getX,
    getY,
  };
};

const PremiumWorkloadProjectsCard = ({ data = {}, onItemClick, dragHandleNode }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const theme = useTheme();
  const safeWeeklyTrend = useMemo(
    () => (Array.isArray(data?.weeklyTrend) ? data.weeklyTrend : []),
    [data?.weeklyTrend]
  );
  const trend = useMemo(
    () => createTrendSvg(safeWeeklyTrend),
    [safeWeeklyTrend]
  );
  const tabs = useMemo(
    () => [
      { id: "overview", label: "Tổng quan" },
      { id: "detail", label: "Chi tiết dự án" },
    ],
    []
  );
  const fontFamily = theme.typography.fontFamily;

  return (
    <PremiumPanelCard title="Workload & Dự án" dragHandleNode={dragHandleNode}>
      <DashboardTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" ? (
        <PremiumScrollArea>
          {(!data?.heatmapValues || data.heatmapValues.length === 0) ? (
            <NoDataContainer>
              <NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
            </NoDataContainer>
          ) : (
            <PremiumContentBody nonePdTop>
              <PremiumOverviewStatGrid>
                {(Array.isArray(data?.overviewStats)
                  ? data.overviewStats
                  : []
                ).map((item) => (
                  <PremiumOverviewStatCard
                    key={item.id}
                    tone={getSummaryTone(item.tone)}
                  >
                    <PremiumOverviewStatValue colorValue={item.color}>
                      {item.value}
                    </PremiumOverviewStatValue>
                    <PremiumOverviewStatLabel>
                      {item.label}
                    </PremiumOverviewStatLabel>
                  </PremiumOverviewStatCard>
                ))}
              </PremiumOverviewStatGrid>

              <WorkloadHeatmap
                title={data.heatmapTitle}
                variant="premium"
                days={data.heatmapDays}
                weekLabels={data.heatmapWeeks}
                values={data.heatmapValues}
                resolveColor={getHeatColor}
                legendColors={data.heatmapLegend}
                showWeekLabels
                showCellValues
              />

              <PremiumSectionTitle stCl="#2364B0">{data.trendTitle}</PremiumSectionTitle>
              <PremiumChartSvgWrap>
                <svg
                  width="100%"
                  viewBox={`0 0 ${trend.width} ${trend.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {[60, 70, 80, 90, 100].map((value) => {
                    const y = trend.getY(value);
                    return (
                      <g key={value}>
                        <line
                          x1={trend.leftPadding}
                          y1={y}
                          x2={trend.width - trend.rightPadding}
                          y2={y}
                          stroke="#EEF0F4"
                          strokeWidth="0.6"
                        />
                        <text
                          x={trend.leftPadding - 4}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="6.5"
                          fill="#8D96A3"
                          fontFamily={fontFamily}
                        >
                          {value}%
                        </text>
                      </g>
                    );
                  })}
                  <line
                    x1={trend.leftPadding}
                    y1={trend.getY(85)}
                    x2={trend.width - trend.rightPadding}
                    y2={trend.getY(85)}
                    stroke="#E53935"
                    strokeWidth="0.7"
                    strokeDasharray="3 2"
                    opacity="0.45"
                  />
                  <text
                    x={trend.width - trend.rightPadding + 2}
                    y={trend.getY(85) + 3}
                    fontSize="5.5"
                    fill="#E53935"
                    fontFamily={fontFamily}
                    opacity="0.7"
                  >
                    85%
                  </text>
                  <defs>
                    <linearGradient
                      id="premiumWorkloadArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#0052CC" stopOpacity="0.15" />
                      <stop
                        offset="100%"
                        stopColor="#0052CC"
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={trend.polygonPoints}
                    fill="url(#premiumWorkloadArea)"
                  />
                  <polyline
                    points={trend.points}
                    fill="none"
                    stroke="#0052CC"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="none"
                  />
                  {safeWeeklyTrend.map((value, index) => (
                    <g key={`point-week-${index + 1}-${value}`}>
                      <circle
                        cx={trend.getX(index)}
                        cy={trend.getY(value)}
                        r="3.5"
                        fill="#fff"
                        stroke="#0052CC"
                        strokeWidth="1.8"
                      />
                      <circle
                        cx={trend.getX(index)}
                        cy={trend.getY(value)}
                        r="1.5"
                        fill="#0052CC"
                      />
                      <text
                        x={trend.getX(index)}
                        y={trend.getY(value) - 7}
                        textAnchor="middle"
                        fontSize="6.5"
                        fontWeight="700"
                        fill="#0052CC"
                        fontFamily={fontFamily}
                      >
                        {value}%
                      </text>
                      <text
                        x={trend.getX(index)}
                        y={trend.height - 6}
                        textAnchor="middle"
                        fontSize="6"
                        fill="#8D96A3"
                        fontFamily={fontFamily}
                      >
                        Tuần {index + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              </PremiumChartSvgWrap>
            </PremiumContentBody>
          )}
        </PremiumScrollArea>
      ) : (
        <PremiumScrollArea>
          {(Array.isArray(data?.projects) ? data.projects : []).length === 0 ? (
            <NoDataContainer>
              <NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
            </NoDataContainer>
          ) : (
            <PremiumContentBody nonePdTop>
              <PremiumSummaryGridFour>
                {(Array.isArray(data?.summary) ? data.summary : []).map(
                  (item) => (
                    <PremiumSummaryBox
                      key={item.id}
                    >
                      <PremiumSummaryValue
                        clText={item.color}
                      >
                        {item.value}
                      </PremiumSummaryValue>
                      <PremiumSummaryLabel>{item.label}</PremiumSummaryLabel>
                    </PremiumSummaryBox>
                  )
                )}
              </PremiumSummaryGridFour>

              <PremiumMiniProjectList>
                {(Array.isArray(data?.projects) ? data.projects : []).map(
                  (project) => (
                    <PremiumMiniProjectItem 
                      key={project.id}
                      onClick={onItemClick ? onItemClick("workloadProjects", project) : undefined}
                      styleCursor={onItemClick}
                    >
                      <PremiumMiniProjectHeader>
                        <PremiumMiniProjectName>
                          {project.name}
                        </PremiumMiniProjectName>
                        <PremiumStatusChip statusType={project.status}>
                          {getProjectStatusLabel(project.status)}
                        </PremiumStatusChip>
                      </PremiumMiniProjectHeader>
                      <PremiumMiniProjectMeta>
                      	👤 {project.people} · 📅 {project.date}  
                      </PremiumMiniProjectMeta>
                      <PremiumMiniProjectProgressRow>
                        <ProgressBar
                          value={project.pct}
                          fillColor={project.color}
                        />
                        <PremiumMiniProjectPercent textColor={project.color}>
                          {project.pct}%
                        </PremiumMiniProjectPercent>
                      </PremiumMiniProjectProgressRow>
                    </PremiumMiniProjectItem>
                  )
                )}
              </PremiumMiniProjectList>
            </PremiumContentBody>
          )}
        </PremiumScrollArea>
      )}
    </PremiumPanelCard>
  );
};

PremiumWorkloadProjectsCard.propTypes = {
  data: PropTypes.object.isRequired,
  onItemClick: PropTypes.func,
  dragHandleNode: PropTypes.node,
};

export default memo(PremiumWorkloadProjectsCard);
