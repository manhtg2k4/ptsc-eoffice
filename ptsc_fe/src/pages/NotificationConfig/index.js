import React, { useState, useCallback, useMemo, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  PageContainer,
  HeaderSection,
  Breadcrumb,
  BreadcrumbCurrent,
  Title,
  Subtitle,

  FlexRowGap,
  ActionGroup,
  LoadingWrapper,

  FilterToolbar,
  SearchField,
  InputWrapper,
  ToggleButton,
  ModuleBadge,
  SaveButton,

  TypeNameText,
  StartAdornment,
  EndAdornment,
  SearchIconStyled,
  CheckIconStyled,
  TableIconWrapper,
  DocIconStyled,
  ClearIconStyled,
  TableWrapper,
} from "./NotificationConfig.styles";
import { useToast } from "@components/common/ToastProvider";
import api from "@services/api";
import { API_NOTIFICATION_CONFIG } from "@EnvironmentFile/constants/urlConfig";
import { getModuleInfo, MODULE_MAP, NotificationGroup } from "./constants";
import withSharedComponents from "@components/WrapperComponent";


const handleStopPropagation = (e) => {
  e.stopPropagation();
};

const EMPTY_FILTER = [];

const DebouncedSearchInput = ({ onSearch, placeholder }) => {
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(localSearch);
    }, 1200);

    return () => clearTimeout(handler);
  }, [localSearch, onSearch]);

  const handleClear = useCallback(() => {
    setLocalSearch("");
  }, []);

  const handleChange = useCallback((e) => {
    setLocalSearch(e.target.value);
  }, []);

  return (
    <SearchField
      size="small"
      placeholder={placeholder}
      value={localSearch}
      onChange={handleChange}
      InputProps={{
        startAdornment: (
          <StartAdornment>
            <SearchIconStyled />
          </StartAdornment>
        ),
        endAdornment: localSearch && (
          <EndAdornment>
            <IconButton size="small" onClick={handleClear} edge="end">
              <ClearIconStyled />
            </IconButton>
          </EndAdornment>
        ),
      }}
    />
  );
};

