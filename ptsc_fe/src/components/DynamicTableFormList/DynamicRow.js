import React, { useCallback, memo, useState, useEffect, useMemo } from "react";
import {
  Chip,
  Box,
  Checkbox,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  // FormControlLabel,
  Autocomplete,
  Dialog,
  TextField,
  // FormControl,
  // InputLabel,
  Tooltip,
  FormHelperText,
} from "@mui/material"; // eslint-disable-line
import PropTypes from "prop-types";
import { API_URL_LIST } from "@EnvironmentFile/constants/urlConfig";
import api from "@services/api";
// import { Tooltip, FormHelperText } from "@mui/material";
import {
  // DynamicButton,
  DynamicMenuItem,
  DynamicSelect,
  DynamicTableRow,
  DynamicTextField,
  FormControlLabelStyled,
  StyledBoxContainer,
  StyledGrids,
} from "@styles/DynamicTableCustom";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useToast } from "@components/common/ToastProvider";
import SaveAsIcon from "@mui/icons-material/SaveAs";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Controller, useWatch } from "react-hook-form";
import {
  // CheckboxGrid,
  ActionsCell,
  ActionsContainer,
  AdvancedOptionsCell,
  AddValueButton,
  ChipContainer,
  DefaultInputCell,
  EnumDialogErrorBox,
  EnumManagementDialog,
  DialogActionButton,
  EnumItemContainer,
  EnumItemTextField,
  FieldContainer,
  // FormFieldGrid,
  // FormFieldGridHalf,
  // FormFieldGridSmall,
  // IndexCell,
  // MarginSettingGrid,
  ErrorIconButton,
  SuccessDynamicButton,
  ErrorDynamicButton,
  IndexCell,
  // AddValueGrid,
  // AddGrid,
  StyledDialogTitleDynamicRow,
} from "@styles/DynamicRow.styles";
import { FullWidthGridItem } from "@styles/FormList.styles";
import CustomInput from "@components/CustomInput/CustomInput";
import CustomButton from "@components/CustomButton";
import PopupTableConfig from "./PopupTableConfig";

const marginOptions = [
  { text: "Căn trái", value: "left" },
  { text: "Căn giữa", value: "center" },
  { text: "Căn phải", value: "right" },
];

// Các mốc thời gian mặc định — tính động khi mở bảng (đầu mốc → cuối mốc theo lịch dương,
// riêng các mốc tháng mở rộng được tính tương đối từ hôm nay)
const timePresetOptions = [
  { value: "week", label: "Theo tuần" },
  { value: "month", label: "Theo tháng" },
  { value: "quarter", label: "Theo quý" },
  { value: "year", label: "Theo năm" },
  { value: "last2Months", label: "2 tháng gần nhất" },
  { value: "beforeAfter2Months", label: "2 tháng trước và sau" },
];

