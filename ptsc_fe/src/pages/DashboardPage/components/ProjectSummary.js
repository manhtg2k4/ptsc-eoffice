import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import {
  ProjectSummaryItemBox,
  ProjectSummaryValue,
  ProjectSummaryLabel,
} from "@styles/DashboardPage.styles";

const ProjectSummary = ({ data = [] }) => {
  const summaryItems = Array.isArray(data) ? data : [];

  return (
    <Grid container spacing={1.5} mb={2.25}>
      {summaryItems.map((item) => (
        <Grid item xs={6} md={6} key={`${item.label || "summary"}-${item.value || ""}`}>
          <ProjectSummaryItemBox>
            <ProjectSummaryValue valueColor={item.color || "blue"}>
              {item.value}
            </ProjectSummaryValue>
            <ProjectSummaryLabel textCl={item.textColor || "#6B7280"}>{item.label}</ProjectSummaryLabel>
          </ProjectSummaryItemBox>
        </Grid>
      ))}
    </Grid>
  );
};

ProjectSummary.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
			color: PropTypes.string,
			textColor: PropTypes.string,
    })
  ),
};

export default ProjectSummary;
