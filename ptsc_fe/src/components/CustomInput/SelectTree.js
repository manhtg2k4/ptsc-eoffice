import React, { useState } from "react";
import PropTypes from "prop-types";
import { Chip, IconButton, ClickAwayListener } from "@mui/material";
import {
  Add,
  Remove,
  Search as SearchIcon,
  ArrowDropDown,
} from "@mui/icons-material";
import {
  DropdownContainer,
  NodeLabel,
  OptionsContainer,
  RequiredLabel,
  SearchContainer,
  SearchInput,
  SelectTreeWrapper,
  TreeHorizontalLine,
  TreeMenuItem,
  TreeToggleButton,
  TreeVerticalLine,
  ValueContainer,
  TreeMenuItemLabelWrapper,
} from "@styles/SelectTree.style";
import {
  StyledTextField,
  StyleInputAdornment,
} from "@styles/CustomInput.styles";

const SelectTree = ({
  size = "medium",
  value,
  onChange,
  label,
  fullWidth = true,
  error,
  required,
  options = [],
  customLabel,
  customValue,
  multiple,
  treeView = true,
  disabled,
}) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleNode = (nodeId) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

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

  const filterTree = (nodes, term) => {
    if (!term) return nodes;

    return nodes
      .map((node) => {
        const label = customLabel ? node[customLabel] : node.name;
        const matches = label.toLowerCase().includes(term.toLowerCase());

        // Nếu node khớp trực tiếp thì trả về node (không cần children)
        if (matches) {
          return { ...node, children: [] };
        }

        // Nếu không khớp thì thử lọc trong children
        const filteredChildren = node.children?.length
          ? filterTree(node.children, term)
          : [];

        // Nếu con khớp, chỉ trả về danh sách con (không giữ cha)
        if (filteredChildren.length > 0) {
          return filteredChildren;
        }

        return null;
      })
      .flat() // gộp mảng con lại
      .filter(Boolean);
  };

  const createNodeClickHandler = (node) => () => {
    const val = customValue ? node[customValue] : node._id;

    if (multiple) {
      if (value?.includes(val)) {
        onChange(value.filter((v) => v !== val));
      } else {
        onChange([...value, val]);
      }
    } else {
      onChange(val);
      setShowDropdown(false);
    }
  };

  const createToggleHandler = (nodeId) => (e) => {
    e.stopPropagation();
    toggleNode(nodeId);
  };

  const renderTreeOptions = (nodes, level = 0) => {
    return nodes.flatMap((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedNodes[node._id];
      const isSelected = multiple
        ? value?.includes(customValue ? node[customValue] : node._id)
        : value === (customValue ? node[customValue] : node._id);
      const handleClick = createNodeClickHandler(node);
      const handleToggle = createToggleHandler(node._id);
      return [
        <TreeMenuItem
          key={node._id}
          value={customValue ? node[customValue] : node._id}
          level={level}
          selected={isSelected}
          onClick={handleClick}
        >
          {level > 0 && <TreeVerticalLine level={level} />}

          {level > 0 && (
            <TreeHorizontalLine level={level} noHasChildren={!hasChildren} />
          )}

          <TreeMenuItemLabelWrapper>
            {hasChildren && (
              <TreeToggleButton size="small" onClick={handleToggle}>
                {isExpanded ? <Remove /> : <Add />}
              </TreeToggleButton>
            )}

            <NodeLabel hasChildren={hasChildren}>
              {customLabel ? node[customLabel] : node.name}
            </NodeLabel>
          </TreeMenuItemLabelWrapper>
        </TreeMenuItem>,

        ...(isExpanded && hasChildren
          ? renderTreeOptions(node.children, level + 1)
          : []),
      ];
    });
  };

  const treeOptions = buildTree(options);
  const filteredTreeOptions = filterTree(treeOptions, searchTerm);

  const renderValue = () => {
    if (multiple && Array.isArray(value)) {
      return (
        <ValueContainer>
          {value.map((val) => {
            const option = customValue
              ? options.find((opt) => opt?.[customValue] === val)
              : options.find((opt) => opt?._id === val);

            return (
              <Chip
                key={val}
                label={option ? option[customLabel] || option.name || val : val}
                onDelete={
                  disabled
                    ? undefined
                    : (event) => {
                        event.stopPropagation();
                        onChange(value.filter((v) => v !== val));
                      }
                }
                size="small"
              />
            );
          })}
        </ValueContainer>
      );
    }

    const selected = customValue
      ? options.find((opt) => opt?.[customValue] === value)
      : options.find((opt) => opt?._id === value);

    return selected
      ? selected[customLabel] || selected.name || selected.code
      : "";
  };
  // Đóng dropdown khi click ra ngoài
  const handleClickAway = () => {
    setShowDropdown(false);
  };

  // Toggle dropdown khi click icon
  const handleToggleDropdown = () => {
    if (!disabled) {
      setShowDropdown((prev) => !prev);
    }
  };

  // Khi click vào TextField
  const handleTextFieldClick = () => {
    if (!disabled) {
      setShowDropdown((prev) => !prev);
    }
  };

  // Khi gõ tìm kiếm
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <SelectTreeWrapper>
        <StyledTextField
          size={size}
          fullWidth={fullWidth}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          label={
            required && label ? (
              <>
                {label} <RequiredLabel>*</RequiredLabel>
              </>
            ) : (
              label
            )
          }
          disabled={disabled}
          InputProps={{
            readOnly: true,
            endAdornment: (
              <IconButton onClick={handleToggleDropdown} disabled={disabled}>
                <ArrowDropDown />
              </IconButton>
            ),
          }}
          value={renderValue()}
          onClick={handleTextFieldClick}
          error={error}
        />

        {showDropdown && treeView && (
          <DropdownContainer>
            <SearchContainer>
              <SearchInput
                fullWidth
                size="small"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <StyleInputAdornment stylePosition="start">
                      <SearchIcon />
                    </StyleInputAdornment>
                  ),
                }}
              />
            </SearchContainer>
            <OptionsContainer>
              {renderTreeOptions(filteredTreeOptions)}
            </OptionsContainer>
          </DropdownContainer>
        )}
      </SelectTreeWrapper>
    </ClickAwayListener>
  );
};

SelectTree.propTypes = {
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  fullWidth: PropTypes.bool,
  error: PropTypes.bool,
  required: PropTypes.bool,
  options: PropTypes.array,
  customLabel: PropTypes.string,
  customValue: PropTypes.string,
  multiple: PropTypes.bool,
  treeView: PropTypes.bool,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  disabled: PropTypes.bool,
};

SelectTree.defaultProps = {
  value: "",
  label: "",
  fullWidth: true,
  error: false,
  required: false,
  options: [],
  treeView: true,
  disabled: false,
};

export default SelectTree;
