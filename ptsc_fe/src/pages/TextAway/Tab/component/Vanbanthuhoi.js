
import React from 'react';
import { TableBody, TableHead, TableRow, Paper } from '@mui/material';
import { StyledHeaderCell, StyledTable, StyledTableContainer } from './Vanbanthuhoi.style';

const VanBanThuHoiTable = () => {
  return (
    <StyledTableContainer component={Paper}>
      <StyledTable aria-label="simple table">
        <TableHead>
          <TableRow>
            <StyledHeaderCell>
              Số ký hiệu văn bản
            </StyledHeaderCell>

            <StyledHeaderCell>
              Ngày ban hành
            </StyledHeaderCell>

            <StyledHeaderCell>
              Trích yếu
            </StyledHeaderCell>

            <StyledHeaderCell align="center">
              File dự thảo
            </StyledHeaderCell>

            <StyledHeaderCell align="center">
              Xem chi tiết
            </StyledHeaderCell>

            <StyledHeaderCell align="center">
              Tải file
            </StyledHeaderCell>

            <StyledHeaderCell align="center">
              Hành động
            </StyledHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Các dòng dữ liệu sẽ được thêm vào đây */}
        </TableBody>
      </StyledTable>
    </StyledTableContainer>
  );
};

export default VanBanThuHoiTable;