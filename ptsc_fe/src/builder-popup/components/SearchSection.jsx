// SearchSection.jsx
import React, { useMemo, useState } from "react";
import {
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import {
  StyledSearchButton,
  StyledSearchField,
  StyledFilterButton,
} from "@styles/CustomTable.styles";
import { FilterAlt, Search } from "@mui/icons-material";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import {
  SearchContainer,
  FilterBox,
  FilterTitle,
  FilterWrapper,
} from "./SearchSection.styles";

const SearchSection = ({ onSearch }) => {
  const dataFields = useSelector((state) => state.formDesign.dataFieldTableInForm);

  const [openFilter, setOpenFilter] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filter = useMemo(
    () =>
      dataFields.filter((field)=> field.filter).map((field) => ({
        name: field.label,
        code: field.key,
      })),
    [dataFields]
  );

  const [selectedColumns, setSelectedColumns] = useState(
    filter?.map((col) => col.code) 
  );

  const handleSearch = () => {
    const result = {};
    selectedColumns.forEach((code) => {
      result[code] = searchValue.trim();
    });

    if (onSearch) onSearch(result);
  };
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  // Handler click ra ngoài để đóng filter
  const handleClickAwayFilter = () => {
    setOpenFilter(false);
  };

  // Handler toggle filter
  const handleToggleFilter = () => {
    setOpenFilter((prev) => !prev);
  };
  
  const handleColumnToggle = (columnCode) => () => {
    setSelectedColumns((prev) =>
      prev.includes(columnCode)
        ? prev.filter((val) => val !== columnCode)
        : [...prev, columnCode]
    );
  };


  return (
    <SearchContainer>
      <StyledSearchField
        variant="outlined"
        size="small"
        placeholder="Tìm kiếm..."
        value={searchValue}
       onChange={handleSearchChange}
      />

      <ClickAwayListener onClickAway={handleClickAwayFilter}>
        <FilterWrapper>
          <StyledFilterButton onClick={handleToggleFilter}>
            <FilterAlt />
          </StyledFilterButton>
          {openFilter && (
            <FilterBox>
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
            </FilterBox>
          )}
        </FilterWrapper>
      </ClickAwayListener>

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
  item: PropTypes.object.isRequired,
  data: PropTypes.array.isRequired,
  onSearch: PropTypes.func,
};

export default SearchSection;
