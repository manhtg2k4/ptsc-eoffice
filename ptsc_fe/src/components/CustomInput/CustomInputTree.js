import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import {
  StyledTextField,
  SearchBoxContainer,
  TreeLinesContainer,
  TreeParentVerticalLine,
  TreeNodeVerticalLine,
  TreeNodeHorizontalLine,
  TreeItemContent,
  TreeViewMenuItem,
  ClearableInputAdornment,
  TreeViewPlaceholder,
  PasswordInputAdornment,
  SearchInputAdornment,
  SearchClearButton,
  SmallClearIcon,
  RequiredLabel,
  TreeIconBox,
  TreeIcon,
  ChipContainer,
  NoDataMenuItem,
  TreeLinesTextField,
  StyleIconUploadFileToCmt,
  TruncatedText,
  TruncatedWrapper,
} from "@styles/CustomInput.styles";
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  styled,
  Tooltip,
  CircularProgress,
  Typography,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import PropTypes from "prop-types";
import {
  Add,
  Remove,
  Visibility,
  VisibilityOff,
  AttachFile,
  Close,
} from "@mui/icons-material";
import axiosInstance from "@utils/axiosInstance";
import { useToast } from "@components/common/ToastProvider";
import { useFormFieldLayout } from "./FormFieldLayoutContext";
import "./CustomCss.css";
const StyledCircularProgress = styled(CircularProgress)({
  color: 'var(--mui-palette-text-secondary, gray)',
});

const StyledSearchCircularProgress = styled(CircularProgress)({
  marginRight: '8px',
});

const StyledCheckbox = styled(Checkbox)({
  padding: 0,
  marginRight: '8px',
  pointerEvents: 'none',
});

const StyledLoadingMenuItem = styled(MenuItem)({
  justifyContent: 'center',
  paddingTop: '16px',
  paddingBottom: '16px',
});

const SearchMenuItem = styled(MenuItem)(({ theme }) => ({
  paddingTop: 8,
  paddingBottom: 8,
  pointerEvents: "auto",
  '& input': {
    pointerEvents: "auto",
  },
  '& button': {
    pointerEvents: "auto",
  },
  position: "sticky",
  top: 0,
  zIndex: 1300,
  backgroundColor: theme.palette.mode === "dark" 
    ? `${theme.palette.background.paper} !important` 
    : "#fff !important",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" 
      ? `${theme.palette.background.paper} !important` 
      : "#fff !important",
  },
  "&.Mui-focusVisible": {
    backgroundColor: theme.palette.mode === "dark" 
      ? `${theme.palette.background.paper} !important` 
      : "#fff !important",
  },
  "&.Mui-selected": {
    backgroundColor: theme.palette.mode === "dark" 
      ? `${theme.palette.background.paper} !important` 
      : "#fff !important",
  },
  "&.Mui-selected:hover": {
    backgroundColor: theme.palette.mode === "dark" 
      ? `${theme.palette.background.paper} !important` 
      : "#fff !important",
  },
  marginBottom: 4,
}));

const Placeholder = styled("span")(({ theme }) => ({
  color: theme.palette.text.disabled,
}));

const StackedFieldLabel = styled(Typography)({
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "20px",
  marginBottom: "6px",
});

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: theme.breakpoints.values.sm,
    width: "100%",
    minHeight: 400,
    maxHeight: 600,
    borderRadius: "12px",
  },
}));

const StyledDialogTitle = styled(DialogTitle)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '8px',
});

const StyledTitleText = styled(Typography)({
  fontSize: '1.25rem',
  fontWeight: 600,
});

const StyledDialogContent = styled(DialogContent)({
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

const DialogTreeContainer = styled("div")({
  flex: 1,
  overflowY: 'auto',
  maxHeight: '400px',
  minHeight: '250px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  padding: '8px',
});

const DialogTreeWrapper = styled("div")({
  display: 'flex',
  flexDirection: 'column',
});

const DialogLoaderContainer = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  paddingTop: "32px",
  paddingBottom: "32px",
});

const StyledDialogActions = styled(DialogActions)({
  paddingLeft: '24px',
  paddingRight: '24px',
  paddingTop: '16px',
  paddingBottom: '16px',
});

const DialogCloseButton = styled(Button)({
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
});

