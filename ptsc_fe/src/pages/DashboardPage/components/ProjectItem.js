import React from "react";
import PropTypes from "prop-types";
import ProgressBar from "./ProgressBar";
import {
  Assignment,
  AccessTime,
  BusinessCenter,
  Groups,
} from "@mui/icons-material";
import {
  ProjectItemWrapper,
  ProjectItemHeader,
  ProjectItemName,
  ProjectContentBox,
  ProjectMetaRow,
  ProjectMetaProgressRow,
  ProjectMetaItem,
  ProjectItemMetaText,
  ProjectDeadlineText,
  ProjectItemStatusChip,
  ProjectProgressValue,
  DashboardIconBox,
  themeColors,
} from "@styles/DashboardPage.styles";

const ProjectItem = ({ data, onClick }) => {
  const chipColor =
    data.statusColor === "danger"
      ? "#FF5A52"
      : data.statusColor === "warning"
      ? "#8B6AD3"
      : "#2364B0";
  const progressBg =
    data.statusColor === "danger"
      ? "linear-gradient(90deg, #EF5350, #F47C7A)"
      : data.statusColor === "warning"
      ? "linear-gradient(135deg, #896BC6 0%, #A78BDF 100%)"
      : "linear-gradient(135deg, #2364B0 0%, #4A8AD4 100%)";

  return (
    <ProjectItemWrapper onClick={onClick} styleCursor={onClick} >
      <ProjectItemHeader>
        <ProjectContentBox>
          <ProjectItemName>{data.name}</ProjectItemName>
        </ProjectContentBox>

        <ProjectItemStatusChip
          label={data.statusText}
          size="small"
          chipColor={chipColor}
        />
      </ProjectItemHeader>

      <ProjectMetaProgressRow>
        <ProjectMetaRow spacing={1.5} useFlexGap>
          <ProjectMetaItem spacing={0.5}>
            {data.role === "Chủ trì" ? (
              <DashboardIconBox styledColor={themeColors.primary} styledFontSize={14}>
                <BusinessCenter />
              </DashboardIconBox>
            ) : (
              <DashboardIconBox styledColor={themeColors.primary} styledFontSize={14}>
                <Groups />
              </DashboardIconBox>
            )}
            <ProjectItemMetaText>{data.role}</ProjectItemMetaText>
          </ProjectMetaItem>

          <ProjectMetaItem spacing={0.5}>
            <DashboardIconBox styledColor={themeColors.secondary} styledFontSize={14}>
              <Assignment />
            </DashboardIconBox>
            <ProjectItemMetaText>{data.tasks}</ProjectItemMetaText>
          </ProjectMetaItem>

          <ProjectMetaItem spacing={0.5}>
            <DashboardIconBox
              styledColor={
                data.statusColor === "danger"
                  ? themeColors.danger
                  : data.statusColor === "warning"
                  ? "#e67e22"
                  : themeColors.textMuted
              }
              styledFontSize={14}
            >
              <AccessTime />
            </DashboardIconBox>
            <ProjectDeadlineText
              styledTextColor={
                data.statusColor === "danger"
                  ? themeColors.danger
                  : data.statusColor === "warning"
                  ? "#e67e22"
                  : themeColors.textMuted
              }
            >
              {data.deadline}
            </ProjectDeadlineText>
          </ProjectMetaItem>
        </ProjectMetaRow>

        <ProjectProgressValue>{data.progress}%</ProjectProgressValue>
      </ProjectMetaProgressRow>

      <ProgressBar value={data.progress} fillColor={progressBg} radius={999} styledHeight={8} />
    </ProjectItemWrapper>
  );
};

ProjectItem.propTypes = {
  data: PropTypes.shape({
    name: PropTypes.string,
    role: PropTypes.string,
    tasks: PropTypes.string,
    deadline: PropTypes.string,
    statusText: PropTypes.string,
    statusColor: PropTypes.string,
    progress: PropTypes.number,
  }).isRequired,
};

export default ProjectItem;
