import React, { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  Box,
  // Typography,
  IconButton,
  Collapse,
  Tooltip,
  Grid2,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  Select,
  Button,
  MenuItem,
  debounce,
  InputLabel,
} from "@mui/material";
// import SettingsIcon from "@mui/icons-material/Settings";

import {
  ConfigConstraintBox,
  ConstraintFormControl,
  ConstraintInput,
  ConfigCollapseContainer,
  ConfigBox,
  DirectionBox,
  DirectionSelect,
  AddOptionBox,
  AddOptionButton,
  OptionsListBox,
  OptionItem,
  OptionLabel,
  OptionTypography,
  DeleteOptionButton,
  FieldSelectorBox,
  FieldActionsStack,
  ConfigIconButton,
  FieldTypography,
  FieldTypographyCH,
  FieldSwapHorizIcon,
  FieldSettingsIcon,
} from "./InputText.styles";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import CustomInput from "@components/CustomInput/CustomInput";

import { WithController } from "@builder-form/hooks/WithController";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { getResult } from "@builder-form/utils/func";
import CustomAutocomplete from "@components/DynamicForm/CustomAutocomplete";

// import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useToast } from "@components/common/ToastProvider";

import DatePickerFinput from "./Input/DatePickerFinput";
import AutocompleteFinput from "./Input/AutocompleteFinput";
import FileUpload from "./Input/FileUpload";
import CheckBoxFinput from "./Input/CheckBoxFinput";
import TableCheckbox from "./Input/TableCheckbox";


import DateTimePickerInput from "./Input/DateTimePicker";
import CustomTimePicker from "./Input/TimePicker";
import { callApi } from "@services/api";
import { FormTypeContext } from "@builder-form/context/FormTypeContext";
import RadioFinput from "./Input/RadioFinput";
import ExtractUserFinput from "./Input/ExtractUserFinput";
import FileDownload from "./Input/FileDownload";
import NextHandlers from "./Input/NextHandlers";
import DynamicFormList from "./Input/DynamicFormList";

function ConfigDisplayConstraint({ item, onPropChange, predefinedFields, fieldName }) {
  const fieldObj = predefinedFields?.find(f => f.name === item.props?.displayConstraintField);
  logger.log("🚀 ~ ConfigDisplayConstraint ~ fieldObj:", fieldObj);
  const valueOptions = fieldObj?.valueInput || [];
  const isManualInputType = ["radio", "text"].includes(fieldObj?.type);

  const handleFieldChange = (e) => {
    onPropChange(item.id, "displayConstraintField", e.target.value);
    onPropChange(item.id, "bound", e.target.value);

    onPropChange(item.id, "boundField", {
      ...item.props?.boundField,
      [fieldName]: { value: "", boundBy: null }
    });
  };

  const handleValueChange = (e) => {
    onPropChange(item.id, "boundField", {
      ...item.props?.boundField,
      [fieldName]: { value: e.target.value, boundBy: fieldObj.name || null }
    });
  };

  const handleModeChange = (e) => {
    onPropChange(item.id, "boundType", e.target.value);
  };

  return (
    <ConfigCollapse title="Cấu hình ràng buộc hiển thị">
      <ConfigConstraintBox>
        {/* Select field */}
        <ConstraintFormControl size="small">
          <FieldTypography variant="caption" mb={0.5}>Thuộc tính ràng buộc</FieldTypography>
          <Select
            value={item.props?.displayConstraintField || ""}
            label="Thuộc tính ràng buộc"
            onChange={handleFieldChange}
          >
            {predefinedFields?.map((f) => (
              <MenuItem key={f.name} value={f.name}>
                {f.label || f.name}
              </MenuItem>
            ))}
          </Select>
        </ConstraintFormControl>

        {/* Select / input value */}
        {isManualInputType ? (
          <ConstraintFormControl size="small">
            <FieldTypography variant="caption" mb={0.5}>Chọn giá trị</FieldTypography>
            <Box>
              <ConstraintInput
                type="text"
                value={item.props?.boundField?.[fieldName]?.value || ""}
                onChange={handleValueChange}
                placeholder="Chọn giá trị"
              />
            </Box>
          </ConstraintFormControl>
        ) : (
          <ConstraintFormControl size="small">
            <FieldTypography variant="caption" mb={0.5}>Nhập giá trị</FieldTypography>
            <Select
              value={item.props?.boundField?.[fieldName]?.value || ""}
              label="Nhập giá trị"
              onChange={handleValueChange}
              disabled={!item.props?.displayConstraintField || !valueOptions.length}
            >
              {valueOptions.map((v, idx) => (
                <MenuItem key={v.value || v.label || idx} value={v.value}>
                  {v.label || v.value}
                </MenuItem>
              ))}
            </Select>
          </ConstraintFormControl>
        )}

        {/* Select hiển thị/ẩn */}
        <ConstraintFormControl size="small">
          <FieldTypography variant="caption" mb={0.5}>Kiểu hiển thị</FieldTypography>
          <Select
            value={item.props?.displayConstraintMode || "hidden"}
            label="Kiểu hiển thị"
            onChange={handleModeChange}
          >
            <MenuItem value="hidden">Ẩn</MenuItem>
            <MenuItem value="disabled">Disabled</MenuItem>
          </Select>
        </ConstraintFormControl>
      </ConfigConstraintBox>
    </ConfigCollapse>
  );
}

