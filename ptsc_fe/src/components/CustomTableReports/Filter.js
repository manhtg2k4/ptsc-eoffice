/* eslint-disable react/forbid-component-props */
import React, { memo, useState, useEffect, useCallback, useMemo } from "react";
import { styled } from "@mui/material/styles";

import PropTypes from "prop-types";
import {
  FilterCancelButton,
  FilterApplyButton,
} from "@styles/RecordDestruction/RecordDestruction.styles";
import { SearchOutlined } from "@mui/icons-material";
import CustomAsyncAutoCompletes from "@components/CustomAsyncAutoCompletes";
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";
import CustomInput from "@components/CustomInput/CustomInputBase";
import CustomDatePicker from "@components/DropDownLayout/CustomDatePicker";
import {
  SkyAutocomplete,
  SkyBox,
  SkyCheckbox,
  SkyFormControlLabel,
  SkyInputAdornment,
  SkyTypography,
} from "@styles/SkyStyles";
import { useSelector } from "react-redux";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import api from "@services/api";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";

const FormControlLabel = styled(SkyFormControlLabel)(({ theme }) => ({
  width: "100%",
  display: "flex",
  justifyContent: "center",
  margin: 0,
  paddingLeft: theme.spacing(1),
  color: theme.palette.text.primary,
}));

// Removed SkySearchFilterBox as it's inline now

export const FilterFieldBox = styled(SkyBox)(({ theme, gridSize }) => {
  const getWidth = (size) => {
    if (size === "full") return "100%";
    if (size === "half") return "calc(50% - 12px)";
    const numSize = Number(size);
    if (!isNaN(numSize) && numSize > 0) {
      return `calc(${(numSize / 12) * 100}% - 12px)`;
    }
    return "calc(33.33% - 12px)";
  };

  const width = getWidth(gridSize);

  return {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    flex: `1 1 ${width}`,
    maxWidth: width,
    minWidth: "220px",
    "& .MuiInputBase-root": {
      height: "40px",
    },
    "& .MuiAutocomplete-inputRoot": {
      height: "40px !important",
      paddingTop: "0 !important",
      paddingBottom: "0 !important",
    },
    "& > div": {
      height: "40px",
    },
    [theme.breakpoints.down("lg")]: {
      flex: `1 1 ${width}`,
      maxWidth: width,
    },
    [theme.breakpoints.down("md")]: {
      flex: "1 1 calc(50% - 12px)",
      maxWidth: "calc(50% - 12px)",
    },
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 100%",
      maxWidth: "100%",
    },
  };
});


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

const FilterContainerBox = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(0, 2, 2, 2),
}));

export const FilterActionsBox = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(1.5),
  marginTop: theme.spacing(0.5),
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
  },
}));

