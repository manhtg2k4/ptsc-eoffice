/* eslint-disable react/forbid-component-props */
import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { styled } from "@mui/material/styles";

import PropTypes from "prop-types";
import {
  FilterButtonWrapper,
  FilterTitle,
  SearchFilterBox,
  FilterCancelButton,
  FilterApplyButton,
} from "@styles/RecordDestruction/RecordDestruction.styles";
import { SearchOutlined, FilterAlt } from "@mui/icons-material";
import { ClickAwayListener } from "@mui/material";
import CustomAsyncAutoCompletes from "@components/CustomAsyncAutoCompletes";
import CustomAsyncAutoComplete from "@components/CustomAsyncAutoComplete";
import { StyledButton } from "@styles/CustomTable.styles";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomDatePicker from "@components/DropDownLayout/CustomDatePicker";
import {
  SkyAutocomplete,
  SkyBox,
  SkyCheckbox,
  SkyFormControlLabel,
  SkyInputAdornment,
  SkySvgIcon,
  SkyTypography,
} from "@styles/SkyStyles";
import { useSelector } from "react-redux";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import api from "@services/api";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";

const FormControlLabel = styled(SkyFormControlLabel)(({ theme }) => ({
  width: "100%",
  display: "flex",
  justifyContent: "center",
  margin: 0,
  paddingLeft: theme.spacing(1),
  color: theme.palette.text.primary,
}));

const SkySearchFilterBox = styled(SearchFilterBox)(({ theme }) => ({
  minWidth: 500,
  maxWidth: 500,
  right: "auto",
  left: 0,
  [theme.breakpoints.down("sm")]: {
    position: "fixed",
    top: "120px", // Cách một khoảng từ header
    left: "50%",
    transform: "translateX(-50%)",
    minWidth: "unset",
    width: "calc(100vw - 32px)",
    maxWidth: "380px",
    padding: theme.spacing(2),
    boxSizing: "border-box",
    zIndex: 9999,
    maxHeight: "80vh",
    overflowY: "auto",
  },
}));

export const FilterFieldBox = styled(SkyBox)(({ theme, gridSize }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  width: gridSize === "full" ? "100%" : "48%", // 48% to account for gap
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

export const FilterGridContainer = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
  width: "100%",
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

export const FilterLabel = styled(SkyTypography)(({ theme }) => ({
  // fontWeight: 600,
  // fontSize: "0.9375rem",
  color: theme.palette.text.primary,
}));

export const DateRangeBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  "& > *": {
    flex: 1,
  },
}));

// Actions box - copied from SearchSection.styles.js
export const FilterActionsBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing(1),
  paddingTop: theme.spacing(1.5),
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing(1.5),
  },
}));

export const FilterRightActions = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    justifyContent: "space-between",
    "& > button": {
      flex: 1,
    },
  },
}));

const FilterListAlt = (props) => (
  <SkySvgIcon {...props} viewBox="0 0 24 24">
    <path d="M4.25 5.66c.1.13 5.74 7.33 5.74 7.33V19c0 .55.45 1 1.01 1h2.01c.55 0 1.01-.45 1.01-1v-6.02s5.49-7.02 5.75-7.34S20 5 20 5c0-.55-.45-1-1.01-1H5.01C4.4 4 4 4.48 4 5c0 .2.06.44.25.66"></path>
  </SkySvgIcon>
);

