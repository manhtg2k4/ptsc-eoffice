import React, { memo } from "react";
import PropTypes from "prop-types";
import LeadPanelCard from "./LeadPanelCard";
import ProgressBar from "./ProgressBar";
import WorkloadHeatmap from "./WorkloadHeatmap";
import {
  LeadProjectHeader,
  LeadProjectItem,
  LeadProjectMeta,
  LeadProjectMetaHighlight,
  LeadProjectName,
  LeadProjectProgress,
  LeadProjectProgressText,
  LeadProjectStatus,
  ProjectList,
  SectionDividerTop,
  NoDataContainer,
  NoDataTypography,
} from "@styles/DashboardPageMedium.styles";

const getHeatColor = (value) => {
  if (value < 25) return "#2364B00D";
  if (value < 50) return "#2364B01A";
  if (value < 70) return "#2364B033";
  if (value < 85) return "#2364B066";
  return "#2364B0CC";
};

const LeadHeatmapProjectsCard = ({ heatmap, projects, onItemClick, dragHandleNode }) => {
  const safeHeatmap = heatmap && typeof heatmap === "object" ? heatmap : {};
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <LeadPanelCard title="HEATMAP & DỰ ÁN" dragHandleNode={dragHandleNode}>
      <WorkloadHeatmap
        title="HEATMAP 4 TUẦN QUA (% THEO NGÀY)"
        variant="medium"
        days={safeHeatmap.days}
				values={safeHeatmap.values}
				weekLabels={safeHeatmap.heatmapWeeks}
        resolveColor={getHeatColor}
        legendColors={["#2364B00D", "#2364B01A", "#2364B033", "#2364B066", "#2364B0CC"]}
      	showWeekLabels
			/>

      <SectionDividerTop>
        <LeadProjectName>DỰ ÁN ĐANG THỰC HIỆN</LeadProjectName>
      </SectionDividerTop>

      <ProjectList>
        {safeProjects.length === 0 ? (
          <NoDataContainer>
            <NoDataTypography>Chưa có dữ liệu hiển thị</NoDataTypography>
          </NoDataContainer>
        ) : (
          safeProjects.map((item) => (
            <LeadProjectItem 
              key={item.id}
              onClick={onItemClick ? onItemClick("projects", item) : undefined}
              styleCursor={onItemClick}
            >
              <LeadProjectHeader>
                <LeadProjectName>{item.name}</LeadProjectName>
                <LeadProjectStatus statusType={item.statusType}>● {item.statusText}</LeadProjectStatus>
              </LeadProjectHeader>
              <LeadProjectMeta>
                <span>{item.dateRange}</span>
                <span>
                  {item.membersText} <LeadProjectMetaHighlight>{item.memberHighlight}</LeadProjectMetaHighlight>
                </span>
              </LeadProjectMeta>
              <LeadProjectProgress>
                <ProgressBar value={item.progress} fillColor={item.progressColor} />
                <LeadProjectProgressText textColor={item.progressColor}>{item.progress}%</LeadProjectProgressText>
              </LeadProjectProgress>
            </LeadProjectItem>
          ))
        )}
      </ProjectList>
    </LeadPanelCard>
  );
};

LeadHeatmapProjectsCard.propTypes = {
  heatmap: PropTypes.object.isRequired,
  projects: PropTypes.array.isRequired,
  dragHandleNode: PropTypes.node,
};

export default memo(LeadHeatmapProjectsCard);
