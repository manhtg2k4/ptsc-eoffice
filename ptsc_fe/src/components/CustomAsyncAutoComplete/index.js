/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { StyledAutoComplete } from "@styles/CustomAotoComplete.styles";
import Input from "@components/CustomInput/CustomInputBase";
import { Chip, CircularProgress, Tooltip, IconButton } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { styled } from "@mui/material/styles";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import { SkyBox, SkyTypography } from "@styles/SkyStyles";

/**
 * AsyncAutocomplete Component
 *
 * Mô tả:
 * - Component autocomplete có khả năng tự fetch dữ liệu qua API.
 * - Hỗ trợ tìm kiếm (debounce), giới hạn số bản ghi (limit), và lọc thêm theo filters.
 * - Cho phép chọn đơn hoặc nhiều giá trị (isMulti).
 * - Có thể trả về object hoặc chỉ giá trị id/code/... tùy vào cấu hình.
 *
 * Props:
 * @param {string} url - Endpoint API để fetch dữ liệu.
 * @param {any|any[]} value - Giá trị hiện tại của autocomplete (object hoặc id).
 * @param {function} onChange - Hàm callback khi thay đổi giá trị.
 * @param {boolean} [disabled=false] - Disable input.
 * @param {boolean} [error=false] - Hiển thị trạng thái lỗi.
 * @param {string} [heplText] - Text hiển thị dưới input khi lỗi hoặc gợi ý.
 * @param {boolean} [required=false] - Có bắt buộc nhập không.
 * @param {string} [optionLabel] - Tên thuộc tính hiển thị trong option (ví dụ "name" hoặc "title").
 * @param {string} [optionValue="_id"] - Tên thuộc tính dùng làm giá trị định danh option.
 * @param {boolean} [isMulti=false] - Cho phép chọn nhiều giá trị.
 * @param {boolean} [returnObject=false] - Nếu true trả về object, nếu false trả về id/code/giá trị.
 * @param {string} [label] - Label hiển thị cho input.
 * @param {string} [code] - Nếu có, tìm trong response item theo `item.code === code` để lấy data con.
 * @param {boolean} [loadOnMount=true] - Tự động load dữ liệu khi mount component.
 * @param {number} [limit=20] - Giới hạn số bản ghi mỗi lần fetch.
 * @param {number|string} [limitTags] - Giới hạn số tag hiển thị khi isMulti = true.
 * @param {boolean} [useCombinedLabel=false] - Bật/tắt hiển thị nhãn dạng `Tên - Trường mở rộng`.
 * @param {string} [combinedLabelField] - Tên field sẽ được nối thêm vào sau nhãn chính.
 * @param {string} [size="small"] - Kích thước input (`small` | `medium`).
 * @param {object} sharedComponents - Inject các component chia sẻ (Input, toast,...).
 * @param {...object} rest - Các props khác truyền xuống `Autocomplete` gốc của MUI.
 *
 * Ví dụ sử dụng:
 * ```jsx
        <AsyncAutoComplete
          label="Khu vực"
          isMulti
          url="users/all"
          onChange={handleSelect}
          value={selectedUser}
          optionLabel="name"
          optionValue="id"
          queryParam="name"
          debounceTime={500}
          limit={10}
        />
 * ```
 */

const StyledLimitBadge = styled(SkyBox)(() => ({
  position: "absolute",
  right: "38px",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 2,
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
  userSelect: "none",
  transition: "all 0.2s ease-in-out",
  boxShadow: "0px 2px 4px rgba(0,0,0,0.15)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  "&:hover": {
    backgroundColor: "#2c3e50",
    transform: "translateY(-50%) scale(1.08)",
  },
}));