const AutocompleteField = memo(
  ({ field, value, staticOptions, onChange, renderInput }) => {
    const [asyncOptions, setAsyncOptions] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      if (field.apiUrl) {
        setLoading(true);
        api
          .get(field.apiUrl)
          .then((res) => {
            const data = res.data?.data || res.data;
            setAsyncOptions(
              Array.isArray(data) ? data : data?.items || data?.itemsList || []
            );
          })
          .catch(() => {
            setAsyncOptions([]);
          })
          .finally(() => setLoading(false));
      }
    }, [field.apiUrl]);

    const finalOptions = useMemo(() => {
      const rawOptions = field.apiUrl ? asyncOptions || [] : staticOptions;
      return rawOptions.map((opt) => ({
        ...opt,
        title:
          opt?.[field.optionLabel] ||
          opt?.label ||
          opt?.title ||
          opt?.name ||
          "",
        value:
          opt?.[field.optionValue] ||
          (opt?.value ?? opt?.code ?? opt?.id ?? opt?._id ?? ""),
      }));
    }, [
      field.apiUrl,
      asyncOptions,
      staticOptions,
      field.optionLabel,
      field.optionValue,
    ]);

    const handleChange = useCallback(
      (event, newValue) => {
        onChange(field.key || field.code, newValue ? newValue.value : "");
      },
      [onChange, field.key, field.code]
    );

    const selectedValue = useMemo(
      () => finalOptions.find((opt) => opt.value === value) || null,
      [finalOptions, value]
    );

    return (
      <FilterFieldBox gridSize={field.gridSize}>
        <SkyAutocomplete
          // size="small"
          options={finalOptions}
          getOptionLabel={(option) => option?.title || ""}
          value={selectedValue}
          onChange={handleChange}
          renderInput={(params) =>
            renderInput({
              ...params,
              label: field?.label || field?.name || "",
              placeholder: loading
                ? "Đang tải..."
                : field?.placeholder || "Chọn...",
            })
          }
          disablePortal
          loading={loading}
        />
      </FilterFieldBox>
    );
  }
);
AutocompleteField.displayName = "AutocompleteField";

const AsyncAutocompleteField = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (newValue) => {
      onChange(field.key || field.code, newValue);
    },
    [onChange, field.key, field.code]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAsyncAutoCompletes
        url={field.apiUrl}
        label={field.label || field.name}
        placeholder={field.placeholder}
        optionLabel={field.optionLabel}
        optionValue={field.optionValue}
        value={value}
        isMulti={field?.isMulti || field?.multiple || false}
        onChange={handleChange}
        limitTags={2}
        size="small"
        queryParam={field.queryParam !== undefined ? field.queryParam : "name"}
      />
    </FilterFieldBox>
  );
});
AsyncAutocompleteField.displayName = "AsyncAutocompleteField";

const AsyncAutocompleteFieldV2 = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (newValue) => {
      onChange(field.key || field.code, newValue);
    },
    [onChange, field.key, field.code]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAsyncAutoComplete
        url={field.apiUrl}
        label={field.label || field.name}
        placeholder={field.placeholder}
        optionLabel={field.optionLabel}
        optionValue={field.optionValue || "id"}
        value={value}
        isMulti={field?.isMulti || field?.multiple || false}
        returnObject={false}
        onChange={handleChange}
        limitTags={2}
        loadOnMount
        size="small"
        queryParam={field.queryParam !== undefined ? field.queryParam : "name"}
      />
    </FilterFieldBox>
  );
});
AsyncAutocompleteFieldV2.displayName = "AsyncAutocompleteFieldV2";

const AutoCompleteSearchField = memo(({ field, value, onChange, staticOptions }) => {
  const handleChange = useCallback(
    (newValue) => {
      onChange(field.key || field.code, newValue);
    },
    [onChange, field.key, field.code]
  );

  const filteredProps = useMemo(() => {
    const rest = { ...field };
    // Xóa các prop không cần truyền xuống hoặc có thể gây xung đột
    delete rest.hidden;
    delete rest.showFilter;
    delete rest.code;       // field.code ("processStatus") sẽ ghi đè code của CustomAutoCompleteSearch
    delete rest.moduleCode; // sẽ truyền riêng qua prop code bên dưới
    delete rest.type;
    delete rest.subType;
    delete rest.key;
    delete rest.name;
    delete rest.lableFilter;
    delete rest.labelFilter;
    return rest;
  }, [field]);

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAutoCompleteSearch
        {...filteredProps}
        code={field.moduleCode}
        label={field.label || field.name}
        limitTags={3}
        value={value}
        size="small"
        isFilter
        onChange={handleChange}
        disabled={field.disabled}
        isMulti={field.isMulti || field.type === "multiSelect" || field.subType === "multiSelect"}
        options={staticOptions}
      />
    </FilterFieldBox>
  );
});
AutoCompleteSearchField.displayName = "AutoCompleteSearchField";

