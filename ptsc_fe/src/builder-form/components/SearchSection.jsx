import React, { useCallback, useMemo, useState } from "react";
import {
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  Tooltip,
  IconButton,
  Box,
} from "@mui/material";
import {
  StyledSearchButton,
  StyledSearchField,
  StyledFilterButton,
} from "@styles/CustomTable.styles";
import { FilterAlt, Search } from "@mui/icons-material";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import CustomInput from "@components/CustomInput/CustomInput";
import {
  SearchContainer,
  SearchFilterBox,
  FilterTitle,
  DatePickerGrid,
  OptionPickerGrid,
  OptionClearIcon,
  OptionInputAdornment,
} from "./SearchSection.styles";

const SearchSection = ({ onSearch }) => {
  const dataFields = useSelector((state) => state.formDesign.dataFieldTable);

  const [openFilter, setOpenFilter] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedMHS, setSelectedMHS] = useState("");

  const handleCloseFilter = useCallback(() => {
    setOpenFilter(false);
  }, []);

  const handleToggleFilter = useCallback(() => {
    setOpenFilter((prev) => !prev);
  }, []);

  const handleSearchValueChange = useCallback((e) => {
    // Chỉ cho phép chữ, số và khoảng trắng (bao gồm tiếng Việt)
    const value = e.target.value.replace(/[^\p{L}\p{N}\s]/gu, "");
    setSearchValue(value);
  }, []);


  // 👉 Lưu ngày
  const [dateRange, setDateRange] = useState({
    startDate: undefined,
    endDate: undefined,
  });

  const filter = useMemo(
    () =>
      dataFields
        .filter((field) => field.filter)
        .map((field) => ({
          name: field.label,
          code: field.key,
          type: field.type, // 👈 giữ lại type để kiểm tra
        })),
    [dataFields]
  );

  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.code)
  );

  // 👉 Kiểm tra có field dạng "date" không
  const hasDateField = useMemo(
    () => filter.some((field) => field.type === "date"),
    [filter]
  );
  const hasDataListMHS = useMemo(
    () => filter.some((field) => field.type === "optionmhs"),
    [filter]
  );

  const handleColumnToggle = useCallback(
    (columnCode) => () => {
      setSelectedColumns((prev) =>
        prev.includes(columnCode)
          ? prev.filter((val) => val !== columnCode)
          : [...prev, columnCode]
      );
    },
    []
  );

  const handleDateChange = useCallback(([startDate, endDate]) => {
    setDateRange({ startDate, endDate });
  }, []);


  const handleMHSChange = useCallback((val) => {
    setSelectedMHS(val);
  }, []);


  const handleSearch = () => {
    const result = {};
    selectedColumns.forEach((code) => {
      result[code] = searchValue.trim();
    });
    const dateField = filter.find((field) => field.type === "date");
    if (dateField && (dateRange.startDate || dateRange.endDate)) {
      result[dateField.code] = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
    }
    if (onSearch) onSearch(result);
  };

  const handleClearSearch = () => {
    setSearchValue("");
  };

  return (
    <SearchContainer>
      {/* 🔎 Ô tìm kiếm */}
      <StyledSearchField
        variant="outlined"
        size="small"
        placeholder="Tìm kiếm..."
        value={searchValue}
        onChange={handleSearchValueChange}
        InputProps={{
          endAdornment: (
            <OptionInputAdornment>
              {searchValue && (
                <IconButton
                  aria-label="clear search"
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                >
                  <OptionClearIcon />
                </IconButton>
              )}
            </OptionInputAdornment>
          ),
        }}
      />

      {/* 🔎 Bộ lọc cột */}
      <ClickAwayListener onClickAway={handleCloseFilter}>
        <Box>
          <StyledFilterButton onClick={handleToggleFilter}>
            <FilterAlt />
          </StyledFilterButton>
          {openFilter && (
            <SearchFilterBox>
              <FilterTitle variant="subtitle1">
                Chọn trường tìm kiếm
              </FilterTitle>
              {filter?.map((column) => (
                <FormControlLabel
                  key={column.code}
                  control={
                    <Checkbox
                      checked={selectedColumns.includes(column.code)}
                      onChange={handleColumnToggle(column.code)}
                    />
                  }
                  label={column.name}
                />
              ))}
            </SearchFilterBox>
          )}
        </Box>
      </ClickAwayListener>

      {/* ⏳ Chỉ hiển thị khi có field type="date" */}
      {hasDateField && (
        <DatePickerGrid>
          <CustomDateRangePicker
            start={dateRange.startDate}
            end={dateRange.endDate}
            onChange={handleDateChange}
          />
        </DatePickerGrid>
      )}

      {hasDataListMHS && (
        <OptionPickerGrid>
          <CustomInput
            size="small"
            select
            fullWidth
            value={selectedMHS}
            onChange={handleMHSChange}
            options={[
              { value: 1, label: "Trạng thái 1" },
              { value: 2, label: "Trạng thái 2" },
              { value: 3, label: "Trạng thái 3" },
            ]}
            customValue="value"
            customLabel="label"
          />
        </OptionPickerGrid>
      )}

      {/* 🔍 Nút tìm kiếm */}
      <StyledSearchButton
        variant="contained"
        // color="primary"
        onClick={handleSearch}
      >
        <Tooltip title="Tìm kiếm">
          <Search />
        </Tooltip>
      </StyledSearchButton>
    </SearchContainer>
  );
};

SearchSection.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default SearchSection;
