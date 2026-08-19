import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  Tooltip,
  // IconButton,
  // Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
// import { StyledFilterButton } from "@styles/CustomTable.styles";
import {
  Search,
  StarBorderOutlined as StarBorderOutlinedIcon,
  SearchOutlined,
} from "@mui/icons-material";
// import FilterAltIcon from "@mui/icons-material/FilterAlt";
import TuneIcon from "./TuneIcon";
import FilterHollowIcon from "./FilterHollowIcon";
import PropTypes from "prop-types";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import CustomDatePicker from "@components/CustomDatePicker";
import { useToast } from "@components/common/ToastProvider";
import CustomInput from "@components/CustomInput/CustomInput";
import AsyncAutoCompletes from "@components/CustomAsyncAutoCompletes";
import AdvancedSearchDropdown from "./AdvancedSearchDialog";
import FilterCalendarSection from "./FilterCalendarSection";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import {
  SearchContainer,
  // AdvancedSearchButton, 
  SearchFilterBox,
  FilterTitle,
  DatePickerGrid,
  OptionPickerGrid,
  // SearchInputGroup,
  InputsContainer,
  ActionButtonsContainer,
  // SearchFilterInputAdornment,
  SearchClearIcon,
  // StyledSearchFieldDynamic,
  StyledSearchSectionButton,
  UnifiedSearchGroup,
  FilterTrigger,
  UnifiedInput,
  FilterCheckboxGrid,
  // FilterCheckboxGrid,
  FilterActionsBox,
  FilterCancelButton,
  FilterApplyButton,
  FilterCheckboxAll,
  DropDownBox,
  TuneIconBox,
  TuneTriggerContainer,
  ClearIconButton,
  SearchAdornmentStack,
  SearchInListButton,
  SearchInListButtonGroup,
} from "./SearchSection.styles";
import { useSelector } from "react-redux";
import {
  getDefaultDatePresetSourceField,
  getDefaultTimeRangeFromPreset,
  formatSingleDateValue,
} from "@helper/helper";

// const REPEAT_TASK_OPTIONS = [
//   { value: "tuan", label: "Tuần" },
//   { value: "thang", label: "Tháng" },
//   { value: "quy", label: "Quý" },
// ];

