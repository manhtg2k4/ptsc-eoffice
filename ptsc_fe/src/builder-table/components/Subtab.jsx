import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Add, Settings, Save } from "@mui/icons-material";
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
  // TabCount,
  StyledCheckClose,
} from "./Subtab.styles";
import { useToast } from "@components/common/ToastProvider";
import { setCurrentTab, setSubtabCounts } from "@redux/slices/FormDesign/formDesignSlice";
import { useSelector, useDispatch } from "react-redux";

import { useLocation } from "react-router-dom";
import CustomInput from "@components/CustomInput/CustomInput";
import api from '@services/api';
import { API_COUNT_SUB_TAB } from '@EnvironmentFile/constants/urlConfig';

const StyledTextField = styled(TextField)({
  "& .MuiInputBase-input": {
    fontFamily: '"Arial", sans-serif',
  },
});

const CountBadge = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isActive" && prop !== "isVisible",
})(({ isVisible }) => ({
  position: "absolute",
  top: "-3px",
  right: "-15px",
  width: "22px",
  height: "22px",
  borderRadius: '50%',
  backgroundColor: "#f44336",
  color: "#fff",
  fontSize: "0.7rem",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  zIndex: 2,
  pointerEvents: "none",
  opacity: isVisible ? 1 : 0,
  visibility: isVisible ? "visible" : "hidden",
  transform: isVisible ? "scale(1)" : "scale(0.9)",
  transition: "opacity 0.2s ease, transform 0.2s ease",
}));

