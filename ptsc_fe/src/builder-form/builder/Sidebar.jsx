import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useRegistry } from "@builder-form/context/RegistryContext";
import { Tabs, Tab } from "@mui/material";
import CustomAutocomplete from "@components/DynamicForm/CustomAutocomplete";
import { API_DESIGN_FORM } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
import {
  SidebarContainer,
  AutocompleteWrapper,
  TabPanelContent,
  DraggableItem,
  DragItemContent,
  StyledDragIndicator,
  ComponentName,
} from "./Sidebar.styles";

function TabPanel({ children, value, index }) {
  if (value !== index) return null;
  return <TabPanelContent>{children}</TabPanelContent>;
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
  idList: PropTypes.string,
};

export default function Sidebar({ setIsDrag, onData, value = null, idList }) {
  const registry = useRegistry();
  const [tab, setTab] = useState(0);
  const [options, setOptions] = useState([]);

  const components = Object.entries(registry).filter(([, v]) => !v.isLayout);
  const layouts = Object.entries(registry).filter(([, v]) => v.isLayout);
  // const fethApiFields = async () => {
  const fethApiFields = useCallback(async () => {
    if (!idList) return;
    try {
      const res = await api.get(
        `${API_DESIGN_FORM}?type=attribute&processID=${idList}`
      );
      setOptions(res.data.data || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      logger.error(error);
    }
  }, [idList]);

  useEffect(() => {
    fethApiFields();
  }, [fethApiFields]);

  const handleTabChange = useCallback((_, newVal) => {
    setTab(newVal);
  }, []);

  const handleDragStart = (key) => (e) => {
    e.dataTransfer.setData("type", key);
    setIsDrag(true);
  };

  const handleDragEnd = () => setIsDrag(false);

  const renderItem = ([key, val]) => (
    <DraggableItem
      key={key}
      draggable
      // onDragStart={(e) => {
      // 	e.dataTransfer.setData('type', key);
      // 	setIsDrag(true);
      // }}
      // onDragEnd={() => setIsDrag(false)}
      onDragStart={handleDragStart(key)}
      onDragEnd={handleDragEnd}
    >
      <DragItemContent>
        <StyledDragIndicator />
        <ComponentName>{val.displayName}</ComponentName>
      </DragItemContent>
    </DraggableItem>
  );

  return (
    <SidebarContainer>
      <AutocompleteWrapper>
        <CustomAutocomplete
          field={{
            value: value,
            onChange: onData,
          }}
          size="small"
          options={options}
          getOptionLabel={(option) => option.name}
          placeholder={"Chọn dữ liệu..."}
          isOptionEqualToValue={(option, value) => option?.code === value?.code}
          disableClearable
        />
      </AutocompleteWrapper>

      {/* <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)} centered> */}
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
