import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useRegistry } from "@builder-form-export/context/RegistryContext";
import { Tabs, Tab } from "@mui/material";
// import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

import { API_DESIGN_FORM } from "@EnvironmentFile/constants/urlConfig";
import {
  SidebarContainer,
  AutocompleteContainer,
  StyledCustomAutocomplete,
  StyledTabPanel,
  DraggableItem,
  DraggableItemContent,
  DraggableItemLabel,
  DraggableDragIndicatorIcon,
} from "./Sidebar.styles";
import api from "@services/api";

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <StyledTabPanel>{children}</StyledTabPanel>;
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

Sidebar.propTypes = {
  setIsDrag: PropTypes.func.isRequired,
  onData: PropTypes.func.isRequired,
  value: PropTypes.any,
};

export default function Sidebar({ setIsDrag, onData, value = null, idList }) {
  const registry = useRegistry();
  const [tab, setTab] = useState(0);
  const [options, setOptions] = useState([]);

  const components = Object.entries(registry).filter(([, v]) => !v.isLayout);
  const layouts = Object.entries(registry).filter(([, v]) => v.isLayout);

  // API duy nhất
  const fethApiFields = async () => {
    try {
      const res = await api.get(
        `${API_DESIGN_FORM}?type=attribute&processID=${idList}`
      );

      logger.log("ressss", res);
      setOptions(res.data.data || []);
    } catch (error) {
      logger.error(error);
    }
  };

  useEffect(() => {
    fethApiFields();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleDragStart = (key) => (e) => {
    e.dataTransfer.setData("type", key);
    setIsDrag(true);
  };

  const handleDragEnd = () => setIsDrag(false);

  const renderItem = ([key, val]) => (
    <DraggableItem
      key={key}
      draggable
      onDragStart={handleDragStart(key)}
      onDragEnd={handleDragEnd}
    >
      <DraggableItemContent>
        <DraggableDragIndicatorIcon />
        <DraggableItemLabel variant="body2">
          {val.displayName}
        </DraggableItemLabel>
      </DraggableItemContent>
    </DraggableItem>
  );

  return (
    <SidebarContainer>
      {/* Autocomplete ở đầu */}
      <AutocompleteContainer>
        <StyledCustomAutocomplete
          field={{
            value: value,
            onChange: onData,
          }}
          size="small"
          options={options}
          getOptionLabel={(option) => option.name}
          placeholder={"Chọn dữ liệu..."}
          isOptionEqualToValue={(option, value) => option?.code === value?.code}
        />
      </AutocompleteContainer>

      <Tabs value={tab} onChange={handleTabChange} centered>
        <Tab label="Thành phần" />
        <Tab label="Bố cục" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        {components.map(renderItem)}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {layouts.map(renderItem)}
      </TabPanel>
    </SidebarContainer>
  );
}
