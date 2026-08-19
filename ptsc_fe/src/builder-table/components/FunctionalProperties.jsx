import React, { useEffect, useState, useRef } from "react";
import {
  Select,
  MenuItem,
  Button,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  styled,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add,
  Settings,
  Save,
  FormatListBulleted,
  ViewKanban,
  CalendarMonth,
  ViewTimeline,
} from "@mui/icons-material";
import PropTypes from "prop-types";
import {
  StyledTab,
  StyledTabs,
  TabsContainer,
  TabsActionsWrapper,
  TabLabelContainer,
  TabLabelText,
  TabCloseButton,
  ActionButton,
  ConfigPopover,
  PopoverContent,
  PopoverActions,
  StyledCheckClose,
  // StyledBox, 
  StyledTypography,
  StyledBoxFl,
} from "./FunctionalProperties.styles";
import { useToast } from "@components/common/ToastProvider";
import { useLocation } from "react-router-dom";
import { DISPLAY_TYPE_OPTIONS } from "./DisplayOption";

const ICON_OPTIONS = [
  { value: "list", label: "Danh sách", icon: <FormatListBulleted /> },
  { value: "kanban", label: "Kanban", icon: <ViewKanban /> },
  { value: "calendar", label: "Lịch", icon: <CalendarMonth /> },
  { value: "gantt", label: "Gantt", icon: <ViewTimeline /> },
];

const IconChoiceButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "isSelected",
})(({ theme, isSelected }) => ({
  border: "1px solid",
  borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
  color: isSelected ? theme.palette.primary.main : "inherit",
}));

const TabLabelBox = ({ label, onDelete,   }) => {
  // const selectedIcon = ICON_OPTIONS.find((opt) => opt.value === icon)?.icon;
  return (
  <TabLabelContainer>
    {/* {selectedIcon && (
      <StyledBox component="span" >
        {selectedIcon}
      </StyledBox>
    )}*/}
    <TabLabelText>{label}</TabLabelText> 
    {onDelete && (
      <TabCloseButton size="small" onClick={onDelete}>
        <StyledCheckClose />
      </TabCloseButton>
    )}
  </TabLabelContainer>
  );
};

TabLabelBox.propTypes = {
  label: PropTypes.string.isRequired,
  onDelete: PropTypes.func,
  icon: PropTypes.string,
};

const a11yProps = (index) => ({
  id: `functional-prop-tab-${index}`,
  "aria-controls": `functional-prop-panel-${index}`,
});

