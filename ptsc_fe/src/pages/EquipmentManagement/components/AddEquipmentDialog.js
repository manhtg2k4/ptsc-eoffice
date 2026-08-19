import React, { useState } from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { createAmenity } from "@services/amenitiesService";
import { useToast } from "@components/common/ToastProvider";

import withSharedComponents from "@components/WrapperComponent";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";
import { IconRequied } from "@styles/UploadFile/UploadFile.style";

const logger = console;

const schema = yup.object().shape({
  name: yup.string().required("Vui lòng nhập tên thiết bị"),
  note: yup.string(),
});

const FieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const LastFieldWrapper = styled(Box)({
  marginBottom: 0,
});

const AddEquipmentDialog = ({ open, onClose, setReloadData, sharedComponents }) => {
  const { InputComponents } = sharedComponents;
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      note: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      const payload = {
          ...data,
          quantity: 1,
          status: 1,
          roomLinks: []
      };
      await createAmenity(payload);
      toast("Thêm mới thiết bị thành công", "success");
      reset();
      onClose();
      if (typeof setReloadData === 'function') {
        setReloadData((prev) => !prev);
      }
    } catch (error) {
      logger.error(error);
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      toast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Thêm thiết bị"
      onSave={handleSubmit(onSubmit)}
      titleButton="TẠO"
      cancelButtonText="HỦY"
      size="sm"
      isLoading={isLoading}
    >
			<FieldWrapper>
				<FormLabel>Tên thiết bị<IconRequied component="span">*</IconRequied></FormLabel>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <InputComponents
              {...field}
              fullWidth
              // label={<span>Tên thiết bị <span style={{ color: "red" }}>*</span></span>}
              placeholder="Tên thiết bị"
              error={!!errors.name}
              helperText={errors.name?.message}
              variant="outlined"
              size="small"
            />
          )}
        />
      </FieldWrapper>
			<LastFieldWrapper>
				<FormLabel>Ghi chú</FormLabel>
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <InputComponents
              {...field}
              fullWidth
              // label="Ghi chú"
              multiline
              rows={6}
              placeholder="Nhập ghi chú ở đây"
              variant="outlined"
            />
          )}
        />
      </LastFieldWrapper>
    </CustomDialog>
  );
};

export default withSharedComponents(AddEquipmentDialog);
