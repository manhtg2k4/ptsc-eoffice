import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { MenuItem, Checkbox } from "@mui/material";
import {
  DynamicButton,
  DynamicBox,
  DynamicSelect,
  DynamicTable,
  DynamicTableCell,
  DynamicTableContainer,
  DynamicTableHead,
  DynamicTableRow,
  DynamicTextField,
  DynamicTableCellHead,
} from "@styles/DynamicTableCustom";
import { AddRowButton } from "../../styles/DynamicTableCustom";
import AddIcon from "@mui/icons-material/Add";

const DynamicTableV1 = forwardRef(({ defaultValue, disabled = false }, ref) => {
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
      return rows.map((row) => ({
        name: row.name,
        code: row.code,
        type: row.type,
        required: row.required,
        searchable: row.searchable,
        format:
          row.type === "date" || row.type === "dynamic"
            ? row.format
            : undefined,
        minLength: row.type === "text" ? row.minLength : undefined,
        maxLength: row.type === "text" ? row.maxLength : undefined,
        minValue: row.type === "number" ? row.minValue : undefined,
        maxValue: row.type === "number" ? row.maxValue : undefined,
      }));
    },
  }));

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: rows.length + 1,
        type: "",
        format: "",
        required: false,
        searchable: false,
      },
    ]);
  };

  const handleRowChange = useCallback((index, field, isCheckbox = false) => (e) => {
    const newRows = [...rows];
    newRows[index][field] = isCheckbox ? e.target.checked : e.target.value;
    setRows(newRows);
  }, [rows]);

  const handleRemoveRow = useCallback((index) => () => {
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
              {!disabled && <DynamicTableCellHead>Thao tác</DynamicTableCellHead>}
            </DynamicTableRow>
          </DynamicTableHead>
          <tbody>
            {rows.map((row, index) => (
              <DynamicTableRow key={row.id} index={index}>
                <DynamicTableCell>
                  <DynamicTextField
                    size="small"
                    placeholder="Nhập tên"
                    value={row.name || ""}
                    // onChange={(e) => {
                    //   const newRows = [...rows];
                    //   newRows[index].name = e.target.value;
                    //   setRows(newRows);
                    // }}
                    onChange={handleRowChange(index, "name")}
                    disabled={disabled}
                  />
                </DynamicTableCell>
                <DynamicTableCell>
                  <DynamicTextField
                    size="small"
                    placeholder="Nhập mã"
                    value={row.code || ""}
                    // onChange={(e) => {
                    //   const newRows = [...rows];
                    //   newRows[index].code = e.target.value;
                    //   setRows(newRows);
                    // }}
                    onChange={handleRowChange(index, "code")}
                    disabled={disabled}
                  />
                </DynamicTableCell>
                <DynamicTableCell>
                  <DynamicSelect
                    value={row.type || ""}
                    // onChange={(e) => {
                    //   const newRows = [...rows];
                    //   newRows[index].type = e.target.value;
                    //   setRows(newRows);
                    // }}
                    onChange={handleRowChange(index, "type")}
                    disabled={disabled}
                  >
                    <MenuItem value="text">Chữ</MenuItem>
                    <MenuItem value="number">Số nguyên</MenuItem>
                    <MenuItem value="date">Ngày tháng</MenuItem>
                    <MenuItem value="dynamic">Danh mục động</MenuItem>
                    <MenuItem value="textarea">Textarea</MenuItem>
                  </DynamicSelect>
                </DynamicTableCell>
                <DynamicTableCell>
                  {(row.type === "date" || row.type === "dynamic") && (
                    <DynamicTextField
                      size="small"
                      placeholder="Định dạng"
                      value={row.format || ""}
                      // onChange={(e) => {
                      //   const newRows = [...rows];
                      //   newRows[index].format = e.target.value;
                      //   setRows(newRows);
                      // }}
                      onChange={handleRowChange(index, "format")}
                      disabled={disabled}
                    />
                  )}
                </DynamicTableCell>
                <DynamicTableCell>
                  <Checkbox
                    checked={row.required || false}
                    // onChange={(e) => {
                    //   const newRows = [...rows];
                    //   newRows[index].required = e.target.checked;
                    //   setRows(newRows);
                    // }}
                    onChange={handleRowChange(index, "required", true)}
                    disabled={disabled}
                  />
                </DynamicTableCell>
                <DynamicTableCell>
                  <Checkbox
                    checked={row.searchable || false}
                    // onChange={(e) => {
                    //   const newRows = [...rows];
                    //   newRows[index].searchable = e.target.checked;
                    //   setRows(newRows);
                    // }}
                    onChange={handleRowChange(index, "searchable", true)}
                    disabled={disabled}
                  />
                </DynamicTableCell>
                <DynamicTableCell>
                  {row.type === "text" && (
                    <DynamicTextField
                      size="small"
                      type="number"
                      placeholder="Tối thiểu"
                      value={row.minLength || ""}
                      // onChange={(e) => {
                      //   const newRows = [...rows];
                      //   newRows[index].minLength = e.target.value;
                      //   setRows(newRows);
                      // }}
                      onChange={handleRowChange(index, "minLength")}
                      disabled={disabled}
                    />
                  )}
                </DynamicTableCell>
                <DynamicTableCell>
                  {row.type === "text" && (
                    <DynamicTextField
                      size="small"
                      type="number"
                      placeholder="Tối đa"
                      value={row.maxLength || ""}
                      // onChange={(e) => {
                      //   const newRows = [...rows];
                      //   newRows[index].maxLength = e.target.value;
                      //   setRows(newRows);
                      // }}
                      onChange={handleRowChange(index, "maxLength")}
                      disabled={disabled}
                    />
                  )}
                </DynamicTableCell>
                <DynamicTableCell>
                  {row.type === "number" && (
                    <DynamicTextField
                      size="small"
                      type="number"
                      placeholder="Tối thiểu"
                      value={row.minValue || ""}
                      // onChange={(e) => {
                      //   const newRows = [...rows];
                      //   newRows[index].minValue = e.target.value;
                      //   setRows(newRows);
                      // }}
                      onChange={handleRowChange(index, "minValue")}
                      disabled={disabled}
                    />
                  )}
                </DynamicTableCell>
                <DynamicTableCell>
                  {row.type === "number" && (
                    <DynamicTextField
                      size="small"
                      type="number"
                      placeholder="Tối đa"
                      value={row.maxValue || ""}
                      // onChange={(e) => {
                      //   const newRows = [...rows];
                      //   newRows[index].maxValue = e.target.value;
                      //   setRows(newRows);
                      // }}
                      onChange={handleRowChange(index, "maxValue")}
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
                {!disabled && <DynamicTableCell>
                  <DynamicButton
                    // onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    onClick={handleRemoveRow(index)}
                  >
                    Xóa
                  </DynamicButton>
                </DynamicTableCell>}
              </DynamicTableRow>
            ))}
            {!disabled && <AddRowButton onClick={handleAddRow}>
              <AddIcon />
            </AddRowButton>}

          </tbody>
        </DynamicTable>
      </DynamicTableContainer>
    </DynamicBox>
  );
});

DynamicTableV1.propTypes = {
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
  disabled: PropTypes.bool
};

DynamicTableV1.displayName = "DynamicTableV1";
export default DynamicTableV1;