const FunctionalProperties = ({
  item,
  onPropChange,
  mode = "builder",
  // data,
  onTabChange,
}) => {
  const [tabs, setTabs] = useState([
    { id: 0, label: "Thuộc tính 1", displayType: "list", count: 0, icon: "list", showPagination: true, showSearch: false },
	]);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [editingTab, setEditingTab] = useState(null);
  const toast = useToast();

  const location = useLocation();
  const isFirstLocationRef = useRef(true);

  useEffect(() => {
    if (isFirstLocationRef.current) {
      isFirstLocationRef.current = false;
      return;
    }
    setActiveTab(0);
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    const selectedTab = tabs[newValue];
    setActiveTab(newValue);
    onTabChange && onTabChange({
      displayType: selectedTab.displayType || "list",
      showPagination: selectedTab.showPagination !== false, // Mặc định là true nếu chưa có
      showSearch: selectedTab.showSearch === true, // Mặc định false
    });
  };
  const createIconChangeHandler = (iconValue) => () => {
    handleConfigChange("icon", iconValue);
  };

  const handleAddTab = () => {
    const newId = tabs.length
      ? Math.max(...tabs.map((t) => t.id)) + 1
      : 0;

    setTabs([
      ...tabs,
      {
        id: newId,
        label: `Thuộc tính ${tabs.length + 1}`,
        displayType: "list",
        count: 0,
        icon: "list",
        showPagination: true,
        showSearch: false,
      },
    ]);

    setActiveTab(tabs.length);
  };

  const handleDeleteTab = (id) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);

    if (activeTab >= newTabs.length) {
      setActiveTab(newTabs.length - 1);
    }
  };

  const handleOpenConfig = (event) => {
    setAnchorEl(event.currentTarget);
    setEditingTab(tabs[activeTab]);
  };

  const handleCloseConfig = () => {
    setAnchorEl(null);
    setEditingTab(null);
  };

  const handleConfigChange = (key, val) => {
    setEditingTab((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveConfig = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === editingTab.id ? editingTab : t))
    );
    handleCloseConfig();
  };

  const handleSaveAll = () => {
    onPropChange(item.id, "subtabs", tabs);
    toast("Lưu thành công", "success");
  };

  useEffect(() => {
    if (item.props?.subtabs?.length) {
      const normalizedTabs = item.props.subtabs.map((t) => ({
        ...t,
        showPagination: t.showPagination !== false,
        showSearch: t.showSearch === true, // default false
      }));

      setTabs(normalizedTabs);

      const currentTab = normalizedTabs[activeTab] || normalizedTabs[0];
      if (currentTab && onTabChange) {
        onTabChange({
          displayType: currentTab.displayType || "list",
          showPagination: currentTab.showPagination !== false,
          showSearch: currentTab.showSearch === true,
        });
      }
    }
  }, [item.props?.subtabs, activeTab, onTabChange]);

  const handleLabelChange = (e) => {
    handleConfigChange("label", e.target.value);
  };

  const handleDisplayTypeChange = (e) => {
    handleConfigChange("displayType", e.target.value);
  };

  const handleCountChange = (e) => {
    handleConfigChange("count", parseInt(e.target.value, 10) || 0);
  };
  const handleShowPaginationChange = (e) => {
    handleConfigChange("showPagination", e.target.checked);
  };

  const handleShowSearchChange = (e) => {
    handleConfigChange("showSearch", e.target.checked);
  };

  return (
    <TabsContainer>
      <TabsActionsWrapper>
        <StyledTabs
          value={activeTab}
          onChange={handleChange}
          aria-label="functional properties tabs"
        >
          {tabs.map((tab, index) => (
            <StyledTab
              key={tab.id}
              isActive={activeTab === index}
              label={
                <TabLabelBox
                  label={tab.label}
                  icon={tab.icon}
                  isActive={activeTab === index}
                  onDelete={
                    mode === "builder" && tabs.length > 1
                      ? (e) => {
                          e.stopPropagation();
                          handleDeleteTab(tab.id);
                        }
                      : null
                  }
                />
              }
              {...a11yProps(index)}
            />
          ))}
        </StyledTabs>

        {mode === "builder" && (
          <>
            <ActionButton onClick={handleOpenConfig}>
              <Settings />
            </ActionButton>

            <ActionButton onClick={handleAddTab}>
              <Add />
            </ActionButton>

            <ActionButton onClick={handleSaveAll}>
              <Save />
            </ActionButton>
          </>
        )}
      </TabsActionsWrapper>

      <ConfigPopover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseConfig}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {editingTab && (
          <PopoverContent>
            <Typography variant="subtitle1">
              Cấu hình Thuộc tính
            </Typography>

            <StyledTypography variant="subtitle2" >
              Chọn Icon
            </StyledTypography>
            <StyledBoxFl >
              {ICON_OPTIONS.map((option) => (
                <Tooltip key={option.value} title={option.label}>
                  <IconChoiceButton
                    onClick={createIconChangeHandler(option.value)}
                    isSelected={editingTab.icon === option.value}
                  >
                    {option.icon}
                  </IconChoiceButton>
                </Tooltip>
              ))}
            </StyledBoxFl>

            <TextField
              label="Tên Thuộc tính"
              value={editingTab.label}
              onChange={handleLabelChange}
              fullWidth
            />

            <TextField
              label="Số lượng"
              type="number"
              value={editingTab.count || 0}
              onChange={handleCountChange}
              fullWidth
            />

            <StyledTypography variant="subtitle2" >
              Kiểu hiển thị
            </StyledTypography>
            <Select
              fullWidth
              value={editingTab.displayType || "list"}
              onChange={handleDisplayTypeChange}
            >
              {DISPLAY_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>

            <FormControlLabel
              control={
                <Switch
                  checked={editingTab.showPagination !== false}
                  onChange={handleShowPaginationChange}
                />
              }
              label="Hiển thị phân trang"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editingTab.showSearch !== false}
                  onChange={handleShowSearchChange}
                />
              }
              label="Hiển thị tìm kiếm thời gian"
            />

            <PopoverActions>
              <Button onClick={handleSaveConfig} variant="contained">
                Lưu Thuộc tính
              </Button>
            </PopoverActions>
          </PopoverContent>
        )}
      </ConfigPopover>
    </TabsContainer>
  );
};

FunctionalProperties.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["builder", "preview"]),
  data: PropTypes.object,
  onTabChange: PropTypes.func,
};

export default FunctionalProperties;