ConfigDisplayConstraint.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
  predefinedFields: PropTypes.array.isRequired,
  fieldName: PropTypes.string.isRequired,
};

function ConfigFileInput({ item, onPropChange, predefinedFields }) {
  const predefinedFieldsFilter =
    predefinedFields?.filter((e) => e.type === "text") || [];

  const selectedField = predefinedFieldsFilter.find(f => f.name === item.props?.signStatus);
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };
  const handleAllowSignChange = (e) => {
    onPropChange(item.id, "allowSign", e.target.checked);
  };


  // const autoFillField = item.props?.autoFillField || null;



  return (
    <ConfigCollapse title="Cấu hình">
      <Grid2 container spacing={2} pb={2}>
        {/* ✅ Checkbox chỉ đọc */}
        <Grid2 size={{ sm: 12 }}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={item.props?.disabled || false}
                  onChange={handleDisabledChange}
                />
              }
              label="Chỉ đọc"
            />
          </FormGroup>
        </Grid2>

        {/* ✅ Checkbox cho phép ký */}
        <Grid2 size={{ sm: 12 }}>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={item.props?.allowSign || false}
                  onChange={handleAllowSignChange}
                />
              }
              label="Cho phép ký số"
            />
          </FormGroup>
        </Grid2>

        {/* ✅ Autocomplete: chỉ chọn 1 trường */}
        {item.props?.allowSign && (
          <Grid2 size={{ sm: 12 }}>
            <CustomAutocomplete
              size="small"
              field={{
                value: selectedField || null,
                onChange: (v) => onPropChange(item.id, "signStatus", v.name),
              }}
              options={predefinedFieldsFilter}
              label="Chọn trường trạng thái"
              getOptionLabel={(option) => option.label || option.name}
              isOptionEqualToValue={(option, value) =>
                option?.name === value?.name
              }
              placeholder="Tìm kiếm trường..."
              multiple={false}
              disableClearable={false}
            />
          </Grid2>
        )}
      </Grid2>
    </ConfigCollapse>
  );
}



ConfigFileInput.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    props: PropTypes.object,
  }).isRequired,
  onPropChange: PropTypes.func.isRequired,
  predefinedFields: PropTypes.array.isRequired,
};

