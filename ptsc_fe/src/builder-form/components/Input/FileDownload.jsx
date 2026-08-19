// FileDownload.jsx
import React from "react";
import { Grid, Tooltip } from "@mui/material";
import PropTypes from "prop-types";
import {
  DownloadLabelTypography,
  DownloadBox,
  DownloadContentGrid,
  StyledIconButton,
  StyledDownloadIcon,
  FileNameTypography,
} from "./FileDownload.styles";

const FileDownload = ({ item, label }) => {
  const downloadUrl = item?.props?.url || "#";

  return (
    <Grid item xs={12} sm={12}>
      <DownloadLabelTypography>{label || "File excel mẫu"}</DownloadLabelTypography>
      <DownloadBox>
        <DownloadContentGrid>
          <Tooltip title="Tải file excel mẫu">
            <StyledIconButton
              component="a"
              href={downloadUrl}
              download
              disabled={!item?.props?.url}
            >
              <StyledDownloadIcon />
            </StyledIconButton>
          </Tooltip>
          <Grid>
            <FileNameTypography variant="body2">File excel mẫu</FileNameTypography>
          </Grid>
        </DownloadContentGrid>
      </DownloadBox>
    </Grid>
  );
};

FileDownload.propTypes = {
  item: PropTypes.object,
  label: PropTypes.string,
};

export default FileDownload;
