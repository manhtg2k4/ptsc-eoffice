import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { StyledAutoComplete, StyledStartAdornment } from "@styles/CustomAsyncAutocompletes.style";
import Input from "@components/CustomInput/CustomInputBase";
import { Chip, CircularProgress, styled, Tooltip } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const StyledCircularProgress = styled(CircularProgress)({
  color: "inherit",
});

const StyledLimitBadge = styled(SkyBox)(() => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "26px",
  height: "26px",
  borderRadius: "50%",
  backgroundColor: "#4f5d75", // Slate gray color resembling Image 3
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  marginLeft: "6px",
  marginRight: "4px",
  userSelect: "none",
  transition: "all 0.2s ease-in-out",
  boxShadow: "0px 2px 4px rgba(0,0,0,0.15)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  "&:hover": {
    backgroundColor: "#2c3e50",
    transform: "scale(1.08)",
  },
}));

const DialogContentWrapper = styled(SkyBox)({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "10px 0",
  maxHeight: "400px",
  overflowY: "auto",
});

const DialogContentItem = styled(SkyBox)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: "6px",
  backgroundColor: theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc",
  border: "1px solid",
  borderColor: theme.palette.mode === "dark" ? "#334155" : "#e2e8f0",
}));

const DialogItemText = styled(SkyTypography)({
  fontSize: "14px",
  fontWeight: 500,
});

const StyledDeleteIconButton = styled("div")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  color: theme.palette.mode === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
  cursor: "pointer",
  marginLeft: "auto", // Align to the far right
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.06)",
    color: theme.palette.error.main || "#ef4444",
  },
}));

const StyledMultiOptionChip = styled(Chip)(({ $hasSubLabel }) => ({
  borderRadius: "7px",
  padding: "4px 6px",
  ...($hasSubLabel && {
    height: "auto",
    backgroundColor: "#F3F5F6",
    border: "1px solid #B9C2CA",
    fontWeight: 'bold'
  }),
  "&.Mui-disabled": {
    opacity: 1,
  },
  "& .MuiChip-label": {
    opacity: 1,
  },
}));

const DialogItem = memo(({ option, mainLabel, subLabel, optionId, disabled, onDelete }) => {
  const handleDelete = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onDelete(option);
  }, [option, onDelete]);

  return (
    <DialogContentItem key={optionId}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <DialogItemText>{mainLabel}</DialogItemText>
        {subLabel && (
          <div style={{ fontSize: "10px", color: "#575F6B", textTransform: "uppercase", marginTop: "2px" }}>
            {subLabel}
          </div>
        )}
      </div>
      {!disabled && (
        <StyledDeleteIconButton onClick={handleDelete}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2L10 10M10 2L2 10" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </StyledDeleteIconButton>
      )}
    </DialogContentItem>
  );
});

DialogItem.displayName = "DialogItem";

