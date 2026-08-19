import React, { useState, useCallback, memo, useEffect } from "react";
import {
  SkyTable,
  SkyTableBody,
  SkyTableCell,
  SkyTableHead,
  SkyTableRow,
  SkyIconButton,
  SkyBox,
  SkyTypography,
  SkyMenu,
  SkyMenuItem,
  SkyListItemIcon,
  SkyListItemText,
  SkyMenuIcon,
  SkyDeleteOutlineIcon,
  SkyAddIcon,
  SkyTooltip,
} from "@styles/SkyStyles";
import CustomInput from "@components/CustomInput/CustomInput";
import AsyncAutoCompleted from "@components/CustomAsyncAutoCompleted";
import { API_GET_GROUP_USERS } from "@EnvironmentFile/constants/urlConfig";
import { styled } from "@mui/material/styles";

const StyledTable = styled(SkyTable)(({ theme }) => ({
  borderCollapse: "collapse",
  border: `1px solid ${theme.palette.divider}`,
  width: "100%",
  "& .MuiTableCell-root": {
    border: `1px solid ${theme.palette.divider}`,
    padding: "4px 8px",
    height: "100%", // Đảm bảo cell đủ cao cho AutoComplete
    minHeight: "40px",
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const StyledHeaderCell = styled(SkyTableCell, {
  shouldForwardProp: (prop) => prop !== "styledWidth",
})(({ theme, styledWidth }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: "bold",
  textAlign: "center",
  padding: "10px !important",
  width: styledWidth || "auto",
  borderRight: `1px solid rgba(255, 255, 255, 0.3) !important`,
  borderLeft: `1px solid rgba(255, 255, 255, 0.3) !important`,
  "&:first-of-type": {
    borderLeft: `1px solid ${theme.palette.primary.main} !important`,
  },
  "&:last-child": {
    borderRight: `1px solid ${theme.palette.primary.main} !important`,
  },
}));

const ActionMenuPaperProps = {
  elevation: 3,
  style: {
    minWidth: 120,
    borderRadius: "8px",
  }
};

const ActionMenuAnchorOrigin = {
  vertical: "bottom",
  horizontal: "right",
};

const ActionMenuTransformOrigin = {
  vertical: "top",
  horizontal: "right",
};

const SkyTableEditableContainer = styled(SkyBox)({
  width: "100%",
});

const SkyTableEditableHeader = styled(SkyBox)(({ theme }) => ({
  display: "flex", 
  justifyContent: "space-between", 
  alignItems: "center", 
  marginBottom: theme.spacing(1), 
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}));

const SkyTableTitle = styled(SkyTypography)(({ theme }) => ({
  fontWeight: "bold", 
  color: theme.palette.primary.main,
}));

const SkyFlexGrow = styled(SkyBox)({
  flexGrow: 1,
});

const SkyAddButtonStyled = styled(SkyIconButton)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main, 
  color: "white", 
  borderRadius: "8px",
  padding: "6px",
  "&:hover": { backgroundColor: theme.palette.primary.dark },
  "& svg": { fontSize: "1.5rem", color: "white" }
}));

const SkyMenuIconStyled = styled(SkyMenuIcon)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const SkyMenuItemText = styled(SkyTypography)({
  fontSize: "0.875rem",
});

const SkyMenuItemTextError = styled(SkyMenuItemText)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const SkyNoDataRow = styled(SkyTableRow)({
  "& td": {
    paddingTop: "32px",
    paddingBottom: "32px",
  }
});

const SkyNoDataText = styled(SkyTypography)(({ theme }) => ({
   color: theme.palette.text.secondary,
   fontSize: "0.875rem",
   textAlign: "center",
}));

const StyledEditableInput = styled(CustomInput)({
  "& .MuiInputBase-root": {
    fontSize: "0.875rem",
    border: "none",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none",
  }
});

const StyledAsyncAutoCompleted = styled(AsyncAutoCompleted)({
  "& .MuiOutlinedInput-root": {
    padding: "2px 4px !important",
    fontSize: "0.875rem",
    "& fieldset": { border: "none" }
  }
});

const SkyEditableInputProps = { 
  disableUnderline: true,
};