// Removed FilterListAlt

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
        onChange(field.key, newValue ? newValue.value : "");
      },
      [onChange, field.key]
    );

    const selectedValue = useMemo(
      () => finalOptions.find((opt) => opt.value === value) || null,
      [finalOptions, value]
    );

    return (
      <FilterFieldBox gridSize={field.gridSize}>
        <SkyAutocomplete
          size="small"
          options={finalOptions}
          getOptionLabel={(option) => option?.title || ""}
          value={selectedValue}
          onChange={handleChange}
          disabled={field.disabled}
          renderInput={(params) =>
            renderInput({
              ...params,
              label: field?.label || "",
              placeholder: loading
                ? "Đang tải..."
                : field?.placeholder ,
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
      onChange(field.key, newValue);
    },
    [onChange, field.key]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAsyncAutoCompletes
        url={field.subType === "asyncAutocomplete" ? (field.apiUrl.startsWith("/") ? `${APP_BASE}${field.apiUrl}` : `${APP_BASE}/${field.apiUrl}`) : field.apiUrl}
        label={field.label}
        placeholder={field.placeholder}
        optionLabel={field.optionLabel}
        optionValue={field.optionValue}
        value={value}
        onChange={handleChange}
        size="small"
        disabled={field.disabled}
        limitTags={2}
        queryParam={field.queryParam}
        fallbackQueryParam="name"
        autoDetectQueryParam
        isMulti={field?.isMulti || false}
        freeSolo
      />
    </FilterFieldBox>
  );
});
AsyncAutocompleteField.displayName = "AsyncAutocompleteField";
 
 const AutoCompleteSearchField = memo(({ field, value, onChange, staticOptions }) => {
   const handleChange = useCallback(
     (newValue) => {
       onChange(field.key, newValue);
     },
     [onChange, field.key]
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
         label={field.label}
         placeholder={field.placeholder}
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
    logger.log("Render SelectField", field);
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
      onChange(field.key, e.target.value);
      },
      [onChange, field.key]
    );

    return (
      <FilterFieldBox gridSize={field.gridSize}>
        <CustomInput
          size="small"
          label={field?.label || ""}
          value={value || (field.multiple ? [] : "")}
          onChange={handleChange}
          select
          multiple={field.multiple}
          disabled={field.disabled}
          options={finalOptions}
          placeholder={
            loading ? "Đang tải dữ liệu..." : field?.placeholder || "Chọn..."
          }
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              if (
                !selected ||
                (Array.isArray(selected) && selected.length === 0)
              ) {
                return (
                  <span style={{ color: "rgba(0, 0, 0, 0.42)" }}>
                    {field?.placeholder || "Chọn..."}
                  </span>
                );
              }
              if (Array.isArray(selected)) {
                return selected
                  .map((val) => finalOptions.find((opt) => opt.value === val)?.title)
                  .filter(Boolean)
                  .join(", ");
              }
              return finalOptions.find((opt) => opt.value === selected)?.title;
            },
          }}
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
          <CustomInput
            label={field?.labelMonth || "Tháng"}
            size="small"
            value={monthValue || ""}
            onChange={handleMonthChange}
            select
            placeholder={field?.placeholderMonth}
            options={monthOptions}
          />
        </SkyBox>
        <SkyBox>
          <CustomInput
            label={field?.labelYear || "Năm"}
            size="small"
            value={yearValue || ""}
            onChange={handleYearChange}
            select
            placeholder={field?.placeholderYear}
            options={yearOptions}
          />
        </SkyBox>
      </DateRangeBox>
    </FilterFieldBox>
  );
});
MonthYearField.displayName = "MonthYearField";

const MonthField = memo(({ field, value, onChange }) => {
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

  const handleChange = useCallback(
    (newVal) => {
      // Nếu chọn "Tất cả" (value rỗng "") → reset về mảng rỗng
      if (Array.isArray(newVal) && newVal.includes("")) {
        onChange(field.key, []);
        return;
      }
      onChange(field.key, Array.isArray(newVal) ? newVal : [newVal].filter(Boolean));
    },
    [onChange, field.key]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAutoCompleteSearch
        code=""
        label={field?.label || ""}
        value={value}
        onChange={handleChange}
        disabled={field.disabled}
        options={monthOptions}
        limitTags={5}
        isMulti
        
        placeholder={field?.placeholder }
      />
    </FilterFieldBox>
  );
});
MonthField.displayName = "MonthField";


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
        disabled={field.disabled}
        label={field?.label || ""}
        placeholder={field?.placeholder || "DD/MM/YYYY"}
        size="small"
      />
    </FilterFieldBox>
  );
});
DateField.displayName = "DateField";

