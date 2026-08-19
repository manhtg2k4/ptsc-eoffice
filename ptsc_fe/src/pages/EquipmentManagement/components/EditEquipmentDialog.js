import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { updateAmenity, getAmenityById } from "@services/amenitiesService";
import { useToast } from "@components/common/ToastProvider";

import withSharedComponents from "@components/WrapperComponent";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";
import { IconRequied } from "@styles/UploadFile/UploadFile.style";

const logger = console;

const FieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const LastFieldWrapper = styled(Box)({
  marginBottom: 0,
});

const schema = yup.object().shape({
  name: yup.string().required("Vui lòng nhập tên thiết bị"),
  note: yup.string(),
});

const EditEquipmentDialog = ({ open, onClose, setReloadData, data, sharedComponents }) => { 
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

  useEffect(() => {
    const fetchData = async () => {
        if (open && data?.id) {
            try {
                setIsLoading(true);
                const response = await getAmenityById(data.id);
                const amenityData = response?.data || response; // Adjust based on API structure
                
                reset({
                    name: amenityData.name || "",
                    note: amenityData.note || ""
                });
            } catch (error) {
                logger.error("Error fetching amenity details:", error);
                toast("Không thể tải thông tin thiết bị", "error");
            } finally {
                setIsLoading(false);
            }
        }
    };

    fetchData();
  }, [open, data, reset, toast]);

  const onSubmit = async (formData) => {
    try {
        setIsLoading(true);
        if (!data?.id) {
            toast("Không tìm thấy ID thiết bị", "error");
            return;
        }

        const payload = {
            ...data, // Keep original data properties
            ...formData, // Overwrite with form data
            updatedAt: new Date().toISOString()
        };

        await updateAmenity(data.id, payload);
        toast("Cập nhật thiết bị thành công", "success");
        onClose();
        if (typeof setReloadData === 'function') {
            setReloadData((prev) => !prev);
        }
    } catch (error) {
        logger.error("Error updating amenity:", error);
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
      title="Chỉnh sửa thiết bị"
      onSave={handleSubmit(onSubmit)}
      titleButton="LƯU"
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
              placeholder="Tên thiết bị ban đầu"
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
              placeholder="Ghi chú ban đầu"
              variant="outlined"
            />
          )}
        />
      </LastFieldWrapper>
    </CustomDialog>
  );
};

export default withSharedComponents(EditEquipmentDialog);
