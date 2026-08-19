import React, { useContext, useEffect } from "react";
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
import { adminPasswordSchema } from "@pages/ListUsers/constantsDistrict";
import { SkyBox } from "@styles/SkyStyles";
import { AuthContext } from "@AuthContext/AuthProvider";
import { FormFieldLayoutContext } from "@components/CustomInput/FormFieldLayoutContext";

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    maxWidth: theme.breakpoints.values.sm,
  },
}));

const PasswordFieldGrid = styled(Grid)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const HintBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: "#F9FAFC",
  borderRadius: "8px",
  marginTop: theme.spacing(1),
}));

const HintTitle = styled(Typography)(({ theme }) => ({
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.error.main,
  marginBottom: theme.spacing(0.5),
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

const Boxpt = styled(SkyBox)(() => ({ paddingTop: 10 }));

const AdminChangePassword = ({ open, onClose, onSave, isLoading }) => {
  const { user } = useContext(AuthContext);
  const userData = user?.user;
  const isAdmin = userData?.groupCodes?.includes("ADMIN");

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(adminPasswordSchema(isAdmin)),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const onSubmit = (data) => onSave(data);

  // Theo dõi giá trị newPassword để cập nhật hint real-time
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
      <DialogTitle>Đổi mật khẩu người dùng</DialogTitle>
      <DialogContent>
        <Boxpt>
          {!isAdmin && (
            <PasswordFieldGrid item>
              <Controller
                name="oldPassword"
                control={control}
                render={({ field }) => (
                  <CustomInput
                    {...field}
                    type="password"
                    label="Mật khẩu hiện tại"
                    placeholder="Nhập mật khẩu hiện tại..."
                    autoComplete="current-password"
                    error={!!errors.oldPassword}
                    helperText={errors.oldPassword?.message}
                  />
                )}
              />
            </PasswordFieldGrid>
          )}
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
                  autoComplete="new-password"
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                />
              )}
            />
          </PasswordFieldGrid>
          <PasswordFieldGrid item>
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <CustomInput
                  {...field}
                  type="password"
                  label="Xác nhận mật khẩu"
                  placeholder="Nhập lại mật khẩu mới..."
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                />
              )}
            />
          </PasswordFieldGrid>
          <HintBox>
            <HintTitle variant="subtitle2">* Yêu cầu mật khẩu</HintTitle>
            {requirements.map(({ label, met }) => (
              <PasswordRequirementItem key={label} variant="body2" met={met}>
                {met ? 
                  <svg fill="#4dfd1c" height="16px" width="16px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xmlSpace="preserve" stroke="#4dfd1c">
                    <path d="M256,0C114.608,0,0,114.608,0,256s114.608,256,256,256s256-114.608,256-256S397.392,0,256,0z M256,496 C123.664,496,16,388.336,16,256S123.664,16,256,16s240,107.664,240,240S388.336,496,256,496z"/>
                    <polygon points="362.224,155.76 212.016,322.656 148.72,259.36 137.408,270.672 212.64,345.904 374.128,166.464"/>
                  </svg>
                : 
                  <svg fill="#aaaaaa" height="16px" width="16px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" xmlSpace="preserve">
                    <path d="M256,0C114.608,0,0,114.608,0,256s114.608,256,256,256s256-114.608,256-256S397.392,0,256,0z M256,496 C123.664,496,16,388.336,16,256S123.664,16,256,16s240,107.664,240,240S388.336,496,256,496z"/>
                    <polygon points="362.224,155.76 212.016,322.656 148.72,259.36 137.408,270.672 212.64,345.904 374.128,166.464"/>
                  </svg>
                } {label}
              </PasswordRequirementItem>
            ))}
          </HintBox>
        </Boxpt>
      </DialogContent>
      <DialogActions>
        <SaveButton onClick={handleSubmit(onSubmit)} variant="contained" disabled={isLoading}>
          Lưu
        </SaveButton>
        <CancelButton onClick={onClose} variant="contained" disabled={isLoading}>
          Hủy
        </CancelButton>
      </DialogActions>
      </StyledDialog>
    </FormFieldLayoutContext.Provider>
  );
};

AdminChangePassword.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

AdminChangePassword.defaultProps = { isLoading: false };

export default AdminChangePassword;