const CustomInputTree = ({
  api,
  apiChildren,
  apiExpand,
  hasAll = false,
  size,
  value: propValue,
  onChange,
  placeholder,
  label,
  fullWidth = true,
  error,
  helperText,
  required,
  multiline,
  rows,
  minRows,
  maxRows,
  select = false,
  customLabel = "name",
  customValue = "_id",
  multiple,
  type,
  view,
  treeView = true,
  isSelectable,
  width,
  disabled,
  readOnly = false,
  autoWidth,
  autoHeight,
  isUpfileToComment,
  onUploadFile,
  menuPlacement = "bottom",
  disableEndIcon = false,
  disablePortal = false,
  disableClear = false,
  labelLayout,
  disableSanitize = false,
  allowHtml = true,
  onInitialLoad,
  onMenuItemClick,
  isSelectData = false,
  isPopup = false,
  noLimit = false,
  ...props
}) => {
  const { inputLabelLayout } = useFormFieldLayout();
  const resolvedLabelLayout = labelLayout || inputLabelLayout || "floating";
  const isStackedLabel = resolvedLabelLayout === "stacked";
  const [showPassword, setShowPassword] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [expandingNodes, setExpandingNodes] = useState({});
  const [noChildrenMap, setNoChildrenMap] = useState({});
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);

  const isPasswordField = type === "password";
  const isNumberField = type === "number";
  const toast = useToast();

  // Tham chiếu lưu trữ toàn bộ các node đã từng tải để tra cứu thông tin cha/con và hiển thị tên
  const allNodesRef = useRef({});
  const hasFetchedRef = useRef(false);

  /**
   * Normalize propValue: nếu truyền vào là mảng object [{_id, name}],
   * tự extract IDs và pre-seed allNodesRef để hiển thị chip mà không cần gọi API.
   * Nếu truyền vào đã là IDs thì giữ nguyên.
   */
  const normalizedPropValue = useMemo(() => {
    if (multiple) {
      const arr = Array.isArray(propValue) ? propValue : (propValue ? [propValue] : []);
      return arr.map((item) => {
        if (item && typeof item === 'object') {
          const id = item[customValue] || item._id || item.id;
          if (id) {
            // Pre-seed cache để renderValue tìm được name mà không call API
            allNodesRef.current[id] = { ...allNodesRef.current[id], ...item };
          }
          return id;
        }
        return item;
      }).filter(Boolean);
    } else {
      if (propValue && typeof propValue === 'object' && !Array.isArray(propValue)) {
        const id = propValue[customValue] || propValue._id || propValue.id;
        if (id) {
          allNodesRef.current[id] = { ...allNodesRef.current[id], ...propValue };
        }
        return id || "";
      }
      return propValue;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propValue, multiple, customValue]);

  // Cập nhật allNodesRef mỗi khi options thay đổi
  useEffect(() => {
    const map = { ...allNodesRef.current };
    options.forEach(opt => {
      const id = opt?.[customValue] || opt?._id || opt?.id || opt?.code;
      if (id) {
        map[id] = { ...map[id], ...opt };
      }
    });
    allNodesRef.current = map;
  }, [options, customValue]);

  // Hàm tải dữ liệu gốc (phân trang / load more)
  const fetchRootNodes = useCallback(async (pageNum = 1, append = false) => {
    if (!api) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Hỗ trợ truyền filter để lấy các node gốc (cấp 1) ban đầu
      const params = isSelectData || noLimit
        ? {
            filter: JSON.stringify({ parentId: "null", parent: "null" }),
            noLimit: true,
          }
        : {
            page: pageNum,
            limit: 25,
            filter: JSON.stringify({ parentId: "null", parent: "null" }),
          };

      const response = await axiosInstance.get(api, { params });
      const resData = Array.isArray(response) ? response : (response?.data?.data || response?.data || response?.items || response || []);
      const totalPgs = isSelectData ? 1 : (resData.length === 25 ? pageNum + 1 : pageNum);

      if (append) {
        setOptions(prev => {
          const existingIds = new Set(prev.map(item => item[customValue] || item._id || item.id));
          const newItems = resData.filter(item => !existingIds.has(item[customValue] || item._id || item.id));
          return [...prev, ...newItems];
        });
      } else {
        setOptions(Array.isArray(resData) ? resData : []);
      }
      setPage(pageNum);
      setTotalPages(totalPgs);
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err.message || "Lỗi khi tải dữ liệu cây";
      toast(errorMessage, "error");
      if (!append) setOptions([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [api, customValue, toast, isSelectData, noLimit]);

  // Load dữ liệu khi mở dropdown lần đầu
  const handleOpen = useCallback(() => {
    if (isPopup) {
      setIsDialogOpen(true);
    } else {
      setOpen(true);
    }
    if (!hasFetchedRef.current && !disabled) {
      hasFetchedRef.current = true;
      fetchRootNodes(1, false);
    }
  }, [fetchRootNodes, disabled, isPopup]);

  // Reset khi api thay đổi
  useEffect(() => {
    hasFetchedRef.current = false;
    setOptions([]);
  }, [api]);

  // Đồng bộ từ localSearchTerm sang debouncedSearchTerm (debounce 500ms)
  useEffect(() => {
    if (!isUserTyping) return;
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(localSearchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [localSearchTerm, isUserTyping]);

  // Tìm kiếm từ khóa (API) khi debouncedSearchTerm thay đổi
  useEffect(() => {
    if (!isUserTyping) return;
    const fetchSearch = async () => {
      const trimmed = debouncedSearchTerm.trim();
      if (!trimmed) {
        fetchRootNodes(1, false);
        return;
      }

      setLoading(true);
      try {
        // Tìm kiếm hỗ trợ cả filter dạng JSON và param q/search thông thường
        const params = isSelectData || noLimit
          ? {
              filter: JSON.stringify({ name: trimmed }),
              search: trimmed,
              q: trimmed,
              isTreeSearch: true,
              noLimit: true
            }
          : {
              filter: JSON.stringify({ name: trimmed }),
              search: trimmed,
              q: trimmed,
              page: 1,
              limit: 50,
              isTreeSearch: true
            };

        const response = await axiosInstance.get(api, { params });
        const resData = Array.isArray(response) ? response : (response?.data?.data || response?.data || response?.items || response || []);
        setOptions(Array.isArray(resData) ? resData : []);
        setPage(1);
        setTotalPages(1); // Khi search thì hiển thị danh sách kết quả tìm kiếm, không phân trang tiếp
      } catch (err) {
        const errorMessage = err?.response?.data?.message || err.message || "Lỗi khi tìm kiếm";
        toast(errorMessage, "error");
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearch();
  }, [debouncedSearchTerm, isUserTyping, api, fetchRootNodes, toast, isSelectData, noLimit]);

  const onInitialLoadRef = useRef(onInitialLoad);
  useEffect(() => {
    onInitialLoadRef.current = onInitialLoad;
  }, [onInitialLoad]);

  // Hàm tải dữ liệu chi tiết khi có ID ban đầu nhưng chưa có trong allNodesRef
  // (chỉ fetch API nếu là ID thuần và chưa có name trong cache)
  useEffect(() => {
    const fetchInitialValues = async () => {
      if (!normalizedPropValue || !api || typeof normalizedPropValue === "object") return;
      const valuesToFetch = multiple
        ? (Array.isArray(normalizedPropValue) ? normalizedPropValue : [normalizedPropValue])
        : [normalizedPropValue];

      valuesToFetch.forEach(async (val) => {
        if (!val || typeof val === "object") return;
        const exists = allNodesRef.current[val];
        if (!exists) {
          try {
            // Chỉ gọi API nếu chưa có trong cache (objects đã pre-seed → không gọi)
            const res = await axiosInstance.get(`${api}/${val}`);
            const itemData = res?.data?.data || res?.data || res;
            if (itemData) {
              allNodesRef.current[val] = itemData;
              if (onInitialLoadRef.current) onInitialLoadRef.current(itemData);
              setOptions(prev => {
                if (prev.some(o => (o[customValue] || o._id || o.id) === val)) return prev;
                return [...prev, itemData];
              });
            }
          } catch (e) {
            // Không toast lỗi để tránh làm phiền người dùng
          }
        } else {
          if (onInitialLoadRef.current) onInitialLoadRef.current(exists);
        }
      });
    };

    fetchInitialValues();
  }, [normalizedPropValue, api, multiple, customValue]);

  // Xử lý load more khi cuộn menu
  const handleMenuScroll = useCallback((event) => {
    if (isSelectData) return;
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollHeight - scrollTop - clientHeight < 20) {
      if (!loadingMore && !loading && page < totalPages && !debouncedSearchTerm.trim()) {
        fetchRootNodes(page + 1, true);
      }
    }
  }, [loadingMore, loading, page, totalPages, debouncedSearchTerm, fetchRootNodes, isSelectData]);

  // Xử lý load expand (khi click icon Add để mở rộng node con)
  const handleToggleExpand = useCallback(async (node, e) => {
    e.stopPropagation();
    const nodeId = node[customValue] || node._id || node.id;
    if (!nodeId) return;

    const isExpanded = expandedNodes[nodeId];
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !isExpanded }));

    // Nếu đang mở rộng và chưa có dữ liệu con, tiến hành gọi API load expand
    if (!isExpanded) {
      const hasChildInState = options.some(opt => {
        const pid = opt.parent?._id || opt.parent?.id || opt.parent || opt.parentId;
        return pid === nodeId;
      });

      if (!hasChildInState && !noChildrenMap[nodeId]) {
        setExpandingNodes(prev => ({ ...prev, [nodeId]: true }));
        const expandUrl = apiExpand || apiChildren || api;

        try {
          // Chuẩn bị params tương thích với cả API get children và API filter parentId
          /* eslint-disable camelcase */
          const params = isSelectData || noLimit
            ? (expandUrl.includes("children")
                ? { organizationId: nodeId, includeSelf: false, noLimit: true }
                : { filter: JSON.stringify({ parentId: nodeId }), parentId: nodeId, parent_id: nodeId, noLimit: true })
            : (expandUrl.includes("children")
                ? { organizationId: nodeId, includeSelf: false, page: 1, limit: 100 }
                : { filter: JSON.stringify({ parentId: nodeId }), parentId: nodeId, parent_id: nodeId, page: 1, limit: 100 });
          /* eslint-enable camelcase */

          const response = await axiosInstance.get(expandUrl, { params });
          const childData = Array.isArray(response) ? response : (response?.data?.data || response?.data || response?.items || response || []);

          if (childData.length === 0) {
            setNoChildrenMap(prev => ({ ...prev, [nodeId]: true }));
          } else {
            setOptions(prev => {
              const existingIds = new Set(prev.map(item => item[customValue] || item._id || item.id));
              const newItems = childData.filter(item => !existingIds.has(item[customValue] || item._id || item.id));
              return [...prev, ...newItems];
            });
          }
        } catch (err) {
          const errorMessage = err?.response?.data?.message || err.message || "Lỗi khi tải dữ liệu con";
          toast(errorMessage, "error");
        } finally {
          setExpandingNodes(prev => ({ ...prev, [nodeId]: false }));
        }
      }
    }
  }, [expandedNodes, options, noChildrenMap, apiExpand, apiChildren, api, customValue, toast, isSelectData, noLimit]);

  // Xây dựng cây từ danh sách flat options (khi không search)
  const treeOptions = useMemo(() => {
    const map = {};
    const tree = [];

    options.forEach(item => {
      const id = item[customValue] || item._id || item.id;
      if (id) {
        map[id] = { ...item, children: [] };
      }
    });

    options.forEach(item => {
      const id = item[customValue] || item._id || item.id;
      if (!id) return;
      const parentVal = item.parent?._id || item.parent?.id || item.parent || item.parentId;
      if (parentVal && map[parentVal]) {
        map[parentVal].children.push(map[id]);
      } else {
        tree.push(map[id]);
      }
    });

    return tree;
  }, [options, customValue]);

  // Decode HTML entities
  const decodeHtmlEntities = (str) => {
    if (!str) return "";
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  const handleChange = (event) => {
    let val = event.target.value;
    if (!select && !isPasswordField && !isNumberField && !disableSanitize && typeof val === "string") {
      let sanitizedValue;
      if (allowHtml) {
        sanitizedValue = decodeHtmlEntities(DOMPurify.sanitize(val, {
          ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "span", "div", "blockquote", "pre", "code", "figure", "figcaption"],
          ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "width", "height", "target", "rel", "colspan", "rowspan"],
          ALLOWED_URI_REGEXP: /^https?:\/\//i,
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "meta", "base", "form", "input", "button", "link"],
          FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onmouseout", "onfocus", "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup", "onkeypress", "ondblclick", "oncontextmenu", "ondragstart", "ondrop", "onpaste", "oncopy", "oncut"],
        }));
      } else {
        const stripped = DOMPurify.sanitize(val, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        sanitizedValue = decodeHtmlEntities(stripped);
      }
      if (val !== sanitizedValue) {
        event.target.value = sanitizedValue;
      }
    }
    onChange && onChange(event);
  };

  const handleDelete = (event, itemToRemove) => {
    event.stopPropagation();
    event.preventDefault();
    if (props.disabled) return;
    if (multiple) {
      onChange && onChange(normalizedPropValue.filter((item) => item !== itemToRemove));
    } else {
      onChange && onChange("");
    }
  };

  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleClearInput = useCallback((e) => {
    e.stopPropagation();
    onChange && onChange("");
  }, [onChange]);

  const handleMouseDown = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handleKeyDow = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleChangeSearchTerm = useCallback((e) => {
    setIsUserTyping(true);
    setLocalSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setIsUserTyping(false);
    setLocalSearchTerm("");
    setDebouncedSearchTerm("");
    fetchRootNodes(1, false);
  }, [fetchRootNodes]);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    if (localSearchTerm) {
      setIsUserTyping(false);
      setLocalSearchTerm("");
      setDebouncedSearchTerm("");
      fetchRootNodes(1, false);
    }
  }, [localSearchTerm, fetchRootNodes]);

  const handleValueChange = useCallback(async (newValue) => {
    if (!multiple) {
      onChange && onChange(newValue);
      return;
    }

    const prevSelected = Array.isArray(normalizedPropValue) ? normalizedPropValue : [];
    const currentSelected = Array.isArray(newValue) ? newValue : [];

    // Find if an item was added or removed
    const addedId = currentSelected.find(id => !prevSelected.includes(id));
    const removedId = prevSelected.find(id => !currentSelected.includes(id));

    // Helper to find all currently loaded descendant IDs in the options state
    const getDescendantIds = (nodeId, currentOptions) => {
      const descendantIds = [];
      const queue = [nodeId];
      const visited = new Set();
      
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const children = currentOptions.filter(opt => {
          const pid = opt.parent?._id || opt.parent?.id || opt.parent || opt.parentId;
          const optId = opt[customValue] || opt._id || opt.id;
          return pid === currentId && optId !== currentId;
        });
        
        children.forEach(child => {
          const childId = child[customValue] || child._id || child.id;
          if (childId && !visited.has(childId)) {
            descendantIds.push(childId);
            queue.push(childId);
          }
        });
      }
      return descendantIds;
    };

    if (addedId) {
      // Immediately select the clicked node so the checkbox ticks instantly
      onChange && onChange(currentSelected);

      const hasChildInState = options.some(opt => {
        const pid = opt.parent?._id || opt.parent?.id || opt.parent || opt.parentId;
        return pid === addedId;
      });

      if (hasChildInState || noChildrenMap[addedId]) {
        // Direct children are already in options, get all descendants in options
        const descendantIds = getDescendantIds(addedId, options);
        if (descendantIds.length > 0) {
          onChange && onChange(Array.from(new Set([...currentSelected, ...descendantIds])));
        }
      } else {
        // Fetch direct children of addedId (level 1 of addedId)
        const expandUrl = apiExpand || apiChildren || api;
        /* eslint-disable camelcase */
        const params = isSelectData
          ? (expandUrl.includes("children")
              ? { organizationId: addedId, includeSelf: false, noLimit: true }
              : { filter: JSON.stringify({ parentId: addedId }), parentId: addedId, parent_id: addedId, noLimit: true })
          : (expandUrl.includes("children")
              ? { organizationId: addedId, includeSelf: false, page: 1, limit: 100 }
              : { filter: JSON.stringify({ parentId: addedId }), parentId: addedId, parent_id: addedId, page: 1, limit: 100 });
        /* eslint-enable camelcase */

        try {
          const response = await axiosInstance.get(expandUrl, { params });
          const childData = Array.isArray(response) ? response : (response?.data?.data || response?.data || response?.items || response || []);
          if (childData.length === 0) {
            setNoChildrenMap(prev => ({ ...prev, [addedId]: true }));
          } else {
            // Save children to options
            setOptions(prev => {
              const existingIds = new Set(prev.map(item => item[customValue] || item._id || item.id));
              const newItems = childData.filter(item => !existingIds.has(item[customValue] || item._id || item.id));
              return [...prev, ...newItems];
            });

            // Find child IDs to select (direct children)
            const childIds = childData.map(child => child[customValue] || child._id || child.id).filter(Boolean);
            if (childIds.length > 0) {
              onChange && onChange(Array.from(new Set([...currentSelected, ...childIds])));
            }
          }
        } catch (e) {
          // Ignore error
        }
      }
    } else if (removedId) {
      // Find descendants and deselect all of them
      const descendantIds = getDescendantIds(removedId, options);
      const finalSelected = currentSelected.filter(id => id !== removedId && !descendantIds.includes(id));
      onChange && onChange(finalSelected);
    } else {
      onChange && onChange(newValue);
    }
  }, [multiple, normalizedPropValue, options, noChildrenMap, apiExpand, apiChildren, api, customValue, onChange, isSelectData]);

  const handleDialogNodeClick = useCallback((nodeId) => {
    const prevSelected = multiple ? (Array.isArray(normalizedPropValue) ? normalizedPropValue : []) : [];
    let newValue;
    if (multiple) {
      const isSelected = prevSelected.includes(nodeId);
      if (isSelected) {
        newValue = prevSelected.filter(id => id !== nodeId);
      } else {
        newValue = [...prevSelected, nodeId];
      }
    } else {
      newValue = nodeId;
    }
    
    handleValueChange(newValue);
    
    if (!multiple) {
      setIsDialogOpen(false);
    }
  }, [multiple, normalizedPropValue, handleValueChange]);

  const createDialogNodeClickHandler = useCallback((nodeId) => () => {
    handleDialogNodeClick(nodeId);
  }, [handleDialogNodeClick]);

  const createMenuItemClickHandler = useCallback((val, option) => () => {
    if (onMenuItemClick) onMenuItemClick(val, option);
  }, [onMenuItemClick]);

  const createExpandHandler = useCallback((node) => (e) => {
    handleToggleExpand(node, e);
  }, [handleToggleExpand]);

  // Render danh sách cây đệ quy (khi không search)
  const renderTreeNodes = (nodes, level = 0, parentIsLast = []) => {
    return nodes.flatMap((node, index) => {
      const nodeId = node[customValue] || node._id || node.id;
      const isLastChild = index === nodes.length - 1;
      
      // Xác định xem node có con hay không (dựa vào mảng children hoặc chưa bị đánh dấu noChildren)
      const hasChildren = (node.children && node.children.length > 0) || !noChildrenMap[nodeId];
      const isExpanded = debouncedSearchTerm.trim() ? true : expandedNodes[nodeId];
      const isExpanding = expandingNodes[nodeId];
      const selectable = isSelectable ? isSelectable(node) : true;

      const menuItem = (
        <TreeViewMenuItem
          key={nodeId}
          value={nodeId}
          disabled={!selectable}
          onClick={isPopup ? createDialogNodeClickHandler(nodeId) : undefined}
        >
          <TreeLinesContainer>
            {parentIsLast.map((isParentLast, i) => !isParentLast && (
              <TreeParentVerticalLine key={`vertical-${nodeId}-${i}`} leftPos={`${12 + i * 28 + 10}px`} />
            ))}
            {level > 0 && (
              <>
                <TreeNodeVerticalLine isLastChild={isLastChild} leftPos={`${12 + (level - 1) * 28 + 10}px`} />
                <TreeNodeHorizontalLine leftPos={`${12 + (level - 1) * 28 + 10}px`} />
              </>
            )}
          </TreeLinesContainer>

          <TreeItemContent level={level}>
            {hasChildren && (
              <TreeIconBox onClick={createExpandHandler(node)}>
                {isExpanding ? (
                  <StyledCircularProgress size={14} />
                ) : isExpanded ? (
                  <TreeIcon as={Remove} />
                ) : (
                  <TreeIcon as={Add} />
                )}
              </TreeIconBox>
            )}
            {!hasChildren && <TreeViewPlaceholder />}
            {multiple && (
              <StyledCheckbox
                checked={Array.isArray(normalizedPropValue) ? normalizedPropValue.includes(nodeId) : normalizedPropValue === nodeId}
                size="small"
              />
            )}
            <Tooltip title={customLabel ? node[customLabel] : node.name} placement="right">
              <TruncatedText>
                {customLabel ? node[customLabel] : node.name}
              </TruncatedText>
            </Tooltip>
          </TreeItemContent>
        </TreeViewMenuItem>
      );

      if (isExpanded && node.children && node.children.length > 0) {
        return [
          menuItem,
          ...renderTreeNodes(node.children, level + 1, [...parentIsLast, isLastChild]),
        ];
      }
      return [menuItem];
    });
  };

  const flattenElements = (arr) => {
    const res = [];
    arr.forEach((item) => {
      if (item == null || item === false) return;
      if (Array.isArray(item)) {
        res.push(...flattenElements(item));
      } else {
        res.push(item);
      }
    });
    return res;
  };

  const memoizedTreeNodes = useMemo(() => {
    if (!select || !treeView) return [];
    return renderTreeNodes(treeOptions, 0, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeOptions, expandedNodes, noChildrenMap, normalizedPropValue, debouncedSearchTerm, select, treeView]);

  const menuChildren = [];
  if (hasAll) menuChildren.push(<MenuItem key="all" value="">Tất cả</MenuItem>);

  if (select) {
    menuChildren.push(
      <SearchMenuItem key="search">
        <SearchBoxContainer onKeyDown={handleKeyDow}>
          <TreeLinesTextField
            fullWidth
            placeholder="Tìm kiếm..."
            value={localSearchTerm}
            onChange={handleChangeSearchTerm}
            onClick={handleClick}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: (
                <SearchInputAdornment>
                  {loading && <StyledSearchCircularProgress size={16} />}
                  {localSearchTerm && (
                    <SearchClearButton onClick={handleClearSearch} size="small" edge="end">
                      <SmallClearIcon />
                    </SearchClearButton>
                  )}
                </SearchInputAdornment>
              ),
            }}
          />
        </SearchBoxContainer>
      </SearchMenuItem>
    );
  }

  if (select && treeView) {
    menuChildren.push(...flattenElements(memoizedTreeNodes));
  } else if (select) {
    const rendered = options.map((option, idx) => {
      const val = customValue ? option[customValue] : option.value || option?.code;
      return (
        <MenuItem
          key={option._id || option.id || option.code || option.value || idx}
          value={val}
          onClick={createMenuItemClickHandler(val, option)}
        >
          <Tooltip title={customLabel ? option[customLabel] : option.label || option.title || option.name} placement="right">
            <TruncatedWrapper>
              <TruncatedText>
                {customLabel ? option[customLabel] : option.label || option.title || option.name}
              </TruncatedText>
            </TruncatedWrapper>
          </Tooltip>
        </MenuItem>
      );
    });
    menuChildren.push(...flattenElements(rendered));
  }

  if (select && debouncedSearchTerm.trim() && options.length === 0 && !loading) {
    menuChildren.push(<NoDataMenuItem key="no-data" disabled>Không có dữ liệu</NoDataMenuItem>);
  }

  if (select && loadingMore) {
    menuChildren.push(
      <StyledLoadingMenuItem key="loading-more" disabled>
        <CircularProgress size={20} />
      </StyledLoadingMenuItem>
    );
  }

  const handleUploadFileToCmt = useCallback((e) => {
    e.stopPropagation();
    onUploadFile && onUploadFile();
  }, [onUploadFile]);

  return (
    <Box>
      {isStackedLabel && label && (
        <StackedFieldLabel variant="body2">
          {label}
          {required && <RequiredLabel> *</RequiredLabel>}
        </StackedFieldLabel>
      )}
      <StyledTextField
      size={size}
      value={normalizedPropValue ?? (multiple ? [] : "")}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      customWidth={width}
      autoWidth={autoWidth}
      autoHeight={autoHeight}
      label={isStackedLabel ? undefined : label}
      required={isStackedLabel ? false : required}
      autoComplete={props.autoComplete}
      type={isNumberField ? "number" : isPasswordField && !showPassword ? "password" : "text"}
      fullWidth={fullWidth}
      variant="outlined"
      multiline={multiline}
      rows={rows}
      minRows={minRows}
      maxRows={maxRows}
      InputLabelProps={isStackedLabel ? undefined : { shrink: true }}
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <>
            {props.InputProps?.endAdornment}
            {isPasswordField && (
              <PasswordInputAdornment>
                <IconButton onClick={handleToggleShowPassword} edge="end">
                  {view === "view" || view === "update" ? "" : showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </PasswordInputAdornment>
            )}

            {select && !multiple && propValue && !disabled && !disableClear && (
              <ClearableInputAdornment>
                <SearchClearButton size="small" disabled={disabled} onClick={handleClearInput} edge="end">
                  <SmallClearIcon />
                </SearchClearButton>
              </ClearableInputAdornment>
            )}
            {isUpfileToComment && (
              <StyleIconUploadFileToCmt>
                <IconButton edge="end" onClick={handleUploadFileToCmt}>
                  <AttachFile />
                </IconButton>
              </StyleIconUploadFileToCmt>
            )}
          </>
        ),
        onFocus: props.onFocus,
        readOnly: readOnly,
      }}
      error={error}
      helperText={helperText}
      select={select}
      SelectProps={{
        open: isPopup ? false : open,
        onOpen: handleOpen,
        onClose: () => {
          setOpen(false);
          if (localSearchTerm) {
            setIsUserTyping(false);
            setLocalSearchTerm("");
            setDebouncedSearchTerm("");
            fetchRootNodes(1, false);
          }
        },
        multiple: multiple,
        displayEmpty: true,
        value: multiple ? (Array.isArray(normalizedPropValue) ? normalizedPropValue : (normalizedPropValue ? [normalizedPropValue] : [])) : (normalizedPropValue || ""),
        IconComponent: disableEndIcon ? () => null : undefined,
        onChange: (event) => {
          handleValueChange(event.target.value);
        },
        renderValue: (selected) => {
          if (multiple) {
            const safeSelected = Array.isArray(selected) ? selected : (selected ? [selected] : []);
            return (
              <ChipContainer
                multiline={multiline}
                onMouseDown={isPopup ? (e) => e.stopPropagation() : undefined}
                onClick={isPopup ? (e) => e.stopPropagation() : undefined}
              >
                {safeSelected.map((value) => {
                  const option = allNodesRef.current[value] || options.find((opt) => (opt?.[customValue] || opt?._id || opt?.id) === value);
                  return (
                    <Chip
                      key={value}
                      label={option ? option[customLabel] || option.code || value : value}
                      onDelete={disabled ? undefined : (event) => handleDelete(event, value)}
                      onMouseDown={handleMouseDown}
                    />
                  );
                })}
              </ChipContainer>
            );
          }

          if (!selected || selected === "") {
            return <Placeholder>{placeholder}</Placeholder>;
          }

          const option = allNodesRef.current[selected] || options.find((opt) => (opt?.[customValue] || opt?._id || opt?.id || opt?.code || opt?.value) === selected);

          if (option) {
            const labelStr = option[customLabel] || option.label || option.title || option.name || option.code || selected;
            return (
              <Tooltip title={labelStr} placement="right">
                <TruncatedWrapper>
                  <TruncatedText>{labelStr}</TruncatedText>
                </TruncatedWrapper>
              </Tooltip>
            );
          }

          return typeof selected === "object" ? JSON.stringify(selected) : selected;
        },
        MenuProps: {
          PaperProps: {
            onScroll: handleMenuScroll,
            sx: { 
              maxHeight: 300, 
              maxWidth: 400,
              width: "auto", 
              overflowX: "hidden",
              overflowY: "auto",
              "& .MuiList-root": { paddingTop: 0 },
            },
          },
          MenuListProps: {
            onScroll: handleMenuScroll,
            sx: { paddingTop: 0, position: "relative" },
          },
          ...(menuPlacement === "top"
            ? { anchorOrigin: { vertical: "top", horizontal: "left" }, transformOrigin: { vertical: "bottom", horizontal: "left" } }
            : { anchorOrigin: { vertical: "bottom", horizontal: "left" }, transformOrigin: { vertical: "top", horizontal: "left" } }),
          disablePortal: disablePortal,
        },
      }}
      >
        {menuChildren}
      </StyledTextField>

      {isPopup && (
        <StyledDialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          fullWidth
        >
          <StyledDialogTitle>
            <StyledTitleText variant="h6">
              {label || placeholder || "Chọn phòng ban"}
            </StyledTitleText>
            <IconButton onClick={handleCloseDialog} size="small">
              <Close />
            </IconButton>
          </StyledDialogTitle>
          <StyledDialogContent dividers>
            <div onKeyDown={handleKeyDow}>
              <TreeLinesTextField
                fullWidth
                placeholder="Tìm kiếm..."
                value={localSearchTerm}
                onChange={handleChangeSearchTerm}
                onClick={handleClick}
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <SearchInputAdornment>
                      {loading && <StyledSearchCircularProgress size={16} />}
                      {localSearchTerm && (
                        <SearchClearButton onClick={handleClearSearch} size="small" edge="end">
                          <SmallClearIcon />
                        </SearchClearButton>
                      )}
                    </SearchInputAdornment>
                  ),
                }}
              />
            </div>

            <DialogTreeContainer onScroll={handleMenuScroll}>
              {loading && options.length === 0 ? (
                <DialogLoaderContainer>
                  <CircularProgress size={30} />
                </DialogLoaderContainer>
              ) : (
                <DialogTreeWrapper>
                  {select && treeView ? flattenElements(memoizedTreeNodes) : (
                    options.map((option, idx) => {
                      const val = customValue ? option[customValue] : option.value || option?.code;
                      return (
                        <MenuItem
                          key={option._id || option.id || option.code || option.value || idx}
                          value={val}
                          onClick={createDialogNodeClickHandler(val)}
                        >
                          <Tooltip title={customLabel ? option[customLabel] : option.label || option.title || option.name} placement="right">
                            <TruncatedWrapper>
                              <TruncatedText>
                                {customLabel ? option[customLabel] : option.label || option.title || option.name}
                              </TruncatedText>
                            </TruncatedWrapper>
                          </Tooltip>
                        </MenuItem>
                      );
                    })
                  )}
                  {select && debouncedSearchTerm.trim() && options.length === 0 && !loading && (
                    <NoDataMenuItem key="no-data" disabled>Không có dữ liệu</NoDataMenuItem>
                  )}
                  {select && loadingMore && (
                    <StyledLoadingMenuItem key="loading-more" disabled>
                      <CircularProgress size={20} />
                    </StyledLoadingMenuItem>
                  )}
                </DialogTreeWrapper>
              )}
            </DialogTreeContainer>
          </StyledDialogContent>
          <StyledDialogActions>
            <DialogCloseButton 
              variant="contained" 
              onClick={handleCloseDialog}
            >
              Đóng
            </DialogCloseButton>
          </StyledDialogActions>
        </StyledDialog>
      )}
    </Box>
  );
};

