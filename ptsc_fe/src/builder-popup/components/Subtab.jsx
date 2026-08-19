import React, { useEffect, useState } from "react";
import {
  Select,
  MenuItem,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Settings, Save } from "@mui/icons-material";
import PropTypes from "prop-types";
import { StyledTab, StyledTabs, TabsContainer } from "@styles/Subtab.style";
import { useToast } from "@components/common/ToastProvider";
import {
  TabsActionsWrapper,
  TabLabelContainer,
  TabLabelText,
  TabCloseButton,
  ActionButton,
  ConfigPopover,
  PopoverContent,
  PopoverActions,
  StyledCheckCircleIcon,
  StyledCheckClose,
} from "./Subtab.styles";

const TabLabelBox = ({ icon, label, onDelete }) => (
  <TabLabelContainer>
    {icon}
    <TabLabelText>{label}</TabLabelText>
    {onDelete && (
      <TabCloseButton size="small" onClick={onDelete}>
        <StyledCheckClose/>
      </TabCloseButton>
    )}
  </TabLabelContainer>
);

TabLabelBox.propTypes = {
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  onDelete: PropTypes.func,
};

const a11yProps = (index) => ({
  id: `subtab-${index}`,
  "aria-controls": `subtab-panel-${index}`,
});

const Subtab = ({ item, onPropChange, mode = "builder", data, onTabChange }) => {
  const funcDataList = data?.funcDataList || [];

  const [tabs, setTabs] = useState([{ id: 0, label: "Tab 1", func: "" }]);
  const [value, setValue] = useState(0);

  const [anchorEl, setAnchorEl] = useState(null);
  const [editingTab, setEditingTab] = useState(null);

  const toast = useToast();

  const handleChange = (event, newValue) => {

    const selectedTab = tabs[newValue];
    if (selectedTab?.func) {
      // Gửi đi mã func ở đây
    }
    setValue(newValue);
    onTabChange && onTabChange(selectedTab.func);

  };

  const handleAddTab = () => {
    const newId = tabs.length ? Math.max(...tabs.map((t) => t.id)) + 1 : 0;
    setTabs([...tabs, { id: newId, label: `Tab ${tabs.length + 1}`, func: "" }]);
    setValue(tabs.length);
  };

  const handleDeleteTab = (id) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (value >= newTabs.length) {
      setValue(newTabs.length - 1);
    }
  };

  const handleOpenConfig = (event) => {
    setAnchorEl(event.currentTarget);
    setEditingTab(tabs[value]);
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
    toast('Lưu thành công', 'success')
  };

  useEffect(() => {
    if (item.props?.subtabs?.length) {
      setTabs(item.props?.subtabs)
    }
  }, [item.props?.subtabs])
  const handleLabelChange = (e) => {
    handleConfigChange("label", e.target.value);
  };

  const handleFuncChange = (e) => {
    handleConfigChange("func", e.target.value);
  };

  return (
    <TabsContainer>
      <TabsActionsWrapper>

        <StyledTabs
          value={value}
          onChange={handleChange}
          aria-label="subtabs example"
        >
          {tabs.map((tab, index) => (
            <StyledTab
              key={tab.id}
              isActive={value === index}
              isEven={index % 2 === 0}
              label={
                <TabLabelBox
                  icon={<StyledCheckCircleIcon />}
                  label={tab.label}
                  onDelete={
                    mode === "builder" && tabs.length > 1
                      ? () => handleDeleteTab(tab.id)
                      : null
                  }
                />
              }
              {...a11yProps(index)}
            />
          ))}
        </StyledTabs>

        {mode === "builder" && (
          <ActionButton onClick={handleOpenConfig}>
            <Settings />
          </ActionButton>
        )}

        {mode === "builder" && (
          <ActionButton onClick={handleAddTab}>
            <Add />
          </ActionButton>
        )}

        {mode === "builder" && (
          <ActionButton onClick={handleSaveAll}>
            <Save />
          </ActionButton>
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
            <Typography variant="subtitle1">Cấu hình Tab</Typography>

            <TextField
              label="Tên Tab"
              value={editingTab.label}
              onChange={handleLabelChange}
              fullWidth
            />

            <Select
              fullWidth
              value={editingTab.func}
              onChange={handleFuncChange}
            >
              {funcDataList.map((opt) => (
                <MenuItem key={opt._id} value={opt.code}>
                  {opt.name}
                </MenuItem>
              ))}
            </Select>

            <PopoverActions>
              <Button onClick={handleSaveConfig} variant="contained">
                Lưu Tab
              </Button>
            </PopoverActions>
          </PopoverContent>
        )}
      </ConfigPopover>
    </TabsContainer>
  );
};

Subtab.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["builder", "preview"]),
  data: PropTypes.object,
  onTabChange: PropTypes.func,
};

export default Subtab;