const SearchSection = (props) => {
  const {
    onSearch,
    // onAdvancedSearch,
    fields,
    viewConfigId,
    showStarFilter,
    featureType,
    reloadData,
    // showSearchTime,
    // displayType,
    item,
    uiVariant,
  } = props;
  // logger.log("SearchSection props:", props);
  const dataFields = useSelector((state) => state.formDesign.dataFieldTable);
  const toast = useToast();
  const [openFilter, setOpenFilter] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [localFields, setLocalFields] = useState([]);
  const [additionalFilters, setAdditionalFilters] = useState({});
  const [openAdvancedSearch, setOpenAdvancedSearch] = useState(false);
  const [isStarFilterActive, setIsStarFilterActive] = useState(false);
  const [advancedSearchAnchorEl, setAdvancedSearchAnchorEl] = useState(null);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));
  const [advancedSearchValues, setAdvancedSearchValues] = useState({});
  const [searchInListFilters, setSearchInListFilters] = useState({});

  // Fetch cấu hình nếu không được truyền qua props
  useEffect(() => {
    const fetchViewConfig = async () => {
      try {
        setLocalFields(dataFields);
      } catch (error) {
        toast("Không thể tải cấu hình tìm kiếm", "error");
        setLocalFields([]);
      }
      // }
    };

    fetchViewConfig();
  }, [fields, viewConfigId, toast, dataFields]);


  useEffect(() => {
    return () => {
      setSearchValue("");
    };
  }, []);

  useEffect(() => {
    if (reloadData !== undefined && reloadData !== null) {
      setIsStarFilterActive(false);
      setSearchValue("");
      setAdditionalFilters({});
      setAdvancedSearchValues({});
      // Cho phép auto-field lại khoảng ngày mặc định sau khi reload
      appliedDefaultKeyRef.current = null;
    }
  }, [reloadData]);

  const effectiveFields = useMemo(
    () => fields || localFields || dataFields || [],
    [fields, localFields, dataFields]
  );

  const enumAndAutocompleteFields = useMemo(() => {
    // const effectiveFields = fields || dataFields || [];
    return effectiveFields.filter(
      (field) =>
        (field.type === "enum" || field.type === "autocomplete" || field.type === "date") && field.filter
    );
  }, [effectiveFields]);

  const hasAdvancedSearchField = useMemo(() => {
    return effectiveFields.some((field) => field.advancedSearch);
  }, [effectiveFields]);

  const hasSearchInListField = useMemo(() => {
    return effectiveFields.some((field) => field.searchInList);
  }, [effectiveFields]);
  // logger.log("hasSearchInListField:", hasSearchInListField);

  // Gom các field date có cấu hình mốc thời gian mặc định (đã tick timeDeafultValue + chọn preset).
  // Lưu tách key cho filter thường và advanced search vì 2 luồng này đang dùng định danh khác nhau:
  // - filter thường: ưu tiên field.key
  // - advanced search: ưu tiên field.name
  const defaultDateFilters = useMemo(() => {
    return effectiveFields.reduce((acc, field) => {
      if (field.type !== "date") {
        return acc;
      }

      const presetSourceField = getDefaultDatePresetSourceField(field, effectiveFields);
      if (!presetSourceField?.defaultTimePreset) {
        return acc;
      }

      const range = getDefaultTimeRangeFromPreset(presetSourceField.defaultTimePreset);
      if (!range) return acc;

      acc.push({
        field,
        range,
        filterKey: field.key || field.name,
        advancedKey: field.name || field.key,
        presetSourceKey: presetSourceField.key || presetSourceField.name,
      });
      return acc;
    }, []);
  }, [effectiveFields]);

  // Guard để chỉ auto-field giá trị mặc định 1 lần cho mỗi cụm field (tránh vòng lặp onSearch)
  const appliedDefaultKeyRef = useRef(null);

  const handleAdditionalFilterChange = useCallback((fieldCode, value) => {
    setAdditionalFilters((prev) => ({ ...prev, [fieldCode]: value }));
  }, []);

  const createAdditionalFilterChangeHandler = useCallback(
    (fieldName) => (value) => {
      handleAdditionalFilterChange(fieldName, value);
    },
    [handleAdditionalFilterChange]
  );

  const createDateRangeChangeHandler = useCallback(
    (fieldCode) =>
      ([startDate, endDate]) => {
        handleAdditionalFilterChange(fieldCode, { startDate, endDate });
      },
    [handleAdditionalFilterChange]
  );

  // const handleTTHCChange = useCallback((value) => {
  //   setSelectedTTHC(value);
  // }, []);

  // const filter = useMemo(() => {
  //   // const effectiveFields = fields || dataFields || [];
  //   return (
  //     effectiveFields
  //     .filter((field) => field.filter)
  //       // .filter((field) => field.filter && field.type === "text")
  //       .map((field) => ({
  //         name: field.label,
  //         code: field.key,
  //         type: field.type, // 👈 giữ lại type để kiểm tra
  //       }))
  //   );
  // }, [effectiveFields]);
  const textSearchableFields = useMemo(() => {
    return effectiveFields
      .filter((field) => field.filter && field.type === "text")
      .map((field) => ({
        name: field.label,
        code: field.key,
        type: field.type,
      }));
  }, [effectiveFields]);
  // logger.log("textSearchableFields:", textSearchableFields);
  const dynamicPlaceholder = useMemo(() => {
    if (item?.props?.placeholder) return item.props.placeholder;
    if (textSearchableFields.length > 0) {
      const fieldNames = textSearchableFields.map((f) => f.name).join(", ");
      return `Tìm theo ${fieldNames}...`;
    }
    return "Tìm kiếm...";
  }, [item?.props?.placeholder, textSearchableFields]);

  // const additionalFilterFields = useMemo(() => {
  //   return effectiveFields.filter((field) => field.filter);
  // }, [effectiveFields]);
  // logger.log("filter in SearchSection:", filter);
  // console.log('effectiveFields:', effectiveFields);

  const [selectedColumns, setSelectedColumns] = useState(
    textSearchableFields?.map((col) => col.code) || []
  );
  // ✅ Thêm state tạm thời để xử lý logic trong bộ lọc
  const [tempSelectedColumns, setTempSelectedColumns] =
    useState(selectedColumns);

  useEffect(() => {
    setSelectedColumns(textSearchableFields?.map((col) => col.code) || []);
  }, [textSearchableFields]);

  // 👉 Kiểm tra có field dạng "date" không
  // const hasDateField = useMemo(
  //   () => additionalFilterFields.some((field) => field.type === "date"),
  //   [additionalFilterFields]
  // );
  // const hasDataList = useMemo(
  //   () => additionalFilterFields.some((field) => field.type === "optiontthc"),
  //   [additionalFilterFields]
  // );

  const handleColumnToggle = useCallback(
    (columnCode) => () => {
      setTempSelectedColumns(
        (
          prev // ✅ Cập nhật state tạm
        ) =>
          prev.includes(columnCode)
            ? prev.filter((val) => val !== columnCode)
            : [...prev, columnCode]
      );
    },
    []
  );

  const handleCloseAdvancedSearch = () => {
    setOpenAdvancedSearch(false);
    setAdvancedSearchAnchorEl(null);
  };


  const handleSearch = (columnsArg) => {
    // If columnsArg is an event or not an array, use selectedColumns state
    const columns = Array.isArray(columnsArg) ? columnsArg : selectedColumns;

    if (searchValue.trim().length > 500) {
      toast("Không được nhập tìm kiếm quá 500 ký tự", "error");
      return;
    }
    const result = {};
    const trimmed = searchValue.trim();
    const textCodes = textSearchableFields.map((f) => f.code);


    if (trimmed) {
      columns.forEach((c) => (result[c] = trimmed));
    }

    textCodes.forEach((c) => {
      if (!trimmed || !columns.includes(c)) {
        result[c] = null;
      }
    });

    Object.entries(searchInListFilters).forEach(([key, value]) => {
      result[key] = value;
    });


    Object.keys(advancedSearchValues).forEach((key) => {
      const val = advancedSearchValues[key];

      if (textCodes.includes(key)) return;

      if (val !== null && val !== undefined && val !== "" && val !== false) {
        const field = effectiveFields.find((f) => f.key === key || f.name === key);

        if (field?.type === "date") {
          if (field.isSingleDateSearch) {
            result[key] = formatSingleDateValue(val);
          } else if (val?.startDate || val?.endDate) {
            result[key] = {};
            if (val.startDate) result[key].startDate = val.startDate;
            if (val.endDate) result[key].endDate = val.endDate;
          }
        } else {
          result[key] = val?._id || val?.bookDocumentId || val;
        }
      }
    });

    Object.keys(additionalFilters).forEach((key) => {
      const val = additionalFilters[key];
      const field = effectiveFields.find((f) => f.key === key);

      if (field?.type === "date") {
        if (field.isSingleDateSearch) {
          result[key] = val ? formatSingleDateValue(val) : null;
        } else if (val?.startDate || val?.endDate) {
          result[key] = {};
          if (val.startDate) result[key].startDate = val.startDate;
          if (val.endDate) result[key].endDate = val.endDate;
        } else {
          result[key] = null;
        }
      } else {
        result[key] = val?._id || val?.bookDocumentId || val || null;
      }
    });


    if (isStarFilterActive) {
      result.isStar = true;
    }

    onSearch(result);
  };
  const handleAdvancedSearch = (advancedFilters) => {
    if (searchValue.trim().length > 500) {
      toast("Không được nhập tìm kiếm quá 500 ký tự", "error");
      return;
    }
    const textCodes = textSearchableFields.map((f) => f.code);
    const filteredAdvanced = {};

    Object.keys(advancedFilters).forEach((key) => {
      if (!textCodes.includes(key)) {
        filteredAdvanced[key] = advancedFilters[key];
      }
    });

    setAdvancedSearchValues(filteredAdvanced);

    const result = {};
    const trimmed = searchValue.trim();

    // 1. Text search (nếu có)
    if (trimmed) {
      selectedColumns.forEach((c) => (result[c] = trimmed));
    }
    textCodes.forEach((c) => {
      if (!trimmed || !selectedColumns.includes(c)) {
        result[c] = null;
      }
    });

    Object.entries(searchInListFilters).forEach(([key, value]) => {
      result[key] = value;
    });

    Object.keys(filteredAdvanced).forEach((key) => {
      const val = filteredAdvanced[key];
      if (val !== null && val !== undefined && val !== "" && val !== false) {
        const field = effectiveFields.find((f) => f.key === key || f.name === key);

        if (field?.type === "date") {
          if (field.isSingleDateSearch) {
            result[key] = formatSingleDateValue(val);
          } else if (val?.startDate || val?.endDate) {
            result[key] = {};
            if (val.startDate) result[key].startDate = val.startDate;
            if (val.endDate) result[key].endDate = val.endDate;
          }
        } else {
          result[key] = val?._id || val?.bookDocumentId || val;
        }
      }
    });

    Object.keys(additionalFilters).forEach((key) => {
      const val = additionalFilters[key];
      const field = effectiveFields.find((f) => f.key === key);

      if (field?.type === "date") {
        if (field.isSingleDateSearch) {
          result[key] = val ? formatSingleDateValue(val) : null;
        } else if (val?.startDate || val?.endDate) {
          result[key] = {};
          if (val.startDate) result[key].startDate = val.startDate;
          if (val.endDate) result[key].endDate = val.endDate;
        } else {
          result[key] = null;
        }
      } else {
        result[key] = val?._id || val?.bookDocumentId || val || null;
      }
    });

    if (isStarFilterActive) {
      result.isStar = true;
    }

    onSearch(result);
  };
  const getCurrentFilters = useCallback(() => {
    const result = {};
    const trimmed = searchValue.trim();

    // Text search
    if (trimmed) {
      selectedColumns.forEach((c) => (result[c] = trimmed));
    }

    // Search in list filters
    Object.entries(searchInListFilters).forEach(([key, value]) => {
      result[key] = value;
    });

    // Date
    const dateFields = effectiveFields.filter(
      (f) => f.type === "date" && f.filter
    );
    dateFields.forEach((field) => {
      const dateValue = additionalFilters[field.key];
      if (dateValue) {
        if (field.isSingleDateSearch) {
          result[field.key] = formatSingleDateValue(dateValue);
        } else if (dateValue.startDate || dateValue.endDate) {
          result[field.key] = dateValue;
        }
      }
    });

    // Autocomplete / Enum / Select
    Object.keys(additionalFilters).forEach((key) => {
      const val = additionalFilters[key];
      if (val !== null && val !== undefined && val !== "" && val !== false) {
        result[key] = val._id || val?.bookDocumentId || val;
      }
    });

    // Advanced search filters
    Object.keys(advancedSearchValues).forEach((key) => {
      const val = advancedSearchValues[key];
      if (val !== null && val !== undefined && val !== "" && val !== false) {
        const field = effectiveFields.find((f) => f.key === key || f.name === key);
        if (field?.type === "date") {
          if (field.isSingleDateSearch) {
            result[key] = formatSingleDateValue(val);
          } else if (val?.startDate || val?.endDate) {
            result[key] = {};
            if (val.startDate) result[key].startDate = val.startDate;
            if (val.endDate) result[key].endDate = val.endDate;
          }
        } else {
          result[key] = val?._id || val?.bookDocumentId || val;
        }
      }
    });

    if (isStarFilterActive) {
      result.isStar = true;
    }

    return result;
  }, [searchValue, selectedColumns, effectiveFields, additionalFilters, searchInListFilters, advancedSearchValues, isStarFilterActive]);

  // Auto-field khoảng ngày mặc định khi mở bảng:
  // - Điền sẵn vào additionalFilters (field có filter) / advancedSearchValues (field advancedSearch)
  //   để dialog Bộ lọc hiển thị sẵn giá trị.
  // - Gọi onSearch 1 lần để đổ khoảng ngày vào filter của apiUrl ngay lần đầu.
  // Guard bằng appliedDefaultKeyRef (key = chuỗi JSON) để không lặp vô hạn (onSearch -> setUserFilters -> re-render).
  useEffect(() => {
    if (defaultDateFilters.length === 0) return;

    const signature = JSON.stringify(
      defaultDateFilters.map(({ filterKey, advancedKey, presetSourceKey, range }) => ({
        filterKey,
        advancedKey,
        presetSourceKey,
        range,
      }))
    );
    if (appliedDefaultKeyRef.current === signature) return;
    appliedDefaultKeyRef.current = signature;

    const additionalUpdates = {};
    const advancedUpdates = {};
    const result = getCurrentFilters();

    defaultDateFilters.forEach(({ field, range, filterKey, advancedKey }) => {
      if (field.filter && filterKey) {
        additionalUpdates[filterKey] = range;
        result[filterKey] = range;
      }

      if (field.advancedSearch && advancedKey) {
        advancedUpdates[advancedKey] = range;
        result[advancedKey] = range;
      }

      if (!field.filter && !field.advancedSearch) {
        const fallbackKey = filterKey || advancedKey;
        if (fallbackKey) {
          result[fallbackKey] = range;
        }
      }
    });

    if (Object.keys(additionalUpdates).length) {
      setAdditionalFilters((prev) => ({ ...prev, ...additionalUpdates }));
    }
    if (Object.keys(advancedUpdates).length) {
      setAdvancedSearchValues((prev) => ({ ...prev, ...advancedUpdates }));
    }

    onSearch(result);
  }, [defaultDateFilters, effectiveFields, getCurrentFilters, onSearch]);

  const handleStarFilterToggle = () => {
    if (searchValue.trim().length > 500) {
      toast("Không được nhập tìm kiếm quá 500 ký tự", "error");
      return;
    }
    const newFilterState = !isStarFilterActive;
    setIsStarFilterActive(newFilterState);
    const result = getCurrentFilters();
    // Star filter
    if (newFilterState) {
      result.isStar = true;
    } else {
      result.isStar = null;
    }

    onSearch(result);
  };

  const handleSearchInListToggle = useCallback((field) => {
    const fieldKey = field.key || field.name;
    setSearchInListFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[fieldKey]) {
        delete newFilters[fieldKey];
      } else {
        newFilters[fieldKey] = true;
      }

      // ✅ Tính result từ newFilters (trạng thái mới) thay vì getCurrentFilters (trạng thái cũ)
      const result = {};
      const trimmed = searchValue.trim();

      // Text search
      if (trimmed) {
        selectedColumns.forEach((c) => (result[c] = trimmed));
      }

      // Search in list filters (dùng newFilters, không phải searchInListFilters cũ)
      Object.entries(newFilters).forEach(([key, value]) => {
        result[key] = value;
      });

      // Date filters
      const dateFields = effectiveFields.filter(
        (f) => f.type === "date" && f.filter
      );
      dateFields.forEach((field) => {
        const dateValue = additionalFilters[field.key];
        if (dateValue && (dateValue.startDate || dateValue.endDate)) {
          result[field.key] = dateValue;
        }
      });

      // Autocomplete / Enum / Select
      Object.keys(additionalFilters).forEach((key) => {
        const val = additionalFilters[key];
        if (val !== null && val !== undefined && val !== "" && val !== false) {
          result[key] = val._id || val?.bookDocumentId || val;
        }
      });

      // Advanced search filters
      Object.keys(advancedSearchValues).forEach((key) => {
        const val = advancedSearchValues[key];
        if (val !== null && val !== undefined && val !== "" && val !== false) {
          const field = effectiveFields.find((f) => f.key === key || f.name === key);
          if (field?.type === "date") {
            if (val?.startDate || val?.endDate) {
              result[key] = {};
              if (val.startDate) result[key].startDate = val.startDate;
              if (val.endDate) result[key].endDate = val.endDate;
            }
          } else {
            result[key] = val?._id || val?.bookDocumentId || val;
          }
        }
      });

      if (isStarFilterActive) {
        result.isStar = true;
      }

      onSearch(result);
      return newFilters;
    });
  }, [searchValue, selectedColumns, effectiveFields, additionalFilters, advancedSearchValues, isStarFilterActive, onSearch]);

  // ✅ Stable handler factory để tránh inline arrow functions
  const createSearchInListToggleHandler = useCallback(
    (field) => () => handleSearchInListToggle(field),
    [handleSearchInListToggle]
  );
  const handleClearSearch = () => {
    setSearchValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleOpenAdvancedSearch = (event) => {
    setAdvancedSearchAnchorEl(event.currentTarget);
    setOpenAdvancedSearch(true);
  };
  const handleSearchChange = (e) => {
    let inputValue = e.target.value;
    if (featureType !== "automatic") {
      inputValue = inputValue.replace(/[~!@#$%^*,`]/g, "");
    }
    setSearchValue(inputValue);
  };
  const handleCloseFilter = () => {
    setOpenFilter(false);
  };
  const handleToggleFilter = () => {
    // ✅ Khi mở bộ lọc, đồng bộ state tạm với state thật
    if (!openFilter) {
      setTempSelectedColumns(selectedColumns);
    }
    setOpenFilter((prev) => !prev);
  };

  const handleCalendarChange = useCallback(
    (fieldKey) => {
      setAdditionalFilters((prev) => {
        const newFilters = { ...prev };
        newFilters.type = fieldKey;
        return newFilters;
      });

      setTimeout(() => {
        if (searchValue.trim().length > 500) {
          toast("Không được nhập tìm kiếm quá 500 ký tự", "error");
          return;
        }
        const result = getCurrentFilters();
        result.type = fieldKey;
        onSearch(result);
      }, 0);
    },
    [getCurrentFilters, onSearch, searchValue, toast]
  );

  // const handleRepeatTaskChange = useCallback(
  //   (value) => {
  //     setAdditionalFilters((prev) => ({
  //       ...prev,
  //       repeatTask: value,
  //     }));

  //     setTimeout(() => {
  //       if (searchValue.trim().length > 500) {
  //         toast("Không được nhập tìm kiếm quá 500 ký tự", "error");
  //         return;
  //       }
  //       const result = getCurrentFilters();
  //       result.repeatTask = value || null;
  //       onSearch(result);
  //     }, 0);
  //   },
  //   [getCurrentFilters, onSearch, searchValue, toast]
  // );

  // Hàm xử lý khi thay đổi trạng thái checkbox "Tất cả"
  const handleSelectAllColumnsChange = (e) => {
    if (e.target.checked) {
      setTempSelectedColumns(textSearchableFields.map((f) => f.code)); // ✅ Cập nhật state tạm
    } else {
      setTempSelectedColumns([]); // ✅ Cập nhật state tạm
    }
  };

  const handleApplyFilterClick = () => {
    // ✅ Cập nhật state thật từ state tạm khi áp dụng
    setSelectedColumns(tempSelectedColumns);
    handleSearch(tempSelectedColumns);
    handleCloseFilter();
  };

  return (
    <SearchContainer uiVariant={uiVariant}>
      {/* Sử dụng InputsContainer thay cho Box với prop sx để tuân thủ quy tắc ESLint */}
      <InputsContainer uiVariant={uiVariant}>
        <UnifiedSearchGroup uiVariant={uiVariant}>
          {/* 1. Bộ lọc (Advanced Search trigger) */}
          {hasAdvancedSearchField && (
            <DropDownBox>
              <FilterTrigger onClick={handleOpenAdvancedSearch}>
                <FilterHollowIcon />
                <span>Bộ lọc</span>
              </FilterTrigger>
              <AdvancedSearchDropdown
                open={openAdvancedSearch}
                onClose={handleCloseAdvancedSearch}
                onSearch={handleAdvancedSearch}
                anchorEl={advancedSearchAnchorEl}
                fields={effectiveFields}
                currentSearchValue={searchValue}
                selectedColumns={selectedColumns}
                currentAdvancedValues={advancedSearchValues}
                textFieldCodes={textSearchableFields.map((f) => f.code)}
              />
            </DropDownBox>
          )}

          {/* 2. Ô tìm kiếm chính */}
          <UnifiedInput
            placeholder={dynamicPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            InputProps={{
              endAdornment: (
                <SearchAdornmentStack>
                  {searchValue && (
                    <ClearIconButton
                      aria-label="clear search"
                      onClick={handleClearSearch}
                      size="small"
                    >
                      <SearchClearIcon />
                    </ClearIconButton>
                  )}

                  {/* 3. TuneIcon (Column filter trigger) */}
                  <ClickAwayListener onClickAway={handleCloseFilter}>
                    <TuneTriggerContainer>
                      <TuneIconBox uiVariant={uiVariant} onClick={handleToggleFilter}>
                        <TuneIcon />
                      </TuneIconBox>
                      {openFilter && (
                        <SearchFilterBox>
                          <FilterTitle>
                            <SearchOutlined />
                            <span>Lọc tìm kiếm</span>
                          </FilterTitle>

                          <FilterCheckboxAll>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={tempSelectedColumns.length === textSearchableFields.length}
                                  indeterminate={
                                    tempSelectedColumns.length > 0 &&
                                    tempSelectedColumns.length < textSearchableFields.length
                                  }
                                  onChange={handleSelectAllColumnsChange}
                                  size="small"
                                />
                              }
                              label="Tất cả"
                            />
                          </FilterCheckboxAll>

                          <FilterCheckboxGrid>
                            {textSearchableFields?.map((column) => (
                              <FormControlLabel
                                key={column.code}
                                control={
                                  <Checkbox
                                    checked={tempSelectedColumns.includes(column.code)}
                                    onChange={handleColumnToggle(column.code)}
                                    size="small"
                                  />
                                }
                                label={column.name}
                              />
                            ))}
                          </FilterCheckboxGrid>

                          <FilterActionsBox>
                            <FilterCancelButton onClick={handleCloseFilter}>Hủy</FilterCancelButton>
                            <FilterApplyButton variant="contained" onClick={handleApplyFilterClick}>
                              Áp dụng
                            </FilterApplyButton>
                          </FilterActionsBox>
                        </SearchFilterBox>
                      )}
                    </TuneTriggerContainer>
                  </ClickAwayListener>
                </SearchAdornmentStack>
              )
            }}
          />
        </UnifiedSearchGroup>

        {/* ⏳ Chỉ hiển thị khi có field type="date" hoặc autocomplete */}
        {!isSmallScreen && enumAndAutocompleteFields.map((field) => (
          <React.Fragment key={field.key || field.name}>
            {field.type === "date" ? (
              field.isSingleDateSearch ? (
                <DatePickerGrid item xs={12} sm="auto">
                  <CustomDatePicker
                    value={additionalFilters[field.key] || null}
                    onChange={createAdditionalFilterChangeHandler(field.key)}
                    label={field.label}
                  />
                </DatePickerGrid>
              ) : (
                <DatePickerGrid item xs={12} sm="auto">
                  <CustomDateRangePicker
                    start={additionalFilters[field.key]?.startDate}
                    end={additionalFilters[field.key]?.endDate}
                    onChange={createDateRangeChangeHandler(field.key)}
                    label={field.label}
                  />
                </DatePickerGrid>
              )
            ) : field.type === "autocomplete" ? (
              <OptionPickerGrid item xs={12} sm="auto">
                <AsyncAutoCompletes
                  label={field.label}
                  value={additionalFilters[field.name] || null}
                  onChange={createAdditionalFilterChangeHandler(field.name)}
                  url={field?.apiSource?.startsWith("http") ? field.apiSource : `${APP_BASE}${field?.apiSource}`}
                  optionLabel="name"
                  queryParam="name"
                  optionValue="_id"
                  isMulti={field.multiple || false}
                />
              </OptionPickerGrid>
            ) : (
              <OptionPickerGrid item xs={12} sm="auto">
                <CustomInput
                  label={field.label}
                  size="small"
                  select
                  fullWidth
                  hasAll
                  value={additionalFilters[field.name] || ""}
                  onChange={createAdditionalFilterChangeHandler(field.name)}
                  options={field.valueInput || []}
                  customValue="value"
                  customLabel="label"
                />
              </OptionPickerGrid>
            )}
          </React.Fragment>
        ))}

        {/* Nhóm các nút hành động vào một container */}
        <ActionButtonsContainer>
          {/* 🔍 Nút tìm kiếm */}
          <StyledSearchSectionButton
            uiVariant={uiVariant}
            variant="contained"
            iscolor="primary"
            onClick={handleSearch}
          >
            <Tooltip title="Tìm kiếm">
              <Search />
            </Tooltip>
          </StyledSearchSectionButton>
          {hasSearchInListField && (
            <SearchInListButtonGroup>
              {effectiveFields
                .filter((f) => f.searchInList)
                .map((field) => {
                  const key = field.key || field.name;
                  const isActive = !!searchInListFilters[key];
                  return (
                    <SearchInListButton
                      key={key}
                      active={isActive ? 1 : 0}
                      uiVariant={uiVariant}
                      onClick={createSearchInListToggleHandler(field)}
                    >
                      {field.label}
                    </SearchInListButton>
                  );
                })}
            </SearchInListButtonGroup>
          )}
          {/* Nút lọc sao */}
          {showStarFilter && (
            <StyledSearchSectionButton
              uiVariant={uiVariant}
              variant="contained"
              iscolor={isStarFilterActive ? "warning" : "primary"}
              onClick={handleStarFilterToggle}
            >
              <Tooltip title="Lọc theo mục đã đánh dấu sao">
                <StarBorderOutlinedIcon />
              </Tooltip>
            </StyledSearchSectionButton>
          )}

          {/* {displayType === "kanban" && (
            <OptionPickerGrid item xs={12} sm="auto">
              <CustomInput
                label=" Thời gian"
                size="small"
                select
                fullWidth
                value={additionalFilters.repeatTask || ""}
                onChange={handleRepeatTaskChange}
                options={REPEAT_TASK_OPTIONS}
                customValue="value"
                customLabel="label"
              />
            </OptionPickerGrid>
          )} */}
          <FilterCalendarSection
            fields={effectiveFields}
            onCalendarChange={handleCalendarChange}
            currentFilters={getCurrentFilters()}
          />
        </ActionButtonsContainer>
      </InputsContainer>

      {/* <AdvancedSearchDialog
        open={openAdvancedSearch}
        onClose={handleCloseAdvancedSearch}
        onSearch={onAdvancedSearch || onSearch}
        viewConfigId={viewConfigId}
      /> */}
    </SearchContainer>
  );
};

SearchSection.propTypes = {
  onSearch: PropTypes.func.isRequired,
  onAdvancedSearch: PropTypes.func,
  fields: PropTypes.array,
  viewConfigId: PropTypes.string,
  showStarFilter: PropTypes.bool, // Thêm prop type
  featureType: PropTypes.string,
  reloadData: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Thêm prop type cho reloadData
  displayType: PropTypes.string,
  uiVariant: PropTypes.oneOf(["leadershipDutySchedule"]),
};

export default SearchSection;