export const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);
  const handleToggleConfig = () => {
    setShowConfig(!showConfig);
  };
  return (
    <>
      <ConfigCollapseContainer>
        <FieldTypography>{title}</FieldTypography>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton  onClick={handleToggleConfig}>
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </ConfigCollapseContainer>

      <Collapse in={showConfig}>{children}</Collapse>
    </>
  );
};
ConfigCollapse.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function ConfigCustomAutoComplete({ onPropChange, item, predefinedFields }) {

  // 1. Tạo state cục bộ để quản lý giá trị input, tránh re-render không cần thiết
  const [localConfig, setLocalConfig] = useState({
    url: item.props?.url || "",
    fieldTarget: item.props?.fieldTarget || "",
    fieldLabel: item.props?.fieldLabel || "",
    fieldValue: item.props?.fieldValue || "",
  });

  const predefinedFieldsFilter = predefinedFields?.filter((e) => e.type === 'text') || [];
  const [autoFillFields, setAutoFillFields] = useState(item.props?.autoFillFields || []);

  // 2. Sử dụng debounce để trì hoãn việc gọi onPropChange
  const debouncedPropChange = useMemo(
    () => debounce((key, value) => {
      onPropChange(item.id, key, value);
    }, 500), // Delay 500ms
    [onPropChange, item.id]
  );

  const handleSetConfig = (e, key) => {
    const { value } = e.target;
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    debouncedPropChange(key, value);
  };

  const createSetConfigHandler = (key) => (e) => {
    handleSetConfig(e, key);
  };

  const handleAutoFillChange = (selectedOptions) => {
    const newAutoFillFields = selectedOptions.map(option => ({
      name: option.name,
      valueKey: option.name // Mặc định, có thể thay đổi nếu cần
    }));
    setAutoFillFields(newAutoFillFields);
    onPropChange(item.id, "autoFillFields", newAutoFillFields);
  };

  const handleFetchApi = async () => {
    try {
      // const res = await axios.get(item.props?.url);
      const res = await callApi('get', localConfig.url); // Sử dụng state cục bộ

      let result = getResult(res, item.props?.fieldTarget);

      if (Array.isArray(result)) {

        const mapped = result.map((r) => ({
          label: getResult(r, item.props?.fieldLabel) ?? r.label ?? "",
          value: getResult(r, item.props?.fieldValue) ?? r.value ?? "",
          ...r,
        }));
        onPropChange(item.id, "options", mapped);
      } else {
        onPropChange(item.id, "options", []);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      logger.log(error);
    }
  };

  const handleSave = () => {
    handleFetchApi();
  };

  useEffect(() => {
    if (item.props?.url) {
      handleFetchApi();
    }
  }, []);

  // Đồng bộ state cục bộ nếu props từ bên ngoài thay đổi
  useEffect(() => {
    setLocalConfig({
      url: item.props?.url || "",
      fieldTarget: item.props?.fieldTarget || "",
      fieldLabel: item.props?.fieldLabel || "",
      fieldValue: item.props?.fieldValue || "",
    });
  }, [item.props?.url, item.props?.fieldTarget, item.props?.fieldLabel, item.props?.fieldValue]);
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  const handleIsMultipleChange = (e) => {
    onPropChange(item.id, "isMultiple", e.target.checked);
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <Grid2 container spacing={2} py={2}>
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={createSetConfigHandler("url")}
              value={localConfig.url}
              label="Nhập endpoint API"
              fullWidth
              size="small"
            />
          </Grid2>
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={createSetConfigHandler("fieldTarget")}
              value={localConfig.fieldTarget}
              label="Cấu hình Responses"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình label */}
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={createSetConfigHandler("fieldLabel")}
              value={localConfig.fieldLabel}
              label="Key cho Label"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình value */}
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={createSetConfigHandler("fieldValue")}
              value={localConfig.fieldValue}
              label="Key cho Value"
              fullWidth
              size="small"
            />
          </Grid2>
          <Grid2 size={{ sm: 12 }}>
            <CustomAutocomplete
              size="small"
              multiple
              field={{
                value: autoFillFields.map(f => predefinedFieldsFilter.find(p => p.name === f.name)).filter(Boolean),
                onChange: handleAutoFillChange,
              }}
              options={predefinedFieldsFilter}
              label="Chọn trường để tự động điền"
              getOptionLabel={(option) => option.label || option.name}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              placeholder="Tìm kiếm trường..."
            />
          </Grid2>

          <Grid2 size={{ sm: 12 }}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled || false} />}
                label="Chỉ đọc"
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
                onChange={handleIsMultipleChange}
                control={<Checkbox checked={item.props?.isMultiple || false} />}
                label="Cho phép chọn nhiều"
              />
            </FormGroup>
          </Grid2>
          <Grid2 xs={12}>
            <Button variant="contained" onClick={handleSave}>
              Lưu dữ liệu
            </Button>
          </Grid2>
        </Grid2>
      </ConfigCollapse>
    </>
  );
}

