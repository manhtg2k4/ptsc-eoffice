import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import {
  // Stack,
  // Typography,
  IconButton,
  Collapse,
  Tooltip,
  Grid2,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Button,
  MenuItem,
  Box,
} from "@mui/material";
// import SettingsIcon from "@mui/icons-material/Settings";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import CustomInput from "@components/CustomInput/CustomInput";

import { WithController } from "@builder-popup/hooks/WithController";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { getResult } from "@builder-popup/utils/func";
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
import ExtractUserFinput from "./Input/ExtractUserFinput";
import NextHandlers from "./Input/NextHandlers";
import {
  ConfigCollapseContainer,
  ConfigBox,
  // DirectionBox,
  // DirectionSelect,
  AddOptionBox,
  AddOptionButton,
  OptionsListBox,
  OptionItem,
  OptionTypography,
  OptionLabel,
  DeleteOptionButton,
  FieldSelectorBox,
  FieldActionsStack,
  ActionButtonsStack,
  ConfigIconButton,
  ConfigGrid,
  SaveButtonGrid,
  DatePickerConfigGrid,
  SaveConfigButtonGrid,
  InputTextConfigGrid,
  SaveButtonTypography,
  SaveButtonSwapHorizIcon,
  SaveButtonSettingsIcon,
} from "./InputText.styles";

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
      <ConfigCollapseContainer>
        <SaveButtonTypography>{title}</SaveButtonTypography>
        <Tooltip title={showConfig ? "Ẩn cấu hình" : "Hiện cấu hình"}>
          <IconButton onClick={handleToggleConfig}>
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

function ConfigCustomAutoComplete({ onPropChange, item }) {
  const handleSetConfig = (e, key) => {
    onPropChange(item.id, key, e.target.value);
  };

  const handleFetchApi = async () => {
    try {
      // const res = await axios.get(item.props?.url);
      const res = await callApi('get', item.props?.url);

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
  const handleUrlChange = (e) => {
    handleSetConfig(e, "url");
  };
  const handleFieldTargetChange = (e) => {
    handleSetConfig(e, "fieldTarget");
  };
  const handleFieldValueChange = (e) => {
    handleSetConfig(e, "fieldValue");
  };

  const handleFieldLabelChange = (e) => {
    handleSetConfig(e, "fieldLabel");
  };
  const handleIsMultipleChange = (e) => {
    onPropChange(item.id, "isMultiple", e.target.checked);
  };

  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <ConfigGrid container spacing={2}>
          <Grid2 size={{ sm: 6 }} xs={12}>
            <CustomInput
              onChange={handleUrlChange}
              value={item.props?.url}
              label="Nhập endpoint API"
              fullWidth
              size="small"
            />
          </Grid2>
          <Grid2 size={{ sm: 6 }} xs={12}>
            <CustomInput
              onChange={handleFieldTargetChange}
              value={item.props?.fieldTarget}
              label="Cấu hình Responses"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình label */}
          <Grid2 size={{ sm: 6 }} xs={12}>
            <CustomInput
              onChange={handleFieldLabelChange}
              value={item.props?.fieldLabel}
              label="Key cho Label"
              fullWidth
              size="small"
            />
          </Grid2>

          {/* Thêm cấu hình value */}
          <Grid2 size={{ sm: 6 }} xs={12}>
            <CustomInput
              onChange={handleFieldValueChange}
              value={item.props?.fieldValue}
              label="Key cho Value"
              fullWidth
              size="small"
            />
          </Grid2>

          <Grid2 size={{ sm: 12 }} xs={12}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled} />}
                label="Chỉ đọc"
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
                onChange={handleIsMultipleChange}
                control={<Checkbox checked={item.props?.isMultiple} />}
                label="Cho phép chọn nhiều"
              />
            </FormGroup>
          </Grid2>
          <SaveButtonGrid xs={12}>
            <Button variant="contained" onClick={handleSave}>
              Lưu dữ liệu
            </Button>
          </SaveButtonGrid>
        </ConfigGrid>
      </ConfigCollapse>
    </>
  );
}

ConfigCustomAutoComplete.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
};

function ConfigCustomAutoCompleteEnum({ onPropChange, item }) {

  const handleIsMultipleChange = (e) => {
    onPropChange(item.id, "isMultiple", e.target.checked);
  };

  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <>
      <ConfigCollapse title={"Cấu hình"}>
        <ConfigGrid container spacing={2}>
          <Grid2 size={{ sm: 12 }} xs={12}>
            <FormGroup>
              <FormControlLabel
                onChange={handleDisabledChange}
                control={<Checkbox checked={item.props?.disabled} />}
                label="Chỉ đọc"
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
                onChange={handleIsMultipleChange}
                control={<Checkbox checked={item.props?.isMultiple} />}
                label="Cho phép chọn nhiều"
              />
            </FormGroup>
          </Grid2>

        </ConfigGrid>
      </ConfigCollapse>
    </>
  );
}

