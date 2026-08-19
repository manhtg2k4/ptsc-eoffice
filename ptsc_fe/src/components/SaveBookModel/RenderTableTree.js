import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { TableBody } from "@mui/material";
import {
  StyledCheckbox,
  StyledNameText,
  // StyledNameTextHeader,
  StyledRow,
  StyledTableCellLarge,
  StyledTableCellMedium,
  StyledTableContainer1,
  StyledTable,
  StyledTableHead,
  StyledTableRow,
  StyledNameAndIcon,
  StyledNameTextHeaderTH,
} from "@styles/DialogDirective";
import ImportContactsIcon from '@mui/icons-material/ImportContacts';


const Row = React.memo(
  ({ item, isChecked, handleCheckboxChange }) => {
    // Checked state
    const checked = useMemo(() => {
      return isChecked(item, "luuSo");
    }, [item, isChecked]);

    const handleChange = useCallback(
      (e) => {
        handleCheckboxChange(item, "luuSo", e.target.checked);
      },
      [item, handleCheckboxChange]
    );

    return (
      <StyledRow hover>
        <StyledTableCellLarge>
          <StyledNameAndIcon  >
            <ImportContactsIcon />
            <StyledNameText>{item?.name} </StyledNameText>
          </StyledNameAndIcon>
        </StyledTableCellLarge>

        <StyledTableCellMedium align="center">
          <StyledCheckbox checked={checked} onChange={handleChange} />
        </StyledTableCellMedium>
      </StyledRow>
    );
  },
  (prevProps, nextProps) => {
    const prevId = prevProps.item?.bookDocumentId;
    const nextId = nextProps.item?.bookDocumentId;
    if (prevId !== nextId) return false;
    // Re-render if the checked state for this item changes
    const prevChecked = prevProps.isChecked(prevProps.item, "luuSo");
    const nextChecked = nextProps.isChecked(nextProps.item, "luuSo");
    if (prevChecked !== nextChecked) return false;
    return true;
  }
);
Row.displayName = "Row";

// ===== RenderTableTree component =====
const RenderTableTree = ({ data, isChecked, handleCheckboxChange }) => {
  return (
    <StyledTableContainer1>
      <StyledTable stickyHeader>
        <StyledTableHead>
          <StyledTableRow>
            <StyledTableCellLarge>
              <StyledNameText>Tên sổ quản lý</StyledNameText>
            </StyledTableCellLarge>
            <StyledTableCellMedium>
              <StyledNameTextHeaderTH>Chọn sổ</StyledNameTextHeaderTH>
            </StyledTableCellMedium>
          </StyledTableRow>
        </StyledTableHead>

        <TableBody>
          {data?.map((item) => (
            <Row
              key={item.bookDocumentId}
              item={item}
              isChecked={isChecked}
              handleCheckboxChange={handleCheckboxChange}
            />
          ))}
        </TableBody>
      </StyledTable>
    </StyledTableContainer1>
  );
};

RenderTableTree.propTypes = {
  data: PropTypes.array,
  isChecked: PropTypes.func.isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
};

RenderTableTree.displayName = "RenderTableTree";

export default React.memo(RenderTableTree);
