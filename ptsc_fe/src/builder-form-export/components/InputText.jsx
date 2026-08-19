import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  Box,
  // Typography,
  IconButton,
  Collapse,
  Autocomplete,
  Tooltip,
  Grid2,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
} from "@mui/material";
// import SettingsIcon from "@mui/icons-material/Settings";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import CustomInput from "@components/CustomInput/CustomInput";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { WithController } from "@builder-form-export/hooks/WithController";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { getResult } from "@builder-form-export/utils/func";
import CustomAutocomplete from "@components/DynamicForm/CustomAutocomplete";

// import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useToast } from "@components/common/ToastProvider";
import {
  FieldActionsStack,
  ActionButtonsStack,
  ConfigIconButton,
  ActionInputStack,
  ActionInputTypography,
  ActionInputTypographyFiel,
  ActionInputSwapHorizIcon,
  ActionInputSettingsIcon,
} from "./InputText.styles";
import api from "@services/api";

function ConfigFileInput({ item, onPropChange }) {
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
              control={<Checkbox checked={item.props?.disabled} />}
              label="Chỉ đọc"
            />
          </FormGroup>
        </Grid2>
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
};

export const ConfigCollapse = ({ title, children }) => {
  const [showConfig, setShowConfig] = useState(false);

  const handleToggleConfig = () => {
    setShowConfig(!showConfig);
  };
  return (
    <>
      <ActionInputStack
        // direction="row"
        // alignItems="center"
        // justifyContent="space-between"
        mb={1}
      >
        <ActionInputTypography>{title}</ActionInputTypography>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton onClick={handleToggleConfig}>
            {showConfig ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
      </ActionInputStack>

      <Collapse in={showConfig}>{children}</Collapse>
    </>
  );
};
ConfigCollapse.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function ConfigCustomAutoComplete({ onPropChange, item }) {
  const handleSetConfig = (e, key) => {
    onPropChange(item.id, key, e.target.value);
  };

  const handleFetchApi = async () => {
    try {
      const res = await api.get(item.props?.url);
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
      logger.log(error);
    }
  };

  const handleSave = () => {
    handleFetchApi();
  };
  const handleUrlChange = (e) => {
    handleSetConfig(e, "url");
  };
  const handleFieldTargetChange = (e) => {
    handleSetConfig(e, "fieldTarget");
  };
  const handleFieldLabelChange = (e) => {
    handleSetConfig(e, "fieldLabel");
  };
  const handleFieldValueChange = (e) => {
    handleSetConfig(e, "fieldValue");
  };
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <Grid2 container spacing={2} py={2}>
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={handleUrlChange}
              value={item.props?.url}
              label="Nhập endpoint API"
              fullWidth
              size="small"
            />
          </Grid2>
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={handleFieldTargetChange}
              value={item.props?.fieldTarget}
              label="Cấu hình Responses"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình label */}
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={handleFieldLabelChange}
              value={item.props?.fieldLabel}
              label="Key cho Label"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình value */}
          <Grid2 size={{ sm: 6 }}>
            <CustomInput
              onChange={handleFieldValueChange}
              value={item.props?.fieldValue}
              label="Key cho Value"
              fullWidth
              size="small"
            />
          </Grid2>

          <Grid2 size={{ sm: 12 }}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled} />}
                label="Chỉ đọc"
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

ConfigCustomAutoComplete.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
};
function ConfigDatePicker({ item, onPropChange }) {
  const [config, setConfig] = useState({
    format: item.props?.format || "DD/MM/YYYY",
    defaultValue: item.props?.defaultValue || "",
  });

  const handleChange = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onPropChange(item.id, "format", config.format);
    onPropChange(item.id, "defaultValue", config.defaultValue);
  };

  const handleFormatChange = (e) => {
    handleChange("format", e.target.value);
  };

  const handleDefaultValueChange = (e) => {
    handleChange("defaultValue", e.target.value);
  };

  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <ConfigCollapse title="Cấu hình">
      <Grid2 container spacing={2} py={2}>
        <Grid2 xs={6}>
          <CustomInput
            onChange={handleFormatChange}
            value={config.format}
            label="Định dạng ngày (format)"
            fullWidth
            size="small"
          />
        </Grid2>
        <Grid2 xs={6}>
          <CustomInput
            onChange={handleDefaultValueChange}
            value={config.defaultValue}
            label="Giá trị mặc định (YYYY-MM-DD)"
            fullWidth
            size="small"
          />
        </Grid2>
        <Grid2 size={{ sm: 12 }}>
          <FormGroup>
            <FormControlLabel
              onChange={handleDisabledChange}
              control={<Checkbox checked={item.props?.disabled} />}
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
  );
}
ConfigDatePicker.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    props: PropTypes.object,
  }).isRequired,
  onPropChange: PropTypes.func.isRequired,
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
              control={<Checkbox checked={item.props?.disabled} />}
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

