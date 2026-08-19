import React, { useState, useCallback, useEffect } from "react";
import {
  Grid,
  styled,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";
import axiosInstance from "@utils/axiosInstance";
import {
  API_AUTHORIZED_USER,
  API_DELEGATION_MANAGEMENT,
} from "@EnvironmentFile/constants/urlConfig";
import { useForm, Controller } from "react-hook-form";
import UploadFile from "@components/UploadFile";

const FormGridContainer = styled(Grid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const ViewAuthorization = ({
  open,
  onClose,
  sharedComponents,
  documentId,
  ...props
}) => {
  const { DiaLogStyle, DateTimePicker, InputComponents, toast } =
    sharedComponents;
  const { control, reset } = useForm({ defaultValues: { isForceEnd: false } });
  const [authorizedUserOptions, setAuthorizedUserOptions] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [userResponse, docResponse] = await Promise.all([
          axiosInstance.get(API_AUTHORIZED_USER),
          axiosInstance.get(`${API_DELEGATION_MANAGEMENT}/${documentId}`),
        ]);

        if (userResponse && Array.isArray(userResponse)) {
          setAuthorizedUserOptions(userResponse);
        }

        if (docResponse) {
          const { authorized, startDate, endDate, isForceEnd } = docResponse;
          reset({
            user: authorized.id,
            startDate: dayjs(startDate),
            endDate: dayjs(endDate),
            isForceEnd: isForceEnd || false,
          });
        }
      } catch (error) {
        toast("Lỗi khi tải dữ liệu ủy quyền!", "error");
      }
    };

    if (open && documentId) {
      fetchInitialData();
    } else {
      reset();
    }
  }, [open, documentId, toast, reset]);

  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);
  return (
    <DiaLogStyle
      open={open}
      onClose={onClose}
      title="CHI TIẾT ỦY QUYỀN"
      disableSave // Ẩn nút lưu
      fullWidth
      {...props}
    >
      <FormGridContainer container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Ngày bắt đầu"
                value={field.value}
                onChange={handleDateChange(field.onChange)}
                showTime  
                disabled // Vô hiệu hóa
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Ngày kết thúc"
                value={field.value}
                onChange={handleDateChange(field.onChange)}
                showTime  
                disabled // Vô hiệu hóa
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="user"
            control={control}
            render={({ field }) => (
              <InputComponents
                select
                options={authorizedUserOptions}
                getOptionLabel={(option) => option.name || "Không tên"}
                customLabel="name"
                customValue="_id"
                label="Người được ủy quyền"
                placeholder="Chọn người được uỷ quyền..."
                disabled // Vô hiệu hóa
                {...field}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="attachmentFiles"
            control={control}
            render={({ field }) => (
              <UploadFile
                {...field}
                label="TÀI LIỆU ĐÍNH KÈM"
                objectId={documentId}
                objectType="delegation"
                isView
                noneBorder
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Controller
                name="isForceEnd"
                control={control}
                render={({ field }) => (
                  <Checkbox {...field} checked={field.value} disabled />
                )}
              />
            }
            label="Kết thúc ủy quyền"
            disabled
          />
        </Grid>
      </FormGridContainer>
    </DiaLogStyle>
  );
};

export default withSharedComponents(ViewAuthorization);
