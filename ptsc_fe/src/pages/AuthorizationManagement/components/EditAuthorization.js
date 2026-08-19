import React, { useState, useCallback, useEffect } from "react";
import {
  Grid,
  styled,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
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

const validationSchema = yup.object().shape({
  user: yup.string().required("Người được ủy quyền không được để trống"),
  startDate: yup.date().required("Ngày bắt đầu không được để trống"),
  endDate: yup
    .date()
    .required("Ngày kết thúc không được để trống")
    .min(yup.ref("startDate"), "Ngày kết thúc phải sau ngày bắt đầu"),
});

const EditAuthorization = ({
  open,
  onClose,
  onSuccess,
  sharedComponents,
  documentId,
  ...props
}) => {
  const { DiaLogStyle, DateTimePicker, InputComponents, toast } =
    sharedComponents;
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: { isForceEnd: false },
  });
  const [isFormDisabled, setIsFormDisabled] = useState(false);
  const [authorizedUserOptions, setAuthorizedUserOptions] = useState([]);
    const startDateValue = watch("startDate");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Lấy danh sách người dùng và chi tiết ủy quyền song song
        const [userResponse, docResponse] = await Promise.all([
          axiosInstance.get(API_AUTHORIZED_USER),
          axiosInstance.get(`${API_DELEGATION_MANAGEMENT}/${documentId}`),
        ]);

        if (userResponse && Array.isArray(userResponse)) {
          setAuthorizedUserOptions(userResponse);
        }

        if (docResponse) {
          const { authorized, startDate, endDate, stage } = docResponse;
          const isEnded = stage === "2";
          reset({
            user: authorized.id,
            startDate: dayjs(startDate),
            endDate: dayjs(endDate),
            isForceEnd: isEnded,
          });
          if (isEnded) {
            setIsFormDisabled(true);
          } else {
            setIsFormDisabled(false);
          }
        }
      } catch (error) {
        toast("Lỗi khi tải dữ liệu ủy quyền!", "error");
      }
    };

    if (open && documentId) {
      fetchInitialData();
    } else {
      reset();
      setIsFormDisabled(false);
    }
  }, [open, documentId, toast, reset]);



  const isForceEndChecked = watch("isForceEnd");
  const handleDateChange = useCallback((onChange) => {
    return (date) => {
      onChange(date);
    };
  }, []);

  const handleSave = handleSubmit(async (data) => {
    try {
      // Cập nhật thông tin ủy quyền
      let updatePayload = {
        authorized: data.user,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        isForceEnd: data.isForceEnd,
      };

      if (data.isForceEnd) {
        updatePayload = {
          ...updatePayload,
          originalEndDate: data.endDate.toISOString(),
        };
      }

      await axiosInstance.put(
        `${API_DELEGATION_MANAGEMENT}/${documentId}`,
        updatePayload
      );

      toast("Cập nhật ủy quyền thành công!", "success");
      onSuccess?.();
      onClose();
    } catch (error) {
      toast(
        error?.response?.data?.message || "Cập nhật ủy quyền thất bại!",
        "error"
      );
    }
  }, () => {
    toast("Vui lòng điền đầy đủ các trường bắt buộc.", "warning");
  });

  return (
    <DiaLogStyle
      open={open}
      onClose={onClose}
      title="CHỈNH SỬA ỦY QUYỀN"
      onSave={handleSave}
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
                required
                disabled={isFormDisabled}
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
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
                disabled={isForceEndChecked}
                minDate={startDateValue}
                required
                error={!!errors.endDate}
                helperText={errors.endDate?.message}
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
                required
                disabled={isFormDisabled}
                {...field}
                error={!!errors.user}
                helperText={errors.user?.message}
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
                  <Checkbox {...field} checked={field.value} />
                )}
              />
            }
            label="Kết thúc ủy quyền"
          />
        </Grid>
      </FormGridContainer>
    </DiaLogStyle>
  );
};

export default withSharedComponents(EditAuthorization);
