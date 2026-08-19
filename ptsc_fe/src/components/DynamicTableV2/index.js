import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import PropTypes from "prop-types";

import {
  DynamicBox,
  DynamicTable,
  DynamicTableContainer,
  DynamicTableHead,
  DynamicTableRow,
  DynamicTableCellHead,
} from "@styles/DynamicTableCustom";
import AddIcon from "@mui/icons-material/Add";
import DynamicRow from "./DynamicRow";
import { AddRowButton } from "./index.styles";

const DynamicTableV2 = forwardRef(
  ({ defaultValue, disabled = false, configColumns = {} }, ref) => {
    const [rows, setRows] = useState([]);

    useEffect(() => {
      if (defaultValue && defaultValue.length > 0) {
        setRows(defaultValue);
      } else {
        setRows([
          { id: 1, type: "", format: "", required: false, searchable: false },
        ]);
      }
    }, [defaultValue]);

    useImperativeHandle(ref, () => ({
      getData: () => {
        return rows.map((row) => {
          const data = {
            name: row.name,
            code: row.code,
            type: row.type,
            required: row.required,
            searchable: row.searchable,
            format:
              row.type === "date" || row.type === "dynamic"
                ? row.format
                : undefined,
            minLength: row.type === "text" ? row.minLength ? +row.minLength : undefined : undefined,
            maxLength: row.type === "text" ? row.maxLength ? +row.maxLength : undefined : undefined,
            minValue: row.type === "number" ? row.minValue ? +row.minValue : undefined : undefined,
            maxValue: row.type === "number" ? row.maxValue ? +row.maxValue : undefined : undefined,
          };
          return JSON.parse(JSON.stringify(data)); // Xóa key có giá trị undefined
        });
      },
    }));

    const handleAddRow = useCallback(() => {
      setRows((prevRows) => [
        ...prevRows,
        {
          id: prevRows.length + 1,
          type: "",
          format: "",
          required: false,
          searchable: false,
        },
      ]);
    }, []);

    const handleRowChange = useCallback((index, updatedRow) => {
      setRows((prevRows) =>
        prevRows.map((row, i) => (i === index ? updatedRow : row))
      );
    }, []);

    const handleDeleteRow = useCallback((index) => {
      setRows((prevRows) => prevRows.filter((_, i) => i !== index));
    }, []);

    return (
      <DynamicBox>
        <DynamicTableContainer>
          <DynamicTable>
            <DynamicTableHead>
              <DynamicTableRow>
                <DynamicTableCellHead>Tên</DynamicTableCellHead>
                <DynamicTableCellHead>Mã</DynamicTableCellHead>
                <DynamicTableCellHead>Kiểu nhập</DynamicTableCellHead>
                <DynamicTableCellHead>Định dạng</DynamicTableCellHead>
                <DynamicTableCellHead>Bắt buộc</DynamicTableCellHead>
                <DynamicTableCellHead>Tìm kiếm</DynamicTableCellHead>
                <DynamicTableCellHead>Số ký tự tối thiểu</DynamicTableCellHead>
                <DynamicTableCellHead>Số ký tự tối đa</DynamicTableCellHead>
                <DynamicTableCellHead>Giá trị tối thiểu</DynamicTableCellHead>
                <DynamicTableCellHead>Giá trị tối đa</DynamicTableCellHead>
                <DynamicTableCellHead>Thứ tự</DynamicTableCellHead>
                {!disabled && (
                  <DynamicTableCellHead>Thao tác</DynamicTableCellHead>
                )}
              </DynamicTableRow>
            </DynamicTableHead>
            <tbody>
              {rows.map((row, index) => (
                <DynamicRow
                  key={row.id}
                  row={row}
                  index={index}
                  onRowChange={handleRowChange}
                  onDelete={handleDeleteRow}
                  disabled={disabled}
                  config={configColumns}
                />
              ))}
              {!disabled && (
                <AddRowButton onClick={handleAddRow}>
                  <AddIcon />
                </AddRowButton>
              )}
            </tbody>
          </DynamicTable>
        </DynamicTableContainer>
      </DynamicBox>
    );
  }
);

DynamicTableV2.propTypes = {
  defaultValue: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string,
      code: PropTypes.string,
      type: PropTypes.string,
      format: PropTypes.string,
      required: PropTypes.bool,
      searchable: PropTypes.bool,
      minLength: PropTypes.number,
      maxLength: PropTypes.number,
      minValue: PropTypes.number,
      maxValue: PropTypes.number,
    })
  ),
  disabled: PropTypes.bool,
  configColumns: PropTypes.array,
};

DynamicTableV2.displayName = "DynamicTableV2";
export default DynamicTableV2;