const RowActions = memo(function RowActions({ index, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleDeleteClick = useCallback(() => {
    if (onDelete) {
      onDelete(index);
    }
    handleClose();
  }, [index, onDelete, handleClose]);

  return (
    <>
      <SkyIconButton onClick={handleClick}>
        <SkyMenuIconStyled />
      </SkyIconButton>
      <SkyMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={ActionMenuAnchorOrigin}
        transformOrigin={ActionMenuTransformOrigin}
        PaperProps={ActionMenuPaperProps}
      >
        {/* <SkyMenuItem onClick={handleEditClick}>
          <SkyListItemIcon>
            <SkyEditIcon />
          </SkyListItemIcon>
          <SkyListItemText primary={<SkyMenuItemText>Chỉnh sửa</SkyMenuItemText>} />
        </SkyMenuItem> */}
        <SkyMenuItem onClick={handleDeleteClick}>
          <SkyListItemIcon>
            <SkyDeleteOutlineIcon />
          </SkyListItemIcon>
          <SkyListItemText primary={<SkyMenuItemTextError>Xóa</SkyMenuItemTextError>} />
        </SkyMenuItem>
      </SkyMenu>
    </>
  );
});

const EditableCell = memo(function EditableCell({ 
    index, 
    field, 
    value, 
    title, 
    onInputChange 
}) {
  const [localValue, setLocalValue] = useState(value || "");

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const handleTextChange = useCallback((e) => {
    const rawValue = e.target.value || "";
    const cleanValue = rawValue.replace(/\s+/g, "");
    setLocalValue(cleanValue);
    onInputChange(index, field, cleanValue);
  }, [index, field, onInputChange]);

  const handleSelectChange = useCallback((newValue) => {
    onInputChange(index, field, newValue);
  }, [index, field, onInputChange]);

  const placeholder = `Nhập ${title.toLowerCase()}...`;

  if (field === "groupCode") {
    return (
      <StyledAsyncAutoCompleted
        url={API_GET_GROUP_USERS}
        value={value}
        onChange={handleSelectChange}
        optionLabel="code"
        optionValue="code"
        queryParam="code"
        placeholder={placeholder}
        isCompact
        size="small"
      />
    );
  }

  return (
    <StyledEditableInput
      value={localValue}
      onChange={handleTextChange}
      fullWidth
      size="small"
      placeholder={placeholder}
      variant="standard"
      InputProps={SkyEditableInputProps}
    />
  );
});

function CustomTableEditable({ 
  columns, 
  data = [], 
  onInputChange, 
  onDeleteRow, 
  onAddRow,
  title,
}) {
  return (
    <SkyTableEditableContainer>
      <SkyTableEditableHeader>
        {title && <SkyTableTitle>{title}</SkyTableTitle>}
        <SkyFlexGrow />
        {onAddRow && (
          <SkyTooltip title="Thêm mới">
            <SkyAddButtonStyled onClick={onAddRow}>
              <SkyAddIcon />
            </SkyAddButtonStyled>
          </SkyTooltip>
        )}
      </SkyTableEditableHeader>
      <StyledTable size="small">
        <SkyTableHead>
          <SkyTableRow>
            <StyledHeaderCell styledWidth="60px">STT</StyledHeaderCell>
            {columns.map((col) => (
              <StyledHeaderCell key={col.name} styledWidth={col.width}>
                {col.title}
              </StyledHeaderCell>
            ))}
            <StyledHeaderCell styledWidth="100px">Hành động</StyledHeaderCell>
          </SkyTableRow>
        </SkyTableHead>
        <SkyTableBody>
          {data.length === 0 ? (
            <SkyNoDataRow>
              <SkyTableCell colSpan={columns.length + 2} align="center">
                <SkyNoDataText>Không có dữ liệu</SkyNoDataText>
              </SkyTableCell>
            </SkyNoDataRow>
          ) : (
            data.map((row, index) => (
              <SkyTableRow key={index}>
                <SkyTableCell align="center">{index + 1}</SkyTableCell>
                {columns.map((col) => (
                  <SkyTableCell key={col.name}>
                    <EditableCell
                      index={index}
                      field={col.name}
                      value={row[col.name]}
                      title={col.title}
                      onInputChange={onInputChange}
                    />
                  </SkyTableCell>
                ))}
                <SkyTableCell align="center">
                  <RowActions 
                    index={index}
                    onDelete={onDeleteRow} 
                  />
                </SkyTableCell>
              </SkyTableRow>
            ))
          )}
        </SkyTableBody>
      </StyledTable>
    </SkyTableEditableContainer>
  );
}

export default memo(CustomTableEditable);
