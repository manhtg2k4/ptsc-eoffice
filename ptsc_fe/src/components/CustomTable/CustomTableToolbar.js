// src/components/CustomTableToolbar.jsx
import React from "react";
import {
  Box,
  IconButton,
  Tooltip,
  ClickAwayListener,
  FormControlLabel,
  Checkbox,
  useTheme,
  useMediaQuery,
  styled,
} from "@mui/material";
import {
  Search,
  Add,
  Tune as TuneIcon,
  Dehaze,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Loop as LoopOutlined,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  StyledToolbar,
  SearchContainer,
  StyledSearchField,
  StyledFilterButton,
  FilterBox,
  StyledSearchButton,
  MoreSearchBox,
  ActionsContainer,
  ActionsBox,
  StyleBoxActionsRespon,
  StyledButton,
  StyleBoxActionDropDown,
  StyleActionCheckBox,
  StyleActionCellCheckBox,
  StyleActionButton,
  StyleActionButtonCancel,
  StyleActionButtonApply,
  StyledClearIcon,
  SearchAdornment,
  DatePickerGrid,
  DatePickerBox,
  RadioBox,
} from "@styles/CustomTable.styles";
const ThemedDateRangePicker = styled(Box)(({ theme }) => ({
  "& .rdrCalendarWrapper": {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
  "& .rdrDateDisplayItem": {
    backgroundColor: theme.palette.action.hover,
  },
  "& .rdrDayNumber span": {
    color: theme.palette.text.primary,
  },
}));

const ToolbarLeftContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  flexGrow: 1,
  gap: theme.spacing(1),
}));

import CustomDateRangePicker from "@components/CustomInput/CustomDateRangePicker";
import DatePicker from "../DropDownLayout/DatePicker"; // Điều chỉnh path nếu cần

