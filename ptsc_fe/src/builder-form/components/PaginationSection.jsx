import React from "react";
import {
  MenuItem,
  PaginationItem,
  // Stack,
} from "@mui/material";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  PaginationContainer,
  InfoBox,
  TotalTypography,
  RecordRangeTypography,
  StyledPagination,
  RowsPerPageBox,
  DisplayTypography,
  RowsPerPageSelect,
  RowsStack,
} from "./PaginationSection.styles";

const PaginationSection = ({
  // pagination = {
  //     total: 0,
  //     page: 1,
  //     rowsPerPage: 25,
  //     totalPages: 1,
  // },
  // mode = 'builder',
  onPaginationChange,
}) => {
  const pagination = useSelector((state) => state.formDesign.pagination);

  const handlePageChange = (event, newPage) => {
    const pa = { ...pagination, page: newPage };
    onPaginationChange(pa);
  };

  const handleRowsPerPageChange = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    const newTotalPages = Math.ceil(pagination.total / newRowsPerPage);
    const pa = {
      ...pagination,
      rowsPerPage: newRowsPerPage,
      page: 1,
      totalPages: newTotalPages,
    };
    onPaginationChange(pa);
  };

  const startRecord = (pagination.page - 1) * pagination.rowsPerPage + 1;
  const endRecord = Math.min(
    pagination.page * pagination.rowsPerPage,
    pagination.total
  );

	const rowsPerPageOptions = [25, 50, 100];
	
	// useEffect(() => {
  //   onPaginationChange(pagination);
  // }, []);

  return (
    <PaginationContainer>
      <InfoBox>
        <TotalTypography>Tổng {pagination.total}</TotalTypography>
        <RecordRangeTypography>
          {`${startRecord}-${endRecord} bản ghi`}
        </RecordRangeTypography>
      </InfoBox>

      <RowsStack direction="row" spacing={1}>
        <StyledPagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          shape="rounded"
          variant="outlined"
          siblingCount={1}
          boundaryCount={1}
          showFirstButton={false}
          showLastButton={false}
          renderItem={(item) => {
            if (item.type === "previous") {
              return <PaginationItem {...item} component="span" page="<" />;
            }
            if (item.type === "next") {
              return <PaginationItem {...item} component="span" page=">" />;
            }
            if (
              item.type === "end-ellipsis" ||
              item.type === "start-ellipsis"
            ) {
              return <PaginationItem {...item} component="span" page="..." />;
            }
            return <PaginationItem {...item} />;
          }}
        />
      </RowsStack>

      <RowsPerPageBox>
        <DisplayTypography>Hiển thị</DisplayTypography>
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
    </PaginationContainer>
  );
};

PaginationSection.displayName = "PaginationSection";
PaginationSection.propTypes = {
  mode: PropTypes.oneOf(["builder", "preview"]),
  onPaginationChange: PropTypes.func.isRequired,
};

export default PaginationSection;
