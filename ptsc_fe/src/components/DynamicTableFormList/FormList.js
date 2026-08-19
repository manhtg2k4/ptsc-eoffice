import React, { useCallback, useState } from "react";
import { MenuItem, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { Controller } from "react-hook-form";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import {
  AddRowButton,
  ErrorIconButton,
  FormContainer,
  SmallTable,
  StyledGridContainer,
  FullWidthGridItem,
  StyledGridItem,
  SmallTextField,
} from "@styles/FormList.styles";

const FormList = ({
  title,
  open,
  onClose,
  control,
  onSave,
  getValues,
  errors,
  isLoading,
  trigger,
  idList
}) => {
  const [enumValues, setEnumValues] = useState([
    { id: "pending", label: "Chờ duyệt" },
    { id: "approved", label: "Đã duyệt" }
  ]);

  const handleAddRow = () => {
    setEnumValues([...enumValues, { id: "", label: "" }]);
  };

  // const handleDeleteRow = (index) => {
  //   setEnumValues(enumValues.filter((_, i) => i !== index));
  // };

  // const handleChangeCell = (index, key, value) => {
  //   const updated = [...enumValues];
  //   updated[index][key] = value;
  //   setEnumValues(updated);
  // };

  const handleDeleteRow = useCallback(
    (index) => {
      setEnumValues((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const handleChangeCell = useCallback(
    (index, key, value) => {
      setEnumValues((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [key]: value };
        return updated;
      });
    },
    [] 
  );

  const handleAction = async () => {
    const isValidFields = await trigger(["code", "name", "type"]);
    if (!isValidFields) return;

    onSave({
      code: getValues("code"),
      name: getValues("name"),
      type: getValues("type"),
      field: getValues("type") === "Enum" ? enumValues : [],
      processID: idList || null
    });
  };

  const getChangeCellHandler = useCallback(
    (rowIndex, field) => (e) => {
      handleChangeCell(rowIndex, field, e.target.value);
    },
    [handleChangeCell]
  );

  // Memo hóa handleDeleteRow
  const getDeleteRowHandler = useCallback(
    (rowIndex) => () => {
      handleDeleteRow(rowIndex);
    },
    [handleDeleteRow]
  );

  return (
    <CustomDialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleAction}
      type="add"
      isLoading={isLoading} 
    >
      <FormContainer>
        <StyledGridContainer container>
          <StyledGridItem item>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã thuộc tính"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  required
                />
              )}
            />
          </StyledGridItem>
          <StyledGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên thuộc tính"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />
          </StyledGridItem>
          <StyledGridItem item>
            <Controller
              name="type"
              control={control}
              defaultValue="Enum"
              render={({ field }) => (
                <CustomInput
                  select
                  label="Kiểu nhập"
                  {...field}
                  error={!!errors.type}
                  helperText={errors.type?.message}
                  required
                >
                  <MenuItem value="Enum">Enum</MenuItem>
                </CustomInput>
              )}
            />
          </StyledGridItem>

          {/* Bảng enum */}
          {getValues("type") === "Enum" && (
            <FullWidthGridItem item>
              <SmallTable>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Giá trị (ID)</TableCell>
                    <TableCell>Nhãn hiển thị</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enumValues.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <SmallTextField
                          value={row.id}
                          // onChange={(e) =>
                          //   handleChangeCell(index, "id", e.target.value)
                          // }
                          onChange={getChangeCellHandler(index, "id")}
                          placeholder="Nhập giá trị..."
                        />
                      </TableCell>
                      <TableCell>
                        <SmallTextField
                          value={row.label}
                          // onChange={(e) =>
                          //   handleChangeCell(index, "label", e.target.value)
                          // }
                          onChange={getChangeCellHandler(index, "label")}
                          placeholder="Nhập nhãn..."
                        />
                      </TableCell>
                      <TableCell>
                        <ErrorIconButton 
                        // onClick={() => handleDeleteRow(index)}
                        onClick={getDeleteRowHandler(index)}
                        >
                          <DeleteOutlineIcon />
                        </ErrorIconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SmallTable>
              <AddRowButton onClick={handleAddRow}>
                + Thêm dòng
              </AddRowButton>
            </FullWidthGridItem>
          )}
        </StyledGridContainer>
      </FormContainer>
    </CustomDialog>
  );
};
FormList.propTypes = {
  title: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  idList: PropTypes.string,
  isLoading: PropTypes.bool,
  trigger: PropTypes.func.isRequired
};

export default FormList;