function ConfigFileDownload({ onPropChange, item }) {
  const [localUrl, setLocalUrl] = useState(item.props?.url || "");
  const toast = useToast();

  useEffect(() => {
    setLocalUrl(item.props?.url || "");
  }, [item.props?.url]);

  const handleUrlChange = (e) => {
    setLocalUrl(e.target.value);
  };

  const handleSave = () => {
    onPropChange(item.id, "url", localUrl);
    toast("Đã lưu Endpoint API", "success");
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <Grid2 container spacing={2} py={2}>
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={handleUrlChange}
              value={localUrl}
              label="Nhập endpoint API"
              fullWidth
              size="small"
            />
          </Grid2>
          <Grid2 xs={12}>
            <Button variant="contained" onClick={handleSave}>
              Lưu dữ liệu
            </Button>
          </Grid2>
        </Grid2>
      </ConfigCollapse>
    </>
  );
}

ConfigCustomAutoComplete.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
  predefinedFields: PropTypes.array,
};

ConfigFileDownload.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
};

function ConfigCustomAutoCompleteEnum({ onPropChange, item, predefinedFields }) {
  const predefinedFieldsFilter = predefinedFields?.filter((e) => e.type === 'text') || [];
  const [autoFillFields, setAutoFillFields] = useState(item.props?.autoFillFields || []);

  const handleAutoFillChange = (selectedOptions) => {
    const newAutoFillFields = selectedOptions.map(option => ({
      name: option.name,
      valueKey: option.name // Mặc định, có thể thay đổi nếu cần
    }));
    setAutoFillFields(newAutoFillFields);
    onPropChange(item.id, "autoFillFields", newAutoFillFields);
  };
    const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  const handleIsMultipleChange = (e) => {
    onPropChange(item.id, "isMultiple", e.target.checked);
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <Grid2 container spacing={2} py={2}>
          <Grid2 size={{ sm: 12 }}>
            <CustomAutocomplete
              size="small"
              multiple
              field={{
                value: autoFillFields.map(f => predefinedFieldsFilter.find(p => p.name === f.name)).filter(Boolean),
                onChange: handleAutoFillChange,
              }}
              options={predefinedFieldsFilter}
              label="Chọn trường để tự động điền"
              getOptionLabel={(option) => option.label || option.name}
              isOptionEqualToValue={(option, value) => option?.name === value?.name}
              placeholder="Tìm kiếm trường..."
            />
          </Grid2>
          <Grid2 size={{ sm: 12 }}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled || false} />}
                label="Chỉ đọc"
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
               onChange={handleIsMultipleChange}
                control={<Checkbox checked={item.props?.isMultiple || false} />}
                label="Cho phép chọn nhiều"
              />
            </FormGroup>
          </Grid2>

        </Grid2>
      </ConfigCollapse>
    </>
  );
}

ConfigCustomAutoCompleteEnum.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
  predefinedFields: PropTypes.array,
};
function ConfigDatePicker({ item, onPropChange, predefinedFields, fieldName }) {
  const [config, setConfig] = useState({
    format: item.props?.format || "DD/MM/YYYY",
    defaultValue: item.props?.defaultValue || "",
    pickerType: item.props?.pickerType || "date",
  });

  const handleChange = (key, value) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value };

      if (key === "pickerType") {
        switch (value) {
          case "date":
            newConfig.format = "DD/MM/YYYY";
            break;
          case "time":
            newConfig.format = "HH:mm";
            break;
          case "datetime":
            newConfig.format = "DD/MM/YYYY HH:mm";
            break;
          default:
            newConfig.format = "DD/MM/YYYY";
        }
      }
      return newConfig;
    });
  };

  const handleSave = () => {
    onPropChange(item.id, "format", config.format);
    onPropChange(item.id, "defaultValue", config.defaultValue);
    onPropChange(item.id, "pickerType", config.pickerType);
  };
  const createFieldChangeHandler = (field) => (e) => {
    handleChange(field, e.target.value);
  };
    const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };
  const handlePickerTypeChange = (e) => {
  handleChange("pickerType", e.target.value);
};


  return (
    <>
      <ConfigCollapse title="Cấu hình">
        <Grid2 container spacing={2} py={2}>
          <Grid2 size={{ sm: 6 }} xs={6}>
            <CustomInput
               onChange={createFieldChangeHandler("format")}
              value={config.format}
              label="Định dạng (format)"
              fullWidth
              size="small"
              disabled={true}
            />
          </Grid2>
          <Grid2 size={{ sm: 6 }} xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Loại chọn ngày</InputLabel>
              <Select
                value={config.pickerType}
                label="Loại chọn ngày"
                onChange={handlePickerTypeChange}
              >
                <MenuItem value="date">Ngày</MenuItem>
                <MenuItem value="time">Giờ</MenuItem>
                <MenuItem value="datetime">Ngày và Giờ</MenuItem>
              </Select>
            </FormControl>
          </Grid2>
          <Grid2 size={{ sm: 12 }}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled || false} />}
                label="Chỉ đọc"
              />
            </FormGroup>
          </Grid2>
          <Grid2 xs={12}>
            <Button variant="contained" onClick={handleSave}>
              Lưu cấu hình
            </Button>
          </Grid2>
        </Grid2>
      </ConfigCollapse>
      <ConfigDisplayConstraint item={item} onPropChange={onPropChange} predefinedFields={predefinedFields} fieldName={fieldName} />
    </>
  );
}
ConfigDatePicker.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    props: PropTypes.object,
  }).isRequired,
  onPropChange: PropTypes.func.isRequired,
  predefinedFields: PropTypes.array.isRequired,
  fieldName: PropTypes.string.isRequired,
};

