import React from "react";
import PropTypes from "prop-types";
import {
  PerformanceWrapper,
  PerformanceHeader,
  PerformanceTitle,
  PerformanceValue,
  StyledLinearProgress,
  PerformanceMetaRow,
  GoalLabel,
  // RemainLabel,
  ProgressWrap,
  RemainLabelOnBar,
} from "@styles/DashboardPage.styles";

const PerformanceSection = ({ data }) => {
  const safeData = data && typeof data === "object" ? data : {};
  const percent = Number.isFinite(Number(safeData.percent))
    ? Math.max(0, Math.min(100, Number(safeData.percent)))
    : 0;

  const title = safeData.title || "Tỷ lệ hoàn thành tháng này";
  const value = safeData.value || `${percent}%`;

  const rawLeft = safeData.leftLabel || "";
  const rawRight = safeData.rightLabel || "";
  const leftHasGoal = /mục tiêu/i.test(rawLeft);
  const rightHasGoal = /mục tiêu/i.test(rawRight);
  const leftHasRemain = /còn thiếu/i.test(rawLeft);
  const rightHasRemain = /còn thiếu/i.test(rawRight);

  const goalLabel = leftHasGoal
    ? rawLeft
    : rightHasGoal
      ? rawRight
      : rawLeft || "Mục tiêu: 85%";
  const remainLabel = leftHasRemain
    ? rawLeft
    : rightHasRemain
      ? rawRight
      : leftHasGoal
        ? rawRight
        : rightHasGoal
          ? rawLeft
          : rawRight || `Còn thiếu ${Math.max(0, 100 - percent)}%`;

  return (
    <PerformanceWrapper>
      <PerformanceHeader>
        <PerformanceTitle>{title}</PerformanceTitle>
        <GoalLabel>{goalLabel}</GoalLabel>
      </PerformanceHeader>

      <PerformanceMetaRow>
        <PerformanceValue bgCl={safeData?.barColor}>{value}</PerformanceValue>
      </PerformanceMetaRow>

      <ProgressWrap>
        <RemainLabelOnBar>{remainLabel}</RemainLabelOnBar>
        <StyledLinearProgress
          variant="determinate"
          value={percent}
          bgCl={safeData?.barColor}
        />
      </ProgressWrap>
    </PerformanceWrapper>
  );
};

PerformanceSection.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string,
    value: PropTypes.string,
    percent: PropTypes.number,
    leftLabel: PropTypes.string,
    rightLabel: PropTypes.string,
  }).isRequired,
};

export default PerformanceSection;
