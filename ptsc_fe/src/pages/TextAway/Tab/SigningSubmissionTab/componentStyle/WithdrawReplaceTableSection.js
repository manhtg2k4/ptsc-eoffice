import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
	Collapse,
	TableBody,
	// Tooltip,
	// IconButton,
	Link
} from "@mui/material";
import {
  KeyboardArrowDown,
  KeyboardArrowRight,
  // RemoveRedEyeOutlined as ViewIcon,
  // GetApp as DownloadIcon,
} from "@mui/icons-material";
// import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import {
  DraftSectionContainer,
  SectionHeader,
  SectionTitle,
  CollapseContent,
  TableContainer,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  StyledTableCell,
  EmptyTableRow,
  EmptyTableCell,
} from "./DraftSection.styles";

// const StyledActionIconButton = styled(IconButton)(({ theme }) => ({
//   padding: theme.spacing(0.5),
// }));

// const StyledViewIcon = styled(ViewIcon)(({ theme }) => ({
//   color: theme.palette.primary.main,
// }));

// const StyledDownloadIcon = styled(DownloadIcon)(({ theme }) => ({
//   color: theme.palette.success.main,
// }));

function WithdrawReplaceTableSection({
  title,
  data,
  onPreview,
  // onDownload,
  openContent,
}) {
  const [open, setOpen] = useState(openContent || false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Tạo hàm xử lý cho sự kiện click xem trước
  const handlePreviewClick = useCallback(
    (file) => () => {
      if (onPreview) onPreview(file);
    },
    [onPreview]
  );

  // Tạo hàm xử lý cho sự kiện click tải xuống
  // const handleDownloadClick = useCallback(
  //   (file) => () => {
  //     if (onDownload) onDownload(file);
  //   },
  //   [onDownload]
  // );

  return (
    <DraftSectionContainer>
      {!openContent && (
        <SectionHeader onClick={handleToggle}>
          {open ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
          <SectionTitle variant="subtitle2">{title}</SectionTitle>
        </SectionHeader>
      )}

      <Collapse in={open}>
        <CollapseContent>
          <TableContainer>
            <StyledTable size="small">
              <StyledTableHead>
                <StyledTableRow>
                  <StyledTableCell>Số ký hiệu văn bản</StyledTableCell>
                  <StyledTableCell>Ngày ban hành</StyledTableCell>
                  <StyledTableCell>Trích yếu</StyledTableCell>
                  <StyledTableCell>File dự thảo</StyledTableCell>
                  {/* <StyledTableCell>Xem chi tiết</StyledTableCell> */}
                  {/* <StyledTableCell>Tải file</StyledTableCell> */}
                </StyledTableRow>
              </StyledTableHead>
              <TableBody>
                {!data || data.length === 0 ? (
                  <EmptyTableRow>
                    <EmptyTableCell colSpan={6} align="center">
                      Không có dữ liệu
                    </EmptyTableCell>
                  </EmptyTableRow>
                ) : (
                  data.map((row) => {
                    const file =
                      row.files &&
                      Array.isArray(row.files) &&
                      row.files.length > 0
                        ? row.files[0]
                        : null;
                    return (
                      <StyledTableRow key={row._id || row.documentId}>
                        <StyledTableCell>
                          {row.toBookTextSymbols}
                        </StyledTableCell>
                        <StyledTableCell>
                          {row.release_date
                            ? dayjs(row.release_date).format("DD/MM/YYYY")
                            : "N/A"}
                        </StyledTableCell>
                        <StyledTableCell>{row.abstract_note}</StyledTableCell>
                        <StyledTableCell>
                          <Link
                            component="button"
                            variant="body2"
                            onClick={handlePreviewClick(file)}
                          >
                            {file?.fileName || "N/A"}
                          </Link>
                        </StyledTableCell>
                        {/* <StyledTableCell>
                          {file && onPreview && (
                            <Tooltip title="Xem chi tiết">
                              <StyledActionIconButton
                                onClick={handlePreviewClick(file)}
                              >
                                <StyledViewIcon />
                              </StyledActionIconButton>
                            </Tooltip>
                          )}
                        </StyledTableCell> */}
                        {/* <StyledTableCell>
                          {file && onDownload && (
                            <Tooltip title="Tải xuống">
                              <StyledActionIconButton
                                onClick={handleDownloadClick(file)}
                              >
                                <StyledDownloadIcon />
                              </StyledActionIconButton>
                            </Tooltip>
                          )}
                        </StyledTableCell> */}
                      </StyledTableRow>
                    );
                  })
                )}
              </TableBody>
            </StyledTable>
          </TableContainer>
        </CollapseContent>
      </Collapse>
    </DraftSectionContainer>
  );
}

WithdrawReplaceTableSection.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.array,
  isView: PropTypes.bool,
  openContent: PropTypes.bool,
  onPreview: PropTypes.func,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
};

WithdrawReplaceTableSection.defaultProps = {
  data: [],
  isView: false,
  onPreview: () => {},
  onDownload: () => {},
  onDelete: () => {},
};

export default WithdrawReplaceTableSection;
