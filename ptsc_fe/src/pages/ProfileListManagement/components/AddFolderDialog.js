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
const folderSchema = yup.object().shape({
  documentSymbol: yup
    .string()
    .trim()
    .required("Số và ký hiệu hồ sơ là bắt buộc"),
  documentTitle: yup
    .string()
    .trim()
    .required("Tiêu đề hồ sơ là bắt buộc"),
});

const defaultValues = {
  documentSymbol: "",
  documentTitle: "",
};

function AddFolderDialog({ open, onClose, onSave, isLoading }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(folderSchema),
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
      title="Thêm tiêu đề hồ sơ"
      onSave={handleSaveClick}
      size="sm"
      isLoading={isLoading}
    >
      <FormContainer>
        <SkyGrid container spacing={2}>
          <FullWidthGridItem item>
             <FormLabel>
              Số và ký hiệu hồ sơ <IconRequied component="span">*</IconRequied>
            </FormLabel>
            <Controller
              name="documentSymbol"
              control={control}
              render={({ field }) => (
                <CustomInput
                  placeholder="Nhập nội dung"
                  {...field}
                  error={!!errors.documentSymbol}
                  helperText={errors.documentSymbol?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
             <FormLabel>
              Tiêu đề hồ sơ <IconRequied component="span">*</IconRequied>
            </FormLabel>
            <Controller
              name="documentTitle"
              control={control}
              render={({ field }) => (
                <CustomInput
                  placeholder="Nhập tên"
                  {...field}
                  error={!!errors.documentTitle}
                  helperText={errors.documentTitle?.message}
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

AddFolderDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default AddFolderDialog;
