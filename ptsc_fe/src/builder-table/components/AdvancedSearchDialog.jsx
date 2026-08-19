import React, { useState, useMemo, useEffect, useCallback, lazy } from "react";
import PropTypes from "prop-types";
import {
  CircularProgress,
  Popover,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CustomAsyncAutoCompletes from "@components/CustomAsyncAutoCompletes";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import CustomDatePicker from "@components/CustomDatePicker";
import CustomDateTimeRangePicker from "@components/CustomInput/CustomDateTimeRangePicker";
import CustomNumberRangePicker from "@components/CustomInput/CustomNumberRangePicker";
import { useSelector } from "react-redux";
import { useToast } from "@components/common/ToastProvider";
import { APP_BASE } from "@EnvironmentFile/constants/urlConfig";
import {
  getDefaultDatePresetSourceField,
  getDefaultTimeRangeFromPreset,
  formatSingleDateValue,
} from "@helper/helper";
import {
  LoadingContainer,
  FieldsGridContainer,
  FieldGridItem,
  CancelButton,
  ResetButton,
  ApplyButton,
} from "./AdvancedSearchDialog.styles";
// import FilterAltIcon from "@mui/icons-material/FilterAlt";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SearchPopupSourceMeting from "@components/SearchPopup/SearchPopupSourceMeting";

const FilterHeaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.2602 2.48828L1.66016 2.48828L8.30016 10.3401L8.30016 15.7683L11.6202 17.4283L11.6202 10.3401L18.2602 2.48828Z" stroke="currentColor" strokeWidth="1.66" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SearchPopup = lazy(() => import("@components/SearchPopup/SearchPopup"));
import CustomAutoCompleteSearch from "@components/CustomAutoCompleteSearch";


const DropdownPopover = styled(Popover)(({ theme }) => ({
  "& .MuiPopover-paper": {
    width: 680,
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "min(70vh, calc(100vh - 32px))",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    marginTop: theme.spacing(1),
    padding: theme.spacing(0, 2, 2, 2),
    boxShadow: theme.shadows[8],
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    overflow: "hidden",
    "@supports (height: 100dvh)": {
      maxHeight: "min(70vh, calc(100dvh - 32px))",
    },
    [theme.breakpoints.up("md")]: {
      width: 880,
      maxHeight: "min(80vh, calc(100vh - 48px))",
      "@supports (height: 100dvh)": {
        maxHeight: "min(80dvh, calc(100dvh - 48px))",
      },
    },
    [theme.breakpoints.down("sm")]: {
      width: "calc(100vw - 24px)",
      maxWidth: "calc(100vw - 24px)",
      maxHeight: "calc(100vh - 24px)",
      padding: theme.spacing(0, 1.5, 1.5, 1.5),
      borderRadius: 12,
      "@supports (height: 100dvh)": {
        maxHeight: "calc(100dvh - 24px)",
      },
    },
  },
}));

const DropdownHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 2),
  margin: theme.spacing(0, -2, 2.5, -2),
  backgroundColor: theme.palette.mode === 'dark' ? "#769fbf" : "#e8eff7",
  fontWeight: 700,
  fontSize: "20px !important",
  color: theme.palette.mode === 'dark' ? "#FFFFFF" : "#2364B0",
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    margin: theme.spacing(0, -1.5, 1.5, -1.5),
    fontSize: "16px !important",
  },
}));

const DropdownBody = styled(Box)(({ theme }) => ({
  minHeight: 0,
  paddingTop: theme.spacing(1.5),
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
}));

const DropdownActions = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  flexShrink: 0,
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
    alignItems: "stretch",
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
  },
}));

const DropdownActionsBox = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(1),
  [theme.breakpoints.down("sm")]: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)",
    width: "100%",
  },
}));

const StyledStarIconButton = styled(IconButton)(({ theme }) => ({
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  border: "1px solid",
  borderColor: theme.palette.divider,
}));

const BoxST = styled(Box)(() => ({
  display: "flex",
  alignItems: "center",
  height: "100%",
  marginLeft: "8px",
}));

