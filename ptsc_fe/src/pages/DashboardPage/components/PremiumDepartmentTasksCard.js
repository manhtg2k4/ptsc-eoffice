import React, { useMemo, memo } from "react";
import PropTypes from "prop-types";
import { Tooltip } from "@mui/material";
import PremiumPanelCard from "./PremiumPanelCard";
import {
  PremiumContentBody,
  PremiumLegendDot,
  PremiumLegendItem,
  PremiumTaskStackLegend,
  PremiumStackedBarRow,
  PremiumStackedBarColumn,
  PremiumStackedBarHead,
  PremiumStackedLabel,
  PremiumStackedSegment,
  PremiumStackedTrack,
  PremiumStackedValue,
} from "@styles/DashboardPagePremium.styles";

const toSafeNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const getSegmentWidth = (value, maxValue) => {
  if (maxValue <= 0 || value <= 0) {
    return 0;
  }
  const rawPercent = (value / maxValue) * 100;
  return Math.max(rawPercent, 1.2);
};

const PremiumDepartmentTasksCard = ({ data, onItemClick, dragHandleNode }) => {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const maxTotal = useMemo(
    () =>
      safeData.length > 0
        ? Math.max(
            ...safeData.map(
              (item) =>
                toSafeNumber(item.done) +
                toSafeNumber(item.doing) +
                toSafeNumber(item.soon) +
                toSafeNumber(item.late)
            )
          )
        : 1,
    [safeData]
  );

  return (
    <PremiumPanelCard title="Công việc theo phòng ban" dragHandleNode={dragHandleNode}>
      <PremiumContentBody>
        {safeData.map((item) => {
          const done = toSafeNumber(item.done);
          const doing = toSafeNumber(item.doing);
          const soon = toSafeNumber(item.soon);
          const late = toSafeNumber(item.late);
          const total = done + doing + soon + late;
          const safeMaxTotal = Math.max(maxTotal, 1);

          return (
            <PremiumStackedBarRow 
              key={item.id}
              onClick={onItemClick ? onItemClick("departmentTasks", item) : undefined}
              styleCursor={onItemClick}
            >
              <PremiumStackedBarColumn>
                <PremiumStackedBarHead>
                  <Tooltip title={item.name} placement="top" arrow>
                    <PremiumStackedLabel>{item.name}</PremiumStackedLabel>
                  </Tooltip>
                  <PremiumStackedValue>{total}</PremiumStackedValue>
                </PremiumStackedBarHead>
                <PremiumStackedTrack
                  trackHeight={6}
                  trackRadius={999}
                  trackFlex="none"
                  trackWidth="100%"
                >
                  <PremiumStackedSegment
                    segmentWidth={getSegmentWidth(done, safeMaxTotal)}
                    segmentColor="#23B02F"
                  />
                  <PremiumStackedSegment
                    segmentWidth={getSegmentWidth(doing, safeMaxTotal)}
                    segmentColor="#2364B0"
                  />
                  <PremiumStackedSegment
                    segmentWidth={getSegmentWidth(soon, safeMaxTotal)}
                    segmentColor="#FF9B4F"
                  />
                  <PremiumStackedSegment
                    segmentWidth={getSegmentWidth(late, safeMaxTotal)}
                    segmentColor="#EF5350"
                  />
                </PremiumStackedTrack>
              </PremiumStackedBarColumn>
            </PremiumStackedBarRow>
          );
        })}

        <PremiumTaskStackLegend>
          <PremiumLegendItem>
            <PremiumLegendDot dotColor="#23B02F" />
            Hoàn thành
          </PremiumLegendItem>
          <PremiumLegendItem>
            <PremiumLegendDot dotColor="#2364B0" />
            Đang làm
          </PremiumLegendItem>
          <PremiumLegendItem>
            <PremiumLegendDot dotColor="#FF9B4F" />
            Sắp hạn
          </PremiumLegendItem>
          <PremiumLegendItem>
            <PremiumLegendDot dotColor="#EF5350" />
            Quá hạn
          </PremiumLegendItem>
        </PremiumTaskStackLegend>
      </PremiumContentBody>
    </PremiumPanelCard>
  );
};

PremiumDepartmentTasksCard.propTypes = {
  data: PropTypes.array.isRequired,
  onItemClick: PropTypes.func,
  dragHandleNode: PropTypes.node,
};

export default memo(PremiumDepartmentTasksCard);
