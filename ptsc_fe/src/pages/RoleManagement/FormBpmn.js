import React, { useRef } from "react";
import { Box, Grid, styled } from "@mui/material";
import { Controller } from "react-hook-form";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";
import DynamicTablePBMN from "@components/DynamicTablePBMN";
// import CustomTableDynamicMetaData from "@components/CutomTableV2";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const QuarterWidthGridItem = styled(Grid)({
  width: "100%",
  "@media (min-width: 600px)": {
    flexBasis: "25%",
    maxWidth: "25%",
  },
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
  flexBasis: "100%",
  maxWidth: "100%",
});

const FormBpmn = ({
  title,
  open,
  onClose,
  control,
  onSave,
  getValues,
  errors,
  isLoading,
}) => {
  const refDynamicTable = useRef();

  const handleAction = async () => {
    if (refDynamicTable?.current?.getData) {
      const { data } = await refDynamicTable.current.getData();
      // const isValidForm = await trigger();

      onSave({
        id: getValues("id"),
        name: getValues("name"),
        fields: data,
      });
    }
  };

  return (
    <CustomDialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleAction}
      type="add"
      isLoading={isLoading}
      size="lg"
    >
      <FormContainer>
        <Grid container spacing={2}>
          <QuarterWidthGridItem item>
            <Controller
              name="id"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Mã biểu mẫu"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  required
                />
              )}
            />
          </QuarterWidthGridItem>
          <QuarterWidthGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Tên biểu mẫu"
                  placeholder="Nhập dữ liệu..."
                  {...field}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  required
                />
              )}
            />
          </QuarterWidthGridItem>
          <FullWidthGridItem item>
            <DynamicTablePBMN ref={refDynamicTable} />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

FormBpmn.propTypes = {
  title: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  dataSelect: PropTypes.array.isRequired,
  trigger: PropTypes.func.isRequired,
};

export default FormBpmn;
