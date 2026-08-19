import React, { useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  styled,
} from "@mui/material";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import CustomInput from "@components/CustomInput/CustomInput";
import { passwordSchema } from "@pages/ListUsers/constantsDistrict";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: theme.breakpoints.values.md,
  },
}));

const FormGridContainer = styled(Grid)({});

const FormFieldsGrid = styled(Grid)({
  flexBasis: "66.666667%",
  maxWidth: "66.666667%",
});

const HintGrid = styled(Grid)({
  flexBasis: "33.333333%",
  maxWidth: "33.333333%",
});

const PasswordFieldGrid = styled(Grid)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const FirstPasswordFieldGrid = styled(PasswordFieldGrid)(({ theme }) => ({
  marginTop: theme.spacing(1),
}));

const HintBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: "#F9FAFC",
  borderRadius: "8px",
}));

const HintTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.error.main,
}));

const PasswordRequirementItem = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "met",
})(({ theme, met }) => ({
  color: met ? theme.palette.success.main : theme.palette.text.secondary,
  textDecoration: met ? "line-through" : "none",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  transition: "color 0.2s, text-decoration 0.2s",
}));

const CancelButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.error.main,
  color: theme.palette.error.contrastText,
  "&:hover": { backgroundColor: theme.palette.error.dark },
}));

const SaveButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  "&:hover": { backgroundColor: theme.palette.primary.dark },
}));

const ChangePassword = ({ open, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = (data) => onSave(data);

  // Theo dõi giá trị newPassword real-time
  const newPassword = useWatch({ control, name: "newPassword", defaultValue: "" });

  const requirements = [
    { label: "Tối thiểu 8 ký tự", met: newPassword.length >= 8 },
    { label: "Tối đa 20 ký tự", met: newPassword.length > 0 && newPassword.length <= 20 },
    { label: "Có chữ hoa (A-Z)", met: /[A-Z]/.test(newPassword) },
    { label: "Có chữ thường (a-z)", met: /[a-z]/.test(newPassword) },
    { label: "Có chữ số (0-9)", met: /[0-9]/.test(newPassword) },
    { label: "Có ký tự đặc biệt (!@#$%^&*)", met: /[!@#$%^&*]/.test(newPassword) },
  ];

  return (
    <FormFieldLayoutContext.Provider value={{ inputLabelLayout: "stacked" }}>
      <StyledDialog open={open} onClose={onClose}>
      <DialogTitle>Đổi mật khẩu</DialogTitle>
      <DialogContent>
        <FormGridContainer container spacing={2}>
          <FormFieldsGrid item>
            <FirstPasswordFieldGrid item>
              <Controller
                name="oldPassword"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type="password"
                    label="Mật khẩu hiện tại"
                    placeholder="Nhập mật khẩu hiện tại..."
                    error={!!errors.oldPassword}
                    helperText={errors.oldPassword?.message}
                  />
                )}
              />
            </FirstPasswordFieldGrid>
            <PasswordFieldGrid item>
              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type="password"
                    label="Mật khẩu mới"
                    placeholder="Nhập mật khẩu mới..."
                    error={!!errors.newPassword}
                    helperText={errors.newPassword?.message}
                  />
                )}
              />
            </PasswordFieldGrid>
            <Grid item>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type="password"
                    label="Nhập lại mật khẩu mới"
                    placeholder="Nhập lại mật khẩu..."
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                  />
                )}
              />
            </Grid>
          </FormFieldsGrid>

          <HintGrid item>
            <HintBox>
              <HintTitle variant="subtitle1">* Yêu cầu mật khẩu</HintTitle>
              {requirements.map(({ label, met }) => (
                <PasswordRequirementItem key={label} variant="body2" met={met}>
                  {met ? "?" : "?"} {label}
                </PasswordRequirementItem>
              ))}
            </HintBox>
          </HintGrid>
        </FormGridContainer>
      </DialogContent>

      <DialogActions>
        <SaveButton onClick={handleSubmit(onSubmit)} variant="contained">Lưu</SaveButton>
        <CancelButton onClick={onClose} variant="contained">Hủy</CancelButton>
      </DialogActions>
      </StyledDialog>
    </FormFieldLayoutContext.Provider>
  );
};

ChangePassword.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default ChangePassword;
