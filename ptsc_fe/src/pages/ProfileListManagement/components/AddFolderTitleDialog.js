import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomDialog from "@components/CustomDialog/CustomDialog";
import CustomInput from "@components/CustomInput/CustomInput";
import { SkyGrid } from "@styles/SkyStyles";
import { FormContainer, FullWidthGridItem } from "@styles/FormDialog.styles";
import PropTypes from "prop-types";
import { 
	IconRequied
} from "@styles/UploadFile/UploadFile.style";
import { 
  FormLabel
} from "@styles/BaseSwiper/BaseSwiper.style";
const schema = yup.object().shape({
  folderTitle: yup
    .string()
    .trim()
    .required("Tiêu đề mục hồ sơ là bắt buộc"),
});

const defaultValues = {
  folderTitle: "",
};

function AddFolderTitleDialog({ open, onClose, onSave, isLoading }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  const handleSaveClick = handleSubmit((data) => {
    onSave(data);
  });

  return (
    <CustomDialog
      open={open}
      onClose={onClose}
      title="Thêm đề mục hồ sơ"
      onSave={handleSaveClick}
      size="sm"
      isLoading={isLoading}
    >
      <FormContainer>
        <SkyGrid container spacing={2}>
          <FullWidthGridItem item>
            <FormLabel>
             Tên đề mục hồ sơ <IconRequied component="span">*</IconRequied>
            </FormLabel>
            <Controller
              name="folderTitle"
              control={control}
              render={({ field }) => (
                <CustomInput
                  placeholder="Nhập nội dung"
                  {...field}
                  error={!!errors.folderTitle}
                  helperText={errors.folderTitle?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
        </SkyGrid>
      </FormContainer>
    </CustomDialog>
  );
}

AddFolderTitleDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default AddFolderTitleDialog;
