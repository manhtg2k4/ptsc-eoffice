import React, { useCallback, useEffect } from "react";
import {
  Grid,
  IconButton,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  styled,
  Box,
} from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { Controller, useFieldArray } from "react-hook-form";
import PropTypes from "prop-types";
import { Add, Delete } from "@mui/icons-material";
import { DynamicBox, DynamicTable, DynamicTableCell, DynamicTableCellHead, DynamicTableContainer, DynamicTableHead, DynamicTableRow } from "@styles/DynamicTableCustom";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const HalfWidthGridItem = styled(Grid)({
  width: '50%',
});

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

const ValueListHeader = styled(Grid)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const RequiredMark = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
}));

const ErrorTypography = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  marginTop: theme.spacing(1),
  color: theme.palette.error.main,
}));

const CodeTableCellHead = styled(DynamicTableCellHead)({
  width: 300,
});

const ValueListTitle = styled(Typography)({
  fontWeight: 700,
});

const CodeTableCell = styled(DynamicTableCell)({
  width: 300,
});

const ActionsTableCell = styled(DynamicTableCell)({
  width: 50,
  textAlign: 'center',
});

const ErrorIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.error.main,
}));
const AddTemplateDialog = ({
  open,
  onClose,
  onSave,
  control,
  errors,
  isLoading,
  setValue,
  getValues,
  trigger
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "valueList",
  });

  useEffect(() => {
    if (open) {
      setValue("categoryCode", "");
      setValue("categoryName", "");
      setValue("description", "");
      setValue("valueList", []);
    }
  }, [open, setValue]);

  const handleSave = async () => {
    const isValid = await trigger();
    if (!isValid) return;
  
    const formData = getValues();
    onSave(formData);
  };

  const handleAddRow = useCallback(() => {
    append({ code: "", name: "" }, { shouldFocus: false, prepend: true });
  }, [append]);

  const handleRemoveRow = useCallback((index) => () => {
    remove(index);
  }, [remove]);


  return (
    <CustomDialog
      title="Thêm mới danh mục chung"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      type="add"
      size="md"
      isLoading={isLoading}
    >
      <FormContainer component="form">
        <Grid container spacing={2}>
          <HalfWidthGridItem item>
            <Controller
              name="categoryCode"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã danh mục chung"
                  {...field}
                  error={!!errors.categoryCode}
                  helperText={errors.categoryCode?.message}
                  required
                />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="categoryName"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên danh mục chung"
                  {...field}
                  error={!!errors.categoryName}
                  helperText={errors.categoryName?.message}
                  required
                />
              )}
            />
          </HalfWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mô tả"
                  {...field}
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              control={control}
              name="isRequired"
              render={({ field }) => (
                <FormControlLabel
                  label='Danh mục bắt buộc'
                  control={<Checkbox {...field} checked={field.value} />}
                />
              )}
            />
          </FullWidthGridItem>
        </Grid>


        <ValueListHeader container>
          <ValueListTitle>
            Danh sách giá trị <RequiredMark>(*)</RequiredMark>
          </ValueListTitle>
          <Button
            startIcon={<Add />}
            // onClick={() => append({ code: "", name: "" }, { shouldFocus: false, prepend: true })}
            onClick={handleAddRow}
          >
            Thêm dòng
          </Button>
        </ValueListHeader>

        <DynamicBox>
          <DynamicTableContainer>
            <DynamicTable>
              <DynamicTableHead>
                <DynamicTableRow>
                  <CodeTableCellHead>Mã</CodeTableCellHead>
                  <DynamicTableCellHead>Tên</DynamicTableCellHead>
                  <ActionsTableCell as="th">Xóa</ActionsTableCell>
                </DynamicTableRow>
              </DynamicTableHead>
              <tbody>
                {fields.map((item, index) => (
                  <DynamicTableRow key={item.id}>
                    <CodeTableCell>
                      <Controller
                        name={`valueList.${index}.code`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <CustomInput {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                        )}
                      />
                    </CodeTableCell>

                    <DynamicTableCell>
                      <Controller
                        name={`valueList.${index}.name`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <CustomInput {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                        )}
                      />
                    </DynamicTableCell>

                    <ActionsTableCell>
                      {/* <ErrorIconButton onClick={() => remove(index)}> */}
                       <ErrorIconButton onClick={handleRemoveRow(index)}>
                        <Delete />
                      </ErrorIconButton>
                    </ActionsTableCell>
                  </DynamicTableRow>
                ))}
              </tbody>
            </DynamicTable>

          </DynamicTableContainer>
        </DynamicBox>
        {errors.valueList && (
          <ErrorTypography>
            {errors.valueList.message}
          </ErrorTypography>
        )}

      </FormContainer>
    </CustomDialog>
  );
};

AddTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  setValue: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  trigger: PropTypes.func.isRequired
};

AddTemplateDialog.defaultProps = {
  isLoading: false,
};

export default AddTemplateDialog;