const SelectField = memo(({ field, value, staticOptions, onChange }) => {
  const [asyncOptions, setAsyncOptions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (field.apiUrl) {
      setLoading(true);
      api
        .get(field.apiUrl)
        .then((res) => {
          // setAsyncOptions(res.data?.data || res.data || []);
          const data = res.data?.data || res.data;
          setAsyncOptions(
            Array.isArray(data) ? data : data?.items || data?.itemsList || []
          );
        })
        .catch(() => {
          setAsyncOptions([]);
        })
        .finally(() => setLoading(false));
    }
  }, [field.apiUrl]);

  const finalOptions = useMemo(() => {
    const rawOptions = field.apiUrl ? asyncOptions || [] : staticOptions;
    return rawOptions.map((opt) => ({
      ...opt,
      title:
        opt?.[field.optionLabel] || opt?.label || opt?.title || opt?.name || "",
      value:
        opt?.[field.optionValue] ||
        (opt?.value ?? opt?.code ?? opt?.id ?? opt?._id ?? ""),
    }));
  }, [
    field.apiUrl,
    asyncOptions,
    staticOptions,
    field.optionLabel,
    field.optionValue,
  ]);

  const handleChange = useCallback(
    (e) => {
      onChange(field.key || field.code, e.target.value);
    },
    [onChange, field.key, field.code]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomInput
        size="small"
        label={field?.label || field?.name || ""}
        value={value || ""}
        onChange={handleChange}
        select
        multiple={field?.multiple}
        options={finalOptions}
        placeholder={
          loading ? "Đang tải dữ liệu..." : field?.placeholder || "Chọn..."
        }
        disablePortal
      />
    </FilterFieldBox>
  );
});
SelectField.displayName = "SelectField";

const DateRangeField = memo(({ field, fromValue, toValue, onChange }) => {
  // CustomDateRangePicker returns [startDate, endDate] as an array
  // We need to map it to field.fromKey and field.toKey
  const handleDateRangeChange = useCallback(
    (dateArray) => {
      if (!dateArray || !Array.isArray(dateArray)) return;

      const [startDate, endDate] = dateArray;

      // Update both start and end date
      onChange(field.fromKey, startDate || "");
      onChange(field.toKey, endDate || "");
    },
    [onChange, field.fromKey, field.toKey]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomDateRangePicker
        label={field?.label || ""}
        start={fromValue}
        end={toValue}
        onChange={handleDateRangeChange}
        styledMaxWidth={500}
      />
    </FilterFieldBox>
  );
});
DateRangeField.displayName = "DateRangeField";

const MonthYearField = memo(({ field, monthValue, yearValue, onChange }) => {
  const monthOptions = useMemo(
    () => [
      { title: "Tất cả", value: "" },
      ...Array.from({ length: 12 }, (_, i) => ({
        title: `Tháng ${i + 1}`,
        value: String(i + 1).padStart(2, "0"),
      })),
    ],
    []
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      { title: "Tất cả", value: "" },
      ...Array.from({ length: 11 }, (_, i) => {
        const year = currentYear - 5 + i;
        return { title: `Năm ${year}`, value: String(year) };
      }),
    ];
  }, []);

  const handleMonthChange = useCallback(
    (e) => {
      onChange(field.monthKey, e.target.value);
    },
    [onChange, field.monthKey]
  );

  const handleYearChange = useCallback(
    (e) => {
      onChange(field.yearKey, e.target.value);
    },
    [onChange, field.yearKey]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize || "full"}>
      <DateRangeBox>
        <SkyBox>
          <FilterLabel>{field?.labelMonth || "Tháng"}</FilterLabel>
          <CustomInput
            size="small"
            value={monthValue || ""}
            onChange={handleMonthChange}
            select
            options={monthOptions}
          />
        </SkyBox>
        <SkyBox>
          <FilterLabel>{field?.labelYear || "Năm"}</FilterLabel>
          <CustomInput
            size="small"
            value={yearValue || ""}
            onChange={handleYearChange}
            select
            options={yearOptions}
          />
        </SkyBox>
      </DateRangeBox>
    </FilterFieldBox>
  );
});
MonthYearField.displayName = "MonthYearField";

