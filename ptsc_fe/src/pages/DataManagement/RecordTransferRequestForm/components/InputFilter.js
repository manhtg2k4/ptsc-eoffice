
import React, { useState, useEffect, useCallback } from 'react';
import { FilterAlt, Search, Clear } from "@mui/icons-material";
import { Box, ClickAwayListener, Checkbox, FormControlLabel, Typography, InputAdornment, IconButton, styled } from "@mui/material";
import { StyledFilterButton, StyledSearchField, FilterBox } from "@styles/CustomTable.styles";
import PropTypes from 'prop-types';
import { useToast } from '@components/common/ToastProvider';

const InputContainer = styled(Box)({
  display: 'flex',
  alignItems: 'flex-start',
  position: 'relative',
});

const SizedFilterButton = styled(StyledFilterButton)({
  height: '40px',
});

const ZIndexFilterBox = styled(FilterBox)({
  zIndex: 1001,
});

const FilterBoxTitle = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(1),
  paddingBottom: 0,
  fontWeight: 'bold',
}));

export default function InputFilter({ filter, onSearch, disabled = false, outlined = false }) {
  const [searchText, setSearchText] = useState('');
  const toast = useToast();
  // Khởi tạo các cột được chọn với tất cả các tên bộ lọc có sẵn theo mặc định
  const [selectedColumns, setSelectedColumns] = useState(() =>
    filter?.map((col) => col.name) || []
  );
  const [openFilter, setOpenFilter] = useState(false);

  // const handleFilterChange = (columnName) => {
  //   setSelectedColumns((prev) =>
  //     prev.includes(columnName)
  //       ? prev.filter((val) => val !== columnName)
  //       : [...prev, columnName]
  //   );
  // };

  const handleFilterChange = useCallback((columnName) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((val) => val !== columnName)
        : [...prev, columnName]
    );
  }, []);

  useEffect(() => {
    setSelectedColumns(filter?.map((col) => col.name) || []);
  }, [filter]);

  // Hàm xử lý khi nhấn nút tìm kiếm hoặc Enter
  const handleSearch = () => {
    if (searchText.trim() && selectedColumns.length === 0) {
      toast("Vui lòng chọn ít nhất một trường tìm kiếm.", "warning");
      return;
    }

    if (!searchText.trim()) {
      onSearch({}); // reset filter
      return;
    }

    const selectedCodes = filter
      ?.filter((col) => selectedColumns.includes(col.name))
      .map((col) => col.code);

    // Gửi về đúng dạng mà fetchListSearchCancelAdminResult cần
    onSearch({
      query: searchText.trim(),
      code: selectedCodes || [],
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchText('');
    onSearch({}); // Gửi payload rỗng để hủy tìm kiếm
  };

  const handleSearchTextChange = useCallback((e) => {
    const inputValue = e.target.value;
    if (/[~!@#$%^*,`]/.test(inputValue)) {
      return;
    }
    setSearchText(inputValue);
  }, []);

  const preventDefault = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleCloseFilter = useCallback(() => {
    setOpenFilter(false);
  }, []);

  const handleToggleFilter = useCallback(() => {
    setOpenFilter((prev) => !prev);
  }, []);

  const handleCheckboxChange = useCallback((columnName) => () => handleFilterChange(columnName), [handleFilterChange]);
  return (
    <InputContainer>
      <StyledSearchField
        outlined={outlined}
        disabled={disabled}
        variant="outlined"
        size="small"
        placeholder="Tìm kiếm..."
        value={searchText}
        onKeyDown={handleKeyDown}
        // onChange={(e) => {
        //   const inputValue = e.target.value;
        //   // Regex check ký tự đặc biệt bạn muốn chặn
        //   if (/[~!@#$%^*,`]/.test(inputValue)) {
        //     return; // Nếu có ký tự đặc biệt thì bỏ qua không set state
        //   }
        //   setSearchText(inputValue);
        // }}
        onChange={handleSearchTextChange}
        // Sử dụng helperText cố định để duy trì bố cục nhất quán
        helperText={' '}
        InputProps={{
          endAdornment: searchText && (
            // <InputAdornment position="end">
            <InputAdornment>
              <IconButton
                aria-label="clear search"
                onClick={handleClearSearch}
                // onMouseDown={(e) => e.preventDefault()} // Ngăn input mất focus
                onMouseDown={preventDefault}
                edge="end"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <SizedFilterButton
        outlined={outlined}
        disabled={disabled}
        onClick={handleSearch}
      >
        <Search />
      </SizedFilterButton>
      <ClickAwayListener 
      // onClickAway={() => setOpenFilter(false)}
      onClickAway={handleCloseFilter}
      >
        <Box>
          <SizedFilterButton
            outlined={outlined}
            disabled={disabled}
            // onClick={() => setOpenFilter((prev) => !prev)}
            onClick={handleToggleFilter}
          >
            <FilterAlt />
          </SizedFilterButton>
          {openFilter && (
            <ZIndexFilterBox>
              <FilterBoxTitle variant="subtitle2">
                Chọn trường tìm kiếm
              </FilterBoxTitle>
              {filter?.map((column) => (
                <FormControlLabel
                  key={column.name}
                  control={
                    <Checkbox
                      checked={selectedColumns.includes(column.name)}
                      // onChange={() => handleFilterChange(column.name)}
                      onChange={handleCheckboxChange(column.name)}
                    />
                  }
                  label={column.name}
                />
              ))}
            </ZIndexFilterBox>
          )}
        </Box>
      </ClickAwayListener>
    </InputContainer>
  );
}

InputFilter.propTypes = {
  filter: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
    })
  ).isRequired,
  disabled: PropTypes.bool,
  outlined: PropTypes.bool,
  onSearch: PropTypes.func.isRequired,
};
