import React from "react";
import { Box, Grid, styled } from "@mui/material";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { Controller } from "react-hook-form";
import CustomInput from "@components/CustomInput/CustomInput";
import PropTypes from "prop-types";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

const HalfWidthGridItem = styled(Grid)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: '50%',
  },
}));

const ViewTemplateDialog = ({
  open,
  onClose,
  control,
  // handleSubmit,
  // onSubmit,
}) => {
  return (
    <CustomDialog
      title="Xem chi tiết thông tin"
      open={open}
      onClose={onClose}
      disableSave
      type="view"
      size="md"
    >
      <FormContainer component="form">
        <Grid container spacing={2}>
          <FullWidthGridItem item>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="Tên API" {...field} />
              )}
            />
          </FullWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="Mã API" {...field} />
              )}
            />
          </HalfWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <CustomInput
                   select
                  label="Phương thức HTTP"
                   disabled
                   {...field   }
                />  
              )}
            />
          </HalfWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="url"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="URL" {...field}  />
              )}
            />
          </FullWidthGridItem>
          <HalfWidthGridItem item>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                 
                 <CustomInput disabled label="Loại" {...field}  />
              )}
            />
          </HalfWidthGridItem>
          <FullWidthGridItem item>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <CustomInput disabled label="Mô tả" {...field} rows={5} multiline />
              )}
            />
          </FullWidthGridItem>
        </Grid>
      </FormContainer>
    </CustomDialog>
  );
};

ViewTemplateDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default ViewTemplateDialog;