const TypographyST = styled(Typography)(() => ({
  marginRight: "8px",
}));

const StarIconST = styled(StarIcon)(() => ({
  color: "red",
}));

const StyledFilterCheckboxLabel = styled(FormControlLabel)(({ theme }) => ({
  width: "100%",
  margin: 0,
  alignItems: "center",
  justifyContent: "flex-end", // using flex-end because labelPlacement="start" sets flexDirection to row-reverse, so flex-end is the visual left!
  "&.MuiFormControlLabel-labelPlacementStart": {
    marginLeft: 0,
    marginRight: 0,
  },
  "& .MuiFormControlLabel-label": {
    marginRight: theme.spacing(1),
    color: theme.palette.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  "& .MuiCheckbox-root": {
    padding: theme.spacing(0.5),
    marginRight: 0,
  },
}));

const StarFilterItem = ({ label, value, onChange }) => {
  const handleClick = useCallback(() => {
    onChange(!value);
  }, [onChange, value]);

  return (
    <BoxST>
      <TypographyST variant="body2">{label}</TypographyST>
      <StyledStarIconButton onClick={handleClick} size="small">
        {value ? <StarIconST /> : <StarBorderIcon />}
      </StyledStarIconButton>
    </BoxST>
  );
};

const AdvancedSearchDialog = ({
  open,
  onClose,
  onSearch,
  anchorEl,
  fields: externalFields,
  currentSearchValue = "",
  selectedColumns = [],
  currentAdvancedValues = {},
  textFieldCodes = []
}) => {
  const dataFields = useSelector((state) => state.formDesign.dataFieldTable);
  const [searchValues, setSearchValues] = useState({});
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autocompleteCache, setAutocompleteCache] = useState({});
  const [hasClearedSearchValues, setHasClearedSearchValues] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchAllAdvancedSearchData = async () => {
      if (!open || !dataFields) return;

      setLoading(true);
      try {
        const fetchedFields = externalFields || dataFields || [];
        setFields(fetchedFields);

        // Không cần fetch trước cho autocomplete nữa, CustomAsyncAutoComplete sẽ tự xử lý
      } catch (error) {
        toast("Không thể tải cấu hình tìm kiếm nâng cao", "error");
        setFields([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAdvancedSearchData();
  }, [open, externalFields, dataFields, toast]);

  useEffect(() => {
    if (!open) return;

    setSearchValues(() => {
      const filtered = {};
      Object.keys(currentAdvancedValues).forEach((key) => {
        if (!textFieldCodes.includes(key)) {
          let value = currentAdvancedValues[key];
          const fieldCache = autocompleteCache[key];

          if (fieldCache) {
            if (Array.isArray(value)) {
              value = value.map((id) => fieldCache[id] || id);
            } else if (value && fieldCache[value]) {
              value = fieldCache[value];
            }
          }

          filtered[key] = value;
        }
      });
      return filtered;
    });
  }, [open, currentAdvancedValues, textFieldCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      setHasClearedSearchValues(false);
    }
  }, [open]);

  useEffect(() => {
    setSearchValues({});
  }, [dataFields]);

  // Lọc ra các trường có thể tìm kiếm
  const searchableFields = useMemo(() => {
    return fields.filter(
      (field) =>
        field.advancedSearch &&
        (field.type !== "text" || field.name === "isStar")
    );
  }, [fields]);

  const sortedSearchableFields = useMemo(() => {
    return [...searchableFields].sort((a, b) => {
      const orderA = Number(a?.advancedSearchOrder);
      const orderB = Number(b?.advancedSearchOrder);
      const normalizedA = Number.isFinite(orderA) ? orderA : Number.MAX_SAFE_INTEGER;
      const normalizedB = Number.isFinite(orderB) ? orderB : Number.MAX_SAFE_INTEGER;

      if (normalizedA !== normalizedB) {
        return normalizedA - normalizedB;
      }

      return String(a?.label || a?.name || "").localeCompare(String(b?.label || b?.name || ""));
    });
  }, [searchableFields]);

  const handleValueChange = useCallback((code, value) => {
    setSearchValues((prev) => ({ ...prev, [code]: value }));
  }, []);

  const handleDateRangeChange = useCallback((code, { startDate, endDate }) => {
    setSearchValues((prev) => ({
      ...prev,
      [code]: { startDate, endDate },
    }));
  }, []);

  const handleNumberRangeChange = useCallback((code, { start, end }) => {
    setSearchValues((prev) => ({
      ...prev,
      [code]: { start, end },
    }));
  }, []);

  const handleSearch = () => {
    const result = {};
    const trimmedSearch = currentSearchValue.trim();
    if (trimmedSearch && selectedColumns.length > 0) {
      selectedColumns.forEach((columnCode) => {
        result[columnCode] = trimmedSearch;
      });
    }
    
    Object.keys(searchValues).forEach((key) => {
      if (textFieldCodes.includes(key)) return;

      const value = searchValues[key];
      if (value !== null && value !== undefined && value !== "") {
        const field = sortedSearchableFields.find((f) => (f.name || f.key) === key);
        if (field?.type === "date" && field.isSingleDateSearch) {
          result[key] = formatSingleDateValue(value);
        } else if (Array.isArray(value)) {
          result[key] = value.map((v) => v?._id || v?.id || v);
        } else {
          result[key] = value?._id || value?.id || value;
        }
      }
    });

    // Với field date có mốc mặc định mà user chưa chạm tới -> vẫn gửi range mặc định
    // (đồng bộ với giá trị đang hiển thị trên ô để kết quả lọc khớp những gì user thấy)
    sortedSearchableFields.forEach((field) => {
      const key = field.name || field.key;
      const presetSourceField = getDefaultDatePresetSourceField(field, fields);
      const isExplicitlyHandled = Object.prototype.hasOwnProperty.call(searchValues, key);
      if (
        field.type === "date" &&
        presetSourceField?.defaultTimePreset &&
        !hasClearedSearchValues &&
        !isExplicitlyHandled &&
        result[key] === undefined
      ) {
        const range = getDefaultTimeRangeFromPreset(presetSourceField.defaultTimePreset);
        if (range) result[key] = range;
      }
    });

    onSearch(result);
    onClose();
  };
  // console.log('searchValues:', searchValues);

  const handleClear = () => {
    setSearchValues({});
    setAutocompleteCache({});
    setHasClearedSearchValues(true);
  };

  const createValueChangeHandler = useCallback(
    (code) => (eventOrValue) => {
      // Kiểm tra xem tham số là event hay là value trực tiếp
      const value = eventOrValue?.target
        ? eventOrValue.target.value
        : eventOrValue;
      let sanitizedValue = value;
      if (typeof sanitizedValue === "string") {
        sanitizedValue = sanitizedValue.replace(/[~!@#$%^*,`]/g, "");
      }
      handleValueChange(code, sanitizedValue);
    },
    []
  );

  const createDateRangeChangeHandler = useCallback(
    (code) =>
      ([startDate, endDate]) => {
        handleDateRangeChange(code, { startDate, endDate });
      },
    []
  );

  const createNumberRangeChangeHandler = useCallback(
    (code) =>
      ([start, end]) => {
        handleNumberRangeChange(code, { start, end });
      },
    [handleNumberRangeChange]
  );

  const createCheckboxChangeHandler = useCallback(
    (code) => (event) => {
      handleValueChange(code, event.target.checked);
    },
    []
  );

  const createAutocompleteChangeHandler = useCallback(
    (code) => (newValue) => {
      handleValueChange(code, newValue);

      if (newValue) {
        const getItemId = (item) => item?._id || item?.id || item?.documentId;
        const newItems = Array.isArray(newValue) ? newValue : [newValue];
        
        setAutocompleteCache(prev => {
          const fieldCache = { ...(prev[code] || {}) };
          newItems.forEach(item => {
            const id = getItemId(item);
            if (id) fieldCache[id] = item;
          });
          return { ...prev, [code]: fieldCache };
        });
      }
    },
    [handleValueChange]
  );

  const renderField = (field) => {
    const { name, label, type, key } = field;
    const fieldIdentifier = name || key;
    const presetSourceField = getDefaultDatePresetSourceField(field, fields);
    // Ưu tiên giá trị user đang nhập (searchValues), fallback về giá trị đã field sẵn
    // từ ngoài (currentAdvancedValues) để ô luôn hiển thị mốc thời gian mặc định cho người dùng biết
    // Ưu tiên giá trị user đang nhập (searchValues), fallback về currentAdvancedValues
    // Kiểm tra key thay vì giá trị để null cũng được hiểu là thao tác xóa có chủ đích.
    const hasFieldIdentifierValue = Object.prototype.hasOwnProperty.call(
      searchValues,
      fieldIdentifier
    );
    const hasKeyValue = Object.prototype.hasOwnProperty.call(searchValues, key);
    const rawValue = hasFieldIdentifierValue
      ? searchValues[fieldIdentifier]
      : hasKeyValue
      ? searchValues[key]
      : !hasClearedSearchValues
      ? currentAdvancedValues[fieldIdentifier] ?? currentAdvancedValues[key]
      : undefined;
    const value = rawValue ?? "";


    if (fieldIdentifier === "isStar") {
      return (
        <StarFilterItem
          label={label}
          value={value}
          onChange={createValueChangeHandler(fieldIdentifier)}
        />
      );
    }

    switch (type) {
      case "date": {
        if (field.isSingleDateSearch) {
          return (
            <CustomDatePicker
              label={label}
              value={value || null}
              onChange={createValueChangeHandler(fieldIdentifier)}
            />
          );
        }
        // Nếu chưa có value nhưng field có cấu hình mốc mặc định -> tính range để hiển thị cho user biết
        const isManuallyCleared = value && Object.prototype.hasOwnProperty.call(value, "startDate") && Object.prototype.hasOwnProperty.call(value, "endDate") && !value.startDate && !value.endDate;
        const dateValue =
          value?.startDate || value?.endDate
            ? value
            : (!hasClearedSearchValues && !isManuallyCleared && presetSourceField?.defaultTimePreset
                ? getDefaultTimeRangeFromPreset(presetSourceField.defaultTimePreset)
                : null) || value;
        return (
          <CustomDateRangePicker
            label={label}
            start={dateValue?.startDate || undefined}
            end={dateValue?.endDate || undefined}
            onChange={createDateRangeChangeHandler(fieldIdentifier)}
          />
        );
      }
      case "datetime":
        return (
          <CustomDateTimeRangePicker
            label={label}
            start={value?.startDate || undefined}
            end={value?.endDate || undefined}
            onChange={createDateRangeChangeHandler(fieldIdentifier)}
          />
        );
      case "numberRange":
        return (
          <CustomNumberRangePicker
            label={label}
            start={value?.start || undefined}
            end={value?.end || undefined}
            onChange={createNumberRangeChangeHandler(fieldIdentifier)}
          />
        );
      case "optionmhs":
        return (
          <CustomInput
            label={label}
            select
            fullWidth
            hasAll
            value={value}
            onChange={createValueChangeHandler(fieldIdentifier)}
            options={[
              { value: 1, label: "Trạng thái 1" },
              { value: 2, label: "Trạng thái 2" },
              { value: 3, label: "Trạng thái 3" },
            ]}
            customValue="value"
            customLabel="label"
            disablePortal={true}
          />
        );
      case "autocomplete":
        return (
          <CustomAsyncAutoCompletes
            label={label}
            value={value}
            onChange={createAutocompleteChangeHandler(fieldIdentifier)}
            url={
              field.apiSource && field.apiSource.startsWith("http")
                ? field.apiSource
                : `${APP_BASE}${field.apiSource || ""}`
            }
            optionLabel="name"
            queryParam="name"
            optionValue={
              field.optionValue || 
              (name.toLowerCase().includes("book") || field.apiSource?.toLowerCase().includes("book") ? "bookDocumentId" : "_id")
            }
            isMulti={field.multiple || false}
            returnObject
          />
        );
      case "enum":
        return (
          <CustomInput
            label={label}
            select
            fullWidth
            hasAll
            value={value}
            onChange={createValueChangeHandler(fieldIdentifier)}
            options={field.valueInput || []}
            customValue="value"
            customLabel="label"
            disablePortal={true}
          />
        );
      case "checkbox":
        return (
          <StyledFilterCheckboxLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={createCheckboxChangeHandler(fieldIdentifier)}
              />
            }
            label={label}
            labelPlacement="start"
          />
        );
      case "multiSelect":
        return (
          <CustomAutoCompleteSearch
            label={label}
            select
            isMulti
            fullWidth
            size="large"
            hasAll
            value={value}
            limitTags={1}
            onChange={createValueChangeHandler(fieldIdentifier)}
            options={field.valueInput || []}
            optionValue="value"
            optionLabel="label"
          />
        );
      default:
        return (
          <CustomInput
            label={label}
            value={value}
            onChange={createValueChangeHandler(fieldIdentifier)}
          />
        );
    }
  };

  if (!open) return null;




  return (
    // <CustomDialog
    // 	open={open}
    // 	onClose={onClose}
    // 	onSave={handleSearch}
    // 	onReset={handleClear}
    // 	showReset={true}
    // 	title="Bộ lọc"
    // 	titleButton="Áp dụng lọc"
    // 	titleIcon={<FilterAltIcon />}
    // 	dialogSize={"md"}
    // >
    // 	{loading ? (
    // 		<LoadingContainer>
    // 			<CircularProgress />
    // 		</LoadingContainer>
    // 	) : (
    // 		<FieldsGridContainer container spacing={2}>
    // 			{searchableFields.map(field => (
    // 				<FieldGridItem item xs={12} sm={6} key={field.name}>
    // 					{renderField(field)}
    // 				</FieldGridItem>
    // 			))}
    // 		</FieldsGridContainer>
    // 	)}
    // </CustomDialog>
    <DropdownPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      marginThreshold={12}
      disableScrollLock
    >
      <DropdownHeader>
        <FilterHeaderIcon />
        BỘ LỌC
      </DropdownHeader>
      <DropdownBody>
        {loading ? (
          <LoadingContainer>
            <CircularProgress />
          </LoadingContainer>
        ) : (
          <FieldsGridContainer container spacing={2}>
            {sortedSearchableFields.map((field) => (
              <FieldGridItem
                item
                xs={12}
                sm={6}
                key={field.name}
                isCheckboxField={field.type === "checkbox"}
              >
                {field.type === "searchPopup" ? (
                  <SearchPopup
                    initialValue={searchValues[field.name] || null}
                    setValueChange={(summary) => handleValueChange(field.name, summary)}
                  />
                ) : field.type === "popupTable" ? (
                  <SearchPopupSourceMeting
                    initialValue={searchValues[field.name] || null}
                    setValueChange={(titleMeeting) => handleValueChange(field.name, titleMeeting)}
                  />
                ) : (
                  renderField(field)
                )}
              </FieldGridItem>
            ))}
          </FieldsGridContainer>
        )}
      </DropdownBody>

      <DropdownActions>
        <ResetButton onClick={handleClear}>Đặt lại</ResetButton>
        <DropdownActionsBox>
          <CancelButton onClick={onClose}>Hủy</CancelButton>
          <ApplyButton onClick={handleSearch}>Áp dụng lọc</ApplyButton>
        </DropdownActionsBox>
      </DropdownActions>
    </DropdownPopover>
  );
};

AdvancedSearchDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  viewConfigId: PropTypes.string,
  anchorEl: PropTypes.object,
  fields: PropTypes.array,
  currentSearchValue: PropTypes.string,  
  selectedColumns: PropTypes.array, 
  currentAdvancedValues: PropTypes.object,
  textFieldCodes: PropTypes.array,
};

export default AdvancedSearchDialog;
