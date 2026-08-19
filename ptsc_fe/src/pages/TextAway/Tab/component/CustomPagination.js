import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Typography,
  styled,
  Button,
} from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';

const PaginationContainer = styled(Box)(({ theme, styleJustifyContent }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent:styleJustifyContent ? 'flex-end' : 'flex-end',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  padding: theme.spacing(1),
  fontSize: '14px',
  flexWrap: 'wrap',
}));

const PaginationText = styled(Typography)(() => ({
  fontSize: '14px',
  whiteSpace: 'nowrap',
}));

const PageNumbersBox = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

const PageButton = styled(Button)(({ theme, active }) => ({
  minWidth: '32px',
  height: '32px',
  padding: '0',
  fontSize: '14px',
  backgroundColor: active ? theme.palette.primary.main : 'transparent',
  color: active ? 'white' : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.hover,
  },
}));

const EllipsisText = styled(Typography)(() => ({
  fontSize: '14px',
  padding: '0 4px',
  minWidth: '32px',
  textAlign: 'center',
}));

const StyledSelect = styled(Select)(() => ({
  height: 32,
  fontSize: '14px',
  '& .MuiSelect-select': {
    padding: '6px 24px 6px 8px !important',
  },
}));

const StyledIconButton = styled(IconButton)(() => ({
  padding: '4px',
}));

const StyledArrowBackIosNew = styled(ArrowBackIosNew)(() => ({
  fontSize: 14,
}));

const StyledArrowForwardIos = styled(ArrowForwardIos)(() => ({
  fontSize: 14,
}));

const PaginationControlsWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const RowsPerPageControlsWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

const PreviousPageButton = ({ page, handlePageClick }) => {
  const handleClick = useCallback(() => {
    handlePageClick(page - 1);
  }, [page, handlePageClick]);

  return (
    <StyledIconButton size="small" onClick={handleClick} disabled={page === 1}>
      <StyledArrowBackIosNew />
    </StyledIconButton>
  );
};

PreviousPageButton.propTypes = {
  page: PropTypes.number.isRequired,
  handlePageClick: PropTypes.func.isRequired,
};

const NextPageButton = ({ page, totalPages, handlePageClick }) => {
  const handleClick = useCallback(() => {
    handlePageClick(page + 1);
  }, [page, totalPages, handlePageClick]);

  return (
    <StyledIconButton
      size="small"
      onClick={handleClick}
      disabled={page === totalPages}
    >
      <StyledArrowForwardIos />
    </StyledIconButton>
  );
};

NextPageButton.propTypes = { 
  page: PropTypes.number.isRequired, 
  totalPages: PropTypes.number.isRequired,
  handlePageClick: PropTypes.func.isRequired 
};

const CustomPagination = ({
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 20, 25, 50, 100],
  styleJustifyContent
}) => {
  const totalPages = Math.ceil(total / rowsPerPage);

  const startRecord = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endRecord = Math.min(page * rowsPerPage, total);

  const handlePageClick = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  }, [totalPages, page, onPageChange]);

  // Logic hiển thị các trang với ellipsis (...)
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsisThreshold = 7; // Hiển thị ellipsis khi có > 7 trang

    if (totalPages <= showEllipsisThreshold) {
      // Nếu tổng số trang <= 7, hiển thị tất cả
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Luôn hiển thị trang 1
      pages.push(1);

      // Logic hiển thị các trang giữa
      if (page <= 3) {
        // Nếu đang ở đầu: 1, 2, 3, 4, ..., last
        pages.push(2, 3, 4);
        pages.push('ellipsis-end');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        // Nếu đang ở cuối: 1, ..., last-3, last-2, last-1, last
        pages.push('ellipsis-start');
        pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Nếu ở giữa: 1, ..., current-1, current, current+1, ..., last
        pages.push('ellipsis-start');
        pages.push(page - 1, page, page + 1);
        pages.push('ellipsis-end');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleRowsPerPageChange = useCallback((event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    onRowsPerPageChange(newRowsPerPage);
  }, [onRowsPerPageChange]);

  return (
    <PaginationContainer styleJustifyContent={styleJustifyContent}>
      {/* Tổng số bản ghi */}
      <PaginationText>
        Tổng {total} {total > 0 ? `${startRecord}-${endRecord}` : '0'} bản ghi
      </PaginationText>

      {/* Các số trang + prev/next */}
      <PaginationControlsWrapper>
        <PreviousPageButton page={page} handlePageClick={handlePageClick} />

        <PageNumbersBox>
          {getPageNumbers().map((p, index) => {
            if (typeof p === 'string') {
              // Hiển thị dấu ...
              return <EllipsisText key={`ellipsis-${index}`}>...</EllipsisText>;
            }
            return (
              <MemoizedPageButton
                key={p}
                pageNumber={p}
                currentPage={page}
                onClick={handlePageClick}
              />
            );
          })}
        </PageNumbersBox>

        <NextPageButton page={page} totalPages={totalPages} handlePageClick={handlePageClick} />
      </PaginationControlsWrapper>

      {/* Hiển thị số dòng */}
      <RowsPerPageControlsWrapper>
        <PaginationText>Hiển thị</PaginationText>
        <StyledSelect
          value={rowsPerPage}
          onChange={handleRowsPerPageChange}
          size="small"
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </StyledSelect>
      </RowsPerPageControlsWrapper>
    </PaginationContainer>
  );
};

// Component nút trang được memo hóa để tối ưu
const MemoizedPageButton = React.memo(function MemoizedPageButton({ pageNumber, currentPage, onClick }) {
  const handleClick = useCallback(() => {
    onClick(pageNumber);
  }, [onClick, pageNumber]);

  return (
    <PageButton
      active={pageNumber === currentPage}
      onClick={handleClick}
      variant={pageNumber === currentPage ? 'contained' : 'text'}
    >
      {pageNumber}
    </PageButton>
  );
});

MemoizedPageButton.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  currentPage: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
};

CustomPagination.propTypes = {
  total: PropTypes.number.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onRowsPerPageChange: PropTypes.func.isRequired,
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  styleJustifyContent: PropTypes.string,
};

export default CustomPagination;