const YearField = memo(({ field, value, onChange }) => {
  // Danh sách 15 năm: 4 năm quá khứ + năm hiện tại + 10 năm tương lai
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      { title: "Tất cả", value: "" },
      ...Array.from({ length: 15 }, (_, i) => {
        const year = currentYear - 4 + i;
        return { title: `Năm ${year}`, value: String(year) };
      }),
    ];
  }, []);

  const handleChange = useCallback(
    (newVal) => {
      // Nếu chọn "Tất cả" (value rỗng "") → reset về mảng rỗng
      if (Array.isArray(newVal) && newVal.includes("")) {
        onChange(field.key, []);
        return;
      }
      onChange(field.key, Array.isArray(newVal) ? newVal : [newVal].filter(Boolean));
    },
    [onChange, field.key]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomAutoCompleteSearch
        code=""
        label={field?.label || ""}
        value={value}
        onChange={handleChange}
        disabled={field.disabled}
        options={yearOptions}
        limitTags={4}
        isMulti
        placeholder={field?.placeholder}
      />
    </FilterFieldBox>
  );
});
YearField.displayName = "YearField";

const CheckboxField = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (e) => {
      onChange(field.key, e.target.checked);
    },
    [onChange, field.key]
  );

  return (
    <FormControlLabel
      control={<SkyCheckbox checked={Boolean(value)} onChange={handleChange} disabled={field.disabled} />}
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
      <FilterFieldBox gridSize={field.gridSize}>
        <DateRangeBox>
          <InputComponents
            type="number"
            label={field?.label || field?.labelFrom || "Từ"}
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

const NumberField = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (e) => {
      const val = e.target.value;
      if (val === "") {
        onChange(field.key, "");
        return;
      }
      if (Number(val) < 0 && (field.min === undefined || field.min >= 0)) return;
      if (!isNaN(val)) {
        onChange(field.key, val);
      }
    },
    [onChange, field]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomInput
        type="number"
        label={field?.label || ""}
        value={value || ""}
        onChange={handleChange}
        disabled={field.disabled}
        placeholder={field?.placeholder }
        inputProps={{
          min: field?.min ?? 0,
          max: field?.max,
          step: field?.step ?? 1,
        }}
        size="small"
      />
    </FilterFieldBox>
  );
});
NumberField.displayName = "NumberField";

const TextField = memo(({ field, value, onChange }) => {
  const handleChange = useCallback(
    (e) => {
      onChange(field.key, e.target.value);
    },
    [onChange, field.key]
  );

  return (
    <FilterFieldBox gridSize={field.gridSize}>
      <CustomInput
        size="small"
        label={field?.label || ""}
        value={value || ""}
        onChange={handleChange}
        disabled={field.disabled}
        placeholder={field?.placeholder }
      />
    </FilterFieldBox>
  );
});
TextField.displayName = "TextField";