const TabLabelBox = ({ label, count, onDelete, isActive }) => {
  // console.log(`Rendering Tab ${label} with final count:`, count);
  return (
    <TabLabelContainer>
      
      <TabLabelText hasCount={count > 0}>{label}</TabLabelText>
      <CountBadge isActive={isActive} isVisible={count > 0}>
        {count > 99 ? "99+" : count}
      </CountBadge>
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
  count: PropTypes.number,
  onDelete: PropTypes.func,
  isActive: PropTypes.bool,
};

const a11yProps = (index) => ({
  id: `subtab-${index}`,
  "aria-controls": `subtab-panel-${index}`,
});

const getTabCacheKey = (tab, index) => {
  const funcKey = String(tab?.func || "").trim();
  if (funcKey) return `func:${funcKey}`;
  if (tab?.id !== undefined && tab?.id !== null) return `id:${tab.id}`;
  return `idx:${index}`;
};

// Biến module-level để lưu vết route và defaultTab đã xử lý, giúp giữ state tab khi re-mount hoặc thao tác trên cùng trang.
let lastPathname = null;
let lastDefaultTab = null;

const Subtab = ({ item, onPropChange, mode = "builder", data, onTabChange, reloadData }) => {
  const funcDataList = data?.funcDataListFull || [];

  const [tabs, setTabs] = useState([
    { id: 0, label: "Tab 1", func: "", count: 0 }
  ]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [editingTab, setEditingTab] = useState(null);

  const toast = useToast();

  const dispatch = useDispatch();
  const currentTab = useSelector((state) => state.formDesign.currentTab);
  const tableConfig = useSelector((state) => state.formDesign.tableConfig);
  const formConfig = useSelector((state) => state.formDesign.formConfig);
  const subtabCounts = useSelector((state) => state.formDesign.subtabCounts);

  const location = useLocation();
  const countCacheRef = useRef(new Map());
  

  useEffect(() => {
    const defaultTab = (location.state && typeof location.state.defaultTab === "number")
      ? location.state.defaultTab
      : 0;

    // Chỉ thực hiện thiết lập lại tab khi chuyển route mới (khác pathname) hoặc khi defaultTab từ Dashboard thay đổi
    if (location.pathname !== lastPathname || defaultTab !== lastDefaultTab) {
      lastPathname = location.pathname;
      lastDefaultTab = defaultTab;

      dispatch(setCurrentTab(defaultTab));
      if (defaultTab !== 0) {
        const subtabs = item.props?.subtabs || [];
        const targetTab = subtabs[defaultTab];
        if (targetTab?.func) {
          onTabChange && onTabChange(targetTab.func);
        }
      }
    }
  }, [location.pathname, location.state, dispatch, item.props?.subtabs, onTabChange]);
  
  const handleChange = (event, newValue) => {
    const selectedTab = tabs[newValue];
    if (selectedTab?.func) {
      // Gửi đi mã func ở đây
    }
    dispatch(setCurrentTab(newValue));
    onTabChange && onTabChange(selectedTab.func);
  };

  const handleAddTab = () => {
    const newId = tabs.length ? Math.max(...tabs.map((t) => t.id)) + 1 : 0;
    setTabs([...tabs, { 
      id: newId, 
      label: `Tab ${tabs.length + 1}`, 
      func: "",
      count: 0 
    }]);
    dispatch(setCurrentTab(tabs.length));
  };

  const handleDeleteTab = (id) => {
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (currentTab >= newTabs.length) {
      dispatch(setCurrentTab(newTabs.length - 1));
    }
  };

  const handleOpenConfig = (event) => {
    setAnchorEl(event.currentTarget);
    setEditingTab(tabs[currentTab]);
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
    toast('Lưu thành công', 'success');
  };

  const getMoreActionFuncs = (obj) => {
    let extraCodes = [];
    const traverse = (current) => {
      if (!current || typeof current !== 'object') return;
      if (Array.isArray(current)) {
        current.forEach(item => traverse(item));
        return;
      }
      if (current.type === 'moreAction' && current.props?.items) {
        current.props.items.forEach(i => {
          if (i.func) extraCodes.push(i.func);
        });
      }
      Object.keys(current).forEach(key => {
        const value = current[key];
        if (value && typeof value === 'object') {
          traverse(value);
        }
      });
    };
    traverse(obj);
    return extraCodes;
  };

  useEffect(() => {
    if (!item.props?.subtabs?.length) return;

    const subtabs = item.props?.subtabs || [];

    // Đồng bộ tabs từ props nhưng giữ count từ cache/redux để tránh nháy số.
    setTabs((prevTabs) => {
      const mergedCountMap = new Map(countCacheRef.current);

      prevTabs.forEach((tab, index) => {
        mergedCountMap.set(getTabCacheKey(tab, index), tab.count ?? 0);
      });

      const nextTabs = subtabs.map((tab, index) => {
        const cacheKey = getTabCacheKey(tab, index);
        const funcKey = String(tab?.func || "").trim();
        const cachedCount = mergedCountMap.get(cacheKey);
        const reduxCount = funcKey ? subtabCounts?.[funcKey] : undefined;
        const nextCount = cachedCount ?? reduxCount ?? tab.count ?? 0;

        mergedCountMap.set(cacheKey, nextCount);
        return {
          ...tab,
          count: nextCount,
        };
      });

      countCacheRef.current = mergedCountMap;
      return nextTabs;
    });
  }, [item.props?.subtabs, subtabCounts]);

  useEffect(() => {
    if (!item.props?.subtabs?.length) return;

    const subtabs = item.props?.subtabs || [];
    let isCancelled = false;

    const fetchCounts = async () => {
      const subtabCodes = subtabs.map((t) => t.func).filter(Boolean);
      const moreActionCodes = [
        ...getMoreActionFuncs(tableConfig),
        ...getMoreActionFuncs(formConfig),
        ...getMoreActionFuncs(data),
      ];

      const allCodes = [...new Set([...subtabCodes, ...moreActionCodes])].join(",");
      if (!allCodes || mode === "builder") return;

      try {
        const res = await api.get(`${API_COUNT_SUB_TAB}?codes=${allCodes}`);
        if (isCancelled) return;

        const countMap = res?.data?.countMap || res?.countMap || {};
        dispatch(setSubtabCounts(countMap));

        setTabs((prev) =>
          prev.map((t, index) => {
            const funcKey = String(t.func || "").trim();
            const apiCount = countMap[funcKey];
            const nextCount = apiCount !== undefined ? apiCount : t.count ?? 0;

            countCacheRef.current.set(getTabCacheKey(t, index), nextCount);

            return {
              ...t,
              count: nextCount,
            };
          })
        );
      } catch (error) {
        logger.error("Subtab Logic - Fetch error:", error);
      }
    };

    fetchCounts();

    return () => {
      isCancelled = true;
    };
  }, [item.props?.subtabs, tableConfig, formConfig, data, dispatch, reloadData, mode]);




  const handleLabelChange = (e) => {
    handleConfigChange("label", e.target.value);
  };

  const handleFuncChange = (e) => {
    handleConfigChange("func", e?.target?.value ?? e);
  };

  const handleCountChange = (e) => {
    handleConfigChange("count", parseInt(e.target.value) || 0);
  };

  return (
      <TabsContainer>
      <TabsActionsWrapper>
        <StyledTabs
          value={currentTab}
          onChange={handleChange}
          aria-label="subtabs example"
        >
          {tabs.map((tab, index) => (
            <StyledTab
              key={tab.id}
              isActive={currentTab === index}
              label={
                <TabLabelBox
                  label={tab.label}
                  count={tab.count}
                  isActive={currentTab === index}
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
            <Typography variant="subtitle1">Cấu hình Tab</Typography>

            <StyledTextField
              label="Tên Tab"
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

            <CustomInput
              label="Chức năng"
              fullWidth
              value={editingTab.func}
              onChange={handleFuncChange}
              select
              options={funcDataList}
              customValue="code"
              customLabel="name"
            />

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
  reloadData: PropTypes.any,
};

export default Subtab;