function ConfigInputText({ item, onPropChange }) {
    const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <ConfigCollapse title="Cấu hình">
      <Grid2 container spacing={2} pb={2}>
        <Grid2 size={{ sm: 12 }}>
          <FormGroup>
            <FormControlLabel
               onChange={handleDisabledChange}
              control={<Checkbox checked={item.props?.disabled || false} />}
              label="Chỉ đọc"
            />
          </FormGroup>
        </Grid2>
      </Grid2>
    </ConfigCollapse>
  );
}
ConfigInputText.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    props: PropTypes.object,
  }).isRequired,
  onPropChange: PropTypes.func.isRequired,
};

function ConfigCheckbox({ item, onPropChange }) {
  const [newOption, setNewOption] = useState({ label: "", value: "" });

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) return;
    const updated = [...(item.props?.options || []), newOption];
    onPropChange(item.id, "options", updated);
    setNewOption({ label: "", value: "" });
  };

  // const handleRemoveOption = (idx) => {
  //   const updated = item.props?.options?.filter((_, i) => i !== idx) || [];
  //   onPropChange(item.id, "options", updated);
  // };

  // const createRemoveOptionHandler = (idx) => () => {
  //   handleRemoveOption(idx);
  // };

  const handleDirectionChange = (e) => {
    onPropChange(item.id, "checkboxDirection", e.target.value);
  };
  const handleNewOptionLabelChange = (e) => {
    setNewOption((prev) => ({ ...prev, label: e.target.value }));
  };
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };
  
  return (
    <ConfigCollapse title="Cấu hình Checkbox">
      <ConfigBox>
        <DirectionBox>
          <FieldTypographyCH>Hướng hiển thị</FieldTypographyCH>
          <DirectionSelect
            value={item.props?.checkboxDirection || "column"}
            onChange={handleDirectionChange}
            size="small"
          >
            <MenuItem value="row">Ngang</MenuItem>
            <MenuItem value="column">Dọc</MenuItem>
          </DirectionSelect>
        </DirectionBox>
        <AddOptionBox>
          <CustomInput
            value={newOption.label}
            onChange={handleNewOptionLabelChange}
            label="Label"
            size="small"
          />
          <CustomInput
            value={newOption.value}
            onChange={handleNewOptionLabelChange}
            label="Value"
            size="small"
          />
          <AddOptionButton variant="contained" onClick={handleAddOption}>
            Thêm
          </AddOptionButton>
        </AddOptionBox>
        <OptionsListBox>
          {item.props?.options?.map((opt, idx) => (
            <OptionItem
              key={idx}
              direction="row"
              // alignItems="center"
              spacing={2}
            >
              <OptionTypography>{opt.label} <OptionLabel>({opt.value})</OptionLabel></OptionTypography>
              <DeleteOptionButton
                // color="error"
                variant="outlined"
                size="small"
              >
                Xóa
              </DeleteOptionButton>
            </OptionItem>
          ))}
        </OptionsListBox>
        <FormGroup>
          <FormControlLabel
            control={<Checkbox checked={item.props?.disabled || false} />}
            onChange={handleDisabledChange}
            label="Chỉ đọc"
          />
        </FormGroup>
      </ConfigBox>
    </ConfigCollapse>
  );
}
ConfigCheckbox.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
};