const FilterDropdown = memo(
  ({
    handleApplyFilterClick,
    advancedFilters = {},
    config = [],
    onAdvancedFieldChange,
    sharedComponents,
    applyButtonText = "Áp dụng lọc",
    ...optionsProps
  }) => {
    const { InputComponents } = sharedComponents;

    const [localFilters, setLocalFilters] = useState({});
    const [resetKey, setResetKey] = useState(0);
    const { crmSource } = useSelector((state) => state.config);

    useEffect(() => {
      setLocalFilters((prevFilters) => {
        // Xây dựng tập hợp các key hợp lệ từ config hiện tại
        const validKeys = new Set();
        config.forEach((field) => {
          const type = field.type;
          const subType = field.subType || field.SubType;
          if (type === "dateRange" || type === "numberRange" || (type === "Date" && subType === "dateRange") || (type === "date" && subType === "dateRange") || (type === "number" && subType === "numberRange")) {
            validKeys.add(field.fromKey || `${field.key}.startDate`);
            validKeys.add(field.toKey || `${field.key}.endDate`);
          } else if (type === "NumberRange") {
            validKeys.add(field.fromKey || `${field.key}.startDate`);
            validKeys.add(field.toKey || `${field.key}.endDate`);
          } else if (type === "monthYear" || (type === "Month" && subType === "month")) {
            const monthKey = field.monthKey || (field.type === "Month" ? field.key : "month");
            validKeys.add(monthKey);

          } else {
            validKeys.add(field.key);
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
          const type = field.type;
          const subType = field.subType || field.SubType;
          if (type === "dateRange" || type === "numberRange" || (type === "Date" && subType === "dateRange") || (type === "date" && subType === "dateRange") || (type === "number" && subType === "numberRange")) {
            const fromKey = field.fromKey || `${field.key}.startDate`;
            const toKey = field.toKey || `${field.key}.endDate`;
            if (!(fromKey in filteredState)) {
              filteredState[fromKey] =
                advancedFilters[fromKey] || "";
            }
            if (!(toKey in filteredState)) {
              filteredState[toKey] = advancedFilters[toKey] || "";
            }
          } else if (type === "NumberRange") {
            const fromKey = field.fromKey || `${field.key}.startDate`;
            const toKey = field.toKey || `${field.key}.endDate`;
            if (!(fromKey in filteredState)) {
              filteredState[fromKey] = advancedFilters[fromKey] || "";
            }
            if (!(toKey in filteredState)) {
              filteredState[toKey] = advancedFilters[toKey] || "";
            }
          } else if (type === "monthYear" || (type === "Month" && subType === "month")) {
            const monthKey = field.monthKey || (field.type === "Month" ? field.key : "month");
            if (!(monthKey in filteredState)) {
              filteredState[monthKey] =
                advancedFilters[monthKey] || "";
            }

          } else {
             const advValue = advancedFilters[field.key] ?? "";
             if (JSON.stringify(filteredState[field.key]) !== JSON.stringify(advValue)) {
               filteredState[field.key] = advValue;
             }
          }
        });

        return filteredState;
      });
    }, [config, advancedFilters]);

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
        const type = field.type;
        const subType = field.subType || field.SubType;
        
        const isMulti = field.isMulti || type === "multiSelect" || subType === "multiSelect" || field.multiple || type === "year" || type === "Year" || type === "month" || type === "Month" || type === "monthYear";

        if (type === "dateRange" || type === "numberRange" || (type === "Date" && subType === "dateRange") || (type === "date" && subType === "dateRange") || (type === "number" && subType === "numberRange") || type === "NumberRange") {
          const fromKey = field.fromKey || `${field.key}.startDate`;
          const toKey = field.toKey || `${field.key}.endDate`;
          resetState[fromKey] = "";
          resetState[toKey] = "";
        } else if (type === "monthYear" || (type === "Month" && subType === "month")) {
          const monthKey = field.monthKey || (field.type === "Month" ? field.key : "month");
          resetState[monthKey] = [];
        } else if (type === "checkBox") {
          resetState[field.key] = false;
        } else if (isMulti) {
          resetState[field.key] = [];
        } else {
          resetState[field.key] = "";
        }
      });
      setLocalFilters(resetState);
      setResetKey((prev) => prev + 1);
    }, [config]);

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
        const type = field.type;
        const subType = field.subType || field.SubType;
        const label = field.lableFilter || field.labelFilter || field.label || field.name;

        // If field has crmSourceCode or moduleCode, get options from crmSource
        let options = [];
        const crmCode = field.crmSourceCode || field.moduleCode;
        if (crmCode) {
          options =
            crmSource?.find((item) => item.code === crmCode)
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

        switch (type) {
          case "ModuleCode":
          case "select":
            return (
              <SelectField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                staticOptions={options}
                onChange={handleFieldChange}
                placeholder={field?.placeholder}
              />
            );
          case "API":
            return (
              <AsyncAutocompleteField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "Date":
            if (subType === "dateRange") {
              const fromKey = field.fromKey || `${field.key}.startDate`;
              const toKey = field.toKey || `${field.key}.endDate`;
              return (
                <DateRangeField
                  key={`${field.key}-${resetKey}`}
                  field={{ ...field, label, fromKey, toKey }}
                  fromValue={localFilters[fromKey]}
                  toValue={localFilters[toKey]}
                  onChange={handleFieldChange}
                />
              );
            }
            return (
              <DateField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "autocomplete":
            return (
              <AutocompleteField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                staticOptions={options}
                onChange={handleFieldChange}
                renderInput={renderDocTypeInput}
              />
            );
          case "asyncAutocomplete":
            return (
              <AsyncAutocompleteField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "dateRange":
            return (
              <DateRangeField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                fromValue={localFilters[field.fromKey]}
                toValue={localFilters[field.toKey]}
                onChange={handleFieldChange}
              />
            );
          case "Month":
          case "month":
          case "monthYear":
            {
              const monthKey = field.monthKey || (field.type === "Month" ? field.key : "month");
              return (
                <MonthField
                  key={`${field.key || monthKey}-${resetKey}`}
                  field={{ ...field, label, key: monthKey }}
                  value={localFilters[monthKey]}
                  onChange={handleFieldChange}
                />
              );
            }

          case "year":
          case "Year":
            return (
              <YearField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "checkBox":
            return (
              <FilterFieldBox key={`${field.key}-${resetKey}`} gridSize={field.gridSize}>
                <CheckboxField
                  field={{ ...field, label }}
                  value={localFilters[field.key]}
                  onChange={handleFieldChange}
                />
              </FilterFieldBox>
            );
          case "date":
            if (subType === "dateRange") {
              const fromKey = field.fromKey || `${field.key}.startDate`;
              const toKey = field.toKey || `${field.key}.endDate`;
              return (
                <DateRangeField
                  key={`${field.key}-${resetKey}`}
                  field={{ ...field, label, fromKey, toKey }}
                  fromValue={localFilters[fromKey]}
                  toValue={localFilters[toKey]}
                  onChange={handleFieldChange}
                />
              );
            }
            return (
              <DateField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "NumberRange": {
            const fromKey = field.fromKey || `${field.key}.startDate`;
            const toKey = field.toKey || `${field.key}.endDate`;
            return (
              <NumberRangeField
                key={`${field.key || `${fromKey}-${toKey}`}-${resetKey}`}
                field={{ ...field, label, fromKey, toKey }}
                fromValue={localFilters[fromKey]}
                toValue={localFilters[toKey]}
                onChange={handleFieldChange}
                InputComponents={InputComponents}
              />
            );
          }
          case "numberRange":
            return (
              <NumberRangeField
                key={`${field.key || `${field.fromKey}-${field.toKey}`}-${resetKey}`}
                field={{ ...field, label }}
                fromValue={localFilters[field.fromKey]}
                toValue={localFilters[field.toKey]}
                onChange={handleFieldChange}
                InputComponents={InputComponents}
              />
            );
          case "number":
            return (
              <NumberField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
              />
            );
          case "enum":
            return (
              <SelectField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                staticOptions={field.valueInput || []}
                onChange={handleFieldChange}
              />
            );
          case "multiSelect":

            return (
                <AutoCompleteSearchField
                  key={`${field.key}-${resetKey}`}
                  field={{ ...field, label }}
                  value={localFilters[field.key]}
                  onChange={handleFieldChange}
                  staticOptions={options}
                />
            );
           
            
          case "text":
            return (
              <TextField
                key={`${field.key}-${resetKey}`}
                field={{ ...field, label }}
                value={localFilters[field.key]}
                onChange={handleFieldChange}
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
        resetKey,
      ]
    );

    return (
      <FilterContainerBox>
        <FilterGridContainer>
          {config.map(renderField)}
        </FilterGridContainer>

        <FilterActionsBox>
          <FilterCancelButton onClick={handleReset}>
            Đặt lại
          </FilterCancelButton>
          <FilterApplyButton variant="contained" onClick={onApply}>
            {applyButtonText}
          </FilterApplyButton>
        </FilterActionsBox>
      </FilterContainerBox>
    );
  }
);

FilterDropdown.displayName = "FilterDropdown";

FilterDropdown.propTypes = {
  handleApplyFilterClick: PropTypes.func.isRequired,
  advancedFilters: PropTypes.object,
  config: PropTypes.array,
};

export default withSharedComponents(FilterDropdown);
