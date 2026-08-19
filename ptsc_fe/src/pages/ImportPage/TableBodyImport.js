/* eslint-disable react/forbid-component-props */
import React, { useCallback } from "react";
import { Checkbox } from "@mui/material";
import {
  ImportTableBody,
  ImportTableBodyCell,
  ImportTableRow,
  CheckboxCell,
} from "@styles/ImportPage/ImportPage.styles";
import CustomInput from "@components/CustomInput/CustomInputBase";
 
const TableBodyImport = ({ rows, checkedRows, onToggleRow, onChangeRow, columns = [] }) => {
  const handleChange = useCallback((rowIndex, colName) => (e) => {
    if (onChangeRow) {
      onChangeRow(rowIndex, colName, e.target.value);
    }
  }, [onChangeRow]);

  const handleToggle = useCallback((rowIndex) => () => {
    onToggleRow(rowIndex);
  }, [onToggleRow]);
  if (!rows || rows.length === 0) {
    return (
      <ImportTableBody>
        <ImportTableRow>
          <ImportTableBodyCell colSpan={columns.length + 1} align="center">
            Không có dữ liệu
          </ImportTableBodyCell>
        </ImportTableRow>
      </ImportTableBody>
    );
  }

  return (
    <ImportTableBody>
      {rows.map((row, rowIndex) => (
        <ImportTableRow key={rowIndex}   className="tbl_Value">
          <CheckboxCell>
            <Checkbox
              size="small"
              checked={!!checkedRows[rowIndex]}
              onChange={handleToggle(rowIndex)}
            />
          </CheckboxCell>
          {columns.map((col) => {
            const isStt = col.name === "stt" || col.label?.toLowerCase() === "stt";
            const cellValue = row[col.name] ?? "";
            return (
              <ImportTableBodyCell
                key={col.name}
                isStt={isStt}
              >
                
                    <CustomInput
                      size="small"
                      value={cellValue}
                      variant="outlined"
                      inputProps={{
                        style: {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                      onChange={handleChange(rowIndex, col.name)}
                    />
                 
              </ImportTableBodyCell>
            );
          })}
        </ImportTableRow>
      ))}
    </ImportTableBody>
  );
};

export default TableBodyImport;