function ConfigRadio({ item, onPropChange }) {
  const [newOption, setNewOption] = useState({ label: "", value: "" });

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) return;
    const updated = [...(item.props?.options || []), newOption];
    onPropChange(item.id, "options", updated);
    setNewOption({ label: "", value: "" });
  };

  const handleRemoveOption = (idx) => {
    const updated = item.props?.options?.filter((_, i) => i !== idx) || [];
    onPropChange(item.id, "options", updated);
  };

  const createRemoveOptionHandler = (idx) => () => {
    handleRemoveOption(idx);
  };

  const handleDirectionChange = (e) => {
    onPropChange(item.id, "radioDirection", e.target.value);
  };
  const handleNewOptionLabelChange = (e) => {
    setNewOption((prev) => ({ ...prev, label: e.target.value }));
  };
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <ConfigCollapse title="Cấu hình Radio">
      <ConfigBox>
        <DirectionBox>
          <FieldTypographyCH>Hướng hiển thị</FieldTypographyCH>
          <DirectionSelect
            value={item.props?.radioDirection || "column"}
            onChange={handleDirectionChange}
            size="small"
          >
            <MenuItem value="row">Ngang</MenuItem>
            <MenuItem value="column">Dọc</MenuItem>
          </DirectionSelect>
        </DirectionBox>
        <AddOptionBox>
          <CustomInput
            value={newOption.label}
            onChange={handleNewOptionLabelChange}
            label="Label"
            size="small"
          />
          <CustomInput
            value={newOption.value}
            onChange={handleNewOptionLabelChange}
            label="Value"
            size="small"
          />
          <AddOptionButton variant="contained" onClick={handleAddOption}>
            Thêm
          </AddOptionButton>
        </AddOptionBox>
        <OptionsListBox>
          {item.props?.options?.map((opt, idx) => (
            <OptionItem
              key={idx}
              direction="row"
              // alignItems="center"
              spacing={2}
            >
              <OptionTypography>{opt.label} <OptionLabel>({opt.value})</OptionLabel></OptionTypography>
              <DeleteOptionButton
                // color="error"
                variant="outlined"
                size="small"
                onClick={createRemoveOptionHandler(idx)}
              >
                Xóa
              </DeleteOptionButton>
            </OptionItem>
          ))}
        </OptionsListBox>
        <FormGroup>
          <FormControlLabel
            control={<Checkbox checked={item.props?.disabled || false} />}
            onChange={handleDisabledChange}
            label="Chỉ đọc"
          />
        </FormGroup>
      </ConfigBox>
    </ConfigCollapse>
  );
}
ConfigRadio.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func.isRequired,
};

const CustomInputWithController = WithController(CustomInput);
const DatePickerWithController = WithController(DatePickerFinput);
const DateTimePickerWithController = WithController(DateTimePickerInput);
const TimePickerWithController = WithController(CustomTimePicker);
const CustomAutocompleteWithController = WithController(AutocompleteFinput);
const FileUploadWithController = WithController(FileUpload);
const CheckboxWithController = WithController(CheckBoxFinput);
const TableCheckboxWithController = WithController(TableCheckbox);
const RadioWithController = WithController(RadioFinput);
const ExtractUserWithController = WithController(ExtractUserFinput);
const FileDownloadWithController = WithController(FileDownload);
const NextHandlersWithController = WithController(NextHandlers);
const DynamicFormListWithController = WithController(DynamicFormList);




