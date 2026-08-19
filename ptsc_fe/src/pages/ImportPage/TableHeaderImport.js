import React from "react";
// import { Checkbox } from "@mui/material";
import {
  ImportTableHead,
  ImportTableHeaderCell,
  CheckboxCell,
  ImportTableRow,
} from "@styles/ImportPage/ImportPage.styles";

const TableHeaderImport = ({ columns = [],    }) => {
  return (
    <ImportTableHead>
      <ImportTableRow>
        <CheckboxCell>
          {/* <Checkbox
            size="small"
            checked={allChecked}
            onChange={(e) => onCheckAll?.(e.target.checked)}
          /> */}
        </CheckboxCell>
        {columns.map((col) => {
          const isStt = col.name === "stt" || col.label?.toLowerCase() === "stt";
          return (
            <ImportTableHeaderCell
              key={col.name}
              isStt={isStt}
            >
              
              {col.label}
              {col.required && <span className="required-star">*</span>}
            </ImportTableHeaderCell>
          );
        })}
      </ImportTableRow>
    </ImportTableHead>
  );
};

export default TableHeaderImport;