const StyledMultiOptionChip = styled(Chip)(({ $hasSubLabel }) => ({
  borderRadius: '7px',
  padding: '4px 6px',
  maxWidth: '160px',
  flexShrink: 1,
  minWidth: 0,
  boxSizing: 'border-box',
  ...($hasSubLabel && {
    height: 'auto',
    backgroundColor: "#F3F5F6",
    border: "1px solid #B9C2CA",
    fontWeight: 'bold'
  }),
  "&.Mui-disabled": {
    opacity: 1,
  },
  "& .MuiChip-label": {
    opacity: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
    maxWidth: '100%',
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
  fontWeight: 600,
  color: "#16191D",
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
          <div style={{ fontSize: "10px", color: "#575F6B", textTransform: "uppercase", marginTop: "5px" }}>
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

const OptionColumnContent = styled('div')({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  flex: 1,
  minWidth: 0,
});

const DeleteIcon = styled(CloseRounded)({
  fontSize: 16,
});

const SubLabelText = styled('div')({
  fontSize: "10px",
  color: "#575F6B",
  marginTop: "5px",
  textTransform: "uppercase",
});

const MainLabelText = styled('div')({
  fontWeight: 600,
  fontSize: "14px",
  color: "#16191D",
});

const StyledLi = styled('li')(({ $hasSubLabel }) => ({
  display: "flex !important",
  flexDirection: "row !important",
  alignItems: "center !important",
  justifyContent: "space-between !important",
  width: "100%",
  padding: $hasSubLabel ? "8px 16px !important" : undefined,
}));

const DeletableOptionItem = memo(({ optionProps, showDelete, option, onDelete, optionSubLabel, children }) => {
  const { onClick: muiOnClick, ...restLiProps } = optionProps;

  const handleLiClick = useCallback((e) => {
    if (e.target.closest('[data-delete-btn]')) return;
    if (muiOnClick) muiOnClick(e);
  }, [muiOnClick]);

  const handleDeleteClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(option);
  }, [onDelete, option]);

  const handleDeleteMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <StyledLi {...restLiProps} onClick={handleLiClick} $hasSubLabel={!!optionSubLabel}>
      {children}
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
    </StyledLi>
  );
});
DeletableOptionItem.displayName = "DeletableOptionItem";

function AsyncAutocomplete(props) {
  const {
    limitTags,
    url,
    value: propValue,
    label,
    formLabel,
    onChange,
    disabled,
    error,
    heplText,
    helperText,
    required,
    optionLabel,
    isMulti,
    code,
    loadOnMount = false,
    optionValue = "_id",
    returnObject = true,
    size = "small",
    limit = 20,
    queryParam,
    queryParams, // Array của các param cần search, ví dụ: ["name", "email"]
    placeholder,
    useCombinedLabel = false,
    combinedLabelField,
    debounceTime = 300,
    useFilterParam = false,
    dataSelectedOptions,
    method = "GET",
    body,
    hideDropdownIcon,
    optionSubLabel = false,
    sendEmptyQueryParam = false, // true: luôn gửi queryParam dù rỗng (backward compat); false: chỉ gửi khi có giá trị
    onDeleteOption,
    urlDelete,
    deleteCondition,
    allowOtherOption = false,
    otherOptionValue = "OTHER",
    otherOptionLabel = "--Khác--",
    ...rest
  } = props;
  const resolvedHideDropdownIcon = hideDropdownIcon !== undefined ? hideDropdownIcon : !!disabled;
  const resolvedDisableClearable = rest.disableClearable ?? (disabled && !!optionSubLabel);
  const toast = useToast();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [internalOptions, setInternalOptions] = useState([]);
  const [selectedValue, setSelectedValue] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

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

  const [isUserTyping, setIsUserTyping] = useState(false);
  const [, setIsFocused] = useState(false);
  // Track xem đã fetch lần đầu chưa để tránh gọi lại khi re-open
  const hasFetchedRef = useRef(false);
  // Track request gần nhất để tránh response cũ ghi đè response mới
  const latestRequestRef = useRef(0);
  const searchTimeoutRef = useRef(null);
  const selectedOptionsCacheRef = useRef(new Map());

  const getValueFromOption = (option) => {
    if (!option) return null;
    if (typeof option === 'string' || typeof option === 'number') return option;
    return (
      option[optionValue] ??
      option.value ??
      option.id ??
      option.code ??
      option._id ??
      null
    );
  };

  const getOptionCacheKey = useCallback(
    (option) => {
      const rawValue = getValueFromOption(option);
      if (rawValue === null || rawValue === undefined) return null;
      return String(rawValue);
    },
    [optionValue]
  );

  const cacheSelectedOptions = useCallback(
    (options) => {
      const optionList = Array.isArray(options) ? options : options ? [options] : [];
      optionList.forEach((option) => {
        if (!option || typeof option !== "object") return;
        const optionKey = getOptionCacheKey(option);
        if (!optionKey) return;
        selectedOptionsCacheRef.current.set(optionKey, option);
      });
    },
    [getOptionCacheKey]
  );

  const fetchData = useCallback(
    async (query) => {
      if (!url) return;
      const requestId = ++latestRequestRef.current;
      // Tránh hiển thị dữ liệu cũ khi user đang tìm kiếm chuỗi mới
      if (query) {
        setInternalOptions([]);
      }
      setLoading(true);
      try {
        let response;
        if (method === "POST" || body) {
          const payload = {
            ...(body || {}),
            [queryParam || "q"]: query || "",
            page: 1,
            limit: limit,
          };
          response = await axiosInstance.post(url, payload);
        } else {
          let apiUrl = url.includes("?") ? `${url}&` : `${url}?`;

          // Xây dựng query part hỗ trợ cả queryParam (string) và queryParams (array)
          let queryPart = "";
          const queryValue = query ?? "";

          if (queryParams && Array.isArray(queryParams) && queryParams.length > 0) {
            // queryParams là array - gửi nhiều param cùng lúc
            // Chỉ gửi param khi có giá trị (hoặc khi sendEmptyQueryParam=true)
            if (queryValue || sendEmptyQueryParam) {
              queryParams.forEach((param) => {
                const paramName = useFilterParam ? `filter[${param}]` : param;
                queryPart += `${paramName}=${encodeURIComponent(queryValue)}&`;
              });
            }
          } else if (queryParam) {
            // queryParam là string đơn - chỉ gửi khi có giá trị (hoặc sendEmptyQueryParam=true)
            if (queryValue || sendEmptyQueryParam) {
              const paramName = useFilterParam ? `filter[${queryParam}]` : queryParam;
              queryPart = `${paramName}=${encodeURIComponent(queryValue)}&`;
            }
          } else {
            // Không có queryParam/queryParams - dùng "q" mặc định (chỉ khi có giá trị)
            if (queryValue || sendEmptyQueryParam) {
              queryPart = `q=${encodeURIComponent(queryValue)}&`;
            }
          }

          apiUrl += `${queryPart}page=1&limit=${limit}`;
          response = await axiosInstance.get(apiUrl);
        }
        const payload = response?.data ?? response ?? [];
        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(response?.items)
                ? response.items
                : [];

        // Dedupe cứng theo id/value để không render trùng ở dropdown
        const normalized = [];
        const seenKeys = new Set();
        for (const item of data) {
          const itemKeyRaw =
            item?.[optionValue] ??
            item?.value ??
            item?.id ??
            item?.code ??
            item?._id;
          const itemKey = itemKeyRaw === null || itemKeyRaw === undefined
            ? null
            : String(itemKeyRaw);
          if (!itemKey || seenKeys.has(itemKey)) continue;
          seenKeys.add(itemKey);
          normalized.push(item);
        }

        // Nếu request này không còn là request mới nhất thì bỏ qua kết quả
        if (requestId !== latestRequestRef.current) return;

        cacheSelectedOptions(normalized);
        setInternalOptions(normalized);
        setLoading(false);
      } catch (error) {
        if (requestId !== latestRequestRef.current) return;
        setLoading(false);
        const errorMessage = error?.response?.data?.message || error.message || "Lỗi khi load dữ liệu";
        toast(errorMessage, "error");
        setInternalOptions([]);
      }
    },
    [url, code, limit, toast, queryParam, queryParams, useFilterParam, method, body, optionValue, cacheSelectedOptions]
  );

  // Load khi mount nếu loadOnMount=true (ví dụ dùng cho các field luôn hiển thị)
  useEffect(() => {
    if (loadOnMount && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset hasFetchedRef và clear options khi URL thay đổi để đảm bảo dữ liệu mới nhất được load khi mở lại dropdown
  useEffect(() => {
    hasFetchedRef.current = false;
    setInternalOptions([]);
  }, [url]);

  useEffect(() => () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const fetchInitialValue = async (valueId) => {
      if (!valueId || !url || typeof valueId === "object") {
        if (typeof valueId === "object" && valueId !== null) {
          cacheSelectedOptions(valueId);
          setSelectedValue(isMulti ? valueId : [valueId]);
        } else {
          setSelectedValue(null);
        }
        return;
      }

      if (allowOtherOption && valueId) {
        const checkVal = Array.isArray(valueId) ? valueId[0] : valueId;
        const rawVal = getValueFromOption(checkVal);
        if (rawVal === otherOptionValue || checkVal === otherOptionValue) {
          const otherItem = {
            [optionValue]: otherOptionValue,
            [optionLabel]: otherOptionLabel,
            isOther: true,
          };
          cacheSelectedOptions(otherItem);
          setSelectedValue(isMulti ? [otherItem] : otherItem);
          return;
        }
      }

      // Chỉ fetch khi chưa có selectedValue hoặc id không khớp
      if (
        selectedValue &&
        selectedValue.find((v) => {
          const currentValue = getValueFromOption(v);
          return currentValue !== null &&
            currentValue !== undefined &&
            String(currentValue) === String(valueId);
        })
      ) {
        return;
      }

      setLoading(true);
      try {
        // Giả định API hỗ trợ lấy item bằng ID qua path /api/items/:id
        const urlBase = String(url).split("?")[0].replace(/\/$/, "");
        const urlQuery = String(url).includes("?") ? `?${String(url).split("?")[1]}` : "";
        const response = await axiosInstance.get(`${urlBase}/${encodeURIComponent(String(valueId))}${urlQuery}`);
        if (response) {
          cacheSelectedOptions(response);
          setSelectedValue(isMulti ? response : [response]);
          if (dataSelectedOptions) {
            dataSelectedOptions(isMulti ? [response] : response);
          }
        }
      } catch (error) {
        // Không toast lỗi ở đây để tránh phiền nhiễu, chỉ log ra console
        logger.error(
          "AsyncAutocomplete: Lỗi khi fetch giá trị ban đầu:",
          error
        );
        const cachedValue = selectedOptionsCacheRef.current.get(String(valueId));
        setSelectedValue(cachedValue ? [cachedValue] : null);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialValue(propValue);
  }, [propValue, url, isMulti, returnObject, cacheSelectedOptions]);

  const optionsArray = useMemo(() => {
    let list = [];
    if (Array.isArray(internalOptions)) {
      list = [...internalOptions];
    } else if (typeof internalOptions === "object" && internalOptions !== null) {
      if (
        internalOptions._id ||
        internalOptions.id ||
        internalOptions.value ||
        internalOptions.code
      ) {
        list = [internalOptions];
      } else {
        list = Object.values(internalOptions);
      }
    }

    if (allowOtherOption) {
      const otherItem = {
        [optionValue]: otherOptionValue,
        [optionLabel]: otherOptionLabel,
        isOther: true,
      };
      const exists = list.some(
        (opt) => getValueFromOption(opt) === otherOptionValue
      );
      if (!exists) {
        list.push(otherItem);
      }
    }

    return list;
  }, [internalOptions, allowOtherOption, optionValue, otherOptionValue, optionLabel, otherOptionLabel]);

  const isSameOptionValue = useCallback(
    (left, right) => {
      const leftValue = getValueFromOption(left);
      const rightValue = getValueFromOption(right);
      if (leftValue === null || leftValue === undefined || rightValue === null || rightValue === undefined) {
        return false;
      }
      return String(leftValue) === String(rightValue);
    },
    [optionValue]
  );

  const getOptionDisplayLabel = useCallback(
    (option) => {
      if (!option) return "";

      const baseLabel = option?.[optionLabel] || getValueFromOption(option) || "";
      if (!useCombinedLabel || !combinedLabelField) return String(baseLabel);

      const extraLabel = option?.[combinedLabelField];
      if (extraLabel === undefined || extraLabel === null || extraLabel === "") {
        return String(baseLabel);
      }

      return `${baseLabel} - ${extraLabel}`;
    },
    [optionLabel, optionValue, useCombinedLabel, combinedLabelField]
  );

  const resolvedValue = useMemo(() => {
    const selectedOptions = Array.isArray(selectedValue)
      ? selectedValue
      : selectedValue
        ? [selectedValue]
        : [];
    const findOptionByValue = (val) => {
      const optionKey = getOptionCacheKey(val);
      return optionsArray.find((option) => isSameOptionValue(option, val)) ||
        selectedOptions.find((option) => isSameOptionValue(option, val)) ||
        (optionKey ? selectedOptionsCacheRef.current.get(optionKey) : null);
    };

    if (isMulti) {
      if (!Array.isArray(propValue)) return [];
      return propValue
        .map((val) =>
          val && typeof val === "object"
            ? val
            : findOptionByValue(val)
        )
        .filter(Boolean);
    }

    // Xử lý trường hợp không phải multi
    const val = Array.isArray(propValue) ? propValue[0] : propValue;
    if (!val) return null;

    if (typeof val === "object") {
      return val;
    }

    const found = findOptionByValue(val);
    return found || null;
  }, [propValue, optionsArray, selectedValue, isMulti, isSameOptionValue, getOptionCacheKey]);

  const handleDeleteItem = useCallback((optionToDelete) => {
    const newValue = resolvedValue.filter((option) => getValueFromOption(option) !== getValueFromOption(optionToDelete));
    
    onChange(
      newValue.map((item) => (returnObject ? item : getValueFromOption(item)))
    );
    
    const maxToShow = Number(limitTags) || 3;
    if (newValue.length <= maxToShow) {
      setOpenDialog(false);
    }
  }, [resolvedValue, onChange, returnObject, limitTags, getValueFromOption]);

  // Lazy load: chỉ fetch lần đầu tiên khi user mở dropdown
  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData("");
    }
  }, [fetchData]);

  const handleOnChange = (event, value) => {
    setIsUserTyping(false);
    setOpenDialog(false);
    cacheSelectedOptions(value);

    if (isMulti) {
      setSelectedValue(value);
    } else {
      setSelectedValue(value ? [value] : null);
    }

    if (isMulti) {
      const values = value
        ? value.map((option) =>
          returnObject ? option : getValueFromOption(option)
        )
        : [];

      onChange(values);
    } else {
      const singleValue = value
        ? returnObject
          ? value
          : getValueFromOption(value)
        : null;
      onChange(singleValue);

      setOpen(false);
    }

    setSearchText("");
    // Sau khi chọn xong trong multi mode, reload lại danh sách mặc định
    // để dropdown hiển thị đúng các options còn lại (thay vì giữ kết quả search cũ)
    if (isMulti) {
      fetchData("");
    }
  };

  const handleDeleteOption = useCallback(
    async (option) => {
      if (!urlDelete) return;
      try {
        await urlDelete(option);
        const deletedId = getValueFromOption(option);
        setInternalOptions((prev) => {
          const list = Array.isArray(prev)
            ? prev
            : (prev && typeof prev === "object")
              ? (prev._id || prev.id || prev.value || prev.code ? [prev] : Object.values(prev))
              : [];
          return list.filter((o) => getValueFromOption(o) !== deletedId);
        });
        toast("Xóa thành công", "success");
      } catch (error) { // eslint-disable-line no-unused-vars
        toast("Xóa thất bại", "error");
      }
    },
    [urlDelete, getValueFromOption, toast]
  );

  const renderOptionMemo = useMemo(() => {
    const RenderOptionItem = (renderProps, option) => {
      const { key, ...otherProps } = renderProps;
      const showDelete = onDeleteOption && deleteCondition && deleteCondition(option);
      
      if (optionSubLabel) {
        let mainLabel = "";
        let subLabel = null;

        if (typeof optionSubLabel === 'string' && option[optionSubLabel]) {
           mainLabel = getOptionDisplayLabel(option);
           subLabel = option[optionSubLabel];
        } else {
           const fullLabel = getOptionDisplayLabel(option);
           const parts = fullLabel.split(" - ");
           mainLabel = parts[0];
           subLabel = parts.length > 1 ? parts.slice(1).join(" - ") : null;
        }

        return (
          <DeletableOptionItem
            key={getValueFromOption(option) || key}
            optionProps={otherProps}
            showDelete={showDelete}
            option={option}
            onDelete={handleDeleteOption}
            optionSubLabel={optionSubLabel}
          >
            <OptionColumnContent>
              <MainLabelText>{mainLabel}</MainLabelText>
              {subLabel && <SubLabelText>{subLabel}</SubLabelText>}
            </OptionColumnContent>
          </DeletableOptionItem>
        );
      }

      return (
        <DeletableOptionItem
          key={getValueFromOption(option) || key}
          optionProps={otherProps}
          showDelete={showDelete}
          option={option}
          onDelete={handleDeleteOption}
          optionSubLabel={optionSubLabel}
        >
          <OptionContent>{getOptionDisplayLabel(option)}</OptionContent>
        </DeletableOptionItem>
      );
    };
    RenderOptionItem.displayName = "RenderOptionItem";
    return RenderOptionItem;
  }, [onDeleteOption, deleteCondition, optionSubLabel, getOptionDisplayLabel, handleDeleteOption, getValueFromOption]);

  const handleInputChange = (event, newInputValue, reason) => {
    if (reason === "input") {
      setIsUserTyping(true);
      setSearchText(newInputValue);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        fetchData(newInputValue);
      }, debounceTime);
    } else if (reason === "clear") {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setIsUserTyping(false);
      setSearchText("");
    }
  };

  const handleClose = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setOpen(false);
    // Nếu user đang search (isUserTyping=true) khi đóng dropdown
    // → reload lại danh sách mặc định để lần mở sau hiển thị đúng
    if (isUserTyping) {
      fetchData("");
    }
    setIsUserTyping(false);
    setSearchText("");
    setOpenDialog(false);
  };
  return (
    <>
      <StyledAutoComplete
        $optionSubLabel={!!optionSubLabel}
        multiple={isMulti}
        freeSolo={rest.freeSolo}
        value={resolvedValue}
        disabled={disabled}
        disableClearable={resolvedDisableClearable}
        loading={loading}
        filterSelectedOptions
        forcePopupIcon={resolvedHideDropdownIcon ? false : undefined}
        popupIcon={resolvedHideDropdownIcon ? null : undefined}
        options={useMemo(() => {
          const baseOptions = url
            ? optionsArray
            : (props.options || optionsArray);
          const combined = Array.isArray(baseOptions) ? [...baseOptions] : [];
          const toOptionKey = (option) => {
            const rawValue = getValueFromOption(option);
            if (rawValue === null || rawValue === undefined) return null;
            return String(rawValue);
          };

          const existingKeys = new Set(
            combined.map((opt) => toOptionKey(opt)).filter(Boolean)
          );

          const valueAsArray = resolvedValue
            ? isMulti
              ? resolvedValue
              : [resolvedValue]
            : [];

          const selectedValueAsArray = Array.isArray(selectedValue)
            ? selectedValue
            : selectedValue
              ? [selectedValue]
              : [];

          [...valueAsArray, ...selectedValueAsArray].forEach((val) => {
            if (!val) return;
            const valueKey = toOptionKey(val);
            if (valueKey && !existingKeys.has(valueKey)) {
              const otherIndex = combined.findIndex(
                (opt) => getValueFromOption(opt) === otherOptionValue
              );
              if (otherIndex !== -1 && getValueFromOption(val) !== otherOptionValue) {
                combined.splice(otherIndex, 0, val);
              } else {
                combined.push(val);
              }
              existingKeys.add(valueKey);
            }
          });
          return combined;
        }, [optionsArray, resolvedValue, selectedValue, isMulti, props.options, url, otherOptionValue])}
        filterOptions={url ? (options) => options : (options, state) => {
          // Client-side filter: tìm kiếm theo cả name và email
          if (!state.inputValue) return options;
          const searchTerm = state.inputValue.toLowerCase();
          return options.filter(opt => {
            const name = (opt[optionLabel] || "").toLowerCase();
            const email = (opt.email || "").toLowerCase();
            return name.includes(searchTerm) || email.includes(searchTerm);
          });
        }}
        size={size}
        noOptionsText="Không tìm thấy kết quả"
        onOpen={handleOpen}
        onChange={handleOnChange}
        onClose={handleClose}
        open={open}
        inputValue={isMulti ? searchText : undefined} // Chỉ kiểm soát inputValue khi isMulti={true}
        limitTags={undefined}
        onInputChange={handleInputChange}
        getOptionLabel={getOptionDisplayLabel}
        isOptionEqualToValue={(o, v) =>
          isSameOptionValue(o, v)
        }
        renderOption={renderOptionMemo}
        renderTags={isMulti ? (value, getTagProps) => {
          const maxToShow = Number(limitTags) || 3;
          const displayedValues = value.slice(0, maxToShow);
          const hiddenValues = value.slice(maxToShow);

          const renderedChips = displayedValues.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            const fullLabel = getOptionDisplayLabel(option);
            
            let mainLabel = fullLabel;
            let subLabel = null;

            if (optionSubLabel) {
              if (typeof optionSubLabel === 'string' && option[optionSubLabel]) {
                 mainLabel = getOptionDisplayLabel(option);
                 subLabel = option[optionSubLabel];
              } else {
                 const parts = fullLabel.split(" - ");
                 mainLabel = parts[0];
                 subLabel = parts.length > 1 ? parts.slice(1).join(" - ") : null;
              }
            }

            const chipLabel = subLabel ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '2px 0', maxWidth: '100%', overflow: 'hidden' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.1, color: '#16191D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{mainLabel}</span>
                <span style={{ fontSize: '10px', color: '#575F6B', textTransform: 'uppercase', lineHeight: 1.1, marginTop: '5px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subLabel}
                </span>
              </div>
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
                {mainLabel}
              </span>
            );

            const tooltipTitle = subLabel ? `${fullLabel} - ${subLabel}` : fullLabel;

            return (
              <Tooltip key={key || getValueFromOption(option) || index} title={tooltipTitle} arrow>
                <StyledMultiOptionChip
                  {...tagProps}
                  label={chipLabel}
                  size="small"
                  $hasSubLabel={!!subLabel}
                  onDelete={disabled ? undefined : tagProps.onDelete}
                  deleteIcon={disabled ? null : tagProps.deleteIcon}
                  disabled={disabled}
                />
              </Tooltip>
            );
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
        } : undefined}
        renderInput={(params) => {
          let customInputDisplay = null;
          if (!isMulti && resolvedValue && optionSubLabel && !isUserTyping) {
            let mainLabel = "";
            let subLabel = null;

            if (typeof optionSubLabel === 'string' && resolvedValue[optionSubLabel]) {
               mainLabel = getOptionDisplayLabel(resolvedValue);
               subLabel = resolvedValue[optionSubLabel];
            } else {
               const fullLabel = getOptionDisplayLabel(resolvedValue);
               const parts = fullLabel.split(" - ");
               mainLabel = parts[0];
               subLabel = parts.length > 1 ? parts.slice(1).join(" - ") : null;
            }

            const tooltipTitle = subLabel ? `${mainLabel} - ${subLabel}` : mainLabel;

            customInputDisplay = (
              <>
                <style>
                  {`
                    .custom-autocomplete-hidden-input::selection {
                      background: transparent !important;
                      color: transparent !important;
                    }
                    .MuiOutlinedInput-root .MuiInputBase-input.custom-autocomplete-hidden-input.Mui-disabled,
                    .MuiOutlinedInput-root .MuiInputBase-input.custom-autocomplete-hidden-input:disabled,
                    .MuiInputBase-root .MuiInputBase-input.custom-autocomplete-hidden-input,
                    .custom-autocomplete-hidden-input {
                      color: transparent !important;
                      -webkit-text-fill-color: transparent !important;
                    }
                  `}
                </style>
                <Tooltip title={tooltipTitle} arrow>
                  <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '14px', right: '70px', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', backgroundColor: 'transparent', zIndex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "#16191D", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mainLabel}</div>
                    {subLabel && (
                      <div style={{ fontSize: "10px", color: "#575F6B", marginTop: "5px", textTransform: "uppercase", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subLabel}</div>
                    )}
                  </div>
                </Tooltip>
              </>
            );
          }

          return (
            <div style={{ position: "relative", width: "100%" }}>
              <Input
                {...params}
                size={size}
                label={optionSubLabel ? '' : label}
                placeholder={isMulti && resolvedValue && resolvedValue.length > 1 ? "" : placeholder}
                required={required}
                error={error}
                helperText={helperText || heplText}
                InputLabelProps={{ shrink: true }}
                disabled={disabled}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                  style: {
                    ...(params.InputProps?.style || {}),
                    minHeight: customInputDisplay ? "56px" : undefined,
                  }
                }}
                inputProps={{
                  ...params.inputProps,
                  className: `${params.inputProps.className || ''} ${customInputDisplay ? 'custom-autocomplete-hidden-input' : ''}`.trim(),
                  onFocus: (e) => {
                    setIsFocused(true);
                    if (params.inputProps?.onFocus) {
                      params.inputProps.onFocus(e);
                    }
                  },
                  onBlur: (e) => {
                    setIsFocused(false);
                    if (params.inputProps?.onBlur) {
                      params.inputProps.onBlur(e);
                    }
                  },
                  style: {
                    ...(params.inputProps?.style || {}),
                    color: customInputDisplay ? "transparent" : "inherit",
                    WebkitTextFillColor: customInputDisplay ? "transparent" : "inherit",
                  }
                }}
                slotProps={{
                  input: {
                    ...params.InputProps,
                    type: "text",
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
            {resolvedValue && resolvedValue.map((option, idx) => {
              const fullLabel = getOptionDisplayLabel(option);
              let mainLabel = fullLabel;
              let subLabel = null;

              if (optionSubLabel) {
                if (typeof optionSubLabel === 'string' && option[optionSubLabel]) {
                   mainLabel = getOptionDisplayLabel(option);
                   subLabel = option[optionSubLabel];
                } else {
                   const parts = fullLabel.split(" - ");
                   mainLabel = parts[0];
                   subLabel = parts.length > 1 ? parts.slice(1).join(" - ") : null;
                }
              }

              return (
                <DialogItem
                  key={getValueFromOption(option) ?? idx}
                  option={option}
                  mainLabel={mainLabel}
                  subLabel={subLabel}
                  optionId={getValueFromOption(option) ?? idx}
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

AsyncAutocomplete.propTypes = {
  url: PropTypes.string,
  options: PropTypes.array,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object,
    PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
        PropTypes.object,
      ])
    ),
  ]),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  heplText: PropTypes.string,
  required: PropTypes.bool,
  label: PropTypes.string,
  optionLabel: PropTypes.string,
  optionValue: PropTypes.string,
  isMulti: PropTypes.bool,
  returnObject: PropTypes.bool,
  code: PropTypes.string,
  loadOnMount: PropTypes.bool,
  limit: PropTypes.number,
  limitTags: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  size: PropTypes.oneOf(["small", "medium"]),
  sharedComponents: PropTypes.shape({
    Input: PropTypes.elementType,
    toast: PropTypes.func,
  }),
  useCombinedLabel: PropTypes.bool,
  combinedLabelField: PropTypes.string,
  useFilterParam: PropTypes.bool,
  isSearchText: PropTypes.bool,
  dataSelectedOptions: PropTypes.func,
  method: PropTypes.string,
  body: PropTypes.object,
  formLabel: PropTypes.string,
  hideDropdownIcon: PropTypes.bool,
  optionSubLabel: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  queryParams: PropTypes.arrayOf(PropTypes.string),
  onDeleteOption: PropTypes.bool,
  urlDelete: PropTypes.func,
  deleteCondition: PropTypes.func,
  allowOtherOption: PropTypes.bool,
  otherOptionValue: PropTypes.string,
  otherOptionLabel: PropTypes.string,
};

export default memo(AsyncAutocomplete);
