import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Controller, useForm } from "react-hook-form";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import { getAmenityById } from "@services/amenitiesService";

import withSharedComponents from "@components/WrapperComponent";
import { FormLabel } from "@styles/BaseSwiper/BaseSwiper.style";

const FieldWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: theme.palette.text.primary, 
    color: theme.palette.text.primary,
  }
}));

const LastFieldWrapper = styled(Box)(({theme}) => ({
  marginBottom: 0,
  "& .MuiInputBase-input.Mui-disabled": {
    WebkitTextFillColor: theme.palette.text.primary,
    color: theme.palette.text.primary,
  }
}));


// ...

const ViewEquipmentDialog = ({ open, onClose, data, sharedComponents }) => {
  const { InputComponents } = sharedComponents;
  const {
    control,
    reset,
  } = useForm({
    defaultValues: {
      name: "",
      note: "",
    },
  });
  // ...
  useEffect(() => {
    const fetchData = async () => {
        if (open && data?.id) {
            try {
                const response = await getAmenityById(data.id);
                const amenityData = response?.data || response;
                reset({
                    name: amenityData.name || "",
                    note: amenityData.note || ""
                });
            } catch (error) {
                logger.error("Error fetching amenity details:", error);
            }
        }
    };
    fetchData();
  }, [open, data, reset]);

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Chi tiết thiết bị"
      onSave={onClose} 
      disableSave
      size="sm"
    >
			<FieldWrapper>
				<FormLabel>Tên thiết bị</FormLabel>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <InputComponents
              {...field}
              fullWidth
              disabled
              // label="Tên thiết bị"
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
              multiline
              rows={6}
              disabled
              // label="Ghi chú"
              variant="outlined"
            />
          )}
        />
      </LastFieldWrapper>
    </CustomDialog>
  );
};

export default withSharedComponents(ViewEquipmentDialog);
