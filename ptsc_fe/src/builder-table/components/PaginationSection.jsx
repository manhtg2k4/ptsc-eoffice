import React, { useContext, useEffect, useState } from "react";
import {
  MenuItem,
  useMediaQuery,
  useTheme,
  PaginationItem,
  Typography,
} from "@mui/material";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { AuthContext } from "@AuthContext/AuthProvider";
import { find } from "lodash";
import {
  PaginationContainer,
  InfoBox,
  StyledPagination,
  RowsPerPageBox,
  DisplayTypography,
  RowsPerPageSelect,
  RowsPerPageStack,
} from "./PaginationSection.styles";

const PaginationSection = ({
  onPaginationChange,
  pagination: propPagination,
}) => {
  const reduxPagination = useSelector((state) => state.formDesign?.pagination);
  const pagination = propPagination || reduxPagination || { page: 1, rowsPerPage: 10, total: 0, totalPages: 1 };
  const { systemParams } = useContext(AuthContext);
  const [rowsPerPageOptions, setRowsPerPageOptions] = useState([10, 25, 50, 100]);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (!systemParams?.data) return;

    const paginationConfig = find(systemParams.data, { type: "pagination" });
    let options = [25, 50, 100];

    if (paginationConfig?.value) {
      options = String(paginationConfig.value)
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
    }

    setRowsPerPageOptions(options);
  }, [systemParams]);

  const handlePageChange = (event, newPage) => {
    const pa = { ...pagination, page: newPage };
    if (onPaginationChange) {
      onPaginationChange(pa);
    }
  };

  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    const newTotalPages = Math.ceil((pagination.total || 0) / newRowsPerPage) || 1;
    const pa = {
      ...pagination,
      rowsPerPage: newRowsPerPage,
      page: 1,
      totalPages: newTotalPages,
    };
    if (onPaginationChange) {
      onPaginationChange(pa);
    }
  };

  const startRecord = (pagination.total === 0 || !pagination.total)
    ? 0
    : (pagination.page - 1) * pagination.rowsPerPage + 1;
  const endRecord = Math.min(
    pagination.page * pagination.rowsPerPage,
    pagination.total || 0
  );

  return (
    <PaginationContainer isCentered={isSmallScreen}>
      <InfoBox isCentered={isSmallScreen}>
        <Typography variant="body2">
          Hiển thị <strong>{startRecord}-{endRecord}</strong> trong tổng số{" "}
          <strong>{pagination.total?.toLocaleString()}</strong> bản ghi
        </Typography>
      </InfoBox>

      <RowsPerPageStack>
        <RowsPerPageBox>
          {!isSmallScreen && <DisplayTypography>Hiển thị</DisplayTypography>}
          <RowsPerPageSelect
            value={pagination.rowsPerPage}
            onChange={handleRowsPerPageChange}
            size="small"
          >
            {rowsPerPageOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </RowsPerPageSelect>
        </RowsPerPageBox>

        <StyledPagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          renderItem={(item) => (
            <PaginationItem
              slots={{ previous: () => "Trước", next: () => "Sau" }}
              {...item}
            />
          )}
          shape="rounded"
          variant="text"
          showFirstButton={false}
          showLastButton={false}
          siblingCount={isSmallScreen ? 0 : 1}
          boundaryCount={1}
        />
      </RowsPerPageStack>
    </PaginationContainer>
  );
};

PaginationSection.displayName = "PaginationSection";
PaginationSection.propTypes = {
  mode: PropTypes.oneOf(["builder", "preview"]),
  onPaginationChange: PropTypes.func.isRequired,
  pagination: PropTypes.shape({
    page: PropTypes.number,
    rowsPerPage: PropTypes.number,
    total: PropTypes.number,
    totalPages: PropTypes.number,
  }),
};

export default PaginationSection;
