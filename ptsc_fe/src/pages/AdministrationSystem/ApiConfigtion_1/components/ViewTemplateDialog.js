import React, { useEffect } from "react";
import {
  Grid,
  Typography,
  styled,
  Box,
} from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { Controller, useFieldArray } from "react-hook-form";
import PropTypes from "prop-types";
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

const ValueListHeader = styled(Grid)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const CodeTableCellHead = styled(DynamicTableCellHead)({
  width: 300,
});

const CodeTableCell = styled(DynamicTableCell)({
  width: 300,
});

const ValueListTitle = styled(Typography)({
  fontWeight: 700,
});

const ErrorTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));


const ViewTemplateDialog = ({
  open,
  onClose,
  onSave,
  control,
  errors,
  isLoading,
  setValue,
  getValues,
  data, // Dữ liệu cần chỉnh sửa
}) => {
  const { fields } = useFieldArray({
    control,
    name: "valueList",
  });

  useEffect(() => {
    if (open && data) {
      setValue("categoryCode", data.categoryCode || "");
      setValue("categoryName", data.categoryName || "");
      setValue("description", data.description || "");
      setValue("valueList", data.valueList || []);
    }
  }, [open, data, setValue]);

  const handleSave = () => {
    const formData = getValues();
    onSave(formData);
  };

  return (
    <CustomDialog
      title="Xem chi tiết danh mục chung"
      open={open}
      onClose={onClose}
      onSave={handleSave}
      disableSave
      type="view"
      size="md"
      isLoading={isLoading}
    >
      <FormContainer component="form">
        <Grid container spacing={2}>
          <HalfWidthGridItem item>
            <Controller
              name="categoryCode"
              control={control}
              disabled
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
              disabled
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
              disabled
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
        </Grid>

        <ValueListHeader container>
          <ValueListTitle>Danh sách giá trị</ValueListTitle>
          {/* <Button
            startIcon={<Add />}
            onClick={() => append({ code: "", name: "", _id: Date.now().toString() })}
          >
            Thêm dòng
          </Button> */}
        </ValueListHeader>

        <DynamicBox>
          <DynamicTableContainer>
            <DynamicTable>
              <DynamicTableHead>
                <DynamicTableRow>
                  <CodeTableCellHead>Mã</CodeTableCellHead>
                  <DynamicTableCellHead>Tên</DynamicTableCellHead>
                </DynamicTableRow>
              </DynamicTableHead>
              <tbody>
                {fields.map((item, index) => (
                  <DynamicTableRow key={item.id}>
                    <CodeTableCell>
                      <Controller
                        name={`valueList.${index}.code`}
                        control={control}
                        disabled
                        render={({ field, fieldState }) => (
                          <CustomInput {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                        )}
                      />
                    </CodeTableCell>

                    <DynamicTableCell>
                      <Controller
                        name={`valueList.${index}.name`}
                        control={control}
                        disabled
                        render={({ field, fieldState }) => (
                          <CustomInput {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                        )}
                      />
                    </DynamicTableCell>

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

ViewTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  setValue: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  data: PropTypes.object, // Dữ liệu cần chỉnh sửa
};

ViewTemplateDialog.defaultProps = {
  isLoading: false,
  data: null,
};

export default ViewTemplateDialog;