const DateField = memo(({ field, value, onChange }) => {
  const handleDateChange = useCallback(
    (date) => {
      onChange(field.key, date || "");
    },
    [onChange, field.key]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomDatePicker
        value={value ? dayjs(value) : null}
        onChange={handleDateChange}
        label={field?.label || ""}
        placeholder={field?.placeholder || "DD/MM/YYYY"}
        size="small"
      />
    </FilterFieldBox>
  );
});
DateField.displayName = "DateField";

const CheckboxField = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (e) => {
      onChange(field.key, e.target.checked);
    },
    [onChange, field.key]
  );

  return (
    <FormControlLabel
      control={<SkyCheckbox checked={Boolean(value)} onChange={handleChange} />}
      label={field?.label || ""}
      labelPlacement="start"
    />
  );
});
CheckboxField.displayName = "CheckboxField";

const NumberRangeField = memo(
  ({ field, fromValue, toValue, onChange, InputComponents }) => {
    // const handleFromChange = useCallback(
    //   (e) => {
    //     const value = e.target.value;
    //     onChange(field.fromKey, value);
    //   },
    //   [onChange, field.fromKey]
    // );

    const handleFromChange = useCallback(
      (e) => {
        const value = e.target.value;

        // Cho phép xóa rỗng
        if (value === "") {
          onChange(field.fromKey, "");
          return;
        }

        // Không cho nhập số âm
        if (Number(value) < 0) return;

        // Nếu là số hợp lệ >= 0 thì cho phép
        if (!isNaN(value)) {
          onChange(field.fromKey, value);
        }
      },
      [onChange, field.fromKey]
    );

    const handleToChange = useCallback(
      (e) => {
        const value = e.target.value;
        onChange(field.toKey, value);
      },
      [onChange, field.toKey]
    );

    return (
      <FilterFieldBox gridSize={field.gridSize || "full"}>
        <FilterLabel>{field?.label || "Khoảng số lượng"}</FilterLabel>
        <DateRangeBox>
          <InputComponents
            type="number"
            label={field?.labelFrom || "Từ"}
            value={fromValue || ""}
            onChange={handleFromChange}
            placeholder={field?.placeholderFrom || "Từ"}
            inputProps={{
              min: field?.min ?? 0,
              max: field?.max,
              step: field?.step ?? 1,
            }}
          />
          <InputComponents
            type="number"
            label={field?.labelTo || "Đến"}
            value={toValue || ""}
            onChange={handleToChange}
            placeholder={field?.placeholderTo || "Đến"}
            inputProps={{
              min: field?.min ?? 0,
              max: field?.max,
              step: field?.step ?? 1,
            }}
          />
        </DateRangeBox>
      </FilterFieldBox>
    );
  }
);
NumberRangeField.displayName = "NumberRangeField";