function AsyncAutocompleted(props) {
  const {
    limitTags,
    url,
    value: propValue,
    label,
    formLabel,
    onChange,
    disabled = false,
    error = false,
    helperText,
    required = false,
    optionLabel = "name",
    optionValue = "_id",
    isMulti = false,
    returnObject = false,
    size = "small",
    limit = 20,
    queryParam,
    queryParams, // Array của các param cần search, ví dụ: ["name", "email"]
    debounceTime = 300,
    startAdornment,
    endAdornment,
    placeholder,
    selectedOptions,
    options = [], // Destructure options and provide default
    dataPath = null, // Path to data array in response
    isCompact = false,
    hideDropdownIcon = false,
    optionSubLabel = false,
    ...rest
  } = props;
  const resolvedDisableClearable = rest.disableClearable ?? (disabled && !!optionSubLabel);

  const toast = useToast();
  const inputRef = useRef(null);

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [internalOptions, setInternalOptions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const isUserInput = useRef(false);

  const handleOpenDialog = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setOpenDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handlePreventDefault = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);
  // Lấy ID từ option (hỗ trợ nhiều kiểu: _id, id, value, code...)
  const getId = useCallback((option) => {
    if (!option) return null;
    return (
      option[optionValue] ??
      option._id ??
      option.id ??
      option.processId ??
      option.value ??
      option.code ??
      option
    );
  }, [optionValue]);

  const getOptionDisplayLabel = useCallback(
    (option) =>
      option?.[optionLabel] ||
      option?.name ||
      option?.title ||
      option?._id ||
      option?.id ||
      "Đang tải...",
    [optionLabel]
  );

  // Tách main label / sub label từ option theo optionSubLabel
  // - optionSubLabel là string: lấy thẳng option[optionSubLabel] làm subLabel
  // - optionSubLabel là true: fallback tách theo " - " trong label
  const getLabelParts = useCallback(
    (option) => {
      const fullLabel = getOptionDisplayLabel(option);
      if (!optionSubLabel) return { mainLabel: fullLabel, subLabel: null };

      if (typeof optionSubLabel === "string" && option?.[optionSubLabel]) {
        return { mainLabel: fullLabel, subLabel: option[optionSubLabel] };
      }

      const parts = String(fullLabel).split(" - ");
      return {
        mainLabel: parts[0],
        subLabel: parts.length > 1 ? parts.slice(1).join(" - ") : null,
      };
    },
    [getOptionDisplayLabel, optionSubLabel]
  );

  // Fetch danh sách khi tìm kiếm hoặc mở dropdown
  const fetchOptions = useCallback(
    async (query = "") => {
      if (!url) return;
      setLoading(true);
      try {
        let apiUrl = url.includes("?") ? `${url}&` : `${url}?`;
        if (queryParam && query) {
          apiUrl += `${queryParam}=${encodeURIComponent(query)}&`;
        }
        // Hỗ trợ queryParams (array) - gửi nhiều param cùng lúc
        if (queryParams && Array.isArray(queryParams) && queryParams.length > 0 && query) {
          queryParams.forEach((param) => {
            apiUrl += `${param}=${encodeURIComponent(query)}&`;
          });
        }
        apiUrl += `page=1&limit=${limit}`;

        const res = await axiosInstance.get(apiUrl);
        // axiosInstance interceptor đã tự động unwrap các lớp data lồng nhau: { data: { data: [...] } } -> [...]
        const responseData = res;
        setInternalOptions((prev) => {
          let newData = [];
          if (Array.isArray(responseData)) {
            newData = responseData;
          } else if (responseData && typeof responseData === "object") {
            if (dataPath && Array.isArray(responseData[dataPath])) {
              newData = responseData[dataPath];
            } else if (Array.isArray(responseData.items)) {
              newData = responseData.items;
            } else if (Array.isArray(responseData.data)) {
              newData = responseData.data;
            }
          }

          const extractId = (v) => (typeof v === "object" && v !== null ? getId(v) : v);

          const selectedIds = Array.isArray(propValue)
            ? propValue.map(extractId)
            : [extractId(propValue)];

          const validSelectedIds = (selectedIds ?? [])?.filter(id => id !== null && id !== undefined);

          const preservedItems = (prev ?? [])?.filter((item) => {
            const id = getId(item);
            return (
              validSelectedIds.includes(id) &&
              !(newData ?? []).some((newItem) => getId(newItem) === id)
            );
          });

          return [...preservedItems, ...newData];
        });
        // if (!query) setHasFetchedData(true); // This line was commented out or removed, keeping it as is.
      } catch (err) {
        toast?.("Lỗi tải dữ liệu", "error");
        setInternalOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [url, queryParam, queryParams, limit, toast, propValue, getId, dataPath]
  );

  const handleCustomDisplayMouseDown = useCallback((e) => {
    if (disabled) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    inputRef.current?.focus();
    setOpen(true);
    fetchOptions("");
  }, [disabled, fetchOptions]);

  // Debounce search
  useEffect(() => {
    if (!open || !isUserInput.current) return;

    const timer = setTimeout(() => {
      if (searchText === "Đang tải...") return;
      // Fetch dữ liệu khi người dùng gõ tìm kiếm
      fetchOptions(searchText || "");
    }, debounceTime);
    return () => clearTimeout(timer);
  }, [searchText, open, debounceTime, fetchOptions]);

  // Clear options khi URL thay đổi để đảm bảo load lại dữ liệu mới (đặc biệt khi excludeId thay đổi)
  useEffect(() => {
    setInternalOptions([]);
  }, [url]);



  // QUAN TRỌNG: Khi propValue là ID → tự động fetch chi tiết để hiển thị tên
  useEffect(() => {
    if (!propValue || !url) return;

    const processValue = async () => {
      const values = Array.isArray(propValue) ? propValue : [propValue];
      const idsToFetch = [];
      const objectsToAdd = [];

      values.forEach((val) => {
        if (!val) return;
        if (typeof val === "object") {
          const id = getId(val);
          if (id && !internalOptions.some((o) => getId(o) === id)) {
            objectsToAdd.push(val);
          }
        } else {
          // ID (string/number)
          if (!internalOptions.some((o) => getId(o) === val)) {
            idsToFetch.push(val);
          }
        }
      });

      if (objectsToAdd.length > 0) {
        setInternalOptions((prev) => {
          const newObjs = objectsToAdd.filter(
            (obj) => !prev.some((o) => getId(o) === getId(obj))
          );
          return [...newObjs, ...prev];
        });
      }

      //   if (idsToFetch.length > 0) {
      //     setLoading(true);
      //     try {
      //       const promises = idsToFetch.map((id) =>
      //         axiosInstance
      //           .get(`${url}/${id}`)
      //           .then((res) => ({ id, data: res.data || res.items || res }))
      //           .catch(() => ({ id, error: true }))
      //       );

      //       const results = await Promise.all(promises);
      //       const fetchedItems = results.map((res) => {
      //         if (res.error || !res.data) {
      //           return {
      //             [optionValue]: res.id,
      //             [optionLabel]: "Không tải được tên",
      //           };
      //         }
      //         return res.data;
      //       });

      //       setInternalOptions((prev) => {
      //         const newItems = fetchedItems.filter(
      //           (item) => !prev.some((o) => getId(o) === getId(item))
      //         );
      //         return [...newItems, ...prev];
      //       });
      //     } catch (err) {
      //       // console.error(err);
      //     } finally {
      //       setLoading(false);
      //     }
      //   }
    };

    processValue();
  }, [
    propValue,
    url,
    internalOptions,
    optionValue,
    optionLabel,
    getId,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Đảm bảo giá trị đang chọn luôn nằm trong options (tránh lỗi dataset)
  const finalOptions = useMemo(() => {
    const safeOptions = Array.isArray(options) ? options : [];
    const safeInternalOptions = Array.isArray(internalOptions) ? internalOptions : [];
    let list = safeOptions.length > 0 ? [...safeOptions] : [...safeInternalOptions];

    const addIfMissing = (val) => {
      if (!val) return;
      const id = typeof val === "object" ? getId(val) : val;
      if (id && !list.some((o) => getId(o) === id)) {
        if (typeof val === "object") {
          list.unshift(val);
        } else {
          list.unshift({ [optionValue]: val, [optionLabel]: "Đang tải..." });
        }
      }
    };

    if (isMulti) {
      (Array.isArray(propValue) ? propValue : []).forEach(addIfMissing);
    } else {
      addIfMissing(propValue);
    }

    return list;
  }, [internalOptions, propValue, isMulti, optionValue, optionLabel, getId, options]);

  const handleOpen = () => {
    isUserInput.current = false; // Đánh dấu không phải người dùng gõ để tránh fetch trùng ở useEffect
    setOpen(true);
    // Luôn load lại danh sách đầy đủ khi mở để người dùng có thể chọn người khác
    fetchOptions("");
  };

  const renderScrollableTags = useCallback(
    (value, getTagProps) => {
      const maxToShow = Number(limitTags) || 3;
      const displayedValues = value.slice(0, maxToShow);
      const hiddenValues = value.slice(maxToShow);

      const renderedChips = displayedValues.map((option, index) => {
        const tagProps = getTagProps({ index });
        const { mainLabel, subLabel } = getLabelParts(option);
        const safeMainLabel = mainLabel ?? "";

        const isLongLabel = safeMainLabel.length > 12;
        const displayMainLabel = isLongLabel
          ? `${safeMainLabel.substring(0, 12)}...`
          : safeMainLabel;

        const chipLabel = subLabel ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "2px 0" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1.1, color: "#16191D" }}>{displayMainLabel}</span>
            <span style={{ fontSize: "10px", color: "#575F6B", textTransform: "uppercase", lineHeight: 1.1, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {subLabel}
            </span>
          </div>
        ) : displayMainLabel;

        const tooltipTitle = subLabel ? `${safeMainLabel} - ${subLabel}` : safeMainLabel;

        const chip = (
          <StyledMultiOptionChip
            {...tagProps}
            key={getId(option) ?? index}
            label={chipLabel}
            size="small"
            $hasSubLabel={!!subLabel}
            onDelete={disabled ? undefined : tagProps.onDelete}
            deleteIcon={disabled ? null : tagProps.deleteIcon}
            disabled={disabled}
          />
        );

        return (isLongLabel || subLabel) ? (
          <Tooltip key={getId(option) ?? index} title={tooltipTitle} arrow>
            <span style={{ pointerEvents: "auto", display: "inline-flex" }}>{chip}</span>
          </Tooltip>
        ) : chip;
      });

      if (hiddenValues.length > 0) {
        renderedChips.push(
          <StyledLimitBadge
            key="limit-badge"
            onClick={handleOpenDialog}
            onMouseDown={handlePreventDefault}
          >
            +{hiddenValues.length}
          </StyledLimitBadge>
        );
      }

      return renderedChips;
    },
    [getId, limitTags, handleOpenDialog, handlePreventDefault, getLabelParts]
  );

  const handleClose = useCallback(() => {
    setOpen(false);

    setOpenDialog(false);
  }, []);




  const handleChange = (event, newValue) => {
    setOpenDialog(false);
    if (isMulti) {
      onChange(
        newValue
          ? newValue.map((item) =>
            returnObject ? item : getId(item)
          )
          : []
      );
      // Truyền toàn bộ dữ liệu option ra ngoài
      if (selectedOptions && typeof selectedOptions === 'function') {
        selectedOptions(newValue || []);
      }
      setSearchText(""); // Clear search text sau khi chọn
    } else {
      onChange(
        newValue
          ? returnObject
            ? newValue
            : getId(newValue)
          : null
      );
      // Truyền toàn bộ dữ liệu option ra ngoài
      if (selectedOptions && typeof selectedOptions === 'function') {
        selectedOptions(newValue || null);
      }
      setSearchText("");
      setOpen(false);
    }
  };


  const handleInputChange = (event, newInputValue, reason) => {
    if (reason === "input") {
      isUserInput.current = true;
      setSearchText(newInputValue);
    } else if (reason === "clear") {
      isUserInput.current = true;
      setSearchText("");
      fetchOptions(""); // Tải lại full list ngay khi xóa
    } else if (reason === "reset") {
      isUserInput.current = false;
      // Tránh clear searchText khi đang gõ và danh sách options được cập nhật (gây mất chữ)
      if (isMulti && open && document.activeElement === inputRef.current) {
         // Do nothing
      } else {
         setSearchText("");
      }
    }
  };

  const prevSelectedValues = useRef([]);

  const selectedValues = useMemo(() => {
    if (!isMulti) {
      return (
        finalOptions.find(
          (o) => getId(o) === getId(propValue)
        ) || null
      );
    }

    if (!Array.isArray(propValue)) return [];

    const newSelected = propValue
      .map((item) => {
        const id = getId(item);
        return finalOptions.find((o) => getId(o) === id);
      })
      .filter(Boolean);

    // Keep reference stable if IDs haven't changed
    const prev = prevSelectedValues.current;
    if (
      prev &&
      prev.length === newSelected.length &&
      prev.every((v, i) => getId(v) === getId(newSelected[i]))
    ) {
      return prev;
    }

    prevSelectedValues.current = newSelected;
    return newSelected;
  }, [propValue, finalOptions, isMulti, getId]);

  const handleDeleteItem = useCallback((optionToDelete) => {
    const newValue = selectedValues.filter((option) => getId(option) !== getId(optionToDelete));
    
    onChange(
      newValue.map((item) => (returnObject ? item : getId(item)))
    );
    if (selectedOptions && typeof selectedOptions === 'function') {
      selectedOptions(newValue);
    }
    
    const maxToShow = Number(limitTags) || 3;
    if (newValue.length <= maxToShow) {
      setOpenDialog(false);
    }
  }, [selectedValues, getId, onChange, returnObject, selectedOptions, limitTags]);



  return (
    <>
      <StyledAutoComplete
        $optionSubLabel={!!optionSubLabel}
        isCompact={isCompact}
        multiple={isMulti}
        disabled={disabled}
        disableClearable={resolvedDisableClearable}
        loading={loading}
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        hasStartAdornment={!!startAdornment}
        filterOptions={(x) => x}
        forcePopupIcon={hideDropdownIcon ? false : undefined}
        popupIcon={hideDropdownIcon ? null : undefined}

        inputValue={isMulti ? searchText : undefined}
        onInputChange={handleInputChange}
        value={selectedValues}
        options={finalOptions || []}
        onChange={handleChange}

        renderTags={isMulti ? renderScrollableTags : undefined}
        filterSelectedOptions
        size={size}
        limitTags={undefined}
        noOptionsText="Không tìm thấy"
        loadingText="Đang tải..."
        getOptionLabel={getOptionDisplayLabel}
        isOptionEqualToValue={(option, value) => getId(option) === getId(value)}

        renderOption={optionSubLabel ? (optionProps, option) => {
          const { mainLabel, subLabel } = getLabelParts(option);
          const { key, ...otherProps } = optionProps;

          return (
            <li key={key} {...otherProps} style={{ flexDirection: "column", alignItems: "flex-start", padding: "8px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", color: "#16191D" }}>{mainLabel}</div>
              {subLabel && (
                <div style={{ fontSize: "10px", color: "#575F6B", marginTop: "2px", textTransform: "uppercase" }}>
                  {subLabel}
                </div>
              )}
            </li>
          );
        } : undefined}

        renderInput={(params) => {
          const currentSingleValue = !isMulti ? selectedValues : null;
          const shouldShowCustomDisplay =
            !isMulti &&
            !!currentSingleValue &&
            !!optionSubLabel &&
            !searchText;

          let customInputDisplay = null;

          if (shouldShowCustomDisplay) {
            const { mainLabel, subLabel } = getLabelParts(currentSingleValue);
            const tooltipTitle = subLabel ? `${mainLabel} - ${subLabel}` : mainLabel;

            customInputDisplay = (
              <>
                <style>
                  {`
                    .custom-autocomplete-completed-hidden-input::selection {
                      background: transparent !important;
                      color: transparent !important;
                    }
                    .MuiOutlinedInput-root .MuiInputBase-input.custom-autocomplete-completed-hidden-input.Mui-disabled,
                    .MuiOutlinedInput-root .MuiInputBase-input.custom-autocomplete-completed-hidden-input:disabled,
                    .MuiInputBase-root .MuiInputBase-input.custom-autocomplete-completed-hidden-input,
                    .custom-autocomplete-completed-hidden-input {
                      color: transparent !important;
                      -webkit-text-fill-color: transparent !important;
                    }
                  `}
                </style>
                <Tooltip title={tooltipTitle} arrow>
                  <div
                    onMouseDown={handleCustomDisplayMouseDown}
                    style={{
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: startAdornment ? "120px" : "14px",
                      right: endAdornment ? "110px" : "70px",
                      display: "flex",
                      flexDirection: "column",
                      pointerEvents: "auto",
                      backgroundColor: "transparent",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "#16191D",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mainLabel}
                    </div>
                    {subLabel && (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "#575F6B",
                          marginTop: "2px",
                          textTransform: "uppercase",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {subLabel}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </>
            );
          }

          return (
            <div style={{ position: "relative", width: "100%" }}>
              <Input
                label={optionSubLabel ? "" : label}
                placeholder={selectedValues?.length > 0 ? "" : placeholder}
                required={required}
                disabled={disabled}
                error={error}
                helperText={helperText}
                InputProps={{
                  ...params.InputProps,
                  style: {
                    minWidth: "120px",
                    minHeight: customInputDisplay ? "56px" : undefined,
                    ...(params.InputProps?.style || {}),
                  },
                  startAdornment: (
                    <>
                      {startAdornment && (
                        <StyledStartAdornment isAbsolute>
                          {startAdornment}
                        </StyledStartAdornment>
                      )}
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {loading && <StyledCircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                      {endAdornment && (
                        <div style={{ display: "inline-flex", alignItems: "center", marginLeft: "8px" }}>
                          {endAdornment}
                        </div>
                      )}
                    </>
                  ),
                }}
                inputRef={inputRef}
                inputProps={{
                  ...params.inputProps,
                  className: `${params.inputProps.className || ""} ${customInputDisplay ? "custom-autocomplete-completed-hidden-input" : ""}`.trim(),
                  style: {
                    ...(params.inputProps?.style || {}),
                    color: customInputDisplay ? "transparent" : "inherit",
                    WebkitTextFillColor: customInputDisplay ? "transparent" : "inherit",
                  },
                }}
              />
              {customInputDisplay}
            </div>
          );
        }}
        {...rest}
      />
      {isMulti && (
        <CustomDialog
          open={openDialog}
          onClose={handleCloseDialog}
          title={formLabel || label}
          size="xs"
          disableSave
        >
          <DialogContentWrapper>
            {selectedValues && selectedValues.map((option, idx) => {
              const { mainLabel, subLabel } = getLabelParts(option);
              return (
                <DialogItem
                  key={getId(option) ?? idx}
                  option={option}
                  mainLabel={mainLabel}
                  subLabel={subLabel}
                  optionId={getId(option) ?? idx}
                  disabled={disabled}
                  onDelete={handleDeleteItem}
                />
              );
            })}
          </DialogContentWrapper>
        </CustomDialog>
      )}
    </>
  );
}

AsyncAutocompleted.propTypes = {
  url: PropTypes.string,
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
  selectedOptions: PropTypes.func,
  label: PropTypes.string,
  optionLabel: PropTypes.string,
  optionValue: PropTypes.string,
  isMulti: PropTypes.bool,
  returnObject: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  queryParam: PropTypes.string,
  queryParams: PropTypes.arrayOf(PropTypes.string),
  limit: PropTypes.number,
  loadOnMount: PropTypes.bool,
  dataPath: PropTypes.string,
  isCompact: PropTypes.bool,
  formLabel: PropTypes.string,
  endAdornment: PropTypes.node,
  hideDropdownIcon: PropTypes.bool,
  optionSubLabel: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export default memo(AsyncAutocompleted);
