import React, { useCallback, useMemo } from "react";
import {
  Box,
  FormControl,
  Grid,
  // InputLabel,
  // MenuItem,
  // Select,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { Controller, useWatch } from "react-hook-form";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import PropTypes from "prop-types";
import withSharedComponents from "@components/WrapperComponent";
import withFormWrapper from "@components/common/FormWrapper";

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

const FullWidthFormControl = styled(FormControl)({
  width: '100%',
});

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

const AddForm = ({
  title,
  open,
  onClose,
  control,
  onSave,
  handleSubmit,
  errors,
  isLoading,
  listFunction = [],
	sharedComponents
}) => {
	const { InputComponents: BaseInput } = sharedComponents;
	const InputComponents = useMemo(() => {
		const Wrapped = withFormWrapper(BaseInput, "input");
		const Component = (props) => <Wrapped {...props} />;
		Component.displayName = "InputComponents";
		return Component;
	}, [BaseInput]);
  const dataMapForm =
    listFunction ? listFunction.filter((item) => item.featureType === "form") : [];
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

  return (
    <CustomDialog
      title={title}
      open={open}
      onClose={onClose}
      onSave={handleAction}
      type="add"
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

          {/* File mẫu */}
          <FullWidthGridItem item>
            <Controller
              name="file"
              control={control}
              render={({ field }) => (
                <TextField
                  type="file"
                  fullWidth
                  size="small"
                  inputProps={{ multiple: false }}
                  // onChange={(e) => field.onChange(e.target.files)}
                  onChange={handleFileChange(field.onChange)}
                />
              )}
            />
          </FullWidthGridItem>

          {/* Tính năng */}
          <FullWidthGridItem item>
            <FullWidthFormControl size="small">
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
            </FullWidthFormControl>
          </FullWidthGridItem>

          {/* Chỉ render khi có feature */}
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
                      const featureObj = dataMapForm && dataMapForm.length && dataMapForm.find(
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

AddForm.propTypes = {
  title: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired, // 👈 Thêm khai báo PropTypes cho handleSubmit
  control: PropTypes.object.isRequired,
  listFunction: PropTypes.array.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
};

export default withSharedComponents(AddForm);
