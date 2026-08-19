import React, { useEffect, useCallback, useMemo } from "react";
import { styled,
  Box,
  // Button,
  Grid,
  IconButton,
  // TextField,
  Typography,
} from "@mui/material";
import { Controller, useWatch } from "react-hook-form";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";
import withFormWrapper from "@components/common/FormWrapper";
import withSharedComponents from "@components/WrapperComponent";

import { API_DYNAMIC } from "@EnvironmentFile/constants/urlConfig";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
// import DownloadIcon from "@mui/icons-material/Download";
import api from "@services/api";

const FormContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const StyledGridContainer = styled(Grid)({
  // spacing is a layout prop, no need to style it here
});

const FullWidthGridItem = styled(Grid)({
  width: '100%',
});

// const FullWidthTextField = styled(TextField)({
//   width: '100%',
// });

// const FullWidthFormControl = styled(FormControl)({
//   width: '100%',
// });

const FileUploadContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: '16px', // theme.spacing(2)
});

const PrimaryIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const NoteContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(1),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
}));

const SectionBody = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const NoteTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
}));

const ItalicTypography = styled(Typography)({
  fontStyle: 'italic',
});

const PrimaryItalicTypography = styled(ItalicTypography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const SecondaryItalicTypography = styled(ItalicTypography)(({ theme }) => ({
  color: theme.palette.secondary.main,
}));

const BlueSpan = styled('span')({
  color: 'blue',
});

const PurpleSpan = styled('span')({
  color: 'purple',
});

const EditForm = ({
  title,
  open,
  id, // 👈 id truyền vào để call chi tiết
  onClose,
  control,
  reset, // 👈 reset từ react-hook-form
  onSave,
  getValues,
  handleSubmit, // 👈 Thêm nhận prop handleSubmit từ useForm của component cha
  errors,
  isLoading,
  listFunction,
	sharedComponents
}) => {
	const { InputComponents: BaseInput } = sharedComponents;
  const dataMapForm = listFunction
    ? listFunction.filter((item) => item.featureType === "form")
    : [];

	const InputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "InputComponents";
		return Component;
	}, [BaseInput]);

  // Sử dụng handleSubmit để kích hoạt cơ chế validate của react-hook-form trước khi gọi onSave
  const handleAction = handleSubmit((values) => {
    onSave(values);
  });

  // Theo dõi giá trị feature
  const selectedFeature = useWatch({
    control,
    name: "feature",
  });

  const handleFileChange = useCallback((onChange) => (e) => {
    onChange(e.target.files);
  }, []);

  // Call API chi tiết khi open và có id
  useEffect(() => {
    if (open && id) {
      const fetchDetail = async () => {
        try {
          const res = await api.get(`${API_DYNAMIC}/${id}`);
          if (res.data?.success) {
            const detail = res.data.data;
            reset({
              ...detail,
              file: detail.fileName
                ? { name: detail.fileName, url: detail.fileUrl }
                : null, // gán object chứa name + url
            });
          }
        } catch (err) {
          logger.error("Lỗi khi load chi tiết:", err);
        }
      };
      fetchDetail();
    }
  }, [open, id, reset]);

  


  return (
    <CustomDialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleAction}
      type="edit"
      isLoading={isLoading}
      size="lg"
    >
      <FormContainer>
        <StyledGridContainer container spacing={2}>
          {/* Tiêu đề */}
          <FullWidthGridItem item>
            <Controller
              name="name"
              control={control}
              rules={{ required: "Tiêu đề là bắt buộc" }}
              render={({ field }) => (
                <InputComponents
                  {...field}
                  label="Tiêu đề"
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  // size="small"
									required
                />
              )}
            />
          </FullWidthGridItem>

          {/* Mã */}
          <FullWidthGridItem item>
            <Controller
              name="code"
              control={control}
              rules={{ required: "Mã là bắt buộc" }}
              render={({ field }) => (
                <InputComponents
                  {...field}
                  label="Mã"
                  error={!!errors.code}
                  helperText={errors.code?.message}
                  // size="small"
									required
                />
              )}
            />
          </FullWidthGridItem>

          <FullWidthGridItem item>
            <Controller
              name="file"
              control={control}
              render={({ field }) => {
                // Lấy dữ liệu từ form sau khi reset
                const fileValue = field.value;
                // const fileUrl = getValues("file"); // API cần trả về trường này
                const fileName = getValues("fileName"); // API cần trả về trường này

                return (
                  <FileUploadContainer>
                    {/* Nút Upload */}
                    <PrimaryIconButton component="label">
                      <CloudUploadIcon />
                      <input
                        type="file"
                        hidden
                        // onChange={(e) => field.onChange(e.target.files)}
                        onChange={handleFileChange(field.onChange)}
                      />
                    </PrimaryIconButton>

                    {/* Hiển thị tên file đã chọn hoặc từ API */}
                    {fileValue && fileValue.length > 0 ? (
                      <Typography variant="body2">
                        {fileValue[0].name}
                      </Typography>
                    ) : fileName ? (
                      <Typography variant="body2">{fileName}</Typography>
                    ) : null}

                    {/* Nút Download nếu có fileUrl */}
                    {/* {fileUrl && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(fileUrl, fileName)}
                      >
                        Tải xuống
                      </Button>
                    )} */}
                  </FileUploadContainer>
                );
              }}
            />
          </FullWidthGridItem>

          {/* Tính năng */}
          <FullWidthGridItem item>
            <Controller
              name="feature"
              control={control}
              defaultValue=""
              rules={{ required: "Tính năng là bắt buộc" }}
              render={({ field }) => (
                <InputComponents
                  select
                  label="Tính năng"
                  options={dataMapForm}
                  customLabel="name"
                  customValue="code"
                  {...field}
                  error={!!errors.feature}
                  helperText={errors.feature?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>

          {/* Render khi có feature */}
          {selectedFeature && (
            <>
              <FullWidthGridItem item>
                <SectionHeader variant="body2">
                  <b>Danh sách các trường dữ liệu trong biểu mẫu</b> (Các trường
                  màu đỏ là bắt buộc)
                </SectionHeader>
              </FullWidthGridItem>

              <FullWidthGridItem item>
                <NoteContainer>
                  <SectionTitle variant="subtitle1">
                    Thông tin các từ thay thế
                  </SectionTitle>
                  <SectionBody variant="body2">
                    {(() => {
                      const featureObj = dataMapForm.find(
                        (f) => f.code === selectedFeature
                      );

                      if (!featureObj || !featureObj.valueField?.field) {
                        return (
                          <SectionBody variant="body2">
                            Không có chức năng cho tham chiếu này
                          </SectionBody>
                        );
                      }

                      return (
                        <Box>
                          {featureObj.valueField.field.map((f) => (
                            <Typography key={f.name} variant="body2">
                              <b>{f.label}:</b> ${`{${f.name}}`}
                            </Typography>
                          ))}
                        </Box>
                      );
                    })()}
                  </SectionBody>
                </NoteContainer>
              </FullWidthGridItem>

              <FullWidthGridItem item>
                <NoteContainer>
                  <NoteTitle variant="subtitle2">
                    Ghi chú
                  </NoteTitle>
                  <ItalicTypography variant="body2">
                    Loại thường
                  </ItalicTypography>
                  <PrimaryItalicTypography variant="body2">
                    Loại tham chiếu:{" "}
                    <BlueSpan>
                      Click vào để chọn trường tham chiếu
                    </BlueSpan>
                  </PrimaryItalicTypography>
                  <SecondaryItalicTypography variant="body2">
                    Loại mảng:{" "}
                    <PurpleSpan>Dùng trong bảng</PurpleSpan>
                  </SecondaryItalicTypography>
                </NoteContainer>
              </FullWidthGridItem>
            </>
          )}
        </StyledGridContainer>
      </FormContainer>
    </CustomDialog>
  );
};

EditForm.propTypes = {
  title: PropTypes.string,
  open: PropTypes.bool.isRequired,
  id: PropTypes.string, // 👈 thêm id
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  getValues: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired, // 👈 Thêm khai báo PropTypes cho handleSubmit
  control: PropTypes.object.isRequired,
  reset: PropTypes.func.isRequired, // 👈 cần để set lại form
  listFunction: PropTypes.array.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
};

export default withSharedComponents(EditForm);