CustomInputTree.propTypes = {
  api: PropTypes.string,
  apiChildren: PropTypes.string,
  apiExpand: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  fullWidth: PropTypes.bool,
  error: PropTypes.bool,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  minRows: PropTypes.number,
  maxRows: PropTypes.number,
  select: PropTypes.bool,
  customLabel: PropTypes.string,
  customValue: PropTypes.string,
  type: PropTypes.string,
  multiple: PropTypes.bool,
  treeView: PropTypes.bool,
  isSelectable: PropTypes.func,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  hasAll: PropTypes.bool,
  view: PropTypes.string,
  autoWidth: PropTypes.bool,
  autoHeight: PropTypes.bool,
  isUpfileToComment: PropTypes.bool,
  onUploadFile: PropTypes.func,
  menuPlacement: PropTypes.oneOf(["top", "bottom"]),
  readOnly: PropTypes.bool,
  labelLayout: PropTypes.oneOf(["floating", "stacked"]),
  isSelectData: PropTypes.bool,
  isPopup: PropTypes.bool,
  noLimit: PropTypes.bool,
};

CustomInputTree.defaultProps = {
  value: "",
  placeholder: "",
  label: "",
  fullWidth: true,
  error: false,
  helperText: "",
  required: false,
  multiline: false,
  rows: 3,
  select: false,
  autoWidth: false,
  autoHeight: false,
  isPopup: false,
  noLimit: false,
};

export default CustomInputTree;