const CustomTableToolbar = ({
  // Search & Filter
  inputValue,
  searchText,
  onInputChange,
  onSearchClick,
  onClearSearch,

  // Filter dropdown
  filter,
  tempSelectedColumns = [],
  openFilter,
  onFilterToggle,
  onFilterAway,
  onColumnFilterChangeDirect,
  onSelectAllColumns,
  onApplyFilter,

  // Date picker
  anableDateRangePicker = false,
  dateRange,
  onDateRangeChange,
  anableDatePicker = false,
  onDatePickerChange,

  // Radio (nếu cần)
  isRadio = false,

  // Actions
  onAdd,
  disableAdd = false,
  permissionsForModule,

  // More
  moreSearch,
  moreActions,
  children,

  // Các nút thường dùng
  isExport = false,
  onExport,
  onImport,
  onSyncUser,
  disableSynchronize = false,
  isSetting = false,
  onSetting,
  renderCustomActions,
  selected = [], // cho delete selected nếu cần

  // Advanced filter (nếu muốn mở rộng sau)
  disableBL = false,
  onOpenAdvancedFilter,
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <StyledToolbar>
      {/* ==================== LEFT: SEARCH + FILTER + DATE ==================== */}
      <ToolbarLeftContainer>
        <SearchContainer>
          <StyledSearchField
            variant="outlined"
            size="small"
            placeholder="Tìm kiếm..."
            value={inputValue}
            onChange={onInputChange}
            InputProps={{
              endAdornment: (
                <SearchAdornment>
                  {searchText && (
                    <IconButton
                      aria-label="clear search"
                      onClick={onClearSearch}
                      edge="end"
                      size="small"
                    >
                      <StyledClearIcon />
                    </IconButton>
                  )}
                </SearchAdornment>
              ),
            }}
          />

          {/* Bộ lọc cột */}
                  {/* Bộ lọc cột - Chỉ render khi filter được truyền và có dữ liệu */}
          {filter && Array.isArray(filter) && filter.length > 0 ? (
            <ClickAwayListener onClickAway={onFilterAway || (() => {})}>
              <Box>
                <StyledFilterButton onClick={onFilterToggle || (() => {})}>
                  <TuneIcon />
                </StyledFilterButton>

                {openFilter && (
                  <FilterBox>
                    {/* Header */}
                    <StyleBoxActionDropDown>
                      <span>Lọc tìm kiếm</span>
                      <Search />
                    </StyleBoxActionDropDown>

                    {/* Checkbox "Tất cả" - bảo vệ bằng optional chaining và fallback */}
                    <StyleActionCheckBox>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={
                              Array.isArray(tempSelectedColumns) &&
                              Array.isArray(filter) &&
                              tempSelectedColumns.length === filter.length
                            }
                            indeterminate={
                              Array.isArray(tempSelectedColumns) &&
                              Array.isArray(filter) &&
                              tempSelectedColumns.length > 0 &&
                              tempSelectedColumns.length < filter.length
                            }
                            onChange={typeof onSelectAllColumns === 'function' ? onSelectAllColumns : undefined}
                            size="small"
                          />
                        }
                        label="Tất cả"
                      />
                    </StyleActionCheckBox>

                    {/* Danh sách checkbox cột - bảo vệ bằng optional chaining */}
                    <StyleActionCellCheckBox>
                      {filter.map((column) => (
                        <FormControlLabel
                          key={column.code || column.name}
                          control={
                            <Checkbox
                              checked={
                                Array.isArray(tempSelectedColumns) &&
                                tempSelectedColumns.includes(column.name)
                              }
                              onChange={
                                typeof onColumnFilterChangeDirect === 'function'
                                  ? onColumnFilterChangeDirect(column.name)
                                  : undefined
                              }
                              size="small"
                            />
                          }
                          label={column.name}
                        />
                      ))}
                    </StyleActionCellCheckBox>

                    {/* Nút Hủy / Áp dụng */}
                    <StyleActionButton>
                      <StyleActionButtonCancel
                        onClick={typeof onFilterAway === 'function' ? onFilterAway : undefined}
                      >
                        Hủy
                      </StyleActionButtonCancel>
                      <StyleActionButtonApply
                        variant="contained"
                        onClick={typeof onApplyFilter === 'function' ? onApplyFilter : undefined}
                      >
                        Áp dụng
                      </StyleActionButtonApply>
                    </StyleActionButton>
                  </FilterBox>
                )}
              </Box>
            </ClickAwayListener>
          ) : null}

          {/* DatePicker đơn */}
          {anableDatePicker && !isSmallScreen && (
            <DatePickerBox>
              <DatePicker
                onChange={onDatePickerChange}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    size: "small",
                    placeholder: "Thời gian kiểm tra",
                  },
                }}
              />
            </DatePickerBox>
          )}

          {/* DateRangePicker */}
          {anableDateRangePicker && !isSmallScreen && (
            <DatePickerGrid>
              <ThemedDateRangePicker>
                <CustomDateRangePicker
                  start={dateRange?.startDate}
                  end={dateRange?.endDate}
                  onChange={onDateRangeChange}
                />
              </ThemedDateRangePicker>
            </DatePickerGrid>
          )}

          {/* Nút tìm kiếm */}
          <StyledSearchButton variant="contained" onClick={onSearchClick}>
            <Tooltip title="Tìm kiếm">
              <Search />
            </Tooltip>
          </StyledSearchButton>

          {/* Bộ lọc nâng cao (nếu cần) */}
          {disableBL && (
            <StyledButton variant="contained" onClick={onOpenAdvancedFilter}>
              <Tooltip title="Bộ lọc">
                <Dehaze />
              </Tooltip>
            </StyledButton>
          )}

          {/* More search (custom) */}
          {!isSmallScreen && moreSearch && <MoreSearchBox>{moreSearch()}</MoreSearchBox>}

          {/* Radio group (IMG/PDF...) */}
          {isRadio && (
            <RadioBox>
              {/* Bạn có thể truyền component RadioGroup từ ngoài nếu cần */}
            </RadioBox>
          )}
        </SearchContainer>
      </ToolbarLeftContainer>

      {/* ==================== RIGHT: ACTIONS ==================== */}
      <ActionsContainer styleJustifyContent={isSmallScreen ? "flex-end" : "flex-end"}>
        <ActionsBox>
          {isSmallScreen && selected.length > 0 ? (
            <StyleBoxActionsRespon>
              {renderCustomActions && renderCustomActions(selected)}
            </StyleBoxActionsRespon>
          ) : (
            <>
              {/* Nút Thêm mới */}
              {!disableAdd &&
                (permissionsForModule === null ||
                  permissionsForModule === "all" ||
                  (Array.isArray(permissionsForModule) &&
                    permissionsForModule.includes("add"))) && (
                  <StyledButton variant="contained" onClick={onAdd}>
                    <Tooltip title="Thêm mới">
                      <Add />
                    </Tooltip>
                  </StyledButton>
                )}

              {/* Import */}
              {onImport && (
                <StyledButton variant="contained" onClick={onImport}>
                  <Tooltip title="Import tài liệu giấy tờ">
                    <UploadIcon />
                  </Tooltip>
                </StyledButton>
              )}

              {/* Export */}
              {isExport && onExport && (
                <StyledButton variant="contained" onClick={onExport}>
                  <Tooltip title="Xuất file">
                    <DownloadIcon />
                  </Tooltip>
                </StyledButton>
              )}

              {/* Đồng bộ */}
              {!disableSynchronize && (
                <StyledButton variant="contained" onClick={onSyncUser || (() => {})}>
                  <Tooltip title="Đồng bộ">
                    <LoopOutlined />
                  </Tooltip>
                </StyledButton>
              )}

              {/* Cấu hình */}
              {isSetting && onSetting && (
                <StyledButton variant="contained" onClick={onSetting}>
                  <Tooltip title="Cấu hình">
                    <SettingsIcon />
                  </Tooltip>
                </StyledButton>
              )}

              {/* Custom actions từ ngoài truyền vào */}
              {renderCustomActions && renderCustomActions(selected)}

              {/* More actions (nếu có) */}
              {moreActions && moreActions()}
            </>
          )}
        </ActionsBox>

        {/* Children (có thể thêm các nút custom khác) */}
        {children}
      </ActionsContainer>
    </StyledToolbar>
  );
};

export default CustomTableToolbar;