import React, { useMemo, useState, memo } from "react";
import PropTypes from "prop-types";
import PremiumPanelCard from "./PremiumPanelCard";
import ProgressBar from "./ProgressBar";
import DashboardTabs from "./DashboardTabs";
import { Tooltip } from "@mui/material";
import {
  PremiumBarContent,
  PremiumBarChartWrap,
  PremiumBarFill,
  PremiumBarName,
  PremiumBarRow,
  PremiumBarTargetLine,
  PremiumBarTrack,
  PremiumBarValue,
  PremiumContentBody,
  PremiumDeptAvatar,
  PremiumDeptHead,
  PremiumDeptHeaderCell,
  PremiumDeptName,
  PremiumDeptNameWrap,
  PremiumDeptTable,
  PremiumDeptTableHeader,
  PremiumDeptTableRow,
  PremiumLegendDot,
  PremiumLegendItem,
  PremiumLegendNote,
  PremiumLegendRow,
  PremiumRatioMuted,
  PremiumRatioStrong,
  PremiumRatioText,
  PremiumScrollArea,
  PremiumStatusChip,
} from "@styles/DashboardPagePremium.styles";

const getShortName = (name) =>
  name.replace("Phòng ", "P.").replace("Ban ", "B.").replace("Văn phòng ", "VP ");

const getInitials = (name) =>
  name.replace("Phòng ", "").replace("Ban ", "").replace("Văn phòng ", "").slice(0, 2).toUpperCase();

const getStatusLabel = (status) => {
  if (status === "good") {
    return "● Tốt";
  }
  if (status === "warn") {
    return "◐ Cần chú ý";
  }
  return "● Chậm";
};

const getPerfColor = (perf) => {
  if (perf >= 85) {
    return "#2E7D32";
  }
  if (perf >= 75) {
    return "#F57C00";
  }
  return "#E53935";
};

const PremiumDepartmentPerformanceCard = ({ data, onItemClick, dragHandleNode }) => {
  const [activeTab, setActiveTab] = useState("overview");

  const sortedDepartments = useMemo(
    () => [...(Array.isArray(data?.departments) ? data.departments : [])].sort((a, b) => b.perf - a.perf),
    [data?.departments]
  );

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Tổng quan" },
      { id: "detail", label: "Chi tiết" },
    ],
    []
  );

  return (
    <PremiumPanelCard title="Hiệu suất các phòng ban" dragHandleNode={dragHandleNode}>
      <DashboardTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="premium" />

      {activeTab === "overview" ? (
        <PremiumScrollArea>
          <PremiumContentBody nonePdTop>
            <PremiumBarChartWrap>
              {sortedDepartments.map((department) => {
                const barColor = getPerfColor(department.perf);
                return (
                  <PremiumBarRow 
                    key={department.id}
                    onClick={onItemClick ? onItemClick("departmentPerformance", department) : undefined}
                    styleCursor={onItemClick}
                  >
                    <PremiumBarContent>
                      <Tooltip title={department.name} placement="top" arrow>
                        <PremiumBarName>{getShortName(department.name)}</PremiumBarName>
                      </Tooltip>
                      <PremiumBarTrack>
                        <PremiumBarFill fillWidth={department.perf} fillColor={barColor} />
                        <PremiumBarTargetLine positionLeft={data.target} />
                      </PremiumBarTrack>
                    </PremiumBarContent>
                    <PremiumBarValue textColor={barColor}>{department.perf}%</PremiumBarValue>
                  </PremiumBarRow>
                );
              })}
            </PremiumBarChartWrap>

            <PremiumLegendRow>
              {(Array.isArray(data?.overviewLegend) ? data.overviewLegend : []).map((item) => (
                <PremiumLegendItem key={item.id}>
                  <PremiumLegendDot dotColor={item.color} />
                  {item.label}
                </PremiumLegendItem>
              ))}
              <PremiumLegendNote>Mục tiêu: 85% ─ ─</PremiumLegendNote>
            </PremiumLegendRow>
          </PremiumContentBody>
        </PremiumScrollArea>
      ) : (
        <PremiumScrollArea>
          <PremiumDeptTable>
            <PremiumDeptTableHeader>
              <PremiumDeptHeaderCell>Phòng ban</PremiumDeptHeaderCell>
              <PremiumDeptHeaderCell>Hoàn thành CV</PremiumDeptHeaderCell>
              <PremiumDeptHeaderCell>Tiến độ</PremiumDeptHeaderCell>
              <PremiumDeptHeaderCell>Hiệu suất</PremiumDeptHeaderCell>
              <PremiumDeptHeaderCell>Trạng thái</PremiumDeptHeaderCell>
            </PremiumDeptTableHeader>

            {(Array.isArray(data?.departments) ? data.departments : []).map((department) => {
              const perfColor = getPerfColor(department.perf);
              return (
                <PremiumDeptTableRow 
                  key={department.id}
                  onClick={onItemClick ? onItemClick("departmentPerformance", department) : undefined}
                  styleCursor={onItemClick}
                >
                  <PremiumDeptNameWrap>
                    <PremiumDeptAvatar avatarColor={department.color}>
                      {getInitials(department.name)}
                    </PremiumDeptAvatar>
                    <div>
                      <Tooltip title={department.name} placement="top" arrow>
                        <PremiumDeptName>{department.name}</PremiumDeptName>
                      </Tooltip>
                      <PremiumDeptHead>{department.head}</PremiumDeptHead>
                    </div>
                  </PremiumDeptNameWrap>

                  <PremiumRatioText>
                    <PremiumRatioStrong>{department.done}</PremiumRatioStrong>
                    <PremiumRatioMuted> / {department.total}</PremiumRatioMuted>
                  </PremiumRatioText>

                  <ProgressBar value={department.perf} fillColor={perfColor} />

                  <PremiumBarValue textColor={perfColor}>{department.perf}%</PremiumBarValue>

                  <PremiumStatusChip statusType={department.status}>
                    {getStatusLabel(department.status)}
                  </PremiumStatusChip>
                </PremiumDeptTableRow>
              );
            })}
          </PremiumDeptTable>
        </PremiumScrollArea>
      )}
    </PremiumPanelCard>
  );
};

PremiumDepartmentPerformanceCard.propTypes = {
  data: PropTypes.object.isRequired,
  onItemClick: PropTypes.func,
  dragHandleNode: PropTypes.node,
};

export default memo(PremiumDepartmentPerformanceCard);