const CustomInputWithController = WithController(CustomInput);
const DatePickerWithController = WithController(DatePicker);
const CustomAutocompleteWithController = WithController((props) => {
  return (
    <Autocomplete
      {...props}
      renderInput={(params) => (
        <CustomInput
          {...params}
          label={props.label ?? ""}
          InputLabelProps={{ shrink: true }}
          size={props.size ?? "small"}
        />
      )}
    />
  );
});
const FileUploadWithController = WithController((props) => {
  const { onChange, value, label, disabled } = props;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange?.(file);
    }
  };

  return (
    <Box>
      <CustomInput
        label={label || "Chọn tệp"}
        value={value?.name || ""}
        fullWidth
        disabled={disabled}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <Button
              variant="outlined"
              component="label"
              disabled={disabled}
              size="small"
            >
              Tải lên
              <input type="file" hidden onChange={handleFileChange} />
            </Button>
          ),
        }}
      />
    </Box>
  );
});

function InputText({
  item,
  items,
  onPropChange,
  mode = "builder",
  error,
  helperText,
  // disabled,
  ...rest
}) {
  const selectedFieldName = item?.props?.field;
  const predefinedFields = useSelector(
    (state) => state.formDesign.dataFieldExport
  );
  const multiDynamicForm = useSelector(
    (state) => state.formDesign.multiDynamicForm
  );

  const selectedField = predefinedFields.find(
    (f) => f.name === selectedFieldName
  );
  const label = selectedField?.label || item?.props?.label || selectedFieldName;
  // const options = selectedField?.valueInput ?? [];

  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const toast = useToast();
  const handleShowFieldSelector = () => {
    setShowFieldSelector(true);
  };
  const handleToggleConfig = () => {
    setShowConfig(!showConfig);
  };

  useEffect(() => {
    setShowFieldSelector(!selectedField);
  }, [selectedField]);

  const handleFieldSelect = (newValue) => {
    const fieldName = newValue?.name || "";
    const fieldLabel = newValue?.label || "";

    const isExistField = items?.find(
      (item) => item?.props?.field === fieldName
    );

    // Nếu đã có field này rồi thì không làm gì
    if (isExistField) {
      toast("Trường này đã được chọn", "error");
      return;
    }

    onPropChange?.(item.id, "field", fieldName);
    onPropChange?.(item.id, "label", fieldLabel);
    setShowFieldSelector(false);
  };
  const renderConfig = () => {
    switch (selectedField?.type) {
      // case 'date':
      // 	return <ConfigDatePicker onPropChange={onPropChange} item={item} />;
      case "autocomplete":
        return (
          <ConfigCustomAutoComplete onPropChange={onPropChange} item={item} />
        );
      // default:
      // 	return <ConfigInputText onPropChange={onPropChange} item={item} />;
      default:
        return null;
    }
  };

  const renderInputComponent = () => {
    switch (selectedField?.type) {
      case "date":
        return (
          <DatePickerWithController
            label={label}
            selectedField={selectedField}
            item={item}
            onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            format={item.props?.format || "DD/MM/YYYY"}
            disabled={item.props?.disabled}
            slotProps={{ textField: { fullWidth: true } }}
            {...rest}
          />
        );
      case "autocomplete": {
        let dataOption = item.props?.options || [];

        // nếu có multiDynamicForm thì lọc option theo label
        if (multiDynamicForm && multiDynamicForm.length > 0) {
          dataOption = dataOption.filter((opt) =>
            multiDynamicForm.some(
              (m) => opt.value?.toLowerCase().includes(m.toLowerCase()) // so sánh theo tên
            )
          );
        }

        return (
          <CustomAutocompleteWithController
            label={label}
            selectedField={selectedField}
            item={item}
            mode={mode}
            error={error}
            helperText={helperText}
            options={dataOption} // <-- dùng options đã lọc
            disabled={item.props?.disabled}
            {...rest}
          />
        );
      }

      case "enum":
        return (
          <CustomAutocompleteWithController
            label={label}
            selectedField={selectedField}
            item={item}
            // onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            options={selectedField?.valueInput || []}
            disabled={item.props?.disabled}
            {...rest}
          />
        );

      case "file":
        return (
          <FileUploadWithController
            label={label}
            item={item}
            // onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled}
          />
        );
      default:
        return (
          <CustomInputWithController
            label={label}
            selectedField={selectedField}
            item={item}
            // onPropChange={onPropChange}
            mode={mode}
            error={error}
            helperText={helperText}
            disabled={item.props?.disabled}
            {...rest}
          />
        );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Chọn trường */}
        {mode === "builder" && (
          <Box mb={1}>
            {showFieldSelector ? (
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
            ) : (
              <FieldActionsStack direction="row">
                <ActionInputTypographyFiel>
                  Trường: <strong>{selectedField?.label || "Không có"}</strong>
                </ActionInputTypographyFiel>
                <ActionButtonsStack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={handleShowFieldSelector}
                    title="Đổi trường"
                  >
                    <ActionInputSwapHorizIcon />
                  </IconButton>
                  {/* Icon mở config */}
                  <ConfigIconButton
                    size="small"
                    onClick={handleToggleConfig}
                    title="Cấu hình"
                    isopen={showConfig}
                  >
                    <ActionInputSettingsIcon />
                  </ConfigIconButton>
                </ActionButtonsStack>
              </FieldActionsStack>
            )}
          </Box>
        )}

        {(mode === "runtime" || selectedField?.name) && renderInputComponent()}

        <Collapse in={showConfig && mode === "builder"} unmountOnExit>
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
};

export default InputText;
