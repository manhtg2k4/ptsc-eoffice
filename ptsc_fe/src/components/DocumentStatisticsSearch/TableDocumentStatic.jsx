import React, { memo } from 'react'
import {
  StyledTableContainer,
  StyledTable,
  StyledTableHead,
  StyledTableHeaderRow,
  StyledTableBodyRow,
  StyledTableHeaderCell,
  StyledTableBodyCell,
  StyledTableBody,
  StyledEmptyCell,
} from '@styles/DocumentStatisticsSearch/DocumentStatisticsSearch.styled';
import PropTypes from 'prop-types';

function TableDocumentStatic(props) {
  const { tableData } = props;
 
  return (
    <StyledTableContainer>
      <StyledTable>
        <StyledTableHead>
          <StyledTableHeaderRow>
            <StyledTableHeaderCell rowSpan={2}>STT</StyledTableHeaderCell>
            <StyledTableHeaderCell rowSpan={2}>Tên đơn vị</StyledTableHeaderCell>
            <StyledTableHeaderCell rowSpan={2}>Tổng nhiệm vụ</StyledTableHeaderCell>
            <StyledTableHeaderCell colSpan={4}>NV Chưa hoàn thành (đạt tỷ lệ %)</StyledTableHeaderCell>
            <StyledTableHeaderCell colSpan={4}>NV Đã hoàn thành (đạt tỷ lệ %)</StyledTableHeaderCell>
          </StyledTableHeaderRow>
          <StyledTableHeaderRow>
            <StyledTableHeaderCell>Số nhiệm vụ</StyledTableHeaderCell>
            <StyledTableHeaderCell>Không hạn</StyledTableHeaderCell>
            <StyledTableHeaderCell>Quá hạn</StyledTableHeaderCell>
            <StyledTableHeaderCell>Trong hạn</StyledTableHeaderCell>
            <StyledTableHeaderCell>Số nhiệm vụ</StyledTableHeaderCell>
            <StyledTableHeaderCell>Không hạn</StyledTableHeaderCell>
            <StyledTableHeaderCell>Quá hạn</StyledTableHeaderCell>
            <StyledTableHeaderCell>Trong hạn</StyledTableHeaderCell>
          </StyledTableHeaderRow>
        </StyledTableHead>
        <StyledTableBody>
          {tableData?.length === 0 ? (
            <StyledTableBodyRow>
              <StyledEmptyCell colSpan={11}>
                Không có dữ liệu
              </StyledEmptyCell>
            </StyledTableBodyRow>
          ) : (
            tableData?.map((row, index) => (
              <StyledTableBodyRow key={row._id} index={index}>
                <StyledTableBodyCell>{index + 1}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.nameOrg || row._id}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.count}</StyledTableBodyCell>

                {/* Chưa hoàn thành */}
                <StyledTableBodyCell>{row.countNoComplete}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countNoCompleteNoDeadline}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countNoCompleteOutDeadline}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countNoCompleteInDeadline}</StyledTableBodyCell>

                {/* Đã hoàn thành */}
                <StyledTableBodyCell>{row.countComplete}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countCompleteNoDeadline}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countCompleteOutDeadline}</StyledTableBodyCell>
                <StyledTableBodyCell>{row.countCompleteInDeadline}</StyledTableBodyCell>
              </StyledTableBodyRow>
            ))
          )}
        </StyledTableBody>
      </StyledTable>
      </StyledTableContainer>
  );
}


TableDocumentStatic.propTypes = {
  tableData: PropTypes.array,
};
 
TableDocumentStatic.displayName = 'TableDocumentStatic';

export default memo(TableDocumentStatic);