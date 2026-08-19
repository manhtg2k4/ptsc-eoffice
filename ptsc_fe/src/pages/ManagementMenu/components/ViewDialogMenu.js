import React from "react";
import { Box, Grid, styled } from "@mui/material";
import { Controller } from "react-hook-form";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import SelectTree from "@components/CustomInput/SelectTree";
import PropTypes from "prop-types";

const FormContainer = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(2),
}));

const StyledGridContainer = styled(Grid)({
  // Wrapper to satisfy ESLint, spacing is a layout prop
});

const FullWidthGridItem = styled(Grid)({
  width: "100%",
});

const ViewDialogMenu = ({
  open,
  onClose,
  control,
  handleSubmit,
  onSubmit,
  listFunction,
  listUnit,
}) => {
  const unitId = control._defaultValues?._id;
  const filteredUnits = [
    { _id: "", name: "Không có đơn vị cha" }, // Tùy chọn dự phòng
    ...(listUnit?.filter((unit) => unit?._id !== unitId) || []),
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <CustomDialog
        title="Xem chi tiết Menu"
        open={open}
        onClose={onClose}
        disableSave
        type="view"
      >
        <FormContainer component="form" onSubmit={handleSubmit(onSubmit)}>
          <StyledGridContainer container spacing={2}>
            <FullWidthGridItem item>
              <Controller
                name="parent"
                control={control}
                render={({ field }) => (
                  <SelectTree
                    select
                    treeView
                    customLabel={"name"}
                    customValue={"_id"}
                    options={filteredUnits}
                    label="Đơn vị cha"
                    {...field}
                    disabled
                  />
                )}
              />
            </FullWidthGridItem>

            <FullWidthGridItem item>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <CustomInput label="Tên menu" {...field} disabled />
                )}
              />
            </FullWidthGridItem>

            <FullWidthGridItem item>
              <Controller
                name="function"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    select
                    options={listFunction}
                    label="Chức năng"
                    {...field}
                    disabled
                  />
                )}
              />
            </FullWidthGridItem>

            <FullWidthGridItem item>
              <Controller
                name="order"
                control={control}
                render={({ field }) => (
                  <CustomInput label="Thứ tự" {...field} disabled />
                )}
              />
            </FullWidthGridItem>
          </StyledGridContainer>
        </FormContainer>
      </CustomDialog>
    </LocalizationProvider>
  );
};

ViewDialogMenu.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  control: PropTypes.object.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  listFunction: PropTypes.array,
  listUnit: PropTypes.array,
};

export default ViewDialogMenu;
