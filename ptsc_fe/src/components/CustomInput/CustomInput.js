/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState, useMemo, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  StyledTextField,
  SearchBoxContainer,
  TreeLinesContainer,
  TreeParentVerticalLine,
  TreeNodeVerticalLine,
  TreeNodeHorizontalLine,
  TreeItemContent,
  TreeToggleButton,
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
  InputAdornment,
  MenuItem,
  TextField,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import PropTypes from "prop-types";
import {
  Add,
  Remove,
  Visibility,
  VisibilityOff,
  Clear as ClearIcon,
  AttachFile,
} from "@mui/icons-material";
import { useFormFieldLayout } from "./FormFieldLayoutContext";

import "./CustomCss.css";

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
  // Sticky positioning: cố định ô tìm kiếm khi cuộn danh sách
  position: "sticky",
  top: 0,
  zIndex: 1300,
  // Màu nền theo theme (sáng/tối) - không trong suốt
  backgroundColor: theme.palette.mode === "dark" 
    ? `${theme.palette.background.paper} !important` 
    : "#fff !important",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
  // Đảm bảo không bị đổi màu khi hover, focus, selected
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
  // Margin bottom để tạo khoảng cách với danh sách
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

const CustomInput = ({
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
  options = [],
  customLabel,
  customValue,
  multiple,
  type,
  view,
  treeView,
  isSelectable,
  width,
  disabled,
  readOnly = false,
  autoWidth,
  autoHeight,
  isUpfileToComment,
  onUploadFile,
  menuPlacement = "bottom", // ✅ Thêm prop mới với giá trị mặc định là 'bottom'
  disableEndIcon = false,
  disablePortal = false,
  disableClear = false,
  labelLayout,
  disableSanitize = false,
  // Bật chế độ HTML: whitelist thẻ an toàn thay vì strip toàn bộ
  allowHtml = true,
  disableSearch = false,
  ...props
}) => {
  const { inputLabelLayout } = useFormFieldLayout();
  const resolvedLabelLayout = labelLayout || inputLabelLayout || "floating";
  const isStackedLabel = resolvedLabelLayout === "stacked";
  const [showPassword, setShowPassword] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState({});
  const isPasswordField = type === "password";
  const isNumberField = type === "number";
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const sanitizedFields = [
    "Tên hình thức",
    "Mã hình thức",
    "Hiệu lực",
    "Căn cứ",
    "Ghi chú",
    "Cơ quan lưu trữ",
  ];

  const removeVietnameseTones = (str) => {
    if (!str) return "";
    str = str.toLowerCase();
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    str = str.replace(/[đĐ]/g, "d");
    str = str.replace(/[dD]/g, "d");
    return str;
  };

  const isValidInput = () => {
    return true;
  };

  // Decode HTML entities mà DOMPurify tạo ra khi strip tags
  // Ví dụ: &lt; → <   |   &amp; → &   |   &gt; → >
  // Dùng textarea trick của browser để decode chuẩn xác
  const decodeHtmlEntities = (str) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  };


  const handleChange = (event) => {
    let val = event.target.value;

    if (isNumberField && typeof val === "string") {
      const sanitizedValue = val.replace(/\D/g, "");
      if (val !== sanitizedValue) {
        event.target.value = sanitizedValue;
      }
    } else if (
      !select &&
      !isPasswordField &&
      !isNumberField &&
      !disableSanitize &&
      typeof val === "string"
    ) {
      let sanitizedValue;

      if (allowHtml) {
        // --- Chế độ cho phép HTML (allowHtml=true) ---
        // Whitelist chỉ những thẻ thực sự dùng trong nghiệp vụ.
        // KHÔNG whitelist thừa để tránh mở rộng attack surface.
        sanitizedValue = decodeHtmlEntities(DOMPurify.sanitize(val, {
          ALLOWED_TAGS: [
            // Định dạng văn bản
            "b", "strong", "i", "em", "u", "s",
            // Tiêu đề
            "h1", "h2", "h3", "h4", "h5", "h6",
            // Đoạn văn & phân cách
            "p", "br", "hr",
            // Danh sách
            "ul", "ol", "li",
            // Liên kết & hình ảnh
            "a", "img",
            // Bảng
            "table", "thead", "tbody", "tfoot", "tr", "td", "th",
            // Inline & block
            "span", "div", "blockquote", "pre", "code",
            // Caption
            "figure", "figcaption",
          ],
          // Chỉ cho phép các thuộc tính an toàn — KHÔNG bao gồm on* event handlers
          ALLOWED_ATTR: [
            "href", "src", "alt", "title", "class",
            "width", "height", "target", "rel",
            "colspan", "rowspan",
          ],
          // Chỉ cho phép scheme http/https trên các thuộc tính URI (href, src, vv.)
          // Ngăn chặn: javascript:, data:, vbscript:, ...
          ALLOWED_URI_REGEXP: /^https?:\/\//i,
          // Chặn tuyệt đối các thẻ nguy hiểm ngay cả khi nằm trong whitelist
          // - script: XSS trực tiếp
          // - style: CSS injection
          // - iframe/object/embed: nhúng nội dung ngoài
          // - meta: redirect trang
          // - base: ghi đè base URL, hijack relative links
          // - form/input/button: giả mạo form submit
          FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "meta", "base", "form", "input", "button", "link"],
          // Chặn tường minh các on* event attr (DOMPurify đã chặn theo whitelist,
          // nhưng FORBID_ATTR đảm bảo không bao giờ lọt qua dù config thay đổi)
          FORBID_ATTR: [
            "onerror", "onclick", "onload", "onmouseover", "onmouseout",
            "onfocus", "onblur", "onchange", "onsubmit", "onkeydown",
            "onkeyup", "onkeypress", "ondblclick", "oncontextmenu",
            "ondragstart", "ondrop", "onpaste", "oncopy", "oncut",
          ],
        }));
      } else {
        // --- Chế độ không cho phép HTML (mặc định) ---
        // Strip toàn bộ thẻ HTML, chỉ giữ lại text thuần.
        // Sau đó decode entities để < không bị đổi thành &lt;
        const stripped = DOMPurify.sanitize(val, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
        });
        sanitizedValue = decodeHtmlEntities(stripped);
      }

      if (val !== sanitizedValue) {
        event.target.value = sanitizedValue;
      }
    }

    onChange && onChange(event);
  };

  const handleBeforeInput = (e) => {
    if (isNumberField && e.data && /\D/.test(e.data)) {
      e.preventDefault();
    }
    if (props.inputProps?.onBeforeInput) {
      props.inputProps.onBeforeInput(e);
    }
  };

  const handleCompositionEnd = (e) => {
    if (isNumberField) {
      const cleanValue = (e.target.value || "").replace(/\D/g, "");
      e.target.value = cleanValue;
      if (onChange) {
        onChange({ target: { value: cleanValue } });
      }
    }
    if (props.inputProps?.onCompositionEnd) {
      props.inputProps.onCompositionEnd(e);
    }
  };

  const handleBlur = (event) => {
    // let newValue = event.target.value;
    // let originalValue = newValue;
    // if (["Mã đơn vị", "Tên đơn vị", "Tên Logo"].includes(label)) {
    //   newValue = newValue.replace(/[^a-zA-ZÀ-ỹ0-9\s]/g, "");
    //   newValue = newValue.trimStart().replace(/\s\s+/g, " ");
    // }
    // const spaceControlledLabels = ["Mã cán bộ", "Họ và tên", "Địa chỉ"];
    // if (spaceControlledLabels.includes(label)) {
    //   if (newValue.startsWith(" ")) {
    //     newValue = newValue.trimStart();
    //   }
    //   newValue = newValue.replace(/\s\s+/g, " ");
    //   if (label === "Họ và tên") {
    //     newValue = newValue.replace(/[^a-zA-ZÀ-ỹ\s]/g, "");
    //   }
    // } else if (label === "Số điện thoại") {
    //   newValue = newValue.replace(/[^0-9]/g, "");
    // } else if (label === "Căn cước") {
    //   newValue = newValue.replace(/[^0-9]/g, "");
    // } else if (label === "Địa chỉ") {
    //   newValue = newValue.replace(/[^a-zA-ZÀ-ỹ0-9,\s]/g, "");
    //   newValue = newValue.replace(/\s\s+/g, " ");
    // } else if (["Mã nhóm", "Mã nhóm người dùng", "Mã cán bộ"].includes(label)) {
    //   newValue = newValue.replace(/[^a-zA-Z0-9 ]/g, "");
    //   newValue = newValue.replace(/\s{2,}/g, " ");
    //   newValue = newValue.trimStart();
    // } else if (sanitizedFields.includes(label)) {
    //   if (propValue?.length === 0 && newValue.trim() === "") {
    //     return;
    //   }
    //   newValue = newValue.replace(/ {2,}/g, " ");
    //   // newValue = newValue.replace(/[`~!@#$%^*]/g, "");
    // } else if (label === "Lãnh đạo" && /\d/.test(newValue)) {
    //   return;
    // } else if (label === "Thứ tự") {
    //   newValue = newValue.replace(/[^0-9]/g, "");
    //   if (newValue.startsWith("0")) newValue = newValue.replace(/^0+/, "");
    //   if (Number(newValue) < 1) newValue = "";
    // } else if (label === "Email") {
    //   const emailForbiddenCharsRegex = /[`~!#$%^*]/;
    //   if (emailForbiddenCharsRegex.test(newValue)) {
    //     return;
    //   }
    // } else if (["Mật khẩu", "Nhập lại mật khẩu"].includes(label)) {
    //   // No sanitization for password fields
    // } else if (label === "Mô tả") {
    //   // No length limit
    // } else if (!select && !isNumberField && !isPasswordField && label !== "Mô tả") {
    //   // newValue = newValue.replace(/[`~!@#$%^*]/g, "");
    // }
    // if (newValue !== originalValue) {
    //   onChange && onChange({ target: { value: newValue } });
    // }
  };

  const handleKeyDown = (e) => {
    if (isNumberField) {
      // Cho phép các tổ hợp phím Ctrl / Cmd (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X,...)
      if (e.ctrlKey || e.metaKey) {
        if (props.onKeyDown) props.onKeyDown(e);
        return;
      }
      // Chặn tất cả phím ký tự đơn không phải là số 0-9
      if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key)) {
        e.preventDefault();
        return;
      }
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  const handlePaste = (e) => {
    if (isNumberField) {
      const pastedText = (e.clipboardData || window.clipboardData)?.getData("text") || "";
      if (/\D/.test(pastedText)) {
        e.preventDefault();
        const cleanText = pastedText.replace(/\D/g, "");
        const target = e.target;
        const start = target.selectionStart ?? 0;
        const end = target.selectionEnd ?? 0;
        const currentValue = target.value ?? "";
        const newValue = currentValue.slice(0, start) + cleanText + currentValue.slice(end);
        target.value = newValue;
        if (onChange) {
          onChange({ target: { value: newValue } });
        }
        return;
      }
    }
    if (props.onPaste) {
      props.onPaste(e);
    }
  };

  const handleDelete = (event, itemToRemove) => {
    event.stopPropagation();
    event.preventDefault();
    if (props.disabled) return;
    if (multiple) {
      onChange && onChange(propValue.filter((item) => item !== itemToRemove));
    } else {
      onChange && onChange("");
    }
  };

  // const toggleNode = (nodeId) => {
  //   setExpandedNodes((prev) => ({
  //     ...prev,
  //     [nodeId]: !prev[nodeId],
  //   }));
  // };

  const toggleNode = useCallback(
    (nodeId) => {
      setExpandedNodes((prev) => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    },
    [setExpandedNodes]
  );

  const buildTree = (data) => {
    const map = {};
    const tree = [];
    data.forEach((item) => {
      map[item._id] = { ...item, children: [] };
    });
    data.forEach((item) => {
      if (item.parent && map[item.parent]) {
        map[item.parent].children.push(map[item._id]);
      } else {
        tree.push(map[item._id]);
      }
    });
    return tree;
  };

  const filteredOptions = useMemo(() => {
    const validOptions = (Array.isArray(options) ? options : []).filter((option) => option != null);
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm) return validOptions;

    // Chuyển text tìm kiếm thành dạng không dấu
    const searchWithoutTones = removeVietnameseTones(trimmedSearchTerm);

    return validOptions.filter((option) => {
      const label =
        customLabel && option[customLabel]
          ? option[customLabel]
          : option.label || option.title || option.name || "";
      
      // Chuyển label thành dạng không dấu để so sánh
      const normalizedLabelWithoutTones = removeVietnameseTones(label);

      // Tìm kiếm bỏ dấu: so sánh cả text không dấu
      return normalizedLabelWithoutTones.includes(searchWithoutTones);
    });
  }, [options, searchTerm, customLabel]);

	const treeOptions = buildTree(options); 

  // Logic lọc cây khi tìm kiếm
  const matchMap = useMemo(() => {
    const trimmedSearchTerm = searchTerm.trim();
    if (!trimmedSearchTerm || !treeView) return null;

    const term = removeVietnameseTones(trimmedSearchTerm.toLowerCase());
    const matches = new Set();
    const ancestors = new Set();
    const descendantsOfMatch = new Set();

    const checkMatch = (node) => {
      const label = removeVietnameseTones(
        (customLabel ? node[customLabel] : node.name || "").toLowerCase()
      );
      return label.includes(term);
    };

    const collectAllDescendants = (nodes) => {
      nodes.forEach((node) => {
        descendantsOfMatch.add(node._id);
        if (node.children) collectAllDescendants(node.children);
      });
    };

    const findMatches = (nodes, currentPath = []) => {
      let branchHasMatch = false;
      nodes.forEach((node) => {
        const nodeMatch = checkMatch(node);
        const childBranchHasMatch = findMatches(node.children || [], [
          ...currentPath,
          node._id,
        ]);

        if (nodeMatch || childBranchHasMatch) {
          matches.add(node._id);
          currentPath.forEach((id) => ancestors.add(id));
          branchHasMatch = true;

          // Nếu node cha khớp, giữ lại cả "nhánh liên quan" (tất cả con cháu)
          if (nodeMatch && node.children) {
            collectAllDescendants(node.children);
          }
        }
      });
      return branchHasMatch;
    };

    findMatches(treeOptions);
    return { matches, ancestors, descendantsOfMatch };
  }, [searchTerm, treeOptions, treeView, customLabel]);

  const createToggleHandler = useCallback(
    (id) => (e) => {
      e.stopPropagation();
      toggleNode(id);
    },
    [toggleNode]
  );

  // 1. Toggle showPassword
  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // 2. Clear input value
  const handleClearInput = useCallback(
    (e) => {
      e.stopPropagation();
      onChange && onChange("");
    },
    [onChange]
  );

  // 1️⃣ useCallback cho onMouseDown
  const handleMouseDown = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  // 2️⃣ useCallback cho onKeyDown
  const handleKeyDow = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // 3️⃣ useCallback cho onClick
  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // 4️⃣ useCallback cho onChange input
  const handleChangeSearchTerm = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, [setSearchTerm]);

  const createMenuItemClickHandler = useCallback(
    (val, option) => () => {
      if (props.onMenuItemClick) props.onMenuItemClick(val, option);
    },
    [props]
  );

  const renderTreeOptions = (nodes, level = 0, parentIsLast = []) => {
    const isSearching = !!searchTerm.trim();

    // Lọc danh sách nodes hiện tại dựa trên matchMap nếu đang search
    const visibleNodesInBranch = isSearching && matchMap
      ? nodes.filter(node => 
          matchMap.matches.has(node._id) || 
          matchMap.ancestors.has(node._id) ||
          matchMap.descendantsOfMatch.has(node._id)
        )
      : nodes;

    return visibleNodesInBranch.flatMap((node, index) => {
      const isLastChild = index === visibleNodesInBranch.length - 1;
      const hasChildren = node.children && node.children.length > 0;

      // Khi searching: force expand các node là tổ tiên của node khớp hoặc chính node khớp (để hiện con)
      const shouldForceExpand = isSearching && matchMap && (matchMap.ancestors.has(node._id) || matchMap.matches.has(node._id));
      const isExpanded = shouldForceExpand || expandedNodes[node._id];
      // Mặc định cho phép chọn tất cả node (cả parent và leaf), chỉ disable nếu isSelectable prop return false
      const selectable = isSelectable ? isSelectable(node) : true;

      const menuItem = (
        <TreeViewMenuItem
          key={node._id}
          value={customValue ? node[customValue] : node._id}
          disabled={!selectable} // Chỉ disable nếu không được chọn theo isSelectable prop
        >
          <TreeLinesContainer>
            {parentIsLast.map(
              (isParentLast, i) =>
                !isParentLast && (
                  <TreeParentVerticalLine
                    key={`vertical-${node._id}-${i}`}
                    leftPos={`${12 + i * 28 + 10}px`}
                  />
                )
            )}

            {level > 0 && (
              <>
                <TreeNodeVerticalLine
                  isLastChild={isLastChild}
                  leftPos={`${12 + (level - 1) * 28 + 10}px`}
                />
                <TreeNodeHorizontalLine
                  leftPos={`${12 + (level - 1) * 28 + 10}px`}
                />
              </>
            )}
          </TreeLinesContainer>

          <TreeItemContent level={level}>
            {hasChildren && (
              <TreeIconBox onClick={createToggleHandler(node._id)}>
                {isExpanded ? <TreeIcon as={Remove} /> : <TreeIcon as={Add} />}
              </TreeIconBox>
            )}
            {!hasChildren && <TreeViewPlaceholder />}
            <Tooltip title={customLabel ? node[customLabel] : node.name} placement="right">
              <TruncatedText>
                {customLabel ? node[customLabel] : node.name}
              </TruncatedText>
            </Tooltip>
          </TreeItemContent>
        </TreeViewMenuItem>
      );

      // Render các con nếu đang mở
      if (isExpanded && hasChildren) {
        return [
          menuItem,
          ...renderTreeOptions(node.children, level + 1, [
            ...parentIsLast,
            isLastChild,
          ]),
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

  const menuChildren = [];
  if (hasAll) menuChildren.push(<MenuItem key="all" value="">Tất cả</MenuItem>);

  if (select && options.length > 10 && !disableSearch) {
    menuChildren.push(
      <SearchMenuItem key="search">
        <SearchBoxContainer onKeyDown={handleKeyDow}>
          <TreeLinesTextField
            fullWidth
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={handleChangeSearchTerm}
            onClick={handleClick}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              endAdornment: searchTerm && (
                <SearchInputAdornment>
                  <SearchClearButton onClick={handleClearSearch} size="small" edge="end">
                    <SmallClearIcon />
                  </SearchClearButton>
                </SearchInputAdornment>
              ),
            }}
          />
        </SearchBoxContainer>
      </SearchMenuItem>
    );
  }

  if (select && treeView) {
    const rendered = renderTreeOptions(treeOptions, 0, []);
    menuChildren.push(...flattenElements(rendered));
  } else if (select) {
    const rendered = filteredOptions.map((option, idx) => {
      const val = customValue ? option[customValue] : option.value || option?.code;
      return (
        <MenuItem
          key={option._id || option.id || option.code || option.value || idx}
          value={val}
          onClick={createMenuItemClickHandler(val, option)}
        >
          <Tooltip 
            title={customLabel ? option[customLabel] : option.label || option.title || option.name} 
            placement="right"
            slotProps={{
              tooltip: {
                sx: {
                  maxWidth: 500,
                  fontSize: '0.875rem',
                  wordBreak: 'break-all'
                }
              }
            }}
            componentsProps={{
              tooltip: {
                sx: {
                  maxWidth: 500,
                  fontSize: '0.875rem',
                  wordBreak: 'break-all'
                }
              }
            }}
          >
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

  if (select && options.length > 10 && !disableSearch && !treeView && searchTerm.trim() && filteredOptions.length === 0) {
    menuChildren.push(<NoDataMenuItem key="no-data" disabled>Không có dữ liệu</NoDataMenuItem>);
  }

  const handleUploadFileToCmt = useCallback(
    (e) => {
      e.stopPropagation();
      onUploadFile && onUploadFile();
    },
    [onUploadFile]
  );

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
      value={propValue || (multiple ? [] : "")}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      customWidth={width}
      autoWidth={autoWidth}
      autoHeight={autoHeight}
      label={isStackedLabel ? undefined : label}
      required={isStackedLabel ? false : required}
      autoComplete={props.autoComplete}
      type={
        isNumberField
          ? "text"
          : isPasswordField && !showPassword
            ? "password"
            : "text"
      }
      fullWidth={fullWidth}
      variant="outlined"
      multiline={multiline}
      rows={rows}
      minRows={minRows}
      maxRows={maxRows}
      InputLabelProps={isStackedLabel ? undefined : { shrink: true }}
      inputProps={{
        ...(isNumberField && {
          inputMode: "numeric",
          pattern: "[0-9]*",
          onBeforeInput: handleBeforeInput,
          onCompositionEnd: handleCompositionEnd,
        }),
        ...props.inputProps,
      }}
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <>
            {props.InputProps?.endAdornment}
            {isPasswordField && (
              <PasswordInputAdornment>
                <IconButton
                  // onClick={() => setShowPassword(!showPassword)}
                  onClick={handleToggleShowPassword}
                  edge="end"
                >
                  {view === "view" || view === "update" ? (
                    ""
                  ) : showPassword ? (
                    <VisibilityOff />
                  ) : (
                    <Visibility />
                  )}
                </IconButton>
              </PasswordInputAdornment>
            )}

            {select && !multiple && propValue && !disabled && !disableClear && (
              <ClearableInputAdornment>
                <SearchClearButton
                  size="small"
                  // onClick={(e) => {
                  //   e.stopPropagation();
                  //   onChange && onChange("");
                  // }}
                  disabled={disabled}
                  onClick={handleClearInput}
                  edge="end"
                >
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
        open: open,
        onOpen: () => setOpen(true),
        onClose: () => setOpen(false),
        multiple: multiple,
        displayEmpty: true,
        value: propValue || (multiple ? [] : ""),
        IconComponent: disableEndIcon ? () => null : undefined,
        onChange: (event) => {
          const value = multiple ? event.target.value : event.target.value;
          onChange && onChange(value);
        },
        // renderValue: (selected) => {
        //   if (multiple) {
        //     return (
        //       <ChipContainer>
        //         {selected.map((value) => {
        //           const option = customValue
        //             ? options.find((opt) => opt?.[customValue] === value)
        //             : options.find((opt) => opt?._id || opt?.id === value );
        //           return (
        //             <Chip
        //               key={value}
        //               label={
        //                 option
        //                   ? option[customLabel] || option.code || value
        //                   : value
        //               }
        //               onDelete={
        //                 disabled
        //                   ? undefined
        //                   : (event) => handleDelete(event, value)
        //               }
        //               // onMouseDown={(event) => {
        //               //   event.stopPropagation();
        //               //   event.preventDefault();
        //               // }}
        //               onMouseDown={handleMouseDown}
        //             />
        //           );
        //         })}
        //       </ChipContainer>
        //     );
        //   } else {
        //     const option =
        //       options.find((opt) => opt?.[customValue] === selected) ||
        //       options.find((opt) => opt?.value === selected) ||
        //       options.find((opt) => opt?.code === selected);

        //     return option
        //       ? option[customLabel] ||
        //           option.label ||
        //           option.title ||
        //           option.name
        //       : selected;
        //   }
        // },
        
        renderValue: (selected) => {
  // Trường hợp multiple select → hiển thị chips như cũ
  if (multiple) {
    return (
      <ChipContainer>
        {selected.map((value) => {
          const option = customValue
            ? options.find((opt) => opt?.[customValue] === value)
            : options.find((opt) => opt?._id || opt?.id === value);
          return (
            <Chip
              key={value}
              label={
                option
                  ? option[customLabel] || option.code || value
                  : value
              }
              onDelete={
                disabled
                  ? undefined
                  : (event) => handleDelete(event, value)
              }
              onMouseDown={handleMouseDown}
            />
          );
        })}
      </ChipContainer>
    );
  }

  // Trường hợp single select
  // Nếu chưa chọn gì (selected là "", null, undefined) → hiển thị placeholder mờ
  if (!selected || selected === "") {
    return (
      <Placeholder>
        {placeholder}
      </Placeholder>
    );
  }

  // Đã chọn → tìm option tương ứng và hiển thị tên
  const option =
    options.find((opt) => customValue && opt?.[customValue] === selected) ||
    options.find((opt) => opt?.value === selected) ||
    options.find((opt) => opt?.code === selected) ||
    options.find((opt) => opt?._id === selected) ||
    options.find((opt) => opt?.id === selected);

  if (option) {
    const label = option[customLabel] ||
      option.label ||
      option.title ||
      option.name ||
      option.code ||
      selected;
    return (
      <Tooltip 
        title={label}
        slotProps={{
          tooltip: {
            sx: {
              maxWidth: 500,
              fontSize: '0.875rem',
              wordBreak: 'break-all'
            }
          }
        }}
        componentsProps={{
          tooltip: {
            sx: {
              maxWidth: 500,
              fontSize: '0.875rem',
              wordBreak: 'break-all'
            }
          }
        }}
      >
        <TruncatedWrapper>
          <TruncatedText>
            {label}
          </TruncatedText>
        </TruncatedWrapper>
      </Tooltip>
    );
  }

  // Nếu không tìm thấy option (rất hiếm) → vẫn hiện giá trị thô, đảm bảo là chuỗi nếu là object
  return typeof selected === 'object' ? JSON.stringify(selected) : selected;
},
        MenuProps: {
          PaperProps: {
            sx: { 
              maxHeight: 300, 
              maxWidth: 400,
              width: "auto", 
              overflowX: "hidden",
              overflowY: "auto",
              // Đảm bảo sticky hoạt động trong menu
              "& .MuiList-root": {
                paddingTop: 0,
              },
            },
          },
          // Thêm style cho MenuList để sticky hoạt động
          MenuListProps: {
            sx: {
              paddingTop: 0,
              position: "relative",
            },
          },
          // ✅ Điều chỉnh vị trí menu dựa trên prop `menuPlacement`
          ...(menuPlacement === "top"
            ? {
                anchorOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
              }
            : {
                anchorOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
              }),
          disablePortal: disablePortal,
        },
      }}
      >
        {menuChildren}
      </StyledTextField>
    </Box>
  );
};

CustomInput.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
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
  options: PropTypes.arrayOf(PropTypes.any),
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
  menuPlacement: PropTypes.oneOf(["top", "bottom"]), // ✅ Thêm prop type
  readOnly: PropTypes.bool,
  labelLayout: PropTypes.oneOf(["floating", "stacked"]),
  disableSearch: PropTypes.bool,
};

CustomInput.defaultProps = {
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
  options: [],
  autoWidth: false,
  autoHeight: false,
  disableSearch: false,
};

export default CustomInput;