const FilterDropdown = memo(
  ({
    openFilter,
    handleToggleFilter,
    handleCloseFilter,
    handleApplyFilterClick,
    hideTriggerButton = false,
    advancedFilters = {},
    config = [],
    onAdvancedFieldChange,
    sharedComponents,
    ...optionsProps
  }) => {
    const { InputComponents } = sharedComponents;

    const [localFilters, setLocalFilters] = useState({});
    const { crmSource } = useSelector((state) => state.config);

    useEffect(() => {
      if (openFilter) {
        setLocalFilters((prevFilters) => {
          // Xây dựng tập hợp các key hợp lệ từ config hiện tại
          const validKeys = new Set();
          config.forEach((field) => {
            if (field.type === "dateRange" || field.type === "numberRange") {
              validKeys.add(field.fromKey);
              validKeys.add(field.toKey);
            } else if (field.type === "monthYear") {
              validKeys.add(field.monthKey);
              validKeys.add(field.yearKey);
            } else {
              validKeys.add(field.key || field.code);
            }
          });

          // Lọc prevFilters để chỉ giữ lại những key hợp lệ
          const filteredState = {};
          Object.keys(prevFilters).forEach((key) => {
            if (validKeys.has(key)) {
              filteredState[key] = prevFilters[key];
            }
          });

          // Thêm những field mới nếu chưa tồn tại
          config.forEach((field) => {
            if (field.type === "dateRange" || field.type === "numberRange") {
              if (!(field.fromKey in filteredState)) {
                filteredState[field.fromKey] =
                  advancedFilters[field.fromKey] || "";
              }
              if (!(field.toKey in filteredState)) {
                filteredState[field.toKey] = advancedFilters[field.toKey] || "";
              }
            } else if (field.type === "monthYear") {
              if (!(field.monthKey in filteredState)) {
                filteredState[field.monthKey] =
                  advancedFilters[field.monthKey] || "";
              }
              if (!(field.yearKey in filteredState)) {
                filteredState[field.yearKey] =
                  advancedFilters[field.yearKey] || "";
              }
            } else {
              if (!((field.key || field.code) in filteredState)) {
                const isMulti = field.multiple || field.type === "multiSelect" || field.isMulti;
                filteredState[field.key || field.code] = advancedFilters[field.key || field.code] || (isMulti ? [] : "");
              }
            }
          });

          return filteredState;
        });
      }
    }, [openFilter, config, advancedFilters]);

    const handleFieldChange = useCallback(
      (key, value) => {
        setLocalFilters((prev) => {
          const newState = { ...prev, [key]: value };

          // Tìm cấu hình của field hiện tại trong config
          const fieldConfig = config.find((f) => f.key === key);

          // Nếu field này có cấu hình loại trừ (exclusiveKeys) và giá trị được set là true
          if (fieldConfig?.exclusiveKeys && value === true) {
            fieldConfig.exclusiveKeys.forEach((exKey) => {
              newState[exKey] = false;
            });
          }
          return newState;
        });

        // Gọi callback để thông báo thay đổi field
        if (onAdvancedFieldChange) {
          onAdvancedFieldChange(key, value);
        }
      },
      [config, onAdvancedFieldChange]
    );

    const handleReset = useCallback(() => {
      const resetState = {};
      config.forEach((field) => {
        if (field.type === "dateRange" || field.type === "numberRange") {
          resetState[field.fromKey] = "";
          resetState[field.toKey] = "";
        } else if (field.type === "monthYear") {
          resetState[field.monthKey] = "";
          resetState[field.yearKey] = "";
        } else {
          const isMulti = field.multiple || field.type === "multiSelect" || field.isMulti;
          resetState[field.key || field.code] = isMulti ? [] : "";
        }
      });
      setLocalFilters(resetState);
      
      const filteredParams = Object.keys(resetState).reduce((acc, key) => {
        if (key !== "typeObj") {
          acc[key] = resetState[key];
        }
        return acc;
      }, {});
      handleApplyFilterClick(filteredParams);
    }, [config, handleApplyFilterClick]);

    const onApply = useCallback(() => {
      // Lọc bỏ typeObj khỏi localFilters trước khi gửi API
      const filteredParams = Object.keys(localFilters).reduce((acc, key) => {
        if (key !== "typeObj") {
          acc[key] = localFilters[key];
        }
        return acc;
      }, {});
      handleApplyFilterClick(filteredParams);
    }, [handleApplyFilterClick, localFilters]);

    const renderDocTypeInput = useCallback(
      (params) => (
        <CustomInput
          {...params}
          placeholder="Tìm kiếm..."
          label={params?.label || ""}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <SkyInputAdornment position="start">
                <SearchOutlined />
              </SkyInputAdornment>
            ),
          }}
        />
      ),
      []
    );


    const renderField = useCallback(
      (field) => {
        // If field has crmSourceCode, get options from crmSource
        let options = [];
        if (field.crmSourceCode) {
          options =
            crmSource?.find((item) => item.code === field.crmSourceCode)
              ?.data || [];
        } else if (field.options) {
          options = field.options;
        } else {
          options = optionsProps[field.optionsProp] || [];
        }

        // Ensure all options have valid string properties to prevent MUI capitalize errors
        options = Array.isArray(options)
          ? options.map((opt) => ({
            ...opt,
            title: opt?.title || opt?.label || opt?.name || "",
            value: opt?.value ?? opt?.code ?? opt?.id ?? opt?._id ?? "",
          }))
          : [];

        switch (field.type) {
          case "autocomplete":
            return (
              <AutocompleteField
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                staticOptions={options}
                onChange={handleFieldChange}
                renderInput={renderDocTypeInput}
              />
            );

          case "asyncAutocomplete":
            return (
              <AsyncAutocompleteField
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                onChange={handleFieldChange}
              />
            );
          case "asyncAutocompleteV2":
            return (
              <AsyncAutocompleteFieldV2
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                onChange={handleFieldChange}
              />
            );
          case "select":
            return (
              <SelectField
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                staticOptions={options}
                onChange={handleFieldChange}
              />
            );
          case "dateRange":
            return (
              <DateRangeField
                key={field.key || field.code}
                field={field}
                label={field.label || field.name}
                fromValue={localFilters[field.fromKey]}
                toValue={localFilters[field.toKey]}
                onChange={handleFieldChange}
              />
            );
          case "monthYear":
            return (
              <MonthYearField
                key={field.key || `${field.monthKey}-${field.yearKey}`}
                field={field}
                monthValue={localFilters[field.monthKey]}
                yearValue={localFilters[field.yearKey]}
                onChange={handleFieldChange}
              />
            );
          case "checkBox":
            return (
              <FilterFieldBox key={field.key || field.code} gridSize={field.gridSize}>
                <CheckboxField
                  field={field}
                  value={localFilters[field.key || field.code]}
                  onChange={handleFieldChange}
                />
              </FilterFieldBox>
            );
          case "date":
            return (
              <DateField
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                onChange={handleFieldChange}
              />
            );
          case "numberRange":
            return (
              <NumberRangeField
                key={field.key || `${field.fromKey}-${field.toKey}`}
                field={field}
                fromValue={localFilters[field.fromKey]}
                toValue={localFilters[field.toKey]}
                onChange={handleFieldChange}
                InputComponents={InputComponents}
              />
            );
          case "multiSelect":
            return (
              <AutoCompleteSearchField
                key={field.key || field.code}
                field={field}
                value={localFilters[field.key || field.code]}
                onChange={handleFieldChange}
                staticOptions={options}
              />
            );
          default:
            return null;
        }
      },
      [
        localFilters,
        optionsProps,
        handleFieldChange,
        renderDocTypeInput,
        crmSource,
        InputComponents,
      ]
    );

    return (
      <ClickAwayListener
        onClickAway={handleCloseFilter}
        mouseEvent={hideTriggerButton ? false : 'onClick'}
        touchEvent={hideTriggerButton ? false : 'onTouchEnd'}
      >
        <FilterButtonWrapper>
          {!hideTriggerButton && (
            <StyledButton
              variant="contained"
              type="button"
              onClick={handleToggleFilter}
              startIcon={<FilterAlt />}
              sx={{
                marginLeft: 1,
                width: "auto",
                minWidth: "fit-content !important",
                padding: "0 16px",
                whiteSpace: "nowrap",
              }}
            >
              Bộ lọc
            </StyledButton>
          )}
          {openFilter && (
            <SkySearchFilterBox>
              <FilterTitle>
                <span>Bộ lọc</span>
                <FilterListAlt />
              </FilterTitle>

              <FilterGridContainer>
                {config.map(renderField)}
              </FilterGridContainer>

              <FilterActionsBox>
                <FilterCancelButton onClick={handleReset}>
                  Đặt lại
                </FilterCancelButton>
                <FilterRightActions>
                  <FilterCancelButton onClick={handleCloseFilter}>
                    Hủy
                  </FilterCancelButton>
                  <FilterApplyButton variant="contained" onClick={onApply}>
                    Áp dụng lọc
                  </FilterApplyButton>
                </FilterRightActions>
              </FilterActionsBox>
            </SkySearchFilterBox>
          )}
        </FilterButtonWrapper>
      </ClickAwayListener>
    );
  }
);

FilterDropdown.displayName = "FilterDropdown";

FilterDropdown.propTypes = {
  openFilter: PropTypes.bool.isRequired,
  handleToggleFilter: PropTypes.func.isRequired,
  handleCloseFilter: PropTypes.func.isRequired,
  handleApplyFilterClick: PropTypes.func.isRequired,
  hideTriggerButton: PropTypes.bool,
  advancedFilters: PropTypes.object,
  config: PropTypes.array,
};

export default withSharedComponents(FilterDropdown);