function NotificationConfig({ sharedComponents }) {
  const { InputComponents, Table } = sharedComponents || {};
  const navigate = useNavigate();
  const toast = useToast();

  // Loading States
  const [saving, setSaving] = useState(false);



  // Table & Filters State
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [reloadData, setReloadData] = useState(null);

  // Track pending changes locally: { [typeId]: groupsArray }
  const [changedTypes, setChangedTypes] = useState({});

  const moduleOptions = useMemo(() => {
    return [
      { value: "all", title: "Tất cả module" },
      ...Object.entries(MODULE_MAP).map(([key, info]) => ({
        value: key,
        title: info.name,
      })),
    ];
  }, []);

  const groupOptions = useMemo(() => {
    return [
      { value: "all", title: "Tất cả nhóm" },
      { value: NotificationGroup.PROCESS, title: "Xử lý" },
      { value: NotificationGroup.RECEIVE, title: "Nhận để biết" },
      { value: NotificationGroup.UNGROUPED, title: "Chưa phân nhóm" },
    ];
  }, []);



  // Fetch paginated notification types for TableNotification
  const fetchDataForTable = useCallback(async (tableParams) => {
    try {
      const params = {
        page: tableParams?.page || 1,
        limit: tableParams?.limit || 25,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(moduleFilter !== "all" && { module: moduleFilter }),
        ...(groupFilter !== "all" && { group: groupFilter }),
      };

      const response = await api.get(API_NOTIFICATION_CONFIG, { params });
      const data = response.data?.data || [];
      const total = response.data?.total || data.length || 0;

      return {
        data: data,
        total: total,
      };
    } catch (error) {
      toast("Không thể tải danh sách loại thông báo!", "error");
      return { data: [], total: 0 };
    }
  }, [debouncedSearch, moduleFilter, groupFilter, toast]);

  // Reset page when search or filters change
  const handleSearchChange = useCallback((newSearch) => {
    if (newSearch === debouncedSearch) return;
    setDebouncedSearch(newSearch);
  }, [debouncedSearch]);

  const handleModuleFilterChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setModuleFilter(val);
  }, []);

  const handleGroupFilterChange = useCallback((e) => {
    const val = e?.target ? e.target.value : e;
    setGroupFilter(val);
  }, []);
  // Toggle group inside the table row locally
  const handleToggleGroup = useCallback((typeItem, groupCode) => {
    const typeId = typeItem.id;

    setChangedTypes((prev) => {
      const currentGroups = prev[typeId] !== undefined
        ? prev[typeId]
        : typeItem.groups || [];

      // Chỉ cho phép chọn 1 trong các nhóm. Nếu bỏ chọn thì trở về UNGROUPED
      let newGroups = [];
      if (currentGroups.includes(groupCode)) {
        newGroups = ["UNGROUPED"]; // Bỏ chọn
      } else {
        newGroups = [groupCode]; // Chọn nhóm mới, tự động bỏ nhóm cũ
      }


      return {
        ...prev,
        [typeId]: newGroups,
      };
    });
  }, []);

  // Bulk Save changes
  const handleSaveChanges = useCallback(async () => {
    const entries = Object.entries(changedTypes);
    if (entries.length === 0) {
      toast("Không có thay đổi nào cần lưu!", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: entries.map(([id, groups]) => ({
          id: Number(id),
          groups,
        })),
      };

      await api.patch(`${API_NOTIFICATION_CONFIG}/bulk`, payload);
      toast("Lưu các cấu hình thông báo thành công!", "success");
      setChangedTypes({});

      setReloadData(new Date().getTime());
    } catch (error) {
      toast("Đã xảy ra lỗi khi lưu các cấu hình thông báo!", "error");
    } finally {
      setSaving(false);
    }
  }, [changedTypes, toast]);

  // Derived properties for UI
  const hasChanges = useMemo(() => Object.keys(changedTypes).length > 0, [changedTypes]);

  // Stable navigation back handler
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Stable event handlers for table row mappings
  const createToggleGroupHandler = useCallback((item, groupCode) => () => {
    handleToggleGroup(item, groupCode);
  }, [handleToggleGroup]);



  // Columns definition for TableNotification
  const columns = useMemo(() => [
    {
      name: "Loại thông báo",
      row: "name",
      width: 550,
      accessor: (row) => {
        const modInfo = getModuleInfo(row.module);

        return (
          <FlexRowGap>
            <TableIconWrapper $fill={modInfo.bgColor} $fg={modInfo.color}>
              <DocIconStyled />
            </TableIconWrapper>
            <Tooltip title={row.name} arrow placement="top-start">
              <TypeNameText variant="body2">{row.name}</TypeNameText>
            </Tooltip>
          </FlexRowGap>
        );
      }
    },
    {
      name: "Module",
      row: "module",
      accessor: (row) => {
        const modInfo = getModuleInfo(row.module);
        return (
          <ModuleBadge
            label={modInfo.name}
            $fill={modInfo.bgColor}
            $fg={modInfo.color}
          />
        );
      }
    },
    {
      name: "Nhóm thông báo",
      row: "groups",
      accessor: (row) => {
        const currentGroups = changedTypes[row.id] !== undefined
          ? changedTypes[row.id]
          : row.groups || [];

        const isProcess = currentGroups.includes("PROCESS");
        const isReceive = currentGroups.includes("RECEIVE");

        return (
          <ActionGroup onClick={handleStopPropagation}>
            {/* Toggle PROCESS */}
            <ToggleButton
              $active={isProcess ? 1 : 0}
              $themeFg="#1d4ed8"
              $themeBg="#eff6ff"
              startIcon={isProcess && <CheckIconStyled />}
              onClick={createToggleGroupHandler(row, "PROCESS")}
            >
              Xử lý
            </ToggleButton>

            {/* Toggle RECEIVE */}
            <ToggleButton
              $active={isReceive ? 1 : 0}
              $themeFg="#15803d"
              $themeBg="#f0fdf4"
              startIcon={isReceive && <CheckIconStyled />}
              onClick={createToggleGroupHandler(row, "RECEIVE")}
            >
              Nhận để biết
            </ToggleButton>
          </ActionGroup>
        );
      }
    }
  ], [changedTypes, createToggleGroupHandler]);

  return (
    <PageContainer>
      {/* Back to previous panel link */}

      {/* Title Header */}
      <HeaderSection>
        <Box>
          <Breadcrumb>
            <span onClick={handleGoBack}>THÔNG BÁO</span>
            <span>&gt;</span>
            <BreadcrumbCurrent>Cấu hình thông báo</BreadcrumbCurrent>
          </Breadcrumb>
          <Title>Cấu hình thông báo</Title>
          <Subtitle>
            Phân nhóm loại thông báo của từng module theo nhu cầu xử lý
          </Subtitle>
        </Box>
        <SaveButton
          variant="contained"
          disabled={saving || !hasChanges}
          onClick={handleSaveChanges}
        >
          Lưu thay đổi
        </SaveButton>
      </HeaderSection>

      {/* Toolbar: Filters and Search */}
      <FilterToolbar>
        {/* Module Filter Dropdown */}
        {/* Module Filter Dropdown using shared component */}
        {InputComponents && (
          <InputWrapper>
            <InputComponents
              select
              size="small"
              value={moduleFilter}
              onChange={handleModuleFilterChange}
              options={moduleOptions}
              customLabel="title"
              customValue="value"
              placeholder="Chọn module..."
              disableSearch
              fullWidth
            />
          </InputWrapper>
        )}

        {InputComponents && (
          <InputWrapper>
            <InputComponents
              select
              size="small"
              value={groupFilter}
              onChange={handleGroupFilterChange}
              options={groupOptions}
              customLabel="title"
              customValue="value"
              placeholder="Chọn nhóm thông báo..."
              disableSearch
              fullWidth
            />
          </InputWrapper>
        )}

        {/* Search Field */}
        <DebouncedSearchInput
          placeholder="Tìm theo tên loại thông báo..."
          onSearch={handleSearchChange}
        />
      </FilterToolbar>

      <TableWrapper>
        {Table && (
          <Suspense fallback={<LoadingWrapper><CircularProgress /></LoadingWrapper>}>
            <Table
              filter={EMPTY_FILTER}
              columns={columns}
              fetchData={fetchDataForTable}
              disableCheckbox
              disableEdit
              disableDetail
              disableDelete
              disableAct
              anableSTT={false}
              hideSTT
              recordLabel="loại thông báo"
              reload={reloadData}
              fillHeight
            />
          </Suspense>
        )}
      </TableWrapper>

    </PageContainer>
  );
}

export default withSharedComponents(NotificationConfig);