function InputText({
  item,
  items,
  onPropChange,
  mode = 'builder',
  error,
  helperText,
  disabled,
  data,
  ...rest
}) {


  const formType = useContext(FormTypeContext);
  const selectedFieldName = item?.props?.field;


  const fieldValues = useSelector((state) => state.formDesign.fieldValues)
  // logger.log("🚀 ~ ConfigDisplayConstraint ~ fieldValues:", fieldValues)

  // logger.log("🚀 ~ InputText ~ item.props?.boundField:", item.props)
  const { dataField, dataFieldPopup, dataFieldExport, dataFormInTableInForm } = useSelector((state) => state.formDesign);

  const matchBound = useMemo(() => {
    const boundConfig = item.props?.boundField?.[selectedFieldName];
    if (!boundConfig) return false;

    const { boundBy, value } = boundConfig;
    return fieldValues[boundBy] === value;
  }, [fieldValues, item.props, selectedFieldName]);
  logger.log("🚀 ~ InputText ~ matchBound:", matchBound)


  const getPredefinedFields = (type) => {
    switch (type) {
      case "form":
        return dataField;
      case "form-popup":
        return dataFieldPopup;
      case "form-export":
        return dataFieldExport;
      case "form-table-in-form":
        return dataFormInTableInForm;
      default:
        return [];
    }
  }
  const predefinedFields = getPredefinedFields(formType);

  const selectedField = predefinedFields.find(f => f.name === selectedFieldName);

  const label = selectedField?.label || item?.props?.label || selectedFieldName;
  // const options = selectedField?.valueInput ?? [];

  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const toast = useToast();
  useEffect(() => {
    setShowFieldSelector(!selectedField);
  }, [selectedField]);

  const handleFieldSelect = (newValue) => {
    const fieldName = newValue?.name || "";

    const fieldLabel = newValue?.label || "";

    const isExistField = items?.find((item) => item?.props?.field === fieldName)

    if (isExistField) {
      toast('Trường này đã được chọn', 'error')
      return;
    }

    onPropChange?.(item.id, "field", fieldName, true);
    onPropChange?.(item.id, "label", fieldLabel);
    setShowFieldSelector(false);
  };
  const renderConfig = () => {
    switch (selectedField?.type) {
      case "date":
        return <ConfigDatePicker onPropChange={onPropChange} item={item} predefinedFields={predefinedFields} fieldName={selectedFieldName} />;
      case "autocomplete":
        return (
          <ConfigCustomAutoComplete onPropChange={onPropChange} item={item} fieldName={selectedFieldName} predefinedFields={predefinedFields} />
        );
      case "enum":
        return (
          <ConfigCustomAutoCompleteEnum onPropChange={onPropChange} item={item} fieldName={selectedFieldName} predefinedFields={predefinedFields} />
        )
      case "checkbox":
        return (
          <ConfigCheckbox onPropChange={onPropChange} item={item} fieldName={selectedFieldName} />
        );
      case "radio":
        return (
          <ConfigRadio onPropChange={onPropChange} item={item} fieldName={selectedFieldName} />
        );
      case "fileDownload":
        return (
          <ConfigFileDownload onPropChange={onPropChange} item={item} fieldName={selectedFieldName} />
        );
      case "file":
        return (
          <ConfigFileInput onPropChange={onPropChange} item={item} fieldName={selectedFieldName} predefinedFields={predefinedFields} />
        );
      default:
        return <ConfigInputText onPropChange={onPropChange} item={item} fieldName={selectedFieldName} />;
    }
  };

  const memoizedRenderInputComponent = React.useMemo(() => {
    // Định nghĩa props chuẩn hóa để tái sử dụng
    const normalizationProps = {
      onBlur: (e, field) => {
        // Chỉ trim() nếu giá trị là chuỗi
        if (typeof e.target.value === 'string') {
          const trimmedValue = e.target.value.trim();
          if (field.value !== trimmedValue) {
            field.onChange(trimmedValue);
          }
        }
        if (field.onBlur) {
          field.onBlur(e);
        }
      },
      onChange: (e, field) => {
        const val = e.target.value;
        // Chỉ chuẩn hóa nếu giá trị là chuỗi
        // const normalized = typeof val === 'string' ? val.replace(/^\s+/, "").replace(/\s{2,}/g, " ") : val;
        // field.onChange(normalized);
        if (typeof val === 'string') {
          const normalized = val.trimStart().replace(/\s{2,}/g, " ");
          field.onChange(normalized);
        } else {
          field.onChange(val);
        }
      },
    };
    switch (selectedField?.type) {
      case "date": {
        const basePickerProps = {
          label,
          selectedField,
          item,
          onPropChange,
          mode,
          error,
          helperText,
          disabled: item.props?.disabled || disabled,
          slotProps: { textField: { fullWidth: true } },
          ...normalizationProps, // Áp dụng cho Date/Time Pickers
        };

        const pickerType = item.props?.pickerType || "date";
        switch (pickerType) {
          case "datetime":
            return (
              <DateTimePickerWithController
                {...basePickerProps}
                format={item.props?.format}
                pickerType={pickerType}
                predefinedFields={predefinedFields}
              />
            );
          case "time":
            return (
              <TimePickerWithController
                {...basePickerProps}
                format={item.props?.format}
                predefinedFields={predefinedFields}
              />
            );
          case "date":
          default:
            return (
              <DatePickerWithController
                {...basePickerProps}
                format={item.props?.format || "DD/MM/YYYY"}
                predefinedFields={predefinedFields}
              />
            );
        }
      }
      case "autocomplete":
        return (
          <CustomAutocompleteWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            options={item.props?.options || []}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
            {...normalizationProps} // Áp dụng cho Autocomplete
          />
        );

      case "enum":
        return (
          <CustomAutocompleteWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            options={selectedField?.valueInput || []}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
            {...normalizationProps} // Áp dụng cho Autocomplete Enum
          />
        );

      case "file":
        return (
          <FileUploadWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        );
      case "fileDownload":
        return (
          <FileDownloadWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
          />
        );

      case "checkbox":
        return (
          <CheckboxWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        )
      case "table":
        return (
          <TableCheckboxWithController
            funcDataList={data?.funcDataList ?? []}
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        );
      case "radio":
        return (
          <RadioWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        )

      case "extractUser":
        return (
          <ExtractUserWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        )
      case "nextHandlers":
        return (
          <NextHandlersWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        )

      case "dynamicFormList":
        return (
          <DynamicFormListWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            predefinedFields={predefinedFields}
          />
        )

      default:
        return (
          <CustomInputWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled || disabled}
            {...normalizationProps}
            predefinedFields={predefinedFields}
            {...rest}
            type={selectedField?.type}
          />
        );
    }

  }, [selectedField, item, onPropChange, mode, error, helperText, disabled, label, rest, predefinedFields]);
  const handleOpenFieldSelector = () => {
    setShowFieldSelector(true);
  };
  const handleToggleConfig = () => {
    setShowConfig((prev) => !prev);
  };
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>

        {mode === "builder" && (
          <Box>
            {showFieldSelector ? (
              <FieldSelectorBox>
                <CustomAutocomplete
                size="small"
                field={{
                  value: selectedField || null,
                  onChange: handleFieldSelect,
                }}
                options={predefinedFields}
                label="Chọn trường"
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) =>
                  option?.name === value?.name
                }
                placeholder="Tìm kiếm trường..."
              />
              </FieldSelectorBox>
            ) : (
              <FieldActionsStack>
                {/* <Typography fontWeight={500}>
                  Trường: <strong>{selectedField?.label || "Không có"}</strong>
                </Typography> */}
                <FieldActionsStack>
                  <IconButton
                    size="small"
                    onClick={handleOpenFieldSelector}
                    title="Đổi trường"
                  >
                    <FieldSwapHorizIcon/>
                  </IconButton>

                  <ConfigIconButton
                    size="small"
                    onClick={handleToggleConfig}
                    title="Cấu hình"
                    isopen={showConfig}
                  >
                    <FieldSettingsIcon/>
                  </ConfigIconButton>
                </FieldActionsStack>
              </FieldActionsStack>
            )}
          </Box>
        )}

        {memoizedRenderInputComponent}

        <Collapse in={showConfig}>
          <Box>{renderConfig()}</Box>
        </Collapse>
      </Box>
    </LocalizationProvider>
  );
}

InputText.propTypes = {
  item: PropTypes.object.isRequired,
  onPropChange: PropTypes.func,
  mode: PropTypes.oneOf(["builder", "runtime"]),
  error: PropTypes.bool,
  helperText: PropTypes.string,
  data: PropTypes.any,
  disabled: PropTypes.bool,
  items: PropTypes.array,
};

export default InputText;
