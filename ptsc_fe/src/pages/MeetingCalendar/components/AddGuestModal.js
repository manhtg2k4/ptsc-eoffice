import React, { useEffect } from "react";
import { Grid } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";

const schema = yup.object().shape({
  guestName: yup.string().trim().required("Vui lòng nhập tên khách mời").max(255, "Tên khách mời không được vượt quá 255 ký tự"),
  guestTitle: yup.string().required("Vui lòng nhập chức danh"),
});

const AddGuestModal = ({
  open,
  onClose,
  onSave,
  initialData,
  sharedComponents,
}) => {
  const { Dialog, InputComponents } = sharedComponents;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    defaultValues: {
      guestName: "",
      guestTitle: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          guestName: initialData.guestName || "",
          guestTitle: initialData.guestTitle || "",
        });
      } else {
        reset({
          guestName: "",
          guestTitle: "",
        });
      }
    }
  }, [open, initialData, reset]);

  const handleLocalSave = (data) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog
      title="Thêm khách mời tham gia"
      open={open}
      onClose={onClose}
      onSave={handleSubmit(handleLocalSave)}
      type="add"
      size="sm"
    >
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <Controller
            name="guestName"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Tên khách mời"
                placeholder="Họ tên khách mời tham dự"
                {...field}
                required
                error={!!errors.guestName}
                helperText={errors.guestName?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="guestTitle"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Chức danh"
                placeholder="Chức danh khách mời"
                {...field}
                required
                error={!!errors.guestTitle}
                helperText={errors.guestTitle?.message}
              />
            )}
          />
        </Grid>
      </Grid>
    </Dialog>
  );
};

AddGuestModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  sharedComponents: PropTypes.object.isRequired,
};

export default withSharedComponents(AddGuestModal);