ConfigCustomAutoCompleteEnum.propTypes = {
  onPropChange: PropTypes.func,
  item: PropTypes,
};
function ConfigDatePicker({ item, onPropChange }) {
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
  const handleFormatChange = (e) => {
    handleChange("format", e.target.value);
  };

  const handlePickerTypeChange = (e) => {
    handleChange("pickerType", e.target.value);
  };

  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };

  return (
    <ConfigCollapse title="Cấu hình">
      <DatePickerConfigGrid container spacing={2}>
        <Grid2 size={{ sm: 6 }} xs={12}>
          <CustomInput
            onChange={handleFormatChange}
            value={config.format}
            label="Định dạng (format)"
            fullWidth
            size="small"
            // disabled={true}
            disabled
          />
        </Grid2>
        <Grid2 size={{ sm: 6 }} xs={12}>
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
        <Grid2 size={{ sm: 12 }} xs={12}>
          <FormGroup>
            <FormControlLabel
              onChange={handleDisabledChange}
              control={<Checkbox checked={item.props?.disabled} />}
              label="Chỉ đọc"
            />
          </FormGroup>
        </Grid2>
        <SaveConfigButtonGrid xs={12}>
          <Button variant="contained" onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </SaveConfigButtonGrid>
      </DatePickerConfigGrid>
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
      <InputTextConfigGrid container spacing={2}>
        <Grid2 size={{ sm: 12 }} xs={12}>
          <FormGroup>
            <FormControlLabel
              onChange={handleDisabledChange}
              control={<Checkbox checked={item.props?.disabled} />}
              label="Chỉ đọc"
            />
          </FormGroup>
        </Grid2>
      </InputTextConfigGrid>
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

  const handleRemoveOption = (idx) => {
    const updated = item.props?.options?.filter((_, i) => i !== idx) || [];
    onPropChange(item.id, "options", updated);
  };
  const handleOptionLabelChange = (e) => {
    setNewOption((p) => ({ ...p, label: e.target.value }));
  };

  // Handler thay đổi value
  const handleOptionValueChange = (e) => {
    setNewOption((p) => ({ ...p, value: e.target.value }));
  };
  // Handler checkbox disabled
  const handleDisabledChange = (e) => {
    onPropChange(item.id, "disabled", e.target.checked);
  };
  const getRemoveOptionHandler = (idx) => () => {
    handleRemoveOption(idx);
  };

  return (
    <ConfigCollapse title="Cấu hình Checkbox">
      <ConfigBox>
        <AddOptionBox>
          <CustomInput
            value={newOption.label}
            onChange={handleOptionLabelChange}
            label="Label"
            size="small"
          />
          <CustomInput
            value={newOption.value}
            onChange={handleOptionValueChange}
            label="Value"
            size="small"
          />
          <AddOptionButton variant="contained" onClick={handleAddOption}>
            Thêm
          </AddOptionButton>
        </AddOptionBox>
        <OptionsListBox>
          <FormGroup>
            {item.props?.options?.map((opt, idx) => (
              <OptionItem
                key={idx}
                direction="row"
                // justifyContent="space-between"
                // alignItems="center"
              >
                <OptionTypography>{opt.label} <OptionLabel>({opt.value})</OptionLabel></OptionTypography>
                <DeleteOptionButton
                  // color="error"
                  variant="outlined"
                  size="small"
                  onClick={getRemoveOptionHandler(idx)}
                >
                  Xóa
                </DeleteOptionButton>
              </OptionItem>
            ))}
          </FormGroup>
        </OptionsListBox>
        <FormGroup>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={item.props?.disabled || false} />}
              onChange={handleDisabledChange}
              label="Chỉ đọc"
            />
          </FormGroup>
        </FormGroup>
      </ConfigBox>
    </ConfigCollapse>
  );
}
ConfigCheckbox.propTypes = {
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
const ExtractUserWithController = WithController(ExtractUserFinput);
const NextHandlersWithController = WithController(NextHandlers);


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

  const selectedFieldName = item?.props?.field;
  const predefinedFields = useSelector((state) => state.formDesign.dataFieldPopup);

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

    // Nếu đã có field này rồi thì không làm gì

    if (isExistField) {
      toast('Trường này đã được chọn', 'error')
      return;
    }

    onPropChange?.(item.id, "field", fieldName);
    onPropChange?.(item.id, "label", fieldLabel);
    setShowFieldSelector(false);
  };
  const renderConfig = () => {
    switch (selectedField?.type) {
      case "date":
        return <ConfigDatePicker onPropChange={onPropChange} item={item} />;
      case "autocomplete":
        return (
          <ConfigCustomAutoComplete onPropChange={onPropChange} item={item} />
        );
      case "enum":
        return (
          <ConfigCustomAutoCompleteEnum onPropChange={onPropChange} item={item} />
        )
      case "checkbox":
        return (
          <ConfigCheckbox onPropChange={onPropChange} item={item} />
        );
      default:
        return <ConfigInputText onPropChange={onPropChange} item={item} />;
    }
  };

  const memoizedRenderInputComponent = React.useMemo(() => {
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
        };

        const pickerType = item.props?.pickerType || "date";
        switch (pickerType) {
          case "datetime":
            return (
              <DateTimePickerWithController
                {...basePickerProps}
                format={item.props?.format}
                pickerType={pickerType}
              />
            );
          case "time":
            return (
              <TimePickerWithController
                {...basePickerProps}
                format={item.props?.format}
              />
            );
          case "date":
          default:
            return (
              <DatePickerWithController
                {...basePickerProps}
                format={item.props?.format || "DD/MM/YYYY"}
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
          />
        );

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
            {...rest}
          />
        );
    }

  }, [selectedField, item, onPropChange, mode, error, helperText, disabled, label, rest]);
  const handleShowFieldSelector = () => {
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
                <ActionButtonsStack>
                  <IconButton
                    size="small"
                    onClick={handleShowFieldSelector}
                    title="Đổi trường"
                  >
                    <SaveButtonSwapHorizIcon/>
                  </IconButton>
                  <ConfigIconButton
                    size="small"
                    onClick={handleToggleConfig}
                    title="Cấu hình"
                    isopen={showConfig}
                  >
                    <SaveButtonSettingsIcon/>
                  </ConfigIconButton>
                </ActionButtonsStack>
              </FieldActionsStack>
            )}
          </Box>
        )}

        {(mode === "runtime" || selectedField?.name) && memoizedRenderInputComponent}

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
  disabled: PropTypes.bool,
  items: PropTypes.array,
};

export default InputText;