const DynamicRow = memo(
  ({
    row,
    index,
    // onRowChange,
    onDelete,
    disabled,
    // config,
    isInherited,
    control,
    errors,
    colSpan,
    setValue,
    watch,
    tableStyleOptions = {},
  }) => {
    // logger.log(row, "row");
    const toast = useToast();

    const rowErrors = useMemo(() => errors?.rows?.[index] || {}, [errors, index]);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);

    useEffect(() => {
      const advancedFields = [
        "minLength",
        "maxLength",
        "minValue",
        "maxValue",
        "ref",
        "format",
        "apiSource",
        "defaultTimePreset",
      ];
      const hasAdvancedError = advancedFields.some((field) => !!rowErrors[field]);
      if (hasAdvancedError) {
        setShowAdvanced(true);
      }
    }, [rowErrors]);
    const [validationErrors, setValidationErrors] = useState([]);
    const [deleteConfirm, setDeleteConfirm] = useState({
      open: false,
      index: null,
    });
    const [apiSources, setApiSources] = useState([]);
    const [localValues, setLocalValues] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [openTableConfig, setOpenTableConfig] = useState(false);
    const [dataTableConfig, setDataTableConfig] = useState([]);
    const type = useWatch({ control, name: `rows.${index}.type` });
    const advancedSearchEnabled = useWatch({ control, name: `rows.${index}.advancedSearch` });
    const timeDefaultEnabled = useWatch({ control, name: `rows.${index}.timeDeafultValue` });


    useEffect(() => {
      if (type === "dynamicFormList") setValue(`rows.${index}.name`, "$fnCode");
      if (type === "nextHandlers") setValue(`rows.${index}.name`, "$assignee");
    }, [type, index, setValue]);

    useEffect(() => {
      if (!advancedSearchEnabled) {
        setValue(`rows.${index}.advancedSearchOrder`, "");
      }
    }, [advancedSearchEnabled, index, setValue]);

    useEffect(() => {
      if (type !== "date") {
        setValue(`rows.${index}.timeDeafultValue`, false);
        setValue(`rows.${index}.defaultTimePreset`, "");
        setValue(`rows.${index}.isSingleDateSearch`, false);
      }
    }, [type, index, setValue]);

    useEffect(() => {
      if (!timeDefaultEnabled) {
        setValue(`rows.${index}.defaultTimePreset`, "");
      }
    }, [timeDefaultEnabled, index, setValue]);

    useEffect(() => {
      const fetchApiSources = async () => {
        if ((type === "autocomplete" || type === "searchPopup") && apiSources.length === 0) {
          try {
            const response = await api.get(API_URL_LIST);
            if (response.data && Array.isArray(response.data)) {
              setApiSources(response.data);
            }
          } catch (error) {
            toast("Không thể tải danh sách API!", "error");
          }
        }
      };
      fetchApiSources();
    }, [type, apiSources.length, toast]);

    const renderControllerField = (name, widthType, renderProps = {}) => (
      <Controller
        name={`rows.${index}.${name}`}
        control={control}
        render={({ field }) => (
          <>
            <FieldContainer>
              <DynamicTextField
                widthType={widthType}
                fullWidth
                size="small"
                {...field}
                {...renderProps}
                error={!!rowErrors[name]}
                disabled={
                  disabled ||
                  (isInherited && name !== "label") ||
                  (type === "dynamicFormList" && name === "name") ||
                  (type === "nextHandlers" && name === "name")
                }
              />
              {rowErrors[name] && (
                <FormHelperText error>
                  {rowErrors[name]?.message}
                </FormHelperText>
              )}
            </FieldContainer>
          </>
        )}
      />
    );

    const handleChipMouseDown = useCallback((e) => {
      e.stopPropagation();
    }, []);

    const handleAdvancedSearchOrderKeyDown = useCallback((e) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    }, []);

    const createHandleChipDelete = useCallback(
      (field) => (val) => {
        const newValue = field.value.filter((v) => v !== val);
        field.onChange(newValue);
      },
      []
    );

    const renderSelectField = (name, options, multiple = false, extraOnChange = null) => (
      <Controller
        name={`rows.${index}.${name}`}
        control={control}
        render={({ field }) => {
          const handleChipDelete = createHandleChipDelete(field);
          const handleChange = (event) => {
            field.onChange(event);
            if (extraOnChange) {
              extraOnChange(event.target.value);
            }
          };
          return (
            <>
              <DynamicSelect
                fullWidth
                size="small"
                multiple={multiple}
                {...field}
                onChange={handleChange}
                value={field.value || (multiple ? [] : "")}
                disabled={disabled || isInherited} // Selects are always disabled when inherited
                error={!!rowErrors[name]}
                renderValue={(selected) => {
                  if (!multiple) {
                    return (
                      options.find((opt) => opt.value === selected)?.label || ""
                    );
                  }
                  const maxDisplay = 3;
                  const extraCount = selected.length - maxDisplay;

                  return (
                    <ChipContainer>
                      {selected.slice(0, maxDisplay).map((val) => {
                        const item = options.find((opt) => opt.value === val);
                        return (
                          <Chip
                            key={val}
                            size="small"
                            label={item?.label || val}
                            // onMouseDown={(e) => e.stopPropagation()}
                            // onDelete={() => {
                            //   const newValue = field.value.filter(
                            //     (v) => v !== val
                            //   );
                            //   field.onChange(newValue); // Directly use field.onChange
                            // }}
                            onMouseDown={handleChipMouseDown}
                            onDelete={handleChipDelete(val)}
                          />
                        );
                      })}
                      {extraCount > 0 && (
                        <Chip size="small" label={`+${extraCount}`} />
                      )}
                    </ChipContainer>
                  );
                }}
              >
                {options.map(({ value, label }) => (
                  <DynamicMenuItem
                    key={value}
                    value={value}
                    disabled={disabled}
                  >
                    {label}
                  </DynamicMenuItem>
                ))}
              </DynamicSelect>
              {rowErrors[name] && (
                <FormHelperText error>
                  {rowErrors[name]?.message}
                </FormHelperText>
              )}
            </>
          );
        }}
      />
    );

    // Trong component cha, bên trên return
    const handleEnumItemChange = useCallback(
      (idx) => (e) => {
        let val = e.target.value;

        // Không cho phép khoảng trắng đầu
        if (val.startsWith(" ")) val = val.trimStart();
        // Không cho phép nhiều khoảng trắng liên tiếp
        val = val.replace(/\s{2,}/g, " ");
        if (val.length > 50) val = val.slice(0, 50);

        const newValues = [...(localValues || [])];
        newValues[idx] = {
          ...newValues[idx],
          value: val,
        };
        setLocalValues(newValues);

        // Clear lỗi khi user sửa
        if (validationErrors[idx]) {
          const newErrors = [...validationErrors];
          newErrors[idx] = {
            ...newErrors[idx],
            value: "",
          };
          setValidationErrors(newErrors);
        }
      },
      [localValues, validationErrors]
    );

    // Trong component cha
    const handleEnumLabelChange = useCallback(
      (idx) => (e) => {
        let val = e.target.value;

        // Không cho phép khoảng trắng đầu
        if (val.startsWith(" ")) val = val.trimStart();

        // Không cho phép nhiều khoảng trắng liên tiếp
        val = val.replace(/\s{2,}/g, " ");

        // Giới hạn tối đa 157 ký tự
        if (val.length > 157) val = val.slice(0, 157);

        const newValues = [...(localValues || [])];
        newValues[idx] = {
          ...newValues[idx],
          label: val,
        };
        setLocalValues(newValues);

        // Clear lỗi khi user sửa
        if (validationErrors[idx]) {
          const newErrors = [...validationErrors];
          newErrors[idx] = {
            ...newErrors[idx],
            label: "",
          };
          setValidationErrors(newErrors);
        }
      },
      [localValues, validationErrors]
    );

    const handleDeleteClick = useCallback((e) => {
      const idx = Number(e.currentTarget.dataset.index);
      setDeleteConfirm({ open: true, index: idx });
    }, []);

    const handleAddValue = useCallback(() => {
      setLocalValues([...(localValues || []), { value: "", label: "" }]);
    }, [localValues]);

    const handleCloseDeleteConfirm = useCallback(() => {
      setDeleteConfirm({ open: false, index: null });
    }, []);

    const handleDelete = () => {
      onDelete(index);
    };

    const handleOpenCategoryDialog = () => {
      // Khi mở dialog, sao chép giá trị từ form vào state tạm
      setLocalValues(JSON.parse(JSON.stringify(row.valueInput || [])));
      setCategoryDialogOpen(true);
    };

    const handleToggleAdvanced = () => {
      setShowAdvanced(!showAdvanced);
    };

    const crmSource = JSON.parse(localStorage.getItem("crmSource") || "[]");
    const optionCatalog = Array.isArray(crmSource)
      ? crmSource.map((item) => {
        return {
          value: item?.code ?? "",
          // title: `${item?.originalName ?? ""} - ${item?.code ?? ""}`,
          title: `${item?.title ?? ""} - ${item?.code ?? ""}`,
        };
      })
      : [];

    const handleOpenTableConfig = () => {
      setOpenTableConfig(true);
    };

    const handleCloseTableConfig = () => {
      setOpenTableConfig(false);
    };

    const handleSaveTableConfig = useCallback((configData) => {
      setDataTableConfig(configData);
      setValue(`rows.${index}.tableConfig`, configData);
    }, [index, setValue]);


    const {
      inheritRowBackground = false,
      showCellBorder = false,
      dangerDeleteAction = false,
    } = tableStyleOptions;

    return (
      <>
        <DynamicTableRow
          key={row.id}
          index={index}
          inheritRowBackground={inheritRowBackground}
        >
          <IndexCell showCellBorder={showCellBorder}>{index + 1}</IndexCell>
          <DefaultInputCell showCellBorder={showCellBorder}>{renderControllerField("label")}</DefaultInputCell>
          <DefaultInputCell showCellBorder={showCellBorder}>{renderControllerField("name")}</DefaultInputCell>
          <DefaultInputCell showCellBorder={showCellBorder}>
            {renderSelectField(
              "type",
              [
                { value: "text", label: "Chữ" },
                { value: "number", label: "Số" },
                { value: "autocomplete", label: "Danh mục (API)" },
                { value: "enum", label: "Danh mục" },
                { value: "date", label: "Ngày tháng" },
                { value: "datetime", label: "Ngày tháng giờ" },
                { value: "file", label: "Tệp đính kèm" },
                { value: "checkbox", label: "Checkbox" },
                { value: "table", label: "Bảng" },
                { value: "radio", label: "Radio" },
                { value: "extractUser", label: "Trích xuất thông tin đăng nhập" },
                {
                  value: "nextHandlers",
                  label: "Danh mục người dùng xử lý tiếp",
                },
                { value: "dynamicFormList", label: "Danh mục form động" },
                { value: "form", label: "Form" },
                { value: "fileDownload", label: "Tải tệp mẫu" },
                { value: "ref", label: "Tham chiếu tới quy trình" },
                { value: "optionMaHoSo", label: "List Mã hồ sơ" },
                { value: "multiSelect", label: "Danh mục (nhiều lựa chọn)" },
                { value: "searchPopup", label: "Tìm kiếm popup (API)" },
                { value: "filterCalendar", label: "Lọc lịch chọn" },
                { value: "popupTable", label: "Chọn popup" },
                { value: "numberRange", label: "Khoảng số" },
              ],
              false,
              (value) => {
                if (value !== "filterCalendar") {
                  setValue(`rows.${index}.showFilterCalendar`, false);
                }
              }
            )}
          </DefaultInputCell>

          {(row.type === "enum" || row.type === "multiSelect") && (
            <Controller
              name={`rows.${index}.valueInput`}
              control={control}
              render={({ field }) => {
                // Hàm validate và cập nhật errors
                const validateItems = (values) => {
                  const errors = [];

                  (values || []).forEach((item, idx) => {
                    const itemErrors = {};

                    // Validate value
                    if (!item.value || item.value.trim() === "") {
                      itemErrors.value = "Giá trị không được để trống";
                    } else if (item.value.length > 50) {
                      itemErrors.value = "Giá trị không được vượt quá 50 ký tự";
                    } else {
                      // Check duplicate
                      const isDuplicate = values.some(
                        (otherItem, otherIdx) =>
                          otherItem.value === item.value && idx !== otherIdx
                      );
                      if (isDuplicate) {
                        itemErrors.value = "Giá trị đã tồn tại!";
                      }
                    }

                    // Validate label
                    if (!item.label || item.label.trim() === "") {
                      itemErrors.label = "Tên hiển thị không được để trống";
                    } else if (item.label.length > 156) {
                      itemErrors.label =
                        "Tên hiển thị không được vượt quá 156 ký tự";
                    }

                    errors[idx] = itemErrors;
                  });

                  return errors;
                };
                const handleSaveDialog = () => {
                  const values = localValues || [];
                  // Validate tất cả items
                  const errors = validateItems(values);
                  const hasError = errors.some((err) => err.value || err.label);

                  if (hasError) {
                    setValidationErrors(errors);
                    return;
                  }
                  setValidationErrors([]);
                  field.onChange(localValues); // Cập nhật vào form state khi lưu
                  setCategoryDialogOpen(false);
                  toast("Lưu danh mục thành công!", "success");
                };

                const handleCancelDialog = () => {
                  setValidationErrors([]);
                  setLocalValues(field.value || []);
                  setCategoryDialogOpen(false);
                };

                const handleCancelDelete = () => {
                  setDeleteConfirm({ open: false, index: null });
                };

                // ✅ Handler để xác nhận xóa
                const handleConfirmDelete = () => {
                  const newValues = (localValues || []).filter(
                    (_, i) => i !== deleteConfirm.index
                  );
                  setLocalValues(newValues);
                  const newErrors = validationErrors.filter(
                    (_, i) => i !== deleteConfirm.index
                  );
                  setValidationErrors(newErrors);
                  setDeleteConfirm({ open: false, index: null });
                };

                const handleSelectCatalog = (fieldOnChange) => (event) => {
                  fieldOnChange(event);
                  const found = crmSource.find(
                    (item) => item.code === event
                  );
                  if (found && Array.isArray(found.data)) {
                    const mappedValues = found.data.map((d) => ({
                      value: d.value,
                      label: d.title,
                    }));
                    setLocalValues(mappedValues);
                  } else {
                    setLocalValues([]);
                  }
                };

                return (
                  <EnumManagementDialog open={categoryDialogOpen} fullWidth>
                    <StyledDialogTitleDynamicRow>
                      <Box>Quản lý danh mục</Box>
                      <FullWidthGridItem item styleMaxWidth="65%">
                        <Controller
                          name="Kế thừa danh mục"
                          control={control}
                          render={({ field }) => (
                            <CustomInput
                              select
                              options={optionCatalog}
                              label="Kế thừa danh mục"
                              {...field}
                              onChange={handleSelectCatalog(field.onChange)}
                            />
                          )}
                        />
                      </FullWidthGridItem>
                    </StyledDialogTitleDynamicRow>

                    <DialogContent>
                      {/* Hiển thị lỗi chung */}
                      {validationErrors[0]?.general && (
                        <EnumDialogErrorBox>
                          {validationErrors[0].general}
                        </EnumDialogErrorBox>
                      )}

                      {(localValues || []).map((item, idx) => {
                        const itemErrors = validationErrors[idx] || {};

                        return (
                          <EnumItemContainer key={idx}>
                            <EnumItemTextField
                              label="Giá trị"
                              placeholder="Giá trị"
                              value={item.value}
                              required
                              inputProps={{ maxLength: 50 }}
                              error={
                                // eslint-disable-line
                                !!itemErrors.value || item.value?.length > 50
                              }
                              helperText={
                                item.value?.length > 50
                                  ? "Độ dài không được vượt quá 50 ký tự!"
                                  : itemErrors.value || ""
                              }
                              onChange={handleEnumItemChange(idx)}
                            />

                            <EnumItemTextField
                              label="Tên hiển thị"
                              placeholder="Tên hiển thị"
                              required
                              inputProps={{ maxLength: 157 }}
                              value={item.label}
                              error={!!itemErrors.label} // eslint-disable-line
                              helperText={itemErrors.label || ""}
                              onChange={handleEnumLabelChange(idx)}
                            />

                            <Tooltip title="Xóa giá trị">
                              <ErrorIconButton
                                onClick={handleDeleteClick}
                                data-index={idx}
                              >
                                <DeleteOutlineIcon />
                              </ErrorIconButton>
                            </Tooltip>
                          </EnumItemContainer>
                        );
                      })}

                      <AddValueButton onClick={handleAddValue}>
                        + Thêm giá trị
                      </AddValueButton>
                    </DialogContent>

                    <DialogActions>
                      <DialogActionButton isPrimary onClick={handleSaveDialog}>
                        Lưu
                      </DialogActionButton>
                      <DialogActionButton isCancel onClick={handleCancelDialog}>
                        Hủy
                      </DialogActionButton>
                    </DialogActions>
                    <Dialog
                      open={deleteConfirm.open}
                      onClose={handleCloseDeleteConfirm}
                    >
                      <DialogTitle>Xác nhận xóa</DialogTitle>
                      <DialogContent>
                        Bạn có chắc chắn muốn xóa giá trị này không?
                      </DialogContent>
                      <DialogActions>
                        <DialogActionButton
                          onClick={handleConfirmDelete}
                          isError
                        >
                          Xóa
                        </DialogActionButton>
                        <DialogActionButton isCancel onClick={handleCancelDelete}>
                          Hủy
                        </DialogActionButton>
                      </DialogActions>
                    </Dialog>
                  </EnumManagementDialog>
                );
              }}
            />
          )}
          <ActionsCell showCellBorder={showCellBorder}>
            <ActionsContainer>
              {!disabled && !isInherited && (
                <>
                  <Tooltip title="Xóa">
                    <ErrorDynamicButton
                      dangerFilled={dangerDeleteAction}
                      // onClick={() => onDelete(index)}
                      onClick={handleDelete}
                    >
                      <DeleteOutlineIcon />
                    </ErrorDynamicButton>
                  </Tooltip>
                  {(row.type === "enum" || row.type === "multiSelect") && (
                    <Tooltip title="Quản lý danh mục">
                      <SuccessDynamicButton
                        // onClick={() => {
                        //   // Khi mở dialog, sao chép giá trị từ form vào state tạm
                        //   setLocalValues(
                        //     JSON.parse(JSON.stringify(row.valueInput || []))
                        //   );
                        //   setCategoryDialogOpen(true);
                        // }}
                        onClick={handleOpenCategoryDialog}
                      >
                        <SaveAsIcon />
                      </SuccessDynamicButton>
                    </Tooltip>
                  )}
                </>
              )}
              <Tooltip
                title={showAdvanced ? "Ẩn tùy chọn" : "Hiển thị tùy chọn"}
              >
                <IconButton
                  size="small"
                  // onClick={() => setShowAdvanced(!showAdvanced)}
                  onClick={handleToggleAdvanced}
                >
                  {showAdvanced ? (
                    <KeyboardArrowUpIcon />
                  ) : (
                    <KeyboardArrowDownIcon />
                  )}
                </IconButton>
              </Tooltip>
            </ActionsContainer>
          </ActionsCell>
        </DynamicTableRow>
        {showAdvanced && (
          <DynamicTableRow inheritRowBackground={inheritRowBackground}>
            <AdvancedOptionsCell colSpan={colSpan} showCellBorder={showCellBorder}>
              {/* LÙI VÀO ĐÚNG 52px ĐỂ RỘNG BẰNG 3 Ô CHÍNH Ở TRÊN */}
              <StyledBoxContainer >
                <Grid container spacing={3}>

                  {/* 1. Min / Max Length hoặc Min / Max Value */}
                  {(row.type === "text" || row.type === "number") && (
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                          {renderControllerField(
                            row.type === "text" ? "minLength" : "minValue",
                            "full",
                            {
                              label: row.type === "text" ? "Ký tự tối thiểu" : "Giá trị tối thiểu",
                              type: "number",
                            }
                          )}
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          {renderControllerField(
                            row.type === "text" ? "maxLength" : "maxValue",
                            "full",
                            {
                              label: row.type === "text" ? "Ký tự tối đa" : "Giá trị tối đa",
                              type: "number",
                            }
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  )}

                  {/* 2. Các field khác nếu có (ref, date, autocomplete…) */}
                  {row.type === "ref" && (
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          {renderControllerField("ref", "full", {
                            placeholder: "Biểu thức tham chiếu (tenmaquytrinh.mabothuoctinh.tencot)",
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  )}

                  {(row.type === "date" || row.type === "datetime") && (
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          {renderControllerField("format", "full", {
                            label: row.type === "date" ? "Định dạng ngày tháng" : "Định dạng ngày giờ",
                            placeholder: row.type === "date" ? "dd/mm/yyyy" : "dd/mm/yyyy HH:mm:ss",
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  )}

                  {row.type === "autocomplete" && (
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          <Controller
                            name={`rows.${index}.apiSource`}
                            control={control}
                            render={({ field }) => {
                              const selectedValue =
                                apiSources.find(
                                  (api) => api.path === field.value
                                ) || null;
                              const handleAutocompleteChange = (
                                event,
                                newValue
                              ) => {
                                field.onChange(newValue ? newValue.id : "");
                              };
                              const handleSearchChange = (e) => {
                                setSearchText(e.target.value);
                              };
                              return (
                                <Autocomplete
                                  {...field}
                                  fullWidth
                                  size="small"
                                  disabled={disabled}
                                  options={apiSources.map((api) => ({
                                    ...api,
                                    id: api.path,
                                  }))}
                                  value={selectedValue}
                                  filterOptions={(options) => {
                                    const searchTextLower =
                                      searchText.toLowerCase();
                                    return options.filter(
                                      (option) =>
                                        option.name
                                          ?.toLowerCase()
                                          .includes(searchTextLower) ||
                                        option.title
                                          ?.toLowerCase()
                                          .includes(searchTextLower) ||
                                        option.path
                                          ?.toLowerCase()
                                          .includes(searchTextLower)
                                    );
                                  }}
                                  // onChange={(event, newValue) => {
                                  //   field.onChange(newValue ? newValue.id : "");
                                  // }}
                                  onChange={handleAutocompleteChange}
                                  getOptionLabel={(option) => option.path || ""}
                                  isOptionEqualToValue={(option, value) =>
                                    option.id === value.id
                                  }
                                  renderOption={(props, option) => (
                                    <Box component="li" {...props} key={option.id}>
                                      {option.name || option.title || option.path} ({option.path}) -{" "}
                                      <strong>[{option.method}]</strong>
                                    </Box>
                                  )}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Danh sách API"
                                      placeholder="Tìm kiếm theo tên hoặc đường dẫn..."
                                      value={searchText}
                                      // onChange={(e) => setSearchText(e.target.value)}
                                      onChange={handleSearchChange}
                                    />
                                  )}
                                />
                              );
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}

                  {row.type === "searchPopup" || row.type === "popupTable" && (
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={8}>
                          <Controller
                            name={`rows.${index}.tableConfig`}
                            control={control}
                            render={({ field }) => {
                              const selectedValue =
                                apiSources.find(
                                  (api) => api.path === field.value
                                ) || null;
                              const handleAutocompleteChange = (
                                event,
                                newValue
                              ) => {
                                field.onChange(newValue ? newValue.id : "");
                              };
                              const handleSearchChange = (e) => {
                                setSearchText(e.target.value);
                              };
                              return (
                                <Grid container spacing={2}>
                                  <Grid item xs={8}>
                                    <Autocomplete
                                      {...field}
                                      fullWidth
                                      size="small"
                                      disabled={disabled}
                                      options={apiSources.map((api) => ({
                                        ...api,
                                        id: api.path,
                                      }))}
                                      value={selectedValue}
                                      filterOptions={(options) => {
                                        const searchTextLower =
                                          searchText.toLowerCase();
                                        return options.filter(
                                          (option) =>
                                            option.name
                                              ?.toLowerCase()
                                              .includes(searchTextLower) ||
                                            option.title
                                              ?.toLowerCase()
                                              .includes(searchTextLower) ||
                                            option.path
                                              ?.toLowerCase()
                                              .includes(searchTextLower)
                                        );
                                      }}
                                      // onChange={(event, newValue) => {
                                      //   field.onChange(newValue ? newValue.id : "");
                                      // }}
                                      onChange={handleAutocompleteChange}
                                      getOptionLabel={(option) => option.path || ""}
                                      isOptionEqualToValue={(option, value) =>
                                        option.id === value.id
                                      }
                                      renderOption={(props, option) => (
                                        <Box component="li" {...props} key={option.id}>
                                          {option.name || option.title || option.path} ({option.path}) -{" "}
                                          <strong>[{option.method}]</strong>
                                        </Box>
                                      )}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          label="Danh sách API"
                                          placeholder="Tìm kiếm theo tên hoặc đường dẫn..."
                                          value={searchText}
                                          // onChange={(e) => setSearchText(e.target.value)}
                                          onChange={handleSearchChange}
                                        />
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={4}>
                                    <CustomButton
                                      variant="contained"
                                      onClick={handleOpenTableConfig}
                                      fullWidth
                                    >
                                      Cấu hình bảng
                                    </CustomButton>
                                  </Grid>
                                </Grid>
                              );
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                  {/* Mốc thời gian mặc định — chỉ hiện với field date đã bật tìm kiếm thời gian mặc định.
                          Lưu loại preset (week/month/quarter/year), khoảng ngày được tính động khi mở bảng. */}
                  {row.type === "date" && timeDefaultEnabled && (
                  <Grid item xs={12} md={4}>
                      <FieldContainer>
                        {renderSelectField("defaultTimePreset", timePresetOptions)}
                      </FieldContainer>
                  </Grid>
                  )}
                  {/* 3. CHECKBOX – ĐẸP, ĐỀU, RỘNG ĐỦ */}
                  <Grid item xs={12}>
                    <StyledGrids >
                      <Controller
                        name={`rows.${index}.filter`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={<Checkbox {...field} checked={!!field.value} disabled={disabled || watch(`rows.${index}.advancedSearch`) || watch(`rows.${index}.searchInList`)} />}
                            label="Tìm kiếm"
                          />
                        )}
                      />

                      <Controller
                        name={`rows.${index}.advancedSearch`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={<Checkbox {...field} checked={!!field.value} disabled={disabled || watch(`rows.${index}.filter`) || watch(`rows.${index}.searchInList`)} />}
                            label="Tìm kiếm nâng cao"
                          />
                        )}
                      />
                      {advancedSearchEnabled && (
                        <Controller
                          name={`rows.${index}.advancedSearchOrder`}
                          control={control}
                          render={({ field }) => (
                            <FieldContainer>
                              <DynamicTextField
                                {...field}
                                type="number"
                                fullWidth
                                size="small"
                                label="Thứ tự hiển thị"
                                placeholder="Nhập thứ tự hiển thị"
                                disabled={disabled}
                                onKeyDown={handleAdvancedSearchOrderKeyDown}
                                error={!!rowErrors.advancedSearchOrder}
                              />
                              {rowErrors.advancedSearchOrder && (
                                <FormHelperText error>
                                  {rowErrors.advancedSearchOrder?.message}
                                </FormHelperText>
                              )}
                            </FieldContainer>
                          )}
                        />
                      )}
                      <Controller
                        name={`rows.${index}.searchInList`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={<Checkbox {...field} checked={!!field.value} disabled={disabled || watch(`rows.${index}.filter`) || watch(`rows.${index}.advancedSearch`)} />}
                            label="Tìm kiếm hiển thị ở danh sách"
                          />
                        )}
                      />
                      {row.type === "date" && (
                        <>
                          <Controller
                            name={`rows.${index}.timeDeafultValue`}
                            control={control}
                            render={({ field }) => (
                              <FormControlLabelStyled
                                control={<Checkbox {...field} checked={!!field.value} />}
                                label="Tìm kiếm thời gian mặc định (áp dụng cho trường ngày tháng, ngày tháng giờ)"
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${index}.isSingleDateSearch`}
                            control={control}
                            render={({ field }) => (
                              <FormControlLabelStyled
                                control={<Checkbox {...field} checked={!!field.value} />}
                                label="Hiển thị giao diện ô tìm kiếm đơn"
                              />
                            )}
                          />
                        </>
                      )}

                      <Controller
                        name={`rows.${index}.required`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
                            label="Bắt buộc"
                          />
                        )}
                      />
                      <Controller
                        name={`rows.${index}.showInList`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value || false}
                                disabled={disabled}
                              />
                            }
                            label="Hiển thị trong danh sách"
                          />
                        )}
                      />
                      <Controller
                        name={`rows.${index}.showMobile`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value || false}
                                disabled={disabled}
                              />
                            }
                            label="Hiển thị trên mobile"
                          />
                        )}
                      />
                      <Controller
                        name={`rows.${index}.hiddenInFlow`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabelStyled
                            control={
                              <Checkbox
                                {...field}
                                checked={field.value || false}
                                disabled={disabled}
                              />
                            }
                            label="Ẩn trong cấu hình"
                          />
                        )}
                      />
                      {(row.type === "text" || row.type === "date" || row.type === "datetime") && (
                        <Controller
                          name={`rows.${index}.spellcheck`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabelStyled
                              control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
                              label="Kiểm tra chính tả"
                            />
                          )}
                        />
                      )}

                      {row.type === "autocomplete" && (
                        <Controller
                          name={`rows.${index}.multiple`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabelStyled
                              control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
                              label="Chọn nhiều giá trị"
                            />
                          )}
                        />
                      )}

                      {row.type === "text" && (
                        <Controller
                          name={`rows.${index}.email`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabelStyled
                              control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
                              label="Cho phép nhập email"
                            />
                          )}
                        />
                      )}
                      {watch(`rows.${index}.filter`) && (
                        <Controller
                          name={`rows.${index}.hiddenInFilter`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabelStyled
                              control={<Checkbox {...field} checked={!!field.value} disabled={disabled} />}
                              label="Ẩn trong chọn trường tìm kiếm"
                            />
                          )}
                        />
                      )}
                      {row.type === "filterCalendar" && (
                        <Controller
                          name={`rows.${index}.showFilterCalendar`}
                          control={control}
                          render={({ field }) => (
                            <FormControlLabelStyled
                              control={
                                <Checkbox
                                  {...field}
                                  checked={!!field.value}
                                  disabled={disabled}
                                />
                              }
                              label="Hiển thị lọc lịch"
                            />
                          )}
                        />
                      )}
                    </StyledGrids>
                  </Grid>
                  <Grid item xs={12}>
                    {row.type === "text" && (
                      <Controller
                        name={`rows.${index}.margin`}
                        control={control}
                        render={({ field }) => {
                          const handleMarginChange = (e, newValue) => {
                            field.onChange(newValue?.value || "");
                          };
                          <Autocomplete
                            {...field}
                            disabled={disabled}
                            value={
                              marginOptions.find(
                                (opt) => opt.value === field.value
                              ) || null
                            }
                            // onChange={(e, newValue) =>
                            //   field.onChange(newValue?.value || "")
                            // }
                            onChange={handleMarginChange}
                            options={marginOptions}
                            getOptionLabel={(option) => option.text}
                            isOptionEqualToValue={(option, value) =>
                              option.value === value?.value
                            }
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Căn lề"
                                variant="outlined"
                              />
                            )}
                            fullWidth
                          />;
                        }}
                      />
                    )}
                  </Grid>

                </Grid>
              </StyledBoxContainer>
            </AdvancedOptionsCell>
          </DynamicTableRow>
        )}

        <PopupTableConfig
          open={openTableConfig}
          onClose={handleCloseTableConfig}
          title="Cấu hình bảng"
          data={handleSaveTableConfig}
          initialData={dataTableConfig}
          control={control}
          fieldName={`rows.${index}.tableConfig`}
        />


      </>
    );
  }
);

DynamicRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    code: PropTypes.string,
    type: PropTypes.string,
    ref: PropTypes.string,
    format: PropTypes.string,
    required: PropTypes.bool,
    spellcheck: PropTypes.bool,
    multiple: PropTypes.bool,
    filter: PropTypes.bool,
    searchable: PropTypes.bool,
    searchInList: PropTypes.bool,
    showInList: PropTypes.bool,
    showMobile: PropTypes.bool,
    hiddenInFlow: PropTypes.bool,
    advancedSearch: PropTypes.bool,
    advancedSearchOrder: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minLength: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxLength: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    email: PropTypes.bool,
    showFilterCalendar: PropTypes.bool,
    margin: PropTypes.bool,
    timeDeafultValue: PropTypes.bool,
    isSingleDateSearch: PropTypes.bool,
    defaultTimePreset: PropTypes.oneOf([
      "week",
      "month",
      "quarter",
      "year",
      "last2Months",
      "beforeAfter2Months",
      "",
    ]),
    valueInput: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.string,
        label: PropTypes.string,
      })
    ),
  }).isRequired,
  dataTableConfig: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string,
    })
  ),

  index: PropTypes.number.isRequired,
  onRowChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  config: PropTypes.object,
  isInherited: PropTypes.bool,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object,
  colSpan: PropTypes.number,
  searchInList: PropTypes.bool,
  tableStyleOptions: PropTypes.shape({
    inheritRowBackground: PropTypes.bool,
    showCellBorder: PropTypes.bool,
    dangerDeleteAction: PropTypes.bool,
  }),
  timeDeafultValue: PropTypes.bool,
};

DynamicRow.defaultProps = {
  disabled: false,
  config: {},
  errors: {},
  colSpan: 1,
  isInherited: false,
  tableStyleOptions: {
    inheritRowBackground: false,
    showCellBorder: false,
    dangerDeleteAction: false,
  },
};

DynamicRow.displayName = "DynamicRow";
export default DynamicRow;
