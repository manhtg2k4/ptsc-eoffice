import React, { useEffect } from "react";
import { Grid } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import withSharedComponents from "@components/WrapperComponent";

const schema = yup.object().shape({
  documentName: yup.string().trim().required("Vui lòng nhập tên tài liệu").max(200, "Tên tài liệu không được vượt quá 200 ký tự"),
  content: yup.string().trim().required("Vui lòng nhập nội dung cần chuẩn bị").max(500, "Nội dung cần chuẩn bị không được vượt quá 500 ký tự"),
  deadline: yup.date()
    .required("Vui lòng chọn thời hạn")
    .typeError("Thời hạn không hợp lệ")
    .min(dayjs().startOf('minute').toDate(), "Thời hạn không được là thời điểm trong quá khứ")
    .test("max-meeting-start", "Hạn chuẩn bị tài liệu không được sau thời gian bắt đầu họp", function(value) {
      const { meetingStartTime } = this.options.context || {};
      if (!value || !meetingStartTime) return true;
      return dayjs(value).isBefore(dayjs(meetingStartTime)) || dayjs(value).isSame(dayjs(meetingStartTime));
    }),
});

const PrepareDocuments = ({
  open,
  onClose,
  onSave,
  initialData,
  sharedComponents,
  // targetName, 
  meetingStartTime,
}) => {
  const { Dialog, InputComponents, DateTimePicker } = sharedComponents;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
    context: { meetingStartTime },
    defaultValues: {
      documentName: "",
      deadline: null,
      content: "",
      id: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          documentName: initialData.documentName || "",
          deadline: initialData.deadline ? dayjs(initialData.deadline).toDate() : null,
          content: initialData.content || "",
          id: initialData.id || null,
        });
      } else {
        reset({
          documentName: "",
          deadline: null,
          content: "",
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
      title={`Giao chuẩn bị tài liệu `}
      open={open}
      onClose={onClose}
      onSave={handleSubmit(handleLocalSave)}
      type="add"
      size="sm"
    >
      <Grid container spacing={2} mt={1}>
        <Grid item xs={12}>
          <Controller
            name="documentName"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Tài liệu cần chuẩn bị"
                placeholder="Nhập tên tài liệu cần chuẩn bị..."
                {...field}
                required
                error={!!errors.documentName}
                helperText={errors.documentName?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <InputComponents
                label="Nội dung cần chuẩn bị"
                placeholder="Nhập nội dung cần chuẩn bị..."
                multiline
                rows={3}
                {...field}
                required
                error={!!errors.content}
                helperText={errors.content?.message}  
              />
            )}
          />
        </Grid>
                <Grid item xs={12}>
          <Controller
            name="deadline"
            control={control}
            render={({ field }) => (
              <DateTimePicker
                label="Hạn tài liệu chuẩn bị"
                placeholder="Chọn hạn tài liệu chuẩn bị..."
                value={field.value}
                onChange={field.onChange}
                showTime={true}
                minDateTime={dayjs().startOf('minute')}
                maxDateTime={meetingStartTime ? dayjs(meetingStartTime) : undefined}
                required
                error={!!errors.deadline}
                helperText={errors.deadline?.message}
              />
            )}
          />
        </Grid>
      </Grid>
    </Dialog>
  );
};

PrepareDocuments.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  sharedComponents: PropTypes.object.isRequired,
  targetName: PropTypes.string,
  meetingStartTime: PropTypes.any,
};

export default withSharedComponents(PrepareDocuments);