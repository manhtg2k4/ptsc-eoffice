import React, { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import PropTypes from "prop-types";
import { StyledAutoComplete } from "@styles/CustomAsyncAutocompletes.style";
import Input from "@components/CustomInput/CustomInputBase";
import { CircularProgress, styled, Chip, Tooltip, IconButton } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

const StyledCircularProgress = styled(CircularProgress)({
  color: "inherit",
});

const StyledChip = styled(Chip)({
  margin: 0,
  maxWidth: "100%",
});

const StyledLimitTags = styled(SkyTypography)(() => ({
  fontSize: "13px",
  alignSelf: "center",
  marginLeft: "4px",
  cursor: "pointer",
  backgroundColor: "rgba(0, 0, 0, 0.08)",
  borderRadius: "10px",
  padding: "2px 8px",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
}));

const StyledTooltipContainer = styled(SkyBox)(({ theme }) => ({
  padding: theme.spacing(0.5),
}));

const StyledTooltipItem = styled(SkyBox)(() => ({
  whiteSpace: "nowrap",
  padding: "2px 0",
}));

const DeleteOptionButton = styled(IconButton)({
  padding: 2,
  marginLeft: "auto",
  flexShrink: 0,
  color: "rgba(0, 0, 0, 0.4)",
  "&:hover": {
    color: "#d32f2f",
    backgroundColor: "rgba(211, 47, 47, 0.08)",
  },
});

const OptionContent = styled('span')({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const DeleteIcon = styled(CloseRounded)({
  fontSize: 16,
});

// Sub-component xử lý render option có nút xóa — tách ra để tránh inline func/style
const DeletableOptionItem = memo(({ optionProps, label, showDelete, option, onDelete }) => {
  const { onClick: muiOnClick, ...restLiProps } = optionProps;

  const handleLiClick = useCallback((e) => {
    // Nếu click vào nút xóa thì KHÔNG chọn option
    if (e.target.closest('[data-delete-btn]')) return;
    if (muiOnClick) muiOnClick(e);
  }, [muiOnClick]);

  const handleDeleteClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(option);
  }, [onDelete, option]);

  const handleDeleteMouseDown = useCallback((e) => {
    // Ngăn MUI bắt mouseDown để đóng dropdown hoặc blur input
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <li {...restLiProps} onClick={handleLiClick}>
      <OptionContent>{label}</OptionContent>
      {showDelete && (
        <DeleteOptionButton
          size="small"
          data-delete-btn="true"
          onClick={handleDeleteClick}
          onMouseDown={handleDeleteMouseDown}
        >
          <DeleteIcon />
        </DeleteOptionButton>
      )}
    </li>
  );
});
DeletableOptionItem.displayName = "DeletableOptionItem";

function AsyncAutocompletes(props) {
  const {
    limitTags,
    url,
    value: propValue,
    label,
    onChange,
    disabled = false,
    error = false,
    helperText,
    required = false,
    optionLabel = "name",
    optionValue = "_id",
    isMulti = false,
    returnObject = false,
    size,
    limit = 20,
    queryParam,
    debounceTime = 300,
    startAdornment,
    disableEndIcon = false,
    placeholder,
    body,
    disableClearable = false,
    isCompact = false,
    fallbackQueryParam,
    autoDetectQueryParam,
    freeSolo = false,
    onDeleteOption,
    urlDelete,
    deleteCondition,
    ...rest
  } = props;

  const toast = useToast();

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isExpandedTags, setIsExpandedTags] = useState(false);
  const inputRef = useRef(null);
  const [internalOptions, setInternalOptions] = useState([]);
  const [serverOptions, setServerOptions] = useState([]);
  const internalOptionsRef = useRef(internalOptions);
  internalOptionsRef.current = internalOptions;
  // Lấy ID từ option (hỗ trợ nhiều kiểu: _id, id, value, code...)
  const getId = useCallback(
    (option) => {
      if (!option) return null;
      if (typeof option !== "object") return String(option);
      const val =
        option[optionValue] ??
        option.eofficeAccount ??
        option._id ??
        option.id ??
        option.value ??
        option.code;
      return val !== null && val !== undefined ? String(val) : null;
    },
    [optionValue]
  );

  // Lấy label từ option (hỗ trợ nhiều kiểu: name, title, fullName...)
  const getLabel = useCallback(
    (option) => {
      if (!option) return "";
      if (typeof option !== "object") return String(option);
      return (
        option[optionLabel] ||
        option.name ||
        option.title ||
        option.nameVn ||
        option.fullName ||
        option.label ||
        option.display ||
        option.eofficeAccount ||
        String(option[optionValue] || option._id || option.id || "") ||
        "Đang tải..."
      );
    },
    [optionLabel, optionValue]
  );
  // Fetch danh sách khi tìm kiếm hoặc mở dropdown
  const fetchOptions = useCallback(
    async (query = "") => {
      if (!url) return;
      setLoading(true);
      try {
        let activeQueryParam = queryParam;
        
        // Cập nhật linh hoạt queryParam nếu không truyền queryParam cố định và cờ autoDetect được kích hoạt
        if (!activeQueryParam && autoDetectQueryParam && internalOptionsRef.current.length > 0) {
          const sample = internalOptionsRef.current[0];
          const hasTitle = sample.title !== undefined;
          const hasName = sample.name !== undefined;
          
          if (hasTitle && !hasName) {
            activeQueryParam = "title";
          } else if (hasName && !hasTitle) {
            activeQueryParam = "name";
          }
        }

        let res;
        if (body) {
           const postQueryParam = activeQueryParam || fallbackQueryParam || "keySearch";
           const payload = { ...body, [postQueryParam]: query, page: 1, limit: limit };
           res = await axiosInstance.post(url, payload);
        } else {
            let apiUrl = url.includes("?") ? `${url}&` : `${url}?`;
            const getQueryParam = activeQueryParam || fallbackQueryParam || queryParam;
            if (getQueryParam && query) {
              apiUrl += `${getQueryParam}=${encodeURIComponent(query)}&`;
            }
            apiUrl += `page=1&limit=${limit}`;
            res = await axiosInstance.get(apiUrl);
        }

        const data = res?.data?.data || res?.data || res?.items || res || [];
        const newDataList = Array.isArray(data) ? data : [];
        setServerOptions(newDataList);
        
        setInternalOptions((prev) => {
          const newData = newDataList;

          const extractId = (v) => (v !== null && v !== undefined ? (typeof v === "object" ? getId(v) : String(v)) : null);

          const selectedIds = Array.isArray(propValue)
            ? propValue.map(extractId)
            : [extractId(propValue)];

          const validSelectedIds = selectedIds.filter(id => id !== null && id !== undefined);

          const preservedItems = prev.filter((item) => {
            const id = getId(item);
            return (
              validSelectedIds.includes(id) &&
              !newData.some((newItem) => getId(newItem) === id)
            );
          });

          return [...preservedItems, ...newData];
        });

      } catch (err) {
        toast?.("Lỗi tải dữ liệu", "error");
      } finally {
        setLoading(false);
      }
    },
    [url, queryParam, fallbackQueryParam, autoDetectQueryParam, limit, toast, propValue, getId, body]
  );

  // Debounce search
  useEffect(() => {
    if (!searchText && open) {
      fetchOptions("");
      return;
    }

    const timer = setTimeout(() => {
      if (open && searchText) {
        fetchOptions(searchText);
      }
    }, debounceTime);
    return () => clearTimeout(timer);
  }, [searchText, open, debounceTime, fetchOptions]);

  // Clear options khi URL thay đổi (ví dụ khi excludeId thay đổi) để đảm bảo load lại dữ liệu mới
  useEffect(() => {
    setInternalOptions([]);
    setServerOptions([]);
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

      if (idsToFetch.length > 0) {
        setLoading(true);
        try {
          // Nếu queryParam === null → đây là static list API (vd: /common-source/S002)
          // không có endpoint /{id} → skip bước GET /{id}, fetch full list ngay
          const isStaticList = queryParam === null;

          let results;
          if (isStaticList) {
            // Đánh dấu tất cả là "error" để đi thẳng vào fallback
            results = idsToFetch.map((id) => ({ id, error: true }));
          } else {
            const _urlBase = String(url).split("?")[0].replace(/\/$/, "");
            const _urlQuery = String(url).includes("?") ? `?${String(url).split("?")[1]}` : "";
            const promises = idsToFetch.map((id) =>
              axiosInstance
                .get(`${_urlBase}/${encodeURIComponent(String(id))}${_urlQuery}`)
                .then((res) => ({ id, data: res.data || res.items || res }))
                .catch(() => ({ id, error: true }))
            );
            results = await Promise.all(promises);
          }

          // Với các kết quả lỗi, fallback: fetch toàn list rồi tìm theo ID/value/code
          const failedIds = results
            .filter((r) => r.error || !r.data)
            .map((r) => String(r.id));

          let fallbackMap = {};
          if (failedIds.length > 0) {
            try {
              const listRes = await axiosInstance.get(url);
              const listRaw =
                listRes?.data?.data || listRes?.data || listRes?.items || listRes || [];
              const list = Array.isArray(listRaw) ? listRaw : [];
              list.forEach((item) => {
                const byId = getId(item);
                if (byId && failedIds.includes(String(byId))) {
                  fallbackMap[String(byId)] = item;
                }
                // Match thêm theo value/code (thường gặp trong static list như S002)
                const altId = item?.value ?? item?.code;
                if (altId && failedIds.includes(String(altId))) {
                  fallbackMap[String(altId)] = item;
                }
              });
            } catch {
              // fallback cũng thất bại, tiếp tục với fetchedItems
            }
          }

          const fetchedItems = results.map((res) => {
            if (res.error || !res.data) {
              const found = fallbackMap[String(res.id)];
              if (found) return found;
              return {
                [optionValue]: res.id,
                [optionLabel]: "Không tải được tên",
              };
            }
            return res.data;
          });

          setInternalOptions((prev) => {
            const newItems = fetchedItems.filter(
              (item) => !prev.some((o) => getId(o) === getId(item))
            );
            return [...newItems, ...prev];
          });
        } catch (err) {
          // console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    processValue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    propValue,
    url,
    queryParam,
    // internalOptions, // Removed to prevent infinite loop
    optionValue,
    optionLabel,
    getId,
  ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Đồng bộ searchText khi value bị xóa/reset bên ngoài
  useEffect(() => {
    if (!propValue) {
      setSearchText("");
    }
  }, [propValue]);

  // Đảm bảo giá trị đang chọn luôn nằm trong options (tránh lỗi dataset)
  const finalOptions = useMemo(() => {
    let list = props.options ? [...props.options] : [...internalOptions];

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
  }, [internalOptions, propValue, isMulti, optionValue, optionLabel, getId, props.options]);

  const handleOpen = () => {
    setOpen(true);
    // Luôn load danh sách mới nhất khi mở dropdown (bất kể cache cũ)
    fetchOptions(searchText || "");
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    setIsExpandedTags(false);
  }, []);

  const handleBlur = useCallback(() => {
    setIsExpandedTags(false);
  }, []);

  const handleExpandTags = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpandedTags(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleChange = (event, newValue) => {
    if (isMulti) {
      const result = newValue
        ? newValue.map((item) => (returnObject ? item : getId(item)))
        : [];
      onChange(result);
    } else {
      const result = newValue
        ? returnObject
          ? newValue
          : getId(newValue)
        : null;
      onChange(result);
      setOpen(false);
    }
    setSearchText("");
  };

  // Handler xóa option trên dropdown (generic)
  const handleDeleteOption = useCallback(
    async (option) => {
      if (!urlDelete) return;
      try {
        await urlDelete(option);
        const deletedId = getId(option);
        setInternalOptions((prev) => prev.filter((o) => getId(o) !== deletedId));
        setServerOptions((prev) => prev.filter((o) => getId(o) !== deletedId));
        toast?.("Xóa thành công", "success");
      } catch (error) { // eslint-disable-line no-unused-vars
        toast?.("Xóa thất bại", "error");
      }
    },
    [urlDelete, getId, toast]
  );

  const handleInputChange = (event, newInputValue, reason) => {
    if (reason === "input") {
      setSearchText(newInputValue);
    } else if (reason === "clear") {
      setSearchText("");
    }
  };

  return (
    <StyledAutoComplete
      isCompact={isCompact}
      freeSolo={freeSolo}
      multiple={isMulti}
      disabled={disabled}
      loading={loading}
      open={open}
      onOpen={handleOpen}
      onClose={handleClose}
      onBlur={handleBlur}
      disableClearable={disableClearable}
      renderTags={(value, getTagProps) => {
        const currentLimit = isExpandedTags ? undefined : limitTags;
        const limitedValue =
          currentLimit && value.length > currentLimit
            ? value.slice(0, currentLimit)
            : value;
        const hiddenValue =
          currentLimit && value.length > currentLimit
            ? value.slice(currentLimit)
            : [];

        return (
          <>
            {limitedValue.map((option, index) => {
              const { ...tagProps } = getTagProps({ index });
              const fullLabel = getLabel(option);
              const shortLabel =
                fullLabel.length > 20
                  ? fullLabel.substring(0, 20) + "..."
                  : fullLabel;

              return (
                <Tooltip title={fullLabel} key={getId(option) || index}>
                  <StyledChip size="small" label={shortLabel} {...tagProps} />
                </Tooltip>
              );
            })}
            {hiddenValue.length > 0 && (
              <Tooltip
                title={
                  <StyledTooltipContainer>
                    {hiddenValue.map((option, idx) => (
                      <StyledTooltipItem key={getId(option) || idx}>
                        • {getLabel(option)}
                      </StyledTooltipItem>
                    ))}
                  </StyledTooltipContainer>
                }
              >
                <StyledLimitTags onClick={handleExpandTags}>
                  +{hiddenValue.length}
                </StyledLimitTags>
              </Tooltip>
            )}
          </>
        );
      }}
      value={
        isMulti
          ? Array.isArray(propValue)
            ? propValue
                .map((item) => {
                  const itemId = getId(item);
                  return finalOptions.find((o) => getId(o) === itemId);
                })
                .filter(Boolean)
            : []
          : finalOptions.find((o) => getId(o) === getId(propValue)) || null
      }
      options={finalOptions}
      onChange={handleChange}
      onInputChange={handleInputChange}
      filterOptions={
        props.filterOptions ??
        (url
          ? (options) => {
              // Chỉ lấy kết quả từ server trả ra để hiển thị trên dropdown
              return options.filter((option) => {
                const optionId = getId(option);
                return serverOptions.some((s) => getId(s) === optionId);
              });
            }
          : undefined)
      }
      filterSelectedOptions
      size={size}
      limitTags={limitTags}
      noOptionsText="Không tìm thấy"
      loadingText="Đang tải..."
      getOptionLabel={getLabel}
      isOptionEqualToValue={(option, value) => getId(option) === getId(value)}
      renderOption={(renderProps, option) => {
        const { key, ...otherProps } = renderProps;
        const showDelete = onDeleteOption && deleteCondition && deleteCondition(option);
        return (
          <DeletableOptionItem
            key={getId(option) || key}
            optionProps={otherProps}
            label={getLabel(option)}
            showDelete={showDelete}
            option={option}
            onDelete={handleDeleteOption}
          />
        );
      }}
      renderInput={(params) => (
        <Input
          {...params}
          size={size}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          InputLabelProps={{ ...params.InputLabelProps, shrink: true, error }}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                {startAdornment}
                {params.InputProps.startAdornment}
              </>
            ),
            endAdornment: (
              <>
                {loading && <StyledCircularProgress size={20} />}
                {!disableEndIcon && params.InputProps.endAdornment}
              </>
            ),
          }}
          inputRef={inputRef}
        />
      )}
      {...rest}
    />
  );
}

AsyncAutocompletes.propTypes = {
  url: PropTypes.string,
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
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
  limit: PropTypes.number,
  loadOnMount: PropTypes.bool,
  startAdornment: PropTypes.node,
  disableEndIcon: PropTypes.bool,
  placeholder: PropTypes.string,
  debounceTime: PropTypes.number,
  disableClearable: PropTypes.bool,
  isCompact: PropTypes.bool,
  fallbackQueryParam: PropTypes.string,
  autoDetectQueryParam: PropTypes.bool,
  freeSolo: PropTypes.bool,
  onDeleteOption: PropTypes.bool,
  urlDelete: PropTypes.func,
  deleteCondition: PropTypes.func,
};

export default memo(AsyncAutocompletes);