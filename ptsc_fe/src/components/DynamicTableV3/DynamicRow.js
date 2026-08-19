import React, { useCallback, memo } from "react";
import PropTypes from "prop-types";
import { MenuItem, Checkbox, Tooltip, FormHelperText } from "@mui/material";
import {
  DynamicMenuItem,
  DynamicSelect,
  DynamicTableCell,
  DynamicTableRow,
  DynamicTextField,
} from "@styles/DynamicTableCustom";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { ErrorDynamicButton } from "@styles/DynamicRow.styles";
import { Controller } from "react-hook-form";

const DynamicRow = memo(({
  row,
  index,
  onRowChange,
  onDelete,
  disabled,
  config,
  control,
  errors
}) => {
  const rowErrors = errors?.rows?.[index] || {};

  const handleChange = useCallback((field, value) => {
    let newValue = value;

    if (["minLength", "maxLength", "minValue", "maxValue"].includes(field)) {
      newValue = value === "" ? "" : Number(value);
      if (isNaN(newValue) || newValue < 0) {
        newValue = "";
      }

      const constraints = {
        minLength: { maxField: "maxLength", maxValue: row.maxLength },
        maxLength: { minField: "minLength", minValue: row.minLength },
        minValue: { maxField: "maxValue", maxValue: row.maxValue },
        maxValue: { minField: "minValue", minValue: row.minValue },
      };

      if (constraints[field] && constraints[field].maxValue !== undefined && newValue > constraints[field].maxValue) {
        newValue = constraints[field].maxValue;
      }
      if (constraints[field] && constraints[field].minValue !== undefined && newValue < constraints[field].minValue) {
        newValue = constraints[field].minValue;
      }
    }

    onRowChange(index, { ...row, [field]: newValue });
  }, [index, onRowChange, row]);

  const handleFormatChange = useCallback(
    (e) => {
      handleChange("format", e.target.value);
    },
    [handleChange]
  );

  const handleRequiredChange = useCallback(
    (e) => {
      handleChange("required", e.target.checked);
    },
    [handleChange]
  );

  const handleSearchableChange = useCallback(
    (e) => {
      handleChange("searchable", e.target.checked);
    },
    [handleChange]
  );

  const handleDeleteClick = useCallback(
    () => {
      onDelete(index);
    },
    [onDelete, index]
);

  const renderControllerField = (name, widthType, renderProps = {}) => (
    <Controller
      name={`rows.${index}.${name}`}
      control={control}
      render={({ field }) => {
        const handleDynamicFieldChange = (e) => {
          field.onChange(e);
          handleChange(name, e.target.value);
        };
        return (
          <DynamicTextField
          widthType={widthType}
          size="small"
          {...field}
          {...renderProps}
          // onChange={(e) => {
          //   field.onChange(e);
          //   handleChange(name, e.target.value);
          // }}
          onChange={handleDynamicFieldChange}
          onBlur={field.onBlur}
          error={!!rowErrors[name]}
          helperText={rowErrors[name]?.message}
          disabled={disabled}
        />
        )
      }}
    />
  );

  const renderSelectField = (name, options) => (
    <Controller
      name={`rows.${index}.${name}`}
      control={control}
      render={({ field }) => {
        const handleDynamicFieldChange = (e) => {
          field.onChange(e);
          handleChange(name, e.target.value);
        };
        return (
           <>
          <DynamicSelect
            size="small"
            {...field}
            // onChange={(e) => {
            //   field.onChange(e);
            //   handleChange(name, e.target.value);
            // }}
            onChange={handleDynamicFieldChange}
            disabled={disabled}
            error={!!rowErrors[name]}
          >
            {options.map(({ value, label }) => (
              <DynamicMenuItem key={value} value={value} disabled={disabled}>
                {label}
              </DynamicMenuItem>
            ))}
          </DynamicSelect>
          {rowErrors[name] && (
            <FormHelperText error>{rowErrors[name]?.message}</FormHelperText>
          )}
        </>
        )
      }}
    />
  );

  return (
    <DynamicTableRow key={row.id} index={index}>
      <DynamicTableCell>
        {renderControllerField("name")}
      </DynamicTableCell>
      <DynamicTableCell>
        {renderControllerField("code")}
      </DynamicTableCell>
      <DynamicTableCell>
        {renderSelectField("type", [
          { value: "text", label: "Chữ" },
          { value: "number", label: "Số nguyên" },
          { value: "date", label: "Ngày tháng" },
          { value: "dynamic", label: "Danh mục động" },
          { value: "textarea", label: "Textarea" },
        ])}
      </DynamicTableCell>
      <DynamicTableCell>
        {row.type === "date" && (
          <DynamicTextField
            size="small"
            value={row.format || ""}
            // onChange={(e) => handleChange("format", e.target.value)}
            onChange={handleFormatChange}
            disabled={disabled}
          />
        )}
        {row.type === "dynamic" && (
          <DynamicSelect
            size="small"
            value={row.format || ""}
            // onChange={(e) => handleChange("format", e.target.value)}
            onChange={handleFormatChange}
            disabled={disabled}
          >
            {config[row.type]?.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </DynamicSelect>
        )}
      </DynamicTableCell>
      <DynamicTableCell>
        <Checkbox
          checked={row.required || false}
          // onChange={(e) => handleChange("required", e.target.checked)}
          onChange={handleRequiredChange}
          disabled={disabled}
        />
      </DynamicTableCell>
      <DynamicTableCell>
        <Checkbox
          checked={row.searchable || false}
          // onChange={(e) => handleChange("searchable", e.target.checked)}
          onChange={handleSearchableChange}
          disabled={disabled}
        />
      </DynamicTableCell>
      <DynamicTableCell>
        {row.type === "text" && renderControllerField("minLength",'small', { type: "number" })}
      </DynamicTableCell>
      <DynamicTableCell>
        {row.type === "text" && renderControllerField("maxLength",'small', { type: "number" })}
      </DynamicTableCell>
      <DynamicTableCell>
        {row.type === "number" && renderControllerField("minValue",'small', { type: "number" })}
      </DynamicTableCell>
      <DynamicTableCell>
        {row.type === "number" && renderControllerField("maxValue",'small', { type: "number" })}
      </DynamicTableCell>
      <DynamicTableCell widthType="small">
        <DynamicTextField
          size="small"
          type="number"
          disabled
          value={index + 1}
          widthType="small"
        />
      </DynamicTableCell>
      {!disabled && (
        <DynamicTableCell>
          <Tooltip title="Xóa">
            <ErrorDynamicButton
            //  onClick={() => onDelete(index)}
            onClick={handleDeleteClick}
             >
              <DeleteOutlineIcon />
            </ErrorDynamicButton>
          </Tooltip>
        </DynamicTableCell>
      )}
    </DynamicTableRow>
  );
});

DynamicRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    code: PropTypes.string,
    type: PropTypes.string,
    format: PropTypes.string,
    required: PropTypes.bool,
    searchable: PropTypes.bool,
    minLength: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxLength: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    minValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    maxValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  index: PropTypes.number.isRequired,
  onRowChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  config: PropTypes.object,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object,
};

DynamicRow.defaultProps = {
  disabled: false,
  config: {},
  errors: {},
};

DynamicRow.displayName = "DynamicRow";
export default DynamicRow;