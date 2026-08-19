import React, { useCallback, memo } from "react";
import PropTypes from "prop-types";
import { MenuItem, Checkbox, Tooltip } from "@mui/material";
import {
  DynamicMenuItem,
  DynamicSelect,
  DynamicTableCell,
  DynamicTableRow,
  DynamicTextField,
} from "@styles/DynamicTableCustom";
import { ErrorDynamicButton } from "@styles/DynamicRow.styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const DynamicRow = memo(
  ({ row, index, onRowChange, onDelete, disabled, config }) => {
    const handleChange = useCallback(
      (field, value) => {
        let newValue = value;

        if (
          ["minLength", "maxLength", "minValue", "maxValue"].includes(field)
        ) {
          newValue = value === "" ? "" : Number(value);
          if (isNaN(newValue) || newValue < 0) {
            newValue = "";
          }

          if (
            field === "minLength" &&
            row.maxLength !== undefined &&
            newValue > row.maxLength
          ) {
            newValue = row.maxLength;
          }
          if (field === "maxLength") {
            if (newValue) {
              if (newValue < row.minLength) {
                newValue = row.minLength;
              }
            }
          }

          if (
            field === "minValue" &&
            row.maxValue !== undefined &&
            newValue > row.maxValue
          ) {
            newValue = row.maxValue;
          }
          if (field === "maxValue") {
            if (newValue) {
              if (newValue < row.minValue) {
                newValue = row.minValue;

              }
            }
          }
        }

        onRowChange(index, { ...row, [field]: newValue });
      },
      [index, onRowChange, row]
    );

  const handleNameChange = (e) => handleChange("name", e.target.value);
  const handleCodeChange = (e) => handleChange("code", e.target.value);
  const handleTypeChange = (e) => handleChange("type", e.target.value);
  const handleFormatChange = (e) => handleChange("format", e.target.value);
  const handleRequiredChange = (e) => handleChange("required", e.target.checked);
  const handleSearchableChange = (e) => handleChange("searchable", e.target.checked);
  const handleMinLengthChange = (e) => handleChange("minLength", e.target.value);
  const handleMaxLengthChange = (e) => handleChange("maxLength", e.target.value);
  const handleMinValueChange = (e) => handleChange("minValue", e.target.value);
  const handleMaxValueChange = (e) => handleChange("maxValue", e.target.value);
  const handleDeleteClick = () => onDelete(index);
    return (
      <DynamicTableRow key={row.id} index={index}>
        <DynamicTableCell>
          <DynamicTextField
            size="small"
            value={row.name || ""}
            // onChange={(e) => handleChange("name", e.target.value)}
            onChange={handleNameChange}
            disabled={disabled}
          />
        </DynamicTableCell>
        <DynamicTableCell>
          <DynamicTextField
            size="small"
            value={row.code || ""}
            // onChange={(e) => handleChange("code", e.target.value)}
            onChange={handleCodeChange} 
            disabled={disabled}
          />
        </DynamicTableCell>
        <DynamicTableCell>
          <DynamicSelect
            value={row.type || ""}
            // onChange={(e) => handleChange("type", e.target.value)}
            onChange={handleTypeChange}
            disabled={disabled}
          >
            <DynamicMenuItem disabled={disabled} value="text">Chữ</DynamicMenuItem>
            <DynamicMenuItem disabled={disabled} value="number">Số nguyên</DynamicMenuItem>
            <DynamicMenuItem disabled={disabled} value="date">Ngày tháng</DynamicMenuItem>
            <DynamicMenuItem disabled={disabled} value="dynamic">Danh mục động</DynamicMenuItem>
            <DynamicMenuItem disabled={disabled} value="textarea">Textarea</DynamicMenuItem>
          </DynamicSelect>
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
              {config[row.type]?.map((item, index) => (
                <MenuItem key={index} value={item.value}>
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
          {row.type === "text" && (
            <DynamicTextField
              size="small"
              type="number"
              value={row.minLength || ""}
              // onChange={(e) => handleChange("minLength", e.target.value)}
              onChange={handleMinLengthChange}
              disabled={disabled}
            />
          )}
        </DynamicTableCell>
        <DynamicTableCell>
          {row.type === "text" && (
            <DynamicTextField
              size="small"
              type="number"
              value={row.maxLength || ""}
              // onChange={(e) => handleChange("maxLength", e.target.value)}
              onChange={handleMaxLengthChange}
              disabled={disabled}
            />
          )}
        </DynamicTableCell>
        <DynamicTableCell>
          {row.type === "number" && (
            <DynamicTextField
              size="small"
              type="number"
              value={row.minValue || ""}
              // onChange={(e) => handleChange("minValue", e.target.value)}
              onChange={handleMinValueChange}
              disabled={disabled}
            />
          )}
        </DynamicTableCell>
        <DynamicTableCell>
          {row.type === "number" && (
            <DynamicTextField
              size="small"
              type="number"
              value={row.maxValue || ""}
              // onChange={(e) => handleChange("maxValue", e.target.value)}
              onChange={handleMaxValueChange}
              disabled={disabled}
            />
          )}
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
  }
);

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
  type: PropTypes.string,
  config: PropTypes.object,
};

DynamicRow.displayName = "DynamicRow";
export default DynamicRow;
