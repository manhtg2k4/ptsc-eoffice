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
  departmentSymbol: yup
    .string()
    .trim()
    .required("Số và ký hiệu phòng là bắt buộc"),
  departmentRecord: yup
    .string()
    .trim()
    .required("Hồ sơ phòng là bắt buộc"),
});

const defaultValues = {
  departmentSymbol: "",
  departmentRecord: "",
};

function AddDepartmentRecordDialog({ open, onClose, onSave, isLoading }) {
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
      title="Thêm hồ sơ phòng"
      onSave={handleSaveClick}
      size="sm"
      isLoading={isLoading}
    >
      <FormContainer>
        <SkyGrid container spacing={2}>
          <FullWidthGridItem item>
            <FormLabel>
             Số và ký hiệu phòng <IconRequied component="span">*</IconRequied>
            </FormLabel>
            <Controller
              name="departmentSymbol"
              control={control}
              render={({ field }) => (
                <CustomInput
                  placeholder="Nhập nội dung"
                  {...field}
                  error={!!errors.departmentSymbol}
                  helperText={errors.departmentSymbol?.message}
                  required
                />
              )}
            />
          </FullWidthGridItem>
          <FullWidthGridItem item>
             <FormLabel>
             Tên hồ sơ phòng <IconRequied component="span">*</IconRequied>
            </FormLabel>
            <Controller
              name="departmentRecord"
              control={control}
              render={({ field }) => (
                <CustomInput
                  placeholder="Nhập tên"
                  {...field}
                  error={!!errors.departmentRecord}
                  helperText={errors.departmentRecord?.message}
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

AddDepartmentRecordDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default AddDepartmentRecordDialog;
